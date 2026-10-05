import { type Config, gravity } from './config';
import { type Vec2, add, sub, mul, dot, cross, left, length, normalize, fromAngle, ZERO, clamp } from './vec2';

/** A car as a rigid body in the plane, for crashes only. */
export interface RigidBody {
  position: Vec2;
  velocity: Vec2;
  heading: number;
  angularVelocity: number;
  mass: number;
  inertia: number;
}

const velocityAt = (b: RigidBody, point: Vec2): Vec2 => add(b.velocity, mul(left(sub(point, b.position)), b.angularVelocity));

/**
 * Resolves the impact of `a` and `b` touching at `point` (FOUNDATION.md 2.6): an impulse with
 * conserved momentum, `restitution` bounce and Coulomb friction along the contact. `n` points
 * from b to a. Returns the closing speed (0 if they were already separating).
 */
export function collide(a: RigidBody, b: RigidBody, point: Vec2, n: Vec2, restitution: number, friction: number): number {
  const ra = sub(point, a.position);
  const rb = sub(point, b.position);
  const relative = sub(velocityAt(a, point), velocityAt(b, point));
  const closing = dot(relative, n);
  if (closing >= 0) return 0;

  const effectiveMass = (d: Vec2): number => {
    const raD = cross(ra, d);
    const rbD = cross(rb, d);
    return 1 / a.mass + 1 / b.mass + (raD * raD) / a.inertia + (rbD * rbD) / b.inertia;
  };

  const normalImpulse = (-(1 + restitution) * closing) / effectiveMass(n);
  let impulse = mul(n, normalImpulse);
  const sliding = sub(relative, mul(n, closing));
  if (length(sliding) > 1e-9) {
    const t = normalize(sliding);
    const wanted = -dot(relative, t) / effectiveMass(t);
    const limit = friction * normalImpulse;
    impulse = add(impulse, mul(t, clamp(wanted, -limit, limit)));
  }
  a.velocity = add(a.velocity, mul(impulse, 1 / a.mass));
  a.angularVelocity += cross(ra, impulse) / a.inertia;
  b.velocity = sub(b.velocity, mul(impulse, 1 / b.mass));
  b.angularVelocity -= cross(rb, impulse) / b.inertia;
  return -closing;
}

/** One step of a skidding wreck: tyre friction at four wheels, then motion. */
export function skid(body: RigidBody, c: Config, dt: number): void {
  const forward = fromAngle(body.heading);
  const side = left(forward);
  const axle = c.carLength * 0.32;
  const track = c.carWidth * 0.4;
  const load = (body.mass * gravity(c)) / 4;
  let force = ZERO;
  let torque = 0;
  const wheels: [number, number][] = [
    [axle, track],
    [axle, -track],
    [-axle, track],
    [-axle, -track],
  ];
  for (const [along, across] of wheels) {
    const offset = add(mul(forward, along), mul(side, across));
    const slip = add(body.velocity, mul(left(offset), body.angularVelocity));
    // Coulomb friction; below 2 wu/s it turns smooth so a wreck settles without jitter.
    const scale = load / Math.max(length(slip), 2);
    const wheel = mul(add(mul(forward, c.tireGripBrake * dot(slip, forward)), mul(side, c.tireGripSide * dot(slip, side))), -scale);
    force = add(force, wheel);
    torque += cross(offset, wheel);
  }
  body.velocity = add(body.velocity, mul(force, dt / body.mass));
  body.angularVelocity += (torque / body.inertia) * dt;
  body.position = add(body.position, mul(body.velocity, dt));
  body.heading += body.angularVelocity * dt;
}

/** Moment of inertia of a car-sized box of mass 1. */
export const unitInertia = (c: Config): number => (c.carLength * c.carLength + c.carWidth * c.carWidth) / 12;
