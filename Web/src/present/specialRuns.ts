import { type Career, type GameMode, Careers } from '../core/career';
import type { Config } from '../core/config';
import type { ShiftResult } from '../core/events';
import type { ChallengeSpec } from '../core/challenge';
import { BOSS_KINDS } from '../core/config';
import { type Trial, trialPassed, rushTrial, RUSH_ID, RUSH_REWARD } from '../core/trials';
import { weekNumber } from '../core/weekly';
import { tourStopOf, completeStop, stopDoneKey, tourStopsDone } from '../core/tours';
import type { ShiftSummary, RunCard } from './hud';
import { S, Fmt, money as moneyText } from './strings';

/**
 * A shift played for itself, outside the career: a friend's challenge link or a mastery
 * trial. It always starts from a fresh world with its own seed, so the traffic is the same for
 * everyone; it earns no money or levels (a trial pays its reward once).
 */
export type SpecialRun = { k: 'challenge'; spec: ChallengeSpec } | { k: 'trial'; trial: Trial; rush?: RushRun };

/**
 * A Boss Rush in progress (core/trials.ts): which boss is next, the seconds of the shifts finished
 * so far, and how the last shift ended (`next`: on to the next boss, `cleared`: all eight down,
 * `over`: a round was lost). `advanceRush` turns that into the next shift.
 */
export interface RushRun {
  step: number;
  time: number;
  state: 'next' | 'cleared' | 'over' | null;
}

export const newRush = (): SpecialRun => ({ k: 'trial', trial: rushTrial(0), rush: { step: 0, time: 0, state: null } });

/**
 * After a rush shift ended: the shift to play next. A boss caught means the next boss; a lost
 * round, or a clear, starts the rush over at the first. Without an outcome (nothing ended) the run stays.
 */
export function advanceRush(run: SpecialRun | null): SpecialRun | null {
  if (!run || run.k !== 'trial' || !run.rush || run.rush.state === null) return run;
  const { step, time, state } = run.rush;
  if (state === 'next') return { k: 'trial', trial: rushTrial(step + 1), rush: { step: step + 1, time, state: null } };
  return newRush();
}

/** What a finished challenge or trial puts on its result card. */
export type RunSummary = NonNullable<ShiftSummary['run']>;

/**
 * A finished challenge or trial: what its result says, and what it pays (a trial's reward
 * once, the Weekly Elite once a week). Pays into `career`; `news` are the lines to announce,
 * `shareable` the challenge a friend can play next (null after a trial).
 */
export function settleSpecial(run: SpecialRun, result: ShiftResult, career: Career, today: number, config: Config): { summary: RunSummary; shareable: ChallengeSpec | null; news: string[] } {
  const news: string[] = [];
  if (run.k === 'challenge') {
    const spec = run.spec;
    const mayhem = spec.mode === 'mayhem';
    const mine = mayhem ? result.flames : result.score;
    const beaten = mine > spec.target;
    return {
      summary: {
        caption: beaten ? S.run.beaten : S.run.missed,
        color: beaten ? 'accent' : 'muted',
        line: beaten ? S.run.ahead(Fmt.number(mine - spec.target)) : S.run.short(Fmt.number(spec.target - mine)),
        lineColor: beaten ? 'accent' : 'muted',
        right: [S.run.toBeat, Fmt.number(spec.target)],
      },
      // Sharing now sends the same shift back with your own score to beat.
      shareable: { ...spec, target: mine },
      news,
    };
  }
  if (run.rush) return settleRush(run, run.rush, result, career, config);
  const t = run.trial;
  const passed = trialPassed(t, result);
  // The Weekly Elite pays once a week (with a Premium Chest); every other trial once ever.
  const weekly = t.id === 'weekly';
  const stop = t.tour ? tourStopOf(t.id, today) : null;
  const first = passed && (stop ? !career.toursDone.includes(stopDoneKey(stop.run.key, stop.stop)) : weekly ? !Careers.isWeeklyDone(career, weekNumber(today)) : !career.trialsDone.includes(t.id));
  if (first && stop) {
    const paid = completeStop(career, stop.run, stop.stop);
    const total = stop.run.tour.stops.length;
    if (paid) news.push(S.tours.stopDone(stop.stop, total, S.tours.reward(paid.reward)));
    if (paid && tourStopsDone(career, stop.run) === total) news.push(S.tours.complete(stop.run.tour.id));
  } else if (first && weekly) {
    const pay = Careers.completeWeekly(career, weekNumber(today), config);
    if (pay !== null) news.push(S.weekly.done(Fmt.number(pay)));
  } else if (first) {
    career.trialsDone.push(t.id);
    career.money += t.reward;
    const titles = Careers.recordTitles(career, config);
    if (titles.length > 0) news.push(S.titles.earned(titles));
  }
  return {
    summary: {
      caption: passed ? S.run.passed : S.run.failed,
      color: passed ? 'accent' : 'destructive',
      line: passed && !first ? (stop ? S.tours.passedBefore : S.run.passedBefore) : S.trials.goal(t),
      lineColor: passed ? 'accent' : 'muted',
      right: stop ? [S.tours.caption, S.tours.stop(stop.stop, stop.run.tour.stops.length)] : [S.run.trial, S.trials.level(t.level)],
    },
    shareable: null,
    news,
  };
}

/** One shift of a Boss Rush done (or lost): the clock, the furthest boss, the first clear's reward and the best time. */
function settleRush(run: Extract<SpecialRun, { k: 'trial' }>, rush: RushRun, result: ShiftResult, career: Career, config: Config): { summary: RunSummary; shareable: null; news: string[] } {
  const news: string[] = [];
  const total = BOSS_KINDS.length;
  const passed = trialPassed(run.trial, result);
  if (!passed) {
    rush.state = 'over';
    career.rushFurthest = Math.max(career.rushFurthest, rush.step);
    return {
      summary: { caption: S.rush.over, color: 'destructive', line: S.rush.overLine(rush.step, total), lineColor: 'muted', right: [S.rush.caption, S.rush.step(rush.step + 1, total)] },
      shareable: null,
      news,
    };
  }
  rush.time += result.time;
  const done = rush.step + 1;
  career.rushFurthest = Math.max(career.rushFurthest, done);
  if (done < total) {
    rush.state = 'next';
    return {
      summary: { caption: S.rush.caught(done, total), color: 'accent', line: S.rush.nextLine(BOSS_KINDS[done]), lineColor: 'accent', right: [S.rush.clock, S.rush.time(rush.time)] },
      shareable: null,
      news,
    };
  }
  rush.state = 'cleared';
  const first = !career.trialsDone.includes(RUSH_ID);
  const record = career.rushBest === 0 || rush.time < career.rushBest;
  if (record) career.rushBest = Math.round(rush.time * 10) / 10;
  if (first) {
    career.trialsDone.push(RUSH_ID);
    career.money += RUSH_REWARD;
    const titles = Careers.recordTitles(career, config);
    if (titles.length > 0) news.push(S.titles.earned(titles));
  }
  return {
    summary: {
      caption: S.rush.cleared,
      color: 'accent',
      line: first ? S.rush.firstLine(moneyText(Fmt.number(RUSH_REWARD))) : record ? S.rush.recordLine : S.rush.bestLine(S.rush.time(career.rushBest)),
      lineColor: 'accent',
      right: [S.rush.clock, S.rush.time(rush.time)],
    },
    shareable: null,
    news,
  };
}

/**
 * How the waiting screen names the shift: a challenge or trial being played, or a Legendary
 * Shift in the career (its rule and its Premium Chest). Null for a plain shift.
 */
export function runCard(special: SpecialRun | null, config: Config, mode: GameMode, versusSelected: boolean, career: Career, today: number): RunCard | null {
  const rule = config.legendary;
  if (!special && rule && mode === 'shift' && !versusSelected) {
    return { caption: S.legendary.caption, color: 'coin', badge: S.legendary.name(rule), line: S.legendary.line(rule), right: [S.legendary.reward, S.legendary.chest] };
  }
  if (!special) return null;
  if (special.k === 'challenge') return { caption: S.run.challenge, color: 'accent', badge: S.run.fromFriend, line: null, right: [S.run.toBeat, Fmt.number(special.spec.target)] };
  if (special.rush) {
    const rush = special.rush;
    const first = !career.trialsDone.includes(RUSH_ID);
    return {
      caption: S.rush.caption,
      color: 'hazard',
      badge: S.rush.step(rush.step + 1, BOSS_KINDS.length),
      line: S.rush.shiftLine(BOSS_KINDS[rush.step], rush.step === 0),
      right: rush.step > 0 ? [S.rush.clock, S.rush.time(rush.time)] : first ? [S.run.rewardCaption, moneyText(Fmt.number(RUSH_REWARD))] : [S.rush.best, S.rush.time(career.rushBest)],
    };
  }
  const stop = special.trial.tour ? tourStopOf(special.trial.id, today) : null;
  if (stop) {
    const done = career.toursDone.includes(stopDoneKey(stop.run.key, stop.stop));
    const reward = stop.run.tour.stops[stop.stop - 1].reward;
    return {
      caption: S.tours.caption,
      color: 'hazard',
      badge: `${S.tours.name(stop.run.tour.id)} · ${S.tours.stop(stop.stop, stop.run.tour.stops.length)}`,
      line: S.trials.goal(special.trial),
      right: done ? [S.trials.passed, '✓'] : [S.run.rewardCaption, S.tours.rewardShort(reward)],
    };
  }
  const weekly = special.trial.id === 'weekly';
  const done = weekly ? Careers.isWeeklyDone(career, weekNumber(today)) : career.trialsDone.includes(special.trial.id);
  return {
    caption: weekly ? S.weekly.caption : S.run.trial,
    color: weekly ? 'coin' : 'hazard',
    badge: S.trials.name(special.trial.id),
    line: S.trials.goal(special.trial),
    right: done ? [S.trials.passed, '✓'] : [S.run.rewardCaption, moneyText(Fmt.number(special.trial.reward))],
  };
}
