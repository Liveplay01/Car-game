import { Mafia, type Grade } from '../core/mafia';
import type { GameSession } from '../present/session';

/**
 * Dev server only (`import.meta.env.DEV`): `mafiaDebug` in the browser console puts the Mafia into any state, through the game's own
 * save, so the seal stays valid. Leave the Mafia tab and come back after a change.
 *   mafiaDebug.open()          the first boss is behind you
 *   mafiaDebug.borrow(amount?) a loan on the spot (the biggest one by default; 'perfect' | 'good' | 'miss')
 *   mafiaDebug.due(hours)      the loan falls due in so many hours (negative: it is late already)
 *   mafiaDebug.lateFor(days)   late for so many days (14 or more: written off)
 *   mafiaDebug.money(n)        your money
 *   mafiaDebug.clear()         no loan, no ban, no clean loans
 */
export function installMafiaDebug(s: GameSession): void {
  const save = (): void => s.clubChanged();
  const api = {
    open(): void {
      if (!s.save.career.bossesBeaten.includes('convoy')) s.save.career.bossesBeaten.push('convoy');
      save();
    },
    borrow(amount: number = Mafia.maxLoan(s.save.career), grade: Grade = 'good'): void {
      api.open();
      s.save.career.loan = null;
      s.save.career.mafiaBan = 0;
      Mafia.borrow(s.save.career, amount, grade, Date.now());
      save();
    },
    due(hours: number): void {
      const loan = s.save.career.loan;
      if (!loan) return;
      const now = Date.now();
      loan.due = now + hours * 3_600_000;
      loan.taken = Math.min(loan.taken, loan.due - 1);
      loan.seen = Math.min(loan.seen, loan.due - 1);
      loan.late = false;
      Mafia.sync(s.save.career, now);
      save();
    },
    lateFor(days: number): void {
      api.due(-days * 24);
    },
    money(n: number): void {
      s.save.career.money = n;
      save();
    },
    clear(): void {
      const career = s.save.career;
      career.loan = null;
      career.mafiaBan = 0;
      career.cleanLoans = 0;
      save();
    },
  };
  Object.assign(window, { mafiaDebug: api });
}
