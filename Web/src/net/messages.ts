import { VERSUS_MAX_PLAYERS, BEST_OF, type BestOf, type Series } from '../core/versus';
import { type Raw, isObject, isInt } from '../core/guards';

/**
 * What travels between the devices of a multiplayer room, and the checks at the door. The
 * other side is a stranger's browser: anything it sends is read field by field, like a save
 * file, and a message that does not fit is dropped (never thrown on, never passed on).
 */

/** What a lane does at a step: tap, leave the match (crash, stall, left), or a revenge lorry. */
export type InputKind = 't' | 'c' | 's' | 'l' | 'h';
export type Input = [step: number, seat: number, kind: InputKind];
const INPUT_KINDS: readonly InputKind[] = ['t', 'c', 's', 'l', 'h'];

/** A reaction an out player sends to the ring. */
export type Reaction = 'fire' | 'skull' | 'clap' | 'wow';
export const REACTIONS: Reaction[] = ['fire', 'skull', 'clap', 'wow'];

export interface Member {
  /** Lobby slot 0…3; the host is 0. The slot also gives the player colour. */
  slot: number;
  name: string;
  /** A bot the host plays. */
  bot?: boolean;
  /** Ready for the next match (after one has finished). */
  ready?: boolean;
  /** Lost the connection during a match; the seat waits for a reconnect. */
  away?: boolean;
  /** Round trip to the host in ms, as last measured. */
  ping?: number;
}

/** What a match needs to begin (or, with the inputs so far, to be replayed on a reconnect). */
export interface MatchStart {
  seed: number;
  names: string[];
  /** Lobby slot of every seat. */
  slots: number[];
  you: number;
  series: Series;
}

export type HostMessage =
  | { t: 'lobby'; members: Member[]; you: number; bestOf: BestOf }
  | ({ t: 'start' } & MatchStart)
  /** A guest that reconnected: the match so far, to replay. */
  | ({ t: 'resume'; inputs: Input[]; h: number } & MatchStart)
  /** Inputs scheduled since the last frame; the world may run up to step `h`. */
  | { t: 'f'; h: number; i: Input[] }
  | { t: 'pong'; at: number }
  /** Everyone's ping by lobby slot. */
  | { t: 'pings'; ms: Record<number, number> }
  | { t: 'react'; seat: number; r: Reaction }
  | { t: 'full' };

export type GuestMessage =
  | { t: 'hello'; name: string; token: string }
  | { t: 'name'; name: string }
  | { t: 'tap'; step: number }
  | { t: 'ping'; at: number; rtt: number }
  | { t: 'ready'; on: boolean }
  | { t: 'react'; r: Reaction }
  | { t: 'revenge' }
  | { t: 'bye' };

export const NAME_MAX = 12;

/** A name as others see it: trimmed, no control characters, at most `NAME_MAX` letters. */
export const cleanName = (name: string): string =>
  Array.from(name.replace(/[\p{Cc}\p{Cf}]/gu, '').trim().replace(/\s+/g, ' '))
    .slice(0, NAME_MAX)
    .join('');

// MARK: Checks

const isNumber = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
/** Longer than any name or token the game makes: anything above is not one of ours. */
const TEXT_MAX = 64;
const isText = (x: unknown): x is string => typeof x === 'string' && x.length <= TEXT_MAX;
const isReaction = (x: unknown): x is Reaction => REACTIONS.includes(x as Reaction);
/** Steps run at 120 Hz: a day of play is far past any real match. */
const STEP_MAX = 120 * 60 * 60 * 24;
/** A whole match replayed for a reconnect: taps of four players, generously. */
const INPUTS_MAX = 100_000;
const SLOT_MAX = VERSUS_MAX_PLAYERS - 1;

function readInput(x: unknown): Input | null {
  if (!Array.isArray(x) || x.length !== 3) return null;
  const [step, seat, kind] = x as unknown[];
  if (!isInt(step, 0, STEP_MAX) || !isInt(seat, 0, SLOT_MAX) || !INPUT_KINDS.includes(kind as InputKind)) return null;
  return [step, seat, kind as InputKind];
}

/** A list of inputs; one bad entry makes the whole list untrustworthy. */
function readInputs(x: unknown, max: number): Input[] | null {
  if (!Array.isArray(x) || x.length > max) return null;
  const out: Input[] = [];
  for (const item of x) {
    const input = readInput(item);
    if (!input) return null;
    out.push(input);
  }
  return out;
}

/** Numbers by lobby slot (points, wins, pings). */
function readBySlot(x: unknown): Record<number, number> | null {
  if (!isObject(x)) return null;
  const out: Record<number, number> = {};
  for (const [key, value] of Object.entries(x)) {
    const slot = Number(key);
    if (!isInt(slot, 0, SLOT_MAX) || !isNumber(value)) return null;
    out[slot] = value;
  }
  return out;
}

function readSeries(x: unknown): Series | null {
  if (!isObject(x) || !BEST_OF.includes(x.bestOf as BestOf) || !isInt(x.round, 0, 99)) return null;
  const points = readBySlot(x.points);
  const wins = readBySlot(x.wins);
  return points && wins ? { bestOf: x.bestOf as BestOf, round: x.round, points, wins } : null;
}

function readMember(x: unknown): Member | null {
  if (!isObject(x) || !isInt(x.slot, 0, SLOT_MAX) || !isText(x.name)) return null;
  const member: Member = { slot: x.slot, name: cleanName(x.name) || `Player ${x.slot + 1}` };
  if (x.bot === true) member.bot = true;
  if (x.ready === true) member.ready = true;
  if (x.away === true) member.away = true;
  if (isNumber(x.ping) && x.ping >= 0) member.ping = Math.min(x.ping, 99_999);
  return member;
}

function readMatchStart(x: Raw): MatchStart | null {
  const { names, slots } = x;
  if (!isNumber(x.seed) || !Array.isArray(names) || !Array.isArray(slots)) return null;
  if (names.length < 1 || names.length > VERSUS_MAX_PLAYERS || slots.length !== names.length) return null;
  if (!names.every(isText) || !slots.every((s) => isInt(s, 0, SLOT_MAX))) return null;
  if (!isInt(x.you, 0, names.length - 1)) return null;
  const series = readSeries(x.series);
  if (!series) return null;
  return { seed: x.seed, names: names.map((n) => cleanName(n)), slots: slots as number[], you: x.you, series };
}

/** A message from a guest, as the host may trust it; null when it is not one. */
export function readGuestMessage(data: unknown): GuestMessage | null {
  if (!isObject(data)) return null;
  switch (data.t) {
    case 'hello':
      return isText(data.name) && isText(data.token) ? { t: 'hello', name: data.name, token: data.token } : null;
    case 'name':
      return isText(data.name) ? { t: 'name', name: data.name } : null;
    case 'tap':
      return isNumber(data.step) && data.step >= 0 && data.step <= STEP_MAX ? { t: 'tap', step: data.step } : null;
    case 'ping':
      return isNumber(data.at) && isNumber(data.rtt) ? { t: 'ping', at: data.at, rtt: Math.max(0, Math.min(data.rtt, 99_999)) } : null;
    case 'ready':
      return typeof data.on === 'boolean' ? { t: 'ready', on: data.on } : null;
    case 'react':
      return isReaction(data.r) ? { t: 'react', r: data.r } : null;
    case 'revenge':
    case 'bye':
      return { t: data.t };
    default:
      return null;
  }
}

/** A message from the host, as a guest may trust it; null when it is not one. */
export function readHostMessage(data: unknown): HostMessage | null {
  if (!isObject(data)) return null;
  switch (data.t) {
    case 'lobby': {
      if (!Array.isArray(data.members) || data.members.length > VERSUS_MAX_PLAYERS) return null;
      const members = data.members.map(readMember);
      if (members.some((m) => m === null) || !isInt(data.you, 0, SLOT_MAX) || !BEST_OF.includes(data.bestOf as BestOf)) return null;
      return { t: 'lobby', members: members as Member[], you: data.you, bestOf: data.bestOf as BestOf };
    }
    case 'start': {
      const start = readMatchStart(data);
      return start ? { t: 'start', ...start } : null;
    }
    case 'resume': {
      const start = readMatchStart(data);
      const inputs = readInputs(data.inputs, INPUTS_MAX);
      return start && inputs && isInt(data.h, 0, STEP_MAX) ? { t: 'resume', ...start, inputs, h: data.h } : null;
    }
    case 'f': {
      const inputs = readInputs(data.i, 1_000);
      return inputs && isInt(data.h, 0, STEP_MAX) ? { t: 'f', h: data.h, i: inputs } : null;
    }
    case 'pong':
      return isNumber(data.at) ? { t: 'pong', at: data.at } : null;
    case 'pings': {
      const ms = readBySlot(data.ms);
      return ms ? { t: 'pings', ms } : null;
    }
    case 'react':
      return isInt(data.seat, 0, SLOT_MAX) && isReaction(data.r) ? { t: 'react', seat: data.seat, r: data.r } : null;
    case 'full':
      return { t: 'full' };
    default:
      return null;
  }
}

/**
 * How many messages a guest may send: a steady `rate` per second with room for a `burst`.
 * A thumb taps maybe 15 times a second; a flood beyond that is dropped, not simulated.
 */
export class RateLimit {
  private tokens: number;
  private last = -Infinity;

  constructor(
    private readonly rate = 30,
    private readonly burst = 60,
  ) {
    this.tokens = burst;
  }

  /** True when one more message may pass at `now` (ms). */
  take(now: number): boolean {
    if (this.last > -Infinity) this.tokens = Math.min(this.burst, this.tokens + ((now - this.last) / 1000) * this.rate);
    this.last = now;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}
