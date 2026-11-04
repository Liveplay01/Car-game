// Generated social reels (Nov 2026): one recipe = hook + steps; moments come from the footage logs, so a new
// reel is a few lines of data. Render: node compose/batch.mjs [id ...]. Moments never repeat across recipes
// (the recipes are planned in order, `used` carries over).
import { readdirSync, readFileSync } from 'node:fs';
import { when, TAP_LEAD, VIEW, SAFE, endCard } from './social.mjs';
import { RECIPES } from './gen-recipes.mjs';

const FOOTAGE = new URL('../../footage/', import.meta.url);
const START = 2.4; // the start card and achievement toast
const KIND = {
  perfect: (e) => e.type === 'merged' && e.rating === 'perfect' && e.inv !== false,
  tightFit: (e) => e.type === 'merged' && e.rating === 'tightFit' && e.inv !== false,
  nearMiss: (e) => e.type === 'merged' && e.rating === 'nearMiss' && e.inv !== false,
  clean: (e) => e.type === 'merged' && e.rating === 'clean' && e.inv !== false,
  crash: (e) => e.type === 'crash' && e.inv,
  takedown: (e) => e.type === 'takedown',
  explosion: (e) => e.type === 'explosion',
  criminal: (e) => e.type === 'criminalEntered',
  ambulance: (e) => e.type === 'ambulanceEntered',
  military: (e) => e.type === 'militaryEntered',
  rushHour: (e) => e.type === 'rushHour',
};
const CLIPS = {};
for (const f of readdirSync(FOOTAGE).filter((f) => /^[ghvwf]-.*\.json$/.test(f))) {
  const j = JSON.parse(readFileSync(new URL(f, FOOTAGE)));
  CLIPS[f.slice(0, -5)] = { seconds: j.seconds, log: j.log.map((e) => ({ ...e, t: e.f / 60 / 1.0625 })) };
}
const POOL = {};
for (const k in KIND) {
  POOL[k] = Object.entries(CLIPS).flatMap(([src, c]) => c.log.filter(KIND[k])
    .filter((e) => e.t > START + 1.6 && e.t < c.seconds / 1.0625 - 2.2).map((e) => ({ ...e, src, k })));
}

const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
};
const WIDE = { ...VIEW, scale: 1.02, anchor: [0.5, 0.5], punch: 0.08 };
const CLOSE = { ...VIEW, scale: 1.16, anchor: [0.5, 0.62], punch: 0.1 };
const HOT = { ...VIEW, scale: 1.3, anchor: [0.5, 0.66], punch: 0.06 };
const CUES = {
  perfect: [['perfect', 1]], tightFit: [['tightFit', 1]], nearMiss: [['nearMiss', 1]], clean: [['merge', 0.6], ['flowIn', 0.5], ['comboUp', 0.6]],
  crash: [['crashHeavy', 1], ['crash', 0.9], ['crashLight', 1]], takedown: [['takedown', 1], ['wanted', 0.5]],
  explosion: [['detonation', 1], ['explosion', 0.8]], criminal: [['wanted', 0.8]], ambulance: [['ambulance', 0.7]],
  military: [['stingConvoy', 0.7]], rushHour: [['rushHour', 0.8]],
};
const COLOR = { perfect: 'mint', tightFit: 'accent', nearMiss: 'accent', clean: 'mint', crash: 'red', takedown: 'red', explosion: 'red', criminal: 'red', ambulance: 'red', military: 'red', rushHour: 'red' };
const MUSIC = {
  A: (dur, end) => [['base', 0, dur, 0.5], ['rhythm', 0, end, 0.55], ['bass', 2, dur, 0.6], ['lead', 3, end, 0.5], ['rush', 6, end, 0.45]],
  B: (dur, end) => [['base', 0, dur, 0.5], ['bass', 0, end, 0.6], ['flow', 2, dur, 0.55], ['rhythm', 4, end, 0.5]],
  C: (dur, end) => [['base', 0, dur, 0.45], ['rhythm', 0, dur, 0.55], ['rush', 2, end, 0.5], ['lead', 6, dur, 0.45]],
  D: (dur, end) => [['base', 0, dur, 0.5], ['flow', 0, end, 0.55], ['lead', 2, dur, 0.5], ['bass', 4, end, 0.55]],
  E: (dur, end) => [['base', 0, dur, 0.5], ['boss', 0, end, 0.6], ['rhythm', 2, end, 0.5], ['siren', 4, end, 0.3]],
};
const ENDS = [['h-aurora', 21], ['h-neon', 22], ['h-sakura', 14], ['h-tropic', 12], ['h-snow', 16], ['h-meadow', 18]];
const beat = (x) => Math.ceil(x * 2 - 1e-6) / 2;

const used = new Set();
const plan = (recipe, index) => {
  const rand = rng(index * 977 + 13);
  const shots = [], titles = [], taps = [], sfx = [], flashes = [], booms = [];
  let cue = 0;
  const near = (m) => [...used].some((u) => u.src === m.src && Math.abs(u.t - m.t) < 4);
  const pick = (k, n, from) => {
    let c = POOL[k].filter((m) => (!from || from.test(m.src)) && !near(m));
    if (c.length < n) c = POOL[k].filter((m) => !from || from.test(m.src));
    const out = [], clips = new Set();
    for (const m of c.sort(() => rand() - 0.5)) {
      if (out.length === n) break;
      if (clips.has(m.src) && c.length > n * 3) continue;
      out.push(m); clips.add(m.src); used.add(m);
    }
    return out;
  };
  const title = (t, dur, lines, extra = {}) => titles.push({ ...SAFE, t, dur, y: 0.2, anim: 'slam', rot: titles.length % 2 ? 2 : -2, lines, ...extra });
  const text = (l) => (Array.isArray(l) ? { text: l[0], size: l[1] ?? 2.3, c: l[2] } : { text: l, size: 2.3 });

  let t = 0;
  // one moment as a shot of `len` seconds; `slow` runs slow motion into the hit
  const moment = (m, len, { slow, label, view, rank, tag } = {}) => {
    const merge = m.type === 'merged';
    const launch = merge ? m.t - TAP_LEAD : (CLIPS[m.src].log.filter((e) => e.type === 'launched' && e.t < m.t && e.t > m.t - 2.5).at(-1)?.t ?? m.t - 1);
    const lead = slow ? 1.0 : Math.min(len * 0.55, 1.1);
    const s = { t, src: m.src, at: Math.max(START, launch - lead), dur: 60, ...(view ?? (slow ? CLOSE : WIDE)) };
    if (m.type === 'crash' || slow) { s.shake = m.type === 'crash' || m.type === 'explosion' ? 1 : 0; s.shakeDur = 0.6; }
    const a = launch - s.at;
    if (slow) s.speed = [[0, 1], [a + 0.35, 1], [a + 0.45, 0.35], [a + 1.2, 0.35], [a + 1.3, 1]];
    const tapT = when(s, launch), hitT = when(s, m.t);
    s.dur = slow ? Math.max(len, beat(hitT + 0.9 - t)) : len;
    shots.push(s);
    taps.push({ t: tapT, x: 0.5, y: 0.76 });
    const [name, gain] = CUES[m.k][cue++ % CUES[m.k].length];
    const r = 0.94 + 0.05 * (cue % 4);
    sfx.push({ name: 'uiTick', t: tapT, gain: 0.5, rate: 1 + 0.06 * (cue % 3) }, { name, t: hitT, gain: gain * (slow ? 1 : 0.85), rate: name === 'merge' ? r : 1 });
    flashes.push({ t: hitT, a: slow ? 0.45 : 0.3, c: COLOR[m.k] === 'red' ? '#ff4d4d' : '#fff' });
    if (slow || m.k === 'explosion') booms.push({ t: hitT, gain: m.k === 'explosion' ? 0.9 : 0.6 });
    if (label !== undefined) {
      const lines = rank ? [{ text: rank, size: 3.4, c: COLOR[m.k] }, text(label)] : [text(label.length ? label : ['', 1])];
      const at = slow ? hitT - 0.05 : t;
      titles.push({ ...SAFE, t: at, dur: t + s.dur - at, y: 0.2, anim: rank ? 'pop' : 'slam', rot: titles.length % 2 ? 2 : -2, kicker: tag, kickerSize: 0.36, lines });
    }
    t += s.dur;
    return { s, tapT, hitT };
  };

  // hook: a calm real moment under the text (a clean merge, no tap shown)
  const [open] = pick('clean', 1, recipe.hook.from);
  const hookDur = recipe.hook.dur ?? 2;
  shots.push({ t: 0, src: open.src, at: Math.max(START, open.t - 1.4), dur: hookDur, ...WIDE });
  title(0, hookDur, recipe.hook.lines.map(text), { kicker: recipe.hook.kicker, kickerSize: 0.4, anim: recipe.hook.anim ?? 'slam' });
  sfx.push({ name: recipe.hook.sfx ?? 'go', t: 0, gain: 0.55 });
  t = hookDur;

  let hero = t;
  for (const step of recipe.steps) {
    const moments = pick(step.k, step.n, step.from && new RegExp(step.from));
    if (step.k === 'clean' || step.fastEnd) hero = t;
    moments.forEach((m, i) => {
      const last = i === moments.length - 1;
      const label = step.labels?.[i % step.labels.length];
      const slow = step.slow === true || (step.slow === 'last' && last);
      if (step.rank) {
        moment(m, step.len ?? 1.5, { slow, label: label ?? '', rank: `#${moments.length - i}`, view: slow ? CLOSE : WIDE });
      } else {
        moment(m, step.len ?? 1, { slow, label: label === undefined ? undefined : label, view: step.view === 'hot' ? HOT : step.view === 'close' ? CLOSE : undefined, tag: step.tag && i === 0 ? step.tag : undefined });
      }
      if (step.tick) titles.push({ ...SAFE, t: t - (step.len ?? 1), dur: step.len ?? 1, y: 0.7, anim: 'fade', lines: [{ text: `${i + 1}/${moments.length}`, size: 0.9 }] });
    });
    if (step.say) {
      const s = shots.at(-1);
      title(t - s.dur + 0.1, s.dur - 0.1, step.say.map(text), { y: 0.62, anim: 'rise' });
    }
  }
  const endAt = t;
  const [src, at] = ENDS[index % ENDS.length];
  shots.push({ t, dur: 3.2, src, at, speed: 0.6, ...WIDE, punch: 0 });
  const end = endCard(endAt + 0.1, 3.0);
  titles.push(...end.titles);
  const dur = endAt + 3.2;
  sfx.push({ name: 'shiftComplete', t: endAt, gain: 0.8 });
  // a swoosh under some slams, never all: varied pitch and level
  titles.filter((x) => (x.anim ?? 'slam') === 'slam').forEach((x, i) => { if (i % 2 === 0) sfx.push({ name: 'swoosh', t: Math.max(0, x.t - 0.05), gain: 0.22 + 0.05 * (i % 3), rate: 0.9 + 0.06 * (i % 4) }); });
  const music = MUSIC[recipe.music ?? 'A'](dur, endAt).map(([stem, from, to, gain]) => ({ stem, from: Math.min(from, dur - 1), to, gain }));
  return {
    w: 1080, h: 1920, dur, layout: 'portrait',
    shots, titles, taps, flashes, shades: end.shades,
    audio: { music, sfx, booms, risers: recipe.riser ? [{ from: hero - 1, to: hero, gain: 0.45 }] : [], fadeOut: 0.6 },
  };
};

const built = new Map();
RECIPES.forEach((r, i) => built.set(r.id, plan(r, i)));
export const ids = RECIPES.map((r) => r.id);
export const build = (id) => {
  const edl = built.get(id);
  if (!edl) throw new Error(`no recipe ${id}`);
  return edl;
};
