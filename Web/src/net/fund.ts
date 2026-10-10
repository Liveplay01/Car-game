import type { FundView } from '../core/fund';
import { apiRequest, leaderboardEnabled, loadAccount } from './leaderboard';

/**
 * The City Fund's client (`Server/src/modules/fund`; the rules and the thank-you skins are `core/fund.ts`).
 * Looking needs no name; giving does. Without the service there is no fund.
 */
export const fundEnabled = leaderboardEnabled;

/** The projects and the top givers; with a name also what this player gave to each. */
export function fetchFund(): Promise<FundView> {
  return apiRequest<FundView>('GET', '/v1/fund', { token: loadAccount()?.token });
}

/** Gives money. `accepted` is what went in (all of it, unless the last project was nearly built); take that much from the save. */
export function giveToFund(amount: number): Promise<FundView & { accepted: number }> {
  return apiRequest<FundView & { accepted: number }>('POST', '/v1/fund/gifts', { token: loadAccount()?.token, body: { amount } });
}
