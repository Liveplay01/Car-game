import type { World } from '../core/world';
import { weatherSeverity } from '../core/config';
import { type Vec2, v, add, mul, normalize, fromAngle, wrap } from '../core/vec2';
import { type RenderList, rect, circle, arc, line, unitHash } from './render';

/** Weather and city events on screen (`WeatherLayer.swift`). Only drawing. */
export const WeatherLayer = {
  darkness: [0, 0.08, 0.16, 0.24, 0.3],
  streaks: [0, 40, 90, 130, 170],

  addGround(list: RenderList, world: World): void {
    const severity = weatherSeverity(world.config.weather);
    if (severity <= 0) return;
    const vp = list.camera.viewport;
    list.s(rect(mul(vp, 0.5), vp), 'scrim', WeatherLayer.darkness[severity]);
    if (severity < 2) return;
    const band = vp.y * 0.12;
    for (const y of [band / 2, vp.y - band / 2]) list.s(rect(v(vp.x / 2, y), v(vp.x, band)), 'scrim', 0.1 * (severity - 1));
  },

  addAir(list: RenderList, world: World, time: number, reduceMotion: boolean): void {
    const severity = weatherSeverity(world.config.weather);
    if (severity <= 0) return;
    const vp = list.camera.viewport;
    const fall = 900 + 150 * severity;
    const slant = v(-0.18, 1);
    const length = 10 + 4 * severity;
    for (let i = 0; i < WeatherLayer.streaks[severity]; i++) {
      const x = unitHash(i, 1) * (vp.x + 60) - 30;
      const speed = fall * (0.8 + 0.4 * unitHash(i, 3));
      const y = ((unitHash(i, 2) * vp.y + time * speed) % (vp.y + 40)) - 20;
      const start = v(x + (y / vp.y) * -40, y);
      list.s(line(start, add(start, mul(slant, length)), 1.2), 'primary', 0.1 + 0.03 * severity);
    }
    if (reduceMotion || severity < 3) return;
    const period = severity >= 4 ? 4.5 : 7;
    const into = time % period;
    if (into < 0.14) list.s(rect(mul(vp, 0.5), vp), 'primary', 0.16 * (1 - into / 0.14));
  },

  addCityEvent(list: RenderList, world: World): void {
    const layout = world.layout;
    const start = world.roadworksRingS;
    if (start !== null) {
      const arcLen = world.config.roadworksArc;
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
