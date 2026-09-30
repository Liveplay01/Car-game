import type { Context, Env, MiddlewareHandler } from 'hono';
import { ApiError } from './errors.ts';

export interface Limit {
  /** At most `max` requests per key within `windowMs`. */
  max: number;
  windowMs: number;
}

/** Fixed windows in memory: fine for one container, and a restart only resets the counters. */
export class RateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();
  private readonly limit: Limit;

  constructor(limit: Limit) {
    this.limit = limit;
  }

  /** Seconds to wait when the key is over its limit, otherwise 0 (and the hit is counted). */
  take(key: string, now: number): number {
    if (this.hits.size > 20_000) this.prune(now);
    const hit = this.hits.get(key);
    if (!hit || hit.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.limit.windowMs });
      return 0;
    }
    if (hit.count >= this.limit.max) return Math.ceil((hit.resetAt - now) / 1000);
    hit.count += 1;
    return 0;
  }

  private prune(now: number): void {
    for (const [key, hit] of this.hits) if (hit.resetAt <= now) this.hits.delete(key);
  }
}

/** A route guard: `keyOf` says who is counted (an address, a player). */
export function rateLimit<E extends Env>(limit: Limit, keyOf: (c: Context<E>) => string, now: () => number): MiddlewareHandler<E> {
  const limiter = new RateLimiter(limit);
  return async (c, next) => {
    const wait = limiter.take(keyOf(c), now());
    if (wait > 0) throw new ApiError(429, 'rate_limited', 'Too many requests. Try again in a moment.', { 'Retry-After': String(wait) });
    await next();
  };
}
