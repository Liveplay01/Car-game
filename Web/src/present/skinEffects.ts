import type { Pose } from '../core/paths';
import { type Vec2, v, add, mul, fromAngle } from '../core/vec2';
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
  | 'soulfire';

/** A local point of the car in world space (x forward, y left). */
const at = (pose: Pose, x: number, y: number): Vec2 => {
  const c = Math.cos(pose.heading);
  const s = Math.sin(pose.heading);
  return add(pose.position, v(x * c - y * s, x * s + y * c));
};

const RAINBOW: ColorToken[] = ['juiceRed', 'juiceOrange', 'juiceYellow', 'juiceGreen', 'juiceBlue', 'juicePurple'];
const AURORA: ColorToken[] = ['mapAurora', 'skinLagoon', 'juicePurple', 'mapNeon'];

/** Two colours of a cycle and how far the second has come in: a smooth colour change. */
function cycle(colors: ColorToken[], phase: number): [ColorToken, ColorToken, number] {
  const n = colors.length;
  const p = ((phase % n) + n) % n;
  const i = Math.floor(p);
  return [colors[i], colors[(i + 1) % n], p - i];
}

/** Particles streaming off the back of the car: 0 at the bumper, 1 where they vanish. */
function trail(pose: Pose, L: number, W: number, t: number, id: number, count: number, rate: number, reach: number, draw: (p: Vec2, u: number, i: number) => void): void {
  for (let i = 0; i < count; i++) {
    const u = (t * rate + i / count + unitHash(id, i)) % 1;
    const side = (unitHash(id * 13 + i, 7) - 0.5) * W * (0.6 + u * 0.8);
    draw(at(pose, -L / 2 - u * reach, side + Math.sin(t * 3 + i) * u * 2), u, i);
  }
}

export const SkinEffects = {
  /** Under the body: glows and trails, so the paint stays on top. */
  under(list: RenderList, e: Effect, pose: Pose, L: number, W: number, time: number | null, id: number, o: number): void {
    const t = time ?? 0.35;
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
      case 'ghost':
        // Afterimages: where it just was.
        for (const [back, share] of [[10, 0.18], [20, 0.08]] as const) {
          list.w(rect(at(pose, -back, 0), v(L, W), 4.5, pose.heading), 'skinIce', o * share);
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
