import type { Config } from '../core/config';
import type { Career, GameMode } from '../core/career';
import type { ShiftOutcome } from '../core/events';
import type { Burst } from './rewardBurst';
import { S } from './strings';

/**
 * The one-time moments of a new career (Leo, 16.10.2026): the first shift won and Level 6 cleared.
 * A Prestige starts the levels over, but the player has seen both: neither comes back.
 */
export function newPlayerMoment(career: Career, mode: GameMode, daily: boolean, outcome: ShiftOutcome, levelBefore: number, config: Config): Burst | null {
  if (career.prestige > 0 || mode !== 'shift' || daily || outcome !== 'completed') return null;
  if (levelBefore < config.welcomeChestLevel && career.level >= config.welcomeChestLevel) {
    return { kind: 'firstWin', title: S.moments.firstWin, line: S.moments.firstWinLine, color: 'accent', power: 1.4 };
  }
  const cap = config.modeHintAfterLevel;
  if (levelBefore <= cap && career.level > cap) {
    return { kind: 'levelFive', title: S.moments.levelFive(cap), line: S.moments.levelFiveLine, color: 'coin', power: 1.5 };
  }
  return null;
}
