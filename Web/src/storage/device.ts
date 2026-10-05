/**
 * What the browser promises about the save. Safari clears the storage of a site that is not
 * on the home screen after about a week without a visit; an installed game, or one whose
 * storage is marked persistent, keeps it.
 */

/**
 * Opened by CrazyGames: their embed points at the normal address with `?crazygames` added
 * (`https://…/?crazygames`). Then the game runs inside their page, cannot be installed, and
 * their SDK keeps the save (`ui/crazygames.ts`). Every other visit is the plain browser game.
 */
export const inPortal = typeof location !== 'undefined' && new URLSearchParams(location.search).has('crazygames');

/**
 * Opened from itch.io (Leo, 05.10.2026): the page there is a one-file wrapper (`itch/index.html`)
 * whose iframe points at the normal address with `?itch`. The game, the server and the save work
 * as on the website; what needs a top-level site is left out (ads, service worker, installing).
 */
export const inItch = typeof location !== 'undefined' && new URLSearchParams(location.search).has('itch');

const PLAY_KEY = 'carGame.googlePlay';

/**
 * Started from the Google Play app (Leo, 02.10.2026): a Trusted Web Activity that opens the
 * normal address with `?googleplaystore` in Chrome, full screen. It is the browser game with the
 * same save, offline mode and updates; only what makes no sense in an installed store app is
 * left out (installing, the link to CrazyGames). Chrome names the app as the referrer
 * (`android-app://…`), and this tab remembers it, so a reload without the query stays the app.
 */
export const inPlayStore = ((): boolean => {
  if (typeof location === 'undefined' || inPortal || inItch) return false;
  let found = new URLSearchParams(location.search).has('googleplaystore') || document.referrer.startsWith('android-app://');
  try {
    if (found) sessionStorage.setItem(PLAY_KEY, '1');
    else found = sessionStorage.getItem(PLAY_KEY) === '1';
  } catch {
    /* no storage: the query alone decides */
  }
  return found;
})();

/** iPhone or iPad (iPadOS says it is a Mac, but has touch). */
export const isIos = (): boolean =>
  /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** An iPad: its Share button sits at the top of Safari, not at the bottom. */
export const isIpad = (): boolean => /iPad/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

declare global {
  interface Navigator {
    /** Safari's flag for a game started from the home screen. */
    standalone?: boolean;
  }
}

/** Started from the home screen (or as an installed app on the desktop). */
export const isInstalled = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.matchMedia('(display-mode: fullscreen)').matches ||
  navigator.standalone === true;

/** Whether the storage is already persistent (false when the browser cannot say). */
export async function isStorageKept(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    return false;
  }
}

/**
 * Asks again, on a later visit, where asking never shows a prompt: Chrome and Safari decide
 * by how much the site is used, so a no today can be a yes next week. Firefox asks the
 * player instead, so there the one request at level 3 (`keepStorage`) stays the only one.
 */
export async function renewStorage(): Promise<void> {
  if (/Firefox\//.test(navigator.userAgent)) return;
  await keepStorage();
}

/**
 * Asks the browser to keep the storage. Chrome decides silently, Firefox may ask the player,
 * so this is called once the player has something to lose, never on the first visit.
 */
export async function keepStorage(): Promise<boolean> {
  try {
    if (await isStorageKept()) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
