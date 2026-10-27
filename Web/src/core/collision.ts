import { type Vec2, add, sub, mul, fromAngle, clamp01 } from './vec2';

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

/** A point that may be written in place (the scratch of the allocation-free collision maths). */
export interface MutablePoint {
  x: number;
  y: number;
}

export interface Contact {
  /** Surface to surface; ≤ 0 means they touch. */
  gap: number;
  pointA: Vec2;
  pointB: Vec2;
}

/** A `Contact` whose points may be overwritten in place: reused frame after frame instead of being made anew. */
export interface ContactSlot extends Contact {
  pointA: MutablePoint;
  pointB: MutablePoint;
}

export const makeContact = (): ContactSlot => ({ gap: 0, pointA: { x: 0, y: 0 }, pointB: { x: 0, y: 0 } });

export const contactPoint = (c: Contact): Vec2 => mul(add(c.pointA, c.pointB), 0.5);

/** Closest points of two segments, written into `outA`/`outB`: no object per call (Ericson, RTCD 5.1.9). */
export function closestPointsInto(outA: MutablePoint, outB: MutablePoint, p1: Vec2, q1: Vec2, p2: Vec2, q2: Vec2): void {
  const epsilon = 1e-12;
  const d1x = q1.x - p1.x;
  const d1y = q1.y - p1.y;
  const d2x = q2.x - p2.x;
  const d2y = q2.y - p2.y;
  const rx = p1.x - p2.x;
  const ry = p1.y - p2.y;
  const a = d1x * d1x + d1y * d1y;
  const e = d2x * d2x + d2y * d2y;
  let s = 0;
  let t = 0;
  if (a <= epsilon && e <= epsilon) {
    outA.x = p1.x;
    outA.y = p1.y;
    outB.x = p2.x;
    outB.y = p2.y;
    return;
  }
  if (a <= epsilon) {
    const f = d2x * rx + d2y * ry;
    t = clamp01(f / e);
  } else {
    const c = d1x * rx + d1y * ry;
    if (e <= epsilon) {
      s = clamp01(-c / a);
    } else {
      const b = d1x * d2x + d1y * d2y;
      const f = d2x * rx + d2y * ry;
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
  outA.x = p1.x + d1x * s;
  outA.y = p1.y + d1y * s;
  outB.x = p2.x + d2x * t;
  outB.y = p2.y + d2y * t;
}

/** Closest points between segments p1–q1 and p2–q2 (allocates: use `closestPointsInto` in hot paths). */
export function closestPoints(p1: Vec2, q1: Vec2, p2: Vec2, q2: Vec2): [Vec2, Vec2] {
  const a: MutablePoint = { x: 0, y: 0 };
  const b: MutablePoint = { x: 0, y: 0 };
  closestPointsInto(a, b, p1, q1, p2, q2);
  return [a, b];
}

/** `contact` into a slot that is reused: no `Contact` per call in the collision loops. */
export function contactInto(out: ContactSlot, c1: Capsule, c2: Capsule): ContactSlot {
  closestPointsInto(out.pointA, out.pointB, c1.a, c1.b, c2.a, c2.b);
  const dx = out.pointA.x - out.pointB.x;
  const dy = out.pointA.y - out.pointB.y;
  out.gap = Math.hypot(dx, dy) - c1.radius - c2.radius;
  return out;
}

export function contact(c1: Capsule, c2: Capsule): Contact {
  const [p, q] = closestPoints(c1.a, c1.b, c2.a, c2.b);
  return { gap: Math.hypot(p.x - q.x, p.y - q.y) - c1.radius - c2.radius, pointA: p, pointB: q };
}

const gapA: MutablePoint = { x: 0, y: 0 };
const gapB: MutablePoint = { x: 0, y: 0 };

/** Surface distance without making a `Contact` (the gap is all callers of this need). */
export const gap = (c1: Capsule, c2: Capsule): number => {
  closestPointsInto(gapA, gapB, c1.a, c1.b, c2.a, c2.b);
  const dx = gapA.x - gapB.x;
  const dy = gapA.y - gapB.y;
  return Math.hypot(dx, dy) - c1.radius - c2.radius;
};
