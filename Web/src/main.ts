import { Shell } from './ui/shell';
import { S } from './present/strings';
import { inPortal } from './storage/device';
import { gameLoaded, startCrazyGames } from './ui/crazygames';
import { startCloud } from './net/cloud';

const app = document.getElementById('app')!;
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const layers = document.getElementById('layers')!;
/** Set right before a reload into a new version (sessionStorage: this tab only). */
const UPDATED_KEY = 'carGame.updated';

// Opened by CrazyGames (`?crazygames`): the save lives in their SDK, which has to be ready
// before the game reads it.
if (inPortal) await startCrazyGames();

const shell = new Shell(app, canvas, layers);
if (import.meta.env.DEV) (window as unknown as { __game: Shell }).__game = shell;
gameLoaded();
// Cloud sync, when the player turned it on: looks once whether another device moved on.
startCloud({ save: () => shell.game.save, notify: (text) => shell.game.announce(text) });

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
