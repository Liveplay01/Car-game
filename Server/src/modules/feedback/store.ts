import { createHash, randomUUID } from 'node:crypto';
import type { Db } from '../../db.ts';

export type FeedbackKind = 'bug' | 'idea';
export const FEEDBACK_KINDS: readonly FeedbackKind[] = ['bug', 'idea'];

export type FeedbackStatus = 'new' | 'seen' | 'done' | 'wontfix';
export const FEEDBACK_STATUSES: readonly FeedbackStatus[] = ['new', 'seen', 'done', 'wontfix'];

/** What the server can hand to a player; the game knows how to pay each one. */
export const REWARD_ITEMS = ['ladybug', 'chest:standard', 'chest:premium', 'chest:event'] as const;
export type RewardItem = (typeof REWARD_ITEMS)[number];
export const isRewardItem = (x: unknown): x is RewardItem => typeof x === 'string' && (REWARD_ITEMS as readonly string[]).includes(x);

/** The skin for a bug report with a friend code (the game: `core/loot.ts`, source `bugReport`). */
export const BUG_HUNTER_SKIN: RewardItem = 'ladybug';

export const FEEDBACK_MIGRATIONS: readonly string[] = [
  // player_id: who sent it, when they gave their friend code. Deleting the player keeps the report, without them.
  `CREATE TABLE feedback (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    text TEXT NOT NULL,
    player_id TEXT REFERENCES players(id) ON DELETE SET NULL,
    ip_hash TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_at INTEGER NOT NULL
  ) WITHOUT ROWID`,
  'CREATE INDEX feedback_by_time ON feedback (created_at)',
  'CREATE INDEX feedback_by_ip ON feedback (ip_hash, kind, created_at)',
  `CREATE TABLE rewards (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    claimed_at INTEGER
  ) WITHOUT ROWID`,
  'CREATE INDEX rewards_by_player ON rewards (player_id, claimed_at)',
];

export interface Feedback {
  id: string;
  kind: FeedbackKind;
  text: string;
  status: FeedbackStatus;
  createdAt: number;
  /** The sender, when they gave a friend code (and still exist). */
  player: { id: string; name: string; code: string | null } | null;
}

interface FeedbackRow {
  id: string;
  kind: FeedbackKind;
  text: string;
  status: FeedbackStatus;
  created_at: number;
  player_id: string | null;
  player_name: string | null;
  code: string | null;
}

/** Only a hash of the address is kept, and only for a day or two (the once-a-day limit). */
export const hashIp = (ip: string): string => createHash('sha256').update(`feedback:${ip}`).digest('hex');

export const DAY_MS = 86_400_000;

export class FeedbackStore {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  /** When this address last sent this kind, or null. */
  lastFrom(ipHash: string, kind: FeedbackKind): number | null {
    const row = this.db.prepare('SELECT MAX(created_at) AS at FROM feedback WHERE ip_hash = ? AND kind = ?').get(ipHash, kind) as { at: number | null };
    return row.at;
  }

  /** When this player last sent this kind, or null (one a day per friend code too). */
  lastBy(playerId: string, kind: FeedbackKind): number | null {
    const row = this.db.prepare('SELECT MAX(created_at) AS at FROM feedback WHERE player_id = ? AND kind = ?').get(playerId, kind) as { at: number | null };
    return row.at;
  }

  add(kind: FeedbackKind, text: string, playerId: string | null, ipHash: string, now: number): string {
    const id = randomUUID();
    // Addresses are forgotten once the limit no longer needs them.
    this.db.prepare('UPDATE feedback SET ip_hash = NULL WHERE ip_hash IS NOT NULL AND created_at < ?').run(now - 2 * DAY_MS);
    this.db.prepare('INSERT INTO feedback (id, kind, text, player_id, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, kind, text, playerId, ipHash, now);
    return id;
  }

  list(filter: { kind?: FeedbackKind; status?: FeedbackStatus; limit: number }): Feedback[] {
    const where: string[] = [];
    const args: (string | number)[] = [];
    if (filter.kind) {
      where.push('f.kind = ?');
      args.push(filter.kind);
    }
    if (filter.status) {
      where.push('f.status = ?');
      args.push(filter.status);
    }
    const rows = this.db
      .prepare(
        `SELECT f.id, f.kind, f.text, f.status, f.created_at, f.player_id, p.name AS player_name, c.code
         FROM feedback f LEFT JOIN players p ON p.id = f.player_id LEFT JOIN friend_codes c ON c.player_id = f.player_id
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY f.created_at DESC LIMIT ?`,
      )
      .all(...args, filter.limit) as unknown as FeedbackRow[];
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      text: r.text,
      status: r.status,
      createdAt: r.created_at,
      player: r.player_id ? { id: r.player_id, name: r.player_name ?? '', code: r.code } : null,
    }));
  }

  counts(): Record<FeedbackKind, { total: number; new: number }> {
    const rows = this.db.prepare("SELECT kind, COUNT(*) AS total, SUM(status = 'new') AS fresh FROM feedback GROUP BY kind").all() as unknown as { kind: FeedbackKind; total: number; fresh: number }[];
    const out: Record<FeedbackKind, { total: number; new: number }> = { bug: { total: 0, new: 0 }, idea: { total: 0, new: 0 } };
    for (const r of rows) if (r.kind in out) out[r.kind] = { total: r.total, new: r.fresh ?? 0 };
    return out;
  }

  setStatus(id: string, status: FeedbackStatus): boolean {
    return Number(this.db.prepare('UPDATE feedback SET status = ? WHERE id = ?').run(status, id).changes) > 0;
  }

  delete(id: string): boolean {
    return Number(this.db.prepare('DELETE FROM feedback WHERE id = ?').run(id).changes) > 0;
  }

  // MARK: Rewards

  /** Gives `item`; `once` skips it when the player already has (or had) it. Returns whether it was given. */
  grant(playerId: string, item: RewardItem, reason: string, now: number, once: boolean): boolean {
    if (once) {
      const had = this.db.prepare('SELECT 1 FROM rewards WHERE player_id = ? AND item = ?').get(playerId, item);
      if (had) return false;
    }
    this.db.prepare('INSERT INTO rewards (id, player_id, item, reason, created_at) VALUES (?, ?, ?, ?, ?)').run(randomUUID(), playerId, item, reason, now);
    return true;
  }

  pending(playerId: string): { id: string; item: RewardItem; reason: string }[] {
    return this.db.prepare('SELECT id, item, reason FROM rewards WHERE player_id = ? AND claimed_at IS NULL ORDER BY created_at').all(playerId) as unknown as { id: string; item: RewardItem; reason: string }[];
  }

  claim(playerId: string, ids: string[], now: number): number {
    let n = 0;
    const stmt = this.db.prepare('UPDATE rewards SET claimed_at = ? WHERE id = ? AND player_id = ? AND claimed_at IS NULL');
    for (const id of ids) n += Number(stmt.run(now, id, playerId).changes);
    return n;
  }
}
