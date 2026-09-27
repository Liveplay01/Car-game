import type { GameMode } from '../core/career';
import { type Vec2, v } from '../core/vec2';
import { type RenderItem, type RenderList, Ease, moved } from './render';
import { type Screen, type Tab, TAB_BAR, barTab } from './flow';

/** Which screen, without what it shows: a new result is not a new screen. */
export type ScreenKey = 'ready' | 'settings' | 'playing' | 'result' | `page:${Tab}`;

export const screenKey = (s: Screen): ScreenKey => (s.k === 'page' ? `page:${s.tab}` : s.k);

const keyTab = (k: ScreenKey): Tab => (k.startsWith('page:') ? (k.slice(5) as Tab) : 'game');
/** The tab-bar position; the Street Builder sits half a step right of the Upgrades. */
const keyPosition = (k: ScreenKey): number => {
  const tab = keyTab(k);
  return Math.max(0, TAB_BAR.indexOf(barTab(tab))) + (tab === 'streetBuilder' ? 0.5 : 0);
};
const keyIsBuild = (k: ScreenKey): boolean => k.startsWith('page:') && barTab(keyTab(k)) === 'upgrades';

/**
 * What two screens share stays where it is (Leo, 27.09.2026: "was gleich bleibt, bleibt am
 * gleichen Ort"). Items carry a tag for the part they belong to; a part both screens draw is
 * not slid or faded out and in again:
 * - `STATIC` parts (the page ground, the balance chip, the segment track, the top card) stay
 *   exactly as they are; the page ground blends to the new one's strength.
 * - `LABEL` parts (titles, segment labels and thumb, the top card's columns) cross-fade in
 *   place; a label that did not change at all simply stays.
 * Everything else slides and fades as before.
 */
const STATIC = new Set(['backdrop', 'headerChip', 'segTrack', 'topbarScrim', 'topbarCard']);
const LABEL = new Set(['headerTitle', 'segLabels', 'segThumb', 'topbarLabels']);

const sameItem = (a: RenderItem, b: RenderItem): boolean => a.color === b.color && Math.abs(a.opacity - b.opacity) < 0.01 && JSON.stringify(a.p) === JSON.stringify(b.p);

/**
 * Screen changes are never a cut (`Transitions.swift`): whatever lay over the scene fades and
 * slides out while the new one glides in on a critically damped spring. Tabs move sideways
 * in tab-bar order, the settings come up from below, the game's own screens rise a little.
 * The scene underneath never moves, and neither does what both screens share.
 */
export class ScreenTransition {
  static readonly duration = 0.42;
  static readonly fadeIn = 0.2;
  static readonly fadeOut = 0.16;
  static readonly tabSlide = 28;
  static readonly tabSlideOut = 16;
  static readonly rise = 16;

  outgoing: RenderItem[];
  age = 0;
  direction: number;
  /** Between the Build tab's two pages the segment thumb glides by itself. */
  keepsChrome: boolean;
  private outgoingTags: Set<string>;
  private outgoingBackdrop: RenderItem | undefined;

  constructor(from: ScreenKey, to: ScreenKey, outgoing: RenderItem[]) {
    this.keepsChrome = keyIsBuild(from) && keyIsBuild(to);
    this.outgoing = outgoing;
    this.outgoingTags = new Set(outgoing.map((i) => i.tag).filter((t): t is string => t !== undefined));
    this.outgoingBackdrop = outgoing.find((i) => i.tag === 'backdrop');
    const a = keyPosition(from);
    const b = keyPosition(to);
    this.direction = a === b || to === 'settings' || from === 'settings' ? 0 : b > a ? 1 : -1;
  }

  get isDone(): boolean {
    return this.age >= ScreenTransition.duration;
  }

  private isStatic(tag: string): boolean {
    return STATIC.has(tag) || (this.keepsChrome && tag === 'segThumb');
  }

  /** Moves the new screen's items (from `start`) and lays the fading old screen underneath. */
  apply(list: RenderList, start: number, reduceMotion: boolean): void {
    const T = ScreenTransition;
    const fade = Ease.outCubic(this.age / T.fadeIn);
    const spring = Ease.settle(this.age / T.duration);
    const way = this.direction === 0 ? v(0, T.rise) : v(T.tabSlide * this.direction, 0);
    const shift = reduceMotion ? v(0, 0) : v(way.x * (1 - spring), way.y * (1 - spring));

    const incoming = list.items.slice(start);
    const shared = new Set<string>();
    for (const item of incoming) if (item.tag !== undefined && this.outgoingTags.has(item.tag)) shared.add(item.tag);
    // Labels that did not change: kept as they are, on both sides.
    const unchanged = new Set<RenderItem>();
    for (const item of incoming) {
      if (item.tag === undefined || !shared.has(item.tag) || !LABEL.has(item.tag)) continue;
      const twin = this.outgoing.find((o) => o.tag === item.tag && !unchanged.has(o) && sameItem(o, item));
      if (twin) {
        unchanged.add(item);
        unchanged.add(twin);
      }
    }

    for (let i = start; i < list.items.length; i++) {
      const item = list.items[i];
      const tag = item.tag;
      if (tag !== undefined && shared.has(tag)) {
        if (tag === 'backdrop' && this.outgoingBackdrop) {
          const from = this.outgoingBackdrop.opacity;
          list.items[i] = { ...item, opacity: from + (item.opacity - from) * spring };
        } else if (this.isStatic(tag) || unchanged.has(item)) continue;
        else list.items[i] = moved(item, v(0, 0), fade);
        continue;
      }
      list.items[i] = moved(item, shift, fade);
    }

    const gone = Ease.outCubic(this.age / T.fadeOut);
    if (gone >= 1 && fade >= 1) return;
    const away = reduceMotion || this.direction === 0 ? v(0, 0) : v(-T.tabSlideOut * this.direction * gone, 0);
    const old: RenderItem[] = [];
    for (const item of this.outgoing) {
      const tag = item.tag;
      if (tag !== undefined && shared.has(tag)) {
        if (this.isStatic(tag) || unchanged.has(item) || fade >= 1) continue;
        // A cross-fade in place: the old label leaves exactly as fast as the new one comes.
        old.push(moved(item, v(0, 0), 1 - fade));
        continue;
      }
      if (gone < 1) old.push(moved(item, away, 1 - gone));
    }
    list.items.splice(start, 0, ...old);
  }
}

/** Keeps the last frame's overlay and starts a transition when the screen changes. */
export class TransitionTracker {
  private shownKey: ScreenKey | null = null;
  private shownOverlay: RenderItem[] = [];
  transition: ScreenTransition | null = null;

  advance(delta: number): void {
    if (!this.transition) return;
    this.transition.age += delta;
    if (this.transition.isDone) this.transition = null;
  }

  apply(list: RenderList, screen: Screen, start: number, reduceMotion: boolean): void {
    const key = screenKey(screen);
    const drawn = list.items.slice(start);
    if (this.shownKey !== null && this.shownKey !== key) this.transition = new ScreenTransition(this.shownKey, key, this.shownOverlay);
    this.shownKey = key;
    this.shownOverlay = drawn;
    this.transition?.apply(list, start, reduceMotion);
  }
}

/**
 * The Game tab's mode swipe (`GameSession.followModePan`): the map follows the finger,
 * travels out, the next roundabout comes in from the other side and clicks in on a spring
 * with a small overshoot. A quick flick counts like a long drag.
 */
export class ModePan {
  static readonly swipeThreshold = 36;
  static readonly frequency = 17;
  static readonly damping = 0.68;

  pan = 0;
  velocity = 0;
  drag: { start: Vec2; offset: number } | null = null;
  travel: { to: GameMode; direction: number } | null = null;

  get isTracking(): boolean {
    return this.drag !== null;
  }

  get isResting(): boolean {
    return this.drag === null && this.travel === null && this.pan === 0;
  }

  reset(): void {
    this.drag = null;
    this.travel = null;
    this.pan = 0;
    this.velocity = 0;
  }

  press(point: Vec2): void {
    // Caught while it springs back: it stays under the finger.
    this.drag = { start: v(point.x - this.pan, point.y), offset: this.pan };
  }

  move(point: Vec2): void {
    if (this.drag) this.drag.offset = point.x - this.drag.start.x;
  }

  /** What the lift means: a tap, a swipe to the next (+1) or previous (-1) mode, or nothing. */
  release(point: Vec2, width: number): 'tap' | 1 | -1 | null {
    const drag = this.drag;
    if (!drag) return null;
    this.drag = null;
    const offset = point.x - drag.start.x;
    const projected = offset + this.velocity * 0.18;
    const S = ModePan.swipeThreshold;
    if (Math.abs(offset) < S && Math.abs(this.velocity) < 400 && Math.abs(this.pan) < S) return 'tap';
    if (Math.abs(projected) > width * 0.22) return projected < 0 ? 1 : -1;
    return null;
  }

  /** Advances the spring. Returns the mode to switch to once the old map is out of the picture. */
  follow(delta: number, width: number, index: number, count: number): GameMode | null {
    width = Math.max(width, 1);
    if (this.drag) {
      const canGo = this.drag.offset < 0 ? index < count - 1 : index > 0;
      const pan = canGo ? this.drag.offset : this.drag.offset / 3;
      if (delta > 0) this.velocity = 0.5 * this.velocity + (0.5 * (pan - this.pan)) / delta;
      this.pan = pan;
      return null;
    }
    const target = this.travel ? -this.travel.direction * width * 1.3 : 0;
    const omega = ModePan.frequency;
    const steps = 4;
    const dt = delta / steps;
    for (let i = 0; i < steps; i++) {
      const acceleration = -omega * omega * (this.pan - target) - 2 * ModePan.damping * omega * this.velocity;
      this.velocity += acceleration * dt;
      this.pan += this.velocity * dt;
    }
    let switched: GameMode | null = null;
    const travel = this.travel;
    if (travel && -this.pan * travel.direction >= width * 0.9) {
      this.travel = null;
      switched = travel.to;
      this.pan += travel.direction * width * 1.8;
    }
    if (!this.travel && Math.abs(this.pan) < 0.3 && Math.abs(this.velocity) < 5) {
      this.pan = 0;
      this.velocity = 0;
    }
    return switched;
  }
}
