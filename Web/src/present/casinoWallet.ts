import type { CasinoRound } from '../core/casino';
import type { CasinoCue } from './casino';
import { Ease } from './render';

/**
 * The Shop's money as the casino shows it. Kept apart from the casino itself, which loads
 * only when it is opened (`casinoLoader.ts`): the Shop's header and badges read it always.
 */
/** The books as the page shows them. */
export interface Books {
  money: number;
  net: number;
  log: CasinoRound[];
  /** New in the collection: a skin won must not light the badges before the reveal. */
  unseen: string[];
}

/** Coins on their way between the header's money chip and the stage. */
interface CoinFlight {
  toStage: boolean;
  count: number;
  age: number;
  tier: number;
}

/**
 * The money, today's balance and the history as the page shows them. The rules settle a
 * round the moment it starts, so a reload stays fair; the page lets the result show only
 * with the reveal. The stake leaves for the table at once, a win flies back to the money
 * chip with the result and counts up there.
 */
export class Wallet {
  static readonly flight = 0.5;
  /** Between two coins of one flight. */
  static readonly spacing = 0.035;
  private held: Books | null = null;
  private count: { from: number; to: number; age: number; delay: number; duration: number } | null = null;
  flights: CoinFlight[] = [];
  /** Seconds since a win's coins reached the chip: it swells. */
  sinceLanded = Infinity;

  money(bank: number): number {
    const c = this.count;
    if (!c) return this.held?.money ?? bank;
    const x = Ease.clamp01((c.age - c.delay) / c.duration);
    return Math.round(c.from + (c.to - c.from) * Ease.outCubic(x));
  }

  net(real: number): number {
    return this.held?.net ?? real;
  }

  log(real: CasinoRound[]): CasinoRound[] {
    return this.held?.log ?? real;
  }

  unseen(real: string[]): string[] {
    return this.held?.unseen ?? real;
  }

  /** A round begins: the books as they were (`before`), less the stake that went on the table. */
  stake(before: Books, stake: number, reduceMotion: boolean): void {
    this.held = { ...before, money: before.money - stake, net: before.net - stake };
    this.count = null;
    if (stake <= 0 || reduceMotion) return;
    this.count = { from: before.money, to: before.money - stake, age: 0, delay: 0, duration: 0.25 };
    this.flights.push({ toStage: true, count: 3, age: 0, tier: 0 });
  }

  /** The result shows: the books catch up, and a win flies to the chip and counts up there. */
  reveal(bank: number, win: number, tier: number, reduceMotion: boolean): void {
    const from = this.money(bank);
    this.held = null;
    this.count = null;
    if (reduceMotion || from === bank) return;
    if (win > 0) {
      this.flights.push({ toStage: false, count: 5 + 4 * tier, age: 0, tier });
      this.count = { from, to: bank, age: 0, delay: Wallet.flight, duration: 0.45 + 0.15 * tier };
    } else this.count = { from, to: bank, age: 0, delay: 0, duration: 0.3 };
  }

  advance(delta: number, cues: CasinoCue[]): void {
    this.sinceLanded += delta;
    if (this.count) {
      this.count.age += delta;
      if (this.count.age >= this.count.delay + this.count.duration) this.count = null;
    }
    for (const f of this.flights) {
      const before = f.age;
      f.age += delta;
      if (!f.toStage && before < Wallet.flight && f.age >= Wallet.flight) {
        this.sinceLanded = 0;
        cues.push({ k: 'coins', tier: f.tier });
      }
    }
    this.flights = this.flights.filter((f) => f.age < Wallet.flight + f.count * Wallet.spacing);
  }
}
