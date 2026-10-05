// 32-second trailer, 16:9.
import { wideCut } from './kit.mjs';

const k = wideCut();
const { shot, title, two, centre } = k;
const RING = [0.5, 0.55];

// hook
shot(0.0, 0.5, 'L-mayhem', 8.65, { scale: 1.9, anchor: [0.42, 0.7], shake: 1, punch: 0, flash: 0.5, boom: 0.05, sfx: [['explosion', 0, 0.9]] });
shot(0.5, 0.5, 's-slots', 4.55, { shake: 0.6, punch: 0.08, flash: 0.5, sfx: [['paid', 0, 0.85]] });
shot(1.0, 0.5, 's-chest', 7.05, { shake: 0.6, punch: 0.08, flash: 0.5, sfx: [['chestBurstRare', 0, 0.9]] });
shot(1.5, 1.0, 'L-meadow', 21.9, { scale: 1.2, anchor: RING, pulse: 0.012, shake: 0.5, flash: 0.5, boom: 0, sfx: [['perfect', 0.55, 0.7]] });
title(1.5, 1.0, { kicker: 'Roundabout Timing', lines: [{ text: 'One tap.', size: 2.5 }] });

// loop
shot(2.5, 1.5, 'L-sakura', 13.0, { scale: 1.2, anchor: RING, pulse: 0.012, shake: 0.4, sfx: [['perfect', 0.25, 0.7], ['perfect', 0.7, 0.7], ['comboUp', 1.1, 0.7]] });
title(2.5, 1.5, { lines: two('Nail', 'the gap'), rot: -3 });
shot(4.0, 1.5, 'L-meadow', 14.2, { scale: 1.2, anchor: RING, pulse: 0.012, shake: 0.6, sfx: [['tightFit', 0.3, 0.8], ['perfect', 0.8, 0.7]] });
title(4.0, 1.5, { lines: two('Chain', 'combos'), rot: 2 });
shot(5.5, 2.0, 'L-hunt2', 24.4, { speed: 0.5, scale: 1.4, anchor: [0.5, 0.6], shake: 0.9, shakeDur: 0.7, flash: 0.5, boom: 0.7, sfx: [['wanted', -0.1, 0.6], ['takedown', 0.7, 1]] });
title(5.5, 2.0, { kicker: 'Wanted', kickerClass: 'dark', lines: [{ text: 'Bust the', size: 1.7 }, { text: 'criminals', size: 2.1, c: 'red' }], rot: -3 });
shot(7.5, 1.5, 'L-meadow', 24.3, { scale: 1.2, anchor: RING, pulse: 0.012, shake: 0.4, sfx: [['paid', 1.1, 0.8], ['coinClink', 1.2, 0.8]] });
title(7.5, 1.5, { lines: two('Clear', 'the road'), rot: 2 });

// chaos
shot(9.0, 1.5, 'g-crash', 2.6, { speed: [[0, 1], [0.5, 0.35], [1.5, 0.5]], scale: 1.4, anchor: [0.5, 0.68], shake: 1, shakeDur: 0.8, flash: 0.5, boom: 0.5, sfx: [['crashHeavy', 0.5, 1], ['shatter', 0.6, 0.7]] });
title(9.0, 1.5, { lines: [{ text: 'Real crash', size: 1.7 }, { text: 'physics', size: 2.2, c: 'accent' }], rot: 2 });
shot(10.5, 1.5, 'L-boss', 21.4, { speed: [[0, 1], [0.4, 0.4], [1.5, 0.5]], scale: 1.9, anchor: [0.33, 0.61], shake: 1, shakeDur: 0.8, flash: 0.5, boom: 0.4, sfx: [['detonation', 0.35, 0.9]] });
title(10.5, 1.5, { lines: two('Blow it', 'all up'), rot: -3, x: 0.83 });
shot(12.0, 1.0, 'L-mayhem', 9.9, { speed: [[0, 1], [0.45, 0.4], [1, 0.6]], scale: 1.6, anchor: [0.45, 0.65], shake: 1, shakeDur: 0.6, boom: 0.4, sfx: [['explosion', 0.4, 0.9]] });
title(12.0, 1.0, { kicker: 'New mode', kickerClass: 'dark', lines: [{ text: 'Mayhem', size: 2.3, c: 'accent' }], rot: 2, x: 0.83 });

// loot
shot(13.0, 0.5, 's-chest', 2.3, { punch: 0.08, flash: 0.4, sfx: [['chestCharge', -0.05, 0.85]] });
shot(13.5, 0.5, 's-chest', 5.8, { punch: 0.06 });
shot(14.0, 1.0, 's-chest', 6.9, { shake: 0.8, punch: 0.1, flash: 0.6, boom: 0.1, sfx: [['chestBurstRare', 0.05, 1]] });
title(13.0, 1.0, { lines: two('Open', 'chests'), rot: -3 });
title(14.1, 0.9, { lines: [{ text: 'Legendary!', size: 2.0, c: 'accent' }], anim: 'pop', rot: 3 });
shot(15.0, 1.5, 's-collection', 0.5, { speed: 2.4, punch: 0.04, flash: 0.3 });
title(15.0, 1.5, { lines: [{ text: '113 items', size: 2.0 }, { text: 'to collect', size: 1.6, c: 'accent' }], rot: -2 });
shot(16.5, 1.5, 's-upgrade', 8.2, { punch: 0.05, shake: 0.5, flash: 0.4, sfx: [['perfect', 0.3, 0.8], ['comboUp', 0.5, 0.8], ['paid', 0.8, 0.8]] });
title(16.5, 1.5, { lines: two('Upgrade', 'your skins'), rot: 2 });
shot(18.0, 1.5, 's-museum', 0.8, { speed: 1.8, punch: 0.04, flash: 0.3 });
title(18.0, 1.5, { kicker: 'Museum', kickerClass: 'dark', lines: [{ text: 'Bosses, storms,', size: 1.35 }, { text: 'city events', size: 1.8, c: 'accent' }], rot: -2 });

// casino
shot(19.5, 1.5, 's-crash', 3.5, { speed: [[0, 7], [1.5, 3.5]], punch: 0.06, flash: 0.5, boom: 0, sfx: [['go', 0, 0.7]] });
shot(21.0, 1.0, 's-crash', 13.8, { shake: 0.5, punch: 0.04, sfx: [['coinClink', 0.6, 0.9], ['paid', 0.65, 0.8]] });
title(19.5, 1.5, { lines: [{ text: 'Ride the', size: 1.9 }, { text: 'multiplier', size: 2.0, c: 'accent' }], rot: -3 });
title(21.1, 0.9, { lines: [{ text: 'Cash out!', size: 2.3, c: 'accent' }], rot: 3, anim: 'pop' });
shot(22.0, 2.2, 's-slots', 3.3, { shake: 0.6, punch: 0.04, flash: 0.5, boom: 1.4, sfx: [['casinoStop', 0.1, 0.8], ['casinoStop', 0.4, 0.8], ['casinoStop', 0.7, 0.9], ['chestBurstRare', 1.35, 0.9], ['coinLand', 1.6, 0.8]] });
title(22.2, 2.0, { lines: [{ text: '×150', size: 3.2, c: 'accent' }, { text: 'jackpot', size: 1.7 }], rot: 3 });

// worlds
const worlds = [['g-aurora', 8], ['g-autumn', 8], ['g-snow', 8], ['L-boss', 10], ['g-aurora', 12], ['L-mayhem', 3.5], ['L-sakura', 16], ['L-meadow', 11]];
worlds.forEach(([src, at], i) => shot(24.2 + i * 0.5, 0.5, src, at, { scale: src.startsWith('L-') ? 1.15 : 1.12, anchor: RING, punch: 0.05, sfx: [['swoosh', 0, 0.45]] }));
title(24.2, 2.0, { kicker: 'Every map', lines: [{ text: '24 maps', size: 2.5, c: 'accent' }], rot: -2 });
title(26.2, 1.8, { lines: [{ text: 'Free to play', size: 1.7 }, { text: 'with friends', size: 1.7, c: 'mint' }], rot: 2 });
shot(28.2, 1.8, 'L-meadow', 21.9, { scale: 1.2, anchor: RING, pulse: 0.012, flash: 0.4, boom: 0, sfx: [['perfect', 0.4, 0.7], ['perfect', 0.9, 0.7], ['comboUp', 1.2, 0.7]] });
title(28.2, 1.8, { kicker: 'Daily shifts · bosses · trials', kickerClass: 'dark', kickerSize: 0.22, lines: two('Just one', 'more shift', 1.9), rot: -2 });

// end card
shot(30.0, 2.0, 'L-meadow', 20.0, { speed: 0.6, scale: 1.25, anchor: RING, punch: 0, push: 0.03, flash: 0.5, boom: 0, sfx: [['shiftComplete', 0, 0.8]] });
title(30.2, 1.8, { ...centre, anim: 'pop', outDur: 0.01, drift: 0.01, lines: [{ text: 'Roundabout', size: 1.55 }, { text: 'Timing', size: 2.5, c: 'accent' }] });
title(30.5, 1.5, { x: 0.5, y: 0.79, maxWidth: 0.34, anim: 'rise', outDur: 0.01, drift: 0, kicker: 'Free · no download', lines: [{ text: 'Play now', size: 1.7, c: 'mint' }] });

export default {
  w: k.w, h: k.h, dur: 32, layout: 'landscape',
  shots: k.shots, titles: k.titles, flashes: k.flashes,
  fades: [{ t: 29.95, dur: 0.25, from: 0, to: 0.6 }, { t: 31.8, dur: 0.2, from: 0.6, to: 1 }],
  audio: {
    music: [
      { stem: 'base', from: 0, to: 32, gain: 0.55 },
      { stem: 'rhythm', from: 0, to: 30, gain: 0.6 },
      { stem: 'bass', from: 1.5, to: 12.5, gain: 0.7 },
      { stem: 'bass', from: 13, to: 32, gain: 0.7 },
      { stem: 'lead', from: 4, to: 12.5, gain: 0.55 },
      { stem: 'lead', from: 13, to: 30, gain: 0.5 },
      { stem: 'flow', from: 2.5, to: 12.5, gain: 0.4 },
      { stem: 'rush', from: 9, to: 12.5, gain: 0.5 },
      { stem: 'rush', from: 22, to: 30, gain: 0.5 },
      { stem: 'siren', from: 5.5, to: 7.5, gain: 0.35 },
    ],
    sfx: k.sfx,
    booms: k.booms,
    risers: [{ from: 11.6, to: 13, gain: 0.55 }, { from: 19.5, to: 22, gain: 0.5 }, { from: 28.5, to: 30, gain: 0.5 }],
    fadeOut: 0.5,
  },
};
