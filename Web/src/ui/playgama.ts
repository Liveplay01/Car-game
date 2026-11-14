/**
 * Playgama embeds the game through its wrapper page (`playgama/index.html`), whose iframe opens
 * the normal address with `?playgama` (`storage/device.ts`, `inPortal`). The wrapper holds the
 * Bridge SDK (wiki.playgama.com/playgama/bridge-sdk) and this talks to it with `postMessage`:
 * the save goes to Bridge storage (cloud for a logged-in player), the rewarded ad plays in the
 * wrapper's page, and the platform's pause and sound come back as events. Without the wrapper
 * (an ad blocker, a slow network, Playgama not answering) the game saves in the browser as usual.
 *
 * The free chest's ad is Playgama's rewarded ad (paid only on the `rewarded` state, never on
 * `closed`). No midgame ads: the shifts flow into each other.
 */
import { type KeyValueStore, useStore } from '../storage/store';
import { SAVE_KEYS } from '../storage/save';
import { ACCOUNT_KEY, NAME_KEY } from '../storage/profile';
import type { RewardedOutcome } from '../present/session';

/** The game starts without the wrapper's answer rather than keep the player waiting longer than this. */
const WRAPPER_TIMEOUT = 6000;
/** Writes made within this time go out as one `storage.set`. */
const SAVE_DELAY = 400;
/** The id in `playgama-bridge-config.json`. */
const CHEST_PLACEMENT = 'free_chest';

type RewardedState = 'loading' | 'opened' | 'closed' | 'rewarded' | 'failed';
type Hello = { ok: boolean; rewarded: boolean; audio: boolean };
type Reply =
  | ({ type: 'hello' } & Hello)
  | { type: 'done'; id: number; value: unknown }
  | { type: 'fail'; id: number }
  | { type: 'event'; name: 'rewarded'; value: RewardedState }
  | { type: 'event'; name: 'audio' | 'pause'; value: boolean };

/** True once the wrapper has answered; false outside Playgama or when it is missing. */
let connected = false;
let rewardedSupported = false;
let audioOn = true;
let hello: ((info: Hello) => void) | null = null;
const pending = new Map<number, { resolve: (value: unknown) => void; reject: () => void }>();
let nextId = 0;
/** Quiets the game while an ad plays or the platform mutes it (the shell's audio); set by the shell. */
let quiet: (on: boolean) => void = () => undefined;
let pausing: (paused: boolean) => void = () => undefined;
let adDone: ((outcome: RewardedOutcome) => void) | null = null;
let adWatched = false;

// shortcut: the wrapper's address is Playgama's to choose, so messages go to any parent ('*') and
// are accepted only from it; the page carries nothing but the save. Pin the origin if Playgama names one.
const toWrapper = (message: object): void => window.parent.postMessage({ pg: 1, ...message }, '*');

function request<T>(op: string, args: object = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
    toWrapper({ op, id, ...args });
  });
}

function onMessage({ source, data }: MessageEvent<Reply & { pg?: number }>): void {
  if (source !== window.parent || data?.pg !== 1) return;
  if (data.type === 'hello') hello?.(data);
  else if (data.type === 'done' || data.type === 'fail') {
    const waiting = pending.get(data.id);
    pending.delete(data.id);
    if (data.type === 'done') waiting?.resolve(data.value);
    else waiting?.reject();
  } else if (data.name === 'rewarded') onRewardedState(data.value);
  else if (data.name === 'audio') {
    audioOn = data.value;
    quiet(!audioOn);
  } else pausing(data.value);
}

const timeout = (): Promise<never> => new Promise((_, reject) => window.setTimeout(() => reject(new Error('Playgama wrapper timed out')), WRAPPER_TIMEOUT));

/** The save as Bridge holds it: read once up front, written back in batches. */
async function bridgeStore(keys: readonly string[]): Promise<KeyValueStore> {
  const values = await request<(string | null)[]>('get', { keys });
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
    if (set.length) request('set', { keys: set, values: set.map((key) => cache.get(key)) }).catch(() => undefined);
    if (gone.length) request('delete', { keys: gone }).catch(() => undefined);
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
  if (window.parent === window) return;
  try {
    window.addEventListener('message', onMessage);
    const answer = new Promise<Hello>((resolve) => (hello = resolve));
    toWrapper({ op: 'hi' });
    const info = await Promise.race([answer, timeout()]);
    if (!info.ok) return;
    const keys = [...SAVE_KEYS, NAME_KEY, ACCOUNT_KEY];
    useStore(await Promise.race([bridgeStore(keys), timeout()]), keys);
    rewardedSupported = info.rewarded;
    audioOn = info.audio;
    connected = true;
    quiet(!audioOn);
  } catch {
    /* no wrapper: the save stays in this browser */
  }
}

/** The game is on screen and takes taps. */
export function gameLoaded(): void {
  if (connected) toWrapper({ op: 'ready' });
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
  return connected && rewardedSupported;
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
  quiet(!audioOn);
  done?.(outcome);
}

/**
 * Plays Playgama's rewarded ad and says how it went. False when there is none: the game then plays
 * its own placeholder. The reward comes only with the `rewarded` state; the sound is off meanwhile.
 */
export function rewardedAd(done: (outcome: RewardedOutcome) => void): boolean {
  if (!rewardedAdsReady()) return false;
  adDone = done;
  adWatched = false;
  request('rewarded', { placement: CHEST_PLACEMENT }).catch(() => settle('unavailable'));
  return true;
}
