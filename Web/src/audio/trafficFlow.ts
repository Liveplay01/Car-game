import type { TrafficSound } from '../present/feedback';

const TAU = Math.PI * 2;
/** Share of a ring's speed from which a car counts as flowing. */
const MOVING = 0.3;
/** Flowing cars on the ring that make it feel full. */
const FULL_RING = 8;
/** The gap (radians of the ring) behind the nearest car from which a merge feels free. */
const OPEN_GAP = 1.9;
/** The chord the engines settle into, as playback-rate ratios (root, third, fifth, octave, tenth). */
const CHORD = [0.5, 0.625, 0.75, 1, 1.25];

export interface TrafficFlow {
  /** 0 when the ring's cars bunch and gap, 1 when they roll evenly spaced. */
  evenness: number;
  /** 0 with a free gap to merge into, 1 with a full ring and no gap. */
  pressure: number;
}

const behind = (from: number, to: number): number => (((to - from) % TAU) + TAU) % TAU;

/** How steady the ring flows and how tight the gaps are, from what the traffic bed already hears. */
export function trafficFlow(cars: readonly TrafficSound[]): TrafficFlow {
  const ring = cars.filter((c) => c.ring);
  const angles = ring.filter((c) => c.speed > MOVING).map((c) => Math.atan2(c.y, c.x)).sort((a, b) => a - b);
  const density = Math.min(1, angles.length / FULL_RING);
  let evenness = 0;
  if (angles.length >= 3) {
    const mean = TAU / angles.length;
    let sum = 0;
    angles.forEach((a, i) => {
      const gap = (i + 1 < angles.length ? angles[i + 1] : angles[0] + TAU) - a;
      sum += (gap - mean) ** 2;
    });
    const spread = Math.sqrt(sum / angles.length) / mean;
    evenness = Math.max(0, 1 - spread / 0.8) * Math.min(1, (angles.length - 2) / 3);
  }
  const waiting = cars.filter((c) => !c.ring && c.load > 0);
  let tight = density;
  if (waiting.length > 0) {
    let open = 0;
    for (const w of waiting) {
      const at = Math.atan2(w.y, w.x);
      let nearest = TAU;
      for (const c of ring) nearest = Math.min(nearest, behind(Math.atan2(c.y, c.x), at));
      open = Math.max(open, Math.min(1, nearest / OPEN_GAP));
    }
    tight = 1 - open;
  }
  return { evenness, pressure: 0.5 * density + 0.5 * tight };
}

/** Pulls a playback rate towards the nearest chord note (`amount` 0…1, in pitch, not in Hz). */
export function settle(rate: number, amount: number): number {
  let target = CHORD[0];
  for (const note of CHORD) if (Math.abs(Math.log(note / rate)) < Math.abs(Math.log(target / rate))) target = note;
  return rate * (target / rate) ** amount;
}
