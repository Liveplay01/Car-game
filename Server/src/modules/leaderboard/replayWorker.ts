import { parentPort, workerData } from 'node:worker_threads';
import { loadProofParts, type CleanProof } from './proofModule.ts';

const parts = await loadProofParts();
parentPort?.postMessage(parts?.replay(workerData as CleanProof) ?? null);
