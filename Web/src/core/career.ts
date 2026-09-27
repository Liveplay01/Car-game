import { baseConfig, cloneConfig, type Config } from './config';
import { forLevel, upgraded, upgradePrice, upgradeMaxSteps, type Upgrade } from './levels';
import type { ShiftResult } from './events';
import type { ChestKind } from './loot';

export type GameMode = 'shift' | 'unlimited';

export interface MasteryStats {
  perfects: number;
  tightFits: number;
  nearMisses: number;
  takedowns: number;
  transporters: number;
  bestChain: number;
  bestCombo: number;
  shiftsCompleted: number;
}

export const MASTERY_GOALS = [
  { id: 'perfectTiming', name: 'Perfect Timing', unit: 'Perfect merges', stat: 'perfects', thresholds: [25, 150, 600] },
  { id: 'tightSpots', name: 'Tight Spots', unit: 'Tight Fits', stat: 'tightFits', thresholds: [25, 150, 600] },
  { id: 'closeCalls', name: 'Close Calls', unit: 'Near misses', stat: 'nearMisses', thresholds: [50, 300, 1200] },
  { id: 'longChain', name: 'Long Chain', unit: 'Best chain', stat: 'bestChain', thresholds: [8, 15, 25] },
  { id: 'crimeFighter', name: 'Crime Fighter', unit: 'Takedowns', stat: 'takedowns', thresholds: [10, 75, 300] },
  { id: 'secureRoute', name: 'Secure Route', unit: 'Transporters paid', stat: 'transporters', thresholds: [10, 75, 300] },
  { id: 'comboMaster', name: 'Combo Master', unit: 'Best combo', stat: 'bestCombo', thresholds: [20, 40, 80] },
  { id: 'veteran', name: 'Veteran', unit: 'Shifts completed', stat: 'shiftsCompleted', thresholds: [10, 75, 300] },
] as const satisfies readonly { id: string; name: string; unit: string; stat: keyof MasteryStats; thresholds: number[] }[];

export type MasteryGoalId = (typeof MASTERY_GOALS)[number]['id'];

export const masteryChest = (id: MasteryGoalId, tier: number): ChestKind =>
  id === 'crimeFighter' ? (tier < 2 ? 'criminalHunt' : 'premium') : tier === 0 ? 'standard' : 'premium';

export interface Records {
  bestScore: number;
  bestLevel: number;
  unlimitedBest: number;
  unlimitedCars: number;
  shiftsPlayed: number;
  totalMerges: number;
  moneyEarned: number;
  perfectRuns: number;
}

export interface Settings {
  sound: boolean;
  haptics: boolean;
  /** 'system' follows prefers-reduced-motion. */
  reduceMotion: 'system' | 'on' | 'off';
}

/** The player's progress across shifts: everything that is saved (`Career` in GameCore). */
export interface Career {
  version: 1;
  level: number;
  money: number;
  upgrades: Partial<Record<Upgrade, number>>;
  collection: string[];
  /** Up to five car skins worn at once: every normal car on the road wears one of them. */
  carSkins: string[];
  unseen: string[];
  chests: ChestKind[];
  chestsOpened: number;
  chestsSinceEpic: number;
  mastery: MasteryStats;
  masteryTiers: Partial<Record<MasteryGoalId, number>>;
  records: Records;
  settings: Settings;
  tutorialDone: boolean;
}

export const MAX_CAR_SKINS = 5;

export const newCareer = (): Career => ({
  version: 1,
  level: 1,
  money: 0,
  upgrades: {},
  collection: [],
  carSkins: [],
  unseen: [],
  chests: [],
  chestsOpened: 0,
  chestsSinceEpic: 0,
  mastery: { perfects: 0, tightFits: 0, nearMisses: 0, takedowns: 0, transporters: 0, bestChain: 0, bestCombo: 0, shiftsCompleted: 0 },
  masteryTiers: {},
  records: { bestScore: 0, bestLevel: 1, unlimitedBest: 0, unlimitedCars: 0, shiftsPlayed: 0, totalMerges: 0, moneyEarned: 0, perfectRuns: 0 },
  settings: { sound: true, haptics: true, reduceMotion: 'system' },
  tutorialDone: false,
});

export const upgradeSteps = (career: Career, u: Upgrade): number => career.upgrades[u] ?? 0;

/** The config of the next shift: level, then the bought upgrades, then the unlocked car types. */
export function shiftConfig(career: Career, mode: GameMode, seed: number): Config {
  const level = mode === 'unlimited' ? baseConfig.endlessLevel : career.level;
  let config = forLevel(baseConfig, level, seed);
  config = upgraded(config, (u) => upgradeSteps(career, u));
  config = cloneConfig(config);
  if (mode === 'unlimited') config.endless = true;
  if (career.collection.includes('sportsCar')) config.sportsCarShare = config.sportsCarShareOwned;
  if (career.collection.includes('compact')) config.compactShare = config.compactShareOwned;
  if (career.collection.includes('van')) config.vanShare = config.vanShareOwned;
  return config;
}

/** Price of the next step, or null once it is maxed out. */
export function nextUpgradePrice(career: Career, u: Upgrade): number | null {
  const steps = upgradeSteps(career, u);
  return steps >= upgradeMaxSteps[u] ? null : upgradePrice(u, steps + 1, baseConfig);
}

export interface ShiftRecord {
  levelUp: boolean;
  newBest: boolean;
  moneyEarned: number;
  masteryChests: { goal: MasteryGoalId; tier: number; chest: ChestKind }[];
}

/** Books a finished shift into the career: money, level, records and mastery tiers. */
export function recordShift(career: Career, mode: GameMode, result: ShiftResult): ShiftRecord {
  const record: ShiftRecord = { levelUp: false, newBest: false, moneyEarned: result.money, masteryChests: [] };
  career.money = Math.max(0, career.money + result.money);
  career.records.shiftsPlayed++;
  career.records.totalMerges += result.cleanMerges + result.tightFits + result.nearMisses + result.perfects;
  career.records.moneyEarned += Math.max(0, result.money);
  if (mode === 'unlimited') {
    if (result.score > career.records.unlimitedBest) {
      career.records.unlimitedBest = result.score;
      record.newBest = true;
    }
    career.records.unlimitedCars = Math.max(career.records.unlimitedCars, result.carsSent);
  } else {
    if (result.outcome === 'completed') {
      career.level++;
      record.levelUp = true;
      career.records.bestLevel = Math.max(career.records.bestLevel, career.level);
      if (result.isPerfectRun) career.records.perfectRuns++;
      // A highscore counts only for a shift driven to the end.
      if (result.score > career.records.bestScore) {
        career.records.bestScore = result.score;
        record.newBest = true;
      }
    }
  }
  const m = career.mastery;
  m.perfects += result.perfects;
  m.tightFits += result.tightFits;
  m.nearMisses += result.nearMisses;
  m.takedowns += result.takedowns;
  m.transporters += result.transporters;
  m.bestChain = Math.max(m.bestChain, result.bestChain);
  m.bestCombo = Math.max(m.bestCombo, result.bestCombo);
  if (result.outcome === 'completed' && mode === 'shift') m.shiftsCompleted++;
  for (const goal of MASTERY_GOALS) {
    let tier = career.masteryTiers[goal.id] ?? 0;
    while (tier < goal.thresholds.length && m[goal.stat] >= goal.thresholds[tier]) {
      const chest = masteryChest(goal.id, tier);
      career.chests.push(chest);
      record.masteryChests.push({ goal: goal.id, tier, chest });
      tier++;
    }
    career.masteryTiers[goal.id] = tier;
  }
  return record;
}
