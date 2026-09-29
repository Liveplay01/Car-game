import type { Config } from './config';
import type { Career } from './career';

/**
 * The player's timing, for the Records. Every merge into a real gap says how far the tap was
 * from the moment that would have put the car right in its middle: with the gap ahead and
 * the gap behind in seconds, that is half their difference. Negative is early, positive late.
 * An open ring (both gaps wide) says nothing and is left out.
 */
export function tapOffset(gapAhead: number, gapBehind: number, c: Config): number | null {
  if (!Number.isFinite(gapAhead) || !Number.isFinite(gapBehind)) return null;
  if (gapAhead + gapBehind > c.timingMaxGap) return null;
  return (gapAhead - gapBehind) / 2;
}

/** Keeps the offset (in whole milliseconds) of the last `timingSamples` merges. */
export function noteTap(career: Career, gapAhead: number, gapBehind: number, c: Config): void {
  const offset = tapOffset(gapAhead, gapBehind, c);
  if (offset === null) return;
  career.tapOffsets = [...career.tapOffsets, Math.round(offset * 1000)].slice(-c.timingSamples);
}

/** The average offset in ms, or null until there are enough merges to say something. */
export function averageOffset(career: Career, c: Config): number | null {
  const offsets = career.tapOffsets;
  if (offsets.length < c.timingMinSamples) return null;
  return Math.round(offsets.reduce((sum, x) => sum + x, 0) / offsets.length);
}
