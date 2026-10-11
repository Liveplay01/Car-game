// Ad 1, "Apple minimal": 20 s, portrait. Slow, dark, close; no shake, no flashes, soft clicks instead of hits.
const RING = [0.5, 0.64];
const MOOD = 'brightness(0.78) saturate(0.85)';
const calm = { push: 0.05, punch: 0, filter: MOOD, scale: 1.7, anchor: RING };

const shots = [
  { t: 0, dur: 4, src: 'g-neon', at: 8.0, speed: 0.5, ...calm, scale: 1.9 },
  { t: 4, dur: 4, src: 'g-sakura', at: 12.9, speed: 0.6, ...calm },
  { t: 8, dur: 4, src: 'g-aurora', at: 11.4, speed: 0.7, ...calm },
  { t: 12, dur: 4, src: 'g-snow', at: 16.5, speed: 0.7, ...calm },
  { t: 16, dur: 4, src: 'g-neon', at: 19.0, speed: 0.5, ...calm, scale: 1.15, anchor: [0.5, 0.5], push: 0.03 },
];

const quiet = { calm: true, anim: 'rise', inDur: 0.7, outDur: 0.5, drift: 0.01 };
const titles = [
  { ...quiet, t: 0.8, dur: 2.8, kicker: 'Roundabout Timing', kickerSize: 0.2, y: 0.1, lines: [{ text: 'One tap.', size: 1.6 }] },
  { ...quiet, t: 4.6, dur: 3.2, y: 0.1, lines: [{ text: 'That’s the', size: 1.5 }, { text: 'whole game.', size: 1.5 }] },
  { ...quiet, t: 8.6, dur: 3.2, y: 0.1, lines: [{ text: 'Nothing to install.', size: 1.3 }, { text: 'Free in your browser.', size: 1.3 }] },
  { ...quiet, t: 12.6, dur: 3.2, y: 0.1, lines: [{ text: 'A perfect gap', size: 1.5 }, { text: 'feels good.', size: 1.5 }] },
  { ...quiet, t: 16.6, dur: 3.4, y: 0.27, outDur: 0.01, lines: [{ text: 'Roundabout', size: 1.5 }, { text: 'Timing', size: 2.2 }] },
  { ...quiet, t: 17.4, dur: 2.6, y: 0.77, outDur: 0.01, kicker: 'Play free', kickerSize: 0.22, lines: [{ text: 'timing.love', size: 1.6 }] },
];

const fades = [{ t: 0, dur: 0.8, from: 1, to: 0 }];
for (const t of [4, 8, 12, 16]) fades.push({ t: t - 0.3, dur: 0.3, from: 0, to: 1 }, { t, dur: 0.4, from: 1, to: 0 });
fades.push({ t: 16.4, dur: 0.5, from: 0, to: 0.45 }, { t: 16.9, dur: 2.3, from: 0.45, to: 0.45 }, { t: 19.2, dur: 0.8, from: 0.45, to: 1 });

const tick = (t, gain = 0.45) => ({ name: 'uiTick', t, gain });
const sfx = [
  tick(0.9), tick(4.7), tick(8.7), tick(12.7), tick(16.7), tick(17.5, 0.3),
  { name: 'perfect', t: 1.8, gain: 0.35 },
  { name: 'perfect', t: 6.7, gain: 0.35 },
  { name: 'perfect', t: 10.1, gain: 0.35 },
  { name: 'perfect', t: 13.3, gain: 0.35 },
  { name: 'tightFit', t: 14.0, gain: 0.25 },
];

export default {
  w: 1080, h: 1920, dur: 20, layout: 'portrait',
  shots, titles, fades, flashes: [], qr: { t: 17.2, dur: 2.8, y: 0.53, size: 400 },
  audio: {
    music: [
      { stem: 'base', from: 0, to: 20, gain: 0.5, fade: 1.2 },
      { stem: 'flow', from: 4, to: 19, gain: 0.3, fade: 1.5 },
      { stem: 'bass', from: 8, to: 19, gain: 0.3, fade: 1.5 },
    ],
    sfx,
    fadeOut: 1.2,
    drive: 0.8,
  },
};
