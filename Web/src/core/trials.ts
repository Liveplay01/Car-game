import { type Config, type Weather, type TrialRule, type BossKind, type LegendaryRule, BOSS_KINDS, baseConfig, cloneConfig } from './config';
import type { ShiftResult } from './events';
import { type Darkness, forNight, forLegendary, firstBossLevel } from './levels';
import { Careers, newCareer } from './career';

/**
 * Mastery trials: fixed skill tests. Each is one set shift (level, seed, conditions) with a
 * goal and sometimes an extra rule; the seed is fixed, so everyone meets the same traffic, and
 * the world waits for the first tap. The career's upgrades and roads play no part: a trial
 * tests the player, not the build. Passing one pays its reward once.
 *
 * Boss rematches (Leo, 28.09.2026) are trials too: a syndicate boss the career has taken down,
 * again, one round of bosses later (more escorts, less time). The Weekly Elite (core/weekly.ts)
 * is a trial whose shift changes every Monday.
 */
export type TrialId = 'tightSqueeze' | 'deadCentre' | 'cleanSheet' | 'blackout' | 'stormWatch' | 'marathon' | 'mostWanted';
export type RematchId = `rematch.${BossKind}`;
/** Every run that is played like a trial. */
export type RunId = TrialId | RematchId | 'weekly';

/** The Weekly Elite's shapes, one per week in turn (core/weekly.ts). */
export type EliteKind = 'flawless' | 'precision' | 'storm' | 'gridlock' | 'dragnet' | 'boss';

export type TrialGoal =
  /** Complete the shift (the conditions or the rule make it hard). */
  | { k: 'complete' }
  /** Complete it with at least `n` Perfect merges. */
  | { k: 'perfects'; n: number }
  /** Take down the syndicate boss (a boss level). */
  | { k: 'boss' };

export interface Trial {
  id: RunId;
  level: number;
  seed: number;
  cars: number;
  goal: TrialGoal;
  rule: TrialRule | null;
  weather: Weather;
  darkness: Darkness;
  reward: number;
  /** A legendary rule on top (the Weekly Elite). */
  legendary: LegendaryRule | null;
  /** The Weekly Elite's shape, for its name and goal. */
  elite?: EliteKind;
}

const fixed = (t: Omit<Trial, 'legendary'>): Trial => ({ ...t, legendary: null });

export const TRIALS: Trial[] = [
  fixed({ id: 'tightSqueeze', level: 8, seed: 0x7a11a001, cars: 8, goal: { k: 'complete' }, rule: 'skilledOnly', weather: 'clear', darkness: 'day', reward: 1500 }),
  fixed({ id: 'deadCentre', level: 6, seed: 0x7a11a002, cars: 12, goal: { k: 'perfects', n: 4 }, rule: null, weather: 'clear', darkness: 'day', reward: 1500 }),
  fixed({ id: 'cleanSheet', level: 12, seed: 0x7a11a003, cars: 16, goal: { k: 'complete' }, rule: 'flawless', weather: 'clear', darkness: 'day', reward: 2500 }),
  fixed({ id: 'blackout', level: 16, seed: 0x7a11a004, cars: 16, goal: { k: 'complete' }, rule: null, weather: 'clear', darkness: 'blackout', reward: 3000 }),
  fixed({ id: 'stormWatch', level: 20, seed: 0x7a11a005, cars: 18, goal: { k: 'complete' }, rule: null, weather: 'storm', darkness: 'night', reward: 4000 }),
  fixed({ id: 'marathon', level: 14, seed: 0x7a11a006, cars: 40, goal: { k: 'complete' }, rule: null, weather: 'clear', darkness: 'day', reward: 4000 }),
  fixed({ id: 'mostWanted', level: 15, seed: 0x7a11a007, cars: 24, goal: { k: 'boss' }, rule: null, weather: 'clear', darkness: 'day', reward: 5000 }),
];

export const TRIAL_IDS: TrialId[] = TRIALS.map((t) => t.id as TrialId);

// MARK: Boss rematches

export const rematchId = (kind: BossKind): RematchId => `rematch.${kind}`;

const REMATCH_REWARD: Record<BossKind, number> = { convoy: 6000, getaway: 8000, armoured: 10000, phantom: 12000 };

/** A boss again, one round later: its level brings the harder version (more escorts, less time). */
export function rematch(kind: BossKind, base: Config = baseConfig): Trial {
  return {
    id: rematchId(kind),
    level: firstBossLevel(kind, base) + base.convoyEvery * BOSS_KINDS.length,
    seed: (0x7a11b001 + BOSS_KINDS.indexOf(kind)) >>> 0,
    cars: 20,
    goal: { k: 'boss' },
    rule: null,
    weather: 'clear',
    darkness: kind === 'phantom' ? 'blackout' : 'day',
    reward: REMATCH_REWARD[kind],
    legendary: null,
  };
}

export const REMATCHES: Trial[] = BOSS_KINDS.map((k) => rematch(k));
export const REMATCH_IDS: RematchId[] = BOSS_KINDS.map(rematchId);
export const rematchKind = (id: string): BossKind | null => BOSS_KINDS.find((k) => rematchId(k) === id) ?? null;

/** Every run that pays once and is remembered in `trialsDone`. */
export const RUN_IDS: string[] = [...TRIAL_IDS, ...REMATCH_IDS];

export const trial = (id: string): Trial | undefined => TRIALS.find((t) => t.id === id) ?? REMATCHES.find((t) => t.id === id);

/** The shift of a trial: a fresh four-arm roundabout at its level, its conditions pinned. */
export function trialConfig(t: Trial, base: Config): Config {
  const career = { ...newCareer(), level: t.level };
  const shift = Careers.config(career, base, t.seed, t.weather, null, null);
  const c = cloneConfig(forNight(shift, t.darkness));
  c.shiftCars = t.cars;
  c.trialRule = t.rule;
  // The boss trials always bring the convoy; the others never do.
  c.convoy = t.goal.k === 'boss';
  c.criminalFirst = c.convoy ? base.convoyFirst : shift.criminalFirst;
  // The legendary rule last: it reads the shift's car count.
  return forLegendary(c, t.legendary);
}

export function trialPassed(t: Trial, r: ShiftResult): boolean {
  if (r.outcome !== 'completed') return false;
  switch (t.goal.k) {
    case 'complete':
      return true;
    case 'perfects':
      return r.perfects >= t.goal.n;
    case 'boss':
      return r.bossBusted;
  }
}
