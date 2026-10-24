import { randomUUID } from 'node:crypto';
import type { Db } from '../../db.ts';

/** What an idea needs to be built: the Club's players give this much together. */
export const IDEA_GOAL = 30_000_000;
export const IDEA_MIN_TEXT = 10;
export const IDEA_MAX_TEXT = 500;
export const TITLE_MAX = 60;
export const PUBLIC_TEXT_MAX = 600;

/** pending: waits for a moderator · open: players give · built: made, thank you · rejected: not shown. Funded is an open idea at its goal. */
export const IDEA_STATUSES = ['pending', 'open', 'building', 'built', 'rejected'] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number];
export type IdeaSource = 'club' | 'feedback' | 'team';

export const IDEAS_MIGRATIONS: readonly string[] = [
  // `original` is what the player wrote; `title` and `text` are what the moderator made of it for the game.
  `CREATE TABLE ideas (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    feedback_id TEXT,
    player_id TEXT REFERENCES players(id) ON DELETE SET NULL,
    original TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    text TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    published_at INTEGER
  ) WITHOUT ROWID`,
  'CREATE INDEX ideas_by_status ON ideas (status, published_at)',
  'CREATE INDEX ideas_by_player ON ideas (player_id, source, created_at)',
  // The ideas that came in through "Build with us" before the Club took them: the unread ones join the queue.
  `INSERT INTO ideas (id, source, feedback_id, original, created_at)
   SELECT lower(hex(randomblob(16))), 'feedback', id, text, created_at FROM feedback WHERE kind = 'idea' AND status IN ('new', 'seen')`,
  // Since 24.10.2026 an idea from the website is an idea like any other (no `feedback` row): the address hash that keeps it to one a day lives here, and goes after two days.
  'ALTER TABLE ideas ADD COLUMN ip_hash TEXT',
  'CREATE INDEX ideas_by_ip ON ideas (ip_hash, created_at)',
];

export interface IdeaView {
  id: string;
  title: string;
  text: string;
  /** Funded is an open idea that reached its goal: it waits to be made. */
  status: 'open' | 'funded' | 'building' | 'built';
  goal: number;
  raised: number;
  /** What the asking player gave. */
  mine: number;
  /** Who suggested it in the Club, if they have a name. */
  by: string | null;
  /** When a moderator published it. */
  at: number;
}

export interface IdeaRow {
  id: string;
  source: IdeaSource;
  original: string;
  title: string;
  text: string;
  status: IdeaStatus;
  createdAt: number;
  raised: number;
  player: { name: string; code: string | null } | null;
}

const RAISED = "COALESCE((SELECT SUM(amount) FROM fund_gifts WHERE project = 'idea:' || i.id), 0)";

export class IdeaStore {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  add(source: IdeaSource, original: string, playerId: string | null, now: number, ipHash: string | null = null): string {
    const id = randomUUID();
    this.db.prepare('UPDATE ideas SET ip_hash = NULL WHERE ip_hash IS NOT NULL AND created_at < ?').run(now - 2 * 86_400_000);
    this.db.prepare('INSERT INTO ideas (id, source, player_id, original, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, source, playerId, original, ipHash, now);
    return id;
  }

  /** When this address last sent an idea from the website, or null (one a day). */
  lastFrom(ipHash: string): number | null {
    const row = this.db.prepare("SELECT MAX(created_at) AS at FROM ideas WHERE ip_hash = ? AND source = 'feedback'").get(ipHash) as { at: number | null };
    return row.at;
  }

  /** When this player last suggested one in the Club, or null (one a day). */
  lastBy(playerId: string): number | null {
    const row = this.db.prepare("SELECT MAX(created_at) AS at FROM ideas WHERE player_id = ? AND source = 'club'").get(playerId) as { at: number | null };
    return row.at;
  }

  /** The ideas players see, newest first. */
  published(playerId: string | null): IdeaView[] {
    const rows = this.db
      .prepare(
        `SELECT i.id, i.title, i.text, i.status, i.published_at AS at, p.name AS by, ${RAISED} AS raised,
           COALESCE((SELECT SUM(amount) FROM fund_gifts WHERE project = 'idea:' || i.id AND player_id = ?), 0) AS mine
         FROM ideas i LEFT JOIN players p ON p.id = i.player_id AND p.banned = 0 AND i.source = 'club'
         WHERE i.status IN ('open', 'building', 'built') ORDER BY i.published_at DESC`,
      )
      .all(playerId ?? '') as unknown as { id: string; title: string; text: string; status: 'open' | 'building' | 'built'; at: number; by: string | null; raised: number; mine: number }[];
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      text: r.text,
      status: r.status === 'built' ? 'built' : r.status === 'building' ? 'building' : r.raised >= IDEA_GOAL ? 'funded' : 'open',
      goal: IDEA_GOAL,
      raised: Math.min(r.raised, IDEA_GOAL),
      mine: r.mine,
      by: r.by,
      at: r.at,
    }));
  }

  /** The moderator's list, newest first. */
  all(status: IdeaStatus | undefined, limit: number): IdeaRow[] {
    const rows = this.db
      .prepare(
        `SELECT i.id, i.source, i.original, i.title, i.text, i.status, i.created_at, p.name AS player_name, c.code, ${RAISED} AS raised
         FROM ideas i LEFT JOIN players p ON p.id = i.player_id LEFT JOIN friend_codes c ON c.player_id = i.player_id
         ${status ? 'WHERE i.status = ?' : ''} ORDER BY i.created_at DESC LIMIT ?`,
      )
      .all(...(status ? [status] : []), limit) as unknown as {
      id: string;
      source: IdeaSource;
      original: string;
      title: string;
      text: string;
      status: IdeaStatus;
      created_at: number;
      player_name: string | null;
      code: string | null;
      raised: number;
    }[];
    return rows.map((r) => ({
      id: r.id,
      source: r.source,
      original: r.original,
      title: r.title,
      text: r.text,
      status: r.status,
      createdAt: r.created_at,
      raised: r.raised,
      player: r.player_name === null ? null : { name: r.player_name, code: r.code },
    }));
  }

  counts(): Record<IdeaStatus, number> {
    const out: Record<IdeaStatus, number> = { pending: 0, open: 0, building: 0, built: 0, rejected: 0 };
    const rows = this.db.prepare('SELECT status, COUNT(*) AS n FROM ideas GROUP BY status').all() as unknown as { status: IdeaStatus; n: number }[];
    for (const r of rows) if (r.status in out) out[r.status] = r.n;
    return out;
  }

  status(id: string): IdeaStatus | null {
    const row = this.db.prepare('SELECT status FROM ideas WHERE id = ?').get(id) as { status: IdeaStatus } | undefined;
    return row?.status ?? null;
  }

  /** Rewords and sets the status; the first time it is published it gets its publishing time. */
  update(id: string, fields: { title: string; text: string; status: IdeaStatus }, now: number): boolean {
    const shown = fields.status === 'open' || fields.status === 'building' || fields.status === 'built';
    return (
      Number(
        this.db
          .prepare('UPDATE ideas SET title = ?, text = ?, status = ?, published_at = CASE WHEN ? THEN COALESCE(published_at, ?) ELSE published_at END WHERE id = ?')
          .run(fields.title, fields.text, fields.status, shown ? 1 : 0, now, id).changes,
      ) > 0
    );
  }

  delete(id: string): boolean {
    this.db.prepare('DELETE FROM fund_gifts WHERE project = ?').run(`idea:${id}`);
    return Number(this.db.prepare('DELETE FROM ideas WHERE id = ?').run(id).changes) > 0;
  }
}
