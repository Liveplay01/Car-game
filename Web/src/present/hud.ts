import type { World } from '../core/world';
import type { Arm } from '../core/roundabout';
import type { ShiftResult } from '../core/events';
import type { GameMode } from '../core/career';
import type { CityEvent } from '../core/config';
import { Scoring } from '../core/scoring';
import { secureZone } from '../core/specials';
import { type Vec2, v, add, sub, mul, fromAngle, TAU } from '../core/vec2';
import { type RenderList, type Rect, R, rect, circle, arc, line, text, Ease, Metrics, toScreen, type Align } from './render';
import type { ColorToken } from './theme';
import { MenuKit } from './menukit';
import { moneyTag, flameTag, textWidth } from './icons';
import { S, Fmt, money as moneyText, comboMultiplier } from './strings';
import { interpolatedPose } from './scene';

// MARK: Top bar

/** The one floating card of chrome at the top (`TopBar.swift`): MONEY · CARS/SCORE · BEST. */
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

  addCard(list: RenderList, frame: Rect, opacity = 1): void {
    const tag = list.tag;
    list.tag = 'topbarCard';
    MenuKit.chromePanel(list, frame, TopBar.corner, opacity);
    const cols = TopBar.columns(frame);
    for (const x of [cols.left.maxX, cols.right.minX]) list.s(line(v(x, frame.minY + 14), v(x, frame.maxY - 14), 1), 'chromeEdge', opacity);
    list.tag = tag;
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
  | { k: 'paid'; n: number }
  | { k: 'earned'; n: number }
  | { k: 'cost'; n: number }
  | { k: 'covered' }
  | { k: 'modulePulse'; color: ColorToken }
  | { k: 'flames'; n: number; chain: number }
  | { k: 'boom' };

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
  pops: Pops;
  flames: number;
  flamePop: number;
}

/** The in-game HUD (`HUD.swift`): the top card, the combo on the island, the specials. */
export const HUD = {
  add(list: RenderList, h: HudInput): void {
    if (h.world.config.mayhem) {
      HUD.addMayhem(list, h);
      return;
    }
    HUD.addTopCard(list, h);
    if (h.world.config.endless) {
      const frame = TopBar.frame(list.camera.viewport.x);
      const label = S.modes.carsSent(h.world.shift.carsSent);
      const at = v(R.center(frame).x, frame.maxY + 18);
      MenuKit.chromePill(list, at, v(textWidth(label, 12) + 28, 26), 1);
      list.s(text(label, at, 12 * land(h.pops.cars, 0.2), 'center', 'bold'), 'primary');
    }
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
    TopBar.addScrim(list);
    const frame = TopBar.frame(list.camera.viewport.x);
    const cols = TopBar.columns(frame);
    TopBar.addCard(list, frame);
    list.tag = 'topbarLabels';
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
    if (world.shift.isRushHour) list.s(text(S.hud.rushFactor(c.rushHourScoreFactor), add(center, v(0, -38)), Metrics.comboLabelSize, 'center', 'bold'), 'accent');
    if (world.criminal.kind === 'active') {
      list.s(text(S.hud.wanted(world.criminal.deadline - world.time), add(center, v(0, -64)), 17, 'center', 'bold'), 'vehicleCriminal');
    }
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
      HUD.countdownRing(list, pos, 20, Math.max(0, cr.deadline - world.time) / world.config.criminalTime, 'vehicleCriminal', String(Math.ceil(cr.deadline - world.time)));
    }
  },

  addTransporter(list: RenderList, world: World, alpha: number): void {
    const t = world.transporter;
    if (t.kind === 'warning') HUD.addWedge(list, t.arm, world, 'vehicleCargo');
    else if (t.kind === 'arriving') {
      const truck = world.vehicle(t.vehicle);
      if (truck) list.w(arc(interpolatedPose(truck, alpha).position, 20, 2, 0, TAU), 'vehicleCargo', 0.6);
    } else if (t.kind === 'active') {
      const truck = world.vehicle(t.vehicle);
      if (!truck || truck.isCrashed) return;
      const pos = interpolatedPose(truck, alpha).position;
      HUD.countdownRing(list, pos, 20, Math.max(0, t.deadline - world.time) / world.config.transporterTime, 'vehicleCargo', String(Math.ceil(t.deadline - world.time)));
      const zone = secureZone(world);
      if (zone) {
        const ringRadius = world.layout.ringRadius;
        const center = Math.atan2(pos.y, pos.x);
        const half = zone.arc / 2 / ringRadius;
        list.w(arc(v(0, 0), ringRadius + world.config.laneWidth / 2 - 3, 2, center - half, center + half), 'vehicleCargo', 0.35);
      }
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
    const radius = world.layout.ringRadius - c.laneWidth / 2 - 3;
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
          label = S.hud.paid(Fmt.signed(k.n));
          color = 'vehicleCargo';
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
      }
      let at = add(toScreen(cam, p.position), v(0, -30));
      const height = size + 4;
      for (;;) {
        const below = placed.find((q) => Math.abs(q.at.x - at.x) < 56 && Math.abs(q.at.y - at.y) < (q.height + height) / 2);
        if (!below) break;
        at = v(at.x, below.at.y - (below.height + height) / 2);
      }
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

/** The island's rim as the game's signal track (`RingSignals.swift`). */
export class RingSignals {
  static rim = (world: World): number => world.layout.ringRadius - world.layout.laneWidth / 2 - 14;
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
  tint: (m: GameMode): ColorToken => (m === 'shift' ? 'primary' : m === 'unlimited' ? 'accent' : 'fireOuter'),
  add(list: RenderList, mode: GameMode, age: number, top: number, reduceMotion: boolean): void {
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

export interface DailyCard {
  event: CityEvent | null;
  streak: number;
  next: { days: number; item: string; left: number } | null;
  splash: number | null;
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
      mode: GameMode;
      prompt: string | null;
      time: number;
      reduceMotion: boolean;
      drawsCard?: boolean;
      opacity?: number;
    },
  ): void {
    const width = list.camera.viewport.x;
    const opacity = o.opacity ?? 1;
    const frame = TopBar.frame(width);
    const cols = TopBar.columns(frame);
    if (o.drawsCard ?? true) {
      TopBar.addScrim(list);
      TopBar.addCard(list, frame);
    }
    list.tag = 'topbarLabels';
    TopBar.addMoneyColumn(list, cols.left, 'leading', o.money, { opacity });
    const [caption, captionColor]: [string, ColorToken] =
      o.mode === 'shift' ? (o.daily === null ? [S.ready.levelCaption(o.level), 'muted'] : [S.daily.title, 'hazard']) : o.mode === 'unlimited' ? [S.modes.unlimitedCaption, 'accent'] : [S.mayhem.caption, 'fireOuter'];
    TopBar.addColumn(list, cols.center, 'center', caption, o.mode === 'unlimited' ? S.modes.endless : S.hud.cars(o.cars), { captionColor, valueSize: Metrics.timerSize, opacity });
    TopBar.addColumn(list, cols.right, 'trailing', S.hud.bestLabel, o.highscore ?? '–', { valueColor: o.highscore === null ? 'muted' : 'primary', opacity });
    list.tag = undefined;
    if (o.daily) {
      const under = v(width / 2, frame.maxY + 18);
      const lineText = S.daily.streakLine(o.daily.streak);
      MenuKit.chromePill(list, under, v(textWidth(lineText, 12) + 28, 26), opacity);
      list.s(text(lineText, under, 12, 'center'), 'primary', opacity);
    }
    const island = toScreen(list.camera, v(0, 0));
    if (o.prompt) {
      const breath = o.reduceMotion ? 1 : 0.7 + 0.3 * (0.5 + 0.5 * Math.cos(o.time * 2.4));
      list.s(text(o.prompt, island, 17, 'center', 'bold'), 'primary', breath * opacity);
    }
    if (o.conditions) list.s(text(o.conditions, sub(island, v(0, 28)), 14, 'center', 'bold'), 'hazard', opacity);
    if (o.daily && o.daily.splash !== null) ReadyBanner.addSplash(list, o.daily, o.daily.splash, o.reduceMotion);
  },

  addSplash(list: RenderList, daily: DailyCard, age: number, reduceMotion: boolean): void {
    const vp = list.camera.viewport;
    const leave = Ease.clamp01((age - (ReadyBanner.splashDuration - 0.45)) / 0.45);
    const alpha = Ease.outCubic(age / 0.25) * (1 - Ease.outCubic(leave));
    if (alpha <= 0.001) return;
    list.s(rect(mul(vp, 0.5), vp), 'background', 0.7 * alpha);
    const pop = reduceMotion ? 1 : Ease.spring(age / 0.5);
    const center = add(mul(vp, 0.5), v(0, reduceMotion ? 0 : -70 * Ease.inCubic(leave) - 20));
    const size = mul(v(Math.min(vp.x - 40, 340), 176), 0.85 + 0.15 * pop);
    list.s(rect(center, add(size, v(6, 6)), 25), 'hazard', 0.35 * alpha);
    list.s(rect(center, size, 22), 'surface', alpha);
    const ln = (s: string, dy: number, sz: number, weight: 'regular' | 'bold', color: ColorToken): void => list.s(text(s, add(center, v(0, dy)), sz, 'center', weight), color, alpha);
    ln(S.daily.title, -48, 30 * (0.8 + 0.2 * pop), 'bold', 'hazard');
    if (daily.event) ln(S.daily.splashLine(daily.event), -8, 14, 'regular', 'primary');
    ln(S.daily.streakLine(daily.streak), 20, 13, 'regular', 'muted');
    if (daily.next) ln(S.daily.nextMilestone(daily.next.left, daily.next.item), 46, 12, 'bold', 'accent');
  },
};

export interface ShiftSummary {
  result: ShiftResult;
  level: number;
  isNewHighscore: boolean;
  previousHighscore: number;
  mode: GameMode;
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

  add(list: RenderList, summary: ShiftSummary, nextLevel: number, bank: { before: number; after: number }, age: number, reduceMotion: boolean): void {
    const r = summary.result;
    const frame = TopBar.frame(list.camera.viewport.x);
    const cols = TopBar.columns(frame);
    TopBar.addScrim(list);
    TopBar.addCard(list, frame);
    const shown = Ease.outCubic(age / ResultBanner.enter) * (1 - ResultBanner.leaving(age));
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

    list.tag = 'topbarLabels';
    if (shown > 0.001) {
      const x = reduceMotion ? 1 : Ease.clamp01((age - ResultBanner.countDelay) / ResultBanner.countDuration);
      const counted = bank.before + Math.round((bank.after - bank.before) * Ease.outCubic(x));
      const landed = (age - ResultBanner.countDelay - ResultBanner.countDuration) / 0.35;
      const size = reduceMotion || landed < 0 || bank.after === bank.before ? 20 : 20 * land(landed, 0.15);
      TopBar.addMoneyColumn(list, cols.left, 'leading', Fmt.number(counted), { valueSize: size, opacity: shown });
      const pop = reduceMotion ? 1 : land(age / 0.4, 0.12);
      if (summary.mode === 'mayhem') {
        list.s(text(title, v(R.center(cols.center).x, cols.center.minY + TopBar.captionRow), 10, 'center', 'bold'), titleColor, shown);
        flameTag(list, Fmt.number(r.flames), v(R.center(cols.center).x, cols.center.minY + TopBar.valueRow), Metrics.timerSize * pop, 'center', 'primary', shown);
      } else {
        TopBar.addColumn(list, cols.center, 'center', title, Fmt.number(r.score), { captionColor: titleColor, valueSize: Metrics.timerSize * pop, opacity: shown });
      }
      if (summary.isNewHighscore) {
        TopBar.addColumn(list, cols.right, 'trailing', S.result.newBest, Fmt.number(summary.mode === 'mayhem' ? r.flames : r.score), { captionColor: 'accent', valueColor: 'accent', opacity: shown });
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
    const next =
      summary.mode === 'unlimited' ? S.modes.again : summary.mode === 'mayhem' ? S.mayhem.again : r.outcome === 'completed' ? S.result.nextLevel(nextLevel) : S.result.retryLevel(nextLevel);
    list.s(text(next, island, 17, 'center', 'bold'), 'primary', prompt);
    const details = prompt * (1 - ResultBanner.leaving(age));
    if (details <= 0.001) return;
    if (r.costs > 0) list.s(text(S.result.loss(Fmt.number(r.costs), r.outcome === 'escaped'), sub(island, v(0, 28)), 14, 'center', 'bold'), 'destructive', details);
    else if (r.covered > 0) list.s(text(S.result.covered(Fmt.number(r.covered)), sub(island, v(0, 28)), 14, 'center', 'bold'), 'muted', details);
    else if (summary.mode === 'unlimited') list.s(text(S.modes.carsSent(r.carsSent), sub(island, v(0, 28)), 14, 'center', 'bold'), 'accent', details);
    else if (summary.mode === 'mayhem') list.s(text(S.mayhem.summary(r.wrecks, r.biggestChain), sub(island, v(0, 28)), 14, 'center', 'bold'), 'fireOuter', details);
    if (summary.mode !== 'mayhem') {
      list.s(text(S.result.stats(Fmt.number(r.bestCombo), Fmt.number(r.tightFits), r.takedowns, r.transporters, Fmt.seconds(r.time)), add(island, v(0, 28)), 13, 'center'), 'muted', details);
    }
  },
};
