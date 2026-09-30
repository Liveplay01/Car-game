/**
 * What the browser promises about the save. Safari clears the storage of a site that is not
 * on the home screen after about a week without a visit; an installed game, or one whose
 * storage is marked persistent, keeps it.
 */

/** iPhone or iPad (iPadOS says it is a Mac, but has touch). */
export const isIos = (): boolean =>
  /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Started from the home screen (or as an installed app on the desktop). */
export const isInstalled = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.matchMedia('(display-mode: fullscreen)').matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

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
