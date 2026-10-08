import type { Arm } from './roundabout';
import { Vehicle, type Waiting } from './vehicle';
import type { World } from './world';
import { isFreeForWarning } from './traffic';
import { weddingOn } from './wedding';

/**
 * The learner driver (Leo, 30.09.2026): a driving-school car, announced like every special,
 * goes once round the ring and hesitates now and then: it brakes for no reason, and the
 * traffic behind it bunches up. Keep your cars off the stretch around it (ahead and behind)
 * while it is on the ring, and it pays a bonus and extends the chain when it leaves. Joining
 * near it costs nothing but that bonus: the patience is what pays.
 */
export type LearnerPhase =
  | { kind: 'idle'; next: number }
  | { kind: 'warning'; arm: Arm; until: number }
  | { kind: 'arriving'; vehicle: number }
  | { kind: 'active'; vehicle: number; spoilt: boolean; stallAt: number; stallUntil: number }
  | { kind: 'done' };

/** Whether a shift of this config sees a learner at all, and when it is first due. */
export function firstLearner(w: World): LearnerPhase {
  const c = w.config;
  if (c.mayhem || w.isVersus || c.level < c.learnerLevel || c.learnerChance <= 0) return { kind: 'done' };
  const comes = w.learnerRng.unit() < c.learnerChance;
  return comes ? { kind: 'idle', next: w.learnerRng.range(c.learnerFirst.lo, c.learnerFirst.hi) } : { kind: 'done' };
}

export const reservedLearnerArm = (w: World): Arm | null => (w.learner.kind === 'warning' ? w.learner.arm : null);

/** The learner is hesitating right now: it brakes down to `learnerStallSpeed`. */
export function isStalling(w: World, id: number, now = w.time): boolean {
  const l = w.learner;
  return l.kind === 'active' && l.vehicle === id && now >= l.stallAt && now < l.stallUntil;
}

export function updateLearner(w: World, now: number): void {
  const c = w.config;
  const l = w.learner;
  if (!w.isScoring) {
    if (l.kind !== 'done' && l.kind !== 'idle') w.learner = { kind: 'done' };
    return;
  }
  if (w.shift.startedAt === null) return;
  if (!w.shift.acceptsTaps) {
    if (l.kind === 'idle' || l.kind === 'warning') {
      w.learner = { kind: 'done' };
      return;
    }
    if (l.kind === 'arriving') {
      const veh = w.vehicle(l.vehicle);
      if (veh && veh.phase.kind === 'waiting') {
        w.demoteToOrdinaryTraffic(l.vehicle, 'compact');
        w.learner = { kind: 'done' };
        return;
      }
    }
  }
  switch (l.kind) {
    case 'idle': {
      if (now < l.next || weddingOn(w)) return;
      const candidates = w.openAIArms.filter((arm) => isFreeForWarning(w, arm));
      if (candidates.length === 0) return;
      const arm = w.learnerRng.pick(candidates);
      w.learner = { kind: 'warning', arm, until: now + c.learnerWarning };
      w.events.push({ type: 'learnerWarning', arm, time: now });
      return;
    }
    case 'warning': {
      const occupied = w.vehicles.some((x) => x.phase.kind === 'waiting' && x.phase.arm.index === l.arm.index);
      if (now < l.until || occupied) return;
      const waiting: Waiting = { kind: 'waiting', arm: l.arm, reaction: 0.4, approach: c.aiApproachDistance };
      const veh = new Vehicle(w.makeId(), 'learner', 'ai', waiting, w.approachPose(waiting));
      w.vehicles.push(veh);
      w.learner = { kind: 'arriving', vehicle: veh.id };
      return;
    }
    case 'arriving': {
      const veh = w.vehicle(l.vehicle);
      if (!veh || veh.isCrashed || veh.type !== 'learner') {
        w.learner = { kind: 'done' };
        return;
      }
      if (veh.phase.kind === 'ring') {
        const stallAt = now + w.learnerRng.range(c.learnerStallEvery.lo, c.learnerStallEvery.hi) * 0.5;
        w.learner = { kind: 'active', vehicle: veh.id, spoilt: false, stallAt, stallUntil: stallAt + w.learnerRng.range(c.learnerStallTime.lo, c.learnerStallTime.hi) };
        w.events.push({ type: 'learnerEntered', vehicle: veh.id });
      }
      return;
    }
    case 'active': {
      const veh = w.vehicle(l.vehicle);
      if (!veh) {
        w.learner = { kind: 'done' };
        return;
      }
      if (veh.isCrashed) {
        w.learner = { kind: 'done' };
        return;
      }
      if (veh.phase.kind === 'exiting') {
        learnerThrough(w, now);
        return;
      }
      // The next moment of doubt, once this one is over.
      if (now >= l.stallUntil) {
        l.stallAt = now + w.learnerRng.range(c.learnerStallEvery.lo, c.learnerStallEvery.hi);
        l.stallUntil = l.stallAt + w.learnerRng.range(c.learnerStallTime.lo, c.learnerStallTime.hi);
      }
      return;
    }
    case 'done':
      return;
  }
}

/** The learner left the ring (or the shift is complete): kept clear, it pays and extends the chain. */
export function learnerThrough(w: World, now: number): void {
  const l = w.learner;
  if (l.kind !== 'active') return;
  w.learner = { kind: 'done' };
  const veh = w.vehicle(l.vehicle);
  if (l.spoilt || !veh || veh.isCrashed) return;
  const c = w.config;
  const amount = Math.round(c.learnerPay * (w.isRushHourScoring ? c.rushHourScoreFactor : 1));
  w.score.money += amount;
  w.setChain(w.score.chain + 1, now);
  w.events.push({ type: 'learnerPassed', vehicle: veh.id, amount, point: veh.position, time: now });
}

/** Where the learner's space lies on the ring: its position, and how far ahead and behind. */
export function learnerZone(w: World): { s: number; arc: number } | null {
  const l = w.learner;
  if (l.kind !== 'active' || l.spoilt) return null;
  const veh = w.vehicle(l.vehicle);
  if (!veh || veh.phase.kind !== 'ring') return null;
  return { s: veh.phase.s, arc: w.config.learnerZoneArc + w.lengthOf('learner') / 2 };
}

/** A player's car joined too close to the learner: the bonus is gone, nothing else. */
export function noteMergeNearLearner(w: World, veh: Vehicle, s: number, now: number): void {
  const l = w.learner;
  const zone = learnerZone(w);
  if (l.kind !== 'active' || !zone || veh.lane !== w.vehicle(l.vehicle)?.lane) return;
  const ahead = w.layout.ringDistance(zone.s, s);
  const near = Math.min(ahead, w.layout.ring.length - ahead) <= zone.arc;
  if (!near) return;
  l.spoilt = true;
  w.events.push({ type: 'learnerSpoilt', vehicle: l.vehicle, blocker: veh.id, point: veh.position, time: now });
}
