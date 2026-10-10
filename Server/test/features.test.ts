import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.ts';
import { normalizeCode, randomCode } from '../src/codes.ts';
import { readConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import { purgeIdleSaves } from '../src/modules/sync/index.ts';
import { ScoreStore } from '../src/modules/leaderboard/store.ts';

const ADMIN = 'a'.repeat(32);

function setup(env: Record<string, string> = {}) {
  const clock = { now: 1_700_000_000_000 };
  const db = openDb(':memory:');
  const config = readConfig({ DB_PATH: ':memory:', ADMIN_TOKEN: ADMIN, TRUST_PROXY: 'true', ...env });
  const app = createApp({ db, config, now: () => clock.now });
  let ip = 1;
  const call = async (method: string, path: string, options: { token?: string; body?: unknown; ip?: string } = {}) => {
    const headers: Record<string, string> = { 'x-forwarded-for': options.ip ?? '10.0.0.1' };
    if (options.token) headers.authorization = `Bearer ${options.token}`;
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    const response = await app.request(path, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
    const text = await response.text();
    return { status: response.status, headers: response.headers, json: text.startsWith('{') ? JSON.parse(text) : null };
  };
  const join = async (name: string): Promise<{ token: string; id: string }> => {
    ip += 1;
    const r = await call('POST', '/v1/players', { body: { name }, ip: `10.1.0.${ip}` });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    return { token: r.json.token, id: r.json.player.id };
  };
  return { call, join, clock, db };
}

const SAVE = { version: 2, career: { level: 5, money: 100 } };

test('codes: no look-alike characters, any spelling is read, wrong ones are not', () => {
  for (let i = 0; i < 200; i++) assert.match(randomCode(12), /^[A-HJKMNP-Z2-9]{12}$/);
  assert.equal(normalizeCode(' k7m2-9qxa ', 8), 'K7M29QXA');
  assert.equal(normalizeCode('K7M2-9QXA-4TFB', 8), null, 'too long for a friend code');
  assert.equal(normalizeCode('K7M2-9QX0', 8), null, '0 is not in the alphabet');
});

test('sync: a save is stored under a new code and comes back on another device', async () => {
  const { call } = setup();
  const made = await call('POST', '/v1/sync', { body: { save: SAVE } });
  assert.equal(made.status, 201);
  assert.match(made.json.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);

  // Typed in lower case, without dashes, from another address: still the same save.
  const typed = made.json.code.toLowerCase().replaceAll('-', '');
  const got = await call('GET', '/v1/sync', { token: typed, ip: '10.9.9.9' });
  assert.equal(got.status, 200);
  assert.deepEqual(got.json.save, SAVE);
  assert.equal(got.json.updatedAt, made.json.updatedAt);

  // The game asks often with the version it has: unchanged, the answer leaves the save out.
  const same = await call('GET', `/v1/sync?have=${made.json.updatedAt}`, { token: typed, ip: '10.9.9.9' });
  assert.equal(same.status, 200);
  assert.deepEqual(same.json, { updatedAt: made.json.updatedAt });
  const older = await call('GET', `/v1/sync?have=${made.json.updatedAt - 1}`, { token: typed, ip: '10.9.9.9' });
  assert.deepEqual(older.json.save, SAVE);
});

test('sync: a copy nobody has opened for 200 days is deleted; opening or saving keeps it', async () => {
  const { call, clock, db } = setup();
  const day = 86_400_000;
  const idle = await call('POST', '/v1/sync', { body: { save: SAVE }, ip: '10.4.0.1' });
  const reader = await call('POST', '/v1/sync', { body: { save: SAVE }, ip: '10.4.0.2' });
  const writer = await call('POST', '/v1/sync', { body: { save: SAVE }, ip: '10.4.0.3' });
  clock.now += 150 * day;
  // The game on screen asks for the save; another device saves.
  await call('GET', `/v1/sync?have=${reader.json.updatedAt}`, { token: reader.json.code, ip: '10.4.1.1' });
  const put = await call('PUT', '/v1/sync', { token: writer.json.code, body: { save: SAVE, baseUpdatedAt: writer.json.updatedAt }, ip: '10.4.1.2' });
  assert.equal(put.status, 200);
  clock.now += 100 * day;
  assert.equal(purgeIdleSaves(db, clock.now), 1, 'only the copy nobody touched goes');
  assert.equal((await call('GET', '/v1/sync', { token: idle.json.code, ip: '10.4.2.1' })).status, 404);
  assert.equal((await call('GET', '/v1/sync', { token: reader.json.code, ip: '10.4.2.2' })).status, 200);
  assert.equal((await call('GET', '/v1/sync', { token: writer.json.code, ip: '10.4.2.3' })).status, 200);
  clock.now += 199 * day;
  assert.equal(purgeIdleSaves(db, clock.now), 0, 'a copy that was opened 199 days ago stays');
  clock.now += 2 * day;
  assert.equal(purgeIdleSaves(db, clock.now), 2);
});

test('sync: wrong, unknown and missing codes are refused', async () => {
  const { call } = setup();
  assert.equal((await call('GET', '/v1/sync')).status, 401);
  assert.equal((await call('GET', '/v1/sync', { token: 'nonsense' })).status, 401);
  const unknown = await call('GET', '/v1/sync', { token: 'AAAA-AAAA-AAAA' });
  assert.equal(unknown.status, 404);
  assert.equal(unknown.json.error.code, 'unknown_code');
});

test('sync: a save must be an object and not too large', async () => {
  const { call } = setup();
  let n = 0;
  for (const save of [null, 5, 'x', [1]]) assert.equal((await call('POST', '/v1/sync', { body: { save }, ip: `10.2.0.${++n}` })).status, 422);
  assert.equal((await call('POST', '/v1/sync', { body: {}, ip: '10.2.1.1' })).status, 422);
  // A long career's save (best times for hundreds of levels) still fits.
  const big = { filler: 'x'.repeat(200 * 1024) };
  assert.equal((await call('POST', '/v1/sync', { body: { save: big }, ip: '10.2.1.3' })).status, 201);
  const huge = { filler: 'x'.repeat(600 * 1024) };
  assert.equal((await call('POST', '/v1/sync', { body: { save: huge }, ip: '10.2.1.2' })).status, 413);
});

test('sync: an update needs the version it builds on, otherwise it is a conflict', async () => {
  const { call, clock } = setup();
  const made = await call('POST', '/v1/sync', { body: { save: SAVE } });
  const token = made.json.code as string;

  clock.now += 5000;
  const next = { ...SAVE, career: { level: 6, money: 150 } };
  const put = await call('PUT', '/v1/sync', { token, body: { save: next, baseUpdatedAt: made.json.updatedAt } });
  assert.equal(put.status, 200);
  assert.ok(put.json.updatedAt > made.json.updatedAt);

  // A second device still at the old version must not overwrite quietly.
  const stale = await call('PUT', '/v1/sync', { token, body: { save: SAVE, baseUpdatedAt: made.json.updatedAt } });
  assert.equal(stale.status, 409);
  assert.equal(stale.json.error.code, 'conflict');
  assert.equal(stale.json.updatedAt, put.json.updatedAt);
  assert.deepEqual((await call('GET', '/v1/sync', { token })).json.save, next);

  // After looking at the cloud save it can decide to keep its own: building on the new version.
  const keep = await call('PUT', '/v1/sync', { token, body: { save: SAVE, baseUpdatedAt: stale.json.updatedAt } });
  assert.equal(keep.status, 200);
  assert.deepEqual((await call('GET', '/v1/sync', { token })).json.save, SAVE);

  assert.equal((await call('PUT', '/v1/sync', { token, body: { save: SAVE } })).status, 422, 'no base version');
});

test('sync: two saves in the same millisecond still get different versions', async () => {
  const { call } = setup();
  const made = await call('POST', '/v1/sync', { body: { save: SAVE } });
  const token = made.json.code as string;
  const a = await call('PUT', '/v1/sync', { token, body: { save: SAVE, baseUpdatedAt: made.json.updatedAt } });
  const b = await call('PUT', '/v1/sync', { token, body: { save: SAVE, baseUpdatedAt: a.json.updatedAt } });
  assert.ok(a.json.updatedAt > made.json.updatedAt && b.json.updatedAt > a.json.updatedAt);
});

test('sync: deleting removes the save; the limits hold', async () => {
  const { call } = setup();
  const made = await call('POST', '/v1/sync', { body: { save: SAVE } });
  const token = made.json.code as string;
  assert.equal((await call('DELETE', '/v1/sync', { token })).status, 204);
  assert.equal((await call('GET', '/v1/sync', { token })).status, 404);

  // Ten new codes an hour per address; guessing is limited too.
  for (let i = 0; i < 9; i++) assert.equal((await call('POST', '/v1/sync', { body: { save: SAVE } })).status, 201);
  assert.equal((await call('POST', '/v1/sync', { body: { save: SAVE } })).status, 429);
  for (let i = 0; i < 120; i++) await call('GET', '/v1/sync', { token: 'AAAA-AAAA-AAAA', ip: '10.7.7.7' });
  assert.equal((await call('GET', '/v1/sync', { token: 'AAAA-AAAA-AAAA', ip: '10.7.7.7' })).status, 429);
});

test('sync: the database holds only a hash of the code', async () => {
  const { call, db } = setup();
  const made = await call('POST', '/v1/sync', { body: { save: SAVE } });
  const raw = (made.json.code as string).replaceAll('-', '');
  const rows = db.prepare('SELECT code_hash FROM sync_saves').all() as { code_hash: string }[];
  assert.equal(rows.length, 1);
  assert.ok(!(rows[0]?.code_hash ?? '').includes(raw));
});

test('friends: a code, adding by code, and the list', async () => {
  const { call, join } = setup();
  const anna = await join('Anna');
  const ben = await join('Ben');

  assert.equal((await call('GET', '/v1/friends')).status, 401);
  const mine = await call('GET', '/v1/friends', { token: anna.token });
  assert.match(mine.json.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.deepEqual(mine.json.friends, []);
  assert.equal((await call('GET', '/v1/friends', { token: anna.token })).json.code, mine.json.code, 'the code stays');

  const bensCode = (await call('GET', '/v1/friends', { token: ben.token })).json.code as string;
  const added = await call('POST', '/v1/friends', { token: anna.token, body: { code: bensCode.toLowerCase().replace('-', ' ') } });
  assert.equal(added.status, 201);
  assert.deepEqual(added.json.friend, { id: ben.id, name: 'Ben' });
  // Adding again changes nothing.
  assert.equal((await call('POST', '/v1/friends', { token: anna.token, body: { code: bensCode } })).status, 201);
  assert.deepEqual((await call('GET', '/v1/friends', { token: anna.token })).json.friends, [{ id: ben.id, name: 'Ben' }]);
  // One way: Ben has not added Anna.
  assert.deepEqual((await call('GET', '/v1/friends', { token: ben.token })).json.friends, []);

  assert.equal((await call('POST', '/v1/friends', { token: anna.token, body: { code: mine.json.code } })).json.error.code, 'own_code');
  assert.equal((await call('POST', '/v1/friends', { token: anna.token, body: { code: 'AAAA-AAAA' } })).json.error.code, 'unknown_code');
  assert.equal((await call('POST', '/v1/friends', { token: anna.token, body: { code: 'oops' } })).json.error.code, 'invalid_code');
  assert.equal((await call('POST', '/v1/friends', { token: anna.token, body: {} })).status, 422);
});

test('friends: the board ranks only you and your friends', async () => {
  const { call, join, clock } = setup();
  const anna = await join('Anna');
  const ben = await join('Ben');
  const cleo = await join('Cleo');
  const dan = await join('Dan');
  const score = (who: { token: string }, points: number) => call('PUT', '/v1/boards/unlimited/score', { token: who.token, body: { score: points, cars: 30 } });
  await score(dan, 9000);
  clock.now += 1000;
  await score(ben, 4000);
  await score(cleo, 2000);
  await score(anna, 3000);

  for (const who of [ben, cleo]) {
    const code = (await call('GET', '/v1/friends', { token: who.token })).json.code as string;
    assert.equal((await call('POST', '/v1/friends', { token: anna.token, body: { code } })).status, 201);
  }

  const board = await call('GET', '/v1/friends/boards/unlimited', { token: anna.token });
  assert.equal(board.status, 200);
  assert.deepEqual(board.json.entries.map((e: { rank: number; name: string; me: boolean }) => [e.rank, e.name, e.me]), [[1, 'Ben', false], [2, 'Anna', true], [3, 'Cleo', false]]);
  assert.equal(board.json.me.rank, 2);
  assert.equal(board.json.friends, 2);
  assert.equal(board.json.entries[0].id, undefined, 'ids are not given out');
  // Dan is first on the global list but not Anna's friend.
  assert.equal((await call('GET', '/v1/boards/unlimited')).json.entries[0].name, 'Dan');

  assert.equal((await call('GET', '/v1/friends/boards/nope', { token: anna.token })).status, 404);
  assert.equal((await call('GET', '/v1/friends/boards/unlimited')).status, 401);

  // Alone, the board is just you; without a score, "me" is empty.
  const lonely = await join('Lonely');
  const empty = await call('GET', '/v1/friends/boards/unlimited', { token: lonely.token });
  assert.deepEqual(empty.json.entries, []);
  assert.equal(empty.json.me, null);
});

test('friends: removing, deleting an account and blocking take people off the list', async () => {
  const { call, join } = setup();
  const anna = await join('Anna');
  const ben = await join('Ben');
  const cleo = await join('Cleo');
  for (const who of [ben, cleo]) {
    const code = (await call('GET', '/v1/friends', { token: who.token })).json.code as string;
    await call('POST', '/v1/friends', { token: anna.token, body: { code } });
  }
  assert.equal((await call('DELETE', `/v1/friends/${ben.id}`, { token: anna.token })).status, 204);
  assert.deepEqual((await call('GET', '/v1/friends', { token: anna.token })).json.friends.map((f: { name: string }) => f.name), ['Cleo']);

  const cleoCode = (await call('GET', '/v1/friends', { token: cleo.token })).json.code as string;
  await call('PATCH', `/v1/admin/players/${cleo.id}`, { token: ADMIN, body: { banned: true } });
  assert.deepEqual((await call('GET', '/v1/friends', { token: anna.token })).json.friends, []);
  assert.equal((await call('POST', '/v1/friends', { token: anna.token, body: { code: cleoCode } })).status, 404, 'a blocked player cannot be added');
  await call('PATCH', `/v1/admin/players/${cleo.id}`, { token: ADMIN, body: { banned: false } });

  assert.equal((await call('DELETE', '/v1/me', { token: cleo.token })).status, 204);
  assert.deepEqual((await call('GET', '/v1/friends', { token: anna.token })).json.friends, []);
});

test('friends: the list has a limit and adding is rate limited', async () => {
  const { call, join, db } = setup();
  const anna = await join('Anna');
  const ben = await join('Ben');
  const bensCode = (await call('GET', '/v1/friends', { token: ben.token })).json.code as string;
  // 100 friends already (made directly: joining that many through the API would hit its own limits).
  const insert = db.prepare('INSERT INTO players (id, name, name_key, token_hash, created_at, renamed_at) VALUES (?, ?, ?, ?, 0, 0)');
  const link = db.prepare('INSERT INTO friends (player_id, friend_id, added_at) VALUES (?, ?, 0)');
  for (let i = 0; i < 100; i++) {
    insert.run(`p${i}`, `P${i}`, `p${i}`, `h${i}`);
    link.run(anna.id, `p${i}`);
  }
  const full = await call('POST', '/v1/friends', { token: anna.token, body: { code: bensCode } });
  assert.equal(full.status, 422);
  assert.equal(full.json.error.code, 'too_many_friends');

  const bob = await join('Bob');
  for (let i = 0; i < 20; i++) await call('POST', '/v1/friends', { token: bob.token, body: { code: 'AAAA-AAAA' } });
  assert.equal((await call('POST', '/v1/friends', { token: bob.token, body: { code: 'AAAA-AAAA' } })).status, 429);
});

test('rtc: STUN without a relay, a login with one, and a failing relay does not break it', async () => {
  const plain = setup();
  const none = await plain.call('GET', '/v1/rtc/ice');
  assert.equal(none.status, 200);
  assert.equal(none.json.relay, false);
  assert.ok(none.json.iceServers.every((s: { username?: string }) => !s.username));

  const original = globalThis.fetch;
  let asked = 0;
  let fail = false;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    asked += 1;
    assert.match(String(url), /\/turn\/keys\/KEY123\/credentials\/generate-ice-servers$/);
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer SECRET');
    if (fail) return new Response('nope', { status: 500 });
    return Response.json({ iceServers: [{ urls: ['stun:stun.cloudflare.com:3478'] }, { urls: ['turn:turn.cloudflare.com:3478?transport=udp'], username: 'u', credential: 'c' }] });
  }) as typeof fetch;
  try {
    const { call, clock } = setup({ CF_TURN_KEY_ID: 'KEY123', CF_TURN_API_TOKEN: 'SECRET' });
    const first = await call('GET', '/v1/rtc/ice');
    assert.equal(first.json.relay, true);
    const relays = first.json.iceServers.filter((s: { username?: string }) => s.username);
    assert.deepEqual(relays, [{ urls: ['turn:turn.cloudflare.com:3478?transport=udp'], username: 'u', credential: 'c' }]);
    await call('GET', '/v1/rtc/ice');
    assert.equal(asked, 1, 'one login serves many players for a while');

    clock.now += 2 * 3_600_000;
    fail = true;
    const down = await call('GET', '/v1/rtc/ice');
    assert.equal(down.status, 200);
    assert.equal(down.json.relay, false);
  } finally {
    globalThis.fetch = original;
  }
});

test('sync: the version the cloud answers on create is the stored one, also when the clock moves on between the two', async () => {
  let t = 1_700_000_000_000;
  const app = createApp({ db: openDb(':memory:'), config: readConfig({ DB_PATH: ':memory:' }), now: () => t++ });
  const send = (method: string, body: unknown, code?: string) =>
    app.request('/v1/sync', { method, headers: { 'content-type': 'application/json', ...(code ? { authorization: `Bearer ${code}` } : {}) }, body: JSON.stringify(body) });
  const made = (await (await send('POST', { save: SAVE })).json()) as { code: string; updatedAt: number };
  const put = await send('PUT', { save: SAVE, baseUpdatedAt: made.updatedAt }, made.code);
  assert.equal(put.status, 200, 'the first update builds on the version create answered');
});

test('leaderboard: daily lists older than a day either side of today are deleted, the others stay', async () => {
  const { call, join, db } = setup();
  const { token } = await join('Dayly');
  const day = Math.floor(1_700_000_000_000 / 86_400_000);
  assert.equal((await call('PUT', '/v1/boards/daily/score', { token, body: { score: 500, day } })).status, 200);
  const scores = new ScoreStore(db);
  assert.equal(scores.purgeDaily(day), 0, 'today stays');
  assert.equal(scores.purgeDaily(day + 1), 1, 'yesterday goes');
  assert.equal(scores.top('daily', `day:${day}`, 10).length, 0);
});
