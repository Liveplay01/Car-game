// Reel "Cash out… NOW": Crash in the casino. A clutch cash-out, a won coin flip, then one round too greedy.
// The odds are the game's own; the scene only picked the seed (capture/scenes.mjs, greed). Play money only.
import { readFileSync } from 'node:fs';
import { when, VIEW, SAFE, endCard } from './social.mjs';

const { marks: M } = JSON.parse(readFileSync(new URL('../../footage/s-greed.json', import.meta.url)));
const CRASH_RATE = 0.18; // config.crashRate: the multiplier is e^(rate · t)
const reach = (start, m) => start + Math.log(m) / CRASH_RATE;

const shots = [], titles = [], taps = [], sfx = [], flashes = [], booms = [];
const UI = { ...VIEW, scale: 1.04, anchor: [0.5, 0.42], punch: 0.04, push: 0.03 };
// fast through the climb, slow for the last `lead` source seconds before the moment `span` seconds in
const ramp = (span, fast, slow, lead) => {
  const l1 = 0.3 + (span - lead - (0.3 * (1 + fast)) / 2 - (0.2 * (fast + slow)) / 2) / fast;
  return [[0, 1], [0.3, fast], [l1, fast], [l1 + 0.2, slow]];
};
const say = (t, dur, lines, extra = {}) => titles.push({ ...SAFE, t, dur, y: 0.16, anim: 'slam', rot: titles.length % 2 ? 2 : -2, lines, ...extra });
let t = 0;

// 1. the climb, fast, then slow into the cash-out a hair before the crash
const out1 = M.cashOut, crash1 = reach(M.play1, M.a);
const a = { t, src: 's-greed', at: M.play1 - 0.3, dur: 60, ...UI };
a.speed = ramp(out1 - a.at, 4.5, 0.7, 1.0);
const outT = when(a, out1), clutchT = when(a, crash1);
a.dur = outT + 1.6 - t;
shots.push(a);
say(0, outT - 0.02, [{ text: 'Cash out…', size: 2.3 }]);
say(outT, a.dur - outT, [{ text: 'NOW!', size: 3, c: 'accent' }], { anim: 'slam' });
taps.push({ t: outT, x: 0.5, y: 0.9 });
sfx.push({ name: 'chipsIn', t: 0.2, gain: 0.6 }, { name: 'paid', t: outT, gain: 1 }, { name: 'crash', t: clutchT, gain: 0.55, rate: 1.1 });
flashes.push({ t: outT, a: 0.4, c: '#ffd23f' });
booms.push({ t: outT, gain: 0.8 });
// the meter ticks up with the climb, a little higher each beat
for (let k = 0, x = 0.5; x < outT - 0.3; k++, x += 0.5) sfx.push({ name: 'needleTick', t: x, gain: 0.25 + 0.03 * k, rate: 0.9 + 0.05 * k });
t += a.dur;

// 2. double or nothing: the coin
const flipStart = t;
const LAND = M.flip + 1.12; // the coin lands about a second after the tap (seen on the clip)
const b = { t, src: 's-greed', at: M.flip - 0.3, dur: 60, ...UI, scale: 1.1, anchor: [0.5, 0.5], punch: 0.06 };
b.speed = [[0, 1], [0.3, 0.55], [2.1, 0.55], [2.2, 1]];
const landT = when(b, LAND);
b.dur = landT + 1.3 - t;
shots.push(b);
say(flipStart, landT - flipStart - 0.02, [{ text: 'Double', size: 2.2 }, { text: 'or nothing?', size: 1.8, c: 'accent' }], { kicker: 'Would you?', kickerSize: 0.36, anim: 'pop' });
say(landT, flipStart + b.dur - landT, [{ text: 'Doubled.', size: 2.6, c: 'mint' }]);
taps.push({ t: when(b, M.flip), x: 0.22, y: 0.9 });
sfx.push({ name: 'coinToss', t: when(b, M.flip) + 0.03, gain: 0.9 }, { name: 'coinLand', t: landT - 0.05, gain: 1 }, { name: 'coinClink', t: landT + 0.15, gain: 0.6, rate: 1.1 });
flashes.push({ t: landT, a: 0.35 });
t += b.dur;

// 3. one more round, and no cash-out this time
const greedStart = t;
const crash2 = reach(M.play2, M.b);
const c = { t, src: 's-greed', at: M.play2 - 0.2, dur: 60, ...UI };
c.speed = ramp(crash2 - c.at, 5, 0.7, 1.2);
const bustT = when(c, crash2);
c.dur = bustT + 1.7 - t;
c.shake = 0;
shots.push(c);
say(greedStart, 1.2, [{ text: 'One more.', size: 2.3, c: 'accent' }], { anim: 'pop' });
say(greedStart + 1.2, bustT - greedStart - 1.22, [{ text: 'Hold…', size: 2.2 }, { text: 'hold…', size: 1.8, c: 'accent' }], { anim: 'rise' });
say(bustT, c.dur - (bustT - greedStart), [{ text: 'Greedy.', size: 2.8, c: 'red' }]);
taps.push({ t: greedStart + 0.1, x: 0.5, y: 0.9 });
sfx.push({ name: 'chipsIn', t: greedStart + 0.1, gain: 0.5, rate: 1.08 }, { name: 'crashHeavy', t: bustT, gain: 1 }, { name: 'denied', t: bustT + 0.35, gain: 0.5 });
for (let k = 0, x = greedStart + 0.5; x < bustT - 0.2; k++, x += 0.5) sfx.push({ name: 'meterTick', t: x, gain: 0.2 + 0.03 * k, rate: 0.85 + 0.06 * k });
flashes.push({ t: bustT, a: 0.6, c: '#ff4d4d' });
booms.push({ t: bustT, gain: 1 });
t += c.dur;

// the honest line, then the end card over the street
const endAt = t;
shots.push({ t, dur: 3.4, src: 'w-night', at: 12.0, speed: 0.6, ...VIEW, punch: 0 });
const end = endCard(endAt + 0.1, 3.2);
titles.push(...end.titles, { ...SAFE, t: endAt + 0.9, dur: 2.5, y: 0.78, anim: 'fade', outDur: 0.01, drift: 0.01, kicker: 'Game coins only · odds on screen', kickerClass: 'dark', kickerSize: 0.26, lines: [] });
const dur = endAt + 3.4;
titles.filter((x) => (x.anim ?? 'slam') === 'slam').forEach((x, i) => sfx.push({ name: 'swoosh', t: Math.max(0, x.t - 0.05), gain: 0.3, rate: 0.9 + 0.07 * (i % 3) }));
sfx.push({ name: 'shiftComplete', t: endAt, gain: 0.7 });

export default {
  w: 1080, h: 1920, dur, layout: 'portrait',
  shots, titles, taps, flashes, shades: end.shades,
  audio: {
    music: [
      { stem: 'base', from: 0, to: dur, gain: 0.45 },
      { stem: 'rhythm', from: 0, to: bustT, gain: 0.5 },
      { stem: 'bass', from: 0, to: bustT, gain: 0.55 },
      { stem: 'lead', from: flipStart, to: greedStart, gain: 0.45 },
      { stem: 'rush', from: greedStart + 1.2, to: bustT, gain: 0.5 },
      { stem: 'flow', from: endAt, to: dur, gain: 0.45 },
    ],
    sfx, booms,
    risers: [{ from: outT - 1.4, to: outT, gain: 0.4 }, { from: bustT - 1.8, to: bustT, gain: 0.5 }],
    fadeOut: 0.6,
  },
};
