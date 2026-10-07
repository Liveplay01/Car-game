import { type Config, type Weather, type TrialRule, type BossKind, type LegendaryRule, BOSS_KINDS, FIRST_BOSSES, baseConfig, cloneConfig } from './config';
import type { ShiftResult } from './events';
import { type Darkness, forNight, forLegendary, firstBossLevel, applyBoss, bossInBlackout } from './levels';
import { type Career, Careers, newCareer } from './career';

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
/** An Ascension trial: one per Prestige rank (`ascension.1` … `ascension.10`). */
export type AscensionId = `ascension.${number}`;
/** A Landmark: a famous roundabout, played as a trial (`landmark.etoile`). */
export type LandmarkId = 'landmark.etoile';
/** Every run that is played like a trial. */
/** A stop of a Tour (`tour.halloween.3`, core/tours.ts). */
export type TourStopId = `tour.${string}.${number}`;
export type RunId = TrialId | RematchId | AscensionId | LandmarkId | TourStopId | 'weekly';

/** The Weekly Elite's shapes, one per week in turn (core/weekly.ts). */
export type EliteKind = 'flawless' | 'precision' | 'storm' | 'gridlock' | 'dragnet' | 'boss';

export type TrialGoal =
  /** Complete the shift (the conditions or the rule make it hard). */
  | { k: 'complete' }
  /** Complete it with at least `n` Perfect merges. */
  | { k: 'perfects'; n: number }
  /** Complete it with at least `n` merges a Tight Fit or better (a clean merge just does not count). */
  | { k: 'skilled'; n: number }
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
  /** A roundabout with this many arms, spaced evenly, instead of the four of a trial (a Landmark). */
  arms?: number;
  /** How much of the traffic those arms would bring: twelve roads at full strength would crash even the careful bot. */
  traffic?: number;
  /** A stop of a Tour: which run of it (`halloween-2026`), the stop (1…), and the map its scene wears. */
  tour?: { key: string; stop: number; map: string | null };
  /** The boss this shift pins (a Tour stop); a rematch pins its own. */
  boss?: BossKind;
}

const fixed = (t: Omit<Trial, 'legendary'>): Trial => ({ ...t, legendary: null });

/**
 * Easiest first, and each opens at its own level (`trialOpen`), so the list grows with the
 * player instead of showing seven at once (Leo, 29.09.2026: Tight Squeeze held many up; it
 * wanted every merge a Tight Fit, one clean merge failed it, and it stood at the top).
 */
export const TRIALS: Trial[] = [
  fixed({ id: 'deadCentre', level: 6, seed: 0x7a11a002, cars: 12, goal: { k: 'perfects', n: 4 }, rule: null, weather: 'clear', darkness: 'day', reward: 1500 }),
  fixed({ id: 'tightSqueeze', level: 8, seed: 0x7a11a001, cars: 8, goal: { k: 'skilled', n: 5 }, rule: null, weather: 'clear', darkness: 'day', reward: 1500 }),
  fixed({ id: 'cleanSheet', level: 12, seed: 0x7a11a003, cars: 16, goal: { k: 'complete' }, rule: 'flawless', weather: 'clear', darkness: 'day', reward: 2500 }),
  fixed({ id: 'marathon', level: 14, seed: 0x7a11a006, cars: 40, goal: { k: 'complete' }, rule: null, weather: 'clear', darkness: 'day', reward: 4000 }),
  fixed({ id: 'mostWanted', level: 15, seed: 0x7a11a007, cars: 24, goal: { k: 'boss' }, rule: null, weather: 'clear', darkness: 'day', reward: 5000 }),
  fixed({ id: 'blackout', level: 16, seed: 0x7a11a004, cars: 16, goal: { k: 'complete' }, rule: null, weather: 'clear', darkness: 'blackout', reward: 3000 }),
  fixed({ id: 'stormWatch', level: 20, seed: 0x7a11a005, cars: 18, goal: { k: 'complete' }, rule: null, weather: 'storm', darkness: 'night', reward: 4000 }),
];

/**
 * A trial can be played from its own level on (the Trials section itself opens at
 * `trialsUnlockLevel`). One passed before, or a Prestige, keeps it open.
 */
export const trialOpen = (t: Trial, c: Career): boolean => {
  const rank = ascensionRank(t.id);
  if (rank !== null) return c.prestige >= rank || c.trialsDone.includes(t.id);
  if (landmarkOf(t.id)) return c.prestige >= LANDMARK_PRESTIGE || c.trialsDone.includes(t.id);
  return c.level >= t.level || c.prestige > 0 || c.trialsDone.includes(t.id);
};

export const TRIAL_IDS: TrialId[] = TRIALS.map((t) => t.id as TrialId);

// MARK: Boss rematches

export const rematchId = (kind: BossKind): RematchId => `rematch.${kind}`;

const REMATCH_REWARD: Record<BossKind, number> = {
  convoy: 6000,
  getaway: 8000,
  armoured: 10000,
  phantom: 12000,
  twins: 14000,
  decoy: 16000,
  smuggler: 18000,
  kingpin: 25000,
};

/**
 * A boss again, one round later: more escorts, less time. The boss is pinned (`trialConfig`), so
 * the level stays where it was before the syndicate grew to eight (its own level + 60).
 */
export function rematch(kind: BossKind, base: Config = baseConfig): Trial {
  return {
    id: rematchId(kind),
    level: firstBossLevel(kind, base) + base.convoyEvery * FIRST_BOSSES.length,
    seed: (0x7a11b001 + BOSS_KINDS.indexOf(kind)) >>> 0,
    cars: 20,
    goal: { k: 'boss' },
    rule: null,
    weather: 'clear',
    darkness: bossInBlackout(kind) ? 'blackout' : 'day',
    reward: REMATCH_REWARD[kind],
    legendary: null,
  };
}

export const REMATCHES: Trial[] = BOSS_KINDS.map((k) => rematch(k));
export const REMATCH_IDS: RematchId[] = BOSS_KINDS.map(rematchId);
export const rematchKind = (id: string): BossKind | null => BOSS_KINDS.find((k) => rematchId(k) === id) ?? null;

/** Every run that pays once and is remembered in `trialsDone`. */
// MARK: Ascension trials

/**
 * Ascension (Leo, 02.10.2026): one fixed, very hard shift per Prestige rank, ★1 to ★10, for the
 * players past the first ranks (Prestige stops making the traffic harder at ★4). Each opens with
 * its rank, is played on a fresh four-arm roundabout like every trial, and pays once; the last
 * one gives the title Summit (core/elite.ts). Levels 66 to 120: two lanes from the fourth on.
 */
export const ASCENSION_RANKS = 10;

const ASCENSION_PLAN: Omit<Trial, 'id' | 'seed' | 'reward'>[] = [
  { level: 66, cars: 20, goal: { k: 'complete' }, rule: null, weather: 'storm', darkness: 'night', legendary: null },
  { level: 72, cars: 22, goal: { k: 'complete' }, rule: null, weather: 'clear', darkness: 'blackout', legendary: null },
  { level: 78, cars: 22, goal: { k: 'complete' }, rule: null, weather: 'snow', darkness: 'day', legendary: null },
  { level: 84, cars: 24, goal: { k: 'complete' }, rule: null, weather: 'fog', darkness: 'day', legendary: 'gridlock' },
  { level: 90, cars: 24, goal: { k: 'boss' }, rule: null, weather: 'clear', darkness: 'day', legendary: null },
  { level: 96, cars: 26, goal: { k: 'complete' }, rule: 'flawless', weather: 'clear', darkness: 'day', legendary: null },
  { level: 102, cars: 26, goal: { k: 'complete' }, rule: null, weather: 'extreme', darkness: 'day', legendary: null },
  { level: 108, cars: 28, goal: { k: 'complete' }, rule: null, weather: 'clear', darkness: 'night', legendary: 'dragnet' },
  { level: 114, cars: 28, goal: { k: 'complete' }, rule: null, weather: 'heavyRain', darkness: 'day', legendary: 'heavyLoad' },
  { level: 120, cars: 30, goal: { k: 'complete' }, rule: null, weather: 'storm', darkness: 'blackout', legendary: 'darkStorm' },
];

export const ascensionId = (rank: number): AscensionId => `ascension.${rank}`;

/** The Prestige rank an Ascension trial belongs to; null for any other run. */
export function ascensionRank(id: string): number | null {
  const m = /^ascension\.(\d+)$/.exec(id);
  const rank = m ? Number(m[1]) : NaN;
  return rank >= 1 && rank <= ASCENSION_RANKS ? rank : null;
}

export const ASCENSIONS: Trial[] = ASCENSION_PLAN.map((plan, i) => ({
  ...plan,
  id: ascensionId(i + 1),
  seed: (0x7a11c001 + i) >>> 0,
  reward: 10000 + 5000 * (i + 1),
}));

export const ASCENSION_IDS: AscensionId[] = ASCENSIONS.map((t) => t.id as AscensionId);

// MARK: Landmarks

/**
 * Landmarks (Leo, 03.10.2026): famous roundabouts as one fixed, hard shift each, for players who
 * have been through Prestige five times. The Étoile around the Arc de Triomphe has twelve roads
 * into one wide ring; the traffic of twelve roads scales like a built-out junction (`forArms`), then
 * eases to about twice the usual (`traffic`): the careful bot crashed in one shift of eight at full strength.
 * Each pays once. They are played on a fresh roundabout like every trial, without upgrades.
 */
export const LANDMARK_PRESTIGE = 5;

export const LANDMARKS: Trial[] = [
  { id: 'landmark.etoile', level: 60, seed: 0x7a11d001, cars: 24, goal: { k: 'complete' }, rule: null, weather: 'clear', darkness: 'day', reward: 40000, legendary: null, arms: 12, traffic: 0.65 },
];

export const LANDMARK_IDS: LandmarkId[] = LANDMARKS.map((t) => t.id as LandmarkId);

/** The landmark an id names; null for any other run. */
export const landmarkOf = (id: string): Trial | null => LANDMARKS.find((t) => t.id === id) ?? null;

// MARK: Boss Rush

/**
 * Boss Rush (Leo, 03.10.2026): every syndicate boss, one after the other, the rematches back to
 * back. Opens once all eight have been taken down. Lose a round and the rush starts over at the
 * first boss; the clock counts the shifts you finish. A first clear pays once; the best time is kept.
 * The shifts are the rematches (`rematch`), but they pay nothing of their own here.
 */
export const RUSH_ID = 'bossRush';
export const RUSH_REWARD = 60000;
export const rushOpen = (c: Career): boolean => BOSS_KINDS.every((k) => c.bossesBeaten.includes(k));
/** The shift of boss number `step` (0 first) in a rush. */
export const rushTrial = (step: number): Trial => rematch(BOSS_KINDS[Math.max(0, Math.min(BOSS_KINDS.length - 1, step))]);

export const RUN_IDS: string[] = [...TRIAL_IDS, ...REMATCH_IDS, ...ASCENSION_IDS, ...LANDMARK_IDS, RUSH_ID];

export const trial = (id: string): Trial | undefined =>
  TRIALS.find((t) => t.id === id) ?? REMATCHES.find((t) => t.id === id) ?? ASCENSIONS.find((t) => t.id === id) ?? landmarkOf(id) ?? undefined;

/** The shift of a trial: a fresh four-arm roundabout (a Landmark: its own) at its level, its conditions pinned. */
export function trialConfig(t: Trial, base: Config): Config {
  const career = { ...newCareer(), level: t.level };
  if (t.arms) {
    // Evenly spaced around the ring: as many slots as arms, each one built.
    base = { ...cloneConfig(base), armSlotCount: t.arms, armSlotSpacing: 1 };
    career.armSlots = Array.from({ length: t.arms }, (_, i) => i);
  }
  const shift = Careers.config(career, base, t.seed, t.weather, null, null);
  const c = cloneConfig(forNight(shift, t.darkness));
  c.shiftCars = t.cars;
  if (t.traffic) {
    c.densityStart = Math.round(c.densityStart * t.traffic);
    c.densityEnd = Math.round(c.densityEnd * t.traffic);
    c.minRingBots = Math.max(3, Math.round(c.minRingBots * t.traffic));
  }
  c.trialRule = t.rule;
  // The boss trials always bring the convoy; the others never do. A rematch is its own boss, one round on.
  c.convoy = t.goal.k === 'boss';
  c.criminalFirst = c.convoy ? base.convoyFirst : shift.criminalFirst;
  const pinned = rematchKind(t.id) ?? t.boss ?? null;
  if (pinned) applyBoss(c, base, pinned, 1);
  // The legendary rule last: it reads the shift's car count.
  return forLegendary(c, t.legendary);
}

/**
 * How far a counting goal is while the trial runs (Perfects, or Tight Fits or better), for the
 * live counter under the top card; null for goals that only the end decides.
 */
export function trialProgress(t: Trial, s: { tightFits: number; nearMisses: number; perfects: number }): { have: number; need: number } | null {
  switch (t.goal.k) {
    case 'perfects':
      return { have: s.perfects, need: t.goal.n };
    case 'skilled':
      return { have: s.tightFits + s.nearMisses + s.perfects, need: t.goal.n };
    default:
      return null;
  }
}

export function trialPassed(t: Trial, r: ShiftResult): boolean {
  if (r.outcome !== 'completed') return false;
  switch (t.goal.k) {
    case 'complete':
      return true;
    case 'perfects':
      return r.perfects >= t.goal.n;
    case 'skilled':
      return r.tightFits + r.nearMisses + r.perfects >= t.goal.n;
    case 'boss':
      return r.bossBusted;
  }
}
