import { gravity } from './config';
import { type Drive, isInFlow, newDrive, type Vehicle } from './vehicle';
import type { Arm } from './roundabout';
import { capsule } from './collision';
import { nearestOnPath } from './paths';
import { type Vec2, add, sub, mul, dot, length, normalize, angleOf, fromAngle, wrap, TAU } from './vec2';
import { Rng } from './rng';
import type { World } from './world';
import { transporterAhead } from './specials';

/** The nearest thing ahead a driver has to mind. */
export interface Lead {
  id: number;
  /** Surface to surface, along the road. */
  gap: number;
  speed: number;
  length: number;
}

interface Occupant {
  id: number;
  s: number;
  speed: number;
  length: number;
}

/**
 * Drivers react to what happens ahead (after a crash): they see the hazard, need a moment to
 * react, then brake as hard as needed. If the room is too short they crash too: pile-ups
 * follow from the physics, not from a script. In normal traffic nothing here runs.
 */
export function updateDrivers(w: World, dt: number): void {
  const quarry = pursuitQuarry(w);
  if (!w.isTrafficDisturbed && quarry === null && !hasTransporterOnRing(w)) return;
  const lane = ringLaneOccupants(w);
  // The criminal ploughs on; it only keeps out of the transporter's secure zone.
  for (const veh of w.vehicles) {
    if (veh.type !== 'pickup' || veh.phase.kind !== 'ring') continue;
    const truck = transporterAhead(w, veh.phase.s);
    if (!truck && isInFlow(veh.phase.drive)) continue;
    veh.phase.drive = drive(w, veh.phase.drive, truck ? [truck] : [], veh.id, dt);
  }
  for (const veh of w.vehicles) {
    if (veh.type === 'pickup') continue;
    const p = veh.phase;
    if (p.kind === 'ring') {
      const leads = leadsOnRing(w, p.s, lane, veh.id);
      if (quarry !== null && leads[0]?.id === quarry && veh.isPlayerPolice) p.drive = pursue(w, p.drive, dt);
      else p.drive = drive(w, p.drive, leads, veh.id, dt);
    } else if (p.kind === 'exiting') {
      const lead = leadOnExit(w, p.arm, p.s, veh.id);
      p.drive = drive(w, p.drive, lead ? [lead] : [], veh.id, dt);
    }
  }
}

function hasTransporterOnRing(w: World): boolean {
  return w.vehicles.some((x) => x.type === 'transporter' && x.phase.kind === 'ring');
}

/** The criminal, while it and one of your police cars are on the ring. */
function pursuitQuarry(w: World): number | null {
  if (w.criminal.kind !== 'active') return null;
  const pickup = w.vehicle(w.criminal.vehicle);
  if (!pickup || pickup.phase.kind !== 'ring') return null;
  const policeOnRing = w.vehicles.some((x) => x.isPlayerPolice && x.phase.kind === 'ring');
  return policeOnRing ? pickup.id : null;
}

/** A police car with the criminal directly ahead speeds up and rams it. */
function pursue(w: World, current: Drive, dt: number): Drive {
  const top = w.ringSpeed * w.config.policeChaseSpeedFactor;
  return {
    ...current,
    speed: Math.min(top, (current.speed ?? w.ringSpeed) + w.config.driverAcceleration * gravity(w.config) * dt),
    reaction: 0,
    isPursuing: true,
    isBraking: false,
  };
}

/** One driver, one step: notice, react, brake or get back into the flow. */
function drive(w: World, current: Drive, leads: Lead[], id: number, dt: number): Drive {
  const c = w.config;
  const d: Drive = { ...current, isPursuing: false };
  if (!isInFlow(current)) d.outOfFlowTime += dt;
  const g = gravity(c);
  const limit = w.ringSpeed;
  let speed = d.speed ?? w.ringSpeed;
  const lead = leads[0];
  let needed = 0;
  let cause: Lead | undefined;
  let queued = 0;
  for (const ahead of leads) {
    if (speed > ahead.speed) {
      const room = ahead.gap - queued - c.stopGap - c.followMargin * ahead.speed;
      let brake = room > 0.5 ? (speed * speed - ahead.speed * ahead.speed) / (2 * room) : Infinity;
      if (ahead.speed > c.standingSpeed && brake < c.followBraking * g) brake = 0;
      if (brake > needed) {
        needed = brake;
        cause = ahead;
      }
    }
    queued += ahead.length + c.stopGap;
  }
  const alarmed = needed > c.hazardBraking * g;
  if (needed > c.jamBraking * g) d.hazardTime += dt;
  if (alarmed && d.reaction === null) {
    // A wreck takes a moment to take in; slow traffic was seen coming.
    const isWreck = (l: Lead): boolean => w.vehicle(l.id)?.isCrashed ?? false;
    const before: Lead[] = [];
    for (const l of leads) {
      if (l.id === cause?.id) break;
      before.push(l);
    }
    const queueInFront = before.some((l) => !isWreck(l) && l.speed < speed);
    const surprise = cause !== undefined && isWreck(cause) && !queueInFront;
    d.reaction = surprise ? reactionTime(w, id) : 0;
  }
  if (d.reaction !== null && d.reaction > 0) {
    d.reaction = Math.max(0, d.reaction - dt);
    d.speed = speed;
    d.isBraking = false;
    return d;
  }
  if (alarmed) {
    speed = Math.max(0, speed - Math.min(needed * 1.1, c.driverBrake * g) * dt);
  } else if (speed > limit) {
    speed = Math.max(limit, speed - c.driverAcceleration * g * dt);
  } else if (canSpeedUp(w, speed, lead)) {
    speed = Math.min(limit, speed + c.driverAcceleration * g * dt);
  }
  if (Math.abs(speed - w.ringSpeed) < 1e-9 && !alarmed) return newDrive();
  const before = current.speed ?? w.ringSpeed;
  d.isBraking = speed < before - 1e-9 || speed <= c.standingSpeed;
  d.speed = speed;
  return d;
}

function canSpeedUp(w: World, speed: number, lead: Lead | undefined): boolean {
  if (!lead) return true;
  const comfortable = 0.3 * gravity(w.config);
  const needed = Math.max(0, speed * speed - lead.speed * lead.speed) / (2 * comfortable);
  return lead.gap - w.config.stopGap > needed + 0.3 * speed + 1;
}

/** Each driver reacts a little differently, always the same for the same car. */
function reactionTime(w: World, id: number): number {
  const r = new Rng((w.seed ^ Math.imul(id, 0x9e3779b9)) >>> 0);
  return r.range(w.config.driverReaction.lo, w.config.driverReaction.hi);
}

/** Nose, centre and tail of a wreck: enough to tell whether it reaches into a lane. */
function wreckPoints(w: World, veh: Vehicle): Vec2[] {
  const cap = capsule(veh.position, veh.heading, w.lengthOf(veh.type), w.config.carWidth);
  const forward = mul(normalize(sub(cap.b, cap.a)), cap.radius);
  return [sub(cap.a, forward), veh.position, add(cap.b, forward)];
}

/** Ring cars, wrecks lying in the lane and cars just turning off, by ring distance. */
function ringLaneOccupants(w: World): Occupant[] {
  const c = w.config;
  const circumference = w.layout.ring.length;
  const halfLane = c.laneWidth / 2 + c.carWidth / 2;
  const out: Occupant[] = [];
  for (const veh of w.vehicles) {
    const p = veh.phase;
    if (p.kind === 'ring') {
      out.push({ id: veh.id, s: p.s, speed: p.drive.speed ?? w.ringSpeed, length: w.lengthOf(veh.type) });
    } else if (p.kind === 'exiting' && p.s < c.carLength) {
      const s = wrap(w.layout.exitRingS[p.arm.index] + p.s, circumference);
      out.push({ id: veh.id, s, speed: p.drive.speed ?? w.ringSpeed, length: w.lengthOf(veh.type) });
    } else if (p.kind === 'crashed') {
      const points = wreckPoints(w, veh);
      let nearest = points[0];
      for (const pt of points) {
        if (Math.abs(length(pt) - w.layout.ringRadius) < Math.abs(length(nearest) - w.layout.ringRadius)) nearest = pt;
      }
      if (Math.abs(length(nearest) - w.layout.ringRadius) - c.carWidth / 2 >= halfLane - c.carWidth / 2 + 1) continue;
      const angle = angleOf(nearest);
      const s = wrap(angle, TAU) * w.layout.ringRadius;
      const tangent = fromAngle(angle + Math.PI / 2);
      out.push({ id: veh.id, s, speed: Math.max(0, dot(p.velocity, tangent)), length: w.lengthOf(veh.type) });
    }
  }
  return out;
}

/** The nearest `count` things ahead in the ring lane, nearest first. */
function leadsOnRing(w: World, s: number, occupants: Occupant[], id: number, count = 3): Lead[] {
  const circumference = w.layout.ring.length;
  const ahead: Lead[] = [];
  for (const o of occupants) {
    if (o.id === id) continue;
    const distance = w.layout.ringDistance(s, o.s);
    if (distance <= 0 || distance >= circumference / 2) continue;
    ahead.push({ id: o.id, gap: distance - o.length, speed: o.speed, length: o.length });
  }
  ahead.sort((a, b) => a.gap - b.gap || a.id - b.id);
  return ahead.slice(0, count);
}

/** Cars ahead on the same exit, and wrecks lying across it. */
function leadOnExit(w: World, arm: Arm, s: number, id: number): Lead | null {
  const c = w.config;
  const path = w.layout.exit(arm);
  const halfLane = c.laneWidth / 2 + c.carWidth / 2;
  let nearest: Lead | null = null;
  const consider = (vid: number, gap: number, speed: number): void => {
    if (!nearest || gap < nearest.gap) nearest = { id: vid, gap, speed, length: c.carLength };
  };
  for (const veh of w.vehicles) {
    if (veh.id === id) continue;
    const p = veh.phase;
    if (p.kind === 'exiting' && p.arm.index === arm.index && p.s > s) {
      consider(veh.id, p.s - s - w.lengthOf(veh.type), p.drive.speed ?? w.ringSpeed);
    } else if (p.kind === 'crashed') {
      // Cheap reject: a wreck far from this exit cannot block it.
      if (length(sub(veh.position, path.point(Math.min(s + 60, path.length)))) > 140) continue;
      let best: { s: number; distance: number } | null = null;
      for (const pt of wreckPoints(w, veh)) {
        const hit = nearestOnPath(path, pt, 8);
        if (!best || hit.distance < best.distance) best = hit;
      }
      if (!best || best.distance - c.carWidth / 2 >= halfLane - c.carWidth / 2 + 1 || best.s <= s) continue;
      const tangent = fromAngle(path.pose(best.s).heading);
      consider(veh.id, best.s - s - c.carLength, Math.max(0, dot(p.velocity, tangent)));
    }
  }
  return nearest;
}
