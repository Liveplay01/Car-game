import { type Career, Careers } from '../core/career';
import type { Config } from '../core/config';
import { type Upgrade, upgradeMaxSteps } from '../core/levels';
import { type Vec2, v, add, sub, mul, TAU } from '../core/vec2';
import { type RenderList, type Rect, type Primitive, R, rect, circle, arc, line, polygon, text, Ease } from './render';
import type { ColorToken } from './theme';
import { MenuKit } from './menukit';
import { moneyTag } from './icons';
import { S, Fmt } from './strings';
import { measure } from './measure';
import { BuildLayout, BUILD_PAGES, type Tab } from './flow';

/** What the Upgrades page shows and animates (`UpgradePage.State`). */
export class UpgradeState {
  selected: Upgrade | null = null;
  age = 0;
  pressed: { upgrade: Upgrade; age: number } | null = null;
  purchase: { upgrade: Upgrade; steps: number; age: number } | null = null;
  denied: { upgrade: Upgrade; age: number } | null = null;
  moneyBefore: number | null = null;
  /** The list's scroll offset (points), its fling speed, and a finger on it. */
  scroll = 0;
  velocity = 0;
  drag: { startY: number; startScroll: number; moved: boolean; y: number } | null = null;
  private lastScroll = 0;
  indicator = 0;

  /** Past the ends the list gives way with rising resistance, like a native scroll view. */
  static rubber(overshoot: number): number {
    const d = 120;
    return (1 - 1 / ((Math.abs(overshoot) * 0.55) / d + 1)) * d * Math.sign(overshoot);
  }

  press(y: number): void {
    this.target = null;
    this.drag = { startY: y, startScroll: this.scroll, moved: false, y };
    this.velocity = 0;
  }

  move(y: number, maxScroll: number): void {
    const d = this.drag;
    if (!d) return;
    d.y = y;
    if (!d.moved && Math.abs(y - d.startY) < 6) return;
    d.moved = true;
    const raw = d.startScroll - (y - d.startY);
    this.scroll = raw < 0 ? UpgradeState.rubber(raw) : raw > maxScroll ? maxScroll + UpgradeState.rubber(raw - maxScroll) : raw;
  }

  /** True when the finger lifted without scrolling: it was a tap. */
  release(): boolean {
    const d = this.drag;
    this.drag = null;
    return !!d && !d.moved;
  }

  /** Glide to a scroll position (a card brought into view). */
  private target: number | null = null;
  scrollTo(target: number): void {
    this.target = target;
    this.velocity = 0;
  }

  wheel(dy: number, maxScroll: number): void {
    this.scroll = Math.min(Math.max(this.scroll + dy, 0), maxScroll);
    this.velocity = 0;
  }

  /** The fling decays; past an end it springs back. */
  follow(delta: number, maxScroll: number): void {
    if (delta <= 0) return;
    if (this.drag) {
      if (this.drag.moved) this.velocity = 0.6 * this.velocity + (0.4 * (this.scroll - this.lastScroll)) / delta;
      this.lastScroll = this.scroll;
      return;
    }
    if (this.target !== null) {
      this.scroll += (this.target - this.scroll) * Math.min(1, delta / 0.12);
      if (Math.abs(this.target - this.scroll) < 0.5) {
        this.scroll = this.target;
        this.target = null;
      }
      this.lastScroll = this.scroll;
      return;
    }
    this.scroll += this.velocity * delta;
    this.velocity *= Math.exp(-delta / 0.325);
    const target = Math.min(Math.max(this.scroll, 0), maxScroll);
    if (target !== this.scroll) {
      this.velocity *= Math.exp(-delta / 0.05);
      this.scroll += (target - this.scroll) * Math.min(1, delta / 0.09);
      if (Math.abs(target - this.scroll) < 0.3) this.scroll = target;
    }
    if (Math.abs(this.velocity) < 4) this.velocity = 0;
    this.lastScroll = this.scroll;
  }

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
        return 'juiceGreen';
      case 'cashRoute':
      case 'overtime':
      case 'doubleRun':
        return 'juiceYellow';
      case 'freight':
        return 'juiceOrange';
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

  add(list: RenderList, career: Career, config: Config, upgrades: readonly Upgrade[], state: UpgradeState, reduceMotion: boolean, bottomInset: number, thumb: number): void {
    const vp = list.camera.viewport;
    MenuKit.backdrop(list);
    BuildTab.addChrome(list, 'upgrades', thumb, Fmt.number(UpgradePage.countedMoney(career, state)), vp);
    const area = UpgradePage.listArea(vp, bottomInset);
    list.clip = area;
    UpgradePage.cards(vp, bottomInset, upgrades, state.scroll).forEach((card, i) => {
      if (card.rect.maxY < area.minY - 20 || card.rect.minY > area.maxY + 20) return;
      UpgradePage.addCard(list, card.upgrade, i, card.rect, career, config, state, reduceMotion);
    });
    list.clip = undefined;
    UpgradePage.addScrollIndicator(list, area, state, upgrades.length, bottomInset);
  },

  /** A thin bar at the right edge while the list moves, like iOS. */
  addScrollIndicator(list: RenderList, area: Rect, state: UpgradeState, count: number, bottomInset: number): void {
    const l = UpgradePage.layoutOf(list.camera.viewport, bottomInset, count);
    if (l.maxScroll <= 0) return;
    const moving = state.drag?.moved || Math.abs(state.velocity) > 4;
    state.indicator += ((moving ? 1 : 0) - state.indicator) * 0.2;
    if (state.indicator < 0.02) return;
    const h = R.height(area);
    const bar = Math.max(36, (h * h) / (h + l.maxScroll));
    const x = Math.min(list.camera.viewport.x - 4, l.left + 2 * l.cardWidth + UpgradePage.gap + 5);
    const y = area.minY + (h - bar) * Ease.clamp01(state.scroll / l.maxScroll) + bar / 2;
    list.s(rect(v(x, y), v(3, bar), 1.5), 'muted', 0.7 * state.indicator);
  },

  addCard(list: RenderList, upgrade: Upgrade, index: number, r: Rect, career: Career, config: Config, state: UpgradeState, reduceMotion: boolean): void {
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
    const tile = R.center(picture);
    list.s(rect(tile, v(R.width(picture), pictureHeight), 10), 'background', o);
    MenuKit.glow(list, tile, pictureHeight * 0.62, U.tint(upgrade), 0.45 * o);
    UpgradeArt.add(list, upgrade, picture, o);

    const textLeft = center.x - size.x / 2 + 12;
    const textRight = center.x + size.x / 2 - 12;
    const nameY = picture.maxY + (center.y + size.y / 2 - picture.maxY) * 0.36;
    list.s(text(S.upgrades.name(upgrade), v(textLeft, nameY), 14, 'leading', 'bold'), 'primary', o);
    list.s(text(S.upgrades.steps(steps, maxSteps), v(textRight, nameY), 12, 'trailing'), 'muted', o);

    const priceY = center.y + size.y / 2 - 14;
    const pipGap = 2.5;
    const pipWidth = Math.min(9, (size.x - 24 - 82 - pipGap * (maxSteps - 1)) / maxSteps);
    for (let step = 0; step < maxSteps; step++) {
      const filled = step < steps;
      let pipSize = v(pipWidth, 5);
      if (purchase && step === purchase.steps && !reduceMotion) pipSize = mul(pipSize, 1 + 0.6 * Math.sin(Math.PI * Ease.outCubic(purchase.age / 0.3)));
      list.s(rect(v(textLeft + pipWidth / 2 + step * (pipWidth + pipGap), priceY), pipSize, 2.5), filled ? 'accent' : 'marking', (filled ? 1 : 0.6) * o);
    }
    let priceColor: ColorToken = price === null ? 'accent' : career.money >= price ? 'primary' : 'muted';
    if (denied) priceColor = 'destructive';
    const priceAt = v(textRight, priceY);
    if (price !== null) moneyTag(list, Fmt.number(price), priceAt, 14, 'trailing', priceColor, priceColor, o);
    else list.s(text(S.upgrades.maxed, priceAt, 14, 'trailing', 'bold'), priceColor, o);
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
