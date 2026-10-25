import type { World } from '../core/world';
import type { Arm } from '../core/roundabout';
import { type Weather, weatherSeverity } from '../core/config';
import { type Vec2, v, add, mul, normalize, fromAngle, wrap } from '../core/vec2';
import { type RenderList, rect, circle, arc, line, segments, dots, unitHash } from './render';

/** The weathers on screen and how strongly each shows (0–1); usually just one, at 1. */
export type WeatherMix = readonly (readonly [Weather, number])[];

/**
 * The next shift's weather does not switch on; it moves in (Leo: nothing pops, the shift change
 * stays seamless). The old weather thins out while the new one sets in: rain starts drop by
 * drop, fog and the dark of a storm blend over. Only the picture: the rules have the new
 * weather at once, and the ready screen names it.
 */
export class WeatherFade {
  static readonly seconds = 2.5;
  private shown: Weather | null = null;
  private from: Weather = 'clear';
  private since = -Infinity;

  /** What to draw at scene time `now` while the world has `current`. */
  mix(current: Weather, now: number): WeatherMix {
    if (this.shown === null) this.shown = current;
    if (current !== this.shown) {
      this.from = this.shown;
      this.shown = current;
      this.since = now;
    }
    const t = Math.min(1, Math.max(0, (now - this.since) / WeatherFade.seconds));
    if (t >= 1 || this.from === current) return [[current, 1]];
    const eased = t * t * (3 - 2 * t);
    return [
      [this.from, 1 - eased],
      [current, eased],
    ];
  }
}

/** Weather and city events on screen. Only drawing. */
/** Distance from the centre to the mouth of an arm, just off the ring: on screen wherever the ring is. */
const mouth = (world: World): number => world.layout.ringRadius + world.layout.laneWidth / 2 + 6;

export const WeatherLayer = {
  darkness: [0, 0.08, 0.16, 0.24, 0.3],
  streaks: [0, 40, 90, 130, 170],

  /** Seconds between two flashes of lightning: a storm flashes, an extreme one more often, rain alone never (0). */
  flashPeriod: (severity: number): number => (severity >= 4 ? 4.5 : severity === 3 ? 7 : 0),

  /** Fog: soft banks drift round the ring; the stretch in front of your own arm stays clearer. */
  fogBanks: 16,
  /** How much of the fog and the dust the Fog Lamps clear at full aid. */
  lampClearing: 0.6,
  fogLayers: 4,
  /** A device that cannot keep its frames: half the banks, a little wider, in two layers instead of four. */
  thriftyBanks: 8,
  thriftyLayers: 2,
  thriftyGrowth: 1.3,

  /** `mix`: the weathers and how strongly they show (`WeatherFade`); by default the world's own, at full. */
  addGround(list: RenderList, world: World, mix: WeatherMix = [[world.config.weather, 1]]): void {
    for (const [weather, amount] of mix) WeatherLayer.addGroundOf(list, weather, amount);
  },

  addGroundOf(list: RenderList, weather: Weather, amount: number): void {
    if (amount <= 0) return;
    const vp = list.camera.viewport;
    if (weather === 'snow') {
      // A cold, pale cast over the city: it lies under snow.
      list.s(rect(mul(vp, 0.5), vp), 'groundSnow', 0.1 * amount);
      return;
    }
    if (weather === 'hail') {
      // A grey, heavy sky, a little paler than rain.
      list.s(rect(mul(vp, 0.5), vp), 'scrim', 0.14 * amount);
      return;
    }
    if (weather === 'sandstorm') {
      // Everything under a warm haze of dust.
      list.s(rect(mul(vp, 0.5), vp), 'mapSand', 0.1 * amount);
      return;
    }
    const severity = weatherSeverity(weather);
    if (severity <= 0) return;
    list.s(rect(mul(vp, 0.5), vp), 'scrim', WeatherLayer.darkness[severity] * amount);
  },

  addAir(list: RenderList, world: World, time: number, reduceMotion: boolean, mix: WeatherMix = [[world.config.weather, 1]], thrifty = false): void {
    for (const [weather, amount] of mix) WeatherLayer.addAirOf(list, world, weather, amount, time, reduceMotion, thrifty);
  },

  addAirOf(list: RenderList, world: World, weather: Weather, amount: number, time: number, reduceMotion: boolean, thrifty = false): void {
    if (amount <= 0) return;
    // Fog Lamps thin the picture too: the dust and the mist lie lighter.
    const seen = amount * (1 - WeatherLayer.lampClearing * world.config.lampAid);
    if (weather === 'fog') return WeatherLayer.addFog(list, world, reduceMotion ? 0 : time, seen, thrifty);
    if (weather === 'snow') return WeatherLayer.addSnow(list, reduceMotion ? 0 : time, amount);
    if (weather === 'hail') return WeatherLayer.addHail(list, reduceMotion ? 0 : time, amount);
    if (weather === 'sandstorm') return WeatherLayer.addSandstorm(list, world, reduceMotion ? 0 : time, seen, thrifty);
    const severity = weatherSeverity(weather);
    if (severity <= 0) return;
    const vp = list.camera.viewport;
    const fall = 900 + 150 * severity;
    const slant = v(-0.18, 1);
    const length = 10 + 4 * severity;
    // Rain sets in drop by drop: a share of the streaks, each at full strength. All streaks
    // share one colour, so they go out as one path: one stroke a frame instead of up to 170,
    // which a phone's GPU feels.
    const streaks = Math.round(WeatherLayer.streaks[severity] * amount);
    if (streaks > 0) {
      const ends: Vec2[] = [];
      const drop = mul(slant, length);
      for (let i = 0; i < streaks; i++) {
        const x = unitHash(i, 1) * (vp.x + 60) - 30;
        const speed = fall * (0.8 + 0.4 * unitHash(i, 3));
        const y = ((unitHash(i, 2) * vp.y + time * speed) % (vp.y + 40)) - 20;
        const start = v(x + (y / vp.y) * -40, y);
        ends.push(start, add(start, drop));
      }
      list.s(segments(ends, 1.2), 'primary', 0.1 + 0.03 * severity);
    }
    const period = WeatherLayer.flashPeriod(severity);
    if (reduceMotion || period === 0) return;
    const into = time % period;
    if (into < 0.14) list.s(rect(mul(vp, 0.5), vp), 'primary', 0.16 * (1 - into / 0.14) * amount);
  },

  addFog(list: RenderList, world: World, time: number, amount = 1, thrifty = false): void {
    const layout = world.layout;
    const vp = list.camera.viewport;
    list.s(rect(mul(vp, 0.5), vp), 'smokeLight', 0.12 * amount);
    const own = layout.player.angle;
    const banks = thrifty ? WeatherLayer.thriftyBanks : WeatherLayer.fogBanks;
    for (let i = 0; i < banks; i++) {
      // Each bank drifts slowly along the ring at its own pace and distance.
      const angle = unitHash(i, 41) * Math.PI * 2 + time * (0.03 + 0.04 * unitHash(i, 42));
      const away = Math.abs(Math.atan2(Math.sin(angle - own), Math.cos(angle - own)));
      const thin = Math.min(1, Math.max(0.15, (away - 0.35) / 1.2));
      const center = mul(fromAngle(angle), layout.ringRadius + (unitHash(i, 43) - 0.4) * 90);
      const radius = (70 + 70 * unitHash(i, 44)) * (thrifty ? WeatherLayer.thriftyGrowth : 1);
      // A bank is layers of thin mist, each smaller than the last. Stacked, the middle was
      // painted four times; instead each zone is painted once (see `addBank`), which a phone's GPU feels.
      WeatherLayer.addBank(list, center, radius, 0.07 * thin * amount, 'smokeLight', thrifty);
    }
  },

  /**
   * One bank of mist: each zone painted once, as dense as its layers make it together (k + 1 layers
   * of `a`: 1 - (1 - a)^(k + 1), the colour being opaque), the layers shrinking evenly to 20 % of the radius.
   */
  addBank(list: RenderList, center: Vec2, radius: number, a: number, color: 'smokeLight' | 'mapSand', thrifty: boolean): void {
    const layers = thrifty ? WeatherLayer.thriftyLayers : WeatherLayer.fogLayers;
    const step = 0.8 / layers;
    for (let k = 0; k < layers; k++) {
      const outer = radius * (1 - k * step);
      const inner = k + 1 < layers ? radius * (1 - (k + 1) * step) : 0;
      const dense = 1 - (1 - a) ** (k + 1);
      if (inner > 0) list.w(arc(center, (outer + inner) / 2, outer - inner, 0, Math.PI * 2), color, dense);
      else list.w(circle(center, outer), color, dense);
    }
  },

  /**
   * Snow: each flake had its own strength, so 120 fills a frame, each with a colour of its own.
   * Now the flakes fall into a few strengths (`snowBands`) and each band is filled as one path:
   * the same flurry in three draw calls.
   */
  snowFlakes: 120,
  snowBands: 3,

  addSnow(list: RenderList, time: number, amount = 1): void {
    const vp = list.camera.viewport;
    const flakes = Math.round(WeatherLayer.snowFlakes * amount);
    const bands = WeatherLayer.snowBands;
    const points: Vec2[][] = Array.from({ length: bands }, () => []);
    const radii: number[][] = Array.from({ length: bands }, () => []);
    for (let i = 0; i < flakes; i++) {
      const speed = 40 + 50 * unitHash(i, 52);
      const y = ((unitHash(i, 51) * vp.y + time * speed) % (vp.y + 20)) - 10;
      const x = unitHash(i, 53) * vp.x + Math.sin(time * 0.9 + i) * 10;
      const band = Math.min(bands - 1, Math.floor(unitHash(i, 55) * bands));
      points[band].push(v(x, y));
      radii[band].push(1 + 1.6 * unitHash(i, 54));
    }
    for (let band = 0; band < bands; band++) {
      if (points[band].length > 0) list.s(dots(points[band], radii[band]), 'primary', 0.35 + (0.35 * (band + 0.5)) / bands);
    }
  },

  /**
   * Hail: small white stones falling fast and nearly straight, in one path per size like the
   * snow; each lands with a short flash of a bounce.
   */
  hailStones: 110,

  addHail(list: RenderList, time: number, amount = 1): void {
    const vp = list.camera.viewport;
    const stones = Math.round(WeatherLayer.hailStones * amount);
    const small: Vec2[] = [];
    const smallR: number[] = [];
    const big: Vec2[] = [];
    const bigR: number[] = [];
    for (let i = 0; i < stones; i++) {
      const speed = 520 + 260 * unitHash(i, 61);
      const y = ((unitHash(i, 62) * vp.y + time * speed) % (vp.y + 20)) - 10;
      const x = unitHash(i, 63) * vp.x + (y / vp.y) * -14;
      if (unitHash(i, 64) < 0.7) {
        small.push(v(x, y));
        smallR.push(1.1 + 0.6 * unitHash(i, 65));
      } else {
        big.push(v(x, y));
        bigR.push(1.8 + 0.8 * unitHash(i, 65));
      }
    }
    if (small.length > 0) list.s(dots(small, smallR), 'primary', 0.45);
    if (big.length > 0) list.s(dots(big, bigR), 'primary', 0.7);
  },

  /**
   * A sandstorm: the fog's banks in the colour of sand, so the far side of the ring fades out,
   * and long streaks of dust blowing across the picture.
   */
  dustStreaks: 46,

  addSandstorm(list: RenderList, world: World, time: number, amount = 1, thrifty = false): void {
    const layout = world.layout;
    const vp = list.camera.viewport;
    list.s(rect(mul(vp, 0.5), vp), 'mapSand', 0.08 * amount);
    const own = layout.player.angle;
    const banks = thrifty ? WeatherLayer.thriftyBanks : WeatherLayer.fogBanks;
    for (let i = 0; i < banks; i++) {
      const angle = unitHash(i, 71) * Math.PI * 2 + time * (0.06 + 0.05 * unitHash(i, 72));
      const away = Math.abs(Math.atan2(Math.sin(angle - own), Math.cos(angle - own)));
      const thin = Math.min(1, Math.max(0.15, (away - 0.35) / 1.2));
      const center = mul(fromAngle(angle), layout.ringRadius + (unitHash(i, 73) - 0.4) * 90);
      const radius = (70 + 60 * unitHash(i, 74)) * (thrifty ? WeatherLayer.thriftyGrowth : 1);
      WeatherLayer.addBank(list, center, radius, 0.08 * thin * amount, 'mapSand', thrifty);
    }
    const streaks = Math.round(WeatherLayer.dustStreaks * amount);
    const ends: Vec2[] = [];
    for (let i = 0; i < streaks; i++) {
      const speed = 260 + 220 * unitHash(i, 75);
      const length = 30 + 50 * unitHash(i, 76);
      const x = ((unitHash(i, 77) * (vp.x + 120) + time * speed) % (vp.x + 120)) - 60;
      const y = unitHash(i, 78) * vp.y + Math.sin(time * 0.8 + i) * 6;
      ends.push(v(x, y), v(x - length, y + 3));
    }
    if (ends.length > 0) list.s(segments(ends, 1.4), 'mapSand', 0.28);
  },

  /** Runners per pass of the marathon, and how wide the field spreads over the crossing's time. */
  runners: 14,

  addRunners(list: RenderList, world: World, arm: Arm): void {
    const layout = world.layout;
    const out = fromAngle(arm.angle);
    const across = fromAngle(arm.angle + Math.PI / 2);
    const half = layout.laneWidth;
    const at = mul(out, mouth(world));
    const c = world.config;
    const phase = world.marathonPhase();
    const crossing = phase < c.marathonCrossing;
    // The finish line where the arm meets the ring, so it stays on screen beside the HUD and on narrow phones (Leo):
    // two rows of orange and white squares across the whole road, like the icon's flag; bright while the runners pass.
    const cols = 8;
    const size = (2 * half) / cols;
    for (let col = 0; col < cols; col++) {
      for (const row of [0, 1]) {
        const p = add(add(at, mul(across, -half + size * (col + 0.5))), mul(out, (row - 0.5) * size));
        list.w(rect(p, v(size, size), 0, arm.angle), (col + row) % 2 ? 'primary' : 'juiceOrange', crossing ? 0.9 : 0.45);
      }
    }
    if (!crossing) return;
    // Each runner sets off a little after the one before and crosses at its own pace.
    const colors = ['juiceOrange', 'lightBlue', 'juiceGreen', 'rarityEpic', 'juiceYellow', 'primary'] as const;
    for (let i = 0; i < WeatherLayer.runners; i++) {
      const start = (unitHash(i, 81) * c.marathonCrossing) * 0.6;
      const pace = 0.35 + 0.25 * unitHash(i, 82);
      const x = (phase - start) * pace;
      if (x < 0 || x > 1) continue;
      const lane = (unitHash(i, 83) - 0.5) * 10;
      const p = add(add(at, mul(across, -half * 1.3 + 2 * half * 1.3 * x)), mul(out, lane));
      list.w(circle(p, 3.6), 'accentInk', 0.7);
      list.w(circle(p, 2.8), colors[i % colors.length]);
    }
  },

  addCityEvent(list: RenderList, world: World): void {
    const layout = world.layout;
    const stop = world.busStopS;
    if (stop !== null) {
      // The bus stop: a yellow box on the road and the round sign beside it.
      const pose = layout.ring.pose(stop);
      const out = normalize(pose.position);
      const r = layout.ringRadius;
      const from = (stop - 36) / r;
      for (const edge of [-1, 1]) list.w(arc(v(0, 0), r + edge * (layout.laneWidth / 2 - 2), 1.6, from, stop / r), 'vehicleBus', 0.7);
      const sign = add(pose.position, mul(out, layout.laneWidth / 2 + 7));
      list.w(circle(sign, 5), 'vehicleBus');
      list.w(circle(sign, 3.6), 'juiceGreen');
    }
    const works = world.roadworks;
    if (works) {
      // Roadworks, like its icon: an orange and white edge and traffic cones from above along the stretch.
      const { start, arc: arcLen } = works;
      const r = layout.ringRadius;
      const edge = r + layout.laneWidth / 2 - 2;
      const pieces = Math.max(2, Math.floor(arcLen / 8));
      for (let piece = 0; piece < pieces; piece++) {
        const from = (start + (arcLen * piece) / pieces) / r;
        const to = (start + (arcLen * (piece + 1)) / pieces) / r;
        list.w(arc(v(0, 0), edge, 2.4, from, to), piece % 2 ? 'primary' : 'juiceOrange', 0.9);
      }
      const cones = Math.max(2, Math.round(arcLen / 16));
      for (let i = 0; i <= cones; i++) {
        const pose = layout.ring.pose(wrap(start + (arcLen * i) / cones, layout.ring.length));
        const at = mul(normalize(pose.position), edge - 1);
        list.w(rect(at, v(6.5, 6.5), 1.2, pose.heading), 'juiceOrange');
        list.w(circle(at, 2.5), 'primary');
        list.w(circle(at, 1.4), 'juiceOrange');
      }
    }
    // The marathon: a crossing on the arm's way in, and the runners on it while they pass.
    const marathon = world.config.cityEvent === 'marathon' ? world.config.marathonArmSlot : null;
    const course = marathon === null ? undefined : layout.arms.find((a) => a.slot === marathon);
    if (course) WeatherLayer.addRunners(list, world, course);
    const closed = world.config.closedArmSlot;
    const armItem = closed === null ? undefined : layout.arms.find((a) => a.slot === closed);
    if (armItem) {
      // The closure, like its icon: a white board with red stripes on two feet across the way in, where the arm meets the ring.
      const stop = layout.stopPose(armItem);
      const inward = fromAngle(stop.heading);
      const across: Vec2 = fromAngle(stop.heading + Math.PI / 2);
      const at = add(stop.position, mul(inward, layout.stopDistance - mouth(world)));
      const half = layout.laneWidth * 0.6;
      for (const side of [-0.7, 0.7]) list.w(rect(add(at, mul(across, half * side)), v(10, 2.4), 1, stop.heading), 'kerb');
      list.w(rect(at, v(2 * half, 6), 1.5, stop.heading + Math.PI / 2), 'primary');
      for (let x = -half + 2; x + 3 <= half - 1; x += 6) {
        list.w(line(add(add(at, mul(across, x)), mul(inward, -2)), add(add(at, mul(across, x + 3)), mul(inward, 2)), 2), 'destructive');
      }
    }
  },
};
