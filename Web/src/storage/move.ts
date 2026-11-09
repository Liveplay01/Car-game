/**
 * The move from `game.gustaff.dev` to `game.timing.love` (Leo, 09.11.2026). A save lives in the `localStorage` of one address, so a
 * plain redirect would start every player over at Level 1. Until the old address redirects at the server, it serves the game, and the
 * game hands itself over: it packs everything it keeps (`carGame.*`) into the fragment of the new address (a fragment never goes
 * to a server), and the new address takes it in before anything is read. The old copy stays where it is.
 */
import { inItch, inPortal } from './device';

export const OLD_HOST = 'game.gustaff.dev';
const NEW_ORIGIN = 'https://game.timing.love';
const PREFIX = 'carGame.';
const MARK = '#move=';
const SAVE_KEY = 'carGame.save.v2';
/** The save and its seal, taken or left together. */
const SAVE_GROUP = [SAVE_KEY, 'carGame.career.v1', 'carGame.save.v2.bak', 'carGame.sealed.v1'];

export type Entries = Record<string, string>;
type Keep = Pick<Storage, 'getItem' | 'setItem'>;

async function through(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

export async function pack(entries: Entries): Promise<string> {
  const bytes = await through(new TextEncoder().encode(JSON.stringify(entries)), new CompressionStream('deflate-raw'));
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export async function unpack(text: string): Promise<Entries> {
  const bytes = Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0));
  const raw: unknown = JSON.parse(new TextDecoder().decode(await through(bytes, new DecompressionStream('deflate-raw'))));
  const entries: Entries = {};
  if (typeof raw === 'object' && raw !== null) {
    for (const [key, value] of Object.entries(raw)) if (key.startsWith(PREFIX) && typeof value === 'string') entries[key] = value;
  }
  return entries;
}

/** How far a stored save has come (prestige, then level); -1 when there is none or it cannot be read. */
function progress(text: string | null): number {
  if (!text) return -1;
  try {
    const career = (JSON.parse(text) as { career?: { level?: unknown; prestige?: unknown } }).career;
    return Number(career?.prestige ?? 0) * 1e5 + Number(career?.level ?? 0);
  } catch {
    return -1;
  }
}

/** Takes in what came over: the save when it has come further than the one here, everything else only where nothing is kept yet. */
export function adopt(moved: Entries, keep: Keep): void {
  const takeSave = progress(moved[SAVE_KEY] ?? null) > progress(keep.getItem(SAVE_KEY));
  for (const [key, value] of Object.entries(moved)) {
    if (SAVE_GROUP.includes(key) ? takeSave : keep.getItem(key) === null) keep.setItem(key, value);
  }
}

/** On the new address: takes in a handed-over save from the address bar and gives the fragment back its own. */
export async function adoptMoved(): Promise<void> {
  if (!location.hash.startsWith(MARK)) return;
  const [data = '', ...rest] = location.hash.slice(MARK.length).split('~');
  try {
    adopt(await unpack(data), localStorage);
  } catch {
    // A link that was cut off or blocked storage brings nothing over; the game starts as it would have.
  }
  history.replaceState(null, '', location.pathname + location.search + (rest.length > 0 ? `#${rest.join('~')}` : ''));
}

/** On the old address: true when this page is on its way to the new one (what the game keeps goes along). */
export async function leaveOldHost(): Promise<boolean> {
  if (location.hostname !== OLD_HOST || inPortal || inItch) return false;
  const mine: Entries = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = key?.startsWith(PREFIX) ? localStorage.getItem(key) : null;
      if (key && value !== null) mine[key] = value;
    }
  } catch {
    // Blocked storage: nothing to carry, the player moves on empty-handed.
  }
  const original = location.hash.slice(1);
  let hash = original && `#${original}`;
  if (Object.keys(mine).length > 0) {
    try {
      hash = MARK + (await pack(mine)) + (original && `~${original}`);
    } catch {
      return false; // Not packable here: better to stay and play on than to leave the progress behind.
    }
  }
  location.replace(NEW_ORIGIN + location.pathname + location.search + hash);
  return true;
}
