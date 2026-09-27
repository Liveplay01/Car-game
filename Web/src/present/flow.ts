import type { GameMode } from '../core/career';
import type { ChestKind } from '../core/loot';
import type { StoreProduct } from '../core/store';
import type { Upgrade } from '../core/levels';
import type { RoadModule } from '../core/config';
import { type Vec2, v } from '../core/vec2';
import { type Rect, R, Metrics } from './render';
import type { ShiftSummary } from './hud';

/**
 * The pages (`ScreenFlow.swift`). The tab bar shows four (`TAB_BAR`); the Street Builder shares
 * the Build tab with the Upgrades, one segment each. Game is where you play; no start menu.
 */
export type Tab = 'streetBuilder' | 'game' | 'shop' | 'upgrades' | 'progress';
export const TAB_BAR: Tab[] = ['progress', 'game', 'shop', 'upgrades'];
export const BUILD_PAGES: Tab[] = ['upgrades', 'streetBuilder'];
export const barTab = (t: Tab): Tab => (t === 'streetBuilder' ? 'upgrades' : t);

/**
 * Which screen shows. No pause screen: a shift lasts about twenty seconds; an interruption
 * freezes the world and counts back in.
 */
export type Screen =
  | { k: 'ready' }
  | { k: 'settings' }
  | { k: 'playing' }
  | { k: 'result'; summary: ShiftSummary }
  | { k: 'page'; tab: Tab };

export const screenTab = (s: Screen): Tab => (s.k === 'page' ? s.tab : 'game');
export const showsTabBar = (s: Screen): boolean => s.k !== 'settings' && s.k !== 'playing';

export type ShopSection = 0 | 1 | 2; // chests · collection · store
export type ProgressSection = 0 | 1 | 2; // records · quests · achievements

export type Part = 'arm' | RoadModule;
export const PARTS: Part[] = ['arm', 'tollBooth', 'speedCamera', 'towDepot'];
export const partModule = (p: Part): RoadModule | null => (p === 'arm' ? null : p);

export type Built = { k: 'arm'; slot: number } | { k: 'module'; slot: number };

/** Everything a menu, a tab or a gesture can do. */
export type ScreenAction =
  | { k: 'startShift' }
  | { k: 'restart' }
  | { k: 'openSettings' }
  | { k: 'closeSettings' }
  | { k: 'toggleSound' }
  | { k: 'toggleHaptics' }
  | { k: 'toggleVehicleLabels' }
  | { k: 'cycleReduceMotion' }
  | { k: 'setGameMode'; mode: GameMode }
  | { k: 'showTab'; tab: Tab }
  | { k: 'showShop'; section: ShopSection }
  | { k: 'showProgress'; section: ProgressSection }
  | { k: 'selectUpgrade'; upgrade: Upgrade }
  | { k: 'buy'; upgrade: Upgrade }
  | { k: 'pickUpPart'; part: Part }
  | { k: 'placePart'; slot: number }
  | { k: 'buildPart' }
  | { k: 'removePart' }
  | { k: 'openChest'; index: number }
  | { k: 'buyChest'; kind: ChestKind }
  | { k: 'watchAd' }
  | { k: 'watchCashAd' }
  | { k: 'purchase'; product: StoreProduct }
  | { k: 'restorePurchases' }
  | { k: 'wear'; id: string };

/** Layout shared by the Build tab's two pages and the camera that lies under them. */
export const BuildLayout = {
  gap: 12,
  segmentHeight: 32,
  paletteHeight: 112,
  /** Share of the room the builder's ring uses, and its largest radius (points). */
  mapZoom: 0.8,
  maxMapRadius: 170,
  /** A line of help under the palette; the details live in a sheet. */
  detailHeight: 34,
  top: Metrics.sceneInsets.top + 22,
  get contentTop(): number {
    return BuildLayout.top + BuildLayout.segmentHeight + 10;
  },
  glide: 0.35,

  segmentsRect(viewport: Vec2): Rect {
    const width = Math.min(viewport.x - 2 * BuildLayout.gap, 460);
    const left = (viewport.x - width) / 2;
    return R.make(left, BuildLayout.top, left + width, BuildLayout.top + BuildLayout.segmentHeight);
  },

  pageAt(point: Vec2, viewport: Vec2): Tab | null {
    const r = BuildLayout.segmentsRect(viewport);
    if (!R.contains(r, point)) return null;
    const index = Math.floor((point.x - r.minX) / (R.width(r) / BUILD_PAGES.length));
    return BUILD_PAGES[Math.min(Math.max(index, 0), BUILD_PAGES.length - 1)];
  },

  /** The Street Builder's map: where the ring is drawn and how big it is on screen. */
  builderMap(viewport: Vec2, bottomInset: number): { center: Vec2; radius: number } {
    const top = BuildLayout.contentTop - 4;
    const bottom = viewport.y - bottomInset - BuildLayout.detailHeight - BuildLayout.paletteHeight - 2 * BuildLayout.gap;
    const height = Math.max(160, bottom - top);
    // Zoomed out a little and lifted, so the arms and the queue keep clear of the parts below
    // (Leo, 27.09.2026); on a desktop the ring stays a sensible size instead of filling the height.
    const fit = Math.min(height / 2 - 34, viewport.x / 2 - 62);
    const radius = Math.min(fit * BuildLayout.mapZoom, BuildLayout.maxMapRadius);
    return { center: v(viewport.x / 2, top + height * 0.46), radius };
  },
};
