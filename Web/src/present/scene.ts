import { type World, STEP } from '../core/world';
import type { Vehicle } from '../core/vehicle';
import type { Pose } from '../core/paths';
import type { Layout, Arm } from '../core/roundabout';
import { type Config, moduleZone, moduleEntries } from '../core/config';
import { type Vec2, v, add, sub, mul, dot, dist, left, right, fromAngle, length, normalize, angleDelta, lerpV, TAU } from '../core/vec2';
import { type RenderList, rect, circle, arc, line, polygon, text, Ease, Metrics, toScreen } from './render';
import type { ColorToken } from './theme';
import { CarArt } from './carArt';
import { Headlights } from './headlights';
import { lookFor } from './skins';
import { S } from './strings';
import { towDepotCovering } from '../core/modules';
import { MODULE_COLORS } from './flow';
import { criminalVehicle } from '../core/specials';
import { isCarType, isEmergency } from '../core/vehicle';

/** Pose between the last two simulation steps. */
export function interpolatedPose(veh: Vehicle, alpha: number): Pose {
  return { position: lerpV(veh.prevPosition, veh.position, alpha), heading: veh.prevHeading + angleDelta(veh.prevHeading, veh.heading) * alpha };
}

/** Brake lights and headlight flashes by vehicle id. */
export interface Lamps {
  brake(id: number): number;
  headlights(id: number): number;
}

/** A multiplayer car in its player's colour: a painted roof, a glow, a lunge on the tap. */
export interface VehicleMark {
  color: ColorToken;
  /** Paint the roof (plain cars); a lorry sent by a player only glows. */
  roof: boolean;
  /** 0…1: the glow under the car. */
  glow: number;
  /** World units the car leans forward (the tap's anticipation). */
  lunge: number;
}

/**
 * How a car's headlights look right now (`Headlights`): `glow` 0 (queued) → 1 (driving), `reach` the length of the
 * cones relative to full speed, `swing` how far they point into a turn, in radians.
 */
export interface Beam {
  glow: number;
  reach: number;
  swing: number;
}

/**
 * The lights of the traffic: brake lights come on quickly and fade a
 * little slower; the headlights flash twice when a tap is held for the car rolling up, and their beams
 * follow the car (it rolls up, it speeds, it turns) instead of switching.
 */
export class VehicleLamps {
  private brakes = new Map<number, number>();
  private beams = new Map<number, Beam>();
  private flash: { vehicle: number; age: number } | null = null;
  private hadHeldTap = false;

  brake(id: number): number {
    return this.brakes.get(id) ?? 0;
  }

  /** The car's beam; a car not followed yet is lit when it is not in the queue. */
  beam(id: number, waiting: boolean): Beam {
    return this.beams.get(id) ?? Headlights.rest(waiting);
  }

  headlights(id: number): number {
    if (!this.flash || this.flash.vehicle !== id) return 0;
    const age = this.flash.age;
    const pulse = (center: number): number => {
      const x = (age - center) / 0.055;
      return Math.abs(x) < 1 ? 0.5 + 0.5 * Math.cos(Math.PI * x) : 0;
    };
    return Math.max(pulse(0.055), pulse(0.19));
  }

  update(world: World, delta: number): void {
    const next = new Map<number, number>();
    const beams = new Map<number, Beam>();
    const front = world.queue.vehicles[0];
    for (const veh of world.vehicles) {
      if (veh.isCrashed) continue;
      const target = world.isBraking(veh) ? 1 : 0;
      const current = this.brakes.get(veh.id) ?? target;
      const time = target > current ? 0.05 : 0.14;
      next.set(veh.id, current + (target - current) * Math.min(1, delta / time));
      beams.set(veh.id, this.followBeam(veh, veh.phase.kind === 'queued' && veh.id !== front, world.config.ringSpeed, delta));
    }
    this.brakes = next;
    this.beams = beams;
    const held = world.queue.heldTap !== null;
    if (held && !this.hadHeldTap && world.queue.vehicles.length > 0) this.flash = { vehicle: world.queue.vehicles[0], age: 0 };
    else if (this.flash) this.flash = this.flash.age + delta < 0.3 ? { vehicle: this.flash.vehicle, age: this.flash.age + delta } : null;
    this.hadHeldTap = held;
  }

  /** The beam eases towards what the car does: dim while queued, longer with speed, swung into a turn. */
  private followBeam(veh: Vehicle, waiting: boolean, ringSpeed: number, delta: number): Beam {
    const rolling = Math.min(1, dist(veh.prevPosition, veh.position) / STEP / ringSpeed);
    const turning = angleDelta(veh.prevHeading, veh.heading) / STEP;
    const target: Beam = { glow: waiting ? 0 : 1, reach: waiting ? 0.7 : 0.85 + 0.3 * rolling, swing: Math.max(-0.3, Math.min(0.3, turning * 0.14)) };
    const now = this.beams.get(veh.id) ?? target;
    const ease = (from: number, to: number, seconds: number): number => from + (to - from) * Math.min(1, delta / seconds);
    return {
      glow: ease(now.glow, target.glow, target.glow > now.glow ? 0.2 : 0.45),
      reach: ease(now.reach, target.reach, 0.4),
      swing: ease(now.swing, target.swing, 0.2),
    };
  }
}

export const TOW_YARD_SIZE = v(34, 26);

/** Where a tow depot's yard sits: just outside the ring, clear of every road. */
export function towYardPose(slot: number, layout: Layout, c: Config): Pose {
  const lane = layout.laneWidth;
  const kerb = 3.5;
  const slotAngle = layout.moduleRingS(slot, c.moduleSlotCount) / layout.ringRadius;
  const half = mul(TOW_YARD_SIZE, 0.5);
  const corner = Math.hypot(half.x, half.y);
  const lanes: Vec2[] = [];
  for (const armItem of layout.arms) {
    for (const path of [layout.entry(armItem), layout.exit(armItem)]) {
      for (let s = 0; s <= path.length; s += 4) lanes.push(path.point(s));
    }
  }
  const isClear = (center: Vec2): boolean => {
    if (length(center) - half.y < layout.ringRadius + lane / 2 + kerb + 3) return false;
    for (const armItem of layout.arms) {
      const out = fromAngle(armItem.angle);
      const along = dot(center, out);
      const aside = Math.abs(dot(center, left(out)));
      if (along > 0 && aside - half.x < lane + kerb + 3) return false;
    }
    return lanes.every((p) => dist(p, center) >= corner + lane / 2);
  };
  const base = layout.ringRadius + lane / 2 + kerb + half.y + 4;
  for (let step = 0; step <= 60; step++) {
    for (const sign of step === 0 ? [1] : [1, -1]) {
      const angle = slotAngle + sign * step * 0.015;
      for (const out of [0, 12, 24]) {
        const center = mul(fromAngle(angle), base + out);
        if (isClear(center)) return { position: center, heading: angle + Math.PI / 2 };
      }
    }
  }
  return { position: mul(fromAngle(slotAngle), base + 40), heading: slotAngle + Math.PI / 2 };
}

const yardCache = new Map<string, Pose>();
function cachedYard(slot: number, layout: Layout, c: Config): Pose {
  const key = `${slot}|${layout.ringRadius}|${layout.arms.map((a) => a.slot).join(',')}`;
  let pose = yardCache.get(key);
  if (!pose) {
    pose = towYardPose(slot, layout, c);
    yardCache.set(key, pose);
  }
  return pose;
}

export const towYard = (slot: number, layout: Layout, c: Config): Vec2 => cachedYard(slot, layout, c).position;

export const SYNDICATE_BOSS = { paint: 'syndicate', stripe: 'coin', roof: null, finish: null } as const;
/** A Jackpot transporter: gilded and glittering, a prize you can see coming. */
export const JACKPOT_TRANSPORTER = { paint: 'coin', stripe: null, roof: null, finish: 'shinyGlitter' } as const;
export const SYNDICATE_ESCORT ={ paint: 'syndicateEscort', stripe: null, roof: 'syndicate', finish: null } as const;

/** Builds the game scene, roads and vehicles, as render items in world space. */
export const SceneBuilder = {
  /** `own`: the lane marked as yours; null marks none (multiplayer marks every lane itself). */
  /**
   * `own`: the lane marked as yours; null marks none. `link` (0…1): during a mode swipe the road
   * runs on towards the neighbouring map, `linkAngle` its way, so both roundabouts share one road.
   */
  addRoad(list: RenderList, layout: Layout, c: Config, own: Arm | null = layout.player, link = 0, linkAngle = 0): void {
    const lane = layout.laneWidth;
    const reach = 700;
    const from = list.items.length;
    // Asphalt grain over the whole road once it is drawn: the markings wear with it.
    const grain = list.grain;
    list.grain = 'asphalt';
    // Two lanes: the road grows inwards, the island shrinks.
    const width = lane * layout.lanes;
    const middle = layout.ringRadius - (lane * (layout.lanes - 1)) / 2;
    const roads = layout.arms.map((a) => ({ angle: a.angle, reach, marked: reach / 2 }));
    if (link > 0) {
      const { viewport, scale } = list.camera;
      const linkReach = middle + ((viewport.x * 1.6) / scale) * link;
      roads.push({ angle: linkAngle, reach: linkReach, marked: linkReach });
    }
    // The arms end in the ring, never run on through the island.
    const spans = roads.map((r) => ({ ...r, length: r.reach - middle, centre: mul(fromAngle(r.angle), (r.reach + middle) / 2) }));
    for (const r of spans) list.w(rect(r.centre, v(r.length, lane * 2 + 7), 0, r.angle), 'kerb');
    list.w(arc(v(0, 0), middle, width + 7, 0, TAU), 'kerb');
    for (const r of spans) list.w(rect(r.centre, v(r.length, lane * 2), 0, r.angle), 'surface');
    list.w(arc(v(0, 0), middle, width, 0, TAU), 'surface');
    if (layout.lanes > 1) {
      // The dashed line between the lanes.
      const r = layout.ringRadius - lane / 2;
      const dashes = Math.round((TAU * r) / 22);
      for (let k = 0; k < dashes; k++) list.w(arc(v(0, 0), r, 1.5, (k * TAU) / dashes, (k * TAU) / dashes + (TAU / dashes) * 0.55), 'marking', 0.8);
    }
    for (const r of roads) {
      const out = fromAngle(r.angle);
      let distance = layout.ringRadius + lane / 2 + 10;
      while (distance < r.marked) {
        const next = Math.min(distance + 16, r.marked);
        list.w(line(mul(out, distance), mul(out, next), 1.5), 'marking', 0.8);
        distance = next + 12;
      }
    }
    for (const a of layout.arms) {
      const entry = layout.entry(a);
      const mouth = entry.pose(entry.length - c.carLength * 1.5);
      const across = mul(right(fromAngle(mouth.heading)), lane / 2 - 3);
      for (let step = -1; step <= 1.0001; step += 0.66) {
        list.w(rect(add(mouth.position, mul(across, step)), v(3, 4), 1, mouth.heading), 'marking', 0.7);
      }
    }
    if (own) SceneBuilder.addLaneMark(list, layout, c, own, 'accent', 0.22);
    SceneBuilder.addModules(list, layout, c);
    list.grain = grain;
    // The island stays a calm surface: the combo and the prompts sit on it.
    list.w(circle(v(0, 0), layout.islandRadius + 3.5), 'kerb');
    list.w(circle(v(0, 0), layout.islandRadius), 'island');
    list.w(arc(v(0, 0), layout.islandRadius - 14, 1.5, 0, TAU), 'marking', 0.25);
    // The road never moves: the drawer keeps its picture (`RenderList.bake`).
    list.bake(from, 'road');
  },

  /**
   * Two lanes: an arrow on the road in front of your stop line says which lane your front car
   * is bound for, straight on into the outer lane or bending left across it into the inner one.
   */
  addLaneArrow(list: RenderList, world: World): void {
    const layout = world.layout;
    if (layout.lanes < 2) return;
    const front = world.queue.vehicles[0];
    const veh = front === undefined ? undefined : world.vehicle(front);
    if (!veh) return;
    const path = layout.entry(layout.player, veh.lane);
    const pts: Vec2[] = [];
    for (let k = 0; k <= 8; k++) pts.push(path.point(path.length * (0.12 + 0.5 * (k / 8))));
    for (let k = 1; k < pts.length; k++) list.w(line(pts[k - 1], pts[k], 2.4), 'accent', 0.45);
    const tip = path.pose(path.length * 0.62);
    const ahead = fromAngle(tip.heading);
    const side = mul(left(ahead), 4.5);
    list.w(polygon([add(tip.position, mul(ahead, 6)), add(tip.position, side), sub(tip.position, side)]), 'accent', 0.6);
  },

  /** A line along a lane's kerb, from the back of its queue to just past the stop line. */
  addLaneMark(list: RenderList, layout: Layout, c: Config, arm: Arm, color: ColorToken, opacity: number, width = 2): void {
    const stop = layout.stopPose(arm);
    const forward = fromAngle(stop.heading);
    const front = add(stop.position, mul(forward, c.carLength / 2 + 4));
    const across = mul(right(forward), layout.laneWidth / 2 - 2);
    list.w(line(add(sub(stop.position, mul(forward, c.queueSpacing * c.queueVisible)), across), add(front, across), width), color, opacity);
  },

  addModules(list: RenderList, layout: Layout, c: Config): void {
    const lane = layout.laneWidth;
    for (const [slot, module] of moduleEntries(c)) {
      const s = layout.moduleRingS(slot, c.moduleSlotCount);
      const zone = moduleZone(c, module);
      const radius = layout.ringRadius;
      const start = (s - zone.arc / 2) / radius;
      if (zone.arc > 0) list.w(arc(v(0, 0), radius, lane, start, start + zone.arc / radius), 'kerb', 0.5);
      const pose = layout.ring.pose(s);
      const across = mul(right(fromAngle(pose.heading)), lane / 2);
      const ahead = fromAngle(pose.heading);
      if (module === 'tollBooth') {
        // The barrier: a red and white arm across the lane, a booth at each kerb.
        for (const [from, to, color] of [[-1, -0.35, 'lightRed'], [-0.35, 0.35, 'primary'], [0.35, 1, 'lightRed']] as const) {
          list.w(line(add(pose.position, mul(across, from)), add(pose.position, mul(across, to)), 2.2), color, 0.95);
        }
        for (const side of [-1, 1]) {
          list.w(rect(add(pose.position, mul(across, side)), v(5, 5), 1.5, pose.heading), 'surface');
          list.w(rect(add(pose.position, mul(across, side)), v(3.5, 3.5), 1, pose.heading), MODULE_COLORS.tollBooth, 0.95);
        }
      } else if (module === 'speedCamera') {
        list.w(line(sub(pose.position, mul(across, 0.9)), add(pose.position, mul(across, 0.9)), 1.5), 'marking', 0.8);
        const mast = sub(pose.position, mul(across, 1.25));
        list.w(rect(mast, v(7, 5), 1.5, pose.heading), 'primary');
        list.w(circle(mast, 1.8), 'accentInk');
        list.w(circle(mast, 0.9), MODULE_COLORS.speedCamera);
        list.w(circle(add(mast, mul(ahead, -2.2)), 0.8), 'lightRed');
      } else if (module === 'detour') {
        const board = add(pose.position, mul(normalize(pose.position), lane * 1.4));
        const tail = sub(board, mul(ahead, 3.6));
        const tip = add(board, mul(ahead, 3.6));
        list.w(rect(board, v(13, 13), 1.8, pose.heading), 'primary');
        list.w(rect(board, v(11, 11), 1.2, pose.heading), MODULE_COLORS.detour);
        list.w(line(tail, tip, 2.2), 'primary');
        for (const side of [-1, 1]) list.w(line(tip, add(sub(tip, mul(ahead, 2.4)), mul(right(ahead), 2.4 * side)), 1.8), 'primary');
      } else if (module === 'billboard') {
        const board = add(pose.position, mul(normalize(pose.position), lane * 1.6));
        list.w(rect(board, v(3, 3), 0.5, pose.heading), 'surface');
        list.w(rect(board, v(25, 7), 1.5, pose.heading), 'primary');
        list.w(rect(board, v(23, 5), 1, pose.heading), MODULE_COLORS.billboard);
        list.w(line(add(board, mul(ahead, -9)), add(board, mul(ahead, 2)), 1.2), 'primary', 0.95);
        list.w(circle(add(board, mul(ahead, 8)), 1.7), 'accent');
      } else {
        const yardPose = cachedYard(slot, layout, c);
        const yard = yardPose.position;
        const heading = yardPose.heading;
        list.w(rect(yard, TOW_YARD_SIZE, 4, heading), 'kerb');
        list.w(rect(yard, sub(TOW_YARD_SIZE, v(4, 4)), 3, heading), 'surface');
        list.w(rect(add(yard, mul(fromAngle(heading), 7)), v(11, 7), 2, heading + 0.3), 'vehicleCarGraphite', 0.8);
        list.w(rect(sub(yard, mul(fromAngle(heading), 7)), v(12, 7), 2, heading), MODULE_COLORS.towDepot, 0.95);
      }
    }
  },

  /** Accessibility labels beside the special vehicles, in screen space so they stay readable. */
  addLabels(list: RenderList, world: World, alpha: number): void {
    for (const veh of world.vehicles) {
      if (veh.isCrashed) continue;
      const label = S.boss.label(veh.role) ?? S.hud.label(veh.type);
      if (!label) continue;
      const pose = interpolatedPose(veh, alpha);
      const color: ColorToken =
        veh.role === 'boss'
          ? 'coin'
          : veh.role === 'escort'
            ? 'muted'
            : veh.type === 'police' || isEmergency(veh.type)
              ? 'lightBlue'
              : veh.type === 'pickup'
                ? 'vehicleCriminal'
                : 'vehicleCargo';
      list.s(text(label, add(toScreen(list.camera, pose.position), v(0, -18)), 9, 'center', 'bold'), color, 0.95);
    }
  },

  addTowTrucks(list: RenderList, world: World): void {
    if (!Object.values(world.config.modules).includes('towDepot')) return;
    const duration = world.config.crashDuration;
    for (const wreck of world.vehicles) {
      if (wreck.phase.kind !== 'crashed') continue;
      const slot = towDepotCovering(world, wreck.position);
      if (slot === null) continue;
      const yard = towYard(slot, world.layout, world.config);
      const out = Ease.outCubic(Math.min(1, wreck.phase.elapsed / (duration * 0.5)));
      const target = add(wreck.position, mul(normalize(wreck.position), world.config.carWidth + 4));
      const at = add(yard, mul(sub(target, yard), out));
      const heading = Math.atan2(target.y - yard.y, target.x - yard.x);
      list.w(rect(at, v(16, 9), 2, heading), MODULE_COLORS.towDepot);
      list.w(rect(add(at, mul(fromAngle(heading), 5)), v(5, 8), 1.5, heading), 'surface');
    }
  },

  /**
   * Each car's shadow, falling away from the light (upper left, like the trees and houses):
   * a wide soft layer and a tighter, darker one right under the body.
   */
  addShadows(list: RenderList, world: World, alpha: number): void {
    const W = world.config.carWidth;
    for (const veh of world.vehicles) {
      if (veh.isCrashed) continue;
      const pose = interpolatedPose(veh, alpha);
      const L = CarArt.length(veh.type, world.config);
      list.w(rect(add(pose.position, v(2, -3)), v(L + 6, W + 6), Metrics.vehicleCornerRadius + 4, pose.heading), 'shadow', 0.45);
      list.w(rect(add(pose.position, v(1, -1.8)), v(L + 2, W + 2), Metrics.vehicleCornerRadius + 1.5, pose.heading), 'shadow', 0.9);
    }
  },

  /** `marks`: multiplayer dresses each player's cars (and the lorries they send) in their colour. */
  addVehicles(
    list: RenderList,
    world: World,
    alpha: number,
    carSkins: string[],
    finishTime: number | null,
    springTime: number | null,
    lamps: Lamps | null,
    marks: ((veh: Vehicle) => VehicleMark | null) | null = null,
  ): void {
    const chase = criminalVehicle(world) !== null;
    const fronts = new Set(world.seats.map((q) => q.vehicles[0]));
    for (const veh of world.vehicles) {
      if (veh.isCrashed) continue;
      const flashing = chase || veh.phase.kind !== 'queued';
      const mark = marks?.(veh) ?? null;
      let pose = interpolatedPose(veh, alpha);
      if (mark) {
        if (mark.lunge !== 0) pose = { position: add(pose.position, mul(fromAngle(pose.heading), mark.lunge)), heading: pose.heading };
        // A soft pool of the player's colour under the car: whose it is, even on a busy ring.
        const L = CarArt.length(veh.type, world.config);
        list.w(rect(pose.position, v(L + 7, world.config.carWidth + 7), Metrics.vehicleCornerRadius + 3.5, pose.heading), mark.color, 0.2 * mark.glow);
      }
      // The syndicate: a black boss car with a gold line, gunmetal escorts. Not a skin: they
      // must read as who they are.
      // Skins only dress plain cars: police, criminals, transporters and lorries keep the colours
      // that say what they are (a dispatched car turns fully into a police car).
      const look =
        veh.role === 'boss'
          ? SYNDICATE_BOSS
          : veh.role === 'escort'
            ? // The decoy and the kingpin dress their escorts like themselves; the shape and the ring still tell.
              world.config.bossDisguise
              ? SYNDICATE_BOSS
              : SYNDICATE_ESCORT
            : veh.id === world.jackpotVehicle && veh.type === 'transporter'
              ? JACKPOT_TRANSPORTER
              : isCarType(veh.type)
                ? lookFor(veh.id, carSkins)
                : null;
      CarArt.add(
        list,
        {
          id: veh.id,
          type: veh.type,
          pose,
          dents: veh.dents,
          lights: (veh.type === 'police' && flashing) || isEmergency(veh.type) ? world.time / CarArt.strobeCycle + (veh.id % 7) * 0.37 : null,
          brake: lamps ? lamps.brake(veh.id) : null,
          brakeGlow: veh.phase.kind !== 'queued' || fronts.has(veh.id),
          headlights: lamps ? lamps.headlights(veh.id) : 0,
          skin: look?.paint ?? null,
          stripe: look?.stripe ?? null,
          roof: mark?.roof ? mark.color : (look?.roof ?? null),
          finish: look?.finish ?? null,
          effect: look && 'effect' in look ? (look.effect ?? null) : null,
          finishTime,
          springTime,
        },
        world.config,
      );
    }
  },
};
