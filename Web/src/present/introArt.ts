import type { Vec2 } from '../core/vec2';
import { v, add } from '../core/vec2';
import { type RenderList, rect, circle, line, polygon } from './render';
import type { ColorToken } from './theme';
import { MenuKit } from './menukit';
import type { Intro } from './intros';

const TINT: Record<Intro, ColorToken> = {
  museum: 'lightBlue',
  builder: 'accent',
  daily: 'hazard',
  trials: 'accent',
  pass: 'coin',
  casino: 'juiceGreen',
  club: 'coin',
  gamefund: 'juiceGreen',
  mafia: 'destructive',
};

/** A plain glyph for each place in its colour, on a soft glow: the drawer's picture. */
export const IntroArt = {
  add(list: RenderList, id: Intro, center: Vec2, size: number): void {
    const u = size / 96;
    const c = TINT[id];
    const at = (x: number, y: number): Vec2 => add(center, v(x * u, y * u));
    const stroke = 3.5 * u;
    MenuKit.glow(list, center, size * 0.5, c, 0.25);
    switch (id) {
      case 'museum':
        list.s(polygon([at(-34, -14), at(0, -34), at(34, -14)]), c);
        for (const x of [-22, 0, 22]) list.s(line(at(x, -8), at(x, 24), 7 * u), c, 0.85);
        list.s(rect(at(0, 32), v(76 * u, 8 * u), 2 * u), c);
        break;
      case 'builder':
        list.s(line(at(-34, 0), at(34, 0), 14 * u), c, 0.5);
        list.s(line(at(0, -34), at(0, 34), 14 * u), c, 0.5);
        list.s(line(at(-34, 0), at(34, 0), 2 * u), 'primary', 0.8);
        list.s(line(at(0, -34), at(0, 34), 2 * u), 'primary', 0.8);
        list.s(circle(at(0, 0), 13 * u), c);
        break;
      case 'daily':
        list.s(rect(at(0, 6), v(64 * u, 56 * u), 8 * u), c, 0.9);
        list.s(rect(at(0, -14), v(64 * u, 14 * u), 5 * u), c);
        for (const [x, y] of [[-16, 2], [0, 2], [16, 2], [-16, 18], [0, 18]]) list.s(circle(at(x, y), 4.5 * u), 'background');
        break;
      case 'trials':
        list.s(circle(at(0, 4), 30 * u), c, 0.9);
        list.s(circle(at(0, 4), 24 * u), 'background');
        list.s(line(at(0, 4), at(0, -14), stroke), c);
        list.s(line(at(0, 4), at(12, 10), stroke), c);
        list.s(rect(at(0, -32), v(14 * u, 7 * u), 2 * u), c);
        break;
      case 'pass':
        list.s(rect(at(0, 0), v(72 * u, 44 * u), 8 * u), c, 0.9);
        for (const x of [-22, 0, 22]) list.s(circle(at(x, 0), 7 * u), 'background');
        break;
      case 'casino':
        list.s(rect(at(0, 0), v(58 * u, 58 * u), 12 * u), c, 0.9);
        for (const [x, y] of [[-14, -14], [14, -14], [0, 0], [-14, 14], [14, 14]]) list.s(circle(at(x, y), 5.5 * u), 'background');
        break;
      case 'club':
        list.s(polygon([at(-32, 20), at(-36, -18), at(-16, 0), at(0, -28), at(16, 0), at(36, -18), at(32, 20)]), c);
        list.s(rect(at(0, 28), v(64 * u, 8 * u), 2 * u), c);
        break;
      case 'gamefund':
        list.s(circle(at(0, -10), 20 * u), c, 0.9);
        list.s(rect(at(0, 18), v(14 * u, 16 * u), 3 * u), c);
        list.s(rect(at(0, 30), v(30 * u, 6 * u), 2 * u), c);
        list.s(circle(at(0, -10), 11 * u), 'background');
        list.s(circle(at(0, -10), 5 * u), c);
        break;
      case 'mafia':
        list.s(rect(at(0, -6), v(36 * u, 34 * u), 6 * u), c, 0.9);
        list.s(rect(at(0, 14), v(76 * u, 9 * u), 4 * u), c);
        list.s(line(at(-18, -2), at(18, -2), 5 * u), 'background');
        break;
    }
  },
};
