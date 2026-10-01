import { crc32, deflateSync } from 'node:zlib';

export type Rgb = readonly [number, number, number];

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * A small RGB picture drawn in code: no canvas, no fonts, no native packages. Shapes are drawn
 * from their distance to each pixel, so every edge is smooth.
 */
export class Raster {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height * 3);
  }

  /** Lays `color` over the pixel with `alpha` (0–1). */
  blend(x: number, y: number, color: Rgb, alpha: number): void {
    if (alpha <= 0 || x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const a = Math.min(1, alpha);
    const i = (y * this.width + x) * 3;
    const p = this.pixels;
    p[i] = p[i]! + (color[0] - p[i]!) * a;
    p[i + 1] = p[i + 1]! + (color[1] - p[i + 1]!) * a;
    p[i + 2] = p[i + 2]! + (color[2] - p[i + 2]!) * a;
  }

  /** Top to bottom, from one colour to the other. */
  verticalGradient(top: Rgb, bottom: Rgb): void {
    for (let y = 0; y < this.height; y++) {
      const t = y / (this.height - 1);
      const row: Rgb = [top[0] + (bottom[0] - top[0]) * t, top[1] + (bottom[1] - top[1]) * t, top[2] + (bottom[2] - top[2]) * t];
      for (let x = 0; x < this.width; x++) this.blend(x, y, row, 1);
    }
  }

  /** Every pixel of the box (x0, y0)–(x1, y1) gets `coverage(px, py)` of the colour; the pixel centre is at +0.5. */
  private paint(x0: number, y0: number, x1: number, y1: number, color: Rgb, coverage: (px: number, py: number) => number): void {
    const xa = Math.max(0, Math.floor(x0));
    const ya = Math.max(0, Math.floor(y0));
    const xb = Math.min(this.width - 1, Math.ceil(x1));
    const yb = Math.min(this.height - 1, Math.ceil(y1));
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) this.blend(x, y, color, coverage(x + 0.5, y + 0.5));
  }

  /** A filled circle. */
  disc(cx: number, cy: number, r: number, color: Rgb, alpha = 1): void {
    this.paint(cx - r - 1, cy - r - 1, cx + r + 1, cy + r + 1, color, (px, py) => alpha * clamp01(r - Math.hypot(px - cx, py - cy) + 0.5));
  }

  /** A band between two radii. */
  annulus(cx: number, cy: number, inner: number, outer: number, color: Rgb, alpha = 1): void {
    this.paint(cx - outer - 1, cy - outer - 1, cx + outer + 1, cy + outer + 1, color, (px, py) => {
      const d = Math.hypot(px - cx, py - cy);
      return alpha * clamp01(outer - d + 0.5) * clamp01(d - inner + 0.5);
    });
  }

  /** A soft round light: full in the middle, gone at `r`. */
  glow(cx: number, cy: number, r: number, color: Rgb, alpha: number): void {
    this.paint(cx - r, cy - r, cx + r, cy + r, color, (px, py) => {
      const t = 1 - Math.hypot(px - cx, py - cy) / r;
      return t <= 0 ? 0 : alpha * t * t;
    });
  }

  /** A rounded box of `length` × `width` around (cx, cy), turned by `angle` (radians). `soft` blurs the edge over that many pixels. */
  box(cx: number, cy: number, length: number, width: number, radius: number, angle: number, color: Rgb, alpha = 1, soft = 0): void {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const hx = length / 2 - radius;
    const hy = width / 2 - radius;
    const reach = Math.hypot(length, width) / 2 + soft + 1;
    this.paint(cx - reach, cy - reach, cx + reach, cy + reach, color, (px, py) => {
      const dx = px - cx;
      const dy = py - cy;
      const qx = Math.abs(dx * cos + dy * sin) - hx;
      const qy = Math.abs(-dx * sin + dy * cos) - hy;
      const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
      return alpha * clamp01(soft > 0 ? 0.5 - d / soft : 0.5 - d);
    });
  }

  /** The picture as a PNG file. */
  png(): Buffer {
    const { width, height, pixels } = this;
    const stride = width * 3;
    const raw = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y++) {
      // Of the four simple filters, take the one that leaves the smallest numbers (PNG spec, 12.8).
      let best = 0;
      let bestSum = Infinity;
      for (let filter = 0; filter <= 3; filter++) {
        let sum = 0;
        for (let i = 0; i < stride; i++) {
          const value = (pixels[y * stride + i]! - predict(pixels, y, i, stride, filter)) & 0xff;
          sum += value < 128 ? value : 256 - value;
        }
        if (sum < bestSum) {
          bestSum = sum;
          best = filter;
        }
      }
      const at = y * (stride + 1);
      raw[at] = best;
      for (let i = 0; i < stride; i++) raw[at + 1 + i] = (pixels[y * stride + i]! - predict(pixels, y, i, stride, best)) & 0xff;
    }
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header.set([8, 2, 0, 0, 0], 8); // 8 bits, RGB, deflate, standard filters, not interlaced
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]);
  }
}

/** What a PNG filter predicts for byte `i` of row `y`: 0 nothing, 1 the left pixel, 2 the one above, 3 their average. */
function predict(pixels: Uint8Array, y: number, i: number, stride: number, filter: number): number {
  const left = i >= 3 ? pixels[y * stride + i - 3]! : 0;
  const up = y > 0 ? pixels[(y - 1) * stride + i]! : 0;
  switch (filter) {
    case 1:
      return left;
    case 2:
      return up;
    case 3:
      return (left + up) >> 1;
    default:
      return 0;
  }
}

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
  return Buffer.concat([head, data, crc]);
}
