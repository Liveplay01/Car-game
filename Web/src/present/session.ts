import { World, STEP } from '../core/world';
import { baseConfig, gravity, builtArmSlots, weatherSeverity, type Config } from '../core/config';
import { type SaveGame, type GameMode, type Hint, Careers, newSave } from '../core/career';
import { Elite } from '../core/elite';
import { addCrewXp } from '../net/crews';
import { SeasonPass } from '../core/seasonPass';
import { Unlocks } from '../core/unlocks';
import { Mafia } from '../core/mafia';
import type { GameEvent, ShiftResult } from '../core/events';
import type { Upgrade } from '../core/levels';
import { ALBUM_REWARD, BIG_SCREEN, CHEST_KINDS, chestPrice, chestBundle, cosmetic, rarityRank, tapPower, strongTaps, type ChestKind } from '../core/loot';
import { dailySeed, dailyEvent, dayNumber } from '../core/daily';
import { weekNumber, weeklyTrial } from '../core/weekly';
import { Goals } from '../core/goals';
import { noteTap } from '../core/timing';
import { type PatchNote, PATCH_NOTES, latestNote } from './patchNotes';
import { ChestReel } from './chestReel';
import { type Vec2, v, add, clamp } from '../core/vec2';
import { loadSave, saveTrust, writeSave } from '../storage/save';
import { loadPlayerName } from '../storage/profile';
import { leaderboardEnabled, syncScores, type Records } from '../net/leaderboard';
import type { Reward } from '../net/rewards';
import { cloudChanged, cloudEnabled, cloudLinked } from '../net/cloud';
import { fetchIdeas, ideasEnabled } from '../net/ideas';
import { Auction } from '../core/auction';
import { RenderList, R, Ease, toScreen, rect, drawText, type Camera, type Rect } from './render';
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
import { CityLights, LampWave } from './cityLights';
import { HUD, TopBar, RingSignals, ModeMessage, ModeBanner, ReadyBanner, type TopMessage, ResultBanner, type Popup, type PopupKind, type ShiftSummary, type ConditionIntro, POPUP_LIFETIME, settledPops } from './hud';
import { inPortal, inPlayStore, isInstalled } from '../storage/device';
import { Tutorial } from './tutorial';
import { NoticeQueue, TipQueue, type Tip } from './notices';
import { bookShift } from './booking';
import { type Screen, type Tab, type SwipeMode, SWIPE_MODES, type ScreenAction, type ProgressSection, type ShopSection, type SocialSection, PROGRESS, SOCIAL, TAB_BAR, BUILD_PAGES, barTab, screenTab, showsTabBar, BuildLayout } from './flow';
import { SocialPage, SocialState } from './social';
import { CameraRig, perspectiveOf, addRecede } from './perspective';
import { CameraFx, CameraFxTuning, tensionOf, zoomAbout } from './cameraFx';
import { PhotoCard } from './photo';
import { TransitionTracker, ModePan } from './transitions';
import { ShopPage, ShopState, SHELVES, shelfOf, type ShopTarget } from './shop';
import { SideSwipe } from './swipe';
import type { CasinoFlow, CasinoHost } from './casinoFlow';
import { casinoKit, loadCasino } from './casinoLoader';
import { Casino } from '../core/casino';
import { BuildFlow } from './buildFlow';
import { ShopFlow } from './shopFlow';
import { AdFlow, type AdOffer, type GameAd } from './adFlow';
import { AdPill } from './adPill';
import { RewardBurst, type Burst } from './rewardBurst';
import type { PageHost } from './pageHost';
import { type SpecialRun, settleSpecial, runCard, advanceRush, newRush } from './specialRuns';
import { markPassed, markReward } from '../core/tiers';
import { forHeat, heatPay } from '../core/heat';
import { conditionChips, ConditionChips, FailChip, streakEndsIn, addNotice, noticePresence, NoticeIsland } from './readyScreen';
import { Briefings, type Brief } from './briefing';

export type { SpecialRun } from './specialRuns';
import { ProgressPage, ProgressState, type ProgressTarget } from './progress';
import { Meter } from './meter';
import { MuseumFlow, type MuseumHost } from './museumFlow';
import { museumEntry, museumId, FAIL_SKIN } from '../core/museum';
import { UpgradePage, UpgradeState } from './upgrades';
import { StreetBuilderPage, BuilderState } from './builder';
import { Feedback, Music, Sky, type MusicMix, type WeatherSound, type SoundID, type HapticID } from './feedback';
import { Details, type Detail } from './detail';
import { Intros, type Intro } from './intros';
import { News, NEWS_DWELL, type NewsItem } from './news';
import { textWidth } from './icons';
import { TyreMarks, BrakeMarks } from './marks';
import { Ducks } from './ducks';
import { Holidays } from './holidays';
import { DriftFx } from './driftFx';
import { type DriftSound, type TrafficSound, engineOf } from './feedback';
import { type ChallengeSpec, challengeOf, challengeConfig, encodeChallenge } from '../core/challenge';
import { forSeason } from '../core/seasons';
import { Achievements } from '../core/achievements';
import { tourOn, tourTrial, tourStopOf, tourOpen, TOUR_LEVEL } from '../core/tours';
import { seasonOf } from '../core/loot';
import { TRIALS, ASCENSIONS, LANDMARKS, LEVEL_TRIALS, trial as trialById, trialConfig, trialOpen, trialProgress, rematchId, rushOpen } from '../core/trials';

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
  | { k: 'hover'; p: Vec2 | null }
  | { k: 'wheel'; p: Vec2; dy: number }
  | { k: 'selectTab'; tab: Tab }
  | { k: 'nextTab' }
  | { k: 'swipeMode'; step: number }
  | { k: 'perform'; action: ScreenAction };

/** Where sound and haptics go; the session decides what and when. */
/**
 * How a rewarded ad went: only `watched` pays (`dismissed`: closed before the end).
 */
export type RewardedOutcome = 'watched' | 'dismissed' | 'cooldown' | 'blocked' | 'unavailable';

export interface SessionOutput {
  /** `pan`: -1 (left) … 1 (right), where on screen the sound happens. */
  sound(id: SoundID, pitch: number, pan: number): void;
  haptic(id: HapticID, softness: number): void;
  /** A big moment (a boss busted, a Legendary Shift, a new Unlimited or Mayhem record, a Prestige). */
  celebrate?(): void;
  /** Plays a rewarded ad (the portal's, or Google's); false where there is none (no reward). */
  rewardedAd?(done: (outcome: RewardedOutcome) => void): boolean;
  /** An ad is ready to play, so its offers may show. Without it they never do. */
  adReady?(): boolean;
  /** The ad offers beyond the free chest (a free upgrade step, the Skin Upgrade's boost): not on a portal. Default: on. */
  adOffers?: boolean;
  /** The device can vibrate. Without it (iPhones) the camera's punch on the best merges is stronger. */
  feelsHaptics?: boolean;
}

/** One thing that changes the next shift's pay (`GameSession.modifiers`). */
export interface Modifier {
  id: 'heat' | 'tailwind' | 'afterWork' | 'streak' | 'family';
  label: string;
  tone: 'heat' | 'bonus' | 'loss';
}

/** Development only (`?ente`): the duck family crosses in every shift, a few seconds in, so it can be looked at. Not in the production build. */
const duckDemo = import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('ente');

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
  /** A growing bar sounds higher the fuller it is: semitones of a pentatonic scale over two octaves, so no two bars clash. */
  private static readonly barSteps = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
  static readonly countInSeconds = 2;
  static readonly restartLock = 0.5;
  /** A place's introduction opens this long after the player arrives. */
  static readonly introDelay = 0.6;
  /** The camera's pull-back after a lost shift (a share of the scale) and the seconds it takes out and back in. */
  static readonly lossPullBack = 0.12;
  static readonly lossPullOut = 0.8;
  static readonly lossPullIn = 0.7;
  static readonly flowFade = 0.6;

  readonly config: Config = duckDemo ? { ...baseConfig, duckChance: 1, duckDelay: { lo: 2, hi: 4 } } : baseConfig;
  world: World;
  screen: Screen = { k: 'ready' };
  save: SaveGame;
  systemReduceMotion = false;
  /** A local visual-only flag for inspecting night lighting without changing the saved shift. */
  nightPreview = false;
  /**
   * Set by the shell when the device cannot keep 30 fps even at a pixel ratio of 1: the scene
   * leaves out its decoration (ground texture, what flies through the air, cloud shadows).
   */
  lowDetail = false;
  /** The frost under a shift's top bar is made again every this many frames. */
  private static readonly frostEvery = 3;
  /** A page that has stood still under its 92 % dim: the city under it leaves out what could not be seen (`Shell.frame`). */
  sceneThin = false;

  /** A faint motion blur on the scene while the camera glides between views (Leo, 16.10.2026), in points; never with Reduce Motion or on a slow device. */
  get motionBlur(): number {
    return this.reduceMotion || this.lowDetail ? 0 : GameSession.glideBlur * this.cameraRig.motion;
  }

  static readonly glideBlur = 0.35;

  /** Recommends Reduce Motion, once ever, when the game runs slow; never switches it on. */
  recommendReduceMotion(): void {
    if (this.reduceMotion || this.save.hints.includes('reduceMotion')) return;
    this.save.hints.push('reduceMotion');
    this.persist();
    this.tip(S.hints.reduceMotion);
  }
  today = dayNumber();

  private accumulator = 0;
  private effects: CrashEffects;
  private explosions: ExplosionEffects;
  private scars = new MapScars();
  private tyreMarks = new TyreMarks();
  private brakeMarks = new BrakeMarks();
  private lampWave = new LampWave();
  private driftFx = new DriftFx();
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
  private lossPullSpeed = 0;
  private shiftStartMoney = 0;
  /** A shift has run since the game opened: before that the Daily's pill names the streak, not its pay bonus. */
  private shiftRan = false;
  private shownMoney = 0;
  private sinceMoney = Infinity;
  private resultBank = { before: 0, after: 0 };
  /** The result on screen is a Daily Shift that was lost: an ad can give it a second try (`Careers.adRetryOpen`). */
  private dailyLost = false;
  private onToday = false;
  /** The celebration on screen (`rewardBurst.ts`), and a moment the next result celebrates when it shows. */
  private burst: { burst: Burst; age: number } | null = null;
  private resultBurst: Burst | null = null;
  /** A doubled pay joins the result's money as the celebration counts it up. */
  private pendingBank: number | null = null;
  /** The won career shift's own pay on the result, booked with it: an ad can pay it once more (0: none, or already paid). */
  private resultShiftPay = 0;
  /** The ad the Game tab offers (`gameAd`): where its pill stands, which one it is, how long it has stood there, and which offers the statistics were told of. */
  private adTarget: { reward: GameAd; rect: Rect } | null = null;
  /** A crash ended the run and it may go on for an ad (Leo, 18.10.2026): its result waits, and how long since the crash. */
  private revive: { result: ShiftResult; age: number } | null = null;
  private adPillReward: GameAd | null = null;
  private adPillAge = 0;
  private readonly adTold = new Set<GameAd>();
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
  /** The Social tab's segment; its content is the shell's DOM (`ui/socialPage.ts`), which reads it every frame. */
  socialPage = new SocialState();
  builderPage = new BuilderState();
  buildPage: Tab = 'upgrades';
  private buildSlide: { from: Tab; age: number } | null = null;
  private pan = new ModePan();
  /** A sideways swipe on a page changes its segment; a Shop tap waits for the lift so a swipe that starts on a chest does not tap it. */
  private readonly swipe = new SideSwipe();
  private shopPress: ShopTarget | null = null;
  private readonly modeMessage = new ModeMessage();
  /** The waiting shift each mode was left on: swiping back finds the same sky and city, until that shift is played. */
  private readonly parked = new Map<GameMode, number>();
  /** The camera's kick as the mode changes: how long ago, and which way the swipe went. */
  private sinceModeKick = Infinity;
  /** Seconds since the last swipe to another mode: the swipe hint waits for a quiet screen after one. */
  private sinceModeSwipe = Infinity;
  /** The lit mode dot's place on the card: glides to the page index, snaps while the dots are hidden. */
  private modeDotAt = 0;
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
  /** Opens Big Screen's sheet (the shell's): pick a picture or paste a link. */
  onBackdrop: (() => void) | null = null;
  /** The player's own picture or video is ready behind the canvas (`ui/backdrop.ts`). */
  backdrop = false;
  playingMode: GameMode = 'shift';
  private shownFlames = 0;
  private sinceFlames = Infinity;
  private lastViewport = v(430, 900);
  /** A mouse over the canvas (no button down): the top card's columns lift under it, and the shell shows the hand (`overTopBar`). */
  private hoverPoint: Vec2 | null = null;
  private topLit = 1;
  private frameDelta = 0;
  /** The camera of the last frame: places sounds left or right. */
  private lastCamera: Camera | null = null;
  private lastInset = 0;
  private readonly notices = new NoticeQueue();
  private readonly tips = new TipQueue();
  /** Something new on the road takes the top card for a while, with what to do (`Briefings`). */
  private readonly briefings = new Briefings();
  /** What the Museum notes and explains on the road (`museumFlow.ts`), through its host. */
  private readonly museum = new MuseumFlow(this.museumHost());
  private transitions = new TransitionTracker();
  playingLevel = 1;
  dailySelected = false;
  playingDaily = false;
  /** The waiting shift was set up in the After Work hours and pays for them. */
  private afterWork = false;
  private dailySplash: number | null = null;
  private splits: number[] = [];
  private raceDelta: number | null = null;
  /** The best this run plays against (`Goals.record`; 0 for none), how far it has come to it, and since when. */
  private recordBest = 0;
  private recordStage: 'far' | 'near' | 'beaten' = 'far';
  private recordNear = 0;
  private recordBeatAt: number | null = null;
  private sinceRecord = Infinity;
  /** The mix the music should play; `main.ts` fades its stems to it. */
  musicMix: MusicMix = Music.silent;
  /** The sky as heard: rain while the scene is on screen, and a strike for each flash of lightning. */
  weatherSound: WeatherSound = { rain: 0, strikes: 0 };

  /** Every vehicle on the road for the traffic bed (`AudioPlayer.updateTraffic`); empty while a page covers the street. */
  get trafficSound(): TrafficSound[] {
    if (this.screen.k === 'page') return [];
    const world = this.world;
    const out: TrafficSound[] = [];
    for (const veh of world.vehicles) {
      const engine = engineOf(veh.type);
      if (!engine || veh.isCrashed) continue;
      const p = veh.phase;
      const speed = Math.hypot(veh.position.x - veh.prevPosition.x, veh.position.y - veh.prevPosition.y) / STEP / world.config.ringSpeed;
      // Pulling onto the ring it works hardest; braking it coasts; standing it idles.
      const load = p.kind === 'merging' ? 1 : (p.kind === 'ring' || p.kind === 'exiting') && !p.drive.isBraking ? 0.4 : p.kind === 'queued' || p.kind === 'waiting' ? 0.15 : 0;
      out.push({ id: veh.id, engine, speed: Math.min(speed, 1.5), load, x: veh.position.x, y: veh.position.y });
    }
    return out;
  }

  /** The drift car's engine, turbo and tyres; only while a shift is on screen. */
  get driftSound(): DriftSound | null {
    return this.screen.k === 'playing' ? this.driftFx.sound(this.world) : null;
  }
  private flash = { period: 0, index: 0 };
  /** How tense the casino is right now, 0…1: the shell turns it into a riser and a heartbeat. */
  tension = 0;
  /** The detail sheet over a page: open after a card was tapped (`ui/detailSheet.ts`). */
  private openDetail = false;
  get detailOpen(): boolean {
    return this.openDetail;
  }
  set detailOpen(open: boolean) {
    this.openDetail = open;
    // Whatever else opens or changes the sheet takes the place of an introduction.
    if (open) this.introShown = null;
  }
  /** The place whose introduction the sheet shows (`Intros`), and which one the player is looking at and for how long. */
  private introShown: Intro | null = null;
  private introWatch: { intro: Intro | null; age: number } = { intro: null, age: 0 };
  /** How much of the screen the open sheet covers (points); the shell reports it. */
  sheetInset = 0;
  private pressAt: Vec2 | null = null;
  private revealUpgrade: Upgrade | null = null;
  private revealProgress: ProgressTarget | null = null;
  /** Tells the page when the tab bar or badges changed. */
  onChrome: (() => void) | null = null;
  /** Progress came over from another device: the shell lets the Settings pill say so for a moment. */
  onSynced: (() => void) | null = null;
  /** A swipe hit the end of a page's segments: +1 is the right edge, -1 the left. */
  onRumble: ((way: -1 | 1) => void) | null = null;
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
    Intros.start(this.save, this.config);
    News.start(this.save);
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
    return { level: save.career.level, prestige: save.career.prestige, unlimitedBest: save.unlimitedBest, unlimitedCars: save.unlimitedBestCars, unlimitedRevived: save.unlimitedBestRevived, dailyDay: save.dailyDay, dailyScore: save.dailyScore, dailyTries: save.dailyTries, rushBest: save.career.rushBest, casinoProfit: Unlocks.isKnown(save.career, 'casino', this.config) ? save.career.casinoProfit : null, title: Mafia.late(save.career) ? 'mafia' : save.career.title };
  }

  get visibleUpgrades(): readonly Upgrade[] {
    return Careers.availableUpgrades(this.save.career, this.config);
  }

  /** The Club's sheet changed the career (a lot begun or won, a gift): written now. */
  clubChanged(): void {
    this.persist();
  }

  private persist(): void {
    const earned = Achievements.sync(this.save);
    if (earned.length > 3) this.notices.achieve(S.ach.many(earned.length, Fmt.number(earned.reduce((n, e) => n + e.reward, 0))));
    else this.notices.achieve(...earned.map((e) => S.ach.reached(e.family, e.tier, Fmt.number(e.reward))));
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

  private visit: Record<string, string> | null = null;
  private visitNoted = false;

  /**
   * One count per start (Leo, 09.10.2026), worked out on this device from the save and sent as coarse steps: no date,
   * no ID. It is how D1 and D7 are read without cohorts: the starts whose `since` is 1 or 4-7 against the starts of the
   * days before. Called before the day's login is booked, which overwrites the last day.
   */
  private noteVisit(): void {
    if (this.visitNoted) return;
    this.visitNoted = true;
    const { save, today } = this;
    const last = save.career.lastLoginDay;
    if (save.firstDay < 0 && last < 0 && save.shiftsPlayed === 0) save.firstDay = today;
    const bucket = (days: number): string => (days <= 1 ? String(Math.max(0, days)) : days <= 3 ? '2-3' : days <= 7 ? '4-7' : days <= 14 ? '8-14' : days <= 30 ? '15-30' : '31+');
    this.visit = {
      kind: last >= 0 ? 'back' : 'new',
      since: last >= 0 ? bucket(today - last) : 'new',
      first: save.firstDay >= 0 ? bucket(today - save.firstDay) : 'old',
      channel: inPlayStore ? 'play' : isInstalled() ? 'app' : 'tab',
      build: latestNote().split('#')[0] ?? '',
    };
    this.flushVisit();
  }

  private awayNews: PatchNote[] = [];
  /** Opens the shell's sheet of what is new since a long absence. */
  onAwayNews: ((notes: PatchNote[]) => void) | null = null;

  /** Back after a long absence: the summaries of the patch notes since the last visit, three lines at most. */
  private noteAwayNews(since: number): void {
    const last = new Date(since * 86400000).toISOString().slice(0, 10);
    let lines = 3;
    this.awayNews = PATCH_NOTES.filter((n) => n.id.slice(0, 10) > last).flatMap((n) => {
      const summary = n.summary.slice(0, lines);
      lines -= summary.length;
      return summary.length > 0 ? [{ ...n, summary }] : [];
    });
    this.flushAwayNews();
  }

  /** Hands the news on once someone listens (`onAwayNews` is set after the session is built). */
  flushAwayNews(): void {
    if (this.awayNews.length === 0 || !this.onAwayNews) return;
    this.onAwayNews(this.awayNews);
    this.awayNews = [];
  }

  /** Hands the visit on once someone listens (`onStep` is set after the session is built). */
  flushVisit(): void {
    if (!this.visit || !this.onStep) return;
    this.onStep('visit', this.visit);
    this.visit = null;
  }

  collectLoginIncome(): void {
    this.noteVisit();
    const career = this.save.career;
    // Worked out before the login is booked: the last day is overwritten there.
    const away = career.lastLoginDay >= 0 ? this.today - career.lastLoginDay : 0;
    const endedStreak = away > 0 && career.dailyStreak >= 2 && Goals.streak(career, this.today) === 0 ? career.dailyStreak : 0;
    const since = career.lastLoginDay;
    const comeback = this.save.tutorialDone && Careers.giveComebackChest(career, this.today, this.config);
    const income = Careers.collectLoginIncome(career, this.today, this.config);
    Careers.collectGift(career, this.today);
    // A loan that fell due while the game was shut: one day of grace, so staying away never costs a loan.
    const graced = Mafia.returned(career, Date.now());
    this.persist();
    if (graced) this.announce(S.mafia.notices.grace);
    if (comeback) {
      this.announce(S.daily.comebackChest(S.shop.chest('premium')));
      this.noteAwayNews(since);
    }
    if (income !== null) this.announce(S.daily.welcomeBack(Fmt.number(income)));
    else if (this.save.tutorialDone && endedStreak > 0) this.announce(S.daily.streakEnded(endedStreak));
    this.announceInvite();
    void this.announceNewIdea();
  }

  /**
   * A new idea in the Game fund since the player last looked (Leo, 13.10.2026): said once, when the game opens, for players
   * who have the Club. The first look only remembers what is there. Offline or without the service there is nothing to say.
   */
  private async announceNewIdea(): Promise<void> {
    const career = this.save.career;
    if (!ideasEnabled || !this.save.tutorialDone || !Auction.isOpen(career)) return;
    const view = await fetchIdeas().catch(() => null);
    const fresh = view?.ideas.filter((i) => i.status !== 'built').sort((a, b) => b.at - a.at)[0];
    if (!fresh || fresh.at <= career.ideasSeenAt) return;
    const first = career.ideasSeenAt === 0;
    career.ideasSeenAt = fresh.at;
    this.persist();
    if (!first) this.announce(S.clubPanel.newIdea(fresh.title));
  }

  private tipTaken = false;

  /**
   * One tip per visit (Leo, 04.10.2026): installing, notifications and the invite all
   * wait for their turn, so the game never opens on a stack of them. True for the first one asked in a visit; a
   * tip refused here is not marked as given and comes back at the next visit (or shift).
   */
  takeTip(): boolean {
    if (this.tipTaken) return false;
    this.tipTaken = true;
    return true;
  }

  /** A one-time question the shell asks was answered (the player name declined): it is not asked again by itself. */
  markHint(hint: Hint): void {
    if (this.save.hints.includes(hint)) return;
    this.save.hints.push(hint);
    this.persist();
  }

  /** A hint that came due but had to wait (`takeTip`): it is due again the next time. */
  deferHint(hint: Hint): void {
    this.save.hints = this.save.hints.filter((h) => h !== hint);
    this.persist();
  }

  /**
   * Once for everyone who knows the game (Leo, 04.10.2026): the friend code is an invite, and both get a chest
   * when the friend reaches level 5. Only where the service can pay (`leaderboardEnabled`) and links work (not
   * inside CrazyGames); one tip per visit (`takeTip`).
   */
  private announceInvite(): void {
    if (inPortal || !leaderboardEnabled || !this.save.tutorialDone || this.save.hints.includes('invite') || !this.takeTip()) return;
    this.save.hints.push('invite');
    this.store();
    this.tip(S.hints.invite);
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

  /**
   * A result worth a picture (Leo, 16.10.2026): a challenge or trial, a record off the career, a Perfect Run, a boss
   * busted or a Legendary Shift cleared. An ordinary loss offers none (the career's best grows almost every shift).
   */
  get resultWorthPicture(): boolean {
    if (this.screen.k !== 'result') return false;
    const { result, mode, run, isNewHighscore } = this.screen.summary;
    if (run) return true;
    if (mode !== 'shift') return isNewHighscore;
    if (this.dailySelected && result.outcome === 'completed') return true;
    return (
      result.outcome === 'completed' &&
      (result.isPerfectRun || result.bossBusted || result.legendary !== null || result.tightFits >= 3 || result.perfects >= 5)
    );
  }

  private isPage(tab: Tab): boolean {
    return this.screen.k === 'page' && this.screen.tab === tab;
  }

  // MARK: Screen flow

  perform(action: ScreenAction): void {
    const save = this.save;
    const career = save.career;
    switch (action.k) {
      case 'closeDetail':
        this.closeDetail();
        break;
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
        const tip = this.tips.view;
        this.modeMessage.swipe(mode, tip ? { brief: GameSession.tipBrief(tip.tip), amount: tip.amount } : this.modeHint > 0.05 ? { brief: TopBar.swipeBrief(), amount: this.modeHint } : undefined);
        this.tips.dismiss();
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
        if (!same) this.landOnDot(tab);
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
      case 'showSocial':
        this.perform({ k: 'showTab', tab: 'social' });
        if (!this.isPage('social')) return;
        this.socialPage.select((action.section === SOCIAL.club && !SocialPage.clubOpen(career)) || (action.section === SOCIAL.mafia && !SocialPage.mafiaOpen(career)) ? SOCIAL.ranks : action.section);
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
        this.play(['uiTick'], ['snap']);
        break;
      }
      case 'buildPart':
        this.buildFlow.buildPart();
        break;
      case 'removePart':
        // The placed part fades off its slot (`builder.ts`, removeDuration); the tick then clears it.
        if (!this.builderPage.pending) break;
        this.detailOpen = false;
        if (this.builderPage.removing === 0) this.builderPage.removing = 0.001;
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
        if (!Careers.buyChest(career, action.kind, this.config, action.bundle)) {
          this.shopPage.denied = 0.001;
          this.play(['denied'], []);
          this.denyMoney((action.bundle ? chestBundle(action.kind, this.config)?.price : chestPrice(action.kind, this.config)) ?? 0);
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
      case 'watchAdGame':
        this.adFlow.watch(action.reward);
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
        if (action.k === 'showElite') this.eliteSeen = true;
        if (!this.detailOpen) this.tick();
        this.detailOpen = true;
        break;
      case 'buyPass':
        const paid = SeasonPass.buy(career, this.today, this.config);
        if (paid) {
          this.persist();
          this.play(['paid'], ['comboUp']);
          // The tiers reached before it was bought pay now; chests show in the Shop by themselves.
          for (const step of paid) if (step.reward.k !== 'chest') this.announce(S.pass.reached(step));
        }
        break;
      case 'wear': {
        const item = cosmetic(action.id);
        if (!Careers.wear(career, action.id) && item?.kind === 'carSkin' && Careers.owns(career, action.id)) this.showNotice(S.shop.skinsFull(Careers.skinSlots(career)));
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
        this.blink();
        break;
      case 'toggleHaptics':
        save.settings.haptics = !save.settings.haptics;
        this.persist();
        this.blink();
        break;
      case 'toggleVehicleLabels':
        save.settings.vehicleLabels = !save.settings.vehicleLabels;
        this.persist();
        this.blink();
        break;
      case 'cycleReduceMotion': {
        const all = ['system', 'on', 'off'] as const;
        save.settings.reduceMotion = all[(all.indexOf(save.settings.reduceMotion) + 1) % all.length];
        this.persist();
        this.blink();
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
    if (strong && hits >= 3) this.playReel('shimmer', 0.7 + 0.12 * hits, []);
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
    if (!this.showsChrome || (k !== 'ready' && k !== 'result') || this.special || this.versusSelected) return 0;
    if (k === 'result' && this.resultAge < this.resultLock) return 0;
    return this.save.career.chests.length;
  }

  /** A reply to what the player just did: shown at once. */
  showNotice(textValue: string): void {
    this.notices.say(textValue);
  }

  denyMoney(price: number): void {
    const missing = price - this.save.career.money;
    if (missing > 0) this.showNotice(S.notice.notEnoughMoney(Fmt.number(missing)));
  }

  /** The notice showing right now, for the screen reader's live region. */
  get noticeText(): string | null {
    const brief = this.screen.k === 'playing' ? this.briefings.view : null;
    return this.notices.shown?.text ?? (brief ? `${brief.brief.caption}. ${brief.brief.text}` : null);
  }

  /** A crew's invite link was opened: where to join it, once. */
  noteCrewInvite(): void {
    this.announce(S.crew.inviteWaits);
  }

  /** A friend's invite was kept: told here, so the general invite tip does not say it again. */
  noteInvited(needsName: boolean): void {
    this.announce(needsName ? S.hints.invitedNeedsName : S.hints.invited);
    this.tips.drop(S.hints.invite);
    if (this.save.hints.includes('invite')) return;
    this.save.hints.push('invite');
    this.store();
  }

  /** News for the player: each line gets its own turn. */
  announce(...texts: string[]): void {
    this.notices.announce(...texts);
  }

  /** A tip: it waits for the waiting screen and takes the top card for a few seconds (`TipQueue`). */
  tip(...tips: Tip[]): void {
    this.tips.add(...tips);
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
    this.recordBest = special ? 0 : this.playingMode === 'shift' ? this.save.highscore : this.playingMode === 'unlimited' ? this.save.unlimitedBest : 0;
    this.recordStage = 'far';
    this.recordNear = 0;
    this.recordBeatAt = null;
    this.sinceRecord = Infinity;
    const cfg = special ? this.specialConfig(special) : this.shiftConfig(s);
    // A challenge or trial never carries traffic over: it starts fresh, the same for everyone.
    if (continuing && !special) this.world = this.world.nextShift(cfg, s);
    else {
      this.world = new World(cfg, s, { startsOnFirstTap: true });
      this.resetScene();
    }
    this.pendingSummary = null;
    this.sinceComboTier = Infinity;
    this.sinceMark = Infinity;
    this.topMark = 0;
    this.museum.owe(this.briefings.clear());
    this.screen = next;
    this.onChrome?.();
  }

  private shiftConfig(seed: number): Config {
    // The Daily Shift pins its city event and is never a Legendary Shift.
    const daily = this.dailySelected;
    // The season tilts the sky of career shifts.
    const season = this.save.mode === 'shift' ? seasonOf(this.today) : null;
    const seasonal = forSeason(this.config, season);
    // A plain career shift is eased by what this career has been through (`Careers.careerShift`); the Daily never is.
    const base =
      this.save.mode === 'shift' && !daily
        ? Careers.careerShift(this.save.career, seasonal, seed)
        : Careers.shiftConfig(this.save.career, this.save.mode, seasonal, seed, daily ? dailyEvent(this.today) : undefined, daily ? null : undefined);
    // A living Daily streak, a waiting Tailwind, After Work and the Heat pay more on a career shift (Mayhem pays in flames).
    this.afterWork = Goals.afterWork(this.save.mode, daily, new Date().getHours(), this.config);
    if (this.save.mode === 'mayhem') return base;
    const heat = !daily && this.save.mode === 'shift' ? Careers.maxHeat(this.save.career, this.today, this.config) : 0;
    const cfg = forHeat(base, heat);
    const bonus = (Goals.streakBonus(this.save.career, this.today, this.config) ? this.config.streakBonusPay : 0) + (Goals.tailwindOn(this.save.career, this.save.mode, daily) ? this.config.tailwindPay : 0) + (this.afterWork ? this.config.afterWorkPay : 0) + heatPay(heat, this.config);
    return bonus > 0 ? Goals.forPay(cfg, bonus) : cfg;
  }

  private specialConfig(run: SpecialRun): Config {
    return run.k === 'challenge' ? challengeConfig(run.spec, this.config) : trialConfig(run.trial, this.config, this.save.career.upgrades);
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
    if ((TRIALS.includes(t) || ASCENSIONS.includes(t) || LANDMARKS.includes(t) || LEVEL_TRIALS.some((x) => x.id === t.id)) && !trialOpen(t, this.save.career)) {
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
      this.onStep?.('tutorial-done');
    }
    this.onStep?.('special', { kind: run.k, outcome: result.outcome });
    this.bookFailure(result);
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
      denyMoney: (price) => this.denyMoney(price),
      announceAlbums: () => this.announceAlbums(),
      watchAdBoost: () => this.perform({ k: 'watchAdBoost' }),
    };
  }

  private museumHost(): MuseumHost {
    const session = this;
    return {
      get save() {
        return session.save;
      },
      get world() {
        return session.world;
      },
      get tutorial() {
        return session.tutorial;
      },
      get briefings() {
        return session.briefings;
      },
      get briefs() {
        return session.briefs;
      },
      persist: () => this.persist(),
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
      denyMoney: (price) => this.denyMoney(price),
      pressed: (point) => (this.pressAt = point),
      rewardedAd: (done) => this.output?.rewardedAd?.(done) ?? false,
      get adOffers() {
        return session.adOffer.offers;
      },
      get dailyPay() {
        return session.dailyPay;
      },
      get shiftPay() {
        return session.shiftPay;
      },
      get canRevive() {
        return session.revive !== null;
      },
      reviveRun: () => this.reviveRun(),
      bankResult: (amount) => {
        this.resultBank = { before: this.resultBank.before, after: this.resultBank.after + amount };
        this.resultShiftPay = 0;
        this.play(['purchase'], ['paid']);
      },
      report: (step, reward) => this.onStep?.('ad', { reward, step }),
      celebrate: (burst) => this.celebrate(burst),
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
    this.brakeMarks.clear();
    this.driftFx.clear();
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
    // The offer to keep driving holds the road still once the crash has had its moment; it runs out unless an ad is on its way.
    const revive = this.revive;
    if (revive && !this.adFlow.busy) {
      revive.age += realDelta;
      if (revive.age >= this.config.reviveBreath + this.config.reviveWindow) this.declineRevive();
    }
    const runs = !this.isInterrupted && this.countIn === 0 && !(this.revive && this.revive.age >= this.config.reviveBreath);
    if (runs) {
      this.accumulator += simDelta;
      this.sceneTime += simDelta;
    }
    this.keepDailyInStep();
    this.keepMafiaInStep();
    for (const a of actions) this.handle(a, simDelta);
    this.frameDelta = realDelta;
    this.easeTopHover(realDelta);
    this.easeIntro(realDelta);
    // A condition's sheet belongs to the waiting shift it was opened on.
    const shown = this.conditionShown;
    if (shown && !this.conditionHeld(shown)) this.closeDetail();

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
      this.museum.noteSightings();
      this.briefings.advance(simDelta, this.world);
      this.age(simDelta);
      this.lamps.calm = this.reduceMotion;
      this.lamps.update(this.world, simDelta);
      const lit = this.world.shift.phase !== 'waiting' && this.world.shift.phase !== 'ended';
      // A new shift begins: the street lamps come on, and the last shift's brake marks fade.
      if (lit && !this.lampWave.lit) this.brakeMarks.fade();
      this.lampWave.update(lit, simDelta, this.reduceMotion);
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
    this.adPillAge += realDelta;
    // Whether anyone finds the Today page, and whether the Daily still waits when they do (Leo, 16.10.2026).
    const onToday = this.isPage('progress') && this.progressPage.section === PROGRESS.today;
    if (onToday && !this.onToday) this.onStep?.('today-open', { daily: Careers.isDailyOpen(this.save.career, this.today) ? 1 : 0 });
    this.onToday = onToday;
    if (this.burst) {
      this.burst.age += realDelta;
      if (this.pendingBank !== null && this.burst.age >= 1.5) {
        this.resultBank = { before: this.resultBank.before, after: this.pendingBank };
        this.pendingBank = null;
        this.play(['purchase'], ['paid']);
      }
      if (this.burst.age >= RewardBurst.duration) this.burst = null;
    }
    const tense = this.screen.k === 'playing' && !this.tutorial;
    this.cameraFx.update(tense ? tensionOf(this.world, this.playingMode) : 0, realDelta);
    this.cameraFx.watchFinal(this.world, tense);
    this.sinceFatalCrash += realDelta;
    this.sinceLoss += realDelta;
    let lossShown = false;
    if (this.screen.k === 'playing') lossShown = this.pendingSummary !== null && this.pendingSummary.result.outcome !== 'completed';
    else if (this.screen.k === 'result') {
      const s = this.screen.summary;
      // A lost shift's breather: the camera stays out while it holds and leans back in the moment a tap starts the next shift.
      lossShown = s.result.outcome !== 'completed' && (ResultBanner.breathes(s) ? this.resultAge < ResultBanner.breath : ResultBanner.settled(this.resultAge) < 0.5);
    }
    const pullTarget = lossShown && !this.reduceMotion ? 1 : 0;
    // A critically damped spring (smooth damp): drifts out slowly, and eases into the lean-in instead of snapping.
    const w = 2 / (pullTarget ? GameSession.lossPullOut : GameSession.lossPullIn);
    const dt = Math.min(realDelta, 0.1);
    const x = w * dt;
    const damp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const change = this.lossPull - pullTarget;
    const carry = (this.lossPullSpeed + w * change) * dt;
    this.lossPullSpeed = (this.lossPullSpeed - w * carry) * damp;
    this.lossPull = pullTarget + (change + carry) * damp;
    this.sinceFlames += realDelta;
    const flames = this.world.score.flames;
    this.shownFlames = this.reduceMotion || Math.abs(flames - this.shownFlames) < 1 ? flames : this.shownFlames + (flames - this.shownFlames) * Math.min(1, realDelta / GameSession.scoreCatchUp);
    this.sinceComboTier += realDelta;
    this.sinceCarSent += realDelta;
    this.sinceMark += realDelta;
    this.sinceRecord += realDelta;
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
    if (this.screen.k === 'playing') this.watchRecord();
    if (this.dailySplash !== null && this.screen.k === 'ready') {
      this.dailySplash = this.dailySplash + realDelta < ReadyBanner.splashDuration ? this.dailySplash + realDelta : null;
    }
    // A crash the shift survives (the shield, a police car within its limit) heals the ring; the last one flushes it.
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
    const money = Math.max(0, this.shiftStartMoney + this.world.score.money);
    if (money > this.shownMoney + 0.5) this.sinceMoney = Math.min(this.sinceMoney, 0);
    this.sinceMoney += realDelta;
    if (Math.abs(money - this.shownMoney) < 1 || this.reduceMotion) this.shownMoney = money;
    else this.shownMoney += (money - this.shownMoney) * Math.min(1, realDelta / GameSession.scoreCatchUp);
    this.sinceReady = this.screen.k === 'ready' ? this.sinceReady + realDelta : 0;
    this.watchCity(realDelta);
    this.watchIntro(realDelta);
    this.watchNews(realDelta);
    this.watchPlace(realDelta);
    const cardFree = this.screen.k === 'ready' && this.takesModeSwipe && !this.versusSelected;
    this.tips.advance(realDelta, cardFree, cardFree && this.notices.isEmpty && this.modeHint < 0.05 && this.modeMessage.view(0) === null, this.reduceMotion);
    const hintTarget = this.showsModeHint ? 1 : 0;
    this.modeHint = this.reduceMotion ? hintTarget : Math.max(0, Math.min(1, this.modeHint + (hintTarget ? 1 : -1) * (realDelta / 0.35)));
    const dotGoal = SWIPE_MODES.indexOf(this.swipeMode);
    this.modeDotAt = this.reduceMotion || !this.showsModeDots ? dotGoal : this.modeDotAt + (dotGoal - this.modeDotAt) * (1 - Math.exp(-realDelta * 14));
    this.tutorial?.advance(realDelta);
    if (this.tutorial?.isDone) this.tutorial = null;
    this.transitions.advance(realDelta);

    if (this.isPage('upgrades')) {
      this.upgradePage.advance(realDelta);
      this.revealAboveSheet();
      if (this.upgradePage.follow(realDelta, this.upgradeScrollRange)) this.play([], ['edge']);
    }
    else this.upgradePage = new UpgradeState();
    if (this.isPage('shop')) {
      const before = this.shopPage.opening?.age ?? null;
      this.shopPage.advance(realDelta);
      // The Collection's grid glides on after a flick and springs back past its ends.
      this.revealItemAboveSheet();
      if (this.shopPage.items.follow(realDelta, this.collectionScrollRange)) this.play([], ['edge']);
      const after = this.shopPage.opening?.age ?? null;
      const opening = this.shopPage.opening;
      if (opening && before !== null && after !== null) this.reelCues(opening, before, after);
      // Once the casino is open it loads in the background, so its section is there at once.
      if (Unlocks.isOpen(this.save.career, 'casino', this.config)) loadCasino().catch(() => undefined);
      const casino = this.shopPage.casino;
      // The boost row is there while an ad can play, and while a boost already waits for its round.
      if (casino) casino.ad = { ...this.adOffer, offers: this.adOffer.offers && (this.adOffer.ready || this.save.career.upgradeBoost) };
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
      if (this.progressPage.follow(realDelta, this.progressScrollRange)) this.play([], ['edge']);
      // A goal reached sends its wave on the page (`Meter`); the hand feels it with it, like a payout.
      if (Meter.landed()) this.play(['paid'], ['earned']);
      const grew = Meter.grew();
      if (grew !== null && this.save.settings.sound) this.output?.sound('barFill', Math.pow(2, GameSession.barSteps[Math.min(GameSession.barSteps.length - 1, Math.floor(grew * GameSession.barSteps.length))] / 12), 0);
    } else if (this.progressPage.age !== 0 || this.progressPage.section !== PROGRESS.today) {
      this.leaveMuseum();
      this.progressPage = new ProgressState();
    }
    if (this.isPage('social')) this.socialPage.advance(realDelta);
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
      if (this.builderPage.removing > StreetBuilderPage.removeDuration) {
        this.builderPage.pending = null;
        this.builderPage.removing = 0;
      }
    } else {
      this.builderPage = new BuilderState();
    }
    this.notices.held = this.screen.k === 'playing';
    this.notices.advance(realDelta);
    this.musicMix = this.screen.k === 'playing' && runs ? Music.playing(this.world, this.flowLevel, this.recordStage === 'far' ? null : { near: this.recordNear, beatAt: this.recordBeatAt }) : Music.silent;
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
    const loan = this.save.career.loan;
    this.rim.debt = loan && Ease.clamp01((Date.now() - loan.taken) / Math.max(1, loan.due - loan.taken));
    this.rim.debtLate = loan?.late === true;
    if (this.screen.k === 'result') {
      if (this.resultAge < RingSignals.hold) return;
      // The Elite bar has the rim until the next shift's ticks arrive with its banner.
      if (this.screen.summary.elite && ResultBanner.settled(this.resultAge) < 0.5) {
        this.rim.follow(0, 0, 'primary');
        return;
      }
    }
    const left = this.world.carsLeft;
    if (left === null) {
      this.rim.follow(0, 0, 'primary');
      return;
    }
    const total = this.world.config.shiftCars;
    this.rim.follow(total, Math.max(0, total - left), this.world.shift.isRushHour ? 'rushHour' : 'primary');
  }

  /** The rim's signals, and on a result the Elite bar the shift just fed (`RingSignals.elite`). */
  private addRim(list: RenderList, world: World, reduceMotion: boolean): void {
    this.rim.add(list, world, reduceMotion);
    const screen = this.screen;
    if (screen.k !== 'result') return;
    const opacity = 1 - Ease.clamp01(ResultBanner.settled(this.resultAge) * 2);
    const frame = { rim: RingSignals.rim(world), start: world.layout.player.angle, outer: world.layout.ringRadius + world.layout.laneWidth / 2 };
    // The dusk sits on the island's edge, at the kerb, so the Elite bar on the rim never mixes with it.
    if (ResultBanner.breathes(screen.summary)) RingSignals.dusk(list, world.layout.islandRadius, this.resultAge, reduceMotion, opacity);
    if (!screen.summary.elite) return;
    RingSignals.elite(list, frame, screen.summary.elite, this.resultAge - RingSignals.hold, reduceMotion, opacity);
  }

  /** A tap for the world, timestamped when it happened (not when the frame saw it). */
  private tapWorld(ago: number | undefined, simDelta: number): void {
    const present = this.world.time + this.accumulator;
    const back = ago === undefined ? simDelta / 2 : ago * this.timeScale;
    this.world.tap(Math.max(this.world.time, present - back));
  }

  private handle(a: InputAction, simDelta: number): void {
    // While the offer to keep driving stands: its pill (or Enter) watches the ad, any other tap ends the run.
    if (this.revive && this.screen.k === 'playing' && (a.k === 'tap' || a.k === 'confirm' || a.k === 'pointerDown')) {
      if (this.reviveLeft === null || this.adFlow.busy) return;
      const onPill = a.k === 'confirm' || (a.k === 'pointerDown' && this.adTarget?.reward === 'revive' && R.contains(this.adTarget.rect, a.p));
      if (onPill) this.adFlow.watch('revive');
      else this.declineRevive();
      return;
    }
    // With a condition's or failure's sheet open, the next tap or key only closes it: it never starts the shift.
    if ((a.k === 'tap' || a.k === 'confirm') && this.conditionShown && this.detailOpen && (this.screen.k === 'ready' || this.screen.k === 'result')) {
      this.closeDetail();
      this.tick();
      return;
    }
    switch (a.k) {
      case 'tap':
        switch (this.screen.k) {
          case 'playing': {
            const summary = this.pendingSummary;
            if (summary && summary.result.outcome !== 'completed' && !ResultBanner.breathes(summary) && this.sinceLoss >= GameSession.restartLock) {
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
            if (this.resultAge >= this.resultLock && !this.pan.travel && Math.abs(this.pan.pan) < ModePan.swipeThreshold) {
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
      case 'hover':
        this.hoverPoint = a.p;
        break;
      case 'pointerMove': {
        if (this.pan.drag) {
          this.pan.move(a.p);
          return;
        }
        const way = this.swipe.move(a.p);
        if (way !== 0) this.stepSection(way);
        if (this.swipe.sideways) {
          this.cancelPress();
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
      }
      case 'pointerUp': {
        const swiped = this.swipe.sideways;
        this.swipe.release();
        if (swiped) {
          this.cancelPress();
          return;
        }
        if (this.shopPress) {
          const target = this.shopPress;
          this.shopPress = null;
          this.shopFlow.tapShop(target);
          return;
        }
        if (this.pan.drag) {
          const r = this.pan.release(a.p, this.lastViewport.x);
          if (r === 'tap') this.handle({ k: 'tap' }, simDelta);
          else if (r !== null) this.handle({ k: 'swipeMode', step: r }, simDelta);
          return;
        }
        if (this.isPage('upgrades') && this.upgradePage.drag) {
          if (this.upgradePage.release()) {
            const upgrade = UpgradePage.cardAt(a.p, this.lastViewport, this.tabInset, this.visibleUpgrades, this.upgradePage.scroll);
            if (upgrade) this.perform({ k: 'selectUpgrade', upgrade });
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
        if (this.screen.k === 'page') {
          this.stepSection(a.step < 0 ? -1 : 1);
          return;
        }
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
    this.swipe.release();
    this.shopPress = null;
    const page = this.pageAction(point);
    if (page === true) return;
    if (page) {
      this.handle(page, simDelta);
      return;
    }
    const inset = this.tabInset;
    if (this.isPage('upgrades')) {
      // A press on the list is a tap or the start of a scroll; the lift decides.
      if (R.contains(UpgradePage.listArea(this.lastViewport, inset), point)) {
        this.upgradePage.press(point.y);
        this.swipe.press(point);
      } else this.tapAway();
      return;
    }
    if (this.isPage('shop')) {
      const shop = this.shopPage;
      // The Collection's grid scrolls: a press there is a tap or the start of a scroll.
      if (ShopPage.inItems(point, this.lastViewport, inset, shop)) {
        shop.items.press(point.y);
        this.swipe.press(point);
        return;
      }
      const target = ShopPage.targetAt(point, this.lastViewport, inset, this.save.career, shop);
      if (!target) {
        if (!shop.busy) this.swipe.press(point);
        this.tapAway();
        return;
      }
      // The segments and the casino answer at once; the rest waits for the lift, so a swipe that begins on a chest is a swipe.
      if (target.k === 'section' || target.k === 'casino' || shop.busy) this.shopFlow.tapShop(target);
      else {
        this.swipe.press(point);
        this.shopPress = target;
      }
      return;
    }
    if (this.isPage('streetBuilder')) {
      if (this.builderIdleAt(point)) this.swipe.press(point);
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
        p.museum.selected = null;
        this.perform({ k: 'showElite' });
        break;
      case 'pass':
        p.feat = null;
        this.perform({ k: 'showPass' });
        break;
      case 'stats':
        this.tick();
        p.statsOpen = !p.statsOpen;
        break;
      case 'weekly':
        this.startSpecial({ k: 'trial', trial: weeklyTrial(weekNumber(this.today)) });
        break;
      case 'streak':
        if (!p.streak) this.tick();
        p.streak = true;
        this.detailOpen = true;
        this.revealProgress = target;
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
    if (this.progressPage.section !== PROGRESS.stats) return;
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

  /** Whether briefings belong on the top card now: a shift of your own, past the tutorial. */
  private get briefs(): boolean {
    return this.screen.k === 'playing' && !this.versusSelected && this.playingMode !== 'mayhem' && (this.tutorial?.isOver ?? true);
  }

  /** A tap on a condition's icon: its Museum sheet over the Game tab; a second tap closes it. */
  private showCondition(id: string): void {
    this.tick();
    if (this.save.career.museumNew.includes(id)) {
      Careers.markMuseumSeen(this.save.career, [id]);
      this.persist();
    }
    if (this.conditionShown === id) {
      this.closeDetail();
      return;
    }
    this.conditionShown = id;
    this.detailOpen = true;
  }

  /** The introduction of the place the player is on, if it has one. */
  private get introHere(): Intro | null {
    if (this.screen.k !== 'page') return null;
    switch (this.screen.tab) {
      case 'streetBuilder':
        return 'builder';
      case 'shop':
        return this.shopPage.section === 2 ? 'casino' : null;
      case 'social':
        return this.socialPage.section === SOCIAL.club ? 'club' : this.socialPage.section === SOCIAL.mafia ? 'mafia' : this.socialPage.section === SOCIAL.crew ? 'crew' : null;
      case 'progress': {
        const section = this.progressPage.section;
        const here: Intro[] = section === PROGRESS.today ? ['daily'] : section === PROGRESS.goals ? ['pass', 'trials'] : ['museum'];
        return here.find((i) => Intros.isPending(this.save, i, this.config)) ?? here[0];
      }
      default:
        return null;
    }
  }

  /** The first time a place with an introduction is open, once the page has settled, its drawer comes up by itself. */
  private watchIntro(dt: number): void {
    const here = this.introHere;
    const watch = this.introWatch;
    if (watch.intro !== here) {
      watch.intro = here;
      watch.age = 0;
    }
    watch.age += dt;
    if (!here || watch.age < GameSession.introDelay || this.detailOpen || this.shopPage.busy) return;
    if (!Intros.isPending(this.save, here, this.config)) return;
    Intros.mark(this.save, here);
    this.persist();
    this.tick();
    this.detailOpen = true;
    this.introShown = here;
    this.lastAsk = `intro.${here}`;
  }

  /** Where the player is, as analytics names it: the tab and its segment, or the Game tab. */
  private get placeName(): string {
    const s = this.screen;
    if (s.k === 'settings') return 'settings';
    if (s.k !== 'page') return 'game';
    const name = (sections: Record<string, number>, section: number): string => Object.keys(sections).find((k) => sections[k] === section) ?? String(section);
    switch (s.tab) {
      case 'progress':
        return `progress/${name(PROGRESS, this.progressPage.section)}`;
      case 'social':
        return `social/${name(SOCIAL, this.socialPage.section)}`;
      case 'shop':
        return `shop/${name({ chests: 0, collection: 1, casino: 2 }, this.shopPage.section)}`;
      default:
        return s.tab;
    }
  }

  private placeWatch = { name: 'game', age: 0, told: 'game' };

  /**
   * Which tabs and segments are opened (Leo, 16.10.2026: what players never touch can go). A place counts once the player
   * has stayed half a second, so swiping through to another does not count the ones passed on the way.
   */
  private watchPlace(dt: number): void {
    const name = this.placeName;
    const watch = this.placeWatch;
    if (watch.name !== name) {
      watch.name = name;
      watch.age = 0;
    }
    watch.age += dt;
    if (watch.age < 0.5 || watch.told === name) return;
    watch.told = name;
    this.onStep?.('tab', { name });
  }

  /** The last question or drawer that came up by itself this visit (a sheet the player opened is not one). */
  lastAsk: string | null = null;

  noteAsk(ask: string): void {
    this.lastAsk = ask;
  }

  private leftOnce = false;

  /**
   * The first day's visits (Leo, 16.10.2026): half the new players leave within two minutes, and this says where they
   * were and what had just come up. Once per visit, on the first day only; no name, no code, nothing of the save but the level.
   */
  leaving(): Record<string, string | number> | null {
    if (this.leftOnce || this.save.firstDay !== this.today) return null;
    this.leftOnce = true;
    return { place: this.placeName, screen: this.screen.k, shifts: this.save.shiftsPlayed, level: this.save.career.level, ask: this.lastAsk ?? 'none' };
  }

  /** The page and segment the player is on, for what is new there. */
  private get placeHere(): Pick<NewsItem, 'tab' | 'section'> | null {
    if (this.screen.k !== 'page') return null;
    switch (this.screen.tab) {
      case 'progress':
        return { tab: 'progress', section: this.progressPage.section };
      case 'shop':
        return { tab: 'shop', section: this.shopPage.section };
      case 'social':
        return { tab: 'social', section: this.socialPage.section };
      default:
        return null;
    }
  }

  private newsWatch: { place: Pick<NewsItem, 'tab' | 'section'> | null; age: number } = { place: null, age: 0 };

  /** What is new in a place counts as seen once the player has been there a moment and moves on. */
  private watchNews(dt: number): void {
    const here = this.placeHere;
    const watch = this.newsWatch;
    if (watch.place?.tab !== here?.tab || watch.place?.section !== here?.section) {
      if (watch.place && watch.age >= NEWS_DWELL && News.read(this.save, watch.place.tab, watch.place.section)) this.persist();
      watch.place = here;
      watch.age = 0;
    }
    watch.age += dt;
  }

  /** Marks every waiting news item in a bottom navigation section as read. */
  readAllNews(tab: 'progress' | 'shop' | 'social'): void {
    if (News.readTab(this.save, tab)) this.persist();
  }

  /** The Game fund tab of the Club is open: its introduction comes up once (the Club's own tabs are DOM, so the panel asks). */
  introduce(i: Intro): void {
    if (this.screen.k !== 'page' || this.detailOpen || !Intros.isPending(this.save, i, this.config)) return;
    Intros.mark(this.save, i);
    this.persist();
    this.tick();
    this.detailOpen = true;
    this.introShown = i;
  }

  /** A tab opened from another one starts on the segment that carries its dot, so the dot on the tab leads somewhere (Leo, 18.10.2026). */
  private landOnDot(tab: Tab): void {
    const c = this.save.career;
    const pending = this.introsPending;
    const first = <T extends number>(waiting: T[], shown: readonly T[]): T | undefined => {
      const here = waiting.filter((s) => shown.includes(s));
      return here.length > 0 ? (Math.min(...here) as T) : undefined;
    };
    if (tab === 'progress') {
      const section = first(this.progressDots, [0, 1, 2]);
      if (section !== undefined) this.progressPage.section = section;
    } else if (tab === 'shop' && c.chests.length === 0) {
      const section = first([...News.sections(this.save, 'shop'), ...(pending.includes('casino') ? [2] : [])], ShopPage.sections(c));
      if (section !== undefined) {
        this.shopPage.section = section as ShopSection;
        this.shopPage.sectionSlide = null;
      }
    } else if (tab === 'social') {
      const waiting: number[] = [...News.sections(this.save, 'social')];
      if (pending.includes('club') || pending.includes('gamefund')) waiting.push(SOCIAL.club);
      if (pending.includes('mafia') || SocialPage.mafiaWaits(c, Date.now())) waiting.push(SOCIAL.mafia);
      const section = first(waiting, SocialPage.sections(c));
      if (section !== undefined) {
        this.socialPage.section = section as SocialSection;
        this.socialPage.sectionSlide = null;
      }
    }
  }

  /** A dot on the segment of a place that has an introduction or news waiting (Progress puts its own, `progressDots`). */
  private addIntroDots(list: RenderList, viewport: Vec2, inset: number): void {
    const pending = this.introsPending;
    const news = this.isPage('shop') ? News.sections(this.save, 'shop') : this.isPage('social') ? News.sections(this.save, 'social') : [];
    if (pending.length === 0 && news.length === 0) return;
    const dot = (cell: Rect, label: string): void => ShopPage.badgeDot(list, v(R.center(cell).x + textWidth(label, 13) / 2 + 8, R.center(cell).y - 6), 1);
    const career = this.save.career;
    for (const section of news) {
      if (this.isPage('shop')) {
        const cell = ShopPage.layout(viewport, inset, ShopPage.sections(career)).segments.find(([s]) => s === section);
        if (cell) dot(cell[1], S.shop.section(cell[0]));
      } else {
        const cell = SocialPage.segments(viewport, SocialPage.sections(career)).find(([s]) => s === section);
        if (cell) dot(cell[1], S.social.section(cell[0]));
      }
    }
    if (this.isPage('shop') && pending.includes('casino')) {
      const cell = ShopPage.layout(viewport, inset, ShopPage.sections(career)).segments.find(([section]) => section === 2);
      if (cell) dot(cell[1], S.shop.section(2));
    } else if (this.isPage('social')) {
      const cells = SocialPage.segments(viewport, SocialPage.sections(career));
      for (const [intro, section] of [['club', SOCIAL.club], ['mafia', SOCIAL.mafia]] as const) {
        const cell = cells.find(([s]) => s === section);
        if (cell && (pending.includes(intro) || (intro === 'club' && pending.includes('gamefund')))) dot(cell[1], S.social.section(section));
      }
    } else if ((this.isPage('upgrades') || this.isPage('streetBuilder')) && pending.includes('builder')) {
      const r = BuildLayout.segmentsRect(viewport);
      const half = R.width(r) / BUILD_PAGES.length;
      dot(R.make(r.minX + half, r.minY, r.maxX, r.maxY), S.builder.title);
    }
  }

  /** The places with an introduction waiting, for their dots. */
  get introsPending(): Intro[] {
    return Intros.pending(this.save, this.config);
  }

  /** A tap on the page beside a card closes the detail sheet, as a tap beside any other sheet does. */
  private tapAway(): void {
    if (!this.detailOpen || this.shopPage.busy) return;
    this.closeDetail();
    this.tick();
  }

  /** A press on the Street Builder that would do nothing: no palette card, no part, nothing lifted or waiting. */
  private builderIdleAt(point: Vec2): boolean {
    const b = this.builderPage;
    if (b.moving || b.pending || b.dragging) return false;
    return !StreetBuilderPage.cardAt(point, this.lastViewport, this.tabInset) && !StreetBuilderPage.builtPartAt(point, this.save.career, this.config, StreetBuilderPage.map(this.lastViewport, this.tabInset));
  }

  /** The finger is swiping: the list it pressed neither scrolls nor taps on the lift. */
  private cancelPress(): void {
    this.progressPage.drag = null;
    this.upgradePage.drag = null;
    this.shopPage.items.drag = null;
    this.shopPress = null;
  }

  /**
   * A swipe (or an arrow key) goes to the next (+1) or previous (-1) segment of the page, like a tap on its segment: Progress
   * (Today · Goals · Stats), the Shop, the Social tab, and the Build tab's two pages (Leo, 18.10.2026).
   */
  stepSection(way: -1 | 1): void {
    if (this.screen.k !== 'page' || this.shopPage.busy) return;
    if (this.isPage('progress')) {
      const next = this.progressPage.section + way;
      if (next < PROGRESS.today || next > PROGRESS.stats) return;
      this.blink();
      this.leaveMuseum();
      this.closeDetail();
      this.progressPage.select(next as ProgressSection);
    } else if (this.isPage('shop')) {
      // The Collection's shelves come first, as if they and the sections were one row (Leo, 19.10.2026).
      const s = this.shopPage;
      const shelf = SHELVES[SHELVES.indexOf(s.shelf) + way];
      if (s.section === 1 && shelf !== undefined) return this.shopFlow.tapShop({ k: 'shelf', shelf });
      const sections = ShopPage.sections(this.save.career);
      const next = sections[sections.indexOf(s.section) + way];
      if (next === undefined) return;
      if (next === 1) {
        s.shelf = way > 0 ? SHELVES[0] : SHELVES[SHELVES.length - 1];
        s.items.reset();
      }
      this.shopFlow.tapShop({ k: 'section', section: next });
    } else if (this.isPage('social')) {
      const sections = SocialPage.sections(this.save.career);
      const next = sections[sections.indexOf(this.socialPage.section) + way];
      if (next === undefined) return;
      this.blink();
      this.socialPage.select(next);
    } else if (BUILD_PAGES.includes(screenTab(this.screen))) {
      const next = BUILD_PAGES[BUILD_PAGES.indexOf(screenTab(this.screen)) + way];
      if (next) this.perform({ k: 'showTab', tab: next });
    }
  }

  /** Closes the detail sheet; what it was about is no longer chosen. */
  closeDetail(): void {
    if (!this.detailOpen) return;
    this.detailOpen = false;
    this.introShown = null;
    this.conditionShown = null;
    this.progressPage.museum.selected = null;
    this.progressPage.feat = null;
    this.progressPage.streak = false;
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
    return { offers: this.output?.adOffers ?? true, ready: this.output?.adReady?.() ?? false };
  }

  /** What the detail sheet shows right now; null while it is closed or something covers the page. */
  get detail(): Detail | null {
    if (this.introShown && this.detailOpen && this.screen.k === 'page') return Details.intro(this.introShown);
    if (this.conditionShown && this.detailOpen && (this.screen.k === 'ready' || this.screen.k === 'result')) return Details.museum(this.conditionShown, this.save.career, this.config, true);
    if (!this.detailOpen || this.screen.k !== 'page') return null;
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
        if (this.progressPage.section === PROGRESS.today) return this.progressPage.streak ? Details.streak(career, this.config, this.today) : null;
        const feat = this.progressPage.feat;
        if (this.progressPage.section === PROGRESS.goals) return feat ? Details.feat(feat, career, this.config) : Details.pass(career, this.config, this.today);
        // Stats: a Museum entry's sheet, else the Elite track opened from its card.
        const selected = this.progressPage.museum.selected;
        return selected ? Details.museum(selected, career, this.config) : Details.elite(career, this.config, this.sceneTime - this.prestigeArmed <= GameSession.prestigeWindow);
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
    return UpgradePage.layoutOf(this.lastViewport, this.tabInset, this.visibleUpgrades).maxScroll + sheet;
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
    if (!this.modesRevealed || !this.notices.isEmpty || this.tips.isActive) return false;
    if (this.screen.k !== 'ready' || !this.takesModeSwipe) return false;
    // After a swipe the hint is gone for a whole quiet stretch, then it counts as before.
    const swiped = this.sinceModeSwipe < this.sinceReady;
    const wait = swiped ? GameSession.hintEvery : this.save.hints.includes('modes') ? GameSession.hintIdleKnown : GameSession.hintIdle;
    const idle = Math.min(this.sinceReady, this.sinceModeSwipe) - wait;
    return idle >= 0 && idle % GameSession.hintEvery < GameSession.hintShown;
  }

  /** The modes are no secret any more: the hint may come, the page dots stay. */
  private get modesRevealed(): boolean {
    return this.save.career.level > this.config.modeHintAfterLevel || this.save.hints.includes('unlimitedTip');
  }

  /** The swipe pages as dots on the waiting screen's card, once modes are known (Leo, 16.10.2026: a mode switch you can see). */
  private get showsModeDots(): boolean {
    return (this.modesRevealed || this.save.hints.includes('modes')) && this.screen.k === 'ready' && this.takesModeSwipe;
  }

  private static tipBrief =(tip: Tip): Brief => ({ id: 'tip', caption: tip.caption, text: tip.text, color: 'accent', pending: null });

  /** What the waiting screen's top card says instead of its numbers: the mode just swiped to, a tip, or the swipe hint. */
  private get topMessage(): TopMessage | null {
    const message = this.modeMessage.view(this.sceneTime);
    if (message) return message;
    const tip = this.tips.view;
    if (tip) return { brief: GameSession.tipBrief(tip.tip), previous: null, amount: tip.amount, swap: 1, pulse: 1, time: this.sceneTime, left: false, right: false };
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

  /** How long the result on screen ignores taps: a lost shift takes a breather first. */
  private get resultLock(): number {
    return this.screen.k === 'result' ? ResultBanner.lock(this.screen.summary) : ResultBanner.inputLock;
  }

  private get takesModeSwipe(): boolean {
    if (this.world.shift.phase !== 'waiting' || !(this.tutorial?.isOver ?? true) || this.special) return false;
    if (this.isShowingResult) return this.resultAge >= this.resultLock;
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
      if (this.screen.k === 'result' && this.resultAge < this.resultLock) return null;
      if (this.adTarget && R.contains(this.adTarget.rect, point)) return { k: 'perform', action: { k: 'watchAdGame', reward: this.adTarget.reward } };
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
      if (column === 'center') return { k: 'perform', action: showsCars ? { k: 'showShop', section: 1 } : { k: 'showProgress', section: PROGRESS.stats } };
      return { k: 'perform', action: { k: 'showProgress', section: PROGRESS.stats } };
    }
    if (this.isPage('social')) {
      const section = SocialPage.sectionAt(point, this.lastViewport, this.save.career);
      if (section !== null && section !== this.socialPage.section) {
        this.blink();
        this.socialPage.select(section);
      } else if (section === null) this.tapAway();
      return true;
    }
    if (this.isPage('progress')) {
      const section: ProgressSection | null = ProgressPage.sectionAt(point, this.lastViewport, this.tabInset);
      if (section !== null) {
        if (this.progressPage.section !== section) {
          this.blink();
          this.leaveMuseum();
          this.closeDetail();
        }
        this.progressPage.select(section);
        return true;
      }
      // The list: a press is a tap or the start of a scroll; the lift decides (`tapProgress`).
      if (ProgressPage.inList(point, this.lastViewport, this.tabInset)) {
        this.progressPage.press(point.y);
        this.swipe.press(point);
      } else this.tapAway();
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
          if (e.tip) this.addPopup({ k: 'earned', n: e.tip }, add(e.position, v(0, 22)));
          if (e.chainSaved) {
            this.addPopup({ k: 'chainHeld' }, add(e.position, v(0, 22)));
            this.rim.signal('wave', 'juiceGreen');
          }
          // In the snow every merge leaves its tracks, and they stay.
          if (TyreMarks.leavesMark(e.rating) || world.config.weather === 'snow') this.tyreMarks.add(world.config.weather === 'snow');
          if (e.rating === 'tightFit') {
            const braked = world.vehicle(e.closest ?? e.vehicle);
            if (braked) this.brakeMarks.add(world, braked);
          }
          // The Records keep how early or late the taps come (saved with the shift).
          if (!this.tutorial) noteTap(this.save.career, e.gapAhead, e.gapBehind, this.config);
          break;
        case 'crash':
          // A hard crash blinks the screen and leaves a scorch: both cost nothing the ground has to repaint.
          if (this.effects.spawn(e, world, this.reduceMotion, e.chain, this.lowDetail) >= CrashEffects.fireSeverity && !e.isTakedown) {
            this.scars.add({ point: e.point, kind: 'crash' }, this.sceneTime);
            if (!this.reduceMotion) this.explosions.flash = Math.max(this.explosions.flash, CrashEffects.flash);
          }
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
          if (this.offersRevive(e.result)) this.revive = { result: e.result, age: 0 };
          else this.finish(e.result);
          break;
        case 'takedown':
          this.sinceTakedown = 0;
          this.cameraFx.leanTo(e.point, CameraFxTuning.takedownZoom, 0.3);
          this.rim.signal('wave', 'lightBlue');
          break;
        case 'criminalWarning':
          this.museum.brief(e.boss ? { k: 'boss', kind: world.config.bossKind } : { k: 'special', kind: 'pickup' });
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
          this.museum.brief({ k: 'special', kind: e.fire ? 'fireTruck' : 'ambulance' });
          this.rim.signal('sweep', 'lightBlue');
          break;
        case 'oversizeWarning':
          this.museum.brief({ k: 'special', kind: 'oversize' });
          this.rim.signal('sweep', 'vehicleOversize');
          break;
        case 'oversizeSpoilt':
          this.rim.signal('miss', 'vehicleOversize');
          break;
        case 'oversizePassed':
          this.rim.signal('wave', 'vehicleOversize');
          break;
        case 'weddingWarning':
          this.museum.brief({ k: 'special', kind: 'wedding' });
          this.rim.signal('sweep', 'vehicleWedding');
          break;
        case 'weddingSpoilt':
          this.rim.signal('miss', 'vehicleWedding');
          break;
        case 'weddingPassed':
          this.rim.signal('wave', 'vehicleWedding');
          break;
        case 'raceWarning':
          this.museum.brief({ k: 'special', kind: 'racer' });
          this.rim.signal('sweep', 'vehicleRacer');
          break;
        case 'racerStopped':
          this.rim.signal('wave', 'vehicleRacer');
          break;
        case 'learnerWarning':
          this.museum.brief({ k: 'special', kind: 'learner' });
          this.rim.signal('sweep', 'learnerSign');
          break;
        case 'learnerSpoilt':
          this.rim.signal('miss', 'learnerSign');
          break;
        case 'learnerPassed':
          this.rim.signal('wave', 'learnerSign');
          this.lamps.thank(e.vehicle);
          break;
        case 'ambulanceBlocked':
          this.rim.signal('flush', 'destructive');
          break;
        case 'ambulanceCleared':
          this.rim.signal('wave', 'lightBlue');
          this.lamps.thank(e.vehicle);
          break;
        case 'tapRejected': {
          // Heard, but not now: the front car's brake lights twitch. No text, no sound.
          const front = world.queue.vehicles[0];
          if (front !== undefined) this.lamps.refuse(front);
          break;
        }
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
          this.museum.brief({ k: 'special', kind: 'transporter' });
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
          this.museum.brief({ k: 'special', kind: 'military' });
          this.rim.signal('sweep', 'lightRed');
          break;
        case 'criminalEscaped': {
          // It cost the shift: the next one explains it again.
          const boss = world.vehicle(e.vehicle)?.role === 'boss';
          if (this.briefs) this.museum.relearn(museumId(boss ? { k: 'boss', kind: world.config.bossKind } : { k: 'special', kind: 'pickup' }));
          break;
        }
        case 'explosion':
          if (e.kind === 'bomb' && this.briefs) this.museum.relearn(museumId({ k: 'special', kind: 'military' }));
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
    if (save.career.mastery.tightFits < GameSession.tightFitsKnown) this.tip(S.modes.tightFit);
  }

  /** Shifts after which `teachTightFit` comes in the same visit, and how many Tight Fits mean it is known. */
  static readonly tightFitTipShifts = 6;
  /** Shifts played after which the touch hint (`.tap-hint`) is no longer shown. */
  static readonly tapHintShifts = 3;
  static readonly tightFitsKnown = 10;

  private startPlaying(): void {
    this.screen = { k: 'playing' };
    this.shiftRan = true;
    // The ready screen has told its news: the next one waits for the next ready screen.
    this.museum.ready.shift();
    this.shiftStartMoney = this.save.career.money;
    this.shownMoney = this.shiftStartMoney;
    this.sinceMoney = Infinity;
    this.dailySplash = null;
    this.resultBurst = null;
    this.dailyLost = false;
    this.play(['go'], []);
    this.onChrome?.();
    if (!this.playingDaily) return;
    const career = this.save.career;
    const news = Careers.startDaily(career, this.today, this.config);
    const toasts: string[] = [];
    if (news?.frozen) toasts.push(S.daily.freezeUsed(news.frozen));
    const got: string[] = [];
    if (news?.earned) got.push(S.daily.gotFreeze);
    // The casino opens quietly: until it has, the cards wait in hand without a word.
    if (news?.cards && Unlocks.isOpen(career, 'casino', this.config)) got.push(S.daily.gotCard);
    if (got.length > 0) toasts.push(S.daily.streakReward(career.dailyStreak, got));
    if (news?.item) {
      toasts.push(...this.completeAlbums());
      this.resultBurst = { kind: 'streak', title: S.moments.streak(career.dailyStreak), line: S.daily.gotItem(news.item), color: 'hazard', power: 1.5 };
    } else if (news?.chest) this.resultBurst = { kind: 'streak', title: S.moments.streak(career.dailyStreak), line: S.daily.gotChest(news.chest), color: 'hazard', power: 1.5 };
    this.persist();
    this.announce(...toasts);
  }

  private mafiaChecked = 0;

  /** The loan follows the clock (core/mafia.ts): it turns late on its day, and the Don's letters are told as they arrive. */
  private keepMafiaInStep(): void {
    const career = this.save.career;
    const now = Date.now();
    if (!career.loan || this.screen.k === 'playing' || now - this.mafiaChecked < 1000) return;
    this.mafiaChecked = now;
    const event = Mafia.sync(career, now);
    const letters = Mafia.news(career, now);
    const letter = letters.some((l) => l.kind !== 'late' && l.kind !== 'taken');
    if (!event && !letter) return;
    this.persist();
    this.play([event === 'late' ? 'alarm' : event === 'writeoff' ? 'seized' : 'wanted'], [event ? 'seized' : 'wanted']);
    if (event && !(this.isPage('social') && this.socialPage.section === SOCIAL.mafia)) this.announce(event === 'late' ? S.mafia.notices.late : S.mafia.notices.writtenOff);
    // Late, the Casino shuts: whoever sits in it is shown out.
    if (event === 'late' && this.isPage('shop') && this.shopPage.section === 2) this.perform({ k: 'showShop', section: 0 });
  }

  /** The waiting shift follows the day: today's Daily Shift while open, a normal one after. */
  private keepDailyInStep(): void {
    if (this.world.shift.phase !== 'waiting' || this.screen.k === 'playing' || this.special) return;
    const day = dayNumber();
    if (day !== this.today && Careers.collectGift(this.save.career, day)) this.persist();
    this.today = day;
    if (this.wantsDaily !== this.dailySelected) this.prepareShift(true, null, this.screen);
    // The waiting shift's pay follows the clock into and out of the After Work hours.
    else if (this.afterWork !== Goals.afterWork(this.save.mode, this.dailySelected, new Date().getHours(), this.config)) this.refreshWaitingShift();
  }

  private completeAlbums(): string[] {
    return Careers.completeAlbums(this.save.career).map((album) => S.albums.complete(album, Fmt.number(ALBUM_REWARD[album])));
  }

  private tick(): void {
    this.play(['uiTick'], []);
  }

  /** Switches and segments tick like an indicator relay (Leo, 23.10.2026). */
  private blink(): void {
    this.play(['blinker'], []);
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
  /**
   * Keep driving (Leo, 18.10.2026): a crash that ends an Unlimited run, or a career shift after most of its cars, is offered back
   * for an ad. Once a run, a few times a day, only with an ad ready, never on the first day, the Daily, a trial, a challenge or a match.
   */
  private offersRevive(result: ShiftResult): boolean {
    const career = this.save.career;
    const ads = this.adOffer;
    if (result.outcome !== 'struckOut' || this.world.revives > 0 || this.special || this.versusSelected || this.tutorial || this.playingDaily) return false;
    if (!ads.offers || !ads.ready || this.save.firstDay === this.today || Careers.adRevivesLeft(career, this.today, this.config) <= 0) return false;
    return this.playingMode === 'unlimited' || (this.playingMode === 'shift' && result.carsSent >= this.world.config.shiftCars * this.config.reviveMinShare);
  }

  /** For the dev probe: the offer to keep driving, as `reviveLeft`. */
  get reviveOffer(): number | null {
    return this.reviveLeft;
  }

  /** Seconds the offer still stands, or null while there is none (or the crash is still having its moment). */
  private get reviveLeft(): number | null {
    const r = this.revive;
    if (!r || r.age < this.config.reviveBreath) return null;
    return Math.max(0, this.config.reviveBreath + this.config.reviveWindow - r.age);
  }

  private reviveRun(): void {
    if (!this.revive || !this.world.revive(this.world.time)) return;
    this.revive = null;
    this.sinceFatalCrash = Infinity;
    this.cameraFx.relieve();
    this.countIn = this.reduceMotion ? 0 : GameSession.countInSeconds;
    this.play(['swoosh'], ['comboUp']);
  }

  /** No ad: the run ends as it would have. */
  private declineRevive(): void {
    const r = this.revive;
    if (!r) return;
    this.revive = null;
    this.finish(r.result);
  }

  private finish(result: ShiftResult): void {
    const save = this.save;
    const career = save.career;
    if (result.bossBusted || (result.outcome === 'completed' && result.legendary)) this.output?.celebrate?.();
    if (this.special) {
      this.finishSpecial(this.special, result);
      return;
    }
    // Any finished shift can go to a friend as a challenge (not while learning the game, not one eased for this career).
    this.shareable = save.tutorialDone && !this.world.config.assisted && !result.revived
      ? challengeOf(
          career,
          this.playingMode,
          this.playingLevel,
          result.seed,
          this.world.config.cityEvent,
          this.playingMode === 'mayhem' ? result.flames : result.score,
          this.world.config.legendary,
          this.world.config.season,
          this.world.config.legendaryExtra,
        )
      : null;
    if (this.tutorial && this.playingMode !== 'mayhem') {
      this.tutorial.end();
      if (this.tutorial.isDone) this.tutorial = null;
      save.tutorialDone = true;
      this.onStep?.('tutorial-done');
    }
    this.onStep?.('shift', { mode: this.playingMode, level: this.playingLevel, outcome: result.outcome, daily: this.playingDaily ? 1 : 0, nth: Math.min(save.shiftsPlayed + 1, 10), eased: this.world.config.assisted ? 1 : 0, record: this.recordOf(result.score) });
    const levelBefore = career.level;
    const booked = bookShift(save, result, {
      mode: this.playingMode,
      level: this.playingLevel,
      daily: this.playingDaily,
      today: this.today,
      config: this.config,
      shiftConfig: this.world.config,
      splits: this.splits,
    });
    this.bookFailure(result);
    this.persist();
    // The crew's week counts the same XP as the Season Pass (`net/crews.ts` keeps it until the service has it).
    if (save.tutorialDone) addCrewXp(Elite.xpOf(result, this.config));
    this.resultBurst = this.momentOf(result, levelBefore) ?? this.resultBurst;
    this.dailyShare =
      this.playingDaily && result.outcome === 'completed'
        ? S.run.dailyShare(Fmt.number(result.score), result.perfects, result.tightFits, career.dailyStreak)
        : null;
    this.dailySelected = false;
    this.dailyLost = this.playingDaily && result.outcome !== 'completed';
    this.resultBank = booked.bank;
    const careerWin = result.outcome === 'completed' && this.playingMode === 'shift' && !this.playingDaily && !this.special && !this.versusSelected && !this.tutorial;
    this.resultShiftPay = careerWin && save.firstDay !== this.today ? this.world.config.shiftPay : 0;
    this.notices.announce(...GameSession.budget(booked.news));
    this.tips.add(...booked.tips);
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
    this.pendingSummary = { result, level: this.playingLevel, isNewHighscore: isNew, previousHighscore: previous, mode: this.playingMode, closeCall: this.closeCall(result, previous), elite: booked.elite };
    this.resultCountdown = this.resultDelayFor(result);
  }

  /**
   * The few moments the game is about (Leo, 16.10.2026) get the loudest celebration: the first shift won, Level 5 cleared
   * and a streak milestone (set when the Daily starts, `startPlaying`). Nothing else gets one, or none would stand out.
   */
  private momentOf(result: ShiftResult, levelBefore: number): Burst | null {
    if (this.playingMode !== 'shift' || this.playingDaily || result.outcome !== 'completed') return null;
    const level = this.save.career.level;
    if (levelBefore < this.config.welcomeChestLevel && level >= this.config.welcomeChestLevel) return { kind: 'firstWin', title: S.moments.firstWin, line: S.moments.firstWinLine, color: 'accent', power: 1.4 };
    const cap = this.config.modeHintAfterLevel;
    if (levelBefore <= cap && level > cap) return { kind: 'levelFive', title: S.moments.levelFive(cap), line: S.moments.levelFiveLine, color: 'coin', power: 1.5 };
    return null;
  }

  /** A lost shift puts the way it was lost on show in the Museum; the last one missing pays the Failures skin. */
  private bookFailure(result: ShiftResult): void {
    if (!result.failCause || !Careers.noteFailure(this.save.career, result.failCause)) return;
    this.announce(S.museum.failuresDone(S.shop.item(FAIL_SKIN)));
  }

  /** Record in sight: the top card counts down to the best, and it rings once when beaten (`nearRecordShare`). Only shown, never on the road. */
  private watchRecord(): void {
    const record = Goals.record(Math.round(this.world.score.points), this.recordBest, this.config);
    if (!record || this.recordStage === 'beaten') return;
    this.recordNear = Math.max(this.recordNear, record.near);
    const stage = record.gap < 0 ? 'beaten' : 'near';
    if (stage === this.recordStage) return;
    this.recordStage = stage;
    this.sinceRecord = 0;
    if (stage === 'near') {
      this.play([], ['flow']);
      return;
    }
    this.recordNear = 1;
    this.recordBeatAt = this.world.time;
    this.rim.signal('sweep', 'accent');
    this.play(['perfect'], ['perfect']);
  }

  /** How close the final score came to the best, for `shift` (the end-of-shift pay lands after the last live frame). */
  private recordOf(score: number): 'none' | 'far' | 'near' | 'beaten' {
    if (this.recordBest <= 0) return 'none';
    const record = Goals.record(score, this.recordBest, this.config);
    return !record ? 'far' : record.gap < 0 ? 'beaten' : 'near';
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
    this.brakeMarks.update(delta);
    this.driftFx.update(delta, this.world, this.lowDetail || this.sceneThin);
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
        if (this.resultBurst) this.celebrate(this.resultBurst);
        this.resultBurst = null;
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
  /** The top card's column under the mouse, where a tap opens something (the waiting screen and a settled result): 0, 1, 2 or -1. */
  private topColumnUnderMouse(): number {
    const k = this.screen.k;
    const p = this.hoverPoint;
    if (!p || this.conditionShown || (k !== 'ready' && !(k === 'result' && this.resultAge >= this.resultLock))) return -1;
    const column = TopBar.column(p, this.lastViewport.x);
    return column === null ? -1 : column === 'left' ? 0 : column === 'center' ? 1 : 2;
  }

  get overTopBar(): boolean {
    return this.topColumnUnderMouse() >= 0;
  }

  /** The lit capsule, the middle one at rest, glides to the column under the mouse and back; with Reduce Motion it is there at once. */
  private easeTopHover(dt: number): void {
    const under = this.topColumnUnderMouse();
    const follow = this.reduceMotion ? 1 : 1 - Math.exp(-dt * 14);
    this.topLit += ((under < 0 ? 1 : under) - this.topLit) * follow;
  }

  /** How deep the ready screen's intro wants the top card (`ReadyBanner.add`), and how deep it is: a spring, folding back when the shift starts. */
  private introWant = 0;
  private introGrow = 0;
  private introSpeed = 0;

  private easeIntro(dt: number): void {
    if (this.reduceMotion) {
      this.introGrow = this.introWant;
      this.introSpeed = 0;
      return;
    }
    const k = 260;
    const damping = 2 * Math.sqrt(k) * 0.8;
    for (let left = Math.min(dt, 0.1); left > 0; left -= 1 / 120) {
      const h = Math.min(left, 1 / 120);
      this.introSpeed += (k * (this.introWant - this.introGrow) - damping * this.introSpeed) * h;
      this.introGrow = Math.max(0, this.introGrow + this.introSpeed * h);
    }
  }

  private sceneList(camera: Camera, alpha: number, rm: boolean, seeThrough = false): RenderList {
    const world = this.world;
    const career = this.save.career;
    const screen = seeThrough && career.mapSkin === BIG_SCREEN;
    // A tour stop is drawn on the tour's own map, whatever the player wears.
    const mapSkin = this.special?.k === 'trial' && this.special.trial.tour?.map ? this.special.trial.tour.map : career.mapSkin;
    const theme = MapTheme.from(mapSkin);
    const list = new RenderList(camera, MapTheme.ground(theme));
    const holiday = Holidays.of(new Date());
    list.topLit = this.topLit;
    const notice = this.notices.shown;
    list.topIntro = this.introGrow;
    list.topGrow = this.introGrow + (notice && this.noticeInCard ? NoticeIsland.reach(notice, TopBar.frame(camera.viewport.x), this.textScale, this.reduceMotion) : 0);
    // Only a ready banner drawn in this frame keeps the intro open.
    this.introWant = 0;
    list.pointer = this.hoverPoint;
    list.frameDt = this.reduceMotion ? 1 : this.frameDelta;
    // A device that cannot keep 30 fps leaves out the decoration (`lowDetail`), never the game.
    list.groundGrain = !this.lowDetail;
    if (screen) list.backdrop = GameSession.backdropVeil;
    else CityLayer.add(list, world, theme, rm ? null : this.sceneTime, rm ? null : this.cityPulse, this.scars.isEmpty ? null : this.scars, this.sceneTime, this.playingMode === 'shift' && !this.special ? this.cityRise : null, !this.lowDetail, holiday);
    // A mode swipe: the road runs on towards the map coming in, from this one and from the next.
    const link = Math.min(1, Math.abs(this.pan.pan) / (camera.viewport.x * 0.25));
    SceneBuilder.addRoad(list, world.layout, world.config, world.layout.player, link, this.pan.pan < 0 ? 0 : Math.PI);
    CityLayer.addMapSkin(list, Skins.color(mapSkin), world);
    MapTheme.addIsland(list, theme, world);
    if (!this.special) CityLayer.addElite(list, Elite.level(career, this.config), world);
    CityLayer.addFrame(list, Careers.frame(career), world);
    const night = world.config.night || this.nightPreview;
    if (!night) this.addRim(list, world, rm);
    WeatherLayer.addCityEvent(list, world);
    Ducks.add(list, world, rm);
    const weather = this.weatherFade.mix(world.config.weather, this.sceneTime);
    WeatherLayer.addGround(list, world, weather);
    this.scars.addGround(list, this.sceneTime, rm ? null : this.sceneTime);
    this.tyreMarks.addGround(list, world.layout, world.config);
    this.brakeMarks.addGround(list);
    this.driftFx.addGround(list);
    SceneBuilder.addLaneArrow(list, world);
    this.explosions.addGround(list);
    this.effects.carSkins = career.carSkins;
    this.effects.addGround(list);
    const thin = this.lowDetail || this.sceneThin;
    CityLights.add(list, world, alpha, theme, this.lamps, rm ? null : world.time, this.nightPreview, thin, this.lampWave);
    if (night) NightLayer.addRoadLights(list, world, alpha, this.lamps, rm ? null : world.time, thin ? 3 : undefined, this.lampWave);
    if (night) {
      // Keep the ring's glow in the world layer so vehicles and wreckage can occlude it.
      const lit = list.items.length;
      this.addRim(list, world, rm);
      if (!thin) HUD.bloom(list, lit);
    }
    this.effects.addWrecks(list, world, alpha, !rm);
    SceneBuilder.addShadows(list, world, alpha);
    SceneBuilder.addVehicles(list, world, alpha, career.carSkins, career.policeSkin, rm ? null : world.time, rm ? null : world.time, this.lamps);
    SceneBuilder.addTowTrucks(list, world);
    this.driftFx.addAir(list);
    if (night) {
      NightLayer.addVehicleLights(list, world, alpha, this.lamps, rm ? null : world.time);
    }
    if (this.save.settings.vehicleLabels) SceneBuilder.addLabels(list, world, alpha);
    this.effects.addAir(list);
    this.explosions.addAir(list);
    if (holiday === 'newYear' && !rm) Holidays.addFireworks(list, world, this.sceneTime, thin ? 10 : 18);
    if (!this.sceneThin) WeatherLayer.addAir(list, world, this.sceneTime, rm, weather, this.lowDetail);
    const island = { center: toScreen(camera, v(0, 0)), radius: (world.layout.islandRadius) * camera.scale };
    if (!thin) MapTheme.addAir(list, theme, this.sceneTime, rm, island);
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
    // The words in the island sit on this camera: no shake, punch or pull-back moves them, and their wrapping never changes.
    const steady: Camera = { ...cam, scale: cam.scale * (1 - GameSession.lossPullBack) };
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
    list.blur = this.motionBlur;

    const overlayStart = list.items.length;
    const s = this.screen;
    this.conditionTargets = [];
    this.adTarget = null;
    if (s.k === 'playing') {
      list.frostEvery = GameSession.frostEvery;
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
      if ((world.config.night || this.nightPreview) && !this.lowDetail) HUD.bloom(list, lit);
      const since = world.shift.rushHourSince;
      HUD.add(list, {
        world,
        level: this.playingLevel,
        // No count-up: the score's digits roll into place on their own (`addOdometer`).
        score: Math.round(world.score.points),
        money: Math.round(this.shownMoney),
        best: this.currentBest,
        comboPop: rm ? 0 : Ease.clamp01(this.sinceComboTier / GameSession.comboPop),
        island: Ducks.island(world),
        mark: this.sinceMark < 2.5 ? S.modes.mark(this.markCars, markReward(this.markCars)) : null,
        race: this.raceDelta === null ? null : { delta: this.raceDelta, pop: rm ? 1 : Ease.clamp01(this.sinceCarSent / 0.35) },
        record: this.recordStage === 'far' ? null : { gap: this.recordBest - Math.round(world.score.points), pop: rm ? 1 : Ease.clamp01(this.sinceRecord / 0.35) },
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
        tension: this.cameraFx.vignette,
        brief: this.briefings.view,
        reduceMotion: rm,
        textScale: this.textScale,
      });
      this.tutorial?.add(list, world, alpha, this.sceneTime, rm);
      // A trial that counts (Perfects, Tight Fits): how far it is, while it runs.
      const progress = this.special?.k === 'trial' ? trialProgress(this.special.trial, world.score) : null;
      if (progress && this.special?.k === 'trial') {
        HUD.addGoalPill(list, S.trials.progress(this.special.trial, progress.have, progress.need), progress.have >= progress.need, rm ? 1 : Ease.clamp01(this.sinceCarSent / 0.35));
      }
      HUD.addPopups(list, this.popups, rm);
      if (this.countIn > 0 || this.isInterrupted) HUD.addCountIn(list, this.isInterrupted ? GameSession.countInSeconds : this.countIn);
      const left = this.reviveLeft;
      if (left !== null) {
        const at = v(viewport.x / 2, TopBar.foot(list) + 18);
        const label = S.ads.revivePill(Math.ceil(left));
        if (this.adPillReward !== 'revive') {
          this.adPillReward = 'revive';
          this.adPillAge = 0;
        }
        if (!this.adTold.has('revive')) {
          this.adTold.add('revive');
          this.onStep?.('ad', { reward: 'revive', step: 'offer' });
        }
        AdPill.add(list, label, at, this.adPillAge, 1, rm, this.adFlow.busy);
        this.adTarget = { reward: 'revive', rect: AdPill.target(label, at) };
        drawText(list, S.ads.reviveSkip, v(viewport.x / 2, at.y + AdPill.hit / 2 + 10), 12, 'muted', { align: 'center' });
      }
    } else if (s.k === 'result') {
      list.camera = steady;
      const { chip: chipAt, grow } = ResultBanner.add(list, s.summary, this.playingLevel, this.resultBank, this.resultAge, rm, this.giftLine, world.layout.islandRadius);
      this.introWant = grow;
      if (chipAt) this.addFailChip(list, s.summary, chipAt);
      const arriving = ResultBanner.arriving(this.resultAge);
      if (arriving > 0) this.addReadyBanner(list, null, false, arriving);
      list.camera = camera;
      this.tutorial?.add(list, world, alpha, this.sceneTime, rm);
      if (arriving <= 0) this.addGameAd(list, TopBar.foot(list) + 18, 1);
    } else if (s.k === 'ready') {
      list.camera = steady;
      this.addReadyBanner(list, this.tutorial && !this.tutorial.isOver ? Tutorial.readyPrompt : this.versusSelected ? S.ready.tapForFriends : S.ready.tapToStart);
      list.camera = camera;
      this.tutorial?.add(list, world, alpha, this.sceneTime, rm);
    }
    const inset = this.tabInset;
    // Where a notice would sit: above the settings button; it fades out as the shift starts.
    if (this.isPage('streetBuilder')) StreetBuilderPage.add(list, career, this.config, this.builderPage, rm, inset, this.buildThumb);
    else if (this.isPage('upgrades')) UpgradePage.add(list, career, this.config, this.visibleUpgrades, this.upgradePage, rm, inset, this.buildThumb, this.adOffer.offers && this.adOffer.ready ? Careers.adUpgradeOffer(career, this.today, this.config) : null);
    else if (this.isPage('shop')) ShopPage.add(list, career, this.config, this.today, this.shopPage, rm, inset);
    else if (this.isPage('progress')) ProgressPage.add(list, this.save, this.today, this.progressPage, rm, inset, this.progressScrollRange, this.progressDots);
    else if (this.isPage('social')) SocialPage.add(list, career, this.socialPage, rm);
    else if (s.k === 'settings') list.s(rect({ x: viewport.x / 2, y: viewport.y / 2 }, viewport), 'background', 0.55);
    this.addIntroDots(list, viewport, inset);
    this.transitions.apply(list, s, overlayStart, rm);
    if (this.burst) RewardBurst.add(list, this.burst.burst, this.burst.age, rm);
    const notice = this.notices.shown;
    if (notice && !this.isPage('social')) addNotice(list, notice, { at: this.noticeInCard ? 'card' : { bottom: this.lastViewport.y - inset - 21 }, textScale: this.textScale, reduceMotion: rm });
    return list;
  }

  /** On the Game tab the top card grows to carry the notice (`NoticeIsland`); on the pages it stands above the tab bar. */
  private get noticeInCard(): boolean {
    const k = this.screen.k;
    return k === 'ready' || k === 'result' || k === 'playing';
  }


  /** The Game tab's Heat pill, only a sign (Leo, 15.10.2026): its text while a career shift waits (behind the result too) at a Heat, else null. */
  /**
   * What changes the next shift's pay, said before it starts (Leo, 16.10.2026): Heat, a waiting Tailwind, a living streak,
   * the Family's share of a late loan. One shows as a labelled pill, several as icons (`ui/shell.ts`).
   * The Daily says its streak on its own pill, a trial or challenge its rule on the top card.
   */
  get modifiers(): Modifier[] {
    if ((this.screen.k !== 'ready' && this.screen.k !== 'result') || this.special || this.versusSelected || !(this.tutorial?.isOver ?? true)) return [];
    const mode = this.playingMode;
    if (mode === 'mayhem') return [];
    const career = this.save.career;
    const daily = this.playingDaily;
    const onCareer = mode === 'shift' && !daily;
    const out: Modifier[] = [];
    const heat = onCareer ? Careers.maxHeat(career, this.today, this.config) : 0;
    if (heat > 0) out.push({ id: 'heat', label: S.heat.button(heat), tone: 'heat' });
    if (Goals.tailwindOn(career, mode, daily)) out.push({ id: 'tailwind', label: S.mods.tailwind(this.config.tailwindPay), tone: 'bonus' });
    if (onCareer && this.afterWork) out.push({ id: 'afterWork', label: S.mods.afterWork(this.config.afterWorkPay), tone: 'bonus' });
    if (!daily && Goals.streakBonus(career, this.today, this.config)) out.push({ id: 'streak', label: S.mods.streak(this.config.streakBonusPay), tone: 'bonus' });
    if (Mafia.late(career)) out.push({ id: 'family', label: S.mods.family(this.config.mafiaGarnish), tone: 'loss' });
    return out;
  }

  /** On the Social tab the notice is the DOM page's pill (`ui/socialPage.ts`): the drawn one would sit under the page. */
  get socialNotice(): { text: string; presence: number } | null {
    const notice = this.notices.shown;
    return notice && this.isPage('social') ? { text: notice.text, presence: noticePresence(notice.age, notice.duration) } : null;
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
      this.playingMode === 'shift' ? this.save.highscore : this.playingMode === 'unlimited' ? this.save.unlimitedBest : this.save.mayhemBest;
    return best > 0 ? Fmt.number(best) : null;
  }

  /** The Progress segments with something waiting: the Daily Shift (Today), a prestige in reach or new Museum entries (Stats). */
  get progressDots(): ProgressSection[] {
    const c = this.save.career;
    const dots: ProgressSection[] = [];
    if (this.save.tutorialDone && c.level >= this.config.dailyUnlockLevel && Careers.isDailyOpen(c, this.today)) dots.push(PROGRESS.today);
    if ((!this.eliteSeen && Careers.canPrestige(c, this.config)) || c.museumNew.length > 0) dots.push(PROGRESS.stats);
    for (const section of News.sections(this.save, 'progress') as ProgressSection[]) if (!dots.includes(section)) dots.push(section);
    for (const [intro, section] of [['daily', PROGRESS.today], ['trials', PROGRESS.goals], ['pass', PROGRESS.goals], ['museum', PROGRESS.stats]] as const) {
      if (this.introsPending.includes(intro) && !dots.includes(section)) dots.push(section);
    }
    return dots;
  }

  /** Whether a tab has something waiting, like an iOS badge: the Shop's chests or new items. */
  badge(tab: Tab): { count: number } | 'dot' | null {
    const c = this.save.career;
    // Progress: the page puts the same dot on the segment that waits (`progressDots`); the Daily Shift's dot stays until it is played (09.10.2026).
    if (barTab(tab) === 'progress') return this.progressDots.length > 0 ? 'dot' : null;
    // A loan that is late or due within a day waits in the Mafia. The Club never calls (Leo, 11.10.2026).
    if (barTab(tab) === 'social') return SocialPage.mafiaWaits(c, Date.now()) || this.introsPending.some((i) => i === 'club' || i === 'mafia') || News.sections(this.save, 'social').length > 0 ? 'dot' : null;
    if (barTab(tab) === 'upgrades') return this.introsPending.includes('builder') ? 'dot' : null;
    if (barTab(tab) !== 'shop') return null;
    if (c.chests.length > 0) return { count: c.chests.length };
    if (this.introsPending.includes('casino') || News.sections(this.save, 'shop').length > 0) return 'dot';
    // A skin a casino round has won stays quiet until the round shows it.
    return this.shopPage.wallet.unseen(c.unseen).length > 0 ? 'dot' : null;
  }

  /** Draws the ready screen; returns where its chrome under the top card ends (`ReadyBanner.add`). */
  private addReadyBanner(list: RenderList, prompt: string | null, drawsCard = true, opacity = 1): void {
    const career = this.save.career;
    const daily = this.dailySelected && !this.versusSelected
      ? {
          event: this.world.config.cityEvent,
          streak: Goals.streak(career, this.today),
          next: Careers.nextStreakMilestone(career),
          splash: this.dailySplash,
          bonus: this.shiftRan && Goals.streakBonus(career, this.today, this.config) ? this.config.streakBonusPay : null,
          endsIn: streakEndsIn(career, this.today, this.config),
          freezes: career.streakFreezes,
        }
      : null;
    const run = runCard(this.special, this.world.config, this.playingMode, this.versusSelected, career, this.today);
    // A trial's goal already names its conditions; the tutorial and a match have none to show.
    // While the Daily's opening is on, nothing else of the waiting screen shows through it.
    const opening = daily !== null && daily.splash !== null;
    const chips = opening || this.special?.k === 'trial' || this.versusSelected || (this.tutorial && !this.tutorial.isOver) ? [] : conditionChips(this.world.config, career);
    const adRow = !opening && (daily !== null || this.screen.k === 'result') && this.gameAd !== null;
    const chipsAt = ConditionChips.center(toScreen(list.camera, v(0, 0)), !!run?.line);
    this.introWant = ReadyBanner.add(list, {
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
      mode: this.playingMode,
      versus: this.versusSelected,
      prompt: opening ? null : prompt,
      time: this.sinceReady,
      reduceMotion: this.reduceMotion,
      drawsCard,
      opacity,
      goal: this.giftLine,
      intro: this.versusSelected || (this.tutorial && !this.tutorial.isOver) ? null : this.readyIntro,
      textScale: this.textScale,
      message: this.topMessage,
      modes: this.showsModeDots && !opening ? { count: SWIPE_MODES.length, at: this.modeDotAt, color: ModeBanner.tint(this.swipeMode) } : null,
      ringTop: toScreen(list.camera, v(0, this.world.layout.ringRadius + this.world.layout.laneWidth)).y,
      island: this.world.layout.islandRadius,
      adRow,
    });
    if (adRow) this.addGameAd(list, TopBar.foot(list) + 18 + (daily ? 31 : 0), opacity);
    if (chips.length > 0) {
      ConditionChips.add(list, chips, chipsAt, { time: this.sinceReady - ReadyBanner.introDelay, reduceMotion: this.reduceMotion, opacity, selected: this.conditionShown });
      if (opacity > 0.5 && this.showsChrome) this.conditionTargets = ConditionChips.targets(chips.length, chipsAt).map((rect, i) => ({ id: chips[i].id, rect }));
    }
    // The Daily's splash covers the whole screen for a moment: above the condition icons, never under them.
    if (daily && daily.splash !== null) ReadyBanner.addSplash(list, daily, daily.splash, this.reduceMotion);
  }

  /**
   * The ad the Game tab offers (Leo, 16.10.2026), only once one is ready to play: before the Daily, a streak that
   * broke (brought back) or that breaks within hours (a Freeze); on the Daily's result, its pay doubled.
   */
  get gameAd(): { reward: GameAd; label: string } | null {
    const ads = this.adOffer;
    if (!ads.offers || !ads.ready) return null;
    const career = this.save.career;
    const s = this.screen;
    if (s.k === 'result') {
      if (this.resultAge < this.resultLock) return null;
      if (this.dailyLost) return Careers.adRetryOpen(career, this.today) ? { reward: 'retry', label: S.ads.retryPill } : null;
      if (this.dailyShare !== null) {
        const pay = this.dailyPay;
        return Careers.adDoubleOpen(career, this.today, pay) ? { reward: 'double', label: S.ads.doublePill(Fmt.number(pay)) } : null;
      }
      const pay = this.shiftPay;
      return pay > 0 && Careers.adShiftDoublesLeft(career, this.today, this.config) > 0 ? { reward: 'pay', label: S.ads.doublePill(Fmt.number(pay)) } : null;
    }
    if (s.k !== 'ready' || !this.dailySelected || this.versusSelected || this.special) return null;
    const days = Careers.adRescue(career, this.today, this.config);
    if (days !== null) return { reward: 'rescue', label: S.ads.rescuePill(days) };
    if (Careers.adFreezeOpen(career, this.today) && streakEndsIn(career, this.today, this.config) !== null) return { reward: 'freeze', label: S.ads.freezePill };
    return null;
  }

  /** What the Daily Shift on the result paid: a watched ad pays it again. */
  get dailyPay(): number {
    return this.screen.k === 'result' && this.dailyShare !== null ? Math.max(0, this.resultBank.after - this.resultBank.before) : 0;
  }

  /** A won career shift's own pay on the result, for an ad to pay once more; 0 on the first day and for anything else (Leo, 18.10.2026). */
  get shiftPay(): number {
    return this.screen.k === 'result' ? this.resultShiftPay : 0;
  }

  /** Draws the ad pill at `y` and makes it tappable; false when no ad is on offer. */
  private addGameAd(list: RenderList, y: number, opacity: number): boolean {
    const ad = this.gameAd;
    if (!ad) {
      this.adPillReward = null;
      return false;
    }
    if (this.adPillReward !== ad.reward) {
      this.adPillReward = ad.reward;
      this.adPillAge = 0;
    }
    if (!this.adTold.has(ad.reward)) {
      this.adTold.add(ad.reward);
      this.onStep?.('ad', { reward: ad.reward, step: 'offer' });
    }
    const at = v(list.camera.viewport.x / 2, y);
    AdPill.add(list, ad.label, at, this.adPillAge, opacity, this.reduceMotion, this.adFlow.busy);
    if (opacity > 0.2 && this.showsChrome) this.adTarget = { reward: ad.reward, rect: AdPill.target(ad.label, at) };
    return true;
  }

  /** The celebration over the screen (`rewardBurst.ts`), loud on purpose: sound, a double knock and a punch of the camera. */
  private celebrate(burst: Burst): void {
    this.burst = { burst, age: 0 };
    if (burst.kind === 'double' && burst.count) this.pendingBank = this.resultBank.after + burst.count;
    this.play([burst.power >= 1.2 ? 'chestBurstRare' : 'chestBurst', 'comboUp'], ['chest']);
    this.landMerge(0.08, 0.05, v(0, 0));
  }

  /** How a lost shift was lost, as an icon over the island: a tap opens its Museum sheet (`showCondition`), the sheet rimmed in red. */
  private addFailChip(list: RenderList, summary: ShiftSummary, center: Vec2): void {
    const cause = summary.result.failCause;
    const age = this.resultAge;
    const shown = Ease.outCubic(age / ResultBanner.enter) * (1 - ResultBanner.leaving(age));
    if (!cause || shown <= 0.001) return;
    const entry = { k: 'fail', kind: cause } as const;
    const id = museumId(entry);
    FailChip.add(list, entry, center, {
      age,
      reduceMotion: this.reduceMotion,
      opacity: shown,
      selected: this.conditionShown === id,
      isNew: this.save.career.museumNew.includes(id),
    });
    if (shown > 0.5 && this.showsChrome) this.conditionTargets = [{ id, rect: FailChip.target(center) }];
  }

  /** The open condition sheet still belongs to what is on screen: a condition of the waiting shift, or the failure on a result. */
  private conditionHeld(id: string): boolean {
    const s = this.screen;
    if (s.k !== 'ready' && s.k !== 'result') return false;
    // A failure's sheet stays until it is closed, also once the result is over and the next shift waits.
    return id.startsWith('fail.') || conditionChips(this.world.config, this.save.career).some((c) => c.id === id);
  }

  /** Tomorrow's gift on the Game tab, counted down, or a goal within reach (a plain career shift only). */
  private get giftLine(): string | null {
    if (this.special || this.versusSelected || this.playingMode !== 'shift') return null;
    if (Careers.giftAhead(this.save.career, this.today)) {
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      return S.daily.giftIn((midnight.getTime() - now.getTime()) / 3600000);
    }
    const teaser = Goals.teaser(this.save.career, this.today, this.config);
    if (!teaser) return null;
    switch (teaser.k) {
      case 'upgrade':
        return S.goals.money(Fmt.number(teaser.short), teaser.upgrade);
      case 'daily':
        return teaser.streak > 1 ? S.goals.dailyStreakWaiting(teaser.streak) : S.goals.dailyWaiting;
      case 'pity':
        return S.goals.pityWaiting(teaser.chestsLeft);
    }
  }

  /** The ready screen's card: what a trial's goal asks for (the conditions are icons, `ConditionChips`). */
  private get readyIntro(): ConditionIntro[] {
    const howTo = this.special?.k === 'trial' ? S.trials.howTo(this.special.trial) : null;
    if (howTo) return [howTo];
    const news = this.museum.ready[0];
    if (news) return [{ title: news.caption, text: news.text, short: news.caption }];
    // A sky, the dark or a city event met for the first time (roadworks slowing the ring): its icon alone says nothing to a new player.
    if (this.special || this.versusSelected || (this.tutorial && !this.tutorial.isOver)) return [];
    const met = conditionChips(this.world.config, this.save.career).find((c) => c.isNew);
    return met ? [{ title: S.brief.caption(met.entry, false), text: S.brief.text(met.entry), short: S.museum.name(met.entry) }] : [];
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

  /** Back from the phone (ui/backGesture.ts) has a step to take here; false at the start of the game, where the app may close. */
  get canStepBack(): boolean {
    return !(this.screen.k === 'ready' && !this.special && !(this.detailOpen && this.conditionShown));
  }

  /** Rewards from the team (net/rewards.ts): the bug hunter skins, chests, an invite's chest. Booked and announced. */
  payRewards(rewards: readonly Pick<Reward, 'item' | 'reason'>[]): void {
    const career = this.save.career;
    const news: string[] = [];
    for (const { item, reason } of rewards) {
      if (item.startsWith('chest:')) {
        const kind = item.slice(6) as ChestKind;
        if (!CHEST_KINDS.includes(kind)) continue;
        career.chests.push(kind);
        news.push(S.rewards.crew(reason, S.shop.chest(kind)) ?? S.rewards.invite(reason, kind) ?? S.rewards.chest(kind));
      } else if (item.startsWith('money:')) {
        const amount = Number(item.slice(6));
        if (!Number.isSafeInteger(amount) || amount < 1) continue;
        career.money += amount;
        news.push(S.rewards.crew(reason, moneyText(Fmt.number(amount))) ?? S.rewards.money(amount));
      } else if (cosmetic(item)) {
        if (Careers.owns(career, item)) continue;
        Careers.collect(career, item);
        news.push(cosmetic(item)?.source.kind === 'bugReport' ? S.rewards.bugHunter(item) : S.rewards.item(item));
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
    Intros.start(this.save, this.config);
    News.start(this.save);
    this.store();
    this.tutorial = new Tutorial();
    this.prepareShift(false);
  }

  /** Progress brought from another device (Cloud sync) replaces this one. */
  importProgress(save: SaveGame): void {
    this.save = save;
    Intros.start(save, this.config);
    News.start(save);
    this.store();
    this.tutorial = save.tutorialDone ? null : new Tutorial();
    if (this.tutorial) this.save.mode = 'shift';
    this.prepareShift(false);
    this.onSynced?.();
  }

  /** Newer progress from another device (cloud sync), taken over between shifts. */
  takeCloudSave(save: SaveGame): void {
    this.importProgress(save);
    // A copy from a device not opened today still pays today's toll income here.
    this.collectLoginIncome();
  }
}
