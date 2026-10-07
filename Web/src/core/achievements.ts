import { type Config } from './config';
import { type Career, type GameMode, type SaveGame } from './career';
import type { ShiftResult } from './events';
import { COSMETICS } from './loot';
import { UPGRADES } from './levels';

/**
 * Achievements (Leo, 07.10.2026): small goals all along the way, in families of three to four
 * tiers, under Progress → Goals. They count what no other record keeps (wrecks, explosions,
 * weather, nights, money, builds, collecting) and pay a little money for each tier. Nothing here
 * is luck or a bonus on the road; the hard deeds stay the Feats, the long ones the Mastery.
 */
export interface Family {
  id: string;
  tiers: number[];
  value: (s: SaveGame) => number;
}

const stat =
  (key: string) =>
  (s: SaveGame): number =>
    s.career.stats[key] ?? 0;

export const FAMILIES: Family[] = [
  { id: 'scrapyard', tiers: [50, 250, 1000, 4000], value: stat('wrecks') },
  { id: 'fireworks', tiers: [5, 25, 100, 400], value: stat('blasts') },
  { id: 'spotless', tiers: [5, 25, 100, 400], value: stat('perfectRuns') },
  { id: 'jackpot', tiers: [1, 5, 20, 60], value: stat('jackpots') },
  { id: 'critical', tiers: [10, 50, 250, 1000], value: stat('criticals') },
  { id: 'wizard', tiers: [100, 1000, 5000, 20000], value: stat('cars') },
  { id: 'earner', tiers: [10000, 100000, 500000, 2000000], value: stat('earned') },
  { id: 'weatherproof', tiers: [10, 50, 200, 600], value: stat('badWeather') },
  { id: 'stormRider', tiers: [5, 25, 100, 300], value: stat('stormy') },
  { id: 'whiteout', tiers: [5, 25, 100, 300], value: stat('murky') },
  { id: 'moonlighter', tiers: [10, 50, 200, 600], value: stat('nights') },
  { id: 'lightsOut', tiers: [5, 25, 100, 300], value: stat('blackouts') },
  { id: 'cityLife', tiers: [10, 50, 200, 600], value: stat('events') },
  { id: 'longHaul', tiers: [120, 300, 600, 1200], value: stat('longRun') },
  { id: 'clockwork', tiers: [3, 10, 30, 100], value: stat('dailies') },
  { id: 'onARoll', tiers: [3, 7, 14, 30], value: (s) => Math.max(s.career.stats.streakBest ?? 0, s.career.dailyStreak) },
  { id: 'regular', tiers: [1, 4, 12, 40], value: (s) => s.career.weekliesDone },
  { id: 'testDriver', tiers: [1, 5, 10, 20], value: (s) => s.career.trialsDone.length },
  { id: 'hunter', tiers: [1, 4, 8], value: (s) => s.career.bossesBeaten.length },
  { id: 'roadBuilder', tiers: [1, 2, 3, 4], value: (s) => Math.max(0, s.career.armSlots.length - 4) },
  { id: 'foreman', tiers: [1, 3, 5, 6], value: (s) => Object.keys(s.career.modules).length },
  { id: 'tuner', tiers: [10, 30, 60, 86], value: (s) => UPGRADES.reduce((n, u) => n + (s.career.upgrades[u] ?? 0), 0) },
  { id: 'chestOpener', tiers: [5, 25, 100, 400], value: (s) => s.career.chestsOpened },
  { id: 'collector', tiers: [10, 30, 60, 100], value: (s) => COSMETICS.filter((x) => s.career.collection.includes(x.id)).length },
  { id: 'climber', tiers: [15, 30, 60, 100], value: (s) => Math.max(s.career.stats.levelBest ?? 0, s.career.level) },
  { id: 'elite', tiers: [1, 10, 30, 60], value: (s) => s.career.eliteClaimed },
  { id: 'reborn', tiers: [1, 3, 5, 10], value: (s) => s.career.prestige },
  { id: 'heatSeeker', tiers: [1, 3, 5, 8], value: (s) => s.career.heatCleared },
  { id: 'gambler', tiers: [10, 50, 200, 1000], value: (s) => s.career.casinoRounds },
  { id: 'zen', tiers: [100, 500, 2500, 10000], value: (s) => s.chillCars },
  { id: 'tourist', tiers: [1, 5, 15, 40], value: (s) => s.career.toursDone.length },
];

/** The counters kept in `Career.stats`. */
export const STAT_KEYS = ['wrecks', 'blasts', 'perfectRuns', 'jackpots', 'criticals', 'cars', 'earned', 'badWeather', 'stormy', 'murky', 'nights', 'blackouts', 'events', 'longRun', 'dailies', 'streakBest', 'levelBest'];

export const familyOf = (id: string): Family | undefined => FAMILIES.find((f) => f.id === id);

/** What each tier pays, first to last. */
export const TIER_PAY = [250, 600, 1500, 4000];

export const claimKey = (family: string, tier: number): string => `${family}.${tier}`;

/** The achievement tiers there are, and how many are paid. */
export const achievementTotal = (): number => FAMILIES.reduce((n, f) => n + f.tiers.length, 0);

export interface AchievementStep {
  family: string;
  /** 1 for the first tier. */
  tier: number;
  reward: number;
}

export const Achievements = {
  /** Tiers of a family already paid. */
  reached: (c: Career, f: Family): number => f.tiers.filter((_, i) => c.achievements.includes(claimKey(f.id, i + 1))).length,

  done: (c: Career): number => c.achievements.length,

  /** Pays every tier whose count has been reached and was not paid yet. */
  sync(save: SaveGame): AchievementStep[] {
    const c = save.career;
    c.stats.streakBest = Math.max(c.stats.streakBest ?? 0, c.dailyStreak);
    c.stats.levelBest = Math.max(c.stats.levelBest ?? 0, c.level);
    const steps: AchievementStep[] = [];
    for (const f of FAMILIES) {
      const have = f.value(save);
      f.tiers.forEach((need, i) => {
        const key = claimKey(f.id, i + 1);
        if (have < need || c.achievements.includes(key)) return;
        c.achievements.push(key);
        const reward = TIER_PAY[i];
        c.money += reward;
        steps.push({ family: f.id, tier: i + 1, reward });
      });
    }
    return steps;
  },

  /** Books what a finished career or Unlimited shift adds to the counters. */
  record(c: Career, r: ShiftResult, shift: Config, mode: GameMode): void {
    if (mode !== 'shift' && mode !== 'unlimited') return;
    const add = (key: string, n: number): void => {
      if (n > 0) c.stats[key] = (c.stats[key] ?? 0) + n;
    };
    add('wrecks', r.wrecks);
    add('blasts', r.blasts ?? 0);
    add('jackpots', r.jackpots);
    add('criticals', r.criticals);
    add('cars', r.carsSent);
    add('earned', r.money);
    if (r.isPerfectRun) add('perfectRuns', 1);
    if (mode === 'unlimited') c.stats.longRun = Math.max(c.stats.longRun ?? 0, Math.floor(r.time));
    if (mode !== 'shift' || r.outcome !== 'completed') return;
    const w = shift.weather;
    if (w !== 'clear') add('badWeather', 1);
    if (w === 'storm' || w === 'extreme' || w === 'hail' || w === 'sandstorm') add('stormy', 1);
    if (w === 'fog' || w === 'snow') add('murky', 1);
    if (shift.blackout) add('blackouts', 1);
    else if (shift.night) add('nights', 1);
    if (shift.cityEvent !== null) add('events', 1);
  },

  /** A Daily Shift cleared. */
  countDaily(c: Career): void {
    c.stats.dailies = (c.stats.dailies ?? 0) + 1;
  },
};
