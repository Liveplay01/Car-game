/** Text measuring for layout: the renderers measure exactly. */
export const FONT = '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, "Helvetica Neue", sans-serif';

/** Titles and big numbers: rounded and heavy where the system has it, like the earlier web UI. */
export const FONT_DISPLAY = 'ui-rounded, "SF Pro Rounded", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, sans-serif';

/** The CSS font for a run: bold text from 20 points up is display text. */
export function fontFor(size: number, bold: boolean): string {
  if (bold && size >= 20) return `800 ${size}px ${FONT_DISPLAY}`;
  return `${bold ? 700 : 500} ${size}px ${FONT}`;
}

/** Made on first use, so the rules and texts also load where there is no DOM (tests). */
let measureCanvas: CanvasRenderingContext2D | null = null;
const widthCache = new Map<string, number>();

/** Exact width of a run of text at `size` points (the renderers measure exactly). */
export function measure(textRun: string, size: number, bold: boolean): number {
  const key = `${bold ? 'b' : 'r'}${size.toFixed(1)}|${textRun}`;
  let w = widthCache.get(key);
  if (w === undefined) {
    measureCanvas ??= document.createElement('canvas').getContext('2d')!;
    measureCanvas.font = fontFor(size, bold);
    w = measureCanvas.measureText(textRun).width;
    if (widthCache.size > 4000) widthCache.clear();
    widthCache.set(key, w);
  }
  return w;
}

