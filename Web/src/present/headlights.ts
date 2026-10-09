import { type Vec2, v } from '../core/vec2';
import type { Pose } from '../core/paths';
import { type RenderList, circle, polygon } from './render';
import { worldOf } from './carArt';
import type { Beam } from './scene';

/** What a layer's headlights look like: how far, how wide, how strong, in how many soft steps. */
export interface BeamLook {
  layers: number;
  /** World units ahead of the bumper at full speed. */
  reach: number;
  /** Half width at the far end, in car widths, of both lamps together. */
  spread: number;
  strength: number;
}

/**
 * A car's headlights (Leo, 09.10.2026: they felt stiff): one soft cone per lamp instead of one rigid wedge.
 * The cones reach further the faster the car goes, swing into a turn, breathe a little and fade in and out
 * with the car (`Beam`, `VehicleLamps.update`) instead of switching.
 */
export const Headlights = {
  /** The beam of a car whose lamps nobody follows: lit when it drives, dark in the queue. */
  rest: (waiting: boolean): Beam => ({ glow: waiting ? 0 : 1, reach: 1, swing: 0 }),

  /** `intensity` scales the whole beam (a dimmed queue, a flash); `time` null: no breathing. */
  add(list: RenderList, pose: Pose, length: number, width: number, look: BeamLook, beam: Beam, intensity: number, time: number | null, id: number): void {
    if (intensity < 0.01) return;
    const breath = time === null ? 1 : 1 + 0.04 * Math.sin(time * 4.1 + id * 1.9) + 0.025 * Math.sin(time * 9.7 + id * 3.1);
    const reach = look.reach * beam.reach;
    const alpha = look.strength * 0.62 * intensity * breath;
    for (const side of [1, -1]) {
      const origin = v(length / 2, width * 0.3 * side);
      const turn = beam.swing + side * 0.04;
      const cos = Math.cos(turn);
      const sin = Math.sin(turn);
      const place = (x: number, y: number): Vec2 => worldOf(v(origin.x + x * cos - y * sin, origin.y + x * sin + y * cos), pose);
      for (let layer = 0; layer < look.layers; layer++) {
        const k = (layer + 1) / look.layers;
        const far = reach * k;
        const spread = width * (0.16 + (look.spread * 0.75 - 0.16) * k);
        list.w(polygon([place(0, width * 0.16), place(far, spread), place(far, -spread), place(0, -width * 0.16)]), 'headlight', alpha);
      }
    }
  },

  /** The lamps themselves: a bright point in a faint halo. */
  addBulbs(list: RenderList, pose: Pose, length: number, width: number, intensity: number): void {
    for (const y of [width * 0.3, -width * 0.3]) {
      const at = worldOf(v(length / 2 - 0.4, y), pose);
      list.w(circle(at, 2.8), 'headlight', 0.1 * Math.min(1, intensity));
      list.w(circle(at, 1), 'headlight', 0.95);
    }
  },
};
