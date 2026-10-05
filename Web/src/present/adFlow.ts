import { Careers } from '../core/career';
import { upgradeMaxSteps } from '../core/levels';
import { S, percent } from './strings';
import type { PageHost } from './pageHost';

/** What a watched ad pays: the free Standard chest, a free step of today's upgrade, the Skin Upgrade's boost. */
export type AdReward = 'chest' | 'upgrade' | 'boost';

/** What the ads on offer look like right now: the extra ones (free step, boost) are on, and an ad is ready to play. */
export interface AdOffer {
  offers: boolean;
  ready: boolean;
}

/** The game's own stand-in ad (no real ad service is on): what it will pay, and how long it has run. */
export interface AdPlaceholder {
  reward: AdReward;
  age: number;
}

/**
 * Every rewarded ad of the game (Leo, 05.10.2026), always the player's tap and never a duty: the
 * free chest, a free step of one upgrade a day, and +10 % on the Skin Upgrade. The reward is paid
 * only when the ad was watched; a closed ad, no ad and an ad blocker pay nothing. The ad itself
 * comes from the host (`rewardedAd`: the portal's, or Google's on the normal site and the Play
 * app); where none is on, a three-second placeholder plays. Only the chest is also offered on a
 * portal (`host.adOffers` is off there for the other two).
 */
export class AdFlow {
  static readonly placeholderSeconds = 3;

  /** The placeholder on screen; it covers the page, which waits. */
  placeholder: AdPlaceholder | null = null;
  /** An ad was asked for and has not answered yet: a second tap waits. */
  private requested = false;

  constructor(private readonly host: PageHost) {}

  /** An ad is on its way or on screen: the pages take no taps. */
  get busy(): boolean {
    return this.requested || this.placeholder !== null;
  }

  advance(delta: number): void {
    const p = this.placeholder;
    if (!p) return;
    p.age += delta;
    if (p.age >= AdFlow.placeholderSeconds) {
      this.placeholder = null;
      this.grant(p.reward);
    }
  }

  /** Why `reward` cannot be had now (said to the player), or null. */
  private refusal(reward: AdReward): string | null {
    const { save, today, config } = this.host;
    const career = save.career;
    switch (reward) {
      case 'chest':
        return Careers.adChestsLeft(career, today, config) <= 0 ? S.shop.noAdsLeft : null;
      case 'upgrade':
        return Careers.adUpgradeOffer(career, today, config) === null ? S.ads.noUpgrade : null;
      case 'boost':
        if (career.upgradeBoost) return S.ads.boostWaiting;
        return Careers.adBoostsLeft(career, today, config) <= 0 ? S.ads.noBoosts : null;
    }
  }

  /** The player tapped "Watch ad" for `reward`. */
  watch(reward: AdReward): void {
    if (this.busy) return;
    const offered = reward === 'chest' || this.host.adOffers;
    const why = offered ? this.refusal(reward) : S.ads.notHere;
    if (why !== null) {
      this.host.play(['denied'], []);
      this.host.showNotice(why);
      return;
    }
    this.requested = true;
    const asked = this.host.rewardedAd((outcome) => {
      this.requested = false;
      if (outcome === 'watched') this.grant(reward);
      // The portal shows no ads yet: the placeholder plays instead.
      else if (outcome === 'disabled') this.placeholder = { reward, age: 0 };
      else {
        this.host.play(['denied'], []);
        this.host.showNotice(S.ads.failed(outcome));
      }
    });
    if (!asked) {
      this.requested = false;
      this.placeholder = { reward, age: 0 };
    }
  }

  /** The ad was watched to the end: the reward, saved before anything shows. */
  private grant(reward: AdReward): void {
    const { save, today, config } = this.host;
    const career = save.career;
    switch (reward) {
      case 'chest':
        if (!Careers.rewardAd(career, today, config)) return;
        this.host.persist();
        this.host.play(['purchase'], ['paid']);
        this.host.shopPage.selectedChest = 'standard';
        this.host.showNotice(S.shop.adReward);
        return;
      case 'upgrade': {
        const u = Careers.rewardAdUpgrade(career, today, config);
        if (u === null) return;
        const steps = Careers.steps(career, u);
        const page = this.host.upgradePage;
        page.selected = u;
        page.purchase = { upgrade: u, steps: steps - 1, age: 0 };
        page.moneyBefore = null;
        this.host.persist();
        this.host.refreshWaitingShift();
        this.host.play(['purchase'], ['comboUp']);
        this.host.showNotice(S.ads.upgradeReward(S.upgrades.name(u), steps, upgradeMaxSteps[u]));
        return;
      }
      case 'boost':
        if (!Careers.rewardAdBoost(career, today, config)) return;
        this.host.persist();
        this.host.play(['purchase'], ['paid']);
        this.host.showNotice(S.ads.boostReward(percent(config.upgradeAdBoost)));
        return;
    }
  }
}
