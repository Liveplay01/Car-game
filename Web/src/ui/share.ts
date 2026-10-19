import { h } from './dom';
import { openSheet } from './sheets';
import { S } from '../present/strings';

/**
 * Sharing and copying, the same everywhere (crew and invite links, the lobby, a challenge, the codes): the share sheet on
 * a phone, the clipboard elsewhere or when the sheet fails, and where the browser refuses the clipboard too (an embedding
 * frame, an insecure page) a sheet with the text selected, so the player always gets it somehow.
 */
export type Handed = 'shared' | 'copied' | 'shown' | 'cancelled' | 'refused';

const FLASH_MS = 1600;

/** The button says it worked for a moment, then what it said before. */
export function flash(button: HTMLElement, text: string): void {
  const back = button.dataset.back ?? button.textContent ?? '';
  button.dataset.back = back;
  button.textContent = text;
  window.clearTimeout(Number(button.dataset.flash ?? 0));
  button.dataset.flash = String(
    window.setTimeout(() => {
      button.textContent = back;
      delete button.dataset.back;
    }, FLASH_MS),
  );
}

export async function copy(text: string): Promise<'copied' | 'shown'> {
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    showToCopy(text);
    return 'shown';
  }
}

/**
 * `refused`: the browser allows the share sheet only right after a tap and something was awaited first; with `again` the
 * caller asks for one more tap instead of copying.
 */
export async function share(data: { text: string; url: string }, copied = data.url, again = false): Promise<Handed> {
  if (window.matchMedia('(pointer: coarse)').matches && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: S.gameTitle, ...data });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      if (again && error instanceof DOMException && error.name === 'NotAllowedError') return 'refused';
    }
  }
  return copy(copied);
}

function showToCopy(text: string): void {
  const layer = document.getElementById('layers');
  if (!layer) return;
  const field = h('textarea', { class: 'text-input text-area', readonly: true, rows: String(Math.min(4, text.split('\n').length + 1)), 'aria-label': S.friends.copyPrompt }, text);
  const done = h('button', { class: 'btn primary block', type: 'button' }, S.clubPanel.done);
  const close = openSheet(layer, S.friends.copyPrompt, h('div', { class: 'friends-content' }, field, h('div', { class: 'sheet-actions' }, done)));
  done.addEventListener('click', () => close());
  field.focus({ preventScroll: true });
  field.setSelectionRange(0, text.length);
}
