import { serve } from '@hono/node-server';
import { createApp } from './app.ts';
import { readConfig } from './config.ts';
import { openDb } from './db.ts';
import { ScoreStore } from './modules/leaderboard/store.ts';
import { IDLE_SAVE_DAYS, purgeIdleSaves } from './modules/sync/index.ts';

const config = readConfig();
const db = openDb(config.dbPath);
const app = createApp({ db, config });

const server = serve({ fetch: app.fetch, port: config.port, hostname: '0.0.0.0' }, (info) => {
  console.log(`Car Game server on :${info.port} · database ${config.dbPath} · admin routes ${config.adminToken ? 'on' : 'off'} · CORS ${config.corsOrigins.join(', ')}`);
});

const scores = new ScoreStore(db);

/** Cloud copies nobody has opened for IDLE_SAVE_DAYS and daily lists older than two days are deleted: when the server starts, then every six hours. */
function sweep(): void {
  try {
    const now = Date.now();
    const gone = purgeIdleSaves(db, now);
    if (gone > 0) console.log(`Deleted ${gone} cloud save${gone === 1 ? '' : 's'} idle for ${IDLE_SAVE_DAYS} days`);
    scores.purgeDaily(Math.floor(now / 86_400_000) - 2);
  } catch (error) {
    console.error('Cleaning up failed', error);
  }
}
sweep();
const sweeper = setInterval(sweep, 6 * 3_600_000);
sweeper.unref();

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
