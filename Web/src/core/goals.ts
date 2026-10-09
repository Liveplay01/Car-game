import { type Config, baseConfig, cloneConfig } from './config';
import { type Career, type GameMode, type MasteryGoal, Careers, MASTERY_GOALS, MASTERY_THRESHOLDS, masteryValue } from './career';
import type { ShiftResult } from './events';

import { type Challenge, challengesOf, challengeReward } from './daily';
import type { Upgrade } from './levels';
import { Scoring } from './scoring';
import { type TierId, nextTier } from './tiers';

/**
 * Open loops (Leo, 28.09.2026): there is always a next thing within reach, and after a lost
 * shift the game says honestly how close it was. Read-only rules over the save; the
 * presentation decides where they show.
 */

/** The next goal the waiting card names: today's open challenge, else the nearest mastery tier. */
export type NextGoal =
  | { k: 'challenge'; challenge: Challenge; reward: number }
  | { k: 'mastery'; goal: MasteryGoal; have: number; need: number };

/** The upgrade the money is closest to, and how much is still missing. */
export interface MoneyGoal {
  upgrade: Upgrade;
  short: number;
}

/** How close a lost shift came, the most striking fact first. */
export type NearMiss =
  | { k: 'cars'; left: number; level: number }
  | { k: 'best'; short: number }
  | { k: 'combo'; short: number; multiplier: number };

export const Goals = {
  /** The first of today's challenges not done yet. */
  openChallenge(c: Career, day: number): Challenge | null {
    return challengesOf(day).find((ch) => !Careers.isChallengeDone(c, ch, day)) ?? null;
  },

  /** The mastery goal nearest its next tier. */
  nearestMastery(c: Career): { goal: MasteryGoal; have: number; need: number } | null {
    let best: { goal: MasteryGoal; have: number; need: number } | null = null;
    let bestShare = -1;
    for (const goal of MASTERY_GOALS) {
      const tier = c.masteryTiers[goal] ?? 0;
      const need = MASTERY_THRESHOLDS[goal][tier];
      if (need === undefined) continue;
      const have = Math.min(masteryValue(goal, c.mastery), need);
      const share = have / need;
      if (share > bestShare) {
        best = { goal, have, need };
        bestShare = share;
      }
    }
    return best;
  },

  next(c: Career, day: number): NextGoal | null {
    const challenge = Goals.openChallenge(c, day);
    if (challenge) return { k: 'challenge', challenge, reward: challengeReward(challenge) };
    const mastery = Goals.nearestMastery(c);
    return mastery ? { k: 'mastery', ...mastery } : null;
  },

  /** The cheapest upgrade on offer that the money does not reach yet; null when one is affordable. */
  money(c: Career, config: Config = baseConfig): MoneyGoal | null {
    let best: MoneyGoal | null = null;
    for (const upgrade of Careers.availableUpgrades(c, config)) {
      const price = Careers.priceOf(c, upgrade, config);
      if (price === null) continue;
      if (price <= c.money) return null;
      const short = price - c.money;
      if (!best || short < best.short) best = { upgrade, short };
    }
    return best;
  },

  /** After an Unlimited run: how few cars it was short of the tier above the best, when it came within a quarter of it. */
  tierMiss(carsSent: number, bestCars: number): { short: number; tier: TierId } | null {
    const next = nextTier(bestCars);
    return next && carsSent < next.cars && carsSent >= next.cars * 0.75 ? { short: next.cars - carsSent, tier: next.id } : null;
  },

  /**
   * After a lost shift: the cars that were still missing, the points to the best, or the
   * combo one step short of the next multiplier. Null when it was not close.
   */
  nearMiss(r: ShiftResult, shiftCars: number, level: number, best: number, config: Config): NearMiss | null {
    if (r.outcome === 'completed') return null;
    // A crash has to be done again: the car that crashed still counts as missing.
    const left = Math.max(1, shiftCars - r.carsSent + (r.outcome === 'struckOut' ? 1 : 0));
    if (shiftCars > 0 && left <= 3) return { k: 'cars', left, level };
    if (best > 0 && r.score < best && best - r.score <= best * 0.15) return { k: 'best', short: best - r.score };
    const next = config.comboThresholds.find((t) => t > r.bestCombo);
    if (next !== undefined && r.bestCombo > 0 && next - r.bestCombo <= 2) {
      const tier = Scoring.tier(next, config);
      return { k: 'combo', short: next - r.bestCombo, multiplier: Scoring.multiplierOfTier(tier, config) };
    }
    if (shiftCars > 0 && left <= Math.ceil(shiftCars * 0.4)) return { k: 'cars', left, level };
    return null;
  },

  // MARK: Daily streak

  /** The streak as it stands today: gone once more days were missed than Streak Freezes cover. */
  streak: (c: Career, day: number): number => (day - c.dailyPlayed - 1 <= c.streakFreezes ? c.dailyStreak : 0),

  /** A long enough streak pays more on every shift, as long as it lives. */
  streakBonus: (c: Career, day: number, config: Config = baseConfig): boolean => Goals.streak(c, day) >= Math.max(1, config.streakBonusDays),

  /** Yesterday counted, today's Daily Shift is still open and no Freeze waits: the streak breaks at midnight. */
  streakAtRisk: (c: Career, day: number): boolean => c.dailyStreak > 0 && c.dailyPlayed === day - 1 && c.streakFreezes === 0,

  /** The next shift pays more: Tailwind waits, and this one is a plain career shift. */
  tailwindOn: (c: Career, mode: GameMode, daily: boolean): boolean => c.tailwind && mode === 'shift' && !daily,

  /** Days of streak until the next Streak Freeze, null while the stock is full. */
  daysToFreeze: (c: Career, config: Config = baseConfig): number | null =>
    c.streakFreezes >= config.streakFreezeMax ? null : c.dailyStreak < config.streakFreezeFirst ? config.streakFreezeFirst - c.dailyStreak : config.streakFreezeEvery - (c.dailyStreak % config.streakFreezeEvery),

  /** This shift with the streak bonus on its pay. */
  forStreak: (base: Config): Config => Goals.forPay(base, base.streakBonusPay),

  /** This shift with `bonus` (0.15 = 15 %) more on its pay. */
  forPay(base: Config, bonus: number): Config {
    const c = cloneConfig(base);
    const f = 1 + bonus;
    c.shiftPay = Math.round(base.shiftPay * f);
    c.transporterPay = Math.round(base.transporterPay * f);
    c.shieldBonus = Math.round(base.shieldBonus * f);
    c.ambulancePay = Math.round(base.ambulancePay * f);
    return c;
  },
};
