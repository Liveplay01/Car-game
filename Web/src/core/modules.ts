import { type RoadModule, moduleZone } from './config';
import type { Vehicle } from './vehicle';
import { type Vec2, length, angleOf, wrap, TAU } from './vec2';
import type { World } from './world';

/**
 * Modules on the ring (FOUNDATION.md 2.9): bought in the Street Builder, placed in one of a
 * fixed number of slots. Every module earns money on its own and costs flow in return.
 */

/** How fast traffic may drive at this point of the ring: roadworks and module zones. */
export function speedLimitAt(w: World, s: number): number {
  let limit = w.ringSpeed;
  const L = w.layout.ring.length;
  const start = w.roadworksRingS;
  if (start !== null && w.layout.ringDistance(start, s) <= w.config.roadworksArc) {
    limit = Math.min(limit, w.ringSpeed * w.config.roadworksSpeedFactor);
  }
  for (const [slotText, module] of Object.entries(w.config.modules)) {
    const zone = moduleZone(w.config, module);
    const centre = w.layout.moduleRingS(Number(slotText), w.config.moduleSlotCount);
    const ahead = w.layout.ringDistance(wrap(centre - zone.arc / 2, L), s);
    if (ahead >= 0 && ahead <= zone.arc) limit = Math.min(limit, w.ringSpeed * zone.speedFactor);
  }
  return limit;
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
  if (!Object.values(w.config.modules).includes('towDepot') || towDepotCovering(w, point) === null) return 1;
  return 1 / Math.max(0.1, 1 - w.config.towSpeedup);
}

/** Money a module pays for one vehicle passing it. */
function fee(w: World, module: RoadModule, veh: Vehicle): number {
  const c = w.config;
  switch (module) {
    case 'tollBooth':
      return veh.type === 'truck' || veh.type === 'tanker' ? c.tollPerTruck : 0;
    case 'speedCamera':
      return w.ringSpeed > c.ringSpeed * c.cameraLimitFactor ? c.cameraFine : 0;
    case 'towDepot':
      return 0;
  }
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
    const amount = fee(w, module, veh);
    if (amount <= 0) continue;
    w.score.money += amount;
    w.events.push({ type: 'modulePaid', module, slot, amount, point: w.layout.ring.pose(centre).position, time: now });
  }
}
