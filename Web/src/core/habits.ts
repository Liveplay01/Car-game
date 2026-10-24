import type { Config } from './config';
import { substream } from './rng';
import { type Vec2, clamp, lengthSq, sub } from './vec2';
import type { Vehicle } from './vehicle';

interface Notes {
  tight: number;
  wide: number;
  scaredUntil: number;
}

/** Shares of a base value a driver changes (1 = unchanged). */
export interface Tune {
  gap: number;
  reaction: number;
  brake: number;
  accel: number;
  margin: number;
}

const PLAIN: Tune = { gap: 1, reaction: 1, brake: 1, accel: 1, margin: 1 };

/**
 * What the traffic of one shift has noticed (`Config.adaptive`): every effect is a few percent at most, comes from the
 * merges and crashes of this shift alone, and uses no random draw of the shift: same seed and taps, same result.
 */
export class Habits {
  private style = 0;
  private merges = 0;
  private notes = new Map<number, Notes>();

  constructor(
    private readonly c: Config,
    private readonly seed: number,
  ) {}

  /** -1 (wide merges) to 1 (tight merges): the shift's style once it shows. */
  private get lean(): number {
    if (this.merges < this.c.adaptMinMerges) return 0;
    const from = this.c.adaptLeanFrom;
    return Math.sign(this.style) * clamp((Math.abs(this.style) - from) / (1 - from), 0, 1);
  }

  private notesOf(id: number): Notes {
    let n = this.notes.get(id);
    if (!n) {
      n = { tight: 0, wide: 0, scaredUntil: -Infinity };
      this.notes.set(id, n);
    }
    return n;
  }

  /** A timed merge ended with `minGap` seconds to `other`, an AI car or null. */
  noteMerge(minGap: number, other: number | null): void {
    if (!this.c.adaptive) return;
    const lean = minGap < this.c.nearMissSeconds ? 1 : minGap > this.c.adaptWideGap ? -1 : 0;
    this.style += (lean - this.style) * this.c.adaptMemory;
    this.merges++;
    if (other === null || lean === 0) return;
    const n = this.notesOf(other);
    if (lean > 0) n.tight++;
    else n.wide++;
  }

  /** Cars near a crash take fright for a while. */
  noteCrash(vehicles: readonly Vehicle[], point: Vec2, now: number): void {
    if (!this.c.adaptive) return;
    const reach = this.c.adaptFearRadius * this.c.adaptFearRadius;
    for (const veh of vehicles) {
      const kind = veh.phase.kind;
      if (veh.owner !== 'ai' || (kind !== 'ring' && kind !== 'exiting') || lengthSq(sub(veh.position, point)) > reach) continue;
      this.notesOf(veh.id).scaredUntil = now + this.c.adaptFearSeconds;
    }
  }

  /** A new car arrives: after a run of tight merges it comes careful. */
  welcome(id: number): void {
    const lean = this.lean;
    if (this.c.adaptive && lean > 0) this.notesOf(id).tight = Math.round(lean * this.c.adaptSteps);
  }

  /** Seconds to the next arrival times this: longer after tight merges, evenly up or down after wide ones. */
  delayFactor(id: number): number {
    const lean = this.lean;
    if (!this.c.adaptive || lean === 0) return 1;
    if (lean > 0) return 1 + this.c.adaptShare * lean;
    return 1 + this.c.adaptShare * -lean * substream(this.seed, id).range(-1, 1);
  }

  tune(id: number, now: number): Tune {
    const n = this.c.adaptive ? this.notes.get(id) : undefined;
    if (!n) return PLAIN;
    const share = this.c.adaptShare;
    const careful = Math.min(1, n.tight / this.c.adaptSteps);
    const relaxed = Math.min(1, n.wide / this.c.adaptSteps);
    const scared = now < n.scaredUntil ? 1 : 0;
    return {
      gap: 1 + share * careful - share * this.c.adaptRelaxedGap * relaxed,
      reaction: 1 - share * careful,
      brake: 1 + share * scared,
      accel: 1 + share * relaxed,
      margin: 1 + share * scared,
    };
  }
}
