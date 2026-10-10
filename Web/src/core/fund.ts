import { baseConfig, type Config } from './config';
import { type Career, Careers } from './career';
import { COSMETICS, type Cosmetic } from './loot';

/**
 * The City Fund (Leo, 10.10.2026), a sink for big balances everyone builds together
 * (`Server/src/modules/fund`). Gifts go to the project being built; when its goal is met the next
 * starts, and everyone who gave enough to it gets its skin. Looks only.
 *
 * The money is the browser's, as everywhere: the game takes a gift from the save only after the
 * service has accepted it, and only the part it accepted.
 */
export interface FundProject {
  id: string;
  goal: number;
  raised: number;
  done: boolean;
  /** The one being built now. */
  active: boolean;
  /** What this player gave to it. */
  mine: number;
}

export interface FundView {
  projects: FundProject[];
  top: { name: string; amount: number }[];
  minGift: number;
  maxGift: number;
}

/** The gifts on offer in the sheet, as far as the money reaches (and the service's limits). */
export const GIFTS: readonly number[] = [10_000, 50_000, 250_000, 1_000_000, 5_000_000];

export const Fund = {
  /** The skin of a project, by the cosmetic's own source. */
  skinOf: (project: string): Cosmetic | undefined => COSMETICS.find((x) => x.source.kind === 'fund' && x.source.project === project),

  /** Skins the career is owed: projects that are built, that it gave enough to, and whose skin it lacks. */
  owed(c: Career, view: FundView, config: Config = baseConfig): Cosmetic[] {
    return view.projects.flatMap((p) => {
      const skin = Fund.skinOf(p.id);
      return p.done && p.mine >= config.fundBenefactor && skin && !Careers.owns(c, skin.id) ? [skin] : [];
    });
  },

  /** Takes in what is owed. Returns the ids, newest to be told about. */
  claim(c: Career, view: FundView, config: Config = baseConfig): string[] {
    const owed = Fund.owed(c, view, config);
    for (const skin of owed) Careers.collect(c, skin.id);
    return owed.map((x) => x.id);
  },

  /** The gifts the player can make now. */
  offers: (c: Career, view: FundView): number[] => GIFTS.filter((g) => g >= view.minGift && g <= view.maxGift && g <= c.money),

  /** A gift the service accepted leaves the save. */
  gave(c: Career, accepted: number): void {
    const paid = Math.min(accepted, c.money);
    c.money -= paid;
    c.fundGiven += paid;
  },
};
