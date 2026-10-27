/**
 * The boot zoom (Leo, 27.10.2026): while the game loads, the camera sinks from just above the clouds
 * onto the dark, empty roundabout, springing along with the loading progress. Once the game is ready
 * it lands, then either the street lamps strike one after the other (a night shift, the LampWave
 * timings of `cityLights.ts`) or the sun rises over the city; then it fades into the real scene.
 * Should the start fail, the camera lands too and the error stands inside the island; it stays night.
 *
 *   const zoom = new BootZoom(boot);      // mounts a canvas + overlay into the boot element
 *   zoom.progress(0.4);                    // optional, 0…1; without it the progress creeps on by itself
 *   await zoom.ready({ night: true });     // lands, plays the reveal, resolves when the scene may show
 *   zoom.fail(title, body, retryLabel, detail?);   // lands and shows the error in the island
 *
 * Reduce Motion: no turn, no overshoot; the lamps only fade up.
 */

type RGB = readonly [number, number, number];
type Pair = readonly [RGB, RGB];
type Lamp = { x: number; y: number; rank: number; k: number };
type Cloud = { ca: number; x: number; y: number; drift: number; puffs: { x: number; y: number; r: number }[] };
type Car = { x: number; y: number; ang: number; col: RGB; front?: boolean };

const H0 = 18;
const R_IN = 116;
const R_OUT = 184;
const AW = 34;
// Night and day of the same token (`theme.ts`): ground, side streets, roofs, trees.
const C = {
  ground: [[11, 13, 16], [118, 184, 82]] as Pair,
  street: [[27, 32, 40], [60, 66, 74]] as Pair,
  roofs: [
    [[40, 45, 55], [92, 104, 124]],
    [[66, 44, 40], [184, 94, 68]],
    [[50, 52, 56], [172, 172, 166]],
    [[39, 48, 43], [200, 162, 124]],
  ] as Pair[],
  shade: [[19, 36, 28], [26, 66, 40]] as Pair,
  leaf: [[32, 60, 43], [92, 156, 72]] as Pair,
};
const mix = (p: Pair, t: number): string =>
  `rgb(${(p[0][0] + (p[1][0] - p[0][0]) * t) | 0},${(p[0][1] + (p[1][1] - p[0][1]) * t) | 0},${(p[0][2] + (p[1][2] - p[0][2]) * t) | 0})`;
const sat = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
const sstep = (a: number, b: number, x: number): number => {
  const t = sat((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const outCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const inOut = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const rng = (s: number) => (): number => {
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 4294967296;
};

type Outcome = 'night' | 'sunrise' | 'error';

export class BootZoom {
  /** Seconds the camera needs at least, so a fast start still flies. */
  static readonly minFlight = 1.2;
  /** Reveal lengths after landing, then the boot screen may fade (night / sunrise). */
  static readonly revealNight = 1.6;
  static readonly revealDay = 2.6;

  private readonly root: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly panel: HTMLDivElement;
  private readonly calm: boolean;
  private raf = 0;
  private last: number | null = null;
  private t = 0;
  private z = 0;
  private v = 0;
  private given: number | null = null;
  private outcome: Outcome | null = null;
  private doneAt: number | null = null;
  private landed: number | null = null;
  private resolveReady: (() => void) | null = null;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private s1 = 1;
  private world!: {
    roads: Path2D; streets: Path2D; marks: Path2D; poles: Path2D; roofs: Path2D[]; shade: Path2D; leaf: Path2D;
    lamps: Lamp[]; clouds: Cloud[];
  };

  constructor(host: HTMLElement) {
    this.calm = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced';
    this.root = document.createElement('div');
    this.root.style.cssText = 'position:absolute;inset:0;overflow:hidden;background:#0b0d10';
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.panel = document.createElement('div');
    this.panel.setAttribute('role', 'alert');
    this.panel.style.cssText =
      'position:absolute;left:50%;top:50%;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;' +
      'opacity:0;transform:translate(-50%,-50%) scale(0.88);pointer-events:none;' +
      'transition:opacity 450ms cubic-bezier(0.23,1,0.32,1),transform 650ms cubic-bezier(0.34,1.5,0.64,1)';
    this.root.append(this.canvas, this.panel);
    host.prepend(this.root);
    this.ctx = this.canvas.getContext('2d')!;
    this.build();
    const loop = (now: number): void => {
      this.tick(now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  /** The real loading progress, 0…1 (optional). */
  progress(p: number): void {
    this.given = sat(p);
  }

  /** The game is ready: land, play the reveal, resolve when the boot screen may fade over the scene. */
  ready({ night }: { night: boolean }): Promise<void> {
    if (this.outcome) return Promise.resolve();
    this.outcome = night ? 'night' : 'sunrise';
    this.doneAt = this.t;
    return new Promise((resolve) => (this.resolveReady = resolve));
  }

  /** The start failed: land and show the message inside the island; the roundabout stays empty and dark. */
  fail(title: string, body: string, retry: string, detail?: string): void {
    if (this.outcome === 'error') return;
    this.outcome = 'error';
    this.doneAt = this.t;
    const ip = Math.round(R_IN * this.s1);
    this.panel.style.width = `${Math.round(ip * 1.62)}px`;
    this.panel.innerHTML = '';
    const el = (tag: string, css: string, text: string): HTMLElement => {
      const e = document.createElement(tag);
      e.style.cssText = css;
      e.textContent = text;
      this.panel.append(e);
      return e;
    };
    el('strong', "font:800 17px/1.15 'Overpass Variable',ui-rounded,system-ui,sans-serif;color:#f4f6f9;text-wrap:balance", title);
    el('span', 'font-size:13px;line-height:1.4;color:#99a2af;text-wrap:pretty', body);
    if (detail) el('span', "font:500 11px/1.4 ui-monospace,'SF Mono',Menlo,monospace;color:#99a2af", detail);
    const a = el('a', 'margin-top:6px;display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 20px;border-radius:14px;background:#ffb703;color:#0e1013;font-weight:600;font-size:15px;text-decoration:none', retry) as HTMLAnchorElement;
    a.href = '';
  }

  /** Stops drawing and removes itself (after the boot screen has faded). */
  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.root.remove();
  }

  private build(): void {
    const r = rng(11);
    const E = 5200;
    const G = 560;
    const SW = 20;
    const W = {
      roads: new Path2D(), streets: new Path2D(), marks: new Path2D(), poles: new Path2D(),
      roofs: [0, 1, 2, 3].map(() => new Path2D()), shade: new Path2D(), leaf: new Path2D(),
      lamps: [] as Lamp[], clouds: [] as Cloud[],
    };
    W.roads.rect(-E, -AW, 2 * E, 2 * AW);
    W.roads.rect(-AW, -E, 2 * AW, 2 * E);
    W.roads.moveTo(R_OUT, 0);
    W.roads.arc(0, 0, R_OUT, 0, Math.PI * 2);
    for (let k = -9; k <= 9; k++) {
      if (!k) continue;
      W.streets.rect(k * G - SW, -E, 2 * SW, 2 * E);
      W.streets.rect(-E, k * G - SW, 2 * E, 2 * SW);
    }
    for (const s of [-1, 1]) {
      W.marks.moveTo(s * R_OUT, 0);
      W.marks.lineTo(s * E, 0);
      W.marks.moveTo(0, s * R_OUT);
      W.marks.lineTo(0, s * E);
    }
    W.marks.moveTo(150, 0);
    W.marks.arc(0, 0, 150, 0, Math.PI * 2);
    const tree = (x: number, y: number, rad: number): void => {
      W.shade.moveTo(x + rad, y);
      W.shade.arc(x, y, rad, 0, 7);
      const q = rad * 0.66;
      W.leaf.moveTo(x - 2 + q, y - 2);
      W.leaf.arc(x - 2, y - 2, q, 0, 7);
    };
    const clear = (x0: number, y0: number, x1: number, y1: number): boolean =>
      Math.hypot(Math.max(x0, Math.min(0, x1)), Math.max(y0, Math.min(0, y1))) > 250;
    for (let i = -9; i < 9; i++) {
      for (let j = -9; j < 9; j++) {
        const bx0 = i * G + (i === 0 ? AW : SW) + 22;
        const bx1 = (i + 1) * G - (i + 1 === 0 ? AW : SW) - 22;
        const by0 = j * G + (j === 0 ? AW : SW) + 22;
        const by1 = (j + 1) * G - (j + 1 === 0 ? AW : SW) - 22;
        if (r() < 0.15) {
          for (let n = 0; n < 26; n++) {
            const x = bx0 + 14 + r() * (bx1 - bx0 - 28);
            const y = by0 + 14 + r() * (by1 - by0 - 28);
            if (clear(x - 20, y - 20, x + 20, y + 20)) tree(x, y, 10 + r() * 9);
          }
          continue;
        }
        const rows = 2 + ((r() * 2) | 0);
        for (let a = 0; a < rows; a++) {
          const ry0 = by0 + ((by1 - by0) * a) / rows;
          const ry1 = by0 + ((by1 - by0) * (a + 1)) / rows;
          let x = bx0;
          while (x < bx1 - 40) {
            const wdt = Math.min(bx1 - x, 70 + r() * 110);
            const p = 6 + r() * 10;
            const x0 = x + p, x1 = x + wdt - p, y0 = ry0 + 6 + r() * 12, y1 = ry1 - 6 - r() * 12;
            if (r() < 0.12) {
              if (clear(x0, y0, x1, y1)) tree((x0 + x1) / 2, (y0 + y1) / 2, 12 + r() * 6);
            } else if (x1 - x0 > 20 && clear(x0, y0, x1, y1)) W.roofs[(r() * 4) | 0].rect(x0, y0, x1 - x0, y1 - y0);
            x += wdt;
          }
        }
        for (let n = 0; n < 4; n++) {
          const x = bx0 + r() * (bx1 - bx0);
          const y = r() < 0.5 ? by0 - 8 : by1 + 8;
          if (clear(x - 20, y - 20, x + 20, y + 20)) tree(x, y, 7 + r() * 5);
        }
      }
    }
    // Lamps as in `CityLights.addLamps`: alternating kerbs, ranked from your street (the bottom arm) outwards.
    for (let ai = 0; ai < 4; ai++) {
      const ang = (ai * Math.PI) / 2;
      const ox = Math.round(Math.cos(ang)), oy = Math.round(Math.sin(ang));
      const d0 = Math.abs(ai - 1);
      const rank = Math.min(d0, 4 - d0);
      let side = ai % 2 === 0 ? 1 : -1;
      let k = 0;
      for (let d = 214; d < 1600; d += 110) {
        const x = ox * d - oy * side * (AW + 10);
        const y = oy * d + ox * side * (AW + 10);
        W.lamps.push({ x, y, rank, k });
        W.poles.moveTo(x + 3, y);
        W.poles.arc(x, y, 3, 0, 7);
        side = -side;
        k++;
      }
    }
    for (let n = 0; n < 54; n++) {
      const ca = 8.5 + r() * 7.5;
      const ext = 230 * (H0 - ca);
      const ang = r() * Math.PI * 2;
      const dist = (0.15 + Math.sqrt(r())) * ext * 1.25;
      const rad = 70 + r() * 90;
      const m = 5 + ((r() * 4) | 0);
      const puffs = [];
      for (let q = 0; q < m; q++) puffs.push({ x: (r() - 0.5) * rad * 2.6, y: (r() - 0.5) * rad * 1.2, r: rad * (0.55 + r() * 0.6) });
      W.clouds.push({ ca, x: Math.cos(ang) * dist, y: Math.sin(ang) * dist, puffs, drift: 4 + r() * 6 });
    }
    W.clouds.sort((a, b) => a.ca - b.ca);
    this.world = W;
  }

  private tick(now: number): void {
    const dt = this.last === null ? 0 : Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    const w = this.root.clientWidth, h = this.root.clientHeight;
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.s1 = Math.min(w, h * 0.55) / 400;

    // Without a real progress the target creeps on by itself, ever slower, never arriving.
    const q = this.given ?? 1 - Math.exp(-this.t / 2.4);
    const done = this.doneAt !== null;
    const target = done && this.t > BootZoom.minFlight ? 1 : Math.min(0.88 * q, (0.88 * this.t) / BootZoom.minFlight);
    const k = done ? 30 : 12;
    const zeta = this.calm ? 1 : done ? 0.5 : 0.85;
    const c = 2 * zeta * Math.sqrt(k);
    for (let i = 0; i < 4; i++) {
      const d = dt / 4;
      this.v += (k * (target - this.z) - c * this.v) * d;
      this.z += this.v * d;
    }
    if (this.landed === null && done && this.t - this.doneAt! > 0.2 && this.z > 0.975) this.landed = this.t;
    const tt = this.landed === null ? -1 : this.t - this.landed;
    if (this.outcome === 'error' && tt > 0.15) {
      this.panel.style.opacity = '1';
      this.panel.style.transform = 'translate(-50%,-50%) scale(1)';
      this.panel.style.pointerEvents = 'auto';
    }
    if (this.resolveReady && tt > (this.outcome === 'night' ? BootZoom.revealNight : BootZoom.revealDay)) {
      this.resolveReady();
      this.resolveReady = null;
    }
    this.draw(tt);
  }

  private lampLevel(L: Lamp, age: number): [number, number] {
    const t = age - L.rank * 0.2 - L.k * 0.12;
    if (t <= 0) return [0, 0];
    if (t >= 0.34) return [1, 0];
    const flare = 1 - t / 0.34;
    if (this.calm) return [outCubic(t / 0.34), 0];
    if (t < 0.05) return [0.9, flare];
    if (t < 0.1) return [0, flare];
    return [outCubic((t - 0.1) / 0.24), flare];
  }

  private cars(tt: number, carsA: number): Car[] {
    if (carsA <= 0) return [];
    const tau = Math.max(0, tt - (this.outcome === 'night' ? 0.75 : 1.4));
    const travel = 0.5 * (tau - 0.6 * (1 - Math.exp(-tau / 0.6)));
    const out: Car[] = [];
    const ring: [number, RGB][] = [[0.4, [227, 230, 234]], [1.7, [138, 148, 161]], [2.9, [201, 188, 168]], [4.3, [191, 198, 207]], [5.4, [227, 230, 234]]];
    for (const [a0, col] of ring) {
      const a = a0 - travel;
      out.push({ x: Math.cos(a) * 150, y: Math.sin(a) * 150, ang: Math.atan2(-Math.cos(a), Math.sin(a)), col });
    }
    const queue: RGB[] = [[227, 230, 234], [47, 99, 224], [191, 198, 207], [201, 188, 168]];
    queue.forEach((col, i) => out.push({ x: 17, y: 222 + i * 46 + (1 - carsA) * 30, ang: -Math.PI / 2, col, front: i === 0 }));
    return out;
  }

  private car(c: Car, night: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.ang);
    ctx.fillStyle = 'rgba(5,7,10,0.47)';
    ctx.beginPath();
    ctx.roundRect(-15, -7.5, 34, 19, 5);
    ctx.fill();
    ctx.fillStyle = `rgb(${c.col.join(',')})`;
    ctx.beginPath();
    ctx.roundRect(-17, -9.5, 34, 19, 5);
    ctx.fill();
    ctx.fillStyle = '#2b3139';
    ctx.beginPath();
    ctx.roundRect(3, -7, 7, 14, 2);
    ctx.roundRect(-12, -6.5, 5, 13, 2);
    ctx.fill();
    ctx.fillStyle = night > 0.2 ? '#ff3b47' : '#9a3038';
    ctx.fillRect(-17, -8, 1.6, 3.5);
    ctx.fillRect(-17, 4.5, 1.6, 3.5);
    ctx.fillStyle = '#ffeed0';
    ctx.fillRect(15.6, -8, 1.4, 3.5);
    ctx.fillRect(15.6, 4.5, 1.4, 3.5);
    ctx.restore();
  }

  private draw(tt: number): void {
    const W = this.world, ctx = this.ctx, cv = this.canvas;
    const { w, h, dpr, s1 } = this;
    const o = this.outcome;
    const z = this.z;
    const alt = Math.exp((1 - z) * Math.log(H0));
    const sc = s1 / alt;
    const th = this.calm ? 0 : 0.6 * Math.pow(Math.max(0, 1 - z), 2);
    const cx = w / 2, cy = h / 2;
    const day = o === 'sunrise' && tt > 0 ? inOut(sat(tt / 2.4)) : 0;
    const carsA = o === 'error' || o === null || tt < 0 ? 0 : sat((tt - (o === 'night' ? 0.75 : 1.4)) / 0.6);
    const errA = o === 'error' && tt > 0 ? sat(tt / 0.5) : 0;
    const setW = (s: number): void => {
      const a = Math.cos(th) * s * dpr, b = Math.sin(th) * s * dpr;
      ctx.setTransform(a, b, -b, a, cx * dpr, cy * dpr);
    };
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = mix(C.ground, day);
    ctx.fillRect(0, 0, cv.width, cv.height);
    setW(sc);
    ctx.fillStyle = mix(C.street, day * 0.2);
    ctx.fill(W.streets);
    const sl = 4 + day * 4 + (o === 'sunrise' ? (1 - day) * 34 * sat(tt * 3) : 0);
    ctx.save();
    ctx.translate(o === 'sunrise' ? -sl : 3, o === 'sunrise' ? sl * 0.35 : 3);
    ctx.fillStyle = 'rgba(5,7,10,0.47)';
    W.roofs.forEach((p) => ctx.fill(p));
    ctx.fill(W.shade);
    ctx.restore();
    W.roofs.forEach((p, i) => {
      ctx.fillStyle = mix(C.roofs[i], day);
      ctx.fill(p);
    });
    ctx.fillStyle = mix(C.shade, day);
    ctx.fill(W.shade);
    ctx.fillStyle = mix(C.leaf, day);
    ctx.fill(W.leaf);
    ctx.fillStyle = 'rgb(35,40,47)';
    ctx.fill(W.roads);
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgb(27,32,40)';
    ctx.beginPath();
    ctx.arc(0, 0, R_OUT, 0, 7);
    ctx.stroke();
    ctx.fillStyle = 'rgb(18,21,25)';
    ctx.beginPath();
    ctx.arc(0, 0, R_IN, 0, 7);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = `rgba(255,183,3,${0.28 + (o === 'error' ? 0 : 0.2 * sat(tt))})`;
    ctx.beginPath();
    ctx.arc(0, 0, 106, 0, 7);
    ctx.stroke();
    if (errA > 0) {
      ctx.strokeStyle = `rgba(255,90,95,${0.55 * errA})`;
      ctx.beginPath();
      ctx.arc(0, 0, 106, 0, 7);
      ctx.stroke();
    }
    ctx.setLineDash([14, 18]);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgb(69,76,86)';
    ctx.stroke(W.marks);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgb(62,68,78)';
    ctx.fill(W.poles);
    if (errA > 0) {
      // The blockade of the old boot screen, across your street.
      ctx.save();
      ctx.globalAlpha = errA;
      ctx.translate(0, 206 - (1 - errA) * 10);
      ctx.fillStyle = '#e5484d';
      ctx.beginPath();
      ctx.roundRect(-AW + 4, -4, 2 * AW - 8, 9, 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (let x = -AW + 12; x < AW - 8; x += 16) ctx.fillRect(x, -4, 6, 9);
      ctx.restore();
    }
    const nightK = o === 'sunrise' ? 1 - day : 1;
    const cars = this.cars(tt, carsA);
    ctx.globalAlpha = carsA;
    cars.forEach((c) => this.car(c, nightK));
    ctx.globalAlpha = 1;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let base = 0.52;
    if (o === 'night' && tt > 0) base -= 0.1 * sstep(0, 1.6, tt);
    const g = ctx.createLinearGradient(w, 0, 0, h * 0.3);
    g.addColorStop(0, `rgba(3,5,10,${base * (1 - sat(day * 1.7))})`);
    g.addColorStop(1, `rgba(3,5,10,${base * (1 - sat(day * 1.7 - 0.7))})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const haze = 0.42 * sat(1 - z);
    if (haze > 0.005) {
      ctx.fillStyle = `rgba(20,26,38,${haze})`;
      ctx.fillRect(0, 0, w, h);
    }

    setW(sc);
    ctx.globalCompositeOperation = 'lighter';
    if (o === 'night' && tt > 0) {
      for (const L of W.lamps) {
        const [lv, fl] = this.lampLevel(L, tt);
        if (lv < 0.01 && fl < 0.01) continue;
        const gr = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, 90);
        gr.addColorStop(0, `rgba(255,238,208,${0.26 * lv})`);
        gr.addColorStop(0.45, `rgba(255,183,3,${0.09 * lv})`);
        gr.addColorStop(1, 'rgba(255,183,3,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(L.x, L.y, 90, 0, 7);
        ctx.fill();
        ctx.fillStyle = `rgba(255,238,208,${0.9 * lv})`;
        ctx.beginPath();
        ctx.arc(L.x, L.y, 2.6, 0, 7);
        ctx.fill();
        if (fl > 0.01) {
          ctx.fillStyle = `rgba(255,238,208,${0.35 * fl})`;
          ctx.beginPath();
          ctx.arc(L.x, L.y, 12, 0, 7);
          ctx.fill();
        }
      }
    }
    const beam = carsA * nightK;
    if (beam > 0.01) {
      for (const c of cars) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.ang);
        const lg = ctx.createLinearGradient(17, 0, 90, 0);
        lg.addColorStop(0, `rgba(255,238,208,${0.24 * beam})`);
        lg.addColorStop(1, 'rgba(255,238,208,0)');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(17, -8);
        ctx.lineTo(90, -28);
        ctx.lineTo(90, 28);
        ctx.lineTo(17, 8);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (o === 'sunrise' && day > 0) {
      const sx = w * 1.15, sy = h * (0.75 - 0.5 * day);
      const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * 1.6);
      const a = 0.3 * Math.sin(Math.PI * Math.min(1, day * 1.1)) + 0.05 * day;
      rg.addColorStop(0, `rgba(255,190,110,${a})`);
      rg.addColorStop(0.5, `rgba(255,150,80,${a * 0.4})`);
      rg.addColorStop(1, 'rgba(255,150,80,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }

    for (const cl of W.clouds) {
      const dh = alt - cl.ca;
      if (dh < 0.2) continue;
      const a = 0.6 * sstep(0.2, 1.5, dh);
      if (a < 0.01) continue;
      setW(s1 / dh);
      const ox = cl.x + this.t * cl.drift;
      for (const p of cl.puffs) {
        const x = ox + p.x, y = cl.y + p.y;
        const gr = ctx.createRadialGradient(x, y, 0, x, y, p.r);
        gr.addColorStop(0, `rgba(138,152,182,${0.55 * a})`);
        gr.addColorStop(0.55, `rgba(110,124,156,${0.28 * a})`);
        gr.addColorStop(1, 'rgba(110,124,156,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, 7);
        ctx.fill();
      }
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const vg = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.35, cx, cy, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(0,0,0,${0.45 * (1 - day * 0.6)})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
}
