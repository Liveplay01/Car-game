import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.ts';
import { readConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';

const admin = 'secret-secret-secret-secret';

function setup() {
  const db = openDb(':memory:');
  const config = readConfig({ DB_PATH: ':memory:', TRUST_PROXY: 'true', CORS_ORIGINS: 'https://game.example.org', ADMIN_TOKEN: admin });
  let now = 1_700_000_000_000;
  const app = createApp({ db, config, now: () => now });
  const call = async (method: string, path: string, options: { token?: string; body?: unknown } = {}) => {
    const headers: Record<string, string> = { 'x-forwarded-for': '10.0.0.1' };
    if (options.token) headers.authorization = `Bearer ${options.token}`;
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    const response = await app.request(path, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
    return { status: response.status, json: (await response.json().catch(() => ({}))) as any };
  };
  return { call, db, later: (ms: number) => (now += ms) };
}

test('messages: all, Play app and one player see only theirs; old ones expire', async () => {
  const { call, db, later } = setup();
  const made = await call('POST', '/v1/players', { body: { name: 'Mira' } });
  const token = made.json.token as string;
  db.prepare('INSERT INTO friend_codes (code, player_id) VALUES (?, ?)').run('K7M29QXA', made.json.player.id);

  const send = (body: unknown) => {
    later(1);
    return call('POST', '/v1/admin/messages', { token: admin, body });
  };
  assert.equal((await call('POST', '/v1/admin/messages', { body: {} })).status, 401);
  assert.equal((await send({ audience: 'all', title: '', body: 'x' })).status, 422);
  assert.equal((await send({ audience: 'nobody', title: 'a', body: 'x' })).status, 422);
  assert.equal((await send({ audience: 'player', friendCode: 'ZZZZ-ZZZZ', title: 'a', body: 'x' })).status, 404);
  assert.equal((await send({ audience: 'all', title: 'Hello', body: 'Everyone' })).status, 201);
  assert.equal((await send({ audience: 'play', title: 'Play', body: 'App only' })).status, 201);
  assert.equal((await send({ audience: 'player', friendCode: 'K7M2-9QXA', title: 'You', body: 'Just you' })).status, 201);

  const titles = async (path: string, withToken?: string) => (await call('GET', path, { token: withToken })).json.messages.map((m: { title: string }) => m.title);
  assert.deepEqual(await titles('/v1/messages'), ['Hello']);
  assert.deepEqual(await titles('/v1/messages?channel=play'), ['Hello', 'Play']);
  assert.deepEqual(await titles('/v1/messages', token), ['Hello', 'You']);

  const list = (await call('GET', '/v1/admin/messages', { token: admin })).json.items;
  assert.equal(list.length, 3);
  assert.equal((await call('DELETE', `/v1/admin/messages/${list[0].id}`, { token: admin })).status, 204);
  assert.equal((await call('DELETE', `/v1/admin/messages/${list[0].id}`, { token: admin })).status, 404);

  later(31 * 86_400_000);
  assert.deepEqual(await titles('/v1/messages', token), []);
});
