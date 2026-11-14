/**
 * Playgama hosts the game itself: `npm run playgama` builds it with `--mode playgama` (`storage/device.ts`,
 * `inPortal`) and zips it, since their page lets no other address be framed. The build's `index.html` loads
 * the Bridge SDK (wiki.playgama.com/playgama/bridge-sdk, `vite.config.ts`), and this starts it: the save
 * goes to Bridge storage (cloud for a logged-in player), the free chest's ad is their rewarded ad, and
 * the platform's pause and sound come back as events. Without the SDK (an ad blocker, a slow network)
 * the game saves in the browser as usual.
 *
 * The chest is paid only on the `rewarded` state, never on `closed`. No midgame ads: the shifts flow
 * into each other.
 */
import { type KeyValueStore, useStore } from '../storage/store';
import { SAVE_KEYS } from '../storage/save';
import { ACCOUNT_KEY, NAME_KEY } from '../storage/profile';
import type { RewardedOutcome } from '../present/session';

/** The game starts without the SDK rather than keep the player waiting longer than this. */
const SDK_TIMEOUT = 6000;
/** Writes made within this time go out as one `storage.set`. */
const SAVE_DELAY = 400;
/** The id in `playgama-bridge-config.json`. */
const CHEST_PLACEMENT = 'free_chest';

type RewardedState = 'loading' | 'opened' | 'closed' | 'rewarded' | 'failed';

interface Bridge {
  initialize(): Promise<void>;
  readonly EVENT_NAME: Record<'REWARDED_STATE_CHANGED' | 'AUDIO_STATE_CHANGED' | 'PAUSE_STATE_CHANGED', string>;
  readonly storage: {
    get(keys: string[]): Promise<(string | null)[]>;
    set(keys: string[], values: string[]): Promise<void>;
    delete(keys: string[]): Promise<void>;
  };
  readonly platform: {
    readonly isAudioEnabled: boolean;
    on(event: string, fn: (value: boolean) => void): void;
    sendMessage(message: string): void;
  };
  readonly advertisement: {
    readonly isRewardedSupported: boolean;
    showRewarded(placement: string): void;
    on(event: string, fn: (state: RewardedState) => void): void;
  };
}

declare global {
  interface Window {
    bridge?: Bridge;
  }
}

/** The SDK once it is ready; null when it is missing. */
let bridge: Bridge | null = null;
/** Quiets the game while an ad plays or the platform mutes it (the shell's audio); set by the shell. */
let quiet: (on: boolean) => void = () => undefined;
let pausing: (paused: boolean) => void = () => undefined;
let adDone: ((outcome: RewardedOutcome) => void) | null = null;
let adWatched = false;

const timeout = (): Promise<never> => new Promise((_, reject) => window.setTimeout(() => reject(new Error('Playgama SDK timed out')), SDK_TIMEOUT));

/** The save as Bridge holds it: read once up front, written back in batches. */
async function bridgeStore(found: Bridge, keys: readonly string[]): Promise<KeyValueStore> {
  const values = await found.storage.get([...keys]);
  const cache = new Map<string, string>();
  keys.forEach((key, i) => {
    const value = values[i];
    if (typeof value === 'string') cache.set(key, value);
  });
  const dirty = new Set<string>();
  let timer = 0;
  const flush = (): void => {
    window.clearTimeout(timer);
    timer = 0;
    const set = [...dirty].filter((key) => cache.has(key));
    const gone = [...dirty].filter((key) => !cache.has(key));
    dirty.clear();
    if (set.length) found.storage.set(set, set.map((key) => cache.get(key) as string)).catch(() => undefined);
    if (gone.length) found.storage.delete(gone).catch(() => undefined);
  };
  const touch = (key: string): void => {
    dirty.add(key);
    timer ||= window.setTimeout(flush, SAVE_DELAY);
  };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => document.hidden && flush());
  return {
    getItem: (key) => cache.get(key) ?? null,
    setItem: (key, value) => {
      cache.set(key, value);
      touch(key);
    },
    removeItem: (key) => {
      cache.delete(key);
      touch(key);
    },
  };
}

/** Must run before the save is read: the store is filled from Bridge first. */
export async function startPlaygama(): Promise<void> {
  try {
    const found = window.bridge;
    if (!found) return;
    await Promise.race([found.initialize(), timeout()]);
    const keys = [...SAVE_KEYS, NAME_KEY, ACCOUNT_KEY];
    useStore(await bridgeStore(found, keys), keys);
    found.advertisement.on(found.EVENT_NAME.REWARDED_STATE_CHANGED, onRewardedState);
    found.platform.on(found.EVENT_NAME.AUDIO_STATE_CHANGED, (enabled) => quiet(!enabled));
    found.platform.on(found.EVENT_NAME.PAUSE_STATE_CHANGED, (paused) => pausing(paused));
    bridge = found;
    quiet(!found.platform.isAudioEnabled);
  } catch {
    /* no SDK: the save stays in this browser */
  }
}

/** The game is on screen and takes taps. */
export function gameLoaded(): void {
  try {
    bridge?.platform.sendMessage('game_ready');
  } catch {
    /* the SDK is a guest: it never stops the game */
  }
}

/** How the game's sound goes quiet while an ad plays or the platform mutes the tab, and comes back after. */
export function onAdAudio(fn: (on: boolean) => void): void {
  quiet = fn;
}

/** The platform pauses the game (an ad, another tab) and lets it go again. */
export function onPlatformPause(fn: (paused: boolean) => void): void {
  pausing = fn;
}

export function rewardedAdsReady(): boolean {
  return bridge?.advertisement.isRewardedSupported === true;
}

function onRewardedState(state: RewardedState): void {
  if (!adDone) return;
  if (state === 'opened') quiet(true);
  else if (state === 'rewarded') adWatched = true;
  else if (state === 'closed') settle(adWatched ? 'watched' : 'dismissed');
  else if (state === 'failed') settle('unavailable');
}

function settle(outcome: RewardedOutcome): void {
  const done = adDone;
  adDone = null;
  adWatched = false;
  quiet(!bridge?.platform.isAudioEnabled);
  done?.(outcome);
}

/**
 * Plays Playgama's rewarded ad and says how it went. False when there is none: the game then plays
 * its own placeholder. The reward comes only with the `rewarded` state; the sound is off meanwhile.
 */
export function rewardedAd(done: (outcome: RewardedOutcome) => void): boolean {
  if (!bridge || !rewardedAdsReady()) return false;
  adDone = done;
  adWatched = false;
  try {
    bridge.advertisement.showRewarded(CHEST_PLACEMENT);
  } catch {
    settle('unavailable');
  }
  return true;
}
