import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.ts';
import { readConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import { MAX_GIFT, MIN_GIFT, PROJECTS } from '../src/modules/fund/index.ts';

function setup() {
  const clock = { now: 1_700_000_000_000 };
  const db = openDb(':memory:');
  const config = readConfig({ DB_PATH: ':memory:', TRUST_PROXY: 'true', CORS_ORIGINS: 'https://game.example.org' });
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

test('fund: anyone can look, only a named player can give, and the limits hold', async () => {
  const { call, join } = setup();
  const look = await call('GET', '/v1/fund');
  assert.equal(look.status, 200);
  assert.deepEqual(look.json.projects.map((p: { id: string; active: boolean; mine: number }) => [p.id, p.active, p.mine]), [
    ['fountain', true, 0],
    ['lighthouse', false, 0],
    ['skybridge', false, 0],
  ]);
  assert.equal((await call('POST', '/v1/fund/gifts', { body: { amount: MIN_GIFT } })).status, 401);
  const anna = await join('Anna');
  assert.equal((await call('POST', '/v1/fund/gifts', { token: anna, body: { amount: MIN_GIFT - 1 } })).status, 422);
  assert.equal((await call('POST', '/v1/fund/gifts', { token: anna, body: { amount: MAX_GIFT + 1 } })).status, 422);
  assert.equal((await call('POST', '/v1/fund/gifts', { token: anna, body: { amount: 12.5 } })).status, 422);
});

test('fund: gifts fill the project being built, and a gift that crosses the goal goes on to the next', async () => {
  const { call, join } = setup();
  const anna = await join('Anna');
  const ben = await join('Ben');
  const first = PROJECTS[0].goal;
  // Two big gifts, then one that crosses the goal.
  let given = 0;
  for (let i = 0; i < 2; i++) {
    assert.equal((await call('POST', '/v1/fund/gifts', { token: anna, body: { amount: 4_000_000 } })).json.accepted, 4_000_000);
    given += 4_000_000;
  }
  const rest = first - given;
  const crossing = await call('POST', '/v1/fund/gifts', { token: ben, body: { amount: rest + 40_000 } });
  assert.equal(crossing.status, 201);
  assert.equal(crossing.json.accepted, rest + 40_000);
  const [fountain, lighthouse] = crossing.json.projects;
  assert.equal(fountain.done, true);
  assert.equal(fountain.raised, first);
  assert.equal(fountain.mine, rest);
  assert.equal(lighthouse.active, true);
  assert.equal(lighthouse.raised, 40_000);
  assert.equal(lighthouse.mine, 40_000);
  // The top list counts everything a player gave; a guest sees no gifts of their own.
  assert.deepEqual(crossing.json.top.map((t: { name: string }) => t.name), ['Anna', 'Ben']);
  assert.equal((await call('GET', '/v1/fund')).json.projects[0].mine, 0);
  assert.equal((await call('GET', '/v1/fund', { token: anna })).json.projects[0].mine, given);
});

test('fund: when everything is built a gift is turned away', async () => {
  const { call, clock, join } = setup();
  const anna = await join('Anna');
  const total = PROJECTS.reduce((sum, p) => sum + p.goal, 0);
  let given = 0;
  while (given < total) {
    // The rate limit counts in the clock's minutes.
    clock.now += 61_000;
    const amount = Math.min(MAX_GIFT, total - given);
    // The last gift may be smaller than the minimum: top it up with a minimum gift that is cut to fit.
    const ask = Math.max(MIN_GIFT, amount);
    const answer = await call('POST', '/v1/fund/gifts', { token: anna, body: { amount: ask } });
    assert.equal(answer.status, 201);
    given += answer.json.accepted;
    // The gift server-side stops at the goal; the loop stops when the total is reached.
    if (given >= total) break;
  }
  const late = await call('POST', '/v1/fund/gifts', { token: anna, body: { amount: MIN_GIFT } });
  assert.equal(late.status, 409);
  assert.equal(late.json.error.code, 'fund_complete');
});
