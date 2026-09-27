import type { VehicleType, Dent } from '../core/vehicle';
import type { SkinLook } from '../core/loot';
import { THEME } from './effects';

export interface CarDrawOptions {
  type: VehicleType;
  length: number;
  width: number;
  look: SkinLook;
  braking: boolean;
  /** Police light bar or transporter beacon flashing. */
  flashing: boolean;
  /** 0 = intact, 1 = fully a wreck. */
  wreck: number;
  dents: Dent[];
  time: number;
  id: number;
  reduceMotion: boolean;
}

/** Lightens (amount > 0) or darkens a hex colour. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (amount >= 0) {
    r += (255 - r) * amount;
    g += (255 - g) * amount;
    b += (255 - b) * amount;
  } else {
    r *= 1 + amount;
    g *= 1 + amount;
    b *= 1 + amount;
  }
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
}

/**
 * Draws a vehicle in its own frame: x forward, y to the left, centred. The caller has already
 * translated and rotated the context (world space, y up).
 */
export function drawVehicle(ctx: CanvasRenderingContext2D, o: CarDrawOptions): void {
  const L = o.length;
  const W = o.width;
  const hl = L / 2;
  const hw = W / 2;

  // Shadow, offset down-right on screen (world y is up).
  ctx.fillStyle = 'rgba(3,4,6,0.5)';
  rr(ctx, -hl + 1.2, -hw - 1.6, L, W, W * 0.34);
  ctx.fill();

  switch (o.type) {
    case 'truck':
      drawTruck(ctx, o, L, W);
      break;
    case 'pickup':
      drawPickup(ctx, o, L, W);
      break;
    case 'transporter':
      drawTransporter(ctx, o, L, W);
      break;
    default:
      drawCar(ctx, o, L, W);
  }

  // Lights: headlights always, tail lights bright while braking.
  ctx.fillStyle = o.wreck > 0.5 ? 'rgba(255,244,214,0.25)' : 'rgba(255,244,214,0.92)';
  rr(ctx, hl - 1.6, hw - 3.4, 1.4, 2.4, 0.6);
  ctx.fill();
  rr(ctx, hl - 1.6, -hw + 1, 1.4, 2.4, 0.6);
  ctx.fill();
  ctx.fillStyle = o.braking ? THEME.lightRed : '#6E1B22';
  rr(ctx, -hl + 0.3, hw - 3.2, 1.3, 2.2, 0.5);
  ctx.fill();
  rr(ctx, -hl + 0.3, -hw + 1, 1.3, 2.2, 0.5);
  ctx.fill();
  if (o.braking) {
    // A faint glow right behind each lamp, no more: many cars brake at once in a queue.
    ctx.fillStyle = 'rgba(255,59,71,0.18)';
    for (const y of [hw - 2.1, -hw + 2.1]) {
      ctx.beginPath();
      ctx.arc(-hl - 0.6, y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Dents: dark crumples where it was hit.
  for (const dent of o.dents) {
    ctx.fillStyle = `rgba(8,9,11,${Math.min(0.55, 0.18 + dent.depth * 0.06)})`;
    ctx.beginPath();
    ctx.ellipse(dent.point.x * 0.9, dent.point.y * 0.9, 1.2 + dent.depth * 0.7, 1 + dent.depth * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wreck: the paint dulls to scorched grey.
  if (o.wreck > 0) {
    ctx.fillStyle = `rgba(40,43,48,${Math.min(0.55, o.wreck * 0.55)})`;
    rr(ctx, -hl, -hw, L, W, W * 0.34);
    ctx.fill();
  }
}

function drawCar(ctx: CanvasRenderingContext2D, o: CarDrawOptions, L: number, W: number): void {
  const hl = L / 2;
  const hw = W / 2;
  const police = o.type === 'police';
  const body = police ? THEME.police : o.look.body;
  const roof = police ? THEME.policeRoof : (o.look.roof ?? shade(body, -0.1));
  const van = o.type === 'van';
  const compact = o.type === 'compact';
  const sports = o.type === 'sportsCar';

  ctx.fillStyle = body;
  rr(ctx, -hl, -hw, L, W, W * (compact ? 0.45 : sports ? 0.38 : 0.32));
  ctx.fill();
  // Soft top-light along the body.
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  rr(ctx, -hl + 1, 0.5, L - 2, hw - 1.5, W * 0.25);
  ctx.fill();

  // Cabin layout: windscreen, roof, rear window.
  const wsFront = van ? hl * 0.62 : sports ? hl * 0.18 : hl * 0.42;
  const wsBack = van ? hl * 0.34 : sports ? -hl * 0.12 : hl * 0.08;
  const roofBack = van ? -hl * 0.86 : sports ? -hl * 0.4 : -hl * 0.46;
  const rearBack = van ? -hl * 0.92 : sports ? -hl * 0.62 : -hl * 0.72;
  const inset = W * 0.14;

  ctx.fillStyle = roof;
  rr(ctx, roofBack, -hw + inset, wsBack - roofBack, W - inset * 2, 2);
  ctx.fill();

  if (o.look.stripe && !police) {
    ctx.fillStyle = o.look.stripe;
    ctx.fillRect(-hl + 1, W * 0.1, L - 2, 1.1);
    ctx.fillRect(-hl + 1, -W * 0.1 - 1.1, L - 2, 1.1);
  }

  ctx.fillStyle = THEME.glass;
  ctx.beginPath();
  ctx.moveTo(wsFront, hw - inset - 0.6);
  ctx.lineTo(wsFront, -hw + inset + 0.6);
  ctx.lineTo(wsBack, -hw + inset);
  ctx.lineTo(wsBack, hw - inset);
  ctx.closePath();
  ctx.fill();
  if (!van) {
    ctx.beginPath();
    ctx.moveTo(roofBack, hw - inset);
    ctx.lineTo(roofBack, -hw + inset);
    ctx.lineTo(rearBack, -hw + inset + 0.8);
    ctx.lineTo(rearBack, hw - inset - 0.8);
    ctx.closePath();
    ctx.fill();
  }
  // Glass glint.
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(wsBack + 0.4, 0.5, Math.max(0.5, (wsFront - wsBack) * 0.35), hw - inset - 1);

  if (police) {
    const phase = Math.floor(o.time / 0.13) % 2 === 0;
    const onRed = o.flashing ? phase : false;
    const onBlue = o.flashing ? !phase : false;
    ctx.fillStyle = onRed ? THEME.lightRed : '#7A2A31';
    rr(ctx, -2.2, 0.2, 3.4, hw - inset - 0.2, 0.8);
    ctx.fill();
    ctx.fillStyle = onBlue ? THEME.lightBlue : '#28466E';
    rr(ctx, -2.2, -hw + inset, 3.4, hw - inset - 0.2, 0.8);
    ctx.fill();
    if (o.flashing) {
      ctx.fillStyle = onRed ? 'rgba(255,59,71,0.28)' : 'rgba(79,163,255,0.3)';
      ctx.beginPath();
      ctx.arc(-0.5, onRed ? 3 : -3, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  drawSkinEffects(ctx, o, L, W);
}

function drawTruck(ctx: CanvasRenderingContext2D, o: CarDrawOptions, L: number, W: number): void {
  const hl = L / 2;
  const hw = W / 2;
  const cab = L * 0.28;
  // Only the cab wears the skin; the light box keeps the lorry recognisable.
  ctx.fillStyle = o.look.body === THEME.car[0] ? THEME.truck : o.look.body;
  rr(ctx, hl - cab, -hw, cab, W, 3);
  ctx.fill();
  ctx.fillStyle = THEME.glass;
  ctx.fillRect(hl - 3.4, -hw + 1.6, 1.8, W - 3.2);
  ctx.fillStyle = THEME.truckBox;
  rr(ctx, -hl, -hw - 0.4, L - cab - 1.2, W + 0.8, 1.6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 0.6;
  for (let x = -hl + 4; x < hl - cab - 2; x += 4) {
    ctx.beginPath();
    ctx.moveTo(x, -hw);
    ctx.lineTo(x, hw);
    ctx.stroke();
  }
}

function drawPickup(ctx: CanvasRenderingContext2D, _o: CarDrawOptions, L: number, W: number): void {
  const hl = L / 2;
  const hw = W / 2;
  ctx.fillStyle = THEME.criminal;
  rr(ctx, -hl, -hw, L, W, 3);
  ctx.fill();
  // Open bed at the back: the shape that says "criminal".
  ctx.fillStyle = THEME.bed;
  rr(ctx, -hl + 1.4, -hw + 1.6, L * 0.46, W - 3.2, 1);
  ctx.fill();
  ctx.fillStyle = THEME.glass;
  ctx.beginPath();
  ctx.moveTo(hl * 0.55, hw - 1.8);
  ctx.lineTo(hl * 0.55, -hw + 1.8);
  ctx.lineTo(hl * 0.2, -hw + 1.6);
  ctx.lineTo(hl * 0.2, hw - 1.6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(THEME.criminal, -0.15);
  ctx.fillRect(-hl * 0.02, -hw + 1.6, hl * 0.22, W - 3.2);
}

function drawTransporter(ctx: CanvasRenderingContext2D, o: CarDrawOptions, L: number, W: number): void {
  const hl = L / 2;
  const hw = W / 2;
  ctx.fillStyle = THEME.armor;
  rr(ctx, -hl, -hw, L, W, 3);
  ctx.fill();
  ctx.fillStyle = THEME.armorBox;
  rr(ctx, -hl + 1, -hw + 1, L * 0.62, W - 2, 1.6);
  ctx.fill();
  // Gold stripe and coin: money on board.
  ctx.fillStyle = THEME.cargo;
  ctx.fillRect(-hl + 1, -0.6, L * 0.62, 1.2);
  ctx.beginPath();
  ctx.arc(-hl + 1 + L * 0.31, 0, W * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = shade(THEME.cargo, -0.35);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.arc(-hl + 1 + L * 0.31, 0, W * 0.15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = THEME.glass;
  ctx.fillRect(hl * 0.3, -hw + 2, hl * 0.3, W - 4);
  const beacon = o.flashing && Math.floor(o.time / 0.2) % 2 === 0;
  ctx.fillStyle = beacon ? '#FFC247' : '#6B5424';
  ctx.beginPath();
  ctx.arc(hl * 0.12, 0, 1.4, 0, Math.PI * 2);
  ctx.fill();
  if (beacon) {
    ctx.fillStyle = 'rgba(255,194,71,0.25)';
    ctx.beginPath();
    ctx.arc(hl * 0.12, 0, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Shiny: a light streak runs over the car now and then. Glitter: little sparkles blink. */
function drawSkinEffects(ctx: CanvasRenderingContext2D, o: CarDrawOptions, L: number, W: number): void {
  if (o.reduceMotion || o.wreck > 0) return;
  const hl = L / 2;
  const hw = W / 2;
  if (o.look.shiny) {
    const period = 2.6;
    const phase = ((o.time + (o.id % 7) * 0.37) % period) / period;
    if (phase < 0.35) {
      const x = -hl - 6 + (L + 12) * (phase / 0.35);
      ctx.save();
      rr(ctx, -hl, -hw, L, W, W * 0.32);
      ctx.clip();
      const g = ctx.createLinearGradient(x - 4, 0, x + 4, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 4, -hw, 8, W);
      ctx.restore();
    }
  }
  if (o.look.glitter) {
    for (let i = 0; i < 4; i++) {
      const seed = (o.id * 31 + i * 17) % 97;
      const tw = Math.sin(o.time * 5 + seed);
      if (tw < 0.55) continue;
      const x = -hl + 2 + ((seed * 7) % 20) / 20 * (L - 4);
      const y = -hw + 2 + ((seed * 13) % 10) / 10 * (W - 4);
      const s = (tw - 0.55) * 2.6;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(x - s / 2, y - 0.25, s, 0.5);
      ctx.fillRect(x - 0.25, y - s / 2, 0.5, s);
    }
  }
}
