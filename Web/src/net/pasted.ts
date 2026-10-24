/**
 * Codes and links as they sit in the clipboard (Leo, 24.10.2026): what a friend sent in a chat, found again by the game so
 * the player does not have to type it. A code must be the whole text, a link may sit in a sentence; anything else is not
 * ours and stays ignored, so a copied price or address never fills a field.
 */

/** The alphabet of the service's codes (`Server/src/codes.ts`): no 0, O, 1, I, L. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function codeOf(text: string, length: number): string | null {
  const raw = text.trim().toUpperCase().replace(/[\s-]+/g, '');
  return raw.length === length && [...raw].every((ch) => ALPHABET.includes(ch)) ? raw : null;
}

/** `K7M2-9QXA-4TFB`, typed or pasted with any dashes or spaces. */
export const syncCodeIn = (text: string): string | null => codeOf(text, 12);

/**
 * A crew's invite link (`…/k/CODE?by=…`, or the game's `?crew=CODE`) anywhere in the text. With `bare` the 8-letter code on its
 * own counts too: only for a player who asked to paste, since any 8-letter word could pass for one.
 */
export function crewCodeIn(text: string, bare = false): string | null {
  const link = /\/k\/([A-Za-z0-9]{8})(?![A-Za-z0-9])|[?&]crew=([A-Za-z0-9]{8})(?![A-Za-z0-9])/.exec(text);
  const found = link?.[1] ?? link?.[2];
  return found ? codeOf(found, 8) : bare ? codeOf(text, 8) : null;
}

/** A multiplayer room: four digits, or the invite link with `#join=1234`. */
export function joinCodeIn(text: string): string | null {
  const trimmed = text.trim();
  return /^\d{4}$/.test(trimmed) ? trimmed : (/#join=(\d{4})(?!\d)/.exec(trimmed)?.[1] ?? null);
}
