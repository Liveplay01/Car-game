/**
 * CrazyGames embeds the normal address with `?crazygames` (`storage/device.ts`, `inPortal`).
 * Only then this loads their SDK, and its Data Module holds the save: in the cloud for a
 * logged-in player, in the browser for a guest. The SDK also hears when the game has loaded
 * and when a shift is being played, so CrazyGames places its ads outside of play. Without the
 * SDK (an ad blocker, a slow network, CrazyGames not answering) the game saves as usual.
 *
 * Since 02.10.2026 (SDK v3 docs, docs.crazygames.com/sdk): the free chest's ad is their rewarded
 * ad (paid only on `adFinished`; never a midgame ad, the shifts flow into each other), the big
 * moments are a `happytime`, and a multiplayer invite is their invite link.
 */
import { type KeyValueStore, useStore } from '../storage/store';
import { SAVE_KEYS } from '../storage/save';
import { ACCOUNT_KEY, NAME_KEY } from '../storage/profile';
import type { RewardedOutcome } from '../present/session';

const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';
/** The game starts without the SDK rather than keep the player waiting longer than this. */
const SDK_TIMEOUT = 6000;
/** "Use this feature sparingly": at most one celebration in this long (ms). */
const HAPPYTIME_GAP = 90_000;
/** The invite link's parameter that carries the room code. */
const ROOM_PARAM = 'room';

type AdError = { code?: string };

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
    happytime(): void;
    inviteLink(params: Record<string, string>): string;
    getInviteParam(name: string): string | null;
  };
  readonly ad: {
    requestAd(type: 'midgame' | 'rewarded', callbacks: { adStarted?: () => void; adFinished?: () => void; adError?: (error: AdError) => void }): void;
  };
}

declare global {
  interface Window {
    CrazyGames?: { SDK?: CrazyGamesSdk };
  }
}

/** The SDK once it is ready; null outside CrazyGames or when it is missing or disabled. */
let sdk: CrazyGamesSdk | null = null;
let playing = false;
let lastHappytime = -Infinity;
/** Quiets the game while an ad plays (the shell's audio); set by the shell. */
let quiet: (on: boolean) => void = () => undefined;

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
    const found = window.CrazyGames?.SDK;
    if (!found) return;
    await Promise.race([found.init(), timeout()]);
    if (found.environment === 'disabled') return;
    found.game.loadingStart();
    useStore(found.data, [...SAVE_KEYS, NAME_KEY, ACCOUNT_KEY]);
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

/** How the game's sound goes quiet while an ad plays, and comes back after. */
export function onAdAudio(fn: (on: boolean) => void): void {
  quiet = fn;
}

/** A big moment (a boss busted, a Legendary Shift, a new record, a Prestige): CrazyGames celebrates it, now and then. */
export function celebrate(): void {
  const now = performance.now();
  if (!sdk || now - lastHappytime < HAPPYTIME_GAP) return;
  lastHappytime = now;
  call((s) => s.game.happytime());
}

/**
 * Plays CrazyGames' rewarded ad and says how it went. False when there is no SDK: the game then
 * plays its own placeholder. The reward comes only with `adFinished`; the sound is off meanwhile.
 */
export function rewardedAd(done: (outcome: RewardedOutcome) => void): boolean {
  if (!sdk) return false;
  let settled = false;
  const settle = (outcome: RewardedOutcome): void => {
    if (settled) return;
    settled = true;
    quiet(false);
    done(outcome);
  };
  try {
    sdk.ad.requestAd('rewarded', {
      adStarted: () => quiet(true),
      adFinished: () => settle('watched'),
      adError: (error) =>
        settle(
          error?.code === 'adCooldown'
            ? 'cooldown'
            : error?.code === 'adblock'
              ? 'blocked'
              : // No ads in CrazyGames' Basic Launch: the game's own placeholder plays, as before.
                error?.code === 'adsDisabledBasicLaunch'
                ? 'disabled'
                : 'unavailable',
        ),
    });
  } catch {
    settle('unavailable');
  }
  return true;
}

/** The address a friend opens to join `code` on CrazyGames; null outside it. */
export function inviteLink(code: string): string | null {
  if (!sdk) return null;
  try {
    return sdk.game.inviteLink({ [ROOM_PARAM]: code });
  } catch {
    return null;
  }
}

/** The room code a CrazyGames invite link brought, if any. */
export function invitedRoom(): string | null {
  if (!sdk) return null;
  try {
    const code = sdk.game.getInviteParam(ROOM_PARAM);
    return code && /^\d{4}$/.test(code) ? code : null;
  } catch {
    return null;
  }
}

function call(fn: (s: CrazyGamesSdk) => void): void {
  if (!sdk) return;
  try {
    fn(sdk);
  } catch {
    /* the SDK is a guest: it never stops the game */
  }
}
