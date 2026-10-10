import { h } from './dom';
import { nameForm, openAccount, tabsControl } from './leaderboardSheet';
import { fadeIn, glideHeight, openSheet } from './sheets';
import { baseConfig } from '../core/config';
import type { Career } from '../core/career';
import { Auction, type AuctionEvent, type AuctionRun, type Lot } from '../core/auction';
import { CONTRACT_GOALS, Contracts, type ContractGoal } from '../core/contracts';
import { Fund, GIFTS, type FundView } from '../core/fund';
import { cosmetic } from '../core/loot';
import { fetchFund, fundEnabled, giveToFund } from '../net/fund';
import { describeError, loadAccount, syncScores, type Records } from '../net/leaderboard';
import { loadPlayerName } from '../storage/profile';
import { Fmt, S } from '../present/strings';
import { money, percent } from '../present/format';
import { Details, type DetailArt } from '../present/detail';
import { MONEY_MARK } from '../present/icons';
import type { SoundID } from '../present/feedback';
import { RenderList } from '../present/render';
import { CanvasDrawer } from '../present/draw';
import { v } from '../core/vec2';

/**
 * The Club (Leo, 10.10.2026): three sinks for big balances in one drawer with tabs, opened from its card in
 * the Shop. The Auction House (`core/auction.ts`), the City Fund (`core/fund.ts`, the service) and Contracts
 * (`core/contracts.ts`). Money only buys looks, thanks and a chance at a payout for skill: never an edge on the road.
 */

export interface ClubHost {
  career(): Career;
  today(): number;
  /** How many cars the next career shift has: a contract's goals are counted from it. */
  shiftCars(): number;
  /** The records as the save has them now, sent right after a name is chosen. */
  records(): Records;
  /** The career changed (a lot begun or won, a gift, a contract): write the save. */
  changed(): void;
  notice(text: string): void;
  celebrate(): void;
  sound?(id: SoundID, pitch?: number): void;
  closed(): void;
}

type ClubTab = 'auction' | 'fund' | 'contracts';
const TABS: { id: ClubTab; label: string }[] = [
  { id: 'auction', label: 'Auction' },
  { id: 'fund', label: 'City Fund' },
  { id: 'contracts', label: 'Contracts' },
];
let lastTab: ClubTab = 'auction';

const label = (text: string): HTMLElement => h('p', { class: 'section-note board-label' }, text);
const note = (text: string, error = false): HTMLElement => h('p', { class: `field-help${error ? ' error' : ''}`, ...(error ? { role: 'alert' } : {}) }, text);
const cash = (n: number): string => money(Fmt.number(n));
const row = (title: string, sub: string, ...end: HTMLElement[]): HTMLElement =>
  h('div', { class: 'row' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, title), h('div', { class: 'row-sub' }, sub)), ...end);

/** A lot's picture, drawn with the game's own art like the Shop's: the car in its paint, the map as its little city, the chest. */
function swatch(lot: Lot): HTMLElement {
  const size = 56;
  const canvas = h('canvas', { class: 'club-art', width: size * 2, height: size * 2, 'aria-hidden': 'true' });
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const drawer = new CanvasDrawer(canvas);
  drawer.resize(size, size, 2);
  const list = new RenderList({ viewport: v(size, size), center: v(0, 0), focus: v(size / 2, size / 2), scale: 1 }, 'card');
  const art: DetailArt = lot.k === 'chest' ? { k: 'chest', kind: lot.chest } : { k: 'item', id: lot.id, owned: true };
  Details.drawArt(list, art, v(size / 2, size / 2), size, baseConfig);
  drawer.draw(list);
  return canvas;
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
      if (i > 0) nodes.push(h('span', { class: 'coin', 'aria-label': 'money' }));
      if (part) nodes.push(part);
    });
    text.replaceWith(...nodes);
  }
}

const lotName = (lot: Lot): string => (lot.k === 'chest' ? S.shop.chest(lot.chest) : S.shop.item(lot.id));
function lotKind(lot: Lot): string {
  if (lot.k === 'chest') return 'A sealed chest';
  const item = cosmetic(lot.id);
  if (!item) return '';
  return item.source.kind === 'auction' ? 'Auction House exclusive' : S.shop.kind(item);
}

export function clubSheet(layer: HTMLElement, host: ClubHost): () => void {
  const career = host.career();
  const balance = h('p', { class: 'section-note club-balance', 'aria-live': 'polite' });
  const body = h('div', { class: 'club' });
  const content = h('div', { class: 'club-content' });
  let tab: ClubTab = lastTab;
  let closed = false;
  /** The auction under way, in memory only (`core/auction.ts`). */
  let run: AuctionRun | null = null;
  /** What the auction shows while the collectors answer one by one: the bidding as it unfolds. */
  let shown: { price: number; leader: AuctionRun['leader']; log: string[]; busy: boolean } = { price: 0, leader: null, log: [], busy: false };
  let fund: FundView | null = null;
  let fundError: string | null = null;
  let fundBusy = false;
  let contractGoal: ContractGoal = 'clean';
  let contractStake = baseConfig.contractStakes[1];

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
    if (timerBarEl) timerBarEl.style.width = `${pct}%`;
    if (timerDigitsEl) timerDigitsEl.textContent = `${remainingSeconds.toFixed(1)}s`;
    if (timerStageEl) {
      if (remainingSeconds > 4.5) timerStageEl.textContent = 'Bidding open · Make your offer';
      else if (remainingSeconds > 2.0) timerStageEl.textContent = 'Going once... 🔨';
      else if (remainingSeconds > 0) timerStageEl.textContent = 'Going twice! Final warning! 🔨🔨';
      else timerStageEl.textContent = 'HAMMER FALLS! 🔨🔨🔨';
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
      shown.log.push(`🔨 Time expired! The hammer falls: Sold to ${winningBot.name} for ${cash(run.price)}.`);
      host.sound?.('shiftFailed');
    } else {
      shown.log.push('🔨 Time expired! No opening bids were placed. The lot has been withdrawn.');
      host.sound?.('denied');
    }
    host.changed();
    show();
  }

  const tabs = tabsControl('Club', TABS, (next) => {
    tab = next;
    lastTab = next;
    if (tab !== 'auction') {
      stopTimer();
    } else if (run && run.phase === 'bidding' && !shown.busy) {
      startTimer(remainingSeconds > 0 ? remainingSeconds : AUCTION_TIMER_SECONDS);
    }
    show();
  });
  tabs.el.classList.add('sheet-tabs');

  function show(): void {
    tabs.set(tab);
    balance.textContent = `Your money · ${cash(career.money)}`;
    withCoins(balance);
    const rows = { auction: auctionRows, fund: fundRows, contracts: contractRows }[tab]();
    content.replaceChildren(...rows);
    withCoins(content);
    fadeIn(content);
    if (tab === 'fund' && !fund && !fundBusy && !fundError && fundEnabled) void loadFund();
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
      const button = h('button', { class: `btn${can ? ' primary' : ''}`, type: 'button', disabled: !can, 'aria-label': `Bid on ${lotName(lot)}` }, can ? 'Enter Auction' : career.auctionTaken.includes(slot) ? 'Tried' : 'Owned');
      button.addEventListener('click', () => begin(slot));
      return h('div', { class: 'row' }, swatch(lot), h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, lotName(lot)), h('div', { class: 'row-sub' }, `${lotKind(lot)} · estimate ${cash(Auction.estimate(lot))}`)), button);
    });
    const [sharkLo, sharkHi] = baseConfig.auctionShark;
    const [pennyLo, pennyHi] = baseConfig.auctionPenny;
    const out: HTMLElement[] = [
      label("Today's lots"),
      h('div', { class: 'list' }, ...rows),
      note(
        `The collectors in the room are computer-controlled. ${Math.round(baseConfig.auctionSharkShare * 10)} in 10 are sharks who keep bidding up to ${sharkLo} to ${sharkHi} times the estimate; the rest stop at ${pennyLo} to ${pennyHi} times. ` +
          `The bidding opens at ${percent(baseConfig.auctionStartShare)} of the estimate. Each round has a countdown timer — counter-bid before the hammer falls! When the hammer falls on your bid you pay it plus a ${percent(baseConfig.auctionPremium)} buyer's premium. ` +
          'Walking away costs nothing, but the lot is gone for today. A new set tomorrow.',
      ),
    ];
    if (career.auctionWins > 0) out.push(note(`Lots won · ${career.auctionWins}   Spent · ${cash(career.auctionSpent)}`));
    return out;
  }

  function begin(slot: number): void {
    const started = Auction.begin(career, slot, host.today());
    host.changed();
    if (!started) return show();
    run = started;
    shown = { price: 0, leader: null, log: [`${started.bots.length} collectors take their seats for ${lotName(started.lot)}.`], busy: false };
    show();
    startTimer(AUCTION_TIMER_SECONDS);
  }

  function auctionRoom(now: AuctionRun): HTMLElement[] {
    const leader = shown.leader === 'you' ? 'You' : typeof shown.leader === 'number' ? now.bots[shown.leader].name : null;

    // Status Banner: Crystal clear explanation of current state for new players
    const banner = h('div', { class: 'auction-status-banner' });
    if (now.phase === 'won') {
      banner.classList.add('won');
      banner.append(
        h('span', { class: 'auction-status-badge' }, '🏆 AUCTION WON'),
        h('div', { class: 'auction-status-title' }, `Sold to you: ${lotName(now.lot)}`),
        h('div', { class: 'auction-status-desc' }, `Hammer fell at ${cash(now.price)}. Total paid with premium: ${cash(now.paid)}. Item is in your garage!`),
      );
    } else if (now.phase === 'lost') {
      banner.classList.add('outbid');
      const soldTo = typeof now.leader === 'number' ? now.bots[now.leader].name : null;
      banner.append(
        h('span', { class: 'auction-status-badge' }, 'AUCTION CLOSED'),
        h('div', { class: 'auction-status-title' }, soldTo ? `Sold to ${soldTo}` : 'Lot Withdrawn'),
        h('div', { class: 'auction-status-desc' }, soldTo ? `Winning bid: ${cash(now.price)}. You can try again tomorrow with fresh lots.` : 'No bids placed within the time limit. Lot withdrawn for today.'),
      );
    } else if (shown.leader === 'you') {
      banner.classList.add('lead');
      banner.append(
        h('span', { class: 'auction-status-badge' }, '⭐ YOU HOLD THE LEAD'),
        h('div', { class: 'auction-status-title' }, `Current highest bid: ${cash(shown.price)}`),
        h('div', { class: 'auction-status-desc' }, 'You hold the floor! If no collector counters before the hammer strikes three times, you win this lot.'),
      );
    } else if (typeof shown.leader === 'number') {
      banner.classList.add('outbid');
      banner.append(
        h('span', { class: 'auction-status-badge' }, '⚠️ YOU ARE OUTBID'),
        h('div', { class: 'auction-status-title' }, `${now.bots[shown.leader].name} leads with ${cash(shown.price)}`),
        h('div', { class: 'auction-status-desc' }, 'Place a higher bid before the countdown timer expires to stay in the auction!'),
      );
    } else {
      banner.classList.add('open');
      banner.append(
        h('span', { class: 'auction-status-badge' }, '📢 OPENING BID REQUIRED'),
        h('div', { class: 'auction-status-title' }, `Floor opens at ${cash(now.start)}`),
        h('div', { class: 'auction-status-desc' }, 'Select a bid below before time runs out to open the auction and claim the first lead.'),
      );
    }

    // Lot card and Current Price
    const lot = h('div', { class: 'row' }, swatch(now.lot), h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, lotName(now.lot)), h('div', { class: 'row-sub' }, `${lotKind(now.lot)} · estimate ${cash(now.estimate)}`)));
    const bid = h(
      'div',
      { class: 'row' },
      h(
        'div',
        { class: 'row-main' },
        h('div', { class: 'row-sub' }, shown.price === 0 ? 'Opening minimum' : 'Highest bid so far'),
        h('div', { class: 'club-price' }, cash(shown.price === 0 ? now.start : shown.price)),
        h('div', { class: 'row-sub' }, leader ? `${leader} leads` : 'No bid yet'),
      ),
    );

    // Countdown Timer widget (while bidding is active)
    let timerEl: HTMLElement | null = null;
    if (now.phase === 'bidding') {
      timerContainerEl = h('div', { class: 'auction-timer' });
      timerStageEl = h('span', { class: 'auction-timer-stage' }, 'Bidding open · Make your offer');
      timerDigitsEl = h('span', { class: 'auction-timer-digits' }, `${remainingSeconds.toFixed(1)}s`);
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
    const botsLabel = h('div', { class: 'section-note', style: 'margin: var(--s2) 0 var(--s1);' }, `Collectors in room (${activeBots} active):`);
    const bots = h(
      'div',
      { class: 'club-bots', role: 'list', 'aria-label': 'Collectors' },
      ...now.bots.map((bot, i) => {
        const isLeader = shown.leader === i;
        const isOut = bot.out;
        const cls = `club-bot${isOut ? ' out' : isLeader ? ' leader' : ''}`;
        const text = isOut ? `${bot.name} · Out` : isLeader ? `👑 ${bot.name} · Leading` : `${bot.name} · In`;
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
      const sold = typeof now.leader === 'number' ? `Sold to ${now.bots[now.leader].name} for ${cash(now.price)}.` : 'Lot withdrawn without bids.';
      out.push(
        h('div', { class: 'list' }, row(won ? `Sold to you · ${lotName(now.lot)}` : 'Auction concluded', won ? `Hammer ${cash(now.price)} + premium ${cash(now.paid - now.price)} = ${cash(now.paid)}` : sold)),
        h('button', { class: 'btn primary block', type: 'button', onclick: () => { run = null; show(); } }, 'Back to the lots'),
      );
      return out;
    }

    // Phase: Bidding
    const min = Auction.minBid(now);
    const step = now.step;
    const tiers = [
      { n: 0, tag: 'Min Bid · +1 Step', cls: 'min' },
      { n: 2, tag: 'Raise · +3 Steps', cls: 'raise' },
      { n: 5, tag: 'Power Bid · +6 Steps', cls: 'jump' },
    ];

    if (shown.leader === 'you') {
      // Player is currently winning
      out.push(
        h('div', { class: 'list' },
          row('You hold the winning bid', 'Wait for collectors to counter-bid or the hammer to fall.')
        ),
        h('button', { class: 'btn block', type: 'button', disabled: shown.busy, onclick: () => leave(now) }, 'Walk away (Concede lot)')
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
            'aria-label': `Bid ${Fmt.number(amount)}`,
          },
          canAfford ? `Bid ${cash(amount)}` : 'Too costly',
        );
        button.addEventListener('click', () => bidOn(now, amount));

        const titleEl = h('div', { class: 'row-title' },
          h('span', { class: `auction-offer-tag ${cls}` }, tag),
          cash(amount),
        );
        const subText = `${cash(cost)} with 10% premium${canAfford ? '' : ' · (Not enough money)'}`;
        return h('div', { class: 'row' },
          h('div', { class: 'row-main' }, titleEl, h('div', { class: 'row-sub' }, subText)),
          button,
        );
      });

      if (career.money < Auction.cost(min)) {
        offerRows.push(row('Not enough money', `The minimum bid costs ${cash(Auction.cost(min))} with the 10% buyer's premium.`));
      }

      out.push(
        h('div', { class: 'list' }, ...offerRows),
        h('button', { class: 'btn block', type: 'button', disabled: shown.busy, onclick: () => leave(now) }, 'Walk away'),
      );
    }

    // Helpful beginner guide box
    out.push(
      h(
        'div',
        { class: 'auction-guide-box' },
        h('strong', {}, '💡 How Bidding Works: '),
        'Place a bid before the 10s timer expires. Collectors will either raise or drop out. Hold the lead through three hammer strikes to win! The 10% buyer fee is only paid if you win.',
      ),
    );

    return out;
  }

  function leave(now: AuctionRun): void {
    stopTimer();
    Auction.walk(now);
    shown.log.push(typeof now.leader === 'number' ? `You walked away. ${now.bots[now.leader].name} takes it at ${cash(now.price)}.` : 'You walked away.');
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
    shown.log.push(`You bid ${cash(amount)}!`);
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
        shown.log.push(`${now.bots[event.bot].name} drops out.`);
        host.sound?.('uiTick', 0.9);
        show();
        window.setTimeout(() => step(later), reduce ? 0 : 550);
      } else if (event.k === 'counter') {
        shown.price = event.price;
        shown.leader = event.bot;
        shown.log.push(`${now.bots[event.bot].name} counter-bids ${cash(event.price)}!`);
        host.sound?.('toll', 1.0);
        show();
        window.setTimeout(() => step(later), reduce ? 0 : 750);
      } else {
        // Hammer sequence: dramatic 3-strike countdown
        const winPrice = event.price;
        shown.log.push('No collectors counter your bid...');
        show();
        window.setTimeout(() => {
          if (closed) return;
          shown.log.push(`Going once at ${cash(winPrice)}... 🔨`);
          host.sound?.('uiTick', 1.1);
          show();
          window.setTimeout(() => {
            if (closed) return;
            shown.log.push('Going twice! Fair warning... 🔨🔨');
            host.sound?.('uiTick', 1.3);
            show();
            window.setTimeout(() => {
              if (closed) return;
              shown.log.push(`SOLD! The hammer falls at ${cash(winPrice)} to you! 🔨🔨🔨`);
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

  // MARK: City Fund

  async function loadFund(): Promise<void> {
    fundBusy = true;
    try {
      fund = await fetchFund();
      claim(fund);
    } catch (error) {
      fundError = describeError(error);
    }
    fundBusy = false;
    if (!closed && tab === 'fund') show();
  }

  /** The skins of projects that are built, for whoever gave enough to them. */
  function claim(view: FundView): void {
    const ids = Fund.claim(career, view);
    if (ids.length === 0) return;
    host.changed();
    for (const id of ids) host.notice(`THANK YOU · the ${S.club.projectName(id)} is built · ${S.shop.item(id)} is yours`);
    host.celebrate();
  }

  function fundRows(): HTMLElement[] {
    if (!fundEnabled) return [note('The City Fund needs the online service, which this copy of the game is not connected to.')];
    if (fundError) {
      return [
        note(fundError, true),
        h('button', { class: 'btn block', type: 'button', onclick: () => { fundError = null; show(); } }, 'Try again'),
      ];
    }
    if (!fund) return [note('Loading the city…')];
    const view = fund;
    const projects = view.projects.map((p) => {
      const skin = Fund.skinOf(p.id);
      const state = p.done ? 'Built' : p.active ? 'Being built' : 'Waiting';
      const fill = h('span', { class: 'club-bar-fill' });
      fill.style.width = `${Math.round((p.raised / p.goal) * 100)}%`;
      const thanks = skin ? (career.collection.includes(skin.id) ? `You have the ${S.shop.item(skin.id)} skin.` : `Give ${cash(baseConfig.fundBenefactor)} or more and the ${S.shop.item(skin.id)} skin is yours when it is built.`) : '';
      return h(
        'div',
        { class: 'row' },
        h(
          'div',
          { class: 'row-main' },
          h('div', { class: 'row-title' }, `${S.club.projectName(p.id)} · ${state}`),
          h('span', { class: 'club-bar', 'aria-hidden': 'true' }, fill),
          h('div', { class: 'row-sub' }, `${cash(p.raised)} of ${cash(p.goal)}${p.mine > 0 ? ` · you gave ${cash(p.mine)}` : ''}`),
          h('div', { class: 'row-sub' }, thanks),
        ),
      );
    });
    const out: HTMLElement[] = [
      note('Everyone builds one city. Gifts go to the project being built, from all players together; money given does not come back.'),
      label('Projects'),
      h('div', { class: 'list' }, ...projects),
    ];
    if (!loadAccount()) {
      const join = async (name: string): Promise<string | null> => {
        try {
          await openAccount(name);
        } catch (error) {
          return describeError(error);
        }
        void syncScores(host.records());
        fund = null;
        show();
        return null;
      };
      out.push(label('Give'), note('Gifts carry your name on the leaderboard. Pick one to give.'), nameForm(loadPlayerName(), 'Save', join, null));
    } else if (view.projects.every((p) => p.done)) {
      out.push(note('Everything is built. Thank you.'));
    } else {
      const offers = Fund.offers(career, view);
      const gifts = GIFTS.filter((g) => g >= view.minGift && g <= view.maxGift).map((amount) => {
        const button = h('button', { class: 'btn', type: 'button', disabled: !offers.includes(amount) || fundBusy }, S.casino.stakeShort(amount));
        button.addEventListener('click', () => void give(amount));
        return button;
      });
      out.push(label('Give'), h('div', { class: 'club-gifts' }, ...gifts));
    }
    if (view.top.length > 0) out.push(label('Most generous'), h('div', { class: 'list' }, ...view.top.map((t, i) => row(`${i + 1}. ${t.name}`, cash(t.amount)))));
    return out;
  }

  async function give(amount: number): Promise<void> {
    if (fundBusy) return;
    fundBusy = true;
    show();
    try {
      const answer = await giveToFund(amount);
      Fund.gave(career, answer.accepted);
      fund = answer;
      host.changed();
      host.notice(`GIVEN · ${cash(answer.accepted)} to the City Fund`);
      claim(answer);
    } catch (error) {
      fundError = describeError(error);
    }
    fundBusy = false;
    if (!closed) show();
  }

  // MARK: Contracts

  function contractRows(): HTMLElement[] {
    const cars = host.shiftCars();
    const current = career.contract;
    if (current) {
      const cancel = h('button', { class: 'btn', type: 'button' }, 'Tear it up');
      cancel.addEventListener('click', () => {
        Contracts.cancel(career);
        host.changed();
        show();
      });
      return [
        label('Your contract'),
        h('div', { class: 'list' }, row(`${S.club.goalName(current.goal)} · ${cash(current.stake)}`, `${S.club.goalText(current.goal, cars)} Pays ${cash(Math.round(current.stake * Contracts.pay(current.goal)))} if it is met.`, cancel)),
        note('It is settled by your next career shift (not the Daily, Unlimited or a trial) and shows on its result. Tearing it up before then gives the whole stake back. A shift eased for your career voids it, stake back.'),
      ];
    }
    const goals = CONTRACT_GOALS.map((goal) => {
      const button = h('button', { class: `btn${goal === contractGoal ? ' primary' : ''}`, type: 'button', 'aria-pressed': String(goal === contractGoal) }, goal === contractGoal ? 'Chosen' : 'Choose');
      button.addEventListener('click', () => {
        contractGoal = goal;
        show();
      });
      return row(`${S.club.goalName(goal)} · pays ×${Contracts.pay(goal)}`, S.club.goalText(goal, cars), button);
    });
    const stakes = baseConfig.contractStakes.map((stake) => {
      const button = h('button', { class: `btn${stake === contractStake ? ' primary' : ''}`, type: 'button', disabled: stake > career.money, 'aria-pressed': String(stake === contractStake) }, S.casino.stakeShort(stake));
      button.addEventListener('click', () => {
        contractStake = stake;
        show();
      });
      return button;
    });
    const sign = h('button', { class: 'btn primary block', type: 'button', disabled: !Contracts.canSign(career, contractStake) }, `Sign · ${cash(contractStake)} on ${S.club.goalName(contractGoal)}`);
    sign.addEventListener('click', () => {
      if (!Contracts.sign(career, contractGoal, contractStake)) return;
      host.changed();
      host.notice(`CONTRACT SIGNED · ${S.club.goalName(contractGoal)} · ${cash(contractStake)}`);
      show();
    });
    return [
      note('Put money on yourself. The stake is paid now; if your next career shift meets the goal it pays back a multiple of it, otherwise it is gone. The goals are the same for everyone: choose what you can do.'),
      label('Goal'),
      h('div', { class: 'list' }, ...goals),
      label('Stake'),
      h('div', { class: 'club-gifts' }, ...stakes),
      sign,
    ];
  }

  body.replaceChildren(balance, tabs.el, content);
  show();
  const close = openSheet(layer, 'Club', body, () => {
    closed = true;
    stopTimer();
    host.closed();
  });
  glideHeight(body, content);
  return close;
}
