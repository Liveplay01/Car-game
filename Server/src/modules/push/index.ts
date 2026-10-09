import { randomUUID } from 'node:crypto';
import type { Context } from 'hono';
import { transaction, type Db } from '../../db.ts';
import { ApiError } from '../../errors.ts';
import { readJson } from '../../http.ts';
import type { AppEnv, ScoreEvent, ServerContext, ServerModule } from '../../module.ts';
import { rateLimit } from '../../rateLimit.ts';
import { BOARDS } from '../leaderboard/boards.ts';
import { ScoreStore } from '../leaderboard/store.ts';
import { maybePlayer, PlayerStore } from '../players/index.ts';
import { sendPush, type PushTarget } from './webpush.ts';

/**
 * Notifications (Leo, 08.10.2026): only what matters, at most one a day besides the streak.
 *
 *   GET    /v1/push/key   the public VAPID key the game subscribes with (404: notifications are off)
 *   PUT    /v1/push       this device's subscription, its time zone, the topics turned off and the game's timers (token optional)
 *   DELETE /v1/push       forget this device ({endpoint})
 *
 * The game knows its own clock: it sends timers for the streak (this evening, if today's Daily
 * is still open), tomorrow's free chest and the next Season Pass, with their words, and sends them
 * again whenever it closes. The server adds what only it can see: a player who passed you while
 * you were in the top 20, a reward waiting (an invite's chest), and a nudge after days away.
 * Nothing goes out at night, and a timer that missed its moment is dropped.
 */

/** In order of importance: when several are due, the first goes. */
export const TOPICS = ['streak', 'rank', 'reward', 'gift', 'pass', 'comeback'] as const;
export type Topic = (typeof TOPICS)[number];
/** The ones the game schedules itself; the others come from the server. */
export const GAME_TOPICS: readonly Topic[] = ['streak', 'gift', 'pass'];

/** Local hours a notification may arrive in: 9:00 to 20:59. */
export const QUIET_UNTIL = 9;
export const QUIET_FROM = 21;
/** At most one notification this often; only the streak may come on top. */
export const CAP_MS = 20 * 3_600_000;
/** Days away before each nudge to come back; after the last one the server stays quiet. */
export const COMEBACK_DAYS = [3, 7, 14, 30] as const;
/** A rank is only news inside the top this many. */
export const RANK_WATCH = 20;
/** A device not seen for this long is forgotten. */
export const IDLE_DAYS = 120;

const DAY_MS = 86_400_000;
const RETRY_MS = 15 * 60_000;
const MAX_TIMERS = 6;

const COMEBACK_TEXT: readonly { title: string; body: string }[] = [
  { title: 'The roundabout is busy', body: 'Cars are queuing at your stop line. One quick shift?' },
  { title: 'Your city misses you', body: 'Traffic kept rolling while you were away. Jump back in for a shift.' },
  { title: 'Still got the timing?', body: 'A new shift is waiting. Find out in 20 seconds.' },
  { title: 'Come back for a shift', body: 'Your roundabout is right where you left it.' },
];

const HOME = /^\/(\?[a-z]{1,32})?$/;
const PUSH_HOSTS = /^(?:[a-z0-9-]+\.)*(?:googleapis\.com|push\.apple\.com|mozilla\.com|mozaws\.net|notify\.windows\.com)$/;

export const PUSH_MIGRATIONS: readonly string[] = [
  `CREATE TABLE push_subs (
    id TEXT PRIMARY KEY,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    player_id TEXT REFERENCES players(id) ON DELETE CASCADE,
    tz INTEGER NOT NULL,
    home TEXT NOT NULL DEFAULT '/',
    created_at INTEGER NOT NULL,
    seen_at INTEGER NOT NULL,
    sent_at INTEGER NOT NULL DEFAULT 0,
    nudges INTEGER NOT NULL DEFAULT 0,
    rewards_at INTEGER NOT NULL DEFAULT 0
  )`,
  'CREATE INDEX push_subs_by_player ON push_subs (player_id)',
  `CREATE TABLE push_timers (
    sub_id TEXT NOT NULL REFERENCES push_subs(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    at INTEGER NOT NULL,
    until INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    PRIMARY KEY (sub_id, topic)
  ) WITHOUT ROWID`,
  'CREATE INDEX push_timers_due ON push_timers (at)',
  // The last rank each subscribed player was seen at on the all-time boards, to tell when someone passed them.
  `CREATE TABLE push_ranks (
    player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    board TEXT NOT NULL,
    rank INTEGER NOT NULL,
    PRIMARY KEY (player_id, board)
  ) WITHOUT ROWID`,
  // Topics the player turned off in the settings, comma separated.
  `ALTER TABLE push_subs ADD COLUMN muted TEXT NOT NULL DEFAULT ''`,
];

/** What the game asks to be told later. */
export interface Timer {
  topic: Topic;
  at: number;
  until: number;
  title: string;
  body: string;
}

interface Sub {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  player_id: string | null;
  tz: number;
  home: string;
  seen_at: number;
  sent_at: number;
  nudges: number;
  muted: string;
}

/** Sends one message to one browser and returns the push service's status. */
export type Sender = (target: PushTarget, payload: string) => Promise<number>;

/** The hour on the device's clock (`tz`: minutes east of UTC). */
export const localHour = (now: number, tz: number): number => Math.floor((((now / 60_000 + tz) % 1440) + 1440) % 1440 / 60);

const awake = (now: number, tz: number): boolean => {
  const hour = localHour(now, tz);
  return hour >= QUIET_UNTIL && hour < QUIET_FROM;
};

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t.length > 0 && t.length <= max && !/[\u0000-\u001f\u007f]/.test(t) ? t : null;
}

function base64url(value: unknown, bytes: number): string | null {
  return typeof value === 'string' && /^[A-Za-z0-9_-]+={0,2}$/.test(value) && Buffer.from(value, 'base64url').length === bytes ? value.replace(/=+$/, '') : null;
}

/** A browser's push address: https, on a known push service (never a place of the caller's choosing). */
function endpointOf(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 1024) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && PUSH_HOSTS.test(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}

function timersOf(value: unknown, now: number): Timer[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_TIMERS) throw new ApiError(422, 'invalid_timers', 'Send at most six timers.');
  const seen = new Set<Topic>();
  return value.map((raw: unknown) => {
    const t = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
    const topic = GAME_TOPICS.find((x) => x === t.topic);
    const at = t.at;
    const until = t.until ?? (typeof at === 'number' ? at + 2 * DAY_MS : undefined);
    const title = text(t.title, 60);
    const body = text(t.body, 180);
    const valid =
      topic !== undefined && !seen.has(topic) && typeof at === 'number' && Number.isInteger(at) && at >= now - DAY_MS && at <= now + 60 * DAY_MS &&
      typeof until === 'number' && Number.isInteger(until) && until >= at && until <= at + 7 * DAY_MS && title !== null && body !== null;
    if (!valid) throw new ApiError(422, 'invalid_timers', 'A timer needs a known topic, a time within 60 days, a title (60) and a text (180).');
    seen.add(topic);
    return { topic, at, until, title, body };
  });
}

/** The topics a device turned off; the game sends them with every PUT. */
function mutedOf(value: unknown): Topic[] {
  if (value === undefined) return [];
  const known = Array.isArray(value) ? value.filter((v): v is Topic => TOPICS.some((t) => t === v)) : [];
  if (!Array.isArray(value) || known.length !== value.length) throw new ApiError(422, 'invalid_muted', '"muted" lists the topics to leave out.');
  return [...new Set(known)];
}

class PushStore {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  /** Takes this device in (or refreshes it): it is seen now, and its game timers are the ones sent. */
  save(target: PushTarget, playerId: string | null, tz: number, home: string, muted: Topic[], timers: Timer[], now: number): string {
    return transaction(this.db, () => {
      const known = this.db.prepare('SELECT id FROM push_subs WHERE endpoint = ?').get(target.endpoint) as { id: string } | undefined;
      const id = known?.id ?? randomUUID();
      if (known) {
        this.db.prepare('UPDATE push_subs SET p256dh = ?, auth = ?, player_id = ?, tz = ?, home = ?, muted = ?, seen_at = ?, nudges = 0 WHERE id = ?').run(target.p256dh, target.auth, playerId, tz, home, muted.join(','), now, id);
      } else {
        this.db
          .prepare('INSERT INTO push_subs (id, endpoint, p256dh, auth, player_id, tz, home, muted, created_at, seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(id, target.endpoint, target.p256dh, target.auth, playerId, tz, home, muted.join(','), now, now);
      }
      // Back in the game: a nudge to come back is no longer news.
      this.db.prepare(`DELETE FROM push_timers WHERE sub_id = ? AND topic IN ('comeback', ${GAME_TOPICS.map(() => '?').join(', ')})`).run(id, ...GAME_TOPICS);
      for (const t of timers) this.timer(id, t);
      // A topic turned off takes its waiting timers with it.
      for (const topic of muted) this.drop(id, topic);
      return id;
    });
  }

  remove(endpoint: string): boolean {
    return Number(this.db.prepare('DELETE FROM push_subs WHERE endpoint = ?').run(endpoint).changes) > 0;
  }

  timer(subId: string, t: Timer): void {
    this.db
      .prepare('INSERT INTO push_timers (sub_id, topic, at, until, title, body) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (sub_id, topic) DO UPDATE SET at = excluded.at, until = excluded.until, title = excluded.title, body = excluded.body')
      .run(subId, t.topic, t.at, t.until, t.title, t.body);
  }

  timers(subId: string): Timer[] {
    return this.db.prepare('SELECT topic, at, until, title, body FROM push_timers WHERE sub_id = ? ORDER BY at').all(subId) as unknown as Timer[];
  }

  subsOf(playerId: string): string[] {
    return (this.db.prepare('SELECT id FROM push_subs WHERE player_id = ?').all(playerId) as { id: string }[]).map((r) => r.id);
  }

  hasSubs(playerId: string): boolean {
    return this.db.prepare('SELECT 1 FROM push_subs WHERE player_id = ? LIMIT 1').get(playerId) !== undefined;
  }

  watchers(board: string, except: string): { player_id: string; rank: number }[] {
    return this.db.prepare('SELECT player_id, rank FROM push_ranks WHERE board = ? AND rank <= ? AND player_id != ?').all(board, RANK_WATCH, except) as { player_id: string; rank: number }[];
  }

  setRank(playerId: string, board: string, rank: number): void {
    this.db.prepare('INSERT INTO push_ranks (player_id, board, rank) VALUES (?, ?, ?) ON CONFLICT (player_id, board) DO UPDATE SET rank = excluded.rank').run(playerId, board, rank);
  }

  /** Days away: each device past its next step gets the nudge, once per step. */
  nudge(now: number): void {
    COMEBACK_DAYS.forEach((days, step) => {
      const due = this.db.prepare('SELECT id FROM push_subs WHERE nudges = ? AND seen_at <= ?').all(step, now - days * DAY_MS) as { id: string }[];
      for (const { id } of due) {
        this.timer(id, { topic: 'comeback', at: now, until: now + 2 * DAY_MS, ...(COMEBACK_TEXT[step] ?? COMEBACK_TEXT[0]!) });
        this.db.prepare('UPDATE push_subs SET nudges = ? WHERE id = ?').run(step + 1, id);
      }
    });
  }

  /** A reward came in that the game has not picked up (an invite's chest): one notification for it. */
  rewards(now: number): void {
    const rows = this.db
      .prepare(
        `SELECT s.id, r.item, r.reason FROM push_subs s JOIN rewards r ON r.player_id = s.player_id
         WHERE r.claimed_at IS NULL AND r.created_at > s.seen_at AND r.created_at > s.rewards_at ORDER BY r.created_at`,
      )
      .all() as { id: string; item: string; reason: string }[];
    for (const row of rows) {
      const friend = /^invite:friend:(.+)$/.exec(row.reason)?.[1];
      const chest = row.item.startsWith('chest:');
      const body = friend ? `${friend} reached level 5 with your invite. Your chest is waiting.` : chest ? 'A free chest is waiting for you. Open the game to collect it.' : 'A gift is waiting for you. Open the game to collect it.';
      this.timer(row.id, { topic: 'reward', at: now, until: now + 3 * DAY_MS, title: chest ? 'A free chest for you' : 'A gift for you', body });
      this.db.prepare('UPDATE push_subs SET rewards_at = ? WHERE id = ?').run(now, row.id);
    }
  }

  /** Timers past their moment, and devices nobody has opened for a long time, go. */
  clean(now: number): void {
    this.db.prepare('DELETE FROM push_timers WHERE until < ?').run(now);
    this.db.prepare('DELETE FROM push_subs WHERE seen_at < ?').run(now - IDLE_DAYS * DAY_MS);
  }

  /** The devices with something due, each with its due timers in order of importance. */
  due(now: number): { sub: Sub; timers: Timer[] }[] {
    const rows = this.db
      .prepare('SELECT s.*, t.topic, t.at, t.until, t.title, t.body FROM push_timers t JOIN push_subs s ON s.id = t.sub_id WHERE t.at <= ? ORDER BY s.id')
      .all(now) as unknown as (Sub & Timer)[];
    const out = new Map<string, { sub: Sub; timers: Timer[] }>();
    for (const r of rows) {
      if (r.muted.split(',').includes(r.topic)) continue;
      const entry = out.get(r.id) ?? { sub: r, timers: [] };
      entry.timers.push({ topic: r.topic, at: r.at, until: r.until, title: r.title, body: r.body });
      out.set(r.id, entry);
    }
    for (const e of out.values()) e.timers.sort((a, b) => TOPICS.indexOf(a.topic) - TOPICS.indexOf(b.topic));
    return [...out.values()];
  }

  sent(subId: string, topic: Topic, now: number): void {
    this.db.prepare('DELETE FROM push_timers WHERE sub_id = ? AND topic = ?').run(subId, topic);
    this.db.prepare('UPDATE push_subs SET sent_at = ? WHERE id = ?').run(now, subId);
  }

  later(subId: string, topic: Topic, at: number): void {
    this.db.prepare('UPDATE push_timers SET at = ? WHERE sub_id = ? AND topic = ?').run(at, subId, topic);
  }

  drop(subId: string, topic: Topic): void {
    this.db.prepare('DELETE FROM push_timers WHERE sub_id = ? AND topic = ?').run(subId, topic);
  }

  forget(subId: string): void {
    this.db.prepare('DELETE FROM push_subs WHERE id = ?').run(subId);
  }
}

const ALL_TIME = BOARDS.filter((b) => b.period(0) === 'all');

export interface PushOptions {
  /** How the message leaves (tests catch it); default: Web Push with the configured keys. */
  send?: Sender;
  /** How often the server looks for due notifications; null: never by itself (tests call `tick`). */
  every?: number | null;
}

export type PushModule = ServerModule & {
  /** Looks for what is due and sends it; resolves with how many went out. */
  tick(): Promise<number>;
};

export function pushModule(options: PushOptions = {}): PushModule {
  let tick: () => Promise<number> = async () => 0;

  return {
    name: 'push',
    migrations: PUSH_MIGRATIONS,
    tick: () => tick(),
    routes(app, ctx: ServerContext) {
      const store = new PushStore(ctx.db);
      const players = new PlayerStore(ctx.db);
      const scores = new ScoreStore(ctx.db);
      const guest = maybePlayer(players);
      const vapid = ctx.config.vapid;
      const send: Sender | null = options.send ?? (vapid ? (target, payload) => sendPush(target, payload, vapid, ctx.now()) : null);

      /** Where this player stands on the all-time boards now: the line for "someone passed you". */
      const noteRanks = (playerId: string): void => {
        for (const b of ALL_TIME) {
          const own = scores.of(b.id, 'all', playerId);
          if (own) store.setRank(playerId, b.id, own.rank);
        }
      };

      ctx.onScore.push((event: ScoreEvent) => {
        const board = ALL_TIME.find((b) => b.id === event.board);
        if (!board) return;
        const now = ctx.now();
        const climber = scores.of(board.id, 'all', event.playerId);
        const name = players.byId(event.playerId)?.name;
        if (!climber || !name) return;
        for (const w of store.watchers(board.id, event.playerId)) {
          const rank = scores.of(board.id, 'all', w.player_id)?.rank;
          if (rank === undefined || rank === w.rank) continue;
          store.setRank(w.player_id, board.id, rank);
          if (rank < w.rank || climber.rank > rank) continue;
          const body = `${name} passed you on the ${board.title} board. You are #${rank} now. Take it back?`;
          for (const sub of store.subsOf(w.player_id)) store.timer(sub, { topic: 'rank', at: now, until: now + DAY_MS, title: 'You were overtaken', body });
        }
        if (store.hasSubs(event.playerId)) store.setRank(event.playerId, board.id, climber.rank);
      });

      app.get('/push/key', (c) => {
        if (!vapid) throw new ApiError(404, 'push_off', 'Notifications are not set up on this server.');
        c.header('Cache-Control', 'public, max-age=3600');
        return c.json({ key: vapid.publicKey });
      });

      const limit = rateLimit<AppEnv>({ max: 60, windowMs: 3_600_000 }, (c) => c.get('ip'), ctx.now);

      const target = (body: Record<string, unknown>): PushTarget => {
        const endpoint = endpointOf(body.endpoint);
        const p256dh = base64url(body.p256dh, 65);
        const auth = base64url(body.auth, 16);
        if (!endpoint || !p256dh || !auth) throw new ApiError(422, 'invalid_subscription', 'That is not a push subscription from a browser.');
        return { endpoint, p256dh, auth };
      };

      app.put('/push', limit, async (c: Context<AppEnv>) => {
        if (!vapid) throw new ApiError(404, 'push_off', 'Notifications are not set up on this server.');
        const body = await readJson(c);
        const sub = target(body);
        const tz = body.tz;
        if (typeof tz !== 'number' || !Number.isInteger(tz) || Math.abs(tz) > 840) throw new ApiError(422, 'invalid_tz', '"tz" is the time zone in minutes east of UTC.');
        // Where a tap on a notification opens the game: the Play Store app keeps its mark (`/?googleplaystore`).
        const home = body.home === undefined ? '/' : body.home;
        if (typeof home !== 'string' || !HOME.test(home)) throw new ApiError(422, 'invalid_home', '"home" is the path the game starts at, like /?googleplaystore.');
        const now = ctx.now();
        const player = guest(c);
        const id = store.save(sub, player?.id ?? null, tz, home, mutedOf(body.muted), timersOf(body.timers, now), now);
        if (player) noteRanks(player.id);
        return c.json({ timers: store.timers(id).map((t) => ({ topic: t.topic, at: t.at })) });
      });

      app.delete('/push', limit, async (c: Context<AppEnv>) => {
        const endpoint = endpointOf((await readJson(c)).endpoint);
        if (!endpoint) throw new ApiError(422, 'invalid_subscription', 'That is not a push subscription from a browser.');
        store.remove(endpoint);
        return c.body(null, 204);
      });

      let running = false;
      tick = async () => {
        if (!send || running) return 0;
        running = true;
        let sent = 0;
        try {
          const now = ctx.now();
          store.nudge(now);
          store.rewards(now);
          store.clean(now);
          for (const { sub, timers } of store.due(now)) {
            if (!awake(now, sub.tz)) continue;
            const capped = now - sub.sent_at < CAP_MS;
            const next = timers.find((t) => t.topic === 'streak' || !capped);
            if (!next) continue;
            const payload = JSON.stringify({ title: next.title, body: next.body, tag: next.topic, url: sub.home });
            let status: number;
            try {
              status = await send({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, payload);
            } catch {
              status = 0;
            }
            if (status >= 200 && status < 300) {
              store.sent(sub.id, next.topic, ctx.now());
              sent++;
            } else if (status === 404 || status === 410) store.forget(sub.id);
            else if (status === 0 || status === 429 || status >= 500) store.later(sub.id, next.topic, now + RETRY_MS);
            else {
              console.error(`Push to ${new URL(sub.endpoint).hostname} refused (${status}); dropped`);
              store.drop(sub.id, next.topic);
            }
          }
        } finally {
          running = false;
        }
        return sent;
      };
      const every = options.every === undefined ? 60_000 : options.every;
      if (send && every !== null) {
        const timer = setInterval(() => {
          tick().catch((error: unknown) => console.error('Sending notifications failed', error));
        }, every);
        timer.unref();
      }
    },
  };
}
