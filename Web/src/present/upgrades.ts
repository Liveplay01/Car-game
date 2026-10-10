import { type Career, Careers } from '../core/career';
import type { Config } from '../core/config';
import { type Upgrade, upgradeMaxSteps } from '../core/levels';
import { type Vec2, v, add, sub, mul, TAU } from '../core/vec2';
import { type RenderList, type Rect, type Primitive, R, rect, circle, arc, line, polygon, text, Ease } from './render';
import type { ColorToken } from './theme';
import { MenuKit } from './menukit';
import { moneyTag, moneyTagWidth, drawFitted, textWidth } from './icons';
import { S, Fmt } from './strings';
import { measure } from './measure';
import { BuildLayout, BUILD_PAGES, type Tab } from './flow';
import { Scroller } from './scroll';

/** What the Upgrades page shows and animates (`UpgradePage.State`); the list scrolls (`Scroller`). */
export class UpgradeState extends Scroller {
  selected: Upgrade | null = null;
  age = 0;
  pressed: { upgrade: Upgrade; age: number } | null = null;
  purchase: { upgrade: Upgrade; steps: number; age: number } | null = null;
  denied: { upgrade: Upgrade; age: number } | null = null;
  moneyBefore: number | null = null;

  advance(delta: number): void {
    this.age += delta;
    if (this.pressed) {
      this.pressed.age += delta;
      if (this.pressed.age >= UpgradePage.pressDuration) this.pressed = null;
    }
    if (this.purchase) {
      this.purchase.age += delta;
      if (this.purchase.age >= UpgradePage.purchaseDuration) {
        this.purchase = null;
        this.moneyBefore = null;
      }
    }
    if (this.denied) {
      this.denied.age += delta;
      if (this.denied.age >= UpgradePage.deniedDuration) this.denied = null;
    }
  }
}

/** The Build tab's shared header and segments; they stay still while its pages switch. */
export const BuildTab = {
  addChrome(list: RenderList, page: Tab, thumb: number, money: string, viewport: Vec2): void {
    MenuKit.header(list, S.tabs.build, money, viewport);
    MenuKit.segmented(list, [S.upgrades.title, S.builder.title], Math.max(0, BUILD_PAGES.indexOf(page)), thumb, BuildLayout.segmentsRect(viewport));
  },
};

/**
 * The Upgrades page: a card per upgrade with a picture of what it does,
 * the steps bought and the next price. One tap opens the details, a double tap buys. Only
 * the purchase celebrates.
 */
export const UpgradePage = {
  columns: 2,
  gap: 12,
  cardCorner: 14,
  stagger: 0.04,
  enterDuration: 0.25,
  pressDuration: 0.12,
  pressScale: 0.97,
  purchaseDuration: 0.45,
  deniedDuration: 0.4,
  countDuration: 0.4,
  /** The details live in a sheet; the list runs down to the tab bar. */
  detailHeight: 0,
  minCardHeight: 116,

  /** The list's window: under the segments, above the detail panel. */
  listArea(viewport: Vec2, bottomInset: number): Rect {
    const top = BuildLayout.contentTop;
    return R.make(0, top - 4, viewport.x, viewport.y - bottomInset - UpgradePage.detailHeight - UpgradePage.gap / 2);
  },

  /** Card height: they fill the window if they can stay readable, else the list scrolls. */
  layoutOf(viewport: Vec2, bottomInset: number, count: number): { cardWidth: number; cardHeight: number; left: number; maxScroll: number } {
    const U = UpgradePage;
    const width = Math.min(viewport.x - 2 * U.gap, 460);
    const rows = Math.ceil(count / U.columns);
    const available = viewport.y - bottomInset - U.detailHeight - U.gap - BuildLayout.contentTop;
    const fit = (available - U.gap * (rows - 1)) / rows;
    const cardHeight = fit >= U.minCardHeight ? Math.min(132, fit) : U.minCardHeight;
    const total = rows * cardHeight + U.gap * (rows - 1);
    return { cardWidth: (width - U.gap * (U.columns - 1)) / U.columns, cardHeight, left: (viewport.x - width) / 2, maxScroll: Math.max(0, total - available + 8) };
  },

  cards(viewport: Vec2, bottomInset: number, upgrades: readonly Upgrade[], scroll = 0): { upgrade: Upgrade; rect: Rect }[] {
    const U = UpgradePage;
    const l = U.layoutOf(viewport, bottomInset, upgrades.length);
    const top = BuildLayout.contentTop - scroll;
    return upgrades.map((upgrade, i) => {
      const x = l.left + (i % U.columns) * (l.cardWidth + U.gap);
      const y = top + Math.floor(i / U.columns) * (l.cardHeight + U.gap);
      return { upgrade, rect: R.make(x, y, x + l.cardWidth, y + l.cardHeight) };
    });
  },

  cardAt(point: Vec2, viewport: Vec2, bottomInset: number, upgrades: readonly Upgrade[], scroll = 0): Upgrade | null {
    if (!R.contains(UpgradePage.listArea(viewport, bottomInset), point)) return null;
    return UpgradePage.cards(viewport, bottomInset, upgrades, scroll).find((c) => R.contains(c.rect, point))?.upgrade ?? null;
  },

  tint(u: Upgrade): ColorToken {
    switch (u) {
      case 'morePatrols':
      case 'interceptor':
      case 'dispatchRadio':
      case 'backup':
        return 'juiceBlue';
      case 'longerPursuit':
        return 'juicePurple';
      case 'quietStreets':
      case 'quickRecovery':
      case 'shield':
      case 'chainSaver':
        return 'juiceGreen';
      case 'cashRoute':
      case 'overtime':
      case 'doubleRun':
      case 'tightFitTip':
        return 'juiceYellow';
      case 'freight':
      case 'fogLamps':
        return 'juiceOrange';
      case 'dashcam':
        return 'juicePurple';
      case 'winterTyres':
        return 'juiceBlue';
      case 'insurance':
      case 'robberyInsurance':
        return 'juiceRed';
    }
  },

  countedMoney(career: Career, state: UpgradeState): number {
    if (state.moneyBefore === null || !state.purchase) return career.money;
    const x = Ease.outCubic(state.purchase.age / UpgradePage.countDuration);
    return state.moneyBefore + Math.round((career.money - state.moneyBefore) * x);
  },

  add(list: RenderList, career: Career, config: Config, upgrades: readonly Upgrade[], state: UpgradeState, reduceMotion: boolean, bottomInset: number, thumb: number, freeStep: Upgrade | null): void {
    const vp = list.camera.viewport;
    MenuKit.backdrop(list);
    BuildTab.addChrome(list, 'upgrades', thumb, Fmt.number(UpgradePage.countedMoney(career, state)), vp);
    const area = UpgradePage.listArea(vp, bottomInset);
    list.clip = area;
    UpgradePage.cards(vp, bottomInset, upgrades, state.scroll).forEach((card, i) => {
      if (card.rect.maxY < area.minY - 20 || card.rect.minY > area.maxY + 20) return;
      UpgradePage.addCard(list, card.upgrade, i, card.rect, career, config, state, reduceMotion, card.upgrade === freeStep);
    });
    list.clip = undefined;
    UpgradePage.addScrollIndicator(list, area, state, upgrades.length, bottomInset);
  },

  /** A thin bar at the right edge while the list moves, like iOS. */
  addScrollIndicator(list: RenderList, area: Rect, state: UpgradeState, count: number, bottomInset: number): void {
    const l = UpgradePage.layoutOf(list.camera.viewport, bottomInset, count);
    state.addIndicator(list, area, l.maxScroll, Math.min(list.camera.viewport.x - 4, l.left + 2 * l.cardWidth + UpgradePage.gap + 5));
  },

  addCard(list: RenderList, upgrade: Upgrade, index: number, r: Rect, career: Career, config: Config, state: UpgradeState, reduceMotion: boolean, freeStep: boolean): void {
    const U = UpgradePage;
    const steps = Careers.steps(career, upgrade);
    const maxSteps = upgradeMaxSteps[upgrade];
    const price = Careers.priceOf(career, upgrade, config);
    const purchase = state.purchase?.upgrade === upgrade ? state.purchase : null;
    const denied = state.denied?.upgrade === upgrade ? state.denied : null;
    const enter = Ease.outCubic((state.age - index * U.stagger) / U.enterDuration);
    if (enter <= 0) return;
    let center = R.center(r);
    let scale = 1;
    if (!reduceMotion) {
      const motion = MenuKit.cardEnter(Ease.settle((state.age - index * U.stagger) / (U.enterDuration + 0.2)));
      center = add(center, v(0, motion.rise));
      scale = motion.scale;
      if (state.pressed?.upgrade === upgrade) scale = U.pressScale + (1 - U.pressScale) * Ease.outCubic(state.pressed.age / U.pressDuration);
      if (purchase) scale = 1 + 0.04 * Math.sin(Math.PI * Ease.outCubic(purchase.age / U.purchaseDuration));
      if (denied) {
        const x = denied.age / U.deniedDuration;
        center = add(center, v(Math.sin(x * Math.PI * 6) * 5 * (1 - x), 0));
      }
    }
    const size = v(R.width(r) * scale, R.height(r) * scale);
    const o = enter;
    list.s(rect(center, size, U.cardCorner), 'card', o);
    if (state.selected === upgrade) {
      list.s(rect(center, add(size, v(4, 4)), U.cardCorner + 2), 'accent', 0.55 * o);
      list.s(rect(center, size, U.cardCorner), 'card', o);
    }
    if (purchase && !reduceMotion) {
      const x = Ease.outCubic(purchase.age / U.purchaseDuration);
      list.s(rect(center, add(size, v(24 * x, 24 * x)), U.cardCorner + 12 * x), 'accent', 0.5 * (1 - x) * o);
      list.s(rect(center, size, U.cardCorner), 'card', o);
    }
    const pictureHeight = Math.min(56, size.y * 0.44);
    const picture = R.make(center.x - size.x / 2 + 10, center.y - size.y / 2 + 10, center.x + size.x / 2 - 10, center.y - size.y / 2 + 10 + pictureHeight);
    // The picture stands on the card itself, in its glow: no second surface inside the card.
    const tile = R.center(picture);
    MenuKit.glow(list, tile, pictureHeight * 0.62, U.tint(upgrade), 0.45 * o);
    UpgradeArt.add(list, upgrade, picture, o);
    // Today's pick: one step for a watched ad (Leo, 05.10.2026). Opens in the sheet like any card.
    if (freeStep) {
      const label = S.ads.freeStep;
      const width = measure(label, 9, true) + 12;
      const badge = v(picture.maxX - 4 - width / 2, picture.minY + 4 + 7);
      list.s(rect(badge, v(width, 14), 7), 'accent', o);
      list.s(text(label, badge, 9, 'center', 'bold'), 'accentInk', o);
    }

    const textLeft = center.x - size.x / 2 + 12;
    const textRight = center.x + size.x / 2 - 12;
    const nameY = picture.maxY + (center.y + size.y / 2 - picture.maxY) * 0.36;
    const stepsText = S.upgrades.steps(steps, maxSteps);
    const stepsWidth = textWidth(stepsText, 12, false);
    drawFitted(list, S.upgrades.name(upgrade), v(textLeft, nameY), 14, textRight - textLeft - stepsWidth - 8, 'primary', { weight: 'bold', opacity: o });
    list.s(text(stepsText, v(textRight, nameY), 12, 'trailing'), 'muted', o);

    const priceY = center.y + size.y / 2 - 14;
    const priceLabel = price === null ? S.upgrades.maxed : Fmt.number(price);
    const priceWidth = price === null ? textWidth(priceLabel, 14) : moneyTagWidth(priceLabel, 14);
    // The pips take the room the price leaves; where there is not enough for one each, a single bar shows the progress.
    const pipGap = 2.5;
    const pipRoom = textRight - textLeft - priceWidth - 10;
    const pipWidth = Math.min(9, (pipRoom - pipGap * (maxSteps - 1)) / maxSteps);
    if (pipWidth >= 3) {
      for (let step = 0; step < maxSteps; step++) {
        const filled = step < steps;
        let pipSize = v(pipWidth, 5);
        if (purchase && step === purchase.steps && !reduceMotion) pipSize = mul(pipSize, 1 + 0.6 * Math.sin(Math.PI * Ease.outCubic(purchase.age / 0.3)));
        list.s(rect(v(textLeft + pipWidth / 2 + step * (pipWidth + pipGap), priceY), pipSize, 2.5), filled ? 'accent' : 'marking', (filled ? 1 : 0.6) * o);
      }
    } else if (pipRoom >= 16) {
      list.s(rect(v(textLeft + pipRoom / 2, priceY), v(pipRoom, 5), 2.5), 'marking', 0.6 * o);
      if (steps > 0) list.s(rect(v(textLeft + (pipRoom * steps) / maxSteps / 2, priceY), v((pipRoom * steps) / maxSteps, 5), 2.5), 'accent', o);
    }
    let priceColor: ColorToken = price === null ? 'accent' : career.money >= price ? 'primary' : 'muted';
    if (denied) priceColor = 'destructive';
    const priceAt = v(textRight, priceY);
    if (price !== null) moneyTag(list, priceLabel, priceAt, 14, 'trailing', priceColor, priceColor, o);
    else list.s(text(priceLabel, priceAt, 14, 'trailing', 'bold'), priceColor, o);
  },

};

/** Breaks a line at spaces so it fits `width` (measured with the real font). */
export function wrapText(s: string, width: number, size: number, bold = false): string[] {
  const lines: string[] = [];
  let lineText = '';
  for (const word of s.split(' ')) {
    const candidate = lineText ? `${lineText} ${word}` : word;
    if (measure(candidate, size, bold) <= width) lineText = candidate;
    else {
      if (lineText) lines.push(lineText);
      lineText = word;
    }
  }
  if (lineText) lines.push(lineText);
  return lines;
}

/** A small picture for every upgrade, from the same shapes as the game (`UpgradeArt`). */
export const UpgradeArt = {
  add(list: RenderList, upgrade: Upgrade, r: Rect, opacity: number): void {
    const center = R.center(r);
    const unit = Math.min(R.width(r), R.height(r)) / 56;
    const at = (x: number, y: number): Vec2 => add(center, mul(v(x, y), unit));
    const put = (p: Primitive, color: ColorToken, share = 1): void => list.s(p, color, share * opacity);
    const car = (p: Vec2, scale: number, body: ColorToken, roof: ColorToken | null, lights: boolean): void => {
      put(rect(p, mul(v(16, 27), scale * unit), 5 * scale * unit), body);
      if (roof) put(rect(p, mul(v(11, 12), scale * unit), 3 * scale * unit), roof);
      if (lights) {
        put(rect(sub(p, mul(v(2.6, 0), scale * unit)), mul(v(4, 3), scale * unit), 1), 'lightBlue');
        put(rect(add(p, mul(v(2.6, 0), scale * unit)), mul(v(4, 3), scale * unit), 1), 'lightBlue');
      }
    };
    const plus = (): void => {
      put(rect(at(19, -6), mul(v(12, 3), unit), 1.5), 'accent');
      put(rect(at(19, -6), mul(v(3, 12), unit), 1.5), 'accent');
    };
    const shield = (color: ColorToken, share = 1): void => put(polygon([at(0, -18), at(15, -10), at(15, 4), at(0, 18), at(-15, 4), at(-15, -10)]), color, share);
    const arrowUp = (x: number, y0: number, y1: number, w: number): void => {
      put(line(at(x, y0), at(x, y1), w * unit), 'accent', 0.9);
      put(line(at(x, y1), at(x - 5, y1 + 5), w * unit), 'accent', 0.9);
      put(line(at(x, y1), at(x + 5, y1 + 5), w * unit), 'accent', 0.9);
    };
    switch (upgrade) {
      case 'morePatrols':
        car(at(-13, 0), 0.85, 'vehiclePolice', 'vehiclePoliceRoof', true);
        car(at(4, 0), 0.85, 'vehiclePolice', 'vehiclePoliceRoof', true);
        plus();
        break;
      case 'longerPursuit':
        put(arc(center, 15 * unit, 3 * unit, 0, TAU), 'vehicleCriminal');
        put(rect(at(0, -18), mul(v(8, 5), unit), 2), 'vehicleCriminal');
        put(line(center, at(0, -10), 2.5 * unit), 'primary');
        put(line(center, at(8, 3), 2.5 * unit), 'primary');
        break;
      case 'quietStreets':
        car(at(-6, 0), 0.9, 'vehicleCriminal', 'vehicleBed', false);
        put(line(at(-18, 14), at(8, -14), 3 * unit), 'destructive', 0.9);
        break;
      case 'interceptor':
        car(at(4, 0), 0.95, 'vehiclePolice', 'vehiclePoliceRoof', true);
        for (let i = 0; i < 3; i++) {
          const y = center.y + (i - 1) * 7 * unit;
          put(line(v(center.x - 22 * unit, y), v(center.x - 10 * unit, y), 2.5 * unit), 'lightBlue', 0.8 - i * 0.15);
        }
        break;
      case 'dispatchRadio':
        put(circle(at(-8, 6), 4 * unit), 'lightBlue');
        for (let ring = 1; ring <= 3; ring++) put(arc(at(-8, 6), ring * 8 * unit, 2 * unit, -1.5, 0.3), 'lightBlue', 0.9 - ring * 0.2);
        break;
      case 'backup':
        shield('vehiclePolice');
        put(rect(at(-3.5, 0), mul(v(6, 4), unit), 1.5), 'lightRed');
        put(rect(at(3.5, 0), mul(v(6, 4), unit), 1.5), 'lightBlue');
        break;
      case 'cashRoute':
        put(rect(at(-6, 0), mul(v(18, 30), unit), 4 * unit), 'vehicleCargo');
        put(rect(at(-6, -6), mul(v(12, 10), unit), 2 * unit), 'hazard');
        arrowUp(12, 10, -8, 2.5);
        break;
      case 'freight':
        put(rect(at(0, 5), mul(v(17, 26), unit), 3 * unit), 'vehicleTruckBox');
        put(rect(at(0, -14), mul(v(15, 10), unit), 3 * unit), 'vehicleTruck');
        plus();
        break;
      case 'quickRecovery':
        car(at(-2, 4), 0.9, 'vehicleCar', null, false);
        for (let i = 0; i < 3; i++) {
          const x = center.x + (i - 1) * 7 * unit - 2 * unit;
          put(line(v(x, center.y + 20 * unit), v(x, center.y + 28 * unit), 2.5 * unit), 'juiceGreen', 0.85 - i * 0.15);
        }
        put(line(at(17, 12), at(17, -12), 3 * unit), 'accent');
        put(line(at(17, -12), at(11, -5), 3 * unit), 'accent');
        put(line(at(17, -12), at(23, -5), 3 * unit), 'accent');
        break;
      case 'doubleRun':
        for (const [o, share] of [
          [v(-9, 6), 0.6],
          [v(7, -4), 1],
        ] as [Vec2, number][]) {
          put(rect(at(o.x, o.y), mul(v(14, 24), unit), 3 * unit), 'vehicleCargo', share);
          put(rect(at(o.x, o.y - 5), mul(v(9, 8), unit), 2 * unit), 'hazard', share);
        }
        break;
      case 'insurance':
      case 'robberyInsurance':
        shield('accent', 0.85);
        car(center, 0.55, upgrade === 'insurance' ? 'vehicleCar' : 'vehicleCriminal', upgrade === 'insurance' ? null : 'vehicleBed', false);
        break;
      case 'shield':
        shield('juiceGreen');
        put(rect(center, mul(v(16, 5), unit), 2 * unit), 'primary');
        put(rect(center, mul(v(5, 16), unit), 2 * unit), 'primary');
        break;
      case 'tightFitTip':
        car(at(-17, 2), 0.75, 'vehicleCar', null, false);
        car(at(17, 2), 0.75, 'vehicleCar', null, false);
        put(circle(at(0, 0), 9 * unit), 'vehicleCargo');
        put(circle(at(0, 0), 6 * unit), 'hazard', 0.7);
        break;
      case 'dashcam':
        put(rect(center, mul(v(34, 20), unit), 5 * unit), 'primary', 0.9);
        put(circle(center, 7 * unit), 'card');
        put(circle(center, 4 * unit), 'lightBlue');
        put(circle(at(-12, -6), 2 * unit), 'destructive');
        put(line(at(0, -10), at(0, -17), 3 * unit), 'muted');
        break;
      case 'chainSaver':
        put(arc(at(-8, 0), 10 * unit, 3.5 * unit, 0, TAU), 'accent');
        put(arc(at(8, 0), 10 * unit, 3.5 * unit, 0, TAU), 'juiceGreen');
        break;
      case 'winterTyres':
        put(circle(center, 18 * unit), 'primary', 0.85);
        put(circle(center, 7 * unit), 'card');
        for (let spoke = 0; spoke < 3; spoke++) {
          const a = (spoke * TAU) / 6;
          const d = v(Math.cos(a), Math.sin(a));
          put(line(add(center, mul(d, 11 * unit)), add(center, mul(d, -11 * unit)), 2 * unit), 'lightBlue', 0.9);
        }
        break;
      case 'fogLamps':
        put(polygon([at(-6, -6), at(-22, -26), at(22, -26), at(6, -6)]), 'hazard', 0.35);
        car(at(0, 8), 0.8, 'vehicleCar', null, true);
        break;
      case 'overtime':
        for (let coin = 0; coin < 3; coin++) {
          const y = center.y + 8 * unit - coin * 7 * unit;
          put(circle(v(center.x, y), 13 * unit), 'vehicleCargo', 0.7 + coin * 0.15);
          put(circle(v(center.x, y), 9 * unit), 'hazard', 0.5 + coin * 0.15);
        }
        break;
    }
  },
};
