import { type Vec2, v, add } from '../core/vec2';
import { type RenderList, rect, circle, arc, softPolygon, drawText } from './render';
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
export type SignStyle = 'eu' | 'us' | 'uk' | 'jp' | 'kr' | 'cn';
type Style = SignStyle;

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
/** The country's pattern the signs, and the number plate on the photo, follow. */
export const signStyle: SignStyle = style;
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
   * A Feat's small warning badge, in the corner of the tile that holds its reward (the hardest deeds): the red-edged warning
   * triangle (EU, Korea, Britain), the yield triangle (USA), the yellow triangle (China), the yellow diamond (Japan), each with a "!".
   */
  triangle(list: RenderList, at: Vec2, complete: boolean, o: number): void {
    const edge: ColorToken = style === 'cn' || style === 'jp' ? 'accent' : 'destructive';
    const strength = (complete ? 1 : 0.7) * o;
    if (style === 'jp') {
      if (complete) list.s(rect(at, v(18, 18), 4.5, TURN), 'coin', 0.9 * o);
      list.s(rect(at, v(15, 15), 3.5, TURN), edge, strength);
      list.s(rect(at, v(11.5, 11.5), 2.5, TURN), 'card', o);
      drawText(list, '!', v(at.x, at.y + 0.5), 9, edge, { opacity: strength, weight: 'display', align: 'center' });
      return;
    }
    const down = style === 'us';
    const outer = down ? [v(-11.5, -9), v(11.5, -9), v(0, 10.5)] : [v(0, -10.5), v(11.5, 9), v(-11.5, 9)];
    const middle = down ? -2 : 2;
    const scaled = (k: number): Vec2[] => outer.map((p) => add(at, v(p.x * k, middle + (p.y - middle) * k)));
    if (complete) list.s(softPolygon(scaled(1.2), 4), 'coin', 0.9 * o);
    list.s(softPolygon(scaled(1), 3.5), edge, strength);
    list.s(softPolygon(scaled(0.74), 2.5), 'card', o);
    drawText(list, '!', v(at.x, at.y + (down ? -2 : 3.5)), 9, edge, { opacity: strength, weight: 'display', align: 'center' });
  },

  /** A sign's plate: white rim, the sign's colour inside. */
  plate(list: RenderList, at: Vec2, fill: ColorToken, complete: boolean, o: number): void {
    if (complete) list.s(rect(at, v(39, 31), 8), 'coin', 0.9 * o);
    list.s(rect(at, v(34, 26), 6), 'primary', o);
    list.s(rect(at, v(29, 21), 4), fill, o);
  },

  /** A trial: the blue information sign with a chequered flag. */
  trial(list: RenderList, at: Vec2, complete: boolean, o: number): void {
    Signs.plate(list, at, 'signBlue', complete, o);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) if ((row + col) % 2 === 0) list.s(rect(v(at.x - 6 + col * 4, at.y - 4 + row * 4), v(4, 4)), 'primary', o);
    }
  },

  /** A Level trial: the green route sign with the level as its number. */
  levelTrial(list: RenderList, at: Vec2, level: number, complete: boolean, o: number): void {
    Signs.plate(list, at, 'signGreen', complete, o);
    drawText(list, String(level), v(at.x, at.y + 0.5), level > 99 ? 11 : 13, 'primary', { opacity: o, weight: 'display', align: 'center' });
  },

  /** An Ascension, one per Prestige rank: a gold-edged octagon, the rank's star and number inside. */
  ascension(list: RenderList, at: Vec2, rank: number, complete: boolean, o: number): void {
    if (complete) list.s(softPolygon(octagon(at, 21), 5), 'coin', 0.9 * o);
    list.s(softPolygon(octagon(at, 18), 4), 'coin', o);
    list.s(softPolygon(octagon(at, 15.5), 3), 'card', o);
    drawText(list, '★', v(at.x, at.y - 5.5), 10, 'coin', { opacity: o, weight: 'display', align: 'center' });
    drawText(list, String(rank), v(at.x, at.y + 6), 12, 'primary', { opacity: o, weight: 'display', align: 'center' });
  },

  /** A Landmark: the brown tourist sign, with the three arrows of a roundabout. */
  landmark(list: RenderList, at: Vec2, complete: boolean, o: number): void {
    Signs.plate(list, at, 'signBrown', complete, o);
    for (let k = 0; k < 3; k++) list.s(arc(at, 6.5, 2.2, (k * TAU) / 3 + 0.3, ((k + 1) * TAU) / 3 - 0.3), 'primary', o);
  },

  /** Boss Rush: a stop sign, red with a white rim, and the number of bosses in a row. */
  rush(list: RenderList, at: Vec2, bosses: number, complete: boolean, o: number): void {
    if (complete) list.s(softPolygon(octagon(at, 21), 5), 'coin', 0.9 * o);
    list.s(softPolygon(octagon(at, 18), 4), 'primary', o);
    list.s(softPolygon(octagon(at, 15.5), 3), 'destructive', o);
    drawText(list, String(bosses), v(at.x, at.y + 0.5), 15, 'primary', { opacity: o, weight: 'display', align: 'center' });
  },
};

const TAU = Math.PI * 2;

/** A regular octagon with a flat top, as a stop sign has. */
const octagon = (at: Vec2, radius: number): Vec2[] => Array.from({ length: 8 }, (_, i) => add(at, v(radius * Math.cos(Math.PI / 8 + (i * Math.PI) / 4), radius * Math.sin(Math.PI / 8 + (i * Math.PI) / 4))));
