import { baseConfig, type Config } from './config';
import { type Career, Careers } from './career';
import { Casino, isStakeable } from './casino';
import { Elite } from './elite';
import { CHEST_KINDS, COSMETICS, type ChestKind, type Rarity, chestPrice, cosmetic } from './loot';
import { Rng } from './rng';

/**
 * The Auction House (Leo, 10.10.2026), a sink for big balances. A few lots a day, one try each: the
 * player bids against computer-controlled collectors, most of them sharks who push the price far
 * over the estimate, and pays the hammer price plus a buyer's premium. Walking away is free; the
 * lot then goes to a collector. Said on screen, with the odds: the share of sharks and how far they go.
 *
 * Fair by construction like the casino: a collector's ceiling is drawn when the auction begins from the
 * career's seed and unsaved entropy, and the lot is spent the moment it begins, so a reload gives no
 * second look. Looks only: a lot is a skin or a chest, never an edge on the road.
 */
export type Lot = { k: 'skin'; id: string } | { k: 'chest'; chest: ChestKind };

export const lotKey = (lot: Lot): string => (lot.k === 'skin' ? `skin:${lot.id}` : `chest:${lot.chest}`);

/** A stored lot, or null when it is not one the game knows (an edited save). */
export function readLot(key: string): Lot | null {
  const [kind, name] = key.split(':');
  if (kind === 'skin' && name && cosmetic(name)) return { k: 'skin', id: name };
  if (kind === 'chest' && CHEST_KINDS.includes(name as ChestKind)) return { k: 'chest', chest: name as ChestKind };
  return null;
}

export interface AuctionBot {
  name: string;
  out: boolean;
}

export interface AuctionRun {
  lot: Lot;
  slot: number;
  estimate: number;
  step: number;
  /** The opening price; the first bid is at least this. */
  start: number;
  /** The highest bid so far (0 before the first). */
  price: number;
  leader: 'you' | number | null;
  bots: AuctionBot[];
  phase: 'bidding' | 'won' | 'lost';
  /** Money paid on a win: the price and the premium. */
  paid: number;
}

export type AuctionEvent =
  | { k: 'out'; bot: number }
  | { k: 'counter'; bot: number; price: number }
  | { k: 'hammer'; price: number; cost: number };

const NAMES = ['Lady Marlow', 'Baron Voss', 'Mr. Gilt', 'Miss Quill', 'Sir Penwright', 'Madame Lacroix', 'Dr. Halloran', 'Count Ferro', 'Ms. Ashby', 'Old Mr. Crane', 'Lord Whitcombe', 'Mrs. Delacroix'];

/** What the collectors will not tell: how far each one goes, and the stream of their choices. */
const ceilings = new WeakMap<AuctionRun, number[]>();
const streams = new WeakMap<AuctionRun, Rng>();

export const Auction = {
  isOpen: (c: Career, config: Config = baseConfig): boolean => Elite.isOpen(c, config),

  // MARK: Lots

  /** What the lot is thought to be worth: the rarity of the skin, the price of the chest. */
  estimate(lot: Lot, config: Config = baseConfig): number {
    if (lot.k === 'chest') return chestPrice(lot.chest, config) ?? 0;
    const item = cosmetic(lot.id);
    if (!item) return 0;
    return item.source.kind === 'auction' ? config.auctionExclusiveEstimate : config.auctionEstimate[item.rarity];
  },

  step: (estimate: number, config: Config = baseConfig): number => Math.max(500, Math.round((estimate * config.auctionStep) / 500) * 500),

  start(estimate: number, config: Config = baseConfig): number {
    const step = Auction.step(estimate, config);
    return Math.ceil((estimate * config.auctionStartShare) / step) * step;
  },

  /** The money a hammer price costs: the price and the buyer's premium. */
  cost: (price: number, config: Config = baseConfig): number => price + Math.floor(price * config.auctionPremium),

  /**
   * Today's lots, kept in the save so they hold through the day: two skins out of the chests' pool that the
   * career lacks (Epic and Legendary first) and the Auction House's own skin of the day. A crate when
   * there is nothing left to offer.
   */
  today(c: Career, day: number, config: Config = baseConfig): Lot[] {
    if (c.auctionDay !== day || c.auctionLots.length === 0) {
      c.auctionDay = day;
      c.auctionTaken = [];
      c.auctionLots = Auction.draw(c, day, config).map(lotKey);
    }
    return c.auctionLots.flatMap((key) => readLot(key) ?? []);
  },

  draw(c: Career, day: number, config: Config = baseConfig): Lot[] {
    const rng = new Rng((Math.imul(day + 1, 0x9e3779b1) ^ 0xa0c710) >>> 0);
    const used = new Set<string>();
    const crate: Lot = { k: 'chest', chest: 'diamond' };
    const fresh = (rarities: Rarity[]) => COSMETICS.filter((x) => isStakeable(x) && !Careers.owns(c, x.id) && !used.has(x.id) && rarities.includes(x.rarity));
    const skin = (): Lot => {
      const tiers: Rarity[][] = rng.unit() < 0.5 ? [['legendary'], ['epic'], ['rare'], ['common']] : [['epic'], ['legendary'], ['rare'], ['common']];
      for (const tier of tiers) {
        const pool = fresh(tier);
        if (pool.length === 0) continue;
        const pick = rng.pick(pool);
        used.add(pick.id);
        return { k: 'skin', id: pick.id };
      }
      return crate;
    };
    const lots: Lot[] = [];
    for (let i = 0; i < config.auctionLots - 1; i++) lots.push(skin());
    const own = COSMETICS.filter((x) => x.source.kind === 'auction' && !Careers.owns(c, x.id));
    lots.push(own.length > 0 ? { k: 'skin', id: own[day % own.length].id } : crate);
    return lots;
  },

  /** A lot can be tried once a day, and a skin only while it is not owned. */
  canStart(c: Career, slot: number, day: number, config: Config = baseConfig): boolean {
    if (!Auction.isOpen(c, config) || c.auctionDay !== day || c.auctionTaken.includes(slot)) return false;
    const lot = readLot(c.auctionLots[slot] ?? '');
    return lot !== null && (lot.k === 'chest' || !Careers.owns(c, lot.id));
  },

  // MARK: Bidding

  /** Begins the auction for a slot: the lot is spent, the collectors take their seats. */
  begin(c: Career, slot: number, day: number, config: Config = baseConfig): AuctionRun | null {
    if (!Auction.canStart(c, slot, day, config)) return null;
    const lot = readLot(c.auctionLots[slot])!;
    c.auctionTaken = [...c.auctionTaken, slot];
    const rng = new Rng((c.casinoSeed ^ Math.imul(++c.auctionRuns, 0x9e3779b1) ^ 0xa0c710 ^ Casino.salt()) >>> 0);
    const estimate = Auction.estimate(lot, config);
    const step = Auction.step(estimate, config);
    const start = Auction.start(estimate, config);
    const names = [...NAMES];
    const count = rng.int(config.auctionBots[0], config.auctionBots[1]);
    const bots: AuctionBot[] = [];
    const reach: number[] = [];
    for (let i = 0; i < count; i++) {
      bots.push({ name: names.splice(rng.int(0, names.length - 1), 1)[0], out: false });
      const [lo, hi] = rng.unit() < config.auctionSharkShare ? config.auctionShark : config.auctionPenny;
      // Rounded down to the grid of the bidding, so a collector stops on a step.
      reach.push(start + Math.floor((estimate * rng.range(lo, hi) - start) / step) * step);
    }
    const run: AuctionRun = { lot, slot, estimate, step, start, price: 0, leader: null, bots, phase: 'bidding', paid: 0 };
    ceilings.set(run, reach);
    streams.set(run, rng);
    return run;
  },

  /** The least a bid can be now. */
  minBid: (run: AuctionRun): number => (run.price === 0 ? run.start : run.price + run.step),

  /** Bids on offer: the least, a few steps more and a lot more, as far as the money reaches (the premium counted). */
  offers(c: Career, run: AuctionRun, config: Config = baseConfig): number[] {
    if (run.phase !== 'bidding' || run.leader === 'you') return [];
    const min = Auction.minBid(run);
    return [0, 2, 5].map((n) => min + n * run.step).filter((bid) => Auction.cost(bid, config) <= c.money);
  },

  /**
   * The player bids. A collector who can still pay the next step may counter (and jumps a few steps at a time);
   * one who cannot is out. When nobody counters the hammer falls: the player pays and takes the lot.
   */
  bid(c: Career, run: AuctionRun, amount: number, config: Config = baseConfig): AuctionEvent[] | null {
    const reach = ceilings.get(run);
    const rng = streams.get(run);
    if (!reach || !rng || run.phase !== 'bidding' || run.leader === 'you') return null;
    if (amount < Auction.minBid(run) || (amount - run.start) % run.step !== 0 || Auction.cost(amount, config) > c.money) return null;
    run.price = amount;
    run.leader = 'you';
    const events: AuctionEvent[] = [];
    run.bots.forEach((bot, i) => {
      if (!bot.out && reach[i] < amount + run.step) {
        bot.out = true;
        events.push({ k: 'out', bot: i });
      }
    });
    const seated = run.bots.flatMap((bot, i) => (bot.out ? [] : [i]));
    for (let i = seated.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [seated[i], seated[j]] = [seated[j], seated[i]];
    }
    for (const i of seated) {
      if (rng.unit() >= config.auctionNerve) continue;
      const jump = 1 + Math.floor(rng.unit() ** 1.5 * config.auctionJump);
      run.price = Math.min(amount + jump * run.step, reach[i]);
      run.leader = i;
      events.push({ k: 'counter', bot: i, price: run.price });
      return events;
    }
    const cost = Auction.cost(amount, config);
    c.money -= cost;
    if (run.lot.k === 'skin') Careers.collect(c, run.lot.id);
    else c.chests.push(run.lot.chest);
    c.auctionWins++;
    c.auctionSpent += cost;
    run.phase = 'won';
    run.paid = cost;
    events.push({ k: 'hammer', price: amount, cost });
    return events;
  },

  /** Leaves the room: nothing is paid, the lot goes to a collector. */
  walk(run: AuctionRun): void {
    if (run.phase === 'bidding') run.phase = 'lost';
  },
};
