import { World, STEP } from '../core/world';
import type { GameEvent, ShiftResult } from '../core/events';
import { type Career, type GameMode, shiftConfig, recordShift, type ShiftRecord } from '../core/career';
import { randomSeed } from '../core/rng';
import { Scoring } from '../core/scoring';
import { cosmetic, type SkinLook } from '../core/loot';
import { Renderer, type IslandText } from '../renderer/renderer';
import { Effects, THEME } from '../renderer/effects';
import type { Sound, Haptics } from '../audio/audio';
import { criminalTimeLeft } from '../core/specials';
import { v } from '../core/vec2';

export type SessionPhase = 'ready' | 'playing' | 'ended';

export interface HudState {
  phase: SessionPhase;
  paused: boolean;
  mode: GameMode;
  level: number;
  score: number;
  carsLeft: number | null;
  carsSent: number;
  rushHour: boolean;
  combo: number;
  multiplier: number;
  policeCrashes: number;
  maxPoliceCrashes: number;
  wantedSeconds: number | null;
  wantedWarning: boolean;
  canDispatch: boolean;
  shiftCars: number;
}

export interface SessionHooks {
  onEnded(result: ShiftResult, record: ShiftRecord, mode: GameMode, level: number): void;
  onPhase(phase: SessionPhase): void;
  save(): void;
}

/**
 * The frame loop for the web platform (GamePresentation's `GameSession`): fixed 120 Hz steps
 * with interpolation in between, taps with timestamps, and events turned into picture,
 * sound and haptics. The world itself knows nothing of any of this.
 */
export class GameSession {
  world!: World;
  mode: GameMode = 'shift';
  phase: SessionPhase = 'ready';
  paused = false;
  readonly effects = new Effects();
  private accumulator = 0;
  private lastFrame = 0;
  private running = false;
  private rafId = 0;
  /** Slow-mo: 0.2× for 0.45 s on a takedown or the crash that ends the shift. */
  private slowmo = 0;
  private endedAt = 0;
  private realTime = 0;
  private comboPulse = 10;
  private inFlow = false;
  private levelOfShift = 1;
  lastResult: ShiftResult | null = null;
  lastRecord: ShiftRecord | null = null;
  reduceMotion = false;
  skins: SkinLook[] = [];

  constructor(
    private readonly renderer: Renderer,
    private readonly career: Career,
    private readonly sound: Sound,
    private readonly haptics: Haptics,
    private readonly hooks: SessionHooks,
  ) {
    this.refreshSkins();
    this.newShift(null);
  }

  refreshSkins(): void {
    this.skins = this.career.carSkins.map((id) => cosmetic(id)?.look).filter((x): x is SkinLook => !!x);
  }

  /** A fresh shift for the current mode; continues the old world's traffic if there is one. */
  newShift(previous: World | null): void {
    const seed = randomSeed();
    const config = shiftConfig(this.career, this.mode, seed);
    this.levelOfShift = config.level;
    this.world = previous ? previous.nextShift(config, seed) : new World(config, seed, { startsOnFirstTap: true });
    this.world.takeEvents();
    this.phase = 'ready';
    this.lastResult = null;
    this.comboPulse = 10;
    this.inFlow = false;
    this.hooks.onPhase(this.phase);
  }

  setMode(mode: GameMode): void {
    if (mode === this.mode || this.phase === 'playing') return;
    this.mode = mode;
    this.newShift(this.world);
  }

  /** The level shown before the shift starts, e.g. after upgrades were bought. */
  refreshReadyShift(): void {
    if (this.phase === 'ready' && this.world.shift.phase === 'waiting') this.newShift(this.world);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrame = performance.now();
    const loop = (now: number): void => {
      if (!this.running) return;
      this.frame(now);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  get isRunning(): boolean {
    return this.running;
  }

  pause(): void {
    if (this.phase !== 'playing' || this.paused) return;
    this.paused = true;
    this.sound.suspend();
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.lastFrame = performance.now();
    this.sound.resume();
  }

  /** Gives up the running shift: points stay, no bonus, no highscore. */
  endShiftNow(): void {
    if (this.phase !== 'playing') return;
    this.paused = false;
    this.world.endShift('struckOut', this.world.time);
  }

  restart(): void {
    this.paused = false;
    if (this.phase === 'playing') {
      // A restart is a fresh try at the same level: nothing is booked.
      this.world.shift.phase = 'ended';
      this.world.takeEvents();
    }
    this.effects.clear();
    this.newShift(this.world);
  }

  /**
   * A tap on the play field. `eventTime` is the event's timestamp (performance.now()); the
   * world gets the exact moment, not the next frame (FOUNDATION.md 4.1).
   */
  tap(eventTime: number): void {
    if (this.paused) return;
    if (this.phase === 'ended') {
      // The first 0.4 s are locked, so a hectic tap does not skip the result.
      if (this.realTime - this.endedAt < 0.4) return;
      this.effects.clear();
      this.newShift(this.world);
      return;
    }
    const since = Math.max(0, (eventTime - this.lastFrame) / 1000) * this.timeScale;
    this.world.tap(this.world.time + this.accumulator + since);
  }

  dispatch(): void {
    if (this.paused || this.phase === 'ended') return;
    if (this.world.dispatchPolice()) {
      this.haptics.play(20);
    } else {
      this.sound.play('denied');
    }
  }

  private get timeScale(): number {
    return this.slowmo > 0 ? 0.2 : 1;
  }

  private frame(now: number): void {
    const realDt = Math.min(0.1, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    this.realTime += realDt;
    if (!this.paused) {
      const scale = this.timeScale;
      if (this.slowmo > 0) this.slowmo = Math.max(0, this.slowmo - realDt);
      const simDt = realDt * scale;
      this.accumulator += simDt;
      let steps = 0;
      while (this.accumulator >= STEP && steps < 40) {
        this.world.step();
        this.accumulator -= STEP;
        steps++;
        this.handle(this.world.takeEvents());
      }
      if (steps >= 40) this.accumulator = 0;
      this.effects.update(simDt);
      this.comboPulse += simDt;
      this.syncPhase();
    }
    this.effects.reduceMotion = this.reduceMotion;
    this.renderer.render(
      {
        world: this.world,
        alpha: Math.min(1, this.accumulator / STEP),
        time: this.realTime,
        effects: this.effects,
        skins: this.skins,
        island: this.islandText(),
        reduceMotion: this.reduceMotion,
        dim: this.phase === 'ended' ? 1 : 0,
      },
      realDt,
    );
  }

  private syncPhase(): void {
    const s = this.world.shift.phase;
    const phase: SessionPhase = s === 'waiting' ? 'ready' : s === 'ended' ? 'ended' : 'playing';
    if (phase !== this.phase) {
      this.phase = phase;
      if (phase === 'ended') this.endedAt = this.realTime;
      this.hooks.onPhase(phase);
    }
  }

  private islandText(): IslandText | null {
    const w = this.world;
    if (this.phase === 'ready') {
      if (w.queue.state.kind === 'filling') return null;
      const first = !this.career.tutorialDone;
      return { title: 'Tap to start', sub: first ? 'Send cars into the gaps' : undefined };
    }
    if (this.phase === 'ended') {
      const r = this.lastResult;
      if (!r) return null;
      if (this.mode === 'unlimited') return { title: 'Tap to go again', sub: `${r.carsSent} cars sent` };
      return r.outcome === 'completed'
        ? { title: `Tap for level ${this.levelOfShift + 1}`, color: THEME.accent }
        : { title: `Tap to try level ${this.levelOfShift} again` };
    }
    const combo = w.score.combo;
    const multiplier = Scoring.multiplier(combo, w.config);
    return {
      title: `×${formatMultiplier(multiplier)}`,
      sub: combo > 0 ? `${combo} combo` : undefined,
      big: true,
      color: multiplier > 1 ? THEME.accent : 'rgba(244,246,249,0.28)',
      pulse: this.comboPulse,
      glow: this.inFlow,
    };
  }

  hudState(): HudState {
    const w = this.world;
    const c = w.config;
    const wanted = w.criminal.kind === 'active' ? criminalTimeLeft(w) : null;
    const wantedWarning = w.criminal.kind === 'warning' || w.criminal.kind === 'arriving';
    const front = w.queue.vehicles.length > 0 ? w.vehicle(w.queue.vehicles[0]) : undefined;
    return {
      phase: this.phase,
      paused: this.paused,
      mode: this.mode,
      level: c.level,
      score: w.score.points,
      carsLeft: w.shift.carsLeft,
      carsSent: w.shift.carsSent,
      rushHour: w.shift.isRushHour,
      combo: w.score.combo,
      multiplier: Scoring.multiplier(w.score.combo, c),
      policeCrashes: w.score.policeCrashes,
      maxPoliceCrashes: c.maxPoliceCrashes,
      wantedSeconds: wanted,
      wantedWarning,
      canDispatch: this.phase === 'playing' && (wanted !== null || wantedWarning) && !!front && front.type !== 'police',
      shiftCars: c.shiftCars,
    };
  }

  // MARK: Events → picture, sound, haptics (GamePresentation's `Feedback`)

  private handle(events: GameEvent[]): void {
    const w = this.world;
    for (const e of events) {
      switch (e.type) {
        case 'merged': {
          if (e.shielded) this.effects.popup(v(e.position.x, e.position.y + 14), '+$50', THEME.cargo, { size: 13 });
          if (e.rating === 'tightFit') {
            this.effects.popup(e.position, 'TIGHT!', THEME.accent, { sub: `+${e.points}`, size: 18, emphasis: true });
            this.sound.play('tightFit');
            this.haptics.play(12);
          } else if (e.rating === 'perfect') {
            this.effects.popup(e.position, 'PERFECT', THEME.primary, { sub: `+${e.points}`, size: 16, emphasis: true });
            this.sound.play('perfect');
            this.haptics.play(8);
          } else if (e.rating === 'nearMiss') {
            this.sound.play('nearMiss');
          } else {
            this.sound.play('merge');
          }
          if (!this.career.tutorialDone) {
            this.career.tutorialDone = true;
            this.hooks.save();
          }
          break;
        }
        case 'comboChanged':
          if (e.tier > e.previousTier) {
            this.comboPulse = 0;
            this.sound.play('comboUp');
            this.haptics.play([10, 40, 10]);
          }
          break;
        case 'flowChanged':
          this.inFlow = e.inFlow;
          if (e.inFlow) this.sound.play('flowIn');
          break;
        case 'crash': {
          const a = w.vehicle(e.first);
          const b = w.vehicle(e.second);
          const colors = [a, b].map((x) => (x?.type === 'police' ? THEME.police : x?.type === 'pickup' ? THEME.criminal : '#BFC6CF'));
          this.effects.crash(e.point, e.impact, colors);
          if (e.isTakedown) break;
          if (e.isStrike) {
            this.sound.play(e.impact > 140 ? 'crashHeavy' : 'crash');
            this.haptics.play([60, 30, 25]);
            if (e.penalty > 0) this.effects.popup(e.point, `−${e.penalty}`, THEME.destructive, { size: 15 });
            if (e.cost > 0) this.effects.popup(v(e.point.x, e.point.y - 16), `−$${e.cost}`, THEME.destructive, { size: 13 });
            if (w.shift.phase === 'ended' && !this.reduceMotion) this.slowmo = 0.45;
            else if (e.isPoliceCrash) this.effects.popup(v(e.point.x, e.point.y + 16), 'POLICE CRASH', THEME.lightBlue, { size: 12 });
          } else {
            this.sound.play('crashLight', e.involvesPlayer ? 1 : 0.6);
          }
          break;
        }
        case 'rushHour':
          this.sound.play('rushHour');
          this.haptics.play([15, 60, 15, 60, 30]);
          break;
        case 'criminalWarning':
          this.sound.play('alarm');
          this.haptics.play([30, 80, 30]);
          break;
        case 'criminalEscaped': {
          const pickup = w.vehicle(e.vehicle);
          if (pickup) this.effects.popup(pickup.position, 'ESCAPED', THEME.criminal, { size: 17, emphasis: true, life: 1.2 });
          break;
        }
        case 'takedown':
          this.effects.popup(e.point, 'TAKEDOWN', THEME.criminal, { sub: `+${e.points}`, size: 19, emphasis: true, life: 1.1 });
          this.effects.sparkle(e.point, THEME.criminal, 18);
          this.effects.addShake(6);
          this.sound.play('takedown');
          this.haptics.play([40, 30, 60]);
          if (!this.reduceMotion) this.slowmo = 0.45;
          break;
        case 'criminalWrecked':
          this.effects.popup(e.point, 'CHASE OVER', THEME.muted, { size: 13 });
          break;
        case 'transporterWarning':
          this.sound.play('secured');
          break;
        case 'transporterPaid': {
          const truck = e.vehicle !== null ? w.vehicle(e.vehicle) : undefined;
          const at = truck ? truck.position : v(0, 0);
          if (e.escaped && e.amount > 0) {
            this.effects.popup(at, `+$${e.amount}`, THEME.cargo, { size: 17, emphasis: true, life: 1 });
            this.effects.sparkle(at, THEME.cargo, 12);
            this.sound.play('paid');
          } else if (!e.escaped) {
            this.effects.popup(at, 'SEIZED', THEME.lightBlue, { size: 14 });
          }
          break;
        }
        case 'transporterLost':
          this.effects.popup(e.point, 'LOST', THEME.destructive, { size: 15, emphasis: true });
          break;
        case 'dispatched':
          this.sound.play('dispatch');
          break;
        case 'shiftEnded': {
          const r = e.result;
          this.lastResult = r;
          this.sound.play(r.outcome === 'completed' ? 'complete' : 'gameOver');
          const record = recordShift(this.career, this.mode, r);
          this.lastRecord = record;
          this.hooks.save();
          this.hooks.onEnded(r, record, this.mode, this.levelOfShift);
          break;
        }
        default:
          break;
      }
    }
  }
}

export function formatMultiplier(m: number): string {
  return Number.isInteger(m) ? `${m}` : m.toFixed(1);
}
