import type { World } from '../core/world';
import { v, add, mul, left, fromAngle } from '../core/vec2';
import { type RenderList, type RenderItem, circle } from './render';
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
  /** Per layer: nine overlapping discs make a wider, graduated pool instead of visible rings. */
  lampStrength: 0.0075,
  /** Headlight cone: a few faint layers, reaching this many car lengths ahead. */
  coneLayers: 3,
  coneReach: 1.6,
  coneStrength: 0.015,

  /** `lowDetail`: the cars' day cones are left out; they are barely visible and cost the most. */
  add(list: RenderList, world: World, alpha: number, theme: MapTheme | null, lamps: VehicleLamps | null, time: number | null, nightPreview = false, lowDetail = false): void {
    if (world.config.night || nightPreview) return;
    if (!theme) CityLights.addLamps(list, world);
    if (!lowDetail) CityLights.addHeadlights(list, world, alpha, lamps, time);
  },

  /** Lamps along both kerbs of every arm, alternating sides, each with its pool of light; still, so the drawer keeps their picture. */
  addLamps(list: RenderList, world: World): void {
    const layout = world.layout;
    const lane = layout.laneWidth;
    const from = list.items.length;
    const key = `${layout.ringRadius}|${lane}|${layout.arms.map((a) => a.slot).join(',')}`;
    // Still: the shapes of last frame are laid in again instead of made again (the drawer copies its picture anyway).
    if (CityLights.lamps?.key === key) {
      for (const item of CityLights.lamps.items) list.items.push(item);
      list.bake(from, 'lamps', key);
      return;
    }
    for (const arm of layout.arms) {
      const out = fromAngle(arm.angle);
      let side = arm.slot % 2 === 0 ? 1 : -1;
      for (let d = layout.ringRadius + lane + 30; d < layout.ringRadius + 360; d += CityLights.lampSpacing) {
        const at = add(mul(out, d), mul(left(out), side * (lane + 10)));
        list.w(circle(add(at, v(0.8, -0.8)), 2), 'shadow', 0.8);
        Headlights.addStreetLamp(list, at, CityLights.lampStrength);
        side = -side;
      }
    }
    CityLights.lamps = { key, items: list.items.slice(from) };
    list.bake(from, 'lamps', key);
  },

  lamps: null as { key: string; items: RenderItem[] } | null,

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
