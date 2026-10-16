import { h, loadingNote } from './dom';
import { forgetFriendsBoards, nameForm, openAccount } from './ranksPanel';
import { fadeIn } from './sheets';
import { INVITE_LEVEL } from '../core/config';
import { type InviteView, fetchInvite, inviteUrl, pendingInvite } from '../net/invite';
import { type FriendsView, type Records, addFriend, describeError, fetchFriends, loadAccount, removeFriend, syncScores } from '../net/leaderboard';
import { S } from '../present/strings';
import { loadPlayerName } from '../storage/profile';

/**
 * Social → Friends (Leo, 05.10.2026, one page since 10.10.2026): everything about people, top to bottom: your friend code, adding a friend, your list,
 * playing together (challenge a friend, the multiplayer lobby) and the invite link with who joined. The ranking among friends is Ranks → Friends.
 * Without a name the page asks for one first, no detour.
 */

export interface FriendsActions {
  /** The records as the save has them now, sent right after a name is chosen. */
  records(): Records;
  /** Leaves this page for the multiplayer lobby. */
  playTogether(): void;
  /**
   * Sends the last finished shift as a challenge link; the answer is what to tell the player, if anything.
   * Null while there is no finished shift to send (the row says so instead).
   */
  challenge: (() => Promise<string | null>) | null;
}

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
    button.textContent = S.friends.copied;
    window.setTimeout(() => (button.textContent = label), 1600);
  } catch {
    window.prompt(S.friends.copyPrompt, text);
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
  await copyText(button, url, S.friends.shareLink);
}

const label = (text: string): HTMLElement => h('p', { class: 'section-note board-label' }, text);
const note = (text: string, error = false): HTMLElement => h('p', { class: `field-help${error ? ' error' : ''}`, ...(error ? { role: 'alert' } : {}) }, text);

export function friendsPanel(actions: FriendsActions): HTMLElement {
  const body = h('div', { class: 'friends' }, loadingNote(S.friends.loading));
  const content = h('div', { class: 'friends-content' });
  let view: FriendsView | null = null;
  let invite: InviteView | null = null;
  /** Under the add field: what the last add did. Shown once. */
  let message: string | undefined;
  let asked = 0;

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
        pendingInvite() ? S.friends.introInvited(INVITE_LEVEL) : S.friends.intro,
      ),
      nameForm(loadPlayerName(), S.friends.save, join, null),
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
      if (ticket === asked) body.replaceChildren(note(describeError(error), true), h('button', { class: 'btn block', type: 'button', onclick: () => void render() }, S.friends.tryAgain));
      return;
    }
    invite = await inviteAsked;
    if (ticket !== asked) return;
    body.replaceChildren(content);
    show();
  }

  function show(): void {
    if (!view) return;
    const rows = [...friendRows(view), label(S.friends.playTogether), ...playRows(), label(S.friends.inviteFriends), ...inviteRows()];
    message = undefined;
    content.replaceChildren(...rows);
    fadeIn(content);
  }

  // MARK: Friends

  /** Your code, big, with Copy; then adding a friend and your list. */
  function friendRows(now: FriendsView): HTMLElement[] {
    const copy = h('button', { class: 'btn', type: 'button' }, S.friends.copy);
    copy.addEventListener('click', () => void copyText(copy, now.code, S.friends.copy));
    return [
      label(S.friends.yourCode),
      h('div', { class: 'list' }, h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'sync-code', 'aria-label': S.friends.yourCodeLabel(now.code) }, now.code)), copy)),
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
      'aria-label': S.friends.codeLabel,
    });
    const help = h('p', { class: 'field-help', 'aria-live': 'polite' }, message ?? S.friends.typeHere);
    const add = h('button', { class: 'btn', type: 'submit' }, S.friends.add);
    /** The last code sent, so a code that was refused is not sent again until it is changed. */
    let tried = '';
    const submit = (): void => {
      if (add.disabled) return;
      if (input.value.replace(/-/g, '').length !== 8) {
        help.textContent = S.friends.codeShort;
        help.classList.add('error');
        return;
      }
      tried = input.value;
      add.disabled = true;
      help.textContent = S.friends.adding;
      addFriend(input.value).then(
        (friend) => {
          forgetFriendsBoards();
          message = S.friends.onList(friend.name);
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
    return [label(S.friends.addFriend), form];
  }

  function listRows(now: FriendsView): HTMLElement[] {
    if (now.friends.length === 0) return [label(S.friends.yourFriendsNone), h('div', { class: 'list' }, h('div', { class: 'row board-empty' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, S.friends.nobody), h('div', { class: 'row-sub' }, S.friends.nobodySub))))];
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
            'aria-label': S.friends.removeLabel(f.name),
            // Failed (offline): the list comes back with the reason under the code field.
            onclick: () =>
              void removeFriend(f.id).then(
                () => (forgetFriendsBoards(), render()),
                (error: unknown) => ((message = describeError(error)), render()),
              ),
          },
          S.friends.remove,
        ),
      ),
    );
    return [label(S.friends.yourFriends(people.length)), h('div', { class: 'list' }, ...people)];
  }

  // MARK: Play

  /** Challenge a friend and the multiplayer lobby: the two ways to play with them. */
  function playRows(): HTMLElement[] {
    const send = actions.challenge;
    const sub = h('div', { class: 'row-sub', 'aria-live': 'polite' }, send ? S.friends.challengeSub : S.friends.challengeNone);
    const challenge = h('button', { class: 'btn', type: 'button', disabled: !send }, S.friends.send);
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
        h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, S.friends.challenge), sub), challenge),
        h(
          'div',
          { class: 'row' },
          h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, S.friends.multiplayer), h('div', { class: 'row-sub' }, S.friends.multiplayerSub)),
          h('button', { class: 'btn', type: 'button', onclick: () => actions.playTogether() }, S.friends.openLobby),
        ),
      ),
    ];
  }

  // MARK: Invite

  /** The invite link to send, and who joined through you and how far they are; and who brought you. */
  function inviteRows(): HTMLElement[] {
    if (!invite) return [note(S.friends.noInvites)];
    const now = invite;
    const share = h('button', { class: 'btn primary block', type: 'button' }, S.friends.shareLink);
    share.addEventListener('click', () => void shareInvite(now, share));
    const bonus = now.milestones.map((m) => S.friends.ordinal(m.invites));
    const lines = now.invited.map((i) =>
      h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, i.name), h('div', { class: 'row-sub' }, i.done ? S.friends.reached(now.level) : S.friends.playing(now.level)))),
    );
    if (now.invitedBy) {
      const by = now.invitedBy;
      lines.unshift(
        h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, S.friends.invitedBy(by.name)), h('div', { class: 'row-sub' }, by.done ? S.friends.bothGot : S.friends.bothGet(now.level)))),
      );
    }
    return [
      share,
      h('p', { class: 'section-note' }, S.friends.bothNote(now.level, bonus)),
      label(S.friends.invites(now.done, now.invited.length, now.level)),
      lines.length > 0
        ? h('div', { class: 'list' }, ...lines)
        : h('div', { class: 'list' }, h('div', { class: 'row board-empty' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, S.friends.nobody), h('div', { class: 'row-sub' }, S.friends.sendLink)))),
    ];
  }

  void render();
  return body;
}
