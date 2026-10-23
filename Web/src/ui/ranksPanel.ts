import { h, animatedIcon, coinMark } from './dom';
import { fadeIn, swapView } from './sheets';
import { tabsControl } from './tabs';
import {
  type Account,
  type BoardEntry,
  type BoardId,
  type BoardView,
  type Records,
  BOARD_TOP,
  createAccount,
  describeError,
  fetchBoard,
  loadAccount,
  syncScores,
} from '../net/leaderboard';
import { pendingInvite } from '../net/invite';
import { fetchCrewBoard, hasCrew } from '../net/crews';
import { NAME_MAX } from '../net/room';
import { savePlayerName } from '../storage/profile';
import { Fmt, S } from '../present/strings';
import { baseConfig, INVITE_LEVEL } from '../core/config';
import { dayNumber } from '../core/daily';
import { TITLES, type TitleId } from '../core/elite';
import { tierOf } from '../core/tiers';

/**
 * Social → Ranks: the leaderboards (the Progress tab's rank chip leads here). No sign-up (Leo, 30.09.2026): the player only
 * enters a name (the same one as in multiplayer), and the records come from this device's
 * progress. Everyone or friends only (Leo, 10.10.2026: the Friends page's own ranking is this one), Shift level, Unlimited, Daily and Casino, the top 50
 * and your own place. Scores are sent by the game on its own (`syncScores` on every save); this page only shows them.
 */

export interface RanksActions {
  /** The records as the save has them now, sent right after joining. */
  records(): Records;
  /** "Your player" (`ui/accountSheet.ts`): the boards are open to read, joining them is the player's own step. */
  createPlayer(): void;
  /** Social → Crew: where a crew is joined, for the empty crew board. */
  openCrew(): void;
  play(mode: 'shift' | 'unlimited'): void;
}

const BOARDS: { id: BoardId; label: string; empty: string }[] = (['shift-level', 'unlimited', 'daily', 'casino'] as const).map((id) => ({ id, ...S.ranks.boards[id] }));

/** The last list of each board: shown at once when the sheet opens again, then refreshed. */
const cache = new Map<string, BoardView>();
/** The Daily keeps one list per day: yesterday's must not stand in for today's after midnight (an open tab, a phone asleep). */
const cacheKey = (scope: Scope, board: BoardId): string => `${scope}:${board}${board === 'daily' ? `:${dayNumber()}` : ''}`;
let lastBoard: BoardId = 'shift-level';

/**
 * Your place on each board when you last saw it, across visits (a look, not progress). A better place on the next look
 * is shown as overtaking: your line slides up past the ones you passed, and they drop back one place each.
 */
const SEEN_KEY = 'carGame.ranksSeen.v1';
const OVERTAKE_ROWS = 6;

function seenRanks(): Record<string, number> {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}');
    return raw && typeof raw === 'object' ? (raw as Record<string, number>) : {};
  } catch {
    return {};
  }
}

const myRank = (view: BoardView): number | null => view.entries.find((e) => e.me)?.rank ?? view.me?.rank ?? null;

/** Slides your line up from where it stood, the passed ones down into place. Only inside the top list, at most a few lines. */
function overtake(list: HTMLElement, from: number, to: number): void {
  const still = document.querySelector('.app.reduce-motion') !== null || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const me = list.querySelector<HTMLElement>('.board-row.me');
  if (still || !me || me.previousElementSibling?.classList.contains('board-gap')) return;
  const passed: HTMLElement[] = [];
  for (let next = me.nextElementSibling; next instanceof HTMLElement && next.classList.contains('board-row') && passed.length < Math.min(from - to, OVERTAKE_ROWS); next = next.nextElementSibling) passed.push(next);
  if (passed.length === 0) return;
  const step = me.offsetHeight;
  const timing = { duration: 720, delay: 240, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', fill: 'backwards' } as const;
  me.classList.add('overtaking');
  me.animate([{ transform: `translateY(${passed.length * step}px)` }, { transform: 'none' }], timing).finished.then(
    () => me.classList.remove('overtaking'),
    () => me.classList.remove('overtaking'),
  );
  for (const row of passed) row.animate([{ transform: `translateY(${-step}px)` }, { transform: 'none' }], timing);
}
/** Everyone, or only you and the friends whose codes you added. */
type Scope = 'all' | 'crew';

/** The number a line stands for: the level (with its Prestige rank) or the Unlimited score. */
/**
 * The star's colours by rank (Leo, 22.10.2026: a colour for every rank): silver, gold, iris as before, then a new
 * gradient up to ★10; ★11–19 walk round the colour wheel, from ★20 the eternal star runs through three colours.
 */
const STAR_COLORS: readonly (readonly string[])[] = [
  ['#F7F9FC', '#A3ACBB'],
  ['#FFE89A', '#E09A12'],
  ['#FFD36E', '#C15CFF'],
  ['#FFC78A', '#FF4F2E'],
  ['#FFC6DD', '#EC3F7C'],
  ['#B8FFF1', '#11A99A'],
  ['#C2E6FF', '#2C74FF'],
  ['#E6CCFF', '#7A36FF'],
  ['#FFB8AC', '#C8143F'],
  ['#FFE08A', '#FF62B8', '#6F9BFF'],
];
const starColors = (rank: number): readonly string[] => {
  if (rank >= 20) return ['#FFF4D6', '#FF62B8', '#7C4DFF'];
  if (rank > STAR_COLORS.length) {
    const hue = ((rank - 10) * 37) % 360;
    return [`hsl(${hue} 100% 82%)`, `hsl(${(hue + 48) % 360} 88% 52%)`];
  }
  return STAR_COLORS[Math.max(1, rank) - 1];
};

/** The five points with soft tips: the outline is stroked in its own gradient with round joins. */
const STAR_POINTS = Array.from({ length: 10 }, (_, i) => {
  const angle = -Math.PI / 2 + (i * Math.PI) / 5;
  const r = i % 2 === 0 ? 13 : 6.4;
  return `${(16 + Math.cos(angle) * r).toFixed(2)},${(17 + Math.sin(angle) * r).toFixed(2)}`;
}).join(' ');
let starCount = 0;

function valueOf(board: BoardId, e: { score: number; meta: Record<string, number> }, onStar: () => void): (string | Element)[] {
  if (board === 'unlimited' || board === 'daily') return [Fmt.number(e.score)];
  if (board === 'casino') return [
    ...(e.score < 0 ? ['−'] : []),
    coinMark(S.clubPanel.money),
    Fmt.number(Math.abs(e.score)),
  ];
  if (board === 'rush') return [S.rush.time((e.meta.cs ?? 0) / 100)];
  const level = S.ranks.level(Fmt.number(e.meta.level ?? e.score % 1000));
  const prestige = e.meta.prestige ?? Math.floor(e.score / 1000);
  return prestige > 0 ? [prestigeStar(prestige, onStar), level] : [level];
}

/**
 * The Prestige star: a soft star in its rank's gradient with the rank inside, in the animated icons' way
 * (`ui/animatedIcons.ts`): a slow glint runs over it, and under the cursor or a finger it pops, tilts and sparkles
 * (`.ai-pstar`, `shell.css`). A tap on it explains the system (`onTap`).
 */
export function prestigeStar(rank: number, onTap: () => void): HTMLElement {
  const id = `aiPstar${++starCount}`;
  const colors = starColors(rank);
  const stops = colors.map((c, i) => `<stop offset="${i / (colors.length - 1)}" stop-color="${c}"/>`).join('');
  const label = String(rank);
  const star = h('span', {
    class: 'prestige-star-art',
    'aria-hidden': 'true',
    html:
      `<svg class="ai ai-pstar" viewBox="0 0 32 32" width="32" height="32" overflow="visible">` +
      `<defs><linearGradient id="${id}G" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient>` +
      `<clipPath id="${id}C"><polygon points="${STAR_POINTS}" stroke-width="3"/></clipPath></defs>` +
      `<g class="body"><polygon points="${STAR_POINTS}" fill="url(#${id}G)" stroke="url(#${id}G)" stroke-width="3" stroke-linejoin="round"/>` +
      `<polygon points="${STAR_POINTS}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1" stroke-linejoin="round" transform="translate(16 17) scale(.82) translate(-16 -17)"/>` +
      `<g clip-path="url(#${id}C)"><g transform="rotate(25 16 16)"><rect class="glint" x="-10" y="-6" width="5" height="44" fill="#fff"/></g></g>` +
      `<text class="num" x="16" y="18.2" text-anchor="middle" dominant-baseline="middle" font-size="${label.length > 1 ? 9 : 11}">${label}</text></g>` +
      `<path class="spark s1" fill="#FFF6D8" d="M27 2.6l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>` +
      `<path class="spark s2" fill="#FFF6D8" d="M4.4 21.2l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z"/></svg>`,
  });
  return h('button', { class: 'prestige-star', type: 'button', 'aria-label': S.ranks.starLabel(rank), onclick: onTap }, star);
}

/** What Prestige is, in the numbers the game really uses. */
function prestigeInfo(back: () => void): HTMLElement {
  const row = (title: string, sub: string): HTMLElement => h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), h('div', { class: 'row-sub' }, sub)));
  const { prestigeLevel, prestigeHeadStart, maxPrestigeHeadStart } = baseConfig;
  return h(
    'div',
    { class: 'board prestige-info' },
    h('button', { class: 'btn quiet-btn', type: 'button', onclick: back }, S.ranks.back),
    h('p', { class: 'section-note' }, S.ranks.starIntro(prestigeLevel)),
    h(
      'div',
      { class: 'list' },
      row(S.ranks.opensAt(prestigeLevel), S.ranks.opensSub),
      row(S.ranks.backTo1, S.ranks.backTo1Sub),
      row(S.ranks.harder(prestigeHeadStart), S.ranks.harderSub(prestigeHeadStart, maxPrestigeHeadStart, Math.ceil(maxPrestigeHeadStart / prestigeHeadStart))),
      row(S.ranks.show, S.ranks.showSub),
      row(S.ranks.onBoard, S.ranks.onBoardSub),
    ),
  );
}

/** The line under a name: the title, on the Unlimited board the tier the run reached, on the Daily board a second try. */
function boardSub(board: BoardId, e: { title: string | null; meta: Record<string, number> }): string {
  const tier = board === 'unlimited' ? tierOf(e.meta.cars ?? 0) : null;
  return [titleName(e.title), tier ? S.modes.tier(tier) : null, board === 'daily' && e.meta.tries === 2 ? S.ranks.secondTry : null, board === 'unlimited' && e.meta.revived === 1 ? S.ranks.revived : null].filter(Boolean).join(' · ');
}

function entryRow(board: BoardId, e: BoardEntry | (Omit<BoardEntry, 'name'> & { name: string }), onStar: () => void): HTMLElement {
  return h(
    'div',
    { class: `row board-row${e.me ? ' me' : ''}${e.rank <= 3 ? ' podium' : ''}`, role: 'listitem' },
    h('span', { class: 'board-rank', 'aria-label': S.ranks.rankLabel(e.rank) }, Fmt.number(e.rank)),
    h(
      'div',
      { class: 'row-main' },
      h('div', { class: 'row-title board-name' }, h('span', { class: 'plate' }, e.name), e.me ? h('span', { class: 'you-tag' }, S.ranks.you) : null),
      boardSub(board, e) ? h('div', { class: 'row-sub board-title' }, boardSub(board, e)) : null,
    ),
    h('span', { class: `row-value board-value${board === 'casino' && e.score < 0 ? ' loss' : ''}${board === 'shift-level' ? ' level-value' : ''}` }, ...valueOf(board, e, onStar)),
  );
}

/** The name of a title the service sent, or null for none (or one this version of the game does not know). */
export function titleName(id: string | null | undefined): string | null {
  if (id === 'mafia') return S.mafia.badge;
  return id && TITLES.includes(id as TitleId) ? S.titles.name(id as TitleId) : null;
}

/** Grey lines where the list will be, so the sheet does not jump when it arrives. */
function skeleton(): HTMLElement[] {
  return Array.from({ length: 8 }, (_, i) =>
    h('div', { class: 'row board-row skeleton', 'aria-hidden': 'true' }, h('span', { class: 'bone rank' }), h('span', { class: 'bone name', style: `width:${38 + ((i * 17) % 30)}%` }), h('span', { class: 'bone value' })),
  );
}

/**
 * A name field with its button, for joining and for renaming. Returns the form; `submit` gets
 * the name and says what went wrong (a sentence) or null when it worked.
 */
export function nameForm(value: string, action: string, submit: (name: string) => Promise<string | null>, cancel: (() => void) | null): HTMLElement {
  const input = h('input', {
    class: 'text-input',
    type: 'text',
    name: 'name',
    maxlength: String(NAME_MAX),
    minlength: '3',
    autocomplete: 'nickname',
    autocapitalize: 'words',
    spellcheck: 'false',
    enterkeyhint: 'go',
    placeholder: S.ranks.namePlaceholder,
    'aria-label': S.ranks.namePlaceholder,
    'aria-describedby': 'board-name-help',
    value,
  });
  const button = h('button', { class: 'btn primary', type: 'submit' }, action);
  const help = h('p', { class: 'field-help', id: 'board-name-help', 'aria-live': 'polite' }, S.ranks.nameHelp(NAME_MAX));
  const setBusy = (busy: boolean): void => {
    button.disabled = busy;
    input.readOnly = busy;
    button.classList.toggle('busy', busy);
  };
  const form = h(
    'form',
    {
      class: 'board-form',
      novalidate: true,
      onsubmit: (e: Event) => {
        e.preventDefault();
        const name = input.value.trim().replace(/\s+/g, ' ');
        if (name.length < 3) {
          help.textContent = S.ranks.nameShort;
          help.classList.add('error');
          input.setAttribute('aria-invalid', 'true');
          input.focus();
          return;
        }
        setBusy(true);
        void submit(name).then((problem) => {
          if (!form.isConnected) return;
          setBusy(false);
          if (problem === null) return;
          help.textContent = problem;
          help.classList.add('error');
          input.setAttribute('aria-invalid', 'true');
          input.focus();
          input.select();
        });
      },
    },
    h('div', { class: 'join-row' }, input, button),
    help,
  );
  input.addEventListener('input', () => {
    if (!help.classList.contains('error')) return;
    help.classList.remove('error');
    input.removeAttribute('aria-invalid');
    help.textContent = S.ranks.nameHelp(NAME_MAX);
  });
  if (cancel) form.append(h('button', { class: 'btn block quiet-btn', type: 'button', onclick: cancel }, S.ranks.cancel));
  return form;
}

/** The account is gone (removed in Settings): no list may show its line. */
export const forgetBoards = (): void => cache.clear();

/** Opens the account under `name` (also the multiplayer name). Throws like `createAccount`; the lists are stale after. */
export async function openAccount(name: string): Promise<Account> {
  const account = await createAccount(name);
  savePlayerName(account.name);
  cache.clear();
  return account;
}

export interface BoardPanel {
  el: HTMLElement;
  /** Shows the list (from the cache at once) and refreshes it. */
  open(): void;
}

export interface BoardHost {
  account(): Account | null;
  /** The records as the save has them now: your own line shows your title. */
  records(): Records;
  /** The service no longer knew the token: the host asks for a name again. */
  signedOut?(): void;
  openCrew(): void;
  /** The Game tab on that mode: an empty board leads to where its first score is made. */
  play(mode: 'shift' | 'unlimited'): void;
}

/** Where a board's first score is made; the Casino has its own way there (Shop). */
const PLAY_FOR: Partial<Record<BoardId, 'shift' | 'unlimited'>> = { 'shift-level': 'shift', daily: 'shift', unlimited: 'unlimited' };

/**
 * The board tabs (Shift level, Unlimited, Daily, Casino) with their list, for everyone or for the
 * friends only. The leaderboard sheet shows the first, the Friends page the second.
 */
export function boardPanel(scope: Scope, host: BoardHost): BoardPanel {
  const boards = BOARDS;
  let board: BoardId = boards.some((b) => b.id === lastBoard) ? lastBoard : 'shift-level';
  /** Which request's answer may still be shown: a newer one (another board) wins. */
  let asked = 0;
  const list = h('div', { class: 'list board-list', role: 'list', 'aria-label': scope === 'crew' ? S.ranks.listCrew : S.ranks.list, 'aria-busy': 'false' });
  const tabs = tabsControl(S.ranks.boardsLabel, boards, choose);
  const el = h('div', { class: 'board' }, tabs.el, list);

  function choose(next: BoardId): void {
    board = next;
    lastBoard = next;
    tabs.set(next);
    void load();
  }

  function showList(view: BoardView, before: number | null = null): void {
    const account = host.account();
    // The top 50 and nothing more (the friends board has no limit of its own); your place follows when it is further down.
    const top = view.entries.slice(0, BOARD_TOP);
    const rows = top.map((e) => entryRow(board, e, openInfo));
    if (view.me && account && !top.some((e) => e.me)) {
      rows.push(h('div', { class: 'row board-gap', 'aria-hidden': 'true' }, '···'));
      rows.push(entryRow(board, { rank: view.me.rank, name: account.name, title: host.records().title, score: view.me.score, meta: view.me.meta, me: true }, openInfo));
    }
    if (rows.length === 0) {
      const empty = scope === 'crew' ? S.ranks.noCrew : (BOARDS.find((b) => b.id === board)?.empty ?? '');
      // An empty board leads to where it fills (a crew, the mode), instead of only naming it.
      const mode = PLAY_FOR[board];
      const go =
        scope === 'crew'
          ? h('button', { class: 'btn', type: 'button', onclick: () => host.openCrew() }, S.ranks.openCrew)
          : mode
            ? h('button', { class: 'btn', type: 'button', onclick: () => host.play(mode) }, S.ranks.playNow)
            : null;
      rows.push(h('div', { class: 'row board-empty' }, h('span', { class: 'empty-sign' }, animatedIcon('deadEnd')), h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, S.ranks.nobody), h('div', { class: 'row-sub' }, empty)), go));
    }
    const arriving = list.getAttribute('aria-busy') === 'true';
    list.replaceChildren(...rows);
    list.setAttribute('aria-busy', 'false');
    if (arriving) fadeIn(list);
    const now = myRank(view);
    if (now === null) return;
    if (before !== null && now < before) overtake(list, before, now);
    const seen = seenRanks();
    seen[cacheKey(scope, board)] = now;
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    } catch {
      /* blocked storage: no overtaking next time */
    }
  }

  async function load(): Promise<void> {
    const ticket = ++asked;
    const key = cacheKey(scope, board);
    const cached = cache.get(key);
    fadeIn(list);
    if (cached) showList(cached);
    else {
      list.replaceChildren(...skeleton());
      list.setAttribute('aria-busy', 'true');
    }
    try {
      // Fresh on every open: a score still on its way goes up first, so your own line is never a shift behind.
      await syncScores(host.records());
      const view = scope === 'crew' ? await fetchCrewBoard(board) : await fetchBoard(board);
      cache.set(key, view);
      if (ticket === asked) showList(view, seenRanks()[key] ?? null);
    } catch (error) {
      if (ticket !== asked) return;
      // A list already on screen stays, marked as not up to date; without one the sheet says what happened.
      const problem = h(
        'div',
        { class: 'row board-empty', role: 'status' },
        h('span', { class: 'empty-sign' }, animatedIcon('warning')),
        h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, cached ? S.ranks.stale : S.ranks.unavailable), h('div', { class: 'row-sub' }, describeError(error))),
        h('button', { class: 'btn', type: 'button', onclick: () => void load() }, S.ranks.tryAgain),
      );
      list.setAttribute('aria-busy', 'false');
      if (cached) list.prepend(problem);
      else list.replaceChildren(problem);
      // Back online: it tries again by itself.
      window.addEventListener('online', () => list.isConnected && ticket === asked && void load(), { once: true });
    }
    if (host.account() && !loadAccount()) host.signedOut?.();
  }

  /** The star's explanation replaces the list inside the panel; Back brings the list as it was. */
  function openInfo(): void {
    const info = prestigeInfo(() => {
      el.replaceChildren(tabs.el, list);
      el.querySelector<HTMLElement>('.prestige-star')?.focus({ preventScroll: true });
    });
    el.replaceChildren(info);
    info.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
  }

  return { el, open: () => choose(board) };
}

let lastScope: Scope = 'all';

export function ranksPanel(actions: RanksActions): HTMLElement {
  let account: Account | null = loadAccount();
  let scope: Scope = hasCrew() ? lastScope : 'all';

  const top = h('div', { class: 'board-top' });
  const footer = h('div', { class: 'board-footer' });
  const host: BoardHost = {
    account: () => account,
    records: actions.records,
    openCrew: actions.openCrew,
    play: actions.play,
    signedOut: () => {
      account = null;
      renderTop();
    },
  };
  const boards = { all: boardPanel('all', host), crew: boardPanel('crew', host) };
  const shown = (): BoardPanel => boards[scope];
  // A filter, not a second set of tabs: it sits under the board tabs of whichever list shows.
  const crewOnly = hasCrew() ? h('button', { class: 'chip', type: 'button', 'aria-pressed': String(scope === 'crew') }, S.ranks.crewOnly) : null;
  const place = (): void => { if (crewOnly) shown().el.firstElementChild?.after(crewOnly); };
  crewOnly?.addEventListener('click', () => {
    scope = scope === 'crew' ? 'all' : 'crew';
    lastScope = scope;
    crewOnly.setAttribute('aria-pressed', String(scope === 'crew'));
    swapView(view, () => {
      view.replaceChildren(shown().el);
      place();
    });
    shown().open();
  });
  const view = h('div', { class: 'board-view' }, shown().el);
  place();

  /** Above the tabs: the name form while the player is not on the leaderboard yet. */
  function renderTop(): void {
    if (account) {
      top.replaceChildren();
      renderFooter();
      return;
    }
    top.replaceChildren(
      h(
        'p',
        { class: 'section-note board-intro' },
        pendingInvite() ? S.ranks.introInvited(INVITE_LEVEL) : S.ranks.intro,
      ),
      h('button', { class: 'btn primary block', type: 'button', onclick: () => actions.createPlayer() }, S.account.gateButton),
    );
    renderFooter();
  }

  /** Below the list: your name (the multiplayer name too) and the way off the leaderboard. */
  function renderFooter(): void {
    if (!account) {
      footer.replaceChildren(h('p', { class: 'section-note' }, S.ranks.noSignUp));
      return;
    }
    footer.replaceChildren(
      h(
        'div',
        { class: 'list' },
        // One place for the player: the row opens it, instead of pointing to Settings → Account.
        h(
          'button',
          { class: 'row row-link', type: 'button', onclick: () => actions.createPlayer() },
          h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, account.name), h('div', { class: 'row-sub' }, S.ranks.nameSub)),
          animatedIcon('chevronRight'),
        ),
      ),
    );
  }

  renderTop();
  shown().open();
  return h('div', { class: 'board' }, top, view, footer);
}
