import { currentLanguage } from './i18n';

/** Text measuring for layout: the renderers measure exactly. */
export const FONT = '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, "Helvetica Neue", sans-serif';

/** Titles and big numbers (Leo, 04.10.2026): Overpass, heavy italic like the website's headings; the system's rounded face until it has loaded. */
export const FONT_DISPLAY = '"Overpass Variable", ui-rounded, "SF Pro Rounded", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, sans-serif';

/**
 * Fonts made so far, by size (bold as a negative size). Every text of every frame asks for
 * one, so the same string comes back instead of a new one each time; and the drawer, which
 * sets a font only when it changes, then compares the very same string.
 */
const fonts = new Map<number, string>();

/** Japanese, Korean and Chinese have no italics: a slanted heavy face would only be a synthesised skew. */
const CJK = ['ja', 'ko', 'zh'].includes(currentLanguage());

/** Keys of display runs sit this far below the others. */
const DISPLAY_KEY = 1e7;

/** The CSS font for a run: bold text from 20 points up is display text, and `display` makes it so at any size (a number that shrinks to fit keeps its face). */
export function fontFor(size: number, bold: boolean, display = false): string {
  const key = display ? -size - DISPLAY_KEY : bold ? -size - 1 : size;
  let font = fonts.get(key);
  if (font === undefined) {
    font = bold && (display || size >= 20) ? `${CJK ? '' : 'italic '}900 ${size}px ${FONT_DISPLAY}` : `${bold ? 700 : 500} ${size}px ${FONT}`;
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

/** A font arrived (the heading face, `ui/shell.css`): widths measured with its stand-in are wrong, so they are measured again. */
export function forgetMeasures(): void {
  widthCache.clear();
  widths = 0;
}

/** Exact width of a run of text at `size` points (the renderers measure exactly). */
export function measure(textRun: string, size: number, bold: boolean, display = false): number {
  const tenths = Math.round(size * 10);
  const key = display ? -tenths - DISPLAY_KEY : bold ? -tenths - 1 : tenths;
  let row = widthCache.get(key);
  let w = row?.get(textRun);
  if (w === undefined) {
    measureCanvas ??= document.createElement('canvas').getContext('2d')!;
    measureCanvas.font = fontFor(size, bold, display);
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

