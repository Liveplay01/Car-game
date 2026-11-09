/**
 * Umami (self-hosted at analytics.kestrel.nrw) for `game.timing.love`: page views and funnel events, with no cookie,
 * no ID and no personal data. The script is the tag in `index.html` with `data-auto-track="false"`, `data-domains` and
 * Do Not Track, so it counts nothing by itself: the visit and every step are sent from here, and only in the
 * production build on the normal address (also the Google Play app), never on a portal. The game runs the same without
 * it (offline, blocked). The Privacy Policy (`present/legal.ts`) and the Content-Security-Policy (`nginx.conf`) name the
 * same service.
 */
import { inItch, inPlayStore, inPortal, isInstalled } from '../storage/device';

type EventData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: { track(): void; track(event: string, data?: EventData): void };
  }
}

const on = !inPortal && !inItch && import.meta.env.PROD;

/** Steps that came before the script did (the visit is counted while the game opens); sent when it is there. */
let waiting: [string, EventData | undefined][] = [];
let started = false;

/** Counts the visit and sends what waited, once the script of `index.html` is there. */
export function startAnalytics(): void {
  if (!on || started) return;
  const tag = document.querySelector<HTMLScriptElement>('script[data-website-id]');
  if (!tag) return;
  const begin = (): void => {
    started = true;
    window.umami?.track();
    for (const [event, data] of waiting) window.umami?.track(event, data);
    waiting = [];
  };
  if (window.umami) begin();
  else {
    tag.addEventListener('load', begin, { once: true });
    tag.addEventListener('error', () => (waiting = []), { once: true });
  }
}

/**
 * A funnel step; kept until the script is there, dropped when it never comes. Every step says its channel (Leo, 16.10.2026):
 * the Play app's closed-test testers play nothing like players, and a step without it could not be told apart.
 */
export function track(event: string, data?: EventData): void {
  if (!on) return;
  const step = { channel: inPlayStore ? 'play' : isInstalled() ? 'app' : 'tab', ...data };
  if (started) window.umami?.track(event, step);
  else if (waiting.length < 50) waiting.push([event, step]);
}

const SEARCH = /(^|\.)(google|bing|duckduckgo|ecosia|yahoo|brave)\./;

/**
 * Where this visit came from, in a few words and never an address: a friend's invite or challenge link, the Play app, the
 * website, a portal, a search, any other site, or nowhere (typed, bookmarked, home screen). `utm_source` of a campaign link
 * comes along as `utm` when it is plain letters and digits.
 */
export function visitSource(): Record<string, string> {
  const query = new URLSearchParams(location.search);
  const utm = query.get('utm_source')?.toLowerCase().match(/^[a-z0-9_-]{1,24}$/)?.[0];
  const from = ((): string => {
    if (query.has('ref')) return 'invite';
    if (location.pathname.startsWith('/k/')) return 'challenge';
    if (inPlayStore) return 'play';
    let host = '';
    try {
      host = document.referrer ? new URL(document.referrer).hostname : '';
    } catch {
      /* an address the browser cannot read: no source */
    }
    if (!host || host === location.hostname) return 'direct';
    if (host.endsWith('timing.love')) return 'site';
    if (host.includes('crazygames')) return 'portal';
    return SEARCH.test(host) ? 'search' : 'other';
  })();
  return utm ? { src: from, utm } : { src: from };
}
