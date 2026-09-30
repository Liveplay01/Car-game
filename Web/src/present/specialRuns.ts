import { type Career, type GameMode, Careers } from '../core/career';
import type { Config } from '../core/config';
import type { ShiftResult } from '../core/events';
import type { ChallengeSpec } from '../core/challenge';
import { type Trial, trialPassed } from '../core/trials';
import { weekNumber } from '../core/weekly';
import type { ShiftSummary, RunCard } from './hud';
import { S, Fmt, money as moneyText } from './strings';

/**
 * A shift played for itself, outside the career: a friend's challenge link or a mastery
 * trial. It always starts from a fresh world with its own seed, so the traffic is the same for
 * everyone; it earns no money or levels (a trial pays its reward once).
 */
export type SpecialRun = { k: 'challenge'; spec: ChallengeSpec } | { k: 'trial'; trial: Trial };

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
  const t = run.trial;
  const passed = trialPassed(t, result);
  // The Weekly Elite pays once a week (with a Premium Chest); every other trial once ever.
  const weekly = t.id === 'weekly';
  const first = passed && (weekly ? !Careers.isWeeklyDone(career, weekNumber(today)) : !career.trialsDone.includes(t.id));
  if (first && weekly) {
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
      line: passed && !first ? S.run.passedBefore : S.trials.goal(t),
      lineColor: passed ? 'accent' : 'muted',
      right: [S.run.trial, S.trials.level(t.level)],
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
