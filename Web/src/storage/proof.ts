import type { Proof, ProofMode } from '../core/proof';
import { storage } from './store';

/** The proof of the best run of each board, kept next to the save (not in it: it can be large, and the save is sealed). */
const KEY = 'carGame.proof.v1';

export type StoredProof = Proof & { score: number };

export function loadProofs(): Partial<Record<ProofMode, StoredProof>> {
  try {
    const raw = storage().getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<Record<ProofMode, StoredProof>>) : {};
  } catch {
    return {};
  }
}

export function keepProof(proof: StoredProof): void {
  try {
    storage().setItem(KEY, JSON.stringify({ ...loadProofs(), [proof.mode]: proof }));
  } catch {
    /* full or blocked storage: the record is still sent, without its proof */
  }
}
