import { type Vec2, v, add, mul, TAU } from '../core/vec2';
import { type RenderList, type Rect, R, rect, circle, arc, line, polygon, Ease, unitHash } from './render';
import type { ColorToken } from './theme';
import { MenuKit } from './menukit';

/** The streak's engine: how hot it runs, by days in a row (0: engine off … 5: inferno). */
export const flameTier = (days: number): number => (days >= 30 ? 5 : days >= 14 ? 4 : days >= 7 ? 3 : days >= 3 ? 2 : days >= 1 ? 1 : 0);

const LENGTH = [0, 26, 44, 62, 82, 104];
const WIDTH = [0, 7, 10, 13, 16, 20];
/** Seconds between two backfire pops (0: none). */
const POP_EVERY = [0, 4, 3, 2.2, 1.5, 1];
const SPARKS = [0, 3, 6, 10, 16, 24];
const GLOW = [0, 0.18, 0.3, 0.42, 0.55, 0.7];
const POP_TIME = 0.38;
const unit = (index: number, salt: number): number => unitHash(index, salt + 307);

/**
 * The streak as a car's tailpipe (Leo, 06.10.2026): the longer the streak, the bigger and livelier
 * the flame out of the exhaust, and from a week on it backfires: a bang, a flash, a burst of
 * sparks, the car jolts. Everything is a pure function of the page's clock; with Reduce Motion
 * the flame stands still. The car stays neutral grey: vehicle colours are game information.
 */
export const StreakFlame = {
  add(list: RenderList, r: Rect, days: number, clock: number, reduceMotion: boolean, o: number): void {
    const tier = flameTier(days);
    const t = reduceMotion ? 0 : clock;
    // The scene is drawn for 168 points; the rest of the card is the text under the road.
    const s = (R.height(r) - 28) / 168;
    const groundY = r.minY + 124 * s;
    const pop = !reduceMotion && POP_EVERY[tier] > 0 ? (t % POP_EVERY[tier]) / POP_TIME : 2;
    const popping = pop < 1;
    const jolt = popping ? mul(v(Math.sin(t * 110), Math.cos(t * 90) * 0.5), 2.2 * (1 - pop) * (0.5 + 0.1 * tier) * s) : v(0, 0);
    const carRight = r.minX + R.width(r) * 0.66;
    const carLeft = carRight - 120 * s;
    const tip = add(v(carLeft - 14 * s, groundY - 12 * s), jolt);
    const saved = list.clip;
    list.clip = r;

    // The road and a little heat on it.
    list.s(line(v(r.minX + 10, groundY + 1), v(carRight + 20 * s, groundY + 1), 1.5), 'separator', o);
    if (tier > 0) list.s(rect(v(tip.x - LENGTH[tier] * s * 0.5, groundY + 1), v(LENGTH[tier] * s * 1.3, 5), 2.5), 'fireOuter', 0.16 * Math.min(1, tier / 3) * o);

    StreakFlame.car(list, carLeft, groundY, s, jolt, tier, o);

    if (tier === 0) StreakFlame.smoke(list, tip, t, s, 0.16 * o);
    else {
      const boost = popping ? 1 + 0.55 * (1 - pop) ** 2 : 1;
      const len = LENGTH[tier] * s * boost;
      const wid = WIDTH[tier] * s;
      const flicker = 0.9 + 0.1 * Math.sin(t * 31) * Math.cos(t * 17);
      MenuKit.glow(list, add(tip, v(-len * 0.4, 0)), 36 * s + len * 0.7, 'fireOuter', GLOW[tier] * o * (0.85 + 0.15 * Math.sin(t * 9)));
      StreakFlame.plume(list, tip, len * flicker, wid, t, 0, 'fireDeep', 0.95 * o);
      if (tier >= 4) StreakFlame.plume(list, tip, len * 0.9 * flicker, wid * 0.9, t + 0.4, 2, 'juiceBlue', 0.5 * o);
      StreakFlame.plume(list, tip, len * 0.78 * flicker, wid * 0.7, t + 0.2, 1, 'fireOuter', o);
      StreakFlame.plume(list, tip, len * 0.5 * flicker, wid * 0.42, t + 0.6, 3, 'fireCore', o);
      if (tier >= 3) {
        // Shock diamonds: bright beads in the exhaust, drifting out a little.
        for (let i = 0; i < 4; i++) {
          const at = add(tip, v(-len * (0.2 + 0.17 * i) * flicker, 0));
          list.s(rect(at, v(wid * (0.9 - 0.17 * i), wid * (0.55 - 0.1 * i)), 4), 'spark', (0.8 - 0.15 * i) * o);
        }
      }
      StreakFlame.sparks(list, tip, t, s, tier, o);
      if (tier >= 5 && !reduceMotion) StreakFlame.embers(list, r, tip, t, s, o);
    }
    if (popping) StreakFlame.bang(list, tip, pop, s, tier, o);
    list.clip = saved;
  },

  /** The car's rear seen from the side, in neutral greys, the exhaust pipe at its tail. */
  car(list: RenderList, left: number, ground: number, s: number, jolt: Vec2, tier: number, o: number): void {
    const x = left + jolt.x;
    const y = ground + jolt.y;
    list.s(rect(v(x + 60 * s, y - 22 * s), v(120 * s, 26 * s), 9 * s), 'controlFill', o);
    list.s(polygon([v(x + 30 * s, y - 34 * s), v(x + 48 * s, y - 56 * s), v(x + 88 * s, y - 56 * s), v(x + 106 * s, y - 34 * s)]), 'controlFill', o);
    list.s(polygon([v(x + 38 * s, y - 36 * s), v(x + 51 * s, y - 52 * s), v(x + 84 * s, y - 52 * s), v(x + 97 * s, y - 36 * s)]), 'background', 0.55 * o);
    for (const wx of [26, 96]) {
      list.s(circle(v(x + wx * s, y - 8 * s), 12 * s), 'background', o);
      list.s(circle(v(x + wx * s, y - 8 * s), 5 * s), 'muted', o);
    }
    // The tail light warms with the engine.
    list.s(rect(v(x + 4 * s, y - 26 * s), v(6 * s, 9 * s), 2), tier > 0 ? 'fireDeep' : 'muted', (tier > 0 ? 1 : 0.5) * o);
    // The tailpipe: a grey tube, its mouth ringed.
    list.s(rect(v(x - 6 * s, y - 12 * s), v(16 * s, 8 * s), 3 * s), 'muted', o);
    list.s(rect(v(x - 14 * s, y - 12 * s), v(4 * s, 11 * s), 2 * s), 'primary', 0.7 * o);
  },

  /** One tongue of flame from the pipe: a tapering plume that licks from side to side. */
  plume(list: RenderList, tip: Vec2, len: number, wid: number, t: number, seed: number, color: ColorToken, o: number): void {
    const n = 14;
    const top: Vec2[] = [];
    const bottom: Vec2[] = [];
    for (let i = 0; i <= n; i++) {
      const p = i / n;
      const half = wid * (1 - p) ** 0.85 * (1 + 0.4 * Math.sin(Math.PI * Math.min(1, p * 2.4)));
      const sway = (Math.sin(t * 14 - p * 7 + seed) * 0.35 + Math.sin(t * 23 + p * 3 + seed * 2) * 0.15) * wid * p * 1.4;
      const x = tip.x - len * p;
      const y = tip.y + sway + len * 0.08 * p * p;
      top.push(v(x, y - half));
      bottom.push(v(x, y + half));
    }
    list.s(polygon([...top, ...bottom.reverse()]), color, o);
  },

  /** Sparks shot out of the pipe, falling as they go. */
  sparks(list: RenderList, tip: Vec2, t: number, s: number, tier: number, o: number): void {
    for (let i = 0; i < SPARKS[tier]; i++) {
      const u = (t * (0.9 + 0.4 * unit(i, 1)) + unit(i, 2)) % 1;
      const reach = (30 + 80 * unit(i, 3)) * (0.6 + 0.12 * tier) * s;
      const p = v(tip.x - reach * u, tip.y + (unit(i, 4) - 0.5) * 22 * s * u + 46 * s * u * u);
      list.s(rect(p, v((3 + 2 * unit(i, 5)) * s, 2 * s), 1, u * 5 + i), 'spark', (1 - u) * o);
    }
  },

  /** Cold engine: a thin wisp of smoke from the pipe. */
  smoke(list: RenderList, tip: Vec2, t: number, s: number, o: number): void {
    for (let i = 0; i < 4; i++) {
      const u = (t * 0.3 + i / 4) % 1;
      list.s(circle(v(tip.x - 8 * s * u + Math.sin(t + i) * 3 * s * u, tip.y - 6 * s - 34 * s * u), (3 + 8 * u) * s), 'smoke', o * (1 - u));
    }
  },

  /** Inferno: embers drift up over the whole scene. */
  embers(list: RenderList, r: Rect, tip: Vec2, t: number, s: number, o: number): void {
    for (let i = 0; i < 10; i++) {
      const u = (t * (0.25 + 0.2 * unit(i, 11)) + unit(i, 12)) % 1;
      const p = v(tip.x - 100 * s * unit(i, 13) + Math.sin(t * 2 + i) * 6 * s, r.maxY - 40 * s - (R.height(r) - 70 * s) * u);
      list.s(circle(p, (1 + 1.5 * unit(i, 14)) * s), 'fireCore', 0.8 * (1 - u) * o);
    }
  },

  /** The backfire: a white-hot flash at the pipe, a shock ring and a burst of shards. */
  bang(list: RenderList, tip: Vec2, x: number, s: number, tier: number, o: number): void {
    const e = Ease.outCubic(x);
    const power = 0.55 + 0.09 * tier;
    const at = add(tip, v(-8 * s, 0));
    list.s(circle(at, (8 + 36 * e) * s * power), 'fireCore', (1 - x) * 0.9 * o);
    list.s(circle(at, (5 + 18 * e) * s * power), 'spark', (1 - x) * o);
    list.s(arc(at, (12 + 52 * e) * s * power, 3 * (1 - x) + 1, 0, TAU), 'fireOuter', 0.7 * (1 - x) * o);
    for (let i = 0; i < 10; i++) {
      const p = v(at.x - (24 + 100 * unit(i, 21)) * e * s, at.y + ((unit(i, 22) - 0.5) * 70 * e + 40 * e * e) * s);
      list.s(rect(p, v((4 + 4 * unit(i, 23)) * s, 2 * s), 1, (unit(i, 24) - 0.5) * 8 * e), i % 2 ? 'spark' : 'fireOuter', (1 - x) * o);
    }
  },
};
