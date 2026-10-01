import { randomBytes } from 'node:crypto';

/**
 * Codes people copy, read aloud or type from a screenshot (sync code, friend code).
 * No 0/O/1/I/L, so nothing can be mistaken for something else; 31 letters and digits.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** `length` random characters, no dashes. */
export function randomCode(length: number): string {
  let raw = '';
  // Rejection sampling: no byte above the largest multiple of 31, so no character is favoured.
  while (raw.length < length) {
    for (const byte of randomBytes(length * 2)) if (raw.length < length && byte < 248) raw += ALPHABET[byte % ALPHABET.length];
  }
  return raw;
}

/** What a player may type: any case, spaces or dashes. Null if it cannot be a code of that length. */
export function normalizeCode(text: string, length: number): string | null {
  const raw = text.toUpperCase().replace(/[\s-]+/g, '');
  if (raw.length !== length || [...raw].some((ch) => !ALPHABET.includes(ch))) return null;
  return raw;
}

/** `K7M2-9QXA`: groups of four, easier to read and to type. */
export const displayCode = (raw: string): string => raw.replace(/(.{4})(?=.)/g, '$1-');
