import type { Config } from '../core/config';
import type { Dent, VehicleType } from '../core/vehicle';
import { isCarType, isExplosive } from '../core/vehicle';
import type { Pose } from '../core/paths';
import { type Vec2, v, add, sub, mul, dist, length, fromAngle, lerpV } from '../core/vec2';
import { type RenderList, rect, circle, line, polygon, Ease, Metrics, unitHash } from './render';
import type { ColorToken } from './theme';
import { type Finish, isShiny, glitters } from './skins';

/** Rotates a vector counter-clockwise. */
export const rotated = (p: Vec2, a: number): Vec2 => v(p.x * Math.cos(a) - p.y * Math.sin(a), p.x * Math.sin(a) + p.y * Math.cos(a));

/** A local point of the car in world space. */
export const worldOf = (local: Vec2, pose: Pose): Vec2 => add(pose.position, rotated(local, pose.heading));

export type Part =
  | 'frontBumper'
  | 'rearBumper'
  | 'hood'
  | 'windscreen'
  | 'rearWindow'
  | 'leftMirror'
  | 'rightMirror'
  | 'frontLeftWheel'
  | 'frontRightWheel'
  | 'rearLeftWheel'
  | 'rearRightWheel'
  | 'roof'
  | 'lightBar'
  | 'bed'
  | 'cargo'
  | 'hazard';

export interface Shape {
  center: Vec2;
  size: Vec2;
  radius: number;
  color: ColorToken;
  breaksAt: number;
  reach: number;
  visible: boolean;
}

const PAINTS: ColorToken[] = ['vehicleCar', 'vehicleCarSilver', 'vehicleCarGraphite', 'vehicleCarSand'];

function paintIndex(id: number): number {
  let h = Math.imul(id | 0, 0x9e3779b9);
  h ^= h >>> 15;
  return (h >>> 0) % PAINTS.length;
}

/** The soft-body layer of a takedown: the metal gives way, springs back and keeps a rest dent. */
export const SoftBody = {
  peak: 1.6,
  factor(age: number): number {
    if (age < 0) return 1;
    if (age < 0.03) return (0.4 * age) / 0.03;
    if (age < 0.12) {
      const x = (age - 0.03) / 0.09;
      return 0.4 + (SoftBody.peak - 0.4) * x * x * (3 - 2 * x);
    }
    const t = age - 0.12;
    return 1 + (SoftBody.peak - 1) * Math.exp(-t / 0.08) * Math.cos(t * 25);
  },
  dents(dents: Dent[], type: VehicleType, time: number | null): Dent[] {
    if (time === null || !(type === 'pickup' || type === 'police')) return dents;
    return dents.map((d) => ({ ...d, depth: d.depth * SoftBody.factor(time - d.time) }));
  },
};

/** The police light bar (`PoliceLights.swift`): six LEDs, changing patterns that cross-fade. */
export const PoliceLights = {
  perSide: 3,
  count: 6,
  cyclesPerPattern: 2,
  crossFade: 0.15,
  spillStep: 0.025,

  pattern: (phase: number): number => Math.floor(Math.max(phase, 0) / PoliceLights.cyclesPerPattern) % 3,

  flash(t: number, fade = 0.07): number {
    if (t < 0) return 0;
    const rise = 0.022;
    return t < rise ? Ease.outCubic(t / rise) : Math.exp(-(t - rise) / fade);
  },

  ledsOf(pattern: number, t: number): number[] {
    const half = CarArt.strobeCycle / 2;
    const side = (i: number): [number, number] => (i < 3 ? [t, i] : [t - half, 5 - i]);
    if (pattern === 0) {
      return [0, 1, 2, 3, 4, 5].map((i) => {
        const [s, k] = side(i);
        const delay = k * 0.012;
        return Math.max(PoliceLights.flash(s - delay), PoliceLights.flash(s - 0.13 - delay));
      });
    }
    if (pattern === 2) {
      return [0, 1, 2, 3, 4, 5].map((i) => {
        const [s, k] = side(i);
        const delay = k * 0.008;
        return Math.max(...[0, 0.085, 0.17].map((o) => PoliceLights.flash(s - o - delay, 0.045)));
      });
    }
    const x = t / CarArt.strobeCycle;
    const there = x < 0.5 ? x * 2 : 2 - x * 2;
    const position = Ease.inOutSine(there) * 5;
    return [0, 1, 2, 3, 4, 5].map((i) => {
      const d = i - position;
      return Math.exp((-d * d) / 0.9);
    });
  },

  leds(phaseIn: number): number[] {
    const phase = Math.max(phaseIn, 0);
    const current = PoliceLights.pattern(phase);
    const inPattern = phase % PoliceLights.cyclesPerPattern;
    const cycleTime = (phase % 1) * CarArt.strobeCycle;
    const lit = PoliceLights.ledsOf(current, cycleTime);
    const blendStart = PoliceLights.cyclesPerPattern - PoliceLights.crossFade;
    if (inPattern <= blendStart) return lit;
    const upcoming = PoliceLights.ledsOf((current + 1) % 3, cycleTime);
    const w = Ease.smoothstep((inPattern - blendStart) / PoliceLights.crossFade);
    return lit.map((a, i) => a * (1 - w) + upcoming[i] * w);
  },

  sides(phase: number): { left: number; right: number } {
    const lit = PoliceLights.leds(phase);
    return { left: Math.max(lit[0], lit[1], lit[2]), right: Math.max(lit[3], lit[4], lit[5]) };
  },

  spill(phase: number): { left: number; right: number } {
    let left = 0;
    let right = 0;
    let total = 0;
    for (let k = 0; k < 5; k++) {
      const weight = 1 - k / 5;
      const s = PoliceLights.sides(phase - (k * PoliceLights.spillStep) / CarArt.strobeCycle);
      left += s.left * weight;
      right += s.right * weight;
      total += weight;
    }
    return { left: left / total, right: right / total };
  },
};

export interface CarDraw {
  id: number;
  type: VehicleType;
  pose: Pose;
  dents: Dent[];
  char?: number;
  opacity?: number;
  /** Phase of the flashing police lights; null when off. */
  lights?: number | null;
  brake?: number | null;
  brakeGlow?: boolean;
  headlights?: number;
  skin?: ColorToken | null;
  stripe?: ColorToken | null;
  roof?: ColorToken | null;
  finish?: Finish | null;
  finishTime?: number | null;
  springTime?: number | null;
}

/** How a vehicle looks and how it breaks (`CarArt.swift`). */
export const CarArt = {
  strobeCycle: 0.8,

  bodyColor(type: VehicleType, id = 0, skin: ColorToken | null = null): ColorToken {
    if (skin) return skin;
    switch (type) {
      case 'car':
        return PAINTS[paintIndex(id)];
      case 'sportsCar':
        return 'vehicleSports';
      case 'compact':
        return 'vehicleCompact';
      case 'van':
        return 'vehicleVan';
      case 'truck':
        return 'vehicleTruck';
      case 'police':
        return 'vehiclePolice';
      case 'pickup':
        return 'vehicleCriminal';
      case 'transporter':
        return 'vehicleArmor';
      case 'tanker':
        return 'vehicleTanker';
      case 'military':
        return 'vehicleMilitary';
      case 'ambulance':
        return 'vehicleAmbulance';
    }
  },

  parts(type: VehicleType): Part[] {
    const common: Part[] = ['frontBumper', 'rearBumper', 'hood', 'windscreen', 'leftMirror', 'rightMirror', 'frontLeftWheel', 'frontRightWheel', 'rearLeftWheel', 'rearRightWheel'];
    switch (type) {
      case 'car':
      case 'sportsCar':
      case 'compact':
      case 'van':
        return [...common, 'rearWindow'];
      case 'truck':
      case 'tanker':
      case 'military':
        return ['cargo', ...common];
      case 'police':
        return [...common, 'rearWindow', 'roof', 'lightBar'];
      case 'pickup':
        return ['bed', ...common, 'rearWindow'];
      case 'transporter':
        return ['cargo', ...common, 'hazard'];
      case 'ambulance':
        return [...common, 'rearWindow', 'lightBar'];
    }
  },

  length(type: VehicleType, c: Config): number {
    switch (type) {
      case 'truck':
      case 'tanker':
      case 'military':
        return c.truckLength;
      case 'sportsCar':
        return c.sportsCarLength;
      case 'compact':
        return c.compactLength;
      case 'van':
        return c.vanLength;
      case 'ambulance':
        return c.ambulanceLength;
      default:
        return c.carLength;
    }
  },

  shape(part: Part, type: VehicleType, c: Config): Shape {
    const l = CarArt.length(type, c);
    const w = c.carWidth;
    const body = CarArt.bodyColor(type);
    const lorry = type === 'truck' || type === 'tanker' || type === 'military';
    // The ambulance is built like a van: a short cab, then the long box.
    const boxy = type === 'van' || type === 'ambulance';
    const S = (cx: number, cy: number, sx: number, sy: number, radius: number, color: ColorToken, breaksAt: number, reach: number, visible: boolean): Shape => ({
      center: v(cx, cy),
      size: v(sx, sy),
      radius,
      color,
      breaksAt,
      reach,
      visible,
    });
    switch (part) {
      case 'frontBumper':
        return S(l / 2 - 1, 0, 2, w - 3, 1, 'vehicleTrim', 2, 6, true);
      case 'rearBumper':
        return S(-l / 2 + 1, 0, 2, w - 3, 1, 'vehicleTrim', 2, 6, true);
      case 'hood':
        return S(l * 0.3, 0, l * 0.3, w - 3, 1.5, body, 3.5, 8, false);
      case 'windscreen': {
        const x = lorry ? l * 0.39 : type === 'transporter' ? l * 0.33 : boxy ? l * 0.3 : l * 0.12;
        const len = lorry ? l * 0.1 : type === 'transporter' ? l * 0.13 : boxy ? l * 0.14 : type === 'compact' ? l * 0.26 : l * 0.22;
        return S(x, 0, len, w * 0.74, 2, 'vehicleGlass', 2.5, 9, true);
      }
      case 'rearWindow': {
        const x = type === 'pickup' ? -l * 0.02 : boxy ? -l * 0.4 : type === 'compact' ? -l * 0.27 : -l * 0.3;
        const len = type === 'pickup' ? l * 0.07 : boxy ? l * 0.06 : l * 0.13;
        return S(x, 0, len, w * 0.66, 1.5, 'vehicleGlass', 2.5, 7, true);
      }
      case 'leftMirror':
        return S(l * 0.06, w / 2 + 0.8, 2, 1.6, 0.6, body, 0.8, 5, true);
      case 'rightMirror':
        return S(l * 0.06, -w / 2 - 0.8, 2, 1.6, 0.6, body, 0.8, 5, true);
      case 'frontLeftWheel':
      case 'frontRightWheel':
      case 'rearLeftWheel':
      case 'rearRightWheel': {
        const x = part === 'frontLeftWheel' || part === 'frontRightWheel' ? l * 0.3 : -l * 0.3;
        const y = part === 'frontLeftWheel' || part === 'rearLeftWheel' ? w / 2 - 1.5 : -w / 2 + 1.5;
        return S(x, y, 5, 2.4, 1, 'vehicleTire', 4, 5, false);
      }
      case 'roof':
        return S(-l * 0.11, 0, l * 0.24, w * 0.8, 2, 'vehiclePoliceRoof', Infinity, 0, true);
      case 'lightBar':
        // The ambulance carries its lights on the front edge of the box.
        return S(type === 'ambulance' ? l * 0.17 : -l * 0.07, 0, 2.8, w * 0.8, 1, 'lightBlue', 2.5, 8, true);
      case 'bed':
        return S(-l * 0.26, 0, l * 0.4, w - 3, 1.5, 'vehicleBed', Infinity, 0, true);
      case 'cargo':
        if (type === 'truck') return S(-l * 0.14, 0, l * 0.62, w + 2, 2, 'vehicleTruckBox', 4, 9, true);
        if (type === 'tanker') return S(-l * 0.14, 0, l * 0.64, w + 1, (w + 1) / 2, 'vehicleTank', 4, 9, true);
        if (type === 'military') return S(-l * 0.14, 0, l * 0.62, w + 1, 1.5, 'vehicleMilitaryBox', 4, 9, true);
        return S(-l * 0.13, 0, l * 0.64, w - 2, 1.5, 'vehicleArmorBox', 4, 9, true);
      case 'hazard':
        return S(l * 0.2, 0, 2.2, w * 0.42, 1, 'hazard', 2.5, 6, true);
    }
  },

  isGlass: (p: Part): boolean => p === 'windscreen' || p === 'rearWindow',

  isBroken(part: Part, type: VehicleType, dents: Dent[], c: Config): boolean {
    const s = CarArt.shape(part, type, c);
    return dents.some((d) => d.depth >= s.breaksAt && dist(d.point, s.center) <= s.reach + s.size.x / 2);
  },

  outline(type: VehicleType, c: Config): Vec2[] {
    const hl = CarArt.length(type, c) / 2;
    const hw = c.carWidth / 2;
    const r = Metrics.vehicleCornerRadius;
    const corners = [v(hl - r, hw - r), v(-hl + r, hw - r), v(-hl + r, -hw + r), v(hl - r, -hw + r)];
    const points: Vec2[] = [];
    corners.forEach((corner, index) => {
      const start = (index * Math.PI) / 2;
      for (let k = 0; k <= 5; k++) points.push(add(corner, mul(fromAngle(start + ((Math.PI / 2) * k) / 5), r)));
      const next = corners[(index + 1) % 4];
      const from = add(corner, mul(fromAngle(start + Math.PI / 2), r));
      const to = add(next, mul(fromAngle(start + Math.PI / 2), r));
      const count = index % 2 === 0 ? 5 : 2;
      for (let k = 1; k <= count; k++) points.push(lerpV(from, to, k / (count + 1)));
    });
    return points;
  },

  push(point: Vec2, dents: Dent[]): number {
    let total = 0;
    for (const d of dents) {
      const radius = 4 + d.depth * 1.5;
      const dd = dist(point, d.point);
      if (dd >= radius) continue;
      const x = 1 - (dd * dd) / (radius * radius);
      total += d.depth * x * x;
    }
    return total;
  },

  deformed(point: Vec2, dents: Dent[], c: Config, crumple = 0): Vec2 {
    const amount = CarArt.push(point, dents);
    if (amount <= 0.01) return point;
    const reach = Math.max(0, c.carLength / 2 - c.carWidth / 2);
    const anchor = v(Math.min(Math.max(point.x, -reach), reach), 0);
    const inward = sub(anchor, point);
    const d = length(inward);
    if (d <= 1e-6) return point;
    const m = Math.min(amount + crumple * Math.min(amount, 1), d * 0.7);
    return add(point, mul(inward, m / d));
  },

  deformedOutline(type: VehicleType, dents: Dent[], c: Config): Vec2[] {
    return CarArt.outline(type, c).map((p, i) => CarArt.deformed(p, dents, c, i % 2 === 0 ? 0.35 : -0.35));
  },

  /** A vehicle, intact or wrecked: the dented body, charred as it burns, parts, glass, lights. */
  add(list: RenderList, d: CarDraw, c: Config): void {
    const type = d.type;
    const pose = d.pose;
    const opacity = d.opacity ?? 1;
    const char = d.char ?? 0;
    const dents = SoftBody.dents(d.dents, type, d.springTime ?? null);
    const body = CarArt.bodyColor(type, d.id, d.skin ?? null);
    const paintedInThisCar = CarArt.bodyColor(type, 0, d.skin ?? null);
    const L = CarArt.length(type, c);
    const W = c.carWidth;
    const lights = d.lights ?? null;

    if (lights !== null && (type === 'police' || type === 'ambulance')) {
      const spill = PoliceLights.spill(lights);
      const bar = CarArt.shape('lightBar', type, c).center;
      const halo = Math.max(spill.left, spill.right);
      if (halo > 0.01) {
        list.w(circle(worldOf(bar, pose), L * 1.1), 'lightBlue', opacity * 0.03 * halo);
        list.w(circle(worldOf(bar, pose), L * 0.8), 'lightBlue', opacity * 0.035 * halo);
      }
      const layers = 5;
      for (const [y, glow] of [
        [W * 0.7, spill.left],
        [-W * 0.7, spill.right],
      ] as [number, number][]) {
        if (glow <= 0.01) continue;
        for (let layer = 0; layer < layers; layer++) {
          const k = layer / (layers - 1);
          const size = v(L * (1.5 - 0.85 * k), W * (2.0 - 1.35 * k));
          list.w(rect(worldOf(add(bar, v(0, y * (1 - 0.25 * k))), pose), size, Math.min(size.x, size.y) / 2, pose.heading), 'lightBlue', opacity * 0.045 * glow);
        }
      }
    }

    const brake = d.brake ?? null;
    if (brake !== null && brake > 0.01 && (d.brakeGlow ?? true)) {
      list.w(rect(worldOf(v(-L / 2 - 2.5, 0), pose), v(9, W * 1.3), 4.5, pose.heading), 'lightRed', opacity * 0.16 * brake);
    }
    const head = d.headlights ?? 0;
    if (head > 0.01) list.w(rect(worldOf(v(L / 2 + 8, 0), pose), v(16, W * 1.4), 6, pose.heading), 'primary', opacity * 0.28 * head);

    if (dents.length === 0) {
      list.w(rect(pose.position, v(L + 2.5, W + 2.5), Metrics.vehicleCornerRadius + 1, pose.heading), 'kerb', opacity);
      list.w(rect(pose.position, v(L, W), Metrics.vehicleCornerRadius, pose.heading), body, opacity);
    } else {
      const local = CarArt.deformedOutline(type, dents, c);
      list.w(polygon(local.map((p) => worldOf(mul(p, 1.1), pose))), 'kerb', opacity);
      const outline = local.map((p) => worldOf(p, pose));
      list.w(polygon(outline), body, opacity * (1 - char));
      if (char > 0) list.w(polygon(outline), 'wreck', opacity * char);
      if (CarArt.isBroken('hood', type, dents, c)) {
        const bay = CarArt.shape('hood', type, c);
        list.w(rect(worldOf(CarArt.deformed(bay.center, dents, c), pose), mul(bay.size, 0.85), 1, pose.heading), 'vehicleTire', opacity);
      }
    }

    if (d.roof && isCarType(type) && dents.length === 0) {
      const front = CarArt.shape('windscreen', type, c);
      const back = CarArt.shape('rearWindow', type, c);
      const from = back.center.x - back.size.x / 2 - 0.5;
      const to = front.center.x + front.size.x / 2 - 1;
      list.w(rect(worldOf(v((from + to) / 2, 0), pose), v(to - from, W * 0.8), 2, pose.heading), d.roof, opacity);
    }

    for (const part of CarArt.parts(type)) {
      const shape = CarArt.shape(part, type, c);
      if (!shape.visible) continue;
      const broken = dents.length > 0 && CarArt.isBroken(part, type, dents, c);
      if (broken && !CarArt.isGlass(part)) continue;
      const center = dents.length === 0 ? shape.center : CarArt.deformed(shape.center, dents, c);
      const twist = dents.length === 0 ? 0 : Math.min(CarArt.push(shape.center, dents), 3) * 0.08;
      const rotation = pose.heading + twist;
      const partOpacity = opacity * (broken ? 0.45 : 1);
      const color = shape.color === paintedInThisCar || (part === 'cargo' && type === 'transporter' && d.skin) ? body : shape.color;
      if (part === 'lightBar') {
        CarArt.lightBar(list, shape, center, rotation, pose, broken ? null : lights, partOpacity, c);
        continue;
      }
      list.w(rect(worldOf(center, pose), shape.size, shape.radius, rotation), color, partOpacity);
      if (part === 'bed') {
        for (const x of [-0.2, 0.2]) {
          const rib = add(center, v(shape.size.x * x, 0));
          list.w(rect(worldOf(rib, pose), v(1, shape.size.y), 0.4, rotation), body, partOpacity);
        }
      }
      if (broken && part === 'windscreen') {
        const half = mul(shape.size, 0.5);
        const cracks: [Vec2, Vec2][] = [
          [v(half.x, half.y * 0.2), v(-half.x * 0.6, -half.y * 0.8)],
          [v(half.x * 0.2, -half.y), v(-half.x, half.y * 0.5)],
        ];
        for (const [a, b] of cracks) list.w(line(worldOf(add(center, a), pose), worldOf(add(center, b), pose), 0.6), 'muted', opacity);
      }
    }

    const lampSize = v(1.3, W * 0.22);
    const lampY = W * 0.3;
    if (brake !== null && brake > 0.02) {
      for (const y of [lampY, -lampY]) list.w(rect(worldOf(v(-L / 2 + 0.8, y), pose), lampSize, 0.5, pose.heading), 'lightRed', opacity * Math.min(brake, 1));
    }
    if (head > 0.01) {
      for (const y of [lampY, -lampY]) list.w(rect(worldOf(v(L / 2 - 0.8, y), pose), lampSize, 0.5, pose.heading), 'primary', opacity * head);
    }

    const finishTime = d.finishTime ?? null;
    const finish = d.finish ?? null;
    if (finish && finishTime !== null && dents.length === 0) {
      const half = L / 2;
      const width = W / 2;
      const seed = d.id % 97;
      if (isShiny(finish)) {
        const phase = (finishTime * 0.45 + seed * 0.13) % 1;
        if (phase < 0.45) {
          const x = -half + 2 * half * (phase / 0.45);
          const glow = Math.sin((Math.PI * phase) / 0.45);
          list.w(line(worldOf(v(x + 2.5, -width + 1), pose), worldOf(v(x - 2.5, width - 1), pose), 3), 'primary', opacity * 0.6 * glow);
        }
      }
      if (glitters(finish)) {
        for (let i = 0; i < 3; i++) {
          const u = unitHash(d.id * 7 + i, 21);
          const w2 = unitHash(d.id * 7 + i, 22);
          const twinkle = Math.pow(Math.max(0, Math.sin(finishTime * 5 + i * 2.1 + seed)), 6);
          if (twinkle <= 0.05) continue;
          list.w(circle(worldOf(v((u - 0.5) * 1.5 * half, (w2 - 0.5) * 1.3 * width), pose), 0.7 + 0.8 * twinkle), 'primary', opacity * twinkle);
        }
      }
    }

    if (type === 'transporter' && dents.length === 0) {
      const box = CarArt.shape('cargo', type, c);
      const from = box.center.x - box.size.x / 2 + 1;
      const to = box.center.x + box.size.x / 2 - 1;
      for (const y of [-1, 1]) {
        const side = y * (W / 2 - 1.1);
        list.w(line(worldOf(v(from, side), pose), worldOf(v(to, side), pose), 1.1), 'vehicleCargo', opacity);
      }
      const coin = worldOf(box.center, pose);
      list.w(circle(coin, 3.4), 'vehicleCargo', opacity);
      list.w(circle(coin, 2.2), 'vehicleArmor', opacity);
      list.w(line(worldOf(add(box.center, v(1.9, 0)), pose), worldOf(sub(box.center, v(1.9, 0)), pose), 0.9), 'vehicleCargo', opacity);
    }
    if (type === 'ambulance' && dents.length === 0) {
      // A red band along both sides and a red cross on the roof: an ambulance at a glance.
      for (const y of [-1, 1]) {
        const side = y * (W / 2 - 1.1);
        list.w(line(worldOf(v(-L / 2 + 2, side), pose), worldOf(v(L * 0.1, side), pose), 1.2), 'lightRed', opacity);
      }
      const cross = worldOf(v(-L * 0.18, 0), pose);
      list.w(rect(cross, v(7.5, 2.6), 0.6, pose.heading), 'lightRed', opacity);
      list.w(rect(cross, v(2.6, 7.5), 0.6, pose.heading), 'lightRed', opacity);
    }
    if (type === 'tanker' && dents.length === 0) {
      const tank = CarArt.shape('cargo', type, c);
      const from = tank.center.x - tank.size.x / 2 + 3;
      const to = tank.center.x + tank.size.x / 2 - 3;
      list.w(line(worldOf(v(from, 1.6), pose), worldOf(v(to, 1.6), pose), 1.4), 'primary', opacity * 0.45);
      for (const x of [-0.28, 0.2]) {
        const band = tank.center.x + tank.size.x * x;
        list.w(rect(worldOf(v(band, 0), pose), v(1.3, tank.size.y - 0.6), 0.6, pose.heading), 'fireOuter', opacity);
      }
      const diamond = worldOf(v(tank.center.x - tank.size.x * 0.05, 0), pose);
      list.w(rect(diamond, v(4.6, 4.6), 0.6, pose.heading + Math.PI / 4), 'fireDeep', opacity);
      list.w(rect(diamond, v(3, 3), 0.4, pose.heading + Math.PI / 4), 'hazard', opacity);
    }
    if (type === 'military' && dents.length === 0) {
      const bed = CarArt.shape('cargo', type, c);
      const bombLength = bed.size.x * 0.66;
      const center = add(bed.center, v(bed.size.x * 0.06, 0));
      const tail = center.x - bombLength / 2;
      for (const y of [-1, 1]) list.w(line(worldOf(v(tail + 2, y * 1.2), pose), worldOf(v(tail - 1.8, y * 3.6), pose), 1.4), 'bomb', opacity);
      list.w(rect(worldOf(center, pose), v(bombLength, W * 0.5), W * 0.25, pose.heading), 'bomb', opacity);
      list.w(rect(worldOf(add(center, v(bombLength * 0.18, 0)), pose), v(1.6, W * 0.5), 0.5, pose.heading), 'hazard', opacity);
      const blink = finishTime !== null ? Math.pow(Math.max(0, Math.sin(finishTime * 2.2 * Math.PI * 2)), 3) : 1;
      list.w(circle(worldOf(add(center, v(-bombLength * 0.12, 0)), pose), 1.1 + 1.6 * blink), 'lightRed', opacity * (0.35 + 0.65 * blink));
    }
    if (d.stripe && dents.length === 0 && type !== 'police' && type !== 'transporter' && !isExplosive(type)) {
      const half = L / 2 - 2;
      for (const y of [-1.6, 1.6]) list.w(line(worldOf(v(-half, y), pose), worldOf(v(half, y), pose), 1.3), d.stripe, opacity * 0.9);
    }
  },

  lightBar(list: RenderList, shape: Shape, center: Vec2, rotation: number, pose: Pose, lights: number | null, opacity: number, c: Config): void {
    const lit = lights !== null ? PoliceLights.leds(lights) : [0, 0, 0, 0, 0, 0];
    const local = (offset: Vec2): Vec2 => worldOf(add(center, rotated(offset, rotation - pose.heading)), pose);
    if (lights !== null) {
      const spill = PoliceLights.spill(lights);
      const roof = v(-CarArt.length('police', c) * 0.04, 0);
      [spill.left, spill.right].forEach((glow, index) => {
        if (glow <= 0.01) return;
        const y = (index === 0 ? 1 : -1) * (shape.size.y / 4);
        list.w(rect(local(add(roof, v(0, y))), v(shape.size.x * 2, shape.size.y / 2), 1.5, rotation), 'lightBlue', opacity * 0.35 * glow);
      });
    }
    list.w(rect(worldOf(center, pose), add(shape.size, v(0.8, 0.8)), shape.radius, rotation), 'vehicleTire', opacity);
    const pitch = shape.size.y / 6;
    const module = v(shape.size.x - 0.5, pitch - 0.35);
    const at = (i: number): Vec2 => v(0, shape.size.y / 2 - pitch * (i + 0.5));
    for (let i = 0; i < 6; i++) {
      const glow = lit[i];
      list.w(rect(local(at(i)), module, 0.4, rotation), 'lightBlue', opacity * (0.32 + 0.68 * glow));
      if (glow > 0.04) list.w(circle(local(at(i)), 0.35 + 1.0 * glow), 'primary', opacity * 0.9 * glow);
    }
    for (let side = 0; side < 2; side++) {
      const range = side === 0 ? [0, 1, 2] : [3, 4, 5];
      const brightest = range.reduce((a, b) => (lit[b] > lit[a] ? b : a));
      if (lit[brightest] <= 0.12) continue;
      const glow = lit[brightest];
      const half = v(0, shape.size.y * (0.35 + 0.55 * glow));
      const from = local(add(at(brightest), half));
      const to = local(sub(at(brightest), half));
      list.w(line(from, to, 1.6 * glow), 'lightBlue', opacity * 0.4 * glow);
      list.w(line(from, to, 0.45), 'primary', opacity * 0.6 * glow);
    }
  },
};
