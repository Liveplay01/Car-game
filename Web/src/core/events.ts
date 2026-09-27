import type { Arm } from './roundabout';
import type { Vec2 } from './vec2';

export type MergeRating = 'clean' | 'tightFit' | 'nearMiss' | 'perfect';

export type ShiftOutcome = 'completed' | 'struckOut' | 'escaped';

/** Everything the result banner shows. */
export interface ShiftResult {
  outcome: ShiftOutcome;
  score: number;
  completionBonus: number;
  bestCombo: number;
  cleanMerges: number;
  tightFits: number;
  nearMisses: number;
  perfects: number;
  crashes: number;
  policeCrashes: number;
  takedowns: number;
  transporters: number;
  money: number;
  costs: number;
  covered: number;
  time: number;
  bestChain: number;
  isPerfectRun: boolean;
  carsSent: number;
  seed: number;
}

export interface ComboChange {
  previous: number;
  combo: number;
  previousTier: number;
  tier: number;
  multiplier: number;
}

/** Typed events the simulation emits; presentation turns them into picture, sound and haptics. */
export type GameEvent =
  | { type: 'launched'; vehicle: number; time: number }
  | {
      type: 'merged';
      vehicle: number;
      rating: MergeRating;
      points: number;
      combo: number;
      minGap: number;
      position: Vec2;
      shielded: boolean;
      chain: number;
      time: number;
    }
  | {
      type: 'crash';
      first: number;
      second: number;
      point: Vec2;
      impact: number;
      involvesPlayer: boolean;
      isStrike: boolean;
      isPoliceCrash: boolean;
      isTakedown: boolean;
      penalty: number;
      cost: number;
      time: number;
    }
  | ({ type: 'comboChanged' } & ComboChange)
  | { type: 'flowChanged'; inFlow: boolean; chain: number }
  | { type: 'rushHour'; time: number }
  | { type: 'shiftEnded'; result: ShiftResult }
  | { type: 'tapRejected'; time: number }
  | { type: 'criminalWarning'; arm: Arm }
  | { type: 'criminalEntered'; vehicle: number; deadline: number }
  | { type: 'criminalEscaped'; vehicle: number }
  | { type: 'criminalWrecked'; vehicle: number; point: Vec2 }
  | { type: 'takedown'; criminal: number; police: number; point: Vec2; points: number }
  | { type: 'transporterWarning'; arm: Arm }
  | { type: 'transporterEntered'; vehicle: number; deadline: number }
  | { type: 'transporterPaid'; vehicle: number | null; amount: number; escaped: boolean }
  | { type: 'transporterLost'; vehicle: number; point: Vec2 }
  | { type: 'transporterSeized'; vehicle: number; point: Vec2 }
  | { type: 'dispatched'; vehicle: number; combo: number };
