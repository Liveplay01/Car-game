import { baseConfig, BOSS_KINDS, FIRST_BOSSES, type Config } from './config';
import { type Career, type MasteryGoal, MASTERY_CLASSIC_TIERS, MASTERY_GOALS, MASTERY_THRESHOLDS } from './career';
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
  | 'starDriver'
  | 'ascended'
  | 'eternal'
  | 'grandmaster'
  | 'centurion'
  | 'immortal'
  | 'roadWarden'
  | 'gridlord'
  | 'ringbearer'
  | 'unstoppable'
  | 'timekeeper'
  | 'paragon'
  | 'mythic'
  | 'ringEternal'
  | 'mastermind'
  | 'summit'
  | 'syndicateEnd'
  | 'marathoner'
  | 'overdriver'
  | 'endless'
  | 'scorcher'
  | 'inferno'
  | 'meltdown'
  | 'sovereign'
  | 'timeless'
  | 'apex'
  | 'boundless';

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
  // Feats (core/feats.ts): the hardest titles in the game.
  'ascended',
  'eternal',
  'grandmaster',
  'centurion',
  'immortal',
  // Prestige from ★4 on (Leo, 02.10.2026): a title on every rank without a skin, and two beyond ★20.
  'roadWarden',
  'gridlord',
  'ringbearer',
  'unstoppable',
  'timekeeper',
  'paragon',
  'mythic',
  'ringEternal',
  // Every mastery at tier V.
  'mastermind',
  // The last Ascension trial (core/trials.ts).
  'summit',
  // Every boss of the syndicate, the four from Level 75 too.
  'syndicateEnd',
  // The Unlimited skins at 250, 500 and 1000 cars in one run.
  'marathoner',
  'overdriver',
  'endless',
  // Shifts cleared on Heat 3, 5 and 8.
  'scorcher',
  'inferno',
  'meltdown',
  // Past Elite 100 (Leo, 10.10.2026): the track goes on to 200, so nobody ends up with nothing to reach.
  'sovereign',
  'timeless',
  'apex',
  'boundless',
];

/** What earns a title. */
export type TitleRule =
  | { k: 'elite'; level: number }
  | { k: 'mastery'; goal: MasteryGoal }
  | { k: 'bosses'; all?: boolean }
  | { k: 'trial'; id: string }
  | { k: 'legendary'; shifts: number }
  | { k: 'prestige'; rank: number }
  /** An item of the collection: the Unlimited skins. */
  | { k: 'item'; id: string }
  /** A shift cleared at this Heat. */
  | { k: 'heat'; level: number }
  /** Every mastery goal at its last tier. */
  | { k: 'masteries' };

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
  ascended: { k: 'prestige', rank: 10 },
  eternal: { k: 'prestige', rank: 20 },
  grandmaster: { k: 'elite', level: 75 },
  centurion: { k: 'elite', level: 100 },
  immortal: { k: 'legendary', shifts: 50 },
  roadWarden: { k: 'prestige', rank: 6 },
  gridlord: { k: 'prestige', rank: 8 },
  ringbearer: { k: 'prestige', rank: 11 },
  unstoppable: { k: 'prestige', rank: 13 },
  timekeeper: { k: 'prestige', rank: 16 },
  paragon: { k: 'prestige', rank: 18 },
  mythic: { k: 'prestige', rank: 25 },
  ringEternal: { k: 'prestige', rank: 30 },
  mastermind: { k: 'masteries' },
  summit: { k: 'trial', id: 'ascension.10' },
  syndicateEnd: { k: 'bosses', all: true },
  marathoner: { k: 'item', id: 'endurance' },
  overdriver: { k: 'item', id: 'overdrive' },
  endless: { k: 'item', id: 'infinity' },
  scorcher: { k: 'heat', level: 3 },
  inferno: { k: 'heat', level: 5 },
  meltdown: { k: 'heat', level: 8 },
  sovereign: { k: 'elite', level: 125 },
  timeless: { k: 'elite', level: 150 },
  apex: { k: 'elite', level: 175 },
  boundless: { k: 'elite', level: 200 },
};


/** The last Elite level that brings a title or a skin; the track itself has no end. */
export const ELITE_LAST_MILESTONE = 200;

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

/** The track after a shift as the ring draws it: where its bar started, where it ends, what is missing. */
export interface EliteBar {
  /** The Elite level now. */
  level: number;
  /** How full the bar was at the start (0–1) and is at the end, within its level. */
  from: number;
  to: number;
  /** Levels climbed by this shift: the bar fills up, flares and starts over. */
  climbed: number;
  /** XP this shift earned, and XP still missing to the next level. */
  gained: number;
  left: number;
}

export const Elite = {
  /** Level 50 reached once: a Prestige later keeps the track open. */
  isOpen: (c: Career, config: Config = baseConfig): boolean => c.level >= config.prestigeLevel || c.prestige > 0,

  /**
   * Progressive (Leo, 03.10.2026): each Elite level asks `eliteXpGrowth` XP more than the one
   * before. The XP from `level` to the next one.
   */
  need: (level: number, config: Config = baseConfig): number => config.eliteXpPerLevel + config.eliteXpGrowth * (Math.max(1, level) - 1),

  /** All the Elite XP it takes to reach `level` (Elite 1 = 0). */
  xpTo: (level: number, config: Config = baseConfig): number => {
    const n = Math.max(0, level - 1);
    return n * config.eliteXpPerLevel + (config.eliteXpGrowth * n * (n - 1)) / 2;
  },

  /**
   * 0 before the track opens; Level 50 itself is Elite 1. Never below the levels already paid:
   * a save from before the curve keeps what it reached.
   */
  level(c: Career, config: Config = baseConfig): number {
    if (!Elite.isOpen(c, config)) return 0;
    let level = 1;
    while (c.eliteXp >= Elite.xpTo(level + 1, config)) level++;
    return Math.max(level, c.eliteClaimed);
  },

  /** XP into the current Elite level, and what the next one needs. */
  progress(c: Career, config: Config = baseConfig): { into: number; need: number } {
    const level = Math.max(1, Elite.level(c, config));
    return { into: Math.max(0, c.eliteXp - Elite.xpTo(level, config)), need: Elite.need(level, config) };
  },

  /** The track after a shift that began at `xpBefore` Elite XP (the career holds the XP after it). */
  bar(c: Career, xpBefore: number, config: Config = baseConfig): EliteBar {
    const level = Math.max(1, Elite.level(c, config));
    let start = 1;
    while (xpBefore >= Elite.xpTo(start + 1, config)) start++;
    start = Math.min(start, level);
    const fill = (xp: number, at: number): number => Math.min(1, Math.max(0, (xp - Elite.xpTo(at, config)) / Elite.need(at, config)));
    return {
      level,
      from: fill(xpBefore, start),
      to: fill(c.eliteXp, level),
      climbed: level - start,
      gained: c.eliteXp - xpBefore,
      left: Math.max(0, Elite.xpTo(level + 1, config) - c.eliteXp),
    };
  },

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
    for (let level = 1; level <= ELITE_LAST_MILESTONE; level++) if (eliteReward(level)) levels.add(level);
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
        // Tier III, as before tiers IV and V came (read here: career.ts imports this module).
        return (c.masteryTiers[rule.goal] ?? 0) >= MASTERY_CLASSIC_TIERS;
      case 'bosses':
        // Syndicate Breaker stays the first four; Syndicate's End asks for all eight.
        return (rule.all ? BOSS_KINDS : FIRST_BOSSES).every((k) => c.bossesBeaten.includes(k));
      case 'trial':
        return c.trialsDone.includes(rule.id);
      case 'legendary':
        return c.legendaryDone >= rule.shifts;
      case 'prestige':
        return c.prestige >= rule.rank;
      case 'heat':
        return c.heatCleared >= rule.level;
      case 'item':
        return c.collection.includes(rule.id);
      case 'masteries':
        return MASTERY_GOALS.every((g) => (c.masteryTiers[g] ?? 0) >= MASTERY_THRESHOLDS[g].length);
    }
  },

  titles: (c: Career, config: Config = baseConfig): TitleId[] => TITLES.filter((t) => Elite.titleEarned(t, c, config)),
};
