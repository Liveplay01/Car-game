import type { Arm } from './roundabout';
import { type Capsule, capsule, gap } from './collision';
import { Vehicle, type Waiting, isHeavy, isExplosive, mergeProfile } from './vehicle';
import { type Vec2, add, sub, mul, dot, cross, left, normalize, length, lengthSq, fromAngle, v, dist, wrap, clamp } from './vec2';
import type { World } from './world';
import { unitHashId } from './world';
import { criminalWrecked, transporterWrecked } from './specials';
import { isFreeForWarning } from './traffic';

/**
 * Explosives (Leo, 27.09.2026): the gas tanker in normal traffic and the military truck with
 * its bomb. The blast is an impulse on everything around it, like every crash.
 */
export type MilitaryPhase =
  | { kind: 'idle'; next: number }
  | { kind: 'warning'; arm: Arm; until: number }
  | { kind: 'arriving'; vehicle: number }
  | { kind: 'active'; vehicle: number; deadline: number }
  | { kind: 'leaving'; vehicle: number }
  | { kind: 'detonated' };

function closestOnSegment(a: Vec2, b: Vec2, p: Vec2): Vec2 {
  const ab = sub(b, a);
  const l = lengthSq(ab);
  if (l <= 1e-12) return a;
  const t = clamp(dot(sub(p, a), ab) / l, 0, 1);
  return add(a, mul(ab, t));
}

/** A live tanker or military truck just became a wreck: it goes up. */
export function explode(w: World, sourceId: number, now: number): void {
  const index = w.indexOf(sourceId);
  if (index < 0 || !isExplosive(w.vehicles[index].type)) return;
  const source = w.vehicles[index];
  const kind = source.type === 'military' ? 'bomb' : 'tanker';
  w.score.blasts++;
  const center = source.position;
  const c = w.config;
  const radius = kind === 'bomb' ? c.bombBlastRadius : c.tankerBlastRadius;
  const speed = kind === 'bomb' ? c.bombBlastSpeed : c.tankerBlastSpeed;
  tearApart(w, source);
  const wrecked: number[] = [];
  const chained: number[] = [];
  let flames = 0;
  let chain = 0;
  for (const veh of [...w.vehicles]) {
    if (veh.id === sourceId || veh.phase.kind === 'queued') continue;
    const hit = w.hitboxOf(veh);
    const nearest = closestOnSegment(hit.a, hit.b, center);
    const distance = Math.max(0, dist(nearest, center) - hit.radius);
    if (distance >= radius) continue;
    const falloff = kind === 'bomb' ? Math.max(0.45, 1 - distance / 260) : 1 - distance / radius;
    const direction = normalize(sub(nearest, center));
    const away = lengthSq(direction) === 0 ? left(fromAngle(veh.heading)) : direction;
    const point = sub(nearest, mul(away, hit.radius));
    const body = w.bodyOf(veh);
    const kick = mul(away, speed * (0.4 + 0.6 * falloff));
    body.velocity = add(body.velocity, kick);
    body.angularVelocity += (0.2 * cross(sub(point, body.position), kick) * body.mass) / body.inertia;
    body.angularVelocity += (unitHashId(veh.id) - 0.5) * 8 * falloff;
    w.addDent(veh, point, speed * falloff * 1.6);
    const wasLive = !veh.isCrashed;
    w.makeWreck(veh, point, body);
    if (!wasLive) continue;
    wrecked.push(veh.id);
    if (c.mayhem && w.isScoring) {
      const scored = w.scoreMayhem(now, true, isHeavy(veh.type));
      flames += scored.flames;
      chain = scored.chain;
    }
    if (isExplosive(veh.type)) chained.push(veh.id);
    if (veh.type === 'pickup') criminalWrecked(w, veh.id, point, now);
    if (veh.type === 'transporter') transporterWrecked(w, veh.id, point, now);
  }
  w.events.push({ type: 'explosion', kind, source: sourceId, point: center, radius, time: now, wrecked, flames, chain });
  if (kind === 'bomb') bombWentOff(w, now);
  for (const id of chained) explode(w, id, now);
}

/** The exploding vehicle itself: dented all round, and it jumps and spins where it stands. */
function tearApart(w: World, veh: Vehicle): void {
  const half = w.lengthOf(veh.type) / 2;
  const side = w.config.carWidth / 2;
  for (const corner of [v(half, side), v(half, -side), v(-half, side), v(-half, -side), v(0, side), v(0, -side)]) {
    w.addDent(veh, w.worldPoint(corner, veh), w.config.maxDent / w.config.dentPerImpact);
  }
  const body = w.bodyOf(veh);
  body.velocity = mul(body.velocity, 0.3);
  body.angularVelocity += (unitHashId(veh.id + 7) - 0.5) * 6;
  w.makeWreck(veh, veh.position, body);
}

function bombWentOff(w: World, now: number): void {
  w.military = { kind: 'detonated' };
  w.shift.detonated = true;
  if (!w.isScoring) return;
  w.endShift(w.config.mayhem ? 'completed' : 'struckOut', now);
}

export const reservedMilitaryArm = (w: World): Arm | null => (w.military.kind === 'warning' ? w.military.arm : null);

export function isMilitaryOverdue(w: World): boolean {
  return w.military.kind === 'active' && w.time >= w.military.deadline;
}

function canMilitaryLeave(w: World): boolean {
  const staying = w.vehicles.filter((x) => x.isBot && x.phase.kind === 'ring' && !x.phase.isLeaving).length;
  return staying >= w.config.minRingBots;
}

export const isEscorted = (w: World, id: number): boolean => w.military.kind === 'active' && w.military.vehicle === id;

export function activeMilitaryTruck(w: World): Vehicle | null {
  if (w.military.kind !== 'active') return null;
  const truck = w.vehicle(w.military.vehicle);
  return truck && !truck.isCrashed ? truck : null;
}

export function updateMilitary(w: World, now: number): void {
  const c = w.config;
  if (!w.isScoring) {
    const m = w.military;
    if (m.kind === 'active') {
      w.military = { kind: 'active', vehicle: m.vehicle, deadline: Math.min(m.deadline, now) };
      if (canMilitaryLeave(w)) w.military = { kind: 'leaving', vehicle: m.vehicle };
    }
    return;
  }
  if (w.shift.startedAt === null) return;
  if (!w.shift.acceptsTaps) {
    const m = w.military;
    if (m.kind === 'warning') w.military = { kind: 'idle', next: Infinity };
    else if (m.kind === 'arriving') {
      w.military = { kind: 'idle', next: Infinity };
      w.demoteToOrdinaryTraffic(m.vehicle, 'truck');
    }
  }
  const m = w.military;
  switch (m.kind) {
    case 'idle': {
      if (!w.shift.acceptsTaps || now < m.next || w.militaryCount >= c.militaryPerShift) return;
      const candidates = w.openAIArms.filter((arm) => isFreeForWarning(w, arm));
      if (candidates.length === 0) return;
      const arm = w.militaryRng.pick(candidates);
      w.military = { kind: 'warning', arm, until: now + c.militaryWarning };
      w.events.push({ type: 'militaryWarning', arm, time: now });
      return;
    }
    case 'warning': {
      const occupied = w.vehicles.some((x) => x.phase.kind === 'waiting' && x.phase.arm.index === m.arm.index);
      if (now < m.until || occupied) return;
      const waiting: Waiting = { kind: 'waiting', arm: m.arm, reaction: 0, approach: c.aiApproachDistance };
      const truck = new Vehicle(w.makeId(), 'military', 'ai', waiting, w.approachPose(waiting));
      w.vehicles.push(truck);
      w.militaryCount++;
      w.military = { kind: 'arriving', vehicle: truck.id };
      return;
    }
    case 'arriving': {
      const truck = w.vehicle(m.vehicle);
      if (!truck || truck.isCrashed) {
        w.military = { kind: 'idle', next: now + w.militaryRng.range(c.militaryInterval.lo, c.militaryInterval.hi) };
        return;
      }
      if (truck.phase.kind === 'ring') {
        const deadline = now + c.militaryTime;
        w.military = { kind: 'active', vehicle: m.vehicle, deadline };
        w.events.push({ type: 'militaryEntered', vehicle: m.vehicle, deadline });
      }
      return;
    }
    case 'active': {
      const truck = w.vehicle(m.vehicle);
      if (!truck || truck.isCrashed) {
        w.military = { kind: 'idle', next: now + w.militaryRng.range(c.militaryInterval.lo, c.militaryInterval.hi) };
        return;
      }
      if (isZoneBreached(w, truck)) {
        explode(w, m.vehicle, now);
        return;
      }
      if (now >= m.deadline && canMilitaryLeave(w)) w.military = { kind: 'leaving', vehicle: m.vehicle };
      return;
    }
    case 'leaving':
      if (!w.vehicle(m.vehicle)) w.military = { kind: 'idle', next: now + w.militaryRng.range(c.militaryInterval.lo, c.militaryInterval.hi) };
      return;
    case 'detonated':
      return;
  }
}

/** The zone as three short capsules along the ring, centred on the truck. */
export function militaryZone(w: World, ringS: number): Capsule[] {
  const third = w.config.militaryZoneArc / 3;
  return [-third, 0, third].map((offset) => {
    const pose = w.layout.ring.pose(wrap(ringS + offset, w.layout.ring.length));
    return capsule(pose.position, pose.heading, third + w.config.carWidth, w.config.carWidth);
  });
}

export function gapToZone(w: World, c: Capsule, ringS: number): number {
  let smallest = Infinity;
  for (const part of militaryZone(w, ringS)) smallest = Math.min(smallest, gap(c, part));
  return smallest;
}

function isZoneBreached(w: World, truck: Vehicle): boolean {
  if (truck.phase.kind !== 'ring') return false;
  const s = truck.phase.s;
  return w.vehicles.some((o) => o.id !== truck.id && !o.isCrashed && o.activeMerge !== null && gapToZone(w, w.hitboxOf(o), s) <= 0);
}

/** Where the truck's zone will be after `t` seconds; null without an active truck. */
export function predictedZoneS(w: World, t: number): number | null {
  const truck = activeMilitaryTruck(w);
  if (!truck || truck.phase.kind !== 'ring') return null;
  return truck.phase.s + (truck.phase.drive.speed ?? w.ringSpeed) * t;
}

/** The military truck does not arrive with anyone's middle inside its zone. */
export function joinsMilitaryZone(w: World, veh: Vehicle, arm: Arm): boolean {
  if (veh.type !== 'military') return false;
  const profile = mergeProfile(w.layout.entry(arm).length, w.config.mergeDuration, w.ringSpeed);
  const arrival = w.layout.entryRingS[arm.index];
  const apart = w.config.militaryZoneArc / 2 + 4;
  return w.vehicles.some((o) => {
    if (o.id === veh.id || o.isCrashed) return false;
    const s = w.virtualRingPosition(o, profile.duration);
    if (s === null) return false;
    const ahead = w.layout.ringDistance(arrival, s);
    return Math.min(ahead, w.layout.ring.length - ahead) < apart;
  });
}

export { length };
