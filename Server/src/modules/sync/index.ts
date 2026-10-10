import { createHash } from 'node:crypto';
import { bodyLimit } from 'hono/body-limit';
import type { Context } from 'hono';
import { displayCode, normalizeCode, randomCode } from '../../codes.ts';
import { ApiError } from '../../errors.ts';
import type { AppEnv, ServerContext, ServerModule } from '../../module.ts';
import { rateLimit } from '../../rateLimit.ts';
import type { Db } from '../../db.ts';

/**
 * Cloud save by sync code. No name, no password: the first upload makes a code like
 * `K7M2-9QXA-4TFB`, the device keeps it, and typing it on another device fetches the save there.
 * The code is the secret (about 60 bits, only its hash is stored), so it is read from the
 * `Authorization` header and never from an address.
 *
 *   POST   /v1/sync   {save}                     makes the code        → {code, updatedAt}
 *   GET    /v1/sync?have=<updatedAt>             the stored save       → {save, updatedAt}; only
 *                                                {updatedAt} when it still is `have` (the game asks often)
 *   PUT    /v1/sync   {save, baseUpdatedAt}      stores a newer save   → {updatedAt}, 409 when
 *                                                the cloud changed since `baseUpdatedAt`
 *   DELETE /v1/sync                              removes it
 *
 * The server does not know the game's rules: it keeps the blob as the game wrote it and only
 * checks that it is a JSON object of a sane size. The game checks field by field when it reads.
 */

export const SYNC_MIGRATIONS: readonly string[] = [
  `CREATE TABLE sync_saves (
    code_hash TEXT PRIMARY KEY,
    save TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  ) WITHOUT ROWID`,
  // When the game last asked for or sent the save (Leo, 04.10.2026): a copy nobody has opened for
  // IDLE_SAVE_DAYS is deleted (`purgeIdleSaves`). Copies that exist already start from their last change.
  `ALTER TABLE sync_saves ADD COLUMN last_seen_at INTEGER NOT NULL DEFAULT 0;
   UPDATE sync_saves SET last_seen_at = updated_at;
   CREATE INDEX sync_saves_by_seen ON sync_saves (last_seen_at)`,
];

const DAY_MS = 86_400_000;
/** A cloud copy that has not been opened or changed for this long is deleted (privacy page, Cloud sync). */
export const IDLE_SAVE_DAYS = 200;
/** A game on screen asks every 10 s: the time of the last visit is written at most this often. */
const SEEN_EVERY_MS = 3_600_000;

/** Deletes the copies nobody has used for `IDLE_SAVE_DAYS`. Returns how many went. */
export function purgeIdleSaves(db: Db, now: number): number {
  return Number(db.prepare('DELETE FROM sync_saves WHERE last_seen_at < ?').run(now - IDLE_SAVE_DAYS * DAY_MS).changes);
}

/**
 * A save grows with the career (best times per level, chests, collection): a few KB early on,
 * around 100 KB after a few hundred levels. This leaves room for that and refuses anything silly.
 */
export const MAX_SAVE_BYTES = 512 * 1024;

const CODE_LENGTH = 12;

const hashCode = (raw: string): string => createHash('sha256').update(raw).digest('hex');

/** The JSON text of the `save` field, or a 422. */
function saveText(save: unknown): string {
  if (typeof save !== 'object' || save === null || Array.isArray(save)) throw new ApiError(422, 'invalid_save', 'Send the save as a JSON object.');
  const text = JSON.stringify(save);
  if (text.length > MAX_SAVE_BYTES) throw new ApiError(413, 'too_large', 'The save is too large.');
  return text;
}

class SyncStore {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  create(raw: string, save: string, now: number): void {
    this.db.prepare('INSERT INTO sync_saves (code_hash, save, created_at, updated_at, last_seen_at) VALUES (?, ?, ?, ?, ?)').run(hashCode(raw), save, now, now, now);
  }

  get(raw: string): { save: string; updatedAt: number } | null {
    const row = this.db.prepare('SELECT save, updated_at FROM sync_saves WHERE code_hash = ?').get(hashCode(raw)) as { save: string; updated_at: number } | undefined;
    return row ? { save: row.save, updatedAt: row.updated_at } : null;
  }

  /** Writes only when the cloud still is at `base`; null when someone else wrote in between. */
  update(raw: string, save: string, base: number, now: number): number | null {
    // Strictly newer, so two saves within the same millisecond never share a version.
    const next = Math.max(now, base + 1);
    const changed = Number(this.db.prepare('UPDATE sync_saves SET save = ?, updated_at = ?, last_seen_at = ? WHERE code_hash = ? AND updated_at = ?').run(save, next, next, hashCode(raw), base).changes);
    return changed > 0 ? next : null;
  }

  /** Notes a visit (the game asked for the save), not more than once an hour. */
  seen(raw: string, now: number): void {
    this.db.prepare('UPDATE sync_saves SET last_seen_at = ? WHERE code_hash = ? AND last_seen_at < ?').run(now, hashCode(raw), now - SEEN_EVERY_MS);
  }

  delete(raw: string): boolean {
    return Number(this.db.prepare('DELETE FROM sync_saves WHERE code_hash = ?').run(hashCode(raw)).changes) > 0;
  }
}

export function syncModule(): ServerModule {
  return {
    name: 'sync',
    migrations: SYNC_MIGRATIONS,
    routes(app, ctx: ServerContext) {
      const store = new SyncStore(ctx.db);
      // Every try with a wrong code counts: 60 bits cannot be guessed at this speed. The game looks
      // every 10 s and sends 2 s after a change, and a home network shares one address.
      const perAddress = rateLimit<AppEnv>({ max: 120, windowMs: 60_000 }, (c) => c.get('ip'), ctx.now);
      const creating = rateLimit<AppEnv>({ max: 10, windowMs: 3_600_000 }, (c) => c.get('ip'), ctx.now);
      const big = bodyLimit({ maxSize: MAX_SAVE_BYTES + 1024, onError: () => { throw new ApiError(413, 'too_large', 'The save is too large.'); } });

      const codeOf = (c: Context): string => {
        const match = /^Bearer (.+)$/.exec(c.req.header('authorization') ?? '');
        const raw = match?.[1] ? normalizeCode(match[1], CODE_LENGTH) : null;
        if (!raw) throw new ApiError(401, 'unauthorized', 'That sync code does not look right.');
        return raw;
      };
      const bodyOf = async (c: Context): Promise<Record<string, unknown>> => {
        let json: unknown;
        try {
          json = await c.req.json();
        } catch {
          throw new ApiError(400, 'bad_json', 'Send a JSON body.');
        }
        if (typeof json !== 'object' || json === null || Array.isArray(json)) throw new ApiError(400, 'bad_json', 'Send a JSON object.');
        return json as Record<string, unknown>;
      };
      const unknownCode = () => new ApiError(404, 'unknown_code', 'No save belongs to that code.');

      app.post('/sync', perAddress, creating, big, async (c) => {
        const save = saveText((await bodyOf(c)).save);
        const raw = randomCode(CODE_LENGTH);
        const now = ctx.now();
        store.create(raw, save, now);
        return c.json({ code: displayCode(raw), updatedAt: now }, 201);
      });

      app.get('/sync', perAddress, (c) => {
        const raw = codeOf(c);
        const found = store.get(raw);
        if (!found) throw unknownCode();
        store.seen(raw, ctx.now());
        if (c.req.query('have') === String(found.updatedAt)) return c.json({ updatedAt: found.updatedAt });
        return c.json({ save: JSON.parse(found.save) as unknown, updatedAt: found.updatedAt });
      });

      app.put('/sync', perAddress, big, async (c) => {
        const raw = codeOf(c);
        const body = await bodyOf(c);
        const save = saveText(body.save);
        const base = body.baseUpdatedAt;
        if (typeof base !== 'number' || !Number.isInteger(base)) throw new ApiError(422, 'invalid_save', 'Send "baseUpdatedAt".');
        const found = store.get(raw);
        if (!found) throw unknownCode();
        const updatedAt = store.update(raw, save, base, ctx.now());
        // The cloud moved on (another device saved): the game asks which side to keep.
        if (updatedAt === null) return c.json({ error: { code: 'conflict', message: 'The cloud save changed on another device.' }, updatedAt: found.updatedAt }, 409);
        return c.json({ updatedAt });
      });

      app.delete('/sync', perAddress, (c) => {
        if (!store.delete(codeOf(c))) throw unknownCode();
        return c.body(null, 204);
      });
    },
  };
}
