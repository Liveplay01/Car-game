import { type Config, cloneConfig } from './config';
import { Rng } from './rng';

// MARK: Shift curves (FOUNDATION.md 2.5)

/** 0 at the start, 1 once `rampSeconds` have passed. */
const ramp = (time: number, c: Config): number => (c.rampSeconds > 0 ? Math.min(Math.max(time / c.rampSeconds, 0), 1) : 1);

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
  const x = c.rushHourRamp > 0 ? Math.min(Math.max((time - rushHourSince) / c.rushHourRamp, 0), 1) : 1;
  const smooth = x * x * (3 - 2 * x);
  return base + (Math.max(c.rushHourTempo, base) - base) * smooth;
}

// MARK: Levels (ROADMAP.md M5)

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
export function forLevel(base: Config, level: number, seed: number): Config {
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
  const quicker = Math.max(base.minSpawnDelayFactor, 1 - late * base.lateSpawnFasterPerLevel);
  c.aiSpawnDelay = { lo: base.aiSpawnDelay.lo * quicker, hi: base.aiSpawnDelay.hi * quicker };
  c.minRingBots = Math.max(base.minRingBots, Math.min(base.maxMinRingBots, base.minRingBots + Math.floor((l - 1) * base.ringBotsPerLevel)));
  c.shiftPay = base.shiftPayBase + base.shiftPayPerLevel * l;
  c.level = l;

  const [lo, hi] = shiftCarsRange(l, base);
  c.shiftCars = new Rng((seed ^ 0x3c6ef372) >>> 0).int(lo, hi);
  return c;
}

// MARK: Upgrades (ROADMAP.md M5, `Upgrades.swift`)

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
};

const priceFactor: Record<Upgrade, number> = {
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
export const upgradeUnlockLevel = (u: Upgrade, c: Config): number => (u === 'insurance' || u === 'robberyInsurance' ? c.crashCostLevel : 1);

/** Price of step `step` (1 = the first), rounded to 50. */
export function upgradePrice(u: Upgrade, step: number, c: Config): number {
  const raw = c.upgradeBaseCost * priceFactor[u] * Math.pow(c.upgradeCostGrowth, Math.max(1, step) - 1);
  return Math.round(raw / 50) * 50;
}

/** This config with the bought steps applied. */
export function upgraded(base: Config, steps: (u: Upgrade) => number): Config {
  const c = cloneConfig(base);
  const step = (u: Upgrade): number => Math.min(Math.max(0, steps(u)), upgradeMaxSteps[u]);
  c.policeShare = Math.min(1, base.policeShare + step('morePatrols') * base.patrolsPerStep);
  c.criminalTime += step('longerPursuit') * base.pursuitPerStep;
  c.criminalChance = Math.max(0, base.criminalChance - step('quietStreets') * base.quietStreetsPerStep);
  c.policeChaseSpeedFactor += step('interceptor') * base.interceptorPerStep;
  c.dispatchComboFactor = Math.min(1, base.dispatchComboFactor + step('dispatchRadio') * base.dispatchRadioPerStep);
  c.maxPoliceCrashes += step('backup') * base.backupPerStep;
  const sooner = step('cashRoute') * base.cashRoutePerStep;
  c.transporterFirst = { lo: Math.max(1, base.transporterFirst.lo - sooner), hi: Math.max(1, base.transporterFirst.hi - sooner) };
  c.transporterInterval = { lo: Math.max(1, base.transporterInterval.lo - sooner), hi: Math.max(1, base.transporterInterval.hi - sooner) };
  c.shiftPay = Math.round(base.shiftPay * (1 + step('overtime') * base.overtimePerStep));
  c.truckChance = Math.min(1, base.truckChance + step('freight') * base.freightPerStep);
  c.driverAcceleration = base.driverAcceleration * (1 + step('quickRecovery') * base.recoveryPerStep);
  c.doubleRunChance = Math.min(1, base.doubleRunChance + step('doubleRun') * base.doubleRunPerStep);
  c.crashInsurance = Math.min(1, base.crashInsurance + step('insurance') * base.insurancePerStep);
  c.robberyInsurance = Math.min(1, base.robberyInsurance + step('robberyInsurance') * base.insurancePerStep);
  return c;
}
