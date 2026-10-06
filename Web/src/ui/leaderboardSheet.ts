import { h } from './dom';
import { openSheet, glideHeight } from './sheets';
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
  renameAccount,
  syncScores,
} from '../net/leaderboard';
import { pendingInvite } from '../net/invite';
import { NAME_MAX } from '../net/room';
import { loadPlayerName, savePlayerName } from '../storage/profile';
import { Fmt, S } from '../present/strings';
import { baseConfig, INVITE_LEVEL } from '../core/config';
import { TITLES, type TitleId } from '../core/elite';
import { tierOf } from '../core/tiers';

/**
 * Progress → the rank chip: the leaderboards. No sign-up (Leo, 30.09.2026): the player only
 * enters a name (the same one as in multiplayer), and the records come from this device's
 * progress. Switch between Shift level and Unlimited, see the top 50 and your own place. Scores are sent by the game on its own (`syncScores` on every save); this sheet only
 * shows them.
 */

export interface LeaderboardActions {
  /** The records as the save has them now, sent right after joining. */
  records(): Records;
  /** The Friends sheet: your friend code, the invite link, adding and removing friends. */
  openFriends(): void;
  closed(): void;
}

const BOARDS: { id: BoardId; label: string; empty: string }[] = [
  { id: 'shift-level', label: 'Shift level', empty: 'Clear a shift to be the first one here.' },
  { id: 'unlimited', label: 'Unlimited', empty: 'Set an Unlimited record to be the first one here.' },
  { id: 'daily', label: 'Daily', empty: 'Clear today’s Daily Shift to be the first one here.' },
  { id: 'rush', label: 'Boss Rush', empty: 'Clear a Boss Rush to set the first time.' },
];

/** The last list of each board: shown at once when the sheet opens again, then refreshed. */
const cache = new Map<string, BoardView>();
let lastBoard: BoardId = 'shift-level';
/** Everyone, or only you and the friends whose codes you added. */
type Scope = 'all' | 'friends';

/** The number a line stands for: the level (with its Prestige rank) or the Unlimited score. */
/** The star's look by rank: silver, gold, iris, then ember (★4), prism (★10) and eternal (★20). */
const starTier = (rank: number): number => (rank >= 20 ? 6 : rank >= 10 ? 5 : rank >= 4 ? 4 : Math.max(1, rank));

function valueOf(board: BoardId, e: { score: number; meta: Record<string, number> }, onStar: () => void): (string | HTMLElement)[] {
  if (board === 'unlimited' || board === 'daily') return [Fmt.number(e.score)];
  if (board === 'rush') return [S.rush.time((e.meta.cs ?? 0) / 100)];
  const level = `Level ${Fmt.number(e.meta.level ?? e.score % 1000)}`;
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
    { class: `prestige-star tier-${starTier(rank)}`, type: 'button', 'aria-label': `Prestige rank ${rank}. How Prestige works`, onclick: onTap },
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
    h('button', { class: 'btn quiet-btn', type: 'button', onclick: back }, '‹ Back to the leaderboard'),
    h('p', { class: 'section-note' }, 'The star before a level is the Prestige rank: how many times that player started over after Level ' + prestigeLevel + '.'),
    h(
      'div',
      { class: 'list' },
      row(`Level ${prestigeLevel} opens it`, 'Progress → Records → Elite. The button asks twice.'),
      row('Back to Level 1', 'Money, upgrades, roads, your collection and the Elite track stay. Best times start over.'),
      row(`Harder traffic: +${prestigeHeadStart} levels per rank`, `From ★1 the road plays ${prestigeHeadStart} levels harder, at most +${maxPrestigeHeadStart} levels (from ★${Math.ceil(maxPrestigeHeadStart / prestigeHeadStart)}).`),
      row('Only for show', 'Silver, Gold and Iris Star skins at ★1 to ★3, the Star Driver title at ★3 and a plaque in the Hall of Fame. Never a bonus on the road.'),
      row('On this leaderboard', 'Shift level ranks the Prestige rank first, then the level. Unlimited ignores it.'),
    ),
  );
}

/** The line under a name: the title, and on the Unlimited board the tier the run reached. */
function boardSub(board: BoardId, e: { title: string | null; meta: Record<string, number> }): string {
  const tier = board === 'unlimited' ? tierOf(e.meta.cars ?? 0) : null;
  return [titleName(e.title), tier ? S.modes.tier(tier) : null].filter(Boolean).join(' · ');
}

function entryRow(board: BoardId, e: BoardEntry | (Omit<BoardEntry, 'name'> & { name: string }), onStar: () => void): HTMLElement {
  return h(
    'div',
    { class: `row board-row${e.me ? ' me' : ''}${e.rank <= 3 ? ' podium' : ''}`, role: 'listitem' },
    h('span', { class: 'board-rank', 'aria-label': `Rank ${e.rank}` }, Fmt.number(e.rank)),
    h(
      'div',
      { class: 'row-main' },
      h('div', { class: 'row-title board-name' }, h('span', {}, e.name), e.me ? h('span', { class: 'you-tag' }, 'You') : null),
      boardSub(board, e) ? h('div', { class: 'row-sub board-title' }, boardSub(board, e)) : null,
    ),
    h('span', { class: 'row-value board-value' }, ...valueOf(board, e, onStar)),
  );
}

/** The name of a title the service sent, or null for none (or one this version of the game does not know). */
function titleName(id: string | null | undefined): string | null {
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
    placeholder: 'Your name',
    'aria-label': 'Your name',
    'aria-describedby': 'board-name-help',
    value,
  });
  const button = h('button', { class: 'btn primary', type: 'submit' }, action);
  const help = h('p', { class: 'field-help', id: 'board-name-help', 'aria-live': 'polite' }, `3–${NAME_MAX} letters or numbers. Everyone can see it.`);
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
          help.textContent = 'Use at least 3 characters.';
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
    help.textContent = `3–${NAME_MAX} letters or numbers. Everyone can see it.`;
  });
  if (cancel) form.append(h('button', { class: 'btn block quiet-btn', type: 'button', onclick: cancel }, 'Cancel'));
  return form;
}

/** The friends boards are stale after the list changed (the Friends sheet adds and removes people). */
export function forgetFriendsBoards(): void {
  for (const b of BOARDS) cache.delete(`friends:${b.id}`);
}

/** Opens the account under `name` (also the multiplayer name). Throws like `createAccount`; the lists are stale after. */
export async function openAccount(name: string): Promise<Account> {
  const account = await createAccount(name);
  savePlayerName(account.name);
  cache.clear();
  return account;
}

/** A segmented control (the one for Reduce motion in the settings): `set` moves the highlight to an item. */
export function tabsControl<T extends string>(label: string, items: { id: T; label: string }[], pick: (id: T) => void): { el: HTMLElement; set(id: T): void } {
  const el = h('div', { class: 'segmented board-tabs', role: 'group', 'aria-label': label });
  const thumb = h('span', { class: 'thumb', 'aria-hidden': 'true' });
  thumb.style.width = `calc((100% - 4px) / ${items.length})`;
  el.append(thumb);
  const buttons = items.map((item) => {
    const button = h('button', { type: 'button', 'aria-pressed': 'false', onclick: () => pick(item.id) }, item.label);
    el.append(button);
    return button;
  });
  return {
    el,
    set(id) {
      items.forEach((item, i) => {
        const on = item.id === id;
        buttons[i].setAttribute('aria-pressed', String(on));
        if (on) thumb.style.transform = `translateX(${i * 100}%)`;
      });
    },
  };
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
  let board: BoardId = lastBoard;
  /** Which request's answer may still be shown: a newer one (another board) wins. */
  let asked = 0;
  const list = h('div', { class: 'list board-list', role: 'list', 'aria-label': scope === 'friends' ? 'Ranking among friends' : 'Leaderboard', 'aria-busy': 'false' });
  const tabs = tabsControl('Boards', BOARDS, choose);
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
      const empty = scope === 'friends' ? 'Add a friend with their code to compare your records.' : (BOARDS.find((b) => b.id === board)?.empty ?? '');
      rows.push(h('div', { class: 'row board-empty' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, 'Nobody here yet'), h('div', { class: 'row-sub' }, empty))));
    }
    list.replaceChildren(...rows);
    list.setAttribute('aria-busy', 'false');
  }

  async function load(): Promise<void> {
    const ticket = ++asked;
    const key = `${scope}:${board}`;
    const cached = cache.get(key);
    if (cached) showList(cached);
    else {
      list.replaceChildren(...skeleton());
      list.setAttribute('aria-busy', 'true');
    }
    try {
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
          h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, 'Leaderboard unavailable'), h('div', { class: 'row-sub' }, describeError(error))),
          h('button', { class: 'btn', type: 'button', onclick: () => void load() }, 'Try again'),
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

export function leaderboardSheet(layer: HTMLElement, actions: LeaderboardActions): () => void {
  let account: Account | null = loadAccount();
  let renaming = false;

  const top = h('div', { class: 'board-top' });
  const footer = h('div', { class: 'board-footer' });
  const panel = boardPanel('all', {
    account: () => account,
    records: actions.records,
    signedOut: () => {
      account = null;
      renderTop();
    },
  });

  // Friends have a page of their own (`friendsSheet.ts`: code, invites, challenges, multiplayer and the ranking among them); here is only the way to it.
  const friendsPanel = h(
    'div',
    { class: 'friends-panel' },
    h(
      'div',
      { class: 'list' },
      h(
        'div',
        { class: 'row' },
        h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, 'Friends'), h('div', { class: 'row-sub' }, `Rank against them and invite more: you both get a chest when a friend reaches level ${INVITE_LEVEL}.`)),
        h('button', { class: 'btn primary', type: 'button', onclick: () => actions.openFriends() }, 'Open'),
      ),
    ),
  );

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
        pendingInvite()
          ? `A friend invited you. Enter a name, reach level ${INVITE_LEVEL} and you both get a chest. Your level and your Unlimited record come from the progress on this device.`
          : 'Enter a name to see where you rank. Your level and your Unlimited record come from the progress on this device and stay up to date by themselves.',
      ),
      nameForm(loadPlayerName(), 'Save', join, null),
    );
    renderFooter();
  }

  /** Below the list: your name (the multiplayer name too) and the way off the leaderboard. */
  function renderFooter(): void {
    if (!account) {
      footer.replaceChildren(h('p', { class: 'section-note' }, 'No sign-up: only this name and your records are sent.'));
      return;
    }
    const me = account;
    if (renaming) {
      footer.replaceChildren(
        h('p', { class: 'section-note board-label' }, 'Your name'),
        nameForm(
          me.name,
          'Save',
          async (name) => {
            if (name === me.name) return stopRenaming();
            try {
              account = await renameAccount(me, name);
              savePlayerName(account.name);
              cache.clear();
              stopRenaming();
              panel.open();
              return null;
            } catch (error) {
              account = loadAccount();
              if (!account) renderTop();
              return describeError(error);
            }
          },
          () => stopRenaming(),
        ),
      );
      footer.querySelector('input')?.focus();
      return;
    }
    const remove = h('button', { class: 'btn block destructive', type: 'button' }, 'Remove me from the leaderboard');
    let armed = false;
    remove.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        remove.textContent = 'Tap again to remove your name and scores';
        window.setTimeout(() => {
          if (!remove.isConnected) return;
          armed = false;
          remove.textContent = 'Remove me from the leaderboard';
        }, 3000);
        return;
      }
      remove.disabled = true;
      deleteAccount(me)
        .then(() => {
          account = null;
          cache.clear();
          renderTop();
          panel.open();
        })
        .catch((error: unknown) => {
          remove.disabled = false;
          armed = false;
          remove.textContent = 'Remove me from the leaderboard';
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
          h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, me.name), h('div', { class: 'row-sub' }, 'Your name on the leaderboard and in multiplayer.')),
          h('button', { class: 'btn', type: 'button', onclick: () => startRenaming() }, 'Change'),
        ),
      ),
      remove,
    );
  }

  function startRenaming(): void {
    renaming = true;
    renderFooter();
  }

  function stopRenaming(): null {
    renaming = false;
    renderFooter();
    return null;
  }

  async function join(name: string): Promise<string | null> {
    try {
      account = await openAccount(name);
      renderTop();
      // Your records go up at once, then the list shows you in it.
      await syncScores(actions.records());
      cache.clear();
      panel.open();
      return null;
    } catch (error) {
      return describeError(error);
    }
  }

  const body = h('div', { class: 'board' }, top, panel.el, friendsPanel, footer);

  renderTop();
  panel.open();
  const close = openSheet(layer, 'Leaderboard', body, actions.closed);
  glideHeight(body, panel.el);
  return close;
}
