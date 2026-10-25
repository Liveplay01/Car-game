import type { Shell } from './shell';
import { joinsClearRoad } from '../core/ambulance';
import { startDucks } from '../core/ducks';
import { v } from '../core/vec2';
import type { InputAction } from '../present/session';

/**
 * `npm run dev` only: `window.__probe`, a text view of the game for tests and for Claude, so a check costs a few lines
 * instead of a screenshot. `state()` says where the game is, `play()` runs whole shifts faster than real time.
 */
export type Bot = 'careful' | 'random' | 'reckless' | 'none';

const FRAME = 1 / 60;
const SETTLE_FRAMES = 150;

export function installProbe(shell: Shell): void {
  const { game } = shell;
  const view = v(innerWidth, innerHeight);

  /** The drift car: where it is and how it slides (slip in degrees), or the phase when none is out. */
  const drift = (): Snapshot['drift'] => {
    const d = game.world.drift;
    if (d.kind !== 'on') return d.kind;
    const veh = game.world.vehicle(d.vehicle);
    return { phase: veh?.phase.kind ?? 'gone', slip: Math.round((d.slip * 180) / Math.PI), steer: Math.round((d.steer * 180) / Math.PI), throttle: d.throttle, lifts: d.lifts, calming: d.calming >= 0 };
  };

  const state = (): Snapshot => {
    const { screen, world, save } = game;
    const shift = world.shift;
    const result = screen.k === 'result' ? screen.summary.result : null;
    return {
      screen: screen.k,
      tab: screen.k === 'page' ? screen.tab : null,
      level: save.career.level,
      money: save.career.money,
      shift: { phase: shift.phase, outcome: shift.outcome, cause: shift.failCause, left: shift.carsLeft, sent: shift.carsSent, points: world.score.points, combo: world.score.combo, event: world.config.cityEvent },
      result: result && { outcome: result.outcome, score: result.score, crashes: result.crashes, money: result.money },
      notice: game.noticeText,
      ui: document.getElementById('layers')?.innerText.replace(/\s+/g, ' ').trim().slice(0, 400) ?? '',
      hints: [...save.hints],
      daily: { selected: game.dailySelected, streak: save.career.dailyStreak, chests: [...save.career.chests] },
      ask: game.lastAsk,
      ad: game.gameAd?.reward ?? null,
      revive: game.reviveOffer,
      revived: game.world.revives,
      drift: drift(),
      boss: world.config.convoy ? { kind: world.config.bossKind, criminal: world.criminal.kind, loot: world.score.bossLoot, grows: world.config.bossLoot } : null,
    };
  };

  const step = (actions: InputAction[] = []): void => void game.frame(FRAME, actions, view, 0);

  const wants = (bot: Bot): boolean => {
    const { world } = game;
    if (!world.queue.isReady) return false;
    if (bot === 'random') return Math.random() < 0.02;
    // Taps whenever a car waits: crashes soon, for what follows a crash (Keep driving).
    if (bot === 'reckless') return true;
    const car = world.vehicle(world.queue.vehicles[0]);
    return bot === 'careful' && !!car && world.predictedMergeGap(world.layout.player, 0, 40, -Infinity, car.lane) > 0.04 && !joinsClearRoad(world, car, world.layout.player);
  };

  /** From the waiting screen (or a result) plays one shift with the bot; stops when it ends or `seconds` of play ran out. */
  const play = (bot: Bot = 'careful', seconds = 120, settle = SETTLE_FRAMES) => {
    if (game.screen.k === 'result') game.perform({ k: 'restart' });
    let seen = false;
    for (let i = 0; i < seconds / FRAME; i++) {
      if (game.screen.k === 'ready') game.perform({ k: 'startShift' });
      seen ||= game.screen.k === 'playing';
      if (game.screen.k === 'playing' && game.world.shift.phase === 'ended') break;
      step(game.screen.k === 'playing' && wants(bot) ? [{ k: 'tap' }] : []);
    }
    for (let i = 0; i < settle; i++) step();
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
    /** The duck family (`core/ducks.ts`) sets off now, whatever the seed says. */
    ducks: () => {
      game.world.ducks = startDucks(game.world);
      game.world.ducksDone = true;
      step();
      return state();
    },
    /** Puts a notice up at once, as a reply would (the top card on the Game tab grows to carry it). */
    say: (text) => {
      game.showNotice(text);
      step();
      return state();
    },
    /** Milliseconds per frame, building the scene and drawing it, on whatever is showing (a shift is started if the game waits). */
    perf: (frames = 300) => {
      if (game.screen.k === 'ready') game.perform({ k: 'startShift' });
      const drawer = shell['drawer'];
      const built: number[] = [];
      const drawn: number[] = [];
      let items = 0;
      for (let i = 0; i < 60 + frames; i++) {
        const t0 = performance.now();
        const list = game.frame(FRAME, [], view, 0);
        const t1 = performance.now();
        drawer.draw(list);
        if (i < 60) continue;
        built.push(t1 - t0);
        drawn.push(performance.now() - t1);
        items += list.items.length;
      }
      const spread = (ms: number[]): Spread => {
        const sorted = [...ms].sort((a, b) => a - b);
        return { avg: +(ms.reduce((a, b) => a + b, 0) / ms.length).toFixed(2), p95: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2) };
      };
      return { screen: game.screen.k, items: Math.round(items / frames), build: spread(built), draw: spread(drawn) };
    },
  };
}

export interface Spread {
  avg: number;
  p95: number;
}

export interface Snapshot {
  screen: string;
  tab: string | null;
  level: number;
  money: number;
  shift: { phase: string; outcome: string | null; cause: string | null; left: number | null; sent: number; points: number; combo: number; event: string | null };
  result: { outcome: string; score: number; crashes: number; money: number } | null;
  notice: string | null;
  ui: string;
  /** The one-time hints the save has had, the Daily (open, streak) and the last question that came up by itself. */
  hints: string[];
  daily: { selected: boolean; streak: number; chests: string[] };
  ask: string | null;
  drift: string | { phase: string; slip: number; steer: number; throttle: boolean; lifts: number; calming: boolean };
  /** A syndicate shift: which boss, where the criminal is, and the loot grown so far. */
  boss: { kind: string; criminal: string; loot: number; grows: boolean } | null;
  /** The ad the Game tab's pill offers right now (`GameSession.gameAd`), or null. */
  ad: string | null;
  /** Seconds the offer to keep driving still stands (null: none on screen), and how often this run went on. */
  revive: number | null;
  revived: number;
}

export interface Probe {
  state(): Snapshot;
  play(bot?: Bot, seconds?: number, settle?: number): Snapshot & { played: boolean };
  wait(seconds: number): Snapshot;
  perform(action: Parameters<Shell['game']['perform']>[0]): Snapshot;
  say(text: string): Snapshot;
  ducks(): Snapshot;
  perf(frames?: number): { screen: string; items: number; build: Spread; draw: Spread };
}
