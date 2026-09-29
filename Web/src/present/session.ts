import { World, STEP } from '../core/world';
import { baseConfig, gravity, builtArmSlots, type Config, type RoadModule } from '../core/config';
import { type SaveGame, type GameMode, type Hint, Careers, newSave } from '../core/career';
import { Elite } from '../core/elite';
import { Unlocks } from '../core/unlocks';
import type { GameEvent, ShiftResult } from '../core/events';
import type { Upgrade } from '../core/levels';
import { type ChestKind, ALBUM_REWARD, cosmetic, rarityRank } from '../core/loot';
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
import { RenderList, R, Ease, toScreen, rect, text, Metrics, type Camera } from './render';
import { S, Fmt, money as moneyText } from './strings';
import { CrashEffects } from './effects';
import { ExplosionEffects, MapScars, SmokeCurtain } from './explosionsFx';
import { SceneBuilder, VehicleLamps, towYard } from './scene';
import { CityLayer, CityPulse, type CityRise } from './city';
import { MapTheme } from './mapThemes';
import { Skins } from './skins';
import { WeatherLayer } from './weather';
import { NightLayer } from './night';
import { CityLights } from './cityLights';
import { HUD, TopBar, RingSignals, ModeBanner, ModeHint, ReadyBanner, ResultBanner, type Popup, type PopupKind, type ShiftSummary, type RunCard, type ConditionIntro, POPUP_LIFETIME, settledPops } from './hud';
import { Tutorial } from './tutorial';
import { NoticeQueue } from './notices';
import { bookShift } from './booking';
import { MenuKit } from './menukit';
import { type Screen, type Tab, type SwipeMode, SWIPE_MODES, type ScreenAction, type Built, type ProgressSection, TAB_BAR, BUILD_PAGES, barTab, screenTab, showsTabBar, partModule, BuildLayout } from './flow';
import { CameraRig, perspectiveOf, addRecede } from './perspective';
import { TransitionTracker, ModePan } from './transitions';
import { ShopPage, ShopState, shelfOf, type ShopTarget } from './shop';
import { CasinoFlow, type CasinoHost } from './casinoFlow';
import { ProgressPage, ProgressState } from './progress';
import { MuseumPage, type MuseumTarget } from './museum';
import { sightings, museumEntry, shelfEntries, museumId, conditionsOf } from '../core/museum';
import { UpgradePage, UpgradeState } from './upgrades';
import { StreetBuilderPage, BuilderState, sameBuilt } from './builder';
import { Feedback, Music, type MusicMix, type SoundID, type HapticID } from './feedback';
import { Details, type Detail } from './detail';
import { TyreMarks } from './marks';
import { type ChallengeSpec, challengeOf, challengeConfig, encodeChallenge } from '../core/challenge';
import { type Trial, trial as trialById, trialConfig, trialPassed, rematchId } from '../core/trials';

/**
 * A shift played for itself, outside the career: a friend's challenge link or a mastery
 * trial. It always starts from a fresh world with its own seed, so the traffic is the same for
 * everyone; it earns no money or levels (a trial pays its reward once).
 */
export type SpecialRun = { k: 'challenge'; spec: ChallengeSpec } | { k: 'trial'; trial: Trial };

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
  static readonly doubleTapWindow = 0.4;

  readonly config: Config = baseConfig;
  world: World;
  screen: Screen = { k: 'ready' };
  save: SaveGame;
  systemReduceMotion = false;
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
  upgradePage = new UpgradeState();
  shopPage = new ShopState();
  /** The casino's rounds (`casinoFlow.ts`): it reaches the session only through its host. */
  private readonly casinoFlow = new CasinoFlow(this.casinoHost());
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
  playingMode: GameMode = 'shift';
  private shownFlames = 0;
  private sinceFlames = Infinity;
  private lastPartTap = Infinity;
  private lastViewport = v(430, 900);
  /** The camera of the last frame: places sounds left or right. */
  private lastCamera: Camera | null = null;
  private lastInset = 0;
  private lastCardTap: { upgrade: Upgrade; age: number } | null = null;
  private readonly notices = new NoticeQueue();
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
    this.collectLoginIncome();
    this.casinoFlow.resume();
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

  get visibleUpgrades(): readonly Upgrade[] {
    return Careers.availableUpgrades(this.save.career, this.config);
  }

  private persist(): void {
    writeSave(this.save);
    this.onChrome?.();
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
          this.leaveShelf();
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
        this.progressPage.section = action.section === 2 && !Unlocks.isOpen(this.save.career, 'trials', this.config) ? 0 : action.section;
        this.progressPage.sectionSlide = null;
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
        this.buildPart();
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
        this.buy(action.upgrade);
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
        this.showAd();
        break;
      case 'showCasino':
        this.perform({ k: 'showShop', section: 2 });
        if (this.isPage('shop')) this.shopPage.casino.selectGame(action.game);
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
        if (!this.detailOpen) this.tick();
        this.detailOpen = true;
        break;
      case 'wear': {
        const item = cosmetic(action.id);
        if (!Careers.wear(career, action.id) && item?.kind === 'carSkin' && Careers.owns(career, action.id)) this.showNotice(S.shop.skinsFull(5));
        this.persist();
        break;
      }
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
    if (t) this.startSpecial({ k: 'trial', trial: t });
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
    const done = Careers.prestige(career, this.config);
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
    return this.shareable ? `${origin}#challenge=${encodeChallenge(this.shareable)}` : null;
  }

  /** What the result says in a challenge or trial, and pays (a trial's reward, once). */
  private finishSpecial(run: SpecialRun, result: ShiftResult): void {
    const career = this.save.career;
    const bankBefore = career.money;
    let summary: NonNullable<ShiftSummary['run']>;
    if (run.k === 'challenge') {
      const spec = run.spec;
      const mayhem = spec.mode === 'mayhem';
      const mine = mayhem ? result.flames : result.score;
      const beaten = mine > spec.target;
      summary = {
        caption: beaten ? S.run.beaten : S.run.missed,
        color: beaten ? 'accent' : 'muted',
        line: beaten ? S.run.ahead(Fmt.number(mine - spec.target)) : S.run.short(Fmt.number(spec.target - mine)),
        lineColor: beaten ? 'accent' : 'muted',
        right: [S.run.toBeat, Fmt.number(spec.target)],
      };
      // Sharing now sends the same shift back with your own score to beat.
      this.shareable = { ...spec, target: mine };
    } else {
      const t = run.trial;
      const passed = trialPassed(t, result);
      // The Weekly Elite pays once a week (with a Premium Chest); every other trial once ever.
      const weekly = t.id === 'weekly';
      const first = passed && (weekly ? !Careers.isWeeklyDone(career, weekNumber(this.today)) : !career.trialsDone.includes(t.id));
      if (first && weekly) {
        const pay = Careers.completeWeekly(career, weekNumber(this.today), this.config);
        if (pay !== null) this.announce(S.weekly.done(Fmt.number(pay)));
      } else if (first) {
        career.trialsDone.push(t.id);
        career.money += t.reward;
        const titles = Careers.recordTitles(career, this.config);
        if (titles.length > 0) this.announce(S.titles.earned(titles));
      }
      summary = {
        caption: passed ? S.run.passed : S.run.failed,
        color: passed ? 'accent' : 'destructive',
        line: passed && !first ? S.run.passedBefore : S.trials.goal(t),
        lineColor: passed ? 'accent' : 'muted',
        right: [S.run.trial, S.trials.level(t.level)],
      };
      this.shareable = null;
    }
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

  private buy(upgrade: Upgrade): void {
    const career = this.save.career;
    this.upgradePage.selected = upgrade;
    const price = Careers.priceOf(career, upgrade, this.config);
    if (price === null) return;
    const money = career.money;
    if (!Careers.buy(career, upgrade, this.config)) {
      this.upgradePage.denied = { upgrade, age: 0 };
      this.play(['denied'], []);
      this.showNotice(S.notice.notEnoughMoney(Fmt.number(price)));
      return;
    }
    const steps = Careers.steps(career, upgrade);
    this.upgradePage.purchase = { upgrade, steps: steps - 1, age: 0 };
    this.upgradePage.moneyBefore = money;
    this.persist();
    this.refreshWaitingShift();
    this.play(['purchase'], ['comboUp']);
  }

  private buildPart(): void {
    const b = this.builderPage;
    const pending = b.pending;
    if (!pending) return;
    const career = this.save.career;
    const price = StreetBuilderPage.price(pending.part, career, this.config);
    if (price === null) return;
    const money = career.money;
    const module = partModule(pending.part);
    const ok = module ? Careers.buildModule(career, module, pending.slot, this.config) : Careers.buildArm(career, pending.slot, this.config);
    if (!ok) {
      b.denied = 0.001;
      this.play(['denied'], []);
      this.showNotice(S.notice.notEnoughMoney(Fmt.number(price)));
      return;
    }
    b.pending = null;
    b.removing = 0;
    this.detailOpen = false;
    b.selected = null;
    if (module) b.builtModule = { slot: pending.slot, age: 0 };
    else b.built = { slot: pending.slot, age: 0 };
    b.moneyBefore = money;
    this.persist();
    this.refreshWaitingShift();
    this.play(['build'], ['comboUp']);
    this.showNotice(module ? S.notice.placed(S.builder.name(pending.part)) : S.notice.built(S.builder.name(pending.part), career.armSlots.length));
  }

  /** A press on the Street Builder: pick up a part, build or drop the pending one, mark or tear down. */
  private builderPress(point: Vec2): void {
    const b = this.builderPage;
    const career = this.save.career;
    const part = StreetBuilderPage.cardAt(point, this.lastViewport, this.tabInset);
    if (part) {
      this.perform({ k: 'pickUpPart', part });
      b.dragging = { part, at: point };
      this.pressAt = point;
      return;
    }
    const map = StreetBuilderPage.map(this.lastViewport, this.tabInset);
    const pending = b.pending;
    if (pending) {
      const hit = partModule(pending.part)
        ? StreetBuilderPage.moduleSlotAt(point, this.config.moduleSlotCount, map)
        : StreetBuilderPage.slotAt(point, this.config.armSlotCount, map);
      if (hit === pending.slot) {
        if (this.lastPartTap <= GameSession.doubleTapWindow) {
          this.lastPartTap = Infinity;
          this.perform({ k: 'buildPart' });
        } else {
          this.lastPartTap = 0;
          b.removing = 0.001;
        }
        return;
      }
    }
    const built = StreetBuilderPage.builtPartAt(point, career, this.config, map);
    if (!built) {
      b.marked = null;
      return;
    }
    if (b.marked && sameBuilt(b.marked.part, built)) {
      this.tearDown(built);
      return;
    }
    if (built.k === 'arm' && !Careers.canRemoveArm(career, built.slot)) {
      b.denied = 0.001;
      this.play(['denied'], []);
      this.showNotice(S.builder.keepsArms(4));
      return;
    }
    b.marked = { part: built, age: 0 };
    this.play(['uiTick'], []);
    this.showNotice(S.builder.tapAgainToRemove);
  }

  private tearDown(part: Built): void {
    const b = this.builderPage;
    const career = this.save.career;
    b.marked = null;
    let name: string;
    if (part.k === 'arm') {
      if (!Careers.removeArm(career, part.slot)) return;
      b.tornDown = { part, module: null, age: 0 };
      name = S.builder.name('arm');
    } else {
      const module: RoadModule | undefined = career.modules[part.slot];
      if (!module) return;
      Careers.removeModule(career, part.slot);
      b.tornDown = { part, module, age: 0 };
      name = S.builder.name(module);
    }
    this.persist();
    this.refreshWaitingShift();
    this.play(['swoosh'], ['comboUp']);
    this.showNotice(S.notice.removed(name));
  }

  /** The tab bar's height where it shows. */
  private get tabInset(): number {
    return showsTabBar(this.screen) ? this.lastInset : 0;
  }

  private showAd(): void {
    if (Careers.adChestsLeft(this.save.career, this.today, this.config) <= 0 || this.shopPage.ad !== null) {
      this.play(['denied'], []);
      this.showNotice(S.shop.noAdsLeft);
      return;
    }
    this.shopPage.ad = 0;
  }

  private adWatched(): void {
    if (!Careers.rewardAd(this.save.career, this.today, this.config)) return;
    this.persist();
    this.shopPage.ad = null;
    this.play(['purchase'], ['paid']);
    this.shopPage.selectedChest = 'standard';
    this.showNotice(S.shop.adReward);
  }

  // MARK: Casino (present/casinoFlow.ts)

  private casinoHost(): CasinoHost {
    // Getters: the casino always sees today's page, day and settings.
    const session = this;
    return {
      get casino() {
        return session.shopPage.casino;
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

  private announceAlbums(): void {
    const albums = this.completeAlbums();
    if (albums.length === 0) return;
    this.persist();
    this.announce(...albums);
  }

  private playPitched(sound: SoundID, pitch: number): void {
    if (this.output && this.save.settings.sound) this.output.sound(sound, pitch, 0);
  }

  /** The shelf on screen is being left: what was new on it has been seen. */
  private leaveShelf(): void {
    if (!this.isPage('shop') || this.shopPage.section !== 1) return;
    const career = this.save.career;
    const shown = ShopPage.itemCells(ShopPage.layout(this.lastViewport, this.tabInset), this.shopPage.shelf)
      .map(([item]) => item.id)
      .filter((id) => career.unseen.includes(id));
    if (shown.length === 0) return;
    Careers.markSeen(career, shown);
    this.persist();
  }

  private tapShop(target: ShopTarget): void {
    const s = this.shopPage;
    const career = this.save.career;
    if (target.k !== 'dismiss' && !this.reduceMotion) s.pressed = { target, age: 0 };
    switch (target.k) {
      case 'section':
        if (target.section === 2 && !Unlocks.isOpen(career, 'casino', this.config)) {
          this.showNotice(S.unlocks.opensAt(S.shop.section(2), Unlocks.level('casino', this.config)));
          this.play(['denied'], []);
          break;
        }
        if (s.section !== target.section) {
          this.tick();
          this.closeDetail();
        }
        if (target.section !== 1) this.leaveShelf();
        if (target.section !== 2) this.casinoFlow.leave();
        s.select(target.section);
        break;
      case 'shelf':
        if (s.shelf !== target.shelf) {
          this.tick();
          this.leaveShelf();
          this.closeDetail();
        }
        s.selectShelf(target.shelf);
        break;
      case 'chest':
        if (this.detailOpen && s.selectedChest === target.kind && Careers.count(career, target.kind) > 0) this.tapShop({ k: 'open', kind: target.kind });
        else if (s.selectedChest !== target.kind) this.tick();
        s.selectedChest = target.kind;
        this.detailOpen = true;
        break;
      case 'open': {
        const index = career.chests.indexOf(target.kind as ChestKind);
        if (index >= 0) this.perform({ k: 'openChest', index });
        break;
      }
      case 'buy':
        this.perform({ k: 'buyChest', kind: target.kind });
        break;
      case 'watchAd':
        this.perform({ k: 'watchAd' });
        break;
      case 'item':
        if (career.unseen.includes(target.id)) {
          Careers.markSeen(career, [target.id]);
          this.persist();
        }
        if (this.detailOpen && s.selectedItem === target.id && Careers.owns(career, target.id)) this.perform({ k: 'wear', id: target.id });
        else if (s.selectedItem !== target.id) this.tick();
        s.selectedItem = target.id;
        this.detailOpen = true;
        break;
      case 'wear':
        this.perform({ k: 'wear', id: target.id });
        break;
      case 'casino':
        this.casinoFlow.tap(target.t);
        break;
      case 'dismiss': {
        // A tap moves the opening on a step (open the chest, stop the reel, show the prize);
        // the prize itself stays at least `closeAfter` before a tap closes it.
        const o = s.opening;
        if (!o) break;
        const stage = ShopPage.stages(o.opening, o.reel);
        if (o.age < stage.burst) o.age = stage.burst - 0.001;
        else if (o.age < stage.landed) o.age = stage.landed - 0.001;
        else if (o.age < stage.reveal) o.age = stage.reveal - 0.001;
        else if (o.age - stage.reveal >= ShopPage.closeAfter) s.opening = null;
        break;
      }
    }
  }

  private tapUpgrade(upgrade: Upgrade): void {
    const last = this.lastCardTap;
    if (last && last.upgrade === upgrade && last.age <= GameSession.doubleTapWindow) {
      this.lastCardTap = null;
      this.perform({ k: 'buy', upgrade });
    } else {
      this.lastCardTap = { upgrade, age: 0 };
      this.perform({ k: 'selectUpgrade', upgrade });
    }
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
      const after = this.shopPage.opening?.age ?? null;
      const opening = this.shopPage.opening;
      if (opening && before !== null && after !== null) this.reelCues(opening, before, after);
      if (this.shopPage.ad !== null && this.shopPage.ad >= ShopPage.adDuration) this.adWatched();
      for (const cue of this.shopPage.casino.advance(realDelta)) this.casinoFlow.cue(cue);
      this.tension = this.shopPage.section === 2 ? this.shopPage.casino.tension : 0;
    } else {
      this.casinoFlow.leave();
      this.tension = 0;
      this.shopPage = new ShopState();
    }
    if (this.isPage('progress')) this.progressPage.advance(realDelta);
    else if (this.progressPage.age !== 0 || this.progressPage.section !== 0) this.progressPage = new ProgressState();
    if (this.buildSlide) {
      this.buildSlide.age += realDelta;
      if (this.buildSlide.age >= BuildLayout.glide) this.buildSlide = null;
    }
    this.followModePan(realDelta);
    if (this.modeBanner) this.modeBanner = this.modeBanner.age + realDelta < ModeBanner.duration ? { mode: this.modeBanner.mode, age: this.modeBanner.age + realDelta } : null;
    if (this.isPage('streetBuilder')) {
      this.builderPage.advance(realDelta);
      this.lastPartTap += realDelta;
      if (this.builderPage.removing > StreetBuilderPage.removeDuration) this.perform({ k: 'removePart' });
    } else {
      this.builderPage = new BuilderState();
      this.lastPartTap = Infinity;
    }
    if (this.lastCardTap) {
      this.lastCardTap.age += realDelta;
      if (this.lastCardTap.age > GameSession.doubleTapWindow) this.lastCardTap = null;
    }
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
            if (this.isPage('shop') && this.shopPage.section === 2) this.casinoFlow.key(a.ago ?? 0);
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
          if (this.isPage('shop') && this.shopPage.opening) this.tapShop({ k: 'dismiss' });
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
            if (upgrade) this.tapUpgrade(upgrade);
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
      const target = ShopPage.targetAt(point, this.lastViewport, inset, this.save.career, this.shopPage);
      if (target) this.tapShop(target);
      return;
    }
    if (this.isPage('streetBuilder')) {
      this.builderPress(point);
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

  /** A tap in the Museum: a shelf, or an entry for the sheet (a second tap starts its rematch). */
  private tapMuseum(target: MuseumTarget): void {
    const m = this.progressPage.museum;
    const career = this.save.career;
    if (target.k === 'shelf') {
      if (m.shelf !== target.shelf) {
        this.tick();
        this.leaveMuseumShelf();
        this.closeDetail();
      }
      m.selectShelf(target.shelf);
      return;
    }
    if (career.museumNew.includes(target.id)) {
      Careers.markMuseumSeen(career, [target.id]);
      this.persist();
    }
    const entry = museumEntry(target.id);
    if (this.detailOpen && m.selected === target.id && entry?.k === 'boss' && career.bossesBeaten.includes(entry.kind)) {
      this.startTrial(rematchId(entry.kind));
      return;
    }
    if (m.selected !== target.id) this.tick();
    m.selected = target.id;
    this.detailOpen = true;
  }

  /** The Museum shelf on screen is being left: what was new on it has been seen. */
  private leaveMuseumShelf(): void {
    if (!this.isPage('progress') || this.progressPage.section !== 3) return;
    const career = this.save.career;
    const shown = shelfEntries(this.progressPage.museum.shelf)
      .map(museumId)
      .filter((id) => career.museumNew.includes(id));
    if (shown.length === 0) return;
    Careers.markMuseumSeen(career, shown);
    this.persist();
  }

  /**
   * Special vehicles and bosses on the road for the first time go on show in the Museum, and a
   * notice says once what they are and what to do (conditions had the ready screen for that).
   */
  private noteSightings(): void {
    // The tutorial teaches the first shift itself; what it meets there is met again right after.
    if (this.tutorial && !this.tutorial.isOver) return;
    const found = Careers.discover(this.save.career, sightings(this.world));
    if (found.length === 0) return;
    this.museumFound.push(...found);
    this.persist();
    const met = found.map(museumEntry).filter((e) => e !== null && (e.k === 'special' || e.k === 'boss'));
    if (met.length > 0 && !this.versusSelected) this.announce(...met.map((e) => S.intro.meet(e!)));
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
        return Details.casino(s.casino.game, career, this.config);
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
        const selected = this.progressPage.museum.selected;
        return this.progressPage.section === 3 && selected ? Details.museum(selected, career, this.config) : null;
      }
      default:
        return null;
    }
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
      const section: ProgressSection | null = ProgressPage.sectionAt(point, this.lastViewport, this.tabInset);
      if (section === 2 && !Unlocks.isOpen(this.save.career, 'trials', this.config)) {
        this.showNotice(S.unlocks.opensAt(S.progress.section(2), Unlocks.level('trials', this.config)));
        this.play(['denied'], []);
        return true;
      }
      if (section !== null) {
        if (this.progressPage.section !== section) {
          this.tick();
          this.leaveMuseumShelf();
          this.closeDetail();
        }
        this.progressPage.select(section);
        return true;
      }
      // A trial: it waits, ready to play, on the Game tab.
      const trial = this.progressPage.section === 2 ? ProgressPage.trialAt(point, this.lastViewport, this.tabInset) : null;
      if (trial) this.startTrial(trial);
      const open = this.progressPage.section;
      const vp = this.lastViewport;
      const career = this.save.career;
      if (open === 0 && ProgressPage.eliteAt(point, vp, this.tabInset, career)) this.perform({ k: 'showElite' });
      if (open === 1 && ProgressPage.weeklyAt(point, vp, this.tabInset)) this.startSpecial({ k: 'trial', trial: weeklyTrial(weekNumber(this.today)) });
      const museum = open === 3 ? ProgressPage.museumAt(point, vp, this.tabInset, this.progressPage) : null;
      if (museum) this.tapMuseum(museum);
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
          if (e.critical) {
            this.addPopup({ k: 'critical', n: e.points }, e.position);
            this.rim.signal('wave', 'coin');
            this.sinceHitStop = 0;
          } else if (e.rating !== 'clean') this.addPopup({ k: e.rating } as PopupKind, e.position);
          if (TyreMarks.leavesMark(e.rating)) this.tyreMarks.add();
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
          this.addPopup({ k: 'ambulance' }, world.layout.stopPose(e.arm).position);
          this.rim.signal('sweep', 'lightBlue');
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
        case 'explosion':
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
    const theme = MapTheme.from(career.mapSkin);
    this.lastCamera = camera;
    const list = new RenderList(camera, MapTheme.ground(theme));
    list.groundGrain = true;
    CityLayer.add(list, world, theme, rm ? null : this.sceneTime, rm ? null : this.cityPulse, this.scars.isEmpty ? null : this.scars, this.sceneTime, this.playingMode === 'shift' && !this.special ? this.cityRise : null);
    SceneBuilder.addRoad(list, world.layout, world.config);
    CityLayer.addMapSkin(list, Skins.color(career.mapSkin), world);
    MapTheme.addIsland(list, theme, world);
    if (!this.special) CityLayer.addElite(list, Elite.level(career, this.config), world);
    CityLayer.addFrame(list, Careers.frame(career), world);
    this.rim.add(list, world, rm);
    WeatherLayer.addCityEvent(list, world);
    WeatherLayer.addGround(list, world);
    this.scars.addGround(list, this.sceneTime, rm ? null : this.sceneTime);
    this.tyreMarks.addGround(list, world.layout, world.config);
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
    WeatherLayer.addAir(list, world, world.time, rm);
    MapTheme.addAir(list, theme, this.sceneTime, rm);
    addRecede(list, this.recede, world.layout);
    this.curtain?.add(list, viewport, rm);
    this.explosions.addFlash(list, viewport);

    const overlayStart = list.items.length;
    const s = this.screen;
    if (s.k === 'playing') {
      HUD.addFlowGlow(list, world, this.flowLevel);
      HUD.addChase(list, world, alpha);
      HUD.addTransporter(list, world, alpha);
      HUD.addMilitary(list, world, alpha);
      HUD.addAmbulance(list, world, alpha);
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
      });
      this.tutorial?.add(list, world, alpha, this.sceneTime, rm);
      HUD.addPopups(list, this.popups, rm);
      if (this.countIn > 0 || this.isInterrupted) HUD.addCountIn(list, this.isInterrupted ? GameSession.countInSeconds : this.countIn);
    } else if (s.k === 'result') {
      ResultBanner.add(list, s.summary, this.playingLevel, this.resultBank, this.resultAge, rm);
      this.tutorial?.add(list, world, alpha, this.sceneTime, rm);
      const arriving = ResultBanner.arriving(this.resultAge);
      if (arriving > 0) this.addReadyBanner(list, null, false, arriving);
    } else if (s.k === 'ready') {
      this.addReadyBanner(list, this.tutorial && !this.tutorial.isOver ? Tutorial.readyPrompt : this.versusSelected ? S.ready.tapForFriends : S.ready.tapToStart);
      this.tutorial?.add(list, world, alpha, this.sceneTime, rm);
    }
    const inset = this.tabInset;
    // Where a notice would sit: above the settings button; it fades out as the shift starts.
    if (this.modeHint > 0 && (s.k === 'ready' || s.k === 'playing')) ModeHint.add(list, v(viewport.x / 2, viewport.y - inset - 92), this.modeHint, this.sceneTime, rm);
    if (this.isPage('streetBuilder')) StreetBuilderPage.add(list, career, this.config, this.builderPage, rm, inset, this.buildThumb);
    else if (this.isPage('upgrades')) UpgradePage.add(list, career, this.config, this.visibleUpgrades, this.upgradePage, rm, inset, this.buildThumb);
    else if (this.isPage('shop')) ShopPage.add(list, career, this.config, this.today, this.shopPage, rm, inset);
    else if (this.isPage('progress')) ProgressPage.add(list, this.save, this.today, this.progressPage, rm, inset);
    else if (s.k === 'settings') list.s(rect({ x: viewport.x / 2, y: viewport.y / 2 }, viewport), 'background', 0.55);
    this.transitions.apply(list, s, overlayStart, rm);
    const notice = this.notices.shown;
    if (notice) this.addNotice(list, notice.text, notice.age, notice.duration, inset);
    return list;
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
    return this.shopPage.casino.wallet.unseen(c.unseen).length > 0 ? 'dot' : null;
  }

  /** How the waiting screen names the challenge or trial being played. */
  private get runCard(): RunCard | null {
    const r = this.special;
    const rule = this.world.config.legendary;
    // A Legendary Shift in the career: its rule and its Premium Chest on the waiting card.
    if (!r && rule && this.playingMode === 'shift' && !this.versusSelected) {
      return { caption: S.legendary.caption, color: 'coin', badge: S.legendary.name(rule), line: S.legendary.line(rule), right: [S.legendary.reward, S.legendary.chest] };
    }
    if (!r) return null;
    if (r.k === 'challenge') return { caption: S.run.challenge, color: 'accent', badge: S.run.fromFriend, line: null, right: [S.run.toBeat, Fmt.number(r.spec.target)] };
    const weekly = r.trial.id === 'weekly';
    const done = weekly ? Careers.isWeeklyDone(this.save.career, weekNumber(this.today)) : this.save.career.trialsDone.includes(r.trial.id);
    return {
      caption: weekly ? S.weekly.caption : S.run.trial,
      color: weekly ? 'coin' : 'hazard',
      badge: S.trials.name(r.trial.id),
      line: S.trials.goal(r.trial),
      right: done ? [S.trials.passed, '✓'] : [S.run.rewardCaption, moneyText(Fmt.number(r.trial.reward))],
    };
  }

  private addReadyBanner(list: RenderList, prompt: string | null, drawsCard = true, opacity = 1): void {
    const career = this.save.career;
    const daily = this.dailySelected && !this.versusSelected
      ? {
          event: this.world.config.cityEvent,
          streak: Goals.streak(career, this.today),
          next: Careers.nextStreakMilestone(career),
          splash: this.dailySplash,
          bonus: Goals.streakBonus(career, this.today, this.config) ? this.config.streakBonusPay : null,
          endsIn: this.streakEndsIn,
        }
      : null;
    // The next goal in reach: only on a plain career shift, never over a challenge, trial or match.
    const goal = !this.special && !this.versusSelected && this.playingMode === 'shift' && (this.tutorial?.isOver ?? true) ? Goals.next(career, this.today) : null;
    ReadyBanner.add(list, {
      level: this.playingLevel,
      cars: this.world.carsLeft ?? 0,
      highscore: this.currentBest,
      money: Fmt.number(career.money),
      // A trial's goal already names its conditions.
      conditions: this.special?.k === 'trial' || this.versusSelected ? null : S.ready.conditions(this.world.config.weather, this.world.config.cityEvent, this.world.config.night, this.world.config.blackout),
      run: this.runCard,
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
      intro: this.versusSelected || (this.tutorial && !this.tutorial.isOver) ? null : this.conditionIntro,
      textScale: this.textScale,
    });
    if (this.modeBanner) {
      const top = TopBar.frame(list.camera.viewport.x).maxY + (daily ? 40 : 14);
      ModeBanner.add(list, this.modeBanner.mode, this.modeBanner.age, top, this.reduceMotion);
    }
  }

  /**
   * The waiting shift's conditions this player has never played in. They go into the Museum
   * when the shift starts (`sightings`), so each is explained once.
   */
  private get conditionIntro(): ConditionIntro[] {
    const c = this.world.config;
    const seen = this.save.career.museumSeen;
    return conditionsOf(c)
      .filter((e) => !seen.includes(museumId(e)))
      .map((e) => ({ title: S.intro.title(e), text: S.intro.text(e, c), short: S.intro.short(e) }));
  }

  /** Hours until midnight while yesterday's streak still waits for today's Daily Shift; else null. */
  private get streakEndsIn(): number | null {
    if (!Goals.streakAtRisk(this.save.career, this.today)) return null;
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const hours = (midnight.getTime() - now.getTime()) / 3600000;
    return hours <= this.config.streakWarningHours ? hours : null;
  }

  private addNotice(list: RenderList, textValue: string, age: number, duration: number, bottomInset: number): void {
    const vp = list.camera.viewport;
    const opacity = Ease.outCubic(age / 0.2) * (1 - Ease.clamp01((age - (duration - 0.5)) / 0.5));
    const rise = this.reduceMotion ? 0 : (1 - Ease.settle(age / 0.4)) * 18;
    // On the Game tab the settings button sits bottom left, during a shift the dispatch button
    // bottom right (`ui/shell.css`): the notice keeps above them.
    const lift = this.screen.k === 'ready' || this.screen.k === 'result' ? 56 : this.screen.k === 'playing' ? 72 : 0;
    // Larger text (Settings) makes the pill a step bigger, and lifts it by what it grew.
    const scale = this.textScale;
    const height = 30 * scale;
    const center = v(vp.x / 2, vp.y - bottomInset - 36 - lift - (height - 30) / 2 + rise);
    const size = Metrics.noticeSize * scale;
    const maxWidth = vp.x - 24;
    let fontSize = size;
    const natural = textWidthOf(textValue, size);
    if (natural + 32 > maxWidth) fontSize = Math.max(10 * scale, (size * (maxWidth - 32)) / natural);
    const width = Math.min(maxWidth, textWidthOf(textValue, fontSize) + 32);
    MenuKit.chromePill(list, center, v(width, height), opacity);
    list.s(text(textValue, center, fontSize, 'center'), 'primary', opacity);
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

  /** A fresh save (Settings → Reset progress). */
  resetProgress(): void {
    this.save = newSave();
    writeSave(this.save);
    this.tutorial = new Tutorial();
    this.prepareShift(false);
  }

  /** Progress brought from another device (Settings → Import progress) replaces this one. */
  importProgress(save: SaveGame): void {
    this.save = save;
    writeSave(this.save);
    this.tutorial = save.tutorialDone ? null : new Tutorial();
    if (this.tutorial) this.save.mode = 'shift';
    this.prepareShift(false);
    this.announce(S.settings.imported(save.career.level));
  }
}

import { textWidth as textWidthOf } from './icons';
