import type { Cosmetic } from '../core/loot';
import type { TourId } from '../core/tours';
import { type Vec2, v, add } from '../core/vec2';
import { type RenderList, type Rect, R, rect, circle, line, polygon, unitHash as hash } from './render';
import type { ColorToken } from './theme';
import { MenuKit } from './menukit';
import { ShopPage } from './shop';
import { drift } from './passArt';

/** Each tour's colour: the glow round its card and the tile's wash. */
export const TOUR_TINT: Record<TourId, ColorToken> = {
  halloween: 'rarityEpic',
  winter: 'skinIce',
};

/**
 * A tour's picture on Progress → Today, built like the Season Pass's (`PassArt`): a tile in the tour's sky with the
 * tour's top skin glowing in the middle. The Haunted Ring has a moon, bats and drifting will-o'-the-wisps, Winter
 * Lights snow and twinkling stars. With Reduce Motion everything stands still.
 */
export const TourArt = {
  add(list: RenderList, tile: Rect, tour: TourId, skin: Cosmetic | undefined, clock: number, reduceMotion: boolean, o: number): void {
    const t = reduceMotion ? 0 : clock;
    const tint = TOUR_TINT[tour];
    const c = R.center(tile);
    const w = R.width(tile);
    const h = R.height(tile);
    list.s(rect(c, v(w, h), 12), 'background', o);
    list.s(rect(c, v(w, h), 12), tint, 0.2 * o);
    const saved = list.clip;
    list.clip = tile;
    MenuKit.glow(list, add(c, v(0, 8)), w * 0.62, tint, (0.5 + 0.12 * Math.sin(t * 2.2)) * o);
    if (tour === 'halloween') TourArt.haunted(list, tile, t, o);
    else TourArt.winter(list, tile, t, o);
    if (skin) ShopPage.addPreview(list, skin, add(c, v(0, 0.06 * h + 1.5 * Math.sin(t * 1.6))), (1.25 * h) / 96, o);
    list.clip = saved;
  },

  haunted(list: RenderList, tile: Rect, t: number, o: number): void {
    const moon = v(tile.maxX - 22, tile.minY + 22);
    list.s(circle(moon, 19), 'skinCream', 0.14 * o);
    list.s(circle(moon, 11), 'skinCream', o);
    list.s(circle(add(moon, v(-3, -2)), 3), 'skinLatte', 0.35 * o);
    list.s(circle(add(moon, v(4, 3)), 2), 'skinLatte', 0.3 * o);
    for (let i = 0; i < 7; i++) list.s(circle(drift(tile, t, i, -0.045 - 0.03 * hash(i, 5), 0.05, 61), 1 + hash(i, 7)), 'juiceGreen', (0.35 + 0.35 * Math.sin(t * 2 + i * 2)) * o);
    // Bats cross the sky, one of them in front of the moon.
    for (let i = 0; i < 3; i++) {
      const span = R.width(tile) + 24;
      const x = tile.minX - 12 + ((hash(i, 71) + t * (0.05 + 0.02 * i)) % 1) * span;
      const p = v(x, tile.minY + 20 + i * 15 + Math.sin(t * 1.7 + i * 2) * 4);
      const flap = Math.sin(t * 11 + i * 1.9);
      list.s(polygon([add(p, v(-1, 0)), add(p, v(-9, -4 * flap - 1)), add(p, v(-5, 3))]), 'skinObsidian', o);
      list.s(polygon([add(p, v(1, 0)), add(p, v(9, -4 * flap - 1)), add(p, v(5, 3))]), 'skinObsidian', o);
      list.s(circle(p, 1.9), 'skinObsidian', o);
    }
  },

  winter(list: RenderList, tile: Rect, t: number, o: number): void {
    for (let i = 0; i < 5; i++) {
      const at: Vec2 = v(tile.minX + 8 + hash(i, 81) * (R.width(tile) - 16), tile.minY + 8 + hash(i, 82) * R.height(tile) * 0.4);
      const size = 2 + 1.5 * hash(i, 83);
      const glint = 0.35 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2.4 + i * 1.7));
      list.s(line(add(at, v(-size, 0)), add(at, v(size, 0)), 1), 'primary', glint * o);
      list.s(line(add(at, v(0, -size)), add(at, v(0, size)), 1), 'primary', glint * o);
    }
    for (let i = 0; i < 16; i++) list.s(circle(drift(tile, t, i, 0.06 + 0.05 * hash(i, 5), 0.03, 11), 1 + 1.1 * hash(i, 7)), 'primary', (0.5 + 0.4 * hash(i, 9)) * o);
  },
};
