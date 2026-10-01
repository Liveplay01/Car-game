import type { Arm } from './roundabout';
import type { Vec2 } from './vec2';
import type { Pose } from './paths';

/** Vehicle types (FOUNDATION.md 4.6). */
export type VehicleType =
  | 'car'
  /** From the player's queue: the only car that can stop a criminal. */
  | 'police'
  /** The criminal: heavy, barges in, only a police car stops it. */
  | 'pickup'
  /** Money transporter with a secure zone around it on the ring. */
  | 'transporter'
  /** A lorry in normal traffic: longer and heavier. */
  | 'truck'
  /** The player's unlockable car types (LOOT.md): different, not better. */
  | 'sportsCar'
  | 'compact'
  | 'van'
  /** The Classic: an honour found in Standard Chests only, very rarely (LOOT.md). Drives like a car. */
  | 'classic'
  /** A gas tanker: drives like any lorry, but wrecked it explodes. */
  | 'tanker'
  /** A military truck with a bomb: a no-go zone around it on the ring. */
  | 'military'
  /** On an emergency run: the ring ahead of it has to stay clear. */
  | 'ambulance'
  /** An emergency run too, long and heavy, with a longer road to keep clear. */
  | 'fireTruck'
  /** Quick and slim: slips into small gaps; a close merge past it pays extra. */
  | 'motorbike'
  /** A driving-school car: hesitates on the ring; keeping your distance pays. */
  | 'learner'
  /** A school bus (School Run): stops at the bus stop on the ring, the traffic behind waits. */
  | 'bus';

export type Owner = 'player' | 'ai';

/** A part in a special event: the syndicate boss (a criminal) and its armoured escorts. */
export type VehicleRole = 'boss' | 'escort' | null;

export const isCarType = (t: VehicleType): boolean => t === 'car' || t === 'sportsCar' || t === 'compact' || t === 'van' || t === 'classic';
/** A lorry of any kind: long and heavy, worth more flames in Mayhem. */
export const isHeavy = (t: VehicleType): boolean => t === 'truck' || t === 'tanker' || t === 'military' || t === 'bus' || t === 'fireTruck';
/** On an emergency run: the road ahead of it has to stay clear. */
export const isEmergency = (t: VehicleType): boolean => t === 'ambulance' || t === 'fireTruck';
/** Goes up when it is wrecked. */
export const isExplosive = (t: VehicleType): boolean => t === 'tanker' || t === 'military';

/**
 * Speed profile of a merge: fixed duration, ends exactly at ring speed (FOUNDATION.md 2.2).
 * Times are planned at `ringSpeed`; if the ring speeds up, the merge runs faster by the same factor.
 */
export interface MergeProfile {
  duration: number;
  startSpeed: number;
  endSpeed: number;
  ringSpeed: number;
}

/** `endScale`: the lane it joins turns slower than the outer one (the inner lane: its radius share). */
export function mergeProfile(pathLength: number, duration: number, ringSpeed: number, endScale = 1): MergeProfile {
  const average = pathLength / duration;
  const end = Math.min(ringSpeed * endScale, 2 * average);
  return { duration, endSpeed: end, startSpeed: 2 * average - end, ringSpeed };
}

export function profileDistance(p: MergeProfile, time: number): number {
  const t = Math.min(Math.max(time, 0), p.duration);
  return p.startSpeed * t + ((p.endSpeed - p.startSpeed) * t * t) / (2 * p.duration);
}

export function profileSpeed(p: MergeProfile, time: number): number {
  const t = Math.min(Math.max(time, 0), p.duration);
  return p.startSpeed + ((p.endSpeed - p.startSpeed) * t) / p.duration;
}

/**
 * How a car on the ring or an exit is driven. In normal traffic every car flows at ring
 * speed (`speed === null`), so the ring itself never crashes and the timing stays exact.
 */
export interface Drive {
  speed: number | null;
  reaction: number | null;
  isPursuing: boolean;
  hazardTime: number;
  outOfFlowTime: number;
  isBraking: boolean;
}

export const newDrive = (): Drive => ({
  speed: null,
  reaction: null,
  isPursuing: false,
  hazardTime: 0,
  outOfFlowTime: 0,
  isBraking: false,
});

export const isInFlow = (d: Drive): boolean => d.speed === null && d.reaction === null;

export interface Merging {
  kind: 'merging';
  arm: Arm;
  exitArm: Arm;
  profile: MergeProfile;
  /** Planned time since launch. */
  elapsed: number;
  /** Smallest gap to anyone so far, in seconds. */
  minGap: number;
  closest: number | null;
  extraLaps: number;
  /**
   * Share of its planned speed the car drives at (unset: 1). Below 1 only while the ring at its
   * join is slow or jammed: it brakes behind the traffic instead of ploughing in (drivers.ts).
   */
  pace?: number;
  /** Slowing down for a jam at the join: the brake lights are on. */
  braking?: boolean;
}

export interface Waiting {
  kind: 'waiting';
  arm: Arm;
  /** Time left before the car looks for a gap, once it stands at the line. */
  reaction: number;
  /** Distance still to drive up to the stop line. */
  approach: number;
  /** Seconds it has stood at the line looking for a gap (unset: none yet); see `aiPatience`. */
  waited?: number;
}

export interface Ring {
  kind: 'ring';
  s: number;
  exitArm: Arm;
  distanceToExit: number;
  /** The finished merge, kept for exactly the step in which it ended so it can be rated. */
  justMerged: Merging | null;
  drive: Drive;
  sinceMerge: number;
  isLeaving: boolean;
  /** Inner lane: the way out across the outer lane was checked for this lap. */
  exitChecked?: boolean;
}

export interface Exiting {
  kind: 'exiting';
  arm: Arm;
  s: number;
  drive: Drive;
}

export interface Crashed {
  kind: 'crashed';
  velocity: Vec2;
  spin: number;
  elapsed: number;
  /** Where it was hit first, in its own frame: x forward, y left. */
  damage: Vec2;
}

export type Phase = { kind: 'queued' } | Waiting | Merging | Ring | Exiting | Crashed;

export interface Dent {
  point: Vec2;
  depth: number;
  /** World time of the hit that made or deepened it, for the soft-body spring. */
  time: number;
}

export class Vehicle {
  prevPosition: Vec2;
  prevHeading: number;
  dents: Dent[] = [];
  retired = false;
  role: VehicleRole = null;
  /** An armoured boss: police rams it still shrugs off. */
  armour = 0;
  /** Multiplayer: whose lane a player car came from. */
  seat = 0;
  /** Multiplayer: an AI lorry this seat sent into the ring (pressure or revenge), else null. */
  sentBy: number | null = null;
  /** The ring lane it drives in: 0 the outer (every roundabout), 1 the inner (two lanes). */
  lane: 0 | 1 = 0;
  /** A school bus: seconds it has stood at the stop, and whether it has served it. */
  dwell = 0;
  served = false;

  constructor(
    readonly id: number,
    public type: VehicleType,
    public owner: Owner,
    public phase: Phase,
    pose: Pose,
    public position: Vec2 = pose.position,
    public heading: number = pose.heading,
  ) {
    this.prevPosition = pose.position;
    this.prevHeading = pose.heading;
  }

  place(pose: Pose): void {
    this.position = pose.position;
    this.heading = pose.heading;
  }

  get isCollidable(): boolean {
    const k = this.phase.kind;
    return k === 'merging' || k === 'ring' || k === 'exiting';
  }

  get isCrashed(): boolean {
    return this.phase.kind === 'crashed';
  }

  /** Plain AI traffic: the bots whose gaps the player's cars have to hit. */
  get isBot(): boolean {
    const t = this.type;
    return this.owner === 'ai' && t !== 'pickup' && t !== 'transporter' && t !== 'military' && !isEmergency(t) && t !== 'learner';
  }

  get isPlayerPolice(): boolean {
    return this.type === 'police' && this.owner === 'player' && !this.isCrashed;
  }

  /** A merge that is rated this step: still on the entry path, or finished in this very step. */
  get activeMerge(): Merging | null {
    if (this.phase.kind === 'merging') return this.phase;
    if (this.phase.kind === 'ring') return this.phase.justMerged;
    return null;
  }
}
