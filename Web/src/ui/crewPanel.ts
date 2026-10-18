import { h, loadingNote } from './dom';
import { fadeIn, openSheet } from './sheets';
import type { Career } from '../core/career';
import type { ChestKind } from '../core/loot';
import { type BoardId, type Records, describeError, loadAccount, syncScores } from '../net/leaderboard';
import { titleName } from './ranksPanel';
import { withCoins } from './clubPanel';
import { type InviteView, fetchInvite, inviteUrl } from '../net/invite';
import {
  type CrewGift,
  type CrewMember,
  type CrewView,
  type GiftItem,
  claimGift,
  dropPendingCrew,
  fetchCrew,
  fetchProfile,
  foundCrew,
  giveGift,
  joinCrew,
  leaveCrew,
  pendingCrew,
  previewCrew,
  removeMember,
  renameCrew,
} from '../net/crews';
import { S, Fmt } from '../present/strings';
import { money } from '../present/format';

/**
 * Social → Crew (Leo, 18.10.2026, in place of Friends): the crew you play the weekly league with. Without one: the crew a
 * link brought you to, or founding your own. With one: this week's table and goal, the gifts waiting for you, giving a
 * gift, the members (tap one for their profile), playing together, the invite link, and leaving. Your friend code stays
 * at the bottom: bug reports on the website still want it.
 */

export interface CrewHost {
  /** Where sheets open (a profile, renaming). */
  layer: HTMLElement;
  career(): Career;
  /** The career changed (a gift given or given back): write the save. */
  changed(): void;
  records(): Records;
  /** A taken gift waits among the rewards: pick them up now. */
  collect(): void;
  playTogether(): void;
  /** Sends the last finished shift as a challenge link; null while there is none. */
  challenge: (() => Promise<string | null>) | null;
}

const CREW_NAME_MAX = 20;
const CONFIRM_MS = 3000;

const label = (text: string): HTMLElement => h('p', { class: 'section-note board-label' }, text);
const note = (text: string, error = false): HTMLElement => h('p', { class: `field-help${error ? ' error' : ''}`, ...(error ? { role: 'alert' } : {}) }, text);
const row = (title: string | Node, sub: string | null, ...end: (Node | null)[]): HTMLElement =>
  h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), sub ? h('div', { class: 'row-sub' }, sub) : null), ...end);

/** What a gift is, in words: money with the coin, a chest by its name. */
export const giftName = (item: GiftItem): string => (item.startsWith('money:') ? money(Fmt.number(Number(item.slice(6)))) : S.shop.chest(item.slice(6) as ChestKind));

/** A button that asks for a second tap before it acts (giving money away, leaving, taking someone out). */
function confirmButton(text: string, confirm: string, cls: string, act: () => void): HTMLButtonElement {
  const button = h('button', { class: cls, type: 'button' }, text);
  let armed = 0;
  button.addEventListener('click', () => {
    if (armed) {
      window.clearTimeout(armed);
      armed = 0;
      button.textContent = text;
      act();
      return;
    }
    button.textContent = confirm;
    armed = window.setTimeout(() => {
      armed = 0;
      button.textContent = text;
    }, CONFIRM_MS);
  });
  return button;
}

/** Copies `text`; the button says so for a moment. Without clipboard access the text is shown to copy by hand. */
async function copyText(button: HTMLElement, text: string, back: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = S.friends.copied;
    window.setTimeout(() => (button.textContent = back), 1600);
  } catch {
    window.prompt(S.friends.copyPrompt, text);
  }
}

/** The share sheet on a phone, the clipboard elsewhere. */
async function share(button: HTMLElement, url: string, text: string, back: string): Promise<void> {
  if (window.matchMedia('(pointer: coarse)').matches && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: S.gameTitle, text, url });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }
  await copyText(button, url, back);
}

/** Time until `at`, roughly: days and hours, or hours and minutes. */
function until(at: number): string {
  const minutes = Math.max(0, Math.round((at - Date.now()) / 60000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  return days > 0 ? `${days} d ${hours} h` : `${hours} h ${minutes % 60} min`;
}

/** Takes what a gift costs out of the save; false when the money or the chest is not there. */
function takeGift(career: Career, item: GiftItem): boolean {
  if (item.startsWith('money:')) {
    const amount = Number(item.slice(6));
    if (career.money < amount) return false;
    career.money -= amount;
    return true;
  }
  const index = career.chests.indexOf(item.slice(6) as ChestKind);
  if (index < 0) return false;
  career.chests.splice(index, 1);
  return true;
}

/** Puts it back: the service did not take the gift. */
function returnGift(career: Career, item: GiftItem): void {
  if (item.startsWith('money:')) career.money += Number(item.slice(6));
  else career.chests.push(item.slice(6) as ChestKind);
}

export function crewPanel(host: CrewHost): HTMLElement {
  const body = h('div', { class: 'crew' }, loadingNote(S.crew.loading));
  let view: CrewView | null = null;
  let invite: InviteView | null = null;
  /** What the last action said, under its rows; shown once. */
  let message: { text: string; error: boolean } | null = null;
  let asked = 0;

  /** Shows the crew: `given` when a call just answered with it, else asked for. */
  async function render(given?: CrewView): Promise<void> {
    if (!loadAccount()) return;
    const ticket = ++asked;
    const inviteAsked = invite ? Promise.resolve(invite) : fetchInvite().catch(() => null);
    try {
      view = given ?? (await fetchCrew());
    } catch (error) {
      if (ticket === asked) body.replaceChildren(note(describeError(error), true), h('button', { class: 'btn block', type: 'button', onclick: () => void render() }, S.friends.tryAgain));
      return;
    }
    invite = await inviteAsked;
    if (ticket !== asked) return;
    const content = h('div', { class: 'friends-content' }, ...(view.crew ? crewRows(view) : await noCrewRows()));
    withCoins(content);
    body.replaceChildren(content);
    fadeIn(content);
    message = null;
  }

  /** Runs a call that answers with the crew, then shows the new state (or why it failed). */
  async function act(call: () => Promise<CrewView>, done?: string): Promise<boolean> {
    try {
      const answer = await call();
      message = done ? { text: done, error: false } : null;
      await render(answer);
      return true;
    } catch (error) {
      message = { text: describeError(error), error: true };
      await render();
      return false;
    }
  }

  const said = (): HTMLElement | null => (message ? note(message.text, message.error) : null);

  // MARK: Without a crew

  async function noCrewRows(): Promise<HTMLElement[]> {
    const rows: HTMLElement[] = [];
    const code = pendingCrew();
    if (code) rows.push(...(await invitedRows(code)));
    rows.push(h('p', { class: 'section-note' }, S.crew.intro), said() ?? h('span'), label(S.crew.found), foundForm());
    rows.push(...playRows(), ...codeRows());
    return rows;
  }

  /** The crew a link brought the player to: join it, or not now. */
  async function invitedRows(code: string): Promise<HTMLElement[]> {
    try {
      const crew = await previewCrew(code);
      const join = h('button', { class: 'btn primary', type: 'button', disabled: crew.full }, S.crew.join);
      join.addEventListener('click', () => void act(() => joinCrew(code)));
      const later = h('button', { class: 'btn', type: 'button' }, S.crew.notNow);
      later.addEventListener('click', () => {
        dropPendingCrew();
        void render();
      });
      return [
        label(S.crew.invited),
        h('div', { class: 'list' }, row(crew.name, crew.full ? S.crew.full : S.crew.invitedSub(crew.members, crew.max, S.crew.league(crew.league)), h('div', { class: 'lot-actions' }, join, later))),
      ];
    } catch {
      dropPendingCrew();
      return [note(S.crew.gone, true)];
    }
  }

  function nameInput(value = ''): HTMLInputElement {
    return h('input', {
      class: 'text-input',
      type: 'text',
      name: 'crew-name',
      autocomplete: 'off',
      maxlength: String(CREW_NAME_MAX),
      placeholder: S.crew.namePlaceholder,
      'aria-label': S.crew.nameLabel,
      value,
    });
  }

  function foundForm(): HTMLElement {
    const input = nameInput();
    const go = h('button', { class: 'btn primary', type: 'submit' }, S.crew.create);
    return h(
      'form',
      {
        class: 'board-form',
        novalidate: true,
        onsubmit: (e: Event) => {
          e.preventDefault();
          go.disabled = true;
          void act(() => foundCrew(input.value)).then(() => (go.disabled = false));
        },
      },
      h('div', { class: 'join-row' }, input, go),
      note(S.crew.nameHelp(CREW_NAME_MAX)),
    );
  }

  // MARK: With a crew

  function crewRows(now: CrewView): HTMLElement[] {
    const crew = now.crew!;
    const rows: HTMLElement[] = [headRows(now)];
    const m = said();
    if (m) rows.push(m);
    rows.push(...weekRows(now), ...giftRows(now), ...memberRows(now), ...playRows(), ...inviteRows(now), ...codeRows());
    rows.push(confirmButton(S.crew.leave, S.crew.leaveConfirm, 'btn destructive block', () => void act(() => leaveCrew())));
    if (crew.owner) rows.push(note(S.crew.leaveOwner));
    return rows;
  }

  function headRows(now: CrewView): HTMLElement {
    const crew = now.crew!;
    const rename = crew.owner ? h('button', { class: 'btn', type: 'button', disabled: crew.renameAt !== null }, crew.renameAt ? S.crew.renameIn(Math.ceil((crew.renameAt - Date.now()) / 86_400_000)) : S.crew.rename) : null;
    rename?.addEventListener('click', () => openRename(crew.name));
    return h('div', { class: 'list' }, row(h('span', { class: 'crew-name' }, crew.name), `${S.crew.members(crew.members.length, crew.max)} · ${S.crew.league(crew.week.league)}`, rename));
  }

  function openRename(current: string): void {
    const input = nameInput(current);
    const save = h('button', { class: 'btn primary block', type: 'submit' }, S.crew.save);
    let close = (): void => undefined;
    const form = h(
      'form',
      {
        class: 'board-form',
        novalidate: true,
        onsubmit: (e: Event) => {
          e.preventDefault();
          save.disabled = true;
          void act(() => renameCrew(input.value)).then((ok) => {
            save.disabled = false;
            if (ok) close();
          });
        },
      },
      input,
      note(S.crew.renameNote),
      save,
    );
    close = openSheet(host.layer, S.crew.renameTitle, h('div', { class: 'friends-content' }, form));
    input.focus();
  }

  /** The league table, the zones that move, the goal, and how last week ended. */
  function weekRows(now: CrewView): HTMLElement[] {
    const { week, last } = now.crew!;
    const table = week.table.map((s, i) =>
      h(
        'div',
        { class: `row board-row${s.me ? ' me' : ''}${i < week.promote ? ' crew-up' : i >= week.table.length - week.demote ? ' crew-down' : ''}`, role: 'listitem' },
        h('span', { class: 'board-rank' }, String(i + 1)),
        h('div', { class: 'row-main' }, h('div', { class: 'row-title board-name' }, h('span', { class: 'plate crew' }, s.name), s.me ? h('span', { class: 'you-tag' }, S.ranks.you) : null), s.computer ? h('div', { class: 'row-sub board-title' }, S.crew.computer) : null),
        h('span', { class: 'row-value board-value' }, S.crew.xp(Fmt.number(s.xp))),
      ),
    );
    const share = Math.min(1, week.xp / Math.max(1, week.goal));
    const goal = h(
      'div',
      { class: 'row row-stack' },
      h(
        'div',
        { class: 'row-main' },
        h('div', { class: 'row-title' }, S.crew.goal),
        h('div', { class: 'row-sub' }, week.xp >= week.goal ? S.crew.goalDone : S.crew.goalLine(Fmt.number(week.xp), Fmt.number(week.goal))),
        h('div', { class: 'crew-meter', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(week.goal), 'aria-valuenow': String(Math.min(week.xp, week.goal)) }, h('span', { style: `width: ${(share * 100).toFixed(1)}%` })),
      ),
    );
    const rows = [
      label(`${S.crew.week} · ${S.crew.league(week.league)} · ${S.crew.endsIn(until(week.endsAt))}`),
      h('div', { class: 'list board-list', role: 'list', 'aria-label': S.crew.tableLabel }, ...table),
      note(S.crew.zones(week.promote, week.demote)),
      h('div', { class: 'list' }, goal),
    ];
    if (last) rows.push(note(S.crew.lastWeek(last.place, last.move, S.crew.league(last.league))));
    return rows;
  }

  // MARK: Gifts

  function giftRows(now: CrewView): HTMLElement[] {
    const crew = now.crew!;
    const rows: HTMLElement[] = [];
    if (crew.gifts.length > 0) {
      rows.push(label(S.crew.giftsWaiting), h('div', { class: 'list' }, ...crew.gifts.map(giftRow)));
    }
    rows.push(label(S.crew.give), h('div', { class: 'list' }, ...giveRows(now, null)), note(S.crew.giveNote(now.gifting?.left ?? 0)));
    return rows;
  }

  function giftRow(gift: CrewGift): HTMLElement {
    const take = h('button', { class: 'btn primary', type: 'button' }, S.crew.take);
    take.addEventListener('click', () => {
      take.disabled = true;
      void act(() => claimGift(gift.id), S.crew.taken(giftName(gift.item))).then((ok) => ok && host.collect());
    });
    return row(giftName(gift.item), S.crew.giftFrom(gift.from?.name ?? S.crew.someone, gift.to === null), take);
  }

  /** One row per gift on offer (the money, and the chests the player has): what it is, and Give (twice: it is their own). */
  function giveRows(now: CrewView, to: CrewMember | null, done?: () => void): HTMLElement[] {
    const career = host.career();
    const left = now.gifting?.left ?? 0;
    const items = (now.gifting?.items ?? []).filter((item) => item.startsWith('money:') || career.chests.includes(item.slice(6) as ChestKind));
    return items.map((item) => {
      const isMoney = item.startsWith('money:');
      const have = isMoney ? career.money >= Number(item.slice(6)) : true;
      const count = isMoney ? null : career.chests.filter((k) => k === item.slice(6)).length;
      const give = confirmButton(S.crew.giveButton, S.crew.confirm, 'btn', () => void send(item, to, done));
      give.disabled = !have || left <= 0;
      return row(giftName(item), count === null ? null : S.crew.youHave(count), give);
    });
  }

  async function send(item: GiftItem, to: CrewMember | null, done?: () => void): Promise<void> {
    const career = host.career();
    if (!takeGift(career, item)) return;
    host.changed();
    const ok = await act(() => giveGift(item, to?.id ?? null), to ? S.crew.sentTo(giftName(item), to.name) : S.crew.sent(giftName(item)));
    if (!ok) {
      returnGift(career, item);
      host.changed();
    }
    done?.();
  }

  // MARK: Members

  function memberRows(now: CrewView): HTMLElement[] {
    const crew = now.crew!;
    const people = [...crew.members]
      .sort((a, b) => b.xp - a.xp || a.joinedAt - b.joinedAt)
      .map((m) =>
        h(
          'button',
          { class: `row row-link board-row${m.me ? ' me' : ''}`, type: 'button', 'aria-label': S.crew.profileOf(m.name), onclick: () => openProfile(now, m) },
          h(
            'div',
            { class: 'row-main' },
            h('div', { class: 'row-title board-name' }, h('span', { class: 'plate' }, m.name), m.me ? h('span', { class: 'you-tag' }, S.ranks.you) : null),
            h('div', { class: 'row-sub board-title' }, [m.owner ? S.crew.founder : null, titleName(m.title)].filter(Boolean).join(' · ') || S.crew.member),
          ),
          h('span', { class: 'row-value board-value' }, S.crew.xp(Fmt.number(m.xp))),
        ),
      );
    return [label(S.crew.membersTitle(crew.members.length)), h('div', { class: 'list' }, ...people)];
  }

  /** A member's sheet: their places on the boards, title and week, a gift for them only, and (for the founder) taking them out. */
  function openProfile(now: CrewView, member: CrewMember): void {
    const sheet = h('div', { class: 'friends-content' }, loadingNote(S.crew.loading));
    let close = (): void => undefined;
    close = openSheet(host.layer, member.name, sheet);
    void fetchProfile(member.id).then(
      (p) => {
        const facts = [p.owner ? S.crew.founder : null, titleName(p.title), S.crew.joined(new Date(p.joinedAt).toLocaleDateString())].filter(Boolean).join(' · ');
        const boards = p.boards.map((b) => row(S.ranks.boards[b.board].label, boardValue(b.board, b.score, b.meta), h('span', { class: 'row-value board-value' }, `#${Fmt.number(b.rank)}`)));
        const parts: HTMLElement[] = [
          h('p', { class: 'section-note' }, facts),
          h('div', { class: 'list' }, row(S.crew.weekXp, null, h('span', { class: 'row-value board-value' }, S.crew.xp(Fmt.number(p.xp))))),
          label(S.crew.boards),
          boards.length > 0 ? h('div', { class: 'list' }, ...boards) : note(S.crew.noBoards),
        ];
        if (!p.me) {
          parts.push(label(S.crew.giveTo(p.name)), h('div', { class: 'list' }, ...giveRows(now, member, () => close())), note(S.crew.giveToNote(p.name, now.gifting?.left ?? 0)));
          if (now.crew?.owner) parts.push(confirmButton(S.crew.remove, S.crew.removeConfirm, 'btn destructive block', () => void act(() => removeMember(p.id)).then(() => close())));
        }
        sheet.replaceChildren(...parts);
        withCoins(sheet);
        fadeIn(sheet);
      },
      (error: unknown) => sheet.replaceChildren(note(describeError(error), true)),
    );
  }

  function boardValue(board: BoardId, score: number, meta: Record<string, number>): string {
    if (board === 'shift-level') return S.ranks.level(Fmt.number(meta.level ?? score));
    if (board === 'casino') return money(Fmt.number(score));
    return Fmt.number(score);
  }

  // MARK: Playing together, inviting, the friend code

  function playRows(): HTMLElement[] {
    const send = host.challenge;
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
      label(S.friends.playTogether),
      h(
        'div',
        { class: 'list' },
        h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, S.friends.challenge), sub), challenge),
        row(S.friends.multiplayer, S.friends.multiplayerSub, h('button', { class: 'btn', type: 'button', onclick: () => host.playTogether() }, S.friends.openLobby)),
      ),
    ];
  }

  /** The crew's link, and below it who joined the game through the player (the invite chests still count). */
  function inviteRows(now: CrewView): HTMLElement[] {
    const crew = now.crew!;
    const rows: HTMLElement[] = [label(S.crew.inviteTitle)];
    const url = crew.link;
    if (url && crew.members.length < crew.max) {
      const button = h('button', { class: 'btn primary block', type: 'button' }, S.crew.invite);
      button.addEventListener('click', () => void share(button, url, S.crew.shareText(crew.name), S.crew.invite));
      rows.push(button, note(S.crew.inviteNote(crew.max)));
    } else rows.push(note(crew.members.length >= crew.max ? S.crew.isFull : S.friends.noInvites));
    if (invite && (invite.invited.length > 0 || invite.invitedBy)) {
      const lines = invite.invited.map((i) => row(i.name, i.done ? S.friends.reached(invite!.level) : S.friends.playing(invite!.level)));
      if (invite.invitedBy) lines.unshift(row(S.friends.invitedBy(invite.invitedBy.name), invite.invitedBy.done ? S.friends.bothGot : S.friends.bothGet(invite.level)));
      rows.push(label(S.friends.invites(invite.done, invite.invited.length, invite.level)), h('div', { class: 'list' }, ...lines));
    }
    return rows;
  }

  /** The friend code: bug reports on the website want it, and it is in every invite link. */
  function codeRows(): HTMLElement[] {
    if (!invite) return [];
    const code = invite.code;
    const copy = h('button', { class: 'btn', type: 'button' }, S.friends.copy);
    copy.addEventListener('click', () => void copyText(copy, code, S.friends.copy));
    const rows = [label(S.friends.yourCode), h('div', { class: 'list' }, h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'sync-code', 'aria-label': S.friends.yourCodeLabel(code) }, code), h('div', { class: 'row-sub' }, S.crew.codeSub)), copy))];
    // Without a crew the referral link is the way to bring a friend into the game.
    if (!view?.crew) {
      const now = invite;
      const button = h('button', { class: 'btn block', type: 'button' }, S.friends.shareLink);
      button.addEventListener('click', () => void share(button, inviteUrl(now), S.invite.shareText(now.level), S.friends.shareLink));
      rows.push(button, note(S.friends.bothNote(now.level, now.milestones.map((m) => S.friends.ordinal(m.invites)))));
    }
    return rows;
  }

  void syncScores(host.records());
  void render();
  return body;
}
