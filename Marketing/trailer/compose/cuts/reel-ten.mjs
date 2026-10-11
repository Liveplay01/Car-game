// Reel "10 in a row": a counter over real merges, one tap each, the tenth in slow motion.
import { merges, when, TAP_LEAD, VIEW, SAFE, endCard } from './social.mjs';

const shots = [], titles = [], taps = [], sfx = [], flashes = [], booms = [];
const hits = [];
// a shot that plays [from, to] of a clip and counts every merge in it
const play = (t, src, from, to, speed = 1, extra = {}) => {
  const s = { t, src, at: from, speed, dur: 0, ...VIEW, ...extra };
  s.dur = when({ ...s, dur: 60 }, to) - t;
  shots.push(s);
  for (const m of merges(src).filter((m) => m.t > from && m.t < to)) hits.push({ tap: when(s, m.t - TAP_LEAD), merge: when(s, m.t) });
  return t + s.dur;
};

let t = 0;
t = play(t, 'h-aurora', 4.2, 10.5, 1.25);
t = play(t, 'h-aurora', 19.1, 20.8, 1.2);
t = play(t, 'h-tropic', 10.3, 11.2);
t = play(t, 'h-tropic', 16.1, 17.0);
// the tenth: slow from shortly before the tap to the merge
const tenth = merges('h-tropic').find((m) => m.rating === 'perfect').t;
t = play(t, 'h-tropic', tenth - 1.2, tenth + 0.9, [[0, 1], [0.5, 1], [0.6, 0.3], [2.4, 0.3], [2.5, 1]], { scale: 1.16 });
const done = t;
if (hits.length !== 10) throw new Error(`expected 10 merges, got ${hits.length}`);

titles.push({ ...SAFE, t: 0, dur: hits[0].merge - 0.05, y: 0.2, rot: -2, lines: [{ text: '10 in a row.', size: 2.2 }, { text: 'No crash.', size: 2.2, c: 'accent' }] });
hits.forEach((h, i) => {
  const next = i < 9 ? hits[i + 1].merge : done + 1.4;
  const last = i === 9;
  titles.push({ ...SAFE, t: h.merge, dur: next - h.merge, y: 0.2, anim: 'pop', drift: 0, lines: [{ text: `${i + 1}/10`, size: last ? 3.4 : 2.6, c: last ? 'accent' : 'mint' }] });
  taps.push({ t: h.tap, x: 0.5, y: 0.71 });
  sfx.push({ name: 'uiTick', t: h.tap, gain: 0.7 }, { name: last ? 'perfect' : 'merge', t: h.merge, gain: 0.9 }, { name: 'comboUp', t: h.merge + 0.05, gain: 0.25 + i * 0.05 });
  flashes.push({ t: h.merge, a: last ? 0.6 : 0.2 });
});
booms.push({ t: hits[9].merge, gain: 0.9 });
titles.push({ ...SAFE, t: hits[9].merge + 0.4, dur: done + 1.4 - hits[9].merge - 0.4, y: 0.34, anim: 'slam', rot: 2, lines: [{ text: 'Your turn.', size: 2.2 }] });

const endAt = done + 1.4;
shots.push({ t: done, dur: 1.4 + 3.0, src: 'h-tropic', at: tenth + 0.9, speed: 0.6, ...VIEW, punch: 0 });
const end = endCard(endAt, 3.0);
titles.push(...end.titles);
const dur = endAt + 3.0;
titles.filter((x) => (x.anim ?? 'slam') === 'slam').forEach((x) => sfx.push({ name: 'swoosh', t: Math.max(0, x.t - 0.05), gain: 0.4 }));

export default {
  w: 1080, h: 1920, dur, layout: 'portrait',
  shots, titles, taps, flashes, shades: end.shades,
  audio: {
    music: [
      { stem: 'base', from: 0, to: dur, gain: 0.5 },
      { stem: 'rhythm', from: 0, to: hits[9].tap, gain: 0.55 },
      { stem: 'bass', from: hits[2].merge, to: hits[9].tap, gain: 0.6 },
      { stem: 'rush', from: hits[6].merge, to: hits[9].tap, gain: 0.45 },
      { stem: 'lead', from: hits[9].merge, to: dur, gain: 0.55 },
      { stem: 'rhythm', from: hits[9].merge, to: dur, gain: 0.55 },
    ],
    sfx, booms,
    risers: [{ from: hits[9].tap - 1.0, to: hits[9].merge, gain: 0.5 }],
    fadeOut: 0.6,
  },
};
