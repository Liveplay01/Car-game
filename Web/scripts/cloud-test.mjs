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
const { createAccount, deleteAccount, loadAccount, syncScores, fetchBoard, due } = await server.ssrLoadModule('/src/net/leaderboard.ts');

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

const casinoRecords = (casinoProfit) => ({ level: 7, prestige: 0, unlimitedBest: 0, unlimitedCars: 0, dailyDay: -1, dailyScore: 0, rushBest: 0, casinoProfit, title: null });

test('ranks: the casino profit reaches the Casino board and follows it down', async () => {
  await createAccount('Lucky Ace');
  await syncScores(casinoRecords(12_000));
  const board = await fetchBoard('casino');
  assert.deepEqual(board.entries.map((e) => [e.name, e.score, e.me]), [['Lucky Ace', 12_000, true]]);
  await syncScores(casinoRecords(5_000));
  assert.equal((await fetchBoard('casino')).me.score, 5_000, 'the board holds the profit as it is now (15.10.2026), not the best one');
  await deleteAccount(loadAccount());
});

test('ranks: a service without the Casino board yet holds back neither the other records nor the title', async () => {
  await createAccount('Old Table');
  const real = globalThis.fetch;
  const asked = [];
  globalThis.fetch = (url, init) => {
    asked.push(String(url));
    if (!String(url).includes('/boards/casino')) return real(url, init);
    return Promise.resolve(new Response(JSON.stringify({ error: { code: 'unknown_board', message: 'There is no such leaderboard.' } }), { status: 404, headers: { 'content-type': 'application/json' } }));
  };
  try {
    await syncScores({ ...casinoRecords(9_000), title: 'veteran' });
  } finally {
    globalThis.fetch = real;
  }
  assert.ok(asked.some((u) => u.includes('/boards/casino/score')), 'the casino profit was offered');
  assert.ok(asked.some((u) => u.endsWith('/v1/me/title')), 'the title went up after it');
  assert.equal((await fetchBoard('shift-level')).me.score, 7, 'the level is on its board');
  assert.ok(!due(casinoRecords(9_000)).some(([board]) => board === 'casino'), 'the missing board is not asked again on every save');
  await deleteAccount(loadAccount());
});
