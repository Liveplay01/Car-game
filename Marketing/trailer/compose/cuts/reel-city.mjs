// Reel "Every city": the same one tap through every city on the beat (1 s each, 120 BPM), then bosses, police, Mayhem.
import { events, when, VIEW, SAFE, endCard } from './social.mjs';

const shots = [], titles = [], sfx = [], flashes = [], booms = [];
const WIDE = { ...VIEW, scale: 1.02, anchor: [0.5, 0.5], punch: 0.08 };
const name = (t, dur, text, c = '') => titles.push({ ...SAFE, t, dur, y: 0.2, anim: 'slam', rot: titles.length % 2 ? 2 : -2, lines: [{ text, size: 2.3, c }] });

let t = 0;
shots.push({ t, dur: 2, src: 'h-meadow', at: 3.0, ...WIDE });
titles.push({ ...SAFE, t: 0, dur: 2, y: 0.2, anim: 'slam', rot: -2, lines: [{ text: 'One roundabout.', size: 1.9 }, { text: 'One tap.', size: 2.3, c: 'accent' }] });
sfx.push({ name: 'go', t: 0, gain: 0.6 });
t = 2;
titles.push({ ...SAFE, t, dur: 1, y: 0.2, anim: 'pop', lines: [{ text: 'Every', size: 2.4 }, { text: 'city.', size: 2.4, c: 'accent' }] });
const cities = [
  ['h-sakura', 3.9, 'Blossom'], ['h-snow', 2.9, 'Snow'], ['h-neon', 3.9, 'Neon', 'mint'], ['h-crash2', 1.8, 'Desert'],
  ['h-tropic', 12.1, 'Tropics'], ['h-aurora', 21.4, 'Aurora', 'mint'], ['h-hunt', 12.4, 'Rush hour'],
];
shots.push({ t, dur: 1, src: 'h-tropic', at: 3.2, ...WIDE });
t += 1;
for (const [src, at, label, c] of cities) {
  shots.push({ t, dur: 1, src, at, ...WIDE });
  name(t, 1, label, c || 'accent');
  flashes.push({ t, a: 0.25 });
  sfx.push({ name: 'merge', t: t + 0.02, gain: 0.5 });
  t += 1;
}

// the specials: slower, closer
const special = (src, at, dur, label, extra, cues) => {
  shots.push({ t, dur, src, at, ...VIEW, punch: 0.1, ...extra });
  name(t, dur, label, 'red');
  flashes.push({ t, a: 0.45 });
  booms.push({ t, gain: 0.6 });
  for (const [n, off, gain = 1] of cues) sfx.push({ name: n, t: t + off, gain });
  t += dur;
};
special('h-boss', 3.9, 1.6, 'Bosses', { scale: 1.1, shake: 0.6 }, [['wanted', 0, 0.7]]);
const take = events('g-hunt3', 'takedown')[0].t;
const h = { t, src: 'g-hunt3', at: take - 0.8, dur: 60, ...VIEW, scale: 1.15, anchor: [0.62, 0.62], punch: 0.1, shake: 0.8, shakeDur: 0.5 };
h.speed = [[0, 1], [0.7, 1], [0.8, 0.35], [1.6, 0.35], [1.7, 1]];
const takeT = when(h, take);
h.dur = takeT + 0.9 - t;
shots.push(h);
name(t, h.dur, 'Police chases', 'red');
sfx.push({ name: 'wanted', t, gain: 0.6 }, { name: 'takedown', t: takeT, gain: 1 });
flashes.push({ t: takeT, a: 0.5 });
booms.push({ t: takeT, gain: 0.9 });
t += h.dur;
const boom = events('g-mayhem', 'explosion').at(-1).t;
special('g-mayhem', boom - 0.4, 1.5, 'Mayhem', { scale: 1.12, anchor: [0.5, 0.7], shake: 1.2, shakeDur: 0.9 }, [['detonation', 0.4], ['explosion', 0.5, 0.8]]);

const endAt = t;
shots.push({ t, dur: 3.2, src: 'h-neon', at: 22.0, speed: 0.6, ...WIDE, punch: 0 });
const end = endCard(endAt + 0.1, 3.0);
titles.push(...end.titles);
const dur = endAt + 3.2;
titles.filter((x) => (x.anim ?? 'slam') === 'slam').forEach((x) => sfx.push({ name: 'swoosh', t: Math.max(0, x.t - 0.05), gain: 0.35 }));
sfx.push({ name: 'shiftComplete', t: endAt, gain: 0.8 });

export default {
  w: 1080, h: 1920, dur, layout: 'portrait',
  shots, titles, flashes, shades: end.shades,
  audio: {
    music: [
      { stem: 'base', from: 0, to: dur, gain: 0.5 },
      { stem: 'rhythm', from: 0, to: dur, gain: 0.55 },
      { stem: 'bass', from: 2, to: dur, gain: 0.6 },
      { stem: 'lead', from: 3, to: dur, gain: 0.5 },
      { stem: 'rush', from: 10, to: endAt, gain: 0.45 },
    ],
    sfx, booms,
    risers: [{ from: 9, to: 10, gain: 0.45 }],
    fadeOut: 0.6,
  },
};
