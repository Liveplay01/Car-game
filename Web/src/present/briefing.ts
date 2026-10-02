import type { World } from '../core/world';
import { type MuseumEntry, museumId } from '../core/museum';
import type { ColorToken } from './theme';
import { Ease } from './render';
import { S } from './strings';
import { MuseumPage } from './museum';

/**
 * Something new on the road, and what to do about it (Leo, 01.10.2026): the first time a special
 * vehicle, a boss or a condition meets the player, the top card's numbers make way for one
 * sentence of instructions. A task with an end (catch the criminal, keep the ambulance's road
 * clear) stays until it is over; anything else stays a few seconds. Then the numbers come back.
 */
export interface Brief {
  /** The Museum entry it explains: one briefing per entry and shift. */
  id: string;
  caption: string;
  text: string;
  color: ColorToken;
  /** While this holds, the task is still on: the briefing stays. Null: a few seconds. */
  pending: ((w: World) => boolean) | null;
}

/** What the top card shows of a briefing this frame. */
export interface BriefView {
  brief: Brief;
  /** 0 the card shows its numbers, 1 the briefing: they cross over. */
  card: number;
  /** The briefing's words, faded while one briefing hands over to the next. */
  words: number;
  /** How much of a timed briefing's time is used up (0–1); null while it waits for a task. */
  used: number | null;
}

/** Whether the task a briefing asks for is still under way: the special's run is not over yet. */
function pendingOf(e: MuseumEntry): ((w: World) => boolean) | null {
  const on = (kind: string): boolean => kind === 'warning' || kind === 'arriving' || kind === 'active';
  if (e.k === 'boss') return (w) => on(w.criminal.kind);
  if (e.k !== 'special') return null;
  switch (e.kind) {
    case 'pickup':
      return (w) => on(w.criminal.kind);
    case 'transporter':
      return (w) => on(w.transporter.kind);
    case 'military':
      return (w) => on(w.military.kind);
    case 'ambulance':
    case 'fireTruck':
      return (w) => on(w.ambulance.kind);
    case 'learner':
      return (w) => on(w.learner.kind);
    case 'oversize':
      return (w) => on(w.oversize.kind);
    case 'racer':
      return (w) => on(w.race.kind);
    default:
      return null;
  }
}

/** The caption's colour: the criminal in the purple of its ring, the rest in their Museum colour. */
const colorOf = (e: MuseumEntry): ColorToken => (e.k === 'special' && e.kind === 'pickup' ? 'vehicleCriminal' : MuseumPage.color(e));

export function briefOf(e: MuseumEntry, again = false): Brief {
  return { id: museumId(e), caption: S.brief.caption(e, again), text: S.brief.text(e), color: colorOf(e), pending: pendingOf(e) };
}

export class Briefings {
  /** The card swaps between its numbers and a briefing in this long. */
  static readonly fade = 0.4;
  /** One briefing hands over to the next: the words fade out, the next ones in. */
  static readonly swap = 0.22;
  /** Every briefing stays at least this long, so it can be read. */
  static readonly least = 3.5;
  /** A briefing without a task stays this long. */
  static readonly timed = 5;
  /** A task that drags on: the numbers come back after this at the latest. */
  static readonly most = 40;

  private current: { brief: Brief; age: number; endedAt: number | null; handedOver: boolean } | null = null;
  /** The one that just ended, still on the card while the numbers come back. */
  private last: Brief | null = null;
  private waiting: Brief[] = [];
  private given = new Set<string>();
  private amount = 0;

  /** Queues a briefing, once per entry until `clear`. A task goes before a few seconds of news. */
  add(brief: Brief): void {
    if (this.given.has(brief.id)) return;
    this.given.add(brief.id);
    if (brief.pending === null) {
      this.waiting.push(brief);
      return;
    }
    const firstTimed = this.waiting.findIndex((b) => b.pending === null);
    this.waiting.splice(firstTimed < 0 ? this.waiting.length : firstTimed, 0, brief);
    // A task that starts now goes before news that has had its least time.
    const cur = this.current;
    if (cur && cur.brief.pending === null && cur.endedAt === null && cur.age >= Briefings.least) cur.endedAt = cur.age;
  }

  advance(dt: number, world: World): void {
    if (!this.current && this.waiting.length > 0) this.begin(this.amount > 0.5);
    const cur = this.current;
    if (cur) {
      cur.age += dt;
      if (cur.endedAt === null && this.isOver(cur.brief, cur.age, world)) cur.endedAt = cur.age;
      if (cur.endedAt !== null) {
        if (this.waiting.length === 0) {
          this.last = cur.brief;
          this.current = null;
        } else if (cur.age - cur.endedAt >= Briefings.swap) this.begin(true);
      }
    }
    const target = this.current ? 1 : 0;
    const step = dt / Briefings.fade;
    this.amount = target > this.amount ? Math.min(target, this.amount + step) : Math.max(target, this.amount - step);
    if (this.amount === 0) this.last = null;
  }

  get view(): BriefView | null {
    const cur = this.current;
    const brief = cur?.brief ?? this.last;
    if (!brief || this.amount <= 0) return null;
    let words = 1;
    if (cur) {
      if (cur.handedOver) words = Ease.clamp01(cur.age / Briefings.swap);
      if (cur.endedAt !== null && this.waiting.length > 0) words *= 1 - Ease.clamp01((cur.age - cur.endedAt) / Briefings.swap);
    }
    const used = brief.pending === null && cur ? Ease.clamp01(cur.age / Briefings.timed) : brief.pending === null ? 1 : null;
    return { brief, card: Ease.smoothstep(this.amount), words, used };
  }

  get isEmpty(): boolean {
    return this.current === null && this.waiting.length === 0 && this.amount === 0;
  }

  /**
   * A new shift: nothing on the card, and every entry may be explained again. Returns the
   * briefings the shift ended before they could be read (still waiting, or on the card for less
   * than their least time): they are owed for the next time.
   */
  clear(): string[] {
    const cur = this.current;
    const owed = [...this.waiting.map((b) => b.id), ...(cur && cur.age < Briefings.least ? [cur.brief.id] : [])];
    this.current = null;
    this.last = null;
    this.waiting = [];
    this.given.clear();
    this.amount = 0;
    return owed;
  }

  private begin(handedOver: boolean): void {
    const brief = this.waiting.shift();
    this.current = brief ? { brief, age: 0, endedAt: null, handedOver } : null;
  }

  private isOver(brief: Brief, age: number, world: World): boolean {
    if (age < Briefings.least) return false;
    if (age >= Briefings.most) return true;
    return brief.pending ? !brief.pending(world) : age >= Briefings.timed;
  }
}
