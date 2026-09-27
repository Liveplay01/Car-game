import type { Config } from './config';
import type { ChestKind } from './loot';

/**
 * The store (MONETIZATION.md): placeholders until real products exist. A "purchase" charges
 * nothing; it only shows the flow, like in the test window.
 */
export type StoreProduct = 'starterPack' | 'cashSmall' | 'cashMedium' | 'cashLarge' | 'premiumChests' | 'noAds' | 'cashBoost';
export const STORE_PRODUCTS: StoreProduct[] = ['starterPack', 'cashSmall', 'cashMedium', 'cashLarge', 'premiumChests', 'noAds', 'cashBoost'];

export const isConsumable = (p: StoreProduct): boolean => p === 'cashSmall' || p === 'cashMedium' || p === 'cashLarge' || p === 'premiumChests';

export const PLACEHOLDER_PRICE: Record<StoreProduct, string> = {
  starterPack: '$1.99',
  cashSmall: '$0.99',
  cashMedium: '$2.99',
  cashLarge: '$6.99',
  premiumChests: '$3.99',
  noAds: '$3.99',
  cashBoost: '$4.99',
};

export function productGrant(p: StoreProduct, c: Config): { money: number; chests: ChestKind[] } {
  switch (p) {
    case 'starterPack':
      return { money: c.starterPackMoney, chests: ['premium', 'standard', 'standard'] };
    case 'cashSmall':
      return { money: c.cashSmallAmount, chests: [] };
    case 'cashMedium':
      return { money: c.cashMediumAmount, chests: [] };
    case 'cashLarge':
      return { money: c.cashLargeAmount, chests: [] };
    case 'premiumChests':
      return { money: 0, chests: Array.from({ length: c.premiumChestBundle }, () => 'premium' as ChestKind) };
    case 'noAds':
    case 'cashBoost':
      return { money: 0, chests: [] };
  }
}

export type AdReward = 'chest' | 'cash';
