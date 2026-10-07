import type { Weather, TrialRule, LegendaryRule, BossKind } from './config';
import { type Career, Careers } from './career';
import type { Darkness } from './levels';
import type { ChestKind } from './loot';
import type { Trial, TrialGoal } from './trials';

/**
 * Tours (Leo, 07.10.2026): limited-time events that come back every year, in the manner of a
 * world tour. A tour is a short list of stops, each a fixed trial whose level follows the
 * player's own, with its own sky and goal. Every stop pays once per run of the tour: money, a
 * chest or one of the tour's skins. The skins are earned only here and only by playing; a missed
 * tour comes round again next year. Looks and rewards only, never a bonus on the road.
 */
export type TourId = 'halloween' | 'winter';

export interface TourReward {
  money?: number;
  chest?: ChestKind;
  /** One of the tour's skins. */
  item?: string;
}

export interface TourStop {
  weather: Weather;
  darkness: Darkness;
  cars: number;
  /** Levels above (+) or below (−) the player's own, with the Prestige head start counted in. */
  offset: number;
  goal: TrialGoal;
  rule?: TrialRule;
  legendary?: LegendaryRule;
  boss?: BossKind;
  reward: TourReward;
}

export interface TourDef {
  id: TourId;
  /** First and last day of the run as [month, day], both included; a run may cross New Year. */
  from: [number, number];
  to: [number, number];
  /** The map its stops are drawn on, whatever the player wears (a map skin id). */
  map: string;
  stops: TourStop[];
}

export const TOURS: TourDef[] = [
  {
    id: 'halloween',
    from: [10, 24],
    to: [11, 2],
    map: 'autumn',
    stops: [
      { weather: 'clear', darkness: 'night', cars: 12, offset: -4, goal: { k: 'complete' }, reward: { money: 1500 } },
      { weather: 'fog', darkness: 'night', cars: 14, offset: -3, goal: { k: 'complete' }, reward: { chest: 'standard' } },
      { weather: 'clear', darkness: 'blackout', cars: 14, offset: -2, goal: { k: 'complete' }, reward: { item: 'jackOLantern' } },
      { weather: 'lightRain', darkness: 'night', cars: 14, offset: -1, goal: { k: 'perfects', n: 5 }, reward: { money: 2500 } },
      { weather: 'fog', darkness: 'blackout', cars: 16, offset: 0, goal: { k: 'complete' }, reward: { item: 'witchingHour', chest: 'event' } },
      { weather: 'clear', darkness: 'night', cars: 18, offset: 1, goal: { k: 'complete' }, rule: 'flawless', reward: { chest: 'premium' } },
      { weather: 'clear', darkness: 'blackout', cars: 20, offset: 2, goal: { k: 'boss' }, boss: 'phantom', reward: { item: 'wraith', money: 5000 } },
    ],
  },
  {
    id: 'winter',
    from: [12, 18],
    to: [1, 3],
    map: 'snowfall',
    stops: [
      { weather: 'clear', darkness: 'night', cars: 12, offset: -4, goal: { k: 'complete' }, reward: { money: 1500 } },
      { weather: 'snow', darkness: 'day', cars: 14, offset: -3, goal: { k: 'complete' }, reward: { chest: 'standard' } },
      { weather: 'snow', darkness: 'night', cars: 14, offset: -2, goal: { k: 'complete' }, reward: { item: 'candyCane' } },
      { weather: 'fog', darkness: 'night', cars: 14, offset: -1, goal: { k: 'perfects', n: 5 }, reward: { money: 2500 } },
      { weather: 'snow', darkness: 'night', cars: 16, offset: 0, goal: { k: 'complete' }, legendary: 'gridlock', reward: { item: 'snowGlobe', chest: 'event' } },
      { weather: 'snow', darkness: 'day', cars: 18, offset: 1, goal: { k: 'complete' }, rule: 'flawless', reward: { chest: 'premium' } },
      { weather: 'snow', darkness: 'night', cars: 20, offset: 2, goal: { k: 'boss' }, boss: 'convoy', reward: { item: 'sleigh', money: 5000 } },
    ],
  },
];

export interface TourRun {
  tour: TourDef;
  /** `halloween-2026`: one run of one tour; what is done is remembered under it. */
  key: string;
  daysLeft: number;
}

const DAY = 86400000;

const inRange = (m: number, d: number, from: [number, number], to: [number, number]): boolean => {
  const at = m * 100 + d;
  const a = from[0] * 100 + from[1];
  const b = to[0] * 100 + to[1];
  return a <= b ? at >= a && at <= b : at >= a || at <= b;
};

const runsOn = (day: number, tour: TourDef): boolean => {
  const date = new Date(day * DAY);
  return inRange(date.getUTCMonth() + 1, date.getUTCDate(), tour.from, tour.to);
};

/** The tour running on `day`, if any. */
export function tourOn(day: number): TourRun | null {
  const tour = TOURS.find((t) => runsOn(day, t));
  if (!tour) return null;
  const date = new Date(day * DAY);
  // A run across New Year is named for the year it began in.
  const crosses = tour.from[0] > tour.to[0] && date.getUTCMonth() + 1 <= tour.to[0];
  const year = date.getUTCFullYear() - (crosses ? 1 : 0);
  let left = 0;
  while (left < 40 && runsOn(day + left + 1, tour)) left++;
  return { tour, key: `${tour.id}-${year}`, daysLeft: left + 1 };
}

/** The next tour to start after `day`, and how many days away it is. */
export function nextTour(day: number): { tour: TourDef; inDays: number } | null {
  for (let i = 1; i <= 370; i++) {
    const tour = TOURS.find((t) => runsOn(day + i, t));
    if (tour) return { tour, inDays: i };
  }
  return null;
}

export const stopId = (tour: TourId, stop: number): `tour.${string}.${number}` => `tour.${tour}.${stop}`;
export const stopDoneKey = (key: string, stop: number): string => `${key}.${stop}`;
export const tourStopsDone = (c: Career, run: TourRun): number => run.tour.stops.filter((_, i) => c.toursDone.includes(stopDoneKey(run.key, i + 1))).length;

/** A tour opens with the Trials. */
export const TOUR_LEVEL = 9;
export const tourOpen = (c: Career): boolean => c.level >= TOUR_LEVEL || c.prestige > 0;

const hash = (text: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
};

/** Stop `stop` (1…) of a run as a trial, at the player's level. */
export function tourTrial(run: TourRun, stop: number, c: Career): Trial | null {
  const s = run.tour.stops[stop - 1];
  if (!s) return null;
  return {
    id: stopId(run.tour.id, stop),
    level: Math.max(3, Math.min(140, c.level + Careers.headStart(c) + s.offset)),
    seed: (hash(`${run.key}.${stop}`) ^ 0x70e57a11) >>> 0,
    cars: s.cars,
    goal: s.goal,
    rule: s.rule ?? null,
    weather: s.weather,
    darkness: s.darkness,
    reward: s.reward.money ?? 0,
    legendary: s.legendary ?? null,
    boss: s.boss,
    tour: { key: run.key, stop, map: run.tour.map },
  };
}

/** The run a stop id belongs to on `day`; null once the tour is over. */
export function tourStopOf(id: string, day: number): { run: TourRun; stop: number } | null {
  const m = /^tour\.([a-z]+)\.(\d+)$/.exec(id);
  const run = tourOn(day);
  if (!m || !run || run.tour.id !== m[1]) return null;
  const stop = Number(m[2]);
  return stop >= 1 && stop <= run.tour.stops.length ? { run, stop } : null;
}

export interface TourPaid {
  reward: TourReward;
  /** The skin was new to the collection. */
  isNew: boolean;
}

/** A passed stop pays once per run. Null when it was done before. */
export function completeStop(c: Career, run: TourRun, stop: number): TourPaid | null {
  const key = stopDoneKey(run.key, stop);
  const s = run.tour.stops[stop - 1];
  if (!s || c.toursDone.includes(key)) return null;
  c.toursDone.push(key);
  if (s.reward.money) c.money += s.reward.money;
  if (s.reward.chest) c.chests.push(s.reward.chest);
  let isNew = false;
  if (s.reward.item && !c.collection.includes(s.reward.item)) {
    Careers.collect(c, s.reward.item);
    isNew = true;
  }
  return { reward: s.reward, isNew };
}
