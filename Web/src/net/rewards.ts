import { storage } from '../storage/store';
import { apiRequest, leaderboardEnabled, loadAccount } from './leaderboard';

/**
 * Rewards from the team (Leo, 03.10.2026): the Ladybug skin for a bug report on the website with
 * a friend code, and whatever a moderator hands out (`Server/src/modules/feedback`). The game
 * asks with its leaderboard token, pays them locally and tells the service they arrived. Ids
 * already paid are remembered here, so a lost answer never pays twice.
 */

export type RewardItem = 'ladybug' | 'chest:standard' | 'chest:premium' | 'chest:event';
export interface Reward {
  id: string;
  item: RewardItem;
}

const PAID_KEY = 'carGame.rewardsPaid.v1';

function paidIds(): string[] {
  try {
    const raw = JSON.parse(storage().getItem(PAID_KEY) ?? '[]') as unknown;
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function rememberPaid(ids: string[]): void {
  try {
    storage().setItem(PAID_KEY, JSON.stringify([...paidIds(), ...ids].slice(-200)));
  } catch {
    /* the claim below still marks them on the service */
  }
}

let busy = false;

/**
 * Picks up waiting rewards: `pay` books them in the save (and returns once it is written), then
 * the service hears they arrived. Quiet without a name, offline or without the service.
 */
export async function collectRewards(pay: (items: RewardItem[]) => void): Promise<void> {
  const account = loadAccount();
  if (!leaderboardEnabled || !account || busy) return;
  busy = true;
  try {
    const { rewards } = await apiRequest<{ rewards: Reward[] }>('GET', '/v1/me/rewards', { token: account.token });
    if (rewards.length === 0) return;
    const paid = paidIds();
    const fresh = rewards.filter((r) => !paid.includes(r.id));
    if (fresh.length > 0) {
      pay(fresh.map((r) => r.item));
      rememberPaid(fresh.map((r) => r.id));
    }
    await apiRequest('POST', '/v1/me/rewards/claim', { token: account.token, body: { ids: rewards.map((r) => r.id) } });
  } catch {
    /* next time */
  } finally {
    busy = false;
  }
}
