import { v } from '../core/vec2';
import { type RenderList, type Rect, R, rect, Ease } from './render';

/**
 * The progress grammar off the road (Leo, 16.10.2026), borrowed from the Ring Signals: a bar that
 * grew since it was last on screen glides there (the light run), one almost full sends a slow light
 * along its fill (comes soon), and a goal reached sends one wave out from its card (the payout).
 * Amber while it grows, gold once earned. One height, one end and one timing for every bar;
 * `.club-bar` and `.auction-timer-track` in `ui/shell.css` are its DOM twins (`--meter-*`).
 */
export const Meter = {
  height: 6,
  glide: 0.7,
  /** A tier filled up rests this long before the next one starts from empty. */
  hold: 0.35,
  wave: 0.9,
  near: 0.85,

  /** True once for every wave that set off since it was last asked: the session plays it to the hand. */
  landed(): boolean {
    const any = waves > 0;
    waves = 0;
    return any;
  },

  /** The halo behind a card whose goal was just reached; call it before the card's panel. */
  addWave(list: RenderList, key: string, card: Rect, corner: number, o: number, reduceMotion: boolean): void {
    const s = shown.get(key);
    const age = s ? clock() - s.wave : Infinity;
    if (s && !s.felt && age >= 0 && age < Meter.wave) {
      s.felt = true;
      waves++;
    }
    if (reduceMotion || age < 0 || age >= Meter.wave) return;
    const k = Ease.outCubic(age / Meter.wave);
    const grow = 3 + 12 * k;
    list.s(rect(R.center(card), v(R.width(card) + grow * 2, R.height(card) + grow * 2), corner + grow), 'coin', 0.45 * (1 - k) * o);
  },

  /**
   * The bar itself on `track`. `step` counts the tiers reached: a new one fills the bar up, sends
   * the wave and starts the next tier from empty.
   */
  add(list: RenderList, key: string, track: Rect, fraction: number, step: number, o: number, reduceMotion: boolean): void {
    const now = clock();
    const s = follow(key, Ease.clamp01(fraction), step, now);
    const value = reduceMotion ? (s.next ?? s.to) : at(s, now);
    const h = R.height(track);
    const w = R.width(track);
    const y = R.center(track).y;
    list.s(rect(R.center(track), v(w, h), h / 2), 'controlFill', o);
    if (value <= 0) return;
    const filled = Math.max(h, w * value);
    const fill = R.make(track.minX, track.minY, track.minX + filled, track.maxY);
    list.s(rect(R.center(fill), v(filled, h), h / 2), value >= 1 ? 'coin' : 'accent', o);
    if (reduceMotion || value >= 1 || value < Meter.near) return;
    const t = (now % 2.4) / 1.2;
    if (t >= 1) return;
    const saved = list.clip;
    list.clip = fill;
    list.s(rect(v(track.minX - 12 + (filled + 24) * t, y), v(24, h), h / 2), 'primary', 0.4 * Math.sin(Math.PI * t) * o);
    list.clip = saved;
  },
};

interface Shown {
  from: number;
  to: number;
  since: number;
  step: number;
  /** Where the bar goes once the filled tier has rested. */
  next: number | null;
  wave: number;
  felt: boolean;
}

// shortcut: remembered for this visit only, so the first look after a reload does not glide; keep it in the save if that matters.
const shown = new Map<string, Shown>();
let waves = 0;
const clock = (): number => performance.now() / 1000;
const at = (s: Shown, now: number): number => s.from + (s.to - s.from) * Ease.settle((now - s.since) / Meter.glide);

function follow(key: string, value: number, step: number, now: number): Shown {
  let s = shown.get(key);
  if (!s || step < s.step) {
    s = { from: value, to: value, since: -Infinity, step, next: null, wave: -Infinity, felt: true };
    shown.set(key, s);
    return s;
  }
  if (s.next !== null && now >= s.since + Meter.glide + Meter.hold) {
    s.from = 0;
    s.to = s.next;
    s.since = now;
    s.next = null;
  }
  if (step > s.step) {
    s.from = at(s, now);
    s.to = 1;
    s.since = now;
    s.wave = now + Meter.glide;
    s.felt = false;
    s.next = value >= 1 ? null : value;
    s.step = step;
  } else if (s.next !== null) s.next = value;
  else if (value !== s.to) {
    if (value >= 1 && s.to < 1) {
      s.wave = now + Meter.glide;
      s.felt = false;
    }
    s.from = at(s, now);
    s.to = value;
    s.since = now;
  }
  return s;
}
