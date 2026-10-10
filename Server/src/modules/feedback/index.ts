import { Hono } from 'hono';
import { normalizeCode } from '../../codes.ts';
import { ApiError } from '../../errors.ts';
import { readJson } from '../../http.ts';
import type { AppEnv, ServerContext, ServerModule } from '../../module.ts';
import { rateLimit } from '../../rateLimit.ts';
import { PlayerStore, requirePlayer, type PlayerEnv } from '../players/index.ts';
import { DAY_MS, FEEDBACK_KINDS, FEEDBACK_MIGRATIONS, FeedbackStore, hashIp, type FeedbackKind } from './store.ts';

/**
 * Build with us (Leo, 03.10.2026): bug reports and feature ideas from the website's form.
 * One of each a day per address (and per friend code); a honeypot field catches simple bots.
 * A bug report with a friend code pays the next bug hunter skin (Ladybug, then Goldbug and so on, six in all; and whatever a moderator
 * grants later); the game picks rewards up with its token.
 *
 *   POST /v1/feedback            {kind, text, friendCode?, website?}   → {id, reward}
 *   GET  /v1/me/rewards                                                 → {rewards: [{id, item, reason}]}
 *   POST /v1/me/rewards/claim    {ids}                                  → {claimed}
 *
 * Reading them: `/admin` (a small page with the ADMIN_TOKEN) or `/v1/admin/feedback` (curl).
 * With FEEDBACK_WEBHOOK_URL set (Discord, Slack or similar), every new one is posted there too.
 */

export const MIN_TEXT = 10;
export const MAX_TEXT = 2000;
const FRIEND_CODE_LENGTH = 8;

/** Text as typed, tidied: no control characters, at most two blank lines in a row. */
function cleanText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function notify(url: string | null, kind: FeedbackKind, text: string, player: string | null): void {
  if (!url) return;
  const head = kind === 'bug' ? '🐞 New bug report' : '💡 New feature idea';
  const content = `**${head}**${player ? ` from ${player}` : ''}\n${text}`.slice(0, 1900);
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, text: content, allowed_mentions: { parse: [] } }), signal: AbortSignal.timeout(5000) }).catch(() => undefined);
}

export function feedbackModule(): ServerModule {
  return {
    name: 'feedback',
    migrations: FEEDBACK_MIGRATIONS,
    routes(app, ctx: ServerContext) {
      const store = new FeedbackStore(ctx.db);
      const players = new PlayerStore(ctx.db);

      app.post('/feedback', rateLimit<AppEnv>({ max: 10, windowMs: 60_000 }, (c) => c.get('ip'), ctx.now), async (c) => {
        const body = await readJson(c);
        const kind = body.kind as FeedbackKind;
        if (!FEEDBACK_KINDS.includes(kind)) throw new ApiError(422, 'invalid_kind', 'Choose a bug report or a feature idea.');
        // A field people never see: whoever fills it in is a bot. It hears "thanks" and nothing is kept.
        if (typeof body.website === 'string' && body.website.trim() !== '') return c.json({ id: null, reward: null }, 201);

        const text = cleanText(body.text);
        if (text.length < MIN_TEXT) throw new ApiError(422, 'too_short', `Tell us a little more (at least ${MIN_TEXT} characters).`);
        if (text.length > MAX_TEXT) throw new ApiError(422, 'too_long', `Keep it under ${MAX_TEXT} characters.`);

        let player: { id: string; name: string } | null = null;
        const typed = typeof body.friendCode === 'string' ? body.friendCode.trim() : '';
        if (kind === 'bug' && typed !== '') {
          const code = normalizeCode(typed, FRIEND_CODE_LENGTH);
          if (!code) throw new ApiError(422, 'invalid_code', 'That friend code does not look right. It has 8 letters and numbers, like K7M2-9QXA.');
          const row = ctx.db.prepare('SELECT p.id, p.name FROM friend_codes f JOIN players p ON p.id = f.player_id WHERE f.code = ? AND p.banned = 0').get(code) as
            | { id: string; name: string }
            | undefined;
          if (!row) throw new ApiError(404, 'unknown_code', 'Nobody has that friend code. Check it in the game: Social → Friends.');
          player = row;
        }

        const now = ctx.now();
        const ipHash = hashIp(c.get('ip'), ctx.config.feedbackIpSecret);
        const last = Math.max(store.lastFrom(ipHash, kind) ?? 0, player ? (store.lastBy(player.id, kind) ?? 0) : 0);
        if (now - last < DAY_MS) {
          const wait = Math.ceil((last + DAY_MS - now) / 1000);
          const what = kind === 'bug' ? 'a bug report' : 'an idea';
          throw new ApiError(429, 'once_a_day', `You already sent ${what} today. One a day keeps the list readable: come back tomorrow.`, { 'Retry-After': String(wait) });
        }

        const id = store.add(kind, text, player?.id ?? null, ipHash, now);
        const skin = player ? store.nextBugHunterSkin(player.id) : null;
        const reward = player && skin && store.grant(player.id, skin, 'bug report', now, true) ? skin : null;
        notify(ctx.config.feedbackWebhookUrl, kind, text, player?.name ?? null);
        return c.json({ id, reward }, 201);
      });

      const me = new Hono<PlayerEnv>();
      me.use('*', requirePlayer(players));
      me.get('/', (c) => c.json({ rewards: store.pending(c.get('player').id) }));
      me.post('/claim', async (c) => {
        const { ids } = await readJson(c);
        if (!Array.isArray(ids) || ids.length > 50 || !ids.every((x) => typeof x === 'string')) throw new ApiError(422, 'invalid_ids', 'Send the ids of the rewards.');
        return c.json({ claimed: store.claim(c.get('player').id, ids as string[], ctx.now()) });
      });
      app.route('/me/rewards', me);
    },
  };
}
