// Reel "Wait for it": the clip slows down before each tap, the tap lands, Perfect. Three times, faster each time, then a run of them.
import { merges, when, TAP_LEAD, VIEW, SAFE, endCard } from './social.mjs';

const perfect = (src, i) => merges(src).filter((m) => m.rating === 'perfect')[i].t;
const shots = [], titles = [], taps = [], sfx = [], flashes = [], booms = [];
let t = 0;

// slow: how far the clip crawls before the tap (0.22 = very slow); hold: seconds of crawl
const beat = (src, merge, { lead = 1.0, slow = 0.22, hold = 1.4, after = 0.9, view = {} } = {}) => {
  const tap = merge - TAP_LEAD;
  const s = { t, src, ...VIEW, ...view };
  s.at = tap - lead - hold * slow - 0.05;
  s.speed = slow === 1 ? 1 : [[0, 1], [lead, 1], [lead + 0.12, slow], [lead + hold, slow], [lead + hold + 0.08, 1]];
  s.dur = 30;
  const tapT = when(s, tap), mergeT = when(s, merge);
  s.dur = mergeT + after - t;
  shots.push(s);
  taps.push({ t: tapT, x: 0.5, y: 0.71 });
  sfx.push({ name: 'uiTick', t: tapT, gain: 0.9 }, { name: 'perfect', t: mergeT, gain: 0.9 });
  flashes.push({ t: mergeT, a: 0.4 });
  booms.push({ t: mergeT, gain: 0.7 });
  const r = { start: t, slowFrom: t + lead, tapT, mergeT };
  t = mergeT + after;
  return r;
};

const b1 = beat('h-sakura', perfect('h-sakura', 0), { lead: 0.7, slow: 0.2, hold: 1.8 });
titles.push(
  { ...SAFE, t: 0, dur: b1.tapT - 0.05, y: 0.2, rot: -2, lines: [{ text: 'Wait', size: 2.4 }, { text: 'for it…', size: 2.4, c: 'accent' }] },
  { ...SAFE, t: b1.tapT, dur: 0.45, y: 0.2, anim: 'pop', lines: [{ text: 'Now!', size: 3, c: 'accent' }] },
  { ...SAFE, t: b1.mergeT, dur: b1.start + (b1.mergeT - b1.start) + 0.85 - b1.mergeT, y: 0.2, anim: 'pop', lines: [{ text: 'Perfect.', size: 2.6, c: 'mint' }] },
);
const b2 = beat('h-snow', perfect('h-snow', 1), { lead: 0.6, slow: 0.35, hold: 1.0, after: 0.7 });
titles.push(
  { ...SAFE, t: b2.start, dur: b2.tapT - b2.start, y: 0.2, rot: 2, lines: [{ text: 'Again.', size: 2.4 }, { text: 'Wait…', size: 2.4, c: 'accent' }] },
  { ...SAFE, t: b2.tapT, dur: b2.mergeT + 0.7 - b2.tapT, y: 0.2, anim: 'pop', lines: [{ text: 'Perfect.', size: 2.6, c: 'mint' }] },
);
const b3 = beat('h-sakura', perfect('h-sakura', 1), { lead: 0.5, slow: 0.6, hold: 0.6, after: 0.55 });
titles.push({ ...SAFE, t: b3.start, dur: b3.mergeT + 0.55 - b3.start, y: 0.2, rot: -2, lines: [{ text: 'Faster.', size: 2.6, c: 'accent' }] });
// the run: no slow-down any more
const run = [['h-aurora', 0], ['h-snow', 2], ['h-sakura', 2], ['h-aurora', 1], ['h-snow', 3]];
const runStart = t;
run.forEach(([src, i]) => beat(src, perfect(src, i), { lead: 0.35, slow: 1, hold: 0, after: 0.3 }));
titles.push({ ...SAFE, t: runStart, dur: t - runStart, y: 0.2, anim: 'slam', lines: [{ text: 'Perfect', size: 2.2 }, { text: 'after perfect', size: 2.2, c: 'accent' }] });
const runEnd = t;

const end = endCard(runEnd + 0.1, 3.0);
shots.push({ t: runEnd, dur: 3.2, src: 'h-snow', at: 20.0, speed: 0.5, ...VIEW, punch: 0 });
titles.push(...end.titles);
const dur = runEnd + 3.2;
titles.filter((x) => (x.anim ?? 'slam') === 'slam').forEach((x) => sfx.push({ name: 'swoosh', t: Math.max(0, x.t - 0.05), gain: 0.4 }));
sfx.push({ name: 'shiftComplete', t: runEnd, gain: 0.8 });

export default {
  w: 1080, h: 1920, dur, layout: 'portrait',
  shots, titles, taps, flashes, shades: end.shades,
  audio: {
    music: [
      { stem: 'base', from: 0, to: dur, gain: 0.45 },
      { stem: 'bass', from: b1.mergeT, to: dur, gain: 0.6 },
      { stem: 'rhythm', from: b2.mergeT, to: dur, gain: 0.55 },
      { stem: 'lead', from: runStart, to: dur, gain: 0.5 },
    ],
    sfx, booms,
    risers: [{ from: b1.slowFrom, to: b1.mergeT, gain: 0.45 }, { from: b2.slowFrom, to: b2.mergeT, gain: 0.45 }],
    fadeOut: 0.6,
  },
};
