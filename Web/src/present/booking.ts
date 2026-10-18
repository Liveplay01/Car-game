import type { Config } from '../core/config';
import { type SaveGame, type GameMode, type Hint, Careers } from '../core/career';
import { Elite, type EliteBar } from '../core/elite';
import { SeasonPass } from '../core/seasonPass';
import type { ShiftResult } from '../core/events';
import { challengeReward } from '../core/daily';
import { tierOf, UNLIMITED_MARKS } from '../core/tiers';
import { heatXp } from '../core/heat';
import { Mafia } from '../core/mafia';
import { Achievements } from '../core/achievements';
import { S, Fmt } from './strings';
import type { Tip } from './notices';
import { touchFirst } from '../storage/device';

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
  /** Tips for the waiting screen's top card (`TipQueue`), not lines of news. */
  tips: Tip[];
  /** The Elite track after the shift, for the ring on the result; null while the track is shut. */
  elite: EliteBar | null;
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
    return { isNew, previous, bank: { before: career.money, after: career.money }, news: [], tips: [], elite: null, due: [] };
  }
  const unlimited = ctx.mode === 'unlimited';
  const previous = unlimited ? save.unlimitedBest : save.highscore;
  const isNew = (unlimited || result.outcome === 'completed') && result.score > previous;
  if (isNew && unlimited) {
    save.unlimitedBest = result.score;
    save.unlimitedBestRevived = result.revived;
  }
  else if (isNew) {
    save.highscore = result.score;
    save.highscoreSeed = result.seed;
  }
  const milestones: string[] = [];
  const tips: Tip[] = [];
  const carsBefore = save.unlimitedBestCars;
  const tierBefore = tierOf(carsBefore);
  if (unlimited) {
    save.unlimitedBestCars = Math.max(save.unlimitedBestCars, result.carsSent);
    milestones.push(...Careers.claimUnlimited(career, save.unlimitedBestCars));
  }
  save.shiftsPlayed += 1;
  const bankBefore = career.money;
  const eliteBefore = Elite.isOpen(career, ctx.config);
  const levelBefore = career.level;
  Careers.record(career, result, ctx.level);
  if (ctx.mode === 'shift') Careers.noteShift(career, result.outcome === 'completed');
  Achievements.record(career, result, ctx.shiftConfig, ctx.mode);
  const news: string[] = milestones.map((id) => S.modes.milestone(id));
  // A late loan takes its share of the pay before anything else is booked against it.
  const garnished = Mafia.garnish(career, career.money - bankBefore, Date.now(), ctx.config);
  if (garnished > 0) news.push(S.mafia.garnished(Fmt.number(garnished), career.loan === null));
  const heat = ctx.mode === 'shift' && !ctx.daily ? ctx.shiftConfig.heat : 0;
  if (heat > 0 && result.outcome === 'completed' && Careers.recordHeat(career, heat, ctx.config)) news.push(S.heat.cleared(heat));
  // Tailwind: the pay it promised was in this shift; a shift lost within reach of its goal earns the next one (once a day, never chained).
  if (ctx.mode === 'shift' && !ctx.daily) {
    const cars = ctx.shiftConfig.shiftCars;
    const left = cars - result.carsSent;
    const close = result.outcome !== 'completed' && !result.revived && left >= 1 && left <= ctx.config.tailwindMaxLeft && result.carsSent >= cars * ctx.config.tailwindMinShare;
    if (career.tailwind) career.tailwind = false;
    else if (close && career.tailwindDay !== ctx.today) {
      career.tailwind = true;
      career.tailwindDay = ctx.today;
    }
  }
  const tier = tierOf(save.unlimitedBestCars);
  if (unlimited && tier && tier !== tierBefore) news.unshift(S.modes.tierUp(tier));
  // The first level cleared: a chest to open within the first minute.
  if (ctx.mode === 'shift') Careers.giveWelcomeChest(career, levelBefore, ctx.config);
  // The first lost shift after the first one: Unlimited is a swipe away, without levels (the swipe hint shows from now on).
  if (ctx.mode === 'shift' && !ctx.daily && result.outcome !== 'completed' && save.shiftsPlayed >= 2 && !save.hints.includes('modes') && !save.hints.includes('unlimitedTip')) {
    save.hints.push('unlimitedTip');
    tips.push(touchFirst ? S.modes.tryUnlimited : S.modes.tryUnlimitedKeys);
  }
  // What this shift opened says nothing here: the place gets a dot and introduces itself (`Intros`).
  const due: Hint[] = !save.hints.includes('portalLogin') && career.level > ctx.config.portalLoginAfterLevel ? ['portalLogin'] : [];
  // Notifications after the way back was asked for (`tomorrow`) as installing: on a later visit, the one tip each has.
  // Asked again at a streak of two days (08.10.2026), when a reminder before it breaks is worth something.
  if (save.hints.includes('tomorrow') && !save.hints.includes('notifications')) due.push('notifications');
  if (ctx.daily && career.dailyStreak >= 2 && save.hints.includes('notifications') && !save.hints.includes('notificationsStreak')) due.push('notificationsStreak');
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
    save.dailyTries = career.adRetryDay === ctx.today ? 2 : 1;
  }
  // The way back (Leo, 16.10.2026): the first Daily done says "back tomorrow", so that is when the visit's one ask goes to it
  // (the shell picks installing or notifications); a player who skips the Daily is asked after `tomorrowAskAfterLevel`.
  if (!save.hints.includes('tomorrow') && (career.dailyDone >= 0 || career.level > ctx.config.tomorrowAskAfterLevel)) due.unshift('tomorrow');
  save.hints.push(...due);
  // The Daily's pay shows in the result's money and its streak on the next Daily; a chest found says nothing either:
  // the Game tab's pill and the Shop's badge already show it.
  if (pay === null && (ctx.daily || !Careers.rollEventChest(career, result, ctx.shiftConfig, result.seed))) Careers.rollLuckyDrop(career, result, ctx.shiftConfig, result.seed);
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
  const xpBefore = career.eliteXp;
  const elite = Careers.recordElite(career, result, ctx.config, markXp + heatBonus);
  const titles = Careers.recordTitles(career, ctx.config);
  if (completed.length > 0) news.push(S.mastery.toast(completed));
  if (elite) {
    // The shift that opens the track says so; later ones show their XP or the level they reached.
    if (!eliteBefore) news.push(S.elite.opened);
    // A level climbed shows on the ring (`RingSignals.elite`); only a skin it brings is told.
    for (const step of elite.steps) if (step.item && (eliteBefore || step.level > 1)) news.push(S.elite.reached(step));
  }
  if (titles.length > 0) news.push(S.titles.earned(titles));
  // Level 50 reached (again): Prestige is open, and the player hears about it once per rank.
  if (levelBefore < ctx.config.prestigeLevel && Careers.canPrestige(career, ctx.config)) news.push(S.prestige.available(career.prestige + 1));
  const pass = SeasonPass.record(career, result, ctx.today, ctx.config, markXp + heatBonus);
  if (pass) for (const step of pass.steps) if (step.reward.k !== 'chest') news.push(S.pass.reached(step));
  // A reason to come back tomorrow, from the first shift on: not told, but counted down on the Game tab.
  Careers.promiseGift(career, ctx.today);
  return { isNew, previous, bank: { before: bankBefore, after: career.money }, news, tips, elite: elite ? Elite.bar(career, xpBefore, ctx.config) : null, due };
}
