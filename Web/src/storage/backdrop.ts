/**
 * Big Screen (Leo, 01.10.2026): the picture or video the player put behind the roundabout,
 * `carGame.backdrop.v1`. An uploaded picture (a data URL, already made smaller) or a link.
 * Kept apart from the save on purpose: a picture is hundreds of kilobytes, which would bloat
 * every export and the CrazyGames cloud save. So it stays in this browser's `localStorage`
 * only, even on a portal, and is never sent anywhere.
 */
export type Backdrop = { k: 'upload'; src: string } | { k: 'link'; url: string };

export const BACKDROP_KEY = 'carGame.backdrop.v1';

export function loadBackdrop(): Backdrop | null {
  try {
    const raw = localStorage.getItem(BACKDROP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { k?: unknown; src?: unknown; url?: unknown };
    if (parsed.k === 'upload' && typeof parsed.src === 'string' && parsed.src.startsWith('data:image/')) return { k: 'upload', src: parsed.src };
    if (parsed.k === 'link' && typeof parsed.url === 'string') return { k: 'link', url: parsed.url };
    return null;
  } catch {
    return null;
  }
}

/** False when the browser would not keep it (full or blocked storage): it then lasts this visit. */
export function saveBackdrop(backdrop: Backdrop | null): boolean {
  try {
    if (backdrop) localStorage.setItem(BACKDROP_KEY, JSON.stringify(backdrop));
    else localStorage.removeItem(BACKDROP_KEY);
    return true;
  } catch {
    return false;
  }
}
