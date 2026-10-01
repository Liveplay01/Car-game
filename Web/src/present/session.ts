import { World, STEP } from '../core/world';
import { baseConfig, gravity, builtArmSlots, type Config } from '../core/config';
import { type SaveGame, type GameMode, type Hint, Careers, newSave } from '../core/career';
import { Elite } from '../core/elite';
import { SeasonPass } from '../core/seasonPass';
import { Unlocks } from '../core/unlocks';
import type { GameEvent, ShiftResult } from '../core/events';
import type { Upgrade } from '../core/levels';
import { ALBUM_REWARD, BIG_SCREEN, cosmetic, rarityRank } from '../core/loot';
import { dailySeed, dailyEvent, dayNumber } from '../core/daily';
import { weekNumber, weeklyTrial } from '../core/weekly';
import { Goals } from '../core/goals';
import { noteTap } from '../core/timing';
import { latestNote } from './patchNotes';
import { ChestReel } from './chestReel';
import { Scoring } from '../core/scoring';
import { type Vec2, v, add } from '../core/vec2';
import { loadSave, writeSave } from '../storage/save';
import { loadPlayerName } from '../storage/profile';
import { syncScores, type Records } from '../net/leaderboard';
import { cloudChanged, cloudEnabled, cloudLinked } from '../net/cloud';
import { RenderList, R, Ease, toScreen, rect, type Camera } from './render';
import { S, Fmt, money as moneyText } from './strings';
import { CrashEffects } from './effects';
import { ExplosionEffects, MapScars, SmokeCurtain } from './explosionsFx';
import { SceneBuilder, VehicleLamps, towYard } from './scene';
import { CityLayer, CityPulse, type CityRise } from './city';
import { MapTheme } from './mapThemes';
import { Skins } from './skins';
import { WeatherFade, WeatherLayer } from './weather';
import { NightLayer } from './night';
import { CityLights } from './cityLights';
import { HUD, TopBar, RingSignals, ModeBanner, ModeHint, ReadyBanner, ResultBanner, type Popup, type PopupKind, type ShiftSummary, type ConditionIntro, POPUP_LIFETIME, settledPops } from './hud';
import { Tutorial } from './tutorial';
import { NoticeQueue } from './notices';
import { bookShift } from './booking';
import { type Screen, type Tab, type SwipeMode, SWIPE_MODES, type ScreenAction, type ProgressSection, TAB_BAR, BUILD_PAGES, barTab, screenTab, showsTabBar, BuildLayout } from './flow';
import { CameraRig, perspectiveOf, addRecede } from './perspective';
import { PhotoCard } from './photo';
import { TransitionTracker, ModePan } from './transitions';
import { ShopPage, ShopState, shelfOf } from './shop';
import type { CasinoFlow, CasinoHost } from './casinoFlow';
import { casinoKit, loadCasino } from './casinoLoader';
import { Casino } from '../core/casino';
import { BuildFlow } from './buildFlow';
import { ShopFlow } from './shopFlow';
import type { PageHost } from './pageHost';
import { type SpecialRun, settleSpecial, runCard } from './specialRuns';
import { conditionIntro, streakEndsIn, addNotice, noticeHeight, noticePresence, type NoticePlace } from './readyScreen';
import { Briefings, briefOf } from './briefing';

export type { SpecialRun } from './specialRuns';
import { ProgressPage, ProgressState, type ProgressTarget } from './progress';
import { MuseumPage } from './museum';
import { sightings, museumEntry, museumId, conditionsOf, type MuseumEntry } from '../core/museum';
import { UpgradePage, UpgradeState } from './upgrades';
import { StreetBuilderPage, BuilderState } from './builder';
import { Feedback, Music, type MusicMix, type SoundID, type HapticID } from './feedback';
import { Details, type Detail } from './detail';
import { TyreMarks } from './marks';
import { type ChallengeSpec, challengeOf, challengeConfig, encodeChallenge } from '../core/challenge';
import { TRIALS, trial as trialById, trialConfig, trialOpen, trialProgress, rematchId } from '../core/trials';

/** What the platform reports; key and touch mapping stays in `main.ts`. */
export type InputAction =
  | { k: 'tap'; ago?: number }
  | { k: 'confirm' }
  | { k: 'back' }
  | { k: 'restart' }
  | { k: 'dispatch' }
  | { k: 'focusLost' }
  | { k: 'focusGained' }
  | { k: 'pointerDown'; p: Vec2; ago?: number }
  | { k: 'pointerMove'; p: Vec2 }
  | { k: 'pointerUp'; p: Vec2 }
  | { k: 'wheel'; p: Vec2; dy: number }
  | { k: 'selectTab'; tab: Tab }
  | { k: 'nextTab' }
  | { k: 'swipeMode'; step: number }
  | { k: 'perform'; action: ScreenAction };

/** Where sound and haptics go; the session decides what and when. */
export interface SessionOutput {
  /** `pan`: -1 (left) … 1 (right), where on screen the sound happens. */
  sound(id: SoundID, pitch: number, pan: number): void;
  haptic(id: HapticID, softness: number): void;
}

/**
 * Runs the game for the browser: screens, fixed-step loop, input
 * timestamps, feedback, save game and the render list. The roundabout never stops: every tab
 * looks at the same running city, and the camera glides to the view it needs.
 */
export class GameSession {
  static readonly maxFrameDelta = 0.25;
  static readonly resultDelay = 1.2;
  static readonly scoreCatchUp = 0.28;
  static readonly comboPop = 0.35;
  static readonly countInSeconds = 2;
  static readonly restartLock = 0.5;
  static readonly lossPullBack = 0.05;
  /** At the top multiplier the camera leans in by this much. */
  static readonly topTierLean = 0.03;
  static readonly flowFade = 0.6;

  readonly config: Config = baseConfig;
  world: World;
  screen: Screen = { k: 'ready' };
  save: SaveGame;
  systemReduceMotion = false;
  /**
   * Set by the shell when the device cannot keep 30 fps even at a pixel ratio of 1: the scene
   * leaves out its decoration (ground texture, what flies through the air, cloud shadows).
   */
  lowDetail = false;

  /** Recommends Reduce Motion, once ever, when the game runs slow; never switches it on. */
  recommendReduceMotion(): void {
    if (this.reduceMotion || this.save.hints.includes('reduceMotion')) return;
    this.save.hints.push('reduceMotion');
    this.persist();
    this.announce(S.hints.reduceMotion);
  }
  today = dayNumber();

  private accumulator = 0;
  private effects: CrashEffects;
  private explosions: ExplosionEffects;
  private scars = new MapScars();
  private tyreMarks = new TyreMarks();
  private curtain: SmokeCurtain | null = null;
  private popups: Popup[] = [];
  private popupSerial = 0;
  private pendingSummary: ShiftSummary | null = null;
  private resultCountdown = 0;
  private resultAge = 0;
  private moneyLanded = false;
  private sinceTakedown = Infinity;
  /** A hit-stop: the world holds for a blink on a Critical Merge and on reaching the top multiplier. */
  private sinceHitStop = Infinity;
  /** 0 → 1 while the combo is at its top multiplier: the camera leans in a little. */
  private topTier = 0;
  private lamps = new VehicleLamps();
  private sinceFatalCrash = Infinity;
  private sinceLoss = Infinity;
  private lossPull = 0;
  private shownScore = 0;
  private shiftStartMoney = 0;
  private shownMoney = 0;
  private sinceMoney = Infinity;
  private resultBank = { before: 0, after: 0 };
  private sinceComboTier = Infinity;
  private sinceCarSent = Infinity;
  private sinceStrike = Infinity;
  private sincePoliceCrash = Infinity;
  private seen = { carsSent: 0, strikes: 0, policeCrashes: 0 };
  private flowLevel = 0;
  private rim = new RingSignals();
  private cityPulse = new CityPulse();
  private cameraRig = new CameraRig();
  private recede = 0;
  isInterrupted = false;
  countIn = 0;
  private sinceReady = 0;
  private soundSerial = 0;
  private tutorial: Tutorial | null;
  private sceneTime = 0;
  /** The weather moves in at a new shift instead of switching on (`WeatherFade`). */
  private readonly weatherFade = new WeatherFade();
  upgradePage = new UpgradeState();
  shopPage = new ShopState();
  /**
   * The casino's rounds (`casinoFlow.ts`), once the casino has loaded (`casinoLoader.ts`): it
   * reaches the session only through its host.
   */
  private loadedCasinoFlow: CasinoFlow | null = null;
  /** The Build and Shop tabs' actions (`buildFlow.ts`, `shopFlow.ts`), through one host. */
  private readonly buildFlow = new BuildFlow(this.pageHost());
  private readonly shopFlow = new ShopFlow(this.pageHost(), () => this.casinoFlow);
  progressPage = new ProgressState();
  /** Museum entries first met during this shift, for the line on its result. */
  private museumFound: string[] = [];
  builderPage = new BuilderState();
  buildPage: Tab = 'upgrades';
  private buildSlide: { from: Tab; age: number } | null = null;
  private pan = new ModePan();
  private modeBanner: { mode: SwipeMode; age: number } | null = null;
  /** Houses the career's city had at the last look, and what rises since (`CityLayer.add`). */
  private cityCount: number | null = null;
  private cityRise: CityRise | null = null;
  /** The swipe hint after Level 5: 0 hidden, 1 shown, fading between. */
  private modeHint = 0;
  /** The multiplayer page of the mode swipe is showing: a tap opens the lobby. */
  versusSelected = false;
  /** Opens the multiplayer lobby (the shell's sheet). */
  onVersus: (() => void) | null = null;
  /** Opens the leaderboards (the shell's sheet): the rank chip on Progress. */
  onLeaderboard: (() => void) | null = null;
  /** Opens Big Screen's sheet (the shell's): pick a picture or paste a link. */
  onBackdrop: (() => void) | null = null;
  /** The player's own picture or video is ready behind the canvas (`ui/backdrop.ts`). */
  backdrop = false;
  playingMode: GameMode = 'shift';
  private shownFlames = 0;
  private sinceFlames = Infinity;
  private lastViewport = v(430, 900);
  /** The camera of the last frame: places sounds left or right. */
  private lastCamera: Camera | null = null;
  private lastInset = 0;
  private readonly notices = new NoticeQueue();
  /** Something new on the road takes the top card for a while, with what to do (`Briefings`). */
  private readonly briefings = new Briefings();
  /** Entries whose task cost a shift (a criminal got away): explained once more next time. */
  private readonly relearn = new Set<string>();
  /** Entries met for the first time whose briefing never got its turn (the shift ended first). */
  private readonly owed = new Set<string>();
  private transitions = new TransitionTracker();
  playingLevel = 1;
  dailySelected = false;
  playingDaily = false;
  private dailySplash: number | null = null;
  private splits: number[] = [];
  private raceDelta: number | null = null;
  /** The mix the music should play; `main.ts` fades its stems to it. */
  musicMix: MusicMix = Music.silent;
  /** How tense the casino is right now, 0…1: the shell turns it into a riser and a heartbeat. */
  tension = 0;
  /** The detail sheet over a page: open after a card was tapped (`ui/detailSheet.ts`). */
  detailOpen = false;
  /** How much of the screen the open sheet covers (points); the shell reports it. */
  sheetInset = 0;
  private pressAt: Vec2 | null = null;
  private revealUpgrade: Upgrade | null = null;
  private revealProgress: ProgressTarget | null = null;
  /** Tells the page when the tab bar or badges changed. */
  onChrome: (() => void) | null = null;
  /** A one-time hint came due (installing, a backup): the shell knows whether it applies. */
  onHint: ((hint: Hint) => void) | null = null;
  /** The challenge or trial being played, until the player leaves it. */
  special: SpecialRun | null = null;
  /** The last finished shift as a challenge a friend can play; null when it cannot be shared. */
  shareable: ChallengeSpec | null = null;

  constructor(private output: SessionOutput | null = null) {
    this.save = loadSave();
    const seed = this.nextSeed();
    this.playingLevel = this.save.career.level;
    this.world = new World(Careers.config(this.save.career, this.config, seed), seed, { startsOnFirstTap: true });
    this.effects = new CrashEffects(seed);
    this.explosions = new ExplosionEffects(seed);
    this.tutorial = this.save.tutorialDone ? null : new Tutorial();
    if (this.tutorial) this.save.mode = 'shift';
    // A new player has nothing to catch up on: the notes so far count as read.
    if (this.tutorial && this.save.notesSeen === null) this.save.notesSeen = latestNote();
    this.prepareShift(false);
    // With a cloud copy the day begins after the first look at the cloud (`net/cloud.ts`, ready).
    if (!cloudLinked()) this.collectLoginIncome();
    this.resumeCasino();
  }

  private nextSeed(): number {
    return (Math.random() * 0x100000000) >>> 0;
  }

  get gameMode(): GameMode {
    return this.save.mode;
  }

  /** Where the mode swipe stands: a career mode, or multiplayer. */
  get swipeMode(): SwipeMode {
    return this.versusSelected ? 'multiplayer' : this.save.mode;
  }

  get reduceMotion(): boolean {
    const r = this.save.settings.reduceMotion;
    return r === 'system' ? this.systemReduceMotion : r === 'on';
  }

  get isTrackingPointer(): boolean {
    return this.pan.isTracking || this.builderPage.dragging !== null;
  }

  /** The records the leaderboards rank (`net/leaderboard.ts`). */
  get leaderboardRecords(): Records {
    const { save } = this;
    return { level: save.career.level, prestige: save.career.prestige, unlimitedBest: save.unlimitedBest, unlimitedCars: save.unlimitedBestCars };
  }

  get visibleUpgrades(): readonly Upgrade[] {
    return Careers.availableUpgrades(this.save.career, this.config);
  }

  private persist(): void {
    this.store();
    // A better level or Unlimited record goes to the leaderboard; nothing happens without a name.
    void syncScores(this.leaderboardRecords);
    // With cloud sync on, the changed save follows to the cloud a little later.
    cloudChanged();
    this.onChrome?.();
  }

  /** The save could not be written this session (private mode, full storage): said once. */
  private unsavedWarned = false;

  /** Writes the save; if the browser refuses, the player learns it once, with the way out. */
  private store(): void {
    if (writeSave(this.save) || this.unsavedWarned) return;
    this.unsavedWarned = true;
    this.announce(cloudEnabled ? S.hints.notSaved : S.hints.notSavedHere);
  }

  collectLoginIncome(): void {
    const income = Careers.collectLoginIncome(this.save.career, this.today, this.config);
    this.persist();
    if (income !== null) this.announce(S.daily.welcomeBack(Fmt.number(income)));
  }

  /** Simulation speed with the short slow motions of a takedown and of the lost shift. */
  get timeScale(): number {
    return Math.min(this.takedownSlowMotion, this.fatalSlowMotion, this.hitStop);
  }

  private get hitStop(): number {
    if (this.reduceMotion) return 1;
    return this.sinceHitStop < 0.06 ? 0.08 : 1;
  }

  private get fatalSlowMotion(): number {
    if (this.reduceMotion) return 1;
    const hold = 0.45;
    const ease = 0.4;
    const t = this.sinceFatalCrash;
    if (t < hold) return 0.2;
    if (t < hold + ease) return 0.2 + 0.8 * Ease.outCubic((t - hold) / ease);
    return 1;
  }

  private get takedownSlowMotion(): number {
    if (this.reduceMotion) return 1;
    const hold = 0.3;
    const ease = 0.25;
    const t = this.sinceTakedown;
    if (t < hold) return 0.2;
    if (t < hold + ease) return 0.2 + 0.8 * Ease.outCubic((t - hold) / ease);
    return 1;
  }

  private get isShowingResult(): boolean {
    return this.screen.k === 'result';
  }

  private isPage(tab: Tab): boolean {
    return this.screen.k === 'page' && this.screen.tab === tab;
  }

  // MARK: Screen flow

  perform(action: ScreenAction): void {
    const save = this.save;
    const career = save.career;
    switch (action.k) {
      case 'startShift':
        if (this.screen.k === 'ready' && this.versusSelected) this.onVersus?.();
        else if (this.screen.k === 'ready' && !this.world.isArriving()) this.startPlaying();
        break;
      case 'restart':
        this.prepareShift(false);
        break;
      case 'openSettings':
        if (this.screen.k === 'ready' || this.screen.k === 'result') {
          this.screen = { k: 'settings' };
          this.tick();
          this.onChrome?.();
        }
        break;
      case 'closeSettings':
        if (this.screen.k === 'settings') {
          this.screen = { k: 'ready' };
          this.tick();
          this.onChrome?.();
        }
        break;
      case 'setGameMode': {
        const mode = action.mode;
        if (mode === this.swipeMode || this.world.shift.phase !== 'waiting' || !(this.screen.k === 'ready' || this.isShowingResult)) return;
        // Multiplayer is a page of the swipe, not a career mode: the career keeps its mode.
        const fromVersus = this.versusSelected;
        this.versusSelected = mode === 'multiplayer';
        this.modeBanner = { mode, age: 0 };
        if (!this.save.hints.includes('modes')) {
          this.save.hints.push('modes');
          this.persist();
        }
        if (mode === 'multiplayer' || (fromVersus && mode === this.gameMode)) {
          if (this.isShowingResult) this.prepareShift(false, null, { k: 'ready' });
          this.onChrome?.();
          break;
        }
        save.mode = mode;
        this.persist();
        this.prepareShift(false, null, { k: 'ready' });
        break;
      }
      case 'showTab': {
        const tab = action.tab;
        if (!showsTabBar(this.screen) || (tab === screenTab(this.screen) && screenTab(this.screen) !== 'game')) return;
        const next: Screen = tab === 'game' ? { k: 'ready' } : { k: 'page', tab };
        const same = next.k === this.screen.k && (next.k !== 'page' || (this.screen.k === 'page' && this.screen.tab === next.tab));
        if (!same) {
          this.tick();
          this.shopFlow.leaveShelf();
          this.closeDetail();
        }
        if (BUILD_PAGES.includes(tab)) {
          const current = screenTab(this.screen);
          if (BUILD_PAGES.includes(current) && current !== tab) this.buildSlide = { from: current, age: 0 };
          this.buildPage = tab;
        }
        this.screen = next;
        this.onChrome?.();
        break;
      }
      case 'showShop':
        this.perform({ k: 'showTab', tab: 'shop' });
        if (!this.isPage('shop')) return;
        this.shopPage.section = action.section === 2 && !Unlocks.isOpen(this.save.career, 'casino', this.config) ? 0 : action.section;
        this.shopPage.sectionSlide = null;
        break;
      case 'showProgress':
        this.perform({ k: 'showTab', tab: 'progress' });
        if (!this.isPage('progress')) return;
        if (this.progressPage.section !== action.section) this.leaveMuseum();
        this.progressPage.section = action.section;
        this.progressPage.sectionSlide = null;
        this.progressPage.reset();
        break;
      case 'pickUpPart': {
        this.tick();
        this.builderPage.selected = action.part;
        const card = StreetBuilderPage.cards(this.lastViewport, this.tabInset).find((c) => c.part === action.part);
        this.builderPage.dragging = { part: action.part, at: card ? { x: (card.rect.minX + card.rect.maxX) / 2, y: (card.rect.minY + card.rect.maxY) / 2 } : v(0, 0) };
        break;
      }
      case 'placePart': {
        const part = this.builderPage.dragging?.part ?? this.builderPage.selected;
        if (!part || !StreetBuilderPage.canPlace(part, action.slot, career, this.config)) return;
        this.builderPage.pending = { part, slot: action.slot };
        this.builderPage.removing = 0;
        this.builderPage.dragging = null;
        this.builderPage.target = null;
        this.builderPage.selected = part;
        this.detailOpen = true;
        break;
      }
      case 'buildPart':
        this.buildFlow.buildPart();
        break;
      case 'removePart':
        if (this.builderPage.pending) this.detailOpen = false;
        this.builderPage.pending = null;
        this.builderPage.removing = 0;
        break;
      case 'selectUpgrade':
        if (this.upgradePage.selected !== action.upgrade) this.tick();
        this.upgradePage.selected = action.upgrade;
        this.upgradePage.pressed = { upgrade: action.upgrade, age: 0 };
        this.detailOpen = true;
        this.revealUpgrade = action.upgrade;
        break;
      case 'buy':
        this.buildFlow.buy(action.upgrade);
        break;
      case 'openChest': {
        const seed = save.shiftsPlayed * 7919 + this.popupSerial;
        const opening = Careers.openChest(career, action.index, seed, this.today);
        if (!opening) return;
        const albums = this.completeAlbums();
        this.persist();
        if (albums.length > 0) this.announce(...albums);
        this.shopPage.shelf = shelfOf(opening.item);
        this.shopPage.selectedItem = opening.item.id;
        // Reduced motion: no build-up, no reel, the prize at once.
        const reel = ChestReel.make(opening.chest, opening.item, (seed ^ Math.imul(career.chestsOpened, 0x9e3779b1)) >>> 0, this.config.chestTeaserChance);
        this.shopPage.opening = { opening, reel, age: this.reduceMotion ? ShopPage.stages(opening, reel).reveal : 0 };
        const rare = rarityRank(opening.item.rarity) >= 2;
        if (this.reduceMotion) this.play([rare ? 'chestBurstRare' : 'chestBurst'], ['chest']);
        // Something big inside: a sub-bass charges up under the chest until it bursts.
        else this.play(rare ? ['chestCharge', 'chargeUp'] : ['chestCharge'], ['wanted']);
        break;
      }
      case 'buyChest':
        if (!Careers.buyChest(career, action.kind, this.config)) {
          this.shopPage.denied = 0.001;
          this.play(['denied'], []);
          const price = action.kind === 'standard' ? this.config.standardChestPrice : this.config.premiumChestPrice;
          this.showNotice(S.notice.notEnoughMoney(Fmt.number(price)));
          return;
        }
        this.persist();
        this.play(['purchase'], ['comboUp']);
        break;
      case 'watchAd':
        this.shopFlow.showAd();
        break;
      case 'showCasino':
        this.perform({ k: 'showShop', section: 2 });
        // The casino may still be loading: the game is picked once it is here.
        loadCasino()
          .then(() => {
            if (this.isPage('shop')) this.shopPage.casino?.selectGame(action.game);
          })
          .catch(() => undefined);
        break;
      case 'startTrial':
        this.startTrial(action.id);
        break;
      case 'wearTitle':
        if (Careers.wearTitle(career, action.id, this.config)) {
          this.tick();
          this.persist();
        }
        break;
      case 'prestige':
        this.tryPrestige();
        break;
      case 'showElite':
      case 'showPass':
        if (!this.detailOpen) this.tick();
        this.detailOpen = true;
        break;
      case 'buyPass':
        if (SeasonPass.buy(career, this.today, this.config)) {
          this.persist();
          this.showNotice(S.pass.bought(SeasonPass.season(this.today)));
          this.play(['paid'], ['comboUp']);
        }
        break;
      case 'buildHall':
        if (Careers.buildHall(career, this.config)) {
          this.persist();
          this.showNotice(S.hall.built);
          this.play(['paid'], ['comboUp']);
        }
        break;
      case 'wear': {
        const item = cosmetic(action.id);
        if (!Careers.wear(career, action.id) && item?.kind === 'carSkin' && Careers.owns(career, action.id)) this.showNotice(S.shop.skinsFull(5));
        this.persist();
        // Big Screen put on with nothing to show yet: straight to choosing it.
        if (action.id === BIG_SCREEN && career.mapSkin === BIG_SCREEN && !this.backdrop) this.onBackdrop?.();
        break;
      }
      case 'editBackdrop':
        if (Careers.owns(career, BIG_SCREEN)) this.onBackdrop?.();
        break;
      case 'toggleSound':
        save.settings.sound = !save.settings.sound;
        this.persist();
        this.tick();
        break;
      case 'toggleHaptics':
        save.settings.haptics = !save.settings.haptics;
        this.persist();
        this.tick();
        break;
      case 'toggleVehicleLabels':
        save.settings.vehicleLabels = !save.settings.vehicleLabels;
        this.persist();
        this.tick();
        break;
      case 'cycleReduceMotion': {
        const all = ['system', 'on', 'off'] as const;
        save.settings.reduceMotion = all[(all.indexOf(save.settings.reduceMotion) + 1) % all.length];
        this.persist();
        this.tick();
        break;
      }
    }
  }

  /** A reply to what the player just did: shown at once. */
  showNotice(textValue: string): void {
    this.notices.say(textValue);
  }

  /** The notice showing right now, for the screen reader's live region. */
  get noticeText(): string | null {
    const brief = this.screen.k === 'playing' ? this.briefings.view : null;
    return this.notices.shown?.text ?? (brief ? `${brief.brief.caption}. ${brief.brief.text}` : null);
  }

  /** News for the player: each line gets its own turn. */
  announce(...texts: string[]): void {
    this.notices.announce(...texts);
  }

  private get wantsDaily(): boolean {
    const career = this.save.career;
    return this.special === null && this.save.mode === 'shift' && (this.tutorial?.isOver ?? true) && Unlocks.isOpen(career, 'daily', this.config) && Careers.isDailyOpen(career, this.today);
  }

  /** Sets up the next shift; it waits, traffic flowing, for its first tap. */
  private prepareShift(continuing: boolean, seed: number | null = null, next: Screen = { k: 'ready' }): void {
    const special = this.special;
    const daily = this.wantsDaily;
    this.dailySelected = daily;
    const s = special ? GameSession.specialSeed(special) : daily ? dailySeed(this.today) : (seed ?? this.nextSeed());
    this.playingLevel = special ? (special.k === 'trial' ? special.trial.level : special.spec.level) : this.save.career.level;
    this.playingMode = special?.k === 'challenge' ? special.spec.mode : special ? 'shift' : this.save.mode;
    this.shownFlames = 0;
    this.playingDaily = daily;
    this.dailySplash = daily ? 0 : null;
    this.splits = [];
    this.raceDelta = null;
    const cfg = special ? this.specialConfig(special) : this.shiftConfig(s);
    // A challenge or trial never carries traffic over: it starts fresh, the same for everyone.
    if (continuing && !special) this.world = this.world.nextShift(cfg, s);
    else {
      this.world = new World(cfg, s, { startsOnFirstTap: true });
      this.resetScene();
    }
    this.pendingSummary = null;
    this.shownScore = 0;
    this.sinceComboTier = Infinity;
    for (const id of this.briefings.clear()) this.owed.add(id);
    this.screen = next;
    this.onChrome?.();
  }

  private shiftConfig(seed: number): Config {
    // The Daily Shift pins its city event and is never a Legendary Shift.
    const daily = this.dailySelected;
    const cfg = Careers.shiftConfig(this.save.career, this.save.mode, this.config, seed, daily ? dailyEvent(this.today) : undefined, daily ? null : undefined);
    // A living Daily streak pays more on every career shift (Mayhem pays in flames).
    return this.save.mode !== 'mayhem' && Goals.streakBonus(this.save.career, this.today, this.config) ? Goals.forStreak(cfg) : cfg;
  }

  private specialConfig(run: SpecialRun): Config {
    return run.k === 'challenge' ? challengeConfig(run.spec, this.config) : trialConfig(run.trial, this.config);
  }

  private static specialSeed(run: SpecialRun): number {
    return run.k === 'challenge' ? run.spec.seed : run.trial.seed;
  }

  // MARK: Challenges and trials

  /** A friend's challenge link was opened: its shift waits on the Game tab. */
  startChallenge(spec: ChallengeSpec): void {
    this.startSpecial({ k: 'challenge', spec });
  }

  startTrial(id: string): void {
    const t = trialById(id);
    if (!t) return;
    // A mastery trial above the career's level is not played yet (rematches and the Weekly
    // Elite have their own conditions).
    if (TRIALS.includes(t) && !trialOpen(t, this.save.career)) {
      this.showNotice(S.trials.opensAt(t.level));
      return;
    }
    this.startSpecial({ k: 'trial', trial: t });
  }

  /** Prestige asks twice: the first tap arms it, a second within a few seconds starts over. */
  private prestigeArmed = -Infinity;
  static readonly prestigeWindow = 4;

  private tryPrestige(): void {
    const career = this.save.career;
    if (!Careers.canPrestige(career, this.config) || this.screen.k === 'playing') return;
    if (this.sceneTime - this.prestigeArmed > GameSession.prestigeWindow) {
      this.prestigeArmed = this.sceneTime;
      this.tick();
      this.showNotice(S.prestige.confirm);
      return;
    }
    this.prestigeArmed = -Infinity;
    const done = Careers.prestige(career, this.config, this.today);
    if (!done) return;
    const titles = Careers.recordTitles(career, this.config);
    this.persist();
    this.play(['shiftComplete'], ['shiftComplete']);
    this.announce(S.prestige.done(done.rank, done.item), ...(titles.length > 0 ? [S.titles.earned(titles)] : []));
    this.prepareShift(false, null, this.screen);
  }

  private startSpecial(run: SpecialRun): void {
    if (this.screen.k === 'playing') return;
    this.special = run;
    this.shareable = null;
    this.closeDetail();
    this.tick();
    this.prepareShift(false);
  }

  /** Back to the career's own shifts. */
  leaveSpecial(): void {
    if (!this.special || this.screen.k === 'playing') return;
    this.special = null;
    this.shareable = null;
    this.tick();
    this.prepareShift(false, null, this.screen.k === 'page' ? this.screen : { k: 'ready' });
  }

  /** The link to the last finished shift, or null. */
  shareLink(origin: string): string | null {
    return this.shareable ? `${origin}#challenge=${this.shareCode()}` : null;
  }

  /** The code of the last finished shift's challenge (`encodeChallenge`), or null. */
  shareCode(): string | null {
    return this.shareable ? encodeChallenge(this.shareable) : null;
  }

  /** What the result says in a challenge or trial, and pays (a trial's reward, once). */
  private finishSpecial(run: SpecialRun, result: ShiftResult): void {
    const career = this.save.career;
    const bankBefore = career.money;
    const settled = settleSpecial(run, result, career, this.today, this.config);
    const summary = settled.summary;
    this.shareable = settled.shareable;
    if (settled.news.length > 0) this.announce(...settled.news);
    if (this.tutorial) {
      this.tutorial.end();
      if (this.tutorial.isDone) this.tutorial = null;
      this.save.tutorialDone = true;
    }
    this.persist();
    this.resultBank = { before: bankBefore, after: career.money };
    const shown: ShiftResult = { ...result, money: career.money - bankBefore, costs: 0, covered: 0 };
    this.pendingSummary = { result: shown, level: this.playingLevel, isNewHighscore: false, previousHighscore: 0, mode: this.playingMode, run: summary };
    this.resultCountdown = this.resultDelayFor(result);
  }

  /** The waiting shift is rebuilt after a purchase: same seed, unless the ring changed. */
  private refreshWaitingShift(): void {
    if (this.world.shift.phase !== 'waiting' || this.special) return;
    this.playingLevel = this.save.career.level;
    this.playingMode = this.save.mode;
    const next = this.shiftConfig(this.world.seed);
    if (builtArmSlots(next).join() === builtArmSlots(this.world.config).join()) this.world = this.world.nextShift(next, this.world.seed);
    else {
      this.world = new World(next, this.world.seed, { startsOnFirstTap: true });
      this.resetScene();
    }
  }

  /** The tab bar's height where it shows. */
  private get tabInset(): number {
    return showsTabBar(this.screen) ? this.lastInset : 0;
  }

  // MARK: Casino (present/casinoFlow.ts)

  private get casinoFlow(): CasinoFlow | null {
    const kit = casinoKit();
    if (kit && !this.loadedCasinoFlow) this.loadedCasinoFlow = new kit.CasinoFlow(this.casinoHost());
    return this.loadedCasinoFlow;
  }

  /**
   * A casino round left open by a reload or a closed tab is settled at the start: a drive
   * still running pays back its stake. Needs only the rules, not the casino's looks.
   */
  private resumeCasino(): void {
    const career = this.save.career;
    if (!career.casinoPending) return;
    const back = Casino.resume(career, this.today);
    this.persist();
    if (back) this.showNotice(S.casino.refunded(moneyText(Fmt.number(back.refunded))));
  }

  private casinoHost(): CasinoHost {
    // Getters: the casino always sees today's page, day and settings. The flow exists only
    // once the casino has loaded, and then the Shop always has its state.
    const session = this;
    return {
      get casino() {
        return session.shopPage.casino!;
      },
      get save() {
        return session.save;
      },
      get config() {
        return session.config;
      },
      get today() {
        return session.today;
      },
      get reduceMotion() {
        return session.reduceMotion;
      },
      get detailOpen() {
        return session.detailOpen;
      },
      set detailOpen(open: boolean) {
        session.detailOpen = open;
      },
      closeDetail: () => this.closeDetail(),
      tick: () => this.tick(),
      play: (sounds, haptics) => this.play(sounds, haptics),
      playPitched: (sound, pitch) => this.playPitched(sound, pitch),
      persist: () => this.persist(),
      showNotice: (text) => this.showNotice(text),
      announceAlbums: () => this.announceAlbums(),
    };
  }

  private pageHost(): PageHost {
    const session = this;
    return {
      get save() {
        return session.save;
      },
      get config() {
        return session.config;
      },
      get today() {
        return session.today;
      },
      get reduceMotion() {
        return session.reduceMotion;
      },
      get upgradePage() {
        return session.upgradePage;
      },
      get builderPage() {
        return session.builderPage;
      },
      get shopPage() {
        return session.shopPage;
      },
      get viewport() {
        return session.lastViewport;
      },
      get tabInset() {
        return session.tabInset;
      },
      get onShop() {
        return session.isPage('shop');
      },
      get detailOpen() {
        return session.detailOpen;
      },
      set detailOpen(open: boolean) {
        session.detailOpen = open;
      },
      perform: (action) => this.perform(action),
      tick: () => this.tick(),
      closeDetail: () => this.closeDetail(),
      persist: () => this.persist(),
      refreshWaitingShift: () => this.refreshWaitingShift(),
      play: (sounds, haptics) => this.play(sounds, haptics),
      showNotice: (text) => this.showNotice(text),
      pressed: (point) => (this.pressAt = point),
    };
  }

  private announceAlbums(): void {
    const albums = this.completeAlbums();
    if (albums.length === 0) return;
    this.persist();
    this.announce(...albums);
  }

  private playPitched(sound: SoundID, pitch: number): void {
    if (this.output && this.save.settings.sound) this.output.sound(sound, pitch, 0);
  }

  private resetScene(): void {
    this.accumulator = 0;
    this.effects = new CrashEffects(this.world.seed);
    this.explosions = new ExplosionEffects(this.world.seed);
    this.scars = new MapScars();
    this.tyreMarks.clear();
    this.popups = [];
    this.pendingSummary = null;
  }

  // MARK: Frame

  /** Advances by one display frame and returns what to draw. */
  frame(delta: number, actions: InputAction[], viewport: Vec2, bottomInset: number): RenderList {
    const realDelta = Math.min(Math.max(delta, 0), GameSession.maxFrameDelta);
    const simDelta = realDelta * this.timeScale;
    this.lastViewport = viewport;
    this.lastInset = bottomInset;
    if (this.countIn > 0) this.countIn = Math.max(0, this.countIn - realDelta);
    const runs = !this.isInterrupted && this.countIn === 0;
    if (runs) {
      this.accumulator += simDelta;
      this.sceneTime += simDelta;
    }
    this.keepDailyInStep();
    for (const a of actions) this.handle(a, simDelta);

    const events: GameEvent[] = [];
    if (runs) {
      let steps = 0;
      while (this.accumulator >= STEP && steps < 60) {
        this.world.step();
        events.push(...this.world.takeEvents());
        this.accumulator -= STEP;
        steps++;
      }
      if (steps >= 60) this.accumulator = 0;
      this.react(events);
      this.noteSightings();
      this.briefings.advance(simDelta, this.world);
      this.age(simDelta);
      this.lamps.update(this.world, simDelta);
    }
    if (this.screen.k === 'result') {
      this.resultAge += realDelta;
      if (!this.moneyLanded && this.screen.summary.result.money > 0 && this.resultAge >= ResultBanner.countDelay + ResultBanner.countDuration) {
        this.moneyLanded = true;
        this.play(['purchase'], ['paid']);
      }
    }
    this.sinceTakedown += realDelta;
    this.sinceHitStop += realDelta;
    const tiers = Math.min(this.world.config.comboThresholds.length, this.world.config.comboMultipliers.length);
    const atTop = this.screen.k === 'playing' && tiers > 0 && Scoring.tier(this.world.score.combo, this.world.config) >= tiers ? 1 : 0;
    this.topTier += (atTop - this.topTier) * Math.min(1, realDelta / 0.6);
    this.sinceFatalCrash += realDelta;
    this.sinceLoss += realDelta;
    let lossShown = false;
    if (this.screen.k === 'playing') lossShown = this.pendingSummary !== null && this.pendingSummary.result.outcome !== 'completed';
    else if (this.screen.k === 'result') lossShown = this.screen.summary.result.outcome !== 'completed' && ResultBanner.settled(this.resultAge) < 0.5;
    const pullTarget = lossShown && !this.reduceMotion ? 1 : 0;
    this.lossPull += (pullTarget - this.lossPull) * Math.min(1, realDelta / 0.3);
    this.sinceFlames += realDelta;
    const flames = this.world.score.flames;
    this.shownFlames = this.reduceMotion || Math.abs(flames - this.shownFlames) < 1 ? flames : this.shownFlames + (flames - this.shownFlames) * Math.min(1, realDelta / GameSession.scoreCatchUp);
    this.sinceComboTier += realDelta;
    this.sinceCarSent += realDelta;
    this.sinceStrike += realDelta;
    this.sincePoliceCrash += realDelta;
    const counts = { carsSent: this.world.shift.carsSent, strikes: this.world.score.strikes, policeCrashes: this.world.score.policeCrashes };
    if (counts.carsSent > this.seen.carsSent) {
      this.sinceCarSent = 0;
      if (this.screen.k === 'playing') this.cityPulse.beat(this.flowLevel);
      const start = this.world.shift.startedAt;
      if (this.screen.k === 'playing' && this.playingMode === 'shift' && start !== null) {
        this.splits.push(this.world.time - start);
        const best = Careers.bestTimes(this.save.career, this.playingLevel);
        if (best && best.length >= this.splits.length) this.raceDelta = this.splits[this.splits.length - 1] - best[this.splits.length - 1];
      }
    }
    if (this.dailySplash !== null && this.screen.k === 'ready') {
      this.dailySplash = this.dailySplash + realDelta < ReadyBanner.splashDuration ? this.dailySplash + realDelta : null;
    }
    if (counts.strikes > this.seen.strikes) {
      this.sinceStrike = 0;
      this.rim.signal('flush', 'destructive');
    }
    if (counts.policeCrashes > this.seen.policeCrashes) {
      this.sincePoliceCrash = 0;
      this.rim.signal('flush', 'lightBlue');
    }
    this.seen = counts;
    const flowTarget = this.screen.k === 'playing' && this.world.isInFlow ? 1 : 0;
    this.flowLevel += (flowTarget - this.flowLevel) * Math.min(1, realDelta / GameSession.flowFade);
    this.followRim();
    this.rim.age(realDelta);
    this.cityPulse.advance(runs ? simDelta : 0, CityPulse.energyOf(this.world, this.flowLevel));
    const recedeTarget = this.isPage('upgrades') ? 1 : 0;
    this.recede += (recedeTarget - this.recede) * Math.min(1, realDelta / 0.25);
    const points = this.world.score.points;
    if (Math.abs(points - this.shownScore) < 1 || this.reduceMotion) this.shownScore = points;
    else this.shownScore += (points - this.shownScore) * Math.min(1, realDelta / GameSession.scoreCatchUp);
    const money = Math.max(0, this.shiftStartMoney + this.world.score.money);
    if (money > this.shownMoney + 0.5) this.sinceMoney = Math.min(this.sinceMoney, 0);
    this.sinceMoney += realDelta;
    if (Math.abs(money - this.shownMoney) < 1 || this.reduceMotion) this.shownMoney = money;
    else this.shownMoney += (money - this.shownMoney) * Math.min(1, realDelta / GameSession.scoreCatchUp);
    this.sinceReady = this.screen.k === 'ready' ? this.sinceReady + realDelta : 0;
    this.watchCity(realDelta);
    const hintTarget = this.showsModeHint ? 1 : 0;
    this.modeHint = this.reduceMotion ? hintTarget : Math.max(0, Math.min(1, this.modeHint + (hintTarget ? 1 : -1) * (realDelta / 0.35)));
    this.tutorial?.advance(realDelta);
    if (this.tutorial?.isDone) this.tutorial = null;
    this.transitions.advance(realDelta);

    if (this.isPage('upgrades')) {
      this.upgradePage.advance(realDelta);
      this.revealAboveSheet();
      this.upgradePage.follow(realDelta, this.upgradeScrollRange);
    }
    else this.upgradePage = new UpgradeState();
    if (this.isPage('shop')) {
      const before = this.shopPage.opening?.age ?? null;
      this.shopPage.advance(realDelta);
      // The Collection's grid glides on after a flick and springs back past its ends.
      this.revealItemAboveSheet();
      this.shopPage.items.follow(realDelta, this.collectionScrollRange);
      const after = this.shopPage.opening?.age ?? null;
      const opening = this.shopPage.opening;
      if (opening && before !== null && after !== null) this.reelCues(opening, before, after);
      if (this.shopPage.ad !== null && this.shopPage.ad >= ShopPage.adDuration) this.shopFlow.adWatched();
      // Once the casino is open it loads in the background, so its section is there at once.
      if (Unlocks.isOpen(this.save.career, 'casino', this.config)) loadCasino().catch(() => undefined);
      const casino = this.shopPage.casino;
      const flow = this.casinoFlow;
      if (casino && flow) for (const cue of casino.advance(realDelta)) flow.cue(cue);
      this.tension = this.shopPage.section === 2 && casino ? casino.tension : 0;
    } else {
      this.casinoFlow?.leave();
      this.tension = 0;
      this.shopPage = new ShopState();
    }
    if (this.isPage('progress')) {
      this.progressPage.advance(realDelta);
      this.revealProgressAboveSheet();
      this.progressPage.follow(realDelta, this.progressScrollRange);
    } else if (this.progressPage.age !== 0 || this.progressPage.section !== 0) {
      this.leaveMuseum();
      this.progressPage = new ProgressState();
    }
    if (this.buildSlide) {
      this.buildSlide.age += realDelta;
      if (this.buildSlide.age >= BuildLayout.glide) this.buildSlide = null;
    }
    this.followModePan(realDelta);
    if (this.modeBanner) this.modeBanner = this.modeBanner.age + realDelta < ModeBanner.duration ? { mode: this.modeBanner.mode, age: this.modeBanner.age + realDelta } : null;
    if (this.isPage('streetBuilder')) {
      this.builderPage.advance(realDelta);
      if (this.builderPage.removing > StreetBuilderPage.removeDuration) this.perform({ k: 'removePart' });
    } else {
      this.builderPage = new BuilderState();
    }
    this.buildFlow.advance(realDelta, this.isPage('streetBuilder'));
    this.notices.advance(realDelta);
    this.musicMix = this.screen.k === 'playing' && runs ? Music.playing(this.world, this.flowLevel) : Music.silent;
    return this.renderList(viewport, realDelta);
  }

  private followRim(): void {
    if (this.screen.k === 'result' && this.resultAge < RingSignals.hold) return;
    const left = this.world.carsLeft;
    if (left === null) {
      this.rim.follow(0, 0, 'primary');
      return;
    }
    const total = this.world.config.shiftCars;
    this.rim.follow(total, Math.max(0, total - left), this.world.shift.isRushHour ? 'accent' : 'primary');
  }

  /** A tap for the world, timestamped when it happened (not when the frame saw it). */
  private tapWorld(ago: number | undefined, simDelta: number): void {
    const present = this.world.time + this.accumulator;
    const back = ago === undefined ? simDelta / 2 : ago * this.timeScale;
    this.world.tap(Math.max(this.world.time, present - back));
  }

  private handle(a: InputAction, simDelta: number): void {
    switch (a.k) {
      case 'tap':
        switch (this.screen.k) {
          case 'playing': {
            const summary = this.pendingSummary;
            if (summary && summary.result.outcome !== 'completed' && this.sinceLoss >= GameSession.restartLock) {
              this.sinceFatalCrash = Infinity;
              // A challenge or trial starts over fresh: that world is new, so it is shown first.
              if (this.special) {
                this.prepareShift(false);
                break;
              }
              // This tap only starts the transition: the next one, once the cars are at the line, plays.
              this.prepareShift(true);
              this.startPlaying();
              break;
            }
            this.tapWorld(a.ago, simDelta);
            break;
          }
          case 'ready':
            if (this.pan.travel || Math.abs(this.pan.pan) >= ModePan.swipeThreshold || this.world.isArriving()) return;
            if (this.versusSelected) {
              this.onVersus?.();
              return;
            }
            this.startPlaying();
            this.tapWorld(a.ago, simDelta);
            break;
          case 'result':
            if (this.resultAge >= ResultBanner.inputLock && !this.pan.travel && Math.abs(this.pan.pan) < ModePan.swipeThreshold && !this.world.isArriving()) {
              if (this.versusSelected) {
                this.onVersus?.();
                return;
              }
              this.startPlaying();
              this.tapWorld(a.ago, simDelta);
            }
            break;
          case 'page':
            if (this.isPage('shop') && this.shopPage.section === 2) this.casinoFlow?.key(a.ago ?? 0);
            break;
          default:
            break;
        }
        break;
      case 'confirm':
        if ((this.screen.k === 'ready' || this.screen.k === 'result') && this.versusSelected) this.onVersus?.();
        else if ((this.screen.k === 'ready' || this.screen.k === 'result') && !this.world.isArriving()) {
          this.startPlaying();
          this.tapWorld(undefined, simDelta);
        } else if (this.isPage('upgrades') && this.upgradePage.selected) this.perform({ k: 'buy', upgrade: this.upgradePage.selected });
        else if (this.screen.k === 'settings') this.perform({ k: 'closeSettings' });
        break;
      case 'back':
        if (this.detailOpen && this.screen.k === 'page') {
          this.closeDetail();
          this.tick();
        } else if (this.screen.k === 'settings') this.perform({ k: 'closeSettings' });
        else if (this.special && (this.screen.k === 'ready' || this.screen.k === 'result')) this.leaveSpecial();
        else if (this.screen.k === 'ready') this.perform({ k: 'openSettings' });
        else if (this.screen.k === 'result' || this.screen.k === 'page') {
          if (this.isPage('shop') && this.shopPage.opening) this.shopFlow.tapShop({ k: 'dismiss' });
          else this.perform({ k: 'showTab', tab: 'game' });
        }
        break;
      case 'restart':
        if (this.screen.k === 'playing' || this.screen.k === 'result') this.perform({ k: 'restart' });
        break;
      case 'pointerDown':
        this.pointerDown(a.p, a.ago, simDelta);
        break;
      case 'pointerMove':
        if (this.pan.drag) {
          this.pan.move(a.p);
          return;
        }
        if (this.isPage('upgrades') && this.upgradePage.drag) {
          this.upgradePage.move(a.p.y, this.upgradeScrollRange);
          return;
        }
        if (this.isPage('progress') && this.progressPage.drag) {
          this.progressPage.move(a.p.y, this.progressScrollRange);
          return;
        }
        if (this.isPage('shop') && this.shopPage.items.drag) {
          this.shopPage.items.move(a.p.y, this.collectionScrollRange);
          return;
        }
        if (!this.isPage('streetBuilder') || !this.builderPage.dragging) return;
        if (this.pressAt && Math.hypot(a.p.x - this.pressAt.x, a.p.y - this.pressAt.y) > 8) {
          this.pressAt = null;
          if (!this.builderPage.pending) this.detailOpen = false;
        }
        this.builderPage.dragging.at = a.p;
        this.builderPage.target = StreetBuilderPage.targetFor(this.builderPage.dragging.part, a.p, this.save.career, this.config, StreetBuilderPage.map(this.lastViewport, this.tabInset));
        break;
      case 'pointerUp': {
        if (this.pan.drag) {
          const r = this.pan.release(a.p, this.lastViewport.x);
          if (r === 'tap') this.handle({ k: 'tap' }, simDelta);
          else if (r !== null) this.handle({ k: 'swipeMode', step: r }, simDelta);
          return;
        }
        if (this.isPage('upgrades') && this.upgradePage.drag) {
          if (this.upgradePage.release()) {
            const upgrade = UpgradePage.cardAt(a.p, this.lastViewport, this.tabInset, this.visibleUpgrades, this.upgradePage.scroll);
            if (upgrade) this.buildFlow.tapUpgrade(upgrade);
          }
          return;
        }
        if (this.isPage('progress') && this.progressPage.drag) {
          if (this.progressPage.release()) {
            const target = ProgressPage.targetAt(a.p, this.lastViewport, this.tabInset, this.save, this.today, this.progressPage);
            if (target) this.tapProgress(target);
          }
          return;
        }
        if (this.isPage('shop') && this.shopPage.items.drag) {
          if (this.shopPage.items.release()) {
            const target = ShopPage.itemAt(a.p, this.lastViewport, this.tabInset, this.shopPage);
            if (target) this.shopFlow.tapShop(target);
          }
          return;
        }
        const b = this.builderPage;
        if (!this.isPage('streetBuilder') || !b.dragging) return;
        const slot = StreetBuilderPage.targetFor(b.dragging.part, a.p, this.save.career, this.config, StreetBuilderPage.map(this.lastViewport, this.tabInset));
        const wasTap = this.pressAt !== null;
        this.pressAt = null;
        if (slot !== null) this.perform({ k: 'placePart', slot });
        else {
          b.dragging = null;
          b.target = null;
          // A tap on a palette card, no drag: its explanation.
          if (wasTap && !b.pending) this.detailOpen = true;
        }
        break;
      }
      case 'wheel':
        if (this.isPage('upgrades')) this.upgradePage.wheel(a.dy, this.upgradeScrollRange);
        else if (this.isPage('progress')) this.progressPage.wheel(a.dy, this.progressScrollRange);
        else if (this.isPage('shop') && this.shopPage.section === 1) this.shopPage.items.wheel(a.dy, this.collectionScrollRange);
        break;
      case 'swipeMode': {
        const index = SWIPE_MODES.indexOf(this.swipeMode) + a.step;
        if (!(this.tutorial?.isOver ?? true) || this.pan.travel || this.world.shift.phase !== 'waiting') return;
        if (!(this.screen.k === 'ready' || this.isShowingResult) || index < 0 || index >= SWIPE_MODES.length) return;
        if (this.reduceMotion) this.perform({ k: 'setGameMode', mode: SWIPE_MODES[index] });
        else {
          this.pan.travel = { to: SWIPE_MODES[index], direction: a.step };
          this.play(['swoosh'], []);
        }
        break;
      }
      case 'selectTab':
        if (a.tab === 'upgrades') {
          if (BUILD_PAGES.includes(screenTab(this.screen))) return;
          this.perform({ k: 'showTab', tab: this.buildPage });
        } else this.perform({ k: 'showTab', tab: a.tab });
        break;
      case 'nextTab': {
        const pages = TAB_BAR.flatMap((t) => (t === 'upgrades' ? BUILD_PAGES : [t]));
        const index = Math.max(0, pages.indexOf(screenTab(this.screen)));
        this.perform({ k: 'showTab', tab: pages[(index + 1) % pages.length] });
        break;
      }
      case 'dispatch':
        if (this.screen.k === 'playing') this.world.dispatchPolice();
        break;
      case 'focusLost':
        if (this.screen.k === 'playing') this.isInterrupted = true;
        break;
      case 'focusGained':
        if (this.isInterrupted) {
          this.isInterrupted = false;
          this.countIn = this.reduceMotion ? 0 : GameSession.countInSeconds;
        }
        break;
      case 'perform':
        this.perform(a.action);
        break;
    }
  }

  /** A press anywhere on the canvas: chrome first, then the page under it, else the game. */
  private pointerDown(point: Vec2, ago: number | undefined, simDelta: number): void {
    const page = this.pageAction(point);
    if (page === true) return;
    if (page) {
      this.handle(page, simDelta);
      return;
    }
    const inset = this.tabInset;
    if (this.isPage('upgrades')) {
      // A press on the list is a tap or the start of a scroll; the lift decides.
      if (R.contains(UpgradePage.listArea(this.lastViewport, inset), point)) this.upgradePage.press(point.y);
      return;
    }
    if (this.isPage('shop')) {
      // The Collection's grid scrolls: a press there is a tap or the start of a scroll.
      if (ShopPage.inItems(point, this.lastViewport, inset, this.shopPage)) {
        this.shopPage.items.press(point.y);
        return;
      }
      const target = ShopPage.targetAt(point, this.lastViewport, inset, this.save.career, this.shopPage);
      if (target) this.shopFlow.tapShop(target);
      return;
    }
    if (this.isPage('streetBuilder')) {
      this.buildFlow.press(point);
      return;
    }
    if (this.screen.k === 'ready' || this.isShowingResult) {
      if (this.pan.travel) return;
      if (this.takesModeSwipe) this.pan.press(point);
      else this.handle({ k: 'tap', ago }, simDelta);
      return;
    }
    if (this.screen.k === 'playing') this.handle({ k: 'tap', ago }, simDelta);
  }

  /** The card just tapped glides into view above the sheet that opened for it. */
  private revealAboveSheet(): void {
    const u = this.revealUpgrade;
    if (!u || !this.detailOpen || this.sheetInset <= 0) return;
    this.revealUpgrade = null;
    const card = UpgradePage.cards(this.lastViewport, this.tabInset, this.visibleUpgrades, this.upgradePage.scroll).find((c) => c.upgrade === u);
    if (!card) return;
    const bottom = this.lastViewport.y - this.tabInset - this.sheetInset - 12;
    const top = BuildLayout.contentTop + 4;
    let target = this.upgradePage.scroll;
    if (card.rect.maxY > bottom) target += Math.min(card.rect.maxY - bottom, card.rect.minY - top);
    else if (card.rect.minY < top) target -= top - card.rect.minY;
    if (target !== this.upgradePage.scroll) this.upgradePage.scrollTo(Math.min(Math.max(target, 0), this.upgradeScrollRange));
  }

  /** A tap in a Progress list: a card's sheet, a shift to play, the stats folding open. */
  private tapProgress(target: ProgressTarget): void {
    const p = this.progressPage;
    switch (target.k) {
      case 'elite':
        this.perform({ k: 'showElite' });
        break;
      case 'pass':
        this.perform({ k: 'showPass' });
        break;
      case 'stats':
        this.tick();
        p.statsOpen = !p.statsOpen;
        break;
      case 'weekly':
        this.startSpecial({ k: 'trial', trial: weeklyTrial(weekNumber(this.today)) });
        break;
      case 'trial':
        // It waits, ready to play, on the Game tab.
        this.startTrial(target.id);
        break;
      case 'feat':
        if (p.feat !== target.id) this.tick();
        p.feat = target.id;
        this.detailOpen = true;
        this.revealProgress = target;
        break;
      case 'museum':
        this.tapMuseum(target.id);
        break;
    }
  }

  /** A tap on a Museum entry: its sheet (a second tap on a beaten boss starts its rematch). */
  private tapMuseum(id: string): void {
    const m = this.progressPage.museum;
    const career = this.save.career;
    if (career.museumNew.includes(id)) {
      Careers.markMuseumSeen(career, [id]);
      this.persist();
    }
    const entry = museumEntry(id);
    if (this.detailOpen && m.selected === id && entry?.k === 'boss' && career.bossesBeaten.includes(entry.kind)) {
      this.startTrial(rematchId(entry.kind));
      return;
    }
    if (m.selected !== id) this.tick();
    m.selected = id;
    this.detailOpen = true;
    this.revealProgress = { k: 'museum', id };
  }

  /** The Museum is being left: what was new among the entries that were on screen has been seen. */
  private leaveMuseum(): void {
    if (this.progressPage.section !== 3) return;
    const career = this.save.career;
    const shown = [...this.progressPage.museum.viewed].filter((id) => career.museumNew.includes(id));
    this.progressPage.museum.viewed.clear();
    if (shown.length === 0) return;
    Careers.markMuseumSeen(career, shown);
    this.persist();
  }

  /** The Collection card just tapped glides into view above the sheet that opened for it. */
  private revealItemAboveSheet(): void {
    const s = this.shopPage;
    const id = s.revealItem;
    if (!id || !this.detailOpen || this.sheetInset <= 0) return;
    s.revealItem = null;
    const l = ShopPage.layout(this.lastViewport, this.tabInset);
    const cell = ShopPage.itemCells(l, s.shelf, s.items.scroll).find(([item]) => item.id === id);
    if (!cell) return;
    const area = ShopPage.itemsArea(l);
    const window = { ...area, minY: area.minY + 4, maxY: this.lastViewport.y - this.tabInset - this.sheetInset - 12 };
    s.items.reveal(cell[1], window, this.collectionScrollRange);
  }

  /** The Progress card just tapped glides into view above the sheet that opened for it. */
  private revealProgressAboveSheet(): void {
    const target = this.revealProgress;
    if (!target || !this.detailOpen || this.sheetInset <= 0) return;
    this.revealProgress = null;
    const r = ProgressPage.rectOf(target, this.lastViewport, this.tabInset, this.save, this.today, this.progressPage);
    if (!r) return;
    const content = ProgressPage.layout(this.lastViewport, this.tabInset).content;
    const window = { ...content, minY: content.minY + 4, maxY: this.lastViewport.y - this.tabInset - this.sheetInset - 12 };
    this.progressPage.reveal(r, window, this.progressScrollRange);
  }

  /**
   * Special vehicles and bosses on the road for the first time go on show in the Museum, and the
   * top card says what they are and what to do (`brief`). Conditions have the ready screen and
   * their briefing as the shift starts (`briefConditions`).
   */
  private noteSightings(): void {
    // The tutorial teaches the first shift itself; what it meets there is met again right after.
    if (this.tutorial && !this.tutorial.isOver) return;
    const seen = sightings(this.world);
    // A briefing owed from a shift that ended too soon comes when its vehicle is back.
    if (this.owed.size > 0) for (const id of seen) if (this.owed.has(id)) this.brief(museumEntry(id));
    const found = Careers.discover(this.save.career, seen);
    if (found.length === 0) return;
    this.museumFound.push(...found);
    this.persist();
    for (const e of found.map(museumEntry)) if (e && (e.k === 'special' || e.k === 'boss')) this.brief(e, true);
  }

  /** Whether briefings belong on the top card now: a shift of your own, past the tutorial. */
  private get briefs(): boolean {
    return this.screen.k === 'playing' && !this.versusSelected && this.playingMode !== 'mayhem' && (this.tutorial?.isOver ?? true);
  }

  /**
   * Explains `e` on the top card if it is new to this player or cost the last shift. `found`:
   * the Museum has just taken it in, so it is new for sure.
   */
  private brief(e: MuseumEntry | null, found = false): void {
    if (!e) return;
    const id = museumId(e);
    // Met where there is no top card to explain it (Mayhem): owed for a shift that has one.
    if (!this.briefs) {
      if (found) this.owed.add(id);
      return;
    }
    const again = this.relearn.has(id);
    const owed = this.owed.has(id);
    if (!found && !again && !owed && this.save.career.museumSeen.includes(id)) return;
    this.relearn.delete(id);
    this.owed.delete(id);
    this.briefings.add(briefOf(e, again && !found && !owed));
  }

  /** The shift's conditions new to this player: each on the top card for a few seconds as it starts. */
  private briefConditions(): void {
    for (const e of conditionsOf(this.world.config)) this.brief(e);
  }

  /** The Museum's new entries of the shift, as a line for the result; empties the list. */
  private takeMuseumNotice(): string | null {
    const names = this.museumFound.map((id) => museumEntry(id)).flatMap((e) => (e ? [MuseumPage.name(e)] : []));
    this.museumFound = [];
    return names.length > 0 ? S.museum.discovered(names) : null;
  }

  /** Closes the detail sheet; what it was about is no longer chosen. */
  closeDetail(): void {
    if (!this.detailOpen) return;
    this.detailOpen = false;
    this.progressPage.museum.selected = null;
    this.progressPage.feat = null;
    this.upgradePage.selected = null;
    this.shopPage.selectedItem = null;
    this.builderPage.selected = null;
    if (this.builderPage.pending) {
      this.builderPage.pending = null;
      this.builderPage.removing = 0;
    }
  }

  /** What the detail sheet shows right now; null while it is closed or something covers the page. */
  get detail(): Detail | null {
    if (!this.detailOpen || this.screen.k !== 'page') return null;
    const career = this.save.career;
    switch (this.screen.tab) {
      case 'upgrades':
        return this.upgradePage.selected ? Details.upgrade(this.upgradePage.selected, career, this.config) : null;
      case 'shop': {
        const s = this.shopPage;
        if (s.opening || s.ad !== null) return null;
        if (s.section === 0) return Details.chest(s.selectedChest, career, this.config, this.today);
        if (s.section === 1) return s.selectedItem ? Details.item(s.selectedItem, career) : null;
        return s.casino ? Details.casino(s.casino.game, career, this.config) : null;
      }
      case 'streetBuilder': {
        const b = this.builderPage;
        if (b.dragging && !this.pressAt) return null;
        const part = b.pending?.part ?? b.selected;
        return part ? Details.part(part, b.pending !== null, career, this.config) : null;
      }
      case 'progress': {
        // Records has one sheet: the Elite track, opened from its card.
        if (this.progressPage.section === 0) return Details.elite(career, this.config, this.sceneTime - this.prestigeArmed <= GameSession.prestigeWindow);
        if (this.progressPage.section === 1) return Details.pass(career, this.config, this.today);
        const feat = this.progressPage.feat;
        if (this.progressPage.section === 2) return feat ? Details.feat(feat, career, this.config) : null;
        const selected = this.progressPage.museum.selected;
        return this.progressPage.section === 3 && selected ? Details.museum(selected, career, this.config) : null;
      }
      default:
        return null;
    }
  }

  /** The Progress list scrolls a sheet's height further, so its last card can come out from under it. */
  private get progressScrollRange(): number {
    const sheet = this.detailOpen ? this.sheetInset : 0;
    return ProgressPage.scrollRange(this.lastViewport, this.tabInset, this.save, this.today, this.progressPage) + sheet;
  }

  private get collectionScrollRange(): number {
    const sheet = this.detailOpen ? this.sheetInset : 0;
    return ShopPage.collectionRange(this.lastViewport, this.tabInset, this.shopPage) + sheet;
  }

  private get upgradeScrollRange(): number {
    const sheet = this.detailOpen ? this.sheetInset : 0;
    return UpgradePage.layoutOf(this.lastViewport, this.tabInset, this.visibleUpgrades.length).maxScroll + sheet;
  }

  /**
   * The city of a career shift grew (a level, an arm, a module): the new houses rise, once the
   * result has made way. Other modes and challenges show other cities and are not counted.
   */
  private watchCity(dt: number): void {
    if (this.cityRise && this.screen.k !== 'result') {
      this.cityRise.age += dt;
      const rising = (this.cityCount ?? 0) - this.cityRise.from;
      if (this.cityRise.age > CityLayer.riseDelay + CityLayer.riseDuration + rising * CityLayer.riseStagger) this.cityRise = null;
    }
    if (this.special || this.versusSelected || this.playingMode !== 'shift') return;
    const count = CityLayer.count(this.world.config);
    if (this.cityCount !== null && count > this.cityCount) this.cityRise = { from: this.cityCount, age: 0, reduceMotion: this.reduceMotion };
    this.cityCount = count;
  }

  /** After Level 5, until the first swipe, on the waiting screen of a career shift (not under a notice). */
  private get showsModeHint(): boolean {
    const career = this.save.career;
    if (this.save.hints.includes('modes') || career.level <= this.config.modeHintAfterLevel || this.versusSelected || !this.notices.isEmpty) return false;
    return this.screen.k === 'ready' && this.sinceReady > 0.6 && this.takesModeSwipe;
  }

  private get takesModeSwipe(): boolean {
    if (this.world.shift.phase !== 'waiting' || !(this.tutorial?.isOver ?? true) || this.special) return false;
    if (this.isShowingResult) return this.resultAge >= ResultBanner.inputLock;
    return this.screen.k === 'ready';
  }

  /** The chrome every screen shares: the Build tab's segments, the top card, the Progress tab. */
  private pageAction(point: Vec2): InputAction | true | null {
    if (!showsTabBar(this.screen)) return null;
    if (this.isPage('upgrades') || this.isPage('streetBuilder')) {
      const tab = BuildLayout.pageAt(point, this.lastViewport);
      return tab ? { k: 'perform', action: { k: 'showTab', tab } } : null;
    }
    if (this.screen.k === 'ready' || this.screen.k === 'result') {
      if (this.screen.k === 'result' && this.resultAge < ResultBanner.inputLock) return null;
      const column = TopBar.column(point, this.lastViewport.x);
      if (!column) return null;
      const showsCars = this.screen.k === 'ready' || ResultBanner.settled(this.resultAge) >= 0.5;
      // The money leads to the chests it buys, never straight into the casino.
      if (column === 'left') return { k: 'perform', action: { k: 'showShop', section: 0 } };
      if (column === 'center') return { k: 'perform', action: showsCars ? { k: 'showShop', section: 1 } : { k: 'showProgress', section: 0 } };
      return { k: 'perform', action: { k: 'showProgress', section: 0 } };
    }
    if (this.isPage('progress')) {
      if (ProgressPage.rankChipAt(point, this.lastViewport, this.save.career.money)) {
        this.tick();
        this.onLeaderboard?.();
        return true;
      }
      const section: ProgressSection | null = ProgressPage.sectionAt(point, this.lastViewport, this.tabInset);
      if (section !== null) {
        if (this.progressPage.section !== section) {
          this.tick();
          this.leaveMuseum();
          this.closeDetail();
        }
        this.progressPage.select(section);
        return true;
      }
      // The list: a press is a tap or the start of a scroll; the lift decides (`tapProgress`).
      if (ProgressPage.inList(point, this.lastViewport, this.tabInset)) this.progressPage.press(point.y);
      return true;
    }
    return null;
  }

  private react(events: GameEvent[]): void {
    const world = this.world;
    for (const e of events) {
      this.tutorial?.react(e);
      switch (e.type) {
        case 'merged':
          // Braked in behind slow traffic: nothing was timed, so it says so and counts for nothing.
          if (e.crept) {
            this.addPopup({ k: 'crept' }, e.position);
            break;
          }
          if (e.critical) {
            this.addPopup({ k: 'critical', n: e.points }, e.position);
            this.rim.signal('wave', 'coin');
            this.sinceHitStop = 0;
          } else if (e.rating !== 'clean') this.addPopup({ k: e.rating } as PopupKind, e.position);
          if (e.shave > 0) this.addPopup({ k: 'shave', n: e.shave }, add(e.position, v(0, 22)));
          // In the snow every merge leaves its tracks, and they stay.
          if (TyreMarks.leavesMark(e.rating) || world.config.weather === 'snow') this.tyreMarks.add(world.config.weather === 'snow');
          // The Records keep how early or late the taps come (saved with the shift).
          if (!this.tutorial) noteTap(this.save.career, e.gapAhead, e.gapBehind, this.config);
          break;
        case 'crash':
          this.effects.spawn(e, world, this.reduceMotion, e.chain);
          if (e.flames > 0) {
            this.addPopup({ k: 'flames', n: e.flames, chain: e.chain }, e.point);
            this.sinceFlames = 0;
            if (e.chain >= 2) this.play([e.chain >= 4 ? 'chestBurstRare' : 'chestBurst'], ['chest']);
          }
          if (e.penalty > 0) this.addPopup({ k: 'penalty', n: e.penalty }, e.point);
          if (e.cost > 0) this.addPopup({ k: 'cost', n: e.cost }, add(e.point, v(0, 18)));
          else if (e.covered > 0) this.addPopup({ k: 'covered' }, add(e.point, v(0, 18)));
          break;
        case 'comboChanged':
          if (e.isTierUp) {
            this.sinceComboTier = 0;
            this.rim.signal('wave', 'accent');
            // The top multiplier lands with a blink of stillness.
            const c = world.config;
            if (e.tier >= Math.min(c.comboThresholds.length, c.comboMultipliers.length)) this.sinceHitStop = 0;
          }
          break;
        case 'shiftEnded':
          if (e.result.outcome === 'completed') this.rim.signal('sweep', 'accent');
          else if (e.result.outcome === 'struckOut') {
            this.rim.signal('flush', 'destructive');
            this.sinceFatalCrash = 0;
            this.sinceLoss = 0;
          } else {
            this.rim.signal('flush', 'vehicleCriminal');
            this.sinceLoss = 0;
          }
          this.finish(e.result);
          break;
        case 'takedown':
          this.addPopup({ k: 'busted', n: e.points }, e.point);
          this.sinceTakedown = 0;
          this.rim.signal('wave', 'lightBlue');
          break;
        case 'criminalWarning':
          this.brief(e.boss ? { k: 'boss', kind: world.config.bossKind } : { k: 'special', kind: 'pickup' });
          if (e.boss) {
            this.addPopup({ k: 'convoy', kind: world.config.bossKind }, world.layout.stopPose(e.arm).position);
            this.rim.signal('sweep', 'coin');
          }
          break;
        case 'armourHit':
          this.addPopup({ k: 'armour' }, add(e.point, v(0, 20)));
          this.rim.signal('wave', 'coin');
          break;
        case 'ambulanceWarning':
          this.brief({ k: 'special', kind: e.fire ? 'fireTruck' : 'ambulance' });
          this.addPopup({ k: 'ambulance', fire: e.fire }, world.layout.stopPose(e.arm).position);
          this.rim.signal('sweep', 'lightBlue');
          break;
        case 'learnerWarning':
          this.brief({ k: 'special', kind: 'learner' });
          this.addPopup({ k: 'learner' }, world.layout.stopPose(e.arm).position);
          this.rim.signal('sweep', 'juiceGreen');
          break;
        case 'learnerSpoilt':
          this.addPopup({ k: 'crowded' }, e.point);
          break;
        case 'learnerPassed':
          this.addPopup({ k: 'patient', n: e.amount }, e.point);
          this.rim.signal('wave', 'juiceGreen');
          break;
        case 'ambulanceBlocked':
          this.addPopup({ k: 'blocked' }, e.point);
          this.rim.signal('flush', 'destructive');
          break;
        case 'ambulanceCleared':
          this.addPopup({ k: 'clearRoad', n: e.amount }, e.point);
          this.rim.signal('wave', 'lightBlue');
          break;
        case 'ambulanceLost':
          this.addPopup({ k: 'lost' }, e.point);
          break;
        case 'heistRecovered':
          this.addPopup({ k: 'heist', n: e.amount }, add(e.point, v(0, 24)));
          this.rim.signal('wave', 'coin');
          break;
        case 'dispatched':
          this.addPopup({ k: 'dispatch' }, world.layout.stopPose(world.layout.player).position);
          break;
        case 'rushHour':
          this.rim.signal('sweep', 'accent');
          break;
        case 'transporterSeized':
          this.addPopup({ k: 'seized' }, e.point);
          break;
        case 'transporterLost':
          this.addPopup({ k: 'lost' }, e.point);
          break;
        case 'transporterWarning':
          this.brief({ k: 'special', kind: 'transporter' });
          if (e.jackpot) {
            this.addPopup({ k: 'jackpot' }, world.layout.stopPose(e.arm).position);
            this.rim.signal('sweep', 'coin');
          }
          break;
        case 'transporterPaid':
          if (e.amount > 0) {
            this.addPopup({ k: 'paid', n: e.amount, jackpot: e.jackpot }, world.layout.stopPose(world.layout.player).position);
            this.rim.signal(e.jackpot ? 'sweep' : 'wave', e.jackpot ? 'coin' : 'vehicleCargo');
          }
          break;
        case 'modulePaid':
          this.addPopup({ k: 'modulePulse', color: e.module === 'speedCamera' ? 'lightBlue' : 'hazard' }, e.point);
          this.addPopup({ k: 'earned', n: e.amount }, e.point);
          break;
        case 'towed':
          this.addPopup({ k: 'modulePulse', color: 'hazard' }, towYard(e.slot, world.layout, world.config));
          break;
        case 'militaryWarning':
          this.brief({ k: 'special', kind: 'military' });
          break;
        case 'criminalEscaped': {
          // It cost the shift: the next one explains it again.
          const boss = world.vehicle(e.vehicle)?.role === 'boss';
          if (this.briefs) this.relearn.add(museumId(boss ? { k: 'boss', kind: world.config.bossKind } : { k: 'special', kind: 'pickup' }));
          break;
        }
        case 'explosion':
          if (e.kind === 'bomb' && this.briefs) this.relearn.add(museumId({ k: 'special', kind: 'military' }));
          this.explosions.spawn(e, this.reduceMotion);
          this.scars.add(e, this.sceneTime);
          this.effects.ignite([...e.wrecked, e.source], 1.5);
          if (e.kind === 'bomb') this.curtain = new SmokeCurtain(e.point);
          else this.addPopup({ k: 'boom' }, e.point);
          if (e.flames > 0) {
            this.addPopup({ k: 'flames', n: e.flames, chain: e.chain }, add(e.point, v(0, 20)));
            this.sinceFlames = 0;
          }
          if (this.screen.k !== 'playing') {
            const cues = Feedback.cues([e]);
            this.play(cues.sounds, cues.haptics, cues.origins);
          }
          break;
        default:
          break;
      }
    }
    if (this.screen.k !== 'playing') return;
    const cues = Feedback.cues(events);
    this.play(cues.sounds, cues.haptics, cues.origins);
  }

  private startPlaying(): void {
    this.screen = { k: 'playing' };
    this.shiftStartMoney = this.save.career.money;
    this.shownMoney = this.shiftStartMoney;
    this.sinceMoney = Infinity;
    this.dailySplash = null;
    this.play(['go'], []);
    this.briefConditions();
    this.onChrome?.();
    if (!this.playingDaily) return;
    const career = this.save.career;
    const milestone = Careers.startDaily(career, this.today);
    const toasts: string[] = [];
    if (milestone) {
      toasts.push(S.daily.milestone(career.dailyStreak, milestone));
      toasts.push(...this.completeAlbums());
    }
    this.persist();
    this.announce(...toasts);
  }

  /** The waiting shift follows the day: today's Daily Shift while open, a normal one after. */
  private keepDailyInStep(): void {
    if (this.world.shift.phase !== 'waiting' || this.screen.k === 'playing' || this.special) return;
    this.today = dayNumber();
    if (this.wantsDaily !== this.dailySelected) this.prepareShift(true, null, this.screen);
  }

  private completeAlbums(): string[] {
    return Careers.completeAlbums(this.save.career).map((album) => S.albums.complete(album, Fmt.number(ALBUM_REWARD[album])));
  }

  private tick(): void {
    this.play(['uiTick'], []);
  }

  /**
   * What a chest opening sounds and feels like between two frames: the whirr as the reel sets
   * off, a tick for every card under the marker (deeper and heavier as it slows, a short
   * vibration once it is slow enough to feel each one), a shimmer when an Epic or Legendary
   * passes, a heavy double knock when it lands, and the burst when the prize comes.
   */
  private reelCues(o: NonNullable<ShopState['opening']>, before: number, after: number): void {
    const stage = ShopPage.stages(o.opening, o.reel);
    const passes = (at: number): boolean => before < at && after >= at;
    const legendary = o.opening.item.rarity === 'legendary';
    if (passes(stage.burst)) this.play(['swoosh', 'reelSpin'], ['comboUp']);
    if (before >= stage.burst && before < stage.landed) {
      const spun = after - stage.burst;
      const card = ChestReel.passing(o.reel, spun);
      if (card !== ChestReel.passing(o.reel, before - stage.burst)) {
        const speed = ChestReel.speed(o.reel, spun);
        // 0 (crawling) … 1 (spinning): slow ticks are low and loud, fast ones light and high.
        const pace = Ease.clamp01(speed / 25);
        this.playReel('reelTick', 0.55 + 0.75 * pace, speed < 18 ? ['reelTick'] : []);
        const passing = o.reel.cards[card];
        if (passing && rarityRank(passing.rarity) >= 2) this.playReel('shimmer', passing.rarity === 'legendary' ? 1.5 : 1, []);
      }
    }
    if (passes(stage.landed)) this.play([legendary ? 'reelLandBig' : 'reelLand'], ['reelStop']);
    if (passes(stage.reveal)) this.play([rarityRank(o.opening.item.rarity) >= 2 ? 'chestBurstRare' : 'chestBurst'], ['chest']);
  }

  /** A sound at a pitch of our own (the reel's ticks), with the usual settings for sound and haptics. */
  private playReel(sound: SoundID, pitch: number, haptics: HapticID[]): void {
    const out = this.output;
    if (!out) return;
    if (this.save.settings.sound) out.sound(sound, pitch, 0);
    if (this.save.settings.haptics) for (const h of haptics) out.haptic(h, 0);
  }

  private play(sounds: SoundID[], haptics: HapticID[], origins: Map<SoundID, Vec2> | null = null): void {
    const out = this.output;
    if (!out) return;
    if (this.save.settings.sound) {
      const cam = this.lastCamera;
      for (const s of sounds) {
        this.soundSerial++;
        const at = origins?.get(s);
        const pan = at && cam ? Feedback.pan(toScreen(cam, at).x, cam.viewport.x) : 0;
        out.sound(s, Feedback.pitch(s, this.world.score.combo, this.soundSerial), pan);
      }
    }
    if (this.save.settings.haptics) {
      const flow = this.screen.k === 'playing' ? this.flowLevel : 0;
      for (const h of haptics) out.haptic(h, Feedback.softness(h, flow));
    }
  }

  /** Saves right away; the result shows after `resultDelay`. */
  private finish(result: ShiftResult): void {
    const save = this.save;
    const career = save.career;
    if (this.special) {
      this.finishSpecial(this.special, result);
      return;
    }
    // Any finished shift can go to a friend as a challenge (not while learning the game).
    this.shareable = save.tutorialDone
      ? challengeOf(
          career,
          this.playingMode,
          this.playingLevel,
          result.seed,
          this.world.config.cityEvent,
          this.playingMode === 'mayhem' ? result.flames : result.score,
          this.world.config.legendary,
        )
      : null;
    if (this.tutorial && this.playingMode !== 'mayhem') {
      this.tutorial.end();
      if (this.tutorial.isDone) this.tutorial = null;
      save.tutorialDone = true;
    }
    const booked = bookShift(save, result, {
      mode: this.playingMode,
      level: this.playingLevel,
      daily: this.playingDaily,
      today: this.today,
      config: this.config,
      shiftConfig: this.world.config,
      splits: this.splits,
    });
    this.persist();
    this.dailySelected = false;
    this.resultBank = booked.bank;
    const found = this.takeMuseumNotice();
    this.notices.announce(...booked.news, ...(found ? [found] : []));
    for (const hint of booked.due) this.onHint?.(hint);
    const { isNew, previous } = booked;
    if (this.playingMode === 'mayhem') {
      this.pendingSummary = { result, level: this.playingLevel, isNewHighscore: isNew, previousHighscore: previous, mode: 'mayhem' };
      this.resultCountdown = this.resultDelayFor(result);
      return;
    }
    this.pendingSummary = { result, level: this.playingLevel, isNewHighscore: isNew, previousHighscore: previous, mode: this.playingMode, closeCall: this.closeCall(result, previous) };
    this.resultCountdown = this.resultDelayFor(result);
  }

  /**
   * The line under a result: after a loss, how close it was (honestly: cars left, points to
   * the best, a merge short of the next multiplier); after a win, what the money is close to.
   */
  private closeCall(result: ShiftResult, best: number): ShiftSummary['closeCall'] {
    if (result.outcome !== 'completed') {
      const miss = Goals.nearMiss(result, this.playingMode === 'shift' ? this.world.config.shiftCars : 0, this.playingLevel, best, this.world.config);
      return miss ? { text: S.goals.nearMiss(miss), color: 'hazard' } : null;
    }
    const goal = Goals.money(this.save.career, this.config);
    return goal ? { text: S.goals.money(Fmt.number(goal.short), goal.upgrade), color: 'accent' } : null;
  }

  private resultDelayFor(result: ShiftResult): number {
    return result.detonated ? SmokeCurtain.swapAt : GameSession.resultDelay;
  }

  private followModePan(delta: number): void {
    if (!(this.screen.k === 'ready' || this.isShowingResult)) {
      this.pan.reset();
      return;
    }
    const switched = this.pan.follow(delta, this.lastViewport.x, SWIPE_MODES.indexOf(this.swipeMode), SWIPE_MODES.length);
    if (switched) {
      this.perform({ k: 'setGameMode', mode: switched });
      this.play([], ['comboUp']);
    }
  }

  private addPopup(kind: PopupKind, position: Vec2): void {
    this.popupSerial++;
    this.popups.push({ serial: this.popupSerial, kind, position, age: 0 });
  }

  private age(delta: number): void {
    for (const p of this.popups) p.age += delta;
    this.popups = this.popups.filter((p) => p.age < POPUP_LIFETIME);
    this.effects.update(delta, this.world, this.reduceMotion);
    this.explosions.update(delta, gravity(this.world.config));
    this.scars.forget(this.sceneTime);
    this.tyreMarks.update(delta);
    if (this.curtain) {
      this.curtain.age += delta;
      if (this.curtain.isDone) this.curtain = null;
    }
    const summary = this.pendingSummary;
    if (summary) {
      this.resultCountdown -= delta;
      if (this.resultCountdown <= 0) {
        this.resultAge = 0;
        this.moneyLanded = false;
        this.prepareShift(!summary.result.detonated, null, { k: 'result', summary });
        this.play(['swoosh'], []);
      }
    }
  }

  // MARK: Render list

  /** How much of the background veils Big Screen's picture, so road and cars stay readable. */
  static readonly backdropVeil = 0.3;

  /**
   * The world through `camera`: city, road, traffic, weather and the map's air; no HUD.
   * `seeThrough`: Big Screen with its picture ready shows it instead of the city.
   */
  private sceneList(camera: Camera, alpha: number, rm: boolean, seeThrough = false): RenderList {
    const world = this.world;
    const career = this.save.career;
    const screen = seeThrough && career.mapSkin === BIG_SCREEN;
    const theme = MapTheme.from(career.mapSkin);
    const list = new RenderList(camera, MapTheme.ground(theme));
    // A device that cannot keep 30 fps leaves out the decoration (`lowDetail`), never the game.
    list.groundGrain = !this.lowDetail;
    if (screen) list.backdrop = GameSession.backdropVeil;
    else CityLayer.add(list, world, theme, rm ? null : this.sceneTime, rm ? null : this.cityPulse, this.scars.isEmpty ? null : this.scars, this.sceneTime, this.playingMode === 'shift' && !this.special ? this.cityRise : null, !this.lowDetail);
    SceneBuilder.addRoad(list, world.layout, world.config);
    CityLayer.addMapSkin(list, Skins.color(career.mapSkin), world);
    MapTheme.addIsland(list, theme, world);
    if (!this.special) CityLayer.addElite(list, Elite.level(career, this.config), world);
    if (!this.special) CityLayer.addHall(list, career.hallBuilt, career.prestige, world);
    CityLayer.addFrame(list, Careers.frame(career), world);
    this.rim.add(list, world, rm);
    WeatherLayer.addCityEvent(list, world);
    const weather = this.weatherFade.mix(world.config.weather, this.sceneTime);
    WeatherLayer.addGround(list, world, weather);
    this.scars.addGround(list, this.sceneTime, rm ? null : this.sceneTime);
    this.tyreMarks.addGround(list, world.layout, world.config);
    SceneBuilder.addLaneArrow(list, world);
    this.explosions.addGround(list);
    this.effects.addGround(list, world, alpha, !rm);
    CityLights.add(list, world, alpha, theme);
    SceneBuilder.addShadows(list, world, alpha);
    SceneBuilder.addVehicles(list, world, alpha, career.carSkins, rm ? null : world.time, rm ? null : world.time, this.lamps);
    SceneBuilder.addTowTrucks(list, world);
    if (world.config.night) NightLayer.add(list, world, alpha, this.lamps, rm ? null : world.time);
    if (this.save.settings.vehicleLabels) SceneBuilder.addLabels(list, world, alpha);
    this.effects.addAir(list);
    this.explosions.addAir(list);
    WeatherLayer.addAir(list, world, this.sceneTime, rm, weather);
    const island = { center: toScreen(camera, v(0, 0)), radius: (world.layout.islandRadius) * camera.scale };
    if (!this.lowDetail) MapTheme.addAir(list, theme, this.sceneTime, rm, island);
    return list;
  }

  /**
   * The photo of a finished shift: the roundabout framed from above for a `size` print (no
   * HUD), and what the print says about it. Null when there is no result on screen.
   */
  photo(size: Vec2): { list: RenderList; card: PhotoCard } | null {
    const s = this.screen;
    if (s.k !== 'result') return null;
    const layout = this.world.layout;
    // The ring and the first stretch of every arm, the queue coming in at the bottom.
    const reach = layout.ringRadius + layout.laneWidth / 2 + 110;
    const scale = Math.min(size.x, size.y) / 2 / reach;
    const camera: Camera = { viewport: size, center: v(0, -reach * 0.12), focus: v(size.x / 2, size.y / 2), scale };
    const list = this.sceneList(camera, Math.min(1, this.accumulator / STEP), this.reduceMotion);
    return { list, card: PhotoCard.of(s.summary, this.save.career.mapSkin) };
  }

  private renderList(viewport: Vec2, delta: number): RenderList {
    const world = this.world;
    const rm = this.reduceMotion;
    const alpha = Math.min(1, this.accumulator / STEP);
    const cam = this.cameraRig.camera(perspectiveOf(this.screen), world.layout, viewport, this.tabInset, delta, rm);
    const shake = add(this.effects.shakeOffset, this.explosions.shakeOffset);
    const camera = {
      ...cam,
      focus: v(cam.focus.x + shake.x + this.pan.pan, cam.focus.y + shake.y),
      scale: cam.scale * (1 - GameSession.lossPullBack * this.lossPull) * (1 + this.explosions.punch) * (1 + (rm ? 0 : GameSession.topTierLean * this.topTier)),
    };
    const career = this.save.career;
    this.lastCamera = camera;
    const list = this.sceneList(camera, alpha, rm, this.backdrop);
    list.shake = shake;
    addRecede(list, this.recede, world.layout);
    this.curtain?.add(list, viewport, rm);
    this.explosions.addFlash(list, viewport);

    const overlayStart = list.items.length;
    const s = this.screen;
    // Where the chrome under the top card ends: a notice hangs below it.
    let underCard = TopBar.frame(viewport.x).maxY;
    if (s.k === 'playing') {
      HUD.addFlowGlow(list, world, this.flowLevel);
      HUD.addChase(list, world, alpha);
      HUD.addTransporter(list, world, alpha);
      HUD.addMilitary(list, world, alpha);
      HUD.addAmbulance(list, world, alpha);
      HUD.addLearner(list, world, alpha);
      const since = world.shift.rushHourSince;
      HUD.add(list, {
        world,
        level: this.playingLevel,
        score: Math.round(this.shownScore),
        money: Math.round(this.shownMoney),
        best: this.currentBest,
        comboPop: rm ? 0 : Ease.clamp01(this.sinceComboTier / GameSession.comboPop),
        race: this.raceDelta === null ? null : { delta: this.raceDelta, pop: rm ? 1 : Ease.clamp01(this.sinceCarSent / 0.35) },
        pops: rm
          ? settledPops()
          : {
              cars: Ease.clamp01(this.sinceCarSent / 0.35),
              rushHour: since === null ? 1 : Ease.clamp01((world.time - since) / 0.5),
              strike: Ease.clamp01(this.sinceStrike / 0.5),
              money: Ease.clamp01(this.sinceMoney / 0.35),
              policeCrash: Ease.clamp01(this.sincePoliceCrash / 0.5),
            },
        flames: Math.round(this.shownFlames),
        flamePop: rm ? 1 : Ease.clamp01(this.sinceFlames / 0.35),
        brief: this.briefings.view,
        reduceMotion: rm,
        textScale: this.textScale,
      });
      this.tutorial?.add(list, world, alpha, this.sceneTime, rm);
      // A trial that counts (Perfects, Tight Fits): how far it is, while it runs.
      const progress = this.special?.k === 'trial' ? trialProgress(this.special.trial, world.score) : null;
      if (world.config.endless || progress) underCard = TopBar.frame(viewport.x).maxY + 31;
      if (progress && this.special?.k === 'trial') {
        HUD.addGoalPill(list, S.trials.progress(this.special.trial, progress.have, progress.need), progress.have >= progress.need, rm ? 1 : Ease.clamp01(this.sinceCarSent / 0.35));
      }
      HUD.addPopups(list, this.popups, rm);
      if (this.countIn > 0 || this.isInterrupted) HUD.addCountIn(list, this.isInterrupted ? GameSession.countInSeconds : this.countIn);
    } else if (s.k === 'result') {
      ResultBanner.add(list, s.summary, this.playingLevel, this.resultBank, this.resultAge, rm);
      this.tutorial?.add(list, world, alpha, this.sceneTime, rm);
      const arriving = ResultBanner.arriving(this.resultAge);
      if (arriving > 0) underCard = this.addReadyBanner(list, null, false, arriving);
    } else if (s.k === 'ready') {
      underCard = this.addReadyBanner(list, this.tutorial && !this.tutorial.isOver ? Tutorial.readyPrompt : this.versusSelected ? S.ready.tapForFriends : S.ready.tapToStart);
      this.tutorial?.add(list, world, alpha, this.sceneTime, rm);
    }
    const inset = this.tabInset;
    // Where a notice would sit: above the settings button; it fades out as the shift starts.
    if (this.modeHint > 0 && (s.k === 'ready' || s.k === 'playing')) ModeHint.add(list, v(viewport.x / 2, viewport.y - inset - 92), this.modeHint, this.sceneTime, rm);
    if (this.isPage('streetBuilder')) StreetBuilderPage.add(list, career, this.config, this.builderPage, rm, inset, this.buildThumb);
    else if (this.isPage('upgrades')) UpgradePage.add(list, career, this.config, this.visibleUpgrades, this.upgradePage, rm, inset, this.buildThumb);
    else if (this.isPage('shop')) ShopPage.add(list, career, this.config, this.today, this.shopPage, rm, inset);
    else if (this.isPage('progress')) ProgressPage.add(list, this.save, this.today, this.progressPage, rm, inset, this.progressScrollRange);
    else if (s.k === 'settings') list.s(rect({ x: viewport.x / 2, y: viewport.y / 2 }, viewport), 'background', 0.55);
    this.transitions.apply(list, s, overlayStart, rm);
    const notice = this.notices.shown;
    if (notice) addNotice(list, notice, { at: this.noticePlace(s, underCard, inset), textScale: this.textScale, reduceMotion: rm });
    return list;
  }

  /**
   * Where the notice goes. On the Game tab it hangs under the top card (and the pill under it),
   * where a thumb tapping the ring never covers it; on the pages it stays above the tab bar.
   */
  private noticePlace(s: Screen, underCard: number, inset: number): NoticePlace {
    if (s.k === 'ready' || s.k === 'result' || s.k === 'playing') return { top: underCard + 10 };
    return { bottom: this.lastViewport.y - inset - 21 };
  }

  /** How much room a notice under the top card takes right now, for the ready screen's intro to make way. */
  private get noticeRoom(): number {
    const notice = this.notices.shown;
    if (!notice) return 0;
    return (noticeHeight(this.textScale) + 10) * Ease.smoothstep(noticePresence(notice.age, notice.duration));
  }

  /** The Build tab's segment thumb: 0 on Upgrades, 1 on the Street Builder, gliding between. */
  private get buildThumb(): number {
    const target = Math.max(0, BUILD_PAGES.indexOf(screenTab(this.screen)));
    const slide = this.buildSlide;
    if (!slide || this.reduceMotion) return target;
    const from = Math.max(0, BUILD_PAGES.indexOf(slide.from));
    return from + (target - from) * Ease.settle(slide.age / BuildLayout.glide);
  }

  get currentBest(): string | null {
    const best = this.playingMode === 'shift' ? this.save.highscore : this.playingMode === 'unlimited' ? this.save.unlimitedBest : this.save.mayhemBest;
    return best > 0 ? Fmt.number(best) : null;
  }

  /** Whether a tab has something waiting, like an iOS badge: the Shop's chests or new items. */
  badge(tab: Tab): { count: number } | 'dot' | null {
    const c = this.save.career;
    if (barTab(tab) === 'progress') return c.museumNew.length > 0 ? 'dot' : null;
    if (barTab(tab) !== 'shop') return null;
    if (c.chests.length > 0) return { count: c.chests.length };
    // A skin a casino round has won stays quiet until the round shows it.
    return this.shopPage.wallet.unseen(c.unseen).length > 0 ? 'dot' : null;
  }

  /** Draws the ready screen; returns where its chrome under the top card ends (`ReadyBanner.add`). */
  private addReadyBanner(list: RenderList, prompt: string | null, drawsCard = true, opacity = 1): number {
    const career = this.save.career;
    const daily = this.dailySelected && !this.versusSelected
      ? {
          event: this.world.config.cityEvent,
          streak: Goals.streak(career, this.today),
          next: Careers.nextStreakMilestone(career),
          splash: this.dailySplash,
          bonus: Goals.streakBonus(career, this.today, this.config) ? this.config.streakBonusPay : null,
          endsIn: streakEndsIn(career, this.today, this.config),
        }
      : null;
    // The next goal in reach: only on a plain career shift, never over a challenge, trial or match.
    const goal = !this.special && !this.versusSelected && this.playingMode === 'shift' && (this.tutorial?.isOver ?? true) ? Goals.next(career, this.today) : null;
    const under = ReadyBanner.add(list, {
      level: this.playingLevel,
      cars: this.world.carsLeft ?? 0,
      highscore: this.currentBest,
      money: Fmt.number(career.money),
      // A trial's goal already names its conditions.
      conditions: this.special?.k === 'trial' || this.versusSelected ? null : S.ready.conditions(this.world.config.weather, this.world.config.cityEvent, this.world.config.night, this.world.config.blackout),
      run: runCard(this.special, this.world.config, this.playingMode, this.versusSelected, career, this.today),
      prestige: this.special ? 0 : career.prestige,
      elite: !this.special && Elite.isOpen(career, this.config),
      playerName: this.versusSelected ? loadPlayerName() : undefined,
      daily,
      mode: this.playingMode,
      versus: this.versusSelected,
      prompt,
      time: this.sinceReady,
      reduceMotion: this.reduceMotion,
      drawsCard,
      opacity,
      goal: goal ? S.goals.next(goal) : null,
      intro: this.versusSelected || (this.tutorial && !this.tutorial.isOver) ? null : this.readyIntro,
      textScale: this.textScale,
      noticeRoom: this.noticeRoom,
    });
    if (this.modeBanner) {
      const top = TopBar.frame(list.camera.viewport.x).maxY + (daily ? 40 : 14);
      ModeBanner.add(list, this.modeBanner.mode, this.modeBanner.age, top, this.reduceMotion);
    }
    return under;
  }

  /** The ready screen's card: what a trial's goal asks for, then the conditions new to this player. */
  private get readyIntro(): ConditionIntro[] {
    const howTo = this.special?.k === 'trial' ? S.trials.howTo(this.special.trial) : null;
    return [...(howTo ? [howTo] : []), ...conditionIntro(this.world.config, this.save.career)];
  }

  /** Screen point of the island centre (for DOM overlays that follow the camera). */
  islandOnScreen(list: RenderList): Vec2 {
    return toScreen(list.camera, v(0, 0));
  }

  /** The settings sheet changed a setting in place: keep it. */
  saveSettings(): void {
    this.persist();
  }

  /** How much larger notices and cards over the scene are drawn (Settings → Larger text). */
  get textScale(): number {
    return this.save.settings.largeText ? 1.2 : 1;
  }

  /** Patch notes newer than the last ones read (Settings → What's new). */
  get notesUnread(): boolean {
    return this.save.notesSeen !== latestNote();
  }

  markNotesRead(): void {
    this.save.notesSeen = latestNote();
    this.persist();
  }

  /** Big Screen got a picture: it goes on, if it was not on already. */
  wearBigScreen(): void {
    const career = this.save.career;
    if (!Careers.owns(career, BIG_SCREEN) || career.mapSkin === BIG_SCREEN) return;
    career.mapSkin = BIG_SCREEN;
    this.persist();
  }

  /** A fresh save (Settings → Reset progress). */
  resetProgress(): void {
    this.save = newSave();
    this.store();
    this.tutorial = new Tutorial();
    this.prepareShift(false);
  }

  /** Progress brought from another device (Cloud sync) replaces this one. */
  importProgress(save: SaveGame, text = S.settings.imported(save.career.level)): void {
    this.save = save;
    this.store();
    this.tutorial = save.tutorialDone ? null : new Tutorial();
    if (this.tutorial) this.save.mode = 'shift';
    this.prepareShift(false);
    this.announce(text);
  }

  /** Newer progress from another device (cloud sync), taken over between shifts. */
  takeCloudSave(save: SaveGame): void {
    this.importProgress(save, S.settings.synced(save.career.level));
    // A copy from a device not opened today still pays today's toll income here.
    this.collectLoginIncome();
  }
}
