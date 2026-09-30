/**
 * The CrazyGames build (`npm run build:crazygames`): their SDK is in the page (vite.config.ts)
 * and its Data Module holds the save, in the cloud for a logged-in player, in the browser for
 * a guest. Without the SDK (an ad blocker, another domain) the game saves as in the browser.
 */
import { type KeyValueStore, useStore } from '../storage/store';
import { SAVE_KEYS } from '../storage/save';
import { NAME_KEY } from '../storage/profile';

interface CrazyGamesSdk {
  init(): Promise<void>;
  /** 'disabled' off CrazyGames: every call throws there. 'local' on localhost, for testing. */
  readonly environment: 'local' | 'crazygames' | 'disabled';
  readonly data: KeyValueStore;
}

/** Must run before the save is read: until `init` resolves, the Data Module is empty. */
export async function startCrazyGames(): Promise<void> {
  const sdk = (window as unknown as { CrazyGames?: { SDK?: CrazyGamesSdk } }).CrazyGames?.SDK;
  if (!sdk) return;
  try {
    await sdk.init();
    if (sdk.environment === 'disabled') return;
    useStore(sdk.data, [...SAVE_KEYS, NAME_KEY]);
  } catch {
    /* no SDK: the save stays in this browser */
  }
}
