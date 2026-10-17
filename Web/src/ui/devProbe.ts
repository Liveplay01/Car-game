import type { Shell } from './shell';
import { joinsClearRoad } from '../core/ambulance';
import { v } from '../core/vec2';
import type { InputAction } from '../present/session';

/**
 * `npm run dev` only: `window.__probe`, a text view of the game for tests and for Claude, so a check costs a few lines
 * instead of a screenshot. `state()` says where the game is, `play()` runs whole shifts faster than real time.
 */
export type Bot = 'careful' | 'random' | 'none';

const FRAME = 1 / 60;
const SETTLE_FRAMES = 150;

export function installProbe(shell: Shell): void {
  const { game } = shell;
  const view = v(innerWidth, innerHeight);

  const state = (): Snapshot => {
    const { screen, world, save } = game;
    const shift = world.shift;
    const result = screen.k === 'result' ? screen.summary.result : null;
    return {
      screen: screen.k,
      tab: screen.k === 'page' ? screen.tab : null,
      level: save.career.level,
      money: save.career.money,
      shift: { phase: shift.phase, outcome: shift.outcome, cause: shift.failCause, left: shift.carsLeft, sent: shift.carsSent, points: world.score.points, combo: world.score.combo },
      result: result && { outcome: result.outcome, score: result.score, crashes: result.crashes, money: result.money },
      notice: game.noticeText,
      ui: document.getElementById('layers')?.innerText.replace(/\s+/g, ' ').trim().slice(0, 400) ?? '',
      hints: [...save.hints],
      daily: { selected: game.dailySelected, streak: save.career.dailyStreak, chests: [...save.career.chests] },
      ask: game.lastAsk,
      ad: game.gameAd?.reward ?? null,
    };
  };

  const step = (actions: InputAction[] = []): void => void game.frame(FRAME, actions, view, 0);

  const wants = (bot: Bot): boolean => {
    const { world } = game;
    if (!world.queue.isReady) return false;
    if (bot === 'random') return Math.random() < 0.02;
    const car = world.vehicle(world.queue.vehicles[0]);
    return bot === 'careful' && !!car && world.predictedMergeGap(world.layout.player, 0, 40, -Infinity, car.lane) > 0.04 && !joinsClearRoad(world, car, world.layout.player);
  };

  /** From the waiting screen (or a result) plays one shift with the bot; stops when it ends or `seconds` of play ran out. */
  const play = (bot: Bot = 'careful', seconds = 120) => {
    if (game.screen.k === 'result') game.perform({ k: 'restart' });
    let seen = false;
    for (let i = 0; i < seconds / FRAME; i++) {
      if (game.screen.k === 'ready') game.perform({ k: 'startShift' });
      seen ||= game.screen.k === 'playing';
      if (game.screen.k === 'playing' && game.world.shift.phase === 'ended') break;
      step(game.screen.k === 'playing' && wants(bot) ? [{ k: 'tap' }] : []);
    }
    for (let i = 0; i < SETTLE_FRAMES; i++) step();
    return { played: seen, ...state() };
  };

  window.__probe = {
    state,
    play,
    /** Runs `seconds` of game time without any input. */
    wait: (seconds) => {
      for (let i = 0; i < seconds / FRAME; i++) step();
      return state();
    },
    perform: (action) => {
      game.perform(action);
      step();
      return state();
    },
  };
}

export interface Snapshot {
  screen: string;
  tab: string | null;
  level: number;
  money: number;
  shift: { phase: string; outcome: string | null; cause: string | null; left: number | null; sent: number; points: number; combo: number };
  result: { outcome: string; score: number; crashes: number; money: number } | null;
  notice: string | null;
  ui: string;
  /** The one-time hints the save has had, the Daily (open, streak) and the last question that came up by itself. */
  hints: string[];
  daily: { selected: boolean; streak: number; chests: string[] };
  ask: string | null;
  /** The ad the Game tab's pill offers right now (`GameSession.gameAd`), or null. */
  ad: string | null;
}

export interface Probe {
  state(): Snapshot;
  play(bot?: Bot, seconds?: number): Snapshot & { played: boolean };
  wait(seconds: number): Snapshot;
  perform(action: Parameters<Shell['game']['perform']>[0]): Snapshot;
}
