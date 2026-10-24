/**
 * Reading the clipboard (Leo, 24.10.2026), for codes a friend sent (`net/pasted.ts`). Writing it lives in `share.ts`.
 * A page may read it only with the browser's leave, so there are two ways: quietly, where that leave was given before,
 * and after a tap, where the browser may ask once (Chrome) or show its small Paste bubble (Safari).
 */

export const canPaste = (): boolean => typeof navigator.clipboard?.readText === 'function';

/** The clipboard's text without asking anyone; null when the browser would have to ask, or has nothing. */
export async function peekClipboard(): Promise<string | null> {
  try {
    const leave = await navigator.permissions?.query({ name: 'clipboard-read' as PermissionName });
    return leave?.state === 'granted' ? await navigator.clipboard.readText() : null;
  } catch {
    // Safari and Firefox do not know this permission: they only read after a tap.
    return null;
  }
}

/** The clipboard's text after a tap; null when the player said no or the browser cannot. */
export async function pasteClipboard(): Promise<string | null> {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}
