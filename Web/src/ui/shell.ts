import './shell.css';
import { v } from '../core/vec2';
import { GameSession, type InputAction, type SessionOutput } from '../present/session';
import { CanvasDrawer } from '../present/draw';
import { SWIPE_MODES, TAB_BAR, barTab, screenTab, showsTabBar, type Tab } from '../present/flow';
import { AudioPlayer, Haptics } from '../audio/player';
import { h, icon } from './dom';
import { ICONS } from './icons';
import { settingsSheet, deleteAccountSheet, patchNotesSheet, legalSheet, licensesSheet, installDialog, cloudIntroDialog, isSheetOpen, closeAnySheet } from './sheets';
import { cloudEnabled, cloudIntroDue, cloudLinked, cloudView, deleteCloud, markCloudIntroSeen } from '../net/cloud';
import { deleteAccount, describeError, fetchFriends, leaderboardEnabled, loadAccount } from '../net/leaderboard';
import { collectRewards } from '../net/rewards';
import { legalDoc } from '../present/legal';
import { PATCH_NOTES } from '../present/patchNotes';
import { PhotoView } from './photo';
import { celebrate, invitedRoom, onAdAudio, reportGameplay, rewardedAd } from './crazygames';
import { inPlayStore, inPortal, isInstalled, isIos, isIpad, keepStorage, renewStorage } from '../storage/device';
import type { Hint } from '../core/career';
import { decodeChallenge, type ChallengeSpec } from '../core/challenge';
import { knownShortLink, shortLink } from '../net/challengeLink';
import { S, Fmt } from '../present/strings';
import { DetailSheet } from './detailSheet';
import { VersusLobby } from './versusLobby';
import { leaderboardSheet } from './leaderboardSheet';
import { cloudSheet } from './cloudSheet';
import { REACTION_EMOJI } from '../present/versus';
import { REACTIONS } from '../net/room';
import { LiveRegion } from './liveRegion';
import { ResultBanner } from '../present/hud';
import { BackdropLayer, backdropSheet } from './backdrop';
import { loadBackdrop, saveBackdrop } from '../storage/backdrop';
import { BIG_SCREEN } from '../core/loot';
import { Careers } from '../core/career';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const TAB_HEIGHT = 56;
/** The photo's scene in points (drawn at twice the pixels): the square on the print. */
const PHOTO_SCENE = v(492, 492);

/** A key hint on a floating button; CSS shows it only where there is a keyboard and a mouse. */
const keycap = (label: string): HTMLElement => h('kbd', { class: 'keycap', 'aria-hidden': 'true' }, label);
const TAB_LABEL: Record<Tab, string> = { progress: 'Progress', game: 'Game', shop: 'Shop', upgrades: 'Build', streetBuilder: 'Build' };
const TAB_ICON: Record<Tab, string> = { progress: ICONS.progress, game: ICONS.game, shop: ICONS.shop, upgrades: ICONS.build, streetBuilder: ICONS.build };
/** Keys that scroll a list, in points; ±1 means a page (most of the window's height). */
const SCROLL_KEYS: Partial<Record<string, number>> = { ArrowDown: 60, ArrowUp: -60, PageDown: 1, PageUp: -1, Home: -1e6, End: 1e6 };

/** Runs `then` once the pointer that is down now is lifted (or cancelled). */
function afterRelease(then: () => void): void {
  const done = (): void => {
    window.removeEventListener('pointerup', done, true);
    window.removeEventListener('pointercancel', done, true);
    then();
  };
  window.addEventListener('pointerup', done, true);
  window.addEventListener('pointercancel', done, true);
}

/** Drops the click a tap produces after its pointerup (a moment later on touch). */
function swallowNextClick(): void {
  const swallow = (e: Event): void => {
    e.stopPropagation();
    e.preventDefault();
    stop();
  };
  const stop = (): void => window.removeEventListener('click', swallow, true);
  window.addEventListener('click', swallow, true);
  window.setTimeout(stop, 400);
}

/**
 * The browser shell: one canvas that draws the whole game (scene, HUD and pages), and a thin DOM layer for what should feel native — the tab bar, the settings
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
  /** Focus moved with Tab since the last pointer press: a focused button then keeps Space and Enter. */
  private focusByKeyboard = false;
  private readonly settingsBtn: HTMLButtonElement;
  private readonly dispatchBtn: HTMLButtonElement;
  private readonly shareBtn: HTMLButtonElement;
  private readonly photoBtn: HTMLButtonElement;
  private readonly photo: PhotoView;
  /**
   * A page opened from the settings (patch notes, a legal page) is showing: closing the
   * settings sheet for it is not leaving the settings.
   */
  private pageOpen = false;
  /** Adaptive resolution: the device pixel ratio in use, and how the frames have been going. */
  private dprCap = 2;
  private frameAvg = 1 / 60;
  private frameJitter = 0;
  private slowFor = 0;
  private fastFor = 0;
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
  private readonly againLabel: HTMLElement;
  private readonly lobbyBtn: HTMLButtonElement;
  private readonly revengeBtn: HTMLButtonElement;
  private readonly reactBar: HTMLElement;
  /** A `#join=` link that arrived mid-shift: it opens once the shift is over. */
  private pendingJoin: string | null = null;
  /** A CrazyGames invite is read once, on the first look. */
  private portalInviteRead = false;
  private readonly live: LiveRegion;
  /** Big Screen: the player's picture or video behind the canvas. */
  private readonly backdrop: BackdropLayer;

  constructor(
    private readonly app: HTMLElement,
    canvas: HTMLCanvasElement,
    private readonly layers: HTMLElement,
  ) {
    this.drawer = new CanvasDrawer(canvas);
    const output: SessionOutput = {
      sound: (id, pitch, pan) => this.audio.play(id, pitch, pan),
      haptic: (id, softness) => this.haptics.play(id, softness),
      celebrate: () => celebrate(),
      rewardedAd: (done) => rewardedAd(done),
    };
    onAdAudio((on) => this.audio.setSuspended(on || document.hidden));
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
    // Under any result: the picture on the screen, to send or keep.
    this.photoBtn = h('button', { class: 'btn glass run-btn', type: 'button', 'aria-label': S.photo.buttonLabel, 'aria-haspopup': 'dialog', onclick: () => this.takePicture() }, icon(ICONS.camera), h('span', {}, S.photo.button));
    this.photo = new PhotoView(app, {
      shutter: () => {
        this.audio.unlock();
        if (this.session.save.settings.sound) this.audio.play('shutter', 1);
        if (this.session.save.settings.haptics) this.haptics.play('tap', 0);
      },
      reduceMotion: () => this.session.reduceMotion,
      link: () => {
        const code = this.session.shareCode();
        return (code && knownShortLink(code)) ?? this.session.shareLink(location.origin + location.pathname);
      },
    });
    this.leaveLabel = h('span', {}, 'Leave');
    this.leaveBtn = h('button', { class: 'btn glass run-btn', type: 'button', 'aria-keyshortcuts': 'Escape', onclick: () => this.session.leaveSpecial() }, icon(ICONS.close), this.leaveLabel);
    // Multiplayer: a friend's code or your own; the match takes over the canvas.
    const feel = { sound: () => this.session.save.settings.sound, haptics: () => this.session.save.settings.haptics };
    this.versus = new VersusLobby(layers, output, feel, {
      started: () => this.syncChrome(true),
      ended: (message: string | null) => {
        if (message) this.session.showNotice(message);
        this.last = performance.now();
        this.syncChrome(true);
      },
    });
    // The last page of the mode swipe: a tap there opens the lobby.
    this.session.onVersus = () => {
      if (!isSheetOpen()) this.versus.open();
    };
    // Progress → the rank chip: the leaderboards. The chip reacts on the press, the sheet opens
    // when the finger lifts, and the click that follows is swallowed: otherwise it lands on the
    // scrim that just appeared under the finger and closes the sheet again.
    this.session.onLeaderboard = () => {
      const open = (): void => {
        if (isSheetOpen()) return;
        swallowNextClick();
        leaderboardSheet(this.layers, { records: () => this.session.leaderboardRecords, closed: () => this.syncChrome(true) });
      };
      if (this.pointerId === null) open();
      else afterRelease(open);
    };
    // Big Screen: what the player chose last time comes back (only once they own it: nothing
    // loads from another site before), and its sheet opens from the Collection.
    this.backdrop = new BackdropLayer(app, canvas);
    const saved = loadBackdrop();
    if (saved && Careers.owns(this.session.save.career, BIG_SCREEN)) {
      void this.backdrop.show(saved).then((ok) => {
        if (!ok && this.session.save.career.mapSkin === BIG_SCREEN) this.session.showNotice(S.backdrop.lost);
      });
    }
    this.session.onBackdrop = () => {
      const open = (): void => {
        if (isSheetOpen()) return;
        backdropSheet(this.layers, this.backdrop, {
          applied: (kept) => {
            this.session.wearBigScreen();
            this.session.showNotice(kept ? S.backdrop.on : S.backdrop.notKept);
          },
          removed: () => undefined,
          closed: () => this.syncChrome(true),
        });
      };
      // From a double tap on the canvas: open when the finger lifts, as with the leaderboards.
      if (this.pointerId === null) open();
      else
        afterRelease(() => {
          swallowNextClick();
          open();
        });
    };
    const runBar = h('div', { class: 'run-bar' }, this.photoBtn, this.shareBtn, this.leaveBtn);
    // After a match: Ready (everyone taps it, then the next round starts), and for the host a
    // way back to the lobby to change the format or the bots.
    this.againLabel = h('span', {}, 'Play again');
    this.againBtn = h(
      'button',
      { class: 'btn glass run-btn primary-run', type: 'button', 'aria-keyshortcuts': 'Enter', 'aria-pressed': 'false', onclick: () => this.versus.toggleReady() },
      icon(ICONS.check),
      this.againLabel,
    );
    this.lobbyBtn = h('button', { class: 'btn glass run-btn', type: 'button', onclick: () => this.versus.backToLobby() }, icon(ICONS.people), h('span', {}, 'Lobby'));
    const quitBtn = h('button', { class: 'btn glass run-btn show', type: 'button', onclick: () => this.versus.leave() }, icon(ICONS.close), h('span', {}, 'Leave'));
    this.versusBar = h('div', { class: 'versus-bar' }, quitBtn, this.lobbyBtn, this.againBtn);
    // Out of the match: reactions for everyone, and one lorry from the stands.
    this.revengeBtn = h(
      'button',
      { class: 'btn glass run-btn revenge-btn', type: 'button', 'aria-label': 'Send a lorry into the ring', 'aria-keyshortcuts': 'T', onclick: () => this.versus.match?.revenge() },
      icon(ICONS.truck),
      h('span', {}, 'Send a lorry'),
    );
    const reactButtons = REACTIONS.map((r, i) =>
      h('button', { class: 'react-btn', type: 'button', 'aria-label': `React ${r}`, 'aria-keyshortcuts': String(i + 1), onclick: () => this.versus.react(r) }, REACTION_EMOJI[r]),
    );
    this.reactBar = h('div', { class: 'react-bar', role: 'group', 'aria-label': 'Reactions' }, ...reactButtons, this.revengeBtn);
    for (const b of [this.settingsBtn, this.dispatchBtn, this.shareBtn, this.photoBtn, this.leaveBtn, this.againBtn, this.lobbyBtn, quitBtn, this.reactBar]) b.addEventListener('pointerdown', (e) => e.stopPropagation());
    app.append(this.settingsBtn, this.dispatchBtn, runBar, this.reactBar, this.versusBar);
    this.detail = new DetailSheet(
      app,
      (action) => {
        this.audio.unlock();
        this.push({ k: 'perform', action });
      },
      () => this.session.closeDetail(),
    );

    this.live = new LiveRegion(app);
    this.session.onChrome = () => {
      this.syncChrome(true);
      this.scheduleCloudIntro();
    };
    this.session.onHint = (hint) => void this.giveHint(hint);
    this.bindInput(canvas);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e as InstallPromptEvent;
    });
    // An installed game is kept more readily; and once the player has something to lose
    // (the level-3 hint came), every visit asks again where asking is silent.
    window.addEventListener('appinstalled', () => void keepStorage());
    if (this.session.save.hints.includes('install')) void renewStorage();
    this.readStartLink();
    this.readChallengeLink();
    this.readJoinLink();
    window.addEventListener('hashchange', () => {
      this.readChallengeLink();
      this.readJoinLink();
    });
    this.syncChrome(true);
    requestAnimationFrame((t) => this.loop(t));
    this.scheduleCloudIntro();
    window.setTimeout(() => this.collectRewards(), 3000);
  }

  /** Rewards from the team (a bug report's Ladybug skin, chests): picked up between shifts. */
  private collectRewards(tries = 0): void {
    if (this.session.screen.k === 'playing') {
      if (tries < 20) window.setTimeout(() => this.collectRewards(tries + 1), 15000);
      return;
    }
    void collectRewards((items) => this.session.payRewards(items));
  }

  get game(): GameSession {
    return this.session;
  }

  /**
   * Nothing would be lost by reloading the page now: no shift running (a frozen one would be
   * gone), no match or lobby (the connection), no photo. The save is written on every change.
   */
  get canReload(): boolean {
    const k = this.session.screen.k;
    return k !== 'playing' && k !== 'settings' && !this.versus.match && !this.versus.isOpen && !this.photo.isOpen;
  }

  /** Cloud progress from another device may replace the save: not during a shift, not on a page. */
  get canTakeCloud(): boolean {
    return this.canReload && this.session.screen.k !== 'page';
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
    const lobby = this.versus;
    // Asked every frame: built as one plain string (no JSON, no arrays) so it leaves next to no garbage.
    const versusKey = match
      ? `${match.isOver},${match.isOut},${match.canRevenge},${lobby.canReady},${lobby.isReady},${lobby.enoughForNext},${lobby.nextLabel},${lobby.isHost}`
      : '';
    let badgeKey = '';
    for (const b of badges) badgeKey += b === null ? '-' : b === 'dot' ? '.' : `${b.count};`;
    const key = `${screen.k}|${selected}|${badgeKey}|${s.world.shift.phase}|${s.special?.k ?? ''}|${s.shareable ? 1 : 0}|${match ? 1 : 0}|${versusKey}|${s.save.settings.leftHanded}|${s.notesUnread}`;
    if (!force && key === this.chromeKey) return;
    this.chromeKey = key;
    reportGameplay(screen.k === 'playing' && !document.hidden);
    this.app.dataset.versus = match ? 'on' : 'off';
    this.app.dataset.hand = s.save.settings.leftHanded ? 'left' : 'right';
    this.settingsBtn.classList.toggle('has-news', s.notesUnread);
    const ready = lobby.isReady;
    this.againBtn.classList.toggle('show', lobby.canReady);
    this.againBtn.disabled = lobby.canReady && !lobby.enoughForNext;
    this.againBtn.setAttribute('aria-pressed', String(ready));
    this.againBtn.classList.toggle('waiting', ready);
    this.againLabel.textContent = !lobby.enoughForNext ? 'Not enough players' : ready ? 'Ready · waiting' : lobby.nextLabel;
    this.lobbyBtn.classList.toggle('show', lobby.canReady && lobby.isHost);
    const watching = !!match && match.isOut && !match.isOver;
    this.reactBar.classList.toggle('show', watching);
    this.revengeBtn.classList.toggle('show', watching && match.canRevenge);
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
    this.photoBtn.classList.toggle('show', screen.k === 'result' && !match);
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
    const long = s.shareLink(location.origin + location.pathname);
    const spec = s.shareable;
    const code = s.shareCode();
    if (!long || !spec || !code) return;
    // The short link with its picture (`net/challengeLink.ts`), else the long one as before.
    const url = (await shortLink(spec, code)) ?? long;
    if (s.shareable !== spec) return;
    const text = S.run.shareText(Fmt.number(spec.target));
    const touch = window.matchMedia('(pointer: coarse)').matches;
    if (touch && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: S.gameTitle, text, url });
      } catch (error) {
        // Some browsers allow the share sheet only right after the tap. The link is ready now: one more tap shares it at once.
        if (error instanceof DOMException && error.name === 'NotAllowedError') s.showNotice(S.run.linkReady);
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

  /** The result as a photo: a flash, then the print to look at, share or download (`PhotoView`). */
  private takePicture(): void {
    void this.photo.open(() => this.session.photo(PHOTO_SCENE), this.photoBtn);
  }

  /**
   * Adaptive quality (Leo, 29.09.2026: never below 30 fps, lower the detail instead). Frames
   * that keep coming slow and uneven, or steadily under 29 fps, step down: the pixel ratio
   * 2 → 1.5 → 1, then the decoration (ground texture, what flies through the air, cloud
   * shadows). If even that is not enough, Reduce Motion is recommended once, never switched on.
   * A long smooth stretch steps back up. A steady 30 fps (a phone saving power) is left alone.
   */
  private adaptQuality(delta: number): void {
    if (delta <= 0 || delta > 0.25 || document.hidden) return;
    this.frameAvg += (delta - this.frameAvg) * 0.05;
    this.frameJitter += (Math.abs(delta - this.frameAvg) - this.frameJitter) * 0.05;
    const struggling = this.frameAvg > 1 / 45 && (this.frameJitter > 0.004 || this.frameAvg > 1 / 29);
    if (struggling) {
      this.slowFor += delta;
      this.fastFor = 0;
    } else if (this.frameAvg < 1 / 57) {
      this.fastFor += delta;
      this.slowFor = 0;
    } else {
      this.slowFor = 0;
      this.fastFor = 0;
    }
    const device = window.devicePixelRatio || 1;
    const inUse = Math.min(device, this.dprCap);
    const s = this.session;
    if (this.slowFor > 2 && inUse > 1) {
      this.dprCap = Math.max(1, inUse - 0.5);
      this.slowFor = 0;
      this.resize();
    } else if (this.slowFor > 2 && !s.lowDetail) {
      s.lowDetail = true;
      // The glass over the scene goes solid too: its blur is redone every frame (shell.css).
      this.app.dataset.detail = 'low';
      this.slowFor = 0;
    } else if (this.slowFor > 4) {
      this.slowFor = 0;
      s.recommendReduceMotion();
    } else if (this.fastFor > 12 && s.lowDetail) {
      s.lowDetail = false;
      delete this.app.dataset.detail;
      this.fastFor = 0;
    } else if (this.fastFor > 12 && this.dprCap < Math.min(2, device)) {
      this.dprCap = Math.min(2, this.dprCap + 0.5);
      this.fastFor = 0;
      this.resize();
    }
  }

  /**
   * `?start=shift|unlimited|multiplayer`: an app shortcut (a long press on the app icon, the
   * manifest's `shortcuts`). It picks that page of the mode swipe, so a Shift brings the Daily
   * Shift when it is open; Multiplayer opens the lobby. Read once, then taken out of the address.
   * Not before the tutorial is done: a new player starts at the beginning.
   */
  private readStartLink(): void {
    const params = new URLSearchParams(location.search);
    const start = params.get('start');
    if (start === null) return;
    params.delete('start');
    const query = params.toString();
    history.replaceState(null, '', location.pathname + (query ? `?${query}` : '') + location.hash);
    const mode = SWIPE_MODES.find((m) => m === start);
    if (!mode || !this.session.save.tutorialDone) return;
    this.session.perform({ k: 'setGameMode', mode });
    if (mode === 'multiplayer') this.versus.open();
  }

  /**
   * `#join=1234` in the address, or a CrazyGames invite link: a friend's multiplayer game.
   * Read once, then cleared.
   */
  private readJoinLink(): void {
    const match = /^#join=(\d{4})$/.exec(location.hash);
    if (match) history.replaceState(null, '', location.pathname + location.search);
    const code = match?.[1] ?? (this.portalInviteRead ? null : invitedRoom());
    this.portalInviteRead = true;
    if (!code) return;
    this.pendingJoin = code;
    this.openPendingJoin();
  }

  private openPendingJoin(): void {
    const code = this.pendingJoin;
    const k = this.session.screen.k;
    if (!code || k === 'playing' || k === 'settings' || (isSheetOpen() && !this.versus.isOpen)) return;
    this.pendingJoin = null;
    this.versus.joinByLink(code);
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

  /**
   * A one-time hint came due. Level 5: ask the browser to keep the save and recommend the Home
   * Screen (not when installed already). Level 12: recommend Cloud sync while this device has no
   * cloud copy (Leo, 01.10.2026: it replaced the export). No install tip on a portal (nothing to
   * install, the portal's login keeps the save) or in the Google Play app (installed already).
   */
  private async giveHint(hint: Hint): Promise<void> {
    if (hint === 'install') {
      await keepStorage();
      if (isInstalled() || inPortal || inPlayStore) return;
      // iPhone and iPad: the tip takes the screen until it is confirmed.
      if (isIos()) installDialog(this.layers, isIpad(), () => undefined);
      else if (this.installPrompt) this.session.announce(window.matchMedia('(pointer: coarse)').matches ? S.hints.homeScreen : S.hints.install);
    } else if (hint === 'backup') {
      if (cloudEnabled && cloudView().code === null) this.session.announce(S.hints.backup);
    }
  }

  /** A page over the settings closed: the settings come back (`syncChrome` reopens them). */
  private pageClosed(): void {
    this.pageOpen = false;
    this.syncChrome(true);
  }

  /** The cloud sync page, over the settings; the settings come back when it closes. */
  private openCloudPage(): void {
    const s = this.session;
    this.pageOpen = true;
    cloudSheet(this.layers, { current: () => s.save, importSave: (save) => s.importProgress(save), closed: () => this.pageClosed() });
  }

  /** The pop-up's button: Settings open (as from the gear), and the cloud page lands on top of them. */
  private openCloudFromIntro(): void {
    this.wantCloud = true;
    this.openSettings();
  }

  /** Set until the settings sheet is up: it then opens the cloud page right away. */
  private wantCloud = false;

  /** Set once the pop-up is on its way (or not due on this device): it is looked at only once. */
  private cloudIntroScheduled = false;

  /**
   * The Cloud sync pop-up comes once the player has something to keep (Leo, 01.10.2026: from
   * `config.cloudIntroFromLevel`): at the start of a visit, or after the shift that reaches it,
   * a moment later so it does not cover the first frame or the result.
   */
  private scheduleCloudIntro(): void {
    if (this.cloudIntroScheduled || this.session.save.career.level < this.session.config.cloudIntroFromLevel) return;
    this.cloudIntroScheduled = true;
    window.setTimeout(() => this.maybeShowCloudIntro(), 1500);
  }

  /**
   * Once per device: a pop-up that tells the player about Cloud sync and where it is
   * (`cloudIntroDialog`). It waits while something else is on screen.
   */
  private maybeShowCloudIntro(tries = 0): void {
    if (!cloudIntroDue()) return;
    const busy = isSheetOpen() || ['playing', 'result', 'settings'].includes(this.session.screen.k) || document.querySelector('.install-root, .intro-root');
    if (busy) {
      if (tries < 12) window.setTimeout(() => this.maybeShowCloudIntro(tries + 1), 5000);
      return;
    }
    markCloudIntroSeen();
    cloudIntroDialog(this.layers, { open: () => this.openCloudFromIntro(), closed: () => undefined });
  }

  private showSettingsSheet(): void {
    const s = this.session;
    this.closeSettings = settingsSheet(this.layers, s.save.settings, {
      changed: () => {
        s.saveSettings();
        this.syncChrome(true);
      },
      notesUnread: s.notesUnread,
      // The notes open over the settings; closing them brings the settings back.
      openNotes: () => {
        this.pageOpen = true;
        s.markNotesRead();
        patchNotesSheet(this.layers, PATCH_NOTES, () => this.pageClosed());
      },
      // The same for the legal pages; the licenses load only when asked for.
      openLegal: (page) => {
        this.pageOpen = true;
        if (page !== 'licenses') {
          legalSheet(this.layers, legalDoc(page), () => this.pageClosed());
          return;
        }
        import('../present/licenses')
          .then(({ LICENSES }) => licensesSheet(this.layers, LICENSES, () => this.pageClosed()))
          .catch(() => this.pageClosed());
      },
      // Delete account: a drawer over the settings; the settings come back if it is cancelled.
      openDeleteAccount: () => {
        this.pageOpen = true;
        deleteAccountSheet(this.layers, {
          online: leaderboardEnabled && (loadAccount() !== null || cloudLinked()),
          run: async () => {
            try {
              const account = loadAccount();
              if (account) await deleteAccount(account);
              if (cloudEnabled) await deleteCloud();
            } catch (error) {
              throw new Error(`${describeError(error)} Nothing was deleted on this device. Try again when you are online.`);
            }
            s.resetProgress();
            void this.backdrop.show(null);
            saveBackdrop(null);
            this.pageOpen = false;
            s.perform({ k: 'closeSettings' });
          },
          closed: () => {
            if (this.pageOpen) this.pageClosed();
          },
        });
      },
      cloudOn: cloudLinked(),
      friendCode: loadAccount() ? () => fetchFriends().then((f) => f.code) : null,
      // The cloud sync page, over the settings; the settings come back when it closes.
      openCloud: () => this.openCloudPage(),
      install: this.installPrompt
        ? () => {
            void this.installPrompt?.prompt();
            this.installPrompt = null;
          }
        : null,
      closed: () => {
        this.closeSettings = null;
        if (!this.pageOpen) s.perform({ k: 'closeSettings' });
      },
    });
    // Came from the pop-up: straight on to the cloud page.
    if (this.wantCloud) {
      this.wantCloud = false;
      this.openCloudPage();
    }
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
      if (isSheetOpen() || this.photo.isOpen) return;
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
    document.addEventListener(
      'pointerdown',
      () => {
        this.audio.unlock();
        this.focusByKeyboard = false;
      },
      { capture: true },
    );

    document.addEventListener('keydown', (e) => {
      if (isSheetOpen() || this.photo.isOpen) return;
      const target = e.target as HTMLElement;
      const onControl = target.closest('button, input, a, [role="switch"]') !== null;
      const key = e.key;
      if (key === 'Tab') this.focusByKeyboard = true;
      // Space and Enter always play, also on a button the mouse left focused (a tab after a
      // click); only a control reached with Tab, or a text field, keeps them for itself.
      const ownsKeys = target.closest('input, textarea, select, [contenteditable="true"]') !== null || (onControl && this.focusByKeyboard);
      if ((e.code === 'Space' || key === 'Enter') && onControl && !ownsKeys) target.blur();
      if (e.repeat && key !== 'Tab') return;
      this.audio.unlock();
      this.keyboardNav = true;
      const match = this.versus.match;
      if (match) {
        if (e.code === 'Space' && !ownsKeys) {
          e.preventDefault();
          match.tap();
        } else if (key === 'Enter' && !ownsKeys && this.versus.canReady) {
          e.preventDefault();
          this.versus.toggleReady();
        } else if (match.isOut && !match.isOver && key >= '1' && key <= String(REACTIONS.length)) {
          this.versus.react(REACTIONS[Number(key) - 1]);
        } else if (key === 't' || key === 'T') {
          match.revenge();
        }
        return;
      }
      if (e.code === 'Space') {
        if (ownsKeys) return;
        e.preventDefault();
        this.push({ k: 'tap', ago: Math.max(0, (performance.now() - e.timeStamp) / 1000) });
      } else if (key === 'Enter' && !ownsKeys) {
        e.preventDefault();
        this.push({ k: 'confirm' });
      } else if (SCROLL_KEYS[key] !== undefined && !target.closest('input, textarea, select, [contenteditable="true"]')) {
        // The lists scroll from the keyboard too (Collection, Upgrades, Progress), gliding like the wheel.
        e.preventDefault();
        const step = SCROLL_KEYS[key];
        this.push({ k: 'wheel', p: v(0, 0), dy: Math.abs(step) === 1 ? step * this.size.y * 0.8 : step });
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

    // An interruption freezes the world; coming back counts in. Not on CrazyGames (Leo,
    // 01.10.2026): in their iframe the page around the game takes the focus, and the focus did
    // not always come back, so the game hung on the count-in. There a hidden tab stops the
    // frames by itself, and coming back carries on without a jump (`last` starts over).
    const away = (): void => {
      if (!inPortal) this.push({ k: 'focusLost' });
      this.audio.setSuspended(true);
    };
    const back = (): void => {
      if (!inPortal) this.push({ k: 'focusGained' });
      this.audio.setSuspended(false);
      this.last = performance.now();
    };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) away();
      else {
        back();
        this.collectRewards();
      }
      reportGameplay(this.session.screen.k === 'playing' && !document.hidden);
    });
    if (inPortal) return;
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
    // Above 2× the eye sees no difference, but a 3× phone would fill 2.25 times the pixels;
    // a device that struggles gets less (`adaptQuality`).
    this.drawer.resize(w, hgt, Math.min(window.devicePixelRatio || 1, this.dprCap));
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
    s.backdrop = this.backdrop.ready;
    // A multiplayer match owns the canvas; the career world waits where it was.
    const list = match ? match.frame(delta, this.size, s.reduceMotion) : s.frame(delta, actions, this.size, TAB_HEIGHT);
    this.drawer.draw(list);
    this.backdrop.visible = list.backdrop !== null;
    this.adaptQuality(delta);
    this.detail.update(s.detail);
    const summary = !match && s.screen.k === 'result' ? s.screen.summary : null;
    this.live.update(summary, () => (summary ? ResultBanner.spoken(summary) : ''), match ? null : s.noticeText);
    s.sheetInset = this.detail.inset;
    this.audio.updateMusic(match ? match.music : s.musicMix, s.save.settings.music, Math.min(delta, 0.1));
    this.audio.updateTension(match ? 0 : s.tension, s.save.settings.sound, Math.min(delta, 0.1));
    this.app.classList.toggle('reduce-motion', s.reduceMotion);
    if (this.pendingChallenge) this.openPendingChallenge();
    if (this.pendingJoin) this.openPendingJoin();
    this.syncChrome();
    requestAnimationFrame((t) => this.loop(t));
  }

  /** For tests: close any sheet the shell opened. */
  closeSheets(): void {
    closeAnySheet();
  }
}
