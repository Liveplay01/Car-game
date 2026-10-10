import type { Db } from '../../db.ts';

export const LEADERBOARD_MIGRATIONS: readonly string[] = [
  // One best score per player, board and period. The rank tie-break is who got there first.
  `CREATE TABLE scores (
    board TEXT NOT NULL,
    period TEXT NOT NULL,
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    meta TEXT NOT NULL DEFAULT '{}',
    achieved_at INTEGER NOT NULL,
    PRIMARY KEY (board, period, player_id)
  ) WITHOUT ROWID`,
  'CREATE INDEX scores_ranking ON scores (board, period, score DESC, achieved_at ASC)',
];

export interface Entry {
  rank: number;
  score: number;
  meta: Record<string, number>;
  achievedAt: number;
}

export interface ListedEntry extends Entry {
  playerId: string;
  name: string;
  /** The title the player wears, or null. */
  title: string | null;
}

interface EntryRow {
  rank: number;
  score: number;
  meta: string;
  achieved_at: number;
  player_id: string;
  name: string;
  title: string | null;
}

const parseMeta = (text: string): Record<string, number> => {
  try {
    return JSON.parse(text) as Record<string, number>;
  } catch {
    return {};
  }
};

const listed = (r: EntryRow): ListedEntry => ({ rank: r.rank, playerId: r.player_id, name: r.name, title: r.title, score: r.score, meta: parseMeta(r.meta), achievedAt: r.achieved_at });

/** Blocked players neither show up nor take a rank. */
const RANKED = `
  SELECT s.player_id, p.name, p.title, s.score, s.meta, s.achieved_at,
         ROW_NUMBER() OVER (ORDER BY s.score DESC, s.achieved_at ASC, s.player_id ASC) AS rank
  FROM scores s JOIN players p ON p.id = s.player_id
  WHERE s.board = ? AND s.period = ? AND p.banned = 0`;

export class ScoreStore {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  /** Keeps the better of the old and the new score. True when the new one was taken. */
  submit(board: string, period: string, playerId: string, score: number, meta: Record<string, number>, now: number): boolean {
    const result = this.db
      .prepare(
        `INSERT INTO scores (board, period, player_id, score, meta, achieved_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (board, period, player_id) DO UPDATE
           SET score = excluded.score, meta = excluded.meta, achieved_at = excluded.achieved_at
           WHERE excluded.score > scores.score`,
      )
      .run(board, period, playerId, score, JSON.stringify(meta), now);
    return Number(result.changes) > 0;
  }

  /** The best `limit` scores, read in index order and cut off: a big board costs no more than a small one. The rank is the line. */
  top(board: string, period: string, limit: number): ListedEntry[] {
    const rows = this.db
      .prepare(
        `SELECT s.player_id, p.name, p.title, s.score, s.meta, s.achieved_at
         FROM scores s JOIN players p ON p.id = s.player_id
         WHERE s.board = ? AND s.period = ? AND p.banned = 0
         ORDER BY s.score DESC, s.achieved_at ASC, s.player_id ASC LIMIT ?`,
      )
      .all(board, period, limit) as unknown as Omit<EntryRow, 'rank'>[];
    return rows.map((row, i) => listed({ ...row, rank: i + 1 }));
  }

  /** The same ranking among just these players (a friends list); ranks count only them. */
  among(board: string, period: string, playerIds: string[]): ListedEntry[] {
    if (playerIds.length === 0) return [];
    const marks = playerIds.map(() => '?').join(', ');
    const rows = this.db.prepare(`SELECT * FROM (${RANKED} AND s.player_id IN (${marks})) ORDER BY rank`).all(board, period, ...playerIds) as unknown as EntryRow[];
    return rows.map(listed);
  }

  /** The player's own place, even far below the top list. Null without a score. */
  of(board: string, period: string, playerId: string): Entry | null {
    const row = this.db.prepare(`SELECT * FROM (${RANKED}) WHERE player_id = ?`).get(board, period, playerId) as EntryRow | undefined;
    return row ? { rank: row.rank, score: row.score, meta: parseMeta(row.meta), achievedAt: row.achieved_at } : null;
  }

  /** Daily lists before `fromDay` are never asked for again (only today and a day either side are): they go. */
  purgeDaily(fromDay: number): number {
    return Number(this.db.prepare("DELETE FROM scores WHERE board = 'daily' AND CAST(substr(period, 5) AS INTEGER) < ?").run(fromDay).changes);
  }

  remove(board: string, playerId: string): boolean {
    return Number(this.db.prepare('DELETE FROM scores WHERE board = ? AND player_id = ?').run(board, playerId).changes) > 0;
  }
}
