import { Careers } from '../core/career';
import type { RoadModule } from '../core/config';
import { detourArmSlot } from '../core/modules';
import type { Upgrade } from '../core/levels';
import type { Vec2 } from '../core/vec2';
import { type Built, partModule } from './flow';
import { StreetBuilderPage } from './builder';
import { S, Fmt } from './strings';
import type { PageHost } from './pageHost';

/**
 * The Build tab's actions: buying an upgrade (a second tap on the same card buys it), and on
 * the Street Builder picking up, placing and building parts, and for a built one its sheet:
 * moving it (lift, then drag or tap onto a free slot) and tearing it down (a second tap
 * confirms). The rules are `core/career.ts`, the looks `upgrades.ts` and `builder.ts`.
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
    const idle = module === 'detour' && detourArmSlot({ ...this.host.config, armSlots: career.armSlots }, pending.slot) === null;
    this.host.showNotice(idle ? S.notice.detourIdle : module ? S.notice.placed(S.builder.name(pending.part)) : S.notice.built(S.builder.name(pending.part), career.armSlots.length));
  }

  /** A press on the Street Builder: a lifted part, a palette card, the pending part, or a built one. */
  press(point: Vec2): void {
    const b = this.host.builderPage;
    const career = this.host.save.career;
    const map = StreetBuilderPage.map(this.host.viewport, this.host.tabInset);
    const moving = b.moving;
    if (moving) {
      // The lifted part: pick it up to drag it, tap a free slot to put it there, or anything else keeps it in place.
      const from = moving.from;
      const onIt =
        from.k === 'arm'
          ? StreetBuilderPage.slotAt(point, this.host.config.armSlotCount, map) === from.slot
          : StreetBuilderPage.moduleSlotAt(point, this.host.config.moduleSlotCount, map) === from.slot;
      if (onIt) {
        b.dragging = { part: moving.part, at: point };
        this.host.pressed(point);
        return;
      }
      const slot = StreetBuilderPage.moveTargetAt(from, point, career, this.host.config, map);
      if (slot !== null) this.move(slot);
      else this.cancelMove();
      return;
    }
    const part = StreetBuilderPage.cardAt(point, this.host.viewport, this.host.tabInset);
    if (part) {
      this.closeInspected();
      this.host.perform({ k: 'pickUpPart', part });
      b.dragging = { part, at: point };
      this.host.pressed(point);
      return;
    }
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
      if (b.inspected) this.host.closeDetail();
      return;
    }
    // A built part: its sheet, with what it does, Move and Delete.
    if (pending) this.host.perform({ k: 'removePart' });
    b.selected = null;
    b.marked = null;
    b.inspected = { part: built, age: 0 };
    this.host.detailOpen = true;
    this.host.play(['uiTick'], []);
  }

  /** The sheet's Move: the part is lifted, the sheet goes, and the ring shows where it may go. */
  liftInspected(): void {
    const b = this.host.builderPage;
    const built = b.inspected?.part;
    const part = built ? StreetBuilderPage.partOf(built, this.host.save.career) : null;
    if (!built || !part) return;
    b.inspected = null;
    b.marked = null;
    this.host.detailOpen = false;
    b.moving = { from: built, part, age: 0 };
    this.host.play(['uiTick'], ['comboUp']);
  }

  /** The sheet's Upgrade: the module on that slot goes one level up, for money. */
  upgradeInspected(): void {
    const b = this.host.builderPage;
    const built = b.inspected?.part;
    if (built?.k !== 'module') return;
    const career = this.host.save.career;
    const module = career.modules[built.slot];
    const price = Careers.moduleUpgradePrice(career, built.slot, this.host.config);
    if (!module || price === null) return;
    const money = career.money;
    if (!Careers.upgradeModule(career, built.slot, this.host.config)) {
      b.denied = 0.001;
      this.host.play(['denied'], []);
      this.host.showNotice(S.notice.notEnoughMoney(Fmt.number(price)));
      return;
    }
    b.builtModule = { slot: built.slot, age: 0 };
    b.moneyBefore = money;
    this.host.persist();
    this.host.refreshWaitingShift();
    this.host.play(['build'], ['comboUp']);
    this.host.showNotice(S.notice.upgraded(S.builder.name(module), career.moduleLevels[built.slot] ?? 1));
  }

  /** The lifted part lands on `slot`, free of charge. */
  move(slot: number): void {
    const b = this.host.builderPage;
    const moving = b.moving;
    if (!moving) return;
    const career = this.host.save.career;
    const from = moving.from;
    const ok = from.k === 'arm' ? Careers.moveArm(career, from.slot, slot, this.host.config) : Careers.moveModule(career, from.slot, slot, this.host.config);
    b.dragging = null;
    b.target = null;
    if (!ok) {
      b.denied = 0.001;
      this.host.play(['denied'], []);
      return;
    }
    b.moving = null;
    if (from.k === 'module') b.builtModule = { slot, age: 0 };
    else b.built = { slot, age: 0 };
    this.host.persist();
    this.host.refreshWaitingShift();
    this.host.play(['build'], ['comboUp']);
    this.host.showNotice(S.builder.moved(S.builder.builtName(moving.part)));
  }

  /** The lifted part stays where it was. */
  cancelMove(): void {
    const b = this.host.builderPage;
    if (!b.moving) return;
    b.moving = null;
    b.dragging = null;
    b.target = null;
    this.host.tick();
    this.host.showNotice(S.builder.moveCancelled);
  }

  /** The sheet's Delete: the first tap marks the part red, the second tears it down. */
  deleteInspected(): void {
    const b = this.host.builderPage;
    const built = b.inspected?.part;
    if (!built) return;
    const career = this.host.save.career;
    if (built.k === 'arm' && !Careers.canRemoveArm(career, built.slot)) {
      b.denied = 0.001;
      this.host.play(['denied'], []);
      this.host.showNotice(S.builder.keepsArms(4));
      return;
    }
    if (!b.marked) {
      b.marked = { part: built, age: 0 };
      this.host.play(['uiTick'], []);
      return;
    }
    b.inspected = null;
    this.host.detailOpen = false;
    this.tearDown(built);
  }

  private closeInspected(): void {
    const b = this.host.builderPage;
    if (!b.inspected) return;
    b.inspected = null;
    b.marked = null;
    this.host.detailOpen = false;
  }

  private tearDown(part: Built): void {
    const b = this.host.builderPage;
    const career = this.host.save.career;
    b.marked = null;
    let name: string;
    if (part.k === 'arm') {
      if (!Careers.removeArm(career, part.slot)) return;
      b.tornDown = { part, module: null, age: 0 };
      name = S.builder.builtName('arm');
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
