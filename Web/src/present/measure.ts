/** Text measuring for layout: the renderers measure exactly. */
export const FONT = '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, "Helvetica Neue", sans-serif';

/** Titles and big numbers: rounded and heavy where the system has it, like the earlier web UI. */
export const FONT_DISPLAY = 'ui-rounded, "SF Pro Rounded", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, sans-serif';

/**
 * Fonts made so far, by size (bold as a negative size). Every text of every frame asks for
 * one, so the same string comes back instead of a new one each time; and the drawer, which
 * sets a font only when it changes, then compares the very same string.
 */
const fonts = new Map<number, string>();

/** The CSS font for a run: bold text from 20 points up is display text. */
export function fontFor(size: number, bold: boolean): string {
  const key = bold ? -size - 1 : size;
  let font = fonts.get(key);
  if (font === undefined) {
    font = bold && size >= 20 ? `800 ${size}px ${FONT_DISPLAY}` : `${bold ? 700 : 500} ${size}px ${FONT}`;
    // A text that grows or shrinks asks for a new size every frame: keep the map small.
    if (fonts.size > 2000) fonts.clear();
    fonts.set(key, font);
  }
  return font;
}

/** Made on first use, so the rules and texts also load where there is no DOM (tests). */
let measureCanvas: CanvasRenderingContext2D | null = null;
/** Widths by size in tenths of a point (bold as negative), then by text: no key is built per call. */
const widthCache = new Map<number, Map<string, number>>();
let widths = 0;

/** Exact width of a run of text at `size` points (the renderers measure exactly). */
export function measure(textRun: string, size: number, bold: boolean): number {
  const tenths = Math.round(size * 10);
  const key = bold ? -tenths - 1 : tenths;
  let row = widthCache.get(key);
  let w = row?.get(textRun);
  if (w === undefined) {
    measureCanvas ??= document.createElement('canvas').getContext('2d')!;
    measureCanvas.font = fontFor(size, bold);
    w = measureCanvas.measureText(textRun).width;
    if (widths > 4000) {
      widthCache.clear();
      widths = 0;
      row = undefined;
    }
    if (!row) {
      row = new Map();
      widthCache.set(key, row);
    }
    row.set(textRun, w);
    widths++;
  }
  return w;
}

