import { Vehicle, type Waiting } from './vehicle';
import type { World } from './world';
import { warningArms } from './traffic';
import { weddingOn } from './wedding';
import { add, sub, mul, cross, fromAngle, clamp } from './vec2';

/**
 * The drift car (Leo, 22.10.2026): very rarely, once the ring has gone quiet, a tuned coupé
 * joins from one of the other arms and slides round it sideways, Tokyo style. A show, no task:
 * it is real traffic, and its swinging tail is real too (the hitbox turns with the body).
 *
 * The slide is a spring on the slip angle between body and path: the throttle holds the tail
 * out, a lift lets the grip pull it back in, and the driver counter-steers against it. At the
 * stop line it does a burnout, launches with the wheels still spinning, flicks the other way on
 * the entry and swings the tail out wide; on the exit the tail whips across once before it
 * straightens. If the ring fills up meanwhile, it calls it off: off the throttle, straight, out at
 * the next exit.
 */
export type DriftPhase =
  | { kind: 'idle'; next: number }
  | {
      kind: 'on';
      vehicle: number;
      /** Slip angle (rad, towards the inside) and how fast it changes. */
      slip: number;
      rate: number;
      /** Front wheels against the body (rad, same side as `slip`): mostly counter-steer. */
      steer: number;
      throttle: boolean;
      toggleAt: number;
      /** Every lift of the throttle: the blow-off valve hisses once per lift. */
      lifts: number;
      /** Seconds since the slide began; negative before. */
      sliding: number;
      /** +1 when the inside of the turn is to the car's left. */
      side: number;
      /** 0…1: the rear wheels spinning on the spot (the burnout at the line, the launch). */
      spin: number;
      /** Seconds at the stop line, and since it took the exit; negative before. */
      burning: number;
      leaving: number;
      /** The ring filled up: no more slide, it straightens out and takes the next exit (seconds since; negative before). */
      calming: number;
    }
  | { kind: 'done' };

export function firstDrift(w: World): DriftPhase {
  const c = w.config;
  if (c.mayhem || w.isVersus || c.level < c.driftLevel || c.driftChance <= 0) return { kind: 'done' };
  // Pity window: the last `driftWindow` levels of each `driftEvery`-level cycle get a rising chance,
  // so the slide still feels random but shows up roughly once per cycle instead of drifting off forever.
  const cycle = (c.level - c.driftLevel) % c.driftEvery;
  const remaining = c.driftEvery - cycle;
  if (remaining > c.driftWindow) return { kind: 'done' };
  return w.driftRng.unit() < 1 / remaining ? { kind: 'idle', next: w.driftRng.range(c.driftFirst.lo, c.driftFirst.hi) } : { kind: 'done' };
}

/** The drift car is out there: no traffic joins beyond the bots the ring has to keep. */
export const driftOn = (w: World): boolean => w.drift.kind === 'on';

/** It is due but waits for a quiet ring: the regular traffic holds back so the ring can run empty. */
export const driftDue = (w: World): boolean => w.drift.kind === 'idle' && w.time >= w.drift.next;

/** Vehicles driving on or into the ring besides `except`; any wreck counts as a full ring. */
function traffic(w: World, except: number | null): number {
  let moving = 0;
  for (const x of w.vehicles) {
    if (x.isCrashed) return Infinity;
    if (x.id !== except && (x.phase.kind === 'ring' || x.phase.kind === 'merging')) moving++;
  }
  return moving;
}

export function updateDrift(w: World, now: number, dt: number): void {
  const c = w.config;
  const d = w.drift;
  if (d.kind === 'idle') {
    if (!w.isScoring || w.shift.startedAt === null) return;
    if (!w.shift.acceptsTaps) {
      w.drift = { kind: 'done' };
      return;
    }
    if (now < d.next || weddingOn(w) || traffic(w, null) > c.minRingBots + c.driftMaxTraffic) return;
    const arms = warningArms(w).filter((arm) => !w.vehicles.some((x) => x.phase.kind === 'waiting' && x.phase.arm.index === arm.index));
    if (arms.length === 0) return;
    const waiting: Waiting = { kind: 'waiting', arm: w.driftRng.pick(arms), reaction: c.driftBurnout, approach: c.aiApproachDistance };
    const veh = new Vehicle(w.makeId(), 'drift', 'ai', waiting, w.approachPose(waiting));
    w.vehicles.push(veh);
    w.drift = { kind: 'on', vehicle: veh.id, slip: 0, rate: 0, steer: 0, throttle: false, toggleAt: Infinity, lifts: 0, sliding: -1, side: 1, spin: 0, burning: -1, leaving: -1, calming: -1 };
    return;
  }
  if (d.kind !== 'on') return;
  const veh = w.vehicle(d.vehicle);
  if (!veh || veh.isCrashed || veh.retired) {
    w.drift = c.driftRepeat > 0 ? { kind: 'idle', next: now + c.driftRepeat } : { kind: 'done' };
    return;
  }
  const p = veh.phase;
  if (d.calming < 0 && p.kind !== 'exiting' && traffic(w, veh.id) > c.minRingBots + c.driftAbortTraffic) {
    d.calming = 0;
    if (d.throttle && d.sliding >= 0) d.lifts++;
    d.throttle = false;
    if (p.kind === 'merging') p.extraLaps = 0;
    // Out at the next exit it reaches: the laps it still meant to drive are dropped.
    if (p.kind === 'ring') p.distanceToExit = ((p.distanceToExit % w.layout.ring.length) + w.layout.ring.length) % w.layout.ring.length;
  }
  if (d.calming >= 0) d.calming += dt;
  if (p.kind === 'waiting') {
    if (p.approach > 0 || d.calming >= 0) {
      d.spin = 0;
      d.slip = 0;
      d.rate = 0;
      veh.heading = w.approachPose(p).heading;
      return;
    }
    // The burnout: flat out on the spot, the tail squirming, smoke boiling off the rear wheels.
    d.burning = Math.max(0, d.burning) + dt;
    d.throttle = true;
    d.spin = Math.min(1, d.spin + dt / 0.35);
    d.side = cross(fromAngle(veh.heading), mul(veh.position, -1)) >= 0 ? 1 : -1;
    const squirm = 0.1 * Math.sin(d.burning * 2 * Math.PI * 1.7) * d.spin;
    d.rate += (c.driftStiffness * 2 * (squirm - d.slip) - c.driftDamping * d.rate) * dt;
    d.slip += d.rate * dt;
    d.steer = clamp(-0.6 * d.slip, -0.3, 0.3);
    const pose = w.approachPose(p);
    veh.heading = pose.heading + d.side * d.slip;
    veh.position = pose.position;
    return;
  }
  if (p.kind !== 'merging' && p.kind !== 'ring' && p.kind !== 'exiting') return;
  const rng = w.driftRng;
  // Launched: the wheels spin on for a moment, then bite.
  d.spin = Math.max(0, d.spin - dt / c.driftLaunch);
  if (p.kind === 'exiting') d.leaving = Math.max(0, d.leaving) + dt;
  if (d.sliding < 0 && d.calming < 0 && (p.kind !== 'merging' || p.elapsed > p.profile.duration * 0.3)) {
    d.sliding = 0;
    d.side = cross(fromAngle(veh.heading), mul(veh.position, -1)) >= 0 ? 1 : -1;
    d.toggleAt = now + rng.range(c.driftPull.lo, c.driftPull.hi);
  } else if (d.sliding >= 0) d.sliding += dt;

  if (p.kind === 'exiting' || d.calming >= 0) {
    if (d.throttle) d.lifts++;
    d.throttle = false;
  } else if (d.sliding < 0) {
    d.throttle = true;
  } else if (now >= d.toggleAt) {
    d.throttle = !d.throttle;
    if (!d.throttle) d.lifts++;
    d.toggleAt = now + (d.throttle ? rng.range(c.driftPull.lo, c.driftPull.hi) : rng.range(c.driftLift.lo, c.driftLift.hi));
    // The lift and the bite of the next pull unsettle the car a little, never the same twice.
    d.rate += (d.throttle ? 1 : -1) * rng.range(0.2, 0.6);
  }
  // Out: the tail whips across once, then comes straight. In: the flick, then the long swing out.
  const target =
    d.calming >= 0
      ? 0
      : d.leaving >= 0
      ? d.leaving < c.driftWhipTime
        ? -c.driftWhip
        : 0
      : d.sliding < 0
        ? 0
        : d.sliding < c.driftFlick
          ? -c.driftFlickAngle
          : d.throttle
            ? c.driftAngle
            : c.driftLiftAngle;
  // While it swings in and out the grip is loose: the tail overshoots before it settles.
  const loose =
    d.calming >= 0 ? d.calming < c.driftWhipTime * 2 : d.leaving >= 0 ? d.leaving < c.driftWhipTime * 2 : d.sliding >= 0 && d.sliding < c.driftSettle;
  d.rate += (c.driftStiffness * (target - d.slip) - c.driftDamping * (loose ? c.driftSwing : 1) * d.rate) * dt;
  d.slip += d.rate * dt;
  // Turned in a touch on the entry, then the wheels follow the road: against the slide, a little ahead of it.
  d.steer = clamp(0.12 - 0.9 * d.slip - 0.08 * d.rate, -0.7, 0.7);

  // The body turns about a point ahead of its middle: the tail swings out.
  const pivot = w.lengthOf('drift') * 0.2;
  const ahead = add(veh.position, mul(fromAngle(veh.heading), pivot));
  veh.heading += d.side * d.slip;
  veh.position = sub(ahead, mul(fromAngle(veh.heading), pivot));
}

/** How hard it slides right now, 0…1 (a little over in a big swing): rubber on the road, smoke, the squeal. */
export function driftGrip(w: World): number {
  const d = w.drift;
  if (d.kind !== 'on') return 0;
  return clamp(Math.abs(d.slip) / w.config.driftAngle, 0, 1.2) * (d.throttle ? 1 : 0.65);
}

/** The drift car's front wheels against its body (rad, + to the left), for the picture. */
export function driftSteer(w: World, id: number): number {
  const d = w.drift;
  return d.kind === 'on' && d.vehicle === id ? d.side * d.steer : 0;
}
