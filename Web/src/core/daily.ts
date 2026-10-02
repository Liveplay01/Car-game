import type { ShiftResult } from './events';
import { Rng } from './rng';
import { DAILY_EVENTS, type CityEvent } from './config';

/** Challenges (v1.2): three a day, each pays once. */
export type Challenge = 'perfectInputs' | 'tightFits' | 'twoTakedowns' | 'twoTransporters' | 'longChain' | 'bigCombo' | 'perfectRun';
export const CHALLENGES: Challenge[] = ['perfectInputs', 'tightFits', 'twoTakedowns', 'twoTransporters', 'longChain', 'bigCombo', 'perfectRun'];

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
  }
}

export function challengeReward(c: Challenge): number {
  switch (c) {
    case 'perfectInputs':
    case 'tightFits':
    case 'bigCombo':
      return 250;
    case 'twoTakedowns':
    case 'twoTransporters':
    case 'longChain':
      return 350;
    case 'perfectRun':
      return 500;
  }
}

/** Today's three challenges: the same for everyone on the same day. */
export function challengesOf(day: number): Challenge[] {
  const rng = new Rng((Math.imul(day, 0x9e3779b9) ^ 0xc4a11e26) >>> 0);
  const pool = [...CHALLENGES];
  const picked: Challenge[] = [];
  while (picked.length < 3 && pool.length > 0) picked.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
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
