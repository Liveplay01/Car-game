// Ad 3, "automotive precision": 20 s, portrait. Engine climbs with the stopwatch, drops out on the perfect stop.
const RING = [0.5, 0.62];
const LOOK = 'contrast(1.18) saturate(1.2) brightness(0.88)';
const base = { scale: 1.35, anchor: RING, filter: LOOK, pulse: 0.01, punch: 0.06, shake: 0.4 };
// one second of footage at normal speed, then a ramp down to 0.3 before the hit
const HOLD = [[0, 1], [1.0, 1], [1.4, 0.3]];
const HOLD_AURORA = [[0, 1], [0.9, 1], [1.2, 0.3]];

const shots = [
  { t: 0, dur: 2.5, src: 'g-neon', at: 16.0, speed: [[0, 0.6], [2.5, 1.5]], ...base },
  { t: 2.5, dur: 4.4, src: 'g-neon', at: 7.0, speed: HOLD, ...base, scale: 1.5, shake: 0.7 },
  { t: 6.9, dur: 4.6, src: 'g-aurora', at: 10.8, speed: HOLD_AURORA, ...base, scale: 1.5, shake: 0.7 },
  { t: 11.5, dur: 4.5, src: 'g-neon', at: 24.5, ...base },
  { t: 16, dur: 4, src: 'g-neon', at: 19.0, speed: 0.6, filter: LOOK, scale: 1.1, anchor: [0.5, 0.45], punch: 0, push: 0.03 },
];

const hud = (t, dur, to, label) => ({
  t, dur, anim: 'fade', y: 0.1, inDur: 0.2, outDur: 0.15, drift: 0, maxWidth: 0.7,
  kicker: label, kickerClass: 'dark', kickerSize: 0.22,
  html: '<span class="line mono mint cnt" style="font-size:150px">0.000</span>',
  count: { from: 0, to, dur: dur - 0.2, dec: 3, suffix: ' s' },
});
const titles = [
  { t: 0.1, dur: 2.3, kicker: 'Reaction test', y: 0.2, anim: 'slam', rot: -2, lines: [{ text: 'F1', size: 2.6, c: 'accent' }, { text: 'reflexes?', size: 2.2 }] },
  { t: 2.6, dur: 1.8, y: 0.26, anim: 'slam', rot: 2, lines: [{ text: 'Milliseconds', size: 1.7 }, { text: 'decide.', size: 2.3, c: 'accent' }] },
  hud(4.5, 1.6, 0.43, 'Gap window'),
  { t: 6.1, dur: 0.8, y: 0.2, anim: 'pop', lines: [{ text: 'Perfect.', size: 2.4, c: 'mint' }] },
  { t: 8.0, dur: 2.2, y: 0.26, anim: 'slam', rot: -2, lines: [{ text: 'Stay', size: 1.9 }, { text: 'in the flow', size: 1.9, c: 'accent' }] },
  { t: 10.5, dur: 0.9, y: 0.2, anim: 'pop', lines: [{ text: 'Critical', size: 2.4, c: 'mint' }] },
  { t: 11.6, dur: 2, y: 0.2, anim: 'slam', rot: 2, lines: [{ text: 'Don’t', size: 2.1 }, { text: 'blink.', size: 2.1, c: 'accent' }] },
  { t: 13.7, dur: 2.2, y: 0.2, anim: 'pop', lines: [{ text: '+1050', size: 2.8, c: 'mint' }] },
  { t: 16.1, dur: 3.9, anim: 'pop', y: 0.23, outDur: 0.01, drift: 0.01, maxWidth: 0.8, lines: [{ text: 'Test your', size: 1.5 }, { text: 'reaction', size: 2.4, c: 'accent' }] },
  { t: 16.5, dur: 3.5, anim: 'rise', y: 0.78, outDur: 0.01, drift: 0, kicker: 'Free · no download', lines: [{ text: 'timing.love', size: 1.9, c: 'mint lower' }] },
];

const hits = [6.1, 10.45, 13.6];
const flashes = hits.map((t) => ({ t, a: 0.6, c: '#7df9ff' }));
const cut = 0.4; // engine and music drop out for this long on each stop

const sfx = [
  { name: 'go', t: 0.1, gain: 0.6 },
  { name: 'tightFit', t: 4.7, gain: 0.7 },
  { name: 'perfect', t: 6.1, gain: 0.9 },
  { name: 'perfect', t: 10.45, gain: 0.9 },
  { name: 'comboUp', t: 10.9, gain: 0.7 },
  { name: 'nearMiss', t: 13.6, gain: 0.9 },
  { name: 'shiftComplete', t: 16.0, gain: 0.8 },
];
titles.filter((t) => t.anim === 'slam').forEach((t) => sfx.push({ name: 'swoosh', t: t.t - 0.05, gain: 0.5 }));

export default {
  w: 1080, h: 1920, dur: 20, layout: 'portrait',
  shots, titles, flashes, qr: { t: 16.6, dur: 3.4, y: 0.5, size: 420 },
  fades: [{ t: 15.8, dur: 0.3, from: 0, to: 0.55 }, { t: 16.1, dur: 3.4, from: 0.55, to: 0.55 }, { t: 19.5, dur: 0.5, from: 0.55, to: 1 }],
  audio: {
    music: [
      { stem: 'bass', from: 0, to: 6.05, gain: 0.55, fade: 0.04 },
      { stem: 'bass', from: 6.1 + cut, to: 10.4, gain: 0.55, fade: 0.04 },
      { stem: 'rhythm', from: 6.1 + cut, to: 10.4, gain: 0.5, fade: 0.04 },
      { stem: 'bass', from: 10.45 + cut, to: 13.55, gain: 0.6, fade: 0.04 },
      { stem: 'rhythm', from: 10.45 + cut, to: 13.55, gain: 0.55, fade: 0.04 },
      { stem: 'base', from: 13.6 + cut, to: 20, gain: 0.55 },
      { stem: 'rhythm', from: 13.6 + cut, to: 20, gain: 0.55 },
      { stem: 'lead', from: 14.5, to: 19.5, gain: 0.45 },
    ],
    engines: [
      { from: 0, to: 6.05, f0: 48, f1: 230, gain: 1.0 },
      { from: 6.1 + cut, to: 10.4, f0: 60, f1: 250, gain: 1.0 },
      { from: 11.8, to: 13.55, f0: 80, f1: 300, gain: 1.0 },
    ],
    sfx,
    booms: hits.map((t) => ({ t, gain: 0.9 })),
    risers: [{ from: 5.0, to: 6.05, gain: 0.5 }],
    fadeOut: 0.5,
  },
};
