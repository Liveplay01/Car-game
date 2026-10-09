import type { Arm } from './roundabout';
import { Vehicle, type Waiting } from './vehicle';
import type { World } from './world';
import { warningArms } from './traffic';
import { weddingOn } from './wedding';

/**
 * The oversize load (Leo, 02.10.2026): from Level 85 a heavy transport, long and slow, is
 * announced like every special and goes once round the ring at a crawl. The traffic bunches up
 * behind it, so the gaps change; keep your cars off the stretch around it (ahead and behind)
 * while it is on the ring, and it pays a bonus and extends the chain when it leaves. Joining
 * near it costs nothing but that bonus.
 */
export type OversizePhase =
  | { kind: 'idle'; next: number }
  | { kind: 'warning'; arm: Arm; until: number }
  | { kind: 'arriving'; vehicle: number }
  | { kind: 'active'; vehicle: number; spoilt: boolean }
  | { kind: 'done' };

/** Whether a shift of this config sees an oversize load at all, and when it is first due. */
export function firstOversize(w: World): OversizePhase {
  const c = w.config;
  if (c.mayhem || w.isVersus || c.level < c.oversizeLevel || c.oversizeChance <= 0) return { kind: 'done' };
  const comes = w.oversizeRng.unit() < c.oversizeChance;
  return comes ? { kind: 'idle', next: w.oversizeRng.range(c.oversizeFirst.lo, c.oversizeFirst.hi) } : { kind: 'done' };
}

export const reservedOversizeArm = (w: World): Arm | null => (w.oversize.kind === 'warning' ? w.oversize.arm : null);

export function updateOversize(w: World, now: number): void {
  const c = w.config;
  const o = w.oversize;
  if (!w.isScoring) {
    if (o.kind !== 'done' && o.kind !== 'idle') w.oversize = { kind: 'done' };
    return;
  }
  if (w.shift.startedAt === null) return;
  if (!w.shift.acceptsTaps) {
    if (o.kind === 'idle' || o.kind === 'warning') {
      w.oversize = { kind: 'done' };
      return;
    }
    if (o.kind === 'arriving') {
      const veh = w.vehicle(o.vehicle);
      if (veh && veh.phase.kind === 'waiting') {
        w.demoteToOrdinaryTraffic(o.vehicle, 'truck');
        w.oversize = { kind: 'done' };
        return;
      }
    }
  }
  switch (o.kind) {
    case 'idle': {
      if (now < o.next || weddingOn(w)) return;
      const candidates = warningArms(w);
      if (candidates.length === 0) return;
      const arm = w.oversizeRng.pick(candidates);
      w.oversize = { kind: 'warning', arm, until: now + c.oversizeWarning };
      w.events.push({ type: 'oversizeWarning', arm, time: now });
      return;
    }
    case 'warning': {
      const occupied = w.vehicles.some((x) => x.phase.kind === 'waiting' && x.phase.arm.index === o.arm.index);
      if (now < o.until || occupied) return;
      const waiting: Waiting = { kind: 'waiting', arm: o.arm, reaction: 0.6, approach: c.aiApproachDistance };
      const veh = new Vehicle(w.makeId(), 'oversize', 'ai', waiting, w.approachPose(waiting));
      // Too wide for the inner lane: it keeps to the outside.
      veh.lane = 0;
      w.vehicles.push(veh);
      w.oversize = { kind: 'arriving', vehicle: veh.id };
      return;
    }
    case 'arriving': {
      const veh = w.vehicle(o.vehicle);
      if (!veh || veh.isCrashed || veh.type !== 'oversize') {
        w.oversize = { kind: 'done' };
        return;
      }
      if (veh.phase.kind === 'ring') {
        w.oversize = { kind: 'active', vehicle: veh.id, spoilt: false };
        w.events.push({ type: 'oversizeEntered', vehicle: veh.id });
      }
      return;
    }
    case 'active': {
      const veh = w.vehicle(o.vehicle);
      if (!veh || veh.isCrashed) {
        w.oversize = { kind: 'done' };
        return;
      }
      if (veh.phase.kind === 'exiting') oversizeThrough(w, now);
      return;
    }
    case 'done':
      return;
  }
}

/** The load left the ring (or the shift is complete): kept clear, it pays and extends the chain. */
export function oversizeThrough(w: World, now: number): void {
  const o = w.oversize;
  if (o.kind !== 'active') return;
  w.oversize = { kind: 'done' };
  const veh = w.vehicle(o.vehicle);
  if (o.spoilt || !veh || veh.isCrashed) return;
  const c = w.config;
  const amount = Math.round(c.oversizePay * (w.isRushHourScoring ? c.rushHourScoreFactor : 1));
  w.score.money += amount;
  w.setChain(w.score.chain + 1, now);
  w.events.push({ type: 'oversizePassed', vehicle: veh.id, amount, point: veh.position, time: now });
}

/** Where the load's space lies on the ring: its position, and how far ahead and behind. */
export function oversizeZone(w: World): { s: number; arc: number } | null {
  const o = w.oversize;
  if (o.kind !== 'active' || o.spoilt) return null;
  const veh = w.vehicle(o.vehicle);
  if (!veh || veh.phase.kind !== 'ring') return null;
  return { s: veh.phase.s, arc: w.config.oversizeZoneArc + w.lengthOf('oversize') / 2 };
}

/** A player's car joined too close to the load: the bonus is gone, nothing else. */
export function noteMergeNearOversize(w: World, veh: Vehicle, s: number, now: number): void {
  const o = w.oversize;
  const zone = oversizeZone(w);
  if (o.kind !== 'active' || !zone || veh.lane !== 0) return;
  const ahead = w.layout.ringDistance(zone.s, s);
  if (Math.min(ahead, w.layout.ring.length - ahead) > zone.arc) return;
  o.spoilt = true;
  w.events.push({ type: 'oversizeSpoilt', vehicle: o.vehicle, blocker: veh.id, point: veh.position, time: now });
}
