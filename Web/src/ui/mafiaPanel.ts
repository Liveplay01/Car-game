import './mafia.css';
import { h, animatedIcon, coinMark } from './dom';
import { baseConfig } from '../core/config';
import type { Career } from '../core/career';
import { DAY_MS, Mafia, type Grade, type Loan, type LoanEvent, type Table } from '../core/mafia';
import { Fmt, S } from '../present/strings';
import type { HapticID, SoundID } from '../present/feedback';
import { currentLanguage } from '../present/i18n';

/**
 * The Mafia (Social → Mafia, Leo, 11.10.2026): the Family lends money against a deal struck on a bar. A pointer sweeps across it, faster
 * the bigger the loan; a tap stops it, and inside the green zone (the middle of it best) the deal gets kinder. The ledger counts the
 * days down in real time, gets louder as the day comes (calm, warm, hot, late) and lists what a late loan costs. The rules are in `core/mafia.ts`.
 */

export interface MafiaHost {
  career(): Career;
  /** The career changed (a loan, a payment, a loan turning late): write the save. */
  changed(): void;
  notice(text: string): void;
  celebrate(): void;
  reduceMotion(): boolean;
  /** Battery saver: the room keeps its colours but loses the smoke, the grain and the siren light. */
  lite(): boolean;
  sound?(id: SoundID, pitch?: number): void;
  feel?(id: HapticID): void;
}

export interface MafiaPanel {
  el: HTMLElement;
  /** The page is left: the clock, the pointer and every pending effect stop. */
  dispose(): void;
}

/** The steady hand stays chosen while the page is left and came back to. */
let assist = false;
const TRAIL = 5;

type Mood = 'calm' | 'warm' | 'hot' | 'late';

const dateOf = (ms: number): string => new Date(ms).toLocaleString(currentLanguage(), { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** How loud the ledger is: calm until half the time is gone, warm after, hot in the last day, late once the day has passed. */
function moodOf(loan: Loan, now: number): Mood {
  if (loan.late) return 'late';
  const left = loan.due - Math.max(now, loan.seen);
  if (left < DAY_MS) return 'hot';
  return left < (loan.due - loan.taken) / 2 ? 'warm' : 'calm';
}

interface Cash {
  el: HTMLElement;
  set(n: number): void;
  /** Counts to `n`: a sum that changes is never a jump. */
  tween(n: number, ms: number): void;
}

/** A number with the coin after it, whose text can change without building the nodes again. */
function cash(n: number): Cash {
  const text = document.createTextNode(Fmt.number(n));
  let shown = n;
  let raf = 0;
  const put = (x: number): void => {
    shown = x;
    text.nodeValue = Fmt.number(Math.round(x));
  };
  return {
    el: h('span', { class: 'cash' }, text, coinMark(S.clubPanel.money)),
    set(x) {
      cancelAnimationFrame(raf);
      put(x);
    },
    tween(to, ms) {
      cancelAnimationFrame(raf);
      const from = shown;
      const t0 = performance.now();
      const step = (now: number): void => {
        const k = Math.min(1, (now - t0) / ms);
        put(from + (to - from) * (1 - (1 - k) ** 3));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    },
  };
}

export function mafiaPanel(host: MafiaHost): MafiaPanel {
  const career = host.career();
  const root = h('div', { class: 'mafia' });
  const body = h('div', { class: 'mafia-body' });
  // The room: a lamp, light through the blinds, smoke, grain and a siren that only the late loan switches on. Built once, so nothing restarts.
  const ambience = h(
    'div',
    { class: 'mafia-ambience', 'aria-hidden': 'true' },
    ...['lamp', 'blinds', 'smoke s1', 'smoke s2', 'smoke s3', 'vig', 'grain', 'siren'].map((name) => h('i', { class: name })),
  );
  root.append(ambience, body);
  root.classList.toggle('lite', host.lite());
  const amounts = Mafia.amounts(career);
  let amount = amounts[Math.min(1, amounts.length - 1)];
  let phase: 'idle' | 'table' | 'struck' = 'idle';
  let table: Table | null = null;
  let start = 0;
  let frame = 0;
  let needle: HTMLElement | null = null;
  let ghosts: HTMLElement[] = [];
  let history: number[] = [];
  let lastAt = 0;
  let lastDir = 0;
  let struck: { grade: Grade; loan: Loan } | null = null;
  let justStruck = false;
  let closed = false;
  let settling = false;
  let lettersShown = 0;
  let seenLetters: number | null = null;
  let lastView = '';
  let enterTimer = 0;
  let update: ((now: number) => void) | null = null;
  const timers = new Set<number>();

  const still = (): boolean => host.reduceMotion();

  function later(fn: () => void, ms: number): number {
    const id = window.setTimeout(() => {
      timers.delete(id);
      if (!closed) fn();
    }, ms);
    timers.add(id);
    return id;
  }

  const clock = window.setInterval(() => {
    if (closed || settling) return;
    const now = Date.now();
    const event = Mafia.sync(career, now);
    if (event) return happened(event);
    if (phase !== 'struck' && career.loan && Mafia.arrived(career.loan, now).length !== lettersShown) return show();
    update?.(now);
  }, 1000);

  /** The clock turned the loan late, or the Family gave up on it: the room shows it at once. */
  function happened(event: LoanEvent): void {
    host.changed();
    host.feel?.('seized');
    if (event === 'late') {
      host.sound?.('alarm', 1);
      show();
      root.classList.add('shock');
      later(() => root.classList.remove('shock'), 900);
    } else {
      host.sound?.('seized', 1);
      show();
    }
  }

  function stopFrame(): void {
    window.cancelAnimationFrame(frame);
    frame = 0;
  }

  function sweep(): void {
    if (closed || phase !== 'table' || !table || !needle) return;
    const at = Mafia.pointer(table, performance.now() - start);
    needle.style.left = `${at * 100}%`;
    history.push(at);
    if (history.length > TRAIL * 2 + 2) history.shift();
    ghosts.forEach((ghost, i) => {
      const past = history[history.length - 1 - (i + 1) * 2];
      ghost.style.opacity = past === undefined ? '0' : '';
      if (past !== undefined) ghost.style.left = `${past * 100}%`;
    });
    // The pointer ticks where it turns, like a clock that is counting down for you.
    const dir = Math.sign(at - lastAt);
    if (dir !== 0) {
      if (lastDir !== 0 && dir !== lastDir) host.sound?.('uiTick', 0.7);
      lastDir = dir;
    }
    lastAt = at;
    frame = window.requestAnimationFrame(sweep);
  }

  // MARK: Effects

  /** A burst on the card's own layer: coins that rise and fall, sparks, or smoke. `at` is how far along `from` it starts. */
  function bits(card: HTMLElement, from: Element, kind: 'coin' | 'spark' | 'smoke', count: number, at = 0.5): void {
    const layer = card.querySelector('.mafia-fx');
    if (still() || !layer) return;
    const c = card.getBoundingClientRect();
    const r = from.getBoundingClientRect();
    const x = r.left - c.left + r.width * at;
    const y = r.top - c.top + r.height / 2;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const power = 50 + Math.random() * 120;
      const bit = h('span', { class: `mafia-bit ${kind}` });
      bit.style.left = `${x}px`;
      bit.style.top = `${y}px`;
      bit.style.setProperty('--dx', `${Math.cos(angle) * power}px`);
      bit.style.setProperty('--uy', `${-(kind === 'smoke' ? 12 : 50 + Math.random() * 90)}px`);
      bit.style.setProperty('--dy', `${kind === 'coin' ? 120 + Math.random() * 90 : kind === 'smoke' ? 70 : Math.sin(angle) * power * 0.5 + 30}px`);
      bit.style.setProperty('--r', `${(Math.random() - 0.5) * 540}deg`);
      bit.style.setProperty('--t', `${700 + Math.random() * 500}ms`);
      bit.style.animationDelay = `${Math.random() * 120}ms`;
      bit.addEventListener('animationend', () => bit.remove());
      layer.append(bit);
    }
  }

  /** The stop lands: a flash over the bar and what the grade deserves (a coin shower, a ripple, smoke). */
  function impact(card: HTMLElement, grade: Grade, position: number): void {
    const track = card.querySelector('.mafia-track');
    if (!track) return;
    track.append(h('span', { class: `mafia-flash ${grade}` }));
    if (grade === 'perfect') {
      bits(card, track, 'coin', 20, position);
      bits(card, track, 'spark', 16, position);
    } else if (grade === 'good') {
      const ring = h('span', { class: 'mafia-ring' });
      ring.style.left = `${position * 100}%`;
      track.append(ring);
      bits(card, track, 'spark', 10, position);
    } else bits(card, track, 'smoke', 9, position);
  }

  // MARK: Pieces

  function header(): HTMLElement {
    return h(
      'div',
      { class: 'mafia-card don' },
      h('span', { class: 'mafia-crest' }, animatedIcon('fedora')),
      h('div', { class: 'mafia-head' }, h('h2', { class: 'mafia-title' }, S.mafia.title), h('p', { class: 'mafia-tagline' }, S.mafia.tagline)),
    );
  }

  const layer = (): HTMLElement => h('div', { class: 'mafia-fx', 'aria-hidden': 'true' });

  /** The bar: the zone (its middle marked) and the needle where `at` is (0–1), or moving with its trail while the table is set. */
  function bar(t: Table, at: number, live: boolean, grade: Grade | null): HTMLElement {
    const core = h('span', { class: 'mafia-core' });
    core.style.width = `${baseConfig.mafiaPerfect * 100}%`;
    const zone = h('span', { class: `mafia-zone${grade !== null && grade !== 'miss' ? ' hit' : ''}` }, core);
    zone.style.left = `${t.zone.from * 100}%`;
    zone.style.width = `${(t.zone.to - t.zone.from) * 100}%`;
    const pointer = h('span', { class: `mafia-needle${grade === 'miss' ? ' miss' : ''}` });
    pointer.style.left = `${at * 100}%`;
    const trail = live ? Array.from({ length: TRAIL }, (_, i) => h('span', { class: `mafia-ghost g${i + 1}` })) : [];
    if (live) {
      needle = pointer;
      ghosts = trail;
    }
    return h('div', { class: `mafia-track${live ? ' live' : ''}`, 'aria-hidden': 'true' }, zone, ...trail, pointer);
  }

  function chips(): HTMLElement {
    const row = h('div', { class: 'mafia-chips', role: 'radiogroup', 'aria-label': S.mafia.loanLabel });
    for (const value of amounts) {
      const on = value === amount;
      const chip = h('button', { class: `mafia-chip${on ? ' on' : ''}`, type: 'button', role: 'radio', 'aria-checked': String(on) }, cash(value).el);
      chip.addEventListener('click', () => {
        amount = value;
        host.sound?.('uiTick', 1);
        show();
      });
      row.append(chip);
    }
    return row;
  }

  // MARK: Idle, table, struck

  /** What the next loan repaid in time will be: the ladder, said out loud. Nothing once the best terms are reached. */
  function nextHint(): HTMLElement | null {
    const interest = Mafia.baseTerms(career).interest;
    const zone = Mafia.zoneWidth(career);
    const clean = career.cleanLoans + 1;
    const nextInterest = Math.max(baseConfig.mafiaInterestMin, baseConfig.mafiaInterest - clean * baseConfig.mafiaInterestPerClean);
    const nextZone = Math.min(baseConfig.mafiaZoneMax, baseConfig.mafiaZone + clean * baseConfig.mafiaZonePerClean);
    return nextInterest === interest && nextZone === zone ? null : h('p', { class: 'mafia-hint mafia-quote' }, S.mafia.nextStep(interest, nextInterest, zone, nextZone));
  }

  /** A steady hand for whoever cannot tap on time: a slower pointer, and no Perfect deal. */
  function assistToggle(): HTMLElement {
    const toggle = h('button', { class: `mafia-assist${assist ? ' on' : ''}`, type: 'button', role: 'switch', 'aria-checked': String(assist) }, h('b', {}, S.mafia.assist), h('span', {}, S.mafia.assistText));
    toggle.addEventListener('click', () => {
      assist = !assist;
      show();
    });
    return toggle;
  }

  function idleRows(): HTMLElement[] {
    if (career.mafiaBan > Date.now()) return [h('div', { class: 'mafia-card' }, layer(), h('p', { class: 'mafia-pitch' }, S.mafia.banned(dateOf(career.mafiaBan))))];
    const t = Mafia.table(career, amount, baseConfig, assist);
    const terms = Mafia.baseTerms(career);
    const level = Math.round((amounts.indexOf(amount) / Math.max(1, amounts.length - 1)) * (S.mafia.speeds.length - 1));
    const sit = h('button', { class: 'btn primary mafia-go pulse', type: 'button' }, S.mafia.set);
    sit.addEventListener('click', setTable);
    const speed = h('span', { class: 'mafia-speed', 'data-level': String(level) }, `${S.mafia.pointer(S.mafia.speeds[level])} `, ...[0, 1, 2].map(() => h('i', {}, animatedIcon('chevronRight'))));
    const meta = h('div', { class: 'mafia-meta' }, h('span', {}, S.mafia.zone(Mafia.zoneWidth(career), career.cleanLoans)), speed);
    return [h('div', { class: 'mafia-card' }, layer(), h('p', { class: 'mafia-pitch' }, S.mafia.pitch), chips(), bar(t, 0, false, null), meta, nextHint(), assistToggle(), h('div', { class: 'mafia-offer' }, h('span', {}, S.mafia.offer(terms.interest, terms.days)), sit))];
  }

  function setTable(): void {
    if (!Mafia.canBorrow(career, amount)) return host.notice(S.mafia.onlyOne);
    table = Mafia.table(career, amount, baseConfig, assist);
    phase = 'table';
    history = [];
    lastDir = 0;
    host.sound?.('chestCharge', 1);
    host.feel?.('wanted');
    show();
    start = performance.now();
  }

  function tableRows(): HTMLElement[] {
    const t = table;
    if (!t) return [];
    const share = (t.speed - baseConfig.mafiaSpeed.lo) / (baseConfig.mafiaSpeed.hi - baseConfig.mafiaSpeed.lo);
    const stop = h('button', { class: 'btn primary mafia-stop arming', type: 'button' }, S.mafia.stop);
    stop.style.setProperty('--arm', `${baseConfig.mafiaArmMs}ms`);
    later(() => stop.classList.remove('arming'), baseConfig.mafiaArmMs);
    const stage = h('div', { class: 'mafia-card stage tense', role: 'group', 'aria-label': S.mafia.tapToStop, 'data-noswipe': 'true' }, layer(), h('div', { class: 'mafia-waiting' }, S.mafia.waiting, h('i', {}, '.'), h('i', {}, '.'), h('i', {}, '.')), h('div', { class: 'mafia-amount' }, cash(t.amount).el), bar(t, 0, true, null), h('p', { class: 'mafia-hint' }, S.mafia.tapToStop), stop);
    stage.style.setProperty('--heat', share.toFixed(2));
    stage.style.setProperty('--beat', `${(1.2 - share * 0.6).toFixed(2)}s`);
    stage.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      strike(e.timeStamp);
    });
    // The keyboard (Space, Enter) clicks without a pointer: its click carries no position.
    stop.addEventListener('click', (e) => {
      if (e.detail === 0) strike(performance.now());
    });
    return [stage];
  }

  function strike(at: number): void {
    if (phase !== 'table' || !table || at - start < baseConfig.mafiaArmMs) return;
    const position = Mafia.pointer(table, at - start);
    const grade = Mafia.grade(table, position);
    const loan = Mafia.borrow(career, table.amount, grade, Date.now());
    stopFrame();
    if (!loan) {
      phase = 'idle';
      return show();
    }
    phase = 'struck';
    struck = { grade, loan };
    justStruck = true;
    seenLetters = null;
    host.changed();
    if (grade === 'perfect') {
      host.celebrate();
      host.sound?.('jackpot', 1);
    } else if (grade === 'good') {
      host.sound?.('paid', 1);
      host.feel?.('paid');
    } else {
      host.sound?.('crashHeavy', 1);
      host.feel?.('crash');
    }
    show(position);
  }

  function struckRows(position: number): HTMLElement[] {
    if (!struck || !table) return [];
    const { grade, loan } = struck;
    const done = h('button', { class: 'btn primary mafia-go', type: 'button' }, S.mafia.takeCash);
    done.addEventListener('click', () => {
      phase = 'idle';
      struck = null;
      table = null;
      show();
    });
    const lent = cash(still() ? loan.amount : 0);
    const owed = cash(still() ? loan.owed : 0);
    if (!still()) {
      lent.tween(loan.amount, 900);
      owed.tween(loan.owed, 1100);
    }
    const sums = h('div', { class: 'mafia-sums' }, h('div', {}, h('span', {}, S.mafia.lent), lent.el), h('div', {}, h('span', {}, S.mafia.owed), owed.el), h('div', {}, h('span', {}, S.mafia.due), h('b', {}, dateOf(loan.due))));
    return [h('div', { class: `mafia-card stage result ${grade}` }, layer(), h('div', { class: 'mafia-grade' }, S.mafia.grade(grade)), bar(table, position, false, grade), h('p', { class: 'mafia-hint mafia-quote' }, S.mafia.gradeText(grade)), sums, done)];
  }

  // MARK: The ledger

  function ledgerRows(loan: Loan): HTMLElement[] {
    const debt = cash(still() ? Mafia.debt(career, Date.now()) : 0);
    if (!still()) debt.tween(Mafia.debt(career, Date.now()), 900);
    const paid = cash(loan.paid);
    const countdown = h('span', { class: 'mafia-countdown' });
    const fill = h('span', { class: 'mafia-clock-fill' });
    const stamp = h('span', { class: 'mafia-stamp' }, S.mafia.late);
    const shifts = h('p', { class: 'mafia-hint' });
    const shiftPay = baseConfig.shiftPayBase + baseConfig.shiftPayPerLevel * career.level;
    const alert = h('div', { class: 'mafia-alert', role: 'alert' }, h('b', {}, S.mafia.overdue), h('span', {}, S.mafia.overdueText));
    const stakeLabel = h('span', { class: 'mafia-label' });
    const stake = h('ul', { class: 'mafia-stake' });
    S.mafia.consequences(baseConfig.mafiaGarnish).forEach((text, i) => {
      const item = h('li', {}, h('i', {}, animatedIcon('close')), text);
      item.style.setProperty('--i', String(i));
      stake.append(item);
    });
    const card = h('div', { class: 'mafia-card ledger' }, layer());
    const pay = h('div', { class: 'mafia-pay' });
    const buttons: HTMLButtonElement[] = [];

    update = (now) => {
      const seen = Math.max(now, loan.seen);
      const mood = moodOf(loan, now);
      card.dataset.mood = mood;
      root.dataset.mood = mood;
      stamp.hidden = !loan.late;
      alert.hidden = !loan.late;
      stake.classList.toggle('lit', loan.late);
      stakeLabel.textContent = loan.late ? S.mafia.inForce : S.mafia.atStake;
      countdown.classList.toggle('beat', mood === 'hot' || mood === 'late');
      countdown.textContent = loan.late ? S.mafia.lateFor(seen - loan.due) : S.mafia.countdown(loan.due - seen);
      fill.style.transform = `scaleX(${Math.min(1, Math.max(0.02, (seen - loan.taken) / Math.max(1, loan.due - loan.taken)))})`;
      shifts.textContent = S.mafia.shiftsToClear(Math.max(1, Math.ceil(Mafia.debt(career, now) / Math.max(1, shiftPay))));
      for (const button of buttons) button.disabled = career.money < 1;
    };

    function repay(share: number, button: HTMLElement): void {
      const now = Date.now();
      if (career.money < 1) return host.notice(S.mafia.noMoney);
      const result = Mafia.repay(career, Math.ceil(Mafia.debt(career, now) * share), now);
      if (result.paid <= 0) return;
      host.changed();
      host.sound?.('paid', 1);
      host.feel?.('paid');
      bits(card, button, 'coin', 10);
      if (result.cleared) return settle(card, result.inTime);
      debt.tween(Mafia.debt(career, now), 650);
      paid.tween(loan.paid, 650);
      update?.(now);
    }

    for (const share of [0.25, 0.5, 1]) {
      const button = h('button', { class: `btn${share === 1 ? ' primary' : ''}`, type: 'button' }, S.mafia.repayShare(share));
      button.addEventListener('click', () => repay(share, button));
      buttons.push(button);
      pay.append(button);
    }
    update(Date.now());
    card.append(
      h('div', { class: 'mafia-ledger-head' }, h('span', { class: 'mafia-label' }, S.mafia.ledger), stamp),
      alert,
      h('div', { class: 'mafia-owed' }, h('span', {}, S.mafia.owed), debt.el),
      h('div', { class: 'mafia-clock' }, fill),
      h('div', { class: 'mafia-count' }, countdown),
      shifts,
      h('div', { class: 'mafia-sums' }, h('div', {}, h('span', {}, S.mafia.lent), cash(loan.amount).el), h('div', {}, h('span', {}, S.mafia.paid), paid.el), h('div', {}, h('span', {}, S.mafia.due), h('b', {}, dateOf(loan.due)))),
      pay,
      h('div', { class: 'mafia-stakes' }, stakeLabel, stake),
    );
    return [card, ...letterRows(loan)];
  }

  /** The last coin is paid: a stamp comes down on the ledger, the coins rain, then the page turns to the next deal. */
  function settle(card: HTMLElement, inTime: boolean): void {
    settling = true;
    update = null;
    host.celebrate();
    const stamp = h('div', { class: `mafia-paid ${inTime ? 'clean' : 'late'}` }, h('span', {}, S.mafia.paidStamp));
    card.append(stamp);
    card.classList.add('settled');
    bits(card, stamp, 'coin', 28);
    bits(card, stamp, 'spark', 18);
    later(
      () => {
        settling = false;
        show();
      },
      still() ? 300 : 1500,
    );
  }

  function letterRows(loan: Loan): HTMLElement[] {
    const arrived = Mafia.arrived(loan, Date.now());
    const prior = seenLetters ?? arrived.length;
    seenLetters = arrived.length;
    lettersShown = arrived.length;
    const rows = [...arrived].reverse().map((letter, k) => {
      const fresh = arrived.length - 1 - k >= prior;
      return h('div', { class: `mafia-letter ${letter.kind}${fresh ? ' fresh' : ''}` }, h('div', { class: 'mafia-from' }, h('b', {}, S.mafia.don), h('span', {}, dateOf(letter.at))), h('p', {}, S.mafia.letter(letter.kind, Fmt.number(loan.owed), dateOf(loan.due))));
    });
    return [h('p', { class: 'section-note board-label' }, S.mafia.letters), ...rows];
  }

  // MARK: Page

  function show(position = 0): void {
    stopFrame();
    update = null;
    needle = null;
    ghosts = [];
    lettersShown = 0;
    const loan = career.loan;
    const rows: HTMLElement[] = [header()];
    if (phase === 'struck') rows.push(...struckRows(position));
    else if (loan) rows.push(...ledgerRows(loan));
    else if (phase === 'table') rows.push(...tableRows());
    else rows.push(...idleRows());
    rows.push(h('p', { class: 'field-help mafia-rules' }, S.mafia.rules(baseConfig.mafiaLateRate, baseConfig.mafiaLateCap, baseConfig.mafiaGarnish)));
    rows.forEach((row, i) => row.style.setProperty('--i', String(i)));
    body.replaceChildren(...rows);
    if (!(loan && phase !== 'struck')) root.dataset.mood = phase === 'table' ? 'tense' : 'none';
    // A new view comes in row by row; a click inside the same view does not replay it.
    const view = `${phase}:${loan ? 'loan' : 'none'}`;
    if (view !== lastView) {
      lastView = view;
      window.clearTimeout(enterTimer);
      root.classList.remove('enter');
      void root.offsetWidth;
      root.classList.add('enter');
      enterTimer = later(() => root.classList.remove('enter'), 1000);
    }
    if (phase === 'table') frame = window.requestAnimationFrame(sweep);
    const card = root.querySelector<HTMLElement>('.mafia-card.stage.result');
    if (justStruck && card && struck) {
      justStruck = false;
      impact(card, struck.grade, position);
    }
  }

  const first = Mafia.sync(career, Date.now());
  if (first) host.changed();
  show();

  return {
    el: root,
    dispose() {
      closed = true;
      window.clearInterval(clock);
      stopFrame();
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
    },
  };
}
