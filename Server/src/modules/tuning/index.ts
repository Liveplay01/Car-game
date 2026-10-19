import { transaction, type Db } from '../../db.ts';
import { ApiError } from '../../errors.ts';
import type { AppEnv, ServerContext, ServerModule } from '../../module.ts';
import { rateLimit } from '../../rateLimit.ts';

/**
 * Remote tuning (Leo, 19.10.2026): a few values of the game's `config.ts` change here without a new build. The
 * service only keeps numbers by name; which names the game takes, and in what range, the game decides
 * (`Web/src/net/tuning.ts`), so a typo here does nothing.
 *
 *   GET /v1/tuning                    → {values: {easeAfterLosses: 1, …}}
 *   GET /v1/admin/tuning               the same, for the moderator
 *   PUT /v1/admin/tuning  {values}     replaces all of them; {} goes back to the build's values
 */

export const TUNING_MIGRATIONS: readonly string[] = ['CREATE TABLE tuning (key TEXT PRIMARY KEY, value REAL NOT NULL) WITHOUT ROWID'];

export const TUNING_MAX_KEYS = 50;
const KEY = /^[A-Za-z][A-Za-z0-9]{0,39}$/;

export class TuningStore {
  private readonly db: Db;
  constructor(db: Db) {
    this.db = db;
  }

  values(): Record<string, number> {
    const rows = this.db.prepare('SELECT key, value FROM tuning ORDER BY key').all() as { key: string; value: number }[];
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  /** Throws a 422 for anything but up to `TUNING_MAX_KEYS` finite numbers under plain names. */
  replace(values: unknown): Record<string, number> {
    if (typeof values !== 'object' || values === null || Array.isArray(values)) throw new ApiError(422, 'invalid_values', 'values is an object of numbers.');
    const entries = Object.entries(values);
    if (entries.length > TUNING_MAX_KEYS) throw new ApiError(422, 'too_many', `At most ${TUNING_MAX_KEYS} values.`);
    for (const [key, value] of entries) {
      if (!KEY.test(key)) throw new ApiError(422, 'invalid_key', `"${key.slice(0, 40)}" is not a config name.`);
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new ApiError(422, 'invalid_value', `${key} is not a number.`);
    }
    const insert = this.db.prepare('INSERT INTO tuning (key, value) VALUES (?, ?)');
    transaction(this.db, () => {
      this.db.prepare('DELETE FROM tuning').run();
      for (const [key, value] of entries) insert.run(key, value);
    });
    return this.values();
  }
}

export function tuningModule(): ServerModule {
  return {
    name: 'tuning',
    migrations: TUNING_MIGRATIONS,
    routes(app, ctx: ServerContext) {
      const store = new TuningStore(ctx.db);
      app.get('/tuning', rateLimit<AppEnv>({ max: 30, windowMs: 60_000 }, (c) => c.get('ip'), ctx.now), (c) => c.json({ values: store.values() }));
    },
  };
}
