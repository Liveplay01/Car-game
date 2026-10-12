import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.ts';
import { readConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import { MAX_GIFT } from '../src/modules/fund/index.ts';
import { IDEA_GOAL } from '../src/modules/ideas/store.ts';

function setup() {
  const clock = { now: 1_700_000_000_000 };
  const db = openDb(':memory:');
  const config = readConfig({ DB_PATH: ':memory:', TRUST_PROXY: 'true', CORS_ORIGINS: 'https://game.example.org', ADMIN_TOKEN: 'secret-secret-secret-secret' });
  const app = createApp({ db, config, now: () => clock.now });
  let n = 0;
  const call = async (method: string, path: string, options: { token?: string; body?: unknown } = {}) => {
    const headers: Record<string, string> = { 'x-forwarded-for': '10.0.0.1' };
    if (options.token) headers.authorization = `Bearer ${options.token}`;
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    const response = await app.request(path, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
    const text = await response.text();
    return { status: response.status, json: text.startsWith('{') ? JSON.parse(text) : null };
  };
  const join = async (name: string) => {
    const made = await app.request('/v1/players', { method: 'POST', headers: { 'x-forwarded-for': `10.9.0.${++n}`, 'content-type': 'application/json' }, body: JSON.stringify({ name }) });
    assert.equal(made.status, 201);
    return ((await made.json()) as { token: string }).token;
  };
  return { call, clock, join };
}

const admin = 'secret-secret-secret-secret';

test('ideas: a suggestion waits for the moderator, then players fund it up to the goal', async () => {
  const { call, clock, join } = setup();
  const anna = await join('Anna');
  assert.equal((await call('POST', '/v1/ideas', { body: { text: 'A snowy city map please' } })).status, 401);
  assert.equal((await call('POST', '/v1/ideas', { token: anna, body: { text: 'short' } })).status, 422);
  assert.equal((await call('POST', '/v1/ideas', { token: anna, body: { text: 'A snowy city map please' } })).status, 201);
  assert.equal((await call('POST', '/v1/ideas', { token: anna, body: { text: 'And a second one today' } })).status, 429);
  assert.deepEqual((await call('GET', '/v1/ideas')).json.ideas, []);

  const queue = await call('GET', '/v1/admin/ideas?status=pending', { token: admin });
  assert.equal(queue.json.counts.pending, 1);
  const id = queue.json.items[0].id as string;
  assert.equal(queue.json.items[0].player.name, 'Anna');
  assert.equal((await call('PATCH', `/v1/admin/ideas/${id}`, { token: admin, body: { status: 'open', title: '', text: '' } })).status, 422);
  assert.equal((await call('PATCH', `/v1/admin/ideas/${id}`, { token: admin, body: { status: 'open', title: 'Snow map', text: 'A winter city with slippery roads.' } })).status, 200);

  const listed = (await call('GET', '/v1/ideas', { token: anna })).json;
  assert.deepEqual(listed.ideas.map((i: { title: string; status: string; by: string }) => [i.title, i.status, i.by]), [['Snow map', 'open', 'Anna']]);

  const ben = await join('Ben');
  let given = 0;
  // Gifts over several days (the daily limit), until the goal holds the rest back.
  while (given < IDEA_GOAL) {
    const sent = await call('POST', `/v1/ideas/${id}/gifts`, { token: ben, body: { amount: MAX_GIFT } });
    if (sent.status === 429) {
      clock.now += 86_400_001;
      continue;
    }
    assert.equal(sent.status, 201);
    given += sent.json.accepted;
  }
  assert.equal(given, IDEA_GOAL);
  const funded = (await call('GET', '/v1/ideas', { token: ben })).json.ideas[0];
  assert.equal(funded.status, 'funded');
  assert.equal(funded.mine, IDEA_GOAL);
  assert.equal((await call('POST', `/v1/ideas/${id}/gifts`, { token: ben, body: { amount: MAX_GIFT } })).status, 409);
});

test('ideas: ideas from Build with us join the queue, and a rejected one never shows', async () => {
  const { call } = setup();
  assert.equal((await call('POST', '/v1/feedback', { body: { kind: 'idea', text: 'Please add a night-time rain map' } })).status, 201);
  const queue = await call('GET', '/v1/admin/ideas', { token: admin });
  assert.equal(queue.json.items[0].source, 'feedback');
  const id = queue.json.items[0].id as string;
  await call('PATCH', `/v1/admin/ideas/${id}`, { token: admin, body: { status: 'rejected', title: '', text: '' } });
  assert.deepEqual((await call('GET', '/v1/ideas')).json.ideas, []);
  assert.equal((await call('GET', '/v1/admin/ideas')).status, 401);
});
