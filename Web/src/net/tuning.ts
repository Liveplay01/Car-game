import { baseConfig, type Config } from '../core/config';
import { storage } from '../storage/store';
import { apiRequest, leaderboardEnabled } from './leaderboard';

/**
 * Remote tuning (Leo, 19.10.2026): a few values of `config.ts` change on the service (`PUT /v1/admin/tuning`,
 * `Server/src/modules/tuning`) without a new build. Only the names below, each held to its range: none of them
 * reaches what a board or a replay compares (the ease only plain career shifts, which are `assisted`), so the same
 * seed and the same taps still give the same result on every device. An answer is kept and counts from the next
 * start on, never in the middle of a session; offline the last kept one holds, and without one the build's values.
 */
export const TUNABLE = {
  easeAfterLosses: [1, 5, true],
  easeAfterLossesNew: [1, 3, true],
  easeMaxSteps: [0, 5, true],
  easeTempoStep: [0, 0.1, false],
  easeSpawnStep: [0, 0.5, false],
  adChestsPerDay: [1, 5, true],
  adUpgradesPerDay: [1, 3, true],
  adBoostsPerDay: [1, 5, true],
  adShiftDoublesPerDay: [1, 5, true],
  reviveAdsPerDay: [1, 5, true],
  dailyPay: [150, 600, true],
  nearRecordShare: [0.6, 0.95, false],
  standardChestPrice: [13000, 52000, true],
  premiumChestPrice: [26000, 104000, true],
  premiumBundlePrice: [70000, 280000, true],
  diamondChestPrice: [125000, 500000, true],
} as const satisfies Partial<Record<keyof Config, readonly [lo: number, hi: number, whole: boolean]>>;

type Tunable = keyof typeof TUNABLE;

const KEY = 'carGame.tuning.v1';

/** What of `raw` the game takes: known names with numbers, held to their range. */
export function tuned(raw: unknown): Partial<Pick<Config, Tunable>> {
  if (typeof raw !== 'object' || raw === null) return {};
  const out: Partial<Record<Tunable, number>> = {};
  for (const [name, [lo, hi, whole]] of Object.entries(TUNABLE) as [Tunable, (typeof TUNABLE)[Tunable]][]) {
    const v = (raw as Record<string, unknown>)[name];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    const held = Math.min(hi, Math.max(lo, v));
    out[name] = whole ? Math.round(held) : held;
  }
  return out;
}

/** Before the game starts: the kept values go into `baseConfig`, and the service is asked for the next start's. */
export function startTuning(): void {
  try {
    Object.assign(baseConfig, tuned(JSON.parse(storage().getItem(KEY) ?? '{}')));
  } catch {
    /* nothing kept, or blocked storage: the build's values */
  }
  if (!leaderboardEnabled) return;
  apiRequest<{ values: unknown }>('GET', '/v1/tuning')
    .then(({ values }) => storage().setItem(KEY, JSON.stringify(tuned(values))))
    .catch(() => undefined);
}
