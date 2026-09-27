import './shell.css';
import { v } from '../core/vec2';
import { GameSession, type InputAction } from '../present/session';
import { CanvasDrawer } from '../present/draw';
import { TAB_BAR, barTab, screenTab, showsTabBar, type Tab } from '../present/flow';
import { AudioPlayer, Haptics } from '../audio/player';
import { h, icon } from './dom';
import { ICONS } from './icons';
import { settingsSheet, isSheetOpen, closeAnySheet } from './sheets';
import { exportSave } from '../storage/save';
import { DetailSheet } from './detailSheet';

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

  constructor(
    private readonly app: HTMLElement,
    canvas: HTMLCanvasElement,
    private readonly layers: HTMLElement,
  ) {
    this.drawer = new CanvasDrawer(canvas);
    this.session = new GameSession({
      sound: (id, pitch, pan) => this.audio.play(id, pitch, pan),
      haptic: (id, softness) => this.haptics.play(id, softness),
    });
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
    app.append(this.settingsBtn, this.dispatchBtn);
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
    const badge = s.badge('shop');
    const key = `${screen.k}|${selected}|${JSON.stringify(badge)}|${s.world.shift.phase}`;
    if (!force && key === this.chromeKey) return;
    this.chromeKey = key;
    this.app.dataset.tabbar = showsTabBar(screen) ? 'shown' : 'hidden';
    this.app.dataset.screen = screen.k;
    this.moveTabIndicator(TAB_BAR.indexOf(selected));
    for (const [tab, { button, badge: el }] of this.tabs) {
      if (tab === selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
      const b = tab === 'shop' ? badge : null;
      el.hidden = b === null;
      el.textContent = b && b !== 'dot' ? (b.count > 99 ? '99+' : String(b.count)) : '';
      el.style.minWidth = b === 'dot' ? '10px' : '';
      el.style.height = b === 'dot' ? '10px' : '';
    }
    this.settingsBtn.classList.toggle('show', screen.k === 'ready');
    this.dispatchBtn.classList.toggle('show', screen.k === 'playing');
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
      if (isSheetOpen() || this.pointerId !== null) return;
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
    const list = s.frame(delta, actions, this.size, TAB_HEIGHT);
    this.drawer.draw(list);
    this.detail.update(s.detail);
    s.sheetInset = this.detail.inset;
    this.audio.updateMusic(s.musicMix, s.save.settings.sound, Math.min(delta, 0.1));
    this.app.classList.toggle('reduce-motion', s.reduceMotion);
    this.syncChrome();
    requestAnimationFrame((t) => this.loop(t));
  }

  /** For tests: close any sheet the shell opened. */
  closeSheets(): void {
    closeAnySheet();
  }
}
