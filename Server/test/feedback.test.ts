import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.ts';
import { readConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';

const ADMIN = 'a'.repeat(32);

function setup() {
  const clock = { now: 1_700_000_000_000 };
  const db = openDb(':memory:');
  const config = readConfig({ DB_PATH: ':memory:', ADMIN_TOKEN: ADMIN, TRUST_PROXY: 'true' });
  const app = createApp({ db, config, now: () => clock.now });
  const call = async (method: string, path: string, options: { token?: string; body?: unknown; ip?: string } = {}) => {
    const headers: Record<string, string> = { 'x-forwarded-for': options.ip ?? '10.0.0.1' };
    if (options.token) headers.authorization = `Bearer ${options.token}`;
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    const response = await app.request(path, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
    const text = await response.text();
    return { status: response.status, json: text.startsWith('{') ? JSON.parse(text) : null, text };
  };
  return { call, clock };
}

test('feedback: one bug report and one idea a day, a honeypot, and a bug hunter skin per report with a friend code', async () => {
  const { call, clock } = setup();
  const joined = await call('POST', '/v1/players', { body: { name: 'Bughunter' }, ip: '10.1.0.1' });
  const token = joined.json.token as string;
  const code = (await call('GET', '/v1/friends', { token })).json.code as string;

  assert.equal((await call('POST', '/v1/feedback', { body: { kind: 'bug', text: 'short' } })).status, 422);
  assert.equal((await call('POST', '/v1/feedback', { body: { kind: 'bug', text: 'The bus drove through the truck.', friendCode: 'ZZZZ-ZZZZ' } })).status, 404);

  const bug = await call('POST', '/v1/feedback', { body: { kind: 'bug', text: 'The bus drove through the truck.', friendCode: code.toLowerCase() } });
  assert.equal(bug.status, 201);
  assert.equal(bug.json.reward, 'ladybug');

  // The same day: the same address, or the same friend code from elsewhere, waits.
  const again = await call('POST', '/v1/feedback', { body: { kind: 'bug', text: 'Another bug right away.' } });
  assert.equal(again.status, 429);
  assert.equal((await call('POST', '/v1/feedback', { body: { kind: 'bug', text: 'Another bug elsewhere.', friendCode: code }, ip: '10.2.2.2' })).status, 429);
  // An idea is its own form.
  assert.equal((await call('POST', '/v1/feedback', { body: { kind: 'idea', text: 'A night mode with headlights only.' } })).status, 201);
  // A bot fills in the hidden field: it hears thanks, nothing is kept.
  assert.equal((await call('POST', '/v1/feedback', { body: { kind: 'idea', text: 'Buy cheap watches now!!', website: 'spam.example' }, ip: '10.3.3.3' })).status, 201);

  // The game picks the reward up once.
  const rewards = await call('GET', '/v1/me/rewards', { token });
  assert.deepEqual(rewards.json.rewards.map((r: { item: string }) => r.item), ['ladybug']);
  await call('POST', '/v1/me/rewards/claim', { token, body: { ids: rewards.json.rewards.map((r: { id: string }) => r.id) } });
  assert.equal((await call('GET', '/v1/me/rewards', { token })).json.rewards.length, 0);

  // A day later another report is welcome, and pays the next skin.
  clock.now += 86_400_000;
  const next = await call('POST', '/v1/feedback', { body: { kind: 'bug', text: 'The fire engine flickers at night.', friendCode: code } });
  assert.equal(next.status, 201);
  assert.equal(next.json.reward, 'goldbug');

  // The inbox: two bugs (more below), one idea, the bot's never arrived.
  assert.equal((await call('GET', '/v1/admin/feedback')).status, 401);
  const inbox = await call('GET', '/v1/admin/feedback', { token: ADMIN });
  assert.equal(inbox.json.items.length, 3);
  assert.deepEqual(inbox.json.counts, { bug: { total: 2, new: 2 }, idea: { total: 1, new: 1 } });
  assert.equal(inbox.json.items[0].player.name, 'Bughunter');
  const id = inbox.json.items[0].id as string;
  assert.equal((await call('PATCH', `/v1/admin/feedback/${id}`, { token: ADMIN, body: { status: 'done' } })).status, 200);
  assert.equal((await call('GET', '/v1/admin/feedback?status=done', { token: ADMIN })).json.items.length, 1);

  // Four more reports pay the rest of the six; after that a report pays nothing.
  const paid: (string | null)[] = [];
  for (let n = 0; n < 5; n++) {
    clock.now += 86_400_000;
    paid.push((await call('POST', '/v1/feedback', { body: { kind: 'bug', text: `Another bug, number ${n}.`, friendCode: code } })).json.reward);
  }
  assert.deepEqual(paid, ['scarab', 'bluebottle', 'orchid', 'firefly', null]);
  await call('POST', '/v1/me/rewards/claim', { token, body: { ids: (await call('GET', '/v1/me/rewards', { token })).json.rewards.map((r: { id: string }) => r.id) } });

  // A chest from the team, by friend code.
  assert.equal((await call('POST', '/v1/admin/rewards', { token: ADMIN, body: { friendCode: code, item: 'chest:premium' } })).status, 201);
  assert.deepEqual((await call('GET', '/v1/me/rewards', { token })).json.rewards.map((r: { item: string }) => r.item), ['chest:premium']);

  // Deleting the account keeps the reports, without the player; their rewards go.
  assert.equal((await call('DELETE', '/v1/me', { token })).status, 204);
  const after = await call('GET', '/v1/admin/feedback?kind=bug', { token: ADMIN });
  assert.equal(after.json.items.length, 7);
  assert.ok(after.json.items.every((f: { player: unknown }) => f.player === null));

  // The inbox page exists for the moderator.
  const page = await call('GET', '/admin');
  assert.equal(page.status, 200);
  assert.match(page.text, /Build with us · Inbox/);
});
