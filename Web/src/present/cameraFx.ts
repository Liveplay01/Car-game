import type { World } from '../core/world';
import type { GameMode } from '../core/career';
import { Scoring } from '../core/scoring';
import { type Vec2, v, sub, length } from '../core/vec2';
import { type Camera, toScreen, Ease } from './render';

/**
 * The camera's feel during a shift (research of 08.10.2026, after Left 4 Dead's director, Peggle's
 * last peg and Burnout's crash cam): a tension that rises with what is at stake and leans the
 * camera in with the edges darkening, a breath out when a shift is cleared, a lean towards a
 * crash or a takedown, and a slower look at a last car that only just fits.
 *
 * Every zoom pivots on a world point that stays where it is on screen: the tension on the stop
 * line, so the gaps the player reads never move. Tension settles on plateaus and snaps to them,
 * so a still camera lets the ground be baked again. Reduce Motion keeps the vignette (a fade)
 * and drops every zoom.
 */
export const CameraFxTuning = {
  /** Lean-in at full tension, a share of the scale. */
  tensionZoom: 0.04,
  rise: 0.8,
  fall: 1.2,
  /** A cleared shift lets go faster, and the camera breathes out past the street view. */
  release: 0.35,
  /** The slowest the tension moves, per second, so it lands on its plateau instead of creeping towards it. */
  settle: 0.12,
  relief: 0.02,
  reliefTime: 0.9,
  /** The lean towards the crash that ends a shift and towards a takedown. */
  crashZoom: 0.08,
  takedownZoom: 0.05,
  /** A boss's warning: the camera steps back from the ring for a breath, room for what comes. */
  bossPullBack: -0.04,
  /** The last car of a shift, when another vehicle is this close (centre to centre, car lengths). */
  finalZoom: 0.06,
  finalReach: 1.9,
  finalSlow: 0.5,
  finalMax: 0.9,
  /** A Perfect Input: the world nods once towards the stop line (a share of the scale), in `nodRise` seconds and back over `nodFall`. */
  nodZoom: 0.004,
  nodRise: 0.05,
  nodFall: 0.18,
  /** Under Reduce Motion the nod becomes this much extra vignette instead. */
  nodPulse: 0.12,
  /** Between shifts the camera sways like a hand-held one: screen points, seconds per swing on each axis, and how long it takes to fade in and out. */
  breathX: 2.5,
  breathY: 1.8,
  breathPeriodX: 9.3,
  breathPeriodY: 13.1,
  breathIn: 1.6,
  breathOut: 0.35,
};

/** How much is at stake right now, 0…1 (before smoothing). Nothing outside a shift. */
export function tensionOf(world: World, mode: GameMode): number {
  if (world.shift.outcome !== null) return 0;
  const c = world.config;
  let t = 0;
  const left = world.shift.carsLeft;
  if (world.shift.phase === 'closing') t = 0.8;
  else if (world.shift.isRushHour && left !== null) t = 0.45 + 0.35 * (1 - left / Math.max(1, c.rushHourCars));
  // In steps, so the camera holds still between them and the ground stays baked.
  if (mode === 'unlimited' && world.shift.startedAt !== null) t = Math.max(t, 0.11 * Math.floor(5 * Ease.clamp01((world.time - world.shift.startedAt - 30) / 360)));
  const crook = world.criminal.kind;
  if (crook === 'warning' || crook === 'arriving' || crook === 'active') t = Math.max(t, world.vehicles.some((x) => x.role === 'boss' && !x.isCrashed) ? 0.55 : 0.35);
  if (world.military.kind === 'active') t = Math.max(t, 0.55);
  const tiers = Math.min(c.comboThresholds.length, c.comboMultipliers.length);
  if (tiers > 0 && Scoring.tier(world.score.combo, c) >= tiers) t = Math.max(t, 0.5);
  return t;
}

/** The camera `cam` leaned in by `k` around the world point `at`, which stays where it was on screen. */
export function zoomAbout(cam: Camera, at: Vec2, k: number): Camera {
  if (k === 1) return cam;
  return { ...cam, center: at, focus: toScreen(cam, at), scale: cam.scale * k };
}

interface Lean {
  at: Vec2;
  size: number;
  age: number;
  hold: number;
}

export class CameraFx {
  tension = 0;
  private sinceRelief = Infinity;
  private lean: Lean | null = null;
  private sinceNod = Infinity;
  private breath = 0;
  private clock = 0;
  private final: { at: Vec2; age: number; k: number } | null = null;
  /** The last car is close to another one: the world runs at `finalSlow`. */
  finalActive = false;

  /** `idle`: between shifts, nothing to react to; the camera then sways a little (see `breathOffset`). */
  update(target: number, dt: number, idle = false): void {
    const T = CameraFxTuning;
    this.clock += dt;
    this.sinceNod += dt;
    this.breath += ((idle ? 1 : 0) - this.breath) * (1 - Math.exp(-dt / (idle ? T.breathIn : T.breathOut)));
    const tau = target > this.tension ? T.rise : this.sinceRelief < T.reliefTime ? T.release : T.fall;
    // Eased in, but never slower than `settle` per second at the end: it reaches its plateau and holds still.
    const gap = target - this.tension;
    const step = Math.max(Math.abs(gap) * (1 - Math.exp(-dt / tau)), T.settle * dt);
    this.tension = step >= Math.abs(gap) ? target : this.tension + Math.sign(gap) * step;
    this.sinceRelief += dt;
    if (this.lean) {
      this.lean.age += dt;
      if (this.lean.age >= this.lean.hold + 0.6) this.lean = null;
    }
    const f = this.final;
    if (f) {
      f.age += dt;
      const goal = this.finalActive ? 1 : 0;
      f.k += (goal - f.k) * (1 - Math.exp(-dt / (goal > f.k ? 0.1 : 0.3)));
      if (Math.abs(goal - f.k) < 0.01) f.k = goal;
    }
  }

  /** A Perfect Input: one quick nod towards the stop line. */
  nod(): void {
    this.sinceNod = 0;
  }

  private get nodShape(): number {
    const T = CameraFxTuning;
    if (this.sinceNod < T.nodRise) return Ease.outCubic(this.sinceNod / T.nodRise);
    return 1 - Ease.inOutSine((this.sinceNod - T.nodRise) / T.nodFall);
  }

  /** The vignette's extra weight while the nod plays, only under Reduce Motion (which has no zoom). */
  pulse(reduceMotion: boolean): number {
    return reduceMotion ? CameraFxTuning.nodPulse * this.nodShape : 0;
  }

  /** The sway of the camera in screen points: two slow, unrelated swings, faded in only while idle. Nothing under Reduce Motion. */
  breathOffset(reduceMotion: boolean): Vec2 {
    const T = CameraFxTuning;
    if (reduceMotion || this.breath < 0.001) return v(0, 0);
    const turn = 2 * Math.PI * this.clock;
    return v(this.breath * T.breathX * Math.sin(turn / T.breathPeriodX), this.breath * T.breathY * Math.sin(turn / T.breathPeriodY + 1.3));
  }

  /** A cleared shift: the tension lets go and the camera breathes out once. */
  relieve(): void {
    this.sinceRelief = 0;
  }

  /** Leans towards `at` for `hold` seconds (a slow-motion's length), then back over 0.6 s. A bigger lean wins. */
  leanTo(at: Vec2, size: number, hold: number): void {
    if (this.lean && this.lean.size * this.leanShape(this.lean) > size) return;
    this.lean = { at, size, age: 0, hold };
  }

  private leanShape(l: Lean): number {
    if (l.age < 0.2) return Ease.outCubic(l.age / 0.2);
    if (l.age < l.hold) return 1;
    return 1 - Ease.inOutSine((l.age - l.hold) / 0.6);
  }

  /**
   * The last car of a shift is merging with another vehicle within reach: the world slows and the
   * camera leans in on it, until the car is in or the moment has lasted `finalMax`. Taps are closed
   * by then, so the slower world cannot change an outcome.
   */
  watchFinal(world: World, on: boolean): void {
    const T = CameraFxTuning;
    const open = on && world.shift.phase === 'closing' && world.shift.outcome === null;
    const car = open ? world.vehicles.find((x) => x.owner === 'player' && x.phase.kind === 'merging') : undefined;
    const reach = T.finalReach * world.config.carLength;
    const close = car !== undefined && world.vehicles.some((x) => x.owner !== 'player' && x.isCollidable && length(sub(x.position, car.position)) < reach);
    if (close && car && !this.final) this.final = { at: car.position, age: 0, k: 0 };
    this.finalActive = close && this.final !== null && this.final.age < T.finalMax;
    if (!open && this.final?.k === 0) this.final = null;
  }

  get finalScale(): number {
    return this.finalActive ? CameraFxTuning.finalSlow : 1;
  }

  /** The camera with tension, relief, lean and the last car's look; `pivot` is the stop line. */
  apply(cam: Camera, pivot: Vec2, reduceMotion: boolean): Camera {
    if (reduceMotion) return cam;
    const T = CameraFxTuning;
    const relief = this.sinceRelief < T.reliefTime ? T.relief * Math.sin(Math.PI * (this.sinceRelief / T.reliefTime)) : 0;
    let out = zoomAbout(cam, pivot, 1 + T.tensionZoom * this.tension - relief);
    if (this.final) out = zoomAbout(out, this.final.at, 1 + T.finalZoom * this.final.k);
    if (this.sinceNod < T.nodRise + T.nodFall) out = zoomAbout(out, pivot, 1 + T.nodZoom * this.nodShape);
    if (this.lean) out = zoomAbout(out, this.lean.at, 1 + this.lean.size * this.leanShape(this.lean));
    return out;
  }

  /** How dark the edges are, 0…1 of the drawer's strongest vignette. Kept under Reduce Motion. */
  get vignette(): number {
    return this.tension;
  }

  reset(): void {
    this.tension = 0;
    this.sinceRelief = Infinity;
    this.lean = null;
    this.final = null;
    this.finalActive = false;
    this.sinceNod = Infinity;
  }
}
