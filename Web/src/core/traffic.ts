import { gravity } from './config';
import type { Arm } from './roundabout';
import { type Waiting, type Merging, Vehicle, type VehicleType, mergeProfile, isInFlow } from './vehicle';
import { wrap, angleOf } from './vec2';
import type { World } from './world';
import { reservedCriminalArm, reservedTransporterArm, joinsTooClose } from './specials';
import { reservedMilitaryArm, isMilitaryOverdue } from './explosions';

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
    const reserved = [reservedCriminalArm(w), reservedTransporterArm(w), reservedMilitaryArm(w)].map((a) => a?.index);
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
    // The criminal never waits politely.
    const barges = veh.type === 'pickup';
    if (p.approach > 0) {
      p.approach = approachStep(w, p.approach, dt, c.aiRollingMerge || barges);
      if (p.approach === 0 && (c.aiRollingMerge || barges)) p.reaction = 0;
      const ahead = waitingAhead(w, i, p.arm);
      if (ahead !== null) p.approach = Math.max(p.approach, ahead + c.queueSpacing);
      veh.place(w.approachPose(p));
      continue;
    }
    p.reaction -= dt;
    const clear = barges ? canBargeIn(w, p.arm) : canEnter(w, p.arm);
    if (p.reaction <= 0 && clear && !joinsTooClose(w, veh, p.arm)) {
      const path = w.layout.entry(p.arm);
      const merge: Merging = {
        kind: 'merging',
        arm: p.arm,
        exitArm: w.randomExit(p.arm),
        profile: mergeProfile(path.length, c.mergeDuration, w.ringSpeed),
        elapsed: 0,
        minGap: Infinity,
        closest: null,
        extraLaps: 0,
      };
      if (c.aiLapChance > 0 && w.rng.unit() < c.aiLapChance) {
        merge.extraLaps = 1 + (w.rng.unit() < 0.6 ? 1 : 0) + (w.rng.unit() < 0.3 ? 1 : 0);
      }
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
  w.vehicles.push(new Vehicle(w.makeId(), w.rollTrafficType(), 'ai', waiting, w.approachPose(waiting)));
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
    arm.index !== reservedMilitaryArm(w)?.index
  );
}

/** Places a car directly on the ring: for the start of a shift. */
export function spawnRingCar(w: World, s: number, exitArm: Arm, type: VehicleType): void {
  const circumference = w.layout.ring.length;
  const at = wrap(s, circumference);
  w.vehicles.push(
    new Vehicle(
      w.makeId(),
      type,
      'ai',
      {
        kind: 'ring',
        s: at,
        exitArm,
        distanceToExit: w.layout.ringDistance(at, w.layout.exitRingS[exitArm.index]),
        justMerged: null,
        drive: { speed: null, reaction: null, isPursuing: false, hazardTime: 0, outOfFlowTime: 0, isBraking: false },
        sinceMerge: Infinity,
        isLeaving: false,
      },
      w.layout.ring.pose(at),
    ),
  );
}

/** Spreads `count` cars over the ring with safe gaps, so the first second is not empty. */
export function prefillRing(w: World, count: number): void {
  const circumference = w.layout.ring.length;
  const placed: { s: number; length: number }[] = [];
  let type = w.rollTrafficType();
  let attempts = 0;
  while (placed.length < count && attempts < 200) {
    attempts++;
    const s = w.rng.unit() * circumference;
    const size = w.lengthOf(type);
    const tooClose = placed.some((other) => {
      const ahead = w.layout.ringDistance(other.s, s);
      return Math.min(ahead, circumference - ahead) < (size + other.length) / 2 + w.config.aiSafeGap * w.ringSpeed;
    });
    if (tooClose) continue;
    placed.push({ s, length: size });
    spawnRingCar(w, s, w.rng.pick(w.layout.aiArms), type);
    type = w.rollTrafficType();
  }
}

/** True if an AI car launched now at `arm` keeps a safe gap on the ring and on its path. */
function canEnter(w: World, arm: Arm): boolean {
  if (isDisturbedNear(w, arm)) return false;
  const c = w.config;
  const profile = mergeProfile(w.layout.entry(arm).length, c.mergeDuration, w.ringSpeed);
  const circumference = w.layout.ring.length;
  const arrival = w.layout.entryRingS[arm.index];
  const minimumArc = c.carLength + c.aiSafeGap * w.ringSpeed;
  for (const other of w.vehicles) {
    const s = w.virtualRingPosition(other, profile.duration);
    if (s === null) continue;
    const ahead = w.layout.ringDistance(arrival, s);
    if (Math.min(ahead, circumference - ahead) < minimumArc) return false;
  }
  return w.predictedMergeGap(arm, 0, 30, c.aiPathClearance) >= c.aiPathClearance;
}

/** The criminal's rule: any gap it gets through without touching anyone will do. */
function canBargeIn(w: World, arm: Arm): boolean {
  return !isDisturbedNear(w, arm) && w.predictedMergeGap(arm, 0, 30, w.config.criminalEntryGap) >= w.config.criminalEntryGap;
}

/** Something near where `arm` joins the ring is not flowing: the AI waits, as a driver would. */
export function isDisturbedNear(w: World, arm: Arm): boolean {
  const c = w.config;
  // In Mayhem traffic flows over everything: nothing to wait for.
  if (c.mayhem) return false;
  const circumference = w.layout.ring.length;
  const join = w.layout.entryRingS[arm.index];
  return w.vehicles.some((x) => {
    const p = x.phase;
    const disturbed = p.kind === 'crashed' || ((p.kind === 'ring' || p.kind === 'exiting') && !isInFlow(p.drive));
    if (!disturbed) return false;
    const s = wrap(angleOf(x.position)) * w.layout.ringRadius;
    const downstream = w.layout.ringDistance(join, s);
    return downstream <= c.aiHazardAhead * w.ringSpeed || circumference - downstream <= c.aiHazardBehind * w.ringSpeed;
  });
}
