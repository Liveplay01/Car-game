import type { World } from '../core/world';
import type { Arm, Layout } from '../core/roundabout';
import { type Vec2, v, add, mul, left, fromAngle } from '../core/vec2';
import { type RenderList, type RenderItem, circle, Ease } from './render';
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
  add(list: RenderList, world: World, alpha: number, theme: MapTheme | null, lamps: VehicleLamps | null, time: number | null, nightPreview = false, lowDetail = false, wave: LampWave | null = null): void {
    if (world.config.night || nightPreview) return;
    if (!theme) CityLights.addLamps(list, world, wave);
    if (!lowDetail) CityLights.addHeadlights(list, world, alpha, lamps, time);
  },

  /** Lamps along both kerbs of every arm, alternating sides, each with its pool of light; still but for the wave, so the drawer keeps their picture. */
  addLamps(list: RenderList, world: World, wave: LampWave | null = null): void {
    const layout = world.layout;
    const lane = layout.laneWidth;
    const from = list.items.length;
    const steady = wave ? wave.steady : 1;
    const key = `${layout.ringRadius}|${lane}|${layout.arms.map((a) => a.slot).join(',')}|${steady}`;
    // Still: the shapes of last frame are laid in again instead of made again (the drawer copies its picture anyway).
    if (steady !== null && CityLights.lamps?.key === key) {
      for (const item of CityLights.lamps.items) list.items.push(item);
      list.bake(from, 'lamps', key);
      return;
    }
    for (const arm of layout.arms) {
      const out = fromAngle(arm.angle);
      let side = arm.slot % 2 === 0 ? 1 : -1;
      let k = 0;
      for (let d = layout.ringRadius + lane + 30; d < layout.ringRadius + 360; d += CityLights.lampSpacing) {
        const at = add(mul(out, d), mul(left(out), side * (lane + 10)));
        list.w(circle(add(at, v(0.8, -0.8)), 2), 'shadow', 0.8);
        Headlights.addStreetLamp(list, at, CityLights.lampStrength, steady ?? wave?.level(armRank(layout, arm), k) ?? 1);
        if (steady === null && wave) LampWave.addFlare(list, at, wave.flare(armRank(layout, arm), k));
        side = -side;
        k++;
      }
    }
    if (steady === null) return;
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

/** How many arms `arm` is from yours, either way round. */
export function armRank(layout: Layout, arm: Arm): number {
  const n = layout.arms.length;
  const d = Math.abs(arm.index - layout.player.index);
  return Math.min(d, n - d);
}

/**
 * The lamp wave (Leo, 23.10.2026): while a shift waits, the street lamps rest low; when it starts they
 * come on one after the other, from your street outwards, each with the short flicker of a lamp
 * striking. Once the shift is over they settle back down together. With Reduce Motion they only fade up.
 */
export class LampWave {
  static readonly rest = 0.4;
  static readonly perArm = 0.2;
  static readonly alongArm = 0.12;
  static readonly strike = 0.34;
  static readonly settle = 1.6;
  /** Long enough for the last lamp of the widest city to have struck. */
  static readonly span = 2.2;

  lit = false;
  private age = Infinity;
  private calm = false;

  update(lit: boolean, delta: number, calm: boolean): void {
    this.calm = calm;
    if (lit === this.lit) this.age += delta;
    else {
      this.lit = lit;
      this.age = 0;
    }
  }

  /** How far a lamp is on (0…1): the `k`th along an arm `rank` arms from yours. */
  level(rank: number, k: number): number {
    const rest = LampWave.rest;
    if (!this.lit) return rest + (1 - rest) * (1 - Ease.smoothstep(this.age / LampWave.settle));
    const t = this.age - rank * LampWave.perArm - k * LampWave.alongArm;
    if (t <= 0) return rest;
    if (t >= LampWave.strike) return 1;
    if (this.calm) return rest + (1 - rest) * Ease.outCubic(t / LampWave.strike);
    // Striking: a flash, a dip, then it warms up.
    if (t < 0.05) return 0.9;
    if (t < 0.1) return rest * 0.6;
    return rest * 0.6 + (1 - rest * 0.6) * Ease.outCubic((t - 0.1) / (LampWave.strike - 0.1));
  }

  /** The short glow of a lamp striking (0…1), so the wave reads by day too; none with Reduce Motion. */
  flare(rank: number, k: number): number {
    if (!this.lit || this.calm) return 0;
    const t = this.age - rank * LampWave.perArm - k * LampWave.alongArm;
    return t > 0 && t < LampWave.strike ? 1 - t / LampWave.strike : 0;
  }

  static addFlare(list: RenderList, at: Vec2, flare: number): void {
    if (flare <= 0.01) return;
    list.w(circle(at, 9), 'headlight', 0.12 * flare);
    list.w(circle(at, 5), 'headlight', 0.3 * flare);
  }

  /** Every lamp at the same brightness, so the picture can be kept; null while the wave runs. */
  get steady(): number | null {
    if (this.lit) return this.age >= LampWave.span ? 1 : null;
    return this.age >= LampWave.settle ? LampWave.rest : null;
  }
}
