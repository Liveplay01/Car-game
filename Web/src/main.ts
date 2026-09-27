import './ui/styles.css';
import { App } from './ui/app';

const app = document.getElementById('app')!;
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const tapZone = document.getElementById('tap-zone')!;
const layers = document.getElementById('layers')!;

const game = new App(app, canvas, tapZone, layers);
if (import.meta.env.DEV) (window as unknown as { __game: App }).__game = game;

// Offline and installable: the service worker caches the built app (production only).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* no offline mode, the game still runs */
    });
  });
}
