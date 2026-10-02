import { Hono } from 'hono';
import { ApiError } from '../../errors.ts';
import { readJson } from '../../http.ts';
import type { ServerContext, ServerModule } from '../../module.ts';
import { rateLimit } from '../../rateLimit.ts';
import { maybePlayer, PlayerStore, requirePlayer, type PlayerEnv } from '../players/index.ts';
import { BOARDS, boardById, type BoardDef } from './boards.ts';
import { LEADERBOARD_MIGRATIONS, ScoreStore } from './store.ts';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Leaderboards: one best score per player and board.
 *
 *   GET /v1/boards                     the boards that exist
 *   GET /v1/boards/:board?limit=50     the top list, and "me" when a token is sent
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

      const describe = (b: BoardDef) => ({ id: b.id, title: b.title, period: b.period(ctx.now()) });

      app.get('/boards', (c) => c.json({ boards: BOARDS.map(describe) }));

      app.get('/boards/:board', (c) => {
        const board = boardById(c.req.param('board'));
        const period = board.period(ctx.now());
        const asked = Number(c.req.query('limit') ?? DEFAULT_LIMIT);
        const limit = Number.isInteger(asked) ? Math.min(MAX_LIMIT, Math.max(1, asked)) : DEFAULT_LIMIT;
        const me = guest(c);
        const own = me ? scores.of(board.id, period, me.id) : null;
        // A few seconds old is fine for a public list; the player's own line is never cached.
        c.header('Cache-Control', me ? 'private, no-store' : 'public, max-age=10');
        // The same address answers differently with a token: a cache must not mix the two.
        c.header('Vary', 'Authorization');
        return c.json({
          board: describe(board),
          entries: scores.top(board.id, period, limit).map((e) => ({ rank: e.rank, name: e.name, title: e.title, score: e.score, meta: e.meta, at: e.achievedAt, me: e.playerId === me?.id })),
          me: own && { rank: own.rank, score: own.score, meta: own.meta },
        });
      });

      const submit = new Hono<PlayerEnv>();
      submit.put(
        '/boards/:board/score',
        requirePlayer(players),
        rateLimit<PlayerEnv>({ max: 30, windowMs: 60_000 }, (c) => c.get('player').id, ctx.now),
        async (c) => {
          const board = boardById(c.req.param('board'));
          const { score, meta } = board.parse(await readJson(c));
          const player = c.get('player');
          const period = board.period(ctx.now());
          const accepted = scores.submit(board.id, period, player.id, score, meta, ctx.now());
          const best = scores.of(board.id, period, player.id);
          if (!best) throw new ApiError(500, 'internal', 'The score was not saved.');
          return c.json({ accepted, best: { rank: best.rank, score: best.score, meta: best.meta } });
        },
      );
      app.route('/', submit);
    },
  };
}

export { ScoreStore };
