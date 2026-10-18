import { storage } from '../storage/store';
import { S } from '../present/strings';
import { type BoardId, type BoardView, LeaderboardError, apiRequest, dayQuery, leaderboardEnabled, loadAccount } from './leaderboard';

/**
 * Crews (`Server/src/modules/crews`, Leo 18.10.2026, in place of the friends list): a named group that plays the weekly
 * league with the Season XP its members earn, and gives each other gifts out of their own money and chests. Nobody joins
 * by searching: a member's invite link (`…/k/CODE?by=FRIENDCODE`) brings `?crew=CODE` into the game, which keeps it
 * until the player joins or says no. Everything here needs a name (`loadAccount`).
 */

export type GiftItem = 'money:5000' | 'money:25000' | 'money:100000' | 'chest:standard' | 'chest:premium' | 'chest:diamond' | 'chest:event';
export type League = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface CrewMember {
  id: string;
  name: string;
  title: string | null;
  joinedAt: number;
  owner: boolean;
  me: boolean;
  /** Season XP earned for the crew this week. */
  xp: number;
}

export interface CrewStanding {
  /** The crew's id; null for a computer crew. */
  id: string | null;
  name: string;
  xp: number;
  computer: boolean;
  me: boolean;
}

export interface CrewGift {
  id: string;
  from: { id: string; name: string } | null;
  /** The member it is for; null: the whole crew, first come first served. */
  to: string | null;
  item: GiftItem;
  at: number;
}

export interface CrewView {
  crew: {
    name: string;
    code: string;
    /** The invite link to share (with the sharer's friend code); null when the service has no game address. */
    link: string | null;
    owner: boolean;
    /** When the founder may rename it again; null: now. */
    renameAt: number | null;
    max: number;
    members: CrewMember[];
    week: { week: number; league: League; goal: number; xp: number; table: CrewStanding[]; endsAt: number; promote: number; demote: number };
    /** How last week ended: the place, the move (+1 up, −1 down) and the league now. */
    last: { place: number; move: number; league: League } | null;
    gifts: CrewGift[];
  } | null;
  gifting?: { items: GiftItem[]; left: number };
}

export interface CrewProfile {
  id: string;
  name: string;
  title: string | null;
  joinedAt: number;
  owner: boolean;
  me: boolean;
  xp: number;
  boards: { board: BoardId; rank: number; score: number; meta: Record<string, number> }[];
}

export interface CrewPreview {
  name: string;
  members: number;
  max: number;
  full: boolean;
  league: League;
}

const PENDING_KEY = 'carGame.crewInvite.v1';
const XP_KEY = 'carGame.crewXp.v1';
/** The crew code's alphabet (`Server/src/codes.ts`). */
const CODE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/;
/** The most XP one request may carry (`XP_PER_SHIFT` on the service). */
const XP_CHUNK = 600;

function token(): string {
  const account = loadAccount();
  if (!account) throw new LeaderboardError('unauthorized', S.net.needName, 401);
  return account.token;
}

const read = (key: string): string | null => {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string | null): void => {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, value);
  } catch {
    /* private mode: it lasts this visit only */
  }
};

// MARK: Invite link

/** The crew a link brought this device to, until the player joins or says no. */
export const pendingCrew = (): string | null => {
  const code = read(PENDING_KEY);
  return code && CODE.test(code) ? code : null;
};

export const dropPendingCrew = (): void => write(PENDING_KEY, null);

/** `?crew=CODE` in the address: kept, then taken out of it. Returns whether there was one. */
export function readCrewLink(): boolean {
  const params = new URLSearchParams(location.search);
  if (!params.has('crew')) return false;
  const code = (params.get('crew') ?? '').toUpperCase().replace(/[\s-]+/g, '');
  params.delete('crew');
  const query = params.toString();
  history.replaceState(null, '', location.pathname + (query ? `?${query}` : '') + location.hash);
  if (!CODE.test(code) || !leaderboardEnabled) return false;
  write(PENDING_KEY, code);
  return true;
}

// MARK: Calls

export const fetchCrew = async (): Promise<CrewView> => remember(await apiRequest<CrewView>('GET', '/v1/crews', { token: token() }));
export const foundCrew = async (name: string): Promise<CrewView> => remember(await apiRequest<CrewView>('POST', '/v1/crews', { token: token(), body: { name } }));
export const renameCrew = async (name: string): Promise<CrewView> => remember(await apiRequest<CrewView>('PATCH', '/v1/crews', { token: token(), body: { name } }));
export const previewCrew = async (code: string): Promise<CrewPreview> => (await apiRequest<{ crew: CrewPreview }>('GET', `/v1/crews/preview/${code}`)).crew;
export const leaveCrew = async (): Promise<CrewView> => remember(await apiRequest<CrewView>('POST', '/v1/crews/leave', { token: token() }));
export const removeMember = async (id: string): Promise<CrewView> => remember(await apiRequest<CrewView>('DELETE', `/v1/crews/members/${encodeURIComponent(id)}`, { token: token() }));
export const fetchProfile = async (id: string): Promise<CrewProfile> => (await apiRequest<{ member: CrewProfile }>('GET', `/v1/crews/members/${encodeURIComponent(id)}`, { token: token() })).member;
export const giveGift = async (item: GiftItem, to: string | null): Promise<CrewView> => remember(await apiRequest<CrewView>('POST', '/v1/crews/gifts', { token: token(), body: { item, to } }));
export const claimGift = async (id: string): Promise<CrewView> => remember(await apiRequest<CrewView>('POST', `/v1/crews/gifts/${encodeURIComponent(id)}/claim`, { token: token() }));

export async function joinCrew(code: string): Promise<CrewView> {
  const view = remember(await apiRequest<CrewView>('POST', '/v1/crews/join', { token: token(), body: { code } }));
  dropPendingCrew();
  return view;
}

/** A board among the crew: the same lines as the public one, ranked only against them. */
export const fetchCrewBoard = (board: BoardId): Promise<BoardView & { crew: number }> =>
  apiRequest<BoardView & { crew: number }>('GET', `/v1/crews/boards/${board}${dayQuery(board).replace('&', '?')}`, { token: token() });

// MARK: The week's XP

/** Whether the last answer had a crew: only then does a shift's XP go out. */
let inCrew = read(XP_KEY + '.in') === '1';

function remember(view: CrewView): CrewView {
  inCrew = view.crew !== null;
  write(XP_KEY + '.in', inCrew ? '1' : null);
  return view;
}

let sending = false;

/** A shift's Season XP for the crew's week: kept here until the service has it, so a shift offline still counts. */
export function addCrewXp(xp: number): void {
  if (!inCrew || xp <= 0 || !leaderboardEnabled) return;
  write(XP_KEY, String(Math.round(xp + Number(read(XP_KEY) ?? 0))));
  void flushCrewXp();
}

export async function flushCrewXp(): Promise<void> {
  if (sending || !loadAccount()) return;
  sending = true;
  try {
    for (let left = Number(read(XP_KEY) ?? 0); left > 0; left = Number(read(XP_KEY) ?? 0)) {
      const xp = Math.min(XP_CHUNK, left);
      await apiRequest('POST', '/v1/crews/xp', { token: token(), body: { xp } });
      write(XP_KEY, left - xp > 0 ? String(left - xp) : null);
    }
  } catch (error) {
    // Refused for good (a bad number): drop it; no network or a busy service: next time.
    if (error instanceof LeaderboardError && error.status === 422) write(XP_KEY, null);
  } finally {
    sending = false;
  }
}
