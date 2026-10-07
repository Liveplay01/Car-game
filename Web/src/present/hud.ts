import type { World } from '../core/world';
import type { MutatorId } from '../core/mutators';
import type { Arm } from '../core/roundabout';
import type { ShiftResult } from '../core/events';
import type { GameMode } from '../core/career';
import type { SwipeMode } from './flow';
import type { CityEvent, BossKind } from '../core/config';
import { Scoring } from '../core/scoring';
import { secureZone } from '../core/specials';
import { clearZone } from '../core/ambulance';
import { learnerZone } from '../core/learner';
import { oversizeZone } from '../core/oversize';
import { type Vec2, v, add, sub, mul, fromAngle, TAU, clamp } from '../core/vec2';
import { type RenderList, type Rect, R, rect, circle, arc, line, text, Ease, Metrics, toScreen, moved, type Align } from './render';
import type { ColorToken } from './theme';
import { MenuKit } from './menukit';
import { moneyTag, flameTag, textWidth } from './icons';
import { S, Fmt, money as moneyText, comboMultiplier } from './strings';
import { interpolatedPose } from './scene';
import { wrapText } from './upgrades';
import type { BriefView } from './briefing';

// MARK: Top bar

/** The one floating card of chrome at the top: MONEY · CARS/SCORE · BEST. */
export const TopBar = {
  margin: 16,
  top: 10,
  height: 58,
  corner: 20,
  scrim: 120,
  captionRow: 18,
  valueRow: 38,

  /** On a wide screen the card keeps a phone-like width, centred over the ring. */
  maxWidth: 560,
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

  column(point: Vec2, width: number): 'left' | 'center' | 'right' | null {
    const frame = TopBar.frame(width);
    if (!R.contains(frame, point)) return null;
    const cols = TopBar.columns(frame);
    if (R.contains(cols.left, point)) return 'left';
    return R.contains(cols.right, point) ? 'right' : 'center';
  },

  addScrim(list: RenderList): void {
    const tag = list.tag;
    list.tag = 'topbarScrim';
    TopBar.addScrimBands(list);
    list.tag = tag;
  },

  addScrimBands(list: RenderList): void {
    const width = list.camera.viewport.x;
    const steps = 12;
    for (let step = 0; step < steps; step++) {
      const slice = TopBar.scrim / steps;
      const opacity = 0.94 * (1 - Ease.smoothstep((step + 0.5) / steps));
      list.s(rect(v(width / 2, slice * (step + 0.5)), v(width + 80, slice + 0.5)), list.background, opacity);
    }
  },

  /** `brief`: a briefing shows on the card; its colour edges the card and the column lines give way. */
  addCard(list: RenderList, frame: Rect, opacity = 1, brief: BriefView | null = null): void {
    const tag = list.tag;
    list.tag = 'topbarCard';
    MenuKit.chromePanel(list, frame, TopBar.corner, opacity, brief ? brief.brief.color : null, brief ? brief.card : 1);
    const cols = TopBar.columns(frame);
    const lines = opacity * (1 - (brief?.card ?? 0));
    for (const x of [cols.left.maxX, cols.right.minX]) list.s(line(v(x, frame.minY + 14), v(x, frame.maxY - 14), 1), 'chromeEdge', lines);
    list.tag = tag;
  },

  /** How far the numbers and a briefing glide while they cross over (points). */
  briefTravel: 6,

  /**
   * A briefing on the card (`Briefings`): what it is, small and in its colour, then what to do,
   * on one line if it fits, else on two in a smaller size. A briefing with a time limit wears a
   * thin line along the card's foot that runs down with it.
   */
  addBrief(list: RenderList, frame: Rect, view: BriefView, reduceMotion: boolean, textScale = 1): void {
    const alpha = view.card * view.words;
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

  addColumn(list: RenderList, col: Rect, a: Align, caption: string, value: string, o: { captionColor?: ColorToken; valueSize?: number; valueColor?: ColorToken; opacity?: number } = {}): void {
    const x = TopBar.anchor(col, a);
    const opacity = o.opacity ?? 1;
    list.s(text(caption, v(x, col.minY + TopBar.captionRow), 10, a, 'bold'), o.captionColor ?? 'muted', opacity);
    list.s(text(value, v(x, col.minY + TopBar.valueRow), o.valueSize ?? 20, a, 'bold'), o.valueColor ?? 'primary', opacity);
  },

  addMoneyColumn(list: RenderList, col: Rect, a: Align, amount: string, o: { valueSize?: number; opacity?: number } = {}): void {
    const x = TopBar.anchor(col, a);
    const opacity = o.opacity ?? 1;
    const valueSize = o.valueSize ?? 20;
    list.s(text(S.hud.moneyLabel, v(x, col.minY + TopBar.captionRow), 10, a, 'bold'), 'muted', opacity);
    const room = R.width(col) - 24;
    const natural = textWidth(moneyText(amount), valueSize);
    const size = natural <= room ? valueSize : Math.max(11, (valueSize * room) / natural);
    moneyTag(list, amount, v(x, col.minY + TopBar.valueRow), size, a, 'primary', 'accent', opacity);
  },
};

// MARK: Popups

export type PopupKind =
  | { k: 'tightFit' }
  | { k: 'nearMiss' }
  | { k: 'perfect' }
  | { k: 'cutOff' }
  | { k: 'penalty'; n: number }
  | { k: 'busted'; n: number }
  | { k: 'dispatch' }
  | { k: 'seized' }
  | { k: 'lost' }
  | { k: 'paid'; n: number; jackpot?: boolean }
  /** A Critical Merge: its points, already multiplied. */
  | { k: 'critical'; n: number }
  /** A Jackpot transporter is announced at its arm. */
  | { k: 'jackpot' }
  | { k: 'earned'; n: number }
  | { k: 'cost'; n: number }
  | { k: 'covered' }
  | { k: 'modulePulse'; color: ColorToken }
  | { k: 'flames'; n: number; chain: number }
  | { k: 'boom' }
  | { k: 'convoy'; kind: BossKind }
  | { k: 'heist'; n: number }
  | { k: 'armour' }
  | { k: 'ambulance'; fire?: boolean }
  | { k: 'blocked' }
  | { k: 'clearRoad'; n: number }
  /** The learner driver: announced, its space taken, or left with room all the way. */
  | { k: 'learner' }
  | { k: 'crowded' }
  | { k: 'patient'; n: number }
  /** The oversize load: announced, its space taken, or left with room all the way. */
  | { k: 'oversize' }
  | { k: 'wideLoad'; n: number }
  /** The street racers: announced, and each one a police car stopped. */
  | { k: 'race' }
  | { k: 'raceStopped'; n: number }
  /** A close shave past a motorbike: its bonus points. */
  | { k: 'shave'; n: number };

export interface Popup {
  serial: number;
  kind: PopupKind;
  position: Vec2;
  age: number;
}

export const POPUP_LIFETIME = 0.9;

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

// MARK: HUD

export interface HudInput {
  world: World;
  level: number;
  score: number;
  money: number;
  best: string | null;
  comboPop: number;
  race: { delta: number; pop: number } | null;
  /** Unlimited: the mark just passed ("100 cars · GOLD"), shown in place of the car count for a moment. */
  mark: string | null;
  pops: Pops;
  flames: number;
  flamePop: number;
  /** Something new and what to do about it: it takes the top card's place for a while. */
  brief?: BriefView | null;
  reduceMotion?: boolean;
  textScale?: number;
}

/** The in-game HUD: the top card, the combo on the island, the specials. */
export const HUD = {
  add(list: RenderList, h: HudInput): void {
    if (h.world.config.mayhem) {
      HUD.addMayhem(list, h);
      return;
    }
    if (h.world.config.chill) {
      HUD.addChill(list, h);
      return;
    }
    HUD.addTopCard(list, h);
    if (h.world.config.endless) {
      const frame = TopBar.frame(list.camera.viewport.x);
      const label = h.mark ?? S.modes.carsSent(h.world.shift.carsSent);
      const at = v(R.center(frame).x, frame.maxY + 18);
      MenuKit.chromePill(list, at, v(textWidth(label, 12) + 28, 26), 1);
      list.s(text(label, at, 12 * land(h.pops.cars, 0.2), 'center', 'bold'), 'primary');
    }
  },

  /** A trial's counting goal under the top card, live ("Tight Fits or better 3/5"); accent once met. */
  addGoalPill(list: RenderList, label: string, met: boolean, pop: number): void {
    const frame = TopBar.frame(list.camera.viewport.x);
    const at = v(R.center(frame).x, frame.maxY + 18);
    MenuKit.chromePill(list, at, v(textWidth(label, 12) + 28, 26), 1, met ? 'accent' : undefined);
    list.s(text(label, at, 12 * land(pop, 0.2), 'center', 'bold'), met ? 'accent' : 'primary');
  },

  activeChain(world: World): number {
    const last = world.score.lastCrashAt;
    if (last === null || world.time - last > world.config.mayhemChainWindow) return 0;
    return world.score.crashChain;
  },

  /** Chill: how long the drive has gone on, the cars sent, and the longest drive so far. Nothing to lose. */
  addChill(list: RenderList, h: HudInput): void {
    TopBar.addScrim(list);
    const frame = TopBar.frame(list.camera.viewport.x);
    const cols = TopBar.columns(frame);
    TopBar.addCard(list, frame);
    list.tag = 'topbarLabels';
    TopBar.addColumn(list, cols.left, 'leading', S.chill.time, Fmt.seconds(h.world.shiftTime(h.world.time)));
    TopBar.addColumn(list, cols.center, 'center', S.chill.caption, Fmt.number(h.world.shift.carsSent), { captionColor: 'lightBlue', valueSize: Metrics.timerSize * land(h.pops.cars, 0.12) });
    TopBar.addColumn(list, cols.right, 'trailing', S.hud.bestLabel, h.best ?? '–', { valueColor: h.best === null ? 'muted' : 'primary' });
    list.tag = undefined;
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
      const inset = R.inset(c, 4);
      list.s(rect(R.center(inset), v(R.width(inset), R.height(inset)), TopBar.corner - 4), 'fireOuter', 0.28);
    }
    list.s(text(chain > 1 ? S.mayhem.chain(chain) : S.mayhem.flames, v(R.center(c).x, c.minY + TopBar.captionRow), 10, 'center', 'bold'), chain > 1 ? 'fireCore' : 'muted');
    flameTag(list, Fmt.number(h.flames), v(R.center(c).x, c.minY + TopBar.valueRow), Metrics.timerSize * land(h.flamePop, 0.3), 'center', 'primary');
    TopBar.addColumn(list, cols.right, 'trailing', S.hud.bestLabel, h.best ?? '–', { valueColor: h.best === null ? 'muted' : 'primary' });
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
    TopBar.addMoneyColumn(list, cols.left, 'leading', Fmt.number(h.money), { valueSize: 20 * land(h.pops.money, 0.15) });
    const c = cols.center;
    const tick = land(h.pops.cars, 0.12);
    const rush = world.shift.rushHourSince !== null;
    if (rush) {
      const open = Ease.spring(h.pops.rushHour);
      const inset = R.inset(c, 4);
      list.s(rect(R.center(inset), v(R.width(inset) * (0.7 + 0.3 * open), R.height(inset) * (0.7 + 0.3 * open)), TopBar.corner - 4), 'accent', Ease.outCubic(h.pops.rushHour / 0.4));
    }
    list.s(text(Fmt.number(h.score), v(R.center(c).x, c.minY + TopBar.valueRow), Metrics.timerSize * tick, 'center', 'bold'), rush ? 'accentInk' : 'primary');

    const dots: { used: boolean; ring: ColorToken }[] = [];
    if (world.config.maxStrikes > 1) {
      for (let i = 0; i < world.config.maxStrikes; i++) dots.push({ used: i < world.score.strikes, ring: rush ? 'accentInk' : 'muted' });
    }
    const firstPolice = dots.length;
    for (let i = 0; i < world.config.maxPoliceCrashes; i++) dots.push({ used: i < world.score.policeCrashes, ring: 'lightBlue' });
    const groupGap = firstPolice > 0 && dots.length > firstPolice ? 0.5 : 0;
    const span = dots.length - 1 + groupGap;
    dots.forEach((dot, index) => {
      const slot = index + (index >= firstPolice ? groupGap : 0);
      const at = v(R.center(c).x + (slot - span / 2) * Metrics.strikeSpacing, Metrics.strikeRow);
      const isNewest = index < firstPolice ? index === world.score.strikes - 1 : index - firstPolice === world.score.policeCrashes - 1;
      const pop = !isNewest ? 1 : index < firstPolice ? h.pops.strike : h.pops.policeCrash;
      if (dot.used) {
        if (pop < 1) {
          const x = Ease.outCubic(pop);
          list.s(arc(at, Metrics.strikeRadius * (1 + 1.6 * x), 1.5, 0, TAU), 'destructive', 1 - x);
        }
        list.s(circle(at, Metrics.strikeRadius * land(pop, 0.7)), 'destructive');
      } else list.s(arc(at, Metrics.strikeRadius - 0.75, 1.5, 0, TAU), dot.ring);
    });

    if (h.race) {
      TopBar.addColumn(list, cols.right, 'trailing', S.race.best, S.race.delta(h.race.delta), {
        valueSize: 18 * land(h.race.pop, 0.15),
        valueColor: h.race.delta <= 0 ? 'accent' : 'destructive',
      });
    } else TopBar.addColumn(list, cols.right, 'trailing', S.hud.bestLabel, h.best ?? '–', { valueColor: h.best === null ? 'muted' : 'primary' });
    if (brief) {
      // The numbers fade and lift away while the briefing settles in from below, and back.
      const shown = brief.card;
      if (shown >= 0.999) list.items.length = numbers;
      else {
        const lift = v(0, h.reduceMotion ? 0 : -TopBar.briefTravel * shown);
        for (let i = numbers; i < list.items.length; i++) list.items[i] = moved(list.items[i], lift, 1 - shown);
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
    if (world.shift.isRushHour) list.s(text(S.hud.rushFactor(c.rushHourScoreFactor), add(center, v(0, -38)), Metrics.comboLabelSize, 'center', 'bold'), 'accent');
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

  addWedge(list: RenderList, armItem: Arm, world: World, color: ColorToken): void {
    const pulse = (world.time * 1.6) % 1;
    const radius = RingSignals.rim(world);
    const half = 0.35;
    list.w(arc(v(0, 0), radius, 3 + 7 * pulse, armItem.angle - half, armItem.angle + half), color, 1 - pulse);
    list.w(arc(v(0, 0), radius, 2.5, armItem.angle - half, armItem.angle + half), color);
  },

  countdownRing(list: RenderList, at: Vec2, radius: number, left: number, color: ColorToken, label: string, labelSize = 14, labelOpacity = 1): void {
    list.w(arc(at, radius, 1, 0, TAU), color, 0.3);
    if (left > 0.001) list.w(arc(at, radius, 3, Math.PI / 2, Math.PI / 2 + TAU * left), color);
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
      const time = world.config.criminalTime * (boss ? world.config.convoyTimeFactor : 1);
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
    if (l.kind === 'warning') HUD.addWedge(list, l.arm, world, 'juiceGreen');
    else if (l.kind === 'arriving') {
      const veh = world.vehicle(l.vehicle);
      if (veh) list.w(arc(interpolatedPose(veh, alpha).position, 20, 2, 0, TAU), 'juiceGreen', 0.6);
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
      for (const edge of [r - lane, r + lane]) list.w(arc(v(0, 0), edge, 1.6, mid - half, mid + half), 'juiceGreen', 0.25 + 0.2 * pulse);
      list.w(arc(v(0, 0), r, world.layout.laneWidth - 6, mid - half, mid + half), 'juiceGreen', 0.05 + 0.03 * pulse);
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

  /** The ring glow: grows a little with the combo tier and more in the Flow State. */
  addFlowGlow(list: RenderList, world: World, flow: number): void {
    const c = world.config;
    const tiers = Math.min(c.comboThresholds.length, c.comboMultipliers.length);
    const tier = Scoring.tier(world.score.combo, c) / Math.max(1, tiers);
    const glow = Math.min(1, 0.3 * tier + 0.7 * flow);
    if (glow <= 0.01) return;
    const radius = world.layout.islandRadius - 3;
    list.w(arc(v(0, 0), radius, 12, 0, TAU), 'accent', 0.12 * glow);
    list.w(arc(v(0, 0), radius, 3, 0, TAU), 'accent', 0.45 * glow);
  },

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
        case 'jackpot':
          label = S.hud.jackpotIncoming;
          color = 'coin';
          size = Metrics.popupSize * 0.8;
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
        case 'busted':
          label = `${S.hud.busted} ${Fmt.signed(k.n)}`;
          color = 'lightBlue';
          break;
        case 'dispatch':
          label = S.hud.dispatch;
          color = 'lightBlue';
          break;
        case 'seized':
          label = S.hud.seized;
          color = 'vehicleCargo';
          break;
        case 'lost':
          label = S.hud.lost;
          color = 'destructive';
          break;
        case 'paid':
          label = k.jackpot ? S.hud.jackpotPaid(Fmt.signed(k.n)) : S.hud.paid(Fmt.signed(k.n));
          color = k.jackpot ? 'coin' : 'vehicleCargo';
          if (k.jackpot) size = Metrics.popupSize * 1.3 * (reduceMotion ? 1 : land(p.age / 0.35, 0.3));
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
        case 'convoy':
          label = S.boss.arriving(k.kind);
          color = 'coin';
          size = Metrics.popupSize * 0.8;
          break;
        case 'heist':
          label = S.boss.heist(moneyText(Fmt.number(k.n)));
          color = 'coin';
          break;
        case 'armour':
          label = S.boss.armour;
          color = 'coin';
          size = Metrics.popupSize * 0.8;
          break;
        case 'ambulance':
          label = k.fire ? S.ambulance.fire : S.ambulance.incoming;
          color = 'lightBlue';
          size = Metrics.popupSize * 0.8;
          break;
        case 'learner':
          label = S.learner.incoming;
          color = 'juiceGreen';
          size = Metrics.popupSize * 0.8;
          break;
        case 'crowded':
          label = S.learner.crowded;
          color = 'muted';
          size = Metrics.popupSize * 0.8;
          break;
        case 'patient':
          label = S.learner.patient(Fmt.signed(k.n));
          color = 'juiceGreen';
          break;
        case 'oversize':
          label = S.oversize.incoming;
          color = 'vehicleOversize';
          size = Metrics.popupSize * 0.8;
          break;
        case 'wideLoad':
          label = S.oversize.passed(Fmt.signed(k.n));
          color = 'vehicleOversize';
          break;
        case 'race':
          label = S.racers.incoming;
          color = 'vehicleRacer';
          size = Metrics.popupSize * 0.8;
          break;
        case 'raceStopped':
          label = S.racers.stopped(Fmt.signed(k.n));
          color = 'vehicleRacer';
          break;
        case 'shave':
          label = S.hud.shave(Fmt.signed(k.n));
          color = 'juiceOrange';
          size = Metrics.popupSize * 0.85;
          break;
        case 'blocked':
          label = S.ambulance.blocked;
          color = 'destructive';
          break;
        case 'clearRoad':
          label = S.ambulance.clear(Fmt.signed(k.n));
          color = 'lightBlue';
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

export type SignalKind = 'wave' | 'flush' | 'sweep';
const SIGNAL_DURATION: Record<SignalKind, number> = { wave: 0.7, flush: 0.6, sweep: 1.1 };

interface Signal {
  kind: SignalKind;
  color: ColorToken;
  age: number;
}

/** The island's rim as the game's signal track. */
export class RingSignals {
  static rim = (world: World): number => world.layout.islandRadius - 14;
  static readonly hold = 0.9;
  total = 0;
  sent = 0;
  lit: ColorToken = 'primary';
  arrival = Infinity;
  sinceSent = Infinity;
  leaving: { total: number; sent: number; lit: ColorToken; age: number } | null = null;
  signals: Signal[] = [];

  age(delta: number): void {
    this.arrival += delta;
    this.sinceSent += delta;
    if (this.leaving) {
      this.leaving.age += delta;
      if (this.leaving.age >= 0.35) this.leaving = null;
    }
    for (const s of this.signals) s.age += delta;
    this.signals = this.signals.filter((s) => s.age < SIGNAL_DURATION[s.kind]);
  }

  signal(kind: SignalKind, color: ColorToken): void {
    this.signals = this.signals.filter((s) => !(s.kind === kind && s.color === color));
    this.signals.push({ kind, color, age: 0 });
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
    const rim = RingSignals.rim(world);
    const start = world.layout.player.angle;
    if (this.leaving) {
      const fade = 1 - Ease.outCubic(this.leaving.age / 0.35);
      this.ticks(list, this.leaving.total, this.leaving.sent, this.leaving.lit, start, rim, fade, Infinity, Infinity, reduceMotion);
    }
    this.ticks(list, this.total, this.sent, this.lit, start, rim, 1, this.arrival, this.sinceSent, reduceMotion);
    const outer = world.layout.ringRadius + world.layout.laneWidth / 2;
    for (const s of this.signals) {
      const x = Ease.clamp01(s.age / SIGNAL_DURATION[s.kind]);
      const kind = reduceMotion ? 'flush' : s.kind;
      if (kind === 'flush') {
        const fade = 1 - Ease.outCubic(x);
        list.w(arc(v(0, 0), rim, 8, 0, TAU), s.color, 0.22 * fade);
        list.w(arc(v(0, 0), rim, 2.5, 0, TAU), s.color, 0.8 * fade);
      } else if (kind === 'wave') {
        const radius = rim + (outer - rim) * Ease.outCubic(x);
        list.w(arc(v(0, 0), radius, 1 + 2.5 * (1 - x), 0, TAU), s.color, 0.55 * (1 - x));
      } else {
        const run = Ease.inOutSine(x / 0.8);
        const head = start + TAU * run;
        const fade = 1 - Ease.clamp01((x - 0.8) / 0.2);
        if (run > 0.001) {
          list.w(arc(v(0, 0), rim, 6, start, head), s.color, 0.18 * fade);
          list.w(arc(v(0, 0), rim, 3.5, Math.max(start, head - 0.7), head), s.color, 0.9 * fade);
        }
      }
    }
  }

  private ticks(list: RenderList, total: number, sent: number, lit: ColorToken, start: number, rim: number, opacity: number, arrival: number, sinceSent: number, reduceMotion: boolean): void {
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
      list.w(arc(v(0, 0), rim, thickness, center - half * grow, center + half * grow), isLit ? lit : 'marking', (isLit ? 0.85 : 0.6) * opacity * appear);
    }
  }
}

// MARK: Banners

export const ModeBanner = {
  duration: 1.8,
  tint: (m: SwipeMode): ColorToken => (m === 'shift' || m === 'multiplayer' ? 'primary' : m === 'unlimited' ? 'accent' : m === 'chill' ? 'lightBlue' : 'fireOuter'),
  add(list: RenderList, mode: SwipeMode, age: number, top: number, reduceMotion: boolean): void {
    if (age >= ModeBanner.duration) return;
    const width = list.camera.viewport.x;
    const leave = Ease.clamp01((age - (ModeBanner.duration - 0.35)) / 0.35);
    const opacity = Ease.outCubic(age / 0.15) * (1 - leave);
    if (opacity <= 0.01) return;
    const pop = reduceMotion ? 1 : Ease.spring(age / 0.45);
    const rise = reduceMotion ? 0 : -14 * Ease.outCubic(leave);
    const center = v(width / 2, top + 30 + rise);
    const size = mul(v(Math.min(width - 48, 260), 60), 0.7 + 0.3 * pop);
    MenuKit.chromePill(list, center, size, opacity, ModeBanner.tint(mode));
    list.s(text(S.modes.name(mode), add(center, v(0, -9)), 20 * (0.8 + 0.2 * pop), 'center', 'bold'), ModeBanner.tint(mode), opacity);
    list.s(text(S.modes.line(mode), add(center, v(0, 14)), 12, 'center'), 'muted', opacity);
  },
};

/** After Level 5, until the first swipe: a pill says the other modes are a swipe away, its arrows nudging outward. */
export const ModeHint = {
  add(list: RenderList, center: Vec2, shown: number, time: number, reduceMotion: boolean): void {
    const alpha = Ease.outCubic(shown);
    if (alpha <= 0.01) return;
    const label = S.modes.swipeHint;
    const size = v(textWidth(label, 13) + 64, 32);
    const at = add(center, v(0, reduceMotion ? 0 : 10 * (1 - alpha)));
    MenuKit.chromePill(list, at, size, alpha);
    list.s(text(label, at, 13, 'center', 'bold'), 'primary', alpha);
    const nudge = reduceMotion ? 0 : 4 * Math.max(0, Math.sin(time * 3.2));
    list.s(text('‹', add(at, v(-size.x / 2 + 17 - nudge, -1)), 19, 'center', 'bold'), 'accent', alpha);
    list.s(text('›', add(at, v(size.x / 2 - 17 + nudge, -1)), 19, 'center', 'bold'), 'accent', alpha);
  },
};

export interface DailyCard {
  event: CityEvent | null;
  streak: number;
  /** The streak pays more on every shift right now. */
  bonus: number | null;
  /** Hours until the streak breaks, when that is close; null otherwise. */
  endsIn: number | null;
  /** Streak Freezes in stock. */
  freezes: number;
  next: { days: number; item: string; left: number } | null;
  splash: number | null;
  /** Today's twist (core/mutators.ts). */
  mutator: MutatorId | null;
}

/** A condition met for the first time, as the ready screen explains it. */
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

export const ReadyBanner = {
  splashDuration: 2.4,
  add(
    list: RenderList,
    o: {
      level: number;
      cars: number;
      highscore: string | null;
      money: string;
      conditions: string | null;
      daily: DailyCard | null;
      /** Tailwind waits: the next shift pays this much more (0.25), shown as a pill. */
      tailwind?: number | null;
      /** The Heat this career shift runs at (0 = off), in the same pill. */
      heat?: number;
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
      /** Conditions met for the first time: what they are and what they do. */
      intro?: ConditionIntro[] | null;
      /** Larger text (Settings): the intro card's type a step up. */
      textScale?: number;
      /** Room a notice takes under the top card right now: the intro card makes way for it. */
      noticeRoom?: number;
    },
  ): number {
    const width = list.camera.viewport.x;
    const run = o.run ?? null;
    const opacity = o.opacity ?? 1;
    const frame = TopBar.frame(width);
    const cols = TopBar.columns(frame);
    if (o.drawsCard ?? true) {
      TopBar.addScrim(list);
      TopBar.addCard(list, frame);
    }
    list.tag = 'topbarLabels';
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
          : o.mode === 'chill'
            ? [S.chill.caption, 'lightBlue']
            : [S.mayhem.caption, 'fireOuter'];
    const value = o.versus ? S.modes.versusPlayers : o.mode === 'unlimited' || o.mode === 'chill' ? S.modes.endless : S.hud.cars(o.cars);
    TopBar.addColumn(list, cols.center, 'center', caption, value, { captionColor, valueSize: Metrics.timerSize, opacity });
    if (run) TopBar.addColumn(list, cols.right, 'trailing', run.right[0], run.right[1], { opacity });
    else if (o.daily?.mutator) {
      // Today's twist takes the place of the best score: the Daily is one try a day.
      const twist = S.mutator.name(o.daily.mutator);
      const room = R.width(cols.right) - 32;
      TopBar.addColumn(list, cols.right, 'trailing', S.mutator.caption, twist, { opacity, valueSize: Math.max(11, Math.min(20, (20 * room) / Math.max(1, textWidth(twist, 20)))) });
    } else if (o.versus) {
      // A long name shrinks to fit its column.
      const name = o.playerName || S.modes.defaultName;
      const room = R.width(cols.right) - 32;
      TopBar.addColumn(list, cols.right, 'trailing', S.modes.youLabel, name, { opacity, valueSize: Math.max(11, Math.min(20, (20 * room) / Math.max(1, textWidth(name, 20)))) });
    }
    else TopBar.addColumn(list, cols.right, 'trailing', S.hud.bestLabel, o.highscore ?? '–', { valueColor: o.highscore === null ? 'muted' : 'primary', opacity });
    list.tag = undefined;
    const pillText = run ? run.badge : o.daily ? S.daily.streakPill(o.daily.streak, o.daily.bonus, o.daily.endsIn, o.daily.freezes) : S.heat.pill(o.heat ?? 0, o.tailwind ?? null);
    if (pillText) {
      const under = v(width / 2, frame.maxY + 18);
      const lineText = pillText;
      MenuKit.chromePill(list, under, v(textWidth(lineText, 12) + 28, 26), opacity);
      // A streak about to break says so in the warning colour.
      list.s(text(lineText, under, 12, 'center'), !run && o.daily?.endsIn != null ? 'hazard' : 'primary', opacity);
    }
    const island = toScreen(list.camera, v(0, 0));
    // The card names the new conditions itself, so the line on the island makes way for it.
    const introBottom = island.y - (run?.line ? 49 : 26);
    const under = frame.maxY + (pillText ? 31 : 0);
    const intro = o.intro && o.intro.length > 0 ? ReadyBanner.introLayout(o.intro, frame, under + 12 + (o.noticeRoom ?? 0), introBottom, o.textScale ?? 1) : null;
    const conditions = intro ? null : o.conditions;
    if (o.prompt) {
      const breath = o.reduceMotion ? 1 : 0.7 + 0.3 * (0.5 + 0.5 * Math.cos(o.time * 2.4));
      list.s(text(o.prompt, island, 17, 'center', 'bold'), 'primary', breath * opacity);
    }
    const line = run ? [run.line, conditions].filter((x): x is string => !!x).join(' · ') : conditions;
    if (line) list.s(text(line, sub(island, v(0, 28)), 14, 'center', 'bold'), run ? run.color : 'hazard', opacity);
    if (o.goal && o.prompt) list.s(text(o.goal, add(island, v(0, 28)), 13, 'center'), 'muted', opacity * (o.reduceMotion ? 1 : Ease.outCubic(o.time / 0.4)));
    if (intro) ReadyBanner.addIntro(list, intro, o.time, o.reduceMotion, opacity);
    if (o.daily && o.daily.splash !== null) ReadyBanner.addSplash(list, o.daily, o.daily.splash, o.reduceMotion);
    return under;
  },

  /** The intro comes a beat after the ready screen, so it reads as news, not as part of the card. */
  introDelay: 0.35,

  /** Wide enough for two conditions, narrow enough that a line stays easy to read (about 60 characters). */
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
   * A condition met for the first time, under the top card: its name in the colour of the
   * conditions line, and what changes. It comes a beat after the ready screen and goes when
   * the shift starts; the Museum keeps the longer story.
   */
  addIntro(list: RenderList, l: IntroLayout, time: number, reduceMotion: boolean, opacity: number): void {
    const age = time - ReadyBanner.introDelay;
    if (age <= 0) return;
    const enter = reduceMotion ? Ease.clamp01(age / 0.2) : MenuKit.staggerSpring(age, 0);
    const rise = reduceMotion ? 0 : MenuKit.cardEnter(enter).rise;
    const alpha = Ease.clamp01(enter) * opacity;
    const box = R.offset(l.box, v(0, rise));
    MenuKit.chromePanel(list, box, TopBar.corner, alpha);
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

  addSplash(list: RenderList, daily: DailyCard, age: number, reduceMotion: boolean): void {
    const vp = list.camera.viewport;
    const leave = Ease.clamp01((age - (ReadyBanner.splashDuration - 0.45)) / 0.45);
    const alpha = Ease.outCubic(age / 0.25) * (1 - Ease.outCubic(leave));
    if (alpha <= 0.001) return;
    list.s(rect(mul(vp, 0.5), vp), 'background', 0.7 * alpha);
    const pop = reduceMotion ? 1 : Ease.spring(age / 0.5);
    const center = add(mul(vp, 0.5), v(0, reduceMotion ? 0 : -70 * Ease.inCubic(leave) - 20));
    const twist = daily.mutator;
    const size = mul(v(Math.min(vp.x - 40, 340), twist ? 212 : 176), 0.85 + 0.15 * pop);
    list.s(rect(center, add(size, v(6, 6)), 25), 'hazard', 0.35 * alpha);
    list.s(rect(center, size, 22), 'surface', alpha);
    const ln = (s: string, dy: number, sz: number, weight: 'regular' | 'bold', color: ColorToken): void => list.s(text(s, add(center, v(0, dy)), sz, 'center', weight), color, alpha);
    // A twist adds two lines on top; the rest keeps its order.
    const shift = twist ? 18 : 0;
    ln(S.daily.title, -48 - shift, 30 * (0.8 + 0.2 * pop), 'bold', 'hazard');
    if (twist) {
      ln(S.mutator.name(twist), -14 - shift, 17, 'bold', 'accent');
      ln(S.mutator.line(twist), 6 - shift, 12, 'regular', 'muted');
    }
    if (daily.event) ln(S.daily.splashLine(daily.event), -8 + shift, 14, 'regular', 'primary');
    ln(S.daily.streakLine(daily.streak), 20 + shift, 13, 'regular', 'muted');
    if (daily.next) ln(S.daily.nextMilestone(daily.next.left, daily.next.item), 46 + shift, 12, 'bold', 'accent');
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
  enter: 0.25,
  countDelay: 0.35,
  countDuration: 1.2,
  epilogue: 3.6,
  fade: 0.6,
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
    if (summary.mode === 'chill') [title, titleColor] = [S.chill.over, 'lightBlue'];
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
        : summary.mode === 'chill'
          ? S.chill.summary(r.carsSent, Fmt.seconds(r.time))
          : S.result.stats(r.bestCombo, r.tightFits, r.takedowns, r.transporters, Fmt.seconds(r.time));
    const best = summary.isNewHighscore ? `. ${S.result.newBest}` : '';
    return summary.mode === 'chill' ? `${title}. ${detail}${best}` : `${title}. ${Fmt.number(r.score)} points${best}. ${detail}`;
  },

  add(list: RenderList, summary: ShiftSummary, nextLevel: number, bank: { before: number; after: number }, age: number, reduceMotion: boolean): void {
    const r = summary.result;
    const frame = TopBar.frame(list.camera.viewport.x);
    const cols = TopBar.columns(frame);
    TopBar.addScrim(list);
    TopBar.addCard(list, frame);
    const shown = Ease.outCubic(age / ResultBanner.enter) * (1 - ResultBanner.leaving(age));
    const [title, titleColor] = ResultBanner.title(summary);
    const run = summary.run;

    list.tag = 'topbarLabels';
    if (shown > 0.001) {
      const x = reduceMotion ? 1 : Ease.clamp01((age - ResultBanner.countDelay) / ResultBanner.countDuration);
      const counted = bank.before + Math.round((bank.after - bank.before) * Ease.outCubic(x));
      const landed = (age - ResultBanner.countDelay - ResultBanner.countDuration) / 0.35;
      const size = reduceMotion || landed < 0 || bank.after === bank.before ? 20 : 20 * land(landed, 0.15);
      TopBar.addMoneyColumn(list, cols.left, 'leading', Fmt.number(counted), { valueSize: size, opacity: shown });
      const pop = reduceMotion ? 1 : land(age / 0.4, 0.12);
      if (summary.mode === 'mayhem' && !run) {
        list.s(text(title, v(R.center(cols.center).x, cols.center.minY + TopBar.captionRow), 10, 'center', 'bold'), titleColor, shown);
        flameTag(list, Fmt.number(r.flames), v(R.center(cols.center).x, cols.center.minY + TopBar.valueRow), Metrics.timerSize * pop, 'center', 'primary', shown);
      } else if (summary.mode === 'chill') {
        TopBar.addColumn(list, cols.center, 'center', title, Fmt.number(r.carsSent), { captionColor: titleColor, valueSize: Metrics.timerSize * pop, opacity: shown });
      } else {
        TopBar.addColumn(list, cols.center, 'center', title, Fmt.number(r.score), { captionColor: titleColor, valueSize: Metrics.timerSize * pop, opacity: shown });
      }
      if (run) {
        const [caption, value] = run.right;
        TopBar.addColumn(list, cols.right, 'trailing', caption, value, { valueSize: 16, opacity: shown });
      } else if (summary.isNewHighscore) {
        TopBar.addColumn(list, cols.right, 'trailing', S.result.newBest, Fmt.number(summary.mode === 'mayhem' ? r.flames : summary.mode === 'chill' ? r.carsSent : r.score), { captionColor: 'accent', valueColor: 'accent', opacity: shown });
      } else {
        TopBar.addColumn(list, cols.right, 'trailing', S.hud.bestLabel, summary.previousHighscore > 0 ? Fmt.number(summary.previousHighscore) : '–', {
          valueColor: summary.previousHighscore > 0 ? 'primary' : 'muted',
          opacity: shown,
        });
      }
    }
    list.tag = undefined;
    const island = toScreen(list.camera, v(0, 0));
    if (r.money > 0 && shown > 0.001) {
      const x = reduceMotion ? 1 : Ease.clamp01((age - ResultBanner.countDelay) / ResultBanner.countDuration);
      const counted = Math.round(r.money * Ease.outCubic(x));
      const landed = (age - ResultBanner.countDelay - ResultBanner.countDuration) / 0.35;
      moneyTag(list, '+' + Fmt.number(counted), sub(island, v(0, 64)), reduceMotion || landed < 0 ? 26 : 26 * land(landed, 0.2), 'center', 'primary', 'accent', shown);
    }
    const prompt = Ease.outCubic((age - ResultBanner.inputLock) / ResultBanner.enter);
    if (prompt <= 0) return;
    const next = run
      ? S.run.again
      : summary.mode === 'unlimited'
        ? S.modes.again
        : summary.mode === 'mayhem'
          ? S.mayhem.again
          : summary.mode === 'chill'
            ? S.chill.again
            : r.outcome === 'completed'
            ? S.result.nextLevel(nextLevel)
            : S.result.retryLevel(nextLevel);
    list.s(text(next, island, 17, 'center', 'bold'), 'primary', prompt);
    const details = prompt * (1 - ResultBanner.leaving(age));
    if (details <= 0.001) return;
    if (run) list.s(text(run.line, sub(island, v(0, 28)), 14, 'center', 'bold'), run.lineColor, details);
    else if (r.costs > 0) list.s(text(S.result.loss(Fmt.number(r.costs), r.outcome === 'escaped'), sub(island, v(0, 28)), 14, 'center', 'bold'), 'destructive', details);
    else if (r.covered > 0) list.s(text(S.result.covered(Fmt.number(r.covered)), sub(island, v(0, 28)), 14, 'center', 'bold'), 'muted', details);
    else if (summary.mode === 'unlimited') list.s(text(S.modes.carsSent(r.carsSent), sub(island, v(0, 28)), 14, 'center', 'bold'), 'accent', details);
    else if (summary.mode === 'mayhem') list.s(text(S.mayhem.summary(r.wrecks, r.biggestChain), sub(island, v(0, 28)), 14, 'center', 'bold'), 'fireOuter', details);
    else if (summary.mode === 'chill') list.s(text(S.chill.summary(r.carsSent, Fmt.seconds(r.time)), sub(island, v(0, 28)), 14, 'center', 'bold'), 'lightBlue', details);
    if (summary.mode !== 'mayhem' && summary.mode !== 'chill') {
      list.s(text(S.result.stats(r.bestCombo, r.tightFits, r.takedowns, r.transporters, Fmt.seconds(r.time)), add(island, v(0, 28)), 13, 'center'), 'muted', details);
    }
    const close = summary.closeCall;
    if (close) {
      // It lands a moment after the prompt: the thing to read after "tap to try again".
      const enter = reduceMotion ? 1 : Ease.outCubic((age - ResultBanner.inputLock - 0.15) / 0.3);
      const rise = reduceMotion ? 0 : 6 * (1 - Ease.clamp01(enter));
      if (enter > 0) list.s(text(close.text, add(island, v(0, 54 + rise)), 14, 'center', 'bold'), close.color, details * Ease.clamp01(enter));
    }
  },
};
