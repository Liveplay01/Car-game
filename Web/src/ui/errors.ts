/**
 * Error reports from the field to our own service (`Server/`, `modules/errors`, listed in its `/admin`), for
 * `game.timing.love` only and only where the build has the service (`VITE_API_URL`). A report holds the type,
 * message and stack of an uncaught error in the game's own scripts and the channel: no URL (it can carry codes),
 * no name, no save. Nothing is sent when the browser says Do Not Track. The Privacy Policy (`present/legal.ts`) says so.
 */
import { apiRequest, leaderboardEnabled } from '../net/leaderboard';
import { inItch, inPlayStore, inPortal, isInstalled } from '../storage/device';

const MAX_REPORTS = 10;
const MAX_TEXT = 500;
const MAX_STACK = 2000;

const on = leaderboardEnabled && !inPortal && !inItch && import.meta.env.PROD && navigator.doNotTrack !== '1';

const seen = new Set<string>();

function report(type: string, message: string, stack?: string): void {
  const key = `${type}:${message}`;
  if (seen.size >= MAX_REPORTS || seen.has(key)) return;
  seen.add(key);
  const body = {
    type,
    message: message.slice(0, MAX_TEXT),
    stack: stack?.slice(0, MAX_STACK).replaceAll(location.origin, ''),
    channel: inPlayStore ? 'play' : isInstalled() ? 'app' : 'tab',
  };
  apiRequest('POST', '/v1/errors', { body, keepalive: true }).catch(() => undefined);
}

export function startErrorReports(): void {
  if (!on) return;
  window.addEventListener('error', (e) => {
    if (e.filename && !e.filename.startsWith(location.origin)) return;
    const err = e.error instanceof Error ? e.error : undefined;
    report(err?.name ?? 'Error', e.message, err?.stack);
  });
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason instanceof DOMException) return;
    if (e.reason instanceof Error) report(e.reason.name, e.reason.message, e.reason.stack);
    else report('UnhandledRejection', String(e.reason));
  });
}
