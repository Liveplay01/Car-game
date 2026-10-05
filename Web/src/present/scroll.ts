import { v, clamp } from '../core/vec2';
import { type RenderList, type Rect, R, rect, Ease } from './render';

/**
 * A list that scrolls like a native one: a finger drags it, a flick keeps it going, past the
 * ends it gives way with rising resistance and springs back. The Upgrades, the Progress tab and
 * the Collection share it. A press is a tap until the finger moves; the lift decides.
 */
export class Scroller {
  /** The scroll offset (points), the fling speed, and a finger on the list. */
  scroll = 0;
  velocity = 0;
  drag: { startY: number; startScroll: number; moved: boolean; y: number } | null = null;
  private lastScroll = 0;
  private target: number | null = null;
  /** How visible the thin bar at the edge is (it shows while the list moves). */
  indicator = 0;

  /** Past the ends the list gives way with rising resistance, like a native scroll view. */
  static rubber(overshoot: number): number {
    const d = 120;
    return (1 - 1 / ((Math.abs(overshoot) * 0.55) / d + 1)) * d * Math.sign(overshoot);
  }

  press(y: number): void {
    this.target = null;
    this.drag = { startY: y, startScroll: this.scroll, moved: false, y };
    this.velocity = 0;
  }

  move(y: number, maxScroll: number): void {
    const d = this.drag;
    if (!d) return;
    d.y = y;
    if (!d.moved && Math.abs(y - d.startY) < 6) return;
    d.moved = true;
    const raw = d.startScroll - (y - d.startY);
    this.scroll = raw < 0 ? Scroller.rubber(raw) : raw > maxScroll ? maxScroll + Scroller.rubber(raw - maxScroll) : raw;
  }

  /** True when the finger lifted without scrolling: it was a tap. */
  release(): boolean {
    const d = this.drag;
    this.drag = null;
    return !!d && !d.moved;
  }

  /** Glide to a scroll position (a card brought into view). */
  scrollTo(target: number): void {
    this.target = target;
    this.velocity = 0;
  }

  /** Back to the top at once: a new section starts at its beginning. */
  reset(): void {
    this.scroll = 0;
    this.velocity = 0;
    this.target = null;
    this.drag = null;
    this.lastScroll = 0;
    this.indicator = 0;
  }

  /** A mouse wheel or trackpad: the list glides to where the turns add up, never jumps. */
  wheel(dy: number, maxScroll: number): void {
    this.scrollTo(clamp((this.target ?? this.scroll) + dy, 0, maxScroll));
  }

  /** The fling decays; past an end it springs back. */
  follow(delta: number, maxScroll: number): void {
    if (delta <= 0) return;
    if (this.drag) {
      if (this.drag.moved) this.velocity = 0.6 * this.velocity + (0.4 * (this.scroll - this.lastScroll)) / delta;
      this.lastScroll = this.scroll;
      return;
    }
    if (this.target !== null) {
      this.scroll += (this.target - this.scroll) * Math.min(1, delta / 0.12);
      if (Math.abs(this.target - this.scroll) < 0.5) {
        this.scroll = this.target;
        this.target = null;
      }
      this.lastScroll = this.scroll;
      return;
    }
    this.scroll += this.velocity * delta;
    this.velocity *= Math.exp(-delta / 0.325);
    const target = clamp(this.scroll, 0, maxScroll);
    if (target !== this.scroll) {
      this.velocity *= Math.exp(-delta / 0.05);
      this.scroll += (target - this.scroll) * Math.min(1, delta / 0.09);
      if (Math.abs(target - this.scroll) < 0.3) this.scroll = target;
    }
    if (Math.abs(this.velocity) < 4) this.velocity = 0;
    this.lastScroll = this.scroll;
  }

  /** Glides so that `r` (as drawn now) lies inside `window`, never past `maxScroll`. */
  reveal(r: Rect, window: Rect, maxScroll: number): void {
    let target = this.scroll;
    if (r.maxY > window.maxY) target += Math.min(r.maxY - window.maxY, r.minY - window.minY);
    else if (r.minY < window.minY) target -= window.minY - r.minY;
    target = clamp(target, 0, maxScroll);
    if (Math.abs(target - this.scroll) > 0.5) this.scrollTo(target);
  }

  /** A thin bar at `x`, beside `area`, while the list moves, like iOS. */
  addIndicator(list: RenderList, area: Rect, maxScroll: number, x: number): void {
    if (maxScroll <= 0) return;
    const moving = this.drag?.moved || Math.abs(this.velocity) > 4 || this.target !== null;
    this.indicator += ((moving ? 1 : 0) - this.indicator) * 0.2;
    if (this.indicator < 0.02) return;
    const h = R.height(area);
    const bar = Math.max(36, (h * h) / (h + maxScroll));
    const y = area.minY + (h - bar) * Ease.clamp01(this.scroll / maxScroll) + bar / 2;
    list.s(rect(v(x, y), v(3, bar), 1.5), 'muted', 0.7 * this.indicator);
  }
}

/**
 * Cuts everything drawn into `list` since `start` to `window`: a scrolling list must not draw
 * over the header. An item with a clip of its own (a card's glow) keeps the overlap of both.
 */
export function clipTo(list: RenderList, start: number, window: Rect): void {
  for (let i = start; i < list.items.length; i++) {
    const own = list.items[i].clip;
    const clip = own ? overlap(own, window) : window;
    list.items[i] = { ...list.items[i], clip };
  }
}

function overlap(a: Rect, b: Rect): Rect {
  const minX = Math.max(a.minX, b.minX);
  const minY = Math.max(a.minY, b.minY);
  return R.make(minX, minY, Math.max(minX, Math.min(a.maxX, b.maxX)), Math.max(minY, Math.min(a.maxY, b.maxY)));
}
