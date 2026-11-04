import type { World } from '../core/world';
import { substream } from '../core/rng';
import { v, add, mul, fromAngle, lerpV } from '../core/vec2';
import { type RenderList, rect, circle, Ease } from './render';
import { interpolatedPose } from './scene';

type Kind = 'balloon' | 'wedding' | 'star';

interface Plan {
  kind: Kind;
  start: number;
  angle: number;
  /** The wedding car: which of the first cars it is. */
  car: number;
}

const CHANCE = 1 / 120;
const BALLOON_SECONDS = 26;
const STAR_SECONDS = 1.1;
let memo: { seed: number; plan: Plan | null } | null = null;

/**
 * Rare moments in the sky and on the kerb (Leo, 04.11.2026): a red balloon drifts off a roof, a lone wedding car with
 * tin cans drives by, a shooting star crosses a clear night. Looks only: no points, no notice, no effect on the
 * traffic. Whether and when comes from the seed alone, so a replay shows the same one. Only for veterans: from
 * Prestige ★5 or a 30-day streak.
 */
export const SkyMoments = {
  eligible: (prestige: number, streak: number): boolean => prestige >= 5 || streak >= 30,

  plan(w: World): Plan | null {
    if (memo?.seed === w.seed) return memo.plan;
    const c = w.config;
    const r = substream(w.seed, 0x5ca1ab1e);
    let plan: Plan | null = null;
    if (!c.mayhem && !w.isVersus && r.unit() < CHANCE) {
      const kinds: Kind[] = c.night && c.weather === 'clear' ? ['balloon', 'wedding', 'star'] : ['balloon', 'wedding'];
      plan = { kind: kinds[r.int(0, kinds.length - 1)], start: r.range(8, 40), angle: r.range(0, Math.PI * 2), car: r.int(4, 12) };
    }
    memo = { seed: w.seed, plan };
    return plan;
  },

  add(list: RenderList, world: World, alpha: number, reduceMotion: boolean, eligible: boolean): void {
    if (!eligible) return;
    const plan = SkyMoments.plan(world);
    if (!plan) return;
    const t = world.time - plan.start;
    if (plan.kind === 'wedding') SkyMoments.wedding(list, world, alpha, plan, world.time);
    else if (t >= 0 && plan.kind === 'balloon') SkyMoments.balloon(list, world, plan, t, reduceMotion);
    else if (t >= 0 && plan.kind === 'star') SkyMoments.star(list, world, plan, t);
  },

  /** A red balloon: up off a roof on one side, over the ring, away on the other; it sways and its string trails. */
  balloon(list: RenderList, w: World, p: Plan, t: number, rm: boolean): void {
    const k = t / BALLOON_SECONDS;
    if (k > 1) return;
    const R = w.layout.ringRadius * 1.7;
    const dir = fromAngle(p.angle);
    const side = fromAngle(p.angle + Math.PI / 2);
    const sway = rm ? 0 : Math.sin(t * 1.3) * 7;
    const at = add(lerpV(mul(dir, -R), mul(dir, R), Ease.smoothstep(k) * 0.5 + k * 0.5), mul(side, sway));
    const o = Math.min(Ease.clamp01(k / 0.06), Ease.clamp01((1 - k) / 0.1));
    const z = 1.2 + 0.5 * Math.sin(Math.PI * k);
    list.w(circle(add(at, v(5, 7)), 3.6 * z), 'shadow', 0.25 * o);
    const tail = add(at, add(mul(dir, -9 * z), mul(side, rm ? 0 : Math.sin(t * 2.1) * 2)));
    list.w(rect(lerpV(at, tail, 0.5), v(0.5, 9 * z), 0.25, Math.atan2(tail.y - at.y, tail.x - at.x) + Math.PI / 2), 'skinCream', 0.7 * o);
    list.w(circle(at, 4.2 * z), 'skinRacingRed', o);
    list.w(circle(add(at, v(-1.4 * z, -1.5 * z)), 1.2 * z), 'skinCream', 0.55 * o);
  },

  /** A shooting star: a bright head and a tail that thins out, across the dark above the city. */
  star(list: RenderList, w: World, p: Plan, t: number): void {
    const k = t / STAR_SECONDS;
    if (k > 1) return;
    const R = w.layout.ringRadius * 2;
    const dir = fromAngle(p.angle);
    const side = fromAngle(p.angle + Math.PI / 2);
    const from = add(mul(dir, -R), mul(side, R * 0.5));
    const to = add(mul(dir, R), mul(side, -R * 0.1));
    const o = Math.sin(Math.PI * k);
    for (let i = 0; i < 9; i++) {
      const at = lerpV(from, to, Math.max(0, k - i * 0.012));
      list.w(circle(at, 2.2 - i * 0.2), 'skinCream', o * (1 - i / 9));
    }
  },

  /** One ordinary car, dressed for a wedding: a bow on the roof and tin cans on strings that bounce behind it. */
  wedding(list: RenderList, w: World, alpha: number, p: Plan, time: number): void {
    const veh = w.vehicles.find((x) => x.id === p.car);
    if (!veh?.isBot || !veh.isCollidable) return;
    const pose = interpolatedPose(veh, alpha);
    const back = fromAngle(pose.heading + Math.PI);
    const side = fromAngle(pose.heading + Math.PI / 2);
    list.w(circle(pose.position, 3.2), 'skinCream', 0.95);
    list.w(circle(add(pose.position, mul(back, 0.3)), 1.4), 'skinRose', 0.95);
    const rear = add(pose.position, mul(back, w.config.carLength / 2));
    for (let i = 0; i < 4; i++) {
      const far = 5 + i * 5;
      const hop = Math.sin(time * 14 + i * 1.7) * 1.4;
      const at = add(add(rear, mul(back, far)), mul(side, hop + (i % 2 === 0 ? 1.5 : -1.5)));
      list.w(rect(lerpV(rear, at, 0.5), v(0.3, far), 0.15, Math.atan2(at.y - rear.y, at.x - rear.x) + Math.PI / 2), 'skinCream', 0.5);
      list.w(rect(at, v(2.2, 2.8), 0.6, pose.heading), 'skinSilver', 1);
    }
  },
};
