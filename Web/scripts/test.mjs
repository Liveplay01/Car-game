// Automated tests (node:test, no extra packages): the rules replay exactly (Legendary Shifts and
// multiplayer matches too), the careful bot stays safe, bosses and ambulances are announced,
// saves survive old and broken data, multiplayer messages are checked at the door, and the
// notice queue tells one thing at a time.
//   npm test
// The TypeScript sources are loaded through Vite, like the balancing bots.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
after(() => server.close());
const load = (path) => server.ssrLoadModule(path);

const { World } = await load('/src/core/world.ts');
const { baseConfig } = await load('/src/core/config.ts');
const { forLevel } = await load('/src/core/levels.ts');
const { newSave, newCareer, Careers } = await load('/src/core/career.ts');
const { encodeChallenge, decodeChallenge, challengeOf } = await load('/src/core/challenge.ts');
const { loadSave, writeSave, exportSave, parseImport } = await load('/src/storage/save.ts');
const { NoticeQueue } = await load('/src/present/notices.ts');
const { bookShift } = await load('/src/present/booking.ts');
const { S, Fmt } = await load('/src/present/strings.ts');
const { Unlocks } = await load('/src/core/unlocks.ts');
const { sightings, shelfEntries, museumId } = await load('/src/core/museum.ts');
const { tapOffset, noteTap, averageOffset } = await load('/src/core/timing.ts');
const { forLegendary } = await load('/src/core/levels.ts');
const { LEGENDARY_RULES, cloneConfig } = await load('/src/core/config.ts');
const { versusConfig, VersusBot, INPUT_DELAY } = await load('/src/core/versus.ts');
const { substream } = await load('/src/core/rng.ts');
const { readGuestMessage, readHostMessage, RateLimit } = await load('/src/net/messages.ts');
const { settleSpecial } = await load('/src/present/specialRuns.ts');
const { trial: trialById } = await load('/src/core/trials.ts');
const { ResultBanner } = await load('/src/present/hud.ts');

// MARK: Rules

/** Plays one shift; `tapAt` decides each step whether to tap. Returns the result and the tap times. */
function play(seed, level, tapAt) {
  const world = new World(forLevel(baseConfig, level, seed), seed, { startsOnFirstTap: false });
  const taps = [];
  let result = null;
  for (let i = 0; i < 120 * 180 && !result; i++) {
    if (tapAt(world)) {
      taps.push(world.time);
      world.tap(world.time);
    }
    world.step();
    for (const e of world.takeEvents()) if (e.type === 'shiftEnded') result = e.result;
  }
  return { result, taps };
}

const careful = (world) => world.queue.isReady && world.predictedMergeGap(world.layout.player, 0, 40) > 0.04;

test('same seed and same taps give the same shift', () => {
  const first = play(4242, 7, careful);
  assert.ok(first.result, 'the shift ends');
  // Replay: tap exactly at the recorded times, without looking at the world.
  const times = [...first.taps];
  const replay = play(4242, 7, (world) => times.length > 0 && world.time >= times[0] - 1e-9 && (times.shift(), true));
  assert.deepEqual(replay.result, first.result);
});

test('another seed gives another shift', () => {
  const a = play(1, 5, careful).result;
  const b = play(2, 5, careful).result;
  assert.notDeepEqual(a, b);
});

test('the careful bot never crashes (levels 1, 5, 12)', () => {
  for (const level of [1, 5, 12]) {
    for (let s = 1; s <= 6; s++) {
      const { result } = play(s * 7919 + level, level, careful);
      assert.ok(result, `level ${level}, shift ${s} ends`);
      assert.equal(result.crashes, 0, `level ${level}, shift ${s}: ${result.crashes} crashes`);
    }
  }
});

test('a challenge link keeps its shift', () => {
  const career = newCareer();
  career.level = 9;
  const spec = challengeOf(career, 'shift', 9, 123456, null, 4321, null);
  assert.deepEqual(decodeChallenge(encodeChallenge(spec)), spec);
  assert.equal(decodeChallenge('not a code'), null);
});

// MARK: Saves

/** A stand-in for the browser's localStorage. */
function fakeStorage(entries = {}) {
  const map = new Map(Object.entries(entries));
  globalThis.localStorage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
  return map;
}

/** A fresh save, but for its random casino seed. */
const blank = (save) => ({ ...save, career: { ...save.career, casinoSeed: 0 } });

test('no save starts fresh', () => {
  fakeStorage();
  assert.deepEqual(blank(loadSave()), blank(newSave()));
});

test('a broken save starts fresh instead of crashing', () => {
  fakeStorage({ 'carGame.save.v2': '{ not json' });
  assert.deepEqual(blank(loadSave()), blank(newSave()));
});

test('a save comes back as it was written', () => {
  fakeStorage();
  const save = newSave();
  save.career.level = 14;
  save.career.money = 5000;
  save.highscore = 9999;
  save.hints = ['install'];
  assert.equal(writeSave(save), true);
  assert.deepEqual(loadSave(), save);
});

test('malformed fields fall back one by one', () => {
  fakeStorage({ 'carGame.save.v2': JSON.stringify({ highscore: 'lots', career: { level: -3, money: 700 }, mode: 'warp', hints: ['modes', 'nonsense'] }) });
  const save = loadSave();
  assert.equal(save.highscore, 0);
  assert.equal(save.career.money, 700);
  assert.ok(save.career.level >= 1);
  assert.equal(save.mode, 'shift');
  assert.deepEqual(save.hints, ['modes']);
});

test('an Unlimited best means the mode swipe is known', () => {
  fakeStorage({ 'carGame.save.v2': JSON.stringify({ unlimitedBest: 1200, career: {} }) });
  assert.ok(loadSave().hints.includes('modes'));
});

test('the first web save (v1) carries over', () => {
  fakeStorage({ 'carGame.career.v1': JSON.stringify({ level: 8, money: 3100, records: { bestScore: 4400 }, tutorialDone: true }) });
  const save = loadSave();
  assert.equal(save.career.level, 8);
  assert.equal(save.career.money, 3100);
  assert.equal(save.highscore, 4400);
  assert.equal(save.tutorialDone, true);
});

test('export and import give the same save; other files are refused', () => {
  const save = newSave();
  save.career.level = 21;
  save.unlimitedBest = 800;
  save.hints = ['modes', 'install'];
  assert.deepEqual(parseImport(exportSave(save)), save);
  assert.equal(parseImport('{"hello": 1}'), null);
  assert.equal(parseImport('nope'), null);
});

// MARK: Booking a shift

const completed = (level, over = {}) => {
  const { result } = play(900 + level, level, careful);
  assert.equal(result.outcome, 'completed');
  return { ...result, ...over };
};
const context = (level, over = {}) => ({ mode: 'shift', level, daily: false, today: 20000, config: baseConfig, shiftConfig: forLevel(baseConfig, level, 1), splits: [], ...over });

test('clearing the mode-hint level tells about the other modes, once', () => {
  const at = baseConfig.modeHintAfterLevel;
  const save = newSave();
  save.career.level = at;
  const booked = bookShift(save, completed(at), context(at));
  assert.equal(save.career.level, at + 1);
  assert.equal(booked.news[0], S.modes.unlocked);
  save.hints.push('modes');
  save.career.level = at;
  assert.ok(!bookShift(save, completed(at), context(at)).news.includes(S.modes.unlocked));
});

test('Tight Squeeze counts Tight Fits or better; trials open one by one', async () => {
  const { TRIALS, trial, trialPassed, trialOpen } = await load('/src/core/trials.ts');
  const squeeze = trial('tightSqueeze');
  const done = { outcome: 'completed', tightFits: 2, nearMisses: 1, perfects: 1 };
  assert.equal(trialPassed(squeeze, done), false);
  assert.equal(trialPassed(squeeze, { ...done, perfects: 2 }), true);
  // Easiest first, and none above the career's level unless passed before.
  const levels = TRIALS.map((t) => t.level);
  assert.deepEqual(levels, [...levels].sort((a, b) => a - b));
  const c = newCareer();
  c.level = squeeze.level - 1;
  assert.equal(trialOpen(squeeze, c), false);
  c.trialsDone.push(squeeze.id);
  assert.equal(trialOpen(squeeze, c), true);
});

test('the first level cleared gives one welcome chest, and only then', () => {
  const welcomed = (save, result, level) => bookShift(save, result, context(level)).news.includes(S.daily.welcomeChest);
  const save = newSave();
  const booked = bookShift(save, completed(1), context(1));
  assert.equal(save.career.level, 2);
  assert.equal(booked.news[0], S.daily.welcomeChest);
  assert.ok(save.career.chests.includes('standard'));
  assert.ok(!welcomed(save, completed(2), 2));
  // A lost first shift gives nothing yet; after a Prestige the chest does not come again.
  assert.ok(!welcomed(newSave(), { ...completed(1), outcome: 'struckOut' }, 1));
  const again = newSave();
  again.career.prestige = 1;
  assert.ok(!welcomed(again, completed(1), 1));
});

test('the first Perfect Run says what it is, later ones only its name', () => {
  const save = newSave();
  const first = bookShift(save, completed(1, { isPerfectRun: true }), context(1));
  assert.ok(first.news.some((n) => n.startsWith('PERFECT RUN ·')));
  const later = bookShift(save, completed(2, { isPerfectRun: true }), context(2));
  assert.ok(later.news.includes(S.daily.perfectRun));
});

test('the install and backup hints come due once, at their levels', () => {
  const save = newSave();
  save.career.level = baseConfig.installHintAfterLevel;
  const level = save.career.level;
  assert.deepEqual(bookShift(save, completed(level), context(level)).due, ['install']);
  save.career.level = level;
  assert.deepEqual(bookShift(save, completed(level), context(level)).due, []);
  save.career.level = baseConfig.backupHintAfterLevel;
  const later = save.career.level;
  assert.deepEqual(bookShift(save, completed(later), context(later)).due, ['backup']);
});

test('Mayhem keeps its own best and leaves the career alone', () => {
  const save = newSave();
  save.career.level = 7;
  const result = { ...completed(7), flames: 40, biggestChain: 3 };
  const booked = bookShift(save, result, context(7, { mode: 'mayhem' }));
  assert.equal(save.mayhemBest, 40);
  assert.equal(save.career.level, 7);
  assert.equal(booked.isNew, true);
  assert.deepEqual(booked.news, []);
});

// MARK: Unlocks

test('Daily, Trials and Casino open with the level', () => {
  const c = newCareer();
  assert.deepEqual(Unlocks.open(c), []);
  c.level = baseConfig.dailyUnlockLevel;
  assert.deepEqual(Unlocks.open(c), ['daily']);
  c.level = baseConfig.casinoUnlockLevel;
  assert.deepEqual(Unlocks.open(c), ['daily', 'trials', 'casino']);
});

test('whoever used a system before keeps it', () => {
  const c = newCareer();
  c.dailyPlayed = 19000;
  c.trialsDone = ['sprint'];
  c.casinoRounds = 2;
  assert.deepEqual(Unlocks.open(c), ['daily', 'trials', 'casino']);
});

test('opening the Daily says so; the Casino opens quietly', () => {
  const save = newSave();
  save.hints = ['modes', 'install', 'backup'];
  save.career.level = baseConfig.dailyUnlockLevel - 1;
  let level = save.career.level;
  assert.ok(bookShift(save, completed(level), context(level)).news.includes(S.unlocks.daily));
  save.career.level = baseConfig.casinoUnlockLevel - 1;
  level = save.career.level;
  const news = bookShift(save, completed(level), context(level)).news;
  assert.ok(!news.some((line) => /casino/i.test(line)), news.join(' | '));
});

// MARK: Notices

test('announcements take turns instead of sharing a line', () => {
  const q = new NoticeQueue();
  q.announce('A', 'B', 'C');
  assert.equal(q.shown.text, 'A');
  q.advance(NoticeQueue.queuedDuration + 0.01);
  assert.equal(q.shown.text, 'B');
  q.advance(NoticeQueue.queuedDuration + 0.01);
  assert.equal(q.shown.text, 'C');
  q.advance(NoticeQueue.duration + 0.01);
  assert.equal(q.shown, null);
});

test('a reply shows at once; a barely seen announcement comes back', () => {
  const q = new NoticeQueue();
  q.announce('Level news');
  q.advance(0.3);
  q.say('Not enough money');
  assert.equal(q.shown.text, 'Not enough money');
  q.advance(NoticeQueue.queuedDuration + 0.01);
  assert.equal(q.shown.text, 'Level news');
});

test('a long list folds its tail into the last line', () => {
  const q = new NoticeQueue();
  q.announce('1', '2', '3', '4', '5', '6', '7');
  const seen = [];
  while (q.shown) {
    seen.push(q.shown.text);
    q.advance(10);
  }
  assert.equal(seen.length, 1 + NoticeQueue.maxWaiting);
  assert.equal(seen[seen.length - 1], '5  ·  6  ·  7');
});

// MARK: First meetings

test('a condition counts as met once the shift runs, so the ready screen can explain it first', () => {
  const config = { ...forLevel(baseConfig, 12, 7), cityEvent: 'roadworks', weather: 'lightRain' };
  const world = new World(config, 7, { startsOnFirstTap: true });
  for (let i = 0; i < 120; i++) world.step();
  assert.equal(world.shift.phase, 'waiting');
  assert.ok(!sightings(world).includes('event.roadworks'));
  world.tap(world.time);
  for (let i = 0; i < 120; i++) world.step();
  assert.ok(sightings(world).includes('event.roadworks'));
  assert.ok(sightings(world).includes('weather.lightRain'));
});

test('every condition has a short first-meeting line', () => {
  for (const e of shelfEntries(2)) {
    const title = S.intro.title(e);
    const line = S.intro.text(e, baseConfig);
    assert.match(title, /^New · \S/, museumId(e));
    assert.ok(!/undefined|NaN/.test(title + line), `${museumId(e)}: ${line}`);
    assert.ok(line.length <= 130, `${museumId(e)} is ${line.length} characters: ${line}`);
  }
});

test('every special vehicle and boss has a short first-meeting notice', () => {
  for (const e of [...shelfEntries(0), ...shelfEntries(1)]) {
    const notice = S.intro.meet(e);
    assert.match(notice, /^New · \S.* · \S/, museumId(e));
    assert.ok(notice.length <= 60, `${museumId(e)} is ${notice.length} characters: ${notice}`);
  }
});

test('nothing counts as met while the shift waits for its first tap', () => {
  const world = new World(forLevel(baseConfig, 20, 3), 3, { startsOnFirstTap: true });
  for (let i = 0; i < 120 * 20; i++) world.step();
  assert.equal(world.shift.phase, 'waiting');
  assert.deepEqual(sightings(world), []);
});

// MARK: Timing, maps, patch notes


test('the timing is how far the tap was from the middle of the gap', () => {
  const ms = (x) => Math.round(x * 1000);
  assert.equal(ms(tapOffset(0.3, 0.9, baseConfig)), -300, 'early');
  assert.equal(ms(tapOffset(0.8, 0.4, baseConfig)), 200, 'late');
  assert.equal(ms(tapOffset(0.5, 0.5, baseConfig)), 0);
  assert.equal(tapOffset(Infinity, 0.5, baseConfig), null, 'an open ring says nothing');
  assert.equal(tapOffset(2, 2, baseConfig), null, 'a gap wider than timingMaxGap says nothing');
});

test('the Records keep the last merges and average them once there are enough', () => {
  const career = newCareer();
  noteTap(career, 0.3, 0.9, baseConfig);
  assert.deepEqual(career.tapOffsets, [-300]);
  assert.equal(averageOffset(career, baseConfig), null);
  for (let i = 0; i < baseConfig.timingSamples + 10; i++) noteTap(career, 0.45, 0.55, baseConfig);
  assert.equal(career.tapOffsets.length, baseConfig.timingSamples);
  assert.equal(averageOffset(career, baseConfig), -50);
});

test('every map skin from the chests has its place, colour and name', async () => {
  const { COSMETICS } = await load('/src/core/loot.ts');
  const { MapTheme } = await load('/src/present/mapThemes.ts');
  const { Skins } = await load('/src/present/skins.ts');
  for (const item of COSMETICS.filter((x) => x.kind === 'mapSkin')) {
    assert.ok(MapTheme.from(item.id), `${item.id} has no MapTheme`);
    assert.ok(Skins.color(item.id), `${item.id} has no colour`);
    assert.notEqual(S.shop.item(item.id), item.id, `${item.id} has no name`);
  }
});

test('patch notes are newest first, each with a unique id and something to say', async () => {
  const { PATCH_NOTES, latestNote } = await load('/src/present/patchNotes.ts');
  const ids = PATCH_NOTES.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(latestNote(), ids[0]);
  for (const n of PATCH_NOTES) assert.ok(n.title && n.date && n.items.length > 0, n.id);
});

// MARK: Traffic

test('a steady stream of the player\'s cars does not starve the other arms (long Unlimited)', () => {
  const career = newCareer();
  const cfg = Careers.shiftConfig(career, 'unlimited', baseConfig, 4242);
  // The shift must not end on its own: only the traffic is looked at.
  cfg.maxStrikes = 1e9;
  cfg.maxPoliceCrashes = 1e9;
  cfg.criminalChance = 0;
  const world = new World(cfg, 4242, { startsOnFirstTap: false });
  const entered = new Set();
  let late = 0;
  for (let i = 0; i < 120 * 300; i++) {
    // Sends a car whenever it would not crash at once: the stream a spamming player makes.
    if (world.queue.isReady && world.predictedMergeGap(world.layout.player, 0, 40) > 0) world.tap(world.time);
    world.step();
    world.takeEvents();
    for (const v of world.vehicles) {
      if (v.owner !== 'ai' || v.phase.kind !== 'merging' || entered.has(v.id)) continue;
      entered.add(v.id);
      if (world.time > 240) late++;
    }
  }
  assert.ok(late >= 5, `only ${late} cars of the traffic joined the ring in the fifth minute`);
});

// MARK: Bosses, ambulances, Legendary Shifts

/** Plays a shift of `config` with the careful bot; returns the result and every event seen. */
function playConfig(config, seed, tapAt = careful) {
  const world = new World(config, seed, { startsOnFirstTap: false });
  const seen = [];
  let result = null;
  for (let i = 0; i < 120 * 240 && !result; i++) {
    if (tapAt(world)) world.tap(world.time);
    world.step();
    for (const e of world.takeEvents()) {
      seen.push(e);
      if (e.type === 'shiftEnded') result = e.result;
    }
  }
  return { result, seen };
}

test('every 15th level sends the syndicate boss, announced first', () => {
  for (const seed of [11, 22, 33]) {
    const { result, seen } = playConfig(forLevel(baseConfig, 15, seed), seed);
    assert.ok(result, `seed ${seed}: the shift ends`);
    const warning = seen.find((e) => e.type === 'criminalWarning');
    assert.ok(warning?.boss, `seed ${seed}: the first criminal is the boss, and it is warned of`);
    const entered = seen.findIndex((e) => e.type === 'criminalEntered' && e.boss);
    assert.ok(entered < 0 || seen.findIndex((e) => e.type === 'criminalWarning') < entered, `seed ${seed}: the warning comes before the boss`);
  }
});

test('an ambulance, when it comes, is announced before it enters', () => {
  const base = cloneConfig(baseConfig);
  base.ambulanceChance = 1;
  let came = 0;
  for (const seed of [5, 6, 7, 8]) {
    const { seen } = playConfig(forLevel(base, 12, seed), seed);
    const warned = seen.findIndex((e) => e.type === 'ambulanceWarning');
    const entered = seen.findIndex((e) => e.type === 'ambulanceEntered');
    if (entered >= 0) {
      came++;
      assert.ok(warned >= 0 && warned < entered, `seed ${seed}: warning first`);
    }
  }
  assert.ok(came > 0, 'with a chance of 1 an ambulance comes in some shift');
});

test('every Legendary rule plays a shift that ends and replays exactly', () => {
  for (const rule of LEGENDARY_RULES) {
    const seed = 9000 + LEGENDARY_RULES.indexOf(rule);
    const config = () => forLegendary(forLevel(baseConfig, 30, seed), rule);
    const taps = [];
    const first = playConfig(config(), seed, (world) => careful(world) && (taps.push(world.time), true));
    assert.ok(first.result, `${rule}: the shift ends`);
    const times = [...taps];
    const replay = playConfig(config(), seed, (world) => times.length > 0 && world.time >= times[0] - 1e-9 && (times.shift(), true));
    assert.deepEqual(replay.result, first.result, `${rule}: the replay is the same shift`);
  }
});

// MARK: Multiplayer

/** A four-lane match of bots; the same seed plays the same match on every device. */
function playMatch(seed) {
  const world = new World(versusConfig(4, seed), seed);
  const bots = world.seats.map((q) => new VersusBot(q.seat, substream(seed, 0xb0770 + q.seat)));
  const pending = [];
  let winner;
  for (let i = 0; i < 120 * 120 && winner === undefined; i++) {
    for (const q of world.seats) if (!q.out && bots[q.seat].decide(world)) pending.push([world.stepCount + INPUT_DELAY, q.seat]);
    while (pending.length > 0 && pending[0][0] <= world.stepCount) world.tap(world.time, pending.shift()[1]);
    world.step();
    for (const e of world.takeEvents()) {
      if (e.type === 'faulted') world.eliminate(e.seat, 'crash', world.time);
      if (e.type === 'matchOver') winner = e.winner;
    }
    for (const seat of world.stalledSeats) world.eliminate(seat, 'stalled', world.time);
  }
  return world.vehicles.map((v) => `${v.id}:${v.position.x.toFixed(6)},${v.position.y.toFixed(6)}`).join('|') + `#${world.stepCount}#${winner}`;
}

test('a match replays the same on every device (crash physics included)', () => {
  assert.equal(playMatch(314), playMatch(314));
  assert.notEqual(playMatch(314), playMatch(315));
});

test("a guest's messages are checked field by field", () => {
  assert.deepEqual(readGuestMessage({ t: 'tap', step: 120 }), { t: 'tap', step: 120 });
  assert.deepEqual(readGuestMessage({ t: 'react', r: 'fire' }), { t: 'react', r: 'fire' });
  assert.deepEqual(readGuestMessage({ t: 'ping', at: 5, rtt: 1e9 }), { t: 'ping', at: 5, rtt: 99_999 });
  const bad = [
    null,
    'tap',
    [],
    { t: 'tap' },
    { t: 'tap', step: NaN },
    { t: 'tap', step: -1 },
    { t: 'react', r: 'bomb' },
    { t: 'hello', name: 'x'.repeat(500), token: 'a' },
    { t: 'ready', on: 'yes' },
    { t: 'shutdown' },
  ];
  for (const message of bad) assert.equal(readGuestMessage(message), null, JSON.stringify(message));
});

test("the host's messages are checked too; names are cleaned", () => {
  const series = { bestOf: 3, round: 1, points: { 0: 10, 1: 4 }, wins: { 0: 1 } };
  const start = readHostMessage({ t: 'start', seed: 7, names: ['Ann\u0007', 'Bo'], slots: [0, 2], you: 1, series });
  assert.equal(start?.t, 'start');
  assert.deepEqual(start.names, ['Ann', 'Bo']);
  assert.deepEqual(readHostMessage({ t: 'f', h: 40, i: [[38, 1, 't']] }), { t: 'f', h: 40, i: [[38, 1, 't']] });
  const bad = [
    { t: 'f', h: 40, i: [[38, 9, 't']] },
    { t: 'f', h: 40, i: [[38, 1, 'x']] },
    { t: 'start', seed: 7, names: ['A'], slots: [0], you: 3, series },
    { t: 'lobby', members: [{ slot: 7, name: 'A' }], you: 0, bestOf: 1 },
    { t: 'lobby', members: [], you: 0, bestOf: 2 },
    { t: 'pings', ms: { 0: 'fast' } },
  ];
  for (const message of bad) assert.equal(readHostMessage(message), null, JSON.stringify(message));
});

test('a flood of messages from one guest is cut to a steady rate', () => {
  const limit = new RateLimit(30, 60);
  let passed = 0;
  for (let i = 0; i < 1000; i++) if (limit.take(0)) passed++;
  assert.equal(passed, 60, 'a burst, then nothing in the same instant');
  assert.equal(limit.take(1000), true, 'a second later there is room again');
});

// MARK: Settings, specials, the spoken result

test('music gets its own switch; whoever had the sound off keeps both off', () => {
  fakeStorage({ 'carGame.save.v2': JSON.stringify({ settings: { sound: false }, career: {} }) });
  assert.equal(loadSave().settings.music, false);
  fakeStorage({ 'carGame.save.v2': JSON.stringify({ settings: { sound: true, music: false }, career: {} }) });
  const save = loadSave();
  assert.equal(save.settings.sound, true);
  assert.equal(save.settings.music, false);
  assert.equal(newSave().settings.music, true);
});

test('a trial pays its reward once; a challenge sends back your own score', () => {
  const career = newCareer();
  career.level = 20;
  const t = trialById('marathon');
  const done = { ...play(77, 5, careful).result, outcome: 'completed' };
  const before = career.money;
  const first = settleSpecial({ k: 'trial', trial: t }, done, career, 20000, baseConfig);
  assert.equal(first.summary.caption, S.run.passed);
  assert.equal(career.money, before + t.reward);
  settleSpecial({ k: 'trial', trial: t }, done, career, 20000, baseConfig);
  assert.equal(career.money, before + t.reward, 'the second pass pays nothing');
  const spec = challengeOf(career, 'shift', 5, 77, null, done.score + 1, null);
  const lost = settleSpecial({ k: 'challenge', spec }, done, career, 20000, baseConfig);
  assert.equal(lost.summary.caption, S.run.missed);
  assert.equal(lost.shareable.target, done.score);
});

test('the result is spoken as one sentence: how it ended and the score', () => {
  const result = { ...play(78, 3, careful).result, outcome: 'completed' };
  const summary = { result, level: 3, isNewHighscore: true, previousHighscore: 0, mode: 'shift' };
  const spoken = ResultBanner.spoken(summary);
  assert.ok(spoken.startsWith(S.result.levelComplete(3)), spoken);
  assert.ok(spoken.includes(Fmt.number(result.score)), spoken);
  assert.ok(spoken.includes(S.result.newBest), spoken);
});
