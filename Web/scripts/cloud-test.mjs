// Cloud sync, the game's side against the real service (`Server/`, in memory, with a clock that moves on
// at every look, like a real one): what the player would see in Settings → Cloud sync.
// A file of its own because it switches the service on (`VITE_API_URL`), which the other tests leave off.
//   npm test
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

process.env.VITE_API_URL = 'http://service.test';
const { createApp } = await import('../../Server/src/app.ts');
const { readConfig } = await import('../../Server/src/config.ts');
const { openDb } = await import('../../Server/src/db.ts');

let clock = 1_700_000_000_000;
const app = createApp({ db: openDb(':memory:'), config: readConfig({ DB_PATH: ':memory:' }), now: () => clock++ });
globalThis.fetch = (url, init) => app.request(String(url).replace('http://service.test', ''), init);

const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.window = { setTimeout: () => 0, clearTimeout: () => undefined, setInterval: () => 0, addEventListener: () => undefined };
globalThis.document = { hidden: false, addEventListener: () => undefined };

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
after(() => server.close());
const { newSave } = await server.ssrLoadModule('/src/core/career.ts');
const { sealSave, SEAL_FIELD } = await server.ssrLoadModule('/src/storage/save.ts');
const { startCloud, createCloud, syncNow, cloudView } = await server.ssrLoadModule('/src/net/cloud.ts');

const save = newSave();
const taken = [];
startCloud({ save: () => save, notify: () => undefined, canTake: () => true, take: (s) => taken.push(s), ready: () => undefined });

test('cloud: the first change after turning it on goes up without a false conflict', async () => {
  const code = await createCloud();
  save.career.money += 500;
  await syncNow();
  assert.equal(cloudView().status, 'synced');
  assert.equal(cloudView().incoming, null);
  const stored = await app.request('/v1/sync', { headers: { authorization: `Bearer ${code}` } });
  assert.equal((await stored.json()).save.career.money, save.career.money);
});

test('cloud: progress another device sent is taken over when this one has nothing unsent', async () => {
  const code = cloudView().code;
  const headers = { authorization: `Bearer ${code}`, 'content-type': 'application/json' };
  const current = await (await app.request('/v1/sync', { headers })).json();
  const other = { ...current.save, career: { ...current.save.career, money: current.save.career.money + 1000 } };
  delete other[SEAL_FIELD];
  other[SEAL_FIELD] = sealSave(other);
  const put = await app.request('/v1/sync', { method: 'PUT', headers, body: JSON.stringify({ save: other, baseUpdatedAt: current.updatedAt }) });
  assert.equal(put.status, 200);
  await syncNow();
  assert.equal(taken.length, 1);
  assert.equal(taken[0].career.money, other.career.money);
  assert.equal(cloudView().status, 'synced');
});
