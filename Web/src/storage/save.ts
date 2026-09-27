import { type Career, newCareer, MAX_CAR_SKINS } from '../core/career';
import { UPGRADES, upgradeMaxSteps } from '../core/levels';
import { CATALOG } from '../core/loot';

const KEY = 'carGame.career.v1';

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const num = (x: unknown, fallback: number, min = 0): number => (typeof x === 'number' && Number.isFinite(x) ? Math.max(min, x) : fallback);
const strings = (x: unknown): string[] => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string') : []);

/**
 * Reads the career from localStorage. Anything missing or malformed falls back to the
 * default, field by field, so an old or damaged save never breaks the game.
 */
export function loadCareer(): Career {
  const fresh = newCareer();
  let raw: unknown;
  try {
    const text = localStorage.getItem(KEY);
    if (!text) return fresh;
    raw = JSON.parse(text);
  } catch {
    return fresh;
  }
  if (!isObject(raw)) return fresh;
  const known = new Set(CATALOG.map((c) => c.id));
  const collection = strings(raw.collection).filter((id) => known.has(id));
  const upgrades: Career['upgrades'] = {};
  if (isObject(raw.upgrades)) {
    for (const u of UPGRADES) {
      const steps = num(raw.upgrades[u], 0);
      if (steps > 0) upgrades[u] = Math.min(Math.floor(steps), upgradeMaxSteps[u]);
    }
  }
  const mastery = { ...fresh.mastery };
  if (isObject(raw.mastery)) for (const k of Object.keys(mastery) as (keyof typeof mastery)[]) mastery[k] = num(raw.mastery[k], 0);
  const masteryTiers: Career['masteryTiers'] = {};
  if (isObject(raw.masteryTiers)) {
    for (const [k, value] of Object.entries(raw.masteryTiers)) masteryTiers[k as keyof Career['masteryTiers']] = Math.min(3, num(value, 0));
  }
  const records = { ...fresh.records };
  if (isObject(raw.records)) for (const k of Object.keys(records) as (keyof typeof records)[]) records[k] = num(raw.records[k], fresh.records[k]);
  const settings = { ...fresh.settings };
  if (isObject(raw.settings)) {
    if (typeof raw.settings.sound === 'boolean') settings.sound = raw.settings.sound;
    if (typeof raw.settings.haptics === 'boolean') settings.haptics = raw.settings.haptics;
    if (raw.settings.reduceMotion === 'on' || raw.settings.reduceMotion === 'off' || raw.settings.reduceMotion === 'system') {
      settings.reduceMotion = raw.settings.reduceMotion;
    }
  }
  const chests = strings(raw.chests).filter((c): c is Career['chests'][number] => c === 'standard' || c === 'premium' || c === 'criminalHunt');
  return {
    version: 1,
    level: Math.floor(num(raw.level, 1, 1)),
    money: Math.floor(num(raw.money, 0)),
    upgrades,
    collection,
    carSkins: strings(raw.carSkins)
      .filter((id) => collection.includes(id) && CATALOG.find((c) => c.id === id)?.kind === 'carSkin')
      .slice(0, MAX_CAR_SKINS),
    unseen: strings(raw.unseen).filter((id) => collection.includes(id)),
    chests,
    chestsOpened: num(raw.chestsOpened, 0),
    chestsSinceEpic: num(raw.chestsSinceEpic, 0),
    mastery,
    masteryTiers,
    records,
    settings,
    tutorialDone: raw.tutorialDone === true,
  };
}

/** Writes the career. Storage can be full or blocked (private mode): the game plays on. */
export function saveCareer(career: Career): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(career));
    return true;
  } catch {
    return false;
  }
}

export function resetCareer(): Career {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* blocked storage: nothing to remove */
  }
  return newCareer();
}
