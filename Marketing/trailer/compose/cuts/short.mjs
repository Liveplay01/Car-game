// 20-second preview, portrait: the CrazyGames hover clip. 120 BPM, one beat = 0.5 s.

const RING = [0.5, 0.62];

const shots = [
  // hook: three payoffs in one and a half seconds
  { t: 0.0, dur: 0.5, src: 'g-mayhem', at: 10.3, speed: 1, scale: 1.5, anchor: [0.46, 0.64], shake: 1, punch: 0.0 },
  { t: 0.5, dur: 0.5, src: 's-slots', at: 4.55, speed: 1, shake: 0.6, punch: 0.08 },
  { t: 1.0, dur: 0.5, src: 's-chest', at: 7.05, speed: 1, shake: 0.6, punch: 0.08 },
  // core loop
  { t: 1.5, dur: 1.0, src: 'g-meadow', at: 16.7, speed: 1, scale: 1.25, anchor: RING, pulse: 0.012, shake: 0.5 },
  { t: 2.5, dur: 1.5, src: 'g-sakura', at: 11.3, speed: 1, scale: 1.25, anchor: RING, pulse: 0.012, shake: 0.4 },
  { t: 4.0, dur: 1.5, src: 'g-neon', at: 8.2, speed: 1, scale: 1.3, anchor: RING, pulse: 0.012, shake: 0.6 },
  // busted
  { t: 5.5, dur: 2.0, src: 'g-hunt3', at: 27.0, speed: [[0, 1], [0.5, 1], [0.8, 0.3], [1.4, 0.3], [1.8, 1]], scale: 1.4, anchor: [0.5, 0.64], shake: 0.9, shakeDur: 0.7 },
  // real physics
  { t: 7.5, dur: 1.5, src: 'g-crash', at: 2.6, speed: [[0, 1], [0.5, 0.35], [1.5, 0.5]], scale: 1.4, anchor: [0.5, 0.68], shake: 1, shakeDur: 0.8 },
  // blow it up
  { t: 9.0, dur: 1.5, src: 'g-mayhem', at: 22.1, speed: [[0, 1], [0.5, 0.35], [1.5, 0.5]], scale: 1.3, anchor: [0.5, 0.66], shake: 1, shakeDur: 0.8 },
  // chest
  { t: 10.5, dur: 0.5, src: 's-chest', at: 2.3, speed: 1, punch: 0.08 },
  { t: 11.0, dur: 0.5, src: 's-chest', at: 5.8, speed: 1, punch: 0.06 },
  { t: 11.5, dur: 1.0, src: 's-chest', at: 6.9, speed: 1, shake: 0.8, punch: 0.1 },
  // casino
  { t: 12.5, dur: 1.5, src: 's-crash', at: 3.5, speed: [[0, 7], [1.5, 3.5]], punch: 0.06 },
  { t: 14.0, dur: 1.0, src: 's-crash', at: 13.8, speed: 1, shake: 0.5, punch: 0.04 },
  { t: 15.0, dur: 2.2, src: 's-slots', at: 3.3, speed: 1, shake: 0.6, punch: 0.04 },
  // collection
  { t: 17.2, dur: 1.0, src: 's-collection', at: 0.5, speed: 3.2, punch: 0.04 },
  // end card
  { t: 18.2, dur: 1.8, src: 'g-neon', at: 19.0, speed: 0.6, scale: 1.1, anchor: [0.5, 0.45], punch: 0, push: 0.03 },
];

const titles = [
  { t: 1.5, dur: 1.0, kicker: 'Roundabout Timing', lines: [{ text: 'One tap.', size: 2.5 }], y: 0.19, anim: 'slam' },
  { t: 2.5, dur: 1.5, lines: [{ text: 'Nail', size: 2.1 }, { text: 'the gap', size: 2.1, c: 'accent' }], y: 0.2, anim: 'slam', rot: -3 },
  { t: 4.0, dur: 1.5, lines: [{ text: 'Chain', size: 2.1 }, { text: 'combos', size: 2.1, c: 'accent' }], y: 0.2, anim: 'slam', rot: 2 },
  { t: 5.5, dur: 2.0, kicker: 'Wanted', kickerClass: 'dark', lines: [{ text: 'Bust the', size: 1.7 }, { text: 'criminals', size: 2.1, c: 'red' }], y: 0.2, anim: 'slam', rot: -3 },
  { t: 7.5, dur: 1.5, lines: [{ text: 'Real crash', size: 1.7 }, { text: 'physics', size: 2.2, c: 'accent' }], y: 0.2, anim: 'slam', rot: 2 },
  { t: 9.0, dur: 1.5, lines: [{ text: 'Blow it', size: 2.1 }, { text: 'all up', size: 2.1, c: 'accent' }], y: 0.2, anim: 'slam', rot: -3 },
  { t: 10.5, dur: 1.0, lines: [{ text: 'Open', size: 2.1 }, { text: 'chests', size: 2.1, c: 'accent' }], y: 0.77, anim: 'slam', rot: -3 },
  { t: 11.6, dur: 0.9, lines: [{ text: 'Legendary!', size: 2.0, c: 'accent' }], y: 0.84, anim: 'pop', rot: 3 },
  { t: 12.5, dur: 2.4, lines: [{ text: 'Hit the', size: 1.9 }, { text: 'casino', size: 2.3, c: 'accent' }], y: 0.77, anim: 'slam', rot: -3 },
  { t: 15.2, dur: 2.0, lines: [{ text: '×150', size: 3.2, c: 'accent' }, { text: 'jackpot', size: 1.7 }], y: 0.78, anim: 'slam', rot: 3 },
  { t: 17.2, dur: 1.0, lines: [{ text: '113 skins', size: 1.9 }, { text: 'to collect', size: 1.5, c: 'accent' }], y: 0.78, anim: 'slam', rot: -2 },
  { t: 18.3, dur: 1.7, anim: 'pop', y: 0.44, outDur: 0.01, drift: 0.01, maxWidth: 0.74, lines: [{ text: 'Roundabout', size: 1.55 }, { text: 'Timing', size: 2.5, c: 'accent' }] },
  { t: 18.55, dur: 1.45, anim: 'rise', y: 0.8, outDur: 0.01, drift: 0, kicker: 'Free · no download', lines: [{ text: 'Play now', size: 1.7, c: 'mint' }] },
];

const flashes = [0, 0.5, 1.0, 1.5, 5.5, 6.13, 7.9, 9.0, 9.67, 10.5, 11.6, 12.5, 14.6, 16.3, 17.2, 18.2].map((t, i) => ({ t, a: [0, 0.5, 1.0, 1.5, 5.5, 9.0, 12.5, 17.2, 18.2].includes(t) ? 0.5 : 0.28 }));

const sfx = [
  { name: 'explosion', t: 0.0, gain: 0.9 },
  { name: 'paid', t: 0.5, gain: 0.85 },
  { name: 'chestBurstRare', t: 1.0, gain: 0.9 },
  { name: 'swoosh', t: 1.45, gain: 0.7 },
  { name: 'perfect', t: 2.1, gain: 0.7 },
  { name: 'swoosh', t: 2.45, gain: 0.6 },
  { name: 'perfect', t: 3.1, gain: 0.7 },
  { name: 'comboUp', t: 3.5, gain: 0.7 },
  { name: 'swoosh', t: 3.95, gain: 0.6 },
  { name: 'tightFit', t: 4.45, gain: 0.8 },
  { name: 'perfect', t: 5.0, gain: 0.7 },
  { name: 'wanted', t: 5.4, gain: 0.6 },
  { name: 'takedown', t: 6.13, gain: 1.0 },
  { name: 'crashHeavy', t: 7.9, gain: 1.0 },
  { name: 'shatter', t: 8.0, gain: 0.7 },
  { name: 'detonation', t: 9.55, gain: 0.9 },
  { name: 'chestCharge', t: 10.45, gain: 0.85 },
  { name: 'chestBurstRare', t: 11.55, gain: 1.0 },
  { name: 'go', t: 12.5, gain: 0.7 },
  { name: 'coinClink', t: 14.6, gain: 0.9 },
  { name: 'paid', t: 14.65, gain: 0.8 },
  { name: 'casinoStop', t: 15.1, gain: 0.8 },
  { name: 'casinoStop', t: 15.4, gain: 0.8 },
  { name: 'casinoStop', t: 15.7, gain: 0.9 },
  { name: 'chestBurstRare', t: 16.25, gain: 0.9 },
  { name: 'coinLand', t: 16.5, gain: 0.8 },
  { name: 'shiftComplete', t: 17.2, gain: 0.8 },
];
// every title lands with a swoosh and a low hit
const titleHits = titles.filter((t) => t.anim === 'slam').map((t) => t.t);
titleHits.forEach((t) => sfx.push({ name: 'swoosh', t: t - 0.05, gain: 0.5 }));

export default {
  w: 1080, h: 1920, dur: 20, layout: 'portrait',
  shots, titles, flashes,
  fades: [{ t: 17.95, dur: 0.25, from: 0, to: 0.7 }, { t: 19.8, dur: 0.2, from: 0.7, to: 1 }],
  audio: {
    music: [
      { stem: 'base', from: 0, to: 20, gain: 0.55 },
      { stem: 'rhythm', from: 0, to: 17.2, gain: 0.6 },
      { stem: 'bass', from: 1.5, to: 20, gain: 0.7 },
      { stem: 'lead', from: 4, to: 17.2, gain: 0.55 },
      { stem: 'flow', from: 2.5, to: 12.5, gain: 0.4 },
      { stem: 'rush', from: 9, to: 17.2, gain: 0.45 },
      { stem: 'siren', from: 5.5, to: 7.5, gain: 0.35 },
    ],
    sfx,
    booms: [0, 1.5, 6.13, 7.9, 9.67, 11.6, 17.2].map((t) => ({ t, gain: 0.8 })),
    risers: [{ from: 10.5, to: 11.55, gain: 0.6 }, { from: 12.5, to: 14.55, gain: 0.5 }],
    fadeOut: 0.5,
  },
};
