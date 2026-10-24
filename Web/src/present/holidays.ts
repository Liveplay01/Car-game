import type { World } from '../core/world';
import { type Vec2, v, add, sub, mul, dot, normalize, fromAngle, TAU } from '../core/vec2';
import { type RenderList, circle, line, unitHash, Ease } from './render';
import type { ColorToken } from './theme';

/** What the calendar brings to the city: lights in December, fireworks on New Year's Eve, pumpkins on Halloween. */
export type Holiday = 'december' | 'newYear' | 'halloween';

/**
 * Holidays without a banner (Leo, 23.10.2026): nothing announces them, the city simply has them.
 * In December a few roofs wear a string of lights; on New Year's Eve (and in the small hours after
 * it) rockets go up at the edge of the city. On Halloween the lights turn orange and violet and a pumpkin
 * glows on the doorstep of every other house.
 * By the player's own clock.
 */
export const Holidays = {
  /** A share of the houses that put lights up. */
  lit: 0.35,
  bulbSpacing: 4.6,
  /** A rocket goes up about this often, and its sparks live this long. */
  rocketEvery: 1.15,
  rise: 0.5,
  burst: 1.9,

  of(d: Date): Holiday | null {
    const month = d.getMonth();
    if ((month === 11 && d.getDate() === 31) || (month === 0 && d.getDate() === 1 && d.getHours() < 6)) return 'newYear';
    if (month === 9 && d.getDate() === 31) return 'halloween';
    return month === 11 ? 'december' : null;
  },

  hasLights: (index: number): boolean => unitHash(index, 33) < Holidays.lit,

  /**
   * A string of bulbs round the eaves of house `index`: mostly warm white, now and then coloured.
   * They twinkle out of step; without a clock (`time` null) they simply glow.
   */
  addLights(list: RenderList, center: Vec2, size: Vec2, angle: number, index: number, fade: number, time: number | null, glow: boolean, holiday: Holiday = 'december'): void {
    const along = fromAngle(angle);
    const across = fromAngle(angle + Math.PI / 2);
    const hx = size.x / 2 - 1.6;
    const hy = size.y / 2 - 1.6;
    const corners = [v(-hx, -hy), v(hx, -hy), v(hx, hy), v(-hx, hy)];
    const coloured = unitHash(index, 34) < 0.35;
    const halloween = holiday === 'halloween';
    const colours: ColorToken[] = halloween ? ['skinSunset', 'skinHolo'] : coloured ? ['lightRed', 'juiceGreen', 'coin', 'lightBlue'] : ['headlight'];
    let n = 0;
    corners.forEach((from, i) => {
      const to = corners[(i + 1) % 4];
      const edge = sub(to, from);
      const steps = Math.max(1, Math.round(Math.hypot(edge.x, edge.y) / Holidays.bulbSpacing));
      for (let s = 0; s < steps; s++, n++) {
        const local = add(from, mul(edge, s / steps));
        const at = add(center, add(mul(along, local.x), mul(across, local.y)));
        const twinkle = time === null ? 0.85 : 0.55 + 0.45 * Math.sin(time * 2.1 + n * 1.7 + index);
        const color = colours[n % colours.length];
        if (glow) list.w(circle(at, 2.4), color, 0.14 * twinkle * fade);
        list.w(circle(at, 0.8), color, twinkle * fade);
      }
    });
  },

  /**
   * A jack-o'-lantern on the doorstep of every other house, on the side that faces the road: a ribbed orange body,
   * a green stem, and a candle inside that flickers (the glow on the ground, out of step with its neighbours).
   */
  addPumpkins(list: RenderList, center: Vec2, size: Vec2, angle: number, index: number, fade: number, time: number | null): void {
    if (unitHash(index, 35) >= 0.5) return;
    const along = fromAngle(angle);
    const across = fromAngle(angle + Math.PI / 2);
    const out = normalize(mul(center, -1));
    const reach = Math.abs(dot(out, along)) * (size.x / 2) + Math.abs(dot(out, across)) * (size.y / 2);
    const step = unitHash(index, 36) - 0.5;
    const at = add(add(center, mul(out, reach + 2.6)), mul(v(-out.y, out.x), step * 9));
    const flicker = time === null ? 0.8 : 0.7 + 0.3 * Math.sin(time * 9 + index * 2.1) * Math.sin(time * 5.3 + index);
    list.w(circle(at, 9), 'skinSunset', 0.12 * flicker * fade);
    list.w(circle(add(at, v(0.7, -0.7)), 3.9), 'shadow', 0.6 * fade);
    list.w(circle(at, 3.6), 'skinSunset', fade);
    for (const rib of [-1, 1]) {
      const side = add(at, mul(across, rib * 1.5));
      list.w(line(sub(side, mul(along, 2.2)), add(side, mul(along, 2.2)), 0.5), 'skinPlum', 0.55 * fade);
    }
    list.w(circle(at, 0.9), 'juiceGreen', 0.9 * fade);
    list.w(circle(at, 1.5), 'hazard', 0.55 * flicker * fade);
  },

  /**
   * Fireworks at the edge of the city: every so often a rocket climbs, bursts into a ring of sparks
   * that spread, sink and sparkle out. Placed where the screen has room: just off the ring, beside the
   * arm above it and your own street below it on a phone (beside the ring on a wide screen). Never with
   * Reduce Motion: it flashes.
   */
  addFireworks(list: RenderList, world: World, time: number, sparks: number): void {
    const vp = list.camera.viewport;
    const reach = world.layout.ringRadius;
    const colours: ColorToken[] = ['coin', 'lightRed', 'skinMint', 'lightBlue', 'skinHolo', 'primary', 'skinSunset'];
    const now = Math.floor(time / Holidays.rocketEvery);
    for (let n = now - 3; n <= now; n++) {
      const t = time - n * Holidays.rocketEvery - unitHash(n, 91) * 0.5;
      if (t < 0 || t > Holidays.rise + Holidays.burst) continue;
      const side = unitHash(n, 93) < 0.5 ? -1 : 1;
      const facing = (vp.y > vp.x ? Math.PI / 2 : 0) + (unitHash(n, 92) < 0.5 ? 0 : Math.PI) + side * (0.4 + 0.35 * unitHash(n, 98));
      const at = mul(fromAngle(facing), reach + 55 + 60 * unitHash(n, 94));
      const color = colours[Math.floor(unitHash(n, 95) * colours.length)];
      if (t < Holidays.rise) {
        const x = Ease.outCubic(t / Holidays.rise);
        const head = add(at, v(0, -70 * (1 - x)));
        list.w(line(add(head, v(0, -9)), head, 1.2), 'headlight', 0.5);
        list.w(circle(head, 1.2), 'headlight', 0.9);
        continue;
      }
      const age = t - Holidays.rise;
      const life = age / Holidays.burst;
      // The flash: a soft glow, brightest in the middle, gone in a blink.
      if (age < 0.2) for (const r of [28, 19, 11, 5]) list.w(circle(at, r), color, 0.06 * (1 - age / 0.2));
      const spread = (24 + 20 * unitHash(n, 96)) * Ease.outCubic(Math.min(1, age / 0.9));
      const sink = v(0, -7 * age * age);
      const fade = 1 - Ease.smoothstep(life);
      const turn = unitHash(n, 97) * TAU;
      for (let i = 0; i < sparks; i++) {
        // No two sparks fly quite alike: a little off the even spacing, a little shorter or longer.
        const dir = fromAngle(turn + ((i + (unitHash(n * 31 + i, 99) - 0.5) * 0.6) / sparks) * TAU);
        const reach = spread * (0.8 + 0.35 * unitHash(n * 31 + i, 100));
        const tip = add(add(at, mul(dir, reach)), sink);
        const tail = add(add(at, mul(dir, reach * 0.7)), mul(sink, 0.7));
        const sparkle = life > 0.5 ? 0.5 + 0.5 * Math.sin(age * 38 + i * 2.3) : 1;
        list.w(line(tail, tip, 1.1), color, 0.6 * fade * sparkle);
        list.w(circle(tip, 1.3), color, fade * sparkle);
      }
    }
  },
};
