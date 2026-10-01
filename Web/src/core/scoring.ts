import type { Config } from './config';
import type { MergeRating } from './events';

/** Score, combo and strikes of one shift. */
export class ScoreBoard {
  points = 0;
  combo = 0;
  bestCombo = 0;
  strikes = 0;
  cleanMerges = 0;
  tightFits = 0;
  cutOffs = 0;
  /** Merges that crept in behind slow traffic (`creepPace`): no points, no combo, and in Unlimited no car. */
  crept = 0;
  takedowns = 0;
  transporters = 0;
  money = 0;
  policeCrashes = 0;
  nearMisses = 0;
  perfects = 0;
  chain = 0;
  bestChain = 0;
  costs = 0;
  covered = 0;
  /** Mayhem: flames earned, wrecks made, the chain reaction running and the biggest one. */
  flames = 0;
  wrecks = 0;
  crashChain = 0;
  biggestChain = 0;
  /** The syndicate boss was taken down this shift (boss levels). */
  bossBusted = false;
  /** Ambulances that got through with a clear road. */
  ambulances = 0;
  /** Critical Merges, and Jackpot transporters paid. */
  criticals = 0;
  jackpots = 0;
  lastCrashAt: number | null = null;

  get merges(): number {
    return this.cleanMerges + this.tightFits + this.cutOffs + this.nearMisses + this.perfects;
  }
}

/** The rating rules as pure functions (FOUNDATION.md 2.3). */
export const Scoring = {
  rate(minGap: number, gapBehind: number, gapAhead: number, c: Config): MergeRating {
    if (c.sloppyWindow > 0 && gapBehind < c.sloppyWindow) return 'cutOff';
    if (minGap < c.tightFitSeconds) return 'tightFit';
    if (minGap < c.nearMissSeconds) return 'nearMiss';
    return Scoring.isCentred(gapAhead, gapBehind, c) ? 'perfect' : 'clean';
  },

  /** Perfect Input: a real gap on both sides, and the car right in its middle. */
  isCentred(gapAhead: number, gapBehind: number, c: Config): boolean {
    if (!Number.isFinite(gapAhead) || !Number.isFinite(gapBehind)) return false;
    if (gapAhead < c.nearMissSeconds || gapBehind < c.nearMissSeconds) return false;
    const sum = gapAhead + gapBehind;
    if (sum > c.perfectMaxGap) return false;
    return Math.abs(gapAhead - gapBehind) <= c.perfectBalance * sum;
  },

  tier(combo: number, c: Config): number {
    const count = Math.min(c.comboThresholds.length, c.comboMultipliers.length);
    return c.comboThresholds.slice(0, count).filter((t) => combo >= t).length;
  },

  multiplierOfTier(tier: number, c: Config): number {
    return tier === 0 ? 1 : c.comboMultipliers[tier - 1];
  },

  multiplier(combo: number, c: Config): number {
    return Scoring.multiplierOfTier(Scoring.tier(combo, c), c);
  },

  points(rating: MergeRating, combo: number, rushHour: boolean, c: Config): number {
    let base: number;
    switch (rating) {
      case 'clean':
        base = c.pointsClean;
        break;
      case 'tightFit':
        base = c.pointsTightFit;
        break;
      case 'nearMiss':
        base = c.pointsNearMiss;
        break;
      case 'perfect':
        base = c.pointsPerfect;
        break;
      case 'cutOff':
        return 0;
    }
    const factor = Scoring.multiplier(combo, c) * (rushHour ? c.rushHourScoreFactor : 1);
    return Math.round(base * factor);
  },

  comboGain(rating: MergeRating, c: Config): number {
    switch (rating) {
      case 'clean':
        return c.comboClean;
      case 'tightFit':
        return c.comboTightFit;
      case 'nearMiss':
        return c.comboNearMiss;
      case 'perfect':
        return c.comboPerfect;
      case 'cutOff':
        return 0;
    }
  },

  extendsChain(rating: MergeRating): boolean {
    return rating === 'tightFit' || rating === 'nearMiss' || rating === 'perfect';
  },
};
