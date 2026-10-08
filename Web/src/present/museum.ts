import type { Career } from '../core/career';
import { type Config, type BossKind, type CityEvent, baseConfig } from '../core/config';
import { type MuseumShelf, type MuseumEntry, type SpecialKind, type WeatherKind, type DarkKind, shelfEntries, museumId, firstLevel } from '../core/museum';
import { rematch } from '../core/trials';
import { type VehicleType, isHeavy } from '../core/vehicle';
import { type Vec2, v, add, mul, fromAngle, TAU } from '../core/vec2';
import { type RenderList, type RenderItem, type Rect, RenderList as List, R, rect, circle, arc, line, polygon, pinned, drawText } from './render';
import type { ColorToken } from './theme';
import { MenuKit } from './menukit';
import { moneyTag } from './icons';
import { S, Fmt } from './strings';
import { ShopPage } from './shop';
import { CarArt } from './carArt';
import { SYNDICATE_BOSS, SYNDICATE_ESCORT } from './scene';

/** What the Museum section remembers: the entry in the detail sheet, and the entries scrolled into view. */
export class MuseumState {
  selected: string | null = null;
  /** Entries that were on screen: leaving the Museum, what was new among them counts as seen. */
  readonly viewed = new Set<string>();
}

const seen = (c: Career, e: MuseumEntry): boolean => c.museumSeen.includes(museumId(e));

/**
 * Who rides with a boss in its first round (`applyBoss`): how many, and whether they wear its
 * paint (the decoy, the kingpin) or are a second boss (the twins).
 */
const BOSS_FOLLOWERS: Record<BossKind, (c: Config) => { count: number; look: 'escort' | 'disguised' | 'twin' }> = {
  convoy: (c) => ({ count: c.convoyEscorts, look: 'escort' }),
  getaway: () => ({ count: 0, look: 'escort' }),
  armoured: (c) => ({ count: c.armouredEscorts, look: 'escort' }),
  phantom: (c) => ({ count: c.phantomEscorts, look: 'escort' }),
  twins: () => ({ count: 1, look: 'twin' }),
  decoy: (c) => ({ count: c.decoyEscorts, look: 'disguised' }),
  smuggler: () => ({ count: 0, look: 'escort' }),
  kingpin: (c) => ({ count: c.kingpinEscorts, look: 'disguised' }),
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
  fog: (l, at, u) => {
    cloud(l, at, u, 'muted');
    for (const [y, w] of [[12, 40], [18, 30], [24, 36]]) l.s(line(at(-w / 2, y), at(w / 2, y), 3 * u), 'smokeLight');
  },
  hail: (l, at, u) => {
    cloud(l, at, u, 'muted');
    stones(l, at, u);
  },
  sandstorm: (l, at, u) => {
    // A low sun behind the dust, and the dust blowing across it.
    l.s(circle(at(8, -6), 14 * u), 'juiceOrange');
    for (const [y, w, x] of [[-10, 46, -4], [0, 38, 4], [10, 50, -2], [20, 34, 6]]) l.s(line(at(x - w / 2, y), at(x + w / 2, y), 3.4 * u), 'mapSand');
  },
  snow: (l, at, u) => {
    // A snowflake: three bars and their tips.
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI) / 3;
      const d = v(Math.cos(a) * 18, Math.sin(a) * 18);
      l.s(line(at(-d.x, -d.y), at(d.x, d.y), 3 * u), 'skinIce');
      for (const s of [-1, 1]) {
        const tip = v(d.x * s * 0.62, d.y * s * 0.62);
        const side = v(-Math.sin(a) * 5, Math.cos(a) * 5);
        l.s(line(at(tip.x, tip.y), at(tip.x * 1.25 + side.x, tip.y * 1.25 + side.y), 2 * u), 'skinIce');
        l.s(line(at(tip.x, tip.y), at(tip.x * 1.25 - side.x, tip.y * 1.25 - side.y), 2 * u), 'skinIce');
      }
    }
  },
};

/** A few round hailstones under the cloud. */
function stones(l: RenderList, at: (x: number, y: number) => Vec2, u: number): void {
  for (const [x, y, r] of [[-14, 14, 3], [-3, 20, 3.6], [9, 13, 2.8], [17, 21, 3.2], [3, 27, 2.4]]) l.s(circle(at(x, y), r * u), 'primary');
}

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
  marathon: (l, at, u) => {
    // A runner mid-stride: head, body, arms and legs, and the finishing tape.
    l.s(circle(at(4, -18), 5 * u), 'juiceOrange');
    l.s(line(at(3, -12), at(-2, 4), 4 * u), 'juiceOrange');
    l.s(line(at(1, -8), at(12, -2), 3 * u), 'juiceOrange');
    l.s(line(at(1, -8), at(-10, -10), 3 * u), 'juiceOrange');
    l.s(line(at(-2, 4), at(10, 12), 3.4 * u), 'juiceOrange');
    l.s(line(at(-2, 4), at(-10, 18), 3.4 * u), 'juiceOrange');
    l.s(line(at(-26, 22), at(26, 22), 2.4 * u), 'primary');
  },
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
  schoolRun: (l, at, u) => {
    // A bus stop sign: the pole and its round plate with an H.
    l.s(line(at(0, 22), at(0, -4), 3 * u), 'muted');
    l.s(circle(at(0, -10), 14 * u), 'vehicleBus');
    l.s(circle(at(0, -10), 11 * u), 'juiceGreen');
    l.s(line(at(-4, -16), at(-4, -4), 2.5 * u), 'vehicleBus');
    l.s(line(at(4, -16), at(4, -4), 2.5 * u), 'vehicleBus');
    l.s(line(at(-4, -10), at(4, -10), 2.5 * u), 'vehicleBus');
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
  fireTruck: 'juiceRed',
  motorbike: 'juiceRed',
  learner: 'juiceGreen',
  bus: 'juiceYellow',
  oversize: 'vehicleOversize',
  racer: 'vehicleRacer',
  wedding: 'vehicleWedding',
};
const WEATHER_COLOR: Record<WeatherKind, ColorToken> = {
  lightRain: 'lightBlue',
  heavyRain: 'rarityRare',
  storm: 'coin',
  extreme: 'juiceRed',
  fog: 'smokeLight',
  snow: 'skinIce',
  hail: 'primary',
  sandstorm: 'mapSand',
};
const DARK_COLOR: Record<DarkKind, ColorToken> = { night: 'rarityEpic', blackout: 'muted' };
const EVENT_COLOR: Record<CityEvent, ColorToken> = {
  roadworks: 'juiceOrange',
  roadClosure: 'juiceRed',
  concert: 'rarityEpic',
  vipConvoy: 'coin',
  policeOperation: 'lightBlue',
  schoolRun: 'juiceYellow',
  marathon: 'juiceOrange',
};

/**
 * The Museum (Progress tab): the syndicate's bosses, the special vehicles and the city's
 * conditions, one shelf under the other in a list (`ProgressPage`). What has not been met yet
 * is a grey silhouette; a tap on an entry opens the detail sheet with what it asks of you.
 */
export const MuseumPage = {
  /** Bosses are rows; the other shelves are cards, three to a row. */
  bossHeight: 92,
  cardHeight: 118,
  columns: (shelf: MuseumShelf): number => (shelf === 0 ? 1 : 3),

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
      case 'road':
        return 'accent';
    }
  },

  /** Shown so far / all, for a shelf's heading. */
  count(career: Career, shelf: MuseumShelf): { shown: number; all: number } {
    const entries = shelfEntries(shelf);
    return { shown: entries.filter((e) => seen(career, e)).length, all: entries.length };
  },

  /** One entry in its cell: a boss row or a card, with the NEW badge and the ring when chosen. */
  addEntry(list: RenderList, entry: MuseumEntry, r: Rect, career: Career, state: MuseumState, time: number, o: number): void {
    const id = museumId(entry);
    const c = R.center(r);
    if (state.selected === id) list.s(rect(c, v(R.width(r) + 4, R.height(r) + 4), ShopPage.corner + 2), 'accent', 0.9 * o);
    ShopPage.panel(list, r, 'card', o);
    if (entry.k === 'boss') MuseumPage.addBossRow(list, entry.kind, r, career, time, o);
    else MuseumPage.addCard(list, entry, r, career, time, o);
    if (career.museumNew.includes(id)) {
      const at = v(r.minX + 22, r.minY + 12);
      list.s(rect(at, v(30, 15), 7.5), 'accent', o);
      drawText(list, S.museum.newBadge, at, 9, 'accentInk', { opacity: o, weight: 'bold', align: 'center' });
    }
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
    drawText(list, title, v(x, c.y - 16), ShopPage.fitted(title, 14, r.maxX - right - x), beaten ? 'coin' : shown ? 'primary' : 'muted', { opacity: o, weight: 'bold' });
    const lineText = shown ? S.museum.line(entry) : S.museum.firstAt(firstLevel(entry, baseConfig));
    drawText(list, lineText, v(x, c.y + 3), ShopPage.fitted(lineText, 11, r.maxX - 16 - x), 'muted', { opacity: o });
    const status = beaten ? S.boss.beaten : shown ? S.museum.met : S.museum.notSeen;
    drawText(list, status, v(x, c.y + 21), 11, beaten ? 'accent' : 'muted', { opacity: o, weight: 'bold' });
    if (!beaten) return;
    if (won) drawText(list, S.trials.passed, v(r.maxX - 16, c.y - 16), 12, 'accent', { opacity: o, weight: 'bold', align: 'trailing' });
    else moneyTag(list, Fmt.number(match.reward), v(r.maxX - 16, c.y - 16), 13, 'trailing', 'primary', 'accent', o);
    drawText(list, `${S.museum.rematch} ›`, v(r.maxX - 16, c.y + 21), 11, won ? 'muted' : 'coin', { opacity: o, weight: 'bold', align: 'trailing' });
  },

  /** A card: the picture on top, the name and one line below. */
  addCard(list: RenderList, entry: MuseumEntry, r: Rect, career: Career, time: number, o: number): void {
    const shown = seen(career, entry);
    const c = R.center(r);
    const scale = Math.min(1, R.height(r) / 118);
    MuseumPage.art(list, entry, v(c.x, r.minY + R.height(r) * 0.38), scale, shown, time, o, R.width(r) - 24);
    const name = shown ? S.museum.name(entry) : S.museum.unknown;
    drawText(list, name, v(c.x, r.maxY - 30), ShopPage.fitted(name, 13, R.width(r) - 12), shown ? 'primary' : 'muted', { opacity: o, weight: 'bold', align: 'center' });
    const level = firstLevel(entry, baseConfig);
    const lineText = shown ? S.museum.line(entry) : level > 1 ? S.museum.firstAt(level) : S.museum.notSeen;
    drawText(list, lineText, v(c.x, r.maxY - 13), ShopPage.fitted(lineText, 10, R.width(r) - 10), 'muted', { opacity: o, align: 'center' });
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
      const followers = BOSS_FOLLOWERS[entry.kind](c);
      const escorts = followers.count;
      const step = c.carLength * 1.12;
      length = c.carLength + escorts * step;
      const front = mul(ahead, (escorts * step) / 2);
      cars.push({ type: 'pickup', at: front, look: SYNDICATE_BOSS });
      for (let i = 1; i <= escorts; i++) {
        const at = add(front, mul(ahead, -i * step));
        if (followers.look === 'twin') cars.push({ type: 'pickup', at, look: SYNDICATE_BOSS });
        else cars.push({ type: 'van', at, look: followers.look === 'disguised' ? SYNDICATE_BOSS : SYNDICATE_ESCORT });
      }
    } else {
      const type = entry.kind as VehicleType;
      length = isHeavy(type) ? Math.max(c.truckLength, CarArt.length(type, c)) : CarArt.length(type, c);
      cars.push({ type, at: v(0, 0), look: null });
    }
    // A car is the same size on every card, unless a convoy or a lorry needs the room.
    const span = length * Math.cos(heading) + c.carWidth;
    const pxPerUnit = Math.min((40 * scale) / c.carLength, (room * 0.9) / span);
    const preview = new List({ viewport: list.camera.viewport, center: v(0, 0), focus: center, scale: pxPerUnit }, list.background);
    // Back to front, so the boss sits on top of its escorts.
    [...cars].reverse().forEach((car, i) => {
      const flashing = shown && (car.type === 'police' || car.type === 'ambulance' || car.type === 'fireTruck');
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
    else if (entry.k === 'road') {
      // Two lanes round an island, the dashed line between them.
      icon.s(arc(at(0, 0), 17 * u, 16 * u, 0, TAU), 'surface');
      for (let k = 0; k < 10; k++) icon.s(arc(at(0, 0), 17 * u, 1.4 * u, (k * TAU) / 10, (k * TAU) / 10 + 0.35), 'primary');
      icon.s(circle(at(0, 0), 8 * u), 'accent');
    }
    return icon.items;
  },
};
