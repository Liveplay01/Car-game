// "Now live on Google Play" promo (1080x1920): node capture/store-live.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './lib.mjs';

const FONT = pathToFileURL(resolve(ROOT, '../../Web/node_modules/@fontsource-variable/overpass/files/overpass-latin-wght-italic.woff2')).href;
const b64 = (f, type) => `data:${type};base64,${readFileSync(f).toString('base64')}`;
const still = b64(join(ROOT, 'stills/p-neon-24.png'), 'image/png');
const icon = b64(resolve(ROOT, '../roundabout-timing-app-icon-512x512.png'), 'image/png');
const qr = b64(join(ROOT, 'capture/play-qr.svg'), 'image/svg+xml');

const html = `<!doctype html><meta charset=utf-8><style>
@font-face{font-family:O;font-style:italic;font-weight:100 900;src:url(${FONT}) format('woff2-variations')}
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1920px;overflow:hidden;background:#ffb703;font-family:O,system-ui,sans-serif;font-style:italic;position:relative;color:#0e1013}
.ring,.ring::after{position:absolute;border-radius:50%;border:64px solid rgba(14,16,19,.07)}
.ring{width:1500px;height:1500px;left:1180px;top:900px;transform:translate(-50%,-50%)}
.ring::after{content:'';inset:100px;border:14px solid rgba(14,16,19,.12)}
.icon{position:absolute;left:72px;top:96px;width:96px;height:96px;border-radius:24px;box-shadow:0 12px 32px rgba(0,0,0,.25)}
.kick{position:absolute;left:192px;top:124px;font-weight:700;font-size:40px;color:rgba(14,16,19,.72)}
h1{position:absolute;left:72px;right:72px;top:240px;font-weight:850;font-size:112px;line-height:1.02;letter-spacing:-.02em}
p{position:absolute;left:72px;right:72px;top:496px;font-weight:500;font-size:40px;line-height:1.3;color:rgba(14,16,19,.72)}
.phone{position:absolute;left:260px;top:640px;width:700px;padding:14px;border-radius:80px;background:#15171b;box-shadow:0 0 0 3px #3a3f47,0 60px 120px rgba(0,0,0,.45);transform:rotate(4deg);transform-origin:50% 100%}
.phone img{display:block;width:100%;border-radius:66px}
.card{position:absolute;left:72px;bottom:96px;width:384px;padding:32px 32px 24px;border-radius:48px;background:#fff;box-shadow:0 32px 64px rgba(0,0,0,.35);transform:rotate(-3deg)}
.card img{display:block;width:100%}
.card b{display:block;margin-top:8px;text-align:center;font-weight:800;font-size:36px}
</style><div class=ring></div><img class=icon src="${icon}"><div class=kick>Roundabout Timing</div>
<h1>Now live on<br>Google Play.</h1><p>Free to install. Scan, tap, merge.</p>
<div class=phone><img src="${still}"></div>
<div class=card><img src="${qr}"><b>Scan to install</b></div>`;

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const out = resolve(ROOT, '../store-screenshots/roundabout-timing-live-on-google-play.png');
await page.screenshot({ path: out });
await browser.close();
console.log(out);
