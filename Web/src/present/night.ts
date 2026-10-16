import type { World } from '../core/world';
import type { Config } from '../core/config';
import type { Pose } from '../core/paths';
import { isExplosive, isEmergency, type VehicleType } from '../core/vehicle';
import { v, add, mul, left, fromAngle } from '../core/vec2';
import { type RenderList, rect, circle } from './render';
import { CarArt, PoliceLights, worldOf } from './carArt';
import { Headlights } from './headlights';
import { criminalVehicle } from '../core/specials';
import { interpolatedPose, type VehicleLamps } from './scene';

/**
 * Night shifts (higher levels): the city goes dark over road and cars, and the lights draw
 * the traffic. Headlights throw a cone ahead, tail lights mark the back, lorries carry amber
 * side markers, so the length and type of a vehicle still read without its paint. A few
 * street lamps light the arm mouths. Only the picture changes; the rules stay the same.
 */
export const NightLayer = {
  /** How dark the city gets; bodies stay faintly visible, so shapes still read up close. */
  darkness: 0.66,
  /** A blackout: no street lamps, and darker still; the lights of the cars are all there is. */
  blackoutDarkness: 0.76,
  /** Headlight cone: length ahead of the bumper and width at its far end, in car widths. */
  coneReach: 2.6,
  coneSpread: 1.15,
  /** Many faint layers read as one soft gradient instead of visible steps. */
  coneLayers: 9,
  coneStrength: 0.072,
  /** Cars waiting behind the front car: dimmed, so the queue does not glare. */
  queueDim: 0.4,
  /** How far the blue strobes tint the street around a siren (per side, at full flash). */
  strobeSpill: 0.22,
  /** Per layer, preserving the old total brightness while spreading it more gradually. */
  lampStrength: 0.016,

  /** The ground and projected beams are painted before cars, so bodies naturally occlude them. */
  addRoadLights(list: RenderList, world: World, alpha: number, lamps: VehicleLamps | null, time: number | null, layers?: number): void {
    const vp = list.camera.viewport;
    const blackout = world.config.blackout;
    list.s(rect(mul(vp, 0.5), vp), 'night', blackout ? NightLayer.blackoutDarkness : NightLayer.darkness);
    if (!blackout) NightLayer.addStreetLamps(list, world);
    const c = world.config;
    const W = c.carWidth;
    const chase = criminalVehicle(world) !== null;
    for (const veh of world.vehicles) {
      if (veh.isCrashed) continue;
      // The Phantom drives dark: no headlights, no tail lights. Only the chase ring shows it.
      if (veh.role === 'boss' && c.bossKind === 'phantom') continue;
      const pose = interpolatedPose(veh, alpha);
      const L = CarArt.length(veh.type, c);
      const flash = lamps ? lamps.headlights(veh.id) : 0;
      const waiting = veh.phase.kind === 'queued' && veh.id !== world.queue.vehicles[0];
      const beam = lamps ? lamps.beam(veh.id, waiting) : Headlights.rest(waiting);
      const intensity = (NightLayer.queueDim + (1 - NightLayer.queueDim) * beam.glow) * (1 + 1.5 * flash);

      // Two soft cones that follow the car, brightest near it; the queue behind the front car dims.
      // A waiting car's dimmed beam needs no fine steps.
      const look = { layers: waiting ? Math.min(3, layers ?? NightLayer.coneLayers) : layers ?? NightLayer.coneLayers, reach: CarArt.length('car', c) * NightLayer.coneReach, spread: NightLayer.coneSpread, strength: NightLayer.coneStrength };
      Headlights.add(list, pose, L, W, look, beam, intensity, time, veh.id);
      // Brake-light spill belongs on the road; the small red lenses are drawn over the car later.
      const brake = lamps ? lamps.brake(veh.id) : 0;
      list.w(rect(worldOf(v(-L / 2 - 2.5, 0), pose), v(9, W * 1.3), 4.5, pose.heading), 'lightRed', 0.07 + 0.16 * brake);
      // The coloured spill is on the ground and therefore sits under every car silhouette.
      if ((veh.type === 'police' && (chase || veh.phase.kind !== 'queued')) || isEmergency(veh.type)) {
        const spill = PoliceLights.spill(world.time / CarArt.strobeCycle + (veh.id % 7) * 0.37);
        const across = mul(left(fromAngle(pose.heading)), W * 0.9);
        if (spill.left > 0.01) list.w(circle(add(pose.position, across), L * 0.9), 'lightBlue', NightLayer.strobeSpill * spill.left);
        if (spill.right > 0.01) list.w(circle(add(pose.position, mul(across, -1)), L * 0.9), 'lightBlue', NightLayer.strobeSpill * spill.right);
      }
    }
  },

  /** Lamps physically mounted on cars go back on top of their own bodies after the road is drawn. */
  addVehicleLights(list: RenderList, world: World, alpha: number, lamps: VehicleLamps | null, time: number | null): void {
    const c = world.config;
    const W = c.carWidth;
    const chase = criminalVehicle(world) !== null;
    for (const veh of world.vehicles) {
      if (veh.isCrashed || (veh.role === 'boss' && c.bossKind === 'phantom')) continue;
      const pose = interpolatedPose(veh, alpha);
      const L = CarArt.length(veh.type, c);
      const brake = lamps ? lamps.brake(veh.id) : 0;
      const waiting = veh.phase.kind === 'queued' && veh.id !== world.queue.vehicles[0];
      const beam = lamps ? lamps.beam(veh.id, waiting) : Headlights.rest(waiting);
      const flash = lamps ? lamps.headlights(veh.id) : 0;
      const intensity = (NightLayer.queueDim + (1 - NightLayer.queueDim) * beam.glow) * (1 + 1.5 * flash);
      Headlights.addBulbs(list, pose, L, W, intensity);
      for (const y of [W * 0.3, -W * 0.3]) list.w(rect(worldOf(v(-L / 2 + 0.8, y), pose), v(1.4, W * 0.22), 0.5, pose.heading), 'lightRed', 0.55 + 0.45 * brake);
      if (L > c.carLength || veh.type === 'transporter') {
        for (const side of [1, -1]) {
          for (const x of [-0.42, 0, 0.42]) list.w(circle(worldOf(v(L * x, side * (W / 2 + 0.3)), pose), 0.8), 'vehicleCargo', 0.9);
        }
      }
      if (veh.type === 'military' && time !== null) {
        const blink = Math.pow(Math.max(0, Math.sin(time * 2.2 * Math.PI * 2)), 3);
        list.w(circle(pose.position, 4 + 5 * blink), 'lightRed', 0.12 * blink);
      }
      if (isExplosive(veh.type)) list.w(circle(pose.position, 1.4), 'hazard', 0.8);
      if ((veh.type === 'police' && (chase || veh.phase.kind !== 'queued')) || isEmergency(veh.type)) {
        const spill = PoliceLights.spill(world.time / CarArt.strobeCycle + (veh.id % 7) * 0.37);
        NightLayer.addBeacons(list, veh.type, pose, spill, L, c);
      }
    }
  },

  /** The roof bar shines through the dark, and the front and the rear flash on their own side, so the van reads from any angle. */
  addBeacons(list: RenderList, type: VehicleType, pose: Pose, spill: { left: number; right: number }, L: number, c: Config): void {
    const W = CarArt.width(type, c);
    const bar = CarArt.shape('lightBar', type, c).center;
    for (const [side, glow] of [[1, spill.left], [-1, spill.right]] as const) {
      if (glow <= 0.01) continue;
      const roof = worldOf(add(bar, v(0, side * W * 0.25)), pose);
      list.w(circle(roof, W * 1.1), 'lightBlue', 0.3 * glow);
      list.w(circle(roof, W * 0.35), 'primary', 0.75 * glow);
      for (const x of [L / 2 - 1.2, -L / 2 + 1.2]) {
        const at = worldOf(v(x, side * W * 0.3), pose);
        list.w(circle(at, W * 0.8), 'lightBlue', 0.35 * glow);
        list.w(rect(at, v(1.8, W * 0.3), 0.6, pose.heading), 'lightBlue', 0.95 * glow);
        list.w(circle(at, 0.7), 'primary', 0.8 * glow);
      }
    }
  },

  /** One warm lamp beside each arm mouth, on the kerb to the right of the entry lane. */
  addStreetLamps(list: RenderList, world: World): void {
    const layout = world.layout;
    const lane = layout.laneWidth;
    const from = list.items.length;
    for (const arm of layout.arms) {
      const out = fromAngle(arm.angle);
      const at = add(mul(out, layout.ringRadius + lane + 18), mul(left(out), lane + 10));
      Headlights.addStreetLamp(list, at, NightLayer.lampStrength);
    }
    list.bake(from, 'nightLamps', `${layout.ringRadius}|${lane}|${layout.arms.map((a) => a.slot).join(',')}`);
  },
};
