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
}

interface EntryRow {
  rank: number;
  score: number;
  meta: string;
  achieved_at: number;
  player_id: string;
  name: string;
}

const parseMeta = (text: string): Record<string, number> => {
  try {
    return JSON.parse(text) as Record<string, number>;
  } catch {
    return {};
  }
};

/** Blocked players neither show up nor take a rank. */
const RANKED = `
  SELECT s.player_id, p.name, s.score, s.meta, s.achieved_at,
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

  top(board: string, period: string, limit: number): ListedEntry[] {
    const rows = this.db.prepare(`SELECT * FROM (${RANKED}) ORDER BY rank LIMIT ?`).all(board, period, limit) as unknown as EntryRow[];
    return rows.map((r) => ({ rank: r.rank, playerId: r.player_id, name: r.name, score: r.score, meta: parseMeta(r.meta), achievedAt: r.achieved_at }));
  }

  /** The player's own place, even far below the top list. Null without a score. */
  of(board: string, period: string, playerId: string): Entry | null {
    const row = this.db.prepare(`SELECT * FROM (${RANKED}) WHERE player_id = ?`).get(board, period, playerId) as EntryRow | undefined;
    return row ? { rank: row.rank, score: row.score, meta: parseMeta(row.meta), achievedAt: row.achieved_at } : null;
  }

  remove(board: string, playerId: string): boolean {
    return Number(this.db.prepare('DELETE FROM scores WHERE board = ? AND player_id = ?').run(board, playerId).changes) > 0;
  }
}
