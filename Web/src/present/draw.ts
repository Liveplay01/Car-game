import type { RenderList, RenderItem, Camera } from './render';
import { toScreen } from './render';
import { css, type ColorToken } from './theme';
import { type Vec2, v } from '../core/vec2';
import { MONEY_MARK, textPieces, inlineMoneyWidth, moneyShapes } from './icons';
import { fontFor, measure } from './measure';

/**
 * Draws a render list on a 2D canvas: the platform side of FOUNDATION.md 4.1 (the raylib
 * `Renderer` of the test window, for the browser).
 *
 * `offset` places the safe area inside the canvas; full-screen fills (scrims, flashes) are
 * stretched to the whole canvas so no edge ever shows.
 */
export class CanvasDrawer {
  private readonly ctx: CanvasRenderingContext2D;
  dpr = 1;
  width = 0;
  height = 0;
  offset = v(0, 0);

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true } as CanvasRenderingContext2DSettings);
    if (!ctx) throw new Error('Canvas 2D is not available');
    this.ctx = ctx;
  }

  resize(width: number, height: number, dpr: number): void {
    this.dpr = dpr;
    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
  }

  draw(list: RenderList): void {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = css(list.background);
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, this.offset.x * this.dpr, this.offset.y * this.dpr);
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    const cam = list.camera;
    let clip: RenderItem['clip'] = undefined;
    for (const item of list.items) {
      if (item.clip !== clip) {
        if (clip) ctx.restore();
        clip = item.clip;
        if (clip) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(clip.minX, clip.minY, clip.maxX - clip.minX, clip.maxY - clip.minY);
          ctx.clip();
        }
      }
      this.item(item, cam);
    }
    if (clip) ctx.restore();
  }

  private item(item: RenderItem, cam: Camera): void {
    const ctx = this.ctx;
    const world = item.space === 'world';
    const color = css(item.color, item.opacity);
    const p = item.p;
    const pt = (q: Vec2): Vec2 => (world ? toScreen(cam, q) : q);
    const len = (l: number): number => (world ? l * cam.scale : l);
    switch (p.k) {
      case 'rect': {
        const c = pt(p.center);
        let w = len(p.size.x);
        let h = len(p.size.y);
        let cx = c.x;
        let cy = c.y;
        // A fill over the whole viewport covers the whole canvas, safe-area margins included.
        if (!world && p.rotation === 0 && w >= cam.viewport.x - 0.5 && h >= cam.viewport.y - 0.5) {
          w = this.width + 80;
          h = this.height + 80;
          cx = this.width / 2 - this.offset.x;
          cy = this.height / 2 - this.offset.y;
        }
        if (w <= 0 || h <= 0) return;
        const rot = world ? -p.rotation : p.rotation;
        const r = Math.max(0, Math.min(len(p.radius), w / 2, h / 2));
        ctx.fillStyle = color;
        if (rot !== 0) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(rot);
          ctx.beginPath();
          if (r > 0.3) ctx.roundRect(-w / 2, -h / 2, w, h, r);
          else ctx.rect(-w / 2, -h / 2, w, h);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.beginPath();
          if (r > 0.3) ctx.roundRect(cx - w / 2, cy - h / 2, w, h, r);
          else ctx.rect(cx - w / 2, cy - h / 2, w, h);
          ctx.fill();
        }
        return;
      }
      case 'circle': {
        const c = pt(p.center);
        const r = len(p.radius);
        if (r <= 0.05) return;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      case 'arc': {
        const c = pt(p.center);
        const r = len(p.radius);
        const t = len(p.thickness);
        if (t <= 0.02 || r <= 0) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = t;
        ctx.beginPath();
        if (Math.abs(p.end - p.start) >= Math.PI * 2 - 1e-9) {
          ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        } else if (world) {
          // World angles turn counter-clockwise, screen angles clockwise.
          ctx.arc(c.x, c.y, r, -p.end, -p.start);
        } else {
          ctx.arc(c.x, c.y, r, Math.min(p.start, p.end), Math.max(p.start, p.end));
        }
        ctx.stroke();
        return;
      }
      case 'line': {
        const a = pt(p.from);
        const b = pt(p.to);
        const t = len(p.thickness);
        if (t <= 0.02) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = t;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        return;
      }
      case 'polygon': {
        if (p.points.length < 3) return;
        ctx.fillStyle = color;
        ctx.beginPath();
        const first = pt(p.points[0]);
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < p.points.length; i++) {
          const q = pt(p.points[i]);
          ctx.lineTo(q.x, q.y);
        }
        ctx.closePath();
        ctx.fill();
        return;
      }
      case 'text': {
        if (p.size < 1) return;
        const anchor = pt(p.position);
        const bold = p.weight === 'bold';
        ctx.font = fontFor(p.size, bold);
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        if (!p.text.includes(MONEY_MARK)) {
          const width = measure(p.text, p.size, bold);
          const x = p.align === 'leading' ? anchor.x : p.align === 'center' ? anchor.x - width / 2 : anchor.x - width;
          ctx.fillStyle = color;
          ctx.fillText(p.text, x, anchor.y + p.size * 0.04);
          return;
        }
        // Money inside a text: the note is drawn where the mark stands.
        const pieces = textPieces(p.text);
        const note = inlineMoneyWidth(p.size);
        const widths = pieces.map((piece) => (piece === null ? note : measure(piece, p.size, bold)));
        const total = widths.reduce((a, b) => a + b, 0);
        let x = p.align === 'leading' ? anchor.x : p.align === 'center' ? anchor.x - total / 2 : anchor.x - total;
        pieces.forEach((piece, i) => {
          if (piece === null) {
            for (const shape of moneyShapes(v(x + widths[i] / 2, anchor.y), p.size * 0.72, 'accent')) {
              this.item({ p: shape.p, color: shape.color, opacity: item.opacity * shape.alpha, space: 'screen' }, cam);
            }
          } else {
            ctx.font = fontFor(p.size, bold);
            ctx.fillStyle = color;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'left';
            ctx.fillText(piece, x, anchor.y + p.size * 0.04);
          }
          x += widths[i];
        });
        return;
      }
    }
  }
}

export type { ColorToken };
