import { MUSEUM_SHELVES } from './museum';
import { baseConfig, cloneConfig, type Config, type RoadModule, type Weather, type CityEvent, type BossKind, type LegendaryRule, modulePrice } from './config';
import {
  forLevel,
  drawLegendary,
  forLegendary,
  type Darkness,
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
  forMayhem,
  drawWeather,
  drawCityEvent,
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
  legendaryReward,
  prestigeReward,
} from './loot';
import { type Challenge, challengesOf, challengeMet, challengeReward, STREAK_MILESTONES } from './daily';
import type { CasinoPending, CasinoRound } from './casino';
import { randomSeed } from './rng';
import { Elite, type EliteGain, type EliteStep, type TitleId, TITLES } from './elite';
import type { HallEntry } from './seasonPass';

export type GameMode = 'shift' | 'unlimited' | 'mayhem';
export const GAME_MODES: GameMode[] = ['shift', 'unlimited', 'mayhem'];

export type ReduceMotion = 'system' | 'on' | 'off';

export interface Settings {
  /** Sound effects (merges, crashes, the casino). */
  sound: boolean;
  /** The adaptive music, apart from the effects. */
  music: boolean;
  haptics: boolean;
  reduceMotion: ReduceMotion;
  vehicleLabels: boolean;
  /** The floating buttons on the other side, for the left thumb. */
  leftHanded: boolean;
  /** Notices and the cards over the scene a step larger. */
  largeText: boolean;
  /**
   * The player chose "System" themselves (Leo, 29.09.2026: Reduce Motion is off unless chosen).
   * A "system" saved before without this was the old default and reads as off.
   */
  motionChosen: boolean;
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
  /** Ambulances that got through with a clear road. */
  ambulances: number;
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

/** The player's progress across shifts. */
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
  /** Mastery trials passed (core/trials.ts), each rewarded once. */
  trialsDone: string[];
  /** Syndicate bosses taken down: the trophy count in Records. */
  bossTrophies: number;
  /** Boss kinds taken down at least once in the career: their rematches are open. */
  bossesBeaten: BossKind[];
  /** Prestige rank: each one started the career over at Level 1 on a harder road. */
  prestige: number;
  /** Legendary Shifts completed. */
  legendaryDone: number;
  /** Elite XP earned since Level 50 (core/elite.ts), and the highest Elite level paid out. */
  eliteXp: number;
  eliteClaimed: number;
  /** The title worn, and every title already announced. */
  title: TitleId | null;
  titlesSeen: TitleId[];
  /** The last week whose Weekly Elite paid, and how many have paid in all. */
  weeklyDone: number;
  weekliesDone: number;
  /** Museum entries met on the road (core/museum.ts), and those not looked at yet. */
  museumSeen: string[];
  museumNew: string[];
  /** How many Museum shelves the save knew: a shelf added later starts from what it must have met. */
  museumShelves: number;
  /** The casino (core/casino.ts): this career's own stream, rounds played, an open round and the history. */
  casinoSeed: number;
  casinoRounds: number;
  casinoPending: CasinoPending | null;
  casinoLog: CasinoRound[];
  casinoBestWin: number;
  casinoBestCrash: number;
  /** Today's balance of the money games: the day it belongs to and the sum. */
  casinoDay: number;
  casinoNet: number;
  /** How early (−) or late (+) the last merges were tapped, in ms (`core/timing.ts`). */
  tapOffsets: number[];
  /** The Season Pass bought (its season key, core/seasonPass.ts), its XP and the tiers paid. */
  passKey: string | null;
  passXp: number;
  passClaimed: number;
  /** The Hall of Fame: built or not, and a plaque for every Prestige rank. */
  hallBuilt: boolean;
  hallOfFame: HallEntry[];
}

/**
 * One-time hints: the mode swipe after Level 5 (until the first switch), installing the game
 * and a backup of the progress (each once, from its level on; `config.*HintAfterLevel`), and
 * what a Perfect Run is, the first time one happens.
 */
export const HINTS = ['modes', 'install', 'backup', 'perfectRun', 'reduceMotion'] as const;
export type Hint = (typeof HINTS)[number];

/** Everything that is saved (`storage/save.ts` reads and writes it). */
export interface SaveGame {
  version: 2;
  highscore: number;
  highscoreSeed: number | null;
  shiftsPlayed: number;
  settings: Settings;
  career: Career;
  tutorialDone: boolean;
  /** One-time hints already given (`HINTS`): 'modes' once the player switched modes. */
  hints: Hint[];
  mode: GameMode;
  unlimitedBest: number;
  unlimitedBestCars: number;
  mayhemBest: number;
  mayhemBestChain: number;
  /** The newest patch notes the player has opened (`present/patchNotes.ts`); null: none yet. */
  notesSeen: string | null;
}

/**
 * Split times kept to the millisecond. The simulation's clock gives long fractions
 * (12.341666666666667), and one list per level made big saves too large for the cloud.
 */
export const roundTimes = (times: readonly number[]): number[] => times.map((t) => Math.round(t * 1000) / 1000);

export const newCareer = (): Career => ({
  level: 1,
  money: 0,
  upgrades: {},
  armSlots: [0, 4, 8, 12],
  modules: {},
  mastery: { perfects: 0, tightFits: 0, nearMisses: 0, takedowns: 0, transporters: 0, bestChain: 0, bestCombo: 0, shiftsCompleted: 0, ambulances: 0 },
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
  trialsDone: [],
  bossTrophies: 0,
  bossesBeaten: [],
  prestige: 0,
  legendaryDone: 0,
  eliteXp: 0,
  eliteClaimed: 0,
  title: null,
  titlesSeen: [],
  weeklyDone: -1,
  weekliesDone: 0,
  museumSeen: [],
  museumNew: [],
  museumShelves: MUSEUM_SHELVES.length,
  casinoSeed: randomSeed(),
  casinoRounds: 0,
  casinoPending: null,
  casinoLog: [],
  casinoBestWin: 0,
  casinoBestCrash: 0,
  casinoDay: -1,
  casinoNet: 0,
  tapOffsets: [],
  passKey: null,
  passXp: 0,
  passClaimed: 0,
  hallBuilt: false,
  hallOfFame: [],
});

export const newSave = (): SaveGame => ({
  version: 2,
  highscore: 0,
  highscoreSeed: null,
  shiftsPlayed: 0,
  settings: { sound: true, music: true, haptics: true, reduceMotion: 'off', vehicleLabels: false, leftHanded: false, largeText: false, motionChosen: false },
  career: newCareer(),
  tutorialDone: false,
  hints: [],
  mode: 'shift',
  unlimitedBest: 0,
  unlimitedBestCars: 0,
  mayhemBest: 0,
  mayhemBestChain: 0,
  notesSeen: null,
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

  /**
   * The config of the next shift: the roundabout as it is built, then its level, the upgrades,
   * and last the sky, the city and a legendary rule. After a Prestige the
   * traffic is that of a higher level (`headStart`); the bosses keep to the level shown.
   * `legendary` pins the rule (null: none); undefined draws it from the seed.
   */
  config(
    c: Career,
    base: Config,
    seed: number,
    weather: Weather | null = null,
    event: CityEvent | null | undefined = undefined,
    legendary: LegendaryRule | null | undefined = undefined,
  ): Config {
    const cfg = cloneConfig(base);
    cfg.armSlots = [...c.armSlots];
    cfg.modules = { ...c.modules };
    cfg.sportsCarShare = Careers.owns(c, 'sportsCar') ? base.sportsCarShareOwned : 0;
    cfg.compactShare = Careers.owns(c, 'compact') ? base.compactShareOwned : 0;
    cfg.vanShare = Careers.owns(c, 'van') ? base.vanShareOwned : 0;
    const level = c.level + Careers.headStart(c, base);
    const shift = upgraded(forArms(forLevel(cfg, level, seed, c.level)), (u) => Careers.steps(c, u));
    const rule = legendary === undefined ? drawLegendary(shift, level, seed) : legendary;
    const stormy = rule === 'darkStorm' ? 'storm' : null;
    const sky = forNight(forWeather(shift, weather ?? stormy ?? drawWeather(shift, level, seed)), Careers.darkness(shift, rule, level, seed));
    return forLegendary(forCityEvent(sky, event === undefined ? drawCityEvent(sky, level, seed) : event, seed), rule);
  },

  /** The phantom boss comes in a blackout, and so does a Dark Storm; otherwise the seed decides. */
  darkness(shift: Config, rule: LegendaryRule | null, level: number, seed: number): Darkness {
    if ((shift.convoy && shift.bossKind === 'phantom') || rule === 'darkStorm') return 'blackout';
    return drawNight(shift, level, seed);
  },

  // MARK: Prestige

  /** How many levels harder the traffic runs after Prestige: the rank's head start. */
  headStart: (c: Career, config: Config = baseConfig): number => Math.min(c.prestige * config.prestigeHeadStart, config.maxPrestigeHeadStart),

  canPrestige: (c: Career, config: Config = baseConfig): boolean => c.level >= config.prestigeLevel,

  /**
   * Starts the career over at Level 1, one rank up: money, upgrades, roads and collection stay,
   * the traffic plays harder from now on, and some ranks unlock a skin. Best times belong to
   * the old road and go. Returns the item unlocked, or null.
   */
  prestige(c: Career, config: Config = baseConfig, day = -1): { rank: number; item: string | null } | null {
    if (!Careers.canPrestige(c, config)) return null;
    c.prestige++;
    c.hallOfFame.push({ rank: c.prestige, day, bosses: c.bossTrophies, legendary: c.legendaryDone, elite: Elite.level(c, config) });
    c.level = 1;
    c.bestTimes = {};
    const reward = prestigeReward(c.prestige);
    if (!reward || Careers.owns(c, reward.id)) return { rank: c.prestige, item: null };
    Careers.collect(c, reward.id);
    return { rank: c.prestige, item: reward.id };
  },

  // MARK: Hall of Fame

  /** The Hall of Fame can be built once the Elite track is open (Level 50 reached once). */
  canBuildHall: (c: Career, config: Config = baseConfig): boolean => !c.hallBuilt && Elite.isOpen(c, config) && c.money >= config.hallOfFamePrice,

  /** Builds the Hall of Fame: the monument goes up in the city and its skin is yours. */
  buildHall(c: Career, config: Config = baseConfig): boolean {
    if (!Careers.canBuildHall(c, config)) return false;
    c.money -= config.hallOfFamePrice;
    c.hallBuilt = true;
    Careers.collect(c, 'hallOfFame');
    return true;
  },

  // MARK: Elite track and titles

  /**
   * Books a finished shift on the Elite track (nothing before Level 50): its XP, then every
   * Elite level reached pays its chest and, at a milestone, its skin. Null while the track is shut.
   */
  recordElite(c: Career, r: ShiftResult, config: Config = baseConfig): EliteGain | null {
    if (!Elite.isOpen(c, config)) return null;
    const xp = Elite.xpOf(r, config);
    c.eliteXp += xp;
    const steps: EliteStep[] = [];
    const reached = Elite.level(c, config);
    while (c.eliteClaimed < reached) {
      c.eliteClaimed++;
      const step = Elite.step(c.eliteClaimed, config);
      c.chests.push(step.chest);
      if (step.item && !Careers.owns(c, step.item.id)) Careers.collect(c, step.item.id);
      steps.push(step);
    }
    return { xp, steps };
  },

  /** Titles earned since the last look: announced once, and the first one is worn right away. */
  recordTitles(c: Career, config: Config = baseConfig): TitleId[] {
    const fresh = Elite.titles(c, config).filter((t) => !c.titlesSeen.includes(t));
    c.titlesSeen.push(...fresh);
    if (c.title === null && fresh.length > 0) c.title = fresh[0];
    return fresh;
  },

  /** Wears an earned title; the one worn again takes it off. */
  wearTitle(c: Career, id: TitleId, config: Config = baseConfig): boolean {
    if (!TITLES.includes(id) || !Elite.titleEarned(id, c, config)) return false;
    c.title = c.title === id ? null : id;
    return true;
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

  /** Museum entries on the road for the first time: they go on show, marked new. Returns them. */
  discover(c: Career, ids: string[]): string[] {
    const fresh = ids.filter((id) => !c.museumSeen.includes(id));
    c.museumSeen.push(...fresh);
    c.museumNew.push(...fresh);
    return fresh;
  },

  /** Museum entries looked at: no longer new. */
  markMuseumSeen(c: Career, ids: string[]): void {
    c.museumNew = c.museumNew.filter((x) => !ids.includes(x));
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

  // MARK: Ads (placeholder)

  adChestsLeft: (c: Career, day: number, config: Config = baseConfig): number => Math.max(0, config.adChestsPerDay - (c.adDay === day ? c.adChests : 0)),

  /** A watched ad: a Standard chest. False when today's are used up. */
  rewardAd(c: Career, day: number, config: Config = baseConfig): boolean {
    if (Careers.adChestsLeft(c, day, config) <= 0) return false;
    if (c.adDay !== day) {
      c.adDay = day;
      c.adChests = 0;
    }
    c.adChests++;
    c.chests.push('standard');
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

  /**
   * The welcome chest: a Standard Chest the moment the career first reaches
   * `welcomeChestLevel` (never again, not after a Prestige). True when it was given.
   */
  giveWelcomeChest(c: Career, levelBefore: number, config: Config = baseConfig): boolean {
    if (c.prestige > 0 || levelBefore >= config.welcomeChestLevel || c.level < config.welcomeChestLevel) return false;
    c.chests.push('standard');
    return true;
  },

  /** A Lucky Drop: now and then a completed career shift leaves a Standard Chest behind. */
  rollLuckyDrop(c: Career, r: ShiftResult, config: Config, seed: number): boolean {
    if (r.outcome !== 'completed' || config.endless || config.mayhem) return false;
    if (((Math.imul(seed ^ 0x10c4d209, 2654435761) >>> 0) / 4294967296) >= config.luckyDropChance) return false;
    c.chests.push('standard');
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
    c.bestTimes[String(level)] = roundTimes(splits);
    return true;
  },

  /** Books a finished shift: its money whatever the outcome, and a level up if completed. */
  record(c: Career, r: ShiftResult, level: number): void {
    c.money = Math.max(0, c.money + r.money);
    if (r.outcome === 'completed') c.level = Math.max(1, level) + 1;
    if (r.bossBusted) {
      c.bossTrophies++;
      if (r.bossKind && !c.bossesBeaten.includes(r.bossKind)) c.bossesBeaten.push(r.bossKind);
    }
  },

  /** A completed Legendary Shift: a Premium Chest, and a skin at some counts. Null otherwise. */
  completeLegendary(c: Career, r: ShiftResult): { item: string | null } | null {
    if (r.outcome !== 'completed' || !r.legendary) return null;
    c.legendaryDone++;
    c.chests.push('premium');
    const reward = legendaryReward(c.legendaryDone);
    if (!reward || Careers.owns(c, reward.id)) return { item: null };
    Careers.collect(c, reward.id);
    return { item: reward.id };
  },

  isWeeklyDone: (c: Career, week: number): boolean => c.weeklyDone === week,

  /** This week's Weekly Elite passed for the first time: its money and a Premium Chest. */
  completeWeekly(c: Career, week: number, config: Config = baseConfig): number | null {
    if (c.weeklyDone === week) return null;
    c.weeklyDone = week;
    c.weekliesDone++;
    c.money += config.weeklyPay;
    c.chests.push('premium');
    return config.weeklyPay;
  },

  /**
   * The config of a shift in `mode`: Unlimited and Mayhem play at their own fixed level, a
   * Shift at the career's. `event` pins the city event (the Daily Shift's, or a challenge's),
   * `legendary` the legendary rule (the Daily Shift has none; a challenge the sender's).
   */
  shiftConfig(
    c: Career,
    mode: GameMode,
    base: Config,
    seed: number,
    event: CityEvent | null | undefined = undefined,
    legendary: LegendaryRule | null | undefined = undefined,
  ): Config {
    // Unlimited and Mayhem have their own fixed level: no Prestige head start, no legendary rule.
    if (mode === 'unlimited') {
      const cfg = Careers.config({ ...c, level: base.endlessLevel, prestige: 0 }, base, seed, null, event, null);
      cfg.endless = true;
      return cfg;
    }
    if (mode === 'mayhem') return forMayhem(Careers.config({ ...c, level: base.mayhemLevel, prestige: 0 }, base, seed, null, event, null));
    return Careers.config(c, base, seed, null, event, legendary);
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
    m.ambulances += r.ambulances;
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
