import type { Career } from './career';
import { baseConfig, type Config } from './config';
import { Mafia } from './mafia';

/**
 * Systems that open with the level, so a new player meets them one at a time (Leo,
 * 29.09.2026): the Daily Shift, the Trials in Progress and the Casino in the Shop. Whoever
 * used one before it had a level keeps it.
 */
export const FEATURES = ['daily', 'trials', 'casino'] as const;
export type Feature = (typeof FEATURES)[number];

export const Unlocks = {
  level: (f: Feature, config: Config = baseConfig): number =>
    f === 'daily' ? config.dailyUnlockLevel : f === 'trials' ? config.trialsUnlockLevel : config.casinoUnlockLevel,

  isOpen(c: Career, f: Feature, config: Config = baseConfig): boolean {
    // A late loan shuts the Casino until it is paid (core/mafia.ts).
    if (f === 'casino' && Mafia.late(c)) return false;
    if (c.level >= Unlocks.level(f, config) || c.prestige > 0) return true;
    if (f === 'daily') return c.dailyPlayed >= 0 || c.dailyDone >= 0;
    if (f === 'trials') return c.trialsDone.length > 0;
    return c.casinoRounds > 0;
  },

  /** Everything open for this career right now. */
  open: (c: Career, config: Config = baseConfig): Feature[] => FEATURES.filter((f) => Unlocks.isOpen(c, f, config)),
};
