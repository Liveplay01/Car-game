import type { Arm } from './roundabout';
import { Vehicle, type Waiting, mergeProfile } from './vehicle';
import { type Vec2, sub, dot, fromAngle } from './vec2';
import type { World } from './world';
import type { Lead } from './drivers';
import { isFreeForWarning } from './traffic';

// MARK: Criminal (ROADMAP.md M3)

export type CriminalPhase =
  | { kind: 'idle'; next: number }
  /** "WANTED": the pickup shows up at `arm` at `until`. */
  | { kind: 'warning'; arm: Arm; until: number }
  | { kind: 'arriving'; vehicle: number }
  /** On the road; it escapes at `deadline` and the shift is lost. */
  | { kind: 'active'; vehicle: number; deadline: number }
  | { kind: 'leaving'; vehicle: number };

export const reservedCriminalArm = (w: World): Arm | null => (w.criminal.kind === 'warning' ? w.criminal.arm : null);

export const isChased = (w: World, id: number): boolean => w.criminal.kind === 'active' && w.criminal.vehicle === id;

export function criminalTimeLeft(w: World): number | null {
  return w.criminal.kind === 'active' ? Math.max(0, w.criminal.deadline - w.time) : null;
}

function spawnSpecial(w: World, arm: Arm, type: 'pickup' | 'transporter'): Vehicle {
  const waiting: Waiting = { kind: 'waiting', arm, reaction: 0, approach: w.config.aiApproachDistance };
  const veh = new Vehicle(w.makeId(), type, 'ai', waiting, w.approachPose(waiting));
  w.vehicles.push(veh);
  return veh;
}

const armOccupied = (w: World, arm: Arm): boolean =>
  w.vehicles.some((x) => x.phase.kind === 'waiting' && x.phase.arm.index === arm.index);

export function updateCriminals(w: World, now: number): void {
  const c = w.config;
  if (!w.isScoring) {
    if (w.criminal.kind === 'active') w.criminal = { kind: 'leaving', vehicle: w.criminal.vehicle };
    return;
  }
  if (w.shift.startedAt === null) return;
  // Your last car is in: the criminal gets away with it, one only announced is called off.
  if (!w.shift.acceptsTaps) {
    const cr = w.criminal;
    if (cr.kind === 'warning') w.criminal = { kind: 'idle', next: Infinity };
    else if (cr.kind === 'arriving') {
      w.criminal = { kind: 'idle', next: Infinity };
      const veh = w.vehicle(cr.vehicle);
      if (veh) veh.type = 'car';
    } else if (cr.kind === 'active') w.criminal = { kind: 'leaving', vehicle: cr.vehicle };
  }
  const cr = w.criminal;
  switch (cr.kind) {
    case 'idle': {
      if (!w.shift.acceptsTaps || now < cr.next) return;
      const candidates = w.layout.aiArms.filter((arm) => isFreeForWarning(w, arm));
      if (candidates.length === 0) return;
      const arm = w.criminalRng.pick(candidates);
      w.criminal = { kind: 'warning', arm, until: now + c.criminalWarning };
      w.events.push({ type: 'criminalWarning', arm });
      return;
    }
    case 'warning': {
      if (now < cr.until || armOccupied(w, cr.arm)) return;
      const pickup = spawnSpecial(w, cr.arm, 'pickup');
      w.criminal = { kind: 'arriving', vehicle: pickup.id };
      return;
    }
    case 'arriving': {
      const pickup = w.vehicle(cr.vehicle);
      if (!pickup || pickup.isCrashed) {
        w.criminal = { kind: 'idle', next: now + w.criminalRng.range(c.criminalInterval.lo, c.criminalInterval.hi) };
        return;
      }
      if (pickup.phase.kind === 'merging') {
        const deadline = now + c.criminalTime;
        w.criminal = { kind: 'active', vehicle: cr.vehicle, deadline };
        w.events.push({ type: 'criminalEntered', vehicle: cr.vehicle, deadline });
      }
      return;
    }
    case 'active': {
      if (now < cr.deadline) return;
      w.criminal = { kind: 'leaving', vehicle: cr.vehicle };
      w.events.push({ type: 'criminalEscaped', vehicle: cr.vehicle });
      w.chargeEscape();
      w.endShift('escaped', now);
      return;
    }
    case 'leaving':
      return;
  }
}

/** A police car stopped the criminal: points, and the next one comes later. */
export function criminalCaught(w: World, criminalId: number, policeId: number, point: Vec2, now: number): void {
  const points = w.isScoring ? w.scoreTakedown() : 0;
  const c = w.config;
  w.criminal = { kind: 'idle', next: now + w.criminalRng.range(c.criminalInterval.lo, c.criminalInterval.hi) };
  w.events.push({ type: 'takedown', criminal: criminalId, police: policeId, point, points });
}

/** Wrecked without a takedown: the chase ends without points. */
export function criminalWrecked(w: World, criminalId: number, point: Vec2, now: number): void {
  const cr = w.criminal;
  const id = cr.kind === 'arriving' || cr.kind === 'active' || cr.kind === 'leaving' ? cr.vehicle : null;
  if (id !== criminalId) return;
  const c = w.config;
  w.criminal = { kind: 'idle', next: now + w.criminalRng.range(c.criminalInterval.lo, c.criminalInterval.hi) };
  w.events.push({ type: 'criminalWrecked', vehicle: criminalId, point });
}

/**
 * The criminal drove into the police car, not the other way round: its front hit, the police
 * car's did not. Then it is no takedown: the police car bounces off the heavy pickup.
 */
export function criminalRanInto(w: World, a: Vehicle, b: Vehicle, point: Vec2): boolean {
  const [criminal, police] = a.type === 'pickup' ? [a, b] : [b, a];
  const front = (veh: Vehicle): boolean => dot(sub(point, veh.position), fromAngle(veh.heading)) > w.lengthOf(veh.type) * 0.25;
  return front(criminal) && !front(police);
}

// MARK: Money transporter (ROADMAP.md M4)

export type TransporterPhase =
  | { kind: 'idle'; next: number }
  | { kind: 'warning'; arm: Arm; until: number }
  | { kind: 'arriving'; vehicle: number }
  | { kind: 'active'; vehicle: number; deadline: number }
  | { kind: 'seized'; vehicle: number }
  | { kind: 'leaving'; vehicle: number };

export const reservedTransporterArm = (w: World): Arm | null => (w.transporter.kind === 'warning' ? w.transporter.arm : null);

export const isTransported = (w: World, id: number): boolean => w.transporter.kind === 'active' && w.transporter.vehicle === id;

export function updateTransporters(w: World, now: number): void {
  const c = w.config;
  if (!w.isScoring) {
    if (w.transporter.kind === 'active') w.transporter = { kind: 'leaving', vehicle: w.transporter.vehicle };
    return;
  }
  if (w.shift.startedAt === null) return;
  if (!w.shift.acceptsTaps) {
    const t = w.transporter;
    if (t.kind === 'warning') w.transporter = { kind: 'idle', next: Infinity };
    else if (t.kind === 'arriving') {
      w.transporter = { kind: 'idle', next: Infinity };
      const veh = w.vehicle(t.vehicle);
      if (veh) veh.type = 'car';
    }
  }
  const t = w.transporter;
  switch (t.kind) {
    case 'idle': {
      if (!w.shift.acceptsTaps || now < t.next) return;
      const candidates = w.layout.aiArms.filter((arm) => isFreeForWarning(w, arm));
      if (candidates.length === 0) return;
      const arm = w.transporterRng.pick(candidates);
      w.transporter = { kind: 'warning', arm, until: now + c.transporterWarning };
      w.events.push({ type: 'transporterWarning', arm });
      return;
    }
    case 'warning': {
      if (now < t.until || armOccupied(w, t.arm)) return;
      const truck = spawnSpecial(w, t.arm, 'transporter');
      w.transporter = { kind: 'arriving', vehicle: truck.id };
      return;
    }
    case 'arriving': {
      const truck = w.vehicle(t.vehicle);
      if (!truck || truck.isCrashed) {
        w.transporter = { kind: 'idle', next: now + w.transporterRng.range(c.transporterInterval.lo, c.transporterInterval.hi) };
        return;
      }
      if (truck.phase.kind === 'merging') {
        const deadline = now + c.transporterTime;
        w.transporter = { kind: 'active', vehicle: t.vehicle, deadline };
        w.events.push({ type: 'transporterEntered', vehicle: t.vehicle, deadline });
      }
      return;
    }
    case 'active':
      if (now >= t.deadline) transporterEscapes(w, t.vehicle, now);
      return;
    default:
      return;
  }
}

export function transporterEscapes(w: World, id: number, now: number): void {
  w.transporter = { kind: 'leaving', vehicle: id };
  scoreTransporter(w, now, true, id);
}

export function transporterWrecked(w: World, truckId: number, point: Vec2, now: number): void {
  const t = w.transporter;
  if ((t.kind === 'arriving' || t.kind === 'active') && t.vehicle === truckId) {
    const c = w.config;
    w.transporter = { kind: 'idle', next: now + w.transporterRng.range(c.transporterInterval.lo, c.transporterInterval.hi) };
    w.events.push({ type: 'transporterLost', vehicle: truckId, point });
  }
}

/** A police car rammed it: seized, no money, but no penalty either. */
export function transporterSeized(w: World, truckId: number, point: Vec2, now: number): void {
  w.transporter = { kind: 'seized', vehicle: truckId };
  w.events.push({ type: 'transporterSeized', vehicle: truckId, point });
  scoreTransporter(w, now, false, truckId);
}

function scoreTransporter(w: World, now: number, escaped: boolean, id: number): void {
  const c = w.config;
  if (!w.isScoring) return;
  const amount = escaped ? Math.round(c.transporterPay * (w.isRushHourScoring ? c.rushHourScoreFactor : 1)) : 0;
  w.score.money += amount;
  if (escaped) {
    w.score.transporters++;
    w.setChain(w.score.chain + 1);
  }
  w.events.push({ type: 'transporterPaid', vehicle: id, amount, escaped });
  const doubleRun = escaped && c.doubleRunChance > 0 && w.transporterRng.unit() < c.doubleRunChance;
  const pause = doubleRun ? c.doubleRunDelay : c.transporterInterval;
  w.transporter = { kind: 'idle', next: now + w.transporterRng.range(pause.lo, pause.hi) };
}

/** The secure zone around an active transporter on the ring, as ring start + arc. */
export function secureZone(w: World): { s: number; arc: number } | null {
  if (w.transporter.kind !== 'active') return null;
  const truck = w.vehicle(w.transporter.vehicle);
  if (!truck || truck.phase.kind !== 'ring') return null;
  const half = w.config.transporterSecureArc / 2;
  const circumference = w.layout.ring.length;
  return { s: (((truck.phase.s - half) % circumference) + circumference) % circumference, arc: w.config.transporterSecureArc };
}

export function isInSecureZone(w: World, s: number): boolean {
  const zone = secureZone(w);
  return zone !== null && w.layout.ringDistance(zone.s, s) <= zone.arc;
}

/** The criminal and the transporter keep apart when they join. */
export function joinsTooClose(w: World, veh: Vehicle, arm: Arm): boolean {
  const otherType = veh.type === 'pickup' ? 'transporter' : veh.type === 'transporter' ? 'pickup' : null;
  if (!otherType) return false;
  const profile = mergeProfile(w.layout.entry(arm).length, w.config.mergeDuration, w.ringSpeed);
  const arrival = w.layout.entryRingS[arm.index];
  const apart = w.config.transporterSecureArc / 2 + w.config.carLength * 2;
  return w.vehicles.some((other) => {
    if (other.type !== otherType || other.isCrashed) return false;
    const s = w.virtualRingPosition(other, profile.duration);
    if (s === null) return false;
    const ahead = w.layout.ringDistance(arrival, s);
    return Math.min(ahead, w.layout.ring.length - ahead) < apart;
  });
}

/** The criminal keeps out of the transporter's secure zone: it brakes for that and nothing else. */
export function transporterAhead(w: World, s: number): Lead | null {
  for (const veh of w.vehicles) {
    if (veh.type !== 'transporter' || veh.isCrashed || veh.phase.kind !== 'ring') continue;
    const ahead = w.layout.ringDistance(s, veh.phase.s);
    if (ahead >= w.layout.ring.length / 2) continue;
    const gap = ahead - w.config.carLength - w.config.transporterSecureArc / 2;
    return { id: veh.id, gap, speed: veh.phase.drive.speed ?? w.ringSpeed, length: w.config.carLength };
  }
  return null;
}
