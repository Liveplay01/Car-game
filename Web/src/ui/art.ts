import { drawVehicle } from '../renderer/carArt';
import type { Cosmetic } from '../core/loot';
import type { VehicleType } from '../core/vehicle';
import type { ChestKind } from '../core/loot';

const thumbs = new Map<string, string>();

/** A car preview, drawn with the game's own car art so the shop shows exactly what drives. */
export function carThumb(item: Cosmetic, time = 0): string {
  const key = `${item.id}@${time}`;
  const cached = thumbs.get(key);
  if (cached) return cached;
  const W = 144;
  const H = 96;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const type: VehicleType = item.kind === 'vehicleType' ? (item.id as VehicleType) : 'car';
  const length = type === 'sportsCar' ? 21 : type === 'compact' ? 18 : type === 'van' ? 29 : 24;
  const scale = 3.3;
  ctx.translate(W / 2, H / 2);
  ctx.scale(scale, -scale);
  ctx.rotate(Math.PI / 2 - 0.35);
  drawVehicle(ctx, {
    type,
    length,
    width: 13,
    look: item.look,
    braking: false,
    flashing: false,
    wreck: 0,
    dents: [],
    time: 0.3,
    id: 7,
    reduceMotion: true,
  });
  const url = canvas.toDataURL('image/png');
  thumbs.set(key, url);
  return url;
}

const CHEST_COLORS: Record<ChestKind, { body: string; lid: string; band: string; glow: string }> = {
  standard: { body: '#3A4150', lid: '#4A5263', band: '#9AA3AE', glow: 'rgba(154,163,174,0.35)' },
  premium: { body: '#3B2C55', lid: '#4C3A6B', band: '#E3C15A', glow: 'rgba(227,193,90,0.4)' },
  criminalHunt: { body: '#2E2340', lid: '#3C2D54', band: '#B45CF0', glow: 'rgba(180,92,240,0.4)' },
};

/** A chest as inline SVG. */
export function chestArt(kind: ChestKind): SVGSVGElement {
  const c = CHEST_COLORS[kind];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 72 64');
  svg.setAttribute('class', 'chest-art');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <ellipse cx="36" cy="58" rx="26" ry="4" fill="rgba(0,0,0,0.35)"/>
    <ellipse cx="36" cy="30" rx="30" ry="22" fill="${c.glow}" opacity="0.35"/>
    <rect x="10" y="28" width="52" height="28" rx="5" fill="${c.body}"/>
    <path d="M10 28v-6a12 12 0 0 1 12-12h28a12 12 0 0 1 12 12v6Z" fill="${c.lid}"/>
    <rect x="10" y="26" width="52" height="5" fill="${c.band}" opacity="0.9"/>
    <rect x="18" y="10" width="5" height="46" fill="${c.band}" opacity="0.75"/>
    <rect x="49" y="10" width="5" height="46" fill="${c.band}" opacity="0.75"/>
    <rect x="31" y="24" width="10" height="12" rx="2.5" fill="${c.band}"/>
    <circle cx="36" cy="30" r="2" fill="${c.body}"/>
    <path d="M14 34h44" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>`;
  return svg;
}
