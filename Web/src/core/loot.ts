import { Rng } from './rng';

/** What is in the chests (LOOT.md): looks only; a vehicle type is different, not better. */
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
export const rarityRank = (r: Rarity): number => RARITIES.indexOf(r);

export type ChestKind = 'standard' | 'premium' | 'event' | 'criminalHunt';
export const CHEST_KINDS: ChestKind[] = ['standard', 'premium', 'event', 'criminalHunt'];

export const CHEST_ODDS: Record<ChestKind, number[]> = {
  standard: [0.7, 0.22, 0.07, 0.01],
  premium: [0.35, 0.35, 0.22, 0.08],
  event: [0.4, 0.35, 0.2, 0.05],
  criminalHunt: [0.5, 0.3, 0.15, 0.05],
};

export const isForSale = (k: ChestKind): boolean => k === 'standard' || k === 'premium';

export const DUPLICATE_MONEY: Record<Rarity, number> = { common: 250, rare: 600, epic: 1500, legendary: 4000 };

export const PITY_CHESTS = 10;
export const MAX_CAR_SKINS = 5;

export type CosmeticKind = 'carSkin' | 'mapSkin' | 'vehicleType';
export type Season = 'winter' | 'spring' | 'summer' | 'autumn';
export type CosmeticSource = { kind: 'chest' } | { kind: 'streak'; days: number } | { kind: 'season'; season: Season };

export interface Cosmetic {
  id: string;
  kind: CosmeticKind;
  rarity: Rarity;
  source: CosmeticSource;
}

const chest: CosmeticSource = { kind: 'chest' };
const c = (id: string, kind: CosmeticKind, rarity: Rarity, source: CosmeticSource = chest): Cosmetic => ({ id, kind, rarity, source });

export const COSMETICS: Cosmetic[] = [
  c('racingRed', 'carSkin', 'common'),
  c('midnight', 'carSkin', 'common'),
  c('mint', 'carSkin', 'common'),
  c('pearl', 'carSkin', 'common'),
  c('olive', 'carSkin', 'common'),
  c('coral', 'carSkin', 'common'),
  c('sunset', 'carSkin', 'rare'),
  c('ice', 'carSkin', 'rare'),
  c('rose', 'carSkin', 'rare'),
  c('lime', 'carSkin', 'rare'),
  c('copper', 'carSkin', 'rare'),
  c('redStripe', 'carSkin', 'rare'),
  c('pearlShine', 'carSkin', 'rare'),
  c('carbon', 'carSkin', 'epic'),
  c('blackGold', 'carSkin', 'epic'),
  c('nightMint', 'carSkin', 'epic'),
  c('tiger', 'carSkin', 'epic'),
  c('chrome', 'carSkin', 'epic'),
  c('starlight', 'carSkin', 'epic'),
  c('gold', 'carSkin', 'legendary'),
  c('royal', 'carSkin', 'legendary'),
  c('lagoon', 'carSkin', 'legendary'),
  c('diamond', 'carSkin', 'legendary'),
  c('holo', 'carSkin', 'legendary'),
  c('lemon', 'carSkin', 'common'),
  c('plum', 'carSkin', 'common'),
  c('fern', 'carSkin', 'common'),
  c('latte', 'carSkin', 'common'),
  c('teal', 'carSkin', 'rare'),
  c('sky', 'carSkin', 'rare'),
  c('cherry', 'carSkin', 'rare'),
  c('mocha', 'carSkin', 'rare'),
  c('panda', 'carSkin', 'epic'),
  c('hanami', 'carSkin', 'epic'),
  c('volcano', 'carSkin', 'epic'),
  c('ocean', 'carSkin', 'epic'),
  c('koi', 'carSkin', 'legendary'),
  c('obsidian', 'carSkin', 'legendary'),
  c('ruby', 'carSkin', 'legendary'),
  c('dusk', 'mapSkin', 'common'),
  c('sand', 'mapSkin', 'common'),
  c('neon', 'mapSkin', 'rare'),
  c('forest', 'mapSkin', 'rare'),
  c('autumn', 'mapSkin', 'epic'),
  c('sakura', 'mapSkin', 'epic'),
  c('aurora', 'mapSkin', 'legendary'),
  c('ember', 'mapSkin', 'legendary'),
  c('meadow', 'mapSkin', 'common'),
  c('tropic', 'mapSkin', 'rare'),
  c('snowfall', 'mapSkin', 'epic'),
  c('cosmos', 'mapSkin', 'legendary'),
  c('compact', 'vehicleType', 'rare'),
  c('sportsCar', 'vehicleType', 'epic'),
  c('van', 'vehicleType', 'epic'),
  c('streakBronze', 'carSkin', 'rare', { kind: 'streak', days: 7 }),
  c('streakSilver', 'carSkin', 'epic', { kind: 'streak', days: 14 }),
  c('streakGold', 'carSkin', 'legendary', { kind: 'streak', days: 30 }),
  c('frost', 'carSkin', 'epic', { kind: 'season', season: 'winter' }),
  c('blossom', 'carSkin', 'epic', { kind: 'season', season: 'spring' }),
  c('sunburst', 'carSkin', 'epic', { kind: 'season', season: 'summer' }),
  c('pumpkin', 'carSkin', 'epic', { kind: 'season', season: 'autumn' }),
];

export const cosmetic = (id: string): Cosmetic | undefined => COSMETICS.find((x) => x.id === id);

export function seasonOf(day: number): Season {
  const month = new Date(day * 86400000).getUTCMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

export const seasonItems = (season: Season): Cosmetic[] =>
  COSMETICS.filter((x) => x.source.kind === 'season' && x.source.season === season);

export type Album = 'maps' | 'commons' | 'rares' | 'epics' | 'legends' | 'seasons' | 'loyalty';
export const ALBUMS: Album[] = ['maps', 'commons', 'rares', 'epics', 'legends', 'seasons', 'loyalty'];

export const ALBUM_REWARD: Record<Album, number> = {
  commons: 5000,
  maps: 10000,
  rares: 10000,
  epics: 20000,
  loyalty: 20000,
  seasons: 30000,
  legends: 40000,
};

export function albumItems(album: Album): Cosmetic[] {
  const skins = (r: Rarity): Cosmetic[] => COSMETICS.filter((x) => x.kind === 'carSkin' && x.rarity === r && x.source.kind === 'chest');
  switch (album) {
    case 'maps':
      return COSMETICS.filter((x) => x.kind === 'mapSkin' && x.source.kind === 'chest');
    case 'commons':
      return skins('common');
    case 'rares':
      return skins('rare');
    case 'epics':
      return skins('epic');
    case 'legends':
      return skins('legendary');
    case 'seasons':
      return COSMETICS.filter((x) => x.source.kind === 'season');
    case 'loyalty':
      return COSMETICS.filter((x) => x.source.kind === 'streak');
  }
}

export interface ChestOpening {
  chest: ChestKind;
  item: Cosmetic;
  isDuplicate: boolean;
  money: number;
}

/** Draws a rarity by the chest's public odds; the pity counter guarantees an Epic. */
export function rollChest(
  kind: ChestKind,
  collection: readonly string[],
  chestsSinceEpic: number,
  seed: number,
  day: number | null,
): { item: Cosmetic; rarity: Rarity; chestsSinceEpic: number } {
  const rng = new Rng(seed >>> 0);
  let rarity: Rarity = 'common';
  let pick = rng.unit();
  const odds = CHEST_ODDS[kind];
  for (let i = 0; i < RARITIES.length; i++) {
    rarity = RARITIES[i];
    pick -= odds[i];
    if (pick < 0) break;
  }
  if (chestsSinceEpic >= PITY_CHESTS - 1 && rarityRank(rarity) < 2) rarity = 'epic';
  const since = rarityRank(rarity) >= 2 ? 0 : chestsSinceEpic + 1;
  const pool = COSMETICS.filter((x) => x.rarity === rarity && x.source.kind === 'chest');
  let item = rng.pick(pool);
  if (kind === 'event' && day !== null && rng.unit() < 0.5) {
    const seasonal = seasonItems(seasonOf(day)).find((x) => !collection.includes(x.id));
    if (seasonal) item = seasonal;
  }
  return { item, rarity: item.rarity, chestsSinceEpic: since };
}
