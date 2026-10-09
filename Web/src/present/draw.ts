import type { RenderList, RenderItem, Camera, Grain, Bake } from './render';
import { toScreen, unitHash } from './render';
import { COLORS, css, type ColorToken } from './theme';
import { type Vec2, v } from '../core/vec2';
import { MONEY_MARK, textPieces, inlineMoneyWidth, moneyShapes } from './icons';
import { fontFor, measure } from './measure';

/**
 * Draws a render list on a 2D canvas: the platform side of FOUNDATION.md 4.1.
 *
 * `offset` places the safe area inside the canvas; full-screen fills (scrims, flashes) are
 * stretched to the whole canvas so no edge ever shows.
 */
type GroundGrain = 'ground' | 'groundBright';

/** The camera the still pictures are baked for, where they go (device pixels) and their margin. */
type Still = { cam: Camera; dx: number; dy: number; room: number };

/** Whether a colour is a daylight ground (relative luminance above a mid grey). */
function isBright(token: ColorToken): boolean {
  const [r, g, b] = COLORS[token];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 110;
}

/** Deep equality of plain shapes (numbers, strings, arrays, objects), without making anything. */
function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!same(a[i], b[i])) return false;
    return true;
  }
  if (Array.isArray(b)) return false;
  const x = a as Record<string, unknown>;
  const y = b as Record<string, unknown>;
  for (const k in x) if (!same(x[k], y[k])) return false;
  for (const k in y) if (!(k in x) && y[k] !== undefined) return false;
  return true;
}

/** Whether `items[start..end]` show exactly the shapes `before` did. */
function sameItems(items: RenderItem[], start: number, end: number, before: RenderItem[]): boolean {
  if (before.length !== end - start) return false;
  for (let i = start; i < end; i++) if (!same(items[i], before[i - start])) return false;
  return true;
}

export class CanvasDrawer {
  /** The context drawn on: the canvas's own, or the ground picture's while it is baked. */
  private ctx: CanvasRenderingContext2D;
  dpr = 1;
  /** Whether glass frosts what lies under it; off on a device that cannot keep its frames. */
  glassBlur = true;
  width = 0;
  height = 0;
  offset = v(0, 0);
  /** The font the context holds: parsing a font string is costly, so it is set only on change. */
  private font = '';
  /** Textures, made once; and the area of the textured group being drawn (screen points). */
  private readonly patterns = new Map<Grain | GroundGrain, CanvasPattern | null>();
  private grainPath: Path2D | null = null;
  private grainKind: Grain | undefined = undefined;

  constructor(private readonly canvas: HTMLCanvasElement) {
    // Not `desynchronized`: that low-latency mode lets the screen show a frame while it is still
    // being drawn. Every frame starts with the ground over last frame's cars and draws the cars
    // late, so on a busy map (Mushroom Grove) the screen mostly caught it without them and the
    // traffic only flickered up now and then. The taps keep their own timestamps anyway.
    // With alpha, so Big Screen's ground can let the player's picture behind the canvas through;
    // every other ground is painted solid, so nothing else changes.
    const ctx = canvas.getContext('2d');
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

  /**
   * The still ground (background, its texture and `list.staticEnd` leading items), baked once
   * and copied pixel for pixel while `groundKey` stays the same: the map, the road, the camera
   * and the canvas. The large see-through patches of a map are then no longer painted every
   * frame; what moves is drawn over it as before, so the picture is exactly the same.
   */
  private ground: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; key: string } | null = null;
  private lastGroundKey = '';

  /**
   * Screen points a baked picture reaches past the canvas on every side: a crash's shake (up to
   * about 14) then only moves it; a bigger one paints item by item as before.
   */
  static readonly shakeRoom = 16;
  /** Device pixels the picture being baked on `this.ctx` reaches past the canvas (0: the canvas itself). */
  private pad = 0;

  /**
   * The camera the still pictures are baked for and where they go (device pixels): without the
   * shake when it fits their margin, so a shaking camera keeps them. The focus is snapped to
   * 1/1024 point, so taking the shake off again gives the very same key frame after frame.
   */
  private still(list: RenderList): Still {
    const c = list.camera;
    const room = Math.ceil(CanvasDrawer.shakeRoom * this.dpr);
    const s = list.shake;
    const dx = Math.round(s.x * this.dpr);
    const dy = Math.round(s.y * this.dpr);
    if (Math.abs(dx) > room || Math.abs(dy) > room) return { cam: c, dx: 0, dy: 0, room };
    const snap = (x: number): number => Math.round(x * 1024) / 1024;
    return { cam: { ...c, focus: v(snap(c.focus.x - s.x), snap(c.focus.y - s.y)) }, dx, dy, room };
  }

  /** A picture as big as the canvas plus `room` on every side. */
  private fit(canvas: HTMLCanvasElement, room: number): void {
    const w = this.canvas.width + 2 * room;
    const h = this.canvas.height + 2 * room;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  private groundKey(list: RenderList, c: Camera): string {
    return `${list.staticKey}|${list.staticEnd}|${list.background}|${list.backdrop}|${list.groundGrain}|${c.center.x},${c.center.y},${c.focus.x},${c.focus.y},${c.scale},${c.viewport.x},${c.viewport.y}|${this.canvas.width}x${this.canvas.height}@${this.dpr}|${this.offset.x},${this.offset.y}`;
  }

  /** Background, ground texture and the still items, on whichever context is `this.ctx`. */
  private paintGround(list: RenderList, end: number, cam: Camera): void {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.forgetStyle();
    // Big Screen: cleared, then only a veil of the background over the player's picture.
    if (list.backdrop !== null) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.setFill(css(list.background, list.backdrop ?? 1));
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.placeWorld();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    if (list.groundGrain && list.backdrop === null) this.fillGrain(isBright(list.background) ? 'groundBright' : 'ground', null, cam);
    for (let i = 0; i < end; i++) {
      const item = list.items[i];
      if (!this.offscreen(item.p, cam)) this.item(item, cam);
    }
  }

  draw(list: RenderList): void {
    const ctx = this.ctx;
    const still = this.still(list);
    let start = 0;
    if (list.staticKey !== null) {
      const key = this.groundKey(list, still.cam);
      // Baked only once the view holds still for a frame: a moving camera would bake every frame.
      const holds = key === this.lastGroundKey;
      this.lastGroundKey = key;
      if (this.ground?.key !== key && holds) {
        const canvas = this.ground?.canvas ?? document.createElement('canvas');
        this.fit(canvas, still.room);
        const baked = this.ground?.ctx ?? canvas.getContext('2d');
        if (baked) {
          this.ctx = baked;
          this.pad = still.room;
          this.paintGround(list, list.staticEnd, still.cam);
          this.pad = 0;
          this.ctx = ctx;
          this.ground = { canvas, ctx: baked, key };
        }
      }
      if (this.ground?.key === key) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        // A see-through ground would show the last frame under it.
        if (list.backdrop !== null) ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.drawImage(this.ground.canvas, still.dx - still.room, still.dy - still.room);
        start = list.staticEnd;
      }
    }
    if (start === 0) this.paintGround(list, 0, list.camera);
    this.prepare();
    if (list.vignette > 0.002) {
      const at = Math.max(start, Math.min(list.vignetteAt, list.items.length));
      this.paintItems(list, start, at, list.camera, still);
      this.paintVignette(list.vignette * (isBright(list.background) ? CanvasDrawer.vignetteBright : CanvasDrawer.vignetteDark));
      this.paintItems(list, at, list.items.length, list.camera, still);
    } else this.paintItems(list, start, list.items.length, list.camera, still);
  }

  /** The strongest vignette's corners, on a daylight ground and on a dark one (where black shows less). */
  static readonly vignetteBright = 0.3;
  static readonly vignetteDark = 0.5;
  /** Made once, small: a soft gradient loses nothing when stretched, and copying it is one cheap draw. */
  private vignetteArt: HTMLCanvasElement | null = null;

  /** Dark edges over the whole canvas (an ellipse that follows its shape), clear across the middle. */
  private paintVignette(opacity: number): void {
    if (!this.vignetteArt) {
      const size = 256;
      const art = document.createElement('canvas');
      art.width = art.height = size;
      const g = art.getContext('2d');
      if (!g) return;
      const half = size / 2;
      const gradient = g.createRadialGradient(half, half, 0, half, half, half * Math.SQRT2);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.7, 'rgba(0,0,0,0.2)');
      gradient.addColorStop(0.85, 'rgba(0,0,0,0.55)');
      gradient.addColorStop(1, 'rgba(0,0,0,1)');
      g.fillStyle = gradient;
      g.fillRect(0, 0, size, size);
      this.vignetteArt = art;
    }
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = Math.min(1, opacity);
    ctx.drawImage(this.vignetteArt, 0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
    this.prepare();
  }

  /** The world transform (safe area and a baked picture's margin included), on `this.ctx`. */
  private placeWorld(): void {
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, this.offset.x * this.dpr + this.pad, this.offset.y * this.dpr + this.pad);
  }

  /** The world transform and the text and line settings, on `this.ctx`. */
  private prepare(): void {
    const ctx = this.ctx;
    this.placeWorld();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    // Set before any save(), so no restore() takes them back.
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    this.forgetStyle();
  }

  /** Items `from` to `to` as `cam` sees them; with `still`, a baked stretch goes in as its picture. */
  private paintItems(list: RenderList, from: number, to: number, cam: Camera, still: Still | null): void {
    const ctx = this.ctx;
    let clip: RenderItem['clip'] = undefined;
    for (let i = from; i < to; i++) {
      const bake = still && clip === undefined ? list.bakes.get(i) : undefined;
      if (bake && still) {
        this.flushGrain(cam);
        if (this.drawBaked(list, i, bake, still)) {
          i = bake.end - 1;
          continue;
        }
      }
      const item = list.items[i];
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
      if (item.space === 'world' && this.offscreen(item.p, cam)) continue;
      this.item(item, cam);
      if (item.grain) this.addGrainArea(item, cam);
    }
    this.flushGrain(cam);
    if (clip) this.restoreClip();
  }

  /**
   * Baked stretches (the road), by name: their picture and what it shows. Without a key of its
   * own, a stretch keeps last frame's shapes and a version that counts each change of them.
   */
  private readonly baked = new Map<string, { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; key: string; last: string; shapes: RenderItem[]; version: number }>();

  /**
   * Puts a still stretch in as its picture: baked once the view has held for a frame, then
   * copied while its shapes, the camera and the canvas stay. False: draw it item by item.
   */
  private drawBaked(list: RenderList, start: number, bake: Bake, still: Still): boolean {
    if (bake.end > list.items.length) return false;
    let slot = this.baked.get(bake.name);
    if (!slot) {
      const canvas = document.createElement('canvas');
      const bctx = canvas.getContext('2d');
      if (!bctx) return false;
      slot = { canvas, ctx: bctx, key: '', last: '', shapes: [], version: 0 };
      this.baked.set(bake.name, slot);
    }
    // Compared shape by shape, so no frame turns the whole road into a string to find it unchanged.
    if (bake.key === null && !sameItems(list.items, start, bake.end, slot.shapes)) {
      slot.shapes = list.items.slice(start, bake.end);
      slot.version++;
    }
    const c = still.cam;
    const key = `${bake.key ?? slot.version}|${c.center.x},${c.center.y},${c.focus.x},${c.focus.y},${c.scale}|${this.canvas.width}x${this.canvas.height}@${this.dpr}|${this.offset.x},${this.offset.y}`;
    const holds = slot.last === key;
    slot.last = key;
    if (slot.key !== key) {
      if (!holds) return false;
      const { canvas } = slot;
      this.fit(canvas, still.room);
      const main = this.ctx;
      this.ctx = slot.ctx;
      this.pad = still.room;
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.prepare();
      this.paintItems(list, start, bake.end, c, null);
      this.pad = 0;
      this.ctx = main;
      this.forgetStyle();
      slot.key = key;
    }
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(slot.canvas, still.dx - still.room, still.dy - still.room);
    this.placeWorld();
    return true;
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
  private fillGrain(kind: Grain | GroundGrain, path: Path2D | null, cam: Camera): void {
    const pattern = this.pattern(kind);
    if (!pattern) return;
    const s = cam.scale * CanvasDrawer.texel;
    pattern.setTransform(new DOMMatrix([s, 0, 0, -s, cam.focus.x - cam.center.x * cam.scale, cam.focus.y + cam.center.y * cam.scale]));
    const ctx = this.ctx;
    ctx.fillStyle = pattern;
    this.fill = null;
    if (path) ctx.fill(path);
    else {
      const m = this.pad / this.dpr;
      ctx.fillRect(-this.offset.x - m, -this.offset.y - m, this.width + 2 * m, this.height + 2 * m);
    }
  }

  /** World units one texture pixel covers: a 256-pixel tile spans about five car lengths. */
  static readonly texel = 0.5;

  private pattern(kind: Grain | GroundGrain): CanvasPattern | null {
    if (!this.patterns.has(kind)) this.patterns.set(kind, this.ctx.createPattern(CanvasDrawer.tile(kind), 'repeat'));
    return this.patterns.get(kind) ?? null;
  }

  /**
   * A seamless 256-pixel texture, the same every time. Asphalt: fine light and dark grain,
   * a few pale chips of stone and darker tar patches. Ground: soft mottling and a finer grain;
   * on a bright (daylight) ground far fainter, since black shows as dirt on sand and snow.
   * Mostly transparent, so the colour under it stays the colour of the road or the map.
   */
  static tile(kind: Grain | GroundGrain): HTMLCanvasElement {
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
      const k = kind === 'groundBright' ? 0.3 : 1;
      for (let i = 0; i < 16; i++) patch(h(i, 921) * size, h(i, 922) * size, 40 + 60 * h(i, 923), i % 2 === 0 ? '255,255,255' : '0,0,0', i % 2 === 0 ? (0.012 + 0.01 * h(i, 924)) / k ** 0.5 : (0.04 + 0.03 * h(i, 924)) * k);
      for (let i = 0; i < 900; i++) dot(h(i, 926) * size, h(i, 927) * size, 0.5 + 0.6 * h(i, 928), h(i, 925) < 0.4 ? light(0.015 + 0.015 * h(i, 929)) : dark((0.04 + 0.04 * h(i, 929)) * (0.5 + k / 2)));
    }
    return canvas;
  }

  /** Leaves a clipped group; the font set inside it goes back with the rest of the state. */
  private restoreClip(): void {
    this.ctx.restore();
    this.font = '';
    this.forgetStyle();
  }

  private setFont(size: number, bold: boolean): void {
    const font = fontFor(size, bold);
    if (font === this.font) return;
    this.ctx.font = font;
    this.font = font;
  }

  /** The colour last set, so an unchanged one is not parsed again (the canvas parses every string). */
  private fill: string | null = null;
  private stroke: string | null = null;

  /** The soft shadow of a glass panel, only where the panel is not: through the glass it would show as a dark patch. */
  private glassShadow(x: number, y: number, w: number, h: number, r: number, opacity: number): void {
    const ctx = this.ctx;
    const d = this.dpr;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-this.offset.x - 40, -this.offset.y - 40, this.width + 80, this.height + 80);
    ctx.roundRect(x, y, w, h, r);
    ctx.clip('evenodd');
    ctx.shadowColor = css('shadow', opacity * 0.9);
    ctx.shadowBlur = 14 * d;
    ctx.shadowOffsetY = 4 * d;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
    ctx.restore();
  }

  /** Whether the context can blur by itself (`ctx.filter`); Safari cannot, there `softBlur` does the same by shrinking. */
  nativeFilter = typeof CanvasRenderingContext2D !== 'undefined' && 'filter' in CanvasRenderingContext2D.prototype;
  private readonly shrunk: HTMLCanvasElement[] = [];

  /**
   * Frosted glass: what is already drawn under the rect (the cars driving behind it too),
   * blurred and saturated, laid back in it: the canvas twin of `backdrop-filter`. The copy
   * reaches past the rect so the blur has something to average at its edge.
   */
  private frost(x: number, y: number, w: number, h: number, r: number, blur: number): void {
    const ctx = this.ctx;
    const d = this.dpr;
    const reach = Math.ceil(blur * 2 * d);
    const sx = Math.max(0, Math.floor((x + this.offset.x) * d + this.pad) - reach);
    const sy = Math.max(0, Math.floor((y + this.offset.y) * d + this.pad) - reach);
    const ex = Math.min(ctx.canvas.width, Math.ceil((x + w + this.offset.x) * d + this.pad) + reach);
    const ey = Math.min(ctx.canvas.height, Math.ceil((y + h + this.offset.y) * d + this.pad) + reach);
    if (ex <= sx || ey <= sy) return;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.clip();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.nativeFilter) {
      ctx.filter = `blur(${blur * d}px) saturate(1.4)`;
      ctx.drawImage(ctx.canvas, sx, sy, ex - sx, ey - sy, sx, sy, ex - sx, ey - sy);
    } else this.softBlur(sx, sy, ex - sx, ey - sy, blur * d);
    ctx.restore();
  }

  /**
   * A blur without `ctx.filter`: the region is halved a few times (every step averages four
   * pixels), then blown back up in the same steps,
   * so the smoothing never shows blocks. Close to a Gaussian, and no filter needed.
   */
  private softBlur(sx: number, sy: number, w: number, h: number, sigma: number): void {
    const levels = Math.max(1, Math.min(6, Math.round(Math.log2(sigma * 2))));
    let from: CanvasImageSource = this.ctx.canvas;
    let [fx, fy, fw, fh] = [sx, sy, w, h];
    for (let i = 0; i < levels; i++) {
      const c = (this.shrunk[i] ??= document.createElement('canvas'));
      const cw = Math.max(1, Math.ceil(fw / 2));
      const ch = Math.max(1, Math.ceil(fh / 2));
      if (c.width !== cw || c.height !== ch) {
        c.width = cw;
        c.height = ch;
      }
      const g = c.getContext('2d');
      if (!g) return;
      g.imageSmoothingQuality = 'high';
      g.clearRect(0, 0, cw, ch);
      g.drawImage(from, fx, fy, fw, fh, 0, 0, cw, ch);
      from = c;
      [fx, fy, fw, fh] = [0, 0, cw, ch];
    }
    for (let i = levels - 1; i > 0; i--) {
      const up = this.shrunk[i - 1].getContext('2d');
      if (!up) return;
      up.imageSmoothingQuality = 'high';
      up.drawImage(this.shrunk[i], 0, 0, this.shrunk[i].width, this.shrunk[i].height, 0, 0, this.shrunk[i - 1].width, this.shrunk[i - 1].height);
    }
    const ctx = this.ctx;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.shrunk[0], 0, 0, this.shrunk[0].width, this.shrunk[0].height, sx, sy, w, h);
  }

  private setFill(color: string): void {
    if (color === this.fill) return;
    this.ctx.fillStyle = color;
    this.fill = color;
  }

  private setStroke(color: string): void {
    if (color === this.stroke) return;
    this.ctx.strokeStyle = color;
    this.stroke = color;
  }

  /** After a restore or a texture the context's colours are no longer the ones remembered. */
  private forgetStyle(): void {
    this.fill = null;
    this.stroke = null;
  }

  /**
   * Whether a world item lies wholly outside the canvas: then it is not drawn at all. Bounds
   * are generous (a rotated rect by its diagonal), so nothing on screen is ever dropped.
   */
  private offscreen(p: RenderItem['p'], cam: Camera): boolean {
    const s = cam.scale;
    // A baked picture's margin counts as on screen: a shake moves it into view.
    const m = this.pad / this.dpr;
    let x: number;
    let y: number;
    let reach: number;
    switch (p.k) {
      case 'circle':
        ({ x, y } = toScreen(cam, p.center));
        reach = p.radius * s;
        break;
      case 'rect':
        ({ x, y } = toScreen(cam, p.center));
        reach = (Math.hypot(p.size.x, p.size.y) / 2) * s;
        break;
      case 'arc':
        ({ x, y } = toScreen(cam, p.center));
        reach = (p.radius + p.thickness / 2) * s;
        break;
      case 'line': {
        const a = toScreen(cam, p.from);
        const b = toScreen(cam, p.to);
        x = (a.x + b.x) / 2;
        y = (a.y + b.y) / 2;
        reach = Math.hypot(a.x - b.x, a.y - b.y) / 2 + p.thickness * s;
        break;
      }
      case 'polygon': {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const q of p.points) {
          const o = toScreen(cam, q);
          if (o.x < minX) minX = o.x;
          if (o.x > maxX) maxX = o.x;
          if (o.y < minY) minY = o.y;
          if (o.y > maxY) maxY = o.y;
        }
        return maxX < -this.offset.x - m - 1 || maxY < -this.offset.y - m - 1 || minX > this.width - this.offset.x + m + 1 || minY > this.height - this.offset.y + m + 1;
      }
      default:
        return false;
    }
    reach += 1 + m;
    return x + reach < -this.offset.x || y + reach < -this.offset.y || x - reach > this.width - this.offset.x || y - reach > this.height - this.offset.y;
  }

  private item(item: RenderItem, cam: Camera): void {
    const ctx = this.ctx;
    const world = item.space === 'world';
    const p = item.p;
    const color = css(item.color, item.opacity);
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
        if (item.glass !== undefined && !world && rot === 0) {
          this.glassShadow(cx - w / 2, cy - h / 2, w, h, r, item.opacity);
          if (this.glassBlur) this.frost(cx - w / 2, cy - h / 2, w, h, r, item.glass);
          else {
            this.setFill(css('chromeSolid', item.opacity));
            ctx.beginPath();
            ctx.roundRect(cx - w / 2, cy - h / 2, w, h, r);
            ctx.fill();
            return;
          }
        }
        this.setFill(color);
        if (rot !== 0 && r <= 0.3) {
          // A turned square-cornered rect: its four corners, no change of transform needed.
          const cos = Math.cos(rot);
          const sin = Math.sin(rot);
          const hw = w / 2;
          const hh = h / 2;
          ctx.beginPath();
          ctx.moveTo(cx - hw * cos + hh * sin, cy - hw * sin - hh * cos);
          ctx.lineTo(cx + hw * cos + hh * sin, cy + hw * sin - hh * cos);
          ctx.lineTo(cx + hw * cos - hh * sin, cy + hw * sin + hh * cos);
          ctx.lineTo(cx - hw * cos - hh * sin, cy - hw * sin + hh * cos);
          ctx.closePath();
          ctx.fill();
        } else if (rot !== 0) {
          // Turned with round corners: the path is laid in a turned frame; only the transform
          // goes back afterwards (a full save/restore of the context costs far more). The turned
          // frame is set in one call, the same matrix translate and rotate would make.
          const d = this.dpr;
          const cos = Math.cos(rot) * d;
          const sin = Math.sin(rot) * d;
          ctx.setTransform(cos, sin, -sin, cos, cx * d + this.offset.x * d + this.pad, cy * d + this.offset.y * d + this.pad);
          ctx.beginPath();
          ctx.roundRect(-w / 2, -h / 2, w, h, r);
          ctx.fill();
          this.placeWorld();
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
        this.setFill(color);
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
        this.setStroke(color);
        ctx.lineWidth = t;
        ctx.beginPath();
        const open = Math.abs(p.end - p.start) < Math.PI * 2 - 1e-9;
        if (!open) {
          ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        } else if (world) {
          // World angles turn counter-clockwise, screen angles clockwise.
          ctx.arc(c.x, c.y, r, -p.end, -p.start);
        } else {
          ctx.arc(c.x, c.y, r, Math.min(p.start, p.end), Math.max(p.start, p.end));
        }
        if (p.round && open) {
          ctx.lineCap = 'round';
          ctx.stroke();
          ctx.lineCap = 'butt';
        } else ctx.stroke();
        return;
      }
      case 'line': {
        const a = pt(p.from);
        const b = pt(p.to);
        const t = len(p.thickness);
        if (t <= 0.02) return;
        this.setStroke(color);
        ctx.lineWidth = t;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        return;
      }
      case 'segments': {
        // One stroke for all of them: a shower of streaks costs one draw call, not hundreds.
        const t = len(p.thickness);
        if (t <= 0.02 || p.points.length < 2) return;
        this.setStroke(color);
        ctx.lineWidth = t;
        ctx.beginPath();
        for (let i = 0; i + 1 < p.points.length; i += 2) {
          const a = pt(p.points[i]);
          const b = pt(p.points[i + 1]);
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();
        return;
      }
      case 'dots': {
        if (p.points.length === 0) return;
        this.setFill(color);
        ctx.beginPath();
        for (let i = 0; i < p.points.length; i++) {
          const c = pt(p.points[i]);
          const r = len(p.radii[i]);
          if (r <= 0.05) continue;
          ctx.moveTo(c.x + r, c.y);
          ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        }
        ctx.fill();
        return;
      }
      case 'polygon': {
        if (p.points.length < 3) return;
        this.setFill(color);
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
          this.setFill(color);
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
            this.setFill(color);
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
