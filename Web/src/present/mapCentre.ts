import { type Vec2, v, add, sub, mul, left, normalize, fromAngle, angleOf, TAU } from '../core/vec2';
import { type RenderList, rect, circle, arc, line, polygon, unitHash } from './render';
import type { ColorToken } from './theme';
import { rotated } from './carArt';
import { Plants } from './mapPlants';
import { MapTheme } from './mapThemes';

/** The centrepiece a map skin puts on the island (`MapTheme.addIsland`). */
const hash = (i: number, salt: number): number => unitHash(i, salt);

export const Centre = {
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
    list.w(circle(c, 27), 'mapForest', 0.55);
    list.w(circle(c, 20), 'seaDeep', 1);
    list.w(circle(c, 17), 'sea', 0.8);
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
    list.w(rect(c, v(52, 38), 6, 0.2), 'skinMocha', 0.7);
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
    list.w(circle(c, r + 9), 'mapSand', 0.6);
    list.w(circle(c, r + 3.5), 'sandLight', 0.9);
    list.w(circle(c, r), 'seaDeep', 1);
    list.w(circle(c, r - 2), 'sea', 0.85);
    list.w(circle(sub(c, mul(toRing, 4)), r * 0.55), 'seaDeep', 0.35);
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
    for (let i = 0; i < 14; i++) list.w(circle(add(c, mul(fromAngle((i / 14) * TAU + hash(i, 481) * 0.3), r + 2)), 4.5 + 3.5 * hash(i, 482)), 'snowShade', 0.6);
    list.w(circle(c, r), 'skinSky', 0.75);
    list.w(circle(c, r * 0.8), 'skinIce', 0.5);
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
    list.w(rect(field, v(42, 36), 3, angleOf(across)), 'skinMocha', 0.6);
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
    list.w(rect(yard, v(26, 16), 2, turn), 'skinCream', 0.75);
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
  /** Beach: a turquoise cove with surf washing up the sand, buoys, a surfboard and a lifeguard tower. */
  cove(list: RenderList, c: Vec2, time: number | null): void {
    const r = MapTheme.pondRadius;
    const t = time ?? 0;
    const toRing = normalize(mul(c, -1));
    const across = left(toRing);
    const surge = time !== null ? 0.5 + 0.5 * Math.sin(t * 0.9) : 0.5;
    list.w(circle(c, r + 12), 'sandDune', 0.3);
    list.w(circle(c, r + 3 + 3 * surge), 'primary', 0.6);
    list.w(circle(c, r + 1), 'sea', 1);
    list.w(circle(c, r * 0.72), 'seaDeep', 0.55);
    list.w(circle(c, r * 0.42), 'seaDeep', 0.55);
    // Swell rolling in towards the shore.
    for (let wave = 0; wave < 3; wave++) {
      const phase = (t * 0.22 + wave / 3) % 1;
      const start = hash(wave, 831) * TAU;
      list.w(arc(c, r * (0.3 + 0.62 * phase), 1.1, start, start + 2.4), 'primary', 0.4 * Math.sin(Math.PI * phase));
    }
    for (let b = 0; b < 5; b++) {
      const at = add(c, add(mul(across, (b - 2) * r * 0.32), mul(toRing, -r * 0.5)));
      list.w(circle(at, 1.5), b % 2 === 0 ? 'juiceRed' : 'primary', 0.95);
    }
    const bob = time !== null ? 0.12 * Math.sin(t * 1.3) : 0;
    const board = add(c, add(mul(across, r * 0.38), mul(toRing, r * 0.05)));
    list.w(rect(add(board, v(1.2, -1.2)), v(15, 4.6), 2.3, angleOf(across) + 0.5 + bob), 'shadow', 0.45);
    list.w(rect(board, v(15, 4.6), 2.3, angleOf(across) + 0.5 + bob), 'skinSunburst', 0.98);
    list.w(rect(board, v(13, 0.9), 0.4, angleOf(across) + 0.5 + bob), 'juiceRed', 0.85);
    // The lifeguard tower on the shore, looking out over the water.
    const tower = add(c, mul(toRing, r + 14));
    const turn = angleOf(toRing);
    list.w(rect(add(tower, v(3, -3)), v(12, 12), 1, turn), 'shadow', 0.7);
    list.w(rect(tower, v(12, 12), 1, turn), 'primary', 0.98);
    list.w(rect(add(tower, mul(toRing, 3)), v(6, 12), 0.6, turn), 'juiceRed', 0.95);
    list.w(line(add(tower, mul(across, 7)), add(tower, mul(across, 13)), 0.6), 'vehicleTire', 0.8);
    list.w(rect(add(tower, mul(across, 12.5)), v(3, 4), 0.3, turn), 'juiceRed', 0.95);
    Plants.parasol(list, add(c, add(mul(toRing, r + 8), mul(across, -r * 0.8))), 6, 5);
  },
  /** Gilded City: a gold obelisk on a marble square, a fountain at each corner. */
  obelisk(list: RenderList, c: Vec2, time: number | null): void {
    const r = MapTheme.pondRadius;
    const t = time ?? 0;
    list.w(rect(c, v(r * 2, r * 2), 4, Math.PI / 4), 'gildedMarble', 0.16);
    list.w(rect(c, v(r * 1.5, r * 1.5), 3, Math.PI / 4), 'mapGilded', 0.12);
    for (let k = 0; k < 4; k++) {
      const at = add(c, mul(fromAngle((k * Math.PI) / 2), r * 0.78));
      list.w(circle(at, 5.5), 'gildedMarble', 0.75);
      list.w(circle(at, 4.2), 'water', 1);
      const phase = (t * 0.7 + k / 4) % 1;
      list.w(arc(at, 1 + 3 * phase, 0.6, 0, TAU), 'primary', 0.45 * (1 - phase));
    }
    // From above the obelisk is four faces meeting at its tip, each lit a little differently.
    const half = 7.5;
    list.w(rect(add(c, v(6, -6)), v(half * 2, half * 2), 1, 0), 'shadow', 0.7);
    const corners = [v(-half, -half), v(half, -half), v(half, half), v(-half, half)].map((p) => add(c, p));
    const faces: ColorToken[] = ['coinInk', 'coin', 'fireCore', 'mapGilded'];
    for (let k = 0; k < 4; k++) list.w(polygon([corners[k], corners[(k + 1) % 4], c]), faces[k], 1);
    const glint = Math.pow(Math.max(0, Math.sin(t * 1.1)), 12);
    list.w(circle(c, 1.2 + 4 * glint), 'primary', 0.3 + 0.7 * glint);
  },
  /** Event Horizon: a black hole, its disc of fire turning round it and a thin ring of light. */
  blackHole(list: RenderList, c: Vec2, time: number | null): void {
    const r = MapTheme.pondRadius;
    const t = time ?? 0;
    list.w(circle(c, r * 1.7), 'horizonViolet', 0.04);
    list.w(circle(c, r * 1.25), 'mapHorizon', 0.06);
    for (let band = 0; band < 4; band++) {
      const spin = t * (0.9 - band * 0.15) + band * 1.3;
      for (let k = 0; k < 3; k++) {
        const from = spin + (k * TAU) / 3;
        list.w(arc(c, r * (0.66 + band * 0.13), 3.2 - band * 0.5, from, from + 1.5), band % 2 === 0 ? 'mapHorizon' : 'fireCore', 0.55 - band * 0.09);
      }
    }
    list.w(circle(c, r * 0.52), 'groundHorizon', 1);
    list.w(arc(c, r * 0.54, 1.1, 0, TAU), 'fireCore', time !== null ? 0.65 + 0.25 * Math.sin(t * 2) : 0.8);
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
