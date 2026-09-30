import { ACCOUNT_KEY } from '../storage/profile';
import { storage } from '../storage/store';

/**
 * The client of the leaderboard service (`Server/`, see its README). It is an extra: the game
 * plays on without it, so nothing here may stop a shift. Without `VITE_API_URL` in the build
 * there is no service and `leaderboardEnabled` is false.
 *
 * A player has an account as soon as they pick a name: the service answers with a secret token,
 * kept here like the save (`carGame.account.v1`), and every later call carries it. There is no
 * password; losing the browser's storage means picking a new name.
 */

const BASE = (typeof import.meta.env.VITE_API_URL === 'string' ? import.meta.env.VITE_API_URL : '').trim().replace(/\/+$/, '');
export const leaderboardEnabled = BASE !== '';

const TIMEOUT_MS = 8000;

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

  constructor(code: string, message: string, status = 0) {
    super(message);
    this.code = code;
    this.status = status;
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

function saveAccount(account: Account | null): void {
  try {
    if (account) storage().setItem(ACCOUNT_KEY, JSON.stringify(account));
    else storage().removeItem(ACCOUNT_KEY);
  } catch {
    /* private mode: the account lasts this visit only */
  }
}

async function request<T>(method: string, path: string, options: { token?: string; body?: unknown } = {}): Promise<T> {
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
      signal: AbortSignal.timeout(TIMEOUT_MS),
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
    throw new LeaderboardError(error?.code ?? 'error', error?.message ?? 'Something went wrong.', response.status);
  }
  return json as T;
}

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

/** The top of a board; the player's own line is marked when they have an account. */
export function fetchBoard(board: BoardId, limit = 50): Promise<BoardView> {
  return request<BoardView>('GET', `/v1/boards/${board}?limit=${limit}`, { token: loadAccount()?.token });
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
