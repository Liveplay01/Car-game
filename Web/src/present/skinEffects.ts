import type { Pose } from '../core/paths';
import { type Vec2, v, add, sub, mul, length, fromAngle, TAU } from '../core/vec2';
import { type RenderList, rect, circle, arc, line, polygon, unitHash } from './render';
import type { ColorToken } from './theme';

/**
 * The loud skins (Season Pass and Hall of Fame, Leo, 30.09.2026; Feats, 01.10.2026): an animated effect on top of
 * the paint. Only looks: an effect never covers a lamp that tells the traffic something, and a
 * wreck has lost it. `time` null (Reduce Motion, previews) shows one still frame.
 */
export type Effect =
  | 'snowTrail'
  | 'aurora'
  | 'crystal'
  | 'petals'
  | 'rainbow'
  | 'bloom'
  | 'flame'
  | 'neon'
  | 'lava'
  | 'ghost'
  | 'embers'
  | 'lightning'
  | 'laurel'
  // Feats (core/feats.ts): the rarest skins, so their effects are the loudest.
  | 'nova'
  | 'singularity'
  | 'halo'
  | 'soulfire'
  // The bug hunter's rewards (Leo, 03.10.2026; five more 10.10.2026, one per bug report up to six): beetles with feelers.
  | 'ladybug'
  | 'goldbug'
  | 'scarab'
  | 'bluebottle'
  | 'orchid'
  | 'firefly'
  // More honours (Leo, 06.10.2026): a clock that leaves echoes, glowing plankton, a dragon's scales and breath.
  | 'chrono'
  | 'biolume'
  | 'dragon';

/** A local point of the car in world space (x forward, y left). */
const at = (pose: Pose, x: number, y: number): Vec2 => {
  const c = Math.cos(pose.heading);
  const s = Math.sin(pose.heading);
  return add(pose.position, v(x * c - y * s, x * s + y * c));
};

/** The bug hunter's beetles: all get feelers. */
const BEETLES: readonly Effect[] = ['ladybug', 'goldbug', 'scarab', 'bluebottle', 'orchid', 'firefly'];

const RAINBOW: ColorToken[] = ['juiceRed', 'juiceOrange', 'juiceYellow', 'juiceGreen', 'juiceBlue', 'juicePurple'];
const AURORA: ColorToken[] = ['mapAurora', 'skinLagoon', 'juicePurple', 'mapNeon'];

/** Two colours of a cycle and how far the second has come in: a smooth colour change. */
function cycle(colors: ColorToken[], phase: number): [ColorToken, ColorToken, number] {
  const n = colors.length;
  const p = ((phase % n) + n) % n;
  const i = Math.floor(p);
  return [colors[i], colors[(i + 1) % n], p - i];
}

/** Where a car has been: its middle and heading every `STEP` units it drove, newest first. */
interface Track {
  points: { p: Vec2; h: number }[];
  seen: number;
}
const STEP = 1.2;
const TRACK_LENGTH = 70;
const tracks = new Map<number, Track>();

/** Notes where the car is, so what trails it can follow the way it really drove (round a bend too). */
function record(pose: Pose, id: number, L: number, time: number | null): void {
  if (time === null) {
    tracks.delete(id);
    return;
  }
  let track = tracks.get(id);
  if (!track || time < track.seen - 0.5 || length(sub(track.points[0].p, pose.position)) > L * 4) {
    track = { points: [], seen: time };
    tracks.set(id, track);
  }
  track.seen = time;
  const last = track.points[0];
  if (!last || length(sub(last.p, pose.position)) >= STEP) {
    track.points.unshift({ p: pose.position, h: pose.heading });
    let total = 0;
    for (let i = 1; i < track.points.length; i++) {
      total += length(sub(track.points[i - 1].p, track.points[i].p));
      if (total > TRACK_LENGTH) {
        track.points.length = i + 1;
        break;
      }
    }
  }
  if (tracks.size > 300) for (const [key, t] of tracks) if (Math.abs(time - t.seen) > 3) tracks.delete(key);
}

/** The point `distance` behind the car's middle along the way it came, and its heading there; straight back where the track is short or unknown. */
function behind(pose: Pose, id: number, distance: number): { p: Vec2; h: number } {
  const track = tracks.get(id);
  let from = pose.position;
  let left = distance;
  let heading = pose.heading;
  if (track) {
    for (const point of track.points) {
      const seg = length(sub(from, point.p));
      if (seg >= left && seg > 1e-6) {
        const k = left / seg;
        const turn = ((((point.h - heading) % TAU) + 3 * Math.PI) % TAU) - Math.PI;
        return { p: add(from, mul(sub(point.p, from), k)), h: heading + turn * k };
      }
      left -= seg;
      from = point.p;
      heading = point.h;
    }
  }
  return { p: add(from, v(-Math.cos(heading) * left, -Math.sin(heading) * left)), h: heading };
}

/** Particles streaming off the back of the car along the way it drove: 0 at the bumper, 1 where they vanish. */
function trail(pose: Pose, L: number, W: number, t: number, id: number, count: number, rate: number, reach: number, draw: (p: Vec2, u: number, i: number) => void): void {
  for (let i = 0; i < count; i++) {
    const u = (t * rate + i / count + unitHash(id, i)) % 1;
    const side = (unitHash(id * 13 + i, 7) - 0.5) * W * (0.6 + u * 0.8) + Math.sin(t * 3 + i) * u * 2;
    const spot = behind(pose, id, L / 2 + u * reach);
    draw(add(spot.p, v(-Math.sin(spot.h) * side, Math.cos(spot.h) * side)), u, i);
  }
}

export const SkinEffects = {
  /** Under the body: glows and trails, so the paint stays on top. */
  under(list: RenderList, e: Effect, pose: Pose, L: number, W: number, time: number | null, id: number, o: number): void {
    const t = time ?? 0.35;
    record(pose, id, L, time);
    const glow = (colors: ColorToken[], speed: number, strength: number): void => {
      const [a, b, k] = cycle(colors, t * speed + id * 0.3);
      for (const [grow, share] of [[12, 0.5], [6, 1]] as const) {
        const size = v(L + grow, W + grow);
        list.w(rect(pose.position, size, W / 2 + grow / 2, pose.heading), a, o * strength * share * (1 - k));
        list.w(rect(pose.position, size, W / 2 + grow / 2, pose.heading), b, o * strength * share * k);
      }
    };
    switch (e) {
      case 'neon':
        glow(['mapNeon', 'juicePurple', 'juiceBlue'], 0.8, 0.45);
        break;
      case 'aurora':
        glow(AURORA, 0.5, 0.4);
        break;
      case 'bloom': {
        const pulse = 0.5 + 0.5 * Math.sin(t * 3 + id);
        glow(['sakuraDeep'], 0, 0.25 + 0.25 * pulse);
        trail(pose, L, W, t, id, 6, 0.6, 26, (p, u, i) => list.w(rect(p, v(2.6, 1.6), 0.8, t * 2 + i), 'sakuraPale', o * 0.8 * (1 - u)));
        break;
      }
      case 'lava':
        glow(['fireOuter', 'fireDeep'], 1.2, 0.3);
        break;
      case 'laurel':
        list.w(circle(pose.position, L * 0.72), 'coin', o * 0.12);
        list.w(circle(pose.position, L * 0.58), 'coin', o * 0.12);
        break;
      case 'flame':
        trail(pose, L, W, t, id, 12, 1.8, 22, (p, u) => {
          const color: ColorToken = u < 0.25 ? 'fireCore' : u < 0.6 ? 'fireOuter' : 'fireDeep';
          list.w(circle(p, 3.4 * (1 - u * 0.6)), color, o * 0.85 * (1 - u));
        });
        break;
      case 'snowTrail':
        list.w(rect(pose.position, v(L + 8, W + 8), W / 2 + 4, pose.heading), 'skinFrost', o * 0.18);
        trail(pose, L, W, t, id, 12, 0.7, 30, (p, u) => list.w(circle(p, 1.3 * (1 - u * 0.4)), 'primary', o * 0.9 * (1 - u)));
        break;
      case 'petals':
        trail(pose, L, W, t, id, 10, 0.5, 32, (p, u, i) =>
          list.w(rect(p, v(3, 1.8), 0.9, t * 3 + i * 1.7), i % 2 === 0 ? 'mapSakura' : 'sakuraPale', o * 0.9 * (1 - u)),
        );
        break;
      case 'embers':
        list.w(circle(pose.position, L * 0.62), 'fireOuter', o * 0.1);
        trail(pose, L, W, t, id, 10, 0.8, 26, (p, u, i) =>
          i % 3 === 0 ? list.w(rect(p, v(3, 2), 0.6, t + i), 'mapAutumn', o * (1 - u)) : list.w(circle(p, 1.1), 'fireOuter', o * (1 - u)),
        );
        break;
      case 'rainbow':
        trail(pose, L, W, t, id, 12, 1.2, 26, (p, u, i) => list.w(circle(p, 1.6 * (1 - u * 0.5)), RAINBOW[i % RAINBOW.length], o * (1 - u)));
        break;
      case 'nova': {
        // A star going off under the car: a white-gold glow that swells and settles.
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.4 + id);
        list.w(circle(pose.position, L * (0.8 + 0.25 * pulse)), 'fireCore', o * 0.08);
        list.w(circle(pose.position, L * (0.6 + 0.12 * pulse)), 'primary', o * 0.1);
        glow(['fireCore', 'primary'], 0.9, 0.35);
        break;
      }
      case 'singularity': {
        // Light falling into it: a dark well, and a disc of fire turning round the car.
        list.w(circle(pose.position, L * 0.85), 'groundHorizon', o * 0.55);
        for (let band = 0; band < 3; band++) {
          const spin = t * (1.6 - band * 0.35) + band * 2.1 + id;
          const color: ColorToken = band === 1 ? 'horizonViolet' : 'mapHorizon';
          list.w(arc(pose.position, L * (0.62 + band * 0.1), 1.6 - band * 0.3, spin, spin + 2.2), color, o * (0.75 - band * 0.18));
        }
        break;
      }
      case 'halo':
        list.w(circle(pose.position, L * 0.7), 'coin', o * 0.1);
        trail(pose, L, W, t, id, 8, 0.5, 20, (p, u) => list.w(circle(p, 1.1 * (1 - u * 0.4)), 'fireCore', o * 0.85 * (1 - u)));
        break;
      case 'soulfire':
        // Blue fire that does not go out: white at the car, blue, then violet where it fades.
        glow(['lightBlue', 'horizonViolet'], 0.7, 0.3);
        trail(pose, L, W, t, id, 14, 1.6, 26, (p, u) => {
          const color: ColorToken = u < 0.2 ? 'primary' : u < 0.6 ? 'lightBlue' : 'horizonViolet';
          list.w(circle(p, 3.2 * (1 - u * 0.6)), color, o * 0.85 * (1 - u));
        });
        break;
      case 'firefly':
        glow(['juiceYellow', 'mapGlowtide'], 0.9, 0.2);
        trail(pose, L, W, t, id, 6, 0.35, 22, (p, u) => list.w(circle(p, 1.4 * (1 - u * 0.5)), 'juiceYellow', o * 0.85 * (1 - u)));
        break;
      case 'chrono':
        // Time stutters: four echoes of the car, each a beat further back and paler.
        for (let k = 1; k <= 4; k++) {
          const echo = behind(pose, id, 8 * k + (time === null ? 0 : Math.sin(t * 2.2 + k * 1.3) * 1.2));
          list.w(rect(echo.p, v(L, W), 4.5, echo.h), k % 2 === 0 ? 'skinIce' : 'lightBlue', o * (0.24 - 0.045 * k));
        }
        break;
      case 'biolume':
        glow(['mapGlowtide', 'glowtideBlue'], 0.6, 0.38);
        trail(pose, L, W, t, id, 15, 0.5, 46, (p, u, i) => list.w(circle(p, 1.6 * (1 - u * 0.5)), i % 2 === 0 ? 'mapGlowtide' : 'glowtideBlue', o * 0.9 * (1 - u)));
        break;
      case 'dragon':
        glow(['fireOuter', 'fireDeep'], 0.8, 0.22);
        trail(pose, L, W, t, id, 16, 1.4, 36, (p, u) => {
          const color: ColorToken = u < 0.28 ? 'fireCore' : u < 0.62 ? 'fireOuter' : 'fireDeep';
          list.w(circle(p, 3 * (1 - u * 0.6)), color, o * 0.85 * (1 - u));
        });
        break;
      case 'ghost':
        // Afterimages: where it just was.
        for (const [back, share] of [[10, 0.18], [20, 0.08]] as const) {
          const echo = behind(pose, id, back);
          list.w(rect(echo.p, v(L, W), 4.5, echo.h), 'skinIce', o * share);
        }
        break;
      default:
        break;
    }
  },

  /** On the paint, under the windows and lamps: colour and cracks. */
  paint(list: RenderList, e: Effect, pose: Pose, L: number, W: number, time: number | null, id: number, o: number): void {
    const t = time ?? 0.35;
    if (e === 'rainbow') {
      const [a, b, k] = cycle(RAINBOW, t * 1.2 + id * 0.4);
      list.w(rect(pose.position, v(L - 1, W - 1), 4, pose.heading), a, o * 0.62 * (1 - k));
      list.w(rect(pose.position, v(L - 1, W - 1), 4, pose.heading), b, o * 0.62 * k);
    } else if (e === 'lava') {
      const pulse = 0.55 + 0.45 * Math.sin(t * 4 + id);
      for (let i = 0; i < 4; i++) {
        const x0 = -L / 2 + 3 + (i * (L - 6)) / 4;
        const pts = [0, 1, 2, 3].map((k) => at(pose, x0 + k * 1.8, (k % 2 === 0 ? -1 : 1) * W * 0.18 + (unitHash(id + i, k) - 0.5) * 3));
        for (let k = 1; k < pts.length; k++) list.w(line(pts[k - 1], pts[k], 1), 'fireOuter', o * pulse);
      }
    } else if (BEETLES.includes(e)) {
      // The seam between the wing cases on a body shaped like the Beetle's; each bug adds its own markings.
      list.w(line(at(pose, -L / 2 + 1.2, 0), at(pose, L / 2 - L * 0.2, 0), 0.9), 'vehicleTire', o * 0.9);
      const r = Math.min(W * 0.14, 1.9);
      const spots = (color: ColorToken, points: readonly (readonly [number, number])[]): void => {
        for (const [x, y] of points) list.w(circle(at(pose, x * L, y * W), y === 0 ? r * 0.85 : r), color, o);
      };
      if (e === 'ladybug') spots('vehicleTire', [[0.18, 0.24], [0.18, -0.24], [-0.06, 0.3], [-0.06, -0.3], [-0.3, 0.2], [-0.3, -0.2], [0.02, 0]]);
      else if (e === 'goldbug') {
        for (const x of [0.12, -0.12, -0.34]) list.w(rect(at(pose, x * L, 0), v(L * 0.09, W - 3), 0.6, pose.heading), 'vehicleTire', o * 0.9);
      } else if (e === 'scarab') {
        list.w(rect(at(pose, L * 0.22, 0), v(L * 0.14, W - 3), 1.2, pose.heading), 'skinGold', o);
        spots('skinGold', [[-0.1, 0.22], [-0.1, -0.22], [-0.3, 0]]);
      } else if (e === 'bluebottle') {
        for (const y of [-1, 1]) list.w(rect(at(pose, -L * 0.12, y * W * 0.22), v(L * 0.5, W * 0.3), 1.6, pose.heading), 'skinIce', o * 0.55);
      } else if (e === 'orchid') spots('skinPearl', [[0.14, 0.26], [0.14, -0.26], [-0.1, 0], [-0.3, 0.24], [-0.3, -0.24]]);
      else {
        const glint = 0.5 + 0.5 * Math.sin(t * 3 + id);
        list.w(rect(at(pose, -L / 2 + L * 0.17, 0), v(L * 0.2, W * 0.5), W * 0.25, pose.heading), 'juiceYellow', o * (0.55 + 0.45 * glint));
      }
    } else if (e === 'dragon') {
      // Scales: rows of small arcs, open towards the tail, darker than the paint.
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 5; col++) {
          const at0 = at(pose, -L * 0.4 + (col + (row % 2) * 0.5) * (L * 0.18), (row - 1.5) * W * 0.22);
          list.w(arc(at0, 1.5, 0.55, pose.heading + Math.PI * 0.55, pose.heading + Math.PI * 1.45), 'fireDeep', o * 0.55);
        }
      }
    } else if (e === 'chrono') {
      // A clock face on the roof: a ring, the hour hand creeping and the minute hand running.
      list.w(arc(pose.position, W * 0.3, 0.7, 0, Math.PI * 2), 'lightBlue', o * 0.75);
      list.w(line(pose.position, add(pose.position, mul(fromAngle(t * 0.5 + id), W * 0.18)), 0.9), 'primary', o * 0.9);
      list.w(line(pose.position, add(pose.position, mul(fromAngle(t * 3 + id), W * 0.28)), 0.6), 'primary', o * 0.9);
    } else if (e === 'biolume') {
      // Spots of light on the hull that breathe one after the other.
      for (let i = 0; i < 6; i++) {
        const glint = Math.max(0, Math.sin(t * 2 + i * 1.9 + id));
        list.w(circle(at(pose, (unitHash(id, i) - 0.5) * L * 0.7, (unitHash(id, i + 9) - 0.5) * W * 0.6), 0.8 + 0.5 * glint), 'mapGlowtide', o * (0.3 + 0.7 * glint));
      }
    } else if (e === 'aurora') {
      const x = ((t * 0.4 + id * 0.1) % 1) * L - L / 2;
      list.w(rect(at(pose, x, 0), v(4, W - 2), 2, pose.heading + 0.4), 'mapAurora', o * 0.5);
    }
  },

  /** Over everything: sparks, shards and bolts around the car. */
  over(list: RenderList, e: Effect, pose: Pose, L: number, W: number, time: number | null, id: number, o: number): void {
    const t = time ?? 0.35;
    switch (e) {
      case 'crystal':
      case 'laurel': {
        const color: ColorToken = e === 'crystal' ? 'skinIce' : 'coin';
        for (let i = 0; i < 3; i++) {
          const a = t * 1.6 + (i * Math.PI * 2) / 3 + id;
          const p = add(pose.position, mul(fromAngle(a), L * 0.62));
          if (e === 'crystal') list.w(rect(p, v(3.2, 3.2), 0.4, a + Math.PI / 4), color, o * 0.9);
          else {
            const star = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => add(p, mul(fromAngle(a + (k * Math.PI) / 5), k % 2 === 0 ? 2.8 : 1.2)));
            list.w(polygon(star), color, o * 0.95);
          }
        }
        break;
      }
      case 'lightning': {
        // A bolt crackles along one side, a new one every eighth of a second.
        const beat = Math.floor(t * 8);
        if (time !== null && unitHash(id, beat) < 0.45) break;
        const side = unitHash(id, beat + 99) < 0.5 ? 1 : -1;
        let prev = at(pose, -L / 2, side * (W / 2 + 1));
        for (let k = 1; k <= 6; k++) {
          const next = at(pose, -L / 2 + (k * L) / 6, side * (W / 2 + 1 + (unitHash(beat, k) - 0.3) * 4));
          list.w(line(prev, next, 1.8), 'lightBlue', o * 0.7);
          list.w(line(prev, next, 0.7), 'primary', o);
          prev = next;
        }
        break;
      }
      case 'nova':
        // Four rays turning slowly, a spark at each tip.
        for (let i = 0; i < 4; i++) {
          const a = t * 0.8 + (i * Math.PI) / 2 + id;
          const reach = L * (0.7 + 0.15 * Math.sin(t * 3 + i));
          const tip = add(pose.position, mul(fromAngle(a), reach));
          list.w(line(add(pose.position, mul(fromAngle(a), L * 0.45)), tip, 1), 'fireCore', o * 0.7);
          list.w(circle(tip, 1.4), 'primary', o * 0.95);
        }
        break;
      case 'singularity':
        // Specks spiralling in and vanishing at the car.
        for (let i = 0; i < 6; i++) {
          const u = (t * 0.5 + i / 6 + unitHash(id, i)) % 1;
          const a = i * 1.7 + u * 5 + id;
          const p = add(pose.position, mul(fromAngle(a), L * (1.1 - 0.7 * u)));
          list.w(circle(p, 1.3 * (1 - u * 0.5)), i % 2 === 0 ? 'mapHorizon' : 'horizonViolet', o * Math.sin(Math.PI * u));
        }
        break;
      case 'halo': {
        // A crown of light hovering over the roof, its points turning.
        list.w(arc(pose.position, W * 0.62, 1.2, 0, Math.PI * 2), 'coin', o * 0.85);
        for (let i = 0; i < 5; i++) {
          const a = t * 1.1 + (i * Math.PI * 2) / 5 + id;
          const base = add(pose.position, mul(fromAngle(a), W * 0.62));
          list.w(polygon([add(base, mul(fromAngle(a - 0.35), 1.2)), add(pose.position, mul(fromAngle(a), W * 0.62 + 3.2)), add(base, mul(fromAngle(a + 0.35), 1.2))]), 'fireCore', o * 0.95);
        }
        break;
      }
      case 'ladybug':
      case 'goldbug':
      case 'scarab':
      case 'bluebottle':
      case 'orchid':
      case 'firefly': {
        // Two feelers at the front, waving a little.
        const wave = time === null ? 0 : Math.sin(t * 5 + id) * 0.6;
        for (const y of [-1, 1]) {
          const root = at(pose, L / 2 - 0.6, y * W * 0.18);
          const tip = at(pose, L / 2 + 2.6, y * (W * 0.38 + wave));
          list.w(line(root, tip, 0.6), 'vehicleTire', o * 0.9);
          list.w(circle(tip, 0.75), 'vehicleTire', o);
        }
        break;
      }
      case 'chrono': {
        // The second hand: one spark running round the car.
        const a = t * 2.4 + id;
        list.w(circle(add(pose.position, mul(fromAngle(a), L * 0.62)), 1.4), 'primary', o * 0.95);
        list.w(circle(add(pose.position, mul(fromAngle(a - 0.35), L * 0.62)), 0.9), 'lightBlue', o * 0.6);
        break;
      }
      case 'biolume':
        // Motes of plankton drifting round it, each its own pace.
        for (let i = 0; i < 5; i++) {
          const a = t * (0.5 + 0.3 * unitHash(id, i)) + i * 1.3 + id;
          const twinkle = time === null ? 0.8 : 0.5 + 0.5 * Math.sin(t * 2.5 + i * 2);
          list.w(circle(add(pose.position, mul(fromAngle(a), L * (0.55 + 0.1 * unitHash(id, i + 4)))), 1.1), i % 2 === 0 ? 'mapGlowtide' : 'primary', o * 0.9 * twinkle);
        }
        break;
      case 'dragon':
        // Two golden horns at the front corners, and a little smoke from the nostrils of the grille.
        for (const y of [-1, 1]) {
          list.w(polygon([at(pose, L / 2 - 2.2, y * W * 0.3), at(pose, L / 2 - 2.2, y * W * 0.46), at(pose, L / 2 + 3.2, y * W * 0.52)]), 'skinGold', o);
        }
        break;
      case 'neon':
        for (const y of [-1, 1]) list.w(line(at(pose, -L / 2 + 2, y * (W / 2 - 0.6)), at(pose, L / 2 - 2, y * (W / 2 - 0.6)), 0.9), 'mapNeon', o * 0.9);
        break;
      default:
        break;
    }
  },

  /** A ghost fades in and out; every other effect keeps the car solid. */
  opacity(e: Effect | null, time: number | null, id: number): number {
    if (e !== 'ghost') return 1;
    const t = time ?? 0;
    return 0.5 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.5 + id)) + (unitHash(id, Math.floor(t * 10)) < 0.08 ? -0.2 : 0);
  },
};
