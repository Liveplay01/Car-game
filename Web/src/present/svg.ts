import { v, type Vec2 } from '../core/vec2';
import { RenderList, pinned, type Primitive } from './render';
import { css } from './theme';

/**
 * A picture drawn with the game's own art, as an SVG string: the same render list the canvas
 * draws (`draw.ts`), written out shape by shape. For the website (`siteData.ts`), so it shows the
 * real cars, museum pictures and intro glyphs instead of copies. Text is left out.
 */

const n = (x: number): string => String(Math.round(x * 10) / 10);
const pt = (p: Vec2): string => `${n(p.x)} ${n(p.y)}`;
const ring = (points: readonly Vec2[]): string => `M${points.map(pt).join('L')}Z`;

function shape(p: Primitive, color: string): string {
  switch (p.k) {
    case 'rect': {
      const r = Math.max(0, Math.min(p.radius, p.size.x / 2, p.size.y / 2));
      const turn = p.rotation ? ` transform="rotate(${n((p.rotation * 180) / Math.PI)} ${pt(p.center)})"` : '';
      return `<rect x="${n(p.center.x - p.size.x / 2)}" y="${n(p.center.y - p.size.y / 2)}" width="${n(p.size.x)}" height="${n(p.size.y)}"${r > 0.3 ? ` rx="${n(r)}"` : ''}${turn} fill="${color}"/>`;
    }
    case 'circle':
      return p.radius > 0.05 ? `<circle cx="${n(p.center.x)}" cy="${n(p.center.y)}" r="${n(p.radius)}" fill="${color}"/>` : '';
    case 'arc': {
      if (p.thickness <= 0.02 || p.radius <= 0) return '';
      const stroke = `fill="none" stroke="${color}" stroke-width="${n(p.thickness)}"`;
      const span = Math.abs(p.end - p.start);
      if (span >= Math.PI * 2 - 1e-9) return `<circle cx="${n(p.center.x)}" cy="${n(p.center.y)}" r="${n(p.radius)}" ${stroke}/>`;
      // Screen angles turn clockwise, like the canvas's.
      const a0 = Math.min(p.start, p.end);
      const at = (a: number): Vec2 => v(p.center.x + p.radius * Math.cos(a), p.center.y + p.radius * Math.sin(a));
      return `<path d="M${pt(at(a0))}A${n(p.radius)} ${n(p.radius)} 0 ${span > Math.PI ? 1 : 0} 1 ${pt(at(a0 + span))}" ${stroke}${p.round ? ' stroke-linecap="round"' : ''}/>`;
    }
    case 'line':
      return p.thickness > 0.02 ? `<path d="M${pt(p.from)}L${pt(p.to)}" stroke="${color}" stroke-width="${n(p.thickness)}"/>` : '';
    case 'polygon':
      if (p.points.length < 3) return '';
      return `<path d="${[p.points, ...(p.holes ?? [])].map(ring).join('')}"${p.holes ? ' fill-rule="evenodd"' : ''} fill="${color}"/>`;
    case 'segments': {
      let d = '';
      for (let i = 0; i + 1 < p.points.length; i += 2) d += `M${pt(p.points[i])}L${pt(p.points[i + 1])}`;
      return d && p.thickness > 0.02 ? `<path d="${d}" stroke="${color}" stroke-width="${n(p.thickness)}"/>` : '';
    }
    case 'dots':
      return p.points.map((q, i) => `<circle cx="${n(q.x)}" cy="${n(q.y)}" r="${n(p.radii[i])}" fill="${color}"/>`).join('');
    case 'text':
      return '';
  }
}

/** Draws with `draw` into a `size` × `size` picture centred on (size / 2, size / 2), and writes it out. */
export function artSvg(size: number, draw: (list: RenderList, center: Vec2) => void): string {
  const list = new RenderList({ viewport: v(size, size), center: v(0, 0), focus: v(size / 2, size / 2), scale: 1 }, 'background');
  draw(list, v(size / 2, size / 2));
  const body = list.items.map((it) => {
    const item = pinned(it, list.camera);
    return shape(item.p, css(item.color, item.opacity));
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${body.join('')}</svg>`;
}
