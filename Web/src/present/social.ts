import { type Career } from '../core/career';
import { Auction } from '../core/auction';
import { DAY_MS, Mafia } from '../core/mafia';
import { inPortal } from '../storage/device';
import { type Vec2, v, clamp } from '../core/vec2';
import { type RenderList, type Rect, R, Ease, Metrics } from './render';
import { MenuKit } from './menukit';
import { textWidth } from './icons';
import { S, Fmt } from './strings';
import { ShopPage } from './shop';
import { SOCIAL, type SocialSection } from './flow';

const SOCIAL_SECTIONS: SocialSection[] = [SOCIAL.ranks, SOCIAL.crew, SOCIAL.club, SOCIAL.mafia];

/** What the Social tab animates: the chosen segment and the thumb gliding to it. */
export class SocialState {
  section: SocialSection = SOCIAL.ranks;
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
 * The Social tab (Leo, 10.10.2026): Crew (since 18.10.2026, in place of Friends) · Ranks · Club · Mafia. The canvas draws the ground, the title, the balance and the segments like every
 * page; what sits under the segments (the lists, the forms, the auction) is the shell's DOM (`ui/socialPage.ts`), placed at `column`.
 */
export const SocialPage = {
  gap: 12,

  /** The segments on show (Leo, 12.10.2026): the Club and the Mafia appear once they are open. */
  sections: (career: Career): SocialSection[] =>
    SOCIAL_SECTIONS.filter((s) => (s !== SOCIAL.club || SocialPage.clubOpen(career)) && (s !== SOCIAL.mafia || SocialPage.mafiaOpen(career))),

  /** The segments' frame, and the cells in it. */
  segments(viewport: Vec2, sections: SocialSection[] = SOCIAL_SECTIONS): [SocialSection, Rect][] {
    const width = Math.min(viewport.x - 2 * SocialPage.gap, 460);
    const left = (viewport.x - width) / 2;
    const top = Metrics.sceneInsets.top + 22;
    const sw = width / sections.length;
    return sections.map((s, i): [SocialSection, Rect] => [s, R.make(left + i * sw, top, left + (i + 1) * sw, top + ShopPage.segmentHeight)]);
  },

  /** Where the DOM content starts and how wide it is (the page's column, like the other tabs). */
  column(viewport: Vec2): { top: number; left: number; width: number } {
    const width = Math.min(viewport.x - 2 * SocialPage.gap, 460);
    return { top: SocialPage.segments(viewport, [SOCIAL.crew])[0][1].maxY + SocialPage.gap, left: (viewport.x - width) / 2, width };
  },

  sectionAt(point: Vec2, viewport: Vec2, career: Career): SocialSection | null {
    return SocialPage.segments(viewport, SocialPage.sections(career)).find(([, r]) => R.contains(r, point))?.[0] ?? null;
  },

  /** The Club opens with the Auction House (Level 50). */
  clubOpen: (career: Career): boolean => Auction.isOpen(career),

  /** The Mafia talks to whoever has put the first boss away: not inside CrazyGames, whose rules for ages and themes are stricter. */
  mafiaOpen: (career: Career): boolean => Mafia.isOpen(career) && !inPortal,

  /** A loan that is late or falls due within a day: the Mafia segment calls. */
  mafiaWaits: (career: Career, now: number): boolean => career.loan !== null && (career.loan.late || career.loan.due - now < DAY_MS),

  add(list: RenderList, career: Career, state: SocialState, reduceMotion: boolean): void {
    const vp = list.camera.viewport;
    MenuKit.backdrop(list);
    MenuKit.header(list, S.tabs.social, Fmt.number(career.money), vp);
    const shown = SocialPage.sections(career);
    const cells = SocialPage.segments(vp, shown);
    const all = R.make(cells[0][1].minX, cells[0][1].minY, cells[cells.length - 1][1].maxX, cells[0][1].maxY);
    const chosen = Math.max(0, shown.indexOf(state.section));
    let thumb = chosen;
    if (state.sectionSlide) {
      const from = Math.max(0, shown.indexOf(state.sectionSlide.from));
      const spring = reduceMotion ? 1 : Ease.settle(state.sectionSlide.age / ShopPage.slideDuration);
      thumb = clamp(from + (chosen - from) * spring, 0, shown.length - 1);
    }
    MenuKit.segmented(list, shown.map((i) => S.social.section(i)), chosen, thumb, all);
    const mafia = cells.find(([section]) => section === SOCIAL.mafia);
    if (mafia && SocialPage.mafiaWaits(career, Date.now())) {
      const r = mafia[1];
      ShopPage.badgeDot(list, v(R.center(r).x + textWidth(S.social.section(SOCIAL.mafia), 13) / 2 + 8, R.center(r).y - 6), 1);
    }
  },
};
