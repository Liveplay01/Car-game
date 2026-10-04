import { Hono } from 'hono';
import { displayCode, normalizeCode } from '../../codes.ts';
import { transaction, type Db } from '../../db.ts';
import { ApiError } from '../../errors.ts';
import { readJson } from '../../http.ts';
import type { ScoreEvent, ServerContext, ServerModule } from '../../module.ts';
import { escapeHtml, origin, page, PAGE_HEADERS, withHeaders } from '../../pages.ts';
import { rateLimit } from '../../rateLimit.ts';
import { DAY_MS, FeedbackStore, type RewardItem } from '../feedback/store.ts';
import { FriendStore } from '../friends/index.ts';
import { PlayerStore, requirePlayer, type PlayerEnv } from '../players/index.ts';

/**
 * Invite a friend (Leo, 04.10.2026): the friend code is the invite. A friend who opens
 * `…/i/K7M29QXA` lands in the game with the code, and the game hands it in once they have a
 * name. When that friend reaches level 5 (the Shift level the leaderboard already knows), both
 * get a Standard Chest; the inviter gets a Premium Chest on top for the 3rd and the 10th friend.
 * The rewards are the ones the game already picks up (`/v1/me/rewards`, feedback module).
 *
 *   GET  /v1/me/referral          your code and link, who you invited and how far they are, who invited you
 *   POST /v1/me/referral {code}   a new player hands in the code they came with (once)
 *   GET  /i/:code                 the page a link preview reads; it sends people on to the game
 *
 * Plausibility only, like the boards: a level is believed once the leaderboard has it; the
 * limits that matter are one invite per player, new accounts only (14 days), no loops, and at
 * most 25 rewarded friends per inviter. Someone who makes accounts for themselves wins a few chests, no more.
 */

/** The Shift level a friend must reach (`core/config.ts` has the level the game counts; this is the number on the board). */
export const INVITE_LEVEL = 5;
/** What both get at that level. */
export const INVITE_REWARD: RewardItem = 'chest:standard';
/** What the inviter gets on top for their nth friend. */
export const INVITE_MILESTONES: readonly { invites: number; item: RewardItem }[] = [
  { invites: 3, item: 'chest:premium' },
  { invites: 10, item: 'chest:premium' },
];
/** Beyond this many friends an inviter gets no more rewards (the friend still does). */
export const MAX_REWARDED_INVITES = 25;
/** Invites are for new players: an account older than this cannot take one. */
export const NEW_PLAYER_DAYS = 14;

const CODE_LENGTH = 8;

export const REFERRAL_MIGRATIONS: readonly string[] = [
  // One row per invited player: who brought them, and when they got to the level (null: not yet).
  `CREATE TABLE referrals (
    invitee_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    inviter_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    completed_at INTEGER
  ) WITHOUT ROWID`,
  'CREATE INDEX referrals_by_inviter ON referrals (inviter_id, completed_at)',
];

interface Invited {
  id: string;
  name: string;
  done: boolean;
  at: number;
}

class ReferralStore {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  /** Who has this friend code (and is not blocked). */
  inviterOfCode(code: string): { id: string; name: string } | null {
    const row = this.db.prepare('SELECT p.id, p.name FROM friend_codes f JOIN players p ON p.id = f.player_id WHERE f.code = ? AND p.banned = 0').get(code) as { id: string; name: string } | undefined;
    return row ?? null;
  }

  /** The row of an invited player, with the inviter's name. */
  of(inviteeId: string): { inviterId: string; inviter: string; done: boolean; completedAt: number | null } | null {
    const row = this.db
      .prepare('SELECT r.inviter_id, p.name, r.completed_at FROM referrals r JOIN players p ON p.id = r.inviter_id WHERE r.invitee_id = ?')
      .get(inviteeId) as { inviter_id: string; name: string; completed_at: number | null } | undefined;
    return row ? { inviterId: row.inviter_id, inviter: row.name, done: row.completed_at !== null, completedAt: row.completed_at } : null;
  }

  add(inviteeId: string, inviterId: string, now: number): void {
    this.db.prepare('INSERT INTO referrals (invitee_id, inviter_id, created_at) VALUES (?, ?, ?)').run(inviteeId, inviterId, now);
  }

  /** The friends this player brought, oldest first (blocked ones do not show). */
  invited(inviterId: string): Invited[] {
    const rows = this.db
      .prepare('SELECT p.id, p.name, r.completed_at, r.created_at FROM referrals r JOIN players p ON p.id = r.invitee_id WHERE r.inviter_id = ? AND p.banned = 0 ORDER BY r.created_at, p.name')
      .all(inviterId) as unknown as { id: string; name: string; completed_at: number | null; created_at: number }[];
    return rows.map((r) => ({ id: r.id, name: r.name, done: r.completed_at !== null, at: r.completed_at ?? r.created_at }));
  }

  /** How many of this player's friends reached the level (the one just completed counts). */
  completedCount(inviterId: string): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM referrals WHERE inviter_id = ? AND completed_at IS NOT NULL').get(inviterId) as { n: number }).n;
  }

  /** The best Shift level score (prestige counts first) of a player who is not blocked, or 0. */
  levelScore(playerId: string): number {
    const row = this.db
      .prepare("SELECT s.score FROM scores s JOIN players p ON p.id = s.player_id WHERE s.board = 'shift-level' AND s.period = 'all' AND s.player_id = ? AND p.banned = 0")
      .get(playerId) as { score: number } | undefined;
    return row?.score ?? 0;
  }

  /** True only for the call that marks it, so a reward is paid once however often this runs. */
  complete(inviteeId: string, now: number): boolean {
    return Number(this.db.prepare('UPDATE referrals SET completed_at = ? WHERE invitee_id = ? AND completed_at IS NULL').run(now, inviteeId).changes) > 0;
  }

  isBlocked(playerId: string): boolean {
    const row = this.db.prepare('SELECT banned FROM players WHERE id = ?').get(playerId) as { banned: number } | undefined;
    return !row || row.banned === 1;
  }
}

export function referralsModule(): ServerModule {
  let store: ReferralStore;

  return {
    name: 'referrals',
    migrations: REFERRAL_MIGRATIONS,
    routes(app, ctx: ServerContext) {
      store = new ReferralStore(ctx.db);
      const players = new PlayerStore(ctx.db);
      const rewards = new FeedbackStore(ctx.db);
      const friends = new FriendStore(ctx.db);

      /** An invited player who has reached the level: both are paid, once. */
      const settle = (inviteeId: string): void => {
        const row = store.of(inviteeId);
        if (!row || row.done || store.levelScore(inviteeId) < INVITE_LEVEL) return;
        const invitee = players.byId(inviteeId);
        if (!invitee || invitee.banned) return;
        transaction(ctx.db, () => {
          const now = ctx.now();
          if (!store.complete(inviteeId, now)) return;
          rewards.grant(inviteeId, INVITE_REWARD, `invite:welcome:${row.inviter}`, now, false);
          if (store.isBlocked(row.inviterId)) return;
          const nth = store.completedCount(row.inviterId);
          if (nth > MAX_REWARDED_INVITES) return;
          rewards.grant(row.inviterId, INVITE_REWARD, `invite:friend:${invitee.name}`, now, false);
          const milestone = INVITE_MILESTONES.find((m) => m.invites === nth);
          if (milestone) rewards.grant(row.inviterId, milestone.item, `invite:milestone:${nth}`, now, false);
        });
      };
      ctx.onScore.push((event: ScoreEvent) => {
        if (event.board === 'shift-level') settle(event.playerId);
      });

      const me = new Hono<PlayerEnv>();
      me.use('*', requirePlayer(players));

      const state = (c: Parameters<typeof origin>[0], playerId: string) => {
        settle(playerId);
        // The code exists once the player has opened the friends list; an invite needs it, so it is made here too.
        const code = friends.codeOf(playerId);
        const by = store.of(playerId);
        const invited = store.invited(playerId);
        return {
          code: displayCode(code),
          link: ctx.config.gameUrl ? `${origin(c, ctx)}/i/${code}` : null,
          level: INVITE_LEVEL,
          reward: INVITE_REWARD,
          milestones: INVITE_MILESTONES,
          invitedBy: by ? { name: by.inviter, done: by.done } : null,
          invited: invited.map((i) => ({ name: i.name, done: i.done, at: i.at })),
          done: invited.filter((i) => i.done).length,
          max: MAX_REWARDED_INVITES,
        };
      };

      me.get('/', (c) => {
        c.header('Cache-Control', 'private, no-store');
        return c.json(state(c, c.get('player').id));
      });

      // Typing a code is a guess at someone else's account: slow on purpose.
      me.post('/', rateLimit<PlayerEnv>({ max: 10, windowMs: 3_600_000 }, (c) => c.get('player').id, ctx.now), async (c) => {
        const player = c.get('player');
        const code = normalizeCode(String((await readJson(c)).code ?? ''), CODE_LENGTH);
        if (!code) throw new ApiError(422, 'invalid_code', 'That invite code does not look right. It has 8 letters and numbers, like K7M2-9QXA.');
        const inviter = store.inviterOfCode(code);
        if (!inviter) throw new ApiError(404, 'unknown_code', 'Nobody has that invite code.');
        if (inviter.id === player.id) throw new ApiError(422, 'own_code', 'That is your own code. Send it to a friend instead.');

        const known = store.of(player.id);
        if (known) {
          if (known.inviterId === inviter.id) return c.json(state(c, player.id));
          throw new ApiError(409, 'already_invited', 'You already joined through another invite.');
        }
        if (ctx.now() - player.createdAt > NEW_PLAYER_DAYS * DAY_MS) throw new ApiError(422, 'not_new', 'Invites are for new players. This name has been around too long.');
        // Two people inviting each other would pay out for nothing.
        if (store.of(inviter.id)?.inviterId === player.id) throw new ApiError(422, 'invite_loop', 'That friend joined through your invite, so it cannot go the other way.');

        store.add(player.id, inviter.id, ctx.now());
        return c.json(state(c, player.id), 201);
      });

      app.route('/me/referral', me);
    },
    pages(app, ctx: ServerContext) {
      // Never a dead end: an unknown or old code still sends people to the game, only without the name.
      app.get('/i/:code', (c) => {
        const game = ctx.config.gameUrl;
        withHeaders(c, PAGE_HEADERS);
        if (!game) return c.body(page('Roundabout Timing', '<meta name="robots" content="noindex">', '<p>This invite link is not set up.</p>'), 404);
        const code = normalizeCode(c.req.param('code'), CODE_LENGTH);
        const inviter = code ? store.inviterOfCode(code) : null;
        const target = `${game}/${inviter && code ? `?ref=${code}` : ''}`;
        const title = inviter ? `${inviter.name} invited you to Roundabout Timing` : 'Roundabout Timing';
        const description = `One tap sends a car into the roundabout. Reach level ${INVITE_LEVEL} and you both get a free chest.`;
        const self = origin(c, ctx);
        const head = [
          `<meta name="description" content="${escapeHtml(description)}">`,
          '<meta property="og:type" content="website">',
          '<meta property="og:site_name" content="Roundabout Timing">',
          `<meta property="og:title" content="${escapeHtml(title)}">`,
          `<meta property="og:description" content="${escapeHtml(description)}">`,
          `<meta property="og:url" content="${escapeHtml(`${self}/i/${code ?? ''}`)}">`,
          `<meta property="og:image" content="${escapeHtml(`${game}/og-image.jpg`)}">`,
          '<meta property="og:image:width" content="1200">',
          '<meta property="og:image:height" content="630">',
          '<meta name="twitter:card" content="summary_large_image">',
          '<meta name="robots" content="noindex">',
          // People go straight on to the game; link previews stay here and read the tags above.
          `<meta http-equiv="refresh" content="0; url=${escapeHtml(target)}">`,
        ].join('\n');
        return c.body(page(title, head, `<p>${escapeHtml(title)}</p><p><a href="${escapeHtml(target)}">Play Roundabout Timing</a></p>`), 200);
      });
    },
  };
}
