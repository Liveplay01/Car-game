import { Hono } from 'hono';
import type { Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { getConnInfo } from '@hono/node-server/conninfo';
import type { Config } from './config.ts';
import { migrate, type Db } from './db.ts';
import { ApiError } from './errors.ts';
import type { AppEnv, ServerContext, ServerModule } from './module.ts';
import { adminModule } from './modules/admin/index.ts';
import { challengesModule } from './modules/challenges/index.ts';
import { friendsModule } from './modules/friends/index.ts';
import { leaderboardModule } from './modules/leaderboard/index.ts';
import { playersModule } from './modules/players/index.ts';
import { rtcModule } from './modules/rtc/index.ts';
import { syncModule } from './modules/sync/index.ts';

/**
 * The features of the server, in the order they are set up. A module may use the ones above it
 * (the leaderboard needs players). Add a new feature here.
 */
export const modules = (): ServerModule[] => [playersModule(), leaderboardModule(), friendsModule(), syncModule(), rtcModule(), challengesModule(), adminModule()];

/**
 * Who is calling. Behind Coolify's proxy that is the last address the proxy wrote into
 * X-Forwarded-For (the one it saw itself; earlier ones come from the caller and can be made up).
 */
function clientIp(c: Context, config: Config): string {
  if (config.trustProxy) {
    const forwarded = c.req.header('x-forwarded-for')?.split(',').at(-1)?.trim();
    if (forwarded) return forwarded;
  }
  try {
    return getConnInfo(c).remote.address ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export interface AppOptions {
  db: Db;
  config: Config;
  now?: () => number;
  /** Replace the feature list (tests). */
  modules?: ServerModule[];
}

export function createApp(options: AppOptions): Hono<AppEnv> {
  const ctx: ServerContext = { db: options.db, config: options.config, now: options.now ?? Date.now };
  const list = options.modules ?? modules();
  for (const m of list) migrate(ctx.db, m.name, m.migrations, ctx.now());

  const app = new Hono<AppEnv>();
  const { corsOrigins } = ctx.config;

  app.use(
    '*',
    cors({
      origin: corsOrigins.includes('*') ? '*' : (origin) => (corsOrigins.includes(origin) ? origin : null),
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowHeaders: ['Authorization', 'Content-Type'],
      exposeHeaders: ['Retry-After'],
      maxAge: 86_400,
    }),
  );
  // Small requests everywhere, except the cloud save, which carries a whole save (its route sets its own limit).
  const small = bodyLimit({ maxSize: 8192, onError: () => { throw new ApiError(413, 'too_large', 'The request is too large.'); } });
  app.use('*', (c, next) => (c.req.path === '/v1/sync' ? next() : small(c, next)));
  app.use('*', async (c, next) => {
    c.set('ip', clientIp(c, ctx.config));
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Cache-Control', 'no-store');
    await next();
  });

  app.get('/healthz', (c) => {
    ctx.db.prepare('SELECT 1').get();
    return c.text('ok\n');
  });

  const v1 = new Hono<AppEnv>();
  for (const m of list) m.routes(v1, ctx);
  app.route('/v1', v1);
  for (const m of list) m.pages?.(app, ctx);

  app.notFound((c) => c.json({ error: { code: 'not_found', message: 'There is nothing here.' } }, 404));
  app.onError((error, c) => {
    if (error instanceof ApiError) {
      for (const [name, value] of Object.entries(error.headers)) c.header(name, value);
      return c.json({ error: { code: error.code, message: error.message } }, error.status);
    }
    if (error instanceof HTTPException) return error.getResponse();
    console.error(error);
    return c.json({ error: { code: 'internal', message: 'Something went wrong on our side.' } }, 500);
  });

  return app;
}
