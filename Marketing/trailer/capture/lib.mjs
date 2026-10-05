// Records the real game (dev server on :5050) through Playwright's CDP screencast.
// Frames land on disk with their timestamps and are encoded to a constant-fps clip afterwards.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '..');
export const CLIPS = join(ROOT, 'footage');
export const URL = process.env.GAME_URL ?? 'http://localhost:5050/';

export const PORTRAIT = { w: 540, h: 960, dpr: 2, mobile: true };
export const LANDSCAPE = { w: 960, h: 540, dpr: 2, mobile: false };

export async function open(format = PORTRAIT) {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--enable-gpu-rasterization', '--hide-scrollbars'] });
  const ctx = await browser.newContext({
    viewport: { width: format.w, height: format.h },
    deviceScaleFactor: format.dpr,
    hasTouch: format.mobile,
    isMobile: format.mobile,
    colorScheme: 'dark',
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('[page error]', e.message));
  const cdp = await ctx.newCDPSession(page);
  return { browser, ctx, page, cdp, format };
}

/** Loads the game with the given save patch (a function that edits the career in the page) and waits until it is up. */
export async function boot(s, patch = null, args = {}, { mode = 'shift' } = {}) {
  const { page } = s;
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game, null, { timeout: 60000 });
  await page.evaluate(async ({ patchSrcs, mode, args }) => {
    const { loadSave, writeSave } = await import('/src/storage/save.ts');
    const { HINTS } = await import('/src/core/career.ts');
    const save = loadSave();
    save.tutorialDone = true;
    save.hints = [...HINTS];
    save.mode = mode;
    const edits = patchSrcs.map((src) => new Function('save', 'mods', 'args', 'return (' + src + ')(save, mods, args)'));
    if (edits.length) {
      const loot = await import('/src/core/loot.ts');
      const museum = await import('/src/core/museum.ts');
      const config = await import('/src/core/config.ts');
      const elite = await import('/src/core/elite.ts');
      for (const edit of edits) edit(save, { COSMETICS: loot.COSMETICS, MUSEUM_IDS: museum.MUSEUM_IDS, BOSS_KINDS: config.BOSS_KINDS, TITLES: elite.TITLES }, args);
    }
    writeSave(save);
  }, { patchSrcs: [].concat(patch ?? []).map((f) => f.toString()), mode, args });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__game, null, { timeout: 60000 });
  await page.waitForTimeout(1800);
}

export const perform = (s, action) => s.page.evaluate((a) => window.__game.game.perform(a), action);

/** The bot: taps in gaps the careful way, or wildly. Runs inside the page on every frame. */
export async function installBot(s) {
  await s.page.evaluate(() => {
    const g = () => window.__game.game;
    const bot = (window.__bot = { mode: 'off', rate: 0.02, taps: 0, log: [], frame: 0, recStart: 0, lastTap: -99 });
    const press = () => {
      if (bot.frame - bot.lastTap < 24) return;
      bot.lastTap = bot.frame;
      bot.taps++;
      document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }));
      document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ', bubbles: true }));
    };
    // Every game event, stamped with the page clock, so the cut knows where the good moments are.
    const session = g();
    const react = session.react.bind(session);
    session.react = (events) => {
      for (const e of events) bot.log.push({ f: bot.frame - bot.recStart, type: e.type, rating: e.rating, take: e.isTakedown, points: e.points, boss: e.boss, inv: e.involvesPlayer, strike: e.isStrike, flames: e.flames });
      return react(events);
    };
    const gapOf = (w, lane, skip = null) => {
      if (!skip) return w.predictedMergeGap(w.layout.player, 0, 40, -Infinity, lane);
      const all = w.vehicles;
      w.vehicles = all.filter((x) => x !== skip);
      const gap = w.predictedMergeGap(w.layout.player, 0, 40, -Infinity, lane);
      w.vehicles = all;
      return gap;
    };
    const tick = () => {
      bot.frame++;
      const game = g();
      const w = game.world;
      if (bot.mode !== 'off' && game.screen.k === 'playing' && w.queue.isReady) {
        const front = w.vehicle(w.queue.vehicles[0]);
        const lane = front?.lane ?? 0;
        if (bot.mode === 'careful' && gapOf(w, lane) > bot.gap) press();
        else if (bot.mode === 'bold' && gapOf(w, lane) > 0.0) press();
        else if (bot.mode === 'wild' && Math.random() < bot.rate) press();
        else if (bot.mode === 'hunter') {
          const crim = w.vehicles.find((x) => w.isLiveCriminal(x));
          if (crim && front?.type === 'police') {
            if (gapOf(w, lane) <= 0 && gapOf(w, lane, crim) > 0.05) press();
          } else {
            if (crim && !bot.dispatched) { game.perform({ k: 'dispatch' }); bot.dispatched = true; }
            if (!crim) bot.dispatched = false;
            if (gapOf(w, lane) > bot.gap) press();
          }
        }
      } else if (bot.mode !== 'off' && game.screen.k === 'ready') press();
      requestAnimationFrame(tick);
    };
    bot.gap = 0.12;
    requestAnimationFrame(tick);
  });
}

export const setBot = (s, mode, extra = {}) => s.page.evaluate(({ mode, extra }) => Object.assign(window.__bot, { mode }, extra), { mode, extra });
export const botLog = (s) => s.page.evaluate(() => window.__bot.log);
export const markStart = (s) => s.page.evaluate(() => { window.__bot.recStart = window.__bot.frame; window.__bot.log.length = 0; });

/** Deterministic capture: the page clock is held, and every frame is one 1/60 s step followed by a screenshot at 2x. */
export async function freeze(s) {
  await s.page.clock.install();
  await s.page.clock.pauseAt(Date.now() + 500);
}

export class Recorder {
  constructor(s, name) {
    this.s = s;
    this.name = name;
    this.dir = join(CLIPS, name);
    this.frames = 0;
    this.pending = [];
  }

  async start() {
    rmSync(this.dir, { recursive: true, force: true });
    mkdirSync(this.dir, { recursive: true });
    return this;
  }

  async advance(seconds) {
    const { page, cdp, format } = this.s;
    const clip = { x: 0, y: 0, width: format.w, height: format.h, scale: format.dpr };
    const n = Math.round(seconds * 60);
    for (let i = 0; i < n; i++) {
      await page.clock.runFor(1000 / 60);
      const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 93, optimizeForSpeed: true, clip });
      this.pending.push(writeFile(join(this.dir, `f${String(this.frames++).padStart(6, '0')}.jpg`), Buffer.from(r.data, 'base64')));
      if (this.pending.length > 40) await Promise.all(this.pending.splice(0));
    }
  }

  async stop() {
    await Promise.all(this.pending);
    const out = join(CLIPS, `${this.name}.mp4`);
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '60', '-i', join(this.dir, 'f%06d.jpg'), '-c:v', 'libx264', '-crf', '14', '-preset', 'fast', '-pix_fmt', 'yuv420p', out], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(r.stderr);
    rmSync(this.dir, { recursive: true, force: true });
    return { out, frames: this.frames, seconds: this.frames / 60 };
  }
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export { existsSync };
