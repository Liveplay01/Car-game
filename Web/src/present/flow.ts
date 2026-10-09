import type { TitleId } from '../core/elite';
import { type GameMode, GAME_MODES } from '../core/career';

/** The pages of the Game tab's mode swipe: the three career modes, then multiplayer. */
export type SwipeMode = GameMode | 'multiplayer';
export const SWIPE_MODES: SwipeMode[] = [...GAME_MODES, 'multiplayer'];
import type { ChestKind } from '../core/loot';
import type { CasinoGame } from '../core/casino';
import type { Upgrade } from '../core/levels';
import type { RoadModule } from '../core/config';
import { type Vec2, v, clamp } from '../core/vec2';
import { type Rect, R, Metrics } from './render';
import type { ShiftSummary } from './hud';
import type { ColorToken } from './theme';

/**
 * The pages. The tab bar shows four (`TAB_BAR`); the Street Builder shares
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

export type ShopSection = 0 | 1 | 2; // chests · collection · casino
export type ProgressSection = 0 | 1 | 2 | 3;
/**
 * The Progress tab's sections, left to right (Leo, 04.10.2026: what to do comes first, the long list of stats third):
 * today (daily, weekly, pass, quests) · goals (trials, mastery, feats) · records (stats) · museum. The tab opens on `today`.
 */
export const PROGRESS = { today: 0, goals: 1, records: 2, museum: 3 } as const satisfies Record<string, ProgressSection>;

export type Part = 'arm' | RoadModule;
export const PARTS: Part[] = ['arm', 'tollBooth', 'speedCamera', 'towDepot', 'billboard', 'detour'];
export const partModule = (p: Part): RoadModule | null => (p === 'arm' ? null : p);

/** Each module's colour: its icon's badge, its zone in the Street Builder and its sign on the road. */
export const MODULE_COLORS: Record<RoadModule, ColorToken> = {
  tollBooth: 'hazard',
  speedCamera: 'lightBlue',
  towDepot: 'torii',
  billboard: 'sakuraDeep',
  detour: 'groundMeadow',
};

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
  | { k: 'setGameMode'; mode: SwipeMode }
  | { k: 'showTab'; tab: Tab }
  | { k: 'showShop'; section: ShopSection }
  | { k: 'showProgress'; section: ProgressSection }
  | { k: 'selectUpgrade'; upgrade: Upgrade }
  | { k: 'buy'; upgrade: Upgrade }
  | { k: 'pickUpPart'; part: Part }
  | { k: 'placePart'; slot: number }
  | { k: 'buildPart' }
  | { k: 'removePart' }
  /** The open sheet of a built part: lift it to move it, or tear it down (a second tap confirms). */
  | { k: 'moveBuilt' }
  | { k: 'deleteBuilt' }
  /** The open sheet of a built module: take it one level up. */
  | { k: 'upgradeBuilt' }
  /** The lifted part lands on this slot. */
  | { k: 'movePart'; slot: number }
  | { k: 'openChest'; index: number }
  /** A tap on the chest being tapped open. */
  | { k: 'hitChest' }
  | { k: 'buyChest'; kind: ChestKind }
  | { k: 'watchAd' }
  /** A free step of today's upgrade, and the Skin Upgrade's boost, each for an ad (`adFlow.ts`). */
  | { k: 'watchAdUpgrade' }
  | { k: 'watchAdBoost' }
  | { k: 'showCasino'; game: CasinoGame }
  | { k: 'wear'; id: string }
  /** Big Screen: choose the picture or video behind the roundabout (the shell's sheet). */
  | { k: 'editBackdrop' }
  | { k: 'startTrial'; id: string }
  | { k: 'wearTitle'; id: TitleId }
  | { k: 'showElite' }
  /** The Hall of Fame's own sheet, opened from its row in the Elite sheet. */
  | { k: 'showHall' }
  | { k: 'prestige' }
  | { k: 'showPass' }
  | { k: 'buyPass' }
  | { k: 'buildHall' };

/** Layout shared by the Build tab's two pages and the camera that lies under them. */
export const BuildLayout = {
  gap: 12,
  segmentHeight: 32,
  paletteHeight: 162,
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
    return BUILD_PAGES[clamp(index, 0, BUILD_PAGES.length - 1)];
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
