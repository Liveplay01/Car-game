/**
 * The notice pill above the settings button, one line at a time. Announcements (what a
 * shift earned, a finished album, a new mode) wait their turn instead of being squeezed into
 * one unreadable line; a reply to what the player just did ("Not enough money") shows at
 * once and puts a barely seen announcement back in line. An achievement is no line of news
 * but a card of its own (`AchievementCard`): taller, gold, a little longer on screen, and
 * never folded into the tail of a long list.
 */
export interface AchievementCard {
  /** The family's name, big. */
  title: string;
  /** The tier in Roman numerals, in the medal. */
  tier: string;
  /** What it paid, as the card writes it. */
  reward: string;
  /** All of it in one line, for the screen reader. */
  text: string;
}

/**
 * A tip (install, backup, a friend to invite, how a Tight Fit pays) is no news: it waits for the waiting screen and
 * takes the top card, the way the swipe hint does (Leo, 09.10.2026). It shows `TipQueue.hold` seconds; a tip cut off
 * before it could be read starts over.
 */
export interface Tip {
  caption: string;
  text: string;
}

export class TipQueue {
  static readonly hold = 5;
  /** A tip on screen this long counts as read. */
  static readonly readAfter = 2;
  private static readonly fade = 0.35;

  private waiting: Tip[] = [];
  private current: Tip | null = null;
  private age = 0;
  private amount = 0;

  add(...tips: Tip[]): void {
    for (const tip of tips) if (this.current?.text !== tip.text && !this.waiting.some((w) => w.text === tip.text)) this.waiting.push(tip);
  }

  /** A tip is on its way in, on screen or on its way out: the swipe hint keeps away. */
  get isActive(): boolean {
    return this.current !== null;
  }

  /** `open`: the top card is free for a tip; `canStart`: nothing else asks for the eye, so the next tip may come. */
  advance(dt: number, open: boolean, canStart: boolean, reduceMotion: boolean): void {
    if (!this.current && open && canStart) {
      this.current = this.waiting.shift() ?? null;
      this.age = 0;
    }
    if (!this.current) return;
    if (open) this.age += dt;
    else if (this.age < TipQueue.readAfter) this.age = 0;
    const wanted = open && this.age < TipQueue.hold ? 1 : 0;
    const step = reduceMotion ? 1 : dt / TipQueue.fade;
    this.amount = wanted > this.amount ? Math.min(wanted, this.amount + step) : Math.max(wanted, this.amount - step);
    if (this.amount === 0 && (this.age >= TipQueue.hold || (!open && this.age >= TipQueue.readAfter))) this.current = null;
  }

  /** The tip and how far it is in (0–1), or null when none shows. */
  get view(): { tip: Tip; amount: number } | null {
    return this.current && this.amount > 0 ? { tip: this.current, amount: this.amount } : null;
  }

  /** Gone at once: the card is needed for something else. */
  dismiss(): void {
    this.current = null;
    this.amount = 0;
  }
}

export interface ShownNotice {
  text: string;
  age: number;
  /** How long this one stays: shorter while others wait. */
  duration: number;
  achievement: AchievementCard | null;
}

interface Item {
  text: string;
  achievement: AchievementCard | null;
}

export class NoticeQueue {
  /** A notice alone stays this long; with others waiting, `queuedDuration`. */
  static readonly duration = 3.5;
  static readonly queuedDuration = 2.6;
  /** An achievement card stays a little longer: it is the one thing worth reading twice. */
  static readonly achievementDuration = 4.4;
  static readonly achievementQueuedDuration = 3.2;
  /** An announcement cut off before this age comes back after the reply. */
  static readonly seenAfter = 1.2;
  /** More plain lines waiting than this and the rest share the last line. */
  static readonly maxWaiting = 4;

  private current: (Item & { age: number; announcement: boolean }) | null = null;
  private waiting: Item[] = [];

  /**
   * While a shift runs (08.10.2026), news waits: only replies to what the player does show (a shield used, the scout).
   * An announcement on screen when it starts goes back in line, unless it was read already.
   */
  get held(): boolean {
    return this.holding;
  }

  set held(on: boolean) {
    if (on === this.holding) return;
    this.holding = on;
    const cur = this.current;
    if (on && cur?.announcement) {
      if (cur.age < NoticeQueue.seenAfter) this.waiting.unshift({ text: cur.text, achievement: cur.achievement });
      this.current = null;
    } else if (!on && !cur) this.next();
  }

  private holding = false;

  /** A reply to the player's own action: shown now. */
  say(text: string): void {
    const cur = this.current;
    if (cur && cur.text === text) {
      cur.age = 0;
      return;
    }
    if (cur && cur.announcement && cur.age < NoticeQueue.seenAfter) this.waiting.unshift({ text: cur.text, achievement: cur.achievement });
    this.current = { text, achievement: null, age: 0, announcement: false };
  }

  /** News for the player: each gets its own turn, in this order. */
  announce(...texts: string[]): void {
    this.enqueue(texts.map((text) => ({ text, achievement: null })));
  }

  /** Achievements reached: each a card of its own, in this order. */
  achieve(...cards: AchievementCard[]): void {
    this.enqueue(cards.map((achievement) => ({ text: achievement.text, achievement })));
  }

  advance(dt: number): void {
    const cur = this.current;
    if (!cur) return;
    cur.age += dt;
    if (cur.age >= this.durationOf(cur)) this.next();
  }

  get shown(): ShownNotice | null {
    const cur = this.current;
    return cur ? { text: cur.text, age: cur.age, duration: this.durationOf(cur), achievement: cur.achievement } : null;
  }

  get isEmpty(): boolean {
    return this.current === null;
  }

  clear(): void {
    this.current = null;
    this.waiting = [];
  }

  private enqueue(items: Item[]): void {
    for (const item of items) {
      if (!item.text || this.current?.text === item.text || this.waiting.some((w) => w.text === item.text)) continue;
      this.waiting.push(item);
    }
    if (!this.current && !this.holding) this.next();
    this.fold();
  }

  /** The plain lines beyond `maxWaiting` become one, where the first of them stood; cards are never folded. */
  private fold(): void {
    const plain = this.waiting.filter((w) => !w.achievement);
    if (plain.length <= NoticeQueue.maxWaiting) return;
    const tail = plain.slice(NoticeQueue.maxWaiting - 1);
    const merged: Item = { text: tail.map((w) => w.text).join('  ·  '), achievement: null };
    this.waiting = this.waiting.flatMap((w) => (w === tail[0] ? [merged] : tail.includes(w) ? [] : [w]));
  }

  private durationOf(cur: Item): number {
    const queued = this.waiting.length > 0;
    if (cur.achievement) return queued ? NoticeQueue.achievementQueuedDuration : NoticeQueue.achievementDuration;
    return queued ? NoticeQueue.queuedDuration : NoticeQueue.duration;
  }

  private next(): void {
    if (this.holding) {
      this.current = null;
      return;
    }
    const item = this.waiting.shift();
    this.current = item === undefined ? null : { ...item, age: 0, announcement: true };
  }
}
