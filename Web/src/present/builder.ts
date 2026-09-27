import { type Career, Careers } from '../core/career';
import { type Config, type RoadModule, modulePrice } from '../core/config';
import { canBuildArm } from '../core/levels';
import { type Vec2, v, add, sub, mul, dist, fromAngle, normalize, right, TAU } from '../core/vec2';
import { type RenderList, type Rect, R, rect, circle, arc, line, text, Ease } from './render';
import type { ColorToken } from './theme';
import { MenuKit } from './menukit';
import { moneyTag } from './icons';
import { S, Fmt } from './strings';
import { BuildLayout, PARTS, partModule, type Part, type Built } from './flow';
import { BuildTab } from './upgrades';
import { measure } from './measure';

type MapGeo = { center: Vec2; radius: number };

export const sameBuilt = (a: Built | null | undefined, b: Built | null | undefined): boolean => !!a && !!b && a.k === b.k && a.slot === b.slot;

/** What the Street Builder shows and animates (`StreetBuilderPage.State`). */
export class BuilderState {
  selected: Part | null = null;
  age = 0;
  dragging: { part: Part; at: Vec2 } | null = null;
  target: number | null = null;
  pending: { part: Part; slot: number } | null = null;
  removing = 0;
  built: { slot: number; age: number } | null = null;
  builtModule: { slot: number; age: number } | null = null;
  moneyBefore: number | null = null;
  denied = 0;
  marked: { part: Built; age: number } | null = null;
  tornDown: { part: Built; module: RoadModule | null; age: number } | null = null;

  advance(delta: number): void {
    const P = StreetBuilderPage;
    this.age += delta;
    if (this.removing > 0) this.removing += delta;
    if (this.denied > 0) {
      this.denied += delta;
      if (this.denied > P.removeDuration * 2) this.denied = 0;
    }
    if (this.built) {
      this.built.age += delta;
      if (this.built.age >= P.buildDuration) {
        this.built = null;
        this.moneyBefore = null;
      }
    }
    if (this.builtModule) {
      this.builtModule.age += delta;
      if (this.builtModule.age >= P.buildDuration) {
        this.builtModule = null;
        if (!this.built) this.moneyBefore = null;
      }
    }
    if (this.marked) {
      this.marked.age += delta;
      if (this.marked.age >= P.markDuration) this.marked = null;
    }
    if (this.tornDown) {
      this.tornDown.age += delta;
      if (this.tornDown.age >= P.tearDuration) this.tornDown = null;
    }
  }
}

const slotAngle = (slot: number, slots: number): number => -Math.PI / 2 + (slot * TAU) / Math.max(3, slots);

/**
 * The Street Builder (`StreetBuilderPage.swift`): the roundabout from above, the parts to buy
 * and what they do. Drag a part onto a free slot, double-tap to build, one tap takes it away;
 * a built part tapped once is marked, a second tap tears it down.
 */
export const StreetBuilderPage = {
  gap: 12,
  backdrop: 0.7,
  cardCorner: 14,
  slotFade: 0.15,
  snapDuration: 0.12,
  buildDuration: 0.5,
  countDuration: 0.4,
  removeDuration: 0.3,
  markDuration: 3,
  tearDuration: 0.45,

  map: (viewport: Vec2, bottomInset: number): MapGeo => BuildLayout.builderMap(viewport, bottomInset),
  /** Screen angles turn the other way, so the player's arm points down here too. */
  direction: (slot: number, slots: number): Vec2 => fromAngle(-slotAngle(slot, slots)),
  slotPosition: (slot: number, slots: number, map: MapGeo): Vec2 => add(map.center, mul(StreetBuilderPage.direction(slot, slots), map.radius + 22)),

  slotAt(point: Vec2, slots: number, map: MapGeo): number | null {
    let best: number | null = null;
    let bestDist = Infinity;
    for (let s = 0; s < slots; s++) {
      const d = dist(StreetBuilderPage.slotPosition(s, slots, map), point);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    return bestDist <= 46 ? best : null;
  },

  cards(viewport: Vec2, bottomInset: number): { part: Part; rect: Rect }[] {
    const g = StreetBuilderPage.gap;
    const width = Math.min(viewport.x - 2 * g, 460);
    const left = (viewport.x - width) / 2;
    const top = viewport.y - bottomInset - BuildLayout.detailHeight - BuildLayout.paletteHeight - g;
    const rows = Math.ceil(PARTS.length / 2);
    const cw = (width - g) / 2;
    const ch = (BuildLayout.paletteHeight - g * (rows - 1)) / rows;
    return PARTS.map((part, i) => {
      const x = left + (i % 2) * (cw + g);
      const y = top + Math.floor(i / 2) * (ch + g);
      return { part, rect: R.make(x, y, x + cw, y + ch) };
    });
  },

  moduleSlotPosition(slot: number, count: number, map: MapGeo): Vec2 {
    const a = (TAU * (slot + 0.5)) / Math.max(1, count);
    return add(map.center, mul(fromAngle(-a), map.radius));
  },

  moduleSlotAt(point: Vec2, count: number, map: MapGeo): number | null {
    let best: number | null = null;
    let bestDist = Infinity;
    for (let s = 0; s < count; s++) {
      const d = dist(StreetBuilderPage.moduleSlotPosition(s, count, map), point);
      if (d < bestDist) {
        bestDist = d;
        best = s;
      }
    }
    return bestDist <= 30 ? best : null;
  },

  targetFor(part: Part, point: Vec2, career: Career, config: Config, map: MapGeo): number | null {
    if (partModule(part)) return StreetBuilderPage.moduleSlotAt(point, config.moduleSlotCount, map);
    const slot = StreetBuilderPage.slotAt(point, config.armSlotCount, map);
    return slot !== null && StreetBuilderPage.canPlace(part, slot, career, config) ? slot : null;
  },

  canPlace(part: Part, slot: number, career: Career, config: Config): boolean {
    if (partModule(part)) return slot >= 0 && slot < config.moduleSlotCount;
    return !career.armSlots.includes(slot) && canBuildArm(config, slot, career.armSlots);
  },

  price(part: Part, career: Career, config: Config): number | null {
    const m = partModule(part);
    return m ? modulePrice(config, m) : Careers.armPrice(career, config);
  },

  cardAt(point: Vec2, viewport: Vec2, bottomInset: number): Part | null {
    return StreetBuilderPage.cards(viewport, bottomInset).find((c) => R.contains(c.rect, point))?.part ?? null;
  },

  builtPartAt(point: Vec2, career: Career, config: Config, map: MapGeo): Built | null {
    const m = StreetBuilderPage.moduleSlotAt(point, config.moduleSlotCount, map);
    if (m !== null && career.modules[m] !== undefined) return { k: 'module', slot: m };
    const s = StreetBuilderPage.slotAt(point, config.armSlotCount, map);
    if (s !== null && s !== 0 && career.armSlots.includes(s)) return { k: 'arm', slot: s };
    return null;
  },

  countedMoney(career: Career, state: BuilderState): number {
    const age = state.built?.age ?? state.builtModule?.age;
    if (state.moneyBefore === null || age === undefined) return career.money;
    return state.moneyBefore + Math.round((career.money - state.moneyBefore) * Ease.outCubic(age / StreetBuilderPage.countDuration));
  },

  // MARK: Drawing

  add(list: RenderList, career: Career, config: Config, state: BuilderState, reduceMotion: boolean, bottomInset: number, thumb: number): void {
    const vp = list.camera.viewport;
    MenuKit.backdrop(list, 'background', StreetBuilderPage.backdrop);
    BuildTab.addChrome(list, 'streetBuilder', thumb, Fmt.number(StreetBuilderPage.countedMoney(career, state)), vp);
    StreetBuilderPage.addMap(list, career, config, state, reduceMotion, bottomInset);
    StreetBuilderPage.cards(vp, bottomInset).forEach((c, i) => StreetBuilderPage.addCard(list, c.part, i, c.rect, career, config, state, reduceMotion));
    StreetBuilderPage.addDetail(list, career, config, state, bottomInset);
    if (state.dragging) StreetBuilderPage.addPartPicture(list, state.dragging.part, state.dragging.at, 1.1, 0.85);
  },

  addMap(list: RenderList, career: Career, config: Config, state: BuilderState, reduceMotion: boolean, bottomInset: number): void {
    const P = StreetBuilderPage;
    const map = P.map(list.camera.viewport, bottomInset);
    const slots = config.armSlotCount;
    const built = career.armSlots;
    let ringWidth = 12;
    if (state.built && !reduceMotion) ringWidth += 6 * (1 - Ease.outCubic(state.built.age / P.buildDuration));
    list.s(arc(map.center, map.radius, ringWidth + 5, 0, TAU), 'kerb');
    list.s(arc(map.center, map.radius, ringWidth, 0, TAU), 'surface');
    list.s(circle(map.center, map.radius - ringWidth / 2), 'island');
    list.s(arc(map.center, map.radius - ringWidth / 2 - 12, 1.5, 0, TAU), 'marking', 0.25);

    const dragging = state.dragging?.part === 'arm';
    const slotOpacity = dragging ? 1 : 0.45;
    for (let slot = 0; slot < slots; slot++) {
      if (built.includes(slot)) continue;
      const free = canBuildArm(config, slot, built);
      if (!free && !dragging) continue;
      const isTarget = state.target === slot;
      if (free) P.addArm(list, slot, slots, map, 'surface', null, slotOpacity * (isTarget ? 1 : 0.55), isTarget ? 1 : 0.55);
      const at = P.slotPosition(slot, slots, map);
      list.s(arc(at, isTarget && !reduceMotion ? 11 : 7, 2, 0, TAU), free ? (isTarget ? 'accent' : 'marking') : 'destructive', free ? slotOpacity : slotOpacity * 0.5);
    }
    for (const slot of built) {
      if (state.built?.slot === slot) continue;
      P.addArm(list, slot, slots, map, 'surface', slot === 0 ? 'accent' : 'marking', 1, 1);
    }
    if (state.built) {
      const grow = reduceMotion ? 1 : Ease.outCubic(state.built.age / P.buildDuration);
      P.addArm(list, state.built.slot, slots, map, 'surface', 'marking', 1, grow);
      const settle = reduceMotion ? 0 : 1 - Ease.outCubic(state.built.age / P.buildDuration);
      if (settle > 0) P.addArm(list, state.built.slot, slots, map, 'accent', null, settle, grow);
    }
    const marked = state.marked;
    if (marked && marked.part.k === 'arm' && built.includes(marked.part.slot)) {
      const slot = marked.part.slot;
      const pulse = reduceMotion ? 0.5 : 0.4 + 0.25 * Math.sin(marked.age * 9);
      P.addArm(list, slot, slots, map, 'destructive', null, pulse * Ease.outCubic(marked.age / 0.15), 1);
      P.addCross(list, add(P.slotPosition(slot, slots, map), mul(P.direction(slot, slots), 14)), marked.age, reduceMotion);
    }
    const torn = state.tornDown;
    if (torn && torn.part.k === 'arm') {
      const x = Ease.clamp01(torn.age / P.tearDuration);
      P.addArm(list, torn.part.slot, slots, map, 'destructive', null, 1 - Ease.outCubic(x), reduceMotion ? 1 : 1 - Ease.inCubic(x));
    }
    P.addModules(list, career, config, state, map, reduceMotion);
    const pending = state.pending;
    if (pending && pending.part === 'arm') {
      let opacity = 0.6;
      let grow = 1;
      if (state.removing > 0) {
        const x = Ease.clamp01(state.removing / P.removeDuration);
        opacity *= 1 - x;
        grow = reduceMotion ? 1 : 1 - 0.3 * x;
      }
      if (state.denied > 0 && !reduceMotion) opacity = 0.6 + 0.25 * Math.sin(state.denied * 40);
      P.addArm(list, pending.slot, slots, map, state.denied > 0 ? 'destructive' : 'accent', null, opacity, grow);
    }
  },

  addModules(list: RenderList, career: Career, config: Config, state: BuilderState, map: MapGeo, reduceMotion: boolean): void {
    const P = StreetBuilderPage;
    const count = config.moduleSlotCount;
    const draggingModule = state.dragging !== null && partModule(state.dragging.part) !== null;
    for (let slot = 0; slot < count; slot++) {
      const at = P.moduleSlotPosition(slot, count, map);
      const module = career.modules[slot];
      if (module) {
        let scale = 1;
        if (state.builtModule?.slot === slot && !reduceMotion) scale += 0.4 * (1 - Ease.outCubic(state.builtModule.age / P.buildDuration));
        P.addModuleIcon(list, module, at, scale, 1);
      }
      if (draggingModule) {
        const isTarget = state.target === slot;
        list.s(arc(at, isTarget && !reduceMotion ? 13 : 10, 2, 0, TAU), isTarget ? 'accent' : module ? 'hazard' : 'marking', isTarget ? 1 : 0.7);
      }
    }
    const marked = state.marked;
    if (marked && marked.part.k === 'module' && career.modules[marked.part.slot]) {
      const at = P.moduleSlotPosition(marked.part.slot, count, map);
      list.s(arc(at, 12, 2.5, 0, TAU), 'destructive', reduceMotion ? 0.8 : 0.6 + 0.3 * Math.sin(marked.age * 9));
      P.addCross(list, add(at, mul(normalize(sub(at, map.center)), 20)), marked.age, reduceMotion);
    }
    const torn = state.tornDown;
    if (torn && torn.part.k === 'module' && torn.module) {
      const x = Ease.clamp01(torn.age / P.tearDuration);
      P.addModuleIcon(list, torn.module, P.moduleSlotPosition(torn.part.slot, count, map), Math.max(0.01, reduceMotion ? 1 : 1 - Ease.inCubic(x)), 1 - Ease.outCubic(x));
    }
    const pending = state.pending;
    const pm = pending ? partModule(pending.part) : null;
    if (pending && pm) {
      let opacity = 0.7;
      if (state.removing > 0) opacity *= 1 - Ease.clamp01(state.removing / P.removeDuration);
      if (state.denied > 0 && !reduceMotion) opacity = 0.6 + 0.25 * Math.sin(state.denied * 40);
      const at = P.moduleSlotPosition(pending.slot, count, map);
      list.s(arc(at, 13, 2.5, 0, TAU), state.denied > 0 ? 'destructive' : 'accent', opacity);
      P.addModuleIcon(list, pm, at, 1, opacity);
    }
  },

  /** The red "tear down" badge: a disc with a cross that springs out. */
  addCross(list: RenderList, center: Vec2, age: number, reduceMotion: boolean): void {
    const scale = reduceMotion ? 1 : Ease.spring(age / 0.35);
    if (scale <= 0.01) return;
    const radius = 9 * scale;
    list.s(circle(center, radius), 'destructive');
    const a = radius * 0.45;
    for (const turn of [v(a, a), v(a, -a)]) list.s(line(sub(center, turn), add(center, turn), 2 * scale), 'primary');
  },

  addModuleIcon(list: RenderList, module: RoadModule, center: Vec2, scale: number, opacity: number): void {
    list.s(circle(center, 8 * scale), 'background', opacity);
    const at = (x: number, y: number): Vec2 => add(center, mul(v(x, y), scale));
    switch (module) {
      case 'tollBooth':
        list.s(line(at(-6, 0), at(6, 0), 2.5 * scale), 'hazard', opacity);
        list.s(rect(at(-6, 0), mul(v(4, 4), scale), 1), 'hazard', opacity);
        break;
      case 'speedCamera':
        list.s(rect(center, mul(v(10, 7), scale), 2), 'marking', opacity);
        list.s(circle(center, 2.2 * scale), 'lightBlue', opacity);
        break;
      case 'towDepot':
        list.s(rect(at(-1.5, 0), mul(v(10, 6), scale), 1.5), 'hazard', opacity);
        list.s(line(at(3, -1), at(7, -5), 1.5 * scale), 'marking', opacity);
        break;
    }
  },

  addArm(list: RenderList, slot: number, slots: number, map: MapGeo, road: ColorToken, mark: ColorToken | null, opacity: number, grow: number): void {
    const dir = StreetBuilderPage.direction(slot, slots);
    const from = add(map.center, mul(dir, map.radius - 5));
    const len = 50 * Math.max(0, Math.min(grow, 1));
    if (len <= 1) return;
    const to = add(from, mul(dir, len));
    list.s(line(from, to, 17), 'kerb', opacity);
    list.s(line(from, to, 12), road, opacity);
    if (grow <= 0.6 || !mark) return;
    const across = mul(right(dir), 5);
    list.s(line(sub(to, across), add(to, across), 2.5), mark, opacity);
  },

  addCard(list: RenderList, part: Part, index: number, r: Rect, career: Career, config: Config, state: BuilderState, reduceMotion: boolean): void {
    const P = StreetBuilderPage;
    const price = P.price(part, career, config);
    const enter = Ease.outCubic((state.age - index * 0.05) / 0.25);
    if (enter <= 0) return;
    let center = R.center(r);
    let size = v(R.width(r), R.height(r));
    if (!reduceMotion) {
      const motion = MenuKit.cardEnter(Ease.settle((state.age - index * 0.05) / 0.45));
      center = add(center, v(0, motion.rise));
      size = mul(size, motion.scale);
    }
    list.s(rect(center, size, P.cardCorner), 'card', enter);
    if (state.selected === part) {
      list.s(rect(center, add(size, v(4, 4)), P.cardCorner + 2), 'accent', 0.55 * enter);
      list.s(rect(center, size, P.cardCorner), 'card', enter);
    }
    const wide = size.x >= 300;
    P.addPartPicture(list, part, v(center.x - size.x / 2 + (wide ? 36 : 28), center.y), 0.85, enter);
    const textLeft = center.x - size.x / 2 + (wide ? 74 : 56);
    list.s(text(S.builder.name(part), v(textLeft, center.y - 12), 16, 'leading', 'bold'), 'primary', enter);
    const priceColor: ColorToken = price !== null && career.money >= price ? 'accent' : 'muted';
    if (price !== null) moneyTag(list, Fmt.number(price), v(textLeft, center.y + 12), 15, 'leading', priceColor, priceColor, enter);
    else list.s(text(S.builder.ringFull, v(textLeft, center.y + 12), 15, 'leading', 'bold'), 'muted', enter);
    if (wide) list.s(text(S.builder.drag, v(center.x + size.x / 2 - 18, center.y), 12, 'trailing'), 'muted', 0.75 * enter);
  },

  addPartPicture(list: RenderList, part: Part, center: Vec2, scale: number, opacity: number): void {
    list.s(arc(center, 16 * scale, 5 * scale, 0, TAU), 'surface', opacity);
    const m = partModule(part);
    if (m) {
      StreetBuilderPage.addModuleIcon(list, m, add(center, mul(v(16, 0), scale)), scale * 1.1, opacity);
      return;
    }
    list.s(arc(center, 16 * scale, 5 * scale, -0.9, 0.9), 'marking', opacity);
    list.s(line(add(center, mul(v(14, 0), scale)), add(center, mul(v(30, 0), scale)), 9 * scale), 'accent', opacity);
  },

  /** One line of help under the palette: what to do here. */
  addDetail(list: RenderList, _career: Career, _config: Config, state: BuilderState, bottomInset: number): void {
    const vp = list.camera.viewport;
    const y = vp.y - bottomInset - BuildLayout.detailHeight / 2 - 2;
    const enter = Ease.outCubic((state.age - 0.1) / 0.25);
    const hint = state.pending ? S.builder.buildHint : S.builder.pickOne;
    const size = Math.max(11, Math.min(13, (13 * (Math.min(vp.x, 460) - 24)) / Math.max(1, measure(hint, 13, false))));
    list.s(text(hint, v(vp.x / 2, y), size, 'center'), state.pending ? 'accent' : 'muted', enter);
  },
};
