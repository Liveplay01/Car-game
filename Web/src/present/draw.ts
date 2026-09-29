import type { RenderList, RenderItem, Camera, Grain } from './render';
import { toScreen, unitHash } from './render';
import { css, type ColorToken } from './theme';
import { type Vec2, v } from '../core/vec2';
import { MONEY_MARK, textPieces, inlineMoneyWidth, moneyShapes } from './icons';
import { fontFor, measure } from './measure';

/**
 * Draws a render list on a 2D canvas: the platform side of FOUNDATION.md 4.1.
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
  /** The font the context holds: parsing a font string is costly, so it is set only on change. */
  private font = '';
  /** Textures, made once; and the area of the textured group being drawn (screen points). */
  private readonly patterns = new Map<Grain | 'ground', CanvasPattern | null>();
  private grainPath: Path2D | null = null;
  private grainKind: Grain | undefined = undefined;

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
    this.font = '';
  }

  draw(list: RenderList): void {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = css(list.background);
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, this.offset.x * this.dpr, this.offset.y * this.dpr);
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    // Set before any save(), so no restore() takes them back.
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const cam = list.camera;
    if (list.groundGrain) this.fillGrain('ground', null, cam);
    let clip: RenderItem['clip'] = undefined;
    for (const item of list.items) {
      // A textured group has ended: its texture goes over it now, markings and all.
      if (item.grain !== this.grainKind) this.flushGrain(cam);
      if (item.clip !== clip) {
        if (clip) this.restoreClip();
        clip = item.clip;
        if (clip) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(clip.minX, clip.minY, clip.maxX - clip.minX, clip.maxY - clip.minY);
          ctx.clip();
        }
      }
      this.item(item, cam);
      if (item.grain) this.addGrainArea(item, cam);
    }
    this.flushGrain(cam);
    if (clip) this.restoreClip();
  }

  // MARK: Texture

  /** Adds the item's area to the textured group (lines and texts lie on it already). */
  private addGrainArea(item: RenderItem, cam: Camera): void {
    const p = item.p;
    const path = (this.grainPath ??= new Path2D());
    this.grainKind = item.grain;
    const pt = (q: Vec2): Vec2 => toScreen(cam, q);
    const s = cam.scale;
    switch (p.k) {
      case 'rect': {
        const c = pt(p.center);
        const rot = -p.rotation;
        const [cos, sin] = [Math.cos(rot), Math.sin(rot)];
        const hw = (p.size.x * s) / 2;
        const hh = (p.size.y * s) / 2;
        const corner = (x: number, y: number): [number, number] => [c.x + x * cos - y * sin, c.y + x * sin + y * cos];
        path.moveTo(...corner(-hw, -hh));
        path.lineTo(...corner(hw, -hh));
        path.lineTo(...corner(hw, hh));
        path.lineTo(...corner(-hw, hh));
        path.closePath();
        return;
      }
      case 'circle': {
        const c = pt(p.center);
        path.moveTo(c.x + p.radius * s, c.y);
        path.arc(c.x, c.y, p.radius * s, 0, Math.PI * 2);
        return;
      }
      case 'arc': {
        // A band: out along the outer edge, back along the inner one (the hole winds the other way).
        const c = pt(p.center);
        const outer = (p.radius + p.thickness / 2) * s;
        const inner = Math.max(0, (p.radius - p.thickness / 2) * s);
        const full = Math.abs(p.end - p.start) >= Math.PI * 2 - 1e-9;
        const [a0, a1] = full ? [0, Math.PI * 2] : [-p.end, -p.start];
        path.moveTo(c.x + outer * Math.cos(a0), c.y + outer * Math.sin(a0));
        path.arc(c.x, c.y, outer, a0, a1);
        if (full) path.moveTo(c.x + inner * Math.cos(a1), c.y + inner * Math.sin(a1));
        else path.lineTo(c.x + inner * Math.cos(a1), c.y + inner * Math.sin(a1));
        path.arc(c.x, c.y, inner, a1, a0, true);
        path.closePath();
        return;
      }
      case 'polygon': {
        if (p.points.length < 3) return;
        const first = pt(p.points[0]);
        path.moveTo(first.x, first.y);
        for (let i = 1; i < p.points.length; i++) {
          const q = pt(p.points[i]);
          path.lineTo(q.x, q.y);
        }
        path.closePath();
        return;
      }
      default:
        return;
    }
  }

  private flushGrain(cam: Camera): void {
    const path = this.grainPath;
    const kind = this.grainKind;
    this.grainPath = null;
    this.grainKind = undefined;
    if (path && kind) this.fillGrain(kind, path, cam);
  }

  /** Lays a texture over `path` (null: the whole canvas), anchored to the world so it never swims. */
  private fillGrain(kind: Grain | 'ground', path: Path2D | null, cam: Camera): void {
    const pattern = this.pattern(kind);
    if (!pattern) return;
    const s = cam.scale * CanvasDrawer.texel;
    pattern.setTransform(new DOMMatrix([s, 0, 0, -s, cam.focus.x - cam.center.x * cam.scale, cam.focus.y + cam.center.y * cam.scale]));
    const ctx = this.ctx;
    ctx.fillStyle = pattern;
    if (path) ctx.fill(path);
    else ctx.fillRect(-this.offset.x, -this.offset.y, this.width, this.height);
  }

  /** World units one texture pixel covers: a 256-pixel tile spans about five car lengths. */
  static readonly texel = 0.5;

  private pattern(kind: Grain | 'ground'): CanvasPattern | null {
    if (!this.patterns.has(kind)) this.patterns.set(kind, this.ctx.createPattern(CanvasDrawer.tile(kind), 'repeat'));
    return this.patterns.get(kind) ?? null;
  }

  /**
   * A seamless 256-pixel texture, the same every time. Asphalt: fine light and dark grain,
   * a few pale chips of stone and darker tar patches. Ground: soft mottling and a finer grain.
   * Mostly transparent, so the colour under it stays the colour of the road or the map.
   */
  static tile(kind: Grain | 'ground'): HTMLCanvasElement {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const g = canvas.getContext('2d')!;
    const h = unitHash;
    const dot = (x: number, y: number, r: number, color: string): void => {
      g.fillStyle = color;
      for (const dx of [-size, 0, size]) {
        for (const dy of [-size, 0, size]) {
          const px = x + dx;
          const py = y + dy;
          if (px + r < 0 || px - r > size || py + r < 0 || py - r > size) continue;
          g.beginPath();
          g.arc(px, py, r, 0, Math.PI * 2);
          g.fill();
        }
      }
    };
    const light = (a: number): string => `rgba(255,255,255,${a.toFixed(3)})`;
    const dark = (a: number): string => `rgba(0,0,0,${a.toFixed(3)})`;
    // A soft patch: a radial gradient, so no edge ever shows (hard circles read as bokeh).
    const patch = (x: number, y: number, r: number, rgb: string, a: number): void => {
      for (const dx of [-size, 0, size]) {
        for (const dy of [-size, 0, size]) {
          const px = x + dx;
          const py = y + dy;
          if (px + r < 0 || px - r > size || py + r < 0 || py - r > size) continue;
          const gradient = g.createRadialGradient(px, py, 0, px, py, r);
          gradient.addColorStop(0, `rgba(${rgb},${a.toFixed(3)})`);
          gradient.addColorStop(1, `rgba(${rgb},0)`);
          g.fillStyle = gradient;
          g.fillRect(px - r, py - r, 2 * r, 2 * r);
        }
      }
    };
    if (kind === 'asphalt') {
      for (let i = 0; i < 18; i++) patch(h(i, 901) * size, h(i, 902) * size, 20 + 36 * h(i, 903), '0,0,0', 0.05 + 0.04 * h(i, 904));
      for (let i = 0; i < 2200; i++) {
        const r = 0.5 + 0.7 * h(i, 908);
        dot(h(i, 906) * size, h(i, 907) * size, r, h(i, 905) < 0.45 ? light(0.025 + 0.035 * h(i, 909)) : dark(0.07 + 0.09 * h(i, 909)));
      }
      for (let i = 0; i < 50; i++) dot(h(i, 911) * size, h(i, 912) * size, 1.1 + 0.7 * h(i, 913), light(0.035 + 0.035 * h(i, 914)));
    } else {
      for (let i = 0; i < 16; i++) patch(h(i, 921) * size, h(i, 922) * size, 40 + 60 * h(i, 923), i % 2 === 0 ? '255,255,255' : '0,0,0', i % 2 === 0 ? 0.012 + 0.01 * h(i, 924) : 0.04 + 0.03 * h(i, 924));
      for (let i = 0; i < 900; i++) dot(h(i, 926) * size, h(i, 927) * size, 0.5 + 0.6 * h(i, 928), h(i, 925) < 0.4 ? light(0.015 + 0.015 * h(i, 929)) : dark(0.04 + 0.04 * h(i, 929)));
    }
    return canvas;
  }

  /** Leaves a clipped group; the font set inside it goes back with the rest of the state. */
  private restoreClip(): void {
    this.ctx.restore();
    this.font = '';
  }

  private setFont(size: number, bold: boolean): void {
    const font = fontFor(size, bold);
    if (font === this.font) return;
    this.ctx.font = font;
    this.font = font;
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
        this.setFont(p.size, bold);
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
            this.setFont(p.size, bold);
            ctx.fillStyle = color;
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
