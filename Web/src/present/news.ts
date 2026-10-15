import { type SaveGame, type Hint } from '../core/career';
import { PROGRESS, type ProgressSection } from './flow';

/**
 * What is new in a place players already know (Leo, 15.10.2026): the tab and the segment show a dot, the element itself
 * its own marker, until the place has been visited. Unlike an intro it explains nothing; the Patch Notes stay for that.
 * Add an item with the patch note it belongs to and delete it a few weeks later. Seen ones are `news.*` hints in the save.
 */
export interface NewsItem {
  id: string;
  tab: 'progress' | 'shop' | 'social';
  /** The segment: Progress, Shop and Social number theirs from 0. */
  section: ProgressSection;
}

export const NEWS: readonly NewsItem[] = [{ id: 'failures', tab: 'progress', section: PROGRESS.museum }];

/** How long a place has to be open to count as seen. */
export const NEWS_DWELL = 1.2;

const hintOf = (n: NewsItem): Hint => `news.${n.id}`;

export const News = {
  /** Waiting, none while the tutorial runs. */
  pending: (save: SaveGame): NewsItem[] => (save.tutorialDone ? NEWS.filter((n) => !save.hints.includes(hintOf(n))) : []),

  has: (save: SaveGame, id: string): boolean => News.pending(save).some((n) => n.id === id),

  /** The sections of a tab with news waiting. */
  sections: (save: SaveGame, tab: NewsItem['tab']): ProgressSection[] => News.pending(save).filter((n) => n.tab === tab).map((n) => n.section),

  /** The place was visited: what waited there is seen. Whether something changed. */
  read(save: SaveGame, tab: NewsItem['tab'], section: ProgressSection): boolean {
    const seen = News.pending(save).filter((n) => n.tab === tab && n.section === section);
    for (const n of seen) save.hints.push(hintOf(n));
    return seen.length > 0;
  },

  /** A new player has nothing to catch up on; one who has played sees what is listed. Once per save. */
  start(save: SaveGame): void {
    if (save.hints.includes('newsStarted')) return;
    save.hints.push('newsStarted');
    if (!save.tutorialDone) for (const n of NEWS) save.hints.push(hintOf(n));
  },
};
