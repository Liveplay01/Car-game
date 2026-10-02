import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.ts';
import { readConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';

const ADMIN = 'a'.repeat(32);

/** A fresh server with an empty in-memory database and a clock the test can move. */
function setup(env: Record<string, string> = {}) {
  const clock = { now: 1_700_000_000_000 };
  const db = openDb(':memory:');
  const config = readConfig({ DB_PATH: ':memory:', ADMIN_TOKEN: ADMIN, TRUST_PROXY: 'true', ...env });
  const app = createApp({ db, config, now: () => clock.now });
  let ip = 1;
  const call = async (method: string, path: string, options: { token?: string; body?: unknown; ip?: string } = {}) => {
    const headers: Record<string, string> = { 'x-forwarded-for': options.ip ?? `10.0.0.${ip}` };
    if (options.token) headers.authorization = `Bearer ${options.token}`;
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    const response = await app.request(path, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
    const text = await response.text();
    return { status: response.status, headers: response.headers, json: text.startsWith('{') ? JSON.parse(text) : null };
  };
  /** Registers a player from its own address and returns their token. */
  const join = async (name: string): Promise<{ token: string; id: string }> => {
    ip += 1;
    const r = await call('POST', '/v1/players', { body: { name }, ip: `10.1.0.${ip}` });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    return { token: r.json.token, id: r.json.player.id };
  };
  return { call, join, clock, db };
}

test('health check answers', async () => {
  const { call, db } = setup();
  const response = await call('GET', '/healthz');
  assert.equal(response.status, 200);
  db.close();
});

test('a player registers, is known by their token and can be renamed', async () => {
  const { call, clock } = setup();
  const created = await call('POST', '/v1/players', { body: { name: '  Leo  ' } });
  assert.equal(created.status, 201);
  assert.equal(created.json.player.name, 'Leo');
  assert.match(created.json.token, /^rat_/);
  const token = created.json.token as string;

  const me = await call('GET', '/v1/me', { token });
  assert.equal(me.status, 200);
  assert.equal(me.json.player.name, 'Leo');

  assert.equal((await call('GET', '/v1/me')).status, 401);
  assert.equal((await call('GET', '/v1/me', { token: 'rat_nope' })).status, 401);

  // Right after entering it, a typo can be fixed; after that a name may change once every 10 seconds.
  const renamed = await call('PATCH', '/v1/me', { token, body: { name: 'Leon' } });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.json.player.name, 'Leon');
  assert.equal((await call('GET', '/v1/me', { token })).json.player.name, 'Leon');
  assert.equal((await call('PATCH', '/v1/me', { token, body: { name: 'Leonie' } })).status, 429);
  clock.now += 11_000;
  assert.equal((await call('PATCH', '/v1/me', { token, body: { name: 'Leonie' } })).status, 200);
});

test('names: taken, look-alike, and not allowed', async () => {
  const { call } = setup();
  assert.equal((await call('POST', '/v1/players', { body: { name: 'Leo' } })).status, 201);
  const taken = await call('POST', '/v1/players', { body: { name: 'Leo' } });
  assert.equal(taken.status, 409);
  assert.equal(taken.json.error.code, 'name_taken');
  assert.equal((await call('POST', '/v1/players', { body: { name: 'L3O' } })).json.error.code, 'name_taken');
  const bad = await call('POST', '/v1/players', { body: { name: 'f.u.c.k' } });
  assert.equal(bad.status, 422);
  assert.equal(bad.json.error.code, 'invalid_name');
  const swear = await call('POST', '/v1/players', { body: { name: 'Sh1tHead' } });
  assert.equal(swear.status, 422);
  assert.equal(swear.json.error.code, 'name_not_allowed');
  assert.equal((await call('POST', '/v1/players', { body: { nam: 'x' } })).status, 422);
  assert.equal((await call('POST', '/v1/players', { body: 'not json' as unknown })).status, 400);
});

test('a rename cannot take a name that is not allowed', async () => {
  const { call, join, clock } = setup();
  const { token } = await join('Leo');
  clock.now += 11_000;
  assert.equal((await call('PATCH', '/v1/me', { token, body: { name: 'Hitler' } })).status, 422);
});

test('registering is limited per address', async () => {
  const { call } = setup();
  for (let i = 0; i < 20; i++) assert.equal((await call('POST', '/v1/players', { body: { name: `Player ${String.fromCharCode(97 + i)}${i}` }, ip: '9.9.9.9' })).status, 201);
  const blocked = await call('POST', '/v1/players', { body: { name: 'One more' }, ip: '9.9.9.9' });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  assert.equal((await call('POST', '/v1/players', { body: { name: 'Elsewhere' }, ip: '9.9.9.8' })).status, 201);
});

test('the boards are listed', async () => {
  const { call } = setup();
  const r = await call('GET', '/v1/boards');
  assert.deepEqual(r.json.boards.map((b: { id: string }) => b.id), ['shift-level', 'unlimited']);
  assert.equal((await call('GET', '/v1/boards/nope')).status, 404);
});

test('a score needs a token and only a better one replaces the old', async () => {
  const { call, join } = setup();
  assert.equal((await call('PUT', '/v1/boards/unlimited/score', { body: { score: 100, cars: 10 } })).status, 401);

  const { token } = await join('Leo');
  const first = await call('PUT', '/v1/boards/unlimited/score', { token, body: { score: 5000, cars: 40 } });
  assert.equal(first.status, 200);
  assert.deepEqual(first.json, { accepted: true, best: { rank: 1, score: 5000, meta: { cars: 40 } } });

  const worse = await call('PUT', '/v1/boards/unlimited/score', { token, body: { score: 4000, cars: 50 } });
  assert.equal(worse.json.accepted, false);
  assert.equal(worse.json.best.score, 5000);

  const better = await call('PUT', '/v1/boards/unlimited/score', { token, body: { score: 7000, cars: 55 } });
  assert.equal(better.json.accepted, true);
  assert.deepEqual(better.json.best.meta, { cars: 55 });
});

test('the worn title shows next to the name on the boards and can be taken off', async () => {
  const { call, join } = setup();
  const a = await join('Anna');
  const b = await join('Ben');
  await call('PUT', '/v1/boards/unlimited/score', { token: a.token, body: { score: 3000, cars: 30 } });
  await call('PUT', '/v1/boards/unlimited/score', { token: b.token, body: { score: 2000, cars: 20 } });
  assert.equal((await call('PUT', '/v1/me/title', { token: a.token, body: { title: 'roadVeteran' } })).status, 200);
  const list = await call('GET', '/v1/boards/unlimited');
  assert.deepEqual(list.json.entries.map((e: { name: string; title: string | null }) => [e.name, e.title]), [['Anna', 'roadVeteran'], ['Ben', null]]);
  assert.equal((await call('PUT', '/v1/me/title', { token: a.token, body: { title: null } })).status, 200);
  assert.equal((await call('GET', '/v1/boards/unlimited')).json.entries[0].title, null);
  // Only the shape is checked, and a token is needed.
  assert.equal((await call('PUT', '/v1/me/title', { token: a.token, body: { title: '<b>x</b>' } })).status, 422);
  assert.equal((await call('PUT', '/v1/me/title', { token: a.token, body: {} })).status, 422);
  assert.equal((await call('PUT', '/v1/me/title', { body: { title: 'roadVeteran' } })).status, 401);
});

test('the list is ranked, ties go to whoever was first, and "me" is marked', async () => {
  const { call, join, clock } = setup();
  const a = await join('Anna');
  const b = await join('Ben');
  const c = await join('Cleo');
  await call('PUT', '/v1/boards/unlimited/score', { token: a.token, body: { score: 3000, cars: 30 } });
  clock.now += 1000;
  await call('PUT', '/v1/boards/unlimited/score', { token: b.token, body: { score: 9000, cars: 60 } });
  clock.now += 1000;
  await call('PUT', '/v1/boards/unlimited/score', { token: c.token, body: { score: 3000, cars: 30 } });

  const list = await call('GET', '/v1/boards/unlimited', { token: c.token });
  assert.deepEqual(list.json.entries.map((e: { name: string; rank: number }) => [e.rank, e.name]), [[1, 'Ben'], [2, 'Anna'], [3, 'Cleo']]);
  assert.deepEqual(list.json.entries.map((e: { me: boolean }) => e.me), [false, false, true]);
  assert.equal(list.json.me.rank, 3);
  assert.equal(list.json.entries[0].id, undefined, 'ids of other players are not given out');

  const guest = await call('GET', '/v1/boards/unlimited?limit=1');
  assert.equal(guest.json.entries.length, 1);
  assert.equal(guest.json.me, null);
  assert.match(guest.headers.get('cache-control') ?? '', /public/);
  assert.match(guest.headers.get('vary') ?? '', /Authorization/);
});

test('the shift level board ranks prestige before level', async () => {
  const { call, join } = setup();
  const a = await join('Anna');
  const b = await join('Ben');
  await call('PUT', '/v1/boards/shift-level/score', { token: a.token, body: { level: 49, prestige: 0 } });
  await call('PUT', '/v1/boards/shift-level/score', { token: b.token, body: { level: 2, prestige: 1 } });
  const list = await call('GET', '/v1/boards/shift-level');
  assert.deepEqual(list.json.entries.map((e: { name: string; meta: object }) => [e.name, e.meta]), [['Ben', { level: 2, prestige: 1 }], ['Anna', { level: 49, prestige: 0 }]]);
});

test('impossible scores are refused', async () => {
  const { call, join } = setup();
  const { token } = await join('Leo');
  const bad: [string, unknown][] = [
    ['unlimited', { score: 1_000_000, cars: 10 }],
    ['unlimited', { score: 100, cars: 0 }],
    ['unlimited', { score: -5, cars: 10 }],
    ['unlimited', { score: 10.5, cars: 10 }],
    ['unlimited', { score: '100', cars: 10 }],
    ['unlimited', { score: 100 }],
    ['unlimited', { score: 100, cars: 999_999 }],
    ['shift-level', { level: 0, prestige: 0 }],
    ['shift-level', { level: 5000, prestige: 0 }],
    ['shift-level', { level: 5, prestige: -1 }],
    ['shift-level', { level: 5 }],
  ];
  for (const [board, body] of bad) {
    const r = await call('PUT', `/v1/boards/${board}/score`, { token, body });
    assert.equal(r.status, 422, JSON.stringify(body));
  }
  assert.equal((await call('GET', '/v1/boards/unlimited')).json.entries.length, 0);
});

test('submitting is limited per player', async () => {
  const { call, join } = setup();
  const { token } = await join('Leo');
  for (let i = 0; i < 30; i++) assert.equal((await call('PUT', '/v1/boards/unlimited/score', { token, body: { score: 100 + i, cars: 10 } })).status, 200);
  assert.equal((await call('PUT', '/v1/boards/unlimited/score', { token, body: { score: 999, cars: 10 } })).status, 429);
});

test('deleting yourself removes the scores too', async () => {
  const { call, join } = setup();
  const { token } = await join('Leo');
  await call('PUT', '/v1/boards/unlimited/score', { token, body: { score: 500, cars: 10 } });
  assert.equal((await call('DELETE', '/v1/me', { token })).status, 204);
  assert.equal((await call('GET', '/v1/me', { token })).status, 401);
  assert.equal((await call('GET', '/v1/boards/unlimited')).json.entries.length, 0);
  // The name is free again.
  assert.equal((await call('POST', '/v1/players', { body: { name: 'Leo' } })).status, 201);
});

test('admin: block hides a player, unblock brings them back, delete removes', async () => {
  const { call, join } = setup();
  const leo = await join('Leo');
  const ben = await join('Ben');
  await call('PUT', '/v1/boards/unlimited/score', { token: leo.token, body: { score: 900, cars: 10 } });
  await call('PUT', '/v1/boards/unlimited/score', { token: ben.token, body: { score: 500, cars: 10 } });

  assert.equal((await call('GET', '/v1/admin/players')).status, 401);
  assert.equal((await call('GET', '/v1/admin/players', { token: 'wrong' })).status, 401);
  const found = await call('GET', '/v1/admin/players?q=le', { token: ADMIN });
  assert.deepEqual(found.json.players.map((p: { name: string }) => p.name), ['Leo']);

  await call('PATCH', `/v1/admin/players/${leo.id}`, { token: ADMIN, body: { banned: true } });
  const hidden = await call('GET', '/v1/boards/unlimited', { token: ben.token });
  assert.deepEqual(hidden.json.entries.map((e: { name: string }) => e.name), ['Ben']);
  assert.equal(hidden.json.me.rank, 1);
  assert.equal((await call('GET', '/v1/me', { token: leo.token })).status, 403);

  await call('PATCH', `/v1/admin/players/${leo.id}`, { token: ADMIN, body: { banned: false } });
  assert.equal((await call('GET', '/v1/boards/unlimited')).json.entries.length, 2);

  assert.equal((await call('DELETE', `/v1/admin/scores/unlimited/${leo.id}`, { token: ADMIN })).status, 204);
  assert.deepEqual((await call('GET', '/v1/boards/unlimited')).json.entries.map((e: { name: string }) => e.name), ['Ben']);

  const renamed = await call('PATCH', `/v1/admin/players/${ben.id}`, { token: ADMIN, body: { name: 'Benjamin' } });
  assert.equal(renamed.json.player.name, 'Benjamin');

  assert.equal((await call('DELETE', `/v1/admin/players/${ben.id}`, { token: ADMIN })).status, 204);
  assert.equal((await call('GET', '/v1/boards/unlimited')).json.entries.length, 0);
});

test('without ADMIN_TOKEN the admin routes do not exist', async () => {
  const { call } = setup({ ADMIN_TOKEN: '' });
  assert.equal((await call('GET', '/v1/admin/players', { token: ADMIN })).status, 404);
});

test('CORS follows CORS_ORIGINS', async () => {
  const { call } = setup({ CORS_ORIGINS: 'https://game.example' });
  const app = await call('GET', '/v1/boards');
  assert.equal(app.headers.get('access-control-allow-origin'), null);
  const { db, config } = { db: openDb(':memory:'), config: readConfig({ DB_PATH: ':memory:', CORS_ORIGINS: 'https://game.example' }) };
  const web = createApp({ db, config });
  const allowed = await web.request('/v1/boards', { headers: { origin: 'https://game.example' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://game.example');
  const foreign = await web.request('/v1/boards', { headers: { origin: 'https://evil.example' } });
  assert.equal(foreign.headers.get('access-control-allow-origin'), null);
});

test('bodies that are too large are refused', async () => {
  const { call, join } = setup();
  const { token } = await join('Leo');
  const r = await call('PUT', '/v1/boards/unlimited/score', { token, body: { score: 1, cars: 1, junk: 'x'.repeat(10_000) } });
  assert.equal(r.status, 413);
});

test('migrations run once and survive a restart on the same file', async () => {
  const { openDb: open } = await import('../src/db.ts');
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join: path } = await import('node:path');
  const dir = mkdtempSync(path(tmpdir(), 'cg-'));
  try {
    const file = path(dir, 'nested', 'test.db');
    const config = readConfig({ DB_PATH: file });
    const first = open(file);
    const app1 = createApp({ db: first, config });
    const created = await app1.request('/v1/players', { method: 'POST', body: JSON.stringify({ name: 'Leo' }), headers: { 'content-type': 'application/json' } });
    const { token } = (await created.json()) as { token: string };
    first.close();
    const second = open(file);
    const app2 = createApp({ db: second, config });
    const me = await app2.request('/v1/me', { headers: { authorization: `Bearer ${token}` } });
    assert.equal(me.status, 200);
    second.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
