import { MUSEUM_SHELVES, FAIL_SKIN, museumId, failuresComplete } from './museum';
import { baseConfig, cloneConfig, type Config, type RoadModule, type Weather, type CityEvent, type BossKind, type LegendaryRule, MODULE_MAX_LEVEL, modulePrice, moduleUpgradePrice } from './config';
import {
  forLevel,
  drawLegendary,
  drawLegendaryExtra,
  forLegendary,
  type Darkness,
  upgraded,
  upgradePrice,
  upgradeMaxSteps,
  upgradeUnlockLevel,
  upgradeIntroLevel,
  UPGRADES,
  type Upgrade,
  forArms,
  forIntro,
  forEase,
  forWeather,
  forNight,
  drawNight,
  forCityEvent,
  forMayhem,
  drawWeather,
  drawCityEvent,
  armPrice as configArmPrice,
  canBuildArm,
  bossInBlackout,
  shiftCarsRange,
} from './levels';
import type { FailCause, ShiftResult } from './events';
import {
  type ChestKind,
  type ChestOpening,
  type Album,
  ALBUMS,
  ALBUM_REWARD,
  albumItems,
  cosmetic,
  rollChest,
  tappedOdds,
  chestPrice,
  chestBundle,
  DUPLICATE_MONEY,
  MAX_CAR_SKINS,
  COSMETICS,
  legendaryReward,
  prestigeReward,
  unlimitedRewards,
} from './loot';
import { type Challenge, challengesOf, challengeMet, challengeReward, STREAK_MILESTONES } from './daily';
import type { CasinoPending, CasinoRound } from './casino';
import { Mafia, type Loan } from './mafia';
import { randomSeed, Rng } from './rng';
import { Elite, type EliteGain, type EliteStep, type TitleId, TITLES } from './elite';
import type { HallEntry } from './seasonPass';
import { clamp } from './vec2';

/** What counting a day into the Daily streak brought: a milestone item, Freezes used on missed days, a new Freeze. */
export interface StreakNews {
  item: string | null;
  /** The starter streak's chest (`starterStreakDays`), the one day it comes. */
  chest: ChestKind | null;
  frozen: number;
  earned: boolean;
  /** Scratch Cards the day brought. */
  cards: number;
}

/** What the streak pays next and in how many days. */
export interface StreakMilestone {
  days: number;
  prize: { k: 'item'; id: string } | { k: 'chest'; chest: ChestKind };
  left: number;
}

// New modes go at the end: a challenge link stores their positions.
export type GameMode = 'shift' | 'unlimited' | 'mayhem';
export const GAME_MODES: GameMode[] = ['shift', 'unlimited', 'mayhem'];

export type ReduceMotion = 'system' | 'on' | 'off';

export interface Settings {
  /** Sound effects (merges, crashes, the casino). */
  sound: boolean;
  /** The adaptive music, apart from the effects. */
  music: boolean;
  /** The sound of the map's weather (rain, thunder), apart from the effects and the music. */
  mapSounds: boolean;
  /** The engines and tyres of the traffic, quietly under everything (Leo, 22.10.2026). */
  engineSounds: boolean;
  haptics: boolean;
  reduceMotion: ReduceMotion;
  vehicleLabels: boolean;
  /** The floating buttons on the other side, for the left thumb. */
  leftHanded: boolean;
  /** Size of the dispatch button, 1 (small) to 3 (large). */
  dispatchSize: 1 | 2 | 3;
  /** Notices and the cards over the scene a step larger. */
  largeText: boolean;
  /** Half the frames and a softer picture, for a phone that gets hot or empties too fast (Leo, 10.10.2026). */
  batterySaver: boolean;
  /** Fewer effects and no glass blur, for an old device: chosen, or switched on by the game once it kept stuttering. */
  lowDetail: boolean;
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
  /** Close shaves past a motorbike. */
  shaves: number;
}

export type MasteryGoal =
  | 'perfectTiming'
  | 'tightSpots'
  | 'closeCalls'
  | 'longChain'
  | 'crimeFighter'
  | 'secureRoute'
  | 'comboMaster'
  | 'veteran'
  | 'lifesaver'
  | 'closeShaves';
export const MASTERY_GOALS: MasteryGoal[] = ['perfectTiming', 'tightSpots', 'closeCalls', 'longChain', 'crimeFighter', 'secureRoute', 'comboMaster', 'veteran', 'lifesaver', 'closeShaves'];

/**
 * Three tiers since the start; IV and V (Leo, 02.10.2026) for the players who finished them, and
 * two goals for the late game: ambulances and fire engines let through, close shaves past bikes.
 */
export const MASTERY_THRESHOLDS: Record<MasteryGoal, number[]> = {
  perfectTiming: [25, 150, 600, 1500, 3000],
  tightSpots: [25, 150, 600, 1500, 3000],
  closeCalls: [50, 300, 1200, 3000, 6000],
  longChain: [8, 15, 25, 35, 50],
  crimeFighter: [10, 75, 300, 750, 1500],
  secureRoute: [10, 75, 300, 750, 1500],
  comboMaster: [20, 40, 80, 120, 160],
  veteran: [10, 75, 300, 750, 1500],
  lifesaver: [5, 25, 100, 250, 500],
  closeShaves: [10, 50, 200, 500, 1000],
};

/** The tier that completed a mastery before IV and V came: its title still hangs on it. */
export const MASTERY_CLASSIC_TIERS = 3;

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
    case 'lifesaver':
      return s.ambulances;
    case 'closeShaves':
      return s.shaves;
  }
}

export const masteryChest = (goal: MasteryGoal, tier: number): ChestKind =>
  goal === 'crimeFighter' ? (tier < 2 ? 'criminalHunt' : 'premium') : tier === 0 ? 'standard' : 'premium';

/** I, II, III, IV, V. */
export const masteryNumeral = (tier: number): string => ['I', 'II', 'III', 'IV', 'V'][tier] ?? String(tier + 1);

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
  /** Module slots upgraded above level 1 (`moduleLevel` in config.ts). */
  moduleLevels: Record<number, number>;
  mastery: MasteryStats;
  masteryTiers: Partial<Record<MasteryGoal, number>>;
  chests: ChestKind[];
  collection: string[];
  unseen: string[];
  carSkins: string[];
  mapSkin: string | null;
  policeSkin: string | null;
  adChests: number;
  adDay: number;
  /** The free upgrade step an ad gave (the day and how many that day), and the Upgrade's ad boosts (same) and whether one waits for the next round. */
  adUpgradeDay: number;
  adUpgrades: number;
  adBoostDay: number;
  adBoosts: number;
  /** The days an ad last brought a broken streak back, gave a Freeze and doubled the Daily's pay. */
  adRescueDay: number;
  adFreezeDay: number;
  adDoubleDay: number;
  /** The day and how many won career shifts an ad paid once more (`adShiftDoublesPerDay`). */
  adShiftDoubleDay: number;
  adShiftDoubles: number;
  /** The day and how many runs an ad let go on after a crash (`reviveAdsPerDay`). */
  adReviveDay: number;
  adRevives: number;
  /** The day an ad gave the lost Daily a second try, and whether that try waits to be played. */
  adRetryDay: number;
  dailyRetry: boolean;
  upgradeBoost: boolean;
  chestsOpened: number;
  chestsSinceEpic: number;
  chestsSinceLegendary: number;
  dailyDone: number;
  lastLoginDay: number;
  /**
   * Tomorrow's gift (research of 08.10.2026, a reason for day two): -1 not promised yet, else the day its Standard
   * Chest waits from; -2 given.
   */
  giftDay: number;
  /** Shifts lost in a row on the level the career is on (`Careers.noteShift`); the level cleared starts it over. */
  levelLosses: number;
  dailyStreak: number;
  /** Streak Freezes in stock: each one covers a missed day instead of breaking the streak. */
  streakFreezes: number;
  /** The starter streak's chest was paid (`starterStreakDays`, once in a career). */
  starterChest: boolean;
  /** Scratch Cards in hand (casino, `Casino.scratch`): the streak gives them, the casino sells them. */
  scratchCards: number;
  /** Tailwind waits for the next career shift, and the day one was last given. */
  tailwind: boolean;
  tailwindDay: number;
  /** The highest Heat a shift was cleared at. */
  heatCleared: number;
  challengeDay: number;
  challengesDone: string[];
  dailyPlayed: number;
  albumsDone: string[];
  bestTimes: Record<string, number[]>;
  /** Mastery trials passed (core/trials.ts), each rewarded once. */
  trialsDone: string[];
  /** Boss Rush: the fastest clear in seconds (0 until one), and the most bosses taken down in one rush. */
  rushBest: number;
  rushFurthest: number;
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
  /** Everything the money games won or lost since this field came (15.10.2026): the Casino board ranks its best. */
  casinoProfit: number;
  /** How early (−) or late (+) the last merges were tapped, in ms (`core/timing.ts`). */
  tapOffsets: number[];
  /** The Season Pass bought (its season key, core/seasonPass.ts); the season the XP belongs to, the XP, and the tiers paid with the pass and on the free track. */
  passKey: string | null;
  passSeason: string | null;
  passXp: number;
  passClaimed: number;
  passFreeClaimed: number;
  /** The Prestige log: a plaque for every rank. `hallBuilt` is the old Hall of Fame (not for sale since 18.10.2026, its wall gone from the island since 19.10.2026), kept so old saves load. */
  hallBuilt: boolean;
  hallOfFame: HallEntry[];
  /** Tour stops passed, each once per run of its tour (`core/tours.ts`: `halloween-2026.3`). */
  toursDone: string[];
  /** Counters for the achievements that no other record keeps (`core/achievements.ts`). */
  stats: Record<string, number>;
  /** Achievement tiers paid, as `family.tier`. */
  achievements: string[];
  /**
   * The Auction House (core/auction.ts): the day the lots belong to, the lots (`skin:id` or `chest:kind`),
   * the slots already tried today, the auctions begun in all, the lots won and the money they cost.
   */
  auctionDay: number;
  auctionLots: string[];
  auctionTaken: number[];
  auctionRuns: number;
  auctionWins: number;
  auctionSpent: number;
  /** Everything given to the Game fund (core/fund.ts). */
  fundGiven: number;
  /** The best place the crew ever finished a week on (1 to 3; 0 = never on the podium). */
  crewPodium: number;
  /** The newest published idea the player has been told about or seen (ms; 0 = never looked). */
  ideasSeenAt: number;
  /** The Mafia's loan (core/mafia.ts), the loans repaid in time in a row (they make the next one kinder) and the loans taken in all. */
  loan: Loan | null;
  cleanLoans: number;
  loansTaken: number;
  /** After a write-off the Family takes no calls until this time (ms; 0: never shut out). */
  mafiaBan: number;
}

/**
 * One-time hints: the mode swipe after Level 5 (until the first switch), installing the game
 * and a backup of the progress (each once, from its level on; `config.*HintAfterLevel`), and
 * what a Perfect Run is, the first time one happens.
 */
export const HINTS = ['modes', 'install', 'perfectRun', 'reduceMotion', 'invite', 'scout', 'tightFit', 'unlimitedTip', 'portalLogin', 'notifications', 'notificationsStreak', 'tomorrow', 'account', 'introsStarted', 'newsStarted', 'intro.museum', 'intro.builder', 'intro.daily', 'intro.trials', 'intro.pass', 'intro.casino', 'intro.club', 'intro.gamefund', 'intro.mafia', 'intro.crew'] as const;
export type Hint = (typeof HINTS)[number] | `news.${string}`;

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
  /** The Unlimited record went on after a crash, for an ad: the board says so. */
  unlimitedBestRevived: boolean;
  unlimitedBestCars: number;
  mayhemBest: number;
  mayhemBestChain: number;
  /** The Daily Shift cleared most recently: its day and score, for the Daily board. */
  dailyDay: number;
  dailyScore: number;
  /** How many tries that Daily took: 2 when an ad gave a second one (the Daily board says so). */
  dailyTries: number;
  /** The day this save was first played (a new save only; -1: older than the field), for the visit count that tells how long players stay. */
  firstDay: number;
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
  moduleLevels: {},
  mastery: { perfects: 0, tightFits: 0, nearMisses: 0, takedowns: 0, transporters: 0, bestChain: 0, bestCombo: 0, shiftsCompleted: 0, ambulances: 0, shaves: 0 },
  masteryTiers: {},
  chests: [],
  collection: [],
  unseen: [],
  carSkins: [],
  mapSkin: null,
  policeSkin: null,
  adChests: 0,
  adDay: -1,
  adUpgradeDay: -1,
  adUpgrades: 0,
  adBoostDay: -1,
  adBoosts: 0,
  adRescueDay: -1,
  adFreezeDay: -1,
  adDoubleDay: -1,
  adShiftDoubleDay: -1,
  adShiftDoubles: 0,
  adReviveDay: -1,
  adRevives: 0,
  adRetryDay: -1,
  dailyRetry: false,
  upgradeBoost: false,
  chestsOpened: 0,
  chestsSinceEpic: 0,
  chestsSinceLegendary: 0,
  dailyDone: -1,
  lastLoginDay: -1,
  giftDay: -1,
  levelLosses: 0,
  dailyStreak: 0,
  streakFreezes: 0,
  starterChest: false,
  scratchCards: 0,
  tailwind: false,
  tailwindDay: -1,
  heatCleared: 0,
  challengeDay: -1,
  challengesDone: [],
  dailyPlayed: -1,
  albumsDone: [],
  bestTimes: {},
  trialsDone: [],
  rushBest: 0,
  rushFurthest: 0,
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
  casinoProfit: 0,
  tapOffsets: [],
  passKey: null,
  passSeason: null,
  passXp: 0,
  passClaimed: 0,
  passFreeClaimed: 0,
  hallBuilt: false,
  hallOfFame: [],
  toursDone: [],
  stats: {},
  achievements: [],
  auctionDay: -1,
  auctionLots: [],
  auctionTaken: [],
  auctionRuns: 0,
  auctionWins: 0,
  auctionSpent: 0,
  fundGiven: 0,
  crewPodium: 0,
  ideasSeenAt: 0,
  loan: null,
  cleanLoans: 0,
  loansTaken: 0,
  mafiaBan: 0,
});

export const newSave = (): SaveGame => ({
  version: 2,
  highscore: 0,
  highscoreSeed: null,
  shiftsPlayed: 0,
  settings: { sound: true, music: true, mapSounds: true, engineSounds: false, haptics: true, reduceMotion: 'system', vehicleLabels: false, leftHanded: false, dispatchSize: 2, largeText: false, batterySaver: false, lowDetail: false, motionChosen: false },
  career: newCareer(),
  tutorialDone: false,
  hints: [],
  mode: 'shift',
  unlimitedBest: 0,
  unlimitedBestRevived: false,
  unlimitedBestCars: 0,
  mayhemBest: 0,
  mayhemBestChain: 0,
  dailyDay: -1,
  dailyScore: 0,
  dailyTries: 1,
  firstDay: -1,
  notesSeen: null,
});

export const MINIMUM_ARMS = 4;

/** All career rules as functions on the plain save data. */
export const Careers = {
  owns: (c: Career, id: string): boolean => c.collection.includes(id),

  steps: (c: Career, u: Upgrade): number => clamp(c.upgrades[u] ?? 0, 0, upgradeMaxSteps[u]),

  /** Price of the next step; null once maxed or not offered yet at this level. */
  priceOf(c: Career, u: Upgrade, config: Config = baseConfig): number | null {
    if (c.level < upgradeUnlockLevel(u, config) || Careers.reach(c) < upgradeIntroLevel(u, config)) return null;
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

  availableUpgrades: (c: Career, config: Config = baseConfig): Upgrade[] =>
    UPGRADES.filter((u) => upgradeUnlockLevel(u, config) <= c.level && upgradeIntroLevel(u, config) <= Careers.reach(c)),

  /**
   * The config of the next shift: the roundabout as it is built, then its level, the upgrades,
   * and last the sky, the city and a legendary rule. After a Prestige the
   * traffic is that of a higher level (`headStart`); the bosses keep to the level shown, and each rank brings the next of them (`bossShift`).
   * `legendary` pins the rule (null: none); undefined draws it from the seed.
   */
  config(
    c: Career,
    base: Config,
    seed: number,
    weather: Weather | null = null,
    event: CityEvent | null | undefined = undefined,
    legendary: LegendaryRule | null | undefined = undefined,
    extra: LegendaryRule[] | undefined = undefined,
  ): Config {
    const cfg = cloneConfig(base);
    cfg.prestige = c.prestige;
    cfg.armSlots = [...c.armSlots];
    cfg.modules = { ...c.modules };
    cfg.moduleLevels = { ...c.moduleLevels };
    cfg.sportsCarShare = Careers.owns(c, 'sportsCar') ? base.sportsCarShareOwned : 0;
    cfg.compactShare = Careers.owns(c, 'compact') ? base.compactShareOwned : 0;
    cfg.vanShare = Careers.owns(c, 'van') ? base.vanShareOwned : 0;
    cfg.classicShare = Careers.owns(c, 'classic') ? base.classicShareOwned : 0;
    const level = c.level + Careers.headStart(c, base);
    const shift = upgraded(forArms(forLevel(cfg, level, seed, c.level + Careers.bossShift(c, base))), (u) => Careers.steps(c, u));
    const rule = legendary === undefined ? drawLegendary(shift, level, seed) : legendary;
    // A rule given from outside (a trial, a tour, the Weekly) comes alone; a challenge brings the extra ones it was played with.
    const rules = extra ?? (legendary === undefined ? drawLegendaryExtra(shift, rule, c.prestige, seed) : []);
    const storm = rule === 'darkStorm' || rules.includes('darkStorm');
    const sky = forNight(forWeather(shift, weather ?? (storm ? 'storm' : null) ?? drawWeather(shift, level, seed)), Careers.darkness(shift, storm ? 'darkStorm' : rule, level, seed));
    return forLegendary(forCityEvent(sky, event === undefined ? drawCityEvent(sky, level, seed) : event, seed), rule, rules);
  },

  /** The phantom and the kingpin come in a blackout, and so does a Dark Storm; otherwise the seed decides. */
  darkness(shift: Config, rule: LegendaryRule | null, level: number, seed: number): Darkness {
    if ((shift.convoy && bossInBlackout(shift.bossKind)) || rule === 'darkStorm') return 'blackout';
    return drawNight(shift, level, seed);
  },

  // MARK: Prestige

  /** How many levels harder the traffic runs after Prestige: the rank's head start. */
  /** The level whose traffic the career meets: what `forIntro` and the daily challenges go by. */
  reach: (c: Career): number => c.level + Careers.headStart(c),

  /** The levels the boss schedule has moved on: a rank meets the next `bossesPerRank` bosses at the same levels 15, 30 and 45. */
  bossShift: (c: Career, config: Config = baseConfig): number => c.prestige * config.bossesPerRank * config.convoyEvery,

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
    c.levelLosses = 0;
    c.bestTimes = {};
    const reward = prestigeReward(c.prestige);
    if (!reward || Careers.owns(c, reward.id)) return { rank: c.prestige, item: null };
    Careers.collect(c, reward.id);
    return { rank: c.prestige, item: reward.id };
  },

  // MARK: Heat

  /** The Daily streak as it stands on `day`: gone once more days were missed than Streak Freezes cover. */
  streak: (c: Career, day: number): number => (day - c.dailyPlayed - 1 <= c.streakFreezes ? c.dailyStreak : 0),

  /**
   * The Heat career shifts run at (Leo, 13.10.2026): one step per `heatStreakDays` days of the living Daily streak.
   * Always the highest one, never switched off (Leo, 15.10.2026).
   */
  maxHeat: (c: Career, day: number, config: Config = baseConfig): number => Math.min(config.maxHeat, Math.floor(Careers.streak(c, day) / config.heatStreakDays)),

  /** A shift cleared at `heat` is the best so far; true when that is new. It keeps the Heat titles, whatever happens to the streak. */
  recordHeat(c: Career, heat: number, config: Config = baseConfig): boolean {
    if (heat <= c.heatCleared || heat > config.maxHeat) return false;
    c.heatCleared = heat;
    return true;
  },

  // MARK: Elite track and titles

  /**
   * Books a finished shift on the Elite track (nothing before Level 50): its XP, then every
   * Elite level reached pays its chest and, at a milestone, its skin. Null while the track is shut.
   */
  recordElite(c: Career, r: ShiftResult, config: Config = baseConfig, extraXp = 0): EliteGain | null {
    if (!Elite.isOpen(c, config)) return null;
    const xp = Math.round((Elite.xpOf(r, config) + extraXp) * Elite.boost(c, config));
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

  /**
   * Moves a built arm to another free slot, free of charge (Leo, 02.10.2026): the ring keeps its
   * arms, only where they join changes. The player's own arm (slot 0) stays where it is.
   */
  canMoveArm(c: Career, from: number, to: number, config: Config = baseConfig): boolean {
    if (from === 0 || from === to || !c.armSlots.includes(from)) return false;
    return canBuildArm(config, to, c.armSlots.filter((s) => s !== from));
  },

  moveArm(c: Career, from: number, to: number, config: Config = baseConfig): boolean {
    if (!Careers.canMoveArm(c, from, to, config)) return false;
    c.armSlots = [...c.armSlots.filter((s) => s !== from), to].sort((a, b) => a - b);
    return true;
  },

  /** Moves a ring module to a free module slot, free of charge. */
  canMoveModule: (c: Career, from: number, to: number, config: Config = baseConfig): boolean =>
    from !== to && c.modules[from] !== undefined && c.modules[to] === undefined && to >= 0 && to < config.moduleSlotCount,

  moveModule(c: Career, from: number, to: number, config: Config = baseConfig): boolean {
    if (!Careers.canMoveModule(c, from, to, config)) return false;
    const next = { ...c.modules, [to]: c.modules[from] };
    delete next[from];
    c.modules = next;
    const levels = { ...c.moduleLevels };
    if (levels[from] !== undefined) levels[to] = levels[from];
    delete levels[from];
    c.moduleLevels = levels;
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
    const levels = { ...c.moduleLevels };
    delete levels[slot];
    c.moduleLevels = levels;
  },

  /** The price of the next level of the module in `slot`, or null at the top (or with no module). */
  moduleUpgradePrice(c: Career, slot: number, config: Config = baseConfig): number | null {
    const module = c.modules[slot];
    const level = c.moduleLevels[slot] ?? 1;
    return module === undefined || level >= MODULE_MAX_LEVEL ? null : moduleUpgradePrice(config, module, level + 1);
  },

  upgradeModule(c: Career, slot: number, config: Config = baseConfig): boolean {
    const price = Careers.moduleUpgradePrice(c, slot, config);
    if (price === null || c.money < price) return false;
    c.money -= price;
    c.moduleLevels = { ...c.moduleLevels, [slot]: (c.moduleLevels[slot] ?? 1) + 1 };
    return true;
  },

  // MARK: Chests and collection

  count: (c: Career, kind: ChestKind): number => c.chests.filter((k) => k === kind).length,

  buyChest(c: Career, kind: ChestKind, config: Config = baseConfig, bundle = false): boolean {
    const pack = bundle ? chestBundle(kind, config) : null;
    const price = bundle ? (pack?.price ?? null) : chestPrice(kind, config);
    if (price === null || c.money < price) return false;
    c.money -= price;
    for (let i = 0; i < (pack?.count ?? 1); i++) c.chests.push(kind);
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

  /** A shift was lost this way: it goes on show in the Museum. True when that filled the Failures shelf and paid its skin. */
  noteFailure(c: Career, cause: FailCause): boolean {
    Careers.discover(c, [museumId({ k: 'fail', kind: cause })]);
    if (!failuresComplete(c.museumSeen) || c.collection.includes(FAIL_SKIN)) return false;
    Careers.collect(c, FAIL_SKIN);
    return true;
  },

  /** Museum entries looked at: no longer new. */
  markMuseumSeen(c: Career, ids: string[]): void {
    c.museumNew = c.museumNew.filter((x) => !ids.includes(x));
  },

  markSeen(c: Career, ids: string[]): void {
    c.unseen = c.unseen.filter((x) => !ids.includes(x));
  },

  /** How many car skins can be on at once: the Garage upgrade adds one a step. */
  skinSlots: (c: Career): number => MAX_CAR_SKINS + Careers.steps(c, 'skinSlots'),

  isWorn: (c: Career, id: string): boolean => c.carSkins.includes(id) || c.mapSkin === id || c.policeSkin === id,

  /** Opens the chest at `index`; `power` 0…1 is how well the player's taps broke it open (`tappedOdds`). */
  openChest(c: Career, index: number, seed: number, day: number | null, power = 0, config: Config = baseConfig): ChestOpening | null {
    if (index < 0 || index >= c.chests.length) return null;
    const kind = c.chests.splice(index, 1)[0];
    const odds = tappedOdds(kind, power, config.chestTapBoost);
    const roll = rollChest(kind, c.collection, c.chestsSinceEpic, (seed ^ Math.imul(c.chestsOpened, 7919) ^ 0xc4e57b0c) >>> 0, day, c.chestsSinceLegendary, odds);
    c.chestsOpened++;
    c.chestsSinceEpic = roll.chestsSinceEpic;
    c.chestsSinceLegendary = roll.chestsSinceLegendary;
    if (c.collection.includes(roll.item.id)) {
      const money = DUPLICATE_MONEY[roll.item.rarity];
      c.money += money;
      return { chest: kind, item: roll.item, isDuplicate: true, money };
    }
    Careers.collect(c, roll.item.id);
    return { chest: kind, item: roll.item, isDuplicate: false, money: 0 };
  },

  /** Wears or takes off: car skins up to the slots (`skinSlots`), one map skin, one police skin. */
  wear(c: Career, id: string): boolean {
    const item = cosmetic(id);
    if (!item || !c.collection.includes(id)) return false;
    if (item.kind === 'carSkin') {
      if (c.carSkins.includes(id)) c.carSkins = c.carSkins.filter((x) => x !== id);
      else {
        if (c.carSkins.length >= Careers.skinSlots(c)) return false;
        c.carSkins = [...c.carSkins, id];
      }
      return true;
    }
    if (item.kind === 'mapSkin') {
      c.mapSkin = c.mapSkin === id ? null : id;
      return true;
    }
    if (item.kind === 'policeSkin') {
      c.policeSkin = c.policeSkin === id ? null : id;
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

  /**
   * The upgrade today's ad offers one free step of (Leo, 05.10.2026), or null: today's is taken, or
   * nothing is left to give. The game draws it from the career's own stream and the day, so it is
   * the same all day and a reload does not draw again. It lands on an upgrade the player could buy.
   */
  adUpgradeOffer(c: Career, day: number, config: Config = baseConfig): Upgrade | null {
    if (c.adUpgradeDay === day && c.adUpgrades >= config.adUpgradesPerDay) return null;
    // On offer at this level (and with its vehicle on the road) and not maxed: what `priceOf` prices.
    const open = (u: Upgrade): boolean => Careers.priceOf(c, u, config) !== null;
    // The shield's dear steps are bought, never watched for.
    const offered = UPGRADES.filter((u) => u !== 'shield');
    const start = Math.floor(new Rng((c.casinoSeed ^ Math.imul(day + 1, 0x9e3779b1) ^ 0xad0f5e1) >>> 0).unit() * offered.length);
    for (let i = 0; i < offered.length; i++) {
      const u = offered[(start + i) % offered.length];
      if (open(u)) return u;
    }
    return null;
  },

  /** A watched ad: one free step of `adUpgradeOffer`. Null when there is none today. */
  rewardAdUpgrade(c: Career, day: number, config: Config = baseConfig): Upgrade | null {
    const u = Careers.adUpgradeOffer(c, day, config);
    if (u === null) return null;
    if (c.adUpgradeDay !== day) {
      c.adUpgradeDay = day;
      c.adUpgrades = 0;
    }
    c.adUpgrades++;
    c.upgrades[u] = Careers.steps(c, u) + 1;
    return u;
  },

  adBoostsLeft: (c: Career, day: number, config: Config = baseConfig): number => Math.max(0, config.adBoostsPerDay - (c.adBoostDay === day ? c.adBoosts : 0)),

  /** A watched ad: the next Skin Upgrade round gets `upgradeAdBoost` more chance. False when one is already waiting or today's are used up. */
  rewardAdBoost(c: Career, day: number, config: Config = baseConfig): boolean {
    if (c.upgradeBoost || Careers.adBoostsLeft(c, day, config) <= 0) return false;
    if (c.adBoostDay !== day) {
      c.adBoostDay = day;
      c.adBoosts = 0;
    }
    c.adBoosts++;
    c.upgradeBoost = true;
    return true;
  },

  /** The days of a broken streak an ad can bring back (`streakRescueMin` and up, broken over few days, not yet this week), or null. */
  adRescue(c: Career, day: number, config: Config = baseConfig): number | null {
    const missed = day - c.dailyPlayed - 1;
    const broken = c.dailyStreak >= config.streakRescueMin && missed > c.streakFreezes && missed <= config.streakRescueMaxMissed;
    return broken && Careers.isDailyOpen(c, day) && day - c.adRescueDay >= config.streakRescueEvery ? c.dailyStreak : null;
  },

  /** A watched ad: the missed days count as played, so today's Daily goes on with the streak. Null when there is nothing to bring back. */
  rewardAdRescue(c: Career, day: number, config: Config = baseConfig): number | null {
    const days = Careers.adRescue(c, day, config);
    if (days === null) return null;
    c.dailyPlayed = day - 1;
    c.adRescueDay = day;
    return days;
  },

  /** Yesterday counted, no Freeze in stock and none given today: an ad can hand out one. */
  adFreezeOpen: (c: Career, day: number): boolean => c.dailyStreak > 0 && c.dailyPlayed === day - 1 && c.streakFreezes === 0 && c.adFreezeDay !== day,

  /** A watched ad: one Streak Freeze. False when none is open. */
  rewardAdFreeze(c: Career, day: number): boolean {
    if (!Careers.adFreezeOpen(c, day)) return false;
    c.streakFreezes++;
    c.adFreezeDay = day;
    return true;
  },

  /** What a watched ad adds to today's Daily pay once more: the pay itself, once a day. */
  adDoubleOpen: (c: Career, day: number, pay: number): boolean => pay > 0 && c.adDoubleDay !== day,

  /** A watched ad: the Daily's pay again. False when today's is taken or there was none. */
  rewardAdDouble(c: Career, day: number, pay: number): boolean {
    if (!Careers.adDoubleOpen(c, day, pay)) return false;
    c.money += pay;
    c.adDoubleDay = day;
    return true;
  },

  adShiftDoublesLeft: (c: Career, day: number, config: Config = baseConfig): number =>
    Math.max(0, config.adShiftDoublesPerDay - (c.adShiftDoubleDay === day ? c.adShiftDoubles : 0)),

  /** A watched ad: a won career shift's pay again. False when today's are taken or there was none. */
  rewardAdShiftDouble(c: Career, day: number, pay: number, config: Config = baseConfig): boolean {
    if (pay <= 0 || Careers.adShiftDoublesLeft(c, day, config) <= 0) return false;
    if (c.adShiftDoubleDay !== day) {
      c.adShiftDoubleDay = day;
      c.adShiftDoubles = 0;
    }
    c.adShiftDoubles++;
    c.money += pay;
    return true;
  },

  adRevivesLeft: (c: Career, day: number, config: Config = baseConfig): number => Math.max(0, config.reviveAdsPerDay - (c.adReviveDay === day ? c.adRevives : 0)),

  /** A watched ad: one of today's revives is used. False when they are taken. */
  rewardAdRevive(c: Career, day: number, config: Config = baseConfig): boolean {
    if (Careers.adRevivesLeft(c, day, config) <= 0) return false;
    if (c.adReviveDay !== day) {
      c.adReviveDay = day;
      c.adRevives = 0;
    }
    c.adRevives++;
    return true;
  },

  // MARK: Daily, challenges, albums, best times

  /** Back after `comebackDays` or more: a Premium Chest, with its usual odds. Before the login is booked (it reads the last day). */
  giveComebackChest(c: Career, day: number, config: Config = baseConfig): boolean {
    if (c.lastLoginDay < 0 || day - c.lastLoginDay < config.comebackDays) return false;
    c.chests.push('premium');
    return true;
  },

  collectLoginIncome(c: Career, day: number, config: Config = baseConfig): number | null {
    const last = c.lastLoginDay;
    c.lastLoginDay = Math.max(c.lastLoginDay, day);
    if (last < 0 || day <= last) return null;
    const days = Math.min(day - last, config.loginMaxDays);
    const booths = Object.entries(c.modules).reduce((n, [slot, m]) => (m === 'tollBooth' ? n + (c.moduleLevels[Number(slot)] ?? 1) : n), 0);
    const income = booths * config.tollIncomePerDay * days;
    if (income <= 0) return null;
    c.money += income;
    return income;
  },

  /** Promises tomorrow's gift, once in a career's life: true when it was promised now. */
  promiseGift(c: Career, day: number): boolean {
    if (c.giftDay !== -1) return false;
    c.giftDay = day + 1;
    return true;
  },

  /** Tomorrow's gift is still to come (the Game tab counts down to it). */
  giftAhead: (c: Career, day: number): boolean => c.giftDay > day,

  /** The promised gift, on its day or any day after: a Standard Chest. True when it was given now. */
  collectGift(c: Career, day: number): boolean {
    if (c.giftDay < 0 || day < c.giftDay) return false;
    c.giftDay = -2;
    c.chests.push('standard');
    return true;
  },

  /** A career shift on the career's level was won or lost: counts the losses in a row there. */
  noteShift(c: Career, won: boolean): void {
    c.levelLosses = won ? 0 : c.levelLosses + 1;
  },

  isDailyOpen: (c: Career, day: number): boolean => (c.dailyPlayed !== day || c.dailyRetry) && c.dailyDone !== day,

  /** Today's Daily was played and lost, no ad has given it a second try today (Leo, 16.10.2026: once a day). */
  adRetryOpen: (c: Career, day: number): boolean => c.dailyPlayed === day && c.dailyDone !== day && !c.dailyRetry && c.adRetryDay !== day,

  /** A watched ad: the lost Daily can be played once more. False when none is open. */
  rewardAdRetry(c: Career, day: number): boolean {
    if (!Careers.adRetryOpen(c, day)) return false;
    c.dailyRetry = true;
    c.adRetryDay = day;
    return true;
  },

  startDaily(c: Career, day: number, config: Config = baseConfig): StreakNews | null {
    if (!Careers.isDailyOpen(c, day)) return null;
    // The second try is the same day: the streak counted at the first.
    if (c.dailyRetry) {
      c.dailyRetry = false;
      return { item: null, chest: null, frozen: 0, earned: false, cards: 0 };
    }
    const news = Careers.advanceStreak(c, day, config);
    const milestone = STREAK_MILESTONES.find((m) => m.days === c.dailyStreak);
    if (milestone && !c.collection.includes(milestone.item)) {
      Careers.collect(c, milestone.item);
      news.item = milestone.item;
    }
    if (!c.starterChest && c.dailyStreak >= config.starterStreakDays) {
      c.starterChest = true;
      c.chests.push(config.starterStreakChest);
      news.chest = config.starterStreakChest;
    }
    return news;
  },

  /** Counts today into the streak: yesterday continues it, missed days are covered by Freezes (one each), otherwise it starts again. */
  advanceStreak(c: Career, day: number, config: Config = baseConfig): StreakNews {
    const missed = day - c.dailyPlayed - 1;
    const frozen = c.dailyStreak > 0 && missed > 0 && missed <= c.streakFreezes ? missed : 0;
    c.streakFreezes -= frozen;
    c.dailyStreak = missed === 0 || frozen > 0 ? c.dailyStreak + 1 : 1;
    c.dailyPlayed = day;
    const earned = (c.dailyStreak === config.streakFreezeFirst || c.dailyStreak % config.streakFreezeEvery === 0) && c.streakFreezes < config.streakFreezeMax;
    if (earned) c.streakFreezes++;
    const cards = c.dailyStreak % config.scratchStreakEvery === 0 && c.scratchCards < config.scratchMax ? 1 : 0;
    c.scratchCards += cards;
    return { item: null, chest: null, frozen, earned, cards };
  },

  /** The next thing the streak pays: the starter chest while it waits, else the next milestone skin. */
  nextStreakMilestone(c: Career, config: Config = baseConfig): StreakMilestone | null {
    if (!c.starterChest) return { days: config.starterStreakDays, prize: { k: 'chest', chest: config.starterStreakChest }, left: Math.max(1, config.starterStreakDays - c.dailyStreak) };
    const m = STREAK_MILESTONES.find((x) => !c.collection.includes(x.item));
    return m ? { days: m.days, prize: { k: 'item', id: m.item }, left: Math.max(1, m.days - c.dailyStreak) } : null;
  },

  completeDaily(c: Career, day: number, config: Config = baseConfig): number | null {
    if (c.dailyDone === day) return null;
    if (c.dailyPlayed !== day) Careers.advanceStreak(c, day, config);
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
    for (const ch of challengesOf(day, Careers.reach(c))) {
      if (c.challengesDone.includes(ch) || !challengeMet(ch, r)) continue;
      c.challengesDone.push(ch);
      c.money += challengeReward(ch, Careers.reach(c));
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

  /** The Unlimited milestones a best run of `cars` has reached and the collection still lacks: collected now. */
  claimUnlimited(c: Career, cars: number): string[] {
    const fresh = unlimitedRewards(cars).filter((x) => !Careers.owns(c, x.id));
    for (const item of fresh) Careers.collect(c, item.id);
    return fresh.map((x) => x.id);
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
    extra: LegendaryRule[] | undefined = undefined,
  ): Config {
    // Unlimited and Mayhem have their own fixed level: no Prestige head start, no legendary rule.
    if (mode === 'unlimited') {
      const cfg = Careers.config({ ...c, level: base.endlessLevel, prestige: 0 }, base, seed, null, event, null);
      cfg.endless = true;
      // One crash ends every run: the Unlimited board compares them.
      cfg.maxStrikes = base.maxStrikes;
      // The precision upgrades pay and forgive in shifts, not in a run the board compares.
      cfg.tightFitTip = 0;
      cfg.nearMissTip = 0;
      cfg.chainSaves = 0;
      // Every run recovers as if Quick Recovery were maxed, whatever was bought: the cars get back up to speed fast and the board stays even.
      cfg.driverAcceleration = base.driverAcceleration * (1 + upgradeMaxSteps.quickRecovery * base.recoveryPerStep);
      return cfg;
    }
    if (mode === 'mayhem') return forMayhem(Careers.config({ ...c, level: base.mayhemLevel, prestige: 0 }, base, seed, null, event, null));
    const cfg = forIntro(Careers.config(c, base, seed, null, event, legendary, extra), c.level + Careers.headStart(c, base));
    // The scout goes by the level alone: a challenge from such a shift brings it as well.
    cfg.scout = c.level === base.scoutLevel && !cfg.convoy;
    return cfg;
  },

  /**
   * A plain career shift (not the Daily, a challenge or a trial), eased by what this career has been through: after
   * `easeAfterLosses` lost shifts on the level the fewest cars it has and quieter traffic with every further loss
   * (`forEase`), a forgiven first crash until the first won shift, and the first bad weather and the first night for
   * sure once their level is passed. Each marks the shift `assisted`.
   */
  careerShift(c: Career, base: Config, seed: number): Config {
    let cfg = Careers.shiftConfig(c, 'shift', base, seed);
    const eased = (next: Config): Config => ({ ...next, assisted: true });
    const fresh = c.prestige === 0 && c.mastery.shiftsCompleted === 0;
    if (fresh) cfg = eased({ ...cfg, maxStrikes: cfg.maxStrikes + 1 });
    const after = fresh ? base.easeAfterLossesNew : base.easeAfterLosses;
    if (c.levelLosses >= after) {
      const fewest = shiftCarsRange(cfg.level, base)[0];
      if (cfg.shiftCars > fewest && !cfg.convoy) cfg = eased({ ...cfg, shiftCars: fewest });
      cfg = forEase(cfg, c.levelLosses - after + 1);
    }
    // A Legendary Shift has its own sky; a career after a Prestige has met it all.
    if (cfg.legendary === null && c.prestige === 0) {
      const met = (shelf: string): boolean => c.museumSeen.some((id) => id.startsWith(shelf));
      if (cfg.weather === 'clear' && c.level >= base.firstWeatherLevel && !met('weather.')) cfg = eased(forWeather(cfg, 'lightRain'));
      if (!cfg.night && c.level >= base.firstNightLevel && !met('dark.')) cfg = eased(forNight(cfg, 'night'));
    }
    if (c.level + Careers.headStart(c, base) >= base.adaptiveLevel) cfg = { ...cfg, adaptive: true };
    return Mafia.late(c) ? Mafia.withoutLoot(cfg) : cfg;
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
    m.shaves += r.shaves ?? 0;
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
