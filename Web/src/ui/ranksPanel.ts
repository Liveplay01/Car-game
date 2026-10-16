import { h } from './dom';
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
  deleteAccount,
  describeError,
  fetchBoard,
  fetchFriendsBoard,
  loadAccount,
  syncScores,
} from '../net/leaderboard';
import { pendingInvite } from '../net/invite';
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
 * progress. Everyone or friends only (Leo, 10.10.2026: the Friends page's own ranking is this one), Shift level, Unlimited, Daily and Boss Rush, the top 50
 * and your own place. Scores are sent by the game on its own (`syncScores` on every save); this page only shows them.
 */

export interface RanksActions {
  /** The records as the save has them now, sent right after joining. */
  records(): Records;
  /** "Your player" (`ui/accountSheet.ts`): the boards are open to read, joining them is the player's own step. */
  createPlayer(): void;
}

const BOARDS: { id: BoardId; label: string; empty: string }[] = (['shift-level', 'unlimited', 'daily', 'rush', 'casino'] as const).map((id) => ({ id, ...S.ranks.boards[id] }));

/** The last list of each board: shown at once when the sheet opens again, then refreshed. */
const cache = new Map<string, BoardView>();
/** The Daily keeps one list per day: yesterday's must not stand in for today's after midnight (an open tab, a phone asleep). */
const cacheKey = (scope: Scope, board: BoardId): string => `${scope}:${board}${board === 'daily' ? `:${dayNumber()}` : ''}`;
let lastBoard: BoardId = 'shift-level';
/** Everyone, or only you and the friends whose codes you added. */
type Scope = 'all' | 'friends';

/** The number a line stands for: the level (with its Prestige rank) or the Unlimited score. */
/** The star's look by rank: silver, gold, iris, then ember (★4), prism (★10) and eternal (★20). */
const starTier = (rank: number): number => (rank >= 20 ? 6 : rank >= 10 ? 5 : rank >= 4 ? 4 : Math.max(1, rank));

function valueOf(board: BoardId, e: { score: number; meta: Record<string, number> }, onStar: () => void): (string | HTMLElement)[] {
  if (board === 'unlimited' || board === 'daily') return [Fmt.number(e.score)];
  if (board === 'casino') return [
    ...(e.score < 0 ? ['−'] : []),
    h('span', { class: 'coin', 'aria-label': S.clubPanel.money }),
    Fmt.number(Math.abs(e.score)),
  ];
  if (board === 'rush') return [S.rush.time((e.meta.cs ?? 0) / 100)];
  const level = S.ranks.level(Fmt.number(e.meta.level ?? e.score % 1000));
  const prestige = e.meta.prestige ?? Math.floor(e.score / 1000);
  return prestige > 0 ? [prestigeStar(prestige, onStar), level] : [level];
}

/**
 * The Prestige star: a star with the rank inside, a slow glint across it (not under Reduce
 * Motion). A tap on it explains the system (`onTap`).
 */
export function prestigeStar(rank: number, onTap: () => void): HTMLElement {
  return h(
    'button',
    { class: `prestige-star tier-${starTier(rank)}`, type: 'button', 'aria-label': S.ranks.starLabel(rank), onclick: onTap },
    h('span', { class: 'prestige-star-rank', 'aria-hidden': 'true' }, String(rank)),
  );
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
  return [titleName(e.title), tier ? S.modes.tier(tier) : null, board === 'daily' && e.meta.tries === 2 ? S.ranks.secondTry : null].filter(Boolean).join(' · ');
}

function entryRow(board: BoardId, e: BoardEntry | (Omit<BoardEntry, 'name'> & { name: string }), onStar: () => void): HTMLElement {
  return h(
    'div',
    { class: `row board-row${e.me ? ' me' : ''}${e.rank <= 3 ? ' podium' : ''}`, role: 'listitem' },
    h('span', { class: 'board-rank', 'aria-label': S.ranks.rankLabel(e.rank) }, Fmt.number(e.rank)),
    h(
      'div',
      { class: 'row-main' },
      h('div', { class: 'row-title board-name' }, h('span', {}, e.name), e.me ? h('span', { class: 'you-tag' }, S.ranks.you) : null),
      boardSub(board, e) ? h('div', { class: 'row-sub board-title' }, boardSub(board, e)) : null,
    ),
    h('span', { class: `row-value board-value${board === 'casino' && e.score < 0 ? ' loss' : ''}` }, ...valueOf(board, e, onStar)),
  );
}

/** The name of a title the service sent, or null for none (or one this version of the game does not know). */
function titleName(id: string | null | undefined): string | null {
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

/** The friends boards are stale after the list changed (the Friends page adds and removes people). */
export function forgetFriendsBoards(): void {
  for (const b of BOARDS) cache.delete(cacheKey('friends', b.id));
}

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
}

/**
 * The board tabs (Shift level, Unlimited, Daily, Boss Rush) with their list, for everyone or for the
 * friends only. The leaderboard sheet shows the first, the Friends page the second.
 */
export function boardPanel(scope: Scope, host: BoardHost): BoardPanel {
  // The Casino board shows once the Casino is reached (`Records.casinoProfit`), like the Casino itself.
  const boards = BOARDS.filter((b) => b.id !== 'casino' || host.records().casinoProfit !== null);
  let board: BoardId = boards.some((b) => b.id === lastBoard) ? lastBoard : 'shift-level';
  /** Which request's answer may still be shown: a newer one (another board) wins. */
  let asked = 0;
  const list = h('div', { class: 'list board-list', role: 'list', 'aria-label': scope === 'friends' ? S.ranks.listFriends : S.ranks.list, 'aria-busy': 'false' });
  const tabs = tabsControl(S.ranks.boardsLabel, boards, choose);
  const el = h('div', { class: 'board' }, tabs.el, list);

  function choose(next: BoardId): void {
    board = next;
    lastBoard = next;
    tabs.set(next);
    void load();
  }

  function showList(view: BoardView): void {
    const account = host.account();
    // The top 50 and nothing more (the friends board has no limit of its own); your place follows when it is further down.
    const top = view.entries.slice(0, BOARD_TOP);
    const rows = top.map((e) => entryRow(board, e, openInfo));
    if (view.me && account && !top.some((e) => e.me)) {
      rows.push(h('div', { class: 'row board-gap', 'aria-hidden': 'true' }, '···'));
      rows.push(entryRow(board, { rank: view.me.rank, name: account.name, title: host.records().title, score: view.me.score, meta: view.me.meta, me: true }, openInfo));
    }
    if (rows.length === 0) {
      const empty = scope === 'friends' ? S.ranks.addFriend : (BOARDS.find((b) => b.id === board)?.empty ?? '');
      rows.push(h('div', { class: 'row board-empty' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, S.ranks.nobody), h('div', { class: 'row-sub' }, empty))));
    }
    const arriving = list.getAttribute('aria-busy') === 'true';
    list.replaceChildren(...rows);
    list.setAttribute('aria-busy', 'false');
    if (arriving) fadeIn(list);
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
      const view = scope === 'friends' ? await fetchFriendsBoard(board) : await fetchBoard(board);
      cache.set(key, view);
      if (ticket === asked) showList(view);
    } catch (error) {
      if (ticket !== asked) return;
      // A list already on screen stays; only without one the sheet says what happened.
      if (cached) return;
      list.setAttribute('aria-busy', 'false');
      list.replaceChildren(
        h(
          'div',
          { class: 'row board-empty' },
          h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, S.ranks.unavailable), h('div', { class: 'row-sub' }, describeError(error))),
          h('button', { class: 'btn', type: 'button', onclick: () => void load() }, S.ranks.tryAgain),
        ),
      );
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

const SCOPES: { id: Scope; label: string }[] = [
  { id: 'all', label: S.ranks.scopes.all },
  { id: 'friends', label: S.ranks.scopes.friends },
];
let lastScope: Scope = 'all';

export function ranksPanel(actions: RanksActions): HTMLElement {
  let account: Account | null = loadAccount();
  let scope: Scope = lastScope;

  const top = h('div', { class: 'board-top' });
  const footer = h('div', { class: 'board-footer' });
  const host: BoardHost = {
    account: () => account,
    records: actions.records,
    signedOut: () => {
      account = null;
      renderTop();
    },
  };
  const boards = { all: boardPanel('all', host), friends: boardPanel('friends', host) };
  const shown = (): BoardPanel => boards[scope];
  const scopes = tabsControl(S.ranks.scopeLabel, SCOPES, (next) => {
    scope = next;
    lastScope = next;
    scopes.set(next);
    swapView(view, () => view.replaceChildren(shown().el));
    shown().open();
  });
  scopes.set(scope);
  const view = h('div', { class: 'board-view' }, shown().el);

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
    const me = account;
    const remove = h('button', { class: 'btn block destructive', type: 'button' }, S.ranks.remove);
    let armed = false;
    remove.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        remove.textContent = S.ranks.removeAgain;
        window.setTimeout(() => {
          if (!remove.isConnected) return;
          armed = false;
          remove.textContent = S.ranks.remove;
        }, 3000);
        return;
      }
      remove.disabled = true;
      deleteAccount(me)
        .then(() => {
          account = null;
          cache.clear();
          renderTop();
          shown().open();
        })
        .catch((error: unknown) => {
          remove.disabled = false;
          armed = false;
          remove.textContent = S.ranks.remove;
          footer.querySelector('.field-help')?.remove();
          footer.append(h('p', { class: 'field-help error', role: 'alert' }, describeError(error)));
        });
    });
    footer.replaceChildren(
      h(
        'div',
        { class: 'list' },
        h(
          'div',
          { class: 'row' },
          h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, me.name), h('div', { class: 'row-sub' }, `${S.ranks.nameSub} ${S.account.nameWhere(`${S.settings.title} → ${S.settings.tabs.account}`)}`)),
        ),
      ),
      remove,
    );
  }


  renderTop();
  shown().open();
  return h('div', { class: 'board' }, top, scopes.el, view, footer);
}
