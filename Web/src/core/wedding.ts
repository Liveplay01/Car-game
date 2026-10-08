import type { Arm } from './roundabout';
import { Vehicle, type Waiting } from './vehicle';
import type { World } from './world';
import { isUnreserved } from './traffic';

/**
 * The wedding convoy (Leo, 08.10.2026): from Level 100 three decorated cars come in from one
 * of the other arms, announced, and go once round the ring together. They drive at ring speed
 * like all traffic, so nothing slows down; what changes is that the three of them hold their
 * gaps shut. Keep your cars out of the convoy (between the cars and right at its ends) and it
 * pays a bonus and extends the chain when it leaves. Joining inside it costs only that bonus.
 */
export type WeddingPhase =
  | { kind: 'idle'; next: number }
  | { kind: 'warning'; arm: Arm; until: number }
  /** On their way in: the cars spawned so far, one after the other. */
  | { kind: 'arriving'; arm: Arm; vehicles: number[] }
  | { kind: 'active'; vehicles: number[]; spoilt: boolean }
  | { kind: 'done' };

const isOn = (kind: string): boolean => kind === 'warning' || kind === 'arriving' || kind === 'active';

/** Whether a convoy is under way: the other specials that bend the ring wait for it. */
export const weddingOn = (w: World): boolean => isOn(w.wedding.kind);

/** The specials that slow the ring or take its gaps: a convoy never comes while one is on. */
const ringBusy = (w: World): boolean => isOn(w.oversize.kind) || isOn(w.learner.kind) || isOn(w.race.kind);

export function firstWedding(w: World): WeddingPhase {
  const c = w.config;
  if (c.mayhem || w.isVersus || c.level < c.weddingLevel || c.weddingChance <= 0) return { kind: 'done' };
  const comes = w.weddingRng.unit() < c.weddingChance;
  return comes ? { kind: 'idle', next: w.weddingRng.range(c.weddingFirst.lo, c.weddingFirst.hi) } : { kind: 'done' };
}

export const reservedWeddingArm = (w: World): Arm | null => (w.wedding.kind === 'warning' || w.wedding.kind === 'arriving' ? w.wedding.arm : null);

export function updateWedding(w: World, now: number): void {
  const c = w.config;
  const o = w.wedding;
  if (!w.isScoring) {
    if (o.kind !== 'done' && o.kind !== 'idle') w.wedding = { kind: 'done' };
    return;
  }
  if (w.shift.startedAt === null) return;
  if (!w.shift.acceptsTaps && (o.kind === 'idle' || o.kind === 'warning')) {
    w.wedding = { kind: 'done' };
    return;
  }
  switch (o.kind) {
    case 'idle': {
      if (now < o.next || ringBusy(w)) return;
      if ((w.shift.carsLeft ?? Infinity) < c.weddingMinCarsLeft) {
        w.wedding = { kind: 'done' };
        return;
      }
      const candidates = w.openAIArms.filter((arm) => isUnreserved(w, arm));
      if (candidates.length === 0) return;
      const arm = w.weddingRng.pick(candidates);
      w.wedding = { kind: 'warning', arm, until: now + c.weddingWarning };
      w.events.push({ type: 'weddingWarning', arm, time: now });
      return;
    }
    case 'warning': {
      if (now < o.until) return;
      // All three at once, one behind the other, at the back of whatever queue the arm has.
      const vehicles = Array.from({ length: c.weddingCars }, (_, k) => spawnWeddingCar(w, o.arm, k).id);
      w.wedding = { kind: 'arriving', arm: o.arm, vehicles };
      return;
    }
    case 'arriving': {
      const live = o.vehicles.filter((id) => w.vehicle(id) !== undefined);
      if (live.length === 0) {
        w.wedding = { kind: 'done' };
        return;
      }
      if (live.every((id) => w.vehicle(id)!.phase.kind !== 'waiting')) {
        w.wedding = { kind: 'active', vehicles: live, spoilt: false };
        w.events.push({ type: 'weddingEntered', vehicles: live });
      }
      return;
    }
    case 'active': {
      const cars = o.vehicles.map((id) => w.vehicle(id)).filter((x): x is Vehicle => x !== undefined);
      if (cars.some((x) => x.isCrashed)) {
        w.wedding = { kind: 'done' };
        return;
      }
      if (cars.some((x) => x.phase.kind === 'ring' || x.phase.kind === 'merging')) return;
      weddingThrough(w, now);
      return;
    }
    case 'done':
      return;
  }
}

function spawnWeddingCar(w: World, arm: Arm, place: number): Vehicle {
  const c = w.config;
  const waiting: Waiting = { kind: 'waiting', arm, reaction: 0, approach: c.aiApproachDistance + place * c.queueSpacing };
  const veh = new Vehicle(w.makeId(), 'wedding', 'ai', waiting, w.approachPose(waiting));
  veh.lane = 0;
  w.vehicles.push(veh);
  return veh;
}

/** The convoy left the ring (or the shift is complete): kept clear, it pays and extends the chain. */
export function weddingThrough(w: World, now: number): void {
  const o = w.wedding;
  if (o.kind !== 'active') return;
  w.wedding = { kind: 'done' };
  const lead = o.vehicles.map((id) => w.vehicle(id)).find((x): x is Vehicle => x !== undefined);
  if (o.spoilt || !lead) return;
  const amount = Math.round(w.config.weddingPay * (w.isRushHourScoring ? w.config.rushHourScoreFactor : 1));
  w.score.money += amount;
  w.setChain(w.score.chain + 1, now);
  w.events.push({ type: 'weddingPassed', amount, point: lead.position, time: now });
}

/** The convoy's stretch of the ring: where it begins and how far it reaches, with room at both ends. */
export function weddingZone(w: World): { start: number; length: number } | null {
  const o = w.wedding;
  if (o.kind !== 'active' || o.spoilt) return null;
  const circumference = w.layout.ring.length;
  const onRing = o.vehicles.flatMap((id) => {
    const veh = w.vehicle(id);
    return veh && veh.phase.kind === 'ring' ? [veh.phase.s] : [];
  });
  if (onRing.length === 0) return null;
  // Offsets from the first car, folded to ±half a lap: the convoy never spans more than that.
  const offsets = onRing.map((s) => {
    const ahead = w.layout.ringDistance(onRing[0], s);
    return ahead > circumference / 2 ? ahead - circumference : ahead;
  });
  const room = w.config.weddingZoneArc + w.lengthOf('wedding') / 2;
  const first = Math.min(...offsets) - room;
  const last = Math.max(...offsets) + room;
  return { start: (onRing[0] + first + circumference) % circumference, length: last - first };
}

/** A car of yours joined inside the convoy: the bonus is gone, nothing else. */
export function noteMergeNearWedding(w: World, veh: Vehicle, s: number, now: number): void {
  const o = w.wedding;
  const zone = weddingZone(w);
  if (o.kind !== 'active' || !zone || veh.lane !== 0) return;
  if (w.layout.ringDistance(zone.start, s) > zone.length) return;
  o.spoilt = true;
  w.events.push({ type: 'weddingSpoilt', blocker: veh.id, point: veh.position, time: now });
}
