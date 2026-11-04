import { existsSync } from 'node:fs';

/** The game's rules as the service runs them: `Server/proof/proof.mjs`, bundled from `Web/src/core` (`npm run build:proof` in `Web/`). */
export interface ProofParts {
  PROOF_RULES: number;
  dailySeed(day: number): number;
  cleanProof(raw: unknown): CleanProof | null;
  replay(proof: CleanProof): { score: number; cars: number; ended: boolean; completed: boolean };
}

export interface CleanProof {
  rules: number;
  mode: 'unlimited' | 'daily';
  seed: number;
  day: number;
  events: number[];
}

export const PROOF_FILE = new URL('../../../proof/proof.mjs', import.meta.url);

/** Null when the bundle was not built: scores are then believed as before (plausibility only). */
export async function loadProofParts(): Promise<ProofParts | null> {
  return existsSync(PROOF_FILE) ? ((await import(PROOF_FILE.href)) as ProofParts) : null;
}
