/**
 * Error reports from the field to our own GlitchTip (Sentry-compatible), for `game.timing.love` only.
 * Off unless the build names `VITE_ERROR_DSN` (`https://<key>@<host>/<project>`). A report holds the
 * message and stack of an uncaught error in the game's own scripts and the channel: no URL (it can
 * carry codes), no name, no save. Nothing is sent when the browser says Do Not Track.
 * The Privacy Policy (`present/legal.ts`) and the Content-Security-Policy (`nginx.conf`) name the host.
 */
import { inItch, inPlayStore, inPortal, isInstalled } from '../storage/device';

const MAX_REPORTS = 10;
const MAX_TEXT = 500;
const MAX_STACK = 2000;

const dsn = typeof import.meta.env.VITE_ERROR_DSN === 'string' ? import.meta.env.VITE_ERROR_DSN.trim() : '';
const on = dsn !== '' && !inPortal && !inItch && import.meta.env.PROD && navigator.doNotTrack !== '1';

const seen = new Set<string>();

function report(type: string, message: string, stack?: string): void {
  const key = `${type}:${message}`;
  if (seen.size >= MAX_REPORTS || seen.has(key)) return;
  seen.add(key);
  const { username, host, pathname } = new URL(dsn);
  const url = `https://${host}/api/${pathname.slice(1)}/store/?sentry_version=7&sentry_key=${username}`;
  const value = message.slice(0, MAX_TEXT);
  const frames = stack ? [{ filename: stack.slice(0, MAX_STACK).replaceAll(location.origin, '') }] : [];
  const body = {
    platform: 'javascript',
    level: 'error',
    timestamp: Date.now() / 1000,
    exception: { values: [{ type, value, stacktrace: { frames } }] },
    tags: { channel: inPlayStore ? 'play' : isInstalled() ? 'app' : 'tab' },
  };
  fetch(url, { method: 'POST', body: JSON.stringify(body), keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => undefined);
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
