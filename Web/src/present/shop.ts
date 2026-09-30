import type { Career } from '../core/career';
import { Careers } from '../core/career';
import { Unlocks } from '../core/unlocks';
import type { Config } from '../core/config';
import {
  type ChestKind,
  type ChestOpening,
  type Cosmetic,
  type Rarity,
  CHEST_KINDS,
  COSMETICS,
  isForSale,
  rarityRank,
  isHonour,
} from '../core/loot';
import type { VehicleType } from '../core/vehicle';
import { type Vec2, v, add, sub, mul, fromAngle, TAU } from '../core/vec2';
import { type RenderList, type Rect, RenderList as List, R, rect, circle, arc, line, polygon, text, Ease, Metrics, moved, pinned, unitHash, vlerp, type Align, type Weight } from './render';
import type { ColorToken } from './theme';
import { MenuKit } from './menukit';
import { land } from './hud';
import { textWidth } from './icons';
import { S, Fmt } from './strings';
import { CarArt } from './carArt';
import { Skins, lookFor } from './skins';
import { MapTheme } from './mapThemes';
import { baseConfig } from '../core/config';
import type { ShopSection } from './flow';
import type { CasinoState, CasinoTarget } from './casino';
import { Wallet } from './casinoWallet';
import { casinoKit, loadCasino } from './casinoLoader';
import { ChestReel, type Reel } from './chestReel';

/** Shelves: car skins by rarity, the maps, and everything earned another way or a vehicle. */
export type Shelf = 0 | 1 | 2 | 3 | 4 | 5 | 6; // common rare epic legendary maps special honours
export const SHELVES: Shelf[] = [0, 1, 2, 3, 4, 5, 6];

// Honours (Legendary Shifts, Prestige, the Elite track) have their own shelf, so no shelf grows past 12.

export function shelfItems(shelf: Shelf): Cosmetic[] {
  return COSMETICS.filter((item) => {
    if (shelf === 4) return item.kind === 'mapSkin';
    if (shelf === 6) return isHonour(item);
    if (shelf === 5) return item.kind === 'vehicleType' || (item.source.kind !== 'chest' && !isHonour(item));
    return item.kind === 'carSkin' && item.source.kind === 'chest' && rarityRank(item.rarity) === shelf;
  });
}
export const shelfOf = (item: Cosmetic): Shelf => SHELVES.find((s) => shelfItems(s).some((x) => x.id === item.id)) ?? 5;

export type ShopTarget =
  | { k: 'section'; section: ShopSection }
  | { k: 'shelf'; shelf: Shelf }
  | { k: 'chest'; kind: ChestKind }
  | { k: 'open'; kind: ChestKind }
  | { k: 'buy'; kind: ChestKind }
  | { k: 'watchAd' }
  | { k: 'item'; id: string }
  | { k: 'wear'; id: string }
  | { k: 'dismiss' }
  | { k: 'casino'; t: CasinoTarget };

export const sameTarget = (a: ShopTarget, b: ShopTarget): boolean => JSON.stringify(a) === JSON.stringify(b);

/** What the Shop tab shows and animates (`ShopPage.State`). */
export class ShopState {
  section: ShopSection = 0;
  shelf: Shelf = 0;
  selectedChest: ChestKind = 'standard';
  selectedItem: string | null = null;
  age = 0;
  opening: { opening: ChestOpening; age: number; reel: Reel } | null = null;
  denied = 0;
  ad: number | null = null;
  /** The money as the casino shows it: the header and badges read it before the casino loads. */
  readonly wallet = new Wallet();
  private casinoState: CasinoState | null = null;
  sectionSlide: { from: ShopSection; age: number } | null = null;
  shelfSlide: { from: Shelf; age: number } | null = null;
  pressed: { target: ShopTarget; age: number } | null = null;

  /** The casino's state, once the casino has loaded (`casinoLoader.ts`); null before. */
  get casino(): CasinoState | null {
    if (!this.casinoState) {
      const kit = casinoKit();
      if (kit) this.casinoState = new kit.CasinoState(this.wallet);
    }
    return this.casinoState;
  }

  select(next: ShopSection): void {
    if (next === this.section) return;
    this.sectionSlide = { from: this.section, age: 0 };
    this.section = next;
  }

  selectShelf(next: Shelf): void {
    if (next === this.shelf) return;
    this.shelfSlide = { from: this.shelf, age: 0 };
    this.shelf = next;
  }

  advance(delta: number): void {
    this.age += delta;
    if (this.opening) this.opening.age += delta;
    if (this.ad !== null) this.ad += delta;
    if (this.sectionSlide) {
      this.sectionSlide.age += delta;
      if (this.sectionSlide.age >= ShopPage.slideDuration) this.sectionSlide = null;
    }
    if (this.shelfSlide) {
      this.shelfSlide.age += delta;
      if (this.shelfSlide.age >= ShopPage.slideDuration) this.shelfSlide = null;
    }
    if (this.pressed) {
      this.pressed.age += delta;
      if (this.pressed.age >= ShopPage.pressDuration) this.pressed = null;
    }
    if (this.denied > 0) {
      this.denied += delta;
      if (this.denied > 0.4) this.denied = 0;
    }
  }
}

interface Layout {
  segments: [ShopSection, Rect][];
  content: Rect;
  detail: Rect;
}

export const JUICE: ColorToken[] = ['juiceRed', 'juiceOrange', 'juiceYellow', 'juiceGreen', 'juiceBlue', 'juicePurple'];
const unit = (index: number, salt: number): number => unitHash(index, salt + 101);

function t(list: RenderList, s: string, at: Vec2, size: number, color: ColorToken, o: { weight?: Weight; align?: Align; opacity?: number } = {}): void {
  list.s(text(s, at, size, o.align ?? 'leading', o.weight ?? 'regular'), color, o.opacity ?? 1);
}

/**
 * The Shop tab: chests to open or buy, the collection to wear from, and
 * the casino (`present/casino.ts`). Fair: odds and pity always on screen. The chest opening
 * and the casino's wins are the places that are allowed to be loud.
 */
export const ShopPage = {
  gap: 12,
  corner: 14,
  /** The details live in a sheet (`ui/detailSheet.ts`); the page keeps only a margin at the bottom. */
  detailHeight: 0,
  segmentHeight: 32,
  shelfHeight: 36,
  pressDuration: 0.28,
  pressDepth: 0.04,
  slideDuration: 0.45,
  slideOut: 0.2,
  adDuration: 3,
  /**
   * When the chest bursts: a Common or Rare opens after a short wobble; an Epic or Legendary
   * charges up first, so you feel something big is inside before the reel runs.
   */
  burstTime: (opening: ChestOpening): number => (rarityRank(opening.item.rarity) >= 2 ? 1.4 : 0.45),
  /** The stages of one opening, in seconds from its start: burst, reel at rest, prize card. */
  stages(opening: ChestOpening, reel: Reel): { burst: number; landed: number; reveal: number } {
    const burst = ShopPage.burstTime(opening);
    return { burst, landed: burst + ChestReel.spin, reveal: burst + ChestReel.duration(reel) };
  },
  /** The prize stays at least this long before a tap can close it. */
  closeAfter: 0.5,
  confettiCount: 32,

  pressedRect(r: Rect, target: ShopTarget, state: ShopState): Rect {
    const p = state.pressed;
    if (!p || !sameTarget(p.target, target)) return r;
    const scale = 1 - ShopPage.pressDepth * (1 - Ease.settle(p.age / ShopPage.pressDuration));
    const inset = mul(v(R.width(r), R.height(r)), (1 - scale) / 2);
    return R.inset(r, inset.x, inset.y);
  },

  layout(viewport: Vec2, bottomInset: number): Layout {
    const P = ShopPage;
    const width = Math.min(viewport.x - 2 * P.gap, 460);
    const left = (viewport.x - width) / 2;
    const top = Metrics.sceneInsets.top + 22;
    const sw = width / 3;
    const segments = ([0, 1, 2] as ShopSection[]).map((s, i): [ShopSection, Rect] => [s, R.make(left + i * sw, top, left + (i + 1) * sw, top + P.segmentHeight)]);
    const detailTop = viewport.y - bottomInset - P.detailHeight;
    return {
      segments,
      content: R.make(left, top + P.segmentHeight + P.gap, left + width, detailTop - P.gap),
      detail: R.make(left, detailTop, left + width, detailTop + P.detailHeight - 8),
    };
  },

  grid(count: number, columns: number, area: Rect, maxHeight: number): Rect[] {
    const gap = ShopPage.gap;
    const rows = Math.max(1, Math.ceil(count / columns));
    const cw = (R.width(area) - gap * (columns - 1)) / columns;
    const ch = Math.min(maxHeight, (R.height(area) - gap * (rows - 1)) / rows);
    return Array.from({ length: count }, (_, i) => {
      const x = area.minX + (i % columns) * (cw + gap);
      const y = area.minY + Math.floor(i / columns) * (ch + gap);
      return R.make(x, y, x + cw, y + ch);
    });
  },

  chestCards: (l: Layout): [ChestKind, Rect][] => {
    const cells = ShopPage.grid(CHEST_KINDS.length, 2, l.content, 188);
    return CHEST_KINDS.map((k, i) => [k, cells[i]]);
  },

  shelfChips(l: Layout): [Shelf, Rect][] {
    const area = l.content;
    const gap = 6;
    const w = (R.width(area) - gap * (SHELVES.length - 1)) / SHELVES.length;
    return SHELVES.map((s, i) => [s, R.make(area.minX + i * (w + gap), area.minY, area.minX + i * (w + gap) + w, area.minY + ShopPage.shelfHeight)]);
  },

  itemCells(l: Layout, shelf: Shelf): [Cosmetic, Rect][] {
    const items = shelfItems(shelf);
    const area = { ...l.content, minY: l.content.minY + ShopPage.shelfHeight + ShopPage.gap };
    const cells = ShopPage.grid(Math.max(items.length, 12), 4, area, 118);
    return items.map((item, i) => [item, cells[i]]);
  },

  targets(viewport: Vec2, bottomInset: number, career: Career, state: ShopState): [ShopTarget, Rect][] {
    if (state.opening) return [[{ k: 'dismiss' }, R.make(0, 0, viewport.x, viewport.y)]];
    if (state.ad !== null) return [];
    const l = ShopPage.layout(viewport, bottomInset);
    const out: [ShopTarget, Rect][] = l.segments.map(([section, r]) => [{ k: 'section', section }, r]);
    if (state.section === 0) out.push(...ShopPage.chestCards(l).map(([kind, r]): [ShopTarget, Rect] => [{ k: 'chest', kind }, r]));
    else if (state.section === 1) {
      out.push(...ShopPage.shelfChips(l).map(([shelf, r]): [ShopTarget, Rect] => [{ k: 'shelf', shelf }, r]));
      out.push(...ShopPage.itemCells(l, state.shelf).map(([item, r]): [ShopTarget, Rect] => [{ k: 'item', id: item.id }, r]));
    } else {
      const kit = casinoKit();
      const casino = state.casino;
      if (kit && casino) out.push(...kit.CasinoPage.targets(l.content, career, casino).map(([t, r]): [ShopTarget, Rect] => [{ k: 'casino', t }, r]));
    }
    return out;
  },

  targetAt(point: Vec2, viewport: Vec2, bottomInset: number, career: Career, state: ShopState): ShopTarget | null {
    return ShopPage.targets(viewport, bottomInset, career, state).find(([, r]) => R.contains(r, point))?.[0] ?? null;
  },

  // MARK: Drawing

  add(list: RenderList, career: Career, config: Config, today: number, state: ShopState, reduceMotion: boolean, bottomInset: number): void {
    const vp = list.camera.viewport;
    MenuKit.backdrop(list);
    // The casino holds back what a round has not shown yet, and counts a win up as it lands.
    const wallet = state.wallet;
    MenuKit.header(list, S.tabs.shop, Fmt.number(wallet.money(career.money)), vp, reduceMotion ? 1 : land(wallet.sinceLanded / 0.35, 0.14));
    const l = ShopPage.layout(vp, bottomInset);
    ShopPage.addSegments(list, l, state, career);
    const start = list.items.length;
    ShopPage.addSection(list, l, career, config, today, state, state.section, reduceMotion);
    const slide = state.sectionSlide;
    if (slide) {
      const side = state.section > slide.from ? 1 : -1;
      const spring = reduceMotion ? 1 : Ease.settle(slide.age / ShopPage.slideDuration);
      const shift = v(side * R.width(l.content) * 0.45 * (1 - spring), 0);
      const fade = Ease.outCubic(slide.age / 0.18);
      for (let i = start; i < list.items.length; i++) list.items[i] = moved(list.items[i], shift, fade);
      const gone = Ease.outCubic(slide.age / ShopPage.slideOut);
      if (gone < 1) {
        const old = new List(list.camera, list.background);
        const shelfSlide = state.shelfSlide;
        state.shelfSlide = null;
        ShopPage.addSection(old, l, career, config, today, state, slide.from, reduceMotion, 1);
        state.shelfSlide = shelfSlide;
        const away = v(reduceMotion ? 0 : -side * R.width(l.content) * 0.3 * gone, 0);
        list.items.splice(start, 0, ...old.items.map((i) => moved(i, away, 1 - gone)));
      }
    }
    if (state.ad !== null) ShopPage.addAd(list, state.ad);
    if (state.opening) ShopPage.addReveal(list, state.opening.opening, state.opening.reel, state.opening.age, reduceMotion);
  },

  addSection(list: RenderList, l: Layout, career: Career, _config: Config, today: number, state: ShopState, section: ShopSection, reduceMotion: boolean, forcedEnter: number | null = null): void {
    if (section === 0) ShopPage.addChests(list, l, career, state, reduceMotion, forcedEnter);
    else if (section === 1) ShopPage.addCollection(list, l, career, state, reduceMotion ? 1 : (forcedEnter ?? Ease.outCubic(state.age / 0.25)), reduceMotion);
    else {
      const kit = casinoKit();
      const casino = state.casino;
      if (kit && casino) kit.CasinoPage.add(list, l.content, career, today, casino, reduceMotion, forcedEnter === null ? state.age : 10);
      else loadCasino().catch(() => undefined);
    }
  },

  fitted(s: string, size: number, width: number): number {
    const natural = textWidth(s, size);
    return natural <= width ? size : Math.max(9, (size * width) / natural);
  },

  panel(list: RenderList, r: Rect, color: ColorToken = 'card', opacity = 1): void {
    list.s(rect(R.center(r), v(R.width(r), R.height(r)), ShopPage.corner), color, opacity);
  },

  addSegments(list: RenderList, l: Layout, state: ShopState, career: Career): void {
    const all = R.make(l.segments[0][1].minX, l.segments[0][1].minY, l.segments[2][1].maxX, l.segments[0][1].maxY);
    const labels = l.segments.map(([s]) => (s === 0 && career.chests.length > 0 ? `${S.shop.section(s)} · ${career.chests.length}` : S.shop.section(s)));
    const chosen = state.section;
    let thumb: number = chosen;
    if (state.sectionSlide) {
      thumb = state.sectionSlide.from + (chosen - state.sectionSlide.from) * Ease.settle(state.sectionSlide.age / ShopPage.slideDuration);
      thumb = Math.min(Math.max(thumb, 0), 2);
    }
    MenuKit.segmented(list, labels, chosen, thumb, all, l.segments.map(([s]) => s === 2 && !Unlocks.isOpen(career, 'casino')));
    if (state.wallet.unseen(career.unseen).length > 0) {
      const r = l.segments[1][1];
      ShopPage.badgeDot(list, v(R.center(r).x + textWidth(S.shop.section(1), 13) / 2 + 8, R.center(r).y), 1);
    }
  },

  badgeDot(list: RenderList, center: Vec2, opacity: number): void {
    list.s(circle(center, 3.5), 'accent', opacity);
  },

  cardRect(card: Rect, age: number, index: number, reduceMotion: boolean): { rect: Rect; enter: number } {
    const enter = reduceMotion ? 1 : MenuKit.stagger(age, index);
    const motion = reduceMotion ? { rise: 0, scale: 1 } : MenuKit.cardEnter(MenuKit.staggerSpring(age, index));
    const inset = mul(v(R.width(card), R.height(card)), (1 - motion.scale) / 2);
    return { rect: R.offset(R.inset(card, inset.x, inset.y), v(0, motion.rise)), enter };
  },

  // MARK: Chests

  addChests(list: RenderList, l: Layout, career: Career, state: ShopState, reduceMotion: boolean, forcedEnter: number | null): void {
    ShopPage.chestCards(l).forEach(([kind, card], index) => {
      const placed = ShopPage.cardRect(card, forcedEnter === null ? state.age : 10, index, reduceMotion);
      const enter = placed.enter;
      const r = ShopPage.pressedRect(placed.rect, { k: 'chest', kind }, state);
      const count = Careers.count(career, kind);
      const c = R.center(r);
      if (kind === state.selectedChest) list.s(rect(c, v(R.width(r) + 4, R.height(r) + 4), ShopPage.corner + 2), 'accent', 0.55 * enter);
      ShopPage.panel(list, r, 'card', enter);
      const iconAt = v(c.x, r.minY + R.height(r) * 0.36);
      const available = count > 0 || isForSale(kind);
      MenuKit.glow(list, iconAt, Math.min(Math.min(R.width(r), R.height(r)) * 0.42, iconAt.y - r.minY - 4), ShopPage.chestColor(kind), (count > 0 ? 0.5 : 0.25) * enter * (available ? 1 : 0.4));
      ShopPage.addChestIcon(list, kind, iconAt, Math.min(1.2, R.height(r) / 130), enter * (available ? 1 : 0.45));
      const name = S.shop.chest(kind);
      t(list, name, v(c.x, r.maxY - 36), ShopPage.fitted(name, 14, R.width(r) - 28), 'primary', { weight: 'bold', align: 'center', opacity: enter });
      const status = count > 0 ? S.shop.waiting(count) : S.shop.source(kind);
      t(list, status, v(c.x, r.maxY - 17), ShopPage.fitted(status, 11, R.width(r) - 28), count > 0 ? 'accent' : 'muted', { align: 'center', opacity: enter });
      if (count > 0) {
        const badge = v(r.maxX - 18, r.minY + 18);
        list.s(circle(badge, 10), 'accent', enter);
        t(list, String(count), badge, 11, 'accentInk', { weight: 'bold', align: 'center', opacity: enter });
      }
    });
  },

  /** A chest's paint: body, lid and the metal of its bands (the earlier web UI's chests). */
  chestPaint(kind: ChestKind): { body: ColorToken; lid: ColorToken; band: ColorToken } {
    switch (kind) {
      case 'standard':
        return { body: 'chestStdBody', lid: 'chestStdLid', band: 'chestStdBand' };
      case 'premium':
        return { body: 'chestPremBody', lid: 'chestPremLid', band: 'coin' };
      case 'criminalHunt':
        return { body: 'chestHuntBody', lid: 'chestHuntLid', band: 'rarityEpic' };
      case 'event':
        return { body: 'chestEventBody', lid: 'chestEventLid', band: 'accent' };
    }
  },

  /**
   * A chest: a body, a rounded lid, two metal bands over both, a band round the seam and a
   * lock plate with its keyhole. `squash` stretches it round its bottom edge (the jelly of
   * the opening), `lidLift` lifts the lid off the seam.
   */
  addChestIcon(list: RenderList, kind: ChestKind, center: Vec2, scale: number, opacity: number, squash: Vec2 = v(1, 1), lidLift = 0): void {
    const c = ShopPage.chestPaint(kind);
    const u = scale * 1.05;
    const base = add(center, v(0, 23 * u * (1 - squash.y)));
    const at = (x: number, y: number): Vec2 => add(base, mul(v(x * squash.x, y * squash.y), u));
    const size = (w: number, h: number): Vec2 => mul(v(w * squash.x, h * squash.y), u);
    const lift = -lidLift;
    list.s(rect(at(0, 26), size(46, 5), 2.5 * u), 'shadow', 0.45 * opacity);
    // Body.
    list.s(rect(at(0, 9), size(52, 28), 5 * u), c.body, opacity);
    list.s(rect(at(0, 3), size(44, 2), 1 * u), 'primary', 0.06 * opacity);
    for (const x of [-15.5, 15.5]) list.s(rect(at(x, 9), size(5, 28), 0), c.band, 0.75 * opacity);
    // Lid: rounded on top, square where it meets the body.
    list.s(rect(at(0, -14 + lift), size(52, 18), 10 * u), c.lid, opacity);
    list.s(rect(at(0, -8 + lift), size(52, 6), 0), c.lid, opacity);
    for (const x of [-15.5, 15.5]) list.s(rect(at(x, -14 + lift), size(5, 18), 0), c.band, 0.75 * opacity);
    // The band round the seam and the lock.
    list.s(rect(at(0, -2.5 + lift * 0.5), size(52, 5), 0), c.band, 0.9 * opacity);
    list.s(rect(at(0, -3 + lift * 0.5), size(10, 12), 2.5 * u), c.band, opacity);
    list.s(circle(at(0, -3 + lift * 0.5), 2 * u * Math.min(squash.x, squash.y)), c.body, opacity);
  },

  // MARK: Collection

  addCollection(list: RenderList, l: Layout, career: Career, state: ShopState, enter: number, reduceMotion: boolean): void {
    const chips = ShopPage.shelfChips(l);
    const slide = state.shelfSlide;
    const glide = slide ? (reduceMotion ? 1 : Ease.settle(slide.age / ShopPage.slideDuration)) : 1;
    for (const [shelf, chip] of chips) {
      const r = ShopPage.pressedRect(chip, { k: 'shelf', shelf }, state);
      list.s(rect(R.center(r), v(R.width(r), R.height(r)), 10), 'controlFill', enter);
    }
    const to = chips.find(([s]) => s === state.shelf)?.[1];
    if (to) {
      const target = ShopPage.pressedRect(to, { k: 'shelf', shelf: state.shelf }, state);
      const from = (slide && chips.find(([s]) => s === slide.from)?.[1]) || target;
      const center = vlerp(R.center(from), R.center(target), glide);
      const size = vlerp(v(R.width(from), R.height(from)), v(R.width(target), R.height(target)), glide);
      // The chosen shelf is a white chip, like the earlier web UI; it glides to the next one.
      list.s(rect(center, size, 10), 'primary', enter);
    }
    for (const [shelf, chip] of chips) {
      const r = ShopPage.pressedRect(chip, { k: 'shelf', shelf }, state);
      const c = R.center(r);
      const items = shelfItems(shelf);
      const owned = items.filter((i) => Careers.owns(career, i.id)).length;
      // On the chip's corner, like a badge: inside it would sit on the label.
      if (items.some((i) => state.wallet.unseen(career.unseen).includes(i.id))) ShopPage.badgeDot(list, v(r.maxX - 3, r.minY + 3), enter);
      // Over the white chip the labels turn dark as it arrives.
      const on = shelf === state.shelf ? glide : slide && shelf === slide.from ? 1 - glide : 0;
      const label = ShopPage.fitted(S.shop.shelf(shelf), 11, R.width(r) - 14);
      t(list, S.shop.shelf(shelf), v(c.x, c.y - 7), label, 'muted', { weight: 'bold', align: 'center', opacity: enter * (1 - on) });
      t(list, `${owned}/${items.length}`, v(c.x, c.y + 8), 10, owned === items.length ? ShopPage.shelfColor(shelf) : 'muted', { align: 'center', opacity: enter * (1 - on) });
      if (on > 0) {
        t(list, S.shop.shelf(shelf), v(c.x, c.y - 7), label, 'background', { weight: 'bold', align: 'center', opacity: enter * on });
        t(list, `${owned}/${items.length}`, v(c.x, c.y + 8), 10, 'background', { align: 'center', opacity: 0.6 * enter * on });
      }
    }
    const start = list.items.length;
    ShopPage.addShelfItems(list, state.shelf, l, career, state, enter);
    if (!slide) return;
    const side = state.shelf > slide.from ? 1 : -1;
    const shift = v(reduceMotion ? 0 : side * R.width(l.content) * 0.35 * (1 - glide), 0);
    const fade = Ease.outCubic(slide.age / 0.18);
    for (let i = start; i < list.items.length; i++) list.items[i] = moved(list.items[i], shift, fade);
    const gone = Ease.outCubic(slide.age / ShopPage.slideOut);
    if (gone >= 1) return;
    const old = new List(list.camera, list.background);
    ShopPage.addShelfItems(old, slide.from, l, career, state, enter);
    const away = v(reduceMotion ? 0 : -side * R.width(l.content) * 0.25 * gone, 0);
    list.items.splice(start, 0, ...old.items.map((i) => moved(i, away, 1 - gone)));
  },

  addShelfItems(list: RenderList, shelf: Shelf, l: Layout, career: Career, state: ShopState, enter: number): void {
    for (const [item, cell] of ShopPage.itemCells(l, shelf)) {
      const r = ShopPage.pressedRect(cell, { k: 'item', id: item.id }, state);
      const c = R.center(r);
      const owned = Careers.owns(career, item.id);
      const opacity = enter * (owned ? 1 : 0.4);
      const selected = state.selectedItem === item.id;
      list.s(rect(c, v(R.width(r) + 3, R.height(r) + 3), ShopPage.corner + 1.5), selected ? 'accent' : ShopPage.rarityColor(item.rarity), (selected ? 0.9 : 0.55) * opacity);
      ShopPage.panel(list, r, 'card', enter);
      ShopPage.addPreview(list, item, v(c.x, r.minY + R.height(r) * 0.4), Math.min(1, R.height(r) / 110), opacity);
      const name = owned ? S.shop.item(item.id) : S.shop.locked;
      t(list, name, v(c.x, r.maxY - 14), ShopPage.fitted(name, 11, R.width(r) - 12), owned ? 'primary' : 'muted', { weight: 'bold', align: 'center', opacity: enter });
      if (Careers.isWorn(career, item.id)) t(list, S.shop.worn, v(r.maxX - 10, r.minY + 12), 10, 'accent', { weight: 'bold', align: 'trailing', opacity: enter });
      if (career.unseen.includes(item.id)) {
        const at = v(r.minX + 22, r.minY + 12);
        list.s(rect(at, v(30, 15), 7.5), 'accent', enter);
        t(list, S.shop.newBadge, at, 9, 'accentInk', { weight: 'bold', align: 'center', opacity: enter });
      }
    }
  },

  shelfColor: (s: Shelf): ColorToken => (['rarityCommon', 'rarityRare', 'rarityEpic', 'rarityLegendary', 'mapAurora', 'accent', 'coin'] as ColorToken[])[s],
  rarityColor: (r: Rarity): ColorToken => ({ common: 'rarityCommon', rare: 'rarityRare', epic: 'rarityEpic', legendary: 'rarityLegendary' } as const)[r],
  chestColor: (k: ChestKind): ColorToken => ({ standard: 'rarityCommon', premium: 'coin', event: 'accent', criminalHunt: 'rarityEpic' } as const)[k],

  /**
   * A map as a little diorama, so the maps tell apart at a glance: a disc of its ground, the
   * roundabout with its tinted island, and four of its own plants round it, drawn with the
   * game's own art (cherry trees, cacti, palms, containers, mushrooms …).
   */
  addMapPreview(list: RenderList, id: string, center: Vec2, scale: number, opacity: number): void {
    const theme = MapTheme.from(id);
    const tint = Skins.color(id) ?? 'island';
    // 60 world units across the disc's radius; the disc is 30 points at scale 1.
    const preview = new List({ viewport: list.camera.viewport, center: v(0, 0), focus: center, scale: (30 * scale) / 60 }, list.background);
    preview.w(circle(v(2.5, -2.5), 61), 'shadow', 0.8);
    preview.w(circle(v(0, 0), 60), MapTheme.ground(theme));
    MapTheme.addBadge(preview, theme);
    preview.w(arc(v(0, 0), 27, 9, 0, TAU), 'surface');
    preview.w(circle(v(0, 0), 22.5), 'island');
    preview.w(circle(v(0, 0), 22.5), tint, 0.45);
    preview.w(arc(v(0, 0), 18, 2, 0, TAU), tint);
    // Four plants, clear of the badge's pond, field or sea (which lie towards 1.4 rad).
    [0.2, 2.6, 3.9, 5.2].forEach((angle, i) => MapTheme.addPlant(preview, theme, mul(fromAngle(angle), 44), 8.5, 3 + i * 7));
    preview.w(arc(v(0, 0), 59.5, 1, 0, TAU), 'primary', 0.12);
    for (const it of preview.items) list.items.push(pinned(it, preview.camera, opacity));
  },

  /** A car in the skin's paint, a map as a little diorama, or the vehicle type itself. */
  addPreview(list: RenderList, item: Cosmetic, center: Vec2, scale: number, opacity: number): void {
    if (item.kind === 'mapSkin') return ShopPage.addMapPreview(list, item.id, center, scale, opacity);
    // The car itself, drawn with the game's own art and turned a little, like the earlier
    // web UI's thumbnails: the shop shows exactly what drives.
    const type: VehicleType = item.kind === 'vehicleType' ? (item.id as VehicleType) : 'car';
    const look = item.kind === 'carSkin' ? lookFor(7, [item.id]) : null;
    const preview = new List({ viewport: list.camera.viewport, center: v(0, 0), focus: center, scale: (46 * scale) / baseConfig.carLength }, list.background);
    CarArt.add(
      preview,
      {
        id: 7,
        type,
        pose: { position: v(0, 0), heading: Math.PI / 2 - 0.35 },
        dents: [],
        skin: look?.paint ?? null,
        stripe: look?.stripe ?? null,
        roof: look?.roof ?? null,
        finish: look?.finish ?? null,
        finishTime: null,
      },
      baseConfig,
    );
    for (const it of preview.items) list.items.push(pinned(it, preview.camera, opacity));
  },

  // MARK: Detail panel

  buttonStyle(target: ShopTarget, career: Career, config: Config, _today: number): { label: string; enabled: boolean; prominent: boolean } {
    const price = (k: ChestKind): number | null => (k === 'standard' ? config.standardChestPrice : k === 'premium' ? config.premiumChestPrice : null);
    switch (target.k) {
      case 'open':
        return { label: S.shop.open, enabled: Careers.count(career, target.kind) > 0, prominent: true };
      case 'buy': {
        const p = price(target.kind);
        return { label: S.shop.buy(Fmt.number(p ?? 0)), enabled: p !== null && career.money >= p, prominent: false };
      }
      case 'watchAd':
        return { label: S.shop.watchAdShort, enabled: true, prominent: false };
      case 'wear':
        return { label: Careers.isWorn(career, target.id) ? S.shop.takeOff : S.shop.wear, enabled: true, prominent: true };
      default:
        return { label: '', enabled: false, prominent: false };
    }
  },

  // MARK: Ad placeholder

  addAd(list: RenderList, age: number): void {
    const vp = list.camera.viewport;
    const c = mul(vp, 0.5);
    list.s(rect(c, vp), 'background', 0.96);
    const left = Math.max(0, Math.ceil(ShopPage.adDuration - age));
    t(list, S.shop.adPlaceholder, sub(c, v(0, 16)), 18, 'primary', { weight: 'bold', align: 'center' });
    t(list, S.shop.adCountdown(left), add(c, v(0, 14)), 13, 'muted', { align: 'center' });
    const progress = Math.min(1, age / ShopPage.adDuration);
    list.s(rect(add(c, v(-90 + 90 * progress, 44)), v(180 * progress, 4), 2), 'accent');
  },

  // MARK: Reveal

  /**
   * The juicy chest opening: the chest springs in, wobbles like a jelly, shakes harder and
   * ducks before it bursts; then flash, lid off, shockwaves, fruit splashes, juice drops,
   * confetti, rays and a jelly card. A pure function of the age, so it never stutters.
   */
  addReveal(list: RenderList, opening: ChestOpening, reel: Reel, age: number, reduceMotion: boolean): void {
    const vp = list.camera.viewport;
    const center = sub(mul(vp, 0.5), v(0, 20));
    const rarity = opening.item.rarity;
    const color = ShopPage.rarityColor(rarity);
    const power = { common: 0.6, rare: 0.8, epic: 1.1, legendary: 1.5 }[rarity];
    list.s(rect(mul(vp, 0.5), vp), 'background', 0.92 * Math.min(1, age / 0.25));
    if (reduceMotion) {
      ShopPage.addRevealCard(list, opening, center, 10, color, true);
      const fade = 1 - Math.min(1, age / 0.3);
      if (fade > 0) list.s(rect(mul(vp, 0.5), vp), 'background', fade);
      return;
    }
    const stage = ShopPage.stages(opening, reel);
    if (age < stage.burst) {
      ShopPage.addBuildUp(list, opening.chest, age, center, color, stage.burst, rarityRank(rarity) >= 2);
      return;
    }
    // The chest bursts open and the reel runs out of it; the lid flies off over it.
    if (age < stage.reveal) {
      const spun = age - stage.burst;
      ChestReel.add(
        list,
        reel,
        center,
        spun,
        (item) => ShopPage.rarityColor(item.rarity),
        (item, at, scale, opacity) => ShopPage.addPreview(list, item, at, scale, opacity),
      );
      if (spun < 0.8) {
        const x = spun / 0.8;
        list.s(rect(add(center, v(80 * x, -40 - 300 * x + 420 * x * x)), v(55, 19), 9, 6 * x), ShopPage.chestPaint(opening.chest).lid, 1 - x);
      }
      if (spun < 0.18) list.s(rect(mul(vp, 0.5), vp), 'primary', 0.5 * (1 - spun / 0.18));
      return;
    }
    const tt = age - stage.reveal;
    ShopPage.addRays(list, center, tt, power, color, rarityRank(rarity) >= 2, rarity === 'legendary');

    if (tt < 0.9) {
      const count = Math.floor(8 + 6 * power);
      const grow = Ease.spring(tt / 0.3);
      const shrink = 1 - Ease.outCubic(Math.max(0, (tt - 0.3) / 0.6));
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU + (unit(i, 11) - 0.5) * 0.5;
        const reach = (110 + 90 * unit(i, 12)) * Ease.outCubic(Math.min(1, tt / 0.35));
        const at = add(center, mul(fromAngle(a), reach));
        const radius = (12 + 12 * unit(i, 13)) * Math.sqrt(power) * grow * shrink;
        if (radius <= 0.5) continue;
        const tint = JUICE[i % JUICE.length];
        list.s(circle(at, radius), tint, 0.95);
        list.s(circle(add(at, v(-radius * 0.35, -radius * 0.35)), radius * 0.3), 'primary', 0.45 * shrink);
        list.s(circle(add(at, mul(fromAngle(a), radius + 10)), radius * 0.35), tint, 0.9);
      }
    }

    // Screen space is y-down; the drop paths are written in the same space.
    const dropLife = 1.4;
    if (tt < dropLife) {
      for (let i = 0; i < Math.floor(36 * power); i++) {
        const a = -Math.PI / 2 + (unit(i, 14) - 0.5) * 3.4;
        const speed = 240 + 360 * unit(i, 15);
        const at = v(center.x + Math.cos(a) * speed * tt, center.y + Math.sin(a) * speed * tt + 600 * tt * tt);
        const fade = 1 - Math.max(0, (tt - dropLife * 0.55) / (dropLife * 0.45));
        list.s(circle(at, 2.5 + 4.5 * unit(i, 16)), JUICE[i % JUICE.length], fade);
      }
    }

    ShopPage.addConfetti(list, center, tt, power, color, rarity === 'legendary');

    ShopPage.addRevealCard(list, opening, center, tt, color, false);

    if (tt < 0.3) {
      const white = Math.max(0, 1 - tt / 0.12);
      if (white > 0) list.s(rect(mul(vp, 0.5), vp), 'primary', 0.85 * white);
      list.s(rect(mul(vp, 0.5), vp), color, 0.25 * (1 - tt / 0.3));
    }
  },

  /** Light, turning rays and shockwaves from `center`, `tt` seconds after a burst (a chest, a big win). */
  addRays(list: RenderList, center: Vec2, tt: number, power: number, color: ColorToken, epicPlus: boolean, legendary: boolean): void {
    const rayFade = Math.min(1, tt / 0.3);
    const breathe = 1 + 0.06 * Math.sin(tt * 3.2);
    MenuKit.glow(list, center, (170 + 60 * power) * breathe * Ease.outCubic(Math.min(1, tt / 0.4)), color, 0.3 * rayFade);

    const rayCount = epicPlus ? 14 : 10;
    const rayLength = (200 + 90 * power) * Ease.outCubic(Math.min(1, tt / 0.5));
    for (let i = 0; i < rayCount; i++) {
      const a = (i / rayCount) * TAU + tt * 0.5;
      const half = 0.08 * power;
      list.s(polygon([center, add(center, mul(fromAngle(a - half), rayLength)), add(center, mul(fromAngle(a + half), rayLength))]), JUICE[i % JUICE.length], 0.2 * rayFade);
    }
    for (let i = 0; i < rayCount; i++) {
      const a = ((i + 0.5) / rayCount) * TAU - tt * 0.3;
      list.s(polygon([center, add(center, mul(fromAngle(a - 0.025), rayLength * 1.1)), add(center, mul(fromAngle(a + 0.025), rayLength * 1.1))]), color, 0.22 * rayFade);
    }

    const waves: [number, number, ColorToken][] =
      legendary
        ? [
            [0, 1, 'primary'],
            [0.08, 0.85, color],
            [0.4, 1, 'rarityLegendary'],
          ]
        : [
            [0, 1, 'primary'],
            [0.08, 0.8, color],
          ];
    for (const [delay, strength, c] of waves) {
      const x = (tt - delay) / 0.6;
      if (x < 0 || x >= 1) continue;
      list.s(arc(center, 30 + 300 * Ease.outCubic(x) * strength, 10 * (1 - x) + 1, 0, TAU), c, 0.85 * (1 - x));
    }
  },

  /** Confetti thrown up from `center` and, for the rarest, gold raining down. */
  addConfetti(list: RenderList, center: Vec2, tt: number, power: number, color: ColorToken, legendary: boolean): void {
    const vp = list.camera.viewport;
    const confettiLife = 1.8;
    if (tt < confettiLife) {
      for (let i = 0; i < Math.floor(ShopPage.confettiCount * power); i++) {
        const a = -Math.PI / 2 + (unit(i, 1) - 0.5) * 2.6;
        const speed = 280 + 320 * unit(i, 2);
        const at = v(center.x + Math.cos(a) * speed * tt + Math.sin(tt * 9 + i) * 6 * Math.min(1, tt), center.y + Math.sin(a) * speed * tt + 480 * tt * tt);
        const spin = (unit(i, 3) - 0.5) * 14;
        const size = v(6 + 4 * unit(i, 4), 3 + 2 * unit(i, 5));
        const fade = 1 - Math.max(0, (tt - confettiLife * 0.6) / (confettiLife * 0.4));
        list.s(rect(at, size, 1, spin * tt), i % 4 === 0 ? color : JUICE[i % JUICE.length], fade);
      }
    }

    if (legendary) {
      for (let i = 0; i < 30; i++) {
        const fall = tt - unit(i, 7) * 1.4;
        if (fall <= 0 || fall >= 1.4) continue;
        list.s(circle(v(unit(i, 8) * vp.x + Math.sin(fall * 5 + i) * 8, -10 + fall * vp.y * 0.8), 2.5), 'rarityLegendary', 1 - fall / 1.4);
      }
    }
  },

  /**
   * The chest before it bursts. `big` (an Epic or Legendary inside): it lifts off the ground,
   * shakes wildly and light of the prize's colour shoots out through its seams.
   */
  addBuildUp(list: RenderList, chest: ChestKind, age: number, center: Vec2, color: ColorToken, duration: number, big: boolean): void {
    const x = Ease.clamp01(age / duration);
    const enter = Ease.spring(age / 0.35);
    const intensity = x * x;
    const wild = big ? 1.8 : 1;
    const shake = mul(v(Math.sin(age * 55) * 7 * wild, Math.cos(age * 47) * 3 * wild), intensity);
    let stretch = 1 + 0.1 * Math.sin(age * 26) * (0.3 + intensity);
    const duck = Math.max(0, (x - 0.83) / 0.17);
    stretch -= 0.22 * Ease.outCubic(duck);
    const squash = v(1 / Math.sqrt(stretch), stretch);
    MenuKit.glow(list, center, 70 + 110 * x, color, 0.2 + 0.4 * intensity);
    MenuKit.glow(list, center, 30 + 50 * x, 'primary', 0.15 * intensity);
    const beads = Math.floor(6 + 6 * x);
    for (let i = 0; i < beads; i++) {
      const a = (i / beads) * TAU + age * (2 + 3 * x);
      list.s(circle(add(center, mul(fromAngle(a), 120 - 40 * x)), 3 + 2 * x), JUICE[i % JUICE.length], Math.min(1, age / 0.3) * 0.9);
    }
    const scale = 1.6 * enter * (1 + 0.08 * intensity);
    const lift = big ? 20 * Ease.outCubic(Ease.clamp01((x - 0.2) / 0.5)) : 0;
    const at = add(center, add(shake, v(0, -lift)));
    if (big) {
      // Light through the seams: thin beams from the chest, longer and brighter as it charges.
      const beams = 9;
      for (let i = 0; i < beams; i++) {
        const a = -Math.PI / 2 + ((i / (beams - 1)) - 0.5) * 2.6 + Math.sin(age * 3 + i) * 0.06;
        const flicker = 0.6 + 0.4 * Math.sin(age * 31 + i * 1.7);
        const length = (60 + 170 * intensity) * (0.7 + 0.3 * unit(i, 23));
        const half = 0.035 + 0.02 * intensity;
        const from = add(at, mul(fromAngle(a), 18 * scale / 1.6));
        list.s(polygon([from, add(from, mul(fromAngle(a - half), length)), add(from, mul(fromAngle(a + half), length))]), color, 0.55 * intensity * flicker);
      }
      // A flat shadow left on the ground: it shrinks as the chest rises.
      list.s(rect(add(center, v(0, 44)), v(110 * (1 - 0.25 * lift / 20), 14), 7), 'background', 0.6 * (lift / 20));
    }
    ShopPage.addChestIcon(list, chest, at, scale, 1, squash, 3 * intensity * (1 + Math.sin(age * 40)));
    for (let i = 0; i < Math.floor(6 + 16 * x); i++) {
      const phase = (age * 2.2 + unit(i, 9)) % 1;
      const side = unit(i, 10) - 0.5;
      const from = add(at, v(side * 80, (-18 * scale) / 1.6));
      const to = add(from, mul(v(side * 40, -50), phase));
      if (i % 2 === 0) list.s(line(to, add(to, v(side * 4, -6)), 1.5), color, (1 - phase) * intensity);
      else list.s(circle(to, 2.5), JUICE[i % JUICE.length], (1 - phase) * intensity);
    }
  },

  addRevealCard(list: RenderList, opening: ChestOpening, center: Vec2, tt: number, color: ColorToken, reduceMotion: boolean): void {
    const base = v(256, 300);
    const sx = reduceMotion ? 1 : 0.35 + 0.65 * Ease.spring(tt / 0.42);
    const sy = reduceMotion ? 1 : 0.35 + 0.65 * Ease.spring((tt - 0.05) / 0.42);
    const size = v(base.x * sx, base.y * sy);
    const fade = reduceMotion ? 1 : Math.min(1, tt / 0.1);
    const breathe = reduceMotion ? 0 : Math.sin(tt * 3) * 4;
    for (const [grow, opacity] of [
      [46, 0.06],
      [28, 0.1],
      [14, 0.16],
    ]) {
      list.s(rect(center, add(size, v(grow + breathe, grow + breathe)), 26 + grow / 2), color, opacity * fade);
    }
    list.s(rect(center, add(size, v(5, 5)), 26), color, fade);
    list.s(rect(center, size, 24), 'card', fade);
    list.s(rect(center, size, 24), color, 0.14 * fade);
    if (!(sx > 0.6 || reduceMotion)) return;
    const appear = (delay: number): number => (reduceMotion ? 1 : Ease.outCubic((tt - delay) / 0.25));
    const place = (o: Vec2): Vec2 => add(center, v(o.x * sx, o.y * sy));

    const slam = reduceMotion ? 1 : tt < 0.15 ? 0 : Ease.spring((tt - 0.15) / 0.35);
    t(list, S.shop.rarity(opening.item.rarity).toUpperCase(), place(v(0, -122)), 16 * (1 + 0.9 * (1 - slam)), color, { weight: 'bold', align: 'center', opacity: Math.min(1, slam * 2) });

    const itemPop = reduceMotion ? 1 : Ease.spring((tt - 0.08) / 0.45);
    const float = reduceMotion ? 0 : Math.sin(tt * 2.4) * 4 * Math.min(1, Math.max(0, tt - 0.5) / 0.3);
    if (itemPop > 0.01) {
      list.s(circle(place(v(0, -34)), 56 * itemPop), color, 0.18);
      ShopPage.addPreview(list, opening.item, add(place(v(0, -34)), v(0, float)), 1.9 * itemPop, 1);
    }
    const name = appear(0.18);
    t(list, S.shop.item(opening.item.id), add(place(v(0, 52)), v(0, 10 * (1 - name))), 22, 'primary', { weight: 'bold', align: 'center', opacity: name });
    const kind = appear(0.24);
    t(list, S.shop.kind(opening.item), add(place(v(0, 78)), v(0, 10 * (1 - kind))), 13, 'muted', { align: 'center', opacity: kind });
    if (opening.isDuplicate) {
      const m = appear(0.3);
      t(list, S.shop.duplicate(Fmt.number(opening.money)), add(place(v(0, 102)), v(0, 10 * (1 - m))), 13, 'accent', { weight: 'bold', align: 'center', opacity: m });
    }
    // The hint comes when a tap can close the card, not before.
    t(list, S.shop.tapToClose, place(v(0, 132)), 11, 'muted', { align: 'center', opacity: 0.8 * appear(ShopPage.closeAfter) });

    if (reduceMotion || tt <= 0.3) return;
    const stars = rarityRank(opening.item.rarity) >= 2 ? 10 : 6;
    for (let i = 0; i < stars; i++) {
      const twinkle = Math.max(0, Math.sin(tt * (1.3 + unit(i, 17)) + unit(i, 18) * 6));
      if (twinkle <= 0.05) continue;
      const side = i % 2 === 0 ? -1 : 1;
      const at = add(center, v(side * (base.x / 2 + 16 + 30 * unit(i, 19)), (unit(i, 20) - 0.5) * base.y * 1.1));
      ShopPage.addStar(list, at, (6 + 6 * unit(i, 21)) * twinkle, JUICE[i % JUICE.length], Math.min(1, (tt - 0.3) / 0.3));
    }
  },

  addStar(list: RenderList, center: Vec2, radius: number, color: ColorToken, opacity: number): void {
    const inner = radius * 0.28;
    const points = Array.from({ length: 8 }, (_, k) => add(center, mul(fromAngle((k / 8) * TAU - Math.PI / 2), k % 2 === 0 ? radius : inner)));
    list.s(polygon(points), color, opacity);
  },
};
