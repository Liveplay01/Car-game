/**
 * Error reports from the field to our own service (`Server/`, `modules/errors`, listed in its `/admin`), for
 * `game.timing.love` only and only where the build has the service (`VITE_API_URL`). A report holds the type,
 * message and stack of an uncaught error in the game's own scripts, the channel, the build, the browser and screen
 * size, where the game stood (screen, mode, level) and the kinds of the last few actions (`crumb`): no URL (it can
 * carry codes), no name, no save. Nothing is sent when the browser says Do Not Track. The Privacy Policy (`present/legal.ts`) says so.
 */
import { apiRequest, leaderboardEnabled } from '../net/leaderboard';
import { inItch, inPlayStore, inPortal, isInstalled } from '../storage/device';

const MAX_REPORTS = 10;
const MAX_TEXT = 500;
const MAX_STACK = 3000;
const MAX_TRAIL = 15;

const on = leaderboardEnabled && !inPortal && !inItch && import.meta.env.PROD && navigator.doNotTrack !== '1';

const seen = new Set<string>();
const trail: string[] = [];
let stateOf: () => string = () => '';

declare const __BUILD__: string;

/** The last few things the player did, by kind only, to read beside a stack. */
export function crumb(what: string): void {
  trail.push(what.slice(0, 30));
  if (trail.length > MAX_TRAIL) trail.shift();
}

/** Where the game stands right now, as one short line (screen, mode, level), asked only when an error is sent. */
export function reportState(read: () => string): void {
  stateOf = read;
}

function report(type: string, message: string, stack?: string): void {
  const key = `${type}:${message}`;
  if (seen.size >= MAX_REPORTS || seen.has(key)) return;
  seen.add(key);
  const body = {
    type,
    message: message.slice(0, MAX_TEXT),
    stack: stack?.slice(0, MAX_STACK).replaceAll(location.origin, ''),
    channel: inPlayStore ? 'play' : isInstalled() ? 'app' : 'tab',
    build: __BUILD__,
    env: `${navigator.userAgent} · ${innerWidth}×${innerHeight}@${devicePixelRatio} · ${navigator.language}`,
    state: safeState(),
    trail: [...trail],
  };
  apiRequest('POST', '/v1/errors', { body, keepalive: true }).catch(() => undefined);
}

function safeState(): string {
  try {
    return stateOf();
  } catch (e) {
    return `state failed: ${e instanceof Error ? e.message : 'unknown'}`;
  }
}

export function startErrorReports(): void {
  if (!on) return;
  window.addEventListener('error', (e) => {
    if (e.message.startsWith('ResizeObserver loop')) return;
    if (e.filename && !e.filename.startsWith(location.origin)) return;
    const err = e.error instanceof Error ? e.error : undefined;
    // A foreign script's error (Umami, an extension) reaches us stripped to "Script error." with no file and no stack: nothing to act on.
    if (!e.filename && !err) return;
    report(err?.name ?? 'Error', e.message, err?.stack ?? `at ${e.filename.replace(location.origin, '')}:${e.lineno}:${e.colno}`);
  });
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason instanceof DOMException) return;
    if (e.reason instanceof Error) report(e.reason.name, e.reason.message, e.reason.stack);
    else report('UnhandledRejection', String(e.reason));
  });
}
