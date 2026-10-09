import {
  type Config,
  type Weather,
  type CityEvent,
  type BossKind,
  type LegendaryRule,
  BOSS_KINDS,
  LEGENDARY_RULES,
  WEATHERS,
  CITY_EVENTS,
  weatherSeverity,
  cloneConfig,
  builtArmSlots,
  slotDistance,
} from './config';
import { Rng } from './rng';
import { clamp } from './vec2';

// MARK: Shift curves (FOUNDATION.md 2.5)

/** 0 at the start, 1 once `rampSeconds` have passed. */
const ramp = (time: number, c: Config): number => (c.rampSeconds > 0 ? clamp(time / c.rampSeconds, 0, 1) : 1);

/** Cars the AI fills the road up to: rises over the ramp; rush hour adds a bonus. */
export function densityAt(time: number, rushHour: boolean, c: Config): number {
  const span = c.densityEnd - c.densityStart;
  const base = c.densityStart + Math.round(span * ramp(time, c));
  let endless = 0;
  if (c.endless && c.endlessDensityEvery > 0) {
    endless = Math.min(c.endlessMaxDensityBonus, Math.floor(Math.max(0, time - c.rampSeconds) / c.endlessDensityEvery));
  }
  return base + (rushHour ? c.rushHourDensityBonus : 0) + endless;
}

/** Tempo as a share of `ringSpeed`: linear over the ramp, then a smooth rise into rush hour. */
export function tempoAt(time: number, rushHourSince: number | null, c: Config): number {
  let base = c.tempoStart + (c.tempoEnd - c.tempoStart) * ramp(time, c);
  if (c.endless) {
    const beyond = Math.max(0, time - c.rampSeconds);
    base = Math.min(Math.max(base, c.endlessMaxTempo), base + (beyond / 60) * c.endlessTempoPerMinute);
  }
  if (rushHourSince === null) return base;
  const x = c.rushHourRamp > 0 ? clamp((time - rushHourSince) / c.rushHourRamp, 0, 1) : 1;
  const smooth = x * x * (3 - 2 * x);
  return base + (Math.max(c.rushHourTempo, base) - base) * smooth;
}

// MARK: Levels (Spiel.md)

export function shiftCarsRange(level: number, c: Config): [number, number] {
  const l = Math.max(1, level);
  const typical = Math.min(c.levelOneCars + c.carsPerLevel * (l - 1), c.maxShiftCars);
  const middle = Math.round(typical);
  return [Math.max(1, middle - c.shiftCarsSpread), Math.max(1, Math.min(c.maxShiftCars, middle + c.shiftCarsSpread))];
}

/**
 * The config of one shift at `level`. Below `hardLevel` the traffic is eased towards the
 * level 1 values; beyond it the tempo keeps rising and the ring fills up.
 */
export function forLevel(base: Config, level: number, seed: number, bossLevel = level): Config {
  const l = Math.max(1, level);
  const c = cloneConfig(base);
  const ease = base.hardLevel > 1 ? Math.min((l - 1) / (base.hardLevel - 1), 1) : 1;
  const mix = (easy: number, hard: number): number => easy + (hard - easy) * ease;
  const mixInt = (easy: number, hard: number): number => Math.round(mix(easy, hard));
  c.densityStart = mixInt(base.easyDensityStart, base.densityStart);
  c.densityEnd = mixInt(base.easyDensityEnd, base.densityEnd);
  c.tempoStart = mix(base.easyTempoStart, base.tempoStart);
  c.tempoEnd = mix(base.easyTempoEnd, base.tempoEnd);
  c.rushHourTempo = mix(base.easyRushHourTempo, base.rushHourTempo);
  c.aiSafeGap = mix(base.easyAiSafeGap, base.aiSafeGap);
  c.criminalTime = mix(base.easyCriminalTime, base.criminalTime);
  c.policeShare = mix(base.easyPoliceShare, base.policeShare);

  const beyond = Math.max(0, l - Math.max(1, base.hardLevel));
  const faster = Math.min(beyond * base.tempoPerLevel, base.maxLevelTempoBonus);
  c.tempoStart += faster;
  c.tempoEnd += faster;
  c.rushHourTempo += faster;
  c.criminalTime = Math.max(Math.min(base.minCriminalTime, c.criminalTime), c.criminalTime - beyond * base.criminalTimePerLevel);

  const late = Math.max(0, l - Math.max(1, base.lateLevel));
  const denser = Math.min(Math.floor(late * base.lateDensityPerLevel), base.maxLateDensityBonus);
  c.densityStart += denser;
  c.densityEnd += denser;
  c.aiSafeGap = Math.max(Math.min(base.minAiSafeGap, c.aiSafeGap), c.aiSafeGap - late * base.lateAiGapPerLevel);
  c.aiLapChance = l >= base.lateLevel ? Math.min(base.maxAiLapChance, 0.35 + late * base.lateLapChancePerLevel) : 0;
  if (l >= base.lateLevel) {
    c.aiRollingMerge = true;
    c.maxWaitingAI = 2;
    c.densityCountsWaiting = false;
  }
  if (l >= base.longerStayLevel && base.exitArmsAhead.hi >= 2) {
    c.exitArmsAhead = { lo: Math.max(2, base.exitArmsAhead.lo), hi: base.exitArmsAhead.hi };
  }
  c.aiQueuePerArm = Math.min(base.maxAiQueuePerArm, base.aiQueuePerArm + Math.floor(late / Math.max(1, base.lateLevelsPerQueueCar)));
  const quicker = Math.max(base.minSpawnDelayFactor, 1 - late * base.lateSpawnFasterPerLevel);
  c.aiSpawnDelay = { lo: base.aiSpawnDelay.lo * quicker, hi: base.aiSpawnDelay.hi * quicker };
  c.minRingBots = Math.max(base.minRingBots, Math.min(base.maxMinRingBots, base.minRingBots + Math.floor((l - 1) * base.ringBotsPerLevel)));
  c.tankerShare = l >= base.tankerLevel ? base.tankerLevelShare : 0;
  c.lanes = l >= base.twoLaneLevel ? 2 : 1;
  c.militaryChance = l >= base.militaryLevel ? base.militaryLevelChance : 0;
  c.shiftPay = base.shiftPayBase + base.shiftPayPerLevel * l;
  c.level = l;
  // A boss level: the criminal of this shift is the syndicate's head, with its escorts.
  const boss = bossAt(Math.max(1, bossLevel), base);
  c.convoy = boss !== null;
  if (boss) {
    c.criminalFirst = base.convoyFirst;
    applyBoss(c, base, boss.kind, boss.round);
  }

  const [lo, hi] = shiftCarsRange(l, base);
  c.shiftCars = new Rng((seed ^ 0x3c6ef372) >>> 0).int(lo, hi);
  return c;
}

// MARK: Syndicate bosses

/** The boss of `level`, or null: every `convoyEvery` levels the next kind, round after round. */
export function bossAt(level: number, c: Config): { kind: BossKind; round: number } | null {
  if (c.convoyEvery <= 0 || level < c.convoyEvery || level % c.convoyEvery !== 0) return null;
  const index = level / c.convoyEvery - 1;
  return { kind: BOSS_KINDS[index % BOSS_KINDS.length], round: Math.floor(index / BOSS_KINDS.length) };
}

/** The first level that brings `kind`. */
export const firstBossLevel = (kind: BossKind, c: Config): number => c.convoyEvery * (BOSS_KINDS.indexOf(kind) + 1);

/** The bosses that come in a blackout: the phantom, and the kingpin's finale. */
export const bossInBlackout = (kind: BossKind): boolean => kind === 'phantom' || kind === 'kingpin';

/** Escorts, time and armour of one boss; later rounds bring more escorts and less time. */
export function applyBoss(c: Config, base: Config, kind: BossKind, round: number): void {
  let escorts = base.convoyEscorts;
  let time = base.convoyTimeFactor;
  let armour = 0;
  let count = 1;
  let disguise = false;
  switch (kind) {
    case 'convoy':
      break;
    case 'getaway':
      escorts = 0;
      time = base.getawayTimeFactor;
      break;
    case 'armoured':
      escorts = base.armouredEscorts;
      time = base.armouredTimeFactor;
      armour = 1;
      break;
    case 'phantom':
      escorts = base.phantomEscorts;
      time = base.phantomTimeFactor;
      break;
    case 'twins':
      escorts = 0;
      time = base.twinsTimeFactor;
      count = 2;
      break;
    case 'decoy':
      escorts = base.decoyEscorts;
      time = base.decoyTimeFactor;
      disguise = true;
      break;
    case 'smuggler':
      escorts = 0;
      time = base.smugglerTimeFactor;
      armour = base.smugglerArmour;
      break;
    case 'kingpin':
      escorts = base.kingpinEscorts;
      time = base.kingpinTimeFactor;
      armour = base.kingpinArmour;
      disguise = true;
      break;
  }
  // The getaway driver, the twins and the smuggler stay alone: their test is the time or the armour.
  const alone = kind === 'getaway' || kind === 'twins' || kind === 'smuggler';
  if (round > 0 && !alone) escorts = Math.min(base.maxBossEscorts, escorts + round * base.bossRoundEscorts);
  c.bossKind = kind;
  c.convoyEscorts = escorts;
  c.convoyTimeFactor = time * Math.pow(base.bossRoundTimeFactor, round);
  c.bossArmour = armour;
  c.bossCount = count;
  c.bossDisguise = disguise;
}

// MARK: Upgrades (Spiel.md)

export const UPGRADES = [
  'morePatrols',
  'longerPursuit',
  'quietStreets',
  'interceptor',
  'dispatchRadio',
  'backup',
  'cashRoute',
  'overtime',
  'freight',
  'quickRecovery',
  'doubleRun',
  'insurance',
  'robberyInsurance',
  // New upgrades go last: a challenge link carries the steps by position.
  'shield',
] as const;

export type Upgrade = (typeof UPGRADES)[number];

export const upgradeMaxSteps: Record<Upgrade, number> = {
  morePatrols: 10,
  overtime: 10,
  longerPursuit: 8,
  cashRoute: 8,
  freight: 8,
  insurance: 7,
  robberyInsurance: 7,
  quietStreets: 5,
  interceptor: 5,
  dispatchRadio: 5,
  doubleRun: 5,
  quickRecovery: 5,
  backup: 3,
  shield: 4,
};

/** The shield has its own prices (`shieldPrices`); the others grow by `upgradeCostGrowth`. */
const priceFactor: Record<Exclude<Upgrade, 'shield'>, number> = {
  morePatrols: 1,
  cashRoute: 1,
  overtime: 1,
  freight: 1,
  longerPursuit: 1.2,
  dispatchRadio: 1.2,
  quickRecovery: 1.2,
  quietStreets: 1.5,
  interceptor: 1.5,
  doubleRun: 1.5,
  insurance: 2,
  robberyInsurance: 2,
  backup: 3,
};

/** The insurances only once there is something to insure. */
export function upgradeUnlockLevel(u: Upgrade, c: Config): number {
  if (u === 'insurance' || u === 'robberyInsurance') return c.crashCostLevel;
  return 1;
}

/** Price of step `step` (1 = the first), rounded to 50. */
export function upgradePrice(u: Upgrade, step: number, c: Config): number {
  if (u === 'shield') return c.shieldPrices[clamp(step, 1, c.shieldPrices.length) - 1];
  const raw = c.upgradeBaseCost * priceFactor[u] * Math.pow(c.upgradeCostGrowth, Math.max(1, step) - 1);
  return Math.round(raw / 50) * 50;
}

/** This config with the bought steps applied. */
export function upgraded(base: Config, steps: (u: Upgrade) => number): Config {
  const c = cloneConfig(base);
  const step = (u: Upgrade): number => clamp(steps(u), 0, upgradeMaxSteps[u]);
  c.policeShare = Math.min(1, base.policeShare + step('morePatrols') * base.patrolsPerStep);
  c.criminalTime += step('longerPursuit') * base.pursuitPerStep;
  c.criminalChance = Math.max(0, base.criminalChance - step('quietStreets') * base.quietStreetsPerStep);
  c.policeChaseSpeedFactor += step('interceptor') * base.interceptorPerStep;
  c.dispatchComboFactor = Math.min(1, base.dispatchComboFactor + step('dispatchRadio') * base.dispatchRadioPerStep);
  c.dispatchLimit = base.dispatchLimit + step('dispatchRadio') * base.dispatchLimitPerStep;
  c.maxPoliceCrashes += step('backup') * base.backupPerStep;
  c.maxStrikes += step('shield');
  const sooner = step('cashRoute') * base.cashRoutePerStep;
  c.transporterFirst = { lo: Math.max(1, base.transporterFirst.lo - sooner), hi: Math.max(1, base.transporterFirst.hi - sooner) };
  c.transporterInterval = { lo: Math.max(1, base.transporterInterval.lo - sooner), hi: Math.max(1, base.transporterInterval.hi - sooner) };
  c.shiftPay = Math.round(base.shiftPay * (1 + step('overtime') * base.overtimePerStep + step('freight') * base.freightPayPerStep + step('quickRecovery') * base.recoveryPayPerStep));
  c.truckChance = Math.min(1, base.truckChance + step('freight') * base.freightPerStep);
  c.driverAcceleration = base.driverAcceleration * (1 + step('quickRecovery') * base.recoveryPerStep);
  c.doubleRunChance = Math.min(1, base.doubleRunChance + step('doubleRun') * base.doubleRunPerStep);
  c.crashInsurance = Math.min(1, base.crashInsurance + step('insurance') * base.insurancePerStep);
  c.robberyInsurance = Math.min(1, base.robberyInsurance + step('robberyInsurance') * base.insurancePerStep);
  return c;
}

// MARK: Arms, weather, city events, Mayhem, Cash Boost

/** A roundabout with more arms: more traffic, transporters sooner, better pay. */
export function forArms(base: Config): Config {
  const extra = Math.max(0, builtArmSlots(base).length - 4);
  if (extra <= 0) return base;
  const c = cloneConfig(base);
  const traffic = 1 + extra * base.trafficPerArm;
  c.densityStart = Math.round(base.densityStart * traffic);
  c.densityEnd = Math.round(base.densityEnd * traffic);
  c.minRingBots = Math.round(base.minRingBots * traffic);
  c.shiftPay = Math.round(base.shiftPay * (1 + extra * base.payPerArm));
  const sooner = Math.max(0.2, 1 - extra * base.transporterPerArm);
  c.transporterFirst = { lo: base.transporterFirst.lo * sooner, hi: base.transporterFirst.hi * sooner };
  c.transporterInterval = { lo: base.transporterInterval.lo * sooner, hi: base.transporterInterval.hi * sooner };
  return c;
}

/** Price of the next arm; null once no slot is free any more. */
export function armPrice(c: Config, built: number[]): number | null {
  const probe = cloneConfig(c);
  probe.armSlots = built;
  const slots = builtArmSlots(probe);
  if (slots.length >= c.armSlotCount / Math.max(1, c.armSlotSpacing)) return null;
  const raw = c.armBaseCost * Math.pow(c.armCostGrowth, Math.max(0, slots.length - 4));
  return Math.round(raw / 100) * 100;
}

/** Whether an arm can be built in `slot`: free, and far enough from the others. */
export function canBuildArm(c: Config, slot: number, built: number[]): boolean {
  if (slot <= 0 || slot >= c.armSlotCount || built.includes(slot)) return false;
  return built.every((b) => slotDistance(b, slot, c.armSlotCount) >= c.armSlotSpacing);
}

export function firstLevelOf(c: Config, w: Weather): number {
  switch (w) {
    case 'clear':
      return 1;
    case 'lightRain':
      return c.lightRainLevel;
    case 'heavyRain':
      return c.heavyRainLevel;
    case 'storm':
      return c.stormLevel;
    case 'extreme':
      return c.extremeLevel;
    case 'fog':
      return c.fogLevel;
    case 'snow':
      return c.snowLevel;
    case 'hail':
      return c.hailLevel;
    case 'sandstorm':
      return c.sandstormLevel;
  }
}

/** How often a kind of bad weather comes, against the others open at the level. */
function weatherWeight(c: Config, w: Weather): number {
  if (w === 'fog') return c.fogWeight;
  if (w === 'snow') return c.snowWeight;
  if (w === 'hail') return c.hailWeight;
  if (w === 'sandstorm') return c.sandstormWeight;
  return 5 - weatherSeverity(w);
}

/** The weather of one shift at `level`, drawn from the seed. */
export function drawWeather(c: Config, level: number, seed: number): Weather {
  const rng = new Rng((seed ^ 0x7e571a2b) >>> 0);
  const raw = Math.min(c.maxBadWeatherChance, c.badWeatherPerLevel * Math.max(0, level - c.lightRainLevel + 1));
  // A season tilts the odds a little, also where the level already holds them at the limit.
  const chance = Math.min(c.maxBadWeatherChance * 1.5, raw * c.weatherChanceBias);
  if (chance <= 0 || rng.unit() >= chance) return 'clear';
  const options = WEATHERS.filter((w) => w !== 'clear' && firstLevelOf(c, w) <= level);
  if (options.length === 0) return 'clear';
  const weights = options.map((w) => weatherWeight(c, w) * (c.weatherBias[w] ?? 1));
  let pick = rng.unit() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < options.length; i++) {
    pick -= weights[i];
    if (pick < 0) return options[i];
  }
  return options[options.length - 1];
}

/** This config under `weather`: tyres, drivers and traffic as that weather has them. */
export function forWeather(base: Config, weather: Weather): Config {
  const c = cloneConfig(base);
  c.weather = weather;
  if (weather === 'fog') {
    // Only the view and the drivers' eyes: the far side fades out, a hazard is seen later.
    c.driverReaction = { lo: base.driverReaction.lo + base.fogReactionDelay, hi: base.driverReaction.hi + base.fogReactionDelay };
    c.shiftPay = Math.round(base.shiftPay * base.fogPayFactor);
    return c;
  }
  if (weather === 'snow') {
    // Ice under the tyres: crashes slide a long way, and nobody stops quickly.
    c.tireGripBrake *= base.snowGrip;
    c.tireGripSide *= base.snowGrip;
    c.driverBrake *= base.snowBrake;
    c.driverReaction = { lo: base.driverReaction.lo + base.snowReactionDelay, hi: base.driverReaction.hi + base.snowReactionDelay };
    c.shiftPay = Math.round(base.shiftPay * base.snowPayFactor);
    return c;
  }
  if (weather === 'hail') {
    // Hailstones: the tyres slip a little, and nobody brakes well on them.
    c.tireGripBrake *= base.hailGrip;
    c.tireGripSide *= base.hailGrip;
    c.driverBrake *= base.hailBrake;
    c.driverReaction = { lo: base.driverReaction.lo + base.hailReactionDelay, hi: base.driverReaction.hi + base.hailReactionDelay };
    c.densityStart += base.hailDensity;
    c.densityEnd += base.hailDensity;
    c.shiftPay = Math.round(base.shiftPay * base.hailPayFactor);
    return c;
  }
  if (weather === 'sandstorm') {
    // Dust takes the view across the ring, and sand on the road some of the grip.
    c.tireGripBrake *= base.sandstormGrip;
    c.tireGripSide *= base.sandstormGrip;
    c.driverReaction = { lo: base.driverReaction.lo + base.sandstormReactionDelay, hi: base.driverReaction.hi + base.sandstormReactionDelay };
    c.shiftPay = Math.round(base.shiftPay * base.sandstormPayFactor);
    return c;
  }
  const severity = weatherSeverity(weather);
  if (severity <= 0) return c;
  const grip = Math.max(0.35, 1 - severity * base.weatherGripLoss);
  c.tireGripBrake *= grip;
  c.tireGripSide *= grip;
  const reaction = severity * base.weatherReactionDelay;
  c.driverReaction = { lo: base.driverReaction.lo + reaction, hi: base.driverReaction.hi + reaction };
  c.driverBrake *= Math.max(0.4, 1 - severity * base.weatherBrakeLoss);
  const denser = Math.max(0, severity - 1) * base.weatherDensityPerStep;
  c.densityStart += denser;
  c.densityEnd += denser;
  if (severity >= 3) c.aiSafeGap *= base.stormAiGapFactor;
  return c;
}

/** Whether one shift at `level` runs at night, drawn from the seed: more likely the higher the level. */
export type Darkness = 'day' | 'night' | 'blackout';

/**
 * Whether one shift at `level` runs at night, drawn from the seed: more likely the higher the
 * level. From `blackoutLevel` on, some nights lose their street lamps too.
 */
export function drawNight(c: Config, level: number, seed: number): Darkness {
  if (level < c.nightLevel) return 'day';
  const rng = new Rng((seed ^ 0x6e176e17) >>> 0);
  const chance = Math.min(c.maxNightChance, c.nightChancePerLevel * (level - c.nightLevel + 1) * c.nightBias);
  if (rng.unit() >= chance) return 'day';
  return level >= c.blackoutLevel && rng.unit() < c.blackoutChance ? 'blackout' : 'night';
}

/** This config at `darkness`: the rules stay, the view gets harder and the pay a little better. */
export function forNight(base: Config, darkness: Darkness): Config {
  const c = cloneConfig(base);
  c.night = darkness !== 'day';
  c.blackout = darkness === 'blackout';
  if (c.night) c.shiftPay = Math.round(base.shiftPay * (c.blackout ? base.blackoutPayFactor : base.nightPayFactor));
  return c;
}

/** The first level a city event can come on: most from `cityEventLevel`, the School Run and the Marathon later. */
export const eventLevel = (c: Config, e: CityEvent): number => (e === 'schoolRun' ? c.schoolRunLevel : e === 'marathon' ? c.marathonLevel : c.cityEventLevel);

/** The event of one shift at `level`, or null. */
export function drawCityEvent(c: Config, level: number, seed: number): CityEvent | null {
  if (level < c.cityEventLevel) return null;
  const rng = new Rng((seed ^ 0x0c17e7e4) >>> 0);
  if (rng.unit() >= c.cityEventChance) return null;
  const options = CITY_EVENTS.filter((e) => (e !== 'roadClosure' || builtArmSlots(c).length >= 4) && eventLevel(c, e) <= level);
  return rng.pick(options);
}

export function forCityEvent(base: Config, event: CityEvent | null, seed: number): Config {
  const c = cloneConfig(base);
  c.cityEvent = event;
  if (!event) return c;
  const rng = new Rng((seed ^ 0x5eed0f0c) >>> 0);
  switch (event) {
    case 'roadworks':
      c.roadworksAt = rng.unit();
      break;
    case 'roadClosure': {
      const aiSlots = builtArmSlots(base).slice(1);
      c.closedArmSlot = aiSlots.length === 0 ? null : rng.pick(aiSlots);
      break;
    }
    case 'concert':
      c.densityStart += base.concertDensityBonus;
      c.densityEnd += base.concertDensityBonus;
      c.aiSpawnDelay = { lo: base.aiSpawnDelay.lo * base.concertSpawnFactor, hi: base.aiSpawnDelay.hi * base.concertSpawnFactor };
      break;
    case 'vipConvoy':
      c.densityStart += 1;
      c.densityEnd += 1;
      c.aiSafeGap *= base.vipGapFactor;
      break;
    case 'policeOperation':
      c.policeShare = Math.min(1, base.policeShare + base.policeOperationShare);
      break;
    case 'schoolRun':
      c.busStopAt = rng.unit();
      break;
    case 'marathon': {
      const aiSlots = builtArmSlots(base).slice(1);
      c.marathonArmSlot = aiSlots.length === 0 ? null : rng.pick(aiSlots);
      c.marathonOffset = rng.unit() * base.marathonPeriod;
      break;
    }
  }
  return c;
}

// MARK: Legendary Shifts

/** Whether a career shift at `level` is a Legendary Shift, and its rule, drawn from the seed. */
export function drawLegendary(c: Config, level: number, seed: number): LegendaryRule | null {
  if (level < c.legendaryLevel || c.convoy) return null;
  const rng = new Rng((seed ^ 0x1e6e7da5) >>> 0);
  if (rng.unit() >= c.legendaryChance) return null;
  return rng.pick(LEGENDARY_RULES);
}

/**
 * The shift under a legendary rule. The rule changes the traffic, never the timing of a tap:
 * - gridlock: rush hour from the first car to the last, and more of it.
 * - dragnet: criminals come twice as often and get away sooner.
 * - heavyLoad: lorries everywhere, half of them tankers.
 * - darkStorm: a storm in a blackout (the sky is set in `Careers.config`).
 * - zeroTolerance: any crash or cut-off ends the shift.
 */
export function forLegendary(base: Config, rule: LegendaryRule | null): Config {
  const c = cloneConfig(base);
  c.legendary = rule;
  switch (rule) {
    case null:
      break;
    case 'gridlock':
      c.rushHourCars = Math.max(base.rushHourCars, base.shiftCars);
      c.densityStart += base.gridlockDensityBonus;
      c.densityEnd += base.gridlockDensityBonus;
      break;
    case 'dragnet': {
      const k = base.dragnetSpeedup;
      c.criminalChance = 1;
      c.criminalFirst = { lo: base.criminalFirst.lo * k, hi: base.criminalFirst.hi * k };
      c.criminalInterval = { lo: base.criminalInterval.lo * k, hi: base.criminalInterval.hi * k };
      c.criminalTime = base.criminalTime * base.dragnetTimeFactor;
      break;
    }
    case 'heavyLoad':
      c.truckChance = Math.max(base.truckChance, base.heavyLoadTruckChance);
      c.tankerShare = Math.max(base.tankerShare, base.heavyLoadTankerShare);
      break;
    case 'darkStorm':
      break;
    case 'zeroTolerance':
      c.trialRule = 'flawless';
      break;
  }
  return c;
}

/**
 * Chill (Leo, 07.10.2026): the calm mode. Unlimited's endless queue at a gentle, even pace, with
 * nothing that can end it: no strikes, no police, no specials, no money. Crashes still happen and
 * the traffic still reacts; the run ends when the player says so (`World.finish`).
 */
export function forChill(base: Config): Config {
  const c = cloneConfig(base);
  c.endless = true;
  c.chill = true;
  c.maxStrikes = Infinity;
  c.maxPoliceCrashes = Infinity;
  c.endlessStages = [];
  c.endlessMaxDensityBonus = 0;
  c.endlessTempoPerMinute = 0;
  c.endlessPayPerCar = 0;
  c.densityStart = base.chillDensity;
  c.densityEnd = base.chillDensity;
  c.tempoStart = base.chillTempo;
  c.tempoEnd = base.chillTempo;
  c.endlessMaxTempo = base.chillTempo;
  c.criminalChance = 0;
  c.policeShare = 0;
  c.ambulanceChance = 0;
  c.learnerChance = 0;
  c.oversizeChance = 0;
  c.racerChance = 0;
  c.weddingChance = 0;
  c.militaryChance = 0;
  c.tankerShare = 0;
  c.shiftPay = 0;
  c.completionBonus = 0;
  c.perfectRunPoints = 0;
  c.criticalChance = 0;
  return c;
}

/** Mayhem: crash as much as you can. No strikes, no money, no stats. */
export function forMayhem(base: Config): Config {
  const c = cloneConfig(base);
  c.mayhem = true;
  c.ambulanceChance = 0;
  c.shiftCars = base.mayhemCars;
  c.densityEnd += base.mayhemExtraTraffic;
  c.densityStart = c.densityEnd;
  c.minRingBots += base.mayhemExtraTraffic;
  c.criminalChance = 0;
  c.policeShare = 0;
  c.shiftPay = 0;
  c.completionBonus = 0;
  c.perfectRunPoints = 0;
  c.truckChance = base.mayhemTruckChance;
  c.queueAdvanceDuration = Math.max(base.queueAdvanceDuration, base.mayhemReload);
  c.driverAcceleration *= base.mayhemRecoveryFactor;
  c.tankerShare = base.mayhemTankerShare;
  c.militaryChance = 1;
  c.militaryFirst = base.mayhemMilitaryFirst;
  c.militaryPerShift = base.mayhemMilitaryPerShift;
  c.militaryInterval = base.mayhemMilitaryInterval;
  return c;
}
