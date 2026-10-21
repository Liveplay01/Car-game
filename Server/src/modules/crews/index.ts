import { Hono } from 'hono';
import { displayCode, normalizeCode } from '../../codes.ts';
import { transaction } from '../../db.ts';
import { ApiError } from '../../errors.ts';
import { integerField, readJson } from '../../http.ts';
import type { AppEnv, ServerContext, ServerModule } from '../../module.ts';
import { escapeHtml, origin, page, PAGE_HEADERS, withHeaders } from '../../pages.ts';
import { rateLimit } from '../../rateLimit.ts';
import { DAY_MS, type RewardItem } from '../feedback/store.ts';
import { FriendStore } from '../friends/index.ts';
import { boardById } from '../leaderboard/boards.ts';
import { ScoreStore } from '../leaderboard/store.ts';
import { checkName } from '../players/names.ts';
import { PlayerStore, requirePlayer, type PlayerEnv } from '../players/index.ts';
import { DEMOTE, LEAGUES, PROMOTE, weekEnd } from './league.ts';
import { CREW_CODE_LENGTH, CREW_MAX, CREW_MIGRATIONS, CrewStore, GIFT_CHESTS_PER_WEEK, GIFT_ITEMS, GIFTS_PER_DAY, GIFT_MONEY_PER_WEEK, RENAME_DAYS, XP_PER_SHIFT, type Crew } from './store.ts';

/**
 * Crews (Leo, 18.10.2026, in place of the friends list): a named group of up to `CREW_MAX` players. Nobody joins by
 * searching: a member copies the crew's invite link (`/k/CODE`, with their friend code, so a new player also counts as
 * their invite) and whoever opens it may join. The founder names the crew, and may rename it once in `RENAME_DAYS`.
 * The crew plays a weekly league (`league.ts`) with the Season XP its members earn, has a weekly goal, and its members
 * give each other gifts out of their own money and chests: to the whole crew (the first to take it keeps it) or to one member.
 *
 *   GET    /v1/crews                     your crew: members, this week's table and goal, the gifts you can take (crew: null without one)
 *   POST   /v1/crews {name}              found a crew
 *   PATCH  /v1/crews {name}              rename it (the founder, once in 30 days)
 *   GET    /v1/crews/preview/:code       a crew's name and size, before joining (no name needed)
 *   POST   /v1/crews/join {code}         join from an invite link
 *   POST   /v1/crews/leave               leave your crew
 *   DELETE /v1/crews/members/:id         the founder takes someone out
 *   GET    /v1/crews/members/:id         a member's profile: places on the boards, title, this week's XP
 *   POST   /v1/crews/xp {xp}             a shift's Season XP for the crew's week
 *   POST   /v1/crews/gifts {item, to}    give the crew (to: null) or one member a gift
 *   POST   /v1/crews/gifts/:id/claim     take a gift: it waits among your rewards
 *   GET    /v1/crews/boards/:board       a board among your crew
 *   GET    /k/:code?by=FRIENDCODE        the page a link preview reads; it sends people on to the game
 */

const CREW_NAME_MIN = 3;
const CREW_NAME_MAX = 20;

/** The boards a profile shows a member's place on. */
const PROFILE_BOARDS = ['shift-level', 'unlimited', 'daily', 'casino'] as const;

function crewName(raw: unknown): string {
  const check = checkName(raw);
  if (!check.ok) throw new ApiError(422, check.code, check.message);
  if (check.name.length < CREW_NAME_MIN || check.name.length > CREW_NAME_MAX) throw new ApiError(422, 'invalid_name', `Use ${CREW_NAME_MIN}–${CREW_NAME_MAX} characters.`);
  return check.name;
}

export function crewsModule(): ServerModule {
  return {
    name: 'crews',
    migrations: CREW_MIGRATIONS,
    routes(app, ctx: ServerContext) {
      const crews = new CrewStore(ctx.db);
      const players = new PlayerStore(ctx.db);
      const friends = new FriendStore(ctx.db);
      const scores = new ScoreStore(ctx.db);
      const byPlayer = (limit: { max: number; windowMs: number }) => rateLimit<PlayerEnv>(limit, (c) => c.get('player').id, ctx.now);

      const mine = (playerId: string): Crew => {
        const crew = crews.of(playerId);
        if (!crew) throw new ApiError(404, 'no_crew', 'You are not in a crew.');
        return crew;
      };

      /** Everything the Crew page shows, in one answer. */
      const view = (playerId: string) => {
        const found = crews.of(playerId);
        if (!found) return { crew: null };
        const now = ctx.now();
        const week = crews.week(found.id, now);
        // Read again: the first look at a new week settles the last one (league, place).
        const crew = crews.byId(found.id) ?? found;
        const xp = crews.memberXp(crew.id, week.week);
        const donations = crews.sentThisWeek(playerId, now);
        const members = crews.members(crew.id).map((m) => ({ ...m, owner: m.id === crew.ownerId, me: m.id === playerId, xp: xp.get(m.id) ?? 0 }));
        const renameAt = crew.renamedAt + RENAME_DAYS * DAY_MS;
        return {
          crew: {
            name: crew.name,
            code: displayCode(crew.code),
            // On the game's own address, so the Play app and an installed web app open it (the page below stays for old links).
            link: ctx.config.gameUrl ? `${ctx.config.gameUrl}/k/${crew.code}?by=${friends.codeOf(playerId)}` : null,
            owner: crew.ownerId === playerId,
            // The founder's first rename is free: the clock starts with it.
            renameAt: crew.renamedAt > 0 && renameAt > now ? renameAt : null,
            max: CREW_MAX,
            members,
            week: { ...week, league: LEAGUES[week.league], endsAt: weekEnd(week.week), promote: PROMOTE, demote: DEMOTE },
            last: crew.last ? { place: crew.last.place, move: crew.last.move, league: LEAGUES[crew.league] } : null,
            gifts: transaction(ctx.db, () => crews.gifts(crew.id, playerId, now)),
          },
          gifting: {
            items: GIFT_ITEMS,
            left: Math.max(0, GIFTS_PER_DAY - crews.sentToday(playerId, now)),
            moneyLeft: Math.max(0, GIFT_MONEY_PER_WEEK - donations.money),
            chestsLeft: Math.max(0, GIFT_CHESTS_PER_WEEK - donations.chests),
          },
        };
      };

      const group = new Hono<PlayerEnv>();
      group.use('*', requirePlayer(players));

      group.get('/', (c) => {
        c.header('Cache-Control', 'private, no-store');
        return c.json(view(c.get('player').id));
      });

      group.post('/', byPlayer({ max: 5, windowMs: 3_600_000 }), async (c) => {
        const me = c.get('player');
        const name = crewName((await readJson(c)).name);
        if (crews.of(me.id)) throw new ApiError(409, 'in_crew', 'You are in a crew already. Leave it first.');
        crews.create(me.id, name, ctx.now());
        return c.json(view(me.id), 201);
      });

      group.patch('/', byPlayer({ max: 10, windowMs: 3_600_000 }), async (c) => {
        const me = c.get('player');
        const crew = mine(me.id);
        if (crew.ownerId !== me.id) throw new ApiError(403, 'not_owner', 'Only the founder can rename the crew.');
        const name = crewName((await readJson(c)).name);
        const now = ctx.now();
        if (crew.renamedAt > 0 && now < crew.renamedAt + RENAME_DAYS * DAY_MS) {
          throw new ApiError(429, 'rename_wait', `A crew can be renamed once in ${RENAME_DAYS} days.`);
        }
        crews.rename(crew.id, name, now);
        return c.json(view(me.id));
      });

      // Guessing codes is the only way to find a crew, so joining is slow on purpose.
      group.post('/join', byPlayer({ max: 10, windowMs: 60_000 }), async (c) => {
        const me = c.get('player');
        const code = normalizeCode(String((await readJson(c)).code ?? ''), CREW_CODE_LENGTH);
        const crew = code ? crews.byCode(code) : null;
        if (!crew) throw new ApiError(404, 'unknown_crew', 'That crew does not exist any more.');
        const current = crews.of(me.id);
        if (current?.id === crew.id) return c.json(view(me.id));
        if (current) throw new ApiError(409, 'in_crew', 'You are in a crew already. Leave it first.');
        if (crews.count(crew.id) >= CREW_MAX) throw new ApiError(422, 'crew_full', `That crew is full (${CREW_MAX} players).`);
        crews.join(me.id, crew.id, ctx.now());
        return c.json(view(me.id), 201);
      });

      group.post('/leave', (c) => {
        crews.leave(c.get('player').id, ctx.now());
        return c.json({ crew: null });
      });

      group.delete('/members/:id', (c) => {
        const me = c.get('player');
        const crew = mine(me.id);
        const id = c.req.param('id');
        if (crew.ownerId !== me.id) throw new ApiError(403, 'not_owner', 'Only the founder can take someone out of the crew.');
        if (id === me.id) throw new ApiError(422, 'own_id', 'Leave the crew instead.');
        if (crews.of(id)?.id === crew.id) crews.leave(id, ctx.now());
        return c.json(view(me.id));
      });

      group.get('/members/:id', (c) => {
        const me = c.get('player');
        const crew = mine(me.id);
        const member = crews.members(crew.id).find((m) => m.id === c.req.param('id'));
        if (!member) throw new ApiError(404, 'not_member', 'That player is not in your crew.');
        const now = ctx.now();
        const week = crews.week(crew.id, now);
        const boards = PROFILE_BOARDS.flatMap((id) => {
          const entry = scores.of(id, boardById(id).period(now), member.id);
          return entry ? [{ board: id, rank: entry.rank, score: entry.score, meta: entry.meta }] : [];
        });
        return c.json({ member: { ...member, owner: member.id === crew.ownerId, me: member.id === me.id, xp: crews.memberXp(crew.id, week.week).get(member.id) ?? 0, boards } });
      });

      group.post('/xp', byPlayer({ max: 30, windowMs: 60_000 }), async (c) => {
        const me = c.get('player');
        const crew = crews.of(me.id);
        const xp = integerField(await readJson(c), 'xp', 1, XP_PER_SHIFT);
        // Not in a crew (any more): nothing to add, and nothing wrong either.
        return c.json({ taken: crew ? crews.addXp(me.id, crew.id, xp, ctx.now()) : 0 });
      });

      group.post('/gifts', byPlayer({ max: 20, windowMs: 60_000 }), async (c) => {
        const me = c.get('player');
        const crew = mine(me.id);
        const body = await readJson(c);
        const item = body.item as RewardItem;
        if (!GIFT_ITEMS.includes(item)) throw new ApiError(422, 'invalid_gift', 'That cannot be given.');
        const to = body.to === null || body.to === undefined ? null : String(body.to);
        if (to !== null && (to === me.id || !crews.members(crew.id).some((m) => m.id === to))) throw new ApiError(422, 'not_member', 'That player is not in your crew.');
        const now = ctx.now();
        transaction(ctx.db, () => {
          if (crews.sentToday(me.id, now) >= GIFTS_PER_DAY) throw new ApiError(429, 'too_many_gifts', `You can give ${GIFTS_PER_DAY} gifts a day.`);
          const sent = crews.sentThisWeek(me.id, now);
          if (item.startsWith('money:') && sent.money + Number(item.slice(6)) > GIFT_MONEY_PER_WEEK) {
            throw new ApiError(429, 'weekly_money_limit', `You can donate at most ${GIFT_MONEY_PER_WEEK.toLocaleString('en')} in money each week.`);
          }
          if (item.startsWith('chest:') && sent.chests >= GIFT_CHESTS_PER_WEEK) {
            throw new ApiError(429, 'weekly_chest_limit', `You can donate at most ${GIFT_CHESTS_PER_WEEK} chests each week.`);
          }
          crews.give(crew.id, me.id, to, item, now);
        });
        return c.json(view(me.id), 201);
      });

      group.post('/gifts/:id/claim', byPlayer({ max: 30, windowMs: 60_000 }), (c) => {
        const me = c.get('player');
        const crew = mine(me.id);
        const item = crews.claim(crew.id, me.id, c.req.param('id'), ctx.now());
        if (!item) throw new ApiError(409, 'gift_gone', 'Someone was quicker: that gift is gone.');
        return c.json({ item, ...view(me.id) });
      });

      group.get('/boards/:board', (c) => {
        const me = c.get('player');
        const crew = mine(me.id);
        const board = boardById(c.req.param('board'));
        const day = Number.isInteger(Number(c.req.query('day'))) ? Number(c.req.query('day')) : undefined;
        const period = board.period(ctx.now(), day);
        const ids = crews.members(crew.id).map((m) => m.id);
        const entries = scores.among(board.id, period, ids).map((e) => ({ rank: e.rank, name: e.name, title: e.title, score: e.score, meta: e.meta, at: e.achievedAt, me: e.playerId === me.id }));
        const own = entries.find((e) => e.me);
        c.header('Cache-Control', 'private, no-store');
        return c.json({ board: { id: board.id, title: board.title, period }, entries, me: own ? { rank: own.rank, score: own.score, meta: own.meta } : null, crew: ids.length });
      });

      // Before joining (and before having a name): which crew the link is for.
      app.get('/crews/preview/:code', rateLimit<AppEnv>({ max: 30, windowMs: 60_000 }, (c) => c.get('ip'), ctx.now), (c) => {
        const code = normalizeCode(c.req.param('code'), CREW_CODE_LENGTH);
        const crew = code ? crews.byCode(code) : null;
        if (!crew) throw new ApiError(404, 'unknown_crew', 'That crew does not exist any more.');
        const count = crews.count(crew.id);
        return c.json({ crew: { name: crew.name, members: count, max: CREW_MAX, full: count >= CREW_MAX, league: LEAGUES[crew.league] } });
      });

      app.route('/crews', group);
    },

    pages(app, ctx: ServerContext) {
      const crews = new CrewStore(ctx.db);
      // Never a dead end: an unknown code still sends people to the game, only without the crew.
      app.get('/k/:code', (c) => {
        const game = ctx.config.gameUrl;
        withHeaders(c, PAGE_HEADERS);
        if (!game) return c.body(page('Roundabout Timing', '<meta name="robots" content="noindex">', '<p>This crew link is not set up.</p>'), 404);
        const code = normalizeCode(c.req.param('code'), CREW_CODE_LENGTH);
        const crew = code ? crews.byCode(code) : null;
        const by = normalizeCode(c.req.query('by') ?? '', 8);
        const query = [crew && code ? `crew=${code}` : null, by ? `ref=${by}` : null].filter(Boolean).join('&');
        const target = `${game}/${query ? `?${query}` : ''}`;
        const title = crew ? `Join the crew ${crew.name} in Roundabout Timing` : 'Roundabout Timing';
        const description = 'One tap sends a car into the roundabout. Play the weekly league together and send each other gifts.';
        const self = origin(c, ctx);
        const head = [
          `<meta name="description" content="${escapeHtml(description)}">`,
          '<meta property="og:type" content="website">',
          '<meta property="og:site_name" content="Roundabout Timing">',
          `<meta property="og:title" content="${escapeHtml(title)}">`,
          `<meta property="og:description" content="${escapeHtml(description)}">`,
          `<meta property="og:url" content="${escapeHtml(`${self}/k/${code ?? ''}`)}">`,
          `<meta property="og:image" content="${escapeHtml(`${game}/og-image.jpg`)}">`,
          '<meta property="og:image:width" content="1200">',
          '<meta property="og:image:height" content="630">',
          '<meta name="twitter:card" content="summary_large_image">',
          '<meta name="robots" content="noindex">',
          `<meta http-equiv="refresh" content="0; url=${escapeHtml(target)}">`,
        ].join('\n');
        return c.body(page(title, head, `<p>${escapeHtml(title)}</p><p><a href="${escapeHtml(target)}">Play Roundabout Timing</a></p>`), 200);
      });
    },
  };
}
