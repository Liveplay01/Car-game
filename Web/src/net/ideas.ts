import { apiRequest, leaderboardEnabled, loadAccount } from './leaderboard';

/**
 * The Club's ideas (`Server/src/modules/ideas`): players suggest, a moderator rewords and publishes, and
 * everyone gives money to an idea until it has its goal; then it is made. Without the service there are none.
 */
export const ideasEnabled = leaderboardEnabled;

/** How long a suggestion may be, as the service checks it (`IDEA_MIN_TEXT`, `IDEA_MAX_TEXT`). */
export const IDEA_MIN = 10;
export const IDEA_MAX = 500;

export interface Idea {
  id: string;
  title: string;
  text: string;
  /** Funded: the goal is reached and the idea waits to be made. */
  status: 'open' | 'funded' | 'building' | 'built';
  goal: number;
  raised: number;
  /** What this player gave to it. */
  mine: number;
  /** The player who suggested it in the Club. */
  by: string | null;
  /** When it was published (ms). */
  at: number;
}

export interface IdeasView {
  ideas: Idea[];
  goal: number;
  minGift: number;
  maxGift: number;
}

export function fetchIdeas(): Promise<IdeasView> {
  return apiRequest<IdeasView>('GET', '/v1/ideas', { token: loadAccount()?.token });
}

/** Gives money to an open idea. `accepted` is what went in; take that much from the save. */
export function giveToIdea(id: string, amount: number): Promise<IdeasView & { accepted: number }> {
  return apiRequest<IdeasView & { accepted: number }>('POST', `/v1/ideas/${id}/gifts`, { token: loadAccount()?.token, body: { amount } });
}

/** Suggests an idea; it appears once a moderator has reworded and published it. */
export function suggestIdea(text: string): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>('POST', '/v1/ideas', { token: loadAccount()?.token, body: { text } });
}
