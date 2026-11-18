import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** A number from every file of `src/core`: a client and a service built from different rules never compare a replay (`PROOF_RULES`). */
export function coreRules(): number {
  const hash = createHash('sha256');
  const dir = join(import.meta.dirname, 'src/core');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts')).sort()) hash.update(file).update(readFileSync(join(dir, file)));
  return hash.digest().readUInt32BE(0);
}
