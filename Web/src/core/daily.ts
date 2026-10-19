import type { ShiftResult } from './events';
import { Rng } from './rng';
import { baseConfig, DAILY_EVENTS, type CityEvent, type Config } from './config';

/** Challenges (v1.2): three a day, each pays once. */
export type Challenge =
  | 'perfectInputs'
  | 'tightFits'
  | 'twoTakedowns'
  | 'twoTransporters'
  | 'longChain'
  | 'bigCombo'
  | 'perfectRun'
  | 'oneTakedown'
  | 'cleanMerges'
  | 'sixTightFits'
  | 'fivePerfects'
  | 'chainFive'
  | 'hugeCombo'
  | 'twoNearMisses';
export const CHALLENGES: Challenge[] = [
  'perfectInputs',
  'tightFits',
  'twoTakedowns',
  'twoTransporters',
  'longChain',
  'bigCombo',
  'perfectRun',
  'oneTakedown',
  'cleanMerges',
  'sixTightFits',
  'fivePerfects',
  'chainFive',
  'hugeCombo',
  'twoNearMisses',
];

export function challengeMet(c: Challenge, r: ShiftResult): boolean {
  switch (c) {
    case 'perfectInputs':
      return r.perfects >= 3;
    case 'tightFits':
      return r.tightFits >= 3;
    case 'twoTakedowns':
      return r.takedowns >= 2;
    case 'twoTransporters':
      return r.transporters >= 2;
    case 'longChain':
      return r.bestChain >= 8;
    case 'bigCombo':
      return r.bestCombo >= 15;
    case 'perfectRun':
      return r.isPerfectRun;
    case 'oneTakedown':
      return r.takedowns >= 1;
    case 'cleanMerges':
      return r.cleanMerges >= 8;
    case 'sixTightFits':
      return r.tightFits >= 6;
    case 'fivePerfects':
      return r.perfects >= 5;
    case 'chainFive':
      return r.bestChain >= 5;
    case 'hugeCombo':
      return r.bestCombo >= 25;
    case 'twoNearMisses':
      return r.nearMisses >= 2;
  }
}

/**
 * What a challenge pays at `reach` (`Careers.reach`): it grows with the shift pay of that level (players, 19.10.2026:
 * a fixed 500 meant nothing late on), rounded to 50.
 */
export function challengeReward(c: Challenge, reach: number, config: Config = baseConfig): number {
  const pay = (level: number): number => config.shiftPayBase + config.shiftPayPerLevel * level;
  return Math.round((challengeBase(c) * pay(Math.max(1, reach))) / pay(1) / 50) * 50;
}

function challengeBase(c: Challenge): number {
  switch (c) {
    case 'perfectInputs':
    case 'tightFits':
    case 'bigCombo':
    case 'oneTakedown':
    case 'cleanMerges':
      return 250;
    case 'twoTakedowns':
    case 'twoTransporters':
    case 'longChain':
    case 'chainFive':
    case 'twoNearMisses':
      return 350;
    case 'sixTightFits':
    case 'fivePerfects':
    case 'hugeCombo':
      return 400;
    case 'perfectRun':
      return 500;
  }
}

/** Challenges that need a vehicle a new player has not met yet (`forIntro`). */
const NEEDS: Partial<Record<Challenge, 'criminalLevel' | 'transporterLevel'>> = {
  twoTakedowns: 'criminalLevel',
  oneTakedown: 'criminalLevel',
  twoTransporters: 'transporterLevel',
};

/** Today's three challenges: the same for everyone on the same day; below the intro levels the ones that cannot happen yet are skipped. */
export function challengesOf(day: number, level = Infinity): Challenge[] {
  const rng = new Rng((Math.imul(day, 0x9e3779b9) ^ 0xc4a11e26) >>> 0);
  const pool = [...CHALLENGES];
  const picked: Challenge[] = [];
  while (picked.length < 3 && pool.length > 0) {
    const ch = pool.splice(rng.int(0, pool.length - 1), 1)[0];
    const need = NEEDS[ch];
    if (need === undefined || level >= baseConfig[need]) picked.push(ch);
  }
  return picked;
}

/** The Daily Shift's seed: the same shift for everyone on the same day. */
export const dailySeed = (day: number): number => (Math.imul(day, 0xd1b54a32) ^ 0xda115a1f) >>> 0;

/** The Daily Shift's city event: every day another one. */
export const dailyEvent = (day: number): CityEvent => DAILY_EVENTS[((day % DAILY_EVENTS.length) + DAILY_EVENTS.length) % DAILY_EVENTS.length];

export const STREAK_MILESTONES: { days: number; item: string }[] = [
  { days: 7, item: 'streakBronze' },
  { days: 14, item: 'streakSilver' },
  { days: 30, item: 'streakGold' },
];

/** Today as a day number (days since 1970, local time). */
export function dayNumber(date = new Date()): number {
  const local = date.getTime() / 1000 - date.getTimezoneOffset() * 60;
  return Math.floor(local / 86400);
}
