import type { Career } from '../core/career';
import { type Config, type BossKind, baseConfig } from '../core/config';
import { type MuseumShelf, type MuseumEntry, type SpecialKind, MUSEUM_SHELVES, shelfEntries, museumId, firstLevel } from '../core/museum';
import { rematch } from '../core/trials';
import type { VehicleType } from '../core/vehicle';
import { type Vec2, v, add, mul, fromAngle } from '../core/vec2';
import { type RenderList, type Rect, RenderList as List, R, rect, text, Ease, moved, pinned, vlerp, type Align, type Weight } from './render';
import type { ColorToken } from './theme';
import { MenuKit } from './menukit';
import { moneyTag } from './icons';
import { S, Fmt } from './strings';
import { ShopPage } from './shop';
import { CarArt } from './carArt';
import { SYNDICATE_BOSS, SYNDICATE_ESCORT } from './scene';

/** What the Museum section shows and animates: its shelf and the entry in the detail sheet. */
export class MuseumState {
  shelf: MuseumShelf = 0;
  shelfSlide: { from: MuseumShelf; age: number } | null = null;
  selected: string | null = null;

  selectShelf(next: MuseumShelf): void {
    if (next === this.shelf) return;
    this.shelfSlide = { from: this.shelf, age: 0 };
    this.shelf = next;
  }

  advance(delta: number): void {
    if (!this.shelfSlide) return;
    this.shelfSlide.age += delta;
    if (this.shelfSlide.age >= ShopPage.slideDuration) this.shelfSlide = null;
  }
}

export type MuseumTarget = { k: 'shelf'; shelf: MuseumShelf } | { k: 'entry'; id: string };

function t(list: RenderList, s: string, at: Vec2, size: number, color: ColorToken, opacity: number, o: { weight?: Weight; align?: Align } = {}): void {
  list.s(text(s, at, size, o.align ?? 'leading', o.weight ?? 'regular'), color, opacity);
}

const seen = (c: Career, e: MuseumEntry): boolean => c.museumSeen.includes(museumId(e));

/** How many escorts a boss brings in its first round (`applyBoss`). */
function escortsOf(kind: BossKind, c: Config): number {
  switch (kind) {
    case 'convoy':
      return c.convoyEscorts;
    case 'getaway':
      return 0;
    case 'armoured':
      return c.armouredEscorts;
    case 'phantom':
      return c.phantomEscorts;
  }
}

type Look = typeof SYNDICATE_BOSS | typeof SYNDICATE_ESCORT;

/**
 * The Museum (Progress tab): the syndicate's bosses and the special vehicles on two shelves,
 * like the Collection. What has not been on the road yet is a grey silhouette; a tap on an
 * entry opens the detail sheet with what it asks of you.
 */
export const MuseumPage = {
  chipHeight: 36,

  name(e: MuseumEntry): string {
    return e.k === 'boss' ? S.boss.name(e.kind) : S.museum.name(e.kind);
  },

  /** The glow behind an entry that is on show. */
  color(e: MuseumEntry): ColorToken {
    if (e.k === 'boss') return 'coin';
    const colors: Record<SpecialKind, ColorToken> = {
      police: 'lightBlue',
      pickup: 'juiceRed',
      transporter: 'coin',
      ambulance: 'lightBlue',
      truck: 'rarityCommon',
      tanker: 'juiceOrange',
      military: 'juiceGreen',
    };
    return colors[e.kind];
  },

  chips(content: Rect): [MuseumShelf, Rect][] {
    const gap = 6;
    const w = (R.width(content) - gap * (MUSEUM_SHELVES.length - 1)) / MUSEUM_SHELVES.length;
    return MUSEUM_SHELVES.map((s, i) => [s, R.make(content.minX + i * (w + gap), content.minY, content.minX + i * (w + gap) + w, content.minY + MuseumPage.chipHeight)]);
  },

  cells(content: Rect, shelf: MuseumShelf): [MuseumEntry, Rect][] {
    const entries = shelfEntries(shelf);
    const area = { ...content, minY: content.minY + MuseumPage.chipHeight + ShopPage.gap };
    const cells = shelf === 0 ? ShopPage.grid(entries.length, 1, area, 92) : ShopPage.grid(entries.length, 2, area, 118);
    return entries.map((e, i) => [e, cells[i]]);
  },

  targetAt(point: Vec2, content: Rect, shelf: MuseumShelf): MuseumTarget | null {
    const chip = MuseumPage.chips(content).find(([, r]) => R.contains(r, point));
    if (chip) return { k: 'shelf', shelf: chip[0] };
    const cell = MuseumPage.cells(content, shelf).find(([, r]) => R.contains(r, point));
    return cell ? { k: 'entry', id: museumId(cell[0]) } : null;
  },

  entering(r: Rect, age: number, index: number, reduceMotion: boolean): [Rect, number] {
    if (reduceMotion) return [r, 1];
    const rise = MenuKit.cardEnter(MenuKit.staggerSpring(age, index)).rise;
    return [R.offset(r, v(0, rise)), MenuKit.stagger(age, index)];
  },

  add(list: RenderList, content: Rect, career: Career, state: MuseumState, age: number, time: number, reduceMotion: boolean): void {
    const chips = MuseumPage.chips(content);
    const slide = state.shelfSlide;
    const glide = slide ? (reduceMotion ? 1 : Ease.settle(slide.age / ShopPage.slideDuration)) : 1;
    const enter = reduceMotion ? 1 : Ease.outCubic(age / 0.25);
    for (const [, r] of chips) list.s(rect(R.center(r), v(R.width(r), R.height(r)), 10), 'controlFill', enter);
    const to = chips.find(([s]) => s === state.shelf)?.[1];
    if (to) {
      // The chosen shelf is a white chip, as in the Collection; it glides to the next one.
      const from = (slide && chips.find(([s]) => s === slide.from)?.[1]) || to;
      list.s(rect(vlerp(R.center(from), R.center(to), glide), v(R.width(to), R.height(to)), 10), 'primary', enter);
    }
    for (const [shelf, r] of chips) {
      const c = R.center(r);
      const entries = shelfEntries(shelf);
      const shown = entries.filter((e) => seen(career, e)).length;
      if (entries.some((e) => career.museumNew.includes(museumId(e)))) ShopPage.badgeDot(list, v(r.maxX - 9, r.minY + 9), enter);
      const on = shelf === state.shelf ? glide : slide && shelf === slide.from ? 1 - glide : 0;
      const label = S.museum.shelf(shelf);
      const count = `${shown}/${entries.length}`;
      t(list, label, v(c.x, c.y - 7), 12, 'muted', enter * (1 - on), { weight: 'bold', align: 'center' });
      t(list, count, v(c.x, c.y + 8), 10, shown === entries.length ? 'coin' : 'muted', enter * (1 - on), { align: 'center' });
      if (on > 0) {
        t(list, label, v(c.x, c.y - 7), 12, 'background', enter * on, { weight: 'bold', align: 'center' });
        t(list, count, v(c.x, c.y + 8), 10, 'background', 0.6 * enter * on, { align: 'center' });
      }
    }
    const start = list.items.length;
    MuseumPage.addShelf(list, state.shelf, content, career, state, age, time, reduceMotion);
    if (!slide) return;
    const side = state.shelf > slide.from ? 1 : -1;
    const shift = v(reduceMotion ? 0 : side * R.width(content) * 0.35 * (1 - glide), 0);
    const fade = Ease.outCubic(slide.age / 0.18);
    for (let i = start; i < list.items.length; i++) list.items[i] = moved(list.items[i], shift, fade);
    const gone = Ease.outCubic(slide.age / ShopPage.slideOut);
    if (gone >= 1) return;
    const old = new List(list.camera, list.background);
    MuseumPage.addShelf(old, slide.from, content, career, state, 10, time, true);
    const away = v(reduceMotion ? 0 : -side * R.width(content) * 0.25 * gone, 0);
    list.items.splice(start, 0, ...old.items.map((i) => moved(i, away, 1 - gone)));
  },

  addShelf(list: RenderList, shelf: MuseumShelf, content: Rect, career: Career, state: MuseumState, age: number, time: number, reduceMotion: boolean): void {
    MuseumPage.cells(content, shelf).forEach(([entry, cell], i) => {
      const [r, o] = MuseumPage.entering(cell, age, i, reduceMotion);
      const id = museumId(entry);
      const c = R.center(r);
      if (state.selected === id) list.s(rect(c, v(R.width(r) + 4, R.height(r) + 4), ShopPage.corner + 2), 'accent', 0.9 * o);
      ShopPage.panel(list, r, 'card', o);
      if (entry.k === 'boss') MuseumPage.addBossRow(list, entry.kind, r, career, time, o);
      else MuseumPage.addSpecialCard(list, entry.kind, r, career, time, o);
      if (career.museumNew.includes(id)) {
        const at = v(r.minX + 22, r.minY + 12);
        list.s(rect(at, v(30, 15), 7.5), 'accent', o);
        t(list, S.museum.newBadge, at, 9, 'accentInk', o, { weight: 'bold', align: 'center' });
      }
    });
  },

  addBossRow(list: RenderList, kind: BossKind, r: Rect, career: Career, time: number, o: number): void {
    const entry: MuseumEntry = { k: 'boss', kind };
    const shown = seen(career, entry);
    const beaten = career.bossesBeaten.includes(kind);
    const c = R.center(r);
    const artWidth = Math.min(96, R.width(r) * 0.3);
    MuseumPage.art(list, entry, v(r.minX + 8 + artWidth / 2, c.y), Math.min(1, R.height(r) / 92), shown, time, o, artWidth);
    const x = r.minX + artWidth + 20;
    const match = rematch(kind);
    const won = career.trialsDone.includes(match.id);
    const right = beaten ? 86 : 16;
    const title = shown ? S.boss.name(kind) : S.museum.unknown;
    t(list, title, v(x, c.y - 16), ShopPage.fitted(title, 14, r.maxX - right - x), beaten ? 'coin' : shown ? 'primary' : 'muted', o, { weight: 'bold' });
    const line = shown ? S.museum.bossTagline(kind) : S.museum.firstAt(firstLevel(entry, baseConfig));
    t(list, line, v(x, c.y + 3), ShopPage.fitted(line, 11, r.maxX - 16 - x), 'muted', o);
    const status = beaten ? S.boss.beaten : shown ? S.museum.met : S.museum.notSeen;
    t(list, status, v(x, c.y + 21), 11, beaten ? 'accent' : 'muted', o, { weight: 'bold' });
    if (!beaten) return;
    if (won) t(list, S.trials.passed, v(r.maxX - 16, c.y - 16), 12, 'accent', o, { weight: 'bold', align: 'trailing' });
    else moneyTag(list, Fmt.number(match.reward), v(r.maxX - 16, c.y - 16), 13, 'trailing', 'primary', 'accent', o);
    t(list, `${S.museum.rematch} ›`, v(r.maxX - 16, c.y + 21), 11, won ? 'muted' : 'coin', o, { weight: 'bold', align: 'trailing' });
  },

  addSpecialCard(list: RenderList, kind: SpecialKind, r: Rect, career: Career, time: number, o: number): void {
    const entry: MuseumEntry = { k: 'special', kind };
    const shown = seen(career, entry);
    const c = R.center(r);
    const scale = Math.min(1, R.height(r) / 118);
    MuseumPage.art(list, entry, v(c.x, r.minY + R.height(r) * 0.38), scale, shown, time, o, R.width(r) - 24);
    const name = shown ? S.museum.name(kind) : S.museum.unknown;
    t(list, name, v(c.x, r.maxY - 30), ShopPage.fitted(name, 13, R.width(r) - 16), shown ? 'primary' : 'muted', o, { weight: 'bold', align: 'center' });
    const level = firstLevel(entry, baseConfig);
    const line = shown ? S.museum.tagline(kind) : level > 1 ? S.museum.firstAt(level) : S.museum.notSeen;
    t(list, line, v(c.x, r.maxY - 13), ShopPage.fitted(line, 10, R.width(r) - 14), 'muted', o, { align: 'center' });
  },

  /**
   * The picture: the vehicle drawn with the game's own art, turned a little. A boss drives
   * ahead of its escorts. Not on show yet, it is a flat grey silhouette (an opaque grey, so no part shows through).
   */
  art(list: RenderList, entry: MuseumEntry, center: Vec2, scale: number, shown: boolean, time: number, opacity: number, room = 88): void {
    const c = baseConfig;
    const heading = -0.28;
    const ahead = fromAngle(heading);
    const cars: { type: VehicleType; at: Vec2; look: Look | null }[] = [];
    let length: number;
    if (entry.k === 'boss') {
      // The boss in front, its escorts behind it along its heading, the whole convoy centred.
      const escorts = escortsOf(entry.kind, c);
      const step = c.carLength * 1.12;
      length = c.carLength + escorts * step;
      const front = mul(ahead, (escorts * step) / 2);
      cars.push({ type: 'pickup', at: front, look: SYNDICATE_BOSS });
      for (let i = 1; i <= escorts; i++) cars.push({ type: 'van', at: add(front, mul(ahead, -i * step)), look: SYNDICATE_ESCORT });
    } else {
      const type: VehicleType = entry.kind;
      length = type === 'truck' || type === 'tanker' || type === 'military' ? c.truckLength : type === 'ambulance' ? c.ambulanceLength : c.carLength;
      cars.push({ type, at: v(0, 0), look: null });
    }
    // A car is the same size on every card, unless a convoy or a lorry needs the room.
    const span = length * Math.cos(heading) + c.carWidth;
    const pxPerUnit = Math.min((40 * scale) / c.carLength, (room * 0.9) / span);
    if (shown) MenuKit.glow(list, center, Math.min(room * 0.5, 44 * scale), MuseumPage.color(entry), 0.3 * opacity);
    const preview = new List({ viewport: list.camera.viewport, center: v(0, 0), focus: center, scale: pxPerUnit }, list.background);
    // Back to front, so the boss sits on top of its escorts.
    [...cars].reverse().forEach((car, i) => {
      const flashing = shown && (car.type === 'police' || car.type === 'ambulance');
      CarArt.add(
        preview,
        {
          id: 11 + i,
          type: car.type,
          pose: { position: car.at, heading },
          dents: [],
          lights: flashing ? time : null,
          skin: car.look?.paint ?? null,
          stripe: car.look?.stripe ?? null,
          roof: car.look?.roof ?? null,
          finish: null,
          finishTime: null,
        },
        c,
      );
    });
    for (const it of preview.items) {
      const item = pinned(it, preview.camera, opacity);
      if (shown) list.items.push(item);
      else if (it.color !== 'shadow' && it.opacity >= 0.5) list.items.push({ ...item, color: 'wreck', opacity });
    }
  },
};
