import { fold, isOffensive } from './profanity.ts';

export const NAME_MIN = 3;
export const NAME_MAX = 16;

/** Names nobody but us should carry. Compared by `nameKey`. */
const RESERVED = ['admin', 'administrator', 'moderator', 'mod', 'support', 'system', 'staff', 'official', 'roundabout', 'roundabouttiming', 'cargame', 'server', 'null', 'undefined', 'anonymous', 'guest'];

export type NameCheck = { ok: true; name: string; key: string } | { ok: false; code: 'invalid_name' | 'name_not_allowed'; message: string };

/**
 * What makes two names "the same": accents, capitals, separators and look-alikes (l ↔ 1) do
 * not count, so nobody can pose as someone else with "Le0" or "LEO_".
 */
export function nameKey(name: string): string {
  return fold(name).replace(/[^a-z0-9]/g, '');
}

/** Cleans a name the player typed and says whether it may go on a public list. */
export function checkName(raw: unknown): NameCheck {
  if (typeof raw !== 'string') return { ok: false, code: 'invalid_name', message: 'Pick a name.' };
  // Wide and compatibility letters become plain ones first ("Ａ" → "A"), then spaces are tidied.
  const name = raw.normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (name.length < NAME_MIN || name.length > NAME_MAX) return { ok: false, code: 'invalid_name', message: `Use ${NAME_MIN}–${NAME_MAX} characters.` };
  // Latin letters (with accents), digits, space, underscore, hyphen: no look-alike scripts, no emoji, no links.
  if (!/^[\p{Script=Latin}0-9 _-]+$/u.test(name)) return { ok: false, code: 'invalid_name', message: 'Use letters, numbers, spaces, _ and - only.' };
  const key = nameKey(name);
  if (key.length < 2) return { ok: false, code: 'invalid_name', message: 'Use at least two letters or numbers.' };
  if (RESERVED.includes(key) || isOffensive(name)) return { ok: false, code: 'name_not_allowed', message: 'That name is not allowed. Try another one.' };
  return { ok: true, name, key };
}
