import type { World } from '../core/world';
import type { Layout } from '../core/roundabout';
import { type Vec2, v, add, sub, mul, dot, dist, length, left, normalize, fromAngle, angleOf, TAU } from '../core/vec2';
import { type RenderList, type Camera, rect, circle, arc, line, polygon, unitHash, toScreen } from './render';
import type { ColorToken } from './theme';
import { rotated } from './carArt';

/**
 * What a map skin does to the city: the ground takes the map's colour,
 * its own plants grow, a centrepiece sits above the ring, and some maps bring weather of
 * their own. The ground stays dark so cars, HUD and effects read the same on every map.
 */
export type MapTheme = 'dusk' | 'sand' | 'neon' | 'forest' | 'autumn' | 'sakura' | 'aurora' | 'ember' | 'meadow' | 'tropic' | 'snowfall' | 'cosmos';
export const MAP_THEMES: MapTheme[] = ['dusk', 'sand', 'neon', 'forest', 'autumn', 'sakura', 'aurora', 'ember', 'meadow', 'tropic', 'snowfall', 'cosmos'];

const hash = (i: number, salt: number): number => unitHash(i, salt);

function onScreen(center: Vec2, radius: number, cam: Camera): boolean {
  const at = toScreen(cam, center);
  const r = radius * cam.scale;
  return at.x > -r && at.y > -r && at.x < cam.viewport.x + r && at.y < cam.viewport.y + r;
}

const pondCache = new Map<string, Vec2 | null>();

export const MapTheme = {
  from(skin: string | null): MapTheme | null {
    return skin && (MAP_THEMES as string[]).includes(skin) ? (skin as MapTheme) : null;
  },

  ground(theme: MapTheme | null): ColorToken {
    if (!theme) return 'background';
    return ({
      dusk: 'groundDusk',
      sand: 'groundSand',
      neon: 'groundNeon',
      forest: 'groundForest',
      autumn: 'groundAutumn',
      sakura: 'groundSakura',
      aurora: 'groundAurora',
      ember: 'groundEmber',
      meadow: 'groundMeadow',
      tropic: 'groundTropic',
      snowfall: 'groundSnow',
      cosmos: 'groundCosmos',
    } as const)[theme];
  },

  pondRadius: 30,

  pondCenter(layout: Layout): Vec2 | null {
    const key = `${layout.ringRadius}|${layout.arms.map((a) => a.slot).join(',')}`;
    if (pondCache.has(key)) return pondCache.get(key)!;
    const distance = layout.ringRadius + 78;
    let best: { center: Vec2; clearance: number } | null = null;
    for (let step = 0; step <= 8; step++) {
      const angle = Math.PI * (0.33 + (0.34 * step) / 8);
      const center = mul(fromAngle(angle), distance);
      const clearance = Math.min(
        ...layout.arms.map((a) => {
          const out = fromAngle(a.angle);
          const along = dot(center, out);
          return along < 0 ? length(center) : length(sub(center, mul(out, along)));
        }),
      );
      if (!best || clearance > best.clearance + 0.5) best = { center, clearance };
    }
    const result = best && best.clearance > MapTheme.pondRadius + layout.laneWidth + 26 ? best.center : null;
    pondCache.set(key, result);
    return result;
  },

  keepsClear(theme: MapTheme | null, point: Vec2, layout: Layout): boolean {
    if (!theme) return false;
    const pond = MapTheme.pondCenter(layout);
    if (pond && dist(point, pond) < MapTheme.pondRadius + 38) return true;
    return layout.arms.some((a) => {
      const out = fromAngle(a.angle);
      const along = dot(point, out);
      return along > 0 && length(sub(point, mul(out, along))) < layout.laneWidth + 40;
    });
  },

  addGround(list: RenderList, theme: MapTheme | null, world: World, time: number | null): void {
    if (!theme) return;
    const ring = world.layout.ringRadius;
    const cam = list.camera;
    const add1 = (p: ReturnType<typeof circle>, c: ColorToken, o: number): void => list.w(p, c, o);
    const soft = (center: Vec2, radius: number, color: ColorToken, opacity: number): void => {
      for (let layer = 0; layer < 3; layer++) add1(circle(center, radius * (1 - 0.22 * layer)), color, opacity * 0.45);
    };
    const spot = (i: number, salt: number, from = 30, to = 360): Vec2 => mul(fromAngle(hash(i, salt) * TAU), ring + from + hash(i, salt + 1) * (to - from));
    switch (theme) {
      case 'sand':
        for (let i = 0; i < 14; i++) soft(spot(i, 301), 40 + 50 * hash(i, 303), 'mapSand', 0.06);
        for (let i = 0; i < 40; i++) add1(circle(spot(i, 305), 1.5 + 2 * hash(i, 307)), 'mapSand', 0.25);
        break;
      case 'forest':
        for (let i = 0; i < 16; i++) soft(spot(i, 311), 30 + 40 * hash(i, 313), 'mapForest', 0.07);
        break;
      case 'autumn':
        for (let i = 0; i < 90; i++) add1(circle(spot(i, 321, 10), 1.6 + 1.6 * hash(i, 323)), i % 3 === 0 ? 'hazard' : 'mapAutumn', 0.35);
        break;
      case 'sakura':
        MapTheme.addSakuraGround(list, world, time);
        break;
      case 'neon': {
        const reach = ring + 380;
        for (let x = -reach; x <= reach; x += 48) {
          list.w(line(v(x, -reach), v(x, reach), 1), 'mapNeon', 0.06);
          list.w(line(v(-reach, x), v(reach, x), 1), 'mapNeon', 0.06);
        }
        break;
      }
      case 'aurora':
        for (let band = 0; band < 4; band++) {
          list.w(arc(v(0, -ring * 0.4), ring + 170 + band * 34, 26 - band * 4, 0.35 * Math.PI, 0.65 * Math.PI + 0.05 * band), 'mapAurora', 0.07 + 0.02 * band);
        }
        for (let i = 0; i < 30; i++) soft(spot(i, 341), 12 + 20 * hash(i, 343), 'skinChrome', 0.05);
        break;
      case 'ember':
        for (let i = 0; i < 24; i++) {
          const from = spot(i, 351);
          list.w(line(from, add(from, mul(fromAngle(hash(i, 353) * TAU), 14 + 20 * hash(i, 355))), 1.6), 'mapEmber', 0.35);
        }
        break;
      case 'dusk':
        break;
      case 'meadow': {
        for (let i = 0; i < 18; i++) soft(spot(i, 401), 26 + 34 * hash(i, 403), 'skinFern', 0.06);
        const flowers: ColorToken[] = ['mapMeadow', 'primary', 'skinRose', 'skinSky'];
        for (let i = 0; i < 80; i++) {
          const at = spot(i, 405, 12);
          if (onScreen(at, 3, cam)) add1(circle(at, 1.1 + 0.8 * hash(i, 407)), flowers[i % 4], 0.55);
        }
        break;
      }
      case 'tropic':
        for (let i = 0; i < 16; i++) soft(spot(i, 411), 14 + 20 * hash(i, 413), 'mapSand', 0.06);
        for (let i = 0; i < 40; i++) {
          const at = spot(i, 419, 12);
          if (onScreen(at, 3, cam)) add1(circle(at, 0.9 + hash(i, 421)), i % 4 === 0 ? 'skinCoral' : 'skinPearl', 0.4);
        }
        break;
      case 'snowfall':
        for (let i = 0; i < 22; i++) soft(spot(i, 431), 16 + 26 * hash(i, 433), 'mapSnow', 0.05);
        for (let i = 0; i < 5; i++) {
          const center = spot(i, 435, 90, 300);
          const start = hash(i, 437) * TAU;
          for (const rail of [-2.2, 2.2]) list.w(arc(center, 46 + rail, 0.9, start, start + 1.1), 'mapSnow', 0.18);
        }
        for (let i = 0; i < 50; i++) {
          const at = spot(i, 439, 12);
          if (!onScreen(at, 2, cam)) continue;
          const twinkle = time !== null ? Math.pow(Math.max(0, Math.sin(time * 2.2 + i * 1.7)), 8) : 0.3;
          add1(circle(at, 0.6 + 0.8 * twinkle), 'primary', 0.2 + 0.6 * twinkle);
        }
        break;
      case 'cosmos': {
        const clouds: ColorToken[] = ['juicePurple', 'juiceBlue', 'skinRose'];
        for (let i = 0; i < 12; i++) soft(spot(i, 441), 40 + 60 * hash(i, 443), clouds[i % 3], 0.035);
        for (let i = 0; i < 150; i++) {
          const at = spot(i, 445, 8);
          if (!onScreen(at, 2, cam)) continue;
          const bright = hash(i, 447);
          const twinkle = time !== null ? 0.55 + 0.45 * Math.sin(time * (1.2 + 2 * bright) + i) : 0.8;
          add1(circle(at, 0.5 + 1.1 * bright * bright), bright > 0.85 ? 'mapCosmos' : 'primary', (0.25 + 0.6 * bright) * twinkle);
        }
        break;
      }
    }
    const pond = MapTheme.pondCenter(world.layout);
    if (theme !== 'sakura' && pond && onScreen(pond, MapTheme.pondRadius * 2, cam)) MapTheme.addCentrepiece(list, theme, pond, time);
  },

  addSakuraGround(list: RenderList, world: World, time: number | null): void {
    const layout = world.layout;
    const ring = layout.ringRadius;
    const cam = list.camera;
    const soft = (center: Vec2, radius: number, color: ColorToken, opacity: number): void => {
      for (let layer = 0; layer < 3; layer++) list.w(circle(center, radius * (1 - 0.22 * layer)), color, opacity * 0.45);
    };
    const spot = (i: number, salt: number, from = 12, to = 360): Vec2 => mul(fromAngle(hash(i, salt) * TAU), ring + from + hash(i, salt + 1) * (to - from));
    for (let i = 0; i < 14; i++) soft(spot(i, 331, 40), 28 + 36 * hash(i, 332), 'mapForest', 0.05);
    for (let i = 0; i < 10; i++) soft(spot(i, 334, 30), 22 + 30 * hash(i, 335), 'mapSakura', 0.035);
    for (let i = 0; i < 80; i++) {
      const at = spot(i, 336);
      if (!onScreen(at, 3, cam)) continue;
      const len = 1.8 + 1.2 * hash(i, 338);
      list.w(rect(at, v(len, len * 0.6), len * 0.3, hash(i, 339) * Math.PI), i % 3 === 0 ? 'sakuraPale' : 'mapSakura', 0.35 + 0.3 * hash(i, 340));
    }
    const pond = MapTheme.pondCenter(layout);
    if (!pond) return;
    const r = MapTheme.pondRadius;
    const toRing = normalize(mul(pond, -1));
    [r + 7, r + 14, r + 22].forEach((along, step) => {
      const side = mul(left(toRing), step % 2 === 0 ? 2.5 : -2.5);
      list.w(rect(add(add(pond, mul(toRing, along)), side), v(6, 4.6), 2.2, angleOf(toRing) + 0.3 * (step % 2)), 'stone', 0.55);
    });
    const gate = add(pond, mul(toRing, r + 18));
    const across = left(toRing);
    const beam = angleOf(across) - Math.PI / 2;
    list.w(rect(add(gate, v(2.5, -2.5)), v(4, 30), 1.5, beam), 'background', 0.35);
    for (const post of [-9, 9]) list.w(circle(add(gate, mul(across, post)), 1.8), 'torii', 1);
    list.w(rect(sub(gate, mul(toRing, 1.8)), v(2, 24), 0.8, beam), 'torii', 0.9);
    list.w(rect(gate, v(3.6, 30), 1.6, beam), 'torii', 1);
    list.w(rect(add(gate, mul(toRing, 0.6)), v(1.4, 31), 0.7, beam), 'vehicleTire', 0.85);
    list.w(circle(pond, r + 4.5), 'stone', 0.5);
    for (let i = 0; i < 14; i++) list.w(circle(add(pond, mul(fromAngle((i / 14) * TAU + hash(i, 351) * 0.2), r + 3)), 2.4 + 1.6 * hash(i, 352)), 'stone', 0.75);
    list.w(circle(pond, r), 'water', 1);
    list.w(circle(pond, r * 0.72), 'background', 0.22);
    list.w(arc(pond, r - 3, 3, 0, TAU), 'mapTropic', 0.08);
    const t = time ?? 0;
    const koi: [ColorToken, ColorToken | null, number, number][] = [
      ['skinKoi', 'primary', r * 0.55, 0.45],
      ['primary', 'skinKoi', r * 0.35, -0.6],
      ['skinGold', null, r * 0.68, 0.32],
    ];
    koi.forEach(([color, spotColor, radius, speed], i) => {
      const angle = t * speed + i * 2.2;
      const at = add(pond, mul(fromAngle(angle), radius));
      const heading = angle + (speed > 0 ? Math.PI / 2 : -Math.PI / 2);
      const forward = fromAngle(heading);
      const beat = Math.sin(t * 7 + i) * 0.5;
      const tail = sub(at, mul(forward, 4.2));
      list.w(polygon([tail, sub(tail, mul(fromAngle(heading + beat + 0.5), 3.2)), sub(tail, mul(fromAngle(heading + beat - 0.5), 3.2))]), color, 0.85);
      list.w(rect(at, v(7.5, 2.8), 1.4, heading), color, 0.95);
      if (spotColor) list.w(circle(add(at, mul(forward, 1.2)), 1.1), spotColor, 0.9);
    });
    for (let i = 0; i < 4; i++) {
      const at = add(pond, mul(fromAngle(0.6 + i * 1.7), r * (0.45 + 0.35 * hash(i, 355))));
      const turn = hash(i, 356) * TAU;
      list.w(circle(at, 4.2), 'mapForest', 0.85);
      list.w(polygon([at, add(at, mul(fromAngle(turn - 0.35), 4.4)), add(at, mul(fromAngle(turn + 0.35), 4.4))]), 'water', 1);
      if (i === 1) list.w(circle(add(at, v(1, 1)), 1.6), 'sakuraPale', 0.95);
    }
    for (let i = 0; i < 7; i++) {
      const drift = t * 0.05 * (hash(i, 358) - 0.5);
      const at = add(pond, mul(fromAngle(hash(i, 357) * TAU + drift), r * (0.2 + 0.7 * hash(i, 359))));
      list.w(rect(at, v(2.2, 1.4), 0.7, hash(i, 360) * Math.PI + drift * 3), 'mapSakura', 0.8);
    }
    list.w(arc(add(pond, v(-4, 5)), r * 0.6, 1.2, 0.55 * Math.PI, 0.95 * Math.PI), 'primary', 0.12 + (time !== null ? 0.05 * Math.sin(time * 0.8) : 0));
  },

  addCentrepiece(list: RenderList, theme: MapTheme, at: Vec2, time: number | null): void {
    switch (theme) {
      case 'meadow':
        return Centre.windmill(list, at, time);
      case 'tropic':
        return Centre.lagoon(list, at, time);
      case 'snowfall':
        return Centre.frozenPond(list, at, time);
      case 'cosmos':
        return Centre.planet(list, at, time);
      case 'dusk':
        return Centre.fountain(list, at, time);
      case 'sand':
        return Centre.oasis(list, at, time);
      case 'neon':
        return Centre.plaza(list, at, time);
      case 'forest':
        return Centre.cabin(list, at, time);
      case 'autumn':
        return Centre.pumpkins(list, at);
      case 'aurora':
        return Centre.igloo(list, at);
      case 'ember':
        return Centre.crater(list, at, time);
      case 'sakura':
        return;
    }
  },

  /** Sakura rakes the island into a gravel garden. */
  addIsland(list: RenderList, theme: MapTheme | null, world: World): void {
    if (theme !== 'sakura') return;
    const island = world.layout.ringRadius - world.layout.laneWidth / 2;
    for (let radius = 16; radius < island - 22; radius += 6.5) list.w(arc(v(0, 0), radius, 1.1, 0, TAU), 'sakuraPale', 0.05);
    for (let i = 0; i < 3; i++) {
      const at = mul(fromAngle(0.9 + i * 2.2), island * 0.6);
      for (let ripple = 1; ripple <= 3; ripple++) list.w(arc(at, 4 + ripple * 4, 1.1, 0, TAU), 'sakuraPale', 0.055);
      list.w(circle(add(at, v(1.2, -1.2)), 4.8), 'background', 0.35);
      list.w(circle(at, 4.5), 'stone', 0.9);
      list.w(circle(add(at, v(-1.3, 1.1)), 2.4), 'mapForest', 0.6);
    }
    for (let i = 0; i < 12; i++) {
      const at = mul(fromAngle(hash(i, 371) * TAU), island * (0.3 + 0.62 * hash(i, 372)));
      list.w(rect(at, v(2, 1.2), 0.6, hash(i, 373) * Math.PI), i % 3 === 0 ? 'sakuraPale' : 'mapSakura', 0.55);
    }
  },

  /** What grows where a tree would stand. */
  addPlant(list: RenderList, theme: MapTheme | null, center: Vec2, size: number, index: number): void {
    const a = (p: ReturnType<typeof circle>, c: ColorToken, o = 1): void => list.w(p, c, o);
    if (!theme) {
      a(circle(center, size), 'island', 0.9);
      return;
    }
    if (!onScreen(center, size * 2.5, list.camera)) return;
    switch (theme) {
      case 'sand': {
        const height = size * 2.2;
        a(circle(add(center, v(2, -2)), size * 0.7), 'background', 0.25);
        a(rect(add(center, v(0, height * 0.25)), v(size * 0.55, height), size * 0.27), 'mapForest', 0.9);
        const side = index % 2 === 0 ? 1 : -1;
        a(rect(add(center, v(side * size * 0.55, height * 0.3)), v(size * 0.4, height * 0.45), size * 0.2), 'mapForest', 0.9);
        a(rect(add(center, v(-side * size * 0.5, height * 0.15)), v(size * 0.35, height * 0.3), size * 0.17), 'mapForest', 0.9);
        break;
      }
      case 'forest':
      case 'aurora': {
        const color: ColorToken = theme === 'aurora' ? 'skinChrome' : 'mapForest';
        for (let tier = 0; tier < 3; tier++) {
          const width = size * (1.5 - 0.35 * tier);
          const base = add(center, v(0, tier * size * 0.6 - size * 0.5));
          a(polygon([add(base, v(-width, 0)), add(base, v(width, 0)), add(base, v(0, size * 1.1))]), color, theme === 'aurora' ? 0.55 : 0.85);
        }
        break;
      }
      case 'autumn':
        a(circle(center, size * 1.1), 'mapAutumn', 0.75);
        a(circle(add(center, v(size * 0.3, size * 0.25)), size * 0.6), 'hazard', 0.4);
        break;
      case 'sakura':
        if (index % 6 === 3) Plants.lantern(list, center, size);
        else Plants.cherry(list, center, size, index);
        break;
      case 'neon':
        a(circle(center, size * 1.1), 'mapNeon', 0.08);
        a(circle(center, size * 0.5), 'mapNeon', 0.2);
        a(circle(center, size * 0.22), 'mapNeon', 0.9);
        break;
      case 'dusk':
        a(circle(center, size * 2.2), 'fireCore', 0.05);
        a(circle(center, size * 1.1), 'fireCore', 0.1);
        a(circle(center, size * 0.3), 'fireCore', 0.9);
        break;
      case 'ember':
        a(circle(center, size), 'wreck', 0.9);
        a(line(sub(center, v(size * 0.6, size * 0.2)), add(center, v(size * 0.5, size * 0.3)), 1.5), 'mapEmber', 0.8);
        break;
      case 'meadow':
        Plants.flowerBush(list, center, size, index);
        break;
      case 'tropic':
        if (index % 4 === 2) Plants.parasol(list, center, size, index);
        else Plants.palm(list, center, size, index);
        break;
      case 'snowfall':
        if (index % 5 === 3) {
          a(circle(add(center, v(size * 0.35, -size * 0.35)), size * 0.85), 'background', 0.3);
          a(circle(center, size * 0.8), 'mapSnow', 0.95);
          a(circle(center, size * 0.55), 'primary', 0.95);
          a(circle(center, size * 0.34), 'vehicleTire', 0.95);
          a(line(center, add(center, mul(fromAngle(hash(index, 471) * TAU), size * 0.8)), 1.4), 'fireOuter', 0.95);
        } else Plants.snowFir(list, center, size);
        break;
      case 'cosmos': {
        const colors: ColorToken[] = ['skinCoral', 'skinSky', 'mapCosmos', 'skinTeal'];
        const color = colors[index % 4];
        a(circle(center, size * 1.6), color, 0.06);
        a(circle(center, size * 0.8), color, 0.95);
        a(circle(add(center, v(size * 0.25, -size * 0.25)), size * 0.65), 'groundCosmos', 0.45);
        if (index % 3 === 0) a(arc(center, size * 1.2, 1.2, 0, TAU), 'mapCosmos', 0.55);
        break;
      }
    }
  },

  /** Every map lines its roads with its own plants and lights. */
  addAvenues(list: RenderList, theme: MapTheme | null, world: World): void {
    if (!theme) return;
    const layout = world.layout;
    for (const armItem of layout.arms) {
      const out = fromAngle(armItem.angle);
      let distance = layout.ringRadius + layout.laneWidth / 2 + 40;
      let index = armItem.slot * 40;
      let step = 0;
      while (distance < layout.ringRadius + 330) {
        [-1, 1].forEach((side, sideIndex) => {
          index++;
          const isAccent = (step + sideIndex) % 3 === 1;
          const isLight = (isAccent && (theme === 'sakura' || theme === 'snowfall' || theme === 'dusk')) || theme === 'cosmos';
          const size = isLight ? 6 : 8.5 + 3.5 * hash(index, 381);
          const at = add(mul(out, distance + 6 * hash(index, 382)), mul(left(out), side * (layout.laneWidth + (isLight ? 14 : 20) + 4 * hash(index, 383))));
          if (!onScreen(at, size * 2.5, list.camera)) return;
          switch (theme) {
            case 'sakura':
              if (isAccent) Plants.lantern(list, at, size);
              else Plants.cherry(list, at, size, index);
              break;
            case 'snowfall':
              if (isAccent) Plants.lamp(list, at, size, 'fireCore');
              else Plants.snowFir(list, at, size * 0.9);
              break;
            case 'dusk':
              if (isAccent) Plants.lamp(list, at, size, 'fireCore');
              break;
            case 'cosmos':
              Plants.lamp(list, at, size * 0.6, 'mapCosmos');
              break;
            case 'tropic':
              Plants.palm(list, at, size * 0.9, index);
              break;
            case 'meadow':
              Plants.flowerBush(list, at, size * 0.85, index);
              break;
            case 'sand':
            case 'ember':
              if (isAccent) MapTheme.addPlant(list, theme, at, size * 0.8, index);
              break;
            default:
              MapTheme.addPlant(list, theme, at, size * 0.9, index);
          }
        });
        distance += 50;
        step++;
      }
    }
  },

  /** Above the vehicles, below the HUD: what the wind carries over the map. */
  addAir(list: RenderList, theme: MapTheme | null, time: number, reduceMotion: boolean): void {
    if (!theme || reduceMotion) return;
    const vp = list.camera.viewport;
    switch (theme) {
      case 'sakura':
        return drift(list, 40, time, vp, ['mapSakura', 'sakuraPale', 'mapSakura'], 7, 26, 34, 16, false, 501);
      case 'autumn':
        return drift(list, 14, time, vp, ['mapAutumn', 'hazard', 'fireOuter'], 7, 34, 26, 22, false, 511);
      case 'snowfall':
        return drift(list, 70, time, vp, ['primary', 'mapSnow'], 4.6, 34, 8, 12, true, 521);
      case 'meadow':
        for (let i = 0; i < 14; i++) {
          const home = v(hash(i, 531) * vp.x, hash(i, 532) * vp.y);
          const phase = hash(i, 533) * TAU;
          const at = add(home, v(Math.sin(time * 0.31 + phase) * 34, Math.sin(time * 0.23 + phase * 1.7) * 26));
          const glow = Math.pow(Math.max(0, Math.sin(time * (0.8 + 0.6 * hash(i, 534)) + phase)), 3);
          if (glow <= 0.02) continue;
          list.s(circle(at, 8), 'firefly', 0.12 * glow);
          list.s(circle(at, 1.8), 'firefly', 0.95 * glow);
        }
        return;
      case 'cosmos': {
        const period = 5.5;
        const cycle = Math.floor(time / period);
        const into = time - cycle * period;
        if (into >= 0.8) return;
        const start = v(hash(cycle, 541) * vp.x * 0.8, hash(cycle, 542) * vp.y * 0.5);
        const dir = fromAngle(0.35 + 0.5 * hash(cycle, 543));
        const head = add(start, mul(dir, (into / 0.8) * 260));
        const fade = Math.sin((Math.PI * into) / 0.8);
        for (let piece = 0; piece < 4; piece++) {
          const from = sub(head, mul(dir, piece * 14));
          list.s(line(from, sub(from, mul(dir, 14)), 2 - 0.4 * piece), 'mapCosmos', fade * (0.9 - 0.2 * piece));
        }
        return;
      }
      default:
        return;
    }
  },
};

function drift(list: RenderList, count: number, time: number, vp: Vec2, colors: ColorToken[], len: number, fall: number, wind: number, sway: number, round: boolean, salt: number): void {
  const carried = time + 0.9 * Math.sin(time * 0.29) + 0.5 * Math.sin(time * 0.53 + 1);
  const margin = 40;
  const width = vp.x + 2 * margin;
  const height = vp.y + 2 * margin;
  const wrapTo = (value: number, span: number): number => {
    const r = value % span;
    return (r < 0 ? r + span : r) - margin;
  };
  for (let i = 0; i < count; i++) {
    const depth = 0.55 + 0.45 * hash(i, salt);
    const phase = hash(i, salt + 1) * TAU;
    const x = wrapTo(hash(i, salt + 2) * width + carried * wind * depth + Math.sin(time * (0.7 + 0.5 * depth) + phase) * sway * depth, width);
    const y = wrapTo(hash(i, salt + 3) * height + carried * fall * depth, height);
    const color = colors[i % colors.length];
    const opacity = 0.35 + 0.5 * depth;
    const size = len * depth;
    if (round) list.s(circle(v(x, y), size / 2), color, opacity * 0.8);
    else {
      const tumble = 0.3 + 0.7 * Math.abs(Math.cos(time * (1.2 + 1.6 * hash(i, salt + 4)) + phase));
      const turn = time * (0.5 + hash(i, salt + 5)) * (i % 2 === 0 ? 1 : -1) + phase;
      list.s(rect(v(x, y), v(size * tumble, size * 0.62), size * 0.3, turn), color, opacity);
    }
  }
}

const Plants = {
  lamp(list: RenderList, center: Vec2, size: number, color: ColorToken): void {
    list.w(circle(center, size * 2.2), color, 0.05);
    list.w(circle(center, size * 1.1), color, 0.1);
    list.w(circle(center, size * 0.3), color, 0.9);
  },
  flowerBush(list: RenderList, center: Vec2, size: number, index: number): void {
    list.w(circle(add(center, v(size * 0.3, -size * 0.3)), size * 1.05), 'background', 0.3);
    list.w(circle(center, size), 'mapForest', 0.9);
    list.w(circle(add(center, v(-size * 0.25, size * 0.25)), size * 0.6), 'skinFern', 0.7);
    const flowers: ColorToken[] = ['mapMeadow', 'primary', 'skinRose'];
    for (let f = 0; f < 5; f++) {
      const at = add(center, mul(fromAngle(f * 1.3 + hash(index, 461) * 6), size * (0.3 + 0.45 * hash(index * 5 + f, 462))));
      list.w(circle(at, size * 0.13), flowers[(index + f) % 3], 0.95);
    }
  },
  snowFir(list: RenderList, center: Vec2, size: number): void {
    list.w(circle(add(center, v(size * 0.35, -size * 0.35)), size * 1.1), 'background', 0.3);
    list.w(circle(center, size * 1.05), 'mapForest', 0.75);
    for (let lobe = 0; lobe < 4; lobe++) list.w(circle(add(center, mul(fromAngle(1.2 + lobe * 1.1), size * 0.4)), size * 0.5), 'mapSnow', 0.85);
  },
  cherry(list: RenderList, center: Vec2, size: number, index: number): void {
    const turn = hash(index, 361) * TAU;
    list.w(circle(add(center, v(size * 0.4, -size * 0.4)), size * 1.25), 'background', 0.4);
    const shade = v(size * 0.1, -size * 0.1);
    const lobes = 4 + (index % 3);
    for (let lobe = 0; lobe < lobes; lobe++) {
      const k = hash(index * 7 + lobe, 364);
      list.w(circle(add(add(center, shade), mul(fromAngle(turn + (lobe * TAU) / lobes), size * (0.45 + 0.2 * k))), size * (0.5 + 0.2 * k)), 'sakuraDeep', 0.95);
    }
    list.w(circle(center, size * 0.72), 'mapSakura', 1);
    for (let lobe = 0; lobe < 4; lobe++) {
      const k = hash(index * 5 + lobe, 365);
      list.w(circle(add(sub(center, mul(shade, 0.5)), mul(fromAngle(turn + 0.6 + lobe * 1.571), size * (0.38 + 0.16 * k))), size * (0.38 + 0.14 * k)), 'mapSakura', 0.95);
    }
    for (let l = 0; l < 2; l++) list.w(circle(add(center, mul(fromAngle(1.9 + l * 0.9), size * 0.4)), size * 0.3), 'sakuraPale', 0.85);
    for (let f = 0; f < 2; f++) list.w(circle(add(center, mul(fromAngle(turn + f * 2.1), size * 0.35 * (0.5 + hash(index * 3 + f, 363)))), 0.75), 'primary', 0.9);
  },
  lantern(list: RenderList, center: Vec2, size: number): void {
    list.w(circle(center, size * 2.4), 'fireCore', 0.05);
    list.w(circle(center, size * 1.3), 'fireCore', 0.08);
    list.w(rect(add(center, v(1.5, -1.5)), v(size * 1.2, size * 1.2), 1, Math.PI / 4), 'background', 0.4);
    list.w(rect(center, v(size * 1.1, size * 1.1), 1, Math.PI / 4), 'stone', 0.9);
    list.w(polygon([0, 1, 2, 3, 4, 5].map((k) => add(center, mul(fromAngle((k * Math.PI) / 3), size * 0.72)))), 'wreck', 0.95);
    list.w(circle(center, size * 0.2), 'fireCore', 0.9);
  },
  palm(list: RenderList, center: Vec2, size: number, index: number): void {
    const turn = hash(index, 451) * TAU;
    list.w(circle(add(center, v(size * 0.5, -size * 0.5)), size * 1.2), 'background', 0.3);
    for (let f = 0; f < 7; f++) {
      const angle = turn + (f * TAU) / 7;
      const tip = add(center, mul(fromAngle(angle), size * 1.6));
      const mid = add(center, mul(fromAngle(angle), size * 0.8));
      const side = mul(left(fromAngle(angle)), size * 0.28);
      list.w(polygon([center, add(mid, side), tip, sub(mid, side)]), f % 2 === 0 ? 'mapForest' : 'skinFern', 0.9);
    }
    list.w(circle(center, size * 0.28), 'skinLatte', 0.95);
    list.w(circle(add(center, v(size * 0.2, 0)), size * 0.16), 'skinMocha', 0.95);
    list.w(circle(add(center, v(-size * 0.1, size * 0.18)), size * 0.16), 'skinMocha', 0.95);
  },
  parasol(list: RenderList, center: Vec2, size: number, index: number): void {
    const turn = hash(index, 455) * TAU;
    list.w(rect(add(center, mul(fromAngle(turn), size * 1.5)), v(size * 1.4, size * 0.7), 1, turn), 'skinSky', 0.7);
    list.w(circle(add(center, v(size * 0.4, -size * 0.4)), size * 1.05), 'background', 0.3);
    const radius = size * 1.05;
    for (let piece = 0; piece < 8; piece++) {
      const from = turn + (piece * TAU) / 8;
      list.w(arc(center, radius / 2, radius, from, from + TAU / 8), piece % 2 === 0 ? 'skinCoral' : 'primary', 0.95);
    }
    list.w(circle(center, size * 0.12), 'vehicleTire', 0.9);
  },
};

const Centre = {
  fountain(list: RenderList, c: Vec2, time: number | null): void {
    list.w(rect(c, v(58, 58), 6, Math.PI / 4), 'stone', 0.22);
    list.w(circle(c, 17), 'stone', 0.8);
    list.w(circle(c, 14), 'water', 1);
    const t = time ?? 0;
    for (let ring = 0; ring < 3; ring++) {
      const phase = (t * 0.5 + ring / 3) % 1;
      list.w(arc(c, 3 + 10 * phase, 0.8, 0, TAU), 'primary', 0.35 * (1 - phase));
    }
    list.w(circle(c, 2.2), 'primary', 0.7);
    for (let corner = 0; corner < 4; corner++) Plants.lamp(list, add(c, mul(fromAngle((corner * Math.PI) / 2), 30)), 5, 'fireCore');
  },
  oasis(list: RenderList, c: Vec2, time: number | null): void {
    list.w(circle(c, 27), 'mapForest', 0.3);
    list.w(circle(c, 20), 'water', 1);
    list.w(circle(c, 17), 'mapTropic', 0.25);
    list.w(line(add(c, v(-7, 4)), add(c, v(5, 4)), 1), 'primary', time !== null ? 0.12 + 0.08 * Math.sin(time * 1.1) : 0.15);
    Plants.palm(list, add(c, v(-19, 14)), 7, 3);
    Plants.palm(list, add(c, v(18, -12)), 6.5, 11);
  },
  plaza(list: RenderList, c: Vec2, time: number | null): void {
    const t = time ?? 0;
    list.w(circle(c, 30), 'mapNeon', 0.05);
    [
      [24, 0.35],
      [17, -0.55],
      [10, 0.8],
    ].forEach(([radius, speed], ring) => {
      const turn = t * speed + ring;
      for (let a = 0; a < 3; a++) {
        const from = turn + (a * TAU) / 3;
        list.w(arc(c, radius, 1.6, from, from + 1.3), ring === 1 ? 'skinRose' : 'mapNeon', 0.75);
      }
    });
    list.w(circle(c, 5), 'mapNeon', 0.9);
  },
  cabin(list: RenderList, c: Vec2, time: number | null): void {
    const toRing = normalize(mul(c, -1));
    const cabin = sub(c, mul(toRing, 8));
    const turn = angleOf(toRing);
    list.w(rect(add(cabin, v(3, -3)), v(26, 32), 2, turn), 'background', 0.4);
    list.w(rect(cabin, v(26, 32), 2, turn), 'skinMocha', 0.95);
    list.w(rect(add(cabin, mul(left(toRing), 7.5)), v(26, 15), 1.5, turn), 'skinLatte', 0.55);
    list.w(line(sub(cabin, mul(fromAngle(turn), 13)), add(cabin, mul(fromAngle(turn), 13)), 1.4), 'skinCream', 0.6);
    const fire = add(c, mul(toRing, 20));
    for (let s = 0; s < 7; s++) list.w(circle(add(fire, mul(fromAngle((s / 7) * TAU), 5)), 1.5), 'stone', 0.9);
    const flicker = time !== null ? 0.75 + 0.25 * Math.sin(time * 13) * Math.sin(time * 7.3) : 0.85;
    list.w(circle(fire, 16 * flicker), 'fireCore', 0.06);
    list.w(circle(fire, 3.6 * flicker), 'fireOuter', 0.95);
    list.w(circle(fire, 1.8 * flicker), 'fireCore', 1);
  },
  pumpkins(list: RenderList, c: Vec2): void {
    list.w(rect(c, v(52, 38), 6, 0.2), 'wreck', 0.55);
    for (let i = 0; i < 7; i++) {
      const at = add(c, v((hash(i, 491) - 0.5) * 40, (hash(i, 492) - 0.5) * 26));
      const size = 3.4 + 2 * hash(i, 493);
      list.w(circle(at, size), 'skinPumpkin', 0.95);
      list.w(line(sub(at, v(0, size * 0.8)), add(at, v(0, size * 0.8)), 0.6), 'fireDeep', 0.5);
      list.w(circle(add(at, v(0, size * 0.2)), 0.9), 'mapForest', 0.95);
    }
    const bale = add(c, v(30, 18));
    list.w(rect(bale, v(14, 9), 2, -0.3), 'skinLatte', 0.9);
    list.w(line(add(bale, v(-4, -3)), add(bale, v(-2, 4)), 0.7), 'skinMocha', 0.6);
    list.w(line(add(bale, v(3, -4)), add(bale, v(5, 3)), 0.7), 'skinMocha', 0.6);
  },
  igloo(list: RenderList, c: Vec2): void {
    const toRing = normalize(mul(c, -1));
    list.w(circle(add(c, v(3, -3)), 16), 'background', 0.35);
    list.w(rect(add(c, mul(toRing, 16)), v(14, 10), 4, angleOf(toRing)), 'skinChrome', 0.9);
    list.w(circle(c, 15), 'primary', 0.92);
    for (const ring of [5, 10]) list.w(arc(c, ring, 0.7, 0, TAU), 'skinChrome', 0.8);
    for (let s = 0; s < 6; s++) {
      const dir = fromAngle((s * Math.PI) / 3 + 0.3);
      list.w(line(add(c, mul(dir, 5)), add(c, mul(dir, 15)), 0.7), 'skinChrome', 0.8);
    }
    const hole = sub(c, mul(left(toRing), 26));
    list.w(circle(hole, 7), 'skinIce', 0.5);
    list.w(circle(hole, 4), 'water', 1);
  },
  crater(list: RenderList, c: Vec2, time: number | null): void {
    const glow = time !== null ? 0.8 + 0.2 * Math.sin(time * 1.6) : 0.9;
    list.w(circle(c, 34), 'mapEmber', 0.06 * glow);
    for (let i = 0; i < 12; i++) list.w(circle(add(c, mul(fromAngle((i / 12) * TAU + hash(i, 495) * 0.3), 19)), 5 + 3 * hash(i, 496)), 'wreck', 0.95);
    list.w(circle(c, 15), 'fireDeep', 0.95);
    list.w(circle(c, 11 * glow), 'mapEmber', 0.95);
    list.w(circle(add(c, v(-2, 2)), 5 * glow), 'fireCore', 0.9);
  },
  lagoon(list: RenderList, c: Vec2, time: number | null): void {
    const r = MapTheme.pondRadius;
    const toRing = normalize(mul(c, -1));
    list.w(circle(c, r + 9), 'mapSand', 0.14);
    list.w(circle(c, r + 3.5), 'mapSand', 0.32);
    list.w(circle(c, r), 'water', 1);
    list.w(circle(c, r - 2), 'mapTropic', 0.3);
    list.w(circle(sub(c, mul(toRing, 4)), r * 0.55), 'water', 0.35);
    const t = time ?? 0;
    for (let wave = 0; wave < 5; wave++) {
      const phase = t * 0.6 + wave * 1.9;
      const at = add(c, v(Math.sin(phase) * r * 0.35, (wave - 2) * r * 0.3));
      list.w(line(sub(at, v(r * 0.18, 0)), add(at, v(r * 0.18, 0)), 1.1), 'primary', 0.14 + 0.08 * Math.sin(phase * 1.7));
    }
    const from = r * 0.35;
    const to = r + 8;
    const mid = add(c, mul(toRing, (from + to) / 2));
    list.w(rect(add(mid, v(1.5, -1.5)), v(to - from, 5), 1, angleOf(toRing)), 'background', 0.35);
    list.w(rect(mid, v(to - from, 5), 1, angleOf(toRing)), 'skinLatte', 0.9);
    for (let plank = from + 3; plank < to - 1; plank += 3) {
      const at = add(c, mul(toRing, plank));
      list.w(line(add(at, mul(left(toRing), 2.4)), sub(at, mul(left(toRing), 2.4)), 0.5), 'skinMocha', 0.6);
    }
    const isle = add(sub(c, mul(toRing, r * 0.32)), mul(left(toRing), r * 0.28));
    list.w(circle(isle, 8.5), 'mapSand', 0.85);
    Plants.palm(list, isle, 6, 7);
  },
  frozenPond(list: RenderList, c: Vec2, time: number | null): void {
    const r = MapTheme.pondRadius;
    for (let i = 0; i < 14; i++) list.w(circle(add(c, mul(fromAngle((i / 14) * TAU + hash(i, 481) * 0.3), r + 2)), 4.5 + 3.5 * hash(i, 482)), 'mapSnow', 0.35);
    list.w(circle(c, r), 'skinIce', 0.24);
    list.w(circle(add(c, v(-5, 5)), r * 0.55), 'primary', 0.05);
    for (let i = 0; i < 7; i++) {
      const start = hash(i, 483) * TAU;
      list.w(arc(add(c, mul(fromAngle(start), r * 0.1)), r * (0.3 + 0.55 * hash(i, 484)), 0.6, start, start + 1 + 2 * hash(i, 485)), 'primary', 0.22);
    }
    const t = time ?? 0;
    (
      [
        ['skinRuby', r * 0.55, 0.55],
        ['skinSky', r * 0.32, -0.75],
      ] as [ColorToken, number, number][]
    ).forEach(([color, radius, speed], i) => {
      const angle = t * speed + i * 2.5;
      const at = add(c, mul(fromAngle(angle), radius));
      const back = fromAngle(angle + (speed > 0 ? -Math.PI / 2 : Math.PI / 2));
      list.w(line(at, add(at, mul(back, 5)), 1), color, 0.6);
      list.w(circle(at, 2.3), color, 0.95);
      list.w(circle(at, 1.2), 'skinPearl', 0.95);
    });
  },
  windmill(list: RenderList, c: Vec2, time: number | null): void {
    const r = MapTheme.pondRadius;
    const toRing = normalize(mul(c, -1));
    const across = left(toRing);
    const rows: ColorToken[] = ['juiceRed', 'mapMeadow', 'skinRose', 'primary', 'skinCoral', 'juiceYellow'];
    const field = sub(c, mul(across, 8));
    list.w(rect(field, v(42, 36), 3, angleOf(across)), 'mapForest', 0.35);
    rows.forEach((color, row) => {
      const ln = add(field, mul(toRing, (row - 2.5) * 5.6));
      for (let s = 0; s < 8; s++) list.w(circle(add(ln, mul(across, (s - 3.5) * 5)), 1.5), color, 0.85);
    });
    const mill = add(c, mul(across, r * 0.85));
    list.w(circle(add(mill, v(3, -3)), 8), 'background', 0.4);
    list.w(circle(mill, 7.5), 'skinLatte', 0.95);
    list.w(circle(mill, 5), 'skinMocha', 0.95);
    const turn = (time ?? 0) * 0.7;
    for (let sail = 0; sail < 4; sail++) {
      const dir = fromAngle(turn + (sail * Math.PI) / 2);
      list.w(rect(add(mill, mul(dir, 12)), v(19, 4), 1, angleOf(dir)), 'skinCream', 0.85);
      list.w(line(add(mill, mul(dir, 3)), add(mill, mul(dir, 21.5)), 0.7), 'skinMocha', 0.8);
    }
    list.w(circle(mill, 1.6), 'vehicleTire', 0.95);
  },
  planet(list: RenderList, c: Vec2, time: number | null): void {
    const radius = MapTheme.pondRadius * 0.55;
    const tilt = 0.35;
    const ellipse = (a: number, b: number, angle: number): Vec2 => add(c, rotated(v(a * Math.cos(angle), b * Math.sin(angle)), tilt));
    const ring = (front: boolean): void => {
      const steps = 16;
      (
        [
          [1.9, 'mapCosmos', 0.6],
          [1.6, 'skinLatte', 0.45],
        ] as [number, ColorToken, number][]
      ).forEach(([scale, color, opacity], band) => {
        for (let s = 0; s < steps; s++) {
          const from = (s / steps + (front ? 0.5 : 0)) * Math.PI;
          const to = from + Math.PI / steps;
          list.w(line(ellipse(radius * scale, radius * scale * 0.3, from), ellipse(radius * scale, radius * scale * 0.3, to), band === 0 ? 2.4 : 1.6), color, opacity);
        }
      });
    };
    const t = time ?? 0;
    const moonAngle = t * 0.4;
    const moon = ellipse(radius * 2.6, radius * 0.9, moonAngle);
    const moonBehind = Math.sin(moonAngle) > 0;
    const addMoon = (): void => {
      list.w(circle(moon, 3.2), 'skinPearl', 0.95);
      list.w(circle(add(moon, v(1, -1)), 2.4), 'groundCosmos', 0.4);
    };
    list.w(circle(c, radius * 2.4), 'mapCosmos', 0.04);
    list.w(circle(c, radius * 1.5), 'mapCosmos', 0.06);
    if (moonBehind) addMoon();
    ring(false);
    list.w(circle(c, radius), 'skinCoral', 0.95);
    for (const y of [-0.35, 0.3]) list.w(rect(add(c, rotated(v(0, y * radius), tilt)), v(radius * 1.7, 2.6), 1.3, tilt), 'skinLatte', 0.4);
    list.w(circle(add(c, v(radius * 0.3, -radius * 0.3)), radius * 0.8), 'groundCosmos', 0.35);
    ring(true);
    if (!moonBehind) addMoon();
  },
};
