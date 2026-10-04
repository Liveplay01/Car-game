import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.ts';
import { readConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import { INVITE_LEVEL, MAX_REWARDED_INVITES, NEW_PLAYER_DAYS } from '../src/modules/referrals/index.ts';

const DAY = 86_400_000;
const CHALLENGE = { code: 'WzEsMTIzNDUsMCw0MixbXSxbMCw0LDgsMTJdLFtdLFtdLDAsLTEsMTIzNDUsMCwtMV0', mode: 'shift', level: 42, target: 12345 };

function setup() {
  const clock = { now: 1_700_000_000_000 };
  const db = openDb(':memory:');
  const config = readConfig({ DB_PATH: ':memory:', TRUST_PROXY: 'true', CORS_ORIGINS: 'https://game.example.org' });
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
  /** A new player on their own address, so the sign-up limit never gets in the way. */
  const join = async (name: string) => {
    const made = await call('POST', '/v1/players', { body: { name }, ip: `10.9.${Math.floor(n / 250)}.${(n++ % 250) + 1}` });
    assert.equal(made.status, 201);
    const token = made.json.token as string;
    const info = await call('GET', '/v1/me/referral', { token });
    return { token, code: info.json.code as string };
  };
  const reach = (token: string, level: number) => call('PUT', '/v1/boards/shift-level/score', { token, body: { level, prestige: 0 } });
  const pending = async (token: string) => ((await call('GET', '/v1/me/rewards', { token })).json.rewards as { item: string; reason: string }[]).map((r) => `${r.item} ${r.reason}`);
  return { call, clock, join, reach, pending };
}

test('invite: both get a chest when the friend reaches level 5, and only once', async () => {
  const { call, join, reach, pending } = setup();
  const anna = await join('Anna');
  const ben = await join('Ben');

  const taken = await call('POST', '/v1/me/referral', { token: ben.token, body: { code: anna.code.toLowerCase() } });
  assert.equal(taken.status, 201);
  assert.deepEqual(taken.json.invitedBy, { name: 'Anna', done: false });

  // Not there yet: nothing is paid, and Anna sees Ben on the way.
  await reach(ben.token, INVITE_LEVEL - 1);
  assert.deepEqual(await pending(ben.token), []);
  const before = await call('GET', '/v1/me/referral', { token: anna.token });
  assert.deepEqual(before.json.invited.map((i: { name: string; done: boolean }) => [i.name, i.done]), [['Ben', false]]);

  await reach(ben.token, INVITE_LEVEL);
  assert.deepEqual(await pending(ben.token), ['chest:standard invite:welcome:Anna']);
  assert.deepEqual(await pending(anna.token), ['chest:standard invite:friend:Ben']);
  const after = await call('GET', '/v1/me/referral', { token: anna.token });
  assert.equal(after.json.done, 1);
  assert.equal(after.json.invited[0].done, true);

  // A better score later, or the same again, pays nothing more.
  await reach(ben.token, INVITE_LEVEL + 3);
  await reach(ben.token, INVITE_LEVEL + 3);
  assert.equal((await pending(ben.token)).length, 1);
  assert.equal((await pending(anna.token)).length, 1);
});

test('invite: handing in the code after the level was reached pays at once', async () => {
  const { call, join, reach, pending } = setup();
  const anna = await join('Anna');
  const ben = await join('Ben');
  // Ben played before he had a name: the score reached the service first.
  await reach(ben.token, 7);
  await call('POST', '/v1/me/referral', { token: ben.token, body: { code: anna.code } });
  const view = await call('GET', '/v1/me/referral', { token: ben.token });
  assert.equal(view.json.invitedBy.done, true);
  assert.equal((await pending(ben.token)).length, 1);
  assert.equal((await pending(anna.token)).length, 1);
});

test('invite: the inviter gets a Premium Chest on top for the 3rd friend', async () => {
  const { call, join, reach, pending } = setup();
  const anna = await join('Anna');
  for (const name of ['Ben', 'Cleo', 'Dora']) {
    const friend = await join(name);
    await call('POST', '/v1/me/referral', { token: friend.token, body: { code: anna.code } });
    await reach(friend.token, INVITE_LEVEL);
  }
  // Paid in the same moment, so the order is not part of the promise.
  const items = (await pending(anna.token)).map((r) => r.split(' ')[0]).sort();
  assert.deepEqual(items, ['chest:premium', 'chest:standard', 'chest:standard', 'chest:standard']);
});

test('invite: refused when it makes no sense', async () => {
  const { call, join, clock } = setup();
  const anna = await join('Anna');
  const ben = await join('Ben');
  const cleo = await join('Cleo');
  const post = (token: string, code: string) => call('POST', '/v1/me/referral', { token, body: { code } });

  assert.equal((await post(anna.token, 'nonsense')).json.error.code, 'invalid_code');
  assert.equal((await post(ben.token, 'ZZZZ-ZZZZ')).json.error.code, 'unknown_code');
  assert.equal((await post(anna.token, anna.code)).json.error.code, 'own_code');

  assert.equal((await post(ben.token, anna.code)).status, 201);
  // The same invite again is fine, another one is not, and nobody invites their own inviter.
  assert.equal((await post(ben.token, anna.code)).status, 200);
  assert.equal((await post(ben.token, cleo.code)).json.error.code, 'already_invited');
  assert.equal((await post(anna.token, ben.code)).json.error.code, 'invite_loop');

  // Old accounts are not new players.
  clock.now += (NEW_PLAYER_DAYS + 1) * DAY;
  const dora = await join('Dora');
  assert.equal((await post(cleo.token, anna.code)).json.error.code, 'not_new');
  assert.equal((await post(dora.token, anna.code)).status, 201);

  // Without a token there is no invite.
  assert.equal((await call('GET', '/v1/me/referral')).status, 401);
});

test('invite: past the cap the friend is still paid, the inviter is not', async () => {
  const { call, join, reach, pending } = setup();
  const anna = await join('Anna');
  let last = '';
  for (let i = 0; i < MAX_REWARDED_INVITES + 1; i++) {
    const friend = await join(`Friend${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + Math.floor(i / 26))}`);
    await call('POST', '/v1/me/referral', { token: friend.token, body: { code: anna.code } });
    await reach(friend.token, INVITE_LEVEL);
    last = friend.token;
  }
  assert.equal((await pending(last)).length, 1);
  const standard = (await pending(anna.token)).filter((r) => r.startsWith('chest:standard'));
  assert.equal(standard.length, MAX_REWARDED_INVITES);
});

test('invite: a friend who deletes their account leaves the list and pays nothing', async () => {
  const { call, join, pending } = setup();
  const anna = await join('Anna');
  const ben = await join('Ben');
  await call('POST', '/v1/me/referral', { token: ben.token, body: { code: anna.code } });
  await call('DELETE', '/v1/me', { token: ben.token });
  assert.deepEqual((await call('GET', '/v1/me/referral', { token: anna.token })).json.invited, []);
  assert.deepEqual(await pending(anna.token), []);
});

test('invite page: the name in the preview, and never a dead end', async () => {
  const { call, join } = setup();
  const anna = await join('Anna');
  const code = anna.code.replace('-', '');

  const page = await call('GET', `/i/${code}`);
  assert.equal(page.status, 200);
  assert.match(page.text, /Anna invited you to Roundabout Timing/);
  assert.match(page.text, new RegExp(`url=https://game\\.example\\.org/\\?ref=${code}`));
  assert.match(page.text, /og-image\.jpg/);

  // An unknown code goes to the game all the same, without the invite.
  const unknown = await call('GET', '/i/ZZZZZZZZ');
  assert.equal(unknown.status, 200);
  assert.match(unknown.text, /url=https:\/\/game\.example\.org\/"/);
  assert.doesNotMatch(unknown.text, /[?&]ref=/);

  // Markup in the address is just a code that does not exist.
  assert.match((await call('GET', '/i/%3Cscript%3E')).text, /url=https:\/\/game\.example\.org\//);
});

test('a shared challenge carries its sender as the invite', async () => {
  const { call, join } = setup();
  const anna = await join('Anna');
  const made = await call('POST', '/v1/challenges', { body: CHALLENGE, token: anna.token });
  const page = await call('GET', `/c/${made.json.id}`);
  assert.match(page.text, new RegExp(`/\\?ref=${anna.code.replace('-', '')}#challenge=`));

  // From a guest there is nobody to invite with.
  const guest = await call('POST', '/v1/challenges', { body: { ...CHALLENGE, code: `${CHALLENGE.code}x` } });
  assert.doesNotMatch((await call('GET', `/c/${guest.json.id}`)).text, /[?&]ref=/);
});
