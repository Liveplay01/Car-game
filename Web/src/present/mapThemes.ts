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
export type MapTheme =
  | 'dusk'
  | 'sand'
  | 'neon'
  | 'forest'
  | 'autumn'
  | 'sakura'
  | 'aurora'
  | 'ember'
  | 'meadow'
  | 'tropic'
  | 'snowfall'
  | 'cosmos'
  | 'harbour'
  | 'vineyard'
  | 'grove'
  | 'abyss'
  | 'canyon'
  | 'highland'
  | 'lanterns'
  | 'crystal';
export const MAP_THEMES: MapTheme[] = [
  'dusk',
  'sand',
  'neon',
  'forest',
  'autumn',
  'sakura',
  'aurora',
  'ember',
  'meadow',
  'tropic',
  'snowfall',
  'cosmos',
  'harbour',
  'vineyard',
  'grove',
  'abyss',
  'canyon',
  'highland',
  'lanterns',
  'crystal',
];

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
      harbour: 'groundHarbour',
      vineyard: 'groundVineyard',
      grove: 'groundGrove',
      abyss: 'groundAbyss',
      canyon: 'groundCanyon',
      highland: 'groundHighland',
      lanterns: 'groundLanterns',
      crystal: 'groundCrystal',
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
      case 'harbour':
        // Wet concrete slabs of the quay, and the harbour lights on the ground.
        for (let i = 0; i < 10; i++) soft(spot(i, 601), 34 + 40 * hash(i, 603), 'surface', 0.08);
        for (let i = 0; i < 36; i++) {
          const at = spot(i, 605, 16);
          if (onScreen(at, 3, cam)) add1(circle(at, 1.6), 'mapHarbour', 0.18 + 0.15 * hash(i, 607));
        }
        break;
      case 'vineyard':
        // Rows of vines across the hills, grapes hanging on some of them.
        for (let i = 0; i < 10; i++) {
          const center = spot(i, 611, 60, 320);
          const along = fromAngle(hash(i, 613) * Math.PI);
          const across = left(along);
          for (let row = -2; row <= 2; row++) {
            const mid = add(center, mul(across, row * 9));
            if (!onScreen(mid, 40, cam)) continue;
            list.w(line(sub(mid, mul(along, 30)), add(mid, mul(along, 30)), 3), 'mapCypress', 0.55);
            for (let g = 0; g < 4; g++) {
              if (hash(i * 31 + row * 7 + g, 615) < 0.6) add1(circle(add(mid, mul(along, -24 + g * 16)), 1.4), 'mapVineyard', 0.8);
            }
          }
        }
        break;
      case 'grove':
        // Moss, and glowing spores on the ground that breathe in and out.
        for (let i = 0; i < 16; i++) soft(spot(i, 621), 24 + 36 * hash(i, 623), 'mapForest', 0.05);
        for (let i = 0; i < 60; i++) {
          const at = spot(i, 625, 10);
          if (!onScreen(at, 2, cam)) continue;
          const glow = time !== null ? 0.5 + 0.5 * Math.sin(time * (0.8 + hash(i, 627)) + i) : 0.7;
          add1(circle(at, 0.8 + 0.6 * hash(i, 629)), 'mapGrove', 0.25 + 0.5 * glow);
        }
        break;
      case 'abyss':
        // Sand ripples on the sea floor, and light that plays down through the water.
        for (let i = 0; i < 12; i++) {
          const center = spot(i, 631, 40, 320);
          if (!onScreen(center, 60, cam)) continue;
          const start = hash(i, 633) * TAU;
          for (let r = 0; r < 3; r++) list.w(arc(center, 20 + r * 9, 1, start, start + 1.2), 'mapAbyss', 0.08);
        }
        for (let i = 0; i < 8; i++) {
          const pulse = time !== null ? 0.5 + 0.5 * Math.sin(time * 0.6 + i * 1.3) : 0.5;
          soft(spot(i, 635, 20, 340), 30 + 20 * hash(i, 637), 'mapAbyss', 0.035 * pulse);
        }
        break;
      case 'canyon':
        // Sand in wide drifts, a dry wash winding between the buttes, and grit on the ground.
        for (let i = 0; i < 14; i++) soft(spot(i, 641), 34 + 46 * hash(i, 643), 'canyonSand', 0.05);
        for (let i = 0; i < 6; i++) {
          const from = spot(i, 645, 40, 300);
          if (!onScreen(from, 80, cam)) continue;
          const dir = fromAngle(hash(i, 647) * TAU);
          const mid = add(from, mul(dir, 34));
          const end = add(mid, mul(fromAngle(angleOf(dir) + (hash(i, 649) - 0.5) * 0.9), 40));
          list.w(polygon([from, mid, end, add(mid, mul(left(dir), 9)), add(from, mul(left(dir), 11))]), 'canyonSand', 0.09);
        }
        for (let i = 0; i < 44; i++) {
          const at = spot(i, 651, 12);
          if (onScreen(at, 3, cam)) add1(circle(at, 1.2 + 1.6 * hash(i, 653)), i % 3 === 0 ? 'canyonRock' : 'canyonSand', 0.3);
        }
        break;
      case 'highland':
        // Peat pools, heather in wide mats and moss where the water lies.
        for (let i = 0; i < 12; i++) {
          const at = spot(i, 661, 30, 320);
          soft(at, 22 + 30 * hash(i, 663), 'mapHighland', 0.04);
          if (hash(i, 665) < 0.5) soft(at, 14 + 12 * hash(i, 667), 'water', 0.1);
        }
        for (let i = 0; i < 16; i++) soft(spot(i, 669), 18 + 26 * hash(i, 671), 'highlandMoss', 0.05);
        for (let i = 0; i < 90; i++) {
          const at = spot(i, 673, 10);
          if (!onScreen(at, 2, cam)) continue;
          const bloom = time !== null ? 0.6 + 0.4 * Math.sin(time * (0.5 + hash(i, 675)) + i) : 0.8;
          add1(circle(at, 0.7 + 0.7 * hash(i, 677)), i % 4 === 0 ? 'skinRose' : 'heatherBloom', (0.25 + 0.45 * bloom) * 0.9);
        }
        break;
      case 'lanterns':
        // Night ground: flagstones catching the warm light, and petals dropped on the way.
        for (let i = 0; i < 12; i++) soft(spot(i, 681, 20, 330), 30 + 40 * hash(i, 683), 'mapLanterns', 0.05);
        for (let i = 0; i < 7; i++) {
          const at = spot(i, 685, 50, 300);
          const along = fromAngle(hash(i, 687) * Math.PI);
          const across = left(along);
          for (let slab = -3; slab <= 3; slab++) {
            const row = add(at, mul(along, slab * 9));
            for (let stone = -3; stone <= 3; stone++) list.w(line(add(row, mul(across, stone * 9)), add(row, mul(across, (stone + 0.9) * 9)), 0.6), 'background', 0.3);
          }
        }
        for (let i = 0; i < 40; i++) {
          const at = spot(i, 689, 12);
          if (onScreen(at, 3, cam)) add1(circle(at, 0.9 + 0.8 * hash(i, 691)), i % 3 === 0 ? 'lanternRed' : 'mapLanterns', 0.3);
        }
        break;
      case 'crystal': {
        // A cave floor: cracks of light under the rock, and the glow around each shard.
        for (let i = 0; i < 14; i++) soft(spot(i, 701), 28 + 40 * hash(i, 703), 'mapCrystal', 0.05);
        for (let i = 0; i < 10; i++) {
          const center = spot(i, 705, 20, 330);
          if (!onScreen(center, 60, cam)) continue;
          const start = hash(i, 707) * TAU;
          const dir = fromAngle(start);
          const mid = add(center, mul(dir, 22 + 16 * hash(i, 709)));
          const end = add(mid, mul(fromAngle(start + (hash(i, 711) - 0.5) * 1.2), 20));
          const pulse = time !== null ? 0.55 + 0.45 * Math.sin(time * 0.9 + i * 1.7) : 0.7;
          list.w(polygon([center, mid, end, add(mid, mul(left(dir), 5))]), 'crystalCyan', 0.16 * pulse);
        }
        for (let i = 0; i < 10; i++) {
          const at = spot(i, 713, 20, 330);
          const pulse = time !== null ? 0.5 + 0.5 * Math.sin(time * 0.7 + i * 2.1) : 0.6;
          soft(at, 16 + 16 * hash(i, 715), 'crystalCyan', 0.05 * pulse);
        }
        for (let i = 0; i < 40; i++) {
          const at = spot(i, 717, 10);
          if (onScreen(at, 3, cam)) add1(circle(at, 0.8 + 1 * hash(i, 719)), 'crystalCyan', 0.35);
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
      case 'harbour':
        return Centre.dock(list, at, time);
      case 'vineyard':
        return Centre.villa(list, at, time);
      case 'grove':
        return Centre.fairyRing(list, at, time);
      case 'abyss':
        return Centre.shipwreck(list, at, time);
      case 'canyon':
        return Centre.arch(list, at, time);
      case 'highland':
        return Centre.stoneCircle(list, at, time);
      case 'lanterns':
        return Centre.lanternStage(list, at, time);
      case 'crystal':
        return Centre.geode(list, at, time);
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
    if (!onScreen(center, size * 2.5, list.camera)) return;
    // The plain city: a real tree, the one players asked for (29.09.2026).
    if (!theme) return Plants.tree(list, center, size, index);
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
        Plants.tree(list, center, size * 1.05, index, ['fireDeep', 'mapAutumn', 'hazard'], 0.8);
        break;
      case 'harbour':
        Plants.containers(list, center, size, index);
        break;
      case 'vineyard':
        if (index % 3 === 0) Plants.tree(list, center, size * 0.8, index, ['mapCypress', 'skinFern', 'skinSilver'], 0.8);
        else Plants.cypress(list, center, size);
        break;
      case 'grove':
        Plants.mushroom(list, center, size, index);
        break;
      case 'canyon':
        if (index % 2 === 0) Plants.hoodoo(list, center, size, index);
        else Plants.yucca(list, center, size, index);
        break;
      case 'highland':
        if (index % 3 === 2) Plants.menhir(list, center, size, index);
        else Plants.heather(list, center, size, index);
        break;
      case 'lanterns':
        if (index % 3 === 1) Plants.stall(list, center, size, index);
        else Plants.paperLantern(list, center, size, index);
        break;
      case 'crystal':
        if (index % 3 === 0) Plants.stalagmite(list, center, size, index);
        else Plants.shard(list, center, size, index);
        break;
      case 'abyss':
        if (index % 3 === 1) Plants.anemone(list, center, size, index);
        else Plants.coral(list, center, size, index);
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
          const isLight = (isAccent && (theme === 'sakura' || theme === 'snowfall' || theme === 'dusk' || theme === 'harbour' || theme === 'lanterns')) || theme === 'cosmos';
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
            case 'harbour':
              if (isAccent) Plants.lamp(list, at, size, 'mapHarbour');
              else Plants.bollard(list, at, size);
              break;
            case 'vineyard':
              Plants.cypress(list, at, size * 0.8);
              break;
            case 'canyon':
              if (isAccent) Plants.hoodoo(list, at, size * 0.85, index);
              else Plants.yucca(list, at, size * 0.9, index);
              break;
            case 'highland':
              if (isAccent) Plants.menhir(list, at, size * 0.75, index);
              else Plants.heather(list, at, size * 0.9, index);
              break;
            case 'lanterns':
              if (isAccent) Plants.paperLantern(list, at, size, index);
              else Plants.stall(list, at, size * 0.85, index);
              break;
            case 'crystal':
              if (isAccent) Plants.shard(list, at, size * 0.9, index);
              else Plants.stalagmite(list, at, size * 0.8, index);
              break;
            case 'sand':
            case 'ember':
            case 'grove':
            case 'abyss':
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
      case 'grove':
        // Spores rise slowly, glowing, the way the mushrooms below do.
        return drift(list, 26, time, vp, ['mapGrove', 'primary', 'mapGrove'], 3, -16, 6, 18, true, 561);
      case 'abyss': {
        drift(list, 24, time, vp, ['primary', 'mapAbyss'], 3.2, -26, 4, 10, true, 571);
        // A few jellyfish pump their way up through the water, trailing their tentacles.
        const span = vp.y + 120;
        for (let j = 0; j < 3; j++) {
          const phase = hash(j, 583) * TAU;
          const rise = time * 8 * (0.6 + 0.4 * hash(j, 584));
          const y = span - ((hash(j, 582) * span + rise) % span) - 60;
          const at = v(hash(j, 581) * vp.x + Math.sin(time * 0.2 + phase) * 40, y);
          const pulse = 0.5 + 0.5 * Math.sin(time * 1.6 + phase);
          const bell = 9 + 3 * pulse;
          list.s(circle(at, bell * 2.2), 'mapAbyss', 0.05);
          list.s(circle(at, bell), 'mapAbyss', 0.22);
          list.s(circle(v(at.x, at.y - bell * 0.2), bell * 0.6), 'primary', 0.12);
          for (let t = 0; t < 4; t++) {
            const x = at.x + (t - 1.5) * bell * 0.45;
            const sway = Math.sin(time * 2 + t + phase) * 3;
            list.s(line(v(x, at.y + bell * 0.6), v(x + sway, at.y + bell * 0.6 + 16 + 4 * pulse), 1), 'mapAbyss', 0.25);
          }
        }
        return;
      }
      case 'canyon':
        // Grit blowing over the rim, and the dust it leaves hanging in the low sun.
        return drift(list, 34, time, vp, ['canyonSand', 'canyonRock', 'canyonSand'], 3, 2, 22, 10, true, 591);
      case 'highland': {
        // Mist lying in the hollows, sliding slowly downhill.
        for (let i = 0; i < 7; i++) {
          const home = v(hash(i, 593) * (vp.x + 160) - 80, hash(i, 594) * vp.y);
          const at = add(home, v(Math.sin(time * 0.09 + i * 1.7) * 40, Math.sin(time * 0.13 + i) * 12));
          for (let layer = 0; layer < 3; layer++) list.s(circle(at, (26 - 5 * layer) * (1 + 0.1 * Math.sin(time * 0.2 + i))), 'primary', 0.035);
        }
        // Heather seed drifting off the hills.
        drift(list, 12, time, vp, ['heatherBloom', 'mapHighland'], 2.4, -3, 14, 8, true, 595);
        return;
      }
      case 'lanterns': {
        drift(list, 16, time, vp, ['lanternRed', 'mapLanterns', 'lanternRed'], 3, -8, 6, 10, true, 597);
        // Sky lanterns going up, each with its own flame and a slow tilt.
        const span = vp.y + 140;
        for (let j = 0; j < 4; j++) {
          const phase = hash(j, 598) * TAU;
          const rise = time * 11 * (0.7 + 0.3 * hash(j, 599));
          const y = span - ((hash(j, 600) * span + rise) % span) - 70;
          const at = v(hash(j, 601) * vp.x + Math.sin(time * 0.25 + phase) * 26, y);
          const warm = 0.6 + 0.4 * Math.sin(time * 2.2 + phase);
          const size = 3 + 1.4 * hash(j, 602);
          list.s(circle(at, size * 2.6), 'mapLanterns', 0.05);
          list.s(circle(at, size * 1.5), 'mapLanterns', 0.1);
          list.s(rect(at, v(size, size * 1.3), size * 0.4, 0.2 * Math.sin(time + phase)), j % 2 === 0 ? 'lanternRed' : 'mapLanterns', 0.5 + 0.25 * warm);
          list.s(circle(add(at, v(0, -size * 0.8)), 0.9), 'fireCore', 0.5 + 0.4 * warm);
        }
        return;
      }
      case 'crystal': {
        // Dust hanging in the light, and a shard of it catching the shine.
        for (let i = 0; i < 30; i++) {
          const at = v(hash(i, 604) * vp.x, hash(i, 605) * vp.y);
          const glint = time !== null ? Math.pow(Math.max(0, Math.sin(time * (0.7 + hash(i, 606)) + i * 1.3)), 6) : 0.2;
          if (glint <= 0.02) continue;
          list.s(circle(at, 3 + 2 * hash(i, 607)), 'crystalCyan', 0.1 * glint);
          list.s(circle(at, 0.9 + 0.7 * hash(i, 608)), 'primary', 0.85 * glint);
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
  /**
   * A tree from above: its shadow, a lobed crown in three tones (`palette`: shade, leaf,
   * light), and a bright clump where the light from the upper left catches it.
   */
  tree(list: RenderList, center: Vec2, size: number, index: number, palette: [ColorToken, ColorToken, ColorToken] = ['treeShade', 'treeLeaf', 'treeLight'], opacity = 1): void {
    const turn = hash(index, 701) * TAU;
    list.w(circle(add(center, v(size * 0.45, -size * 0.45)), size * 1.15), 'shadow', 0.8 * opacity);
    const lobes = 5 + (index % 3);
    for (let lobe = 0; lobe < lobes; lobe++) {
      const k = hash(index * 7 + lobe, 703);
      list.w(circle(add(center, mul(fromAngle(turn + (lobe * TAU) / lobes), size * (0.45 + 0.12 * k))), size * (0.46 + 0.15 * k)), palette[0], opacity);
    }
    list.w(circle(center, size * 0.74), palette[1], opacity);
    // Clumps of leaves inside the crown, each catching a little light, so it is no flat disc.
    for (let lobe = 0; lobe < 3; lobe++) {
      const k = hash(index * 5 + lobe, 705);
      const clump = add(center, mul(fromAngle(turn + 0.9 + lobe * 2.1), size * (0.32 + 0.1 * k)));
      list.w(circle(clump, size * (0.34 + 0.08 * k)), palette[1], opacity);
      list.w(circle(add(clump, v(-size * 0.08, size * 0.08)), size * (0.2 + 0.05 * k)), palette[2], 0.28 * opacity);
    }
    const lit = add(center, v(-size * 0.28, size * 0.3));
    list.w(circle(lit, size * 0.34), palette[2], 0.9 * opacity);
    list.w(circle(add(lit, v(size * 0.18, -size * 0.1)), size * 0.2), palette[2], 0.7 * opacity);
  },
  /** A cypress from above: a small dark crown and the long shadow of a tall, slim tree. */
  cypress(list: RenderList, center: Vec2, size: number): void {
    const away = fromAngle(-Math.PI / 4);
    list.w(rect(add(center, mul(away, size * 1.3)), v(size * 2.6, size * 0.75), size * 0.37, -Math.PI / 4), 'shadow', 0.8);
    list.w(circle(center, size * 0.6), 'mapCypress', 0.95);
    list.w(circle(add(center, v(-size * 0.15, size * 0.15)), size * 0.35), 'treeLight', 0.6);
  },
  /** A stack of shipping containers on the quay, two rows, in the colours of the lines. */
  containers(list: RenderList, center: Vec2, size: number, index: number): void {
    const turn = ((index % 2) * Math.PI) / 2 + (hash(index, 711) - 0.5) * 0.2;
    const along = fromAngle(turn);
    const across = left(along);
    const colors: ColorToken[] = ['skinOcean', 'skinRuby', 'mapHarbour', 'skinTeal', 'skinCopper'];
    list.w(rect(add(center, v(size * 0.4, -size * 0.4)), v(size * 2.6, size * 1.9), 1, turn), 'shadow', 0.8);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        if (hash(index * 11 + i * 3 + j, 713) < 0.2) continue;
        const at = add(center, add(mul(along, (i - 1) * size * 0.85), mul(across, (j - 0.5) * size * 0.9)));
        list.w(rect(at, v(size * 0.8, size * 0.82), 0.6, turn), colors[Math.floor(hash(index * 13 + i * 2 + j, 715) * colors.length)], 0.75);
        list.w(line(sub(at, mul(along, size * 0.3)), add(at, mul(along, size * 0.3)), 0.5), 'background', 0.35);
      }
    }
  },
  bollard(list: RenderList, center: Vec2, size: number): void {
    list.w(circle(add(center, v(1, -1)), size * 0.3), 'shadow', 0.8);
    list.w(circle(center, size * 0.28), 'wreck', 0.95);
    list.w(circle(center, size * 0.15), 'stone', 0.9);
  },
  /** A mushroom from above: a round cap with pale spots, the glowing ones lighting the ground. */
  mushroom(list: RenderList, center: Vec2, size: number, index: number): void {
    const caps: ColorToken[] = ['mapGrove', 'skinRose', 'skinSunburst', 'skinHolo'];
    const cap = caps[index % caps.length];
    if (cap === 'mapGrove' || cap === 'skinHolo') list.w(circle(center, size * 2), cap, 0.07);
    list.w(circle(add(center, v(size * 0.35, -size * 0.35)), size * 0.95), 'shadow', 0.8);
    list.w(circle(center, size * 0.9), cap, 0.9);
    list.w(circle(add(center, v(size * 0.2, -size * 0.2)), size * 0.62), 'background', 0.18);
    for (let s = 0; s < 5; s++) {
      const at = add(center, mul(fromAngle(hash(index * 5 + s, 721) * TAU), size * 0.55 * hash(index * 5 + s, 723)));
      list.w(circle(at, size * (0.09 + 0.06 * hash(index * 5 + s, 725))), 'primary', 0.85);
    }
    if (index % 2 === 0) {
      const at = add(center, mul(fromAngle(hash(index, 727) * TAU), size * 1.2));
      list.w(circle(at, size * 0.4), cap, 0.85);
      list.w(circle(add(at, v(-size * 0.08, size * 0.08)), size * 0.1), 'primary', 0.8);
    }
  },
  /** A coral fan on the sea floor: branches opening from one foot, each forking, round at the tips. */
  coral(list: RenderList, center: Vec2, size: number, index: number): void {
    const colors: ColorToken[] = ['skinCoral', 'skinRose', 'mapAbyss', 'skinSunburst'];
    const color = colors[index % colors.length];
    const opens = hash(index, 731) * TAU;
    list.w(circle(center, size * 1.2), color, 0.05);
    const foot = sub(center, mul(fromAngle(opens), size * 0.5));
    for (let b = 0; b < 4; b++) {
      const dir = opens + (b - 1.5) * 0.45 + (hash(index * 5 + b, 733) - 0.5) * 0.2;
      const mid = add(foot, mul(fromAngle(dir), size * 0.65));
      list.w(line(foot, mid, size * 0.2), color, 0.85);
      for (const fork of [-0.4, 0.35]) {
        const tip = add(mid, mul(fromAngle(dir + fork), size * (0.45 + 0.2 * hash(index * 9 + b, 735))));
        list.w(line(mid, tip, size * 0.13), color, 0.85);
        list.w(circle(tip, size * 0.11), color, 0.95);
      }
    }
    list.w(circle(foot, size * 0.22), color, 0.9);
  },
  /** A sea anemone: a soft body and short, thick tentacles with round tips. */
  anemone(list: RenderList, center: Vec2, size: number, index: number): void {
    const color: ColorToken = index % 2 === 0 ? 'mapAbyss' : 'skinRose';
    list.w(circle(center, size * 1.4), color, 0.05);
    for (let t = 0; t < 10; t++) {
      const tip = add(center, mul(fromAngle((t / 10) * TAU + hash(index, 741)), size * (0.65 + 0.12 * hash(index * 10 + t, 743))));
      list.w(line(center, tip, size * 0.22), color, 0.6);
      list.w(circle(tip, size * 0.16), color, 0.9);
    }
    list.w(circle(center, size * 0.45), color, 0.95);
    list.w(circle(center, size * 0.2), 'primary', 0.55);
  },
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
  /** A hoodoo from above: a stack of harder and softer rock, each layer a little wider. */
  hoodoo(list: RenderList, center: Vec2, size: number, index: number): void {
    const away = fromAngle(-Math.PI / 4);
    const turn = hash(index, 761) * TAU;
    list.w(rect(add(center, mul(away, size * 1.5)), v(size * 2.4, size * 0.8), size * 0.4, -Math.PI / 4), 'shadow', 0.8);
    list.w(circle(center, size * 1.15), 'canyonRock', 0.95);
    for (let layer = 0; layer < 4; layer++) {
      const k = hash(index * 7 + layer, 763);
      const at = add(center, mul(fromAngle(turn + layer * 1.7), size * (0.2 + 0.1 * k)));
      list.w(circle(at, size * (0.5 - 0.09 * layer) * (0.85 + 0.3 * k)), 'canyonSand', 0.8);
    }
    list.w(circle(add(center, v(-size * 0.22, size * 0.22)), size * 0.3), 'canyonSand', 0.7);
  },
  /** A yucca: a rosette of stiff blades with a flower spike standing out of the middle. */
  yucca(list: RenderList, center: Vec2, size: number, index: number): void {
    const turn = hash(index, 765) * TAU;
    list.w(circle(add(center, v(size * 0.35, -size * 0.35)), size * 0.85), 'background', 0.3);
    for (let blade = 0; blade < 9; blade++) {
      const dir = turn + (blade * TAU) / 9;
      const len = size * (0.85 + 0.35 * hash(index * 5 + blade, 767));
      const tip = add(center, mul(fromAngle(dir), len));
      list.w(polygon([center, add(center, mul(fromAngle(dir + 1.57), size * 0.2)), tip, add(center, mul(fromAngle(dir - 1.57), size * 0.2))]), blade % 2 === 0 ? 'mapForest' : 'skinFern', 0.92);
    }
    list.w(circle(center, size * 0.24), 'skinLatte', 0.95);
    const spike = add(center, mul(fromAngle(turn + 0.8), size * 0.75));
    list.w(circle(add(spike, v(size * 0.14, size * 0.14)), size * 0.24), 'skinCream', 0.9);
  },
  /** Heather from above: a low mossy mound speckled with blooms, densest on the crown. */
  heather(list: RenderList, center: Vec2, size: number, index: number): void {
    list.w(circle(add(center, v(size * 0.3, -size * 0.3)), size * 1.05), 'background', 0.3);
    list.w(circle(center, size * 0.95), 'highlandMoss', 0.9);
    list.w(circle(add(center, v(-size * 0.2, size * 0.2)), size * 0.62), 'highlandMoss', 0.7);
    const blooms = 7 + (index % 4);
    for (let b = 0; b < blooms; b++) {
      const k = hash(index * 7 + b, 771);
      const at = add(center, mul(fromAngle(hash(index * 11 + b, 772) * TAU), size * 0.75 * k));
      list.w(circle(at, size * (0.09 + 0.07 * k)), b % 3 === 0 ? 'mapHighland' : 'heatherBloom', 0.9);
    }
  },
  /** A standing stone, roughened and leaning a little, with the light on its upper left. */
  menhir(list: RenderList, center: Vec2, size: number, index: number): void {
    const turn = hash(index, 773) * TAU;
    const lean = (hash(index, 774) - 0.5) * 0.5;
    const h = size * 1.9;
    list.w(rect(add(center, v(size * 0.4, -size * 0.4)), v(size * 1.5, size * 0.9), size * 0.4, -Math.PI / 4), 'shadow', 0.8);
    list.w(rect(center, v(size * 1.15, h), size * 0.5, turn), 'stone', 0.95);
    list.w(rect(add(center, v(-size * 0.22, size * 0.16)), v(size * 0.55, h * 0.9), size * 0.25, turn + lean), 'skinSilver', 0.45);
    list.w(rect(add(center, mul(fromAngle(turn), h * 0.4)), v(size * 0.8, size * 0.4), size * 0.2, turn), 'highlandMoss', 0.5);
    list.w(circle(add(center, v(-size * 0.3, size * 0.25)), size * 0.28), 'heatherBloom', 0.55);
  },
  /** A festival stall from above: a counter under a striped awning, lit from within. */
  stall(list: RenderList, center: Vec2, size: number, index: number): void {
    const turn = hash(index, 781) * TAU;
    const along = fromAngle(turn);
    const across = left(along);
    list.w(rect(add(center, v(size * 0.4, -size * 0.4)), v(size * 2.5, size * 2.1), 1, turn), 'shadow', 0.8);
    list.w(circle(center, size * 1.5), 'mapLanterns', 0.06);
    list.w(rect(center, v(size * 2.1, size * 1.7), 0.6, turn), 'stone', 0.9);
    for (let piece = 0; piece < 6; piece++) {
      const from = turn + (piece * TAU) / 6;
      list.w(arc(center, size * 0.95, size * 0.55, from, from + TAU / 6), piece % 2 === 0 ? 'lanternRed' : 'skinCream', 0.95);
    }
    list.w(circle(add(center, mul(along, size * 0.5)), size * 0.55), 'mapLanterns', 0.85);
    list.w(circle(add(center, add(mul(along, size * 0.5), mul(across, -size * 0.5))), size * 0.24), 'fireCore', 0.9);
  },
  /** A paper lantern on its pole, warm on one side, with its cord and the cap on top. */
  paperLantern(list: RenderList, center: Vec2, size: number, index: number): void {
    const warm = index % 3 !== 0;
    const color: ColorToken = warm ? 'mapLanterns' : 'lanternRed';
    list.w(circle(center, size * 2.6), color, 0.05);
    list.w(circle(center, size * 1.5), color, 0.1);
    list.w(circle(add(center, v(size * 0.3, -size * 0.3)), size * 0.95), 'stone', 0.9);
    list.w(circle(center, size * 0.78), color, 0.95);
    for (let rib = -1; rib <= 1; rib++) list.w(line(add(center, v(rib * size * 0.4, -size * 0.45)), add(center, v(rib * size * 0.4, size * 0.45)), 0.4), 'stone', 0.4);
    list.w(circle(add(center, v(-size * 0.2, size * 0.2)), size * 0.34), 'primary', 0.22);
    list.w(circle(add(center, v(0, -size * 0.62)), size * 0.22), 'stone', 0.9);
    list.w(circle(add(center, v(0, size * 0.7)), size * 0.2), 'fireCore', 0.9);
  },
  /** A stalagmite from above: a ring of rock with the light pooling in its hollow. */
  stalagmite(list: RenderList, center: Vec2, size: number, index: number): void {
    const turn = hash(index, 791) * TAU;
    list.w(circle(add(center, v(size * 0.35, -size * 0.35)), size * 1.15), 'background', 0.35);
    list.w(circle(center, size), 'stone', 0.95);
    for (let lobe = 0; lobe < 5; lobe++) {
      const k = hash(index * 7 + lobe, 793);
      list.w(circle(add(center, mul(fromAngle(turn + (lobe * TAU) / 5), size * (0.3 + 0.14 * k))), size * (0.4 + 0.16 * k)), 'wreck', 0.9);
    }
    list.w(circle(add(center, v(-size * 0.22, size * 0.22)), size * 0.34), 'skinSilver', 0.35);
    if (index % 3 === 0) list.w(circle(center, size * 0.16), 'crystalCyan', 0.8);
  },
  /** A cluster of crystal shards: a few prisms leaning out of one another, lit through. */
  shard(list: RenderList, center: Vec2, size: number, index: number): void {
    const turn = hash(index, 795) * TAU;
    const color: ColorToken = index % 3 === 0 ? 'crystalCyan' : 'mapCrystal';
    list.w(circle(center, size * 1.8), color, 0.06);
    list.w(circle(add(center, v(size * 0.35, -size * 0.35)), size * 1.05), 'shadow', 0.8);
    const count = 3 + (index % 3);
    for (let s = 0; s < count; s++) {
      const dir = turn + (s * TAU) / count + hash(index * 5 + s, 797) * 0.4;
      const len = size * (1 + 0.5 * hash(index * 11 + s, 799));
      const width = size * 0.3;
      const tip = add(center, mul(fromAngle(dir), len));
      const side = mul(left(fromAngle(dir)), width);
      list.w(polygon([sub(center, side), add(center, side), tip]), color, 0.9);
      list.w(polygon([sub(center, side), add(center, mul(side, 0.4)), tip]), 'primary', 0.16);
    }
    list.w(circle(center, size * 0.32), 'crystalCyan', 0.6);
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
  /** Harbour: a basin in the quay with a moored boat rocking on it, bollards and a crane. */
  dock(list: RenderList, c: Vec2, time: number | null): void {
    const r = MapTheme.pondRadius;
    const toRing = normalize(mul(c, -1));
    const across = left(toRing);
    const turn = angleOf(toRing);
    list.w(rect(c, v(r * 2.3, r * 2.3), 3, turn), 'surface', 0.35);
    list.w(rect(c, v(r * 1.9, r * 1.9), 2, turn), 'water', 1);
    const t = time ?? 0;
    for (let wave = 0; wave < 4; wave++) {
      const phase = t * 0.5 + wave * 1.6;
      const at = add(c, v(Math.sin(phase) * r * 0.4, (wave - 1.5) * r * 0.35));
      list.w(line(sub(at, v(r * 0.16, 0)), add(at, v(r * 0.16, 0)), 0.9), 'primary', 0.1 + 0.06 * Math.sin(phase * 1.7));
    }
    const heading = turn + (time !== null ? 0.05 * Math.sin(time * 1.1) : 0);
    const fwd = fromAngle(heading);
    const side = left(fwd);
    const boat = add(c, mul(across, -r * 0.35));
    const len = r * 1.1;
    const beam = r * 0.42;
    const at = (x: number, y: number): Vec2 => add(boat, add(mul(fwd, x), mul(side, y)));
    const hull = [at(len * 0.55, 0), at(len * 0.2, beam / 2), at(-len * 0.45, beam / 2), at(-len * 0.45, -beam / 2), at(len * 0.2, -beam / 2)];
    list.w(polygon(hull.map((p) => add(p, v(2, -2)))), 'shadow', 0.7);
    list.w(polygon(hull), 'skinCream', 0.95);
    list.w(rect(at(-len * 0.1, 0), v(len * 0.35, beam * 0.6), 1, heading), 'skinOcean', 0.95);
    list.w(circle(at(len * 0.35, 0), 1.2), 'mapHarbour', 0.95);
    for (const s of [-1, 1]) Plants.bollard(list, add(c, add(mul(toRing, r * 1.02), mul(across, s * r * 0.6))), 6);
    const crane = add(c, add(mul(toRing, -r * 1.05), mul(across, r * 0.7)));
    list.w(rect(crane, v(8, 8), 1, turn), 'mapHarbour', 0.9);
    const jib = fromAngle(angleOf(across) + Math.PI + (time !== null ? 0.3 * Math.sin(time * 0.15) : 0));
    list.w(line(crane, add(crane, mul(jib, r * 1.1)), 2.4), 'mapHarbour', 0.85);
    Plants.lamp(list, add(c, add(mul(toRing, r * 1.02), mul(across, -r * 0.95))), 4, 'mapHarbour');
  },
  /** Vineyard: a villa with a terracotta roof, a warm courtyard and two cypresses at its gate. */
  villa(list: RenderList, c: Vec2, time: number | null): void {
    const toRing = normalize(mul(c, -1));
    const across = left(toRing);
    const turn = angleOf(toRing);
    const ridge = fromAngle(turn);
    list.w(rect(add(c, v(4, -4)), v(40, 30), 2, turn), 'shadow', 0.8);
    list.w(rect(c, v(40, 30), 2, turn), 'skinCopper', 0.9);
    list.w(rect(add(c, mul(across, 7.5)), v(40, 14), 1.5, turn), 'skinPumpkin', 0.3);
    for (let k = -3; k <= 3; k++) {
      const at = add(c, mul(ridge, k * 5));
      list.w(line(sub(at, mul(across, 14)), add(at, mul(across, 14)), 0.4), 'fireDeep', 0.35);
    }
    list.w(line(sub(c, mul(ridge, 20)), add(c, mul(ridge, 20)), 1.2), 'fireDeep', 0.6);
    const yard = add(c, mul(toRing, 26));
    list.w(rect(yard, v(26, 16), 2, turn), 'skinLatte', 0.3);
    list.w(circle(yard, 10), 'fireCore', 0.06 * (time !== null ? 0.8 + 0.2 * Math.sin(time * 2.3) : 0.9));
    for (const s of [-1, 1]) Plants.cypress(list, add(yard, mul(across, s * 17)), 5);
  },
  /** Mushroom Grove: a fairy ring of mushrooms round a glowing pool, motes circling over it. */
  fairyRing(list: RenderList, c: Vec2, time: number | null): void {
    const r = MapTheme.pondRadius;
    const t = time ?? 0;
    const breathe = time !== null ? 0.75 + 0.25 * Math.sin(t * 1.3) : 0.9;
    list.w(circle(c, r * 1.3), 'mapGrove', 0.05 * breathe);
    list.w(circle(c, r * 0.55), 'mapGrove', 0.1 * breathe);
    list.w(circle(c, r * 0.5), 'water', 0.9);
    list.w(circle(c, r * 0.42), 'mapGrove', 0.18 * breathe);
    const count = 11;
    for (let i = 0; i < count; i++) Plants.mushroom(list, add(c, mul(fromAngle((i / count) * TAU + hash(i, 751) * 0.2), r * 0.95)), 3 + 1.5 * hash(i, 753), i * 3);
    for (let m = 0; m < 5; m++) list.w(circle(add(c, mul(fromAngle(t * 0.5 + m * 1.26), r * 0.3 + 3 * Math.sin(t + m))), 1), 'primary', 0.6 * breathe);
  },
  /** Abyss: a sunken ship on the sea floor, its mast broken, a chest beside it that glints. */
  shipwreck(list: RenderList, c: Vec2, time: number | null): void {
    const r = MapTheme.pondRadius;
    const tilt = 0.6;
    const fwd = fromAngle(tilt);
    const side = left(fwd);
    const len = r * 1.7;
    const beam = r * 0.55;
    const at = (x: number, y: number): Vec2 => add(c, add(mul(fwd, x), mul(side, y)));
    list.w(circle(c, r * 1.3), 'mapAbyss', 0.04);
    const hull = [at(len * 0.5, 0), at(len * 0.25, beam / 2), at(-len * 0.5, beam * 0.45), at(-len * 0.5, -beam * 0.45), at(len * 0.25, -beam / 2)];
    list.w(polygon(hull.map((p) => add(p, v(4, -4)))), 'shadow', 0.8);
    list.w(polygon(hull), 'skinMocha', 0.9);
    list.w(polygon(hull.map((p) => add(c, mul(sub(p, c), 0.8)))), 'wreck', 0.85);
    for (let k = -2; k <= 2; k++) list.w(line(at(k * len * 0.15, -beam * 0.35), at(k * len * 0.15, beam * 0.35), 0.6), 'skinMocha', 0.7);
    list.w(line(at(len * 0.05, 0), add(at(len * 0.05, 0), mul(fromAngle(tilt + 1.9), len * 0.6)), 2), 'skinLatte', 0.8);
    const chest = at(-len * 0.25, -beam * 0.9);
    list.w(rect(chest, v(7, 5), 1, tilt + 0.4), 'skinCopper', 0.95);
    list.w(line(sub(chest, v(3.5, 0)), add(chest, v(3.5, 0)), 0.6), 'coin', 0.9);
    const glint = time !== null ? Math.pow(Math.max(0, Math.sin(time * 1.7)), 12) : 0.3;
    list.w(circle(add(chest, v(1.5, 1.5)), 0.8 + 1.8 * glint), 'coin', 0.3 + 0.7 * glint);
  },
  /** Red Canyon: a natural arch of layered rock, with a fire ring under it and the dusk behind. */
  arch(list: RenderList, c: Vec2, time: number | null): void {
    const r = MapTheme.pondRadius;
    const turn = hash(3, 763) * TAU;
    const reach = r * 1.05;
    list.w(circle(c, r * 1.35), 'canyonSand', 0.05);
    list.w(circle(add(c, v(3, -3)), r * 0.9), 'shadow', 0.6);
    // The span: a thick arc standing on two legs, the light coming through the opening.
    for (const leg of [-1, 1]) {
      const foot = add(c, mul(fromAngle(turn), reach * leg));
      list.w(circle(add(foot, mul(fromAngle(turn + Math.PI / 2), reach * 0.42)), r * 0.5), 'canyonRock', 0.95);
      list.w(circle(add(foot, mul(fromAngle(turn + Math.PI / 2), reach * 0.3)), r * 0.3), 'canyonSand', 0.85);
    }
    list.w(arc(c, reach, r * 0.55, turn + Math.PI * 0.02, turn + Math.PI * 0.98), 'canyonRock', 0.95);
    for (let band = 1; band <= 3; band++) {
      const k = reach * (1 - band * 0.16);
      list.w(arc(c, k, 1.2, turn + Math.PI * (0.04 + band * 0.03), turn + Math.PI * (0.96 - band * 0.03)), 'canyonSand', 0.4);
    }
    list.w(arc(c, reach + r * 0.26, 1.6, turn + Math.PI * 0.12, turn + Math.PI * 0.88), 'mapCanyon', 0.7);
    // The fire ring in front of the arch, burning down into the night.
    const fire = add(c, mul(fromAngle(turn + Math.PI / 2), r * 0.78));
    for (let s = 0; s < 8; s++) list.w(circle(add(fire, mul(fromAngle((s / 8) * TAU), 6.5)), 2), 'stone', 0.9);
    const flicker = time !== null ? 0.75 + 0.25 * Math.sin(time * 9) * Math.sin(time * 5.1) : 0.85;
    list.w(circle(fire, 18 * flicker), 'fireOuter', 0.07);
    list.w(circle(fire, 5 * flicker), 'fireOuter', 0.9);
    list.w(circle(fire, 2.4 * flicker), 'fireCore', 1);
    Plants.yucca(list, add(c, mul(fromAngle(turn + 2.3), r * 0.85)), 6, 21);
  },
  /** Highlands: a ring of standing stones round a lochan, mist lying in the middle of it. */
  stoneCircle(list: RenderList, c: Vec2, time: number | null): void {
    const r = MapTheme.pondRadius;
    const breathe = time !== null ? 0.75 + 0.25 * Math.sin(time * 0.5) : 0.85;
    list.w(circle(c, r * 1.35), 'highlandMoss', 0.12);
    list.w(circle(c, r * 0.62), 'water', 0.9);
    list.w(circle(c, r * 0.55), 'primary', 0.05 * breathe);
    for (let ring = 0; ring < 3; ring++) {
      const phase = ((time ?? 0) * 0.4 + ring / 3) % 1;
      list.w(arc(c, r * (0.2 + 0.4 * phase), 0.7, 0, TAU), 'primary', 0.25 * (1 - phase));
    }
    const count = 8;
    for (let i = 0; i < count; i++) {
      const at = add(c, mul(fromAngle((i / count) * TAU + 0.2), r * 0.98));
      Plants.menhir(list, at, 5 + 1.5 * hash(i, 775), i * 5 + 2);
    }
    for (let m = 0; m < 6; m++) list.w(circle(add(c, mul(fromAngle((time ?? 0) * 0.3 + m * 1.05), r * (0.2 + 0.35 * hash(m, 777)))), 1), 'heatherBloom', 0.5 * breathe);
  },
  /** Lantern Festival: a stage of a great paper drum, ringed by stalls, with sparks off the brazier. */
  lanternStage(list: RenderList, c: Vec2, time: number | null): void {
    const r = MapTheme.pondRadius;
    const t = time ?? 0;
    list.w(circle(c, r * 1.3), 'mapLanterns', 0.06);
    list.w(circle(c, r * 0.95), 'stone', 0.85);
    for (let ring = 0; ring < 3; ring++) list.w(arc(c, r * (0.45 + ring * 0.22), 0.8, 0, TAU), 'lanternRed', 0.5 - 0.12 * ring);
    // The drum, turning slowly, its ribs catching the light as they come round.
    const glow = 0.8 + 0.2 * Math.sin(t * 1.7);
    list.w(circle(c, r * 0.72), 'mapLanterns', 0.16 * glow);
    list.w(circle(c, r * 0.5), 'lanternRed', 0.95);
    list.w(circle(add(c, v(-r * 0.14, r * 0.14)), r * 0.36), 'mapLanterns', 0.9);
    for (let rib = 0; rib < 8; rib++) {
      const from = t * 0.5 + (rib * TAU) / 8;
      const depth = Math.cos(from);
      list.w(line(add(c, mul(fromAngle(from), r * 0.46)), add(c, mul(fromAngle(from), r * 0.5)), 0.8), depth > 0 ? 'primary' : 'stone', 0.2 + 0.3 * Math.max(0, depth));
    }
    list.w(circle(c, r * 0.16), 'fireCore', 0.95);
    list.w(circle(add(c, v(r * 0.5, -r * 0.5)), r * 0.2), 'skinGold', 0.8);
    // Stalls round the stage and a brazier throwing sparks.
    for (let i = 0; i < 5; i++) Plants.stall(list, add(c, mul(fromAngle((i / 5) * TAU + 0.5), r * 1.15)), 6, i * 3);
    const brazier = add(c, mul(fromAngle(2.1), r * 1.05));
    for (let s = 0; s < 7; s++) list.w(circle(add(brazier, mul(fromAngle((s / 7) * TAU), 5)), 1.6), 'stone', 0.9);
    list.w(circle(brazier, 13 * glow), 'fireCore', 0.08);
    list.w(circle(brazier, 3.4 * glow), 'fireOuter', 0.95);
    for (let s = 0; s < 5; s++) {
      const rise = ((t * 9 + s * 3) % 16) / 16;
      list.w(circle(add(brazier, v(Math.sin(s * 2.3 + t) * 4, rise * 22)), 0.9), 'fireCore', 0.7 * (1 - rise));
    }
  },
  /** Crystal Cavern: a great geode of violet prisms round a lit pool, rays going out of it. */
  geode(list: RenderList, c: Vec2, time: number | null): void {
    const r = MapTheme.pondRadius;
    const t = time ?? 0;
    const breathe = 0.7 + 0.3 * Math.sin(t * 0.9);
    list.w(circle(c, r * 1.4), 'mapCrystal', 0.06 * breathe);
    list.w(circle(c, r), 'water', 1);
    list.w(circle(c, r * 0.8), 'crystalCyan', 0.1 * breathe);
    // Light rays out of the pool, turning slowly.
    for (let ray = 0; ray < 9; ray++) {
      const from = t * 0.16 + (ray * TAU) / 9;
      const dir = fromAngle(from);
      const reach = r * (1 + 0.5 * (0.5 + 0.5 * Math.sin(from * 2 + t * 0.6)));
      list.w(polygon([add(c, mul(dir, r * 0.35)), add(c, mul(dir, reach)), add(c, mul(fromAngle(from + 0.12), r * 0.4))]), 'crystalCyan', 0.1 * breathe);
    }
    // The prisms themselves, leaning in around the rim.
    for (let i = 0; i < 9; i++) {
      const dir = (i / 9) * TAU + 0.35;
      const tip = add(c, mul(fromAngle(dir), r * (1.05 + 0.25 * hash(i, 781))));
      const side = mul(left(fromAngle(dir)), r * 0.16);
      list.w(polygon([sub(c, side), add(c, side), tip]), i % 3 === 0 ? 'crystalCyan' : 'mapCrystal', 0.92);
      list.w(polygon([sub(c, side), add(c, mul(side, 0.35)), tip]), 'primary', 0.15);
      list.w(polygon([add(c, side), tip, add(c, mul(side, 0.2))]), 'groundCrystal', 0.35);
    }
    const glint = Math.pow(Math.max(0, Math.sin(t * 1.3)), 10);
    list.w(circle(add(c, v(r * 0.3, r * 0.3)), 1.5 + 4 * glint), 'primary', 0.2 + 0.7 * glint);
  },
  planet(list: RenderList, c: Vec2, time: number | null): void {    const radius = MapTheme.pondRadius * 0.55;
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
