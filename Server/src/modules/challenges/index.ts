import type { Context } from 'hono';
import { normalizeCode, randomCode } from '../../codes.ts';
import type { Db } from '../../db.ts';
import { ApiError } from '../../errors.ts';
import { integerField, readJson } from '../../http.ts';
import type { AppEnv, ServerContext, ServerModule } from '../../module.ts';
import { rateLimit } from '../../rateLimit.ts';
import { PlayerStore, maybePlayer } from '../players/index.ts';
import { PREVIEW_HEIGHT, PREVIEW_WIDTH, renderPreview, type PreviewText } from './preview.ts';

/**
 * Short links for challenges. The game's own challenge link (`#challenge=…`) works without
 * this service but is long and shows nothing in a chat. Here it gets a short address with a
 * preview picture: `/c/K7M29QXA` is a small page with Open Graph tags that sends people on to
 * the game. The service does not read the challenge; it keeps the game's code as it came and
 * three facts for the picture (mode, level, score to beat). The picture is drawn here, never
 * uploaded, so nobody can put their own image on this address.
 *
 *   POST /v1/challenges {code, mode, level, target}   a short link: {id}
 *   GET  /c/:id                                       the page a link preview reads
 *   GET  /c/:id/preview.png                           its picture
 */

export const CHALLENGE_MIGRATIONS: readonly string[] = [
  `CREATE TABLE challenges (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    mode TEXT NOT NULL,
    level INTEGER NOT NULL,
    target INTEGER NOT NULL,
    player_id TEXT REFERENCES players(id) ON DELETE SET NULL,
    created_at INTEGER NOT NULL
  )`,
  'CREATE INDEX challenges_by_age ON challenges (created_at)',
];

const ID_LENGTH = 8;
const MODES = ['shift', 'unlimited', 'mayhem'] as const;
type Mode = (typeof MODES)[number];
/** The game's challenge code: base64url, a few hundred characters in practice. */
const CODE_PATTERN = /^[A-Za-z0-9_-]{8,2000}$/;
/** A link lives a year; then it is gone and the page says so. */
export const CHALLENGE_LIFETIME_MS = 365 * 86_400_000;
/** Drawn pictures kept in memory (each about 100 KB). */
const PICTURE_CACHE = 64;

interface Challenge extends PreviewText {
  id: string;
  code: string;
}

class ChallengeStore {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  /** The id of this challenge: the one it already has, or a new one. */
  put(code: string, mode: Mode, level: number, target: number, playerId: string | null, now: number): { id: string; created: boolean } {
    this.db.prepare('DELETE FROM challenges WHERE created_at < ?').run(now - CHALLENGE_LIFETIME_MS);
    for (;;) {
      const known = this.db.prepare('SELECT id FROM challenges WHERE code = ?').get(code) as { id: string } | undefined;
      if (known) return { id: known.id, created: false };
      const id = randomCode(ID_LENGTH);
      // A clash of ids is astronomically rare; then the loop draws again.
      const made = this.db
        .prepare('INSERT OR IGNORE INTO challenges (id, code, mode, level, target, player_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(id, code, mode, level, target, playerId, now);
      if (Number(made.changes) > 0) return { id, created: true };
    }
  }

  /** The challenge with its sender's current name (none when they left or were blocked). */
  get(id: string, now: number): Challenge | null {
    const row = this.db
      .prepare(
        `SELECT c.id, c.code, c.mode, c.level, c.target, CASE WHEN p.banned = 0 THEN p.name END AS name
         FROM challenges c LEFT JOIN players p ON p.id = c.player_id WHERE c.id = ? AND c.created_at >= ?`,
      )
      .get(id, now - CHALLENGE_LIFETIME_MS) as { id: string; code: string; mode: Mode; level: number; target: number; name: string | null } | undefined;
    return row ? { ...row, name: row.name ?? null } : null;
  }
}

const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

/** This service's address as the caller sees it, for absolute links in the page. */
function origin(c: Context, ctx: ServerContext): string {
  if (ctx.config.publicUrl) return ctx.config.publicUrl;
  const url = new URL(c.req.url);
  const proto = (ctx.config.trustProxy && c.req.header('x-forwarded-proto')?.split(',')[0]?.trim()) || url.protocol.replace(':', '');
  const host = (ctx.config.trustProxy && c.req.header('x-forwarded-host')?.split(',')[0]?.trim()) || c.req.header('host') || url.host;
  return `${proto}://${host}`;
}

const page = (title: string, head: string, body: string): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${head}
<style>
  :root { color-scheme: dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0e1116; color: #e3e6ea;
    font: 17px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; text-align: center; padding: 0 16px; }
  a { color: #9ee6cf; font-weight: 600; }
</style>
</head>
<body><main>${body}</main></body>
</html>
`;

function sharePage(ch: Challenge, self: string, game: string): string {
  const score = ch.target.toLocaleString('en-US');
  const unit = ch.mode === 'mayhem' ? 'flames' : 'points';
  const title = `Beat ${score} ${unit}`;
  const shift = ch.mode === 'shift' ? `the same level ${ch.level} shift` : ch.mode === 'mayhem' ? 'the same Mayhem run' : 'the same Unlimited run';
  const description = `${ch.name ? `${ch.name} challenges you` : 'A challenge'}: ${shift}, the very same traffic. One tap sends a car into the roundabout.`;
  const target = `${game}/#challenge=${ch.code}`;
  const picture = `${self}/c/${ch.id}/preview.png`;
  const head = [
    `<meta name="description" content="${escapeHtml(description)}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Roundabout Timing">',
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(`${self}/c/${ch.id}`)}">`,
    `<meta property="og:image" content="${escapeHtml(picture)}">`,
    '<meta property="og:image:type" content="image/png">',
    `<meta property="og:image:width" content="${PREVIEW_WIDTH}">`,
    `<meta property="og:image:height" content="${PREVIEW_HEIGHT}">`,
    `<meta property="og:image:alt" content="${escapeHtml(`${title} in Roundabout Timing`)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    // People go straight on to the game; link previews stay here and read the tags above.
    `<meta http-equiv="refresh" content="0; url=${escapeHtml(target)}">`,
  ].join('\n');
  return page(`${title} · Roundabout Timing`, head, `<p>${escapeHtml(description)}</p><p><a href="${escapeHtml(target)}">Play the challenge</a></p>`);
}

const gonePage = (game: string | null): string =>
  page(
    'Roundabout Timing',
    '<meta name="robots" content="noindex">',
    `<p>This challenge link has expired or never existed.</p>${game ? `<p><a href="${escapeHtml(`${game}/`)}">Play Roundabout Timing</a></p>` : ''}`,
  );

/** Sets the headers, replacing the app's defaults (`Cache-Control: no-store`). */
function withHeaders(c: Context, headers: Record<string, string>): void {
  for (const [name, value] of Object.entries(headers)) c.header(name, value);
}

const PAGE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=300',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'",
  'Referrer-Policy': 'no-referrer',
};

export function challengesModule(): ServerModule {
  let store: ChallengeStore;
  /** Drawn pictures, the most recently used last (a Map keeps the order things went in). */
  const pictures = new Map<string, Buffer>();
  const picture = (ch: Challenge): Buffer => {
    const key = `${ch.id}:${ch.name ?? ''}`;
    let png = pictures.get(key);
    if (png) {
      pictures.delete(key);
    } else {
      png = renderPreview(ch);
      if (pictures.size >= PICTURE_CACHE) pictures.delete(pictures.keys().next().value!);
    }
    pictures.set(key, png);
    return png;
  };

  return {
    name: 'challenges',
    migrations: CHALLENGE_MIGRATIONS,
    routes(app, ctx: ServerContext) {
      store = new ChallengeStore(ctx.db);
      const sender = maybePlayer(new PlayerStore(ctx.db));

      // Every finished shift can be shared, so this is generous; the same challenge keeps its link.
      app.post('/challenges', rateLimit<AppEnv>({ max: 60, windowMs: 3_600_000 }, (c) => c.get('ip'), ctx.now), async (c) => {
        if (!ctx.config.gameUrl) throw new ApiError(503, 'not_configured', 'Short links are not set up on this service.');
        const body = await readJson(c);
        const code = body.code;
        if (typeof code !== 'string' || !CODE_PATTERN.test(code)) throw new ApiError(422, 'invalid_challenge', 'This is not a challenge code.');
        const mode = body.mode;
        if (typeof mode !== 'string' || !(MODES as readonly string[]).includes(mode)) throw new ApiError(422, 'invalid_challenge', `"mode" must be one of ${MODES.join(', ')}.`);
        const level = integerField(body, 'level', 1, 999);
        const target = integerField(body, 'target', 0, 1_000_000_000);
        const made = store.put(code, mode as Mode, level, target, sender(c)?.id ?? null, ctx.now());
        return c.json({ id: made.id }, made.created ? 201 : 200);
      });
    },
    pages(app, ctx: ServerContext) {
      app.get('/c/:id', (c) => {
        const id = normalizeCode(c.req.param('id'), ID_LENGTH);
        const ch = id ? store.get(id, ctx.now()) : null;
        const game = ctx.config.gameUrl;
        withHeaders(c, PAGE_HEADERS);
        if (!ch || !game) return c.body(gonePage(game), 404);
        return c.body(sharePage(ch, origin(c, ctx), game), 200);
      });

      app.get('/c/:id/preview.png', (c) => {
        const id = normalizeCode(c.req.param('id'), ID_LENGTH);
        const ch = id ? store.get(id, ctx.now()) : null;
        if (!ch) throw new ApiError(404, 'not_found', 'There is nothing here.');
        withHeaders(c, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
        return c.body(new Uint8Array(picture(ch)), 200);
      });
    },
  };
}
