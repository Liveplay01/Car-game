import { h } from './dom';
import { openSheet } from './sheets';
import {
  type Account,
  type BoardEntry,
  type BoardId,
  type BoardView,
  type Records,
  createAccount,
  deleteAccount,
  describeError,
  fetchBoard,
  loadAccount,
  renameAccount,
  syncScores,
} from '../net/leaderboard';
import { NAME_MAX } from '../net/room';
import { loadPlayerName, savePlayerName } from '../storage/profile';
import { S, Fmt } from '../present/strings';

/**
 * Progress → the rank chip: the leaderboards. No sign-up (Leo, 30.09.2026): the player only
 * enters a name (the same one as in multiplayer), and the records come from this device's
 * progress. Switch between Shift level and Unlimited, see the top 50 and your own place. Scores are sent by the game on its own (`syncScores` on every save); this sheet only
 * shows them.
 */

export interface LeaderboardActions {
  /** The records as the save has them now, sent right after joining. */
  records(): Records;
  closed(): void;
}

const BOARDS: { id: BoardId; label: string; empty: string }[] = [
  { id: 'shift-level', label: 'Shift level', empty: 'Clear a shift to be the first one here.' },
  { id: 'unlimited', label: 'Unlimited', empty: 'Set an Unlimited record to be the first one here.' },
];

/** The last list of each board: shown at once when the sheet opens again, then refreshed. */
const cache = new Map<BoardId, BoardView>();
let lastBoard: BoardId = 'shift-level';

/** The number a line stands for: the level (with its Prestige rank) or the Unlimited score. */
function valueOf(board: BoardId, e: { score: number; meta: Record<string, number> }): string {
  if (board === 'unlimited') return Fmt.number(e.score);
  const level = `Level ${Fmt.number(e.meta.level ?? e.score % 1000)}`;
  const prestige = e.meta.prestige ?? Math.floor(e.score / 1000);
  return prestige > 0 ? `${S.prestige.caption(prestige)} · ${level}` : level;
}

function entryRow(board: BoardId, e: BoardEntry | (Omit<BoardEntry, 'name'> & { name: string })): HTMLElement {
  return h(
    'div',
    { class: `row board-row${e.me ? ' me' : ''}${e.rank <= 3 ? ' podium' : ''}`, role: 'listitem' },
    h('span', { class: 'board-rank', 'aria-label': `Rank ${e.rank}` }, Fmt.number(e.rank)),
    h('div', { class: 'row-main' }, h('div', { class: 'row-title board-name' }, h('span', {}, e.name), e.me ? h('span', { class: 'you-tag' }, 'You') : null)),
    h('span', { class: 'row-value board-value' }, valueOf(board, e)),
  );
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
function nameForm(value: string, action: string, submit: (name: string) => Promise<string | null>, cancel: (() => void) | null): HTMLElement {
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

export function leaderboardSheet(layer: HTMLElement, actions: LeaderboardActions): () => void {
  let board: BoardId = lastBoard;
  let account: Account | null = loadAccount();
  let renaming = false;
  /** Which request's answer may still be shown: a newer one (another board) wins. */
  let asked = 0;

  const top = h('div', { class: 'board-top' });
  const list = h('div', { class: 'list board-list', role: 'list', 'aria-label': 'Leaderboard', 'aria-busy': 'false' });
  const footer = h('div', { class: 'board-footer' });

  // Shift level | Unlimited, the same control as Reduce motion in the settings.
  const tabs = h('div', { class: 'segmented board-tabs', role: 'group', 'aria-label': 'Leaderboard' });
  const thumb = h('span', { class: 'thumb', 'aria-hidden': 'true' });
  thumb.style.width = `calc((100% - 4px) / ${BOARDS.length})`;
  tabs.append(thumb);
  const tabButtons = BOARDS.map((b, i) => {
    const button = h('button', { type: 'button', 'aria-pressed': 'false', onclick: () => choose(b.id) }, b.label);
    button.dataset.index = String(i);
    tabs.append(button);
    return button;
  });

  function choose(next: BoardId): void {
    board = next;
    lastBoard = next;
    BOARDS.forEach((b, i) => {
      const on = b.id === next;
      tabButtons[i].setAttribute('aria-pressed', String(on));
      if (on) thumb.style.transform = `translateX(${i * 100}%)`;
    });
    void load();
  }

  function showList(view: BoardView): void {
    const rows = view.entries.map((e) => entryRow(board, e));
    // Further down than the top list: a gap, then your own line.
    if (view.me && account && !view.entries.some((e) => e.me)) {
      rows.push(h('div', { class: 'row board-gap', 'aria-hidden': 'true' }, '···'));
      rows.push(entryRow(board, { rank: view.me.rank, name: account.name, score: view.me.score, meta: view.me.meta, me: true }));
    }
    if (rows.length === 0) {
      const empty = BOARDS.find((b) => b.id === board)?.empty ?? '';
      rows.push(h('div', { class: 'row board-empty' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, 'Nobody here yet'), h('div', { class: 'row-sub' }, empty))));
    }
    list.replaceChildren(...rows);
    list.setAttribute('aria-busy', 'false');
  }

  async function load(): Promise<void> {
    const ticket = ++asked;
    const cached = cache.get(board);
    if (cached) showList(cached);
    else {
      list.replaceChildren(...skeleton());
      list.setAttribute('aria-busy', 'true');
    }
    try {
      const view = await fetchBoard(board);
      cache.set(board, view);
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
    // The service no longer knew the token (the account was removed): back to the name form.
    if (account && !loadAccount()) {
      account = null;
      renderTop();
    }
  }

  /** Above the tabs: the name form while the player is not on the leaderboard yet. */
  function renderTop(): void {
    if (account) {
      top.replaceChildren();
      renderFooter();
      return;
    }
    top.replaceChildren(
      h('p', { class: 'section-note board-intro' }, 'Enter a name to see where you rank. Your level and your Unlimited record come from the progress on this device and stay up to date by themselves.'),
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
              void load();
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
          void load();
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
      account = await createAccount(name);
      savePlayerName(account.name);
      renderTop();
      // Your records go up at once, then the list shows you in it.
      await syncScores(actions.records());
      cache.clear();
      await load();
      return null;
    } catch (error) {
      return describeError(error);
    }
  }

  const body = h('div', { class: 'board' }, top, tabs, list, footer);
  renderTop();
  choose(board);
  return openSheet(layer, 'Leaderboard', body, actions.closed);
}
