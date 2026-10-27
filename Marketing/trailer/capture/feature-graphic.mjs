// Play feature graphic (1024x500): node capture/feature-graphic.mjs
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

const html = `<!doctype html><meta charset=utf-8><style>
@font-face{font-family:O;font-style:italic;font-weight:100 900;src:url(${FONT}) format('woff2-variations')}
*{box-sizing:border-box;margin:0}
body{width:1024px;height:500px;overflow:hidden;background:#ffb703;font-family:O,system-ui,sans-serif;font-style:italic;position:relative}
.ring,.ring::after{position:absolute;border-radius:50%;border:40px solid rgba(14,16,19,.07)}
.ring{width:900px;height:900px;left:760px;top:300px;transform:translate(-50%,-50%)}
.ring::after{content:'';inset:60px;border:9px solid rgba(14,16,19,.13)}
.icon{position:absolute;left:64px;top:56px;width:64px;height:64px;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.25)}
.kick{position:absolute;left:144px;top:72px;font-weight:700;font-size:26px;color:rgba(14,16,19,.72)}
h1{position:absolute;left:64px;top:156px;font-weight:850;font-size:80px;line-height:1.02;letter-spacing:-.02em;color:#0e1013}
.phone{position:absolute;width:250px;padding:7px;border-radius:40px;background:#15171b;box-shadow:0 0 0 2px #3a3f47,0 30px 60px rgba(0,0,0,.4);transform-origin:50% 100%}
.phone img{display:block;width:100%;border-radius:33px}
.a{left:612px;top:84px;transform:rotate(-4deg)}
.b{left:800px;top:132px;transform:rotate(4deg)}
</style><div class=ring></div><img class=icon src="${icon}"><div class=kick>Roundabout Timing</div>
<h1>Tap. Merge.<br>Don't crash.</h1>
<div class="phone a"><img src="${still}"></div><div class="phone b"><img src="${still2}"></div>`;

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1024, height: 500 } })).newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const out = resolve(ROOT, '../store-screenshots/roundabout-timing-feature-graphic-1024x500.png');
await page.screenshot({ path: out });
await browser.close();
console.log(out);
