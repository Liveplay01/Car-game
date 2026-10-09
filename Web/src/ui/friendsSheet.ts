import { h } from './dom';
import { boardPanel, forgetFriendsBoards, nameForm, openAccount, tabsControl } from './leaderboardSheet';
import { openSheet, glideHeight, fadeIn } from './sheets';
import { INVITE_LEVEL } from '../core/config';
import { type InviteView, fetchInvite, inviteUrl, pendingInvite } from '../net/invite';
import { type FriendsView, type Records, addFriend, describeError, fetchFriends, loadAccount, removeFriend, syncScores } from '../net/leaderboard';
import { S } from '../present/strings';
import { loadPlayerName } from '../storage/profile';

/**
 * Friends (Leo, 05.10.2026): everything about people, in one drawer with tabs like a page.
 * The Friends pill above Settings and the leaderboard's Friends row lead here. Four tabs:
 * Friends (your code, adding, your list) · Ranking (the boards among you) · Play (challenge a friend, the
 * multiplayer lobby) · Invite (the link, who joined). Without a name the page asks for one first, no detour.
 */

export interface FriendsActions {
  /** The records as the save has them now, sent right after a name is chosen. */
  records(): Records;
  /** Leaves this sheet for the multiplayer lobby. */
  playTogether(): void;
  /**
   * Sends the shift on screen as a challenge link; the answer is what to tell the player, if anything.
   * Null while there is no finished shift to send (the row says so instead).
   */
  challenge: (() => Promise<string | null>) | null;
  closed(): void;
}

type FriendsTab = 'friends' | 'ranking' | 'play' | 'invite';
const TABS: { id: FriendsTab; label: string }[] = [
  { id: 'friends', label: 'Friends' },
  { id: 'ranking', label: 'Ranking' },
  { id: 'play', label: 'Play' },
  { id: 'invite', label: 'Invite' },
];
let lastTab: FriendsTab = 'friends';

/** 1 → 1st, 3 → 3rd, 10 → 10th. */
const ordinal = (n: number): string => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;

/** A friend code as it is typed or pasted: `K7M2-9QXA`. */
const tidyFriendCode = (text: string): string =>
  text
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
    .replace(/(.{4})(?=.)/g, '$1-');

/** Copies `text`; the button says so for a moment. Without clipboard access the text is shown to copy by hand. */
async function copyText(button: HTMLElement, text: string, label: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = 'Copied';
    window.setTimeout(() => (button.textContent = label), 1600);
  } catch {
    window.prompt('Copy this', text);
  }
}

/** The invite link: the share sheet on a phone, the clipboard elsewhere. */
async function shareInvite(invite: InviteView, button: HTMLElement): Promise<void> {
  const url = inviteUrl(invite);
  if (window.matchMedia('(pointer: coarse)').matches && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: S.gameTitle, text: S.invite.shareText(invite.level), url });
      return;
    } catch (error) {
      // Closing the share sheet is an answer; anything else falls through to the clipboard.
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }
  await copyText(button, url, 'Share invite link');
}

const label = (text: string): HTMLElement => h('p', { class: 'section-note board-label' }, text);
const note = (text: string, error = false): HTMLElement => h('p', { class: `field-help${error ? ' error' : ''}`, ...(error ? { role: 'alert' } : {}) }, text);

export function friendsSheet(layer: HTMLElement, actions: FriendsActions): () => void {
  const body = h('div', { class: 'friends' }, h('p', { class: 'section-note' }, 'Loading your friends…'));
  const content = h('div', { class: 'friends-content' });
  let tab: FriendsTab = lastTab;
  let view: FriendsView | null = null;
  let invite: InviteView | null = null;
  /** Under the add field: what the last add did. Shown once. */
  let message: string | undefined;
  let asked = 0;

  const tabs = tabsControl('Friends', TABS, (next) => {
    tab = next;
    lastTab = next;
    show();
  });
  tabs.el.classList.add('sheet-tabs');
  const ranking = boardPanel('friends', { account: loadAccount, records: actions.records, signedOut: () => void render() });

  /** Without a name there is no friend code: ask for it here, and the sheet fills in when it is chosen. */
  function needsName(): void {
    const join = async (name: string): Promise<string | null> => {
      try {
        await openAccount(name);
      } catch (error) {
        return describeError(error);
      }
      void syncScores(actions.records());
      void render();
      return null;
    };
    body.replaceChildren(
      h(
        'p',
        { class: 'section-note' },
        pendingInvite()
          ? `A friend invited you. Pick a name, reach level ${INVITE_LEVEL} and you both get a chest. You get a friend code of your own too.`
          : 'Friends know you by your name on the leaderboard. Pick one, and you get a friend code to hand out, a ranking among friends and an invite link that earns you chests.',
      ),
      nameForm(loadPlayerName(), 'Save', join, null),
    );
  }

  async function render(): Promise<void> {
    if (!loadAccount()) return needsName();
    const ticket = ++asked;
    // The invite is an extra: without it (an older service) the friend code and the list are all there is.
    const inviteAsked = fetchInvite().catch(() => null);
    try {
      view = await fetchFriends();
    } catch (error) {
      if (ticket === asked) body.replaceChildren(note(describeError(error), true), h('button', { class: 'btn block', type: 'button', onclick: () => void render() }, 'Try again'));
      return;
    }
    invite = await inviteAsked;
    if (ticket !== asked) return;
    body.replaceChildren(tabs.el, content);
    show();
  }

  function show(): void {
    tabs.set(tab);
    if (!view) return;
    const rows = { friends: () => friendRows(view!), ranking: () => [ranking.el], play: playRows, invite: inviteRows }[tab]();
    message = undefined;
    content.replaceChildren(...rows);
    fadeIn(content);
    if (tab === 'ranking') ranking.open();
  }

  // MARK: Friends

  /** Your code, big, with Copy; then adding a friend and your list. */
  function friendRows(now: FriendsView): HTMLElement[] {
    const copy = h('button', { class: 'btn', type: 'button' }, 'Copy');
    copy.addEventListener('click', () => void copyText(copy, now.code, 'Copy'));
    return [
      label('Your friend code'),
      h('div', { class: 'list' }, h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'sync-code', 'aria-label': `Your friend code: ${now.code}` }, now.code)), copy)),
      ...addRows(),
      ...listRows(now),
    ];
  }

  /** A field for a friend's code. They do not have to add you back. */
  function addRows(): HTMLElement[] {
    const input = h('input', {
      class: 'text-input code-input sync-input',
      type: 'text',
      name: 'friend-code',
      autocomplete: 'off',
      autocapitalize: 'characters',
      spellcheck: 'false',
      enterkeyhint: 'go',
      maxlength: '9',
      placeholder: 'K7M2-9QXA',
      'aria-label': "A friend's code",
    });
    const help = h('p', { class: 'field-help', 'aria-live': 'polite' }, message ?? 'Type the code your friend sees here. They do not have to add you back.');
    const add = h('button', { class: 'btn', type: 'submit' }, 'Add');
    /** The last code sent, so a code that was refused is not sent again until it is changed. */
    let tried = '';
    const submit = (): void => {
      if (add.disabled) return;
      if (input.value.replace(/-/g, '').length !== 8) {
        help.textContent = 'A friend code has 8 letters and numbers, like K7M2-9QXA.';
        help.classList.add('error');
        return;
      }
      tried = input.value;
      add.disabled = true;
      help.textContent = 'Adding…';
      addFriend(input.value).then(
        (friend) => {
          forgetFriendsBoards();
          message = `${friend.name} is on your list.`;
          void render();
        },
        (error: unknown) => {
          add.disabled = false;
          help.textContent = describeError(error);
          help.classList.add('error');
          input.focus();
        },
      );
    };
    input.addEventListener('input', () => {
      input.value = tidyFriendCode(input.value);
      help.classList.remove('error');
      // A whole code is all it takes: no need to tap Add (Leo, 05.10.2026).
      if (input.value.replace(/-/g, '').length === 8 && input.value !== tried) submit();
    });
    const form = h(
      'form',
      {
        class: 'board-form',
        novalidate: true,
        onsubmit: (e: Event) => {
          e.preventDefault();
          submit();
        },
      },
      h('div', { class: 'join-row' }, input, add),
      help,
    );
    return [label('Add a friend'), form];
  }

  function listRows(now: FriendsView): HTMLElement[] {
    if (now.friends.length === 0) return [label('Your friends'), h('div', { class: 'list' }, h('div', { class: 'row board-empty' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, 'Nobody yet'), h('div', { class: 'row-sub' }, 'Add a friend with their code, or send an invite.'))))];
    const people = now.friends.map((f) =>
      h(
        'div',
        { class: 'row' },
        h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, f.name)),
        h(
          'button',
          {
            class: 'btn',
            type: 'button',
            'aria-label': `Remove ${f.name} from your friends`,
            // Failed (offline): the list comes back with the reason under the code field.
            onclick: () =>
              void removeFriend(f.id).then(
                () => (forgetFriendsBoards(), render()),
                (error: unknown) => ((message = describeError(error)), render()),
              ),
          },
          'Remove',
        ),
      ),
    );
    return [label(`Your friends (${people.length})`), h('div', { class: 'list' }, ...people)];
  }

  // MARK: Play

  /** Challenge a friend and the multiplayer lobby: the two ways to play with them. */
  function playRows(): HTMLElement[] {
    const send = actions.challenge;
    const sub = h('div', { class: 'row-sub', 'aria-live': 'polite' }, send ? 'Send the shift you just played and the score to beat.' : 'Finish a shift, then send it to a friend to beat.');
    const challenge = h('button', { class: 'btn', type: 'button', disabled: !send }, 'Send');
    challenge.addEventListener('click', () => {
      if (!send) return;
      challenge.disabled = true;
      void send().then((answer) => {
        challenge.disabled = false;
        if (answer) sub.textContent = answer;
      });
    });
    return [
      h(
        'div',
        { class: 'list' },
        h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, 'Challenge a friend'), sub), challenge),
        h(
          'div',
          { class: 'row' },
          h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, 'Multiplayer'), h('div', { class: 'row-sub' }, 'Host a room and send the code, or join your friend’s.')),
          h('button', { class: 'btn', type: 'button', onclick: () => actions.playTogether() }, 'Open lobby'),
        ),
      ),
    ];
  }

  // MARK: Invite

  /** The invite link to send, and who joined through you and how far they are; and who brought you. */
  function inviteRows(): HTMLElement[] {
    if (!invite) return [note('Invites are not available right now. Try again later.')];
    const now = invite;
    const share = h('button', { class: 'btn primary block', type: 'button' }, 'Share invite link');
    share.addEventListener('click', () => void shareInvite(now, share));
    const bonus = now.milestones.map((m) => ordinal(m.invites));
    const lines = now.invited.map((i) =>
      h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, i.name), h('div', { class: 'row-sub' }, i.done ? `Reached level ${now.level} · chest sent` : `Playing · not at level ${now.level} yet`))),
    );
    if (now.invitedBy) {
      const by = now.invitedBy;
      lines.unshift(
        h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, `Invited by ${by.name}`), h('div', { class: 'row-sub' }, by.done ? 'You both got your chest' : `Reach level ${now.level} and you both get a chest`))),
      );
    }
    return [
      share,
      h('p', { class: 'section-note' }, `You both get a chest when a friend reaches level ${now.level}.${bonus.length > 0 ? ` Your ${bonus.join(' and ')} friend each bring a bonus Premium Chest.` : ''}`),
      label(`Invites (${now.done} of ${now.invited.length} at level ${now.level})`),
      lines.length > 0
        ? h('div', { class: 'list' }, ...lines)
        : h('div', { class: 'list' }, h('div', { class: 'row board-empty' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, 'Nobody yet'), h('div', { class: 'row-sub' }, 'Send your link to a friend. It shows up here when they join.')))),
    ];
  }

  void render();
  const close = openSheet(layer, 'Friends', body, actions.closed);
  glideHeight(body, content);
  return close;
}
