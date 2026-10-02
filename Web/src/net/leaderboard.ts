import { ACCOUNT_KEY } from '../storage/profile';
import { storage } from '../storage/store';

/**
 * The client of the leaderboard service (`Server/`, see its README). It is an extra: the game
 * plays on without it, so nothing here may stop a shift. Without `VITE_API_URL` in the build
 * there is no service and `leaderboardEnabled` is false.
 *
 * There is no sign-up: entering a name is all. The service answers with a secret token, kept
 * here like the save (`carGame.account.v1`), that tells it later which name this device's
 * records belong to. Losing the browser's storage means entering a name again.
 */

const BASE = (typeof import.meta.env.VITE_API_URL === 'string' ? import.meta.env.VITE_API_URL : '').trim().replace(/\/+$/, '');
export const leaderboardEnabled = BASE !== '';
/** An address on the service, for links people open themselves (a challenge's short link). */
export const apiUrl = (path: string): string => BASE + path;

const TIMEOUT_MS = 8000;
/** After a failed send (offline, the service down) the next try waits this long. */
const RETRY_MS = 60_000;

/** The boards the service offers (`Server/src/modules/leaderboard/boards.ts`). */
export type BoardId = 'shift-level' | 'unlimited';

export interface Account {
  id: string;
  name: string;
  token: string;
}

export interface BoardEntry {
  rank: number;
  name: string;
  /** The title the player wears (an id of `core/elite.ts`, which the sheet names), or null. */
  title: string | null;
  score: number;
  /** Facts next to the score: `{ level, prestige }` on shift-level, `{ cars }` on unlimited. */
  meta: Record<string, number>;
  /** This line is the player. */
  me: boolean;
}

export interface BoardView {
  entries: BoardEntry[];
  /** The player's own place, also when they are not in the top list; null without a score. */
  me: { rank: number; score: number; meta: Record<string, number> } | null;
}

export interface SubmitResult {
  /** The score was better than the one on the list. */
  accepted: boolean;
  best: { rank: number; score: number; meta: Record<string, number> };
}

/**
 * Why a call failed. `code` is what the service sends (`name_taken`, `name_not_allowed`,
 * `invalid_name`, `rate_limited` …), or 'network' when it could not be reached at all.
 */
export class LeaderboardError extends Error {
  readonly code: string;
  readonly status: number;
  /** The whole answer of the service, for the few errors that carry more than a message (a cloud conflict). */
  readonly body: unknown;

  constructor(code: string, message: string, status = 0, body: unknown = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.body = body;
  }
}

/** A sentence for the player about a failed call. */
export function describeError(error: unknown): string {
  if (!(error instanceof LeaderboardError)) return 'Something went wrong. Try again.';
  switch (error.code) {
    case 'network':
    case 'disabled':
      return 'The leaderboard cannot be reached right now. Check your connection and try again.';
    case 'unauthorized':
    case 'banned':
      return 'This device is no longer on the leaderboard. Enter a name to be on it again.';
    // Everything else: the service's own sentence, written for players (`Server/`).
    default:
      return error.message;
  }
}

export function loadAccount(): Account | null {
  try {
    const raw = storage().getItem(ACCOUNT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Account>;
    return typeof parsed.id === 'string' && typeof parsed.name === 'string' && typeof parsed.token === 'string' ? { id: parsed.id, name: parsed.name, token: parsed.token } : null;
  } catch {
    return null;
  }
}

const accountListeners = new Set<() => void>();

/** Cloud sync wants to know when the account changes (a name entered, renamed, removed): it travels with the save. */
export function onAccountChange(listener: () => void): void {
  accountListeners.add(listener);
}

/** Keeps the account on this device. Also used when a cloud copy brings one (`net/cloud.ts`). */
export function saveAccount(account: Account | null): void {
  try {
    if (account) storage().setItem(ACCOUNT_KEY, JSON.stringify(account));
    else storage().removeItem(ACCOUNT_KEY);
  } catch {
    /* private mode: the account lasts this visit only */
  }
  for (const listener of accountListeners) listener();
}

/** One call to the service (`Server/`), shared by the leaderboard, friends, cloud save and relay logins. */
export async function apiRequest<T>(method: string, path: string, options: { token?: string; body?: unknown; timeoutMs?: number; keepalive?: boolean } = {}): Promise<T> {
  if (!leaderboardEnabled) throw new LeaderboardError('disabled', 'The leaderboard is not available.');
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  let response: Response;
  try {
    response = await fetch(BASE + path, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(options.timeoutMs ?? TIMEOUT_MS),
      keepalive: options.keepalive,
      // Always the live list: right after a new name or score an older copy would hide it.
      cache: 'no-store',
    });
  } catch {
    throw new LeaderboardError('network', 'The leaderboard cannot be reached right now.');
  }
  if (response.status === 204) return undefined as T;
  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    /* not JSON: handled below */
  }
  if (!response.ok) {
    const error = (json as { error?: { code?: string; message?: string } } | null)?.error;
    throw new LeaderboardError(error?.code ?? 'error', error?.message ?? 'Something went wrong.', response.status, json);
  }
  return json as T;
}

const request = apiRequest;

/** The token was refused (the account was removed): forget it, the player picks a name again. */
function forgetIfRefused(error: unknown): never {
  if (error instanceof LeaderboardError && (error.status === 401 || error.status === 403)) saveAccount(null);
  throw error;
}

/** Picks a name and opens the account. Throws `name_taken`, `name_not_allowed` or `invalid_name` with a message to show. */
export async function createAccount(name: string): Promise<Account> {
  const made = await request<{ player: { id: string; name: string }; token: string }>('POST', '/v1/players', { body: { name } });
  const account = { id: made.player.id, name: made.player.name, token: made.token };
  saveAccount(account);
  return account;
}

export async function renameAccount(account: Account, name: string): Promise<Account> {
  try {
    const done = await request<{ player: { name: string } }>('PATCH', '/v1/me', { token: account.token, body: { name } });
    const renamed = { ...account, name: done.player.name };
    saveAccount(renamed);
    return renamed;
  } catch (error) {
    return forgetIfRefused(error);
  }
}

/** Removes the name and every score from the service; this device forgets the account. */
export async function deleteAccount(account: Account): Promise<void> {
  try {
    await request<void>('DELETE', '/v1/me', { token: account.token });
  } catch (error) {
    // Already gone on the service: forgetting it here is all that is left to do.
    if (!(error instanceof LeaderboardError && (error.status === 401 || error.status === 403))) throw error;
  }
  saveAccount(null);
  for (const board of Object.keys(ranks) as BoardId[]) delete ranks[board];
  for (const board of Object.keys(confirmed) as BoardId[]) delete confirmed[board];
}

/** The player's places this session has heard of (the Progress header shows the Shift level one). */
const ranks: Partial<Record<BoardId, number>> = {};

export const knownRank = (board: BoardId): number | null => (loadAccount() ? (ranks[board] ?? null) : null);

/** The top of a board; the player's own line is marked when they have an account. */
export async function fetchBoard(board: BoardId, limit = 50): Promise<BoardView> {
  const view = await request<BoardView>('GET', `/v1/boards/${board}?limit=${limit}`, { token: loadAccount()?.token });
  if (view.me) ranks[board] = view.me.rank;
  return view;
}

/**
 * Sends a score. Null without an account (nobody asked for a name yet). Fire and forget is fine:
 * the service keeps the better score, so the next shift simply sends again.
 */
export async function submitScore(board: BoardId, body: Record<string, number>): Promise<SubmitResult | null> {
  const account = loadAccount();
  if (!account) return null;
  try {
    return await request<SubmitResult>('PUT', `/v1/boards/${board}/score`, { token: account.token, body });
  } catch (error) {
    return forgetIfRefused(error);
  }
}

/** Shift level: the level reached, after any Prestige (`core/career.ts`). */
export const submitShiftLevel = (level: number, prestige: number): Promise<SubmitResult | null> => submitScore('shift-level', { level, prestige });

/** Unlimited: the record score and the cars sent in that run. */
export const submitUnlimited = (score: number, cars: number): Promise<SubmitResult | null> => submitScore('unlimited', { score, cars });

// MARK: Friends

export interface Friend {
  id: string;
  name: string;
}

export interface FriendsView {
  /** Your own friend code, like `K7M2-9QXA`: what you send to a friend. */
  code: string;
  friends: Friend[];
}

/** Your friend code and your list. Needs an account (a name). */
export async function fetchFriends(): Promise<FriendsView> {
  const account = loadAccount();
  if (!account) throw new LeaderboardError('unauthorized', 'Enter a name first.', 401);
  try {
    return await request<FriendsView>('GET', '/v1/friends', { token: account.token });
  } catch (error) {
    return forgetIfRefused(error);
  }
}

/** Adds a friend by their code. Throws `unknown_code`, `own_code`, `invalid_code` or `too_many_friends` with a sentence to show. */
export async function addFriend(code: string): Promise<Friend> {
  const account = loadAccount();
  if (!account) throw new LeaderboardError('unauthorized', 'Enter a name first.', 401);
  try {
    return (await request<{ friend: Friend }>('POST', '/v1/friends', { token: account.token, body: { code } })).friend;
  } catch (error) {
    return forgetIfRefused(error);
  }
}

export async function removeFriend(id: string): Promise<void> {
  const account = loadAccount();
  if (!account) return;
  try {
    await request<void>('DELETE', `/v1/friends/${encodeURIComponent(id)}`, { token: account.token });
  } catch (error) {
    forgetIfRefused(error);
  }
}

/** A board among you and your friends: the same lines as the public one, ranked only against them. */
export async function fetchFriendsBoard(board: BoardId): Promise<BoardView & { friends: number }> {
  const account = loadAccount();
  if (!account) throw new LeaderboardError('unauthorized', 'Enter a name first.', 401);
  try {
    return await request<BoardView & { friends: number }>('GET', `/v1/friends/boards/${board}`, { token: account.token });
  } catch (error) {
    return forgetIfRefused(error);
  }
}

/** What the game knows of the player's records, in the shape the boards take them. */
export interface Records {
  level: number;
  prestige: number;
  unlimitedBest: number;
  /** The most cars sent in an Unlimited run (the plausibility check wants cars for a score). */
  unlimitedCars: number;
  /** The title worn (`career.title`): shown next to the name on the boards. */
  title: string | null;
}

/**
 * The best each board has confirmed this session. It starts empty, so the first save after
 * a start sends once; after that only a better record makes a request.
 */
const confirmed: Partial<Record<BoardId, number>> = {};
let syncing: Promise<void> | null = null;
let retryAt = 0;
/** The title the service has for this account; undefined while unknown (a start, a new account), so the next save sends it. */
let titleSent: string | null | undefined;
onAccountChange(() => {
  titleSent = undefined;
});

/** Tells the service which title the player wears (null: none). */
async function putTitle(account: Account, title: string | null): Promise<void> {
  try {
    await request<unknown>('PUT', '/v1/me/title', { token: account.token, body: { title } });
  } catch (error) {
    forgetIfRefused(error);
  }
}

/** Ranked as the service ranks it (`Server/src/modules/leaderboard/boards.ts`): Prestige first. */
const levelScore = (r: Records): number => r.prestige * 1000 + r.level;

function due(r: Records): [BoardId, Record<string, number>, number][] {
  const list: [BoardId, Record<string, number>, number][] = [];
  if ((confirmed['shift-level'] ?? -1) < levelScore(r)) list.push(['shift-level', { level: r.level, prestige: r.prestige }, levelScore(r)]);
  if (r.unlimitedBest > 0 && (confirmed.unlimited ?? -1) < r.unlimitedBest) list.push(['unlimited', { score: r.unlimitedBest, cars: Math.max(1, r.unlimitedCars) }, r.unlimitedBest]);
  return list;
}

/**
 * Sends the records that improved. Called on every save: cheap when nothing changed, and never
 * in the way of play (no account, offline or a failed send only means: later).
 */
export function syncScores(r: Records): Promise<void> {
  const account = loadAccount();
  if (!leaderboardEnabled || !account) return Promise.resolve();
  if (syncing) return syncing;
  if (Date.now() < retryAt) return Promise.resolve();
  const work = due(r);
  const titleDue = titleSent !== r.title;
  if (work.length === 0 && !titleDue) return Promise.resolve();
  syncing = (async () => {
    try {
      for (const [board, body, value] of work) {
        try {
          const result = await submitScore(board, body);
          if (!result) return;
          confirmed[board] = Math.max(value, result.best.score);
          ranks[board] = result.best.rank;
        } catch (error) {
          // Refused as impossible: sending the same again would not help.
          if (error instanceof LeaderboardError && error.status === 422) confirmed[board] = value;
          else throw error;
        }
      }
      // After the scores: a service without titles yet must not hold a score back.
      if (titleDue) {
        await putTitle(account, r.title);
        titleSent = r.title;
      }
    } catch {
      retryAt = Date.now() + RETRY_MS;
    } finally {
      syncing = null;
    }
  })();
  return syncing;
}
