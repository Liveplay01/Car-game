// Renders one cut: node compose/render.mjs <cut> [--frames a-b] [--silent]
// The cut (compose/cuts/<name>.mjs) lists shots from the footage, titles and flashes; every frame is drawn by stage.html.
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..');
const FOOTAGE = join(ROOT, 'footage');
const CACHE = join(ROOT, 'cache');
const OUT = join(ROOT, 'out');
mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT, { recursive: true });

const name = process.argv[2];
const range = process.argv.find((a) => a.startsWith('--frames='))?.slice(9).split('-').map(Number);
const edl = (await import(pathToFileURL(join(import.meta.dirname, 'cuts', `${name}.mjs`)).href)).default;

const integrate = (speed, local) => {
  if (typeof speed === 'number') return local * speed;
  let sum = 0;
  for (let i = 0; i < speed.length - 1; i++) {
    const [t0, v0] = speed[i], [t1, v1] = speed[i + 1];
    if (local <= t0) break;
    const end = Math.min(local, t1);
    const v = v0 + (v1 - v0) * ((end - t0) / (t1 - t0));
    sum += ((v0 + v) / 2) * (end - t0);
  }
  const [tl, vl] = speed[speed.length - 1];
  if (local > tl) sum += vl * (local - tl);
  return sum;
};

// Shots → frame folders (cached by clip, start and span).
edl.shots.forEach((s, i) => {
  s.id = `${s.src}_${Math.round(s.at * 60)}_${Math.round(integrate(s.speed ?? 1, s.dur) * 60)}`;
  s.first = Math.round(s.at * 60);
  const dir = join(CACHE, s.id);
  const span = integrate(s.speed ?? 1, s.dur) + 0.1;
  if (!existsSync(dir) || readdirSync(dir).length === 0) {
    mkdirSync(dir, { recursive: true });
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(s.first / 60), '-t', String(span), '-i', join(FOOTAGE, `${s.src}.mp4`), '-q:v', '2', '-start_number', '0', join(dir, '%05d.jpg')], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`${s.id}: ${r.stderr}`);
  }
  s.frames = readdirSync(dir).length;
});
edl.cache = pathToFileURL(CACHE).href;

const total = Math.round(edl.dur * 60);
const [from, to] = range ?? [0, total - 1];
const frameDir = join(OUT, `${name}-frames`);
if (!range) rmSync(frameDir, { recursive: true, force: true });
mkdirSync(frameDir, { recursive: true });

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: edl.w, height: edl.h }, deviceScaleFactor: 1 })).newPage();
page.on('pageerror', (e) => console.log('[page error]', e.message));
await page.goto(pathToFileURL(join(import.meta.dirname, 'stage.html')).href);
await page.evaluate((e) => window.setup(e), edl);
await page.evaluate(() => document.fonts.ready);
const pending = [];
for (let f = from; f <= to; f++) {
  await page.evaluate((t) => window.frame(t), f / 60);
  const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
  pending.push(writeFile(join(frameDir, `${String(f).padStart(5, '0')}.jpg`), buf));
  if (pending.length > 30) await Promise.all(pending.splice(0));
  if (f % 120 === 0) console.log(`frame ${f}/${total}`);
}
await Promise.all(pending);
await browser.close();

if (!range) {
  const audio = join(OUT, `${name}.wav`);
  if (edl.audio && !process.argv.includes('--silent')) {
    await writeFile(join(OUT, `${name}.audio.json`), JSON.stringify({ dur: edl.dur, ...edl.audio }));
    const a = spawnSync('python', [join(import.meta.dirname, 'audio.py'), join(OUT, `${name}.audio.json`), audio], { encoding: 'utf8' });
    if (a.status !== 0) throw new Error(a.stderr);
    console.log(a.stdout.trim());
  }
  const args = ['-v', 'error', '-y', '-framerate', '60', '-i', join(frameDir, '%05d.jpg')];
  if (existsSync(audio) && !process.argv.includes('--silent')) args.push('-i', audio, '-c:a', 'aac', '-b:a', '256k', '-shortest');
  args.push('-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(OUT, `${name}.mp4`));
  const r = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  console.log('done', join(OUT, `${name}.mp4`));
}
