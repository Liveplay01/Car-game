import { type Career, Careers } from '../core/career';
import type { Config } from '../core/config';
import { type Upgrade, UPGRADES, UPGRADE_GROUP, upgradeMaxSteps } from '../core/levels';
import { type Vec2, v, add, mul, TAU } from '../core/vec2';
import { type RenderList, type Rect, R, rect, text, Ease } from './render';
import type { ColorToken } from './theme';
import { MenuKit } from './menukit';
import { type At, moneyTag, moneyTagWidth, drawFitted, textWidth, pen, pose, Motion } from './icons';
import { Meter } from './meter';
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
  /** The card whose picture plays again (`UpgradeArt`): it was tapped or bought. */
  played: { upgrade: Upgrade; age: number } | null = null;

  advance(delta: number): void {
    const fresh = this.purchase?.age === 0 ? this.purchase.upgrade : this.pressed?.age === 0 ? this.pressed.upgrade : null;
    if (fresh) this.played = { upgrade: fresh, age: 0 };
    else if (this.played) this.played.age += delta;
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

/** The upgrades under their headings, in the page's order; a heading with nothing under it is left out. */
const groupsOf = (upgrades: readonly Upgrade[]): { label: string; items: Upgrade[] }[] =>
  ([0, 1, 2] as const)
    .map((g) => ({ label: S.upgrades.group(g), items: UPGRADES.filter((u) => UPGRADE_GROUP[u] === g && upgrades.includes(u)) }))
    .filter((g) => g.items.length > 0);

/**
 * The Upgrades page: a card per upgrade with a picture of what it does,
 * the steps bought and the next price. One tap opens the details, their button buys. Only
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
  /** The room of a group's heading. */
  headingHeight: 28,

  /** The list's window: under the segments, above the detail panel. */
  listArea(viewport: Vec2, bottomInset: number): Rect {
    const top = BuildLayout.contentTop;
    return R.make(0, top - 4, viewport.x, viewport.y - bottomInset - UpgradePage.detailHeight - UpgradePage.gap / 2);
  },

  /** Card height: they fill the window if they can stay readable, else the list scrolls. */
  layoutOf(viewport: Vec2, bottomInset: number, upgrades: readonly Upgrade[]): { cardWidth: number; cardHeight: number; left: number; maxScroll: number } {
    const U = UpgradePage;
    const width = Math.min(viewport.x - 2 * U.gap, 460);
    const groups = groupsOf(upgrades);
    const rows = groups.reduce((n, g) => n + Math.ceil(g.items.length / U.columns), 0);
    const available = viewport.y - bottomInset - U.detailHeight - U.gap - BuildLayout.contentTop;
    const fit = (available - groups.length * U.headingHeight - U.gap * (rows - 1)) / rows;
    const cardHeight = fit >= U.minCardHeight ? Math.min(132, fit) : U.minCardHeight;
    const total = rows * cardHeight + groups.length * U.headingHeight + U.gap * (rows - 1);
    return { cardWidth: (width - U.gap * (U.columns - 1)) / U.columns, cardHeight, left: (viewport.x - width) / 2, maxScroll: Math.max(0, total - available + 8) };
  },

  /** The cards, group by group, and where each group's heading stands. */
  arrange(viewport: Vec2, bottomInset: number, upgrades: readonly Upgrade[], scroll = 0): { cards: { upgrade: Upgrade; rect: Rect }[]; headings: { label: string; y: number; x: number }[] } {
    const U = UpgradePage;
    const l = U.layoutOf(viewport, bottomInset, upgrades);
    const cards: { upgrade: Upgrade; rect: Rect }[] = [];
    const headings: { label: string; y: number; x: number }[] = [];
    let y = BuildLayout.contentTop - scroll;
    for (const group of groupsOf(upgrades)) {
      headings.push({ label: group.label, y: y + U.headingHeight / 2, x: l.left + 4 });
      y += U.headingHeight;
      group.items.forEach((upgrade, i) => {
        const x = l.left + (i % U.columns) * (l.cardWidth + U.gap);
        const top = y + Math.floor(i / U.columns) * (l.cardHeight + U.gap);
        cards.push({ upgrade, rect: R.make(x, top, x + l.cardWidth, top + l.cardHeight) });
      });
      y += Math.ceil(group.items.length / U.columns) * (l.cardHeight + U.gap);
    }
    return { cards, headings };
  },

  cards(viewport: Vec2, bottomInset: number, upgrades: readonly Upgrade[], scroll = 0): { upgrade: Upgrade; rect: Rect }[] {
    return UpgradePage.arrange(viewport, bottomInset, upgrades, scroll).cards;
  },

  cardAt(point: Vec2, viewport: Vec2, bottomInset: number, upgrades: readonly Upgrade[], scroll = 0): Upgrade | null {
    if (!R.contains(UpgradePage.listArea(viewport, bottomInset), point)) return null;
    return UpgradePage.cards(viewport, bottomInset, upgrades, scroll).find((c) => R.contains(c.rect, point))?.upgrade ?? null;
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
    const { cards, headings } = UpgradePage.arrange(vp, bottomInset, upgrades, state.scroll);
    for (const heading of headings) list.s(text(heading.label, v(heading.x, heading.y), 12, 'leading', 'bold'), 'muted', Ease.outCubic(state.age / UpgradePage.enterDuration));
    cards.forEach((card, i) => {
      if (card.rect.maxY < area.minY - 20 || card.rect.minY > area.maxY + 20) return;
      UpgradePage.addCard(list, card.upgrade, i, card.rect, career, config, state, reduceMotion, card.upgrade === freeStep);
    });
    list.clip = undefined;
    UpgradePage.addScrollIndicator(list, area, state, upgrades, bottomInset);
  },

  /** A thin bar at the right edge while the list moves, like iOS. */
  addScrollIndicator(list: RenderList, area: Rect, state: UpgradeState, upgrades: readonly Upgrade[], bottomInset: number): void {
    const l = UpgradePage.layoutOf(list.camera.viewport, bottomInset, upgrades);
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
    // One glow for all (colour roles): amber where the money reaches the next step, else a quiet one.
    const affordable = price !== null && career.money >= price;
    MenuKit.glow(list, tile, pictureHeight * 0.62, affordable ? 'accent' : 'muted', (affordable ? 0.45 : 0.2) * o);
    const clock = reduceMotion ? Infinity : state.played?.upgrade === upgrade ? state.played.age : state.age - index * U.stagger - 0.12;
    UpgradeArt.add(list, upgrade, picture, o, clock);
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
    // The steps as the one progress bar of the game (`Meter`): it glides to a bought step, gold once maxed.
    const barRoom = textRight - textLeft - priceWidth - 10;
    if (barRoom >= 16) Meter.add(list, `upgrade.${upgrade}`, R.make(textLeft, priceY - Meter.height / 2, textLeft + barRoom, priceY + Meter.height / 2), steps / maxSteps, 0, o, reduceMotion);
    let priceColor: ColorToken = price === null ? 'coin' : affordable ? 'primary' : 'muted';
    if (denied) priceColor = 'destructive';
    const priceAt = v(textRight, priceY);
    if (price !== null) moneyTag(list, priceLabel, priceAt, 14, 'trailing', priceColor, denied ? 'destructive' : affordable ? 'coin' : 'muted', o);
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

/**
 * A small picture for every upgrade, from the same shapes as the game (`UpgradeArt`). Its parts move like the real thing
 * on the clock `t` (`Motion`): once as the card arrives, again on a tap or a purchase; `Infinity` is the still picture.
 */
export const UpgradeArt = {
  add(list: RenderList, upgrade: Upgrade, r: Rect, opacity: number, t = Infinity): void {
    const center = R.center(r);
    const unit = Math.min(R.width(r), R.height(r)) / 56;
    const base: At = (x, y) => add(center, mul(v(x, y), unit));
    const p = pen(list, unit, opacity);
    // A police car's bar flashes red and blue while it plays; at rest both halves are blue.
    const flash = Motion.blink(t, 0.1, 5);
    const car = (a: At, x: number, y: number, s: number, body: ColorToken, roof: ColorToken | null, lights: boolean): void => {
      p.box(a, x, y, 16 * s, 27 * s, 5.5 * s, body);
      if (roof) p.box(a, x, y + 1 * s, 11 * s, 12 * s, 3 * s, roof);
      if (lights) {
        p.box(a, x - 2.6 * s, y, 4 * s, 3 * s, 1.2 * s, flash ? 'lightRed' : 'lightBlue');
        p.box(a, x + 2.6 * s, y, 4 * s, 3 * s, 1.2 * s, 'lightBlue');
      }
    };
    const plus = (start: number): void => {
      const k = Motion.ramp(t, start, 0.45, Ease.spring);
      const a = pose(base, 19, -6, { sx: k, sy: k, turn: (1 - k) * 1.2 });
      p.line(a, 14, -6, 24, -6, 3.2, 'accent');
      p.line(a, 19, -11, 19, -1, 3.2, 'accent');
    };
    const shield = (a: At, color: ColorToken, share = 1): void => p.shape(a, [0, -18, 15, -11, 15, 3, 0, 18, -15, 3, -15, -11], color, share, 4);
    const arrowUp = (a: At, x: number, y0: number, y1: number): void => {
      p.line(a, x, y0, x, y1, 2.8, 'accent', 0.9);
      p.line(a, x, y1, x - 5, y1 + 5, 2.8, 'accent', 0.9);
      p.line(a, x, y1, x + 5, y1 + 5, 2.8, 'accent', 0.9);
    };
    const van = (a: At, x: number, y: number, w: number, h: number, share = 1): void => {
      p.box(a, x, y, w, h, 4, 'vehicleCargo', share);
      p.box(a, x, y - h * 0.2, w * 0.66, h * 0.34, 2, 'hazard', share);
    };
    switch (upgrade) {
      case 'morePatrols': {
        // The second patrol pulls up beside the first, the plus pops after it.
        const k = Motion.ramp(t, 0.05, 0.5, Ease.spring);
        car(base, -13, 0, 0.85, 'vehiclePolice', 'vehiclePoliceRoof', true);
        car(pose(base, 4, 0, { dx: (1 - k) * 16 }), 4, 0, 0.85, 'vehiclePolice', 'vehiclePoliceRoof', true);
        plus(0.35);
        break;
      }
      case 'longerPursuit': {
        // A stopwatch: the crown is pressed, the hand runs a lap and overshoots.
        const press = Motion.bump(t, 0, 0.22) * 2.5;
        const lap = Motion.ramp(t, 0.12, 1.1, Ease.spring) * TAU;
        const body = pose(base, 0, 0, { turn: Motion.swing(t, 0.05, 0.08, 3) });
        p.ring(body, 0, 0, 15, 3.2, 'vehicleCriminal');
        p.box(pose(body, 0, -18, { dy: press }), 0, -19, 8, 5, 2, 'vehicleCriminal');
        p.line(body, 0, -15.5, 0, -17, 3, 'vehicleCriminal');
        p.line(pose(body, 0, 0, { turn: lap }), 0, 0, 0, -10, 2.6, 'primary');
        p.line(pose(body, 0, 0, { turn: lap / 12 }), 0, 0, 8, 3, 2.6, 'primary');
        p.disc(body, 0, 0, 2.2, 'primary');
        break;
      }
      case 'quietStreets': {
        // The getaway car shudders, the red line strikes it out.
        const k = Motion.ramp(t, 0.22, 0.35);
        car(pose(base, -6, 0, { dx: Motion.swing(t, 0, 2, 5, 5) }), -6, 0, 0.9, 'vehicleCriminal', 'vehicleBed', false);
        p.line(base, -18, 14, -18 + 26 * k, 14 - 28 * k, 3.2, 'destructive', 0.9);
        break;
      }
      case 'interceptor': {
        // Comes in fast and the streaks behind it stretch out.
        const k = Motion.ramp(t, 0, 0.5, Ease.spring);
        car(pose(base, 4, 0, { dx: (1 - k) * -12, sy: 1 + Motion.bump(t, 0.2, 0.3) * 0.06 }), 4, 0, 0.95, 'vehiclePolice', 'vehiclePoliceRoof', true);
        for (let i = 0; i < 3; i++) {
          const reach = Motion.ramp(t, 0.15 + i * 0.07, 0.35);
          const y = (i - 1) * 7;
          p.line(base, -10, y, -10 - 12 * reach, y, 2.6, 'lightBlue', 0.8 - i * 0.15);
        }
        break;
      }
      case 'dispatchRadio': {
        // The call goes out: the dot pulses and the waves run out one after the other.
        const s = Motion.squash(t, 0, 0.3);
        p.disc(pose(base, -8, 6, { sx: s, sy: s }), -8, 6, 4, 'lightBlue');
        for (let ring = 1; ring <= 3; ring++) {
          const k = Motion.ramp(t, 0.08 + ring * 0.12, 0.35);
          p.ring(base, -8, 6, ring * 8 * (0.6 + 0.4 * k), 2.2, 'lightBlue', (0.9 - ring * 0.2) * k, -1.5, 0.3);
        }
        break;
      }
      case 'backup': {
        // The badge swings from its top, its lights take turns.
        const a = pose(base, 0, -18, { turn: Motion.swing(t, 0, 0.2) });
        shield(a, 'vehiclePolice');
        p.box(a, -3.5, 0, 6, 4, 1.5, flash ? 'lightBlue' : 'lightRed');
        p.box(a, 3.5, 0, 6, 4, 1.5, flash ? 'lightRed' : 'lightBlue');
        break;
      }
      case 'cashRoute': {
        // The van hops on its springs, the arrow climbs after it.
        const s = Motion.squash(t, 0, 0.12);
        van(pose(base, -6, 15, { sx: 2 - s, sy: s }), -6, 0, 18, 30);
        const k = Motion.ramp(t, 0.12, 0.5, Ease.spring);
        arrowUp(pose(base, 12, 0, { dy: (1 - k) * 9 }), 12, 10, -8);
        break;
      }
      case 'freight': {
        // The lorry rolls up into place, the plus pops after it.
        const k = Motion.ramp(t, 0, 0.5, Ease.spring);
        const a = pose(base, 0, 0, { dy: (1 - k) * 10 });
        p.box(a, 0, 5, 17, 26, 3, 'vehicleTruckBox');
        p.box(a, 0, -14, 15, 10, 3, 'vehicleTruck');
        p.box(a, 0, -16, 10, 3.2, 1.5, 'card', 0.5);
        plus(0.35);
        break;
      }
      case 'quickRecovery': {
        // The car bounces back up: a squash, a puff under it and the arrow shooting up.
        const s = Motion.squash(t, 0, 0.18);
        car(pose(base, -2, 17, { sx: 2 - s, sy: s }), -2, 4, 0.9, 'vehicleCar', null, false);
        for (let i = 0; i < 3; i++) {
          const x = (i - 1) * 7 - 2;
          const puff = t === Infinity ? 0 : Motion.bump(t, 0.05 + i * 0.05, 0.5);
          p.line(base, x, 20 + 2 * puff, x, 28 - 2 * puff, 2.6, 'accent', 0.85 - i * 0.15);
        }
        const k = Motion.ramp(t, 0.15, 0.45, Ease.spring);
        arrowUp(pose(base, 17, 0, { dy: (1 - k) * 10 }), 17, 12, -12);
        break;
      }
      case 'doubleRun': {
        // The second van draws up behind the first, the first one rocks.
        const k = Motion.ramp(t, 0, 0.5, Ease.spring);
        van(pose(base, -9, 6, { dx: (1 - k) * -10, dy: (1 - k) * 6 }), -9, 6, 14, 24, 0.6);
        const s = Motion.squash(t, 0.25, 0.14);
        van(pose(base, 7, 8, { sx: 2 - s, sy: s }), 7, -4, 14, 24);
        break;
      }
      case 'insurance':
      case 'robberyInsurance': {
        // The shield swings in, the car inside it pops.
        const a = pose(base, 0, -18, { turn: Motion.swing(t, 0, 0.16) });
        shield(a, 'accent', 0.85);
        const k = 0.6 + 0.4 * Motion.ramp(t, 0.15, 0.5, Ease.spring);
        car(pose(a, 0, 0, { sx: k, sy: k }), 0, 0, 0.55, upgrade === 'insurance' ? 'vehicleCar' : 'vehicleCriminal', upgrade === 'insurance' ? null : 'vehicleBed', false);
        break;
      }
      case 'shield': {
        // Squashes on the blow, the cross turns a quarter and settles.
        const s = Motion.squash(t, 0, 0.14);
        const a = pose(base, 0, 18, { sx: 2 - s, sy: s });
        shield(a, 'juiceGreen');
        const cross = pose(a, 0, 0, { turn: (1 - Motion.ramp(t, 0.05, 0.6, Ease.spring)) * (-Math.PI / 2) });
        p.line(cross, -6, 0, 6, 0, 4.5, 'primary');
        p.line(cross, 0, -6, 0, 6, 4.5, 'primary');
        break;
      }
      case 'tightFitTip': {
        // The two cars squeeze the gap, the tip flips through it.
        const squeeze = Motion.bump(t, 0, 0.45) * 5;
        car(pose(base, -17, 2, { dx: squeeze }), -17, 2, 0.75, 'vehicleCar', null, false);
        car(pose(base, 17, 2, { dx: -squeeze }), 17, 2, 0.75, 'vehicleCar', null, false);
        const flip = Math.cos(Motion.ramp(t, 0.15, 0.8) * TAU);
        const coin = pose(base, 0, 0, { sx: flip, dy: -Motion.bump(t, 0.15, 0.8) * 6 });
        p.disc(coin, 0, 0, 9, 'vehicleCargo');
        p.disc(coin, 0, 0, 6, 'hazard', 0.7);
        p.line(coin, -2.5, -4.5, -4.5, -1.5, 1.4, 'primary', 0.45);
        break;
      }
      case 'dashcam': {
        // Bumps on its mount, the lens focuses, the red light blinks.
        const a = pose(base, 0, -17, { turn: Motion.swing(t, 0, 0.12) });
        p.line(base, 0, -10, 0, -17, 3, 'muted');
        p.box(a, 0, 0, 34, 20, 5, 'primary', 0.9);
        const focus = Motion.squash(t, 0.1, 0.25);
        p.disc(a, 0, 0, 7, 'card');
        p.disc(pose(a, 0, 0, { sx: focus, sy: focus }), 0, 0, 4, 'lightBlue');
        p.disc(a, -1.6, -1.6, 1.2, 'primary', 0.6);
        p.disc(a, -12, -6, 2, 'destructive', t === Infinity || Motion.blink(t, 0.2, 4, 3) ? 1 : 0.2);
        break;
      }
      case 'chainSaver': {
        // The links pull apart and click back together.
        const pull = Motion.bump(t, 0, 0.3) * 4 + Motion.swing(t, 0.3, 1.2, 4, 7);
        p.ring(pose(base, -8, 0, { dx: -pull }), -8, 0, 10, 3.8, 'accent');
        p.ring(pose(base, 8, 0, { dx: pull }), 8, 0, 10, 3.8, 'accent');
        break;
      }
      case 'winterTyres': {
        // The tyre rolls half a turn and settles; the tread shows it turning.
        const a = pose(base, 0, 0, { turn: Motion.ramp(t, 0, 1, Ease.spring) * Math.PI, dx: Motion.swing(t, 0, 2, 1.2, 4) });
        p.disc(a, 0, 0, 18, 'primary', 0.85);
        for (let k = 0; k < 10; k++) {
          const angle = (k * TAU) / 10;
          p.line(a, Math.cos(angle) * 15, Math.sin(angle) * 15, Math.cos(angle) * 17.5, Math.sin(angle) * 17.5, 1.6, 'card', 0.55);
        }
        p.disc(a, 0, 0, 7, 'card');
        for (let spoke = 0; spoke < 3; spoke++) {
          const angle = (spoke * TAU) / 6;
          p.line(a, Math.cos(angle) * 11, Math.sin(angle) * 11, -Math.cos(angle) * 11, -Math.sin(angle) * 11, 2.2, 'lightBlue', 0.9);
        }
        break;
      }
      case 'fogLamps': {
        // The lamps flicker on and the beam reaches out ahead.
        const reach = Motion.ramp(t, 0.12, 0.5, Ease.spring);
        const flicker = t < 0.4 && Motion.blink(t, 0, 3, 8) ? 0.35 : 1;
        p.shape(pose(base, 0, -6, { sy: reach, sx: 0.7 + 0.3 * reach }), [-6, -6, -22, -26, 22, -26, 6, -6], 'hazard', 0.35 * flicker, 3);
        car(base, 0, 8, 0.8, 'vehicleCar', null, false);
        p.box(base, -4, -2, 4, 2.4, 1.2, 'hazard', flicker);
        p.box(base, 4, -2, 4, 2.4, 1.2, 'hazard', flicker);
        break;
      }
      case 'overtime':
        // The coins drop onto the stack one by one.
        for (let coin = 0; coin < 3; coin++) {
          const k = Motion.ramp(t, coin * 0.14, 0.45, Ease.spring);
          const a = pose(base, 0, 0, { dy: (1 - k) * -18 });
          const y = 8 - coin * 7;
          const share = Ease.clamp01(k * 4);
          p.disc(a, 0, y, 13, 'vehicleCargo', (0.7 + coin * 0.15) * share);
          p.disc(a, 0, y, 9, 'hazard', (0.5 + coin * 0.15) * share);
        }
        break;
    }
  },
};
