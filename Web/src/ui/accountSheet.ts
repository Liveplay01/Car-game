import { h } from './dom';
import { swapView, openSheet } from './sheets';
import { forgetBoards, nameForm, openAccount } from './ranksPanel';
import { confirmButton, offerToPasswordManager } from './cloudSheet';
import { cloudEnabled, cloudLinked, cloudView, createCloud, onCloudChange } from '../net/cloud';
import { type Records, deleteAccount, describeError, leaderboardEnabled, loadAccount, renameAccount, syncScores } from '../net/leaderboard';
import { inPortal } from '../storage/device';
import { loadPlayerName, savePlayerName } from '../storage/profile';
import { S } from '../present/strings';

/**
 * Your player (Leo, 15.10.2026): one name is the player for everything online. Choosing it opens the leaderboard account
 * (Ranks, the friend code, the multiplayer name) and the Cloud sync copy together, and the browser is asked to keep the name
 * and the sync code like a user name and password. Ranks, Friends and the Club need it (`SocialView`); the game asks for it
 * once after Level 5 (`config.accountPromptAfterLevel`), and "No thanks" asks a second time before it counts. A player who
 * had a name before gets the cloud copy by itself and this sheet as the message with the code (`welcome`).
 */

/** There is a service to have a player on (not in a copy built without `VITE_API_URL`). */
export const accountsEnabled = leaderboardEnabled;

/** This device has its player: a name, and its cloud copy wherever Cloud sync exists. */
export const accountReady = (): boolean => loadAccount() !== null && (!cloudEnabled || cloudLinked());

export interface AccountActions {
  /** The records as the save has them now: they go to the boards as soon as the name exists. */
  records(): Records;
  /** Settings → Cloud sync over this sheet: typing a code from another device, stopping, deleting. */
  openCloud(): void;
  /** "No thanks", confirmed: the game stops asking by itself. */
  declined(): void;
  closed(): void;
}

type View = 'ask' | 'decline' | 'done';

const row = (title: string, sub: string, ...extra: HTMLElement[]): HTMLElement =>
  h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), h('div', { class: 'row-sub' }, sub)), ...extra);

const PERKS = (['ranks', 'friends', 'versus', 'cloud'] as const).filter((id) => (id === 'friends' ? !inPortal : id === 'cloud' ? cloudEnabled : true));

export function accountSheet(layer: HTMLElement, actions: AccountActions, welcome = false): () => void {
  const body = h('div', { class: 'cloud account' });
  const problem = h('p', { class: 'field-help error', role: 'alert' });
  problem.hidden = true;
  const say = (message: string): void => {
    problem.textContent = message;
    problem.hidden = message === '';
  };
  let view: View = accountReady() ? 'done' : 'ask';
  let renaming = false;
  let close: () => void = () => undefined;

  function show(next: View): void {
    view = next;
    say('');
    swapView(body, render);
  }

  /** The rest of the player: the cloud copy (the name travels in it), the records on the boards, the password manager asked. */
  async function complete(): Promise<void> {
    if (cloudEnabled && !cloudLinked()) await createCloud();
    void syncScores(actions.records());
    const code = cloudView().code;
    if (code) void offerToPasswordManager(code);
    show('done');
  }

  async function create(name: string): Promise<string | null> {
    try {
      await openAccount(name);
      await complete();
      return null;
    } catch (error) {
      if (!loadAccount()) return describeError(error);
      // The name is there, only the cloud copy failed: the sheet now asks for that one step.
      render();
      say(describeError(error));
      return null;
    }
  }

  function busyRun(button: HTMLButtonElement, work: () => Promise<void>): void {
    say('');
    button.disabled = true;
    button.classList.add('busy');
    work()
      .catch((error: unknown) => say(describeError(error)))
      .finally(() => {
        button.disabled = false;
        button.classList.remove('busy');
      });
  }

  function ask(): (HTMLElement | null)[] {
    const account = loadAccount();
    const turnOn = h('button', { class: 'btn primary block', type: 'button' }, S.account.turnOn);
    turnOn.addEventListener('click', () => busyRun(turnOn, complete));
    const main = account
      ? [h('p', { class: 'section-note' }, S.account.syncMissing(account.name)), turnOn]
      : [
          h('p', { class: 'section-note' }, S.account.intro),
          h('div', { class: 'list' }, ...PERKS.map((id) => row(S.account.perks[id].title, S.account.perks[id].sub))),
          nameForm(loadPlayerName(), S.account.create, create, null),
        ];
    return [
      ...main,
      cloudEnabled && !account ? h('button', { class: 'btn block quiet-btn', type: 'button', onclick: () => actions.openCloud() }, S.account.haveCode) : null,
      h('button', { class: 'btn block quiet-btn', type: 'button', onclick: () => show('decline') }, S.account.noThanks),
    ];
  }

  function decline(): HTMLElement[] {
    return [
      h('p', { class: 'section-note' }, S.account.declineWhy),
      h('button', { class: 'btn primary block', type: 'button', onclick: () => show('ask') }, S.account.declineBack),
      h(
        'button',
        {
          class: 'btn block destructive',
          type: 'button',
          onclick: () => {
            actions.declined();
            close();
          },
        },
        S.account.declineSure,
      ),
    ];
  }

  /** Settings → Account is the only place the name changes (Leo, 15.10.2026): the boards, friends and multiplayer follow. */
  async function rename(name: string): Promise<string | null> {
    const account = loadAccount();
    if (account && name !== account.name) {
      try {
        savePlayerName((await renameAccount(account, name)).name);
      } catch (error) {
        if (loadAccount()) return describeError(error);
      }
    }
    renaming = false;
    show(accountReady() ? 'done' : 'ask');
    return null;
  }

  function done(): (HTMLElement | null)[] {
    const name = loadAccount()?.name ?? '';
    if (renaming) {
      return [
        h('p', { class: 'section-note' }, S.ranks.nameSub),
        nameForm(name, S.ranks.save, rename, () => {
          renaming = false;
          show('done');
        }),
      ];
    }
    const change = h('button', { class: 'btn', type: 'button' }, S.ranks.change);
    change.addEventListener('click', () => {
      renaming = true;
      show('done');
      body.querySelector('input')?.focus();
    });
    const code = cloudView().code;
    const copy = h('button', { class: 'btn', type: 'button' }, S.cloud.copy);
    copy.addEventListener('click', () => {
      if (!code) return;
      navigator.clipboard?.writeText(code).then(
        () => {
          copy.textContent = S.cloud.copied;
          window.setTimeout(() => (copy.textContent = S.cloud.copy), 1500);
        },
        () => window.prompt(S.friends.copyPrompt, code),
      );
    });
    const keep = h('button', { class: 'btn', type: 'button' }, S.cloud.keep);
    keep.addEventListener('click', () => {
      if (code) void offerToPasswordManager(code);
      keep.textContent = S.cloud.asked;
      window.setTimeout(() => (keep.textContent = S.cloud.keep), 2000);
    });
    return [
      h('p', { class: 'section-note' }, welcome ? S.account.welcome(name) : code ? S.account.done(name) : S.account.doneLocal(name)),
      h('div', { class: 'list' }, row(S.account.nameLabel, name, change)),
      code
        ? h(
            'div',
            { class: 'list' },
            h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-sub' }, S.cloud.yourCode), h('div', { class: 'sync-code', 'aria-label': S.cloud.yourCodeLabel(code) }, code)), copy),
            row(S.cloud.passwordManager, S.account.keepSub, keep),
          )
        : null,
      code ? h('p', { class: 'section-note' }, S.account.codeNote) : null,
      h('button', { class: 'btn primary block', type: 'button', onclick: () => close() }, S.account.finish),
      code ? h('button', { class: 'btn block quiet-btn', type: 'button', onclick: () => actions.openCloud() }, S.account.manage) : null,
      confirmButton(
        S.ranks.remove,
        S.ranks.removeAgain,
        async () => {
          const account = loadAccount();
          if (account) await deleteAccount(account);
          forgetBoards();
          show('ask');
        },
        say,
      ),
    ];
  }

  function render(): void {
    const parts = view === 'decline' ? decline() : view === 'done' ? done() : ask();
    body.replaceChildren(...parts.filter((part): part is HTMLElement => part !== null), problem);
  }

  // A code typed in Cloud sync over this sheet brings the player with it.
  const stop = onCloudChange(() => {
    if (view === 'ask' && accountReady()) show('done');
    else if (view === 'done') render();
  });
  render();
  close = openSheet(layer, S.account.title, body, () => {
    stop();
    actions.closed();
  });
  if (welcome) {
    const code = cloudView().code;
    if (code) void offerToPasswordManager(code);
  }
  return close;
}
