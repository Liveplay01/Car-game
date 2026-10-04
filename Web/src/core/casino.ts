import { baseConfig, type Config } from './config';
import { type Career, Careers } from './career';
import { type Cosmetic, type Rarity, COSMETICS, cosmetic, rarityRank } from './loot';
import { Rng } from './rng';

/**
 * The casino (LOOT.md, Casino): Crash, Slots and the Skin Upgrade, and after any win a fair
 * coin for double or nothing. Play money only: nothing here can be bought with real money.
 *
 * Fair by construction: every outcome comes from the seeded stream below, the odds and the
 * house edge are shown next to every game, and a near miss is only ever what the draw gave.
 * The stake leaves the balance and the save is written before anything is revealed, so a
 * reload never draws again; a round cut short (the page closed) pays its stake back.
 */
export type CasinoGame = 'crash' | 'slots' | 'upgrade';
export const CASINO_GAMES: CasinoGame[] = ['crash', 'slots', 'upgrade'];

export type SlotSymbol = (typeof baseConfig.slotStrip)[number];
export const SLOT_SYMBOLS: SlotSymbol[] = ['car', 'compact', 'van', 'sportsCar', 'ambulance', 'transporter', 'boss'];

/** A round in play, or a win that can still be doubled. Saved, so a reload settles it fairly. */
export type CasinoPending =
  | { k: 'crash'; stake: number; seed: number }
  | { k: 'win'; game: CasinoGame; money: number; items: string[]; flips: number };

/** One line of the history: stake and win in money (skin value for the Upgrade), and its multiplier. */
export interface CasinoRound {
  game: CasinoGame;
  stake: number;
  win: number;
  /** Crash: the cash-out (or the crash point when lost); Slots: the pay; Upgrade: the chance. */
  x: number;
  day: number;
  /** Upgrade: the skin aimed at. */
  item?: string;
}

export interface SlotSpin {
  /** Where each reel stopped on the strip; the line shows `slotStrip[stop]`. */
  stops: [number, number, number];
  line: [SlotSymbol, SlotSymbol, SlotSymbol];
  /** Times the stake (0: nothing). */
  pay: number;
  win: number;
  rule: 'triple' | 'bossPair' | 'pair' | null;
}

export interface UpgradeRoll {
  won: boolean;
  chance: number;
  /** Where the needle stops, 0…1 round the dial; a win below `chance`. */
  roll: number;
  target: string;
  staked: string[];
}

export interface CoinFlip {
  won: boolean;
  /** Money: the new amount riding (0 when lost). */
  money: number;
  /** Skins: the one added on a win. */
  item: string | null;
  lost: string[];
}

/**
 * Entropy the save does not hold (Leo, 04.10.2026): without it a player could read `casinoSeed` and
 * the round count from their save and work out every coming result. The browser plugs in a source
 * of real randomness at start (`useEntropy`); the rules and the bots run without one, and then the
 * same seed still gives the same result.
 */
let entropy: (() => number) | null = null;

const SALT: Record<CasinoGame | 'flip', number> = { crash: 0x0c4a54, slots: 0x5107b0, upgrade: 0x09e4ad, flip: 0x0f11b5 };

/** Skins that can go on the table: a chest's car and map skins (no vehicles, nothing earned once). */
export const isStakeable = (item: Cosmetic): boolean => item.source.kind === 'chest' && (item.kind === 'carSkin' || item.kind === 'mapSkin');

export const Casino = {
  // MARK: Randomness

  /** Where a round's unseen share of randomness comes from (a 32-bit number each call), or none. */
  useEntropy(source: (() => number) | null): void {
    entropy = source;
  },

  /** The stream of round `n`: the career's own seed, the round and the game, and the unsaved entropy. */
  rng(c: Career, game: CasinoGame | 'flip'): Rng {
    return new Rng((c.casinoSeed ^ Math.imul(c.casinoRounds + 1, 0x9e3779b1) ^ SALT[game] ^ (entropy ? entropy() : 0)) >>> 0);
  },

  // MARK: Stakes

  /** The stakes on offer; the last one is "All in". */
  stakes: (c: Career, config: Config = baseConfig): number[] => [...config.casinoStakes, c.money],

  canStake: (c: Career, stake: number): boolean => c.casinoPending === null && Number.isInteger(stake) && stake > 0 && stake <= c.money,

  // MARK: Crash

  /** Where round `seed` crashes: P(≥ m) = (1 − edge)/m, cut at `crashMax`; 1.00× crashes at once. */
  crashPoint(seed: number, config: Config = baseConfig): number {
    const u = new Rng(seed).unit();
    const point = Math.floor((100 * (1 - config.crashEdge)) / (1 - u)) / 100;
    return Math.min(config.crashMax, Math.max(1, point));
  },

  /** The multiplier `t` seconds into the drive, floored to hundredths like the display. */
  multiplierAt: (t: number, config: Config = baseConfig): number => Math.floor(100 * Math.exp(config.crashRate * Math.max(0, t))) / 100,

  /** Seconds until the multiplier reaches `m`. */
  timeOf: (m: number, config: Config = baseConfig): number => Math.log(Math.max(1, m)) / config.crashRate,

  /** P(the drive reaches `m`): the odds shown in the sheet. */
  crashChance: (m: number, config: Config = baseConfig): number => (m <= 1 ? 1 : m > config.crashMax ? 0 : Math.min(1, (1 - config.crashEdge) / m)),

  /** When the drive must end: at its crash point, or on reaching `auto` first (0: off). */
  endOf: (point: number, auto: number): { at: number; cashOut: boolean } => (auto > 1 && auto <= point ? { at: auto, cashOut: true } : { at: point, cashOut: false }),

  /** Takes the stake and starts a drive. Returns where it will crash, or null. */
  startCrash(c: Career, stake: number, day: number, config: Config = baseConfig): number | null {
    if (!Casino.canStake(c, stake)) return null;
    const seed = Casino.rng(c, 'crash').int(0, 0xfffffffe);
    c.casinoRounds++;
    Casino.book(c, day, -stake);
    c.money -= stake;
    // The seed decides where the drive crashes, so it lives in memory only: not enumerable, it is neither
    // saved nor sent to the cloud, and a save read in DevTools does not say when to cash out. A reload
    // pays the stake back anyway (`resume`).
    const pending: CasinoPending = { k: 'crash', stake, seed: 0 };
    Object.defineProperty(pending, 'seed', { value: seed, enumerable: false, writable: true });
    c.casinoPending = pending;
    return Casino.crashPoint(seed, config);
  },

  /** Cashes out at `m` if the drive is still going there; otherwise it crashed. Returns the win (0: crashed). */
  cashOut(c: Career, m: number, day: number, config: Config = baseConfig): number {
    const p = c.casinoPending;
    if (!p || p.k !== 'crash') return 0;
    const point = Casino.crashPoint(p.seed, config);
    // Reaching the crash point still counts (P(point ≥ m) = (1 − edge)/m); 1.00× is a crash at the start.
    if (!(m > 1 && m <= point)) return Casino.crashed(c, day, config);
    const win = Math.floor(p.stake * m);
    c.money += win;
    Casino.book(c, day, win);
    c.casinoBestCrash = Math.max(c.casinoBestCrash, m);
    Casino.log(c, { game: 'crash', stake: p.stake, win, x: m, day }, config);
    c.casinoPending = { k: 'win', game: 'crash', money: win, items: [], flips: 0 };
    return win;
  },

  /** The drive crashed before a cash-out: the stake is gone. */
  crashed(c: Career, day: number, config: Config = baseConfig): number {
    const p = c.casinoPending;
    if (!p || p.k !== 'crash') return 0;
    Casino.log(c, { game: 'crash', stake: p.stake, win: 0, x: Casino.crashPoint(p.seed, config), day }, config);
    c.casinoPending = null;
    return 0;
  },

  // MARK: Slots

  /** What a line pays, times the stake. */
  slotPay(line: readonly SlotSymbol[], config: Config = baseConfig): { pay: number; rule: SlotSpin['rule'] } {
    const [a, b, d] = line;
    if (a === b && b === d) return { pay: config.slotTriple[a], rule: 'triple' };
    if (line.filter((s) => s === 'boss').length >= 2) return { pay: config.slotBossPair, rule: 'bossPair' };
    if (a === b && a !== 'boss') return { pay: config.slotPair, rule: 'pair' };
    return { pay: 0, rule: null };
  },

  /** The exact return of the slots: every stop of every reel, each as likely. */
  slotRtp(config: Config = baseConfig): { rtp: number; hit: number } {
    const strip = config.slotStrip;
    const n = strip.length;
    let total = 0;
    let hits = 0;
    for (const a of strip) for (const b of strip) for (const d of strip) {
      const pay = Casino.slotPay([a, b, d], config).pay;
      total += pay;
      if (pay > 0) hits++;
    }
    return { rtp: total / n ** 3, hit: hits / n ** 3 };
  },

  /** P(three of `s`): the paytable's odds. */
  tripleChance(s: SlotSymbol, config: Config = baseConfig): number {
    const share = config.slotStrip.filter((x) => x === s).length / config.slotStrip.length;
    return share ** 3;
  },

  spin(c: Career, stake: number, day: number, config: Config = baseConfig): SlotSpin | null {
    if (!Casino.canStake(c, stake)) return null;
    const rng = Casino.rng(c, 'slots');
    const n = config.slotStrip.length;
    const stops: [number, number, number] = [rng.int(0, n - 1), rng.int(0, n - 1), rng.int(0, n - 1)];
    const line = stops.map((i) => config.slotStrip[i]) as [SlotSymbol, SlotSymbol, SlotSymbol];
    const { pay, rule } = Casino.slotPay(line, config);
    const win = pay * stake;
    c.casinoRounds++;
    c.money += win - stake;
    Casino.book(c, day, win - stake);
    Casino.log(c, { game: 'slots', stake, win, x: pay, day }, config);
    if (win > 0) c.casinoPending = { k: 'win', game: 'slots', money: win, items: [], flips: 0 };
    return { stops, line, pay, win, rule };
  },

  // MARK: Skin Upgrade

  value: (r: Rarity, config: Config = baseConfig): number => config.skinValue[r],

  /** The owned skins that can be staked. */
  stakeable: (c: Career): Cosmetic[] => COSMETICS.filter((x) => isStakeable(x) && Careers.owns(c, x.id)),

  /** Skins to aim at: not owned yet and rarer than everything staked. */
  targets(c: Career, staked: string[]): Cosmetic[] {
    const top = Math.max(-1, ...staked.map((id) => rarityRank(cosmetic(id)?.rarity ?? 'common')));
    return COSMETICS.filter((x) => isStakeable(x) && !Careers.owns(c, x.id) && rarityRank(x.rarity) > top);
  },

  /** P(win): what the stake is worth against the target, less the edge, at most `upgradeMaxChance`. */
  upgradeChance(staked: string[], target: string, config: Config = baseConfig): number {
    const t = cosmetic(target);
    if (!t || staked.length === 0) return 0;
    const stake = staked.reduce((sum, id) => sum + Casino.value(cosmetic(id)?.rarity ?? 'common', config), 0);
    return Math.min(config.upgradeMaxChance, (stake / Casino.value(t.rarity, config)) * (1 - config.upgradeEdge));
  },

  canUpgrade(c: Career, staked: string[], target: string, config: Config = baseConfig): boolean {
    if (c.casinoPending !== null || staked.length === 0 || staked.length > config.upgradeMaxStake || new Set(staked).size !== staked.length) return false;
    const own = Casino.stakeable(c).map((x) => x.id);
    return staked.every((id) => own.includes(id)) && Casino.targets(c, staked).some((x) => x.id === target);
  },

  /** Stakes the skins on the target: they are traded for it on a win, and simply gone on a loss. */
  upgrade(c: Career, staked: string[], target: string, day: number, config: Config = baseConfig): UpgradeRoll | null {
    if (!Casino.canUpgrade(c, staked, target, config)) return null;
    const chance = Casino.upgradeChance(staked, target, config);
    const roll = Casino.rng(c, 'upgrade').unit();
    const won = roll < chance;
    c.casinoRounds++;
    const stake = staked.reduce((sum, id) => sum + Casino.value(cosmetic(id)!.rarity, config), 0);
    const win = won ? Casino.value(cosmetic(target)!.rarity, config) : 0;
    Casino.log(c, { game: 'upgrade', stake, win, x: chance, day, item: target }, config);
    // The staked skins go either way: a win trades them for the target.
    Casino.lose(c, staked);
    if (won) {
      Careers.collect(c, target);
      c.casinoPending = { k: 'win', game: 'upgrade', money: 0, items: [target], flips: 0 };
    }
    return { won, chance, roll, target, staked: [...staked] };
  },

  /** Skins gone from the collection: off the road too. Completed albums stay completed. */
  lose(c: Career, ids: string[]): void {
    c.collection = c.collection.filter((x) => !ids.includes(x));
    c.unseen = c.unseen.filter((x) => !ids.includes(x));
    c.carSkins = c.carSkins.filter((x) => !ids.includes(x));
    if (c.mapSkin !== null && ids.includes(c.mapSkin)) c.mapSkin = null;
  },

  // MARK: Double or nothing

  /** A skin a won flip adds: one more not owned yet, as rare as the one won. */
  doublePool(c: Career): Cosmetic[] {
    const p = c.casinoPending;
    if (!p || p.k !== 'win' || p.items.length === 0) return [];
    const rarity = cosmetic(p.items[0])?.rarity;
    return COSMETICS.filter((x) => isStakeable(x) && x.rarity === rarity && !Careers.owns(c, x.id));
  },

  canFlip(c: Career, config: Config = baseConfig): boolean {
    const p = c.casinoPending;
    if (!p || p.k !== 'win' || p.flips >= config.doubleMaxChain) return false;
    return p.items.length > 0 ? Casino.doublePool(c).length > 0 : p.money > 0 && p.money <= c.money;
  },

  /** A fair coin, exactly one half: the win doubles, or it is gone. */
  flip(c: Career, day: number, config: Config = baseConfig): CoinFlip | null {
    if (!Casino.canFlip(c, config)) return null;
    const p = c.casinoPending as Extract<CasinoPending, { k: 'win' }>;
    const rng = Casino.rng(c, 'flip');
    const won = rng.unit() < 0.5;
    c.casinoRounds++;
    p.flips++;
    const last = c.casinoLog[c.casinoLog.length - 1];
    if (p.items.length > 0) {
      if (!won) {
        const lost = [...p.items];
        Casino.lose(c, lost);
        if (last) last.win = 0;
        c.casinoPending = null;
        return { won, money: 0, item: null, lost };
      }
      const item = rng.pick(Casino.doublePool(c)).id;
      Careers.collect(c, item);
      p.items.push(item);
      if (last) last.win += Casino.value(cosmetic(item)!.rarity, config);
      return { won, money: 0, item, lost: [] };
    }
    if (!won) {
      c.money = Math.max(0, c.money - p.money);
      Casino.book(c, day, -p.money);
      if (last) last.win = 0;
      c.casinoPending = null;
      return { won, money: 0, item: null, lost: [] };
    }
    c.money += p.money;
    Casino.book(c, day, p.money);
    p.money *= 2;
    if (last) last.win = p.money;
    c.casinoBestWin = Math.max(c.casinoBestWin, p.money);
    return { won, money: p.money, item: null, lost: [] };
  },

  /** Keeps the win: it was paid already, only the offer to double goes. */
  collect(c: Career): void {
    if (c.casinoPending?.k === 'win') c.casinoPending = null;
  },

  /** A round left open when the page closed: a drive pays its stake back, a win is kept. */
  resume(c: Career, day: number): { refunded: number } | null {
    const p = c.casinoPending;
    if (!p) return null;
    c.casinoPending = null;
    if (p.k !== 'crash') return null;
    c.money += p.stake;
    Casino.book(c, day, p.stake);
    return { refunded: p.stake };
  },

  // MARK: Books

  /** Today's balance of the money games, shown as it is. */
  today: (c: Career, day: number): number => (c.casinoDay === day ? c.casinoNet : 0),

  book(c: Career, day: number, delta: number): void {
    if (c.casinoDay !== day) {
      c.casinoDay = day;
      c.casinoNet = 0;
    }
    c.casinoNet += delta;
  },

  log(c: Career, round: CasinoRound, config: Config = baseConfig): void {
    c.casinoLog = [...c.casinoLog, round].slice(-config.casinoLogLength);
    if (round.game !== 'upgrade') c.casinoBestWin = Math.max(c.casinoBestWin, round.win);
  },
};
