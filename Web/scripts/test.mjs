// Automated tests (node:test, no extra packages): the rules replay exactly (Legendary Shifts and
// multiplayer matches too), the careful bot stays safe, bosses and ambulances are announced,
// saves survive old and broken data, multiplayer messages are checked at the door, and the
// notice queue tells one thing at a time.
//   npm test
// The TypeScript sources are loaded through Vite, like the balancing bots.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createHmac } from 'node:crypto';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
after(() => server.close());
const load = (path) => server.ssrLoadModule(path);

const { World } = await load('/src/core/world.ts');
const { detourArmSlot } = await load('/src/core/modules.ts');
const { CHALLENGES, challengesOf, challengeMet, challengeReward } = await load('/src/core/daily.ts');
const { baseConfig, BOSS_KINDS } = await load('/src/core/config.ts');
const { forLevel, UPGRADES, upgradeMaxSteps } = await load('/src/core/levels.ts');
const { COSMETICS, rollChest, PITY_LEGENDARY_CHESTS } = await load('/src/core/loot.ts');
const { Goals } = await load('/src/core/goals.ts');
const { forHeat, heatPay, heatXp } = await load('/src/core/heat.ts');
const { due: dueBoards } = await load('/src/net/leaderboard.ts');
const { UNLIMITED_TIERS, UNLIMITED_MARKS, tierOf, nextTier, markPassed, markReward } = await load('/src/core/tiers.ts');
const { newSave, newCareer, Careers } = await load('/src/core/career.ts');
const { encodeChallenge, decodeChallenge, challengeOf } = await load('/src/core/challenge.ts');
const { loadSave, writeSave, parseImport, saveTrust, sealSave, SEAL_FIELD } = await load('/src/storage/save.ts');
const { sealOf } = await load('/src/storage/seal.ts');
const { Casino } = await load('/src/core/casino.ts');
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
const { PATCH_NOTES, latestNote, itemText, itemCredit, changelogFile } = await load('/src/present/patchNotes.ts');
const { parseInviteCode } = await load('/src/net/invite.ts');
const { INVITE_LEVEL, INVITE_REMINDER_LEVEL } = await load('/src/core/config.ts');
const { default: qrcode } = await import('qrcode-generator');
const { ResultBanner } = await load('/src/present/hud.ts');
// Every module loaded at the top level comes before the first test: a load later down the file
// can still be pending when the tests above it have finished and `after` has closed the server.
const { parseBackdropLink, youtubeEmbed } = await load('/src/present/backdrop.ts');
const { prestigeReward, BIG_SCREEN } = await load('/src/core/loot.ts');
const { MUTATORS, mutatorOf, mutatorSky } = await load('/src/core/mutators.ts');
const { forSeason } = await load('/src/core/seasons.ts');
const { drawWeather } = await load('/src/core/levels.ts');
const { TOURS, tourOn, nextTour, tourTrial, tourStopOf, completeStop, tourStopsDone, stopDoneKey } = await load('/src/core/tours.ts');
const { FAMILIES, Achievements, achievementTotal, STAT_KEYS, TIER_PAY } = await load('/src/core/achievements.ts');
const { Skins } = await load('/src/present/skins.ts');
const { albumItems } = await load('/src/core/loot.ts');

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
  const before = Date.UTC(2026, 9, 20);
  assert.deepEqual(parseImport(file, before), save);
  assert.equal(parseImport('{"hello": 1}', before), null);
  assert.equal(parseImport('nope', before), null);
});

test('a save survives the trip through the cloud unchanged, and a change is noticed', () => {
  const save = newSave();
  save.career.level = 33;
  save.career.money = 4200;
  save.unlimitedBest = 1500;
  save.hints = ['modes']; // what reading a save with a record adds anyway
  // The cloud stores the save as the game wrote it and sends it back as JSON.
  const back = parseImport(JSON.stringify(JSON.parse(JSON.stringify({ ...save, [SEAL_FIELD]: sealSave(save), cloudAccount: { id: 'a', name: 'Ann', token: 't' } }))));
  assert.deepEqual(back, save);
  assert.equal(fingerprint(JSON.stringify(back)), fingerprint(JSON.stringify(save)), 'a clean copy is not "changed"');
  save.career.money += 1;
  assert.notEqual(fingerprint(JSON.stringify(save)), fingerprint(JSON.stringify(back)));
});

// MARK: Sealed saves

test('the seal is an HMAC-SHA-256, cut to 128 bits', () => {
  for (const text of ['', 'abc', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'Größe ✓ '.repeat(500)]) {
    const key = ['rat', 'seal', '2026-10', String(0x5ea1ed), 'keep-the-money-honest'].join('·');
    assert.equal(sealOf(text), createHmac('sha256', key).update(text, 'utf8').digest('hex').slice(0, 32), `${text.length} characters`);
  }
});

const sealedWith = (money) => {
  const map = fakeStorage();
  const save = newSave();
  save.career.money = money;
  assert.equal(writeSave(save), true);
  return { map, save };
};

test('a written save reads back sealed and trusted', () => {
  const { save } = sealedWith(1234);
  assert.equal(loadSave().career.money, 1234);
  assert.equal(saveTrust(), 'fine');
  assert.ok(JSON.parse(localStorage.getItem('carGame.save.v2'))[SEAL_FIELD]);
  assert.ok(!(SEAL_FIELD in loadSave()), 'the seal is not part of the save');
  assert.deepEqual(loadSave(), save);
});

test('money edited in the stored save is undone: the last written save comes back', () => {
  const { map } = sealedWith(1234);
  const edited = JSON.parse(map.get('carGame.save.v2'));
  edited.career.money = 999_999_999;
  map.set('carGame.save.v2', JSON.stringify(edited));
  assert.equal(loadSave().career.money, 1234);
  assert.equal(saveTrust(), 'restored');
});

test('taking the seal off does not help once this browser has sealed a save', () => {
  const { map } = sealedWith(1234);
  const edited = JSON.parse(map.get('carGame.save.v2'));
  edited.career.money = 999_999_999;
  delete edited[SEAL_FIELD];
  map.set('carGame.save.v2', JSON.stringify(edited));
  assert.equal(loadSave().career.money, 1234);
  assert.equal(saveTrust(), 'restored');
});

test('edited save and no backup: what was played stays, money and chests do not', () => {
  const { map } = sealedWith(1234);
  const edited = JSON.parse(map.get('carGame.save.v2'));
  edited.career.money = 999_999_999;
  edited.career.level = 17;
  edited.career.chests = ['premium'];
  map.set('carGame.save.v2', JSON.stringify(edited));
  map.delete('carGame.save.v2.bak');
  const save = loadSave();
  assert.equal(save.career.money, 0);
  assert.deepEqual(save.career.chests, []);
  assert.equal(save.career.level, 17);
  assert.equal(saveTrust(), 'distrusted');
});

test('a save from before the seal is taken in, and is sealed by its next write', () => {
  const map = fakeStorage({ 'carGame.save.v2': JSON.stringify({ career: { level: 9, money: 4000 } }) });
  const save = loadSave();
  assert.equal(save.career.money, 4000);
  assert.equal(saveTrust(), 'fine');
  writeSave(save);
  assert.ok(map.get('carGame.sealed.v1'));
  assert.equal(loadSave().career.money, 4000);
});

test('a cloud copy must match its seal; an unsealed one is only accepted until the cut-off', () => {
  const save = newSave();
  save.career.money = 700;
  const copy = { ...save, [SEAL_FIELD]: sealSave(save), cloudAccount: { id: 'a', name: 'Ann', token: 't' } };
  const late = Date.UTC(2027, 0, 1);
  assert.equal(parseImport(JSON.stringify(copy), late)?.career.money, 700);
  assert.equal(parseImport(JSON.stringify({ ...copy, career: { ...copy.career, money: 9e9 } }), late), null, 'edited after sealing');
  const unsealed = { ...save };
  assert.equal(parseImport(JSON.stringify(unsealed), Date.UTC(2026, 9, 20))?.career.money, 700);
  assert.equal(parseImport(JSON.stringify(unsealed), late), null);
});

test('the casino cannot be worked out from the save, and a Crash drive keeps its end to itself', () => {
  const career = newCareer();
  career.money = 10_000;
  career.casinoSeed = 4242;
  // Without entropy the same save gives the same result (the bots rely on it).
  const a = structuredClone(career);
  const b = structuredClone(career);
  assert.deepEqual(Casino.spin(a, 100, 1), Casino.spin(b, 100, 1));
  // With it, the save alone no longer says what comes: the same save, many different draws.
  let n = 1;
  Casino.useEntropy(() => (n = (Math.imul(n, 1664525) + 1013904223) >>> 0));
  try {
    const stops = new Set();
    for (let i = 0; i < 30; i++) stops.add(Casino.spin({ ...structuredClone(career), money: 10_000 }, 100, 1).stops.join());
    assert.ok(stops.size > 10, `${stops.size} different spins from one save`);
    const drive = structuredClone(career);
    const point = Casino.startCrash(drive, 100, 1);
    assert.ok(point >= 1);
    assert.ok(!('seed' in JSON.parse(JSON.stringify(drive.casinoPending))), 'the drive is saved without its seed');
    assert.equal(Casino.cashOut(drive, 1, 1), 0, 'a cash-out at 1.00× is a crash');
  } finally {
    Casino.useEntropy(null);
  }
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

test('the first Perfect Run says what it is, later ones leave it to the ring', () => {
  const save = newSave();
  const first = bookShift(save, completed(1, { isPerfectRun: true }), context(1));
  assert.ok(first.news.some((n) => n.startsWith('PERFECT RUN ·')));
  const later = bookShift(save, completed(2, { isPerfectRun: true }), context(2));
  assert.ok(!later.news.some((n) => n.startsWith('PERFECT RUN')));
});

test('the install and backup hints come due once, at their levels', () => {
  const save = newSave();
  save.career.level = baseConfig.installHintAfterLevel;
  const level = save.career.level;
  assert.deepEqual(bookShift(save, completed(level), context(level)).due, ['install']);
  save.career.level = level;
  assert.deepEqual(bookShift(save, completed(level), context(level)).due, []);
  save.hints.push('inviteReminder', 'portalLogin'); // their own tests below
  save.career.level = baseConfig.backupHintAfterLevel;
  const later = save.career.level;
  assert.deepEqual(bookShift(save, completed(later), context(later)).due, ['backup']);
});

test('reaching level 10 brings the invite reminder once, and only to a shift that gets there', () => {
  const save = newSave();
  save.career.level = INVITE_REMINDER_LEVEL - 1;
  save.hints = ['modes', 'install', 'backup', 'portalLogin'];
  const before = INVITE_REMINDER_LEVEL - 1;
  // A shift that stays below it says nothing.
  const low = { ...completed(before - 1) };
  assert.deepEqual(bookShift(save, low, context(before - 1)).due, []);
  save.career.level = INVITE_REMINDER_LEVEL - 1;
  assert.deepEqual(bookShift(save, completed(before), context(before)).due, ['inviteReminder']);
  assert.ok(save.hints.includes('inviteReminder'));
  // Played again at 10 and beyond: not told twice. A veteran who has had the news (the start-up message marks both) is not told at all.
  save.career.level = INVITE_REMINDER_LEVEL;
  assert.deepEqual(bookShift(save, completed(INVITE_REMINDER_LEVEL), context(INVITE_REMINDER_LEVEL)).due, []);
  const veteran = newSave();
  veteran.hints = ['modes', 'install', 'backup', 'invite', 'inviteReminder', 'portalLogin'];
  veteran.career.level = INVITE_REMINDER_LEVEL - 1;
  assert.deepEqual(bookShift(veteran, completed(before), context(before)).due, []);
});

test('a CrazyGames guest is offered the login once, after clearing its level', () => {
  const save = newSave();
  save.hints = ['install'];
  const at = baseConfig.portalLoginAfterLevel;
  save.career.level = at - 1;
  assert.deepEqual(bookShift(save, completed(at - 1), context(at - 1)).due, []);
  save.career.level = at;
  assert.deepEqual(bookShift(save, completed(at), context(at)).due, ['portalLogin']);
  save.career.level = at;
  assert.deepEqual(bookShift(save, completed(at), context(at)).due, []);
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
  c.prestige = 25;
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
  for (const id of ['gilded', 'singularity', 'eventHorizon', 'undying', 'phoenix', 'glowtide', 'moonmirror']) assert.ok(!c.collection.includes(id), id);
  for (const id of ['chrono', 'biolume']) assert.ok(c.collection.includes(id), `${id}: Elite 55 and 65 are behind a save at 80`);
  assert.ok(!c.collection.includes('dragon'), 'Legendary 30 is not behind a save at 12');
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

test('a module goes up two levels for money, keeps its level when moved and loses it when torn down', () => {
  const c = newCareer();
  const cfg = baseConfig;
  c.modules = { 1: 'tollBooth' };
  c.money = 100000;
  assert.equal(Careers.moduleUpgradePrice(c, 1, cfg), 15600);
  assert.ok(Careers.upgradeModule(c, 1, cfg));
  assert.equal(Careers.moduleUpgradePrice(c, 1, cfg), 26000);
  assert.ok(Careers.upgradeModule(c, 1, cfg));
  assert.equal(c.moduleLevels[1], 3);
  assert.equal(Careers.moduleUpgradePrice(c, 1, cfg), null, 'level 3 is the top');
  assert.ok(!Careers.upgradeModule(c, 1, cfg));
  assert.equal(c.money, 100000 - 15600 - 26000);
  assert.ok(Careers.moveModule(c, 1, 4, cfg));
  assert.deepEqual(c.moduleLevels, { 4: 3 });
  Careers.removeModule(c, 4);
  assert.deepEqual(c.moduleLevels, {});
  assert.equal(Careers.moduleUpgradePrice(c, 4, cfg), null, 'nothing on that slot');
  c.modules = { 2: 'billboard' };
  c.money = 10;
  assert.ok(!Careers.upgradeModule(c, 2, cfg), 'too poor');
  assert.deepEqual(c.moduleLevels, {});
});

test('module levels survive a save and a challenge link', () => {
  const career = newCareer();
  career.modules = { 0: 'detour', 3: 'billboard', 5: 'tollBooth' };
  career.moduleLevels = { 3: 2, 5: 3 };
  const spec = challengeOf(career, 'shift', 1, 5, null, 0, null);
  assert.deepEqual(decodeChallenge(encodeChallenge(spec)), spec);
  assert.deepEqual(decodeChallenge(encodeChallenge(spec)).moduleLevels, { 3: 2, 5: 3 });
  fakeStorage();
  const save = newSave();
  save.career = career;
  writeSave(save);
  assert.deepEqual(loadSave().career.moduleLevels, { 3: 2, 5: 3 });
  assert.deepEqual(Careers.config(career, baseConfig, 1).moduleLevels, { 3: 2, 5: 3 });
});

test('a detour sign turns the cars that pass it off at its exit, and leaves the rest alone', () => {
  // Arms on 0, 4, 8, 12; the sign on module slot 2 sits just before the exit of arm 12.
  const turned = (modules, entry, planned, laps = 0, level = 1) => {
    const cfg = cloneConfig(baseConfig);
    cfg.modules = modules;
    cfg.moduleLevels = level > 1 ? { 2: level } : {};
    const world = new World(cfg, 7, { startsOnFirstTap: false });
    const slot = (n) => world.layout.arms.find((a) => a.slot === n);
    let hits = 0;
    let lapsLeft = 0;
    for (let i = 0; i < 4000; i++) {
      const merge = { arm: slot(entry), exitArm: slot(planned), extraLaps: laps };
      world.applyDetour(merge, 0);
      if (merge.exitArm.slot !== planned) hits++;
      lapsLeft += merge.extraLaps;
    }
    return { share: hits / 4000, laps: lapsLeft / 4000 };
  };
  assert.equal(turned({}, 8, 4).share, 0, 'no sign: nobody is turned');
  assert.ok(Math.abs(turned({ 2: 'detour' }, 8, 4).share - 0.45) < 0.04, 'level 1: 45 %');
  assert.ok(Math.abs(turned({ 2: 'detour' }, 8, 4, 0, 3).share - 0.75) < 0.04, 'level 3: 75 %');
  const lapper = turned({ 2: 'detour' }, 8, 4, 2, 3);
  assert.ok(Math.abs(lapper.laps - 2 * 0.25) < 0.1, 'a turned car forgets its laps');
  assert.equal(turned({ 2: 'detour' }, 12, 4).share, 0, 'joined after the sign: untouched');
  assert.equal(turned({ 2: 'detour' }, 4, 8).share, 0, 'its own exit comes before the sign: untouched');
  assert.equal(turned({ 2: 'detour' }, 8, 12).share, 0, 'it leaves at the sign’s exit anyway');
  assert.equal(turned({ 1: 'detour', 2: 'detour' }, 4, 8, 1).share > 0.45, true, 'two signs turn more cars than one');
});

test('a detour sign only counts where an exit lies between it and the player’s arm', () => {
  const at = (slot, armSlots = [0, 4, 8, 12]) => detourArmSlot({ ...baseConfig, armSlots }, slot);
  assert.equal(at(0), 8);
  assert.equal(at(1), 12);
  assert.equal(at(2), 12);
  assert.equal(at(3), null, 'no exit left before the player’s arm');
  assert.equal(at(4), null, 'on the player’s own arm');
  assert.equal(at(5), null, 'after the player’s arm no arm joins before it');
  assert.equal(at(5, [0, 2, 4, 8, 12]), 4, 'a built arm upstream gives it something to turn');
});

// MARK: Quests, upgrades, Hall of Fame

test('there are plenty of daily quests: three different ones a day, each with a text, a reward and a rule', () => {
  assert.ok(CHALLENGES.length >= 14);
  const seen = new Set();
  for (let day = 20000; day < 20200; day++) {
    const today = challengesOf(day);
    assert.equal(today.length, 3);
    assert.equal(new Set(today).size, 3, 'no quest twice in a day');
    for (const q of today) seen.add(q);
  }
  assert.equal(seen.size, CHALLENGES.length, 'every quest turns up');
  const none = { perfects: 0, tightFits: 0, takedowns: 0, transporters: 0, bestChain: 0, bestCombo: 0, isPerfectRun: false, cleanMerges: 0, nearMisses: 0 };
  for (const q of CHALLENGES) {
    assert.notEqual(S.daily.challenge(q), undefined, `${q} has a text`);
    assert.ok(challengeReward(q) >= 250, `${q} pays`);
    assert.equal(challengeMet(q, none), false, `${q} is not met by an empty shift`);
  }
  assert.ok(challengeMet('oneTakedown', { ...none, takedowns: 1 }));
  assert.ok(challengeMet('hugeCombo', { ...none, bestCombo: 25 }) && !challengeMet('hugeCombo', { ...none, bestCombo: 24 }));
  assert.ok(challengeMet('twoNearMisses', { ...none, nearMisses: 2 }));
});

test('Freight and Quick Recovery pay a little for the busier road, and nothing else about pay changes', async () => {
  const { upgraded } = await load('/src/core/levels.ts');
  const none = upgraded(baseConfig, () => 0);
  assert.equal(none.shiftPay, baseConfig.shiftPay);
  const freight = upgraded(baseConfig, (u) => (u === 'freight' ? 8 : 0));
  assert.equal(freight.shiftPay, Math.round(baseConfig.shiftPay * (1 + 8 * baseConfig.freightPayPerStep)));
  const both = upgraded(baseConfig, (u) => (u === 'freight' ? 8 : u === 'quickRecovery' ? 5 : u === 'overtime' ? 10 : 0));
  assert.ok(both.shiftPay > freight.shiftPay);
});

test('the Hall of Fame has its own sheet that says what building it gives', async () => {
  const { Details } = await load('/src/present/detail.ts');
  const c = newCareer();
  c.prestige = 2;
  const sheet = Details.hall(c, baseConfig);
  assert.equal(sheet.title, 'Hall of Fame');
  assert.ok(sheet.body.length >= 3 && sheet.body.every((p) => p.length > 30));
  assert.ok(sheet.rows.some((r) => r.value.includes('2 stars')));
  assert.ok(sheet.actions.some((a) => a.action.k === 'buildHall') && sheet.actions.some((a) => a.action.k === 'showElite'));
  const elite = Details.elite(c, baseConfig, false);
  assert.ok(elite.sections.flatMap((x) => x.rows).some((r) => r.action?.k === 'showHall'), 'the Elite sheet opens it from the Hall row');
  c.hallBuilt = true;
  assert.ok(!Details.hall(c, baseConfig).actions.some((a) => a.action.k === 'buildHall'), 'built: nothing left to build');
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

test("the changelog file is the same list as What's new, as plain data for the website", () => {
  const file = changelogFile();
  assert.equal(file.version, 1);
  assert.equal(file.updated, PATCH_NOTES[0].id, 'the newest day tells a reader whether anything changed');
  assert.deepEqual(file.days.map((d) => d.id), PATCH_NOTES.map((n) => n.id));
  assert.deepEqual(JSON.parse(JSON.stringify(file)), file, 'nothing but JSON');
  for (const [i, day] of file.days.entries()) {
    assert.equal(day.items.length, PATCH_NOTES[i].items.length);
    assert.equal(day.items[0].text, itemText(PATCH_NOTES[i].items[0]));
  }
  // A line from a player keeps its credit; one of ours has no `from` at all.
  const custom = changelogFile([
    { id: '2026-01-02', date: '2 January 2026', title: 'T', impact: 'fix', items: ['Ours.', { text: 'Theirs.', from: null }, { text: 'Named.', from: 'Mia' }] },
  ]);
  assert.deepEqual(custom.days[0].items, [{ text: 'Ours.' }, { text: 'Theirs.', from: null }, { text: 'Named.', from: 'Mia' }]);
});

// MARK: Invite a friend

test('an invite code is read in any spelling, and only a real friend code is kept', () => {
  assert.equal(parseInviteCode('k7m2-9qxa'), 'K7M29QXA');
  assert.equal(parseInviteCode(' K7M2 9QXA '), 'K7M29QXA');
  for (const bad of [null, '', 'K7M2', 'K7M2-9QXA-4TFB', 'K7M2-9QX0', 'K7M2-9QXI', '<script>', 'K7M2-9QX!']) assert.equal(parseInviteCode(bad), null, String(bad));
});

test('the chest from an invite says why it came, any other chest stays a gift from the team', () => {
  assert.equal(S.rewards.invite('invite:friend:Anna', 'standard'), `INVITE REWARD · ${S.shop.chest('standard')} · Anna reached level ${INVITE_LEVEL}`);
  assert.equal(S.rewards.invite('invite:welcome:Anna', 'standard'), `INVITE REWARD · ${S.shop.chest('standard')} · you joined through Anna`);
  assert.equal(S.rewards.invite('invite:milestone:3', 'premium'), `INVITE BONUS · ${S.shop.chest('premium')} · 3 friends joined`);
  // A colon in a name stays in the name.
  assert.match(S.rewards.invite('invite:friend:A:B', 'standard'), /A:B reached/);
  assert.equal(S.rewards.invite('bug report', 'standard'), null);
  assert.equal(S.rewards.invite('invite:other:x', 'standard'), null);
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

test('an ad pays one free step of one upgrade a day: the same pick all day, an upgrade that can be bought, nothing twice', () => {
  const c = newCareer();
  c.level = 30;
  c.casinoSeed = 4242;
  const offer = Careers.adUpgradeOffer(c, 100);
  assert.ok(offer, 'there is a pick');
  assert.equal(Careers.adUpgradeOffer(c, 100), offer, 'the same all day');
  assert.ok(Careers.priceOf(c, offer) !== null, 'one the player could buy');
  const picks = new Set(Array.from({ length: 40 }, (_, day) => Careers.adUpgradeOffer(c, day)));
  assert.ok(picks.size > 3, 'it varies from day to day');
  const before = Careers.steps(c, offer);
  const money = c.money;
  assert.equal(Careers.rewardAdUpgrade(c, 100), offer);
  assert.equal(Careers.steps(c, offer), before + 1, 'one step');
  assert.equal(c.money, money, 'for free');
  assert.equal(Careers.adUpgradeOffer(c, 100), null, 'taken for today');
  assert.equal(Careers.rewardAdUpgrade(c, 100), null);
  assert.ok(Careers.adUpgradeOffer(c, 101), 'a new pick tomorrow');
  // A maxed upgrade is never the pick; with everything maxed there is none.
  const all = newCareer();
  all.level = 99;
  for (const u of UPGRADES) all.upgrades[u] = upgradeMaxSteps[u];
  assert.equal(Careers.adUpgradeOffer(all, 5), null);
  // Upgrades not unlocked yet are never given away.
  const early = newCareer();
  for (let day = 0; day < 40; day++) {
    const u = Careers.adUpgradeOffer(early, day);
    assert.ok(u === null || Careers.priceOf(early, u) !== null, `day ${day}: ${u}`);
  }
});

test('the Skin Upgrade boost: an ad adds its points to the chance, is spent by one round, wins or loses, and is limited per day', () => {
  const skins = COSMETICS.filter((x) => x.source.kind === 'chest' && x.kind === 'carSkin');
  const common = skins.filter((x) => x.rarity === 'common').map((x) => x.id);
  const epic = skins.find((x) => x.rarity === 'epic').id;
  const base = Casino.upgradeChance(common.slice(0, 3), epic);
  assert.ok(Math.abs(Casino.upgradeChance(common.slice(0, 3), epic, baseConfig, true) - (base + baseConfig.upgradeAdBoost)) < 1e-9);
  const c = newCareer();
  c.casinoSeed = 99;
  assert.equal(Careers.rewardAdBoost(c, 7), true);
  assert.equal(c.upgradeBoost, true);
  assert.equal(Careers.rewardAdBoost(c, 7), false, 'one waits already: no second ad for it');
  c.collection = common.slice(0, 3);
  const roll = Casino.upgrade(c, common.slice(0, 3), epic, 7);
  assert.ok(roll.boosted && Math.abs(roll.chance - (base + baseConfig.upgradeAdBoost)) < 1e-9, 'the dial shows what is rolled');
  assert.equal(c.upgradeBoost, false, 'spent by the round');
  assert.equal(Casino.upgrade(c, [], epic, 7), null, 'a refused round keeps nothing from the boost');
  // Not enough skins to play: the boost waits.
  const waiting = newCareer();
  waiting.upgradeBoost = true;
  assert.equal(Casino.upgrade(waiting, common.slice(0, 1), epic, 7), null);
  assert.equal(waiting.upgradeBoost, true, 'a round that did not happen does not use it');
  // The day's limit.
  const d = newCareer();
  let used = 0;
  while (Careers.rewardAdBoost(d, 3)) {
    used++;
    d.upgradeBoost = false;
  }
  assert.equal(used, baseConfig.adBoostsPerDay);
  assert.equal(Careers.adBoostsLeft(d, 3), 0);
  assert.equal(Careers.adBoostsLeft(d, 4), baseConfig.adBoostsPerDay, 'back tomorrow');
});

test('a save keeps the ads of the day and the waiting boost, and old saves start without them', () => {
  const c = newCareer();
  c.adUpgradeDay = 12;
  c.adUpgrades = 1;
  c.adBoostDay = 12;
  c.adBoosts = 2;
  c.upgradeBoost = true;
  fakeStorage({ 'carGame.save.v2': JSON.stringify({ career: c }) });
  const back = loadSave().career;
  assert.deepEqual([back.adUpgradeDay, back.adUpgrades, back.adBoostDay, back.adBoosts, back.upgradeBoost], [12, 1, 12, 2, true]);
  fakeStorage({ 'carGame.save.v2': JSON.stringify({ career: { level: 3 } }) });
  const old = loadSave().career;
  assert.deepEqual([old.adUpgradeDay, old.adUpgrades, old.adBoostDay, old.adBoosts, old.upgradeBoost], [-1, 0, -1, 0, false]);
});

// MARK: Streak Freeze, tiers, pity

test('a Streak Freeze is earned every seven days and covers one missed day', () => {
  const c = newCareer();
  for (let day = 100; day < 107; day++) Careers.startDaily(c, day, baseConfig);
  assert.equal(c.dailyStreak, 7);
  assert.equal(c.streakFreezes, 1, 'the seventh day earns one');
  assert.equal(Goals.streak(c, 108), 7, 'a missed day is covered while the streak is shown');
  const news = Careers.startDaily(c, 108, baseConfig);
  assert.equal(news.frozen, 1);
  assert.equal(c.dailyStreak, 8, 'the streak goes on');
  assert.equal(c.streakFreezes, 0, 'the Freeze is used up');
});

test('every third streak day gives a free Scratch Card; a card is bought at its price, paid before it shows, and a save keeps the hand', () => {
  const c = newCareer();
  c.casinoSeed = 77;
  const gained = [];
  for (let day = 100; day < 106; day++) gained.push(Careers.startDaily(c, day, baseConfig).cards);
  assert.deepEqual(gained, [0, 0, 1, 0, 0, 1]);
  assert.equal(c.scratchCards, 2);
  c.money = baseConfig.scratchPrice - 1;
  assert.equal(Casino.buyCard(c, 1), false, 'not enough money');
  c.money = baseConfig.scratchPrice;
  assert.equal(Casino.buyCard(c, 1), true);
  assert.equal(c.money, 0);
  assert.equal(c.scratchCards, 3);
  const card = Casino.scratch(c, 1);
  assert.equal(c.scratchCards, 2);
  assert.equal(c.money, card.win, 'the prize is already paid when the cells show');
  assert.equal(card.cells.length, 9);
  c.casinoPending = null;
  fakeStorage({ 'carGame.save.v2': JSON.stringify({ career: c }) });
  assert.equal(loadSave().career.scratchCards, 2);
  fakeStorage({ 'carGame.save.v2': JSON.stringify({ career: { level: 3 } }) });
  assert.equal(loadSave().career.scratchCards, 0, 'old saves start with none');
  assert.equal(Casino.scratch({ ...c, scratchCards: 0 }, 1), null, 'no card in hand, no round');
});

test('Roundabout Roulette pays only the bet type, at least twice, and takes the stake first', () => {
  const c = newCareer();
  c.casinoSeed = 5;
  c.money = 100_000;
  for (let i = 0; i < 40; i++) {
    c.casinoPending = null;
    const before = c.money;
    const spin = Casino.roulette(c, 1000, 'van', 1);
    assert.equal(spin.won, spin.symbol === 'van');
    assert.equal(c.money, before - 1000 + spin.win);
    if (spin.won) assert.ok(spin.win >= 2000);
  }
  assert.equal(Casino.roulette(c, 1000, 'nothing', 1), null);
});

test('without enough Freezes a gap breaks the streak, and the stock is capped', () => {
  const c = newCareer();
  for (let day = 100; day < 107; day++) Careers.startDaily(c, day, baseConfig);
  assert.equal(Goals.streak(c, 109), 0, 'two missed days, one Freeze');
  assert.equal(Careers.startDaily(c, 109, baseConfig).frozen, 0);
  assert.equal(c.dailyStreak, 1);
  assert.equal(c.streakFreezes, 1, 'an unused Freeze stays');
  const long = newCareer();
  for (let day = 0; day < 28; day++) Careers.startDaily(long, day, baseConfig);
  assert.equal(long.streakFreezes, baseConfig.streakFreezeMax);
  assert.ok(!Goals.streakAtRisk({ ...long, dailyPlayed: 27 }, 28), 'a Freeze waits: nothing to warn about');
  assert.equal(Careers.completeDaily(newCareer(), 5, baseConfig), baseConfig.dailyPay, 'the Daily Shift pays through the same path');
});

test('a save keeps its Streak Freezes and the pity counter, old saves start with none', () => {
  const c = newCareer();
  c.streakFreezes = 2;
  c.chestsSinceLegendary = 17;
  fakeStorage({ 'carGame.save.v2': JSON.stringify({ career: c }) });
  const back = loadSave().career;
  assert.deepEqual([back.streakFreezes, back.chestsSinceLegendary], [2, 17]);
  fakeStorage({ 'carGame.save.v2': JSON.stringify({ career: { level: 3 } }) });
  const old = loadSave().career;
  assert.deepEqual([old.streakFreezes, old.chestsSinceLegendary], [0, 0]);
});

test('the Legendary pity guarantees one by the last chest and leaves the old draws alone', () => {
  for (let seed = 0; seed < 2000; seed++) {
    for (const kind of ['standard', 'premium', 'event']) {
      assert.equal(rollChest(kind, [], 0, seed, 100, PITY_LEGENDARY_CHESTS - 1).item.rarity, 'legendary');
    }
    assert.equal(rollChest('standard', [], 0, seed, 100).item.id, rollChest('standard', [], 0, seed, 100, 0).item.id);
  }
  const c = newCareer();
  c.chestsSinceLegendary = PITY_LEGENDARY_CHESTS - 1;
  c.chests.push('standard');
  assert.equal(Careers.openChest(c, 0, 7, 100).item.rarity, 'legendary');
  assert.equal(c.chestsSinceLegendary, 0, 'the counter starts again');
  c.chests.push('standard');
  Careers.openChest(c, 0, 8, 100);
  assert.ok(c.chestsSinceLegendary <= 1);
});

test('Unlimited tiers climb with the best run, and the run marks the same cars', () => {
  assert.equal(tierOf(24), null);
  assert.equal(tierOf(25), 'bronze');
  assert.equal(tierOf(199), 'gold');
  assert.equal(tierOf(5000), 'master');
  assert.equal(nextTier(0).cars, 25);
  assert.equal(nextTier(500), null);
  for (const t of UNLIMITED_TIERS) assert.ok(UNLIMITED_MARKS.includes(t.cars));
  for (const cars of [250, 1000]) assert.ok(UNLIMITED_MARKS.includes(cars), `the ${cars}-car skin is a mark too`);
  assert.equal(markPassed(0, 24), null);
  assert.equal(markPassed(24, 25), 25);
  assert.equal(markPassed(25, 26), null, 'once per mark');
  assert.equal(markPassed(49, 50), 50);
});

test('an Unlimited run into a new tier says so, and a repeat does not', () => {
  const save = newSave();
  const run = { ...completed(3), carsSent: 30 };
  const first = bookShift(save, run, context(3, { mode: 'unlimited' }));
  assert.equal(first.news[0], S.modes.tierUp('bronze'));
  assert.ok(!bookShift(save, run, context(3, { mode: 'unlimited' })).news.includes(S.modes.tierUp('bronze')));
  const worse = bookShift(newSave(), { ...run, carsSent: 10 }, context(3, { mode: 'unlimited' }));
  assert.ok(!worse.news.some((n) => n.startsWith('NEW TIER')));
});

test('the new Daily, tier and pity texts read well', () => {
  assert.equal(S.daily.freezes(1), '1 Streak Freeze');
  assert.equal(S.daily.freezes(2), '2 Streak Freezes');
  assert.ok(S.daily.rowLine(8, false, null, 1).includes('1 Streak Freeze'));
  assert.equal(S.modes.mark(100, markReward(100)), '100 cars · GOLD');
  assert.equal(S.modes.mark(250, markReward(250)), '250 cars · ENDURANCE', 'a skin mark names the skin, not the tier below');
  assert.equal(S.modes.mark(500, markReward(500)), '500 cars · MASTER', 'a tier wins over the skin');
  assert.equal(S.modes.mark(1000, markReward(1000)), '1000 cars · INFINITY');
  assert.equal(S.modes.tierLine(null, { cars: 25, id: 'bronze' }), '– · 25 cars for Bronze');
  assert.equal(S.progress.collectionShare(35, 70), 'Collection · 50 %');
  assert.ok(S.shop.pityLegendary(40).includes('40'));
});

// MARK: Tailwind, mark XP, links

const lostAt = (level, left, over = {}) => ({ ...completed(level), outcome: 'struckOut', carsSent: forLevel(baseConfig, level, 1).shiftCars - left, ...over });

test('Tailwind: a shift lost within reach pays the next one more, once a day and never chained', () => {
  const save = newSave();
  const career = save.career;
  const level = 3;
  const book = (result, over = {}) => bookShift(save, result, context(level, over));
  assert.ok(!book(lostAt(level, 5)).news.includes(S.goals.tailwind(baseConfig.tailwindPay)), 'too far from the goal');
  assert.ok(!book(lostAt(level, 2, { carsSent: 1 })).news.some((n) => n.startsWith('TAILWIND')), 'a crash at the very start earns nothing');
  assert.ok(!book(lostAt(level, 2), { daily: true }).news.some((n) => n.startsWith('TAILWIND')), 'never over the Daily Shift');
  assert.equal(career.tailwind, false);
  assert.ok(book(lostAt(level, 2)).news.includes(S.goals.tailwind(baseConfig.tailwindPay)));
  assert.equal(career.tailwind, true);
  assert.ok(Goals.tailwindOn(career, 'shift', false) && !Goals.tailwindOn(career, 'shift', true) && !Goals.tailwindOn(career, 'unlimited', false));
  assert.ok(!book(lostAt(level, 1)).news.some((n) => n.startsWith('TAILWIND')), 'the shift that used it earns none');
  assert.equal(career.tailwind, false, 'used up');
  assert.ok(!book(lostAt(level, 1)).news.some((n) => n.startsWith('TAILWIND')), 'once a day');
  assert.ok(book(lostAt(level, 1), { today: 20001 }).news.some((n) => n.startsWith('TAILWIND')), 'the next day again');
});

test('Tailwind and the streak add up on the pay of a shift', () => {
  const both = Goals.forPay(baseConfig, baseConfig.streakBonusPay + baseConfig.tailwindPay);
  assert.equal(both.shiftPay, Math.round(baseConfig.shiftPay * 1.4));
  assert.equal(Goals.forStreak(baseConfig).shiftPay, Math.round(baseConfig.shiftPay * 1.15));
  const c = newCareer();
  assert.equal(Goals.daysToFreeze(c, baseConfig), 7);
  c.dailyStreak = 4;
  assert.equal(Goals.daysToFreeze(c, baseConfig), 3);
  c.streakFreezes = baseConfig.streakFreezeMax;
  assert.equal(Goals.daysToFreeze(c, baseConfig), null);
  assert.ok(S.daily.rowLine(4, false, { left: 3, item: 'streakBronze' }, 0, 3).includes(S.shop.item('streakBronze')), 'the skin is as near as the Freeze: the skin shows');
  assert.ok(S.daily.rowLine(4, false, { left: 10, item: 'streakBronze' }, 0, 3).includes(S.daily.freezeLine(3)), 'the Freeze is nearer');
  assert.ok(S.daily.streakPill(8, 0.15, null, 1).includes('1 Streak Freeze'));
  assert.ok(!S.daily.streakPill(8, 0.15, null, 0).includes('Freeze'));
});

test('an Unlimited mark pays Elite XP once per career, and tiers show on the board', () => {
  const save = newSave();
  save.career.level = baseConfig.prestigeLevel;
  const run = { ...completed(3), carsSent: 60, outcome: 'struckOut', perfects: 0, tightFits: 0 };
  const first = bookShift(save, run, context(3, { mode: 'unlimited' }));
  assert.equal(save.career.eliteXp, 2 * baseConfig.eliteXpMark, 'the 25 and 50 marks');
  assert.equal(first.news[0], S.modes.tierUp('silver'));
  bookShift(save, run, context(3, { mode: 'unlimited' }));
  assert.equal(save.career.eliteXp, 2 * baseConfig.eliteXpMark, 'the same marks again pay nothing');
  bookShift(save, { ...run, carsSent: 110 }, context(3, { mode: 'unlimited' }));
  assert.equal(save.career.eliteXp, 3 * baseConfig.eliteXpMark, 'the 100 mark is new');
  assert.equal(S.modes.tier(tierOf(save.unlimitedBestCars)), 'Gold');
});

// MARK: Tailwind pill, tier misses, Unlimited titles

test('an Unlimited run just short of the next tier says how far, and only when it was close', () => {
  assert.equal(Goals.tierMiss(20, 0).short, 5);
  assert.equal(Goals.tierMiss(20, 0).tier, 'bronze');
  assert.equal(Goals.tierMiss(18, 0), null, 'not within a quarter of 25');
  assert.equal(Goals.tierMiss(48, 30).tier, 'silver', 'the tier above the best');
  assert.equal(Goals.tierMiss(30, 30), null, 'a run that reaches no new tier and is not close to the next');
  assert.equal(Goals.tierMiss(499, 600), null, 'nothing above Master');
  assert.equal(S.goals.tierMiss({ short: 1, tier: 'gold' }), '1 car short of Gold');
  assert.equal(S.goals.tierMiss({ short: 5, tier: 'bronze' }), '5 cars short of Bronze');
  assert.equal(S.heat.pill(0, 0.25), 'TAILWIND +25 %');
});

test('the Unlimited skins earn a title, which shows with its rule', async () => {
  const { Elite } = await load('/src/core/elite.ts');
  const c = newCareer();
  const earned = () => Elite.titles(c, baseConfig).filter((t) => ['marathoner', 'overdriver', 'endless'].includes(t));
  assert.deepEqual(earned(), []);
  Careers.claimUnlimited(c, 520);
  assert.deepEqual(earned(), ['marathoner', 'overdriver']);
  Careers.claimUnlimited(c, 1000);
  assert.deepEqual(earned(), ['marathoner', 'overdriver', 'endless']);
  assert.equal(S.titles.rule({ k: 'item', id: 'endurance' }), 'Unlock Endurance in Unlimited');
  assert.equal(S.titles.name('endless'), 'Endless');
});

// MARK: Heat and the new boards

test('Heat makes the road harder step by step and leaves Heat 0 alone', () => {
  const base = forLevel(baseConfig, 60, 1);
  assert.equal(forHeat(base, 0), base, 'off: the very same config');
  let last = base;
  for (let heat = 1; heat <= baseConfig.maxHeat; heat++) {
    const c = forHeat(base, heat);
    assert.equal(c.heat, heat);
    assert.ok(c.tempoStart > last.tempoStart && c.tempoEnd > last.tempoEnd, `Heat ${heat} is faster`);
    assert.ok(c.densityStart >= last.densityStart && c.criminalTime <= last.criminalTime && c.aiSpawnDelay.lo <= last.aiSpawnDelay.lo);
    last = c;
  }
  assert.ok(last.criminalTime >= baseConfig.heatMinCriminalTime && last.aiSpawnDelay.lo >= base.aiSpawnDelay.lo * baseConfig.heatMinSpawnFactor - 1e-9, 'the floors hold');
  assert.equal(base.heat, 0, 'the original is untouched');
  assert.equal(heatPay(3, baseConfig), 3 * baseConfig.heatPay);
  assert.equal(heatXp(3, baseConfig), 3 * baseConfig.eliteXpHeat);
});

test('Heat opens with the Elite track, one step above the best cleared, and cycles back to off', () => {
  const c = newCareer();
  assert.equal(Careers.maxHeat(c, baseConfig), 0, 'closed before Level 50');
  c.level = baseConfig.prestigeLevel;
  assert.equal(Careers.maxHeat(c, baseConfig), 1);
  assert.equal(Careers.cycleHeat(c, baseConfig), 1);
  assert.equal(Careers.cycleHeat(c, baseConfig), 0, 'round to off');
  assert.ok(Careers.recordHeat(c, 1, baseConfig));
  assert.ok(!Careers.recordHeat(c, 1, baseConfig), 'new only once');
  assert.equal(Careers.maxHeat(c, baseConfig), 2);
  c.heat = 2;
  assert.equal(Careers.activeHeat(c, baseConfig), 2);
  c.heat = 6;
  assert.equal(Careers.activeHeat(c, baseConfig), 2, 'never above what is open');
  c.heatCleared = 99;
  assert.equal(Careers.maxHeat(c, baseConfig), baseConfig.maxHeat);
});

test('a shift cleared on Heat opens the next one and pays Elite XP; the Daily and a loss do not', () => {
  const save = newSave();
  save.career.level = baseConfig.prestigeLevel;
  const heated = (heat, over = {}) => context(baseConfig.prestigeLevel, { shiftConfig: forHeat(forLevel(baseConfig, 3, 1), heat), ...over });
  const won = completed(3, { perfects: 0, tightFits: 0 });
  assert.ok(bookShift(save, { ...won, outcome: 'struckOut' }, heated(1)).news.every((n) => !n.startsWith('HEAT')), 'a loss clears nothing');
  assert.equal(save.career.heatCleared, 0);
  const before = save.career.eliteXp;
  assert.ok(bookShift(save, won, heated(1)).news.includes(S.heat.cleared(1, 2)));
  assert.equal(save.career.heatCleared, 1);
  assert.equal(save.career.eliteXp - before, baseConfig.eliteXpCompleted + heatXp(1, baseConfig), 'the shift and the Heat');
  bookShift(save, won, heated(2, { daily: true }));
  assert.equal(save.career.heatCleared, 1, 'never over the Daily Shift');
});

test('Heat 3, 5 and 8 earn their titles, and Heat and the Daily score survive a save', async () => {
  const { Elite } = await load('/src/core/elite.ts');
  const c = newCareer();
  c.heatCleared = 5;
  const got = Elite.titles(c, baseConfig).filter((t) => ['scorcher', 'inferno', 'meltdown'].includes(t));
  assert.deepEqual(got, ['scorcher', 'inferno']);
  assert.equal(S.titles.rule({ k: 'heat', level: 3 }), 'Clear a shift on Heat 3');
  const save = newSave();
  save.career.heat = 3;
  save.career.heatCleared = 4;
  save.dailyDay = 20000;
  save.dailyScore = 4321;
  fakeStorage({ 'carGame.save.v2': JSON.stringify(save) });
  const back = loadSave();
  assert.deepEqual([back.career.heat, back.career.heatCleared, back.dailyDay, back.dailyScore], [3, 4, 20000, 4321]);
  fakeStorage({ 'carGame.save.v2': JSON.stringify({ career: { level: 3 } }) });
  const old = loadSave();
  assert.deepEqual([old.career.heat, old.career.heatCleared, old.dailyDay, old.dailyScore], [0, 0, -1, 0]);
});

test('a cleared Daily Shift is kept for the Daily board, and both new boards are sent when they improve', () => {
  const save = newSave();
  bookShift(save, completed(4, { score: 4321 }), context(4, { daily: true, today: 20005 }));
  assert.deepEqual([save.dailyDay, save.dailyScore], [20005, 4321]);
  const records = { level: 3, prestige: 0, unlimitedBest: 0, unlimitedCars: 0, dailyDay: save.dailyDay, dailyScore: save.dailyScore, rushBest: 123.45, title: null };
  const list = dueBoards(records);
  const daily = list.find(([board]) => board === 'daily');
  assert.deepEqual(daily.slice(0, 2), ['daily', { score: 4321, day: 20005 }]);
  assert.deepEqual(list.find(([board]) => board === 'rush').slice(0, 2), ['rush', { cs: 12345 }]);
  assert.equal(list.find(([board]) => board === 'rush')[2], 10_000_000 - 12345, 'a faster time is a bigger number');
  assert.ok(!dueBoards({ ...records, dailyDay: -1, dailyScore: 0, rushBest: 0 }).some(([board]) => board === 'daily' || board === 'rush'), 'nothing to send without a clear');
});


// MARK: Mutators, seasons, tours, achievements, Chill (07.10.2026)

const dayOf = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / 86400000);

test('every mutator comes once per cycle of days, and never twice running', () => {
  const n = MUTATORS.length;
  for (let cycle = 0; cycle < 30; cycle++) {
    const seen = new Set();
    for (let i = 0; i < n; i++) seen.add(mutatorOf(cycle * n + i));
    assert.equal(seen.size, n, `cycle ${cycle} repeats one`);
  }
  for (let day = 20000; day < 20400; day++) assert.notEqual(mutatorOf(day), mutatorOf(day + 1), `day ${day}`);
  assert.equal(mutatorOf(20123), mutatorOf(20123), 'the same for everyone');
});

test('a mutator pins its sky and its rule, and the Daily never counts as a Legendary Shift', () => {
  const career = newCareer();
  career.level = 30;
  for (const id of MUTATORS) {
    const cfg = Careers.shiftConfig(career, 'shift', baseConfig, 77, 'roadworks', null, id);
    const pin = mutatorSky(id);
    assert.equal(cfg.mutator, id);
    assert.equal(cfg.legendary, null, `${id} must not pay a Legendary chest`);
    if (pin.weather) assert.equal(cfg.weather, pin.weather);
    if (pin.darkness) assert.equal(cfg.night, pin.darkness !== 'day');
    if (pin.darkness === 'blackout') assert.equal(cfg.blackout, true);
  }
  const dragnet = Careers.shiftConfig(career, 'shift', baseConfig, 77, 'roadworks', null, 'dragnet');
  assert.equal(dragnet.criminalChance, 1);
  const open = Careers.shiftConfig(career, 'shift', baseConfig, 77, 'roadworks', null, 'openRoad');
  const plain = Careers.shiftConfig(career, 'shift', baseConfig, 77, 'roadworks', null, null);
  assert.equal(open.densityStart, Math.max(3, plain.densityStart - 2));
});

test('a season tilts the weather mix and leaves how bad it can get alone', () => {
  const count = (cfg, kind) => {
    let n = 0;
    for (let seed = 1; seed <= 3000; seed++) if (drawWeather(cfg, 50, seed) === kind) n++;
    return n;
  };
  const bad = (cfg) => {
    let n = 0;
    for (let seed = 1; seed <= 3000; seed++) if (drawWeather(cfg, 50, seed) !== 'clear') n++;
    return n;
  };
  const winter = forSeason(baseConfig, 'winter');
  const summer = forSeason(baseConfig, 'summer');
  assert.equal(winter.season, 'winter');
  assert.ok(count(winter, 'snow') > count(baseConfig, 'snow'), 'winter brings more snow');
  assert.ok(bad(summer) < bad(baseConfig) && bad(forSeason(baseConfig, 'spring')) > bad(baseConfig), 'summer is clearer, spring wetter');
  assert.equal(forSeason(baseConfig, null), baseConfig);
  assert.equal(baseConfig.season, null, 'the base config is never changed');
});

test('a challenge link carries the twist and the season, and an older link still reads', () => {
  const career = newCareer();
  career.level = 12;
  const spec = challengeOf(career, 'shift', 12, 4242, 'concert', 5000, null, 'fogBank', 'autumn');
  const code = encodeChallenge(spec);
  const back = decodeChallenge(code);
  assert.equal(back.mutator, 'fogBank');
  assert.equal(back.season, 'autumn');
  const packed = JSON.parse(Buffer.from(code.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')).slice(0, 13);
  const legacy = Buffer.from(JSON.stringify(packed)).toString('base64').replace(/[+]/g, '-').replace(/[/]/g, '_').replace(/=+$/, '');
  const old = decodeChallenge(legacy);
  assert.ok(old, 'a link from before still decodes');
  assert.deepEqual([old.mutator, old.season], [null, null]);
});

test('a tour runs on its days, names its year, and crosses New Year', () => {
  assert.equal(tourOn(dayOf(2026, 10, 7)), null);
  assert.equal(tourOn(dayOf(2026, 10, 23)), null);
  const first = tourOn(dayOf(2026, 10, 24));
  assert.equal(first.tour.id, 'halloween');
  assert.equal(first.key, 'halloween-2026');
  assert.equal(first.daysLeft, 10);
  assert.equal(tourOn(dayOf(2026, 11, 2)).daysLeft, 1);
  assert.equal(tourOn(dayOf(2026, 11, 3)), null);
  assert.equal(tourOn(dayOf(2026, 12, 31)).key, 'winter-2026');
  assert.equal(tourOn(dayOf(2027, 1, 2)).key, 'winter-2026', 'named for the year it began in');
  assert.equal(tourOn(dayOf(2027, 10, 25)).key, 'halloween-2027');
  assert.equal(nextTour(dayOf(2026, 10, 7)).tour.id, 'halloween');
  assert.equal(nextTour(dayOf(2026, 10, 7)).inDays, 17);
});

test('a tour stop follows the player, is the same traffic for everyone, and pays once', () => {
  const run = tourOn(dayOf(2026, 10, 28));
  const low = newCareer();
  low.level = 12;
  const high = newCareer();
  high.level = 50;
  const a = tourTrial(run, 3, low);
  const b = tourTrial(run, 3, high);
  assert.ok(b.level > a.level, 'the level follows the career');
  assert.equal(a.seed, b.seed);
  assert.equal(tourStopOf(a.id, dayOf(2026, 10, 28)).stop, 3);
  assert.equal(tourStopOf(a.id, dayOf(2026, 11, 20)), null, 'over once the tour is');
  const cfg = trialConfig(tourTrial(run, 7, high), baseConfig);
  assert.equal(cfg.convoy, true);
  assert.equal(cfg.bossKind, 'phantom');
  const career = newCareer();
  const money = career.money;
  assert.ok(completeStop(career, run, 1));
  assert.equal(career.money, money + 1500);
  assert.equal(completeStop(career, run, 1), null);
  completeStop(career, run, 3);
  assert.ok(career.collection.includes('jackOLantern'));
  assert.equal(tourStopsDone(career, run), 2);
  assert.equal(career.toursDone.includes(stopDoneKey('halloween-2027', 1)), false, 'next year the stops are open again');
});

test('a passed tour stop settles through the special run and says so', () => {
  const today = dayOf(2026, 10, 27);
  const run = tourOn(today);
  const career = newCareer();
  career.level = 20;
  const t = tourTrial(run, 2, career);
  const win = { outcome: 'completed', tightFits: 0, nearMisses: 0, perfects: 0, bossBusted: false, time: 20 };
  const first = settleSpecial({ k: 'trial', trial: t }, win, career, today, baseConfig);
  assert.equal(career.chests.length, 1, 'stop 2 pays a Standard Chest');
  assert.ok(first.news[0].includes('TOUR STOP 2/7'));
  const again = settleSpecial({ k: 'trial', trial: t }, win, career, today, baseConfig);
  assert.equal(career.chests.length, 1);
  assert.deepEqual(again.news, []);
  const lost = settleSpecial({ k: 'trial', trial: tourTrial(run, 1, career) }, { ...win, outcome: 'struckOut' }, career, today, baseConfig);
  assert.equal(career.toursDone.length, 1);
  assert.equal(lost.summary.color, 'destructive');
});

test('every tour reward is a real skin with a look, and the tours have an album', () => {
  const items = COSMETICS.filter((x) => x.source.kind === 'tour');
  assert.equal(items.length, 6);
  for (const x of items) assert.ok(Skins.color(x.id), `${x.id} has a colour`);
  const ids = new Set(items.map((x) => x.id));
  for (const tour of TOURS) {
    for (const stop of tour.stops) if (stop.reward.item) assert.ok(ids.has(stop.reward.item), `${stop.reward.item} is a tour skin`);
    assert.equal(tour.stops.filter((s) => s.reward.item).length, 3);
    assert.equal(tour.stops.at(-1).goal.k, 'boss');
  }
  assert.equal(albumItems('tours').length, 6);
  assert.ok(!albumItems('honours').some((x) => x.source.kind === 'tour'), 'a missed tour does not block the Honours album');
});

test('achievements pay each tier once, count what the shift did, and survive the save', () => {
  const save = newSave();
  assert.equal(Achievements.sync(save).length, 0);
  save.career.chestsOpened = 5;
  save.career.stats.wrecks = 60;
  const steps = Achievements.sync(save);
  assert.deepEqual(steps.map((x) => `${x.family}.${x.tier}`).sort(), ['chestOpener.1', 'scrapyard.1']);
  assert.equal(save.career.money, TIER_PAY[0] * 2);
  assert.equal(Achievements.sync(save).length, 0, 'nothing is paid twice');
  save.career.stats.wrecks = 5000;
  assert.equal(Achievements.sync(save).filter((x) => x.family === 'scrapyard').length, 3);
  assert.equal(achievementTotal(), FAMILIES.reduce((n, f) => n + f.tiers.length, 0));
  for (const f of FAMILIES) {
    assert.deepEqual(f.tiers, [...f.tiers].sort((a, b) => a - b), `${f.id} climbs`);
    assert.ok(S.ach.name(f.id) !== f.id, `${f.id} has a name`);
    assert.ok(S.ach.goal(f.id, f.tiers[0]).length > 0, `${f.id} has a goal`);
  }
  // Counters from a shift: bad weather and nights only count in a cleared career shift.
  const c = newCareer();
  const foggy = { ...forLevel(baseConfig, 40, 1), weather: 'fog', night: true, blackout: false, cityEvent: 'concert' };
  Achievements.record(c, { ...completed(5), wrecks: 3, blasts: 2, carsSent: 20, money: 400 }, foggy, 'shift');
  assert.deepEqual([c.stats.badWeather, c.stats.murky, c.stats.nights, c.stats.events, c.stats.wrecks, c.stats.blasts, c.stats.cars, c.stats.earned], [1, 1, 1, 1, 3, 2, 20, 400]);
  Achievements.record(c, { ...completed(5), outcome: 'struckOut' }, foggy, 'shift');
  assert.equal(c.stats.badWeather, 1, 'a lost shift does not count for the weather');
  Achievements.record(c, completed(5), foggy, 'mayhem');
  assert.equal(c.stats.badWeather, 1, 'Mayhem counts for nothing');
  // The save keeps counters and tiers, and drops what it does not know.
  const keep = newSave();
  keep.career.stats = { wrecks: 12, bogus: 9 };
  keep.career.achievements = ['scrapyard.1', 'nonsense.1'];
  keep.career.toursDone = ['halloween-2026.3', 'garbage'];
  keep.chillBest = 30;
  keep.chillCars = 90;
  keep.chillTime = 600;
  fakeStorage();
  writeSave(keep);
  const back = loadSave();
  assert.deepEqual(back.career.stats, { wrecks: 12 });
  assert.deepEqual(back.career.achievements, ['scrapyard.1']);
  assert.deepEqual(back.career.toursDone, ['halloween-2026.3']);
  assert.deepEqual([back.chillBest, back.chillCars, back.chillTime], [30, 90, 600]);
  assert.ok(STAT_KEYS.includes('wrecks'));
});

test('Chill never ends by itself, has nothing to lose, and ends when the player says so', () => {
  const career = newCareer();
  career.level = 40;
  const cfg = Careers.shiftConfig(career, 'chill', baseConfig, 321);
  assert.equal(cfg.chill, true);
  assert.equal(cfg.endless, true);
  assert.equal(cfg.criminalChance, 0);
  assert.equal(cfg.militaryChance, 0);
  assert.equal(cfg.tankerShare, 0);
  assert.equal(cfg.shiftPay, 0);
  const world = new World(cfg, 321, { startsOnFirstTap: false });
  let ended = null;
  let crashes = 0;
  // Tap every half second, careful or not: crashes must not end the drive.
  for (let i = 0; i < 120 * 120 && !ended; i++) {
    if (i % 60 === 0 && world.queue.isReady) world.tap(world.time);
    world.step();
    for (const e of world.takeEvents()) {
      if (e.type === 'crash' && e.isStrike) crashes++;
      if (e.type === 'shiftEnded') ended = e.result;
    }
  }
  assert.ok(crashes > 0, 'the reckless tapping did crash');
  assert.equal(ended, null, 'no crash ended the drive');
  assert.ok(world.shift.carsSent > 10);
  world.finish();
  const done = world.takeEvents().find((e) => e.type === 'shiftEnded');
  assert.ok(done, 'finish ends the drive');
  assert.equal(done.result.outcome, 'completed');
  // Booking it touches nothing of the career.
  const save = newSave();
  save.career.money = 500;
  save.career.level = 9;
  const booked = bookShift(save, { ...done.result, carsSent: 42, time: 90 }, context(3, { mode: 'chill', shiftConfig: cfg }));
  assert.equal(save.career.money, 500);
  assert.equal(save.career.level, 9);
  assert.deepEqual([save.chillBest, save.chillCars, save.chillTime], [42, 42, 90]);
  assert.equal(booked.isNew, true);
  bookShift(save, { ...done.result, carsSent: 10, time: 30 }, context(3, { mode: 'chill', shiftConfig: cfg }));
  assert.deepEqual([save.chillBest, save.chillCars], [42, 52]);
  fakeStorage();
  save.mode = 'chill';
  writeSave(save);
  assert.equal(loadSave().mode, 'chill');
  assert.equal(S.modes.name('chill'), 'CHILL');
});

test('the Daily Shift with its twist replays the same', () => {
  const career = newCareer();
  career.level = 25;
  const make = () => Careers.shiftConfig(career, 'shift', forSeason(baseConfig, 'winter'), 555, 'vipConvoy', null, 'stormFront');
  const once = () => {
    const world = new World(make(), 555, { startsOnFirstTap: false });
    for (let i = 0; i < 120 * 60; i++) {
      if (careful(world)) world.tap(world.time);
      world.step();
      for (const e of world.takeEvents()) if (e.type === 'shiftEnded') return e.result;
    }
    return null;
  };
  const a = once();
  const b = once();
  assert.ok(a);
  assert.equal(a.score, b.score);
  assert.equal(a.carsSent, b.carsSent);
  assert.equal(make().weather, 'storm');
});

test('the wedding convoy comes from level 100, drives in the flow, and never with another slow special', () => {
  const lane = (world) => world.vehicle(world.queue.vehicles[0])?.lane ?? 0;
  const careful = (world) => world.queue.isReady && world.predictedMergeGap(world.layout.player, 0, 40, -Infinity, lane(world)) > 0.04;
  const run = (level, seed) => {
    const config = forLevel(baseConfig, level, seed);
    config.weddingChance = 1;
    const world = new World(config, seed, { startsOnFirstTap: false });
    const seen = { entered: 0, crowded: 0, slowed: 0 };
    for (let i = 0; i < 120 * 90; i++) {
      if (careful(world)) world.tap(world.time);
      world.step();
      const on = (kind) => kind === 'warning' || kind === 'arriving' || kind === 'active';
      if (on(world.wedding.kind) && (on(world.oversize.kind) || on(world.learner.kind) || on(world.race.kind))) seen.crowded++;
      for (const x of world.vehicles) {
        if (x.type === 'wedding' && x.phase.kind === 'ring' && x.phase.drive.speed !== null && !world.isTrafficDisturbed) seen.slowed++;
      }
      for (const e of world.takeEvents()) {
        if (e.type === 'weddingEntered') seen.entered++;
        if (e.type === 'shiftEnded') return seen;
      }
    }
    return seen;
  };
  assert.equal(new World(forLevel(baseConfig, 99, 7919), 7919).wedding.kind, 'done');
  let entered = 0;
  for (let s = 1; s <= 20; s++) {
    const seen = run(100, s * 7919);
    entered += seen.entered;
    assert.equal(seen.crowded, 0);
    assert.equal(seen.slowed, 0);
  }
  assert.ok(entered > 0);
});

// MARK: Forgiveness and reasons to come back (research of 08.10.2026)

test('the Shield upgrade has four steps, a cheap first and dear rest, forgives crashes for challenges too, and not in Unlimited', async () => {
  const { challengeConfig } = await load('/src/core/challenge.ts');
  const { upgradePrice } = await load('/src/core/levels.ts');
  assert.equal(upgradeMaxSteps.shield, 4);
  const prices = [1, 2, 3, 4].map((step) => upgradePrice('shield', step, baseConfig));
  assert.ok(prices[0] < baseConfig.upgradeBaseCost, 'the first step is cheap');
  assert.ok(prices[1] >= 5 * prices[0] && prices[1] < prices[2] && prices[2] < prices[3], 'the rest are dear and climb');
  const at = (level, steps) => {
    const c = newCareer();
    c.level = level;
    if (steps) c.upgrades.shield = steps;
    return c;
  };
  assert.equal(Careers.shiftConfig(at(4, 0), 'shift', baseConfig, 7).maxStrikes, 1, 'no free shield');
  assert.equal(Careers.shiftConfig(at(4, 1), 'shift', baseConfig, 7).maxStrikes, 2);
  assert.equal(Careers.shiftConfig(at(30, 3), 'shift', baseConfig, 7).maxStrikes, 4);
  assert.equal(Careers.shiftConfig(at(30, 3), 'unlimited', baseConfig, 7).maxStrikes, 1);
  const spec = challengeOf(at(4, 1), 'shift', 4, 77, null, 1000);
  assert.equal(challengeConfig(spec, baseConfig).maxStrikes, 2, 'a friend plays the same shift, shield and all');
  // A tap on every step crashes: the shift goes on after the first strike and ends with the second.
  const { result, seen } = playConfig(Careers.shiftConfig(at(4, 1), 'shift', baseConfig, 31), 31, () => true);
  assert.equal(result.outcome, 'struckOut');
  assert.ok(seen.filter((e) => e.type === 'crash' && e.isStrike).length >= 2);
  const poor = at(4, 0);
  poor.money = 0;
  assert.ok(!Careers.buy(poor, 'shield', baseConfig), 'too poor for the first step');
  poor.money = prices[0];
  assert.ok(Careers.buy(poor, 'shield', baseConfig));
  assert.equal(Careers.steps(poor, 'shield'), 1);
});

test('three losses on a level ease the next shift to its fewest cars, until the level is cleared', async () => {
  const { shiftCarsRange } = await load('/src/core/levels.ts');
  const c = newCareer();
  c.level = 9;
  c.museumSeen = ['weather.lightRain', 'dark.night'];
  const [fewest] = shiftCarsRange(9, baseConfig);
  for (let i = 0; i < baseConfig.easeAfterLosses; i++) Careers.noteShift(c, false);
  for (const seed of [1, 2, 3, 4, 5]) {
    const cfg = Careers.careerShift(c, baseConfig, seed);
    assert.equal(cfg.shiftCars, fewest, `seed ${seed}`);
  }
  Careers.noteShift(c, true);
  assert.equal(c.levelLosses, 0);
  assert.ok([1, 2, 3, 4, 5].some((seed) => Careers.careerShift(c, baseConfig, seed).shiftCars > fewest), 'cleared: the spread is back');
  assert.ok([1, 2, 3, 4, 5].every((seed) => !Careers.careerShift(c, baseConfig, seed).assisted));
});

test('the first bad weather and the first night come for sure, and such a shift is marked as eased', () => {
  const c = newCareer();
  c.level = baseConfig.firstWeatherLevel;
  const rainy = Careers.careerShift(c, baseConfig, 5);
  assert.equal(rainy.weather, 'lightRain');
  assert.equal(rainy.assisted, true);
  c.museumSeen.push(museumId({ k: 'weather', kind: 'lightRain' }));
  assert.ok([1, 2, 3, 4, 5, 6].some((seed) => Careers.careerShift(c, baseConfig, seed).weather === 'clear'), 'once met, the seed decides again');
  c.level = baseConfig.firstNightLevel;
  assert.equal(Careers.careerShift(c, baseConfig, 5).night, true);
  c.museumSeen.push(museumId({ k: 'dark', kind: 'night' }));
  assert.ok([1, 2, 3, 4, 5, 6].some((seed) => !Careers.careerShift(c, baseConfig, seed).night));
});

test('the scout level sends one criminal with an escort, announced, and no boss', () => {
  const c = newCareer();
  c.level = baseConfig.scoutLevel;
  const cfg = Careers.shiftConfig(c, 'shift', baseConfig, 13);
  assert.equal(cfg.scout, true);
  assert.equal(cfg.convoy, false);
  c.level = baseConfig.scoutLevel + 1;
  assert.equal(Careers.shiftConfig(c, 'shift', baseConfig, 13).scout, false);
  let scouts = 0;
  for (const seed of [13, 14, 15]) {
    const { result, seen } = playConfig({ ...cfg }, seed);
    assert.ok(result, `seed ${seed}: the shift ends`);
    const warnings = seen.filter((e) => e.type === 'criminalWarning');
    if (warnings.length === 0) continue;
    scouts++;
    assert.equal(warnings[0].scout, true, `seed ${seed}: the first criminal is the scout`);
    assert.ok(warnings.slice(1).every((w) => !w.scout && !w.boss), `seed ${seed}: one scout a shift`);
    assert.ok(!result.bossBusted);
  }
  assert.ok(scouts > 0, 'a criminal comes in some shift');
});

test('tomorrow’s gift is promised once and waits for its day', () => {
  const c = newCareer();
  assert.equal(Careers.promiseGift(c, 100), true);
  assert.equal(Careers.promiseGift(c, 100), false);
  assert.equal(Careers.giftAhead(c, 100), true);
  assert.equal(Careers.collectGift(c, 100), false);
  assert.equal(Careers.collectGift(c, 103), true);
  assert.deepEqual(c.chests, ['standard']);
  assert.equal(Careers.collectGift(c, 104), false);
  assert.equal(Careers.promiseGift(c, 104), false, 'once in a career');
  // The first booked shift promises it, and the save keeps it.
  const save = newSave();
  bookShift(save, completed(1), context(1, { today: 500 }));
  assert.equal(save.career.giftDay, 501);
  assert.ok(writeSave(save));
  assert.equal(loadSave().career.giftDay, 501);
  // The Daily Shift opens at level 2 now: in the first session.
  const two = newCareer();
  two.level = 2;
  assert.equal(Unlocks.isOpen(two, 'daily'), true);
});

test('the tension camera keeps the stop line in place, settles still, and stays out of Chill and Reduce Motion', async () => {
  const { CameraFx, CameraFxTuning, tensionOf } = await load('/src/present/cameraFx.ts');
  const { toScreen } = await load('/src/present/render.ts');
  const cam = { viewport: { x: 390, y: 844 }, center: { x: 0, y: -20 }, focus: { x: 195, y: 400 }, scale: 1.5 };
  const stop = { x: 0, y: -150 };
  const fx = new CameraFx();
  for (let i = 0; i < 240; i++) fx.update(0.8, 1 / 60);
  assert.equal(fx.tension, 0.8, 'snaps onto its plateau, so the ground can be baked again');
  const leaned = fx.apply(cam, stop, false);
  const before = toScreen(cam, stop);
  const after = toScreen(leaned, stop);
  assert.ok(Math.abs(before.x - after.x) < 1e-9 && Math.abs(before.y - after.y) < 1e-9, 'the stop line does not move');
  assert.ok(Math.abs(leaned.scale - cam.scale * (1 + CameraFxTuning.tensionZoom * 0.8)) < 1e-9);
  assert.deepEqual(fx.apply(cam, stop, false), leaned, 'a settled camera holds still');
  assert.equal(fx.apply(cam, stop, true), cam, 'Reduce Motion: no zoom');
  assert.equal(fx.vignette, 0.8, 'the vignette stays under Reduce Motion');
  const world = new World(forLevel(baseConfig, 3, 11), 11, { startsOnFirstTap: false });
  assert.equal(tensionOf(world, 'chill'), 0);
});
