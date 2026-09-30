import type { World } from '../core/world';
import type { Layout } from '../core/roundabout';
import { type Vec2, v, add, sub, mul, dot, dist, length, left, normalize, fromAngle, angleOf, TAU } from '../core/vec2';
import { type RenderList, type Camera, rect, circle, arc, line, polygon, unitHash, toScreen } from './render';
import type { ColorToken } from './theme';
import { Plants } from './mapPlants';
import { Centre } from './mapCentre';

/**
 * What a map skin does to the city: the ground takes the map's colour,
 * its own plants grow, a centrepiece sits above the ring, and some maps bring weather of
 * their own. Night maps keep a dark ground; daylight maps (`DAYLIGHT`) have the bright ground
 * of their place, while the road, the island and the HUD stay dark so cars and text read the same.
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
  | 'crystal'
  | 'beach';
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
  'beach',
];

/** The maps that play in the sun: a bright ground, roofs in daylight colours. */
export const DAYLIGHT: readonly MapTheme[] = ['sand', 'forest', 'autumn', 'sakura', 'meadow', 'tropic', 'snowfall', 'vineyard', 'canyon', 'highland', 'beach'];

const hash = (i: number, salt: number): number => unitHash(i, salt);

function onScreen(center: Vec2, radius: number, cam: Camera): boolean {
  const at = toScreen(cam, center);
  const r = radius * cam.scale;
  return at.x > -r && at.y > -r && at.x < cam.viewport.x + r && at.y < cam.viewport.y + r;
}

const pondCache = new Map<string, Vec2 | null>();

/** A vineyard field: `half` runs along the rows (x) and across them (y). */
interface VineField {
  center: Vec2;
  along: Vec2;
  half: Vec2;
}
const fieldCache = new Map<string, VineField[]>();

/** The field's corners and the middle of each side, pushed out by `scale`. */
function fieldOutline(f: VineField, scale: number): Vec2[] {
  const across = left(f.along);
  const points: Vec2[] = [];
  for (const [x, y] of [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]]) {
    points.push(add(f.center, add(mul(f.along, x * f.half.x * scale), mul(across, y * f.half.y * scale))));
  }
  return points;
}

function inField(f: VineField, point: Vec2, margin: number): boolean {
  const d = sub(point, f.center);
  return Math.abs(dot(d, f.along)) < f.half.x + margin && Math.abs(dot(d, left(f.along))) < f.half.y + margin;
}

/** Whether a point lies within `reach` of the middle of any arm. */
function nearArm(layout: Layout, point: Vec2, reach: number): boolean {
  return layout.arms.some((a) => {
    const out = fromAngle(a.angle);
    const along = dot(point, out);
    return along > 0 && length(sub(point, mul(out, along))) < reach;
  });
}

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
      beach: 'groundBeach',
    } as const)[theme];
  },

  isDay: (theme: MapTheme | null): boolean => theme !== null && DAYLIGHT.includes(theme),

  /** Roof colours: muted and dark at night, sunlit tiles and concrete by day, white under snow. */
  roofs(theme: MapTheme | null): ColorToken[] {
    if (theme === 'snowfall') return ['roofSnow', 'roofSnow', 'roofSlateDay', 'roofTerracotta'];
    if (MapTheme.isDay(theme)) return ['roofTerracotta', 'roofSlateDay', 'roofConcreteDay', 'roofTerracotta'];
    return ['roofSlate', 'roofTile', 'roofConcrete', 'roofMoss'];
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
    if (theme === 'vineyard' && MapTheme.vineFields(layout).some((f) => inField(f, point, 30))) return true;
    return nearArm(layout, point, layout.laneWidth + 40);
  },

  /**
   * The vineyard's fields: tilled rectangles lined up with the roads, planned once per layout
   * so that none overlaps another, a road, the ring or the villa. Houses and trees keep off them.
   */
  vineFields(layout: Layout): VineField[] {
    const key = `${layout.ringRadius}|${layout.laneWidth}|${layout.arms.map((a) => a.slot).join(',')}`;
    const cached = fieldCache.get(key);
    if (cached) return cached;
    const fields: VineField[] = [];
    const pond = MapTheme.pondCenter(layout);
    const ring = layout.ringRadius;
    for (let i = 0; i < 60 && fields.length < 8; i++) {
      const center = mul(fromAngle(hash(i, 611) * TAU), ring + 90 + hash(i, 612) * 220);
      const arm = layout.arms.length > 0 ? layout.arms[i % layout.arms.length].angle : 0;
      const along = fromAngle(arm + (hash(i, 613) < 0.5 ? 0 : Math.PI / 2) + (hash(i, 614) - 0.5) * 0.16);
      const field: VineField = { center, along, half: v(30 + 10 * hash(i, 616), 20 + 6 * hash(i, 617)) };
      const edge = fieldOutline(field, 1.25);
      if (edge.some((p) => nearArm(layout, p, layout.laneWidth + 16) || length(p) < ring + layout.laneWidth / 2 + 24)) continue;
      if (pond && dist(center, pond) < MapTheme.pondRadius + 36 + length(field.half)) continue;
      if (fields.some((f) => dist(f.center, center) < length(f.half) + length(field.half) + 14)) continue;
      fields.push(field);
    }
    fieldCache.set(key, fields);
    return fields;
  },

  addGround(list: RenderList, theme: MapTheme | null, world: World, time: number | null): void {
    const layout = world.layout;
    // What the still ground shows: the map on this road. Everything before `still()` is baked
    // once by the drawer (with the background and the texture); what moves comes after it.
    const still = (): void => list.markStatic(`${theme}|${layout.ringRadius}|${layout.laneWidth}|${layout.arms.map((a) => a.slot).join(',')}`);
    if (!theme) return still();
    const ring = world.layout.ringRadius;
    const cam = list.camera;
    const add1 = (p: ReturnType<typeof circle>, c: ColorToken, o: number): void => list.w(p, c, o);
    // Soft patches are large and see-through, the costliest fills on the map: only those in view.
    const soft = (center: Vec2, radius: number, color: ColorToken, opacity: number): void => {
      if (!onScreen(center, radius, cam)) return;
      for (let layer = 0; layer < 3; layer++) add1(circle(center, radius * (1 - 0.22 * layer)), color, opacity * 0.45);
    };
    const spot = (i: number, salt: number, from = 30, to = 360): Vec2 => mul(fromAngle(hash(i, salt) * TAU), ring + from + hash(i, salt + 1) * (to - from));
    switch (theme) {
      case 'sand':
        // Bright dunes in the sun: pale crests, wind ripples in the shade, and grit.
        for (let i = 0; i < 14; i++) soft(spot(i, 301), 40 + 50 * hash(i, 303), 'sandLight', 0.3);
        for (let i = 0; i < 10; i++) {
          const center = spot(i, 309, 40, 330);
          if (!onScreen(center, 60, cam)) continue;
          const start = hash(i, 310) * TAU;
          for (let r = 0; r < 4; r++) list.w(arc(center, 24 + r * 7, 1.2, start, start + 0.9), 'sandDune', 0.35);
        }
        for (let i = 0; i < 40; i++) {
          const at = spot(i, 305);
          if (onScreen(at, 4, cam)) add1(circle(at, 1.5 + 2 * hash(i, 307)), 'sandDune', 0.35);
        }
        break;
      case 'forest':
        // Sun through the canopy on a mossy floor: dark hollows, bright glades, ferns.
        for (let i = 0; i < 14; i++) soft(spot(i, 311), 30 + 40 * hash(i, 313), 'firDark', 0.14);
        for (let i = 0; i < 10; i++) soft(spot(i, 315), 22 + 30 * hash(i, 317), 'firLight', 0.2);
        for (let i = 0; i < 50; i++) {
          const at = spot(i, 318, 12);
          if (onScreen(at, 3, cam)) add1(circle(at, 1.2 + 1.2 * hash(i, 319)), i % 4 === 0 ? 'skinSunburst' : 'firLight', 0.5);
        }
        break;
      case 'autumn':
        // A golden stubble field, darker where the soil shows, and fallen leaves.
        for (let i = 0; i < 12; i++) soft(spot(i, 325), 30 + 40 * hash(i, 327), 'skinMocha', 0.12);
        for (let i = 0; i < 10; i++) soft(spot(i, 328), 26 + 34 * hash(i, 329), 'skinSunburst', 0.14);
        for (let i = 0; i < 90; i++) {
          const at = spot(i, 321, 10);
          if (onScreen(at, 4, cam)) add1(circle(at, 1.6 + 1.6 * hash(i, 323)), i % 3 === 0 ? 'fireDeep' : 'fireOuter', 0.6);
        }
        break;
      case 'sakura':
        MapTheme.addSakuraGround(list, world, time, still);
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
        // A spring meadow: lush and sunny patches of grass, wildflowers everywhere.
        for (let i = 0; i < 14; i++) soft(spot(i, 401), 26 + 34 * hash(i, 403), 'grassDeep', 0.16);
        for (let i = 0; i < 12; i++) soft(spot(i, 409), 22 + 30 * hash(i, 410), 'grassLight', 0.22);
        const flowers: ColorToken[] = ['mapMeadow', 'primary', 'skinRose', 'skinSky', 'juiceRed'];
        for (let i = 0; i < 110; i++) {
          const at = spot(i, 405, 12);
          if (onScreen(at, 3, cam)) add1(circle(at, 1.1 + 0.9 * hash(i, 407)), flowers[i % 5], 0.85);
        }
        break;
      }
      case 'tropic':
        // Jungle floor: deep shade under the palms, sunny clearings and hibiscus in bloom.
        for (let i = 0; i < 14; i++) soft(spot(i, 411), 26 + 34 * hash(i, 413), 'palmDark', 0.16);
        for (let i = 0; i < 10; i++) soft(spot(i, 415), 20 + 26 * hash(i, 417), 'palmLeaf', 0.16);
        for (let i = 0; i < 50; i++) {
          const at = spot(i, 419, 12);
          if (onScreen(at, 3, cam)) add1(circle(at, 1.1 + 1.1 * hash(i, 421)), i % 3 === 0 ? 'skinSunburst' : i % 3 === 1 ? 'skinCoral' : 'skinRose', 0.85);
        }
        break;
      case 'snowfall':
        // Fresh snow: blue shade in the drifts, sledge tracks, and a glitter where the sun catches it.
        for (let i = 0; i < 22; i++) soft(spot(i, 431), 16 + 26 * hash(i, 433), 'snowShade', 0.22);
        for (let i = 0; i < 5; i++) {
          const center = spot(i, 435, 90, 300);
          const start = hash(i, 437) * TAU;
          for (const rail of [-2.2, 2.2]) list.w(arc(center, 46 + rail, 0.9, start, start + 1.1), 'snowShade', 0.8);
        }
        still();
        for (let i = 0; i < 50; i++) {
          const at = spot(i, 439, 12);
          if (!onScreen(at, 2, cam)) continue;
          const twinkle = time !== null ? Math.pow(Math.max(0, Math.sin(time * 2.2 + i * 1.7)), 8) : 0.3;
          add1(circle(at, 0.6 + 0.8 * twinkle), 'skinSky', 0.2 + 0.7 * twinkle);
        }
        break;
      case 'cosmos': {
        const clouds: ColorToken[] = ['juicePurple', 'juiceBlue', 'skinRose'];
        for (let i = 0; i < 12; i++) soft(spot(i, 441), 40 + 60 * hash(i, 443), clouds[i % 3], 0.035);
        still();
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
        // Sunny Tuscan hills: tilled fields with rows of vines, grapes hanging on some of them.
        for (let i = 0; i < 12; i++) soft(spot(i, 619), 30 + 40 * hash(i, 620), i % 2 === 0 ? 'grassLight' : 'skinOlive', 0.18);
        MapTheme.vineFields(world.layout).forEach((field, i) => {
          if (!onScreen(field.center, length(field.half) + 10, cam)) return;
          const { center, along, half } = field;
          const across = left(along);
          const turn = angleOf(along);
          list.w(rect(add(center, v(2, -2)), v(half.x * 2 + 4, half.y * 2 + 4), 3, turn), 'shadow', 0.25);
          list.w(rect(center, v(half.x * 2 + 4, half.y * 2 + 4), 3, turn), 'vineSoil', 0.9);
          const rows = Math.max(3, Math.floor((half.y * 2) / 8));
          for (let row = 0; row < rows; row++) {
            const mid = add(center, mul(across, (row - (rows - 1) / 2) * ((half.y * 2) / rows)));
            const from = sub(mid, mul(along, half.x - 2));
            const to = add(mid, mul(along, half.x - 2));
            list.w(line(add(from, v(0.8, -0.8)), add(to, v(0.8, -0.8)), 3.2), 'shadow', 0.5);
            list.w(line(from, to, 3), 'mapCypress', 0.95);
            list.w(line(add(from, v(-0.6, 0.6)), add(to, v(-0.6, 0.6)), 1), 'skinFern', 0.6);
            const bunches = Math.floor(half.x / 7);
            for (let g = 0; g < bunches; g++) {
              if (hash(i * 97 + row * 13 + g, 615) < 0.55) add1(circle(add(mid, mul(along, -half.x + 5 + g * ((half.x * 2 - 10) / Math.max(1, bunches - 1)))), 1.5), 'mapVineyard', 0.95);
            }
          }
        });
        break;
      case 'grove':
        // Moss, and glowing spores on the ground that breathe in and out.
        for (let i = 0; i < 16; i++) soft(spot(i, 621), 24 + 36 * hash(i, 623), 'mapForest', 0.05);
        still();
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
        still();
        for (let i = 0; i < 8; i++) {
          const pulse = time !== null ? 0.5 + 0.5 * Math.sin(time * 0.6 + i * 1.3) : 0.5;
          soft(spot(i, 635, 20, 340), 30 + 20 * hash(i, 637), 'mapAbyss', 0.035 * pulse);
        }
        break;
      case 'canyon':
        // Sand in wide drifts, a dry wash winding between the buttes, and grit on the ground.
        for (let i = 0; i < 14; i++) soft(spot(i, 641), 34 + 46 * hash(i, 643), 'canyonSand', 0.22);
        for (let i = 0; i < 8; i++) soft(spot(i, 655), 26 + 30 * hash(i, 657), 'canyonRock', 0.14);
        for (let i = 0; i < 6; i++) {
          const from = spot(i, 645, 40, 300);
          if (!onScreen(from, 80, cam)) continue;
          const dir = fromAngle(hash(i, 647) * TAU);
          const mid = add(from, mul(dir, 34));
          const end = add(mid, mul(fromAngle(angleOf(dir) + (hash(i, 649) - 0.5) * 0.9), 40));
          list.w(polygon([from, mid, end, add(mid, mul(left(dir), 9)), add(from, mul(left(dir), 11))]), 'canyonSand', 0.35);
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
        still();
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
        still();
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
      case 'beach': {
        // Hot sand, the dark wet line the tide left, shells and starfish.
        for (let i = 0; i < 14; i++) soft(spot(i, 801), 34 + 44 * hash(i, 803), 'sandLight', 0.35);
        for (let i = 0; i < 6; i++) {
          const center = spot(i, 805, 60, 320);
          if (!onScreen(center, 70, cam)) continue;
          const start = hash(i, 807) * TAU;
          list.w(arc(center, 44, 7, start, start + 1.3), 'sandDune', 0.16);
          list.w(arc(center, 40, 1, start + 0.1, start + 1.2), 'primary', 0.35);
        }
        for (let i = 0; i < 40; i++) {
          const at = spot(i, 809, 12);
          if (!onScreen(at, 4, cam)) continue;
          if (i % 5 === 0) {
            const turn = hash(i, 811) * TAU;
            const star = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => add(at, mul(fromAngle(turn + (k * Math.PI) / 5), k % 2 === 0 ? 3.2 : 1.3)));
            list.w(polygon(star), i % 2 === 0 ? 'skinCoral' : 'skinSunburst', 0.9);
          } else add1(circle(at, 0.9 + hash(i, 813)), i % 3 === 0 ? 'skinCoral' : 'skinPearl', 0.85);
        }
        break;
      }
    }
    still();
    const pond = MapTheme.pondCenter(world.layout);
    if (theme !== 'sakura' && pond && onScreen(pond, MapTheme.pondRadius * 2, cam)) MapTheme.addCentrepiece(list, theme, pond, time);
  },

  /** `still` marks where the moving part (the koi and what drifts on the pond) begins. */
  addSakuraGround(list: RenderList, world: World, time: number | null, still: () => void = () => undefined): void {
    const layout = world.layout;
    const ring = layout.ringRadius;
    const cam = list.camera;
    const soft = (center: Vec2, radius: number, color: ColorToken, opacity: number): void => {
      if (!onScreen(center, radius, cam)) return;
      for (let layer = 0; layer < 3; layer++) list.w(circle(center, radius * (1 - 0.22 * layer)), color, opacity * 0.45);
    };
    const spot = (i: number, salt: number, from = 12, to = 360): Vec2 => mul(fromAngle(hash(i, salt) * TAU), ring + from + hash(i, salt + 1) * (to - from));
    // Fresh spring lawns: deeper green in the shade of the trees, sunlit patches, pink under the blossom.
    for (let i = 0; i < 14; i++) soft(spot(i, 331, 40), 28 + 36 * hash(i, 332), 'grassDeep', 0.18);
    for (let i = 0; i < 12; i++) soft(spot(i, 333, 30), 24 + 30 * hash(i, 337), 'grassLight', 0.24);
    for (let i = 0; i < 10; i++) soft(spot(i, 334, 30), 22 + 30 * hash(i, 335), 'mapSakura', 0.12);
    for (let i = 0; i < 80; i++) {
      const at = spot(i, 336);
      if (!onScreen(at, 3, cam)) continue;
      const len = 1.8 + 1.2 * hash(i, 338);
      list.w(rect(at, v(len, len * 0.6), len * 0.3, hash(i, 339) * Math.PI), i % 3 === 0 ? 'sakuraPale' : 'mapSakura', 0.6 + 0.35 * hash(i, 340));
    }
    const pond = MapTheme.pondCenter(layout);
    if (!pond) return still();
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
    still();
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
      case 'beach':
        return Centre.cove(list, at, time);
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

  /**
   * The map's own marks on its thumbnail (Shop, chest, casino): a disc of radius 60 world
   * units with the road at 27, so only the ring 33–58 is free. One signature per map, small
   * enough to sit under the four plants drawn after it.
   */
  addBadge(list: RenderList, theme: MapTheme | null): void {
    const w = (p: ReturnType<typeof circle>, c: ColorToken, o = 1): void => list.w(p, c, o);
    const at = (i: number, salt: number, from = 34, to = 56): Vec2 => mul(fromAngle(hash(i, salt) * TAU), from + hash(i, salt + 1) * (to - from));
    const dots = (n: number, salt: number, r: number, colors: ColorToken[], o: number): void => {
      for (let i = 0; i < n; i++) w(circle(at(i, salt), r * (0.7 + 0.6 * hash(i, salt + 2))), colors[i % colors.length], o);
    };
    const glow = (c: Vec2, r: number, color: ColorToken, o: number): void => {
      for (let layer = 0; layer < 3; layer++) w(circle(c, r * (1 - 0.25 * layer)), color, o * 0.4);
    };
    // A chord of the disc at `offset` from the centre, along `angle`.
    const chord = (offset: number, angle: number, width: number, color: ColorToken, o: number): void => {
      const half = Math.sqrt(Math.max(0, 58 * 58 - offset * offset));
      const along = fromAngle(angle);
      const across = left(along);
      w(line(add(mul(across, offset), mul(along, -half)), add(mul(across, offset), mul(along, half)), width), color, o);
    };
    switch (theme) {
      case null:
        return;
      case 'dusk':
        for (let i = 0; i < 10; i++) glow(mul(fromAngle((i / 10) * TAU + 0.3), 35), 4, 'fireCore', 0.35);
        return dots(10, 901, 0.9, ['mapDusk', 'primary'], 0.6);
      case 'sand':
        for (let i = 0; i < 5; i++) {
          const c = at(i, 903, 40, 52);
          const start = hash(i, 905) * TAU;
          for (let r = 0; r < 3; r++) w(arc(c, 6 + r * 3, 0.8, start, start + 1.1), 'sandDune', 0.6);
        }
        return;
      case 'neon':
        for (let x = -54; x <= 54; x += 12) {
          chord(x, 0, 0.6, 'mapNeon', 0.25);
          chord(x, Math.PI / 2, 0.6, 'mapNeon', 0.25);
        }
        return;
      case 'forest':
        for (let i = 0; i < 6; i++) glow(at(i, 907), 9, 'firDark', 0.4);
        return dots(10, 909, 1, ['firLight', 'skinSunburst'], 0.8);
      case 'autumn':
        return dots(22, 911, 1.4, ['fireOuter', 'fireDeep', 'hazard'], 0.85);
      case 'sakura': {
        dots(18, 913, 1.1, ['mapSakura', 'sakuraPale'], 0.9);
        // A little koi pond with its stone rim.
        const pond = mul(fromAngle(1.4), 45);
        w(circle(pond, 9.5), 'stone', 0.8);
        w(circle(pond, 8), 'water');
        w(circle(add(pond, v(-2, 1.5)), 1.8), 'skinKoi');
        w(circle(add(pond, v(2.5, -1)), 1.5), 'primary', 0.9);
        return;
      }
      case 'aurora':
        for (let band = 0; band < 3; band++) w(arc(v(0, 0), 40 + band * 7, 4, 0.2 * Math.PI, 0.8 * Math.PI + 0.1 * band), band === 1 ? 'skinSky' : 'mapAurora', 0.45);
        return dots(10, 915, 0.8, ['primary'], 0.7);
      case 'ember':
        for (let i = 0; i < 8; i++) {
          const from = at(i, 917, 36, 50);
          w(line(from, add(from, mul(fromAngle(hash(i, 919) * TAU), 8)), 1.3), 'mapEmber', 0.85);
        }
        return glow(mul(fromAngle(4.2), 46), 7, 'mapEmber', 0.35);
      case 'meadow':
        return dots(26, 921, 1.2, ['mapMeadow', 'primary', 'skinRose', 'skinSky', 'juiceRed'], 0.95);
      case 'tropic': {
        dots(14, 923, 1.3, ['skinCoral', 'skinSunburst', 'skinRose'], 0.9);
        const lagoon = mul(fromAngle(1.4), 45);
        w(circle(lagoon, 10), 'mapSand', 0.9);
        w(circle(lagoon, 8), 'sea');
        return;
      }
      case 'snowfall':
        for (let i = 0; i < 3; i++) {
          const start = hash(i, 925) * TAU;
          for (const rail of [-1.5, 1.5]) w(arc(v(0, 0), 45 + i * 4 + rail, 0.7, start, start + 1.4), 'snowShade', 0.9);
        }
        return dots(12, 927, 0.8, ['skinSky'], 0.8);
      case 'cosmos':
        glow(mul(fromAngle(2.2), 44), 12, 'juicePurple', 0.25);
        return dots(30, 929, 0.8, ['primary', 'primary', 'mapCosmos'], 0.9);
      case 'harbour': {
        const basin = mul(fromAngle(1.4), 45);
        w(rect(basin, v(18, 12), 1.5, 1.4), 'water');
        w(rect(basin, v(8, 3.5), 1, 1.4), 'skinCream', 0.9);
        return dots(10, 931, 1, ['mapHarbour'], 0.7);
      }
      case 'vineyard': {
        const field = mul(fromAngle(1.4), 45);
        const turn = 1.4 + Math.PI / 2;
        w(rect(field, v(18, 12), 1.5, turn), 'vineSoil', 0.95);
        for (let row = -1; row <= 1; row++) {
          const mid = add(field, mul(fromAngle(turn + Math.PI / 2), row * 3.6));
          w(line(sub(mid, mul(fromAngle(turn), 7.5)), add(mid, mul(fromAngle(turn), 7.5)), 1.6), 'mapCypress');
          w(circle(add(mid, mul(fromAngle(turn), 2)), 0.9), 'mapVineyard');
        }
        return;
      }
      case 'grove':
        for (let i = 0; i < 12; i++) glow(at(i, 933), 3, 'mapGrove', 0.35);
        return dots(12, 935, 0.8, ['mapGrove'], 0.9);
      case 'abyss':
        for (let i = 0; i < 4; i++) {
          const c = at(i, 937, 40, 50);
          const start = hash(i, 939) * TAU;
          for (let r = 0; r < 2; r++) w(arc(c, 5 + r * 3, 0.7, start, start + 1.3), 'mapAbyss', 0.5);
        }
        for (let i = 0; i < 8; i++) w(arc(at(i, 941), 1.4 + hash(i, 943), 0.5, 0, TAU), 'primary', 0.55);
        return;
      case 'canyon': {
        const from = mul(fromAngle(1), 36);
        w(polygon([from, mul(fromAngle(1.35), 47), mul(fromAngle(1.7), 56), mul(fromAngle(1.75), 52), mul(fromAngle(1.3), 42), mul(fromAngle(1.1), 35)]), 'canyonSand', 0.6);
        return dots(16, 945, 1, ['canyonRock', 'canyonSand'], 0.7);
      }
      case 'highland':
        for (let i = 0; i < 3; i++) w(circle(at(i, 947, 40, 50), 4 + 2 * hash(i, 949)), 'water', 0.7);
        return dots(22, 951, 0.9, ['heatherBloom', 'mapHighland', 'skinRose'], 0.9);
      case 'lanterns':
        for (let i = 0; i < 8; i++) glow(mul(fromAngle((i / 8) * TAU + 0.2), 36), 4.5, i % 2 === 0 ? 'mapLanterns' : 'lanternRed', 0.45);
        return dots(12, 953, 0.9, ['mapLanterns', 'lanternRed'], 0.6);
      case 'crystal':
        for (let i = 0; i < 6; i++) {
          const c = at(i, 955, 36, 48);
          const dir = fromAngle(hash(i, 957) * TAU);
          w(polygon([c, add(c, mul(dir, 9)), add(add(c, mul(dir, 6)), mul(left(dir), 2))]), 'crystalCyan', 0.45);
        }
        return dots(10, 959, 0.9, ['crystalCyan', 'mapCrystal'], 0.8);
      case 'beach':
        // The sea along one side of the disc, surf on the sand, shells.
        w(arc(v(0, 0), 52, 12, 1.1, 2.1), 'sea');
        w(arc(v(0, 0), 55, 6, 1.1, 2.1), 'seaDeep', 0.7);
        w(arc(v(0, 0), 45.5, 1.4, 1.12, 2.08), 'primary', 0.85);
        return dots(12, 961, 0.9, ['skinCoral', 'skinPearl'], 0.9);
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
        Plants.fir(list, center, size, index);
        break;
      case 'aurora':
        for (let tier = 0; tier < 3; tier++) {
          const width = size * (1.5 - 0.35 * tier);
          const base = add(center, v(0, tier * size * 0.6 - size * 0.5));
          a(polygon([add(base, v(-width, 0)), add(base, v(width, 0)), add(base, v(0, size * 1.1))]), 'skinChrome', 0.55);
        }
        break;
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
        if (index % 3 === 2) Plants.flowerBush(list, center, size, index, ['palmDark', 'palmLeaf'], ['skinCoral', 'skinSunburst', 'juiceRed']);
        else Plants.palm(list, center, size, index);
        break;
      case 'beach':
        if (index % 3 === 0) Plants.palm(list, center, size, index);
        else if (index % 3 === 1) Plants.parasol(list, center, size, index);
        else Plants.sandcastle(list, center, size, index);
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
    const from = list.items.length;
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
            case 'beach':
              if (isAccent) Plants.parasol(list, at, size * 0.8, index);
              else Plants.palm(list, at, size * 0.9, index);
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
    // The avenues stand still (only the trees in the open sway): the drawer keeps their picture.
    list.bake(from, 'avenues', `${theme}|${layout.ringRadius}|${layout.laneWidth}|${layout.arms.map((a) => a.slot).join(',')}`);
  },

  /** Above the vehicles, below the HUD: what the wind carries over the map. */
  /**
   * `calm` is the island on screen: what flies over it fades to a trace there, so the prompt,
   * the combo and the result lines on the island stay clear.
   */
  addAir(list: RenderList, theme: MapTheme | null, time: number, reduceMotion: boolean, calm: { center: Vec2; radius: number } | null = null): void {
    const from = list.items.length;
    MapTheme.addAirItems(list, theme, time, reduceMotion);
    if (!calm) return;
    for (let i = from; i < list.items.length; i++) {
      const item = list.items[i];
      const p = item.p;
      const at = p.k === 'line' ? mul(add(p.from, p.to), 0.5) : p.k === 'circle' || p.k === 'rect' || p.k === 'arc' ? p.center : null;
      if (!at) continue;
      const inside = 1 - Math.min(1, Math.max(0, (dist(at, calm.center) - calm.radius * 0.75) / (calm.radius * 0.35)));
      if (inside > 0) list.items[i] = { ...item, opacity: item.opacity * (1 - 0.85 * inside) };
    }
  },

  addAirItems(list: RenderList, theme: MapTheme | null, time: number, reduceMotion: boolean): void {
    if (!theme || reduceMotion) return;
    const vp = list.camera.viewport;
    switch (theme) {
      case 'sakura':
        return drift(list, 40, time, vp, ['mapSakura', 'sakuraPale', 'mapSakura'], 7, 26, 34, 16, false, 501);
      case 'autumn':
        return drift(list, 14, time, vp, ['mapAutumn', 'hazard', 'fireOuter'], 7, 34, 26, 22, false, 511);
      case 'snowfall':
        return drift(list, 70, time, vp, ['primary', 'mapSnow'], 4.6, 34, 8, 12, true, 521);
      case 'meadow': {
        // Butterflies flutter over the flowers, wandering and turning where they please.
        const wings: ColorToken[] = ['skinSunburst', 'primary', 'skinSky', 'skinCoral'];
        for (let i = 0; i < 9; i++) {
          const home = v(hash(i, 531) * vp.x, hash(i, 532) * vp.y);
          const phase = hash(i, 533) * TAU;
          const wander = (t: number): Vec2 => add(home, v(Math.sin(t * 0.31 + phase) * 44, Math.sin(t * 0.23 + phase * 1.7) * 32));
          const at = wander(time);
          const heading = angleOf(sub(wander(time + 0.1), at));
          const flap = 0.25 + 0.75 * Math.abs(Math.sin(time * (11 + 4 * hash(i, 534)) + phase));
          const color = wings[i % wings.length];
          list.s(circle(add(at, v(3, 5)), 2.2 * flap), 'shadow', 0.35);
          for (const side of [-1, 1]) {
            const out = fromAngle(heading + side * Math.PI / 2);
            list.s(circle(add(at, add(mul(out, 2.6 * flap), mul(fromAngle(heading), 1))), 2.4 * flap + 0.6), color, 0.95);
            list.s(circle(add(at, add(mul(out, 1.8 * flap), mul(fromAngle(heading), -1.6))), 1.6 * flap + 0.4), color, 0.95);
          }
          list.s(line(sub(at, mul(fromAngle(heading), 2.2)), add(at, mul(fromAngle(heading), 2.2)), 1), 'vehicleTire', 0.9);
        }
        return;
      }
      case 'beach':
        // Gulls gliding over the sand, their shadows sliding along below them.
        for (let i = 0; i < 4; i++) {
          const span = vp.x + 160;
          const speed = 16 + 10 * hash(i, 821);
          const x = ((hash(i, 822) * span + time * speed) % span) - 80;
          const y = hash(i, 823) * vp.y * 0.8 + Math.sin(time * 0.4 + i) * 18;
          const flap = Math.sin(time * (2.2 + hash(i, 824)) + i * 2);
          const tip = 5 + 2 * flap;
          const at = v(x, y);
          for (const [offset, color, width, opacity] of [[v(10, 14), 'shadow', 1.6, 0.45], [v(0, 0), 'stone', 2.6, 0.85], [v(0, 0), 'primary', 1.4, 1]] as [Vec2, ColorToken, number, number][]) {
            const p = add(at, offset);
            list.s(line(add(p, v(-8, -tip)), p, width), color, opacity);
            list.s(line(p, add(p, v(8, -tip)), width), color, opacity);
          }
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
