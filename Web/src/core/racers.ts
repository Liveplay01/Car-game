import type { Arm } from './roundabout';
import { Vehicle, type Waiting } from './vehicle';
import type { Vec2 } from './vec2';
import type { World } from './world';
import { isFreeForWarning } from './traffic';
import { weddingOn } from './wedding';

/**
 * Street racers (Leo, 02.10.2026): from Level 90 two racers rev at one of the other arms,
 * announced, and barge into the ring one right after the other, like criminals. Nothing is lost
 * if they get away: it is a chance. Each one a police car of yours rams is stopped and pays a
 * bonus and a link in the chain; two at once ask for two police cars, timed one after the other.
 */
export type RacePhase =
  | { kind: 'idle'; next: number }
  | { kind: 'warning'; arm: Arm; until: number }
  /** On their way in: the racers spawned so far, the second right behind the first. */
  | { kind: 'arriving'; arm: Arm; vehicles: number[] }
  | { kind: 'active'; vehicles: number[] }
  | { kind: 'done' };

export function firstRace(w: World): RacePhase {
  const c = w.config;
  if (c.mayhem || w.isVersus || c.level < c.racerLevel || c.racerChance <= 0) return { kind: 'done' };
  const comes = w.racerRng.unit() < c.racerChance;
  return comes ? { kind: 'idle', next: w.racerRng.range(c.racerFirst.lo, c.racerFirst.hi) } : { kind: 'done' };
}

export const reservedRaceArm = (w: World): Arm | null => (w.race.kind === 'warning' || w.race.kind === 'arriving' ? w.race.arm : null);

export function updateRace(w: World, now: number): void {
  const c = w.config;
  const r = w.race;
  if (!w.isScoring) {
    if (r.kind !== 'done' && r.kind !== 'idle') w.race = { kind: 'done' };
    return;
  }
  if (w.shift.startedAt === null) return;
  if (!w.shift.acceptsTaps && (r.kind === 'idle' || r.kind === 'warning')) {
    w.race = { kind: 'done' };
    return;
  }
  switch (r.kind) {
    case 'idle': {
      if (now < r.next || weddingOn(w)) return;
      const candidates = w.openAIArms.filter((arm) => isFreeForWarning(w, arm));
      if (candidates.length === 0) return;
      const arm = w.racerRng.pick(candidates);
      w.race = { kind: 'warning', arm, until: now + c.racerWarning };
      w.events.push({ type: 'raceWarning', arm, time: now });
      return;
    }
    case 'warning': {
      const occupied = w.vehicles.some((x) => x.phase.kind === 'waiting' && x.phase.arm.index === r.arm.index);
      if (now < r.until || occupied) return;
      w.race = { kind: 'arriving', arm: r.arm, vehicles: [spawnRacer(w, r.arm).id] };
      return;
    }
    case 'arriving': {
      // The second one follows from the same arm, close behind (unless the shift is closing).
      if (r.vehicles.length < 2 && w.shift.acceptsTaps) {
        const occupied = w.vehicles.some((x) => x.phase.kind === 'waiting' && x.phase.arm.index === r.arm.index);
        if (!occupied) r.vehicles.push(spawnRacer(w, r.arm).id);
        return;
      }
      const live = r.vehicles.filter((id) => w.vehicle(id) !== undefined);
      if (live.length === 0) {
        w.race = { kind: 'done' };
        return;
      }
      if (live.every((id) => w.vehicle(id)!.phase.kind !== 'waiting')) {
        w.race = { kind: 'active', vehicles: live };
        w.events.push({ type: 'raceEntered', vehicles: live });
      }
      return;
    }
    case 'active': {
      const live = r.vehicles.filter((id) => {
        const veh = w.vehicle(id);
        return veh !== undefined && !veh.isCrashed && veh.phase.kind !== 'exiting';
      });
      if (live.length === 0) w.race = { kind: 'done' };
      return;
    }
    case 'done':
      return;
  }
}

function spawnRacer(w: World, arm: Arm): Vehicle {
  const waiting: Waiting = { kind: 'waiting', arm, reaction: 0, approach: w.config.aiApproachDistance };
  const veh = new Vehicle(w.makeId(), 'racer', 'ai', waiting, w.approachPose(waiting));
  w.vehicles.push(veh);
  return veh;
}

export const isLiveRacer = (veh: Vehicle): boolean => veh.type === 'racer' && !veh.isCrashed;

/** A police car of yours rammed a racer: stopped, and it pays. */
export function racerStopped(w: World, racer: Vehicle, policeId: number, point: Vec2, now: number): void {
  if (!w.isScoring) return;
  const c = w.config;
  const amount = Math.round(c.racerPay * (w.isRushHourScoring ? c.rushHourScoreFactor : 1));
  w.score.money += amount;
  w.score.racers++;
  w.setChain(w.score.chain + 1, now);
  w.events.push({ type: 'racerStopped', vehicle: racer.id, police: policeId, amount, point, time: now });
}
