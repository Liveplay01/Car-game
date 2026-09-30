import type { Layout } from '../core/roundabout';
import type { Config } from '../core/config';
import type { MergeRating } from '../core/events';
import { add, mul, left, fromAngle } from '../core/vec2';
import { type RenderList, line, Ease } from './render';

interface Mark {
  age: number;
  /** In the snow the tracks stay much longer. */
  hold: number;
  fade: number;
}

/**
 * Rubber on the road: a skilled merge (Tight Fit, Near Miss, Perfect) leaves two fine tyre
 * marks where the car turned into the ring. They fade after a few seconds, so the road
 * itself tells how close it was, next to the popup. Drawn under the cars, above the road.
 */
export class TyreMarks {
  static readonly hold = 1;
  static readonly fade = 2;
  static readonly appear = 0.12;
  /** Part of the entry path the rear wheels mark: the turn-in, not the stop line. */
  static readonly from = 0.35;
  static readonly to = 0.97;
  static readonly segments = 14;
  static readonly thickness = 1.1;
  static readonly strength = 0.85;

  private marks: Mark[] = [];

  static leavesMark(rating: MergeRating): boolean {
    return rating === 'tightFit' || rating === 'nearMiss' || rating === 'perfect';
  }

  add(snow = false): void {
    this.marks.push({ age: 0, hold: snow ? 10 : TyreMarks.hold, fade: snow ? 12 : TyreMarks.fade });
  }

  update(dt: number): void {
    if (dt <= 0 || this.marks.length === 0) return;
    for (const m of this.marks) m.age += dt;
    this.marks = this.marks.filter((m) => m.age < m.hold + m.fade);
  }

  clear(): void {
    this.marks = [];
  }

  addGround(list: RenderList, layout: Layout, c: Config): void {
    if (this.marks.length === 0) return;
    // Every player merge turns in on the same curve: one opacity for all marks on it.
    let opacity = 0;
    for (const m of this.marks) {
      const fadeIn = Ease.outCubic(m.age / TyreMarks.appear);
      const fadeOut = 1 - Ease.smoothstep((m.age - m.hold) / m.fade);
      opacity = Math.max(opacity, fadeIn * fadeOut);
    }
    if (opacity <= 0.01) return;
    const path = layout.entry(layout.player);
    const track = c.carWidth / 2 - 1.5;
    const n = TyreMarks.segments;
    const at = (k: number): number => path.length * (TyreMarks.from + ((TyreMarks.to - TyreMarks.from) * k) / n);
    for (const side of [1, -1]) {
      const start = path.pose(at(0));
      let from = add(start.position, mul(left(fromAngle(start.heading)), side * track));
      for (let k = 1; k <= n; k++) {
        const pose = path.pose(at(k));
        const to = add(pose.position, mul(left(fromAngle(pose.heading)), side * track));
        // Soft ends: the rubber builds up and thins out again.
        const taper = Math.sin((Math.PI * (k - 0.5)) / n);
        list.w(line(from, to, TyreMarks.thickness), 'vehicleTire', TyreMarks.strength * opacity * taper);
        from = to;
      }
    }
  }
}
