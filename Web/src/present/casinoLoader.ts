import type { CasinoPage as Page, CasinoState as State } from './casino';
import type { CasinoFlow as Flow } from './casinoFlow';

/**
 * The casino loads only when the Shop needs it (it opens at level 12, and most visits never
 * go there): its tables, looks and rounds are a chunk of their own, like PeerJS. The service
 * worker precaches that chunk too, so it opens offline. Until it is here, the casino section
 * stays empty for the blink it takes.
 */
export interface CasinoKit {
  CasinoPage: typeof Page;
  CasinoState: typeof State;
  CasinoFlow: typeof Flow;
}

let kit: CasinoKit | null = null;
let loading: Promise<CasinoKit> | null = null;
/** After a failed load the next try waits this long (ms): the Shop asks every frame. */
const RETRY_AFTER = 5000;
let failedAt = -Infinity;

/** The casino, if it has loaded. */
export const casinoKit = (): CasinoKit | null => kit;

/** Starts loading the casino (once); a failed load (offline, not yet cached) may try again. */
export function loadCasino(): Promise<CasinoKit> {
  if (!loading && performance.now() - failedAt < RETRY_AFTER) return Promise.reject(new Error('casino not loaded yet'));
  loading ??= Promise.all([import('./casino'), import('./casinoFlow')]).then(([page, flow]) => {
    kit = { CasinoPage: page.CasinoPage, CasinoState: page.CasinoState, CasinoFlow: flow.CasinoFlow };
    return kit;
  });
  loading.catch(() => {
    loading = null;
    failedAt = performance.now();
  });
  return loading;
}
