import { type Career } from '../core/career';
import { Auction } from '../core/auction';
import { baseConfig } from '../core/config';
import { type Vec2, v, clamp } from '../core/vec2';
import { type RenderList, type Rect, R, Ease, Metrics } from './render';
import { MenuKit } from './menukit';
import { textWidth } from './icons';
import { S, Fmt } from './strings';
import { ShopPage } from './shop';
import { SOCIAL, type SocialSection } from './flow';

const SOCIAL_SECTIONS: SocialSection[] = [SOCIAL.friends, SOCIAL.ranks, SOCIAL.club];

/** What the Social tab animates: the chosen segment and the thumb gliding to it. */
export class SocialState {
  section: SocialSection = SOCIAL.friends;
  sectionSlide: { from: SocialSection; age: number } | null = null;

  select(next: SocialSection): void {
    if (next === this.section) return;
    this.sectionSlide = { from: this.section, age: 0 };
    this.section = next;
  }

  advance(delta: number): void {
    if (!this.sectionSlide) return;
    this.sectionSlide.age += delta;
    if (this.sectionSlide.age >= ShopPage.slideDuration) this.sectionSlide = null;
  }
}

/**
 * The Social tab (Leo, 10.10.2026): Friends · Ranks · Club. The canvas draws the ground, the title, the balance and the segments like every
 * page; what sits under the segments (the lists, the forms, the auction) is the shell's DOM (`ui/socialPage.ts`), placed at `column`.
 */
export const SocialPage = {
  gap: 12,

  /** The segments' frame, and the three cells in it. */
  segments(viewport: Vec2): [SocialSection, Rect][] {
    const width = Math.min(viewport.x - 2 * SocialPage.gap, 460);
    const left = (viewport.x - width) / 2;
    const top = Metrics.sceneInsets.top + 22;
    const sw = width / SOCIAL_SECTIONS.length;
    return SOCIAL_SECTIONS.map((s, i): [SocialSection, Rect] => [s, R.make(left + i * sw, top, left + (i + 1) * sw, top + ShopPage.segmentHeight)]);
  },

  /** Where the DOM content starts and how wide it is (the page's column, like the other tabs). */
  column(viewport: Vec2): { top: number; left: number; width: number } {
    const width = Math.min(viewport.x - 2 * SocialPage.gap, 460);
    return { top: SocialPage.segments(viewport)[0][1].maxY + SocialPage.gap, left: (viewport.x - width) / 2, width };
  },

  sectionAt(point: Vec2, viewport: Vec2): SocialSection | null {
    return SocialPage.segments(viewport).find(([, r]) => R.contains(r, point))?.[0] ?? null;
  },

  /** The Club opens with the Auction House (Level 50). */
  clubOpen: (career: Career): boolean => Auction.isOpen(career),

  /** A new auction day, or lots still to try: the Club is worth a visit. */
  clubWaits: (career: Career, today: number): boolean => SocialPage.clubOpen(career) && (career.auctionDay !== today || career.auctionTaken.length < baseConfig.auctionLots),

  add(list: RenderList, career: Career, today: number, state: SocialState, reduceMotion: boolean): void {
    const vp = list.camera.viewport;
    MenuKit.backdrop(list);
    MenuKit.header(list, S.tabs.social, Fmt.number(career.money), vp);
    const cells = SocialPage.segments(vp);
    const all = R.make(cells[0][1].minX, cells[0][1].minY, cells[cells.length - 1][1].maxX, cells[0][1].maxY);
    const chosen = state.section;
    let thumb: number = chosen;
    if (state.sectionSlide) {
      const spring = reduceMotion ? 1 : Ease.settle(state.sectionSlide.age / ShopPage.slideDuration);
      thumb = clamp(state.sectionSlide.from + (chosen - state.sectionSlide.from) * spring, 0, SOCIAL_SECTIONS.length - 1);
    }
    MenuKit.segmented(list, SOCIAL_SECTIONS.map((i) => S.social.section(i)), chosen, thumb, all, SOCIAL_SECTIONS.map((i) => i === SOCIAL.club && !SocialPage.clubOpen(career)));
    if (SocialPage.clubWaits(career, today)) {
      const r = cells[SOCIAL.club][1];
      ShopPage.badgeDot(list, v(R.center(r).x + textWidth(S.social.section(SOCIAL.club), 13) / 2 + 8, R.center(r).y - 6), 1);
    }
  },
};
