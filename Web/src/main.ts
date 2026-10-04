import { Shell } from './ui/shell';
import { S } from './present/strings';
import { inPortal } from './storage/device';
import { gameLoaded, startCrazyGames } from './ui/crazygames';
import { startCloud } from './net/cloud';
import { startAds } from './ui/ads';
import { Casino } from './core/casino';

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

// Opened by CrazyGames (`?crazygames`): the save lives in their SDK, which has to be ready
// before the game reads it.
if (inPortal) await startCrazyGames();

const shell = new Shell(app, canvas, layers);
if (import.meta.env.DEV) (window as unknown as { __game: Shell }).__game = shell;
gameLoaded();
// The game is on screen: the boot screen fades away, and later errors are the game's own business.
window.removeEventListener('error', bootFailed);
window.removeEventListener('unhandledrejection', bootFailed);
// `npm run dev` only, to look at the boot screen: `?boot=wait` keeps it (its message comes after
// 20 s, as on a start that hangs), `?boot=fail` shows the message at once.
const bootDemo = import.meta.env.DEV ? new URLSearchParams(location.search).get('boot') : null;
if (bootDemo === 'fail') bootFailed();
if (boot && bootDemo === null) {
  boot.classList.add('gone');
  window.setTimeout(() => boot.remove(), 300);
}
startAds();
// Cloud sync, when the player turned it on: newer progress from another device comes over by itself.
startCloud({
  save: () => shell.game.save,
  notify: (text) => shell.game.announce(text),
  canTake: () => shell.canTakeCloud,
  take: (save) => shell.game.takeCloudSave(save),
  ready: () => shell.game.collectLoginIncome(),
});

// Offline and installable: the service worker caches the built app (production only). The
// first time everything is cached, the game says it now runs without internet. Not on a portal:
// there the game lives in someone else's page, and the portal ships the updates.
if ('serviceWorker' in navigator && import.meta.env.PROD && !inPortal) {
  const firstVisit = !navigator.serviceWorker.controller;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // A game left open for days (an installed one in the background) looks for a new
        // version whenever it comes back.
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) registration.update().catch(() => undefined);
        });
        const worker = registration.installing;
        if (!firstVisit || !worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated') shell.game.announce(S.hints.offline);
        });
      })
      .catch(() => {
        /* no offline mode, the game still runs */
      });
  });

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
