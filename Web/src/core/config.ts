/**
 * All tuning values in one place, ported from `Game/Sources/GameCore/Config.swift`.
 *
 * Units: world units (wu), seconds, wu per second. The world has the same size on every
 * device, only the camera zooms, so timing is identical everywhere.
 */
export interface Range {
  readonly lo: number;
  readonly hi: number;
}

const r = (lo: number, hi: number): Range => ({ lo, hi });

export const baseConfig = {
  // Roundabout
  armSlotCount: 16,
  armSlots: [0, 4, 8, 12] as number[],
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
  mergeResponsibility: 1,

  // Rating
  tightFitSeconds: 0.12,
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
  transporterMass: 1.6,
  doubleRunChance: 0,
  doubleRunDelay: r(2, 3),

  // Lorries and the player's car types (LOOT.md)
  truckChance: 0.22,
  truckLength: 36,
  truckMass: 2.2,
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

  // Strikes
  maxStrikes: 1,
  maxPoliceCrashes: 3,

  // Shift
  shiftCars: 15,
  rushHourCars: 4,
  rampSeconds: 20,
  densityStart: 6,
  densityEnd: 10,
  rushHourDensityBonus: 2,
  tempoStart: 1.05,
  tempoEnd: 1.2,
  rushHourTempo: 1.35,
  rushHourRamp: 1,
  rushHourScoreFactor: 2,

  // Unlimited
  endless: false,
  endlessLevel: 3,
  endlessDensityEvery: 25,
  endlessMaxDensityBonus: 8,
  endlessTempoPerMinute: 0.08,
  endlessMaxTempo: 1.6,
  endlessPayPerCar: 20,

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

  // Perfect Run
  perfectRunPoints: 1500,
  perfectRunPayFactor: 0.25,

  // Chests (LOOT.md)
  standardChestPrice: 26000,
  premiumChestPrice: 52000,

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
  longerStayLevel: 12,

  // Bots in the ring
  minRingBots: 3,
  ringBotsPerLevel: 0.25,
  maxMinRingBots: 5,
  botExitNotice: 1.5,
  botJamPatience: 20,
};

export type Config = typeof baseConfig;

export const cloneConfig = (c: Config): Config => ({
  ...c,
  armSlots: [...c.armSlots],
  comboThresholds: [...c.comboThresholds],
  comboMultipliers: [...c.comboMultipliers],
  crashCosts: [...c.crashCosts],
  crashCostImpacts: [...c.crashCostImpacts],
});

/** 9.81 m/s² in world units per second². */
export const gravity = (c: Config): number => (9.81 * c.carLength) / c.carLengthMeters;

/** Every entry path has this length: at 100 % tempo a merge drives at constant speed. */
export const mergePathLength = (c: Config): number => c.ringSpeed * c.mergeDuration;
