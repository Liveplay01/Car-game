/**
 * The multiplayer profile: the name friends see, kept on this device like the save
 * (`carGame.player.v1`), and a token per tab that lets a dropped player take their seat back.
 */
import { storage } from './store';

export const NAME_KEY = 'carGame.player.v1';
const TOKEN_KEY = 'carGame.seat.v1';

export function loadPlayerName(): string {
  try {
    const raw = storage().getItem(NAME_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw) as { name?: unknown };
    return typeof parsed.name === 'string' ? parsed.name : '';
  } catch {
    return '';
  }
}

export function savePlayerName(name: string): void {
  try {
    storage().setItem(NAME_KEY, JSON.stringify({ name }));
  } catch {
    /* private mode: the name lasts this visit */
  }
}

let fallbackToken = '';

/** Random, per tab: two tabs on one device are two players. */
export function seatToken(): string {
  const make = (): string => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');
  try {
    let token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      token = make();
      sessionStorage.setItem(TOKEN_KEY, token);
    }
    return token;
  } catch {
    fallbackToken ||= make();
    return fallbackToken;
  }
}
