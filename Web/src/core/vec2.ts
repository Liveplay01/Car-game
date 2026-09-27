/** Plain 2D vector maths (y up, like GameCore's `Vec2`). Immutable, small, fast enough. */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export const TAU = Math.PI * 2;

export const v = (x: number, y: number): Vec2 => ({ x, y });
export const ZERO: Vec2 = v(0, 0);
export const add = (a: Vec2, b: Vec2): Vec2 => v(a.x + b.x, a.y + b.y);
export const sub = (a: Vec2, b: Vec2): Vec2 => v(a.x - b.x, a.y - b.y);
export const mul = (a: Vec2, k: number): Vec2 => v(a.x * k, a.y * k);
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const cross = (a: Vec2, b: Vec2): number => a.x * b.y - a.y * b.x;
export const lengthSq = (a: Vec2): number => a.x * a.x + a.y * a.y;
export const length = (a: Vec2): number => Math.hypot(a.x, a.y);
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
export const angleOf = (a: Vec2): number => Math.atan2(a.y, a.x);
export const fromAngle = (angle: number): Vec2 => v(Math.cos(angle), Math.sin(angle));
/** 90° counter-clockwise. */
export const left = (a: Vec2): Vec2 => v(-a.y, a.x);
/** 90° clockwise. */
export const right = (a: Vec2): Vec2 => v(a.y, -a.x);
export const normalize = (a: Vec2): Vec2 => {
  const l = length(a);
  return l > 1e-12 ? v(a.x / l, a.y / l) : ZERO;
};
export const lerpV = (a: Vec2, b: Vec2, t: number): Vec2 => v(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);

/** Wraps into [0, period). */
export function wrap(value: number, period = TAU): number {
  const r = value % period;
  return r < 0 ? r + period : r;
}

/** Shortest signed angle from a to b. */
export function angleDelta(a: number, b: number): number {
  return wrap(b - a + Math.PI) - Math.PI;
}

export const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);
export const clamp01 = (x: number): number => clamp(x, 0, 1);
