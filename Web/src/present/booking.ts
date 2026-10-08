import { INVITE_REMINDER_LEVEL, type Config } from '../core/config';
import { type SaveGame, type GameMode, type Hint, Careers } from '../core/career';
import { Elite } from '../core/elite';
import { SeasonPass } from '../core/seasonPass';
import type { ShiftResult } from '../core/events';
import { challengeReward } from '../core/daily';
import { Unlocks } from '../core/unlocks';
import { tierOf, UNLIMITED_MARKS } from '../core/tiers';
import { heatXp } from '../core/heat';
import { Achievements } from '../core/achievements';
import { S, Fmt } from './strings';

/** What a finished career shift needs to know besides its result. */
export interface ShiftContext {
  mode: GameMode;
  level: number;
  /** It was today's Daily Shift. */
  daily: boolean;
  today: number;
  config: Config;
  /** The config the shift was played with (its city event, legendary rule …). */
  shiftConfig: Config;
  /** Seconds at which each car reached the ring, for the best times of the level. */
  splits: number[];
}

/** What booking a shift gives back for the result banner. */
export interface Booking {
  isNew: boolean;
  previous: number;
  bank: { before: number; after: number };
  /** The news of the shift, in the order it is told (`NoticeQueue.announce`). */
  news: string[];
  /** Hints this shift made due (its level crossed their threshold); the shell decides what to say. */
  due: Hint[];
}

/**
 * Books a finished career shift (not a challenge or trial) into the save: bests, money,
 * level, daily, challenges, mastery, Elite and titles, and says what it earned. No DOM,
 * no sound: the session persists and shows the result.
 */
export function bookShift(save: SaveGame, result: ShiftResult, ctx: ShiftContext): Booking {
  const career = save.career;
  if (ctx.mode === 'mayhem') {
    const previous = save.mayhemBest;
    const isNew = result.flames > previous;
    if (isNew) save.mayhemBest = result.flames;
    save.mayhemBestChain = Math.max(save.mayhemBestChain, result.biggestChain);
    return { isNew, previous, bank: { before: career.money, after: career.money }, news: [], due: [] };
  }
  if (ctx.mode === 'chill') {
    // Nothing is won or lost here: the drive only counts for the records of the mode.
    const previous = save.chillBest;
    const isNew = result.carsSent > previous;
    if (isNew) save.chillBest = result.carsSent;
    save.chillCars += result.carsSent;
    save.chillTime += Math.round(result.time);
    return { isNew, previous, bank: { before: career.money, after: career.money }, news: [], due: [] };
  }
  const unlimited = ctx.mode === 'unlimited';
  const previous = unlimited ? save.unlimitedBest : save.highscore;
  const isNew = (unlimited || result.outcome === 'completed') && result.score > previous;
  if (isNew && unlimited) save.unlimitedBest = result.score;
  else if (isNew) {
    save.highscore = result.score;
    save.highscoreSeed = result.seed;
  }
  const milestones: string[] = [];
  const carsBefore = save.unlimitedBestCars;
  const tierBefore = tierOf(carsBefore);
  if (unlimited) {
    save.unlimitedBestCars = Math.max(save.unlimitedBestCars, result.carsSent);
    milestones.push(...Careers.claimUnlimited(career, save.unlimitedBestCars));
  }
  save.shiftsPlayed += 1;
  const bankBefore = career.money;
  const eliteBefore = Elite.isOpen(career, ctx.config);
  const openBefore = Unlocks.open(career, ctx.config);
  const levelBefore = career.level;
  Careers.record(career, result, ctx.level);
  if (ctx.mode === 'shift') Careers.noteShift(career, result.outcome === 'completed');
  Achievements.record(career, result, ctx.shiftConfig, ctx.mode);
  const news: string[] = milestones.map((id) => S.modes.milestone(id));
  const heat = ctx.mode === 'shift' && !ctx.daily ? ctx.shiftConfig.heat : 0;
  if (heat > 0 && result.outcome === 'completed' && Careers.recordHeat(career, heat, ctx.config)) news.push(S.heat.cleared(heat, Careers.maxHeat(career, ctx.config)));
  // Tailwind: the pay it promised was in this shift; a shift lost within reach of its goal earns the next one (once a day, never chained).
  if (ctx.mode === 'shift' && !ctx.daily) {
    const cars = ctx.shiftConfig.shiftCars;
    const left = cars - result.carsSent;
    const close = result.outcome !== 'completed' && left >= 1 && left <= ctx.config.tailwindMaxLeft && result.carsSent >= cars * ctx.config.tailwindMinShare;
    if (career.tailwind) career.tailwind = false;
    else if (close && career.tailwindDay !== ctx.today) {
      career.tailwind = true;
      career.tailwindDay = ctx.today;
      news.push(S.goals.tailwind(ctx.config.tailwindPay));
    }
  }
  const tier = tierOf(save.unlimitedBestCars);
  if (unlimited && tier && tier !== tierBefore) news.unshift(S.modes.tierUp(tier));
  // The first level cleared: a chest to open within the first minute.
  if (ctx.mode === 'shift' && Careers.giveWelcomeChest(career, levelBefore, ctx.config)) news.push(S.daily.welcomeChest);
  // The first lost shift after the first one: Unlimited is a swipe away, without levels (the swipe hint shows from now on).
  if (ctx.mode === 'shift' && !ctx.daily && result.outcome !== 'completed' && save.shiftsPlayed >= 2 && !save.hints.includes('modes') && !save.hints.includes('unlimitedTip')) {
    save.hints.push('unlimitedTip');
    news.push(S.modes.tryUnlimited);
  }
  // Level 5 cleared: the other modes are a swipe away (the waiting screen keeps a hint until the first swipe).
  const cap = ctx.config.modeHintAfterLevel;
  if (ctx.mode === 'shift' && !save.hints.includes('modes') && ctx.level <= cap && career.level > cap) news.push(S.modes.unlocked);
  // What this shift opened; the Casino opens quietly (PRODUCT.md: nothing points the player there).
  for (const f of Unlocks.open(career, ctx.config)) if (!openBefore.includes(f) && f !== 'casino') news.push(S.unlocks[f]);
  const after = { install: ctx.config.installHintAfterLevel, backup: ctx.config.backupHintAfterLevel, portalLogin: ctx.config.portalLoginAfterLevel };
  const due: Hint[] = (['install', 'backup', 'portalLogin'] as const).filter((h) => !save.hints.includes(h) && career.level > after[h]);
  // Level 10 reached (Leo, 04.10.2026): a small reminder that a friend brings both a chest. By level, not by crossing it:
  // a reminder that had to wait (`takeTip`) comes at the next shift.
  if (ctx.mode === 'shift' && !save.hints.includes('inviteReminder') && career.level >= INVITE_REMINDER_LEVEL) due.push('inviteReminder');
  save.hints.push(...due);
  // The first Perfect Run says what it is and what it pays (early on only: a veteran knows). After that the ring's gold
  // sweep says it (`GameSession.react`): early on nearly every shift is one, and a line every time stops meaning anything.
  if (result.isPerfectRun && !save.hints.includes('perfectRun')) {
    save.hints.push('perfectRun');
    news.push(career.level <= 10 ? S.daily.perfectRunFirst(Math.round(ctx.config.perfectRunPayFactor * 100)) : S.daily.perfectRun);
  }
  const legendary = Careers.completeLegendary(career, result);
  if (legendary) news.push(S.legendary.done(legendary.item));
  const pay = ctx.daily && result.outcome === 'completed' ? Careers.completeDaily(career, ctx.today, ctx.config) : null;
  if (pay !== null) {
    Achievements.countDaily(career);
    save.dailyDay = ctx.today;
    save.dailyScore = result.score;
  }
  if (pay !== null) news.push(S.daily.dailyDone(Fmt.number(pay), career.dailyStreak));
  else if (!ctx.daily && Careers.rollEventChest(career, result, ctx.shiftConfig, result.seed)) news.push(S.daily.eventChestFound);
  else if (Careers.rollLuckyDrop(career, result, ctx.shiftConfig, result.seed)) news.push(S.daily.luckyDrop);
  // An eased shift (fewer cars) would set a best time the level never had.
  if (result.outcome === 'completed' && !ctx.shiftConfig.assisted) {
    const times = [...ctx.splits];
    if ((times[times.length - 1] ?? -1) < result.time - 0.001) times.push(result.time);
    const hadBest = Careers.bestTimes(career, ctx.level) !== null;
    if (Careers.recordTimes(career, times, ctx.level) && hadBest) news.push(S.race.newBest);
  }
  news.push(...Careers.recordChallenges(career, result, ctx.today).map((ch) => S.daily.challengeDone(ch, Fmt.number(challengeReward(ch)))));
  const completed = Careers.recordMastery(career, result);
  // Each Unlimited mark counts once in a career, like the tier it belongs to.
  const markXp = unlimited ? UNLIMITED_MARKS.filter((m) => m > carsBefore && m <= result.carsSent).length * ctx.config.eliteXpMark : 0;
  const heatBonus = heat > 0 && result.outcome === 'completed' ? heatXp(heat, ctx.config) : 0;
  const elite = Careers.recordElite(career, result, ctx.config, markXp + heatBonus);
  const titles = Careers.recordTitles(career, ctx.config);
  if (completed.length > 0) news.push(S.mastery.toast(completed));
  if (elite) {
    // The shift that opens the track says so; later ones show their XP or the level they reached.
    if (!eliteBefore) news.push(S.elite.opened);
    else if (elite.steps.length === 0 && elite.xp > 0) news.push(S.elite.gained(elite.xp));
    for (const step of elite.steps) if (eliteBefore || step.level > 1) news.push(S.elite.reached(step));
  }
  if (titles.length > 0) news.push(S.titles.earned(titles));
  // Level 50 reached (again): Prestige is open, and the player hears about it once per rank.
  if (levelBefore < ctx.config.prestigeLevel && Careers.canPrestige(career, ctx.config)) news.push(S.prestige.available(career.prestige + 1));
  const pass = SeasonPass.record(career, result, ctx.today, ctx.config, markXp + heatBonus);
  if (pass) for (const step of pass.steps) news.push(S.pass.reached(step));
  // A reason to come back tomorrow, from the first shift on: told last, then counted down on the Game tab.
  if (Careers.promiseGift(career, ctx.today)) news.push(S.daily.giftPromised);
  return { isNew, previous, bank: { before: bankBefore, after: career.money }, news, due };
}
