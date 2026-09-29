import { baseConfig, BOSS_KINDS, type Config } from './config';
import type { Career, MasteryGoal } from './career';
import type { ShiftResult } from './events';
import { type ChestKind, type Cosmetic, eliteReward } from './loot';

/**
 * The Elite track (Leo, 29.09.2026): Level 50 opens it, and from then on every shift earns
 * Elite XP. Prestige keeps it, so starting over no longer costs the progress. Every Elite level
 * pays a chest; the milestones bring something to see (a title or a skin). Never a bonus on the road.
 */

/** Titles: each one names a deed the save can prove. */
export type TitleId =
  | 'eliteDriver'
  | 'roadVeteran'
  | 'ringMaster'
  | 'ironNerves'
  | 'roadRoyalty'
  | 'livingLegend'
  | 'precisionDriver'
  | 'comboMaster'
  | 'closeCallArtist'
  | 'syndicateBreaker'
  | 'nightOwl'
  | 'stormChaser'
  | 'legendHunter'
  | 'starDriver';

export const TITLES: TitleId[] = [
  'eliteDriver',
  'roadVeteran',
  'ringMaster',
  'ironNerves',
  'roadRoyalty',
  'livingLegend',
  'precisionDriver',
  'comboMaster',
  'closeCallArtist',
  'syndicateBreaker',
  'nightOwl',
  'stormChaser',
  'legendHunter',
  'starDriver',
];

/** What earns a title. */
export type TitleRule =
  | { k: 'elite'; level: number }
  | { k: 'mastery'; goal: MasteryGoal }
  | { k: 'bosses' }
  | { k: 'trial'; id: string }
  | { k: 'legendary'; shifts: number }
  | { k: 'prestige'; rank: number };

export const TITLE_RULES: Record<TitleId, TitleRule> = {
  eliteDriver: { k: 'elite', level: 1 },
  roadVeteran: { k: 'elite', level: 10 },
  ringMaster: { k: 'elite', level: 20 },
  ironNerves: { k: 'elite', level: 30 },
  roadRoyalty: { k: 'elite', level: 40 },
  livingLegend: { k: 'elite', level: 50 },
  precisionDriver: { k: 'mastery', goal: 'perfectTiming' },
  comboMaster: { k: 'mastery', goal: 'comboMaster' },
  closeCallArtist: { k: 'mastery', goal: 'closeCalls' },
  syndicateBreaker: { k: 'bosses' },
  nightOwl: { k: 'trial', id: 'blackout' },
  stormChaser: { k: 'trial', id: 'stormWatch' },
  legendHunter: { k: 'legendary', shifts: 15 },
  starDriver: { k: 'prestige', rank: 3 },
};

/** The top tier of every mastery goal (`MASTERY_THRESHOLDS` has three). */
const MASTERY_TOP = 3;

/** What one Elite level pays. */
export interface EliteStep {
  level: number;
  chest: ChestKind;
  title: TitleId | null;
  item: Cosmetic | null;
}

/** Everything that happened on the track after a shift. */
export interface EliteGain {
  xp: number;
  steps: EliteStep[];
}

export const Elite = {
  /** Level 50 reached once: a Prestige later keeps the track open. */
  isOpen: (c: Career, config: Config = baseConfig): boolean => c.level >= config.prestigeLevel || c.prestige > 0,

  /** 0 before the track opens; Level 50 itself is Elite 1. */
  level: (c: Career, config: Config = baseConfig): number => (Elite.isOpen(c, config) ? 1 + Math.floor(c.eliteXp / config.eliteXpPerLevel) : 0),

  /** XP into the current Elite level, and what the next one needs. */
  progress: (c: Career, config: Config = baseConfig): { into: number; need: number } => ({
    into: c.eliteXp % config.eliteXpPerLevel,
    need: config.eliteXpPerLevel,
  }),

  /** The XP a finished shift earns: skill counts even when the shift was lost. */
  xpOf(r: ShiftResult, config: Config = baseConfig): number {
    const completed = r.outcome === 'completed';
    return (
      r.perfects +
      r.tightFits +
      (completed ? config.eliteXpCompleted : 0) +
      (r.bossBusted ? config.eliteXpBoss : 0) +
      (completed && r.legendary ? config.eliteXpLegendary : 0)
    );
  },

  /** What reaching `level` pays, whether or not it is reached yet. */
  step(level: number, config: Config = baseConfig): EliteStep {
    const title = TITLES.find((t) => {
      const rule = TITLE_RULES[t];
      return rule.k === 'elite' && rule.level === level;
    });
    return {
      level,
      chest: level % config.elitePremiumEvery === 0 ? 'premium' : 'standard',
      title: title ?? null,
      item: eliteReward(level) ?? null,
    };
  },

  /** The Elite levels that bring a title or a skin, in order. */
  milestones(): number[] {
    const levels = new Set<number>();
    for (const t of TITLES) {
      const rule = TITLE_RULES[t];
      if (rule.k === 'elite') levels.add(rule.level);
    }
    for (let level = 1; level <= 100; level++) if (eliteReward(level)) levels.add(level);
    return [...levels].sort((a, b) => a - b);
  },

  /** The next milestone above the current Elite level, if any is left. */
  nextMilestone(c: Career, config: Config = baseConfig): EliteStep | null {
    const now = Elite.level(c, config);
    const next = Elite.milestones().find((l) => l > now);
    return next === undefined ? null : Elite.step(next, config);
  },

  titleEarned(id: TitleId, c: Career, config: Config = baseConfig): boolean {
    const rule = TITLE_RULES[id];
    switch (rule.k) {
      case 'elite':
        return Elite.level(c, config) >= rule.level;
      case 'mastery':
        return (c.masteryTiers[rule.goal] ?? 0) >= MASTERY_TOP;
      case 'bosses':
        return BOSS_KINDS.every((k) => c.bossesBeaten.includes(k));
      case 'trial':
        return c.trialsDone.includes(rule.id);
      case 'legendary':
        return c.legendaryDone >= rule.shifts;
      case 'prestige':
        return c.prestige >= rule.rank;
    }
  },

  titles: (c: Career, config: Config = baseConfig): TitleId[] => TITLES.filter((t) => Elite.titleEarned(t, c, config)),
};
