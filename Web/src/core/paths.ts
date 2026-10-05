import { type Vec2, add, sub, mul, dist, lengthSq, angleOf, fromAngle, wrap, TAU, v, clamp } from './vec2';

export interface Pose {
  position: Vec2;
  /** Direction of travel, radians. */
  heading: number;
}

/** A cubic Bézier segment. */
export interface Bezier {
  p0: Vec2;
  p1: Vec2;
  p2: Vec2;
  p3: Vec2;
}

export const line = (a: Vec2, b: Vec2): Bezier => ({
  p0: a,
  p1: add(a, mul(sub(b, a), 1 / 3)),
  p2: add(a, mul(sub(b, a), 2 / 3)),
  p3: b,
});

function bezierPoint(b: Bezier, t: number): Vec2 {
  const u = 1 - t;
  const a = u * u * u;
  const c = 3 * u * u * t;
  const d = 3 * u * t * t;
  const e = t * t * t;
  return v(b.p0.x * a + b.p1.x * c + b.p2.x * d + b.p3.x * e, b.p0.y * a + b.p1.y * c + b.p2.y * d + b.p3.y * e);
}

function bezierDerivative(b: Bezier, t: number): Vec2 {
  const u = 1 - t;
  const a = 3 * u * u;
  const c = 6 * u * t;
  const d = 3 * t * t;
  return v(
    (b.p1.x - b.p0.x) * a + (b.p2.x - b.p1.x) * c + (b.p3.x - b.p2.x) * d,
    (b.p1.y - b.p0.y) * a + (b.p2.y - b.p1.y) * c + (b.p3.y - b.p2.y) * d,
  );
}

/**
 * Vehicles move along paths by distance `s`, not by angle (FOUNDATION.md 4.2). The ring is
 * a closed circle, entries and exits are open Bézier curves parametrised by arc length.
 */
export interface Path {
  readonly length: number;
  readonly closed: boolean;
  pose(s: number): Pose;
  point(s: number): Vec2;
}

/** Counter-clockwise circle; s = 0 lies at angle 0 (east). */
export function circlePath(center: Vec2, radius: number): Path {
  const length = TAU * radius;
  const pose = (s: number): Pose => {
    const angle = wrap(s / radius);
    return { position: add(center, mul(fromAngle(angle), radius)), heading: angle + Math.PI / 2 };
  };
  return { length, closed: true, pose, point: (s) => pose(s).position };
}

export function curvePath(segments: Bezier[], samplesPerSegment = 96): Path {
  const segs: number[] = [];
  const ts: number[] = [];
  const ss: number[] = [];
  let s = 0;
  segments.forEach((segment, index) => {
    let previous = bezierPoint(segment, 0);
    segs.push(index);
    ts.push(0);
    ss.push(s);
    for (let k = 1; k <= samplesPerSegment; k++) {
      const t = k / samplesPerSegment;
      const p = bezierPoint(segment, t);
      s += dist(p, previous);
      previous = p;
      segs.push(index);
      ts.push(t);
      ss.push(s);
    }
  });
  const length = s;

  const parameter = (target: number): [number, number] => {
    let lo = 0;
    let hi = ss.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (ss[mid] <= target) lo = mid;
      else hi = mid - 1;
    }
    if (lo + 1 >= ss.length) return [segs[lo], ts[lo]];
    const b = lo + 1;
    if (segs[b] !== segs[lo] || ss[b] - ss[lo] <= 1e-12) return [segs[lo], ts[lo]];
    const f = (target - ss[lo]) / (ss[b] - ss[lo]);
    return [segs[lo], ts[lo] + (ts[b] - ts[lo]) * f];
  };

  const pose = (at: number): Pose => {
    const [segment, t] = parameter(clamp(at, 0, length));
    const bez = segments[segment];
    const d = bezierDerivative(bez, t);
    const heading = lengthSq(d) > 1e-12 ? angleOf(d) : angleOf(sub(bez.p3, bez.p0));
    return { position: bezierPoint(bez, t), heading };
  };
  return { length, closed: false, pose, point: (at) => pose(at).position };
}

/** Distance along the path of the point nearest to `p`, and how far away that is. */
export function nearestOnPath(path: Path, p: Vec2, step = 4): { s: number; distance: number } {
  const count = Math.max(1, Math.floor(path.length / step));
  let best = 0;
  let bestDistance = dist(path.point(0), p);
  for (let k = 1; k <= count; k++) {
    const s = (path.length * k) / count;
    const d = dist(path.point(s), p);
    if (d < bestDistance) {
      best = s;
      bestDistance = d;
    }
  }
  const fine = path.length / count / 8;
  for (let k = -8; k <= 8; k++) {
    const s = clamp(best + k * fine, 0, path.length);
    const d = dist(path.point(s), p);
    if (d < bestDistance) {
      best = s;
      bestDistance = d;
    }
  }
  return { s: best, distance: bestDistance };
}
