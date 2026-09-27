import { type Career, MAX_CAR_SKINS, nextUpgradePrice, type GameMode } from '../core/career';
import { baseConfig } from '../core/config';
import type { Upgrade } from '../core/levels';
import { openChest, type ChestKind, type Cosmetic } from '../core/loot';
import { Rng, randomSeed } from '../core/rng';
import { loadCareer, saveCareer, resetCareer } from '../storage/save';
import { Sound, Haptics } from '../audio/audio';
import { Renderer } from '../renderer/renderer';
import { GameSession, type SessionPhase } from '../game/session';
import { Hud } from './hud';
import { h, icon } from './dom';
import { ICONS } from './icons';
import { renderProgress, renderShop, renderBuild, type Shelf } from './pages';
import { pauseSheet, settingsSheet, isSheetOpen, closeAnySheet } from './sheets';
import { showReveal } from './reveal';

type Page = 'progress' | 'game' | 'shop' | 'build';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** The web app: one canvas for the scene, DOM for everything around it. */
export class App {
  private career: Career;
  private readonly sound = new Sound();
  private readonly haptics = new Haptics();
  private readonly renderer: Renderer;
  private readonly session: GameSession;
  private readonly hud: Hud;
  private page: Page = 'game';
  private readonly pages: Record<Exclude<Page, 'game'>, HTMLElement>;
  private readonly tabs = new Map<Page, HTMLButtonElement>();
  private shelf: Shelf = 'common';
  private careerChanged = false;
  private installPrompt: InstallPromptEvent | null = null;
  private toastTimer = 0;
  private readonly motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  private revealOpen = false;

  constructor(
    private readonly app: HTMLElement,
    canvas: HTMLCanvasElement,
    private readonly tapZone: HTMLElement,
    private readonly layers: HTMLElement,
  ) {
    this.career = loadCareer();
    this.renderer = new Renderer(canvas);
    this.hud = new Hud(document.getElementById('hud')!, app, {
      pause: () => this.pause(),
      settings: () => this.openSettings(),
      dispatch: () => this.session.dispatch(),
      mode: (mode) => this.setMode(mode),
    });
    this.session = new GameSession(this.renderer, this.career, this.sound, this.haptics, {
      onEnded: (result, record, mode, level) => {
        this.hud.showBanner(result, record, mode, level, this.career);
        this.updateBadges();
      },
      onPhase: (phase) => this.onPhase(phase),
      save: () => this.save(),
    });
    const pagesRoot = document.getElementById('pages')!;
    this.pages = {
      progress: h('main', { class: 'page', id: 'page-progress', 'aria-label': 'Progress' }),
      shop: h('main', { class: 'page', id: 'page-shop', 'aria-label': 'Shop' }),
      build: h('main', { class: 'page', id: 'page-build', 'aria-label': 'Upgrades' }),
    };
    pagesRoot.append(this.pages.progress, this.pages.shop, this.pages.build);
    for (const el of Object.values(this.pages)) el.setAttribute('inert', '');
    this.buildTabbar(document.getElementById('tabbar')!);
    this.applySettings();
    this.bindInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
    this.motionQuery.addEventListener('change', () => this.applySettings());
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e as InstallPromptEvent;
    });
    this.onPhase(this.session.phase);
    this.updateBadges();
    this.session.start();
    this.hudLoop();
  }

  // MARK: Input

  private bindInput(): void {
    // Pointer down, not click: the car must leave in the very frame of the touch.
    this.tapZone.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      this.sound.unlock();
      if (this.page !== 'game' || isSheetOpen() || this.revealOpen) return;
      e.preventDefault();
      this.session.tap(e.timeStamp);
    });
    // No double-tap zoom, no long-press menu on the play field.
    this.tapZone.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerdown', () => this.sound.unlock(), { once: true, capture: true });
    document.addEventListener('keydown', (e) => {
      if (e.repeat || isSheetOpen() || this.revealOpen) return;
      const target = e.target as HTMLElement;
      const onControl = target.closest('button, input, a, [role="switch"]') !== null;
      if ((e.code === 'Space' || (e.key === 'Enter' && !onControl)) && this.page === 'game') {
        if (onControl && e.code === 'Space') return;
        e.preventDefault();
        this.sound.unlock();
        this.session.tap(e.timeStamp);
      } else if ((e.key === 'Escape' || e.key.toLowerCase() === 'p') && this.page === 'game') {
        if (this.session.phase === 'playing') this.pause();
      } else if (e.key.toLowerCase() === 'd' && this.page === 'game') {
        this.session.dispatch();
      } else if (this.session.phase === 'ready' && this.page === 'game' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        this.setMode(e.key === 'ArrowLeft' ? 'shift' : 'unlimited');
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.session.phase === 'playing' && !this.session.paused) this.pause();
        this.sound.suspend();
        this.session.stop();
      } else {
        if (this.page === 'game') this.session.start();
        if (!this.session.paused) this.sound.resume();
      }
    });
    window.addEventListener('pagehide', () => this.save());
  }

  private resize(): void {
    const w = window.innerWidth;
    const hgt = window.innerHeight;
    this.renderer.resize(w, hgt);
    this.layoutHud(true);
  }

  private layoutHud(immediate = false): void {
    const row = document.querySelector('.hud-row') as HTMLElement | null;
    if (row) this.hud.layout(row.getBoundingClientRect().bottom);
    const phase = this.session.phase;
    const tabbar = document.getElementById('tabbar')!;
    const bottom = phase === 'ready' ? tabbar.getBoundingClientRect().height + 8 : 20;
    this.renderer.setInsets(this.hud.topInset(), bottom, immediate);
  }

  private onPhase(phase: SessionPhase): void {
    // The session reports its first phase while it is still being built.
    if (!(this.session as GameSession | undefined)) return;
    this.app.dataset.phase = phase;
    // The tab bar is away during a shift: not reachable by keyboard either.
    document.getElementById('tabbar')!.toggleAttribute('inert', phase !== 'ready');
    if (phase !== 'ended') this.hud.hideBanner();
    if (phase === 'ready') closeAnySheet();
    this.hud.update(this.session.hudState(), this.career);
    this.layoutHud();
  }

  /** The HUD is DOM: refreshed every frame from the session's state, only where it changed. */
  private hudLoop(): void {
    const tick = (): void => {
      if (this.page === 'game' && !document.hidden) this.hud.update(this.session.hudState(), this.career);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private pause(): void {
    if (this.session.phase !== 'playing') return;
    this.session.pause();
    pauseSheet(this.layers, {
      resume: () => this.session.resume(),
      restart: () => {
        this.session.resume();
        this.session.restart();
      },
      endShift: () => {
        this.session.resume();
        this.session.endShiftNow();
      },
    });
  }

  private setMode(mode: GameMode): void {
    if (this.session.phase !== 'ready') return;
    this.sound.play('ui');
    this.session.setMode(mode);
  }

  // MARK: Tabs and pages

  private buildTabbar(nav: HTMLElement): void {
    const items: [Page, string, string][] = [
      ['progress', 'Progress', ICONS.progress],
      ['game', 'Game', ICONS.game],
      ['shop', 'Shop', ICONS.shop],
      ['build', 'Build', ICONS.build],
    ];
    for (const [page, label, paths] of items) {
      const btn = h('button', { class: 'tab', type: 'button', 'aria-label': label, onclick: () => this.show(page) }, icon(paths), h('span', {}, label));
      if (page === 'game') btn.setAttribute('aria-current', 'page');
      this.tabs.set(page, btn);
      nav.append(btn);
    }
  }

  private show(page: Page): void {
    if (this.session.phase !== 'ready') return;
    if (page === this.page) {
      this.pages[page as Exclude<Page, 'game'>]?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    this.sound.play('ui');
    this.page = page;
    this.app.dataset.page = page;
    for (const [p, btn] of this.tabs) {
      if (p === page) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    }
    for (const [p, el] of Object.entries(this.pages)) {
      el.classList.toggle('active', p === page);
      el.toggleAttribute('inert', p !== page);
    }
    document.getElementById('hud')!.toggleAttribute('inert', page !== 'game');
    if (page === 'game') {
      if (this.careerChanged) {
        this.careerChanged = false;
        this.session.refreshSkins();
        this.session.refreshReadyShift();
      }
      this.session.start();
      this.layoutHud(true);
    } else {
      // The scene is hidden: no need to burn the battery on it.
      this.session.stop();
      this.renderPage(page);
    }
  }

  private renderPage(page: Page): void {
    if (page === 'progress') renderProgress(this.pages.progress, this.career);
    else if (page === 'build') renderBuild(this.pages.build, this.career, (u) => this.buyUpgrade(u));
    else if (page === 'shop') {
      renderShop(this.pages.shop, this.career, {
        buyChest: (kind) => this.buyChest(kind),
        openOwned: (i) => this.openOwnedChest(i),
        toggleSkin: (item) => this.toggleSkin(item),
        seen: (id) => {
          this.career.unseen = this.career.unseen.filter((x) => x !== id);
          this.save();
          this.updateBadges();
        },
        shelf: this.shelf,
        setShelf: (s) => {
          this.shelf = s;
          this.renderPage('shop');
        },
      });
    }
  }

  private updateBadges(): void {
    const shop = this.tabs.get('shop');
    if (!shop) return;
    const count = this.career.chests.length;
    shop.querySelector('.badge-dot')?.remove();
    if (count > 0) shop.append(h('span', { class: 'badge-dot', 'aria-label': `${count} chests to open` }, String(count)));
  }

  // MARK: Economy

  private buyUpgrade(u: Upgrade): void {
    const price = nextUpgradePrice(this.career, u);
    if (price === null || this.career.money < price) {
      this.sound.play('denied');
      return;
    }
    this.career.money -= price;
    this.career.upgrades[u] = (this.career.upgrades[u] ?? 0) + 1;
    this.careerChanged = true;
    this.sound.play('purchase');
    this.haptics.play(10);
    this.save();
    this.renderPage('build');
  }

  private buyChest(kind: 'standard' | 'premium'): void {
    const price = kind === 'standard' ? baseConfig.standardChestPrice : baseConfig.premiumChestPrice;
    if (this.career.money < price) {
      this.sound.play('denied');
      return;
    }
    this.career.money -= price;
    this.save();
    this.openChestNow(kind);
  }

  private openOwnedChest(index: number): void {
    const kind = this.career.chests[index];
    if (!kind) return;
    this.career.chests.splice(index, 1);
    this.save();
    this.updateBadges();
    this.openChestNow(kind);
  }

  private openChestNow(kind: ChestKind): void {
    const { opening, chestsSinceEpic } = openChest(kind, this.career.collection, this.career.chestsSinceEpic, new Rng(randomSeed()));
    const c = this.career;
    c.chestsSinceEpic = chestsSinceEpic;
    c.chestsOpened++;
    if (opening.isDuplicate) {
      c.money += opening.money;
    } else {
      c.collection.push(opening.item.id);
      c.unseen.push(opening.item.id);
      this.careerChanged = true;
    }
    this.save();
    this.revealOpen = true;
    const canWear = opening.item.kind === 'carSkin' && !opening.isDuplicate;
    showReveal(this.layers, opening, this.sound, this.reduceMotion, {
      wear: canWear
        ? () => {
            if (!c.carSkins.includes(opening.item.id)) {
              if (c.carSkins.length >= MAX_CAR_SKINS) c.carSkins.shift();
              c.carSkins.push(opening.item.id);
            }
            c.unseen = c.unseen.filter((x) => x !== opening.item.id);
            this.careerChanged = true;
            this.save();
          }
        : null,
      done: () => {
        this.revealOpen = false;
        this.renderPage('shop');
      },
    });
    this.renderPage('shop');
  }

  private toggleSkin(item: Cosmetic): void {
    const c = this.career;
    if (c.carSkins.includes(item.id)) {
      c.carSkins = c.carSkins.filter((x) => x !== item.id);
    } else if (c.carSkins.length >= MAX_CAR_SKINS) {
      this.toast(`Up to ${MAX_CAR_SKINS} skins at once. Take one off first.`);
      this.sound.play('denied');
      return;
    } else {
      c.carSkins.push(item.id);
    }
    this.sound.play('ui');
    this.careerChanged = true;
    this.save();
    this.renderPage('shop');
  }

  // MARK: Settings

  private get reduceMotion(): boolean {
    const s = this.career.settings.reduceMotion;
    return s === 'on' || (s === 'system' && this.motionQuery.matches);
  }

  private applySettings(): void {
    this.sound.enabled = this.career.settings.sound;
    this.haptics.enabled = this.career.settings.haptics;
    this.session.reduceMotion = this.reduceMotion;
    this.app.classList.toggle('reduce-motion', this.reduceMotion);
  }

  private openSettings(): void {
    this.sound.play('ui');
    settingsSheet(this.layers, this.career, {
      changed: () => {
        this.applySettings();
        this.save();
      },
      reset: () => {
        const fresh = resetCareer();
        Object.assign(this.career, fresh);
        this.applySettings();
        this.session.refreshSkins();
        this.session.setMode('shift');
        this.session.refreshReadyShift();
        this.updateBadges();
        this.save();
        this.toast('Progress erased. Level 1, here we go.');
      },
      install: this.installPrompt
        ? () => {
            const prompt = this.installPrompt;
            this.installPrompt = null;
            void prompt?.prompt();
            closeAnySheet();
          }
        : null,
    });
  }

  private save(): void {
    if (!saveCareer(this.career)) this.toast('Progress could not be saved in this browser.');
  }

  private toast(text: string): void {
    const el = document.getElementById('toast')!;
    el.textContent = text;
    el.classList.add('show');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => el.classList.remove('show'), 2600);
  }
}
