import { type Config, type RoadModule, builtArmSlots, detourShareAt, gravity, moduleLevel, moduleZone, towSpeedupAt } from './config';
import type { Arm } from './roundabout';
import type { Vehicle } from './vehicle';
import { type Vec2, length, angleOf, wrap, TAU } from './vec2';
import type { World } from './world';

/**
 * Modules on the ring (FOUNDATION.md 2.9): bought in the Street Builder, placed in one of a
 * fixed number of slots. Every module earns money on its own and costs flow in return.
 */

/** A stretch of the ring that slows traffic: where it starts, how long it is, and the share of the ring's speed. */
interface Zone {
  start: number;
  arc: number;
  factor: number;
}

const zoneLists = new WeakMap<World, Zone[]>();

/** The slowing stretches of a world, worked out once: modules and roadworks do not change during a shift. */
function zonesOf(w: World): Zone[] {
  let zones = zoneLists.get(w);
  if (!zones) {
    zones = [];
    const works = w.roadworks;
    if (works) zones.push({ start: works.start, arc: works.arc, factor: w.config.roadworksSpeedFactor });
    for (const [slotText, module] of Object.entries(w.config.modules)) {
      const zone = moduleZone(w.config, module);
      if (zone.speedFactor >= 1) continue;
      const centre = w.layout.moduleRingS(Number(slotText), w.config.moduleSlotCount);
      zones.push({ start: wrap(centre - zone.arc / 2, w.layout.ring.length), arc: zone.arc, factor: zone.speedFactor });
    }
    zoneLists.set(w, zones);
  }
  return zones;
}

/** How fast traffic may drive at this point of the ring: roadworks and module zones. */
export function speedLimitAt(w: World, s: number): number {
  let limit = w.ringSpeed;
  for (const zone of zonesOf(w)) {
    const ahead = w.layout.ringDistance(zone.start, s);
    if (ahead >= 0 && ahead <= zone.arc) limit = Math.min(limit, w.ringSpeed * zone.factor);
  }
  return limit;
}

/** The sampling step of a forecast, in seconds. */
const FORECAST_STEP = 0.05;
/** How far ahead (seconds of driving) a driver reads the road for a slower stretch, and how often it looks. */
const FORESIGHT = 0.8;
const PLAN_SPACING = 20;

/**
 * How far a car at `s` doing `speed` gets in `t` seconds when a zone slows it on the way: it eases
 * down to the limit like any driver (`drive`). Without zones, or below the limit, it is `speed * t`.
 */
export function travelAhead(w: World, s: number, speed: number, t: number): number {
  const zones = zonesOf(w);
  if (zones.length === 0) return speed * t;
  const easing = w.config.driverAcceleration * gravity(w.config);
  const circumference = w.layout.ring.length;
  let travelled = 0;
  let v = speed;
  for (let left = t; left > 1e-9; left -= FORECAST_STEP) {
    const dt = Math.min(FORECAST_STEP, left);
    const limit = speedLimitAt(w, wrap(s + travelled, circumference));
    if (v > limit) v = Math.max(limit, v - easing * dt);
    travelled += v * dt;
  }
  return travelled;
}

/**
 * The speed the traffic behind should plan with for a car at `s` doing `speed`: what it will be
 * slowed to by a zone it is about to enter. Drivers read the road ahead and do not wait for the
 * brake lights (a follower seeing only the car in front braked too late at the toll and the roadworks).
 */
export function plannedSpeed(w: World, s: number, speed: number): number {
  if (zonesOf(w).length === 0) return speed;
  const circumference = w.layout.ring.length;
  let planned = Math.min(speed, speedLimitAt(w, s));
  for (let d = PLAN_SPACING; d <= speed * FORESIGHT; d += PLAN_SPACING) planned = Math.min(planned, speedLimitAt(w, wrap(s + d, circumference)));
  return planned;
}

/** The tow depot whose zone covers a point on or near the ring, if there is one. */
export function towDepotCovering(w: World, point: Vec2): number | null {
  const c = w.config;
  const radius = w.layout.ringRadius;
  if (Math.abs(length(point) - radius) > c.laneWidth * 2) return null;
  const s = wrap(angleOf(point), TAU) * radius;
  const L = w.layout.ring.length;
  const slots = Object.entries(c.modules)
    .filter(([, m]) => m === 'towDepot')
    .map(([slot]) => Number(slot))
    .sort((a, b) => a - b);
  for (const slot of slots) {
    const centre = w.layout.moduleRingS(slot, c.moduleSlotCount);
    if (w.layout.ringDistance(wrap(centre - c.towZoneArc / 2, L), s) <= c.towZoneArc) return slot;
  }
  return null;
}

/** How fast a wreck at `point` ages towards being cleared: 1, or faster by the depot. */
export function wreckClearRate(w: World, point: Vec2): number {
  const slot = towDepotCovering(w, point);
  if (slot === null) return 1;
  return 1 / Math.max(0.1, 1 - towSpeedupAt(w.config, moduleLevel(w.config, slot)));
}

/** Money a module pays for one vehicle passing it; every level pays one more times the base. */
function fee(w: World, module: RoadModule, veh: Vehicle, level: number): number {
  const c = w.config;
  switch (module) {
    case 'tollBooth':
      return veh.type === 'truck' || veh.type === 'tanker' ? c.tollPerTruck * level : 0;
    case 'speedCamera':
      return w.ringSpeed > c.ringSpeed * c.cameraLimitFactor ? c.cameraFine * level : 0;
    case 'billboard':
      return c.billboardPerCar * level;
    case 'towDepot':
    case 'detour':
      return 0;
  }
}

/**
 * The arm slot a detour sign in module `slot` sends cars to: the first exit ahead of it, as long as
 * that exit comes before the player's own arm. Where no exit lies between the sign and the player,
 * or no arm joins upstream of it, there is nobody to turn around and the sign does nothing: null.
 * From the angles alone, so the Street Builder shows the same exit the traffic takes.
 */
export function detourArmSlot(c: Config, slot: number): number | null {
  const sign = (TAU * (slot + 0.5)) / Math.max(1, c.moduleSlotCount);
  const count = Math.max(3, c.armSlotCount);
  const exitAt = (arm: number): number => -Math.PI / 2 + (arm * TAU) / count - c.mergeAngle;
  const entryAt = (arm: number): number => -Math.PI / 2 + (arm * TAU) / count + c.mergeAngle;
  const sincePlayer = wrap(sign - entryAt(0));
  if (sincePlayer > TAU - 2 * c.mergeAngle) return null;
  const arms = builtArmSlots(c).filter((arm) => arm !== 0);
  if (!arms.some((arm) => wrap(sign - entryAt(arm)) < sincePlayer)) return null;
  let best: number | null = null;
  let nearest = wrap(exitAt(0) - sign);
  for (const arm of arms) {
    const ahead = wrap(exitAt(arm) - sign);
    if (ahead < nearest) {
      nearest = ahead;
      best = arm;
    }
  }
  return best;
}

/**
 * A car about to join at `arm` meets every detour sign on its way: if the sign's exit comes
 * before the one it planned, the sign turns it there with the sign's chance, and it forgets its laps.
 * Rolled only when there is a sign, so a ring without one draws what it always did.
 */
export function detourExit(w: World, arm: Arm, planned: Arm, laps: number, lane: number): Arm | null {
  const c = w.config;
  const layout = w.layout;
  const plannedDistance = layout.ringDistanceArms(arm, planned, lane) + laps * layout.ring.length;
  const entry = layout.entryS(arm, lane);
  const signs: { slot: number; at: number; exit: Arm }[] = [];
  for (const [slotText, module] of Object.entries(c.modules)) {
    if (module !== 'detour') continue;
    const slot = Number(slotText);
    const target = detourArmSlot(c, slot);
    const exit = layout.arms.find((a) => a.slot === target);
    if (!exit || exit.index === arm.index) continue;
    const at = layout.ringDistance(entry, layout.moduleRingS(slot, c.moduleSlotCount));
    if (at > layout.ringDistanceArms(arm, exit, lane) || layout.ringDistanceArms(arm, exit, lane) >= plannedDistance) continue;
    signs.push({ slot, at, exit });
  }
  for (const sign of signs.sort((a, b) => a.at - b.at)) {
    if (w.rng.unit() < detourShareAt(c, moduleLevel(c, sign.slot))) return sign.exit;
  }
  return null;
}

/** Charges every module a vehicle drove past in this step. */
export function chargeModules(w: World, veh: Vehicle, s: number, travelled: number, now: number): void {
  const c = w.config;
  if (travelled <= 0 || veh.isCrashed || veh.type === 'pickup') return;
  const entries = Object.entries(c.modules);
  if (entries.length === 0) return;
  if (w.shift.startedAt === null || w.shiftTime(now) >= c.moduleEarningSeconds) return;
  for (const [slotText, module] of entries) {
    const slot = Number(slotText);
    const centre = w.layout.moduleRingS(slot, c.moduleSlotCount);
    const ahead = w.layout.ringDistance(s, centre);
    if (ahead < 0 || ahead >= travelled) continue;
    const amount = fee(w, module, veh, moduleLevel(c, slot));
    if (amount <= 0) continue;
    w.score.money += amount;
    w.events.push({ type: 'modulePaid', module, slot, amount, point: w.layout.ring.pose(centre).position, time: now });
  }
}
