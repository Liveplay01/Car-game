import { World, STEP } from '../core/world';
import { baseConfig, gravity, builtArmSlots, weatherSeverity, INVITE_REMINDER_LEVEL, type Config } from '../core/config';
import { type SaveGame, type GameMode, type Hint, Careers, newSave } from '../core/career';
import { Elite } from '../core/elite';
import { SeasonPass } from '../core/seasonPass';
import { Unlocks } from '../core/unlocks';
import type { GameEvent, ShiftResult } from '../core/events';
import type { Upgrade } from '../core/levels';
import { ALBUM_REWARD, BIG_SCREEN, CHEST_KINDS, cosmetic, rarityRank, tapPower, strongTaps, type ChestKind } from '../core/loot';
import { dailySeed, dailyEvent, dayNumber } from '../core/daily';
import { weekNumber, weeklyTrial } from '../core/weekly';
import { Goals } from '../core/goals';
import { noteTap } from '../core/timing';
import { latestNote } from './patchNotes';
import { ChestReel } from './chestReel';
import { type Vec2, v, add, clamp } from '../core/vec2';
import { loadSave, saveTrust, writeSave } from '../storage/save';
import { loadPlayerName } from '../storage/profile';
import { leaderboardEnabled, syncScores, type Records } from '../net/leaderboard';
import type { Reward } from '../net/rewards';
import { cloudChanged, cloudEnabled, cloudLinked } from '../net/cloud';
import { RenderList, R, Ease, toScreen, rect, type Camera, type Rect } from './render';
import type { ColorToken } from './theme';
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
import { HUD, TopBar, RingSignals, ModeMessage, ReadyBanner, type TopMessage, ResultBanner, type Popup, type PopupKind, type ShiftSummary, type ConditionIntro, POPUP_LIFETIME, settledPops } from './hud';
import { inPortal } from '../storage/device';
import { Tutorial } from './tutorial';
import { NoticeQueue } from './notices';
import { bookShift } from './booking';
import { type Screen, type Tab, type SwipeMode, SWIPE_MODES, type ScreenAction, type ProgressSection, PROGRESS, TAB_BAR, BUILD_PAGES, barTab, screenTab, showsTabBar, BuildLayout } from './flow';
import { CameraRig, perspectiveOf, addRecede } from './perspective';
import { CameraFx, CameraFxTuning, tensionOf, zoomAbout } from './cameraFx';
import { PhotoCard } from './photo';
import { TransitionTracker, ModePan } from './transitions';
import { ShopPage, ShopState, shelfOf } from './shop';
import type { CasinoFlow, CasinoHost } from './casinoFlow';
import { casinoKit, loadCasino } from './casinoLoader';
import { Casino } from '../core/casino';
import { BuildFlow } from './buildFlow';
import { ShopFlow } from './shopFlow';
import { AdFlow, type AdOffer } from './adFlow';
import type { PageHost } from './pageHost';
import { type SpecialRun, settleSpecial, runCard, advanceRush, newRush } from './specialRuns';
import { markPassed, markReward } from '../core/tiers';
import { forHeat, heatPay } from '../core/heat';
import { conditionChips, ConditionChips, streakEndsIn, addNotice, noticeHeight, noticePresence, type NoticePlace } from './readyScreen';
import { Briefings, briefOf } from './briefing';

export type { SpecialRun } from './specialRuns';
import { ProgressPage, ProgressState, type ProgressTarget } from './progress';
import { MuseumPage } from './museum';
import { sightings, museumEntry, museumId, conditionsOf, type MuseumEntry } from '../core/museum';
import { UpgradePage, UpgradeState } from './upgrades';
import { StreetBuilderPage, BuilderState } from './builder';
import { Feedback, Music, Sky, type MusicMix, type WeatherSound, type SoundID, type HapticID } from './feedback';
import { Details, type Detail } from './detail';
import { TyreMarks } from './marks';
import { type ChallengeSpec, challengeOf, challengeConfig, encodeChallenge } from '../core/challenge';
import { forSeason } from '../core/seasons';
import { mutatorOf } from '../core/mutators';
import { Achievements } from '../core/achievements';
import { tourOn, tourTrial, tourStopOf, tourOpen, TOUR_LEVEL } from '../core/tours';
import { seasonOf } from '../core/loot';
import { TRIALS, ASCENSIONS, LANDMARKS, trial as trialById, trialConfig, trialOpen, trialProgress, rematchId, rushOpen } from '../core/trials';

/** What the platform reports; key and touch mapping stays in `main.ts`. */
export type InputAction =
  | { k: 'tap'; ago?: number }
  | { k: 'confirm' }
  | { k: 'back' }
  | { k: 'restart' }
  | { k: 'dispatch' }
  /** Chill has no end of its own: the player ends the drive. */
  | { k: 'finishChill' }
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
/**
 * How a rewarded ad went: only `watched` pays (`dismissed`: closed before the end). `disabled`: the
 * portal shows no ads yet, so the game's own placeholder plays instead.
 */
export type RewardedOutcome = 'watched' | 'dismissed' | 'cooldown' | 'blocked' | 'unavailable' | 'disabled';

export interface SessionOutput {
  /** `pan`: -1 (left) … 1 (right), where on screen the sound happens. */
  sound(id: SoundID, pitch: number, pan: number): void;
  haptic(id: HapticID, softness: number): void;
  /** A big moment (a boss busted, a Legendary Shift, a new Unlimited or Mayhem record, a Prestige). */
  celebrate?(): void;
  /** Plays a rewarded ad (the portal's, or Google's); false where there is none (the game's own placeholder plays). */
  rewardedAd?(done: (outcome: RewardedOutcome) => void): boolean;
  /** An ad is ready to play, so its offers may show. Without it (the placeholder) they always do. */
  adReady?(): boolean;
  /** The ad offers beyond the free chest (a free upgrade step, the Skin Upgrade's boost): not on a portal. Default: on. */
  adOffers?: boolean;
  /** The device can vibrate. Without it (iPhones) the camera's punch on the best merges is stronger. */
  feelsHaptics?: boolean;
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
  /** A hit-stop: the world holds for a blink on a Critical Merge and on reaching the top multiplier, a shorter one on a Tight Fit. */
  private sinceHitStop = Infinity;
  private hitStopFor = 0.06;
  /** The camera's punch on the best merges: how long ago, how far it leans in (a share of the scale) and towards which car. */
  private sincePunch = Infinity;
  private punchSize = 0;
  private punchAt = v(0, 0);
  /** Tension, relief and the leans towards a crash, a takedown or a last car that only just fits. */
  private cameraFx = new CameraFx();
  /** Where the player's last crash happened: the camera leans towards it if it ends the shift. */
  private lastCrashAt = v(0, 0);
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
  private sinceMark = Infinity;
  private markCars = 0;
  private topMark = 0;
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
  /** Every rewarded ad: the free chest, a free upgrade step, the Skin Upgrade's boost (`adFlow.ts`). */
  private readonly adFlow = new AdFlow(this.pageHost());
  progressPage = new ProgressState();
  /** Museum entries first met during this shift, for the line on its result. */
  private museumFound: string[] = [];
  builderPage = new BuilderState();
  buildPage: Tab = 'upgrades';
  private buildSlide: { from: Tab; age: number } | null = null;
  private pan = new ModePan();
  private readonly modeMessage = new ModeMessage();
  /** The waiting shift each mode was left on: swiping back finds the same sky and city, until that shift is played. */
  private readonly parked = new Map<GameMode, number>();
  /** The camera's kick as the mode changes: how long ago, and which way the swipe went. */
  private sinceModeKick = Infinity;
  /** Seconds since the last swipe to another mode: the swipe hint waits for a quiet screen after one. */
  private sinceModeSwipe = Infinity;
  private modeKickDir = 1;
  /** Houses the career's city had at the last look, and what rises since (`CityLayer.add`). */
  private cityCount: number | null = null;
  private cityRise: CityRise | null = null;
  /** The swipe hint after Level 5: 0 hidden, 1 shown, fading between. */
  /** The swipe hint on the top card (0–1): after `hintIdle` seconds on the waiting screen (`hintIdleKnown` for someone who has swiped before), shown `hintShown` seconds in every `hintEvery`. */
  private modeHint = 0;
  private static readonly hintIdle = 3.5;
  private static readonly hintIdleKnown = 7;
  private static readonly hintShown = 6;
  private static readonly hintEvery = 26;
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
  /** The sky as heard: rain while the scene is on screen, and a strike for each flash of lightning. */
  weatherSound: WeatherSound = { rain: 0, strikes: 0 };
  private flash = { period: 0, index: 0 };
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
  /** A funnel step for the shell's analytics: the tutorial done, a shift played. */
  onStep: ((step: string, data?: Record<string, string | number>) => void) | null = null;
  /** The challenge or trial being played, until the player leaves it. */
  special: SpecialRun | null = null;
  /** The last finished shift as a challenge a friend can play; null when it cannot be shared. */
  shareable: ChallengeSpec | null = null;
  /** The Daily Shift just cleared as a line for a chat; null after any other shift. */
  dailyShare: string | null = null;

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
    const trust = saveTrust();
    if (trust !== 'fine') this.announce(trust === 'restored' ? S.hints.saveRestored : S.hints.saveDistrusted);
    // A later visit of someone who has played a little.
    if (this.save.shiftsPlayed >= 3) this.teachTightFit();
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
    return { level: save.career.level, prestige: save.career.prestige, unlimitedBest: save.unlimitedBest, unlimitedCars: save.unlimitedBestCars, dailyDay: save.dailyDay, dailyScore: save.dailyScore, rushBest: save.career.rushBest, title: save.career.title };
  }

  get visibleUpgrades(): readonly Upgrade[] {
    return Careers.availableUpgrades(this.save.career, this.config);
  }

  private persist(): void {
    const earned = Achievements.sync(this.save);
    if (earned.length > 3) this.announce(S.ach.many(earned.length, Fmt.number(earned.reduce((n, e) => n + e.reward, 0))));
    else if (earned.length > 0) this.announce(...earned.map((e) => S.ach.reached(e.family, e.tier, Fmt.number(e.reward))));
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
    const gift = Careers.collectGift(this.save.career, this.today);
    this.persist();
    if (income !== null) this.announce(S.daily.welcomeBack(Fmt.number(income)));
    if (gift) this.announce(S.daily.giftCollected);
    this.announceBuildWithUs();
    this.announceInvite();
  }

  private tipTaken = false;

  /**
   * One tip per visit (Leo, 04.10.2026): Cloud sync, installing, the website, the invite and its reminder all
   * wait for their turn, so the game never opens on a stack of them. True for the first one asked in a visit; a
   * tip refused here is not marked as given and comes back at the next visit (or shift).
   */
  takeTip(): boolean {
    if (this.tipTaken) return false;
    this.tipTaken = true;
    return true;
  }

  /** A hint that came due but had to wait (`takeTip`): it is due again the next time. */
  deferHint(hint: Hint): void {
    this.save.hints = this.save.hints.filter((h) => h !== hint);
    this.persist();
  }

  /**
   * Once for every player who knows the game (Leo, 03.10.2026): the website, where bugs and ideas
   * can be sent and a bug hunter may get a gift. Not inside CrazyGames, which shows no links out.
   */
  private announceBuildWithUs(): void {
    if (inPortal || !this.save.tutorialDone || this.save.hints.includes('buildWithUs') || !this.takeTip()) return;
    this.save.hints.push('buildWithUs');
    this.store();
    this.announce(...S.hints.buildWithUs);
  }

  /**
   * Once for everyone who knows the game (Leo, 04.10.2026): the friend code is an invite, and both get a chest
   * when the friend reaches level 5. Only where the service can pay (`leaderboardEnabled`) and links work (not
   * inside CrazyGames); one tip per visit (`takeTip`). A player already past level 10 has had
   * the message now, so the level 10 reminder (`bookShift`) is not told again.
   */
  private announceInvite(): void {
    if (inPortal || !leaderboardEnabled || !this.save.tutorialDone || this.save.hints.includes('invite') || !this.takeTip()) return;
    this.save.hints.push('invite');
    if (this.save.career.level >= INVITE_REMINDER_LEVEL) this.save.hints.push('inviteReminder');
    this.store();
    this.announce(...S.hints.invite);
  }

  /** Simulation speed with the short slow motions of a takedown and of the lost shift. */
  get timeScale(): number {
    return Math.min(this.takedownSlowMotion, this.fatalSlowMotion, this.hitStop, this.reduceMotion ? 1 : this.cameraFx.finalScale);
  }

  private get hitStop(): number {
    if (this.reduceMotion) return 1;
    return this.sinceHitStop < this.hitStopFor ? 0.08 : 1;
  }

  /**
   * The best merges land with weight (research of 08.10.2026): a blink of stillness and a short lean of the camera,
   * gone under Reduce Motion. A Tight Fit is frequent, so its hold is the shortest the eye still feels; on a device that
   * cannot vibrate the punch does the work a vibration would.
   */
  private landMerge(hold: number, punch: number, at = this.punchAt): void {
    if (this.sinceHitStop >= this.hitStopFor || hold > this.hitStopFor - this.sinceHitStop) {
      this.sinceHitStop = 0;
      this.hitStopFor = hold;
    }
    if (punch <= 0) return;
    this.sincePunch = 0;
    this.punchAt = at;
    this.punchSize = punch * (this.output?.feelsHaptics === false ? 1.6 : 1);
  }

  /**
   * How far the camera leans in from a punch right now: eased in over `punchIn`, back over `punchOut`. Never in one
   * frame: a jump of the whole scene at once read as a twitch on every Tight Fit (Leo, 08.10.2026).
   */
  private get punch(): number {
    const t = this.sincePunch;
    if (this.reduceMotion || t >= GameSession.punchIn + GameSession.punchOut) return 0;
    if (t < GameSession.punchIn) return this.punchSize * Ease.outCubic(t / GameSession.punchIn);
    return this.punchSize * (1 - Ease.inOutSine((t - GameSession.punchIn) / GameSession.punchOut));
  }

  static readonly punchIn = 0.07;
  static readonly punchOut = 0.26;

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
        this.special = advanceRush(this.special);
        this.prepareShift(false);
        break;
      case 'openSettings':
        if (this.showsChrome && (this.screen.k === 'ready' || this.screen.k === 'result')) {
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
        const from = this.swipeMode;
        this.versusSelected = mode === 'multiplayer';
        // The swipe hint on the card hands over to the mode's name, and stays away until the screen has been quiet again.
        this.modeMessage.swipe(mode, this.modeHint > 0.05 ? { brief: TopBar.swipeBrief(), amount: this.modeHint } : undefined);
        this.modeHint = 0;
        this.sinceModeSwipe = 0;
        this.kickCamera(SWIPE_MODES.indexOf(mode) - SWIPE_MODES.indexOf(from));
        if (!this.save.hints.includes('modes')) {
          this.save.hints.push('modes');
          this.persist();
        }
        if (mode === 'multiplayer' || (fromVersus && mode === this.gameMode)) {
          if (this.isShowingResult) this.prepareShift(false, null, { k: 'ready' });
          this.onChrome?.();
          break;
        }
        if (!this.special) this.parked.set(this.gameMode, this.world.seed);
        const parkedSeed = this.parked.get(mode) ?? null;
        this.parked.delete(mode);
        save.mode = mode;
        this.persist();
        this.prepareShift(false, parkedSeed, { k: 'ready' });
        break;
      }
      case 'showTab': {
        const tab = action.tab;
        if (!this.showsChrome || (tab === screenTab(this.screen) && screenTab(this.screen) !== 'game')) return;
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
        // The chest waiting first is the one picked out on the shelf.
        if (this.shopPage.section === 0 && this.save.career.chests.length > 0) this.shopPage.selectedChest = this.save.career.chests[0];
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
      case 'moveBuilt':
        this.buildFlow.liftInspected();
        break;
      case 'deleteBuilt':
        this.buildFlow.deleteInspected();
        break;
      case 'upgradeBuilt':
        this.buildFlow.upgradeInspected();
        break;
      case 'movePart':
        this.buildFlow.move(action.slot);
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
        const kind = this.save.career.chests[action.index];
        if (!kind) return;
        this.shopPage.charging = { kind, age: 0, times: [], sinceHit: Infinity };
        this.play(['swoosh'], []);
        break;
      }
      case 'hitChest':
        this.hitChest();
        break;
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
        this.adFlow.watch('chest');
        break;
      case 'watchAdUpgrade':
        this.adFlow.watch('upgrade');
        break;
      case 'watchAdBoost':
        this.adFlow.watch('boost');
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
      case 'showHall':
      case 'showPass':
        if (action.k === 'showElite') this.eliteSeen = true;
        this.hallOpen = action.k === 'showHall';
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

  /**
   * Space or Enter on the Shop tab: taps the chest being opened, opens the chest whose sheet is up,
   * or plays the casino round. False when it does none of these.
   */
  private shopKey(ago: number): boolean {
    const s = this.shopPage;
    if (s.busy) this.shopFlow.tapShop({ k: 'dismiss' });
    else if (s.section === 0 && this.detailOpen && Careers.count(this.save.career, s.selectedChest) > 0) this.shopFlow.tapShop({ k: 'open', kind: s.selectedChest });
    else if (s.section === 2) this.casinoFlow?.key(ago);
    else return false;
    return true;
  }

  /**
   * A tap on the chest being tapped open: it cracks, rising in pitch; the last one breaks it and the reel
   * starts. How fast the taps came is the power that tilts the odds a little (`tappedOdds`).
   */
  private hitChest(): void {
    const c = this.shopPage.charging;
    if (!c) return;
    const { chestTaps, chestTapWindow } = this.config;
    c.times.push(c.age);
    c.sinceHit = 0;
    const hits = c.times.length;
    const strong = strongTaps(c.times, chestTapWindow)[hits - 1];
    this.playReel('chestHit', 0.8 + (0.7 * hits) / chestTaps, [strong ? 'reelStop' : 'reelTick']);
    if (hits < chestTaps) return;
    const index = this.save.career.chests.indexOf(c.kind);
    this.shopPage.charging = null;
    const open = this.openChestAt(index, tapPower(c.times, chestTaps, chestTapWindow));
    if (!open) return;
    this.shopPage.shelf = shelfOf(open.opening.item);
    this.shopPage.selectedItem = open.opening.item.id;
    this.shopPage.opening = open;
  }

  /**
   * Opens the chest at `index` (books it, says what albums it completed) and starts its reveal, with the sound of the
   * last crack. Null when there is no such chest.
   */
  private openChestAt(index: number, power: number): ShopState['opening'] {
    const career = this.save.career;
    const seed = this.save.shiftsPlayed * 7919 + this.popupSerial;
    const opening = Careers.openChest(career, index, seed, this.today, power, this.config);
    if (!opening) return null;
    const albums = this.completeAlbums();
    this.persist();
    if (albums.length > 0) this.announce(...albums);
    // Reduced motion: no build-up, no reel, the prize at once.
    const reel = ChestReel.make(opening.chest, opening.item, (seed ^ Math.imul(career.chestsOpened, 0x9e3779b1)) >>> 0, this.config.chestTeaserChance);
    if (this.reduceMotion) this.play([rarityRank(opening.item.rarity) >= 2 ? 'chestBurstRare' : 'chestBurst'], ['chest']);
    else this.play(['chestCharge'], ['wanted']);
    return { opening, reel, age: this.reduceMotion ? ShopPage.stages(reel).reveal : 0 };
  }

  /** Chests waiting, for the Game tab's pill to the Chests page; 0 where it does not show (a shift, a challenge, a match, a page). */
  get chestOffer(): number {
    const k = this.screen.k;
    if (!this.showsChrome || (k !== 'ready' && k !== 'result') || this.special || this.versusSelected || this.adFlow.placeholder) return 0;
    if (k === 'result' && this.resultAge < ResultBanner.inputLock) return 0;
    return this.save.career.chests.length;
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
    this.sinceMark = Infinity;
    this.topMark = 0;
    for (const id of this.briefings.clear()) this.owed.add(id);
    this.screen = next;
    this.onChrome?.();
  }

  private shiftConfig(seed: number): Config {
    // The Daily Shift pins its city event and is never a Legendary Shift.
    const daily = this.dailySelected;
    // The season tilts the sky of career shifts; the Daily Shift also carries the day's twist.
    const season = this.save.mode === 'shift' ? seasonOf(this.today) : null;
    const seasonal = forSeason(this.config, season);
    // A plain career shift is eased by what this career has been through (`Careers.careerShift`); the Daily never is.
    const base =
      this.save.mode === 'shift' && !daily
        ? Careers.careerShift(this.save.career, seasonal, seed)
        : Careers.shiftConfig(this.save.career, this.save.mode, seasonal, seed, daily ? dailyEvent(this.today) : undefined, daily ? null : undefined, daily ? mutatorOf(this.today) : null);
    // A living Daily streak, a waiting Tailwind and a chosen Heat pay more on a career shift (Mayhem pays in flames).
    if (this.save.mode === 'mayhem' || this.save.mode === 'chill') return base;
    const heat = !daily && this.save.mode === 'shift' ? Careers.activeHeat(this.save.career, this.config) : 0;
    const cfg = forHeat(base, heat);
    const bonus = (Goals.streakBonus(this.save.career, this.today, this.config) ? this.config.streakBonusPay : 0) + (Goals.tailwindOn(this.save.career, this.save.mode, daily) ? this.config.tailwindPay : 0) + heatPay(heat, this.config);
    return bonus > 0 ? Goals.forPay(cfg, bonus) : cfg;
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

  /** Stop `stop` (1…) of the tour running today; it waits, ready to play, on the Game tab. */
  startTour(stop: number): void {
    const run = tourOn(this.today);
    const career = this.save.career;
    if (!run) return;
    if (!tourOpen(career)) {
      this.showNotice(S.tours.locked(TOUR_LEVEL));
      return;
    }
    const t = tourTrial(run, stop, career);
    if (t) this.startSpecial({ k: 'trial', trial: t });
  }

  startTrial(id: string): void {
    const tour = tourStopOf(id, this.today);
    if (tour) {
      this.startTour(tour.stop);
      return;
    }
    const t = trialById(id);
    if (!t) return;
    // A mastery trial above the career's level is not played yet (rematches and the Weekly
    // Elite have their own conditions).
    if ((TRIALS.includes(t) || ASCENSIONS.includes(t) || LANDMARKS.includes(t)) && !trialOpen(t, this.save.career)) {
      this.showNotice(S.trials.opens(t));
      return;
    }
    this.startSpecial({ k: 'trial', trial: t });
  }

  /** Boss Rush: all eight bosses in a row, from the first. Waits, ready to play, on the Game tab. */
  startRush(): void {
    if (!rushOpen(this.save.career)) return;
    this.startSpecial(newRush());
  }

  /** Prestige asks twice: the first tap arms it, a second within a few seconds starts over. */
  private prestigeArmed = -Infinity;
  /** The Elite sheet was opened this session: Prestige in reach stops lighting the Progress tab. */
  private eliteSeen = false;
  /** The Elite sheet shows the Hall of Fame's own page. */
  private hallOpen = false;
  /** The condition whose sheet is open over the Game tab (a tap on its icon). */
  private conditionShown: string | null = null;
  /** The condition icons' tap targets as last drawn; empty while there are none to tap. */
  private conditionTargets: { id: string; rect: Rect }[] = [];
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
    this.output?.celebrate?.();
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
    this.dailyShare = null;
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
    return this.showsChrome ? this.lastInset : 0;
  }

  /**
   * The tab bar and the buttons over the scene. Not before the first shift is over (the research of 08.10.2026: on a
   * phone a first tap that lands in a menu loses the player): until then the screen is the game and nothing else.
   */
  get showsChrome(): boolean {
    return showsTabBar(this.screen) && this.save.tutorialDone;
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
      watchAdBoost: () => this.perform({ k: 'watchAdBoost' }),
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
      rewardedAd: (done) => this.output?.rewardedAd?.(done) ?? false,
      get adOffers() {
        return session.adOffer.offers;
      },
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
    this.cameraFx.reset();
    this.scars = new MapScars();
    this.tyreMarks.clear();
    this.popups = [];
    this.pendingSummary = null;
  }

  // MARK: Frame

  /** Advances by one display frame and returns what to draw. */
  frame(delta: number, actions: InputAction[], viewport: Vec2, bottomInset: number): RenderList {
    const realDelta = clamp(delta, 0, GameSession.maxFrameDelta);
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
    // A condition's sheet belongs to the waiting shift it was opened on.
    const shown = this.conditionShown;
    if (shown && (!(this.screen.k === 'ready' || this.screen.k === 'result') || !conditionChips(this.world.config, this.save.career).some((c) => c.id === shown))) this.closeDetail();

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
    this.sincePunch += realDelta;
    const tense = this.screen.k === 'playing' && !this.tutorial;
    this.cameraFx.update(tense ? tensionOf(this.world, this.playingMode) : 0, realDelta);
    this.cameraFx.watchFinal(this.world, tense);
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
    this.sinceMark += realDelta;
    this.sinceStrike += realDelta;
    this.sincePoliceCrash += realDelta;
    const counts = { carsSent: this.world.shift.carsSent, strikes: this.world.score.strikes, policeCrashes: this.world.score.policeCrashes };
    if (counts.carsSent > this.seen.carsSent) {
      this.sinceCarSent = 0;
      if (this.screen.k === 'playing') this.cityPulse.beat(this.flowLevel);
      const mark = this.screen.k === 'playing' && this.playingMode === 'unlimited' ? markPassed(Math.max(this.topMark, this.seen.carsSent), counts.carsSent) : null;
      if (mark) {
        this.topMark = this.markCars = mark;
        this.sinceMark = 0;
        this.rim.signal('sweep', 'coin');
        this.play(['flowIn'], ['shiftComplete']);
      }
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
    // A crash the shift survives (the shield, a police car within its limit) heals the ring; the last one flushes it.
    // Chill has no limit: nothing to forgive there.
    const limits = this.world.config;
    if (counts.strikes > this.seen.strikes) {
      this.sinceStrike = 0;
      if (counts.strikes < limits.maxStrikes && Number.isFinite(limits.maxStrikes)) this.healRing('juiceGreen', 'juiceGreen');
      else this.rim.signal('flush', 'destructive');
    }
    if (counts.policeCrashes > this.seen.policeCrashes) {
      this.sincePoliceCrash = 0;
      if (counts.policeCrashes <= limits.maxPoliceCrashes && Number.isFinite(limits.maxPoliceCrashes)) this.healRing('lightBlue', 'lightRed');
      else this.rim.signal('flush', 'lightBlue');
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
    this.adFlow.advance(realDelta);

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
      // Once the casino is open it loads in the background, so its section is there at once.
      if (Unlocks.isOpen(this.save.career, 'casino', this.config)) loadCasino().catch(() => undefined);
      const casino = this.shopPage.casino;
      if (casino) casino.ad = this.adOffer;
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
    } else if (this.progressPage.age !== 0 || this.progressPage.section !== PROGRESS.today) {
      this.leaveMuseum();
      this.progressPage = new ProgressState();
    }
    if (this.buildSlide) {
      this.buildSlide.age += realDelta;
      if (this.buildSlide.age >= BuildLayout.glide) this.buildSlide = null;
    }
    this.followModePan(realDelta);
    this.modeMessage.advance(realDelta);
    this.sinceModeKick += realDelta;
    this.sinceModeSwipe += realDelta;
    if (this.isPage('streetBuilder')) {
      this.builderPage.advance(realDelta);
      if (this.builderPage.removing > StreetBuilderPage.removeDuration) this.perform({ k: 'removePart' });
    } else {
      this.builderPage = new BuilderState();
    }
    this.buildFlow.advance(realDelta, this.isPage('streetBuilder'));
    this.notices.held = this.screen.k === 'playing';
    this.notices.advance(realDelta);
    this.musicMix = this.screen.k === 'playing' && runs ? Music.playing(this.world, this.flowLevel) : Music.silent;
    this.hearSky();
    return this.renderList(viewport, realDelta);
  }

  /** Rain on the Game tab's scene, and a strike whenever the scene's clock passes a flash of lightning (`WeatherLayer.addAirOf`). */
  private hearSky(): void {
    const severity = weatherSeverity(this.world.config.weather);
    const period = WeatherLayer.flashPeriod(severity);
    const index = period > 0 ? Math.floor(this.sceneTime / period) : 0;
    const strikes = this.weatherSound.strikes + (period === this.flash.period && index > this.flash.index ? 1 : 0);
    this.flash = { period, index };
    const k = this.screen.k;
    const onScreen = k === 'ready' || k === 'playing' || k === 'result' || k === 'settings';
    this.weatherSound = { rain: onScreen ? Sky.rain[severity] : 0, strikes };
  }

  private followRim(): void {
    if (this.screen.k === 'result' && this.resultAge < RingSignals.hold) return;
    const left = this.world.carsLeft;
    if (left === null) {
      this.rim.follow(0, 0, 'primary');
      return;
    }
    const total = this.world.config.shiftCars;
    this.rim.follow(total, Math.max(0, total - left), this.world.shift.isRushHour ? 'rushHour' : 'primary');
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
                this.special = advanceRush(this.special);
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
            if (this.pan.travel || Math.abs(this.pan.pan) >= ModePan.swipeThreshold) return;
            if (this.versusSelected) {
              this.onVersus?.();
              return;
            }
            this.startOrCatchUp(a.ago, simDelta);
            break;
          case 'result':
            if (this.resultAge >= ResultBanner.inputLock && !this.pan.travel && Math.abs(this.pan.pan) < ModePan.swipeThreshold) {
              if (this.versusSelected) {
                this.onVersus?.();
                return;
              }
              this.startOrCatchUp(a.ago, simDelta);
            }
            break;
          case 'page':
            if (this.isPage('shop')) this.shopKey(a.ago ?? 0);
            break;
          default:
            break;
        }
        break;
      case 'confirm':
        if ((this.screen.k === 'ready' || this.screen.k === 'result') && this.versusSelected) this.onVersus?.();
        else if (this.screen.k === 'ready' || this.screen.k === 'result') this.startOrCatchUp(undefined, simDelta);
        else if (this.isPage('shop') && this.shopKey(0)) break;
        else if (this.isPage('upgrades') && this.upgradePage.selected) this.perform({ k: 'buy', upgrade: this.upgradePage.selected });
        else if (this.screen.k === 'settings') this.perform({ k: 'closeSettings' });
        break;
      case 'back':
        if (this.detailOpen && (this.screen.k === 'page' || this.conditionShown)) {
          this.closeDetail();
          this.tick();
        } else if (this.screen.k === 'settings') this.perform({ k: 'closeSettings' });
        else if (this.special && (this.screen.k === 'ready' || this.screen.k === 'result')) this.leaveSpecial();
        else if (this.screen.k === 'ready') this.perform({ k: 'openSettings' });
        else if (this.screen.k === 'result' || this.screen.k === 'page') {
          if (this.isPage('shop') && this.shopPage.charging) this.shopPage.charging = null;
          else if (this.isPage('shop') && this.shopPage.opening) this.shopFlow.tapShop({ k: 'dismiss' });
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
        this.builderPage.target = StreetBuilderPage.dropTarget(this.builderPage, a.p, this.save.career, this.config, StreetBuilderPage.map(this.lastViewport, this.tabInset));
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
            else this.tapAway();
          }
          return;
        }
        if (this.isPage('progress') && this.progressPage.drag) {
          if (this.progressPage.release()) {
            const target = ProgressPage.targetAt(a.p, this.lastViewport, this.tabInset, this.save, this.today, this.progressPage);
            if (target) this.tapProgress(target);
            else this.tapAway();
          }
          return;
        }
        if (this.isPage('shop') && this.shopPage.items.drag) {
          if (this.shopPage.items.release()) {
            const target = ShopPage.itemAt(a.p, this.lastViewport, this.tabInset, this.shopPage);
            if (target) this.shopFlow.tapShop(target);
            else this.tapAway();
          }
          return;
        }
        const b = this.builderPage;
        if (!this.isPage('streetBuilder') || !b.dragging) return;
        const slot = StreetBuilderPage.dropTarget(b, a.p, this.save.career, this.config, StreetBuilderPage.map(this.lastViewport, this.tabInset));
        const wasTap = this.pressAt !== null;
        this.pressAt = null;
        // A lifted part: dropped on a free slot it moves there; anywhere else it waits, still lifted.
        if (b.moving) {
          if (slot !== null) this.perform({ k: 'movePart', slot });
          else {
            b.dragging = null;
            b.target = null;
          }
          break;
        }
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
      case 'finishChill':
        if (this.screen.k === 'playing' && this.playingMode === 'chill') this.world.finish();
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

  /**
   * The tap that starts a shift sends its first car. While the queue is still rolling up to the line it is not lost
   * either: the shift starts (its HUD, its sound) and the next tap, once the cars are there, sends the first one, as
   * after a lost shift.
   */
  private startOrCatchUp(ago: number | undefined, simDelta: number): void {
    const arriving = this.world.isArriving();
    this.startPlaying();
    if (!arriving) this.tapWorld(ago, simDelta);
  }

  /** A press anywhere on the canvas: chrome first, then the page under it, else the game. */
  private pointerDown(point: Vec2, ago: number | undefined, simDelta: number): void {
    // The stand-in ad covers the page: it waits.
    if (this.adFlow.placeholder) return;
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
      else this.tapAway();
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
    if (target !== this.upgradePage.scroll) this.upgradePage.scrollTo(clamp(target, 0, this.upgradeScrollRange));
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
      case 'heat':
        this.tick();
        Careers.cycleHeat(this.save.career, this.config);
        this.persist();
        this.refreshWaitingShift();
        break;
      case 'trial':
        // It waits, ready to play, on the Game tab.
        this.startTrial(target.id);
        break;
      case 'rush':
        this.startRush();
        break;
      case 'tour':
        this.startTour(target.stop);
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
    if (this.progressPage.section !== PROGRESS.museum) return;
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
    // Chill is not part of the career: what rolls past there is not met yet.
    if (this.world.config.chill) return;
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
    return this.screen.k === 'playing' && !this.versusSelected && this.playingMode !== 'mayhem' && this.playingMode !== 'chill' && (this.tutorial?.isOver ?? true);
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

  /** A tap on a condition's icon: its Museum sheet over the Game tab; a second tap closes it. */
  private showCondition(id: string): void {
    this.tick();
    if (this.conditionShown === id) {
      this.closeDetail();
      return;
    }
    this.conditionShown = id;
    this.detailOpen = true;
  }

  /** A tap on the page beside a card closes the detail sheet, as a tap beside any other sheet does. */
  private tapAway(): void {
    if (!this.detailOpen || this.shopPage.busy) return;
    this.closeDetail();
    this.tick();
  }

  /** Closes the detail sheet; what it was about is no longer chosen. */
  closeDetail(): void {
    if (!this.detailOpen) return;
    this.detailOpen = false;
    this.hallOpen = false;
    this.conditionShown = null;
    this.progressPage.museum.selected = null;
    this.progressPage.feat = null;
    this.upgradePage.selected = null;
    this.shopPage.selectedItem = null;
    this.builderPage.selected = null;
    this.builderPage.inspected = null;
    this.builderPage.marked = null;
    if (this.builderPage.pending) {
      this.builderPage.pending = null;
      this.builderPage.removing = 0;
    }
  }

  /** What the ads on offer look like right now: the extra ones are on, and an ad is ready to play. */
  get adOffer(): AdOffer {
    return { offers: this.output?.adOffers ?? true, ready: this.output?.adReady?.() ?? true };
  }

  /** What the detail sheet shows right now; null while it is closed or something covers the page. */
  get detail(): Detail | null {
    if (this.conditionShown && this.detailOpen && (this.screen.k === 'ready' || this.screen.k === 'result')) return Details.museum(this.conditionShown, this.save.career, this.config, true);
    if (!this.detailOpen || this.screen.k !== 'page' || this.adFlow.placeholder) return null;
    const career = this.save.career;
    const ads = this.adOffer;
    switch (this.screen.tab) {
      case 'upgrades':
        return this.upgradePage.selected ? Details.upgrade(this.upgradePage.selected, career, this.config, this.today, ads) : null;
      case 'shop': {
        const s = this.shopPage;
        if (s.busy) return null;
        if (s.section === 0) return Details.chest(s.selectedChest, career, this.config, this.today, ads);
        if (s.section === 1) return s.selectedItem ? Details.item(s.selectedItem, career) : null;
        return s.casino ? Details.casino(s.casino.game, career, this.config, ads) : null;
      }
      case 'streetBuilder': {
        const b = this.builderPage;
        if (b.inspected) return Details.built(b.inspected.part, career, this.config, b.marked !== null);
        if (b.dragging && !this.pressAt) return null;
        const part = b.pending?.part ?? b.selected;
        return part ? Details.part(part, b.pending !== null, career, this.config) : null;
      }
      case 'progress': {
        // Records has one sheet: the Elite track, opened from its card.
        if (this.progressPage.section === PROGRESS.records && this.hallOpen) return Details.hall(career, this.config);
        if (this.progressPage.section === PROGRESS.records) return Details.elite(career, this.config, this.sceneTime - this.prestigeArmed <= GameSession.prestigeWindow);
        if (this.progressPage.section === PROGRESS.today) return Details.pass(career, this.config, this.today);
        const feat = this.progressPage.feat;
        if (this.progressPage.section === PROGRESS.goals) return feat ? Details.feat(feat, career, this.config) : null;
        const selected = this.progressPage.museum.selected;
        return this.progressPage.section === PROGRESS.museum && selected ? Details.museum(selected, career, this.config) : null;
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

  /**
   * After Level 5, on the waiting screen of a career shift (not under a notice): after a while without a tap the top
   * card says the modes are a swipe away, for a few seconds, and again now and then. Someone who has swiped before
   * gets it too, but later (Leo, 08.10.2026).
   */
  private get showsModeHint(): boolean {
    const career = this.save.career;
    const due = career.level > this.config.modeHintAfterLevel || this.save.hints.includes('unlimitedTip');
    if (!due || !this.notices.isEmpty) return false;
    if (this.screen.k !== 'ready' || !this.takesModeSwipe) return false;
    // After a swipe the hint is gone for a whole quiet stretch, then it counts as before.
    const swiped = this.sinceModeSwipe < this.sinceReady;
    const wait = swiped ? GameSession.hintEvery : this.save.hints.includes('modes') ? GameSession.hintIdleKnown : GameSession.hintIdle;
    const idle = Math.min(this.sinceReady, this.sinceModeSwipe) - wait;
    return idle >= 0 && idle % GameSession.hintEvery < GameSession.hintShown;
  }

  /** What the waiting screen's top card says instead of its numbers: the mode just swiped to, or the swipe hint. */
  private get topMessage(): TopMessage | null {
    const message = this.modeMessage.view(this.sceneTime);
    if (message) return message;
    return this.modeHint > 0 ? { brief: TopBar.swipeBrief(), previous: null, amount: this.modeHint, swap: 1, pulse: 1, time: this.sceneTime, ...this.swipeSides } : null;
  }

  /** A short kick of the camera as the mode changes: a small lean in, and a damped shake the way the swipe went. */
  private kickCamera(direction: number): void {
    if (this.reduceMotion) return;
    this.sinceModeKick = 0;
    this.modeKickDir = direction < 0 ? -1 : 1;
    this.sincePunch = 0;
    this.punchAt = v(0, 0);
    this.punchSize = 0.03;
  }

  private get modeKick(): Vec2 {
    const t = this.sinceModeKick;
    if (this.reduceMotion || t > 0.8) return v(0, 0);
    const decay = Math.exp(-t * 7);
    return v(this.modeKickDir * 9 * decay * Math.sin(t * 30), 3 * decay * Math.sin(t * 37 + 1));
  }

  /** Which ways a swipe leads to another mode from this page: none to the left of the first, none to the right of the last. */
  private get swipeSides(): { left: boolean; right: boolean } {
    const at = SWIPE_MODES.indexOf(this.swipeMode);
    return { left: at > 0, right: at < SWIPE_MODES.length - 1 };
  }

  private get takesModeSwipe(): boolean {
    if (this.world.shift.phase !== 'waiting' || !(this.tutorial?.isOver ?? true) || this.special) return false;
    if (this.isShowingResult) return this.resultAge >= ResultBanner.inputLock;
    return this.screen.k === 'ready';
  }

  /** The chrome every screen shares: the Build tab's segments, the top card, the Progress tab. */
  private pageAction(point: Vec2): InputAction | true | null {
    if (!this.showsChrome) return null;
    if (this.isPage('upgrades') || this.isPage('streetBuilder')) {
      const tab = BuildLayout.pageAt(point, this.lastViewport);
      return tab ? { k: 'perform', action: { k: 'showTab', tab } } : null;
    }
    if (this.screen.k === 'ready' || this.screen.k === 'result') {
      if (this.screen.k === 'result' && this.resultAge < ResultBanner.inputLock) return null;
      const chip = this.conditionTargets.find((t) => R.contains(t.rect, point));
      if (chip) {
        this.showCondition(chip.id);
        return true;
      }
      // With a condition's sheet open, a tap on the scene closes it: it never starts the shift.
      if (this.conditionShown) {
        this.closeDetail();
        this.tick();
        return true;
      }
      const column = TopBar.column(point, this.lastViewport.x);
      if (!column) return null;
      const showsCars = this.screen.k === 'ready' || ResultBanner.settled(this.resultAge) >= 0.5;
      // The money leads to the chests it buys, never straight into the casino.
      if (column === 'left') return { k: 'perform', action: { k: 'showShop', section: 0 } };
      if (column === 'center') return { k: 'perform', action: showsCars ? { k: 'showShop', section: 1 } : { k: 'showProgress', section: PROGRESS.records } };
      return { k: 'perform', action: { k: 'showProgress', section: PROGRESS.records } };
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
          // Braked in behind slow traffic: nothing was timed, so it counts for nothing and shows nothing.
          if (e.crept) break;
          if (e.critical) {
            this.addPopup({ k: 'critical', n: e.points }, e.position);
            this.rim.signal('wave', 'coin');
            this.landMerge(0.06, 0.025, e.position);
          } else if (e.rating !== 'clean') this.addPopup({ k: e.rating } as PopupKind, e.position);
          if (!e.critical && e.rating === 'tightFit') this.landMerge(0.03, 0.008, e.position);
          if (e.shave > 0) this.addPopup({ k: 'shave', n: e.shave }, add(e.position, v(0, 22)));
          // In the snow every merge leaves its tracks, and they stay.
          if (TyreMarks.leavesMark(e.rating) || world.config.weather === 'snow') this.tyreMarks.add(world.config.weather === 'snow');
          // The Records keep how early or late the taps come (saved with the shift).
          if (!this.tutorial) noteTap(this.save.career, e.gapAhead, e.gapBehind, this.config);
          break;
        case 'crash':
          this.effects.spawn(e, world, this.reduceMotion, e.chain);
          if (e.involvesPlayer || e.isStrike) this.lastCrashAt = e.point;
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
            // The higher the tier, the juicier the splash; the top one throws gold in with the green.
            const c = world.config;
            const tiers = Math.min(c.comboThresholds.length, c.comboMultipliers.length);
            this.rim.signal('splash', 'juiceGreen', e.tier >= tiers ? 'coin' : 'skinMint', e.tier / tiers);
            // The top multiplier lands with a blink of stillness.
            if (e.tier >= tiers) this.landMerge(0.06, 0);
          }
          break;
        case 'shiftEnded':
          // Gold for a Perfect Run (no crash, no cut-off): only the first one is told in words (`bookShift`).
          if (e.result.outcome === 'completed') {
            if (e.result.isPerfectRun) this.rim.signal('victory', 'coin', 'juiceGreen', 1);
            else this.rim.signal('victory', 'juiceGreen', 'skinMint', 0.5);
            this.cameraFx.relieve();
          } else if (e.result.outcome === 'struckOut') {
            this.rim.signal('flush', 'destructive');
            this.sinceFatalCrash = 0;
            this.cameraFx.leanTo(this.lastCrashAt, CameraFxTuning.crashZoom, 0.45);
            this.sinceLoss = 0;
          } else {
            this.rim.signal('flush', 'vehicleCriminal');
            this.sinceLoss = 0;
          }
          this.finish(e.result);
          break;
        case 'takedown':
          this.sinceTakedown = 0;
          this.cameraFx.leanTo(e.point, CameraFxTuning.takedownZoom, 0.3);
          this.rim.signal('wave', 'lightBlue');
          break;
        case 'criminalWarning':
          this.brief(e.boss ? { k: 'boss', kind: world.config.bossKind } : { k: 'special', kind: 'pickup' });
          this.rim.signal('sweep', e.boss ? 'coin' : 'vehicleCriminal');
          if (e.scout && !this.save.hints.includes('scout')) {
            this.save.hints.push('scout');
            this.showNotice(S.boss.scoutFirst);
          }
          break;
        case 'armourHit':
          this.rim.signal('wave', 'coin');
          break;
        case 'ambulanceWarning':
          this.brief({ k: 'special', kind: e.fire ? 'fireTruck' : 'ambulance' });
          this.rim.signal('sweep', 'lightBlue');
          break;
        case 'oversizeWarning':
          this.brief({ k: 'special', kind: 'oversize' });
          this.rim.signal('sweep', 'vehicleOversize');
          break;
        case 'oversizeSpoilt':
          this.rim.signal('miss', 'vehicleOversize');
          break;
        case 'oversizePassed':
          this.rim.signal('wave', 'vehicleOversize');
          break;
        case 'weddingWarning':
          this.brief({ k: 'special', kind: 'wedding' });
          this.rim.signal('sweep', 'vehicleWedding');
          break;
        case 'weddingSpoilt':
          this.rim.signal('miss', 'vehicleWedding');
          break;
        case 'weddingPassed':
          this.rim.signal('wave', 'vehicleWedding');
          break;
        case 'raceWarning':
          this.brief({ k: 'special', kind: 'racer' });
          this.rim.signal('sweep', 'vehicleRacer');
          break;
        case 'racerStopped':
          this.rim.signal('wave', 'vehicleRacer');
          break;
        case 'learnerWarning':
          this.brief({ k: 'special', kind: 'learner' });
          this.rim.signal('sweep', 'learnerSign');
          break;
        case 'learnerSpoilt':
          this.rim.signal('miss', 'learnerSign');
          break;
        case 'learnerPassed':
          this.rim.signal('wave', 'learnerSign');
          break;
        case 'ambulanceBlocked':
          this.rim.signal('flush', 'destructive');
          break;
        case 'ambulanceCleared':
          this.rim.signal('wave', 'lightBlue');
          break;
        case 'ambulanceLost':
          this.rim.signal('miss', 'lightBlue');
          break;
        case 'heistRecovered':
          this.rim.signal('wave', 'coin');
          break;
        case 'dispatched':
          this.addPopup({ k: 'dispatch' }, world.layout.stopPose(world.layout.player).position);
          break;
        case 'rushHour':
          this.rim.signal('sweep', 'rushHour');
          break;
        case 'unlimitedStage':
          // Unlimited moves on: a light run round the ring, and the news at the top.
          this.rim.signal('sweep', 'primary');
          this.showNotice(S.modes.stage(e.stage, e.overtime));
          break;
        case 'transporterSeized':
        case 'transporterLost':
          this.rim.signal('miss', 'vehicleCargo');
          break;
        case 'transporterWarning':
          this.brief({ k: 'special', kind: 'transporter' });
          this.rim.signal('sweep', e.jackpot ? 'coin' : 'vehicleCargo');
          break;
        case 'transporterPaid':
          if (e.amount <= 0) break;
          if (e.jackpot) {
            this.addPopup({ k: 'jackpotPaid', n: e.amount }, world.layout.stopPose(world.layout.player).position);
            this.rim.signal('sweep', 'coin');
          } else this.rim.signal('wave', 'vehicleCargo');
          break;
        case 'modulePaid':
          this.addPopup({ k: 'modulePulse', color: e.module === 'speedCamera' ? 'lightBlue' : e.module === 'billboard' ? 'accent' : 'hazard' }, e.point);
          this.addPopup({ k: 'earned', n: e.amount }, e.point);
          break;
        case 'towed':
          this.addPopup({ k: 'modulePulse', color: 'hazard' }, towYard(e.slot, world.layout, world.config));
          break;
        case 'militaryWarning':
          this.brief({ k: 'special', kind: 'military' });
          this.rim.signal('sweep', 'lightRed');
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

  /** A crash forgiven: the ring lights up with plus signs and a soft chord, no words over the shift. */
  private healRing(color: ColorToken, second: ColorToken): void {
    this.rim.signal('heal', color, second);
    if (this.screen.k === 'playing') this.play(['heal'], ['secured']);
  }

  /**
   * Taught once (research of 08.10.2026: the tutorial says "wait for a gap", the scoring pays most for close merges):
   * on a later visit, or after a few shifts at the latest. Someone who already merges close is not told.
   */
  private teachTightFit(): void {
    const save = this.save;
    if (!save.tutorialDone || save.hints.includes('tightFit')) return;
    save.hints.push('tightFit');
    this.store();
    if (save.career.mastery.tightFits < GameSession.tightFitsKnown) this.announce(S.modes.tightFit);
  }

  /** Shifts after which `teachTightFit` comes in the same visit, and how many Tight Fits mean it is known. */
  static readonly tightFitTipShifts = 6;
  static readonly tightFitsKnown = 10;

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
    const news = Careers.startDaily(career, this.today, this.config);
    const toasts: string[] = [];
    if (news?.frozen) toasts.push(S.daily.freezeUsed(news.frozen));
    if (news?.earned) toasts.push(S.daily.freezeEarned);
    // The casino opens quietly: until it has, the cards wait in hand without a word.
    if (news?.cards && Unlocks.isOpen(career, 'casino', this.config)) toasts.push(S.daily.cardEarned(career.dailyStreak));
    if (news?.item) {
      toasts.push(S.daily.milestone(career.dailyStreak, news.item));
      toasts.push(...this.completeAlbums());
    }
    this.persist();
    this.announce(...toasts);
  }

  /** The waiting shift follows the day: today's Daily Shift while open, a normal one after. */
  private keepDailyInStep(): void {
    if (this.world.shift.phase !== 'waiting' || this.screen.k === 'playing' || this.special) return;
    const day = dayNumber();
    if (day !== this.today && Careers.collectGift(this.save.career, day)) {
      this.persist();
      this.announce(S.daily.giftCollected);
    }
    this.today = day;
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
    const stage = ShopPage.stages(o.reel);
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
    if (result.bossBusted || (result.outcome === 'completed' && result.legendary)) this.output?.celebrate?.();
    if (this.special) {
      this.finishSpecial(this.special, result);
      return;
    }
    // Any finished shift can go to a friend as a challenge (not while learning the game, not one eased for this career).
    this.shareable = save.tutorialDone && this.playingMode !== 'chill' && !this.world.config.assisted
      ? challengeOf(
          career,
          this.playingMode,
          this.playingLevel,
          result.seed,
          this.world.config.cityEvent,
          this.playingMode === 'mayhem' ? result.flames : result.score,
          this.world.config.legendary,
          this.world.config.mutator,
          this.world.config.season,
        )
      : null;
    if (this.tutorial && this.playingMode !== 'mayhem') {
      this.tutorial.end();
      if (this.tutorial.isDone) this.tutorial = null;
      save.tutorialDone = true;
      this.onStep?.('tutorial-done');
    }
    this.onStep?.('shift', { mode: this.playingMode, level: this.playingLevel, outcome: result.outcome });
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
    this.dailyShare =
      this.playingDaily && result.outcome === 'completed'
        ? S.run.dailyShare(Fmt.number(result.score), result.perfects, result.tightFits, career.dailyStreak)
        : null;
    this.dailySelected = false;
    this.resultBank = booked.bank;
    const found = this.takeMuseumNotice();
    this.notices.announce(...GameSession.budget([...booked.news, ...(found ? [found] : [])]));
    for (const hint of booked.due) this.onHint?.(hint);
    if (save.shiftsPlayed >= GameSession.tightFitTipShifts) this.teachTightFit();
    const { isNew, previous } = booked;
    // A Shift's best grows with the level almost every time; a record in Unlimited or Mayhem is earned.
    if (isNew && previous > 0 && this.playingMode !== 'shift') this.output?.celebrate?.();
    if (this.playingMode === 'mayhem') {
      this.pendingSummary = { result, level: this.playingLevel, isNewHighscore: isNew, previousHighscore: previous, mode: 'mayhem' };
      this.resultCountdown = this.resultDelayFor(result);
      return;
    }
    this.pendingSummary = { result, level: this.playingLevel, isNewHighscore: isNew, previousHighscore: previous, mode: this.playingMode, closeCall: this.playingMode === 'chill' ? null : this.closeCall(result, previous) };
    this.resultCountdown = this.resultDelayFor(result);
  }

  /**
   * The line under a result: after a loss, how close it was (honestly: cars left, points to
   * the best, a merge short of the next multiplier); after a win, what the money is close to.
   */
  private closeCall(result: ShiftResult, best: number): ShiftSummary['closeCall'] {
    if (result.outcome !== 'completed') {
      const tier = this.playingMode === 'unlimited' ? Goals.tierMiss(result.carsSent, this.save.unlimitedBestCars) : null;
      if (tier) return { text: S.goals.tierMiss(tier), color: 'hazard' };
      const miss = Goals.nearMiss(result, this.playingMode === 'shift' ? this.world.config.shiftCars : 0, this.playingLevel, best, this.world.config);
      return miss ? { text: S.goals.nearMiss(miss), color: 'hazard' } : null;
    }
    const goal = Goals.money(this.save.career, this.config);
    return goal ? { text: S.goals.money(Fmt.number(goal.short), goal.upgrade), color: 'accent' } : null;
  }

  /** Lines a result tells at most; the rest are counted in one more (they are all in Progress, or on the chest pill). */
  static readonly resultNews = 3;

  /** A result's news within its budget: the first lines as they are, then how many more there are. */
  static budget(news: string[]): string[] {
    const max = GameSession.resultNews;
    return news.length <= max + 1 ? news : [...news.slice(0, max), S.notice.more(news.length - max)];
  }

  private resultDelayFor(result: ShiftResult): number {
    return result.detonated ? SmokeCurtain.swapAt : GameSession.resultDelay;
  }

  /** The page the mode swipe is travelling to, one swipe at a time (`goToMode`). */
  private modeGoal: SwipeMode | null = null;

  /** Swipes through the pages until `mode` is shown, so the map moves on screen (Friends → Open lobby). */
  goToMode(mode: SwipeMode): void {
    this.modeGoal = mode;
    this.stepToGoal();
  }

  private stepToGoal(): void {
    while (this.modeGoal) {
      const here = this.swipeMode;
      const way = SWIPE_MODES.indexOf(this.modeGoal) - SWIPE_MODES.indexOf(here);
      if (way === 0) break;
      this.handle({ k: 'swipeMode', step: Math.sign(way) }, 0);
      // Swiping: the next step comes when this page has landed. Refused (a tutorial, a shift under way): stay where we are.
      if (this.pan.travel) return;
      if (this.swipeMode === here) break;
    }
    this.modeGoal = null;
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
      this.stepToGoal();
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
        // A Boss Rush shows the next boss behind its result (or the first, after a loss or a clear).
        this.special = advanceRush(this.special);
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
    // A tour stop is drawn on the tour's own map, whatever the player wears.
    const mapSkin = this.special?.k === 'trial' && this.special.trial.tour?.map ? this.special.trial.tour.map : career.mapSkin;
    const theme = MapTheme.from(mapSkin);
    const list = new RenderList(camera, MapTheme.ground(theme));
    // A device that cannot keep 30 fps leaves out the decoration (`lowDetail`), never the game.
    list.groundGrain = !this.lowDetail;
    if (screen) list.backdrop = GameSession.backdropVeil;
    else CityLayer.add(list, world, theme, rm ? null : this.sceneTime, rm ? null : this.cityPulse, this.scars.isEmpty ? null : this.scars, this.sceneTime, this.playingMode === 'shift' && !this.special ? this.cityRise : null, !this.lowDetail);
    // A mode swipe: the road runs on towards the map coming in, from this one and from the next.
    const link = Math.min(1, Math.abs(this.pan.pan) / (camera.viewport.x * 0.25));
    SceneBuilder.addRoad(list, world.layout, world.config, world.layout.player, link, this.pan.pan < 0 ? 0 : Math.PI);
    CityLayer.addMapSkin(list, Skins.color(mapSkin), world);
    MapTheme.addIsland(list, theme, world);
    if (!this.special) CityLayer.addElite(list, Elite.level(career, this.config), world);
    if (!this.special) CityLayer.addHall(list, career.hallBuilt, career.prestige, world);
    CityLayer.addFrame(list, Careers.frame(career), world);
    if (!world.config.night) this.rim.add(list, world, rm);
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
    if (world.config.night) {
      NightLayer.add(list, world, alpha, this.lamps, rm ? null : world.time);
      // The ring's light goes on above the dark, not under it, and glows (`HUD.bloom`).
      const lit = list.items.length;
      this.rim.add(list, world, rm);
      if (!this.lowDetail) HUD.bloom(list, lit);
    }
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
    // The bar's height even where it is hidden (a shift, the first one): the street view does not jump when it comes and goes.
    const cam = this.cameraRig.camera(perspectiveOf(this.screen), world.layout, viewport, this.lastInset, delta, rm);
    const shake = add(this.effects.shakeOffset, this.explosions.shakeOffset);
    const pulled = { ...cam, scale: cam.scale * (1 - GameSession.lossPullBack * this.lossPull) * (1 + this.explosions.punch) };
    const leaned = zoomAbout(this.cameraFx.apply(pulled, world.layout.stopPose(world.layout.player).position, rm), this.punchAt, 1 + this.punch);
    const kick = this.modeKick;
    const camera = { ...leaned, focus: v(leaned.focus.x + shake.x + this.pan.pan + kick.x, leaned.focus.y + shake.y + kick.y) };
    const career = this.save.career;
    this.lastCamera = camera;
    const list = this.sceneList(camera, alpha, rm, this.backdrop);
    list.shake = shake;
    addRecede(list, this.recede, world.layout);
    this.curtain?.add(list, viewport, rm);
    this.explosions.addFlash(list, viewport);
    list.vignette = this.cameraFx.vignette;
    list.vignetteAt = list.items.length;

    const overlayStart = list.items.length;
    const s = this.screen;
    // Where the chrome under the top card ends: a notice hangs below it.
    let underCard = TopBar.frame(viewport.x).maxY;
    this.conditionTargets = [];
    if (s.k === 'playing') {
      const lit = list.items.length;
      HUD.addFlowGlow(list, world, this.flowLevel, rm ? 0 : 1 - Ease.clamp01(this.sinceCarSent / 0.3));
      HUD.addChase(list, world, alpha);
      HUD.addTransporter(list, world, alpha);
      HUD.addMilitary(list, world, alpha);
      HUD.addAmbulance(list, world, alpha);
      HUD.addLearner(list, world, alpha);
      HUD.addOversize(list, world, alpha);
      HUD.addWedding(list, world);
      HUD.addRace(list, world, alpha);
      if (world.config.night && !this.lowDetail) HUD.bloom(list, lit);
      const since = world.shift.rushHourSince;
      HUD.add(list, {
        world,
        level: this.playingLevel,
        score: Math.round(this.shownScore),
        money: Math.round(this.shownMoney),
        best: this.currentBest,
        comboPop: rm ? 0 : Ease.clamp01(this.sinceComboTier / GameSession.comboPop),
        mark: this.sinceMark < 2.5 ? S.modes.mark(this.markCars, markReward(this.markCars)) : null,
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
    if (this.isPage('streetBuilder')) StreetBuilderPage.add(list, career, this.config, this.builderPage, rm, inset, this.buildThumb);
    else if (this.isPage('upgrades')) UpgradePage.add(list, career, this.config, this.visibleUpgrades, this.upgradePage, rm, inset, this.buildThumb, this.adOffer.offers ? Careers.adUpgradeOffer(career, this.today, this.config) : null);
    else if (this.isPage('shop')) ShopPage.add(list, career, this.config, this.today, this.shopPage, rm, inset);
    else if (this.isPage('progress')) ProgressPage.add(list, this.save, this.today, this.progressPage, rm, inset, this.progressScrollRange);
    else if (s.k === 'settings') list.s(rect({ x: viewport.x / 2, y: viewport.y / 2 }, viewport), 'background', 0.55);
    const standIn = this.adFlow.placeholder;
    if (standIn) ShopPage.addAd(list, standIn.reward, standIn.age, AdFlow.placeholderSeconds);
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
    const best =
      this.playingMode === 'shift' ? this.save.highscore : this.playingMode === 'unlimited' ? this.save.unlimitedBest : this.playingMode === 'chill' ? this.save.chillBest : this.save.mayhemBest;
    return best > 0 ? Fmt.number(best) : null;
  }

  /** Whether a tab has something waiting, like an iOS badge: the Shop's chests or new items. */
  badge(tab: Tab): { count: number } | 'dot' | null {
    const c = this.save.career;
    if (barTab(tab) === 'progress') return c.museumNew.length > 0 || (!this.eliteSeen && Careers.canPrestige(c, this.config)) ? 'dot' : null;
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
          freezes: career.streakFreezes,
          mutator: this.world.config.mutator,
        }
      : null;
    // The next goal in reach: only on a plain career shift, never over a challenge, trial or match.
    const goal = !this.special && !this.versusSelected && this.playingMode === 'shift' && (this.tutorial?.isOver ?? true) ? Goals.next(career, this.today) : null;
    const run = runCard(this.special, this.world.config, this.playingMode, this.versusSelected, career, this.today);
    // A trial's goal already names its conditions; the tutorial and a match have none to show.
    // While the Daily's opening is on, nothing else of the waiting screen shows through it.
    const opening = daily !== null && daily.splash !== null;
    const chips = opening || this.special?.k === 'trial' || this.versusSelected || (this.tutorial && !this.tutorial.isOver) ? [] : conditionChips(this.world.config, career);
    const chipsAt = ConditionChips.center(toScreen(list.camera, v(0, 0)), !!run?.line);
    const under = ReadyBanner.add(list, {
      level: this.playingLevel,
      cars: this.world.carsLeft ?? 0,
      highscore: this.currentBest,
      money: Fmt.number(career.money),
      iconsTop: chips.length > 0 ? chipsAt.y - ConditionChips.hit / 2 : null,
      run,
      prestige: this.special ? 0 : career.prestige,
      elite: !this.special && Elite.isOpen(career, this.config),
      playerName: this.versusSelected ? loadPlayerName() : undefined,
      daily,
      tailwind: !this.special && !this.versusSelected && Goals.tailwindOn(career, this.playingMode, this.playingDaily) ? this.config.tailwindPay : null,
      heat: !this.special && !this.versusSelected && !this.playingDaily && this.playingMode === 'shift' ? Careers.activeHeat(career, this.config) : 0,
      mode: this.playingMode,
      versus: this.versusSelected,
      prompt: opening ? null : prompt,
      time: this.sinceReady,
      reduceMotion: this.reduceMotion,
      drawsCard,
      opacity,
      goal: this.giftLine ?? (goal ? S.goals.next(goal) : null),
      intro: this.versusSelected || (this.tutorial && !this.tutorial.isOver) ? null : this.readyIntro,
      textScale: this.textScale,
      noticeRoom: this.noticeRoom,
      message: this.topMessage,
      ringTop: toScreen(list.camera, v(0, this.world.layout.ringRadius + this.world.layout.laneWidth)).y,
    });
    if (chips.length > 0) {
      ConditionChips.add(list, chips, chipsAt, { time: this.sinceReady - ReadyBanner.introDelay, reduceMotion: this.reduceMotion, opacity, selected: this.conditionShown });
      if (opacity > 0.5 && this.showsChrome) this.conditionTargets = ConditionChips.targets(chips.length, chipsAt).map((rect, i) => ({ id: chips[i].id, rect }));
    }
    // The Daily's splash covers the whole screen for a moment: above the condition icons, never under them.
    if (daily && daily.splash !== null) ReadyBanner.addSplash(list, daily, daily.splash, this.reduceMotion);
    return under;
  }

  /** Tomorrow's gift on the Game tab, counted down (a plain career shift only, like the next goal). */
  private get giftLine(): string | null {
    if (this.special || this.versusSelected || this.playingMode !== 'shift' || !Careers.giftAhead(this.save.career, this.today)) return null;
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return S.daily.giftIn((midnight.getTime() - now.getTime()) / 3600000);
  }

  /** The ready screen's card: what a trial's goal asks for (the conditions are icons, `ConditionChips`). */
  private get readyIntro(): ConditionIntro[] {
    const howTo = this.special?.k === 'trial' && this.playingMode !== 'chill' ? S.trials.howTo(this.special.trial) : null;
    return howTo ? [howTo] : [];
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

  /** Rewards from the team (net/rewards.ts): the Ladybug skin, chests, an invite's chest. Booked and announced. */
  payRewards(rewards: readonly Pick<Reward, 'item' | 'reason'>[]): void {
    const career = this.save.career;
    const news: string[] = [];
    for (const { item, reason } of rewards) {
      if (item.startsWith('chest:')) {
        const kind = item.slice(6) as ChestKind;
        if (!CHEST_KINDS.includes(kind)) continue;
        career.chests.push(kind);
        news.push(S.rewards.invite(reason, kind) ?? S.rewards.chest(kind));
      } else if (cosmetic(item)) {
        if (Careers.owns(career, item)) continue;
        Careers.collect(career, item);
        news.push(item === 'ladybug' ? S.rewards.ladybug : S.rewards.item(item));
      }
    }
    this.persist();
    if (news.length > 0) {
      this.play(['shiftComplete'], ['shiftComplete']);
      this.announce(...news);
    }
  }

  /** A fresh save (Settings → Delete account, after the server forgot the player). */
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
