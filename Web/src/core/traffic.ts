import { gravity } from './config';
import type { Arm } from './roundabout';
import { type Waiting, type Merging, Vehicle, type VehicleType, isInFlow, isEmergency } from './vehicle';
import { wrap, angleOf } from './vec2';
import type { World } from './world';
import { reservedCriminalArm, reservedTransporterArm, joinsTooClose } from './specials';
import { reservedMilitaryArm, isMilitaryOverdue } from './explosions';
import { reservedAmbulanceArm, joinsClearRoad, longestExit } from './ambulance';
import { reservedLearnerArm } from './learner';
import { reservedOversizeArm } from './oversize';
import { reservedRaceArm } from './racers';
import { reservedWeddingArm } from './wedding';

/**
 * AI traffic on the other arms (FOUNDATION.md 2.7). It only enters with a safe gap, counts
 * merging player cars, never causes a crash, and keeps at least `minRingBots` on the ring.
 */
export function updateTraffic(w: World, dt: number): void {
  const c = w.config;
  w.spawnCooldown -= dt;
  const waitingNow = w.vehicles.filter((x) => x.phase.kind === 'waiting' && x.phase.approach === 0).length;
  const regular = w.spawnCooldown <= 0 && densityCount(w) < w.targetDensity && waitingNow < c.maxWaitingAI;
  if (regular || needsReplacementBot(w)) {
    const queues = new Map<number, Waiting[]>();
    for (const x of w.vehicles) {
      if (x.phase.kind !== 'waiting') continue;
      const list = queues.get(x.phase.arm.index) ?? [];
      list.push(x.phase);
      queues.set(x.phase.arm.index, list);
    }
    const reserved = [reservedCriminalArm(w), reservedTransporterArm(w), reservedMilitaryArm(w), reservedAmbulanceArm(w), reservedLearnerArm(w), reservedOversizeArm(w), reservedRaceArm(w), reservedWeddingArm(w)].map(
      (a) => a?.index,
    );
    const takesAnother = (arm: Arm): boolean => {
      const queue = queues.get(arm.index);
      if (!queue || queue.length === 0) return true;
      if (queue.length >= Math.max(1, c.aiQueuePerArm)) return false;
      const last = Math.max(...queue.map((q) => q.approach));
      return last < c.aiApproachDistance - 2 * c.queueSpacing;
    };
    const free = w.openAIArms.filter((arm) => takesAnother(arm) && !reserved.includes(arm.index));
    if (free.length > 0) {
      spawnWaiting(w, w.rng.pick(free));
      w.spawnCooldown = w.rng.range(c.aiSpawnDelay.lo, c.aiSpawnDelay.hi);
    }
  }

  for (let i = 0; i < w.vehicles.length; i++) {
    const veh = w.vehicles[i];
    const p = veh.phase;
    if (p.kind !== 'waiting') continue;
    // The criminal never waits politely; the ambulance has right of way.
    const barges = veh.type === 'pickup' || veh.type === 'racer' || veh.type === 'wedding' || isEmergency(veh.type);
    if (p.approach > 0) {
      p.approach = approachStep(w, p.approach, dt, c.aiRollingMerge || barges);
      if (p.approach === 0 && (c.aiRollingMerge || barges)) p.reaction = 0;
      const ahead = waitingAhead(w, i, p.arm);
      if (ahead !== null) p.approach = Math.max(p.approach, ahead + c.queueSpacing);
      veh.place(w.approachPose(p));
      continue;
    }
    p.reaction -= dt;
    p.waited = (p.waited ?? 0) + dt;
    // Waited long enough: the next gap it gets through without touching anyone will do.
    const patient = p.waited < c.aiPatience;
    // A motorbike slips into gaps a car would not take.
    const clear = barges
      ? canBargeIn(w, p.arm)
      : veh.type === 'motorbike'
        ? canSlipIn(w, p.arm, veh.lane)
        : patient
          ? canEnter(w, p.arm, veh.lane)
          : canPushIn(w, p.arm, veh.lane);
    // Runners crossing the arm (a marathon): everyone waits at the line, the criminal too.
    if (p.reaction <= 0 && clear && !w.runnersCrossing(p.arm) && !joinsTooClose(w, veh, p.arm) && !joinsClearRoad(w, veh, p.arm)) {
      const ordinary = !(isEmergency(veh.type) || veh.type === 'learner' || veh.type === 'oversize' || veh.type === 'racer' || veh.type === 'wedding');
      const merge: Merging = {
        kind: 'merging',
        arm: p.arm,
        exitArm: ordinary ? w.randomExit(p.arm) : longestExit(w, p.arm),
        profile: w.profileFor(p.arm, veh.lane, veh.type),
        elapsed: 0,
        minGap: Infinity,
        closest: null,
        extraLaps: 0,
      };
      if (c.aiLapChance > 0 && w.rng.unit() < c.aiLapChance) {
        merge.extraLaps = 1 + (w.rng.unit() < 0.6 ? 1 : 0) + (w.rng.unit() < 0.3 ? 1 : 0);
      }
      if (ordinary) w.applyDetour(merge, veh.lane);
      // A lorry sent in a match passes every lane once before it leaves.
      if (veh.sentBy !== null) merge.extraLaps = Math.max(merge.extraLaps, 1);
      veh.phase = merge;
    }
  }
}

function waitingAhead(w: World, index: number, arm: Arm): number | null {
  let nearest: number | null = null;
  for (let j = 0; j < index; j++) {
    const p = w.vehicles[j].phase;
    if (p.kind === 'waiting' && p.arm.index === arm.index) nearest = Math.max(nearest ?? -Infinity, p.approach);
  }
  return nearest;
}

/** The AI's cars on the road; the player's never count: the ring belongs to the bots. */
function densityCount(w: World): number {
  return w.vehicles.filter((x) => {
    if (x.owner !== 'ai') return false;
    const k = x.phase.kind;
    if (k === 'ring' || k === 'merging') return true;
    if (k === 'waiting') return w.config.densityCountsWaiting;
    return false;
  }).length;
}

/** Fewer bots on and into the ring than `minRingBots`: a replacement is due right away. */
function needsReplacementBot(w: World): boolean {
  let incoming = 0;
  let onRing = 0;
  for (const x of w.vehicles) {
    const ringBot = w.isRingBot(x);
    if (x.isBot && (x.phase.kind === 'merging' || x.phase.kind === 'waiting')) incoming++;
    else if (ringBot && x.phase.kind === 'ring') onRing++;
  }
  return onRing - (isMilitaryOverdue(w) ? 1 : 0) + incoming < w.config.minRingBots;
}

function spawnWaiting(w: World, arm: Arm): void {
  const c = w.config;
  const waiting: Waiting = { kind: 'waiting', arm, reaction: w.rng.range(c.aiReaction.lo, c.aiReaction.hi), approach: c.aiApproachDistance };
  const veh = new Vehicle(w.makeId(), w.rollTrafficType(), 'ai', waiting, w.approachPose(waiting));
  veh.lane = rollLane(w, veh.type);
  w.vehicles.push(veh);
}

/** Two lanes: some of the ordinary traffic keeps to the inner lane; buses and specials stay outside. */
function rollLane(w: World, type: VehicleType): 0 | 1 {
  if (w.layout.lanes < 2 || type === 'bus' || type === 'tanker') return 0;
  return w.laneRng.unit() < w.config.innerLaneShare ? 1 : 0;
}

/**
 * Multiplayer: a lorry for `seat` on the AI arm just before a rival's lane, so it passes that
 * lane's mouth first. The AI still only joins with a safe gap. Returns its id, or null.
 */
export function spawnRival(w: World, seat: number): number | null {
  const c = w.config;
  const open = w.openAIArms;
  if (open.length === 0) return null;
  const rivals = w.seatsLeft.filter((q) => q.seat !== seat);
  const before = rivals.map((q) => w.layout.advance(w.armOf(q), -1)).filter((a) => open.some((o) => o.index === a.index));
  const arm = w.rng.pick(before.length > 0 ? before : open);
  const waiting: Waiting = { kind: 'waiting', arm, reaction: c.aiReaction.lo, approach: c.aiApproachDistance };
  const veh = new Vehicle(w.makeId(), 'truck', 'ai', waiting, w.approachPose(waiting));
  veh.sentBy = seat;
  w.vehicles.push(veh);
  return veh.id;
}

/** One step of driving up: at ring speed, then braking so it stops right at the line. */
function approachStep(w: World, distance: number, dt: number, rolling: boolean): number {
  const c = w.config;
  const braking = Math.sqrt(2 * c.aiApproachBrake * gravity(c) * distance);
  const speed = Math.max(Math.min(w.ringSpeed, braking), rolling ? w.ringSpeed * 0.35 : 8);
  return Math.max(0, distance - speed * dt);
}

/** Whether a criminal or a transporter can be announced for `arm`. */
export function isFreeForWarning(w: World, arm: Arm): boolean {
  const waiting = w.vehicles.some((x) => x.phase.kind === 'waiting' && x.phase.arm.index === arm.index);
  return (
    !waiting &&
    arm.index !== reservedCriminalArm(w)?.index &&
    arm.index !== reservedTransporterArm(w)?.index &&
    arm.index !== reservedMilitaryArm(w)?.index &&
    arm.index !== reservedAmbulanceArm(w)?.index &&
    arm.index !== reservedLearnerArm(w)?.index &&
    arm.index !== reservedOversizeArm(w)?.index &&
    arm.index !== reservedRaceArm(w)?.index &&
    arm.index !== reservedWeddingArm(w)?.index
  );
}

/** Places a car directly on the ring: for the start of a shift. */
export function spawnRingCar(w: World, s: number, exitArm: Arm, type: VehicleType, lane: 0 | 1 = 0): void {
  const circumference = w.layout.ring.length;
  const at = wrap(s, circumference);
  const veh =
    new Vehicle(
      w.makeId(),
      type,
      'ai',
      {
        kind: 'ring',
        s: at,
        exitArm,
        distanceToExit: w.layout.ringDistance(at, w.layout.exitS(exitArm, lane)),
        justMerged: null,
        drive: { speed: null, reaction: null, isPursuing: false, hazardTime: 0, outOfFlowTime: 0, isBraking: false },
        sinceMerge: Infinity,
        isLeaving: false,
      },
      w.layout.rings[lane].pose(at),
    );
  veh.lane = lane;
  w.vehicles.push(veh);
}

/** Spreads `count` cars over the ring with safe gaps, so the first second is not empty. */
export function prefillRing(w: World, count: number): void {
  const circumference = w.layout.ring.length;
  const placed: { s: number; length: number; lane: number }[] = [];
  let type = w.rollTrafficType();
  let lane = rollLane(w, type);
  let attempts = 0;
  while (placed.length < count && attempts < 200) {
    attempts++;
    const s = w.rng.unit() * circumference;
    const size = w.lengthOf(type);
    const tooClose = placed.some((other) => {
      if (other.lane !== lane) return false;
      const ahead = w.layout.ringDistance(other.s, s);
      return Math.min(ahead, circumference - ahead) < (size + other.length) / 2 + w.config.aiSafeGap * w.ringSpeed;
    });
    if (tooClose) continue;
    placed.push({ s, length: size, lane });
    spawnRingCar(w, s, w.rng.pick(w.layout.aiArms), type, lane);
    type = w.rollTrafficType();
    lane = rollLane(w, type);
  }
}

/** True if an AI car launched now at `arm` keeps a safe gap on the ring and on its path. */
function canEnter(w: World, arm: Arm, lane: 0 | 1 = 0): boolean {
  if (isDisturbedNear(w, arm)) return false;
  const c = w.config;
  const profile = w.profileFor(arm, lane, 'car');
  const circumference = w.layout.ring.length;
  const arrival = w.layout.entryS(arm, lane);
  const minimumArc = c.carLength + c.aiSafeGap * w.ringSpeed;
  for (const other of w.vehicles) {
    if (other.lane !== lane) continue;
    const s = w.virtualRingPosition(other, profile.duration);
    if (s === null) continue;
    const ahead = w.layout.ringDistance(arrival, s);
    if (Math.min(ahead, circumference - ahead) < minimumArc) return false;
  }
  return w.predictedMergeGap(arm, 0, 30, c.aiPathClearance, lane) >= c.aiPathClearance;
}

/** The criminal's rule: any gap it gets through without touching anyone will do. */
function canBargeIn(w: World, arm: Arm): boolean {
  return !isDisturbedNear(w, arm) && w.predictedMergeGap(arm, 0, 30, w.config.criminalEntryGap) >= w.config.criminalEntryGap;
}

/** A motorbike: any gap of `motorbikeEntryGap` will do, as long as nothing is wrecked nearby. */
function canSlipIn(w: World, arm: Arm, lane: 0 | 1): boolean {
  const gap = w.config.motorbikeEntryGap;
  return !isDisturbedNear(w, arm, true) && w.predictedMergeGap(arm, 0, 30, gap, lane) >= gap;
}

/**
 * A car out of patience (`aiPatience`): a gap of `aiPushInGap` will do, and cars braking near
 * the join no longer hold it back; only a wreck there does.
 */
function canPushIn(w: World, arm: Arm, lane: 0 | 1): boolean {
  const gap = w.config.aiPushInGap;
  return !isDisturbedNear(w, arm, true) && w.predictedMergeGap(arm, 0, 30, gap, lane) >= gap;
}

/**
 * Something near where `arm` joins the ring is not flowing: the AI waits, as a driver would.
 * `wrecksOnly`: only a crash counts, not traffic that is braking.
 */
export function isDisturbedNear(w: World, arm: Arm, wrecksOnly = false): boolean {
  const c = w.config;
  // In Mayhem traffic flows over everything: nothing to wait for.
  if (c.mayhem) return false;
  const circumference = w.layout.ring.length;
  const join = w.layout.entryRingS[arm.index];
  return w.vehicles.some((x) => {
    const p = x.phase;
    const disturbed = p.kind === 'crashed' || (!wrecksOnly && (p.kind === 'ring' || p.kind === 'exiting') && !isInFlow(p.drive));
    if (!disturbed) return false;
    const s = wrap(angleOf(x.position)) * w.layout.ringRadius;
    const downstream = w.layout.ringDistance(join, s);
    return downstream <= c.aiHazardAhead * w.ringSpeed || circumference - downstream <= c.aiHazardBehind * w.ringSpeed;
  });
}
