import { Shell } from './ui/shell';
import { S } from './present/strings';

const app = document.getElementById('app')!;
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const layers = document.getElementById('layers')!;

const shell = new Shell(app, canvas, layers);
if (import.meta.env.DEV) (window as unknown as { __game: Shell }).__game = shell;

// Offline and installable: the service worker caches the built app (production only). The
// first time everything is cached, the game says it now runs without internet.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const firstVisit = !navigator.serviceWorker.controller;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
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
}
