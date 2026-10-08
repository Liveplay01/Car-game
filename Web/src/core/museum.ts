import { type Config, type BossKind, type Weather, type CityEvent, BOSS_KINDS, WEATHERS, CITY_EVENTS } from './config';
import { type Darkness, firstBossLevel, firstLevelOf, eventLevel } from './levels';
import type { VehicleType } from './vehicle';
import type { World } from './world';

/**
 * The Museum (Leo, 28.09.2026): the syndicate's bosses, the special vehicles and the city's
 * conditions, each one on show once it has been on the road in front of you. Until then it is
 * a grey silhouette.
 *
 * The catalogue follows the game's own lists (`BOSS_KINDS`, the vehicle types, `WEATHERS`,
 * `CITY_EVENTS`, the darkness): new content there is in the Museum at once. The tables below and
 * the texts and pictures in `present/` are records over those types, so the build fails until
 * a new kind has its level, its text and its picture.
 */
export type MuseumShelf = 0 | 1 | 2; // bosses · specials · conditions
export const MUSEUM_SHELVES: MuseumShelf[] = [0, 1, 2];

/** Traffic that is only traffic. Every other vehicle type is a special and goes in the Museum. */
const ORDINARY = ['car', 'sportsCar', 'compact', 'van', 'classic'] as const;
export type SpecialKind = Exclude<VehicleType, (typeof ORDINARY)[number]>;
export type WeatherKind = Exclude<Weather, 'clear'>;
export type DarkKind = Exclude<Darkness, 'day'>;
/** The road itself: the two-lane ring from its level on. */
export type RoadKind = 'twoLane';

/** The first level whose shifts can bring each special. A new vehicle type must be listed here or in `ORDINARY`. */
const SPECIAL_LEVEL: Record<SpecialKind, (c: Config) => number> = {
  police: () => 1,
  pickup: () => 1,
  transporter: () => 1,
  truck: () => 1,
  ambulance: (c) => c.ambulanceLevel,
  tanker: (c) => c.tankerLevel,
  military: (c) => c.militaryLevel,
  motorbike: (c) => c.motorbikeLevel,
  learner: (c) => c.learnerLevel,
  oversize: (c) => c.oversizeLevel,
  racer: (c) => c.racerLevel,
  wedding: (c) => c.weddingLevel,
  bus: (c) => c.schoolRunLevel,
  fireTruck: (c) => c.fireTruckLevel,
};
const DARK_LEVEL: Record<DarkKind, (c: Config) => number> = {
  night: (c) => c.nightLevel,
  blackout: (c) => c.blackoutLevel,
};

export const SPECIAL_KINDS = Object.keys(SPECIAL_LEVEL) as SpecialKind[];
export const WEATHER_KINDS = WEATHERS.filter((w): w is WeatherKind => w !== 'clear');
export const DARK_KINDS = Object.keys(DARK_LEVEL) as DarkKind[];

export type MuseumEntry =
  | { k: 'boss'; kind: BossKind }
  | { k: 'special'; kind: SpecialKind }
  | { k: 'weather'; kind: WeatherKind }
  | { k: 'dark'; kind: DarkKind }
  | { k: 'event'; kind: CityEvent }
  | { k: 'road'; kind: RoadKind };

export const museumId = (e: MuseumEntry): string => `${e.k}.${e.kind}`;

export function shelfEntries(shelf: MuseumShelf): MuseumEntry[] {
  switch (shelf) {
    case 0:
      return BOSS_KINDS.map((kind): MuseumEntry => ({ k: 'boss', kind }));
    case 1:
      return SPECIAL_KINDS.map((kind): MuseumEntry => ({ k: 'special', kind }));
    case 2:
      return [
        { k: 'road', kind: 'twoLane' },
        ...WEATHER_KINDS.map((kind): MuseumEntry => ({ k: 'weather', kind })),
        ...DARK_KINDS.map((kind): MuseumEntry => ({ k: 'dark', kind })),
        ...CITY_EVENTS.map((kind): MuseumEntry => ({ k: 'event', kind })),
      ];
  }
}

const BY_ID = new Map(MUSEUM_SHELVES.flatMap(shelfEntries).map((e) => [museumId(e), e]));
export const MUSEUM_IDS: string[] = [...BY_ID.keys()];

export const museumEntry = (id: string): MuseumEntry | null => BY_ID.get(id) ?? null;

/** The first level whose shifts can bring it (1: from the start). */
export function firstLevel(e: MuseumEntry, c: Config): number {
  switch (e.k) {
    case 'boss':
      return firstBossLevel(e.kind, c);
    case 'special':
      return SPECIAL_LEVEL[e.kind](c);
    case 'weather':
      return firstLevelOf(c, e.kind);
    case 'dark':
      return DARK_LEVEL[e.kind](c);
    case 'event':
      return eventLevel(c, e.kind);
    case 'road':
      return c.twoLaneLevel;
  }
}

/** A condition of a shift: the sky, the dark or a city event (the Museum's third shelf). */
export type ConditionEntry = Extract<MuseumEntry, { k: 'weather' | 'dark' | 'event' | 'road' }>;

/** The conditions a shift is played in, in the order the ready screen names them. */
export function conditionsOf(c: Config): ConditionEntry[] {
  const out: ConditionEntry[] = [];
  if (c.lanes > 1) out.push({ k: 'road', kind: 'twoLane' });
  if (c.night) out.push({ k: 'dark', kind: c.blackout ? 'blackout' : 'night' });
  if (c.weather !== 'clear') out.push({ k: 'weather', kind: c.weather });
  if (c.cityEvent) out.push({ k: 'event', kind: c.cityEvent });
  return out;
}

/**
 * What is in front of you right now that the Museum shows: bosses, specials, the sky and the
 * city. Only a shift under way counts: the traffic that drives on behind the tabs and the
 * ready screen is not met yet. So the ready screen can still explain a new condition, and a
 * special gets its notice the first time it comes while the player is playing.
 */
export function sightings(w: World): string[] {
  if (w.shift.phase === 'waiting') return [];
  const c = w.config;
  const out = new Set<string>();
  for (const veh of w.vehicles) {
    if (veh.role === 'boss' && c.convoy) out.add(museumId({ k: 'boss', kind: c.bossKind }));
    else if (veh.role === null && veh.type in SPECIAL_LEVEL) out.add(museumId({ k: 'special', kind: veh.type as SpecialKind }));
  }
  for (const e of conditionsOf(c)) out.add(museumId(e));
  return [...out];
}

/**
 * What a save must have met already, for a save from before the Museum or before one of its
 * shelves (`shelves`): bosses it beat or passed, the specials its stats count, and everything
 * below the level it reached.
 */
export function inferredSightings(
  level: number,
  prestige: number,
  bossesBeaten: BossKind[],
  stats: { takedowns: number; transporters: number; ambulances: number },
  c: Config,
  shelves: MuseumShelf[] = MUSEUM_SHELVES,
): string[] {
  return shelves
    .flatMap(shelfEntries)
    .filter((e) => {
      if (prestige > 0) return true;
      if (e.k === 'boss') return bossesBeaten.includes(e.kind) || level > firstLevel(e, c);
      if (e.k === 'special' && (e.kind === 'pickup' || e.kind === 'police')) return stats.takedowns > 0 || level > 2;
      if (e.k === 'special' && e.kind === 'transporter') return stats.transporters > 0 || level > 2;
      if (e.k === 'special' && e.kind === 'ambulance') return stats.ambulances > 0 || level > firstLevel(e, c);
      return level > firstLevel(e, c);
    })
    .map(museumId);
}
