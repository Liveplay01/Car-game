import { h, icon } from './dom';
import { ICONS } from './icons';
import type { Settings, SaveGame } from '../core/career';
import { parseImport } from '../storage/save';

interface OpenSheet {
  root: HTMLElement;
  close: () => void;
}

let current: OpenSheet | null = null;

/**
 * A bottom sheet (the web stand-in for SwiftUI's `.sheet`): scrim, grabber, focus kept inside,
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
      const focusable = Array.from(sheet.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));
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

export const closeAnySheet = (): void => current?.close();
export const isSheetOpen = (): boolean => current !== null;

export interface SettingsActions {
  changed(settings: Settings): void;
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
  return h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), sub ? h('div', { class: 'row-sub' }, sub) : null), sw);
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
      setMotion(value);
      actions.changed(s);
    });
    motionSeg.append(b);
  }
  setMotion(s.reduceMotion);

  const isIos = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  let installRow: HTMLElement | null = null;
  if (!standalone) {
    if (actions.install) {
      installRow = h(
        'div',
        { class: 'row' },
        h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, 'Install the game'), h('div', { class: 'row-sub' }, 'Full screen, offline, one tap from your home screen.')),
        h('button', { class: 'btn primary', onclick: () => actions.install?.() }, 'Install'),
      );
    } else if (isIos) {
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
      switchRow('Sound', null, s.sound, (on) => {
        s.sound = on;
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
      h(
        'div',
        { class: 'row' },
        h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, 'Reduce motion'), h('div', { class: 'row-sub' }, 'No shake, slow-mo or flying parts.')),
      ),
    ),
    h('div', { style: 'display:flex;justify-content:flex-end;margin:10px 0 24px' }, motionSeg),
    installRow ? h('div', { class: 'list', style: 'margin-bottom:24px' }, installRow) : null,
    h('p', { class: 'section-note', style: 'margin:0 4px 8px' }, 'Your progress is saved on this device. To move it, export it here and import the file on the other device.'),
    progressList,
    resetBtn,
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
    const name = `car-game-save-${day}.json`;
    const text = actions.exportText();
    const file = new File([text], name, { type: 'application/json' });
    // On a phone the share sheet (AirDrop, messages, Files) is the natural way to hand it over.
    const touch = window.matchMedia('(pointer: coarse)').matches;
    if (touch && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Car Game progress' }).catch(() => {
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
        showPending(save, save ? null : 'That file is not a Car Game save.');
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
