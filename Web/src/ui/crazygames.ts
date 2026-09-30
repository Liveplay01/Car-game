/**
 * CrazyGames embeds the normal address with `?crazygames` (`storage/device.ts`, `inPortal`).
 * Only then this loads their SDK, and its Data Module holds the save: in the cloud for a
 * logged-in player, in the browser for a guest. The SDK also hears when the game has loaded
 * and when a shift is being played, so CrazyGames places its ads outside of play. Without the
 * SDK (an ad blocker, a slow network, CrazyGames not answering) the game saves as usual.
 */
import { type KeyValueStore, useStore } from '../storage/store';
import { SAVE_KEYS } from '../storage/save';
import { NAME_KEY } from '../storage/profile';

const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
/** The game starts without the SDK rather than keep the player waiting longer than this. */
const SDK_TIMEOUT = 6000;

interface CrazyGamesSdk {
  init(): Promise<void>;
  /** 'disabled' outside CrazyGames: every call throws there. 'local' on localhost, for testing. */
  readonly environment: 'local' | 'crazygames' | 'disabled';
  readonly data: KeyValueStore;
  readonly game: {
    loadingStart(): void;
    loadingStop(): void;
    gameplayStart(): void;
    gameplayStop(): void;
  };
}

/** The SDK once it is ready; null outside CrazyGames or when it is missing or disabled. */
let sdk: CrazyGamesSdk | null = null;
let playing = false;

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('CrazyGames SDK not loaded'));
    document.head.append(script);
  });
}

const timeout = (): Promise<never> => new Promise((_, reject) => window.setTimeout(() => reject(new Error('CrazyGames SDK timed out')), SDK_TIMEOUT));

/** Must run before the save is read: until `init` resolves, the Data Module is empty. */
export async function startCrazyGames(): Promise<void> {
  try {
    await Promise.race([loadScript(), timeout()]);
    const found = (window as unknown as { CrazyGames?: { SDK?: CrazyGamesSdk } }).CrazyGames?.SDK;
    if (!found) return;
    await Promise.race([found.init(), timeout()]);
    if (found.environment === 'disabled') return;
    found.game.loadingStart();
    useStore(found.data, [...SAVE_KEYS, NAME_KEY]);
    sdk = found;
  } catch {
    /* no SDK: the save stays in this browser */
  }
}

/** The game is on screen and takes taps. */
export function gameLoaded(): void {
  call((s) => s.game.loadingStop());
}

/** A shift is being played (true) or the player is in a menu, a sheet or away (false). */
export function reportGameplay(now: boolean): void {
  if (!sdk || now === playing) return;
  playing = now;
  call((s) => (now ? s.game.gameplayStart() : s.game.gameplayStop()));
}

function call(fn: (s: CrazyGamesSdk) => void): void {
  if (!sdk) return;
  try {
    fn(sdk);
  } catch {
    /* the SDK is a guest: it never stops the game */
  }
}
