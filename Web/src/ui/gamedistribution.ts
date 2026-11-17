/**
 * GameDistribution hosts the zip from `npm run gamedistribution` (`vite build --mode gamedistribution`) and
 * frames it; `?gamedistribution` runs the same on any build (`storage/device.ts`, `inGameDistribution`).
 * Their SDK is loaded here and not in `index.html`, so it never holds up the game's start. It brings the
 * free chest's rewarded ad and says when to pause and mute; the save stays in the browser.
 *
 * The chest is paid only on `SDK_REWARDED_WATCH_COMPLETE`, never on the ad's promise alone. No midgame ads.
 */
import type { RewardedOutcome } from '../present/session';

const GAME_ID = '04823641a7724c56b49cf5a229dd818d';
const SDK_URL = 'https://html5.api.gamedistribution.com/main.min.js';

interface GdEvent {
  name: string;
}

interface Gdsdk {
  preloadAd(kind: 'rewarded'): Promise<unknown>;
  showAd(kind: 'rewarded'): Promise<unknown>;
}

declare global {
  interface Window {
    GD_OPTIONS?: { gameId: string; onEvent(event: GdEvent): void };
    gdsdk?: Gdsdk;
  }
}

/** Quiets the game while an ad plays (the shell's audio); set by the shell. */
let quiet: (on: boolean) => void = () => undefined;
let pausing: (paused: boolean) => void = () => undefined;
let adDone: ((outcome: RewardedOutcome) => void) | null = null;
let adWatched = false;
let paused = false;

function onEvent({ name }: GdEvent): void {
  if (name === 'SDK_GAME_PAUSE') setPaused(true);
  else if (name === 'SDK_GAME_START') setPaused(false);
  else if (name === 'SDK_REWARDED_WATCH_COMPLETE') adWatched = true;
  else if (name === 'SDK_READY') preload();
}

function setPaused(on: boolean): void {
  if (paused === on) return;
  paused = on;
  quiet(on);
  pausing(on);
}

/** A head start for the next ad; if none is there, `showAd` asks again and fails on its own. */
function preload(): void {
  window.gdsdk?.preloadAd('rewarded').catch(() => undefined);
}

export function startGameDistribution(): void {
  window.GD_OPTIONS = { gameId: GAME_ID, onEvent };
  const script = document.createElement('script');
  script.id = 'gamedistribution-jssdk';
  script.src = SDK_URL;
  script.async = true;
  document.head.append(script);
}

/** How the game's sound goes quiet while an ad plays, and comes back after. */
export function onAdAudio(fn: (on: boolean) => void): void {
  quiet = fn;
}

/** The SDK pauses the game for an ad and lets it go again. */
export function onPlatformPause(fn: (paused: boolean) => void): void {
  pausing = fn;
}

export function rewardedAdsReady(): boolean {
  return window.gdsdk !== undefined;
}

function settle(outcome: RewardedOutcome): void {
  const done = adDone;
  adDone = null;
  adWatched = false;
  // The SDK resumes the game itself; this only catches an ad that failed after it paused.
  setPaused(false);
  preload();
  done?.(outcome);
}

/** Plays the rewarded ad and says how it went. False when the SDK did not load (blocker, offline). */
export function rewardedAd(done: (outcome: RewardedOutcome) => void): boolean {
  const sdk = window.gdsdk;
  if (!sdk) return false;
  adDone = done;
  adWatched = false;
  try {
    sdk.showAd('rewarded').then(
      () => settle(adWatched ? 'watched' : 'dismissed'),
      () => settle('unavailable'),
    );
  } catch {
    settle('unavailable');
  }
  return true;
}
