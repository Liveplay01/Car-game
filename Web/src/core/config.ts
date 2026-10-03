/**
 * All tuning values in one place.
 *
 * Units: world units (wu), seconds, wu per second. The world has the same size on every
 * device, only the camera zooms, so timing is identical everywhere.
 */
export interface Range {
  readonly lo: number;
  readonly hi: number;
}

const r = (lo: number, hi: number): Range => ({ lo, hi });

/**
 * The sky of a shift. Rain gets rougher step by step (`weatherSeverity`); fog and snow
 * (Leo, 30.09.2026) are kinds of their own: fog takes the view, snow the grip. Hail and
 * sandstorms (Leo, 02.10.2026) for the late levels: hail makes the drivers brake badly, a
 * sandstorm takes the view and some grip.
 */
export type Weather = 'clear' | 'lightRain' | 'heavyRain' | 'storm' | 'extreme' | 'fog' | 'snow' | 'hail' | 'sandstorm';
export const WEATHERS: Weather[] = ['clear', 'lightRain', 'heavyRain', 'storm', 'extreme', 'fog', 'snow', 'hail', 'sandstorm'];
const RAIN: Record<Weather, number> = { clear: 0, lightRain: 1, heavyRain: 2, storm: 3, extreme: 4, fog: 0, snow: 0, hail: 0, sandstorm: 0 };
/** How hard it rains: 0 (clear, fog, snow) to 4 (extreme). */
export const weatherSeverity = (w: Weather): number => RAIN[w];

export type CityEvent = 'roadworks' | 'roadClosure' | 'concert' | 'vipConvoy' | 'policeOperation' | 'schoolRun' | 'marathon';
export const CITY_EVENTS: CityEvent[] = ['roadworks', 'roadClosure', 'concert', 'vipConvoy', 'policeOperation', 'schoolRun', 'marathon'];
/** The Daily Shift's events, one a day in turn: the first six, so a new player's Daily never brings a late-game event. */
export const DAILY_EVENTS: CityEvent[] = ['roadworks', 'roadClosure', 'concert', 'vipConvoy', 'policeOperation', 'schoolRun'];

export type RoadModule = 'tollBooth' | 'speedCamera' | 'towDepot';
export const ROAD_MODULES: RoadModule[] = ['tollBooth', 'speedCamera', 'towDepot'];

export type TrialRule = 'flawless';

/**
 * The syndicate's bosses, one after the other every `convoyEvery` levels (Leo, 28.09.2026):
 * each asks for another timing, not just more of the same.
 * - convoy: armoured escorts right behind the boss; the police car goes into the gap.
 * - getaway: no escorts, but gone quickly; a police car has to be ready.
 * - armoured: it shrugs off the first ram; a second police car finishes it.
 * - phantom: a blackout, and the boss drives without lights.
 * Four more from Level 75 (Leo, 02.10.2026), so the second round brings new faces:
 * - twins: two bosses, one right after the other; both have to be caught.
 * - decoy: its escorts wear the boss's paint; only the real one has the open bed and the ring.
 * - smuggler: armoured twice over: three police cars, no escorts, more time.
 * - kingpin: the finale: a blackout, armour, and three escorts in its paint.
 */
export type BossKind = 'convoy' | 'getaway' | 'armoured' | 'phantom' | 'twins' | 'decoy' | 'smuggler' | 'kingpin';
export const BOSS_KINDS: BossKind[] = ['convoy', 'getaway', 'armoured', 'phantom', 'twins', 'decoy', 'smuggler', 'kingpin'];
/** The first four, the syndicate as it was until 02.10.2026 (the title Syndicate Breaker, the rematch levels). */
export const FIRST_BOSSES: BossKind[] = ['convoy', 'getaway', 'armoured', 'phantom'];

/**
 * Legendary Shifts (Leo, 28.09.2026): now and then a career shift comes with one extra rule and
 * pays a Premium Chest. Rare, announced on the waiting card, never on a boss level.
 */
export type LegendaryRule = 'gridlock' | 'dragnet' | 'heavyLoad' | 'darkStorm' | 'zeroTolerance';
export const LEGENDARY_RULES: LegendaryRule[] = ['gridlock', 'dragnet', 'heavyLoad', 'darkStorm', 'zeroTolerance'];

export const baseConfig = {
  // Roundabout
  armSlotCount: 16,
  armSlots: [0, 4, 8, 12] as number[],
  armSlotSpacing: 2,
  ringRadiusPerArm: 18,
  ringRadius: 120,
  laneWidth: 24,
  mergeAngle: 0.26,
  /**
   * Two lanes (Leo, 30.09.2026): from `twoLaneLevel` on the ring gets an inner lane. Both lanes
   * turn together; a car bound for the inner lane crosses the outer one on its way in and out.
   * An arrow at the stop line shows where your front car is headed.
   */
  lanes: 1,
  twoLaneLevel: 80,
  /** Share of the AI's cars and of yours that take the inner lane. */
  innerLaneShare: 0.4,
  playerInnerShare: 0.35,
  /** The inner lane is joined and left a little further round than the outer one. */
  innerMergeAngle: 0.42,

  // Vehicles
  carLength: 24,
  carWidth: 13,

  // Motion
  ringSpeed: 110,
  mergeDuration: 0.5,

  // Player queue
  queueSpacing: 32,
  queueVisible: 4,
  queueAdvanceDuration: 0,
  queueFillSlots: 5,
  queueFillSeconds: 1.5,
  tempoGlideSeconds: 1.5,

  // AI traffic
  freePlayDensity: 5,
  aiSafeGap: 0.25,
  aiPathClearance: 0.1,
  /**
   * A car that has stood this many seconds at the line stops waiting for a comfortable gap and
   * pushes in at the next one it takes without touching anyone (`aiPushInGap`, seconds).
   * Without it a steady stream of the player's cars starves the other arms: the ring empties
   * of traffic and sending cars without pause becomes safe.
   */
  aiPatience: 2.5,
  aiPushInGap: 0.15,
  aiSpawnDelay: r(0.4, 1.2),
  aiHazardAhead: 2.5,
  aiHazardBehind: 1.5,
  aiReaction: r(0.2, 0.8),
  aiApproachDistance: 300,
  aiApproachBrake: 1,
  exitArmsAhead: r(1, 3),

  // Crash physics
  crashDuration: 2.2,
  crashRestitution: 0.3,
  crashFriction: 0.4,
  tireGripBrake: 0.8,
  tireGripSide: 1.0,
  carLengthMeters: 4.5,
  dentPerImpact: 0.05,
  maxDent: 6,

  // Drivers
  driverReaction: r(0.5, 1.5),
  driverBrake: 0.9,
  driverAcceleration: 0.4,
  stopGap: 6,
  followMargin: 0.25,
  followBraking: 0.15,
  standingSpeed: 20,
  jamBraking: 0.25,
  waveTime: 6,
  hazardBraking: 0.05,
  chainCrashesCostStrikes: false,
  mergeResponsibility: 1,

  // Rating
  tightFitSeconds: 0.12,
  sloppyWindow: 0,
  /**
   * A merge that still drives slower than this share of its planned speed as it joins the ring
   * braked in behind slow traffic: nothing was timed, so it scores nothing (Leo, 01.10.2026:
   * after a crash, cars spammed one behind the other crept in safely, each one +1 combo, and in
   * Unlimited the ring filled with your own cars for a record without playing).
   */
  creepPace: 0.9,
  nearMissSeconds: 0.2,
  perfectBalance: 0.25,
  perfectMaxGap: 2,
  /** Records: the timing of the last this many merges into a real gap (`core/timing.ts`). */
  timingSamples: 50,
  /** A gap wider than this (seconds ahead + behind) says nothing about the timing. */
  timingMaxGap: 3,
  /** The Records show the timing from this many merges on. */
  timingMinSamples: 8,
  /** Within this many milliseconds of the middle of the gap counts as on the beat. */
  timingOnBeat: 30,

  // Scoring
  pointsClean: 100,
  pointsTightFit: 200,
  pointsNearMiss: 125,
  pointsPerfect: 150,
  comboClean: 1,
  comboTightFit: 2,
  comboNearMiss: 1,
  comboPerfect: 1,
  flowChain: 5,
  crashPenalty: 250,
  completionBonus: 1000,
  comboThresholds: [5, 10, 20],
  comboMultipliers: [1.5, 2, 3],

  // Police and criminals
  policeShare: 0.2,
  criminalChance: 1,
  criminalFirst: r(4, 8),
  criminalInterval: r(10, 16),
  criminalWarning: 2,
  criminalTime: 12,
  takedownPoints: 1000,
  criminalEntryGap: 0.05,
  criminalMass: 2.5,
  dispatchComboFactor: 0.5,
  policeChaseSpeedFactor: 1.4,

  // Money transporter
  transporterFirst: r(8, 14),
  transporterInterval: r(15, 25),
  transporterWarning: 2,
  transporterTime: 10,
  transporterSecureArc: 130,
  transporterPay: 450,
  shieldBonus: 50,
  transporterSeized: 0,
  transporterMass: 1.6,

  // Ring modules and trucks
  moduleSlotCount: 6,
  modules: {} as Record<number, RoadModule>,
  truckChance: 0.22,
  truckLength: 36,
  truckMass: 2.2,
  tollPerTruck: 6,
  sportsCarLength: 21,
  sportsCarMass: 0.8,
  sportsCarMergeFactor: 0.8,
  sportsCarShareOwned: 0.15,
  sportsCarShare: 0,
  compactLength: 18,
  compactMass: 0.7,
  compactMergeFactor: 1.15,
  compactShareOwned: 0.12,
  compactShare: 0,
  vanLength: 29,
  vanMass: 1.5,
  vanMergeFactor: 0.9,
  vanShareOwned: 0.12,
  vanShare: 0,
  // The Classic (an honour from Standard Chests): drives like a car, a little longer and heavier.
  classicLength: 25,
  classicMass: 1.1,
  classicMergeFactor: 1,
  classicShareOwned: 0.1,
  classicShare: 0,
  tollZoneArc: 150,
  tollSpeedFactor: 0.55,
  cameraFine: 3,
  moduleEarningSeconds: 60,
  cameraLimitFactor: 1.08,
  cameraZoneArc: 44,
  cameraSpeedFactor: 0.7,
  tollBoothCost: 10400,
  speedCameraCost: 15600,
  towZoneArc: 180,
  towSpeedup: 0.3,
  towDepotCost: 13000,

  // Explosives
  tankerShare: 0,
  tankerLevel: 4,
  tankerLevelShare: 0.18,
  tankerMass: 2.4,
  tankerBlastRadius: 66,
  tankerBlastSpeed: 280,
  militaryChance: 0,
  militaryLevel: 7,
  militaryLevelChance: 0.3,
  militaryFirst: r(10, 18),
  militaryPerShift: 1,
  militaryInterval: r(8, 12),
  militaryWarning: 2,
  militaryTime: 12,
  militaryZoneArc: 84,
  militaryMass: 2.6,
  bombBlastRadius: 2000,
  bombBlastSpeed: 420,
  mayhemTruckChance: 0.34,
  mayhemTankerShare: 0.6,
  mayhemMilitaryFirst: r(9, 15),
  mayhemMilitaryPerShift: 4,
  mayhemMilitaryInterval: r(6, 10),

  // Strikes
  maxStrikes: 1,
  maxPoliceCrashes: 3,

  // Shift
  shiftCars: 15,
  rushHourCars: 4,

  // Unlimited
  endless: false,
  endlessLevel: 3,
  endlessDensityEvery: 25,
  endlessMaxDensityBonus: 8,
  endlessTempoPerMinute: 0.08,
  endlessMaxTempo: 1.6,
  endlessPayPerCar: 20,
  /**
   * Unlimited after its ramps (Leo, 02.10.2026): the density and the tempo stop rising after a
   * few minutes, so the run moves on in stages, announced, at these seconds of the run: gas
   * tankers join the lorries, night falls, a storm rolls in, military trucks come. After the last
   * one, every `endlessOvertimeEvery` seconds is Overtime: one more car of density and a little
   * more tempo, up to the limits below.
   */
  endlessStages: [240, 330, 420, 510] as readonly number[],
  endlessOvertimeEvery: 90,
  endlessMaxOvertime: 6,
  endlessOvertimeTempo: 0.03,
  endlessLateMaxTempo: 1.75,
  /** The military trucks of the last stage: the first this soon after it, then this far apart. */
  endlessMilitaryFirst: r(6, 12),
  endlessMilitaryInterval: r(40, 60),

  // Mayhem
  mayhem: false,
  mayhemCars: 12,
  mayhemReload: 1.1,
  mayhemHeavyFlames: 2,
  mayhemRecoveryFactor: 2,
  mayhemWreckHitSpeed: 60,
  mayhemLevel: 6,
  mayhemExtraTraffic: 3,
  mayhemChainWindow: 1.5,
  mayhemMaxChainFlames: 10,
  rampSeconds: 20,
  densityStart: 6,
  densityEnd: 10,
  rushHourDensityBonus: 2,
  tempoStart: 1.05,
  tempoEnd: 1.2,
  rushHourTempo: 1.35,
  rushHourRamp: 1,
  rushHourScoreFactor: 2,

  // Levels
  hardLevel: 5,
  levelOneCars: 10,
  carsPerLevel: 1.1,
  shiftCarsSpread: 2,
  maxShiftCars: 30,
  easyDensityStart: 3,
  easyDensityEnd: 6,
  easyTempoStart: 0.95,
  easyTempoEnd: 1.05,
  easyRushHourTempo: 1.2,
  easyAiSafeGap: 0.4,
  easyCriminalTime: 16,
  easyPoliceShare: 0.3,
  tempoPerLevel: 0.01,
  maxLevelTempoBonus: 0.4,
  criminalTimePerLevel: 0.25,
  minCriminalTime: 8,

  // Money and upgrades
  shiftPay: 180,
  shiftPayBase: 150,
  shiftPayPerLevel: 30,
  armBaseCost: 32500,
  armCostGrowth: 2,
  trafficPerArm: 0.25,
  payPerArm: 0.1,
  transporterPerArm: 0.15,
  upgradeBaseCost: 2600,
  upgradeCostGrowth: 1.5,
  patrolsPerStep: 0.03,
  pursuitPerStep: 1,
  quietStreetsPerStep: 0.1,
  interceptorPerStep: 0.1,
  dispatchRadioPerStep: 0.1,
  backupPerStep: 1,
  cashRoutePerStep: 0.4,
  overtimePerStep: 0.04,
  insurancePerStep: 0.15,
  freightPerStep: 0.015,
  doubleRunPerStep: 0.04,
  recoveryPerStep: 0.2,

  // Risk and insurance
  level: 1,
  crashCostLevel: 20,
  crashCosts: [60, 120, 200],
  crashCostImpacts: [80, 140],
  escapeLoss: 350,
  crashInsurance: 0,
  robberyInsurance: 0,
  doubleRunChance: 0,
  doubleRunDelay: r(2, 3),

  // Weather
  weather: 'clear' as Weather,
  lightRainLevel: 6,
  heavyRainLevel: 12,
  stormLevel: 18,
  extremeLevel: 25,
  badWeatherPerLevel: 0.02,
  maxBadWeatherChance: 0.4,
  weatherGripLoss: 0.15,
  weatherReactionDelay: 0.1,
  weatherBrakeLoss: 0.1,
  weatherDensityPerStep: 1,
  stormAiGapFactor: 0.8,
  /** Fog: the far side of the ring fades out; drivers see a hazard later. It pays a little more. */
  fogLevel: 35,
  fogReactionDelay: 0.3,
  fogPayFactor: 1.1,
  /** Snow and ice: tyres keep this share of their grip, brakes this share of their bite. */
  snowLevel: 45,
  snowGrip: 0.45,
  snowBrake: 0.6,
  snowReactionDelay: 0.15,
  snowPayFactor: 1.15,
  /** Hail: drivers brake hard and badly on the stones; a little more traffic. It pays more. */
  hailLevel: 55,
  hailGrip: 0.8,
  hailBrake: 0.7,
  hailReactionDelay: 0.2,
  hailDensity: 1,
  hailPayFactor: 1.15,
  /** Sandstorm: the far side fades out in the dust, sand on the road takes some grip. */
  sandstormLevel: 65,
  sandstormGrip: 0.85,
  sandstormReactionDelay: 0.35,
  sandstormPayFactor: 1.2,
  /** How often each kind comes when the sky turns bad (rain eases from 4 down to 1). */
  fogWeight: 3,
  snowWeight: 2,
  hailWeight: 2,
  sandstormWeight: 2,

  // Night: the city goes dark, you merge by the lights (only the picture changes, not the rules)
  night: false,
  nightLevel: 10,
  nightChancePerLevel: 0.03,
  maxNightChance: 0.2,
  /** Blackout: some nights the street lamps are out too; only headlights and tail lights show. */
  blackout: false,
  blackoutLevel: 20,
  blackoutChance: 0.35,
  /** Pay for the harder view: a night shift pays a little more, a blackout more still. */
  nightPayFactor: 1.1,
  blackoutPayFactor: 1.25,

  // Syndicate convoy: every `convoyEvery` levels the criminal is the boss, with armoured escorts
  convoy: false,
  convoyEvery: 15,
  convoyEscorts: 2,
  /** The boss is on the ring this much longer than a plain criminal before it gets away. */
  convoyTimeFactor: 1.5,
  convoyWarning: 3,
  /** The convoy comes early in the shift, so it is there before the last car is sent. */
  convoyFirst: r(1.5, 3),
  heistRecoveryBase: 3000,
  heistRecoveryPerLevel: 200,
  /** Which boss this level brings; `forLevel` sets it from the level. */
  bossKind: 'convoy' as BossKind,
  /** Police rams the boss shrugs off before one finishes it. */
  bossArmour: 0,
  /** An armoured boss is this heavy: a ram bounces off it. */
  bossArmourMass: 6,
  getawayTimeFactor: 0.7,
  armouredTimeFactor: 1.8,
  armouredEscorts: 1,
  phantomEscorts: 1,
  phantomTimeFactor: 1.6,
  /** The twins: how many bosses come, and how soon the second follows the first one caught. */
  bossCount: 1,
  twinsTimeFactor: 1,
  twinsGap: r(0.8, 1.6),
  /** The decoy: escorts in the boss's paint. */
  decoyEscorts: 2,
  decoyTimeFactor: 1.6,
  /** The smuggler: rams it shrugs off, and its time. */
  smugglerArmour: 2,
  smugglerTimeFactor: 2.2,
  /** The kingpin: everything at once, in a blackout. */
  kingpinEscorts: 3,
  kingpinArmour: 1,
  kingpinTimeFactor: 2.2,
  /** This boss's escorts wear its paint (`forLevel` sets it). */
  bossDisguise: false,
  /** From the second round of bosses on: one more escort per round, at most `maxBossEscorts`… */
  bossRoundEscorts: 1,
  maxBossEscorts: 3,
  /** …and a little less time per round. */
  bossRoundTimeFactor: 0.9,

  // Legendary Shifts (core/legendary.ts)
  legendary: null as LegendaryRule | null,
  legendaryLevel: 25,
  legendaryChance: 0.06,
  gridlockDensityBonus: 2,
  dragnetSpeedup: 0.5,
  dragnetTimeFactor: 0.85,
  heavyLoadTruckChance: 0.45,
  heavyLoadTankerShare: 0.5,

  /** From this level cleared on, the Game tab says the other modes are a swipe away (until the first swipe). */
  modeHintAfterLevel: 6,
  /**
   * Level cleared after which the game asks the browser to keep its storage and suggests
   * recommends the Home Screen, once (Leo, 30.09.2026: from Level 5; on iPhone and iPad as a
   * full-screen tip).
   */
  installHintAfterLevel: 4,
  /** Level cleared after which a device without a cloud copy recommends Cloud sync (once; Leo, 01.10.2026: it replaced the export). */
  backupHintAfterLevel: 12,
  /** Level from which the one-time Cloud sync pop-up comes (Leo, 01.10.2026: not before there is progress to keep). */
  cloudIntroFromLevel: 3,
  // Unlocks (Leo, 29.09.2026, `core/unlocks.ts`): a new player meets the systems one at a time.
  // Spread out the same day (`npm run sim:career -- 12 --story=20`): five systems came in the
  // first three minutes; now about one every one to four (Daily ~1 min, modes ~2, Trials ~4,
  // Casino ~8), after the core is learned. Whoever used one already keeps it.
  /** The Daily Shift (and its streak) from this level on. */
  dailyUnlockLevel: 4,
  /** The Trials section in Progress from this level on; each trial opens at its own level. */
  trialsUnlockLevel: 9,
  /** The Casino in the Shop from this level on; it opens quietly, nothing points there. */
  casinoUnlockLevel: 12,

  // Season Pass (core/seasonPass.ts): play money only, a track of 12 tiers per season
  seasonPassLevel: 15,
  seasonPassPrice: 150000,
  /** Tier 1 needs this much XP, every tier after it `seasonPassXpGrowth` more (54 … 186, 1440 in all). */
  seasonPassXpPerTier: 54,
  seasonPassXpGrowth: 12,
  /** Hall of Fame: a monument in the city with a plaque per Prestige rank, and its own skin. */
  hallOfFamePrice: 250000,

  // Prestige (Leo, 28.09.2026): back to Level 1 with the traffic of a higher level; looks only
  prestigeLevel: 50,
  /** Each rank plays this many levels harder, at most `maxPrestigeHeadStart`. */
  prestigeHeadStart: 10,
  maxPrestigeHeadStart: 40,

  // Elite (Leo, 29.09.2026): from `prestigeLevel` on, shifts earn Elite XP on a track of their
  // own that Prestige keeps (core/elite.ts). Looks, titles and chests only, never a bonus.
  /** Elite 1 → 2 needs this much XP, every level after it `eliteXpGrowth` more (Leo, 03.10.2026: progressive). */
  eliteXpPerLevel: 60,
  eliteXpGrowth: 4,
  /** Per completed shift; every Perfect Input and Tight Fit adds 1. */
  eliteXpCompleted: 10,
  eliteXpBoss: 10,
  eliteXpLegendary: 10,
  /** Every Elite level pays a Standard Chest, every this many a Premium Chest instead. */
  elitePremiumEvery: 10,

  // Ambulance (Leo, 28.09.2026): an emergency run once round the ring; keep the road ahead clear
  ambulanceLevel: 8,
  /** Chance per shift; 0 turns it off (Mayhem, multiplayer). */
  ambulanceChance: 0.4,
  /** Early in the shift: short shifts must still see it through. */
  ambulanceFirst: r(2, 5),
  ambulanceWarning: 2,
  /** The stretch of ring ahead of the ambulance where no new car may join. */
  ambulanceClearArc: 120,
  ambulancePay: 300,
  ambulanceLength: 30,
  ambulanceMass: 1.6,
  /**
   * Fire engine (Leo, 30.09.2026): from its level on, some emergency runs are a fire engine
   * instead: long and heavy, with a longer road ahead to keep clear, and better pay.
   */
  fireTruckLevel: 35,
  fireTruckShare: 0.45,
  fireTruckClearArc: 190,
  fireTruckPay: 500,
  fireTruckMass: 2.4,

  // Motorbikes (Leo, 30.09.2026): quick and slim, they slip into gaps a car would not take
  motorbikeLevel: 22,
  /** Share of the new AI cars that are motorbikes. */
  motorbikeShare: 0.12,
  motorbikeLength: 15,
  motorbikeWidth: 7,
  motorbikeMass: 0.35,
  motorbikeMergeFactor: 0.7,
  /** The gap (s) a motorbike takes to join; a car wants `aiSafeGap`. */
  motorbikeEntryGap: 0.1,
  /** A merge of yours that slips past a motorbike (Tight Fit or Near Miss) pays this on top, times the combo. */
  motorbikeBonus: 150,

  // Learner driver (Leo, 30.09.2026): a driving-school car, announced, once round the ring
  learnerLevel: 28,
  /** Chance per shift; 0 turns it off (Mayhem, multiplayer). */
  learnerChance: 0.3,
  learnerFirst: r(3, 9),
  learnerWarning: 2,
  /** It hesitates now and then: brakes down to this share of the ring's speed for a moment. */
  learnerStallEvery: r(2.2, 4.2),
  learnerStallTime: r(0.7, 1.3),
  learnerStallSpeed: 0.35,
  /** Keep your cars this far away from it, ahead and behind, and it pays when it leaves. */
  learnerZoneArc: 80,
  learnerPay: 250,

  // Oversize load (Leo, 02.10.2026, core/oversize.ts): long, heavy and slow, once round the ring
  oversizeLevel: 85,
  /** Chance per shift; 0 turns it off (Mayhem, multiplayer). */
  oversizeChance: 0.3,
  /** Early in the shift: short shifts must still see it through. */
  oversizeFirst: r(2, 6),
  oversizeWarning: 2,
  oversizeLength: 52,
  oversizeMass: 4,
  /** It crawls: at most this share of the ring's speed, and the traffic behind it with it. */
  oversizeSpeed: 0.8,
  /** Keep your cars this far away from it, ahead and behind, and it pays when it leaves. */
  oversizeZoneArc: 70,
  oversizePay: 400,

  // Street racers (Leo, 02.10.2026, core/racers.ts): two of them barge in; a police car stops each
  racerLevel: 90,
  /** Chance per shift; 0 turns it off (Mayhem, multiplayer). */
  racerChance: 0.25,
  racerFirst: r(3, 8),
  racerWarning: 2,
  racerLength: 22,
  racerMass: 0.9,
  /** A racer stopped by a police car of yours pays this. */
  racerPay: 500,

  // Mastery trials (core/trials.ts): an extra rule for this shift, broken ends it as 'failed'
  /** flawless: no crash, no cut-off (a broken rule ends the trial as failed). */
  trialRule: null as TrialRule | null,

  // City events
  cityEvent: null as CityEvent | null,
  cityEventLevel: 4,
  cityEventChance: 0.25,
  roadworksAt: 0,
  roadworksArc: 110,
  roadworksSpeedFactor: 0.6,
  closedArmSlot: null as number | null,
  concertDensityBonus: 2,
  concertSpawnFactor: 0.5,
  vipGapFactor: 1.6,
  policeOperationShare: 0.15,
  /**
   * School Run (Leo, 30.09.2026): school buses join the traffic and stop at a bus stop on the
   * ring; the traffic behind them waits. Merge behind a bus, not into the queue it leaves.
   */
  schoolRunLevel: 30,
  /** Where the bus stop sits on the ring (share of the ring), drawn per shift. */
  busStopAt: 0,
  /** Share of the new AI traffic that is a school bus during a School Run. */
  busShare: 0.28,
  busLength: 44,
  busMass: 2.4,
  /** Seconds a bus stands at the stop. */
  busDwell: 1.6,
  /**
   * Marathon (Leo, 02.10.2026): the runners cross one of the other arms where it joins the ring,
   * again and again; while they cross, that arm's traffic waits at the line. Its rhythm is drawn
   * per shift: crossing for `marathonCrossing` seconds of every `marathonPeriod`.
   */
  marathonLevel: 40,
  marathonArmSlot: null as number | null,
  marathonPeriod: 14,
  marathonCrossing: 6,
  marathonOffset: 0,

  // Motivation
  perfectRunPoints: 1500,
  perfectRunPayFactor: 0.25,
  dailyPay: 300,
  /** The Weekly Elite pays this once a week, with a Premium Chest (core/weekly.ts). */
  weeklyPay: 6000,
  eventChestChance: 0.15,
  tollIncomePerDay: 30,
  loginMaxDays: 3,
  standardChestPrice: 26000,
  premiumChestPrice: 52000,
  adChestsPerDay: 3,

  // Engagement (Leo, 28.09.2026): surprises on top of skill, never instead of it
  /** A Perfect or a Near Miss is now and then a Critical Merge: its points count this many times. */
  criticalChance: 0.07,
  criticalFactor: 3,
  /** Now and then the transporter is a Jackpot: gilded, announced as one, pays this many times. */
  jackpotChance: 0.08,
  jackpotFactor: 5,
  /** A completed career shift now and then drops a Standard Chest. */
  luckyDropChance: 0.06,
  /**
   * The first level cleared gives a Standard Chest (29.09.2026, the first minute): a reward to
   * hold within a minute instead of three, and maybe a map to play on right away.
   */
  welcomeChestLevel: 2,
  /** From this many Daily Shifts in a row, every shift pays `streakBonusPay` more while the streak lives. */
  streakBonusDays: 3,
  streakBonusPay: 0.15,
  /** Hours before midnight from which the waiting card warns that the streak is about to break. */
  streakWarningHours: 6,
  /**
   * Chest reel teaser (Leo, 28.09.2026): when the prize is not Legendary, this share of reels
   * shows a Legendary card right next to it. Display only, the drop odds stay the same; 0 turns it off.
   */
  chestTeaserChance: 0.7,

  // Casino (core/casino.ts, LOOT.md): honest odds, a small house edge, all of it on screen.
  /** The stakes on offer; "All in" stakes whatever there is. */
  casinoStakes: [100, 500, 1000, 5000, 25000],
  /** Crash: the multiplier grows e^(rate·t); P(crash ≥ m) = (1 − edge)/m, so every cash-out returns 1 − edge. */
  crashEdge: 0.04,
  crashRate: 0.18,
  crashMax: 100,
  /** Auto cash-out targets (0: off). */
  crashAutoTargets: [0, 1.5, 2, 5],
  /** Slots: every reel is this strip of 20 stops; each stop is as likely. */
  slotStrip: [
    'car', 'compact', 'van', 'car', 'sportsCar', 'compact', 'car', 'boss', 'van', 'compact',
    'car', 'ambulance', 'compact', 'van', 'car', 'transporter', 'car', 'compact', 'van', 'sportsCar',
  ] as const,
  /** Three of a kind on the line pays this many times the stake. */
  slotTriple: { car: 6, compact: 10, van: 15, sportsCar: 40, ambulance: 100, transporter: 150, boss: 500 },
  /** Two bosses anywhere on the line. */
  slotBossPair: 10,
  /** The first two reels alike (not a boss). Every win pays at least twice the stake. */
  slotPair: 2,
  /** Skin upgrade: what a skin of each rarity is worth; chance = stake / target × (1 − edge). */
  skinValue: { common: 1000, rare: 3000, epic: 9000, legendary: 30000 },
  upgradeEdge: 0.05,
  upgradeMaxChance: 0.75,
  upgradeMaxStake: 5,
  /** Double or nothing: a fair coin, at most this many times in a row. */
  doubleMaxChain: 5,
  casinoLogLength: 20,
  /**
   * How loud a win is, by how many times the stake it pays, the same in every game
   * (`present/casino.ts`): from the first more coins, then confetti, then rays and a jolt,
   * then a gold flash.
   */
  casinoWinTiers: [2, 10, 40, 150] as readonly number[],

  // Late levels
  lateLevel: 6,
  lateDensityPerLevel: 0.3,
  maxLateDensityBonus: 6,
  lateAiGapPerLevel: 0.01,
  minAiSafeGap: 0.06,
  aiLapChance: 0,
  lateLapChancePerLevel: 0.12,
  maxAiLapChance: 0.95,
  aiRollingMerge: false,
  maxWaitingAI: Infinity,
  densityCountsWaiting: true,
  lateSpawnFasterPerLevel: 0.04,
  minSpawnDelayFactor: 0.4,
  aiQueuePerArm: 1,
  longerStayLevel: 12,
  lateLevelsPerQueueCar: 6,
  maxAiQueuePerArm: 1,

  // Bots in the ring
  minRingBots: 3,
  ringBotsPerLevel: 0.25,
  maxMinRingBots: 5,
  botExitNotice: 1.5,
  botJamPatience: 20,
  jamLookahead: 2.5,

  // Multiplayer (core/versus.ts)
  /** Human lanes on the ring: 1 is the normal game, 2–4 a multiplayer match. */
  players: 1,
  /** A lane that sends no car for this long stalls and is out. */
  versusStallSeconds: 10,
  /** While wrecks lie on the road the stall clock waits, but at most this long per car. */
  versusStallGrace: 3,
  /** Match time (s) when rush hour begins: the ring speeds up, a little more traffic. */
  versusRushAt: 30,
  versusRushTempo: 1.15,
  versusRushDensity: 1,
  /** Match time (s) of sudden death: faster still, and the stall clock is short. */
  versusSuddenDeathAt: 60,
  versusSuddenDeathTempo: 1.3,
  versusSuddenDeathStall: 4,
  /** Seconds a new phase takes to reach its tempo. */
  versusPhaseGlide: 2,
  /** Pressure a merge earns (clean, tight fit / near miss, perfect); a full bar sends a lorry. */
  versusPressure: { clean: 1, risky: 3, perfect: 4 },
  versusPressureFull: 16,
  /** Merges in a row without a cut-off that earn a shield against one light crash. */
  versusShieldStreak: 5,
  /** The hardest impact a shield takes (a light bump; `crash` sounds start above 60). */
  versusShieldImpact: 60,
};

export type Config = typeof baseConfig;

export const cloneConfig = (c: Config): Config => ({
  ...c,
  armSlots: [...c.armSlots],
  modules: { ...c.modules },
  comboThresholds: [...c.comboThresholds],
  comboMultipliers: [...c.comboMultipliers],
  crashCosts: [...c.crashCosts],
  crashCostImpacts: [...c.crashCostImpacts],
});

/** 9.81 m/s² in world units per second². */
export const gravity = (c: Config): number => (9.81 * c.carLength) / c.carLengthMeters;

/** Every entry path has this length: at 100 % tempo a merge drives at constant speed. */
export const mergePathLength = (c: Config): number => c.ringSpeed * c.mergeDuration;

/** How many slots apart two slots are, the short way round. */
export function slotDistance(a: number, b: number, slots: number): number {
  const n = Math.max(3, slots);
  const raw = Math.abs(a - b) % n;
  return Math.min(raw, n - raw);
}

/** The slots that carry an arm: sorted, the player's first, only those far enough apart. */
export function builtArmSlots(c: Config): number[] {
  const built = [0];
  for (const slot of [...c.armSlots].sort((a, b) => a - b)) {
    if (slot === 0 || slot <= 0 || slot >= Math.max(3, c.armSlotCount)) continue;
    if (built.every((b) => slotDistance(b, slot, c.armSlotCount) >= c.armSlotSpacing)) built.push(slot);
  }
  return built;
}

/** Module entries in slot order. */
export const moduleEntries = (c: Config): [number, RoadModule][] =>
  Object.entries(c.modules)
    .map(([slot, m]) => [Number(slot), m] as [number, RoadModule])
    .sort((a, b) => a[0] - b[0]);

export function modulePrice(c: Config, m: RoadModule): number {
  return m === 'tollBooth' ? c.tollBoothCost : m === 'speedCamera' ? c.speedCameraCost : c.towDepotCost;
}

export function moduleZone(c: Config, m: RoadModule): { arc: number; speedFactor: number } {
  if (m === 'tollBooth') return { arc: c.tollZoneArc, speedFactor: c.tollSpeedFactor };
  if (m === 'speedCamera') return { arc: c.cameraZoneArc, speedFactor: c.cameraSpeedFactor };
  return { arc: c.towZoneArc, speedFactor: 1 };
}
