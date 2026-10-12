import type { Career } from './career';

/**
 * The Game fund (Leo, 12.10.2026; it replaced the City Fund): gifts to the Club's ideas
 * (`net/ideas.ts`, `Server/src/modules/ideas`). Looks only; the money is the browser's, as everywhere:
 * the game takes a gift from the save only after the service has accepted it, and only the part it accepted.
 */
export interface FundView {
  minGift: number;
  maxGift: number;
}

/** The gifts on offer in the sheet, as far as the money reaches (and the service's limits). */
export const GIFTS: readonly number[] = [10_000, 50_000, 250_000, 1_000_000, 5_000_000];

export const Fund = {
  /** The gifts the player can make now. */
  offers: (c: Career, view: FundView): number[] => GIFTS.filter((g) => g >= view.minGift && g <= view.maxGift && g <= c.money),

  /** A gift the service accepted leaves the save. */
  gave(c: Career, accepted: number): void {
    const paid = Math.min(accepted, c.money);
    c.money -= paid;
    c.fundGiven += paid;
  },
};
