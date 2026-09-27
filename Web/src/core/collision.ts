import { type Vec2, add, sub, mul, dot, dist, fromAngle, clamp01 } from './vec2';

/** A capsule: segment plus radius. Exact and cheap distance, no physics engine (FOUNDATION.md 4.3). */
export interface Capsule {
  a: Vec2;
  b: Vec2;
  radius: number;
}

/** A vehicle's hitbox. `length` includes the rounded ends, `width` is the diameter. */
export function capsule(center: Vec2, heading: number, length: number, width: number): Capsule {
  const r = width / 2;
  const half = mul(fromAngle(heading), Math.max(0, length / 2 - r));
  return { a: sub(center, half), b: add(center, half), radius: r };
}

export interface Contact {
  /** Surface to surface; ≤ 0 means they touch. */
  gap: number;
  pointA: Vec2;
  pointB: Vec2;
}

export const contactPoint = (c: Contact): Vec2 => mul(add(c.pointA, c.pointB), 0.5);

export function contact(c1: Capsule, c2: Capsule): Contact {
  const [p, q] = closestPoints(c1.a, c1.b, c2.a, c2.b);
  return { gap: dist(p, q) - c1.radius - c2.radius, pointA: p, pointB: q };
}

export const gap = (c1: Capsule, c2: Capsule): number => contact(c1, c2).gap;

/** Closest points between segments p1–q1 and p2–q2 (Ericson, Real-Time Collision Detection 5.1.9). */
export function closestPoints(p1: Vec2, q1: Vec2, p2: Vec2, q2: Vec2): [Vec2, Vec2] {
  const epsilon = 1e-12;
  const d1 = sub(q1, p1);
  const d2 = sub(q2, p2);
  const r = sub(p1, p2);
  const a = dot(d1, d1);
  const e = dot(d2, d2);
  const f = dot(d2, r);
  let s = 0;
  let t = 0;
  if (a <= epsilon && e <= epsilon) return [p1, p2];
  if (a <= epsilon) {
    t = clamp01(f / e);
  } else {
    const c = dot(d1, r);
    if (e <= epsilon) {
      s = clamp01(-c / a);
    } else {
      const b = dot(d1, d2);
      const denominator = a * e - b * b;
      s = denominator !== 0 ? clamp01((b * f - c * e) / denominator) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp01(-c / a);
      } else if (t > 1) {
        t = 1;
        s = clamp01((b - c) / a);
      }
    }
  }
  return [add(p1, mul(d1, s)), add(p2, mul(d2, t))];
}
