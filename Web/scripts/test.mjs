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
const { Habits } = await load('/src/core/habits.ts');
const { detourArmSlot } = await load('/src/core/modules.ts');
const { CHALLENGES, challengesOf, challengeMet, challengeProgress, challengeReward } = await load('/src/core/daily.ts');
const { baseConfig, BOSS_KINDS } = await load('/src/core/config.ts');
const { forLevel, upgraded, UPGRADES, upgradeMaxSteps } = await load('/src/core/levels.ts');
const { Elite, TITLES, TITLE_RULES, ELITE_LAST_MILESTONE } = await load('/src/core/elite.ts');
const { COSMETICS, rollChest, PITY_LEGENDARY_CHESTS, collectableSkins } = await load('/src/core/loot.ts');
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
const { tuned } = await load('/src/net/tuning.ts');
const { NoticeQueue, TipQueue } = await load('/src/present/notices.ts');
const { Briefings, briefOf } = await load('/src/present/briefing.ts');
const { Details } = await load('/src/present/detail.ts');
const { conditionChips, ConditionChips } = await load('/src/present/readyScreen.ts');
const { bookShift } = await load('/src/present/booking.ts');
const { newPlayerMoment } = await load('/src/present/moments.ts');
const { S, Fmt } = await load('/src/present/strings.ts');
const { Unlocks } = await load('/src/core/unlocks.ts');
const { sightings, shelfEntries, museumId, shelfComplete, completedShelves } = await load('/src/core/museum.ts');
const { FAIL_CAUSES } = await load('/src/core/events.ts');
const { tapOffset, noteTap, averageOffset } = await load('/src/core/timing.ts');
const { forLegendary } = await load('/src/core/levels.ts');
const { LEGENDARY_RULES, cloneConfig } = await load('/src/core/config.ts');
const { versusConfig, VersusBot, INPUT_DELAY } = await load('/src/core/versus.ts');
const { substream } = await load('/src/core/rng.ts');
const { readGuestMessage, readHostMessage, RateLimit } = await load('/src/net/messages.ts');
const { settleSpecial, advanceRush, newRush, runCard } = await load('/src/present/specialRuns.ts');
const { trial: trialById, trialOpen, trialConfig, landmarkOf, LANDMARKS, LANDMARK_PRESTIGE, RUN_IDS, isRunId, LEVEL_TRIALS, LEVEL_TRIAL_FIRST, LEVEL_TRIAL_LAST, LEVEL_KINDS, levelTrialsWaiting, RUSH_ID, RUSH_REWARD, rushOpen, rematchId } = await load('/src/core/trials.ts');
const { PATCH_NOTES, latestNote, itemText, itemCredit, changelogFile, SUMMARY_LINES, SUMMARY_LENGTH } = await load('/src/present/patchNotes.ts');
const { parseInviteCode } = await load('/src/net/invite.ts');
const { pushTimers } = await load('/src/net/push.ts');
const { dayNumber } = await load('/src/core/daily.ts');
const { INVITE_LEVEL } = await load('/src/core/config.ts');
const { default: qrcode } = await import('qrcode-generator');
const { ResultBanner, RingSignals } = await load('/src/present/hud.ts');
// Every module loaded at the top level comes before the first test: a load later down the file
// can still be pending when the tests above it have finished and `after` has closed the server.
const { parseBackdropLink, youtubeEmbed } = await load('/src/present/backdrop.ts');
const { Scroller } = await load('/src/present/scroll.ts');
const { siteFiles, fingerprint: siteFingerprint } = await load('/src/present/siteData.ts');
const { GUIDE } = await load('/src/present/siteGuide.ts');
const { signalOf } = await load('/src/present/museumSignal.ts');
const { MuseumPage } = await load('/src/present/museum.ts');
const { RenderList } = await load('/src/present/render.ts');
const { iconClock, ICON_LOOP } = await load('/src/present/conditionIcons.ts');
const { heatFlame } = await load('/src/present/icons.ts');
const { readFileSync } = await import('node:fs');
const { prestigeReward, BIG_SCREEN } = await load('/src/core/loot.ts');
const { COLORS } = await load('/src/present/theme.ts');
const { MapTheme, MAP_THEMES } = await load('/src/present/mapThemes.ts');
const { upgradePrice, upgradeIntroLevel } = await load('/src/core/levels.ts');
const { forSeason } = await load('/src/core/seasons.ts');
const { drawWeather } = await load('/src/core/levels.ts');
const { TOURS, tourOn, nextTour, tourTrial, tourStopOf, completeStop, tourStopsDone, stopDoneKey } = await load('/src/core/tours.ts');
const { FAMILIES, Achievements, achievementTotal, STAT_KEYS, TIER_PAY } = await load('/src/core/achievements.ts');
const { Skins } = await load('/src/present/skins.ts');
const { CarModels, CAR_MODELS } = await load('/src/present/carModels.ts');
const { CarArt } = await load('/src/present/carArt.ts');
const { albumItems } = await load('/src/core/loot.ts');
const { CHEST_ODDS: ODDS, CHEST_KINDS, tappedOdds: tapped, chestPrice, isForSale, cosmetic } = await load('/src/core/loot.ts');
const { Auction, readLot, lotKey } = await load('/src/core/auction.ts');
const { Fund } = await load('/src/core/fund.ts');

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

// MARK: Traffic that remembers

test('adaptive traffic: only career shifts from its level on, never the Daily, Unlimited or a trial', () => {
  const c = newCareer();
  c.mastery.shiftsCompleted = 1;
  for (const level of [1, 2]) {
    c.level = level;
    assert.equal(Careers.careerShift(c, baseConfig, 5).adaptive, false, `level ${level}`);
  }
  c.level = baseConfig.adaptiveLevel;
  assert.equal(Careers.careerShift(c, baseConfig, 5).adaptive, true);
  assert.equal(Careers.shiftConfig(c, 'shift', baseConfig, 5).adaptive, false, 'the Daily goes through shiftConfig');
  assert.equal(Careers.shiftConfig(c, 'unlimited', baseConfig, 5).adaptive, false);
  assert.equal(Careers.shiftConfig(c, 'mayhem', baseConfig, 5).adaptive, false);
  assert.equal(forLevel(baseConfig, 9, 5).adaptive, false);
});

test('adaptive traffic replays exactly and the careful bot stays safe', () => {
  for (const level of [5, 12]) {
    for (let s = 1; s <= 4; s++) {
      const seed = s * 7919 + level;
      const config = { ...forLevel(baseConfig, level, seed), adaptive: true };
      const first = playConfig(config, seed);
      assert.ok(first.result, `level ${level}, shift ${s} ends`);
      assert.equal(first.result.crashes, 0, `level ${level}, shift ${s}`);
      assert.deepEqual(playConfig(config, seed).result, first.result, `level ${level}, shift ${s} replays`);
    }
  }
});

test('adaptive traffic: tight merges make cars careful, crashes frighten for a while, every effect stays within its share', () => {
  const c = { ...baseConfig, adaptive: true };
  const h = new Habits(c, 77);
  assert.deepEqual(h.tune(5, 0), { gap: 1, reaction: 1, brake: 1, accel: 1, margin: 1 }, 'no notes, no change');
  assert.equal(h.delayFactor(9), 1);
  for (let i = 0; i < 10; i++) h.noteMerge(0.05, 5);
  h.welcome(6);
  const careful6 = h.tune(6, 0);
  assert.ok(careful6.gap > 1 && careful6.reaction < 1, 'the next car comes careful after a run of tight merges');
  assert.ok(h.delayFactor(9) > 1, 'and the arrivals space out');
  const calm = h.tune(5, 0);
  h.noteCrash([{ id: 5, owner: 'ai', phase: { kind: 'ring' }, position: { x: 0, y: 0 } }], { x: 10, y: 0 }, 100);
  assert.ok(h.tune(5, 101).brake > calm.brake && h.tune(5, 101).margin > 1);
  assert.equal(h.tune(5, 100 + c.adaptFearSeconds + 1).brake, 1, 'the fright passes');
  const wide = new Habits(c, 77);
  for (let i = 0; i < 10; i++) wide.noteMerge(2, 8);
  assert.ok(wide.tune(8, 0).accel > 1 && wide.tune(8, 0).gap < 1, 'wide gaps leave a car relaxed');
  const limit = c.adaptShare + 1e-9;
  for (const id of [5, 6, 8]) {
    for (const t of [h.tune(id, 101), wide.tune(id, 0)]) for (const v of Object.values(t)) assert.ok(Math.abs(v - 1) <= limit, `${id}: ${v}`);
  }
  for (let id = 1; id < 200; id++) assert.ok(Math.abs(wide.delayFactor(id) - 1) <= limit);
  const off = new Habits(baseConfig, 77);
  for (let i = 0; i < 10; i++) off.noteMerge(0.05, 5);
  assert.equal(off.tune(5, 0).gap, 1, 'off: nothing is noted');
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
  const save = newSave();
  bookShift(save, completed(1), context(1));
  assert.equal(save.career.level, 2);
  assert.ok(save.career.chests.includes('standard'));
  const welcome = (level, prestige, levelBefore) => {
    const c = newCareer();
    Object.assign(c, { level, prestige });
    return Careers.giveWelcomeChest(c, levelBefore, baseConfig);
  };
  assert.ok(welcome(2, 0, 1));
  assert.ok(!welcome(3, 0, 2), 'not again');
  // A lost first shift gives nothing yet; after a Prestige the chest does not come again.
  assert.ok(!welcome(1, 0, 1));
  assert.ok(!welcome(2, 1, 1));
  assert.ok(!bookShift(save, completed(2), context(2)).news.some((n) => /chest/i.test(n)), 'a chest found is not announced');
});

test('a Prestige never brings the new-player moments back', () => {
  const moment = (level, levelBefore, prestige = 0, mode = 'shift', daily = false, outcome = 'completed') => {
    const c = newCareer();
    Object.assign(c, { level, prestige });
    return newPlayerMoment(c, mode, daily, outcome, levelBefore, baseConfig)?.kind ?? null;
  };
  assert.equal(moment(2, 1), 'firstWin');
  assert.equal(moment(7, 6), 'levelFive');
  assert.equal(moment(2, 1, 1), null, 'not the first-shift moment again');
  assert.equal(moment(7, 6, 1), null, 'not the Level 6 moment again');
  assert.equal(moment(2, 1, 0, 'unlimited'), null, 'moments only on career shifts');
  assert.equal(moment(2, 1, 0, 'shift', true), null, 'not on the Daily');
  assert.equal(moment(2, 1, 0, 'shift', false, 'struckOut'), null, 'only after a win');
});

test('the first Perfect Run says what it is, later ones leave it to the ring', () => {
  const save = newSave();
  const first = bookShift(save, completed(1, { isPerfectRun: true }), context(1));
  assert.ok(first.news.some((n) => n.startsWith('PERFECT RUN ·')));
  const later = bookShift(save, completed(2, { isPerfectRun: true }), context(2));
  assert.ok(!later.news.some((n) => n.startsWith('PERFECT RUN')));
});

test('the way back comes due once, at its level', () => {
  const save = newSave();
  save.hints.push('notifications'); // its own test below
  save.career.level = baseConfig.tomorrowAskAfterLevel;
  const level = save.career.level;
  assert.deepEqual(bookShift(save, completed(level), context(level)).due, ['tomorrow'], 'a player who skips the Daily is asked after its level');
  save.career.level = level;
  assert.deepEqual(bookShift(save, completed(level), context(level)).due, []);
});

test('the way back is asked for when the first Daily is done, notifications follow it, and again at a streak of two days', () => {
  const save = newSave();
  assert.deepEqual(bookShift(save, completed(1), context(1)).due, [], 'the first shift won asks nothing');
  save.career.level = 2;
  const daily = bookShift(save, completed(2), context(2, { daily: true, today: 20_000 }));
  assert.equal(save.career.dailyDone, 20_000);
  assert.deepEqual(daily.due, ['tomorrow'], '"back tomorrow" is the moment');
  // Installing took the turn: notifications are due from the next shift (the shell lets them wait for the next visit).
  save.hints.push('install');
  assert.deepEqual(bookShift(save, completed(2), context(2)).due, ['notifications']);
  assert.deepEqual(bookShift(save, completed(2), context(2)).due, [], 'asked once');
  save.career.dailyStreak = 2;
  save.career.dailyDone = -1;
  assert.deepEqual(bookShift(save, completed(3), context(3, { daily: true, today: 20_001 })).due, ['notificationsStreak']);
  save.career.dailyDone = -1;
  assert.deepEqual(bookShift(save, completed(3), context(3, { daily: true, today: 20_002 })).due, [], 'asked again once');
});

test('back after a week or more, a Premium Chest waits; a shorter break or a first start gives none', () => {
  const c = newCareer();
  assert.ok(!Careers.giveComebackChest(c, 100, baseConfig), 'a first start');
  c.lastLoginDay = 100;
  assert.ok(!Careers.giveComebackChest(c, 100 + baseConfig.comebackDays - 1, baseConfig));
  assert.ok(Careers.giveComebackChest(c, 100 + baseConfig.comebackDays, baseConfig));
  assert.equal(c.chests.at(-1), 'premium');
});

test('a comeback greets the driver by name and still reads clean without one', () => {
  assert.match(S.daily.welcomeBack('100', 'Leo'), /Leo/);
  assert.ok(!S.daily.welcomeBack('100').includes('undefined'));
  assert.match(S.daily.comebackChest('Premium Chest', 7, 'Leo'), /Leo/);
  assert.match(S.daily.comebackChest('Premium Chest', 7, 'Leo'), /7 days away/);
  assert.ok(!S.daily.comebackChest('Premium Chest').includes('undefined'));
});

test('an ad pays a won career shift once more, a few times a day, and the count starts over the next day', () => {
  const c = newCareer();
  const money = c.money;
  for (let i = 0; i < baseConfig.adShiftDoublesPerDay; i++) assert.ok(Careers.rewardAdShiftDouble(c, 50, 300, baseConfig));
  assert.ok(!Careers.rewardAdShiftDouble(c, 50, 300, baseConfig), 'used up today');
  assert.ok(!Careers.rewardAdShiftDouble(c, 51, 0, baseConfig), 'nothing to double');
  assert.equal(c.money, money + 300 * baseConfig.adShiftDoublesPerDay);
  assert.equal(Careers.adShiftDoublesLeft(careerAfterSave(c), 51, baseConfig), baseConfig.adShiftDoublesPerDay, 'a new day, and it survives the save');
});

test('the starter streak pays its chest on the third day, once, and is the next prize until then', () => {
  const c = newCareer();
  assert.deepEqual(Careers.nextStreakMilestone(c), { days: 3, prize: { k: 'chest', chest: 'premium' }, left: 3 });
  assert.equal(Careers.startDaily(c, 100, baseConfig).chest, null);
  assert.equal(Careers.startDaily(c, 101, baseConfig).chest, null);
  const chests = c.chests.length;
  assert.equal(Careers.startDaily(c, 102, baseConfig).chest, 'premium');
  assert.equal(c.chests.length, chests + 1);
  assert.equal(Careers.nextStreakMilestone(c).prize.id, 'streakBronze', 'then the week');
  c.dailyStreak = 0;
  for (let day = 200; day < 203; day++) assert.equal(Careers.startDaily(c, day, baseConfig).chest, null, 'once in a career');
  assert.ok(S.daily.rowLine(1, false, { days: 3, left: 2, prize: { k: 'chest', chest: 'premium' } }).includes(S.shop.chest('premium')));
  // A save from before it that is past three days has had its reason for day two.
  assert.equal(careerAfterSave({ ...newCareer(), dailyStreak: 5, starterChest: undefined }).starterChest, true);
  assert.equal(careerAfterSave({ ...newCareer(), dailyStreak: 1, starterChest: undefined }).starterChest, false);
});

test('a save remembers the day it was first played, old saves have none', () => {
  const save = newSave();
  save.firstDay = 20_000;
  fakeStorage({ 'carGame.save.v2': JSON.stringify(save) });
  assert.equal(loadSave().firstDay, 20_000);
  fakeStorage({ 'carGame.save.v2': JSON.stringify({ career: { level: 3 } }) });
  assert.equal(loadSave().firstDay, -1);
});

test('a CrazyGames guest is offered the login once, after clearing its level', () => {
  const save = newSave();
  save.hints = ['install', 'notifications', 'tomorrow'];
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

test('opening the Daily or the Trials is no line of news: the place gets a dot and introduces itself; the Casino opens quietly', () => {
  const save = newSave();
  save.hints = ['modes', 'install', 'tomorrow', 'notifications'];
  save.career.level = baseConfig.dailyUnlockLevel - 1;
  let level = save.career.level;
  assert.ok(!bookShift(save, completed(level), context(level)).news.some((line) => /daily|trial/i.test(line)));
  assert.equal(Unlocks.isOpen(save.career, 'daily'), true);
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

test('a long line stays long enough to be read, a short one keeps the usual time', () => {
  const short = new NoticeQueue();
  short.say('Not enough money');
  assert.equal(short.shown.duration, NoticeQueue.duration);
  const long = new NoticeQueue();
  long.say('The offer ended while the ad played. Nothing was used up, so try again.');
  assert.ok(long.shown.duration > NoticeQueue.duration);
  assert.ok(long.shown.duration <= NoticeQueue.duration + 2.5);
});

test('a shift that starts keeps the announcement on screen, and holds the rest back', () => {
  const q = new NoticeQueue();
  q.announce('Casino opens', 'Daily opens');
  q.advance(2);
  q.held = true;
  assert.equal(q.shown.text, 'Casino opens', 'a tap to start does not wipe it');
  q.advance(NoticeQueue.queuedDuration);
  assert.equal(q.shown, null, 'the next one waits for the shift to end');
  q.held = false;
  assert.equal(q.shown.text, 'Daily opens');
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

test('an achievement is a card of its own and is never folded into the tail', () => {
  const card = { title: 'Scrapyard', tier: 'II', reward: '+600', text: 'Achievement · Scrapyard II · +600' };
  const q = new NoticeQueue();
  q.announce('1', '2', '3', '4', '5', '6', '7');
  q.achieve(card);
  const seen = [];
  while (q.shown) {
    seen.push(q.shown);
    q.advance(10);
  }
  assert.equal(seen.filter((n) => n.achievement).length, 1);
  assert.equal(seen.find((n) => n.achievement).achievement, card);
  assert.equal(seen.filter((n) => !n.achievement).at(-1).text, '5  ·  6  ·  7');
  const alone = new NoticeQueue();
  alone.achieve(card);
  assert.ok(alone.shown.duration > NoticeQueue.duration);
});

test('a tip waits for the free top card, stays its time, and starts over when cut off too early', () => {
  const a = { caption: 'TIP', text: 'A' };
  const b = { caption: 'TIP', text: 'B' };
  const q = new TipQueue();
  q.add(a, b, a);
  q.advance(0.1, true, false, true);
  assert.equal(q.view, null, 'nothing starts while something else asks for the eye');
  q.advance(0.1, true, true, true);
  assert.equal(q.view.tip, a);
  q.advance(1, false, false, true);
  assert.equal(q.view, null);
  assert.ok(q.isActive, 'a tip cut off before it was read stays in line');
  q.advance(0.1, true, true, true);
  assert.equal(q.view.tip, a);
  q.advance(TipQueue.hold + 0.1, true, true, true);
  assert.equal(q.view, null);
  q.advance(0.1, true, true, true);
  assert.equal(q.view.tip, b, 'a tip told twice shows once');
  q.advance(TipQueue.readAfter + 0.1, true, true, true);
  q.advance(0.1, false, false, true);
  q.advance(0.1, true, true, true);
  assert.equal(q.view, null, 'a tip read for long enough does not come back');
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

test('a condition icon opens its full sheet, even before the player has met it', () => {
  const career = newCareer();
  for (const e of shelfEntries(2)) {
    const id = museumId(e);
    assert.ok(!career.museumSeen.includes(id), id);
    const d = Details.museum(id, career, baseConfig, true);
    assert.notEqual(d.title, S.museum.unknown, id);
    assert.equal(d.price?.text, S.museum.firstTime, id);
    assert.ok(d.body.length > 0 && !/undefined|NaN/.test(d.title + d.body.join(' ')), id);
    assert.equal(Details.museum(id, career, baseConfig).title, S.museum.unknown, `${id} stays a secret in the Museum`);
  }
});

test('every way to lose goes on show once it happened, and the last one pays the Crash Test skin', () => {
  const career = newCareer();
  FAIL_CAUSES.forEach((cause, i) => {
    const id = museumId({ k: 'fail', kind: cause });
    assert.ok(!career.museumSeen.includes(id), id);
    assert.equal(Details.museum(id, career, baseConfig).title, S.museum.unknown, `${id} is a secret until it happens`);
    assert.equal(Careers.noteFailure(career, cause), i === FAIL_CAUSES.length - 1, `${cause}: the skin comes with the last one`);
    const d = Details.museum(id, career, baseConfig);
    assert.equal(d.tone, 'fail', id);
    assert.ok(d.body.length > 0 && !/undefined|NaN/.test(d.title + d.body.join(' ')), id);
  });
  assert.ok(Careers.owns(career, 'crashTest'));
  assert.ok(!Careers.noteFailure(career, 'bomb'), 'the skin is paid once');
});

test('a museum shelf is complete only when every entry has been seen', () => {
  const career = newCareer();
  for (const shelf of [0, 1, 2, 3]) assert.equal(shelfComplete(career.museumSeen, shelf), false, `shelf ${shelf}`);
  assert.deepEqual(completedShelves(career.museumSeen), []);

  const entries = shelfEntries(2);
  for (const e of entries.slice(0, -1)) career.museumSeen.push(museumId(e));
  assert.equal(shelfComplete(career.museumSeen, 2), false, 'one entry still missing');
  career.museumSeen.push(museumId(entries[entries.length - 1]));
  assert.equal(shelfComplete(career.museumSeen, 2), true);
  assert.deepEqual(completedShelves(career.museumSeen), [2], 'only the shelf that is full');

  for (const shelf of [0, 1, 3]) {
    for (const e of shelfEntries(shelf)) career.museumSeen.push(museumId(e));
  }
  assert.deepEqual(completedShelves(career.museumSeen), [0, 1, 2, 3], 'all four');
});

test('a lost shift says how it was lost, a won one does not', () => {
  for (const seed of [1, 2, 3]) {
    const r = play(seed, 5, (world) => world.queue.isReady).result;
    assert.ok(r, 'the shift ends');
    if (r.outcome === 'completed') assert.equal(r.failCause, null);
    else assert.ok(FAIL_CAUSES.includes(r.failCause), `seed ${seed}: ${r.outcome} has a cause`);
  }
});

test('Unlimited always accelerates like Quick Recovery at its top step, whatever was bought', () => {
  const top = baseConfig.driverAcceleration * (1 + upgradeMaxSteps.quickRecovery * baseConfig.recoveryPerStep);
  for (const steps of [0, 3]) {
    const career = { ...newCareer(), level: 10, upgrades: { quickRecovery: steps } };
    assert.equal(Careers.shiftConfig(career, 'unlimited', baseConfig, 5).driverAcceleration, top);
  }
  assert.ok(Careers.shiftConfig(newCareer(), 'shift', baseConfig, 5).driverAcceleration < top, 'a career shift is untouched');
});

test('the first levels bring one new thing each: nothing, police and dispatch, criminals, the transporter', () => {
  const at = (level, mode = 'shift', prestige = 0) => Careers.shiftConfig({ ...newCareer(), level, prestige }, mode, baseConfig, 11);
  const on = (c) => [c.policeShare > 0 && c.dispatchLimit > 0, c.criminalChance > 0, c.transporterFirst.lo < 1000];
  assert.deepEqual(on(at(1)), [false, false, false]);
  assert.deepEqual(on(at(2)), [true, false, false]);
  assert.deepEqual(on(at(3)), [true, true, false]);
  assert.deepEqual(on(at(4)), [true, true, true]);
  assert.equal(at(4).tankerShare, 0);
  assert.ok(at(5).tankerShare > 0);
  // Whoever has been through Prestige, and the other modes, have met it all.
  assert.deepEqual(on(at(1, 'shift', 1)), [true, true, true]);
  assert.deepEqual(on(Careers.shiftConfig({ ...newCareer(), level: 1 }, 'unlimited', baseConfig, 11)), [true, true, true]);
});

test('a place explains itself once: new players get the Museum and Builder after the tutorial, the rest when it opens; old saves are not told again', async () => {
  const { Intros } = await load('/src/present/intros.ts');
  const fresh = newSave();
  Intros.start(fresh, baseConfig);
  assert.deepEqual(Intros.pending(fresh, baseConfig), [], 'nothing while the tutorial runs');
  fresh.tutorialDone = true;
  assert.deepEqual(Intros.pending(fresh, baseConfig), ['museum', 'builder']);
  Intros.mark(fresh, 'museum');
  fresh.career.level = 12;
  assert.deepEqual(Intros.pending(fresh, baseConfig), ['builder', 'daily', 'trials', 'casino', 'crew']);
  const old = newSave();
  old.tutorialDone = true;
  old.career.level = 30;
  Intros.start(old, baseConfig);
  assert.deepEqual(Intros.pending(old, baseConfig), [], 'a save that has played before has met what it can reach');
  old.career.level = 50;
  assert.ok(Intros.pending(old, baseConfig).includes('club'), 'what opens later still explains itself');
});

test('news: a new player has nothing to catch up on, a returning one sees it until the place has been visited', async () => {
  const { News, NEWS } = await load('/src/present/news.ts');
  const fresh = newSave();
  News.start(fresh);
  fresh.tutorialDone = true;
  assert.deepEqual(News.pending(fresh), [], 'the tutorial counts everything listed as met');
  const old = newSave();
  old.tutorialDone = true;
  News.start(old);
  assert.equal(News.pending(old).length, NEWS.length, 'a save that has played sees what is new');
  const [first] = NEWS;
  assert.deepEqual(News.sections(old, first.tab), [first.section]);
  assert.equal(News.read(old, first.tab, first.section), true);
  assert.equal(News.read(old, first.tab, first.section), false, 'seen once');
  assert.equal(News.pending(old).length, NEWS.length - 1);
});

test('the Ready flame loops through the Heat icon poses and holds still for Reduce Motion', () => {
  const draw = (time, reduceMotion) => {
    const list = new RenderList({ viewport: { x: 200, y: 200 }, center: { x: 0, y: 0 }, focus: { x: 100, y: 100 }, scale: 1 }, 'background');
    heatFlame(list, { x: 100, y: 100 }, 20, 1, time, reduceMotion);
    return list.items.filter((i) => i.color.startsWith('fire'));
  };
  const first = draw(0.2, false);
  const later = draw(0.9, false);
  assert.deepEqual(first.map((i) => i.color), ['fireDeep', 'fireOuter', 'fireCore']);
  assert.equal(first.length, 3);
  assert.notDeepEqual(first.map((i) => i.p.points), later.map((i) => i.p.points), 'the flame moves');
  assert.ok(!/null|NaN|Infinity/.test(JSON.stringify(first)), 'the flame has no broken numbers');
  assert.deepEqual(
    draw(0.2, true).map((i) => i.p.points),
    draw(4.4, true).map((i) => i.p.points),
    'Reduce Motion draws the same still flame at every time',
  );
});

test('condition icons: one per condition of the shift, tap targets of 64 points that never overlap', () => {
  const config = cloneConfig(baseConfig);
  Object.assign(config, { weather: 'heavyRain', cityEvent: 'roadClosure', night: true, blackout: false, lanes: 2 });
  const chips = conditionChips(config, newCareer());
  assert.deepEqual(chips.map((c) => c.id), ['dark.night', 'weather.heavyRain', 'event.roadClosure']);
  assert.ok(chips.every((c) => c.isNew));
  const targets = ConditionChips.targets(chips.length, { x: 200, y: 400 });
  for (const [i, r] of targets.entries()) {
    assert.ok(r.maxX - r.minX >= 64 && r.maxY - r.minY >= 64);
    if (i > 0) assert.ok(r.minX >= targets[i - 1].maxX);
  }
  // Clear of the prompt drawn on the island's centre.
  assert.ok(ConditionChips.center({ x: 200, y: 400 }, false).y + ConditionChips.hit / 2 <= 400 - 16);
});

test('everything in the Museum has a briefing short enough for two lines of the top card', () => {
  for (const e of [...shelfEntries(0), ...shelfEntries(1), ...shelfEntries(2)]) {
    const b = briefOf(e);
    // A boss is announced by the syndicate's name, new or not.
    assert.match(b.caption, e.k === 'boss' ? /^SYNDICATE · \S/ : /^NEW · \S/, museumId(e));
    assert.match(briefOf(e, true).caption, e.k === 'boss' ? /^SYNDICATE · \S/ : /^REMEMBER · \S/, museumId(e));
    assert.ok(b.text.length > 0 && !/undefined|NaN/.test(b.caption + b.text), museumId(e));
    assert.ok(b.text.length <= 72, `${museumId(e)} is ${b.text.length} characters: ${b.text}`);
  }
});

test('every condition and failure in the Museum has a picture that draws at rest and while it plays', () => {
  const camera = { viewport: { x: 200, y: 200 }, center: { x: 0, y: 0 }, focus: { x: 100, y: 100 }, scale: 1 };
  const entries = [0, 1, 2, 3].flatMap((shelf) => shelfEntries(shelf)).filter((e) => e.k !== 'boss' && e.k !== 'special');
  assert.ok(entries.length >= 27, 'weather, darkness, events, the road and the failures');
  for (const e of entries) {
    const still = MuseumPage.icon(new RenderList(camera, 'background'), e, { x: 100, y: 100 }, 1, 60);
    assert.ok(still.length > 2, `${museumId(e)} draws something`);
    for (const t of [0, 0.15, 0.4, 0.9, 2.5, 10]) {
      const frame = MuseumPage.icon(new RenderList(camera, 'background'), e, { x: 100, y: 100 }, 1, 60, t);
      assert.ok(!/null|NaN|Infinity/.test(JSON.stringify(frame)), `${museumId(e)} at ${t} s has no broken numbers`);
    }
    const done = MuseumPage.icon(new RenderList(camera, 'background'), e, { x: 100, y: 100 }, 1, 60, 10);
    assert.equal(JSON.stringify(done), JSON.stringify(still), `${museumId(e)} comes to rest in the picture it started from`);
  }
});

test('an icon in view plays every two seconds, one among many plays once, and the mouse plays it again from the start', () => {
  const run = (key, from, to, mode, over = () => false) => {
    const out = new Map();
    for (let i = Math.round(from * 10); i <= Math.round(to * 10); i++) out.set(i / 10, Math.round(iconClock(key, i / 10, mode, over(i / 10)) * 10) / 10);
    return out;
  };
  assert.equal(ICON_LOOP, 2);
  const loop = run('loop', 0, 5, 'loop');
  assert.deepEqual([0, 1, 1.9, 2, 3, 4, 5].map((n) => loop.get(n)), [0, 1, 1.9, 0, 1, 0, 1]);
  const once = run('once', 0, 5, 'once');
  assert.deepEqual([0, 1, 2, 5].map((n) => once.get(n)), [0, 1, 2, 5]);
  const hovered = run('hover', 10, 14, 'once', (now) => now >= 12 && now < 13);
  assert.deepEqual([11.9, 12, 12.5, 13.5, 14].map((n) => hovered.get(n)), [1.9, 0, 0.5, 1.5, 2]);
  assert.equal(iconClock('later', 20, 'once', false), 0);
  assert.equal(iconClock('later', 25, 'once', false), 0, 'an icon that was out of view starts again when it comes back');
  assert.ok(iconClock('held', 30, 'loop', false, 1) < 0, 'a delayed first play waits');
});

test('a briefing with a task stays while the task is on, but never for long, then the numbers come back', () => {
  const world = { criminal: { kind: 'warning' } };
  const briefs = new Briefings();
  briefs.add(briefOf({ k: 'special', kind: 'pickup' }));
  briefs.add(briefOf({ k: 'special', kind: 'pickup' }));
  for (let t = 0; t < 8; t += 0.1) briefs.advance(0.1, world);
  assert.equal(briefs.view?.brief.id, 'special.pickup', 'still on while the criminal is');
  assert.ok(briefs.view?.used > 0 && briefs.view.used < 1, 'its time runs down along the card');
  world.criminal.kind = 'idle';
  for (let t = 0; t < 1; t += 0.1) briefs.advance(0.1, world);
  assert.equal(briefs.view, null);
  assert.ok(briefs.isEmpty, 'given once per shift');
  // A task that drags on gives the card back to the numbers after its limit.
  const long = new Briefings();
  const chase = { criminal: { kind: 'active' } };
  long.add(briefOf({ k: 'special', kind: 'pickup' }));
  for (let t = 0; t < Briefings.most + 2; t += 0.1) long.advance(0.1, chase);
  assert.equal(long.view, null, 'numbers are back though the task is not over');
});

test('news waits for a breather between briefings and stays off the last cars', () => {
  const world = { criminal: { kind: 'idle' }, carsLeft: 20 };
  const briefs = new Briefings();
  briefs.add(briefOf({ k: 'weather', kind: 'fog' }));
  briefs.add(briefOf({ k: 'event', kind: 'roadworks' }));
  let hidden = 0;
  let longestRun = 0;
  let run = 0;
  for (let t = 0; t < 40; t += 0.05) {
    briefs.advance(0.05, world);
    if (briefs.view && briefs.view.card > 0.5) {
      hidden += 0.05;
      run += 0.05;
      longestRun = Math.max(longestRun, run);
    } else run = 0;
  }
  assert.ok(longestRun < Briefings.timed + 1, `one briefing at a time, longest ${longestRun.toFixed(1)} s`);
  assert.ok(hidden < 14, `the numbers are hidden ${hidden.toFixed(1)} s of 40`);
  const late = new Briefings();
  late.add(briefOf({ k: 'weather', kind: 'fog' }));
  for (let t = 0; t < 10; t += 0.1) late.advance(0.1, { criminal: { kind: 'idle' }, carsLeft: Briefings.lastCars });
  assert.equal(late.view, null, 'nothing new on the last cars');
  assert.equal(late.clear().length, 1, 'it is owed for the next shift');
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

test('cars spammed into the slow traffic after a crash pay a plain merge, build no combo and leave at the next exit (Unlimited)', async () => {
  const { upgradeMaxSteps } = await load('/src/core/levels.ts');
  const career = { ...newCareer(), level: 40, upgrades: { ...upgradeMaxSteps } };
  const cfg = Careers.shiftConfig(career, 'unlimited', baseConfig, 37);
  const world = new World(cfg, 37, { startsOnFirstTap: true });
  // The police car at the front goes into the traffic and crashes; then taps as fast as possible.
  world.tap(1.5);
  let next = Infinity;
  let launched = 0;
  const exits = new Set();
  while (world.time < 12 && world.shift.phase !== 'ended') {
    if (world.time >= next) {
      world.tap(world.time);
      next = world.time + 0.15;
    }
    world.step();
    for (const e of world.takeEvents()) {
      if (e.type === 'crash' && e.isPoliceCrash && next === Infinity) next = world.time + 2;
      if (e.type === 'launched') launched++;
      if (e.type === 'merged' && e.crept) {
        const phase = world.vehicle(e.vehicle)?.phase;
        if (phase?.kind === 'ring') exits.add(phase.exitArm.index);
      }
    }
  }
  assert.ok(world.score.crept >= 5, `crept ${world.score.crept}`);
  assert.ok(world.score.combo === 0 && world.score.points <= world.score.crept * cfg.pointsClean, `a plain merge each, no combo: combo ${world.score.combo}, points ${world.score.points}`);
  assert.equal(world.shift.carsSent, launched, 'a car that crept in still counts');
  assert.deepEqual([...exits], [world.layout.advance(world.layout.player, 1).index], 'it leaves at the next exit');
});

test('a strike by a merging car says which side the other car was on', () => {
  const faults = new Set();
  for (const seed of [3, 11, 29, 41]) {
    const world = new World(Careers.shiftConfig({ ...newCareer(), level: 10 }, 'shift', baseConfig, seed), seed, { startsOnFirstTap: true });
    let next = 0;
    while (world.time < 40 && world.shift.phase !== 'ended') {
      if (world.time >= next) {
        world.tap(world.time);
        next = world.time + 0.2;
      }
      world.step();
      for (const e of world.takeEvents()) {
        if (e.type !== 'crash') continue;
        assert.ok(e.fault === null || e.fault === 'behind' || e.fault === 'ahead');
        if (!e.isStrike) assert.equal(e.fault, null, 'only a strike has a fault');
        if (e.fault) faults.add(e.fault);
      }
    }
  }
  assert.ok(faults.size > 0, 'a reckless driver crashes into somebody');
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

test('from Prestige ★2 a Legendary Shift can bring more rules, all five at ★10, and a challenge keeps them', async () => {
  const { drawLegendaryExtra } = await load('/src/core/levels.ts');
  let most = 0;
  for (let seed = 1; seed < 400; seed++) {
    assert.deepEqual(drawLegendaryExtra(baseConfig, 'gridlock', 1, seed), [], 'nothing more below ★2');
    assert.deepEqual(drawLegendaryExtra(baseConfig, null, 10, seed), [], 'nothing without a Legendary Shift');
    const extra = drawLegendaryExtra(baseConfig, 'gridlock', 10, seed);
    assert.ok(!extra.includes('gridlock') && new Set(extra).size === extra.length, 'never a rule twice');
    assert.ok(drawLegendaryExtra(baseConfig, 'gridlock', 2, seed).length <= 1);
    most = Math.max(most, extra.length);
  }
  assert.equal(most, LEGENDARY_RULES.length - 1, 'all five come together now and then');
  const seed = 9100;
  const all = () => forLegendary(forLevel(baseConfig, 30, seed), 'gridlock', LEGENDARY_RULES.slice(1));
  assert.equal(all().trialRule, 'flawless');
  const taps = [];
  const first = playConfig(all(), seed, (world) => careful(world) && (taps.push(world.time), true));
  assert.ok(first.result, 'the shift with every rule ends');
  assert.deepEqual(first.result.legendaryExtra, LEGENDARY_RULES.slice(1));
  const spec = challengeOf(newCareer(), 'shift', 30, seed, null, 100, 'dragnet', null, ['heavyLoad', 'zeroTolerance']);
  assert.deepEqual(decodeChallenge(encodeChallenge(spec)).legendaryExtra, ['heavyLoad', 'zeroTolerance']);
});

test('late Elite levels take about as many shifts as Elite 50, and every Prestige rank adds 10 % XP', () => {
  const c = newCareer();
  c.prestige = 1;
  c.eliteXp = Elite.xpTo(10);
  assert.ok(Math.abs(Elite.boost(c) - 1.1) < 1e-9);
  c.prestige = 30;
  assert.ok(Math.abs(Elite.boost(c) - 2) < 1e-9, 'at most double from Prestige');
  c.prestige = 0;
  c.level = 50;
  c.eliteXp = Elite.xpTo(121);
  assert.ok(Math.abs(Elite.boost(c) * Elite.need(50) - Elite.need(121)) < 1e-9);
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
  let mostBuses = 0;
  for (let s = 1; s <= 40; s++) {
    const cfg = forCityEvent(forLevel(baseConfig, 40, s), 'schoolRun', s);
    const world = new World(cfg, s, { startsOnFirstTap: false });
    let warned = false;
    for (let i = 0; i < 120 * 60; i++) {
      if (laneAware(world)) world.tap(world.time);
      world.step();
      for (const x of world.vehicles) seen.add(x.type);
      mostBuses = Math.max(mostBuses, world.vehicles.filter((x) => x.type === 'bus').length);
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
  assert.ok(mostBuses <= baseConfig.busMax, `at most ${baseConfig.busMax} school bus is on the road at once, saw ${mostBuses}`);
  const low = new World(forLevel(baseConfig, 10, 5), 5, { startsOnFirstTap: false });
  for (let i = 0; i < 120 * 20; i++) low.step();
  assert.ok(!low.vehicles.some((x) => ['motorbike', 'learner', 'fireTruck', 'bus'].includes(x.type)), 'nothing new below its level');
});

test('roadworks and the bus stop never cover an entry or an exit', async () => {
  const { forCityEvent } = await load('/src/core/levels.ts');
  const layouts = [[8], [4, 12], [4, 8, 12], [2, 5, 8, 11, 14]];
  let drawn = 0;
  for (const armSlots of layouts) {
    for (const lanes of [1, 2]) {
      for (let s = 1; s <= 12; s++) {
        for (const event of ['roadworks', 'schoolRun']) {
          const cfg = forCityEvent({ ...forLevel(baseConfig, 40, s), armSlots, lanes }, event, s);
          const world = new World(cfg, s, { startsOnFirstTap: false });
          const stretch = world.roadworks ?? world.layout.clearStretch(cfg.busStopAt, baseConfig.busLength + 12);
          if (!world.roadworks) assert.equal(world.busStopS, stretch.start + stretch.arc);
          assert.ok(stretch.arc >= 36, `${event} keeps a usable length, got ${stretch.arc} on ${armSlots}`);
          drawn++;
          for (const arm of world.layout.arms) {
            // A crowded two-lane ring has no room clear of the inner lane too: there the outer lane's junctions are what count.
            for (let lane = 0; lane < (armSlots.length <= 3 ? world.layout.lanes : 1); lane++) {
              for (const at of [world.layout.entryS(arm, lane), world.layout.exitS(arm, lane)]) {
                assert.ok(world.layout.ringDistance(stretch.start, at) > stretch.arc, `${event} on arms ${armSlots}, ${lanes} lanes, seed ${s} covers a junction`);
              }
            }
          }
        }
      }
    }
  }
  assert.ok(drawn > 0);
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
  assert.deepEqual(SeasonPass.record(c, shift, day + 120).steps.map((s) => s.tier), [1, 4, 7], 'last season’s pass has closed: only the free tiers pay');

  // The free track, from the winter season on: XP for everyone, three tiers free, buying pays the rest reached.
  const autumn = Math.floor(Date.UTC(2026, 9, 18) / 86400000);
  const f = newCareer();
  f.level = 20;
  assert.equal(SeasonPass.record(f, shift, autumn), null, 'no free track before the winter');
  const free = SeasonPass.record(f, shift, day);
  assert.deepEqual(free.steps.map((s) => s.tier), [1, 4, 7]);
  assert.deepEqual(f.chests, ['standard', 'standard', 'event']);
  assert.equal(SeasonPass.waiting(f, day), PASS_TIERS - 3);
  f.money = baseConfig.seasonPassPrice;
  const paid = SeasonPass.buy(f, day);
  assert.equal(paid.length, PASS_TIERS - 3, 'buying pays every Premium tier reached');
  assert.ok(paid.every((s) => !SeasonPass.isFree(s.tier, day)));
  assert.equal(SeasonPass.waiting(f, day), 0);
  assert.equal(SeasonPass.record(f, shift, day).steps.length, 0, 'every tier pays once');
  const spring = day + 100;
  assert.equal(SeasonPass.tier(f, spring), 0, 'a new season starts the track again');
  assert.deepEqual(SeasonPass.record(f, shift, spring).steps.map((s) => s.tier), [1, 4, 7]);
  const p = newCareer();
  p.level = baseConfig.prestigeLevel;
  Careers.prestige(p, baseConfig, day);
  assert.deepEqual(p.hallOfFame.map((e) => e.rank), [1]);
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

test('the Elite bar says where a shift moved the track and what is missing to the next level', async () => {
  const { Elite } = await load('/src/core/elite.ts');
  const c = newCareer();
  c.prestige = 1;
  const need = Elite.need(1);
  c.eliteXp = need / 4;
  const before = c.eliteXp;
  c.eliteXp += need / 4;
  const bar = Elite.bar(c, before);
  assert.deepEqual([bar.level, bar.climbed, bar.gained], [1, 0, need / 4]);
  assert.ok(Math.abs(bar.from - 0.25) < 1e-9 && Math.abs(bar.to - 0.5) < 1e-9);
  assert.equal(bar.left, need - c.eliteXp);
  c.eliteXp = Elite.xpTo(2) + 3;
  const up = Elite.bar(c, Elite.xpTo(2) - 2);
  assert.equal(up.climbed, 1);
  assert.equal(up.level, 2);
  assert.ok(up.from > 0.9 && up.to < 0.1);
  assert.equal(up.left, Elite.need(2) - 3);
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

// MARK: The Honours shelf

test('the Honours shelf stands in rarity order, the cars first, then the vehicles, then the maps', async () => {
  const { rarityRank } = await load('/src/core/loot.ts');
  const { shelfItems } = await load('/src/present/shop.ts');
  const items = shelfItems(2);
  assert.ok(items.length > 20);
  const kindRank = (i) => (i.kind === 'mapSkin' ? 2 : i.kind === 'vehicleType' ? 1 : 0);
  for (let i = 1; i < items.length; i++) {
    const [a, b] = [items[i - 1], items[i]];
    assert.ok(kindRank(a) <= kindRank(b), `${a.id} before ${b.id}: cars, vehicles, maps`);
    if (kindRank(a) === kindRank(b) && kindRank(a) !== 1) assert.ok(rarityRank(a.rarity) <= rarityRank(b.rarity), `${a.id} before ${b.id}: by rarity`);
  }
  assert.equal(new Set(items.map((i) => i.id)).size, items.length, 'nothing twice');
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

test('growing loot: merges while the boss is on the ring add to its catch, capped, and only in a career shift', async () => {
  const { criminalCaught, growBossLoot, bossLootBase } = await load('/src/core/specials.ts');
  const { ScoreBoard } = await load('/src/core/scoring.ts');
  const c = newCareer();
  c.level = 15;
  const career = Careers.careerShift(c, baseConfig, 3);
  assert.ok(career.convoy && career.bossLoot);
  assert.ok(!Careers.shiftConfig(c, 'daily', baseConfig, 3).bossLoot, 'the Daily stays comparable');
  const w = { config: career, score: new ScoreBoard(), isScoring: true, events: [], criminal: { kind: 'warning' }, escortsDue: null, criminalRng: { range: (lo) => lo }, vehicle: () => ({ role: 'boss' }), scoreTakedown: () => 1000 };
  growBossLoot(w, 'perfect');
  assert.equal(w.score.bossLoot, 0, 'nothing before the boss is on the ring');
  w.criminal = { kind: 'active', vehicle: 1, deadline: 99 };
  growBossLoot(w, 'clean');
  growBossLoot(w, 'tightFit');
  growBossLoot(w, 'cutOff');
  assert.equal(w.score.bossLoot, career.bossLootClean + career.bossLootTight);
  for (let i = 0; i < 20; i++) growBossLoot(w, 'perfect');
  const base = bossLootBase(career);
  assert.equal(w.score.bossLoot, Math.round(base * career.bossLootCap));
  criminalCaught(w, 1, 2, { x: 0, y: 0 }, 10);
  assert.equal(w.events.find((e) => e.type === 'heistRecovered').amount, base + w.score.bossLoot);
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
    assert.ok(challengeReward(q, 1) >= 250, `${q} pays`);
    assert.ok(challengeReward(q, 60) >= 5 * challengeReward(q, 1), `${q} grows with the level`);
    assert.equal(challengeMet(q, none), false, `${q} is not met by an empty shift`);
  }
  assert.ok(challengeMet('oneTakedown', { ...none, takedowns: 1 }));
  assert.ok(challengeMet('hugeCombo', { ...none, bestCombo: 25 }) && !challengeMet('hugeCombo', { ...none, bestCombo: 24 }));
  assert.ok(challengeMet('twoNearMisses', { ...none, nearMisses: 2 }));
});

test("a live challenge shows its short label and the same count that pays it", () => {
  const none = { perfects: 0, tightFits: 0, takedowns: 0, transporters: 0, bestChain: 0, bestCombo: 0, isPerfectRun: false, cleanMerges: 0, nearMisses: 0 };
  assert.deepEqual(challengeProgress('tightFits', none), { have: 0, need: 3, met: false });
  assert.deepEqual(challengeProgress('tightFits', { ...none, tightFits: 2 }), { have: 2, need: 3, met: false });
  assert.deepEqual(challengeProgress('tightFits', { ...none, tightFits: 4 }), { have: 3, need: 3, met: true }, 'never 4/3');
  assert.deepEqual(challengeProgress('perfectRun', { ...none, isPerfectRun: true }), { have: 1, need: 1, met: true });
  for (const q of CHALLENGES) {
    const short = S.daily.challengeShort(q);
    assert.ok(short.length > 0, `${q} has a short label`);
    assert.equal(challengeProgress(q, none).met, challengeMet(q, none), `${q} shows the rule it pays`);
  }
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

test('the Elite sheet keeps a plaque per Prestige rank and no longer sells a Hall of Fame', async () => {
  const { Details } = await load('/src/present/detail.ts');
  const c = newCareer();
  c.level = baseConfig.prestigeLevel;
  Careers.prestige(c, baseConfig, 20000);
  const elite = Details.elite(c, baseConfig, false);
  const log = elite.sections.find((x) => x.header === 'Prestige log');
  assert.ok(log && log.rows.some((r) => r.label === '★1'), 'the plaque of the first rank is listed');
  assert.ok(!elite.actions.some((a) => a.action.k === 'buildHall'), 'nothing to build any more');
});

// MARK: What's new

test("What's new has one entry per day, newest first, and a new item lights the dot again", async () => {
  const days = PATCH_NOTES.map((n) => n.id);
  for (const day of days) assert.match(day, /^\d{4}-\d{2}-\d{2}$/, `${day}: the id is the day`);
  assert.equal(new Set(days).size, days.length, 'one entry per day: add to the day that is already there');
  assert.deepEqual([...days].sort().reverse(), days, 'newest day first');
  for (const n of PATCH_NOTES) {
    assert.ok(n.items.length > 0 && n.title.length > 0, `${n.id} says something`);
    assert.ok(n.summary.length > 0 && n.summary.length <= SUMMARY_LINES, `${n.id}: the summary has 1 to ${SUMMARY_LINES} lines`);
    for (const line of n.summary) assert.ok(itemText(line).length <= SUMMARY_LENGTH, `${n.id}: a summary line is short (${itemText(line).length} > ${SUMMARY_LENGTH})`);
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
    assert.deepEqual(day.summary.map((l) => l.text), PATCH_NOTES[i].summary.map(itemText), 'the short version travels too');
  }
  // A line from a player keeps its credit; one of ours has no `from` at all.
  const custom = changelogFile([
    { id: '2026-01-02', date: '2 January 2026', title: 'T', impact: 'fix', summary: ['Ours.'], items: ['Ours.', { text: 'Theirs.', from: null }, { text: 'Named.', from: 'Mia' }] },
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
  const link = 'https://game.timing.love/#join=4821';
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

test('a Streak Freeze is earned on the third day and every seven days after, and covers one missed day', () => {
  const c = newCareer();
  for (let day = 100; day < 103; day++) Careers.startDaily(c, day, baseConfig);
  assert.equal(c.dailyStreak, 3);
  assert.equal(c.streakFreezes, 1, 'the third day earns the first');
  assert.equal(Goals.streak(c, 104), 3, 'a missed day is covered while the streak is shown');
  const news = Careers.startDaily(c, 104, baseConfig);
  assert.equal(news.frozen, 1);
  assert.equal(c.dailyStreak, 4, 'the streak goes on');
  assert.equal(c.streakFreezes, 0, 'the Freeze is used up');
  for (let day = 105; day < 108; day++) Careers.startDaily(c, day, baseConfig);
  assert.equal(c.dailyStreak, 7);
  assert.equal(c.streakFreezes, 1, 'the seventh day earns the next');
});

test('seven clean days pay a Perfect Week once a week, with money and a free Scratch Card', () => {
  const c = newCareer();
  c.money = 0;
  let news = null;
  for (let day = 100; day < 106; day++) news = Careers.startDaily(c, day, baseConfig);
  assert.equal(news.perfectWeek, false, 'six days are not a week yet');
  assert.equal(c.money, 0);
  news = Careers.startDaily(c, 106, baseConfig);
  assert.equal(news.perfectWeek, true);
  assert.equal(news.perfectWeekPay, baseConfig.perfectWeekPay);
  assert.equal(news.perfectWeekCards, baseConfig.perfectWeekCards);
  assert.equal(c.money, baseConfig.perfectWeekPay);
  assert.equal(c.perfectWeeks, 1);
  assert.equal(c.perfectWeekDay, 106);
  assert.deepEqual(Careers.perfectWeekProgress(c, 106, baseConfig), { days: 7, perfect: true, paid: true });
  const nextDay = Careers.startDaily(c, 107, baseConfig);
  assert.equal(nextDay.perfectWeek, false, 'not again the next day');
  assert.equal(c.perfectWeeks, 1);
  for (let day = 108; day < 113; day++) Careers.startDaily(c, day, baseConfig);
  const weekTwo = Careers.startDaily(c, 113, baseConfig);
  assert.equal(weekTwo.perfectWeek, true, 'a new clean week pays again');
  assert.equal(c.perfectWeeks, 2);
  assert.equal(c.money, 2 * baseConfig.perfectWeekPay);
});

test('a Freeze covers the missed day, but a covered day is not a clean day for the Perfect Week', () => {
  const c = newCareer();
  for (let day = 200; day < 206; day++) Careers.startDaily(c, day, baseConfig);
  assert.equal(c.streakFreezes, 1, 'the first Freeze waits');
  const news = Careers.startDaily(c, 207, baseConfig);
  assert.equal(news.frozen, 1, 'day 206 is covered');
  assert.equal(c.dailyStreak, 7);
  assert.equal(news.perfectWeek, false, 'a covered day breaks the clean week');
  assert.equal(c.perfectWeeks, 0);
  assert.equal(c.money, 0);
  assert.deepEqual(Careers.streakCalendar(c, 207).map((x) => x.state), ['done', 'done', 'done', 'done', 'done', 'frozen', 'done']);
});

test('the streak calendar tells played, covered, missed and today still open', () => {
  const c = newCareer();
  for (let day = 300; day < 303; day++) Careers.startDaily(c, day, baseConfig);
  assert.deepEqual(Careers.streakCalendar(c, 304).map((x) => x.state), ['missed', 'missed', 'done', 'done', 'done', 'missed', 'open']);
  assert.deepEqual(Careers.streakCalendar(c, 302).map((x) => x.state), ['missed', 'missed', 'missed', 'missed', 'done', 'done', 'done']);
});

test('the streak road pays its skins and chests once each, up to a year of days', () => {
  const c = newCareer();
  assert.deepEqual(Careers.nextStreakMilestone(c), { days: baseConfig.starterStreakDays, prize: { k: 'chest', chest: baseConfig.starterStreakChest }, left: baseConfig.starterStreakDays });
  const paid = [];
  for (let day = 100; day < 160; day++) {
    const news = Careers.startDaily(c, day, baseConfig);
    if (news.item) paid.push([c.dailyStreak, news.item]);
    if (news.chest) paid.push([c.dailyStreak, news.chest]);
  }
  assert.deepEqual(paid, [[3, 'premium'], [7, 'streakBronze'], [14, 'streakSilver'], [30, 'streakGold'], [60, 'premium']]);
  assert.deepEqual(c.streakMilestones, [7, 14, 30, 60]);
  assert.deepEqual(Careers.streakRoad(c).filter((x) => x.reached).map((x) => x.days), [7, 14, 30, 60]);
  assert.equal(Careers.nextStreakMilestone(c).days, 100, 'the next post is the hundred');
  const after = Careers.startDaily(c, 160, baseConfig);
  assert.equal(after.item, null);
  assert.equal(after.chest, null, 'the milestone is paid once, not again');
  assert.equal(c.streakMilestones.filter((d) => d === 60).length, 1);
});

test('a save keeps the streak calendar, milestones and Perfect Weeks, and an old save gets a week from its streak', () => {
  const c = newCareer();
  c.dailyPlayed = 10;
  c.dailyStreak = 3;
  c.streakMilestones = [7];
  c.perfectWeekDay = 10;
  c.perfectWeeks = 2;
  fakeStorage({ 'carGame.save.v2': JSON.stringify({ career: c }) });
  const back = loadSave().career;
  assert.deepEqual(back.streakLog.map((x) => x.d), [8, 9, 10], 'an empty log is filled from the current streak');
  assert.deepEqual(back.streakMilestones, [7]);
  assert.deepEqual([back.perfectWeekDay, back.perfectWeeks], [10, 2]);
  fakeStorage({ 'carGame.save.v2': JSON.stringify({ career: { level: 3, dailyPlayed: 10, dailyStreak: 3, collection: ['streakSilver'] } }) });
  const old = loadSave().career;
  assert.deepEqual(old.streakLog.map((x) => x.d), [8, 9, 10]);
  assert.deepEqual(old.streakMilestones, [14], 'the skin already in the collection was paid');
  assert.deepEqual([old.perfectWeekDay, old.perfectWeeks], [-1, 0]);
  fakeStorage({ 'carGame.save.v2': JSON.stringify({ career: { level: 3, dailyPlayed: 100, dailyStreak: 70, collection: ['streakBronze', 'streakSilver', 'streakGold'] } }) });
  const long = loadSave().career;
  assert.deepEqual(long.streakMilestones, [7, 14, 30, 60], 'a chest milestone already passed is not paid twice');
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
  assert.equal(c.streakFreezes, 2, 'day three and day seven each earned one');
  assert.equal(Goals.streak(c, 109), 7, 'two missed days, two Freezes');
  assert.equal(Goals.streak(c, 110), 0, 'three missed days, two Freezes');
  assert.equal(Careers.startDaily(c, 110, baseConfig).frozen, 0);
  assert.equal(c.dailyStreak, 1);
  assert.equal(c.streakFreezes, 2, 'unused Freezes stay');
  const long = newCareer();
  for (let day = 0; day < 28; day++) Careers.startDaily(long, day, baseConfig);
  assert.equal(long.streakFreezes, baseConfig.streakFreezeMax);
  assert.ok(!Goals.streakAtRisk({ ...long, dailyPlayed: 27 }, 28), 'a Freeze waits: nothing to warn about');
  assert.equal(Careers.completeDaily(newCareer(), 5, baseConfig), baseConfig.dailyPay, 'the Daily Shift pays through the same path');
});

test('an ad brings a broken streak back once a week, and only a streak that was worth keeping', () => {
  const c = newCareer();
  for (let day = 100; day < 104; day++) Careers.startDaily(c, day, baseConfig);
  c.streakFreezes = 0;
  assert.equal(Careers.adRescue(c, 104, baseConfig), null, 'nothing is broken yet: yesterday counted');
  assert.equal(Careers.adRescue(c, 106, baseConfig), 4, 'two days missed, no Freeze: broken, and it can come back');
  assert.equal(Goals.streak(c, 106), 0);
  assert.equal(Careers.rewardAdRescue(c, 106, baseConfig), 4);
  assert.equal(Goals.streak(c, 106), 4, 'the streak lives again');
  Careers.startDaily(c, 106, baseConfig);
  assert.equal(c.dailyStreak, 5, 'and today counts on top of it');
  assert.equal(Careers.rewardAdRescue(c, 106, baseConfig), null, 'the Daily is played: nothing left to rescue');
  c.dailyPlayed = 110;
  assert.equal(Careers.adRescue(c, 112, baseConfig), null, 'not twice within a week');
  assert.equal(Careers.adRescue(c, 113, baseConfig), 5, 'a week later it can come back again');
  assert.equal(Careers.adRescue(c, 110 + baseConfig.streakRescueMaxMissed + 2, baseConfig), null, 'too many days missed');
  const short = newCareer();
  Careers.startDaily(short, 100, baseConfig);
  assert.equal(Careers.adRescue(short, 103, baseConfig), null, 'a streak of one day is not worth an ad');
});

test('an ad gives a Streak Freeze to a streak that is about to break, once a day', () => {
  const c = newCareer();
  Careers.startDaily(c, 100, baseConfig);
  Careers.startDaily(c, 101, baseConfig);
  assert.ok(Careers.adFreezeOpen(c, 102), 'yesterday counted, no Freeze, today open');
  assert.ok(Careers.rewardAdFreeze(c, 102));
  assert.equal(c.streakFreezes, 1);
  assert.ok(!Careers.rewardAdFreeze(c, 102), 'with the Freeze in stock there is nothing to give');
  assert.equal(Goals.streak(c, 103), 2, 'a missed day is covered now');
  c.streakFreezes = 0;
  assert.ok(!Careers.adFreezeOpen(c, 102), 'once a day');
});

test('an ad pays the Daily once more, once a day, and never for no pay', () => {
  const c = newCareer();
  c.money = 100;
  assert.ok(!Careers.rewardAdDouble(c, 50, 0));
  assert.ok(Careers.rewardAdDouble(c, 50, 400));
  assert.equal(c.money, 500);
  assert.ok(!Careers.rewardAdDouble(c, 50, 400), 'the same day');
  assert.ok(Careers.rewardAdDouble(c, 51, 400), 'the next day');
});

test('a lost Daily gets one second try a day for an ad, without counting the streak twice', () => {
  const c = newCareer();
  Careers.startDaily(c, 100, baseConfig);
  Careers.startDaily(c, 101, baseConfig);
  assert.equal(c.dailyStreak, 2);
  assert.ok(!Careers.isDailyOpen(c, 101), 'played: closed');
  assert.ok(Careers.adRetryOpen(c, 101), 'played and not cleared: an ad can open it again');
  assert.ok(Careers.rewardAdRetry(c, 101));
  assert.ok(Careers.isDailyOpen(c, 101), 'the second try is open');
  assert.ok(!Careers.adRetryOpen(c, 101), 'but only once a day');
  Careers.startDaily(c, 101, baseConfig);
  assert.equal(c.dailyStreak, 2, 'the streak counted at the first try');
  assert.ok(!Careers.isDailyOpen(c, 101), 'closed again once it is played');
  assert.ok(!Careers.rewardAdRetry(c, 101), 'no third try');
  assert.ok(Careers.completeDaily(c, 101, baseConfig) > 0, 'the second try pays when cleared');
  assert.ok(!Careers.adRetryOpen(c, 101), 'a cleared Daily needs no retry');
  Careers.startDaily(c, 102, baseConfig);
  assert.ok(Careers.adRetryOpen(c, 102), 'the next day has its own');
});

test('a second try goes to the Daily board with its score, one try says nothing', () => {
  const r = { level: 5, prestige: 0, unlimitedBest: 0, unlimitedCars: 0, dailyDay: 20000, dailyScore: 3000, dailyTries: 2, rushBest: 0, casinoProfit: null, title: null };
  const daily = dueBoards(r).find(([board]) => board === 'daily');
  assert.deepEqual(daily[1], { score: 3000, day: 20000, tries: 2 });
  assert.deepEqual(dueBoards({ ...r, dailyTries: 1 }).find(([board]) => board === 'daily')[1], { score: 3000, day: 20000 });
});

test('with no ad ready (no network, a blocker, no AdSense yet) the ad offers are not shown at all', () => {
  const c = newCareer();
  c.level = 12;
  const none = { offers: true, ready: false };
  const some = { offers: true, ready: true };
  const watching = (d) => d.actions.some((a) => a.action.k === 'watchAd' || a.action.k === 'watchAdUpgrade');
  assert.ok(!watching(Details.chest('standard', c, baseConfig, 50, none)), 'no free chest button');
  assert.ok(watching(Details.chest('standard', c, baseConfig, 50, some)), 'with an ad ready it is there');
  assert.ok(!Details.chest('standard', c, baseConfig, 50, none).notes.some((n) => n.text === S.ads.unavailable), 'and no "no ad" note either');
  const pick = Careers.adUpgradeOffer(c, 50, baseConfig);
  assert.ok(pick, 'a free step is on offer today');
  assert.ok(!watching(Details.upgrade(pick, c, baseConfig, 50, none)), 'no free step button');
  assert.ok(watching(Details.upgrade(pick, c, baseConfig, 50, some)));
});

test('a save keeps the days the streak ads were used, old saves start with none', () => {
  const c = newCareer();
  c.adRescueDay = 12;
  c.adFreezeDay = 13;
  c.adDoubleDay = 14;
  fakeStorage({ 'carGame.save.v2': JSON.stringify({ career: c }) });
  const back = loadSave().career;
  assert.deepEqual([back.adRescueDay, back.adFreezeDay, back.adDoubleDay], [12, 13, 14]);
  fakeStorage({ 'carGame.save.v2': JSON.stringify({ career: { level: 3 } }) });
  assert.deepEqual([loadSave().career.adRescueDay, loadSave().career.adDoubleDay], [-1, -1]);
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

test('chest taps tilt the odds a little: strong taps count, Common pays, pity and no-tap draws stay as they were', async () => {
  const { tappedOdds, tapPower, strongTaps, CHEST_ODDS } = await load('/src/core/loot.ts');
  assert.deepEqual(strongTaps([0, 0.4, 1.2, 1.6], 0.5), [true, true, false, true]);
  assert.equal(tapPower([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7], 8, 0.5), 1);
  assert.equal(tapPower([0, 2, 4, 6, 8, 10, 12, 14], 8, 0.5), 1 / 8);
  for (const kind of ['standard', 'premium', 'event', 'criminalHunt']) {
    assert.deepEqual(tappedOdds(kind, 0, baseConfig.chestTapBoost), CHEST_ODDS[kind].map((p, i) => (i === 0 ? 1 - CHEST_ODDS[kind].slice(1).reduce((a, b) => a + b, 0) : p)));
    const full = tappedOdds(kind, 1, baseConfig.chestTapBoost);
    assert.ok(Math.abs(full.reduce((a, b) => a + b, 0) - 1) < 1e-12);
    for (let i = 1; i < 4; i++) assert.ok(Math.abs(full[i] / CHEST_ODDS[kind][i] - (1 + baseConfig.chestTapBoost)) < 1e-12);
    assert.ok(full[0] < CHEST_ODDS[kind][0] && full[0] > 0);
  }
  const better = (odds) => {
    let rare = 0;
    for (let seed = 0; seed < 40000; seed++) if (rollChest('standard', [], 0, seed, 100, 0, odds).rarity !== 'common') rare++;
    return rare;
  };
  assert.ok(better(tappedOdds('standard', 1, baseConfig.chestTapBoost)) > better(tappedOdds('standard', 0, baseConfig.chestTapBoost)));
  for (let seed = 0; seed < 500; seed++) {
    assert.equal(rollChest('standard', [], 0, seed, 100, PITY_LEGENDARY_CHESTS - 1, tappedOdds('standard', 1, 0.1)).item.rarity, 'legendary');
    const a = newCareer();
    a.chests.push('standard');
    const b = newCareer();
    b.chests.push('standard');
    assert.equal(Careers.openChest(a, 0, seed, 100, 1).item.id, Careers.openChest(b, 0, seed, 100, 1).item.id, 'same seed and power, same prize');
  }
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
  book(lostAt(level, 5));
  assert.equal(career.tailwind, false, 'too far from the goal');
  book(lostAt(level, 2, { carsSent: 1 }));
  assert.equal(career.tailwind, false, 'a crash at the very start earns nothing');
  book(lostAt(level, 2), { daily: true });
  assert.equal(career.tailwind, false, 'never over the Daily Shift');
  book(lostAt(level, 2));
  assert.equal(career.tailwind, true, 'the pill on the waiting screen says it, not a line of news');
  assert.ok(Goals.tailwindOn(career, 'shift', false) && !Goals.tailwindOn(career, 'shift', true) && !Goals.tailwindOn(career, 'unlimited', false));
  book(lostAt(level, 1));
  assert.equal(career.tailwind, false, 'the shift that used it earns none, and it is used up');
  book(lostAt(level, 1));
  assert.equal(career.tailwind, false, 'once a day');
  book(lostAt(level, 1), { today: 20001 });
  assert.equal(career.tailwind, true, 'the next day again');
});

test('Tailwind and the streak add up on the pay of a shift', () => {
  const both = Goals.forPay(baseConfig, baseConfig.streakBonusPay + baseConfig.tailwindPay);
  assert.equal(both.shiftPay, Math.round(baseConfig.shiftPay * 1.4));
  assert.equal(Goals.forStreak(baseConfig).shiftPay, Math.round(baseConfig.shiftPay * 1.15));
  const c = newCareer();
  assert.equal(Goals.daysToFreeze(c, baseConfig), baseConfig.streakFreezeFirst);
  c.dailyStreak = 2;
  assert.equal(Goals.daysToFreeze(c, baseConfig), 1);
  c.dailyStreak = 4;
  assert.equal(Goals.daysToFreeze(c, baseConfig), 3);
  c.streakFreezes = baseConfig.streakFreezeMax;
  assert.equal(Goals.daysToFreeze(c, baseConfig), null);
  assert.ok(S.daily.rowLine(4, false, { days: 7, left: 3, prize: { k: 'item', id: 'streakBronze' } }, 0, 3).includes(S.shop.item('streakBronze')), 'the skin is as near as the Freeze: the skin shows');
  assert.ok(S.daily.rowLine(4, false, { days: 7, left: 10, prize: { k: 'item', id: 'streakBronze' } }, 0, 3).includes(S.daily.freezeLine(3)), 'the Freeze is nearer');
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
  assert.equal(S.mods.tailwind(0.25), 'Tailwind +25 %');
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

test('Heat is always the highest step the living Daily streak opens, one per 7 days, and a lost streak takes it away', () => {
  const day = 20000;
  const c = newCareer();
  assert.equal(Careers.maxHeat(c, day, baseConfig), 0, 'no streak, no Heat');
  c.dailyPlayed = day;
  c.dailyStreak = 6;
  assert.equal(Careers.maxHeat(c, day, baseConfig), 0);
  c.dailyStreak = 7;
  assert.equal(Careers.maxHeat(c, day, baseConfig), 1);
  c.dailyStreak = 99;
  assert.equal(Careers.maxHeat(c, day, baseConfig), baseConfig.maxHeat, 'capped');
  c.dailyStreak = 21;
  assert.equal(Careers.maxHeat(c, day, baseConfig), 3);
  assert.equal(Careers.maxHeat(c, day + 1, baseConfig), 3, 'the Daily of today is still open: the streak lives');
  assert.equal(Careers.maxHeat(c, day + 2, baseConfig), 0, 'a missed day without a Freeze: the Heat is gone');
  assert.equal(S.heat.button(3), 'Heat +30 %', 'the pill shows the pay it adds');
  assert.ok(Careers.recordHeat(c, 1, baseConfig));
  assert.ok(!Careers.recordHeat(c, 1, baseConfig), 'new only once');
});

test('giving to the Game fund earns titles by the total given', async () => {
  const { Elite } = await load('/src/core/elite.ts');
  const c = newCareer();
  const got = () => Elite.titles(c, baseConfig).filter((t) => ['patron', 'benefactor', 'philanthropist', 'visionary'].includes(t));
  assert.deepEqual(got(), []);
  c.fundGiven = 100_000;
  assert.deepEqual(got(), ['patron']);
  c.fundGiven = 12_000_000;
  assert.deepEqual(got(), ['patron', 'benefactor', 'philanthropist']);
  assert.equal(S.titles.name('patron'), 'Patron');
});

test('a shift cleared on Heat opens the next one and pays Elite XP; the Daily and a loss do not', () => {
  const save = newSave();
  save.career.level = baseConfig.prestigeLevel;
  const heated = (heat, over = {}) => context(baseConfig.prestigeLevel, { shiftConfig: forHeat(forLevel(baseConfig, 3, 1), heat), ...over });
  const won = completed(3, { perfects: 0, tightFits: 0 });
  assert.ok(bookShift(save, { ...won, outcome: 'struckOut' }, heated(1)).news.every((n) => !n.startsWith('HEAT')), 'a loss clears nothing');
  assert.equal(save.career.heatCleared, 0);
  const before = save.career.eliteXp;
  assert.ok(bookShift(save, won, heated(1)).news.includes(S.heat.cleared(1)));
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
  save.career.heatCleared = 4;
  save.dailyDay = 20000;
  save.dailyScore = 4321;
  fakeStorage({ 'carGame.save.v2': JSON.stringify(save) });
  const back = loadSave();
  assert.deepEqual([back.career.heatCleared, back.dailyDay, back.dailyScore], [4, 20000, 4321]);
  fakeStorage({ 'carGame.save.v2': JSON.stringify({ career: { level: 3 } }) });
  const old = loadSave();
  assert.deepEqual([old.career.heatCleared, old.dailyDay, old.dailyScore], [0, -1, 0]);
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
  assert.deepEqual(dueBoards({ ...records, casinoProfit: 5000 }).find(([board]) => board === 'casino').slice(0, 2), ['casino', { profit: 5000 }]);
  assert.deepEqual(dueBoards({ ...records, casinoProfit: -200 }).find(([board]) => board === 'casino').slice(0, 2), ['casino', { profit: -200 }], 'a loss is sent too (15.10.2026)');
  assert.ok(!dueBoards({ ...records, casinoProfit: null }).some(([board]) => board === 'casino'), 'nothing before the Casino is reached');
});

test('the casino counts its profit and pays its own skins for its big moments', () => {
  const c = newCareer();
  Casino.book(c, 1, -100);
  assert.equal(c.casinoProfit, -100);
  Casino.book(c, 2, 400);
  assert.equal(c.casinoProfit, 300, 'the profit runs across days, unlike the day balance');
  Casino.log(c, { game: 'slots', stake: 100, win: 300, x: 3, day: 1 });
  assert.ok(!Careers.owns(c, 'luckyStrike'), 'a small win is not a BIG WIN');
  Casino.log(c, { game: 'slots', stake: 100, win: 1000, x: 10, day: 1 });
  assert.ok(Careers.owns(c, 'luckyStrike') && !Careers.owns(c, 'megaWin'), 'the first BIG WIN');
  Casino.log(c, { game: 'upgrade', stake: 100, win: 100_000, x: 0.5, day: 1, item: 'gold' });
  assert.ok(!Careers.owns(c, 'megaWin'), 'the Skin Upgrade pays no casino skin');
  Casino.log(c, { game: 'crash', stake: 10_000, win: 1_500_000, x: 150, day: 1 });
  assert.ok(Careers.owns(c, 'megaWin'), 'the first MEGA WIN');
  assert.ok(!Careers.owns(c, 'tycoon'));
  Casino.book(c, 1, baseConfig.casinoTycoon);
  Casino.log(c, { game: 'scratch', stake: 100, win: 200, x: 2, day: 1 });
  assert.ok(Careers.owns(c, 'tycoon'), 'a fortune won');
  Casino.honours(c, 0, baseConfig.casinoFlipChain - 1);
  assert.ok(!Careers.owns(c, 'doubleDown'));
  Casino.honours(c, 0, baseConfig.casinoFlipChain);
  assert.ok(Careers.owns(c, 'doubleDown'), 'five coins in a row');
  assert.ok(baseConfig.casinoFlipChain <= baseConfig.doubleMaxChain, 'the coin streak can be reached');
});


// MARK: Seasons, tours, achievements (07.10.2026)

const dayOf = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / 86400000);

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

test('a challenge link carries the season, and an older link still reads', () => {
  const career = newCareer();
  career.level = 12;
  const spec = challengeOf(career, 'shift', 12, 4242, 'concert', 5000, null, 'autumn');
  const code = encodeChallenge(spec);
  const back = decodeChallenge(code);
  assert.equal(back.season, 'autumn');
  const packed = JSON.parse(Buffer.from(code.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')).slice(0, 13);
  const legacy = Buffer.from(JSON.stringify(packed)).toString('base64').replace(/[+]/g, '-').replace(/[/]/g, '_').replace(/=+$/, '');
  const old = decodeChallenge(legacy);
  assert.ok(old, 'a link from before still decodes');
  assert.equal(old.season, null);
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
  fakeStorage();
  writeSave(keep);
  const back = loadSave();
  assert.deepEqual(back.career.stats, { wrecks: 12 });
  assert.deepEqual(back.career.achievements, ['scrapyard.1']);
  assert.deepEqual(back.career.toursDone, ['halloween-2026.3']);
  assert.ok(STAT_KEYS.includes('wrecks'));
});

test('the Daily Shift replays the same', () => {
  const career = newCareer();
  career.level = 25;
  const make = () => Careers.shiftConfig(career, 'shift', forSeason(baseConfig, 'winter'), 555, 'vipConvoy', null);
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

test('the Shield upgrade has two dear steps, Backup three, forgives crashes for challenges too, and not in Unlimited', async () => {
  const { challengeConfig } = await load('/src/core/challenge.ts');
  const { upgradePrice } = await load('/src/core/levels.ts');
  assert.equal(upgradeMaxSteps.shield, 2);
  assert.equal(upgradeMaxSteps.backup, 3);
  const prices = [1, 2].map((step) => upgradePrice('shield', step, baseConfig));
  assert.deepEqual(prices, [20000, 200000]);
  const backup = [1, 2, 3].map((step) => upgradePrice('backup', step, baseConfig));
  assert.ok(backup[0] >= 20000 && backup.every((p, i) => i === 0 || p > backup[i - 1]), 'backup is dear and climbs');
  const at = (level, steps) => {
    const c = newCareer();
    c.level = level;
    if (steps) c.upgrades.shield = steps;
    return c;
  };
  assert.equal(Careers.shiftConfig(at(4, 0), 'shift', baseConfig, 7).maxStrikes, 1, 'no free shield');
  assert.equal(Careers.shiftConfig(at(4, 1), 'shift', baseConfig, 7).maxStrikes, 2);
  assert.equal(Careers.shiftConfig(at(30, 2), 'shift', baseConfig, 7).maxStrikes, 3);
  assert.equal(Careers.shiftConfig(at(30, 2), 'unlimited', baseConfig, 7).maxStrikes, 1);
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

test('Build trials play on your upgrades minus a group; the other trials ignore them', () => {
  const owned = { backup: 3, morePatrols: 5, shield: 2, overtime: 4 };
  const cfg = (id) => trialConfig(trialById(id), baseConfig, owned);
  assert.equal(cfg('noPolice').maxPoliceCrashes, baseConfig.maxPoliceCrashes, 'no Backup');
  assert.equal(cfg('noPolice').maxStrikes, 3, 'the Shield stays');
  assert.equal(cfg('noDriving').maxStrikes, 1, 'no Shield');
  assert.equal(cfg('noDriving').maxPoliceCrashes, baseConfig.maxPoliceCrashes + 3, 'Backup stays');
  assert.equal(cfg('bareBuild').maxStrikes, 1);
  assert.equal(cfg('bareBuild').maxPoliceCrashes, baseConfig.maxPoliceCrashes);
  assert.ok(cfg('bareBuild').shiftPay > trialConfig(trialById('bareBuild'), baseConfig).shiftPay, 'Money upgrades stay in a Build trial');
  assert.equal(cfg('deadCentre').maxStrikes, 1, 'a plain trial ignores the build');
  assert.ok(RUN_IDS.includes('noPolice') && RUN_IDS.includes('bareBuild'), 'a save keeps them');
});

test('every level from 30 to 120 brings one more trial, in turn of nine shapes', () => {
  assert.equal(LEVEL_TRIALS.length, LEVEL_TRIAL_LAST - LEVEL_TRIAL_FIRST + 1);
  assert.equal(new Set(LEVEL_TRIALS.map((t) => t.id)).size, LEVEL_TRIALS.length);
  assert.equal(new Set(LEVEL_TRIALS.map((t) => t.seed)).size, LEVEL_TRIALS.length, 'each its own traffic');
  for (const t of LEVEL_TRIALS) {
    assert.equal(trialById(t.id).seed, t.seed, 'found by id');
    assert.ok(isRunId(t.id), 'a save keeps it');
    assert.ok(trialConfig(t, baseConfig, {}).shiftCars === t.cars);
  }
  assert.ok(!isRunId('level.29') && !isRunId('level.121'));
  assert.equal(new Set(LEVEL_TRIALS.slice(0, LEVEL_KINDS.length).map((t) => `${t.goal.k}${t.rule}${t.weather}${t.darkness}${t.legendary}${t.strip}`)).size, LEVEL_KINDS.length, 'a shape each');
  assert.ok(LEVEL_TRIALS.at(-1).reward > LEVEL_TRIALS[0].reward, 'the reward grows');
  const career = newCareer();
  career.level = 31;
  assert.deepEqual(levelTrialsWaiting(career).map((t) => t.level), [30, 31]);
  career.trialsDone.push('level.30');
  assert.deepEqual(levelTrialsWaiting(career).map((t) => t.level), [31]);
  career.level = 10;
  assert.equal(trialOpen(LEVEL_TRIALS[5], career), false);
});

test('the precision upgrades: close merges pay a tip, a chain in the flow is left alone, bad weather bites less, none of it in Unlimited', async () => {
  const { forWeather } = await load('/src/core/levels.ts');
  const gear = { tightFitTip: 6, dashcam: 6, chainSaver: 3, winterTyres: 5, fogLamps: 5 };
  const at = (steps) => {
    const c = newCareer();
    c.level = 20;
    Object.assign(c.upgrades, steps);
    return c;
  };
  const plain = Careers.shiftConfig(at({}), 'shift', baseConfig, 5);
  assert.deepEqual([plain.tightFitTip, plain.nearMissTip, plain.chainSaves, plain.tyreAid, plain.lampAid], [0, 0, 0, 0, 0], 'nothing is free');
  const geared = Careers.shiftConfig(at(gear), 'shift', baseConfig, 5);
  assert.ok(geared.tightFitTip > geared.nearMissTip && geared.nearMissTip > 0, 'the closer merge pays more');
  assert.equal(geared.chainSaves, 3);
  assert.ok(Math.abs(geared.tyreAid - 5 * baseConfig.winterTyresPerStep) < 1e-9);
  const unlimited = Careers.shiftConfig(at(gear), 'unlimited', baseConfig, 5);
  assert.deepEqual([unlimited.tightFitTip, unlimited.nearMissTip, unlimited.chainSaves], [0, 0, 0], 'a run the board compares has no tips');
  assert.equal(Careers.availableUpgrades({ ...newCareer(), level: baseConfig.lightRainLevel - 1 }).includes('winterTyres'), false, 'no weather upgrades before the first rain');
  assert.equal(Careers.availableUpgrades({ ...newCareer(), level: baseConfig.lightRainLevel }).includes('fogLamps'), true);

  const kitted = upgraded(baseConfig, (u) => gear[u] ?? 0);
  for (const weather of ['lightRain', 'storm', 'snow', 'hail', 'sandstorm', 'fog']) {
    const bare = forWeather(baseConfig, weather);
    const eased = forWeather(kitted, weather);
    assert.ok(eased.tireGripBrake >= bare.tireGripBrake && eased.tireGripSide >= bare.tireGripSide, `${weather}: more grip`);
    assert.ok(eased.driverBrake >= bare.driverBrake, `${weather}: better braking`);
    assert.ok(eased.driverReaction.lo <= bare.driverReaction.lo && eased.driverReaction.hi <= bare.driverReaction.hi, `${weather}: quicker eyes`);
    assert.ok(eased.driverReaction.lo >= baseConfig.driverReaction.lo, `${weather}: never better than a clear day`);
  }
  assert.ok(forWeather(kitted, 'snow').tireGripBrake > forWeather(baseConfig, 'snow').tireGripBrake, 'the tyres bite on ice');
  assert.deepEqual(forWeather(kitted, 'clear').driverReaction, baseConfig.driverReaction, 'a clear day is the same');

  // A tip lands in the pay of the shift, for exactly the merges it names.
  const run = (tightFitTip) => playConfig({ ...forLevel(baseConfig, 5, 9), tightFitTip }, 9, careful);
  const free = run(0);
  const tipped = run(7);
  const tights = tipped.seen.filter((e) => e.type === 'merged' && e.rating === 'tightFit');
  assert.ok(tights.length > 0, 'the careful bot slips in tight now and then');
  assert.ok(tights.every((e) => e.tip === 7));
  assert.equal(tipped.result.money - free.result.money, 7 * tights.length);

  // The Chain Saver: only in the flow, only a plain merge, only as many as the steps say.
  const world = new World({ ...baseConfig, chainSaves: 2 }, 3, { startsOnFirstTap: false });
  assert.equal(world.savesChain('clean'), false, 'no flow, nothing to save');
  world.setChain(baseConfig.flowChain + 1, 0);
  assert.equal(world.savesChain('cutOff'), false, 'a cut-off still ends the chain');
  assert.equal(world.savesChain('perfect'), false, 'a good merge needs no saving');
  assert.equal(world.savesChain('clean'), true);
  assert.equal(world.savesChain('clean'), true);
  assert.equal(world.savesChain('clean'), false, 'two saves a shift');
});

test('two losses on a level ease the next shift to its fewest cars, until the level is cleared', async () => {
  const { shiftCarsRange } = await load('/src/core/levels.ts');
  const c = newCareer();
  c.mastery.shiftsCompleted = 1;
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

test('quiet help: a career without a won shift gets a spare crash and eases after one loss, then step by step', async () => {
  const { forEase } = await load('/src/core/levels.ts');
  const c = newCareer();
  const first = Careers.careerShift(c, baseConfig, 3);
  assert.equal(first.maxStrikes, baseConfig.maxStrikes + 1);
  assert.equal(first.assisted, true);
  Careers.noteShift(c, false);
  const one = Careers.careerShift(c, baseConfig, 3);
  Careers.noteShift(c, false);
  const two = Careers.careerShift(c, baseConfig, 3);
  assert.ok(two.tempoEnd < one.tempoEnd && two.aiSpawnDelay.lo > one.aiSpawnDelay.lo && two.densityEnd <= one.densityEnd, 'every further loss takes more traffic out');
  assert.equal(forEase(baseConfig, 99).tempoEnd, forEase(baseConfig, baseConfig.easeMaxSteps).tempoEnd, 'capped');
  assert.equal(forEase(baseConfig, 0), baseConfig);
  c.mastery.shiftsCompleted = 1;
  Careers.noteShift(c, true);
  assert.equal(Careers.careerShift(c, baseConfig, 3).maxStrikes, baseConfig.maxStrikes, 'a won shift ends the spare crash');
  assert.equal(Careers.shiftConfig(newCareer(), 'shift', baseConfig, 3).maxStrikes, baseConfig.maxStrikes, 'the Daily and challenges never get it');
});

test('a player who often stops after a loss gets the quiet help one loss sooner, never before the first', () => {
  const c = newCareer();
  c.mastery.shiftsCompleted = 1;
  c.level = 9;
  c.museumSeen = ['weather.lightRain', 'dark.night'];
  Careers.noteShift(c, false);
  assert.ok([1, 2, 3, 4, 5].every((seed) => !Careers.careerShift(c, baseConfig, seed).assisted), 'one loss: no help yet');
  Careers.noteLeave(c, true);
  assert.equal(Careers.quitsOnLoss(c), false, 'one leave is no habit');
  Careers.noteLeave(c, true);
  assert.equal(Careers.quitsOnLoss(c), true);
  assert.ok([1, 2, 3, 4, 5].every((seed) => Careers.careerShift(c, baseConfig, seed).assisted), 'one loss is enough now');
  Careers.noteShift(c, true);
  assert.ok([1, 2, 3, 4, 5].every((seed) => !Careers.careerShift(c, baseConfig, seed).assisted), 'never before the first loss');
  for (let i = 0; i < 4; i++) Careers.noteLeave(c, false);
  assert.equal(Careers.quitsOnLoss(c), false, 'stopping after wins wears the lean off');
  assert.ok(c.quitLean >= 0 && c.quitLean <= 1);
});

test('the first bad weather and the first night come for sure, and such a shift is marked as eased', () => {
  const c = newCareer();
  c.mastery.shiftsCompleted = 1;
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
  // The Daily Shift opens at level 3: still in the first session, after the first steps.
  const early = newCareer();
  early.level = 2;
  assert.equal(Unlocks.isOpen(early, 'daily'), false);
  early.level = 3;
  assert.equal(Unlocks.isOpen(early, 'daily'), true);
});

test('the tension camera keeps the stop line in place, and settles still, and stays out of Reduce Motion', async () => {
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
  fx.nod();
  fx.update(0.8, CameraFxTuning.nodRise);
  const nodded = fx.apply(cam, stop, false);
  assert.ok(Math.abs(nodded.scale / leaned.scale - 1 - CameraFxTuning.nodZoom) < 1e-9, 'a Perfect nods at full size after its rise');
  assert.equal(fx.apply(cam, stop, true), cam, 'Reduce Motion: no nod');
  assert.ok(fx.pulse(true) > 0 && fx.pulse(false) === 0, 'Reduce Motion pulses the vignette instead');
  fx.update(0.8, CameraFxTuning.nodFall);
  assert.deepEqual(fx.apply(cam, stop, false), leaned, 'and the nod is gone again');
  assert.deepEqual(fx.breathOffset(false), { x: 0, y: 0 }, 'no sway during a shift');
  for (let i = 0; i < 600; i++) fx.update(0, 1 / 60, true);
  const sway = fx.breathOffset(false);
  assert.ok(Math.hypot(sway.x, sway.y) > 0 && Math.abs(sway.x) <= CameraFxTuning.breathX && Math.abs(sway.y) <= CameraFxTuning.breathY, 'idle: a few points of sway');
  assert.deepEqual(fx.breathOffset(true), { x: 0, y: 0 }, 'Reduce Motion: no sway');
  const world = new World(forLevel(baseConfig, 3, 11), 11, { startsOnFirstTap: false });
  world.shift.outcome = 'completed';
  assert.equal(tensionOf(world, 'shift'), 0, 'nothing is at stake once the shift is over');
});

test('notifications: the game asks only for what matters, at sensible hours on its own clock', () => {
  const at = (d, h, m = 0) => new Date(2026, 9, d, h, m).getTime();
  const morning = new Date(2026, 9, 8, 10);
  const today = dayNumber(morning);
  assert.deepEqual(pushTimers(newCareer(), baseConfig, morning), [], 'a new career: nothing to remind');

  const career = newCareer();
  Object.assign(career, { dailyStreak: 3, dailyPlayed: today });
  const [played] = pushTimers(career, baseConfig, morning);
  assert.deepEqual([played.topic, played.at, played.until, played.title], ['streak', at(9, 18), at(9, 23, 59), 'Your 3-day streak'], "today's Daily done: tomorrow evening");
  career.dailyPlayed = today - 1;
  assert.equal(pushTimers(career, baseConfig, morning)[0].at, at(8, 18), 'still open today: this evening');
  assert.deepEqual(pushTimers(career, baseConfig, new Date(2026, 9, 8, 19)), [], 'past the evening the game is open anyway');
  career.dailyStreak = 1;
  assert.deepEqual(pushTimers(career, baseConfig, morning), [], 'one day is not a streak yet');

  const gift = newCareer();
  gift.giftDay = today + 1;
  assert.deepEqual(pushTimers(gift, baseConfig, morning).map((t) => [t.topic, t.at]), [['gift', at(9, 10)]]);

  const veteran = newCareer();
  veteran.level = baseConfig.seasonPassLevel;
  const [pass] = pushTimers(veteran, baseConfig, morning);
  assert.deepEqual([pass.topic, pass.at, pass.title], ['pass', new Date(2026, 11, 1, 10).getTime(), 'Winter is here']);
  assert.deepEqual(pushTimers(veteran, baseConfig, new Date(2026, 8, 1, 10)), [], 'a season more than 59 days away waits');
});

test('a shift allows 3 dispatches, and each Dispatch Radio step adds one', () => {
  assert.equal(baseConfig.dispatchLimit, 3);
  assert.equal(upgraded(baseConfig, (u) => (u === 'dispatchRadio' ? 2 : 0)).dispatchLimit, 5);
  const world = new World(forLevel(baseConfig, 3, 5), 5, { startsOnFirstTap: false });
  assert.equal(world.dispatchesLeft, 3);
  assert.ok(world.dispatchPolice());
  assert.equal(world.dispatchesLeft, 2);
  assert.ok(!world.dispatchPolice(), 'the car at the front is a police car already');
  assert.equal(world.dispatchesLeft, 2, 'a refused call costs nothing');
  const spent = new World({ ...forLevel(baseConfig, 3, 5), dispatchLimit: 0 }, 5, { startsOnFirstTap: false });
  assert.ok(!spent.dispatchPolice());
});

test('bug hunter skins: one per report, up to six, each with its own look', async () => {
  const { Skins } = await load('/src/present/skins.ts');
  const hunters = COSMETICS.filter((x) => x.source.kind === 'bugReport');
  assert.deepEqual(hunters.map((x) => x.source.reports), [1, 2, 3, 4, 5, 6]);
  for (const item of hunters) {
    assert.ok(Skins.color(item.id) && Skins.effect(item.id), `${item.id} has a colour and a look of its own`);
    assert.ok(S.shop.item(item.id) !== item.id, `${item.id} has a name`);
  }
});

// MARK: Car models

/** Whether the point lies inside the polygon (even-odd). */
const inside = (poly, p) => {
  let in_ = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) in_ = !in_;
  }
  return in_;
};

/** How far the point is from the polygon's edge. */
const edgeDistance = (poly, p) => {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j];
    const b = poly[i];
    const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / len2));
    best = Math.min(best, Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y))));
  }
  return best;
};

test('every car model sits inside the car and hugs its hitbox: no ghost collisions', () => {
  const { carLength: L, carWidth: W } = baseConfig;
  const reach = L / 2 - W / 2;
  const beyondCapsule = (p) => Math.hypot(p.x - Math.max(-reach, Math.min(reach, p.x)), p.y) - W / 2;
  for (const model of CAR_MODELS) {
    const outline = CarModels.outline(model, L, W);
    for (const p of outline) {
      assert.ok(Math.abs(p.x) <= L / 2 + 1e-9 && Math.abs(p.y) <= W / 2 + 1e-9, `${model} stays inside the car's footprint`);
      assert.ok(beyondCapsule(p) <= 1.2, `${model} is ${beyondCapsule(p).toFixed(2)} outside the hitbox at ${p.x.toFixed(1)}, ${p.y.toFixed(1)}`);
    }
    // And the hitbox is covered: every point of its rim is in the body or close to it.
    for (let k = 0; k < 72; k++) {
      const a = (k / 72) * Math.PI * 2;
      const centre = Math.cos(a) >= 0 ? reach : -reach;
      const rim = { x: centre + (W / 2) * Math.cos(a), y: (W / 2) * Math.sin(a) };
      assert.ok(inside(outline, rim) || edgeDistance(outline, rim) <= 1.6, `${model} leaves the hitbox bare at ${rim.x.toFixed(1)}, ${rim.y.toFixed(1)}`);
    }
  }
});

test('the parts and lamps of every car model sit on its body', () => {
  const { carLength: L, carWidth: W } = baseConfig;
  const corners = (c, sx, sy) => [-1, 1].flatMap((x) => [-1, 1].map((y) => ({ x: c.x + (x * sx) / 2, y: c.y + (y * sy) / 2 })));
  const ring = (c, r) => Array.from({ length: 8 }, (_, k) => ({ x: c.x + r * Math.cos((k * Math.PI) / 4), y: c.y + r * Math.sin((k * Math.PI) / 4) }));
  for (const model of CAR_MODELS) {
    const outline = CarModels.outline(model, L, W);
    const on = (p, what) => assert.ok(inside(outline, p), `${model}: ${what} pokes out at ${p.x.toFixed(1)}, ${p.y.toFixed(1)}`);
    for (const part of ['frontBumper', 'rearBumper', 'windscreen', ...(CarModels.hasRoof(model) ? ['rearWindow'] : [])]) {
      const s = CarArt.shape(part, 'car', baseConfig, model);
      for (const p of corners(s.center, s.size.x, s.size.y)) on(p, part);
    }
    const lamps = CarModels.lamps(model, L, W);
    for (const lamp of [lamps.head, lamps.tail]) {
      for (const side of [1, -1]) {
        const c = { x: lamp.x, y: side * lamp.y };
        for (const p of lamp.round ? ring(c, lamp.h / 2) : corners(c, lamp.w, lamp.h)) on(p, lamp === lamps.head ? 'head lamp' : 'tail lamp');
      }
    }
    // The stripes run nose to tail on the body.
    for (const x of [-(L / 2 - 2), L / 2 - 2]) for (const y of [-1.6, 1.6]) on({ x, y }, 'stripe');
  }
});

test('skins with a body of their own: the bug hunters are Beetles and nobody else is', () => {
  const skins = COSMETICS.filter((x) => x.kind === 'carSkin');
  const hunters = skins.filter((x) => x.source.kind === 'bugReport');
  assert.equal(hunters.length, 6);
  for (const item of hunters) assert.equal(Skins.model(item.id), 'beetle', `${item.id} is a Beetle`);
  for (const item of skins.filter((x) => x.source.kind !== 'bugReport')) assert.notEqual(Skins.model(item.id), 'beetle', `${item.id} is not a Beetle`);
  for (const model of CAR_MODELS) {
    const wearing = skins.filter((x) => Skins.model(x.id) === model);
    assert.ok(wearing.length >= 5, `${model} has skins to wear it`);
  }
  assert.equal(Skins.model('midnight'), null);
  assert.equal(Skins.model(null), null);
});

test('the Elite track pays beyond 100: skins and titles up to Elite 200', () => {
  assert.equal(ELITE_LAST_MILESTONE, 200);
  const milestones = Elite.milestones();
  assert.equal(milestones.at(-1), 200);
  for (const level of [110, 125, 150, 175, 200]) assert.ok(milestones.includes(level), `Elite ${level} pays something`);
  const career = newCareer();
  Object.assign(career, { level: 50, eliteXp: Elite.xpTo(200), eliteClaimed: 0 });
  Careers.recordElite(career, { outcome: 'completed', perfects: 0, tightFits: 0, bossBusted: false, legendary: false }, baseConfig);
  assert.equal(Elite.level(career), 200);
  for (const id of ['monolith', 'apotheosis']) assert.ok(career.collection.includes(id), `${id} came with the levels`);
  for (const title of ['sovereign', 'boundless']) assert.ok(Elite.titleEarned(title, career), `${title} is earned`);
  assert.ok(TITLES.every((t) => TITLE_RULES[t]));
});

test('a criminal gets into a ring whose toll booth slows the traffic at the entrance', () => {
  let entered = 0;
  for (const seed of [1, 2, 3, 4]) {
    const config = forLevel(baseConfig, 10, seed * 31);
    config.criminalChance = 1;
    config.modules[2] = 'tollBooth';
    config.moduleLevels[2] = 1;
    const world = new World(config, seed * 31, { startsOnFirstTap: false });
    let lastTap = -9;
    let warned = false;
    let came = false;
    for (let i = 0; i < 120 * 90 && !came; i++) {
      if (world.time - lastTap > 1.6 && world.queue.isReady && world.predictedMergeGap(world.layout.player, 0, 40) > 0.04) {
        world.tap(world.time);
        lastTap = world.time;
      }
      world.step();
      for (const e of world.takeEvents()) {
        if (e.type === 'criminalWarning') warned = true;
        if (e.type === 'criminalEntered') came = true;
      }
    }
    if (warned && came) entered++;
  }
  assert.ok(entered >= 3, `the criminal came in ${entered} of 4 shifts`);
});

test('nobody crashes on a two-lane ring when the player sends nothing', () => {
  for (const seed of [1, 2, 3]) {
    const config = forLevel(baseConfig, 85, seed * 17);
    config.criminalChance = 0;
    const world = new World(config, seed * 17, { startsOnFirstTap: false });
    let crashes = 0;
    for (let i = 0; i < 120 * 80; i++) {
      world.step();
      crashes += world.takeEvents().filter((e) => e.type === 'crash').length;
    }
    assert.equal(crashes, 0, `seed ${seed}: the traffic drove into each other ${crashes} times`);
  }
});

test('the Diamond Chest is for sale, never holds a Common, and its tapped odds stay whole', () => {
  assert.ok(CHEST_KINDS.includes('diamond') && isForSale('diamond'));
  assert.equal(chestPrice('diamond', baseConfig), baseConfig.diamondChestPrice);
  assert.equal(chestPrice('event', baseConfig), null);
  assert.ok(Math.abs(ODDS.diamond.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  assert.equal(ODDS.diamond[0], 0);
  for (const power of [0, 0.5, 1]) {
    const odds = tapped('diamond', power, baseConfig.chestTapBoost);
    assert.equal(odds[0], 0, 'tapping never makes a Common appear');
    assert.ok(odds[3] <= 0.15, 'Legendary stays at 15 % or less, tapped or not');
    assert.ok(odds.every((p) => p >= 0));
    assert.ok(Math.abs(odds.reduce((a, b) => a + b, 0) - 1) < 1e-12);
  }
  for (let seed = 0; seed < 2000; seed++) assert.notEqual(rollChest('diamond', [], 0, seed, 100).rarity, 'common');
  const c = newCareer();
  c.money = baseConfig.diamondChestPrice - 1;
  assert.equal(Careers.buyChest(c, 'diamond', baseConfig), false);
  c.money += 1;
  assert.equal(Careers.buyChest(c, 'diamond', baseConfig), true);
  assert.equal(c.money, 0);
  assert.deepEqual(c.chests, ['diamond']);
});

test('the High Roller table moves the stakes up with the balance, and All in stays last', () => {
  const c = newCareer();
  c.money = baseConfig.casinoHighRollerFrom - 1;
  assert.deepEqual(Casino.stakes(c, baseConfig).slice(0, 5), baseConfig.casinoStakes);
  c.money = baseConfig.casinoHighRollerFrom;
  const stakes = Casino.stakes(c, baseConfig);
  assert.ok(Casino.highRoller(c, baseConfig));
  assert.deepEqual(stakes.slice(0, 5), baseConfig.casinoHighStakes);
  assert.equal(stakes.at(-1), c.money);
  assert.equal(stakes.length, baseConfig.casinoStakes.length + 1, 'the same number of chips: the table does not change shape');
});

test('the new skins have looks, names and a way to get them', () => {
  const sources = { auction: 6, fund: 3, casino: 4 };
  for (const [kind, count] of Object.entries(sources)) {
    const items = COSMETICS.filter((x) => x.source.kind === kind);
    assert.equal(items.length, count, `${count} ${kind} skins`);
    for (const x of items) {
      assert.ok(Skins.color(x.id), `${x.id} has a colour`);
      assert.ok(Skins.effect(x.id), `${x.id} has an effect`);
      assert.notEqual(S.shop.item(x.id), x.id, `${x.id} has a name`);
      assert.ok(S.shop.lockedHint(x).length > 20, `${x.id} says where it comes from`);
    }
  }
  assert.ok(!albumItems('honours').some((x) => x.source.kind === 'auction' || x.source.kind === 'fund'), 'the Honours album never waits on the Club');
  assert.ok(!albumItems('honours').some((x) => x.source.kind === 'casino'), 'nor on the casino');
});

/** The career as a save brings it back. */
const careerAfterSave = (career) => {
  const save = newSave();
  save.career = career;
  return parseImport(JSON.stringify({ ...save, [SEAL_FIELD]: sealSave(save) })).career;
};

test('the Auction House: lots hold through the day, a lot is tried once, and walking away costs nothing', () => {
  const c = newCareer();
  c.level = 60;
  c.money = 50_000_000;
  const day = 20_000;
  const lots = Auction.today(c, day);
  assert.equal(lots.length, baseConfig.auctionLots);
  assert.deepEqual(Auction.today(c, day).map(lotKey), lots.map(lotKey), 'the same lots all day');
  const last = lots.at(-1);
  assert.ok(last.k === 'skin' && cosmetic(last.id).source.kind === 'auction', 'the last lot is the Auction House own skin');
  assert.notDeepEqual(Auction.today(c, day + 1).map(lotKey), lots.map(lotKey), 'a new set tomorrow');
  Auction.today(c, day);
  const keep = c.money;
  const run = Auction.begin(c, 0, day);
  assert.ok(run && run.phase === 'bidding' && run.price === 0);
  assert.equal(Auction.begin(c, 0, day), null, 'a lot is not tried twice');
  assert.ok(run.bots.length >= baseConfig.auctionBots[0] && run.bots.length <= baseConfig.auctionBots[1]);
  assert.equal(run.start % run.step, 0);
  assert.equal(Auction.bid(c, run, run.start - run.step), null, 'under the opening price');
  assert.equal(Auction.bid(c, run, run.start + 1), null, 'off the steps');
  Auction.walk(run);
  assert.equal(run.phase, 'lost');
  assert.equal(c.money, keep, 'walking away is free');
  assert.equal(Auction.bid(c, run, run.start), null, 'no bidding after leaving');
  // Without the Elite track the House is shut.
  const low = newCareer();
  Auction.today(low, day);
  assert.equal(Auction.canStart(low, 0, day), false);
});

test('the Auction House: a win pays the hammer price and the premium and hands over the lot, and it saves', () => {
  const day = 20_001;
  const base = newCareer();
  base.level = 60;
  base.money = 100_000_000;
  const lots = Auction.today(base, day);
  const slot = lots.findIndex((l) => l.k === 'skin');
  let won = null;
  for (let attempt = 1; attempt < 400 && !won; attempt++) {
    const d = newCareer();
    d.level = 60;
    d.money = base.money;
    d.casinoSeed = attempt;
    d.auctionDay = base.auctionDay;
    d.auctionLots = [...base.auctionLots];
    const run = Auction.begin(d, slot, day);
    for (let n = 0; n < 200 && run.phase === 'bidding'; n++) assert.ok(Auction.bid(d, run, Auction.minBid(run)));
    if (run.phase === 'won') won = { d, run };
  }
  assert.ok(won, 'some auction is won at the least bids');
  const { d, run } = won;
  assert.equal(run.paid, run.price + Math.floor(run.price * baseConfig.auctionPremium));
  assert.equal(d.money, 100_000_000 - run.paid);
  assert.ok(Careers.owns(d, run.lot.id), 'the skin is in the collection');
  assert.equal(d.auctionWins, 1);
  assert.equal(d.auctionSpent, run.paid);
  const back = careerAfterSave(d);
  assert.deepEqual(back.auctionLots, d.auctionLots);
  assert.deepEqual(back.auctionTaken, d.auctionTaken);
  assert.equal(back.auctionSpent, d.auctionSpent);
  assert.equal(Auction.canStart(d, slot, day), false, 'taken');
});

test('Collector asks for every skin still to be had, Completionist for every other title, the crew titles for a podium', () => {
  const c = newCareer();
  const had = (id) => Elite.titleEarned(id, c, baseConfig);
  assert.ok(!COSMETICS.filter((x) => x.source.kind === 'hall' || x.source.kind === 'fund').some((x) => collectableSkins().includes(x)), 'retired skins do not count');
  assert.ok(collectableSkins().every((x) => x.kind !== 'vehicleType'));
  c.collection = collectableSkins().slice(1).map((x) => x.id);
  assert.ok(!had('collector'), 'one skin short');
  c.collection = collectableSkins().map((x) => x.id);
  assert.ok(had('collector'));
  assert.ok(!had('crewPodium') && !had('crewChampion'));
  c.crewPodium = 3;
  assert.ok(had('crewPodium') && !had('crewChampion'));
  assert.ok(!had('completionist'), 'other titles still missing');
  c.crewPodium = 1;
  assert.ok(had('crewChampion'));
  assert.equal(careerAfterSave(c).crewPodium, 1);
  assert.ok(TITLES.every((t) => TITLE_RULES[t]), 'every title has a rule');
});

test('an auction cannot be bid on past the money, and a stored lot is checked', () => {
  const c = newCareer();
  c.level = 60;
  c.money = 1_000_000;
  const day = 20_002;
  Auction.today(c, day);
  const run = Auction.begin(c, 1, day);
  const offers = Auction.offers(c, run);
  assert.ok(offers.length >= 1 && offers.every((bid) => Auction.cost(bid) <= c.money));
  c.money = Auction.cost(run.start) - 1;
  assert.deepEqual(Auction.offers(c, run), []);
  assert.equal(Auction.bid(c, run, run.start), null);
  assert.equal(readLot('skin:nobody'), null);
  assert.equal(readLot('chest:nothing'), null);
  assert.deepEqual(readLot('chest:diamond'), { k: 'chest', chest: 'diamond' });
  const edited = newCareer();
  edited.auctionLots = ['skin:gold', 'skin:nobody', 'chest:diamond'];
  assert.deepEqual(careerAfterSave(edited).auctionLots, ['skin:gold', 'chest:diamond']);
});

test('a contract signed in an older save is paid back as money', () => {
  const c = { ...newCareer(), money: 5_000, contract: { goal: 'sharp', stake: 100_000 } };
  assert.equal(careerAfterSave(c).money, 105_000);
});

test('the Game fund: a gift leaves the save only as far as it was accepted', () => {
  const c = newCareer();
  const view = { minGift: 10_000, maxGift: 5_000_000 };
  c.money = 1_000_000;
  assert.deepEqual(Fund.offers(c, view), [10_000, 50_000, 250_000, 1_000_000]);
  Fund.gave(c, 250_000);
  assert.equal(c.money, 750_000);
  assert.equal(c.fundGiven, 250_000);
  Fund.gave(c, 9_000_000);
  assert.equal(c.money, 0, 'never below nothing');
});

test('the tab bar runs Progress, Social, Game, Shop, Build, and Social shows only the segments the career has reached', async () => {
  const { TAB_BAR, SOCIAL } = await load('/src/present/flow.ts');
  const { SocialPage } = await load('/src/present/social.ts');
  assert.deepEqual(TAB_BAR, ['progress', 'social', 'game', 'shop', 'upgrades']);
  const viewport = { x: 430, y: 900 };
  const c = newCareer();
  assert.equal(SocialPage.clubOpen(c), false, 'the Club waits for Level 50');
  assert.equal(SocialPage.mafiaOpen(c), false, 'the Mafia waits for the first boss');
  assert.deepEqual(SocialPage.sections(c), [SOCIAL.ranks, SOCIAL.crew]);
  c.bossesBeaten.push('convoy');
  assert.equal(SocialPage.mafiaOpen(c), true);
  assert.deepEqual(SocialPage.sections(c), [SOCIAL.ranks, SOCIAL.crew, SOCIAL.mafia]);
  const cells = SocialPage.segments(viewport, SocialPage.sections(c));
  for (const [section, r] of cells) assert.equal(SocialPage.sectionAt({ x: (r.minX + r.maxX) / 2, y: (r.minY + r.maxY) / 2 }, viewport, c), section);
  assert.ok(SocialPage.column(viewport).top > cells[0][1].maxY, 'the content starts under the segments');
  assert.equal(SocialPage.sectionAt({ x: 10, y: 5 }, viewport, c), null);
});

test('what the career has not reached is not on show: the Casino in the Shop, the Trials in the Goals list; a late loan only dims the Casino', async () => {
  const { ShopPage } = await load('/src/present/shop.ts');
  const { ProgressPage, ProgressState } = await load('/src/present/progress.ts');
  const { Mafia } = await load('/src/core/mafia.ts');
  const { PROGRESS } = await load('/src/present/flow.ts');
  const c = newCareer();
  assert.deepEqual(ShopPage.sections(c), [0, 1]);
  const hasTrials = (career) => ProgressPage.blocks(PROGRESS.goals, { ...newSave(), career }, 0, new ProgressState(), 400).out.some((p) => p.b.k === 'trial');
  assert.ok(!hasTrials(c));
  c.level = 12;
  assert.deepEqual(ShopPage.sections(c), [0, 1, 2]);
  c.level = 9;
  assert.ok(hasTrials(c));
  // Someone who played the Casino before the levels existed keeps it, and a loan that runs late shuts it without hiding it.
  const old = { ...newCareer(), casinoRounds: 3 };
  assert.deepEqual(ShopPage.sections(old), [0, 1, 2]);
  const late = { ...c, level: 20, loan: { amount: 1000, owed: 1200, paid: 0, due: 1, late: true, graced: false, told: 0, seen: 1, taken: 1 } };
  assert.ok(Mafia.late(late));
  assert.deepEqual(ShopPage.sections(late), [0, 1, 2]);
});

test('a career that Prestiges at Level 50 meets all eight bosses and the late specials, spread over the ranks', () => {
  const at = (rank, level) => {
    const c = newCareer();
    c.prestige = rank;
    c.level = level;
    return Careers.config(c, baseConfig, 4242, 'clear', null, null);
  };
  assert.deepEqual([15, 30, 45].map((l) => at(0, l).bossKind), ['convoy', 'getaway', 'armoured'], 'rank 0 meets the first three');
  assert.deepEqual([15, 30, 45].map((l) => at(1, l).bossKind), ['phantom', 'twins', 'decoy']);
  assert.deepEqual([15, 30].map((l) => at(2, l).bossKind), ['smuggler', 'kingpin']);
  assert.equal(at(1, 20).convoy, false, 'only every 15th level');
  assert.equal(at(3, 15).convoy && at(3, 45).convoy, true);
  assert.equal(Careers.bossShift({ ...newCareer(), prestige: 2 }), 90);
  const comes = (rank, level) => {
    const cfg = at(rank, level);
    cfg.oversizeChance = cfg.racerChance = cfg.weddingChance = 1;
    const world = new World(cfg, 77, { startsOnFirstTap: false });
    return [world.oversize.kind !== 'done', world.race.kind !== 'done', world.wedding.kind !== 'done'];
  };
  assert.deepEqual(comes(0, 20), [false, false, false]);
  assert.deepEqual(comes(1, 20), [false, false, false]);
  assert.deepEqual(comes(2, 1), [true, false, false], 'rank 2 brings the oversize load');
  assert.deepEqual(comes(3, 1), [true, true, false], 'rank 3 the street racers');
  assert.deepEqual(comes(4, 1), [true, true, true], 'rank 4 the wedding convoy');
});

test('a Daily done for today names tomorrow’s city as the reason to come back', () => {
  assert.match(S.daily.rowLine(3, false, null, 0, null, 'roadworks'), /tomorrow: .+/);
  assert.match(S.daily.rowLine(3, false, null), /back tomorrow/);
  assert.ok(!/tomorrow/.test(S.daily.rowLine(3, true, null, 0, null, 'roadworks')));
});

test('Mafia: a loan is paid out, repaid in time it makes the next one kinder, late it shuts the Casino and takes the loot', async () => {
  const { Mafia, DAY_MS, readLoan } = await load('/src/core/mafia.ts');
  const now = 1_000_000_000_000;
  const c = newCareer();
  c.level = 20;
  const [small, , big] = Mafia.amounts(c);
  assert.ok(small < big, 'three loans, smallest first');
  const early = newCareer();
  early.level = baseConfig.convoyEvery;
  assert.equal(Mafia.borrow(early, Mafia.amounts(early)[0], 'miss', now), null, 'no boss put away and the boss level not passed: no loan');
  assert.ok(Mafia.borrow({ ...c, bossesBeaten: [], loan: null }, small, 'miss', now), 'past the boss level the Family talks even without a boss');
  c.bossesBeaten.push('convoy');

  const table = Mafia.table(c, big);
  assert.deepEqual(Mafia.table(c, big), table, 'the same loan gives the same bar');
  assert.ok(Mafia.table(c, big).speed > Mafia.table(c, small).speed, 'the bigger the loan, the faster the pointer');
  const centre = (table.zone.from + table.zone.to) / 2;
  assert.equal(Mafia.grade(table, centre), 'perfect');
  assert.equal(Mafia.grade(table, table.zone.from + 0.001), 'good');
  assert.equal(Mafia.grade(table, 0), 'miss');
  for (const ms of [0, 137, 4000, 123_456]) assert.ok(Mafia.pointer(table, ms) >= 0 && Mafia.pointer(table, ms) <= 1);
  const plain = Mafia.terms(c, 'miss');
  const best = Mafia.terms(c, 'perfect');
  assert.ok(best.interest < plain.interest && best.days > plain.days, 'a Perfect is the kinder deal');

  const loan = Mafia.borrow(c, big, 'perfect', now);
  assert.equal(c.money, big, 'paid out at once');
  assert.equal(loan.owed, Math.round(big * (1 + best.interest)));
  assert.equal(loan.due, now + best.days * DAY_MS);
  assert.equal(Mafia.borrow(c, small, 'miss', now), null, 'one loan at a time');
  assert.deepEqual(readLoan(JSON.parse(JSON.stringify(loan))), loan, 'the save keeps it');
  assert.equal(readLoan({ amount: 5, owed: 1, due: 9 }), null, 'a loan that owes less than it lent is not one');

  assert.equal(Mafia.sync(c, now + DAY_MS), null);
  assert.equal(Mafia.late(c), false);
  assert.equal(Unlocks.isOpen(c, 'casino'), true);
  assert.equal(Careers.careerShift(c, baseConfig, 7).criminalChance, 1, 'in time, the criminals still come');
  assert.equal(Mafia.sync(c, loan.due), 'late', 'its day has come');
  assert.equal(Mafia.late(c), true);
  assert.equal(Unlocks.isOpen(c, 'casino'), false, 'late: the Casino is shut');
  const shift = Careers.careerShift(c, baseConfig, 7);
  assert.equal(shift.criminalChance, 0, 'late: no criminal and no boss');
  assert.equal(shift.convoy, false);
  assert.ok(shift.transporterFirst.lo > 1e6, 'late: no transporter');
  assert.equal(Mafia.sync(c, now), null, 'a clock set back gives nothing back');
  assert.equal(Mafia.late(c), true);

  assert.equal(Mafia.debt(c, loan.due + 3 * DAY_MS), loan.owed + Math.round(loan.owed * baseConfig.mafiaLateRate * 3), 'the debt grows by the day');
  assert.equal(Mafia.debt(c, loan.due + 400 * DAY_MS), loan.owed + Math.round(loan.owed * baseConfig.mafiaLateCap), 'and stops at the cap');
  assert.equal(Mafia.garnish(c, 1000, loan.due), Math.round(1000 * baseConfig.mafiaGarnish), 'the Family takes its share of a shift');
  c.money = 1e6;
  const repaid = Mafia.repay(c, 1e12, loan.due);
  assert.equal(repaid.cleared, true);
  assert.equal(repaid.inTime, false, 'late is not clean');
  assert.equal(c.loan, null);
  assert.equal(c.cleanLoans, 0);
  assert.equal(Unlocks.isOpen(c, 'casino'), true, 'paid: the Casino is open again');
  assert.equal(Careers.careerShift(c, baseConfig, 7).criminalChance, 1);

  const before = { interest: Mafia.baseTerms(c).interest, zone: Mafia.zoneWidth(c) };
  c.money = 1e6;
  Mafia.borrow(c, small, 'good', now);
  assert.equal(Mafia.repay(c, 1e12, now + DAY_MS).inTime, true);
  assert.equal(c.cleanLoans, 1);
  assert.ok(Mafia.baseTerms(c).interest < before.interest, 'repaid in time: the next loan is cheaper');
  assert.ok(Mafia.zoneWidth(c) > before.zone, 'and the green zone is wider');

  Mafia.borrow(c, small, 'miss', now);
  const letters = Mafia.letters(c.loan).map((l) => l.kind);
  assert.deepEqual(letters, ['taken', 'half', 'day', 'late', 'later']);
  assert.equal(Mafia.news(c, now).length, 0, 'the first letter is told by the deal itself');
  assert.deepEqual(Mafia.news(c, c.loan.due).map((l) => l.kind), ['half', 'day', 'late']);
  assert.equal(Mafia.news(c, c.loan.due).length, 0, 'each letter is told once');
});

test('Mafia: a day of grace for whoever was away, a write-off after two weeks late, and a steady hand', async () => {
  const { Mafia, DAY_MS } = await load('/src/core/mafia.ts');
  const now = 1_000_000_000_000;
  const c = newCareer();
  c.level = 20;
  c.bossesBeaten.push('convoy');
  const [small] = Mafia.amounts(c);
  const loan = Mafia.borrow(c, small, 'miss', now);
  assert.equal(Mafia.returned(c, now + DAY_MS), false, 'not due yet: no grace');
  const back = loan.due + 3 * DAY_MS;
  assert.equal(Mafia.returned(c, back), true, 'the day passed while the game was shut');
  assert.equal(loan.due, back + baseConfig.mafiaGraceDays * DAY_MS);
  assert.equal(Mafia.sync(c, back), null, 'one more day');
  assert.equal(Mafia.returned(c, loan.due + DAY_MS), false, 'only once per loan');
  assert.equal(Mafia.sync(c, loan.due), 'late');
  const writeoff = loan.due + baseConfig.mafiaWriteOffDays * DAY_MS;
  assert.equal(Mafia.sync(c, writeoff - 1), null);
  assert.equal(Mafia.sync(c, writeoff), 'writeoff', 'the Family gives up: no debt is for ever');
  assert.equal(c.loan, null);
  assert.equal(Mafia.canBorrow(c, small, baseConfig, writeoff + DAY_MS), false, 'the doors are shut');
  assert.equal(Mafia.canBorrow(c, small, baseConfig, writeoff + (baseConfig.mafiaBanDays + 1) * DAY_MS), true);

  const t = Mafia.table(c, small);
  const steady = Mafia.table(c, small, baseConfig, true);
  assert.deepEqual(steady.zone, t.zone, 'the same bar');
  assert.ok(steady.speed < t.speed, 'a slower pointer');
  const centre = (t.zone.from + t.zone.to) / 2;
  assert.equal(Mafia.grade(t, centre), 'perfect');
  assert.equal(Mafia.grade(steady, centre), 'good', 'a steady hand cannot earn a Perfect');
});

test('Progress has three sections that each carry a label, and every upgrade stands once under a heading', async () => {
  const { PROGRESS } = await load('/src/present/flow.ts');
  const { UpgradePage } = await load('/src/present/upgrades.ts');
  const { UPGRADES } = await load('/src/core/levels.ts');
  assert.deepEqual(Object.values(PROGRESS), [0, 1, 2]);
  for (const i of Object.values(PROGRESS)) assert.ok(S.progress.section(i).length > 0);
  const { cards, headings } = UpgradePage.arrange({ x: 430, y: 900 }, 56, UPGRADES);
  assert.deepEqual([...cards.map((c) => c.upgrade)].sort(), [...UPGRADES].sort(), 'each upgrade once');
  assert.deepEqual(headings.map((h) => h.label), ['POLICE', 'MONEY', 'DRIVING', 'GARAGE']);
  const some = UPGRADES.slice(0, 3);
  assert.equal(UpgradePage.arrange({ x: 430, y: 900 }, 56, some).headings.length, 1, 'a heading with nothing under it is left out');
});

test('a running light dims only the ticks it reaches next, and lets them back once it has passed', () => {
  const head = (angle, strength = 1) => ({ angle, radius: 100, thickness: 4.5, halfAngle: 0.055, tail: 0.7, signal: 0, strength });
  const at = (tick, light, strength) => RingSignals.touched(100, 2, tick, [head(light, strength)]);
  assert.equal(at(3, 1), 0, 'far ahead of the light: untouched');
  assert.ok(at(3, 2.5) > 0 && at(3, 2.5) < 1, 'close ahead: dimming');
  assert.ok(at(3, 2.8) > at(3, 2.5), 'the closer, the darker');
  assert.equal(at(3, 3.3), 1, 'under the bright tail: off');
  assert.ok(at(3, 4.2) > 0 && at(3, 4.2) < 1, 'past the tail: coming back');
  assert.equal(at(3, 5.5), 0, 'long passed: on again');
  assert.equal(at(3, 3, 0.4), 0.4, 'as strong as the light');
  assert.equal(RingSignals.touched(130, 2, 3, [head(3)]), 0, 'a light on another radius');
});

test('site data for the website: every file in the index, unique ids, the game art as SVG', () => {
  const files = siteFiles();
  const { index, ...data } = files;
  assert.deepEqual(Object.keys(index.files).sort(), Object.keys(data).sort());
  for (const [name, file] of Object.entries(data)) {
    assert.equal(file.version, index.version, name);
    assert.equal(index.files[name], siteFingerprint(file), name);
  }
  const svg = (art) => typeof art === 'string' && art.startsWith('<svg') && art.endsWith('</svg>') && art.length > 200 && !art.includes('NaN');
  const entries = data.museum.shelves.flatMap((s) => s.entries);
  assert.equal(new Set(entries.map((e) => e.id)).size, entries.length);
  for (const e of entries) assert.ok(svg(e.art) && e.name && e.line && e.paragraphs.length > 0 && !JSON.stringify(e).includes(String.fromCharCode(0xe000)), e.id);
  assert.equal(new Set(data.collection.items.map((x) => x.id)).size, data.collection.items.length);
  for (const x of data.collection.items) assert.ok(svg(x.art) && x.name && x.how, x.id);
  assert.ok(!/\d[.,] coins/.test(JSON.stringify(data)), 'a coin amount keeps the full stop after it: "50 coins.", not "50. coins"');
  for (const c of data.collection.chests) assert.ok(Math.abs(c.odds.reduce((a, b) => a + b, 0) - 1) < 1e-9, c.id);
  const runs = data.progress.trials.flatMap((g) => g.runs);
  assert.equal(new Set(runs.map((r) => r.id)).size, runs.length);
  assert.ok(data.progress.titles.every((t) => t.name && t.rule));
  assert.ok(data.game.places.every((p) => svg(p.art)));
  assert.equal(data.game.counts.languages, data.game.languages.length);
  assert.ok(data.game.languages.length >= 5 && data.game.languages.every((l) => /^[a-z]{2}$/.test(l.code) && l.name));
});

test('ring signal guide for the website: every signal the game plays is explained', () => {
  // A signal can carry a second colour (the splash's juice, the victory's burst).
  const guide = new Set(GUIDE.flatMap((g) => [`${g.kind}:${g.color}`, g.second && `${g.kind}:${g.second}`]).filter(Boolean));
  // The vehicles' own signals come from the Museum's data (`signalOf`), the rest from the guide.
  for (const e of [...shelfEntries(0), ...shelfEntries(1)]) {
    const s = signalOf(e);
    if (!s) continue;
    if (s.sweep) guide.add(`sweep:${s.sweep.color}`);
    if (s.paid) guide.add(`wave:${s.paid.color}`);
    if (s.missed) guide.add(`miss:${s.missed.color}`);
  }
  const played = [];
  for (const file of ['session.ts', 'versus.ts']) {
    const source = readFileSync(new URL(`../src/present/${file}`, import.meta.url), 'utf8');
    // `rim.signal('kind', 'colour' …)`: every literal colour in the call, a conditional's both.
    for (const m of source.matchAll(/rim\.signal\('(\w+)',([^;]*?)\);/g)) {
      for (const c of m[2].matchAll(/'(\w+)'/g)) played.push(`${m[1]}:${c[1]}`);
    }
    for (const m of source.matchAll(/healRing\('(\w+)', '(\w+)'\)/g)) played.push(`heal:${m[1]}`);
  }
  assert.ok(played.length > 30, 'the scan reads the calls of the game');
  const missing = [...new Set(played)].filter((p) => !guide.has(p));
  assert.deepEqual(missing, [], 'a ring signal the game plays has no entry in present/siteGuide.ts');
  assert.equal(new Set(GUIDE.map((g) => g.id)).size, GUIDE.length);
  const { signals, features } = siteFiles();
  assert.ok(signals.kinds.length === 7 && signals.vehicles.length >= 10 && signals.vehicles.every((v) => v.steps.length > 0 && v.art.startsWith('<svg')));
  assert.ok(signals.groups.every((g) => g.signals.length > 0 && g.signals.every((x) => x.color.startsWith('rgb(') && x.when)));
  const items = features.groups.flatMap((g) => g.items);
  assert.equal(new Set(items.map((x) => x.id)).size, items.length);
  assert.ok(items.every((x) => x.title && x.line && x.body.length > 0 && !JSON.stringify(x).includes(String.fromCharCode(0xe000))));
  assert.equal(features.groups[0].items.length, 4, 'every mode');
});

test('a fast flick runs a little past the end of a list, springs back without ringing, and is felt once', () => {
  const s = new Scroller();
  s.scroll = 900;
  s.velocity = 3000;
  let bumps = 0;
  let furthest = 0;
  let back = false;
  for (let i = 0; i < 240; i++) {
    if (s.follow(1 / 60, 1000)) bumps++;
    furthest = Math.max(furthest, s.scroll);
    if (furthest > 1000 && s.scroll < 1000) back = true;
  }
  assert.equal(s.scroll, 1000, 'at rest on the end');
  assert.equal(s.velocity, 0);
  assert.ok(furthest > 1030 && furthest < 1150, `over by ${Math.round(furthest - 1000)} pt`);
  assert.ok(!back, 'critically damped: never swings back past the end');
  assert.equal(bumps, 1, 'the hand feels the end once');
  const slow = new Scroller();
  slow.scroll = 990;
  slow.velocity = 300;
  for (let i = 0; i < 120; i++) assert.ok(!slow.follow(1 / 60, 1000), 'a slow glide into the end is not felt');
});

test('HUD text keeps AA contrast on the glass over every map, daylight included', () => {
  const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const over = ([r, g, b, a], [R, G, B]) => [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a)];
  const ratio = (x, y) => {
    const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p);
    return (hi + 0.05) / (lo + 0.05);
  };
  for (const theme of [null, ...MAP_THEMES]) {
    const glass = over(COLORS.chrome, COLORS[MapTheme.ground(theme)]);
    for (const text of ['primary', 'muted', 'accent']) {
      assert.ok(ratio(COLORS[text], glass) >= 4.5, `${text} on the glass over ${theme ?? 'the default map'}: ${ratio(COLORS[text], glass).toFixed(2)}`);
    }
  }
  for (const text of ['primary', 'muted', 'accent', 'destructive', 'coin']) assert.ok(ratio(COLORS[text], COLORS.island) >= 4.5, `${text} on the island`);
});

test('daily challenges ask only for what a new player meets on the road', () => {
  for (let day = 20000; day < 20200; day++) {
    for (const level of [1, 2]) {
      const picked = challengesOf(day, level);
      assert.equal(picked.length, 3);
      assert.ok(!picked.some((c) => c === 'oneTakedown' || c === 'twoTakedowns' || c === 'twoTransporters'), `day ${day}, level ${level}: ${picked}`);
    }
    assert.ok(!challengesOf(day, 3).includes('twoTransporters'));
    assert.deepEqual(challengesOf(day), challengesOf(day, 99));
  }
});

test('upgrades come with the vehicle they work on, and a few first steps are cheap', () => {
  const career = newCareer();
  const offered = (level) => Careers.availableUpgrades({ ...career, level }, baseConfig);
  assert.ok(!offered(1).includes('morePatrols') && offered(2).includes('morePatrols'));
  assert.ok(!offered(2).includes('interceptor') && offered(3).includes('interceptor'));
  assert.ok(!offered(3).includes('cashRoute') && offered(4).includes('cashRoute'));
  assert.equal(Careers.priceOf({ ...career, level: 1 }, 'morePatrols', baseConfig), null);
  assert.equal(upgradeIntroLevel('overtime', baseConfig), 1);
  for (const [u, price] of Object.entries(baseConfig.starterPrices)) {
    assert.equal(upgradePrice(u, 1, baseConfig), price);
    assert.ok(upgradePrice(u, 2, baseConfig) > price, `${u}: the second step keeps its price`);
  }
});

test('three Premium Chests at once cost less; After Work pays career shifts in its hours', () => {
  const c = newCareer();
  c.money = baseConfig.premiumBundlePrice - 1;
  assert.ok(!Careers.buyChest(c, 'premium', baseConfig, true));
  c.money += 1;
  assert.ok(Careers.buyChest(c, 'premium', baseConfig, true));
  assert.deepEqual([c.money, Careers.count(c, 'premium')], [0, baseConfig.premiumBundle]);
  assert.ok(baseConfig.premiumBundlePrice < baseConfig.premiumBundle * baseConfig.premiumChestPrice);
  assert.ok(!Careers.buyChest(c, 'standard', baseConfig, true), 'only the Premium Chest comes as a pack');
  assert.ok(Goals.afterWork('shift', false, baseConfig.afterWorkFrom));
  assert.ok(!Goals.afterWork('shift', false, baseConfig.afterWorkTo));
  assert.ok(!Goals.afterWork('shift', true, baseConfig.afterWorkFrom), 'never over the Daily');
  assert.ok(!Goals.afterWork('unlimited', false, baseConfig.afterWorkFrom));
});

test('a run a crash ended goes on once for an ad, and replays the same', () => {
  const reckless = (world) => world.queue.isReady && world.time % 1.3 < 1 / 120;
  const run = () => {
    const world = new World(forLevel(baseConfig, 8, 99), 99, { startsOnFirstTap: false });
    const ends = [];
    for (let i = 0; i < 120 * 240 && ends.length < 2; i++) {
      if (reckless(world)) world.tap(world.time);
      world.step();
      for (const e of world.takeEvents()) {
        if (e.type !== 'shiftEnded') continue;
        ends.push(e.result);
        if (e.result.outcome === 'struckOut' && world.revives === 0) assert.ok(world.revive(world.time));
      }
    }
    return ends;
  };
  const first = run();
  assert.equal(first[0].outcome, 'struckOut', 'the reckless bot crashes out');
  const last = first[first.length - 1];
  assert.ok(last.revived, 'the result says it went on');
  assert.ok(last.crashes > first[0].crashes, 'the crash before the revive still counts');
  assert.ok(!last.isPerfectRun);
  assert.deepEqual(run(), first, 'same seed, taps and revive, same run');
  const w = new World(forLevel(baseConfig, 8, 99), 99, { startsOnFirstTap: false });
  assert.ok(!w.revive(0), 'only a run a crash ended');
});

test('the Auction House sells a skin lot at its fixed price instead of the room, once', () => {
  const c = newCareer();
  c.level = baseConfig.prestigeLevel;
  c.prestige = 1;
  const day = 20800;
  const lots = Auction.today(c, day);
  const slot = lots.findIndex((l) => l.k === 'skin');
  const price = Auction.buyNowPrice(lots[slot]);
  assert.equal(price, Math.round((Auction.estimate(lots[slot]) * baseConfig.auctionBuyNow) / 500) * 500);
  c.money = price - 1;
  assert.equal(Auction.buyNow(c, slot, day), null, 'not without the money');
  c.money = price;
  assert.equal(Auction.buyNow(c, slot, day), price);
  assert.equal(c.money, 0);
  assert.ok(Careers.owns(c, lots[slot].id));
  assert.ok(!Auction.canStart(c, slot, day), 'the lot is taken for the day');
  assert.equal(Auction.buyNowPrice({ k: 'chest', chest: 'diamond' }), null, 'chests are in the Shop');
});

test('remote tuning takes only known names, held to their range', () => {
  assert.deepEqual(tuned(null), {});
  assert.deepEqual(tuned({ easeAfterLosses: 1, maxStrikes: 9, shiftCars: 3, dailyPay: '500' }), { easeAfterLosses: 1 });
  assert.deepEqual(tuned({ easeAfterLosses: 0, easeMaxSteps: 2.6, easeTempoStep: 0.5, adChestsPerDay: Infinity }), { easeAfterLosses: 1, easeMaxSteps: 3, easeTempoStep: 0.1 });
});

test('record in sight: from the share of the best on, how close and how many points are missing', () => {
  const c = { ...baseConfig, nearRecordShare: 0.8 };
  assert.equal(Goals.record(500, 0, c), null);
  assert.equal(Goals.record(799, 1000, c), null);
  assert.deepEqual(Goals.record(800, 1000, c), { near: 0, gap: 200 });
  assert.deepEqual(Goals.record(900, 1000, c), { near: 0.5, gap: 100 });
  assert.deepEqual(Goals.record(1200, 1000, c), { near: 1, gap: -200 });
});

test('a police skin dresses the police cars: one at a time, kept in the save, never a car skin', () => {
  fakeStorage();
  const police = COSMETICS.filter((x) => x.kind === 'policeSkin');
  assert.ok(police.length >= 3 && police.every((x) => x.source.kind === 'chest'));
  const save = newSave();
  save.career.collection.push('sheriff', 'undercover');
  assert.equal(Careers.wear(save.career, 'sheriff'), true);
  assert.equal(Careers.wear(save.career, 'undercover'), true);
  assert.equal(save.career.policeSkin, 'undercover', 'the second replaces the first');
  assert.deepEqual(save.career.carSkins, []);
  assert.equal(Careers.isWorn(save.career, 'undercover'), true);
  assert.equal(writeSave(save), true);
  assert.equal(loadSave().career.policeSkin, 'undercover');
  assert.equal(Careers.wear(save.career, 'undercover'), true);
  assert.equal(save.career.policeSkin, null, 'worn again: taken off');
  assert.equal(Careers.wear(save.career, 'interceptor'), false, 'not owned');
});

test('the Garage upgrade gives one more car skin slot a step, and the save keeps what fits', () => {
  fakeStorage();
  const save = newSave();
  const c = save.career;
  const skins = COSMETICS.filter((x) => x.kind === 'carSkin' && x.source.kind === 'chest').slice(0, 10).map((x) => x.id);
  c.collection.push(...skins);
  for (const id of skins) Careers.wear(c, id);
  assert.equal(c.carSkins.length, Careers.skinSlots(c));
  assert.equal(Careers.priceOf(c, 'skinSlots'), null, 'not on offer on Level 1');
  c.level = baseConfig.skinSlotsLevel;
  c.money = 1e9;
  assert.equal(Careers.buy(c, 'skinSlots'), true);
  assert.equal(Careers.wear(c, skins[9]), true, 'the new slot takes one more');
  assert.equal(c.carSkins.length, Careers.skinSlots(c));
  assert.equal(writeSave(save), true);
  assert.equal(loadSave().career.carSkins.length, Careers.skinSlots(c));
});

test('the duck family: about one shift in 500, the cars stop for it, it never walks through a car, nobody crashes for it', async () => {
  const { duckDelay, duckPose } = await load('/src/core/ducks.ts');
  let comes = 0;
  for (let seed = 1; seed <= 50000; seed++) comes += duckDelay({ seed, config: baseConfig, isVersus: false }) === null ? 0 : 1;
  assert.ok(comes > 50000 / 500 / 1.4 && comes < (50000 / 500) * 1.4, `about one in 500 (${comes} of 50000)`);
  assert.equal(duckDelay({ seed: 1, config: { ...baseConfig, mayhem: true, duckChance: 1 }, isVersus: false }), null, 'never in Mayhem');
  assert.equal(duckDelay({ seed: 1, config: { ...baseConfig, duckChance: 1 }, isVersus: true }), null, 'never in a match');
  const careful = (world) => world.queue.isReady && world.predictedMergeGap(world.layout.player, 0, 40, -Infinity, world.vehicle(world.queue.vehicles[0])?.lane ?? 0) > 0.04;
  const inside = (w, veh, p) => {
    const dx = p.x - veh.position.x, dy = p.y - veh.position.y;
    const x = dx * Math.cos(veh.heading) + dy * Math.sin(veh.heading), y = -dx * Math.sin(veh.heading) + dy * Math.cos(veh.heading);
    return Math.abs(x) < w.lengthOf(veh.type) / 2 + 2 && Math.abs(y) < w.widthOf(veh.type) / 2 + 2;
  };
  let stood = 0;
  for (const seed of [7934, 15853, 23772, 31691]) {
    const world = new World({ ...forLevel(baseConfig, 15, seed), duckChance: 1, duckDelay: { lo: 3, hi: 3 } }, seed, { startsOnFirstTap: false });
    let crossed = false;
    for (let i = 0; i < 120 * 60 && !(crossed && !world.waitsForDucks); i++) {
      if (careful(world)) world.tap(world.time);
      world.step();
      for (const e of world.takeEvents()) assert.notEqual(e.type, 'crash', `nobody crashes while everyone waits for the ducks (seed ${seed})`);
      const f = world.ducks;
      if (!f) continue;
      crossed = true;
      for (const d of f.at) {
        const p = duckPose(f.walk, d).position;
        for (const veh of world.vehicles) if (veh.phase.kind !== 'queued' && veh.phase.kind !== 'waiting') assert.ok(!inside(world, veh, p), `a duck never walks through a car (seed ${seed})`);
      }
      stood += world.vehicles.filter((x) => x.phase.kind === 'ring' && (x.phase.drive.speed ?? 99) < 1).length;
    }
    assert.ok(crossed && world.ducksDone && !world.ducks, `the family gets across (seed ${seed})`);
  }
  assert.ok(stood > 0, 'cars stood and waited');
});

test('small details (Leo, 24.10.2026): holidays by date, a note under every good merge, bodies on springs, the queue\'s wave', async () => {
  const { Holidays } = await load('/src/present/holidays.ts');
  const day = (m, d, h = 12) => new Date(2026, m - 1, d, h);
  assert.equal(Holidays.of(day(10, 31)), 'halloween');
  assert.equal(Holidays.of(day(10, 24)), null);
  assert.equal(Holidays.of(day(12, 5)), 'december');
  assert.equal(Holidays.of(day(12, 31)), 'newYear');
  assert.equal(Holidays.of(day(7, 1)), null);

  const { Feedback } = await load('/src/present/feedback.ts');
  const merged = (rating) => ({ type: 'merged', rating, critical: false, position: { x: 0, y: 0 }, points: 1, combo: 3 });
  assert.deepEqual(Feedback.cues([merged('clean')]).sounds, ['merge']);
  for (const rating of ['perfect', 'tightFit', 'nearMiss']) assert.ok(Feedback.cues([merged(rating)]).sounds.includes('note'), `${rating} rings a note`);
  assert.ok(!Feedback.cues([merged('cutOff')]).sounds.includes('note'), 'a cut-off is not a step of the tune');
  assert.ok(!Feedback.cues([{ ...merged('perfect'), critical: true }]).sounds.includes('note'), 'a critical merge has its own chord');
  for (const combo of [1, 4, 30]) assert.equal(Feedback.pitch('note', combo, 7), Feedback.pitch('merge', combo, 7), 'the note sits on the merge\'s step');

  const { VehicleLamps } = await load('/src/present/scene.ts');
  const { STEP } = await load('/src/core/world.ts');
  const world = new World(forLevel(baseConfig, 8, 11), 11, { startsOnFirstTap: false });
  const lamps = new VehicleLamps();
  let most = 0;
  let waved = false;
  for (let i = 0; i < 120 * 40; i++) {
    if (world.queue.isReady && world.predictedMergeGap(world.layout.player, 0, 40, -Infinity, world.vehicle(world.queue.vehicles[0])?.lane ?? 0) > 0.04) world.tap(world.time);
    world.step();
    world.takeEvents();
    lamps.update(world, STEP);
    for (const veh of world.vehicles) most = Math.max(most, Math.abs(lamps.pitch(veh.id)));
    if (!waved && world.queue.vehicles.length >= 3 && i > 600) {
      waved = true;
      lamps.wave(world);
      const [front, , third] = world.queue.vehicles;
      lamps.update(world, 0.06);
      const first = lamps.indicators(front);
      assert.ok(first && first[0] > 0.3 && first[1] > 0.3, 'the front car flashes both sides first');
      assert.equal(lamps.indicators(third)?.[0] ?? 0, 0, 'the third car is still waiting for its turn');
      lamps.update(world, 0.3);
      assert.equal(lamps.indicators(front)?.[0] ?? 0, 0, 'and the flash is over');
    }
  }
  assert.ok(most > 0.002 && most < 0.07, `the bodies pitch, and never far (${most})`);
  assert.ok(waved, 'the test saw a queue of three');
  lamps.calm = true;
  lamps.update(world, STEP);
  for (const veh of world.vehicles) assert.equal(lamps.pitch(veh.id), 0, 'Reduce Motion: the bodies stay level');
});

test('more small details (Leo, 24.10.2026): a knock for a tap that cannot be taken, the last engine of a won shift, hazards after a crash, who signals when', async () => {
  const { Feedback } = await load('/src/present/feedback.ts');
  assert.deepEqual(Feedback.cues([{ type: 'tapRejected', time: 1 }]).sounds, ['notYet']);
  const ended = (outcome) => ({ type: 'shiftEnded', result: { outcome, detonated: false } });
  assert.ok(Feedback.cues([ended('completed')]).sounds.includes('departure'), 'a won shift ends with an engine driving off');
  assert.ok(!Feedback.cues([ended('struckOut')]).sounds.includes('departure'), 'a lost one does not');

  const { VehicleLamps } = await load('/src/present/scene.ts');
  const lead = VehicleLamps.signalLead;
  assert.ok(lead('learner') > lead('truck') && lead('truck') > lead('car') && lead('car') > lead('sportsCar'), 'learner early, lorry in good time, sports car late');

  const lamps = new VehicleLamps();
  const { STEP } = await load('/src/core/world.ts');
  const world = new World(forLevel(baseConfig, 8, 11), 11, { startsOnFirstTap: false });
  lamps.update(world, STEP);
  assert.equal(lamps.indicators(7), null);
  lamps.crashed(7);
  const lit = [];
  for (let i = 0; i < 80; i++) {
    lamps.update(world, 0.02);
    lit.push(lamps.indicators(7)?.[0] ?? 0);
  }
  assert.ok(Math.max(...lit) > 0.9 && Math.min(...lit) < 0.1, 'the hazards of a car in a crash blink');
  for (let i = 0; i < 400; i++) lamps.update(world, 0.02);
  assert.equal(lamps.indicators(7), null, 'and stop after a few seconds');

  const { Holidays } = await load('/src/present/holidays.ts');
  assert.equal(Holidays.of(new Date(2026, 9, 24, 12)), null, 'no leaves, no autumn holiday');
});

test('traffic sound: even flow settles into a chord, a free gap eases the pressure', async () => {
  const { trafficFlow, settle } = await load('/src/audio/trafficFlow.ts');
  const car = (id, angle, ring, r = 120) => ({ id, engine: 'car', speed: 1, load: ring ? 0.4 : 1, ring, x: r * Math.cos(angle), y: r * Math.sin(angle) });
  const even = Array.from({ length: 6 }, (_, i) => car(i, (i * Math.PI * 2) / 6, true));
  const bunched = [0, 0.1, 0.2, 0.3, 0.4, 0.5].map((a, i) => car(i, a, true));
  assert.ok(trafficFlow(even).evenness > 0.95 && trafficFlow(bunched).evenness < 0.1, 'evenly spaced cars are consonant, bunched ones are not');
  const entering = car(9, 3, false, 150);
  const near = trafficFlow([car(1, 2.8, true), entering]).pressure;
  const free = trafficFlow([car(1, 0.2, true), entering]).pressure;
  assert.ok(free < near, 'a car far behind the entry leaves a gap, one just behind closes it');
  assert.equal(trafficFlow([]).pressure, 0);
  assert.equal(settle(0.75, 1), 0.75);
  assert.ok(Math.abs(settle(0.8, 1) - 0.75) < 1e-9 && settle(0.8, 0) === 0.8, 'rates move towards the nearest chord note by the given amount');
});

test('pasted codes: a whole code or a link is found, a word or a number that is not ours never is', async () => {
  const { syncCodeIn, crewCodeIn, joinCodeIn } = await load('/src/net/pasted.ts');
  assert.equal(syncCodeIn(' k7m2-9qxa 4tfb \n'), 'K7M29QXA4TFB');
  assert.equal(syncCodeIn('K7M2-9QXA'), null, 'too short');
  assert.equal(syncCodeIn('K7M2-9QXA-4TF0'), null, 'a zero is not in the alphabet');
  assert.equal(crewCodeIn('Join my crew! https://api.example.org/k/K7M29QXA?by=ZZZZ2222 see you'), 'K7M29QXA');
  assert.equal(crewCodeIn('https://game.example.org/?crew=K7M29QXA&ref=ZZZZ2222'), 'K7M29QXA');
  assert.equal(crewCodeIn('MARKETER'), null, 'a bare word could pass for a code, so it is only taken when asked for');
  assert.equal(crewCodeIn('MARKETER', true), 'MARKETER');
  assert.equal(crewCodeIn('https://example.org/k/K7M29QXAZ'), null, 'a ninth character is not a code');
  assert.equal(joinCodeIn(' 4821 '), '4821');
  assert.equal(joinCodeIn('https://game.example.org/#join=4821'), '4821');
  assert.equal(joinCodeIn('12345'), null);
  assert.equal(joinCodeIn('call 4821 now'), null);
});

test('the drift car shows up on a busy ring: regular traffic holds back until it is quiet', () => {
  let came = 0;
  for (let s = 1; s <= 10; s++) {
    const cfg = { ...forLevel(baseConfig, 40, s), driftLevel: 1, driftEvery: 1, driftWindow: 1, driftFirst: { lo: 1, hi: 2 } };
    const world = new World(cfg, s, { startsOnFirstTap: false });
    let seen = false;
    for (let i = 0; i < 120 * 30 && !seen; i++) {
      world.step();
      seen = world.vehicles.some((x) => x.type === 'drift');
    }
    if (seen) came++;
  }
  assert.ok(came >= 8, `the drift car came in ${came} of 10 shifts`);
});
