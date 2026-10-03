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
  /** Cloudflare TURN key (Realtime → TURN Server); both set: multiplayer gets a relay (`/v1/rtc/ice`). */
  turnKeyId: string | null;
  turnApiToken: string | null;
  /** Where the game lives: a challenge's short link sends people there (`/c/…`). Null: no short links. */
  gameUrl: string | null;
  /** This service's own address, for the preview picture in a short link; null: read from the request. */
  publicUrl: string | null;
  /** Bug reports and ideas (`/v1/feedback`) are also posted here (a Discord or Slack webhook); null: only stored. */
  feedbackWebhookUrl: string | null;
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

export function readConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const adminToken = env.ADMIN_TOKEN?.trim() || null;
  if (adminToken !== null && adminToken.length < 24) throw new Error('ADMIN_TOKEN must be at least 24 characters (try: openssl rand -base64 32).');
  const corsOrigins = (env.CORS_ORIGINS ?? '*').split(',').map((o) => o.trim()).filter(Boolean);
  return {
    port: integer(env.PORT, 5051, 1, 65535),
    dbPath: env.DB_PATH?.trim() || './data/car-game.db',
    corsOrigins,
    adminToken,
    trustProxy: env.TRUST_PROXY !== 'false',
    turnKeyId: env.CF_TURN_KEY_ID?.trim() || null,
    turnApiToken: env.CF_TURN_API_TOKEN?.trim() || null,
    // Without GAME_URL the game's own origin from CORS_ORIGINS will do.
    gameUrl: address(env.GAME_URL, 'GAME_URL') ?? corsOrigins.find((o) => /^https?:\/\/[^\s/]+$/.test(o)) ?? null,
    publicUrl: address(env.PUBLIC_URL, 'PUBLIC_URL'),
    feedbackWebhookUrl: address(env.FEEDBACK_WEBHOOK_URL, 'FEEDBACK_WEBHOOK_URL'),
  };
}
