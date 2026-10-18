import type { Vec2 } from '../core/vec2';

/**
 * A press that may turn into a sideways swipe between a page's segments (Leo, 18.10.2026). It decides once, early, which
 * way the finger goes: along the list (a scroll, never a swipe for this press) or sideways (never a scroll or a tap).
 */
export class SideSwipe {
  /** How far the finger goes before its direction counts, and how far sideways a swipe has to go. */
  static readonly intent = 8;
  static readonly distance = 44;

  private start: Vec2 | null = null;
  private axis: 'x' | 'y' | 'done' | null = null;

  press(p: Vec2): void {
    this.start = p;
    this.axis = null;
  }

  release(): void {
    this.start = null;
    this.axis = null;
  }

  /** The finger has gone sideways: what is under it neither scrolls nor taps. */
  get sideways(): boolean {
    return this.axis === 'x' || this.axis === 'done';
  }

  /** The next (+1) or previous (-1) segment once the finger has gone far enough; once per press. */
  move(p: Vec2): -1 | 0 | 1 {
    const from = this.start;
    if (!from || this.axis === 'y' || this.axis === 'done') return 0;
    const dx = p.x - from.x;
    const dy = p.y - from.y;
    if (this.axis === null) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SideSwipe.intent) return 0;
      this.axis = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'x' : 'y';
    }
    if (this.axis !== 'x' || Math.abs(dx) < SideSwipe.distance) return 0;
    this.axis = 'done';
    return dx < 0 ? 1 : -1;
  }
}
