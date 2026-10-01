import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.ts';
import { readConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import { CHALLENGE_LIFETIME_MS } from '../src/modules/challenges/index.ts';
import { signText } from '../src/modules/challenges/preview.ts';

const ADMIN = 'a'.repeat(32);
const CODE = 'WzEsMTIzNDUsMCw0MixbXSxbMCw0LDgsMTJdLFtdLFtdLDAsLTEsMTIzNDUsMCwtMV0';

function setup(env: Record<string, string> = {}) {
  const clock = { now: 1_700_000_000_000 };
  const db = openDb(':memory:');
  const config = readConfig({ DB_PATH: ':memory:', ADMIN_TOKEN: ADMIN, TRUST_PROXY: 'true', CORS_ORIGINS: 'https://game.example.org', ...env });
  const app = createApp({ db, config, now: () => clock.now });
  const request = (method: string, path: string, options: { token?: string; body?: unknown; ip?: string; headers?: Record<string, string> } = {}) => {
    const headers: Record<string, string> = { 'x-forwarded-for': options.ip ?? '10.0.0.1', ...options.headers };
    if (options.token) headers.authorization = `Bearer ${options.token}`;
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    return app.request(path, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  };
  const share = async (body: Record<string, unknown>, token?: string) => {
    const response = await request('POST', '/v1/challenges', { body, token });
    return { status: response.status, json: (await response.json()) as { id?: string; error?: { code: string } } };
  };
  return { request, share, clock, db };
}

const CHALLENGE = { code: CODE, mode: 'shift', level: 42, target: 12345 };

test('challenges: a short link, the same one again, and a page that sends people to the game', async () => {
  const { request, share } = setup();
  const made = await share(CHALLENGE);
  assert.equal(made.status, 201);
  assert.match(made.json.id!, /^[A-HJKMNP-Z2-9]{8}$/);
  const again = await share(CHALLENGE);
  assert.equal(again.status, 200);
  assert.equal(again.json.id, made.json.id, 'the same challenge keeps its link');

  const page = await request('GET', `/c/${made.json.id!.toLowerCase()}`, { headers: { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'api.example.org' } });
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type')!, /^text\/html/);
  assert.equal(page.headers.get('cache-control'), 'public, max-age=300');
  const html = await page.text();
  assert.match(html, /<meta property="og:title" content="Beat 12,345 points">/);
  assert.ok(html.includes(`<meta property="og:image" content="https://api.example.org/c/${made.json.id}/preview.png">`));
  assert.ok(html.includes(`url=https://game.example.org/#challenge=${CODE}`));
  assert.match(html, /level 42 shift/);
});

test('challenges: the preview is a 1200 × 630 PNG', async () => {
  const { request, share } = setup();
  const { json } = await share({ ...CHALLENGE, mode: 'mayhem', target: 77 });
  const picture = await request('GET', `/c/${json.id}/preview.png`);
  assert.equal(picture.status, 200);
  assert.equal(picture.headers.get('content-type'), 'image/png');
  const png = Buffer.from(await picture.arrayBuffer());
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  assert.ok(png.length < 300_000, `small enough for every chat app (${png.length} bytes)`);
});

test('challenges: the sender is named while they have a leaderboard name', async () => {
  const { request, share } = setup();
  const joined = await request('POST', '/v1/players', { body: { name: 'Anna' } });
  const anna = (await joined.json()) as { token: string; player: { id: string } };
  const { json } = await share(CHALLENGE, anna.token);
  assert.match(await (await request('GET', `/c/${json.id}`)).text(), /Anna challenges you/);
  await request('DELETE', '/v1/me', { token: anna.token });
  const after = await (await request('GET', `/c/${json.id}`)).text();
  assert.ok(!after.includes('Anna'), 'a deleted account takes its name off its links');
  assert.match(after, /A challenge: the same level 42 shift/);
});

test('challenges: wrong input is refused, unknown and old links are gone', async () => {
  const { request, share, clock } = setup();
  assert.equal((await share({ ...CHALLENGE, code: 'not a code!' })).json.error!.code, 'invalid_challenge');
  assert.equal((await share({ ...CHALLENGE, mode: 'race' })).json.error!.code, 'invalid_challenge');
  assert.equal((await share({ ...CHALLENGE, level: 0 })).status, 422);
  assert.equal((await share({ ...CHALLENGE, target: -1 })).status, 422);
  assert.equal((await request('GET', '/c/AAAAAAAA')).status, 404);
  assert.equal((await request('GET', '/c/<script>')).status, 404);
  assert.equal((await request('GET', '/c/AAAAAAAA/preview.png')).status, 404);

  const { json } = await share(CHALLENGE);
  clock.now += CHALLENGE_LIFETIME_MS + 1;
  const gone = await request('GET', `/c/${json.id}`);
  assert.equal(gone.status, 404);
  assert.match(await gone.text(), /expired/);
});

test('challenges: without a game address there are no short links', async () => {
  const { share } = setup({ CORS_ORIGINS: '*' });
  const refused = await share(CHALLENGE);
  assert.equal(refused.status, 503);
  assert.equal(refused.json.error!.code, 'not_configured');
  const { share: shareThere } = setup({ CORS_ORIGINS: '*', GAME_URL: 'https://example.org/game/' });
  assert.equal((await shareThere(CHALLENGE)).status, 201);
});

test('challenges: the sign shows any name it is given, unknown letters as spaces', () => {
  assert.equal(signText('Léo_9-x'), 'L O_9-X');
});
