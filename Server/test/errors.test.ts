import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.ts';
import { readConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';

const admin = 'secret-secret-secret-secret';

test('errors: the same kind counts up, another is its own row, old ones go, only the admin reads', async () => {
  const db = openDb(':memory:');
  const config = readConfig({ DB_PATH: ':memory:', TRUST_PROXY: 'true', CORS_ORIGINS: 'https://game.example.org', ADMIN_TOKEN: admin });
  let now = 1_700_000_000_000;
  const app = createApp({ db, config, now: () => now });
  const call = async (method: string, path: string, body?: unknown, token?: string) => {
    const headers: Record<string, string> = { 'x-forwarded-for': '10.0.0.1' };
    if (token) headers.authorization = `Bearer ${token}`;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const response = await app.request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, json: (await response.json().catch(() => ({}))) as any };
  };
  const send = (message: string, channel = 'tab', build = 'b1') =>
    call('POST', '/v1/errors', { type: 'TypeError', message, stack: 'TypeError: x\n    at a (/assets/i.js:1:1)', channel, build, env: 'Chrome 390x800', state: 'screen result', trail: ['tap', '→ result'] });

  assert.equal((await send('a is undefined')).status, 204);
  assert.equal((await send('a is undefined', 'play')).status, 204);
  assert.equal((await send('b is null')).status, 204);
  assert.equal((await send('b is null', 'tab', 'b2')).status, 204);
  assert.equal((await call('POST', '/v1/errors', { type: '', message: '' })).status, 204);
  assert.equal((await call('GET', '/v1/admin/errors')).status, 401);

  const items = (await call('GET', '/v1/admin/errors', undefined, admin)).json.items;
  assert.equal(items.length, 3);
  const counted = items.find((x: { message: string }) => x.message === 'a is undefined');
  assert.equal(counted.count, 2);
  assert.deepEqual([counted.build, counted.state, counted.trail, counted.channel], ['b1', 'screen result', 'tap | → result', 'play']);

  assert.equal((await call('DELETE', `/v1/admin/errors/${items[0].id}`, undefined, admin)).status, 204);
  assert.equal((await call('DELETE', `/v1/admin/errors/${items[0].id}`, undefined, admin)).status, 404);

  now += 31 * 86_400_000;
  await send('c is gone');
  assert.deepEqual((await call('GET', '/v1/admin/errors', undefined, admin)).json.items.map((x: { message: string }) => x.message), ['c is gone']);
});
