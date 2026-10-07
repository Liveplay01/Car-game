import { type Config, type Weather, type LegendaryRule, cloneConfig } from './config';
import type { Darkness } from './levels';
import { Rng } from './rng';

/**
 * Daily mutators (Leo, 07.10.2026): one twist a day on the Daily Shift, the same for everyone.
 * Different rather than harder: an open road sits beside a storm front. They only change the
 * traffic and the sky; they are not Legendary Shifts and pay no chest of their own.
 */
export type MutatorId = 'openRoad' | 'speedway' | 'fogBank' | 'nightShift' | 'lightsOut' | 'stormFront' | 'rushAllDay' | 'dragnet' | 'heavyLoad' | 'cashConvoy';
export const MUTATORS: MutatorId[] = ['openRoad', 'speedway', 'fogBank', 'nightShift', 'lightsOut', 'stormFront', 'rushAllDay', 'dragnet', 'heavyLoad', 'cashConvoy'];

const shuffled = (cycle: number): MutatorId[] => {
  const rng = new Rng((Math.imul(cycle + 1, 0x9e3779b1) ^ 0x4d7a7011) >>> 0);
  const list = [...MUTATORS];
  for (let i = list.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};

/** Every mutator once per cycle of days, in an order that changes each cycle; never the same one two days running. */
export function mutatorOf(day: number): MutatorId {
  const n = MUTATORS.length;
  const cycle = Math.floor(day / n);
  const list = shuffled(cycle);
  const index = ((day % n) + n) % n;
  if (index === 0 && list[0] === shuffled(cycle - 1)[n - 1]) return list[1];
  if (index === 1 && list[0] === shuffled(cycle - 1)[n - 1]) return list[0];
  return list[index];
}

/** The sky a mutator pins, and the rule it borrows from the Legendary Shifts (never named as one). */
export function mutatorSky(id: MutatorId): { weather?: Weather; darkness?: Darkness; rule?: LegendaryRule } {
  switch (id) {
    case 'fogBank':
      return { weather: 'fog' };
    case 'nightShift':
      return { darkness: 'night' };
    case 'lightsOut':
      return { darkness: 'blackout' };
    case 'stormFront':
      return { weather: 'storm' };
    case 'rushAllDay':
      return { rule: 'gridlock' };
    case 'dragnet':
      return { rule: 'dragnet' };
    case 'heavyLoad':
      return { rule: 'heavyLoad' };
    default:
      return {};
  }
}

/** The traffic a mutator changes, on top of the shift it was drawn for. */
export function withMutator(shift: Config, id: MutatorId): Config {
  const c = cloneConfig(shift);
  c.mutator = id;
  if (mutatorSky(id).rule) c.legendary = null;
  switch (id) {
    case 'openRoad':
      c.densityStart = Math.max(3, c.densityStart - 2);
      c.densityEnd = Math.max(3, c.densityEnd - 2);
      break;
    case 'speedway':
      c.tempoStart += 0.12;
      c.tempoEnd += 0.12;
      c.rushHourTempo += 0.12;
      c.densityStart = Math.max(3, c.densityStart - 1);
      c.densityEnd = Math.max(3, c.densityEnd - 1);
      break;
    case 'cashConvoy':
      c.transporterFirst = { lo: c.transporterFirst.lo * 0.5, hi: c.transporterFirst.hi * 0.5 };
      c.transporterInterval = { lo: c.transporterInterval.lo * 0.5, hi: c.transporterInterval.hi * 0.5 };
      break;
  }
  return c;
}
