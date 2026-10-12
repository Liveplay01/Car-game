// Scripted UI scenes (chests, casino, collection, builder...): node capture/scenes.mjs <scene> [...]
import { open, boot, perform, freeze, Recorder, CLIPS, PORTRAIT, URL } from './lib.mjs';
import { stage } from './play.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const LEGENDARY_CARS = ['gold', 'royal', 'lagoon', 'diamond', 'holo'];

const common = (save, mods, a) => {
  const c = save.career;
  if (a.casinoSeed !== undefined) { c.casinoSeed = a.casinoSeed; c.casinoRounds = a.casinoRounds ?? 0; }
  if (a.keepOut) c.collection = c.collection.filter((id) => !a.keepOut.includes(id));
  c.carSkins = c.carSkins.filter((id) => c.collection.includes(id));
  if (a.chests) c.chests = a.chests;
  if (a.armSlots) c.armSlots = a.armSlots;
  if (a.upgrades) c.upgrades = a.upgrades;
  if (a.shiftsPlayed !== undefined) save.shiftsPlayed = a.shiftsPlayed;
};

const run = async (name, args, body, { level = 47 } = {}) => {
  const s = await open(PORTRAIT);
  // The casino mixes one random 32-bit number into every round; held at 0 here, so the staged seed decides.
  await s.ctx.addInitScript(() => {
    const real = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = (a) => (a instanceof Uint32Array && a.length === 1 ? ((a[0] = 0), a) : real(a));
  });
  await boot(s, [stage, common], { level, map: null, ...args });
  await s.page.evaluate(async () => {
    window.__game.game.completeAlbums();
  });
  await s.page.waitForTimeout(5500);
  await freeze(s);
  const rec = await new Recorder(s, name).start();
  const adv = (sec) => rec.advance(sec);
  const flow = () => s.page.evaluate(() => window.__game.game.casinoFlow);
  // a scene may return its moments (seconds into the clip) for the cut
  const marks = await body({ s, rec, adv });
  const info = await rec.stop();
  writeFileSync(join(CLIPS, `${name}.json`), JSON.stringify({ ...info, marks }, null, 1));
  await s.browser.close();
  console.log(name, info.seconds.toFixed(1) + 's');
};

const casino = (fn) => (s) => s.page.evaluate(fn);

const SCENES = {
  // The premium chest, tapped open at full power (8 fast taps): a legendary first, an epic after it.
  // The page searches the save's play count for such a pair.
  async chest() {
    const keepOut = [...LEGENDARY_CARS, 'chrome', 'starlight', 'blackGold', 'carbon', 'tiger', 'aurora', 'ember', 'cosmos', 'abyss'];
    await run('s-chest', { keepOut, chests: ['premium', 'premium', 'event'] }, async ({ s, rec, adv }) => {
      const n = await s.page.evaluate(async () => {
        const { Careers } = await import('/src/core/career.ts');
        const g = window.__game.game;
        for (let n = 1; n < 60000; n++) {
          const c = structuredClone(g.save.career);
          const seed = n * 7919 + g.popupSerial;
          const a = Careers.openChest(c, 0, seed, g.today, 1);
          if (!a || a.isDuplicate || a.item.rarity !== 'legendary' || a.item.kind !== 'carSkin') continue;
          const b = Careers.openChest(c, 0, seed, g.today, 1);
          if (!b || b.isDuplicate || !['epic', 'legendary'].includes(b.item.rarity)) continue;
          g.save.shiftsPlayed = n;
          return { n, a: a.item.id, b: b.item.id };
        }
        return null;
      });
      console.log('chest seed', n);
      await perform(s, { k: 'showShop', section: 0 });
      await adv(1.2);
      const marks = { open: rec.frames / 60 };
      await perform(s, { k: 'openChest', index: 0 });
      await adv(0.9);
      marks.taps = [];
      for (let i = 0; i < 8; i++) {
        marks.taps.push(rec.frames / 60);
        await perform(s, { k: 'hitChest' });
        await adv(0.18);
      }
      await adv(10);
      return marks;
    });
  },

  async crash() {
    await run('s-crash', { casinoSeed: 143400, casinoRounds: 0 }, async ({ s, adv }) => {
      await perform(s, { k: 'showShop', section: 2 });
      await adv(1.0);
      const tap = (t) => s.page.evaluate((t) => window.__game.game.casinoFlow.tap(t), t);
      await tap({ k: 'stake', index: 3 });
      await adv(0.6);
      await tap({ k: 'play' });
      for (let i = 0; i < 400; i++) {
        await adv(0.1);
        const done = await s.page.evaluate(async () => {
          const { Casino } = await import('/src/core/casino.ts');
          const { baseConfig } = await import('/src/core/config.ts');
          const run = window.__game.game.casinoFlow.host.casino.run;
          return run && run.age >= Casino.timeOf(11.4, baseConfig);
        });
        if (done) break;
      }
      await tap({ k: 'cashOut' });
      await adv(6);
    });
  },

  // Reel "Cash out… NOW": a clutch cash-out, a won coin flip, then one round too greedy. The page searches a casino seed for that story.
  async greed() {
    const seed = await (async () => {
      const s = await open(PORTRAIT);
      await s.page.goto(URL, { waitUntil: 'load' });
      const found = await s.page.evaluate(async () => {
        const { Casino } = await import('/src/core/casino.ts');
        Casino.useEntropy(null); // the recording holds the entropy at 0, which mixes in nothing
        const point =(casinoSeed, casinoRounds) => Casino.crashPoint(Casino.rng({ casinoSeed, casinoRounds }, 'crash').int(0, 0xfffffffe));
        for (let n = 1; n < 2_000_000; n++) {
          const a = point(n, 0);
          if (a < 4.5 || a > 6) continue;
          if (Casino.rng({ casinoSeed: n, casinoRounds: 1 }, 'flip').unit() >= 0.5) continue;
          const b = point(n, 2);
          if (b >= 9 && b <= 11) return { n, a, b };
        }
        return null;
      });
      await s.browser.close();
      return found;
    })();
    console.log('greed seed', seed);
    await run('s-greed', { casinoSeed: seed.n, casinoRounds: 0 }, async ({ s, rec, adv }) => {
      await perform(s, { k: 'showShop', section: 2 });
      await adv(1.0);
      const tap = (t) => s.page.evaluate((t) => window.__game.game.casinoFlow.tap(t), t);
      const age = () => s.page.evaluate(() => window.__game.game.casinoFlow.host.casino.run?.age ?? 0);
      const timeOf = (m) => Math.log(m) / 0.18; // config.crashRate
      const now = () => rec.frames / 60;
      const marks = { a: seed.a, b: seed.b };
      await tap({ k: 'stake', index: 1 });
      await adv(0.6);
      marks.play1 = now();
      await tap({ k: 'play' });
      while ((await age()) < timeOf(seed.a) - 0.12) await adv(1 / 60);
      marks.cashOut = now();
      await tap({ k: 'cashOut' });
      await adv(2.5);
      marks.flip = now();
      await tap({ k: 'double' });
      await adv(4.5);
      marks.collect = now();
      await tap({ k: 'collect' });
      await adv(1.2);
      marks.play2 = now();
      await tap({ k: 'play' });
      await adv(timeOf(seed.b) + 4);
      return marks;
    });
  },

  async slots() {
    await run('s-slots', { casinoSeed: 143400, casinoRounds: 1 }, async ({ s, adv }) => {
      await perform(s, { k: 'showShop', section: 2 });
      await adv(0.8);
      const tap = (t) => s.page.evaluate((t) => window.__game.game.casinoFlow.tap(t), t);
      await tap({ k: 'game', game: 'slots' });
      await adv(1.0);
      await tap({ k: 'stake', index: 3 });
      await adv(0.6);
      await tap({ k: 'play' });
      await adv(10);
    });
  },

  async upgrade() {
    await run('s-upgrade', { casinoSeed: 143400, casinoRounds: 2, keepOut: ['diamond'] }, async ({ s, adv }) => {
      await perform(s, { k: 'showShop', section: 2 });
      await adv(0.8);
      const tap = (t) => s.page.evaluate((t) => window.__game.game.casinoFlow.tap(t), t);
      await tap({ k: 'game', game: 'upgrade' });
      await adv(1.0);
      await tap({ k: 'slot', slot: 0 });
      await adv(0.7);
      for (const id of ['carbon', 'blackGold', 'nightMint']) { await tap({ k: 'pick', id }); await adv(0.45); }
      await tap({ k: 'done' });
      await adv(0.6);
      await tap({ k: 'slot', slot: 5 });
      await adv(0.7);
      await tap({ k: 'pick', id: 'diamond' });
      await adv(0.8);
      await tap({ k: 'play' });
      await adv(10);
    });
  },

  async collection() {
    await run('s-collection', {}, async ({ s, adv }) => {
      await perform(s, { k: 'showShop', section: 1 });
      await adv(1.0);
      await s.page.mouse.move(270, 560);
      for (let i = 0; i < 9 * 60; i++) {
        await s.page.mouse.wheel(0, 9);
        await adv(1 / 60);
      }
      await adv(0.5);
    });
  },

  async builder() {
    await run('s-builder', { armSlots: [0, 4, 8, 12], upgrades: {} }, async ({ s, adv }) => {
      await perform(s, { k: 'showTab', tab: 'streetBuilder' });
      await adv(1.4);
      for (const slot of [2, 6, 10]) {
        await perform(s, { k: 'pickUpPart', part: 'arm' });
        await adv(0.5);
        await perform(s, { k: 'placePart', slot });
        await adv(0.7);
        await perform(s, { k: 'buildPart' });
        await adv(1.4);
      }
      await perform(s, { k: 'pickUpPart', part: 'tollBooth' });
      await adv(0.5);
      await perform(s, { k: 'placePart', slot: 0 });
      await adv(0.7);
      await perform(s, { k: 'buildPart' });
      await adv(2.0);
    });
  },

  async museum() {
    await run('s-museum', {}, async ({ s, adv }) => {
      await perform(s, { k: 'showProgress', section: 3 });
      await adv(1.0);
      await s.page.mouse.move(270, 560);
      for (let i = 0; i < 7 * 60; i++) {
        await s.page.mouse.wheel(0, 9);
        await adv(1 / 60);
      }
    });
  },

  async upgrades() {
    await run('s-upgrades', { upgrades: {} }, async ({ s, adv }) => {
      await perform(s, { k: 'showTab', tab: 'upgrades' });
      await adv(1.2);
      for (const upgrade of ['morePatrols', 'dispatchRadio', 'backup', 'morePatrols']) {
        await perform(s, { k: 'selectUpgrade', upgrade });
        await adv(0.6);
        await perform(s, { k: 'buy', upgrade });
        await adv(1.0);
      }
    });
  },
};

for (const name of process.argv.slice(2)) await SCENES[name]();
