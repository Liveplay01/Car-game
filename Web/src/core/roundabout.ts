import { type Config, cloneConfig, mergePathLength, builtArmSlots } from './config';
import { type Path, type Pose, type Bezier, circlePath, curvePath, line } from './paths';

/** A lane of the ring, parametrised by the outer lane's distance: both lanes turn together. */
function lanePath(radius: number, reference: number): Path {
  const length = TAU * reference;
  const pose = (s: number): Pose => {
    const angle = wrap(s / reference);
    return { position: mul(fromAngle(angle), radius), heading: angle + Math.PI / 2 };
  };
  return { length, closed: true, pose, point: (s) => pose(s).position };
}
import { type Vec2, add, sub, mul, dot, length, fromAngle, right, wrap, TAU, ZERO } from './vec2';

/** One arm of the roundabout. Index 0 is the player's, at the bottom; the rest follow in driving direction. */
export interface Arm {
  readonly index: number;
  readonly slot: number;
  /** Direction from the centre. */
  readonly angle: number;
}

export const armOutward = (arm: Arm): Vec2 => fromAngle(arm.angle);

export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Geometry of the single-lane roundabout (FOUNDATION.md 2.1), built once from the config.
 * Traffic flows counter-clockwise (right-hand traffic); the player's arm is South.
 */
export class Layout {
  readonly arms: Arm[];
  readonly player: Arm;
  readonly aiArms: Arm[];
  readonly ringRadius: number;
  readonly laneWidth: number;
  readonly ring: Path;
  readonly entries: Path[];
  readonly exits: Path[];
  readonly entryRingS: number[];
  readonly exitRingS: number[];
  readonly stopDistance: number;
  readonly queueSpacing: number;
  /** Lanes on the ring (1 or 2), and each lane's path, entries, exits and join points. */
  readonly lanes: number;
  readonly rings: Path[];
  readonly laneEntries: Path[][];
  readonly laneExits: Path[][];
  readonly laneEntryS: number[][];
  readonly laneExitS: number[][];
  /** Where the island begins: inside the innermost lane. */
  readonly islandRadius: number;
  /** World area the camera keeps in view: the ring and the visible queue. */
  readonly viewBounds: Rect;

  readonly armSlotCount: number;

  constructor(input: Config) {
    const slots = builtArmSlots(input);
    this.armSlotCount = Math.max(3, input.armSlotCount);
    this.arms = slots.map((slot, index) => ({
      index,
      slot,
      angle: -Math.PI / 2 + (slot * TAU) / Math.max(3, input.armSlotCount),
    }));
    this.player = this.arms[0];
    this.aiArms = this.arms.slice(1);
    // Every arm needs its room, so the ring grows with them.
    const radius = input.ringRadius + input.ringRadiusPerArm * Math.max(0, this.arms.length - 4);
    const config = cloneConfig(input);
    config.ringRadius = radius;
    this.ringRadius = radius;
    this.laneWidth = config.laneWidth;
    this.queueSpacing = config.queueSpacing;
    this.ring = circlePath(ZERO, radius);

    const minimum = radius + config.laneWidth / 2 + config.carLength / 2 + 1;
    const stop = solveStopDistance(mergePathLength(config), minimum, minimum + 400, config);
    this.stopDistance = stop;

    this.entries = this.arms.map((arm) => curvePath([entryCurve(arm.angle, stop, config)]));
    this.exits = this.arms.map((arm) => {
      const curve = exitCurve(arm.angle, stop, config);
      const outward = fromAngle(arm.angle);
      const end = add(mul(outward, stop + 260), mul(right(outward), config.laneWidth / 2));
      return curvePath([curve, line(curve.p3, end)]);
    });
    this.entryRingS = this.arms.map((a) => wrap(a.angle + config.mergeAngle) * radius);
    this.exitRingS = this.arms.map((a) => wrap(a.angle - config.mergeAngle) * radius);

    // The inner lane: its paths are built on every layout (cheap), used only with two lanes.
    this.lanes = Math.max(1, Math.min(2, input.lanes));
    const inner = cloneConfig(config);
    inner.ringRadius = radius - config.laneWidth;
    inner.mergeAngle = config.innerMergeAngle;
    this.rings = [this.ring, lanePath(inner.ringRadius, radius)];
    this.laneEntries = [this.entries, this.arms.map((arm) => curvePath([entryCurve(arm.angle, stop, inner)]))];
    this.laneExits = [
      this.exits,
      this.arms.map((arm) => {
        const curve = exitCurve(arm.angle, stop, inner);
        const outward = fromAngle(arm.angle);
        const end = add(mul(outward, stop + 260), mul(right(outward), config.laneWidth / 2));
        return curvePath([curve, line(curve.p3, end)]);
      }),
    ];
    this.laneEntryS = [this.entryRingS, this.arms.map((a) => wrap(a.angle + inner.mergeAngle) * radius)];
    this.laneExitS = [this.exitRingS, this.arms.map((a) => wrap(a.angle - inner.mergeAngle) * radius)];
    this.islandRadius = radius - config.laneWidth / 2 - (this.lanes - 1) * config.laneWidth;

    const edge = radius + config.laneWidth / 2 + 18;
    const queueEnd = stop + config.queueSpacing * (config.queueVisible - 1) + config.carLength / 2 + 10;
    this.viewBounds = { minX: -edge, minY: -queueEnd, maxX: edge, maxY: edge };
  }

  arm(index: number): Arm {
    const n = this.arms.length;
    return this.arms[((index % n) + n) % n];
  }

  advance(arm: Arm, steps: number): Arm {
    return this.arm(arm.index + steps);
  }

  entry(arm: Arm, lane = 0): Path {
    return this.laneEntries[lane][arm.index];
  }

  exit(arm: Arm, lane = 0): Path {
    return this.laneExits[lane][arm.index];
  }

  /** The radius a lane drives on: 0 the outer, 1 the inner. */
  laneRadius(lane: number): number {
    return this.ringRadius - lane * this.laneWidth;
  }

  /** Where a car from `arm` is on the ring once it has joined `lane`. */
  entryS(arm: Arm, lane = 0): number {
    return this.laneEntryS[lane][arm.index];
  }

  exitS(arm: Arm, lane = 0): number {
    return this.laneExitS[lane][arm.index];
  }

  stopPose(arm: Arm): Pose {
    return this.entry(arm).pose(0);
  }

  /** Pose of a queued car. Slot 0 is the stop line; fractional slots are cars rolling up. */
  queuePose(slot: number, arm: Arm = this.player): Pose {
    const stop = this.stopPose(arm);
    return { position: add(stop.position, mul(armOutward(arm), this.queueSpacing * slot)), heading: stop.heading };
  }

  /** Ring distance forward from a to b. */
  ringDistance(a: number, b: number): number {
    return wrap(b - a, this.ring.length);
  }

  /** Where a module slot sits on the ring (ring distance), offset half a step from the arms. */
  moduleRingS(slot: number, count: number): number {
    const n = Math.max(1, count);
    return wrap((TAU * (slot + 0.5)) / n) * this.ringRadius;
  }

  /** Ring distance a car drives from joining at `entryArm` until it leaves at `exitArm`. */
  ringDistanceArms(entryArm: Arm, exitArm: Arm, lane = 0): number {
    return this.ringDistance(this.entryS(entryArm, lane), this.exitS(exitArm, lane));
  }
}

/** Right-hand traffic: straight towards the ring, then right onto it, meeting it tangentially. */
function entryCurve(angle: number, stopDistance: number, config: Config): Bezier {
  const outward = fromAngle(angle);
  const inward = mul(outward, -1);
  const side = right(inward);
  const p0 = add(mul(outward, stopDistance), mul(side, config.laneWidth / 2));
  const endAngle = angle + config.mergeAngle;
  const p3 = mul(fromAngle(endAngle), config.ringRadius);
  const tangent = fromAngle(endAngle + Math.PI / 2);
  const chord = sub(p3, p0);
  const lateral = Math.abs(dot(chord, side));
  return { p0, p1: add(p0, mul(inward, length(chord) * 0.5)), p2: sub(p3, mul(tangent, lateral * 0.9)), p3 };
}

/** Mirror image of the entry: leaves the ring tangentially, then heads out on the right lane. */
function exitCurve(angle: number, stopDistance: number, config: Config): Bezier {
  const outward = fromAngle(angle);
  const side = right(outward);
  const startAngle = angle - config.mergeAngle;
  const p0 = mul(fromAngle(startAngle), config.ringRadius);
  const tangent = fromAngle(startAngle + Math.PI / 2);
  const p3 = add(mul(outward, stopDistance), mul(side, config.laneWidth / 2));
  const chord = sub(p3, p0);
  const lateral = Math.abs(dot(chord, side));
  return { p0, p1: add(p0, mul(tangent, lateral * 0.9)), p2: sub(p3, mul(outward, length(chord) * 0.5)), p3 };
}

/** Stop-line distance at which the entry path has exactly `target` length (bisection). */
function solveStopDistance(target: number, lower: number, upper: number, config: Config): number {
  const pathLength = (d: number): number => curvePath([entryCurve(-Math.PI / 2, d, config)]).length;
  let lo = lower;
  let hi = upper;
  if (pathLength(lo) >= target) return lo;
  if (pathLength(hi) <= target) return hi;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (pathLength(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
