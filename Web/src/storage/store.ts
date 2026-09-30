/**
 * Where the save and the player name live. In the browser that is `localStorage`; a portal
 * build (CrazyGames) swaps in the portal's cloud storage before the game starts, so a player
 * who logs in there keeps their progress on every device. Both speak the same small API.
 */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

let store: KeyValueStore | null = null;

/** The active store. Reading `localStorage` can throw (blocked storage): callers catch. */
export const storage = (): KeyValueStore => store ?? localStorage;

/**
 * Switches to another store before the first read. Keys the new store does not have yet are
 * copied over from this browser's `localStorage` once, so nobody starts again from level 1.
 */
export function useStore(next: KeyValueStore, carryOver: readonly string[]): void {
  for (const key of carryOver) {
    try {
      const local = localStorage.getItem(key);
      if (local !== null && next.getItem(key) === null) next.setItem(key, local);
    } catch {
      /* nothing to carry over */
    }
  }
  store = next;
}
