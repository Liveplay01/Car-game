import { type Vec2, v, add } from '../core/vec2';
import { type RenderList, type Primitive, type Align, type Weight, circle, arc, polygon, text, drawText } from './render';
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
export function textWidth(s: string, size: number, bold = true): number {
  return textPieces(s).reduce((w, piece) => w + (piece === null ? inlineMoneyWidth(size) : measure(piece, size, bold)), 0);
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
export const moneyTagWidth = (label: string, size: number): number => coinSize(size) + size * 0.34 + textWidth(label, size);

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
): void {
  const noteHeight = coinSize(size);
  const noteWidth = noteHeight;
  const gap = size * 0.34;
  const total = noteWidth + gap + textWidth(label, size);
  const left = align === 'leading' ? position.x : align === 'center' ? position.x - total / 2 : position.x - total;
  money(list, v(left + noteWidth / 2, position.y), noteHeight, noteColor, opacity);
  list.s(text(label, v(left + noteWidth + gap, position.y), size, 'leading', 'bold'), color, opacity);
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

export function flameTag(list: RenderList, label: string, position: Vec2, size: number, align: Align, color: ColorToken, opacity = 1): void {
  const flameHeight = size * 1.05;
  const gap = size * 0.3;
  const total = flameHeight * 0.62 + gap + textWidth(label, size);
  const left = align === 'leading' ? position.x : align === 'center' ? position.x - total / 2 : position.x - total;
  flame(list, v(left + flameHeight * 0.31, position.y), flameHeight, opacity);
  list.s(text(label, v(left + flameHeight * 0.62 + gap, position.y), size, 'leading', 'bold'), color, opacity);
}
