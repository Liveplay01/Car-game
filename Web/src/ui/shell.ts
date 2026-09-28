import './shell.css';
import { v } from '../core/vec2';
import { GameSession, type InputAction, type SessionOutput } from '../present/session';
import { CanvasDrawer } from '../present/draw';
import { TAB_BAR, barTab, screenTab, showsTabBar, type Tab } from '../present/flow';
import { AudioPlayer, Haptics } from '../audio/player';
import { h, icon } from './dom';
import { ICONS } from './icons';
import { settingsSheet, isSheetOpen, closeAnySheet } from './sheets';
import { exportSave } from '../storage/save';
import { decodeChallenge, type ChallengeSpec } from '../core/challenge';
import { S, Fmt } from '../present/strings';
import { DetailSheet } from './detailSheet';
import { VersusLobby } from './versusLobby';
import { Music } from '../present/feedback';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const TAB_HEIGHT = 56;

/** A key hint on a floating button; CSS shows it only where there is a keyboard and a mouse. */
const keycap = (label: string): HTMLElement => h('kbd', { class: 'keycap', 'aria-hidden': 'true' }, label);
const TAB_LABEL: Record<Tab, string> = { progress: 'Progress', game: 'Game', shop: 'Shop', upgrades: 'Build', streetBuilder: 'Build' };
const TAB_ICON: Record<Tab, string> = { progress: ICONS.progress, game: ICONS.game, shop: ICONS.shop, upgrades: ICONS.build, streetBuilder: ICONS.build };

/**
 * The browser shell: one canvas that draws the whole game (scene, HUD and pages, like the
 * test window), and a thin DOM layer for what should feel native — the tab bar, the settings
 * sheet, and two floating buttons. Input is timestamped when it happens, not when the frame
 * sees it.
 */
export class Shell {
  private readonly audio = new AudioPlayer();
  private readonly haptics = new Haptics();
  private readonly session: GameSession;
  private readonly drawer: CanvasDrawer;
  private readonly tabs = new Map<Tab, { button: HTMLButtonElement; badge: HTMLElement }>();
  private tabIndicator: HTMLElement | null = null;
  /** The last tab change came from the keyboard: the indicator jumps, it does not glide. */
  private keyboardNav = false;
  private readonly settingsBtn: HTMLButtonElement;
  private readonly dispatchBtn: HTMLButtonElement;
  private readonly shareBtn: HTMLButtonElement;
  private readonly leaveBtn: HTMLButtonElement;
  private readonly leaveLabel: HTMLElement;
  /** A challenge link that arrived mid-shift: it opens once the shift is over. */
  private pendingChallenge: ChallengeSpec | null = null;
  private readonly probe: HTMLElement;
  private readonly motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  private actions: InputAction[] = [];
  private last = performance.now();
  private safe = { top: 0, right: 0, bottom: 0, left: 0 };
  private size = v(0, 0);
  private pointerId: number | null = null;
  private installPrompt: InstallPromptEvent | null = null;
  private chromeKey = '';
  private closeSettings: (() => void) | null = null;
  private readonly detail: DetailSheet;
  private readonly versus: VersusLobby;
  private readonly versusBar: HTMLElement;
  private readonly againBtn: HTMLButtonElement;

  constructor(
    private readonly app: HTMLElement,
    canvas: HTMLCanvasElement,
    private readonly layers: HTMLElement,
  ) {
    this.drawer = new CanvasDrawer(canvas);
    const output: SessionOutput = {
      sound: (id, pitch, pan) => this.audio.play(id, pitch, pan),
      haptic: (id, softness) => this.haptics.play(id, softness),
    };
    this.session = new GameSession(output);
    this.session.systemReduceMotion = this.motionQuery.matches;
    this.motionQuery.addEventListener('change', () => (this.session.systemReduceMotion = this.motionQuery.matches));

    this.probe = h('div', { 'aria-hidden': 'true' });
    this.probe.style.cssText =
      'position:fixed;inset:0;pointer-events:none;visibility:hidden;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
    document.body.append(this.probe);

    this.buildTabbar(document.getElementById('tabbar')!);
    this.settingsBtn = h(
      'button',
      { class: 'icon-btn glass float-btn settings-btn', 'aria-label': 'Settings', 'aria-keyshortcuts': 'Escape', onclick: () => this.openSettings() },
      icon(ICONS.gear),
      keycap('esc'),
    );
    this.dispatchBtn = h(
      'button',
      {
        class: 'icon-btn glass float-btn dispatch-btn',
        'aria-label': 'Emergency dispatch: the next car becomes a police car',
        'aria-keyshortcuts': 'D',
        onclick: () => this.push({ k: 'dispatch' }),
      },
      icon(ICONS.siren),
      keycap('D'),
    );
    for (const b of [this.settingsBtn, this.dispatchBtn]) b.addEventListener('pointerdown', (e) => e.stopPropagation());
    // Under a result: send this shift to a friend. In a challenge or trial: leave it.
    this.shareBtn = h('button', { class: 'btn glass run-btn', type: 'button', onclick: () => void this.share() }, icon(ICONS.share), h('span', {}, 'Challenge a friend'));
    this.leaveLabel = h('span', {}, 'Leave');
    this.leaveBtn = h('button', { class: 'btn glass run-btn', type: 'button', 'aria-keyshortcuts': 'Escape', onclick: () => this.session.leaveSpecial() }, icon(ICONS.close), this.leaveLabel);
    // Multiplayer: a friend's code or your own; the match takes over the canvas.
    this.versus = new VersusLobby(layers, output, {
      started: () => this.syncChrome(true),
      ended: (message) => {
        if (message) this.session.showNotice(message);
        this.last = performance.now();
        this.syncChrome(true);
      },
    });
    // The last page of the mode swipe: a tap there opens the lobby.
    this.session.onVersus = () => {
      if (!isSheetOpen()) this.versus.open();
    };
    const runBar = h('div', { class: 'run-bar' }, this.shareBtn, this.leaveBtn);
    this.againBtn = h('button', { class: 'btn glass run-btn primary-run', type: 'button', onclick: () => this.versus.start() }, icon(ICONS.restart), h('span', {}, 'Play again'));
    const quitBtn = h('button', { class: 'btn glass run-btn show', type: 'button', onclick: () => this.versus.leave() }, icon(ICONS.close), h('span', {}, 'Leave'));
    this.versusBar = h('div', { class: 'versus-bar' }, quitBtn, this.againBtn);
    for (const b of [this.settingsBtn, this.dispatchBtn, this.shareBtn, this.leaveBtn, this.againBtn, quitBtn]) b.addEventListener('pointerdown', (e) => e.stopPropagation());
    app.append(this.settingsBtn, this.dispatchBtn, runBar, this.versusBar);
    this.detail = new DetailSheet(
      app,
      (action) => {
        this.audio.unlock();
        this.push({ k: 'perform', action });
      },
      () => this.session.closeDetail(),
    );

    this.session.onChrome = () => this.syncChrome(true);
    this.bindInput(canvas);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e as InstallPromptEvent;
    });
    this.readChallengeLink();
    window.addEventListener('hashchange', () => this.readChallengeLink());
    this.syncChrome(true);
    requestAnimationFrame((t) => this.loop(t));
  }

  get game(): GameSession {
    return this.session;
  }

  private push(a: InputAction): void {
    this.actions.push(a);
  }

  // MARK: Chrome

  private buildTabbar(nav: HTMLElement): void {
    // One pill that glides under the selected tab (iOS 26 tab bar), drawn behind the buttons.
    this.tabIndicator = h('span', { class: 'tab-indicator', 'aria-hidden': 'true' });
    nav.append(this.tabIndicator);
    for (const tab of TAB_BAR) {
      const badge = h('span', { class: 'badge-dot', hidden: true });
      const button = h(
        'button',
        { class: 'tab', type: 'button', 'aria-label': TAB_LABEL[tab], onclick: () => this.push({ k: 'selectTab', tab }) },
        icon(TAB_ICON[tab]),
        h('span', {}, TAB_LABEL[tab]),
        badge,
      );
      button.addEventListener('pointerdown', () => {
        this.keyboardNav = false;
        this.audio.unlock();
      });
      nav.append(button);
      this.tabs.set(tab, { button, badge });
    }
  }

  /** Mirrors the session's screen onto the DOM: tab bar, selected tab, badges, buttons. */
  private syncChrome(force = false): void {
    const s = this.session;
    const screen = s.screen;
    const selected = barTab(screenTab(screen));
    const badges = TAB_BAR.map((tab) => s.badge(tab));
    const match = this.versus.match;
    const key = `${screen.k}|${selected}|${JSON.stringify(badges)}|${s.world.shift.phase}|${s.special?.k ?? ''}|${s.shareable ? 1 : 0}|${match ? 1 : 0}|${this.versus.canRematch ? 1 : 0}`;
    if (!force && key === this.chromeKey) return;
    this.chromeKey = key;
    this.app.dataset.versus = match ? 'on' : 'off';
    this.againBtn.classList.toggle('show', this.versus.canRematch);
    this.app.dataset.tabbar = showsTabBar(screen) && !match ? 'shown' : 'hidden';
    this.app.dataset.screen = screen.k;
    this.moveTabIndicator(TAB_BAR.indexOf(selected));
    for (const [tab, { button, badge: el }] of this.tabs) {
      if (tab === selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
      const b = badges[TAB_BAR.indexOf(tab)] ?? null;
      el.hidden = b === null;
      el.textContent = b && b !== 'dot' ? (b.count > 99 ? '99+' : String(b.count)) : '';
      el.style.minWidth = b === 'dot' ? '10px' : '';
      el.style.height = b === 'dot' ? '10px' : '';
    }
    // Settings come back as soon as a shift is over, on the result as on the waiting screen.
    this.settingsBtn.classList.toggle('show', screen.k === 'ready' || screen.k === 'result');
    this.dispatchBtn.classList.toggle('show', screen.k === 'playing');
    const onGame = screen.k === 'ready' || screen.k === 'result';
    this.shareBtn.classList.toggle('show', screen.k === 'result' && s.shareable !== null);
    this.leaveBtn.classList.toggle('show', onGame && s.special !== null);
    this.leaveLabel.textContent = s.special?.k === 'trial' ? 'Leave trial' : 'Leave challenge';
    if (screen.k === 'settings' && !isSheetOpen()) this.showSettingsSheet();
    if (screen.k !== 'settings' && this.closeSettings) {
      const close = this.closeSettings;
      this.closeSettings = null;
      close();
    }
  }

  private moveTabIndicator(index: number): void {
    const pill = this.tabIndicator;
    if (!pill) return;
    pill.hidden = index < 0;
    if (index < 0) return;
    // Placed at once the first time and after keyboard navigation; glides after a tap.
    pill.classList.toggle('instant', this.keyboardNav || !pill.dataset.placed);
    pill.style.transform = `translateX(${index * 100}%)`;
    if (!pill.dataset.placed) requestAnimationFrame(() => (pill.dataset.placed = 'true'));
  }

  /** The finished shift as a link: the share sheet on a phone, the clipboard elsewhere. */
  private async share(): Promise<void> {
    const s = this.session;
    const url = s.shareLink(location.origin + location.pathname);
    const spec = s.shareable;
    if (!url || !spec) return;
    const text = S.run.shareText(Fmt.number(spec.target));
    const touch = window.matchMedia('(pointer: coarse)').matches;
    if (touch && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Car Game', text, url });
      } catch {
        /* cancelled */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      s.showNotice(S.run.copied);
    } catch {
      window.prompt('Copy this link', url);
    }
  }

  /** `#challenge=…` in the address: a friend's shift to play. Read once, then cleared. */
  private readChallengeLink(): void {
    const match = /^#challenge=([A-Za-z0-9_-]+)$/.exec(location.hash);
    if (!match) return;
    history.replaceState(null, '', location.pathname + location.search);
    const spec = decodeChallenge(match[1]);
    if (!spec) {
      this.session.showNotice(S.run.brokenLink);
      return;
    }
    this.pendingChallenge = spec;
    this.openPendingChallenge();
  }

  private openPendingChallenge(): void {
    const spec = this.pendingChallenge;
    if (!spec || this.session.screen.k === 'playing' || this.session.screen.k === 'settings') return;
    this.pendingChallenge = null;
    this.session.startChallenge(spec);
  }

  private openSettings(): void {
    this.audio.unlock();
    this.push({ k: 'perform', action: { k: 'openSettings' } });
  }

  private showSettingsSheet(): void {
    const s = this.session;
    this.closeSettings = settingsSheet(this.layers, s.save.settings, {
      changed: () => s.saveSettings(),
      reset: () => s.resetProgress(),
      exportText: () => exportSave(s.save),
      importSave: (save) => s.importProgress(save),
      install: this.installPrompt
        ? () => {
            void this.installPrompt?.prompt();
            this.installPrompt = null;
          }
        : null,
      closed: () => {
        this.closeSettings = null;
        s.perform({ k: 'closeSettings' });
      },
    });
  }

  // MARK: Input

  private toViewport(e: PointerEvent): { x: number; y: number } {
    return v(e.clientX - this.safe.left, e.clientY - this.safe.top);
  }

  private bindInput(canvas: HTMLCanvasElement): void {
    // Pointer down, not click: the car leaves in the very frame of the touch.
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button === 2) {
        e.preventDefault();
        this.push({ k: 'dispatch' });
        return;
      }
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      this.keyboardNav = false;
      this.audio.unlock();
      if (isSheetOpen()) return;
      if (this.versus.match) {
        e.preventDefault();
        this.versus.match.tap();
        return;
      }
      if (this.pointerId !== null) return;
      e.preventDefault();
      this.pointerId = e.pointerId;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      this.push({ k: 'pointerDown', p: this.toViewport(e), ago: Math.max(0, (performance.now() - e.timeStamp) / 1000) });
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.pointerId) return;
      this.push({ k: 'pointerMove', p: this.toViewport(e) });
    });
    const up = (e: PointerEvent): void => {
      if (e.pointerId !== this.pointerId) return;
      this.pointerId = null;
      this.push({ k: 'pointerUp', p: this.toViewport(e) });
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.size.y : 1;
        this.push({ k: 'wheel', p: v(e.clientX - this.safe.left, e.clientY - this.safe.top), dy: e.deltaY * scale });
      },
      { passive: false },
    );
    document.addEventListener('pointerdown', () => this.audio.unlock(), { capture: true });

    document.addEventListener('keydown', (e) => {
      if (isSheetOpen()) return;
      const onControl = (e.target as HTMLElement).closest('button, input, a, [role="switch"]') !== null;
      const key = e.key;
      if (e.repeat && key !== 'Tab') return;
      this.audio.unlock();
      this.keyboardNav = true;
      const match = this.versus.match;
      if (match) {
        if (e.code === 'Space' && !onControl) {
          e.preventDefault();
          match.tap();
        } else if (key === 'Enter' && !onControl && this.versus.canRematch) {
          e.preventDefault();
          this.versus.start();
        }
        return;
      }
      if (e.code === 'Space') {
        if (onControl) return;
        e.preventDefault();
        this.push({ k: 'tap', ago: Math.max(0, (performance.now() - e.timeStamp) / 1000) });
      } else if (key === 'Enter' && !onControl) {
        e.preventDefault();
        this.push({ k: 'confirm' });
      } else if (key === 'Escape') {
        this.push({ k: 'back' });
      } else if (key === 'ArrowLeft' || key === 'ArrowRight') {
        this.push({ k: 'swipeMode', step: key === 'ArrowLeft' ? -1 : 1 });
      } else if (key === 'e' || key === 'E' || key === 'd' || key === 'D') {
        this.push({ k: 'dispatch' });
      } else if (key === 'r' || key === 'R') {
        this.push({ k: 'restart' });
      } else if (key === 'Tab' && !e.shiftKey && !onControl) {
        e.preventDefault();
        this.push({ k: 'nextTab' });
      }
    });

    // An interruption freezes the world; coming back counts in.
    const away = (): void => {
      this.push({ k: 'focusLost' });
      this.audio.setSuspended(true);
    };
    const back = (): void => {
      this.push({ k: 'focusGained' });
      this.audio.setSuspended(false);
      this.last = performance.now();
    };
    document.addEventListener('visibilitychange', () => (document.hidden ? away() : back()));
    window.addEventListener('blur', () => {
      if (this.session.screen.k === 'playing') this.push({ k: 'focusLost' });
    });
    window.addEventListener('focus', () => this.push({ k: 'focusGained' }));
  }

  private resize(): void {
    const style = getComputedStyle(this.probe);
    this.safe = {
      top: parseFloat(style.paddingTop) || 0,
      right: parseFloat(style.paddingRight) || 0,
      bottom: parseFloat(style.paddingBottom) || 0,
      left: parseFloat(style.paddingLeft) || 0,
    };
    const w = window.innerWidth;
    const hgt = window.innerHeight;
    this.drawer.resize(w, hgt, Math.min(window.devicePixelRatio || 1, 3));
    this.drawer.offset = v(this.safe.left, this.safe.top);
    this.size = v(Math.max(1, w - this.safe.left - this.safe.right), Math.max(1, hgt - this.safe.top - this.safe.bottom));
  }

  // MARK: Loop

  private loop(now: number): void {
    const delta = Math.max(0, (now - this.last) / 1000);
    this.last = now;
    const actions = this.actions;
    this.actions = [];
    const s = this.session;
    const match = this.versus.match;
    // A multiplayer match owns the canvas; the career world waits where it was.
    const list = match ? match.frame(delta, this.size, s.reduceMotion) : s.frame(delta, actions, this.size, TAB_HEIGHT);
    this.drawer.draw(list);
    this.detail.update(s.detail);
    s.sheetInset = this.detail.inset;
    this.audio.updateMusic(match ? Music.silent : s.musicMix, s.save.settings.sound, Math.min(delta, 0.1));
    this.app.classList.toggle('reduce-motion', s.reduceMotion);
    if (this.pendingChallenge) this.openPendingChallenge();
    this.syncChrome();
    requestAnimationFrame((t) => this.loop(t));
  }

  /** For tests: close any sheet the shell opened. */
  closeSheets(): void {
    closeAnySheet();
  }
}
