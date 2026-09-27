import { baseConfig, cloneConfig, type Config, type RoadModule, type Weather, type CityEvent, modulePrice } from './config';
import {
  forLevel,
  upgraded,
  upgradePrice,
  upgradeMaxSteps,
  upgradeUnlockLevel,
  UPGRADES,
  type Upgrade,
  forArms,
  forWeather,
  forNight,
  drawNight,
  forCityEvent,
  drawWeather,
  drawCityEvent,
  forCashBoost,
  armPrice as configArmPrice,
  canBuildArm,
} from './levels';
import type { ShiftResult } from './events';
import {
  type ChestKind,
  type ChestOpening,
  type Album,
  ALBUMS,
  ALBUM_REWARD,
  albumItems,
  cosmetic,
  rollChest,
  DUPLICATE_MONEY,
  MAX_CAR_SKINS,
  COSMETICS,
} from './loot';
import { type Challenge, challengesOf, challengeMet, challengeReward, STREAK_MILESTONES } from './daily';
import { type StoreProduct, isConsumable, productGrant, type AdReward } from './store';

export type GameMode = 'shift' | 'unlimited' | 'mayhem';
export const GAME_MODES: GameMode[] = ['shift', 'unlimited', 'mayhem'];

export type ReduceMotion = 'system' | 'on' | 'off';

export interface Settings {
  sound: boolean;
  haptics: boolean;
  reduceMotion: ReduceMotion;
  vehicleLabels: boolean;
}

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

export type MasteryGoal = 'perfectTiming' | 'tightSpots' | 'closeCalls' | 'longChain' | 'crimeFighter' | 'secureRoute' | 'comboMaster' | 'veteran';
export const MASTERY_GOALS: MasteryGoal[] = ['perfectTiming', 'tightSpots', 'closeCalls', 'longChain', 'crimeFighter', 'secureRoute', 'comboMaster', 'veteran'];

export const MASTERY_THRESHOLDS: Record<MasteryGoal, number[]> = {
  perfectTiming: [25, 150, 600],
  tightSpots: [25, 150, 600],
  closeCalls: [50, 300, 1200],
  longChain: [8, 15, 25],
  crimeFighter: [10, 75, 300],
  secureRoute: [10, 75, 300],
  comboMaster: [20, 40, 80],
  veteran: [10, 75, 300],
};

export function masteryValue(goal: MasteryGoal, s: MasteryStats): number {
  switch (goal) {
    case 'perfectTiming':
      return s.perfects;
    case 'tightSpots':
      return s.tightFits;
    case 'closeCalls':
      return s.nearMisses;
    case 'longChain':
      return s.bestChain;
    case 'crimeFighter':
      return s.takedowns;
    case 'secureRoute':
      return s.transporters;
    case 'comboMaster':
      return s.bestCombo;
    case 'veteran':
      return s.shiftsCompleted;
  }
}

export const masteryChest = (goal: MasteryGoal, tier: number): ChestKind =>
  goal === 'crimeFighter' ? (tier < 2 ? 'criminalHunt' : 'premium') : tier === 0 ? 'standard' : 'premium';

export interface MasteryCompletion {
  goal: MasteryGoal;
  tier: number;
  chest: ChestKind;
}

/** The player's progress across shifts (`Career` in GameCore). */
export interface Career {
  level: number;
  money: number;
  upgrades: Partial<Record<Upgrade, number>>;
  armSlots: number[];
  modules: Record<number, RoadModule>;
  mastery: MasteryStats;
  masteryTiers: Partial<Record<MasteryGoal, number>>;
  chests: ChestKind[];
  collection: string[];
  unseen: string[];
  carSkins: string[];
  mapSkin: string | null;
  adChests: number;
  adDay: number;
  chestsOpened: number;
  chestsSinceEpic: number;
  dailyDone: number;
  lastLoginDay: number;
  dailyStreak: number;
  challengeDay: number;
  challengesDone: string[];
  dailyPlayed: number;
  albumsDone: string[];
  bestTimes: Record<string, number[]>;
  purchases: string[];
  adCashCount: number;
  adCashDay: number;
}

/** Everything that is saved (`SaveGame` in GamePresentation). */
export interface SaveGame {
  version: 2;
  highscore: number;
  highscoreSeed: number | null;
  shiftsPlayed: number;
  settings: Settings;
  career: Career;
  tutorialDone: boolean;
  mode: GameMode;
  unlimitedBest: number;
  unlimitedBestCars: number;
  mayhemBest: number;
  mayhemBestChain: number;
}

export const newCareer = (): Career => ({
  level: 1,
  money: 0,
  upgrades: {},
  armSlots: [0, 4, 8, 12],
  modules: {},
  mastery: { perfects: 0, tightFits: 0, nearMisses: 0, takedowns: 0, transporters: 0, bestChain: 0, bestCombo: 0, shiftsCompleted: 0 },
  masteryTiers: {},
  chests: [],
  collection: [],
  unseen: [],
  carSkins: [],
  mapSkin: null,
  adChests: 0,
  adDay: -1,
  chestsOpened: 0,
  chestsSinceEpic: 0,
  dailyDone: -1,
  lastLoginDay: -1,
  dailyStreak: 0,
  challengeDay: -1,
  challengesDone: [],
  dailyPlayed: -1,
  albumsDone: [],
  bestTimes: {},
  purchases: [],
  adCashCount: 0,
  adCashDay: -1,
});

export const newSave = (): SaveGame => ({
  version: 2,
  highscore: 0,
  highscoreSeed: null,
  shiftsPlayed: 0,
  settings: { sound: true, haptics: true, reduceMotion: 'system', vehicleLabels: false },
  career: newCareer(),
  tutorialDone: false,
  mode: 'shift',
  unlimitedBest: 0,
  unlimitedBestCars: 0,
  mayhemBest: 0,
  mayhemBestChain: 0,
});

export const MINIMUM_ARMS = 4;

/** All career rules as functions on the plain save data. */
export const Careers = {
  owns: (c: Career, id: string): boolean => c.collection.includes(id),

  steps: (c: Career, u: Upgrade): number => Math.min(Math.max(0, c.upgrades[u] ?? 0), upgradeMaxSteps[u]),

  /** Price of the next step; null once maxed or not offered yet at this level. */
  priceOf(c: Career, u: Upgrade, config: Config = baseConfig): number | null {
    if (c.level < upgradeUnlockLevel(u, config)) return null;
    const next = Careers.steps(c, u) + 1;
    return next <= upgradeMaxSteps[u] ? upgradePrice(u, next, config) : null;
  },

  buy(c: Career, u: Upgrade, config: Config = baseConfig): boolean {
    const price = Careers.priceOf(c, u, config);
    if (price === null || c.money < price) return false;
    c.money -= price;
    c.upgrades[u] = Careers.steps(c, u) + 1;
    return true;
  },

  availableUpgrades: (c: Career, config: Config = baseConfig): Upgrade[] => UPGRADES.filter((u) => upgradeUnlockLevel(u, config) <= c.level),

  hasPurchased: (c: Career, p: StoreProduct): boolean => !isConsumable(p) && c.purchases.includes(p),
  canBuy: (c: Career, p: StoreProduct): boolean => isConsumable(p) || !Careers.hasPurchased(c, p),

  /**
   * The config of the next shift: the roundabout as it is built, then its level, the upgrades,
   * the Cash Boost, and last the sky and the city.
   */
  config(c: Career, base: Config, seed: number, weather: Weather | null = null, event: CityEvent | null | undefined = undefined): Config {
    const cfg = cloneConfig(base);
    cfg.armSlots = [...c.armSlots];
    cfg.modules = { ...c.modules };
    cfg.sportsCarShare = Careers.owns(c, 'sportsCar') ? base.sportsCarShareOwned : 0;
    cfg.compactShare = Careers.owns(c, 'compact') ? base.compactShareOwned : 0;
    cfg.vanShare = Careers.owns(c, 'van') ? base.vanShareOwned : 0;
    let shift = upgraded(forArms(forLevel(cfg, c.level, seed)), (u) => Careers.steps(c, u));
    if (Careers.hasPurchased(c, 'cashBoost')) shift = forCashBoost(shift);
    const sky = forNight(forWeather(shift, weather ?? drawWeather(shift, c.level, seed)), drawNight(shift, c.level, seed));
    return forCityEvent(sky, event === undefined ? drawCityEvent(sky, c.level, seed) : event, seed);
  },

  // MARK: Street Builder

  armPrice: (c: Career, config: Config = baseConfig): number | null => configArmPrice(config, c.armSlots),

  buildArm(c: Career, slot: number, config: Config = baseConfig): boolean {
    const price = Careers.armPrice(c, config);
    if (!canBuildArm(config, slot, c.armSlots) || price === null || c.money < price) return false;
    c.money -= price;
    c.armSlots = [...c.armSlots, slot].sort((a, b) => a - b);
    return true;
  },

  canRemoveArm: (c: Career, slot: number): boolean => slot !== 0 && c.armSlots.includes(slot) && c.armSlots.length > MINIMUM_ARMS,

  removeArm(c: Career, slot: number): boolean {
    if (!Careers.canRemoveArm(c, slot)) return false;
    c.armSlots = c.armSlots.filter((s) => s !== slot);
    return true;
  },

  buildModule(c: Career, module: RoadModule, slot: number, config: Config = baseConfig): boolean {
    if (slot < 0 || slot >= config.moduleSlotCount) return false;
    const price = modulePrice(config, module);
    if (c.money < price) return false;
    c.money -= price;
    c.modules = { ...c.modules, [slot]: module };
    return true;
  },

  removeModule(c: Career, slot: number): void {
    const next = { ...c.modules };
    delete next[slot];
    c.modules = next;
  },

  // MARK: Chests and collection

  count: (c: Career, kind: ChestKind): number => c.chests.filter((k) => k === kind).length,

  buyChest(c: Career, kind: ChestKind, config: Config = baseConfig): boolean {
    const price = kind === 'standard' ? config.standardChestPrice : kind === 'premium' ? config.premiumChestPrice : null;
    if (price === null || c.money < price) return false;
    c.money -= price;
    c.chests.push(kind);
    return true;
  },

  collect(c: Career, id: string): void {
    if (c.collection.includes(id)) return;
    c.collection.push(id);
    c.unseen.push(id);
  },

  markSeen(c: Career, ids: string[]): void {
    c.unseen = c.unseen.filter((x) => !ids.includes(x));
  },

  isWorn: (c: Career, id: string): boolean => c.carSkins.includes(id) || c.mapSkin === id,

  openChest(c: Career, index: number, seed: number, day: number | null): ChestOpening | null {
    if (index < 0 || index >= c.chests.length) return null;
    const kind = c.chests.splice(index, 1)[0];
    const roll = rollChest(kind, c.collection, c.chestsSinceEpic, (seed ^ Math.imul(c.chestsOpened, 7919) ^ 0xc4e57b0c) >>> 0, day);
    c.chestsOpened++;
    c.chestsSinceEpic = roll.chestsSinceEpic;
    if (c.collection.includes(roll.item.id)) {
      const money = DUPLICATE_MONEY[roll.item.rarity];
      c.money += money;
      return { chest: kind, item: roll.item, isDuplicate: true, money };
    }
    Careers.collect(c, roll.item.id);
    return { chest: kind, item: roll.item, isDuplicate: false, money: 0 };
  },

  /** Wears or takes off: up to five car skins, one map skin. */
  wear(c: Career, id: string): boolean {
    const item = cosmetic(id);
    if (!item || !c.collection.includes(id)) return false;
    if (item.kind === 'carSkin') {
      if (c.carSkins.includes(id)) c.carSkins = c.carSkins.filter((x) => x !== id);
      else {
        if (c.carSkins.length >= MAX_CAR_SKINS) return false;
        c.carSkins = [...c.carSkins, id];
      }
      return true;
    }
    if (item.kind === 'mapSkin') {
      c.mapSkin = c.mapSkin === id ? null : id;
      return true;
    }
    return false;
  },

  // MARK: Ads and store (placeholders)

  adChestsLeft: (c: Career, day: number, config: Config = baseConfig): number => Math.max(0, config.adChestsPerDay - (c.adDay === day ? c.adChests : 0)),

  adCash: (c: Career, config: Config = baseConfig): number => config.adCashBase + config.adCashPerLevel * Math.max(0, c.level - 1),

  adsLeft(c: Career, reward: AdReward, day: number, config: Config = baseConfig): number {
    return reward === 'chest' ? Careers.adChestsLeft(c, day, config) : Math.max(0, config.adCashPerDay - (c.adCashDay === day ? c.adCashCount : 0));
  },

  /** A watched ad: a Standard chest or money. Returns the money (0 for a chest), or null. */
  rewardAd(c: Career, reward: AdReward, day: number, config: Config = baseConfig): number | null {
    if (reward === 'chest') {
      if (Careers.adChestsLeft(c, day, config) <= 0) return null;
      if (c.adDay !== day) {
        c.adDay = day;
        c.adChests = 0;
      }
      c.adChests++;
      c.chests.push('standard');
      return 0;
    }
    if (Careers.adsLeft(c, 'cash', day, config) <= 0) return null;
    if (c.adCashDay !== day) {
      c.adCashDay = day;
      c.adCashCount = 0;
    }
    c.adCashCount++;
    const cash = Careers.adCash(c, config);
    c.money += cash;
    return cash;
  },

  skipsAds: (c: Career): boolean => Careers.hasPurchased(c, 'noAds'),

  applyPurchase(c: Career, p: StoreProduct, config: Config = baseConfig): boolean {
    if (!Careers.canBuy(c, p)) return false;
    const grant = productGrant(p, config);
    c.money += grant.money;
    c.chests.push(...grant.chests);
    if (!isConsumable(p)) c.purchases.push(p);
    return true;
  },

  // MARK: Daily, challenges, albums, best times

  collectLoginIncome(c: Career, day: number, config: Config = baseConfig): number | null {
    const last = c.lastLoginDay;
    c.lastLoginDay = Math.max(c.lastLoginDay, day);
    if (last < 0 || day <= last) return null;
    const days = Math.min(day - last, config.loginMaxDays);
    const booths = Object.values(c.modules).filter((m) => m === 'tollBooth').length;
    const income = booths * config.tollIncomePerDay * days;
    if (income <= 0) return null;
    c.money += income;
    return income;
  },

  isDailyOpen: (c: Career, day: number): boolean => c.dailyPlayed !== day && c.dailyDone !== day,

  startDaily(c: Career, day: number): string | null {
    if (!Careers.isDailyOpen(c, day)) return null;
    c.dailyStreak = c.dailyPlayed === day - 1 ? c.dailyStreak + 1 : 1;
    c.dailyPlayed = day;
    const milestone = STREAK_MILESTONES.find((m) => m.days === c.dailyStreak);
    if (!milestone || c.collection.includes(milestone.item)) return null;
    Careers.collect(c, milestone.item);
    return milestone.item;
  },

  nextStreakMilestone(c: Career): { days: number; item: string; left: number } | null {
    const m = STREAK_MILESTONES.find((x) => !c.collection.includes(x.item));
    return m ? { days: m.days, item: m.item, left: Math.max(1, m.days - c.dailyStreak) } : null;
  },

  completeDaily(c: Career, day: number, config: Config = baseConfig): number | null {
    if (c.dailyDone === day) return null;
    if (c.dailyPlayed !== day) {
      c.dailyStreak = c.dailyPlayed === day - 1 ? c.dailyStreak + 1 : 1;
      c.dailyPlayed = day;
    }
    c.dailyDone = day;
    const money = config.dailyPay * Math.min(c.dailyStreak, 7);
    c.money += money;
    c.chests.push('event');
    return money;
  },

  recordChallenges(c: Career, r: ShiftResult, day: number): Challenge[] {
    if (c.challengeDay !== day) {
      c.challengeDay = day;
      c.challengesDone = [];
    }
    const completed: Challenge[] = [];
    for (const ch of challengesOf(day)) {
      if (c.challengesDone.includes(ch) || !challengeMet(ch, r)) continue;
      c.challengesDone.push(ch);
      c.money += challengeReward(ch);
      completed.push(ch);
    }
    return completed;
  },

  isChallengeDone: (c: Career, ch: Challenge, day: number): boolean => c.challengeDay === day && c.challengesDone.includes(ch),

  rollEventChest(c: Career, r: ShiftResult, config: Config, seed: number): boolean {
    if (r.outcome !== 'completed' || config.cityEvent === null) return false;
    if (((Math.imul(seed ^ 0xe7e17c4e, 2654435761) >>> 0) / 4294967296) >= config.eventChestChance) return false;
    c.chests.push('event');
    return true;
  },

  completeAlbums(c: Career): Album[] {
    const owned = new Set(c.collection);
    const fresh = ALBUMS.filter((a) => !c.albumsDone.includes(a) && albumItems(a).length > 0 && albumItems(a).every((x) => owned.has(x.id)));
    for (const a of fresh) {
      c.albumsDone.push(a);
      c.money += ALBUM_REWARD[a];
    }
    return fresh;
  },

  albumProgress(c: Career, album: Album): { owned: number; total: number } {
    const items = albumItems(album);
    return { owned: items.filter((x) => c.collection.includes(x.id)).length, total: items.length };
  },

  /** The frame of the most valuable album completed. */
  frame(c: Career): Album | null {
    let best: Album | null = null;
    for (const a of c.albumsDone as Album[]) if (ALBUMS.includes(a) && (best === null || ALBUM_REWARD[a] > ALBUM_REWARD[best])) best = a;
    return best;
  },

  bestTimes: (c: Career, level: number): number[] | null => c.bestTimes[String(level)] ?? null,

  recordTimes(c: Career, splits: number[], level: number): boolean {
    const last = splits[splits.length - 1];
    if (last === undefined) return false;
    const pace = (times: number[]): number => (times[times.length - 1] ?? Infinity) / Math.max(1, times.length);
    const best = c.bestTimes[String(level)];
    if (best && pace(best) <= last / splits.length) return false;
    c.bestTimes[String(level)] = splits;
    return true;
  },

  /** Books a finished shift: its money whatever the outcome, and a level up if completed. */
  record(c: Career, r: ShiftResult, level: number): void {
    c.money = Math.max(0, c.money + r.money);
    if (r.outcome === 'completed') c.level = Math.max(1, level) + 1;
  },

  recordMastery(c: Career, r: ShiftResult): MasteryCompletion[] {
    const m = c.mastery;
    m.perfects += r.perfects;
    m.tightFits += r.tightFits;
    m.nearMisses += r.nearMisses;
    m.takedowns += r.takedowns;
    m.transporters += r.transporters;
    m.bestChain = Math.max(m.bestChain, r.bestChain);
    m.bestCombo = Math.max(m.bestCombo, r.bestCombo);
    if (r.outcome === 'completed') m.shiftsCompleted++;
    const completed: MasteryCompletion[] = [];
    for (const goal of MASTERY_GOALS) {
      let tier = c.masteryTiers[goal] ?? 0;
      const thresholds = MASTERY_THRESHOLDS[goal];
      while (tier < thresholds.length && masteryValue(goal, m) >= thresholds[tier]) {
        const chest = masteryChest(goal, tier);
        c.chests.push(chest);
        completed.push({ goal, tier, chest });
        tier++;
      }
      c.masteryTiers[goal] = tier;
    }
    return completed;
  },

  collectionCount: (c: Career): number => COSMETICS.filter((x) => c.collection.includes(x.id)).length,
};
