/**
 * All tuning values in one place, ported 1:1 from `Game/Sources/GameCore/Config.swift`.
 *
 * Units: world units (wu), seconds, wu per second. The world has the same size on every
 * device, only the camera zooms, so timing is identical everywhere.
 */
export interface Range {
  readonly lo: number;
  readonly hi: number;
}

const r = (lo: number, hi: number): Range => ({ lo, hi });

export type Weather = 'clear' | 'lightRain' | 'heavyRain' | 'storm' | 'extreme';
export const WEATHERS: Weather[] = ['clear', 'lightRain', 'heavyRain', 'storm', 'extreme'];
export const weatherSeverity = (w: Weather): number => WEATHERS.indexOf(w);

export type CityEvent = 'roadworks' | 'roadClosure' | 'concert' | 'vipConvoy' | 'policeOperation';
export const CITY_EVENTS: CityEvent[] = ['roadworks', 'roadClosure', 'concert', 'vipConvoy', 'policeOperation'];

export type RoadModule = 'tollBooth' | 'speedCamera' | 'towDepot';
export const ROAD_MODULES: RoadModule[] = ['tollBooth', 'speedCamera', 'towDepot'];

export const baseConfig = {
  // Roundabout
  armSlotCount: 16,
  armSlots: [0, 4, 8, 12] as number[],
  armSlotSpacing: 2,
  ringRadiusPerArm: 18,
  ringRadius: 120,
  laneWidth: 24,
  mergeAngle: 0.26,

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
  nearMissSeconds: 0.2,
  perfectBalance: 0.25,
  perfectMaxGap: 2,

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
  badWeatherPerLevel: 0.03,
  maxBadWeatherChance: 0.6,
  weatherGripLoss: 0.15,
  weatherReactionDelay: 0.1,
  weatherBrakeLoss: 0.1,
  weatherDensityPerStep: 1,
  stormAiGapFactor: 0.8,

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

  // Motivation
  perfectRunPoints: 1500,
  perfectRunPayFactor: 0.25,
  dailyPay: 300,
  eventChestChance: 0.15,
  tollIncomePerDay: 30,
  loginMaxDays: 3,
  standardChestPrice: 26000,
  premiumChestPrice: 52000,
  adChestsPerDay: 3,

  // Monetisation (placeholders)
  adCashPerDay: 3,
  adCashBase: 2000,
  adCashPerLevel: 250,
  starterPackMoney: 30000,
  cashSmallAmount: 25000,
  cashMediumAmount: 90000,
  cashLargeAmount: 240000,
  premiumChestBundle: 3,
  cashBoostPay: 1.5,

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
