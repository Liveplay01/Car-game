import { type SaveGame, type Career, type Hint } from '../core/career';
import type { Config } from '../core/config';
import { Unlocks } from '../core/unlocks';
import { SeasonPass } from '../core/seasonPass';
import { Auction } from '../core/auction';
import { Mafia } from '../core/mafia';
import { inPortal } from '../storage/device';
import { PROGRESS, SOCIAL, type ScreenAction } from './flow';

/**
 * A place or feature that explains itself once (Leo, 12.10.2026): when it is reached it gets a dot, and the first time it is
 * opened a drawer says what it is for. Seen ones are `intro.*` hints in the save.
 */
export const INTROS = ['museum', 'builder', 'daily', 'trials', 'pass', 'casino', 'club', 'gamefund', 'mafia', 'crew'] as const;
export type Intro = (typeof INTROS)[number];

const hintOf = (i: Intro): Hint => `intro.${i}`;

/** Where each place is: the Guides' "Show me" takes the player there (Leo, 18.10.2026). */
export const INTRO_PLACE: Record<Intro, ScreenAction> = {
  museum: { k: 'showProgress', section: PROGRESS.stats },
  builder: { k: 'showTab', tab: 'streetBuilder' },
  daily: { k: 'showProgress', section: PROGRESS.today },
  trials: { k: 'showProgress', section: PROGRESS.goals },
  pass: { k: 'showProgress', section: PROGRESS.goals },
  casino: { k: 'showShop', section: 2 },
  club: { k: 'showSocial', section: SOCIAL.club },
  gamefund: { k: 'showSocial', section: SOCIAL.club },
  mafia: { k: 'showSocial', section: SOCIAL.mafia },
  crew: { k: 'showSocial', section: SOCIAL.crew },
};

export const Intros = {
  /** Whether the career has reached it: the Museum and the Street Builder from the start, the rest with their unlock. */
  known(c: Career, i: Intro, config: Config): boolean {
    switch (i) {
      case 'museum':
      case 'builder':
        return true;
      case 'daily':
      case 'trials':
      case 'casino':
        return Unlocks.isKnown(c, i, config);
      case 'pass':
        return SeasonPass.isOpen(c, config);
      case 'club':
      case 'gamefund':
        return Auction.isOpen(c);
      case 'mafia':
        return Mafia.isOpen(c) && !inPortal;
      // With the player the game asks for at Level 5 (crews need one); never on a portal.
      case 'crew':
        return !inPortal && (c.level > config.accountPromptAfterLevel || c.prestige > 0);
    }
  },

  /** Reached but not explained yet; none while the tutorial runs. */
  pending: (save: SaveGame, config: Config): Intro[] => (save.tutorialDone ? INTROS.filter((i) => !save.hints.includes(hintOf(i)) && Intros.known(save.career, i, config)) : []),

  isPending: (save: SaveGame, i: Intro, config: Config): boolean => Intros.pending(save, config).includes(i),

  mark(save: SaveGame, i: Intro): void {
    if (!save.hints.includes(hintOf(i))) save.hints.push(hintOf(i));
  },

  /** A save that has played before has met what it can reach: only what comes later explains itself. Once per save. */
  start(save: SaveGame, config: Config): void {
    if (save.hints.includes('introsStarted')) return;
    save.hints.push('introsStarted');
    if (save.tutorialDone) for (const i of INTROS) if (Intros.known(save.career, i, config)) Intros.mark(save, i);
  },
};
