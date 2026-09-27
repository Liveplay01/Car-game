import { type Config, type Weather, type TrialRule, cloneConfig } from './config';
import type { ShiftResult } from './events';
import { type Darkness, forNight } from './levels';
import { Careers, newCareer } from './career';

/**
 * Mastery trials: fixed skill tests. Each is one set shift (level, seed, conditions) with a
 * goal and sometimes an extra rule; the seed is fixed, so everyone meets the same traffic, and
 * the world waits for the first tap. The career's upgrades and roads play no part: a trial
 * tests the player, not the build. Passing one pays its reward once.
 */
export type TrialId = 'tightSqueeze' | 'deadCentre' | 'cleanSheet' | 'blackout' | 'stormWatch' | 'marathon' | 'mostWanted';

export type TrialGoal =
  /** Complete the shift (the conditions or the rule make it hard). */
  | { k: 'complete' }
  /** Complete it with at least `n` Perfect merges. */
  | { k: 'perfects'; n: number }
  /** Take down the syndicate boss (a boss level). */
  | { k: 'boss' };

export interface Trial {
  id: TrialId;
  level: number;
  seed: number;
  cars: number;
  goal: TrialGoal;
  rule: TrialRule | null;
  weather: Weather;
  darkness: Darkness;
  reward: number;
}

export const TRIALS: Trial[] = [
  { id: 'tightSqueeze', level: 8, seed: 0x7a11a001, cars: 8, goal: { k: 'complete' }, rule: 'skilledOnly', weather: 'clear', darkness: 'day', reward: 1500 },
  { id: 'deadCentre', level: 6, seed: 0x7a11a002, cars: 12, goal: { k: 'perfects', n: 4 }, rule: null, weather: 'clear', darkness: 'day', reward: 1500 },
  { id: 'cleanSheet', level: 12, seed: 0x7a11a003, cars: 16, goal: { k: 'complete' }, rule: 'flawless', weather: 'clear', darkness: 'day', reward: 2500 },
  { id: 'blackout', level: 16, seed: 0x7a11a004, cars: 16, goal: { k: 'complete' }, rule: null, weather: 'clear', darkness: 'blackout', reward: 3000 },
  { id: 'stormWatch', level: 20, seed: 0x7a11a005, cars: 18, goal: { k: 'complete' }, rule: null, weather: 'storm', darkness: 'night', reward: 4000 },
  { id: 'marathon', level: 14, seed: 0x7a11a006, cars: 40, goal: { k: 'complete' }, rule: null, weather: 'clear', darkness: 'day', reward: 4000 },
  { id: 'mostWanted', level: 15, seed: 0x7a11a007, cars: 24, goal: { k: 'boss' }, rule: null, weather: 'clear', darkness: 'day', reward: 5000 },
];

export const TRIAL_IDS: TrialId[] = TRIALS.map((t) => t.id);
export const trial = (id: string): Trial | undefined => TRIALS.find((t) => t.id === id);

/** The shift of a trial: a fresh four-arm roundabout at its level, its conditions pinned. */
export function trialConfig(t: Trial, base: Config): Config {
  const career = { ...newCareer(), level: t.level };
  const shift = Careers.config(career, base, t.seed, t.weather, null);
  const c = cloneConfig(forNight(shift, t.darkness));
  c.shiftCars = t.cars;
  c.trialRule = t.rule;
  // The boss trial always brings the convoy; the others never do.
  c.convoy = t.goal.k === 'boss';
  c.criminalFirst = c.convoy ? base.convoyFirst : shift.criminalFirst;
  return c;
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
