import { type Vec2, v, add, TAU } from '../core/vec2';
import { type RenderList, type Primitive, type Align, type Weight, circle, arc, line, polygon, rect, text, drawText, softPolygon, Ease } from './render';
import type { ColorToken } from './theme';
import { measure } from './measure';

/**
 * Small glyphs drawn from the same shapes as everything else: no fonts, no
 * image files. A banknote marks every amount of money, so money is never read as points.
 */
export const MONEY_MARK = '';

/** A text cut at its notes, in order; null stands for a note. */
export function textPieces(s: string): (string | null)[] {
  const out: (string | null)[] = [];
  let run = '';
  for (const ch of s) {
    if (ch === MONEY_MARK) {
      if (run) out.push(run);
      run = '';
      out.push(null);
    } else run += ch;
  }
  if (run) out.push(run);
  return out;
}

/** The coin inside a text: its diameter plus a little air. */
export const inlineMoneyWidth = (size: number): number => size * 0.72 + size * 0.3;
/** Diameter of the coin next to a number of this size. */
export const coinSize = (size: number): number => size * 0.78;

/** How wide a piece of text is, notes included (bold unless told otherwise). */
export function textWidth(s: string, size: number, bold = true, display = false): number {
  return textPieces(s).reduce((w, piece) => w + (piece === null ? inlineMoneyWidth(size) : measure(piece, size, bold, display)), 0);
}

/**
 * `s` for a space `width` wide: at `size` if it fits, else shrunk to at most 80 % of it (never
 * under 9 points), else cut with an ellipsis. Pills, rows and cards use it so no label runs out
 * of its box on a narrow screen.
 */
export function fitText(s: string, size: number, width: number, bold = true): { text: string; size: number } {
  const natural = textWidth(s, size, bold);
  if (natural <= width) return { text: s, size };
  const fitted = Math.max(9, size * 0.8, Math.min(size, (size * width) / natural));
  if (textWidth(s, fitted, bold) <= width) return { text: s, size: fitted };
  let cut = s;
  while (cut.length > 1 && textWidth(`${cut}…`, fitted, bold) > width) cut = cut.slice(0, -1);
  return { text: `${cut.trimEnd()}…`, size: fitted };
}

/** `drawText` that keeps the text inside `width` (see `fitText`). */
export function drawFitted(list: RenderList, s: string, at: Vec2, size: number, width: number, color: ColorToken, o: { weight?: Weight; align?: Align; opacity?: number } = {}): void {
  const fit = fitText(s, size, width, o.weight === 'bold');
  drawText(list, fit.text, at, fit.size, color, o);
}

/** How wide a `moneyTag` is. */
export const moneyTagWidth = (label: string, size: number, display = false): number => coinSize(size) + size * 0.34 + textWidth(label, size, true, display);

export interface Shape {
  p: Primitive;
  color: ColorToken;
  alpha: number;
}

/** The coin's shapes: a gold disc with a sunk ring, like the earlier web UI. A dimmed
 * amount (muted, destructive) tints the coin instead. */
export function moneyShapes(center: Vec2, height: number, color: ColorToken): Shape[] {
  const r = height / 2;
  const tint: ColorToken = color === 'accent' || color === 'primary' || color === 'coin' ? 'coin' : color;
  return [
    { p: circle(center, r), color: tint, alpha: 1 },
    { p: arc(center, r * 0.62, Math.max(1, r * 0.16), 0, Math.PI * 2), color: tint === 'coin' ? 'coinInk' : 'background', alpha: 0.55 },
  ];
}

export function money(list: RenderList, center: Vec2, height: number, color: ColorToken = 'accent', opacity = 1): void {
  for (const s of moneyShapes(center, height, color)) list.s(s.p, s.color, opacity * s.alpha);
}

/** A note and a number as one unit; `position` is the anchor the whole unit aligns to. */
export function moneyTag(
  list: RenderList,
  label: string,
  position: Vec2,
  size: number,
  align: Align,
  color: ColorToken,
  noteColor: ColorToken = 'accent',
  opacity = 1,
  weight: Weight = 'bold',
): void {
  const noteHeight = coinSize(size);
  const noteWidth = noteHeight;
  const gap = size * 0.34;
  const total = noteWidth + gap + textWidth(label, size, true, weight === 'display');
  const left = align === 'leading' ? position.x : align === 'center' ? position.x - total / 2 : position.x - total;
  money(list, v(left + noteWidth / 2, position.y), noteHeight, noteColor, opacity);
  list.s(text(label, v(left + noteWidth + gap, position.y), size, 'leading', weight), color, opacity);
}

/** A five-point star standing upright, `radius` to its tips. */
export function starPoints(center: Vec2, radius: number): Vec2[] {
  return Array.from({ length: 10 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? radius : radius * 0.45;
    return v(center.x + Math.cos(angle) * r, center.y + Math.sin(angle) * r);
  });
}

/** A trophy: a cup with two handles on a stem and a foot, about as wide as it is tall. */
export function trophy(list: RenderList, center: Vec2, height: number, color: ColorToken, opacity = 1): void {
  const u = height / 12.4;
  const at = (x: number, y: number): Vec2 => v(center.x + x * u, center.y + y * u);
  list.s(polygon([at(-4.6, -6.2), at(4.6, -6.2), at(4.2, -2), at(2.3, 0.9), at(-2.3, 0.9), at(-4.2, -2)]), color, opacity);
  for (const side of [-1, 1]) {
    const handle = [at(side * 4.6, -5), at(side * 7, -5), at(side * 7, -2.4), at(side * 4.1, -1.6)];
    for (let i = 0; i < handle.length - 1; i++) list.s(line(handle[i], handle[i + 1], 1.5 * u), color, opacity);
  }
  list.s(rect(at(0, 2.6), v(2 * u, 3 * u)), color, opacity);
  list.s(rect(at(0, 5.3), v(7 * u, 2 * u), u), color, opacity);
}

/** A flame, Mayhem's unit: an outer tongue of fire and a hot core. */
export function flame(list: RenderList, center: Vec2, height: number, opacity = 1): void {
  const tongue = (scale: number): Vec2[] => {
    const h = height * scale;
    const w = h * 0.62;
    const base = add(center, v(0, h * 0.42));
    return [
      add(base, v(0, -h)),
      add(base, v(w * 0.3, -h * 0.62)),
      add(base, v(w * 0.5, -h * 0.3)),
      add(base, v(w * 0.42, -h * 0.08)),
      base,
      add(base, v(-w * 0.42, -h * 0.08)),
      add(base, v(-w * 0.5, -h * 0.3)),
      add(base, v(-w * 0.18, -h * 0.55)),
      add(base, v(-w * 0.12, -h * 0.78)),
    ];
  };
  list.s(polygon(tongue(1)), 'fireOuter', opacity);
  list.s(polygon(tongue(0.58)), 'fireCore', opacity);
}

export function flameTag(list: RenderList, label: string, position: Vec2, size: number, align: Align, color: ColorToken, opacity = 1, weight: Weight = 'bold'): void {
  const flameHeight = size * 1.05;
  const gap = size * 0.3;
  const total = flameHeight * 0.62 + gap + textWidth(label, size, true, weight === 'display');
  const left = align === 'leading' ? position.x : align === 'center' ? position.x - total / 2 : position.x - total;
  flame(list, v(left + flameHeight * 0.31, position.y), flameHeight, opacity);
  list.s(text(label, v(left + flameHeight * 0.62 + gap, position.y), size, 'leading', weight), color, opacity);
}

/** A box point on the screen: the pictures of upgrades and conditions are drawn in their own units round an origin. */
export type At = (x: number, y: number) => Vec2;

/**
 * The parts of a picture move like the real thing (Leo, 22.10.2026, the style of `ui/animatedIcons.ts`): `pose` turns,
 * scales and shifts `at` round a pivot in box units, so a part is drawn by the same code at rest and in motion.
 */
export function pose(at: At, px: number, py: number, o: { turn?: number; sx?: number; sy?: number; dx?: number; dy?: number }): At {
  const { turn = 0, sx = 1, sy = 1, dx = 0, dy = 0 } = o;
  const [c, s] = [Math.cos(turn), Math.sin(turn)];
  return (x, y) => {
    const lx = (x - px) * sx;
    const ly = (y - py) * sy;
    return at(px + dx + lx * c - ly * s, py + dy + lx * s + ly * c);
  };
}

/**
 * Motion on a picture's clock `t`: seconds since it began to play. Before that and long after, every value is the one at
 * rest, so `t = Infinity` draws the still picture (Reduce Motion, the Museum's shelves, the website's pictures).
 */
export const Motion = {
  /** 0 → 1 from `start` over `dur`. */
  ramp: (t: number, start: number, dur: number, ease: (x: number) => number = Ease.outCubic): number => ease((t - start) / dur),
  /** 0 → 1 → 0 from `start` over `dur`: something that is only there while it moves. */
  bump(t: number, start: number, dur: number): number {
    const x = (t - start) / dur;
    return x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x);
  },
  /** A damped swing from `start`, struck once like a bell. */
  swing(t: number, start: number, amp: number, freq = 2.2, decay = 4.5): number {
    const x = t - start;
    return x <= 0 || x > 2.5 ? 0 : amp * Math.sin(TAU * freq * x) * Math.exp(-decay * x);
  },
  /** Squash and stretch from `start`: 1 at rest, `amp` sets how far it gives. */
  squash: (t: number, start: number, amp = 0.16): number => 1 + Motion.swing(t, start, amp, 1.8, 5),
  /** 0 → 1, `cycles` times over `dur` from `start`, back at 0 when it ends (drops that fall, then rest where they hang). */
  cycle(t: number, start: number, dur: number, cycles: number, phase = 0): number {
    const x = Ease.clamp01((t - start) / dur);
    if (x >= 1) return 0;
    const p = x * cycles + phase;
    return p - Math.floor(p);
  },
  /** Blinks `on` / off `times` times from `start` (lights, a spark of a fuse). */
  blink: (t: number, start: number, times: number, rate = 6): boolean => t >= start && t < start + times / rate && Math.floor((t - start) * rate * 2) % 2 === 0,
};

/**
 * Draws the parts of a picture in box units through an `At`, so a posed part (`pose`) turns, squashes and shifts whole:
 * boxes and discs are polygons, strokes end round. `u` is one box unit in points.
 */
export function pen(list: RenderList, u: number, opacity = 1) {
  const put = (p: Primitive, color: ColorToken, share = 1): void => list.s(p, color, share * opacity);
  const ellipse = (a: At, x: number, y: number, rx: number, ry: number): Vec2[] => Array.from({ length: 28 }, (_, i) => a(x + Math.cos((i * TAU) / 28) * rx, y + Math.sin((i * TAU) / 28) * ry));
  const roundBox = (a: At, x: number, y: number, w: number, h: number, r: number): Vec2[] => {
    const k = Math.max(0, Math.min(r, w / 2, h / 2));
    const out: Vec2[] = [];
    for (const [cx, cy, from] of [[w / 2 - k, h / 2 - k, 0], [-w / 2 + k, h / 2 - k, 1], [-w / 2 + k, -h / 2 + k, 2], [w / 2 - k, -h / 2 + k, 3]]) {
      for (let s = 0; s <= 4; s++) {
        const angle = ((from + s / 4) * Math.PI) / 2;
        out.push(a(x + cx + Math.cos(angle) * k, y + cy + Math.sin(angle) * k));
      }
    }
    return out;
  };
  const pairs = (a: At, xy: number[]): Vec2[] => Array.from({ length: xy.length / 2 }, (_, i) => a(xy[2 * i], xy[2 * i + 1]));
  return {
    u,
    put,
    /** A polygon through `xy` (x0, y0, x1, y1 …); `soft` rounds its corners. */
    shape: (a: At, xy: number[], color: ColorToken, share = 1, soft = 0): void => put(soft > 0 ? softPolygon(pairs(a, xy), soft * u) : polygon(pairs(a, xy)), color, share),
    box: (a: At, x: number, y: number, w: number, h: number, r: number, color: ColorToken, share = 1): void => put(polygon(roundBox(a, x, y, w, h, r)), color, share),
    disc: (a: At, x: number, y: number, r: number, color: ColorToken, share = 1): void => put(polygon(ellipse(a, x, y, r, r)), color, share),
    line: (a: At, x0: number, y0: number, x1: number, y1: number, w: number, color: ColorToken, share = 1): void => put(line(a(x0, y0), a(x1, y1), w * u, true), color, share),
    /** A ring or, between `start` and `end` (screen angles), an arc with round ends. */
    ring: (a: At, x: number, y: number, r: number, w: number, color: ColorToken, share = 1, start = 0, end = TAU): void => put(arc(a(x, y), r * u, w * u, start, end, end - start < TAU), color, share),
    star(a: At, x: number, y: number, outer: number, inner: number, color: ColorToken, share = 1, soft = 0, turn = 0): void {
      const xy = Array.from({ length: 10 }, (_, i) => {
        const angle = turn - Math.PI / 2 + (i * TAU) / 10;
        const r = i % 2 === 0 ? outer : inner;
        return [x + Math.cos(angle) * r, y + Math.sin(angle) * r];
      }).flat();
      put(soft > 0 ? softPolygon(pairs(a, xy), soft * u) : polygon(pairs(a, xy)), color, share);
    },
  };
}
export type Pen = ReturnType<typeof pen>;
