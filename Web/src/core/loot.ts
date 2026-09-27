import type { Rng } from './rng';

/** What is in the chests (LOOT.md). Looks only; a vehicle type is different, not better. */
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

export type ChestKind = 'standard' | 'premium' | 'criminalHunt';

export const CHEST_ODDS: Record<ChestKind, number[]> = {
  standard: [0.7, 0.22, 0.07, 0.01],
  premium: [0.35, 0.35, 0.22, 0.08],
  criminalHunt: [0.5, 0.3, 0.15, 0.05],
};

export const CHEST_NAMES: Record<ChestKind, string> = {
  standard: 'Standard Chest',
  premium: 'Premium Chest',
  criminalHunt: 'Criminal Hunt Chest',
};

/** A duplicate turns into money. */
export const DUPLICATE_MONEY: Record<Rarity, number> = { common: 250, rare: 600, epic: 1500, legendary: 4000 };

/** At the latest the 10th chest in a row without an Epic is at least Epic. */
export const PITY_CHESTS = 10;

export interface SkinLook {
  body: string;
  /** Second colour from windscreen to rear window. */
  roof?: string;
  /** Two thin racing stripes. */
  stripe?: string;
  shiny?: boolean;
  glitter?: boolean;
}

export interface Cosmetic {
  id: string;
  name: string;
  rarity: Rarity;
  kind: 'carSkin' | 'vehicleType';
  look: SkinLook;
}

const skin = (id: string, name: string, rarity: Rarity, look: SkinLook): Cosmetic => ({ id, name, rarity, kind: 'carSkin', look });

const C = {
  racingRed: '#D93A3A',
  midnight: '#2A3350',
  mint: '#8FE3C4',
  sunset: '#F08A4B',
  ice: '#BFE6F5',
  carbon: '#2E3136',
  gold: '#E3C15A',
  pearl: '#F2EEE6',
  olive: '#7A8450',
  coral: '#F27B6B',
  rose: '#E58FB0',
  lime: '#B5E35A',
  copper: '#B8703F',
  lagoon: '#2BB3A8',
  chrome: '#C9D1DA',
  holo: '#B9A7F2',
  lemon: '#F2E27A',
  plum: '#8E4A6B',
  fern: '#5E9E6E',
  latte: '#C8A27C',
  cherry: '#B3243B',
  mocha: '#6B4A3A',
  cream: '#EDE3CC',
  teal: '#1F8A8A',
  sky: '#8CC8F0',
  hanami: '#F9CFE0',
  ocean: '#1C5D7A',
  koi: '#F2662E',
  obsidian: '#16171B',
  ruby: '#9B1B30',
  graphite: '#8A94A1',
  ember: '#FF6A3D',
  white: '#F4F6F9',
  black: '#0B0D10',
};

/** The 39 car skins from chests, plus the three vehicle types. */
export const CATALOG: Cosmetic[] = [
  skin('racingRed', 'Racing Red', 'common', { body: C.racingRed }),
  skin('midnight', 'Midnight', 'common', { body: C.midnight }),
  skin('mint', 'Mint', 'common', { body: C.mint }),
  skin('pearl', 'Pearl', 'common', { body: C.pearl }),
  skin('olive', 'Olive', 'common', { body: C.olive }),
  skin('coral', 'Coral', 'common', { body: C.coral }),
  skin('lemon', 'Lemon', 'common', { body: C.lemon }),
  skin('plum', 'Plum', 'common', { body: C.plum }),
  skin('fern', 'Fern', 'common', { body: C.fern }),
  skin('latte', 'Latte', 'common', { body: C.latte }),
  skin('sunset', 'Sunset', 'rare', { body: C.sunset }),
  skin('ice', 'Ice', 'rare', { body: C.ice }),
  skin('rose', 'Rose', 'rare', { body: C.rose }),
  skin('lime', 'Lime', 'rare', { body: C.lime }),
  skin('copper', 'Copper', 'rare', { body: C.copper }),
  skin('redStripe', 'Red Stripe', 'rare', { body: C.racingRed, stripe: C.white }),
  skin('pearlShine', 'Pearl Shine', 'rare', { body: C.pearl, shiny: true }),
  skin('teal', 'Teal', 'rare', { body: C.teal }),
  skin('sky', 'Sky Top', 'rare', { body: C.sky, roof: C.pearl }),
  skin('cherry', 'Cherry Top', 'rare', { body: C.cherry, roof: C.pearl }),
  skin('mocha', 'Mocha Cream', 'rare', { body: C.mocha, roof: C.cream }),
  skin('carbon', 'Carbon', 'epic', { body: C.carbon }),
  skin('blackGold', 'Black & Gold', 'epic', { body: C.carbon, stripe: C.gold }),
  skin('nightMint', 'Night Mint', 'epic', { body: '#3A4048', stripe: C.mint }),
  skin('tiger', 'Tiger', 'epic', { body: C.sunset, stripe: C.black }),
  skin('chrome', 'Chrome', 'epic', { body: C.chrome, shiny: true }),
  skin('starlight', 'Starlight', 'epic', { body: C.midnight, glitter: true }),
  skin('panda', 'Panda', 'epic', { body: C.pearl, roof: C.obsidian }),
  skin('hanami', 'Hanami', 'epic', { body: C.hanami, roof: C.pearl, glitter: true }),
  skin('volcano', 'Volcano', 'epic', { body: C.carbon, stripe: C.ember, glitter: true }),
  skin('ocean', 'Ocean', 'epic', { body: C.ocean, stripe: C.white, shiny: true }),
  skin('gold', 'Gold', 'legendary', { body: C.gold }),
  skin('royal', 'Royal', 'legendary', { body: C.pearl, stripe: C.gold }),
  skin('lagoon', 'Lagoon', 'legendary', { body: C.lagoon, stripe: C.gold }),
  skin('diamond', 'Diamond', 'legendary', { body: C.ice, shiny: true, glitter: true }),
  skin('holo', 'Holo', 'legendary', { body: C.holo, stripe: C.mint, shiny: true }),
  skin('koi', 'Koi', 'legendary', { body: C.pearl, roof: C.koi, stripe: C.gold, shiny: true }),
  skin('obsidian', 'Obsidian', 'legendary', { body: C.obsidian, shiny: true, glitter: true }),
  skin('ruby', 'Ruby', 'legendary', { body: C.ruby, stripe: C.gold, glitter: true }),
  { id: 'compact', name: 'Compact', rarity: 'rare', kind: 'vehicleType', look: { body: '#9FC46B' } },
  { id: 'sportsCar', name: 'Sports Car', rarity: 'epic', kind: 'vehicleType', look: { body: '#E2553F' } },
  { id: 'van', name: 'Van', rarity: 'epic', kind: 'vehicleType', look: { body: '#DCD4C3' } },
];

export const cosmetic = (id: string): Cosmetic | undefined => CATALOG.find((c) => c.id === id);

export const VEHICLE_TYPE_NOTES: Record<string, string> = {
  compact: 'Very short and light, but slower off the line. Easy to fit, harder to time.',
  sportsCar: 'Short and light, merges 20 % quicker. A different timing, not a bonus.',
  van: 'Long and heavy, merges a touch quicker. Harder to fit, easier to time.',
};

export interface ChestOpening {
  chest: ChestKind;
  item: Cosmetic;
  isDuplicate: boolean;
  money: number;
}

/** Draws a rarity by the chest's public odds; the pity counter guarantees an Epic. */
export function openChest(
  kind: ChestKind,
  owned: readonly string[],
  chestsSinceEpic: number,
  rng: Rng,
): { opening: ChestOpening; chestsSinceEpic: number } {
  const odds = CHEST_ODDS[kind];
  let roll = rng.unit();
  let rarityIndex = RARITIES.length - 1;
  for (let i = 0; i < odds.length; i++) {
    if (roll < odds[i]) {
      rarityIndex = i;
      break;
    }
    roll -= odds[i];
  }
  if (chestsSinceEpic >= PITY_CHESTS - 1 && rarityIndex < 2) rarityIndex = 2;
  const rarity = RARITIES[rarityIndex];
  const pool = CATALOG.filter((c) => c.rarity === rarity);
  const item = rng.pick(pool);
  const isDuplicate = owned.includes(item.id);
  return {
    opening: { chest: kind, item, isDuplicate, money: isDuplicate ? DUPLICATE_MONEY[rarity] : 0 },
    chestsSinceEpic: rarityIndex >= 2 ? 0 : chestsSinceEpic + 1,
  };
}
