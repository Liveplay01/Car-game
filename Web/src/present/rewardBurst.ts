import { type Vec2, v, add, mul, fromAngle, TAU } from '../core/vec2';
import { type RenderList, rect, circle, arc, line, polygon, Ease, unitHash, drawText } from './render';
import type { ColorToken } from './theme';
import { MenuKit } from './menukit';
import { ShopPage, JUICE } from './shop';
import { Fmt } from './strings';

export type BurstKind = 'rescue' | 'freeze' | 'double' | 'retry' | 'chest' | 'firstWin' | 'levelFive' | 'streak' | 'challenge';

/** One celebration: what it says, in which colour, how strong, and a number that counts up under the title. */
export interface Burst {
  kind: BurstKind;
  title: string;
  line: string;
  color: ColorToken;
  power: number;
  count?: number;
}

const unit = (index: number, salt: number): number => unitHash(index, salt + 733);

/**
 * The big moments (Leo, 16.10.2026: "übermäßig animiert"): a streak brought back, a Freeze, the pay
 * doubled and the three moments the game is about (the first shift won, Level 5, a streak milestone).
 * Light, rays, shock rings, confetti, a medallion that springs in with orbiting stars; a doubled pay
 * rains coins and counts up. Over the scene, never blocking: a tap goes through. A pure function of
 * the age, like the chest opening; with Reduce Motion only the medallion and its words fade in and out.
 */
export const RewardBurst = {
  duration: 3.4,
  fade: 0.5,

  add(list: RenderList, b: Burst, age: number, reduceMotion: boolean): void {
    const vp = list.camera.viewport;
    const center = v(vp.x / 2, vp.y * 0.46);
    const out = 1 - Ease.smoothstep((age - (RewardBurst.duration - RewardBurst.fade)) / RewardBurst.fade);
    const into = Ease.clamp01(age / 0.15);
    const a = into * out;
    if (a <= 0.001) return;
    list.s(rect(mul(vp, 0.5), vp), 'background', 0.5 * a);
    if (!reduceMotion) {
      const rare = b.power >= 1.2;
      ShopPage.addRays(list, center, age, b.power, b.color, rare, b.kind === 'double');
      ShopPage.addConfetti(list, center, age, b.power, b.color, b.kind === 'double');
      RewardBurst.rings(list, center, age, b);
      if (b.kind === 'double') ShopPage.addCoinRain(list, vp, age, 46);
    }
    RewardBurst.medallion(list, center, age, b, reduceMotion, a);
    RewardBurst.words(list, center, age, b, reduceMotion, a);
    if (!reduceMotion && age < 0.3) {
      const white = Math.max(0, 1 - age / 0.14);
      if (white > 0) list.s(rect(mul(vp, 0.5), vp), 'primary', 0.8 * white);
      list.s(rect(mul(vp, 0.5), vp), b.color, 0.28 * (1 - age / 0.3));
    }
  },

  /** Extra shock rings in the strongest colour, a second salvo half a second later. */
  rings(list: RenderList, center: Vec2, age: number, b: Burst): void {
    for (const [delay, reach] of [[0.05, 1], [0.18, 0.75], [0.55, 1.15], [0.7, 0.8]] as const) {
      const x = (age - delay) / 0.7;
      if (x <= 0 || x >= 1) continue;
      list.s(arc(center, 40 + 360 * reach * Ease.outCubic(x), 9 * (1 - x) + 1, 0, TAU), delay > 0.5 ? b.color : 'primary', 0.75 * (1 - x));
    }
  },

  medallion(list: RenderList, center: Vec2, age: number, b: Burst, reduceMotion: boolean, a: number): void {
    const pop = reduceMotion ? 1 : Ease.spring(age / 0.42);
    const breathe = reduceMotion ? 0 : 0.04 * Math.sin(age * 5);
    const r = 58 * Math.max(0, pop) * (1 + breathe);
    if (r <= 1) return;
    MenuKit.glow(list, center, r * 2.6, b.color, 0.45 * a);
    list.s(circle(center, r + 6), b.color, a);
    list.s(circle(center, r), 'card', a);
    list.s(circle(center, r), b.color, 0.16 * a);
    const t = reduceMotion ? 0 : age;
    RewardBurst.glyph(list, center, r, b, t, a);
    if (reduceMotion || age < 0.3) return;
    // Stars orbiting the medallion, each twinkling on its own beat.
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * TAU + age * (0.9 + 0.2 * (i % 2));
      const at = add(center, mul(fromAngle(ang), r + 26 + 7 * Math.sin(age * 3 + i)));
      const tw = 0.5 + 0.5 * Math.sin(age * 6 + i * 1.7);
      ShopPage.addStar(list, at, (5 + 6 * unit(i, 9)) * (0.4 + tw) * Math.min(1, (age - 0.3) / 0.3), JUICE[i % JUICE.length], a * (0.4 + 0.6 * tw));
    }
  },

  glyph(list: RenderList, c: Vec2, r: number, b: Burst, t: number, a: number): void {
    const s = r / 58;
    if (b.kind === 'rescue' || b.kind === 'streak') {
      // A flame of three tongues that lick upwards.
      for (const [scale, color] of [[1, 'fireDeep'], [0.72, 'fireOuter'], [0.42, 'fireCore']] as const) {
        const pts: Vec2[] = [];
        for (let k = 0; k <= 12; k++) {
          const p = k / 12;
          const half = 22 * s * scale * Math.sin(Math.PI * Math.pow(p, 0.7)) * (1 - 0.25 * p);
          const sway = Math.sin(t * 9 + p * 5 + scale * 3) * 4 * s * p;
          pts.push(v(c.x - half + sway, c.y + 28 * s - 62 * s * scale * p));
        }
        for (let k = 12; k >= 0; k--) {
          const p = k / 12;
          const half = 22 * s * scale * Math.sin(Math.PI * Math.pow(p, 0.7)) * (1 - 0.25 * p);
          const sway = Math.sin(t * 9 + p * 5 + scale * 3) * 4 * s * p;
          pts.push(v(c.x + half + sway, c.y + 28 * s - 62 * s * scale * p));
        }
        list.s(polygon(pts), color, a);
      }
      return;
    }
    if (b.kind === 'freeze') {
      for (let i = 0; i < 3; i++) {
        const dir = fromAngle((i / 3) * Math.PI + t * 0.4);
        list.s(line(add(c, mul(dir, -34 * s)), add(c, mul(dir, 34 * s)), 4.5 * s), 'lightBlue', a);
        for (const side of [-1, 1]) {
          const tip = add(c, mul(dir, 34 * s * side));
          const back = add(c, mul(dir, 22 * s * side));
          for (const turn of [-0.7, 0.7]) list.s(line(tip, add(back, mul(fromAngle(Math.atan2(dir.y * side, dir.x * side) + turn), 11 * s)), 3.2 * s), 'lightBlue', a);
        }
      }
      list.s(circle(c, 6 * s), 'primary', a);
      return;
    }
    if (b.kind === 'retry') {
      // A circle of arrow, turning once as the medallion springs in.
      const turn = Math.min(1, t / 0.9);
      const from = -Math.PI / 2 + TAU * 0.08 + TAU * Ease.outCubic(turn);
      list.s(arc(c, 30 * s, 8 * s, from, from + TAU * 0.78), b.color, a);
      const tip = add(c, mul(fromAngle(from + TAU * 0.78), 30 * s));
      const dir = from + TAU * 0.78 + Math.PI / 2;
      list.s(polygon([add(tip, mul(fromAngle(dir), 13 * s)), add(tip, mul(fromAngle(dir + 2.3), 13 * s)), add(tip, mul(fromAngle(dir - 2.3), 13 * s))]), b.color, a);
      return;
    }
    if (b.kind === 'double') {
      drawText(list, '×2', add(c, v(0, -3 * s)), 44 * s * (1 + 0.08 * Math.sin(t * 7)), 'coin', { weight: 'bold', align: 'center', opacity: a });
      return;
    }
    if (b.kind === 'challenge') {
      // A tick drawn stroke by stroke: down from the left, then up to the right.
      const p = Math.min(1, t / 0.55);
      const down = Math.min(1, p * 2);
      const up = Math.max(0, p * 2 - 1);
      const a0 = add(c, v(-25 * s, 1 * s));
      const knee = add(c, v(-7 * s, 19 * s));
      const tip = add(c, v(26 * s, -19 * s));
      if (down > 0) list.s(line(a0, add(a0, mul(add(knee, mul(a0, -1)), down)), 8 * s), b.color, a);
      if (up > 0) list.s(line(knee, add(knee, mul(add(tip, mul(knee, -1)), up)), 8 * s), b.color, a);
      return;
    }
    ShopPage.addStar(list, c, 38 * s * (1 + 0.06 * Math.sin(t * 5)), b.color, a);
    ShopPage.addStar(list, c, 20 * s, 'primary', 0.8 * a);
  },

  words(list: RenderList, center: Vec2, age: number, b: Burst, reduceMotion: boolean, a: number): void {
    const slam = reduceMotion ? 1 : age < 0.15 ? 0 : Ease.spring((age - 0.15) / 0.35);
    drawText(list, b.title.toUpperCase(), add(center, v(0, 100)), 26 * (1 + 0.9 * (1 - slam)), b.color, { weight: 'bold', align: 'center', opacity: Math.min(1, slam * 2) * a });
    const line2 = reduceMotion ? 1 : Ease.outCubic((age - 0.35) / 0.3);
    const shown = b.count === undefined ? b.line : '+' + Fmt.number(Math.round(b.count * (reduceMotion ? 1 : Ease.outCubic((age - 0.4) / 1.1))));
    const pop = b.count !== undefined && !reduceMotion && age > 1.5 && age < 1.8 ? 1 + 0.3 * Math.sin(((age - 1.5) / 0.3) * Math.PI) : 1;
    drawText(list, shown, add(center, v(0, 134 - 8 * (1 - line2))), (b.count === undefined ? 16 : 24) * pop, 'primary', { weight: 'bold', align: 'center', opacity: line2 * a });
  },
};
