import { timingSafeEqual } from 'node:crypto';
import { Hono } from 'hono';
import { ApiError } from '../../errors.ts';
import { readJson } from '../../http.ts';
import type { AppEnv, ServerContext, ServerModule } from '../../module.ts';
import { rateLimit } from '../../rateLimit.ts';
import { checkName } from '../players/names.ts';
import { erasePlayer } from '../players/index.ts';
import { NameTaken, PlayerStore } from '../players/store.ts';
import { boardById } from '../leaderboard/boards.ts';
import { ScoreStore } from '../leaderboard/store.ts';
import { normalizeCode } from '../../codes.ts';
import { FEEDBACK_KINDS, FEEDBACK_STATUSES, FeedbackStore, isRewardItem, REWARD_ITEMS, type FeedbackKind, type FeedbackStatus } from '../feedback/store.ts';
import { IDEA_STATUSES, IdeaStore, PUBLIC_TEXT_MAX, TITLE_MAX, type IdeaStatus } from '../ideas/store.ts';
import { cleanText } from '../../http.ts';
import { TuningStore } from '../tuning/index.ts';
import { ADMIN_PAGE } from './page.ts';

/**
 * Moderation with a shared secret (`ADMIN_TOKEN` in Coolify); without it these routes do not
 * exist. All of it is meant for curl, there is no admin page.
 *
 *   GET    /v1/admin/players?q=text                 find players by name
 *   PATCH  /v1/admin/players/:id  {banned, name}    block or unblock; rename (skips the name filter)
 *   DELETE /v1/admin/players/:id                    remove the player and all of their scores
 *   DELETE /v1/admin/scores/:board/:playerId        remove one score, keep the player
 *   GET    /v1/admin/feedback?kind=bug&status=new   bug reports and ideas, newest first
 *   PATCH  /v1/admin/feedback/:id  {status}          new · seen · done · wontfix
 *   DELETE /v1/admin/feedback/:id                    remove one
 *   GET    /v1/admin/ideas?status=pending          the Club's ideas (players' and "Build with us" ideas), newest first, with the counts
 *   POST   /v1/admin/ideas  {title, text}             write an idea ourselves: open for gifts at once
 *   PATCH  /v1/admin/ideas/:id  {title, text, status}   reword and publish, mark underway (building) or made (built), or turn down (rejected)
 *   DELETE /v1/admin/ideas/:id                      remove one with its gifts
 *   POST   /v1/admin/rewards  {friendCode, item}     give a player a reward (the game picks it up); item "money" takes an `amount`
 *   GET    /v1/admin/tuning                          the remote tuning values (`modules/tuning`)
 *   PUT    /v1/admin/tuning  {values}                replace them all; the game takes them from its next start
 *
 * `/admin` is a small page for all of the feedback part; the token is typed there, never stored on the server.
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
      const feedback = new FeedbackStore(ctx.db);
      const ideas = new IdeaStore(ctx.db);
      const tuning = new TuningStore(ctx.db);

      const admin = new Hono<AppEnv>();
      // Every try counts, right or wrong: the token cannot be guessed at this speed.
      admin.use('*', rateLimit<AppEnv>({ max: 60, windowMs: 60_000 }, (c) => c.get('ip'), ctx.now));
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
        if (!erasePlayer(ctx, players, c.req.param('id'))) throw new ApiError(404, 'not_found', 'No such player.');
        return c.body(null, 204);
      });

      admin.delete('/scores/:board/:playerId', (c) => {
        const board = boardById(c.req.param('board'));
        if (!scores.remove(board.id, c.req.param('playerId'))) throw new ApiError(404, 'not_found', 'No such score.');
        return c.body(null, 204);
      });

      admin.get('/feedback', (c) => {
        const kind = c.req.query('kind') as FeedbackKind | undefined;
        const status = c.req.query('status') as FeedbackStatus | undefined;
        const limit = Math.min(Math.max(Number(c.req.query('limit')) || 200, 1), 1000);
        return c.json({
          counts: feedback.counts(),
          items: feedback.list({ kind: kind && FEEDBACK_KINDS.includes(kind) ? kind : undefined, status: status && FEEDBACK_STATUSES.includes(status) ? status : undefined, limit }),
        });
      });

      admin.patch('/feedback/:id', async (c) => {
        const { status } = await readJson(c);
        if (!FEEDBACK_STATUSES.includes(status as FeedbackStatus)) throw new ApiError(422, 'invalid_status', `Status is one of ${FEEDBACK_STATUSES.join(', ')}.`);
        if (!feedback.setStatus(c.req.param('id'), status as FeedbackStatus)) throw new ApiError(404, 'not_found', 'No such entry.');
        return c.json({ status });
      });

      admin.delete('/feedback/:id', (c) => {
        if (!feedback.delete(c.req.param('id'))) throw new ApiError(404, 'not_found', 'No such entry.');
        return c.body(null, 204);
      });

      admin.get('/ideas', (c) => {
        const status = c.req.query('status') as IdeaStatus | undefined;
        const limit = Math.min(Math.max(Number(c.req.query('limit')) || 200, 1), 1000);
        return c.json({ counts: ideas.counts(), items: ideas.all(status && IDEA_STATUSES.includes(status) ? status : undefined, limit) });
      });

      admin.post('/ideas', async (c) => {
        const body = await readJson(c);
        const title = cleanText(body.title).replace(/\s+/g, ' ');
        const text = cleanText(body.text);
        if (title === '' || title.length > TITLE_MAX) throw new ApiError(422, 'title_invalid', `The title is 1 to ${TITLE_MAX} characters.`);
        if (text === '' || text.length > PUBLIC_TEXT_MAX) throw new ApiError(422, 'text_invalid', `The text is 1 to ${PUBLIC_TEXT_MAX} characters.`);
        const now = ctx.now();
        const id = ideas.add('team', text, null, now);
        // Written by us, so it needs no review: it is open for gifts at once.
        ideas.update(id, { title, text, status: 'open' }, now);
        return c.json({ id }, 201);
      });

      admin.patch('/ideas/:id', async (c) => {
        const body = await readJson(c);
        const status = body.status as IdeaStatus;
        if (!IDEA_STATUSES.includes(status)) throw new ApiError(422, 'invalid_status', `Status is one of ${IDEA_STATUSES.join(', ')}.`);
        // Leo, 22.10.2026: an idea may be made before its goal is reached, but only once it is published.
        const was = ideas.status(c.req.param('id'));
        if ((status === 'building' || status === 'built') && was !== 'open' && was !== 'building' && was !== 'built') throw new ApiError(422, 'not_published', 'Publish the idea before marking it in progress or built.');
        const title = cleanText(body.title).replace(/\s+/g, ' ');
        const text = cleanText(body.text);
        if (title.length > TITLE_MAX) throw new ApiError(422, 'title_too_long', `The title is at most ${TITLE_MAX} characters.`);
        if (text.length > PUBLIC_TEXT_MAX) throw new ApiError(422, 'text_too_long', `The text is at most ${PUBLIC_TEXT_MAX} characters.`);
        if ((status === 'open' || status === 'building' || status === 'built') && (title === '' || text === '')) throw new ApiError(422, 'needs_words', 'An idea in the game needs a title and a text.');
        if (!ideas.update(c.req.param('id'), { title, text, status }, ctx.now())) throw new ApiError(404, 'not_found', 'No such idea.');
        return c.json({ status });
      });

      admin.delete('/ideas/:id', (c) => {
        if (!ideas.delete(c.req.param('id'))) throw new ApiError(404, 'not_found', 'No such idea.');
        return c.body(null, 204);
      });

      admin.post('/rewards', async (c) => {
        const body = await readJson(c);
        const item = body.item === 'money' ? `money:${body.amount}` : body.item;
        if (!isRewardItem(item)) throw new ApiError(422, 'invalid_item', `Item is one of ${REWARD_ITEMS.join(', ')}, or money with an amount from 1 to 999999999.`);
        const code = normalizeCode(String(body.friendCode ?? ''), 8);
        const row = code ? (ctx.db.prepare('SELECT player_id FROM friend_codes WHERE code = ?').get(code) as { player_id: string } | undefined) : undefined;
        const playerId = row?.player_id ?? (typeof body.playerId === 'string' ? body.playerId : '');
        if (!players.byId(playerId)) throw new ApiError(404, 'not_found', 'No player with that friend code.');
        feedback.grant(playerId, item, typeof body.reason === 'string' ? body.reason.slice(0, 80) : 'thank you', ctx.now(), false);
        return c.json({ given: item }, 201);
      });

      admin.get('/tuning', (c) => c.json({ values: tuning.values() }));
      admin.put('/tuning', async (c) => c.json({ values: tuning.replace((await readJson(c)).values) }));

      app.route('/admin', admin);
    },
    pages(app, ctx: ServerContext) {
      if (ctx.config.adminToken === null) return;
      app.get('/admin', (c) => {
        c.header('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
        c.header('X-Robots-Tag', 'noindex');
        return c.html(ADMIN_PAGE);
      });
    },
  };
}
