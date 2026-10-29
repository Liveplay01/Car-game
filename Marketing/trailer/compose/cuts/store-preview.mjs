// Play Store preview video (Oct 2026): eight-slide look of Marketing/store-screenshots, live footage in the tilted phone.
// Slide texts and themes come from capture/slides.json; moments are read off the v-* and s-* clips.
import { readFileSync } from 'node:fs';
import { when } from './social.mjs';

const ALL = JSON.parse(readFileSync(new URL('../../capture/slides.json', import.meta.url)));
const pick = (name) => ALL.find((s) => s.name === name);

const D = 2.75;
// name, clip, source second at slide start, sound cues [name, source second, gain]
const PLAN = [
  ['timing', 'v-neon', 1.0, [['merge', 1.9, 0.7], ['perfect', 3.2, 0.7]]],
  ['police', 'v-hunt', 10.6, [['takedown', 12.8, 0.9]]],
  ['bosses', 'v-boss', 1.0, [['merge', 1.3, 0.6], ['stingArmoured', 2.8, 0.8]]],
  ['mayhem', 'v-mayhem', 9.6, [['explosion', 10.5, 0.9], ['crashHeavy', 12.1, 0.8]]],
  ['seasons', 'v-snow', 12.4, [['perfect', 13.2, 0.8]]],
  ['chests', 's-chest', 1.9, []],
  ['collection', 's-collection', 1.0, [['uiTick', 1.6, 0.4], ['uiTick', 2.2, 0.4]]],
  ['builder', 's-builder', 2.4, [['build', 3.6, 0.7]]],
];

const slides = [], shots = [], sfx = [], booms = [], flashes = [];
PLAN.forEach(([name, src, at, cues], i) => {
  const t = i * D;
  const { theme, title, sub, ring, tilt, dx } = pick(name);
  slides.push({ t, dur: D, theme, title, sub, ring, tilt, dx });
  sfx.push({ name: 'swoosh', t: Math.max(0, t - 0.05), gain: 0.35, rate: 0.92 + 0.06 * (i % 3) });
  if (i) booms.push({ t, gain: 0.45 });
  if (name === 'chests') {
    // the taps fill the first part, then the reel stops on the legendary (about 6.4 s into the clip)
    const taps = { t, src, at, dur: 1.3, punch: 0.02, push: 0.02 };
    const reveal = { t: t + 1.3, src, at: 5.6, dur: D - 1.3, punch: 0.06, push: 0.02 };
    shots.push(taps, reveal);
    [2.1, 2.283, 2.467, 2.65, 2.833, 3.017].forEach((x, k) => sfx.push({ name: 'needleTick', t: when(taps, x), gain: 0.45 + 0.05 * k, rate: 0.8 + 0.09 * k }));
    sfx.push({ name: 'chestCharge', t: when(taps, 2.1) - 0.05, gain: 0.6 }, { name: 'chestBurstRare', t: when(reveal, 6.4), gain: 0.9 });
    flashes.push({ t: when(reveal, 6.4), a: 0.5, c: '#ffd23f' });
    return;
  }
  const shot = { t, src, at, dur: D, punch: 0.02, push: 0.02 };
  shots.push(shot);
  for (const [n, x, gain] of cues) sfx.push({ name: n, t: when(shot, x), gain });
});

// end: the app icon, the phone slides away
const endAt = PLAN.length * D;
const endDur = 2.6;
slides.push({
  t: endAt, dur: endDur, theme: 'amber', title: 'Roundabout\nTiming', sub: 'Free · play in your browser', ring: 'c', noPhone: true,
  icon: new URL('../../../AppIcon-1d.png', import.meta.url).href,
});
shots.push({ t: endAt, src: 'v-neon', at: 8, dur: endDur, punch: 0, push: 0.02 });
sfx.push({ name: 'swoosh', t: endAt - 0.05, gain: 0.4 }, { name: 'shiftComplete', t: endAt + 0.3, gain: 0.5 });
booms.push({ t: endAt, gain: 0.7 });

const dur = endAt + endDur;

export default {
  w: 1080, h: 1920, dur, layout: 'store',
  slides, shots, titles: [], taps: [], flashes,
  audio: {
    music: [
      { stem: 'base', from: 0, to: dur, gain: 0.45 },
      { stem: 'rhythm', from: 0, to: dur, gain: 0.5 },
      { stem: 'bass', from: 2 * D, to: dur, gain: 0.5 },
      { stem: 'lead', from: 4 * D, to: endAt, gain: 0.45 },
      { stem: 'flow', from: endAt, to: dur, gain: 0.45 },
    ],
    sfx, booms,
    risers: [{ from: endAt - 1.2, to: endAt, gain: 0.4 }],
    fadeOut: 0.8,
  },
};
