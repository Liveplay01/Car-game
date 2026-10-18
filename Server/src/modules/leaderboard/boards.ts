import { ApiError } from '../../errors.ts';
import { integerField } from '../../http.ts';

/**
 * The leaderboards. A new board is one entry in `BOARDS`: what a score submission looks like and
 * what is believable. The rest (storage, ranking, routes, the game's list) needs no change.
 *
 * Anti-cheat is plausibility only (Leo, 30.09.2026): a score beyond what the rules allow is
 * refused, everything else is believed. Bad entries are removed by hand (`/v1/admin`).
 */

/** What `parse` hands back: the number boards are ranked by, and facts to show next to it. */
export interface ParsedScore {
  score: number;
  meta: Record<string, number>;
  /** The day a daily board's score belongs to (the player's own day: the Daily Shift follows local time). */
  day?: number;
}

const DAY_MS = 86_400_000;
const utcDay = (now: number): number => Math.floor(now / DAY_MS);
/** The day a daily list is for: the player's own, as long as it is today somewhere on Earth (one day either side of ours). */
const dayOf = (now: number, day: number | undefined): number => (day !== undefined && Math.abs(day - utcDay(now)) <= 1 ? day : utcDay(now));

export interface BoardDef {
  id: string;
  title: string;
  /**
   * Which list a score belongs on right now. 'all' is one list for ever; a daily board would
   * answer `day:<number>` so every day starts a fresh list. Only today and a day either side can be read (`dayOf`); older lists are deleted (`ScoreStore.purgeDaily`).
   */
  period(now: number, day?: number): string;
  /** The newest score replaces the old one even when it is lower (a balance, not a record). */
  latest?: true;
  /** Checks a submitted body (422 when it is impossible) and turns it into a score. */
  parse(body: Record<string, unknown>, now: number): ParsedScore;
}

/** The most the rules allow; generous on purpose (`core/config.ts` has the real values). */
export const LIMITS = {
  /** Career levels, and how many times a player can prestige. */
  maxLevel: 300,
  maxPrestige: 100,
  /** Unlimited: cars in one run, and points per car (best merge 150 × 3 combo × 2 rush hour, plus takedowns of 1000). */
  maxCars: 50_000,
  maxPointsPerCar: 5_000,
  /** The Daily Shift is a career shift: at most this many cars. */
  maxDailyCars: 60,
  /** Boss Rush in hundredths of a second: nobody clears eight bosses in under 30 seconds, or takes two hours. */
  rushMinCs: 3_000,
  rushMaxCs: 720_000,
  /** Casino profit: High Roller stakes go to 5,000,000 a round; a trillion is out of reach. */
  maxCasinoProfit: 1_000_000_000_000,
} as const;

/** A lower time must rank higher: the board ranks by the biggest number. */
const RUSH_BASE = 10_000_000;

/** Prestige counts first, then the level: 'Prestige 1 · Level 2' beats 'Prestige 0 · Level 49'. */
const PRESTIGE_STEP = 1000;

export const BOARDS: readonly BoardDef[] = [
  {
    id: 'shift-level',
    title: 'Shift level',
    period: () => 'all',
    parse(body) {
      const level = integerField(body, 'level', 1, LIMITS.maxLevel);
      const prestige = integerField(body, 'prestige', 0, LIMITS.maxPrestige);
      return { score: prestige * PRESTIGE_STEP + level, meta: { level, prestige } };
    },
  },
  {
    id: 'unlimited',
    title: 'Unlimited record',
    period: () => 'all',
    parse(body) {
      const cars = integerField(body, 'cars', 1, LIMITS.maxCars);
      const score = integerField(body, 'score', 1, LIMITS.maxPointsPerCar * cars);
      // A run that went on after a crash, for an ad (Leo, 18.10.2026), says so next to the score; older clients send none.
      const revived = body.revived === undefined ? 0 : integerField(body, 'revived', 0, 1);
      const meta: Record<string, number> = revived ? { cars, revived } : { cars };
      return { score, meta };
    },
  },
  {
    id: 'daily',
    title: 'Daily Shift',
    period: (now, day) => `day:${dayOf(now, day)}`,
    parse(body, now) {
      const day = integerField(body, 'day', utcDay(now) - 1, utcDay(now) + 1);
      const score = integerField(body, 'score', 1, LIMITS.maxPointsPerCar * LIMITS.maxDailyCars);
      // A second try (Leo, 16.10.2026: one ad a day) says so next to the score; older clients send none.
      const tries = body.tries === undefined ? 1 : integerField(body, 'tries', 1, 2);
      const meta: Record<string, number> = tries > 1 ? { tries } : {};
      return { score, meta, day };
    },
  },
  {
    id: 'rush',
    title: 'Boss Rush',
    period: () => 'all',
    parse(body) {
      const cs = integerField(body, 'cs', LIMITS.rushMinCs, LIMITS.rushMaxCs);
      return { score: RUSH_BASE - cs, meta: { cs } };
    },
  },
  {
    // Leo, 15.10.2026: who has won the most at the casino, all games together, minus what they lost.
    id: 'casino',
    title: 'Casino profit',
    period: () => 'all',
    latest: true,
    parse(body) {
      const profit = integerField(body, 'profit', -LIMITS.maxCasinoProfit, LIMITS.maxCasinoProfit);
      return { score: profit, meta: {} };
    },
  },
];

export function boardById(id: string): BoardDef {
  const board = BOARDS.find((b) => b.id === id);
  if (!board) throw new ApiError(404, 'unknown_board', 'There is no such leaderboard.');
  return board;
}
