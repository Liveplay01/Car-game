// 20-second Google Play promo, 16:9: no casino, no browser pitch. (short-wide, reworked)
// Desktop gameplay runs full frame; the menus sit in a phone frame over a blurred copy of themselves.
import { wideCut } from './kit.mjs';

const k = wideCut();
const { shot, title, two, centre } = k;
const RING = [0.5, 0.55];

// hook
shot(0.0, 0.5, 'L-mayhem', 8.65, { scale: 1.9, anchor: [0.42, 0.7], shake: 1, punch: 0, flash: 0.5, boom: 0.05, sfx: [['explosion', 0, 0.9]] });
shot(0.5, 0.5, 'L-neon2', 9.0, { scale: 1.3, anchor: RING, shake: 0.6, punch: 0.08, flash: 0.5, sfx: [['wanted', 0, 0.7]] });
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

// chaos
shot(7.5, 1.5, 'g-crash', 2.6, { speed: [[0, 1], [0.5, 0.35], [1.5, 0.5]], scale: 1.4, anchor: [0.5, 0.68], shake: 1, shakeDur: 0.8, flash: 0.5, boom: 0.5, sfx: [['crashHeavy', 0.5, 1], ['shatter', 0.6, 0.7]] });
title(7.5, 1.5, { lines: [{ text: 'Real crash', size: 1.7 }, { text: 'physics', size: 2.2, c: 'accent' }], rot: 2 });
shot(9.0, 1.5, 'L-boss', 21.4, { speed: [[0, 1], [0.4, 0.4], [1.5, 0.5]], scale: 1.9, anchor: [0.33, 0.61], shake: 1, shakeDur: 0.8, flash: 0.5, boom: 0.4, sfx: [['detonation', 0.35, 0.9]] });
title(9.0, 1.5, { lines: two('Blow it', 'all up'), rot: -3, x: 0.83 });

// loot
shot(10.5, 0.5, 's-chest', 2.3, { punch: 0.08, flash: 0.4, sfx: [['chestCharge', -0.05, 0.85]] });
shot(11.0, 0.5, 's-chest', 5.8, { punch: 0.06 });
shot(11.5, 1.0, 's-chest', 6.9, { shake: 0.8, punch: 0.1, flash: 0.6, boom: 0.1, sfx: [['chestBurstRare', 0.05, 1]] });
title(10.5, 1.0, { lines: two('Open', 'chests'), rot: -3 });
title(11.6, 0.9, { lines: [{ text: 'Legendary!', size: 2.0, c: 'accent' }], anim: 'pop', rot: 3 });

// seasons
shot(12.5, 1.5, 'L-neon2', 16.0, { scale: 1.2, anchor: RING, pulse: 0.012, shake: 0.5, flash: 0.5, boom: 0, sfx: [['perfect', 0.4, 0.7], ['comboUp', 0.9, 0.7]] });
shot(14.0, 1.5, 'L-sakura', 20.0, { scale: 1.2, anchor: RING, pulse: 0.012, shake: 0.4, sfx: [['perfect', 0.3, 0.7], ['tightFit', 0.9, 0.8]] });
title(12.5, 3.0, { lines: two('Every', 'season', 2.1), rot: 2 });
// collection
shot(15.5, 1.7, 's-collection', 0.5, { speed: 3.2, punch: 0.04, flash: 0.4, sfx: [['chestBurstRare', 0.05, 0.9], ['coinLand', 0.8, 0.8]] });
title(15.6, 1.6, { lines: [{ text: '113 skins', size: 1.9 }, { text: 'to collect', size: 1.5, c: 'accent' }], rot: -2 });

// end card
shot(18.2, 1.8, 'L-meadow', 20.0, { speed: 0.6, scale: 1.25, anchor: RING, punch: 0, push: 0.03 });
title(18.3, 1.7, { ...centre, anim: 'pop', outDur: 0.01, drift: 0.01, lines: [{ text: 'Roundabout', size: 1.55 }, { text: 'Timing', size: 2.5, c: 'accent' }] });

const flashes = [...k.flashes, { t: 18.2, a: 0.5 }];

export default {
  w: k.w, h: k.h, dur: 20, layout: 'landscape',
  shots: k.shots, titles: k.titles, flashes,
  fades: [{ t: 17.95, dur: 0.25, from: 0, to: 0.6 }, { t: 19.8, dur: 0.2, from: 0.6, to: 1 }],
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
    sfx: k.sfx,
    booms: [...k.booms, { t: 17.2, gain: 0.8 }],
    risers: [{ from: 10.5, to: 11.55, gain: 0.6 }],
    fadeOut: 0.5,
  },
};
