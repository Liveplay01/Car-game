import { type Config, baseConfig } from './config';
import type { Career } from './career';
import type { ShiftResult } from './events';
import { Elite } from './elite';
import { type ChestKind, type Cosmetic, type Season, COSMETICS, DUPLICATE_MONEY, seasonOf } from './loot';
import { clamp } from './vec2';

/**
 * The Season Pass (Leo, 30.09.2026): bought with play money for the season it is (never with
 * real money), then every shift earns Season XP (the same XP as the Elite track) up a track
 * of twelve tiers. The track is the same every season; three of its tiers hold that season's
 * own skins, loud ones with effects. The four seasons come back every year, so a skin missed
 * this winter can be won next winter. Looks only, never a bonus on the road.
 */
export type PassReward = { k: 'chest'; chest: ChestKind } | { k: 'money'; amount: number } | { k: 'skin'; item: Cosmetic };

type Slot = { k: 'chest'; chest: ChestKind } | { k: 'money'; amount: number } | { k: 'skin' };

/** What each tier pays, the same every season; a skin tier takes the season's next skin. */
const TRACK: Slot[] = [
  { k: 'chest', chest: 'standard' },
  { k: 'money', amount: 5000 },
  { k: 'skin' },
  { k: 'chest', chest: 'standard' },
  { k: 'money', amount: 10000 },
  { k: 'chest', chest: 'premium' },
  { k: 'chest', chest: 'event' },
  { k: 'skin' },
  { k: 'money', amount: 20000 },
  { k: 'chest', chest: 'premium' },
  { k: 'money', amount: 30000 },
  { k: 'skin' },
];

export const PASS_TIERS = TRACK.length;

/** What reaching one tier paid. */
export interface PassStep {
  tier: number;
  reward: PassReward;
  /** A skin that was already in the collection pays its duplicate money instead. */
  duplicate: number;
}

const DAY = 86400000;

export const SeasonPass = {
  /** The season a day belongs to, and its year: December already counts to the next winter. */
  key(day: number): string {
    const date = new Date(day * DAY);
    const season = seasonOf(day);
    const year = date.getUTCFullYear() + (date.getUTCMonth() === 11 ? 1 : 0);
    return `${season}-${year}`;
  },

  season: (day: number): Season => seasonOf(day),

  /** The season's three skins, in the order the track gives them. */
  skins: (season: Season): Cosmetic[] =>
    COSMETICS.filter((x) => x.source.kind === 'pass' && x.source.season === season).sort(
      (a, b) => (a.source.kind === 'pass' ? a.source.tier : 0) - (b.source.kind === 'pass' ? b.source.tier : 0),
    ),

  /** What tier `tier` (1 = the first) pays in `season`. */
  reward(tier: number, season: Season): PassReward {
    const slot = TRACK[clamp(tier, 1, PASS_TIERS) - 1];
    if (slot.k !== 'skin') return slot;
    const index = TRACK.slice(0, tier).filter((x) => x.k === 'skin').length - 1;
    return { k: 'skin', item: SeasonPass.skins(season)[index] };
  },

  isOpen: (c: Career, config: Config = baseConfig): boolean => c.level >= config.seasonPassLevel || c.prestige > 0,

  /** This season's pass is bought. */
  owns: (c: Career, day: number): boolean => c.passKey === SeasonPass.key(day),

  canBuy: (c: Career, day: number, config: Config = baseConfig): boolean =>
    SeasonPass.isOpen(c, config) && !SeasonPass.owns(c, day) && c.money >= config.seasonPassPrice,

  /** Buys this season's pass: the track starts at tier 0. */
  buy(c: Career, day: number, config: Config = baseConfig): boolean {
    if (!SeasonPass.canBuy(c, day, config)) return false;
    c.money -= config.seasonPassPrice;
    c.passKey = SeasonPass.key(day);
    c.passXp = 0;
    c.passClaimed = 0;
    return true;
  },

  /** Progressive (Leo, 03.10.2026): the XP from tier `tier - 1` to `tier`, more for every tier. */
  need: (tier: number, config: Config = baseConfig): number =>
    config.seasonPassXpPerTier + config.seasonPassXpGrowth * (clamp(tier, 1, PASS_TIERS) - 1),

  /** All the XP it takes to reach `tier`. */
  xpTo: (tier: number, config: Config = baseConfig): number => {
    const n = clamp(tier, 0, PASS_TIERS);
    return n * config.seasonPassXpPerTier + (config.seasonPassXpGrowth * n * (n - 1)) / 2;
  },

  /** Tiers reached with the XP so far (0…12), never below the tiers already paid. */
  tier(c: Career, config: Config = baseConfig): number {
    let tier = 0;
    while (tier < PASS_TIERS && c.passXp >= SeasonPass.xpTo(tier + 1, config)) tier++;
    return Math.max(tier, Math.min(c.passClaimed, PASS_TIERS));
  },

  progress(c: Career, config: Config = baseConfig): { into: number; need: number } {
    const tier = SeasonPass.tier(c, config);
    if (tier >= PASS_TIERS) return { into: SeasonPass.need(PASS_TIERS, config), need: SeasonPass.need(PASS_TIERS, config) };
    return { into: Math.max(0, c.passXp - SeasonPass.xpTo(tier, config)), need: SeasonPass.need(tier + 1, config) };
  },

  /** Days until the season, and with it this pass, ends. */
  daysLeft(day: number): number {
    const key = SeasonPass.key(day);
    let d = day;
    while (SeasonPass.key(d + 1) === key && d - day < 100) d++;
    return d - day + 1;
  },

  /**
   * Books a finished shift on this season's pass: its XP, then every tier reached pays. Null
   * without the pass (or with last season's: that track has closed).
   */
  record(c: Career, r: ShiftResult, day: number, config: Config = baseConfig): { xp: number; steps: PassStep[] } | null {
    if (!SeasonPass.owns(c, day)) return null;
    const xp = Elite.xpOf(r, config);
    c.passXp += xp;
    const steps: PassStep[] = [];
    const season = SeasonPass.season(day);
    while (c.passClaimed < SeasonPass.tier(c, config)) {
      c.passClaimed++;
      const reward = SeasonPass.reward(c.passClaimed, season);
      let duplicate = 0;
      if (reward.k === 'chest') c.chests.push(reward.chest);
      else if (reward.k === 'money') c.money += reward.amount;
      else if (c.collection.includes(reward.item.id)) {
        duplicate = DUPLICATE_MONEY[reward.item.rarity];
        c.money += duplicate;
      } else {
        c.collection.push(reward.item.id);
        c.unseen.push(reward.item.id);
      }
      steps.push({ tier: c.passClaimed, reward, duplicate });
    }
    return { xp, steps };
  },
};

/** The Hall of Fame (Leo, 30.09.2026): one plaque per Prestige rank, kept for good. */
export interface HallEntry {
  rank: number;
  /** The day the rank was reached (-1: unknown, from before the Hall). */
  day: number;
  bosses: number;
  legendary: number;
  elite: number;
}
