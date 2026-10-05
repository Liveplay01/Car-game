import { COSMETICS } from './loot';

/** The Unlimited ladder: cars sent in one run. The same marks light up the ring while a run climbs. */
export const UNLIMITED_TIERS = [
  { id: 'bronze', cars: 25 },
  { id: 'silver', cars: 50 },
  { id: 'gold', cars: 100 },
  { id: 'platinum', cars: 200 },
  { id: 'diamond', cars: 350 },
  { id: 'master', cars: 500 },
] as const;

export type TierId = (typeof UNLIMITED_TIERS)[number]['id'];

/** The highest tier a best run of `cars` has reached. */
export const tierOf = (cars: number): TierId | null => UNLIMITED_TIERS.filter((t) => t.cars <= cars).pop()?.id ?? null;

export const nextTier = (cars: number): (typeof UNLIMITED_TIERS)[number] | null => UNLIMITED_TIERS.find((t) => t.cars > cars) ?? null;

/** Every tier and every Unlimited skin is a mark in the run. */
export const UNLIMITED_MARKS: number[] = [...new Set([...UNLIMITED_TIERS.map((t) => t.cars), ...COSMETICS.flatMap((x) => (x.source.kind === 'unlimited' ? [x.source.cars] : []))])].sort((a, b) => a - b);

/** The tier that starts exactly at `cars`, or the Unlimited skin that does: what a mark in the run stands for. */
export const markReward = (cars: number): { tier: TierId | null; skin: string | null } => ({
  tier: UNLIMITED_TIERS.find((t) => t.cars === cars)?.id ?? null,
  skin: COSMETICS.find((x) => x.source.kind === 'unlimited' && x.source.cars === cars)?.id ?? null,
});

/** The highest mark a run passed going from `before` to `after` cars, or null. */
export const markPassed = (before: number, after: number): number | null => UNLIMITED_MARKS.filter((m) => m > before && m <= after).pop() ?? null;
