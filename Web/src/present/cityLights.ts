import type { World } from '../core/world';
import { v, add, mul, left, fromAngle } from '../core/vec2';
import { type RenderList, circle, polygon } from './render';
import { CarArt, worldOf } from './carArt';
import { interpolatedPose } from './scene';
import type { MapTheme } from './mapThemes';

/**
 * The city is dark even without a night shift: street lamps along the arms pool warm light
 * on the road, and every car's headlights throw a faint cone ahead. Far softer than a night
 * shift, which draws its own lights (`NightLayer`); a map skin keeps its own lamps.
 */
export const CityLights = {
  lampSpacing: 110,
  /** Many faint layers read as one soft pool instead of rings. */
  lampPool: [34, 29, 24, 19, 14, 9],
  lampStrength: 0.009,
  /** Headlight cone: a few faint layers, reaching this many car lengths ahead. */
  coneLayers: 3,
  coneReach: 1.6,
  coneStrength: 0.012,

  add(list: RenderList, world: World, alpha: number, theme: MapTheme | null): void {
    if (world.config.night) return;
    if (!theme) CityLights.addLamps(list, world);
    CityLights.addHeadlights(list, world, alpha);
  },

  /** Lamps along both kerbs of every arm, alternating sides, each with its pool of light. */
  addLamps(list: RenderList, world: World): void {
    const layout = world.layout;
    const lane = layout.laneWidth;
    for (const arm of layout.arms) {
      const out = fromAngle(arm.angle);
      let side = arm.slot % 2 === 0 ? 1 : -1;
      for (let d = layout.ringRadius + lane + 30; d < layout.ringRadius + 360; d += CityLights.lampSpacing) {
        const at = add(mul(out, d), mul(left(out), side * (lane + 10)));
        for (const radius of CityLights.lampPool) list.w(circle(at, radius), 'headlight', CityLights.lampStrength);
        list.w(circle(add(at, v(0.8, -0.8)), 2), 'shadow', 0.8);
        list.w(circle(at, 1.5), 'headlight', 0.85);
        side = -side;
      }
    }
  },

  /** A faint cone ahead of every car on the road; the queue behind the front car stays dark. */
  addHeadlights(list: RenderList, world: World, alpha: number): void {
    const c = world.config;
    const W = c.carWidth;
    const reach = CarArt.length('car', c) * CityLights.coneReach;
    for (const veh of world.vehicles) {
      if (veh.isCrashed) continue;
      if (veh.phase.kind === 'queued' && veh.id !== world.queue.vehicles[0]) continue;
      // The Phantom drives without lights.
      if (veh.role === 'boss' && c.bossKind === 'phantom') continue;
      const pose = interpolatedPose(veh, alpha);
      const L = CarArt.length(veh.type, c);
      for (let layer = 0; layer < CityLights.coneLayers; layer++) {
        const k = (layer + 1) / CityLights.coneLayers;
        const far = L / 2 + reach * k;
        const spread = W * (0.45 + 0.6 * k);
        list.w(polygon([v(L / 2, W * 0.4), v(far, spread), v(far, -spread), v(L / 2, -W * 0.4)].map((p) => worldOf(p, pose))), 'headlight', CityLights.coneStrength);
      }
    }
  },
};
