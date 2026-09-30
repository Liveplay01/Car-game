import type { Arm } from './roundabout';
import { Vehicle, type Waiting, type VehicleType, mergeProfile, isEmergency } from './vehicle';
import type { World } from './world';
import { isFreeForWarning } from './traffic';

/**
 * The ambulance (Leo, 28.09.2026): now and then one comes in, announced like every special, and
 * takes the long way once round the ring. The stretch of ring right ahead of it has to stay
 * clear: a car that joins there spoils the run (combo and chain are gone). An ambulance that
 * leaves with a clear road pays a bonus and extends the chain. It never makes a crash itself.
 */
export type AmbulancePhase =
  | { kind: 'idle'; next: number }
  | { kind: 'warning'; arm: Arm; until: number; fire: boolean }
  | { kind: 'arriving'; vehicle: number }
  | { kind: 'active'; vehicle: number; blocked: boolean }
  | { kind: 'done' };

/** Whether a shift of this config sees an ambulance at all, and when it is first due. */
export function firstAmbulance(w: World): AmbulancePhase {
  const c = w.config;
  const comes = !c.mayhem && !w.isVersus && c.level >= c.ambulanceLevel && w.ambulanceRng.unit() < c.ambulanceChance;
  return comes ? { kind: 'idle', next: w.ambulanceRng.range(c.ambulanceFirst.lo, c.ambulanceFirst.hi) } : { kind: 'done' };
}

/**
 * From `fireTruckLevel` on, some runs are a fire engine (Leo, 30.09.2026). Its own stream, drawn
 * only from that level on, so the shifts below it keep their traffic.
 */
function isFireRun(w: World): boolean {
  const c = w.config;
  return c.level >= c.fireTruckLevel && w.fireRng.unit() < c.fireTruckShare;
}

/** The road an emergency vehicle needs clear ahead of it. */
export const clearArc = (w: World, type: VehicleType): number =>
  (type === 'fireTruck' ? w.config.fireTruckClearArc : w.config.ambulanceClearArc) + w.lengthOf(type) / 2;

export const reservedAmbulanceArm = (w: World): Arm | null => (w.ambulance.kind === 'warning' ? w.ambulance.arm : null);

export function ambulanceVehicle(w: World): number | null {
  const a = w.ambulance;
  return a.kind === 'arriving' || a.kind === 'active' ? a.vehicle : null;
}

/** The ambulance's run takes it round the ring the long way: out at the last arm before its own. */
export function longestExit(w: World, arm: Arm): Arm {
  const n = w.layout.arms.length;
  for (let k = n - 1; k >= 1; k--) {
    const exit = w.layout.advance(arm, k);
    if (exit.index !== 0) return exit;
  }
  return w.layout.advance(arm, 1);
}

export function updateAmbulance(w: World, now: number): void {
  const c = w.config;
  const a = w.ambulance;
  if (!w.isScoring) {
    if (a.kind !== 'done' && a.kind !== 'idle') w.ambulance = { kind: 'done' };
    return;
  }
  if (w.shift.startedAt === null) return;
  if (!w.shift.acceptsTaps) {
    if (a.kind === 'idle' || a.kind === 'warning') {
      w.ambulance = { kind: 'done' };
      return;
    }
    if (a.kind === 'arriving') {
      const veh = w.vehicle(a.vehicle);
      if (veh && veh.phase.kind === 'waiting') {
        w.demoteToOrdinaryTraffic(a.vehicle, veh.type === 'fireTruck' ? 'truck' : 'van');
        w.ambulance = { kind: 'done' };
        return;
      }
    }
  }
  switch (a.kind) {
    case 'idle': {
      if (now < a.next) return;
      const candidates = w.openAIArms.filter((arm) => isFreeForWarning(w, arm));
      if (candidates.length === 0) return;
      const arm = w.ambulanceRng.pick(candidates);
      const fire = isFireRun(w);
      w.ambulance = { kind: 'warning', arm, until: now + c.ambulanceWarning, fire };
      w.events.push({ type: 'ambulanceWarning', arm, time: now, fire });
      return;
    }
    case 'warning': {
      const occupied = w.vehicles.some((x) => x.phase.kind === 'waiting' && x.phase.arm.index === a.arm.index);
      if (now < a.until || occupied) return;
      // It comes in fast from close by: the warning has already shown where.
      const waiting: Waiting = { kind: 'waiting', arm: a.arm, reaction: 0, approach: c.aiApproachDistance * 0.4 };
      const veh = new Vehicle(w.makeId(), a.fire ? 'fireTruck' : 'ambulance', 'ai', waiting, w.approachPose(waiting));
      w.vehicles.push(veh);
      w.ambulance = { kind: 'arriving', vehicle: veh.id };
      return;
    }
    case 'arriving': {
      const veh = w.vehicle(a.vehicle);
      if (!veh || veh.isCrashed || !isEmergency(veh.type)) {
        w.ambulance = { kind: 'done' };
        return;
      }
      if (veh.phase.kind === 'ring') {
        w.ambulance = { kind: 'active', vehicle: veh.id, blocked: false };
        w.events.push({ type: 'ambulanceEntered', vehicle: veh.id });
      }
      return;
    }
    case 'active': {
      const veh = w.vehicle(a.vehicle);
      if (!veh) {
        w.ambulance = { kind: 'done' };
        return;
      }
      if (veh.isCrashed) {
        w.ambulance = { kind: 'done' };
        w.events.push({ type: 'ambulanceLost', vehicle: veh.id, point: veh.position, time: now });
        return;
      }
      if (veh.phase.kind === 'exiting') ambulanceThrough(w, now);
      return;
    }
    case 'done':
      return;
  }
}

/**
 * The run is over: out of the ring, or the shift is complete while it is still on its way (like
 * the transporter, it counts as through then). A clear road pays and extends the chain.
 */
export function ambulanceThrough(w: World, now: number): void {
  const a = w.ambulance;
  if (a.kind !== 'active') return;
  w.ambulance = { kind: 'done' };
  const veh = w.vehicle(a.vehicle);
  if (a.blocked || !veh || veh.isCrashed) return;
  const c = w.config;
  const pay = veh.type === 'fireTruck' ? c.fireTruckPay : c.ambulancePay;
  const amount = Math.round(pay * (w.isRushHourScoring ? c.rushHourScoreFactor : 1));
  w.score.money += amount;
  w.score.ambulances++;
  w.setChain(w.score.chain + 1, now);
  w.events.push({ type: 'ambulanceCleared', vehicle: veh.id, amount, point: veh.position, time: now });
}

/** Where the clear road lies: from the ambulance's ring position this far ahead. */
export function clearZone(w: World): { s: number; arc: number } | null {
  const a = w.ambulance;
  if (a.kind !== 'active' || a.blocked) return null;
  const veh = w.vehicle(a.vehicle);
  if (!veh || veh.phase.kind !== 'ring') return null;
  return { s: veh.phase.s, arc: clearArc(w, veh.type) };
}

/** Whether a car at ring position `s` stands on the ambulance's clear road. */
export function isOnClearRoad(w: World, s: number): boolean {
  const zone = clearZone(w);
  if (!zone) return false;
  const ahead = w.layout.ringDistance(zone.s, s);
  return ahead > 0 && ahead <= zone.arc;
}

/** A player's car joined on the clear road: the run is spoilt. */
export function noteMergeNearAmbulance(w: World, veh: Vehicle, s: number, now: number): void {
  const a = w.ambulance;
  if (a.kind !== 'active' || a.blocked || !isOnClearRoad(w, s) || veh.lane !== w.vehicle(a.vehicle)?.lane) return;
  a.blocked = true;
  w.setCombo(0);
  w.setChain(0, now);
  w.events.push({ type: 'ambulanceBlocked', vehicle: a.vehicle, blocker: veh.id, point: veh.position, time: now });
}

/** The AI keeps the clear road free too: it does not join where the ambulance is about to pass. */
export function joinsClearRoad(w: World, veh: Vehicle, arm: Arm): boolean {
  if (isEmergency(veh.type)) return false;
  const a = w.ambulance;
  if (a.kind !== 'active' && a.kind !== 'arriving') return false;
  const amb = w.vehicle(a.vehicle);
  if (!amb || amb.isCrashed) return false;
  const profile = mergeProfile(w.layout.entry(arm).length, w.config.mergeDuration, w.ringSpeed);
  const ambS = w.virtualRingPosition(amb, profile.duration);
  if (ambS === null) return false;
  const arrival = w.layout.entryRingS[arm.index];
  const ahead = w.layout.ringDistance(ambS, arrival);
  const reach = clearArc(w, amb.type) + w.config.carLength;
  return ahead <= reach;
}
