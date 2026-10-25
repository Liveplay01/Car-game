import { confirmButton, h } from './dom';
import { canPaste, pasteClipboard, peekClipboard } from './clipboard';
import { openSheet, swapView } from './sheets';
import { copy, flash } from './share';
import {
  type CloudView,
  cloudView,
  connectCloud,
  createCloud,
  deleteCloud,
  dismissIncoming,
  keepThisDevice,
  onCloudChange,
  signOutCloud,
  syncNow,
  useCloudSave,
} from '../net/cloud';
import { describeError, loadAccount } from '../net/leaderboard';
import { syncCodeIn } from '../net/pasted';
import type { SaveGame } from '../core/career';
import { Fmt, S } from '../present/strings';

declare global {
  interface Window {
    PasswordCredential?: new (data: { id: string; password: string; name?: string }) => Credential;
  }
}

/**
 * Settings → Cloud sync: keep the progress safe and bring it to another device with a code.
 * Three looks of one sheet: not set up yet (back up, or type a code), set up (the code, how it
 * stands, the way out), and "choose" when the cloud and this device differ (nothing is replaced
 * before the player says which side wins). The state lives in `net/cloud.ts`; this only draws it.
 */

export interface CloudActions {
  /** This device's progress now, for the comparison. */
  current(): SaveGame;
  /** The player took the cloud's progress: it replaces this device's. */
  importSave(save: SaveGame): void;
  /** The player signed out: this device starts empty. */
  signedOut(): void;
  closed(): void;
}

const summary = (s: SaveGame): string => {
  const { level, prestige, money } = s.career;
  return S.cloud.summary(Fmt.number(level), prestige, Fmt.number(money));
};

/** "Saved just now", "Saved 5 min ago". */
function ago(at: number | null): string {
  if (at === null) return S.cloud.saved;
  const minutes = Math.floor((Date.now() - at) / 60_000);
  if (minutes < 1) return S.cloud.savedNow;
  if (minutes < 60) return S.cloud.savedMinutes(minutes);
  return S.cloud.savedHours(Math.floor(minutes / 60));
}

/** What the player typed or pasted, tidied into `K7M2-9QXA-4TFB`. */
const tidy = (text: string): string =>
  text
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12)
    .replace(/(.{4})(?=.)/g, '$1-');

/** What the password manager shows next to the code without a player name: the site. */
const KEEPER_NAME = 'Roundabout Timing';

/**
 * Offers the browser's password manager to keep the sync code, under the player's name as the user name
 * (Leo, 15.10.2026), so a new device only needs the browser's own "fill in" and the player never has to
 * write it down. Chrome and Edge take it directly (Credential Management). Elsewhere a hidden form "signs in"
 * inside a hidden frame, which Firefox and most Safari versions answer with their own "save password?" question.
 * Support differs and a browser may stay silent; the code is on screen either way.
 */
export async function offerToPasswordManager(code: string): Promise<void> {
  const user = loadAccount()?.name ?? KEEPER_NAME;
  const Credential = window.PasswordCredential;
  if (Credential && navigator.credentials?.store) {
    try {
      await navigator.credentials.store(new Credential({ id: user, password: code, name: KEEPER_NAME }));
      return;
    } catch {
      /* refused or unsupported here: the form below is the second try */
    }
  }
  const frame = h('iframe', { name: 'keep-code-frame', title: S.cloud.passwordManager, hidden: true, 'aria-hidden': 'true', tabindex: '-1' });
  const form = h(
    'form',
    // Off screen, not `hidden`: browsers skip fields that are not rendered.
    { method: 'post', action: '/keep-code', target: 'keep-code-frame', 'aria-hidden': 'true', autocomplete: 'on', style: 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none' },
    h('input', { type: 'text', name: 'username', autocomplete: 'username', value: loadAccount()?.name ?? KEEPER_NAME, tabindex: '-1' }),
    h('input', { type: 'password', name: 'password', autocomplete: 'new-password', value: code, tabindex: '-1' }),
  );
  document.body.append(frame, form);
  form.submit();
  window.setTimeout(() => {
    form.remove();
    frame.remove();
  }, 3000);
}

/** What stands in for the sync code until the player asks to see it. */
const MASK = '••••-••••-••••';

/**
 * The sync code row, for this sheet and the player sheet. The code is a secret (whoever has it can load the progress), so it
 * stays masked until Show is tapped and never looks like the public friend code; Copy works without showing it.
 */
export function secretCodeRow(code: string): HTMLElement {
  const value = h('div', { class: 'sync-code secret', 'aria-label': S.cloud.hiddenLabel }, MASK);
  const reveal = h('button', { class: 'btn', type: 'button', 'aria-pressed': 'false' }, S.cloud.reveal);
  reveal.addEventListener('click', () => {
    const shown = reveal.getAttribute('aria-pressed') !== 'true';
    reveal.setAttribute('aria-pressed', String(shown));
    reveal.textContent = shown ? S.cloud.conceal : S.cloud.reveal;
    value.textContent = shown ? code : MASK;
    value.classList.toggle('shown', shown);
    value.setAttribute('aria-label', shown ? S.cloud.yourCodeLabel(code) : S.cloud.hiddenLabel);
  });
  const copyBtn = h('button', { class: 'btn', type: 'button' }, S.cloud.copy);
  copyBtn.addEventListener('click', () => void copy(code).then((r) => r === 'copied' && flash(copyBtn, S.cloud.copied)));
  return h('div', { class: 'row row-stack' }, h('div', { class: 'row-main' }, h('div', { class: 'row-sub' }, S.cloud.yourCode), value), h('div', { class: 'row-actions' }, reveal, copyBtn));
}

const row = (title: string, sub: string, ...extra: HTMLElement[]): HTMLElement =>
  h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), h('div', { class: 'row-sub' }, sub)), ...extra);

export function cloudSheet(layer: HTMLElement, actions: CloudActions): () => void {
  const body = h('div', { class: 'cloud' });
  const problem = h('p', { class: 'field-help error', role: 'alert' });
  problem.hidden = true;
  const say = (message: string): void => {
    problem.textContent = message;
    problem.hidden = message === '';
  };
  let close: () => void = () => undefined;

  /** Runs a call with its button busy; a failure shows as a sentence under the buttons. */
  const run = (button: HTMLButtonElement, work: () => Promise<void>): void => {
    say('');
    button.disabled = true;
    button.classList.add('busy');
    work()
      .catch((error: unknown) => say(describeError(error)))
      .finally(() => {
        button.disabled = false;
        button.classList.remove('busy');
      });
  };

  function off(): HTMLElement[] {
    const input = h('input', {
      class: 'text-input code-input sync-input',
      // A password field, so the browser can fill in the code it saved (with a Show switch below).
      type: 'password',
      name: 'password',
      autocomplete: 'current-password',
      autocapitalize: 'characters',
      spellcheck: 'false',
      enterkeyhint: 'go',
      maxlength: '14',
      placeholder: 'K7M2-9QXA-4TFB',
      'aria-label': S.cloud.codeLabel,
    });
    /** The last code sent, so a code that was refused is not sent again until it is changed. */
    let tried = '';
    // With nothing typed the button pastes the code a friend or another device copied; with a code in the field it loads it.
    const pasting = (): boolean => canPaste() && input.value === '';
    const refresh = (): void => void (load.textContent = pasting() ? S.cloud.paste : S.cloud.load);
    const pasteCode = async (): Promise<void> => {
      const code = syncCodeIn((await pasteClipboard()) ?? '');
      if (!code) return say(S.cloud.pasteNone);
      input.value = tidy(code);
      refresh();
      submit();
    };
    const submit = (): void => {
      if (load.disabled) return;
      if (input.value.replace(/-/g, '').length !== 12) return say(S.cloud.codeShort);
      tried = input.value;
      run(load, () => connectCloud(input.value));
    };
    input.addEventListener('input', () => {
      input.value = tidy(input.value);
      refresh();
      say('');
      // A whole code is all it takes: no need to tap Load (Leo, 05.10.2026).
      if (input.value.replace(/-/g, '').length === 12 && input.value !== tried) submit();
    });
    const load = h('button', { class: 'btn', type: 'submit' }, S.cloud.load);
    refresh();
    // A code copied before the sheet opened is already in the field (quietly, where the browser lets us look): one tap loads it.
    void peekClipboard().then((text) => {
      const code = text && syncCodeIn(text);
      if (code && input.value === '') {
        input.value = tidy(code);
        refresh();
      }
    });
    const backup = h('button', { class: 'btn primary block', type: 'button' }, S.cloud.backUp);
    // Right after the code exists the browser is asked to keep it: one tap on its question is all it takes.
    backup.addEventListener('click', () =>
      run(backup, async () => {
        const code = await createCloud();
        void offerToPasswordManager(code);
      }),
    );
    return [
      h('p', { class: 'section-note' }, S.cloud.offIntro),
      backup,
      h('p', { class: 'section-note cloud-or' }, S.cloud.already),
      h(
        'form',
        {
          class: 'board-form',
          novalidate: true,
          onsubmit: (e: Event) => {
            e.preventDefault();
            if (pasting()) void pasteCode();
            else submit();
          },
        },
        // The browser pairs a saved password with this name.
        h('input', { type: 'text', name: 'username', autocomplete: 'username', value: loadAccount()?.name ?? KEEPER_NAME, tabindex: '-1', 'aria-hidden': 'true', style: 'position:absolute;left:-9999px;opacity:0;pointer-events:none' }),
        h('div', { class: 'join-row' }, input, load),
        h(
          'button',
          {
            class: 'btn block quiet-btn',
            type: 'button',
            onclick: (e: Event) => {
              const show = input.type === 'password';
              input.type = show ? 'text' : 'password';
              (e.currentTarget as HTMLElement).textContent = show ? S.cloud.hideCode : S.cloud.showCode;
            },
          },
          S.cloud.showCode,
        ),
      ),
    ];
  }

  function linked(view: CloudView): HTMLElement[] {
    const state = view.status === 'saving' ? S.cloud.saving : view.status === 'offline' ? S.cloud.offline : ago(view.savedAt);
    const keep = h('button', { class: 'btn', type: 'button' }, S.cloud.keep);
    keep.addEventListener('click', () => {
      void offerToPasswordManager(view.code ?? '');
      keep.textContent = S.cloud.asked;
      window.setTimeout(() => (keep.textContent = S.cloud.keep), 2000);
    });
    const now = h('button', { class: 'btn', type: 'button' }, S.cloud.syncNow);
    now.addEventListener('click', () => run(now, () => syncNow()));
    // With a player the code already stands in its sheet, right under this one: here only how the copy stands and the way out.
    const own = loadAccount() === null;
    return [
      ...(own ? [h('p', { class: 'section-note' }, S.cloud.linkedIntro), h('div', { class: 'list' }, secretCodeRow(view.code ?? ''))] : []),
      h('div', { class: 'list' }, row(S.cloud.cloudCopy, state, now), row(S.cloud.passwordManager, S.cloud.passwordManagerSub, keep)),
      ...(own ? [h('p', { class: 'section-note' }, S.cloud.secret)] : []),
      confirmButton(S.cloud.stop, S.cloud.stopAgain, 'btn block quiet-btn', () =>
        signOutCloud().then(
          () => {
            close();
            actions.signedOut();
          },
          (error: unknown) => say(describeError(error)),
        ),
      ),
      confirmButton(S.cloud.delete, S.cloud.deleteAgain, 'btn block destructive', () => deleteCloud().catch((error: unknown) => say(describeError(error)))),
    ];
  }

  function choose(view: CloudView): HTMLElement[] {
    const cloud = view.incoming;
    const keep = h('button', { class: 'btn block', type: 'button' }, S.cloud.keepDevice);
    const take = h('button', { class: 'btn primary block', type: 'button' }, S.cloud.useCloud);
    take.addEventListener('click', () => {
      const save = useCloudSave();
      if (!save) return;
      const code = cloudView().code;
      if (code) void offerToPasswordManager(code);
      close();
      actions.importSave(save);
    });
    keep.addEventListener('click', () =>
      run(keep, async () => {
        await keepThisDevice();
        const code = cloudView().code;
        if (code) void offerToPasswordManager(code);
      }),
    );
    return [
      h('p', { class: 'section-note' }, S.cloud.differs),
      h('div', { class: 'list' }, row(S.cloud.thisDevice, summary(actions.current())), row(S.cloud.cloud, cloud ? summary(cloud) : '')),
      take,
      ...(view.foreign ? [] : [keep]),
      h('button', { class: 'btn block quiet-btn', type: 'button', onclick: () => dismissIncoming() }, S.cloud.later),
    ];
  }

  let state: 'choose' | 'linked' | 'off' | null = null;

  function render(): void {
    const view = cloudView();
    say('');
    const parts = view.status === 'choose' ? choose(view) : view.code ? linked(view) : off();
    const shown = view.status === 'choose' ? 'choose' : view.code ? 'linked' : 'off';
    const replace = (): void => body.replaceChildren(...parts, problem);
    if (state !== null && shown !== state) swapView(body, replace);
    else replace();
    state = shown;
  }

  const stop = onCloudChange(render);
  render();
  close = openSheet(layer, S.cloud.title, body, () => {
    stop();
    actions.closed();
  });
  return close;
}
