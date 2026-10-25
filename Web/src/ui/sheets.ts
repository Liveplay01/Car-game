import { h, icon, animatedIcon } from './dom';
import { tabsControl } from './tabs';
import { ICONS, CRAZYGAMES_LOGO, FANDOM_LOGO } from './icons';
import type { AnimatedIconId } from './animatedIcons';
import type { Settings } from '../core/career';
import { type PatchNote, type PatchImpact, type PatchItem, itemText, itemCredit } from '../present/patchNotes';
import { LEGAL_DOCS, type LegalDoc, type LegalId } from '../present/legal';
import type { License } from '../present/licenses';
import type { Intro } from '../present/intros';
import { inItch, inPlayStore, inPortal, isInstalled, isIos } from '../storage/device';
import { cloudEnabled } from '../net/cloud';
import { PUSH_CHOICES, type PushChoice, type PushState } from '../net/push';
import { S } from '../present/strings';
import { LANGUAGES, currentLanguage, chooseLanguage } from '../present/i18n';

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

/** True when the touch started on something that is scrolled down, so the swipe is its scrolling and not a pull. */
function scrolledDown(target: EventTarget | null, sheet: HTMLElement): boolean {
  for (let el = target as HTMLElement | null; el; el = el.parentElement) {
    if (el.scrollTop > 0) return true;
    if (el === sheet) return false;
  }
  return false;
}

/**
 * Pulling the grabber or the title bar down moves the sheet with the finger and the scrim fades with it. A long or
 * quick pull closes it from where the finger let go; a short one lets it settle back.
 * On touch, a pull down from anywhere in the sheet does the same, as long as the swipe starts with the content at the
 * top: scrolling back up to the start never closes it, only the next swipe down does (Leo, 09.10.2026), so the thumb
 * stays where it is.
 */
function dragToClose(sheet: HTMLElement, scrim: HTMLElement, handles: HTMLElement[], close: () => void): void {
  let drag: { startY: number; dy: number; id: number; t: number } | null = null;
  const settle = (): void => {
    sheet.style.transition = '';
    sheet.style.transform = '';
    sheet.style.animation = '';
    scrim.style.animation = '';
    scrim.style.opacity = '';
  };
  const begin = (y: number, id: number): void => {
    drag = { startY: y, dy: 0, id, t: performance.now() };
    sheet.style.transition = '';
    sheet.style.animation = 'none';
    scrim.style.animation = 'none';
  };
  const move = (y: number): void => {
    if (!drag) return;
    drag.dy = y - drag.startY;
    // Up gives way with resistance, down follows the finger.
    const dy = drag.dy < 0 ? -Math.sqrt(-drag.dy) * 2 : drag.dy;
    sheet.style.transform = `translateY(${dy}px)`;
    scrim.style.opacity = String(Math.max(0, 1 - Math.max(0, dy) / Math.max(1, sheet.offsetHeight)));
  };
  const release = (): void => {
    if (!drag) return;
    const { dy, t } = drag;
    drag = null;
    const speed = dy / Math.max(1, performance.now() - t);
    if (dy > 90 || speed > 0.6) {
      // The closing animation carries on from where the finger left the sheet.
      sheet.style.animation = '';
      scrim.style.animation = '';
      close();
      return;
    }
    sheet.style.transition = 'transform 240ms var(--ease-drawer)';
    sheet.style.transform = 'translateY(0)';
    scrim.style.transition = 'opacity 240ms var(--ease-drawer)';
    scrim.style.opacity = '1';
    window.setTimeout(() => {
      scrim.style.transition = '';
      settle();
    }, 240);
  };
  for (const el of handles) {
    el.classList.add('sheet-handle');
    el.addEventListener('pointerdown', (e) => {
      if (drag || (e.target as HTMLElement).closest('button')) return;
      begin(e.clientY, e.pointerId);
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (drag?.id === e.pointerId) move(e.clientY);
    });
    const end = (e: PointerEvent): void => {
      if (drag?.id === e.pointerId) release();
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  // Touch: the sheet is a scroller, so the pull only takes over once a swipe that began at the top goes down.
  let touch: { y0: number; pulling: boolean } | null = null;
  sheet.addEventListener(
    'touchstart',
    (e) => {
      const target = e.target as HTMLElement;
      touch = e.touches.length === 1 && !drag && !target.closest('.sheet-handle, input, textarea, select') && !scrolledDown(target, sheet) ? { y0: e.touches[0].clientY, pulling: false } : null;
    },
    { passive: true },
  );
  sheet.addEventListener(
    'touchmove',
    (e) => {
      if (!touch) return;
      const y = e.touches[0].clientY;
      if (!touch.pulling) {
        // Already scrolling (the swipe went up first): it stays a scroll.
        if (scrolledDown(e.target, sheet)) touch = null;
        else if (y - touch.y0 >= 8) {
          touch.pulling = true;
          begin(y, -1);
        }
        if (!touch?.pulling) return;
      }
      e.preventDefault();
      move(y);
    },
    { passive: false },
  );
  const touchEnd = (): void => {
    if (touch?.pulling) release();
    touch = null;
  };
  sheet.addEventListener('touchend', touchEnd);
  sheet.addEventListener('touchcancel', touchEnd);
}

let sheetSound: ((opening: boolean) => void) | null = null;

/** The shell hands over how a sheet sounds when it rises and when it settles back. */
export function onSheetSound(play: (opening: boolean) => void): void {
  sheetSound = play;
}

/**
 * A bottom sheet (like an iOS sheet): scrim, grabber, focus kept inside,
 * Escape, a tap on the scrim and a pull down on the grabber close it.
 */
export function openSheet(layer: HTMLElement, title: string, body: HTMLElement, onClose?: () => void): () => void {
  // The same sheet again replaces itself; anything else stacks.
  const same = stack.find((x) => x.title === title);
  same?.close(true);
  const below = stack[stack.length - 1] ?? null;
  const previouslyFocused = document.activeElement as HTMLElement | null;
  const titleId = `sheet-${Math.random().toString(36).slice(2, 8)}`;
  const closeBtn = h('button', { class: 'icon-btn', 'aria-label': S.settings.close, onclick: () => close() }, animatedIcon('close'));
  const grabber = h('div', { class: 'grabber', 'aria-hidden': 'true' });
  const head = h('div', { class: 'sheet-head' }, h('h2', { class: 'sheet-title', id: titleId }, title), closeBtn);
  // A sheet opened from another one says where Back goes.
  const back = below ? h('button', { class: 'sheet-back', type: 'button', onclick: () => close() }, animatedIcon('chevronLeft'), below.title) : null;
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, tabindex: '-1' }, grabber, back, head, body);
  const scrim = h('div', { class: 'sheet-scrim', onclick: () => close() });
  dragToClose(sheet, scrim, [grabber, head], () => close());
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
      if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet)) {
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
    if (!instant) sheetSound?.(false);
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
  if (!same) sheetSound?.(true);
  // A list row would show the keyboard ring on open; the sheet takes the focus and Tab goes on to the first row.
  (sheet.querySelector<HTMLElement>('.sheet-actions button') ?? sheet).focus({ preventScroll: true });
  return close;
}

/** What a sheet shows has just been replaced (another tab, a list that arrived): the new view fades and rises in. */
export function fadeIn(view: HTMLElement, side = 0): void {
  view.classList.remove('view-in', 'view-slide');
  void view.offsetWidth;
  view.style.setProperty('--side', String(side));
  view.classList.add(side === 0 ? 'view-in' : 'view-slide');
}

/**
 * `update` replaces what a view shows: the old rows stay on top as a ghost and fade out while the new ones fade in. With a
 * `side` (+1: the new view lies to the right, -1: to the left) they slide like a canvas page's segments (`ProgressPage.add`).
 */
export function swapView(view: HTMLElement, update: () => void, side = 0): void {
  view.querySelector(':scope > .view-ghost')?.remove();
  const scroller = view.closest<HTMLElement>('.sheet, .social-page');
  const scrolled = scroller?.scrollTop ?? 0;
  const ghost = h('div', { class: `view-ghost ${view.className.replace(/\b(view-in|view-slide|has-ghost)\b/g, '')}`, 'aria-hidden': 'true', inert: true });
  if (side !== 0) {
    ghost.classList.add('slide');
    ghost.style.setProperty('--side', String(side));
  }
  const canvases = [...view.querySelectorAll('canvas')];
  ghost.append(...[...view.childNodes].map((node) => node.cloneNode(true)));
  // A copy keeps no pictures, no ids or names (a form or label must never find the copy) and no frames.
  ghost.querySelectorAll('canvas').forEach((copy, i) => copy.getContext('2d')?.drawImage(canvases[i], 0, 0));
  ghost.querySelectorAll('iframe').forEach((frame) => frame.remove());
  ghost.querySelectorAll('[id], [name]').forEach((el) => {
    el.removeAttribute('id');
    el.removeAttribute('name');
  });
  update();
  fadeIn(view, side);
  if (!ghost.hasChildNodes()) return;
  // The page may have jumped (back to the top): the copy stays where the player saw the old view.
  const jump = scrolled - (scroller?.scrollTop ?? 0);
  if (jump > 0) ghost.style.transform = `translateY(${-jump}px)`;
  view.classList.add('has-ghost');
  view.append(ghost);
  const done = (): void => {
    ghost.remove();
    if (!view.querySelector(':scope > .view-ghost')) view.classList.remove('has-ghost');
  };
  ghost.addEventListener('animationend', done, { once: true });
  window.setTimeout(done, 400);
}

/** What a drawer or the Social page shows is now another view (an auction that ended, another tab): it glides back to its start. */
export function scrollSheetToTop(from: HTMLElement): void {
  const sheet = from.closest<HTMLElement>('.sheet, .social-page');
  if (!sheet || sheet.scrollTop === 0) return;
  sheet.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
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
 * recommends the Home Screen; Cloud sync comes with the player name (`ui/accountSheet.ts`). Asked by the game itself
 * (`tomorrow` hint) it leads with the reason to come back tomorrow instead.
 */
export function installDialog(layer: HTMLElement, ipad: boolean, onDone: () => void, reason?: { title: string; why: string }): void {
  const previouslyFocused = document.activeElement as HTMLElement | null;
  const step = (n: number, text: string, glyph: AnimatedIconId): HTMLElement =>
    h('li', { class: 'install-step' }, h('span', { class: 'install-num', 'aria-hidden': 'true' }, String(n)), h('span', { class: 'install-text' }, text), h('span', { class: 'install-glyph', 'aria-hidden': 'true' }, animatedIcon(glyph)));
  const ok = h('button', { class: 'btn primary block', type: 'button' }, S.intro.gotIt);
  const root = h(
    'div',
    { class: 'install-root', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'install-title', 'aria-describedby': 'install-why' },
    h(
      'div',
      { class: 'install-card' },
      h('div', { class: 'install-badge', 'aria-hidden': 'true' }, animatedIcon('game')),
      h('h2', { class: 'install-title', id: 'install-title' }, reason?.title ?? S.settings.homeScreen.title),
      h('p', { class: 'install-why', id: 'install-why' }, reason?.why ?? S.settings.homeScreen.why),
      h(
        'ol',
        { class: 'install-steps' },
        step(1, ipad ? S.settings.homeScreen.shareTop : S.settings.homeScreen.shareBottom, 'share'),
        step(2, S.settings.homeScreen.scroll, 'plus'),
        step(3, S.settings.homeScreen.add, 'check'),
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

/** Closes the sheet on top (Android's back gesture); false when none is open. */
export function closeTopSheet(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top.close();
  return true;
}

/** Settings → What's new: the patch notes, newest first. */
/** How much an update changes, as its badge says it (colour and word, never colour alone). */
const IMPACT: Record<PatchImpact, () => string> = { major: () => S.settings.impact.major, minor: () => S.settings.impact.minor, fix: () => S.settings.impact.fix };

const noteLine = (item: PatchItem): HTMLElement => {
  const credit = itemCredit(item);
  return h('li', {}, itemText(item), credit ? h('span', { class: 'note-credit' }, credit) : null);
};

/**
 * What's new: every day shows its short summary at once, with a badge for how much it changes; the long
 * list folds open under it (a native disclosure, so keys and screen readers know it).
 */
export function patchNotesSheet(layer: HTMLElement, notes: PatchNote[], onClose: () => void, title = S.settings.whatsNew): () => void {
  const body = h(
    'div',
    { class: 'notes' },
    ...notes.map((note) =>
      h(
        'article',
        { class: 'note' },
        h(
          'div',
          { class: 'note-head' },
          h('div', { class: 'note-meta' }, h('span', { class: 'note-date' }, note.date), h('span', { class: `impact impact-${note.impact}` }, IMPACT[note.impact]())),
          h('h3', { class: 'note-title' }, note.title),
        ),
        h('ul', { class: 'note-summary' }, ...note.summary.map(noteLine)),
        h(
          'details',
          { class: 'note-more' },
          h('summary', { class: 'note-more-head' }, S.settings.allChanges(note.items.length), animatedIcon('chevronDown')),
          h('ul', { class: 'note-items' }, ...note.items.map(noteLine)),
        ),
      ),
    ),
  );
  return openSheet(layer, title, body, onClose);
}

/** Every place that explains itself once (`Intros`), to read again any time: one fold per place the player has reached. */
export function guidesSheet(layer: HTMLElement, places: Intro[], onClose: () => void, go: (place: Intro) => void): () => void {
  const guides = places.map((id) => {
    const t = S.intro[id];
    const el = h(
      'details',
      { class: 'note-more guide' },
      h('summary', { class: 'note-more-head' }, h('span', { class: 'guide-name' }, h('span', { class: 'row-title' }, t.title), h('span', { class: 'row-sub' }, t.line)), animatedIcon('chevronDown')),
      h('div', { class: 'guide-body' }, ...t.body.map((p) => h('p', {}, p)), h('button', { class: 'btn small', type: 'button', onclick: () => go(id) }, S.settings.guidesGo, animatedIcon('chevronRight'))),
    );
    return { el, text: [t.title, t.line, ...t.body].join(' ').toLocaleLowerCase() };
  });
  // "Where is ...?": a word filters the guides down to the ones that mention it, opened.
  const none = h('p', { class: 'section-note', hidden: true }, S.settings.guidesNone);
  const search = h('input', { class: 'text-input guide-search', type: 'search', placeholder: S.settings.guidesSearch, 'aria-label': S.settings.guidesSearch, autocomplete: 'off', enterkeyhint: 'search' });
  search.addEventListener('input', () => {
    const q = search.value.trim().toLocaleLowerCase();
    for (const g of guides) {
      g.el.hidden = q !== '' && !g.text.includes(q);
      if (q !== '') g.el.open = !g.el.hidden;
    }
    none.hidden = guides.some((g) => !g.el.hidden);
  });
  const body = h('div', { class: 'guides' }, search, none, ...guides.map((g) => g.el));
  return openSheet(layer, S.settings.guides, body, onClose);
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
    h('p', {}, S.settings.licensesIntro),
    ...licenses.flatMap((l) => [h('h3', {}, `${l.name} · ${l.license}`), h('pre', {}, l.text)]),
  );
  return openSheet(layer, S.settings.licenses, body, onClose);
}

/** A row that opens a page, the whole row tappable. */
function linkRow(title: string, sub: string, onOpen: () => void): HTMLElement {
  return h(
    'button',
    { class: 'row row-link', type: 'button', onclick: onOpen },
    h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), h('div', { class: 'row-sub' }, sub)),
    animatedIcon('chevronRight'),
  );
}

/** The game's page on CrazyGames (Leo, 01.10.2026). Not shown inside CrazyGames itself. */
const CRAZYGAMES_PAGE = 'https://www.crazygames.com/game/roundabout-timing';

/** The game's homepage (Leo, 02.10.2026). Not shown inside CrazyGames, which keeps players on its own site. */
const WEBSITE_PAGE = 'https://timing.love/';

/** The community wiki on Fandom (Leo, 01.10.2026). */
const WIKI_PAGE = 'https://roundabout.fandom.com/';

const TIKTOK_URL = 'https://www.tiktok.com/@timing.love';
const YOUTUBE_URL = 'https://www.youtube.com/channel/UCDrH7V5QDLR0tooaC-GzGxQ';
const INSTAGRAM_URL = 'https://instagram.com/roundabouttiming';

/** A row that opens a page elsewhere, with the brand's mark in front. */
function externalRow(href: string, logo: string, title: string, sub: string): HTMLElement {
  return h(
    'a',
    { class: 'row row-link', href, target: '_blank', rel: 'noopener' },
    h('span', { class: 'row-logo', html: logo }),
    h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), h('div', { class: 'row-sub' }, sub)),
    animatedIcon('external'),
  );
}

const crazyGamesRow = (): HTMLElement =>
  externalRow(CRAZYGAMES_PAGE, CRAZYGAMES_LOGO, S.settings.crazyGames.title, S.settings.crazyGames.sub);

const websiteRow = (): HTMLElement =>
  externalRow(WEBSITE_PAGE, '<img src="/icons/icon-192-v2.png" alt="" width="30" height="30" decoding="async" />', S.settings.website.title, S.settings.website.sub);

/** Help and support (Leo, 24.10.2026): timing.love/support, answers first, then the way to a person. */
const supportRow = (): HTMLElement => tileExternalRow('help', 'blue', S.settings.support.title, S.settings.support.sub, `${WEBSITE_PAGE}support`);

const wikiRow = (): HTMLElement => externalRow(WIKI_PAGE, FANDOM_LOGO, S.settings.wiki.title, S.settings.wiki.sub);

function socialRow(iconPath: string, tone: string, title: string, sub: string, href: string): HTMLAnchorElement {
  return h(
    'a',
    { class: 'row row-link', href, target: '_blank', rel: 'noopener' },
    tile(icon(iconPath), tone),
    h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), h('div', { class: 'row-sub' }, sub)),
    animatedIcon('external'),
  ) as HTMLAnchorElement;
}

const tiktokRow = (): HTMLElement =>
  socialRow(ICONS.tiktok, 'pink', S.settings.social.tiktok.title, S.settings.social.tiktok.sub, TIKTOK_URL);

const youtubeRow = (): HTMLElement =>
  socialRow(ICONS.youtube, 'red', S.settings.social.youtube.title, S.settings.social.youtube.sub, YOUTUBE_URL);

const instagramRow = (): HTMLElement =>
  socialRow(ICONS.instagram, 'amber', S.settings.social.instagram.title, S.settings.social.instagram.sub, INSTAGRAM_URL);

export interface SettingsActions {
  changed(settings: Settings): void;
  /** The patch notes; `notesUnread` lights the row until they are opened. */
  openNotes(): void;
  notesUnread: boolean;
  /** How each place works, over the settings (`guidesSheet`). */
  openGuides(): void;
  /** Police are on this career's road: the dispatch button's size has something to size. */
  dispatch: boolean;
  /** Privacy Policy, Imprint or the open-source licenses, over the settings. */
  openLegal(page: LegalId | 'licenses'): void;
  /** Delete account: a drawer over the settings explains what goes and asks once more. */
  openDeleteAccount(): void;
  /** Cloud sync (a sync code), over the settings. */
  openCloud(): void;
  /** Cloud sync is on for this device (the row says so). */
  cloudOn: boolean;
  /** "Your player" (`ui/accountSheet.ts`): the name, whether its cloud copy exists too; null without the service. */
  player: { name: string | null; ready: boolean; open(): void } | null;
  /** The player's friend code, if they have a name: it fills in the bug form on the website. */
  friendCode: (() => Promise<string | null>) | null;
  install: (() => void) | null;
  /** Notifications on this device (`net/push.ts`); `delivers`: reminders reach it while the game is closed. */
  push: { state: PushState; delivers: boolean; toggle(on: boolean): Promise<PushState>; choiceOn(id: PushChoice): boolean; setChoice(id: PushChoice, on: boolean): void };
  closed(): void;
}

/**
 * The notifications switch. Turning it on asks the browser, so the switch waits for the answer and
 * shows what came of it; where it cannot be turned on (blocked, not on the Home Screen) it says why.
 * Below it, one switch per kind of notification, only while they are on.
 */
function pushRows(push: SettingsActions['push']): HTMLElement[] {
  const choices = PUSH_CHOICES.map(({ id }) => {
    const text = S.push.choices[id];
    return switchRow(text.title, text.sub, push.choiceOn(id), (on) => push.setChoice(id, on));
  });
  const sub = h('div', { class: 'row-sub' });
  const sw = h('button', { class: 'switch', role: 'switch', 'aria-label': S.push.row });
  const show = (state: PushState): void => {
    sw.setAttribute('aria-checked', String(state === 'on'));
    sw.disabled = state === 'blocked' || state === 'install' || state === 'none';
    sub.textContent = state === 'none' ? S.push.rowNone : state === 'blocked' ? S.push.rowBlocked : state === 'install' ? S.push.rowInstall : state === 'on' && !push.delivers ? S.push.rowLocal : S.push.rowSub;
    for (const row of choices) row.hidden = state !== 'on';
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
  return [row, ...choices];
}

export interface Offer {
  glyph: AnimatedIconId;
  title: string;
  why: string;
  yes: string;
}

/**
 * A question the game asks once with its reason, "Not now" always free: notifications (when the way back is asked for, `tomorrow`
 * hint, and again when a Daily streak reaches two days, `notificationsStreak`) and installing where the browser can. Only the yes
 * asks the browser, which can be asked once, and it asks from inside the tap.
 */
export function offerDialog(layer: HTMLElement, offer: Offer, actions: { accept(): void; closed(): void }): void {
  const previouslyFocused = document.activeElement as HTMLElement | null;
  const on = h('button', { class: 'btn primary block', type: 'button' }, offer.yes);
  const later = h('button', { class: 'btn block quiet-btn', type: 'button' }, S.push.offerLater);
  const card = h(
    'div',
    { class: 'intro-card', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'offer-title', 'aria-describedby': 'offer-why' },
    h('div', { class: 'install-badge', 'aria-hidden': 'true' }, animatedIcon(offer.glyph)),
    h('h2', { class: 'install-title intro-title', id: 'offer-title' }, offer.title),
    h('p', { class: 'install-why', id: 'offer-why' }, offer.why),
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
    actions.accept();
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

/** A three-step slider (1 to 3), the value read live while dragging. */
function sliderRow(title: string, sub: string, value: 1 | 2 | 3, onChange: (value: 1 | 2 | 3) => void): HTMLElement {
  const slider = h('input', { class: 'step-slider', type: 'range', min: '1', max: '3', step: '1', value: String(value), 'aria-label': title });
  slider.addEventListener('input', () => onChange(Number(slider.value) as 1 | 2 | 3));
  const track = h('div', { class: 'step-track' }, h('i'), h('i'), h('i'), slider);
  return h('div', { class: 'row row-stack' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), h('div', { class: 'row-sub' }, sub)), track);
}

/** A group of rows with a plain header above it, as in iOS Settings. */
function group(title: string, ...rows: (HTMLElement | null)[]): HTMLElement | null {
  const kept = rows.filter((r): r is HTMLElement => r !== null);
  if (kept.length === 0) return null;
  const id = `set-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  return h('section', { class: 'settings-group', 'aria-labelledby': id }, h('h3', { class: 'settings-header', id }, title), h('div', { class: 'list' }, ...kept));
}

/** A group that stays folded until asked for, open from the start when one of its switches is on. */
function foldGroup(title: string, open: boolean, ...rows: (HTMLElement | null)[]): HTMLElement {
  const fold = h('details', { class: 'settings-group settings-fold' }, h('summary', { class: 'settings-header' }, title), h('div', { class: 'list' }, ...rows));
  fold.open = open;
  return fold;
}

/**
 * Language picker sheet (Leo, 12.10.2026): opens an in-game sheet matching the UI style,
 * with checkmark on the selected language and instant game reload on change.
 */
export function openLanguageSheet(layer: HTMLElement): () => void {
  const now = currentLanguage();
  const list = h('div', { class: 'list lang-picker-list' });
  let close: (() => void) | null = null;
  for (const { code, name } of LANGUAGES) {
    const isCurrent = code === now;
    const check = isCurrent ? h('span', { class: 'lang-check', 'aria-hidden': 'true' }, animatedIcon('check')) : null;
    const row = h(
      'button',
      {
        class: `row row-link lang-choice-row${isCurrent ? ' selected' : ''}`,
        type: 'button',
        role: 'radio',
        'aria-checked': isCurrent ? 'true' : 'false',
        onclick: () => {
          if (code !== now) {
            chooseLanguage(code);
          } else {
            close?.();
          }
        },
      },
      h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, name)),
      check,
    );
    list.append(row);
  }
  const body = h('div', { class: 'lang-picker', role: 'radiogroup', 'aria-label': S.settings.language }, list);
  close = openSheet(layer, S.settings.language, body);
  return close;
}

/** The language row in settings: opens the in-game UI language selection sheet. */
function languageRow(layer: HTMLElement): HTMLElement {
  const now = currentLanguage();
  const name = LANGUAGES.find((l) => l.code === now)?.name ?? '';
  return h(
    'button',
    {
      class: 'row row-link row-lang',
      type: 'button',
      onclick: () => openLanguageSheet(layer),
      'aria-label': `${S.settings.language}: ${name}`,
    },
    tile(animatedIcon('globe'), 'blue'),
    h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, S.settings.language)),
    h('span', { class: 'row-value' }, name),
    animatedIcon('chevronRight'),
  );
}

/** A coloured icon tile in front of a row, as in iOS Settings. */
const tile = (glyph: SVGSVGElement, tone: string): HTMLElement => h('span', { class: `row-tile tile-${tone}`, 'aria-hidden': 'true' }, glyph);

/** A row that leaves for the website, with an icon tile in front. */
function tileExternalRow(glyph: AnimatedIconId, tone: string, title: string, sub: string, href: string): HTMLAnchorElement {
  return h(
    'a',
    { class: 'row row-link', href, target: '_blank', rel: 'noopener' },
    tile(animatedIcon(glyph), tone),
    h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), h('div', { class: 'row-sub' }, sub)),
    animatedIcon('external'),
  ) as HTMLAnchorElement;
}

/** `linkRow` with an optional tile in front and something before the chevron (a pill). */
function richLinkRow(title: string, sub: string, onOpen: () => void, front: HTMLElement | null, extra: HTMLElement | null): HTMLElement {
  const row = linkRow(title, sub, onOpen);
  if (front) row.prepend(front);
  if (extra) row.insertBefore(extra, row.lastChild);
  return row;
}

type SettingsTab = 'play' | 'account' | 'about';
const SETTINGS_TABS: { id: SettingsTab; label: string }[] = [
  { id: 'play', label: S.settings.tabs.play },
  { id: 'account', label: S.settings.tabs.account },
  { id: 'about', label: S.settings.tabs.about },
];
/** Kept between visits: coming back from a page opened here (What's new, a legal text) lands where it left. */
let lastSettingsTab: SettingsTab = 'play';

/**
 * Settings, tidied up (Leo, 03.10.2026) and split into tabs (Leo, 10.10.2026): Play (Game feel, Sound), Account (Cloud sync,
 * notifications, install, Delete account) and About (What's new, Build with us, links, the legal pages).
 */
export function settingsSheet(layer: HTMLElement, s: Settings, actions: SettingsActions): () => void {
  const hasVibration = typeof navigator.vibrate === 'function';
  const motionOptions: [Settings['reduceMotion'], string][] = [
    ['system', S.settings.motion.system],
    ['on', S.settings.motion.on],
    ['off', S.settings.motion.off],
  ];
  const motionSeg = h('div', { class: 'segmented motion-seg', role: 'group', 'aria-label': S.settings.reduceMotion });
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
    (key: 'sound' | 'music' | 'mapSounds' | 'engineSounds' | 'haptics' | 'vehicleLabels' | 'leftHanded' | 'largeText' | 'batterySaver' | 'lowDetail') =>
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
        h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, S.settings.install), h('div', { class: 'row-sub' }, S.settings.installSub)),
        h('button', { class: 'btn primary', onclick: () => actions.install?.() }, S.settings.installButton),
      );
    } else if (isIos()) {
      installRow = h(
        'div',
        { class: 'row' },
        h(
          'div',
          { class: 'row-main' },
          h('div', { class: 'row-title' }, S.settings.addToHome),
          h('div', { class: 'row-sub' }, S.settings.addToHomeSub),
        ),
        animatedIcon('share'),
      );
      installRow.querySelector('svg')?.setAttribute('width', '22');
    }
  }

  // Build with us: the bug form fills in the friend code once it is known. Not inside CrazyGames,
  // which keeps players on its own site (like the website link).
  let buildGroup: HTMLElement | null = null;
  if (!inPortal) {
    const bugRow = tileExternalRow('bug', 'red', S.settings.reportBug, S.settings.reportBugSub, buildLink('bug', null));
    buildGroup = group(S.settings.buildWithUs, bugRow, tileExternalRow('bulb', 'amber', S.settings.suggest, S.settings.suggestSub, buildLink('idea', null)));
    actions
      .friendCode?.()
      .then((code) => {
        if (code) bugRow.href = buildLink('bug', code);
      })
      .catch(() => undefined);
  }

  // One entry for everything online (Leo, 18.10.2026): the player carries Cloud sync. Sync keeps a row of its own only where no
  // player carries it: a new device restoring from its code, or a copy without the player service.
  const restoring = actions.player !== null && actions.player.name === null && !actions.cloudOn;
  const cloudRow =
    cloudEnabled && !actions.player?.name
      ? richLinkRow(
          restoring ? S.account.haveCode : S.settings.cloudSync,
          restoring ? S.settings.haveCodeSub : actions.cloudOn ? S.settings.cloudOn : S.settings.cloudOff,
          () => actions.openCloud(),
          tile(animatedIcon('cloud'), 'blue'),
          null,
        )
      : null;

  // Three tabs (Leo, 10.10.2026): how it plays, what belongs to the player, and everything about the game. Built once, so a switch keeps its state.
  const panes: Record<SettingsTab, (HTMLElement | null)[]> = {
    play: [
      group(
        S.settings.gameFeel,
        languageRow(layer),
        switchRow(S.settings.largerText, S.settings.largerTextSub, s.largeText, toggle('largeText')),
        h(
          'div',
          { class: 'row row-stack' },
          h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, S.settings.reduceMotion), h('div', { class: 'row-sub' }, S.settings.reduceMotionSub)),
          motionSeg,
        ),
        switchRow(S.settings.leftHanded, S.settings.leftHandedSub, s.leftHanded, toggle('leftHanded')),
        actions.dispatch
          ? sliderRow(S.settings.dispatchSize, S.settings.dispatchSizeSub, s.dispatchSize, (size) => {
              s.dispatchSize = size;
              actions.changed(s);
            })
          : null,
        switchRow(S.settings.vehicleLabels, S.settings.vehicleLabelsSub, s.vehicleLabels, toggle('vehicleLabels')),
      ),
      group(
        S.settings.sound,
        switchRow(S.settings.soundEffects, null, s.sound, toggle('sound')),
        switchRow(S.settings.music, null, s.music, toggle('music')),
        switchRow(S.settings.mapSounds, S.settings.mapSoundsSub, s.mapSounds, toggle('mapSounds')),
        switchRow(S.settings.trafficSounds, S.settings.trafficSoundsSub, s.engineSounds, toggle('engineSounds')),
        switchRow(S.settings.haptics, hasVibration ? null : S.settings.hapticsNone, s.haptics, toggle('haptics')),
      ),
      foldGroup(
        S.settings.performance,
        s.batterySaver || s.lowDetail,
        switchRow(S.settings.batterySaver, S.settings.batterySaverSub, s.batterySaver, toggle('batterySaver')),
        switchRow(S.settings.lowDetail, S.settings.lowDetailSub, s.lowDetail, toggle('lowDetail')),
      ),
    ],
    account: [
      group(
        actions.player ? S.account.title : S.settings.backup,
        actions.player
          ? richLinkRow(
              actions.player.name ?? S.account.settingsNone,
              actions.player.ready ? S.account.settingsReady : actions.player.name ? S.account.settingsSync : S.account.settingsSub,
              () => actions.player?.open(),
              tile(animatedIcon('social'), 'blue'),
              actions.player.ready ? null : h('span', { class: 'new-pill' }, S.account.settingsBadge),
            )
          : null,
        cloudRow,
      ),
      group(S.settings.reminders, ...pushRows(actions.push), installRow),
      h(
        'p',
        { class: 'section-note settings-foot' },
        inPortal ? S.settings.noteCrazyGames : cloudEnabled ? S.settings.noteCloud : S.settings.noteLocal,
      ),
      h('button', { class: 'btn block destructive', type: 'button', onclick: () => actions.openDeleteAccount() }, S.settings.deleteAccount),
    ],
    about: [
      group(
        S.settings.theGame,
        linkRow(S.settings.guides, S.settings.guidesSub, () => actions.openGuides()),
        richLinkRow(S.settings.whatsNew, S.settings.whatsNewSub, () => actions.openNotes(), null, actions.notesUnread ? h('span', { class: 'new-pill' }, S.settings.newBadge) : null),
        inPortal ? null : websiteRow(),
        inPortal ? null : supportRow(),
        wikiRow(),
        inPortal || inItch || inPlayStore ? null : crazyGamesRow(),
      ),
      group(
        S.settings.followUs,
        tiktokRow(),
        youtubeRow(),
        instagramRow(),
      ),
      buildGroup,
      group(
        S.settings.legal,
        ...LEGAL_DOCS.map((doc) => linkRow(doc.title, doc.sub, () => actions.openLegal(doc.id))),
        linkRow(S.settings.licenses, S.settings.licensesSub, () => actions.openLegal('licenses')),
      ),
    ],
  };
  const content = h('div', { class: 'settings-content' });
  const tabs = tabsControl(S.settings.title, SETTINGS_TABS, (next) => {
    scrollSheetToTop(content);
    show(next, true);
  });
  tabs.el.classList.add('sheet-tabs');
  function show(next: SettingsTab, animate: boolean): void {
    lastSettingsTab = next;
    tabs.set(next);
    const swap = (): void => content.replaceChildren(...panes[next].filter((pane): pane is HTMLElement => pane !== null));
    if (animate) swapView(content, swap);
    else swap();
  }
  show(lastSettingsTab, false);
  const body = h('div', { class: 'settings' }, tabs.el, content);
  const close = openSheet(layer, S.settings.title, body, () => actions.closed());
  glideHeight(body, content);
  return close;
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
  const del = S.settings.del;
  const item = (title: string, sub: string): HTMLElement => h('li', {}, h('strong', {}, title), h('span', {}, sub));
  const problem = h('p', { class: 'field-help error', role: 'alert' });
  problem.hidden = true;
  const confirm = h('button', { class: 'btn block destructive', type: 'button' }, del.confirm);
  const cancel = h('button', { class: 'btn block quiet-btn', type: 'button' }, del.cancel);
  const body = h(
    'div',
    { class: 'delete-account' },
    h('p', { class: 'delete-lede' }, del.lede),
    h(
      'ul',
      { class: 'delete-list' },
      item(del.device, del.deviceSub),
      actions.online ? item(del.server, del.serverSub) : null,
      actions.online ? item(del.sent, del.sentSub) : null,
    ),
    problem,
    h('div', { class: 'sheet-actions' }, confirm, cancel),
  );
  let close: () => void = () => undefined;
  confirm.addEventListener('click', () => {
    confirm.disabled = true;
    cancel.disabled = true;
    confirm.textContent = del.deleting;
    problem.hidden = true;
    actions
      .run()
      .then(() => close())
      .catch((error: unknown) => {
        confirm.disabled = false;
        cancel.disabled = false;
        confirm.textContent = del.confirm;
        problem.textContent = error instanceof Error ? error.message : del.failed;
        problem.hidden = false;
      });
  });
  cancel.addEventListener('click', () => close());
  close = openSheet(layer, del.title, body, () => actions.closed());
  // The safe choice has the focus.
  cancel.focus({ preventScroll: true });
  return close;
}
