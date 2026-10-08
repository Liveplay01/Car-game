import { h, icon } from './dom';
import { ICONS, CRAZYGAMES_LOGO, FANDOM_LOGO } from './icons';
import type { Settings } from '../core/career';
import { type PatchNote, type PatchImpact, itemText, itemCredit } from '../present/patchNotes';
import { LEGAL_DOCS, type LegalDoc, type LegalId } from '../present/legal';
import type { License } from '../present/licenses';
import { inItch, inPlayStore, inPortal, isInstalled, isIos } from '../storage/device';
import { cloudEnabled } from '../net/cloud';
import type { PushState } from '../net/push';
import { S } from '../present/strings';

interface OpenSheet {
  root: HTMLElement;
  title: string;
  close: (instant?: boolean) => void;
}

/**
 * The open sheets, the one on top last. A sheet that opens over another leaves it where it is, fixed and
 * out of reach, and rises over it; closing it just lowers it again (Leo, 06.10.2026: the one underneath
 * used to close and come back, which looked like a glitch).
 */
const stack: OpenSheet[] = [];

/**
 * A bottom sheet (like an iOS sheet): scrim, grabber, focus kept inside,
 * Escape and a tap on the scrim close it.
 */
export function openSheet(layer: HTMLElement, title: string, body: HTMLElement, onClose?: () => void): () => void {
  // The same sheet again replaces itself; anything else stacks.
  const same = stack.find((x) => x.title === title);
  same?.close(true);
  const below = stack[stack.length - 1] ?? null;
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
  const root = h('div', { class: below ? 'sheet-root stacked' : 'sheet-root' }, scrim, sheet);
  if (below) below.root.inert = true;
  let closed = false;
  const onKey = (e: KeyboardEvent): void => {
    if (stack[stack.length - 1]?.root !== root) return;
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
  function close(instant = false): void {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    root.classList.add('closing');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (instant) root.remove();
    else window.setTimeout(() => root.remove(), reduce ? 0 : 200);
    const at = stack.findIndex((x) => x.root === root);
    if (at >= 0) stack.splice(at, 1);
    // The sheet under this one is in reach again.
    const top = stack[stack.length - 1];
    if (top) top.root.inert = false;
    previouslyFocused?.focus?.();
    onClose?.();
  }
  document.addEventListener('keydown', onKey, true);
  layer.append(root);
  stack.push({ root, title, close });
  const firstAction = sheet.querySelector<HTMLElement>('.sheet-actions button, .list button');
  (firstAction ?? closeBtn).focus({ preventScroll: true });
  return close;
}

/**
 * A drawer rises with its content (a longer list, another tab, a ranking that arrives) and glides there instead of
 * jumping. It only grows: the tallest tab so far is kept, so switching tabs never makes it sink (Friends and the Leaderboard).
 */
export function glideHeight(body: HTMLElement, content: HTMLElement): void {
  const sheet = body.closest<HTMLElement>('.sheet');
  if (!sheet) return;
  let before = sheet.offsetHeight;
  let tallest = 0;
  new ResizeObserver(() => {
    if (content.isConnected && content.offsetHeight > tallest) {
      tallest = content.offsetHeight;
      content.style.minHeight = `${tallest}px`;
    }
    // Gliding already: the end of it takes the new height as it is.
    if (sheet.style.height) return;
    const after = sheet.offsetHeight;
    if (before > 0 && after !== before) {
      const done = (e: TransitionEvent): void => {
        if (e.target !== sheet || e.propertyName !== 'height') return;
        sheet.removeEventListener('transitionend', done);
        sheet.style.height = '';
        sheet.style.transition = '';
        before = sheet.offsetHeight;
      };
      sheet.style.height = `${before}px`;
      sheet.getBoundingClientRect();
      sheet.style.transition = 'height 240ms var(--ease-drawer)';
      sheet.style.height = `${after}px`;
      sheet.addEventListener('transitionend', done);
      return;
    }
    before = after;
  }).observe(body);
}

/**
 * iPhone and iPad (Leo, 30.09.2026): the Home Screen tip takes the whole screen and stays until
 * it is confirmed. Only the button closes it. Since Cloud sync (Leo, 01.10.2026) it simply
 * recommends the Home Screen; Cloud sync has a pop-up of its own (`cloudIntroDialog`).
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
      h('h2', { class: 'install-title', id: 'install-title' }, 'Add it to your Home Screen'),
      h('p', { class: 'install-why', id: 'install-why' }, 'Roundabout Timing plays best like an app: one tap to start, full screen, and Safari keeps your progress.'),
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

/** Closes every open sheet, the top one first; `instant` for a sheet that is replaced by a page of its own. */
export const closeAnySheet = (instant = false): void => {
  for (const open of [...stack].reverse()) open.close(instant);
};
export const isSheetOpen = (): boolean => stack.length > 0;

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
        h(
          'ul',
          { class: 'note-items' },
          ...note.items.map((item) => {
            const credit = itemCredit(item);
            return h('li', {}, itemText(item), credit ? h('span', { class: 'note-credit' }, credit) : null);
          }),
        ),
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

/**
 * A small one-time pop-up from Level 3 (`config.cloudIntroFromLevel`): Cloud sync exists, and where to find it. "Open Cloud
 * sync" goes straight there; "Maybe later" closes it (Escape and a tap outside too). It is shown
 * once per device (`cloudIntroDue`), and the page itself stays in Settings.
 */
export function cloudIntroDialog(layer: HTMLElement, actions: { open(): void; closed(): void }): void {
  const previouslyFocused = document.activeElement as HTMLElement | null;
  const step = (n: number, text: string, glyph: string): HTMLElement =>
    h('li', { class: 'install-step' }, h('span', { class: 'install-num', 'aria-hidden': 'true' }, String(n)), h('span', { class: 'install-text' }, text), h('span', { class: 'install-glyph', 'aria-hidden': 'true' }, icon(glyph)));
  const open = h('button', { class: 'btn primary block', type: 'button' }, 'Open Cloud sync');
  const later = h('button', { class: 'btn block quiet-btn', type: 'button' }, 'Maybe later');
  const card = h(
    'div',
    { class: 'intro-card', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'intro-title', 'aria-describedby': 'intro-why' },
    h('div', { class: 'install-badge', 'aria-hidden': 'true' }, icon(ICONS.gear)),
    h('h2', { class: 'install-title intro-title', id: 'intro-title' }, 'Cloud sync'),
    h('p', { class: 'install-why', id: 'intro-why' }, 'Back up your progress and carry on with any device using a short code. No account and no password.'),
    h(
      'ol',
      { class: 'install-steps' },
      step(1, 'Tap the gear for Settings', ICONS.gear),
      step(2, 'Open “Cloud sync”', ICONS.chevronRight),
      step(3, 'Back up, or type a code from another device', ICONS.check),
    ),
    open,
    later,
  );
  const root = h('div', { class: 'intro-root' }, card);
  const finish = (): void => {
    document.removeEventListener('keydown', onKey, true);
    root.classList.add('closing');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => root.remove(), reduce ? 0 : 200);
    previouslyFocused?.focus?.();
  };
  const onKey = (e: KeyboardEvent): void => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      finish();
      actions.closed();
    } else if (e.key === 'Tab') {
      // Focus stays on the two buttons.
      e.preventDefault();
      (document.activeElement === open ? later : open).focus();
    }
  };
  open.addEventListener('click', () => {
    finish();
    actions.open();
  });
  later.addEventListener('click', () => {
    finish();
    actions.closed();
  });
  root.addEventListener('click', (e) => {
    if (e.target === root) later.click();
  });
  document.addEventListener('keydown', onKey, true);
  layer.append(root);
  open.focus({ preventScroll: true });
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

/** The game's page on CrazyGames (Leo, 01.10.2026). Not shown inside CrazyGames itself. */
const CRAZYGAMES_PAGE = 'https://www.crazygames.com/game/roundabout-timing';

/** The game's homepage (Leo, 02.10.2026). Not shown inside CrazyGames, which keeps players on its own site. */
const WEBSITE_PAGE = 'https://timing.love/';

/** The community wiki on Fandom (Leo, 01.10.2026). */
const WIKI_PAGE = 'https://roundabout.fandom.com/';

/** A row that opens a page elsewhere, with the brand's mark in front. */
function externalRow(href: string, logo: string, title: string, sub: string): HTMLElement {
  return h(
    'a',
    { class: 'row row-link', href, target: '_blank', rel: 'noopener' },
    h('span', { class: 'row-logo', html: logo }),
    h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), h('div', { class: 'row-sub' }, sub)),
    icon(ICONS.external),
  );
}

const crazyGamesRow = (): HTMLElement =>
  externalRow(CRAZYGAMES_PAGE, CRAZYGAMES_LOGO, 'Roundabout Timing on CrazyGames', 'Our official page. Rate the game and share it.');

const websiteRow = (): HTMLElement =>
  externalRow(WEBSITE_PAGE, '<img src="/icons/icon-192.png" alt="" width="30" height="30" decoding="async" />', 'Roundabout Timing Website', 'timing.love: the game, a trailer and the FAQ.');

const wikiRow = (): HTMLElement => externalRow(WIKI_PAGE, FANDOM_LOGO, 'Roundabout Timing Wiki', 'Guides, vehicles and tips from the community.');

export interface SettingsActions {
  changed(settings: Settings): void;
  /** The patch notes; `notesUnread` lights the row until they are opened. */
  openNotes(): void;
  notesUnread: boolean;
  /** Privacy Policy, Imprint or the open-source licenses, over the settings. */
  openLegal(page: LegalId | 'licenses'): void;
  /** Delete account: a drawer over the settings explains what goes and asks once more. */
  openDeleteAccount(): void;
  /** Cloud sync (a sync code), over the settings. */
  openCloud(): void;
  /** Cloud sync is on for this device (the row says so). */
  cloudOn: boolean;
  /** The player's friend code, if they have a name: it fills in the bug form on the website. */
  friendCode: (() => Promise<string | null>) | null;
  install: (() => void) | null;
  /** Notifications on this device (`net/push.ts`); null where there are none (inside a portal, no service). */
  push: { state: PushState; toggle(on: boolean): Promise<PushState> } | null;
  closed(): void;
}

/**
 * The notifications switch. Turning it on asks the browser, so the switch waits for the answer and
 * shows what came of it; where it cannot be turned on (blocked, not on the Home Screen) it says why.
 */
function pushRow(push: NonNullable<SettingsActions['push']>): HTMLElement {
  const sub = h('div', { class: 'row-sub' });
  const sw = h('button', { class: 'switch', role: 'switch', 'aria-label': S.push.row });
  const show = (state: PushState): void => {
    sw.setAttribute('aria-checked', String(state === 'on'));
    sw.disabled = state === 'blocked' || state === 'install';
    sub.textContent = state === 'blocked' ? S.push.rowBlocked : state === 'install' ? S.push.rowInstall : S.push.rowSub;
  };
  show(push.state);
  sw.addEventListener('click', () => {
    const on = sw.getAttribute('aria-checked') !== 'true';
    sw.setAttribute('aria-checked', String(on));
    sw.disabled = true;
    push
      .toggle(on)
      .then(show)
      .catch(() => {
        show(on ? 'off' : 'on');
        sub.textContent = S.push.failed;
      });
  });
  const row = h('div', { class: 'row switch-row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, S.push.row), sub), sw);
  row.addEventListener('click', (e) => {
    if (e.target !== sw && !sw.disabled) sw.click();
  });
  return row;
}

/**
 * Offered once, when a Daily streak reaches two days (`notifications` hint): a reminder before it
 * breaks is the one notification a player is most glad of. "Turn on" asks the browser right away.
 */
export function pushOfferDialog(layer: HTMLElement, actions: { enable(): void; closed(): void }): void {
  const previouslyFocused = document.activeElement as HTMLElement | null;
  const on = h('button', { class: 'btn primary block', type: 'button' }, S.push.offerOn);
  const later = h('button', { class: 'btn block quiet-btn', type: 'button' }, S.push.offerLater);
  const card = h(
    'div',
    { class: 'intro-card', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'push-title', 'aria-describedby': 'push-why' },
    h('div', { class: 'install-badge', 'aria-hidden': 'true' }, icon(ICONS.bell)),
    h('h2', { class: 'install-title intro-title', id: 'push-title' }, S.push.offerTitle),
    h('p', { class: 'install-why', id: 'push-why' }, S.push.offerWhy),
    on,
    later,
  );
  const root = h('div', { class: 'intro-root' }, card);
  const finish = (): void => {
    document.removeEventListener('keydown', onKey, true);
    root.classList.add('closing');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => root.remove(), reduce ? 0 : 200);
    previouslyFocused?.focus?.();
    actions.closed();
  };
  const onKey = (e: KeyboardEvent): void => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      finish();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      (document.activeElement === on ? later : on).focus();
    }
  };
  // The browser asks only from inside the tap itself.
  on.addEventListener('click', () => {
    actions.enable();
    finish();
  });
  later.addEventListener('click', finish);
  document.addEventListener('keydown', onKey, true);
  layer.append(root);
  on.focus({ preventScroll: true });
}

/** Build with us (Leo, 03.10.2026): the two forms on the website. */
export const BUILD_PAGE = `${WEBSITE_PAGE}build`;

const buildLink = (form: 'bug' | 'idea', code: string | null): string => `${BUILD_PAGE}${code && form === 'bug' ? `?code=${encodeURIComponent(code)}` : ''}#${form}`;

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

/** A group of rows with a plain header above it, as in iOS Settings. */
function group(title: string, ...rows: (HTMLElement | null)[]): HTMLElement | null {
  const kept = rows.filter((r): r is HTMLElement => r !== null);
  if (kept.length === 0) return null;
  const id = `set-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  return h('section', { class: 'settings-group', 'aria-labelledby': id }, h('h3', { class: 'settings-header', id }, title), h('div', { class: 'list' }, ...kept));
}

/** A coloured icon tile in front of a row, as in iOS Settings. */
const tile = (glyph: string, tone: string): HTMLElement => h('span', { class: `row-tile tile-${tone}`, 'aria-hidden': 'true' }, icon(glyph));

/** A row that leaves for the website, with an icon tile in front. */
function tileExternalRow(glyph: string, tone: string, title: string, sub: string, href: string): HTMLAnchorElement {
  return h(
    'a',
    { class: 'row row-link', href, target: '_blank', rel: 'noopener' },
    tile(glyph, tone),
    h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), h('div', { class: 'row-sub' }, sub)),
    icon(ICONS.external),
  ) as HTMLAnchorElement;
}

/** `linkRow` with an optional tile in front and something before the chevron (a pill). */
function richLinkRow(title: string, sub: string, onOpen: () => void, front: HTMLElement | null, extra: HTMLElement | null): HTMLElement {
  const row = linkRow(title, sub, onOpen);
  if (front) row.prepend(front);
  if (extra) row.insertBefore(extra, row.lastChild);
  return row;
}

/**
 * Settings, tidied up (Leo, 03.10.2026): what players change most sits on top (Game feel,
 * Sound, Cloud sync), then Build with us, then links and the legal pages; Delete account last.
 */
export function settingsSheet(layer: HTMLElement, s: Settings, actions: SettingsActions): () => void {
  const hasVibration = typeof navigator.vibrate === 'function';
  const motionOptions: [Settings['reduceMotion'], string][] = [
    ['system', 'System'],
    ['on', 'On'],
    ['off', 'Off'],
  ];
  const motionSeg = h('div', { class: 'segmented motion-seg', role: 'group', 'aria-label': 'Reduce motion' });
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
    b.addEventListener('click', () => {
      s.reduceMotion = value;
      s.motionChosen = value === 'system';
      setMotion(value);
      actions.changed(s);
    });
    motionSeg.append(b);
  }
  setMotion(s.reduceMotion);

  const toggle =
    (key: 'sound' | 'music' | 'mapSounds' | 'haptics' | 'vehicleLabels' | 'leftHanded' | 'largeText') =>
    (on: boolean): void => {
      s[key] = on;
      actions.changed(s);
    };

  let installRow: HTMLElement | null = null;
  if (!isInstalled() && !inPortal && !inItch && !inPlayStore) {
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

  // Build with us: the bug form fills in the friend code once it is known. Not inside CrazyGames,
  // which keeps players on its own site (like the website link).
  let buildGroup: HTMLElement | null = null;
  if (!inPortal) {
    const bugRow = tileExternalRow(ICONS.bug, 'red', 'Report a bug', 'Add your friend code and get the Ladybug skin.', buildLink('bug', null));
    buildGroup = group('Build with us', bugRow, tileExternalRow(ICONS.bulb, 'amber', 'Suggest a feature', 'Tell us what you would add. We read every idea.', buildLink('idea', null)));
    actions
      .friendCode?.()
      .then((code) => {
        if (code) bugRow.href = buildLink('bug', code);
      })
      .catch(() => undefined);
  }

  const cloudRow = cloudEnabled
    ? richLinkRow(
        'Cloud sync',
        actions.cloudOn ? 'On · your progress is backed up.' : 'Back up your progress and play on any device.',
        () => actions.openCloud(),
        tile(ICONS.cloud, 'blue'),
        null,
      )
    : null;

  const body = h(
    'div',
    { class: 'settings' },
    group(
      'Game feel',
      switchRow('Larger text', 'Notices and cards over the game a step larger.', s.largeText, toggle('largeText')),
      h(
        'div',
        { class: 'row row-stack' },
        h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, 'Reduce motion'), h('div', { class: 'row-sub' }, 'No shake, slow-mo or flying parts.')),
        motionSeg,
      ),
      switchRow('Left-handed', 'Puts the buttons over the game on the left.', s.leftHanded, toggle('leftHanded')),
      switchRow('Vehicle labels', 'Names the special vehicles on the road.', s.vehicleLabels, toggle('vehicleLabels')),
      switchRow('Haptics', hasVibration ? null : 'Not available in this browser', s.haptics, toggle('haptics')),
    ),
    group(
      'Sound',
      switchRow('Sound effects', null, s.sound, toggle('sound')),
      switchRow('Music', null, s.music, toggle('music')),
      switchRow('Map sounds', 'Rain and thunder on the road.', s.mapSounds, toggle('mapSounds')),
    ),
    group('Progress', cloudRow, actions.push && actions.push.state !== 'none' ? pushRow(actions.push) : null, installRow),
    buildGroup,
    group(
      'More',
      richLinkRow("What's new", 'Patch notes and updates.', () => actions.openNotes(), null, actions.notesUnread ? h('span', { class: 'new-pill' }, 'New') : null),
      inPortal ? null : websiteRow(),
      wikiRow(),
      inPortal || inItch || inPlayStore ? null : crazyGamesRow(),
    ),
    group(
      'Legal',
      ...LEGAL_DOCS.map((doc) => linkRow(doc.title, doc.sub, () => actions.openLegal(doc.id))),
      linkRow('Licenses', 'Open-source software in the game.', () => actions.openLegal('licenses')),
    ),
    h(
      'p',
      { class: 'section-note settings-foot' },
      inPortal
        ? 'Log in to CrazyGames to keep your progress on every device.'
        : cloudEnabled
          ? 'Your progress is saved on this device. Cloud sync keeps a copy and brings it to your other devices.'
          : 'Your progress is saved on this device.',
    ),
    h('button', { class: 'btn block destructive', type: 'button', onclick: () => actions.openDeleteAccount() }, 'Delete account'),
  );
  return openSheet(layer, 'Settings', body, () => actions.closed());
}

export interface DeleteAccountActions {
  /** Something may live on our server (a leaderboard name, a cloud copy): the drawer says it goes too. */
  online: boolean;
  /** Deletes everything; rejects with a message to show when the server cannot be reached. */
  run(): Promise<void>;
  closed(): void;
}

/**
 * Delete account (Leo, 03.10.2026; it replaced Reset progress): a drawer that lists what goes,
 * on this device and on our server, and a second, explicit button that does it.
 */
export function deleteAccountSheet(layer: HTMLElement, actions: DeleteAccountActions): () => void {
  const item = (title: string, sub: string): HTMLElement => h('li', {}, h('strong', {}, title), h('span', {}, sub));
  const problem = h('p', { class: 'field-help error', role: 'alert' });
  problem.hidden = true;
  const confirm = h('button', { class: 'btn block destructive', type: 'button' }, 'Delete my account');
  const cancel = h('button', { class: 'btn block quiet-btn', type: 'button' }, 'Cancel');
  const body = h(
    'div',
    { class: 'delete-account' },
    h('p', { class: 'delete-lede' }, 'The game starts over from Level 1. This cannot be undone.'),
    h(
      'ul',
      { class: 'delete-list' },
      item('On this device', 'Level, Prestige, money, chests, collection, upgrades, records and settings.'),
      actions.online ? item('On our server', 'Your leaderboard name and scores, friend code and friends list, your cloud copy and any rewards still waiting.') : null,
      actions.online ? item('Bug reports and ideas you sent', 'They stay with us, but no longer point to you.') : null,
    ),
    problem,
    h('div', { class: 'sheet-actions' }, confirm, cancel),
  );
  let close: () => void = () => undefined;
  confirm.addEventListener('click', () => {
    confirm.disabled = true;
    cancel.disabled = true;
    confirm.textContent = 'Deleting…';
    problem.hidden = true;
    actions
      .run()
      .then(() => close())
      .catch((error: unknown) => {
        confirm.disabled = false;
        cancel.disabled = false;
        confirm.textContent = 'Delete my account';
        problem.textContent = error instanceof Error ? error.message : 'Something went wrong. Try again.';
        problem.hidden = false;
      });
  });
  cancel.addEventListener('click', () => close());
  close = openSheet(layer, 'Delete account?', body, () => actions.closed());
  // The safe choice has the focus.
  cancel.focus({ preventScroll: true });
  return close;
}
