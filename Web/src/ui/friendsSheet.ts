import { h } from './dom';
import { forgetFriendsBoards } from './leaderboardSheet';
import { openSheet } from './sheets';
import { type InviteView, fetchInvite, inviteUrl } from '../net/invite';
import { type FriendsView, addFriend, describeError, fetchFriends, loadAccount, removeFriend } from '../net/leaderboard';
import { S } from '../present/strings';

/**
 * Friends (Leo, 04.10.2026): everything about people in one place, one tap from Settings and from the
 * leaderboard. Before this the friend code sat under the Friends list inside the leaderboard, three taps in.
 * In the order people need it: your code (to read out or copy), the invite link (to send), who you invited,
 * then adding a friend by their code and your list. The leaderboard keeps only what it is for: comparing.
 */

export interface FriendsActions {
  /** No name yet: the leaderboard asks for one (this sheet has no form of its own). */
  openLeaderboard(): void;
  closed(): void;
}

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

export function friendsSheet(layer: HTMLElement, actions: FriendsActions): () => void {
  const body = h('div', { class: 'friends' });
  let asked = 0;

  const note = (text: string, error = false): HTMLElement => h('p', { class: `field-help${error ? ' error' : ''}`, ...(error ? { role: 'alert' } : {}) }, text);

  /** Without a name there is no friend code: say so and send the player to the one place that asks for it. */
  function needsName(): void {
    body.replaceChildren(
      h('p', { class: 'section-note' }, 'Friends use your name on the leaderboard. Pick one, and you get a friend code to hand out and an invite link that earns you chests.'),
      h('button', { class: 'btn primary block', type: 'button', onclick: () => actions.openLeaderboard() }, 'Choose a name'),
    );
  }

  async function render(message?: string): Promise<void> {
    if (!loadAccount()) return needsName();
    const ticket = ++asked;
    // The invite is an extra: without it (an older service) the friend code and the list are all there is.
    const inviteAsked = fetchInvite().catch(() => null);
    let view: FriendsView;
    try {
      view = await fetchFriends();
    } catch (error) {
      if (ticket === asked) body.replaceChildren(note(describeError(error), true), h('button', { class: 'btn block', type: 'button', onclick: () => void render() }, 'Try again'));
      return;
    }
    const invite = await inviteAsked;
    if (ticket !== asked) return;
    body.replaceChildren(...codeRows(view, invite), ...(invite ? inviteRows(invite) : []), ...addRows(message), ...listRows(view));
  }

  /** Your code, big, with Copy and the invite link under it: the first thing, because it is what people ask for. */
  function codeRows(view: FriendsView, invite: InviteView | null): HTMLElement[] {
    const copy = h('button', { class: 'btn', type: 'button' }, 'Copy');
    copy.addEventListener('click', () => void copyText(copy, view.code, 'Copy'));
    const rows: HTMLElement[] = [
      h('p', { class: 'section-note board-label' }, 'Your friend code'),
      h('div', { class: 'list' }, h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'sync-code', 'aria-label': `Your friend code: ${view.code}` }, view.code)), copy)),
    ];
    if (invite) {
      const share = h('button', { class: 'btn primary block', type: 'button' }, 'Share invite link');
      share.addEventListener('click', () => void shareInvite(invite, share));
      const bonus = invite.milestones.map((m) => ordinal(m.invites));
      rows.push(
        share,
        h(
          'p',
          { class: 'section-note' },
          `You both get a chest when a friend reaches level ${invite.level}.${bonus.length > 0 ? ` Your ${bonus.join(' and ')} friend each bring a bonus Premium Chest.` : ''}`,
        ),
      );
    }
    return rows;
  }

  /** Who joined through you, and how far they are; and who brought you. */
  function inviteRows(invite: InviteView): HTMLElement[] {
    const lines = invite.invited.map((i) =>
      h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, i.name), h('div', { class: 'row-sub' }, i.done ? `Reached level ${invite.level} · chest sent` : `Playing · not at level ${invite.level} yet`))),
    );
    if (invite.invitedBy) {
      const by = invite.invitedBy;
      lines.unshift(
        h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, `Invited by ${by.name}`), h('div', { class: 'row-sub' }, by.done ? 'You both got your chest' : `Reach level ${invite.level} and you both get a chest`))),
      );
    }
    if (lines.length === 0) return [];
    return [h('p', { class: 'section-note board-label' }, `Invites (${invite.done} of ${invite.invited.length} at level ${invite.level})`), h('div', { class: 'list' }, ...lines)];
  }

  /** A field for a friend's code. They do not have to add you back. */
  function addRows(message?: string): HTMLElement[] {
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
    input.addEventListener('input', () => {
      input.value = tidyFriendCode(input.value);
      help.classList.remove('error');
    });
    const form = h(
      'form',
      {
        class: 'board-form',
        novalidate: true,
        onsubmit: (e: Event) => {
          e.preventDefault();
          if (input.value.replace(/-/g, '').length !== 8) {
            help.textContent = 'A friend code has 8 letters and numbers, like K7M2-9QXA.';
            help.classList.add('error');
            return;
          }
          add.disabled = true;
          addFriend(input.value).then(
            (friend) => {
              forgetFriendsBoards();
              void render(`${friend.name} is on your list.`);
            },
            (error: unknown) => {
              add.disabled = false;
              help.textContent = describeError(error);
              help.classList.add('error');
              input.focus();
            },
          );
        },
      },
      h('div', { class: 'join-row' }, input, add),
      help,
    );
    return [h('p', { class: 'section-note board-label' }, 'Add a friend'), form];
  }

  function listRows(view: FriendsView): HTMLElement[] {
    if (view.friends.length === 0) return [];
    const people = view.friends.map((f) =>
      h(
        'div',
        { class: 'row' },
        h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, f.name)),
        h('button', { class: 'btn', type: 'button', 'aria-label': `Remove ${f.name} from your friends`, onclick: () => void removeFriend(f.id).then(() => (forgetFriendsBoards(), render())) }, 'Remove'),
      ),
    );
    return [h('p', { class: 'section-note board-label' }, `Your friends (${people.length})`), h('div', { class: 'list' }, ...people)];
  }

  void render();
  return openSheet(layer, 'Friends', body, actions.closed);
}
