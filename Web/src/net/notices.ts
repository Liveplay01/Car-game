import { inPlayStore } from '../storage/device';
import { storage } from '../storage/store';
import { apiRequest, leaderboardEnabled, loadAccount } from './leaderboard';

/**
 * Messages from the team (Leo, 01.11.2026): a heading and a text the team writes in the admin page
 * for everyone, for the Play app or for one player (`Server/src/modules/messages`). They are shown
 * at the start until the player taps them away; the ids of those tapped away are kept here.
 */

export interface Notice {
  id: string;
  title: string;
  body: string;
}

const SEEN_KEY = 'carGame.noticesSeen.v1';

function seenIds(): string[] {
  try {
    const raw = JSON.parse(storage().getItem(SEEN_KEY) ?? '[]') as unknown;
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function markNoticeSeen(id: string): void {
  try {
    storage().setItem(SEEN_KEY, JSON.stringify([...seenIds(), id].slice(-100)));
  } catch {
    /* it shows once more at the next start */
  }
}

/** The messages this player has not tapped away yet; empty offline or without the service. */
export async function fetchNotices(): Promise<Notice[]> {
  if (!leaderboardEnabled) return [];
  try {
    const { messages } = await apiRequest<{ messages: Notice[] }>('GET', `/v1/messages${inPlayStore ? '?channel=play' : ''}`, { token: loadAccount()?.token });
    const seen = seenIds();
    return messages.filter((m) => !seen.includes(m.id));
  } catch {
    return [];
  }
}
