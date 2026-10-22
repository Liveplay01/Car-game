import { type At, type Pen, pose } from './icons';
import { line } from './render';
import { CONDITION_ICONS, ICON_KEYFRAMES, type ConditionIconId, type IconPart, type IconShape, type Track } from './conditionIconData';

export type { ConditionIconId };

/**
 * The pictures of the conditions (Leo, 22.10.2026): weather, darkness, city events, the ways to lose a shift and the road.
 * Drawn by the designer on a 24 grid with moving parts (`icon/condition-icons.js`); `scripts/condition-icons.mjs` turns that
 * into `conditionIconData.ts`, and this draws it through the Pen, so it is the canvas, the website's SVGs and Reduce Motion
 * (`t = Infinity`, the picture at rest) in one.
 */

/** One grid unit in the box units the Museum's pictures are drawn in (64 × 48 round the origin). */
const GRID = 2.1;

type Bezier = (x: number) => number;

/** CSS `cubic-bezier(x1, y1, x2, y2)`: solves x for the curve's parameter, then reads y. */
function bezier(x1: number, y1: number, x2: number, y2: number): Bezier {
  const at = (a: number, b: number, s: number): number => 3 * a * (1 - s) * (1 - s) * s + 3 * b * (1 - s) * s * s + s ** 3;
  return (x) => {
    let [lo, hi] = [0, 1];
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      if (at(x1, x2, mid) < x) lo = mid;
      else hi = mid;
    }
    return at(y1, y2, (lo + hi) / 2);
  };
}

const EASE: Record<NonNullable<IconPart['motion']>['ease'], Bezier> = { out: bezier(0.23, 1, 0.32, 1), linear: (x) => x };

const REST = { tx: 0, ty: 0, sx: 1, sy: 1, rot: 0, op: 1, dash: 0 };
type Pose = typeof REST;

/** A property's value at progress `x` of the animation: tweened between the stops that name it, at rest outside them. */
function track(stops: NonNullable<Track[keyof Track]>, rest: number, x: number, ease: Bezier): number {
  let [at0, v0] = [0, rest];
  for (const [at1, v1] of stops) {
    if (x <= at1) return at1 > at0 ? v0 + (v1 - v0) * ease((x - at0) / (at1 - at0)) : v1;
    [at0, v0] = [at1, v1];
  }
  return at0 < 1 ? v0 + (rest - v0) * ease((x - at0) / (1 - at0)) : v0;
}

function pose24(motion: NonNullable<IconPart['motion']>, t: number): Pose {
  const frames = ICON_KEYFRAMES[motion.kf];
  const x = Math.min(1, Math.max(0, (t - motion.delay) / motion.dur));
  const ease = EASE[motion.ease];
  const out = { ...REST };
  for (const key of Object.keys(frames) as (keyof Track)[]) out[key] = track(frames[key]!, REST[key], x, ease);
  return out;
}

/** The first `share` of a polyline, by length. */
function trim(pts: readonly number[], share: number): number[] {
  let total = 0;
  for (let i = 2; i < pts.length; i += 2) total += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
  let left = total * share;
  const out = [pts[0], pts[1]];
  for (let i = 2; i < pts.length && left > 0; i += 2) {
    const d = Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
    const k = d > left ? left / d : 1;
    out.push(pts[i - 2] + (pts[i] - pts[i - 2]) * k, pts[i - 1] + (pts[i + 1] - pts[i - 1]) * k);
    left -= d;
  }
  return out;
}

function drawShape(p: Pen, a: At, s: IconShape, o: number, drawn: number): void {
  if (s.circle) {
    const [x, y, r] = s.circle;
    if (s.fill) p.disc(a, x, y, r, s.fill[0], s.fill[1] * o);
    if (s.stroke) p.ring(a, x, y, r * GRID, s.stroke[1] * GRID, s.stroke[0], s.stroke[2] * o);
    return;
  }
  const pts = s.pts!;
  if (s.fill && pts.length >= 6) p.shape(a, pts, s.fill[0], s.fill[1] * o);
  if (!s.stroke) return;
  const [color, width, opacity] = s.stroke;
  const path = s.dash ? trim(pts, drawn) : s.closed ? [...pts, pts[0], pts[1]] : pts;
  for (let i = 2; i < path.length; i += 2) {
    const [x0, y0, x1, y1] = [path[i - 2], path[i - 1], path[i], path[i + 1]];
    if (x0 === x1 && y0 === y1) continue;
    if (s.butt) p.put(line(a(x0, y0), a(x1, y1), width * GRID * p.u), color, opacity * o);
    else p.line(a, x0, y0, x1, y1, width * GRID, color, opacity * o);
  }
}

/** Draws the condition `id` round the origin of the box; `t` is the seconds since it began to play, `Infinity` the picture at rest. */
export function drawCondition(id: ConditionIconId, p: Pen, at: At, t: number): void {
  const grid: At = (x, y) => at((x - 12) * GRID, (y - 12) * GRID);
  for (const part of CONDITION_ICONS[id]) {
    const m = part.motion ? pose24(part.motion, t) : REST;
    const a = part.pivot && part.motion ? pose(grid, part.pivot[0], part.pivot[1], { turn: (m.rot * Math.PI) / 180, sx: m.sx, sy: m.sy, dx: m.tx, dy: m.ty }) : grid;
    if (m.op <= 0.01) continue;
    for (const shape of part.shapes) drawShape(p, a, shape, m.op, 1 - m.dash);
  }
}

/** Seconds between two plays of an icon that keeps playing (the chips on the roundabout, the open sheet). */
export const ICON_LOOP = 2;

interface Run {
  start: number;
  last: number;
  over: boolean;
}
const runs = new Map<string, Run>();

/**
 * When an icon plays (Leo, 22.10.2026): one that stays in view plays every `ICON_LOOP` seconds (`loop`); one among many
 * plays once as it comes into view (`once`, the Museum's cards). Under the mouse it plays again from the start, wherever
 * it is. `now` is the frame's clock; an icon not asked for a moment (off screen, hidden) counts as new when it returns,
 * and `delay` holds the first play back (a chip that is still flying in). Returns the picture's `t` for `drawCondition`.
 */
export function iconClock(key: string, now: number, mode: 'loop' | 'once', over: boolean, delay = 0): number {
  let run = runs.get(key);
  if (!run || now < run.last || now - run.last > 0.25) runs.set(key, (run = { start: now + delay, last: now, over }));
  else if (over && !run.over) run.start = now;
  run.over = over;
  run.last = now;
  const x = now - run.start;
  return mode === 'loop' && x >= 0 ? x % ICON_LOOP : x;
}
