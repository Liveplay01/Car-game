import { Worker } from 'node:worker_threads';
import type { CleanProof, ProofParts } from './proofModule.ts';

/**
 * Replay proof (Leo, 04.11.2026): the run's inputs are replayed on the game's own rules (`Web/src/core`, bundled) and
 * the points compared. A mismatch is only flagged for a moderator, never refused or banned: a float that rounds
 * differently between two browsers must not cost an honest player their record.
 */
export type Verdict = 'ok' | 'mismatch' | 'invalid' | 'stale' | 'busy' | 'timeout' | 'unavailable' | 'none';

const REPLAY_TIMEOUT_MS = 10_000;
const MAX_PARALLEL = 2;
let running = 0;

function replayInWorker(proof: CleanProof): Promise<{ score: number } | null> {
  running++;
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./replayWorker.ts', import.meta.url), { workerData: proof });
    const timer = setTimeout(() => void worker.terminate(), REPLAY_TIMEOUT_MS);
    worker.once('message', (m: { score: number } | null) => resolve(m));
    worker.once('error', () => resolve(null));
    worker.once('exit', () => {
      clearTimeout(timer);
      running--;
      resolve(null);
    });
  });
}

const TAP_KIND = 0;
const MIN_TAPS = 40;
/** A person never repeats the same gap to the millisecond in half of their taps; a script on a timer does. */
const SAME_GAP_SHARE = 0.5;

/** True when the taps of a run are spaced like a machine's: one gap (to the millisecond) makes up half of them. */
export function robotTaps(events: readonly number[]): boolean {
  const times: number[] = [];
  for (let i = 0; i < events.length; i += 3) if (events[i + 1] === TAP_KIND) times.push(events[i + 2] ?? 0);
  if (times.length < MIN_TAPS) return false;
  const gaps = new Map<number, number>();
  for (let i = 1; i < times.length; i++) {
    const gap = Math.round(((times[i] ?? 0) - (times[i - 1] ?? 0)) * 1000);
    gaps.set(gap, (gaps.get(gap) ?? 0) + 1);
  }
  return Math.max(...gaps.values()) >= SAME_GAP_SHARE * (times.length - 1);
}

export interface Claim {
  board: 'unlimited' | 'daily';
  score: number;
  day?: number;
}

/** Checks a submitted proof against the claimed score. `raw` is whatever the body carried. */
export async function verify(parts: ProofParts | null, claim: Claim, raw: unknown): Promise<{ verdict: Verdict; replayed?: number; robot?: boolean }> {
  if (!parts) return { verdict: 'unavailable' };
  if (raw === undefined) return { verdict: 'none' };
  const proof = parts.cleanProof(raw);
  if (!proof || proof.mode !== claim.board) return { verdict: 'invalid' };
  if (proof.rules !== parts.PROOF_RULES) return { verdict: 'stale' };
  if (claim.board === 'daily' && (proof.day !== claim.day || proof.seed !== parts.dailySeed(proof.day))) return { verdict: 'invalid' };
  const robot = robotTaps(proof.events);
  if (running >= MAX_PARALLEL) return { verdict: 'busy', robot };
  const done = await replayInWorker(proof);
  if (!done) return { verdict: 'timeout', robot };
  return done.score === claim.score ? { verdict: 'ok', robot } : { verdict: 'mismatch', replayed: done.score, robot };
}
