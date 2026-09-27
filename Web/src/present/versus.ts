import { World, STEP } from '../core/world';
import { versusConfig } from '../core/versus';
import type { EliminationReason, GameEvent } from '../core/events';
import { type Vec2, v, add, sub, mul, dot, normalize } from '../core/vec2';
import { armOutward } from '../core/roundabout';
import { RenderList, rect, text, fitCamera, toScreen, Ease, type Camera } from './render';
import { CrashEffects } from './effects';
import { SceneBuilder } from './scene';
import { CityLayer } from './city';
import { MapTheme } from './mapThemes';
import type { SessionOutput } from './session';
import type { Room, Input, InputKind, HostMessage, GuestMessage } from '../net/room';

/**
 * One multiplayer match on this device. Every player runs the same world (same seed, same
 * taps, fixed 120 Hz step), so only taps travel. The host keeps the clock: it runs the world,
 * gives every tap its step and tells the guests how far they may run (lockstep). A tap takes
 * effect `INPUT_DELAY` steps later for everyone, so the network has time to deliver it. Who is
 * out is decided by the host's world and sent as an input too, so all screens agree.
 */
export const INPUT_DELAY = 6;
/** A guest this many steps behind the host runs faster until it has caught up. */
const CATCH_UP_AFTER = 24;
const COUNT_IN = 3;

const REASON: Record<EliminationReason, string> = { crash: 'Crashed', stalled: 'Stalled', left: 'Left' };
const KIND_REASON: Record<Exclude<InputKind, 't'>, EliminationReason> = { c: 'crash', s: 'stalled', l: 'left' };

export class VersusMatch {
  readonly world: World;
  countIn = COUNT_IN;
  /** undefined while the match runs; then the winning seat, or null for a draw. */
  winner: number | null | undefined = undefined;
  readonly reasons = new Map<number, EliminationReason>();
  /** Host: lobby slot → world seat. */
  readonly seatOfSlot = new Map<number, number>();
  private pending: Input[] = [];
  private outbox: Input[] = [];
  private scheduledOut = new Set<number>();
  /** Guest: the host has run the world up to this step. */
  private confirmed = 0;
  private rttSteps = 0;
  private sincePing = 0;
  private accumulator = 0;
  private sceneTime = 0;
  private sinceOver = 0;
  private sinceOut = new Map<number, number>();
  private effects: CrashEffects;

  constructor(
    private readonly room: Room,
    seed: number,
    readonly names: string[],
    /** This device's seat. */
    readonly you: number,
    private readonly output: SessionOutput | null,
  ) {
    this.world = new World(versusConfig(names.length, seed), seed);
    this.effects = new CrashEffects(seed);
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

  // MARK: Input and network

  /** This player's tap. It goes to the host, which gives it its step. */
  tap(): void {
    if (this.countIn > 0 || this.isOver || this.isOut) return;
    if (this.isHost) this.schedule([this.world.stepCount + INPUT_DELAY, this.you, 't']);
    else {
      // The host is about a round trip ahead of what this screen shows.
      const hostNow = Math.max(this.confirmed, this.world.stepCount) + Math.ceil(this.rttSteps / 2);
      this.room.send({ t: 'tap', step: hostNow + INPUT_DELAY });
    }
  }

  fromGuest(slot: number, message: GuestMessage): void {
    const seat = this.seatOfSlot.get(slot);
    if (message.t === 'ping') this.room.sendTo(slot, { t: 'pong', at: message.at });
    else if (message.t === 'tap' && seat !== undefined && !this.isOver) {
      // A tap that arrives late counts at once; the world never runs backwards.
      this.schedule([Math.max(Math.floor(message.step), this.world.stepCount), seat, 't']);
    }
  }

  guestLeft(slot: number): void {
    const seat = this.seatOfSlot.get(slot);
    if (seat !== undefined) this.scheduleOut(seat, 'l');
  }

  fromHost(message: HostMessage): void {
    if (message.t === 'f') {
      for (const input of message.i) this.insert(input);
      this.confirmed = Math.max(this.confirmed, message.h);
    } else if (message.t === 'pong') {
      const rtt = (performance.now() - message.at) / 1000;
      this.rttSteps = this.rttSteps === 0 ? rtt / STEP : this.rttSteps * 0.7 + (rtt / STEP) * 0.3;
    }
  }

  private schedule(input: Input): void {
    this.insert(input);
    this.outbox.push(input);
  }

  private scheduleOut(seat: number, kind: Exclude<InputKind, 't'>): void {
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
    if (this.countIn > 0) {
      this.countIn = Math.max(0, this.countIn - dt);
      if (this.countIn === 0) this.sound('go');
    } else if (this.isHost) this.runHost(dt);
    else this.runGuest(dt);
    if (this.countIn === 0) {
      this.sceneTime += dt;
      this.effects.update(dt, this.world, reduceMotion);
    }
    if (this.isOver) this.sinceOver += dt;
    for (const [seat, age] of this.sinceOut) this.sinceOut.set(seat, age + dt);
    return this.render(viewport, reduceMotion);
  }

  private runHost(dt: number): void {
    this.accumulator += dt;
    let steps = 0;
    while (this.accumulator >= STEP && steps < 60) {
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
    this.sincePing += dt;
    if (this.sincePing >= 1) {
      this.sincePing = 0;
      this.room.send({ t: 'ping', at: performance.now() });
    }
    this.accumulator += dt;
    const behind = this.confirmed - this.world.stepCount;
    if (behind > CATCH_UP_AFTER) this.accumulator += (behind - CATCH_UP_AFTER / 2) * STEP;
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
      else w.eliminate(seat, KIND_REASON[kind], w.time);
    }
    w.step();
    this.react(w.takeEvents());
  }

  private react(events: GameEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'crash':
          this.effects.spawn(e, this.world, false);
          this.sound(e.impact > 140 ? 'crashHeavy' : e.impact > 60 ? 'crash' : 'crashLight');
          break;
        case 'faulted':
          if (this.isHost) this.scheduleOut(e.seat, 'c');
          break;
        case 'eliminated':
          this.reasons.set(e.seat, e.reason);
          this.sinceOut.set(e.seat, 0);
          if (e.seat === this.you) this.sound('shiftFailed');
          break;
        case 'matchOver':
          this.winner = e.winner;
          if (e.winner === this.you) this.sound('shiftComplete');
          break;
        default:
          break;
      }
    }
  }

  private sound(id: Parameters<SessionOutput['sound']>[0]): void {
    this.output?.sound(id, 1, 0);
  }

  // MARK: Picture

  private camera(viewport: Vec2): Camera {
    const l = this.world.layout;
    const c = this.world.config;
    const e = l.stopDistance + c.queueSpacing * (c.queueVisible - 1) + c.carLength / 2 + 30;
    const cam = fitCamera({ minX: -e, minY: -e, maxX: e, maxY: e }, viewport, { top: 76, left: 8, bottom: 88, right: 8 });
    const shake = this.effects.shakeOffset;
    return { ...cam, focus: v(cam.focus.x + shake.x, cam.focus.y + shake.y) };
  }

  private render(viewport: Vec2, rm: boolean): RenderList {
    const w = this.world;
    const alpha = this.countIn > 0 ? 0 : Math.min(1, this.accumulator / STEP);
    const list = new RenderList(this.camera(viewport), MapTheme.ground(null));
    CityLayer.add(list, w, null, rm ? null : this.sceneTime, null, null, this.sceneTime);
    const mine = w.seats[this.you];
    SceneBuilder.addRoad(list, w.layout, w.config, mine ? w.armOf(mine) : w.layout.player);
    MapTheme.addIsland(list, null, w);
    this.effects.addGround(list, w, alpha, !rm);
    SceneBuilder.addShadows(list, w, alpha);
    SceneBuilder.addVehicles(list, w, alpha, [], null, null, null);
    this.effects.addAir(list);
    this.addLanes(list);
    this.addTop(list, viewport);
    this.addCenter(list, viewport, rm);
    return list;
  }

  /** A name at the end of every lane; yours in the accent colour, an empty lane says why. */
  private addLanes(list: RenderList): void {
    const w = this.world;
    const c = w.config;
    for (const q of w.seats) {
      // Beside the queue, on the kerb of its lane, so it never covers a car.
      const arm = w.armOf(q);
      const out = armOutward(arm);
      const stop = w.layout.stopPose(arm).position;
      const axis = mul(out, dot(stop, out));
      const side = normalize(sub(stop, axis));
      const beside = add(add(axis, mul(out, c.queueSpacing * 1.5)), mul(side, w.layout.laneWidth + 6));
      const base = toScreen(list.camera, beside);
      const across = normalize(sub(toScreen(list.camera, add(beside, side)), base));
      const at = add(base, mul(across, 30));
      const me = q.seat === this.you;
      const name = me ? 'YOU' : this.names[q.seat] ?? `Player ${q.seat + 1}`;
      if (q.out) {
        const fade = Ease.clamp01((this.sinceOut.get(q.seat) ?? 1) / 0.3);
        list.s(text(name, v(at.x, at.y - 7), me ? 13 : 12, 'center', 'bold'), 'muted', 0.7 * fade);
        list.s(text(REASON[this.reasons.get(q.seat) ?? 'crash'].toUpperCase(), v(at.x, at.y + 9), 11, 'center', 'bold'), 'destructive', fade);
        continue;
      }
      list.s(rect(at, v(me ? 52 : 76, 24), 12), me ? 'accent' : 'scrim', me ? 1 : 0.85);
      list.s(text(name, v(at.x, at.y + 4.5), me ? 13 : 12, 'center', 'bold'), me ? 'accentInk' : 'primary');
      // The stall clock, once it is running out.
      const left = 1 - q.idle / c.versusStallSeconds;
      if (!this.isOver && left < 0.5) {
        const width = 44;
        list.s(rect(v(at.x, at.y + 19), v(width, 4), 2), 'scrim', 0.9);
        list.s(rect(v(at.x - (width * (1 - left)) / 2, at.y + 19), v(width * Math.max(0, left), 4), 2), 'destructive');
      }
    }
  }

  private addTop(list: RenderList, viewport: Vec2): void {
    const left = this.world.seatsLeft.length;
    list.s(rect(v(viewport.x / 2, 40), v(132, 50), 16), 'scrim', 0.85);
    list.s(text('MULTIPLAYER', v(viewport.x / 2, 30), 12, 'center', 'bold'), 'muted');
    list.s(text(`${left} of ${this.world.seats.length} left`, v(viewport.x / 2, 52), 17, 'center', 'bold'), 'primary');
  }

  private addCenter(list: RenderList, viewport: Vec2, rm: boolean): void {
    const mid = v(viewport.x / 2, viewport.y / 2);
    if (this.countIn > 0) {
      list.s(text(String(Math.ceil(this.countIn)), v(mid.x, mid.y + 22), 64, 'center', 'bold'), 'primary');
      list.s(text('Your lane is marked. Last one standing wins.', v(mid.x, mid.y + 56), 14, 'center'), 'muted');
      return;
    }
    const bottom = viewport.y - 24;
    if (this.isOver) {
      const fade = rm ? 1 : Ease.clamp01(this.sinceOver / 0.35);
      const title = this.winner === null ? 'Draw' : this.winner === this.you ? 'You win' : `${this.names[this.winner!] ?? 'Someone'} wins`;
      const size = v(Math.min(300, viewport.x - 32), 112);
      list.s(rect(mid, size, 20), 'scrim', 0.92 * fade);
      list.s(text(title, v(mid.x, mid.y - 6), 30, 'center', 'bold'), this.winner === this.you ? 'accent' : 'primary', fade);
      list.s(text(this.isHost ? 'Play again or leave' : 'Waiting for the host', v(mid.x, mid.y + 26), 14, 'center'), 'muted', fade);
      return;
    }
    const mine = this.world.seats[this.you];
    if (!mine || mine.out) list.s(text("You're out · watching", v(mid.x, bottom - 40), 15, 'center', 'bold'), 'muted');
    else if (mine.idle / this.world.config.versusStallSeconds > 0.5) {
      const seconds = Math.max(0, this.world.config.versusStallSeconds - mine.idle);
      list.s(text(`Send a car · ${seconds.toFixed(1)} s`, v(mid.x, bottom - 40), 15, 'center', 'bold'), 'destructive');
    }
  }
}
