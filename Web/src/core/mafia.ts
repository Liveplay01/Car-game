import { baseConfig, type Config } from './config';
import type { Career } from './career';
import { isObject } from './guards';
import { Rng } from './rng';

/**
 * The Mafia (Leo, 11.10.2026): after the first boss it lends money. The deal is struck on a bar: a pointer sweeps across it, faster
 * the bigger the loan, and the tap must stop it inside the green zone; the middle of the zone is the best deal. Every loan repaid in
 * time makes the next one cheaper and the zone wider. A loan not repaid by its day turns late: the debt grows, a share of every shift's
 * pay goes to the Family, no transporter, criminal or boss pays out and the Casino is shut. Only one loan at a time. Time is the
 * clock (Leo wants the pressure to play), kept honest by `seen`: the latest moment the game has noticed.
 */
export const DAY_MS = 86_400_000;

export interface Loan {
  /** What was lent, and what is to come back by `due` (the interest included). */
  amount: number;
  owed: number;
  paid: number;
  taken: number;
  due: number;
  late: boolean;
  /** The latest time seen: a clock set back does not give the days back. */
  seen: number;
  /** Letters already told to the player (`Mafia.letters`). */
  told: number;
  /** The day passed while the player was away and they got their day of grace (`Mafia.returned`): once per loan. */
  graced: boolean;
}

export type Grade = 'perfect' | 'good' | 'miss';

export interface Terms {
  interest: number;
  days: number;
}

/** One bar: where the green zone lies (0–1 along the bar), how fast the pointer goes and where it starts. */
export interface Table {
  amount: number;
  zone: { from: number; to: number };
  speed: number;
  phase: number;
  /** A steady hand: slower, and the best deal is out of reach. */
  assist: boolean;
}

/** What the clock did to a loan: it turned late, or the Family gave up on it. */
export type LoanEvent = 'late' | 'writeoff';

export type LetterKind = 'taken' | 'half' | 'day' | 'late' | 'later';
export interface Letter {
  kind: LetterKind;
  at: number;
}

const int = (x: unknown, min: number): number => (typeof x === 'number' && Number.isFinite(x) ? Math.max(min, Math.round(x)) : min);

/** A stored loan, or null when it is not one the game knows. */
export function readLoan(raw: unknown): Loan | null {
  if (!isObject(raw)) return null;
  const amount = int(raw.amount, 0);
  const owed = int(raw.owed, 0);
  const due = int(raw.due, 0);
  if (amount <= 0 || owed < amount || due <= 0) return null;
  const taken = Math.min(int(raw.taken, 0), due);
  return { amount, owed, paid: Math.min(int(raw.paid, 0), owed), taken, due, late: raw.late === true, seen: Math.max(int(raw.seen, 0), taken), told: int(raw.told, 0), graced: raw.graced === true };
}

const triangle = (x: number): number => {
  const m = ((x % 2) + 2) % 2;
  return m < 1 ? m : 2 - m;
};

export const Mafia = {
  /** The Family talks to whoever has put its first boss away. */
  isOpen: (c: Career): boolean => c.bossesBeaten.length > 0,

  late: (c: Career): boolean => c.loan?.late === true,

  /** The biggest loan on offer: it grows with the level and the Prestige rank. */
  maxLoan(c: Career, config: Config = baseConfig): number {
    const raw = config.mafiaLoanBase + c.level * config.mafiaLoanPerLevel + c.prestige * config.mafiaLoanPerPrestige;
    return Math.min(config.mafiaLoanMax, Math.round(raw / 500) * 500);
  },

  /** The loans to choose from, smallest first. */
  amounts(c: Career, config: Config = baseConfig): number[] {
    const top = Mafia.maxLoan(c, config);
    return [...new Set(config.mafiaLoanShares.map((share) => Math.max(500, Math.round((top * share) / 500) * 500)))];
  },

  /** What a loan costs before the bar: the interest and the days, kinder with every clean repayment. */
  baseTerms: (c: Career, config: Config = baseConfig): Terms => ({
    interest: Math.max(config.mafiaInterestMin, config.mafiaInterest - c.cleanLoans * config.mafiaInterestPerClean),
    days: config.mafiaDays,
  }),

  /** What the bar's result adds: the plain offer for a miss. */
  terms(c: Career, grade: Grade, config: Config = baseConfig): Terms {
    const base = Mafia.baseTerms(c, config);
    const deal = grade === 'perfect' ? config.mafiaPerfectDeal : grade === 'good' ? config.mafiaGoodDeal : { interest: 0, days: 0 };
    return { interest: Math.max(config.mafiaInterestMin, base.interest - deal.interest), days: base.days + deal.days };
  },

  zoneWidth: (c: Career, config: Config = baseConfig): number => Math.min(config.mafiaZoneMax, config.mafiaZone + c.cleanLoans * config.mafiaZonePerClean),

  /** The bar for this loan: the same loan at the same count always gives the same bar. */
  table(c: Career, amount: number, config: Config = baseConfig, assist = false): Table {
    const rng = new Rng((c.casinoSeed ^ Math.imul(c.loansTaken + 1, 0x9e3779b1)) >>> 0);
    const width = Mafia.zoneWidth(c, config);
    const margin = 0.04;
    const centre = rng.range(margin + width / 2, 1 - margin - width / 2);
    const share = Math.min(1, amount / Math.max(1, Mafia.maxLoan(c, config)));
    const speed = (config.mafiaSpeed.lo + (config.mafiaSpeed.hi - config.mafiaSpeed.lo) * share) * (assist ? config.mafiaAssistSpeed : 1);
    return { amount, zone: { from: centre - width / 2, to: centre + width / 2 }, speed, phase: rng.range(0, 2), assist };
  },

  /** Where the pointer is (0–1) this many milliseconds after the table was set. */
  pointer: (t: Table, ms: number): number => triangle(t.phase + (t.speed * ms) / 1000),

  grade(t: Table, at: number, config: Config = baseConfig): Grade {
    const width = t.zone.to - t.zone.from;
    const off = Math.abs(at - (t.zone.from + t.zone.to) / 2);
    if (off <= (width * config.mafiaPerfect) / 2) return t.assist ? 'good' : 'perfect';
    return off <= width / 2 ? 'good' : 'miss';
  },

  /** The Family lends to whoever has a boss behind them and no loan, and is not shut out after a write-off. */
  canBorrow: (c: Career, amount: number, config: Config = baseConfig, now: number = Date.now()): boolean =>
    Mafia.isOpen(c) && c.loan === null && c.mafiaBan <= now && Mafia.amounts(c, config).includes(amount),

  /** The loan is paid out the moment the pointer stops. */
  borrow(c: Career, amount: number, grade: Grade, now: number, config: Config = baseConfig): Loan | null {
    if (!Mafia.canBorrow(c, amount, config, now)) return null;
    const t = Mafia.terms(c, grade, config);
    const loan: Loan = { amount, owed: Math.round(amount * (1 + t.interest)), paid: 0, taken: now, due: now + t.days * DAY_MS, late: false, seen: now, told: 1, graced: false };
    c.money += amount;
    c.loan = loan;
    c.loansTaken++;
    return loan;
  },

  /**
   * Notes the time. The loan turns late once its day has come ('late'); a loan late for `mafiaWriteOffDays` is written off: the debt
   * is gone, so there is never a loan that cannot be left, and the Family takes no calls for `mafiaBanDays` ('writeoff').
   */
  sync(c: Career, now: number, config: Config = baseConfig): LoanEvent | null {
    const loan = c.loan;
    if (!loan) return null;
    loan.seen = Math.max(now, loan.seen);
    if (loan.late) {
      if (loan.seen < loan.due + config.mafiaWriteOffDays * DAY_MS) return null;
      c.loan = null;
      c.cleanLoans = 0;
      c.mafiaBan = loan.seen + config.mafiaBanDays * DAY_MS;
      return 'writeoff';
    }
    if (loan.seen < loan.due) return null;
    loan.late = true;
    c.cleanLoans = 0;
    return 'late';
  },

  /** Back at the game after the day passed unseen: one day of grace, once per loan. True when it was given. */
  returned(c: Career, now: number, config: Config = baseConfig): boolean {
    const loan = c.loan;
    if (!loan || loan.late || loan.graced || now < loan.due) return false;
    loan.graced = true;
    loan.seen = Math.max(loan.seen, now);
    loan.due = now + config.mafiaGraceDays * DAY_MS;
    return true;
  },

  /** What is still owed: the debt plus a day-by-day penalty once late, which stops at `mafiaLateCap` of it. */
  debt(c: Career, now: number, config: Config = baseConfig): number {
    const loan = c.loan;
    if (!loan) return 0;
    const days = Math.floor(Math.max(0, Math.max(now, loan.seen) - loan.due) / DAY_MS);
    const penalty = Math.min(Math.round(loan.owed * config.mafiaLateCap), Math.round(loan.owed * config.mafiaLateRate * days));
    return Math.max(0, loan.owed + penalty - loan.paid);
  },

  /** Pays up to `amount` (as far as the money goes). Says what was paid and whether the debt is gone, and whether that was in time. */
  repay(c: Career, amount: number, now: number, config: Config = baseConfig): { paid: number; cleared: boolean; inTime: boolean } {
    const loan = c.loan;
    if (!loan) return { paid: 0, cleared: false, inTime: false };
    const pay = Math.max(0, Math.min(Math.floor(amount), c.money, Mafia.debt(c, now, config)));
    c.money -= pay;
    loan.paid += pay;
    const cleared = Mafia.debt(c, now, config) <= 0;
    const inTime = cleared && !loan.late;
    if (cleared) {
      if (inTime) c.cleanLoans++;
      c.loan = null;
    }
    return { paid: pay, cleared, inTime };
  },

  /** A late loan takes its share of what a shift just paid. Returns the cut (0 when there is none). */
  garnish(c: Career, earned: number, now: number, config: Config = baseConfig): number {
    if (!c.loan?.late || earned <= 0) return 0;
    return Mafia.repay(c, Math.round(earned * config.mafiaGarnish), now, config).paid;
  },

  /** Every letter the Family writes about this loan, oldest first. */
  letters(loan: Loan): Letter[] {
    const out: Letter[] = [{ kind: 'taken', at: loan.taken }];
    const span = loan.due - loan.taken;
    out.push({ kind: 'half', at: loan.taken + Math.round(span / 2) });
    if (span > 2 * DAY_MS) out.push({ kind: 'day', at: loan.due - DAY_MS });
    out.push({ kind: 'late', at: loan.due }, { kind: 'later', at: loan.due + 2 * DAY_MS });
    return out.sort((a, b) => a.at - b.at);
  },

  /** The letters that have arrived by now. */
  arrived: (loan: Loan, now: number): Letter[] => Mafia.letters(loan).filter((l) => l.at <= Math.max(now, loan.seen)),

  /** Letters that arrived since the player was last told (marks them told). */
  news(c: Career, now: number): Letter[] {
    const loan = c.loan;
    if (!loan) return [];
    const fresh = Mafia.arrived(loan, now).slice(loan.told);
    loan.told += fresh.length;
    return fresh;
  },

  /** A shift for a late career: no transporter, criminal or boss pays out. */
  withoutLoot(cfg: Config): Config {
    const never = { lo: 1e9, hi: 1e9 };
    return { ...cfg, criminalChance: 0, convoy: false, scout: false, transporterFirst: never, transporterInterval: never };
  },
};
