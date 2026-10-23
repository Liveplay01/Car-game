import type { World } from './world';
import type { Vehicle } from './vehicle';
import { Rng, substream } from './rng';
import { type Vec2, add, sub, mul, dot, length, fromAngle, angleDelta, wrap, clamp, TAU } from './vec2';
import { gravity } from './config';

/**
 * A rare moment (Leo, 23.10.2026): about one shift in 500 a duck family crosses the roundabout, between two
 * arms, over the ring, the island and the ring again. The cars that would meet it brake like drivers do, stop
 * short of it and put their hazards on; the rest drive on and leave. The family only steps onto a lane once
 * nobody is in its way, so it never walks through a car; the chicks bunch up while their mother waits at the
 * kerb, and now and then one dawdles off to the side and hurries back. Your taps wait too, and so do the cars
 * at the other arms. No points, no notice. When it comes is drawn from the seed alone, never from a stream
 * the traffic uses, so every other seed keeps its traffic.
 */
export function duckDelay(w: World): number | null {
  const c = w.config;
  if (c.mayhem || w.isVersus || c.duckChance <= 0) return null;
  const r = substream(w.seed, 0x0d0c4a11);
  return r.unit() < c.duckChance ? r.range(c.duckDelay.lo, c.duckDelay.hi) : null;
}

/** One crossing of the ring: where along the walk it starts and ends, its two kerbs, and where the cars stop for it (ring distance). */
export interface DuckBand {
  from: number;
  to: number;
  a: Vec2;
  b: Vec2;
  s: number;
}

/** The family's way: verge, kerb, across the ring, the island, across the ring, kerb, verge. */
export interface DuckWalk {
  points: Vec2[];
  /** Distance along the walk at each point. */
  at: number[];
  length: number;
  bands: DuckBand[];
}

export interface DuckFamily {
  walk: DuckWalk;
  /** How far along the walk each duck is, the mother first (below 0: still in the verge). */
  at: number[];
  /** Seconds each chick still dawdles. */
  dawdle: number[];
  /** The mother waits at a kerb for the lane to clear. */
  waiting: boolean;
  /** The family is close enough to the road for the drivers to have seen it: they stop, and so do your taps. */
  seen: boolean;
  /** Ring cars too close to stop when the family set off, by crossing: they drive on, the family waits for them. */
  through: string[];
  rng: Rng;
}

export const DUCKLINGS = 5;

/** A point `d` along the walk, and the way it faces there; before the start it runs back into the verge. */
export function duckPose(walk: DuckWalk, d: number): { position: Vec2; heading: number } {
  const p = walk.points;
  let k = 0;
  while (k < p.length - 2 && d > walk.at[k + 1]) k++;
  const dir = sub(p[k + 1], p[k]);
  const span = length(dir);
  const t = (d - walk.at[k]) / span;
  return { position: add(p[k], mul(dir, t)), heading: Math.atan2(dir.y, dir.x) };
}

/** The band `d` lies in, if any. */
export const duckBandAt = (walk: DuckWalk, d: number): DuckBand | undefined => walk.bands.find((b) => d >= b.from - 2 && d <= b.to + 2);

/**
 * The way across: between two arms, as far from both as can be (so no car turning in or out is near it), the two
 * ends as opposite as can be and the line as level as can be (the screen is widest that way). Null when the arms
 * stand too close for a crossing to be clear of them.
 */
export function duckWalk(w: World): DuckWalk | null {
  const L = w.layout;
  const c = w.config;
  const R = L.ringRadius;
  const arms = L.arms.map((a) => wrap(a.angle, TAU)).sort((x, y) => x - y);
  const keep = (Math.max(c.mergeAngle, L.lanes > 1 ? c.innerMergeAngle : 0) * R + c.carLength + c.duckRoom) / R;
  const mids = arms
    .map((a, i) => (a + (i + 1 < arms.length ? arms[i + 1] : arms[0] + TAU)) / 2)
    .filter((m) => arms.every((a) => Math.abs(angleDelta(a, m)) >= keep));
  let best: [number, number] | null = null;
  let score = -Infinity;
  for (const m1 of mids) {
    for (const m2 of mids) {
      if (m1 === m2) continue;
      const ends = Math.abs(angleDelta(m1, m2));
      const dir = sub(fromAngle(m2), fromAngle(m1));
      const level = Math.abs(dir.x) / (length(dir) || 1);
      const s = ends * 4 + level;
      if (s > score) {
        score = s;
        best = [m1, m2];
      }
    }
  }
  if (!best) return null;
  const [m1, m2] = w.seed % 2 === 0 ? best : [best[1], best[0]];
  const outer = R + c.laneWidth / 2 + 3;
  const inner = L.islandRadius - 3;
  const verge = outer + c.duckVerge;
  const at = (angle: number, r: number): Vec2 => mul(fromAngle(angle), r);
  const points = [at(m1, verge), at(m1, outer), at(m1, inner), at(m2, inner), at(m2, outer), at(m2, verge)];
  const along = [0];
  for (let k = 1; k < points.length; k++) along.push(along[k - 1] + length(sub(points[k], points[k - 1])));
  return {
    points,
    at: along,
    length: along[along.length - 1],
    bands: [
      { from: along[1], to: along[2], a: points[1], b: points[2], s: wrap(m1, TAU) * R },
      { from: along[3], to: along[4], a: points[3], b: points[4], s: wrap(m2, TAU) * R },
    ],
  };
}

function distanceToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const ab = sub(b, a);
  const t = clamp(dot(sub(p, a), ab) / Math.max(dot(ab, ab), 1e-9), 0, 1);
  return length(sub(p, add(a, mul(ab, t))));
}

/**
 * The family may step onto crossing `k`: nobody is on it, and nobody who goes first (`through`) is still on the way to it;
 * everyone else stops short of it.
 */
function bandClear(w: World, f: DuckFamily, k: number): boolean {
  const band = f.walk.bands[k];
  return w.vehicles.every((x) => {
    const p = x.phase;
    if (p.kind === 'queued' || p.kind === 'waiting') return true;
    if (distanceToSegment(x.position, band.a, band.b) < w.lengthOf(x.type) / 2 + w.config.duckRoom) return false;
    if (p.kind !== 'ring') return true;
    const gap = duckGap(w, x, p.s, band);
    if (gap === null) return true;
    if (f.through.includes(`${x.id}:${k}`)) return false;
    // Whoever could not stop even braking hard is let by first.
    const speed = p.drive.speed ?? w.ringSpeed;
    return (speed * speed) / (2 * Math.max(gap - w.config.stopGap, 0.5)) <= w.config.driverBrake * gravity(w.config) * 0.8;
  });
}

/** The family sets off now: in a line behind its mother, out of the verge. */
export function startDucks(w: World): DuckFamily | null {
  const walk = duckWalk(w);
  if (!walk) return null;
  const c = w.config;
  const f: DuckFamily = {
    walk,
    at: Array.from({ length: DUCKLINGS + 1 }, (_, k) => -k * c.duckSpacing),
    dawdle: Array.from({ length: DUCKLINGS + 1 }, () => 0),
    waiting: false,
    seen: false,
    through: [],
    rng: substream(w.seed, 0x0d0c4a12),
  };
  return f;
}

/** The drivers see the family coming: whoever is too close to stop gently goes first, and the family waits for them at the kerb. */
function seeDucks(w: World, f: DuckFamily): void {
  const c = w.config;
  const walk = f.walk;
  f.seen = true;
  for (const veh of w.vehicles) {
    const p = veh.phase;
    if (p.kind !== 'ring') continue;
    walk.bands.forEach((band, k) => {
      const gap = duckGap(w, veh, p.s, band);
      const speed = p.drive.speed ?? w.ringSpeed;
      if (gap !== null && (speed * speed) / (2 * Math.max(gap - c.stopGap, 0.5)) > c.duckBrake * gravity(c)) f.through.push(`${veh.id}:${k}`);
    });
  }
}

/** Room from a ring car's nose to where it stops for a crossing ahead; null when the crossing is behind it or under it. */
function duckGap(w: World, veh: Vehicle, s: number, band: DuckBand): number | null {
  const ahead = w.layout.ringDistance(s, band.s);
  if (ahead > w.layout.ring.length / 2) return null;
  const gap = ahead - w.lengthOf(veh.type) / 2 - w.config.duckRoom;
  return gap > 0 ? gap : null;
}

/**
 * How fast a ring car may still go to stop for the ducks (`core/drivers.ts`): every car that stops for a crossing knows
 * its place in the line before it and rolls there on the same gentle braking, so the line closes up without anyone
 * running into the car ahead; `room` is how far it still has to its place, for a harder stop when it falls behind that
 * braking. Null when it does not stop (nothing ahead, or it goes first).
 */
export function duckStop(w: World, veh: Vehicle, s: number): { limit: number; room: number } | null {
  const f = w.ducks;
  if (!f || !f.seen) return null;
  const c = w.config;
  const last = f.at[f.at.length - 1];
  let stop: { limit: number; room: number } | null = null;
  f.walk.bands.forEach((band, k) => {
    if (last > band.to + c.duckRoom || f.through.includes(`${veh.id}:${k}`)) return;
    const gap = duckGap(w, veh, s, band);
    if (gap === null) return;
    // The cars between this one and the crossing that stop there too, each with the room it takes.
    let line = 0;
    for (const x of w.vehicles) {
      const p = x.phase;
      if (x.id === veh.id || p.kind !== 'ring' || x.lane !== veh.lane || f.through.includes(`${x.id}:${k}`)) continue;
      const ahead = duckGap(w, x, p.s, band);
      if (ahead !== null && ahead < gap) line += w.lengthOf(x.type) + c.stopGap;
    }
    const room = Math.max(0, gap - line - c.stopGap);
    if (!stop || room < stop.room) stop = { limit: Math.sqrt(2 * c.duckBrake * gravity(c) * room), room };
  });
  return stop;
}

/** One step of the family: the mother walks on unless a lane ahead is not clear; the chicks follow, dawdle now and then, and hurry back. */
export function updateDucks(w: World, now: number, dt: number): void {
  const c = w.config;
  const start = w.shift.startedAt;
  if (!w.ducks) {
    const on = w.shift.phase === 'running' || w.shift.phase === 'rushHour';
    if (w.ducksDone || w.duckDelay === null || start === null || !on || now - start < w.duckDelay) return;
    w.ducks = startDucks(w);
    w.ducksDone = true;
    return;
  }
  const f = w.ducks;
  const walk = f.walk;
  if (!f.seen && f.at[0] >= walk.bands[0].from - c.duckSeen) seeDucks(w, f);
  // Whoever was to go first but got stuck behind someone standing for the ducks stands too.
  f.through = f.through.filter((key) => {
    const veh = w.vehicle(Number(key.split(':')[0]));
    return veh !== undefined && veh.phase.kind === 'ring' && (veh.phase.drive.speed ?? w.ringSpeed) > c.standingSpeed;
  });
  // Far out on the grass (off the screen) they hurry; near the road they trot.
  const pace = (d: number): number => c.duckPace * (d < walk.at[1] - 50 || d > walk.at[4] + 50 ? 2.5 : 1);
  let lead = f.at[0] + pace(f.at[0]) * dt;
  walk.bands.forEach((band, k) => {
    if (f.at[0] <= band.from && lead > band.from && !bandClear(w, f, k)) lead = band.from;
  });
  f.waiting = lead < f.at[0] + pace(f.at[0]) * dt * 0.5;
  f.at[0] = Math.min(lead, walk.length + c.duckSpacing * (DUCKLINGS + 2));
  for (let k = 1; k < f.at.length; k++) {
    const onRoad = duckBandAt(walk, f.at[k]) !== undefined || duckBandAt(walk, f.at[k] + c.duckSpacing * 2) !== undefined;
    if (f.dawdle[k] > 0) f.dawdle[k] = Math.max(0, f.dawdle[k] - dt);
    else if (!onRoad && f.at[k] > walk.at[1] - 60 && f.at[k] < walk.at[4] + 60 && f.rng.unit() < c.duckDawdle * dt) f.dawdle[k] = f.rng.range(0.6, 1.5);
    const target = f.at[k - 1] - c.duckSpacing * (f.waiting ? 0.55 : 1);
    const behind = target - f.at[k];
    const hurry = f.dawdle[k] > 0 && !onRoad ? 0.2 : behind > 2 ? 1.7 : 1;
    f.at[k] = Math.min(target, f.at[k] + pace(f.at[k]) * hurry * dt);
  }
  if (f.at[f.at.length - 1] >= walk.length) {
    w.ducks = null;
    w.ducksGone = now;
  }
}
