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
export const WeatherLayer = {
  darkness: [0, 0.08, 0.16, 0.24, 0.3],
  streaks: [0, 40, 90, 130, 170],

  /** Seconds between two flashes of lightning: a storm flashes, an extreme one more often, rain alone never (0). */
  flashPeriod: (severity: number): number => (severity >= 4 ? 4.5 : severity === 3 ? 7 : 0),

  /** Fog: soft banks drift round the ring; the stretch in front of your own arm stays clearer. */
  fogBanks: 16,
  fogLayers: 4,

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
    if (severity < 2) return;
    const band = vp.y * 0.12;
    for (const y of [band / 2, vp.y - band / 2]) list.s(rect(v(vp.x / 2, y), v(vp.x, band)), 'scrim', 0.1 * (severity - 1) * amount);
  },

  addAir(list: RenderList, world: World, time: number, reduceMotion: boolean, mix: WeatherMix = [[world.config.weather, 1]]): void {
    for (const [weather, amount] of mix) WeatherLayer.addAirOf(list, world, weather, amount, time, reduceMotion);
  },

  addAirOf(list: RenderList, world: World, weather: Weather, amount: number, time: number, reduceMotion: boolean): void {
    if (amount <= 0) return;
    if (weather === 'fog') return WeatherLayer.addFog(list, world, reduceMotion ? 0 : time, amount);
    if (weather === 'snow') return WeatherLayer.addSnow(list, reduceMotion ? 0 : time, amount);
    if (weather === 'hail') return WeatherLayer.addHail(list, reduceMotion ? 0 : time, amount);
    if (weather === 'sandstorm') return WeatherLayer.addSandstorm(list, world, reduceMotion ? 0 : time, amount);
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

  addFog(list: RenderList, world: World, time: number, amount = 1): void {
    const layout = world.layout;
    const vp = list.camera.viewport;
    list.s(rect(mul(vp, 0.5), vp), 'smokeLight', 0.12 * amount);
    const own = layout.player.angle;
    for (let i = 0; i < WeatherLayer.fogBanks; i++) {
      // Each bank drifts slowly along the ring at its own pace and distance.
      const angle = unitHash(i, 41) * Math.PI * 2 + time * (0.03 + 0.04 * unitHash(i, 42));
      const away = Math.abs(Math.atan2(Math.sin(angle - own), Math.cos(angle - own)));
      const thin = Math.min(1, Math.max(0.15, (away - 0.35) / 1.2));
      const center = mul(fromAngle(angle), layout.ringRadius + (unitHash(i, 43) - 0.4) * 90);
      const radius = 70 + 70 * unitHash(i, 44);
      // A bank is layers of thin mist, each smaller than the last. Stacked, the middle was
      // painted four times; instead each zone is painted once, as dense as its layers make it
      // together (k + 1 layers of `a`: 1 - (1 - a)^(k + 1), smokeLight being opaque). The
      // same picture with less than half the painting, which a phone's GPU feels.
      const a = 0.07 * thin * amount;
      for (let k = 0; k < WeatherLayer.fogLayers; k++) {
        const outer = radius * (1 - k * 0.2);
        const inner = k + 1 < WeatherLayer.fogLayers ? radius * (1 - (k + 1) * 0.2) : 0;
        const dense = 1 - (1 - a) ** (k + 1);
        if (inner > 0) list.w(arc(center, (outer + inner) / 2, outer - inner, 0, Math.PI * 2), 'smokeLight', dense);
        else list.w(circle(center, outer), 'smokeLight', dense);
      }
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

  addSandstorm(list: RenderList, world: World, time: number, amount = 1): void {
    const layout = world.layout;
    const vp = list.camera.viewport;
    list.s(rect(mul(vp, 0.5), vp), 'mapSand', 0.08 * amount);
    const own = layout.player.angle;
    for (let i = 0; i < WeatherLayer.fogBanks; i++) {
      const angle = unitHash(i, 71) * Math.PI * 2 + time * (0.06 + 0.05 * unitHash(i, 72));
      const away = Math.abs(Math.atan2(Math.sin(angle - own), Math.cos(angle - own)));
      const thin = Math.min(1, Math.max(0.15, (away - 0.35) / 1.2));
      const center = mul(fromAngle(angle), layout.ringRadius + (unitHash(i, 73) - 0.4) * 90);
      const radius = 70 + 60 * unitHash(i, 74);
      const a = 0.08 * thin * amount;
      for (let k = 0; k < WeatherLayer.fogLayers; k++) {
        const outer = radius * (1 - k * 0.2);
        const inner = k + 1 < WeatherLayer.fogLayers ? radius * (1 - (k + 1) * 0.2) : 0;
        const dense = 1 - (1 - a) ** (k + 1);
        if (inner > 0) list.w(arc(center, (outer + inner) / 2, outer - inner, 0, Math.PI * 2), 'mapSand', dense);
        else list.w(circle(center, outer), 'mapSand', dense);
      }
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
    const stop = layout.stopPose(arm);
    const back = fromAngle(stop.heading + Math.PI);
    const across: Vec2 = fromAngle(stop.heading + Math.PI / 2);
    const half = layout.laneWidth * 0.7;
    // The crossing a little up the arm from the stop line: white bars across the way in.
    const at = add(stop.position, mul(back, 10));
    for (let k = -3; k <= 3; k++) {
      const c = add(at, mul(across, (k * half) / 3.5));
      list.w(line(add(c, mul(back, -4)), add(c, mul(back, 4)), 2.4), 'primary', 0.55);
    }
    const c = world.config;
    const phase = world.marathonPhase();
    if (phase >= c.marathonCrossing) return;
    // Each runner sets off a little after the one before and crosses at its own pace.
    const colors = ['juiceOrange', 'lightBlue', 'juiceGreen', 'rarityEpic', 'juiceYellow', 'primary'] as const;
    for (let i = 0; i < WeatherLayer.runners; i++) {
      const start = (unitHash(i, 81) * c.marathonCrossing) * 0.6;
      const pace = 0.35 + 0.25 * unitHash(i, 82);
      const x = (phase - start) * pace;
      if (x < 0 || x > 1) continue;
      const lane = (unitHash(i, 83) - 0.5) * 7;
      const p = add(add(at, mul(across, -half * 1.4 + 2 * half * 1.4 * x)), mul(back, lane));
      list.w(circle(p, 2.6), colors[i % colors.length]);
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
      const { start, arc: arcLen } = works;
      const radius = layout.ringRadius + layout.laneWidth / 2 - 3;
      const pieces = Math.max(2, Math.floor(arcLen / 12));
      for (let piece = 0; piece < pieces; piece += 2) {
        const from = (start + (arcLen * piece) / pieces) / layout.ringRadius;
        const to = (start + (arcLen * (piece + 1)) / pieces) / layout.ringRadius;
        list.w(arc(v(0, 0), radius, 4, from, to), 'hazard', 0.9);
      }
      for (const share of [0, 0.5, 1]) {
        const pose = layout.ring.pose(wrap(start + arcLen * share, layout.ring.length));
        list.w(circle(add(pose.position, mul(normalize(pose.position), layout.laneWidth / 2 + 4)), 3.5), 'hazard');
      }
    }
    // The marathon: a crossing on the arm's way in, and the runners on it while they pass.
    const marathon = world.config.cityEvent === 'marathon' ? world.config.marathonArmSlot : null;
    const course = marathon === null ? undefined : layout.arms.find((a) => a.slot === marathon);
    if (course) WeatherLayer.addRunners(list, world, course);
    const closed = world.config.closedArmSlot;
    const armItem = closed === null ? undefined : layout.arms.find((a) => a.slot === closed);
    if (armItem) {
      const stop = layout.stopPose(armItem);
      const across: Vec2 = fromAngle(stop.heading + Math.PI / 2);
      const half = layout.laneWidth * 0.55;
      list.w(line(add(stop.position, mul(across, -half)), add(stop.position, mul(across, half)), 5), 'hazard');
      for (const side of [-0.5, 0, 0.5]) {
        const at = add(stop.position, mul(across, half * side));
        list.w(line(add(at, mul(across, -2)), add(at, mul(across, 2)), 5), 'destructive');
      }
    }
  },
};
