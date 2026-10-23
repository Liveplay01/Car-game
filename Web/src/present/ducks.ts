import type { World } from '../core/world';
import { type DuckFamily, duckPose } from '../core/ducks';
import { type Vec2, v, add, mul, fromAngle } from '../core/vec2';
import { type RenderList, rect, circle, unitHash, Ease } from './render';

/**
 * The duck family (`core/ducks.ts`) from above: the mother in front, her chicks in a line behind. They trot (a bob
 * with every step, a little sway), the mother looks left and right while she waits at a kerb, a chick that dawdles
 * drifts off to the side and hurries back, but only on the grass and the island, never on a lane. With Reduce Motion
 * they only walk.
 */
export const Ducks = {
  /** Drawn larger than life, so the family reads across the whole roundabout. */
  size: 1.6,

  /** How far `d` along the walk is from the nearest lane (0 on one). */
  offRoad(f: DuckFamily, d: number): number {
    return Math.min(...f.walk.bands.map((b) => (d >= b.from && d <= b.to ? 0 : Math.min(Math.abs(d - b.from), Math.abs(d - b.to)))));
  },

  /** How much of the island's multiplier and combo shows while the family walks over it (0…1). */
  island(world: World): number {
    const f = world.ducks;
    if (!f) return 1;
    const [a, b] = [f.walk.bands[0].to, f.walk.bands[1].from];
    const near = Math.min(...f.at.map((d) => (d >= a && d <= b ? 0 : Math.min(Math.abs(d - a), Math.abs(d - b)))));
    return Ease.smoothstep(near / 30);
  },

  add(list: RenderList, world: World, reduceMotion: boolean): void {
    const f = world.ducks;
    if (!f) return;
    const c = world.config;
    const z = Ducks.size;
    const t = world.time;
    const spacing = c.duckSpacing;
    for (let k = f.at.length - 1; k >= 0; k--) {
      const d = f.at[k];
      const fade = Math.min(Ease.clamp01((d + spacing) / spacing), Ease.clamp01((f.walk.length + spacing - d) / spacing));
      if (fade <= 0) continue;
      const pose = duckPose(f.walk, d);
      const along = fromAngle(pose.heading);
      const side = fromAngle(pose.heading + Math.PI / 2);
      // A chick that has fallen behind wanders off to one side, more so while it dawdles; never on a lane.
      const lag = k === 0 ? 0 : Math.min(14, Math.max(0, f.at[k - 1] - spacing - d));
      const free = Ease.smoothstep(Ducks.offRoad(f, d) / 12);
      const stray = (k % 2 === 0 ? 1 : -1) * lag * (f.dawdle[k] > 0 ? 0.8 : 0.4) * free;
      // The trot: every step a little bob forward and a sway; standing still, they stand still.
      const step = reduceMotion ? 0 : d * 0.9 + k * 1.3;
      const bob = reduceMotion ? 0 : Math.sin(step) * 0.6;
      const sway = reduceMotion ? 0 : Math.sin(step * 0.5) * 0.5;
      const at = add(add(pose.position, mul(along, bob * z)), mul(side, (sway + stray) * z));
      let turn = reduceMotion ? 0 : Math.sin(step * 0.5 + 0.8) * 0.12 + Math.sign(stray) * Math.min(1, lag / 8) * 0.6 * free;
      // Waiting at the kerb, the mother looks this way and that.
      if (k === 0 && f.waiting && !reduceMotion) turn += Math.sin(t * 2.4) * 0.7;
      if (k === 0) Ducks.hen(list, at, pose.heading + turn, z, fade, reduceMotion ? 0 : Math.sin(step * 0.5));
      else {
        const peck = reduceMotion ? 0 : f.dawdle[k] > 0 ? Math.max(0, Math.sin(t * 7 + k)) : Math.max(0, Math.sin(t * 9 + k * 2.3)) * 0.4;
        // Running to catch up: little wings flapping and a hop in every step.
        const flap = reduceMotion || lag < 3 ? 0 : Math.abs(Math.sin(t * 22 + k));
        const hop = reduceMotion || lag < 3 ? 1 : 1 + 0.08 * Math.abs(Math.sin(step * 1.6));
        Ducks.duckling(list, at, pose.heading + turn, (1.05 + 0.2 * unitHash(k, 62)) * z * hop, fade, peck, flap);
      }
    }
  },

  /** The mother: a brown hen with darker wings, a white-edged blue patch, an orange bill and a tail that wags as she walks. */
  hen(list: RenderList, at: Vec2, heading: number, z: number, o: number, wag: number): void {
    const P = (x: number, y: number): Vec2 => add(at, add(mul(fromAngle(heading), x * z), mul(fromAngle(heading + Math.PI / 2), y * z)));
    const S = (x: number, y: number): Vec2 => v(x * z, y * z);
    list.w(rect(add(at, S(1, -1)), S(8.5, 5.8), 2.9 * z, heading), 'shadow', 0.7 * o);
    list.w(rect(P(-4.2, wag * 0.7), S(2.4, 2.2), 0.9 * z, heading + wag * 0.4), 'skinMocha', o);
    list.w(rect(P(-0.6, 0), S(8, 5.4), 2.7 * z, heading), 'skinLatte', o);
    for (const y of [-1, 1]) {
      list.w(rect(P(-1.4, y * 1.5), S(4.6, 1.6), 0.8 * z, heading), 'skinMocha', 0.85 * o);
      list.w(rect(P(-1.2, y * 1.9), S(1.6, 0.7), 0.3 * z, heading), 'lightBlue', 0.9 * o);
    }
    list.w(circle(P(3.7, 0), 2 * z), 'skinMocha', o);
    for (const y of [-1, 1]) list.w(circle(P(4.3, y * 1), 0.38 * z), 'vehicleTire', o);
    list.w(rect(P(5.7, 0), S(1.8, 1.3), 0.6 * z, heading), 'skinPumpkin', o);
  },

  /**
   * A chick: a round yellow fluff ball with a big head, two dot eyes and a tiny bill; `peck` dips the head,
   * `flap` lifts the stubby wings.
   */
  duckling(list: RenderList, at: Vec2, heading: number, size: number, o: number, peck: number, flap: number): void {
    const P = (x: number, y = 0): Vec2 => add(at, add(mul(fromAngle(heading), x * size), mul(fromAngle(heading + Math.PI / 2), y * size)));
    list.w(circle(add(at, v(0.6, -0.6)), 2.1 * size), 'shadow', 0.6 * o);
    for (const y of [-1, 1]) list.w(rect(P(-0.3, y * (1.5 + 0.9 * flap)), v(1.8 * size, 1 * size), 0.5 * size, heading + y * 0.5 * flap), 'skinLemon', o);
    list.w(circle(at, 1.9 * size), 'skinLemon', o);
    list.w(circle(P(-0.6, 0.6), 0.7 * size), 'primary', 0.35 * o);
    const head = 2.1 + 0.5 * peck;
    list.w(circle(P(head), 1.45 * size), 'skinLemon', o);
    for (const y of [-1, 1]) list.w(circle(P(head + 0.5, y * 0.6), 0.25 * size), 'vehicleTire', o);
    list.w(circle(P(head + 1.4), 0.5 * size), 'skinPumpkin', o);
  },
};
