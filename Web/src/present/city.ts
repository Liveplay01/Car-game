import type { World } from '../core/world';
import { builtArmSlots, type Config } from '../core/config';
import type { Album } from '../core/loot';
import { type Vec2, v, add, mul, right, fromAngle, wrap, TAU } from '../core/vec2';
import { type RenderList, rect, circle, arc, unitHash } from './render';
import type { ColorToken } from './theme';
import { MapTheme } from './mapThemes';
import type { MapScars } from './explosionsFx';

/**
 * The city's breathing (`CityPulse`): trees sway, windows glow up and down, cloud shadows
 * drift, a little more when the traffic is dense; in the flow every car sent sends a wave.
 */
export class CityPulse {
  energy = 0.2;
  swayPhase = 0;
  glowPhase = 0;
  drift = 0;
  sinceBeat = Infinity;
  beatLevel = 0;
  static readonly windowRest = 0.1;
  static readonly beatSpeed = 420;

  static energyOf(world: World, flow: number): number {
    const moving = world.vehicles.filter((x) => x.phase.kind !== 'queued' && !x.isCrashed).length;
    const density = Math.min(1, moving / 12);
    const rush = world.shift.isRushHour ? 0.25 : 0;
    return Math.min(1, 0.12 + 0.45 * density + rush + 0.18 * flow);
  }

  advance(delta: number, target: number): void {
    this.energy += (target - this.energy) * Math.min(1, delta / 2.5);
    this.swayPhase += delta * (0.7 + 1.3 * this.energy);
    this.glowPhase += delta * (0.25 + 0.5 * this.energy);
    this.drift += delta * (5 + 16 * this.energy);
    this.sinceBeat += delta;
  }

  beat(flow: number): void {
    if (flow <= 0.05) return;
    this.sinceBeat = 0;
    this.beatLevel = flow;
  }

  sway(index: number): Vec2 {
    const amplitude = 0.35 + 1.1 * this.energy;
    const phase = unitHash(index, 19) * TAU;
    return mul(v(Math.sin(this.swayPhase + phase), 0.6 * Math.sin(0.7 * this.swayPhase + phase * 1.3)), amplitude);
  }

  window(index: number, distance: number): number {
    const phase = unitHash(index, 20) * TAU;
    const breath = 0.5 + 0.5 * Math.sin((this.glowPhase * TAU) / 4 + phase);
    let glow = 0.06 + (0.04 + 0.06 * this.energy) * breath;
    if (this.sinceBeat < 2) {
      const front = this.sinceBeat * CityPulse.beatSpeed;
      const offset = (distance - front) / 45;
      glow += 0.22 * this.beatLevel * Math.exp(-offset * offset) * Math.exp(-this.sinceBeat * 1.2);
    }
    return glow;
  }
}

/** City Evolution (`CityLayer.swift`): around the roundabout the city grows with progress. */
export const CityLayer = {
  addMapSkin(list: RenderList, skin: ColorToken | null, world: World): void {
    if (!skin) return;
    const radius = world.layout.ringRadius - world.layout.laneWidth / 2;
    list.w(circle(v(0, 0), radius), skin, 0.16);
    list.w(arc(v(0, 0), radius - 6, 2, 0, TAU), skin, 0.5);
  },

  frameColor(album: Album): ColorToken {
    return (
      {
        maps: 'mapAurora',
        commons: 'rarityCommon',
        rares: 'rarityRare',
        epics: 'rarityEpic',
        legends: 'rarityLegendary',
        seasons: 'skinFrost',
        loyalty: 'skinBronze',
        honours: 'skinPhoenix',
      } as const
    )[album];
  },

  addFrame(list: RenderList, album: Album | null, world: World): void {
    if (!album) return;
    const radius = world.layout.ringRadius + world.layout.laneWidth / 2 + 5;
    const color = CityLayer.frameColor(album);
    list.w(arc(v(0, 0), radius + 3, 8, 0, TAU), color, 0.12);
    list.w(arc(v(0, 0), radius, 2.5, 0, TAU), color, 0.8);
  },

  /**
   * An Elite driver's island (Leo, 29.09.2026: the world shows the milestone): a gold rim just
   * inside the kerb, and a gold stud by your own lane for every ten Elite levels (at most five).
   */
  addElite(list: RenderList, eliteLevel: number, world: World): void {
    if (eliteLevel <= 0) return;
    const radius = world.layout.ringRadius - world.layout.laneWidth / 2 - 7;
    list.w(arc(v(0, 0), radius, 2, 0, TAU), 'coin', 0.55);
    const studs = Math.min(5, Math.floor(eliteLevel / 10));
    for (let i = 0; i < studs; i++) {
      const angle = -Math.PI / 2 + (i - (studs - 1) / 2) * 0.13;
      list.w(circle(mul(fromAngle(angle), radius), 3.5), 'coin', 0.9);
    }
  },

  growth: (c: Config): number => c.level + 4 * Math.max(0, builtArmSlots(c).length - 4) + 3 * Object.keys(c.modules).length,

  add(list: RenderList, world: World, theme: MapTheme | null, time: number | null, pulse: CityPulse | null, scars: MapScars | null, now: number): void {
    MapTheme.addGround(list, theme, world, time);
    const layout = world.layout;
    const count = Math.min(64, 8 + CityLayer.growth(world.config));
    const armAngles = layout.arms.map((a) => a.angle);
    let placed = 0;
    for (let candidate = 0; placed < count && candidate < count * 4; candidate++) {
      const angle = unitHash(candidate, 11) * TAU;
      const clear = armAngles.every((a) => Math.abs(wrap(angle - a + Math.PI, TAU) - Math.PI) > 0.32);
      if (!clear) continue;
      const distance = layout.ringRadius + 70 + unitHash(candidate, 12) * 230;
      const center = mul(fromAngle(angle), distance);
      if (MapTheme.keepsClear(theme, center, layout)) continue;
      if (unitHash(candidate, 13) < 0.35) {
        const sway = pulse ? pulse.sway(candidate) : v(0, 0);
        const size = 7 + 5 * unitHash(candidate, 14);
        MapTheme.addPlant(list, theme, add(center, sway), size, candidate);
        scars?.addTree(list, add(center, sway), size, candidate, now, time);
      } else {
        const size = v(26 + 30 * unitHash(candidate, 15), 22 + 26 * unitHash(candidate, 16));
        list.w(rect(center, size, 3, angle), 'surface', 0.55);
        list.w(rect(center, v(size.x - 8, size.y - 8), 2, angle), 'kerb', 0.35);
        scars?.addHouse(list, center, size, angle, candidate, now, time);
        if (unitHash(candidate, 17) < 0.45) {
          const glow = pulse ? pulse.window(candidate, distance) : CityPulse.windowRest;
          const spot = add(add(center, mul(fromAngle(angle + Math.PI / 2), size.y * 0.18)), mul(fromAngle(angle), size.x * (unitHash(candidate, 18) - 0.5) * 0.4));
          list.w(rect(spot, v(size.x * 0.22, size.y * 0.16), 1, angle), 'hazard', glow);
        }
      }
      placed++;
    }
    MapTheme.addAvenues(list, theme, world);
    if (pulse) CityLayer.addCloudShadows(list, pulse);
  },

  addCloudShadows(list: RenderList, pulse: CityPulse): void {
    const span = 1600;
    for (let cloud = 0; cloud < 2; cloud++) {
      const direction = fromAngle(0.35 + cloud * 0.5);
      const across = mul(right(direction), cloud * 260 - 130);
      const travel = ((pulse.drift + cloud * span * 0.55) % span) - span / 2;
      const center = add(mul(direction, travel), across);
      const radius = 150 + cloud * 40;
      for (let ring = 0; ring < 4; ring++) {
        const r = radius * (1 - 0.2 * ring);
        list.w(rect(center, v(r * 2.2, r * 1.5), r * 0.75, 0.35 + cloud * 0.5), 'shadow', 0.05);
      }
    }
  },
};
