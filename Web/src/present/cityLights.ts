import type { World } from '../core/world';
import { v, add, mul, left, fromAngle } from '../core/vec2';
import { type RenderList, circle } from './render';
import { CarArt } from './carArt';
import { Headlights } from './headlights';
import { interpolatedPose, type VehicleLamps } from './scene';
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

  add(list: RenderList, world: World, alpha: number, theme: MapTheme | null, lamps: VehicleLamps | null, time: number | null): void {
    if (world.config.night) return;
    if (!theme) CityLights.addLamps(list, world);
    CityLights.addHeadlights(list, world, alpha, lamps, time);
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

  /** A faint pair of cones ahead of every car on the road; the queue behind the front car fades out. */
  addHeadlights(list: RenderList, world: World, alpha: number, lamps: VehicleLamps | null, time: number | null): void {
    const c = world.config;
    const look = { layers: CityLights.coneLayers, reach: CarArt.length('car', c) * CityLights.coneReach, spread: 1.05, strength: CityLights.coneStrength };
    for (const veh of world.vehicles) {
      if (veh.isCrashed) continue;
      // The Phantom drives without lights.
      if (veh.role === 'boss' && c.bossKind === 'phantom') continue;
      const waiting = veh.phase.kind === 'queued' && veh.id !== world.queue.vehicles[0];
      const beam = lamps ? lamps.beam(veh.id, waiting) : Headlights.rest(waiting);
      Headlights.add(list, interpolatedPose(veh, alpha), CarArt.length(veh.type, c), c.carWidth, look, beam, beam.glow, time, veh.id);
    }
  },
};
