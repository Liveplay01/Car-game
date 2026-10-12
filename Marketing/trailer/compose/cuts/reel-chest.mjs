// Reel "Legendary?": a premium chest tapped open at full power, the reel creeps, a legendary skin, then the car on the road.
// The odds are the game's own; the scene only picked the seed (capture/scenes.mjs, chest).
import { readFileSync } from 'node:fs';
import { merges, when, VIEW, SAFE, endCard } from './social.mjs';

const { marks: M } = JSON.parse(readFileSync(new URL('../../footage/s-chest.json', import.meta.url)));
const STOP = 7.2; // the reel stops on the legendary, the gold flash (seen on the clip)
const BURST = M.taps.at(-1) + 0.12;

const shots = [], titles = [], taps = [], sfx = [], flashes = [], booms = [];
const CHEST = { ...VIEW, scale: 1.22, anchor: [0.5, 0.47], punch: 0.05, push: 0.03 };
const say = (t, dur, lines, extra = {}) => titles.push({ ...SAFE, t, dur, y: 0.16, anim: 'slam', rot: titles.length % 2 ? 2 : -2, lines, ...extra });
let t = 0;

// 1. tap fast: every tap a little higher
const a = { t, src: 's-chest', at: M.taps[0] - 0.7, dur: BURST + 0.25 - (M.taps[0] - 0.7), ...CHEST };
shots.push(a);
say(0, 0.7, [{ text: 'Tap', size: 2.6 }, { text: 'fast.', size: 2.6, c: 'accent' }], { anim: 'pop' });
M.taps.forEach((x, i) => {
  const tt = when(a, x);
  taps.push({ t: tt, x: 0.5, y: 0.47 });
  sfx.push({ name: 'needleTick', t: tt, gain: 0.45 + 0.05 * i, rate: 0.8 + 0.09 * i });
  if (i % 2 === 1) say(tt, 0.36, [{ text: `×${i + 1}`, size: 2.2, c: i === 7 ? 'mint' : 'accent' }], { inDur: 0.1, outDur: 0.06 });
});
sfx.push({ name: 'chestCharge', t: when(a, M.taps[0]) - 0.05, gain: 0.7 }, { name: 'chestBurst', t: when(a, BURST), gain: 0.9 });
flashes.push({ t: when(a, BURST), a: 0.5 });
booms.push({ t: when(a, BURST), gain: 0.7 });
t += a.dur;

// 2. the reel: fast, then creeping into the stop
const reelStart = t;
const b = { t, src: 's-chest', at: BURST + 0.25, dur: 60, ...VIEW, scale: 1.08, anchor: [0.5, 0.47], punch: 0.04 };
b.speed = [[0, 2], [0.9, 2], [1.1, 0.7]];
const stopT = when(b, STOP);
b.dur = stopT - t;
shots.push(b);
say(reelStart, stopT - reelStart - 0.02, [{ text: 'Legendary?', size: 2.4, c: 'accent' }], { kicker: 'Come on…', kickerSize: 0.36, anim: 'rise', y: 0.2 });
for (let k = 0, x = reelStart + 0.25; x < stopT - 0.15; k++, x += 0.25 + 0.06 * k) sfx.push({ name: 'uiTick', t: x, gain: 0.35, rate: 1.2 - 0.04 * k });
t += b.dur;

// 3. the reveal
const c = { t, src: 's-chest', at: STOP, dur: 2.6, ...VIEW, scale: 1.12, anchor: [0.5, 0.47], punch: 0.12, shake: 0.6, shakeDur: 0.4 };
shots.push(c);
say(t + 0.05, 2.5, [{ text: 'LEGENDARY.', size: 2.5, c: 'accent' }], { y: 0.76 });
sfx.push({ name: 'chestBurstRare', t, gain: 1 }, { name: 'shiftComplete', t: t + 0.5, gain: 0.5, rate: 1.06 });
flashes.push({ t, a: 0.8, c: '#ffd23f' });
booms.push({ t, gain: 1 });
t += c.dur;

// 4. on the road: the holo skin in a real shift
const road = merges('w-extreme').filter((m) => m.rating === 'perfect')[1].t;
const d = { t, src: 'w-extreme', at: road - 1.2, dur: 1.9, ...VIEW, scale: 1.1, anchor: [0.5, 0.62] };
shots.push(d);
say(t, d.dur, [{ text: 'Now drive it.', size: 2.1, c: 'mint' }], { anim: 'rise' });
sfx.push({ name: 'perfect', t: when(d, road), gain: 0.8 });
flashes.push({ t: when(d, road), a: 0.3 });
t += d.dur;

const endAt = t;
shots.push({ t, dur: 3.2, src: 'w-extreme', at: road + 0.8, speed: 0.6, ...VIEW, punch: 0 });
const end = endCard(endAt + 0.1, 3.0);
titles.push(...end.titles, { ...SAFE, t: endAt + 0.9, dur: 2.3, y: 0.78, anim: 'fade', outDur: 0.01, drift: 0.01, kicker: 'Chests are earned · odds on screen', kickerClass: 'dark', kickerSize: 0.26, lines: [] });
const dur = endAt + 3.2;
titles.filter((x) => (x.anim ?? 'slam') === 'slam' && !x.lines[0].text.startsWith('×')).forEach((x, i) => sfx.push({ name: 'swoosh', t: Math.max(0, x.t - 0.05), gain: 0.3, rate: 0.92 + 0.06 * (i % 3) }));

export default {
  w: 1080, h: 1920, dur, layout: 'portrait',
  shots, titles, taps, flashes, shades: end.shades,
  audio: {
    music: [
      { stem: 'base', from: 0, to: dur, gain: 0.45 },
      { stem: 'rhythm', from: 0, to: reelStart, gain: 0.55 },
      { stem: 'bass', from: reelStart, to: dur, gain: 0.55 },
      { stem: 'rush', from: reelStart, to: stopT, gain: 0.45 },
      { stem: 'lead', from: stopT, to: dur, gain: 0.5 },
      { stem: 'flow', from: endAt, to: dur, gain: 0.45 },
    ],
    sfx, booms,
    risers: [{ from: reelStart + 0.4, to: stopT, gain: 0.5 }],
    fadeOut: 0.6,
  },
};
