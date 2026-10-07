/**
 * Umami (self-hosted at analytics.kestrel.nrw) for `game.gustaff.dev`: page views and a few
 * funnel events, with no cookie, no ID and no personal data. Like the ads it loads once the game
 * is on screen, only in the production build on the normal address (also the Google Play app),
 * never on a portal and never when the browser says Do Not Track. The game runs the same without
 * it (offline, blocked). The Privacy Policy (`present/legal.ts`) and the Content-Security-Policy
 * (`nginx.conf`) name the same service.
 */
import { inItch, inPortal } from '../storage/device';

const HOST = 'https://analytics.kestrel.nrw';
const WEBSITE = 'ed1329fe-e263-49b7-bcfa-e27519a8fab1';

type EventData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: { track(event: string, data?: EventData): void };
  }
}

const on = !inPortal && !inItch && import.meta.env.PROD;

export function startAnalytics(): void {
  if (!on || document.querySelector(`script[src^="${HOST}/"]`)) return;
  const script = document.createElement('script');
  script.defer = true;
  script.src = `${HOST}/script.js`;
  script.dataset.websiteId = WEBSITE;
  script.dataset.doNotTrack = 'true';
  script.dataset.domains = location.hostname;
  script.onerror = () => script.remove();
  document.head.append(script);
}

/** A funnel step; dropped while the script is not there. */
export function track(event: string, data?: EventData): void {
  if (on) window.umami?.track(event, data);
}
