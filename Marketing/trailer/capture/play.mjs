// Films one gameplay scenario by stepping the game clock: node capture/play.mjs <name> [level] [mapSkin] [mode] [bot] [seconds]
import { open, boot, installBot, setBot, botLog, markStart, freeze, Recorder, PORTRAIT, LANDSCAPE, CLIPS } from './lib.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const stage = (save, mods, a) => {
  const c = save.career;
  c.level = a.level;
  c.money = a.money ?? 1250000;
  c.collection = mods.COSMETICS.map((x) => x.id);
  c.unseen = [];
  c.carSkins = a.skins ?? ['gold', 'diamond', 'holo', 'royal', 'lagoon', 'chrome', 'starlight', 'carbon'];
  c.mapSkin = a.map;
  // today's Daily counts as played, so the waiting card is the normal shift (`core/daily.ts`, dayNumber)
  const now = new Date();
  c.dailyDone = c.dailyPlayed = Math.floor((now.getTime() / 1000 - now.getTimezoneOffset() * 60) / 86400);
  c.museumSeen = [...mods.MUSEUM_IDS];
  c.museumNew = [];
  c.bossesBeaten = [...mods.BOSS_KINDS];
  c.bossTrophies = 9;
  c.titlesSeen = [...mods.TITLES];
  c.prestige = 2;
  c.armSlots = [0, 2, 4, 6, 8, 10];
  c.upgrades = { backup: 3 };
  c.chests = ['standard', 'standard', 'premium', 'premium', 'event', 'standard'];
  save.highscore = 48250;
};

// Pins the sky of every shift ('snow', 'storm/night', '-/blackout'): the seed would rarely bring it.
const pinSky = (s, sky) => s.page.evaluate(async ([weather, darkness]) => {
  const { Careers } = await import('/src/core/career.ts');
  const { forNight } = await import('/src/core/levels.ts');
  const config = Careers.config;
  Careers.config = (c, base, seed, w, ...rest) => {
    const out = config(c, base, seed, weather && weather !== '-' ? weather : w, ...rest);
    return darkness ? forNight(out, darkness) : out;
  };
  window.__game.game.prepareShift(false);
}, sky.split('/'));

export async function play({ name, level = 20, map = null, mode = 'shift', bot = "careful", seconds = 20, format = PORTRAIT, gap, rate, sky, warm = 0.5 }) {
  const s = await open(format);
  await boot(s, stage, { level, map }, { mode });
  if (sky) await pinSky(s, sky);
  await installBot(s);
  await freeze(s);
  const rec = await new Recorder(s, name).start();
  await markStart(s);
  await setBot(s, bot, { ...(gap ? { gap } : {}), ...(rate ? { rate } : {}) });
  await rec.advance(seconds);
  const log = await botLog(s);
  const info = await rec.stop();
  writeFileSync(join(CLIPS, `${name}.json`), JSON.stringify({ ...info, log }, null, 1));
  await s.browser.close();
  const counts = {};
  for (const e of log) counts[e.type] = (counts[e.type] ?? 0) + 1;
  console.log(name, info.seconds.toFixed(1) + 's', JSON.stringify(counts));
}

if (process.argv[1].endsWith('play.mjs')) {
  const [, , name, level, map, mode, bot, seconds, layout, sky] = process.argv;
  await play({ format: layout === 'landscape' ? LANDSCAPE : PORTRAIT, name, level: Number(level ?? 20), map: map && map !== '-' ? map : null, mode: mode ?? 'shift', bot: bot ?? 'careful', seconds: Number(seconds ?? 20), sky });
}
