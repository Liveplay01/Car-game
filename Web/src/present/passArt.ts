import type { Cosmetic, Season } from '../core/loot';
import { type Vec2, v, add, mul, fromAngle, TAU } from '../core/vec2';
import { type RenderList, type Rect, R, rect, circle, line, unitHash as hash } from './render';
import type { ColorToken } from './theme';
import { MenuKit } from './menukit';
import { ShopPage } from './shop';

/** Each season's colour: the glow round the pass card, its outline and the tile's wash. */
export const SEASON_TINT: Record<Season, ColorToken> = {
  winter: 'skinIce',
  spring: 'mapSakura',
  summer: 'fireOuter',
  autumn: 'mapAutumn',
};

const fract = (x: number): number => x - Math.floor(x);

/**
 * The Season Pass's picture on Progress → Today (Leo, 06.10.2026): a tile as big as the streak's scene,
 * in the season's weather (snow, petals, sun and heat, falling leaves) with the season's top skin
 * glowing in the middle. With Reduce Motion everything stands still.
 */
export const PassArt = {
  add(list: RenderList, tile: Rect, season: Season, skin: Cosmetic | undefined, clock: number, reduceMotion: boolean, o: number): void {
    const t = reduceMotion ? 0 : clock;
    const tint = SEASON_TINT[season];
    const c = R.center(tile);
    const w = R.width(tile);
    const h = R.height(tile);
    list.s(rect(c, v(w, h), 12), 'background', o);
    list.s(rect(c, v(w, h), 12), tint, 0.16 * o);
    const saved = list.clip;
    list.clip = tile;
    MenuKit.glow(list, add(c, v(0, 6)), w * 0.62, tint, (0.5 + 0.12 * Math.sin(t * 2.2)) * o);
    const at = (i: number, speed: number, sway: number, salt: number): Vec2 =>
      v(tile.minX + fract(hash(i, salt) + Math.sin(t * 0.8 + i) * sway) * w, tile.minY + fract(hash(i, salt + 1) + t * speed) * (h + 12) - 6);
    switch (season) {
      case 'winter':
        for (let i = 0; i < 16; i++) list.s(circle(at(i, 0.06 + 0.05 * hash(i, 5), 0.03, 11), 1 + 1.1 * hash(i, 7)), 'primary', (0.5 + 0.4 * hash(i, 9)) * o);
        break;
      case 'spring':
        for (let i = 0; i < 12; i++) list.s(rect(at(i, 0.05 + 0.04 * hash(i, 5), 0.06, 21), v(3.4, 2), 1, t * 2 + i), i % 2 === 0 ? 'mapSakura' : 'sakuraPale', 0.9 * o);
        break;
      case 'summer': {
        const sun = v(tile.maxX - 18, tile.minY + 18);
        list.s(circle(sun, 9), 'skinSunburst', o);
        for (let k = 0; k < 10; k++) list.s(line(add(sun, mul(fromAngle(t * 0.4 + (k * TAU) / 10), 12)), add(sun, mul(fromAngle(t * 0.4 + (k * TAU) / 10), 17 + 3 * Math.sin(t * 3 + k))), 1.4), 'fireCore', 0.8 * o);
        for (let i = 0; i < 8; i++) list.s(circle(at(i, -0.09, 0.04, 31), 1 + hash(i, 7)), 'fireOuter', 0.7 * o);
        break;
      }
      case 'autumn':
        for (let i = 0; i < 11; i++) list.s(rect(at(i, 0.07 + 0.04 * hash(i, 5), 0.07, 41), v(3.6, 2.4), 1.1, t * 1.8 + i * 1.7), i % 3 === 0 ? 'fireOuter' : i % 3 === 1 ? 'mapAutumn' : 'skinPumpkin', 0.92 * o);
        break;
    }
    list.clip = saved;
    if (skin) ShopPage.addPreview(list, skin, add(c, v(0, 4 + 1.5 * Math.sin(t * 1.6))), 1.45, o);
  },
};
