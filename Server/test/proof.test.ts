import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createApp } from '../src/app.ts';
import { readConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';
import { PROOF_FILE } from '../src/modules/leaderboard/proofModule.ts';

const ADMIN = 'a'.repeat(32);
const golden = JSON.parse(readFileSync(new URL('../../Web/scripts/proof-golden.json', import.meta.url), 'utf8')) as { proof: Record<string, unknown>; score: number };

function setup() {
  const db = openDb(':memory:');
  const app = createApp({ db, config: readConfig({ DB_PATH: ':memory:', ADMIN_TOKEN: ADMIN, TRUST_PROXY: 'true' }), now: () => 1_700_000_000_000 });
  const call = async (method: string, path: string, token: string, body?: unknown) => {
    const r = await app.request(path, {
      method,
      headers: { 'x-forwarded-for': '10.0.0.1', authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: r.status, json: await r.json() };
  };
  const join = async (name: string) => {
    const r = await app.request('/v1/players', { method: 'POST', headers: { 'x-forwarded-for': '10.1.0.1', 'content-type': 'application/json' }, body: JSON.stringify({ name }) });
    return ((await r.json()) as { token: string }).token;
  };
  const flags = async () => ((await call('GET', '/v1/admin/flags', ADMIN)).json as { flags: { reason: string; claimed: number; replayed: number | null }[] }).flags;
  return { call, join, flags };
}

const bundled = existsSync(PROOF_FILE);
const skip = bundled ? false : 'run `npm run build:proof` in Web/ first';

test('a proof that replays to the claimed score is not flagged', { skip }, async () => {
  const { call, join, flags } = setup();
  const token = await join('Honest');
  const r = await call('PUT', '/v1/boards/unlimited/score', token, { score: golden.score, cars: 70, proof: golden.proof });
  assert.equal(r.status, 200);
  assert.deepEqual(await flags(), []);
});

test('a proof that does not match the claimed score is flagged, the score still counts', { skip }, async () => {
  const { call, join, flags } = setup();
  const token = await join('Faker');
  const r = await call('PUT', '/v1/boards/unlimited/score', token, { score: golden.score + 500, cars: 70, proof: golden.proof });
  assert.equal(r.status, 200);
  assert.equal((r.json as { accepted: boolean }).accepted, true);
  const flag = (await flags())[0]!;
  assert.equal(flag.reason, 'mismatch');
  assert.equal(flag.claimed, golden.score + 500);
  assert.equal(flag.replayed, golden.score);
});

test('a top score without proof is flagged, a malformed proof is flagged invalid', { skip }, async () => {
  const { call, join, flags } = setup();
  const a = await join('NoProof');
  await call('PUT', '/v1/boards/unlimited/score', a, { score: 3000, cars: 30 });
  const b = await join('Garbage');
  await call('PUT', '/v1/boards/unlimited/score', b, { score: 4000, cars: 40, proof: { events: 'x' } });
  assert.deepEqual((await flags()).map((f) => f.reason).sort(), ['invalid', 'no_proof']);
});

test('a daily proof with a seed that is not the day\'s is invalid', { skip }, async () => {
  const { call, join, flags } = setup();
  const token = await join('Seeder');
  const day = Math.floor(1_700_000_000_000 / 86_400_000);
  await call('PUT', '/v1/boards/daily/score', token, { score: 900, day, proof: { ...golden.proof, mode: 'daily', day } });
  assert.deepEqual((await flags()).map((f) => f.reason), ['invalid']);
});
