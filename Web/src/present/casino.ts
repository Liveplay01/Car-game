import { type Career, Careers } from '../core/career';
import { baseConfig } from '../core/config';
import { type CasinoGame, type CasinoRound, type SlotSpin, type SlotSymbol, type UpgradeRoll, type CoinFlip, CASINO_GAMES, Casino } from '../core/casino';
import { type Cosmetic, cosmetic, rarityRank } from '../core/loot';
import type { VehicleType } from '../core/vehicle';
import { type Vec2, v, add, mul, fromAngle, TAU } from '../core/vec2';
import { type RenderList, type Rect, RenderList as List, R, rect, circle, arc, line, polygon, text, Ease, pinned, vlerp, moved, unitHash, type Align, type Weight } from './render';
import type { ColorToken } from './theme';
import { MenuKit } from './menukit';
import { textWidth } from './icons';
import { S, Fmt, money } from './strings';
import { CarArt } from './carArt';
import { SYNDICATE_BOSS } from './scene';
import { land } from './hud';
import { ShopPage } from './shop';

/**
 * The casino in the Shop (`core/casino.ts`): Crash, Slots and the Skin Upgrade, and after a
 * win the coin for double or nothing. Loud where it pays off, calm everywhere else: the odds
 * are one tap away, the history shows what really happened, and every reveal skips on a tap.
 * Every animation is a pure function of its age, like the chest opening.
 */
export type CasinoTarget =
  | { k: 'game'; game: CasinoGame }
  | { k: 'odds' }
  | { k: 'stake'; index: number }
  | { k: 'auto'; index: number }
  | { k: 'play' }
  | { k: 'cashOut' }
  | { k: 'double' }
  | { k: 'collect' }
  | { k: 'skip' }
  | { k: 'slot'; slot: number }
  | { k: 'pick'; id: string }
  | { k: 'page'; step: number }
  | { k: 'done' };

/** A cash-out: its multiplier and win; `clutch`, the seconds the crash came after it when that was close. */
export interface CashOut {
  m: number;
  win: number;
  age: number;
  clutch: number | null;
}

export type CasinoRun =
  | { k: 'crash'; stake: number; point: number; end: { at: number; cashOut: boolean }; age: number; out: CashOut | null; crash: number | null }
  | { k: 'slots'; spin: SlotSpin; from: [number, number, number]; anticipate: boolean; age: number }
  | { k: 'upgrade'; roll: UpgradeRoll; age: number }
  | { k: 'flip'; flip: CoinFlip; items: boolean; age: number };

/** What the session plays or settles as a run goes on. */
export type CasinoCue =
  | { k: 'tick'; step: number }
  | { k: 'reel'; reel: number }
  | { k: 'creep'; step: number }
  | { k: 'peg'; slow: boolean }
  | { k: 'ding'; step: number }
  | { k: 'result' }
  | { k: 'crashDue' }
  | { k: 'clutchBoom' };

const TIMES = {
  reelStops: [0.5, 0.72, 0.94],
  /**
   * With the first two reels alike, reel 3 slows down and clicks its last symbols past one by
   * one. The stops were drawn before the spin: the show is longer, the outcome the same.
   */
  anticipation: 1.45,
  creepSteps: 5,
  /** A reel runs this far past its stop and snaps back (in rows), over `bounce` seconds. */
  overshoot: 0.07,
  bounce: 0.16,
  /** The dial: a long, creeping run-out; longer only when the draw really lies at an edge. */
  needle: 3.1,
  needleEdge: 4.1,
  edge: 0.035,
  needleTurns: 3,
  pegs: 24,
  flip: 1.15,
  flipHalfTurns: 8,
  crashSpin: 0.9,
  /** The crash freezes this long before it blows (a hitstop). */
  hitstop: 0.06,
  /** A cash-out this close before the crash is a Clutch Cash-out. */
  clutch: 0.35,
  countUp: 1.3,
  ding: 0.075,
};

type SlotRun = Extract<CasinoRun, { k: 'slots' }>;
const slotEnd = (run: SlotRun): number => TIMES.reelStops[2] + (run.anticipate ? TIMES.anticipation : 0);
const reelStop = (run: SlotRun, i: number): number => TIMES.reelStops[i] + (i === 2 && run.anticipate ? TIMES.anticipation : 0);
/** 0 → 1 over the anticipation, each step slower than the last. */
const creepAt = (run: SlotRun): number => TIMES.creepSteps * (1 - (1 - Ease.clamp01((run.age - TIMES.reelStops[2]) / TIMES.anticipation)) ** 2);

/** Where reel `i` stands on its strip (in stops, before the bounce), `run.age` into the spin. */
function reelAt(run: SlotRun, i: number, n: number): number {
  const target = run.spin.stops[i];
  const stop = reelStop(run, i);
  if (run.age >= stop) return target;
  const travel = ((target - run.from[i] + n) % n) + (3 + i) * n;
  if (i < 2 || !run.anticipate) return run.from[i] + travel * Ease.outCubic(run.age / stop);
  const creep = TIMES.creepSteps;
  const t2 = TIMES.reelStops[2];
  if (run.age < t2) return run.from[i] + (travel - creep) * Ease.outCubic(run.age / t2);
  // Click… click… click: every step snaps on quickly, then the reel waits a little longer.
  const s = creepAt(run);
  const k = Math.floor(s);
  return run.from[i] + travel - creep + k + Ease.outCubic(Math.min(1, (s - k) * 3));
}

const crashStep = (m: number): number => Math.floor(Math.log(Math.max(1, m)) / Math.log(1.1));
/** How close the draw lies to an edge of the green (in turns): 0 on the line. */
const edgeDistance = (roll: UpgradeRoll): number => Math.min(Math.abs(roll.roll - roll.chance), roll.roll, 1 - roll.roll);
const needleTime = (roll: UpgradeRoll): number => (edgeDistance(roll) < TIMES.edge ? TIMES.needleEdge : TIMES.needle);
/** Where the needle points, in turns from the top, `age` into the spin: fast, then a long creep. */
const needleTurn = (roll: UpgradeRoll, age: number): number => (TIMES.needleTurns + roll.roll) * (1 - (1 - Ease.clamp01(age / needleTime(roll))) ** 4);

/** Heat of a drive: calm, speed, nitro, danger. */
const heatOf = (m: number): 0 | 1 | 2 | 3 => (m >= 10 ? 3 : m >= 5 ? 2 : m >= 2 ? 1 : 0);
const HEAT: ColorToken[] = ['accent', 'hazard', 'fireOuter', 'destructive'];
const unit = (index: number, salt: number): number => unitHash(index, salt + 211);

export class CasinoState {
  game: CasinoGame = 'crash';
  stake = 0;
  auto = 0;
  run: CasinoRun | null = null;
  /** Where the reels rest between spins. */
  reels: [number, number, number] = [0, 7, 15];
  staked: string[] = [];
  target: string | null = null;
  picker: 'stake' | 'target' | null = null;
  page = 0;
  gameSlide: { from: CasinoGame; age: number } | null = null;
  pressed: { t: CasinoTarget; age: number } | null = null;

  /** A drive, spin, dial or coin still under way: the controls wait for it. */
  get busy(): boolean {
    const r = this.run;
    if (!r) return false;
    switch (r.k) {
      case 'crash':
        return r.out === null && r.crash === null;
      case 'slots':
        return r.age < slotEnd(r);
      case 'upgrade':
        return r.age < needleTime(r.roll);
      case 'flip':
        return r.age < TIMES.flip;
    }
  }

  /**
   * How tense the moment is, 0…1: the riser and the heartbeat follow it. It climbs with a
   * drive, while reel 3 creeps, and while the needle crawls near the edge of the green.
   */
  get tension(): number {
    const r = this.run;
    if (!r || !this.busy) return 0;
    switch (r.k) {
      case 'crash':
        return Math.min(1, 0.08 + Math.log(Casino.multiplierAt(r.age, baseConfig)) / Math.log(15));
      case 'slots':
        return r.anticipate && r.age >= TIMES.reelStops[1] ? 0.35 + 0.6 * Ease.clamp01((r.age - TIMES.reelStops[1]) / (slotEnd(r) - TIMES.reelStops[1])) : 0;
      case 'upgrade': {
        const x = r.age / needleTime(r.roll);
        if (x < 0.4) return 0.15;
        const at = needleTurn(r.roll, r.age) % 1;
        const d = Math.min(Math.abs(at - r.roll.chance), at, 1 - at);
        return 0.2 + 0.75 * (1 - Ease.clamp01(d / 0.15)) * Ease.clamp01((x - 0.4) / 0.3);
      }
      case 'flip':
        return 0.35;
    }
  }

  /** Seconds since the last round ended (Infinity with none): a late key press never stakes again. */
  get sinceEnd(): number {
    const r = this.run;
    if (!r || this.busy) return r ? 0 : Infinity;
    switch (r.k) {
      case 'crash':
        return r.out ? r.out.age : (r.crash ?? Infinity);
      case 'slots':
        return r.age - slotEnd(r);
      case 'upgrade':
        return r.age - needleTime(r.roll);
      case 'flip':
        return r.age - TIMES.flip;
    }
  }

  get driving(): boolean {
    return this.run?.k === 'crash' && this.busy;
  }

  selectGame(game: CasinoGame): void {
    if (game === this.game) return;
    this.gameSlide = { from: this.game, age: 0 };
    this.game = game;
    this.run = null;
    this.picker = null;
  }

  /** Jumps a reveal to its end (a tap); a drive cannot be skipped. */
  skip(): void {
    const r = this.run;
    if (!r || !this.busy) return;
    // Just before the end: the next frame crosses it and plays the result.
    const end = r.k === 'slots' ? slotEnd(r) : r.k === 'upgrade' ? needleTime(r.roll) : r.k === 'flip' ? TIMES.flip : r.age;
    r.age = Math.max(r.age, end - 1e-4);
  }

  advance(delta: number): CasinoCue[] {
    const cues: CasinoCue[] = [];
    if (this.gameSlide) {
      this.gameSlide.age += delta;
      if (this.gameSlide.age >= ShopPage.slideDuration) this.gameSlide = null;
    }
    if (this.pressed) {
      this.pressed.age += delta;
      if (this.pressed.age >= ShopPage.pressDuration) this.pressed = null;
    }
    const r = this.run;
    if (!r) return cues;
    const before = r.age;
    const wasBusy = this.busy;
    r.age += delta;
    const after = r.age;
    const crossed = (t: number): boolean => before < t && after >= t;
    switch (r.k) {
      case 'crash': {
        if (r.out) {
          const o = r.out;
          if (o.clutch !== null && o.age < o.clutch && o.age + delta >= o.clutch) cues.push({ k: 'clutchBoom' });
          o.age += delta;
        }
        if (r.crash !== null) r.crash += delta;
        if (!wasBusy) break;
        const m0 = Casino.multiplierAt(before, baseConfig);
        const m1 = Casino.multiplierAt(after, baseConfig);
        if (crashStep(m1) > crashStep(m0)) cues.push({ k: 'tick', step: crashStep(m1) });
        if (after >= Casino.timeOf(r.end.at, baseConfig)) cues.push({ k: 'crashDue' });
        break;
      }
      case 'slots': {
        [0, 1, 2].forEach((i) => {
          if (crossed(reelStop(r, i))) cues.push({ k: 'reel', reel: i });
        });
        if (r.anticipate && wasBusy) {
          const c0 = Math.floor(creepAt({ ...r, age: before }));
          const c1 = Math.floor(creepAt(r));
          if (c1 > c0 && c1 < TIMES.creepSteps) cues.push({ k: 'creep', step: c1 });
        }
        const end = slotEnd(r);
        if (crossed(end)) cues.push({ k: 'result' });
        // A triple counts its win up, ding by ding.
        if (r.spin.rule === 'triple' && after > end && before - end < TIMES.countUp) {
          const d0 = Math.floor(Math.max(0, before - end) / TIMES.ding);
          const d1 = Math.floor(Math.min(TIMES.countUp, after - end) / TIMES.ding);
          if (d1 > d0) cues.push({ k: 'ding', step: d1 });
        }
        break;
      }
      case 'upgrade': {
        const end = needleTime(r.roll);
        const p0 = Math.floor(needleTurn(r.roll, Math.min(before, end)) * TIMES.pegs);
        const p1 = Math.floor(needleTurn(r.roll, Math.min(after, end)) * TIMES.pegs);
        if (p1 > p0 && wasBusy) cues.push({ k: 'peg', slow: after / end > 0.45 });
        if (crossed(end)) cues.push({ k: 'result' });
        break;
      }
      case 'flip': {
        const h0 = Math.floor(Ease.outCubic(before / TIMES.flip) * TIMES.flipHalfTurns);
        const h1 = Math.floor(Ease.outCubic(after / TIMES.flip) * TIMES.flipHalfTurns);
        if (h1 > h0 && wasBusy) cues.push({ k: 'tick', step: h1 });
        if (crossed(TIMES.flip)) cues.push({ k: 'result' });
        break;
      }
    }
    return cues;
  }

  /** The chosen skins as they are now: a skin gone from the collection leaves the table. */
  tidy(career: Career): void {
    const own = new Set(Casino.stakeable(career).map((x) => x.id));
    this.staked = this.staked.filter((id) => own.has(id));
    if (this.target && !Casino.targets(career, this.staked).some((x) => x.id === this.target)) this.target = null;
  }
}

interface Layout {
  chips: [CasinoGame, Rect][];
  today: Vec2;
  odds: Rect;
  history: Rect;
  stage: Rect;
  autos: Rect[];
  stakes: Rect[];
  main: Rect;
  /** Double or nothing, then Collect: they share the main button's row. */
  pair: [Rect, Rect];
}

function t(list: RenderList, s: string, at: Vec2, size: number, color: ColorToken, o: { weight?: Weight; align?: Align; opacity?: number } = {}): void {
  list.s(text(s, at, size, o.align ?? 'leading', o.weight ?? 'regular'), color, o.opacity ?? 1);
}

const SYMBOL: Record<SlotSymbol, { type: VehicleType; tint: ColorToken }> = {
  car: { type: 'car', tint: 'rarityCommon' },
  compact: { type: 'compact', tint: 'vehicleCompact' },
  van: { type: 'van', tint: 'vehicleVan' },
  sportsCar: { type: 'sportsCar', tint: 'vehicleSports' },
  ambulance: { type: 'ambulance', tint: 'lightRed' },
  transporter: { type: 'transporter', tint: 'vehicleCargo' },
  boss: { type: 'pickup', tint: 'coin' },
};

export const CasinoPage = {
  chipHeight: 34,
  gap: 8,
  mainHeight: 50,
  stakeHeight: 34,
  autoHeight: 28,
  pickerColumns: 5,

  layout(a: Rect, game: CasinoGame): Layout {
    const P = CasinoPage;
    const w = R.width(a);
    const cw = (w - 2 * 6) / 3;
    const chips = CASINO_GAMES.map((g, i): [CasinoGame, Rect] => [g, R.make(a.minX + i * (cw + 6), a.minY, a.minX + i * (cw + 6) + cw, a.minY + P.chipHeight)]);
    const infoY = a.minY + P.chipHeight + P.gap + 11;
    const odds = R.make(a.maxX - 76, infoY - 12, a.maxX, infoY + 12);
    const history = R.make(a.minX, infoY + 18, a.maxX, infoY + 42);
    const main = R.make(a.minX, a.maxY - P.mainHeight, a.maxX, a.maxY);
    const half = (w - P.gap) / 2;
    const pair: [Rect, Rect] = [R.make(a.minX, main.minY, a.minX + half, main.maxY), R.make(a.minX + half + P.gap, main.minY, a.maxX, main.maxY)];
    let bottom = main.minY - 10;
    const row = (count: number, height: number): Rect[] => {
      const g = 6;
      const cell = (w - g * (count - 1)) / count;
      const out = Array.from({ length: count }, (_, i) => R.make(a.minX + i * (cell + g), bottom - height, a.minX + i * (cell + g) + cell, bottom));
      bottom -= height + P.gap;
      return out;
    };
    const stakes = game === 'upgrade' ? [] : row(baseConfig.casinoStakes.length + 1, P.stakeHeight);
    const autos = game === 'crash' ? row(baseConfig.crashAutoTargets.length + 1, P.autoHeight).slice(1) : [];
    const stage = R.make(a.minX, history.maxY + 10, a.maxX, Math.max(history.maxY + 150, bottom - 2));
    return { chips, today: v(a.minX, infoY), odds, history, stage, autos, stakes, main, pair };
  },

  /** Where the Upgrade's five stake slots and its target slot sit under the dial. */
  slots(stage: Rect): Rect[] {
    const size = Math.min(52, (R.width(stage) - 40 - 6 * 5) / 6.4);
    const big = size * 1.25;
    const y = stage.maxY - big / 2 - 4;
    const total = 5 * size + 4 * 6 + 28 + big;
    let x = R.center(stage).x - total / 2;
    const out: Rect[] = [];
    for (let i = 0; i < 5; i++) {
      out.push(R.make(x, y - size / 2, x + size, y + size / 2));
      x += size + 6;
    }
    x += 22;
    out.push(R.make(x, y - big / 2, x + big, y + big / 2));
    return out;
  },

  /** The picker's grid: the skins to choose from on this page, and the page count. */
  pickerCells(stage: Rect, items: Cosmetic[], page: number): { cells: [Cosmetic, Rect][]; pages: number } {
    const top = stage.minY + 30;
    const bottom = stage.maxY - 34;
    const columns = CasinoPage.pickerColumns;
    const g = 8;
    const cell = (R.width(stage) - g * (columns - 1)) / columns;
    const rows = Math.max(1, Math.floor((bottom - top + g) / (cell + g)));
    const per = rows * columns;
    const pages = Math.max(1, Math.ceil(items.length / per));
    const p = Math.min(page, pages - 1);
    const cells = items.slice(p * per, p * per + per).map((item, i): [Cosmetic, Rect] => {
      const x = stage.minX + (i % columns) * (cell + g);
      const y = top + Math.floor(i / columns) * (cell + g);
      return [item, R.make(x, y, x + cell, y + cell)];
    });
    return { cells, pages };
  },

  pickerItems: (career: Career, state: CasinoState): Cosmetic[] =>
    state.picker === 'stake'
      ? Casino.stakeable(career).sort((a, b) => rarityRank(a.rarity) - rarityRank(b.rarity))
      : Casino.targets(career, state.staked).sort((a, b) => rarityRank(a.rarity) - rarityRank(b.rarity)),

  targets(a: Rect, career: Career, state: CasinoState): [CasinoTarget, Rect][] {
    const l = CasinoPage.layout(a, state.game);
    const out: [CasinoTarget, Rect][] = [];
    const busy = state.busy;
    if (!busy) out.push(...l.chips.map(([game, r]): [CasinoTarget, Rect] => [{ k: 'game', game }, r]));
    out.push([{ k: 'odds' }, l.odds]);
    if (busy) {
      if (state.driving) out.push([{ k: 'cashOut' }, l.main], [{ k: 'cashOut' }, l.stage]);
      else out.push([{ k: 'skip' }, R.make(a.minX, l.stage.minY, a.maxX, a.maxY)]);
      return out;
    }
    if (state.picker) {
      const { cells, pages } = CasinoPage.pickerCells(R.inset(l.stage, 10, 0), CasinoPage.pickerItems(career, state), state.page);
      out.push(...cells.map(([item, r]): [CasinoTarget, Rect] => [{ k: 'pick', id: item.id }, r]));
      if (pages > 1) {
        const y = l.stage.maxY - 14;
        out.push([{ k: 'page', step: -1 }, R.make(l.stage.minX, y - 16, l.stage.minX + 80, y + 16)], [{ k: 'page', step: 1 }, R.make(l.stage.maxX - 80, y - 16, l.stage.maxX, y + 16)]);
      }
      out.push([{ k: 'done' }, l.main]);
      return out;
    }
    out.push(...l.stakes.map((r, index): [CasinoTarget, Rect] => [{ k: 'stake', index }, r]));
    out.push(...l.autos.map((r, index): [CasinoTarget, Rect] => [{ k: 'auto', index }, r]));
    if (state.game === 'upgrade') out.push(...CasinoPage.slots(l.stage).map((r, slot): [CasinoTarget, Rect] => [{ k: 'slot', slot }, r]));
    if (career.casinoPending?.k === 'win') {
      if (Casino.canFlip(career, baseConfig)) out.push([{ k: 'double' }, l.pair[0]], [{ k: 'collect' }, l.pair[1]]);
      else out.push([{ k: 'collect' }, l.main]);
    } else out.push([{ k: 'play' }, l.main]);
    return out;
  },

  targetAt(point: Vec2, a: Rect, career: Career, state: CasinoState): CasinoTarget | null {
    return CasinoPage.targets(a, career, state).find(([, r]) => R.contains(r, point))?.[0] ?? null;
  },

  pressedRect(r: Rect, target: CasinoTarget, state: CasinoState): Rect {
    const p = state.pressed;
    if (!p || JSON.stringify(p.t) !== JSON.stringify(target)) return r;
    const scale = 1 - 0.04 * (1 - Ease.settle(p.age / ShopPage.pressDuration));
    return R.inset(r, (R.width(r) * (1 - scale)) / 2, (R.height(r) * (1 - scale)) / 2);
  },

  /** How long before its crash a cash-out at `m` came, when that makes it a Clutch Cash-out. */
  clutchOf(point: number, m: number): number | null {
    const d = Casino.timeOf(point, baseConfig) - Casino.timeOf(m, baseConfig);
    return d >= 0 && d <= TIMES.clutch && point < baseConfig.crashMax ? d : null;
  },

  /** The stake chosen, in money: the offer at `state.stake`, "All in" the whole balance. */
  stakeOf: (career: Career, state: CasinoState): number => Casino.stakes(career, baseConfig)[state.stake] ?? 0,

  // MARK: Drawing

  add(list: RenderList, a: Rect, career: Career, today: number, state: CasinoState, reduceMotion: boolean, age: number): void {
    const enter = reduceMotion ? 1 : Ease.outCubic(age / 0.25);
    const l = CasinoPage.layout(a, state.game);
    CasinoPage.addChips(list, l, state, reduceMotion, enter);
    CasinoPage.addInfo(list, l, career, today, state, enter);
    const start = list.items.length;
    CasinoPage.addGame(list, l, career, state, state.game, reduceMotion, enter);
    const slide = state.gameSlide;
    if (!slide || reduceMotion) return;
    const side = CASINO_GAMES.indexOf(state.game) > CASINO_GAMES.indexOf(slide.from) ? 1 : -1;
    const shift = v(side * R.width(a) * 0.3 * (1 - Ease.settle(slide.age / ShopPage.slideDuration)), 0);
    const fade = Ease.outCubic(slide.age / 0.18);
    for (let i = start; i < list.items.length; i++) list.items[i] = moved(list.items[i], shift, fade);
  },

  addGame(list: RenderList, l: Layout, career: Career, state: CasinoState, game: CasinoGame, reduceMotion: boolean, enter: number): void {
    const run = state.run;
    if (run?.k === 'flip') CasinoPage.addFlip(list, l.stage, run, career, reduceMotion, enter);
    else if (game === 'crash') CasinoPage.addCrash(list, l.stage, run?.k === 'crash' ? run : null, reduceMotion, enter);
    else if (game === 'slots') CasinoPage.addSlots(list, l.stage, state, run?.k === 'slots' ? run : null, reduceMotion, enter);
    else if (state.picker) CasinoPage.addPicker(list, l.stage, career, state, enter);
    else CasinoPage.addUpgrade(list, l.stage, state, run?.k === 'upgrade' ? run : null, reduceMotion, enter);
    CasinoPage.addControls(list, l, career, state, enter);
  },

  addChips(list: RenderList, l: Layout, state: CasinoState, reduceMotion: boolean, enter: number): void {
    const busy = state.busy;
    const slide = state.gameSlide;
    const glide = slide && !reduceMotion ? Ease.settle(slide.age / ShopPage.slideDuration) : 1;
    for (const [, r] of l.chips) list.s(rect(R.center(r), v(R.width(r), R.height(r)), 10), 'controlFill', enter);
    const to = l.chips.find(([g]) => g === state.game)?.[1];
    if (to) {
      const from = (slide && l.chips.find(([g]) => g === slide.from)?.[1]) || to;
      list.s(rect(vlerp(R.center(from), R.center(to), glide), v(R.width(to), R.height(to)), 10), 'primary', enter);
    }
    for (const [game, chip] of l.chips) {
      const r = CasinoPage.pressedRect(chip, { k: 'game', game }, state);
      const on = game === state.game ? glide : slide && game === slide.from ? 1 - glide : 0;
      const label = S.casino.game(game);
      const dim = busy && game !== state.game ? 0.4 : 1;
      t(list, label, R.center(r), 13, 'muted', { weight: 'bold', align: 'center', opacity: enter * (1 - on) * dim });
      if (on > 0) t(list, label, R.center(r), 13, 'background', { weight: 'bold', align: 'center', opacity: enter * on });
    }
  },

  /** Today's balance as it is, the odds a tap away, and what the last rounds really gave. */
  addInfo(list: RenderList, l: Layout, career: Career, today: number, state: CasinoState, enter: number): void {
    const net = Casino.today(career, today);
    t(list, S.casino.today(net), l.today, 13, net > 0 ? 'accent' : net < 0 ? 'destructive' : 'muted', { weight: 'bold', opacity: enter });
    const odds = CasinoPage.pressedRect(l.odds, { k: 'odds' }, state);
    list.s(rect(R.center(odds), v(R.width(odds), R.height(odds)), R.height(odds) / 2), 'controlFill', enter);
    t(list, S.casino.odds, R.center(odds), 12, 'primary', { weight: 'bold', align: 'center', opacity: enter });
    const rounds = career.casinoLog.filter((r) => r.game === state.game).slice(-8);
    if (rounds.length === 0) {
      t(list, S.casino.noHistory, v(l.history.minX, R.center(l.history).y), 12, 'muted', { opacity: 0.8 * enter });
      return;
    }
    let x = l.history.minX;
    const y = R.center(l.history).y;
    for (const round of [...rounds].reverse()) {
      const label = CasinoPage.roundLabel(round);
      const w = textWidth(label, 11) + 16;
      if (x + w > l.history.maxX) break;
      const won = round.win > 0;
      list.s(rect(v(x + w / 2, y), v(w, 22), 11), won ? 'accent' : 'controlFill', (won ? 0.18 : 1) * enter);
      t(list, label, v(x + w / 2, y), 11, won ? 'accent' : 'muted', { weight: 'bold', align: 'center', opacity: enter });
      x += w + 6;
    }
  },

  roundLabel(r: CasinoRound): string {
    switch (r.game) {
      case 'crash':
        return S.casino.times(r.x);
      case 'slots':
        return r.win > 0 ? `+${Fmt.number(r.win)}` : '–';
      case 'upgrade':
        return `${r.win > 0 ? '✓' : '✕'} ${Math.round(r.x * 100)} %`;
    }
  },

  // MARK: Controls

  addControls(list: RenderList, l: Layout, career: Career, state: CasinoState, enter: number): void {
    const busy = state.busy;
    const stakes = Casino.stakes(career, baseConfig);
    const pending = career.casinoPending?.k === 'win' ? career.casinoPending : null;
    l.stakes.forEach((cell, i) => {
      const r = CasinoPage.pressedRect(cell, { k: 'stake', index: i }, state);
      const chosen = i === state.stake;
      const affordable = stakes[i] > 0 && stakes[i] <= career.money + (pending?.money ?? 0);
      const o = enter * (busy ? 0.45 : 1);
      list.s(rect(R.center(r), v(R.width(r), R.height(r)), 9), chosen ? 'primary' : 'controlFill', o);
      const label = i === stakes.length - 1 ? S.casino.allIn : S.casino.stakeShort(stakes[i]);
      t(list, label, R.center(r), ShopPage.fitted(label, 12, R.width(r) - 6), chosen ? 'background' : affordable ? 'primary' : 'muted', { weight: 'bold', align: 'center', opacity: o * (affordable || chosen ? 1 : 0.6) });
    });
    if (l.autos.length > 0) {
      const label = v(l.stage.minX + 2, R.center(l.autos[0]).y);
      t(list, S.casino.auto, label, 12, 'muted', { weight: 'bold', opacity: enter * (busy ? 0.45 : 1) });
      l.autos.forEach((cell, i) => {
        const r = CasinoPage.pressedRect(cell, { k: 'auto', index: i }, state);
        const chosen = i === state.auto;
        const o = enter * (busy ? 0.45 : 1);
        list.s(rect(R.center(r), v(R.width(r), R.height(r)), 8), chosen ? 'cardRaised' : 'controlFill', o);
        const target = baseConfig.crashAutoTargets[i];
        t(list, target === 0 ? S.casino.autoOff : S.casino.times(target), R.center(r), 12, chosen ? 'accent' : 'muted', { weight: 'bold', align: 'center', opacity: o });
      });
    }
    const button = (r: Rect, target: CasinoTarget, label: string, prominent: boolean, enabled: boolean, tint: ColorToken = 'accent'): void => {
      const p = CasinoPage.pressedRect(r, target, state);
      const c = R.center(p);
      const size = v(R.width(p), R.height(p));
      if (prominent) {
        list.s(rect(c, size, 14), tint, enter * (enabled ? 1 : 0.35));
        t(list, label, c, ShopPage.fitted(label, 16, size.x - 20), 'accentInk', { weight: 'bold', align: 'center', opacity: enter * (enabled ? 1 : 0.6) });
      } else {
        list.s(rect(c, size, 14), tint, enter * (enabled ? 1 : 0.35));
        list.s(rect(c, v(size.x - 3, size.y - 3), 12.5), 'cardRaised', enter);
        t(list, label, c, ShopPage.fitted(label, 15, size.x - 20), enabled ? 'primary' : 'muted', { weight: 'bold', align: 'center', opacity: enter });
      }
    };
    if (state.picker) {
      button(l.main, { k: 'done' }, S.casino.done, true, true);
      return;
    }
    const run = state.run;
    if (busy) {
      if (run?.k === 'crash') {
        const m = Casino.multiplierAt(run.age, baseConfig);
        button(l.main, { k: 'cashOut' }, S.casino.cashOut(money(Fmt.number(Math.floor(run.stake * m)))), true, m > 1, 'hazard');
      } else t(list, S.casino.tapToSkip, R.center(l.main), 12, 'muted', { align: 'center', opacity: 0.8 * enter });
      return;
    }
    if (pending) {
      const items = pending.items.length > 0;
      const collect = items ? S.casino.keep : S.casino.collect(money(Fmt.number(pending.money)));
      if (Casino.canFlip(career, baseConfig)) {
        button(l.pair[0], { k: 'double' }, S.casino.double, false, true);
        button(l.pair[1], { k: 'collect' }, collect, true, true);
      } else button(l.main, { k: 'collect' }, collect, true, true);
      return;
    }
    const play = CasinoPage.playButton(career, state);
    button(l.main, { k: 'play' }, play.label, true, play.enabled);
  },

  playButton(career: Career, state: CasinoState): { label: string; enabled: boolean } {
    if (state.game === 'upgrade') {
      if (state.staked.length === 0) return { label: Casino.stakeable(career).length === 0 ? S.casino.noSkins : S.casino.pickStakes, enabled: Casino.stakeable(career).length > 0 };
      if (!state.target) return { label: S.casino.pickTarget, enabled: Casino.targets(career, state.staked).length > 0 };
      return { label: S.casino.upgrade(Casino.upgradeChance(state.staked, state.target, baseConfig)), enabled: Casino.canUpgrade(career, state.staked, state.target, baseConfig) };
    }
    const stake = CasinoPage.stakeOf(career, state);
    if (stake <= 0 || stake > career.money) return { label: S.casino.notEnough, enabled: false };
    const m = money(Fmt.number(stake));
    return { label: state.game === 'crash' ? S.casino.drive(m) : S.casino.spin(m), enabled: true };
  },

  // MARK: Crash

  /**
   * The drive: a curve that climbs as the car speeds up, the multiplier over it. It heats up
   * in stages: calm, then speed lines, then nitro with a glowing edge, then the danger zone
   * with warning lights. The crash is a bang: a freeze, a fireball, debris and a red flash.
   */
  addCrash(list: RenderList, stage: Rect, run: Extract<CasinoRun, { k: 'crash' }> | null, reduceMotion: boolean, enter: number): void {
    const cfg = baseConfig;
    const vp = list.camera.viewport;
    const crashed = run?.crash ?? null;
    const out = run?.out ?? null;
    // After a Clutch Cash-out the empty car drives on and crashes where it would have.
    const ghost = out && out.clutch !== null ? Math.min(out.age, out.clutch) : 0;
    const boom = crashed !== null ? crashed : out && out.clutch !== null && out.age >= out.clutch ? out.age - out.clutch : null;
    const blast = boom === null ? null : Math.max(0, boom - TIMES.hitstop);
    const now = run ? Math.min(run.age, Casino.timeOf(out?.m ?? run.end.at, cfg)) : 0;
    const m = run ? (out ? out.m : crashed !== null ? run.point : Casino.multiplierAt(now, cfg)) : 1;
    const driving = run !== null && out === null && crashed === null;
    const heat = driving ? heatOf(m) : 0;

    // The whole stage shakes: a little with nitro, more in the danger zone, hard in the crash.
    let shake = v(0, 0);
    if (!reduceMotion && run) {
      const age = run.age;
      if (driving && heat >= 2) shake = mul(v(Math.sin(age * 61), Math.cos(age * 53)), heat === 3 ? 3.5 : 1.5);
      if (blast !== null && blast < 0.4) shake = mul(v(Math.sin(blast * 70), Math.cos(blast * 55) * 0.5), 8 * (1 - blast / 0.4));
    }
    const s = R.offset(stage, shake);
    ShopPage.panel(list, s, 'card', enter);
    if (driving && heat >= 2 && !reduceMotion) CasinoPage.edgeGlow(list, HEAT[heat], (heat === 3 ? 0.9 : 0.55) * (0.75 + 0.25 * Math.sin(run!.age * (heat === 3 ? 14 : 7))));

    const plot = R.make(s.minX + 44, s.minY + 84, s.maxX - 22, s.maxY - 22);
    const reach = now + ghost;
    const xMax = Math.max(6, reach * 1.15);
    const top = out && out.clutch !== null ? run!.point : m;
    const yMax = Math.max(2, 1 + (top - 1) * 1.2);
    const at = (time: number): Vec2 => {
      const mm = Math.exp(cfg.crashRate * time);
      return v(plot.minX + (time / xMax) * R.width(plot), plot.maxY - ((mm - 1) / (yMax - 1)) * R.height(plot));
    };
    // The scale: faint lines at round multipliers, from the top down, never crowded.
    let lastY = -Infinity;
    for (const g of [100, 50, 20, 10, 5, 3, 2, 1.5, 1]) {
      if (g > yMax) continue;
      const y = plot.maxY - ((g - 1) / (yMax - 1)) * R.height(plot);
      if (y - lastY < 18 && g !== 1) continue;
      if (g === 1 && y - lastY < 18) continue;
      lastY = y;
      list.s(line(v(plot.minX, y), v(plot.maxX, y), 1), 'marking', 0.35 * enter);
      t(list, S.casino.times(g), v(plot.minX - 8, y), 10, 'muted', { align: 'trailing', opacity: 0.8 * enter });
    }
    const color: ColorToken = crashed !== null ? 'destructive' : out ? 'accent' : HEAT[heat];
    if (run && now > 0) {
      const steps = 48;
      const points: Vec2[] = [];
      for (let i = 0; i <= steps; i++) points.push(at((now * i) / steps));
      list.s(polygon([...points, v(points[points.length - 1].x, plot.maxY), v(plot.minX, plot.maxY)]), color, 0.1 * enter);
      for (let i = 1; i < points.length; i++) list.s(line(points[i - 1], points[i], 3), color, enter);
      // The drive the player got out of, on to where it crashed.
      if (ghost > 0) {
        for (let i = 1; i <= 8; i++) list.s(line(at(now + (ghost * (i - 1)) / 8), at(now + (ghost * i) / 8), 2), 'destructive', 0.55 * enter);
      }
    }

    // The car rides the head of the curve.
    const carTime = now + ghost;
    const head = at(carTime);
    const back = run && carTime > 0.05 ? at(Math.max(0, carTime - 0.15)) : v(head.x - 10, head.y);
    let heading = Math.atan2(-(head.y - back.y), head.x - back.x);
    const dir = v(Math.cos(heading), -Math.sin(heading));
    let opacity = enter;
    let carAt = head;
    const saved = list.clip;
    list.clip = s;
    if (driving && !reduceMotion) {
      // Speed lines stream past from 2×, more and longer with the heat.
      if (heat >= 1) {
        const count = 4 + 4 * heat;
        for (let i = 0; i < count; i++) {
          const run0 = (run!.age * (320 + 120 * heat) + unit(i, 31) * 240) % 240;
          const offset = (unit(i, 32) - 0.5) * 46;
          const from = add(head, add(mul(dir, -24 - run0), v(-dir.y * offset, dir.x * offset)));
          list.s(line(from, add(from, mul(dir, -(12 + 10 * heat))), 1.5), heat >= 3 ? 'destructive' : 'primary', 0.35 * (1 - run0 / 240) * enter);
        }
      }
      // Nitro from 5×: flames out of the exhaust, flickering.
      if (heat >= 2) {
        const flicker = 0.7 + 0.3 * Math.sin(run!.age * 47) * Math.cos(run!.age * 31);
        const base = add(head, mul(dir, -16));
        const side = v(-dir.y, dir.x);
        const long = (14 + 8 * (heat - 1)) * flicker;
        list.s(polygon([add(base, mul(side, 5)), add(base, mul(dir, -long)), add(base, mul(side, -5))]), 'fireOuter', 0.9 * enter);
        list.s(polygon([add(base, mul(side, 2.5)), add(base, mul(dir, -long * 0.6)), add(base, mul(side, -2.5))]), 'fireCore', enter);
      }
    }
    if (blast !== null) {
      const x = Ease.clamp01(blast / TIMES.crashSpin);
      if (!reduceMotion) {
        heading += 7 * Ease.outCubic(x);
        carAt = add(head, v(18 * Ease.outCubic(x), 10 * Ease.outCubic(x)));
      }
      CasinoPage.explosion(list, head, blast, reduceMotion, enter);
    } else if (out && out.clutch === null && !reduceMotion) {
      carAt = add(head, v(Math.min(60, out.age * 140), 0));
      heading = 0;
      opacity *= 1 - Ease.clamp01((out.age - 0.2) / 0.4);
    }
    MenuKit.glow(list, carAt, 26, blast !== null ? 'destructive' : color, (run ? 0.35 : 0.15) * opacity);
    CasinoPage.vehicle(list, 'sportsCar', null, carAt, 30, heading, opacity * (blast !== null ? 0.85 : 1));
    list.clip = saved;

    // Warning lights in the danger zone.
    if (driving && heat === 3 && !reduceMotion) {
      const blink = Math.sin(run!.age * 18) > 0 ? 1 : 0.15;
      for (const x of [s.minX + 18, s.maxX - 18]) {
        MenuKit.glow(list, v(x, s.minY + 18), 22, 'destructive', 0.5 * blink * enter);
        list.s(circle(v(x, s.minY + 18), 5), 'destructive', blink * enter);
      }
    }

    // The multiplier: it pulses with every tenth from 2×, lands at 2×, 5×, 10×…, and jumps big in the danger zone.
    const big = v(R.center(s).x, s.minY + 40);
    let pop = 1;
    if (run && !reduceMotion) {
      const passed = [2, 5, 10, 25, 50].filter((g) => g <= m);
      const last = passed[passed.length - 1];
      if (last && driving) pop = land((run.age - Casino.timeOf(last, cfg)) / 0.35, heat === 3 ? 0.4 : 0.22);
      if (driving && heat >= 1) pop *= 1 + (0.03 + 0.02 * heat) * (1 - ((m * 10) % 1)) ** 3;
      if (out) pop = land(out.age / 0.4, 0.25);
      if (crashed !== null) pop = land((blast ?? 0) / 0.4, 0.35);
    }
    const size = driving && heat === 3 ? 54 : 40;
    t(list, S.casino.times(m), big, size * pop, run ? color : 'muted', { weight: 'bold', align: 'center', opacity: enter });
    const line2 = v(big.x, s.minY + 72);
    if (!run) t(list, S.casino.crashHint, line2, 12, 'muted', { align: 'center', opacity: enter });
    else if (out) t(list, S.casino.cashedOut(money(Fmt.number(out.win))), line2, 13, 'accent', { weight: 'bold', align: 'center', opacity: enter * Ease.outCubic(out.age / 0.2) });
    else if (crashed !== null) t(list, S.casino.crashed, line2, 13, 'destructive', { weight: 'bold', align: 'center', opacity: enter });
    else t(list, heat === 3 ? S.casino.dangerZone : S.casino.riding(money(Fmt.number(Math.floor(run.stake * m)))), line2, 12, heat === 3 ? 'destructive' : 'muted', { weight: heat === 3 ? 'bold' : 'regular', align: 'center', opacity: enter });

    // Got out just in time: a stamp slams onto the stage.
    if (out && out.clutch !== null) CasinoPage.clutchStamp(list, v(R.center(s).x, s.maxY - 64), out.age, out.clutch, reduceMotion, enter);
    if (out && out.age < 1.6 && out.m >= 5 && !reduceMotion) ShopPage.addConfetti(list, big, out.age, out.m >= 10 ? 1.1 : 0.7, 'accent', out.m >= 25);
    // The crash flashes the whole display red (after the freeze), briefly.
    if (crashed !== null && !reduceMotion) {
      const f = blast ?? 0;
      if (f < 0.28) list.s(rect(mul(vp, 0.5), vp), 'destructive', (boom! < TIMES.hitstop ? 0.55 : 0.4) * (1 - f / 0.28));
    }
  },

  /** A small explosion: a fireball in three layers, a shockwave, smoke and flying debris. */
  explosion(list: RenderList, at: Vec2, age: number, reduceMotion: boolean, opacity: number): void {
    if (reduceMotion) {
      if (age < 0.5) list.s(circle(at, 22), 'fireOuter', 0.6 * (1 - age / 0.5) * opacity);
      return;
    }
    const x = Ease.clamp01(age / 0.55);
    if (x < 1) {
      const grow = Ease.outCubic(x);
      list.s(circle(at, 12 + 46 * grow), 'fireDeep', 0.85 * (1 - x) * opacity);
      list.s(circle(at, 9 + 34 * grow), 'fireOuter', 0.95 * (1 - x) * opacity);
      list.s(circle(at, 6 + 18 * grow), 'fireCore', (1 - x) * opacity);
      list.s(arc(at, 16 + 58 * grow, 4 * (1 - x) + 1, 0, TAU), 'primary', 0.6 * (1 - x) * opacity);
    }
    for (let i = 0; i < 8; i++) {
      const puff = Ease.clamp01((age - 0.15 - i * 0.05) / 1.1);
      if (puff <= 0 || puff >= 1) continue;
      list.s(circle(add(at, v((unit(i, 41) - 0.5) * 40 * puff, -34 * puff)), 8 + 16 * puff), 'smoke', 0.4 * (1 - puff) * opacity);
    }
    for (let i = 0; i < 16; i++) {
      const life = 1.1;
      if (age >= life) break;
      const a = -Math.PI / 2 + (unit(i, 42) - 0.5) * 3.6;
      const speed = 120 + 180 * unit(i, 43);
      const p = v(at.x + Math.cos(a) * speed * age, at.y + Math.sin(a) * speed * age + 420 * age * age);
      const piece: ColorToken = i % 3 === 0 ? 'vehicleSports' : i % 3 === 1 ? 'wreck' : 'spark';
      list.s(rect(p, v(4 + 5 * unit(i, 44), 2 + 3 * unit(i, 45)), 0.5, (unit(i, 46) - 0.5) * 20 * age), piece, (1 - age / life) * opacity);
    }
  },

  /** "Clutch cash-out": a rotated stamp that slams down, then how close it was. */
  clutchStamp(list: RenderList, center: Vec2, age: number, margin: number, reduceMotion: boolean, opacity: number): void {
    const slam = reduceMotion ? 1 : Ease.clamp01(age / 0.18);
    const scale = reduceMotion ? 1 : 1 + 0.6 * (1 - slam) + (slam >= 1 ? 0.08 * (1 - Ease.spring((age - 0.18) / 0.35)) : 0);
    const fade = reduceMotion ? 1 : Ease.clamp01(age / 0.1);
    const size = v(236 * scale, 46 * scale);
    list.s(rect(center, add(size, v(6, 6)), 10, -0.08), 'hazard', 0.95 * fade * opacity);
    list.s(rect(center, size, 8, -0.08), 'card', fade * opacity);
    t(list, S.casino.clutch, add(center, v(0, -6 * scale)), 18 * scale, 'hazard', { weight: 'bold', align: 'center', opacity: fade * opacity });
    t(list, S.casino.clutchSaved(margin.toFixed(2)), add(center, v(0, 13 * scale)), 11 * scale, 'primary', { weight: 'bold', align: 'center', opacity: fade * opacity });
  },

  /** The display's edge glows in `color`, for the hottest moments of a drive. */
  edgeGlow(list: RenderList, color: ColorToken, intensity: number): void {
    const vp = list.camera.viewport;
    for (let k = 0; k < 8; k++) {
      const inset = k * 3 + 1;
      const o = 0.22 * intensity * (1 - k / 8);
      list.s(line(v(0, inset), v(vp.x, inset), 3), color, o);
      list.s(line(v(0, vp.y - inset), v(vp.x, vp.y - inset), 3), color, o);
      list.s(line(v(inset, 0), v(inset, vp.y), 3), color, o);
      list.s(line(v(vp.x - inset, 0), v(vp.x - inset, vp.y), 3), color, o);
    }
  },

  // MARK: Slots

  addSlots(list: RenderList, stage: Rect, state: CasinoState, run: Extract<CasinoRun, { k: 'slots' }> | null, reduceMotion: boolean, enter: number): void {
    const cfg = baseConfig;
    const n = cfg.slotStrip.length;
    ShopPage.panel(list, stage, 'card', enter);
    const done = !run || run.age >= slotEnd(run);
    const win = run && done && run.spin.win > 0 ? run.spin : null;
    const g = 10;
    const pad = 16;
    const reelW = (R.width(stage) - 2 * pad - 2 * g) / 3;
    // Rows as tall as a reel is wide at most; the reels and the win line under them sit centred.
    const reelH = Math.min(R.height(stage) - 86, reelW * 3 * 0.92);
    const top = stage.minY + Math.max(16, (R.height(stage) - reelH - 70) / 2);
    const rh = reelH / 3;
    const midY = top + reelH / 2;
    const glowOn = win && !reduceMotion ? 0.5 + 0.5 * Math.sin(run!.age * 7) : 1;
    // Reels 1 and 2 alike: the rest of the screen dims and they glow gold while reel 3 creeps in.
    const holding = run !== null && run.anticipate && run.age >= TIMES.reelStops[1];
    const focus = holding && !reduceMotion ? Ease.clamp01((run!.age - TIMES.reelStops[1]) / 0.25) * (1 - Ease.clamp01((run!.age - slotEnd(run!)) / 0.35)) : 0;
    if (focus > 0) {
      const vp = list.camera.viewport;
      const dim = 0.55 * focus;
      list.s(rect(v(vp.x / 2, stage.minY / 2), v(vp.x, stage.minY)), 'background', dim);
      list.s(rect(v(vp.x / 2, (stage.maxY + vp.y) / 2), v(vp.x, vp.y - stage.maxY)), 'background', dim);
      list.s(rect(v(stage.minX / 2, R.center(stage).y), v(stage.minX, R.height(stage))), 'background', dim);
      list.s(rect(v((stage.maxX + vp.x) / 2, R.center(stage).y), v(vp.x - stage.maxX, R.height(stage))), 'background', dim);
    }
    for (let i = 0; i < 3; i++) {
      const x = stage.minX + pad + i * (reelW + g);
      const reel = R.make(x, top, x + reelW, top + reelH);
      if (focus > 0 && i < 2) MenuKit.glow(list, R.center(reel), reelW * 0.9, 'coin', 0.35 * focus * (0.8 + 0.2 * Math.sin(run!.age * 9)));
      list.s(rect(R.center(reel), v(reelW, reelH), 12), 'background', 0.55 * enter);
      // Where the strip stands: the stop at the line, spun there from the last rest.
      let p: number = state.reels[i];
      if (run) {
        const stop = reelStop(run, i);
        p = reduceMotion ? run.spin.stops[i] : reelAt(run, i, n);
        // Klack: the reel runs a little past its stop and snaps back.
        if (!reduceMotion && run.age >= stop && run.age < stop + TIMES.bounce) p = run.spin.stops[i] + TIMES.overshoot * Math.sin(((run.age - stop) / TIMES.bounce) * Math.PI);
      }
      const winning = win ? CasinoPage.winningReels(win).includes(i) : false;
      const saved = list.clip;
      list.clip = reel;
      const base = Math.floor(p);
      for (let k = -2; k <= 2; k++) {
        const j = base + k;
        const y = midY + (p - j) * rh;
        const sym = cfg.slotStrip[((j % n) + n) % n];
        const onLine = Math.abs(y - midY) < rh / 2;
        const lit = (onLine && winning) || (onLine && focus > 0 && i < 2);
        const dim = done && !onLine ? 0.4 : 1;
        CasinoPage.symbol(list, sym, v(R.center(reel).x, y), Math.min(reelW, rh) * 0.86, enter * dim, lit ? (winning ? glowOn : focus) : 0, winning ? null : 'coin');
      }
      list.clip = saved;
    }
    // The line: lit when it pays.
    const lineY = midY;
    list.s(line(v(stage.minX + pad - 6, lineY - rh / 2), v(stage.maxX - pad + 6, lineY - rh / 2), 1.5), win ? 'accent' : 'marking', (win ? 0.9 : 0.5) * enter);
    list.s(line(v(stage.minX + pad - 6, lineY + rh / 2), v(stage.maxX - pad + 6, lineY + rh / 2), 1.5), win ? 'accent' : 'marking', (win ? 0.9 : 0.5) * enter);
    const under = v(R.center(stage).x, top + reelH + 30);
    if (win && run) {
      const since = run.age - slotEnd(run);
      const triple = win.rule === 'triple';
      const center = v(R.center(stage).x, midY);
      if (!reduceMotion && win.pay >= 40 && since < 2) ShopPage.addRays(list, center, since, win.pay >= 150 ? 1.3 : 0.9, 'coin', true, win.pay >= 150);
      // Three alike: a fountain of coins out of the reels, and the win counts up ding by ding.
      if (triple && !reduceMotion) CasinoPage.coinFountain(list, center, since, win.pay >= 40 ? 1.6 : 1);
      const counted = triple && !reduceMotion ? Math.floor(win.win * Ease.outCubic(since / TIMES.countUp)) : win.win;
      const pop = reduceMotion ? 1 : triple && since < TIMES.countUp ? 1 + 0.06 * (1 - ((since / TIMES.ding) % 1)) : land((since - (triple ? TIMES.countUp : 0)) / 0.4, 0.3);
      t(list, `+${money(Fmt.number(counted))}`, under, (triple ? 30 : 24) * pop, triple ? 'coin' : 'accent', { weight: 'bold', align: 'center', opacity: enter });
      t(list, S.casino.slotRule(win.rule, win.pay, win.line), v(under.x, under.y + (triple ? 26 : 22)), 12, 'muted', { align: 'center', opacity: enter });
      if (!reduceMotion && win.pay >= 40 && since < 2) ShopPage.addConfetti(list, center, since, win.pay >= 150 ? 1.5 : 1, 'coin', win.pay >= 150);
    } else if (run && done) t(list, S.casino.noWin, under, 13, 'muted', { align: 'center', opacity: enter });
    else if (!run) t(list, S.casino.slotsHint, under, 12, 'muted', { align: 'center', opacity: enter });
  },

  winningReels(spin: SlotSpin): number[] {
    if (spin.rule === 'triple') return [0, 1, 2];
    if (spin.rule === 'pair') return [0, 1];
    if (spin.rule === 'bossPair') return [0, 1, 2].filter((i) => spin.line[i] === 'boss');
    return [];
  },

  /** Coins spray out of the reels for a while, spinning and falling back. */
  coinFountain(list: RenderList, center: Vec2, since: number, power: number): void {
    const count = Math.floor(36 * power);
    for (let i = 0; i < count; i++) {
      const tt = since - unit(i, 51) * 1.1;
      if (tt <= 0 || tt >= 1.5) continue;
      const vx = (unit(i, 52) - 0.5) * 300;
      const vy = -(300 + 260 * unit(i, 53));
      const p = v(center.x + vx * tt, center.y + vy * tt + 720 * tt * tt);
      const spin = Math.abs(Math.cos(tt * (8 + 6 * unit(i, 54)) + i));
      const fade = 1 - Ease.clamp01((tt - 1.1) / 0.4);
      const r = 6 + 2 * unit(i, 55);
      list.s(rect(p, v(2 * r * Math.max(0.15, spin), 2 * r), r * Math.max(0.15, spin)), 'coin', fade);
      if (spin > 0.5) list.s(rect(p, v(r * spin, r), r * 0.5 * spin), 'rarityLegendary', 0.8 * fade);
    }
  },

  /** A slot symbol: a tile in the vehicle's tint with the vehicle on it. The boss wears its gold. */
  symbol(list: RenderList, sym: SlotSymbol, center: Vec2, size: number, opacity: number, lit: number, glow: ColorToken | null = null): void {
    const s = SYMBOL[sym];
    if (lit > 0) list.s(rect(center, v(size + 6, size + 6), 14), glow ?? s.tint, (glow ? 0.85 : 0.55) * lit * opacity);
    list.s(rect(center, v(size, size), 12), 'cardRaised', opacity);
    list.s(rect(center, v(size, size), 12), s.tint, 0.16 * opacity);
    if (sym === 'boss') list.s(arc(center, size * 0.4, 2, 0, TAU), 'coin', 0.8 * opacity);
    CasinoPage.vehicle(list, s.type, sym === 'boss' ? SYNDICATE_BOSS : null, center, size * 0.72, Math.PI / 2 - 0.5, opacity);
  },

  /** A vehicle drawn with the game's own art, `length` points long, turned to `heading` (world, y up). */
  vehicle(list: RenderList, type: VehicleType, look: typeof SYNDICATE_BOSS | null, center: Vec2, length: number, heading: number, opacity: number): void {
    const c = baseConfig;
    const long = type === 'ambulance' ? c.ambulanceLength : type === 'transporter' ? c.carLength * 1.3 : c.carLength;
    const preview = new List({ viewport: list.camera.viewport, center: v(0, 0), focus: center, scale: length / long }, list.background);
    CarArt.add(preview, { id: 5, type, pose: { position: v(0, 0), heading }, dents: [], skin: look?.paint ?? null, stripe: look?.stripe ?? null, roof: look?.roof ?? null, finish: null, finishTime: null }, c);
    for (const it of preview.items) list.items.push({ ...pinned(it, preview.camera, opacity), clip: list.clip });
  },

  // MARK: Skin Upgrade

  addUpgrade(list: RenderList, stage: Rect, state: CasinoState, run: Extract<CasinoRun, { k: 'upgrade' }> | null, reduceMotion: boolean, enter: number): void {
    ShopPage.panel(list, stage, 'card', enter);
    const slots = CasinoPage.slots(stage);
    const dialBottom = slots[0].minY - 26;
    const radius = Math.max(30, Math.min(R.width(stage) * 0.3, (dialBottom - stage.minY - 28) / 2));
    const center = v(R.center(stage).x, stage.minY + 18 + radius);
    const staked = run ? run.roll.staked : state.staked;
    const target = run ? run.roll.target : state.target;
    const chance = run ? run.roll.chance : target ? Casino.upgradeChance(staked, target, baseConfig) : 0;
    const end = run ? needleTime(run.roll) : 0;
    const done = run !== null && run.age >= end;
    const since = run ? run.age - end : 0;
    const top = -Math.PI / 2;
    list.s(arc(center, radius, 14, 0, TAU), 'controlFill', enter);
    if (chance > 0) list.s(arc(center, radius, 14, top, top + chance * TAU), 'accent', (done && !run!.roll.won ? 0.4 : 0.9) * enter);
    // The pegs the needle clicks over, and the two edges of the green drawn sharp.
    for (let i = 0; i < TIMES.pegs; i++) list.s(circle(add(center, mul(fromAngle(top + (i / TIMES.pegs) * TAU), radius + 13)), 2), 'marking', enter);
    if (chance > 0 && chance < 1) {
      for (const edge of [0, chance]) list.s(line(add(center, mul(fromAngle(top + edge * TAU), radius - 9)), add(center, mul(fromAngle(top + edge * TAU), radius + 9)), 2.5), 'primary', 0.85 * enter);
    }
    // The needle: it turns a few times and creeps to where the draw says; a win lies on the green.
    let turn = run ? (reduceMotion ? TIMES.needleTurns + run.roll.roll : needleTurn(run.roll, run.age)) : 0;
    // Each peg holds the needle back for a moment: rat-tat-tat… tack… tack.
    if (run && !done && !reduceMotion) turn -= 0.004 * (1 - ((turn * TIMES.pegs) % 1)) ** 6;
    const a = top + turn * TAU;
    const tip = add(center, mul(fromAngle(a), radius + 12));
    const baseL = add(center, mul(fromAngle(a - 0.12), radius - 16));
    const baseR = add(center, mul(fromAngle(a + 0.12), radius - 16));
    list.s(polygon([tip, baseL, baseR]), done ? (run!.roll.won ? 'accent' : 'destructive') : 'primary', enter);
    // The middle: the chance, then what came of it.
    const targetItem = target ? cosmetic(target) : null;
    if (done && run!.roll.won && targetItem) {
      const pop = reduceMotion ? 1 : Ease.spring(since / 0.45);
      MenuKit.glow(list, center, radius * 0.9, ShopPage.rarityColor(targetItem.rarity), 0.45 * enter);
      ShopPage.addPreview(list, targetItem, v(center.x, center.y - 10), (radius / 75) * (0.6 + 0.4 * pop), enter);
      t(list, S.casino.upgraded, v(center.x, center.y + radius * 0.55), 13, 'accent', { weight: 'bold', align: 'center', opacity: enter });
      if (!reduceMotion && since < 2) ShopPage.addConfetti(list, center, since, rarityRank(targetItem.rarity) >= 2 ? 1.2 : 0.8, ShopPage.rarityColor(targetItem.rarity), targetItem.rarity === 'legendary');
    } else if (done) {
      t(list, S.casino.lostSkins(run!.roll.staked.length), center, 15, 'destructive', { weight: 'bold', align: 'center', opacity: enter });
    } else {
      t(list, chance > 0 ? `${(chance * 100).toFixed(1)} %` : '–', v(center.x, center.y - 6), Math.min(34, radius * 0.5), chance > 0 ? 'primary' : 'muted', { weight: 'bold', align: 'center', opacity: enter });
      t(list, S.casino.chance, v(center.x, center.y + radius * 0.3), 12, 'muted', { align: 'center', opacity: enter });
    }
    // The table: five skins staked, the arrow, the one to win.
    slots.forEach((cell, i) => {
      const r = CasinoPage.pressedRect(cell, { k: 'slot', slot: i }, state);
      const id = i < 5 ? staked[i] : target;
      const item = id ? cosmetic(id) : null;
      // The stake is traded for the target or lost: either way it leaves the table.
      const gone = done && run !== null && i < 5 && item !== null;
      const fade = gone && !reduceMotion ? 1 - Ease.clamp01(since / 0.5) * 0.7 : gone ? 0.3 : 1;
      const edge: ColorToken = item ? ShopPage.rarityColor(item.rarity) : 'controlFill';
      list.s(rect(R.center(r), v(R.width(r) + 3, R.height(r) + 3), 11.5), edge, (item ? 0.6 : 1) * enter * fade);
      list.s(rect(R.center(r), v(R.width(r), R.height(r)), 10), 'cardRaised', enter * fade);
      if (item) ShopPage.addPreview(list, item, R.center(r), R.width(r) / 70, enter * fade);
      else t(list, i < 5 ? '+' : '?', R.center(r), 18, 'muted', { weight: 'bold', align: 'center', opacity: enter });
    });
    const arrowAt = v(slots[4].maxX + 14, R.center(slots[5]).y);
    list.s(polygon([add(arrowAt, v(-5, -6)), add(arrowAt, v(5, 0)), add(arrowAt, v(-5, 6))]), 'muted', enter);
    t(list, S.casino.stakeValue(money(Fmt.number(staked.reduce((s, id) => s + Casino.value(cosmetic(id)?.rarity ?? 'common', baseConfig), 0)))), v(slots[0].minX, slots[0].minY - 12), 11, 'muted', { opacity: enter });
    if (target && targetItem) t(list, S.shop.item(target), v(slots[5].maxX, slots[5].minY - 12), 11, ShopPage.rarityColor(targetItem.rarity), { weight: 'bold', align: 'trailing', opacity: enter });
  },

  addPicker(list: RenderList, stage: Rect, career: Career, state: CasinoState, enter: number): void {
    ShopPage.panel(list, stage, 'card', enter);
    const items = CasinoPage.pickerItems(career, state);
    const title = state.picker === 'stake' ? S.casino.pickStakesTitle(state.staked.length, baseConfig.upgradeMaxStake) : S.casino.pickTargetTitle;
    t(list, title, v(stage.minX + 14, stage.minY + 16), 13, 'primary', { weight: 'bold', opacity: enter });
    if (items.length === 0) {
      t(list, state.picker === 'stake' ? S.casino.noSkins : S.casino.noTargets, R.center(stage), 13, 'muted', { align: 'center', opacity: enter });
      return;
    }
    const inner = R.inset(stage, 10, 0);
    const { cells, pages } = CasinoPage.pickerCells(inner, items, state.page);
    for (const [item, cell] of cells) {
      const r = CasinoPage.pressedRect(cell, { k: 'pick', id: item.id }, state);
      const chosen = state.picker === 'stake' ? state.staked.includes(item.id) : state.target === item.id;
      list.s(rect(R.center(r), v(R.width(r) + 3, R.height(r) + 3), 11.5), chosen ? 'accent' : ShopPage.rarityColor(item.rarity), (chosen ? 1 : 0.45) * enter);
      list.s(rect(R.center(r), v(R.width(r), R.height(r)), 10), 'cardRaised', enter);
      ShopPage.addPreview(list, item, v(R.center(r).x, R.center(r).y - 4), R.width(r) / 80, enter);
      if (Careers.isWorn(career, item.id)) t(list, S.shop.worn, v(r.maxX - 6, r.minY + 9), 9, 'accent', { weight: 'bold', align: 'trailing', opacity: enter });
      t(list, S.shop.item(item.id), v(R.center(r).x, r.maxY - 8), ShopPage.fitted(S.shop.item(item.id), 9, R.width(r) - 6), 'muted', { align: 'center', opacity: enter });
      if (chosen) {
        const at = v(r.minX + 9, r.minY + 9);
        list.s(circle(at, 7), 'accent', enter);
        t(list, '✓', at, 9, 'accentInk', { weight: 'bold', align: 'center', opacity: enter });
      }
    }
    if (pages > 1) {
      const y = stage.maxY - 14;
      const page = Math.min(state.page, pages - 1);
      t(list, `${page + 1} / ${pages}`, v(R.center(stage).x, y), 12, 'muted', { align: 'center', opacity: enter });
      t(list, '‹', v(stage.minX + 24, y), 20, page > 0 ? 'primary' : 'muted', { weight: 'bold', align: 'center', opacity: enter * (page > 0 ? 1 : 0.4) });
      t(list, '›', v(stage.maxX - 24, y), 20, page < pages - 1 ? 'primary' : 'muted', { weight: 'bold', align: 'center', opacity: enter * (page < pages - 1 ? 1 : 0.4) });
    }
  },

  // MARK: Double or nothing

  /** A coin with a car on one face and a crash on the other; it jumps, turns and lands. */
  addFlip(list: RenderList, stage: Rect, run: Extract<CasinoRun, { k: 'flip' }>, career: Career, reduceMotion: boolean, enter: number): void {
    ShopPage.panel(list, stage, 'card', enter);
    const done = run.age >= TIMES.flip;
    const x = reduceMotion ? 1 : Ease.clamp01(run.age / TIMES.flip);
    const radius = Math.min(64, R.height(stage) * 0.24);
    const rest = v(R.center(stage).x, R.center(stage).y - 10);
    const jump = reduceMotion ? 0 : Math.sin(Math.PI * x) * Math.min(90, R.height(stage) * 0.3);
    const center = add(rest, v(0, -jump));
    // Half-turns: an even count shows the car (a win), an odd one the crash; it ends on the draw.
    const total = TIMES.flipHalfTurns + (run.flip.won ? 0 : 1);
    const turn = reduceMotion ? total : Ease.outCubic(x) * total;
    const face = Math.floor(turn) % 2 === 0 ? 'win' : 'lose';
    const squeeze = reduceMotion ? 1 : Math.max(0.06, Math.abs(Math.cos(turn * Math.PI)));
    const tint: ColorToken = face === 'win' ? 'accent' : 'destructive';
    list.s(rect(v(rest.x, rest.y + radius + 14), v(radius * 1.6 * (1 - 0.4 * (jump / 90)), 8), 4), 'shadow', 0.6 * enter);
    list.s(rect(center, v(2 * radius * squeeze + 4, 2 * radius + 4), Math.min(radius * squeeze + 2, radius + 2)), 'coin', enter);
    list.s(rect(center, v(2 * radius * squeeze, 2 * radius), Math.min(radius * squeeze, radius)), tint, enter);
    if (squeeze > 0.55) {
      const o = enter * Ease.clamp01((squeeze - 0.55) / 0.3);
      if (face === 'win') CasinoPage.vehicle(list, 'car', null, center, radius * 1.1 * squeeze, 0, o);
      else for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        list.s(line(add(center, v(Math.cos(a) * radius * 0.2 * squeeze, Math.sin(a) * radius * 0.2)), add(center, v(Math.cos(a) * radius * 0.6 * squeeze, Math.sin(a) * radius * 0.6)), 4), 'accentInk', o);
      }
    }
    const below = v(rest.x, stage.maxY - 40);
    if (!done) {
      t(list, S.casino.flipping, below, 13, 'muted', { align: 'center', opacity: enter });
      return;
    }
    const since = run.age - TIMES.flip;
    const pop = reduceMotion ? 1 : land(since / 0.4, 0.3);
    if (run.flip.won) {
      const text = run.items ? S.casino.doubledSkin(S.shop.item(run.flip.item ?? '')) : S.casino.doubled(money(Fmt.number(run.flip.money)));
      t(list, text, below, 18 * pop, 'accent', { weight: 'bold', align: 'center', opacity: enter });
      if (!reduceMotion && since < 1.8) ShopPage.addConfetti(list, rest, since, 0.8, 'accent', false);
    } else t(list, run.items ? S.casino.flipLostSkin : S.casino.flipLost, below, 16, 'destructive', { weight: 'bold', align: 'center', opacity: enter });
    const p = career.casinoPending;
    if (p?.k === 'win') t(list, S.casino.flipsLeft(baseConfig.doubleMaxChain - p.flips), v(below.x, below.y + 22), 11, 'muted', { align: 'center', opacity: enter });
  },

  /** The picture of a game for the sheet. */
  art(list: RenderList, game: CasinoGame, center: Vec2, size: number): void {
    switch (game) {
      case 'crash':
        MenuKit.glow(list, center, size * 0.5, 'hazard', 0.3);
        list.s(line(v(center.x - size * 0.35, center.y + size * 0.2), v(center.x + size * 0.1, center.y + size * 0.05), 4), 'hazard');
        list.s(line(v(center.x + size * 0.1, center.y + size * 0.05), v(center.x + size * 0.35, center.y - size * 0.3), 4), 'hazard');
        CasinoPage.vehicle(list, 'sportsCar', null, v(center.x + size * 0.28, center.y - size * 0.22), size * 0.34, 0.9, 1);
        break;
      case 'slots':
        MenuKit.glow(list, center, size * 0.5, 'coin', 0.3);
        (['sportsCar', 'boss', 'sportsCar'] as SlotSymbol[]).forEach((s, i) => CasinoPage.symbol(list, s, v(center.x + (i - 1) * size * 0.3, center.y), size * 0.27, 1, 0));
        break;
      case 'upgrade':
        MenuKit.glow(list, center, size * 0.5, 'accent', 0.3);
        list.s(arc(center, size * 0.3, 6, 0, TAU), 'controlFill');
        list.s(arc(center, size * 0.3, 6, -Math.PI / 2, -Math.PI / 2 + 0.38 * TAU), 'accent');
        list.s(polygon([add(center, v(size * 0.2, -size * 0.2)), add(center, v(-3, -3)), add(center, v(3, 3))]), 'primary');
        break;
    }
  },
};
