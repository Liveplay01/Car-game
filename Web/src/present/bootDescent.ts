import { v } from '../core/vec2';
import { type Camera, type RenderList, dots, rect, Ease } from './render';
import { TopBar } from './hud';
import { skyLayers } from './sky';

/**
 * The way in (Leo, 29.10.2026): while the game loads, the eye comes down from above the clouds onto the
 * player's own map, on the real scene, and lands on exactly the street view. A longer load is a longer
 * fall; `land()` brings it down, then the UI fades in and the cars roll onto the ring. `fail()` lands
 * the same way and leaves a skeleton of the chrome under the error.
 */
export const DescentTuning = {
  /** How much further out the eye starts than the street view. */
  height: 7,
  /** While loading the eye sinks towards `hover`, ever slower: it never stops before the load is done. */
  hover: 0.1,
  sink: 2.5,
  /** Spring rates (critically damped) while loading and on the way down. */
  loadingRate: 3,
  landingRate: 5.5,
  /** A load faster than this still gets a whole fall. */
  minFlight: 1.1,
  /** Under this altitude the UI starts to fade in and the world runs. */
  revealAt: 0.03,
  reveal: 0.4,
  /** The failed screen: how dark the map stays under the error, and the skeleton's pulse. */
  failHaze: 0.6,
  pulse: 1.2,
  wind: 6,
};

export class BootDescent {
  /** 0 on the street, 1 at the top. */
  altitude: number;
  private speed = 0;
  private age = 0;
  private landing = false;
  /** Seconds since the UI began to fade in (null: not yet). */
  private revealAge: number | null = null;
  private failedAge: number | null = null;
  private readonly cloudy: boolean;
  private settle: () => void = () => {};
  /** Resolves once the eye is down, so the error words can rise over a still map. */
  readonly landed = new Promise<void>((resolve) => (this.settle = resolve));

  constructor(reduceMotion: boolean) {
    this.altitude = reduceMotion ? 0 : 1;
    this.cloudy = !reduceMotion;
  }

  land(): void {
    this.landing = true;
  }

  fail(): void {
    this.landing = true;
    this.failedAge ??= -1;
  }

  get failed(): boolean {
    return this.failedAge !== null;
  }

  /** The world may run and the chrome may show. */
  get revealed(): boolean {
    return this.revealAge !== null;
  }

  /** The UI has faded in all the way and the camera is on the street: the session can let go. */
  get done(): boolean {
    return this.revealAge !== null && this.revealAge >= DescentTuning.reveal && this.altitude === 0;
  }

  /** How far the UI has faded in, 0 to 1. */
  get uiOpacity(): number {
    return this.revealAge === null ? 0 : Ease.clamp01(this.revealAge / DescentTuning.reveal);
  }

  step(dt: number): void {
    const T = DescentTuning;
    dt = Math.min(dt, 0.05);
    this.age += dt;
    const down = this.landing && this.age >= T.minFlight;
    if (this.altitude > 0) {
      const target = down ? 0 : T.hover + (1 - T.hover) / (1 + this.age / T.sink);
      const rate = down ? T.landingRate : T.loadingRate;
      for (let n = 0, sub = dt / 4; n < 4; n++) {
        this.speed += (rate * rate * (target - this.altitude) - 2 * rate * this.speed) * sub;
        this.altitude = Math.max(0, this.altitude + this.speed * sub);
      }
      if (down && this.altitude < 0.001) this.altitude = 0;
    }
    if (!down || this.altitude >= T.revealAt) return;
    if (this.failedAge !== null) {
      if (this.failedAge < 0) this.settle();
      this.failedAge = Math.max(0, this.failedAge) + dt;
    } else {
      this.settle();
      this.revealAge = this.revealAge === null ? 0 : this.revealAge + dt;
    }
  }

  private get height(): number {
    return Math.pow(DescentTuning.height, this.altitude);
  }

  /** The street view, seen from the eye's height. */
  camera(street: Camera): Camera {
    return { ...street, scale: street.scale / this.height };
  }

  /** Haze and clouds over the map, the skeleton once a failed load is down. Screen space, on top of the scene. */
  add(list: RenderList, street: Camera): void {
    const T = DescentTuning;
    const { x: w, y: h } = street.viewport;
    const whole = rect(v(w / 2, h / 2), v(w, h));
    const fail = this.failedAge === null ? 0 : Ease.outCubic(Ease.clamp01(this.failedAge / T.reveal));
    const haze = Math.max(this.altitude * this.altitude, fail * T.failHaze);
    if (haze > 0.002) list.s(whole, 'background', haze);
    if (this.cloudy) {
      const unit = Math.min(w, h);
      for (const l of skyLayers(this.height, this.age * T.wind))
        list.s(dots(l.centres.map((c) => v(w / 2 + c.x * unit, h / 2 + c.y * unit)), l.radii.map((r) => r * unit)), l.token, l.opacity);
    }
    if (this.failedAge === null) return;
    // shortcut: no safe-area inset under the dock skeleton; add it if a notched phone shows a gap.
    const pulse = fail * (0.55 + 0.25 * Math.abs(Math.sin((Math.PI * Math.max(0, this.failedAge)) / T.pulse)));
    const top = TopBar.frame(w);
    list.s(rect(v((top.minX + top.maxX) / 2, (top.minY + top.maxY) / 2), v(top.maxX - top.minX, top.maxY - top.minY), TopBar.corner), 'surface', pulse);
    const dock = Math.min(w - 2 * TopBar.margin, TopBar.maxWidth);
    list.s(rect(v(w / 2, h - 8 - TopBar.height / 2), v(dock, TopBar.height), TopBar.corner), 'surface', pulse);
  }
}
