import { h } from './dom';
import { openSheet, fadeIn } from './sheets';
import {
  type CloudView,
  cloudView,
  connectCloud,
  createCloud,
  deleteCloud,
  dismissIncoming,
  keepThisDevice,
  onCloudChange,
  stopCloud,
  syncNow,
  useCloudSave,
} from '../net/cloud';
import { describeError } from '../net/leaderboard';
import type { SaveGame } from '../core/career';
import { Fmt } from '../present/strings';

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
  closed(): void;
}

const summary = (s: SaveGame): string => {
  const { level, prestige, money } = s.career;
  return `Level ${Fmt.number(level)}${prestige > 0 ? ` · ★${prestige}` : ''} · ${Fmt.number(money)} coins`;
};

/** "Saved just now", "Saved 5 min ago". */
function ago(at: number | null): string {
  if (at === null) return 'Saved';
  const minutes = Math.floor((Date.now() - at) / 60_000);
  if (minutes < 1) return 'Saved just now';
  if (minutes < 60) return `Saved ${minutes} min ago`;
  return `Saved ${Math.floor(minutes / 60)} h ago`;
}

/** What the player typed or pasted, tidied into `K7M2-9QXA-4TFB`. */
const tidy = (text: string): string =>
  text
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12)
    .replace(/(.{4})(?=.)/g, '$1-');

/** What the password manager shows next to the code: the site, not a person. */
const KEEPER_NAME = 'Roundabout Timing';

/**
 * Offers the browser's password manager to keep the sync code, so a new device only needs the
 * browser's own "fill in" and the player never has to write it down. Chrome and Edge take it
 * directly (Credential Management). Elsewhere a hidden form "signs in" inside a hidden frame,
 * which Firefox and most Safari versions answer with their own "save password?" question.
 * Support differs and a browser may stay silent; the code is on screen either way.
 */
async function offerToPasswordManager(code: string): Promise<void> {
  const Credential = window.PasswordCredential;
  if (Credential && navigator.credentials?.store) {
    try {
      await navigator.credentials.store(new Credential({ id: KEEPER_NAME, password: code, name: KEEPER_NAME }));
      return;
    } catch {
      /* refused or unsupported here: the form below is the second try */
    }
  }
  const frame = h('iframe', { name: 'keep-code-frame', title: 'Password manager', hidden: true, 'aria-hidden': 'true', tabindex: '-1' });
  const form = h(
    'form',
    // Off screen, not `hidden`: browsers skip fields that are not rendered.
    { method: 'post', action: '/keep-code', target: 'keep-code-frame', 'aria-hidden': 'true', autocomplete: 'on', style: 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none' },
    h('input', { type: 'text', name: 'username', autocomplete: 'username', value: KEEPER_NAME, tabindex: '-1' }),
    h('input', { type: 'password', name: 'password', autocomplete: 'new-password', value: code, tabindex: '-1' }),
  );
  document.body.append(frame, form);
  form.submit();
  window.setTimeout(() => {
    form.remove();
    frame.remove();
  }, 3000);
}

const row = (title: string, sub: string, ...extra: HTMLElement[]): HTMLElement =>
  h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), h('div', { class: 'row-sub' }, sub)), ...extra);

/** A button that asks twice (like Remove me from the leaderboard): the second tap does it. */
function confirmButton(label: string, again: string, run: () => Promise<void>, fail: (message: string) => void): HTMLElement {
  const button = h('button', { class: 'btn block destructive', type: 'button' }, label);
  let armed = false;
  button.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      button.textContent = again;
      window.setTimeout(() => {
        if (!button.isConnected) return;
        armed = false;
        button.textContent = label;
      }, 3000);
      return;
    }
    button.disabled = true;
    run().catch((error: unknown) => {
      button.disabled = false;
      armed = false;
      button.textContent = label;
      fail(describeError(error));
    });
  });
  return button;
}

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
      'aria-label': 'Sync code',
    });
    /** The last code sent, so a code that was refused is not sent again until it is changed. */
    let tried = '';
    const submit = (): void => {
      if (load.disabled) return;
      if (input.value.replace(/-/g, '').length !== 12) return say('A sync code has 12 letters and numbers, like K7M2-9QXA-4TFB.');
      tried = input.value;
      run(load, () => connectCloud(input.value));
    };
    input.addEventListener('input', () => {
      input.value = tidy(input.value);
      say('');
      // A whole code is all it takes: no need to tap Load (Leo, 05.10.2026).
      if (input.value.replace(/-/g, '').length === 12 && input.value !== tried) submit();
    });
    const load = h('button', { class: 'btn', type: 'submit' }, 'Load');
    const backup = h('button', { class: 'btn primary block', type: 'button' }, 'Back up to the cloud');
    // Right after the code exists the browser is asked to keep it: one tap on its question is all it takes.
    backup.addEventListener('click', () =>
      run(backup, async () => {
        const code = await createCloud();
        void offerToPasswordManager(code);
      }),
    );
    return [
      h('p', { class: 'section-note' }, 'Keep your progress safe and move it between devices. No account and no password: you get a code, and the code is the key.'),
      backup,
      h('p', { class: 'section-note cloud-or' }, 'Already backed up on another device?'),
      h(
        'form',
        {
          class: 'board-form',
          novalidate: true,
          onsubmit: (e: Event) => {
            e.preventDefault();
            submit();
          },
        },
        // The browser pairs a saved password with this name.
        h('input', { type: 'text', name: 'username', autocomplete: 'username', value: KEEPER_NAME, tabindex: '-1', 'aria-hidden': 'true', style: 'position:absolute;left:-9999px;opacity:0;pointer-events:none' }),
        h('div', { class: 'join-row' }, input, load),
        h(
          'button',
          {
            class: 'btn block quiet-btn',
            type: 'button',
            onclick: (e: Event) => {
              const show = input.type === 'password';
              input.type = show ? 'text' : 'password';
              (e.currentTarget as HTMLElement).textContent = show ? 'Hide the code' : 'Show the code';
            },
          },
          'Show the code',
        ),
      ),
    ];
  }

  function linked(view: CloudView): HTMLElement[] {
    const copy = h('button', { class: 'btn', type: 'button' }, 'Copy');
    copy.addEventListener('click', () => {
      navigator.clipboard?.writeText(view.code ?? '').then(
        () => {
          copy.textContent = 'Copied';
          window.setTimeout(() => (copy.textContent = 'Copy'), 1500);
        },
        () => undefined,
      );
    });
    const state = view.status === 'saving' ? 'Saving…' : view.status === 'offline' ? 'Offline. The newest progress goes up when the connection is back.' : ago(view.savedAt);
    const keep = h('button', { class: 'btn', type: 'button' }, 'Save');
    keep.addEventListener('click', () => {
      void offerToPasswordManager(view.code ?? '');
      keep.textContent = 'Asked';
      window.setTimeout(() => (keep.textContent = 'Save'), 2000);
    });
    const now = h('button', { class: 'btn', type: 'button' }, 'Sync now');
    now.addEventListener('click', () => run(now, () => syncNow()));
    return [
      h('p', { class: 'section-note' }, 'Your progress is copied to the cloud while you play. On another device open Settings → Account → Cloud sync and type this code.'),
      h('div', { class: 'list' }, h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-sub' }, 'Your sync code'), h('div', { class: 'sync-code', 'aria-label': `Your sync code: ${view.code}` }, view.code ?? '')), copy)),
      h('div', { class: 'list' }, row('Cloud copy', state, now), row('Password manager', 'Let your browser remember the code, then it fills it in on a new device.', keep)),
      h('p', { class: 'section-note' }, 'Anyone with this code can load or replace your progress. Keep it private.'),
      h('button', { class: 'btn block quiet-btn', type: 'button', onclick: () => stopCloud() }, 'Stop syncing on this device'),
      confirmButton('Delete the cloud copy', 'Tap again to delete it for every device', () => deleteCloud(), say),
    ];
  }

  function choose(view: CloudView): HTMLElement[] {
    const cloud = view.incoming;
    const keep = h('button', { class: 'btn block', type: 'button' }, 'Keep this device and replace the cloud');
    const take = h('button', { class: 'btn primary block', type: 'button' }, 'Use the cloud progress');
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
      h('p', { class: 'section-note' }, 'The cloud holds different progress than this device. Pick the one to keep; the other one is replaced.'),
      h('div', { class: 'list' }, row('This device', summary(actions.current())), row('Cloud', cloud ? summary(cloud) : '')),
      take,
      keep,
      h('button', { class: 'btn block quiet-btn', type: 'button', onclick: () => dismissIncoming() }, 'Decide later'),
    ];
  }

  let state: 'choose' | 'linked' | 'off' | null = null;

  function render(): void {
    const view = cloudView();
    say('');
    const parts = view.status === 'choose' ? choose(view) : view.code ? linked(view) : off();
    body.replaceChildren(...parts, problem);
    const shown = view.status === 'choose' ? 'choose' : view.code ? 'linked' : 'off';
    if (state !== null && shown !== state) fadeIn(body);
    state = shown;
  }

  const stop = onCloudChange(render);
  render();
  close = openSheet(layer, 'Cloud sync', body, () => {
    stop();
    actions.closed();
  });
  return close;
}
