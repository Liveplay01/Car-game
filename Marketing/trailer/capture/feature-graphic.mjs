// Play feature graphic (1024x500) and 1920x1080: node capture/feature-graphic.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './lib.mjs';

const FONT = pathToFileURL(resolve(ROOT, '../../Web/node_modules/@fontsource-variable/overpass/files/overpass-latin-wght-italic.woff2')).href;
const b64 = (f) => `data:image/png;base64,${readFileSync(f).toString('base64')}`;
const still = b64(join(ROOT, 'stills/p-neon-24.png'));
const still2 = b64(join(ROOT, 'stills/p-hunt-38.png'));
const icon = b64(resolve(ROOT, '../roundabout-timing-app-icon-512x512.png'));

const page_html = (W, H, L) => `<!doctype html><meta charset=utf-8><style>
@font-face{font-family:O;font-style:italic;font-weight:100 900;src:url(${FONT}) format('woff2-variations')}
*{box-sizing:border-box;margin:0}
body{width:${W}px;height:${H}px;overflow:hidden;background:#ffb703;font-family:O,system-ui,sans-serif;font-style:italic;position:relative}
.ring,.ring::after{position:absolute;border-radius:50%;border:${L.k * 40}px solid rgba(14,16,19,.07)}
.ring{width:${L.ring}px;height:${L.ring}px;left:${L.ringX}px;top:${L.ringY}px;transform:translate(-50%,-50%)}
.ring::after{content:'';inset:${L.k * 60}px;border:${L.k * 9}px solid rgba(14,16,19,.13)}
.icon{position:absolute;left:${L.k * 64}px;top:${L.iconY}px;width:${L.k * 64}px;height:${L.k * 64}px;border-radius:${L.k * 16}px;box-shadow:0 ${L.k * 8}px ${L.k * 24}px rgba(0,0,0,.25)}
.kick{position:absolute;left:${L.k * 144}px;top:${L.iconY + L.k * 16}px;font-weight:700;font-size:${L.k * 26}px;color:rgba(14,16,19,.72)}
h1{position:absolute;left:${L.k * 64}px;top:${L.h1Y}px;font-weight:850;font-size:${L.k * 80}px;line-height:1.02;letter-spacing:-.02em;color:#0e1013}
.phone{position:absolute;width:${L.k * 250}px;padding:${L.k * 7}px;border-radius:${L.k * 40}px;background:#15171b;box-shadow:0 0 0 ${L.k * 2}px #3a3f47,0 ${L.k * 30}px ${L.k * 60}px rgba(0,0,0,.4);transform-origin:50% 100%}
.phone img{display:block;width:100%;border-radius:${L.k * 33}px}
.a{left:${L.aX}px;top:${L.aY}px;transform:rotate(-4deg)}
.b{left:${L.bX}px;top:${L.bY}px;transform:rotate(4deg)}
</style><div class=ring></div><img class=icon src="${icon}"><div class=kick>Roundabout Timing</div>
<h1>Tap. Merge.<br>Don't crash.</h1>
<div class="phone a"><img src="${still}"></div><div class="phone b"><img src="${still2}"></div>`;

const SIZES = [
  { W: 1024, H: 500, name: '1024x500', L: { k: 1, ring: 900, ringX: 760, ringY: 300, iconY: 56, h1Y: 156, aX: 612, aY: 84, bX: 800, bY: 132 } },
  { W: 1920, H: 1080, name: '1920x1080', L: { k: 1.9, ring: 1700, ringX: 1420, ringY: 640, iconY: 150, h1Y: 380, aX: 1090, aY: 180, bX: 1450, bY: 300 } },
];

const browser = await chromium.launch();
for (const { W, H, name, L } of SIZES) {
  const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
  await page.setContent(page_html(W, H, L), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const out = resolve(ROOT, `../store-screenshots/roundabout-timing-feature-graphic-${name}.png`);
  await page.screenshot({ path: out });
  console.log(out);
}
await browser.close();
