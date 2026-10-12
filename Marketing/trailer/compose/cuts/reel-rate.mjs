// Reel "Rate my timing": the sequel to "Too early". Real crashes in every sky, each rated a little worse, then one 10/10.
import { events, merges, when, TAP_LEAD, VIEW, SAFE, endCard } from './social.mjs';

const shots = [], titles = [], taps = [], sfx = [], flashes = [], booms = [];
const ZOOM = { ...VIEW, scale: 1.28, anchor: [0.5, 0.64], punch: 0.06 };
const SLOW = (at) => [[0, 1], [at - 0.12, 1], [at, 0.3], [at + 0.9, 0.3], [at + 1.0, 1]];
let t = 0;

// the n-th crash of the player's own car that follows a tap closely: launch and impact
const pick = (src, n = 0) => {
  const launches = events(src, 'launched');
  const found = events(src, 'crash')
    .filter((e) => e.inv && e.t > 2.5)
    .map((e) => ({ impact: e.t, launch: launches.filter((l) => l.t < e.t - 0.35).at(-1)?.t }))
    .filter((c) => c.launch !== undefined && c.impact - c.launch < 2.2);
  return found[Math.min(n, found.length - 1)];
};

// one crash, rated: the tap, slow motion from the impact, a score that gets worse each time
const crash = (src, n, score, hitSounds, rate = 1) => {
  const { launch, impact } = pick(src, n);
  const from = launch - 0.7;
  const s = { t, src, at: from, dur: 60, ...ZOOM, shake: 1, shakeDur: 0.6 };
  s.speed = SLOW(impact - from);
  const tapT = when(s, launch), hitT = when(s, impact);
  s.dur = hitT + 0.85 - t;
  shots.push(s);
  taps.push({ t: tapT, x: 0.5, y: 0.76 });
  sfx.push({ name: 'uiTick', t: tapT, gain: 0.7, rate });
  hitSounds.forEach(([name, off, gain, r = 1]) => sfx.push({ name, t: hitT + off, gain, rate: r }));
  flashes.push({ t: hitT, a: 0.35, c: '#ff4d4d' });
  booms.push({ t: hitT, gain: 0.7 });
  titles.push({ ...SAFE, t: hitT, dur: t + s.dur - hitT, y: 0.22, anim: 'slam', rot: titles.length % 2 ? 3 : -3, lines: [{ text: score, size: 2.9, c: 'red' }] });
  t += s.dur;
  return { tapT, hitT };
};

const c1 = crash('f-meadow', 0, '3/10', [['crash', 0, 1]]);
titles.push({ ...SAFE, t: 0, dur: c1.hitT - 0.02, y: 0.2, kicker: 'Be honest', kickerSize: 0.38, lines: [{ text: 'Rate my', size: 2.2 }, { text: 'timing', size: 2.5, c: 'accent' }] });
crash('f-ice', 0, '1/10', [['screech', -0.35, 0.6, 0.95], ['crashHeavy', 0, 0.9]], 0.95);
crash('f-storm', 1, '0/10', [['crashLight', 0, 1, 1.1], ['shatter', 0.06, 0.5]], 1.08);
crash('f-meadow', 1, '−2/10', [['crashHeavy', 0, 1, 0.85], ['seized', 0.2, 0.4]], 0.9);

// Mayhem: the chain explosion is off the scale
const boomAt = events('f-mayhem', 'explosion').at(-1).t;
const m = { t, src: 'f-mayhem', at: boomAt - 0.9, dur: 60, ...VIEW, scale: 1.12, anchor: [0.5, 0.66], shake: 1.2, shakeDur: 0.9 };
m.speed = SLOW(0.9);
const mT = when(m, boomAt);
m.dur = mT + 1.1 - t;
shots.push(m);
sfx.push({ name: 'detonation', t: mT, gain: 1 }, { name: 'explosion', t: mT + 0.1, gain: 0.8 });
flashes.push({ t: mT, a: 0.7, c: '#ffb347' });
booms.push({ t: mT, gain: 1 });
titles.push({ ...SAFE, t: mT, dur: t + m.dur - mT, y: 0.2, anim: 'slam', rot: 2, lines: [{ text: 'Error', size: 2.4, c: 'red' }, { text: '/10', size: 1.8 }] });
t += m.dur;

// the comeback: wait for the gap
const fixStart = t;
const perfect = merges('w-hail').filter((x) => x.t > 2.5 && x.rating === 'perfect')[0].t;
const f = { t, src: 'w-hail', at: perfect - TAP_LEAD - 1.2, dur: 60, ...VIEW };
f.speed = [[0, 1], [0.7, 1], [0.8, 0.3], [1.7, 0.3], [1.8, 1]];
const fTap = when(f, perfect - TAP_LEAD), fHit = when(f, perfect);
f.dur = fHit + 1.0 - t;
shots.push(f);
taps.push({ t: fTap, x: 0.5, y: 0.76 });
sfx.push({ name: 'uiTick', t: fTap, gain: 0.9, rate: 1.15 }, { name: 'perfect', t: fHit, gain: 1 });
flashes.push({ t: fHit, a: 0.45 });
booms.push({ t: fHit, gain: 0.7 });
titles.push(
  { ...SAFE, t: fixStart, dur: fHit - fixStart - 0.02, y: 0.2, anim: 'rise', lines: [{ text: 'Okay, okay.', size: 1.9 }, { text: 'One more try', size: 1.8, c: 'accent' }] },
  { ...SAFE, t: fHit, dur: t + f.dur - fHit, y: 0.2, anim: 'pop', lines: [{ text: '10/10', size: 3, c: 'mint' }] },
);
t += f.dur;

const endAt = t;
shots.push({ t, dur: 3.2, src: 'w-night', at: 12.0, speed: 0.6, ...VIEW, punch: 0 });
const end = endCard(endAt + 0.1, 3.0);
titles.push(...end.titles);
const dur = endAt + 3.2;
titles.filter((x) => (x.anim ?? 'slam') === 'slam').forEach((x, i) => sfx.push({ name: 'swoosh', t: Math.max(0, x.t - 0.05), gain: 0.3 + 0.05 * (i % 2), rate: 0.92 + 0.06 * (i % 3) }));
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
