import { type Config, BOSS_KINDS, baseConfig } from './config';
import { firstBossLevel, bossInBlackout } from './levels';
import { Rng } from './rng';
import type { EliteKind, Trial } from './trials';

/**
 * The Weekly Elite (Leo, 28.09.2026): one hard shift for the whole week, the same for everyone
 * (the seed comes from the week, no server). It changes every Monday, can be played as often as
 * you like, and pays once a week: money and a Premium Chest.
 */
export const ELITE_KINDS: EliteKind[] = ['flawless', 'precision', 'storm', 'gridlock', 'dragnet', 'boss'];

/** Weeks since 1970, starting on Mondays (day 4 was the first Monday). */
export const weekNumber = (day: number): number => Math.floor((day - 4) / 7);

/** Days until the next Monday, today included: 7 on a Monday, 1 on a Sunday. */
export const weekDaysLeft = (day: number): number => 7 - ((((day - 4) % 7) + 7) % 7);

export const weeklySeed = (week: number): number => (Math.imul(week, 0x2545f491) ^ 0x3ee7c1a5) >>> 0;

/** This week's shift. */
export function weeklyTrial(week: number, base: Config = baseConfig): Trial {
  const seed = weeklySeed(week);
  const rng = new Rng((seed ^ 0x0e117e5a) >>> 0);
  const elite = ELITE_KINDS[((week % ELITE_KINDS.length) + ELITE_KINDS.length) % ELITE_KINDS.length];
  const shift: Trial = {
    id: 'weekly',
    seed,
    reward: base.weeklyPay,
    elite,
    level: 20,
    cars: 20,
    rule: null,
    weather: 'clear',
    darkness: 'day',
    legendary: null,
    goal: { k: 'complete' },
  };
  switch (elite) {
    case 'flawless':
      return { ...shift, level: rng.int(16, 24), cars: rng.int(18, 22), rule: 'flawless' };
    case 'precision':
      return { ...shift, level: rng.int(10, 16), cars: 16, goal: { k: 'perfects', n: rng.int(5, 7) } };
    case 'storm':
      return { ...shift, level: rng.int(20, 28), cars: rng.int(18, 22), weather: 'storm', darkness: 'night' };
    case 'gridlock':
      return { ...shift, level: rng.int(18, 24), cars: rng.int(14, 18), legendary: 'gridlock' };
    case 'dragnet':
      return { ...shift, level: rng.int(18, 24), cars: rng.int(18, 22), legendary: 'dragnet' };
    case 'boss': {
      const kind = rng.pick(BOSS_KINDS);
      return { ...shift, level: firstBossLevel(kind, base), goal: { k: 'boss' }, darkness: bossInBlackout(kind) ? 'blackout' : 'day' };
    }
  }
}
