// Store screenshots (1080x1920): game still in a phone frame under a headline. node capture/compose-stills.mjs
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './lib.mjs';

const FONT = resolve(ROOT, '../../Web/node_modules/@fontsource-variable/overpass/files/overpass-latin-wght-italic.woff2');
const FONT_URL = pathToFileURL(FONT).href;
const OUT =resolve(ROOT, '../store-screenshots');
mkdirSync(OUT, { recursive: true });

const THEMES = {
  amber: { bg: '#ffb703', ink: '#0e1013', sub: 'rgba(14,16,19,.72)', ring: 'rgba(14,16,19,.12)', ring2: 'rgba(14,16,19,.07)' },
  night: { bg: '#0b0d10', ink: '#f4f6f9', sub: '#99a2af', ring: 'rgba(255,183,3,.9)', ring2: 'rgba(255,183,3,.18)' },
  mint: { bg: '#00f5d4', ink: '#06201c', sub: 'rgba(6,32,28,.72)', ring: 'rgba(6,32,28,.14)', ring2: 'rgba(6,32,28,.08)' },
  violet: { bg: '#2a1b52', ink: '#f4f6f9', sub: '#c7b8f0', ring: 'rgba(176,132,255,.9)', ring2: 'rgba(176,132,255,.2)' },
};

// still, headline, subline, theme, tilt (deg), shift (px right of centre)
export const SLIDES = JSON.parse(readFileSync(join(ROOT, 'capture/slides.json'), 'utf8'));

const page = ({ still, title, sub, theme, tilt = 0, dx = 0, drop = 0, ring = 'c' }) => {
  const t = THEMES[theme];
  const img = `data:image/png;base64,${readFileSync(join(ROOT, 'stills', `${still}.png`)).toString('base64')}`;
  const ringPos = { c: 'left:50%;top:1060px', l: 'left:-120px;top:1300px', r: 'left:1180px;top:900px' }[ring];
  return `<!doctype html><meta charset=utf-8><style>
@font-face{font-family:O;font-style:italic;font-weight:100 900;src:url(file:///${FONT_URL}) format('woff2-variations')}
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1920px;overflow:hidden;background:${t.bg};font-family:O,system-ui,sans-serif;font-style:italic;position:relative}
.ring,.ring::after{position:absolute;border-radius:50%;border:64px solid ${t.ring2}}
.ring{width:1500px;height:1500px;${ringPos};transform:translate(-50%,-50%)}
.ring::after{content:'';inset:100px;border:14px solid ${t.ring}}
h1{position:absolute;left:72px;right:72px;top:104px;font-weight:850;font-size:112px;line-height:1.02;letter-spacing:-.02em;color:${t.ink}}
p{position:absolute;left:72px;right:72px;top:${title.includes('\n') ? 360 : 250}px;font-weight:500;font-size:40px;line-height:1.3;color:${t.sub}}
.phone{position:absolute;left:${(1080 - 800) / 2 + dx}px;top:${drop || 480}px;width:800px;padding:16px;border-radius:92px;background:#15171b;box-shadow:0 0 0 3px #3a3f47,0 60px 120px rgba(0,0,0,.45);transform:rotate(${tilt}deg);transform-origin:50% 100%}
.phone img{display:block;width:100%;border-radius:76px}
</style><div class=ring></div><h1>${title.replace(/\n/g, '<br>')}</h1><p>${sub}</p><div class=phone><img src="${img}"></div>`;
};

const only = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
const tab = await ctx.newPage();
for (const [i, s] of SLIDES.entries()) {
  if (only.length && !only.includes(String(i + 1))) continue;
  await tab.setContent(page(s), { waitUntil: 'load' });
  await tab.evaluate(() => document.fonts.ready);
  const file = join(OUT, `roundabout-timing-store-${i + 1}-${s.name}.png`);
  await tab.screenshot({ path: file });
  console.log(file);
}
await browser.close();
