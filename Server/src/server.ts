import { serve } from '@hono/node-server';
import { createApp } from './app.ts';
import { readConfig } from './config.ts';
import { openDb } from './db.ts';

const config = readConfig();
const db = openDb(config.dbPath);
const app = createApp({ db, config });

const server = serve({ fetch: app.fetch, port: config.port, hostname: '0.0.0.0' }, (info) => {
  console.log(`Car Game server on :${info.port} · database ${config.dbPath} · admin routes ${config.adminToken ? 'on' : 'off'} · CORS ${config.corsOrigins.join(', ')}`);
});

/** Coolify stops the container with SIGTERM when it redeploys: finish what is running, close the database. */
function stop(): void {
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
