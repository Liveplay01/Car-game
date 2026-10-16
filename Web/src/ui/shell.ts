import './shell.css';
import { v, clamp } from '../core/vec2';
import { GameSession, type InputAction, type Modifier, type SessionOutput } from '../present/session';
import { CanvasDrawer } from '../present/draw';
import { SWIPE_MODES, TAB_BAR, barTab, screenTab, type Tab } from '../present/flow';
import { AudioPlayer, Haptics } from '../audio/player';
import { h, icon } from './dom';
import { ICONS, CHEST_FLAT } from './icons';
import { settingsSheet, deleteAccountSheet, patchNotesSheet, guidesSheet, legalSheet, licensesSheet, installDialog, offerDialog, isSheetOpen, closeAnySheet, closeTopSheet } from './sheets';
import { installBackGesture, inSystemGestureZone } from './backGesture';
import { disablePush, enablePush, pushChoiceOn, pushDelivers, pushState, pushTimers, setPushChoice, syncPush, type PushState, type PushTimer } from '../net/push';
import { cloudEnabled, cloudLinked, cloudStoppedHere, cloudView, createCloud, deleteCloud, onCloudChange } from '../net/cloud';
import { fetchInvite, inviteUrl, readInviteLink, redeemInvite } from '../net/invite';
import { deleteAccount, describeError, fetchFriends, leaderboardEnabled, loadAccount, onAccountChange, onScoresSynced, syncScores } from '../net/leaderboard';
import { collectRewards } from '../net/rewards';
import { legalDoc } from '../present/legal';
import { PATCH_NOTES } from '../present/patchNotes';
import { PhotoView } from './photo';
import { celebrate, invitedRoom, offerLogin, onAdAudio, reportGameplay, reportProgress, rewardedAd, rewardedAdsReady } from './crazygames';
import { adReady, onRewardedAudio, rewardedAdsense } from './ads';
import { track } from './analytics';
import { inItch, inPlayStore, inPortal, isInstalled, isIos, isIpad, keepStorage, renewStorage, touchFirst } from '../storage/device';
import type { Hint } from '../core/career';
import { decodeChallenge, type ChallengeSpec } from '../core/challenge';
import { knownShortLink, shortLink } from '../net/challengeLink';
import { S, Fmt } from '../present/strings';
import { DetailSheet } from './detailSheet';
import { VersusLobby } from './versusLobby';
import { SocialView } from './socialPage';
import type { ClubHost } from './clubPanel';
import type { MafiaHost } from './mafiaPanel';
import { installMafiaDebug } from './mafiaDebug';
import { SocialPage } from '../present/social';
import { cloudSheet } from './cloudSheet';
import { accountReady, accountsEnabled, accountSheet } from './accountSheet';
import { REACTION_EMOJI } from '../present/versus';
import { REACTIONS } from '../net/room';
import { LiveRegion } from './liveRegion';
import { ResultBanner } from '../present/hud';
import type { RenderList } from '../present/render';
import { ShopPage } from '../present/shop';
import { css } from '../present/theme';
import { BackdropLayer, backdropSheet } from './backdrop';
import { loadBackdrop, saveBackdrop } from '../storage/backdrop';
import { BIG_SCREEN } from '../core/loot';
import { Careers } from '../core/career';
import { baseConfig } from '../core/config';
import { INTROS, Intros } from '../present/intros';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** A number that changes whenever anything of the drawn UI (what lies after the scene) moves, grows, fades or says something else. */
function signatureOf(list: RenderList): number {
  const start = list.vignetteAt;
  let sum = list.items.length - start;
  for (let i = start; i < list.items.length; i++) {
    const { p, opacity } = list.items[i];
    let at = 0;
    switch (p.k) {
      case 'rect': at = p.center.x + p.center.y + p.size.x + p.size.y; break;
      case 'circle': at = p.center.x + p.center.y + p.radius; break;
      case 'arc': at = p.center.x + p.center.y + p.radius + p.thickness + p.start + p.end; break;
      case 'line': at = p.from.x + p.from.y + p.to.x + p.to.y + p.thickness; break;
      case 'text': at = p.position.x + p.position.y + p.size + p.text.length + (p.text.charCodeAt(0) || 0) + 3 * (p.text.charCodeAt(p.text.length - 1) || 0); break;
      default: at = (p.points[0]?.x ?? 0) + (p.points[0]?.y ?? 0) + p.points.length;
    }
    sum += (at + opacity * 97) * (1 + ((i - start) & 15));
  }
  return sum;
}

/** The icon of each modifier before a shift (`Shell.showMods`). */
const MOD_ICON: Record<Modifier['id'], string> = { heat: ICONS.flame, tailwind: ICONS.wind, streak: ICONS.streak, family: ICONS.hat };

/** The room the floating dock claims above the safe area (`--tabbar-h`). */
const TAB_HEIGHT = 64;
/** The photo's scene in points (drawn at twice the pixels): the square on the print. */
const PHOTO_SCENE = v(492, 492);

/** A key hint on a floating button; CSS shows it only where there is a keyboard and a mouse. */
const keycap = (label: string): HTMLElement => h('kbd', { class: 'keycap', 'aria-hidden': 'true' }, label);
const TAB_LABEL: Record<Tab, string> = { progress: S.tabs.progress, social: S.tabs.social, game: S.tabs.game, shop: S.tabs.shop, upgrades: S.tabs.build, streetBuilder: S.tabs.build };
const TAB_ICON: Record<Tab, string> = { progress: ICONS.progress, social: ICONS.people, game: ICONS.game, shop: ICONS.shop, upgrades: ICONS.build, streetBuilder: ICONS.build };
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
  /** A press held on the dock moves the selection pill (`holdDock`): the session's tab does not place it meanwhile. */
  private scrubbing = false;
  private suppressClick = false;
  /** The tab the pill belongs under, as the session last said. */
  private shownTabIndex = -1;
  /** Focus moved with Tab since the last pointer press: a focused button then keeps Space and Enter. */
  private focusByKeyboard = false;
  private readonly settingsBtn: HTMLButtonElement;
  /** Lies over the Settings pill for a moment: what happened to the progress ("Synced"), in place of a line of news. */
  private readonly settingsFlash = h('span', { class: 'settings-flash', role: 'status' });
  /** What the pill says next, once it is on screen: "Synced" (progress came over) or a question for the player (`ask`, blue). */
  private flashPending: { text: string; ask: boolean } | null = null;
  private flashTimer = 0;
  private readonly dispatchBtn: HTMLButtonElement;
  private readonly dispatchCount: HTMLSpanElement;
  /** The first shifts on a touch screen: tap anywhere, beside the arm; and over the dispatch button, that it can change sides. */
  private readonly tapHint = h('div', { class: 'tap-hint', 'aria-hidden': 'true' }, h('span', { class: 'tap-hint-icon' }, h('span', { class: 'tap-hint-ring' }), icon(ICONS.tap)), h('span', { class: 'tap-hint-text' }, h('b', {}, S.shell.tapAnywhere), h('span', {}, S.shell.tapAnywhereSub)));
  private readonly dispatchHint = h('div', { class: 'dispatch-hint', 'aria-hidden': 'true' }, S.shell.dispatchSide);
  /** Chill has no end of its own: this ends the drive. */
  private readonly doneBtn: HTMLButtonElement;
  private readonly photoBtn: HTMLButtonElement;
  /** On the Game tab while a Heat is open: the next step of the waiting shift. */
  /** What changes the next shift's pay (`GameSession.modifiers`): one as a labelled pill, several as round icons. */
  private readonly mods = h('div', { class: 'run-mods', role: 'group', 'aria-label': S.mods.label });
  private modsKey = '';
  /** The icon tapped open among several; null while they all stand as icons. */
  private modOpen: Modifier['id'] | null = null;
  /** The Social tab's content: Friends, Ranks and the Club under the canvas' segments. */
  private readonly social: SocialView;
  /** On the Game tab while chests wait: the way to the Chests page, in the paint of the first one. */
  private readonly chestBtn: HTMLButtonElement;
  private readonly chestLabel: HTMLElement;
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
  /** How often the game dropped to low detail by itself; the second time it stays (`adaptQuality`). */
  private lowTrips = 0;
  /** The Low detail setting as the last frame saw it, so a change takes hold at once. */
  private lowChosen = false;
  /** What the page's drawn UI looked like in the last drawn frame, and for how many frames in a row it looked the same. */
  private pageSignature = 0;
  private pageStill = 0;
  /** A page this still (about a third of a second) is drawn at half the rate, the city under it thinned (`frame`). */
  private static readonly stillFrames = 20;
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
      // On CrazyGames their ad; on the normal site and in the Play app Google's; otherwise none, and no reward.
      rewardedAd: (done) => rewardedAd(done) || rewardedAdsense(done),
      adReady: () => rewardedAdsReady() || adReady(),
      // A free upgrade step and the Skin Upgrade's boost are for the normal site and the Play app, not CrazyGames or itch.io.
      adOffers: !inPortal && !inItch,
      feelsHaptics: this.haptics.supported,
    };
    const quietForAd = (on: boolean): void => this.audio.setSuspended(on || document.hidden);
    onAdAudio(quietForAd);
    onRewardedAudio(quietForAd);
    this.session = new GameSession(output);
    this.session.nightPreview = import.meta.env.DEV && new URLSearchParams(location.search).has('night-preview');
    this.session.systemReduceMotion = this.motionQuery.matches;
    this.motionQuery.addEventListener('change', () => (this.session.systemReduceMotion = this.motionQuery.matches));

    this.probe = h('div', { 'aria-hidden': 'true' });
    this.probe.style.cssText =
      'position:fixed;inset:0;pointer-events:none;visibility:hidden;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
    document.body.append(this.probe);

    this.buildTabbar(document.getElementById('tabbar')!);
    this.settingsBtn = h(
      'button',
      { class: 'icon-btn glass float-btn settings-btn', 'aria-label': S.settings.title, 'aria-keyshortcuts': 'Escape', onclick: () => this.openSettings() },
      icon(ICONS.gear),
      h('span', { class: 'settings-label' }, S.settings.title),
      keycap('esc'),
      this.settingsFlash,
    );
    this.dispatchCount = h('span', { class: 'dispatch-count', 'aria-hidden': 'true' });
    this.dispatchBtn = h(
      'button',
      {
        class: 'icon-btn glass float-btn dispatch-btn',
        'aria-label': S.shell.dispatch,
        'aria-keyshortcuts': 'D',
        onclick: () => this.push({ k: 'dispatch' }),
      },
      icon(ICONS.siren),
      keycap('D'),
      this.dispatchCount,
    );
    this.doneBtn = h(
      'button',
      { class: 'icon-btn glass float-btn done-btn', type: 'button', 'aria-label': S.chill.doneLabel, onclick: () => this.push({ k: 'finishChill' }) },
      icon(ICONS.check),
      h('span', {}, S.chill.done),
    );
    for (const b of [this.settingsBtn, this.dispatchBtn, this.doneBtn]) b.addEventListener('pointerdown', (e) => e.stopPropagation());
    // Picture is a labelled pill like Settings and the chest pill, all one size (Leo, 08.10.2026). Friends moved to the Social tab (Leo, 10.10.2026).
    // Heat is never chosen (Leo, 15.10.2026), nor is any other modifier: the pills only show what is on and what it does.
    this.mods.addEventListener('pointerdown', (e) => e.stopPropagation());
    // Under any result: the picture on the screen, to send or keep.
    this.photoBtn = h(
      'button',
      { class: 'btn glass run-btn', type: 'button', 'aria-label': S.photo.buttonLabel, 'aria-haspopup': 'dialog', onclick: () => this.takePicture() },
      icon(ICONS.camera),
      h('span', {}, S.photo.button),
    );
    this.chestLabel = h('span', {}, S.run.openChest(1));
    const chest = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    chest.setAttribute('viewBox', '0 0 52 48');
    chest.setAttribute('class', 'chest-flat');
    chest.setAttribute('aria-hidden', 'true');
    chest.innerHTML = CHEST_FLAT;
    this.chestBtn = h('button', { class: 'btn glass run-btn primary-run', type: 'button', onclick: () => this.push({ k: 'perform', action: { k: 'showShop', section: 0 } }) }, chest, this.chestLabel);
    this.photo = new PhotoView(app, {
      shutter: () => {
        this.audio.unlock();
        if (this.session.save.settings.sound) this.audio.play('shutter', 1);
        if (this.session.save.settings.haptics) this.haptics.play('tap', 0);
      },
      reduceMotion: () => this.session.reduceMotion,
      // The picture is the way to send a challenge (Leo, 08.10.2026): its short link is made as the print develops.
      // Not inside CrazyGames, which shows no links out.
      challenge: () => {
        const s = this.session;
        const spec = s.shareable;
        const code = s.shareCode();
        const long = s.shareLink(location.origin + location.pathname);
        if (inPortal || !spec || !code || !long) return null;
        return { text: s.dailyShare ?? S.run.shareText(Fmt.number(spec.target)), fallback: knownShortLink(code) ?? long, link: shortLink(spec, code).then((url) => url ?? long, () => long) };
      },
      invite: async () => {
        const game = location.origin + location.pathname;
        if (!leaderboardEnabled || !loadAccount()) return game;
        return fetchInvite().then(inviteUrl, () => game);
      },
    });
    this.leaveLabel = h('span', {}, S.shell.leave);
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
    // The Social tab: Friends, Ranks and the Club under the canvas' segments (Progress → the rank chip leads to Ranks).
    const s = this.session;
    if (import.meta.env.DEV) installMafiaDebug(s);
    this.social = new SocialView(app, {
      friends: () => ({ records: () => s.leaderboardRecords, playTogether: () => this.openLobby(), challenge: s.shareable !== null ? () => this.share() : null }),
      ranks: () => ({ records: () => s.leaderboardRecords, createPlayer: () => this.openAccountSheet() }),
      club: () => this.clubHost(),
      clubOpen: () => SocialPage.clubOpen(s.save.career),
      mafia: () => this.mafiaHost(),
      mafiaOpen: () => SocialPage.mafiaOpen(s.save.career),
      online: leaderboardEnabled,
      friendsAllowed: leaderboardEnabled && !inPortal,
      accountReady,
      needAccount: () => this.openAccountSheet(),
    });
    // A code typed in Cloud sync, a name removed, a cloud copy stopped: Friends, Ranks and the Club open or close with the player.
    onCloudChange(() => this.playerChanged());
    onAccountChange(() => this.playerChanged());
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
            if (!kept) this.session.showNotice(S.backdrop.notKept);
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
    const runBar = h('div', { class: 'run-bar' }, this.chestBtn, this.mods, this.leaveBtn, this.photoBtn);
    // After a match: Ready (everyone taps it, then the next round starts), and for the host a
    // way back to the lobby to change the format or the bots.
    this.againLabel = h('span', {}, S.lobby.playAgain);
    this.againBtn = h(
      'button',
      { class: 'btn glass run-btn primary-run', type: 'button', 'aria-keyshortcuts': 'Enter', 'aria-pressed': 'false', onclick: () => this.versus.toggleReady() },
      icon(ICONS.check),
      this.againLabel,
    );
    this.lobbyBtn = h('button', { class: 'btn glass run-btn', type: 'button', onclick: () => this.versus.backToLobby() }, icon(ICONS.people), h('span', {}, S.shell.lobby));
    const quitBtn = h('button', { class: 'btn glass run-btn show', type: 'button', onclick: () => this.versus.leave() }, icon(ICONS.close), h('span', {}, S.shell.leave));
    this.versusBar = h('div', { class: 'versus-bar' }, quitBtn, this.lobbyBtn, this.againBtn);
    // Out of the match: reactions for everyone, and one lorry from the stands.
    this.revengeBtn = h(
      'button',
      { class: 'btn glass run-btn revenge-btn', type: 'button', 'aria-label': S.shell.revengeLabel, 'aria-keyshortcuts': 'T', onclick: () => this.versus.match?.revenge() },
      icon(ICONS.truck),
      h('span', {}, S.shell.revenge),
    );
    const reactButtons = REACTIONS.map((r, i) =>
      h('button', { class: 'react-btn', type: 'button', 'aria-label': S.shell.reaction(r), 'aria-keyshortcuts': String(i + 1), onclick: () => this.versus.react(r) }, REACTION_EMOJI[r]),
    );
    this.reactBar = h('div', { class: 'react-bar', role: 'group', 'aria-label': S.shell.reactions }, ...reactButtons, this.revengeBtn);
    for (const b of [this.settingsBtn, this.dispatchBtn, this.doneBtn, this.photoBtn, this.chestBtn, this.leaveBtn, this.againBtn, this.lobbyBtn, quitBtn, this.reactBar]) b.addEventListener('pointerdown', (e) => e.stopPropagation());
    app.append(this.settingsBtn, this.dispatchBtn, this.doneBtn, runBar, this.reactBar, this.versusBar, this.tapHint, this.dispatchHint);
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
      this.scheduleAccountPrompt();
    };
    this.session.onHint = (hint) => void this.giveHint(hint);
    this.session.onSynced = () => {
      this.flashSettings(S.settings.synced, false);
    };
    this.session.onStep = (step, data) => {
      track(step, data);
      this.reportProgress();
    };
    this.session.flushVisit();
    this.reportProgress();
    this.bindInput(canvas);
    if (!inPortal) installBackGesture(() => this.stepBack());
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e as InstallPromptEvent;
    });
    // An installed game is kept more readily; and once the player has something to lose
    // (the level-3 hint came), every visit asks again where asking is silent.
    window.addEventListener('appinstalled', () => {
      track('install');
      void keepStorage();
    });
    if (this.session.save.hints.includes('install') || this.session.save.hints.includes('tomorrow')) void renewStorage();
    this.readStartLink();
    this.readInvite();
    this.readChallengeLink();
    this.readJoinLink();
    window.addEventListener('hashchange', () => {
      this.readChallengeLink();
      this.readJoinLink();
    });
    this.syncChrome(true);
    requestAnimationFrame((t) => this.loop(t));
    this.scheduleAccountPrompt();
    window.setTimeout(() => {
      const { sound, music } = this.session.save.settings;
      if (sound || music) this.audio.warm();
    }, 2000);
    // Gifts from the team and from invites: at the start, after a name (an invite is handed in then) and after a record reached the service (level 5 pays).
    window.setTimeout(() => this.claimInvite(), 3000);
    syncPush(this.pushTimers);
    onAccountChange(() => {
      this.claimInvite();
      // A name links this device's notifications to the leaderboard (someone passing you in the top 20).
      syncPush(this.pushTimers);
    });
    onScoresSynced(() => this.collectRewards());
  }

  private get pushTimers(): PushTimer[] {
    return pushTimers(this.session.save.career, this.session.config);
  }

  /** Turns notifications on from a tap and says how it went. */
  private enablePush(): Promise<PushState> {
    return enablePush(this.pushTimers).then((state) => {
      if (state === 'blocked') this.session.announce(S.push.denied);
      return state;
    });
  }

  /** CrazyGames hears how far the career is: the levels up to Prestige, all of it after one. */
  private reportProgress(): void {
    const c = this.session.save.career;
    const top = this.session.config.prestigeLevel;
    reportProgress(c.prestige > 0 ? 100 : ((c.level - 1) / Math.max(1, top - 1)) * 100);
  }

  /** Hands in an invite this device came with (`net/invite.ts`), then picks up whatever is waiting. */
  private claimInvite(): void {
    void redeemInvite().finally(() => this.collectRewards());
  }

  /**
   * `?ref=CODE` in the address: a friend's invite (a shared challenge carries one too). Kept for a new
   * player; both get a chest when this one reaches level 5. The player is told once, and that a name is needed.
   */
  private readInvite(): void {
    if (!readInviteLink(this.session.save.career.level)) return;
    track('invite-open');
    this.session.noteInvited(!loadAccount());
  }

  /** Rewards from the team (a bug report's skin, chests): picked up between shifts. */
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

  /**
   * The dock is drawn to the pointer like a magnet (Leo, 16.10.2026): a mouse pulls it from a little way off and more as it
   * comes closer, a finger held on it pulls it the same way. A damped spring follows, so it leans and stretches a little
   * like pulled gum and settles back when the pointer goes. Only while the spring moves does a frame run.
   */
  private magnetDock(nav: HTMLElement): { pull(x: number, y: number): void; release(): void } {
    const reach = 90;
    const stiffness = 120;
    const damping = 18;
    const at = { x: 0, y: 0 };
    const speed = { x: 0, y: 0 };
    let goal = { x: 0, y: 0 };
    let frame = 0;
    let last = 0;
    const step = (now: number): void => {
      const dt = Math.min(0.032, (now - last) / 1000 || 0.016);
      last = now;
      for (const k of ['x', 'y'] as const) {
        speed[k] += ((goal[k] - at[k]) * stiffness - speed[k] * damping) * dt;
        at[k] += speed[k] * dt;
      }
      nav.style.setProperty('--pull-x', `${at.x.toFixed(2)}px`);
      nav.style.setProperty('--pull-y', `${at.y.toFixed(2)}px`);
      nav.style.setProperty('--pull-s', (1 + Math.abs(at.x) * 0.0025).toFixed(4));
      const resting = Math.abs(goal.x - at.x) + Math.abs(goal.y - at.y) < 0.05 && Math.abs(speed.x) + Math.abs(speed.y) < 0.05;
      frame = resting ? 0 : requestAnimationFrame(step);
    };
    const run = (): void => {
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(step);
    };
    const pull = (x: number, y: number): void => {
      if (this.app.classList.contains('reduce-motion') || this.app.dataset.tabbar === 'hidden') goal = { x: 0, y: 0 };
      else {
        const r = nav.getBoundingClientRect();
        const cx = r.left + r.width / 2 - at.x;
        const cy = r.top + r.height / 2 - at.y;
        // How far outside the dock the pointer is: 0 on it, `reach` and more is out of its field.
        const out = Math.hypot(Math.max(0, Math.abs(x - cx) - r.width / 2), Math.max(0, Math.abs(y - cy) - r.height / 2));
        const t = Math.max(0, 1 - out / reach);
        const strength = t * t * (3 - 2 * t);
        goal = { x: clamp(((x - cx) / (r.width / 2)) * 10, -10, 10) * strength, y: clamp(((y - cy) / (r.height / 2)) * 4, -5, 4) * strength };
      }
      run();
    };
    const release = (): void => {
      goal = { x: 0, y: 0 };
      run();
    };
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      window.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'mouse') pull(e.clientX, e.clientY);
      });
      document.documentElement.addEventListener('pointerleave', release);
    }
    return { pull, release };
  }

  /**
   * Press and hold on the dock (Leo, 16.10.2026), like the iOS tab bar: the selection pill lifts and follows the finger or
   * the cursor from tab to tab, and letting go opens the tab it rests on. A finger held on the dock pulls it like the
   * hovering mouse does. A quick tap stays a plain tap.
   */
  private holdDock(nav: HTMLElement, magnet: { pull(x: number, y: number): void; release(): void }): void {
    const holdDelay = 220;
    let held: { id: number; timer: number; startX: number; scrub: boolean; x: number } | null = null;
    const pill = (): HTMLElement | null => this.tabIndicator;
    const columnOf = (x: number): { index: number; offset: number } => {
      const r = nav.getBoundingClientRect();
      const inset = 4;
      const width = (r.width - 2 * inset) / TAB_BAR.length;
      const offset = clamp(x - r.left - inset - width / 2, 0, width * (TAB_BAR.length - 1));
      return { index: clamp(Math.round(offset / width), 0, TAB_BAR.length - 1), offset };
    };
    const scrubTo = (x: number): void => {
      const el = pill();
      if (!el) return;
      el.style.transform = `translateX(${columnOf(x).offset.toFixed(1)}px)`;
    };
    const begin = (): void => {
      if (!held || held.scrub) return;
      held.scrub = true;
      this.scrubbing = true;
      // Captured only now: a quick tap must still end on its own tab button.
      if (nav.hasPointerCapture?.(held.id) === false) {
        try {
          nav.setPointerCapture(held.id);
        } catch {
          // The pointer is already gone: the release that follows ends the hold.
        }
      }
      pill()?.classList.add('scrub');
      pill()?.removeAttribute('hidden');
      scrubTo(held.x);
    };
    const end = (open: boolean): void => {
      if (!held) return;
      window.clearTimeout(held.timer);
      const { scrub, x } = held;
      held = null;
      magnet.release();
      if (!scrub) return;
      this.scrubbing = false;
      pill()?.classList.remove('scrub');
      // The pill glides onto the column it was let go over, and that tab opens; the click that follows is the hold's own.
      const index = columnOf(x).index;
      this.suppressClick = true;
      window.setTimeout(() => (this.suppressClick = false), 0);
      if (open) this.push({ k: 'selectTab', tab: TAB_BAR[index] });
      this.moveTabIndicator(open ? index : this.shownTabIndex);
    };
    nav.addEventListener('pointerdown', (e) => {
      if (held) return;
      held = { id: e.pointerId, timer: window.setTimeout(begin, holdDelay), startX: e.clientX, scrub: false, x: e.clientX };
      if (e.pointerType !== 'mouse') magnet.pull(e.clientX, e.clientY);
    });
    nav.addEventListener('pointermove', (e) => {
      if (!held || e.pointerId !== held.id) return;
      held.x = e.clientX;
      if (e.pointerType !== 'mouse') magnet.pull(e.clientX, e.clientY);
      // Sliding along the dock is a hold at once: the pill follows from the first move.
      if (!held.scrub && Math.abs(e.clientX - held.startX) > 10) begin();
      if (held.scrub) scrubTo(e.clientX);
    });
    nav.addEventListener('pointerup', (e) => {
      if (held && e.pointerId === held.id) end(true);
    });
    nav.addEventListener('pointercancel', () => end(false));
    nav.addEventListener('lostpointercapture', () => end(true));
    // The click a scrub ends with is not a tap on the tab under it.
    nav.addEventListener(
      'click',
      (e) => {
        if (!this.suppressClick) return;
        e.stopPropagation();
        e.preventDefault();
      },
      true,
    );
  }

  private buildTabbar(nav: HTMLElement): void {
    const magnet = this.magnetDock(nav);
    // One pill that glides under the selected tab (iOS 26 tab bar), drawn behind the buttons.
    this.tabIndicator = h('span', { class: 'tab-indicator', 'aria-hidden': 'true' });
    nav.append(this.tabIndicator);
    this.holdDock(nav, magnet);
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

  /**
   * The modifiers before a shift (Leo, 16.10.2026). One is a pill with its words, like Heat always was. Several stand as
   * round icons side by side; a tap on one pushes the others aside and opens it to its words (`+25 %`), a second tap or
   * a tap on another closes it again.
   */
  private showMods(mods: Modifier[]): void {
    const key = mods.map((m) => `${m.id}:${m.label}`).join('|');
    if (!mods.some((m) => m.id === this.modOpen)) this.modOpen = null;
    if (key !== this.modsKey) {
      this.modsKey = key;
      const single = mods.length === 1;
      this.mods.replaceChildren(
        ...mods.map((m) =>
          single
            ? h('div', { class: `mod ${m.tone}`, 'data-id': m.id }, icon(MOD_ICON[m.id]), h('span', { class: 'mod-label' }, m.label))
            : h(
                'button',
                {
                  class: `mod ${m.tone}`,
                  type: 'button',
                  'data-id': m.id,
                  'aria-label': m.label,
                  onclick: () => {
                    this.modOpen = this.modOpen === m.id ? null : m.id;
                    this.openMod();
                  },
                },
                icon(MOD_ICON[m.id]),
                h('span', { class: 'mod-label', 'aria-hidden': 'true' }, m.label),
              ),
        ),
      );
      this.mods.classList.toggle('single', single);
    }
    this.openMod();
  }

  private openMod(): void {
    this.mods.classList.toggle('opened', this.modOpen !== null);
    for (const el of Array.from(this.mods.children) as HTMLElement[]) {
      const open = el.dataset.id === this.modOpen;
      el.classList.toggle('open', open);
      if (el instanceof HTMLButtonElement) el.setAttribute('aria-expanded', String(open));
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
    const onSocial = screen.k === 'page' && screen.tab === 'social' && s.showsChrome && !match;
    const key = `${screen.k}|${selected}|${onSocial ? s.socialPage.section : -1}|${this.size.x}|${badgeKey}|${s.world.shift.phase}|${s.playingMode}|${s.special?.k ?? ''}|${s.shareable ? 1 : 0}|${match ? 1 : 0}|${versusKey}|${s.save.settings.leftHanded}|${s.save.settings.dispatchSize}|${s.notesUnread}|${s.showsChrome}|${s.chestOffer}|${s.save.career.chests[0] ?? ''}|${s.world.dispatchesLeft}|${s.modifiers.map((m) => m.label).join(',')}`;
    if (!force && key === this.chromeKey) return;
    this.chromeKey = key;
    this.social.sync(onSocial, s.socialPage.section, SocialPage.column(this.size));
    reportGameplay(screen.k === 'playing' && (inPortal || !document.hidden));
    this.app.dataset.versus = match ? 'on' : 'off';
    this.app.dataset.hand = s.save.settings.leftHanded ? 'left' : 'right';
    this.app.dataset.dispatch = String(s.save.settings.dispatchSize);
    this.settingsBtn.classList.toggle('has-news', s.notesUnread);
    const ready = lobby.isReady;
    this.againBtn.classList.toggle('show', lobby.canReady);
    this.againBtn.disabled = lobby.canReady && !lobby.enoughForNext;
    this.againBtn.setAttribute('aria-pressed', String(ready));
    this.againBtn.classList.toggle('waiting', ready);
    this.againLabel.textContent = !lobby.enoughForNext ? S.shell.notEnough : ready ? S.shell.readyWaiting : lobby.nextLabel;
    this.lobbyBtn.classList.toggle('show', lobby.canReady && lobby.isHost);
    const watching = !!match && match.isOut && !match.isOver;
    this.reactBar.classList.toggle('show', watching);
    this.revengeBtn.classList.toggle('show', watching && match.canRevenge);
    this.app.dataset.tabbar = s.showsChrome && !match ? 'shown' : 'hidden';
    this.app.dataset.screen = screen.k;
    this.shownTabIndex = TAB_BAR.indexOf(selected);
    if (!this.scrubbing) this.moveTabIndicator(this.shownTabIndex);
    for (const [tab, { button, badge: el }] of this.tabs) {
      if (tab === selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
      const b = badges[TAB_BAR.indexOf(tab)] ?? null;
      el.hidden = b === null;
      el.textContent = b && b !== 'dot' ? (b.count > 99 ? '99+' : String(b.count)) : '';
      el.style.minWidth = b === 'dot' ? '10px' : '';
      el.style.height = b === 'dot' ? '10px' : '';
    }
    // Settings come back as soon as a shift is over, on the result as on the waiting screen (from the first result on).
    const onGame = s.showsChrome && (screen.k === 'ready' || screen.k === 'result');
    this.settingsBtn.classList.toggle('show', onGame);
    if (this.flashPending && onGame) this.flashNow(this.flashPending);
    const chill = s.playingMode === 'chill';
    this.dispatchBtn.classList.toggle('show', screen.k === 'playing' && !chill && s.world.config.dispatchLimit > 0);
    const dispatches = s.world.dispatchesLeft;
    this.dispatchCount.textContent = String(dispatches);
    this.dispatchBtn.classList.toggle('spent', dispatches === 0);
    this.dispatchBtn.setAttribute('aria-label', S.shell.dispatchLeft(dispatches));
    // Only while the game is new to the player, and only where a thumb plays.
    const fresh = touchFirst && !match && s.special === null && s.save.shiftsPlayed < GameSession.tapHintShifts;
    this.tapHint.classList.toggle('show', fresh && screen.k === 'playing');
    this.dispatchHint.classList.toggle('show', touchFirst && !match && screen.k === 'playing' && !chill && s.world.config.dispatchLimit > 0 && s.save.career.level <= baseConfig.policeLevel + 1);
    this.doneBtn.classList.toggle('show', screen.k === 'playing' && chill);
    const mods = match ? [] : s.modifiers;
    this.showMods(mods);
    this.mods.classList.toggle('show', onGame && mods.length > 0);
    this.photoBtn.classList.toggle('show', screen.k === 'result' && !match && s.showsChrome && s.resultWorthPicture);
    const chests = match ? 0 : s.chestOffer;
    this.chestBtn.classList.toggle('show', chests > 0);
    this.chestLabel.textContent = S.run.openChest(chests);
    this.chestBtn.setAttribute('aria-label', S.run.openChestLabel(chests));
    const first = s.save.career.chests[0];
    if (first) {
      const paint = ShopPage.chestPaint(first);
      this.chestBtn.style.setProperty('--chest-body', css(paint.body));
      this.chestBtn.style.setProperty('--chest-lid', css(paint.lid));
      this.chestBtn.style.setProperty('--chest-band', css(paint.band));
    }
    this.leaveBtn.classList.toggle('show', onGame && s.special !== null);
    this.leaveLabel.textContent = s.special?.k === 'trial' ? (s.special.trial.tour ? S.shell.leaveTour : S.shell.leaveTrial) : S.shell.leaveChallenge;
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

  /** The finished shift as a link: the share sheet on a phone, the clipboard elsewhere. Answers what to tell the player. */
  private async share(): Promise<string | null> {
    const s = this.session;
    const long = s.shareLink(location.origin + location.pathname);
    const spec = s.shareable;
    const code = s.shareCode();
    if (!long || !spec || !code) return null;
    // The short link with its picture (`net/challengeLink.ts`), else the long one as before.
    const url = (await shortLink(spec, code)) ?? long;
    if (s.shareable !== spec) return null;
    const daily = s.dailyShare;
    const text = daily ?? S.run.shareText(Fmt.number(spec.target));
    const touch = window.matchMedia('(pointer: coarse)').matches;
    if (touch && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: S.gameTitle, text, url });
      } catch (error) {
        // Some browsers allow the share sheet only right after the tap. The link is ready now: one more tap shares it at once.
        if (error instanceof DOMException && error.name === 'NotAllowedError') return S.run.linkReady;
      }
      return null;
    }
    try {
      await navigator.clipboard.writeText(daily ? `${daily}\n${url}` : url);
      return daily ? S.run.dailyCopied : S.run.copied;
    } catch {
      window.prompt(S.lobby.copyLink, daily ? `${daily}\n${url}` : url);
      return null;
    }
  }

  /** The result as a photo: a flash, then the print to look at, share or download (`PhotoView`). */
  private takePicture(): void {
    void this.photo.open(() => this.session.photo(PHOTO_SCENE), this.photoBtn);
  }

  /**
   * Adaptive quality (Leo, 29.09.2026: never below 30 fps, lower the detail instead). Frames
   * that keep coming slow and uneven, or steadily under 29 fps, step down: first the decoration
   * and the frosted glass (`lowDetail`: nobody sees it go), then the pixel ratio 2 → 1.5 → 1 (the
   * picture gets softer). If even that is not enough, Reduce Motion is recommended once, never
   * switched on. A long smooth stretch steps back up, the ratio first; a second drop to low detail
   * is kept (Settings → Low detail). A steady 30 fps (a phone saving power) is left alone.
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
    const settings = s.save.settings;
    const lowDetail = (on: boolean): void => {
      s.lowDetail = on;
      // The glass over the scene goes solid too: its blur is redone every frame (shell.css, `CanvasDrawer.frost`).
      if (on) this.app.dataset.detail = 'low';
      else delete this.app.dataset.detail;
      this.drawer.glassBlur = !on;
    };
    if (settings.lowDetail !== this.lowChosen) {
      this.lowChosen = settings.lowDetail;
      this.lowTrips = 0;
      lowDetail(settings.lowDetail);
    }
    if (this.slowFor > 2 && !s.lowDetail) {
      lowDetail(true);
      this.slowFor = 0;
      // The second time it stays, and the next visit starts there (the setting says so): a device that sits on the edge would else flap between the two.
      if (++this.lowTrips >= 2) {
        settings.lowDetail = true;
        this.lowChosen = true;
        s.saveSettings();
      }
    } else if (this.slowFor > 2 && inUse > 1) {
      this.dprCap = Math.max(1, inUse - 0.5);
      this.slowFor = 0;
      this.resize();
    } else if (this.slowFor > 4) {
      this.slowFor = 0;
      s.recommendReduceMotion();
    } else if (this.fastFor > 12 && this.dprCap < Math.min(2, device)) {
      this.dprCap = Math.min(2, this.dprCap + 0.5);
      this.fastFor = 0;
      this.resize();
    } else if (this.fastFor > 12 && s.lowDetail && !settings.lowDetail) {
      lowDetail(false);
      this.fastFor = 0;
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
    track('challenge-open');
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
   * A one-time hint came due. The way back for tomorrow (`tomorrow`): installing or notifications, see `askWayBack`.
   * Level 12: recommend Cloud sync while this device has no cloud copy (Leo, 01.10.2026: it replaced the export).
   */
  private giveHint(hint: Hint): void {
    if (hint === 'tomorrow') {
      void keepStorage();
      this.askWayBack();
    } else if (hint === 'inviteReminder') {
      if (!leaderboardEnabled || inPortal) return;
      if (!this.session.takeTip()) return this.session.deferHint(hint);
      this.session.tip(S.hints.inviteReminder);
    } else if (hint === 'portalLogin') {
      if (!inPortal) return;
      if (!this.session.takeTip()) return this.session.deferHint(hint);
      // After the result has come up, not over the shift's last moment, and never over the next shift.
      window.setTimeout(() => {
        if (this.session.screen.k === 'playing') this.session.deferHint(hint);
        else void offerLogin();
      }, 2000);
    } else if (hint === 'notifications' || hint === 'notificationsStreak') {
      const state = pushState();
      // Not on the Home Screen yet (iPhone): offered again with a later shift, once it can be turned on.
      if (state === 'install') return this.session.deferHint(hint);
      if (state !== 'off' || !pushDelivers()) return;
      if (!this.session.takeTip()) return this.session.deferHint(hint);
      this.afterResult(hint, () => this.offerPush(hint === 'notifications' ? 'later' : 'streak', false));
    } else if (hint === 'backup') {
      if (!cloudEnabled || cloudView().code !== null) return;
      this.flashSettings(S.settings.syncAsk, true);
    }
  }

  /** Shows a question once the result is up, never over a shift or an open sheet: else its hint waits for the next time. */
  private afterResult(hint: Hint, show: () => void): void {
    window.setTimeout(() => {
      if (this.session.screen.k === 'playing' || isSheetOpen()) return this.session.deferHint(hint);
      show();
    }, 2000);
  }

  /**
   * The way back for tomorrow (Leo, 16.10.2026, `tomorrow` hint): the visit's one question, asked at "back tomorrow".
   * Installing where the device can (an icon to come back to, and on iPhone the only way to notifications), else
   * notifications; a device with neither takes no turn. The reason is tomorrow's free chest while it waits, else the streak.
   * Before, the notifications offer after the first shift won took the first visit's one tip, which nobody in a browser
   * tab accepted, and the install tip after Level 4 waited for a second visit that rarely came.
   */
  private askWayBack(): void {
    const hints = this.session.save.hints;
    const installable = !isInstalled() && !inPortal && !inItch && !inPlayStore && (isIos() || this.installPrompt !== null) && !hints.includes('install');
    const pushable = !hints.includes('notifications') && pushState() === 'off' && pushDelivers();
    if (!installable && !pushable) return;
    if (!this.session.takeTip()) return this.session.deferHint('tomorrow');
    const chest = Careers.giftAhead(this.session.save.career, this.session.today);
    this.afterResult('tomorrow', () => (installable ? this.offerInstall(chest) : this.offerPush('first', chest)));
  }

  private offerInstall(chest: boolean): void {
    this.session.markHint('install');
    this.session.noteAsk('install');
    const reason = chest ? { title: S.wayBack.chestTitle, why: S.wayBack.chestWhy } : { title: S.wayBack.streakTitle, why: S.wayBack.streakWhy };
    const how = isIos() ? 'ios' : 'prompt';
    track('install-offer', { step: 'offer', how });
    // iPhone and iPad have no prompt: the dialog shows the three taps and stays until it is confirmed.
    if (isIos()) return installDialog(this.layers, isIpad(), () => undefined, reason);
    let taken = false;
    offerDialog(this.layers, { glyph: ICONS.game, ...reason, yes: S.wayBack.install }, {
      accept: () => {
        taken = true;
        const prompt = this.installPrompt;
        this.installPrompt = null;
        if (!prompt) return;
        void prompt.prompt();
        void prompt.userChoice.then((choice) => track('install-offer', { step: choice.outcome, how }));
      },
      closed: () => {
        if (!taken) track('install-offer', { step: 'later', how });
      },
    });
  }

  /** The notifications offer: `first` is the way back (with tomorrow's chest as its reason while it waits), the others come later. */
  private offerPush(kind: 'first' | 'later' | 'streak', chest: boolean): void {
    this.session.markHint('notifications');
    this.session.noteAsk('push');
    track('push', { step: 'offer', kind });
    offerDialog(
      this.layers,
      { glyph: ICONS.bell, title: chest ? S.push.offerFirstTitle : S.push.offerTitle, why: chest ? S.push.offerFirstWhy : S.push.offerWhy, yes: S.push.offerOn },
      {
        accept: () => {
          track('push', { step: 'accept' });
          void this.enablePush()
            .then((result) => track('push', { step: result }))
            .catch(() => this.session.announce(S.push.failed));
        },
        closed: () => undefined,
      },
    );
  }

  /** The Settings pill says something about Cloud sync for a moment, once it is on screen (a note that came in mid-shift waits for it). */
  flashSettings(text: string, ask: boolean): void {
    this.flashPending = { text, ask };
    this.syncChrome(true);
  }

  private flashNow({ text, ask }: { text: string; ask: boolean }): void {
    this.flashPending = null;
    const flash = this.settingsFlash;
    window.clearTimeout(this.flashTimer);
    flash.classList.toggle('ask', ask);
    flash.replaceChildren(icon(ICONS.sync), h('span', {}, text));
    flash.classList.add('on');
    this.flashTimer = window.setTimeout(() => {
      flash.classList.remove('on');
      this.flashTimer = window.setTimeout(() => flash.replaceChildren(), 300);
    }, ask ? 2600 : 1400);
  }

  /** A page over the settings closed: the settings come back (`syncChrome` reopens them). */
  private pageClosed(): void {
    this.pageOpen = false;
    this.syncChrome(true);
  }

  /** What the Club (Social → Club) needs from the game: the Auction House and the Game fund. */
  private clubHost(): ClubHost {
    const s = this.session;
    return {
      layer: this.layers,
      career: () => s.save.career,
      today: () => s.today,
      records: () => s.leaderboardRecords,
      changed: () => s.clubChanged(),
      intro: () => s.introduce('gamefund'),
      celebrate: () => {
        celebrate();
        if (s.save.settings.sound) this.audio.play('shiftComplete', 1);
        if (s.save.settings.haptics) this.haptics.play('shiftComplete', 0);
      },
      sound: (id, pitch) => {
        if (s.save.settings.sound) this.audio.play(id, pitch ?? 1);
      },
    };
  }

  /** What the Mafia (Social → Mafia) needs from the game: the save, a notice, the cheer and the sounds. */
  private mafiaHost(): MafiaHost {
    const s = this.session;
    return {
      career: () => s.save.career,
      changed: () => s.clubChanged(),
      notice: (text) => s.announce(text),
      reduceMotion: () => s.reduceMotion,
      lite: () => s.save.settings.batterySaver,
      celebrate: () => {
        celebrate();
        if (s.save.settings.sound) this.audio.play('shiftComplete', 1);
        if (s.save.settings.haptics) this.haptics.play('shiftComplete', 0);
      },
      sound: (id, pitch) => {
        if (s.save.settings.sound) this.audio.play(id, pitch ?? 1);
      },
      feel: (id) => {
        if (s.save.settings.haptics) this.haptics.play(id, 0);
      },
    };
  }

  /** From the Friends page to the multiplayer lobby: behind it the Game tab swipes on to the Multiplayer page. */
  private openLobby(): void {
    const s = this.session;
    // The lobby takes the place of the sheet it was opened from: that one goes at once, so only the lobby moves.
    closeAnySheet(true);
    if (s.screen.k === 'page') s.perform({ k: 'showTab', tab: 'game' });
    s.goToMode('multiplayer');
    this.versus.open();
  }

  /** The cloud sync page, over the settings; the settings come back when it closes. */
  private openCloudPage(): void {
    const s = this.session;
    this.pageOpen = true;
    cloudSheet(this.layers, { current: () => s.save, importSave: (save) => s.importProgress(save), closed: () => this.pageClosed() });
  }

  private accountOpen = false;

  /** "Your player" (`ui/accountSheet.ts`); `welcome`: the cloud copy was just made for a name from before, with its code to keep. */
  private openAccountSheet(welcome = false): void {
    if (this.accountOpen || !accountsEnabled) return;
    const s = this.session;
    this.accountOpen = true;
    this.pageOpen = true;
    accountSheet(
      this.layers,
      {
        records: () => s.leaderboardRecords,
        openCloud: () => this.openCloudPage(),
        declined: () => s.markHint('account'),
        closed: () => {
          this.accountOpen = false;
          this.pageClosed();
        },
      },
      welcome,
    );
  }

  private wasReady = accountReady();

  /** Friends, Ranks and the Club follow whether there is a player; nothing to do while that stays the same. */
  private playerChanged(): void {
    const ready = accountReady();
    if (ready === this.wasReady) return;
    this.wasReady = ready;
    this.social.refresh();
  }

  /** Set while the question is on its way; a failed try waits a minute before the next one. */
  private accountScheduled = false;
  private accountRetryAt = 0;

  /**
   * The player is asked for once (Leo, 15.10.2026, it replaced the Cloud sync pop-up): after Level 5 (`accountPromptAfterLevel`),
   * also when an old save is long past it or has gone through Prestige, until the player has one or declined twice. A name from
   * before without a cloud copy gets the copy by itself, and the sheet comes as the message that keeps its code (not where the
   * player stopped syncing on purpose). A moment later, so it covers neither the first frame nor a result.
   */
  private scheduleAccountPrompt(): void {
    if (this.accountScheduled || !accountsEnabled || Date.now() < this.accountRetryAt || accountReady()) return;
    const s = this.session;
    const career = s.save.career;
    const named = loadAccount() !== null && cloudEnabled && !cloudStoppedHere();
    const due = (career.level > s.config.accountPromptAfterLevel || career.prestige > 0) && !s.save.hints.includes('account');
    if (!named && !due) return;
    this.accountScheduled = true;
    window.setTimeout(() => this.maybeAskForAccount(), 1500);
  }

  private maybeAskForAccount(tries = 0): void {
    if (accountReady()) return;
    const busy = isSheetOpen() || ['playing', 'result', 'settings'].includes(this.session.screen.k) || document.querySelector('.install-root, .intro-root');
    if (busy) {
      if (tries < 12) window.setTimeout(() => this.maybeAskForAccount(tries + 1), 5000);
      else this.accountScheduled = false;
      return;
    }
    if (!loadAccount()) {
      this.session.noteAsk('account');
      this.openAccountSheet();
      return;
    }
    if (!cloudEnabled || cloudStoppedHere()) return;
    createCloud().then(
      () => {
        void syncScores(this.session.leaderboardRecords);
        this.openAccountSheet(true);
      },
      () => {
        this.accountScheduled = false;
        this.accountRetryAt = Date.now() + 60_000;
      },
    );
  }

  private showSettingsSheet(): void {
    const s = this.session;
    this.closeSettings = settingsSheet(this.layers, s.save.settings, {
      changed: () => {
        s.saveSettings();
        this.syncChrome(true);
        this.resize();
      },
      notesUnread: s.notesUnread,
      dispatch: Careers.reach(s.save.career) >= baseConfig.policeLevel,
      // The notes open over the settings; closing them brings the settings back.
      openNotes: () => {
        this.pageOpen = true;
        s.markNotesRead();
        patchNotesSheet(this.layers, PATCH_NOTES, () => this.pageClosed());
      },
      openGuides: () => {
        this.pageOpen = true;
        guidesSheet(this.layers, INTROS.filter((i) => Intros.known(s.save.career, i, baseConfig)), () => this.pageClosed());
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
              await disablePush();
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
      push: {
        state: pushState(),
        delivers: pushDelivers(),
        toggle: (on) => (on ? this.enablePush() : disablePush().then((): PushState => 'off')),
        choiceOn: pushChoiceOn,
        setChoice: (id, on) => {
          setPushChoice(id, on);
          syncPush(this.pushTimers);
        },
      },
      friendCode: loadAccount() ? () => fetchFriends().then((f) => f.code) : null,
      // The cloud sync page, over the settings; the settings come back when it closes.
      openCloud: () => this.openCloudPage(),
      player: accountsEnabled ? { name: loadAccount()?.name ?? null, ready: accountReady(), open: () => this.openAccountSheet() } : null,
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
  }

  // MARK: Input

  /** Android's back gesture, the Back button, a browser's Back: closes what is on top, or false at the start of the game (ui/backGesture.ts). */
  private stepBack(): boolean {
    if (closeTopSheet()) return true;
    if (this.photo.isOpen) {
      this.photo.close();
      return true;
    }
    if (this.versus.match) {
      this.versus.leave();
      return true;
    }
    // A shift in progress keeps its run: a stray Back never ends it.
    if (this.session.screen.k === 'playing') return true;
    if (!this.session.canStepBack) return false;
    this.push({ k: 'back' });
    return true;
  }

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
      // The sound is unlocked by the document's listener below (it runs first): whatever it does, the tap is taken.
      if (isSheetOpen() || this.photo.isOpen) return;
      if (this.versus.match) {
        e.preventDefault();
        this.versus.match.tap();
        return;
      }
      if (this.pointerId !== null) return;
      if (inSystemGestureZone(e)) return;
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
      // The Social page is a form and a list: typing, Space, Enter and the arrows are its own (Escape still steps back).
      if (e.key !== 'Escape' && target.closest('.social-page')) return;
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
      // The reminders follow the save: handed over as the game goes away, and "seen" again as it comes back.
      syncPush(this.pushTimers, document.hidden);
      if (document.hidden) {
        const leaving = this.session.leaving();
        if (leaving) track('first-leave', leaving);
        away();
      } else {
        back();
        this.collectRewards();
      }
      // CrazyGames: "don't call gameplayStop when the user switches focus"; their page knows the tab is hidden.
      if (!inPortal) reportGameplay(this.session.screen.k === 'playing' && !document.hidden);
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
    // iOS 26.1+ home-screen apps (WebKit bug 301994): the system keeps status bar and home indicator as black bars outside
    // the page, yet still reports the bottom inset, so the dock floated a second inset too high. A gap taller than any
    // status bar (62 pt at most) means the bottom is cut off as well.
    // shortcut: a cut bottom alone (no cut top) stays undetected; drop this once Apple fixes the bug.
    const cutBottom = navigator.standalone === true && hgt > w && screen.height - hgt > 64;
    if (cutBottom) this.safe.bottom = 0;
    document.documentElement.style.setProperty('--safe-bottom', cutBottom ? '0px' : null);
    // Above 2× the eye sees no difference, but a 3× phone would fill 2.25 times the pixels;
    // a device that struggles gets less (`adaptQuality`).
    const cap = this.session.save.settings.batterySaver ? Math.min(this.dprCap, Shell.saverDpr) : this.dprCap;
    this.drawer.resize(w, hgt, Math.min(window.devicePixelRatio || 1, cap));
    this.drawer.offset = v(this.safe.left, this.safe.top);
    this.size = v(Math.max(1, w - this.safe.left - this.safe.right), Math.max(1, hgt - this.safe.top - this.safe.bottom));
  }

  // MARK: Loop

  /**
   * One frame, and the next one asked for whatever it does: an exception in a frame used to stop the loop for good (the
   * canvas froze while the tab bar went on). It is reported as an uncaught error would be, and the game carries on;
   * only when every frame fails for a while does the player get the way out.
   */
  private loop(now: number): void {
    // The battery: the simulation runs on its own clock, so the picture may skip frames. Which ones is decided by
    // counting screen refreshes, not by a time gap (a gap skips every other frame of a 90 Hz screen, 45 a second):
    // a 60 or 90 Hz screen loses nothing, a 120 Hz one draws 60, the battery saver 30.
    this.measureRefresh(now);
    if (++this.skipped < this.every * (this.pageStill >= Shell.stillFrames ? 2 : 1)) {
      requestAnimationFrame((t) => this.loop(t));
      return;
    }
    this.skipped = 0;
    try {
      this.frame(now);
      this.faults = 0;
    } catch (error) {
      reportError(error);
      if (++this.faults >= Shell.faultLimit) {
        this.stalled();
        return;
      }
    }
    requestAnimationFrame((t) => this.loop(t));
  }

  /** Refreshes since the last drawn frame, and how many make one: 1 on a screen of up to ~100 Hz. */
  private skipped = 0;
  private every = 1;
  private refreshAt = 0;
  private readonly refreshGaps: number[] = [];
  /** The most frames a second the picture is drawn at; the battery saver's. */
  private static readonly drawRate = 70;
  private static readonly saverRate = 30;
  private static readonly saverDpr = 1.5;

  /**
   * The screen's refresh rate from the gaps between frames: the fast tenth of the last 90, so slow frames of our own
   * (which stretch a gap) do not read as a slower screen. Asked again every 90 frames, since a phone may change its rate.
   */
  private measureRefresh(now: number): void {
    const gaps = this.refreshGaps;
    const gap = now - this.refreshAt;
    this.refreshAt = now;
    if (gap <= 1 || gap > 100) return;
    gaps.push(gap);
    if (gaps.length !== 20 && gaps.length < 90) return;
    const hz = 1000 / [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 10)];
    const rate = this.session.save.settings.batterySaver ? Shell.saverRate : Shell.drawRate;
    this.every = Math.max(1, Math.round(hz / rate));
    if (gaps.length >= 90) gaps.length = 0;
  }

  /** Frames in a row that may fail before the game gives up (about two seconds). */
  private static readonly faultLimit = 120;
  private faults = 0;

  /** The boot screen (`index.html`, kept by `main.ts`) comes back with a reload: the save is written on every change. */
  private stalled(): void {
    const boot = document.getElementById('boot');
    if (!boot) return;
    const [title, body, link] = [boot.querySelector('h1'), boot.querySelector('p'), boot.querySelector('a')];
    if (title) title.textContent = S.shell.stalledTitle;
    if (body) body.textContent = S.shell.stalledBody;
    if (link) link.textContent = S.shell.reload;
    boot.hidden = false;
    boot.classList.remove('gone');
    boot.classList.add('failed');
  }

  private frame(now: number): void {
    const delta = Math.max(0, (now - this.last) / 1000);
    this.last = now;
    const actions = this.actions;
    this.actions = [];
    const s = this.session;
    const match = this.versus.match;
    s.backdrop = this.backdrop.ready;
    const resting = this.pageStill >= Shell.stillFrames;
    s.sceneThin = resting;
    // A multiplayer match owns the canvas; the career world waits where it was.
    const list = match ? match.frame(delta, this.size, s.reduceMotion) : s.frame(delta, actions, this.size, TAB_HEIGHT);
    this.drawer.draw(list);
    this.backdrop.visible = list.backdrop !== null;
    if (!match && s.screen.k === 'page') {
      const signature = signatureOf(list);
      this.pageStill = signature === this.pageSignature ? this.pageStill + 1 : 0;
      this.pageSignature = signature;
    } else this.pageStill = 0;
    // A frame of the resting page is a long one by design: it says nothing about the device.
    if (!resting) this.adaptQuality(delta);
    this.detail.update(s.detail);
    const summary = !match && s.screen.k === 'result' ? s.screen.summary : null;
    this.live.update(summary, () => (summary ? ResultBanner.spoken(summary) : ''), match ? null : s.noticeText);
    s.sheetInset = this.detail.inset;
    this.audio.updateMusic(match ? match.music : s.musicMix, s.save.settings.music, Math.min(delta, 0.1));
    this.audio.updateTension(match ? 0 : s.tension, s.save.settings.sound, Math.min(delta, 0.1));
    this.audio.updateWeather(match ? { rain: 0, strikes: s.weatherSound.strikes } : s.weatherSound, s.save.settings.mapSounds);
    this.app.classList.toggle('reduce-motion', s.reduceMotion);
    this.social.toast(s.socialNotice);
    if (this.pendingChallenge) this.openPendingChallenge();
    if (this.pendingJoin) this.openPendingJoin();
    this.syncChrome();
  }

  /** For tests: close any sheet the shell opened. */
  closeSheets(): void {
    closeAnySheet();
  }
}
