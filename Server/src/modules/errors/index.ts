import { createHash, randomUUID } from 'node:crypto';
import type { Db } from '../../db.ts';
import { cleanText, readJson } from '../../http.ts';
import type { AppEnv, ServerContext, ServerModule } from '../../module.ts';
import { rateLimit } from '../../rateLimit.ts';

/**
 * Errors from the field (Leo, 03.11.2026): the game reports an uncaught error in its own code (`ui/errors.ts`), the
 * same one only once per kind, counted. A report holds the error's type, message, stack and the channel (tab, app, play):
 * no address, no player. Kept `ERROR_LIFETIME_MS` after the last time it happened; `/admin` lists them.
 *
 *   POST   /v1/errors {type, message, stack?, channel, build?, env?, state?, trail?}   → 204
 *   GET    /v1/admin/errors                              every kind, most recent first
 *   DELETE /v1/admin/errors/:id                          dismiss one (it comes back if it happens again)
 */

export const ERROR_LIFETIME_MS = 30 * 86_400_000;
export const CHANNELS = ['tab', 'app', 'play'] as const;
const TYPE_MAX = 60;
const MESSAGE_MAX = 500;
const STACK_MAX = 3000;
const BUILD_MAX = 40;
const ENV_MAX = 300;
const STATE_MAX = 200;
const TRAIL_MAX = 15;
const CRUMB_MAX = 30;
const KEPT_MAX = 500;

export const ERROR_MIGRATIONS: readonly string[] = [
  `CREATE TABLE error_reports (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    stack TEXT NOT NULL,
    channel TEXT NOT NULL,
    count INTEGER NOT NULL,
    first_at INTEGER NOT NULL,
    last_at INTEGER NOT NULL
  ) WITHOUT ROWID`,
  'CREATE INDEX error_reports_by_time ON error_reports (last_at)',
  "ALTER TABLE error_reports ADD COLUMN build TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE error_reports ADD COLUMN env TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE error_reports ADD COLUMN state TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE error_reports ADD COLUMN trail TEXT NOT NULL DEFAULT ''",
];

export interface ErrorReport {
  id: string;
  type: string;
  message: string;
  stack: string;
  channel: string;
  /** The last time it happened: the build, the browser and screen, where the game stood, and the last actions. */
  build: string;
  env: string;
  state: string;
  trail: string;
  count: number;
  firstAt: number;
  lastAt: number;
}

export type ErrorContext = Pick<ErrorReport, 'build' | 'env' | 'state' | 'trail'>;

export class ErrorStore {
  private readonly db: Db;
  constructor(db: Db) {
    this.db = db;
  }

  /** A kind of error is its type, message, the first line of its stack and the build: a fix shows as the count stopping. */
  add(type: string, message: string, stack: string, channel: string, context: ErrorContext, now: number): void {
    const key = createHash('sha256').update(`${type}\n${message}\n${stack.split('\n')[1] ?? ''}\n${context.build}`).digest('hex');
    this.db
      .prepare(
        `INSERT INTO error_reports (id, key, type, message, stack, channel, build, env, state, trail, count, first_at, last_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT (key) DO UPDATE SET count = count + 1, last_at = excluded.last_at, channel = excluded.channel, env = excluded.env, state = excluded.state, trail = excluded.trail`,
      )
      .run(randomUUID(), key, type, message, stack, channel, context.build, context.env, context.state, context.trail, now, now);
    this.db.prepare('DELETE FROM error_reports WHERE last_at < ? OR id NOT IN (SELECT id FROM error_reports ORDER BY last_at DESC LIMIT ?)').run(now - ERROR_LIFETIME_MS, KEPT_MAX);
  }

  all(): ErrorReport[] {
    const rows = this.db.prepare('SELECT * FROM error_reports ORDER BY last_at DESC').all() as {
      id: string;
      type: string;
      message: string;
      stack: string;
      channel: string;
      build: string;
      env: string;
      state: string;
      trail: string;
      count: number;
      first_at: number;
      last_at: number;
    }[];
    return rows.map((r) => ({ id: r.id, type: r.type, message: r.message, stack: r.stack, channel: r.channel, build: r.build, env: r.env, state: r.state, trail: r.trail, count: r.count, firstAt: r.first_at, lastAt: r.last_at }));
  }

  delete(id: string): boolean {
    return Number(this.db.prepare('DELETE FROM error_reports WHERE id = ?').run(id).changes) > 0;
  }
}

export function errorsModule(): ServerModule {
  return {
    name: 'errors',
    migrations: ERROR_MIGRATIONS,
    routes(app, ctx: ServerContext) {
      const store = new ErrorStore(ctx.db);
      // Tight: a page in a loop must not fill the list; the game itself sends at most 10 a visit.
      app.post('/errors', rateLimit<AppEnv>({ max: 20, windowMs: 60_000 }, (c) => c.get('ip'), ctx.now), async (c) => {
        const body = await readJson(c);
        const type = cleanText(body.type).slice(0, TYPE_MAX);
        const message = cleanText(body.message).slice(0, MESSAGE_MAX);
        const stack = typeof body.stack === 'string' ? body.stack.slice(0, STACK_MAX) : '';
        const channel = (CHANNELS as readonly unknown[]).includes(body.channel) ? (body.channel as string) : 'tab';
        const context: ErrorContext = {
          build: cleanText(body.build).slice(0, BUILD_MAX),
          env: cleanText(body.env).slice(0, ENV_MAX),
          state: cleanText(body.state).slice(0, STATE_MAX),
          trail: Array.isArray(body.trail) ? body.trail.slice(-TRAIL_MAX).map((x) => cleanText(x).slice(0, CRUMB_MAX)).join(' | ') : '',
        };
        if (type !== '' && message !== '') store.add(type, message, stack, channel, context, ctx.now());
        return c.body(null, 204);
      });
    },
  };
}
