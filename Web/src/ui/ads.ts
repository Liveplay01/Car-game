/**
 * Google AdSense for `game.gustaff.dev`. The tag loads once the game is on screen, so it never
 * delays the first tap, and only in the production build on the normal address (also the Google
 * Play app, which opens it): never on CrazyGames (`?crazygames`, they run their own ads) and never
 * while developing. The consent message for the EEA and the UK is the one published in AdSense
 * (Privacy & messaging); it comes with this tag. The Privacy Policy (`present/legal.ts`) and the
 * Content-Security-Policy (`nginx.conf`) name the same services.
 *
 * Rewarded ads (Leo, 05.10.2026): the only ads the game shows, and always the player's choice. A
 * tap on "Watch ad" asks Google's Ad Placement API (H5 Games Ads, `adBreak({ type: 'reward' })`)
 * for a video; the reward comes only with `adViewed`, never from a dismissed ad or from no ad. The
 * game asks for an ad ahead of time, so the offers show only once one is ready (`beforeReward`).
 * The game's sound is off while the video plays. Switched on by `VITE_REWARDED_ADS=1` in the build
 * (Dockerfile): the account has to be approved for H5 Games Ads first. Without it the game's own
 * placeholder plays, as before. `?adtest` loads Google's test ads (`data-adbreak-test`).
 */
import { inPortal } from '../storage/device';
import type { RewardedOutcome } from '../present/session';

const CLIENT = 'ca-pub-8814590710596560';
const SCRIPT_URL = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;

/** Rewarded ads are Google's (not the portal's, not the placeholder): the normal site and the Play app, built with the switch on. */
export const rewardedAdsLive = !inPortal && import.meta.env.PROD && import.meta.env.VITE_REWARDED_ADS === '1';

interface AdPlacementInfo {
  breakStatus?: string;
}

interface AdBreak {
  type: 'reward';
  name: string;
  beforeAd?: () => void;
  afterAd?: () => void;
  beforeReward?: (showAd: () => void) => void;
  adDismissed?: () => void;
  adViewed?: () => void;
  adBreakDone?: (info: AdPlacementInfo) => void;
}

type AdCommand = AdBreak | { preloadAdBreaks?: 'on' | 'auto'; sound?: 'on' | 'off' };

/** How long a failed ask rests before the game asks again (an ad may be there next time). */
const RETRY_MS = 30_000;

let started = false;
/** The player asked: the ad is on screen, or about to be, and this hears how it went. */
let listener: ((outcome: RewardedOutcome) => void) | null = null;
/** Google has an ad ready: calling it plays it. */
let showAd: (() => void) | null = null;
let asking = false;
let lastAsk = -Infinity;
let quiet: (on: boolean) => void = () => undefined;
const readyListeners = new Set<() => void>();

/** How the game's sound goes quiet while Google's ad plays, and comes back after. */
export function onRewardedAudio(fn: (on: boolean) => void): void {
  quiet = fn;
}

function push(command: AdCommand): void {
  const queue = ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ??= []);
  queue.push(command);
}

export function startAds(): void {
  if (inPortal || !import.meta.env.PROD || document.querySelector('script[src^="https://pagead2.googlesyndication.com/"]')) return;
  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = SCRIPT_URL;
  script.dataset.adClient = CLIENT;
  if (rewardedAdsLive && new URLSearchParams(location.search).has('adtest')) script.dataset.adbreakTest = 'on';
  // An ad blocker or no network: the game runs the same.
  script.onerror = () => script.remove();
  document.head.append(script);
  if (!rewardedAdsLive) return;
  started = true;
  push({ preloadAdBreaks: 'on', sound: 'on' });
  prepare();
}

/** Asks Google for an ad to keep ready; at most one ask at a time and one every `RETRY_MS`. */
function prepare(): void {
  if (!started || asking || showAd || performance.now() - lastAsk < RETRY_MS) return;
  asking = true;
  lastAsk = performance.now();
  const settle = (outcome: RewardedOutcome): void => {
    const heard = listener;
    listener = null;
    heard?.(outcome);
  };
  push({
    type: 'reward',
    name: 'reward',
    beforeReward: (show) => {
      showAd = show;
      readyListeners.forEach((fn) => fn());
    },
    beforeAd: () => quiet(true),
    afterAd: () => quiet(false),
    adViewed: () => settle('watched'),
    adDismissed: () => settle('dismissed'),
    adBreakDone: (info) => {
      asking = false;
      showAd = null;
      quiet(false);
      // Not watched, not dismissed: no ad came. Google says why; frequency capping is "not now".
      settle(info.breakStatus === 'frequencyCapped' ? 'cooldown' : 'unavailable');
      // The next one is asked for right away after an ad, later after a miss.
      if (info.breakStatus === 'viewed' || info.breakStatus === 'dismissed') lastAsk = -Infinity;
      window.setTimeout(prepare, info.breakStatus === 'viewed' || info.breakStatus === 'dismissed' ? 0 : RETRY_MS);
    },
  });
}

/**
 * An ad is ready to play: the offers show only then (Google's advice, and honest to the player).
 * Cheap enough to ask every frame; it also nudges the next ask along.
 */
export function adReady(): boolean {
  if (!rewardedAdsLive) return true;
  if (showAd === null) prepare();
  return showAd !== null;
}

/** Calls `fn` when an ad becomes ready, so a page that waits for one can show its offer. */
export function onAdReady(fn: () => void): () => void {
  readyListeners.add(fn);
  return () => readyListeners.delete(fn);
}

/**
 * Plays the ready ad and says how it went; only `watched` pays. False where Google's ads are not
 * on (the portal's or the placeholder takes over). The answer always comes later, never inside
 * this call.
 */
export function rewardedAdsense(done: (outcome: RewardedOutcome) => void): boolean {
  if (!rewardedAdsLive) return false;
  const play = showAd;
  if (!play || listener) {
    window.setTimeout(() => done('unavailable'), 0);
    return true;
  }
  showAd = null;
  listener = done;
  try {
    play();
  } catch {
    listener = null;
    quiet(false);
    window.setTimeout(() => done('unavailable'), 0);
  }
  return true;
}
