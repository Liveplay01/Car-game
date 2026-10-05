import { type Vec2, v, add, sub, mul, left, fromAngle, TAU } from '../core/vec2';
import { type RenderList, rect, circle, arc, line, polygon, unitHash as hash } from './render';
import type { ColorToken } from './theme';

/** The plants, lamps and small things a map skin grows around the ring (`MapTheme`). */
export const Plants = {
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
  flowerBush(list: RenderList, center: Vec2, size: number, index: number, leaves: [ColorToken, ColorToken] = ['mapForest', 'skinFern'], flowers: ColorToken[] = ['mapMeadow', 'primary', 'skinRose']): void {
    list.w(circle(add(center, v(size * 0.3, -size * 0.3)), size * 1.05), 'background', 0.3);
    list.w(circle(center, size), leaves[0], 0.95);
    list.w(circle(add(center, v(-size * 0.25, size * 0.25)), size * 0.6), leaves[1], 0.75);
    for (let f = 0; f < 5; f++) {
      const at = add(center, mul(fromAngle(f * 1.3 + hash(index, 461) * 6), size * (0.3 + 0.45 * hash(index * 5 + f, 462))));
      list.w(circle(at, size * 0.13), flowers[(index + f) % flowers.length], 0.95);
    }
  },
  /** A fir from above: its shadow, a star of dark boughs, lighter tips where the sun lands. */
  fir(list: RenderList, center: Vec2, size: number, index: number): void {
    const turn = hash(index, 471) * TAU;
    list.w(circle(add(center, v(size * 0.5, -size * 0.5)), size * 1.2), 'shadow', 0.8);
    for (let tier = 0; tier < 3; tier++) {
      const reach = size * (1.25 - 0.35 * tier);
      const color: ColorToken = tier === 0 ? 'firDark' : tier === 1 ? 'mapForest' : 'firLight';
      const lift = v(-size * 0.08 * tier, size * 0.08 * tier);
      const points: Vec2[] = [];
      for (let k = 0; k < 16; k++) points.push(add(add(center, lift), mul(fromAngle(turn + tier * 0.2 + (k * TAU) / 16), k % 2 === 0 ? reach : reach * 0.62)));
      list.w(polygon(points), color, 0.97);
    }
    list.w(circle(add(center, v(-size * 0.2, size * 0.2)), size * 0.16), 'grassLight', 0.8);
  },
  /** A sandcastle with four towers, a flag on the keep and a moat dug round it. */
  sandcastle(list: RenderList, center: Vec2, size: number, index: number): void {
    const turn = hash(index, 475) * 0.6;
    list.w(arc(center, size * 1.15, size * 0.28, 0, TAU), 'sandDune', 0.55);
    list.w(rect(add(center, v(size * 0.3, -size * 0.3)), v(size * 1.3, size * 1.3), 2, turn), 'shadow', 0.6);
    list.w(rect(center, v(size * 1.25, size * 1.25), 1.5, turn), 'sandDune', 0.95);
    for (let t = 0; t < 4; t++) {
      const at = add(center, mul(fromAngle(turn + Math.PI / 4 + (t * Math.PI) / 2), size * 0.88));
      list.w(circle(add(at, v(1, -1)), size * 0.34), 'shadow', 0.5);
      list.w(circle(at, size * 0.32), 'mapSand', 0.98);
      list.w(circle(at, size * 0.14), 'sandDune', 0.7);
    }
    list.w(circle(center, size * 0.42), 'sandLight', 0.95);
    list.w(line(center, add(center, mul(fromAngle(turn + 2), size * 0.8)), 0.6), 'vehicleTire', 0.8);
    list.w(rect(add(center, mul(fromAngle(turn + 2), size * 0.7)), v(size * 0.4, size * 0.25), 0.3, turn + 2), index % 2 === 0 ? 'juiceRed' : 'juiceBlue', 0.95);
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
    list.w(circle(add(center, v(size * 0.5, -size * 0.5)), size * 1.2), 'shadow', 0.7);
    for (let f = 0; f < 7; f++) {
      const angle = turn + (f * TAU) / 7;
      const tip = add(center, mul(fromAngle(angle), size * 1.6));
      const mid = add(center, mul(fromAngle(angle), size * 0.8));
      const side = mul(left(fromAngle(angle)), size * 0.28);
      list.w(polygon([center, add(mid, side), tip, sub(mid, side)]), f % 2 === 0 ? 'palmDark' : 'palmLeaf', 0.95);
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
    list.w(rect(add(center, mul(away, size * 1.1)), v(size * 2.2, size * 1.5), size * 0.75, -Math.PI / 4), 'shadow', 0.5);
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
