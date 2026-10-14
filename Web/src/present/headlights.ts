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
 * A car's headlights: overlapping, curved light bands keep the beam soft instead of reading as a pair of
 * rigid triangles. The cones reach further the faster the car goes, swing into a turn, breathe a little
 * and fade in and out with the car (`Beam`, `VehicleLamps.update`) instead of switching.
 */
export const Headlights = {
  /** The beam of a car whose lamps nobody follows: lit when it drives, dark in the queue. */
  rest: (waiting: boolean): Beam => ({ glow: waiting ? 0 : 1, reach: 1, swing: 0 }),

  /** `intensity` scales the whole beam (a dimmed queue, a flash); `time` null: no breathing. */
  add(list: RenderList, pose: Pose, length: number, width: number, look: BeamLook, beam: Beam, intensity: number, time: number | null, id: number): void {
    if (intensity < 0.01) return;
    const breath = time === null ? 1 : 1 + 0.04 * Math.sin(time * 4.1 + id * 1.9) + 0.025 * Math.sin(time * 9.7 + id * 3.1);
    const reach = look.reach * beam.reach;
    const alpha = look.strength * 0.56 * intensity * breath;
    for (const side of [1, -1]) {
      const origin = v(length / 2, width * 0.3 * side);
      const turn = beam.swing + side * 0.04;
      const cos = Math.cos(turn);
      const sin = Math.sin(turn);
      const place = (x: number, y: number): Vec2 => worldOf(v(origin.x + x * cos - y * sin, origin.y + x * sin + y * cos), pose);
      const sections = Math.max(5, look.layers);
      // Build a feathered beam from adjoining curved cross-sections. A slight shoulder in the
      // spread mimics a real dipped beam without leaving a sharp triangular edge on the road.
      for (let i = 0; i < sections; i++) {
        const a = i / sections;
        const b = (i + 1) / sections;
        const spreadAt = (t: number): number => width * (0.12 + look.spread * (0.78 * t - 0.12 * t * t));
        const near = Math.max(0.5, reach * a);
        const far = reach * b;
        const fade = (1 - 0.48 * a) * (0.82 + 0.18 * Math.sin(Math.PI * b));
        const shoulder = width * 0.1 * Math.sin(Math.PI * a);
        const inner = spreadAt(a) - shoulder;
        const outer = spreadAt(b) - shoulder;
        const sectionAlpha = alpha * fade / sections * 3.2;
        list.w(polygon([place(near, inner), place(far, outer), place(far, -outer), place(near, -inner)]), 'headlight', sectionAlpha);
      }
    }
  },

  /** The lamps themselves: a warm lens, soft spill and a small cool specular reflection. */
  addBulbs(list: RenderList, pose: Pose, length: number, width: number, intensity: number): void {
    const power = Math.min(1, intensity);
    for (const y of [width * 0.3, -width * 0.3]) {
      const at = worldOf(v(length / 2 - 0.4, y), pose);
      list.w(circle(at, width * 0.34), 'headlight', 0.035 * power);
      list.w(circle(at, width * 0.22), 'headlight', 0.08 * power);
      list.w(circle(at, width * 0.12), 'headlight', 0.42 * power);
      list.w(circle(worldOf(v(length / 2, y), pose), width * 0.055), 'primary', 0.72 * power);
    }
  },

  /** A road lamp: a wide, graduated warm pool and a small bright bulb at its centre. */
  addStreetLamp(list: RenderList, at: Vec2, strength: number): void {
    for (const radius of [54, 46, 39, 32, 26, 20, 15, 10, 6]) {
      list.w(circle(at, radius), 'headlight', strength);
    }
    list.w(circle(at, 4), 'accent', 0.12);
    list.w(circle(at, 2.2), 'headlight', 0.72);
    list.w(circle(at, 0.9), 'primary', 0.8);
  },
};
