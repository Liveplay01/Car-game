import type { Config } from '../core/config';
import { type SaveGame, type GameMode, type Hint, Careers } from '../core/career';
import { Elite } from '../core/elite';
import type { ShiftResult } from '../core/events';
import { challengeReward } from '../core/daily';
import { Unlocks } from '../core/unlocks';
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
  const unlimited = ctx.mode === 'unlimited';
  const previous = unlimited ? save.unlimitedBest : save.highscore;
  const isNew = (unlimited || result.outcome === 'completed') && result.score > previous;
  if (isNew && unlimited) save.unlimitedBest = result.score;
  else if (isNew) {
    save.highscore = result.score;
    save.highscoreSeed = result.seed;
  }
  if (unlimited) save.unlimitedBestCars = Math.max(save.unlimitedBestCars, result.carsSent);
  save.shiftsPlayed += 1;
  const bankBefore = career.money;
  const eliteBefore = Elite.isOpen(career, ctx.config);
  const openBefore = Unlocks.open(career, ctx.config);
  const levelBefore = career.level;
  Careers.record(career, result, ctx.level);
  const news: string[] = [];
  // The first level cleared: a chest to open within the first minute.
  if (ctx.mode === 'shift' && Careers.giveWelcomeChest(career, levelBefore, ctx.config)) news.push(S.daily.welcomeChest);
  // Level 5 cleared: the other modes are a swipe away (the waiting screen keeps a hint until the first swipe).
  const cap = ctx.config.modeHintAfterLevel;
  if (ctx.mode === 'shift' && !save.hints.includes('modes') && ctx.level <= cap && career.level > cap) news.push(S.modes.unlocked);
  // What this shift opened; the Casino opens quietly (PRODUCT.md: nothing points the player there).
  for (const f of Unlocks.open(career, ctx.config)) if (!openBefore.includes(f) && f !== 'casino') news.push(S.unlocks[f]);
  const due = (['install', 'backup'] as const).filter((h) => !save.hints.includes(h) && career.level > (h === 'install' ? ctx.config.installHintAfterLevel : ctx.config.backupHintAfterLevel));
  save.hints.push(...due);
  if (result.isPerfectRun) {
    // The first one says what it is and what it pays (early on only: a veteran knows).
    const first = !save.hints.includes('perfectRun');
    if (first) save.hints.push('perfectRun');
    news.push(first && career.level <= 10 ? S.daily.perfectRunFirst(Math.round(ctx.config.perfectRunPayFactor * 100)) : S.daily.perfectRun);
  }
  const legendary = Careers.completeLegendary(career, result);
  if (legendary) news.push(S.legendary.done(legendary.item));
  const pay = ctx.daily && result.outcome === 'completed' ? Careers.completeDaily(career, ctx.today, ctx.config) : null;
  if (pay !== null) news.push(S.daily.dailyDone(Fmt.number(pay), career.dailyStreak));
  else if (!ctx.daily && Careers.rollEventChest(career, result, ctx.shiftConfig, result.seed)) news.push(S.daily.eventChestFound);
  else if (Careers.rollLuckyDrop(career, result, ctx.shiftConfig, result.seed)) news.push(S.daily.luckyDrop);
  if (result.outcome === 'completed') {
    const times = [...ctx.splits];
    if ((times[times.length - 1] ?? -1) < result.time - 0.001) times.push(result.time);
    const hadBest = Careers.bestTimes(career, ctx.level) !== null;
    if (Careers.recordTimes(career, times, ctx.level) && hadBest) news.push(S.race.newBest);
  }
  news.push(...Careers.recordChallenges(career, result, ctx.today).map((ch) => S.daily.challengeDone(ch, Fmt.number(challengeReward(ch)))));
  const completed = Careers.recordMastery(career, result);
  const elite = Careers.recordElite(career, result, ctx.config);
  const titles = Careers.recordTitles(career, ctx.config);
  if (completed.length > 0) news.push(S.mastery.toast(completed));
  if (elite) {
    // The shift that opens the track says so; later ones show their XP or the level they reached.
    if (!eliteBefore) news.push(S.elite.opened);
    else if (elite.steps.length === 0 && elite.xp > 0) news.push(S.elite.gained(elite.xp));
    for (const step of elite.steps) if (eliteBefore || step.level > 1) news.push(S.elite.reached(step));
  }
  if (titles.length > 0) news.push(S.titles.earned(titles));
  return { isNew, previous, bank: { before: bankBefore, after: career.money }, news, due };
}
