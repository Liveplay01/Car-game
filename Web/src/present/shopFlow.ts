import { Careers } from '../core/career';
import { Unlocks } from '../core/unlocks';
import type { ChestKind } from '../core/loot';
import { ShopPage, type ShopTarget, shelfItems } from './shop';
import type { CasinoFlow } from './casinoFlow';
import { S } from './strings';
import type { PageHost } from './pageHost';

/**
 * The Shop tab's actions: its sections and shelves, the chests (open, buy; the free one for an
 * ad is `adFlow.ts`), the collection (wear, mark as seen) and the opening itself. The casino's
 * rounds go on to `CasinoFlow`.
 */
export class ShopFlow {
  constructor(
    private readonly host: PageHost,
    /** The casino's rounds, once the casino has loaded. */
    private readonly casino: () => CasinoFlow | null,
  ) {}

  /** The shelf on screen is being left: what was new on it has been seen. */
  leaveShelf(): void {
    if (!this.host.onShop || this.host.shopPage.section !== 1) return;
    const career = this.host.save.career;
    const shown = shelfItems(this.host.shopPage.shelf)
      .map((item) => item.id)
      .filter((id) => career.unseen.includes(id));
    if (shown.length === 0) return;
    Careers.markSeen(career, shown);
    this.host.persist();
  }

  tapShop(target: ShopTarget): void {
    const s = this.host.shopPage;
    const career = this.host.save.career;
    if (target.k !== 'dismiss' && !this.host.reduceMotion) s.pressed = { target, age: 0 };
    switch (target.k) {
      case 'section':
        if (target.section === 2 && !Unlocks.isOpen(career, 'casino', this.host.config)) {
          this.host.showNotice(S.unlocks.opensAt(S.shop.section(2), Unlocks.level('casino', this.host.config)));
          this.host.play(['denied'], []);
          break;
        }
        if (s.section !== target.section) {
          this.host.tick();
          this.host.closeDetail();
        }
        if (target.section !== 1) this.leaveShelf();
        if (target.section !== 2) this.casino()?.leave();
        s.select(target.section);
        break;
      case 'shelf':
        if (s.shelf !== target.shelf) {
          this.host.tick();
          this.leaveShelf();
          this.host.closeDetail();
        }
        s.selectShelf(target.shelf);
        break;
      case 'chest':
        if (this.host.detailOpen && s.selectedChest === target.kind && Careers.count(career, target.kind) > 0) this.tapShop({ k: 'open', kind: target.kind });
        else if (s.selectedChest !== target.kind) this.host.tick();
        s.selectedChest = target.kind;
        this.host.detailOpen = true;
        break;
      case 'open': {
        const index = career.chests.indexOf(target.kind as ChestKind);
        if (index >= 0) this.host.perform({ k: 'openChest', index });
        break;
      }
      case 'buy':
        this.host.perform({ k: 'buyChest', kind: target.kind });
        break;
      case 'watchAd':
        this.host.perform({ k: 'watchAd' });
        break;
      case 'item':
        if (career.unseen.includes(target.id)) {
          Careers.markSeen(career, [target.id]);
          this.host.persist();
        }
        if (this.host.detailOpen && s.selectedItem === target.id && Careers.owns(career, target.id)) this.host.perform({ k: 'wear', id: target.id });
        else if (s.selectedItem !== target.id) this.host.tick();
        s.selectedItem = target.id;
        s.revealItem = target.id;
        this.host.detailOpen = true;
        break;
      case 'wear':
        this.host.perform({ k: 'wear', id: target.id });
        break;
      case 'casino':
        this.casino()?.tap(target.t);
        break;
      case 'dismiss':
        if (s.opening && !ShopPage.stepOpening(s.opening)) s.opening = null;
        break;
    }
  }
}
