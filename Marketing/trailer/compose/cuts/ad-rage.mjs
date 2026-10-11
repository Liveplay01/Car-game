// Ad 2, "rage hook": 20 s, portrait split screen. Gameplay on top, something satisfying underneath.
const split = 1160;
const TOP = { ty: -200, scale: 1, anchor: [0.5, 0.5], punch: 0.04, shake: 0.4 };
const RAMP_CRASH = [[0, 1], [0.5, 0.35], [1.5, 0.5]];
const RAMP_BUST = [[0, 1], [0.5, 1], [0.8, 0.3], [1.4, 0.3], [1.8, 1]];

const shots = [
  { t: 0, dur: 6, src: 'g-meadow', at: 16.4, ...TOP },
  { t: 6, dur: 4, src: 'g-sakura', at: 11.4, ...TOP },
  { t: 10, dur: 2, src: 'g-crash', at: 2.6, speed: RAMP_CRASH, ...TOP, shake: 1, shakeDur: 0.8 },
  { t: 12, dur: 2, src: 'g-hunt3', at: 27.0, speed: RAMP_BUST, ...TOP, shake: 0.9, shakeDur: 0.7 },
  { t: 14, dur: 4, src: 'g-neon', at: 8.0, ...TOP },
  { t: 17.6, dur: 2.4, src: 'g-neon', at: 19.0, speed: 0.6, scale: 1.1, anchor: [0.5, 0.45], punch: 0, push: 0.03 },
];

const bottoms = [
  { t: 0, dur: 3, src: 's-chest', at: 1.5, punch: 0.05 },
  { t: 3, dur: 3, src: 's-slots', at: 3.0, punch: 0.05 },
  { t: 6, dur: 2, src: 's-crash', at: 3.5, speed: [[0, 7], [2, 3.5]], punch: 0.05 },
  { t: 8, dur: 2, src: 's-crash', at: 13.2, punch: 0.05 },
  { t: 10, dur: 2, src: 'g-mayhem', at: 22.1, speed: RAMP_CRASH, scale: 1.3, pos: '50% 62%', punch: 0.05 },
  { t: 12, dur: 2, src: 's-collection', at: 0.5, speed: 3.2, punch: 0.05 },
  { t: 14, dur: 3.6, src: 's-chest', at: 6.0, punch: 0.05 },
];

const top = { y: 0.115, anim: 'slam' };
const titles = [
  { ...top, t: 0, dur: 1.9, rot: -2, lines: [{ text: 'Bet you can’t', size: 1.9 }, { text: 'hit 3 perfects', size: 1.9, c: 'accent' }] },
  { ...top, t: 0.9, dur: 0.9, y: 0.34, anim: 'pop', lines: [{ text: '1/3', size: 3, c: 'mint' }] },
  { ...top, t: 3.3, dur: 1.0, y: 0.34, anim: 'pop', lines: [{ text: '2/3', size: 3, c: 'mint' }] },
  { ...top, t: 5.3, dur: 1.2, y: 0.34, anim: 'pop', lines: [{ text: '3/3', size: 3.4, c: 'accent' }] },
  { ...top, t: 6.6, dur: 3.2, rot: 2, lines: [{ text: 'Chain them', size: 1.9 }, { text: 'for CRITICAL', size: 1.9, c: 'accent' }] },
  { ...top, t: 10, dur: 2, rot: -2, lines: [{ text: 'Miss the gap…', size: 1.9, c: 'red' }] },
  { ...top, t: 12, dur: 2, rot: 2, kicker: 'Wanted', kickerClass: 'dark', lines: [{ text: 'Bust them', size: 1.9 }] },
  { ...top, t: 14.1, dur: 3.4, rot: -2, lines: [{ text: 'Tight fit.', size: 2.2, c: 'accent' }, { text: 'Your turn.', size: 1.6 }] },
  { t: 17.65, dur: 2.35, anim: 'pop', y: 0.22, outDur: 0.01, drift: 0.01, maxWidth: 0.8, lines: [{ text: 'Can you', size: 1.7 }, { text: 'beat it?', size: 2.3, c: 'accent' }] },
  { t: 18.0, dur: 2.0, anim: 'rise', y: 0.78, outDur: 0.01, drift: 0, kicker: 'Free · no download', lines: [{ text: 'timing.love', size: 1.9, c: 'mint lower' }] },
];

const hits = [0.9, 3.3, 5.3, 6.6, 8.6, 10.4, 12.63, 14.3, 14.7, 17.6];
const flashes = hits.map((t) => ({ t, a: 0.35 }));

const sfx = [
  { name: 'go', t: 0, gain: 0.6 },
  { name: 'perfect', t: 0.9, gain: 0.8 },
  { name: 'chestCharge', t: 0.1, gain: 0.7 },
  { name: 'perfect', t: 3.3, gain: 0.8 },
  { name: 'casinoStop', t: 3.5, gain: 0.7 },
  { name: 'casinoStop', t: 3.9, gain: 0.7 },
  { name: 'casinoStop', t: 4.3, gain: 0.8 },
  { name: 'perfect', t: 5.3, gain: 0.9 },
  { name: 'chestBurstRare', t: 4.65, gain: 1.0 },
  { name: 'comboUp', t: 6.6, gain: 0.7 },
  { name: 'coinClink', t: 8.8, gain: 0.9 },
  { name: 'paid', t: 8.85, gain: 0.8 },
  { name: 'crashHeavy', t: 10.4, gain: 1.0 },
  { name: 'shatter', t: 10.5, gain: 0.7 },
  { name: 'detonation', t: 11.05, gain: 0.9 },
  { name: 'wanted', t: 12.0, gain: 0.6 },
  { name: 'takedown', t: 12.63, gain: 1.0 },
  { name: 'tightFit', t: 14.3, gain: 0.8 },
  { name: 'perfect', t: 14.7, gain: 0.8 },
  { name: 'chestBurstRare', t: 15.1, gain: 1.0 },
  { name: 'shiftComplete', t: 17.6, gain: 0.8 },
];
titles.filter((t) => t.anim === 'slam').forEach((t) => sfx.push({ name: 'swoosh', t: t.t - 0.05, gain: 0.5 }));

export default {
  w: 1080, h: 1920, dur: 20, layout: 'portrait', split,
  shots, bottoms, titles, flashes, qr: { t: 18.0, dur: 2.0, y: 0.5, size: 420 },
  audio: {
    music: [
      { stem: 'base', from: 0, to: 20, gain: 0.55 },
      { stem: 'rhythm', from: 0, to: 17.6, gain: 0.6 },
      { stem: 'bass', from: 0, to: 20, gain: 0.7 },
      { stem: 'lead', from: 6, to: 17.6, gain: 0.55 },
      { stem: 'rush', from: 10, to: 18, gain: 0.45 },
    ],
    sfx,
    booms: [4.65, 10.4, 12.63, 17.6].map((t) => ({ t, gain: 0.8 })),
    risers: [{ from: 13.8, to: 15.05, gain: 0.5 }],
    fadeOut: 0.5,
  },
};
