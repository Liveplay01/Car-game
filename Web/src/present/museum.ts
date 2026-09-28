import type { Career } from '../core/career';
import { type Config, type BossKind, type CityEvent, baseConfig } from '../core/config';
import { type MuseumShelf, type MuseumEntry, type SpecialKind, type WeatherKind, type DarkKind, MUSEUM_SHELVES, shelfEntries, museumId, firstLevel } from '../core/museum';
import { rematch } from '../core/trials';
import { type VehicleType, isHeavy } from '../core/vehicle';
import { type Vec2, v, add, mul, fromAngle, TAU } from '../core/vec2';
import { type RenderList, type RenderItem, type Rect, RenderList as List, R, rect, circle, line, polygon, text, Ease, moved, pinned, vlerp, type Align, type Weight } from './render';
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
const BOSS_ESCORTS: Record<BossKind, (c: Config) => number> = {
  convoy: (c) => c.convoyEscorts,
  getaway: () => 0,
  armoured: (c) => c.armouredEscorts,
  phantom: (c) => c.phantomEscorts,
};

type Look = typeof SYNDICATE_BOSS | typeof SYNDICATE_ESCORT;

// MARK: Pictures of the conditions

/** Draws an icon round the origin of a 64 × 48 box; `at` maps box points to the screen, `u` is one box unit. */
type Icon = (l: RenderList, at: (x: number, y: number) => Vec2, u: number) => void;

function cloud(l: RenderList, at: (x: number, y: number) => Vec2, u: number, color: ColorToken): void {
  l.s(circle(at(-11, -2), 9 * u), color);
  l.s(circle(at(2, -9), 12 * u), color);
  l.s(circle(at(14, -2), 8 * u), color);
  l.s(rect(at(1, 2), v(42 * u, 12 * u), 6 * u), color);
}

function drops(l: RenderList, at: (x: number, y: number) => Vec2, u: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const x = count === 1 ? 0 : -15 + (i * 30) / (count - 1);
    const y = 13 + (i % 2) * 5;
    l.s(line(at(x, y), at(x - 3, y + 7), 2.4 * u), 'lightBlue');
  }
}

function bolt(l: RenderList, at: (x: number, y: number) => Vec2, dx: number): void {
  l.s(polygon([at(3 + dx, 4), at(-6 + dx, 17), at(0 + dx, 17), at(-4 + dx, 26), at(8 + dx, 12), at(2 + dx, 12), at(6 + dx, 4)]), 'coin');
}

function star(l: RenderList, at: (x: number, y: number) => Vec2, x: number, y: number, outer: number, inner: number, color: ColorToken): void {
  const points = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * TAU) / 10;
    return at(x + Math.cos(a) * r, y + Math.sin(a) * r);
  });
  l.s(polygon(points), color);
}

/** A crescent moon: a disc with a disc of the card's colour cut out of it. */
function moon(l: RenderList, at: (x: number, y: number) => Vec2, u: number, x: number, y: number, r: number): void {
  l.s(circle(at(x, y), r * u), 'headlight');
  l.s(circle(at(x + r * 0.45, y - r * 0.3), r * 0.85 * u), 'card');
}

const WEATHER_ICON: Record<WeatherKind, Icon> = {
  lightRain: (l, at, u) => {
    cloud(l, at, u, 'muted');
    drops(l, at, u, 3);
  },
  heavyRain: (l, at, u) => {
    cloud(l, at, u, 'muted');
    drops(l, at, u, 6);
  },
  storm: (l, at, u) => {
    cloud(l, at, u, 'muted');
    drops(l, at, u, 2);
    bolt(l, at, 2);
  },
  extreme: (l, at, u) => {
    cloud(l, at, u, 'muted');
    drops(l, at, u, 4);
    bolt(l, at, -8);
    bolt(l, at, 12);
  },
};

const DARK_ICON: Record<DarkKind, Icon> = {
  night: (l, at, u) => {
    moon(l, at, u, -2, 0, 17);
    for (const [x, y, r] of [[-22, -14, 1.8], [20, 12, 1.5], [22, -16, 2]]) l.s(circle(at(x, y), r * u), 'primary');
  },
  blackout: (l, at, u) => {
    moon(l, at, u, -16, -10, 10);
    // A street lamp with its light out.
    l.s(line(at(10, 22), at(10, -12), 3 * u), 'muted');
    l.s(line(at(10, -12), at(0, -16), 3 * u), 'muted');
    l.s(rect(at(-2, -14), v(12 * u, 5 * u), 2 * u), 'muted');
    l.s(line(at(-6, -6), at(2, 2), 2 * u), 'destructive');
    l.s(line(at(2, -6), at(-6, 2), 2 * u), 'destructive');
  },
};

const EVENT_ICON: Record<CityEvent, Icon> = {
  roadworks: (l, at, u) => {
    l.s(polygon([at(0, -20), at(-11, 14), at(11, 14)]), 'juiceOrange');
    l.s(rect(at(0, -4), v(10 * u, 4 * u), 0), 'primary');
    l.s(rect(at(0, 6), v(15 * u, 4 * u), 0), 'primary');
    l.s(rect(at(0, 16), v(32 * u, 5 * u), 2 * u), 'juiceOrange');
  },
  roadClosure: (l, at, u) => {
    l.s(line(at(-16, 2), at(-16, 20), 3 * u), 'muted');
    l.s(line(at(16, 2), at(16, 20), 3 * u), 'muted');
    l.s(rect(at(0, -4), v(50 * u, 15 * u), 2 * u), 'primary');
    for (const x of [-17, -5, 7, 19]) l.s(polygon([at(x - 1, -11), at(x + 5, -11), at(x - 1, 3), at(x - 7, 3)]), 'juiceRed');
  },
  concert: (l, at, u) => {
    l.s(polygon([at(-6, -12), at(18, -18), at(18, -11), at(-6, -5)]), 'rarityEpic');
    l.s(line(at(-6, -12), at(-6, 12), 2.5 * u), 'rarityEpic');
    l.s(line(at(18, -18), at(18, 8), 2.5 * u), 'rarityEpic');
    l.s(circle(at(-11, 12), 6 * u), 'rarityEpic');
    l.s(circle(at(13, 8), 6 * u), 'rarityEpic');
  },
  vipConvoy: (l, at) => star(l, at, 0, 1, 21, 9, 'coin'),
  policeOperation: (l, at) => {
    l.s(polygon([at(0, -21), at(17, -15), at(15, 5), at(0, 21), at(-15, 5), at(-17, -15)]), 'lightBlue');
    star(l, at, 0, -1, 9, 4, 'primary');
  },
};

/** The glow behind an entry on show. A new kind has to pick one (the compiler checks). */
const SPECIAL_COLOR: Record<SpecialKind, ColorToken> = {
  police: 'lightBlue',
  pickup: 'juiceRed',
  transporter: 'coin',
  ambulance: 'lightBlue',
  truck: 'rarityCommon',
  tanker: 'juiceOrange',
  military: 'juiceGreen',
};
const WEATHER_COLOR: Record<WeatherKind, ColorToken> = { lightRain: 'lightBlue', heavyRain: 'rarityRare', storm: 'coin', extreme: 'juiceRed' };
const DARK_COLOR: Record<DarkKind, ColorToken> = { night: 'rarityEpic', blackout: 'muted' };
const EVENT_COLOR: Record<CityEvent, ColorToken> = {
  roadworks: 'juiceOrange',
  roadClosure: 'juiceRed',
  concert: 'rarityEpic',
  vipConvoy: 'coin',
  policeOperation: 'lightBlue',
};

/**
 * The Museum (Progress tab): the syndicate's bosses, the special vehicles and the city's
 * conditions on their shelves, like the Collection. What has not been met yet is a grey
 * silhouette; a tap on an entry opens the detail sheet with what it asks of you.
 */
export const MuseumPage = {
  chipHeight: 36,

  name: (e: MuseumEntry): string => S.museum.name(e),

  color(e: MuseumEntry): ColorToken {
    switch (e.k) {
      case 'boss':
        return 'coin';
      case 'special':
        return SPECIAL_COLOR[e.kind];
      case 'weather':
        return WEATHER_COLOR[e.kind];
      case 'dark':
        return DARK_COLOR[e.kind];
      case 'event':
        return EVENT_COLOR[e.kind];
    }
  },

  chips(content: Rect): [MuseumShelf, Rect][] {
    const gap = 6;
    const w = (R.width(content) - gap * (MUSEUM_SHELVES.length - 1)) / MUSEUM_SHELVES.length;
    return MUSEUM_SHELVES.map((s, i) => [s, R.make(content.minX + i * (w + gap), content.minY, content.minX + i * (w + gap) + w, content.minY + MuseumPage.chipHeight)]);
  },

  /** Bosses are rows; the other shelves are cards, in three columns once they grow past eight. */
  cells(content: Rect, shelf: MuseumShelf): [MuseumEntry, Rect][] {
    const entries = shelfEntries(shelf);
    const area = { ...content, minY: content.minY + MuseumPage.chipHeight + ShopPage.gap };
    const cells = shelf === 0 ? ShopPage.grid(entries.length, 1, area, 92) : ShopPage.grid(entries.length, entries.length > 8 ? 3 : 2, area, 118);
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
      const size = ShopPage.fitted(label, 12, R.width(r) - 20);
      const count = `${shown}/${entries.length}`;
      t(list, label, v(c.x, c.y - 7), size, 'muted', enter * (1 - on), { weight: 'bold', align: 'center' });
      t(list, count, v(c.x, c.y + 8), 10, shown === entries.length ? 'coin' : 'muted', enter * (1 - on), { align: 'center' });
      if (on > 0) {
        t(list, label, v(c.x, c.y - 7), size, 'background', enter * on, { weight: 'bold', align: 'center' });
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
      else MuseumPage.addCard(list, entry, r, career, time, o);
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
    const title = shown ? S.museum.name(entry) : S.museum.unknown;
    t(list, title, v(x, c.y - 16), ShopPage.fitted(title, 14, r.maxX - right - x), beaten ? 'coin' : shown ? 'primary' : 'muted', o, { weight: 'bold' });
    const lineText = shown ? S.museum.line(entry) : S.museum.firstAt(firstLevel(entry, baseConfig));
    t(list, lineText, v(x, c.y + 3), ShopPage.fitted(lineText, 11, r.maxX - 16 - x), 'muted', o);
    const status = beaten ? S.boss.beaten : shown ? S.museum.met : S.museum.notSeen;
    t(list, status, v(x, c.y + 21), 11, beaten ? 'accent' : 'muted', o, { weight: 'bold' });
    if (!beaten) return;
    if (won) t(list, S.trials.passed, v(r.maxX - 16, c.y - 16), 12, 'accent', o, { weight: 'bold', align: 'trailing' });
    else moneyTag(list, Fmt.number(match.reward), v(r.maxX - 16, c.y - 16), 13, 'trailing', 'primary', 'accent', o);
    t(list, `${S.museum.rematch} ›`, v(r.maxX - 16, c.y + 21), 11, won ? 'muted' : 'coin', o, { weight: 'bold', align: 'trailing' });
  },

  /** A card: the picture on top, the name and one line below. */
  addCard(list: RenderList, entry: MuseumEntry, r: Rect, career: Career, time: number, o: number): void {
    const shown = seen(career, entry);
    const c = R.center(r);
    const scale = Math.min(1, R.height(r) / 118);
    MuseumPage.art(list, entry, v(c.x, r.minY + R.height(r) * 0.38), scale, shown, time, o, R.width(r) - 24);
    const name = shown ? S.museum.name(entry) : S.museum.unknown;
    t(list, name, v(c.x, r.maxY - 30), ShopPage.fitted(name, 13, R.width(r) - 12), shown ? 'primary' : 'muted', o, { weight: 'bold', align: 'center' });
    const level = firstLevel(entry, baseConfig);
    const lineText = shown ? S.museum.line(entry) : level > 1 ? S.museum.firstAt(level) : S.museum.notSeen;
    t(list, lineText, v(c.x, r.maxY - 13), ShopPage.fitted(lineText, 10, R.width(r) - 10), 'muted', o, { align: 'center' });
  },

  /**
   * The picture: a vehicle drawn with the game's own art and turned a little (a boss ahead of
   * its escorts), or the icon of a condition. Not on show yet, it is a flat grey silhouette:
   * one opaque grey, so no part shows through.
   */
  art(list: RenderList, entry: MuseumEntry, center: Vec2, scale: number, shown: boolean, time: number, opacity: number, room = 88): void {
    const drawn = entry.k === 'boss' || entry.k === 'special' ? MuseumPage.vehicles(list, entry, center, scale, shown, time, room) : MuseumPage.icon(list, entry, center, scale, room);
    if (shown) MenuKit.glow(list, center, Math.min(room * 0.5, 44 * scale), MuseumPage.color(entry), 0.3 * opacity);
    for (const it of drawn) {
      if (shown) list.items.push({ ...it, opacity: it.opacity * opacity });
      else if (it.color === 'card') list.items.push({ ...it, opacity });
      else if (it.color !== 'shadow' && it.opacity >= 0.5) list.items.push({ ...it, color: 'wreck', opacity });
    }
  },

  vehicles(list: RenderList, entry: MuseumEntry, center: Vec2, scale: number, shown: boolean, time: number, room: number): RenderItem[] {
    const c = baseConfig;
    const heading = -0.28;
    const ahead = fromAngle(heading);
    const cars: { type: VehicleType; at: Vec2; look: Look | null }[] = [];
    let length: number;
    if (entry.k === 'boss') {
      // The boss in front, its escorts behind it along its heading, the whole convoy centred.
      const escorts = BOSS_ESCORTS[entry.kind](c);
      const step = c.carLength * 1.12;
      length = c.carLength + escorts * step;
      const front = mul(ahead, (escorts * step) / 2);
      cars.push({ type: 'pickup', at: front, look: SYNDICATE_BOSS });
      for (let i = 1; i <= escorts; i++) cars.push({ type: 'van', at: add(front, mul(ahead, -i * step)), look: SYNDICATE_ESCORT });
    } else {
      const type = entry.kind as VehicleType;
      length = isHeavy(type) ? c.truckLength : type === 'ambulance' ? c.ambulanceLength : c.carLength;
      cars.push({ type, at: v(0, 0), look: null });
    }
    // A car is the same size on every card, unless a convoy or a lorry needs the room.
    const span = length * Math.cos(heading) + c.carWidth;
    const pxPerUnit = Math.min((40 * scale) / c.carLength, (room * 0.9) / span);
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
    return preview.items.map((it) => pinned(it, preview.camera, 1));
  },

  icon(list: RenderList, entry: MuseumEntry, center: Vec2, scale: number, room: number): RenderItem[] {
    const u = Math.min(1.05 * scale, room / 66);
    const at = (x: number, y: number): Vec2 => add(center, v(x * u, y * u));
    const icon = new List(list.camera, list.background);
    if (entry.k === 'weather') WEATHER_ICON[entry.kind](icon, at, u);
    else if (entry.k === 'dark') DARK_ICON[entry.kind](icon, at, u);
    else if (entry.k === 'event') EVENT_ICON[entry.kind](icon, at, u);
    return icon.items;
  },
};
