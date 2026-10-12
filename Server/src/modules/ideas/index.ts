import { Hono } from 'hono';
import { ApiError } from '../../errors.ts';
import { cleanText, integerField, readJson } from '../../http.ts';
import type { ServerContext, ServerModule } from '../../module.ts';
import { rateLimit } from '../../rateLimit.ts';
import { DAY_MS } from '../feedback/store.ts';
import { FundStore, MAX_GIFT, MIN_GIFT } from '../fund/index.ts';
import { PlayerStore, maybePlayer, requirePlayer, type PlayerEnv } from '../players/index.ts';
import { IDEAS_MIGRATIONS, IDEA_GOAL, IDEA_MAX_TEXT, IDEA_MIN_TEXT, IdeaStore } from './store.ts';

/**
 * The Club's ideas (Leo, 12.10.2026): players suggest what the game should get, a moderator rewords and
 * publishes it (`/admin` → Club ideas; ideas from "Build with us" wait there too), and the players give
 * money to it, together, until it reaches `IDEA_GOAL`. Then it is made. The gifts are the City Fund's
 * (`fund_gifts`, project `idea:<id>`), so the same limits hold.
 *
 *   GET  /v1/ideas                      the published ideas, with what you gave (with a name)
 *   POST /v1/ideas {text}               suggest one (a name is needed; one a day); it waits for a moderator
 *   POST /v1/ideas/:id/gifts {amount}   give to an open idea; answers how much was accepted
 */
export function ideasModule(): ServerModule {
  return {
    name: 'ideas',
    migrations: IDEAS_MIGRATIONS,
    routes(app, ctx: ServerContext) {
      const ideas = new IdeaStore(ctx.db);
      const fund = new FundStore(ctx.db);
      const players = new PlayerStore(ctx.db);
      const who = maybePlayer(players);
      const view = (playerId: string | null) => ({ ideas: ideas.published(playerId), goal: IDEA_GOAL, minGift: MIN_GIFT, maxGift: MAX_GIFT });

      app.get('/ideas', (c) => c.json(view(who(c)?.id ?? null)));

      const named = new Hono<PlayerEnv>();
      named.use('*', requirePlayer(players));
      named.post('/', rateLimit<PlayerEnv>({ max: 10, windowMs: 60_000 }, (c) => c.get('player').id, ctx.now), async (c) => {
        const me = c.get('player');
        const text = cleanText((await readJson(c)).text);
        if (text.length < IDEA_MIN_TEXT) throw new ApiError(422, 'too_short', `Tell us a little more (at least ${IDEA_MIN_TEXT} characters).`);
        if (text.length > IDEA_MAX_TEXT) throw new ApiError(422, 'too_long', `Keep it under ${IDEA_MAX_TEXT} characters.`);
        const now = ctx.now();
        const last = ideas.lastBy(me.id) ?? 0;
        if (now - last < DAY_MS) {
          const wait = Math.ceil((last + DAY_MS - now) / 1000);
          throw new ApiError(429, 'once_a_day', 'You already sent an idea today. One a day keeps the list readable: come back tomorrow.', { 'Retry-After': String(wait) });
        }
        ideas.add('club', text, me.id, now);
        return c.json({ ok: true }, 201);
      });
      named.post('/:id/gifts', rateLimit<PlayerEnv>({ max: 30, windowMs: 60_000 }, (c) => c.get('player').id, ctx.now), async (c) => {
        const me = c.get('player');
        const id = c.req.param('id');
        const amount = integerField(await readJson(c), 'amount', MIN_GIFT, MAX_GIFT);
        if (ideas.status(id) !== 'open') throw new ApiError(404, 'not_found', 'That idea is not open for gifts.');
        const accepted = fund.giveTo(me.id, `idea:${id}`, IDEA_GOAL, amount, ctx.now());
        if (accepted === 0) {
          const funded = ideas.published(null).some((i) => i.id === id && i.status === 'funded');
          throw funded ? new ApiError(409, 'idea_funded', 'This idea is fully funded. Thank you.') : new ApiError(429, 'daily_limit', 'You have given a lot today. Come back tomorrow.');
        }
        return c.json({ accepted, ...view(me.id) }, 201);
      });
      app.route('/ideas', named);
    },
  };
}
