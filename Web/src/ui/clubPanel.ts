import { h, icon, loadingNote } from './dom';
import { ICONS } from './icons';
import { nameForm, openAccount } from './ranksPanel';
import { tabsControl } from './tabs';
import { fadeIn, openSheet, scrollSheetToTop, swapView } from './sheets';
import { baseConfig } from '../core/config';
import { type Career, Careers } from '../core/career';
import { Auction, type AuctionEvent, type AuctionRun, type Lot } from '../core/auction';
import { Fund, GIFTS } from '../core/fund';
import type { TitleId } from '../core/elite';
import { cosmetic } from '../core/loot';
import { fetchIdeas, giveToIdea, ideasEnabled, suggestIdea, type Idea, type IdeasView } from '../net/ideas';
import { describeError, loadAccount, syncScores, type Records } from '../net/leaderboard';
import { loadPlayerName } from '../storage/profile';
import { Fmt, S } from '../present/strings';
import { money, percent } from '../present/format';
import { Details, type DetailArt } from '../present/detail';
import { MONEY_MARK } from '../present/icons';
import type { SoundID } from '../present/feedback';
import { RenderList, circle } from '../present/render';
import { Centre } from '../present/mapCentre';
import { CanvasDrawer } from '../present/draw';
import { v } from '../core/vec2';

/**
 * The Club (Leo, 10.10.2026): sinks for big balances, the third segment of the Social tab (from Level 50; it began as a card in
 * the Shop). The Auction House (`core/auction.ts`), the Game fund (Leo, 12.10.2026, it replaced the City Fund: players suggest ideas, we publish
 * them, everyone gives until an idea is funded; `net/ideas.ts`). Money only buys looks, thanks and a chance at a payout for skill: never an edge on the road.
 */

export interface ClubHost {
  /** Where drawers open (an idea's details, the thanks). */
  layer: HTMLElement;
  career(): Career;
  today(): number;
  /** The records as the save has them now, sent right after a name is chosen. */
  records(): Records;
  /** The career changed (a lot begun or won, a gift): write the save. */
  changed(): void;
  /** The Game fund tab is open: its drawer explains it, once. */
  intro(): void;
  celebrate(): void;
  sound?(id: SoundID, pitch?: number): void;
}

export interface ClubPanel {
  el: HTMLElement;
  /** The page is left: the auction's clock stops and the answers that are still on their way are dropped. */
  dispose(): void;
}

type ClubTab = 'auction' | 'ideas';
const TABS: { id: ClubTab; label: string }[] = [
  { id: 'auction', label: S.clubPanel.tabs.auction },
  { id: 'ideas', label: S.clubPanel.tabs.ideas },
];
let lastTab: ClubTab = 'auction';

const label = (text: string): HTMLElement => h('p', { class: 'section-note board-label' }, text);
const note = (text: string, error = false): HTMLElement => h('p', { class: `field-help${error ? ' error' : ''}`, ...(error ? { role: 'alert' } : {}) }, text);
const cash = (n: number): string => money(Fmt.number(n));
const row = (title: string, sub: string, ...end: HTMLElement[]): HTMLElement =>
  h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), h('div', { class: 'row-sub' }, sub)), ...end);

/** A picture drawn with the game's own art like the Shop's: the car in its paint, the map as its little city, the chest. */
function picture(art: DetailArt | { k: 'fountain' }, size = 56): HTMLElement {
  const canvas = h('canvas', { class: 'club-art', width: size * 2, height: size * 2, 'aria-hidden': 'true' });
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const drawer = new CanvasDrawer(canvas);
  drawer.resize(size, size, 2);
  const fountain = art.k === 'fountain';
  const list = new RenderList({ viewport: v(size, size), center: v(0, 0), focus: v(size / 2, size / 2), scale: fountain ? size / 100 : 1 }, 'card');
  if (fountain) {
    list.w(circle(v(0, 0), 50), 'mapForest', 0.4);
    Centre.fountain(list, v(0, 0), null);
  } else Details.drawArt(list, art, v(size / 2, size / 2), size, baseConfig);
  drawer.draw(list);
  return canvas;
}

const swatch = (lot: Lot): HTMLElement => picture(lot.k === 'chest' ? { k: 'chest', kind: lot.chest } : { k: 'item', id: lot.id, owned: true });

/** A progress bar; `from` is where the fill starts when it should glide to `share` (the thanks). */
function bar(share: number, from = share): { el: HTMLElement; go(): void } {
  const fill = h('span', { class: 'club-bar-fill' });
  const shift = (x: number): string => `translateX(${Math.min(100, Math.max(x > 0 ? 1 : 0, Math.round(x * 100))) - 100}%)`;
  fill.style.transform = shift(from);
  const el = h('span', { class: from >= 1 ? 'club-bar done' : 'club-bar', 'aria-hidden': 'true' }, fill);
  return {
    el,
    go: () =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          fill.style.transform = shift(share);
          if (share < 1 || from >= 1) return;
          // Reaching the goal turns it gold and sends the one wave once the glide lands (`present/meter.ts`).
          if (matchMedia('(prefers-reduced-motion: reduce)').matches) el.classList.add('done');
          else fill.addEventListener('transitionend', () => el.classList.add('done', 'arrived'), { once: true });
        }),
      ),
  };
}

/** The money mark in a text becomes the gold coin, as in the other sheets (`DetailSheet`), built from nodes. */
function withCoins(root: Node): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const found: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) if (node.nodeValue?.includes(MONEY_MARK)) found.push(node as Text);
  for (const text of found) {
    const parts = (text.nodeValue ?? '').split(MONEY_MARK);
    const nodes: (string | HTMLElement)[] = [];
    parts.forEach((part, i) => {
      if (i > 0) nodes.push(h('span', { class: 'coin', 'aria-label': S.clubPanel.money }));
      if (part) nodes.push(part);
    });
    text.replaceWith(...nodes);
  }
}

const lotName = (lot: Lot): string => (lot.k === 'chest' ? S.shop.chest(lot.chest) : S.shop.item(lot.id));
function lotKind(lot: Lot): string {
  if (lot.k === 'chest') return S.clubPanel.sealedChest;
  const item = cosmetic(lot.id);
  if (!item) return '';
  return item.source.kind === 'auction' ? S.clubPanel.exclusive : S.shop.kind(item);
}

export function clubPanel(host: ClubHost): ClubPanel {
  const career = host.career();
  const body = h('div', { class: 'club' });
  const content = h('div', { class: 'club-content' });
  let tab: ClubTab = lastTab;
  let closed = false;
  /** The auction under way, in memory only (`core/auction.ts`). */
  let run: AuctionRun | null = null;
  /** What the auction shows while the collectors answer one by one: the bidding as it unfolds. */
  let shown: { price: number; leader: AuctionRun['leader']; log: string[]; busy: boolean } = { price: 0, leader: null, log: [], busy: false };
  let ideas: IdeasView | null = null;
  let ideasError: string | null = null;
  let ideasBusy = false;
  /** An idea was sent in this visit: the list says what happens to it. */
  let ideaSent = false;
  /** The gift picked (a quick amount or typed) and the text of the field; nothing is given before "Give". */
  let gift = 0;
  let giftText = '';

  const AUCTION_TIMER_SECONDS = 10;
  let timerId: number | null = null;
  let remainingSeconds = AUCTION_TIMER_SECONDS;
  let timerBarEl: HTMLElement | null = null;
  let timerDigitsEl: HTMLElement | null = null;
  let timerStageEl: HTMLElement | null = null;
  let timerContainerEl: HTMLElement | null = null;

  function stopTimer(): void {
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function updateTimerUi(): void {
    const pct = Math.max(0, Math.min(100, (remainingSeconds / AUCTION_TIMER_SECONDS) * 100));
    if (timerBarEl) timerBarEl.style.transform = `translateX(${pct - 100}%)`;
    if (timerDigitsEl) timerDigitsEl.textContent = S.clubPanel.timer.seconds(remainingSeconds.toFixed(1));
    if (timerStageEl) {
      if (remainingSeconds > 4.5) timerStageEl.textContent = S.clubPanel.timer.open;
      else if (remainingSeconds > 2.0) timerStageEl.textContent = S.clubPanel.timer.once;
      else if (remainingSeconds > 0) timerStageEl.textContent = S.clubPanel.timer.twice;
      else timerStageEl.textContent = S.clubPanel.timer.fall;
    }
    if (timerContainerEl) {
      if (remainingSeconds <= 3.5) timerContainerEl.classList.add('urgent');
      else timerContainerEl.classList.remove('urgent');
    }
  }

  function startTimer(seconds = AUCTION_TIMER_SECONDS): void {
    stopTimer();
    if (closed || !run || run.phase !== 'bidding' || shown.busy) return;
    remainingSeconds = seconds;
    updateTimerUi();
    timerId = window.setInterval(() => {
      if (closed || !run || run.phase !== 'bidding' || shown.busy) {
        stopTimer();
        return;
      }
      remainingSeconds = Math.max(0, remainingSeconds - 0.1);
      updateTimerUi();
      if (remainingSeconds <= 0) {
        stopTimer();
        handleTimeout();
      }
    }, 100);
  }

  function handleTimeout(): void {
    if (!run || run.phase !== 'bidding') return;
    Auction.walk(run);
    if (typeof shown.leader === 'number') {
      const winningBot = run.bots[shown.leader];
      shown.log.push(S.clubPanel.expiredSold(winningBot.name, cash(run.price)));
      host.sound?.('shiftFailed');
    } else {
      shown.log.push(S.clubPanel.expiredNone);
      host.sound?.('denied');
    }
    host.changed();
    show();
  }

  const tabs = tabsControl(S.club.title, TABS, (next) => {
    tab = next;
    lastTab = next;
    if (tab !== 'auction') {
      stopTimer();
    } else if (run && run.phase === 'bidding' && !shown.busy) {
      startTimer(remainingSeconds > 0 ? remainingSeconds : AUCTION_TIMER_SECONDS);
    }
    show();
  });

  let view = '';

  function show(): void {
    tabs.set(tab);
    const rows = { auction: auctionRows, ideas: ideaRows }[tab]();
    const replace = (): void => {
      content.replaceChildren(...rows);
      withCoins(content);
    };
    // A new view (another tab, the room opening, the hammer falling, back to the lots) starts at the top; a new bid stays where it is.
    const next = tab === 'auction' ? `auction:${run?.phase ?? 'lots'}` : tab;
    if (next !== view) {
      scrollSheetToTop(content);
      swapView(content, replace);
    } else {
      replace();
      fadeIn(content);
    }
    view = next;
    if (tab === 'ideas') host.intro();
    if (tab === 'ideas' && !ideas && !ideasBusy && !ideasError && ideasEnabled) void loadIdeas();
  }

  // MARK: Auction

  function auctionRows(): HTMLElement[] {
    return run ? auctionRoom(run) : auctionLots();
  }

  function auctionLots(): HTMLElement[] {
    const day = host.today();
    const fresh = career.auctionDay !== day;
    const lots = Auction.today(career, day);
    if (fresh) host.changed();
    const rows = lots.map((lot, slot) => {
      const can = Auction.canStart(career, slot, day);
      const button = h('button', { class: `btn${can ? ' primary' : ''}`, type: 'button', disabled: !can, 'aria-label': S.clubPanel.bidOn(lotName(lot)) }, can ? S.clubPanel.enter : career.auctionTaken.includes(slot) ? S.clubPanel.tried : S.clubPanel.owned);
      button.addEventListener('click', () => begin(slot));
      return h('div', { class: 'row' }, swatch(lot), h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, lotName(lot)), h('div', { class: 'row-sub' }, S.clubPanel.estimate(lotKind(lot), cash(Auction.estimate(lot))))), button);
    });
    const [sharkLo, sharkHi] = baseConfig.auctionShark;
    const [pennyLo, pennyHi] = baseConfig.auctionPenny;
    const out: HTMLElement[] = [
      label(S.clubPanel.lots),
      h('div', { class: 'list' }, ...rows),
      note(S.clubPanel.rules(Math.round(baseConfig.auctionSharkShare * 10), sharkLo, sharkHi, pennyLo, pennyHi, percent(baseConfig.auctionStartShare), percent(baseConfig.auctionPremium))),
    ];
    if (career.auctionWins > 0) out.push(note(S.clubPanel.record(career.auctionWins, cash(career.auctionSpent))));
    return out;
  }

  function begin(slot: number): void {
    const started = Auction.begin(career, slot, host.today());
    host.changed();
    if (!started) return show();
    run = started;
    shown = { price: 0, leader: null, log: [S.clubPanel.seats(started.bots.length, lotName(started.lot))], busy: false };
    show();
    startTimer(AUCTION_TIMER_SECONDS);
  }

  function auctionRoom(now: AuctionRun): HTMLElement[] {
    const leader = shown.leader === 'you' ? S.clubPanel.you : typeof shown.leader === 'number' ? now.bots[shown.leader].name : null;

    // Status Banner: Crystal clear explanation of current state for new players
    const banner = h('div', { class: 'auction-status-banner' });
    if (now.phase === 'won') {
      banner.classList.add('won');
      banner.append(
        h('span', { class: 'auction-status-badge' }, S.clubPanel.wonBadge),
        h('div', { class: 'auction-status-title' }, S.clubPanel.wonTitle(lotName(now.lot))),
        h('div', { class: 'auction-status-desc' }, S.clubPanel.wonDesc(cash(now.price), cash(now.paid))),
      );
    } else if (now.phase === 'lost') {
      banner.classList.add('outbid');
      const soldTo = typeof now.leader === 'number' ? now.bots[now.leader].name : null;
      banner.append(
        h('span', { class: 'auction-status-badge' }, S.clubPanel.closedBadge),
        h('div', { class: 'auction-status-title' }, soldTo ? S.clubPanel.soldTo(soldTo) : S.clubPanel.withdrawn),
        h('div', { class: 'auction-status-desc' }, soldTo ? S.clubPanel.closedSold(cash(now.price)) : S.clubPanel.closedNone),
      );
    } else if (shown.leader === 'you') {
      banner.classList.add('lead');
      banner.append(
        h('span', { class: 'auction-status-badge' }, S.clubPanel.leadBadge),
        h('div', { class: 'auction-status-title' }, S.clubPanel.leadTitle(cash(shown.price))),
        h('div', { class: 'auction-status-desc' }, S.clubPanel.leadDesc),
      );
    } else if (typeof shown.leader === 'number') {
      banner.classList.add('outbid');
      banner.append(
        h('span', { class: 'auction-status-badge' }, S.clubPanel.outbidBadge),
        h('div', { class: 'auction-status-title' }, S.clubPanel.outbidTitle(now.bots[shown.leader].name, cash(shown.price))),
        h('div', { class: 'auction-status-desc' }, S.clubPanel.outbidDesc),
      );
    } else {
      banner.classList.add('open');
      banner.append(
        h('span', { class: 'auction-status-badge' }, S.clubPanel.openBadge),
        h('div', { class: 'auction-status-title' }, S.clubPanel.openTitle(cash(now.start))),
        h('div', { class: 'auction-status-desc' }, S.clubPanel.openDesc),
      );
    }

    // Lot card and Current Price
    const lot = h('div', { class: 'row' }, swatch(now.lot), h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, lotName(now.lot)), h('div', { class: 'row-sub' }, S.clubPanel.estimate(lotKind(now.lot), cash(now.estimate)))));
    const bid = h(
      'div',
      { class: 'row' },
      h(
        'div',
        { class: 'row-main' },
        h('div', { class: 'row-sub' }, shown.price === 0 ? S.clubPanel.openingMinimum : S.clubPanel.highestBid),
        h('div', { class: 'club-price' }, cash(shown.price === 0 ? now.start : shown.price)),
        h('div', { class: 'row-sub' }, leader ? S.clubPanel.leads(leader) : S.clubPanel.noBid),
      ),
    );

    // Countdown Timer widget (while bidding is active)
    let timerEl: HTMLElement | null = null;
    if (now.phase === 'bidding') {
      timerContainerEl = h('div', { class: 'auction-timer' });
      timerStageEl = h('span', { class: 'auction-timer-stage' }, S.clubPanel.timer.open);
      timerDigitsEl = h('span', { class: 'auction-timer-digits' }, S.clubPanel.timer.seconds(remainingSeconds.toFixed(1)));
      const timerHeader = h('div', { class: 'auction-timer-header' }, timerStageEl, timerDigitsEl);

      timerBarEl = h('div', { class: 'auction-timer-bar' });
      const timerTrack = h('div', { class: 'auction-timer-track' }, timerBarEl);
      timerContainerEl.append(timerHeader, timerTrack);
      timerEl = timerContainerEl;
      updateTimerUi();
    } else {
      timerContainerEl = null;
      timerStageEl = null;
      timerDigitsEl = null;
      timerBarEl = null;
    }

    // Collector pills with Leader highlight
    const activeBots = now.bots.filter((b) => !b.out).length;
    const botsLabel = h('div', { class: 'section-note', style: 'margin: var(--s2) 0 var(--s1);' }, S.clubPanel.collectors(activeBots));
    const bots = h(
      'div',
      { class: 'club-bots', role: 'list', 'aria-label': S.clubPanel.collectorsLabel },
      ...now.bots.map((bot, i) => {
        const isLeader = shown.leader === i;
        const isOut = bot.out;
        const cls = `club-bot${isOut ? ' out' : isLeader ? ' leader' : ''}`;
        const text = isOut ? S.clubPanel.botOut(bot.name) : isLeader ? S.clubPanel.botLeading(bot.name) : S.clubPanel.botIn(bot.name);
        return h('span', { class: cls, role: 'listitem' }, text);
      }),
    );

    const log = h('div', { class: 'club-log', 'aria-live': 'polite' }, ...shown.log.slice(-5).map((line) => h('p', {}, line)));

    const out: HTMLElement[] = [banner];
    if (timerEl) out.push(timerEl);
    out.push(h('div', { class: 'list' }, lot, bid), botsLabel, bots, log);

    // Phase: Won or Lost
    if (now.phase !== 'bidding') {
      const won = now.phase === 'won';
      const sold = typeof now.leader === 'number' ? S.clubPanel.soldLine(now.bots[now.leader].name, cash(now.price)) : S.clubPanel.withdrawnLine;
      out.push(
        h('div', { class: 'list' }, row(won ? S.clubPanel.soldToYou(lotName(now.lot)) : S.clubPanel.concluded, won ? S.clubPanel.hammerSum(cash(now.price), cash(now.paid - now.price), cash(now.paid)) : sold)),
        h('button', { class: 'btn primary block', type: 'button', onclick: () => { run = null; show(); } }, S.clubPanel.back),
      );
      return out;
    }

    // Phase: Bidding
    const min = Auction.minBid(now);
    const step = now.step;
    const tiers = [
      { n: 0, tag: S.clubPanel.tiers.min, cls: 'min' },
      { n: 2, tag: S.clubPanel.tiers.raise, cls: 'raise' },
      { n: 5, tag: S.clubPanel.tiers.power, cls: 'jump' },
    ];

    if (shown.leader === 'you') {
      // Player is currently winning
      out.push(
        h('div', { class: 'list' },
          row(S.clubPanel.holdTitle, S.clubPanel.holdSub)
        ),
        h('button', { class: 'btn block', type: 'button', disabled: shown.busy, onclick: () => leave(now) }, S.clubPanel.concede)
      );
    } else {
      // Opponent or no one leads: show strategic bidding options
      const offerRows: HTMLElement[] = tiers.map(({ n, tag, cls }) => {
        const amount = min + n * step;
        const cost = Auction.cost(amount);
        const canAfford = cost <= career.money;
        const button = h(
          'button',
          {
            class: `btn${canAfford ? ' primary' : ''}`,
            type: 'button',
            disabled: shown.busy || !canAfford,
            'aria-label': S.clubPanel.bidLabel(Fmt.number(amount)),
          },
          canAfford ? S.clubPanel.bid(cash(amount)) : S.clubPanel.tooCostly,
        );
        button.addEventListener('click', () => bidOn(now, amount));

        const titleEl = h('div', { class: 'row-title' },
          h('span', { class: `auction-offer-tag ${cls}` }, tag),
          cash(amount),
        );
        const subText = S.clubPanel.withPremium(cash(cost), canAfford);
        return h('div', { class: 'row' },
          h('div', { class: 'row-main' }, titleEl, h('div', { class: 'row-sub' }, subText)),
          button,
        );
      });

      if (career.money < Auction.cost(min)) {
        offerRows.push(row(S.clubPanel.notEnough, S.clubPanel.minCost(cash(Auction.cost(min)))));
      }

      out.push(
        h('div', { class: 'list' }, ...offerRows),
        h('button', { class: 'btn block', type: 'button', disabled: shown.busy, onclick: () => leave(now) }, S.clubPanel.walk),
      );
    }

    // Helpful beginner guide box
    out.push(
      h(
        'div',
        { class: 'auction-guide-box' },
        h('strong', {}, S.clubPanel.guideHead),
        S.clubPanel.guide,
      ),
    );

    return out;
  }

  function leave(now: AuctionRun): void {
    stopTimer();
    Auction.walk(now);
    shown.log.push(typeof now.leader === 'number' ? S.clubPanel.walkedAwaySold(now.bots[now.leader].name, cash(now.price)) : S.clubPanel.walkedAway);
    host.sound?.('denied');
    host.changed();
    show();
  }

  /** The player bids; the collectors answer one at a time, so it reads like a room. */
  function bidOn(now: AuctionRun, amount: number): void {
    stopTimer();
    const events = Auction.bid(career, now, amount);
    if (!events) return show();
    host.sound?.('purchase', 1.05);
    shown.price = amount;
    shown.leader = 'you';
    shown.log.push(S.clubPanel.youBid(cash(amount)));
    shown.busy = true;
    show();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const step = (rest: AuctionEvent[]): void => {
      if (closed) {
        stopTimer();
        return;
      }
      const [event, ...later] = rest;
      if (!event) {
        shown.busy = false;
        shown.leader = now.leader;
        shown.price = now.price;
        host.changed();
        show();
        if (now.phase === 'bidding') {
          startTimer(AUCTION_TIMER_SECONDS);
        }
        return;
      }
      if (event.k === 'out') {
        shown.log.push(S.clubPanel.dropsOut(now.bots[event.bot].name));
        host.sound?.('uiTick', 0.9);
        show();
        window.setTimeout(() => step(later), reduce ? 0 : 550);
      } else if (event.k === 'counter') {
        shown.price = event.price;
        shown.leader = event.bot;
        shown.log.push(S.clubPanel.counterBids(now.bots[event.bot].name, cash(event.price)));
        host.sound?.('toll', 1.0);
        show();
        window.setTimeout(() => step(later), reduce ? 0 : 750);
      } else {
        // Hammer sequence: dramatic 3-strike countdown
        const winPrice = event.price;
        shown.log.push(S.clubPanel.noCounter);
        show();
        window.setTimeout(() => {
          if (closed) return;
          shown.log.push(S.clubPanel.goingOnce(cash(winPrice)));
          host.sound?.('uiTick', 1.1);
          show();
          window.setTimeout(() => {
            if (closed) return;
            shown.log.push(S.clubPanel.goingTwice);
            host.sound?.('uiTick', 1.3);
            show();
            window.setTimeout(() => {
              if (closed) return;
              shown.log.push(S.clubPanel.sold(cash(winPrice)));
              host.sound?.('shiftComplete', 1.0);
              host.celebrate();
              shown.busy = false;
              host.changed();
              show();
            }, reduce ? 0 : 700);
          }, reduce ? 0 : 650);
        }, reduce ? 0 : 600);
      }
    };
    window.setTimeout(() => step(events), reduce ? 0 : 500);
  }

  // MARK: Ideas

  async function loadIdeas(): Promise<void> {
    ideasBusy = true;
    try {
      ideas = await fetchIdeas();
      const newest = Math.max(0, ...ideas.ideas.map((i) => i.at));
      if (newest > career.ideasSeenAt) {
        career.ideasSeenAt = newest;
        host.changed();
      }
    } catch (error) {
      ideasError = describeError(error);
    }
    ideasBusy = false;
    if (!closed && tab === 'ideas') show();
  }

  const ideaState = (i: Idea): string => (i.status === 'built' ? S.clubPanel.state.built : i.status === 'building' ? S.clubPanel.state.building : i.status === 'funded' ? S.clubPanel.state.funded : S.clubPanel.state.funding);

  /** The players' ideas: what is being funded, what is funded or underway, and what is built. */
  function ideaRows(): HTMLElement[] {
    if (!ideasEnabled) return [note(S.clubPanel.ideasOffline)];
    if (ideasError) {
      return [
        note(ideasError, true),
        h('button', { class: 'btn block', type: 'button', onclick: () => { ideasError = null; show(); } }, S.clubPanel.tryAgain),
      ];
    }
    if (!ideas) return [loadingNote(S.clubPanel.loading, 'field-help')];
    const view = ideas;
    const group = (title: string, items: Idea[]): HTMLElement[] =>
      items.length === 0
        ? []
        : [
            label(title),
            h(
              'div',
              { class: 'list' },
              ...items.map((i) => {
                const open = h(
                  'button',
                  { class: 'row row-link club-project', type: 'button', 'aria-label': S.clubPanel.detailsLabel(i.title) },
                  h(
                    'div',
                    { class: 'row-main' },
                    h('div', { class: 'row-title' }, i.title),
                    bar(i.raised / i.goal).el,
                    h('div', { class: 'row-sub' }, i.status === 'built' ? S.clubPanel.builtThanks : i.status === 'building' ? S.clubPanel.state.building : S.clubPanel.raised(cash(i.raised), cash(i.goal), i.mine > 0 ? cash(i.mine) : null)),
                  ),
                  icon(ICONS.chevronRight),
                );
                open.addEventListener('click', () => ideaSheet(view, i));
                return open;
              }),
            ),
          ];
    const suggest = h('button', { class: 'btn primary block', type: 'button' }, S.clubPanel.suggest);
    suggest.addEventListener('click', () => suggestSheet());
    const out: HTMLElement[] = [
      note(S.clubPanel.ideasIntro(cash(view.goal))),
      suggest,
      ...(ideaSent ? [note(S.clubPanel.ideaSent)] : []),
      ...group(S.clubPanel.groupFunding, view.ideas.filter((i) => i.status === 'open')),
      ...group(S.clubPanel.groupFunded, view.ideas.filter((i) => i.status === 'funded')),
      ...group(S.clubPanel.groupBuilding, view.ideas.filter((i) => i.status === 'building')),
      ...group(S.clubPanel.groupBuilt, view.ideas.filter((i) => i.status === 'built')),
    ];
    if (view.ideas.length === 0) out.push(note(S.clubPanel.noIdeas));
    return out;
  }

  /** An idea: what it is, how far it is, and the gift to it. */
  function ideaSheet(view: IdeasView, idea: Idea): void {
    const rows = [stat(S.clubPanel.status, ideaState(idea)), stat(S.clubPanel.raisedLabel, cash(idea.raised)), stat(S.clubPanel.goalLabel, cash(idea.goal)), stat(S.clubPanel.youGave, cash(idea.mine))];
    const failure = h('div');
    const body = h('div', { class: 'fund-sheet' }, h('p', { class: 'detail-text' }, idea.text), idea.by ? note(S.clubPanel.suggestedBy(idea.by)) : '', bar(idea.raised / idea.goal).el, h('div', { class: 'list' }, ...rows), failure);
    gift = 0;
    giftText = '';
    let close = (): void => undefined;
    if (idea.status === 'open') {
      if (!loadAccount()) {
        const join = async (name: string): Promise<string | null> => {
          try {
            await openAccount(name);
          } catch (error) {
            return describeError(error);
          }
          void syncScores(host.records());
          close();
          show();
          return null;
        };
        body.append(label(S.clubPanel.give), note(S.clubPanel.giftName), nameForm(loadPlayerName(), S.clubPanel.save, join, null));
      } else {
        body.append(label(S.clubPanel.give), ...giftControls(view, false, (amount) => void giveIdea(idea, amount, () => close(), (text) => failure.replaceChildren(note(text, true)))));
      }
    } else if (idea.status === 'funded') body.append(note(S.clubPanel.ideaFunded));
    else if (idea.status === 'building') body.append(note(S.clubPanel.state.building));
    withCoins(body);
    close = openSheet(host.layer, idea.title, body);
  }

  async function giveIdea(idea: Idea, amount: number, close: () => void, fail: (text: string) => void): Promise<void> {
    if (ideasBusy) return;
    ideasBusy = true;
    try {
      const answer = await giveToIdea(idea.id, amount);
      Fund.gave(career, answer.accepted);
      const titles = Careers.recordTitles(career);
      ideas = answer;
      gift = 0;
      giftText = '';
      host.changed();
      close();
      if (!closed) ideaThanks(answer.ideas.find((i) => i.id === idea.id) ?? idea, idea.raised, answer.accepted, titles);
    } catch (error) {
      fail(describeError(error));
    }
    ideasBusy = false;
    if (!closed) show();
  }

  /** After a gift: the amount and the bar gliding to where the idea stands now. */
  function ideaThanks(now: Idea, was: number, accepted: number, titles: TitleId[]): void {
    const raised = bar(now.raised / now.goal, was / now.goal);
    const done = h('button', { class: 'btn primary block', type: 'button' }, S.clubPanel.done);
    const body = h(
      'div',
      { class: 'fund-thanks' },
      h('div', { class: 'fund-thanks-badge', 'aria-hidden': 'true' }, icon(ICONS.check)),
      h('p', { class: 'fund-thanks-label' }, S.clubPanel.thanksFor),
      h('div', { class: 'fund-thanks-amount' }, cash(accepted)),
      h('div', { class: 'fund-thanks-project' }, h('div', { class: 'row-title' }, `${now.title}${now.status === 'funded' ? S.clubPanel.fundedBang : ''}`), raised.el, h('div', { class: 'row-sub' }, S.clubPanel.raised(cash(now.raised), cash(now.goal), null))),
      ...(titles.length > 0 ? [h('p', { class: 'fund-thanks-label' }, S.titles.earned(titles))] : []),
      done,
    );
    withCoins(body);
    const close = openSheet(host.layer, S.clubPanel.thanks, body);
    done.addEventListener('click', () => close());
    host.celebrate();
    raised.go();
  }

  /** The form for a new idea; it waits for a moderator before anyone sees it. */
  function suggestSheet(): void {
    let close = (): void => undefined;
    const body = h('div', { class: 'fund-sheet' });
    if (!loadAccount()) {
      const join = async (name: string): Promise<string | null> => {
        try {
          await openAccount(name);
        } catch (error) {
          return describeError(error);
        }
        void syncScores(host.records());
        close();
        suggestSheet();
        return null;
      };
      body.append(note(S.clubPanel.ideaName), nameForm(loadPlayerName(), S.clubPanel.save, join, null));
    } else {
      const text = h('textarea', { class: 'text-input text-area', rows: '5', maxlength: '500', placeholder: S.clubPanel.ideaPlaceholder, 'aria-label': S.clubPanel.ideaLabel });
      const failure = h('div');
      const send = h('button', { class: 'btn primary block', type: 'button', disabled: true }, S.clubPanel.send);
      text.addEventListener('input', () => (send.disabled = text.value.trim().length < 10));
      send.addEventListener('click', async () => {
        send.disabled = true;
        try {
          await suggestIdea(text.value);
          ideaSent = true;
          close();
          show();
        } catch (error) {
          failure.replaceChildren(note(describeError(error), true));
          send.disabled = false;
        }
      });
      body.append(note(S.clubPanel.ideaHow), text, failure, send);
    }
    close = openSheet(host.layer, S.clubPanel.suggest, body);
  }

  const stat = (name: string, value: string): HTMLElement => h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, name)), h('div', { class: 'row-value' }, value));

  /** The quick amounts, a field of one's own and "Give": how a gift to the fund or to an idea is picked. Nothing is given before "Give". */
  function giftControls(view: { minGift: number; maxGift: number }, busy: boolean, onGive: (amount: number) => void): HTMLElement[] {
    const offers = Fund.offers(career, view);
    const most = Math.min(view.maxGift, career.money);
    const input = h('input', { class: 'text-input', type: 'number', inputmode: 'numeric', min: String(view.minGift), max: String(most), step: '1', placeholder: S.clubPanel.ownAmount, 'aria-label': S.clubPanel.ownAmount });
    input.value = giftText;
    const send = h('button', { class: 'btn primary block', type: 'button' }, S.clubPanel.give);
    const quick = GIFTS.filter((g) => g >= view.minGift && g <= view.maxGift).map((amount) => {
      const button = h('button', { class: 'btn', type: 'button', disabled: !offers.includes(amount) || busy }, S.casino.stakeShort(amount));
      button.addEventListener('click', () => {
        gift = amount;
        giftText = input.value = '';
        pick();
      });
      return { amount, button };
    });
    const pick = (): void => {
      for (const { amount, button } of quick) {
        const on = giftText === '' && gift === amount;
        button.classList.toggle('primary', on);
        button.setAttribute('aria-pressed', String(on));
      }
      const ready = Number.isInteger(gift) && gift >= view.minGift && gift <= most;
      send.disabled = busy || !ready;
      send.textContent = ready ? S.clubPanel.giveAmount(cash(gift)) : S.clubPanel.give;
      withCoins(send);
    };
    input.addEventListener('input', () => {
      giftText = input.value;
      gift = giftText === '' ? 0 : Number(giftText);
      pick();
    });
    send.addEventListener('click', () => onGive(gift));
    pick();
    return [h('div', { class: 'club-gifts' }, ...quick.map((q) => q.button)), input, send];
  }

  body.replaceChildren(tabs.el, content);
  show();
  return {
    el: body,
    dispose: () => {
      closed = true;
      stopTimer();
    },
  };
}
