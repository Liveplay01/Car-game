/**
 * Google AdSense for `game.gustaff.dev`. The tag loads once the game is on screen, so it never
 * delays the first tap, and only in the production build on the normal address: never on
 * CrazyGames (`?crazygames`, they run their own ads) and never while developing. The consent
 * message for the EEA and the UK is the one published in AdSense (Privacy & messaging); it
 * comes with this tag. The Privacy Policy (`present/legal.ts`) and the Content-Security-Policy
 * (`nginx.conf`) name the same services. Auto ads and where ads may appear are set in AdSense.
 */
import { inPortal } from '../storage/device';

const CLIENT = 'ca-pub-8814590710596560';
const SCRIPT_URL = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;

export function startAds(): void {
  if (inPortal || !import.meta.env.PROD || document.querySelector('script[src^="https://pagead2.googlesyndication.com/"]')) return;
  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = SCRIPT_URL;
  // An ad blocker or no network: the game runs the same.
  script.onerror = () => script.remove();
  document.head.append(script);
}
