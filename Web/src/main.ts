import { Shell } from './ui/shell';

const app = document.getElementById('app')!;
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const layers = document.getElementById('layers')!;

const shell = new Shell(app, canvas, layers);
if (import.meta.env.DEV) (window as unknown as { __game: Shell }).__game = shell;

// Offline and installable: the service worker caches the built app (production only).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* no offline mode, the game still runs */
    });
  });
}
