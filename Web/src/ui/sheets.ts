import { h, icon } from './dom';
import { ICONS } from './icons';
import type { Settings, SaveGame } from '../core/career';
import type { PatchNote, PatchImpact } from '../present/patchNotes';
import { LEGAL_DOCS, type LegalDoc, type LegalId } from '../present/legal';
import type { License } from '../present/licenses';
import { parseImport } from '../storage/save';
import { inPortal, isInstalled, isIos } from '../storage/device';

interface OpenSheet {
  root: HTMLElement;
  close: () => void;
}

let current: OpenSheet | null = null;

/**
 * A bottom sheet (like an iOS sheet): scrim, grabber, focus kept inside,
 * Escape and a tap on the scrim close it.
 */
export function openSheet(layer: HTMLElement, title: string, body: HTMLElement, onClose?: () => void): () => void {
  current?.close();
  const previouslyFocused = document.activeElement as HTMLElement | null;
  const titleId = `sheet-${Math.random().toString(36).slice(2, 8)}`;
  const closeBtn = h('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: () => close() }, icon(ICONS.close));
  const sheet = h(
    'div',
    { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    h('div', { class: 'grabber', 'aria-hidden': 'true' }),
    h('div', { class: 'sheet-head' }, h('h2', { class: 'sheet-title', id: titleId }, title), closeBtn),
    body,
  );
  const scrim = h('div', { class: 'sheet-scrim', onclick: () => close() });
  const root = h('div', { class: 'sheet-root' }, scrim, sheet);
  let closed = false;
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      const focusable = Array.from(sheet.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]):not([type="hidden"]), [href], [tabindex]:not([tabindex="-1"])'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    e.stopPropagation();
  };
  function close(): void {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    root.classList.add('closing');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => root.remove(), reduce ? 0 : 200);
    if (current?.root === root) current = null;
    previouslyFocused?.focus?.();
    onClose?.();
  }
  document.addEventListener('keydown', onKey, true);
  layer.append(root);
  current = { root, close };
  const firstAction = sheet.querySelector<HTMLElement>('.sheet-actions button, .list button');
  (firstAction ?? closeBtn).focus({ preventScroll: true });
  return close;
}

/**
 * iPhone and iPad (Leo, 30.09.2026): the Home Screen tip takes the whole screen and stays until
 * it is confirmed. Safari clears a site's storage after a week without a visit; from the Home
 * Screen the progress stays, and the game plays full screen. Only the button closes it.
 */
export function installDialog(layer: HTMLElement, ipad: boolean, onDone: () => void): void {
  const previouslyFocused = document.activeElement as HTMLElement | null;
  const step = (n: number, text: string, glyph: string): HTMLElement =>
    h('li', { class: 'install-step' }, h('span', { class: 'install-num', 'aria-hidden': 'true' }, String(n)), h('span', { class: 'install-text' }, text), h('span', { class: 'install-glyph', 'aria-hidden': 'true' }, icon(glyph)));
  const ok = h('button', { class: 'btn primary block', type: 'button' }, 'Got it');
  const root = h(
    'div',
    { class: 'install-root', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'install-title', 'aria-describedby': 'install-why' },
    h(
      'div',
      { class: 'install-card' },
      h('div', { class: 'install-badge', 'aria-hidden': 'true' }, icon(ICONS.game)),
      h('h2', { class: 'install-title', id: 'install-title' }, 'Keep your progress safe'),
      h('p', { class: 'install-why', id: 'install-why' }, 'Safari deletes the progress of a website you have not opened for a week. Put Roundabout Timing on your Home Screen: your progress stays, and it plays full screen like an app.'),
      h(
        'ol',
        { class: 'install-steps' },
        step(1, ipad ? 'Tap Share at the top of Safari' : 'Tap Share at the bottom of Safari', ICONS.share),
        step(2, 'Scroll down and tap “Add to Home Screen”', ICONS.plus),
        step(3, 'Tap “Add”, then start the game from its icon', ICONS.check),
      ),
      ok,
    ),
  );
  const onKey = (e: KeyboardEvent): void => {
    // Nothing but the button leaves: Escape and Tab stay inside.
    if (e.key === 'Escape' || e.key === 'Tab') e.preventDefault();
    e.stopPropagation();
  };
  ok.addEventListener('click', () => {
    document.removeEventListener('keydown', onKey, true);
    root.classList.add('closing');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => root.remove(), reduce ? 0 : 200);
    previouslyFocused?.focus?.();
    onDone();
  });
  document.addEventListener('keydown', onKey, true);
  layer.append(root);
  ok.focus({ preventScroll: true });
}

export const closeAnySheet = (): void => current?.close();
export const isSheetOpen = (): boolean => current !== null;

/** Settings → What's new: the patch notes, newest first. */
/** How much an update changes, as its badge says it (colour and word, never colour alone). */
const IMPACT: Record<PatchImpact, string> = { major: 'Big update', minor: 'Update', fix: 'Fixes' };

/**
 * What's new: every update folds open and shut (a native disclosure, so keys and screen
 * readers know it); the newest is open. A badge beside each says how much it changes.
 */
export function patchNotesSheet(layer: HTMLElement, notes: PatchNote[], onClose: () => void): () => void {
  const body = h(
    'div',
    { class: 'notes' },
    ...notes.map((note, i) =>
      h(
        'details',
        { class: 'note', open: i === 0 },
        h(
          'summary',
          { class: 'note-head' },
          h(
            'div',
            { class: 'note-heading' },
            h('div', { class: 'note-meta' }, h('span', { class: 'note-date' }, note.date), h('span', { class: `impact impact-${note.impact}` }, IMPACT[note.impact])),
            h('h3', { class: 'note-title' }, note.title),
          ),
          icon(ICONS.chevronDown, {}),
        ),
        h('ul', { class: 'note-items' }, ...note.items.map((item) => h('li', {}, item))),
      ),
    ),
  );
  return openSheet(layer, "What's new", body, onClose);
}

/** Privacy Policy or Imprint, as plain reading text. Links leave the game in a new tab. */
export function legalSheet(layer: HTMLElement, doc: LegalDoc, onClose: () => void): () => void {
  const body = h(
    'div',
    { class: 'legal' },
    ...doc.sections.flatMap((section) => [
      section.heading ? h('h3', {}, section.heading) : null,
      ...(section.paragraphs ?? []).map((p) => h('p', {}, p)),
      section.list ? h('ul', {}, ...section.list.map((item) => h('li', {}, item))) : null,
      ...(section.after ?? []).map((p) => h('p', {}, p)),
      section.link ? h('p', {}, h('a', { href: section.link[1], target: '_blank', rel: 'noopener noreferrer' }, section.link[0])) : null,
    ]),
  );
  return openSheet(layer, doc.title, body, onClose);
}

/** The open-source code in the game, each with its license text. */
export function licensesSheet(layer: HTMLElement, licenses: License[], onClose: () => void): () => void {
  const body = h(
    'div',
    { class: 'legal' },
    h('p', {}, 'Roundabout Timing uses this open-source software. Thank you to its authors.'),
    ...licenses.flatMap((l) => [h('h3', {}, `${l.name} · ${l.license}`), h('pre', {}, l.text)]),
  );
  return openSheet(layer, 'Licenses', body, onClose);
}

/** A row that opens a page, the whole row tappable. */
function linkRow(title: string, sub: string, onOpen: () => void): HTMLElement {
  return h(
    'button',
    { class: 'row row-link', type: 'button', onclick: onOpen },
    h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), h('div', { class: 'row-sub' }, sub)),
    icon(ICONS.chevronRight),
  );
}

export interface SettingsActions {
  changed(settings: Settings): void;
  /** The patch notes; `notesUnread` lights the row until they are opened. */
  openNotes(): void;
  notesUnread: boolean;
  /** Privacy Policy, Imprint or the open-source licenses, over the settings. */
  openLegal(page: LegalId | 'licenses'): void;
  reset(): void;
  /** The save as file text, for Export progress. */
  exportText(): string;
  importSave(save: SaveGame): void;
  install: (() => void) | null;
  closed(): void;
}

function switchRow(title: string, sub: string | null, on: boolean, onChange: (on: boolean) => void): HTMLElement {
  const sw = h('button', { class: 'switch', role: 'switch', 'aria-checked': String(on), 'aria-label': title });
  sw.addEventListener('click', () => {
    const next = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', String(next));
    onChange(next);
  });
  const row = h('div', { class: 'row switch-row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), sub ? h('div', { class: 'row-sub' }, sub) : null), sw);
  // As on iOS the whole row flips the switch, not only the 51 × 31 switch itself.
  row.addEventListener('click', (e) => {
    if (e.target !== sw) sw.click();
  });
  return row;
}

export function settingsSheet(layer: HTMLElement, s: Settings, actions: SettingsActions): () => void {
  const hasVibration = typeof navigator.vibrate === 'function';
  const motionOptions: [Settings['reduceMotion'], string][] = [
    ['system', 'System'],
    ['on', 'On'],
    ['off', 'Off'],
  ];
  const motionSeg = h('div', { class: 'segmented', role: 'group', 'aria-label': 'Reduce motion' });
  const thumb = h('span', { class: 'thumb', 'aria-hidden': 'true' });
  thumb.style.width = 'calc((100% - 4px) / 3)';
  motionSeg.append(thumb);
  const setMotion = (value: Settings['reduceMotion']): void => {
    motionSeg.querySelectorAll('button').forEach((b, i) => {
      const on = b.dataset.value === value;
      b.setAttribute('aria-pressed', String(on));
      if (on) thumb.style.transform = `translateX(${i * 100}%)`;
    });
  };
  for (const [value, label] of motionOptions) {
    const b = h('button', { type: 'button', 'data-value': value }, label);
    b.style.minWidth = '72px';
    b.addEventListener('click', () => {
      s.reduceMotion = value;
      s.motionChosen = value === 'system';
      setMotion(value);
      actions.changed(s);
    });
    motionSeg.append(b);
  }
  setMotion(s.reduceMotion);

  let installRow: HTMLElement | null = null;
  if (!isInstalled() && !inPortal) {
    if (actions.install) {
      installRow = h(
        'div',
        { class: 'row' },
        h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, 'Install the game'), h('div', { class: 'row-sub' }, 'Full screen, offline, one tap from your home screen.')),
        h('button', { class: 'btn primary', onclick: () => actions.install?.() }, 'Install'),
      );
    } else if (isIos()) {
      installRow = h(
        'div',
        { class: 'row' },
        h(
          'div',
          { class: 'row-main' },
          h('div', { class: 'row-title' }, 'Add to Home Screen'),
          h('div', { class: 'row-sub' }, 'In Safari, tap Share, then “Add to Home Screen” to play full screen and offline.'),
        ),
        icon(ICONS.share),
      );
      installRow.querySelector('svg')?.setAttribute('width', '22');
    }
  }

  const progressList = progressRows(actions, () => close());

  const resetBtn = h('button', { class: 'btn block destructive' }, 'Reset progress');
  let armed = false;
  resetBtn.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      resetBtn.textContent = 'Tap again to erase everything';
      window.setTimeout(() => {
        armed = false;
        resetBtn.textContent = 'Reset progress';
      }, 3000);
      return;
    }
    close();
    actions.reset();
  });

  const body = h(
    'div',
    {},
    h(
      'div',
      { class: 'list' },
      switchRow('Sound effects', null, s.sound, (on) => {
        s.sound = on;
        actions.changed(s);
      }),
      switchRow('Music', null, s.music, (on) => {
        s.music = on;
        actions.changed(s);
      }),
      switchRow('Haptics', hasVibration ? null : 'Not available in this browser', s.haptics, (on) => {
        s.haptics = on;
        actions.changed(s);
      }),
      switchRow('Vehicle labels', 'Names the special vehicles on the road.', s.vehicleLabels, (on) => {
        s.vehicleLabels = on;
        actions.changed(s);
      }),
      switchRow('Left-handed', 'Puts the buttons over the game on the left.', s.leftHanded, (on) => {
        s.leftHanded = on;
        actions.changed(s);
      }),
      switchRow('Larger text', 'Notices and cards over the game a step larger.', s.largeText, (on) => {
        s.largeText = on;
        actions.changed(s);
      }),
      h(
        'div',
        { class: 'row' },
        h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, 'Reduce motion'), h('div', { class: 'row-sub' }, 'No shake, slow-mo or flying parts.')),
      ),
    ),
    h('div', { style: 'display:flex;justify-content:flex-end;margin:10px 0 24px' }, motionSeg),
    installRow ? h('div', { class: 'list', style: 'margin-bottom:24px' }, installRow) : null,
    h(
      'div',
      { class: 'list', style: 'margin-bottom:24px' },
      h(
        'div',
        { class: 'row' },
        h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, "What's new"), h('div', { class: 'row-sub' }, 'Patch notes and updates.')),
        actions.notesUnread ? h('span', { class: 'new-pill' }, 'New') : null,
        h('button', { class: 'btn', type: 'button', onclick: () => actions.openNotes() }, 'Open'),
      ),
    ),
    h(
      'p',
      { class: 'section-note', style: 'margin:0 4px 8px' },
      inPortal
        ? 'Log in to CrazyGames to keep your progress on every device. You can also export it here as a file.'
        : 'Your progress is saved on this device. To move it, export it here and import the file on the other device.',
    ),
    progressList,
    resetBtn,
    h('p', { class: 'section-note', style: 'margin:24px 4px 8px' }, 'Legal'),
    h(
      'div',
      { class: 'list', style: 'margin-bottom:8px' },
      ...LEGAL_DOCS.map((doc) => linkRow(doc.title, doc.sub, () => actions.openLegal(doc.id))),
      linkRow('Licenses', 'Open-source software in the game.', () => actions.openLegal('licenses')),
    ),
  );
  const close = openSheet(layer, 'Settings', body, () => actions.closed());
  return close;
}

/** Export and import of the whole progress, for moving to another device. */
function progressRows(actions: SettingsActions, closeSheet: () => void): HTMLElement {
  const exportSub = h('div', { class: 'row-sub' }, 'A file with your level, money, upgrades and collection.');
  const exportBtn = h('button', { class: 'btn', type: 'button' }, 'Export');
  exportBtn.addEventListener('click', () => {
    const day = new Date().toISOString().slice(0, 10);
    const name = `roundabout-timing-save-${day}.json`;
    const text = actions.exportText();
    const file = new File([text], name, { type: 'application/json' });
    // On a phone the share sheet (AirDrop, messages, Files) is the natural way to hand it over.
    const touch = window.matchMedia('(pointer: coarse)').matches;
    if (touch && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Roundabout Timing progress' }).catch(() => {
        /* cancelled */
      });
      return;
    }
    const url = URL.createObjectURL(file);
    const link = h('a', { href: url, download: name });
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    exportSub.textContent = `Saved as ${name}.`;
  });

  const importSub = h('div', { class: 'row-sub' }, 'Replaces the progress on this device.');
  const importBtn = h('button', { class: 'btn', type: 'button' }, 'Import');
  const picker = h('input', { type: 'file', accept: '.json,application/json', hidden: true, 'aria-hidden': 'true', tabindex: '-1' });
  let pending: SaveGame | null = null;
  const showPending = (save: SaveGame | null, error: string | null): void => {
    pending = save;
    importSub.classList.toggle('error', error !== null);
    if (error !== null) {
      importSub.textContent = error;
      importBtn.textContent = 'Import';
      importBtn.classList.remove('destructive');
    } else if (save) {
      const money = save.career.money.toLocaleString('en-US');
      importSub.textContent = `Level ${save.career.level} · ${money} coins. Replace the progress on this device?`;
      importBtn.textContent = 'Replace';
      importBtn.classList.add('destructive');
    }
  };
  picker.addEventListener('change', () => {
    const chosen = picker.files?.[0];
    picker.value = '';
    if (!chosen) return;
    chosen
      .text()
      .then((text) => {
        const save = parseImport(text);
        showPending(save, save ? null : 'That file is not a Roundabout Timing save.');
      })
      .catch(() => showPending(null, 'That file could not be read.'));
  });
  importBtn.addEventListener('click', () => {
    if (!pending) {
      picker.click();
      return;
    }
    const save = pending;
    closeSheet();
    actions.importSave(save);
  });

  return h(
    'div',
    { class: 'list', style: 'margin-bottom:24px' },
    h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, 'Export progress'), exportSub), exportBtn),
    h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, 'Import progress'), importSub), importBtn, picker),
  );
}
