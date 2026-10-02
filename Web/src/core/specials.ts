import type { Arm } from './roundabout';
import { Vehicle, type Waiting, mergeProfile } from './vehicle';
import { type Vec2, sub, dot, fromAngle, wrap } from './vec2';
import type { World } from './world';
import type { Lead } from './drivers';
import { isFreeForWarning } from './traffic';
import { joinsMilitaryZone } from './explosions';

// MARK: Criminal (Spiel.md)

export type CriminalPhase =
  | { kind: 'idle'; next: number }
  | { kind: 'warning'; arm: Arm; until: number; boss: boolean }
  | { kind: 'arriving'; vehicle: number }
  | { kind: 'active'; vehicle: number; deadline: number }
  | { kind: 'leaving'; vehicle: number };

/**
 * On a boss level the first criminal of the shift is the syndicate's head, until it is taken
 * down: a boss with armoured escorts that join the ring right behind it. A police car has to be
 * timed into the gap between the boss and its escorts; hitting an escort is a plain crash.
 */
export const bossDue = (w: World): boolean => w.config.convoy && !w.score.bossBusted;

/** The boss on the road right now, if there is one. */
export function bossVehicle(w: World): number | null {
  const id = criminalVehicle(w);
  return id !== null && w.vehicle(id)?.role === 'boss' ? id : null;
}

export const reservedCriminalArm = (w: World): Arm | null => (w.criminal.kind === 'warning' ? w.criminal.arm : null);

export const isChased = (w: World, id: number): boolean => w.criminal.kind === 'active' && w.criminal.vehicle === id;

export function criminalVehicle(w: World): number | null {
  const c = w.criminal;
  return c.kind === 'arriving' || c.kind === 'active' || c.kind === 'leaving' ? c.vehicle : null;
}

export function criminalTimeLeft(w: World, time = w.time): number | null {
  return w.criminal.kind === 'active' ? Math.max(0, w.criminal.deadline - time) : null;
}

function spawnSpecial(w: World, arm: Arm, type: 'pickup' | 'transporter' | 'van'): Vehicle {
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
  if (!w.shift.acceptsTaps) {
    const cr = w.criminal;
    if (cr.kind === 'warning') w.criminal = { kind: 'idle', next: Infinity };
    else if (cr.kind === 'arriving') {
      w.criminal = { kind: 'idle', next: Infinity };
      w.demoteToOrdinaryTraffic(cr.vehicle);
    } else if (cr.kind === 'active') w.criminal = { kind: 'leaving', vehicle: cr.vehicle };
  }
  const cr = w.criminal;
  switch (cr.kind) {
    case 'idle': {
      if (!w.shift.acceptsTaps || now < cr.next) return;
      const candidates = w.openAIArms.filter((arm) => isFreeForWarning(w, arm));
      if (candidates.length === 0) return;
      const arm = w.criminalRng.pick(candidates);
      const boss = bossDue(w);
      w.criminal = { kind: 'warning', arm, until: now + (boss ? c.convoyWarning : c.criminalWarning), boss };
      w.events.push({ type: 'criminalWarning', arm, time: now, boss });
      return;
    }
    case 'warning': {
      if (now < cr.until || armOccupied(w, cr.arm)) return;
      const pickup = spawnSpecial(w, cr.arm, 'pickup');
      if (cr.boss) {
        pickup.role = 'boss';
        pickup.armour = c.bossArmour;
        w.escortsDue = c.convoyEscorts > 0 ? { arm: cr.arm, left: c.convoyEscorts } : null;
      }
      w.criminal = { kind: 'arriving', vehicle: pickup.id };
      return;
    }
    case 'arriving': {
      const pickup = w.vehicle(cr.vehicle);
      if (!pickup) {
        w.criminal = { kind: 'idle', next: now + w.criminalRng.range(c.criminalInterval.lo, c.criminalInterval.hi) };
        return;
      }
      if (pickup.phase.kind === 'merging') {
        const boss = pickup.role === 'boss';
        const deadline = now + c.criminalTime * (boss ? c.convoyTimeFactor : 1);
        w.criminal = { kind: 'active', vehicle: cr.vehicle, deadline };
        w.events.push({ type: 'criminalEntered', vehicle: cr.vehicle, deadline, boss });
      }
      return;
    }
    case 'active': {
      if (now < cr.deadline) return;
      w.criminal = { kind: 'leaving', vehicle: cr.vehicle };
      w.events.push({ type: 'criminalEscaped', vehicle: cr.vehicle, time: now });
      w.chargeEscape();
      w.endShift('escaped', now);
      return;
    }
    case 'leaving':
      return;
  }
}

export function criminalCaught(w: World, criminalId: number, policeId: number, point: Vec2, now: number): void {
  const timeLeft = criminalTimeLeft(w, now) ?? 0;
  const points = w.isScoring ? w.scoreTakedown(now) : 0;
  const c = w.config;
  w.criminal = { kind: 'idle', next: now + w.criminalRng.range(c.criminalInterval.lo, c.criminalInterval.hi) };
  w.events.push({ type: 'takedown', criminal: criminalId, police: policeId, point, time: now, points, timeLeft });
  if (w.vehicle(criminalId)?.role === 'boss' && w.isScoring) {
    w.score.bossesCaught++;
    // The twins: the second one is on its way at once; the heist comes back with the last one.
    if (w.score.bossesCaught < c.bossCount) {
      w.criminal = { kind: 'idle', next: now + w.criminalRng.range(c.twinsGap.lo, c.twinsGap.hi) };
      return;
    }
    const amount = c.heistRecoveryBase + c.heistRecoveryPerLevel * c.level;
    w.score.money += amount;
    w.score.bossBusted = true;
    w.escortsDue = null;
    w.events.push({ type: 'heistRecovered', vehicle: criminalId, point, time: now, amount });
  }
}

/** The escorts join from the boss's arm, one after the other, right behind it. */
export function updateEscorts(w: World): void {
  const due = w.escortsDue;
  if (!due || due.left <= 0) {
    w.escortsDue = null;
    return;
  }
  if (!w.shift.acceptsTaps) {
    w.escortsDue = null;
    return;
  }
  if (armOccupied(w, due.arm)) return;
  const escort = spawnSpecial(w, due.arm, 'van');
  escort.role = 'escort';
  const waiting = escort.phase as Waiting;
  // They follow the boss closely: no dawdling at the line.
  escort.phase = { ...waiting, approach: 0 };
  escort.place(w.approachPose(escort.phase as Waiting));
  due.left--;
}

export function criminalWrecked(w: World, criminalId: number, point: Vec2, now: number): void {
  if (criminalVehicle(w) !== criminalId) return;
  const c = w.config;
  w.criminal = { kind: 'idle', next: now + w.criminalRng.range(c.criminalInterval.lo, c.criminalInterval.hi) };
  w.events.push({ type: 'criminalWrecked', vehicle: criminalId, point, time: now });
}

/** The criminal drove into the police car: its front hit, the police car's did not. */
export function criminalRanInto(w: World, a: Vehicle, b: Vehicle, point: Vec2): boolean {
  const [criminal, police] = a.type === 'pickup' ? [a, b] : [b, a];
  const front = (veh: Vehicle): boolean => dot(sub(point, veh.position), fromAngle(veh.heading)) > w.lengthOf(veh.type) * 0.25;
  return front(criminal) && !front(police);
}

// MARK: Money transporter (Spiel.md)

export type TransporterPhase =
  | { kind: 'idle'; next: number }
  | { kind: 'warning'; arm: Arm; until: number }
  | { kind: 'arriving'; vehicle: number }
  | { kind: 'active'; vehicle: number; deadline: number }
  | { kind: 'seized'; vehicle: number }
  | { kind: 'leaving'; vehicle: number };

export const reservedTransporterArm = (w: World): Arm | null => (w.transporter.kind === 'warning' ? w.transporter.arm : null);

export const isTransported = (w: World, id: number): boolean => w.transporter.kind === 'active' && w.transporter.vehicle === id;

export function transporterVehicle(w: World): number | null {
  const t = w.transporter;
  return t.kind === 'arriving' || t.kind === 'active' || t.kind === 'seized' || t.kind === 'leaving' ? t.vehicle : null;
}

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
      w.demoteToOrdinaryTraffic(t.vehicle);
    }
  }
  const t = w.transporter;
  switch (t.kind) {
    case 'idle': {
      if (!w.shift.acceptsTaps || now < t.next) return;
      const candidates = w.openAIArms.filter((arm) => isFreeForWarning(w, arm));
      if (candidates.length === 0) return;
      const arm = w.transporterRng.pick(candidates);
      w.transporter = { kind: 'warning', arm, until: now + c.transporterWarning };
      w.jackpotDue = c.jackpotChance > 0 && w.luckRng.unit() < c.jackpotChance;
      w.events.push({ type: 'transporterWarning', arm, time: now, jackpot: w.jackpotDue });
      return;
    }
    case 'warning': {
      if (now < t.until || armOccupied(w, t.arm)) return;
      const truck = spawnSpecial(w, t.arm, 'transporter');
      w.transporter = { kind: 'arriving', vehicle: truck.id };
      w.jackpotVehicle = w.jackpotDue ? truck.id : null;
      w.jackpotDue = false;
      return;
    }
    case 'arriving': {
      const truck = w.vehicle(t.vehicle);
      if (!truck) {
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
  w.events.push({ type: 'transporterEscaped', vehicle: id, time: now });
  scoreTransporter(w, now);
}

export function transporterWrecked(w: World, truckId: number, point: Vec2, now: number): void {
  const t = w.transporter;
  if ((t.kind === 'arriving' || t.kind === 'active') && t.vehicle === truckId) {
    const c = w.config;
    w.transporter = { kind: 'idle', next: now + w.transporterRng.range(c.transporterInterval.lo, c.transporterInterval.hi) };
    w.events.push({ type: 'transporterLost', vehicle: truckId, point, time: now });
  }
}

export function transporterSeized(w: World, truckId: number, policeId: number, point: Vec2, now: number): void {
  w.transporter = { kind: 'seized', vehicle: truckId };
  w.events.push({ type: 'transporterSeized', vehicle: truckId, police: policeId, point, time: now });
  scoreTransporter(w, now);
}

function scoreTransporter(w: World, now: number): void {
  const c = w.config;
  if (!w.isScoring) return;
  const escaped = w.transporter.kind === 'leaving';
  const vehicle = transporterVehicle(w);
  // A Jackpot pays several times over, but only when it got through.
  const jackpot = escaped && vehicle !== null && vehicle === w.jackpotVehicle;
  const money = escaped ? c.transporterPay * (jackpot ? Math.max(1, c.jackpotFactor) : 1) : c.transporterSeized;
  const amount = Math.round(money * (w.isRushHourScoring ? c.rushHourScoreFactor : 1));
  w.score.money += amount;
  if (escaped) {
    w.score.transporters++;
    if (jackpot) w.score.jackpots++;
    w.setChain(w.score.chain + 1, now);
  }
  w.events.push({ type: 'transporterPaid', vehicle, amount, time: now, jackpot });
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
  return { s: wrap(truck.phase.s - half, w.layout.ring.length), arc: w.config.transporterSecureArc };
}

export function isInSecureZone(w: World, s: number): boolean {
  const zone = secureZone(w);
  return zone !== null && w.layout.ringDistance(zone.s, s) <= zone.arc;
}

/** The criminal and the transporter keep apart when they join; the truck keeps its zone clear. */
export function joinsTooClose(w: World, veh: Vehicle, arm: Arm): boolean {
  if (joinsMilitaryZone(w, veh, arm)) return true;
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

export function transporterAhead(w: World, s: number): Lead | null {
  for (const veh of w.vehicles) {
    if (veh.type !== 'transporter' || veh.isCrashed || veh.phase.kind !== 'ring') continue;
    const ahead = w.layout.ringDistance(s, veh.phase.s);
    if (ahead >= w.layout.ring.length / 2) continue;
    const gapValue = ahead - w.config.carLength - w.config.transporterSecureArc / 2;
    return { id: veh.id, gap: gapValue, speed: veh.phase.drive.speed ?? w.ringSpeed, length: w.config.carLength };
  }
  return null;
}
