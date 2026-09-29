import { World, STEP } from '../core/world';
import { versusConfig, VersusBot, INPUT_DELAY, standings, addRound, isSeriesOver, seriesLeaders, type Series, type Standing } from '../core/versus';
import type { EliminationReason, GameEvent, MergeRating, VersusPhase } from '../core/events';
import type { Vehicle } from '../core/vehicle';
import { substream } from '../core/rng';
import { type Vec2, v, add, sub, mul, dot, normalize } from '../core/vec2';
import { armOutward } from '../core/roundabout';
import { RenderList, rect, circle, line, polygon, text, fitCamera, toScreen, Ease, type Camera } from './render';
import { CrashEffects } from './effects';
import { SceneBuilder, VehicleLamps, type VehicleMark } from './scene';
import { CityLayer } from './city';
import { MapTheme } from './mapThemes';
import { Feedback, Music, type MusicMix, type SoundID, type HapticID } from './feedback';
import { measure } from './measure';
import type { ColorToken } from './theme';
import type { SessionOutput } from './session';
import type { Room, Input, InputKind, HostMessage, GuestMessage, MatchStart, Reaction } from '../net/room';

/**
 * One multiplayer match on this device. Every player runs the same world (same seed, same
 * taps, fixed 120 Hz step), so only taps travel. The host keeps the clock: it runs the world,
 * gives every tap its step and tells the guests how far they may run (lockstep). A tap takes
 * effect `INPUT_DELAY` steps later for everyone, so the network has time to deliver it; the
 * tap is answered at once on the tapping device (haptic, click, headlight flash, a lean
 * forward), so the delay reads as the engine pulling, not as lag. Who is out is decided by
 * the host's world and sent as an input too, so all screens agree.
 */
export { INPUT_DELAY };
/** A guest this many steps behind the host runs faster until it has caught up. */
const CATCH_UP_AFTER = 24;
const COUNT_IN = 3;

/** One colour per lobby slot (`theme.ts`); the name is said once, in the count-in. */
export const PLAYER_COLORS: ColorToken[] = ['player1', 'player2', 'player3', 'player4'];
export const PLAYER_COLOR_NAMES = ['mint', 'coral', 'violet', 'gold'];
export const REACTION_EMOJI: Record<Reaction, string> = { fire: '🔥', skull: '💀', clap: '👏', wow: '😮' };

const REASON: Record<EliminationReason, string> = { crash: 'Crashed', stalled: 'Stalled', left: 'Left' };
const KIND_REASON: Record<Exclude<InputKind, 't' | 'h'>, EliminationReason> = { c: 'crash', s: 'stalled', l: 'left' };
const MERGE_SOUND: Record<MergeRating, SoundID> = { clean: 'merge', tightFit: 'tightFit', nearMiss: 'nearMiss', perfect: 'perfect', cutOff: 'cutOff' };
const PHASE_TEXT: Record<Exclude<VersusPhase, 0>, [string, string]> = {
  1: ['Rush hour', 'The ring speeds up'],
  2: ['Sudden death', 'Send a car every 4 s'],
};

/** A short line under the badges: a shield, a lorry, a final. */
interface Note {
  text: string;
  color: ColorToken;
  age: number;
}

interface Float {
  seat: number;
  emoji: string;
  age: number;
  drift: number;
}

interface Confetti {
  p: Vec2;
  vel: Vec2;
  spin: number;
  color: ColorToken;
  age: number;
}

export interface MatchFeel {
  sound(): boolean;
  haptics(): boolean;
}

export class VersusMatch {
  readonly world: World;
  countIn = COUNT_IN;
  /** undefined while the match runs; then the winning seat, or null for a draw. */
  winner: number | null | undefined = undefined;
  readonly reasons = new Map<number, EliminationReason>();
  /** Host: lobby slot → world seat. */
  readonly seatOfSlot = new Map<number, number>();
  readonly names: string[];
  /** Lobby slot of each seat: it gives the colour. */
  readonly slots: number[];
  /** This device's seat. */
  readonly you: number;
  /** The series before this round, and after it once the match is over. */
  readonly series: Series;
  seriesAfter: Series | null = null;
  table: Standing[] | null = null;
  private pending: Input[] = [];
  private outbox: Input[] = [];
  /** Host: every input of the match, for a guest that reconnects. */
  private log: Input[] = [];
  private scheduledOut = new Set<number>();
  private bots: VersusBot[] = [];
  /** Guest: the host has run the world up to this step. */
  private confirmed = 0;
  private accumulator = 0;
  private sceneTime = 0;
  private sinceOver = 0;
  private sinceOut = new Map<number, number>();
  private effects: CrashEffects;
  private lamps = new VehicleLamps();
  /** Your last tap, answered at once: the front car's headlights and lean. */
  private flash: { vehicle: number; age: number } | null = null;
  private lastCount = COUNT_IN + 1;
  private phaseAge = 99;
  private duelSince: number | null = null;
  private notes: Note[] = [];
  private floats: Float[] = [];
  private confetti: Confetti[] = [];
  private lastReact = -1;
  private revengeAsked = false;
  /** Out: the lane you follow (tap to switch). */
  private watch: number | null = null;
  private cam: { scale: number; center: Vec2 } | null = null;
  /** Guest: replaying the match after a reconnect; no sounds until caught up. */
  private quiet = false;
  private reduceMotion = false;
  private frameDt = 1 / 60;

  constructor(
    private readonly room: Room,
    start: MatchStart,
    private readonly output: SessionOutput | null,
    private readonly feel: MatchFeel,
    /** Host: the seats bots play. */
    botSeats: number[] = [],
    resume: { inputs: Input[]; h: number } | null = null,
  ) {
    this.names = start.names;
    this.slots = start.slots;
    this.you = start.you;
    this.series = start.series;
    this.world = new World(versusConfig(start.names.length, start.seed), start.seed);
    this.effects = new CrashEffects(start.seed);
    this.bots = botSeats.map((seat) => new VersusBot(seat, substream(start.seed, 0xb0770 + seat)));
    if (resume) {
      this.countIn = 0;
      this.lastCount = 0;
      for (const input of resume.inputs) this.insert(input);
      this.confirmed = resume.h;
      this.quiet = true;
    }
  }

  get isHost(): boolean {
    return this.room.isHost;
  }

  get isOver(): boolean {
    return this.winner !== undefined;
  }

  get isOut(): boolean {
    return this.world.seats[this.you]?.out ?? true;
  }

  /** An out player may still send one lorry from the stands. */
  get canRevenge(): boolean {
    const q = this.world.seats[this.you];
    return !!q && q.out && !q.revengeUsed && !this.revengeAsked && !this.isOver && this.world.seatsLeft.length >= 2;
  }

  colorOf(seat: number): ColorToken {
    return PLAYER_COLORS[this.slots[seat] ?? seat] ?? 'primary';
  }

  nameOf(seat: number): string {
    return this.names[seat] || `Player ${(this.slots[seat] ?? seat) + 1}`;
  }

  // MARK: Input and network

  /** This player's tap: sends a car, or, once out, follows the next lane still playing. */
  tap(): void {
    if (this.countIn > 0 || this.isOver) return;
    if (this.isOut) {
      this.nextWatch();
      return;
    }
    this.answerTap();
    if (this.isHost) this.schedule([this.world.stepCount + INPUT_DELAY, this.you, 't']);
    else {
      // The host is about half a round trip ahead of what this screen shows.
      const rttSteps = this.room.rtt / 1000 / STEP;
      const hostNow = Math.max(this.confirmed, this.world.stepCount) + Math.ceil(rttSteps / 2);
      this.room.send({ t: 'tap', step: hostNow + INPUT_DELAY });
    }
  }

  /** The tap is felt before the car moves: a tick, a click, the headlights, a lean forward. */
  private answerTap(): void {
    this.haptic('tap');
    this.sound('uiTick', 0.75);
    const q = this.world.seats[this.you];
    const front = q?.vehicles[0];
    if (front !== undefined) this.flash = { vehicle: front, age: 0 };
  }

  private nextWatch(): void {
    const left = this.world.seatsLeft.map((q) => q.seat);
    if (left.length === 0) return;
    const at = this.watch === null ? -1 : left.indexOf(this.watch);
    this.watch = left[(at + 1) % left.length];
    this.sound('uiTick', 1.1);
  }

  /** An out player's lorry from the stands (once per match). */
  revenge(): void {
    if (!this.canRevenge) return;
    this.revengeAsked = true;
    this.haptic('tap');
    if (this.isHost) this.schedule([this.world.stepCount, this.you, 'h']);
    else this.room.send({ t: 'revenge' });
  }

  /** An out player's reaction, floating up from their lane on every screen. */
  react(r: Reaction): void {
    if (!this.isOut || this.isOver || this.sceneTime - this.lastReact < 0.5) return;
    this.lastReact = this.sceneTime;
    this.showReaction(this.you, r);
    if (this.isHost) this.room.broadcast({ t: 'react', seat: this.you, r });
    else this.room.send({ t: 'react', r });
  }

  private showReaction(seat: number, r: Reaction): void {
    if (this.floats.filter((f) => f.seat === seat).length >= 3) return;
    this.floats.push({ seat, emoji: REACTION_EMOJI[r], age: 0, drift: (this.floats.length % 3) - 1 });
    this.sound('uiTick', 1.35);
  }

  fromGuest(slot: number, message: GuestMessage): void {
    const seat = this.seatOfSlot.get(slot);
    if (seat === undefined) return;
    if (message.t === 'tap' && !this.isOver) {
      // A tap that arrives late counts at once; the world never runs backwards.
      this.schedule([Math.max(Math.floor(message.step), this.world.stepCount), seat, 't']);
    } else if (message.t === 'revenge') {
      const q = this.world.seats[seat];
      if (q && q.out && !q.revengeUsed && !this.isOver) this.schedule([this.world.stepCount, seat, 'h']);
    } else if (message.t === 'react' && this.world.seats[seat]?.out) {
      this.showReaction(seat, message.r);
      this.room.broadcast({ t: 'react', seat, r: message.r });
    }
  }

  guestLeft(slot: number): void {
    const seat = this.seatOfSlot.get(slot);
    if (seat !== undefined) this.scheduleOut(seat, 'l');
  }

  /** Host: a guest reconnected mid-match; it replays everything so far and catches up. */
  resumeFor(slot: number): void {
    const seat = this.seatOfSlot.get(slot);
    if (seat === undefined) return;
    this.room.sendTo(slot, {
      t: 'resume',
      seed: this.world.seed,
      names: this.names,
      slots: this.slots,
      you: seat,
      series: this.series,
      inputs: this.log,
      h: this.world.stepCount,
    });
  }

  fromHost(message: HostMessage): void {
    if (message.t === 'f') {
      for (const input of message.i) this.insert(input);
      this.confirmed = Math.max(this.confirmed, message.h);
    } else if (message.t === 'react' && message.seat !== this.you) this.showReaction(message.seat, message.r);
  }

  private schedule(input: Input): void {
    this.insert(input);
    this.outbox.push(input);
    this.log.push(input);
  }

  private scheduleOut(seat: number, kind: Exclude<InputKind, 't' | 'h'>): void {
    if (this.scheduledOut.has(seat) || this.world.seats[seat]?.out) return;
    this.scheduledOut.add(seat);
    this.schedule([this.world.stepCount, seat, kind]);
  }

  private insert(input: Input): void {
    let index = this.pending.findIndex((x) => x[0] > input[0]);
    if (index < 0) index = this.pending.length;
    this.pending.splice(index, 0, input);
  }

  // MARK: Frame

  frame(delta: number, viewport: Vec2, reduceMotion: boolean): RenderList {
    const dt = Math.min(Math.max(delta, 0), 0.25);
    this.reduceMotion = reduceMotion;
    this.frameDt = dt;
    if (this.countIn > 0) this.countDown(dt);
    else if (this.isHost) this.runHost(dt);
    else this.runGuest(dt);
    if (this.countIn === 0) {
      this.sceneTime += dt;
      this.effects.update(dt, this.world, reduceMotion);
      this.lamps.update(this.world, dt);
    }
    if (this.isOver) this.sinceOver += dt;
    this.phaseAge += dt;
    for (const [seat, age] of this.sinceOut) this.sinceOut.set(seat, age + dt);
    this.age(dt);
    return this.render(viewport, reduceMotion);
  }

  private countDown(dt: number): void {
    this.countIn = Math.max(0, this.countIn - dt);
    const shown = Math.ceil(this.countIn);
    if (shown !== this.lastCount) {
      this.lastCount = shown;
      if (shown > 0) this.sound('uiTick', 0.6);
      else {
        this.sound('go');
        this.haptic('rushHour');
      }
    }
  }

  private age(dt: number): void {
    if (this.flash) this.flash = this.flash.age + dt < 0.35 ? { vehicle: this.flash.vehicle, age: this.flash.age + dt } : null;
    for (const n of this.notes) n.age += dt;
    this.notes = this.notes.filter((n) => n.age < 2.6);
    for (const f of this.floats) f.age += dt;
    this.floats = this.floats.filter((f) => f.age < 1.8);
    for (const c of this.confetti) {
      c.age += dt;
      c.vel = v(c.vel.x * (1 - 1.2 * dt), c.vel.y + 420 * dt);
      c.p = add(c.p, mul(c.vel, dt));
    }
    this.confetti = this.confetti.filter((c) => c.age < 1.6);
  }

  private runHost(dt: number): void {
    this.accumulator += dt;
    let steps = 0;
    while (this.accumulator >= STEP && steps < 60) {
      for (const bot of this.bots) if (!this.isOver && bot.decide(this.world)) this.schedule([this.world.stepCount + INPUT_DELAY, bot.seat, 't']);
      this.runStep();
      for (const seat of this.world.stalledSeats) this.scheduleOut(seat, 's');
      this.accumulator -= STEP;
      steps++;
    }
    if (steps >= 60) this.accumulator = 0;
    if (steps > 0 || this.outbox.length > 0) {
      this.room.broadcast({ t: 'f', h: this.world.stepCount, i: this.outbox });
      this.outbox = [];
    }
  }

  private runGuest(dt: number): void {
    this.accumulator += dt;
    const behind = this.confirmed - this.world.stepCount;
    if (behind > CATCH_UP_AFTER) this.accumulator += (behind - CATCH_UP_AFTER / 2) * STEP;
    else this.quiet = false;
    let steps = 0;
    while (this.accumulator >= STEP && this.world.stepCount < this.confirmed && steps < 240) {
      this.runStep();
      this.accumulator -= STEP;
      steps++;
    }
    // Waiting for the host: never bank time to rush through later.
    if (this.world.stepCount >= this.confirmed) this.accumulator = Math.min(this.accumulator, STEP);
  }

  private runStep(): void {
    const w = this.world;
    while (this.pending.length > 0 && this.pending[0][0] <= w.stepCount) {
      const [, seat, kind] = this.pending.shift()!;
      if (kind === 't') w.tap(w.time, seat);
      else if (kind === 'h') w.revenge(seat, w.time);
      else w.eliminate(seat, KIND_REASON[kind], w.time);
    }
    w.step();
    this.handle(w.takeEvents());
  }

  private handle(events: GameEvent[]): void {
    const w = this.world;
    for (const e of events) {
      switch (e.type) {
        case 'crash': {
          this.effects.spawn(e, w, this.reduceMotion);
          this.sound(Feedback.crashSound(e));
          const mine = [e.first, e.second].some((id) => this.isMine(w.vehicle(id)));
          if (mine) this.haptic('crash');
          break;
        }
        case 'merged': {
          if (!this.isMine(w.vehicle(e.vehicle))) break;
          this.sound(MERGE_SOUND[e.rating]);
          const h = Feedback.haptic(e);
          if (h) this.haptic(h);
          break;
        }
        case 'faulted':
          if (this.isHost) this.scheduleOut(e.seat, 'c');
          break;
        case 'shieldGained':
          this.note(e.seat === this.you ? 'Shield ready: one light bump is forgiven' : `${this.nameOf(e.seat)} has a shield`, e.seat);
          if (e.seat === this.you) this.sound('comboUp');
          break;
        case 'shielded':
          this.note(e.seat === this.you ? 'Your shield took the hit' : `${this.nameOf(e.seat)}'s shield took the hit`, e.seat);
          this.sound('secured');
          break;
        case 'rivalSent':
          if (e.seat === this.you) this.note(e.revenge ? 'You strike back with a lorry' : 'Your lorry is on its way', e.seat);
          else this.note(e.revenge ? `${this.nameOf(e.seat)} strikes back with a lorry` : `${this.nameOf(e.seat)} sends a lorry`, e.seat);
          this.sound('dispatch', e.seat === this.you ? 1 : 0.85);
          break;
        case 'versusPhase':
          this.phaseAge = 0;
          this.sound(e.phase === 2 ? 'alarm' : 'rushHour');
          this.haptic('rushHour');
          break;
        case 'eliminated':
          this.reasons.set(e.seat, e.reason);
          this.sinceOut.set(e.seat, 0);
          if (e.seat === this.you) {
            this.sound('shiftFailed');
            this.watch = null;
          } else this.sound('seized', 0.8);
          if (this.watch === e.seat) this.watch = null;
          if (w.seatsLeft.length === 2 && w.seats.length > 2 && this.duelSince === null) {
            this.duelSince = this.sceneTime;
            const [a, b] = w.seatsLeft;
            const who = (seat: number): string => (seat === this.you ? 'You' : this.nameOf(seat));
            this.note(`Final: ${who(a.seat)} vs ${who(b.seat)}`, null);
          }
          break;
        case 'matchOver':
          this.over(e.winner);
          break;
        default:
          break;
      }
    }
  }

  private over(winner: number | null): void {
    this.winner = winner;
    this.table = standings(this.world);
    this.seriesAfter = addRound(this.series, this.table, this.slots);
    if (winner === this.you) {
      this.sound('shiftComplete');
      this.haptic('shiftComplete');
    }
  }

  private isMine(veh: Vehicle | undefined): boolean {
    return !!veh && veh.owner === 'player' && veh.seat === this.you;
  }

  private note(textRun: string, seat: number | null): void {
    this.notes.push({ text: textRun, color: seat === null ? 'primary' : this.colorOf(seat), age: 0 });
    if (this.notes.length > 2) this.notes.shift();
  }

  private sound(id: SoundID, pitch = 1): void {
    if (this.quiet || !this.feel.sound()) return;
    this.output?.sound(id, pitch, 0);
  }

  private haptic(id: HapticID): void {
    if (this.quiet || !this.feel.haptics()) return;
    this.output?.haptic(id, 0);
  }

  /** The music follows the match: phases, the final duel, the result. */
  get music(): MusicMix {
    const w = this.world;
    const duel = w.seatsLeft.length === 2 && (w.seats.length > 2 || w.versusPhase >= 2);
    return Music.versus({
      phase: w.versusPhase,
      sincePhase: this.phaseAge,
      duel,
      time: this.sceneTime,
      countIn: this.countIn > 0,
      over: this.isOver,
      won: this.winner === this.you,
    });
  }

  // MARK: Picture

  /** Frames the ring and the lanes still playing; out lanes drift off the edge. */
  private camera(viewport: Vec2, dt: number): Camera {
    const w = this.world;
    const l = w.layout;
    const c = w.config;
    const ring = l.ringRadius + l.laneWidth;
    const reach = l.stopDistance + c.queueSpacing * (c.queueVisible - 1) + c.carLength / 2 + 30;
    const seats = this.isOver || this.countIn > 0 ? w.seats : w.seatsLeft;
    const box = { minX: -ring, minY: -ring, maxX: ring, maxY: ring };
    const grow = (p: Vec2, pad: number): void => {
      box.minX = Math.min(box.minX, p.x - pad);
      box.maxX = Math.max(box.maxX, p.x + pad);
      box.minY = Math.min(box.minY, p.y - pad);
      box.maxY = Math.max(box.maxY, p.y + pad);
    };
    for (const q of seats) {
      // The end of the lane's queue, and its name pill beside it (with room for the pill).
      grow(mul(armOutward(w.armOf(q)), reach), 30);
      grow(this.laneBeside(q.seat), 75);
    }
    // Square, so the ring keeps its place; shrinking only where lanes have gone.
    const top = this.isOver ? 76 : 116;
    const fit = fitCamera(box, viewport, { top, left: 12, bottom: 96, right: 12 });
    let scale = fit.scale;
    let center = fit.center;
    const watched = this.watch !== null && !this.isOver ? w.seats[this.watch] : undefined;
    if (watched) {
      scale *= 1.08;
      center = add(center, mul(sub(l.stopPose(w.armOf(watched)).position, center), 0.18));
    }
    if (!this.cam || this.reduceMotion) this.cam = { scale, center };
    else {
      const k = 1 - Math.exp(-dt / 0.45);
      this.cam = { scale: this.cam.scale + (scale - this.cam.scale) * k, center: add(this.cam.center, mul(sub(center, this.cam.center), k)) };
    }
    const shake = this.effects.shakeOffset;
    return { ...fit, center: this.cam.center, scale: this.cam.scale, focus: v(fit.focus.x + shake.x, fit.focus.y + shake.y) };
  }

  private render(viewport: Vec2, rm: boolean): RenderList {
    const w = this.world;
    const alpha = this.countIn > 0 ? 0 : Math.min(1, this.accumulator / STEP);
    const list = new RenderList(this.camera(viewport, this.frameDt), MapTheme.ground(null));
    list.groundGrain = true;
    CityLayer.add(list, w, null, rm ? null : this.sceneTime, null, null, this.sceneTime);
    SceneBuilder.addRoad(list, w.layout, w.config, null);
    for (const q of w.seats) {
      const mine = q.seat === this.you;
      SceneBuilder.addLaneMark(list, w.layout, w.config, w.armOf(q), this.colorOf(q.seat), q.out ? 0.12 : mine ? 0.75 : 0.45, mine ? 3 : 2);
    }
    MapTheme.addIsland(list, null, w);
    this.effects.addGround(list, w, alpha, !rm);
    SceneBuilder.addShadows(list, w, alpha);
    const lamps = {
      brake: (id: number) => this.lamps.brake(id),
      headlights: (id: number) => Math.max(this.lamps.headlights(id), this.flashOf(id)),
    };
    SceneBuilder.addVehicles(list, w, alpha, [], null, null, lamps, (veh) => this.markOf(veh));
    this.effects.addAir(list);
    this.addLanes(list);
    this.addFloats(list);
    this.addTop(list, viewport);
    this.addNotes(list, viewport);
    this.addCenter(list, viewport, rm);
    this.addConfetti(list, viewport, rm);
    return list;
  }

  /** The headlights of the car you just tapped: one bright flash that fades. */
  private flashOf(id: number): number {
    if (!this.flash || this.flash.vehicle !== id) return 0;
    const a = this.flash.age;
    return a < 0.03 ? a / 0.03 : Math.exp(-(a - 0.03) / 0.1);
  }

  private markOf(veh: Vehicle): VehicleMark | null {
    if (veh.owner === 'player') {
      const queued = veh.phase.kind === 'queued';
      let lunge = 0;
      if (!this.reduceMotion && this.flash?.vehicle === veh.id && queued) {
        // Leans forward on the tap and settles back: the engine taking the load.
        const a = this.flash.age;
        lunge = a < 0.05 ? (a / 0.05) * 1.4 : 1.4 * Math.exp(-(a - 0.05) / 0.09);
      }
      return { color: this.colorOf(veh.seat), roof: true, glow: queued ? 0.5 : 0.9, lunge };
    }
    if (veh.sentBy !== null) {
      const pulse = this.reduceMotion ? 1 : 0.75 + 0.25 * Math.sin(this.sceneTime * 6);
      return { color: this.colorOf(veh.sentBy), roof: false, glow: pulse, lunge: 0 };
    }
    return null;
  }

  /** The kerb beside a lane's queue, in the world: its label goes there. */
  private laneBeside(seat: number): Vec2 {
    const w = this.world;
    const arm = w.armOf(w.seats[seat]);
    const out = armOutward(arm);
    const stop = w.layout.stopPose(arm).position;
    const axis = mul(out, dot(stop, out));
    const side = normalize(sub(stop, axis));
    return add(add(axis, mul(out, w.config.queueSpacing * 1.5)), mul(side, w.layout.laneWidth + 6));
  }

  /** Where a lane's label sits: beside its queue, on the kerb, so it never covers a car. */
  private laneAnchor(list: RenderList, seat: number): Vec2 {
    const w = this.world;
    const arm = w.armOf(w.seats[seat]);
    const stop = w.layout.stopPose(arm).position;
    const out = armOutward(arm);
    const side = normalize(sub(stop, mul(out, dot(stop, out))));
    const beside = this.laneBeside(seat);
    const base = toScreen(list.camera, beside);
    const across = normalize(sub(toScreen(list.camera, add(beside, side)), base));
    return add(base, mul(across, 30));
  }

  /** A pill in the player's colour at the end of every lane; an empty lane says why. */
  private addLanes(list: RenderList): void {
    // Once the match is over the result card holds the names; pills would show through it.
    if (this.isOver) return;
    const w = this.world;
    for (const q of w.seats) {
      const at = this.laneAnchor(list, q.seat);
      const me = q.seat === this.you;
      const name = me ? 'YOU' : this.clip(this.nameOf(q.seat), 12, 68);
      const color = this.colorOf(q.seat);
      if (q.out) {
        const fade = Ease.clamp01((this.sinceOut.get(q.seat) ?? 1) / 0.3);
        list.s(text(name, v(at.x, at.y - 7), 12, 'center', 'bold'), 'muted', 0.7 * fade);
        list.s(text(REASON[this.reasons.get(q.seat) ?? 'crash'].toUpperCase(), v(at.x, at.y + 9), 11, 'center', 'bold'), 'destructive', fade);
        continue;
      }
      const width = me ? 52 : Math.max(52, measure(name, 12, true) + 20);
      if (this.watch === q.seat) list.s(rect(at, v(width + 6, 30), 15), color, 0.35);
      list.s(rect(at, v(width, 24), 12), color);
      list.s(text(name, v(at.x, at.y), me ? 13 : 12, 'center', 'bold'), 'accentInk');
      if (q.shield) this.addShield(list, v(at.x - width / 2 - 12, at.y), color);
      if (this.isOver || this.countIn > 0) continue;
      // The stall clock once it is running out; your own pressure bar otherwise.
      const left = 1 - q.idle / w.stallLimit;
      const bar = 44;
      const y = at.y + 19;
      if (left < 0.5) {
        list.s(rect(v(at.x, y), v(bar, 4), 2), 'scrim', 0.9);
        list.s(rect(v(at.x - (bar * (1 - Math.max(0, left))) / 2, y), v(bar * Math.max(0, left), 4), 2), 'destructive');
      } else if (me) {
        const fill = Ease.clamp01(q.pressure / w.config.versusPressureFull);
        list.s(rect(v(at.x, y), v(bar, 4), 2), 'scrim', 0.9);
        if (fill > 0) list.s(rect(v(at.x - (bar * (1 - fill)) / 2, y), v(bar * fill, 4), 2), color, 0.9);
      }
    }
  }

  /** A small shield beside a lane's pill. */
  private addShield(list: RenderList, at: Vec2, color: ColorToken): void {
    const s = 7;
    const shape = [v(0, -s), v(s * 0.85, -s * 0.6), v(s * 0.75, s * 0.25), v(0, s), v(-s * 0.75, s * 0.25), v(-s * 0.85, -s * 0.6)];
    list.s(polygon(shape.map((p) => add(at, mul(p, 1.3)))), 'scrim', 0.9);
    list.s(polygon(shape.map((p) => add(at, p))), color);
  }

  private addFloats(list: RenderList): void {
    for (const f of this.floats) {
      const at = this.laneAnchor(list, f.seat);
      const x = Ease.outCubic(f.age / 1.8);
      const fade = f.age < 0.15 ? f.age / 0.15 : 1 - Ease.clamp01((f.age - 1.1) / 0.7);
      list.s(text(f.emoji, v(at.x + f.drift * 14, at.y - 22 - x * 56), 24, 'center'), 'primary', fade);
    }
  }

  /** Clock and phase, then one badge per player: colour, name, cars, danger, ping. */
  private addTop(list: RenderList, viewport: Vec2): void {
    const w = this.world;
    const time = this.countIn > 0 ? 0 : w.shiftTime(w.time);
    const clock = `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`;
    const phase = w.versusPhase === 2 ? 'Sudden death' : w.versusPhase === 1 ? 'Rush hour' : this.series.bestOf > 1 ? `Round ${this.series.round} of ${this.series.bestOf}` : 'Last one standing';
    const label = `${clock}  ·  ${phase}`;
    const chipW = measure(label, 13, true) + 28;
    list.s(rect(v(viewport.x / 2, 22), v(chipW, 28), 14), 'scrim', 0.85);
    list.s(text(label, v(viewport.x / 2, 22), 13, 'center', 'bold'), w.versusPhase === 2 ? 'destructive' : 'primary');

    const n = w.seats.length;
    const gap = 8;
    const width = Math.min(112, (viewport.x - 24 - gap * (n - 1)) / n);
    const x0 = viewport.x / 2 - (width * n + gap * (n - 1)) / 2 + width / 2;
    for (const q of w.seats) {
      const at = v(x0 + q.seat * (width + gap), 68);
      this.addBadge(list, q.seat, at, width);
    }
  }

  private addBadge(list: RenderList, seat: number, at: Vec2, width: number): void {
    const w = this.world;
    const q = w.seats[seat];
    const color = this.colorOf(seat);
    const me = seat === this.you;
    const slot = this.slots[seat] ?? seat;
    const member = this.room.members.find((m) => m.slot === slot);
    const size = v(width, 44);
    const secondsLeft = w.stallLimit - q.idle;
    const danger = !q.out && !this.isOver && this.countIn === 0 && secondsLeft < 3;
    const dim = q.out ? 0.5 : 1;
    // An outline: yours in your colour, a lane about to stall pulses red.
    if (danger) {
      const pulse = this.reduceMotion ? 1 : 0.55 + 0.45 * Math.abs(Math.sin(this.sceneTime * Math.PI * 2));
      list.s(rect(at, add(size, v(4, 4)), 14), 'destructive', pulse);
    } else if (me) list.s(rect(at, add(size, v(3, 3)), 13.5), color, 0.9);
    list.s(rect(at, size, 12), 'card', 1);
    const dot = v(at.x - width / 2 + 16, at.y - 7);
    list.s(circle(dot, 8), color, dim);
    list.s(text(String(slot + 1), dot, 10, 'center', 'bold'), 'accentInk', dim);
    const nameMax = width - 38;
    list.s(text(this.clip(me ? 'You' : this.nameOf(seat), 12, nameMax), v(at.x - width / 2 + 29, dot.y), 12, 'leading', 'bold'), q.out ? 'muted' : 'primary', dim);
    let sub: string;
    let subColor: ColorToken = 'muted';
    if (member?.away && !q.out) {
      sub = 'Reconnecting';
      subColor = 'destructive';
    } else if (q.out) sub = REASON[this.reasons.get(seat) ?? 'crash'];
    else if (danger) {
      sub = `${Math.max(0, secondsLeft).toFixed(1)} s`;
      subColor = 'destructive';
    } else sub = `${q.sent} ${q.sent === 1 ? 'car' : 'cars'}`;
    list.s(text(sub, v(at.x - width / 2 + 10, at.y + 11), 11, 'leading', danger || subColor === 'destructive' ? 'bold' : 'regular'), subColor, dim);
    // Ping of a friend's line to the host: green, yellow, red.
    const ping = member && !member.bot && slot !== 0 ? member.ping : undefined;
    if (ping !== undefined && ping > 0 && width >= 84 && !q.out) {
      const quality: ColorToken = ping < 80 ? 'juiceGreen' : ping < 160 ? 'juiceYellow' : 'destructive';
      const label = `${Math.round(ping)}`;
      const right = at.x + width / 2 - 8;
      list.s(text(label, v(right, at.y + 11), 10, 'trailing'), 'muted', dim);
      list.s(circle(v(right - measure(label, 10, false) - 6, at.y + 11), 2.5), quality, dim);
    }
    // Round wins in a series: small crowns in the corner.
    const wins = this.series.wins[slot] ?? 0;
    if (this.series.bestOf > 1 && wins > 0) {
      for (let k = 0; k < Math.min(wins, 3); k++) this.addCrown(list, v(at.x + width / 2 - 10 - k * 11, at.y - 9));
    }
  }

  private addCrown(list: RenderList, at: Vec2): void {
    const pts = [v(-4.5, 3), v(-4.5, -2.5), v(-2, 0), v(0, -3.5), v(2, 0), v(4.5, -2.5), v(4.5, 3)];
    list.s(polygon(pts.map((p) => add(at, p))), 'coin');
  }

  private addNotes(list: RenderList, viewport: Vec2): void {
    let y = 106;
    // The phase change: a banner that stays a little longer than a note.
    const phase = this.world.versusPhase;
    if (phase > 0 && this.phaseAge < 2.8 && !this.isOver) {
      const [title, sub] = PHASE_TEXT[phase as 1 | 2];
      const fade = this.fade(this.phaseAge, 2.8);
      const lift = this.reduceMotion ? 0 : (1 - Ease.outCubic(this.phaseAge / 0.25)) * 8;
      const color: ColorToken = phase === 2 ? 'destructive' : 'primary';
      const width = Math.max(measure(title.toUpperCase(), 15, true), measure(sub, 12, false)) + 40;
      list.s(rect(v(viewport.x / 2, y + 16 - lift), v(width, 48), 14), 'scrim', 0.9 * fade);
      list.s(text(title.toUpperCase(), v(viewport.x / 2, y + 8 - lift), 15, 'center', 'bold'), color, fade);
      list.s(text(sub, v(viewport.x / 2, y + 26 - lift), 12, 'center'), 'muted', fade);
      y += 56;
    }
    for (const n of this.notes) {
      const fade = this.fade(n.age, 2.6);
      const width = measure(n.text, 13, true) + 40;
      list.s(rect(v(viewport.x / 2, y + 12), v(width, 26), 13), 'scrim', 0.85 * fade);
      list.s(circle(v(viewport.x / 2 - width / 2 + 14, y + 12), 4), n.color, fade);
      list.s(text(n.text, v(viewport.x / 2 + 6, y + 12), 13, 'center', 'bold'), 'primary', fade);
      y += 32;
    }
  }

  private fade(age: number, life: number): number {
    return Math.min(Ease.clamp01(age / 0.18), 1 - Ease.clamp01((age - (life - 0.4)) / 0.4));
  }

  private addCenter(list: RenderList, viewport: Vec2, rm: boolean): void {
    const mid = v(viewport.x / 2, viewport.y / 2);
    if (!this.isHost && this.room.reconnecting) {
      list.s(rect(v(mid.x, mid.y), v(220, 44), 14), 'scrim', 0.92);
      list.s(text('Reconnecting…', mid, 15, 'center', 'bold'), 'primary');
      return;
    }
    if (this.countIn > 0) {
      const slot = this.slots[this.you] ?? this.you;
      list.s(text(String(Math.ceil(this.countIn)), v(mid.x, mid.y - 2), 64, 'center', 'bold'), this.colorOf(this.you));
      const line = `Your lane: ${PLAYER_COLOR_NAMES[slot] ?? ''}. Last one standing wins.`;
      // Under the badges, where the notes go later: over the ring it would cover a lane's pill.
      const lineY = 118;
      list.s(rect(v(mid.x, lineY), v(Math.min(measure(line, 14, false) + 28, viewport.x - 24), 30), 15), 'scrim', 0.9);
      list.s(text(line, v(mid.x, lineY), 14, 'center'), 'primary');
      return;
    }
    if (this.isOver) {
      this.addResult(list, viewport, rm);
      return;
    }
    const bottom = viewport.y - 24;
    const mine = this.world.seats[this.you];
    if (!mine || mine.out) {
      const watching = this.watch !== null ? `Watching ${this.nameOf(this.watch)} · tap to switch` : 'You are out · tap to follow a lane';
      list.s(text(watching, v(mid.x, bottom - 116), 14, 'center', 'bold'), 'muted');
    } else if (mine.idle / this.world.stallLimit > 0.5) {
      const seconds = Math.max(0, this.world.stallLimit - mine.idle);
      const warning = `Send a car · ${seconds.toFixed(1)} s`;
      list.s(rect(v(mid.x, bottom - 61), v(measure(warning, 15, true) + 32, 34), 17), 'scrim', 0.92);
      list.s(text(warning, v(mid.x, bottom - 61), 15, 'center', 'bold'), 'destructive');
    }
  }

  /** The result: winner, then every player with place, cars, risky merges and points. */
  private addResult(list: RenderList, viewport: Vec2, rm: boolean): void {
    const table = this.table ?? [];
    const after = this.seriesAfter ?? this.series;
    const fade = rm ? 1 : Ease.clamp01(this.sinceOver / 0.35);
    const rise = rm ? 0 : (1 - Ease.outCubic(this.sinceOver / 0.35)) * 12;
    const series = this.series.bestOf > 1;
    const rowH = 32;
    const width = Math.min(360, viewport.x - 24);
    const bonusLine = this.bonusLine(table);
    const height = 104 + table.length * rowH + (bonusLine ? 44 : 16);
    const top = Math.max(96, viewport.y / 2 - height / 2 - 20) + rise;
    const cx = viewport.x / 2;
    list.s(rect(v(cx, top + height / 2), v(width, height), 20), 'card', 0.97 * fade);

    const title = this.winner === null ? 'Draw' : this.winner === this.you ? 'You win' : `${this.nameOf(this.winner!)} wins`;
    const titleColor: ColorToken = this.winner === null || this.winner === undefined ? 'primary' : this.colorOf(this.winner);
    list.s(text(this.clip(title, 28, width - 32, true), v(cx, top + 40), 28, 'center', 'bold'), titleColor, fade);
    let subtitle = 'Last one standing';
    if (series) {
      const done = isSeriesOver(after);
      const leaders = seriesLeaders(after, this.slots);
      const leaderName = (slot: number): string => {
        const seat = this.slots.indexOf(slot);
        return seat === this.you ? 'You' : this.nameOf(seat);
      };
      if (!done) subtitle = `Round ${after.round} of ${after.bestOf}`;
      else if (leaders.length === 1) subtitle = `${leaderName(leaders[0])} ${this.slots.indexOf(leaders[0]) === this.you ? 'win' : 'wins'} the series`;
      else subtitle = 'The series ends in a tie';
    }
    list.s(text(subtitle, v(cx, top + 67), 13, 'center'), 'muted', fade);

    // Columns: place, dot, name … cars, risky, points (round, or series total).
    const left = cx - width / 2 + 16;
    const right = cx + width / 2 - 16;
    const cols = { ready: right, pts: right - 26, risky: right - 72, cars: right - 114 };
    const headY = top + 88;
    list.s(text('Cars', v(cols.cars, headY), 11, 'trailing'), 'muted', fade);
    list.s(text('Risky', v(cols.risky, headY), 11, 'trailing'), 'muted', fade);
    list.s(text(series ? 'Total' : 'Pts', v(cols.pts, headY), 11, 'trailing'), 'muted', fade);
    table.forEach((row, i) => {
      const y = top + 104 + i * rowH + rowH / 2;
      const q = this.world.seats[row.seat];
      const slot = this.slots[row.seat] ?? row.seat;
      const member = this.room.members.find((m) => m.slot === slot);
      const me = row.seat === this.you;
      if (me) list.s(rect(v(cx, y), v(width - 16, rowH - 4), 10), 'cardRaised', fade);
      list.s(text(String(row.place), v(left + 4, y), 13, 'center', 'bold'), row.place === 1 ? 'coin' : 'muted', fade);
      list.s(circle(v(left + 22, y), 6), this.colorOf(row.seat), fade);
      const nameMax = cols.cars - 40 - (left + 34);
      list.s(text(this.clip(me ? 'You' : this.nameOf(row.seat), 14, nameMax, true), v(left + 34, y), 14, 'leading', 'bold'), 'primary', fade);
      list.s(text(String(q.sent), v(cols.cars, y), 13, 'trailing'), 'primary', fade);
      list.s(text(String(q.risky), v(cols.risky, y), 13, 'trailing'), 'primary', fade);
      const total = series ? (after.points[slot] ?? 0) : row.points;
      list.s(text(series ? String(total) : `+${row.points}`, v(cols.pts, y), 13, 'trailing', 'bold'), row.points > 0 ? 'accent' : 'muted', fade);
      // Ready for the next one: a check, or a quiet dot while we wait for them.
      const ready = member?.bot || member?.ready;
      if (ready) this.addCheck(list, v(cols.ready - 6, y), fade);
      else list.s(circle(v(cols.ready - 6, y), 2.5), 'muted', 0.6 * fade);
    });
    if (bonusLine) list.s(text(this.clip(bonusLine, 12, width - 32), v(cx, top + 104 + table.length * rowH + 24), 12, 'center'), 'muted', fade);
  }

  private addCheck(list: RenderList, at: Vec2, opacity: number): void {
    const pts = [v(-5, 0), v(-1.5, 3.5), v(5, -3.5)].map((p) => add(at, p));
    list.s(line(pts[0], pts[1], 2.4), 'juiceGreen', opacity);
    list.s(line(pts[1], pts[2], 2.4), 'juiceGreen', opacity);
  }

  private bonusLine(table: Standing[]): string {
    const parts: string[] = [];
    for (const row of table) {
      const who = row.seat === this.you ? 'You' : this.nameOf(row.seat);
      if (row.bonus.includes('mostCars')) parts.push(`${who}: most cars +1`);
      if (row.bonus.includes('riskiest')) parts.push(`${who}: tightest merge +1`);
    }
    return parts.join('  ·  ');
  }

  /** A little burst of paper in the winner's colour from their badge (not with Reduce Motion). */
  private addConfetti(list: RenderList, viewport: Vec2, rm: boolean): void {
    if (rm) return;
    if (this.isOver && this.winner !== null && this.winner !== undefined && this.sinceOver < 0.05 && this.confetti.length === 0) {
      const n = this.world.seats.length;
      const gap = 8;
      const width = Math.min(112, (viewport.x - 24 - gap * (n - 1)) / n);
      const x = viewport.x / 2 - (width * n + gap * (n - 1)) / 2 + width / 2 + this.winner * (width + gap);
      const colors: ColorToken[] = [this.colorOf(this.winner), 'primary', 'coin'];
      for (let i = 0; i < 36; i++) {
        const a = -Math.PI / 2 + (((i * 0.618) % 1) - 0.5) * 2.4;
        const speed = 180 + ((i * 37) % 11) * 22;
        this.confetti.push({ p: v(x, 72), vel: v(Math.cos(a) * speed, Math.sin(a) * speed), spin: i * 0.7, color: colors[i % colors.length], age: 0 });
      }
    }
    for (const c of this.confetti) {
      const fade = 1 - Ease.clamp01((c.age - 1.0) / 0.6);
      list.s(rect(c.p, v(6, 3.5), 1, c.spin + c.age * 9), c.color, fade);
    }
  }

  /** Cuts a name to fit `max` points, with an ellipsis. */
  private clip(s: string, size: number, max: number, bold = true): string {
    if (measure(s, size, bold) <= max) return s;
    let out = s;
    while (out.length > 1 && measure(`${out}…`, size, bold) > max) out = out.slice(0, -1);
    return `${out}…`;
  }
}
