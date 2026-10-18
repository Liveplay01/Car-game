import { type Vec2, v, add } from '../core/vec2';
import { type RenderList, rect, circle, softPolygon, drawText } from './render';
import type { ColorToken } from './theme';
import { currentLanguage } from './i18n';

/**
 * The road signs on the Goals cards (Leo, 18.10.2026), in the language's own country. The Vienna-convention signs of the EU
 * (round speed limit with a red ring, red-edged triangle, yellow priority diamond), the American ones (white speed-limit
 * plate, yellow diamond, yield triangle), and the Asian ones: Japan (yellow warning diamond), Korea (red-edged triangle),
 * China (yellow triangle), all with a blue mandatory disc where the EU has the priority diamond. A region in the browser's
 * language (`en-GB`, `zh-SG`) picks the British and Singaporean signs, which are Vienna-style with the blue disc.
 * Colours come from the interface's own roles; what is not earned yet is dimmed.
 */
type Style = 'eu' | 'us' | 'uk' | 'jp' | 'kr' | 'cn';

/** Where traffic keeps to the left and the signs follow the British pattern; Ireland follows the EU. */
const BRITISH = ['GB', 'SG', 'IN', 'HK'];

function styleOf(): Style {
  const language = currentLanguage();
  const region = typeof navigator === 'undefined' ? undefined : navigator.languages?.find((l) => l.slice(0, 2).toLowerCase() === language)?.split('-')[1]?.toUpperCase();
  if (language === 'ja') return 'jp';
  if (language === 'ko') return 'kr';
  if (language === 'zh') return region && BRITISH.includes(region) ? 'uk' : 'cn';
  if (language === 'en') return region && BRITISH.includes(region) ? 'uk' : region === 'IE' ? 'eu' : 'us';
  return 'eu';
}

const style = styleOf();
const DIM = 0.4;
const TURN = Math.PI / 4;

export const Signs = {
  /** An achievement: a speed limit with the tier reached as its number. */
  limit(list: RenderList, at: Vec2, reached: number, complete: boolean, o: number): void {
    const shown = o * (reached > 0 ? 1 : DIM);
    if (style === 'us') {
      if (complete) list.s(rect(at, v(31, 37), 8), 'coin', 0.9 * o);
      list.s(rect(at, v(26, 32), 5), 'primary', shown);
      list.s(rect(at, v(22, 28), 3), 'accentInk', shown);
      list.s(rect(at, v(20, 26), 2), 'primary', shown);
      list.s(rect(add(at, v(0, -9.5)), v(12, 1.8), 0.9), 'accentInk', shown);
      list.s(rect(add(at, v(0, -6.5)), v(9, 1.8), 0.9), 'accentInk', shown);
      drawText(list, String(reached), v(at.x, at.y + 5), 13, 'accentInk', { opacity: shown, weight: 'display', align: 'center' });
      return;
    }
    if (complete) list.s(circle(at, 19.5), 'coin', 0.9 * o);
    list.s(circle(at, 16), 'destructive', shown);
    list.s(circle(at, 11.5), 'primary', shown);
    drawText(list, String(reached), v(at.x, at.y + 0.5), 13, 'accentInk', { opacity: shown, weight: 'display', align: 'center' });
  },

  /** Mastery: the tier reached in a sign of its own: the yellow priority diamond (EU), a warning diamond (USA), else the blue disc. */
  diamond(list: RenderList, at: Vec2, reached: number, complete: boolean, o: number): void {
    const shown = o * (reached > 0 ? 1 : DIM);
    let ink: ColorToken = 'accentInk';
    if (style === 'eu') {
      if (complete) list.s(rect(at, v(29, 29), 8, TURN), 'coin', 0.9 * o);
      list.s(rect(at, v(26, 26), 6, TURN), 'primary', shown);
      list.s(rect(at, v(23.5, 23.5), 5, TURN), 'accentInk', shown);
      list.s(rect(at, v(22, 22), 4.5, TURN), 'accent', shown);
    } else if (style === 'us') {
      if (complete) list.s(rect(at, v(29, 29), 8, TURN), 'coin', 0.9 * o);
      list.s(rect(at, v(25, 25), 5, TURN), 'accentInk', shown);
      list.s(rect(at, v(22.5, 22.5), 4, TURN), 'accent', shown);
    } else {
      ink = 'primary';
      if (complete) list.s(circle(at, 19.5), 'coin', 0.9 * o);
      list.s(circle(at, 16), 'primary', shown);
      list.s(circle(at, 14.5), 'signBlue', shown);
    }
    drawText(list, String(reached), v(at.x, at.y + 0.5), 13, ink, { opacity: shown, weight: 'display', align: 'center' });
  },

  /**
   * A Feat: a sign's edge round its reward, the face left dark so every skin keeps its own colours: the red-edged warning
   * triangle (EU, Korea, Britain), the yield triangle (USA), the yellow triangle (China), the yellow diamond (Japan).
   */
  triangle(list: RenderList, at: Vec2, complete: boolean, o: number): void {
    const edge: ColorToken = style === 'cn' || style === 'jp' ? 'accent' : 'destructive';
    const strength = (complete ? 1 : 0.6) * o;
    if (style === 'jp') {
      if (complete) list.s(rect(at, v(37, 37), 9, TURN), 'coin', 0.9 * o);
      list.s(rect(at, v(33, 33), 8, TURN), edge, strength);
      list.s(rect(at, v(26, 26), 5.5, TURN), 'card', o);
      list.s(rect(at, v(26, 26), 5.5, TURN), 'primary', 0.08 * o);
      return;
    }
    const down = style === 'us';
    const outer = down ? [v(-25, -19), v(25, -19), v(0, 23)] : [v(0, -23), v(25, 19), v(-25, 19)];
    const middle = down ? -5 : 5;
    const scaled = (k: number): Vec2[] => outer.map((p) => add(at, v(p.x * k, middle + (p.y - middle) * k)));
    if (complete) list.s(softPolygon(scaled(1.12), 10), 'coin', 0.9 * o);
    list.s(softPolygon(scaled(1), 9), edge, strength);
    list.s(softPolygon(scaled(0.8), 6), 'card', o);
    list.s(softPolygon(scaled(0.8), 6), 'primary', 0.08 * o);
  },
};
