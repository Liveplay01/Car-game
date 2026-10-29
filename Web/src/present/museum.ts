import type { Career } from '../core/career';
import { type Config, type BossKind, type CityEvent, baseConfig } from '../core/config';
import { type MuseumShelf, type MuseumEntry, type SpecialKind, type WeatherKind, type DarkKind, shelfEntries, museumId, firstPlace } from '../core/museum';
import { rematch } from '../core/trials';
import { type VehicleType, isHeavy } from '../core/vehicle';
import { type Vec2, v, add, mul, fromAngle } from '../core/vec2';
import { type RenderList, type RenderItem, type Rect, RenderList as List, R, rect, pinned, drawText } from './render';
import type { ColorToken } from './theme';
import { MenuKit } from './menukit';
import { type At, moneyTag, pen, drawFitted } from './icons';
import { drawCondition, iconClock } from './conditionIcons';
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
  learner: 'learnerSign',
  bus: 'juiceYellow',
  oversize: 'vehicleOversize',
  racer: 'vehicleRacer',
  wedding: 'vehicleWedding',
  drift: 'lightRed',
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
      case 'fail':
        return 'destructive';
    }
  },

  /** Shown so far / all, for a shelf's heading. */
  count(career: Career, shelf: MuseumShelf): { shown: number; all: number } {
    const entries = shelfEntries(shelf);
    return { shown: entries.filter((e) => seen(career, e)).length, all: entries.length };
  },

  /** One entry in its cell: a boss row or a card, with the NEW badge and the ring when chosen. */
  addEntry(list: RenderList, entry: MuseumEntry, r: Rect, career: Career, state: MuseumState, time: number, o: number, reduceMotion = false): void {
    const id = museumId(entry);
    const c = R.center(r);
    const fresh = career.museumNew.includes(id);
    if (state.selected === id) list.s(rect(c, v(R.width(r) + 4, R.height(r) + 4), ShopPage.corner + 2), 'accent', 0.9 * o);
    // A new entry has earned its place: it sits in a warm glow until it has been seen.
    if (fresh) {
      const pulse = reduceMotion ? 1 : 0.84 + 0.16 * Math.sin(time * 2.4);
      MenuKit.glow(list, c, Math.min(R.width(r), R.height(r)) * 0.52, 'coin', 0.16 * pulse * o);
    }
    ShopPage.panel(list, r, 'card', o);
    if (entry.k === 'boss') MuseumPage.addBossRow(list, entry.kind, r, career, time, o);
    else MuseumPage.addCard(list, entry, r, career, time, o, reduceMotion);
    if (fresh) {
      const at = v(r.minX + 22, r.minY + 12);
      list.s(rect(at, v(30, 15), 7.5), 'coin', o);
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
    drawFitted(list, title, v(x, c.y - 16), 14, r.maxX - right - x, beaten ? 'coin' : shown ? 'primary' : 'muted', { opacity: o, weight: 'bold' });
    const at = firstPlace(entry, baseConfig);
    const lineText = shown ? S.museum.line(entry) : S.museum.firstAt(at.level, at.rank);
    drawFitted(list, lineText, v(x, c.y + 3), 11, r.maxX - 16 - x, 'muted', { opacity: o });
    const status = beaten ? S.boss.beaten : shown ? S.museum.met : S.museum.notSeen;
    drawText(list, status, v(x, c.y + 21), 11, beaten ? 'accent' : 'muted', { opacity: o, weight: 'bold' });
    if (!beaten) return;
    if (won) drawText(list, S.trials.passed, v(r.maxX - 16, c.y - 16), 12, 'accent', { opacity: o, weight: 'bold', align: 'trailing' });
    else moneyTag(list, Fmt.number(match.reward), v(r.maxX - 16, c.y - 16), 13, 'trailing', 'primary', 'accent', o);
    drawText(list, `${S.museum.rematch} ›`, v(r.maxX - 16, c.y + 21), 11, won ? 'muted' : 'coin', { opacity: o, weight: 'bold', align: 'trailing' });
  },

  /** A card: the picture on top, the name and one line below. */
  addCard(list: RenderList, entry: MuseumEntry, r: Rect, career: Career, time: number, o: number, reduceMotion = false): void {
    const shown = seen(career, entry);
    const c = R.center(r);
    const scale = Math.min(1, R.height(r) / 118);
    // The picture plays once as the card comes into view, and again under the mouse.
    const t = shown && !reduceMotion ? iconClock(`card:${museumId(entry)}`, time, 'once', list.pointer !== null && R.contains(r, list.pointer)) : Infinity;
    MuseumPage.art(list, entry, v(c.x, r.minY + R.height(r) * 0.38), scale, shown, time, o, R.width(r) - 24, t);
    const name = shown ? S.museum.name(entry) : S.museum.unknown;
    drawFitted(list, name, v(c.x, r.maxY - 30), 13, R.width(r) - 12, shown ? 'primary' : 'muted', { opacity: o, weight: 'bold', align: 'center' });
    const at = firstPlace(entry, baseConfig);
    const lineText = shown ? S.museum.line(entry) : at.rank > 0 || at.level > 1 ? S.museum.firstAt(at.level, at.rank) : S.museum.notSeen;
    drawFitted(list, lineText, v(c.x, r.maxY - 13), 10, R.width(r) - 10, 'muted', { opacity: o, align: 'center' });
  },

  /**
   * The picture: a vehicle drawn with the game's own art and turned a little (a boss ahead of
   * its escorts), or the icon of a condition. Not on show yet, it is a flat grey silhouette:
   * one opaque grey, so no part shows through.
   */
  art(list: RenderList, entry: MuseumEntry, center: Vec2, scale: number, shown: boolean, time: number, opacity: number, room = 88, t = Infinity): void {
    const drawn = entry.k === 'boss' || entry.k === 'special' ? MuseumPage.vehicles(list, entry, center, scale, shown, time, room) : MuseumPage.icon(list, entry, center, scale, room, t);
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
    const cars: { type: VehicleType; at: Vec2; look: Look | null; boss: BossKind | null }[] = [];
    let length: number;
    if (entry.k === 'boss') {
      // The boss in front, its escorts behind it along its heading, the whole convoy centred.
      const followers = BOSS_FOLLOWERS[entry.kind](c);
      const escorts = followers.count;
      const step = c.carLength * 1.12;
      length = c.carLength + escorts * step;
      const front = mul(ahead, (escorts * step) / 2);
      cars.push({ type: 'pickup', at: front, look: SYNDICATE_BOSS, boss: entry.kind });
      for (let i = 1; i <= escorts; i++) {
        const at = add(front, mul(ahead, -i * step));
        if (followers.look === 'twin') cars.push({ type: 'pickup', at, look: SYNDICATE_BOSS, boss: entry.kind });
        else cars.push({ type: 'van', at, look: followers.look === 'disguised' ? SYNDICATE_BOSS : SYNDICATE_ESCORT, boss: entry.kind === 'decoy' ? entry.kind : null });
      }
    } else {
      const type = entry.kind as VehicleType;
      length = isHeavy(type) ? Math.max(c.truckLength, CarArt.length(type, c)) : CarArt.length(type, c);
      cars.push({ type, at: v(0, 0), look: null, boss: null });
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
          boss: car.boss,
        },
        c,
      );
    });
    return preview.items.map((it) => pinned(it, preview.camera, 1));
  },

  /** A condition's icon; its parts play on the clock `t` (`Motion`), `Infinity` draws it still. */
  icon(list: RenderList, entry: Exclude<MuseumEntry, { k: 'boss' | 'special' }>, center: Vec2, scale: number, room: number, t = Infinity): RenderItem[] {
    const u = Math.min(1.05 * scale, room / 66);
    const at: At = (x, y) => add(center, v(x * u, y * u));
    const icon = new List(list.camera, list.background);
    drawCondition(entry.k === 'road' ? 'road' : entry.kind, pen(icon, u), at, t);
    return icon.items;
  },
};
