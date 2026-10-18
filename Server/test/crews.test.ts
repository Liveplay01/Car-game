import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.ts';
import { readConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import { CREW_MAX, GIFTS_PER_DAY, XP_PER_DAY } from '../src/modules/crews/store.ts';
import { GOAL_PER_MEMBER, GROUP_SIZE, botsOf, moveOf, weekOf, weekStart } from '../src/modules/crews/league.ts';

const DAY = 86_400_000;

function setup() {
  // A Monday noon, so a week is ahead.
  const clock = { now: weekStart(weekOf(1_760_000_000_000)) + DAY / 2 };
  const db = openDb(':memory:');
  const config = readConfig({ DB_PATH: ':memory:', TRUST_PROXY: 'true', CORS_ORIGINS: 'https://game.example.org', GAME_URL: 'https://game.example.org' });
  const app = createApp({ db, config, now: () => clock.now });
  let n = 0;
  const call = async (method: string, path: string, options: { token?: string; body?: unknown; ip?: string } = {}) => {
    const headers: Record<string, string> = { 'x-forwarded-for': options.ip ?? '10.0.0.1' };
    if (options.token) headers.authorization = `Bearer ${options.token}`;
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    const response = await app.request(path, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
    const text = await response.text();
    return { status: response.status, json: text.startsWith('{') ? JSON.parse(text) : null, text };
  };
  const join = async (name: string) => {
    const made = await call('POST', '/v1/players', { body: { name }, ip: `10.9.${Math.floor(n / 250)}.${(n++ % 250) + 1}` });
    assert.equal(made.status, 201);
    return { token: made.json.token as string, id: made.json.player.id as string };
  };
  const pending = async (token: string) => ((await call('GET', '/v1/me/rewards', { token })).json.rewards as { item: string; reason: string }[]).map((r) => `${r.item} ${r.reason}`);
  return { call, clock, join, pending };
}

test('crews: found, invite by link, join, rename once in 30 days, leave', async () => {
  const { call, clock, join } = setup();
  const anna = await join('Anna');
  const ben = await join('Ben');
  assert.deepEqual((await call('GET', '/v1/crews', { token: anna.token })).json, { crew: null });
  assert.equal((await call('POST', '/v1/crews', { token: anna.token, body: { name: 'xx' } })).status, 422);
  const made = await call('POST', '/v1/crews', { token: anna.token, body: { name: 'Night Shift' } });
  assert.equal(made.status, 201);
  const crew = made.json.crew;
  assert.equal(crew.name, 'Night Shift');
  assert.equal(crew.owner, true);
  assert.match(crew.link, /\/k\/[A-Z0-9]{8}\?by=[A-Z0-9]{8}$/);

  clock.now += 1000;
  const preview = await call('GET', `/v1/crews/preview/${crew.code}`);
  assert.deepEqual(preview.json.crew, { name: 'Night Shift', members: 1, max: CREW_MAX, full: false, league: 'bronze' });
  const joined = await call('POST', '/v1/crews/join', { token: ben.token, body: { code: crew.code.toLowerCase() } });
  assert.equal(joined.status, 201);
  assert.deepEqual(joined.json.crew.members.map((m: { name: string; owner: boolean }) => [m.name, m.owner]), [['Anna', true], ['Ben', false]]);

  // The first rename is free; the next waits 30 days, and only the founder may.
  assert.equal((await call('PATCH', '/v1/crews', { token: ben.token, body: { name: 'Bens Crew' } })).status, 403);
  assert.equal((await call('PATCH', '/v1/crews', { token: anna.token, body: { name: 'Day Shift' } })).status, 200);
  assert.equal((await call('PATCH', '/v1/crews', { token: anna.token, body: { name: 'Late Shift' } })).status, 429);
  clock.now += 31 * DAY;
  assert.equal((await call('PATCH', '/v1/crews', { token: anna.token, body: { name: 'Late Shift' } })).json.crew.name, 'Late Shift');

  // The founder leaves: the crew passes on; the last one out closes it.
  await call('POST', '/v1/crews/leave', { token: anna.token });
  assert.equal((await call('GET', '/v1/crews', { token: ben.token })).json.crew.owner, true);
  await call('POST', '/v1/crews/leave', { token: ben.token });
  assert.equal((await call('GET', `/v1/crews/preview/${crew.code}`)).status, 404);

  const page = await call('GET', `/k/${crew.code}`);
  assert.equal(page.status, 200, 'an old link still leads to the game');
});

test('crews: the week counts XP within limits, and the league settles it with chests', async () => {
  const { call, clock, join, pending } = setup();
  const anna = await join('Anna');
  const ben = await join('Ben');
  const crew = (await call('POST', '/v1/crews', { token: anna.token, body: { name: 'Night Shift' } })).json.crew;
  await call('POST', '/v1/crews/join', { token: ben.token, body: { code: crew.code } });
  assert.equal((await call('POST', '/v1/crews/xp', { token: anna.token, body: { xp: 601 } })).status, 422, 'more than a shift can earn');
  for (let i = 0; i < 6; i++) await call('POST', '/v1/crews/xp', { token: anna.token, body: { xp: 600 } });
  const view = (await call('GET', '/v1/crews', { token: ben.token })).json.crew;
  assert.equal(view.week.xp, XP_PER_DAY, 'a day has a limit');
  assert.equal(view.week.goal, 2 * GOAL_PER_MEMBER);
  assert.equal(view.week.table.length, GROUP_SIZE, 'computer crews fill the group');
  assert.ok(view.week.table.filter((s: { computer: boolean }) => s.computer).length === GROUP_SIZE - 1);
  assert.deepEqual(view.members.map((m: { xp: number }) => m.xp), [XP_PER_DAY, 0]);

  // A week later the crew is settled once: up a league for a big week, and the goal paid to who helped (Anna, not Ben).
  clock.now += 7 * DAY;
  const next = (await call('GET', '/v1/crews', { token: anna.token })).json.crew;
  assert.equal(next.last.move, 1);
  assert.equal(next.week.league, 'silver');
  assert.deepEqual((await pending(anna.token)).sort(), ['chest:premium crew:up:silver', 'chest:standard crew:goal']);
  assert.deepEqual(await pending(ben.token), []);
  await call('GET', '/v1/crews', { token: anna.token });
  assert.equal((await pending(anna.token)).length, 2, 'settled once');
});

test('crews: gifts to the crew go to whoever is first; gifts to one member only to them; old ones go back', async () => {
  const { call, clock, join, pending } = setup();
  const [anna, ben, cleo] = [await join('Anna'), await join('Ben'), await join('Cleo')];
  const crew = (await call('POST', '/v1/crews', { token: anna.token, body: { name: 'Night Shift' } })).json.crew;
  for (const p of [ben, cleo]) await call('POST', '/v1/crews/join', { token: p.token, body: { code: crew.code } });
  assert.equal((await call('POST', '/v1/crews/gifts', { token: anna.token, body: { item: 'money:7', to: null } })).status, 422);
  await call('POST', '/v1/crews/gifts', { token: anna.token, body: { item: 'chest:premium', to: null } });
  await call('POST', '/v1/crews/gifts', { token: anna.token, body: { item: 'money:25000', to: cleo.id } });
  assert.equal((await call('GET', '/v1/crews', { token: anna.token })).json.crew.gifts.length, 0, 'not your own');
  const forBen = (await call('GET', '/v1/crews', { token: ben.token })).json.crew.gifts;
  assert.deepEqual(forBen.map((g: { item: string }) => g.item), ['chest:premium']);
  const forCleo = (await call('GET', '/v1/crews', { token: cleo.token })).json.crew.gifts;
  assert.equal(forCleo.length, 2);
  assert.equal((await call('POST', `/v1/crews/gifts/${forBen[0].id}/claim`, { token: ben.token })).status, 200);
  assert.equal((await call('POST', `/v1/crews/gifts/${forBen[0].id}/claim`, { token: cleo.token })).status, 409, 'first come, first served');
  assert.deepEqual(await pending(ben.token), ['chest:premium crew:gift:crew:Anna']);

  // Profiles show a member's boards and week.
  await call('PUT', '/v1/boards/shift-level/score', { token: cleo.token, body: { level: 12, prestige: 0 } });
  const profile = (await call('GET', `/v1/crews/members/${cleo.id}`, { token: anna.token })).json.member;
  assert.equal(profile.name, 'Cleo');
  assert.deepEqual(profile.boards.map((b: { board: string; rank: number }) => [b.board, b.rank]), [['shift-level', 1]]);

  // Cleo never takes hers: after a week it goes back to Anna.
  clock.now += 8 * DAY;
  await call('GET', '/v1/crews', { token: cleo.token });
  assert.deepEqual(await pending(anna.token), ['money:25000 crew:back']);

  for (let i = 0; i < GIFTS_PER_DAY; i++) await call('POST', '/v1/crews/gifts', { token: ben.token, body: { item: 'money:5000', to: null } });
  assert.equal((await call('POST', '/v1/crews/gifts', { token: ben.token, body: { item: 'money:5000', to: null } })).status, 429);
});

test('league: computer crews grow over the week, the same for everyone; places move crews', () => {
  const week = weekOf(1_760_000_000_000);
  const start = weekStart(week);
  const early = botsOf(week, 1, 0, 4, start + DAY);
  const late = botsOf(week, 1, 0, 4, start + 6 * DAY);
  assert.deepEqual(early.map((b) => b.name), late.map((b) => b.name));
  assert.ok(early.every((b, i) => b.xp <= late[i]!.xp));
  assert.deepEqual(botsOf(week, 1, 0, 4, start + DAY), early);
  assert.equal(moveOf(0, 10, 0, 50), 1);
  assert.equal(moveOf(0, 10, 0, 0), 0, 'no XP, no promotion');
  assert.equal(moveOf(9, 10, 0, 0), 0, 'Bronze is the floor');
  assert.equal(moveOf(9, 10, 2, 0), -1);
  assert.equal(moveOf(0, 10, 4, 99), 0, 'Diamond is the top');
});
