import { type Vec2, v } from '../core/vec2';
import { Ease } from './render';
import type { ColorToken } from './theme';

/**
 * The clouds of the way in (`bootDescent.ts`). Pure, so `vite.config.ts` draws the same sky at its first
 * height into `index.html`: the page shows it before any script runs, and the canvas takes over in place.
 * Units: the screen's short side is 1, the centre is 0. On a phone that side spans the street view's 300 m.
 */
export interface SkyLayer {
  token: ColorToken;
  opacity: number;
  centres: Vec2[];
  radii: number[];
}

interface Cloud {
  /** Ground point it floats over (world units, from the ring's centre). */
  at: Vec2;
  /** Altitude, in the same steps as the eye's height (1 = the street view). */
  altitude: number;
  puffs: { d: Vec2; r: number }[];
}

/** World units across the short side at the street view. */
const SPAN = 300;

/** Always the same sky: a small seeded walk, so every load looks alike. */
const CLOUDS: Cloud[] = (() => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: 14 }, (_, i) => {
    const angle = i * 2.4 + rnd();
    const dist = 80 + rnd() * 520;
    const size = 70 + rnd() * 150;
    return {
      at: v(Math.cos(angle) * dist, Math.sin(angle) * dist),
      altitude: 1.3 + (i / 13) * 4.2,
      puffs: Array.from({ length: 5 + Math.floor(rnd() * 3) }, () => ({
        d: v((rnd() - 0.5) * size * 1.6, (rnd() - 0.5) * size * 0.7),
        r: size * (0.35 + rnd() * 0.3),
      })),
    };
  });
})();

/** The clouds seen from height `H` (street view = 1), blown `drift` world units downwind; back to front. */
export function skyLayers(H: number, drift: number): SkyLayer[] {
  const layers: SkyLayer[] = [];
  for (const c of CLOUDS) {
    if (H <= c.altitude) continue;
    const near = (H - c.altitude) / H;
    const alpha = Ease.smoothstep((near - 0.05) / 0.3) * Ease.clamp01((H - 1.05) / 0.4);
    if (alpha < 0.01) continue;
    const k = 1 / (SPAN * (H - c.altitude));
    const at = (d: Vec2, lift = 0): Vec2 => v((c.at.x + d.x + drift) * k, -(c.at.y + d.y) * k + lift);
    const centres = c.puffs.map((p) => at(p.d));
    const radii = (f: number) => c.puffs.map((p) => p.r * k * f);
    layers.push(
      { token: 'snowShade', opacity: alpha * 0.25, centres: c.puffs.map((p) => at(p.d, p.r * k * 0.25)), radii: radii(1) },
      { token: 'primary', opacity: alpha * 0.15, centres, radii: radii(1.25) },
      { token: 'primary', opacity: alpha * 0.3, centres, radii: radii(1) },
      { token: 'primary', opacity: alpha * 0.3, centres, radii: radii(0.7) },
    );
  }
  return layers;
}
