import { validVapidKeys, type VapidKeys } from './modules/push/webpush.ts';

/** Everything the server reads from its environment, parsed once at start. */
export interface Config {
  port: number;
  /** SQLite file; ':memory:' for tests. */
  dbPath: string;
  /** Origins allowed to call the API from a browser; '*' allows every site. */
  corsOrigins: string[];
  /** Enables the /v1/admin routes; unset: they do not exist. */
  adminToken: string | null;
  /** Behind Coolify's proxy the client's address is in X-Forwarded-For. */
  trustProxy: boolean;
  /**
   * Behind Cloudflare the last `X-Forwarded-For` entry is Cloudflare's own address, the same for many players.
   * Name the header that carries the real one (`cf-connecting-ip`) and it is read first. Only safe when the server
   * accepts traffic from Cloudflare alone, otherwise anyone can send that header. Null: not used.
   */
  clientIpHeader: string | null;
  /** Keys the hash of an address kept for the once-a-day rule of bug reports and ideas (`feedback`); null: a plain hash. */
  feedbackIpSecret: string | null;
  /** Cloudflare TURN key (Realtime → TURN Server); both set: multiplayer gets a relay (`/v1/rtc/ice`). */
  turnKeyId: string | null;
  turnApiToken: string | null;
  /** Where the game lives: a challenge's short link sends people there (`/c/…`). Null: no short links. */
  gameUrl: string | null;
  /** This service's own address, for the preview picture in a short link; null: read from the request. */
  publicUrl: string | null;
  /** Bug reports and ideas (`/v1/feedback`) are also posted here (a Discord or Slack webhook); null: only stored. */
  feedbackWebhookUrl: string | null;
  /** Web Push keys (`npm run vapid`); null: no notifications, `/v1/push/key` answers 404. */
  vapid: VapidKeys | null;
}

function integer(value: string | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`Invalid number in the environment: "${value}" (${min}–${max})`);
  return n;
}

/** An http(s) address without a slash at the end, or null. */
function address(value: string | undefined, name: string): string | null {
  const text = value?.trim().replace(/\/+$/, '');
  if (!text) return null;
  if (!/^https?:\/\/[^\s/]+(\/[^\s]*)?$/.test(text)) throw new Error(`${name} must be an http(s) address, e.g. https://game.your-domain.tld`);
  return text;
}

/** A header name in lower case (what `Context.req.header` expects), or null. */
function headerName(value: string | undefined): string | null {
  const name = value?.trim().toLowerCase();
  if (!name) return null;
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error('CLIENT_IP_HEADER must be a header name, e.g. cf-connecting-ip.');
  return name;
}

/** A secret from the environment: at least 24 characters (try: openssl rand -base64 32), or null when unset. */
function secret(value: string | undefined, name: string): string | null {
  const text = value?.trim();
  if (!text) return null;
  if (text.length < 24) throw new Error(`${name} must be at least 24 characters (try: openssl rand -base64 32).`);
  return text;
}

/** Both VAPID keys, or neither (notifications off). Push services want a contact: VAPID_SUBJECT, else the game's address. */
function vapidOf(env: NodeJS.ProcessEnv, gameUrl: string | null): VapidKeys | null {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim() ?? '';
  const privateKey = env.VAPID_PRIVATE_KEY?.trim() ?? '';
  if (!publicKey && !privateKey) return null;
  if (!validVapidKeys(publicKey, privateKey)) throw new Error('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be a pair from `npm run vapid`.');
  const subject = env.VAPID_SUBJECT?.trim() || gameUrl;
  if (!subject || !/^(mailto:\S+@\S+|https:\/\/\S+)$/.test(subject)) throw new Error('VAPID_SUBJECT must be a mailto: or https: address (or set GAME_URL).');
  return { publicKey, privateKey, subject };
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const adminToken = env.ADMIN_TOKEN?.trim() || null;
  if (adminToken !== null && adminToken.length < 24) throw new Error('ADMIN_TOKEN must be at least 24 characters (try: openssl rand -base64 32).');
  // Commas, spaces or line breaks between the addresses (Coolify's multiline field writes line breaks); a trailing slash is dropped.
  const corsOrigins = (env.CORS_ORIGINS ?? '*').split(/[\s,]+/).map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean);
  // Without GAME_URL the game's own origin from CORS_ORIGINS will do.
  const gameUrl = address(env.GAME_URL, 'GAME_URL') ?? corsOrigins.find((o) => /^https?:\/\/[^\s/]+$/.test(o)) ?? null;
  return {
    port: integer(env.PORT, 5051, 1, 65535),
    dbPath: env.DB_PATH?.trim() || './data/car-game.db',
    corsOrigins,
    adminToken,
    trustProxy: env.TRUST_PROXY !== 'false',
    clientIpHeader: headerName(env.CLIENT_IP_HEADER),
    feedbackIpSecret: secret(env.FEEDBACK_IP_SECRET, 'FEEDBACK_IP_SECRET'),
    turnKeyId: env.CF_TURN_KEY_ID?.trim() || null,
    turnApiToken: env.CF_TURN_API_TOKEN?.trim() || null,
    gameUrl,
    publicUrl: address(env.PUBLIC_URL, 'PUBLIC_URL'),
    feedbackWebhookUrl: address(env.FEEDBACK_WEBHOOK_URL, 'FEEDBACK_WEBHOOK_URL'),
    vapid: vapidOf(env, gameUrl),
  };
}
