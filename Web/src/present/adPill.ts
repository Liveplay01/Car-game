import { type Vec2, v, add } from '../core/vec2';
import { type RenderList, type Rect, R, rect, polygon, text, Ease } from './render';
import { MenuKit } from './menukit';
import { textWidth } from './icons';

/**
 * The button of a rewarded ad on the Game tab (Leo, 16.10.2026): a glass pill with a play sign and
 * what the ad pays, under the top card. It springs in, breathes, sends a ring off its edge and a
 * glint across it now and then, so the eye finds it without a word of shouting. Its hit box is a
 * thumb tall, taller than the pill.
 */
export const AdPill = {
  height: 30,
  /** The row it takes under the top card, spacing included. */
  row: 33,
  hit: 44,

  /** The pill for `label`, centred on `at`. */
  size: (label: string): Vec2 => v(textWidth(label, 12) + 52, AdPill.height),

  /** Where a tap counts. */
  target(label: string, at: Vec2): Rect {
    const s = AdPill.size(label);
    return R.make(at.x - s.x / 2 - 6, at.y - AdPill.hit / 2, at.x + s.x / 2 + 6, at.y + AdPill.hit / 2);
  },

  /** `age` seconds since it appeared; `pressed` dips it under a finger. */
  add(list: RenderList, label: string, at: Vec2, age: number, opacity: number, reduceMotion: boolean, pressed = false): void {
    const enter = reduceMotion ? Ease.clamp01(age / 0.2) : Ease.spring(age / 0.45);
    const a = Math.min(1, enter * 2) * opacity;
    if (a <= 0.001) return;
    const t = reduceMotion ? 0 : age;
    const breathe = 1 + 0.025 * Math.sin(t * 3);
    const size = AdPill.size(label);
    const scale = Math.max(0.01, 0.8 + 0.2 * enter) * breathe * (pressed ? 0.96 : 1);
    const box = v(size.x * scale, size.y * scale);
    if (!reduceMotion) {
      // A ring leaves the edge every 2.6 s, after the pill has settled.
      const ring = ((age - 0.6) % 2.6) / 0.9;
      if (age > 0.6 && ring < 1) list.s(rect(at, v(box.x + 26 * Ease.outCubic(ring), box.y + 26 * Ease.outCubic(ring)), box.y / 2 + 13 * Ease.outCubic(ring)), 'accent', 0.35 * (1 - ring) * a);
      MenuKit.glow(list, at, box.x * 0.55, 'accent', 0.12 * a);
    }
    MenuKit.chromePill(list, at, box, a, 'accent');
    const left = at.x - box.x / 2 + 20 * scale;
    const tri = 5.5 * scale;
    list.s(polygon([v(left - tri * 0.7, at.y - tri), v(left - tri * 0.7, at.y + tri), v(left + tri * 1.1, at.y)]), 'accent', a);
    list.s(text(label, v(at.x + 11 * scale, at.y), 12, 'center', 'bold'), 'primary', a);
    if (!reduceMotion && age > 0.5) {
      // A glint crossing the pill, slanted.
      const x = ((age - 0.5) % 4) / 0.7;
      if (x < 1) {
        const gx = at.x - box.x / 2 + box.x * x;
        const w = box.y * 0.5;
        list.s(polygon([add(v(gx, at.y - box.y / 2 + 2), v(w * 0.4, 0)), add(v(gx, at.y - box.y / 2 + 2), v(w, 0)), add(v(gx, at.y + box.y / 2 - 2), v(w * 0.6, 0)), add(v(gx, at.y + box.y / 2 - 2), v(0, 0))]), 'primary', 0.22 * Math.sin(Math.PI * x) * a);
      }
    }
  },
};
