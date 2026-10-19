import { type Vec2, v } from '../core/vec2';
import type { Pose } from '../core/paths';
import { type RenderList, type SpriteArt, circle, polygon, spriteArt, sprite } from './render';
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
    const cone = coneArt(width, look);
    const heading = { cos: Math.cos(pose.heading), sin: Math.sin(pose.heading) };
    const scale = v(beam.reach, 1);
    for (let side = 1; side >= -1; side -= 2) {
      const lx = length / 2;
      const ly = width * 0.3 * side;
      const at = v(pose.position.x + (lx * heading.cos - ly * heading.sin), pose.position.y + (lx * heading.sin + ly * heading.cos));
      // A flash is brighter than the picture's own brightness: the beam is laid on again for what is over one.
      for (let left = intensity * breath; left > 0.001; left -= 1) list.w(sprite(cone, at, pose.heading + beam.swing + side * 0.04, scale), 'headlight', Math.min(1, left));
    }
  },

  /** The lamps themselves: a warm lens, soft spill and a small cool specular reflection. */
  addBulbs(list: RenderList, pose: Pose, length: number, width: number, intensity: number): void {
    list.w(sprite(bulbsArt(width), worldOf(v(length / 2 - 0.4, 0), pose), pose.heading, v(1, 1)), 'headlight', Math.min(1, intensity));
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

const cones = new Map<string, SpriteArt>();

/**
 * One lamp's beam at its full reach, alone and straight ahead (+x), at the brightness of a beam of intensity 1: curved,
 * overlapping light bands keep it soft instead of reading as a rigid triangle. The cones reach further the faster the car
 * goes, swing into a turn and breathe, which the sprite's stretch, turn and opacity do (`Headlights.add`).
 */
function coneArt(width: number, look: BeamLook): SpriteArt {
  const key = `cone|${width}|${look.layers}|${look.reach}|${look.spread}|${look.strength}`;
  let art = cones.get(key);
  if (art) return art;
  const spreadAt = (t: number): number => width * (0.12 + look.spread * (0.78 * t - 0.12 * t * t));
  const out = spreadAt(1) + 1;
  art = spriteArt(key, { minX: 0, maxX: look.reach + 1, minY: -out, maxY: out }, (list) => {
    const sections = look.layers;
    const alpha = look.strength * 0.56;
    // Adjoining curved cross-sections; a slight shoulder in the spread mimics a real dipped beam.
    for (let i = 0; i < sections; i++) {
      const a = i / sections;
      const b = (i + 1) / sections;
      const near = Math.max(0.5, look.reach * a);
      const far = look.reach * b;
      const fade = (1 - 0.48 * a) * (0.82 + 0.18 * Math.sin(Math.PI * b));
      const shoulder = width * 0.1 * Math.sin(Math.PI * a);
      const inner = spreadAt(a) - shoulder;
      const outer = spreadAt(b) - shoulder;
      list.w(polygon([v(near, inner), v(far, outer), v(far, -outer), v(near, -inner)]), 'headlight', (alpha * fade / sections) * 3.2);
    }
  });
  if (cones.size >= 24) cones.clear();
  cones.set(key, art);
  return art;
}

const bulbs = new Map<number, SpriteArt>();

/** Both lamps of a car, centred between them (+x ahead): the lens, its spill and the specular spot. */
function bulbsArt(width: number): SpriteArt {
  let art = bulbs.get(width);
  if (art) return art;
  const reach = width * 0.34 + 1;
  art = spriteArt(`bulbs|${width}`, { minX: -reach, maxX: reach, minY: -(width * 0.3 + reach), maxY: width * 0.3 + reach }, (list) => {
    for (const y of [width * 0.3, -width * 0.3]) {
      list.w(circle(v(0, y), width * 0.34), 'headlight', 0.035);
      list.w(circle(v(0, y), width * 0.22), 'headlight', 0.08);
      list.w(circle(v(0, y), width * 0.12), 'headlight', 0.42);
      list.w(circle(v(0.4, y), width * 0.055), 'primary', 0.72);
    }
  });
  if (bulbs.size >= 24) bulbs.clear();
  bulbs.set(width, art);
  return art;
}
