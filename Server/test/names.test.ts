import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkName, nameKey } from '../src/modules/players/names.ts';

const allowed = (name: string): boolean => checkName(name).ok;

test('ordinary names pass and are tidied', () => {
  for (const name of ['Leo', 'Max Mustermann', 'Fast_Lane-99', 'Jürgen', 'Zoë', 'Assassin', 'Bassist', 'Torpedo', 'Raccoon', 'Klassiker']) {
    assert.equal(allowed(name), true, name);
  }
  const result = checkName('  Max    Muster  ');
  assert.ok(result.ok);
  assert.equal(result.name, 'Max Muster');
});

test('wide letters are turned into plain ones', () => {
  const result = checkName('ＬＥＯ');
  assert.ok(result.ok);
  assert.equal(result.name, 'LEO');
});

test('length and characters are checked', () => {
  for (const name of ['', 'ab', 'x'.repeat(17), 'Leo!', 'Leo@home', 'www.site.com', '😀😀😀', 'Леонид', '___', '---', '12'.slice(0, 2) + ' ']) {
    const result = checkName(name);
    assert.equal(result.ok, false, name);
    if (!result.ok) assert.equal(result.code, 'invalid_name', name);
  }
  assert.equal(checkName(42).ok, false);
  assert.equal(checkName(undefined).ok, false);
});

test('bad words are refused, also when disguised', () => {
  for (const name of [
    'Fuck', 'FUUUCK', 'f u c k', 'f_u_c_k', 'fvck'.replace('v', 'u'), 'Sh1t', 'b1tch', 'Big Ass', 'a s s', 'Hitler', 'H1tl3r', 'N4zi', 'Scheiße', 'Sch3iss3', 'Arschloch', 'Hurensohn', 'Wichser', 'Fotze',
    'xXfuckXx', 'Sieg Heil', 'Schlampe', 'Dick', 'Pussy', 'Nigger', 'Faggot',
  ]) {
    const result = checkName(name);
    assert.equal(result.ok, false, name);
    if (!result.ok) assert.equal(result.code, 'name_not_allowed', name);
  }
});

test('reserved names are refused', () => {
  for (const name of ['Admin', 'admin', 'ADM1N', 'Moderator', 'Roundabout Timing', 'Car Game']) assert.equal(allowed(name), false, name);
});

test('two names that look alike have the same key', () => {
  assert.equal(nameKey('Leo'), nameKey('LEO'));
  assert.equal(nameKey('Leo'), nameKey('le0'));
  assert.equal(nameKey('Leo'), nameKey('L e o'));
  assert.equal(nameKey('Jürgen'), nameKey('Jurgen'));
  assert.notEqual(nameKey('Leo'), nameKey('Leon'));
});
