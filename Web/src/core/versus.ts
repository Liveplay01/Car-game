import { type Config, baseConfig, cloneConfig } from './config';
import { forLevel } from './levels';
import { type World, type PlayerQueue, STEP } from './world';
import type { Rng } from './rng';

/**
 * Multiplayer ("versus"): up to four friends on one roundabout, each with their own lane.
 * Whoever causes a crash is out, so is a lane that stalls; the last one left wins. Everyone
 * runs the same deterministic world (same seed, same taps), so only taps travel the network
 * (`net/`).
 */
export const VERSUS_MAX_PLAYERS = 4;
export const VERSUS_MIN_PLAYERS = 2;

/** The traffic a match starts with: Unlimited's level, eight arms, no special events. */
export function versusConfig(players: number, seed: number): Config {
  const base = cloneConfig(baseConfig);
  const c = forLevel(base, base.endlessLevel, seed);
  c.players = Math.max(VERSUS_MIN_PLAYERS, Math.min(VERSUS_MAX_PLAYERS, players));
  // Eight arms: the players sit apart, AI traffic comes in between.
  c.armSlots = [0, 2, 4, 6, 8, 10, 12, 14];
  c.endless = true;
  c.mayhem = false;
  c.queueVisible = 3;
  c.policeShare = 0;
  c.criminalChance = 0;
  c.militaryChance = 0;
  c.sportsCarShare = 0;
  c.compactShare = 0;
  c.vanShare = 0;
  c.classicShare = 0;
  c.weather = 'clear';
  c.night = false;
  c.cityEvent = null;
  c.closedArmSlot = null;
  c.modules = {};
  c.moduleLevels = {};
  c.trialRule = null;
  return c;
}

/**
 * A tap takes effect this many steps (50 ms) after it was made, on every device, so the
 * network has time to deliver it (lockstep, `present/versus.ts`). Bots tap with the same lead.
 */
export const INPUT_DELAY = 6;

// MARK: Standings and series

/** Round points by place (1st, 2nd, 3rd); last place scores nothing. */
export const PLACE_POINTS = [3, 2, 1];

/** A bonus point: most cars sent, or the tightest merge that cut nobody off. */
export type VersusBonus = 'mostCars' | 'riskiest';

export interface Standing {
  seat: number;
  /** 1 = winner; seats out on the same step share a place. */
  place: number;
  points: number;
  bonus: VersusBonus[];
}

/** Places and round points of a finished match, best first. The same on every device. */
export function standings(world: World): Standing[] {
  const seats = world.seats;
  const lasted = (q: PlayerQueue): number => (q.out ? (q.outAt ?? 0) : Infinity);
  const unique = <T>(values: T[], best: T): number => (values.filter((x) => x === best).length === 1 ? values.indexOf(best) : -1);
  const sent = seats.map((q) => q.sent);
  const mostCars = Math.max(...sent) > 0 ? unique(sent, Math.max(...sent)) : -1;
  const tightest = seats.map((q) => q.tightest);
  const riskiest = Number.isFinite(Math.min(...tightest)) ? unique(tightest, Math.min(...tightest)) : -1;
  return seats
    .map((q) => {
      const place = 1 + seats.filter((o) => lasted(o) > lasted(q)).length;
      const bonus: VersusBonus[] = [];
      if (q.seat === mostCars) bonus.push('mostCars');
      if (q.seat === riskiest) bonus.push('riskiest');
      const base = place >= seats.length ? 0 : (PLACE_POINTS[place - 1] ?? 0);
      return { seat: q.seat, place, points: base + bonus.length, bonus };
    })
    .sort((a, b) => a.place - b.place || b.points - a.points || a.seat - b.seat);
}

/** How many rounds a series has: one match, best of three, best of five. */
export type BestOf = 1 | 3 | 5;
export const BEST_OF: BestOf[] = [1, 3, 5];

/** A series of rounds with the same friends. Points and round wins by lobby slot. */
export interface Series {
  bestOf: BestOf;
  /** Rounds played, including the one running. */
  round: number;
  points: Record<number, number>;
  wins: Record<number, number>;
}

export const newSeries = (bestOf: BestOf): Series => ({ bestOf, round: 0, points: {}, wins: {} });

export const isSeriesOver = (s: Series): boolean => s.round >= s.bestOf;

/** The series after a finished round; `slots` maps each seat to its lobby slot. */
export function addRound(s: Series, table: Standing[], slots: number[]): Series {
  const points = { ...s.points };
  const wins = { ...s.wins };
  for (const row of table) {
    const slot = slots[row.seat];
    if (slot === undefined) continue;
    points[slot] = (points[slot] ?? 0) + row.points;
  }
  const winners = table.filter((r) => r.place === 1);
  if (winners.length === 1) {
    const slot = slots[winners[0].seat];
    if (slot !== undefined) wins[slot] = (wins[slot] ?? 0) + 1;
  }
  return { ...s, points, wins };
}

/** The lobby slots with the most points; more than one is a tie. */
export function seriesLeaders(s: Series, slots: number[]): number[] {
  const best = Math.max(0, ...slots.map((slot) => s.points[slot] ?? 0));
  return slots.filter((slot) => (s.points[slot] ?? 0) === best);
}

// MARK: Bots

const REACTION = { lo: 0.18, hi: 0.4 };
/** Seconds of gap a bot wants, from bold to careful. */
const WANTS = { lo: 0.14, hi: 0.32 };

/**
 * A bot lane (training alone, or filling a seat): it waits a human reaction time once its
 * car stands at the line, keeps off the ring while wrecks lie there unless its clock runs
 * out, and takes a gap a little bolder or more careful each time. It runs on the host only;
 * its taps travel like everyone's.
 */
export class VersusBot {
  private wait: number;
  private wants: number;
  private tick = 0;

  constructor(
    readonly seat: number,
    private readonly rng: Rng,
  ) {
    this.wait = rng.range(REACTION.lo, REACTION.hi);
    this.wants = rng.range(WANTS.lo, WANTS.hi);
  }

  /** Once per step: true when the bot taps now (the tap lands `INPUT_DELAY` steps later). */
  decide(world: World): boolean {
    const q = world.seats[this.seat];
    if (!q || q.out || !world.isScoring) return false;
    if (!q.isReady || q.vehicles.length === 0) {
      this.wait = Math.max(this.wait, this.rng.range(REACTION.lo, REACTION.hi));
      return false;
    }
    if (this.wait > 0) {
      this.wait -= STEP;
      return false;
    }
    // Looking at the traffic 30 times a second is plenty, and cheap.
    if (this.tick++ % 4 !== 0) return false;
    const urgency = q.idle / world.stallLimit;
    if (world.isTrafficDisturbed && urgency < 0.6) return false;
    const wants = urgency > 0.8 ? WANTS.lo * 0.7 : this.wants;
    const gap = world.predictedMergeGap(world.armOf(q), INPUT_DELAY * STEP, 30, wants);
    if (gap <= wants) return false;
    // Tapped: not again before this car has left and the next stands at the line.
    this.wait = INPUT_DELAY * STEP + this.rng.range(REACTION.lo, REACTION.hi);
    this.wants = this.rng.range(WANTS.lo, WANTS.hi);
    return true;
  }
}

/** A join code: four digits, leading zeros allowed. */
export const isJoinCode = (code: string): boolean => /^\d{4}$/.test(code);

export const randomJoinCode = (): string => String(Math.floor(Math.random() * 10000)).padStart(4, '0');
