// Reel "Too early": real crash physics first (tap at the wrong moment), then the same tap at the right one.
import { events, merges, when, TAP_LEAD, VIEW, SAFE, endCard } from './social.mjs';

const shots = [], titles = [], taps = [], sfx = [], flashes = [], booms = [];
const ZOOM = { ...VIEW, scale: 1.3, anchor: [0.5, 0.66], punch: 0.06 };
const SLOW = (at) => [[0, 1], [at - 0.12, 1], [at, 0.3], [at + 0.9, 0.3], [at + 1.0, 1]];
let t = 0;

// one crash: from `from` in the clip, the tap is the launch, slow motion from the impact
const crash = (src, launch, impact, label, c = 'red', extra = {}) => {
  const from = launch - 0.7;
  const s = { t, src, at: from, dur: 60, ...ZOOM, shake: 1, shakeDur: 0.6, ...extra };
  s.speed = SLOW(impact - from);
  const tapT = when(s, launch), hitT = when(s, impact);
  s.dur = hitT + 0.8 - t;
  shots.push(s);
  taps.push({ t: tapT, x: 0.5, y: 0.76 });
  sfx.push({ name: 'uiTick', t: tapT, gain: 0.8 }, { name: 'crashHeavy', t: hitT, gain: 1 }, { name: 'shatter', t: hitT + 0.05, gain: 0.6 });
  flashes.push({ t: hitT, a: 0.35, c: '#ff4d4d' });
  booms.push({ t: hitT, gain: 0.8 });
  titles.push({ ...SAFE, t: hitT, dur: t + s.dur - hitT, y: 0.24, anim: 'slam', rot: -3, lines: [{ text: label, size: 2.5, c }] });
  const r = { tapT, hitT };
  t += s.dur;
  return r;
};
const at = (src, type, n = 0) => events(src, type).filter((e) => e.type !== 'crash' || e.inv)[n].t;

const c1 = crash('h-crash2', at('h-crash2', 'launched', 3), at('h-crash2', 'crash', 0), 'Too early.');
titles.push({ ...SAFE, t: 0, dur: c1.hitT - 0.02, y: 0.2, kicker: 'POV', kickerSize: 0.4, lines: [{ text: 'You tap', size: 2.2 }, { text: 'without looking', size: 1.8, c: 'accent' }] });
crash('h-crash', at('h-crash', 'launched', 2), at('h-crash', 'crash', 2), 'Too late.');
crash('h-crash2', at('h-crash2', 'launched', 5), at('h-crash2', 'crash', 1), 'Again?!');

// the chain explosion of Mayhem
const boomAt = events('g-mayhem', 'explosion').at(-1).t;
const m = { t, src: 'g-mayhem', at: boomAt - 0.9, dur: 60, ...VIEW, scale: 1.12, anchor: [0.5, 0.7], shake: 1.2, shakeDur: 0.9 };
m.speed = SLOW(0.9);
const mT = when(m, boomAt);
m.dur = mT + 1.1 - t;
shots.push(m);
sfx.push({ name: 'detonation', t: mT, gain: 1 }, { name: 'explosion', t: mT + 0.1, gain: 0.8 });
flashes.push({ t: mT, a: 0.7, c: '#ffb347' });
booms.push({ t: mT, gain: 1 });
titles.push({ ...SAFE, t: mT, dur: t + m.dur - mT, y: 0.2, anim: 'slam', rot: 2, lines: [{ text: 'Okay…', size: 2.2 }, { text: 'that escalated', size: 1.8, c: 'accent' }] });
t += m.dur;

// the fix: wait, then tap
const fixStart = t;
const perfect = merges('h-snow').filter((x) => x.rating === 'perfect')[1].t;
const f = { t, src: 'h-snow', at: perfect - TAP_LEAD - 1.2, dur: 60, ...VIEW };
f.speed = [[0, 1], [0.7, 1], [0.8, 0.3], [1.7, 0.3], [1.8, 1]];
const fTap = when(f, perfect - TAP_LEAD), fHit = when(f, perfect);
f.dur = fHit + 1.0 - t;
shots.push(f);
taps.push({ t: fTap, x: 0.5, y: 0.76 });
sfx.push({ name: 'uiTick', t: fTap, gain: 0.9 }, { name: 'perfect', t: fHit, gain: 1 });
flashes.push({ t: fHit, a: 0.45 });
booms.push({ t: fHit, gain: 0.7 });
titles.push(
  { ...SAFE, t: fixStart, dur: fHit - fixStart - 0.02, y: 0.2, anim: 'rise', lines: [{ text: 'Or…', size: 2 }, { text: 'wait for the gap', size: 1.8, c: 'accent' }] },
  { ...SAFE, t: fHit, dur: t + f.dur - fHit, y: 0.2, anim: 'pop', lines: [{ text: 'Perfect.', size: 2.8, c: 'mint' }] },
);
t += f.dur;

const endAt = t;
shots.push({ t, dur: 3.2, src: 'h-aurora', at: 21.0, speed: 0.6, ...VIEW, punch: 0 });
const end = endCard(endAt + 0.1, 3.0);
titles.push(...end.titles);
const dur = endAt + 3.2;
titles.filter((x) => (x.anim ?? 'slam') === 'slam').forEach((x) => sfx.push({ name: 'swoosh', t: Math.max(0, x.t - 0.05), gain: 0.4 }));
sfx.push({ name: 'shiftComplete', t: endAt, gain: 0.8 });

export default {
  w: 1080, h: 1920, dur, layout: 'portrait',
  shots, titles, taps, flashes, shades: end.shades,
  audio: {
    music: [
      { stem: 'base', from: 0, to: dur, gain: 0.45 },
      { stem: 'rhythm', from: 0, to: fixStart, gain: 0.55 },
      { stem: 'bass', from: 0, to: fixStart, gain: 0.6 },
      { stem: 'rush', from: c1.hitT, to: fixStart, gain: 0.4 },
      { stem: 'flow', from: fHit, to: dur, gain: 0.5 },
      { stem: 'lead', from: fHit, to: dur, gain: 0.5 },
    ],
    sfx, booms,
    risers: [{ from: fixStart + 0.4, to: fHit, gain: 0.45 }],
    fadeOut: 0.6,
  },
};
