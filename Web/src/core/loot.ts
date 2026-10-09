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
/** Spätestens die 40. Truhe in Folge ohne Legendary ist eine. */
export const PITY_LEGENDARY_CHESTS = 40;
export const MAX_CAR_SKINS = 8;

export type CosmeticKind = 'carSkin' | 'mapSkin' | 'vehicleType';
export type Season = 'winter' | 'spring' | 'summer' | 'autumn';
export type CosmeticSource =
  | { kind: 'chest' }
  | { kind: 'streak'; days: number }
  | { kind: 'season'; season: Season }
  /** Earned by completing this many Legendary Shifts. */
  | { kind: 'legendary'; shifts: number }
  /** Earned by reaching this Prestige rank. */
  | { kind: 'prestige'; rank: number }
  /** Earned on the Elite track (core/elite.ts) at this Elite level. */
  | { kind: 'elite'; level: number }
  /** A tier of the Season Pass (core/seasonPass.ts) in its season. */
  | { kind: 'pass'; season: Season; tier: number }
  /** Built the Hall of Fame. */
  | { kind: 'hall' }
  /** Sent this many cars in one Unlimited run (Leo, 02.10.2026). */
  | { kind: 'unlimited'; cars: number }
  /** Reported this many bugs on the website with a friend code (Leo, 03.10.2026; up to six, 10.10.2026): the server hands it out. */
  | { kind: 'bugReport'; reports: number }
  /** A stop of a limited-time Tour (core/tours.ts); the tour comes back every year. */
  | { kind: 'tour'; tour: string }
  /**
   * The one honour that is luck (Leo, 01.10.2026): found in this chest with this chance per
   * opening, until it is found. On the Honours shelf, never in a chest's normal pool.
   */
  | { kind: 'find'; chest: ChestKind; chance: number };

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
  c('harbour', 'mapSkin', 'common'),
  c('vineyard', 'mapSkin', 'rare'),
  c('grove', 'mapSkin', 'epic'),
  c('abyss', 'mapSkin', 'legendary'),
  c('canyon', 'mapSkin', 'common'),
  c('highland', 'mapSkin', 'rare'),
  c('lanterns', 'mapSkin', 'epic'),
  c('crystal', 'mapSkin', 'legendary'),
  c('beach', 'mapSkin', 'common'),
  c('savanna', 'mapSkin', 'rare'),
  c('rainforest', 'mapSkin', 'epic'),
  c('alps', 'mapSkin', 'epic'),
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
  c('laurel', 'carSkin', 'rare', { kind: 'legendary', shifts: 1 }),
  c('crown', 'carSkin', 'epic', { kind: 'legendary', shifts: 5 }),
  c('phoenix', 'carSkin', 'legendary', { kind: 'legendary', shifts: 15 }),
  c('starSilver', 'carSkin', 'epic', { kind: 'prestige', rank: 1 }),
  c('starGold', 'carSkin', 'epic', { kind: 'prestige', rank: 2 }),
  c('starIris', 'carSkin', 'legendary', { kind: 'prestige', rank: 3 }),
  // The player's own picture or video behind the roundabout (Leo, 01.10.2026; ui/backdrop.ts).
  c('bigScreen', 'mapSkin', 'legendary', { kind: 'prestige', rank: 5 }),
  // Feats (Leo, 01.10.2026): the hardest deeds in the game, never luck. Progress → Mastery → Feats (core/feats.ts).
  c('nova', 'carSkin', 'legendary', { kind: 'prestige', rank: 10 }),
  c('gilded', 'mapSkin', 'legendary', { kind: 'prestige', rank: 15 }),
  c('singularity', 'carSkin', 'legendary', { kind: 'prestige', rank: 20 }),
  c('zenith', 'carSkin', 'legendary', { kind: 'elite', level: 75 }),
  c('eventHorizon', 'mapSkin', 'legendary', { kind: 'elite', level: 100 }),
  c('undying', 'carSkin', 'legendary', { kind: 'legendary', shifts: 50 }),
  c('eliteSteel', 'carSkin', 'rare', { kind: 'elite', level: 5 }),
  c('eliteBlaze', 'carSkin', 'epic', { kind: 'elite', level: 15 }),
  c('eliteJade', 'carSkin', 'epic', { kind: 'elite', level: 25 }),
  c('eliteAurum', 'carSkin', 'legendary', { kind: 'elite', level: 35 }),
  c('eliteHalo', 'carSkin', 'legendary', { kind: 'elite', level: 45 }),
  // The Season Pass: three skins per season, loud and animated (Leo, 30.09.2026).
  c('blizzard', 'carSkin', 'epic', { kind: 'pass', season: 'winter', tier: 3 }),
  c('northernLights', 'carSkin', 'legendary', { kind: 'pass', season: 'winter', tier: 8 }),
  c('glacier', 'carSkin', 'legendary', { kind: 'pass', season: 'winter', tier: 12 }),
  c('petalStorm', 'carSkin', 'epic', { kind: 'pass', season: 'spring', tier: 3 }),
  c('rainbow', 'carSkin', 'legendary', { kind: 'pass', season: 'spring', tier: 8 }),
  c('bloomGlow', 'carSkin', 'legendary', { kind: 'pass', season: 'spring', tier: 12 }),
  c('solarFlare', 'carSkin', 'epic', { kind: 'pass', season: 'summer', tier: 3 }),
  c('neonWave', 'carSkin', 'legendary', { kind: 'pass', season: 'summer', tier: 8 }),
  c('lava', 'carSkin', 'legendary', { kind: 'pass', season: 'summer', tier: 12 }),
  c('ghost', 'carSkin', 'epic', { kind: 'pass', season: 'autumn', tier: 3 }),
  c('harvestMoon', 'carSkin', 'legendary', { kind: 'pass', season: 'autumn', tier: 8 }),
  c('thunder', 'carSkin', 'legendary', { kind: 'pass', season: 'autumn', tier: 12 }),
  c('hallOfFame', 'carSkin', 'legendary', { kind: 'hall' }),
  // Prestige from ★4 on, so no rank comes empty-handed (Leo, 02.10.2026): a skin here, a title on
  // the ranks between (core/elite.ts). Looks only, like every honour.
  c('quasar', 'carSkin', 'epic', { kind: 'prestige', rank: 4 }),
  c('prism', 'carSkin', 'legendary', { kind: 'prestige', rank: 7 }),
  c('meteor', 'carSkin', 'legendary', { kind: 'prestige', rank: 9 }),
  c('eclipse', 'carSkin', 'legendary', { kind: 'prestige', rank: 12 }),
  c('nebula', 'carSkin', 'legendary', { kind: 'prestige', rank: 14 }),
  c('comet', 'carSkin', 'legendary', { kind: 'prestige', rank: 17 }),
  c('starforge', 'carSkin', 'legendary', { kind: 'prestige', rank: 19 }),
  // More honours for the long road (Leo, 06.10.2026): looks only, never luck. A map for Elite 85 and one for Prestige ★25 are Feats.
  c('chrono', 'carSkin', 'legendary', { kind: 'elite', level: 55 }),
  c('biolume', 'carSkin', 'legendary', { kind: 'elite', level: 65 }),
  c('dragon', 'carSkin', 'legendary', { kind: 'legendary', shifts: 30 }),
  c('glowtide', 'mapSkin', 'legendary', { kind: 'elite', level: 85 }),
  c('moonmirror', 'mapSkin', 'legendary', { kind: 'prestige', rank: 25 }),
  // Past Elite 100 (Leo, 10.10.2026): six more skins along the track up to Elite 200, looks only.
  c('monolith', 'carSkin', 'legendary', { kind: 'elite', level: 110 }),
  c('tempest', 'carSkin', 'legendary', { kind: 'elite', level: 130 }),
  c('solstice', 'carSkin', 'legendary', { kind: 'elite', level: 145 }),
  c('abyssal', 'carSkin', 'legendary', { kind: 'elite', level: 165 }),
  c('regalia', 'carSkin', 'legendary', { kind: 'elite', level: 185 }),
  c('apotheosis', 'carSkin', 'legendary', { kind: 'elite', level: 195 }),
  // Unlimited milestones: cars sent in one run.
  c('endurance', 'carSkin', 'epic', { kind: 'unlimited', cars: 250 }),
  c('overdrive', 'carSkin', 'legendary', { kind: 'unlimited', cars: 500 }),
  c('infinity', 'carSkin', 'legendary', { kind: 'unlimited', cars: 1000 }),
  // The bug hunter (Leo, 03.10.2026): only for bugs reported on the website with a friend code, one more skin per report (up to six, 10.10.2026).
  c('ladybug', 'carSkin', 'epic', { kind: 'bugReport', reports: 1 }),
  c('goldbug', 'carSkin', 'epic', { kind: 'bugReport', reports: 2 }),
  c('scarab', 'carSkin', 'epic', { kind: 'bugReport', reports: 3 }),
  c('bluebottle', 'carSkin', 'legendary', { kind: 'bugReport', reports: 4 }),
  c('orchid', 'carSkin', 'legendary', { kind: 'bugReport', reports: 5 }),
  c('firefly', 'carSkin', 'legendary', { kind: 'bugReport', reports: 6 }),
  // Tours (Leo, 07.10.2026): earned at the stops of a limited-time event, which returns every year.
  c('jackOLantern', 'carSkin', 'rare', { kind: 'tour', tour: 'halloween' }),
  c('witchingHour', 'carSkin', 'epic', { kind: 'tour', tour: 'halloween' }),
  c('wraith', 'carSkin', 'legendary', { kind: 'tour', tour: 'halloween' }),
  c('candyCane', 'carSkin', 'rare', { kind: 'tour', tour: 'winter' }),
  c('snowGlobe', 'carSkin', 'epic', { kind: 'tour', tour: 'winter' }),
  c('sleigh', 'carSkin', 'legendary', { kind: 'tour', tour: 'winter' }),
  // The Classic: one Standard Chest in 500 (Leo, 01.10.2026).
  c('classic', 'vehicleType', 'legendary', { kind: 'find', chest: 'standard', chance: 0.002 }),
];

/** What a chest can turn up besides its normal pool, with the chance per opening. */
export const chestFinds = (kind: ChestKind): Cosmetic[] => COSMETICS.filter((x) => x.source.kind === 'find' && x.source.chest === kind);

/** The item a completed Legendary Shift count unlocks, if any. */
export const legendaryReward = (shifts: number): Cosmetic | undefined =>
  COSMETICS.find((x) => x.source.kind === 'legendary' && x.source.shifts === shifts);

/** The map that shows the player's own picture or video instead of a city. */
export const BIG_SCREEN = 'bigScreen';

/** The item a Prestige rank unlocks, if any. */
export const prestigeReward = (rank: number): Cosmetic | undefined => COSMETICS.find((x) => x.source.kind === 'prestige' && x.source.rank === rank);

/** The Unlimited milestones a run of `cars` has reached. */
export const unlimitedRewards = (cars: number): Cosmetic[] => COSMETICS.filter((x) => x.source.kind === 'unlimited' && x.source.cars <= cars);

/** The item an Elite level unlocks, if any. */
export const eliteReward = (level: number): Cosmetic | undefined => COSMETICS.find((x) => x.source.kind === 'elite' && x.source.level === level);

/** Earned by deeds, not found in chests: Legendary Shifts, Prestige and the Elite track. */
export const isHonour = (item: Cosmetic): boolean =>
  item.source.kind === 'legendary' ||
  item.source.kind === 'prestige' ||
  item.source.kind === 'elite' ||
  item.source.kind === 'hall' ||
  item.source.kind === 'unlimited' ||
  item.source.kind === 'bugReport' ||
  item.source.kind === 'tour' ||
  item.source.kind === 'find';

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

export type Album = 'maps' | 'commons' | 'rares' | 'epics' | 'legends' | 'seasons' | 'loyalty' | 'honours' | 'pass' | 'tours';
export const ALBUMS: Album[] = ['maps', 'commons', 'rares', 'epics', 'legends', 'seasons', 'loyalty', 'honours', 'pass', 'tours'];

export const ALBUM_REWARD: Record<Album, number> = {
  pass: 60000,
  tours: 30000,
  honours: 50000,
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
    case 'honours':
      // Deeds in the game only: a find is luck, and the bug hunter skins need the website (not offered
      // inside CrazyGames), so an album must not wait on either.
      return COSMETICS.filter((x) => isHonour(x) && x.source.kind !== 'find' && x.source.kind !== 'bugReport' && x.source.kind !== 'tour');
    case 'pass':
      return COSMETICS.filter((x) => x.source.kind === 'pass');
    case 'tours':
      return COSMETICS.filter((x) => x.source.kind === 'tour');
  }
}

export interface ChestOpening {
  chest: ChestKind;
  item: Cosmetic;
  isDuplicate: boolean;
  money: number;
}

/**
 * The reel a chest opening spins (Leo, 28.09.2026). The prize is already drawn (`rollChest`);
 * the reel only shows it, and the drop odds never change. The other cards are drawn by the same
 * chest's public odds, except the teaser: with `teaserChance`, a prize below Legendary gets a
 * Legendary card right before or after it, the one the reel just slipped off or did not reach.
 * The prize sits at `stop`.
 */
export function chestReel(kind: ChestKind, prize: Cosmetic, seed: number, length: number, stop: number, teaserChance = 0): Cosmetic[] {
  const rng = new Rng(seed >>> 0);
  const odds = CHEST_ODDS[kind];
  const draw = (): Cosmetic => {
    let pick = rng.unit();
    let rarity: Rarity = 'common';
    for (let i = 0; i < RARITIES.length; i++) {
      rarity = RARITIES[i];
      pick -= odds[i];
      if (pick < 0) break;
    }
    return rng.pick(COSMETICS.filter((x) => x.rarity === rarity && x.source.kind === 'chest'));
  };
  const cards = Array.from({ length }, (_, i) => (i === stop ? prize : draw()));
  if (prize.rarity !== 'legendary' && rng.unit() < teaserChance) {
    const legends = COSMETICS.filter((x) => x.rarity === 'legendary' && x.source.kind === 'chest');
    cards[stop + (rng.unit() < 0.6 ? -1 : 1)] = rng.pick(legends);
  }
  return cards;
}

/** Which taps were strong: the first, and each one within `window` seconds of the one before. */
export const strongTaps = (times: readonly number[], window: number): boolean[] => times.map((t, i) => i === 0 || t - times[i - 1] <= window);

/** The power of a chest break, 0…1: the strong taps out of the `taps` it takes. */
export const tapPower = (times: readonly number[], taps: number, window: number): number =>
  Math.min(1, strongTaps(times, window).filter(Boolean).length / taps);

/** A chest's odds at tap `power` 0…1: each chance above Common grows by up to `boost` of itself, Common pays. */
export function tappedOdds(kind: ChestKind, power: number, boost: number): number[] {
  const [, ...rest] = CHEST_ODDS[kind];
  const grown = rest.map((p) => p * (1 + boost * Math.min(1, Math.max(0, power))));
  return [1 - grown.reduce((a, b) => a + b, 0), ...grown];
}

/** Draws a rarity by the chest's odds (public, or as tapped: `tappedOdds`); the pity counters guarantee an Epic and, later, a Legendary. */
export function rollChest(
  kind: ChestKind,
  collection: readonly string[],
  chestsSinceEpic: number,
  seed: number,
  day: number | null,
  chestsSinceLegendary = 0,
  odds: readonly number[] = CHEST_ODDS[kind],
): { item: Cosmetic; rarity: Rarity; chestsSinceEpic: number; chestsSinceLegendary: number } {
  const rng = new Rng(seed >>> 0);
  let rarity: Rarity = 'common';
  let pick = rng.unit();
  for (let i = 0; i < RARITIES.length; i++) {
    rarity = RARITIES[i];
    pick -= odds[i];
    if (pick < 0) break;
  }
  const guaranteed = chestsSinceLegendary >= PITY_LEGENDARY_CHESTS - 1;
  if (guaranteed) rarity = 'legendary';
  else if (chestsSinceEpic >= PITY_CHESTS - 1 && rarityRank(rarity) < 2) rarity = 'epic';
  const since = rarityRank(rarity) >= 2 ? 0 : chestsSinceEpic + 1;
  const pool = COSMETICS.filter((x) => x.rarity === rarity && x.source.kind === 'chest');
  let item = rng.pick(pool);
  if (kind === 'event' && day !== null && !guaranteed && rng.unit() < 0.5) {
    const seasonal = seasonItems(seasonOf(day)).find((x) => !collection.includes(x.id));
    if (seasonal) item = seasonal;
  }
  // A find (the Classic) takes the place of the drawn item. Drawn last, so every other result of a seed stays as it was.
  for (const find of chestFinds(kind)) {
    if (find.source.kind === 'find' && !collection.includes(find.id) && rng.unit() < find.source.chance) item = find;
  }
  return { item, rarity: item.rarity, chestsSinceEpic: since, chestsSinceLegendary: item.rarity === 'legendary' ? 0 : chestsSinceLegendary + 1 };
}
