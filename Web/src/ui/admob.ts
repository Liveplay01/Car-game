/**
 * AdMob's rewarded ad in the Google Play app. The app (`Android/`) is a WebView around this page and
 * hands it `window.AndroidAds`; everywhere else that object is missing and nothing here runs.
 * The app answers each `show()` once through `window.onAdMobResult`.
 */
import type { RewardedOutcome } from '../present/session';
import { inPlayStore } from '../storage/device';

interface AndroidAds {
  isReady(): boolean;
  show(): boolean;
}

const bridge = inPlayStore ? (window as Window & { AndroidAds?: AndroidAds }).AndroidAds : undefined;

export const admobOn = bridge !== undefined;

export function admobReady(): boolean {
  return bridge?.isReady() ?? false;
}

const OUTCOMES: readonly RewardedOutcome[] = ['watched', 'dismissed', 'unavailable'];

/** Plays the ad and says how it went. False when none is loaded. */
export function admobRewardedAd(done: (outcome: RewardedOutcome) => void): boolean {
  if (!bridge) return false;
  (window as Window & { onAdMobResult?: (outcome: string) => void }).onAdMobResult = (outcome) => {
    done(OUTCOMES.find((o) => o === outcome) ?? 'unavailable');
  };
  return bridge.show();
}
