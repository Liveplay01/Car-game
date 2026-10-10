import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Db } from '../../db.ts';

export interface Player {
  id: string;
  name: string;
  banned: boolean;
  createdAt: number;
}

interface PlayerRow {
  id: string;
  name: string;
  banned: number;
  created_at: number;
}

const toPlayer = (row: PlayerRow): Player => ({ id: row.id, name: row.name, banned: row.banned === 1, createdAt: row.created_at });

/**
 * Only the hash of a token is stored here. One exception: a player with Cloud sync has the account (token included) in their
 * cloud copy (`sync_saves.save`, so a new device becomes the same player). A leaked database lets in those players only.
 */
const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

export const PLAYER_MIGRATIONS: readonly string[] = [
  `CREATE TABLE players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_key TEXT NOT NULL UNIQUE,
    token_hash TEXT NOT NULL UNIQUE,
    banned INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    renamed_at INTEGER NOT NULL
  )`,
  // The title the player wears in the game (an id like 'roadVeteran'; the game knows its name), shown next to the name on the boards.
  'ALTER TABLE players ADD COLUMN title TEXT',
];

/** Thrown when another player already has the name (their `name_key` is the same). */
export class NameTaken extends Error {}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && /UNIQUE constraint failed: players\.name_key/.test(error.message);
}

const COLUMNS = 'id, name, banned, created_at';

export class PlayerStore {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  /** Makes a player and their secret token, which is shown once and never stored. */
  create(name: string, key: string, now: number): { player: Player; token: string } {
    const id = randomUUID();
    const token = `rat_${randomBytes(24).toString('base64url')}`;
    try {
      // renamed_at 0: a typo can be fixed right after the name was entered.
      this.db.prepare('INSERT INTO players (id, name, name_key, token_hash, created_at, renamed_at) VALUES (?, ?, ?, ?, ?, 0)').run(id, name, key, hashToken(token), now);
    } catch (error) {
      if (isUniqueViolation(error)) throw new NameTaken();
      throw error;
    }
    return { player: { id, name, banned: false, createdAt: now }, token };
  }

  byToken(token: string): Player | null {
    const row = this.db.prepare(`SELECT ${COLUMNS} FROM players WHERE token_hash = ?`).get(hashToken(token)) as PlayerRow | undefined;
    return row ? toPlayer(row) : null;
  }

  /** The player whose name matches `key` (see `nameKey`: capitals and look-alikes do not count). */
  byKey(key: string): Player | null {
    const row = this.db.prepare(`SELECT ${COLUMNS} FROM players WHERE name_key = ?`).get(key) as PlayerRow | undefined;
    return row ? toPlayer(row) : null;
  }

  byId(id: string): Player | null {
    const row = this.db.prepare(`SELECT ${COLUMNS} FROM players WHERE id = ?`).get(id) as PlayerRow | undefined;
    return row ? toPlayer(row) : null;
  }

  /** When the name was last changed, for the rename limit. */
  renamedAt(id: string): number {
    const row = this.db.prepare('SELECT renamed_at FROM players WHERE id = ?').get(id) as { renamed_at: number } | undefined;
    return row?.renamed_at ?? 0;
  }

  rename(id: string, name: string, key: string, now: number): void {
    try {
      this.db.prepare('UPDATE players SET name = ?, name_key = ?, renamed_at = ? WHERE id = ?').run(name, key, now, id);
    } catch (error) {
      if (isUniqueViolation(error)) throw new NameTaken();
      throw error;
    }
  }

  setTitle(id: string, title: string | null): void {
    this.db.prepare('UPDATE players SET title = ? WHERE id = ?').run(title, id);
  }

  titleOf(id: string): string | null {
    const row = this.db.prepare('SELECT title FROM players WHERE id = ?').get(id) as { title: string | null } | undefined;
    return row?.title ?? null;
  }

  setBanned(id: string, banned: boolean): boolean {
    return Number(this.db.prepare('UPDATE players SET banned = ? WHERE id = ?').run(banned ? 1 : 0, id).changes) > 0;
  }

  /** Removes the player; modules keep their rows in tables that cascade from `players(id)`. */
  delete(id: string): boolean {
    return Number(this.db.prepare('DELETE FROM players WHERE id = ?').run(id).changes) > 0;
  }

  /** Newest first; `text` is part of a name. */
  search(text: string, limit: number): Player[] {
    const like = `%${text.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
    const rows = this.db.prepare(`SELECT ${COLUMNS} FROM players WHERE name LIKE ? ESCAPE '\\' ORDER BY created_at DESC LIMIT ?`).all(like, limit) as unknown as PlayerRow[];
    return rows.map(toPlayer);
  }
}
