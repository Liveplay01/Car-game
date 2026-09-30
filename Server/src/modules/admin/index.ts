import { timingSafeEqual } from 'node:crypto';
import { Hono } from 'hono';
import { ApiError } from '../../errors.ts';
import { readJson } from '../../http.ts';
import type { AppEnv, ServerContext, ServerModule } from '../../module.ts';
import { checkName } from '../players/names.ts';
import { NameTaken, PlayerStore } from '../players/store.ts';
import { boardById } from '../leaderboard/boards.ts';
import { ScoreStore } from '../leaderboard/store.ts';

/**
 * Moderation with a shared secret (`ADMIN_TOKEN` in Coolify); without it these routes do not
 * exist. All of it is meant for curl, there is no admin page.
 *
 *   GET    /v1/admin/players?q=text                 find players by name
 *   PATCH  /v1/admin/players/:id  {banned, name}    block or unblock; rename (skips the name filter)
 *   DELETE /v1/admin/players/:id                    remove the player and all of their scores
 *   DELETE /v1/admin/scores/:board/:playerId        remove one score, keep the player
 */
export function adminModule(): ServerModule {
  return {
    name: 'admin',
    migrations: [],
    routes(app, ctx: ServerContext) {
      const secret = ctx.config.adminToken;
      if (secret === null) return;
      const expected = Buffer.from(secret);
      const players = new PlayerStore(ctx.db);
      const scores = new ScoreStore(ctx.db);

      const admin = new Hono<AppEnv>();
      admin.use('*', async (c, next) => {
        const given = Buffer.from(/^Bearer (\S+)$/.exec(c.req.header('authorization') ?? '')?.[1] ?? '');
        if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new ApiError(401, 'unauthorized', 'Wrong admin token.');
        await next();
      });

      admin.get('/players', (c) => c.json({ players: players.search(c.req.query('q') ?? '', 50) }));

      admin.patch('/players/:id', async (c) => {
        const id = c.req.param('id');
        if (!players.byId(id)) throw new ApiError(404, 'not_found', 'No such player.');
        const body = await readJson(c);
        if (typeof body.banned === 'boolean') players.setBanned(id, body.banned);
        if (body.name !== undefined) {
          const checked = checkName(body.name);
          if (!checked.ok && checked.code === 'invalid_name') throw new ApiError(422, checked.code, checked.message);
          // The filter is skipped on purpose: a moderator may need a name the filter would refuse.
          const name = typeof body.name === 'string' ? body.name.normalize('NFKC').replace(/\s+/g, ' ').trim() : '';
          const key = checked.ok ? checked.key : name.toLowerCase().replace(/[^a-z0-9]/g, '');
          try {
            players.rename(id, name, key, ctx.now());
          } catch (error) {
            throw error instanceof NameTaken ? new ApiError(409, 'name_taken', 'That name is taken.') : error;
          }
        }
        return c.json({ player: players.byId(id) });
      });

      admin.delete('/players/:id', (c) => {
        if (!players.delete(c.req.param('id'))) throw new ApiError(404, 'not_found', 'No such player.');
        return c.body(null, 204);
      });

      admin.delete('/scores/:board/:playerId', (c) => {
        const board = boardById(c.req.param('board'));
        if (!scores.remove(board.id, c.req.param('playerId'))) throw new ApiError(404, 'not_found', 'No such score.');
        return c.body(null, 204);
      });

      app.route('/admin', admin);
    },
  };
}
