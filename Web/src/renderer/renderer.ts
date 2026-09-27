import type { World } from '../core/world';
import type { Vehicle } from '../core/vehicle';
import type { SkinLook } from '../core/loot';
import { type Vec2, v, lerpV, angleDelta, fromAngle, add, mul, TAU, length, sub } from '../core/vec2';
import { Rng } from '../core/rng';
import { secureZone, criminalTimeLeft } from '../core/specials';
import { drawVehicle } from './carArt';
import { THEME, type Effects } from './effects';

export interface IslandText {
  title: string;
  sub?: string;
  /** Big multiplier style instead of a sentence. */
  big?: boolean;
  color?: string;
  /** Seconds since the combo tier changed, for the spring on the multiplier. */
  pulse?: number;
  glow?: boolean;
}

export interface FrameState {
  world: World;
  alpha: number;
  time: number;
  effects: Effects;
  skins: SkinLook[];
  island: IslandText | null;
  reduceMotion: boolean;
  /** 0…1: the result banner dims the scene a little. */
  dim: number;
}

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  tone: number;
}

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Rounded", "SF Pro Display", system-ui, "Segoe UI", Roboto, sans-serif';

/** Draws the scene on a 2D canvas: world space is y-up, like GameCore. */
export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly staticCanvas = document.createElement('canvas');
  private staticKey = '';
  private blocks: Block[] = [];
  private blocksFor = -1;
  private dpr = 1;
  private width = 0;
  private height = 0;
  /** Current camera: screen = (ox + x * s, oy - y * s), in CSS px. */
  scale = 1;
  ox = 0;
  oy = 0;
  private insetTop = 96;
  private insetBottom = 24;
  private targetTop = 96;
  private targetBottom = 24;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D is not available');
    this.ctx = ctx;
  }

  resize(width: number, height: number): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.staticCanvas.width = this.canvas.width;
    this.staticCanvas.height = this.canvas.height;
    this.staticKey = '';
  }

  /** Room the HUD (top) and the tab bar (bottom) take; the camera glides to fit around it. */
  setInsets(top: number, bottom: number, immediate = false): void {
    this.targetTop = top;
    this.targetBottom = bottom;
    if (immediate) {
      this.insetTop = top;
      this.insetBottom = bottom;
    }
  }

  worldToScreen(p: Vec2): Vec2 {
    return v(this.ox + p.x * this.scale, this.oy - p.y * this.scale);
  }

  private updateCamera(world: World, dt: number): void {
    const k = 1 - Math.exp(-dt * 10);
    this.insetTop += (this.targetTop - this.insetTop) * k;
    this.insetBottom += (this.targetBottom - this.insetBottom) * k;
    if (Math.abs(this.insetTop - this.targetTop) < 0.3) this.insetTop = this.targetTop;
    if (Math.abs(this.insetBottom - this.targetBottom) < 0.3) this.insetBottom = this.targetBottom;
    const b = world.layout.viewBounds;
    const side = 12;
    const availW = Math.max(100, this.width - side * 2);
    const availH = Math.max(100, this.height - this.insetTop - this.insetBottom);
    const s = Math.min(availW / (b.maxX - b.minX), availH / (b.maxY - b.minY));
    const cx = this.width / 2;
    const cy = this.insetTop + availH / 2;
    this.scale = s;
    this.ox = cx - ((b.minX + b.maxX) / 2) * s;
    this.oy = cy + ((b.minY + b.maxY) / 2) * s;
  }

  render(f: FrameState, dt: number): void {
    const { world } = f;
    const ctx = this.ctx;
    this.updateCamera(world, dt);
    this.ensureStatic(world);
    const shake = f.effects.shakeOffset();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (shake.x !== 0 || shake.y !== 0) {
      ctx.fillStyle = THEME.background;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    ctx.drawImage(this.staticCanvas, shake.x * this.dpr, shake.y * this.dpr);

    // World space.
    const s = this.scale * this.dpr;
    ctx.setTransform(s, 0, 0, -s, (this.ox + shake.x) * this.dpr, (this.oy + shake.y) * this.dpr);

    this.drawSecureZone(world, f.time);
    this.drawScorches(f.effects);
    this.drawParticles(f.effects, 'under');

    // Wrecks lie under the traffic so they never hide a gap.
    const wrecks = world.vehicles.filter((x) => x.isCrashed);
    const live = world.vehicles.filter((x) => !x.isCrashed);
    for (const veh of wrecks) this.drawOne(world, veh, f);
    for (const veh of live) this.drawOne(world, veh, f);
    this.drawPickupCountdown(world, f.alpha);
    this.drawParticles(f.effects, 'over');

    // Screen space.
    ctx.setTransform(this.dpr, 0, 0, this.dpr, shake.x * this.dpr, shake.y * this.dpr);
    this.drawWarnings(world, f.time);
    if (f.dim > 0) {
      ctx.fillStyle = `rgba(11,13,16,${0.35 * f.dim})`;
      ctx.fillRect(-20, -20, this.width + 40, this.height + 40);
    }
    this.drawIsland(world, f.island, f.reduceMotion);
    this.drawPopups(f.effects);
  }

  // MARK: Static layer

  private ensureStatic(world: World): void {
    const key = `${this.width}x${this.height}@${this.dpr}|${this.scale.toFixed(4)}|${this.ox.toFixed(2)}|${this.oy.toFixed(2)}|${world.layout.ringRadius}`;
    if (key === this.staticKey) return;
    this.staticKey = key;
    const ctx = this.staticCanvas.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = THEME.background;
    ctx.fillRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);
    const s = this.scale * this.dpr;
    // A margin so screen shake never shows an edge.
    ctx.setTransform(s, 0, 0, -s, this.ox * this.dpr, this.oy * this.dpr);
    this.drawCity(ctx, world);
    this.drawRoads(ctx, world);
  }

  private drawCity(ctx: CanvasRenderingContext2D, world: World): void {
    const layout = world.layout;
    if (this.blocksFor !== layout.ringRadius) {
      this.blocksFor = layout.ringRadius;
      this.blocks = [];
      const rng = new Rng(20260927);
      const cell = 46;
      const clearRing = layout.ringRadius + layout.laneWidth / 2 + 26;
      for (let gx = -16; gx <= 16; gx++) {
        for (let gy = -18; gy <= 16; gy++) {
          const w = cell * (0.55 + rng.unit() * 0.3);
          const h = cell * (0.55 + rng.unit() * 0.3);
          const x = gx * cell + (rng.unit() - 0.5) * 8;
          const y = gy * cell + (rng.unit() - 0.5) * 8;
          const c = v(x, y);
          const reach = Math.max(w, h) * 0.72;
          if (length(c) < clearRing + reach) continue;
          // Keep the arms and their verges free.
          const nearArm = layout.arms.some((arm) => {
            const dir = fromAngle(arm.angle);
            const along = c.x * dir.x + c.y * dir.y;
            const across = Math.abs(c.x * -dir.y + c.y * dir.x);
            return along > 0 && across < layout.laneWidth + 16 + reach;
          });
          if (nearArm || rng.unit() < 0.18) continue;
          this.blocks.push({ x: x - w / 2, y: y - h / 2, w, h, tone: rng.unit() });
        }
      }
    }
    for (const b of this.blocks) {
      ctx.fillStyle = b.tone > 0.7 ? '#141920' : b.tone > 0.35 ? THEME.block : '#101419';
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 3);
      ctx.fill();
      ctx.strokeStyle = THEME.blockEdge;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      if (b.tone > 0.82) {
        // A lit window here and there: the city is awake.
        ctx.fillStyle = 'rgba(255,214,150,0.08)';
        ctx.fillRect(b.x + b.w * 0.2, b.y + b.h * 0.25, b.w * 0.18, b.h * 0.14);
      }
    }
  }

  private drawRoads(ctx: CanvasRenderingContext2D, world: World): void {
    const layout = world.layout;
    const R = layout.ringRadius;
    const lane = layout.laneWidth;
    const far = 1600;
    ctx.lineCap = 'butt';

    // Kerbs first (a little wider), then the asphalt.
    for (const pass of [0, 1]) {
      const extra = pass === 0 ? 5 : 0;
      ctx.strokeStyle = pass === 0 ? THEME.kerb : THEME.surface;
      for (const arm of layout.arms) {
        const dir = fromAngle(arm.angle);
        const a = mul(dir, R);
        const b = mul(dir, far);
        ctx.lineWidth = lane * 2 + 2 + extra * 2;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.lineWidth = lane + 4 + extra * 2;
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, TAU);
      ctx.stroke();
      // Entry and exit curves fill the corners of each junction.
      ctx.lineWidth = lane + extra * 2;
      for (let i = 0; i < layout.arms.length; i++) {
        for (const path of [layout.entries[i], layout.exits[i]]) {
          ctx.beginPath();
          const steps = 24;
          const end = Math.min(path.length, layout.stopDistance);
          for (let k = 0; k <= steps; k++) {
            const p = path.point((end * k) / steps);
            if (k === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
        }
      }
    }

    // Island with its kerb.
    const islandR = R - lane / 2 - 2;
    ctx.fillStyle = THEME.kerb;
    ctx.beginPath();
    ctx.arc(0, 0, islandR, 0, TAU);
    ctx.fill();
    ctx.fillStyle = THEME.island;
    ctx.beginPath();
    ctx.arc(0, 0, islandR - 4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = THEME.islandEdge;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, islandR - 14, 0, TAU);
    ctx.stroke();

    // Markings: ring edge lines, arm centre lines, stop lines.
    ctx.strokeStyle = THEME.marking;
    ctx.lineWidth = 0.9;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(0, 0, R + lane / 2 - 1.5, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, R - lane / 2 + 1.5, 0, TAU);
    ctx.stroke();
    for (const arm of layout.arms) {
      const dir = fromAngle(arm.angle);
      const side = v(dir.y, -dir.x);
      const start = mul(dir, layout.stopDistance - 2);
      const end = mul(dir, far);
      ctx.setLineDash([7, 7]);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.setLineDash([]);
      // Stop line across the entry lane (right of the incoming driver).
      const stop = mul(dir, layout.stopDistance + 3);
      const inward = mul(side, -1);
      const p1 = add(stop, mul(inward, 1));
      const p2 = add(stop, mul(inward, lane - 1));
      ctx.strokeStyle = arm.index === 0 ? 'rgba(244,246,249,0.55)' : THEME.marking;
      ctx.lineWidth = arm.index === 0 ? 2 : 1.4;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.strokeStyle = THEME.marking;
      ctx.lineWidth = 0.9;
      // Give-way teeth where the entry meets the ring.
      const tip = mul(fromAngle(arm.angle), R + lane / 2 + 1);
      for (let k = 1; k <= 3; k++) {
        const q = add(tip, mul(inward, (lane / 4) * k - 2));
        ctx.fillStyle = 'rgba(69,76,86,0.8)';
        ctx.beginPath();
        ctx.moveTo(q.x - dir.x * 0 + side.x * 1.6, q.y + side.y * 1.6);
        ctx.lineTo(q.x - side.x * 1.6, q.y - side.y * 1.6);
        ctx.lineTo(q.x + dir.x * 3, q.y + dir.y * 3);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // MARK: Dynamic world layers

  private lookFor(veh: Vehicle, skins: SkinLook[]): SkinLook {
    const h = hash(veh.id);
    switch (veh.type) {
      case 'sportsCar':
        return skins.length ? skins[h % skins.length] : { body: THEME.sports };
      case 'compact':
        return skins.length ? skins[h % skins.length] : { body: THEME.compact };
      case 'van':
        return skins.length ? skins[h % skins.length] : { body: THEME.van };
      case 'truck':
        return skins.length ? { body: skins[h % skins.length].body } : { body: THEME.car[0] };
      default:
        return skins.length ? skins[h % skins.length] : { body: THEME.car[h % THEME.car.length] };
    }
  }

  private drawOne(world: World, veh: Vehicle, f: FrameState): void {
    const ctx = this.ctx;
    const pos = lerpV(veh.prevPosition, veh.position, f.alpha);
    const heading = veh.prevHeading + angleDelta(veh.prevHeading, veh.heading) * f.alpha;
    let opacity = 1;
    let wreck = 0;
    if (veh.phase.kind === 'crashed') {
      const left = world.config.crashDuration - veh.phase.elapsed;
      opacity = Math.min(1, Math.max(0, left / 0.45));
      wreck = Math.min(1, veh.phase.elapsed / 0.4);
    }
    if (opacity <= 0) return;
    const flashing =
      (veh.type === 'police' && (veh.owner === 'player' ? veh.phase.kind !== 'queued' || world.criminal.kind === 'active' : false)) ||
      (veh.type === 'transporter' && world.transporter.kind === 'active');
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(pos.x, pos.y);
    ctx.rotate(heading);
    drawVehicle(ctx, {
      type: veh.type,
      length: world.lengthOf(veh.type),
      width: world.config.carWidth,
      look: this.lookFor(veh, f.skins),
      braking: !veh.isCrashed && world.isBraking(veh),
      flashing: flashing && !veh.isCrashed,
      wreck,
      dents: veh.dents,
      time: f.time,
      id: veh.id,
      reduceMotion: f.reduceMotion,
    });
    ctx.restore();
  }

  private drawSecureZone(world: World, time: number): void {
    const zone = secureZone(world);
    if (!zone) return;
    const ctx = this.ctx;
    const R = world.layout.ringRadius;
    const a0 = zone.s / R;
    const a1 = (zone.s + zone.arc) / R;
    ctx.strokeStyle = `rgba(216,162,58,${0.14 + 0.05 * Math.sin(time * 4)})`;
    ctx.lineWidth = world.layout.laneWidth - 2;
    ctx.beginPath();
    ctx.arc(0, 0, R, a0, a1);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(216,162,58,0.7)';
    ctx.lineWidth = 1.2;
    for (const a of [a0, a1]) {
      const inner = mul(fromAngle(a), R - world.layout.laneWidth / 2 + 2);
      const outer = mul(fromAngle(a), R + world.layout.laneWidth / 2 - 2);
      ctx.beginPath();
      ctx.moveTo(inner.x, inner.y);
      ctx.lineTo(outer.x, outer.y);
      ctx.stroke();
    }
  }

  private drawPickupCountdown(world: World, alpha: number): void {
    if (world.criminal.kind !== 'active') return;
    const pickup = world.vehicle(world.criminal.vehicle);
    const left = criminalTimeLeft(world);
    if (!pickup || pickup.isCrashed || left === null) return;
    const ctx = this.ctx;
    const pos = lerpV(pickup.prevPosition, pickup.position, alpha);
    const share = Math.max(0, Math.min(1, left / world.config.criminalTime));
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(180,92,240,0.22)';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 19, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = THEME.criminal;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 19, Math.PI / 2, Math.PI / 2 + TAU * share);
    ctx.stroke();
  }

  private drawScorches(effects: Effects): void {
    const ctx = this.ctx;
    for (const s of effects.scorches) {
      const fade = Math.min(1, (6 - s.age) / 1.5);
      ctx.fillStyle = `rgba(23,20,17,${0.6 * fade})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }
  }

  private drawParticles(effects: Effects, layer: 'under' | 'over'): void {
    const ctx = this.ctx;
    for (const p of effects.particles) {
      const under = p.kind === 'smoke' || p.kind === 'glass';
      if ((layer === 'under') !== under) continue;
      const t = p.life / p.maxLife;
      switch (p.kind) {
        case 'smoke':
          ctx.fillStyle = `rgba(107,114,124,${0.2 * t})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.fill();
          break;
        case 'glass':
          ctx.fillStyle = `rgba(207,227,242,${0.7 * Math.min(1, t * 2)})`;
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
          break;
        case 'spark': {
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = Math.min(1, t * 1.5);
          ctx.lineWidth = p.size * 0.6;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case 'debris':
          ctx.save();
          ctx.globalAlpha = Math.min(1, t * 2);
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, (p.size * 2) / 3);
          ctx.restore();
          break;
        case 'fire': {
          const r = p.size * (0.6 + 0.4 * t);
          ctx.fillStyle = `rgba(255,122,61,${0.55 * t})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, TAU);
          ctx.fill();
          ctx.fillStyle = `rgba(255,224,138,${0.7 * t})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 0.5, 0, TAU);
          ctx.fill();
          break;
        }
      }
    }
  }

  // MARK: Screen-space overlays

  private pill(x: number, y: number, text: string, bg: string, fg: string, size = 11): void {
    const ctx = this.ctx;
    ctx.font = `700 ${size}px ${FONT}`;
    const w = ctx.measureText(text).width + 16;
    const h = size + 10;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 0.5);
  }

  private drawWarnings(world: World, time: number): void {
    const layout = world.layout;
    const pulse = 0.75 + 0.25 * Math.sin(time * 9);
    const mark = (armIndex: number, text: string, bg: string): void => {
      const arm = layout.arms[armIndex];
      const at = add(mul(fromAngle(arm.angle), layout.stopDistance + 44), mul(v(fromAngle(arm.angle).y, -fromAngle(arm.angle).x), -layout.laneWidth / 2));
      const p = this.worldToScreen(at);
      this.ctx.globalAlpha = pulse;
      this.pill(p.x, p.y, text, bg, '#0E1013');
      this.ctx.globalAlpha = 1;
    };
    if (world.criminal.kind === 'warning') mark(world.criminal.arm.index, 'WANTED', THEME.criminal);
    else if (world.criminal.kind === 'arriving') {
      const pickup = world.vehicle(world.criminal.vehicle);
      if (pickup && pickup.phase.kind === 'waiting') mark(pickup.phase.arm.index, 'WANTED', THEME.criminal);
    }
    if (world.transporter.kind === 'warning') mark(world.transporter.arm.index, 'SECURED', THEME.cargo);
  }

  private drawIsland(world: World, island: IslandText | null, reduceMotion: boolean): void {
    if (!island) return;
    const ctx = this.ctx;
    const c = this.worldToScreen(v(0, 0));
    const radius = (world.layout.ringRadius - world.layout.laneWidth / 2 - 16) * this.scale;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (island.big) {
      let scale = 1;
      if (!reduceMotion && island.pulse !== undefined && island.pulse < 0.6) {
        // Spring (0.35 s, bounce 0.2) on a new combo tier.
        const t = island.pulse;
        scale = 1 + 0.22 * Math.exp(-t * 9) * Math.cos(t * 17);
      }
      const size = Math.min(radius * 0.62, 56);
      if (island.glow) {
        const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, radius);
        g.addColorStop(0, 'rgba(158,230,207,0.16)');
        g.addColorStop(1, 'rgba(158,230,207,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(c.x, c.y, radius, 0, TAU);
        ctx.fill();
      }
      ctx.save();
      ctx.translate(c.x, c.y - size * 0.12);
      ctx.scale(scale, scale);
      ctx.font = `800 ${size}px ${FONT}`;
      ctx.fillStyle = island.color ?? THEME.primary;
      ctx.fillText(island.title, 0, 0);
      ctx.restore();
      if (island.sub) {
        ctx.font = `600 ${Math.max(11, size * 0.24)}px ${FONT}`;
        ctx.fillStyle = THEME.muted;
        ctx.fillText(island.sub, c.x, c.y + size * 0.52);
      }
    } else {
      const size = Math.max(14, Math.min(radius * 0.2, 20));
      ctx.font = `700 ${size}px ${FONT}`;
      ctx.fillStyle = island.color ?? THEME.primary;
      ctx.fillText(island.title, c.x, c.y - (island.sub ? size * 0.55 : 0));
      if (island.sub) {
        ctx.font = `500 ${Math.max(12, size * 0.72)}px ${FONT}`;
        ctx.fillStyle = THEME.muted;
        ctx.fillText(island.sub, c.x, c.y + size * 0.75);
      }
    }
  }

  private drawPopups(effects: Effects): void {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const pop of effects.popups) {
      const x = pop.age / pop.life;
      const rise = 1 - Math.pow(1 - Math.min(1, x * 1.4), 3);
      const p = this.worldToScreen(pop.world);
      const y = p.y - 26 - rise * 20;
      const fadeIn = Math.min(1, pop.age / 0.08);
      const fadeOut = x > 0.6 ? 1 - (x - 0.6) / 0.4 : 1;
      const scale = pop.emphasis ? 0.9 + 0.1 * (1 - Math.pow(1 - Math.min(1, pop.age / 0.22), 3)) : 1;
      ctx.save();
      ctx.globalAlpha = Math.max(0, fadeIn * fadeOut);
      ctx.translate(p.x, y);
      ctx.scale(scale, scale);
      ctx.font = `800 ${pop.size}px ${FONT}`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(11,13,16,0.75)';
      ctx.strokeText(pop.text, 0, 0);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, 0, 0);
      if (pop.sub) {
        ctx.font = `700 ${Math.round(pop.size * 0.72)}px ${FONT}`;
        ctx.strokeText(pop.sub, 0, pop.size * 0.95);
        ctx.fillStyle = THEME.primary;
        ctx.fillText(pop.sub, 0, pop.size * 0.95);
      }
      ctx.restore();
    }
  }

  /** Distance in px between two world points, for hit tests. */
  screenDistance(a: Vec2, b: Vec2): number {
    return length(sub(a, b)) * this.scale;
  }
}

function hash(id: number): number {
  let h = Math.imul(id ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}
