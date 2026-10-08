import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createECDH, randomBytes } from 'node:crypto';
import { createApp, modules } from '../src/app.ts';
import { readConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import { COMEBACK_DAYS, pushModule } from '../src/modules/push/index.ts';
import { newVapidKeys } from '../src/modules/push/webpush.ts';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** A browser's subscription: a real key pair, so the message could be encrypted for it. */
function browser(n: number) {
  const ecdh = createECDH('prime256v1');
  return { endpoint: `https://fcm.googleapis.com/fcm/send/device-${n}`, p256dh: ecdh.generateKeys().toString('base64url'), auth: randomBytes(16).toString('base64url') };
}

function setup(options: { vapid?: boolean } = {}) {
  // Noon UTC; the devices below are on UTC unless they say otherwise.
  const clock = { now: Date.UTC(2026, 9, 8, 12) };
  const db = openDb(':memory:');
  const keys = newVapidKeys();
  const env: Record<string, string> = { DB_PATH: ':memory:', TRUST_PROXY: 'true', CORS_ORIGINS: 'https://game.example.org' };
  if (options.vapid ?? true) Object.assign(env, { VAPID_PUBLIC_KEY: keys.publicKey, VAPID_PRIVATE_KEY: keys.privateKey });
  const outbox: { endpoint: string; message: { title: string; body: string; tag: string; url: string } }[] = [];
  const status = { next: 201 };
  const push = pushModule({
    every: null,
    send: async (target, payload) => {
      outbox.push({ endpoint: target.endpoint, message: JSON.parse(payload) });
      return status.next;
    },
  });
  const app = createApp({ db, config: readConfig(env), now: () => clock.now, modules: modules().map((m) => (m.name === 'push' ? push : m)) });
  let n = 0;
  const call = async (method: string, path: string, o: { token?: string; body?: unknown } = {}) => {
    const headers: Record<string, string> = { 'x-forwarded-for': `10.1.0.${(n++ % 250) + 1}` };
    if (o.token) headers.authorization = `Bearer ${o.token}`;
    if (o.body !== undefined) headers['content-type'] = 'application/json';
    const response = await app.request(path, { method, headers, body: o.body === undefined ? undefined : JSON.stringify(o.body) });
    const text = await response.text();
    return { status: response.status, json: text.startsWith('{') ? JSON.parse(text) : null };
  };
  const join = async (name: string) => (await call('POST', '/v1/players', { body: { name } })).json.token as string;
  const subscribe = (device: ReturnType<typeof browser>, o: { token?: string; tz?: number; timers?: unknown[] } = {}) =>
    call('PUT', '/v1/push', { token: o.token, body: { ...device, tz: o.tz ?? 0, timers: o.timers ?? [] } });
  const level = (token: string, l: number) => call('PUT', '/v1/boards/shift-level/score', { token, body: { level: l, prestige: 0 } });
  return { clock, call, join, subscribe, level, outbox, status, tick: () => push.tick(), keys };
}

const streak = (at: number) => ({ topic: 'streak', at, until: at + 6 * HOUR, title: 'Your streak', body: 'Day 5 ends at midnight.' });

test('push: the key is public, and without keys the server says notifications are off', async () => {
  const on = setup();
  assert.deepEqual((await on.call('GET', '/v1/push/key')).json, { key: on.keys.publicKey });
  const off = setup({ vapid: false });
  assert.equal((await off.call('GET', '/v1/push/key')).status, 404);
  assert.equal((await off.subscribe(browser(1))).status, 404);
});

test('push: only real push services, real keys and known timers are taken', async () => {
  const { subscribe, call } = setup();
  assert.equal((await subscribe({ ...browser(1), endpoint: 'https://evil.example.org/hook' })).status, 422);
  assert.equal((await subscribe({ ...browser(1), endpoint: 'http://fcm.googleapis.com/x' })).status, 422);
  assert.equal((await subscribe({ ...browser(1), p256dh: 'short' })).status, 422);
  assert.equal((await subscribe(browser(1), { timers: [{ topic: 'rank', at: Date.now(), title: 'x', body: 'y' }] })).status, 422);
  assert.equal((await subscribe(browser(1), { tz: 2000 })).status, 422);
  assert.equal((await call('PUT', '/v1/push', { body: { ...browser(1), tz: 0, home: 'https://evil.example.org' } })).status, 422);
  assert.equal((await subscribe({ ...browser(1), endpoint: 'https://web.push.apple.com/QGx' })).status, 200);
});

test('push: a reminder goes at its time, never at night, and a missed one is dropped', async () => {
  const { clock, subscribe, tick, outbox } = setup();
  const evening = Date.UTC(2026, 9, 8, 18);
  const made = await subscribe(browser(1), { timers: [streak(evening)] });
  assert.deepEqual(made.json.timers, [{ topic: 'streak', at: evening }]);
  assert.equal(await tick(), 0);
  clock.now = evening;
  assert.equal(await tick(), 1);
  assert.deepEqual(outbox[0]!.message, { title: 'Your streak', body: 'Day 5 ends at midnight.', tag: 'streak', url: '/' });
  assert.equal(await tick(), 0, 'sent once');

  // Due at 22:00 on the device: it waits for the morning, and is gone if that is too late.
  const late = Date.UTC(2026, 9, 9, 22);
  await subscribe(browser(2), { timers: [streak(late)] });
  clock.now = late;
  assert.equal(await tick(), 0);
  clock.now = late + 11 * HOUR;
  assert.equal(await tick(), 0);
  assert.equal(outbox.length, 1);
});

test('push: the hour is the device\'s own', async () => {
  const { clock, subscribe, tick } = setup();
  // 19:30 UTC is 21:30 in Berlin's summer time: too late there, still fine in London.
  clock.now = Date.UTC(2026, 9, 8, 19, 30);
  const gift = { topic: 'gift', at: clock.now, title: 'Free chest', body: 'Your chest is ready.' };
  await subscribe(browser(1), { tz: 120, timers: [gift] });
  await subscribe(browser(2), { tz: 60, timers: [gift] });
  assert.equal(await tick(), 1);
});

test('push: one a day at most, only the streak may come on top', async () => {
  const { clock, subscribe, tick, outbox } = setup();
  const device = browser(1);
  const now = clock.now;
  await subscribe(device, { timers: [{ topic: 'gift', at: now, title: 'Free chest', body: 'Your chest is ready.' }, { topic: 'pass', at: now, title: 'New pass', body: 'Winter is here.' }, streak(now + 6 * HOUR)] });
  assert.equal(await tick(), 1);
  assert.equal(outbox[0]!.message.tag, 'gift', 'the more important one first');
  clock.now = now + 6 * HOUR;
  assert.equal(await tick(), 1);
  assert.equal(outbox[1]!.message.tag, 'streak');
  // The streak counts too: the next one waits 20 hours from it.
  clock.now = now + 25 * HOUR;
  assert.equal(await tick(), 0);
  clock.now = now + 26 * HOUR;
  assert.equal(await tick(), 1);
  assert.equal(outbox[2]!.message.tag, 'pass');
});

test('push: a browser that dropped the subscription is forgotten; a busy push service gets another try', async () => {
  const { clock, subscribe, tick, status, call } = setup();
  const device = browser(1);
  await subscribe(device, { timers: [{ topic: 'gift', at: clock.now, title: 'Free chest', body: 'Your chest is ready.' }] });
  status.next = 503;
  assert.equal(await tick(), 0);
  status.next = 201;
  clock.now += 16 * 60_000;
  assert.equal(await tick(), 1);
  await subscribe(device, { timers: [{ topic: 'gift', at: clock.now, title: 'Free chest', body: 'Your chest is ready.' }] });
  status.next = 410;
  clock.now += DAY;
  await tick();
  // Gone: a fresh subscribe brings it back with nothing waiting.
  status.next = 201;
  assert.deepEqual((await subscribe(device)).json.timers, []);
  assert.equal((await call('DELETE', '/v1/push', { body: { endpoint: device.endpoint } })).status, 204);
});

test('push: days away bring a nudge per step, and coming back resets them', async () => {
  const { clock, subscribe, tick, outbox } = setup();
  const device = browser(1);
  await subscribe(device);
  const start = clock.now;
  for (const days of COMEBACK_DAYS) {
    clock.now = start + days * DAY;
    assert.equal(await tick(), 1, `after ${days} days`);
    assert.equal(await tick(), 0);
  }
  clock.now = start + 60 * DAY;
  assert.equal(await tick(), 0, 'then quiet');
  assert.equal(new Set(outbox.map((o) => o.message.title)).size, COMEBACK_DAYS.length);
  await subscribe(device);
  clock.now += COMEBACK_DAYS[0] * DAY;
  assert.equal(await tick(), 1);
});

test('push: passed in the top 20, you hear who did it; below it, or by someone still behind, you do not', async () => {
  const { clock, join, subscribe, level, tick, outbox } = setup();
  const anna = await join('Anna');
  const ben = await join('Ben');
  const cara = await join('Cara');
  await level(anna, 30);
  await level(ben, 20);
  await subscribe(browser(1), { token: anna });
  await level(cara, 25);
  assert.equal(await tick(), 0, 'Cara is still behind Anna');
  await level(cara, 31);
  assert.equal(await tick(), 1);
  assert.equal(outbox[0]!.message.body, 'Cara passed you on the Shift level board. You are #2 now. Take it back?');
  // Anna takes it back; Ben passing nobody she cares about changes nothing.
  clock.now += DAY;
  await level(anna, 32);
  await level(ben, 21);
  assert.equal(await tick(), 0);
});

test('push: an invite\'s chest waiting on the server is announced once', async () => {
  const { clock, call, join, subscribe, level, tick, outbox } = setup();
  const anna = await join('Anna');
  const ben = await join('Ben');
  const code = (await call('GET', '/v1/me/referral', { token: anna })).json.code as string;
  await call('POST', '/v1/me/referral', { token: ben, body: { code } });
  await subscribe(browser(1), { token: anna });
  clock.now += 60_000;
  await level(ben, 5);
  assert.equal(await tick(), 1);
  assert.equal(outbox[0]!.message.body, 'Ben reached level 5 with your invite. Your chest is waiting.');
  assert.equal(await tick(), 0);
});

test('push: a tap opens the game where the device started it (the Play Store app keeps its mark)', async () => {
  const { clock, call, tick, outbox } = setup();
  const gift = { topic: 'gift', at: clock.now, title: 'Free chest', body: 'Your chest is ready.' };
  await call('PUT', '/v1/push', { body: { ...browser(1), tz: 0, home: '/?googleplaystore', timers: [gift] } });
  assert.equal(await tick(), 1);
  assert.equal(outbox[0]!.message.url, '/?googleplaystore');
});
