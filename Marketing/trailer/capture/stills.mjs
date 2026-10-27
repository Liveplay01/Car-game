// Still screenshots of the real game for the store listing: node capture/stills.mjs <menus|play|all>
import { open, boot, perform, installBot, setBot, markStart, freeze, PORTRAIT, ROOT } from './lib.mjs';
import { stage } from './play.mjs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = join(ROOT, 'stills');

const session = async (args, { mode = 'shift', bot = false } = {}) => {
  const s = await open(PORTRAIT);
  await boot(s, stage, args, { mode });
  if (bot) await installBot(s);
  await freeze(s);
  const clip = { x: 0, y: 0, width: PORTRAIT.w, height: PORTRAIT.h, scale: PORTRAIT.dpr };
  const adv = (sec) => s.page.clock.runFor(sec * 1000);
  const snap = async (name) => {
    const r = await s.cdp.send('Page.captureScreenshot', { format: 'png', clip });
    await writeFile(join(OUT, `${name}.png`), Buffer.from(r.data, 'base64'));
  };
  return { s, adv, snap };
};

const MENUS = {
  ready: { level: 25, map: 'neon', go: async () => {} },
  daily: { level: 25, go: ({ s }) => perform(s, { k: 'showProgress', section: 0 }) },
  goals: { level: 25, go: ({ s }) => perform(s, { k: 'showProgress', section: 1 }) },
  stats: { level: 52, go: ({ s }) => perform(s, { k: 'showProgress', section: 2 }) },
  museum: { level: 52, go: ({ s }) => perform(s, { k: 'showProgress', section: 3 }) },
  chests: { level: 25, go: ({ s }) => perform(s, { k: 'showShop', section: 0 }) },
  collection: { level: 52, go: ({ s }) => perform(s, { k: 'showShop', section: 1 }) },
  casino: { level: 25, go: ({ s }) => perform(s, { k: 'showShop', section: 2 }) },
  upgrades: { level: 25, go: ({ s }) => perform(s, { k: 'showTab', tab: 'upgrades' }) },
  builder: { level: 52, go: ({ s }) => perform(s, { k: 'showTab', tab: 'streetBuilder' }) },
  ranks: { level: 52, go: ({ s }) => perform(s, { k: 'showSocial', section: 0 }) },
  crew: { level: 52, go: ({ s }) => perform(s, { k: 'showSocial', section: 1 }) },
  club: { level: 52, go: ({ s }) => perform(s, { k: 'showSocial', section: 2 }) },
  mafia: { level: 52, go: ({ s }) => perform(s, { k: 'showSocial', section: 3 }) },
};

// name, level, map, mode, bot, seconds
const PLAYS = [
  ['p-neon', 25, 'neon', 'shift', 'peak', 26],
  ['p-sakura', 22, 'sakura', 'shift', 'peak', 24],
  ['p-snow', 24, 'snowfall', 'shift', 'peak', 24],
  ['p-hunt', 10, 'meadow', 'shift', 'hunter', 44],
  ['p-boss', 15, 'sand', 'shift', 'bold', 36],
  ['p-crash', 8, 'meadow', 'shift', 'wild', 22],
  ['p-mayhem', 6, 'canyon', 'mayhem', 'wild', 34],
  ['p-tropic', 18, 'tropic', 'shift', 'peak', 24],
];

const what = process.argv[2] ?? 'all';
if (what === 'menus' || what === 'all') {
  for (const [name, m] of Object.entries(MENUS)) {
    const k = await session({ level: m.level, map: m.map ?? null });
    await k.adv(1);
    await m.go(k);
    await k.adv(2);
    await k.snap(`m-${name}`);
    await k.s.browser.close();
    console.log('menu', name);
  }
}
if (what === 'play' || what === 'all') {
  for (const [name, level, map, mode, bot, seconds] of PLAYS) {
    const k = await session({ level, map }, { mode, bot: true });
    await markStart(k.s);
    await setBot(k.s, bot);
    for (let t = 1; t <= seconds; t++) {
      await k.adv(1);
      if (t % 2 === 0) await k.snap(`${name}-${String(t).padStart(2, '0')}`);
    }
    await k.s.browser.close();
    console.log('play', name);
  }
}
