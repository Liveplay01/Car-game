// Reel "Every sky": the same tap through every weather on the beat (1 s each, 120 BPM), each shot landing a merge on the beat.
import { merges, when, TAP_LEAD, VIEW, SAFE, endCard } from './social.mjs';

const shots = [], titles = [], taps = [], sfx = [], flashes = [], booms = [];
const WIDE = { ...VIEW, scale: 1.02, anchor: [0.5, 0.5], punch: 0.08 };
const name = (t, dur, text, c) => titles.push({ ...SAFE, t, dur, y: 0.2, anim: 'slam', rot: titles.length % 2 ? 2 : -2, lines: [{ text, size: 2.3, c }] });
// the best merge after the start card: a Perfect if there is one
const landing = (src, n = 0) => {
  const all = merges(src).filter((m) => m.t > 2.5);
  return (all.filter((m) => m.rating === 'perfect')[n] ?? all[n]).t;
};

let t = 0;
const open = landing('w-sand', 1);
shots.push({ t, dur: 2, src: 'w-sand', at: open - 1.5, ...WIDE });
titles.push({ ...SAFE, t: 0, dur: 2, y: 0.2, anim: 'slam', rot: -2, lines: [{ text: 'Same tap.', size: 2.3 }] });
taps.push({ t: 1.5 - TAP_LEAD, x: 0.5, y: 0.76 });
sfx.push({ name: 'uiTick', t: 1.5 - TAP_LEAD, gain: 0.7 }, { name: 'perfect', t: 1.5, gain: 0.8 });
flashes.push({ t: 1.5, a: 0.3 });
t = 2;
titles.push({ ...SAFE, t, dur: 1, y: 0.2, anim: 'pop', lines: [{ text: 'Every', size: 2.4 }, { text: 'sky.', size: 2.4, c: 'accent' }] });
shots.push({ t, dur: 1, src: 'w-rain', at: landing('w-rain', 1) - 0.5, ...WIDE });
sfx.push({ name: 'merge', t: t + 0.5, gain: 0.5, rate: 0.9 });
t += 1;

// one second each; the merge lands on the half beat, every one with its own sound
const skies = [
  ['w-fog', 'Fog', 'mint', 'nearMiss', 0.8, 1],
  ['w-snow', 'Snow', 'accent', 'tightFit', 0.8, 1],
  ['w-hail', 'Hail', 'mint', 'coinClink', 0.7, 1.1],
  ['w-night', 'Night', 'accent', 'flowIn', 0.6, 1],
  ['w-storm', 'Storm', 'red', 'comboUp', 0.7, 1],
  ['w-extreme', 'Extreme', 'red', 'secured', 0.7, 1],
  ['w-blackout', 'Blackout', 'mint', 'perfect', 0.8, 1.12],
];
for (const [src, label, c, cue, gain, rate] of skies) {
  shots.push({ t, dur: 1, src, at: landing(src, src === 'w-snow' ? 1 : 0) - 0.5, ...WIDE });
  name(t, 1, label, c);
  flashes.push({ t, a: 0.22 });
  sfx.push({ name: cue, t: t + 0.5, gain, rate });
  t += 1;
}

// back to the snow: slow into the tap, then the Perfect
const fixStart = t;
const hit = landing('w-snow');
const f = { t, src: 'w-snow', at: hit - TAP_LEAD - 1.0, dur: 60, ...VIEW, scale: 1.12, anchor: [0.5, 0.6] };
f.speed = [[0, 1], [0.6, 1], [0.7, 0.35], [1.5, 0.35], [1.6, 1]];
const fTap = when(f, hit - TAP_LEAD), fHit = when(f, hit);
f.dur = fHit + 1.1 - t;
shots.push(f);
taps.push({ t: fTap, x: 0.5, y: 0.76 });
sfx.push({ name: 'uiTick', t: fTap, gain: 0.9, rate: 1.1 }, { name: 'perfect', t: fHit, gain: 1 });
flashes.push({ t: fHit, a: 0.45 });
booms.push({ t: fHit, gain: 0.7 });
titles.push(
  { ...SAFE, t: fixStart, dur: fHit - fixStart - 0.02, y: 0.2, anim: 'rise', lines: [{ text: 'Ice.', size: 1.6, c: 'mint' }, { text: 'wait for it…', size: 1.8 }] },
  { ...SAFE, t: fHit, dur: t + f.dur - fHit, y: 0.2, anim: 'pop', lines: [{ text: 'Perfect.', size: 2.8, c: 'mint' }] },
);
t += f.dur;

const endAt = t;
shots.push({ t, dur: 3.2, src: 'w-storm', at: 12.0, speed: 0.6, ...WIDE, punch: 0 });
const end = endCard(endAt + 0.1, 3.0);
titles.push(...end.titles);
const dur = endAt + 3.2;
titles.filter((x) => (x.anim ?? 'slam') === 'slam').forEach((x, i) => sfx.push({ name: 'swoosh', t: Math.max(0, x.t - 0.05), gain: 0.25 + 0.05 * (i % 3), rate: 0.9 + 0.05 * (i % 4) }));
sfx.push({ name: 'shiftComplete', t: endAt, gain: 0.8 });

export default {
  w: 1080, h: 1920, dur, layout: 'portrait',
  shots, titles, taps, flashes, shades: end.shades,
  audio: {
    music: [
      { stem: 'base', from: 0, to: dur, gain: 0.5 },
      { stem: 'rhythm', from: 0, to: fixStart, gain: 0.55 },
      { stem: 'bass', from: 2, to: dur, gain: 0.6 },
      { stem: 'lead', from: 3, to: fixStart, gain: 0.5 },
      { stem: 'rush', from: 6, to: fixStart, gain: 0.45 },
      { stem: 'flow', from: fHit, to: dur, gain: 0.5 },
    ],
    sfx, booms,
    risers: [{ from: fixStart + 0.3, to: fHit, gain: 0.45 }],
    fadeOut: 0.6,
  },
};
