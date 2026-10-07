import { type Config, type Weather, cloneConfig } from './config';
import type { Season } from './loot';

/**
 * Season rules (Leo, 07.10.2026): each season tilts the sky of career shifts. Only the mix changes:
 * how often bad weather comes, which kind, how soon night falls. How bad any weather is stays as it
 * was, and the Daily Shift, the trials and the other modes keep their own sky.
 */
export interface SeasonRule {
  /** Share of the base chance that a shift has bad weather at all. */
  chance: number;
  /** Factors on the weights of the kinds of bad weather; kinds not named keep theirs. */
  weather: Partial<Record<Weather, number>>;
  /** Factor on the chance of a night. */
  night: number;
}

export const SEASON_RULES: Record<Season, SeasonRule> = {
  winter: { chance: 1.15, weather: { fog: 2, snow: 3, hail: 0.5 }, night: 1.5 },
  spring: { chance: 1.3, weather: { lightRain: 2, heavyRain: 1.5 }, night: 1 },
  summer: { chance: 0.7, weather: { storm: 2.5, extreme: 2, hail: 2, sandstorm: 2 }, night: 0.7 },
  autumn: { chance: 1.15, weather: { fog: 3, lightRain: 1.5 }, night: 1.4 },
};

/** This config under the season's rule; null leaves it as it is. */
export function forSeason(base: Config, season: Season | null): Config {
  if (!season) return base;
  const rule = SEASON_RULES[season];
  const c = cloneConfig(base);
  c.season = season;
  c.weatherChanceBias = rule.chance;
  c.weatherBias = { ...rule.weather };
  c.nightBias = rule.night;
  return c;
}
