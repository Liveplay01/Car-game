import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LEGAL_DOCS, type LegalDoc, GAME_NAME, missingLegal } from './src/present/legal.ts';

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

/** The default Content-Security-Policy from `nginx.conf`, so `npm run preview` runs under the same rules. */
function contentSecurityPolicy(): Record<string, string> {
  try {
    const conf = readFileSync(join(process.cwd(), 'nginx.conf'), 'utf8');
    const policy = /map \$args \$csp \{\s*default "([^"]+)"/.exec(conf)?.[1];
    return policy ? { 'Content-Security-Policy': policy } : {};
  } catch {
    return {};
  }
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
      // The build time orders the caches, so the one before this build can be told apart.
      const built = Date.now();
      const source = `// Generated at build time (vite.config.ts). Cache-first for the app shell.
const CACHE = 'car-game-${built}-${version}';
const ASSETS = ${JSON.stringify([...new Set(assets)])};
const NAV_TIMEOUT = 3000;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

// Keeps the cache of the version before this one: a tab still running it can load its
// lazy files (PeerJS) that the server no longer has. Anything older goes.
const builtOf = (key) => Number(key.split('-')[2]) || 0;
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        const older = keys.filter((k) => k.startsWith('car-game-') && k !== CACHE).sort((a, b) => builtOf(b) - builtOf(a));
        return Promise.all(older.slice(1).map((k) => caches.delete(k)));
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Navigations: network first so a new deploy shows up, the cached shell when offline or
  // when the network hangs (a weak signal) for more than NAV_TIMEOUT. Only a good game page is
  // kept as the shell; a legal page offline comes from the precache.
  if (request.mode === 'navigate') {
    const shell = url.pathname === '/' || url.pathname === '/index.html';
    const network = fetch(request).then((response) => {
      if (response.ok && shell) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put('/index.html', copy));
      }
      return response;
    });
    event.respondWith((async () => {
      const slow = new Promise((resolve) => setTimeout(resolve, NAV_TIMEOUT, null));
      const first = await Promise.race([network.catch(() => null), slow]);
      if (first && first.ok) return first;
      const cached = (shell ? null : await caches.match(request, { ignoreSearch: true })) || (await caches.match('/index.html'));
      return cached || first || network;
    })());
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

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** One legal page as plain HTML, readable without the game (and without JavaScript). */
function legalPage(doc: LegalDoc): string {
  const e = escapeHtml;
  const body = doc.sections
    .map((section) =>
      [
        section.heading ? `<h2>${e(section.heading)}</h2>` : '',
        ...(section.paragraphs ?? []).map((p) => `<p>${e(p)}</p>`),
        section.list ? `<ul>${section.list.map((item) => `<li>${e(item)}</li>`).join('')}</ul>` : '',
        ...(section.after ?? []).map((p) => `<p>${e(p)}</p>`),
        section.link ? `<p><a href="${e(section.link[1])}" rel="noopener noreferrer">${e(section.link[0])}</a></p>` : '',
      ].join(''),
    )
    .join('\n');
  const others = LEGAL_DOCS.filter((d) => d.id !== doc.id).map((d) => `<a href="/${d.id}.html">${e(d.title)}</a>`);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${e(doc.title)} · ${e(GAME_NAME)}</title>
<meta name="color-scheme" content="dark" />
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
<style>
  :root { --bg: #0b0d10; --primary: #f4f6f9; --muted: #99a2af; --accent: #9ee6cf; --separator: rgba(255, 255, 255, 0.08); }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--primary); font: 16px/1.6 -apple-system, BlinkMacSystemFont, system-ui, 'Segoe UI', Roboto, sans-serif; }
  main { max-width: 680px; margin: 0 auto; padding: 48px 16px 64px; }
  h1 { margin: 0 0 24px; font-size: 36px; line-height: 1.2; }
  h2 { margin: 32px 0 8px; font-size: 20px; line-height: 1.3; }
  p, ul { margin: 0 0 12px; color: var(--muted); }
  ul { padding-left: 20px; }
  li + li { margin-top: 8px; }
  a { color: var(--accent); }
  nav { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--separator); font-size: 14px; }
</style>
</head>
<body>
<main>
<h1>${e(doc.title)}</h1>
${body}
<nav><a href="/">Play ${e(GAME_NAME)}</a>${others.join('')}</nav>
</main>
</body>
</html>
`;
}

/** Writes `/privacy.html` and `/imprint.html` from `src/present/legal.ts`, the same text the game shows. */
function legalPages(): Plugin {
  return {
    name: 'car-game-legal-pages',
    apply: 'build',
    generateBundle() {
      const missing = missingLegal();
      if (missing.length) this.warn(`Legal pages: fill in ${missing.join(', ')} in src/present/legal.ts`);
      for (const doc of LEGAL_DOCS) this.emitFile({ type: 'asset', fileName: `${doc.id}.html`, source: legalPage(doc) });
    },
  };
}

export default defineConfig({
  // The legal pages first: the service worker precaches everything the bundle holds by then.
  plugins: [legalPages(), serviceWorker()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    sourcemap: false,
    // The game is one bundle on purpose (it all runs at once, and gzip keeps it near 180 kB);
    // only PeerJS and the casino load on demand. Warn when it grows well past today's size.
    chunkSizeWarningLimit: 640,
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
    headers: contentSecurityPolicy(),
  },
});
