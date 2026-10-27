import { baseConfig } from '../core/config';
import { Layout, armOutward } from '../core/roundabout';
import { type Vec2, v, add, mul, left, TAU } from '../core/vec2';
import { type Camera } from './render';
import { streetCamera } from './perspective';
import { MapTheme } from './mapThemes';
import { COLORS, css, type ColorToken } from './theme';

/**
 * The boot zoom (Leo, 27.10.2026): loading is one camera flight from just above the clouds down onto the
 * player's own roundabout. The flight is the progress bar: its height follows the loading progress on a damped
 * spring, and once the game is ready it lands exactly on the game's own camera, so the handover is seamless.
 * Night: the street lamps strike outwards from your street (`LampWave`), then cars, then the UI glides in.
 * Day: the sun rises from the east. A failed start lands too and the message stands inside the island.
 *
 *   const zoom = new BootZoom(boot, { tabInset, caption });
 *   zoom.progress(0.4);                      // optional, 0…1; without it the progress creeps on
 *   zoom.follow(() => shell.game.camera);    // optional: land on the live game camera
 *   await zoom.ready({ night, theme, money });
 *   zoom.fail(title, body, retryLabel, detail?);
 *   zoom.destroy();
 *
 * Reduce Motion: no turn, no overshoot; lamps and UI only fade.
 */

type Rgb = readonly [number, number, number, number];
type Lamp = { x: number; y: number; rank: number; k: number };
type Cloud = { ca: number; x: number; y: number; drift: number; puffs: { x: number; y: number; r: number }[] };
type Car = { x: number; y: number; heading: number; color: ColorToken };
type Outcome = 'night' | 'day' | 'error';
interface World {
  roads: Path2D; streets: Path2D; marks: Path2D; poles: Path2D; roofs: Path2D[]; shade: Path2D; leaf: Path2D;
  lamps: Lamp[]; clouds: Cloud[];
}

const HEIGHT = 18;
const TURN = 0.6;
const GRID = 560;
const REACH = 5200;
const CLEAR = 420;
const LAMP_GLOW = 90;
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
const mix = (a: ColorToken, b: ColorToken, t: number): string => {
  const [p, q]: [Rgb, Rgb] = [COLORS[a], COLORS[b]];
  return `rgb(${Math.round(p[0] + (q[0] - p[0]) * t)},${Math.round(p[1] + (q[1] - p[1]) * t)},${Math.round(p[2] + (q[2] - p[2]) * t)})`;
};
const glass = 'background:rgba(35,40,47,0.72);backdrop-filter:blur(20px) saturate(1.4);-webkit-backdrop-filter:blur(20px) saturate(1.4);';

export class BootZoom {
  /** Seconds the flight lasts at least, so a fast start still flies. */
  static readonly minFlight = 1.2;
  /** Seconds from the game being ready (≈2 s night, ≈3 s day) until the boot screen may fade over the real scene. */
  static readonly revealNight = 1.4;
  static readonly revealDay = 2.4;
  /** The camera is on its way down for this long after ready; the show below runs on from there. */
  private static readonly approach = 0.6;
  private static readonly lampsAt = 0;
  private static readonly carsAt = { night: 0.4, day: 1 };
  private static readonly uiAt = { night: 0.8, day: 1.5 };

  private readonly root = document.createElement('div');
  private readonly canvas = document.createElement('canvas');
  private readonly ctx = this.canvas.getContext('2d')!;
  private readonly caption = document.createElement('div');
  private readonly panel = document.createElement('div');
  private readonly calm = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced';
  private readonly layout = new Layout(baseConfig);
  private readonly world: World;
  private readonly tabInset: number;
  private raf = 0;
  private last: number | null = null;
  private t = 0;
  private z = 0;
  private vel = 0;
  private given: number | null = null;
  private live: (() => Camera | null) | null = null;
  private outcome: Outcome | null = null;
  private doneAt = 0;
  private resolveReady: (() => void) | null = null;
  private ui: HTMLElement[] = [];
  private uiShown = false;
  private theme: MapTheme | null = null;
  private size = v(0, 0);
  private home: Camera | null = null;

  constructor(host: HTMLElement, { tabInset = 0, caption = '' }: { tabInset?: number; caption?: string } = {}) {
    this.tabInset = tabInset;
    this.root.className = 'boot-zoom';
    this.root.style.cssText = `position:absolute;inset:0;overflow:hidden;background:${css('background')}`;
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.caption.className = 'boot-zoom-text';
    this.caption.style.cssText = `position:absolute;left:0;right:0;bottom:calc(env(safe-area-inset-bottom,0px) + 32px);text-align:center;font-size:13px;line-height:16px;letter-spacing:0.02em;color:${css('muted')};transition:opacity 300ms cubic-bezier(0.23,1,0.32,1)`;
    this.caption.textContent = caption;
    this.panel.setAttribute('role', 'alert');
    this.panel.style.cssText =
      'position:absolute;left:0;top:0;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;opacity:0;pointer-events:none;' +
      'transition:opacity 450ms cubic-bezier(0.23,1,0.32,1)';
    this.root.append(this.canvas, this.caption, this.panel);
    host.prepend(this.root);
    this.world = this.build();
    const frame = (now: number): void => {
      this.tick(now);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  /** The real loading progress, 0…1 (optional). */
  progress(p: number): void {
    this.given = sat(p);
  }

  /** Where the game's own camera is, so the landing meets it even while it still glides in. */
  follow(camera: () => Camera | null): void {
    this.live = camera;
  }

  /** The game is ready: land, play the reveal, resolve when the boot screen may fade over the scene. */
  ready({ night, theme, money }: { night: boolean; theme: MapTheme | null; money?: string }): Promise<void> {
    if (this.outcome) return Promise.resolve();
    this.outcome = night ? 'night' : 'day';
    this.theme = theme;
    this.doneAt = this.t;
    this.mountUi(money);
    return new Promise((resolve) => (this.resolveReady = resolve));
  }

  /** The start failed: land and show the message inside the island; the city stays dark and empty. */
  fail(title: string, body: string, retry: string, detail?: string): void {
    if (this.outcome === 'error') return;
    this.outcome = 'error';
    this.doneAt = this.t;
    this.resolveReady?.();
    this.resolveReady = null;
    this.panel.replaceChildren();
    const add = (tag: string, css: string, text: string): HTMLElement => {
      const el = document.createElement(tag);
      el.style.cssText = css;
      el.textContent = text;
      this.panel.append(el);
      return el;
    };
    add('strong', `font:800 17px/1.15 'Overpass Variable',ui-rounded,system-ui,sans-serif;color:${css('primary')};text-wrap:balance`, title);
    add('span', `font-size:13px;line-height:1.4;color:${css('muted')};text-wrap:pretty`, body);
    if (detail) add('span', `font:500 11px/1.4 ui-monospace,'SF Mono',Menlo,monospace;color:${css('muted')}`, detail);
    const retryLink = add('a', `margin-top:6px;display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 20px;border-radius:14px;background:${css('accent')};color:${css('background')};font-weight:600;font-size:15px;text-decoration:none`, retry) as HTMLAnchorElement;
    retryLink.href = '';
  }

  /** Stops drawing and removes itself (after the boot screen has faded). */
  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.root.remove();
  }

  /** The tab bar is the real one, copied, so the glide ends exactly where the live one stands; the top chip stands for the game's values. */
  private mountUi(money?: string): void {
    const tabs = document.querySelector<HTMLElement>('.app:not([data-tabbar="hidden"]) .tabbar');
    const slot = (html: HTMLElement | null, hide: string): void => {
      if (!html) return;
      const wrap = document.createElement('div');
      wrap.setAttribute('aria-hidden', 'true');
      wrap.style.cssText = `position:absolute;inset:0;pointer-events:none;opacity:0;transform:${this.calm ? 'none' : hide};transition:opacity 350ms cubic-bezier(0.23,1,0.32,1),transform 650ms cubic-bezier(0.34,1.3,0.64,1)`;
      wrap.append(html);
      this.root.append(wrap);
      this.ui.push(wrap);
    };
    if (tabs) {
      const copy = tabs.cloneNode(true) as HTMLElement;
      copy.removeAttribute('id');
      slot(copy, 'translateY(120px)');
    }
    if (money) {
      const chip = document.createElement('div');
      chip.style.cssText = `position:absolute;top:calc(env(safe-area-inset-top,0px) + 16px);left:50%;translate:-50% 0;padding:8px 16px;border-radius:999px;${glass}font:600 15px/1 ui-rounded,system-ui,sans-serif;font-variant-numeric:tabular-nums;color:${css('primary')}`;
      chip.textContent = money;
      slot(chip, 'translateY(-90px)');
    }
  }

  private build(): World {
    const r = rng(11);
    const L = this.layout;
    const lane = L.laneWidth;
    const roadHalf = lane;
    const W: World = {
      roads: new Path2D(), streets: new Path2D(), marks: new Path2D(), poles: new Path2D(),
      roofs: [0, 1, 2, 3].map(() => new Path2D()), shade: new Path2D(), leaf: new Path2D(), lamps: [], clouds: [],
    };
    const ringEdge = L.ringRadius + lane / 2;
    W.roads.moveTo(ringEdge, 0);
    W.roads.arc(0, 0, ringEdge, 0, TAU);
    for (const arm of L.arms) {
      const out = armOutward(arm);
      const side = left(out);
      const [a, b, c, d] = [add(mul(out, ringEdge - 4), mul(side, roadHalf)), add(mul(out, REACH), mul(side, roadHalf)), add(mul(out, REACH), mul(side, -roadHalf)), add(mul(out, ringEdge - 4), mul(side, -roadHalf))];
      W.roads.moveTo(a.x, a.y);
      for (const p of [b, c, d]) W.roads.lineTo(p.x, p.y);
      W.roads.closePath();
      W.marks.moveTo(out.x * (ringEdge + lane), out.y * (ringEdge + lane));
      W.marks.lineTo(out.x * REACH, out.y * REACH);
      // Lamps as in `CityLights.addLamps`: alternating kerbs, ranked from your street outwards.
      const n = L.arms.length;
      const gap = Math.abs(arm.index - L.player.index);
      const rank = Math.min(gap, n - gap);
      let kerb = arm.slot % 2 === 0 ? 1 : -1;
      let k = 0;
      for (let dist = L.ringRadius + lane + 30; dist < L.ringRadius + 360; dist += 110) {
        const at = add(mul(out, dist), mul(side, kerb * (lane + 10)));
        W.lamps.push({ x: at.x, y: at.y, rank, k });
        W.poles.moveTo(at.x + 2, at.y);
        W.poles.arc(at.x, at.y, 2, 0, TAU);
        kerb = -kerb;
        k++;
      }
    }
    W.marks.moveTo(L.ringRadius, 0);
    W.marks.arc(0, 0, L.ringRadius, 0, TAU);
    const sw = 20;
    for (let k = -9; k <= 9; k++) {
      if (!k) continue;
      W.streets.rect(k * GRID - sw, -REACH, 2 * sw, 2 * REACH);
      W.streets.rect(-REACH, k * GRID - sw, 2 * REACH, 2 * sw);
    }
    const tree = (x: number, y: number, rad: number): void => {
      W.shade.moveTo(x + rad, y);
      W.shade.arc(x, y, rad, 0, TAU);
      const q = rad * 0.66;
      W.leaf.moveTo(x - 2 + q, y - 2);
      W.leaf.arc(x - 2, y - 2, q, 0, TAU);
    };
    // The plaza around the roundabout stays free: it is what the game shows at the landing.
    const free = (x0: number, y0: number, x1: number, y1: number): boolean =>
      Math.hypot(Math.max(x0, Math.min(0, x1)), Math.max(y0, Math.min(0, y1))) > CLEAR;
    for (let i = -9; i < 9; i++) {
      for (let j = -9; j < 9; j++) {
        const bx0 = i * GRID + (i === 0 ? roadHalf : sw) + 22;
        const bx1 = (i + 1) * GRID - (i + 1 === 0 ? roadHalf : sw) - 22;
        const by0 = j * GRID + (j === 0 ? roadHalf : sw) + 22;
        const by1 = (j + 1) * GRID - (j + 1 === 0 ? roadHalf : sw) - 22;
        if (r() < 0.15) {
          for (let n = 0; n < 26; n++) {
            const x = bx0 + 14 + r() * (bx1 - bx0 - 28);
            const y = by0 + 14 + r() * (by1 - by0 - 28);
            if (free(x - 20, y - 20, x + 20, y + 20)) tree(x, y, 10 + r() * 9);
          }
          continue;
        }
        const rows = 2 + ((r() * 2) | 0);
        for (let a = 0; a < rows; a++) {
          const ry0 = by0 + ((by1 - by0) * a) / rows;
          const ry1 = by0 + ((by1 - by0) * (a + 1)) / rows;
          let x = bx0;
          while (x < bx1 - 40) {
            const width = Math.min(bx1 - x, 70 + r() * 110);
            const pad = 6 + r() * 10;
            const x0 = x + pad, x1 = x + width - pad, y0 = ry0 + 6 + r() * 12, y1 = ry1 - 6 - r() * 12;
            if (r() < 0.12) {
              if (free(x0, y0, x1, y1)) tree((x0 + x1) / 2, (y0 + y1) / 2, 12 + r() * 6);
            } else if (x1 - x0 > 20 && free(x0, y0, x1, y1)) W.roofs[(r() * 4) | 0].rect(x0, y0, x1 - x0, y1 - y0);
            x += width;
          }
        }
        for (let n = 0; n < 4; n++) {
          const x = bx0 + r() * (bx1 - bx0);
          const y = r() < 0.5 ? by0 - 8 : by1 + 8;
          if (free(x - 20, y - 20, x + 20, y + 20)) tree(x, y, 7 + r() * 5);
        }
      }
    }
    for (let n = 0; n < 48; n++) {
      const ca = 8.5 + r() * 7.5;
      const reach = 400 * (HEIGHT - ca);
      const angle = r() * TAU;
      const dist = (0.1 + Math.sqrt(r())) * reach;
      const rad = 120 + r() * 180;
      const puffs = Array.from({ length: 6 + ((r() * 3) | 0) }, () => ({ x: (r() - 0.5) * rad * 2.6, y: (r() - 0.5) * rad * 1.2, r: rad * (0.55 + r() * 0.6) }));
      W.clouds.push({ ca, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, puffs, drift: 6 + r() * 10 });
    }
    W.clouds.sort((a, b) => a.ca - b.ca);
    return W;
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
    this.size = v(w, h);
    this.home = this.live?.() ?? streetCamera(this.layout, this.size, this.tabInset);

    // Height follows progress on a damped spring, never linear and never past 88 % before the game is ready.
    const done = this.outcome !== null;
    const creep = this.given ?? 1 - Math.exp(-this.t / 2.4);
    const target = done && this.t - this.doneAt > 0 && this.t > BootZoom.minFlight ? 1 : Math.min(0.88 * creep, (0.88 * this.t) / BootZoom.minFlight);
    const k = done ? 30 : 12;
    const damping = 2 * (this.calm ? 1 : done ? 0.5 : 0.85) * Math.sqrt(k);
    for (let i = 0; i < 4; i++) {
      this.vel += (k * (target - this.z) - damping * this.vel) * (dt / 4);
      this.z += this.vel * (dt / 4);
    }
    if (done && this.t - this.doneAt > 1.8) {
      this.z = 1;
      this.vel = 0;
    }
    const tt = done ? this.t - this.doneAt - BootZoom.approach : -1;
    const o = this.outcome;
    this.caption.style.opacity = done ? '0' : '1';
    if (o === 'error') this.placePanel(tt);
    if (!this.uiShown && o && o !== 'error' && tt > BootZoom.uiAt[o]) {
      this.uiShown = true;
      for (const el of this.ui) {
        el.style.opacity = '1';
        el.style.transform = 'none';
      }
    }
    if (this.resolveReady && o && o !== 'error' && tt > (o === 'night' ? BootZoom.revealNight : BootZoom.revealDay)) {
      this.resolveReady();
      this.resolveReady = null;
    }
    this.draw(tt, dpr);
  }

  /** Inside the island, on the live home camera. */
  private placePanel(tt: number): void {
    const cam = this.home!;
    const s = cam.scale;
    const origin = this.origin(cam);
    this.panel.style.width = `${Math.round(this.layout.islandRadius * s * 1.45)}px`;
    this.panel.style.transform = `translate(${origin.x}px,${origin.y}px) translate(-50%,-50%)`;
    const shown = tt > 0.15;
    this.panel.style.opacity = shown ? '1' : '0';
    this.panel.style.pointerEvents = shown ? 'auto' : 'none';
  }

  /** Where the roundabout's centre stands on the screen for a camera. */
  private origin(cam: Camera): Vec2 {
    return v(cam.focus.x - cam.center.x * cam.scale, cam.focus.y + cam.center.y * cam.scale);
  }

  private lamp(l: Lamp, age: number): [number, number] {
    const t = age - l.rank * 0.2 - l.k * 0.12;
    if (t <= 0) return [0, 0];
    if (t >= 0.34) return [1, 0];
    if (this.calm) return [outCubic(t / 0.34), 0];
    const flare = 1 - t / 0.34;
    if (t < 0.05) return [0.9, flare];
    if (t < 0.1) return [0, flare];
    return [outCubic((t - 0.1) / 0.24), flare];
  }

  private cars(tt: number, alpha: number): Car[] {
    if (alpha <= 0) return [];
    const L = this.layout;
    const tau = Math.max(0, tt - BootZoom.carsAt[this.outcome === 'night' ? 'night' : 'day']);
    const travel = 0.5 * (tau - 0.6 * (1 - Math.exp(-tau / 0.6)));
    const out: Car[] = [];
    const ring: [number, ColorToken][] = [[0.4, 'vehicleCar'], [1.7, 'vehicleCarGraphite'], [2.9, 'vehicleCarSand'], [4.3, 'vehicleCarSilver'], [5.4, 'vehicleCar']];
    for (const [a0, color] of ring) {
      const a = a0 - travel;
      out.push({ x: Math.cos(a) * L.ringRadius, y: Math.sin(a) * L.ringRadius, heading: a + Math.PI / 2, color });
    }
    const queue: ColorToken[] = ['vehicleCar', 'vehiclePolice', 'vehicleCarSilver', 'vehicleCarSand'];
    queue.forEach((color, slot) => {
      const pose = L.queuePose(slot);
      const back = mul(armOutward(L.player), (1 - alpha) * 40);
      out.push({ x: pose.position.x + back.x, y: pose.position.y + back.y, heading: pose.heading, color });
    });
    return out;
  }

  private car(c: Car, night: number): void {
    const ctx = this.ctx;
    const len = baseConfig.carLength, wid = baseConfig.carWidth;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.heading);
    ctx.fillStyle = css('night', 0.47);
    ctx.beginPath();
    ctx.roundRect(-len / 2 + 2, -wid / 2 - 2, len, wid, 3);
    ctx.fill();
    ctx.fillStyle = css(c.color);
    ctx.beginPath();
    ctx.roundRect(-len / 2, -wid / 2, len, wid, 3);
    ctx.fill();
    ctx.fillStyle = css('vehicleGlass');
    ctx.beginPath();
    ctx.roundRect(len * 0.06, -wid / 2 + 1.6, len * 0.22, wid - 3.2, 1.5);
    ctx.roundRect(-len * 0.32, -wid / 2 + 1.8, len * 0.16, wid - 3.6, 1.5);
    ctx.fill();
    ctx.fillStyle = css('lightRed', night > 0.2 ? 1 : 0.6);
    ctx.fillRect(-len / 2, -wid / 2 + 0.8, 1.2, 2.6);
    ctx.fillRect(-len / 2, wid / 2 - 3.4, 1.2, 2.6);
    ctx.fillStyle = css('headlight');
    ctx.fillRect(len / 2 - 1.2, -wid / 2 + 0.8, 1.2, 2.6);
    ctx.fillRect(len / 2 - 1.2, wid / 2 - 3.4, 1.2, 2.6);
    ctx.restore();
  }

  private draw(tt: number, dpr: number): void {
    const { world: W, ctx, canvas: cv, layout: L } = this;
    const { x: w, y: h } = this.size;
    const cam = this.home!;
    const o = this.outcome;
    const z = this.z;
    const alt = Math.exp((1 - z) * Math.log(HEIGHT));
    const base = this.origin(cam);
    const at = v(w / 2 + (base.x - w / 2) * z, h / 2 + (base.y - h / 2) * z);
    const s0 = cam.scale;
    const turn = this.calm ? 0 : TURN * Math.pow(Math.max(0, 1 - z), 2);
    const dayTheme = MapTheme.isDay(this.theme);
    const sun = o === 'day' && tt > 0 ? inOut(sat(tt / 2.4)) : 0;
    const tone = dayTheme ? sun : 0;
    const carsA = !o || o === 'error' || tt < 0 ? 0 : sat((tt - BootZoom.carsAt[o]) / 0.6);
    const errA = o === 'error' && tt > 0 ? sat(tt / 0.5) : 0;
    const world = (s: number): void => {
      const a = Math.cos(turn) * s * dpr, b = Math.sin(turn) * s * dpr;
      ctx.setTransform(a, b, b, -a, at.x * dpr, at.y * dpr);
    };
    const screen = (): void => ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const roofs = MapTheme.roofs(this.theme);
    const night = MapTheme.roofs(null);
    const ground = MapTheme.ground(this.theme);

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = mix('background', ground, tone);
    ctx.fillRect(0, 0, cv.width, cv.height);
    world(s0 / alt);
    ctx.fillStyle = css('kerb');
    ctx.fill(W.streets);
    // Morning shadows fall long towards the west and shorten as the sun climbs.
    const shadow = 4 + (o === 'day' ? (1 - sun) * 34 * sat(tt * 3) : 0);
    ctx.save();
    ctx.translate(o === 'day' ? -shadow : 3, o === 'day' ? shadow * 0.35 : -3);
    ctx.fillStyle = css('night', 0.47);
    W.roofs.forEach((p) => ctx.fill(p));
    ctx.fill(W.shade);
    ctx.restore();
    W.roofs.forEach((p, i) => {
      ctx.fillStyle = mix(night[i], roofs[i], tone);
      ctx.fill(p);
    });
    ctx.fillStyle = mix('treeShade', 'treeLeaf', tone);
    ctx.fill(W.shade);
    ctx.fillStyle = mix('treeLeaf', 'treeLight', tone);
    ctx.fill(W.leaf);
    ctx.fillStyle = css('surface');
    ctx.fill(W.roads);
    ctx.lineWidth = 5;
    ctx.strokeStyle = css('kerb');
    ctx.beginPath();
    ctx.arc(0, 0, L.ringRadius + L.laneWidth / 2, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = css('island');
    ctx.beginPath();
    ctx.arc(0, 0, L.islandRadius, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = css('accent', 0.28 + (o === 'error' ? 0 : 0.2 * sat(tt)));
    ctx.beginPath();
    ctx.arc(0, 0, L.islandRadius - 8, 0, TAU);
    ctx.stroke();
    if (errA > 0) {
      ctx.strokeStyle = css('destructive', 0.55 * errA);
      ctx.stroke();
    }
    ctx.setLineDash([14, 18]);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = css('marking');
    ctx.stroke(W.marks);
    ctx.setLineDash([]);
    ctx.fillStyle = css('marking');
    ctx.fill(W.poles);
    if (errA > 0) {
      // A red-white barrier across your street.
      const arm = L.player;
      const out = armOutward(arm);
      const pos = mul(out, L.stopDistance + 14);
      ctx.save();
      ctx.globalAlpha = errA;
      ctx.translate(pos.x - out.x * (1 - errA) * 10, pos.y - out.y * (1 - errA) * 10);
      ctx.rotate(arm.angle + Math.PI / 2);
      ctx.fillStyle = css('destructive');
      ctx.beginPath();
      ctx.roundRect(-L.laneWidth + 2, -4.5, 2 * L.laneWidth - 4, 9, 2);
      ctx.fill();
      ctx.fillStyle = css('primary');
      for (let x = -L.laneWidth + 8; x < L.laneWidth - 8; x += 16) ctx.fillRect(x, -4.5, 6, 9);
      ctx.restore();
    }
    const dusk = o === 'day' ? 1 - sun : 1;
    const cars = this.cars(tt, carsA);
    ctx.globalAlpha = carsA;
    cars.forEach((c) => this.car(c, dusk));
    ctx.globalAlpha = 1;

    // The dark of the night over everything, clearing from the east in the morning.
    screen();
    const dark = o === 'night' && tt > 0 ? 0.52 - 0.27 * sstep(0, 1.8, tt) : 0.52;
    const g = ctx.createLinearGradient(w, 0, 0, h * 0.3);
    g.addColorStop(0, css('night', dark * (1 - sat(sun * 1.7))));
    g.addColorStop(1, css('night', dark * (1 - sat(sun * 1.7 - 0.7))));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const haze = 0.42 * sat(1 - z);
    if (haze > 0.005) {
      ctx.fillStyle = css('background', haze);
      ctx.fillRect(0, 0, w, h);
    }

    world(s0 / alt);
    ctx.globalCompositeOperation = 'lighter';
    // The game's lamps stand in a day without a map skin too, but settle to their resting glow once lit.
    const lampsOn = o === 'night' || (o === 'day' && !this.theme);
    if (lampsOn && tt > BootZoom.lampsAt) {
      const settle = o === 'day' ? 1 - 0.6 * sstep(1.6, 3.2, tt) : 1;
      for (const l of W.lamps) {
        const [raw, flare] = this.lamp(l, tt - BootZoom.lampsAt);
        const level = raw * settle;
        if (level < 0.01 && flare < 0.01) continue;
        const gr = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, LAMP_GLOW);
        gr.addColorStop(0, css('headlight', 0.26 * level));
        gr.addColorStop(0.45, css('accent', 0.09 * level));
        gr.addColorStop(1, css('accent', 0));
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(l.x, l.y, LAMP_GLOW, 0, TAU);
        ctx.fill();
        ctx.fillStyle = css('headlight', 0.9 * level);
        ctx.beginPath();
        ctx.arc(l.x, l.y, 2.6, 0, TAU);
        ctx.fill();
        if (flare > 0.01) {
          ctx.fillStyle = css('headlight', 0.35 * flare);
          ctx.beginPath();
          ctx.arc(l.x, l.y, 12, 0, TAU);
          ctx.fill();
        }
      }
    }
    const beam = carsA * dusk;
    if (beam > 0.01) {
      const reach = baseConfig.carLength * 3.5;
      for (const c of cars) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.heading);
        const front = baseConfig.carLength / 2;
        const lg = ctx.createLinearGradient(front, 0, reach, 0);
        lg.addColorStop(0, css('headlight', 0.24 * beam));
        lg.addColorStop(1, css('headlight', 0));
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(front, -baseConfig.carWidth / 2);
        ctx.lineTo(reach, -baseConfig.carWidth * 2);
        ctx.lineTo(reach, baseConfig.carWidth * 2);
        ctx.lineTo(front, baseConfig.carWidth / 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    if (o === 'day' && sun > 0) {
      screen();
      const sx = w * 1.15, sy = h * (0.75 - 0.5 * sun);
      const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * 1.6);
      const a = 0.16 * Math.sin(Math.PI * Math.min(1, sun * 1.1)) + 0.03 * sun;
      rg.addColorStop(0, css('accent', a));
      rg.addColorStop(0.5, css('accent', a * 0.4));
      rg.addColorStop(1, css('accent', 0));
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
      world(s0 / dh);
      const ox = cl.x + this.t * cl.drift;
      for (const p of cl.puffs) {
        const x = ox + p.x, y = cl.y + p.y;
        const gr = ctx.createRadialGradient(x, y, 0, x, y, p.r);
        gr.addColorStop(0, `rgba(138,152,182,${0.55 * a})`);
        gr.addColorStop(0.55, `rgba(110,124,156,${0.28 * a})`);
        gr.addColorStop(1, 'rgba(110,124,156,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, TAU);
        ctx.fill();
      }
    }

    screen();
    const edge = o && o !== 'error' && tt > 0 ? sstep(0, 1.8, tt) : 0;
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(0,0,0,${0.45 * (1 - edge)})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
}
