import { type Vec2, v, add, sub, mul, clamp01 } from '../core/vec2';
import type { ColorToken } from './theme';

/** Coordinate space of a render item: world units (y up) or screen points (y down). */
export type Space = 'world' | 'screen';
export type Align = 'leading' | 'center' | 'trailing';
export type Weight = 'regular' | 'bold';

/** Simple building blocks every platform can draw with little code (FOUNDATION.md 4.1). */
export type Primitive =
  | { k: 'rect'; center: Vec2; size: Vec2; radius: number; rotation: number }
  | { k: 'circle'; center: Vec2; radius: number }
  | { k: 'arc'; center: Vec2; radius: number; thickness: number; start: number; end: number }
  | { k: 'line'; from: Vec2; to: Vec2; thickness: number }
  | { k: 'polygon'; points: Vec2[] }
  /** Many thin lines in one colour, drawn as one path: `points` in pairs, from and to (rain). */
  | { k: 'segments'; points: Vec2[]; thickness: number }
  /** Many small discs in one colour, filled as one path (snow). */
  | { k: 'dots'; points: Vec2[]; radii: number[] }
  | { k: 'text'; text: string; position: Vec2; size: number; align: Align; weight: Weight };

/** A fine texture laid over a group of world items, anchored to the world (`draw.ts`). */
export type Grain = 'asphalt';

export interface RenderItem {
  p: Primitive;
  color: ColorToken;
  opacity: number;
  space: Space;
  /** The item's area gets this texture over it, once its whole group is drawn. */
  grain?: Grain;
  /** Marks items a transition treats apart (the Build tab's chrome). */
  tag?: string;
  /** Screen rectangle the item is cut to (a scrolling list). */
  clip?: Rect;
  /** A rect that frosts what lies under it: the blur radius in points (`CanvasDrawer.glassBlur` allowing). */
  glass?: number;
}

/** A still stretch of the list (`RenderList.bake`): null key, its shapes are compared instead. */
export interface Bake {
  end: number;
  name: string;
  key: string | null;
}

export const rect = (center: Vec2, size: Vec2, radius = 0, rotation = 0): Primitive => ({ k: 'rect', center, size, radius, rotation });
export const circle = (center: Vec2, radius: number): Primitive => ({ k: 'circle', center, radius });
export const arc = (center: Vec2, radius: number, thickness: number, start: number, end: number): Primitive => ({
  k: 'arc',
  center,
  radius,
  thickness,
  start,
  end,
});
export const line = (from: Vec2, to: Vec2, thickness: number): Primitive => ({ k: 'line', from, to, thickness });
export const polygon = (points: Vec2[]): Primitive => ({ k: 'polygon', points });
export const segments = (points: Vec2[], thickness: number): Primitive => ({ k: 'segments', points, thickness });
export const dots = (points: Vec2[], radii: number[]): Primitive => ({ k: 'dots', points, radii });
export const text = (s: string, position: Vec2, size: number, align: Align = 'center', weight: Weight = 'regular'): Primitive => ({
  k: 'text',
  text: s,
  position,
  size,
  align,
  weight,
});

export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export const R = {
  make: (minX: number, minY: number, maxX: number, maxY: number): Rect => ({ minX, minY, maxX, maxY }),
  width: (r: Rect): number => r.maxX - r.minX,
  height: (r: Rect): number => r.maxY - r.minY,
  center: (r: Rect): Vec2 => v((r.minX + r.maxX) / 2, (r.minY + r.maxY) / 2),
  contains: (r: Rect, p: Vec2): boolean => p.x >= r.minX && p.x <= r.maxX && p.y >= r.minY && p.y <= r.maxY,
  inset: (r: Rect, dx: number, dy = dx): Rect => ({ minX: r.minX + dx, minY: r.minY + dy, maxX: r.maxX - dx, maxY: r.maxY - dy }),
  offset: (r: Rect, d: Vec2): Rect => ({ minX: r.minX + d.x, minY: r.minY + d.y, maxX: r.maxX + d.x, maxY: r.maxY + d.y }),
};

/** Maps world units onto the screen (points, y down). The world is the same size everywhere. */
export interface Camera {
  viewport: Vec2;
  /** World point shown at `focus`. */
  center: Vec2;
  /** Screen point where `center` appears. */
  focus: Vec2;
  /** Points per world unit. */
  scale: number;
}

export const toScreen = (c: Camera, p: Vec2): Vec2 => v(c.focus.x + (p.x - c.center.x) * c.scale, c.focus.y - (p.y - c.center.y) * c.scale);

export interface Insets {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

/** Largest zoom at which `bounds` fits inside the viewport minus `insets`. */
export function fitCamera(bounds: Rect, viewport: Vec2, insets: Insets, verticalBias = 0.5): Camera {
  const avail = v(Math.max(1, viewport.x - insets.left - insets.right), Math.max(1, viewport.y - insets.top - insets.bottom));
  const scale = Math.min(avail.x / R.width(bounds), avail.y / R.height(bounds));
  const contentHeight = R.height(bounds) * scale;
  const spare = avail.y - contentHeight;
  const focus = v(insets.left + avail.x / 2, insets.top + spare * verticalBias + contentHeight / 2);
  return { viewport, center: R.center(bounds), focus, scale };
}

/** Everything one frame shows, in drawing order. */
export class RenderList {
  items: RenderItem[] = [];
  /** Set while drawing a group that a transition must recognise. */
  tag: string | undefined = undefined;
  /** Set while drawing a group that is cut to a screen rectangle. */
  clip: Rect | undefined = undefined;
  /** Set while drawing the material of a floating panel: its blur radius. */
  glass: number | undefined = undefined;
  /** Set while drawing a group that gets a texture over it (the roads). */
  grain: Grain | undefined = undefined;
  /** The ground between everything gets a faint texture, anchored to the world. */
  groundGrain = false;
  /**
   * Big Screen: the ground is see-through, so the player's own picture or video behind the
   * canvas shows (`ui/backdrop.ts`), dimmed by the background colour at this opacity so the
   * road and the cars stay readable. Null: an ordinary, solid ground.
   */
  backdrop: number | null = null;
  /**
   * The leading items that stay the same while the map and the camera do (the ground and its
   * still details): the drawer bakes them, with the background and the ground texture, into
   * one picture and reuses it frame after frame (`CanvasDrawer`). `staticKey` names what they
   * show; it must change whenever they would.
   */
  staticKey: string | null = null;
  staticEnd = 0;
  /**
   * Still stretches further up the list (the road), by the index they start at: baked as a
   * see-through picture and put back in their place, between what lies under and over them.
   */
  bakes = new Map<number, Bake>();
  /**
   * The camera shake already in `camera.focus` (screen points). The still pictures are baked
   * without it and only moved by it, so a crash does not repaint them every frame.
   */
  shake: Vec2 = v(0, 0);
  /** Dark edges over the scene, 0…1 of the drawer's strongest (`CameraFx`), laid in before item `vignetteAt`: under the HUD. */
  vignette = 0;
  vignetteAt = 0;
  constructor(
    public camera: Camera,
    public background: ColorToken,
  ) {}

  add(p: Primitive, color: ColorToken, opacity: number, space: Space): void {
    if (opacity <= 0.001) return;
    const item: RenderItem = { p, color, opacity, space };
    if (this.tag !== undefined) item.tag = this.tag;
    if (this.clip !== undefined) item.clip = this.clip;
    if (this.glass !== undefined && space === 'screen') item.glass = this.glass;
    if (this.grain !== undefined && space === 'world') item.grain = this.grain;
    this.items.push(item);
  }

  /** World shorthand. */
  w(p: Primitive, color: ColorToken, opacity = 1): void {
    this.add(p, color, opacity, 'world');
  }

  /** Screen shorthand. */
  s(p: Primitive, color: ColorToken, opacity = 1): void {
    this.add(p, color, opacity, 'screen');
  }

  /**
   * Everything added so far is still ground, showing `key`: plain world shapes only (no clip,
   * no texture of their own), or nothing is baked. Called once, where the moving part begins.
   */
  markStatic(key: string): void {
    if (this.staticKey !== null) return;
    if (this.items.some((x) => x.space !== 'world' || x.clip !== undefined || x.grain !== undefined)) return;
    this.staticKey = key;
    this.staticEnd = this.items.length;
  }

  /**
   * The items from `start` on are still (the road): `name` keeps their picture apart from other
   * bakes. `key` must change whenever they would; without one, the drawer compares the shapes
   * themselves with the last frame's. Plain world shapes only; a stretch with a clip or a screen
   * item is simply drawn.
   */
  bake(start: number, name: string, key?: string): void {
    const end = this.items.length;
    if (end === start) return;
    for (let i = start; i < end; i++) {
      const x = this.items[i];
      if (x.space !== 'world' || x.clip !== undefined) return;
    }
    this.bakes.set(start, { end, name, key: key ?? null });
  }
}

/** Text at `at` in the page's usual look: leading, regular, fully opaque unless `o` says otherwise. */
export function drawText(list: RenderList, s: string, at: Vec2, size: number, color: ColorToken, o: { weight?: Weight; align?: Align; opacity?: number } = {}): void {
  list.s(text(s, at, size, o.align ?? 'leading', o.weight ?? 'regular'), color, o.opacity ?? 1);
}

/** A screen item shifted by `offset` and faded by `factor` (world items keep their place). */
export function moved(item: RenderItem, offset: Vec2, factor: number): RenderItem {
  const out: RenderItem = { ...item, opacity: item.opacity * factor };
  if (item.space !== 'screen' || (offset.x === 0 && offset.y === 0)) return out;
  const p = item.p;
  switch (p.k) {
    case 'rect':
      out.p = { ...p, center: add(p.center, offset) };
      break;
    case 'circle':
      out.p = { ...p, center: add(p.center, offset) };
      break;
    case 'arc':
      out.p = { ...p, center: add(p.center, offset) };
      break;
    case 'line':
      out.p = { ...p, from: add(p.from, offset), to: add(p.to, offset) };
      break;
    case 'polygon':
    case 'segments':
    case 'dots':
      out.p = { ...p, points: p.points.map((q) => add(q, offset)) };
      break;
    case 'text':
      out.p = { ...p, position: add(p.position, offset) };
      break;
  }
  return out;
}

/** A screen item scaled by `k` around `focus` (a lean in); sizes grow with it, texts too. */
export function zoomed(item: RenderItem, focus: Vec2, k: number): RenderItem {
  if (item.space !== 'screen' || k === 1) return item;
  const at = (q: Vec2): Vec2 => add(focus, mul(sub(q, focus), k));
  const p = item.p;
  const out: RenderItem = { ...item };
  switch (p.k) {
    case 'rect':
      out.p = { ...p, center: at(p.center), size: mul(p.size, k), radius: p.radius * k };
      break;
    case 'circle':
      out.p = { ...p, center: at(p.center), radius: p.radius * k };
      break;
    case 'arc':
      out.p = { ...p, center: at(p.center), radius: p.radius * k, thickness: p.thickness * k };
      break;
    case 'line':
      out.p = { ...p, from: at(p.from), to: at(p.to), thickness: p.thickness * k };
      break;
    case 'polygon':
      out.p = { ...p, points: p.points.map(at) };
      break;
    case 'segments':
      out.p = { ...p, points: p.points.map(at), thickness: p.thickness * k };
      break;
    case 'dots':
      out.p = { ...p, points: p.points.map(at), radii: p.radii.map((r) => r * k) };
      break;
    case 'text':
      out.p = { ...p, position: at(p.position), size: p.size * k };
      break;
  }
  return out;
}

/** A world item as a screen item through `cam`: for small pictures drawn with the scene's own art. */
export function pinned(item: RenderItem, cam: Camera, factor = 1): RenderItem {
  const out: RenderItem = { ...item, opacity: item.opacity * factor, space: 'screen' };
  if (item.space === 'screen') return out;
  const pt = (q: Vec2): Vec2 => toScreen(cam, q);
  const l = (x: number): number => x * cam.scale;
  const p = item.p;
  switch (p.k) {
    case 'rect':
      out.p = { ...p, center: pt(p.center), size: v(l(p.size.x), l(p.size.y)), radius: l(p.radius), rotation: -p.rotation };
      break;
    case 'circle':
      out.p = { ...p, center: pt(p.center), radius: l(p.radius) };
      break;
    case 'arc':
      out.p = { ...p, center: pt(p.center), radius: l(p.radius), thickness: l(p.thickness), start: -p.end, end: -p.start };
      break;
    case 'line':
      out.p = { ...p, from: pt(p.from), to: pt(p.to), thickness: l(p.thickness) };
      break;
    case 'polygon':
      out.p = { ...p, points: p.points.map(pt) };
      break;
    case 'segments':
      out.p = { ...p, points: p.points.map(pt), thickness: l(p.thickness) };
      break;
    case 'dots':
      out.p = { ...p, points: p.points.map(pt), radii: p.radii.map(l) };
      break;
    case 'text':
      out.p = { ...p, position: pt(p.position), size: l(p.size) };
      break;
  }
  return out;
}

/** Easing curves (FOUNDATION.md 3, motion rules). */
export const Ease = {
  clamp01,
  outCubic(x: number): number {
    const u = 1 - Ease.clamp01(x);
    return 1 - u * u * u;
  },
  inCubic(x: number): number {
    const t = Ease.clamp01(x);
    return t * t * t;
  },
  smoothstep(x: number): number {
    const t = Ease.clamp01(x);
    return t * t * (3 - 2 * t);
  },
  inOutSine: (x: number): number => (1 - Math.cos(Math.PI * Ease.clamp01(x))) / 2,
  /** Shoots about 10 % past 1, swings back once and settles. For positions and sizes. */
  spring(x: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return 1 - Math.exp(-6 * x) * Math.cos(x * 10);
  },
  /** A critically damped spring (Apple's default): glides into place, no overshoot. */
  settle(x: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const k = 8.5;
    return 1 - (1 + k * x) * Math.exp(-k * x);
  },
};

/** 0…1, the same for the same inputs every time (`WeatherLayer.unitHash`). */
export function unitHash(index: number, salt: number): number {
  let x = Math.imul(index | 0, 0x9e3779b9) ^ Math.imul(salt | 0, 0xbf58476d);
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}


/** Screen measures in points. */
export const Metrics = {
  sceneInsets: { top: 72, left: 0, bottom: 16, right: 0 } as Insets,
  hudMargin: 20,
  strikeRow: 28,
  timerSize: 24,
  strikeRadius: 4,
  strikeSpacing: 16,
  multiplierSize: 44,
  comboLabelSize: 13,
  popupSize: 20,
  noticeSize: 13,
  sceneVerticalBias: 0.6,
  vehicleCornerRadius: 4.5,
};
