// Custom store listing screenshots: node capture/compose-csl.mjs [id ...]. Reads csl.json, writes ../../store-listings/<id>/.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ROOT } from './lib.mjs';
import { page } from './compose-stills.mjs';

const OUT = resolve(ROOT, '../store-listings');
const LISTINGS = JSON.parse(readFileSync(join(ROOT, 'capture/csl.json'), 'utf8'));
const only = process.argv.slice(2);

const browser = await chromium.launch();
const tab = await (await browser.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
for (const [id, slides] of Object.entries(LISTINGS)) {
  if (only.length && !only.includes(id)) continue;
  const dir = join(OUT, id);
  mkdirSync(dir, { recursive: true });
  for (const [i, [still, title, sub, theme, tilt, ring]] of slides.entries()) {
    await tab.setContent(page({ still, title, sub, theme, tilt, ring }), { waitUntil: 'load' });
    await tab.evaluate(() => document.fonts.ready);
    await tab.screenshot({ path: join(dir, `${id}-${i + 1}-${still}.png`) });
  }
  console.log(id);
}
await browser.close();
