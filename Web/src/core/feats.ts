import { baseConfig, type Config } from './config';
import type { Career } from './career';
import { Elite, type TitleId } from './elite';
import { cosmetic, type Cosmetic } from './loot';

/**
 * Feats (Leo, 01.10.2026): the hardest deeds in the game, under Progress → Mastery → Feats.
 * Never luck, never for sale: each one is a long road (Prestige ranks, the Elite track,
 * Legendary Shifts) and pays a skin or a map of its own and often a title. The rewards are paid
 * where the deed happens (`Careers.prestige`, `recordElite`, `completeLegendary`); this is the
 * list the player works down, with how far they have come.
 */
export type FeatGoal = { k: 'prestige'; rank: number } | { k: 'elite'; level: number } | { k: 'legendary'; shifts: number };

export interface Feat {
  /** The reward's cosmetic id, also the feat's id. */
  id: string;
  goal: FeatGoal;
  title: TitleId | null;
}

export const FEATS: Feat[] = [
  { id: 'bigScreen', goal: { k: 'prestige', rank: 5 }, title: null },
  { id: 'nova', goal: { k: 'prestige', rank: 10 }, title: 'ascended' },
  { id: 'gilded', goal: { k: 'prestige', rank: 15 }, title: null },
  { id: 'singularity', goal: { k: 'prestige', rank: 20 }, title: 'eternal' },
  { id: 'zenith', goal: { k: 'elite', level: 75 }, title: 'grandmaster' },
  { id: 'eventHorizon', goal: { k: 'elite', level: 100 }, title: 'centurion' },
  { id: 'undying', goal: { k: 'legendary', shifts: 50 }, title: 'immortal' },
];

export const Feats = {
  /** How far the save has come, and where the feat is done. */
  progress(f: Feat, c: Career, config: Config = baseConfig): { have: number; need: number } {
    switch (f.goal.k) {
      case 'prestige':
        return { have: c.prestige, need: f.goal.rank };
      case 'elite':
        return { have: Elite.level(c, config), need: f.goal.level };
      case 'legendary':
        return { have: c.legendaryDone, need: f.goal.shifts };
    }
  },

  done: (f: Feat, c: Career, config: Config = baseConfig): boolean => {
    const p = Feats.progress(f, c, config);
    return p.have >= p.need;
  },

  reward: (f: Feat): Cosmetic => cosmetic(f.id)!,

  byId: (id: string): Feat | undefined => FEATS.find((f) => f.id === id),

  /** Feats done, for the chip on the switch. */
  count: (c: Career, config: Config = baseConfig): number => FEATS.filter((f) => Feats.done(f, c, config)).length,
};
