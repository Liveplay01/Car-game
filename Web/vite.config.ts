import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/** The sound effects and music stems, so the game sounds right offline too. */
function audioFiles(): string[] {
  const root = join(process.cwd(), 'public', 'audio');
  const out: string[] = [];
  for (const dir of ['sounds', 'music']) {
    try {
      for (const f of readdirSync(join(root, dir))) if (f.endsWith('.m4a')) out.push(`/audio/${dir}/${f}`);
    } catch {
      /* no audio folder */
    }
  }
  return out.sort();
}

/**
 * Writes `sw.js` after the bundle is known: it precaches every built file, so the game
 * runs offline once loaded, and a new deploy gets a new cache name automatically.
 */
function serviceWorker(): Plugin {
  return {
    name: 'car-game-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map') && f !== 'sw.js');
      const assets = [
        '/',
        '/index.html',
        '/manifest.webmanifest',
        '/icons/icon-192.png',
        '/icons/icon-512.png',
        '/icons/icon-maskable-512.png',
        '/icons/apple-touch-icon.png',
        '/icons/favicon-32.png',
        ...files.filter((f) => f !== 'index.html').map((f) => `/${f}`),
        ...audioFiles(),
      ];
      const version = createHash('sha256').update(assets.join('|')).digest('hex').slice(0, 12);
      const source = `// Generated at build time (vite.config.ts). Cache-first for the app shell.
const CACHE = 'car-game-${version}';
const ASSETS = ${JSON.stringify([...new Set(assets)])};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('car-game-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Navigations: network first so a new deploy shows up, the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }
  event.respondWith(
    caches.match(request).then((hit) => hit || fetch(request).then((response) => {
      if (response.ok && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/audio/'))) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    })),
  );
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  plugins: [serviceWorker()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    sourcemap: false,
  },
  // The game runs on port 5050 everywhere: dev server, preview and the nginx container.
  server: {
    host: true,
    port: 5050,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 5050,
    strictPort: true,
  },
});
