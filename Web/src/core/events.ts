import type { Arm } from './roundabout';
import type { Vec2 } from './vec2';
import type { RoadModule } from './config';

export type MergeRating = 'clean' | 'tightFit' | 'nearMiss' | 'perfect' | 'cutOff';

export type ShiftOutcome = 'completed' | 'struckOut' | 'escaped';

export type ExplosionKind = 'tanker' | 'bomb';

/** Everything the result shows (`ShiftResult` in GameCore). */
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
export type GameEvent =
  | { type: 'launched'; vehicle: number; time: number }
  | ({ type: 'merged' } & MergeReport)
  | ({ type: 'crash' } & CrashReport)
  | ({ type: 'comboChanged' } & ComboChange)
  | { type: 'flowChanged'; isInFlow: boolean; chain: number; time: number }
  | { type: 'rushHour'; time: number }
  | { type: 'shiftEnded'; result: ShiftResult }
  | { type: 'tapRejected'; time: number }
  | { type: 'exited'; vehicle: number; arm: Arm }
  | { type: 'criminalWarning'; arm: Arm; time: number }
  | { type: 'criminalEntered'; vehicle: number; deadline: number }
  | { type: 'criminalEscaped'; vehicle: number; time: number }
  | { type: 'criminalWrecked'; vehicle: number; point: Vec2; time: number }
  | { type: 'takedown'; criminal: number; police: number; point: Vec2; time: number; points: number; timeLeft: number }
  | { type: 'transporterWarning'; arm: Arm; time: number }
  | { type: 'transporterEntered'; vehicle: number; deadline: number }
  | { type: 'transporterEscaped'; vehicle: number; time: number }
  | { type: 'transporterPaid'; vehicle: number | null; amount: number; time: number }
  | { type: 'transporterLost'; vehicle: number; point: Vec2; time: number }
  | { type: 'transporterSeized'; vehicle: number; police: number; point: Vec2; time: number }
  | { type: 'dispatched'; vehicle: number; combo: number }
  | { type: 'modulePaid'; module: RoadModule; slot: number; amount: number; point: Vec2; time: number }
  | { type: 'towed'; vehicle: number; slot: number; time: number }
  | { type: 'militaryWarning'; arm: Arm; time: number }
  | { type: 'militaryEntered'; vehicle: number; deadline: number }
  | ({ type: 'explosion' } & ExplosionReport);
