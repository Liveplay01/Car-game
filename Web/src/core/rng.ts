/**
 * Seeded random numbers (sfc32). The same seed gives the same shift, like GameCore's
 * `SeededRandom`: good for replays and for reproducing a bug.
 */
export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(seed: number) {
    // splitmix32 to spread a small seed over the state.
    let s = seed >>> 0;
    const next = (): number => {
      s = (s + 0x9e3779b9) >>> 0;
      let z = s;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
      return (z ^ (z >>> 16)) >>> 0;
    };
    this.a = next();
    this.b = next();
    this.c = next();
    this.d = next();
    for (let i = 0; i < 12; i++) this.unit();
  }

  /** 0 ≤ x < 1. */
  unit(): number {
    const t = (((this.a + this.b) >>> 0) + this.d) >>> 0;
    this.d = (this.d + 1) >>> 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) >>> 0;
    this.c = ((this.c << 21) | (this.c >>> 11)) >>> 0;
    this.c = (this.c + t) >>> 0;
    return t / 4294967296;
  }

  range(lo: number, hi: number): number {
    return lo + (hi - lo) * this.unit();
  }

  /** Integer in [lo, hi], both included. */
  int(lo: number, hi: number): number {
    return lo + Math.floor(this.unit() * (hi - lo + 1));
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.min(items.length - 1, Math.floor(this.unit() * items.length))];
  }
}

/** A derived stream, so adding one system never changes another's randomness. */
export const substream = (seed: number, salt: number): Rng => new Rng((seed ^ salt) >>> 0);

export const randomSeed = (): number => (Math.random() * 4294967296) >>> 0;
