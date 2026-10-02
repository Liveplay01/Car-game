import type { SaveGame } from '../core/career';
import type { Config } from '../core/config';
import type { Vec2 } from '../core/vec2';
import type { ScreenAction } from './flow';
import type { SoundID, HapticID } from './feedback';
import type { UpgradeState } from './upgrades';
import type { BuilderState } from './builder';
import type { ShopState } from './shop';
import type { RewardedOutcome } from './session';

/**
 * What the pages' flows (`buildFlow.ts`, `shopFlow.ts`) need from the session: the save, the
 * page states, the sheet, sound and notices. Getters, so a flow always sees today's values.
 */
export interface PageHost {
  readonly save: SaveGame;
  readonly config: Config;
  readonly today: number;
  readonly reduceMotion: boolean;
  readonly upgradePage: UpgradeState;
  /** The Street Builder's state; the session makes a new one when the page is left. */
  readonly builderPage: BuilderState;
  readonly shopPage: ShopState;
  /** The viewport of the last frame, and the tab bar's height where it shows. */
  readonly viewport: Vec2;
  readonly tabInset: number;
  /** The Shop tab is on screen. */
  readonly onShop: boolean;
  detailOpen: boolean;
  perform(action: ScreenAction): void;
  tick(): void;
  closeDetail(): void;
  persist(): void;
  /** The waiting shift is rebuilt after a purchase (a new arm changes the ring). */
  refreshWaitingShift(): void;
  play(sounds: SoundID[], haptics: HapticID[]): void;
  showNotice(text: string): void;
  /** A press began that may turn into a drag (a part picked up from the palette). */
  pressed(point: Vec2): void;
  /** The portal's rewarded ad (CrazyGames); false where there is none and the placeholder plays. */
  rewardedAd(done: (outcome: RewardedOutcome) => void): boolean;
}
