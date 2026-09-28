import { type SaveGame, type Career, newSave, newCareer, GAME_MODES, MASTERY_GOALS, type GameMode } from '../core/career';
import { UPGRADES, upgradeMaxSteps } from '../core/levels';
import { COSMETICS, CHEST_KINDS, type ChestKind, MAX_CAR_SKINS, cosmetic } from '../core/loot';
import { ROAD_MODULES, type RoadModule, BOSS_KINDS, type BossKind, baseConfig } from '../core/config';
import { RUN_IDS } from '../core/trials';
import { MUSEUM_IDS, MUSEUM_SHELVES, type MuseumShelf, inferredSightings } from '../core/museum';

const KEY = 'carGame.save.v2';
const LEGACY_KEY = 'carGame.career.v1';

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
    unseen: strings(raw.unseen).filter((id) => collection.includes(id)),
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
    purchases: strings(raw.purchases),
    adCashCount: int(raw.adCashCount, 0, 0),
    adCashDay: int(raw.adCashDay, -1),
    trialsDone: [...new Set(strings(raw.trialsDone).filter((id) => RUN_IDS.includes(id)))],
    bossTrophies: int(raw.bossTrophies, 0, 0),
    bossesBeaten,
    prestige: int(raw.prestige, 0, 0),
    legendaryDone: int(raw.legendaryDone, 0, 0),
    weeklyDone: int(raw.weeklyDone, -1),
    weekliesDone: int(raw.weekliesDone, 0, 0),
    museumSeen,
    museumNew: [...new Set(strings(raw.museumNew).filter((id) => museumSeen.includes(id)))],
    museumShelves: MUSEUM_SHELVES.length,
  };
}

function readSave(raw: unknown): SaveGame {
  const fresh = newSave();
  if (!isObject(raw)) return fresh;
  const settings = { ...fresh.settings };
  if (isObject(raw.settings)) {
    const s = raw.settings;
    if (typeof s.sound === 'boolean') settings.sound = s.sound;
    if (typeof s.haptics === 'boolean') settings.haptics = s.haptics;
    if (typeof s.vehicleLabels === 'boolean') settings.vehicleLabels = s.vehicleLabels;
    if (s.reduceMotion === 'system' || s.reduceMotion === 'on' || s.reduceMotion === 'off') settings.reduceMotion = s.reduceMotion;
  }
  return {
    version: 2,
    highscore: int(raw.highscore, 0, 0),
    highscoreSeed: typeof raw.highscoreSeed === 'number' ? raw.highscoreSeed : null,
    shiftsPlayed: int(raw.shiftsPlayed, 0, 0),
    settings,
    career: readCareer(raw.career),
    tutorialDone: raw.tutorialDone === true,
    mode: GAME_MODES.includes(raw.mode as GameMode) ? (raw.mode as GameMode) : 'shift',
    unlimitedBest: int(raw.unlimitedBest, 0, 0),
    unlimitedBestCars: int(raw.unlimitedBestCars, 0, 0),
    mayhemBest: int(raw.mayhemBest, 0, 0),
    mayhemBestChain: int(raw.mayhemBestChain, 0, 0),
  };
}

/** The first web version kept a smaller career; its progress carries over once. */
function readLegacy(raw: unknown): SaveGame | null {
  if (!isObject(raw)) return null;
  const save = newSave();
  save.career = readCareer(raw);
  if (isObject(raw.records)) {
    save.highscore = int(raw.records.bestScore, 0, 0);
    save.unlimitedBest = int(raw.records.unlimitedBest, 0, 0);
    save.unlimitedBestCars = int(raw.records.unlimitedCars, 0, 0);
    save.shiftsPlayed = int(raw.records.shiftsPlayed, 0, 0);
  }
  if (isObject(raw.settings)) {
    if (typeof raw.settings.sound === 'boolean') save.settings.sound = raw.settings.sound;
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
    const text = localStorage.getItem(KEY);
    if (text) return readSave(JSON.parse(text));
    const legacy = localStorage.getItem(LEGACY_KEY);
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
    localStorage.setItem(KEY, JSON.stringify(save));
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
    localStorage.removeItem(KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* nothing to remove */
  }
  return newSave();
}
