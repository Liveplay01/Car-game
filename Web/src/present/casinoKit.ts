import { baseConfig } from '../core/config';
import type { SlotSymbol, UpgradeRoll } from '../core/casino';
import type { VehicleType } from '../core/vehicle';
import { Ease, unitHash } from './render';
import type { ColorToken } from './theme';
import type { CasinoRun } from './casino';

/** The casino's timings and small drawing helpers, shared by the page and its games. */
export const TIMES = {
  reelStops: [0.5, 0.72, 0.94],
  /**
   * With the first two reels alike, reel 3 slows down and clicks its last symbols past one by
   * one. The stops were drawn before the spin: the show is longer, the outcome the same.
   */
  anticipation: 1.45,
  creepSteps: 5,
  /** A reel runs this far past its stop and snaps back (in rows), over `bounce` seconds. */
  overshoot: 0.07,
  bounce: 0.16,
  /** The dial: a long, creeping run-out; longer only when the draw really lies at an edge. */
  needle: 3.1,
  needleEdge: 4.1,
  edge: 0.035,
  needleTurns: 3,
  pegs: 24,
  flip: 1.15,
  flipHalfTurns: 8,
  crashSpin: 0.9,
  /** The crash freezes this long before it blows (a hitstop). */
  hitstop: 0.06,
  /** A cash-out this close before the crash is a Clutch Cash-out. */
  clutch: 0.35,
  countUp: 1.3,
  ding: 0.075,
};

export type SlotRun = Extract<CasinoRun, { k: 'slots' }>;
export const slotEnd = (run: SlotRun): number => TIMES.reelStops[2] + (run.anticipate ? TIMES.anticipation : 0);
export const reelStop = (run: SlotRun, i: number): number => TIMES.reelStops[i] + (i === 2 && run.anticipate ? TIMES.anticipation : 0);
/** 0 → 1 over the anticipation, each step slower than the last. */
export const creepAt = (run: SlotRun): number => TIMES.creepSteps * (1 - (1 - Ease.clamp01((run.age - TIMES.reelStops[2]) / TIMES.anticipation)) ** 2);

/** Where reel `i` stands on its strip (in stops, before the bounce), `run.age` into the spin. */
export function reelAt(run: SlotRun, i: number, n: number): number {
  const target = run.spin.stops[i];
  const stop = reelStop(run, i);
  if (run.age >= stop) return target;
  const travel = ((target - run.from[i] + n) % n) + (3 + i) * n;
  if (i < 2 || !run.anticipate) return run.from[i] + travel * Ease.outCubic(run.age / stop);
  const creep = TIMES.creepSteps;
  const t2 = TIMES.reelStops[2];
  if (run.age < t2) return run.from[i] + (travel - creep) * Ease.outCubic(run.age / t2);
  // Click… click… click: every step snaps on quickly, then the reel waits a little longer.
  const s = creepAt(run);
  const k = Math.floor(s);
  return run.from[i] + travel - creep + k + Ease.outCubic(Math.min(1, (s - k) * 3));
}

export const crashStep = (m: number): number => Math.floor(Math.log(Math.max(1, m)) / Math.log(1.1));
/** How close the draw lies to an edge of the green (in turns): 0 on the line. */
export const edgeDistance = (roll: UpgradeRoll): number => Math.min(Math.abs(roll.roll - roll.chance), roll.roll, 1 - roll.roll);
export const needleTime = (roll: UpgradeRoll): number => (edgeDistance(roll) < TIMES.edge ? TIMES.needleEdge : TIMES.needle);
/** Where the needle points, in turns from the top, `age` into the spin: fast, then a long creep. */
export const needleTurn = (roll: UpgradeRoll, age: number): number => (TIMES.needleTurns + roll.roll) * (1 - (1 - Ease.clamp01(age / needleTime(roll))) ** 4);

/** Heat of a drive: calm, speed, nitro, danger. */
export const heatOf = (m: number): 0 | 1 | 2 | 3 => (m >= 10 ? 3 : m >= 5 ? 2 : m >= 2 ? 1 : 0);
export const HEAT: ColorToken[] = ['accent', 'hazard', 'fireOuter', 'destructive'];
export const unit = (index: number, salt: number): number => unitHash(index, salt + 211);

/** How loud a win is (`casinoWinTiers`): 0 below the first step, up to 4. */
export const winTier = (times: number): number => baseConfig.casinoWinTiers.filter((x) => times >= x).length;

export const SYMBOL: Record<SlotSymbol, { type: VehicleType; tint: ColorToken }> = {
  car: { type: 'car', tint: 'rarityCommon' },
  compact: { type: 'compact', tint: 'vehicleCompact' },
  van: { type: 'van', tint: 'vehicleVan' },
  sportsCar: { type: 'sportsCar', tint: 'vehicleSports' },
  ambulance: { type: 'ambulance', tint: 'lightRed' },
  transporter: { type: 'transporter', tint: 'vehicleCargo' },
  boss: { type: 'pickup', tint: 'coin' },
};
