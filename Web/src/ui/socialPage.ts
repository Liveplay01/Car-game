import { h } from './dom';
import { crewPanel, type CrewHost } from './crewPanel';
import { ranksPanel, type RanksActions } from './ranksPanel';
import { clubPanel, type ClubHost, type ClubPanel } from './clubPanel';
import { mafiaPanel, type MafiaHost, type MafiaPanel } from './mafiaPanel';
import { swapView } from './sheets';
import { pullToRefresh } from './pullRefresh';
import { SOCIAL, type SocialSection } from '../present/flow';
import { S } from '../present/strings';
import type { HapticID } from '../present/feedback';

export interface SocialHost {
  crew(): CrewHost;
  ranks(): RanksActions;
  club(): ClubHost;
  clubOpen(): boolean;
  mafia(): MafiaHost;
  mafiaOpen(): boolean;
  /** The ranking service is there (`VITE_API_URL`): without it Friends and Ranks have nothing to show. */
  online: boolean;
  /** Crews, friend codes and invite links are not shown inside CrazyGames. */
  crewAllowed: boolean;
  /** The player has a name and its cloud copy (`ui/accountSheet.ts`): Friends, Ranks and the Club need it. */
  accountReady(): boolean;
  /** A section that needs the player was opened without one: the host brings up "Your player". */
  needAccount(): void;
  /** A tick in the hand, when the player wants haptics. */
  feel(id: HapticID): void;
}

/**
 * What needs the player (Leo, 15.10.2026). The Mafia does not: a loan must always be repayable. The Ranks can be read
 * without one (Leo, 16.10.2026): a new player sees who plays before being asked for a name, and nothing opens by itself.
 */
const NEEDS_ACCOUNT: readonly SocialSection[] = [SOCIAL.crew, SOCIAL.club];

/** Where the page's column sits under the canvas' title and segments (`SocialPage.column`), in points. */
export interface SocialColumn {
  top: number;
  width: number;
}

/**
 * The Social tab's content (Leo, 10.10.2026): the Crew, Ranks, the Club and the Mafia as one page of the tab bar, not as drawers. The canvas draws the ground, the title
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
  private mafia: MafiaPanel | null = null;
  private clearing = 0;

  constructor(
    parent: HTMLElement,
    private readonly host: SocialHost,
  ) {
    this.el.append(this.inner);
    parent.append(this.el, this.toastEl);
    pullToRefresh(this.el, () => this.section === SOCIAL.crew || this.section === SOCIAL.ranks, () => this.refresh(), (id) => this.host.feel(id));
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
    const replace = (): void => {
      this.inner.replaceChildren(this.build(section));
      this.el.scrollTop = 0;
    };
    if (first) replace();
    else swapView(this.inner, replace);
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
      this.mafia?.dispose();
      this.mafia = null;
      this.inner.replaceChildren();
      this.el.hidden = true;
    }, 220);
  }

  /** The player was created (or not) in the sheet over the page: the section shows what it can now, without asking again. */
  refresh(): void {
    if (this.section === null) return;
    const section = this.section;
    swapView(this.inner, () => this.inner.replaceChildren(this.build(section)));
  }

  private build(section: SocialSection): HTMLElement {
    this.club?.dispose();
    this.club = null;
    this.mafia?.dispose();
    this.mafia = null;
    if (this.host.online && NEEDS_ACCOUNT.includes(section) && !this.host.accountReady()) {
      return h(
        'div',
        { class: 'account-gate' },
        h('p', { class: 'section-note' }, S.account.gate),
        h('button', { class: 'btn primary block', type: 'button', onclick: () => this.host.needAccount() }, S.account.gateButton),
      );
    }
    if (section === SOCIAL.crew) return this.host.crewAllowed ? crewPanel(this.host.crew()) : h('p', { class: 'section-note' }, this.host.online ? S.social.noCrew : S.social.offline);
    if (section === SOCIAL.ranks) return this.host.online ? ranksPanel(this.host.ranks()) : h('p', { class: 'section-note' }, S.social.offline);
    if (section === SOCIAL.mafia) {
      if (!this.host.mafiaOpen()) return h('p', { class: 'section-note' }, S.social.mafiaClosed);
      this.mafia = mafiaPanel(this.host.mafia());
      return this.mafia.el;
    }
    if (!this.host.clubOpen()) return h('p', { class: 'section-note' }, S.social.clubClosed);
    this.club = clubPanel(this.host.club());
    return this.club.el;
  }
}
