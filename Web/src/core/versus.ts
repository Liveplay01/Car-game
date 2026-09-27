import { type Config, baseConfig, cloneConfig } from './config';
import { forLevel } from './levels';

/**
 * Multiplayer ("versus"): up to four friends on one roundabout, each with their own lane.
 * Whoever causes a crash is out, so is a lane that stalls; the last one left wins. Everyone
 * runs the same deterministic world (same seed, same taps), so only taps travel the network
 * (`net/`).
 */
export const VERSUS_MAX_PLAYERS = 4;
export const VERSUS_MIN_PLAYERS = 2;

/** The traffic a match starts with: Unlimited's level, eight arms, no special events. */
export function versusConfig(players: number, seed: number): Config {
  const base = cloneConfig(baseConfig);
  const c = forLevel(base, base.endlessLevel, seed);
  c.players = Math.max(VERSUS_MIN_PLAYERS, Math.min(VERSUS_MAX_PLAYERS, players));
  // Eight arms: the players sit apart, AI traffic comes in between.
  c.armSlots = [0, 2, 4, 6, 8, 10, 12, 14];
  c.endless = true;
  c.mayhem = false;
  c.queueVisible = 3;
  c.policeShare = 0;
  c.criminalChance = 0;
  c.militaryChance = 0;
  c.sportsCarShare = 0;
  c.compactShare = 0;
  c.vanShare = 0;
  c.weather = 'clear';
  c.night = false;
  c.cityEvent = null;
  c.closedArmSlot = null;
  c.modules = {};
  c.trialRule = null;
  return c;
}

/** A join code: four digits, leading zeros allowed. */
export const isJoinCode = (code: string): boolean => /^\d{4}$/.test(code);

export const randomJoinCode = (): string => String(Math.floor(Math.random() * 10000)).padStart(4, '0');
