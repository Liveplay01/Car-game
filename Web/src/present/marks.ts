import type { Layout } from '../core/roundabout';
import type { Config } from '../core/config';
import type { MergeRating } from '../core/events';
import type { World } from '../core/world';
import type { Vehicle } from '../core/vehicle';
import type { Pose } from '../core/paths';
import { type Vec2, add, sub, mul, left, fromAngle, wrap } from '../core/vec2';
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

  /**
   * The road gets worn (Leo, 24.10.2026): every skilled merge of the shift leaves the turn-in a touch darker and wider than the
   * one before, up to `wearMost` merges, and it stays that way until the next shift begins. `worn` is the shift's count,
   * `shown` what the eye has caught up to.
   */
  static readonly wearMost = 6;
  static readonly wearOpacity = 0.07;
  static readonly wearWidth = 0.12;

  private marks: Mark[] = [];
  private worn = 0;
  private shown = 0;

  static leavesMark(rating: MergeRating): boolean {
    return rating === 'tightFit' || rating === 'nearMiss' || rating === 'perfect';
  }

  add(snow = false): void {
    this.worn = Math.min(TyreMarks.wearMost, this.worn + 1);
    this.marks.push({ age: 0, hold: snow ? 10 : TyreMarks.hold, fade: snow ? 12 : TyreMarks.fade });
  }

  /** A new shift: the road is cleaned, the wear eases away. */
  fade(): void {
    this.worn = 0;
  }

  update(dt: number): void {
    if (dt <= 0) return;
    this.shown += (this.worn - this.shown) * Math.min(1, dt * (this.worn > this.shown ? 8 : 1.6));
    if (Math.abs(this.worn - this.shown) < 0.01) this.shown = this.worn;
    if (this.marks.length === 0) return;
    for (const m of this.marks) m.age += dt;
    this.marks = this.marks.filter((m) => m.age < m.hold + m.fade);
  }

  clear(): void {
    this.marks = [];
    this.worn = 0;
    this.shown = 0;
  }

  addGround(list: RenderList, layout: Layout, c: Config): void {
    if (this.marks.length === 0 && this.shown <= 0) return;
    // Every player merge turns in on the same curve: one opacity for all marks on it.
    let opacity = 0;
    for (const m of this.marks) {
      const fadeIn = Ease.outCubic(m.age / TyreMarks.appear);
      const fadeOut = 1 - Ease.smoothstep((m.age - m.hold) / m.fade);
      opacity = Math.max(opacity, fadeIn * fadeOut);
    }
    // What stays of the worn turn-in under the fresh marks: faint, and wider the more has been driven over it.
    opacity = Math.max(opacity, TyreMarks.wearOpacity * this.shown);
    if (opacity <= 0.01) return;
    const thickness = TyreMarks.thickness + TyreMarks.wearWidth * this.shown;
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
        list.w(line(from, to, thickness), 'vehicleTire', TyreMarks.strength * opacity * taper);
        from = to;
      }
    }
  }
}

/**
 * Brake marks (Leo, 23.10.2026): a Tight Fit leaves a faint streak where the ring car that came
 * closest had to brake, darker where the tyres bit hardest. They stay for the rest of the shift, so
 * the road shows afterwards where it got close, and fade once the next shift begins.
 */
export class BrakeMarks {
  static readonly most = 24;
  static readonly appear = 0.25;
  static readonly fade = 1.4;
  static readonly strength = 0.3;
  static readonly thickness = 1.3;
  static readonly reach = 1.2;
  static readonly segments = 8;

  private marks: { tracks: Vec2[][]; age: number; gone: number | null }[] = [];

  /** `veh`: the car that braked, on the ring; the streak runs back along its lane from where it is now. */
  add(world: World, veh: Vehicle): void {
    const c = world.config;
    const p = veh.phase;
    const ring = world.layout.rings[veh.lane];
    const behind = (d: number): Pose => (p.kind === 'ring' ? ring.pose(wrap(p.s - d, ring.length)) : { position: sub(veh.position, mul(fromAngle(veh.heading), d)), heading: veh.heading });
    const length = c.carLength * BrakeMarks.reach;
    const track = c.carWidth / 2 - 1.5;
    const tracks = [1, -1].map((side) => {
      const points: Vec2[] = [];
      for (let k = 0; k <= BrakeMarks.segments; k++) {
        const pose = behind(c.carLength * 0.3 + length * (1 - k / BrakeMarks.segments));
        points.push(add(pose.position, mul(left(fromAngle(pose.heading)), side * track)));
      }
      return points;
    });
    this.marks.push({ tracks, age: 0, gone: null });
    if (this.marks.length > BrakeMarks.most) this.marks.shift();
  }

  /** The next shift has begun: the old marks fade. */
  fade(): void {
    for (const m of this.marks) m.gone ??= 0;
  }

  update(dt: number): void {
    if (dt <= 0 || this.marks.length === 0) return;
    for (const m of this.marks) {
      m.age += dt;
      if (m.gone !== null) m.gone += dt;
    }
    this.marks = this.marks.filter((m) => m.gone === null || m.gone < BrakeMarks.fade);
  }

  clear(): void {
    this.marks = [];
  }

  addGround(list: RenderList): void {
    const n = BrakeMarks.segments;
    for (const m of this.marks) {
      const o = BrakeMarks.strength * Ease.outCubic(m.age / BrakeMarks.appear) * (m.gone === null ? 1 : 1 - Ease.smoothstep(m.gone / BrakeMarks.fade));
      if (o <= 0.01) continue;
      for (const points of m.tracks) {
        // Light where the brakes went on, darkest just before the car let go of them.
        for (let k = 1; k <= n; k++) list.w(line(points[k - 1], points[k], BrakeMarks.thickness), 'vehicleTire', o * Math.min(1, (k / n) * 1.4) * Math.min(1, (n - k + 1) / 1.5));
      }
    }
  }
}
