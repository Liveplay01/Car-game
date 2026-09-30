import { Hono } from 'hono';
import type { Context, MiddlewareHandler } from 'hono';
import { ApiError } from '../../errors.ts';
import { readJson } from '../../http.ts';
import type { AppEnv, ServerContext, ServerModule } from '../../module.ts';
import { rateLimit } from '../../rateLimit.ts';
import { checkName } from './names.ts';
import { NameTaken, PLAYER_MIGRATIONS, PlayerStore, type Player } from './store.ts';

/**
 * Players: anonymous accounts. A player picks a name and gets a secret token that the game keeps
 * in the browser; there is no e-mail and no password. Every feature that belongs to a person
 * (scores, later maybe friends or cloud saves) hangs off `players.id`.
 */

export type PlayerEnv = { Variables: AppEnv['Variables'] & { player: Player } };

const RENAME_EVERY_MS = 10_000;

function bearer(c: Context): string | null {
  const match = /^Bearer (\S+)$/.exec(c.req.header('authorization') ?? '');
  return match?.[1] ?? null;
}

/** The player behind the token, for routes that need one (401 without, 403 when blocked). */
export function requirePlayer(store: PlayerStore): MiddlewareHandler<PlayerEnv> {
  return async (c, next) => {
    const token = bearer(c);
    const player = token ? store.byToken(token) : null;
    if (!player) throw new ApiError(401, 'unauthorized', 'This device has no name on the leaderboard yet.');
    if (player.banned) throw new ApiError(403, 'banned', 'This player has been blocked.');
    c.set('player', player);
    await next();
  };
}

/** The player behind the token if there is a valid one; routes that also work for guests. */
export function maybePlayer(store: PlayerStore): (c: Context) => Player | null {
  return (c) => {
    const token = bearer(c);
    const player = token ? store.byToken(token) : null;
    return player && !player.banned ? player : null;
  };
}

const publicPlayer = (p: { id: string; name: string }) => ({ id: p.id, name: p.name });

const nameTaken = () => new ApiError(409, 'name_taken', 'Someone already uses that name. Try another one.');

export function playersModule(): ServerModule {
  return {
    name: 'players',
    migrations: PLAYER_MIGRATIONS,
    routes(app, ctx: ServerContext) {
      const store = new PlayerStore(ctx.db);

      // New accounts per address: a school or a household shares one, so this is generous.
      app.post('/players', rateLimit<AppEnv>({ max: 20, windowMs: 3_600_000 }, (c) => c.get('ip'), ctx.now), async (c) => {
        const checked = checkName((await readJson(c)).name);
        if (!checked.ok) throw new ApiError(422, checked.code, checked.message);
        try {
          const { player, token } = store.create(checked.name, checked.key, ctx.now());
          return c.json({ player: publicPlayer(player), token }, 201);
        } catch (error) {
          throw error instanceof NameTaken ? nameTaken() : error;
        }
      });

      const me = new Hono<PlayerEnv>();
      me.use('*', requirePlayer(store));
      me.get('/', (c) => c.json({ player: publicPlayer(c.get('player')) }));

      me.patch('/', async (c) => {
        const player = c.get('player');
        const wait = RENAME_EVERY_MS - (ctx.now() - store.renamedAt(player.id));
        if (wait > 0) throw new ApiError(429, 'rate_limited', 'You changed your name a moment ago. Wait a little.', { 'Retry-After': String(Math.ceil(wait / 1000)) });
        const checked = checkName((await readJson(c)).name);
        if (!checked.ok) throw new ApiError(422, checked.code, checked.message);
        try {
          store.rename(player.id, checked.name, checked.key, ctx.now());
        } catch (error) {
          throw error instanceof NameTaken ? nameTaken() : error;
        }
        return c.json({ player: publicPlayer({ id: player.id, name: checked.name }) });
      });

      // Right to erasure: the player and everything that hangs off them is gone.
      me.delete('/', (c) => {
        store.delete(c.get('player').id);
        return c.body(null, 204);
      });

      app.route('/me', me);
    },
  };
}

export { PlayerStore };
