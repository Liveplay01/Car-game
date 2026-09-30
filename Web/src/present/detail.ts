import { type Career, Careers } from '../core/career';
import type { Config } from '../core/config';
import { type Upgrade, upgradeMaxSteps } from '../core/levels';
import { type ChestKind, type Rarity, RARITIES, CHEST_ODDS, PITY_CHESTS, MAX_CAR_SKINS, cosmetic, isForSale } from '../core/loot';
import { type CasinoGame, type SlotSymbol, SLOT_SYMBOLS, Casino } from '../core/casino';
import { type Vec2, v } from '../core/vec2';
import type { RenderList } from './render';
import type { ColorToken } from './theme';
import { S, Fmt, money, percent } from './strings';
import { ShopPage } from './shop';
import { casinoKit } from './casinoLoader';
import { UpgradeArt } from './upgrades';
import { StreetBuilderPage } from './builder';
import type { Part, ScreenAction } from './flow';
import { R, circle, line, text } from './render';
import { Elite, TITLES, TITLE_RULES } from '../core/elite';
import { SeasonPass, PASS_TIERS } from '../core/seasonPass';
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
  | { k: 'casino'; game: CasinoGame }
  | { k: 'part'; part: Part }
  | { k: 'museum'; id: string; shown: boolean; time: number }
  | { k: 'elite'; level: number };

export interface DetailRow {
  label: string;
  value: string;
  labelColor?: ColorToken;
  valueColor?: ColorToken;
  /** A second, quieter line under the label. */
  sub?: string;
  /** A tappable row: the whole row sends this. */
  action?: ScreenAction;
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
  /** Further grouped lists under their own headings, after `rows`. */
  sections?: { header: string; rows: DetailRow[] }[];
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
      const left = Careers.adChestsLeft(career, today, config);
      actions.push({ label: S.shop.watchAdShort, action: { k: 'watchAd' }, prominent: false, enabled: left > 0 });
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
    // A vehicle type is never worn: it drives by itself. Say so, or the sheet looks like its button is missing.
    if (owned && item.kind === 'vehicleType') notes.push({ text: S.shop.vehicleAuto, color: 'muted' });
    const actions: DetailAction[] = [];
    if (owned && item.kind !== 'vehicleType') {
      actions.push({ label: Careers.isWorn(career, id) ? S.shop.takeOff : S.shop.wear, action: { k: 'wear', id }, prominent: !Careers.isWorn(career, id), enabled: true });
    }
    return {
      key: `item:${id}`,
      art: { k: 'item', id, owned },
      eyebrow: { text: S.shop.kind(item), color: rarityColor(item.rarity) },
      title: owned ? S.shop.item(id) : S.shop.lockedTitle(item.kind),
      price: Careers.isWorn(career, id) ? { text: S.shop.worn, color: 'accent' } : owned && item.kind === 'vehicleType' ? { text: S.shop.inTraffic, color: 'accent' } : null,
      steps: null,
      body: [owned ? S.shop.ownedHint(item) : S.shop.lockedHint(item)],
      rows: [],
      notes,
      actions,
    };
  },

  /**
   * The late game in one sheet: the Elite track, what waits along it, the titles to wear and
   * Prestige. `armed`: Prestige was tapped once and waits for the second tap.
   */
  elite(career: Career, config: Config, armed: boolean): Detail {
    const open = Elite.isOpen(career, config);
    const level = Elite.level(career, config);
    const { into, need } = Elite.progress(career, config);
    const track: DetailRow[] = Elite.milestones().map((l) => {
      const reached = level >= l;
      return { label: S.elite.caption(l), value: S.elite.reward(Elite.step(l, config)), labelColor: reached ? 'coin' : 'muted', valueColor: reached ? 'accent' : 'muted' };
    });
    const titles: DetailRow[] = TITLES.map((t) => {
      const earned = Elite.titleEarned(t, career, config);
      const worn = career.title === t;
      return {
        label: S.titles.name(t),
        sub: S.titles.rule(TITLE_RULES[t]),
        value: worn ? S.elite.wearing : earned ? '' : S.elite.notYet,
        labelColor: earned ? 'primary' : 'muted',
        valueColor: worn ? 'accent' : 'muted',
        action: earned ? { k: 'wearTitle', id: t } : undefined,
      };
    });
    const next = open ? Elite.nextMilestone(career, config) : null;
    const prestige: DetailRow[] = [
      { label: S.elite.rank, value: career.prestige > 0 ? S.prestige.caption(career.prestige) : S.progress.none, valueColor: career.prestige > 0 ? 'coin' : 'muted' },
      { label: S.elite.traffic, value: career.prestige > 0 ? S.elite.harder(Careers.headStart(career, config)) : S.progress.none, valueColor: 'muted' },
    ];
    // The Hall of Fame: a plaque per rank; built, it stands on the island.
    const plaques: DetailRow[] = career.hallOfFame.map((e) => ({
      label: S.hall.plaque(e),
      value: '',
      sub: S.hall.plaqueLine(e, e.day >= 0 ? new Date(e.day * 86400000).toISOString().slice(0, 10) : null),
      labelColor: 'coin',
    }));
    if (plaques.length === 0) plaques.push({ label: S.hall.empty, value: '', labelColor: 'muted' });
    plaques.push({
      label: S.hall.title,
      value: career.hallBuilt ? S.hall.standing : money(Fmt.number(config.hallOfFamePrice)),
      sub: career.hallBuilt ? undefined : open ? S.hall.notBuilt : S.hall.open(config.prestigeLevel),
      labelColor: career.hallBuilt ? 'coin' : 'primary',
      valueColor: career.hallBuilt ? 'accent' : career.money >= config.hallOfFamePrice ? 'primary' : 'muted',
    });
    const ready = Careers.canPrestige(career, config);
    const notes: Detail['notes'] = [];
    if (next) notes.push({ text: S.elite.next(next), color: 'accent' });
    notes.push({ text: ready ? S.prestige.ready(career.level) : S.prestige.locked(config.prestigeLevel), color: ready ? 'coin' : 'muted' });
    notes.push({ text: S.prestige.keeps, color: 'muted' });
    return {
      key: 'elite',
      art: { k: 'elite', level },
      eyebrow: open ? { text: S.elite.xp(into, need), color: 'muted' } : { text: S.elite.locked(config.prestigeLevel), color: 'muted' },
      title: open ? S.elite.caption(level) : S.elite.title,
      price: career.title ? { text: S.titles.name(career.title), color: 'coin' } : null,
      steps: open ? { done: Math.floor((into / need) * 10), total: 10 } : null,
      body: S.elite.body,
      rows: [],
      sections: [
        { header: S.elite.trackHeader, rows: track },
        { header: S.elite.titlesHeader, rows: titles },
        { header: S.elite.prestigeHeader, rows: prestige },
        { header: S.hall.header, rows: plaques },
      ],
      notes,
      actions: [
        {
          label: armed ? S.elite.prestigeConfirm : S.elite.prestigeAction(career.prestige + 1),
          action: { k: 'prestige' },
          prominent: armed,
          enabled: ready,
        },
        ...(career.hallBuilt || !open
          ? []
          : [{ label: S.hall.build(money(Fmt.number(config.hallOfFamePrice))), action: { k: 'buildHall' } as const, prominent: false, enabled: Careers.canBuildHall(career, config) }]),
      ],
    };
  },

  /** The Season Pass: this season's track, its skins, and the button to buy it. */
  pass(career: Career, config: Config, day: number): Detail {
    const season = SeasonPass.season(day);
    const owned = SeasonPass.owns(career, day);
    const tier = owned ? SeasonPass.tier(career, config) : 0;
    const { into, need } = SeasonPass.progress(career, config);
    const open = SeasonPass.isOpen(career, config);
    const track: DetailRow[] = Array.from({ length: PASS_TIERS }, (_, i) => {
      const reward = SeasonPass.reward(i + 1, season);
      const reached = owned && tier > i;
      return {
        label: S.pass.tier(i + 1, PASS_TIERS),
        value: S.pass.reward(reward),
        labelColor: reached ? 'coin' : 'muted',
        valueColor: reached ? 'accent' : reward.k === 'skin' ? rarityColor(reward.item.rarity) : 'muted',
      };
    });
    const crown = SeasonPass.skins(season)[2];
    const notes: Detail['notes'] = [{ text: S.pass.daysLeft(SeasonPass.daysLeft(day)), color: 'muted' }];
    if (owned && tier >= PASS_TIERS) notes.unshift({ text: S.pass.complete, color: 'accent' });
    if (!open) notes.unshift({ text: S.pass.locked(config.seasonPassLevel), color: 'muted' });
    const price = config.seasonPassPrice;
    return {
      key: 'pass',
      art: { k: 'item', id: crown.id, owned: true },
      eyebrow: { text: owned ? S.pass.xp(into, need) : S.pass.buyHint, color: 'muted' },
      title: S.pass.caption(season),
      price: owned ? { text: S.pass.tier(tier, PASS_TIERS), color: 'coin' } : { text: money(Fmt.number(price)), color: 'primary' },
      steps: owned ? { done: tier, total: PASS_TIERS } : null,
      body: S.pass.body(config.seasonPassXpPerTier),
      rows: [],
      sections: [{ header: S.pass.trackHeader, rows: track }],
      notes,
      actions: owned
        ? []
        : [
            {
              label: career.money >= price ? S.pass.buy(money(Fmt.number(price))) : S.upgrades.missing(money(Fmt.number(price - career.money))),
              action: { k: 'buyPass' },
              prominent: true,
              enabled: SeasonPass.canBuy(career, day, config),
            },
          ],
    };
  },

  /** A casino game: how it plays, its odds and its return, exactly (LOOT.md, Casino). */
  casino(game: CasinoGame, career: Career, config: Config): Detail {
    const pct = (x: number): string => `${(x * 100).toFixed(x < 0.1 ? 2 : 1)} %`;
    const D = S.casino.detail;
    const rows: DetailRow[] = [];
    const notes: Detail['notes'] = [];
    let body: string[];
    switch (game) {
      case 'crash':
        body = D.crash;
        rows.push({ label: D.instant, value: pct(1 - Casino.crashChance(1.01, config)), valueColor: 'destructive' });
        for (const m of [1.5, 2, 5, 10, 100]) rows.push({ label: D.reaches(S.casino.times(m)), value: pct(Casino.crashChance(m, config)) });
        if (career.casinoBestCrash > 0) rows.push({ label: D.best, value: S.casino.times(career.casinoBestCrash), valueColor: 'accent' });
        notes.push({ text: D.returns(pct(1 - config.crashEdge)), color: 'accent' }, { text: D.leave, color: 'muted' });
        break;
      case 'slots': {
        body = D.slots;
        const n = config.slotStrip.length;
        const share = (sym: SlotSymbol): number => config.slotStrip.filter((x) => x === sym).length / n;
        for (const sym of [...SLOT_SYMBOLS].reverse()) {
          const p = Casino.tripleChance(sym, config);
          rows.push({ label: D.triple(S.casino.symbol(sym)), value: `${config.slotTriple[sym]}× · ${D.oneIn(Fmt.number(1 / p))}`, labelColor: sym === 'boss' ? 'coin' : undefined });
        }
        const q = share('boss');
        rows.push({ label: D.bossPair, value: `${config.slotBossPair}× · ${D.oneIn(Fmt.number(1 / (3 * q * q * (1 - q))))}` });
        const pair = SLOT_SYMBOLS.filter((x) => x !== 'boss').reduce((sum, x) => sum + share(x) ** 2 * (1 - share(x)), 0);
        rows.push({ label: D.pair, value: `${config.slotPair}× · ${D.oneIn(Fmt.number(1 / pair))}` });
        const { rtp, hit } = Casino.slotRtp(config);
        notes.push({ text: D.returns(pct(rtp)), color: 'accent' }, { text: D.hitRate((1 / hit).toFixed(1)), color: 'muted' });
        break;
      }
      case 'upgrade':
        body = D.upgrade;
        for (const r of RARITIES) rows.push({ label: D.value(S.shop.rarity(r)), value: money(Fmt.number(config.skinValue[r])), labelColor: rarityColor(r) });
        notes.push({ text: D.returns(pct(1 - config.upgradeEdge)), color: 'accent' }, { text: D.maxChance(pct(config.upgradeMaxChance)), color: 'muted' });
        break;
    }
    if (career.casinoBestWin > 0 && game !== 'upgrade') rows.push({ label: D.bestWin, value: money(Fmt.number(career.casinoBestWin)), valueColor: 'accent' });
    notes.push({ text: D.double, color: 'muted' }, { text: D.fair, color: 'muted' });
    return {
      key: `casino:${game}`,
      art: { k: 'casino', game },
      eyebrow: { text: S.shop.section(2), color: 'coin' },
      title: S.casino.game(game),
      price: null,
      steps: null,
      body,
      rows,
      notes,
      actions: [],
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
        eyebrow: { text: S.museum.kind(entry), color: 'muted' },
        title: S.museum.unknown,
        price: { text: S.museum.undiscovered, color: 'muted' },
        steps: null,
        body: [entry.k === 'boss' ? S.museum.lockedBossHint(level) : S.museum.lockedHint(level)],
        rows: [],
        notes: [],
        actions: [],
      };
    }
    if (entry.k !== 'boss') {
      return {
        key: `museum:${id}`,
        art,
        eyebrow: { text: S.museum.kind(entry), color: MuseumPage.color(entry) },
        title: S.museum.name(entry),
        price: null,
        steps: null,
        body: S.museum.explanation(entry, config),
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
      eyebrow: { text: S.museum.kind(entry), color: 'coin' },
      title: S.museum.name(entry),
      price: { text: beaten ? S.boss.beaten : S.museum.met, color: beaten ? 'accent' : 'muted' },
      steps: null,
      body: S.museum.explanation(entry, config),
      rows,
      notes: [],
      actions: beaten ? [{ label: won ? S.museum.rematch : `${S.museum.rematch} · ${money(Fmt.number(match.reward))}`, action: { k: 'startTrial', id: match.id }, prominent: true, enabled: true }] : [],
    };
  },

  /** The picture at the top of the sheet, drawn with the game's own shapes into `size`. */
  /** The Elite badge: a gold ring with a chevron and the level in it (grey while the track is shut). */
  eliteBadge(list: RenderList, level: number, center: Vec2, scale: number, opacity: number): void {
    const color: ColorToken = level > 0 ? 'coin' : 'muted';
    MenuKit.glow(list, center, 48 * scale, color, 0.3 * opacity);
    list.s(circle(center, 34 * scale), 'controlFill', opacity);
    list.s(circle(center, 34 * scale), color, 0.2 * opacity);
    const up = v(center.x, center.y - 16 * scale);
    list.s(line(v(center.x - 13 * scale, center.y - 6 * scale), up, 4 * scale), color, opacity);
    list.s(line(up, v(center.x + 13 * scale, center.y - 6 * scale), 4 * scale), color, opacity);
    list.s(text(level > 0 ? String(level) : '–', v(center.x, center.y + 12 * scale), 24 * scale, 'center', 'bold'), color, opacity);
  },

  drawArt(list: RenderList, art: DetailArt, center: Vec2, size: number, _config: Config): void {
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
      case 'casino':
        casinoKit()?.CasinoPage.art(list, art.game, center, size);
        break;
      case 'part':
        StreetBuilderPage.addPartPicture(list, art.part, v(center.x - 10 * scale, center.y), 1.6 * scale, 1);
        break;
      case 'museum': {
        const entry = museumEntry(art.id);
        if (entry) MuseumPage.art(list, entry, center, 1.3 * scale, art.shown, art.time, 1, size * 0.92);
        break;
      }
      case 'elite':
        Details.eliteBadge(list, art.level, center, scale, 1);
        break;
    }
  },
};
