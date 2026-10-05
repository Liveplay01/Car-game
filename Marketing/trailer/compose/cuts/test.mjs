export default {
  w: 1080, h: 1920, dur: 2.5, layout: 'portrait',
  shots: [
    { t: 0, dur: 1.25, src: 's-chest', at: 1.5, speed: 1, shake: 0.5 },
    { t: 1.25, dur: 1.25, src: 's-chest', at: 6.0, speed: [[0, 0.3], [1.25, 1]], shake: 0.9, punch: 0.14 },
  ],
  titles: [
    { t: 0.1, dur: 1.0, kicker: 'Roundabout Timing', lines: [{ text: 'ONE TAP', size: 2.6 }], y: 0.3, anim: 'slam' },
    { t: 1.35, dur: 1.1, lines: [{ text: 'LEGENDARY', size: 2.0, c: 'accent' }], y: 0.78, anim: 'slam', rot: -4 },
  ],
  flashes: [{ t: 1.25, a: 0.9 }],
};
