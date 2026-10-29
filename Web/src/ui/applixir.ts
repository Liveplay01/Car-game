/**
 * Applixir's rewarded ad on the normal site and in the Play app (`storage/device.ts`). The SDK is
 * a script in `index.html` that adds `initializeAndOpenPlayer`; it draws into `#applixir-player`.
 * The reward comes only with `complete` followed by the end of the ad (`allAdsCompleted`,
 * `skipped`, `manuallyEnded`); a closed or failed ad pays nothing.
 */
import type { RewardedOutcome } from '../present/session';
import { testAds } from '../storage/device';

const APP_KEY = '0ca177c2-647d-497c-9b78-e8ec43e345b6';
const PLAYER_ID = 'applixir-player';

type AdStatus = { type: string };
type AdError = { getError(): { data: unknown } };
type Initialize = (options: {
  apiKey: string;
  injectionElementId: string;
  adStatusCallbackFn: (status: AdStatus) => void;
  adErrorCallbackFn: (error: AdError) => void;
}) => void;

const ENDED = ['allAdsCompleted', 'skipped', 'manuallyEnded'];

function sdk(): Initialize | null {
  const init = (window as Window & { initializeAndOpenPlayer?: Initialize }).initializeAndOpenPlayer;
  return typeof init === 'function' ? init : null;
}

export function applixirReady(): boolean {
  return sdk() !== null && document.getElementById(PLAYER_ID) !== null;
}

/** Plays the rewarded ad and says how it went. False when the SDK did not load (blocker, offline). */
export function applixirRewardedAd(done: (outcome: RewardedOutcome) => void): boolean {
  const init = sdk();
  if (!init) return false;
  let rewarded = false;
  let settled = false;
  const settle = (outcome: RewardedOutcome): void => {
    if (settled) return;
    settled = true;
    done(outcome);
  };
  init({
    apiKey: APP_KEY,
    injectionElementId: PLAYER_ID,
    adStatusCallbackFn: ({ type }) => {
      if (testAds) console.info('Applixir status', type);
      if (type === 'complete') rewarded = true;
      if (ENDED.includes(type)) settle(rewarded ? 'watched' : 'dismissed');
    },
    adErrorCallbackFn: (error) => {
      console.warn('Applixir', error.getError().data);
      settle('unavailable');
    },
  });
  return true;
}
