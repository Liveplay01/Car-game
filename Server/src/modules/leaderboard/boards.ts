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
      return { score, meta: { cars } };
    },
  },
  {
    id: 'daily',
    title: 'Daily Shift',
    period: (now, day) => `day:${dayOf(now, day)}`,
    parse(body, now) {
      const day = integerField(body, 'day', utcDay(now) - 1, utcDay(now) + 1);
      const score = integerField(body, 'score', 1, LIMITS.maxPointsPerCar * LIMITS.maxDailyCars);
      return { score, meta: {}, day };
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
];

export function boardById(id: string): BoardDef {
  const board = BOARDS.find((b) => b.id === id);
  if (!board) throw new ApiError(404, 'unknown_board', 'There is no such leaderboard.');
  return board;
}
