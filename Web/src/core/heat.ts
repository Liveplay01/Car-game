import { type Config, cloneConfig } from './config';

/**
 * Heat (Leo, 05.10.2026): a voluntary difficulty for career shifts, for players who found the
 * road too easy. Each step is harder traffic and pays more; a shift cleared at a Heat opens the
 * next one. Never over the Daily Shift (the same for everyone), Unlimited or a trial.
 */
export function forHeat(base: Config, heat: number): Config {
  if (heat <= 0) return base;
  const c = cloneConfig(base);
  c.heat = heat;
  const faster = base.heatTempo * heat;
  c.tempoStart += faster;
  c.tempoEnd += faster;
  c.rushHourTempo += faster;
  const denser = Math.floor(heat / base.heatDensityEvery);
  c.densityStart += denser;
  c.densityEnd += denser;
  c.criminalTime = Math.max(base.heatMinCriminalTime, c.criminalTime * (1 - base.heatCriminal * heat));
  const quicker = Math.max(base.heatMinSpawnFactor, 1 - base.heatSpawn * heat);
  c.aiSpawnDelay = { lo: c.aiSpawnDelay.lo * quicker, hi: c.aiSpawnDelay.hi * quicker };
  return c;
}

/** What a Heat adds to a shift's pay (0.3 = 30 %). */
export const heatPay = (heat: number, config: Config): number => heat * config.heatPay;

/** The Elite XP a completed shift at `heat` earns on top. */
export const heatXp = (heat: number, config: Config): number => heat * config.eliteXpHeat;
