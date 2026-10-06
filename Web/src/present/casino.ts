import { type Career, Careers } from '../core/career';
import { baseConfig } from '../core/config';
import { type CasinoGame, type CasinoRound, type SlotSpin, type SlotSymbol, type UpgradeRoll, type CoinFlip, type RouletteSpin, type ScratchCard, CASINO_GAMES, SLOT_SYMBOLS, Casino } from '../core/casino';
import { type Cosmetic, rarityRank } from '../core/loot';
import { type Vec2, v, add, mul, fromAngle, TAU, lerpV } from '../core/vec2';
import { type RenderList, type Rect, R, rect, circle, arc, line, polygon, Ease, moved, drawText } from './render';
import type { ColorToken } from './theme';
import { MenuKit } from './menukit';
import { textWidth } from './icons';
import { S, Fmt, money, percent } from './strings';
import { ShopPage } from './shop';
import { CasinoGames } from './casinoGames';
import { TIMES, slotEnd, reelStop, creepAt, crashStep, needleTime, needleTurn, unit, rouletteEnd, rouletteTurn, scratchEnd, scratchAt } from './casinoKit';
export { winTier } from './casinoKit';
import { Wallet } from './casinoWallet';
import type { AdOffer } from './adFlow';
export { Wallet, type Books } from './casinoWallet';

/**
 * The casino in the Shop (`core/casino.ts`): Crash, Slots and the Skin Upgrade, and after a
 * win the coin for double or nothing. Loud where it pays off, calm everywhere else: the odds
 * are one tap away, the history shows what really happened, and every reveal skips on a tap.
 * Every animation is a pure function of its age, like the chest opening.
 */
export type CasinoTarget =
  | { k: 'game'; game: CasinoGame }
  | { k: 'odds' }
  /** The Skin Upgrade's boost for a watched ad (Leo, 05.10.2026). */
  | { k: 'boost' }
  | { k: 'stake'; index: number }
  | { k: 'auto'; index: number }
  /** Roulette: the vehicle type the bet is on. */
  | { k: 'bet'; symbol: SlotSymbol }
  | { k: 'buyCard' }
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
  | { k: 'roulette'; spin: RouletteSpin; age: number }
  | { k: 'scratch'; card: ScratchCard; age: number }
  /** `chain`: how many flips in a row this one is (1 the first). */
  | { k: 'flip'; flip: CoinFlip; items: boolean; age: number; chain: number };

/** What the session plays or settles as a run goes on. */
export type CasinoCue =
  | { k: 'tick'; step: number }
  | { k: 'reel'; reel: number }
  | { k: 'creep'; step: number }
  | { k: 'peg'; slow: boolean }
  | { k: 'ding'; step: number }
  | { k: 'result' }
  | { k: 'crashDue' }
  | { k: 'clutchBoom' }
  /** A win's coins reached the money chip. */
  | { k: 'coins'; tier: number };

export class CasinoState {
  /** The Shop's wallet: it lives on while the casino loads (`casinoWallet.ts`). */
  constructor(readonly wallet: Wallet) {}

  game: CasinoGame = 'crash';
  stake = 0;
  auto = 0;
  /** Roulette: the vehicle type bet on. */
  bet: SlotSymbol = 'sportsCar';
  run: CasinoRun | null = null;
  /** Where the reels rest between spins. */
  reels: [number, number, number] = [0, 7, 15];
  staked: string[] = [];
  target: string | null = null;
  picker: 'stake' | 'target' | null = null;
  page = 0;
  gameSlide: { from: CasinoGame; age: number } | null = null;
  pressed: { t: CasinoTarget; age: number } | null = null;
  /** The ads on offer (the session sets it every frame): the boost row shows only where they are on. */
  ad: AdOffer = { offers: false, ready: false };

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
      case 'roulette':
        return r.age < rouletteEnd;
      case 'scratch':
        return r.age < scratchEnd;
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
      case 'roulette':
        return 0.15 + 0.5 * Ease.clamp01(r.age / TIMES.rouletteDrive);
      case 'scratch':
        return 0.1;
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
      case 'roulette':
        return r.age - rouletteEnd;
      case 'scratch':
        return r.age - scratchEnd;
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
    const end = r.k === 'slots' ? slotEnd(r) : r.k === 'upgrade' ? needleTime(r.roll) : r.k === 'roulette' ? rouletteEnd : r.k === 'scratch' ? scratchEnd : r.k === 'flip' ? TIMES.flip : r.age;
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
    this.wallet.advance(delta, cues);
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
      case 'roulette': {
        // The car clicks past every exit on its way round.
        const exits = baseConfig.slotStrip.length;
        const p0 = Math.floor(rouletteTurn(r, Math.min(before, TIMES.rouletteDrive)) * exits);
        const p1 = Math.floor(rouletteTurn(r, Math.min(after, TIMES.rouletteDrive)) * exits);
        if (p1 > p0 && wasBusy) cues.push({ k: 'peg', slow: after / TIMES.rouletteDrive > 0.6 });
        if (crossed(rouletteEnd)) cues.push({ k: 'result' });
        break;
      }
      case 'scratch': {
        for (let i = 0; i < 9; i++) if (crossed(scratchAt(i))) cues.push({ k: 'peg', slow: false });
        if (crossed(scratchEnd)) cues.push({ k: 'result' });
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
  showHistory: boolean;
  /** The stage got its minimum height without running into the rows under it. */
  fits: boolean;
  /** The Skin Upgrade's boost row under the history; null where there are no ad offers. */
  boost: Rect | null;
  stage: Rect;
  autos: Rect[];
  stakes: Rect[];
  /** Roulette: one tile per vehicle type to bet on. */
  bets: [SlotSymbol, Rect][];
  /** Scratch: the button that buys a card. */
  buy: Rect | null;
  main: Rect;
  /** Double or nothing, then Collect: they share the main button's row. */
  pair: [Rect, Rect];
}

/**
 * The table's sizes, roomiest first: a short screen takes the first row that leaves the stage its
 * minimum, the last one whatever the room (nothing then overlaps on any phone held upright).
 */
interface TableSizes {
  chip: number;
  gap: number;
  main: number;
  stake: number;
  boost: number;
  auto: number;
  bet: number;
  stageMin: number;
  /** The last rounds' strip under the balance; the tightest table leaves it out. */
  history: boolean;
}

const TABLE_SIZES: TableSizes[] = [
  { chip: 34, gap: 8, main: 50, stake: 34, boost: 34, auto: 28, bet: 56, stageMin: 140, history: true },
  { chip: 30, gap: 6, main: 44, stake: 30, boost: 30, auto: 24, bet: 48, stageMin: 112, history: true },
  { chip: 28, gap: 5, main: 40, stake: 28, boost: 28, auto: 22, bet: 44, stageMin: 84, history: false },
];

export const CasinoPage = {
  ...CasinoGames,
  pickerColumns: 5,

  /** The layout of the table for the state: the Skin Upgrade makes room for its boost row where ads are on. */
  layoutOf: (a: Rect, state: CasinoState): Layout => CasinoPage.layout(a, state.game, state.game === 'upgrade' && state.ad.offers),

  layout(a: Rect, game: CasinoGame, withBoost = false): Layout {
    let last: Layout | null = null;
    for (const sizes of TABLE_SIZES) {
      last = CasinoPage.place(a, game, withBoost, sizes);
      if (last.fits) break;
    }
    return last!;
  },

  place(a: Rect, game: CasinoGame, withBoost: boolean, m: TableSizes): Layout {
    const w = R.width(a);
    const cw = (w - (CASINO_GAMES.length - 1) * 6) / CASINO_GAMES.length;
    const chips = CASINO_GAMES.map((g, i): [CasinoGame, Rect] => [g, R.make(a.minX + i * (cw + 6), a.minY, a.minX + i * (cw + 6) + cw, a.minY + m.chip)]);
    const infoY = a.minY + m.chip + m.gap + 11;
    const odds = R.make(a.maxX - 76, infoY - 12, a.maxX, infoY + 12);
    const history = m.history ? R.make(a.minX, infoY + 18, a.maxX, infoY + 42) : R.make(a.minX, infoY + 12, a.maxX, infoY + 12);
    const main = R.make(a.minX, a.maxY - m.main, a.maxX, a.maxY);
    const half = (w - m.gap) / 2;
    const pair: [Rect, Rect] = [R.make(a.minX, main.minY, a.minX + half, main.maxY), R.make(a.minX + half + m.gap, main.minY, a.maxX, main.maxY)];
    let bottom = main.minY - 10;
    const row = (count: number, height: number): Rect[] => {
      const g = 6;
      const cell = (w - g * (count - 1)) / count;
      const out = Array.from({ length: count }, (_, i) => R.make(a.minX + i * (cell + g), bottom - height, a.minX + i * (cell + g) + cell, bottom));
      bottom -= height + m.gap;
      return out;
    };
    const stakes = game === 'upgrade' || game === 'scratch' ? [] : row(baseConfig.casinoStakes.length + 1, m.stake);
    const autos = game === 'crash' ? row(baseConfig.crashAutoTargets.length + 1, m.auto).slice(1) : [];
    const bets = game === 'roulette' ? row(SLOT_SYMBOLS.length, m.bet).map((r, i): [SlotSymbol, Rect] => [SLOT_SYMBOLS[i], r]) : [];
    const buy = game === 'scratch' ? row(1, m.stake + 6)[0] : null;
    const boost = withBoost ? R.make(a.minX, history.maxY + 8, a.maxX, history.maxY + 8 + m.boost) : null;
    const top = (boost ?? history).maxY + 10;
    const stage = R.make(a.minX, top, a.maxX, Math.max(top + m.stageMin, bottom - 2));
    return { chips, today: v(a.minX, infoY), odds, history, showHistory: m.history, fits: bottom - 2 - top >= m.stageMin, boost, stage, autos, stakes, bets, buy, main, pair };
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
    const l = CasinoPage.layoutOf(a, state);
    const out: [CasinoTarget, Rect][] = [];
    const busy = state.busy;
    if (!busy) out.push(...l.chips.map(([game, r]): [CasinoTarget, Rect] => [{ k: 'game', game }, r]));
    out.push([{ k: 'odds' }, l.odds]);
    if (busy) {
      if (state.driving) out.push([{ k: 'cashOut' }, l.main], [{ k: 'cashOut' }, l.stage]);
      else out.push([{ k: 'skip' }, R.make(a.minX, l.stage.minY, a.maxX, a.maxY)]);
      return out;
    }
    if (l.boost) out.push([{ k: 'boost' }, l.boost]);
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
    out.push(...l.bets.map(([symbol, r]): [CasinoTarget, Rect] => [{ k: 'bet', symbol }, r]));
    if (l.buy) out.push([{ k: 'buyCard' }, l.buy]);
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
    const l = CasinoPage.layoutOf(a, state);
    CasinoPage.addChips(list, l, state, reduceMotion, enter);
    CasinoPage.addInfo(list, l, career, today, state, enter);
    CasinoPage.addBoost(list, l, career, today, state, enter);
    const start = list.items.length;
    CasinoPage.addGame(list, l, career, state, state.game, reduceMotion, enter);
    const slide = state.gameSlide;
    if (slide && !reduceMotion) {
      const side = CASINO_GAMES.indexOf(state.game) > CASINO_GAMES.indexOf(slide.from) ? 1 : -1;
      const shift = v(side * R.width(a) * 0.3 * (1 - Ease.settle(slide.age / ShopPage.slideDuration)), 0);
      const fade = Ease.outCubic(slide.age / 0.18);
      for (let i = start; i < list.items.length; i++) list.items[i] = moved(list.items[i], shift, fade);
    }
    const chip = MenuKit.headerChip(list.camera.viewport, Fmt.number(state.wallet.money(career.money)));
    CasinoPage.addFlights(list, state.wallet, v(R.center(l.stage).x, l.stage.minY + R.height(l.stage) * 0.3), chip);
  },

  /**
   * Coins between the money chip and the stage: a few leave for the table with a stake, a
   * win's worth fly back in a loose swarm. Each coin arcs up and turns as it goes.
   */
  addFlights(list: RenderList, wallet: Wallet, stage: Vec2, chip: Vec2): void {
    for (const f of wallet.flights) {
      const [from, to] = f.toStage ? [chip, stage] : [stage, chip];
      for (let i = 0; i < f.count; i++) {
        const x = (f.age - i * Wallet.spacing) / Wallet.flight;
        if (x <= 0 || x >= 1) continue;
        const e = Ease.inOutSine(x);
        const bend = v((from.x + to.x) / 2 + (unit(i, 61) - 0.5) * 140, Math.min(from.y, to.y) - 30 - 70 * unit(i, 62));
        const a = lerpV(from, bend, e);
        const p = lerpV(a, lerpV(bend, to, e), e);
        const turn = Math.abs(Math.cos(f.age * (9 + 5 * unit(i, 63)) + i));
        const r = (f.toStage ? 5 : 6) * (0.75 + 0.25 * (1 - x));
        const w = Math.max(0.2, turn);
        list.s(rect(p, v(2 * r * w, 2 * r), r * w), 'coin', 1);
        if (w > 0.5) list.s(rect(p, v(r * w, r), r * 0.5 * w), 'rarityLegendary', 0.8);
      }
    }
  },

  /** A win as loud as its tier: confetti from the second, rays from the third, a gold flash on the last. */
  celebrate(list: RenderList, center: Vec2, since: number, tier: number, color: ColorToken, reduceMotion: boolean): void {
    if (reduceMotion || tier < 2 || since < 0 || since >= 2) return;
    if (tier >= 3) ShopPage.addRays(list, center, since, tier >= 4 ? 1.3 : 0.9, color, true, tier >= 4);
    ShopPage.addConfetti(list, center, since, [0, 0, 0.8, 1.1, 1.5][tier] ?? 1.5, color, tier >= 4);
    if (tier >= 4 && since < 0.3) {
      const vp = list.camera.viewport;
      list.s(rect(mul(vp, 0.5), vp), 'coin', 0.22 * (1 - since / 0.3));
    }
  },

  /** The stage jolts under a win from the third tier. */
  jolt(since: number, tier: number, reduceMotion: boolean): Vec2 {
    if (reduceMotion || tier < 3 || since < 0 || since >= 0.35) return v(0, 0);
    const a = (tier >= 4 ? 6 : 3) * (1 - since / 0.35);
    return v(Math.sin(since * 70) * a, Math.cos(since * 55) * a * 0.5);
  },

  addGame(list: RenderList, l: Layout, career: Career, state: CasinoState, game: CasinoGame, reduceMotion: boolean, enter: number): void {
    const run = state.run;
    if (run?.k === 'flip') CasinoPage.addFlip(list, l.stage, run, career, reduceMotion, enter);
    else if (game === 'crash') CasinoPage.addCrash(list, l.stage, run?.k === 'crash' ? run : null, reduceMotion, enter);
    else if (game === 'slots') CasinoPage.addSlots(list, l.stage, state, run?.k === 'slots' ? run : null, reduceMotion, enter);
    else if (game === 'roulette') CasinoPage.addRoulette(list, l.stage, state, run?.k === 'roulette' ? run : null, reduceMotion, enter);
    else if (game === 'scratch') CasinoPage.addScratch(list, l.stage, career, run?.k === 'scratch' ? run : null, reduceMotion, enter);
    else if (state.picker) CasinoPage.addPicker(list, l.stage, career, state, enter);
    else CasinoPage.addUpgrade(list, l.stage, state, run?.k === 'upgrade' ? run : null, career.upgradeBoost, reduceMotion, enter);
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
      list.s(rect(lerpV(R.center(from), R.center(to), glide), v(R.width(to), R.height(to)), 10), 'primary', enter);
    }
    for (const [game, chip] of l.chips) {
      const r = CasinoPage.pressedRect(chip, { k: 'game', game }, state);
      const on = game === state.game ? glide : slide && game === slide.from ? 1 - glide : 0;
      const label = S.casino.game(game);
      const dim = busy && game !== state.game ? 0.4 : 1;
      const size = ShopPage.fitted(label, 13, R.width(r) - 8);
      drawText(list, label, R.center(r), size, 'muted', { weight: 'bold', align: 'center', opacity: enter * (1 - on) * dim });
      if (on > 0) drawText(list, label, R.center(r), size, 'background', { weight: 'bold', align: 'center', opacity: enter * on });
    }
  },

  /** Today's balance as it is, the odds a tap away, and what the last rounds really gave. */
  addInfo(list: RenderList, l: Layout, career: Career, today: number, state: CasinoState, enter: number): void {
    const net = state.wallet.net(Casino.today(career, today));
    drawText(list, S.casino.today(net), l.today, 13, net > 0 ? 'accent' : net < 0 ? 'destructive' : 'muted', { weight: 'bold', opacity: enter });
    const odds = CasinoPage.pressedRect(l.odds, { k: 'odds' }, state);
    list.s(rect(R.center(odds), v(R.width(odds), R.height(odds)), R.height(odds) / 2), 'controlFill', enter);
    drawText(list, S.casino.odds, R.center(odds), 12, 'primary', { weight: 'bold', align: 'center', opacity: enter });
    if (!l.showHistory) return;
    const rounds = state.wallet.log(career.casinoLog).filter((r) => r.game === state.game).slice(-8);
    if (rounds.length === 0) {
      drawText(list, S.casino.noHistory, v(l.history.minX, R.center(l.history).y), 12, 'muted', { opacity: 0.8 * enter });
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
      drawText(list, label, v(x + w / 2, y), 11, won ? 'accent' : 'muted', { weight: 'bold', align: 'center', opacity: enter });
      x += w + 6;
    }
  },

  /**
   * The Skin Upgrade's boost row: a watched ad adds `upgradeAdBoost` to the next round's chance
   * (Leo, 05.10.2026). Offered, never pushed: it only waits here, and says what it does and how
   * many are left. The dial shows the chance it really rolls.
   */
  addBoost(list: RenderList, l: Layout, career: Career, today: number, state: CasinoState, enter: number): void {
    if (!l.boost) return;
    const left = Careers.adBoostsLeft(career, today, baseConfig);
    const on = career.upgradeBoost;
    const usable = !on && left > 0 && state.ad.ready && !state.busy;
    const r = CasinoPage.pressedRect(l.boost, { k: 'boost' }, state);
    const c = R.center(r);
    const size = v(R.width(r), R.height(r));
    const p = percent(baseConfig.upgradeAdBoost);
    list.s(rect(c, size, 12), on ? 'accent' : 'controlFill', enter);
    if (on) list.s(rect(c, v(size.x - 3, size.y - 3), 10.5), 'cardRaised', enter);
    const label = on ? S.ads.boostOn(p) : left <= 0 ? S.ads.noBoosts : !state.ad.ready ? S.ads.unavailable : S.ads.boostWatch(p);
    const detail = on || left <= 0 || !state.ad.ready ? '' : S.ads.boostLeft(left);
    const room = size.x - 24 - (detail ? textWidth(detail, 11) + 10 : 0);
    drawText(list, label, v(r.minX + 12, c.y), ShopPage.fitted(label, 13, room), on ? 'accent' : usable ? 'primary' : 'muted', { weight: 'bold', opacity: enter * (usable || on ? 1 : 0.7) });
    if (detail) drawText(list, detail, v(r.maxX - 12, c.y), 11, 'muted', { align: 'trailing', opacity: enter });
  },

  roundLabel(r: CasinoRound): string {
    switch (r.game) {
      case 'crash':
        return S.casino.times(r.x);
      case 'slots':
        return r.win > 0 ? `+${Fmt.number(r.win)}` : '–';
      case 'upgrade':
        return `${r.win > 0 ? '✓' : '✕'} ${Math.round(r.x * 100)} %`;
      case 'roulette':
        return r.win > 0 ? `+${Fmt.number(r.win)}` : '–';
      case 'scratch':
        return r.win > 0 ? `${r.x}×` : '–';
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
      drawText(list, label, R.center(r), ShopPage.fitted(label, 12, R.width(r) - 6), chosen ? 'background' : affordable ? 'primary' : 'muted', { weight: 'bold', align: 'center', opacity: o * (affordable || chosen ? 1 : 0.6) });
    });
    if (l.autos.length > 0) {
      const label = v(l.stage.minX + 2, R.center(l.autos[0]).y);
      drawText(list, S.casino.auto, label, 12, 'muted', { weight: 'bold', opacity: enter * (busy ? 0.45 : 1) });
      l.autos.forEach((cell, i) => {
        const r = CasinoPage.pressedRect(cell, { k: 'auto', index: i }, state);
        const chosen = i === state.auto;
        const o = enter * (busy ? 0.45 : 1);
        list.s(rect(R.center(r), v(R.width(r), R.height(r)), 8), chosen ? 'cardRaised' : 'controlFill', o);
        const target = baseConfig.crashAutoTargets[i];
        drawText(list, target === 0 ? S.casino.autoOff : S.casino.times(target), R.center(r), 12, chosen ? 'accent' : 'muted', { weight: 'bold', align: 'center', opacity: o });
      });
    }
    const button = (r: Rect, target: CasinoTarget, label: string, prominent: boolean, enabled: boolean, tint: ColorToken = 'accent'): void => {
      const p = CasinoPage.pressedRect(r, target, state);
      const c = R.center(p);
      const size = v(R.width(p), R.height(p));
      if (prominent) {
        list.s(rect(c, size, 14), tint, enter * (enabled ? 1 : 0.35));
        drawText(list, label, c, ShopPage.fitted(label, 16, size.x - 20), 'accentInk', { weight: 'bold', align: 'center', opacity: enter * (enabled ? 1 : 0.6) });
      } else {
        list.s(rect(c, size, 14), tint, enter * (enabled ? 1 : 0.35));
        list.s(rect(c, v(size.x - 3, size.y - 3), 12.5), 'cardRaised', enter);
        drawText(list, label, c, ShopPage.fitted(label, 15, size.x - 20), enabled ? 'primary' : 'muted', { weight: 'bold', align: 'center', opacity: enter });
      }
    };
    l.bets.forEach(([symbol, cell]) => {
      const r = CasinoPage.pressedRect(cell, { k: 'bet', symbol }, state);
      const chosen = symbol === state.bet;
      const o = enter * (busy ? 0.45 : 1);
      const c = R.center(r);
      // The chosen tile lifts a little and glows; the rest wait flat.
      const lift = chosen && !busy ? -2 : 0;
      list.s(rect(v(c.x, c.y + lift), v(R.width(r), R.height(r)), 10), chosen ? 'primary' : 'controlFill', o);
      CasinoPage.symbol(list, symbol, v(c.x, c.y - 8 + lift), Math.min(28, R.width(r) - 10), o, 0);
      drawText(list, `${Casino.roulettePay(symbol, baseConfig).toFixed(1)}×`, v(c.x, r.maxY - 9 + lift), 10, chosen ? 'background' : 'muted', { weight: 'bold', align: 'center', opacity: o });
    });
    if (l.buy) {
      const full = career.scratchCards >= baseConfig.scratchMax;
      button(l.buy, { k: 'buyCard' }, full ? S.casino.cardFull : S.casino.buyCard(money(Fmt.number(baseConfig.scratchPrice))), false, Casino.canBuyCard(career, baseConfig) && !busy, 'coin');
    }
    if (state.picker) {
      button(l.main, { k: 'done' }, S.casino.done, true, true);
      return;
    }
    const run = state.run;
    if (busy) {
      if (run?.k === 'crash') {
        const m = Casino.multiplierAt(run.age, baseConfig);
        button(l.main, { k: 'cashOut' }, S.casino.cashOut(money(Fmt.number(Math.floor(run.stake * m)))), true, m > 1, 'hazard');
      } else drawText(list, S.casino.tapToSkip, R.center(l.main), 12, 'muted', { align: 'center', opacity: 0.8 * enter });
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
      return { label: S.casino.upgrade(Casino.upgradeChance(state.staked, state.target, baseConfig, career.upgradeBoost)), enabled: Casino.canUpgrade(career, state.staked, state.target, baseConfig) };
    }
    if (state.game === 'scratch') return { label: S.casino.scratch(career.scratchCards), enabled: career.scratchCards > 0 };
    const stake = CasinoPage.stakeOf(career, state);
    if (stake <= 0 || stake > career.money) return { label: S.casino.notEnough, enabled: false };
    const m = money(Fmt.number(stake));
    return { label: state.game === 'crash' ? S.casino.drive(m) : state.game === 'roulette' ? S.casino.bet(m) : S.casino.spin(m), enabled: true };
  },

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
      case 'roulette':
        MenuKit.glow(list, center, size * 0.5, 'primary', 0.25);
        list.s(arc(center, size * 0.3, 6, 0, TAU), 'controlFill');
        for (let i = 0; i < 8; i++) list.s(circle(add(center, mul(fromAngle((i / 8) * TAU), size * 0.3)), 3), i === 2 ? 'accent' : 'marking');
        CasinoPage.vehicle(list, 'car', null, add(center, mul(fromAngle(-0.9), size * 0.3)), size * 0.3, 0.7, 1);
        break;
      case 'scratch':
        MenuKit.glow(list, center, size * 0.5, 'coin', 0.3);
        list.s(rect(center, v(size * 0.56, size * 0.56), 8), 'cardRaised');
        for (let i = 0; i < 9; i++) list.s(rect(add(center, v(((i % 3) - 1) * size * 0.17, (Math.floor(i / 3) - 1) * size * 0.17)), v(size * 0.13, size * 0.13), 3), i < 3 ? 'coin' : 'marking', i < 3 ? 1 : 0.7);
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
