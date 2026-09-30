import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type Db = DatabaseSync;

/** Opens the database (creating its folder) with the settings a small web service wants. */
export function openDb(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = NORMAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');
  return db;
}

/** Runs `work` in one transaction: all of it happens, or none. */
export function transaction<T>(db: Db, work: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/**
 * Every module brings its own list of migrations; entry n is version n + 1. Applied ones are
 * remembered per module, so modules can be added later without touching the others. Never edit
 * a migration that has shipped: add a new entry to the end.
 */
export function migrate(db: Db, module: string, migrations: readonly string[], now: number): void {
  db.exec('CREATE TABLE IF NOT EXISTS migrations (module TEXT NOT NULL, version INTEGER NOT NULL, applied_at INTEGER NOT NULL, PRIMARY KEY (module, version))');
  const row = db.prepare('SELECT COALESCE(MAX(version), 0) AS v FROM migrations WHERE module = ?').get(module) as { v: number };
  for (let version = row.v + 1; version <= migrations.length; version++) {
    transaction(db, () => {
      db.exec(migrations[version - 1]!);
      db.prepare('INSERT INTO migrations (module, version, applied_at) VALUES (?, ?, ?)').run(module, version, now);
    });
  }
}
