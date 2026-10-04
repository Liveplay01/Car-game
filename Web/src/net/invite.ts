import { INVITE_LEVEL } from '../core/config';
import { storage } from '../storage/store';
import { apiRequest, LeaderboardError, leaderboardEnabled, loadAccount } from './leaderboard';

/**
 * Invite a friend (`Server/src/modules/referrals`): the friend code is the invite. A friend who opens
 * `…/i/K7M29QXA` (or a challenge link from you) arrives with `?ref=K7M29QXA`; the game keeps the code
 * until that player has a leaderboard name, then hands it in once. When they reach that level, both get a
 * Standard Chest (`INVITE_LEVEL`), which the game picks up like any gift from the team (`net/rewards.ts`).
 * Everything here is quiet: no name, no service or no network only means "later".
 */

const KEY = 'carGame.invite.v1';
/** The friend code's alphabet (`Server/src/codes.ts`): no 0, O, 1, I or L. */
const CODE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/;

/** `k7m2-9qxa` or `K7M29QXA` as the 8 characters, or null when it is no friend code. */
export function parseInviteCode(text: string | null): string | null {
  const raw = (text ?? '').toUpperCase().replace(/[\s-]+/g, '');
  return CODE.test(raw) ? raw : null;
}

export const pendingInvite = (): string | null => {
  try {
    return parseInviteCode(storage().getItem(KEY));
  } catch {
    return null;
  }
};

function setPending(code: string | null): void {
  try {
    if (code) storage().setItem(KEY, code);
    else storage().removeItem(KEY);
  } catch {
    /* private mode: the invite lasts this visit only */
  }
}

/**
 * `?ref=CODE` in the address: read once, then taken out of it. Kept only for someone who is new
 * (below the level) and while the service is there to pay; the first invite wins. Returns whether it was kept.
 */
export function readInviteLink(level: number): boolean {
  const params = new URLSearchParams(location.search);
  if (!params.has('ref')) return false;
  const code = parseInviteCode(params.get('ref'));
  params.delete('ref');
  const query = params.toString();
  history.replaceState(null, '', location.pathname + (query ? `?${query}` : '') + location.hash);
  if (!code || !leaderboardEnabled || level >= INVITE_LEVEL || pendingInvite() !== null) return false;
  setPending(code);
  return true;
}

export interface InviteView {
  /** Your friend code, like `K7M2-9QXA`. */
  code: string;
  /** The page to share (a preview with your name); null when the service has no game address. */
  link: string | null;
  /** The Shift level a friend must reach. */
  level: number;
  reward: string;
  /** What the inviter gets on top for their nth friend. */
  milestones: { invites: number; item: string }[];
  invitedBy: { name: string; done: boolean } | null;
  invited: { name: string; done: boolean; at: number }[];
  done: number;
  max: number;
}

export async function fetchInvite(): Promise<InviteView> {
  const account = loadAccount();
  if (!account) throw new LeaderboardError('unauthorized', 'Enter a name first.', 401);
  return apiRequest<InviteView>('GET', '/v1/me/referral', { token: account.token });
}

/** What a player shares: the service's preview page, or the game with the code when there is none. */
export const inviteUrl = (view: InviteView): string => view.link ?? `${location.origin}${location.pathname}?ref=${view.code.replace(/-/g, '')}`;

let busy = false;

/**
 * Hands in the invite this device came with, once there is a name. A definite answer (taken, or
 * refused: not a new player, an unknown code) ends it; a network failure keeps it for next time.
 * Returns true when the invite was taken, so rewards that are due can be picked up.
 */
export async function redeemInvite(): Promise<boolean> {
  const code = pendingInvite();
  const account = loadAccount();
  if (!code || !account || !leaderboardEnabled || busy) return false;
  busy = true;
  try {
    await apiRequest('POST', '/v1/me/referral', { token: account.token, body: { code } });
    setPending(null);
    return true;
  } catch (error) {
    // No network, a busy or failing service, or an account that is gone (the next name tries again): keep it. Anything else is final.
    const later = !(error instanceof LeaderboardError) || [0, 401, 403, 429].includes(error.status) || error.status >= 500;
    if (!later) setPending(null);
    return false;
  } finally {
    busy = false;
  }
}
