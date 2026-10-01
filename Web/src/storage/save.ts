import { type SaveGame, type Career, type Hint, HINTS, newSave, newCareer, GAME_MODES, MASTERY_GOALS, type GameMode } from '../core/career';
import { UPGRADES, upgradeMaxSteps } from '../core/levels';
import { COSMETICS, CHEST_KINDS, type ChestKind, type CosmeticSource, MAX_CAR_SKINS, cosmetic } from '../core/loot';
import { ROAD_MODULES, type RoadModule, BOSS_KINDS, type BossKind, baseConfig } from '../core/config';
import { RUN_IDS } from '../core/trials';
import { MUSEUM_IDS, MUSEUM_SHELVES, type MuseumShelf, inferredSightings } from '../core/museum';
import { TITLES, type TitleId } from '../core/elite';
import { type CasinoGame, type CasinoPending, type CasinoRound, CASINO_GAMES } from '../core/casino';
import { storage } from './store';
import { PASS_TIERS, type HallEntry } from '../core/seasonPass';

const KEY = 'carGame.save.v2';
const LEGACY_KEY = 'carGame.career.v1';
/** Everything the save is made of, for a switch to another store (`useStore`). */
export const SAVE_KEYS = [KEY, LEGACY_KEY] as const;

type Raw = Record<string, unknown>;
const isObject = (x: unknown): x is Raw => typeof x === 'object' && x !== null && !Array.isArray(x);
const num = (x: unknown, fallback: number, min = -Infinity): number => (typeof x === 'number' && Number.isFinite(x) ? Math.max(min, x) : fallback);
const int = (x: unknown, fallback: number, min = -Infinity): number => Math.floor(num(x, fallback, min));
const strings = (x: unknown): string[] => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string') : []);

function readCareer(raw: unknown): Career {
  const fresh = newCareer();
  if (!isObject(raw)) return fresh;
  const known = new Set(COSMETICS.map((c) => c.id));
  const collection = [...new Set(strings(raw.collection).filter((id) => known.has(id)))];
  // A reward added after the save had passed its deed (Big Screen at ★5, the Feats) arrives now, marked new.
  const prestige = int(raw.prestige, 0, 0);
  const eliteClaimed = int(raw.eliteClaimed, 0, 0);
  const legendaryDone = int(raw.legendaryDone, 0, 0);
  const earned = (s: CosmeticSource): boolean =>
    (s.kind === 'prestige' && s.rank <= prestige) || (s.kind === 'elite' && s.level <= eliteClaimed) || (s.kind === 'legendary' && s.shifts <= legendaryDone);
  const late = COSMETICS.filter((c) => earned(c.source) && !collection.includes(c.id)).map((c) => c.id);
  collection.push(...late);
  const upgrades: Career['upgrades'] = {};
  if (isObject(raw.upgrades)) {
    for (const u of UPGRADES) {
      const steps = int(raw.upgrades[u], 0, 0);
      if (steps > 0) upgrades[u] = Math.min(steps, upgradeMaxSteps[u]);
    }
  }
  const armSlots = [...new Set([0, ...strings([]).map(Number), ...(Array.isArray(raw.armSlots) ? raw.armSlots : [])])]
    .filter((x): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x < 16)
    .sort((a, b) => a - b);
  const modules: Record<number, RoadModule> = {};
  if (isObject(raw.modules)) {
    for (const [slot, m] of Object.entries(raw.modules)) {
      const n = Number(slot);
      if (Number.isInteger(n) && n >= 0 && n < 6 && ROAD_MODULES.includes(m as RoadModule)) modules[n] = m as RoadModule;
    }
  }
  const mastery = { ...fresh.mastery };
  if (isObject(raw.mastery)) for (const k of Object.keys(mastery) as (keyof typeof mastery)[]) mastery[k] = int(raw.mastery[k], 0, 0);
  const masteryTiers: Career['masteryTiers'] = {};
  if (isObject(raw.masteryTiers)) {
    for (const goal of MASTERY_GOALS) {
      const t = int(raw.masteryTiers[goal], 0, 0);
      if (t > 0) masteryTiers[goal] = Math.min(3, t);
    }
  }
  const bestTimes: Record<string, number[]> = {};
  if (isObject(raw.bestTimes)) {
    for (const [level, times] of Object.entries(raw.bestTimes)) {
      if (Array.isArray(times) && times.every((t) => typeof t === 'number' && Number.isFinite(t))) bestTimes[level] = times as number[];
    }
  }
  const bossesBeaten = [...new Set(strings(raw.bossesBeaten).filter((k): k is BossKind => BOSS_KINDS.includes(k as BossKind)))];
  // A save from before the Museum starts with what it must have met already.
  const infer = (shelves?: MuseumShelf[]): string[] => inferredSightings(int(raw.level, 1, 1), int(raw.prestige, 0, 0), bossesBeaten, mastery, baseConfig, shelves);
  // A shelf the save did not know yet (the Museum began with two) starts from what it must have met.
  const knownShelves = int(raw.museumShelves, 2, 0);
  const museumSeen = Array.isArray(raw.museumSeen)
    ? [...new Set([...strings(raw.museumSeen).filter((id) => MUSEUM_IDS.includes(id)), ...infer(MUSEUM_SHELVES.filter((s) => s >= knownShelves))])]
    : infer();
  const mapSkin = typeof raw.mapSkin === 'string' && collection.includes(raw.mapSkin) && cosmetic(raw.mapSkin)?.kind === 'mapSkin' ? raw.mapSkin : null;
  return {
    level: int(raw.level, 1, 1),
    money: int(raw.money, 0, 0),
    upgrades,
    armSlots: armSlots.length >= 4 ? armSlots : fresh.armSlots,
    modules,
    mastery,
    masteryTiers,
    chests: strings(raw.chests).filter((c): c is ChestKind => CHEST_KINDS.includes(c as ChestKind)),
    collection,
    unseen: [...new Set([...strings(raw.unseen).filter((id) => collection.includes(id)), ...late])],
    carSkins: strings(raw.carSkins)
      .filter((id) => collection.includes(id) && cosmetic(id)?.kind === 'carSkin')
      .slice(0, MAX_CAR_SKINS),
    mapSkin,
    adChests: int(raw.adChests, 0, 0),
    adDay: int(raw.adDay, -1),
    chestsOpened: int(raw.chestsOpened, 0, 0),
    chestsSinceEpic: int(raw.chestsSinceEpic, 0, 0),
    dailyDone: int(raw.dailyDone, -1),
    lastLoginDay: int(raw.lastLoginDay, -1),
    dailyStreak: int(raw.dailyStreak, 0, 0),
    challengeDay: int(raw.challengeDay, -1),
    challengesDone: strings(raw.challengesDone),
    dailyPlayed: int(raw.dailyPlayed, int(raw.dailyDone, -1)),
    albumsDone: strings(raw.albumsDone),
    bestTimes,
    trialsDone: [...new Set(strings(raw.trialsDone).filter((id) => RUN_IDS.includes(id)))],
    bossTrophies: int(raw.bossTrophies, 0, 0),
    bossesBeaten,
    prestige,
    legendaryDone,
    eliteXp: int(raw.eliteXp, 0, 0),
    eliteClaimed,
    title: TITLES.includes(raw.title as TitleId) ? (raw.title as TitleId) : null,
    titlesSeen: [...new Set(strings(raw.titlesSeen).filter((t): t is TitleId => TITLES.includes(t as TitleId)))],
    weeklyDone: int(raw.weeklyDone, -1),
    weekliesDone: int(raw.weekliesDone, 0, 0),
    museumSeen,
    museumNew: [...new Set(strings(raw.museumNew).filter((id) => museumSeen.includes(id)))],
    museumShelves: MUSEUM_SHELVES.length,
    casinoSeed: int(raw.casinoSeed, fresh.casinoSeed, 0) >>> 0,
    casinoRounds: int(raw.casinoRounds, 0, 0),
    casinoPending: readPending(raw.casinoPending, collection),
    casinoLog: Array.isArray(raw.casinoLog) ? raw.casinoLog.flatMap(readRound).slice(-baseConfig.casinoLogLength) : [],
    casinoBestWin: int(raw.casinoBestWin, 0, 0),
    casinoBestCrash: num(raw.casinoBestCrash, 0, 0),
    casinoDay: int(raw.casinoDay, -1),
    casinoNet: int(raw.casinoNet, 0),
    tapOffsets: (Array.isArray(raw.tapOffsets) ? raw.tapOffsets : [])
      .filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
      .map((x) => Math.max(-5000, Math.min(5000, Math.round(x))))
      .slice(-baseConfig.timingSamples),
    passKey: typeof raw.passKey === 'string' && /^(winter|spring|summer|autumn)-\d{4}$/.test(raw.passKey) ? raw.passKey : null,
    passXp: int(raw.passXp, 0, 0),
    passClaimed: Math.min(int(raw.passClaimed, 0, 0), PASS_TIERS),
    hallBuilt: raw.hallBuilt === true,
    hallOfFame: (Array.isArray(raw.hallOfFame) ? raw.hallOfFame : []).flatMap((x): HallEntry[] => {
      if (!x || typeof x !== 'object') return [];
      const e = x as Record<string, unknown>;
      return [{ rank: int(e.rank, 1, 1), day: int(e.day, -1), bosses: int(e.bosses, 0, 0), legendary: int(e.legendary, 0, 0), elite: int(e.elite, 0, 0) }];
    }).slice(0, 100),
  };
}

/** Ranks reached before the Hall of Fame kept plaques get one each, without a date. */
function withPlaques(c: Career): Career {
  const known = new Set(c.hallOfFame.map((e) => e.rank));
  for (let rank = 1; rank <= c.prestige; rank++) if (!known.has(rank)) c.hallOfFame.push({ rank, day: -1, bosses: 0, legendary: 0, elite: 0 });
  c.hallOfFame.sort((a, b) => a.rank - b.rank);
  return c;
}

/** An open casino round; anything implausible is dropped (the round then never happened). */
function readPending(raw: unknown, collection: string[]): CasinoPending | null {
  if (!isObject(raw)) return null;
  if (raw.k === 'crash') {
    const stake = int(raw.stake, 0, 0);
    return stake > 0 ? { k: 'crash', stake, seed: int(raw.seed, 0, 0) >>> 0 } : null;
  }
  if (raw.k !== 'win' || !CASINO_GAMES.includes(raw.game as CasinoGame)) return null;
  return { k: 'win', game: raw.game as CasinoGame, money: int(raw.money, 0, 0), items: strings(raw.items).filter((id) => collection.includes(id)), flips: int(raw.flips, 0, 0) };
}

function readRound(raw: unknown): CasinoRound[] {
  if (!isObject(raw) || !CASINO_GAMES.includes(raw.game as CasinoGame)) return [];
  const round: CasinoRound = { game: raw.game as CasinoGame, stake: int(raw.stake, 0, 0), win: int(raw.win, 0, 0), x: num(raw.x, 0, 0), day: int(raw.day, -1) };
  if (typeof raw.item === 'string' && cosmetic(raw.item)) round.item = raw.item;
  return [round];
}

/** Known hints only; someone with an Unlimited or Mayhem best has found the mode swipe already. */
function readHints(raw: Record<string, unknown>): Hint[] {
  const hints = new Set(strings(raw.hints).filter((h): h is Hint => (HINTS as readonly string[]).includes(h)));
  if (int(raw.unlimitedBest, 0, 0) > 0 || int(raw.mayhemBest, 0, 0) > 0) hints.add('modes');
  return [...hints];
}

function readSave(raw: unknown): SaveGame {
  const fresh = newSave();
  if (!isObject(raw)) return fresh;
  const settings = { ...fresh.settings };
  if (isObject(raw.settings)) {
    const s = raw.settings;
    if (typeof s.sound === 'boolean') settings.sound = s.sound;
    // One switch for both until 30.09.2026: whoever turned the sound off hears no music either.
    settings.music = typeof s.music === 'boolean' ? s.music : settings.sound;
    if (typeof s.haptics === 'boolean') settings.haptics = s.haptics;
    if (typeof s.vehicleLabels === 'boolean') settings.vehicleLabels = s.vehicleLabels;
    if (typeof s.leftHanded === 'boolean') settings.leftHanded = s.leftHanded;
    if (typeof s.largeText === 'boolean') settings.largeText = s.largeText;
    if (typeof s.motionChosen === 'boolean') settings.motionChosen = s.motionChosen;
    // "System" was the default until 29.09.2026: kept only when the player picked it since.
    if (s.reduceMotion === 'on' || s.reduceMotion === 'off') settings.reduceMotion = s.reduceMotion;
    else if (s.reduceMotion === 'system' && settings.motionChosen) settings.reduceMotion = 'system';
  }
  return {
    version: 2,
    highscore: int(raw.highscore, 0, 0),
    highscoreSeed: typeof raw.highscoreSeed === 'number' ? raw.highscoreSeed : null,
    shiftsPlayed: int(raw.shiftsPlayed, 0, 0),
    settings,
    career: withPlaques(readCareer(raw.career)),
    tutorialDone: raw.tutorialDone === true,
    hints: readHints(raw),
    mode: GAME_MODES.includes(raw.mode as GameMode) ? (raw.mode as GameMode) : 'shift',
    unlimitedBest: int(raw.unlimitedBest, 0, 0),
    unlimitedBestCars: int(raw.unlimitedBestCars, 0, 0),
    mayhemBest: int(raw.mayhemBest, 0, 0),
    mayhemBestChain: int(raw.mayhemBestChain, 0, 0),
    notesSeen: typeof raw.notesSeen === 'string' ? raw.notesSeen : null,
  };
}

/** The first web version kept a smaller career; its progress carries over once. */
function readLegacy(raw: unknown): SaveGame | null {
  if (!isObject(raw)) return null;
  const save = newSave();
  save.career = withPlaques(readCareer(raw));
  if (isObject(raw.records)) {
    save.highscore = int(raw.records.bestScore, 0, 0);
    save.unlimitedBest = int(raw.records.unlimitedBest, 0, 0);
    save.unlimitedBestCars = int(raw.records.unlimitedCars, 0, 0);
    save.shiftsPlayed = int(raw.records.shiftsPlayed, 0, 0);
  }
  if (isObject(raw.settings)) {
    if (typeof raw.settings.sound === 'boolean') save.settings.sound = save.settings.music = raw.settings.sound;
    if (typeof raw.settings.haptics === 'boolean') save.settings.haptics = raw.settings.haptics;
    const rm = raw.settings.reduceMotion;
    if (rm === 'system' || rm === 'on' || rm === 'off') save.settings.reduceMotion = rm;
  }
  save.tutorialDone = raw.tutorialDone === true;
  return save;
}

/** Reads the save game; anything missing or malformed falls back field by field. */
export function loadSave(): SaveGame {
  try {
    const text = storage().getItem(KEY);
    if (text) return readSave(JSON.parse(text));
    const legacy = storage().getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = readLegacy(JSON.parse(legacy));
      if (migrated) return migrated;
    }
  } catch {
    /* damaged or blocked storage: start fresh */
  }
  return newSave();
}

/** Writes the save game. Storage can be full or blocked (private mode): the game plays on. */
export function writeSave(save: SaveGame): boolean {
  try {
    storage().setItem(KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

/** Marks an exported file as ours, so a random JSON file is not taken for a save. */
const EXPORT_TAG = 'car-game-save';

/** The save as a file to carry to another device (Settings → Export progress). */
export function exportSave(save: SaveGame): string {
  return JSON.stringify({ format: EXPORT_TAG, version: 2, exportedAt: new Date().toISOString(), save }, null, 2);
}

/**
 * Reads an exported file back. Null when it is not a Car Game save; otherwise it goes through
 * the same field-by-field checks as the stored save, so a hand-edited file cannot break the game.
 */
export function parseImport(text: string): SaveGame | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(raw)) return null;
  const inner = raw.format === EXPORT_TAG ? raw.save : raw;
  if (!isObject(inner) || !isObject(inner.career)) return null;
  return readSave(inner);
}

export function eraseSave(): SaveGame {
  try {
    storage().removeItem(KEY);
    storage().removeItem(LEGACY_KEY);
  } catch {
    /* nothing to remove */
  }
  return newSave();
}
