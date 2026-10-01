import { type Vec2, v, add } from '../core/vec2';
import { type RenderList, type Rect, R, rect, circle, line, text, Ease, Metrics } from './render';
import type { ColorToken } from './theme';
import { moneyTag } from './icons';
import { textWidth } from './icons';

const PAGE_BACKDROP = 0.92;

/** The iOS look of the drawn pages. */
export const MenuKit = {
  margin: 20,
  titleSize: 30,
  /** How much the pages dim the city behind them: it stays faintly there, one world. */
  pageBackdrop: PAGE_BACKDROP,

  /** The page's ground: the city dimmed nearly away. Shared by every page (a transition keeps it). */
  backdrop(list: RenderList, color: ColorToken = 'background', opacity: number = PAGE_BACKDROP): void {
    const vp = list.camera.viewport;
    const tag = list.tag;
    list.tag = 'backdrop';
    list.s(rect(v(vp.x / 2, vp.y / 2), vp), color, opacity);
    list.tag = tag;
  },

  /** Large title on the left, the balance as a chip on the right. */
  /** `swell` > 1 grows the money chip for a moment (coins landing in it). */
  header(list: RenderList, title: string, money: string, viewport: Vec2, swell = 1): void {
    const y = MenuKit.headerY;
    const tag = list.tag;
    list.tag = 'headerTitle';
    list.s(text(title, v(MenuKit.headerInset(viewport), y), MenuKit.titleSize, 'leading', 'bold'), 'primary');
    list.tag = 'headerChip';
    const size = 15;
    const chip = MenuKit.headerChip(viewport, money);
    list.s(rect(chip, v(MenuKit.chipWidth(money) * swell, 32 * swell), 16 * swell), 'controlFill');
    moneyTag(list, money, chip, size * swell, 'center', 'primary');
    list.tag = tag;
  },

  get headerY(): number {
    return Metrics.sceneInsets.top - 22;
  },

  /** Aligned with the page's content column, so on a wide screen it does not drift to the edges. */
  headerInset: (viewport: Vec2): number => Math.max(MenuKit.margin, (viewport.x - 460) / 2),

  chipWidth: (money: string): number => 15 * 0.78 + 15 * 0.34 + textWidth(money, 15) + 26,

  /** Where the header's money chip sits (coins fly there). */
  headerChip: (viewport: Vec2, money: string): Vec2 =>
    v(viewport.x - MenuKit.headerInset(viewport) - MenuKit.chipWidth(money) / 2, MenuKit.headerY),

  /** A segmented control: a sunk track and a raised thumb that can slide. */
  segmented(list: RenderList, labels: string[], chosen: number, thumb: number, r: Rect, locked: boolean[] = []): void {
    if (labels.length === 0) return;
    const height = R.height(r);
    const tag = list.tag;
    list.tag = 'segTrack';
    list.s(rect(R.center(r), v(R.width(r), height), 9), 'controlFill');
    list.tag = 'segThumb';
    const cell = R.width(r) / labels.length;
    const thumbCenter = v(r.minX + cell * (thumb + 0.5), R.center(r).y);
    const thumbSize = v(cell - 4, height - 4);
    list.s(rect(add(thumbCenter, v(0, 1)), thumbSize, 7), 'shadow');
    list.s(rect(thumbCenter, thumbSize, 7), 'controlThumb');
    list.tag = 'segLabels';
    labels.forEach((label, i) => {
      // A section that opens later stays in its place, faded.
      list.s(text(label, v(r.minX + cell * (i + 0.5), R.center(r).y), 13, 'center', i === chosen ? 'bold' : 'regular'), i === chosen ? 'primary' : 'muted', locked[i] ? 0.4 : 1);
    });
    list.tag = tag;
  },

  /** Filled in the accent for the main action, tinted for the others; disabled ones fade. */
  button(list: RenderList, label: string, center: Vec2, size: Vec2, prominent: boolean, enabled: boolean): void {
    const radius = Math.min(12, size.y / 2);
    if (prominent) {
      list.s(rect(center, size, radius), 'accent', enabled ? 1 : 0.35);
      list.s(text(label, center, 14, 'center', 'bold'), 'accentInk', enabled ? 1 : 0.6);
      return;
    }
    if (enabled) list.s(rect(center, size, radius), 'accent');
    list.s(rect(center, v(size.x - 3, size.y - 3), radius - 1.5), 'cardRaised', enabled ? 1 : 0.6);
    list.s(text(label, center, 14, 'center', 'bold'), enabled ? 'primary' : 'muted', enabled ? 1 : 0.7);
  },

  /** Soft light: stacked discs, faint at the rim and brighter towards the middle. */
  glow(list: RenderList, center: Vec2, radius: number, color: ColorToken, opacity: number): void {
    if (radius <= 0.5 || opacity <= 0) return;
    // Many thin layers, so the light falls off smoothly instead of in rings.
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const k = i / steps;
      list.s(circle(center, radius * (1 - 0.85 * Math.sqrt(k))), color, (opacity / steps) * 1.1);
    }
  },

  /** 0 → 1 for the `index`-th item coming in: 40 ms apart, 250 ms each, ease-out. */
  stagger: (age: number, index: number): number => Ease.outCubic((age - 0.04 * index) / 0.25),
  staggerSpring: (age: number, index: number): number => Ease.settle((age - 0.04 * index) / 0.45),
  /** Offset and scale of a card coming in: 14 points below, 94 %. */
  cardEnter: (spring: number): { rise: number; scale: number } => ({ rise: (1 - spring) * 14, scale: 0.94 + 0.06 * spring }),

  chromePill(list: RenderList, center: Vec2, size: Vec2, opacity: number, tint: ColorToken | null = null): void {
    MenuKit.chromePanel(list, R.make(center.x - size.x / 2, center.y - size.y / 2, center.x + size.x / 2, center.y + size.y / 2), size.y / 2, opacity, tint);
  },

  /** A floating panel of chrome: a soft shadow, the material, a hairline of light along the top. */
  chromePanel(list: RenderList, frame: Rect, radius: number, opacity: number, tint: ColorToken | null = null, tintOpacity = 1): void {
    const center = R.center(frame);
    const size = v(R.width(frame), R.height(frame));
    list.s(rect(add(center, v(0, 3)), add(size, v(4, 4)), radius + 2), 'shadow', opacity);
    if (tint) list.s(rect(center, add(size, v(3, 3)), radius + 1.5), tint, 0.55 * opacity * tintOpacity);
    list.s(rect(center, size, radius), 'chrome', opacity);
    const inset = Math.min(radius * 1.3, size.x / 2 - 1);
    list.s(line(add(center, v(-size.x / 2 + inset, -size.y / 2 + 1)), add(center, v(size.x / 2 - inset, -size.y / 2 + 1)), 1), 'chromeEdge', opacity);
  },
};
