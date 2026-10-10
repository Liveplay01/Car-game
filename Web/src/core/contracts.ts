import { baseConfig, type Config } from './config';
import type { Career } from './career';
import { Elite } from './elite';
import type { ShiftResult } from './events';
import { isObject } from './guards';

/**
 * Contracts (Leo, 10.10.2026), a sink for big balances that asks for skill: before a career shift the
 * player puts money on a goal. The stake is paid when the contract is signed and pays back a multiple
 * of itself if the shift is completed and the goal met, and is gone otherwise. A shift eased for this
 * career (`assisted`) voids the contract: the stake comes back. Never over the Daily Shift, Unlimited,
 * a trial or a challenge.
 */
export type ContractGoal = 'clean' | 'sharp' | 'flawless';
export const CONTRACT_GOALS: ContractGoal[] = ['clean', 'sharp', 'flawless'];

export interface Contract {
  goal: ContractGoal;
  stake: number;
}

/** A stored contract, or null when it is not one the game knows. */
export function readContract(raw: unknown): Contract | null {
  if (!isObject(raw) || !CONTRACT_GOALS.includes(raw.goal as ContractGoal)) return null;
  const stake = typeof raw.stake === 'number' && Number.isInteger(raw.stake) ? raw.stake : 0;
  return stake > 0 ? { goal: raw.goal as ContractGoal, stake } : null;
}

export interface ContractOutcome {
  contract: Contract;
  /** Won, lost, or void (the shift was eased: the stake is back). */
  result: 'won' | 'lost' | 'void';
  /** Money paid out: the stake times its multiple on a win, the stake itself when void. */
  pay: number;
}

export const Contracts = {
  isOpen: (c: Career, config: Config = baseConfig): boolean => Elite.isOpen(c, config),

  pay: (goal: ContractGoal, config: Config = baseConfig): number => config.contractPay[goal],

  /** What the goal asks, in the words of the shift's numbers: `cars` is the shift's length. */
  need(goal: ContractGoal, cars: number, config: Config = baseConfig): { perfects: number; chain: number } {
    if (goal === 'sharp') return { perfects: Math.ceil(cars * config.contractSharpShare), chain: 0 };
    if (goal === 'flawless') return { perfects: 0, chain: Math.ceil(cars * config.contractFlawlessShare) };
    return { perfects: 0, chain: 0 };
  },

  /** Whether a finished shift met the goal. Every goal asks for a Perfect Run: no crash, no police crash, no cut-off. */
  met(goal: ContractGoal, result: ShiftResult, cars: number, config: Config = baseConfig): boolean {
    if (result.outcome !== 'completed' || !result.isPerfectRun) return false;
    const need = Contracts.need(goal, cars, config);
    return result.perfects >= need.perfects && result.bestChain >= need.chain;
  },

  canSign: (c: Career, stake: number, config: Config = baseConfig): boolean =>
    Contracts.isOpen(c, config) && c.contract === null && config.contractStakes.includes(stake) && c.money >= stake,

  sign(c: Career, goal: ContractGoal, stake: number, config: Config = baseConfig): boolean {
    if (!Contracts.canSign(c, stake, config)) return false;
    c.money -= stake;
    c.contract = { goal, stake };
    return true;
  },

  /** Tears it up before the shift: the whole stake comes back. */
  cancel(c: Career): boolean {
    if (!c.contract) return false;
    c.money += c.contract.stake;
    c.contract = null;
    return true;
  },

  /** Settles the contract against a finished career shift (not a Daily). Null when there is none. */
  settle(c: Career, result: ShiftResult, cars: number, assisted: boolean, config: Config = baseConfig): ContractOutcome | null {
    const contract = c.contract;
    if (!contract) return null;
    c.contract = null;
    if (assisted) {
      c.money += contract.stake;
      return { contract, result: 'void', pay: contract.stake };
    }
    if (!Contracts.met(contract.goal, result, cars, config)) return { contract, result: 'lost', pay: 0 };
    const pay = Math.round(contract.stake * Contracts.pay(contract.goal, config));
    c.money += pay;
    return { contract, result: 'won', pay };
  },
};
