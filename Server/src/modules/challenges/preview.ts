import { Raster, type Rgb } from './raster.ts';

/**
 * The picture a challenge's short link shows in a chat (1200 × 630, the size link previews
 * use): a roundabout at night, a car about to merge into a gap, and a motorway message sign
 * that says what to beat. The sign is a 5 × 7 dot font, so no font file is needed.
 * Colours are the game's (`Web/src/present/theme.ts`, `Web/icon/make_icon.py`).
 */

export const PREVIEW_WIDTH = 1200;
export const PREVIEW_HEIGHT = 630;

export interface PreviewText {
  mode: 'shift' | 'unlimited' | 'mayhem';
  level: number;
  target: number;
  /** The sender's leaderboard name, if they have one. */
  name: string | null;
}

const BACKGROUND_TOP: Rgb = [24, 29, 37];
const BACKGROUND_BOTTOM: Rgb = [9, 11, 14];
const ASPHALT: Rgb = [43, 49, 58];
const KERB: Rgb = [27, 32, 40];
const ISLAND: Rgb = [18, 21, 25];
const MARKING: Rgb = [69, 76, 86];
const ACCENT: Rgb = [158, 230, 207];
const GLASS: Rgb = [43, 49, 57];
const CARS: Rgb[] = [[227, 230, 234], [191, 198, 207], [201, 188, 168], [214, 204, 190], [178, 186, 197]];
const HEADLIGHT: Rgb = [255, 236, 196];
const TAIL_LIGHT: Rgb = [235, 64, 52];
const BLACK: Rgb = [0, 0, 0];
const BOARD: Rgb = [12, 14, 18];
const BOARD_EDGE: Rgb = [38, 44, 53];
const AMBER: Rgb = [255, 178, 54];
const PALE: Rgb = [214, 220, 228];
const DIM: Rgb = [130, 140, 152];

// MARK: Dot font

/** 5 × 7 dots per letter, top row first. Anything else is drawn as a space. */
const GLYPHS: Record<string, string> = {
  A: '01110 10001 10001 11111 10001 10001 10001',
  B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110',
  D: '11100 10010 10001 10001 10001 10010 11100',
  E: '11111 10000 10000 11110 10000 10000 11111',
  F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111',
  H: '10001 10001 10001 11111 10001 10001 10001',
  I: '01110 00100 00100 00100 00100 00100 01110',
  J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001',
  L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001',
  N: '10001 10001 11001 10101 10011 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110',
  P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101',
  R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110',
  T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110',
  V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 10101 01010',
  X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 10001 01010 00100 00100 00100',
  Z: '11111 00001 00010 00100 01000 10000 11111',
  '0': '01110 10001 10011 10101 11001 10001 01110',
  '1': '00100 01100 00100 00100 00100 00100 01110',
  '2': '01110 10001 00001 00010 00100 01000 11111',
  '3': '11111 00010 00100 00010 00001 10001 01110',
  '4': '00010 00110 01010 10010 11111 00010 00010',
  '5': '11111 10000 11110 00001 00001 10001 01110',
  '6': '00110 01000 10000 11110 10001 10001 01110',
  '7': '11111 00001 00010 00100 01000 01000 01000',
  '8': '01110 10001 10001 01110 10001 10001 01110',
  '9': '01110 10001 10001 01111 00001 00010 01100',
  ',': '00000 00000 00000 00000 01100 00100 01000',
  '.': '00000 00000 00000 00000 00000 01100 01100',
  '!': '00100 00100 00100 00100 00100 00000 00100',
  '-': '00000 00000 00000 11111 00000 00000 00000',
  _: '00000 00000 00000 00000 00000 00000 11111',
  '·': '00000 00000 00000 00100 00000 00000 00000',
  ' ': '00000 00000 00000 00000 00000 00000 00000',
};

const ROWS = 7;
const COLUMNS = 6; // 5 dots and a gap

/** Whether the dot at column `col` (0–4), row `row` (0–6) of `ch` is lit. */
const lit = (ch: string, col: number, row: number): boolean => (GLYPHS[ch] ?? GLYPHS[' ']!)[row * 6 + col] === '1';

/** The text as the sign can show it: upper case, unknown characters as spaces. */
export const signText = (text: string): string => [...text.toUpperCase()].map((ch) => (ch in GLYPHS ? ch : ' ')).join('');

/** A line of dots from (x, top), `pitch` apart. The dark dots of the board show between the lit ones, like a real LED sign. */
function dotLine(r: Raster, text: string, x: number, top: number, pitch: number, color: Rgb, glow: boolean): void {
  const chars = [...signText(text)];
  const dot = pitch * 0.34;
  for (let i = 0; i < chars.length; i++) {
    // The gap column too (not after the last letter): the board is one even grid of dots.
    const columns = i === chars.length - 1 ? COLUMNS - 1 : COLUMNS;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < columns; col++) {
        const cx = x + (i * COLUMNS + col + 0.5) * pitch;
        const cy = top + (row + 0.5) * pitch;
        if (col === COLUMNS - 1 || !lit(chars[i]!, col, row)) {
          r.disc(cx, cy, dot, BOARD_EDGE, 0.45);
          continue;
        }
        if (glow) r.glow(cx, cy, pitch * 1.1, color, 0.2);
        r.disc(cx, cy, dot, color);
      }
    }
  }
}

/** How wide a line is, without the gap after its last letter. */
const lineWidth = (text: string, pitch: number): number => ([...text].length * COLUMNS - 1) * pitch;

/** The largest pitch up to `max` at which the text fits in `width`. */
const fit = (text: string, width: number, max: number): number => Math.min(max, width / Math.max(1, [...text].length * COLUMNS - 1));

// MARK: Scene

/** A car from above, pointing along `angle`, with its lights on. */
function car(r: Raster, cx: number, cy: number, angle: number, color: Rgb): void {
  const length = 46;
  const width = 23;
  const ax = Math.cos(angle);
  const ay = Math.sin(angle);
  const at = (along: number, across: number): [number, number] => [cx + ax * along - ay * across, cy + ay * along + ax * across];
  // The light on the road ahead first, under the car.
  const [lx, ly] = at(length * 0.95, 0);
  r.glow(lx, ly, 34, HEADLIGHT, 0.16);
  r.box(cx + 4, cy + 7, length, width, 7, angle, BLACK, 0.45, 9);
  r.box(cx, cy, length, width, 6.5, angle, color);
  const [wx, wy] = at(length * 0.13, 0);
  r.box(wx, wy, length * 0.22, width * 0.74, 2.5, angle, GLASS);
  const [bx, by] = at(-length * 0.3, 0);
  r.box(bx, by, length * 0.13, width * 0.66, 2, angle, GLASS);
  for (const side of [-1, 1]) {
    const [hx, hy] = at(length / 2 - 1.5, side * width * 0.3);
    r.disc(hx, hy, 2.4, HEADLIGHT);
    const [tx, ty] = at(-length / 2 + 1.2, side * width * 0.3);
    r.glow(tx, ty, 9, TAIL_LIGHT, 0.35);
    r.disc(tx, ty, 2, TAIL_LIGHT);
  }
}

function roundabout(r: Raster): void {
  const cx = 905;
  const cy = 318;
  const lane = 205;
  const half = 42;
  // The arms first: the ring lies over where they meet it.
  const arms: [number, number, number][] = [
    [cx, cy + lane + 140, Math.PI / 2],
    [cx, cy - lane - 140, Math.PI / 2],
    [cx + lane + 160, cy, 0],
    [cx - lane - 60, cy, 0],
  ];
  for (const [x, y, angle] of arms) {
    r.box(x, y, 300, half * 2 + 8, 0, angle, KERB);
    r.box(x, y, 300, half * 2, 0, angle, ASPHALT);
  }
  r.annulus(cx, cy, lane - half - 4, lane + half + 4, KERB);
  r.annulus(cx, cy, lane - half, lane + half, ASPHALT);
  r.disc(cx, cy, lane - half - 4, ISLAND);
  r.annulus(cx, cy, lane - half - 22, lane - half - 18, ACCENT, 0.22);
  // A dashed line down the middle of the ring.
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * Math.PI * 2;
    r.box(cx + Math.cos(a) * lane, cy + Math.sin(a) * lane, 14, 3, 1.5, a + Math.PI / 2, MARKING, 0.8);
  }
  // Traffic turns anticlockwise on screen; the gap is right above the bottom arm (90°).
  const ring = [28, 150, 205, 262, 318];
  ring.forEach((deg, i) => {
    const a = (deg * Math.PI) / 180;
    car(r, cx + Math.cos(a) * lane, cy + Math.sin(a) * lane, a - Math.PI / 2, CARS[i % CARS.length]!);
  });
  // The player's car, in the game's accent, about to tap in.
  r.glow(cx, cy + lane + 58, 70, ACCENT, 0.12);
  car(r, cx, cy + lane + 64, -Math.PI / 2, ACCENT);
}

function sign(r: Raster, text: PreviewText): void {
  const x = 52;
  const y = 92;
  const w = 600;
  const h = 446;
  r.box(x + w / 2 + 6, y + h / 2 + 12, w, h, 22, 0, BLACK, 0.5, 26);
  r.box(x + w / 2, y + h / 2, w + 6, h + 6, 24, 0, BOARD_EDGE);
  r.box(x + w / 2, y + h / 2, w, h, 21, 0, BOARD);

  const inner = w - 72;
  const left = x + 36;
  const score = text.target.toLocaleString('en-US');
  const unit = text.mode === 'mayhem' ? 'flames' : 'points';
  const where = text.mode === 'shift' ? `level ${text.level}` : text.mode;
  const lines: { text: string; pitch: number; color: Rgb; glow: boolean; gap: number }[] = [
    { text: 'Roundabout Timing', pitch: fit('Roundabout Timing', inner, 4.6), color: ACCENT, glow: false, gap: 34 },
    { text: 'Beat', pitch: fit('Beat', inner, 9), color: AMBER, glow: true, gap: 18 },
    { text: score, pitch: fit(score, inner, 13), color: AMBER, glow: true, gap: 30 },
    { text: `${unit} · ${where}`, pitch: fit(`${unit} · ${where}`, inner, 5.2), color: PALE, glow: false, gap: 0 },
  ];
  if (text.name) {
    const from = `from ${text.name}`;
    lines[3]!.gap = 18;
    lines.push({ text: from, pitch: fit(from, inner, 4.2), color: DIM, glow: false, gap: 0 });
  }
  const height = lines.reduce((sum, l) => sum + l.pitch * ROWS + l.gap, 0);
  let top = y + (h - height) / 2;
  for (const l of lines) {
    dotLine(r, l.text, left + (inner - lineWidth(l.text, l.pitch)) / 2, top, l.pitch, l.color, l.glow);
    top += l.pitch * ROWS + l.gap;
  }
}

/** The preview picture of one challenge, as a PNG. */
export function renderPreview(text: PreviewText): Buffer {
  const r = new Raster(PREVIEW_WIDTH, PREVIEW_HEIGHT);
  r.verticalGradient(BACKGROUND_TOP, BACKGROUND_BOTTOM);
  roundabout(r);
  sign(r, text);
  return r.png();
}
