import { type Config, type CityEvent, type RoadModule, CITY_EVENTS, ROAD_MODULES } from './config';
import { UPGRADES, upgradeMaxSteps, type Upgrade } from './levels';
import { type Career, type GameMode, GAME_MODES, Careers, newCareer } from './career';

/**
 * A shareable challenge (a link, no server): everything that makes up one shift, so a friend
 * plays the very same traffic. The world starts fresh from the seed and waits for the first
 * tap; with the same seed, config and taps the result is the same (FOUNDATION.md 4.1). The
 * target is the sender's score (flames in Mayhem).
 */
export interface ChallengeSpec {
  seed: number;
  mode: GameMode;
  level: number;
  upgrades: Partial<Record<Upgrade, number>>;
  armSlots: number[];
  modules: Record<number, RoadModule>;
  /** Unlockable car types the sender owns: they change the traffic mix. */
  cars: string[];
  cashBoost: boolean;
  event: CityEvent | null;
  target: number;
}

const CAR_TYPES = ['sportsCar', 'compact', 'van'];

/** The challenge of a shift just played with this career. */
export function challengeOf(c: Career, mode: GameMode, level: number, seed: number, event: CityEvent | null, target: number): ChallengeSpec {
  return {
    seed: seed >>> 0,
    mode,
    level,
    upgrades: { ...c.upgrades },
    armSlots: [...c.armSlots],
    modules: { ...c.modules },
    cars: CAR_TYPES.filter((id) => Careers.owns(c, id)),
    cashBoost: Careers.hasPurchased(c, 'cashBoost'),
    event,
    target: Math.max(0, Math.round(target)),
  };
}

/** The career a challenge is played with: only what shapes the shift, nothing of the friend's. */
export function challengeCareer(s: ChallengeSpec): Career {
  return {
    ...newCareer(),
    level: s.level,
    upgrades: { ...s.upgrades },
    armSlots: [...s.armSlots],
    modules: { ...s.modules },
    collection: [...s.cars],
    purchases: s.cashBoost ? ['cashBoost'] : [],
  };
}

export function challengeConfig(s: ChallengeSpec, base: Config): Config {
  return Careers.shiftConfig(challengeCareer(s), s.mode, base, s.seed, s.event);
}

// MARK: Link text

const toBase64Url = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (code: string): string => {
  const padded = code.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((code.length + 3) % 4);
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (ch) => ch.charCodeAt(0)));
};

/** Short and URL-safe: a versioned array, base64url. */
export function encodeChallenge(s: ChallengeSpec): string {
  const upgrades = UPGRADES.map((u) => s.upgrades[u] ?? 0);
  const modules = Object.entries(s.modules).map(([slot, m]) => [Number(slot), ROAD_MODULES.indexOf(m)]);
  const packed = [1, s.seed, GAME_MODES.indexOf(s.mode), s.level, upgrades, s.armSlots, modules, s.cars.map((id) => CAR_TYPES.indexOf(id)), s.cashBoost ? 1 : 0, s.event ? CITY_EVENTS.indexOf(s.event) : -1, s.target];
  return toBase64Url(JSON.stringify(packed));
}

const isInt = (x: unknown, min: number, max: number): x is number => typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max;

/** Null for anything that is not a valid challenge: a link can be typed or cut short. */
export function decodeChallenge(code: string): ChallengeSpec | null {
  let packed: unknown;
  try {
    packed = JSON.parse(fromBase64Url(code));
  } catch {
    return null;
  }
  if (!Array.isArray(packed) || packed[0] !== 1 || packed.length < 11) return null;
  const [, seed, mode, level, ups, arms, mods, cars, boost, event, target] = packed as unknown[];
  if (!isInt(seed, 0, 0xffffffff) || !isInt(mode, 0, GAME_MODES.length - 1) || !isInt(level, 1, 999) || !isInt(target, 0, 1e9)) return null;
  if (!Array.isArray(ups) || !Array.isArray(arms) || !Array.isArray(mods) || !Array.isArray(cars)) return null;
  const upgrades: Partial<Record<Upgrade, number>> = {};
  UPGRADES.forEach((u, i) => {
    const steps = ups[i];
    if (isInt(steps, 1, upgradeMaxSteps[u])) upgrades[u] = steps;
  });
  const armSlots = [...new Set(arms.filter((x): x is number => isInt(x, 0, 15)))].sort((a, b) => a - b);
  if (!armSlots.includes(0) || armSlots.length < 4) return null;
  const modules: Record<number, RoadModule> = {};
  for (const m of mods) {
    if (Array.isArray(m) && isInt(m[0], 0, 5) && isInt(m[1], 0, ROAD_MODULES.length - 1)) modules[m[0]] = ROAD_MODULES[m[1]];
  }
  return {
    seed,
    mode: GAME_MODES[mode],
    level,
    upgrades,
    armSlots,
    modules,
    cars: cars.filter((x): x is number => isInt(x, 0, CAR_TYPES.length - 1)).map((i) => CAR_TYPES[i]),
    cashBoost: boost === 1,
    event: isInt(event, 0, CITY_EVENTS.length - 1) ? CITY_EVENTS[event] : null,
    target,
  };
}
