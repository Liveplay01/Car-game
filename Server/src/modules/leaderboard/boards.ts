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
}

export interface BoardDef {
  id: string;
  title: string;
  /**
   * Which list a score belongs on right now. 'all' is one list for ever; a daily board would
   * answer `day:<number>` so every day starts a fresh list, and old days stay readable.
   */
  period(now: number): string;
  /** Checks a submitted body (422 when it is impossible) and turns it into a score. */
  parse(body: Record<string, unknown>): ParsedScore;
}

/** The most the rules allow; generous on purpose (`core/config.ts` has the real values). */
export const LIMITS = {
  /** Career levels, and how many times a player can prestige. */
  maxLevel: 300,
  maxPrestige: 100,
  /** Unlimited: cars in one run, and points per car (best merge 150 × 3 combo × 2 rush hour, plus takedowns of 1000). */
  maxCars: 50_000,
  maxPointsPerCar: 5_000,
} as const;

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
];

export function boardById(id: string): BoardDef {
  const board = BOARDS.find((b) => b.id === id);
  if (!board) throw new ApiError(404, 'unknown_board', 'There is no such leaderboard.');
  return board;
}
