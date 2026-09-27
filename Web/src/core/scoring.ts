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
  nearMisses = 0;
  perfects = 0;
  takedowns = 0;
  transporters = 0;
  money = 0;
  policeCrashes = 0;
  chain = 0;
  bestChain = 0;
  costs = 0;
  covered = 0;

  get merges(): number {
    return this.cleanMerges + this.tightFits + this.nearMisses + this.perfects;
  }
}

/** The rating rules as pure functions (FOUNDATION.md 2.3). */
export const Scoring = {
  rate(minGap: number, gapBehind: number, gapAhead: number, c: Config): MergeRating {
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

  /** 0 for ×1, then one step per threshold reached (FOUNDATION.md 2.4). */
  tier(combo: number, c: Config): number {
    return c.comboThresholds.filter((t) => combo >= t).length;
  },

  multiplierOfTier(tier: number, c: Config): number {
    return tier === 0 ? 1 : c.comboMultipliers[tier - 1];
  },

  multiplier(combo: number, c: Config): number {
    return Scoring.multiplierOfTier(Scoring.tier(combo, c), c);
  },

  /** What you see on the island is what you get: the combo before this merge counts. */
  points(rating: MergeRating, combo: number, rushHour: boolean, c: Config): number {
    const base =
      rating === 'clean' ? c.pointsClean : rating === 'tightFit' ? c.pointsTightFit : rating === 'nearMiss' ? c.pointsNearMiss : c.pointsPerfect;
    const factor = Scoring.multiplier(combo, c) * (rushHour ? c.rushHourScoreFactor : 1);
    return Math.round(base * factor);
  },

  comboGain(rating: MergeRating, c: Config): number {
    return rating === 'clean' ? c.comboClean : rating === 'tightFit' ? c.comboTightFit : rating === 'nearMiss' ? c.comboNearMiss : c.comboPerfect;
  },

  extendsChain(rating: MergeRating): boolean {
    return rating !== 'clean';
  },
};
