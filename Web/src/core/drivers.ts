import { gravity } from './config';
import { type Drive, type Merging, isInFlow, newDrive, profileDistance, type Vehicle } from './vehicle';
import type { Arm } from './roundabout';
import { capsule } from './collision';
import { nearestOnPath } from './paths';
import { type Vec2, add, sub, mul, dot, length, normalize, angleOf, fromAngle, wrap, TAU, clamp } from './vec2';
import { Rng } from './rng';
import type { World } from './world';
import { transporterAhead } from './specials';
import { plannedSpeed, speedLimitAt } from './modules';
import { isStalling } from './learner';

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
  /** The lane it takes up; a wreck across both lanes is listed once for each. */
  lane: number;
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
  // Mayhem: nobody brakes, for nothing. Traffic keeps flowing.
  if (w.config.mayhem) return;
  const quarry = pursuitQuarry(w);
  const zones = Object.keys(w.config.modules).length > 0 || w.roadworks !== null;
  const hesitant = w.learner.kind === 'active' || w.oversize.kind === 'active' || w.vehicles.some((x) => w.owesStop(x) && x.phase.kind === 'ring');
  if (!w.isTrafficDisturbed && quarry === null && !zones && !hesitant && !hasTransporterOnRing(w)) return;
  const lane = ringLaneOccupants(w, true);
  // A car joining plans with the speeds as they are: it brakes for what it sees, and the traffic behind cannot count on a pace that changes under its tyres.
  const joining = zones ? ringLaneOccupants(w, false) : lane;
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
      const leads = leadsOnRing(w, p.s, lane, veh.id, veh.lane);
      if (w.owesStop(veh)) busStop(w, veh, p.s, p.drive.speed ?? w.ringSpeed, leads, dt);
      let limit = zones ? speedLimitAt(w, p.s) : undefined;
      // The learner hesitates now and then: it brakes for nothing, and the traffic bunches up.
      if (isStalling(w, veh.id)) limit = Math.min(limit ?? w.ringSpeed, w.ringSpeed * w.config.learnerStallSpeed);
      // The oversize load crawls all the way round; the traffic behind it follows suit.
      if (veh.type === 'oversize') limit = Math.min(limit ?? w.ringSpeed, w.ringSpeed * w.config.oversizeSpeed);
      if (quarry !== null && leads[0]?.id === quarry && veh.isPlayerPolice) p.drive = pursue(w, p.drive, dt);
      else p.drive = drive(w, p.drive, leads, veh.id, dt, limit);
    } else if (p.kind === 'exiting') {
      const lead = leadOnExit(w, p.arm, p.s, veh.id, veh.lane);
      p.drive = drive(w, p.drive, lead ? [lead] : [], veh.id, dt);
    } else if (p.kind === 'merging') {
      paceMerge(w, p, joining, veh.id, veh.lane, dt);
    }
  }
}

/**
 * A school bus on its way to the stop: the stop is a standing lead ahead of it, so it brakes
 * like any driver and stands right at the sign. Once it has stood `busDwell` there, it pulls away.
 */
function busStop(w: World, veh: Vehicle, s: number, speed: number, leads: Lead[], dt: number): void {
  const stop = w.busStopS;
  if (stop === null) return;
  const ahead = w.layout.ringDistance(s, stop);
  const front = w.lengthOf(veh.type) / 2;
  if (ahead > w.layout.ring.length / 2) return;
  if (ahead - front <= w.config.stopGap + 2 && speed <= w.config.standingSpeed) {
    veh.dwell += dt;
    if (veh.dwell >= w.config.busDwell) veh.served = true;
  }
  if (veh.served) return;
  leads.unshift({ id: -1, gap: Math.max(0, ahead - front + w.config.stopGap), speed: 0, length: 0 });
  leads.sort((a, b) => a.gap - b.gap);
}

/** Traffic below this share of the ring's speed is a jam a merging car has to mind. */
const SLOW_TRAFFIC = 0.9;
/** A merging car plans its stop with this share of the hardest braking, and so keeps a margin. */
const MERGE_BRAKE_SHARE = 0.75;
/** A slowed merging car this close to the ring counts for the traffic behind it. */
const JOINING_REACH = 1.5;

/**
 * A car on its way in minds the ring where it joins (players' feedback, 30.09.2026): when the
 * traffic there is slow or stands, it brakes behind it instead of ploughing in at full speed.
 * On a flowing ring nothing changes, so the timing of a tap stays exactly what it was.
 */
function paceMerge(w: World, p: Merging, occupants: Occupant[], id: number, laneOf: number, dt: number): void {
  const c = w.config;
  const g = gravity(c);
  const nominal = w.mergeSpeed({ ...p, pace: 1 });
  const current = nominal * (p.pace ?? 1);
  const s = wrap(w.layout.entryS(p.arm, laneOf) - w.mergeRemaining(p, laneOf), w.layout.ring.length);
  let target = nominal;
  let queued = 0;
  for (const lead of leadsOnRing(w, s, occupants, id, laneOf)) {
    if (lead.speed < w.ringSpeed * SLOW_TRAFFIC) {
      const room = Math.max(0, lead.gap - queued - c.stopGap - c.followMargin * lead.speed);
      target = Math.min(target, Math.sqrt(lead.speed * lead.speed + 2 * c.driverBrake * g * MERGE_BRAKE_SHARE * room));
    }
    queued += lead.length + c.stopGap;
  }
  if (p.pace === undefined && target >= nominal) return;
  // Still at the line it simply pulls away more gently; once rolling it has to brake.
  const atLine = profileDistance(p.profile, p.elapsed) < c.carLength / 2;
  const braked = atLine ? target : Math.max(target, current - c.driverBrake * g * dt);
  const next = target < current ? braked : Math.min(target, current + c.driverAcceleration * g * dt);
  if (next >= nominal - 1e-9) {
    p.pace = undefined;
    p.braking = false;
    return;
  }
  p.pace = nominal > 1e-9 ? clamp(next / nominal, 0, 1) : 1;
  p.braking = next < current - 1e-9 || next <= c.standingSpeed;
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
function drive(w: World, current: Drive, leads: Lead[], id: number, dt: number, speedLimit?: number): Drive {
  const c = w.config;
  const d: Drive = { ...current, isPursuing: false };
  if (!isInFlow(current)) d.outOfFlowTime += dt;
  const g = gravity(c);
  const limit = speedLimit ?? w.ringSpeed;
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
  const cap = capsule(veh.position, veh.heading, w.lengthOf(veh.type), w.widthOf(veh.type));
  const forward = mul(normalize(sub(cap.b, cap.a)), cap.radius);
  return [sub(cap.a, forward), veh.position, add(cap.b, forward)];
}

/**
 * Ring cars, wrecks lying in the lane and cars just turning off, by ring distance. `foresight`: a
 * ring car counts with the speed a zone ahead is about to slow it to, so the traffic behind brakes in good time.
 */
function ringLaneOccupants(w: World, foresight: boolean): Occupant[] {
  const c = w.config;
  const circumference = w.layout.ring.length;
  const halfLane = c.laneWidth / 2 + c.carWidth / 2;
  const out: Occupant[] = [];
  for (const veh of w.vehicles) {
    const p = veh.phase;
    const lane = veh.lane;
    if (p.kind === 'ring') {
      const speed = p.drive.speed ?? w.ringSpeed;
      out.push({ id: veh.id, lane, s: p.s, speed: foresight ? plannedSpeed(w, p.s, speed) : speed, length: w.lengthOf(veh.type) });
    } else if (p.kind === 'merging' && (p.pace ?? 1) < 1 && w.mergeRemaining(p, lane) < c.carLength * JOINING_REACH) {
      // Held up by the jam right at the join: the ring traffic behind has to mind it too.
      const s = wrap(w.layout.entryS(p.arm, lane) - w.mergeRemaining(p, lane), circumference);
      out.push({ id: veh.id, lane, s, speed: w.mergeSpeed(p), length: w.lengthOf(veh.type) });
    } else if (p.kind === 'exiting' && p.s < c.carLength) {
      const s = wrap(w.layout.exitS(p.arm, lane) + p.s, circumference);
      out.push({ id: veh.id, lane, s, speed: p.drive.speed ?? w.ringSpeed, length: w.lengthOf(veh.type) });
    } else if (p.kind === 'crashed') {
      const points = wreckPoints(w, veh);
      // A wreck blocks every lane it reaches into.
      for (let l = 0; l < w.layout.lanes; l++) {
        const radius = w.layout.laneRadius(l);
        let nearest = points[0];
        for (const pt of points) {
          if (Math.abs(length(pt) - radius) < Math.abs(length(nearest) - radius)) nearest = pt;
        }
        if (Math.abs(length(nearest) - radius) - c.carWidth / 2 >= halfLane - c.carWidth / 2 + 1) continue;
        const angle = angleOf(nearest);
        const s = wrap(angle, TAU) * w.layout.ringRadius;
        const tangent = fromAngle(angle + Math.PI / 2);
        out.push({ id: veh.id, lane: l, s, speed: Math.max(0, dot(p.velocity, tangent)), length: w.lengthOf(veh.type) });
      }
    }
  }
  return out;
}

/** The nearest `count` things ahead in the ring lane, nearest first. */
function leadsOnRing(w: World, s: number, occupants: Occupant[], id: number, lane = 0, count = 3): Lead[] {
  const circumference = w.layout.ring.length;
  const ahead: Lead[] = [];
  for (const o of occupants) {
    if (o.id === id || o.lane !== lane) continue;
    const distance = w.layout.ringDistance(s, o.s);
    if (distance <= 0 || distance >= circumference / 2) continue;
    ahead.push({ id: o.id, gap: distance - o.length, speed: o.speed, length: o.length });
  }
  ahead.sort((a, b) => a.gap - b.gap || a.id - b.id);
  return ahead.slice(0, count);
}

/** Cars ahead on the same exit, and wrecks lying across it. */
function leadOnExit(w: World, arm: Arm, s: number, id: number, lane = 0): Lead | null {
  const c = w.config;
  const path = w.layout.exit(arm, lane);
  const halfLane = c.laneWidth / 2 + c.carWidth / 2;
  let nearest: Lead | null = null;
  const consider = (vid: number, gap: number, speed: number): void => {
    if (!nearest || gap < nearest.gap) nearest = { id: vid, gap, speed, length: c.carLength };
  };
  for (const veh of w.vehicles) {
    if (veh.id === id) continue;
    const p = veh.phase;
    if (p.kind === 'exiting' && p.arm.index === arm.index && veh.lane === lane && p.s > s) {
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
