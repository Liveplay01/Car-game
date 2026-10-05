import { Hono } from 'hono';
import { ApiError } from '../../errors.ts';
import { readJson } from '../../http.ts';
import type { AppEnv, ServerContext, ServerModule } from '../../module.ts';
import { rateLimit } from '../../rateLimit.ts';
import { maybePlayer, PlayerStore, requirePlayer, type PlayerEnv } from '../players/index.ts';
import { nameKey } from '../players/names.ts';
import { BOARDS, boardById, type BoardDef } from './boards.ts';
import { LEADERBOARD_MIGRATIONS, ScoreStore } from './store.ts';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Leaderboards: one best score per player and board.
 *
 *   GET /v1/boards                     the boards that exist
 *   GET /v1/boards/:board?limit=50     the top list, and "me" when a token is sent
 *   GET /v1/profiles/:name             one player's place on every board (the website's profile page)
 *   PUT /v1/boards/:board/score        submit a score (token required); only a better one counts
 */
export function leaderboardModule(): ServerModule {
  return {
    name: 'leaderboard',
    migrations: LEADERBOARD_MIGRATIONS,
    routes(app, ctx: ServerContext) {
      const scores = new ScoreStore(ctx.db);
      const players = new PlayerStore(ctx.db);
      const guest = maybePlayer(players);

      const describe = (b: BoardDef, day?: number) => ({ id: b.id, title: b.title, period: b.period(ctx.now(), day) });

      app.get('/boards', (c) => c.json({ boards: BOARDS.map(describe) }));

      app.get('/boards/:board', (c) => {
        const board = boardById(c.req.param('board'));
        const day = Number.isInteger(Number(c.req.query('day'))) ? Number(c.req.query('day')) : undefined;
        const period = board.period(ctx.now(), day);
        const asked = Number(c.req.query('limit') ?? DEFAULT_LIMIT);
        const limit = Number.isInteger(asked) ? Math.min(MAX_LIMIT, Math.max(1, asked)) : DEFAULT_LIMIT;
        const me = guest(c);
        const own = me ? scores.of(board.id, period, me.id) : null;
        // A few seconds old is fine for a public list; the player's own line is never cached.
        c.header('Cache-Control', me ? 'private, no-store' : 'public, max-age=10');
        // The same address answers differently with a token: a cache must not mix the two.
        c.header('Vary', 'Authorization');
        return c.json({
          board: describe(board, day),
          entries: scores.top(board.id, period, limit).map((e) => ({ rank: e.rank, name: e.name, title: e.title, score: e.score, meta: e.meta, at: e.achievedAt, me: e.playerId === me?.id })),
          me: own && { rank: own.rank, score: own.score, meta: own.meta },
        });
      });

      // A player's page on the website (/p/NAME): what the boards already show publicly, for one name.
      // Blocked players and unknown names are the same 404, so a block does not show.
      app.get('/profiles/:name', rateLimit<AppEnv>({ max: 120, windowMs: 60_000 }, (c) => c.get('ip'), ctx.now), (c) => {
        const key = nameKey(c.req.param('name'));
        const player = key.length >= 2 ? players.byKey(key) : null;
        if (!player || player.banned) throw new ApiError(404, 'unknown_player', 'There is no player with that name on the leaderboards.');
        const standing = (board: BoardDef) => {
          const entry = scores.of(board.id, board.period(ctx.now()), player.id);
          return entry && { rank: entry.rank, score: entry.score, meta: entry.meta, at: entry.achievedAt };
        };
        c.header('Cache-Control', 'public, max-age=30');
        return c.json({
          player: { name: player.name, title: players.titleOf(player.id) },
          boards: Object.fromEntries(BOARDS.map((b) => [b.id, standing(b)])),
        });
      });

      const submit = new Hono<PlayerEnv>();
      submit.put(
        '/boards/:board/score',
        requirePlayer(players),
        rateLimit<PlayerEnv>({ max: 30, windowMs: 60_000 }, (c) => c.get('player').id, ctx.now),
        async (c) => {
          const board = boardById(c.req.param('board'));
          const { score, meta, day } = board.parse(await readJson(c), ctx.now());
          const player = c.get('player');
          const period = board.period(ctx.now(), day);
          const accepted = scores.submit(board.id, period, player.id, score, meta, ctx.now());
          const best = scores.of(board.id, period, player.id);
          if (!best) throw new ApiError(500, 'internal', 'The score was not saved.');
          // Also an unchanged best counts: whoever hears it (an invite waiting for level 5) looks at the standing, not at news.
          for (const listen of ctx.onScore) listen({ playerId: player.id, board: board.id, score: best.score });
          return c.json({ accepted, best: { rank: best.rank, score: best.score, meta: best.meta } });
        },
      );
      app.route('/', submit);
    },
  };
}

export { ScoreStore };
