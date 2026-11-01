import { randomUUID } from 'node:crypto';
import type { Db } from '../../db.ts';
import type { AppEnv, ServerContext, ServerModule } from '../../module.ts';
import { rateLimit } from '../../rateLimit.ts';
import { PlayerStore, maybePlayer } from '../players/index.ts';

/**
 * Messages from the team (Leo, 01.11.2026): a heading and a text for all players, for the players
 * of the Play Store app, or for one player (by friend code). The game shows each one at the start
 * with a fixed icon and keeps it until the player taps it away; which ids were dismissed the game
 * remembers itself. A message older than `MESSAGE_LIFETIME_MS` is no longer offered.
 *
 *   GET    /v1/messages?channel=play   → {messages: [{id, title, body}]}   token optional; "channel=play" is sent by the Play app
 *   GET    /v1/admin/messages                                              every message, newest first
 *   POST   /v1/admin/messages {audience: all|play|player, friendCode?, title, body}
 *   DELETE /v1/admin/messages/:id
 */

export const MESSAGE_TITLE_MAX = 60;
export const MESSAGE_BODY_MAX = 600;
export const MESSAGE_LIFETIME_MS = 30 * 86_400_000;
export const MESSAGE_AUDIENCES = ['all', 'play', 'player'] as const;
export type MessageAudience = (typeof MESSAGE_AUDIENCES)[number];

export const MESSAGE_MIGRATIONS: readonly string[] = [
  // A player's own messages go with the player.
  `CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    audience TEXT NOT NULL,
    player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL
  ) WITHOUT ROWID`,
  'CREATE INDEX messages_by_time ON messages (created_at)',
];

export interface AdminMessage {
  id: string;
  audience: MessageAudience;
  title: string;
  body: string;
  createdAt: number;
  player: { name: string; code: string | null } | null;
}

export class MessageStore {
  private readonly db: Db;
  constructor(db: Db) {
    this.db = db;
  }

  add(audience: MessageAudience, playerId: string | null, title: string, body: string, now: number): string {
    const id = randomUUID();
    this.db.prepare('INSERT INTO messages (id, audience, player_id, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, audience, playerId, title, body, now);
    return id;
  }

  /** What this visitor should see, oldest first. */
  forVisitor(playerId: string | null, play: boolean, now: number): { id: string; title: string; body: string }[] {
    return this.db
      .prepare(
        `SELECT id, title, body FROM messages
         WHERE created_at > ? AND (audience = 'all' OR (audience = 'play' AND ?) OR (audience = 'player' AND player_id = ?))
         ORDER BY created_at LIMIT 10`,
      )
      .all(now - MESSAGE_LIFETIME_MS, play ? 1 : 0, playerId) as { id: string; title: string; body: string }[];
  }

  all(): AdminMessage[] {
    const rows = this.db
      .prepare(
        `SELECT m.id, m.audience, m.title, m.body, m.created_at, p.name, c.code
         FROM messages m LEFT JOIN players p ON p.id = m.player_id LEFT JOIN friend_codes c ON c.player_id = m.player_id
         ORDER BY m.created_at DESC LIMIT 100`,
      )
      .all() as { id: string; audience: MessageAudience; title: string; body: string; created_at: number; name: string | null; code: string | null }[];
    return rows.map((r) => ({ id: r.id, audience: r.audience, title: r.title, body: r.body, createdAt: r.created_at, player: r.name === null ? null : { name: r.name, code: r.code } }));
  }

  delete(id: string): boolean {
    return Number(this.db.prepare('DELETE FROM messages WHERE id = ?').run(id).changes) > 0;
  }
}

export function messagesModule(): ServerModule {
  return {
    name: 'messages',
    migrations: MESSAGE_MIGRATIONS,
    routes(app, ctx: ServerContext) {
      const store = new MessageStore(ctx.db);
      const who = maybePlayer(new PlayerStore(ctx.db));
      app.get('/messages', rateLimit<AppEnv>({ max: 30, windowMs: 60_000 }, (c) => c.get('ip'), ctx.now), (c) =>
        c.json({ messages: store.forVisitor(who(c)?.id ?? null, c.req.query('channel') === 'play', ctx.now()) }),
      );
    },
  };
}
