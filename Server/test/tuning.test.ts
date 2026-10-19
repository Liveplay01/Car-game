import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.ts';
import { readConfig } from '../src/config.ts';
import { openDb } from '../src/db.ts';

const admin = 'secret-secret-secret-secret';

function setup() {
  const db = openDb(':memory:');
  const config = readConfig({ DB_PATH: ':memory:', TRUST_PROXY: 'true', CORS_ORIGINS: 'https://game.example.org', ADMIN_TOKEN: admin });
  const app = createApp({ db, config, now: () => 1_700_000_000_000 });
  return async (method: string, path: string, options: { token?: string; body?: unknown } = {}) => {
    const headers: Record<string, string> = { 'x-forwarded-for': '10.0.0.1' };
    if (options.token) headers.authorization = `Bearer ${options.token}`;
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    const response = await app.request(path, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
    return { status: response.status, json: (await response.json()) as { values: Record<string, number> } };
  };
}

test('tuning: the moderator sets numbers by name, the game reads them, {} goes back', async () => {
  const call = setup();
  assert.deepEqual((await call('GET', '/v1/tuning')).json.values, {});
  assert.equal((await call('PUT', '/v1/admin/tuning', { body: { values: { easeAfterLosses: 1 } } })).status, 401);
  assert.equal((await call('PUT', '/v1/admin/tuning', { token: admin, body: { values: { easeAfterLosses: '1' } } })).status, 422);
  assert.equal((await call('PUT', '/v1/admin/tuning', { token: admin, body: { values: { 'ease-after': 1 } } })).status, 422);
  assert.equal((await call('PUT', '/v1/admin/tuning', { token: admin, body: { values: [1] } })).status, 422);

  assert.equal((await call('PUT', '/v1/admin/tuning', { token: admin, body: { values: { easeAfterLosses: 1, easeTempoStep: 0.07 } } })).status, 200);
  assert.deepEqual((await call('GET', '/v1/tuning')).json.values, { easeAfterLosses: 1, easeTempoStep: 0.07 });
  assert.deepEqual((await call('PUT', '/v1/admin/tuning', { token: admin, body: { values: { adChestsPerDay: 4 } } })).json.values, { adChestsPerDay: 4 });
  assert.deepEqual((await call('PUT', '/v1/admin/tuning', { token: admin, body: { values: {} } })).json.values, {});
  assert.deepEqual((await call('GET', '/v1/tuning')).json.values, {});
});
