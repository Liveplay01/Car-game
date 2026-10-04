import { Hono } from 'hono';
import { displayCode, normalizeCode, randomCode } from '../../codes.ts';
import type { Db } from '../../db.ts';
import { ApiError } from '../../errors.ts';
import { readJson } from '../../http.ts';
import type { ServerContext, ServerModule } from '../../module.ts';
import { rateLimit } from '../../rateLimit.ts';
import { boardById } from '../leaderboard/boards.ts';
import { ScoreStore } from '../leaderboard/store.ts';
import { PlayerStore, requirePlayer, type PlayerEnv } from '../players/index.ts';

/**
 * Friends: every player has a friend code (`K7M2-9QXA`). Typing a friend's code adds them to
 * your list; the friends board ranks you and your list on a leaderboard. Adding is one-way
 * and needs no answer: the scores are on the public boards anyway, the code only saves the
 * search. Removing a friend only changes your own list.
 *
 *   GET    /v1/friends                    your code and your list
 *   POST   /v1/friends {code}             add a friend by their code
 *   DELETE /v1/friends/:id                take a friend off your list
 *   GET    /v1/friends/boards/:board      the board among you and your friends
 */

export const FRIENDS_MIGRATIONS: readonly string[] = [
  `CREATE TABLE friend_codes (
    player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE
  ) WITHOUT ROWID`,
  `CREATE TABLE friends (
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    friend_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    added_at INTEGER NOT NULL,
    PRIMARY KEY (player_id, friend_id)
  ) WITHOUT ROWID`,
  'CREATE INDEX friends_by_friend ON friends (friend_id)',
];

const CODE_LENGTH = 8;
export const MAX_FRIENDS = 100;

export class FriendStore {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  /** The player's friend code, made on first use. */
  codeOf(playerId: string): string {
    for (;;) {
      const known = this.db.prepare('SELECT code FROM friend_codes WHERE player_id = ?').get(playerId) as { code: string } | undefined;
      if (known) return known.code;
      // A clash with someone else's code is astronomically rare; then the loop draws again.
      this.db.prepare('INSERT OR IGNORE INTO friend_codes (player_id, code) VALUES (?, ?)').run(playerId, randomCode(CODE_LENGTH));
    }
  }

  playerOfCode(code: string): { id: string; name: string } | null {
    const row = this.db.prepare('SELECT p.id, p.name FROM friend_codes f JOIN players p ON p.id = f.player_id WHERE f.code = ? AND p.banned = 0').get(code) as { id: string; name: string } | undefined;
    return row ?? null;
  }

  list(playerId: string): { id: string; name: string }[] {
    return this.db
      .prepare('SELECT p.id, p.name FROM friends f JOIN players p ON p.id = f.friend_id WHERE f.player_id = ? AND p.banned = 0 ORDER BY f.added_at ASC, p.name ASC')
      .all(playerId) as unknown as { id: string; name: string }[];
  }

  /** False when they already were on the list. */
  add(playerId: string, friendId: string, now: number): boolean {
    return Number(this.db.prepare('INSERT OR IGNORE INTO friends (player_id, friend_id, added_at) VALUES (?, ?, ?)').run(playerId, friendId, now).changes) > 0;
  }

  remove(playerId: string, friendId: string): boolean {
    return Number(this.db.prepare('DELETE FROM friends WHERE player_id = ? AND friend_id = ?').run(playerId, friendId).changes) > 0;
  }
}

export function friendsModule(): ServerModule {
  return {
    name: 'friends',
    migrations: FRIENDS_MIGRATIONS,
    routes(app, ctx: ServerContext) {
      const friends = new FriendStore(ctx.db);
      const scores = new ScoreStore(ctx.db);
      const players = new PlayerStore(ctx.db);

      const group = new Hono<PlayerEnv>();
      group.use('*', requirePlayer(players));

      group.get('/', (c) => {
        const me = c.get('player');
        return c.json({ code: displayCode(friends.codeOf(me.id)), friends: friends.list(me.id) });
      });

      // Guessing codes is the only way to abuse this, so adding is slow on purpose.
      group.post('/', rateLimit<PlayerEnv>({ max: 20, windowMs: 60_000 }, (c) => c.get('player').id, ctx.now), async (c) => {
        const me = c.get('player');
        const code = normalizeCode(String((await readJson(c)).code ?? ''), CODE_LENGTH);
        if (!code) throw new ApiError(422, 'invalid_code', 'That friend code does not look right. It has 8 letters and numbers, like K7M2-9QXA.');
        const friend = friends.playerOfCode(code);
        if (!friend) throw new ApiError(404, 'unknown_code', 'Nobody has that friend code.');
        if (friend.id === me.id) throw new ApiError(422, 'own_code', 'That is your own code. Send it to a friend instead.');
        const list = friends.list(me.id);
        if (list.length >= MAX_FRIENDS && !list.some((f) => f.id === friend.id)) {
          throw new ApiError(422, 'too_many_friends', `Your list is full (${MAX_FRIENDS} friends). Remove someone first.`);
        }
        friends.add(me.id, friend.id, ctx.now());
        return c.json({ friend }, 201);
      });

      group.delete('/:id', (c) => {
        friends.remove(c.get('player').id, c.req.param('id'));
        return c.body(null, 204);
      });

      group.get('/boards/:board', (c) => {
        const me = c.get('player');
        const board = boardById(c.req.param('board'));
        const period = board.period(ctx.now());
        const ids = [me.id, ...friends.list(me.id).map((f) => f.id)];
        const entries = scores.among(board.id, period, ids).map((e) => ({ rank: e.rank, name: e.name, title: e.title, score: e.score, meta: e.meta, at: e.achievedAt, me: e.playerId === me.id }));
        const own = entries.find((e) => e.me);
        c.header('Cache-Control', 'private, no-store');
        return c.json({ board: { id: board.id, title: board.title, period }, entries, me: own ? { rank: own.rank, score: own.score, meta: own.meta } : null, friends: ids.length - 1 });
      });

      app.route('/friends', group);
    },
  };
}
