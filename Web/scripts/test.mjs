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
const { baseConfig, BOSS_KINDS } = await load('/src/core/config.ts');
const { forLevel } = await load('/src/core/levels.ts');
const { newSave, newCareer, Careers } = await load('/src/core/career.ts');
const { encodeChallenge, decodeChallenge, challengeOf } = await load('/src/core/challenge.ts');
const { loadSave, writeSave, parseImport } = await load('/src/storage/save.ts');
const { fingerprint } = await load('/src/net/cloud.ts');
const { iceServers } = await load('/src/net/rtc.ts');
const { NoticeQueue } = await load('/src/present/notices.ts');
const { Briefings, briefOf } = await load('/src/present/briefing.ts');
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
const { settleSpecial, advanceRush, newRush, runCard } = await load('/src/present/specialRuns.ts');
const { trial: trialById, trialOpen, trialConfig, landmarkOf, LANDMARKS, LANDMARK_PRESTIGE, RUN_IDS, RUSH_ID, RUSH_REWARD, rushOpen, rematchId } = await load('/src/core/trials.ts');
const { PATCH_NOTES, latestNote, itemText, itemCredit } = await load('/src/present/patchNotes.ts');
const { default: qrcode } = await import('qrcode-generator');
const { ResultBanner } = await load('/src/present/hud.ts');
// Every module loaded at the top level comes before the first test: a load later down the file
// can still be pending when the tests above it have finished and `after` has closed the server.
const { parseBackdropLink, youtubeEmbed } = await load('/src/present/backdrop.ts');
const { prestigeReward, BIG_SCREEN } = await load('/src/core/loot.ts');

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

test('a file exported earlier still imports; other files are refused', () => {
  const save = newSave();
  save.career.level = 21;
  save.unlimitedBest = 800;
  save.hints = ['modes', 'install'];
  // The format the export wrote before Cloud sync replaced it.
  const file = JSON.stringify({ format: 'car-game-save', version: 2, exportedAt: '2026-09-30T12:00:00.000Z', save }, null, 2);
  assert.deepEqual(parseImport(file), save);
  assert.equal(parseImport('{"hello": 1}'), null);
  assert.equal(parseImport('nope'), null);
});

test('a save survives the trip through the cloud unchanged, and a change is noticed', () => {
  const save = newSave();
  save.career.level = 33;
  save.career.money = 4200;
  save.unlimitedBest = 1500;
  save.hints = ['modes']; // what reading a save with a record adds anyway
  // The cloud stores the save as the game wrote it and sends it back as JSON.
  const back = parseImport(JSON.stringify(JSON.parse(JSON.stringify(save))));
  assert.deepEqual(back, save);
  assert.equal(fingerprint(JSON.stringify(back)), fingerprint(JSON.stringify(save)), 'a clean copy is not "changed"');
  save.career.money += 1;
  assert.notEqual(fingerprint(JSON.stringify(save)), fingerprint(JSON.stringify(back)));
});

test('the ice servers always start with STUN, also without the service', async () => {
  const servers = await iceServers();
  assert.ok(servers.length >= 1);
  assert.match(String(Array.isArray(servers[0].urls) ? servers[0].urls[0] : servers[0].urls), /^stun:/);
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

test('everything in the Museum has a briefing short enough for two lines of the top card', () => {
  for (const e of [...shelfEntries(0), ...shelfEntries(1), ...shelfEntries(2)]) {
    const b = briefOf(e);
    assert.match(b.caption, /^NEW · \S/, museumId(e));
    assert.match(briefOf(e, true).caption, /^REMEMBER · \S/, museumId(e));
    assert.ok(b.text.length > 0 && !/undefined|NaN/.test(b.caption + b.text), museumId(e));
    assert.ok(b.text.length <= 72, `${museumId(e)} is ${b.text.length} characters: ${b.text}`);
  }
});

test('a briefing with a task stays until the task is over, then the numbers come back', () => {
  const world = { criminal: { kind: 'warning' } };
  const briefs = new Briefings();
  briefs.add(briefOf({ k: 'special', kind: 'pickup' }));
  briefs.add(briefOf({ k: 'special', kind: 'pickup' }));
  for (let t = 0; t < 20; t += 0.1) briefs.advance(0.1, world);
  assert.equal(briefs.view?.brief.id, 'special.pickup', 'still on while the criminal is');
  assert.equal(briefs.view?.used, null);
  world.criminal.kind = 'idle';
  for (let t = 0; t < 1; t += 0.1) briefs.advance(0.1, world);
  assert.equal(briefs.view, null);
  assert.ok(briefs.isEmpty, 'given once per shift');
});

test('briefings without a task stay a few seconds each, a task goes first', () => {
  const world = { criminal: { kind: 'idle' }, transporter: { kind: 'warning' } };
  const briefs = new Briefings();
  briefs.add(briefOf({ k: 'weather', kind: 'fog' }));
  briefs.add(briefOf({ k: 'event', kind: 'roadworks' }));
  const seen = [];
  for (let t = 0; t < 30; t += 0.05) {
    // The fog is on the card when the transporter's warning comes: the fog has its least time first.
    if (Math.abs(t - 1) < 0.01) briefs.add(briefOf({ k: 'special', kind: 'transporter' }));
    if (t > 8) world.transporter.kind = 'idle';
    briefs.advance(0.05, world);
    const id = briefs.view?.brief.id;
    if (id && seen[seen.length - 1] !== id) seen.push(id);
  }
  assert.deepEqual(seen, ['weather.fog', 'special.transporter', 'event.roadworks']);
  assert.equal(briefs.view, null);
});

test('cars spammed into the slow traffic after a crash creep in for nothing (Unlimited exploit)', async () => {
  const { upgradeMaxSteps } = await load('/src/core/levels.ts');
  const career = { ...newCareer(), level: 40, upgrades: { ...upgradeMaxSteps } };
  const cfg = Careers.shiftConfig(career, 'unlimited', baseConfig, 37);
  const world = new World(cfg, 37, { startsOnFirstTap: true });
  // The police car at the front goes into the traffic and crashes; then taps as fast as possible.
  world.tap(1.5);
  let next = Infinity;
  let launched = 0;
  while (world.time < 12 && world.shift.phase !== 'ended') {
    if (world.time >= next) {
      world.tap(world.time);
      next = world.time + 0.15;
    }
    world.step();
    for (const e of world.takeEvents()) {
      if (e.type === 'crash' && e.isPoliceCrash && next === Infinity) next = world.time + 2;
      if (e.type === 'launched') launched++;
    }
  }
  assert.ok(world.score.crept >= 5, `crept ${world.score.crept}`);
  assert.ok(world.score.combo <= 2 && world.score.points <= 300, `combo ${world.score.combo}, points ${world.score.points}`);
  assert.ok(world.shift.carsSent <= launched - world.score.crept, 'a car that crept in is no car in Unlimited');
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
    // Big Screen has no city of its own: it shows the player's picture (ui/backdrop.ts).
    if (item.id !== 'bigScreen') assert.ok(MapTheme.from(item.id), `${item.id} has no MapTheme`);
    assert.ok(Skins.color(item.id), `${item.id} has no colour`);
    assert.notEqual(S.shop.item(item.id), item.id, `${item.id} has no name`);
  }
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

// MARK: Content of 30.09.2026

const laneAware = (world) => {
  const front = world.vehicle(world.queue.vehicles[0]);
  return world.queue.isReady && world.predictedMergeGap(world.layout.player, 0, 40, -Infinity, front?.lane ?? 0) > 0.04;
};

test('a car sent into a jam brakes behind it instead of ploughing in', async () => {
  const { spawnRingCar } = await load('/src/core/traffic.ts');
  for (let seed = 1; seed <= 6; seed++) {
    const cfg = forLevel(baseConfig, 3, seed);
    Object.assign(cfg, { minRingBots: 0, densityStart: 0, densityEnd: 0, criminalChance: 0, transporterFirst: { lo: 999, hi: 999 } });
    const world = new World(cfg, seed, { startsOnFirstTap: false, prefill: false });
    const join = world.layout.entryRingS[0];
    for (let k = 0; k < 3; k++) spawnRingCar(world, join + 30 + k * 30, world.layout.arms[2], 'car');
    const jam = world.vehicles.filter((x) => x.phase.kind === 'ring');
    world.tap(0.1);
    let crashes = 0;
    for (let i = 0; i < 120 * 5; i++) {
      for (const x of jam) if (x.phase.kind === 'ring' && world.time < 3) Object.assign(x.phase, { distanceToExit: 1e6, drive: { ...x.phase.drive, speed: 0, reaction: 0 } });
      world.step();
      for (const e of world.takeEvents()) if (e.type === 'crash' && e.involvesPlayer) crashes++;
    }
    assert.equal(crashes, 0, `seed ${seed}`);
  }
});

test('the two-lane ring (level 80) replays exactly, and the careful bot stays safe', () => {
  const run = (seed, tapAt) => {
    const world = new World(forLevel(baseConfig, 82, seed), seed, { startsOnFirstTap: false });
    assert.equal(world.layout.lanes, 2);
    const taps = [];
    let result = null;
    let inner = 0;
    for (let i = 0; i < 120 * 180 && !result; i++) {
      if (tapAt(world)) {
        taps.push(world.time);
        world.tap(world.time);
      }
      world.step();
      for (const e of world.takeEvents()) {
        if (e.type === 'shiftEnded') result = e.result;
        if (e.type === 'merged' && world.vehicle(e.vehicle)?.lane === 1) inner++;
      }
    }
    return { result, taps, inner };
  };
  let inner = 0;
  for (let s = 1; s <= 4; s++) {
    const first = run(s * 104729, laneAware);
    assert.ok(first.result, `shift ${s} ends`);
    assert.equal(first.result.crashes, 0, `shift ${s}: ${first.result.crashes} crashes`);
    inner += first.inner;
    const times = [...first.taps];
    const replay = run(s * 104729, (world) => times.length > 0 && world.time >= times[0] - 1e-9 && (times.shift(), true));
    assert.deepEqual(replay.result, first.result);
  }
  assert.ok(inner > 0, 'some of your cars joined the inner lane');
});

test('learner drivers, fire engines, motorbikes and school buses come at their levels', async () => {
  const { forCityEvent } = await load('/src/core/levels.ts');
  const seen = new Set();
  let buses = 0;
  let stopped = 0;
  let mostOwing = 0;
  for (let s = 1; s <= 40; s++) {
    const cfg = forCityEvent(forLevel(baseConfig, 40, s), 'schoolRun', s);
    const world = new World(cfg, s, { startsOnFirstTap: false });
    let warned = false;
    for (let i = 0; i < 120 * 60; i++) {
      if (laneAware(world)) world.tap(world.time);
      world.step();
      for (const x of world.vehicles) seen.add(x.type);
      mostOwing = Math.max(mostOwing, world.vehicles.filter((x) => world.owesStop(x)).length);
      for (const e of world.takeEvents()) {
        if (e.type === 'learnerWarning') warned = true;
        if (e.type === 'learnerEntered') assert.ok(warned, 'the learner is announced first');
        if (e.type === 'shiftEnded') i = Infinity;
      }
    }
    buses += world.vehicles.filter((x) => x.type === 'bus').length;
    stopped += world.vehicles.filter((x) => x.type === 'bus' && x.served).length;
  }
  for (const t of ['motorbike', 'bus', 'learner']) assert.ok(seen.has(t), `${t} came`);
  assert.ok(buses === 0 || stopped > 0, 'a school bus makes its stop');
  assert.ok(mostOwing <= baseConfig.busMaxOwing, `at most ${baseConfig.busMaxOwing} buses wait for the stop at once, saw ${mostOwing}`);
  const low = new World(forLevel(baseConfig, 10, 5), 5, { startsOnFirstTap: false });
  for (let i = 0; i < 120 * 20; i++) low.step();
  assert.ok(!low.vehicles.some((x) => ['motorbike', 'learner', 'fireTruck', 'bus'].includes(x.type)), 'nothing new below its level');
});

test('the Season Pass pays its tiers once; the Hall of Fame keeps a plaque per rank', async () => {
  const { SeasonPass, PASS_TIERS } = await load('/src/core/seasonPass.ts');
  const day = Math.floor(Date.UTC(2026, 11, 20) / 86400000);
  assert.equal(SeasonPass.key(day), 'winter-2027');
  const c = newCareer();
  c.level = 20;
  c.money = baseConfig.seasonPassPrice;
  assert.ok(SeasonPass.buy(c, day));
  assert.equal(c.money, 0);
  assert.ok(!SeasonPass.buy(c, day), 'bought once a season');
  const shift = { outcome: 'completed', perfects: 1000, tightFits: 1000, bossBusted: false, legendary: null };
  const first = SeasonPass.record(c, shift, day);
  assert.equal(first.steps.length, PASS_TIERS);
  assert.ok(SeasonPass.skins('winter').every((x) => c.collection.includes(x.id)));
  assert.equal(SeasonPass.record(c, shift, day).steps.length, 0, 'every tier pays once');
  assert.equal(SeasonPass.record(c, shift, day + 120), null, 'last season’s pass has closed');
  const p = newCareer();
  p.level = baseConfig.prestigeLevel;
  Careers.prestige(p, baseConfig, day);
  assert.deepEqual(p.hallOfFame.map((e) => e.rank), [1]);
  p.money = baseConfig.hallOfFamePrice;
  assert.ok(Careers.buildHall(p));
  assert.ok(p.hallBuilt && p.collection.includes('hallOfFame'));
});

// MARK: Big Screen

test('Big Screen tells YouTube, video files and pictures apart, and refuses what is no web link', () => {
  for (const link of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42', 'youtu.be/dQw4w9WgXcQ', 'https://m.youtube.com/shorts/dQw4w9WgXcQ', 'https://www.youtube.com/live/dQw4w9WgXcQ?si=x', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ']) {
    assert.deepEqual(parseBackdropLink(link), { k: 'youtube', id: 'dQw4w9WgXcQ' }, link);
  }
  assert.deepEqual(parseBackdropLink('https://example.com/clip.MP4'), { k: 'video', url: 'https://example.com/clip.MP4' });
  assert.deepEqual(parseBackdropLink('http://example.com/cat.jpg'), { k: 'image', url: 'https://example.com/cat.jpg' }, 'http is upgraded');
  assert.deepEqual(parseBackdropLink('  example.com/cat.png '), { k: 'image', url: 'https://example.com/cat.png' });
  for (const bad of ['', 'not a link', 'javascript:alert(1)', 'data:image/png;base64,AAAA', 'ftp://example.com/a.png', 'https://localhost/a.png', 'https://user:pw@example.com/a.png']) {
    assert.equal(parseBackdropLink(bad), null, bad);
  }
  // A YouTube page that is not a video is not a picture either: it is taken for one only if it loads.
  assert.equal(parseBackdropLink('https://www.youtube.com/watch?v=short').k, 'image');
  const embed = new URL(youtubeEmbed('dQw4w9WgXcQ'));
  assert.equal(embed.hostname, 'www.youtube-nocookie.com');
  assert.equal(embed.searchParams.get('mute'), '1');
  assert.equal(embed.searchParams.get('playlist'), 'dQw4w9WgXcQ', 'loops');
});

test('Big Screen is the Prestige ★5 reward, and older saves past ★5 get it', () => {
  assert.equal(prestigeReward(5)?.id, BIG_SCREEN);
  const c = newCareer();
  c.prestige = 4;
  c.level = baseConfig.prestigeLevel;
  assert.deepEqual(Careers.prestige(c, baseConfig), { rank: 5, item: BIG_SCREEN });
  assert.ok(Careers.wear(c, BIG_SCREEN) && c.mapSkin === BIG_SCREEN);
  // A save from before Big Screen, already at ★6, finds it in the collection, marked new.
  const old = newSave();
  old.career.prestige = 6;
  old.career.collection = ['starSilver', 'starGold', 'starIris'];
  fakeStorage({ 'carGame.save.v2': JSON.stringify(old) });
  const loaded = loadSave();
  assert.ok(loaded.career.collection.includes(BIG_SCREEN));
  assert.ok(loaded.career.unseen.includes(BIG_SCREEN));
  // Below ★5 nothing arrives early.
  old.career.prestige = 4;
  fakeStorage({ 'carGame.save.v2': JSON.stringify(old) });
  assert.ok(!loadSave().career.collection.includes(BIG_SCREEN));
});

// MARK: Feats

test('every Feat pays its own reward where its deed happens, never in a chest', async () => {
  const { FEATS, Feats } = await load('/src/core/feats.ts');
  const { cosmetic, legendaryReward, eliteReward, CHEST_ODDS } = await load('/src/core/loot.ts');
  const { Elite, TITLE_RULES } = await load('/src/core/elite.ts');
  assert.ok(CHEST_ODDS.standard.length === 4, 'no new chest rarity');
  for (const feat of FEATS) {
    const item = cosmetic(feat.id);
    assert.ok(item, `${feat.id} is a cosmetic`);
    assert.notEqual(item.source.kind, 'chest', `${feat.id} is never in a chest`);
    const g = feat.goal;
    const reward = g.k === 'prestige' ? prestigeReward(g.rank) : g.k === 'elite' ? eliteReward(g.level) : legendaryReward(g.shifts);
    assert.equal(reward?.id, feat.id, `${feat.id} is paid at its goal`);
    if (feat.title) assert.deepEqual(TITLE_RULES[feat.title], g.k === 'prestige' ? { k: 'prestige', rank: g.rank } : g.k === 'elite' ? { k: 'elite', level: g.level } : { k: 'legendary', shifts: g.shifts });
    assert.notEqual(S.shop.item(feat.id), feat.id, `${feat.id} has a name`);
  }
  const c = newCareer();
  assert.equal(Feats.count(c), 0);
  c.prestige = 20;
  c.legendaryDone = 50;
  c.eliteXp = Elite.xpTo(100);
  assert.equal(Elite.level(c), 100);
  assert.equal(Feats.count(c), FEATS.length);
  assert.ok(['ascended', 'eternal', 'grandmaster', 'centurion', 'immortal'].every((t) => Elite.titleEarned(t, c)));
});

test('a save already past a Feat gets its reward when it loads', () => {
  const old = newSave();
  old.career.prestige = 11;
  old.career.eliteClaimed = 80;
  old.career.legendaryDone = 12;
  fakeStorage({ 'carGame.save.v2': JSON.stringify(old) });
  const c = loadSave().career;
  for (const id of ['bigScreen', 'nova', 'zenith', 'starSilver', 'eliteHalo', 'crown']) assert.ok(c.collection.includes(id), id);
  for (const id of ['gilded', 'singularity', 'eventHorizon', 'undying', 'phoenix']) assert.ok(!c.collection.includes(id), id);
});

// MARK: The Classic

test('the Classic: an honour found only in Standard Chests, about 1 in 500, never twice', async () => {
  const { cosmetic, rollChest, albumItems, isHonour, CHEST_KINDS } = await load('/src/core/loot.ts');
  const { shelfOf } = await load('/src/present/shop.ts');
  const classic = cosmetic('classic');
  assert.ok(isHonour(classic));
  assert.equal(shelfOf(classic), 2, 'on the Honours shelf');
  assert.ok(!albumItems('honours').includes(classic), 'the Honours album waits on deeds, not luck');
  const draws = 200_000;
  for (const kind of CHEST_KINDS) {
    let found = 0;
    for (let seed = 0; seed < draws; seed++) if (rollChest(kind, [], 0, seed, 100).item.id === 'classic') found++;
    if (kind !== 'standard') assert.equal(found, 0, `never in a ${kind} chest`);
    else assert.ok(Math.abs(found / draws - 0.002) < 0.0005, `1 in 500 (${found} of ${draws})`);
  }
  for (let seed = 0; seed < 20_000; seed++) assert.notEqual(rollChest('standard', ['classic'], 0, seed, 100).item.id, 'classic', 'not once it is owned');
  // Other results of a seed did not change: the find is drawn after everything else.
  for (let seed = 0; seed < 5000; seed++) {
    const fresh = rollChest('standard', [], 0, seed, 100);
    if (fresh.item.id !== 'classic') assert.equal(fresh.item.id, rollChest('standard', ['classic'], 0, seed, 100).item.id);
  }
  assert.equal(S.shop.item('classic'), 'Classic');
});

test('the Classic joins the queue once owned, drives like a car, and travels in a challenge', () => {
  const c = newCareer();
  assert.equal(Careers.shiftConfig(c, 'shift', baseConfig, 1, null, null).classicShare, 0);
  c.collection.push('classic');
  const cfg = Careers.shiftConfig(c, 'shift', baseConfig, 1, null, null);
  assert.equal(cfg.classicShare, baseConfig.classicShareOwned);
  const world = new World(cfg, 7);
  for (let i = 0; i < 40 && !world.queue.vehicles.some((id) => world.vehicle(id)?.type === 'classic'); i++) {
    world.queue.vehicles.length = 0;
    world.refillQueue();
  }
  assert.ok(world.queue.vehicles.some((id) => world.vehicle(id)?.type === 'classic'), 'shows up in the queue');
  assert.equal(world.mergeDurationOf('classic'), world.mergeDurationOf('car'));
  const spec = challengeOf(c, 'shift', 3, 99, null, 1000);
  assert.deepEqual(spec.cars, ['classic']);
  assert.deepEqual(decodeChallenge(encodeChallenge(spec)).cars, ['classic']);
});

// MARK: Late game (02.10.2026)

test('Mastery has tiers IV and V; the mastery titles still hang on tier III, Mastermind on every V', async () => {
  const { MASTERY_GOALS, MASTERY_THRESHOLDS, masteryNumeral } = await load('/src/core/career.ts');
  const { Elite } = await load('/src/core/elite.ts');
  for (const g of MASTERY_GOALS) {
    const t = MASTERY_THRESHOLDS[g];
    assert.equal(t.length, 5, `${g}: five tiers`);
    for (let i = 1; i < t.length; i++) assert.ok(t[i] > t[i - 1], `${g}: tiers rise`);
  }
  assert.equal(masteryNumeral(3), 'IV');
  const c = newCareer();
  c.mastery.perfects = 600;
  Careers.recordMastery(c, { outcome: 'failed', perfects: 0, tightFits: 0, nearMisses: 0, takedowns: 0, transporters: 0, bestChain: 0, bestCombo: 0, ambulances: 0, shaves: 0 });
  assert.equal(c.masteryTiers.perfectTiming, 3);
  assert.ok(Elite.titleEarned('precisionDriver', c), 'tier III still earns the title');
  assert.ok(!Elite.titleEarned('mastermind', c));
  for (const g of MASTERY_GOALS) c.masteryTiers[g] = MASTERY_THRESHOLDS[g].length;
  assert.ok(Elite.titleEarned('mastermind', c));
  // A save from before IV and V keeps its tiers, and a stored tier above the last is cut down.
  fakeStorage();
  const save = newSave();
  save.career.masteryTiers = { perfectTiming: 3, veteran: 9 };
  writeSave(save);
  const read = loadSave();
  assert.equal(read.career.masteryTiers.perfectTiming, 3);
  assert.equal(read.career.masteryTiers.veteran, 5);
});

test('Prestige gives something on every rank from ★4 to ★20, and saves past a rank get its skin on load', async () => {
  const { prestigeReward } = await load('/src/core/loot.ts');
  const { TITLES, TITLE_RULES } = await load('/src/core/elite.ts');
  for (let rank = 1; rank <= 20; rank++) {
    const title = TITLES.some((t) => TITLE_RULES[t].k === 'prestige' && TITLE_RULES[t].rank === rank);
    assert.ok(prestigeReward(rank) || title, `★${rank} gives a skin or a title`);
  }
  fakeStorage();
  const save = newSave();
  save.career.prestige = 9;
  writeSave(save);
  const read = loadSave();
  for (const id of ['quasar', 'prism', 'meteor']) assert.ok(read.career.collection.includes(id), `${id} arrives for ★9`);
  assert.ok(!read.career.collection.includes('eclipse'), 'not yet ★12');
});

test('Unlimited milestones come with the run that reaches them, and with an old best on load', async () => {
  fakeStorage();
  const save = newSave();
  save.unlimitedBestCars = 520;
  writeSave(save);
  const read = loadSave();
  assert.ok(read.career.collection.includes('endurance') && read.career.collection.includes('overdrive'));
  assert.ok(!read.career.collection.includes('infinity'));
  assert.deepEqual(Careers.claimUnlimited(read.career, 1000), ['infinity']);
  assert.deepEqual(Careers.claimUnlimited(read.career, 1000), [], 'once');
});

test('Eight syndicate bosses take turns; a rematch is its own boss one round on; the twins need two arrests', async () => {
  const { bossAt, forLevel: atLevel } = await load('/src/core/levels.ts');
  const { rematch, trialConfig } = await load('/src/core/trials.ts');
  const { criminalCaught } = await load('/src/core/specials.ts');
  const { ScoreBoard } = await load('/src/core/scoring.ts');
  const kinds = [15, 30, 45, 60, 75, 90, 105, 120].map((l) => bossAt(l, baseConfig).kind);
  assert.deepEqual(kinds, ['convoy', 'getaway', 'armoured', 'phantom', 'twins', 'decoy', 'smuggler', 'kingpin']);
  assert.deepEqual(bossAt(135, baseConfig), { kind: 'convoy', round: 1 }, 'then the next round');
  const smuggler = atLevel(baseConfig, 105, 1);
  assert.equal(smuggler.bossArmour, 2);
  assert.equal(smuggler.convoyEscorts, 0);
  assert.ok(atLevel(baseConfig, 90, 1).bossDisguise, 'the decoy dresses its escorts');
  // A rematch keeps its level from before the eight, and still brings its own boss.
  assert.equal(rematch('convoy').level, 75);
  for (const kind of ['convoy', 'phantom', 'twins', 'kingpin']) {
    const c = trialConfig(rematch(kind), baseConfig);
    assert.equal(c.bossKind, kind, `${kind} rematch`);
    assert.ok(c.convoy);
  }
  assert.ok(trialConfig(rematch('kingpin'), baseConfig).blackout, 'the kingpin comes in a blackout');
  // The twins: the first arrest calls the second; only the second brings the heist back.
  const config = atLevel(baseConfig, 75, 1);
  const w = { config, score: new ScoreBoard(), isScoring: true, events: [], criminal: { kind: 'active', vehicle: 1, deadline: 99 }, escortsDue: null, criminalRng: { range: (lo) => lo }, vehicle: () => ({ role: 'boss' }), scoreTakedown: () => 1000 };
  criminalCaught(w, 1, 2, { x: 0, y: 0 }, 10);
  assert.ok(!w.score.bossBusted, 'one twin is not the boss busted');
  assert.equal(w.criminal.kind, 'idle');
  assert.ok(w.criminal.next < 12, 'the second comes at once');
  criminalCaught(w, 3, 4, { x: 0, y: 0 }, 20);
  assert.ok(w.score.bossBusted);
  assert.equal(w.events.filter((e) => e.type === 'heistRecovered').length, 1);
});

test('the recovered heist is paid only with a completed shift: a boss level cannot be farmed by losing it', () => {
  const world = new World(forLevel(baseConfig, 15, 1), 7, { startsOnFirstTap: false });
  const heist = baseConfig.heistRecoveryBase + baseConfig.heistRecoveryPerLevel * 15;
  world.score.money = 500 + heist;
  world.score.heistMoney = heist;
  world.score.bossBusted = true;
  assert.equal(world.result('completed', 1).money, 500 + heist, 'completed: the heist is kept');
  for (const outcome of ['struckOut', 'escaped', 'failed']) assert.equal(world.result(outcome, 1).money, 500, `${outcome}: the heist is gone, the rest stays`);
});

// MARK: Street Builder

test('Street Builder moves a built arm or module for free, only to a free slot, never the player’s arm', () => {
  const c = newCareer();
  c.money = 1000;
  const cfg = baseConfig;
  // The start arms sit on 0, 4, 8, 12; arms keep at least two slots between them.
  assert.ok(!Careers.moveArm(c, 0, 2, cfg), 'the player’s own arm stays');
  assert.ok(!Careers.moveArm(c, 4, 7, cfg), 'too close to the arm on 8');
  assert.ok(!Careers.moveArm(c, 4, 8, cfg), 'a slot that has an arm');
  assert.ok(Careers.moveArm(c, 4, 5, cfg));
  assert.deepEqual(c.armSlots, [0, 5, 8, 12]);
  assert.ok(Careers.moveArm(c, 5, 4, cfg), 'and back');
  assert.ok(!Careers.moveArm(c, 3, 2, cfg), 'no arm on 3');
  c.modules = { 1: 'tollBooth', 2: 'towDepot' };
  assert.ok(!Careers.moveModule(c, 1, 2, cfg), 'a module slot that is taken');
  assert.ok(!Careers.moveModule(c, 1, cfg.moduleSlotCount, cfg), 'off the ring');
  assert.ok(!Careers.moveModule(c, 0, 3, cfg), 'nothing on 0 to move');
  assert.ok(Careers.moveModule(c, 1, 4, cfg));
  assert.deepEqual(c.modules, { 2: 'towDepot', 4: 'tollBooth' });
  assert.equal(c.money, 1000, 'moving is free');
});

// MARK: What's new

test("What's new has one entry per day, newest first, and a new item lights the dot again", async () => {
  const days = PATCH_NOTES.map((n) => n.id);
  for (const day of days) assert.match(day, /^\d{4}-\d{2}-\d{2}$/, `${day}: the id is the day`);
  assert.equal(new Set(days).size, days.length, 'one entry per day: add to the day that is already there');
  assert.deepEqual([...days].sort().reverse(), days, 'newest day first');
  for (const n of PATCH_NOTES) {
    assert.ok(n.items.length > 0 && n.title.length > 0, `${n.id} says something`);
    assert.equal(new Date(`${n.id}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }), n.date, `${n.id}: the date matches`);
  }
  const before = latestNote();
  PATCH_NOTES[0].items.unshift('Something new today.');
  try {
    assert.notEqual(latestNote(), before);
  } finally {
    PATCH_NOTES[0].items.shift();
  }
});

test("a player's line in What's new says so: from a player, or thanks by name", () => {
  assert.equal(itemCredit('Fixed: something of ours.'), null);
  assert.equal(itemText('Fixed: something of ours.'), 'Fixed: something of ours.');
  assert.equal(itemCredit({ text: 'Dark mode for the lobby.', from: null }), 'From a player');
  assert.equal(itemCredit({ text: 'Dark mode for the lobby.', from: 'Mia' }), 'Thanks, Mia');
  assert.equal(itemText({ text: 'Dark mode for the lobby.', from: 'Mia' }), 'Dark mode for the lobby.');
  // A credited line counts like any other for the dot on the settings button.
  const before = latestNote();
  PATCH_NOTES[0].items.unshift({ text: 'From a player.', from: null });
  try {
    assert.notEqual(latestNote(), before);
  } finally {
    PATCH_NOTES[0].items.shift();
  }
});

// MARK: Landmarks, Boss Rush, QR code

test('the Étoile has twelve roads, opens at Prestige 5, and the careful bot drives through it without a crash', () => {
  const etoile = landmarkOf('landmark.etoile');
  assert.ok(etoile && LANDMARKS.includes(etoile) && trialById(etoile.id) === etoile);
  const career = newCareer();
  assert.ok(!trialOpen(etoile, career), 'closed at the start');
  career.prestige = LANDMARK_PRESTIGE - 1;
  assert.ok(!trialOpen(etoile, career), 'closed one rank short');
  career.prestige = LANDMARK_PRESTIGE;
  assert.ok(trialOpen(etoile, career), 'open at the rank');
  career.prestige = 0;
  career.trialsDone.push(etoile.id);
  assert.ok(trialOpen(etoile, career), 'a passed landmark stays open');
  assert.ok(RUN_IDS.includes(etoile.id), 'a save keeps it');
  for (let i = 0; i < 4; i++) {
    const seed = (etoile.seed + i) >>> 0;
    const config = trialConfig({ ...etoile, seed }, baseConfig);
    assert.equal(new World(config, seed, { startsOnFirstTap: false }).layout.arms.length, 12, 'twelve roads');
    const { result } = playConfig(config, seed);
    assert.ok(result, `seed ${i}: the shift ends`);
    assert.equal(result.crashes, 0, `seed ${i}: the careful bot does not crash`);
  }
});

/** A finished boss shift of a Boss Rush: caught (`won`) or lost. */
const rushShift = (won, time) => ({ ...play(77, 5, careful).result, outcome: won ? 'completed' : 'struckOut', bossBusted: won, time });

test('Boss Rush: opens when all bosses are down, goes boss by boss, starts over after a loss, pays the first clear once and keeps the best time', () => {
  const career = newCareer();
  assert.ok(!rushOpen(career));
  career.bossesBeaten = BOSS_KINDS.slice(0, -1);
  assert.ok(!rushOpen(career), 'one boss short');
  career.bossesBeaten = [...BOSS_KINDS];
  assert.ok(rushOpen(career));
  const money = career.money;
  const card = runCard(newRush(), baseConfig, 'shift', false, career, 20000);
  assert.equal(card.caption, S.rush.caption);
  assert.equal(card.badge, S.rush.step(1, BOSS_KINDS.length));

  const clear = (secondsPerBoss) => {
    let run = newRush();
    for (let step = 0; step < BOSS_KINDS.length; step++) {
      assert.equal(run.trial.id, rematchId(BOSS_KINDS[step]), `boss ${step + 1} of the rush`);
      const settled = settleSpecial(run, rushShift(true, secondsPerBoss), career, 20000, baseConfig);
      assert.equal(run.rush.state, step < BOSS_KINDS.length - 1 ? 'next' : 'cleared');
      assert.ok(!career.trialsDone.includes(rematchId(BOSS_KINDS[step])), 'a rush shift pays no rematch reward');
      if (step === BOSS_KINDS.length - 1) assert.equal(settled.summary.caption, S.rush.cleared);
      run = advanceRush(run);
    }
    assert.equal(run.rush.step, 0, 'after a clear it starts again at the first boss');
    assert.equal(run.rush.time, 0);
  };

  clear(60);
  assert.equal(career.money, money + RUSH_REWARD, 'the first clear pays');
  assert.ok(career.trialsDone.includes(RUSH_ID));
  assert.equal(career.rushBest, 480, 'eight bosses of 60 s');
  assert.equal(career.rushFurthest, BOSS_KINDS.length);

  clear(70);
  assert.equal(career.money, money + RUSH_REWARD, 'a second clear pays nothing');
  assert.equal(career.rushBest, 480, 'a slower clear keeps the best time');
  clear(50);
  assert.equal(career.rushBest, 400, 'a faster clear is the new best');

  // A lost round ends the rush: the next shift is the first boss again, with a clean clock.
  let run = newRush();
  for (let step = 0; step < 3; step++) {
    settleSpecial(run, rushShift(true, 60), career, 20000, baseConfig);
    run = advanceRush(run);
  }
  const lost = settleSpecial(run, rushShift(false, 20), career, 20000, baseConfig);
  assert.equal(lost.summary.caption, S.rush.over);
  assert.equal(run.rush.state, 'over');
  run = advanceRush(run);
  assert.equal(run.rush.step, 0);
  assert.equal(run.rush.time, 0);
  assert.equal(run.trial.id, rematchId(BOSS_KINDS[0]));
  assert.equal(advanceRush(run), run, 'nothing ended: the run stays');
  assert.equal(career.rushBest, 400, 'a lost rush does not touch the best time');
});

test('a save keeps its Boss Rush record and the landmark, and drops what it does not know', () => {
  fakeStorage({
    'carGame.save.v2': JSON.stringify({ career: { rushBest: 321.5, rushFurthest: 99, trialsDone: ['bossRush', 'landmark.etoile', 'landmark.nowhere', 'deadCentre'] } }),
  });
  const { career } = loadSave();
  assert.equal(career.rushBest, 321.5);
  assert.equal(career.rushFurthest, BOSS_KINDS.length, 'never more than there are bosses');
  assert.deepEqual(career.trialsDone, ['bossRush', 'landmark.etoile', 'deadCentre']);
  fakeStorage({ 'carGame.save.v2': JSON.stringify({ career: { rushBest: 'fast', rushFurthest: -3 } }) });
  const old = loadSave().career;
  assert.equal(old.rushBest, 0);
  assert.equal(old.rushFurthest, 0);
});

test('the lobby QR code encodes the invite link in a proper square', () => {
  const link = 'https://game.gustaff.dev/#join=4821';
  const qr = qrcode(0, 'M');
  qr.addData(link);
  qr.make();
  const n = qr.getModuleCount();
  assert.ok(n >= 21 && (n - 21) % 4 === 0, `a valid QR size, got ${n}`);
  // The three finder squares sit in the corners, their outer ring dark.
  for (const [r, c] of [[0, 0], [0, n - 1], [n - 1, 0]]) assert.ok(qr.isDark(r, c), `finder corner ${r},${c}`);
  const again = qrcode(0, 'M');
  again.addData(link);
  again.make();
  assert.equal(again.createDataURL?.(2) ?? '', qr.createDataURL?.(2) ?? '', 'the same link gives the same code');
});
