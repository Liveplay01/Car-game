import { type Vec2, v } from '../core/vec2';
import type { Pose } from '../core/paths';
import { type RenderList, rect, circle, line } from './render';
import type { ColorToken } from './theme';
import type { Part, Shape } from './carArt';

/**
 * Skins with a body of their own (Leo, 10.10.2026). Only plain cars wear one. Every model is
 * drawn inside the footprint of the car it replaces and hugs the hitbox (a capsule), so what
 * you see is what crashes: no ghost collisions. Drawn for the base car (24 × 13) and scaled to
 * whatever the config says.
 */
export const CAR_MODELS = ['beetle', 'pocket', 'coupe', 'roadster', 'jeep', 'hotrod'] as const;
export type CarModel = (typeof CAR_MODELS)[number];

const BASE_L = 24;
const BASE_W = 13;

interface Fit {
  x(n: number): number;
  y(n: number): number;
  r(n: number): number;
  body: ColorToken;
}

const fit = (L: number, W: number, body: ColorToken): Fit => {
  const k = Math.min(L / BASE_L, W / BASE_W);
  return { x: (n) => (n * L) / BASE_L, y: (n) => (n * W) / BASE_W, r: (n) => n * k, body };
};

export const partShape = (cx: number, cy: number, sx: number, sy: number, radius: number, color: ColorToken, breaksAt: number, reach: number, visible = true): Shape => ({
  center: v(cx, cy),
  size: v(sx, sy),
  radius,
  color,
  breaksAt,
  reach,
  visible,
});

// MARK: Outline

/** A corner of the outline: x, y and how far the rounding cuts into the two edges. */
type Corner = readonly [x: number, y: number, cut: number];

/** The left half from the middle of the nose to the middle of the tail; the right half mirrors it. */
const HALVES: Record<CarModel, readonly Corner[]> = {
  // An egg with fenders: the widest point over each wheel, a waist between them.
  beetle: [[12, 0, 0], [11.8, 3.2, 2.6], [9.2, 5.6, 3.4], [5.8, 6.4, 2.8], [2.2, 5.7, 2.5], [-1.5, 5.6, 2.5], [-4.6, 6.3, 2.8], [-8.6, 6.0, 3.4], [-11.8, 3.4, 2.8], [-12, 0, 0]],
  // A cushion: straight sides, every corner generously round.
  pocket: [[12, 0, 0], [11.9, 3.4, 3.4], [9.4, 6.1, 3.0], [6.5, 6.5, 2.2], [-6.5, 6.5, 2.2], [-9.4, 6.1, 3.0], [-11.9, 3.4, 3.4], [-12, 0, 0]],
  // A wedge: a sharp nose, the haunches over the rear wheels.
  coupe: [[12, 0, 0], [11.8, 2.0, 1.2], [10.2, 4.2, 2.6], [7.0, 5.6, 3.0], [2.5, 5.9, 2.0], [-2.5, 6.3, 2.0], [-6.8, 6.4, 3.0], [-10.2, 5.8, 3.0], [-11.9, 3.8, 2.6], [-12, 0, 0]],
  roadster: [[12, 0, 0], [11.9, 3.4, 3.2], [9.6, 5.6, 3.2], [6, 6.1, 2.2], [0, 6.2, 2], [-6, 6.4, 2.2], [-9.8, 5.8, 3.0], [-11.9, 3.6, 3.0], [-12, 0, 0]],
  // A box: a flat nose and tail, squarer corners than any other model.
  jeep: [[12, 0, 0], [11.9, 3.2, 1.6], [10.6, 5.9, 2.4], [8.4, 6.5, 1.6], [4, 6.5, 0], [-4, 6.5, 0], [-8.4, 6.5, 1.6], [-10.6, 5.9, 2.4], [-11.9, 3.2, 1.6], [-12, 0, 0]],
  // A narrow cowl up front, fat fenders at the back.
  hotrod: [[12, 0, 0], [12, 3.4, 1.6], [9.6, 5.0, 2.6], [5.5, 5.2, 1.6], [2, 5.6, 2], [-1, 6.0, 2.4], [-5.5, 6.4, 3], [-9.8, 5.8, 3.2], [-11.9, 3.8, 3.0], [-12, 0, 0]],
};

const CURVE_STEPS = 4;

/** The corners cut and joined by a curve each: a closed ring of points, nose first. */
function ring(half: readonly Corner[]): Vec2[] {
  const mirrored = half.slice(1, -1).map(([x, y, cut]): Corner => [x, -y, cut]).reverse();
  const corners = [...half, ...mirrored];
  const n = corners.length;
  const points: Vec2[] = [];
  corners.forEach(([x, y, cut], i) => {
    const p = v(x, y);
    if (cut <= 0) {
      points.push(p);
      return;
    }
    const [px, py] = corners[(i + n - 1) % n];
    const [nx, ny] = corners[(i + 1) % n];
    const toPrev = Math.hypot(px - x, py - y);
    const toNext = Math.hypot(nx - x, ny - y);
    const t = Math.min(cut, toPrev / 2, toNext / 2);
    const a = v(x + ((px - x) * t) / toPrev, y + ((py - y) * t) / toPrev);
    const b = v(x + ((nx - x) * t) / toNext, y + ((ny - y) * t) / toNext);
    for (let k = 0; k <= CURVE_STEPS; k++) {
      const s = k / CURVE_STEPS;
      points.push(v((1 - s) * (1 - s) * a.x + 2 * s * (1 - s) * p.x + s * s * b.x, (1 - s) * (1 - s) * a.y + 2 * s * (1 - s) * p.y + s * s * b.y));
    }
  });
  return points;
}

const outlines = new Map<string, readonly Vec2[]>();

// MARK: Parts

type Parts = Partial<Record<Part, Shape>>;

/** A part in the base car's units: centre, size, corner radius. */
const part = (f: Fit, cx: number, cy: number, sx: number, sy: number, r: number, color: ColorToken, breaksAt: number, reach: number, visible = true): Shape =>
  partShape(f.x(cx), f.y(cy), f.x(sx), f.y(sy), f.r(r), color, breaksAt, reach, visible);

const GLASS: ColorToken = 'vehicleGlass';
const TRIM: ColorToken = 'vehicleTrim';
const CHROME: ColorToken = 'vehicleChrome';
const TIRE: ColorToken = 'vehicleTire';

/** What each model builds differently; every other part is the plain car's. */
const PARTS: Record<CarModel, (f: Fit) => Parts> = {
  beetle: (f) => ({
    frontBumper: part(f, 11.1, 0, 1.2, 4.6, 0.6, CHROME, 2, 6),
    rearBumper: part(f, -11.1, 0, 1.2, 4.6, 0.6, CHROME, 2, 6),
    hood: part(f, 7.8, 0, 6.5, 5.4, 1.5, f.body, 3.5, 8, false),
    windscreen: part(f, 3.0, 0, 3.4, 8.2, 1.7, GLASS, 2.5, 9),
    rearWindow: part(f, -4.8, 0, 2.2, 6.2, 1.1, GLASS, 2.5, 7),
    leftMirror: part(f, 1.4, 6.9, 2, 1.6, 0.6, f.body, 0.8, 5, false),
    rightMirror: part(f, 1.4, -6.9, 2, 1.6, 0.6, f.body, 0.8, 5, false),
  }),
  pocket: (f) => ({
    frontBumper: part(f, 10.9, 0, 1.2, 6.0, 0.6, TRIM, 2, 6),
    rearBumper: part(f, -10.9, 0, 1.2, 6.0, 0.6, TRIM, 2, 6),
    hood: part(f, 8.6, 0, 5, 9, 1.5, f.body, 3.5, 8, false),
    windscreen: part(f, 4.0, 0, 4.6, 10.4, 2.2, GLASS, 2.5, 9),
    rearWindow: part(f, -6.6, 0, 3.0, 9.0, 1.5, GLASS, 2.5, 7),
  }),
  coupe: (f) => ({
    frontBumper: part(f, 10.9, 0, 1.2, 3.4, 0.6, TRIM, 2, 6),
    rearBumper: part(f, -10.9, 0, 1.2, 7.0, 0.6, TRIM, 2, 6),
    hood: part(f, 6.6, 0, 7.2, 6.4, 1.5, f.body, 3.5, 8, false),
    windscreen: part(f, -1.2, 0, 4.4, 8.0, 2.4, GLASS, 2.5, 9),
    rearWindow: part(f, -5.6, 0, 2.6, 7.0, 1.3, GLASS, 2.5, 7),
  }),
  roadster: (f) => ({
    frontBumper: part(f, 10.9, 0, 1.2, 6.0, 0.6, CHROME, 2, 6),
    rearBumper: part(f, -10.9, 0, 1.2, 6.0, 0.6, CHROME, 2, 6),
    hood: part(f, 7.6, 0, 6.8, 7.0, 1.5, f.body, 3.5, 8, false),
    windscreen: part(f, 3.6, 0, 1.4, 8.8, 0.7, GLASS, 2.5, 9),
    leftMirror: part(f, 3.8, 7.0, 2, 1.6, 0.6, f.body, 0.8, 5),
    rightMirror: part(f, 3.8, -7.0, 2, 1.6, 0.6, f.body, 0.8, 5),
  }),
  jeep: (f) => ({
    frontBumper: part(f, 10.9, 0, 1.4, 6.0, 0.7, TRIM, 2, 6),
    rearBumper: part(f, -10.9, 0, 1.4, 6.0, 0.7, TRIM, 2, 6),
    hood: part(f, 8.0, 0, 6, 9, 1, f.body, 3.5, 8, false),
    windscreen: part(f, 4.4, 0, 1.8, 10.4, 0.9, GLASS, 2.5, 9),
    rearWindow: part(f, -4.0, 0, 1.4, 9.0, 0.7, GLASS, 2.5, 7),
    leftMirror: part(f, 5.0, 7.0, 1.6, 1.8, 0.5, f.body, 0.8, 5),
    rightMirror: part(f, 5.0, -7.0, 1.6, 1.8, 0.5, f.body, 0.8, 5),
  }),
  hotrod: (f) => ({
    frontBumper: part(f, 10.9, 0, 1.2, 5.0, 0.6, CHROME, 2, 6),
    rearBumper: part(f, -10.9, 0, 1.2, 7.0, 0.6, CHROME, 2, 6),
    hood: part(f, 6.0, 0, 8.0, 6.8, 1.5, f.body, 3.5, 8, false),
    windscreen: part(f, -0.4, 0, 1.6, 7.6, 0.8, GLASS, 2.5, 9),
    rearWindow: part(f, -4.2, 0, 1.2, 5.6, 0.6, GLASS, 2.5, 7),
    leftMirror: part(f, 1.4, 6.9, 2, 1.6, 0.6, f.body, 0.8, 5, false),
    rightMirror: part(f, 1.4, -6.9, 2, 1.6, 0.6, f.body, 0.8, 5, false),
    // The front wheels stand out beside the cowl.
    frontLeftWheel: part(f, 7.8, 5.4, 4.6, 2.2, 1, TIRE, 4, 5),
    frontRightWheel: part(f, 7.8, -5.4, 4.6, 2.2, 1, TIRE, 4, 5),
  }),
};

// MARK: Lamps

/** A lamp on the left side (+y); the right one mirrors it. */
export interface Lamp {
  x: number;
  y: number;
  w: number;
  h: number;
  round: boolean;
}

export interface Lamps {
  head: Lamp;
  tail: Lamp;
}

const lamp = (x: number, y: number, w: number, h: number, round = false): Lamp => ({ x, y, w, h, round });

const LAMPS: Record<CarModel, Lamps> = {
  beetle: { head: lamp(8.7, 3.9, 2.4, 2.4, true), tail: lamp(-9.6, 3.6, 2.0, 2.0, true) },
  pocket: { head: lamp(9.2, 3.9, 2.8, 2.8, true), tail: lamp(-9.6, 3.9, 2.0, 2.0, true) },
  coupe: { head: lamp(8.6, 3.3, 1.0, 2.4), tail: lamp(-10.3, 3.4, 1.0, 2.4) },
  roadster: { head: lamp(9.3, 3.6, 2.2, 2.2, true), tail: lamp(-10.2, 3.7, 2.0, 2.0, true) },
  jeep: { head: lamp(9.4, 4.3, 2.4, 2.4, true), tail: lamp(-10.0, 4.0, 2.0, 2.0, true) },
  hotrod: { head: lamp(10.6, 2.9, 2.2, 2.2, true), tail: lamp(-9.8, 3.8, 2.0, 2.0, true) },
};

const lampSets = new Map<string, Lamps>();

// MARK: Decor

const SIDES = [-1, 1] as const;

export const CarModels = {
  /** The body's outline, nose first, in the car's own units. */
  outline(model: CarModel, L: number, W: number): readonly Vec2[] {
    const key = `${model}:${L}:${W}`;
    let points = outlines.get(key);
    if (!points) outlines.set(key, (points = ring(HALVES[model]).map((p) => v((p.x * L) / BASE_L, (p.y * W) / BASE_W))));
    return points;
  },

  /** The model's own part, or null where the plain car's will do. */
  shape(model: CarModel, p: Part, L: number, W: number, body: ColorToken): Shape | null {
    return PARTS[model](fit(L, W, body))[p] ?? null;
  },

  /** A convertible has no roof to paint. */
  hasRoof: (model: CarModel | null): boolean => model !== 'roadster',

  /** The lamps in the car's own units; the plain car's where there is no model. */
  lamps(model: CarModel | null, L: number, W: number): Lamps {
    const key = `${model}:${L}:${W}`;
    let set = lampSets.get(key);
    if (!set) {
      const f = fit(L, W, 'vehicleCar');
      const scaled = (l: Lamp): Lamp => ({ x: f.x(l.x), y: f.y(l.y), w: f.x(l.w), h: f.y(l.h), round: l.round });
      set = model
        ? { head: scaled(LAMPS[model].head), tail: scaled(LAMPS[model].tail) }
        : { head: lamp(L / 2 - 0.8, W * 0.3, 1.3, W * 0.22), tail: lamp(-L / 2 + 0.8, W * 0.3, 1.3, W * 0.22) };
      lampSets.set(key, set);
    }
    return set;
  },

  /** One lamp, on the side `side` (1 left, -1 right). */
  lamp(list: RenderList, pose: Pose, l: Lamp, side: number, color: ColorToken, opacity: number): void {
    const c = at(pose, l.x, side * l.y);
    list.w(l.round ? circle(c, l.h / 2) : rect(c, v(l.w, l.h), 0.5, pose.heading), color, opacity);
  },

  /** What makes the model itself: lamp housings, seams, engine, seats, spare wheel. Under the glass, on the intact body. */
  decor(list: RenderList, model: CarModel, pose: Pose, L: number, W: number, body: ColorToken, o: number): void {
    const f = fit(L, W, body);
    const P = (x: number, y: number): Vec2 => at(pose, f.x(x), f.y(y));
    const box = (x: number, y: number, sx: number, sy: number, r: number, color: ColorToken, a = 1): void => {
      list.w(rect(P(x, y), v(f.x(sx), f.y(sy)), f.r(r), pose.heading), color, o * a);
    };
    const bar = (x1: number, y1: number, x2: number, y2: number, t: number, color: ColorToken, a = 1): void => {
      list.w(line(P(x1, y1), P(x2, y2), f.r(t)), color, o * a);
    };
    const dot = (x: number, y: number, r: number, color: ColorToken, a = 1): void => {
      list.w(circle(P(x, y), f.r(r)), color, o * a);
    };

    // The lamps are there before they light.
    const l = CarModels.lamps(model, L, W);
    for (const side of SIDES) {
      CarModels.lamp(list, pose, l.head, side, model === 'coupe' ? GLASS : CHROME, o);
      CarModels.lamp(list, pose, l.tail, side, 'lightRed', o * 0.55);
    }

    switch (model) {
      case 'beetle':
        bar(11, 0, 6.4, 0, 0.5, TIRE, 0.22);
        for (const s of SIDES) bar(3.6, s * 5.0, -3.6, s * 5.0, 0.8, TIRE, 0.3);
        for (const x of [-8.2, -9.2, -10.2]) bar(x, -3, x, 3, 0.5, TIRE, 0.28);
        break;
      case 'pocket':
        bar(11.6, -2.8, 11.6, 2.8, 0.6, TIRE, 0.4);
        box(-11.2, 0, 0.8, 3.2, 0.3, 'primary', 0.6);
        break;
      case 'coupe':
        box(-10.4, 0, 1.8, 10.4, 0.6, TIRE, 0.85);
        for (const s of SIDES) {
          box(6.0, s * 1.6, 4.2, 0.9, 0.4, TIRE, 0.6);
          box(-3.2, s * 5.6, 2.6, 0.9, 0.4, TIRE, 0.6);
        }
        break;
      case 'roadster':
        box(-1.2, 0, 8.4, 9.4, 2.4, TIRE);
        for (const s of SIDES) {
          box(-1.8, s * 2.5, 3.4, 3.2, 1.2, TRIM, 0.9);
          dot(-3.4, s * 2.5, 0.9, TRIM);
        }
        bar(-4.6, -4.6, -4.6, 4.6, 0.9, CHROME);
        break;
      case 'jeep':
        box(7.6, 0, 6.2, 4.6, 1.2, 'primary', 0.08);
        for (const s of SIDES) {
          box(7.6, s * 5.9, 4.2, 1.2, 0.5, TIRE, 0.35);
          box(-7.6, s * 5.9, 4.2, 1.2, 0.5, TIRE, 0.35);
          bar(-2.6, s * 3.4, 2.8, s * 3.4, 0.6, TIRE, 0.55);
        }
        for (const x of [-2.6, 0, 2.8]) bar(x, -4, x, 4, 0.6, TIRE, 0.55);
        dot(-9.4, 0, 2.4, TIRE);
        dot(-9.4, 0, 1.2, TRIM);
        break;
      case 'hotrod':
        box(6.4, 0, 6.2, 4.8, 1, TIRE);
        box(6.8, 0, 3.6, 3.0, 0.8, CHROME);
        box(6.8, 0, 1.8, 1.6, 0.4, TIRE);
        for (const s of SIDES) bar(0.2, s * 5.9, -7.0, s * 5.9, 0.9, CHROME);
        break;
    }
  },
};

/** A local point of the car in world space (x forward, y left). */
function at(pose: Pose, x: number, y: number): Vec2 {
  const c = Math.cos(pose.heading);
  const s = Math.sin(pose.heading);
  return v(pose.position.x + x * c - y * s, pose.position.y + x * s + y * c);
}
