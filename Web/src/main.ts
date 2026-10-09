import { Shell } from './ui/shell';
import { S } from './present/strings';
import { inItch, inPortal } from './storage/device';
import { gameLoaded, startCrazyGames } from './ui/crazygames';
import { startCloud } from './net/cloud';
import { startAds } from './ui/ads';
import { startAnalytics } from './ui/analytics';
import { Casino } from './core/casino';
import { forgetMeasures } from './present/measure';
import { newSave } from './core/career';
import { Elite } from './core/elite';
import { writeSave } from './storage/save';
import { shelfEntries, museumId } from './core/museum';

declare global {
  interface Window {
    __game?: Shell;
  }
}

// The casino draws on real randomness besides the save's seed, so no result can be worked out beforehand.
Casino.useEntropy(() => crypto.getRandomValues(new Uint32Array(1))[0]);

const app = document.getElementById('app')!;
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const layers = document.getElementById('layers')!;
/** Set right before a reload into a new version (sessionStorage: this tab only). */
const UPDATED_KEY = 'carGame.updated';

// The boot screen (index.html) turns into its "did not start" message at once if the start throws.
const boot = document.getElementById('boot');
const bootFailed = (): void => boot?.classList.add('failed');
window.addEventListener('error', bootFailed);
window.addEventListener('unhandledrejection', bootFailed);

// `npm run dev` only: `?demo` replaces this address's save with one to look around in (Level 30, two Shield steps,
// two chests waiting, every vehicle met but no weather or city event yet, so the condition icons show their dot).
// `?demo=night` has met the weather: no forced rain, and the first shift is still the guaranteed first night.
// `&level=12&money=5000000` set the level and the money instead of 30 and 50,000.
// `&elite=300` opens the Elite track (Level 50 unless `level` says otherwise) with that much Elite XP; `&elite=near`
// stops a few XP short of Elite 2, so the next shift climbs a level.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('demo')) {
  const query = new URLSearchParams(location.search);
  const demo = newSave();
  demo.tutorialDone = true;
  demo.shiftsPlayed = 40;
  Object.assign(demo.career, { level: Number(query.get('level') ?? 30), money: Number(query.get('money') ?? 50000), chests: ['premium', 'standard'], upgrades: { shield: 2 } });
  const elite = query.get('elite');
  if (elite !== null) {
    if (!query.has('level')) demo.career.level = 50;
    demo.career.eliteXp = elite === 'near' ? Elite.xpTo(2) - 5 : Number(elite);
    demo.career.eliteClaimed = Elite.level(demo.career);
  }
  const weather = query.get('demo') === 'night' ? shelfEntries(2).filter((e) => e.k === 'weather') : [];
  demo.career.museumSeen = [...shelfEntries(0), ...shelfEntries(1), ...weather].map(museumId);
  writeSave(demo);
  history.replaceState(null, '', location.pathname);
}

// Opened by CrazyGames (`?crazygames`): the save lives in their SDK, which has to be ready
// before the game reads it.
if (inPortal) await startCrazyGames();

// The heading face (Overpass, `ui/shell.css`) is measured and drawn by the canvas: give it a moment to arrive so the
// first frame is laid out with it. Slow or offline-first-visit: the game starts with the stand-in and measures again
// when the font is there (it is bundled, so it does arrive).
document.fonts?.addEventListener('loadingdone', forgetMeasures);
await Promise.race([document.fonts?.load('italic 900 30px "Overpass Variable"'), new Promise((resolve) => window.setTimeout(resolve, 1500))]).catch(() => undefined);

const shell = new Shell(app, canvas, layers);
if (import.meta.env.DEV) window.__game = shell;
gameLoaded();
// The game is on screen: the boot screen fades away, and later errors are the game's own business.
window.removeEventListener('error', bootFailed);
window.removeEventListener('unhandledrejection', bootFailed);
// `npm run dev` only, to look at the boot screen: `?boot=wait` keeps it (its message comes after
// 20 s, as on a start that hangs), `?boot=fail` shows the message at once.
const bootDemo = import.meta.env.DEV ? new URLSearchParams(location.search).get('boot') : null;
if (bootDemo === 'fail') bootFailed();
// Hidden, not removed: should the game stop later, the shell shows it again with a reload (`Shell.stalled`).
if (boot && bootDemo === null) {
  boot.classList.add('gone');
  window.setTimeout(() => (boot.hidden = true), 300);
}
startAds();
startAnalytics();
// Cloud sync, when the player turned it on: newer progress from another device comes over by itself.
startCloud({
  save: () => shell.game.save,
  notify: (text) => shell.game.announce(text),
  canTake: () => shell.canTakeCloud,
  take: (save) => shell.game.takeCloudSave(save),
  ready: () => shell.game.collectLoginIncome(),
});

// Offline and installable: the service worker caches the built app (production only). Not on a portal:
// there the game lives in someone else's page, and the portal ships the updates. Nor on itch.io:
// a service worker in a nested frame is blocked or partitioned, and the wrapper always loads the live game.
if ('serviceWorker' in navigator && import.meta.env.PROD && !inPortal && !inItch) {
  const firstVisit = !navigator.serviceWorker.controller;
  const register = (): void => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // A game left open for days (an installed one in the background) looks for a new
        // version whenever it comes back.
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) registration.update().catch(() => undefined);
        });
      })
      .catch(() => {
        /* no offline mode, the game still runs */
      });
  };
  // After the page has loaded, so the worker's downloads do not slow the start. The wait for the font above can
  // outlast the page's load event, which then never comes again: register at once in that case.
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register);

  // A new version took over while this page runs the old one. The page reloads while nobody
  // looks at it (the tab or app in the background) and only when nothing would be lost; the
  // player comes back to the new version, told once if it brought patch notes.
  if (!firstVisit) {
    let updated = false;
    const reloadIfQuiet = (): void => {
      if (!updated || !document.hidden || !shell.canReload) return;
      try {
        sessionStorage.setItem(UPDATED_KEY, '1');
      } catch {
        /* the notice is only a courtesy */
      }
      location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      updated = true;
      reloadIfQuiet();
    });
    document.addEventListener('visibilitychange', reloadIfQuiet);
  }
}

// Just reloaded into a new version: point at the patch notes when there are new ones.
try {
  if (sessionStorage.getItem(UPDATED_KEY)) {
    sessionStorage.removeItem(UPDATED_KEY);
    if (shell.game.notesUnread) shell.game.announce(S.hints.updated);
  }
} catch {
  /* no session storage */
}
