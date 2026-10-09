import type { World } from '../core/world';
import { isExplosive, isEmergency } from '../core/vehicle';
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
  coneReach: 2,
  coneSpread: 1.15,
  /** Many faint layers read as one soft gradient instead of visible steps. */
  coneLayers: 6,
  coneStrength: 0.022,
  /** Cars waiting behind the front car: dimmed, so the queue does not glare. */
  queueDim: 0.4,
  lampPool: [36, 29, 22, 15, 9],
  lampStrength: 0.022,

  add(list: RenderList, world: World, alpha: number, lamps: VehicleLamps | null, time: number | null): void {
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
      const brake = lamps ? lamps.brake(veh.id) : 0;
      const waiting = veh.phase.kind === 'queued' && veh.id !== world.queue.vehicles[0];
      const beam = lamps ? lamps.beam(veh.id, waiting) : Headlights.rest(waiting);
      const intensity = (NightLayer.queueDim + (1 - NightLayer.queueDim) * beam.glow) * (1 + 1.5 * flash);

      // Two soft cones that follow the car, brightest near it; the queue behind the front car dims.
      const look = { layers: NightLayer.coneLayers, reach: CarArt.length('car', c) * NightLayer.coneReach, spread: NightLayer.coneSpread, strength: NightLayer.coneStrength };
      Headlights.add(list, pose, L, W, look, beam, intensity, time, veh.id);
      Headlights.addBulbs(list, pose, L, W, intensity);

      // Tail lights: always on at night, brighter when braking.
      list.w(rect(worldOf(v(-L / 2 - 2.5, 0), pose), v(9, W * 1.3), 4.5, pose.heading), 'lightRed', 0.07 + 0.16 * brake);
      for (const y of [W * 0.3, -W * 0.3]) list.w(rect(worldOf(v(-L / 2 + 0.8, y), pose), v(1.4, W * 0.22), 0.5, pose.heading), 'lightRed', 0.55 + 0.45 * brake);

      // Lorries and the cash transporter: amber side markers show how long they are.
      if (L > c.carLength || veh.type === 'transporter') {
        for (const side of [1, -1]) {
          for (const x of [-0.42, 0, 0.42]) list.w(circle(worldOf(v(L * x, side * (W / 2 + 0.3)), pose), 0.8), 'vehicleCargo', 0.9);
        }
      }
      // The bomb lorry's warning light keeps blinking through the dark.
      if (veh.type === 'military' && time !== null) {
        const blink = Math.pow(Math.max(0, Math.sin(time * 2.2 * Math.PI * 2)), 3);
        list.w(circle(pose.position, 4 + 5 * blink), 'lightRed', 0.12 * blink);
      }
      if (isExplosive(veh.type)) list.w(circle(pose.position, 1.4), 'hazard', 0.8);

      // Police and ambulance strobes light up the street around them.
      if ((veh.type === 'police' && (chase || veh.phase.kind !== 'queued')) || isEmergency(veh.type)) {
        const spill = PoliceLights.spill(world.time / CarArt.strobeCycle + (veh.id % 7) * 0.37);
        const across = mul(left(fromAngle(pose.heading)), W * 0.9);
        if (spill.left > 0.01) list.w(circle(add(pose.position, across), L * 0.9), 'lightBlue', 0.1 * spill.left);
        if (spill.right > 0.01) list.w(circle(add(pose.position, mul(across, -1)), L * 0.9), 'lightBlue', 0.1 * spill.right);
      }
    }
  },

  /** One warm lamp beside each arm mouth, on the kerb to the right of the entry lane. */
  addStreetLamps(list: RenderList, world: World): void {
    const layout = world.layout;
    const lane = layout.laneWidth;
    for (const arm of layout.arms) {
      const out = fromAngle(arm.angle);
      const at = add(mul(out, layout.ringRadius + lane + 18), mul(left(out), lane + 10));
      NightLayer.lampPool.forEach((radius) => list.w(circle(at, radius), 'headlight', NightLayer.lampStrength));
      list.w(circle(at, 1.6), 'headlight', 0.9);
    }
  },
};
