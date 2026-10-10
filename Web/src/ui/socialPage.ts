import { h } from './dom';
import { friendsPanel, type FriendsActions } from './friendsPanel';
import { ranksPanel, type RanksActions } from './ranksPanel';
import { clubPanel, type ClubHost, type ClubPanel } from './clubPanel';
import { fadeIn } from './sheets';
import { SOCIAL, type SocialSection } from '../present/flow';
import { S } from '../present/strings';

export interface SocialHost {
  friends(): FriendsActions;
  ranks(): RanksActions;
  club(): ClubHost;
  clubOpen(): boolean;
  /** The ranking service is there (`VITE_API_URL`): without it Friends and Ranks have nothing to show. */
  online: boolean;
  /** Friend codes and invite links are not shown inside CrazyGames. */
  friendsAllowed: boolean;
}

/** Where the page's column sits under the canvas' title and segments (`SocialPage.column`), in points. */
export interface SocialColumn {
  top: number;
  width: number;
}

/**
 * The Social tab's content (Leo, 10.10.2026): Friends, Ranks and the Club as one page of the tab bar, not as drawers. The canvas draws the ground, the title
 * and the segments (`present/social.ts`); this is the DOM under them, which scrolls on its own. The section that shows is built when it is chosen and
 * let go when it is left, so the auction's clock and the answers on their way stop with it. A notice the game says here stands in a pill of its own:
 * the canvas under the page would hide it.
 */
export class SocialView {
  private readonly el = h('div', { class: 'social-page', hidden: true });
  private readonly inner = h('div', { class: 'social-inner' });
  private readonly toastEl = h('div', { class: 'social-toast glass', role: 'presentation', 'aria-hidden': 'true' });
  private section: SocialSection | null = null;
  private club: ClubPanel | null = null;
  private clearing = 0;

  constructor(
    parent: HTMLElement,
    private readonly host: SocialHost,
  ) {
    this.el.append(this.inner);
    parent.append(this.el, this.toastEl);
  }

  get isOpen(): boolean {
    return this.section !== null;
  }

  /** Follows the session: shown on the Social tab under the segments, with the chosen section in it. */
  sync(on: boolean, section: SocialSection, column: SocialColumn): void {
    if (!on) return this.leave();
    window.clearTimeout(this.clearing);
    this.el.style.top = `calc(var(--safe-top) + ${column.top}px)`;
    this.inner.style.maxWidth = `${column.width}px`;
    if (this.el.hidden) {
      this.el.hidden = false;
      void this.el.offsetWidth;
    }
    this.el.classList.add('show');
    if (section === this.section) return;
    const first = this.section === null;
    this.section = section;
    this.inner.replaceChildren(this.build(section));
    this.el.scrollTop = 0;
    if (!first) fadeIn(this.inner);
  }

  /** What the game says, in a pill above the tab bar: its text and how far it is in (0–1). */
  toast(notice: { text: string; presence: number } | null): void {
    const on = notice !== null && this.isOpen;
    if (on && this.toastEl.textContent !== notice.text) this.toastEl.textContent = notice.text;
    this.toastEl.style.opacity = on ? String(notice.presence) : '0';
  }

  private leave(): void {
    if (this.section === null) return;
    this.section = null;
    this.el.classList.remove('show');
    this.toastEl.style.opacity = '0';
    this.clearing = window.setTimeout(() => {
      this.club?.dispose();
      this.club = null;
      this.inner.replaceChildren();
      this.el.hidden = true;
    }, 220);
  }

  private build(section: SocialSection): HTMLElement {
    this.club?.dispose();
    this.club = null;
    if (section === SOCIAL.friends) return this.host.friendsAllowed ? friendsPanel(this.host.friends()) : h('p', { class: 'section-note' }, this.host.online ? S.social.noFriends : S.social.offline);
    if (section === SOCIAL.ranks) return this.host.online ? ranksPanel(this.host.ranks()) : h('p', { class: 'section-note' }, S.social.offline);
    if (!this.host.clubOpen()) return h('p', { class: 'section-note' }, S.social.clubClosed);
    this.club = clubPanel(this.host.club());
    return this.club.el;
  }
}
