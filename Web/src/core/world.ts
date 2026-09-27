import { type Config, gravity } from './config';
import { Layout, type Arm } from './roundabout';
import { type Pose } from './paths';
import { Rng, substream } from './rng';
import { capsule, contact, contactPoint, type Capsule, type Contact } from './collision';
import { collide, skid, unitInertia, type RigidBody } from './crash';
import { type Vec2, add, sub, mul, dot, fromAngle, left, normalize, angleDelta, wrap, lengthSq, v, length } from './vec2';
import {
  Vehicle,
  type VehicleType,
  type Merging,
  type Ring,
  type Waiting,
  mergeProfile,
  profileDistance,
  newDrive,
  isHeavy,
  isExplosive,
} from './vehicle';
import type { GameEvent, MergeRating, ShiftOutcome, ShiftResult } from './events';
import { ScoreBoard, Scoring } from './scoring';
import { updateTraffic, prefillRing } from './traffic';
import { updateDrivers } from './drivers';
import {
  type CriminalPhase,
  type TransporterPhase,
  updateCriminals,
  updateTransporters,
  criminalCaught,
  criminalWrecked,
  transporterWrecked,
  transporterSeized,
  transporterEscapes,
  isInSecureZone,
  isChased,
  isTransported,
  criminalRanInto,
} from './specials';
import { type MilitaryPhase, updateMilitary, explode, isEscorted, predictedZoneS, gapToZone } from './explosions';
import { chargeModules, wreckClearRate, towDepotCovering } from './modules';
import { tempoAt, densityAt } from './levels';

export const STEP_RATE = 120;
export const STEP = 1 / STEP_RATE;

/** A car rolling through the line on a held tap (`PlayerQueue.Pass` in GameCore). */
export interface Pass {
  position: number;
  speed: number;
  beyond: number;
}

const PASS_SETTLE = 8;
const PASS_CATCH_UP = 4;
const PASS_FASTEST = 1.5;
/** Room between the bumpers of your own two cars when one rolls through on a held tap. */
const PASS_CLEARANCE = 4;

function rollPass(p: Pass, slots: number, lockstep: number): void {
  const target = Math.min(1 + Math.max(0, lockstep - p.position) * PASS_CATCH_UP, PASS_FASTEST);
  p.speed += (target - p.speed) * Math.min(1, PASS_SETTLE * slots);
  const next = p.position + p.speed * slots;
  p.beyond = Math.max(0, next - 1);
  p.position = Math.min(1, next);
}

function hermite(u: number, start: number, startSlope: number, end: number, endSlope: number): number {
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * start + (u3 - 2 * u2 + u) * startSlope + (-2 * u3 + 3 * u2) * end + (u3 - u2) * endSlope;
}

/** How far (0…1) the next car has come towards the line; it brakes softly at the end. */
export const approach = (progress: number, startSpeed = 0): number =>
  hermite(Math.min(Math.max(progress, 0), 1), 0, Math.min(Math.max(startSpeed, 0), 1), 1, 0);

export const approachSpeed = (progress: number, startSpeed = 0): number => {
  const x = Math.min(Math.max(progress, 0), 1);
  const s = Math.min(Math.max(startSpeed, 0), 1);
  return 6 * x * (1 - x) + s * (3 * x * x - 4 * x + 1);
};

export type QueueState =
  | { kind: 'ready' }
  | { kind: 'clearing'; vehicle: number }
  | { kind: 'advancing'; elapsed: number }
  | { kind: 'filling'; elapsed: number };

/** The player's queue at the South arm. One tap sends the front car (FOUNDATION.md 2.2). */
export class PlayerQueue {
  vehicles: number[] = [];
  state: QueueState = { kind: 'ready' };
  /** A tap that came before the next car stood at the line; at most one. */
  heldTap: number | null = null;
  pass: Pass | null = null;
  rollingSpeed = 0;

  get isReady(): boolean {
    return this.state.kind === 'ready';
  }
}

export type ShiftPhase = 'waiting' | 'running' | 'rushHour' | 'closing' | 'ended';

/** Progress of a shift (FOUNDATION.md 2.5). No clock: a number of cars to bring into traffic. */
export class ShiftState {
  phase: ShiftPhase = 'running';
  outcome: ShiftOutcome | null = null;
  /** Cars not yet launched; null in Unlimited. */
  carsLeft: number | null = null;
  carsSent = 0;
  startedAt: number | null = null;
  rushHourSince: number | null = null;
  detonated = false;

  get acceptsTaps(): boolean {
    return this.phase === 'waiting' || this.phase === 'running' || this.phase === 'rushHour';
  }

  get isRushHour(): boolean {
    return this.rushHourSince !== null && this.outcome === null;
  }
}

interface Hit {
  i: number;
  j: number;
  contact: Contact;
}

/** 0…1 from an id, the same every time. */
export function unitHashId(id: number): number {
  let h = Math.imul(id ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * Game state plus rules. Fixed step of 1/120 s, deterministic: the same seed and the same
 * taps give the same result (FOUNDATION.md 4.1).
 */
export class World {
  readonly layout: Layout;
  stepCount = 0;
  vehicles: Vehicle[] = [];
  queue = new PlayerQueue();
  shift = new ShiftState();
  score = new ScoreBoard();
  criminal: CriminalPhase = { kind: 'idle', next: Infinity };
  transporter: TransporterPhase = { kind: 'idle', next: Infinity };
  military: MilitaryPhase = { kind: 'idle', next: Infinity };
  militaryCount = 0;
  ringSpeed: number;
  targetDensity: number;

  rng: Rng;
  queueRng: Rng;
  criminalRng: Rng;
  transporterRng: Rng;
  tankerRng: Rng;
  militaryRng: Rng;
  nextVehicleId: number;
  pendingTaps: number[] = [];
  spawnCooldown = 0;
  events: GameEvent[] = [];
  tempoGlide: { from: number; since: number } | null = null;

  constructor(
    readonly config: Config,
    readonly seed: number,
    options: { prefill?: boolean; startsOnFirstTap?: boolean; firstVehicleId?: number } = {},
  ) {
    const { prefill = true, startsOnFirstTap = false, firstVehicleId = 1 } = options;
    this.layout = new Layout(config);
    this.rng = new Rng(seed);
    this.queueRng = substream(seed, 0x51ed2701);
    this.criminalRng = substream(seed, 0xb5ad4ece);
    this.transporterRng = substream(seed, 0x9f314d7c);
    this.tankerRng = substream(seed, 0x7a1e5c93);
    this.militaryRng = substream(seed, 0xe3b20c6d);
    this.ringSpeed = config.ringSpeed;
    this.targetDensity = config.freePlayDensity;
    this.nextVehicleId = firstVehicleId;
    this.startShift(startsOnFirstTap);
    this.applyShiftCurves(0);
    const first = this.criminalRng.range(config.criminalFirst.lo, config.criminalFirst.hi);
    this.criminal = { kind: 'idle', next: this.criminalRng.unit() < config.criminalChance ? first : Infinity };
    this.transporter = {
      kind: 'idle',
      next: config.mayhem ? Infinity : this.transporterRng.range(config.transporterFirst.lo, config.transporterFirst.hi),
    };
    const comes = this.militaryRng.unit() < config.militaryChance;
    this.military = { kind: 'idle', next: comes ? this.militaryRng.range(config.militaryFirst.lo, config.militaryFirst.hi) : Infinity };
    this.refillQueue();
    if (prefill) prefillRing(this, Math.max(this.targetDensity, config.minRingBots));
  }

  get time(): number {
    return this.stepCount * STEP;
  }

  /**
   * The next shift, continuing this one's traffic (FOUNDATION.md 2.5): every car on the road
   * keeps driving, every wreck keeps skidding, the tempo glides, and the new cars roll into
   * the queue from behind. Cars that were the player's are plain traffic now.
   */
  nextShift(config: Config, seed: number): World {
    const next = new World(config, seed, { prefill: false, startsOnFirstTap: true, firstVehicleId: this.nextVehicleId });
    const carried = this.vehicles.filter((veh) => veh.phase.kind !== 'queued');
    for (const veh of carried) {
      veh.owner = 'ai';
      if (veh.phase.kind === 'ring') {
        veh.phase.justMerged = null;
      }
      veh.prevPosition = veh.position;
      veh.prevHeading = veh.heading;
    }
    next.vehicles = [...carried, ...next.vehicles];
    // A military truck still on its rounds keeps them, on the new shift's clock.
    const m = this.military;
    if (m.kind === 'active') next.military = { kind: 'active', vehicle: m.vehicle, deadline: Math.max(0, m.deadline - this.time) };
    else if (m.kind === 'leaving') next.military = { kind: 'leaving', vehicle: m.vehicle };
    next.tempoGlide = { from: this.ringSpeed, since: 0 };
    next.applyShiftCurves(0);
    next.queue.state = { kind: 'filling', elapsed: 0 };
    next.placeQueue();
    return next;
  }

  /** Registers a tap at world time `time`; it takes effect inside the step containing it. */
  tap(time: number): void {
    if (!this.shift.acceptsTaps) return;
    const t = Math.max(time, this.time);
    let index = this.pendingTaps.findIndex((x) => x > t);
    if (index < 0) index = this.pendingTaps.length;
    this.pendingTaps.splice(index, 0, t);
  }

  takeEvents(): GameEvent[] {
    const taken = this.events;
    this.events = [];
    return taken;
  }

  vehicle(id: number): Vehicle | undefined {
    return this.vehicles.find((x) => x.id === id);
  }

  indexOf(id: number): number {
    return this.vehicles.findIndex((x) => x.id === id);
  }

  makeId(): number {
    return this.nextVehicleId++;
  }

  step(): void {
    const dt = STEP;
    const start = this.time;
    const end = (this.stepCount + 1) * dt;
    for (const veh of this.vehicles) {
      veh.prevPosition = veh.position;
      veh.prevHeading = veh.heading;
    }
    this.handleTaps(start, end);
    updateDrivers(this, dt);
    this.moveVehicles(dt, end);
    this.resolveWreckContacts();
    this.updateQueue(dt);
    updateTraffic(this, dt);
    updateCriminals(this, end);
    updateTransporters(this, end);
    updateMilitary(this, end);
    this.resolveContacts(end);
    this.resolveTrafficContacts(end);
    this.rateMerges(end);
    this.updateShift(end);
    this.vehicles = this.vehicles.filter((veh) => !veh.retired);
    this.stepCount++;
  }

  // MARK: Geometry helpers

  lengthOf(type: VehicleType): number {
    const c = this.config;
    switch (type) {
      case 'truck':
      case 'tanker':
      case 'military':
        return c.truckLength;
      case 'sportsCar':
        return c.sportsCarLength;
      case 'compact':
        return c.compactLength;
      case 'van':
        return c.vanLength;
      default:
        return c.carLength;
    }
  }

  massOf(type: VehicleType): number {
    const c = this.config;
    switch (type) {
      case 'pickup':
        return c.criminalMass;
      case 'transporter':
        return c.transporterMass;
      case 'truck':
        return c.truckMass;
      case 'tanker':
        return c.tankerMass;
      case 'military':
        return c.militaryMass;
      case 'sportsCar':
        return c.sportsCarMass;
      case 'compact':
        return c.compactMass;
      case 'van':
        return c.vanMass;
      default:
        return 1;
    }
  }

  hitbox(pose: Pose, type: VehicleType = 'car'): Capsule {
    return capsule(pose.position, pose.heading, this.lengthOf(type), this.config.carWidth);
  }

  hitboxOf(veh: Vehicle): Capsule {
    return capsule(veh.position, veh.heading, this.lengthOf(veh.type), this.config.carWidth);
  }

  /** The AI arms cars can come from: all of them, unless a road closure shuts one. */
  get openAIArms(): Arm[] {
    const closed = this.config.closedArmSlot;
    return closed === null ? this.layout.aiArms : this.layout.aiArms.filter((a) => a.slot !== closed);
  }

  /** Where the roadworks sit on the ring (ring distance of their start), if there are any. */
  get roadworksRingS(): number | null {
    return this.config.cityEvent === 'roadworks' ? this.config.roadworksAt * this.layout.ring.length : null;
  }

  /** Every car leaves 1–3 arms after the one it came from, never at South. */
  randomExit(arm: Arm): Arm {
    const options: Arm[] = [];
    for (let k = this.config.exitArmsAhead.lo; k <= this.config.exitArmsAhead.hi; k++) {
      const a = this.layout.advance(arm, k);
      if (a.index !== 0) options.push(a);
    }
    return options.length === 0 ? this.layout.advance(arm, 1) : this.rng.pick(options);
  }

  // MARK: Movement

  isRingBot(veh: Vehicle): boolean {
    return veh.isBot || isEscorted(this, veh.id);
  }

  moveVehicles(dt: number, now: number): void {
    const layout = this.layout;
    const circumference = layout.ring.length;
    let stayingBots = this.vehicles.filter((veh) => this.isRingBot(veh) && veh.phase.kind === 'ring' && !veh.phase.isLeaving).length;
    const wrecksOnRoad = this.vehicles.some((veh) => veh.isCrashed);
    for (let i = 0; i < this.vehicles.length; i++) {
      const veh = this.vehicles[i];
      const phase = veh.phase;
      switch (phase.kind) {
        case 'queued':
        case 'waiting':
          break;
        case 'merging': {
          phase.elapsed += (dt * this.ringSpeed) / phase.profile.ringSpeed;
          if (phase.elapsed >= phase.profile.duration) {
            const overflow = (phase.elapsed - phase.profile.duration) * phase.profile.ringSpeed;
            const ring: Ring = {
              kind: 'ring',
              s: wrap(layout.entryRingS[phase.arm.index] + overflow, circumference),
              exitArm: phase.exitArm,
              distanceToExit: layout.ringDistanceArms(phase.arm, phase.exitArm) + phase.extraLaps * circumference - overflow,
              justMerged: phase,
              drive: newDrive(),
              sinceMerge: 0,
              isLeaving: false,
            };
            veh.phase = ring;
            veh.place(layout.ring.pose(ring.s));
            if (veh.isBot) stayingBots++;
          } else {
            veh.place(layout.entry(phase.arm).pose(profileDistance(phase.profile, phase.elapsed)));
          }
          break;
        }
        case 'ring': {
          phase.sinceMerge += dt;
          const d = (phase.drive.speed ?? this.ringSpeed) * dt;
          chargeModules(this, veh, phase.s, d, now);
          phase.s = wrap(phase.s + d, circumference);
          phase.distanceToExit -= d;
          if (
            phase.distanceToExit <= 0 &&
            (isChased(this, veh.id) || isTransported(this, veh.id) || isEscorted(this, veh.id) || phase.drive.isPursuing)
          ) {
            phase.distanceToExit += circumference;
          }
          if (veh.isBot && !phase.isLeaving && phase.distanceToExit <= this.config.botExitNotice * this.ringSpeed) {
            // The ring belongs to the bots: one leaves only once its successor is in.
            const inWave = !wrecksOnRoad && phase.drive.outOfFlowTime >= this.config.waveTime && !isModuleQueueAt(this, phase.s);
            const jammed = phase.drive.hazardTime >= this.config.botJamPatience || inWave;
            if (!jammed && stayingBots <= this.config.minRingBots) {
              phase.distanceToExit += circumference;
            } else {
              phase.isLeaving = true;
              stayingBots--;
            }
          }
          if (phase.distanceToExit <= 0) {
            veh.phase = { kind: 'exiting', arm: phase.exitArm, s: -phase.distanceToExit, drive: phase.drive };
            veh.place(layout.exit(phase.exitArm).pose(-phase.distanceToExit));
          } else {
            veh.place(layout.ring.pose(phase.s));
          }
          break;
        }
        case 'exiting': {
          phase.s += (phase.drive.speed ?? this.ringSpeed) * dt;
          const exit = layout.exit(phase.arm);
          if (phase.s >= exit.length) {
            veh.retired = true;
            this.events.push({ type: 'exited', vehicle: veh.id, arm: phase.arm });
          } else veh.place(exit.pose(phase.s));
          break;
        }
        case 'crashed': {
          // A tow depot nearby clears wrecks faster (M9).
          phase.elapsed += dt * wreckClearRate(this, veh.position);
          const body = this.bodyOf(veh);
          skid(body, this.config, dt);
          veh.position = body.position;
          veh.heading = body.heading;
          phase.velocity = body.velocity;
          phase.spin = body.angularVelocity;
          if (phase.elapsed >= this.config.crashDuration) {
            veh.retired = true;
            const slot = towDepotCovering(this, veh.position);
            if (slot !== null) this.events.push({ type: 'towed', vehicle: veh.id, slot, time: now });
          }
          break;
        }
      }
    }
  }

  // MARK: Crash physics glue

  bodyOf(veh: Vehicle): RigidBody {
    let velocity = mul(sub(veh.position, veh.prevPosition), 1 / STEP);
    let spin = angleDelta(veh.prevHeading, veh.heading) / STEP;
    if (veh.phase.kind === 'crashed') {
      velocity = veh.phase.velocity;
      spin = veh.phase.spin;
    }
    const mass = this.massOf(veh.type);
    return { position: veh.position, velocity, heading: veh.heading, angularVelocity: spin, mass, inertia: unitInertia(this.config) * mass };
  }

  contactNormal(c: Contact, first: Vehicle, second: Vehicle): Vec2 {
    let normal = normalize(sub(c.pointA, c.pointB));
    if (lengthSq(normal) === 0) normal = normalize(sub(first.position, second.position));
    if (lengthSq(normal) === 0) normal = left(fromAngle(first.heading));
    return normal;
  }

  localPoint(point: Vec2, veh: Vehicle): Vec2 {
    const d = sub(point, veh.position);
    const forward = fromAngle(veh.heading);
    return v(dot(d, forward), dot(d, left(forward)));
  }

  worldPoint(local: Vec2, veh: Vehicle): Vec2 {
    const forward = fromAngle(veh.heading);
    return add(veh.position, add(mul(forward, local.x), mul(left(forward), local.y)));
  }

  /** Crumples the sheet metal where the car was hit: the harder, the deeper. */
  addDent(veh: Vehicle, point: Vec2, impact: number): void {
    const local = this.localPoint(point, veh);
    const depth = Math.min(Math.max(impact * this.config.dentPerImpact, 0.6), this.config.maxDent);
    const near = veh.dents.find((dent) => length(sub(dent.point, local)) < 4);
    if (near) {
      near.depth = Math.min(this.config.maxDent * 1.3, near.depth + depth * 0.5);
      near.time = this.time;
    } else if (veh.dents.length < 8) veh.dents.push({ point: local, depth, time: this.time });
  }

  makeWreck(veh: Vehicle, point: Vec2, body: RigidBody): void {
    if (veh.phase.kind === 'crashed') {
      veh.phase.velocity = body.velocity;
      veh.phase.spin = body.angularVelocity;
    } else {
      veh.phase = { kind: 'crashed', velocity: body.velocity, spin: body.angularVelocity, elapsed: 0, damage: this.localPoint(point, veh) };
    }
  }

  /** Wrecks that slide into each other bounce off. */
  resolveWreckContacts(): void {
    const wrecks = this.vehicles.filter((veh) => veh.isCrashed);
    if (wrecks.length < 2) return;
    for (let k = 0; k < wrecks.length; k++) {
      for (let m = k + 1; m < wrecks.length; m++) {
        const a = wrecks[k];
        const b = wrecks[m];
        if (lengthSq(sub(a.position, b.position)) > 60 * 60) continue;
        const c = contact(this.hitboxOf(a), this.hitboxOf(b));
        if (c.gap >= 0) continue;
        const normal = this.contactNormal(c, a, b);
        const ba = this.bodyOf(a);
        const bb = this.bodyOf(b);
        const point = contactPoint(c);
        const impact = collide(ba, bb, point, normal, this.config.crashRestitution, this.config.crashFriction);
        if (impact > 15) {
          this.addDent(a, point, impact);
          this.addDent(b, point, impact);
        }
        a.position = add(a.position, mul(normal, -c.gap / 2));
        b.position = sub(b.position, mul(normal, -c.gap / 2));
        if (a.phase.kind === 'crashed') {
          a.phase.velocity = ba.velocity;
          a.phase.spin = ba.angularVelocity;
        }
        if (b.phase.kind === 'crashed') {
          b.phase.velocity = bb.velocity;
          b.phase.spin = bb.angularVelocity;
        }
      }
    }
  }

  // MARK: Collisions and rating

  /** A wreck that live traffic runs into. In Mayhem only one still flying. */
  isObstacle(veh: Vehicle): boolean {
    if (veh.phase.kind !== 'crashed') return false;
    return !this.config.mayhem || length(veh.phase.velocity) > this.config.mayhemWreckHitSpeed;
  }

  isLiveTraffic(veh: Vehicle): boolean {
    if (veh.phase.kind === 'ring') return veh.phase.justMerged === null;
    return veh.phase.kind === 'exiting';
  }

  resolveContacts(now: number): void {
    const hitboxes = this.vehicles.map((veh) => (veh.isCollidable || this.isObstacle(veh) ? this.hitboxOf(veh) : null));
    const hits: Hit[] = [];
    for (let i = 0; i < this.vehicles.length; i++) {
      if (!this.vehicles[i].activeMerge) continue;
      const a = hitboxes[i];
      if (!a) continue;
      for (let j = 0; j < this.vehicles.length; j++) {
        if (j === i) continue;
        const b = hitboxes[j];
        if (!b) continue;
        const otherIsMerging = this.vehicles[j].activeMerge !== null;
        if (otherIsMerging && j < i) continue;
        const c = contact(a, b);
        const ownPair = this.vehicles[i].owner === 'player' && this.vehicles[j].owner === 'player';
        if (!this.vehicles[j].isCrashed && !ownPair) this.noteGap(c.gap, this.vehicles[i], this.vehicles[j].id);
        if (otherIsMerging && !ownPair) this.noteGap(c.gap, this.vehicles[j], this.vehicles[i].id);
        if (c.gap <= 0) hits.push({ i, j, contact: c });
      }
    }
    this.resolve(hits, now);
  }

  get isTrafficDisturbed(): boolean {
    return this.vehicles.some((veh) => {
      const p = veh.phase;
      if (p.kind === 'crashed') return true;
      if (p.kind === 'ring' || p.kind === 'exiting') return p.drive.speed !== null || p.drive.reaction !== null;
      return false;
    });
  }

  resolveTrafficContacts(now: number): void {
    if (!this.isTrafficDisturbed) return;
    const reach = this.config.truckLength + 2;
    const hits: Hit[] = [];
    for (let i = 0; i < this.vehicles.length; i++) {
      const a = this.vehicles[i];
      if (!this.isLiveTraffic(a)) continue;
      for (let j = 0; j < this.vehicles.length; j++) {
        if (j === i) continue;
        const other = this.vehicles[j];
        if (!(this.isObstacle(other) || (this.isLiveTraffic(other) && j > i))) continue;
        if (lengthSq(sub(a.position, other.position)) >= reach * reach) continue;
        const c = contact(this.hitboxOf(a), this.hitboxOf(other));
        if (c.gap <= 0) hits.push({ i, j, contact: c });
      }
    }
    this.resolve(hits, now);
  }

  private resolve(hits: Hit[], now: number): void {
    const crashedNow = new Set<number>();
    hits.sort((x, y) => x.contact.gap - y.contact.gap || x.i - y.i || x.j - y.j);
    for (const hit of hits) {
      const first = this.vehicles[hit.i];
      const second = this.vehicles[hit.j];
      if (!first || !second) continue;
      if (crashedNow.has(first.id) || crashedNow.has(second.id) || first.isCrashed) continue;
      this.crash(first, second, hit.contact, now);
      crashedNow.add(first.id);
      crashedNow.add(second.id);
    }
  }

  noteGap(gapDistance: number, veh: Vehicle, other: number): void {
    const seconds = Math.max(gapDistance, 0) / this.ringSpeed;
    const m = veh.activeMerge;
    if (!m || seconds >= m.minGap) return;
    m.minGap = seconds;
    m.closest = other;
  }

  isLiveCriminal(veh: Vehicle): boolean {
    return veh.type === 'pickup' && !veh.isCrashed;
  }

  isTakedown(a: Vehicle, b: Vehicle): boolean {
    return (this.isLiveCriminal(a) && b.isPlayerPolice) || (this.isLiveCriminal(b) && a.isPlayerPolice);
  }

  isSeizure(a: Vehicle, b: Vehicle): boolean {
    const truck = (x: Vehicle): boolean => x.type === 'transporter' && !x.isCrashed;
    return (truck(a) && b.isPlayerPolice) || (truck(b) && a.isPlayerPolice);
  }

  causesStrike(veh: Vehicle): boolean {
    if (veh.owner !== 'player' || veh.isCrashed) return false;
    if (this.config.chainCrashesCostStrikes || veh.activeMerge) return true;
    if (veh.phase.kind === 'ring') return veh.phase.sinceMerge < this.config.mergeResponsibility;
    return false;
  }

  /**
   * The impact as real physics: the cars become wrecks that bounce, spin and skid. Only the
   * crash of a merging player car counts against the player (FOUNDATION.md 2.6).
   */
  crash(first: Vehicle, second: Vehicle, c: Contact, now: number): void {
    const point = contactPoint(c);
    const takedown = this.isTakedown(first, second) && !criminalRanInto(this, first, second, point);
    const seizure = this.isSeizure(first, second);
    const wreckedCriminal = takedown ? undefined : [first, second].find((x) => this.isLiveCriminal(x));
    const wreckedTruck = seizure ? undefined : [first, second].find((x) => x.type === 'transporter' && !x.isCrashed);
    const explosives = [first, second].filter((x) => isExplosive(x.type) && !x.isCrashed).map((x) => x.id);
    const culprits = [first, second].filter((x) => this.causesStrike(x));
    const strike = !takedown && !seizure && culprits.length > 0;
    const byPolice = strike && culprits.every((x) => x.type === 'police');
    const firstWasWreck = first.isCrashed;
    const secondWasWreck = second.isCrashed;
    const heavy = [first, second].some((x) => !x.isCrashed && isHeavy(x.type));
    const normal = this.contactNormal(c, first, second);
    const a = this.bodyOf(first);
    const b = this.bodyOf(second);
    const impact = collide(a, b, point, normal, this.config.crashRestitution, this.config.crashFriction);
    this.addDent(first, point, impact);
    this.addDent(second, point, impact);
    const overlap = Math.max(0, -c.gap);
    first.position = add(first.position, mul(normal, overlap / 2));
    second.position = sub(second.position, mul(normal, overlap / 2));
    this.makeWreck(first, point, a);
    this.makeWreck(second, point, b);
    const involvesPlayer = first.owner === 'player' || second.owner === 'player';
    let penalty = 0;
    let cost = { paid: 0, covered: 0 };
    let mayhem = { flames: 0, chain: 0 };
    const comboEvents = this.events.length;
    if (this.config.mayhem) {
      if (this.isScoring && (!firstWasWreck || !secondWasWreck)) mayhem = this.scoreMayhem(now, !strike, heavy);
    } else if (strike && this.isScoring) {
      penalty = this.scoreCrash(byPolice, now);
      cost = this.chargeCrash(impact);
    }
    this.events.splice(comboEvents, 0, {
      type: 'crash',
      first: first.id,
      second: second.id,
      point,
      time: now,
      involvesPlayer,
      impact,
      isStrike: strike,
      isPoliceCrash: byPolice,
      isTakedown: takedown,
      penalty,
      strikes: this.score.strikes,
      policeCrashes: this.score.policeCrashes,
      cost: cost.paid,
      covered: cost.covered,
      flames: mayhem.flames,
      chain: mayhem.chain,
    });
    if (takedown) {
      const [criminalId, policeId] = first.type === 'pickup' ? [first.id, second.id] : [second.id, first.id];
      criminalCaught(this, criminalId, policeId, point, now);
    }
    if (seizure) {
      const [truckId, policeId] = first.type === 'transporter' ? [first.id, second.id] : [second.id, first.id];
      transporterSeized(this, truckId, policeId, point, now);
    }
    if (wreckedTruck) transporterWrecked(this, wreckedTruck.id, point, now);
    if (wreckedCriminal) criminalWrecked(this, wreckedCriminal.id, point, now);
    if (strike && this.isScoring && !this.config.mayhem && this.isStruckOut) this.endShift('struckOut', now);
    for (const id of explosives) explode(this, id, now);
  }

  /** Rates and scores every player merge that ended this step without a crash. */
  rateMerges(now: number): void {
    for (const veh of this.vehicles) {
      if (veh.phase.kind !== 'ring' || !veh.phase.justMerged) continue;
      const merge = veh.phase.justMerged;
      veh.phase.justMerged = null;
      if (veh.owner !== 'player' || !this.isScoring) continue;
      const s = veh.phase.s;
      const behind = this.gapBehind(s, veh.id);
      const ahead = this.gapAhead(s, veh.id);
      const at = this.events.length;
      let shielded = false;
      if (this.transporter.kind === 'active' && veh.type !== 'police' && isInSecureZone(this, s)) {
        shielded = true;
        this.score.money += this.config.shieldBonus;
      }
      const [rating, points, combo] = this.scoreMerge(merge.minGap, behind, ahead);
      this.setChain(Scoring.extendsChain(rating) ? this.score.chain + 1 : 0, now);
      this.events.splice(at, 0, {
        type: 'merged',
        vehicle: veh.id,
        minGap: merge.minGap,
        closest: merge.closest,
        gapBehind: behind,
        position: veh.position,
        time: now,
        rating,
        points,
        combo,
        shielded,
        gapAhead: ahead,
        chain: this.score.chain,
      });
    }
  }

  gapAhead(s: number, id: number): number {
    const circumference = this.layout.ring.length;
    let nearest = Infinity;
    for (const other of this.vehicles) {
      if (other.id === id || other.owner === 'player') continue;
      const otherS = this.virtualRingPosition(other, 0);
      if (otherS === null) continue;
      const ahead = this.layout.ringDistance(s, otherS);
      if (ahead < circumference / 2) nearest = Math.min(nearest, ahead);
    }
    return Number.isFinite(nearest) ? Math.max(0, nearest - this.config.carLength) / this.ringSpeed : Infinity;
  }

  gapBehind(s: number, id: number): number {
    const circumference = this.layout.ring.length;
    let nearest = Infinity;
    for (const other of this.vehicles) {
      if (other.id === id || other.owner === 'player') continue;
      const otherS = this.virtualRingPosition(other, 0);
      if (otherS === null) continue;
      const behind = this.layout.ringDistance(otherS, s);
      if (behind < circumference / 2) nearest = Math.min(nearest, behind);
    }
    return Number.isFinite(nearest) ? Math.max(0, nearest - this.config.carLength) / this.ringSpeed : Infinity;
  }

  staysOnRing(veh: Vehicle): boolean {
    if (veh.phase.kind !== 'ring') return false;
    return isChased(this, veh.id) || isTransported(this, veh.id) || isEscorted(this, veh.id) || veh.phase.drive.isPursuing;
  }

  virtualRingPosition(veh: Vehicle, t: number): number | null {
    const circumference = this.layout.ring.length;
    const p = veh.phase;
    if (p.kind === 'merging') {
      const travelled = t * this.ringSpeed - (p.profile.duration - p.elapsed) * p.profile.ringSpeed;
      if (travelled >= this.layout.ringDistanceArms(p.arm, p.exitArm)) return null;
      return wrap(this.layout.entryRingS[p.arm.index] + travelled, circumference);
    }
    if (p.kind === 'ring') {
      const travelled = (p.drive.speed ?? this.ringSpeed) * t;
      if (travelled >= p.distanceToExit && !this.staysOnRing(veh)) return null;
      return wrap(p.s + travelled, circumference);
    }
    return null;
  }

  predictedPose(veh: Vehicle, t: number): Pose | null {
    const layout = this.layout;
    const p = veh.phase;
    const ringOrExit = (s: number, distanceToExit: number, exitArm: Arm, travelled: number): Pose | null => {
      if (travelled < distanceToExit) return layout.ring.pose(s + travelled);
      const exit = layout.exit(exitArm);
      const e = travelled - distanceToExit;
      return e < exit.length ? exit.pose(e) : null;
    };
    switch (p.kind) {
      case 'merging': {
        const elapsed = p.elapsed + (t * this.ringSpeed) / p.profile.ringSpeed;
        if (elapsed < p.profile.duration) return layout.entry(p.arm).pose(profileDistance(p.profile, elapsed));
        return ringOrExit(
          layout.entryRingS[p.arm.index],
          layout.ringDistanceArms(p.arm, p.exitArm),
          p.exitArm,
          (elapsed - p.profile.duration) * p.profile.ringSpeed,
        );
      }
      case 'ring': {
        const exit = this.staysOnRing(veh) ? Infinity : p.distanceToExit;
        return ringOrExit(p.s, exit, p.exitArm, (p.drive.speed ?? this.ringSpeed) * t);
      }
      case 'exiting': {
        const s = p.s + (p.drive.speed ?? this.ringSpeed) * t;
        const exit = layout.exit(p.arm);
        return s < exit.length ? exit.pose(s) : null;
      }
      case 'crashed': {
        const speed = length(p.velocity);
        const brake = this.config.tireGripBrake * gravity(this.config);
        const time = Math.min(t, speed / brake);
        const travelled = speed * time - (brake * time * time) / 2;
        return { position: add(veh.position, mul(normalize(p.velocity), travelled)), heading: veh.heading + p.spin * time };
      }
      default:
        return null;
    }
  }

  /** Smallest gap (s) a car launched at `arm` would have to anyone during its merge. */
  predictedMergeGap(arm: Arm, launchDelay = 0, samples = 60, stopBelow = -Infinity): number {
    const path = this.layout.entry(arm);
    const profile = mergeProfile(path.length, this.config.mergeDuration, this.ringSpeed);
    const others = this.vehicles.filter((x) => x.isCollidable || this.isObstacle(x));
    let smallest = Infinity;
    for (let k = 0; k <= samples; k++) {
      const t = (profile.duration * k) / samples;
      const me = this.hitbox(path.pose(profileDistance(profile, t)));
      for (const other of others) {
        const pose = this.predictedPose(other, launchDelay + t);
        if (!pose) continue;
        const g = contact(me, this.hitbox(pose, other.type)).gap / this.ringSpeed;
        if (g < smallest) smallest = g;
        if (smallest < stopBelow) return smallest;
      }
      const zone = predictedZoneS(this, launchDelay + t);
      if (zone !== null) {
        smallest = Math.min(smallest, gapToZone(this, me, zone) / this.ringSpeed);
        if (smallest < stopBelow) return smallest;
      }
    }
    return smallest;
  }

  // MARK: Scoring

  get isScoring(): boolean {
    return this.shift.phase !== 'ended';
  }

  get isRushHourScoring(): boolean {
    return this.shift.isRushHour;
  }

  get isInFlow(): boolean {
    return this.score.chain >= Math.max(1, this.config.flowChain);
  }

  scoreMerge(minGap: number, gapBehind: number, gapAhead: number): [MergeRating, number, number] {
    const c = this.config;
    const rating = Scoring.rate(minGap, gapBehind, gapAhead, c);
    const points = Scoring.points(rating, this.score.combo, this.isRushHourScoring, c);
    this.score.points += points;
    if (rating === 'clean') this.score.cleanMerges++;
    else if (rating === 'tightFit') this.score.tightFits++;
    else if (rating === 'nearMiss') this.score.nearMisses++;
    else if (rating === 'perfect') this.score.perfects++;
    else this.score.cutOffs++;
    if (rating === 'cutOff') this.setCombo(0);
    else this.setCombo(this.score.combo + Scoring.comboGain(rating, c));
    return [rating, points, this.score.combo];
  }

  setChain(chain: number, time: number): void {
    const was = this.isInFlow;
    this.score.chain = Math.max(0, chain);
    this.score.bestChain = Math.max(this.score.bestChain, this.score.chain);
    if (this.isInFlow !== was) this.events.push({ type: 'flowChanged', isInFlow: this.isInFlow, chain: this.score.chain, time });
  }

  setCombo(combo: number): void {
    const previous = this.score.combo;
    if (combo === previous) return;
    const c = this.config;
    this.score.combo = combo;
    this.score.bestCombo = Math.max(this.score.bestCombo, combo);
    const tier = Scoring.tier(combo, c);
    const previousTier = Scoring.tier(previous, c);
    this.events.push({
      type: 'comboChanged',
      previous,
      combo,
      previousTier,
      tier,
      multiplier: Scoring.multiplierOfTier(tier, c),
      isTierUp: tier > previousTier,
    });
  }

  scoreCrash(byPolice: boolean, now: number): number {
    const penalty = Math.min(this.score.points, this.config.crashPenalty);
    this.score.points -= penalty;
    if (byPolice) this.score.policeCrashes++;
    else this.score.strikes++;
    this.setCombo(0);
    this.setChain(0, now);
    return penalty;
  }

  /**
   * Mayhem: a crash that makes a new wreck. A follow-up within `mayhemChainWindow` extends the
   * chain reaction; the player's own car crashing starts a new one.
   */
  scoreMayhem(at: number, followUp = true, heavy = false): { flames: number; chain: number } {
    const s = this.score;
    if (followUp && s.lastCrashAt !== null && at - s.lastCrashAt <= this.config.mayhemChainWindow) s.crashChain++;
    else s.crashChain = 1;
    s.lastCrashAt = at;
    s.biggestChain = Math.max(s.biggestChain, s.crashChain);
    s.wrecks++;
    const flames = Math.min(s.crashChain, this.config.mayhemMaxChainFlames) * (heavy ? Math.max(1, this.config.mayhemHeavyFlames) : 1);
    s.flames += flames;
    return { flames, chain: s.crashChain };
  }

  scoreTakedown(now: number): number {
    const c = this.config;
    const factor = Scoring.multiplier(this.score.combo, c) * (this.isRushHourScoring ? c.rushHourScoreFactor : 1);
    const points = Math.round(c.takedownPoints * factor);
    this.score.points += points;
    this.score.takedowns++;
    this.setChain(this.score.chain + 1, now);
    return points;
  }

  get isStruckOut(): boolean {
    return this.score.strikes >= this.config.maxStrikes || this.score.policeCrashes > this.config.maxPoliceCrashes;
  }

  /** From `crashCostLevel` on, the player's crash costs money; the insurance pays a share. */
  chargeCrash(impact: number): { paid: number; covered: number } {
    const c = this.config;
    if (c.level < c.crashCostLevel || c.endless) return { paid: 0, covered: 0 };
    let bucket = 0;
    while (bucket < c.crashCostImpacts.length && impact >= c.crashCostImpacts[bucket]) bucket++;
    const cost = c.crashCosts[Math.min(bucket, c.crashCosts.length - 1)];
    const covered = Math.round(cost * c.crashInsurance);
    this.score.costs += cost - covered;
    this.score.covered += covered;
    this.score.money -= cost - covered;
    return { paid: cost - covered, covered };
  }

  chargeEscape(): void {
    const c = this.config;
    if (c.level < c.crashCostLevel || c.endless) return;
    const covered = Math.round(c.escapeLoss * c.robberyInsurance);
    this.score.costs += c.escapeLoss - covered;
    this.score.covered += covered;
    this.score.money -= c.escapeLoss - covered;
  }

  // MARK: Queue and taps

  handleTaps(start: number, end: number): void {
    if (this.queue.isReady && this.queue.heldTap !== null) {
      this.queue.heldTap = null;
      this.launchFromQueue(end - start, start);
    }
    while (this.pendingTaps.length > 0 && this.pendingTaps[0] <= end) {
      const first = this.pendingTaps.shift()!;
      const driven = end - Math.max(first, start);
      if (this.launchFromQueue(driven, first)) continue;
      if (this.queue.heldTap === null) {
        this.queue.heldTap = first;
        if (this.queue.state.kind === 'clearing' && this.config.queueAdvanceDuration <= 0) {
          const x = (this.launchedDistance(this.queue.state.vehicle) ?? this.config.queueSpacing) / this.config.queueSpacing;
          this.queue.pass = { position: approach(x, this.queue.rollingSpeed), speed: approachSpeed(x, this.queue.rollingSpeed), beyond: 0 };
        }
      } else {
        this.events.push({ type: 'tapRejected', time: first });
      }
    }
  }

  mergeDurationOf(type: VehicleType): number {
    const c = this.config;
    switch (type) {
      case 'sportsCar':
        return c.mergeDuration * c.sportsCarMergeFactor;
      case 'compact':
        return c.mergeDuration * c.compactMergeFactor;
      case 'van':
        return c.mergeDuration * c.vanMergeFactor;
      default:
        return c.mergeDuration;
    }
  }

  launchFromQueue(driven: number, time: number): boolean {
    if (!this.queue.isReady || this.queue.vehicles.length === 0) return false;
    const id = this.queue.vehicles[0];
    const veh = this.vehicle(id);
    if (!veh) return false;
    this.queue.vehicles.shift();
    this.queue.state = { kind: 'clearing', vehicle: id };
    this.queue.pass = null;
    this.queue.rollingSpeed = 0;
    const path = this.layout.entry(this.layout.player);
    const merge: Merging = {
      kind: 'merging',
      arm: this.layout.player,
      exitArm: this.randomExit(this.layout.player),
      profile: mergeProfile(path.length, this.mergeDurationOf(veh.type), this.ringSpeed),
      elapsed: driven - STEP,
      minGap: Infinity,
      closest: null,
      extraLaps: 0,
    };
    veh.phase = merge;
    this.events.push({ type: 'launched', vehicle: id, time });
    this.noteLaunch(time);
    this.refillQueue();
    return true;
  }

  updateQueue(dt: number): void {
    const state = this.queue.state;
    const c = this.config;
    if (state.kind === 'clearing') {
      const driven = this.launchedDistance(state.vehicle);
      const pass = this.queue.pass;
      if (pass) {
        rollPass(pass, (dt * this.ringSpeed) / c.queueSpacing, (driven ?? 2 * c.queueSpacing) / c.queueSpacing);
        const leaderVeh = this.vehicle(state.vehicle);
        const leader = leaderVeh ? this.lengthOf(leaderVeh.type) : c.carLength;
        const followerVeh = this.queue.vehicles.length > 0 ? this.vehicle(this.queue.vehicles[0]) : undefined;
        const follower = followerVeh ? this.lengthOf(followerVeh.type) : c.carLength;
        const room = (leader + follower) / 2 + PASS_CLEARANCE;
        if (pass.position >= 1) {
          if (this.queue.heldTap === null) {
            this.queue.state = { kind: 'ready' };
            this.queue.pass = null;
          } else if (driven === null || driven >= room) {
            this.rollThrough(pass);
          } else {
            pass.speed = 0;
            pass.beyond = 0;
          }
        }
      } else if (driven === null || driven >= c.queueSpacing) {
        this.queue.state = c.queueAdvanceDuration > 0 ? { kind: 'advancing', elapsed: 0 } : { kind: 'ready' };
      }
    } else if (state.kind === 'advancing') {
      const next = state.elapsed + dt;
      this.queue.state = next >= c.queueAdvanceDuration ? { kind: 'ready' } : { kind: 'advancing', elapsed: next };
    } else if (state.kind === 'filling') {
      const next = state.elapsed + dt;
      this.queue.state = next >= c.queueFillSeconds ? { kind: 'ready' } : { kind: 'filling', elapsed: next };
    }
    this.placeQueue();
  }

  private rollThrough(pass: Pass): void {
    const c = this.config;
    const past = (pass.beyond * c.queueSpacing) / Math.max(pass.speed * this.ringSpeed, 1);
    this.queue.state = { kind: 'ready' };
    this.queue.heldTap = null;
    const id = this.queue.vehicles[0];
    if (id === undefined || !this.launchFromQueue(past + STEP, this.time + STEP - past)) return;
    const veh = this.vehicle(id);
    if (veh && veh.phase.kind === 'merging') {
      veh.place(this.layout.entry(this.layout.player).pose(profileDistance(veh.phase.profile, veh.phase.elapsed)));
    }
    this.queue.rollingSpeed = Math.min(pass.speed, 1);
  }

  launchedDistance(id: number): number | null {
    const veh = this.vehicle(id);
    if (!veh || veh.phase.kind !== 'merging') return null;
    return profileDistance(veh.phase.profile, veh.phase.elapsed);
  }

  queueSlotOffset(): number {
    const state = this.queue.state;
    const c = this.config;
    switch (state.kind) {
      case 'ready':
        return 0;
      case 'clearing': {
        if (c.queueAdvanceDuration > 0) return 1;
        if (this.queue.pass) return 1 - this.queue.pass.position;
        const driven = this.launchedDistance(state.vehicle) ?? c.queueSpacing;
        return 1 - approach(driven / c.queueSpacing, this.queue.rollingSpeed);
      }
      case 'advancing': {
        const x = c.queueAdvanceDuration > 0 ? Math.min(Math.max(state.elapsed / c.queueAdvanceDuration, 0), 1) : 1;
        return (1 - x) * (1 - x) * (1 - x);
      }
      case 'filling': {
        const x = c.queueFillSeconds > 0 ? Math.min(Math.max(state.elapsed / c.queueFillSeconds, 0), 1) : 1;
        return c.queueFillSlots * (1 - x * x * (3 - 2 * x));
      }
    }
  }

  placeQueue(): void {
    const offset = this.queueSlotOffset();
    this.queue.vehicles.forEach((id, slot) => {
      const veh = this.vehicle(id);
      if (veh) veh.place(this.layout.queuePose(slot + offset));
    });
  }

  refillQueue(): void {
    const c = this.config;
    const target = Math.min(c.queueVisible + 4, this.shift.carsLeft ?? Infinity);
    const offset = this.queueSlotOffset();
    while (this.queue.vehicles.length < target) {
      const pose = this.layout.queuePose(this.queue.vehicles.length + offset);
      let type: VehicleType = this.queueRng.unit() < c.policeShare ? 'police' : 'car';
      const shares: [VehicleType, number][] = [
        ['sportsCar', c.sportsCarShare],
        ['compact', c.compactShare],
        ['van', c.vanShare],
      ];
      if (type === 'car' && shares.some(([, s]) => s > 0)) {
        let pick = this.queueRng.unit();
        for (const [candidate, share] of shares) {
          if (share <= 0) continue;
          if (pick < share) {
            type = candidate;
            break;
          }
          pick -= share;
        }
      }
      const veh = new Vehicle(this.makeId(), type, 'player', { kind: 'queued' }, pose);
      this.vehicles.push(veh);
      this.queue.vehicles.push(veh.id);
    }
  }

  get queueBrakes(): boolean {
    const state = this.queue.state;
    switch (state.kind) {
      case 'ready':
        return this.queue.heldTap === null;
      case 'advancing':
        return true;
      case 'clearing': {
        if (this.config.queueAdvanceDuration > 0) return true;
        if (this.queue.pass) return false;
        const x = (this.launchedDistance(state.vehicle) ?? this.config.queueSpacing) / this.config.queueSpacing;
        return x > (this.queue.rollingSpeed > 0 ? 1 / 3 : 0.5);
      }
      case 'filling':
        return this.config.queueFillSeconds <= 0 || state.elapsed / this.config.queueFillSeconds > 0.5;
    }
  }

  isBraking(veh: Vehicle): boolean {
    const p = veh.phase;
    switch (p.kind) {
      case 'queued':
        return veh.owner === 'player' ? this.queueBrakes : true;
      case 'waiting': {
        if (p.approach <= 0) return true;
        return Math.sqrt(2 * this.config.aiApproachBrake * gravity(this.config) * p.approach) < this.ringSpeed;
      }
      case 'ring':
      case 'exiting':
        return p.drive.isBraking;
      default:
        return false;
    }
  }

  /** The next car becomes a police car, for part of the combo (`dispatchComboFactor`). */
  dispatchPolice(): boolean {
    if (!this.shift.acceptsTaps || this.queue.vehicles.length === 0) return false;
    const veh = this.vehicle(this.queue.vehicles[0]);
    if (!veh || veh.type === 'police') return false;
    veh.type = 'police';
    this.setCombo(Math.floor(this.score.combo * this.config.dispatchComboFactor));
    this.events.push({ type: 'dispatched', vehicle: veh.id, combo: this.score.combo });
    return true;
  }

  // MARK: Shift

  get carsLeft(): number | null {
    return this.shift.carsLeft;
  }

  shiftTime(now: number): number {
    return this.shift.startedAt === null ? 0 : now - this.shift.startedAt;
  }

  applyShiftCurves(now: number): void {
    const c = this.config;
    const time = this.shiftTime(now);
    if (this.isScoring) this.targetDensity = densityAt(time, this.shift.isRushHour, c);
    const since = this.shift.rushHourSince === null ? null : this.shift.rushHourSince - (this.shift.startedAt ?? 0);
    const target = c.ringSpeed * tempoAt(time, since, c);
    if (this.tempoGlide) {
      const x = Math.min(Math.max((now - this.tempoGlide.since) / c.tempoGlideSeconds, 0), 1);
      this.ringSpeed = this.tempoGlide.from + (target - this.tempoGlide.from) * x * x * (3 - 2 * x);
      if (x >= 1) this.tempoGlide = null;
    } else {
      this.ringSpeed = target;
    }
  }

  startShift(waiting: boolean): void {
    this.shift.carsLeft = this.config.endless ? null : this.config.shiftCars;
    if (waiting) this.shift.phase = 'waiting';
    else this.beginShiftClock(0);
  }

  beginShiftClock(time: number): void {
    this.shift.startedAt = time;
    this.shift.phase = 'running';
    if (this.criminal.kind === 'idle') this.criminal = { kind: 'idle', next: this.criminal.next + time };
    if (this.transporter.kind === 'idle') this.transporter = { kind: 'idle', next: this.transporter.next + time };
    if (this.military.kind === 'idle') this.military = { kind: 'idle', next: this.military.next + time };
    if (!this.config.endless && this.config.shiftCars <= this.config.rushHourCars) this.beginRushHour(time);
  }

  noteLaunch(time: number): void {
    if (this.shift.phase === 'waiting') this.beginShiftClock(time);
    this.shift.carsSent++;
    if (this.shift.carsLeft === null) return;
    this.shift.carsLeft = Math.max(0, this.shift.carsLeft - 1);
    const remaining = this.shift.carsLeft;
    if (this.shift.phase === 'running' && remaining < this.config.rushHourCars) this.beginRushHour(time);
    if (remaining === 0 && this.shift.acceptsTaps) {
      this.shift.phase = 'closing';
      this.pendingTaps = [];
      this.queue.heldTap = null;
    }
  }

  private beginRushHour(time: number): void {
    this.shift.phase = 'rushHour';
    this.shift.rushHourSince = time;
    this.events.push({ type: 'rushHour', time });
  }

  updateShift(now: number): void {
    this.applyShiftCurves(now);
    if (this.shift.phase !== 'closing') return;
    const merging = this.vehicles.some((x) => x.owner === 'player' && x.activeMerge !== null);
    if (merging) return;
    // Mayhem ends once the last chain reaction has burnt out.
    if (this.config.mayhem && this.score.lastCrashAt !== null && now - this.score.lastCrashAt < this.config.mayhemChainWindow) return;
    if (this.transporter.kind === 'active') transporterEscapes(this, this.transporter.vehicle, now);
    const c = this.config;
    this.score.points += c.completionBonus;
    this.score.money += c.shiftPay;
    if (this.isPerfectSoFar) {
      this.score.points += c.perfectRunPoints;
      this.score.money += Math.round(c.shiftPay * c.perfectRunPayFactor);
    }
    this.endShift('completed', now);
  }

  get isPerfectSoFar(): boolean {
    return this.score.strikes === 0 && this.score.policeCrashes === 0 && this.score.cutOffs === 0;
  }

  endShift(outcome: ShiftOutcome, time: number): void {
    if (this.config.endless) this.score.money += this.config.endlessPayPerCar * this.shift.carsSent;
    this.shift.phase = 'ended';
    this.shift.outcome = outcome;
    this.pendingTaps = [];
    this.queue.heldTap = null;
    this.events.push({ type: 'shiftEnded', result: this.result(outcome, time) });
  }

  result(outcome: ShiftOutcome, time: number): ShiftResult {
    const s = this.score;
    return {
      outcome,
      score: s.points,
      completionBonus: outcome === 'completed' ? this.config.completionBonus : 0,
      bestCombo: s.bestCombo,
      cleanMerges: s.cleanMerges,
      tightFits: s.tightFits,
      cutOffs: s.cutOffs,
      nearMisses: s.nearMisses,
      perfects: s.perfects,
      crashes: s.strikes,
      policeCrashes: s.policeCrashes,
      takedowns: s.takedowns,
      transporters: s.transporters,
      money: s.money,
      costs: s.costs,
      covered: s.covered,
      seed: this.seed,
      time: this.shiftTime(time),
      bestChain: s.bestChain,
      isPerfectRun: outcome === 'completed' && this.isPerfectSoFar && !this.config.mayhem,
      carsSent: this.shift.carsSent,
      flames: s.flames,
      wrecks: s.wrecks,
      biggestChain: s.biggestChain,
      detonated: this.shift.detonated,
    };
  }

  approachPose(w: Waiting): Pose {
    const stop = this.layout.stopPose(w.arm);
    return { position: sub(stop.position, mul(fromAngle(stop.heading), w.approach)), heading: stop.heading };
  }

  /** Normal traffic is cars and lorries, some of them gas tankers. */
  rollTrafficType(): VehicleType {
    if (this.rng.unit() >= this.config.truckChance) return 'car';
    return this.config.tankerShare > 0 && this.tankerRng.unit() < this.config.tankerShare ? 'tanker' : 'truck';
  }

  /** Turns an abandoned special vehicle into ordinary traffic. */
  demoteToOrdinaryTraffic(id: number, type: VehicleType = 'car'): void {
    const veh = this.vehicle(id);
    if (veh) veh.type = type;
  }
}

/** A module's slow zone lies at `s` or within `jamLookahead` seconds of ring ahead of it. */
export function isModuleQueueAt(w: World, s: number): boolean {
  const c = w.config;
  const slow = Object.entries(c.modules).filter(([, m]) => (m === 'tollBooth' ? c.tollSpeedFactor : m === 'speedCamera' ? c.cameraSpeedFactor : 1) < 1);
  if (slow.length === 0) return false;
  const reach = c.jamLookahead * w.ringSpeed;
  const L = w.layout.ring.length;
  return slow.some(([slot, m]) => {
    const arc = m === 'tollBooth' ? c.tollZoneArc : c.cameraZoneArc;
    const start = wrap(w.layout.moduleRingS(Number(slot), c.moduleSlotCount) - arc / 2, L);
    return w.layout.ringDistance(wrap(start - reach, L), s) <= reach + arc;
  });
}
