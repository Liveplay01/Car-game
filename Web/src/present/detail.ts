import { type Career, Careers } from '../core/career';
import type { Config } from '../core/config';
import { type Upgrade, upgradeMaxSteps } from '../core/levels';
import { type ChestKind, type Rarity, RARITIES, CHEST_ODDS, PITY_CHESTS, MAX_CAR_SKINS, cosmetic, isForSale } from '../core/loot';
import { PLACEHOLDER_PRICE } from '../core/store';
import { type Vec2, v } from '../core/vec2';
import type { RenderList } from './render';
import type { ColorToken } from './theme';
import { S, Fmt, money, percent } from './strings';
import { ShopPage, type Offer } from './shop';
import { UpgradeArt } from './upgrades';
import { StreetBuilderPage } from './builder';
import type { Part, ScreenAction } from './flow';
import { R, rect, polygon } from './render';
import { MenuKit } from './menukit';
import { MuseumPage } from './museum';
import { museumEntry, firstLevel } from '../core/museum';
import { rematch } from '../core/trials';

/**
 * What the detail sheet shows (`ui/detailSheet.ts`): the explanation of the card that was
 * tapped, readable on a phone, with its actions. Pure data built from the save and the
 * page state; the sheet draws it and sends the actions back to the session.
 */
export type DetailArt =
  | { k: 'upgrade'; upgrade: Upgrade }
  | { k: 'chest'; kind: ChestKind }
  | { k: 'item'; id: string; owned: boolean }
  | { k: 'offer'; offer: Offer }
  | { k: 'part'; part: Part }
  | { k: 'museum'; id: string; shown: boolean; time: number };

export interface DetailRow {
  label: string;
  value: string;
  labelColor?: ColorToken;
  valueColor?: ColorToken;
}

export interface DetailAction {
  label: string;
  action: ScreenAction;
  prominent: boolean;
  enabled: boolean;
}

export interface Detail {
  /** Which card this is about; a new key replaces the content. */
  key: string;
  art: DetailArt;
  eyebrow: { text: string; color: ColorToken } | null;
  title: string;
  price: { text: string; color: ColorToken } | null;
  steps: { done: number; total: number } | null;
  body: string[];
  rows: DetailRow[];
  notes: { text: string; color: ColorToken }[];
  actions: DetailAction[];
}

const rarityColor = (r: Rarity): ColorToken => ShopPage.rarityColor(r);

export const Details = {
  upgrade(u: Upgrade, career: Career, config: Config): Detail {
    const steps = Careers.steps(career, u);
    const max = upgradeMaxSteps[u];
    const price = Careers.priceOf(career, u, config);
    const affordable = price !== null && career.money >= price;
    const rows: DetailRow[] = [{ label: S.detail.now, value: steps === 0 ? S.progress.none : S.upgrades.total(u, steps, config) }];
    if (steps < max) rows.push({ label: S.detail.nextStep, value: S.upgrades.total(u, steps + 1, config), valueColor: 'accent' });
    const notes: Detail['notes'] = [];
    if (price === null) notes.push({ text: S.upgrades.everyStepBought, color: 'muted' });
    else if (!affordable) notes.push({ text: S.upgrades.missing(money(Fmt.number(price - career.money))), color: 'destructive' });
    return {
      key: `upgrade:${u}`,
      art: { k: 'upgrade', upgrade: u },
      eyebrow: { text: S.detail.step(steps, max), color: 'muted' },
      title: S.upgrades.name(u),
      price: price === null ? { text: S.upgrades.maxed, color: 'accent' } : { text: money(Fmt.number(price)), color: affordable ? 'primary' : 'muted' },
      steps: { done: steps, total: max },
      body: [S.upgrades.explanation(u)],
      rows,
      notes,
      actions:
        price === null
          ? []
          : [{ label: affordable ? S.detail.buy(money(Fmt.number(price))) : S.upgrades.missing(money(Fmt.number(price - career.money))), action: { k: 'buy', upgrade: u }, prominent: true, enabled: affordable }],
    };
  },

  chest(kind: ChestKind, career: Career, config: Config, today: number): Detail {
    const count = Careers.count(career, kind);
    const odds = CHEST_ODDS[kind];
    const rows: DetailRow[] = RARITIES.map((r, i) => ({ label: S.shop.rarity(r), value: percent(odds[i]), labelColor: rarityColor(r) }));
    const notes: Detail['notes'] = [{ text: S.shop.pity(PITY_CHESTS - career.chestsSinceEpic), color: 'muted' }];
    if (kind === 'event') notes.push({ text: S.shop.seasonHint, color: 'accent' });
    const actions: DetailAction[] = [];
    const index = career.chests.indexOf(kind);
    actions.push({ label: count > 1 ? `${S.shop.open} · ${count}` : S.shop.open, action: { k: 'openChest', index: Math.max(0, index) }, prominent: true, enabled: count > 0 });
    if (isForSale(kind)) {
      const price = kind === 'standard' ? config.standardChestPrice : config.premiumChestPrice;
      actions.push({ label: S.shop.buy(money(Fmt.number(price))), action: { k: 'buyChest', kind }, prominent: false, enabled: career.money >= price });
    }
    if (kind === 'standard') {
      const left = Careers.adsLeft(career, 'chest', today, config);
      actions.push({ label: Careers.skipsAds(career) ? S.store.collect : S.shop.watchAdShort, action: { k: 'watchAd' }, prominent: false, enabled: left > 0 });
    }
    return {
      key: `chest:${kind}`,
      art: { k: 'chest', kind },
      eyebrow: count > 0 ? { text: S.shop.waiting(count), color: 'accent' } : null,
      title: S.shop.chest(kind),
      price: null,
      steps: null,
      body: [S.shop.source(kind)],
      rows,
      notes,
      actions,
    };
  },

  item(id: string, career: Career): Detail | null {
    const item = cosmetic(id);
    if (!item) return null;
    const owned = Careers.owns(career, id);
    const notes: Detail['notes'] = [];
    if (item.kind === 'carSkin') notes.push({ text: S.shop.skinsOn(career.carSkins.length, MAX_CAR_SKINS), color: 'accent' });
    const actions: DetailAction[] = [];
    if (owned && item.kind !== 'vehicleType') {
      actions.push({ label: Careers.isWorn(career, id) ? S.shop.takeOff : S.shop.wear, action: { k: 'wear', id }, prominent: !Careers.isWorn(career, id), enabled: true });
    }
    return {
      key: `item:${id}`,
      art: { k: 'item', id, owned },
      eyebrow: { text: S.shop.kind(item), color: rarityColor(item.rarity) },
      title: owned ? S.shop.item(id) : S.shop.lockedTitle(item.kind),
      price: Careers.isWorn(career, id) ? { text: S.shop.worn, color: 'accent' } : null,
      steps: null,
      body: [owned ? S.shop.ownedHint(item) : S.shop.lockedHint(item)],
      rows: [],
      notes,
      actions,
    };
  },

  offer(offer: Offer, career: Career, config: Config, today: number): Detail {
    if (offer.k === 'freeCash') {
      const left = Careers.adsLeft(career, 'cash', today, config);
      return {
        key: 'offer:freeCash',
        art: { k: 'offer', offer },
        eyebrow: left > 0 ? { text: S.shop.watchAd(left), color: 'accent' } : { text: S.store.noCashAdsLeft, color: 'muted' },
        title: S.store.freeCash,
        price: null,
        steps: null,
        body: [S.store.freeCashDetail(Fmt.number(Careers.adCash(career, config)))],
        rows: [],
        notes: [{ text: S.store.placeholderNote, color: 'hazard' }],
        actions: [{ label: Careers.skipsAds(career) ? S.store.collect : S.store.watch, action: { k: 'watchCashAd' }, prominent: true, enabled: left > 0 }],
      };
    }
    const p = offer.product;
    const canBuy = Careers.canBuy(career, p);
    return {
      key: `offer:${p}`,
      art: { k: 'offer', offer },
      eyebrow: canBuy ? null : { text: S.store.owned, color: 'accent' },
      title: S.store.name(p),
      price: { text: canBuy ? PLACEHOLDER_PRICE[p] : S.store.owned, color: canBuy ? 'primary' : 'accent' },
      steps: null,
      body: [S.store.detail(p, config)],
      rows: [],
      notes: [{ text: S.store.placeholderNote, color: 'hazard' }],
      actions: [
        { label: canBuy ? PLACEHOLDER_PRICE[p] : S.store.owned, action: { k: 'purchase', product: p }, prominent: true, enabled: canBuy },
        { label: S.store.restoreShort, action: { k: 'restorePurchases' }, prominent: false, enabled: true },
      ],
    };
  },

  part(part: Part, pending: boolean, career: Career, config: Config): Detail {
    const price = StreetBuilderPage.price(part, career, config);
    const affordable = price !== null && career.money >= price;
    const actions: DetailAction[] = [];
    if (pending) {
      actions.push({
        label: price === null ? S.builder.ringFull : affordable ? S.detail.build(money(Fmt.number(price))) : S.upgrades.missing(money(Fmt.number(price - career.money))),
        action: { k: 'buildPart' },
        prominent: true,
        enabled: affordable,
      });
      actions.push({ label: S.detail.remove, action: { k: 'removePart' }, prominent: false, enabled: true });
    }
    return {
      key: `part:${part}:${pending ? 'pending' : 'info'}`,
      art: { k: 'part', part },
      eyebrow: null,
      title: S.builder.name(part),
      price: price === null ? { text: S.builder.ringFull, color: 'muted' } : { text: money(Fmt.number(price)), color: affordable ? 'primary' : 'muted' },
      steps: null,
      body: [S.builder.explanation(part, config)],
      rows: [],
      notes: [{ text: pending ? S.builder.buildHint : S.builder.dragHint, color: pending ? 'accent' : 'muted' }],
      actions,
    };
  },

  /** A Museum entry: how it works once it has been met, where to find it before. */
  museum(id: string, career: Career, config: Config): Detail | null {
    const entry = museumEntry(id);
    if (!entry) return null;
    const shown = career.museumSeen.includes(id);
    const level = firstLevel(entry, config);
    const art: DetailArt = { k: 'museum', id, shown, time: 0 };
    if (!shown) {
      return {
        key: `museum:${id}:locked`,
        art,
        eyebrow: { text: entry.k === 'boss' ? S.museum.boss : S.museum.special, color: 'muted' },
        title: S.museum.unknown,
        price: { text: S.museum.undiscovered, color: 'muted' },
        steps: null,
        body: [entry.k === 'boss' ? S.museum.lockedBossHint(level) : S.museum.lockedHint(level)],
        rows: [],
        notes: [],
        actions: [],
      };
    }
    if (entry.k === 'special') {
      return {
        key: `museum:${id}`,
        art,
        eyebrow: { text: S.museum.special, color: MuseumPage.color(entry) },
        title: S.museum.name(entry.kind),
        price: null,
        steps: null,
        body: S.museum.explanation(entry.kind, config),
        rows: [],
        notes: [],
        actions: [],
      };
    }
    const kind = entry.kind;
    const beaten = career.bossesBeaten.includes(kind);
    const match = rematch(kind);
    const won = career.trialsDone.includes(match.id);
    const rows: DetailRow[] = [
      { label: S.museum.firstMet, value: S.trials.level(level) },
      { label: S.museum.heist, value: money(Fmt.number(config.heistRecoveryBase + config.heistRecoveryPerLevel * level)) },
    ];
    if (beaten) rows.push({ label: S.boss.rematch(kind), value: won ? S.trials.passed : money(Fmt.number(match.reward)), valueColor: won ? 'accent' : 'primary' });
    return {
      key: `museum:${id}`,
      art,
      eyebrow: { text: S.museum.boss, color: 'coin' },
      title: S.boss.name(kind),
      price: { text: beaten ? S.boss.beaten : S.museum.met, color: beaten ? 'accent' : 'muted' },
      steps: null,
      body: S.museum.bossExplanation(kind),
      rows,
      notes: [],
      actions: beaten ? [{ label: won ? S.museum.rematch : `${S.museum.rematch} · ${money(Fmt.number(match.reward))}`, action: { k: 'startTrial', id: match.id }, prominent: true, enabled: true }] : [],
    };
  },

  /** The picture at the top of the sheet, drawn with the game's own shapes into `size`. */
  drawArt(list: RenderList, art: DetailArt, center: Vec2, size: number, config: Config): void {
    const scale = size / 96;
    switch (art.k) {
      case 'upgrade': {
        MenuKit.glow(list, center, size * 0.5, 'accent', 0.12);
        const half = size * 0.42;
        UpgradeArt.add(list, art.upgrade, R.make(center.x - half, center.y - half * 0.7, center.x + half, center.y + half * 0.7), 1);
        break;
      }
      case 'chest':
        MenuKit.glow(list, center, size * 0.5, ShopPage.chestColor(art.kind), 0.35);
        ShopPage.addChestIcon(list, art.kind, v(center.x, center.y - 2 * scale), 1.2 * scale, 1);
        break;
      case 'item': {
        const item = cosmetic(art.id);
        if (!item) return;
        MenuKit.glow(list, center, size * 0.5, rarityColor(item.rarity), 0.3);
        ShopPage.addPreview(list, item, center, 1.35 * scale, art.owned ? 1 : 0.45);
        break;
      }
      case 'offer':
        if (art.offer.k === 'product') ShopPage.addOfferIcon(list, art.offer.product, center, 1.05 * scale, config, 1);
        else {
          MenuKit.glow(list, center, size * 0.5, 'juiceGreen', 0.3);
          list.s(rect(center, v(52 * scale, 36 * scale), 9 * scale), 'juiceGreen');
          list.s(polygon([v(center.x - 7 * scale, center.y - 9 * scale), v(center.x + 10 * scale, center.y), v(center.x - 7 * scale, center.y + 9 * scale)]), 'primary');
        }
        break;
      case 'part':
        StreetBuilderPage.addPartPicture(list, art.part, v(center.x - 10 * scale, center.y), 1.6 * scale, 1);
        break;
      case 'museum': {
        const entry = museumEntry(art.id);
        if (entry) MuseumPage.art(list, entry, center, 1.3 * scale, art.shown, art.time, 1, size * 0.92);
        break;
      }
    }
  },
};
