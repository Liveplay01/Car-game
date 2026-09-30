import { Careers } from '../core/career';
import type { RoadModule } from '../core/config';
import type { Upgrade } from '../core/levels';
import type { Vec2 } from '../core/vec2';
import { type Built, partModule } from './flow';
import { StreetBuilderPage, sameBuilt } from './builder';
import { S, Fmt } from './strings';
import type { PageHost } from './pageHost';

/**
 * The Build tab's actions: buying an upgrade (a second tap on the same card buys it), and on
 * the Street Builder picking up, placing, marking and tearing down parts. The rules are
 * `core/career.ts`, the looks `upgrades.ts` and `builder.ts`.
 */
export class BuildFlow {
  /** A second tap within this long is a double tap (buy, build). */
  static readonly doubleTapWindow = 0.4;

  private lastPartTap = Infinity;
  private lastCardTap: { upgrade: Upgrade; age: number } | null = null;

  constructor(private readonly host: PageHost) {}

  /** Once a frame: the double-tap windows run out; leaving the Street Builder forgets its tap. */
  advance(delta: number, onBuilder: boolean): void {
    this.lastPartTap = onBuilder ? this.lastPartTap + delta : Infinity;
    if (this.lastCardTap) {
      this.lastCardTap.age += delta;
      if (this.lastCardTap.age > BuildFlow.doubleTapWindow) this.lastCardTap = null;
    }
  }

  buy(upgrade: Upgrade): void {
    const career = this.host.save.career;
    this.host.upgradePage.selected = upgrade;
    const price = Careers.priceOf(career, upgrade, this.host.config);
    if (price === null) return;
    const money = career.money;
    if (!Careers.buy(career, upgrade, this.host.config)) {
      this.host.upgradePage.denied = { upgrade, age: 0 };
      this.host.play(['denied'], []);
      this.host.showNotice(S.notice.notEnoughMoney(Fmt.number(price)));
      return;
    }
    const steps = Careers.steps(career, upgrade);
    this.host.upgradePage.purchase = { upgrade, steps: steps - 1, age: 0 };
    this.host.upgradePage.moneyBefore = money;
    this.host.persist();
    this.host.refreshWaitingShift();
    this.host.play(['purchase'], ['comboUp']);
  }

  buildPart(): void {
    const b = this.host.builderPage;
    const pending = b.pending;
    if (!pending) return;
    const career = this.host.save.career;
    const price = StreetBuilderPage.price(pending.part, career, this.host.config);
    if (price === null) return;
    const money = career.money;
    const module = partModule(pending.part);
    const ok = module ? Careers.buildModule(career, module, pending.slot, this.host.config) : Careers.buildArm(career, pending.slot, this.host.config);
    if (!ok) {
      b.denied = 0.001;
      this.host.play(['denied'], []);
      this.host.showNotice(S.notice.notEnoughMoney(Fmt.number(price)));
      return;
    }
    b.pending = null;
    b.removing = 0;
    this.host.detailOpen = false;
    b.selected = null;
    if (module) b.builtModule = { slot: pending.slot, age: 0 };
    else b.built = { slot: pending.slot, age: 0 };
    b.moneyBefore = money;
    this.host.persist();
    this.host.refreshWaitingShift();
    this.host.play(['build'], ['comboUp']);
    this.host.showNotice(module ? S.notice.placed(S.builder.name(pending.part)) : S.notice.built(S.builder.name(pending.part), career.armSlots.length));
  }

  /** A press on the Street Builder: pick up a part, build or drop the pending one, mark or tear down. */
  press(point: Vec2): void {
    const b = this.host.builderPage;
    const career = this.host.save.career;
    const part = StreetBuilderPage.cardAt(point, this.host.viewport, this.host.tabInset);
    if (part) {
      this.host.perform({ k: 'pickUpPart', part });
      b.dragging = { part, at: point };
      this.host.pressed(point);
      return;
    }
    const map = StreetBuilderPage.map(this.host.viewport, this.host.tabInset);
    const pending = b.pending;
    if (pending) {
      const hit = partModule(pending.part)
        ? StreetBuilderPage.moduleSlotAt(point, this.host.config.moduleSlotCount, map)
        : StreetBuilderPage.slotAt(point, this.host.config.armSlotCount, map);
      if (hit === pending.slot) {
        if (this.lastPartTap <= BuildFlow.doubleTapWindow) {
          this.lastPartTap = Infinity;
          this.host.perform({ k: 'buildPart' });
        } else {
          this.lastPartTap = 0;
          b.removing = 0.001;
        }
        return;
      }
    }
    const built = StreetBuilderPage.builtPartAt(point, career, this.host.config, map);
    if (!built) {
      b.marked = null;
      return;
    }
    if (b.marked && sameBuilt(b.marked.part, built)) {
      this.tearDown(built);
      return;
    }
    if (built.k === 'arm' && !Careers.canRemoveArm(career, built.slot)) {
      b.denied = 0.001;
      this.host.play(['denied'], []);
      this.host.showNotice(S.builder.keepsArms(4));
      return;
    }
    b.marked = { part: built, age: 0 };
    this.host.play(['uiTick'], []);
    this.host.showNotice(S.builder.tapAgainToRemove);
  }

  private tearDown(part: Built): void {
    const b = this.host.builderPage;
    const career = this.host.save.career;
    b.marked = null;
    let name: string;
    if (part.k === 'arm') {
      if (!Careers.removeArm(career, part.slot)) return;
      b.tornDown = { part, module: null, age: 0 };
      name = S.builder.name('arm');
    } else {
      const module: RoadModule | undefined = career.modules[part.slot];
      if (!module) return;
      Careers.removeModule(career, part.slot);
      b.tornDown = { part, module, age: 0 };
      name = S.builder.name(module);
    }
    this.host.persist();
    this.host.refreshWaitingShift();
    this.host.play(['swoosh'], ['comboUp']);
    this.host.showNotice(S.notice.removed(name));
  }

  tapUpgrade(upgrade: Upgrade): void {
    const last = this.lastCardTap;
    if (last && last.upgrade === upgrade && last.age <= BuildFlow.doubleTapWindow) {
      this.lastCardTap = null;
      this.host.perform({ k: 'buy', upgrade });
    } else {
      this.lastCardTap = { upgrade, age: 0 };
      this.host.perform({ k: 'selectUpgrade', upgrade });
    }
  }
}
