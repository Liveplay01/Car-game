import type { Arm } from './roundabout';
import type { Vec2 } from './vec2';
import type { RoadModule, BossKind, LegendaryRule } from './config';

export type MergeRating = 'clean' | 'tightFit' | 'nearMiss' | 'perfect' | 'cutOff';

/** `failed`: a trial's own rule was broken (see `Config.trialRule`). */
export type ShiftOutcome = 'completed' | 'struckOut' | 'escaped' | 'failed';

export type ExplosionKind = 'tanker' | 'bomb';

/** Everything the result shows. */
export interface ShiftResult {
  outcome: ShiftOutcome;
  score: number;
  completionBonus: number;
  bestCombo: number;
  cleanMerges: number;
  tightFits: number;
  cutOffs: number;
  nearMisses: number;
  perfects: number;
  crashes: number;
  policeCrashes: number;
  takedowns: number;
  transporters: number;
  money: number;
  costs: number;
  covered: number;
  seed: number;
  time: number;
  bestChain: number;
  isPerfectRun: boolean;
  carsSent: number;
  flames: number;
  wrecks: number;
  biggestChain: number;
  detonated: boolean;
  /** A boss level: the syndicate convoy came this shift. */
  convoy: boolean;
  /** The syndicate boss was taken down this shift. */
  bossBusted: boolean;
  /** Which boss came (a boss level), else null. */
  bossKind: BossKind | null;
  /** A Legendary Shift's rule, else null. */
  legendary: LegendaryRule | null;
  /** Ambulances that got through with a clear road. */
  ambulances: number;
  /** Close shaves past a motorbike (a Tight Fit or Near Miss right next to one). */
  shaves: number;
  /** Critical Merges this shift, and Jackpot transporters paid. */
  criticals: number;
  jackpots: number;
  /** Tanker and military-truck explosions. */
  blasts: number;
}

export interface ComboChange {
  previous: number;
  combo: number;
  previousTier: number;
  tier: number;
  multiplier: number;
  isTierUp: boolean;
}

export interface CrashReport {
  first: number;
  second: number;
  point: Vec2;
  time: number;
  involvesPlayer: boolean;
  impact: number;
  isStrike: boolean;
  isPoliceCrash: boolean;
  isTakedown: boolean;
  penalty: number;
  strikes: number;
  policeCrashes: number;
  cost: number;
  covered: number;
  flames: number;
  chain: number;
}

export interface MergeReport {
  vehicle: number;
  minGap: number;
  closest: number | null;
  gapBehind: number;
  position: Vec2;
  time: number;
  rating: MergeRating;
  points: number;
  combo: number;
  shielded: boolean;
  gapAhead: number;
  chain: number;
  /** A Critical Merge: its points already count `criticalFactor` times. */
  critical: boolean;
  /** Points for slipping past a motorbike (already in `points`); 0 when there was none. */
  shave: number;
  /** It crept in behind slow traffic (`creepPace`): rated nothing, scored nothing. */
  crept?: boolean;
  /** Money a Tight Fit or a Near Miss paid on the spot (Tight Fit Tip, Dashcam). */
  tip?: number;
  /** A plain merge that left the chain alone (Chain Saver). */
  chainSaved?: boolean;
}

export interface ExplosionReport {
  kind: ExplosionKind;
  source: number;
  point: Vec2;
  radius: number;
  time: number;
  wrecked: number[];
  flames: number;
  chain: number;
}

/** Typed events the simulation emits; presentation turns them into picture, sound and haptics. */
/** Why a seat left a multiplayer match. */
export type EliminationReason = 'crash' | 'stalled' | 'left';

/** How far a multiplayer match has escalated: 0 open, 1 rush hour, 2 sudden death. */
export type VersusPhase = 0 | 1 | 2;

export type GameEvent =
  | { type: 'launched'; vehicle: number; time: number }
  | ({ type: 'merged' } & MergeReport)
  | ({ type: 'crash' } & CrashReport)
  | ({ type: 'comboChanged' } & ComboChange)
  | { type: 'flowChanged'; isInFlow: boolean; chain: number; time: number }
  | { type: 'rushHour'; time: number }
  /**
   * Unlimited moved on (`endlessStages`): 1 gas tankers, 2 night, 3 storm, 4 military trucks,
   * 5 and up Overtime (`overtime` counts them).
   */
  | { type: 'unlimitedStage'; stage: number; overtime: number; time: number }
  | { type: 'shiftEnded'; result: ShiftResult }
  | { type: 'tapRejected'; time: number }
  | { type: 'exited'; vehicle: number; arm: Arm }
  | { type: 'criminalWarning'; arm: Arm; time: number; boss: boolean; scout: boolean }
  | { type: 'criminalEntered'; vehicle: number; deadline: number; boss: boolean }
  /** The syndicate boss was taken down: the stolen money comes back. */
  | { type: 'heistRecovered'; vehicle: number; point: Vec2; time: number; amount: number }
  /** An armoured boss shrugged off a police ram: the police car is a wreck, the boss drives on. */
  | { type: 'armourHit'; criminal: number; police: number; point: Vec2; time: number; armourLeft: number }
  | { type: 'criminalEscaped'; vehicle: number; time: number }
  | { type: 'criminalWrecked'; vehicle: number; point: Vec2; time: number }
  | { type: 'takedown'; criminal: number; police: number; point: Vec2; time: number; points: number; timeLeft: number }
  | { type: 'transporterWarning'; arm: Arm; time: number; jackpot: boolean }
  | { type: 'transporterEntered'; vehicle: number; deadline: number }
  | { type: 'transporterEscaped'; vehicle: number; time: number }
  | { type: 'transporterPaid'; vehicle: number | null; amount: number; time: number; jackpot: boolean }
  | { type: 'transporterLost'; vehicle: number; point: Vec2; time: number }
  | { type: 'transporterSeized'; vehicle: number; police: number; point: Vec2; time: number }
  | { type: 'dispatched'; vehicle: number; combo: number }
  | { type: 'modulePaid'; module: RoadModule; slot: number; amount: number; point: Vec2; time: number }
  | { type: 'towed'; vehicle: number; slot: number; time: number }
  /** `fire`: this run is a fire engine, with its longer road to keep clear. */
  | { type: 'ambulanceWarning'; arm: Arm; time: number; fire: boolean }
  | { type: 'ambulanceEntered'; vehicle: number }
  /** A car joined right in front of the ambulance: combo and chain are gone, and its bonus. */
  | { type: 'ambulanceBlocked'; vehicle: number; blocker: number; point: Vec2; time: number }
  /** The ambulance left the ring with its road kept clear. */
  | { type: 'ambulanceCleared'; vehicle: number; amount: number; point: Vec2; time: number }
  | { type: 'ambulanceLost'; vehicle: number; point: Vec2; time: number }
  | { type: 'oversizeWarning'; arm: Arm; time: number }
  | { type: 'oversizeEntered'; vehicle: number }
  /** A car of yours joined right beside the oversize load: its bonus is gone. */
  | { type: 'oversizeSpoilt'; vehicle: number; blocker: number; point: Vec2; time: number }
  /** The oversize load left the ring with room around it all the way. */
  | { type: 'oversizePassed'; vehicle: number; amount: number; point: Vec2; time: number }
  | { type: 'raceWarning'; arm: Arm; time: number }
  | { type: 'raceEntered'; vehicles: number[] }
  /** A police car of yours stopped a street racer. */
  | { type: 'racerStopped'; vehicle: number; police: number; amount: number; point: Vec2; time: number }
  | { type: 'weddingWarning'; arm: Arm; time: number }
  | { type: 'weddingEntered'; vehicles: number[] }
  /** A car of yours joined inside the wedding convoy: its bonus is gone. */
  | { type: 'weddingSpoilt'; blocker: number; point: Vec2; time: number }
  /** The convoy left the ring with its gaps kept shut. */
  | { type: 'weddingPassed'; amount: number; point: Vec2; time: number }
  | { type: 'learnerWarning'; arm: Arm; time: number }
  | { type: 'learnerEntered'; vehicle: number }
  /** A car of yours joined right beside the learner: its bonus is gone. */
  | { type: 'learnerSpoilt'; vehicle: number; blocker: number; point: Vec2; time: number }
  /** The learner left the ring with room around it all the way. */
  | { type: 'learnerPassed'; vehicle: number; amount: number; point: Vec2; time: number }
  | { type: 'militaryWarning'; arm: Arm; time: number }
  | { type: 'militaryEntered'; vehicle: number; deadline: number }
  | ({ type: 'explosion' } & ExplosionReport)
  /** Multiplayer: this seat's car caused a crash (the host turns it into `eliminated`). */
  | { type: 'faulted'; seat: number; point: Vec2; time: number }
  | { type: 'eliminated'; seat: number; reason: EliminationReason; time: number }
  /** Multiplayer: the match escalates (1 rush hour, 2 sudden death). */
  | { type: 'versusPhase'; phase: VersusPhase; time: number }
  /** Multiplayer: a streak earned this seat a shield against one light crash. */
  | { type: 'shieldGained'; seat: number; time: number }
  /** Multiplayer: the shield took a light crash; the seat stays in. */
  | { type: 'shielded'; seat: number; point: Vec2; time: number }
  /** Multiplayer: a lorry joins the ring for this seat (a full pressure bar, or revenge from the stands). */
  | { type: 'rivalSent'; seat: number; vehicle: number; revenge: boolean; time: number }
  /** The last seat standing; null when the last ones went out together. */
  | { type: 'matchOver'; winner: number | null; time: number };
