/**
 * The notice pill above the settings button, one line at a time. Announcements (what a
 * shift earned, a finished album, a new mode) wait their turn instead of being squeezed into
 * one unreadable line; a reply to what the player just did ("Not enough money") shows at
 * once and puts a barely seen announcement back in line.
 */
export interface ShownNotice {
  text: string;
  age: number;
  /** How long this one stays: shorter while others wait. */
  duration: number;
}

export class NoticeQueue {
  /** A notice alone stays this long; with others waiting, `queuedDuration`. */
  static readonly duration = 3.5;
  static readonly queuedDuration = 2.6;
  /** An announcement cut off before this age comes back after the reply. */
  static readonly seenAfter = 1.2;
  /** More waiting than this and the rest share the last line. */
  static readonly maxWaiting = 4;

  private current: { text: string; age: number; announcement: boolean } | null = null;
  private waiting: string[] = [];

  /** A reply to the player's own action: shown now. */
  say(text: string): void {
    const cur = this.current;
    if (cur && cur.text === text) {
      cur.age = 0;
      return;
    }
    if (cur && cur.announcement && cur.age < NoticeQueue.seenAfter) this.waiting.unshift(cur.text);
    this.current = { text, age: 0, announcement: false };
  }

  /** News for the player: each gets its own turn, in this order. */
  announce(...texts: string[]): void {
    for (const text of texts) {
      if (!text || this.current?.text === text || this.waiting.includes(text)) continue;
      this.waiting.push(text);
    }
    if (!this.current) this.next();
    const max = NoticeQueue.maxWaiting;
    if (this.waiting.length > max) this.waiting = [...this.waiting.slice(0, max - 1), this.waiting.slice(max - 1).join('  ·  ')];
  }

  advance(dt: number): void {
    const cur = this.current;
    if (!cur) return;
    cur.age += dt;
    if (cur.age >= this.durationOf()) this.next();
  }

  get shown(): ShownNotice | null {
    const cur = this.current;
    return cur ? { text: cur.text, age: cur.age, duration: this.durationOf() } : null;
  }

  get isEmpty(): boolean {
    return this.current === null;
  }

  clear(): void {
    this.current = null;
    this.waiting = [];
  }

  private durationOf(): number {
    return this.waiting.length > 0 ? NoticeQueue.queuedDuration : NoticeQueue.duration;
  }

  private next(): void {
    const text = this.waiting.shift();
    this.current = text === undefined ? null : { text, age: 0, announcement: true };
  }
}
