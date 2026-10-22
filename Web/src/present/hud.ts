import type { World } from '../core/world';
import type { Arm } from '../core/roundabout';
import type { ShiftResult } from '../core/events';
import type { GameMode, StreakMilestone } from '../core/career';
import type { EliteBar } from '../core/elite';
import type { SwipeMode } from './flow';
import type { CityEvent } from '../core/config';
import { Scoring } from '../core/scoring';
import { secureZone } from '../core/specials';
import { clearZone } from '../core/ambulance';
import { learnerZone } from '../core/learner';
import { oversizeZone } from '../core/oversize';
import { weddingZone } from '../core/wedding';
import { type Vec2, v, add, sub, mul, fromAngle, TAU, clamp } from '../core/vec2';
import { type RenderList, type Rect, type Primitive, R, rect, circle, arc, line, polygon, text, Ease, Metrics, toScreen, moved, type Align, type Weight } from './render';
import type { ColorToken } from './theme';
import { MenuKit } from './menukit';
import { AdPill } from './adPill';
import { touchFirst } from '../storage/device';
import { moneyTag, moneyTagWidth, money, coinSize, flameTag, textWidth, drawFitted, trophy } from './icons';
import { measure } from './measure';
import { S, Fmt, money as moneyText, comboMultiplier } from './strings';
import { interpolatedPose } from './scene';
import { wrapText } from './upgrades';
import type { Brief, BriefView } from './briefing';
import { currentLanguage } from './i18n';

// MARK: Top bar

/**
 * The one floating card of chrome at the top: MONEY · CARS/SCORE · BEST. It is the dock's twin (`--tabbar-h` in `ui/shell.css`):
 * the same capsule, height, side margin and widest width, so the two read as one pair; a lit column is a capsule inside it.
 */
export const TopBar = {
  margin: 12,
  top: 8,
  height: 56,
  corner: 28,
  /** A card of several lines under the bar cannot be a capsule: its text would run into the curve. */
  cardCorner: 20,
  scrim: 96,
  captionRow: 17,
  valueRow: 37,
  /** A value with no caption over it (money, the best) sits on the card's middle line. */
  midRow: 28,
  /** The lit column's capsule: 6 points from the card's edge all round, as the selected tab sits in the dock. */
  litInset: 6,

  /** On a wide screen the card keeps the dock's width, centred over the ring. */
  maxWidth: 440,
  frame(width: number): Rect {
    const w = Math.min(width - 2 * TopBar.margin, TopBar.maxWidth);
    const left = (width - w) / 2;
    return R.make(left, TopBar.top, left + w, TopBar.top + TopBar.height);
  },

  columns(frame: Rect): { left: Rect; center: Rect; right: Rect } {
    const side = R.width(frame) * 0.3;
    const left = R.make(frame.minX, frame.minY, frame.minX + side, frame.maxY);
    const right = R.make(frame.maxX - side, frame.minY, frame.maxX, frame.maxY);
    return { left, center: R.make(left.maxX, frame.minY, right.minX, frame.maxY), right };
  },

  /** Where chrome under the card starts: the card's foot, lower while it carries a notice. */
  foot: (list: RenderList): number => TopBar.frame(list.camera.viewport.x).maxY + list.topGrow,

  column(point: Vec2, width: number): 'left' | 'center' | 'right' | null {
    const frame = TopBar.frame(width);
    if (!R.contains(frame, point)) return null;
    const cols = TopBar.columns(frame);
    if (R.contains(cols.left, point)) return 'left';
    return R.contains(cols.right, point) ? 'right' : 'center';
  },

  /** One smooth fade from the page colour at the very top edge to clear: no steps, nothing below the card's reach. */
  addScrim(list: RenderList): void {
    const { tag, fade } = list;
    list.tag = 'topbarScrim';
    list.fade = true;
    list.s(rect(v(list.camera.viewport.x / 2, TopBar.scrim / 2), v(list.camera.viewport.x + 80, TopBar.scrim)), list.background, 0.85);
    list.tag = tag;
    list.fade = fade;
  },

  /** `brief`: a briefing shows on the card; its colour edges the card and the column lines give way. */
  addCard(list: RenderList, frame: Rect, opacity = 1, brief: BriefView | null = null): void {
    const tag = list.tag;
    list.tag = 'topbarCard';
    const grown = R.make(frame.minX, frame.minY, frame.maxX, frame.maxY + list.topGrow);
    MenuKit.chromePanel(list, grown, TopBar.corner, opacity, brief ? brief.brief.color : null, brief ? brief.card : 1);
    // No dividers: one lit capsule (the dock's selected tab) rests on the middle column. Under the mouse it glides to the column
    // there, widening or narrowing on the way, and back; money and the best stand quietly either side of it.
    const cols = TopBar.columns(frame);
    const shown = opacity * (1 - (brief?.card ?? 0));
    const stops = [cols.left, cols.center, cols.right];
    const at = Math.min(2, Math.max(0, list.topLit));
    const from = stops[Math.floor(at)];
    const to = stops[Math.min(2, Math.floor(at) + 1)];
    const k = at - Math.floor(at);
    const lit = R.inset(R.make(from.minX + (to.minX - from.minX) * k, from.minY, from.maxX + (to.maxX - from.maxX) * k, from.maxY), TopBar.litInset);
    list.s(rect(R.center(lit), v(R.width(lit), R.height(lit)), R.height(lit) / 2), 'controlFill', 0.6 * shown);
    list.tag = tag;
  },

  /** How far the numbers and a briefing glide while they cross over (points). */
  briefTravel: 6,

  /** Numbers and words never share the card: the numbers leave in the first half of the swap (`card` 0–1), the words arrive in the second. */
  numbersOut: (card: number): number => Ease.clamp01(card * 2),
  wordsIn: (card: number): number => Ease.clamp01(card * 2 - 1),

  /**
   * A briefing on the card (`Briefings`): what it is, small and in its colour, then what to do,
   * on one line if it fits, else on two in a smaller size. A briefing with a time limit wears a
   * thin line along the card's foot that runs down with it.
   */
  addBrief(list: RenderList, frame: Rect, view: BriefView, reduceMotion: boolean, textScale = 1): void {
    const alpha = TopBar.wordsIn(view.card) * view.words;
    if (alpha <= 0.001) return;
    const drop = reduceMotion ? 0 : (1 - view.card) * TopBar.briefTravel;
    const pad = 16;
    const width = R.width(frame) - 2 * pad;
    const x = frame.minX + pad;
    const { size, lines } = TopBar.fitBrief(view.brief.text, width, textScale);
    const lineHeight = size * 1.2;
    const captionSize = 10;
    const gap = 4;
    const block = captionSize + gap + lines.length * lineHeight;
    const top = frame.minY + (TopBar.height - block) / 2 + drop;
    list.s(text(view.brief.caption, v(x, top + captionSize / 2), captionSize, 'leading', 'bold'), view.brief.color, alpha);
    lines.forEach((ln, i) => list.s(text(ln, v(x, top + captionSize + gap + lineHeight * (i + 0.5)), size, 'leading', 'bold'), 'primary', alpha));
    if (view.used !== null && view.used < 1) {
      const inset = TopBar.corner;
      const full = R.width(frame) - 2 * inset;
      const left = full * (1 - view.used);
      const y = frame.maxY - 2;
      list.s(line(v(frame.minX + inset, y), v(frame.minX + inset + left, y), 2), view.brief.color, 0.55 * view.card);
    }
  },

  /** The mode swipe's hint is a briefing of its own (`ReadyBanner`): the card's edge and caption in this colour. */
  swipeBrief: (): Brief => ({ id: 'swipe', caption: S.modes.swipeCaption, text: touchFirst ? S.modes.swipeHint : S.modes.swipeHintKeys, color: 'lightBlue', pending: null }),

  /**
   * A message on the waiting screen's card, like a briefing but centred: its words between two arrows, one in each corner,
   * each gliding out the way a swipe goes and fading as it leaves. A page with no mode beyond it has no arrow on that
   * side (`left`, `right`: there is a mode that way). With Reduce Motion the arrows stand still.
   */
  addMessage(list: RenderList, frame: Rect, view: BriefView, o: { time: number; left: boolean; right: boolean; previous: TopMessage['previous']; reduceMotion: boolean; textScale: number }): void {
    const alpha = TopBar.wordsIn(view.card);
    if (alpha <= 0.001) return;
    const center = R.center(frame);
    const drop = o.reduceMotion ? 0 : (1 - view.card) * TopBar.briefTravel;
    const room = 52;
    const captionSize = 10;
    const gap = 4;
    const words = (brief: Brief, a: number, lift: number): void => {
      const fit = TopBar.fitBrief(brief.text, R.width(frame) - 2 * room, o.textScale);
      const height = fit.size * 1.2;
      const top = frame.minY + (TopBar.height - (captionSize + gap + fit.lines.length * height)) / 2 + drop + lift;
      list.s(text(brief.caption, v(center.x, top + captionSize / 2), captionSize, 'center', 'bold'), brief.color, a);
      fit.lines.forEach((ln, i) => list.s(text(ln, v(center.x, top + captionSize + gap + height * (i + 0.5)), fit.size, 'center', 'bold'), 'primary', a));
    };
    // One message hands over to the next in turn, never on top of each other: the old words lift away, then the new ones rise in.
    const travel = o.reduceMotion ? 0 : 4;
    if (o.previous) {
      const gone = Ease.clamp01(o.previous.alpha * 2 - 1);
      const coming = Ease.clamp01(1 - o.previous.alpha * 2);
      words(o.previous.brief, alpha * gone, -travel * (1 - gone));
      words(view.brief, alpha * coming, travel * (1 - coming));
    } else words(view.brief, alpha, 0);
    const arrow = (side: -1 | 1): void => {
      const cycle = (o.time * 0.8) % 1;
      const glide = o.reduceMotion ? 0.5 : Ease.outCubic(cycle);
      const fade = o.reduceMotion ? 1 : Math.sin(Math.PI * cycle);
      const x = (side < 0 ? frame.minX + 26 : frame.maxX - 26) + side * 9 * glide;
      const y = center.y + drop;
      const tip = v(x + side * 4, y);
      list.s(line(add(tip, v(-side * 7, -7)), tip, 2.6), view.brief.color, alpha * (0.25 + 0.75 * fade));
      list.s(line(add(tip, v(-side * 7, 7)), tip, 2.6), view.brief.color, alpha * (0.25 + 0.75 * fade));
    };
    if (o.left) arrow(-1);
    if (o.right) arrow(1);
  },

  /** One dot per swipe page along the card's foot; the lit one glides to `at` (a page index, fractional while it moves). */
  addModeDots(list: RenderList, frame: Rect, modes: { count: number; at: number; color: ColorToken }, alpha: number): void {
    if (alpha <= 0.001) return;
    const gap = 10;
    const y = frame.maxY + list.topGrow - 5;
    const x = (i: number): number => R.center(frame).x + (i - (modes.count - 1) / 2) * gap;
    for (let i = 0; i < modes.count; i++) list.s(circle(v(x(i), y), 1.8), 'muted', 0.5 * alpha);
    list.s(circle(v(x(0) + modes.at * gap, y), 2.4), modes.color, alpha);
  },

  /** The briefing's size: one line up to 15 points; else two lines, 13 points or smaller. */
  fitBrief(s: string, width: number, textScale = 1): { size: number; lines: string[] } {
    const single = Math.min(16, 15 * textScale);
    if (textWidth(s, single) <= width) return { size: single, lines: [s] };
    for (let size = 13; size >= 10.5; size -= 0.5) {
      const lines = wrapText(s, width, size, true);
      if (lines.length <= 2) return { size, lines };
    }
    return { size: 10.5, lines: wrapText(s, width, 10.5, true).slice(0, 2) };
  },

  anchor: (col: Rect, a: Align): number => (a === 'leading' ? col.minX + 16 : a === 'center' ? R.center(col).x : col.maxX - 16),

  /** `opacity` is the caption's; the value follows it unless `valueOpacity` says otherwise (a value handing over to another under one caption). */
  addColumn(list: RenderList, col: Rect, a: Align, caption: string, value: string, o: { captionColor?: ColorToken; valueSize?: number; valueColor?: ColorToken; opacity?: number; valueOpacity?: number } = {}): void {
    const x = TopBar.anchor(col, a);
    const opacity = o.opacity ?? 1;
    list.s(text(caption, v(x, col.minY + TopBar.captionRow), 10, a, 'bold'), o.captionColor ?? 'muted', opacity);
    list.s(text(value, v(x, col.minY + TopBar.valueRow), o.valueSize ?? 20, a, 'display'), o.valueColor ?? 'primary', o.valueOpacity ?? opacity);
  },

  /** The best score: a trophy and the number on the middle line, in place of a caption (the trophy is the dock's kind of quiet label). */
  addBest(list: RenderList, col: Rect, value: string, o: { valueColor?: ColorToken; opacity?: number } = {}): void {
    const x = TopBar.anchor(col, 'trailing');
    const opacity = o.opacity ?? 1;
    const size = 20;
    const at = v(x, col.minY + TopBar.midRow);
    list.s(text(value, at, size, 'trailing', 'display'), o.valueColor ?? 'primary', opacity);
    const room = textWidth(value, size, true, true);
    trophy(list, v(x - room - 13, at.y), 14, 'coin', opacity);
  },

  /** `roll`: the amount as an odometer (the live top card); without it the text is set (the result's count-up already moves). */
  addMoneyColumn(list: RenderList, col: Rect, a: Align, amount: string, o: { valueSize?: number; opacity?: number; roll?: { value: number; reduceMotion: boolean }; fitAmount?: string } = {}): void {
    const x = TopBar.anchor(col, a);
    const opacity = o.opacity ?? 1;
    const valueSize = o.valueSize ?? 20;
    const room = R.width(col) - 24;
    // The coin and its gap are part of the value too. Measuring only the digits let a growing
    // balance trespass into the middle column. A result count-up also fits to its final value,
    // so its type stays the same size from the first number to the last.
    const natural = moneyTagWidth(o.fitAmount ?? amount, valueSize, true);
    const size = natural <= room ? valueSize : Math.max(11, (valueSize * room) / natural);
    const at = v(x, col.minY + TopBar.midRow);
    if (!o.roll || a !== 'leading') return moneyTag(list, amount, at, size, a, 'primary', 'accent', opacity, 'display');
    const note = coinSize(size);
    money(list, v(at.x + note / 2, at.y), note, 'accent', opacity);
    addOdometer(list, moneyOdometer, o.roll.value, v(at.x + note + size * 0.34, at.y), size, 'primary', o.roll.reduceMotion, 'leading');
  },
};

// MARK: Popups

export type PopupKind =
  | { k: 'tightFit' }
  | { k: 'nearMiss' }
  | { k: 'perfect' }
  | { k: 'cutOff' }
  | { k: 'penalty'; n: number }
  | { k: 'dispatch' }
  /** A Critical Merge: its points, already multiplied. */
  | { k: 'critical'; n: number }
  /** A Jackpot got through: the one payout told in words, the rest is a gold wave on the ring. */
  | { k: 'jackpotPaid'; n: number }
  | { k: 'earned'; n: number }
  | { k: 'cost'; n: number }
  | { k: 'covered' }
  | { k: 'modulePulse'; color: ColorToken }
  | { k: 'flames'; n: number; chain: number }
  | { k: 'boom' }
  /** A close shave past a motorbike: its bonus points. */
  | { k: 'shave'; n: number }
  /** The Chain Saver left a chain alone. */
  | { k: 'chainHeld' };

export interface Popup {
  serial: number;
  kind: PopupKind;
  position: Vec2;
  age: number;
}

export const POPUP_LIFETIME = 0.9;
/** The fail icon's size on the result (`FAIL_CHIP_SIZE`); here so the HUD need not import `readyScreen`, which would close an import cycle. */
export const FAIL_CHIP_SIZE = 46;

/** How far each small HUD change has come, 0 → 1 (Leo: "so smooth wie möglich"). */
export interface Pops {
  cars: number;
  rushHour: number;
  strike: number;
  money: number;
  policeCrash: number;
}

export const settledPops = (): Pops => ({ cars: 1, rushHour: 1, strike: 1, money: 1, policeCrash: 1 });

/** Scale of something that lands: larger at 0, a little under at the swing, 1 at the end. */
export const land = (x: number, amount: number): number => (x >= 1 ? 1 : 1 + amount * (1 - Ease.spring(x)));

/**
 * The score as an odometer (Leo, 18.10.2026): a digit that changed rolls up into place while the old one rises away,
 * the lowest digit first, like a counter carrying. No window cuts the digits: they fade at the top and bottom, so the
 * card keeps its soft edges. A score that went down (a new shift) is just set.
 */
interface Odometer {
  value: number | null;
  was: number;
  since: number;
  seen: number;
}

const newOdometer = (): Odometer => ({ value: null, was: 0, since: -Infinity, seen: -Infinity });
const scoreOdometer = newOdometer();
const moneyOdometer = newOdometer();
const ODOMETER_ROLL = 0.42;
const ODOMETER_CARRY = 0.06;
/** A number that was not on screen for this long is just set, not rolled (the next shift opens on the money it ended with). */
const ODOMETER_AWAY = 0.25;

/** The score's weight under tension (Leo, 18.10.2026): calm digits are a touch lighter, so the heaviest weight is kept for the moments that earn it. Steps of 20 keep the font count small. */
export const heft = (tension: number): number => Math.round((740 + 160 * Ease.clamp01(tension)) / 20) * 20;

function addOdometer(list: RenderList, odometer: Odometer, value: number, at: Vec2, size: number, color: ColorToken, reduceMotion: boolean, align: 'center' | 'leading' = 'center', wght = 900): void {
  const now = performance.now() / 1000;
  if (odometer.value === null || now - odometer.seen > ODOMETER_AWAY) {
    odometer.value = value;
    odometer.was = value;
  } else if (value !== odometer.value) {
    odometer.was = value < odometer.value ? value : odometer.value;
    odometer.value = value;
    odometer.since = now;
  }
  odometer.seen = now;
  const to = Fmt.number(value);
  const from = Fmt.number(odometer.was).padStart(to.length, ' ');
  const digit = measure('0', size, true, true, wght);
  const widths = [...to].map((ch) => (ch >= '0' && ch <= '9' ? digit : measure(ch, size, true, true, wght)));
  let x = align === 'center' ? at.x - widths.reduce((a, b) => a + b, 0) / 2 : at.x;
  const rise = size * 0.5;
  [...to].forEach((ch, i) => {
    const center = v(x + widths[i] / 2, at.y);
    x += widths[i];
    const old = from[from.length - to.length + i] ?? ' ';
    const k = Ease.settle((now - odometer.since - (to.length - 1 - i) * ODOMETER_CARRY) / ODOMETER_ROLL);
    if (reduceMotion || old === ch || k >= 1) {
      list.s(text(ch, center, size, 'center', 'display', wght), color);
      return;
    }
    if (old !== ' ') list.s(text(old, add(center, v(0, -rise * k)), size, 'center', 'display', wght), color, Math.max(0, 1 - k * 1.6));
    list.s(text(ch, add(center, v(0, rise * (1 - k))), size, 'center', 'display', wght), color, Math.min(1, k * 1.4));
  });
}

// MARK: HUD

export interface HudInput {
  world: World;
  level: number;
  score: number;
  money: number;
  best: string | null;
  comboPop: number;
  race: { delta: number; pop: number } | null;
  /** The best in sight (`Goals.record`): the points still missing, below 0 once beaten. It takes the best's column, ahead of `race`. */
  record?: { gap: number; pop: number } | null;
  /** Unlimited: the mark just passed ("100 cars · GOLD"), shown in place of the car count for a moment. */
  mark: string | null;
  pops: Pops;
  flames: number;
  flamePop: number;
  /** The camera's tension (0–1): the score's digits grow heavier with it (`heft`). */
  tension?: number;
  /** Something new and what to do about it: it takes the top card's place for a while. */
  brief?: BriefView | null;
  reduceMotion?: boolean;
  textScale?: number;
}

/** The in-game HUD: the top card, the combo on the island, the specials. */
/** A plus sign, one shape (no overlap that a faint one would show), `size` across. */
export function plusSign(at: Vec2, size: number): Primitive {
  const a = size / 2;
  const b = size * 0.18;
  const corners: [number, number][] = [[-b, -a], [b, -a], [b, -b], [a, -b], [a, b], [b, b], [b, a], [-b, a], [-b, b], [-a, b], [-a, -b], [-b, -b]];
  return polygon(corners.map(([x, y]) => v(at.x + x, at.y + y)));
}

export const HUD = {
  add(list: RenderList, h: HudInput): void {
    if (h.world.config.mayhem) {
      HUD.addMayhem(list, h);
      return;
    }
    HUD.addTopCard(list, h);
    if (h.world.config.endless) {
      const frame = TopBar.frame(list.camera.viewport.x);
      const label = h.mark ?? S.modes.carsSent(h.world.shift.carsSent);
      const at = v(R.center(frame).x, TopBar.foot(list) + 18);
      MenuKit.chromePill(list, at, v(textWidth(label, 12) + 28, 26), 1);
      list.s(text(label, at, 12 * land(h.pops.cars, 0.2), 'center', 'bold'), 'primary');
    }
  },

  /** A trial's counting goal under the top card, live ("Tight Fits or better 3/5"); accent once met. */
  addGoalPill(list: RenderList, label: string, met: boolean, pop: number): void {
    const frame = TopBar.frame(list.camera.viewport.x);
    const at = v(R.center(frame).x, TopBar.foot(list) + 18);
    MenuKit.chromePill(list, at, v(textWidth(label, 12) + 28, 26), 1, met ? 'accent' : undefined);
    list.s(text(label, at, 12 * land(pop, 0.2), 'center', 'bold'), met ? 'accent' : 'primary');
  },

  activeChain(world: World): number {
    const last = world.score.lastCrashAt;
    if (last === null || world.time - last > world.config.mayhemChainWindow) return 0;
    return world.score.crashChain;
  },

  addMayhem(list: RenderList, h: HudInput): void {
    TopBar.addScrim(list);
    const frame = TopBar.frame(list.camera.viewport.x);
    const cols = TopBar.columns(frame);
    TopBar.addCard(list, frame);
    list.tag = 'topbarLabels';
    TopBar.addColumn(list, cols.left, 'leading', S.mayhem.cars, Fmt.number(h.world.carsLeft ?? 0), { valueSize: 20 * land(h.pops.cars, 0.12) });
    const chain = HUD.activeChain(h.world);
    const c = cols.center;
    if (chain > 1) {
      const inset = R.inset(c, TopBar.litInset);
      list.s(rect(R.center(inset), v(R.width(inset), R.height(inset)), R.height(inset) / 2), 'fireOuter', 0.28);
    }
    list.s(text(chain > 1 ? S.mayhem.chain(chain) : S.mayhem.flames, v(R.center(c).x, c.minY + TopBar.captionRow), 10, 'center', 'bold'), chain > 1 ? 'fireCore' : 'muted');
    flameTag(list, Fmt.number(h.flames), v(R.center(c).x, c.minY + TopBar.valueRow), Metrics.timerSize * land(h.flamePop, 0.3), 'center', 'primary', 1, 'display');
    TopBar.addBest(list, cols.right, h.best ?? '–', { valueColor: h.best === null ? 'muted' : 'primary' });
    list.tag = undefined;
    if (chain > 1) {
      const island = toScreen(list.camera, v(0, 0));
      list.s(text(`×${chain}`, island, Metrics.multiplierSize * (1 + 0.25 * (1 - Ease.clamp01(h.flamePop))), 'center', 'bold'), 'fireCore');
      list.s(text(S.mayhem.chain(chain), add(island, v(0, 36)), Metrics.comboLabelSize, 'center', 'bold'), 'fireOuter');
    }
  },

  addTopCard(list: RenderList, h: HudInput): void {
    const world = h.world;
    const brief = h.brief ?? null;
    TopBar.addScrim(list);
    const frame = TopBar.frame(list.camera.viewport.x);
    const cols = TopBar.columns(frame);
    TopBar.addCard(list, frame, 1, brief);
    list.tag = 'topbarLabels';
    const numbers = list.items.length;
    TopBar.addMoneyColumn(list, cols.left, 'leading', Fmt.number(h.money), { valueSize: 20 * land(h.pops.money, 0.15), roll: { value: h.money, reduceMotion: h.reduceMotion ?? false } });
    const c = cols.center;
    const tick = land(h.pops.cars, 0.12);
    const rush = world.shift.rushHourSince !== null;
    if (rush) {
      const open = Ease.spring(h.pops.rushHour);
      const inset = R.inset(c, TopBar.litInset);
      const grown = 0.7 + 0.3 * open;
      const lit = v(R.width(inset) * grown, R.height(inset) * grown);
      list.s(rect(R.center(inset), add(lit, v(10, 10)), lit.y / 2 + 5), 'rushHour', 0.16 * Ease.outCubic(h.pops.rushHour / 0.4));
      list.s(rect(R.center(inset), lit, lit.y / 2), 'rushHour', Ease.outCubic(h.pops.rushHour / 0.4));
    }
    addOdometer(list, scoreOdometer, h.score, v(R.center(c).x, c.minY + TopBar.valueRow), Metrics.timerSize * tick, rush ? 'accentInk' : 'primary', h.reduceMotion ?? false, 'center', heft(h.tension ?? 0));

    // What still forgives a crash, as the heal's plus signs (Leo, 08.10.2026): green the Shield's, blue the police's.
    const pluses: { used: boolean; color: ColorToken }[] = [];
    const shields = Number.isFinite(world.config.maxStrikes) ? world.config.maxStrikes - 1 : 0;
    for (let i = 0; i < shields; i++) pluses.push({ used: i < world.score.strikes, color: 'juiceGreen' });
    const firstPolice = pluses.length;
    const policeCrashes = world.config.policeShare > 0 || world.config.dispatchLimit > 0 ? world.config.maxPoliceCrashes : 0;
    for (let i = 0; i < policeCrashes; i++) pluses.push({ used: i < world.score.policeCrashes, color: 'lightBlue' });
    const groupGap = firstPolice > 0 && pluses.length > firstPolice ? 0.5 : 0;
    const span = pluses.length - 1 + groupGap;
    // The pluses sit centred in the column on their own, sized down so any count stays inside it.
    const fit = Math.min(1, (R.width(c) - 24) / (span * Metrics.strikeSpacing + Metrics.strikeSize));
    const size = Metrics.strikeSize * fit;
    const spacing = Metrics.strikeSpacing * fit;
    const plusesW = span * spacing + size;
    const firstPlus = R.center(c).x - plusesW / 2 + size / 2;
    pluses.forEach((p, index) => {
      const slot = index + (index >= firstPolice ? groupGap : 0);
      const at = v(firstPlus + slot * spacing, Metrics.strikeRow);
      const isNewest = index < firstPolice ? index === world.score.strikes - 1 : index - firstPolice === world.score.policeCrashes - 1;
      const pop = isNewest && p.used ? (index < firstPolice ? h.pops.strike : h.pops.policeCrash) : 1;
      if (p.used) {
        // Spent: it lifts off in its colour and leaves a faint grey one behind.
        if (pop < 1) {
          const x = Ease.outCubic(pop);
          list.s(plusSign(add(at, v(0, -6 * x)), size * (1 + 0.6 * x)), p.color, 1 - x);
        }
        list.s(plusSign(at, size), rush ? 'accentInk' : 'muted', 0.35 * Ease.clamp01(pop / 0.4));
        return;
      }
      list.s(plusSign(at, size), p.color);
    });

    if (h.record) {
      const beaten = h.record.gap < 0;
      TopBar.addColumn(list, cols.right, 'trailing', beaten ? S.hud.newBest : S.hud.toBest, beaten ? `+${Fmt.number(-h.record.gap)}` : Fmt.number(h.record.gap), {
        valueSize: 20 * land(h.record.pop, 0.2),
        captionColor: beaten ? 'accent' : 'hazard',
        valueColor: beaten ? 'accent' : 'hazard',
      });
    } else if (h.race) {
      TopBar.addColumn(list, cols.right, 'trailing', S.race.best, S.race.delta(h.race.delta), {
        valueSize: 18 * land(h.race.pop, 0.15),
        valueColor: h.race.delta <= 0 ? 'accent' : 'destructive',
      });
    } else TopBar.addBest(list, cols.right, h.best ?? '–', { valueColor: h.best === null ? 'muted' : 'primary' });
    if (brief) {
      // The numbers fade and lift away while the briefing settles in from below, and back.
      const shown = brief.card;
      if (shown >= 0.999) list.items.length = numbers;
      else {
        const lift = v(0, h.reduceMotion ? 0 : -TopBar.briefTravel * shown);
        for (let i = numbers; i < list.items.length; i++) list.items[i] = moved(list.items[i], lift, 1 - TopBar.numbersOut(shown));
      }
      TopBar.addBrief(list, frame, brief, h.reduceMotion ?? false, h.textScale ?? 1);
    }
    list.tag = undefined;
    HUD.addIsland(list, world, h.comboPop);
  },

  /** Back after an interruption: the world stands still and counts in. */
  addCountIn(list: RenderList, secondsLeft: number): void {
    const vp = list.camera.viewport;
    list.s(rect(mul(vp, 0.5), vp), 'background', 0.55);
    const center = toScreen(list.camera, v(0, 0));
    const count = Math.max(1, Math.ceil(secondsLeft));
    const within = secondsLeft - (count - 1);
    const size = 64 * (1 + 0.18 * (1 - Ease.outCubic(Ease.clamp01((1 - within) / 0.35))));
    list.s(text(String(count), center, size, 'center', 'bold'), 'primary');
  },

  addIsland(list: RenderList, world: World, pop: number): void {
    const c = world.config;
    const center = toScreen(list.camera, v(0, 0));
    const tier = Scoring.tier(world.score.combo, c);
    const top = tier > 0 && tier === Math.min(c.comboThresholds.length, c.comboMultipliers.length);
    const color: ColorToken = tier === 0 ? 'muted' : top ? 'accent' : 'primary';
    const size = Metrics.multiplierSize * (1 + 0.16 * Math.sin(Math.PI * Ease.outCubic(pop)));
    list.s(text(comboMultiplier(Scoring.multiplierOfTier(tier, c)), center, size, 'center', 'bold'), color);
    if (world.score.combo > 0) list.s(text(S.hud.combo(world.score.combo), add(center, v(0, 34)), Metrics.comboLabelSize, 'center', 'bold'), 'muted');
    HUD.addComboProgress(list, world, add(center, v(0, 50)));
    if (world.shift.isRushHour) list.s(text(S.hud.rushFactor(c.rushHourScoreFactor), add(center, v(0, -38)), Metrics.comboLabelSize, 'center', 'bold'), 'rushHour');
    if (world.criminal.kind === 'active') {
      const left = world.criminal.deadline - world.time;
      const boss = world.vehicle(world.criminal.vehicle)?.role === 'boss';
      list.s(text(boss ? S.boss.wanted(left) : S.hud.wanted(left), add(center, v(0, -64)), 17, 'center', 'bold'), boss ? 'coin' : 'vehicleCriminal');
    }
  },

  /**
   * How far the combo is towards the next multiplier: a short bar under the combo, so the next
   * step is always in sight. Gone at the top multiplier.
   */
  addComboProgress(list: RenderList, world: World, at: Vec2): void {
    const c = world.config;
    const combo = world.score.combo;
    const count = Math.min(c.comboThresholds.length, c.comboMultipliers.length);
    const tier = Scoring.tier(combo, c);
    if (combo <= 0 || tier >= count) return;
    const from = tier === 0 ? 0 : c.comboThresholds[tier - 1];
    const to = c.comboThresholds[tier];
    const share = Ease.clamp01((combo - from) / Math.max(1, to - from));
    const width = 56;
    const height = 3;
    list.s(rect(at, v(width, height), height / 2), 'marking', 0.5);
    if (share > 0) list.s(rect(v(at.x - width / 2 + (width * share) / 2, at.y), v(width * share, height), height / 2), 'accent', 0.9);
  },

  /**
   * At night the ring's colours are light, not paint: every shape drawn since `from` gets two soft halos of its own
   * colour, wider and fainter, so it glows into the dark the way coloured light does.
   */
  bloom(list: RenderList, from: number): void {
    const halos: [number, number][] = [
      [5, 0.26],
      [13, 0.1],
    ];
    const lit = list.items.slice(from).filter((it) => it.space === 'world' && it.opacity > 0.04);
    for (const it of lit) {
      const p = it.p;
      for (const [grow, fade] of halos) {
        const opacity = it.opacity * fade;
        if (p.k === 'arc') list.w({ ...p, thickness: p.thickness + grow }, it.color, opacity);
        else if (p.k === 'line') list.w({ ...p, thickness: p.thickness + grow }, it.color, opacity);
        else if (p.k === 'circle') list.w({ ...p, radius: p.radius + grow / 2 }, it.color, opacity);
        else if (p.k === 'rect') list.w({ ...p, size: add(p.size, v(grow, grow)), radius: p.radius + grow / 2 }, it.color, opacity);
      }
    }
  },

  addWedge(list: RenderList, armItem: Arm, world: World, color: ColorToken): void {
    RingSignals.wedge(list, RingSignals.rim(world), armItem.angle, (world.time * 1.6) % 1, color);
  },

  countdownRing(list: RenderList, at: Vec2, radius: number, left: number, color: ColorToken, label: string, labelSize = 14, labelOpacity = 1): void {
    list.w(arc(at, radius, 1, 0, TAU), color, 0.3);
    if (left > 0.001) list.w(arc(at, radius, 3, Math.PI / 2, Math.PI / 2 + TAU * left, true), color);
    const s = toScreen(list.camera, at);
    list.s(text(label, add(s, v(0, -radius * list.camera.scale - 12)), labelSize, 'center', 'bold'), color, labelOpacity);
  },

  addChase(list: RenderList, world: World, alpha: number): void {
    const cr = world.criminal;
    if (cr.kind === 'warning') HUD.addWedge(list, cr.arm, world, 'vehicleCriminal');
    else if (cr.kind === 'arriving') {
      const pickup = world.vehicle(cr.vehicle);
      if (pickup) list.w(arc(interpolatedPose(pickup, alpha).position, 20, 2, 0, TAU), 'vehicleCriminal', 0.6);
    } else if (cr.kind === 'active') {
      const pickup = world.vehicle(cr.vehicle);
      if (!pickup || pickup.isCrashed) return;
      const pos = interpolatedPose(pickup, alpha).position;
      const boss = pickup.role === 'boss';
      const time = world.criminalTimeOf(pickup.id);
      HUD.countdownRing(list, pos, boss ? 24 : 20, Math.max(0, cr.deadline - world.time) / time, boss ? 'coin' : 'vehicleCriminal', String(Math.ceil(cr.deadline - world.time)));
    }
  },

  addTransporter(list: RenderList, world: World, alpha: number): void {
    const t = world.transporter;
    // A Jackpot is gold from its warning on: worth protecting, and you know it before it comes.
    const jackpot = t.kind === 'warning' ? world.jackpotDue : t.kind === 'arriving' || t.kind === 'active' ? t.vehicle === world.jackpotVehicle : false;
    const color: ColorToken = jackpot ? 'coin' : 'vehicleCargo';
    if (t.kind === 'warning') HUD.addWedge(list, t.arm, world, color);
    else if (t.kind === 'arriving') {
      const truck = world.vehicle(t.vehicle);
      if (truck) list.w(arc(interpolatedPose(truck, alpha).position, 20, 2, 0, TAU), color, 0.6);
    } else if (t.kind === 'active') {
      const truck = world.vehicle(t.vehicle);
      if (!truck || truck.isCrashed) return;
      const pos = interpolatedPose(truck, alpha).position;
      // Only the seconds: a money sign beside a countdown read like money running out. The gold
      // ring and truck already say it is a Jackpot.
      HUD.countdownRing(list, pos, 20, Math.max(0, t.deadline - world.time) / world.config.transporterTime, color, S.hud.transporterTimer(t.deadline - world.time));
      const zone = secureZone(world);
      if (zone) {
        const ringRadius = world.layout.ringRadius;
        const center = Math.atan2(pos.y, pos.x);
        const half = zone.arc / 2 / ringRadius;
        list.w(arc(v(0, 0), ringRadius + world.config.laneWidth / 2 - 3, 2, center - half, center + half), color, jackpot ? 0.5 : 0.35);
      }
    }
  },

  /**
   * The ambulance: its arm is marked before it comes; on the ring a blue band runs ahead of it
   * over the road that has to stay clear. Once a car blocked it, the band is gone.
   */
  addAmbulance(list: RenderList, world: World, alpha: number): void {
    const a = world.ambulance;
    if (a.kind === 'warning') HUD.addWedge(list, a.arm, world, 'lightBlue');
    else if (a.kind === 'arriving') {
      const veh = world.vehicle(a.vehicle);
      if (veh) list.w(arc(interpolatedPose(veh, alpha).position, 22, 2, 0, TAU), 'lightBlue', 0.6);
    } else if (a.kind === 'active') {
      const veh = world.vehicle(a.vehicle);
      const zone = clearZone(world);
      if (!veh || veh.isCrashed || !zone) return;
      const pos = interpolatedPose(veh, alpha).position;
      const r = world.layout.ringRadius;
      const from = Math.atan2(pos.y, pos.x);
      const to = from + zone.arc / r;
      const pulse = 0.5 + 0.5 * Math.sin(world.time * 5);
      const lane = world.layout.laneWidth / 2 - 3;
      for (const edge of [r - lane, r + lane]) list.w(arc(v(0, 0), edge, 2, from, to), 'lightBlue', 0.3 + 0.25 * pulse);
      list.w(arc(v(0, 0), r, world.layout.laneWidth - 6, from, to), 'lightBlue', 0.06 + 0.04 * pulse);
    }
  },

  /**
   * The learner driver: its arm is marked before it comes; on the ring a green band around it,
   * ahead and behind, shows the space to leave it. Once a car took it, the band is gone.
   */
  addLearner(list: RenderList, world: World, alpha: number): void {
    const l = world.learner;
    if (l.kind === 'warning') HUD.addWedge(list, l.arm, world, 'learnerSign');
    else if (l.kind === 'arriving') {
      const veh = world.vehicle(l.vehicle);
      if (veh) list.w(arc(interpolatedPose(veh, alpha).position, 20, 2, 0, TAU), 'learnerSign', 0.6);
    } else if (l.kind === 'active') {
      const veh = world.vehicle(l.vehicle);
      const zone = learnerZone(world);
      if (!veh || veh.isCrashed || !zone) return;
      const pos = interpolatedPose(veh, alpha).position;
      const r = world.layout.laneRadius(veh.lane);
      const mid = Math.atan2(pos.y, pos.x);
      const half = zone.arc / world.layout.ringRadius;
      const pulse = 0.5 + 0.5 * Math.sin(world.time * 4);
      const lane = world.layout.laneWidth / 2 - 3;
      for (const edge of [r - lane, r + lane]) list.w(arc(v(0, 0), edge, 1.6, mid - half, mid + half), 'learnerSign', 0.25 + 0.2 * pulse);
      list.w(arc(v(0, 0), r, world.layout.laneWidth - 6, mid - half, mid + half), 'learnerSign', 0.05 + 0.03 * pulse);
    }
  },

  /** The oversize load: like the learner, an amber band ahead and behind for the space it needs. */
  addOversize(list: RenderList, world: World, alpha: number): void {
    const o = world.oversize;
    if (o.kind === 'warning') HUD.addWedge(list, o.arm, world, 'vehicleOversize');
    else if (o.kind === 'arriving') {
      const veh = world.vehicle(o.vehicle);
      if (veh) list.w(arc(interpolatedPose(veh, alpha).position, 32, 2, 0, TAU), 'vehicleOversize', 0.6);
    } else if (o.kind === 'active') {
      const veh = world.vehicle(o.vehicle);
      const zone = oversizeZone(world);
      if (!veh || veh.isCrashed || !zone) return;
      const pos = interpolatedPose(veh, alpha).position;
      const r = world.layout.laneRadius(veh.lane);
      const mid = Math.atan2(pos.y, pos.x);
      const half = zone.arc / world.layout.ringRadius;
      const pulse = 0.5 + 0.5 * Math.sin(world.time * 3);
      const lane = world.layout.laneWidth / 2 - 3;
      for (const edge of [r - lane, r + lane]) list.w(arc(v(0, 0), edge, 1.6, mid - half, mid + half), 'vehicleOversize', 0.25 + 0.2 * pulse);
      list.w(arc(v(0, 0), r, world.layout.laneWidth - 6, mid - half, mid + half), 'vehicleOversize', 0.05 + 0.03 * pulse);
    }
  },

  /** The wedding convoy: its arm marked before it comes, then one soft band over all three cars and the room at its ends. */
  addWedding(list: RenderList, world: World): void {
    const o = world.wedding;
    if (o.kind === 'warning') HUD.addWedge(list, o.arm, world, 'vehicleWedding');
    if (o.kind !== 'active') return;
    const zone = weddingZone(world);
    if (!zone) return;
    const radius = world.layout.laneRadius(0);
    const from = zone.start / world.layout.ringRadius;
    const to = from + zone.length / world.layout.ringRadius;
    const pulse = 0.5 + 0.5 * Math.sin(world.time * 3);
    const lane = world.layout.laneWidth / 2 - 3;
    for (const edge of [radius - lane, radius + lane]) list.w(arc(v(0, 0), edge, 1.6, from, to), 'vehicleWedding', 0.3 + 0.2 * pulse);
    list.w(arc(v(0, 0), radius, world.layout.laneWidth - 6, from, to), 'vehicleWedding', 0.06 + 0.04 * pulse);
  },

  /** The street racers: their arm marked before they come, then a pulsing ring round each one on the road. */
  addRace(list: RenderList, world: World, alpha: number): void {
    const r = world.race;
    if (r.kind === 'warning') HUD.addWedge(list, r.arm, world, 'vehicleRacer');
    if (r.kind !== 'arriving' && r.kind !== 'active') return;
    const pulse = 0.5 + 0.5 * Math.sin(world.time * 8);
    for (const id of r.vehicles) {
      const veh = world.vehicle(id);
      if (!veh || veh.isCrashed) continue;
      list.w(arc(interpolatedPose(veh, alpha).position, 17 + 2 * pulse, 2, 0, TAU), 'vehicleRacer', 0.45 + 0.3 * pulse);
    }
  },

  addMilitary(list: RenderList, world: World, alpha: number): void {
    const m = world.military;
    const c = world.config;
    if (m.kind === 'warning') HUD.addWedge(list, m.arm, world, 'lightRed');
    else if (m.kind === 'arriving') {
      const truck = world.vehicle(m.vehicle);
      if (truck) list.w(arc(interpolatedPose(truck, alpha).position, 26, 2, 0, TAU), 'lightRed', 0.6);
    } else if (m.kind === 'active') {
      const truck = world.vehicle(m.vehicle);
      if (!truck || truck.isCrashed) return;
      const pos = interpolatedPose(truck, alpha).position;
      const pulse = 0.5 + 0.5 * Math.sin(world.time * 7);
      const ringRadius = world.layout.ringRadius;
      const center = Math.atan2(pos.y, pos.x);
      const half = c.militaryZoneArc / 2 / ringRadius;
      const lane = c.laneWidth;
      list.w(arc(v(0, 0), ringRadius, lane - 2, center - half, center + half), 'lightRed', 0.12 + 0.1 * pulse);
      for (const edge of [-1, 1]) list.w(arc(v(0, 0), ringRadius + edge * (lane / 2 - 1), 2, center - half, center + half), 'lightRed', 0.75);
      for (const end of [-1, 1]) {
        const angle = center + end * half;
        const inner = mul(fromAngle(angle), ringRadius - lane / 2 + 1);
        const outer = mul(fromAngle(angle), ringRadius + lane / 2 - 1);
        list.w(line(inner, outer, 3.5), 'hazard', 0.95);
        list.w(line(add(inner, mul(sub(outer, inner), 0.3)), add(inner, mul(sub(outer, inner), 0.7)), 3.5), 'bomb', 0.95);
      }
      HUD.countdownRing(list, pos, 26, Math.max(0, m.deadline - world.time) / c.militaryTime, 'lightRed', S.hud.danger, 12, 0.7 + 0.3 * pulse);
    }
  },

  addPrecisionRing(list: RenderList, p: Popup, reduceMotion: boolean): void {
    const isPerfect = p.kind.k === 'perfect';
    const duration = isPerfect ? 0.45 : 0.3;
    if (p.age >= duration) return;
    const x = p.age / duration;
    const radius = reduceMotion ? 16 : 9 + (isPerfect ? 16 : 9) * Ease.outCubic(x);
    list.w(arc(p.position, radius, isPerfect ? 2.5 : 1.5, 0, TAU), isPerfect ? 'accent' : 'muted', (isPerfect ? 0.9 : 0.4) * (1 - x));
  },

  /** A Critical Merge: a gold ring and sparks flying out, quick and rare enough to be loud. */
  addCriticalBurst(list: RenderList, p: Popup, reduceMotion: boolean): void {
    const duration = 0.45;
    if (p.age >= duration) return;
    const x = p.age / duration;
    const out = Ease.outCubic(x);
    const fade = 1 - x;
    list.w(arc(p.position, reduceMotion ? 18 : 10 + 20 * out, 3 * fade + 0.5, 0, TAU), 'coin', 0.9 * fade);
    if (reduceMotion) return;
    const sparks = 10;
    for (let i = 0; i < sparks; i++) {
      const angle = (i / sparks) * TAU + (p.serial % 5) * 0.4;
      const reach = 8 + 30 * out * (0.7 + 0.3 * ((i * 7) % 3) / 2);
      const from = add(p.position, mul(fromAngle(angle), reach));
      list.w(line(from, add(from, mul(fromAngle(angle), 6 * fade)), 1.8), i % 3 === 0 ? 'primary' : 'coin', fade);
    }
  },

  addModulePulse(list: RenderList, p: Popup, color: ColorToken, reduceMotion: boolean): void {
    if (p.age >= 0.5) return;
    const x = p.age / 0.5;
    const fade = 1 - x;
    list.w(arc(p.position, reduceMotion ? 12 : 6 + 14 * Ease.outCubic(x), 2, 0, TAU), color, 0.85 * fade);
    if (reduceMotion) return;
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4 + (p.serial % 7) * 0.3;
      const from = add(p.position, mul(fromAngle(angle), 5 + 14 * Ease.outCubic(x)));
      list.w(line(from, add(from, mul(fromAngle(angle), 4 * fade)), 1.5), color, fade);
    }
  },

  /**
   * The ring glow: grows a little with the combo tier and more in the Flow State. In Flow it steps up every
   * `flowGlowStep` merges more (three steps), and each car sent pulses it (`beat`, 1 → 0): a streak worth keeping.
   */
  addFlowGlow(list: RenderList, world: World, flow: number, beat: number): void {
    const c = world.config;
    const tiers = Math.min(c.comboThresholds.length, c.comboMultipliers.length);
    const tier = Scoring.tier(world.score.combo, c) / Math.max(1, tiers);
    const glow = Math.min(1, 0.3 * tier + 0.7 * flow);
    if (glow <= 0.01) return;
    const stage = world.isInFlow ? Math.min(3, 1 + Math.floor((world.score.chain - c.flowChain) / HUD.flowGlowStep)) : 0;
    const radius = world.layout.islandRadius - 3;
    const lift = (stage / 3) * flow;
    list.w(arc(v(0, 0), radius, 12 + 8 * lift, 0, TAU), 'juiceGreen', 0.12 * glow + 0.08 * lift);
    list.w(arc(v(0, 0), radius, 3 + lift, 0, TAU), 'juiceGreen', Math.min(1, 0.45 * glow + 0.25 * lift + 0.3 * beat * flow));
  },

  flowGlowStep: 5,

  addPopups(list: RenderList, popups: Popup[], reduceMotion: boolean): void {
    const cam = list.camera;
    const placed: { at: Vec2; height: number }[] = [];
    for (const p of popups) {
      const enter = Ease.outCubic(p.age / 0.2);
      const exit = Ease.clamp01((p.age - (POPUP_LIFETIME - 0.3)) / 0.3);
      const opacity = Math.min(enter, 1 - exit);
      const scale = reduceMotion ? 1 : 0.9 + 0.1 * enter;
      const rise = reduceMotion ? 0 : 10 * Ease.outCubic(p.age / POPUP_LIFETIME);
      let label = '';
      let color: ColorToken = 'primary';
      let size = Metrics.popupSize;
      const k = p.kind;
      switch (k.k) {
        case 'nearMiss':
        case 'perfect':
          HUD.addPrecisionRing(list, p, reduceMotion);
          continue;
        case 'modulePulse':
          HUD.addModulePulse(list, p, k.color, reduceMotion);
          continue;
        case 'critical':
          HUD.addCriticalBurst(list, p, reduceMotion);
          label = S.hud.critical(Fmt.signed(k.n));
          color = 'coin';
          size = Metrics.popupSize * 1.15 * (reduceMotion ? 1 : land(p.age / 0.3, 0.25));
          break;
        case 'tightFit':
          label = S.hud.tight;
          color = 'accent';
          break;
        case 'cutOff':
          label = S.hud.cutOff;
          color = 'muted';
          break;
        case 'penalty':
          label = Fmt.signed(-k.n);
          color = 'destructive';
          break;
        case 'dispatch':
          label = S.hud.dispatch;
          color = 'lightBlue';
          break;
        case 'jackpotPaid':
          label = S.hud.jackpotPaid(Fmt.signed(k.n));
          color = 'coin';
          size = Metrics.popupSize * 1.3 * (reduceMotion ? 1 : land(p.age / 0.35, 0.3));
          break;
        case 'earned':
          label = Fmt.signed(k.n);
          color = 'accent';
          size = Metrics.popupSize * 0.7;
          break;
        case 'cost':
          label = '−' + moneyText(Fmt.number(k.n));
          color = 'destructive';
          break;
        case 'covered':
          label = S.hud.covered;
          color = 'muted';
          break;
        case 'flames':
          label = S.mayhem.popup(k.n);
          color = k.chain >= 3 ? 'fireCore' : 'fireOuter';
          size = Metrics.popupSize * (1 + 0.15 * Math.min(k.chain, 6));
          break;
        case 'boom':
          label = S.hud.boom;
          color = 'fireCore';
          size = Metrics.popupSize * 1.6;
          break;
        case 'shave':
          label = S.hud.shave(Fmt.signed(k.n));
          color = 'juiceOrange';
          size = Metrics.popupSize * 0.85;
          break;
        case 'chainHeld':
          label = S.hud.chainHeld;
          color = 'juiceGreen';
          size = Metrics.popupSize * 0.85;
          break;
      }
      let at = add(toScreen(cam, p.position), v(0, -30));
      const height = size + 4;
      // Stack above whatever it overlaps. The small tolerance matters: placed exactly on the
      // edge, rounding could find the same popup again and loop forever (a Critical froze the
      // game that way). Each popup is moved above at most once per placed popup.
      for (let tries = 0; tries <= placed.length; tries++) {
        const below = placed.find((q) => Math.abs(q.at.x - at.x) < 56 && Math.abs(q.at.y - at.y) < (q.height + height) / 2 - 0.5);
        if (!below) break;
        at = v(at.x, below.at.y - (below.height + height) / 2);
      }
      // Never half off the screen: a popup at a side arm moves in until it fits.
      const half = textWidth(label, size * scale) / 2 + 12;
      if (half * 2 < cam.viewport.x) at = v(clamp(at.x, half, cam.viewport.x - half), at.y);
      placed.push({ at, height });
      list.s(text(label, add(at, v(0, -rise)), size * scale, 'center', 'bold'), color, opacity);
    }
  },
};

// MARK: Ring signals

/**
 * wave: paid, a ring widens out · miss: a bonus slipped away, a ring pulls back in · flush: a blow to the whole ring ·
 * sweep: something is coming · heal: a crash forgiven · splash: the combo climbed, juice sprays out of the rim ·
 * victory: the shift is done, a light closes the ring and bursts into rings, juice and sparkles.
 */
export type SignalKind = 'wave' | 'miss' | 'flush' | 'sweep' | 'heal' | 'splash' | 'victory';
const SIGNAL_DURATION: Record<SignalKind, number> = { wave: 0.7, miss: 0.7, flush: 0.6, sweep: 1.1, heal: 1.1, splash: 0.85, victory: 1.8 };

interface Signal {
  kind: SignalKind;
  color: ColorToken;
  /** A heal's plus signs take turns between `color` and this one (the police: blue and red); a splash mixes it in. */
  second: ColorToken;
  /** A splash's strength, 0 → 1: how many drops it throws. */
  power: number;
  age: number;
}

/** A moving highlight cuts a brief gap into lower ring strokes at the crossing point. */
interface RingCutout {
  angle: number;
  radius: number;
  thickness: number;
  halfAngle: number;
  signal: number;
  /** 1 while the highlight is at full light, down to 0 as it fades: the gap closes with it instead of popping shut. */
  strength: number;
}

/** Where the signals run: the rim on the island, its start (the player's arm) and the road's outer edge. */
export interface RingFrame {
  rim: number;
  start: number;
  outer: number;
}

/** The island's rim as the game's signal track. */
export class RingSignals {
  static rim = (world: World): number => world.layout.islandRadius - 14;

  /** The glow on the rim in front of an arm a vehicle is about to come from; `phase` runs 0 → 1 and repeats. */
  static wedge(list: RenderList, rim: number, angle: number, phase: number, color: ColorToken): void {
    const half = 0.35;
    list.w(arc(v(0, 0), rim, 3 + 7 * phase, angle - half, angle + half, true), color, 1 - phase);
    list.w(arc(v(0, 0), rim, 2.5, angle - half, angle + half, true), color);
  }

  /** Draw an arc in pieces around moving highlights, so the foreground light has a clean edge. */
  private static ringArc(list: RenderList, radius: number, thickness: number, start: number, end: number, color: ColorToken, opacity: number, cuts: readonly RingCutout[]): void {
    if (opacity <= 0.001 || end - start <= 0.001) return;
    const windows: { from: number; to: number; strength: number }[] = [];
    for (const cut of cuts) {
      if (Math.abs(radius - cut.radius) > (thickness + cut.thickness) / 2 + 0.5) continue;
      for (let turn = -2; turn <= 2; turn++) {
        const center = cut.angle + turn * TAU;
        const from = Math.max(start, center - cut.halfAngle);
        const to = Math.min(end, center + cut.halfAngle);
        if (to - from > 0.001) windows.push({ from, to, strength: cut.strength });
      }
    }
    windows.sort((a, b) => a.from - b.from);
    let cursor = start;
    for (const window of windows) {
      if (window.from > cursor + 0.012) list.w(arc(v(0, 0), radius, thickness, cursor, window.from, true), color, opacity);
      const from = Math.max(window.from, cursor);
      if (window.strength < 0.999 && window.to > from + 0.012) list.w(arc(v(0, 0), radius, thickness, from, window.to, true), color, opacity * (1 - window.strength));
      cursor = Math.max(cursor, window.to);
    }
    if (end > cursor + 0.012) list.w(arc(v(0, 0), radius, thickness, cursor, end, true), color, opacity);
  }

  static readonly hold = 0.9;
  total = 0;
  sent = 0;
  lit: ColorToken = 'primary';
  arrival = Infinity;
  sinceSent = Infinity;
  leaving: { total: number; sent: number; lit: ColorToken; age: number } | null = null;
  signals: Signal[] = [];
  /** A loan from the Family: how much of its time has run, 0 → 1 (null without one), and whether it is late. */
  debt: number | null = null;
  debtLate = false;
  private clock = 0;
  /** How long the loan has shown, and how long it has been late: the line fades in and crosses into the late glow. */
  private debtFor = 0;
  private lateFor = 0;

  age(delta: number): void {
    this.clock += delta;
    this.debtFor = this.debt === null ? 0 : this.debtFor + delta;
    this.lateFor = this.debtLate ? this.lateFor + delta : 0;
    this.arrival += delta;
    this.sinceSent += delta;
    if (this.leaving) {
      this.leaving.age += delta;
      if (this.leaving.age >= 0.35) this.leaving = null;
    }
    for (const s of this.signals) s.age += delta;
    this.signals = this.signals.filter((s) => s.age < SIGNAL_DURATION[s.kind]);
  }

  signal(kind: SignalKind, color: ColorToken, second: ColorToken = color, power = 0): void {
    this.signals = this.signals.filter((s) => !(s.kind === kind && s.color === color));
    this.signals.push({ kind, color, second, power, age: 0 });
  }

  follow(total: number, sent: number, lit: ColorToken): void {
    if (total !== this.total || sent < this.sent) {
      if (this.total > 0) this.leaving = { total: this.total, sent: this.sent, lit: this.lit, age: 0 };
      this.total = total;
      this.sent = sent;
      this.arrival = 0;
      this.sinceSent = Infinity;
    } else if (sent > this.sent) {
      this.sent = sent;
      this.sinceSent = 0;
    }
    this.lit = lit;
  }

  add(list: RenderList, world: World, reduceMotion: boolean): void {
    const frame = { rim: RingSignals.rim(world), start: world.layout.player.angle, outer: world.layout.ringRadius + world.layout.laneWidth / 2 };
    if (this.debt !== null) {
      const appear = reduceMotion ? 1 : Ease.outCubic(Ease.clamp01(this.debtFor / 0.5));
      const late = !this.debtLate ? 0 : reduceMotion ? 1 : Ease.inOutSine(Ease.clamp01(this.lateFor / 0.8));
      RingSignals.loan(list, frame, this.debt, late, this.clock, reduceMotion, appear);
    }
    this.addAt(list, frame, reduceMotion);
  }

  /**
   * A loan from the Family (Leo, 16.10.2026): a hairline just outside the road runs round from the player's arm as
   * its days pass and reddens near the end; late, the whole ring glows a slow, dim red. No notice says it.
   */
  static loan(list: RenderList, { start, outer }: RingFrame, run: number, late: number, clock: number, reduceMotion: boolean, opacity: number): void {
    const radius = outer + 4;
    if (late > 0.001) {
      const swell = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(clock * 1.6);
      list.w(arc(v(0, 0), radius, 6, 0, TAU), 'destructive', (0.05 + 0.05 * swell) * late * opacity);
      list.w(arc(v(0, 0), radius, 1.5, 0, TAU), 'destructive', (0.35 + 0.15 * swell) * late * opacity);
    }
    const running = (1 - late) * opacity;
    if (running <= 0.001) return;
    list.w(arc(v(0, 0), radius, 1.5, 0, TAU), 'marking', 0.3 * running);
    if (run <= 0.002) return;
    const head = start + TAU * run;
    const red = Ease.clamp01((run - 0.75) / 0.2);
    for (const [color, weight] of [['muted', 1 - red], ['destructive', red]] as const) {
      if (weight <= 0.001) continue;
      list.w(arc(v(0, 0), radius, 2, start, head, true), color, 0.6 * weight * running);
      list.w(circle(mul(fromAngle(head), radius), 2.6), color, 0.9 * weight * running);
    }
  }

  addAt(list: RenderList, { rim, start, outer }: RingFrame, reduceMotion: boolean): void {
    const heads: RingCutout[] = reduceMotion ? [] : this.signals.flatMap((s, signal) => {
      if (s.kind === 'sweep') {
        const x = Ease.clamp01(s.age / SIGNAL_DURATION.sweep);
        const run = Ease.inOutSine(Ease.clamp01(x / 0.8));
        const strength = 1 - Ease.clamp01((x - 0.8) / 0.2);
        return x < 1 && run > 0.001 ? [{ angle: start + TAU * run, radius: rim, thickness: 4.5, halfAngle: 0.055, signal, strength }] : [];
      }
      if (s.kind === 'victory' && s.age < RingSignals.victoryLap + 0.3) {
        const run = Ease.inOutSine(Ease.clamp01(s.age / RingSignals.victoryLap));
        const strength = 1 - Ease.clamp01((s.age - RingSignals.victoryLap) / 0.3);
        return run > 0.001 ? [{ angle: start + TAU * run, radius: rim, thickness: 5, halfAngle: 0.055, signal, strength }] : [];
      }
      return [];
    });
    // Light on the whole rim switches the ticks under it off, and they come back as it fades; no light over light.
    const covered = Math.max(0, ...this.signals.map((s) => RingSignals.cover(s, reduceMotion, rim, outer)));
    const free = 1 - covered;
    if (this.leaving) {
      const fade = 1 - Ease.outCubic(this.leaving.age / 0.35);
      this.ticks(list, this.leaving.total, this.leaving.sent, this.leaving.lit, start, rim, fade * free, Infinity, Infinity, reduceMotion, heads);
    }
    const leaving = this.leaving ? 1 - Ease.outCubic(this.leaving.age / 0.35) : 0;
    this.ticks(list, this.total, this.sent, this.lit, start, rim, (1 - leaving) * free, this.arrival, this.sinceSent, reduceMotion, heads);
    const lower = this.signals.map((s, signal) => ({ s, signal })).filter(({ s }) => s.kind !== 'sweep' && s.kind !== 'victory');
    const moving = this.signals.map((s, signal) => ({ s, signal })).filter(({ s }) => s.kind === 'sweep' || s.kind === 'victory');
    for (const { s } of [...lower, ...moving]) {
      const x = Ease.clamp01(s.age / SIGNAL_DURATION[s.kind]);
      if (s.kind === 'heal') {
        RingSignals.heal(list, s, rim, reduceMotion, heads);
        continue;
      }
      const kind = reduceMotion ? 'flush' : s.kind;
      const head = heads.find((cut) => cut.signal === this.signals.indexOf(s));
      const higher = head ? heads.filter((cut) => cut.signal > head.signal) : [];
      if (kind === 'flush') {
        const fade = 1 - Ease.outCubic(x);
        RingSignals.ringArc(list, rim, 8, 0, TAU, s.color, 0.22 * fade, heads);
        RingSignals.ringArc(list, rim, 2.5, 0, TAU, s.color, 0.8 * fade, heads);
      } else if (kind === 'wave') {
        const radius = rim + (outer - rim) * Ease.outCubic(x);
        RingSignals.ringArc(list, radius, 1 + 2.5 * (1 - x), 0, TAU, s.color, 0.55 * (1 - x), heads);
      } else if (kind === 'splash') {
        RingSignals.splash(list, s, rim, outer, heads);
      } else if (kind === 'victory') {
        RingSignals.victory(list, s, { rim, start, outer }, heads, higher);
      } else if (kind === 'miss') {
        const radius = outer - (outer - rim) * Ease.outCubic(x);
        RingSignals.ringArc(list, radius, 1 + 2.5 * (1 - x), 0, TAU, s.color, 0.55 * (1 - x), heads);
      } else {
        const run = Ease.inOutSine(x / 0.8);
        const head = start + TAU * run;
        const fade = 1 - Ease.clamp01((x - 0.8) / 0.2);
        if (run > 0.001) {
          RingSignals.ringArc(list, rim, 6, start, head, s.color, 0.18 * fade, heads);
          RingSignals.ringArc(list, rim, 3.5, Math.max(start, head - 0.7), head, s.color, 0.9 * fade, higher);
        }
      }
    }
  }

  /** The combo climbed a tier: the rim flares and juice sprays out of it, more drops the higher the tier. */
  static splash(list: RenderList, s: Signal, rim: number, outer: number, cuts: readonly RingCutout[] = []): void {
    const x = Ease.clamp01(s.age / SIGNAL_DURATION.splash);
    const flare = 1 - Ease.outCubic(x);
    RingSignals.ringArc(list, rim, 12, 0, TAU, s.color, 0.2 * flare, cuts);
    RingSignals.ringArc(list, rim + (outer - rim) * 0.7 * Ease.outCubic(x), 0.5 + 3 * (1 - x), 0, TAU, s.color, 0.6 * (1 - x), cuts);
    const drops = 12 + Math.round(18 * s.power);
    for (let i = 0; i < drops; i++) {
      // Each drop leaves a hair later and flies its own distance; the golden angle spreads them evenly.
      const t = Ease.clamp01((s.age - (i % 4) * 0.03) / (SIGNAL_DURATION.splash - 0.1));
      if (t <= 0) continue;
      const dir = fromAngle(i * 2.399963);
      const fly = Ease.outCubic(t);
      const reach = (outer - rim + 22) * (0.5 + 0.5 * (((i * 7) % 5) / 4));
      const head = mul(dir, rim + reach * fly);
      const color = i % 2 === 0 ? s.color : s.second;
      const fade = 1 - Ease.clamp01((t - 0.65) / 0.35);
      list.w(line(sub(head, mul(dir, 12 * (1 - t))), head, 2.4 * (1 - 0.5 * t)), color, 0.85 * fade);
      list.w(circle(head, (i % 3 === 0 ? 4.6 : 3.2) * (1 - 0.45 * t)), color, fade);
    }
  }

  static readonly victoryLap = 0.55;

  /**
   * The shift is done (Leo, 09.10.2026: more reward): a light runs once round the rim, and where it closes the ring the
   * rim flares, shock rings roll out, juice sprays and sparkles twinkle. `power` is the strength: a Perfect Run is 1.
   */
  static victory(list: RenderList, s: Signal, { rim, start, outer }: RingFrame, cuts: readonly RingCutout[] = [], headCuts: readonly RingCutout[] = cuts): void {
    const lap = RingSignals.victoryLap;
    const run = Ease.inOutSine(Ease.clamp01(s.age / lap));
    const head = start + TAU * run;
    const trail = 1 - Ease.clamp01((s.age - lap) / 0.3);
    if (run > 0.001 && trail > 0) {
      RingSignals.ringArc(list, rim, 10, start, head, s.color, 0.2 * trail, cuts);
      RingSignals.ringArc(list, rim, 4.5, Math.max(start, head - 1.1), head, s.color, 0.95 * trail, headCuts);
    }
    const u = s.age - lap;
    if (u <= 0) return;
    const flare = 1 - Ease.outCubic(Ease.clamp01(u / 0.75));
    RingSignals.ringArc(list, rim, 20, 0, TAU, s.color, 0.22 * flare, cuts);
    RingSignals.ringArc(list, rim, 3.5, 0, TAU, s.color, 0.9 * flare, cuts);
    for (let k = 0; k < 3; k++) {
      const t = Ease.clamp01((u - k * 0.13) / 0.8);
      if (t <= 0 || t >= 1) continue;
      const radius = rim + (outer + 26 - rim) * Ease.outCubic(t);
      RingSignals.ringArc(list, radius, 1 + 3.5 * (1 - t), 0, TAU, k % 2 === 0 ? s.color : s.second, 0.65 * (1 - t), cuts);
    }
    RingSignals.splash(list, { ...s, kind: 'splash', age: u }, rim, outer, cuts);
    const sparkles = 7 + Math.round(7 * s.power);
    for (let i = 0; i < sparkles; i++) {
      const t = Ease.clamp01((u - 0.1 - (i % 5) * 0.07) / 0.55);
      if (t <= 0 || t >= 1) continue;
      const at = mul(fromAngle(i * 2.399963 + 0.7), rim + (outer - rim) * (0.15 + 0.8 * (((i * 3) % 7) / 6)));
      const size = (6 + 6 * s.power) * Math.sin(Math.PI * t) * (i % 3 === 0 ? 1.3 : 1);
      const color = i % 2 === 0 ? s.color : s.second;
      list.w(line(add(at, v(-size, 0)), add(at, v(size, 0)), 2), color, 0.9);
      list.w(line(add(at, v(0, -size)), add(at, v(0, size)), 2), color, 0.9);
      list.w(circle(at, 2.2), color, 0.9);
    }
  }

  /** A lost shift's ring at dusk: a slow, dim red glow on the island's edge for as long as the result shows. */
  static dusk(list: RenderList, rim: number, age: number, reduceMotion: boolean, opacity: number): void {
    const appear = Ease.outCubic(age / 0.4) * opacity;
    if (appear <= 0.001) return;
    const swell = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(age * 2.2);
    list.w(arc(v(0, 0), rim, 16, 0, TAU), 'destructive', (0.07 + 0.04 * swell) * appear);
    list.w(arc(v(0, 0), rim, 6, 0, TAU), 'destructive', (0.16 + 0.08 * swell) * appear);
    list.w(arc(v(0, 0), rim, 2.5, 0, TAU), 'destructive', (0.5 + 0.15 * swell) * appear);
  }

  static readonly eliteFill = 1.1;

  /**
   * After a shift the rim is the Elite track (Leo, 09.10.2026): the XP the shift earned runs into a gold bar round the
   * ring, from the player's arm. A level climbed fills the bar, flares the rim and starts it over. `age` counts from the
   * ring's first look, `opacity` takes it away again when the next shift's ticks come back.
   */
  static elite(list: RenderList, frame: RingFrame, bar: EliteBar, age: number, reduceMotion: boolean, opacity: number): void {
    const { rim, start } = frame;
    const appear = Ease.outCubic(age / 0.3) * opacity;
    if (appear <= 0.001) return;
    list.w(arc(v(0, 0), rim, 2.5, 0, TAU), 'marking', 0.6 * appear);
    const t = reduceMotion ? 1 : Ease.inOutSine(Ease.clamp01((age - 0.3) / RingSignals.eliteFill));
    const fraction = bar.climbed > 0 ? (t < 0.5 ? bar.from + (1 - bar.from) * t * 2 : bar.to * (t * 2 - 1)) : bar.from + (bar.to - bar.from) * t;
    if (fraction > 0.002) {
      const head = start + TAU * fraction;
      for (const [thickness, alpha] of [[9, 0.18], [4.5, 0.95]] as const) {
        list.w(arc(v(0, 0), rim, thickness, start, head, true), 'coin', alpha * appear);
      }
    }
    // A level climbed: where the bar closes, the victory lap's flare, shock rings, juice and sparkles, in gold.
    const closed = age - RingSignals.eliteClosesAt;
    if (bar.climbed > 0 && !reduceMotion && closed > 0 && closed < 1.6 && opacity > 0.5) {
      RingSignals.victory(list, { kind: 'victory', color: 'coin', second: 'vehicleCargo', power: 0.8, age: closed + RingSignals.victoryLap }, frame);
    }
  }

  /** When a climbing bar is full, on the ring's own clock (`age` of `elite`). */
  static readonly eliteClosesAt = 0.3 + RingSignals.eliteFill / 2;

  /**
   * A crash forgiven (the shield, a police car within its limit): the rim lights up and small plus signs rise out of
   * it, here and there round the ring, so the broken combo in the middle does not read as the end.
   */
  static heal(list: RenderList, s: Signal, rim: number, reduceMotion: boolean, cuts: readonly RingCutout[] = []): void {
    const x = Ease.clamp01(s.age / SIGNAL_DURATION.heal);
    const glow = RingSignals.healGlow(s, reduceMotion);
    const radius = rim + (reduceMotion ? 0 : 3 * Ease.outCubic(x));
    RingSignals.ringArc(list, radius, 16, 0, TAU, s.color, 0.14 * glow, cuts);
    RingSignals.ringArc(list, radius, 7, 0, TAU, s.color, 0.26 * glow, cuts);
    RingSignals.ringArc(list, radius, 2.5, 0, TAU, s.color, 0.95 * glow, cuts);
    const count = RingSignals.healPluses;
    for (let i = 0; i < count; i++) {
      // Not one after the other round the ring: they bubble up in a scattered order.
      const t = (s.age - (((i * 5) % count) / count) * 0.35) / 0.65;
      if (t <= 0 || t >= 1) continue;
      const angle = (i / count) * TAU + 0.21 * Math.sin(i * 2.7);
      const from = mul(fromAngle(angle), rim + 2);
      const rise = Ease.outCubic(t);
      const at = reduceMotion ? from : add(from, add(mul(fromAngle(angle), 6 * rise), v(0, -22 * rise)));
      const size = (i % 3 === 0 ? 9 : 7) * (reduceMotion ? 1 : Math.min(1.15, Ease.spring(t / 0.35)));
      const opacity = Ease.clamp01(t / 0.12) * (1 - Ease.clamp01((t - 0.55) / 0.45));
      const color = i % 2 === 0 ? s.color : s.second;
      list.w(rect(at, v(size, size * 0.3), size * 0.15), color, opacity);
      list.w(rect(at, v(size * 0.3, size), size * 0.15), color, opacity);
    }
  }

  static readonly healPluses = 12;

  private static healGlow(s: Signal, reduceMotion: boolean): number {
    const x = Ease.clamp01(s.age / SIGNAL_DURATION.heal);
    return (reduceMotion ? 1 : Ease.outCubic(x / 0.14)) * (1 - Ease.inOutSine(Ease.clamp01((x - 0.25) / 0.75)));
  }

  /** How much of the rim a signal lights as a whole, 0 → 1: the ticks under it stay off by that much. */
  private static cover(s: Signal, reduceMotion: boolean, rim: number, outer: number): number {
    if (s.kind === 'heal') return RingSignals.healGlow(s, reduceMotion);
    const kind = reduceMotion ? 'flush' : s.kind;
    const x = Ease.clamp01(s.age / SIGNAL_DURATION[s.kind]);
    if (kind === 'flush' || kind === 'splash') return 1 - Ease.outCubic(x);
    if (kind === 'victory') return s.age > RingSignals.victoryLap ? 1 - Ease.outCubic(Ease.clamp01((s.age - RingSignals.victoryLap) / 0.75)) : 0;
    if (kind === 'wave' || kind === 'miss') {
      // The ring only lies on the ticks while it passes the rim: it dims them as it comes close and lets go as it leaves.
      const radius = kind === 'wave' ? rim + (outer - rim) * Ease.outCubic(x) : outer - (outer - rim) * Ease.outCubic(x);
      const near = 1 - Ease.inOutSine(Ease.clamp01(Math.abs(radius - rim) / 6));
      return near * (1 - x) * (kind === 'wave' ? Ease.clamp01(s.age / 0.06) : 1);
    }
    return 0;
  }

  private ticks(list: RenderList, total: number, sent: number, lit: ColorToken, start: number, rim: number, opacity: number, arrival: number, sinceSent: number, reduceMotion: boolean, cuts: readonly RingCutout[] = []): void {
    if (total <= 0 || opacity <= 0.001) return;
    const step = TAU / total;
    const half = Math.min(step * 0.3, 0.1);
    for (let i = 0; i < total; i++) {
      const appear = reduceMotion ? Ease.outCubic(arrival / 0.25) : Ease.outCubic((arrival - (0.6 * i) / total) / 0.25);
      if (appear <= 0.001) continue;
      const center = start + step * (i + 0.5);
      const isLit = i < sent;
      let thickness = isLit ? 3 : 2;
      if (isLit && i === sent - 1 && !reduceMotion) thickness *= land(sinceSent / 0.35, 0.8);
      const grow = reduceMotion ? 1 : 0.4 + 0.6 * appear;
      const hidden = RingSignals.touched(rim, thickness, center, half * grow, cuts);
      RingSignals.ringArc(list, rim, thickness, center - half * grow, center + half * grow, isLit ? lit : 'marking', (isLit ? 0.85 : 0.6) * opacity * appear * (1 - hidden), []);
    }
  }

  /** How strongly a passing light touches the tick at `center` anywhere: the whole tick goes off by that much, never half of it (Leo, 15.10.2026). */
  static touched(radius: number, thickness: number, center: number, halfAngle: number, cuts: readonly RingCutout[]): number {
    let most = 0;
    for (const cut of cuts) {
      if (Math.abs(radius - cut.radius) > (thickness + cut.thickness) / 2 + 0.5) continue;
      const apart = Math.abs((((cut.angle - center) % TAU) + TAU + Math.PI) % TAU - Math.PI);
      if (apart < cut.halfAngle + halfAngle) most = Math.max(most, cut.strength);
    }
    return most;
  }
}

// MARK: Banners

/** A message on the waiting screen's top card (the swipe hint, a mode's name): the numbers make way for it, as for a briefing. */
export interface TopMessage {
  brief: Brief;
  /** The message it takes over from while that one is still fading: both show for a moment. */
  previous: { brief: Brief; alpha: number } | null;
  /** How far the card is in (0–1), and how far the words have swapped (0 the old ones, 1 the new). */
  amount: number;
  swap: number;
  /** 0 as it is struck, 1 once the card's ripple has gone: the card flashes its edge to catch the eye. */
  pulse: number;
  time: number;
  /** Arrows in the corners: there is a mode to the left, to the right. */
  left: boolean;
  right: boolean;
}

/** The mode's name when the player swipes to it: on the top card, in the mode's colour. */
export const ModeBanner = {
  tint: (m: SwipeMode): ColorToken => (m === 'shift' || m === 'multiplayer' ? 'primary' : m === 'unlimited' ? 'accent' : 'fireOuter'),
  brief: (mode: SwipeMode): Brief => ({ id: `mode.${mode}`, caption: S.modes.name(mode).toUpperCase(), text: S.modes.line(mode), color: ModeBanner.tint(mode), pending: null }),
};

/**
 * The mode swiped to, as a message on the top card. Swiping on while it shows does not cut: the card stays, and the
 * old words and the new overlap while one fades into the other (Leo, 08.10.2026), with a ripple round the card each time.
 */
export class ModeMessage {
  static readonly hold = 1.6;
  static readonly swapTime = 0.2;
  static readonly ripple = 0.55;

  private mode: SwipeMode | null = null;
  private previous: Brief | null = null;
  private shown = 0;
  private swap = 1;
  private age = Infinity;

  /** `carried`: a message that was on the card (the swipe hint): it hands over to the mode's name like an earlier mode does. */
  swipe(mode: SwipeMode, carried?: { brief: Brief; amount: number }): void {
    if (this.mode !== null && this.shown > 0.05) this.previous = ModeBanner.brief(this.mode);
    else if (carried) {
      this.previous = carried.brief;
      this.shown = carried.amount;
    } else this.previous = null;
    this.mode = mode;
    this.swap = this.previous === null ? 1 : 0;
    this.age = 0;
  }

  advance(dt: number): void {
    this.age += dt;
    this.swap = Math.min(1, this.swap + dt / ModeMessage.swapTime);
    const target = this.mode !== null && this.age < ModeMessage.hold ? 1 : 0;
    const step = dt / (target > this.shown ? 0.18 : 0.35);
    this.shown = target > this.shown ? Math.min(target, this.shown + step) : Math.max(target, this.shown - step);
    if (this.shown === 0 && target === 0) {
      this.mode = null;
      this.previous = null;
    }
  }

  view(time: number): TopMessage | null {
    if (this.mode === null || this.shown <= 0) return null;
    const swap = Ease.smoothstep(this.swap);
    const previous = this.previous !== null && swap < 1 ? { brief: this.previous, alpha: 1 - swap } : null;
    return { brief: ModeBanner.brief(this.mode), previous, amount: this.shown, swap, pulse: Ease.clamp01(this.age / ModeMessage.ripple), time, left: false, right: false };
  }
}

export interface DailyCard {
  event: CityEvent | null;
  streak: number;
  /** The streak pays more on every shift right now. */
  bonus: number | null;
  /** Hours until the streak breaks, when that is close; null otherwise. */
  endsIn: number | null;
  /** Streak Freezes in stock. */
  freezes: number;
  next: StreakMilestone | null;
  splash: number | null;
}

/** What a trial asks for, as the ready screen explains it. */
export interface ConditionIntro {
  title: string;
  /** What changes and what to do, one sentence or two. */
  text: string;
  /** A few words, for a screen too short for the sentence. */
  short: string;
}

/** The intro card fitted to the room between the top card and the prompt. */
interface IntroLayout {
  box: Rect;
  pad: number;
  titleSize: number;
  bodySize: number;
  lineHeight: number;
  gap: number;
  rows: { title: string; lines: string[] }[];
}

interface IslandRowSpec {
  s: string;
  size: number;
  color: ColorToken;
  opacity: number;
  weight: Weight;
}

/** The island's slots, top to bottom: a label, the main line, a status. Each wraps for the grass, the stack is centred as a whole, so no line can run into the next. */
function islandStack(list: RenderList, radius: number, rows: (IslandRowSpec | null)[]): void {
  const gap = 8;
  const wrapped = rows.filter((r): r is IslandRowSpec => r !== null).map((r) => ({ r, lines: islandWrap(list, r.s, radius, 0, r.size, r.weight) }));
  const heights = wrapped.map(({ r, lines }) => lines.length * r.size * 1.25);
  let top = -(heights.reduce((a, b) => a + b, 0) + gap * (heights.length - 1)) / 2;
  wrapped.forEach(({ r, lines }, i) => {
    islandBlock(list, lines, radius, top + heights[i] / 2, r.size, r.color, r.opacity, r.weight);
    top += heights[i] + gap;
  });
}

/** How the grass lets `s` wrap around `dy`. */
function islandWrap(list: RenderList, s: string, radius: number, dy: number, size: number, weight: Weight): string[] {
  const widthAt = islandWidth(list, radius, size);
  const bold = weight === 'bold';
  return textWidth(s, size, bold) > widthAt(dy) ? wrapText(s, widthAt(dy), size, bold).slice(0, 3) : [s];
}

function islandWidth(list: RenderList, radius: number, size: number): (y: number) => number {
  const r = radius * list.camera.scale - 8;
  return (y) => Math.max(60, 2 * Math.sqrt(Math.max(0, r * r - (Math.abs(y) + size / 2) ** 2)));
}

function islandBlock(list: RenderList, lines: string[], radius: number, dy: number, size: number, color: ColorToken, opacity: number, weight: Weight = 'regular'): void {
  const widthAt = islandWidth(list, radius, size);
  lines.forEach((line, i) => {
    const y = dy + (i - (lines.length - 1) / 2) * size * 1.25;
    drawFitted(list, line, add(toScreen(list.camera, v(0, 0)), v(0, y)), size, widthAt(y), color, { weight, opacity, align: 'center' });
  });
}

/** One row of the result in the island: its text wrapped for the grass, and how tall that is. */
interface IslandRow {
  lines: string[];
  size: number;
  height: number;
}

function islandRow(list: RenderList, s: string | null, radius: number, size: number, weight: Weight): IslandRow {
  const lines = s ? islandWrap(list, s, radius, radius * list.camera.scale * 0.55, size, weight) : [];
  return { lines, size, height: lines.length * size * 1.25 };
}

export const ReadyBanner = {
  splashDuration: 3,
  add(
    list: RenderList,
    o: {
      level: number;
      cars: number;
      highscore: string | null;
      money: string;
      /** Where the row of condition icons starts (`ConditionChips`): the intro card stays above it. Null: no icons. */
      iconsTop?: number | null;
      daily: DailyCard | null;
      mode: GameMode;
      /** The multiplayer page of the swipe: no level, no daily, a code instead. */
      versus?: boolean;
      prompt: string | null;
      time: number;
      reduceMotion: boolean;
      drawsCard?: boolean;
      opacity?: number;
      run?: RunCard | null;
      /** The career's Prestige rank: a star before the level. */
      prestige?: number;
      /** An Elite driver: the level caption turns gold. */
      elite?: boolean;
      /** The name friends see, on the multiplayer page (there is no best to show). */
      playerName?: string;
      /** The next goal in reach, under the prompt. */
      goal?: string | null;
      /** A trial's goal: what it asks for. */
      intro?: ConditionIntro[] | null;
      /** Larger text (Settings): the intro card's type a step up. */
      textScale?: number;
      /** The mode swipe's hint on the top card: how far it is in (0–1), the clock, and which ways there is a mode. */
      message?: TopMessage | null;
      /** The swipe pages as dots on the card's foot, once modes are known; `at` is the shown page. */
      modes?: { count: number; at: number; color: ColorToken } | null;
      /** Where the ring's outer edge is on screen: the intro card stays above it (the scene is never covered). */
      ringTop?: number;
      /** The island's radius in world units: the lines in the middle stay inside it. */
      island: number;
      /** A row for an ad pill (`AdPill`) under the streak pill: the intro makes way for it. */
      adRow?: boolean;
    },
  ): number {
    const width = list.camera.viewport.x;
    const run = o.run ?? null;
    const opacity = o.opacity ?? 1;
    const frame = TopBar.frame(width);
    const cols = TopBar.columns(frame);
    const hint = o.message ?? null;
    const hintView: BriefView | null = hint ? { brief: hint.brief, card: Ease.smoothstep(hint.amount), words: 1, used: null } : null;
    if (o.drawsCard ?? true) {
      TopBar.addScrim(list);
      // A new message sends a ripple off the card's edge, so the eye goes there.
      if (hint && hint.pulse < 1 && !o.reduceMotion) {
        const e = Ease.outCubic(hint.pulse);
        list.s(rect(R.center(frame), v(R.width(frame) + 20 * e, R.height(frame) + 20 * e), TopBar.corner + 10 * e), hint.brief.color, 0.4 * (1 - e) * opacity);
      }
      TopBar.addCard(list, frame, 1, hintView);
    }
    list.tag = 'topbarLabels';
    const numbers = list.items.length;
    TopBar.addMoneyColumn(list, cols.left, 'leading', o.money, { opacity });
    const [caption, captionColor]: [string, ColorToken] = o.versus
      ? [S.modes.name('multiplayer'), 'primary']
      : run
      ? [run.caption, run.color]
      : o.mode === 'shift'
        ? o.daily === null
          ? [S.ready.levelCaption(o.level, o.prestige ?? 0), o.elite ? 'coin' : 'muted']
          : [S.daily.title, 'hazard']
        : o.mode === 'unlimited'
          ? [S.modes.unlimitedCaption, 'accent']
          : [S.mayhem.caption, 'fireOuter'];
    const value = o.versus ? S.modes.versusPlayers : o.mode === 'unlimited' ? S.modes.endless : S.hud.cars(o.cars);
    TopBar.addColumn(list, cols.center, 'center', caption, value, { captionColor, valueSize: Metrics.timerSize, opacity });
    if (run) TopBar.addColumn(list, cols.right, 'trailing', run.right[0], run.right[1], { opacity });
    else if (o.versus) {
      // A long name shrinks to fit its column.
      const name = o.playerName || S.modes.defaultName;
      const room = R.width(cols.right) - 32;
      TopBar.addColumn(list, cols.right, 'trailing', S.modes.youLabel, name, { opacity, valueSize: Math.max(11, Math.min(20, (20 * room) / Math.max(1, textWidth(name, 20)))) });
    }
    else TopBar.addBest(list, cols.right, o.highscore ?? '–', { valueColor: o.highscore === null ? 'muted' : 'primary', opacity });
    if (hint && hintView) {
      // The numbers fade and lift away while the hint settles in from below, and back: as a briefing does in a shift.
      const shown = hintView.card;
      if (shown >= 0.999) list.items.length = numbers;
      else {
        const lift = v(0, o.reduceMotion ? 0 : -TopBar.briefTravel * shown);
        for (let i = numbers; i < list.items.length; i++) list.items[i] = moved(list.items[i], lift, 1 - TopBar.numbersOut(shown));
      }
      TopBar.addMessage(list, frame, { ...hintView, card: hintView.card * opacity }, { time: hint.time, left: hint.left, right: hint.right, previous: hint.previous, reduceMotion: o.reduceMotion, textScale: o.textScale ?? 1 });
    }
    list.tag = undefined;
    // The dots stay with a mode's name on the card: where the player is among the modes is what the name is about.
    if (o.modes && (o.drawsCard ?? true)) TopBar.addModeDots(list, frame, o.modes, opacity);
    const pillText = run ? run.badge : o.daily ? S.daily.streakPill(o.daily.streak, o.daily.bonus, o.daily.endsIn, o.daily.freezes) : null;
    if (pillText) {
      const under = v(width / 2, TopBar.foot(list) + 18);
      const lineText = pillText;
      MenuKit.chromePill(list, under, v(textWidth(lineText, 12) + 28, 26), opacity);
      // A streak about to break says so in the warning colour.
      list.s(text(lineText, under, 12, 'center'), !run && o.daily?.endsIn != null ? 'hazard' : 'primary', opacity);
    }
    const island = toScreen(list.camera, v(0, 0));
    const introBottom = Math.min((o.iconsTop ?? island.y - (run?.line ? 49 : 26)) - 10, (o.ringTop ?? Infinity) - 10);
    // The intro rides in the grown top card, under a notice if one is up; the pills hang under the card.
    const pills = (pillText ? 31 : 0) + (o.adRow ? AdPill.row : 0);
    const introTop = frame.maxY + list.topGrow - list.topIntro;
    const intro = o.intro && o.intro.length > 0 && o.time >= ReadyBanner.introDelay ? ReadyBanner.introLayout(o.intro, frame, introTop, introBottom - pills, o.textScale ?? 1) : null;
    const breath = o.reduceMotion ? 1 : 0.7 + 0.3 * (0.5 + 0.5 * Math.cos(o.time * 2.4));
    islandStack(list, o.island, [
      run?.line ? { s: run.line, size: 14, color: run.color, opacity, weight: 'bold' } : null,
      o.prompt ? { s: o.prompt, size: 17, color: 'primary', opacity: breath * opacity, weight: 'bold' } : null,
      o.goal && o.prompt ? { s: o.goal, size: 13, color: 'muted', opacity: opacity * (o.reduceMotion ? 1 : Ease.outCubic(o.time / 0.4)), weight: 'regular' } : null,
    ]);
    if (intro) ReadyBanner.addIntro(list, intro, list.topIntro, o.reduceMotion, opacity);
    return intro ? R.height(intro.box) : 0;
  },

  /** The intro comes a beat after the ready screen, so it reads as news, not as part of the card. */
  introDelay: 0.35,

  /** Wide enough for a goal and its rule, narrow enough that a line stays easy to read (about 60 characters). */
  introMaxWidth: 440,

  /**
   * Fits the intro between `top` and `bottom`: the full sentences if they fit, then tighter,
   * then only the names with a few words each; null when not even that fits.
   */
  introLayout(intro: ConditionIntro[], bar: Rect, top: number, bottom: number, scale = 1): IntroLayout | null {
    const width = Math.min(R.width(bar), ReadyBanner.introMaxWidth * scale);
    const left = (bar.minX + bar.maxX - width) / 2;
    const steps = [
      { pad: 16, titleSize: 15 * scale, bodySize: 13 * scale, lineHeight: 18 * scale, gap: 12, short: false },
      { pad: 12, titleSize: 14 * scale, bodySize: 12 * scale, lineHeight: 16 * scale, gap: 8, short: false },
      { pad: 12, titleSize: 14 * scale, bodySize: 12 * scale, lineHeight: 16 * scale, gap: 8, short: true },
    ];
    for (const step of steps) {
      const rows = intro.map((i) => ({ title: i.title, lines: wrapText(step.short ? i.short : i.text, width - 2 * step.pad, step.bodySize) }));
      const height = 2 * step.pad + rows.reduce((h, r) => h + step.titleSize + 7 + r.lines.length * step.lineHeight, 0) + step.gap * (rows.length - 1);
      if (top + height <= bottom) return { ...step, rows, box: R.make(left, top, left + width, top + height) };
    }
    return null;
  },

  /**
   * A trial's goal, news or a condition met for the first time, in the grown top card (Leo, 20.10.2026): the card reaches
   * down a beat after the ready screen (`GameSession.easeIntro`), the words come once it is nearly open, and it folds
   * back when the shift starts.
   */
  addIntro(list: RenderList, l: IntroLayout, grown: number, reduceMotion: boolean, opacity: number): void {
    const open = Ease.clamp01((grown / R.height(l.box) - 0.55) / 0.45);
    if (open <= 0.001) return;
    const alpha = open * opacity;
    const box = R.offset(l.box, v(0, reduceMotion ? 0 : (1 - open) * 4));
    let y = box.minY + l.pad;
    for (const row of l.rows) {
      list.s(text(row.title, v(box.minX + l.pad, y + l.titleSize / 2), l.titleSize, 'leading', 'bold'), 'hazard', alpha);
      y += l.titleSize + 7;
      for (const ln of row.lines) {
        list.s(text(ln, v(box.minX + l.pad, y + l.lineHeight / 2), l.bodySize, 'leading'), 'primary', alpha);
        y += l.lineHeight;
      }
      y += l.gap;
    }
  },

  /**
   * The Daily Shift's opening (Leo, 08.10.2026: not a warning box): the scene dims, and the day arrives in a few lines
   * without a card round them, one after the other: the date, the name, a rule that draws itself out, today's city, and
   * the streak as a week of dots with today lit. The words keep their size and only rise and fade.
   */
  addSplash(list: RenderList, daily: DailyCard, age: number, reduceMotion: boolean): void {
    const vp = list.camera.viewport;
    const leave = Ease.outCubic((age - (ReadyBanner.splashDuration - 0.5)) / 0.5);
    const alpha = Ease.outCubic(age / 0.3) * (1 - leave);
    if (alpha <= 0.001) return;
    const middle = mul(vp, 0.5);
    list.s(rect(middle, vp), 'background', 0.9 * alpha);
    MenuKit.glow(list, add(middle, v(0, -30)), Math.min(vp.x, 460) * 0.7, 'hazard', 0.1 * alpha);
    const date = new Date().toLocaleDateString(currentLanguage() === 'en' ? 'en-GB' : currentLanguage(), { weekday: 'long', day: 'numeric', month: 'long' });
    const rows: { height: number; draw: (at: Vec2, a: number, e: number) => void }[] = [];
    const words = (s: string, size: number, weight: 'regular' | 'bold', color: ColorToken): void => {
      rows.push({ height: size * 1.35, draw: (at, a) => list.s(text(s, at, size, 'center', weight), color, a) });
    };
    words(date, 13, 'regular', 'muted');
    words(S.daily.name, 34, 'bold', 'primary');
    rows.push({
      height: 18,
      draw: (at, a, e) => {
        const half = 56 * e;
        list.s(line(sub(at, v(half, 0)), add(at, v(half, 0)), 2), 'hazard', a * 0.9);
      },
    });
    if (daily.event) words(S.daily.splashLine(daily.event), 15, 'regular', 'primary');
    const lit = daily.streak > 0 ? ((daily.streak - 1) % 7) + 1 : 0;
    rows.push({
      height: 30,
      draw: (at, a) => {
        for (let d = 0; d < 7; d++) {
          const dot = v(at.x + (d - 3) * 17, at.y - 4);
          if (d === lit - 1) list.s(circle(dot, reduceMotion ? 7 : 7 + 1.5 * Math.sin(age * 4)), 'hazard', a * 0.28);
          list.s(circle(dot, 4), d < lit ? 'hazard' : 'controlFill', a);
        }
      },
    });
    words(S.daily.streakLine(daily.streak), 13, 'regular', 'muted');
    if (daily.next) words(S.daily.nextMilestone(daily.next.left, S.daily.prize(daily.next.prize)), 12, 'bold', 'accent');
    const total = rows.reduce((h, r) => h + r.height, 0);
    let y = middle.y - 30 - total / 2;
    rows.forEach((r, i) => {
      const e = reduceMotion ? 1 : Ease.outCubic((age - 0.08 * i) / 0.35);
      const at = v(middle.x, y + r.height / 2 + (reduceMotion ? 0 : (1 - e) * 10 - 8 * leave));
      r.draw(at, alpha * e, e);
      y += r.height;
    });
  },
};

export interface ShiftSummary {
  result: ShiftResult;
  level: number;
  isNewHighscore: boolean;
  previousHighscore: number;
  mode: GameMode;
  /** A challenge or trial: its own verdict replaces the title, the right column and the line. */
  run?: { caption: string; color: ColorToken; line: string; lineColor: ColorToken; right: [string, string] };
  /** Under the stats: how close a lost shift came, or what the money is close to. */
  closeCall?: { text: string; color: ColorToken } | null;
  /** The Elite track after this shift: the ring runs it, the middle says what is missing (`RingSignals.elite`). */
  elite?: EliteBar | null;
}

/** How the waiting screen names a challenge or trial. */
export interface RunCard {
  caption: string;
  color: ColorToken;
  /** The pill under the top card: whose shift, or the trial's name. */
  badge: string;
  /** Above the prompt: the trial's goal (a challenge shows only its conditions there). */
  line: string | null;
  /** The right column: the score to beat, or the trial's reward. */
  right: [string, string];
}

/** The end of a shift without leaving the world: the same card says how it went. */
export const ResultBanner = {
  inputLock: 0.4,
  /** A lost shift takes a breather (Leo, 12.10.2026): FAIL on the card, the ring at dusk, and no tap starts the next one yet. Wherever a shift can be lost: career, Unlimited, challenges and trials. */
  breath: 1.2,
  breathes: (s: ShiftSummary): boolean => (s.mode === 'shift' || s.mode === 'unlimited') && s.result.outcome !== 'completed' && !s.result.detonated,
  /** How long the result ignores taps. */
  lock: (s: ShiftSummary): number => (ResultBanner.breathes(s) ? ResultBanner.breath : ResultBanner.inputLock),
  /** 1 while the breather holds, then 0 over its last moment: FAIL and the reason make way for the usual result. */
  mourning: (age: number): number => 1 - Ease.smoothstep((age - (ResultBanner.breath - 0.3)) / 0.3),
  enter: 0.25,
  countDelay: 0.35,
  countDuration: 1.2,
  epilogue: 3.6,
  fade: 0.6,
  /** The top card's extra height for a lost shift's lines: padding above and below, one line each. */
  cardPad: 8,
  cardLine: 20,

  settled: (age: number): number => Ease.smoothstep((age - ResultBanner.epilogue) / ResultBanner.fade),
  /** The result leaves in the first half of the fade, the next shift arrives in the second: never both at once. */
  leaving: (age: number): number => Ease.smoothstep(ResultBanner.settled(age) * 2),
  arriving: (age: number): number => Ease.smoothstep(ResultBanner.settled(age) * 2 - 1),

  /** How the shift ended, in words and colour: the card's caption and the photo's headline. */
  title(summary: ShiftSummary): [string, ColorToken] {
    const r = summary.result;
    let [title, titleColor]: [string, ColorToken] =
      r.outcome === 'completed'
        ? [S.result.levelComplete(summary.level), 'accent']
        : r.outcome === 'struckOut'
          ? r.detonated
            ? [S.result.detonated, 'fireOuter']
            : [S.result.gameOver, 'destructive']
          : [S.result.escaped, 'vehicleCriminal'];
    if (summary.mode === 'unlimited' && r.outcome === 'struckOut') title = S.modes.runOver;
    if (summary.mode === 'mayhem') [title, titleColor] = [S.mayhem.over, 'fireOuter'];
    // On a boss level the criminal that got away was the syndicate's head.
    if (r.outcome === 'escaped' && r.convoy && !r.bossBusted) title = S.boss.escaped;
    // A Legendary Shift's rule was broken (Zero Tolerance).
    if (r.outcome === 'failed') [title, titleColor] = [S.legendary.broken, 'destructive'];
    if (summary.run) [title, titleColor] = [summary.run.caption, summary.run.color];
    return [title, titleColor];
  },

  /** The card in one sentence, for screen readers: how it ended, the score, what happened. */
  spoken(summary: ShiftSummary): string {
    const r = summary.result;
    const [title] = ResultBanner.title(summary);
    const detail =
      summary.mode === 'mayhem'
        ? S.mayhem.summary(r.wrecks, r.biggestChain)
        : S.result.stats(r.bestCombo, r.tightFits, r.takedowns, r.transporters, Fmt.seconds(r.time));
    const best = summary.isNewHighscore ? `. ${S.result.newBest}` : '';
    const elite = summary.elite ? `. ${S.elite.toGo(summary.elite)}` : '';
    return `${title}. ${S.result.points(Fmt.number(r.score))}${best}. ${detail}${elite}`;
  },

  /** A Perfect Run ends under a chequered flag: a grey two-row band along the card's top edge that rolls in from the left. */
  addFinish(list: RenderList, frame: Rect, age: number, opacity: number, reduceMotion: boolean): void {
    const cell = 4;
    const left = frame.minX + TopBar.corner;
    const columns = Math.floor((R.width(frame) - 2 * TopBar.corner) / cell);
    const reach = reduceMotion ? 1 : Ease.outCubic((age - ResultBanner.countDelay) / 0.7);
    list.tag = 'topbarLabels';
    for (let i = 0; i < columns && i / columns < reach; i++) {
      for (let row = 0; row < 2; row++) {
        if ((i + row) % 2 === 0) list.s(rect(v(left + (i + 0.5) * cell, frame.minY + 5 + (row + 0.5) * cell), v(cell, cell)), 'muted', 0.4 * opacity);
      }
    }
    list.tag = undefined;
  },

  add(list: RenderList, summary: ShiftSummary, nextLevel: number, bank: { before: number; after: number }, age: number, reduceMotion: boolean, gift: string | null, islandRadius: number): { chip: Vec2 | null; grow: number } {
    const r = summary.result;
    const frame = TopBar.frame(list.camera.viewport.x);
    const cols = TopBar.columns(frame);
    TopBar.addScrim(list);
    TopBar.addCard(list, frame);
    const shown = Ease.outCubic(age / ResultBanner.enter) * (1 - ResultBanner.leaving(age));
    if (r.isPerfectRun && shown > 0.001) ResultBanner.addFinish(list, frame, age, shown, reduceMotion);
    const [title, titleColor] = ResultBanner.title(summary);
    const run = summary.run;
    const mourning = ResultBanner.breathes(summary) ? ResultBanner.mourning(age) : 0;

    list.tag = 'topbarLabels';
    if (shown > 0.001) {
      const x = reduceMotion ? 1 : Ease.clamp01((age - ResultBanner.countDelay) / ResultBanner.countDuration);
      const counted = bank.before + Math.round((bank.after - bank.before) * Ease.outCubic(x));
      TopBar.addMoneyColumn(list, cols.left, 'leading', Fmt.number(counted), { valueSize: 20, opacity: shown, fitAmount: Fmt.number(bank.after) });
      // A lost shift's words stand still: no spring on the numbers, and FAIL makes way for the score before it comes in.
      const pop = reduceMotion || ResultBanner.breathes(summary) ? 1 : land(age / 0.4, 0.12);
      if (summary.mode === 'mayhem' && !run) {
        list.s(text(title, v(R.center(cols.center).x, cols.center.minY + TopBar.captionRow), 10, 'center', 'bold'), titleColor, shown);
        flameTag(list, Fmt.number(r.flames), v(R.center(cols.center).x, cols.center.minY + TopBar.valueRow), Metrics.timerSize * pop, 'center', 'primary', shown);
      } else if (mourning > 0) {
        TopBar.addColumn(list, cols.center, 'center', title, S.result.fail, { captionColor: titleColor, valueColor: 'destructive', valueSize: Metrics.timerSize, opacity: shown, valueOpacity: shown * Ease.clamp01(mourning * 2 - 1) });
        if (mourning < 1) TopBar.addColumn(list, cols.center, 'center', title, Fmt.number(r.score), { captionColor: titleColor, valueSize: Metrics.timerSize, opacity: 0, valueOpacity: shown * Ease.clamp01(1 - mourning * 2) });
      } else {
        TopBar.addColumn(list, cols.center, 'center', title, Fmt.number(r.score), { captionColor: titleColor, valueSize: Metrics.timerSize * pop, opacity: shown });
      }
      if (run) {
        const [caption, value] = run.right;
        TopBar.addColumn(list, cols.right, 'trailing', caption, value, { valueSize: 16, opacity: shown });
      } else if (summary.isNewHighscore) {
        TopBar.addColumn(list, cols.right, 'trailing', S.result.newBest, Fmt.number(summary.mode === 'mayhem' ? r.flames : r.score), { captionColor: 'accent', valueColor: 'accent', opacity: shown });
      } else {
        TopBar.addBest(list, cols.right, summary.previousHighscore > 0 ? Fmt.number(summary.previousHighscore) : '–', {
          valueColor: summary.previousHighscore > 0 ? 'primary' : 'muted',
          opacity: shown,
        });
      }
    }
    list.tag = undefined;
    const lock = ResultBanner.lock(summary);
    const prompt = Ease.outCubic((age - lock) / ResultBanner.enter);
    const next = run
      ? S.run.again
      : summary.mode === 'unlimited'
        ? S.modes.again
        : summary.mode === 'mayhem'
          ? S.mayhem.again
          : r.outcome === 'completed'
            ? S.result.nextLevel(nextLevel)
            : S.result.retryLevel(nextLevel);
    const detail: [string, ColorToken] | null = run
      ? [run.line, run.lineColor]
      : r.costs > 0
        ? [S.result.loss(Fmt.number(r.costs), r.outcome === 'escaped'), 'destructive']
        : r.covered > 0
          ? [S.result.covered(Fmt.number(r.covered)), 'muted']
          : summary.mode === 'unlimited'
            ? [S.modes.carsSent(r.carsSent), 'accent']
            : summary.mode === 'mayhem'
              ? [S.mayhem.summary(r.wrecks, r.biggestChain), 'fireOuter']
              : null;
    const close = summary.closeCall;
    // The ring's gold bar already shows the XP; only a level climbed gets words.
    const climbed = summary.elite && summary.elite.climbed > 0 ? summary.elite : null;

    // The island holds one column, top to bottom: the failure icon, its details, the prompt, then the close call (or tomorrow's gift) and a climbed level. The cause itself lives behind the tappable Museum chip, so a long localized failure reason never crowds the roundabout.
    const rowOf = (s: string | null, size: number, weight: Weight): IslandRow => islandRow(list, s, islandRadius, size, weight);
    const promptRow = rowOf(next, 17, 'bold');
    // A lost shift's details ride in the top card, which grows to hold them; the island keeps only the prompt.
    const inCard = r.outcome !== 'completed';
    const detailRow = rowOf(inCard ? null : detail?.[0] ?? null, 14, 'bold');
    const closeRow = rowOf(inCard ? null : close?.text ?? null, 14, 'bold');
    // The words of a climbed level follow the bar: they wait until it closes.
    const eliteSince = age - RingSignals.hold - RingSignals.eliteClosesAt;
    const eliteIn = reduceMotion ? 1 : Ease.outCubic(eliteSince / 0.3);
    const cardRows = inCard
      ? [
          detail ? { s: detail[0], color: detail[1], enter: 1 } : null,
          close ? { s: close.text, color: close.color, enter: 1 } : null,
          climbed ? { s: S.elite.toGo(climbed), color: 'coin' as ColorToken, enter: eliteIn } : null,
        ].filter((x): x is { s: string; color: ColorToken; enter: number } => x !== null)
      : [];
    const grow = cardRows.length > 0 ? 2 * ResultBanner.cardPad + cardRows.length * ResultBanner.cardLine : 0;
    const giftRow = rowOf(gift, 13, 'regular');
    const eliteRow = rowOf(climbed && !inCard ? S.elite.toGo(climbed) : null, 16, 'bold');
    const chip = r.failCause !== null;
    const lowHeight = Math.max(closeRow.height, giftRow.height);
    let useDetail = detailRow.height > 0;
    let useLow = lowHeight > 0;
    let useElite = eliteRow.height > 0;
    const slotHeight = (): number => (useDetail ? detailRow.height : 0);
    const above = (): number => (chip ? FAIL_CHIP_SIZE + (slotHeight() > 0 ? 7 + slotHeight() : 0) : slotHeight());
    const total = (): number => above() + (above() > 0 ? 8 : 0) + promptRow.height + (useLow ? 8 + lowHeight : 0) + (useElite ? 6 + eliteRow.height : 0);
    const budget = 2 * (islandRadius * list.camera.scale - 14);
    if (total() > budget) useElite = false;
    if (total() > budget) useLow = false;
    if (total() > budget) useDetail = false;

    const island = toScreen(list.camera, v(0, 0));
    let y = -total() / 2;
    const chipAt = chip ? add(island, v(0, y + FAIL_CHIP_SIZE / 2)) : null;
    if (chip) y += FAIL_CHIP_SIZE + (slotHeight() > 0 ? 7 : 0);
    const detailY = y + slotHeight() / 2;
    y += slotHeight() + (above() > 0 ? 8 : 0);
    const promptY = y + promptRow.height / 2;
    y += promptRow.height + 8;
    const lowY = y + lowHeight / 2;
    y += useLow ? lowHeight + 6 : 0;
    const eliteY = y + eliteRow.height / 2;

    if (prompt <= 0) return { chip: chipAt, grow: 0 };
    islandBlock(list, promptRow.lines, islandRadius, promptY, 17, 'primary', prompt, 'bold');
    // Once the result's details are gone the prompt stays alone: the promise for tomorrow takes their place, as on the ready screen.
    if (useLow) islandBlock(list, giftRow.lines, islandRadius, lowY, 13, 'muted', prompt * ResultBanner.arriving(age));
    const details = prompt * (1 - ResultBanner.leaving(age));
    if (details <= 0.001) return { chip: chipAt, grow: 0 };
    if (useDetail && detail) islandBlock(list, detailRow.lines, islandRadius, detailY, 14, detail[1], details, 'bold');
    if (grow > 0) {
      const reveal = Ease.clamp01(list.topIntro / grow);
      const top = frame.maxY + list.topGrow - list.topIntro + ResultBanner.cardPad;
      cardRows.forEach((row, i) => drawFitted(list, row.s, v(R.center(frame).x, top + (i + 0.5) * ResultBanner.cardLine), 13, R.width(frame) - 32, row.color, { weight: 'bold', opacity: details * reveal * Ease.clamp01(row.enter), align: 'center' }));
    }
    if (useLow && close && !inCard) {
      // It lands a moment after the prompt: the thing to read after "tap to try again".
      const enter = reduceMotion ? 1 : Ease.outCubic((age - lock - 0.15) / 0.3);
      const rise = reduceMotion ? 0 : 6 * (1 - Ease.clamp01(enter));
      if (enter > 0) islandBlock(list, closeRow.lines, islandRadius, lowY + rise, 14, close.color, details * Ease.clamp01(enter), 'bold');
    }
    if (useElite && climbed) {
      // The words follow the bar: they wait until it closes, then land bigger.
      if (eliteIn > 0) islandBlock(list, eliteRow.lines, islandRadius, eliteY, 16 * (reduceMotion ? 1 : land(eliteSince / 0.45, 0.25)), 'coin', details * eliteIn, 'bold');
    }
    return { chip: chipAt, grow };
  },

};
