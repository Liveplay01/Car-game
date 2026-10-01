import type { ChallengeSpec } from '../core/challenge';
import { apiRequest, apiUrl, leaderboardEnabled, loadAccount } from './leaderboard';

/**
 * Short links for challenges (`Server/src/modules/challenges`): `…/c/K7M29QXA` instead of the
 * long `#challenge=…`, and in a chat it shows a picture with the score to beat. Only made when
 * the player taps Challenge a friend; without the service, or when it does not answer quickly,
 * the long link is shared as before. With a leaderboard name the picture says who sent it.
 */

const TIMEOUT_MS = 2500;
const made = new Map<string, string>();

/** The short link of this challenge if it was made already this visit. */
export const knownShortLink = (code: string): string | null => made.get(code) ?? null;

/** The short link of a challenge (`code` is its `encodeChallenge`), or null when there is none. */
export async function shortLink(spec: ChallengeSpec, code: string): Promise<string | null> {
  const known = made.get(code);
  if (known) return known;
  if (!leaderboardEnabled) return null;
  try {
    const body = { code, mode: spec.mode, level: spec.level, target: Math.min(spec.target, 1_000_000_000) };
    const { id } = await apiRequest<{ id: string }>('POST', '/v1/challenges', { body, token: loadAccount()?.token, timeoutMs: TIMEOUT_MS });
    const url = apiUrl(`/c/${id}`);
    made.set(code, url);
    return url;
  } catch {
    return null;
  }
}
