import type { MuseumEntry, SpecialKind } from '../core/museum';
import { type Vec2, v, mul, fromAngle, TAU } from '../core/vec2';
import { type RenderList, Ease, arc, line, rect } from './render';
import type { ColorToken } from './theme';
import { RingSignals } from './hud';
import { S } from './strings';

/** One colour of a signal, with the word the sheet calls it (colour alone is never the message). */
export interface Beacon {
  color: ColorToken;
  name: string;
}

/** A signal that is not about one vehicle's coming or going but about what it can do to you. */
export type SignalNote = 'escaped' | 'blocked';

/**
 * What the ring shows for this vehicle, in the order it happens (`session.react`): the glow on the arm it comes from
 * and the light round the island when it is announced, a ring widening out when you pull it off, a ring pulling back
 * in when its bonus slips away. Null: the ring has no signal for that. Never more than the game really does.
 */
export interface MuseumSignal {
  arm: Beacon | null;
  sweep: Beacon | null;
  paid: Beacon | null;
  missed: Beacon | null;
  note: SignalNote | null;
}

/** One line under the picture: what you see and what it means. */
export interface SignalLine {
  kind: 'arrive' | 'paid' | 'missed' | 'note';
  color: ColorToken | null;
  text: string;
}

/** The signal as the detail sheet carries it: the beacons the picture plays and the lines that explain them. */
export interface SignalDetail extends MuseumSignal {
  lines: SignalLine[];
}

const PURPLE: Beacon = { color: 'vehicleCriminal', name: 'purple' };
const GOLD: Beacon = { color: 'coin', name: 'gold' };
const CARGO: Beacon = { color: 'vehicleCargo', name: 'gold' };
const BLUE: Beacon = { color: 'lightBlue', name: 'blue' };
const RED: Beacon = { color: 'lightRed', name: 'red' };
const TEAL: Beacon = { color: 'learnerSign', name: 'teal' };
const ORANGE: Beacon = { color: 'vehicleOversize', name: 'orange' };
const PINK: Beacon = { color: 'vehicleRacer', name: 'pink' };
const ROSE: Beacon = { color: 'vehicleWedding', name: 'rose' };

/** Announced in its colour, paid in it, and its bonus can slip away. */
const fullCycle = (b: Beacon, note: SignalNote | null = null): MuseumSignal => ({ arm: b, sweep: b, paid: b, missed: b, note });
/** Announced and paid in its colour, with no bonus to lose. */
const noMiss = (b: Beacon): MuseumSignal => ({ ...fullCycle(b), missed: null });

/** A new special has to pick one, or null (the compiler checks). */
const SPECIAL_SIGNAL: Record<SpecialKind, MuseumSignal | null> = {
  police: null,
  truck: null,
  tanker: null,
  motorbike: null,
  bus: null,
  pickup: { arm: PURPLE, sweep: PURPLE, paid: BLUE, missed: null, note: 'escaped' },
  transporter: fullCycle(CARGO),
  military: { arm: RED, sweep: RED, paid: null, missed: null, note: null },
  ambulance: fullCycle(BLUE, 'blocked'),
  fireTruck: fullCycle(BLUE, 'blocked'),
  learner: fullCycle(TEAL),
  oversize: fullCycle(ORANGE),
  racer: noMiss(PINK),
  wedding: fullCycle(ROSE),
};

const BOSS_SIGNAL: MuseumSignal = { arm: PURPLE, sweep: GOLD, paid: GOLD, missed: null, note: 'escaped' };

export function signalOf(e: MuseumEntry): MuseumSignal | null {
  if (e.k === 'boss') return BOSS_SIGNAL;
  return e.k === 'special' ? SPECIAL_SIGNAL[e.kind] : null;
}

export function signalDetail(e: MuseumEntry): SignalDetail | null {
  const signal = signalOf(e);
  if (!signal) return null;
  const lines: SignalLine[] = [];
  const first = signal.arm ?? signal.sweep;
  if (first) lines.push({ kind: 'arrive', color: first.color, text: S.museum.signalArrive(signal.arm?.name ?? null, signal.sweep?.name ?? null) });
  if (signal.paid) lines.push({ kind: 'paid', color: signal.paid.color, text: S.museum.signalPaid(signal.paid.name) });
  if (signal.missed) lines.push({ kind: 'missed', color: signal.missed.color, text: S.museum.signalMissed(signal.missed.name) });
  if (signal.note) lines.push({ kind: 'note', color: null, text: S.museum.signalNote(signal.note) });
  return { ...signal, lines };
}

/** A small roundabout that plays the signal over and over: the warning, then the vehicle driving in. */
export class SignalLoop {
  /** Canvas size in points. */
  static readonly size = 80;
  private static readonly loop = 3.6;
  /** The arm glows until the vehicle appears, then it drives in. */
  private static readonly appears = 1.4;
  private static readonly drive = 1.4;

  private static readonly half = SignalLoop.size / 2;
  private static readonly road = 23;
  private static readonly lane = 10;
  private static readonly rim = 12;
  /** The arm the vehicle comes from: on the right, of four. */
  private static readonly arm = 0;
  private static readonly arms = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  /** The player's arm at the bottom, where the light starts (the screen's y runs up). */
  private static readonly start = -Math.PI / 2;

  private readonly rimSignals = new RingSignals();
  /** Starts at the end of a loop, so the first update plays the signal. */
  private clock = SignalLoop.loop;
  private rounds = -1;
  private told = false;

  /** What the vehicle's drive ends in this round: the two outcomes take turns. */
  outcome(signal: MuseumSignal): 'paid' | 'missed' | null {
    const ends = (['paid', 'missed'] as const).filter((o) => signal[o]);
    return ends.length === 0 ? null : ends[Math.max(0, this.rounds) % ends.length];
  }

  update(dt: number, signal: MuseumSignal): void {
    const step = Math.min(dt, 0.1);
    this.clock += step;
    this.rimSignals.age(step);
    if (this.clock >= SignalLoop.loop) {
      this.clock %= SignalLoop.loop;
      this.rounds++;
      this.told = false;
      if (signal.sweep) this.rimSignals.signal('sweep', signal.sweep.color);
    }
    const outcome = this.outcome(signal);
    if (this.told || !outcome || this.clock < SignalLoop.appears + SignalLoop.drive) return;
    this.told = true;
    const beacon = signal[outcome];
    if (beacon) this.rimSignals.signal(outcome === 'paid' ? 'wave' : 'miss', beacon.color);
  }

  draw(list: RenderList, signal: MuseumSignal, reduceMotion: boolean): void {
    const { road, lane, rim, arm } = SignalLoop;
    const edge = SignalLoop.half + 2;
    list.w(arc(v(0, 0), road, lane, 0, TAU), 'surface');
    for (const angle of SignalLoop.arms) list.w(line(mul(fromAngle(angle), road), mul(fromAngle(angle), edge), lane), 'surface');
    for (let k = 0; k < 10; k++) list.w(arc(v(0, 0), road, 1, (k * TAU) / 10, (k * TAU) / 10 + 0.3), 'primary', 0.2);

    const beacon = signal.arm ?? signal.sweep;
    if (signal.arm && this.clock < SignalLoop.appears) RingSignals.wedge(list, rim, arm, reduceMotion ? 0 : (this.clock * 1.6) % 1, signal.arm.color);
    this.rimSignals.addAt(list, { rim, start: SignalLoop.start, outer: road + lane / 2 }, reduceMotion);
    if (beacon && this.clock >= SignalLoop.appears) this.drawVehicle(list, beacon.color, reduceMotion);
  }

  /** The vehicle enters along its arm and goes on round the ring, with the halo the game draws round an arriving one. */
  private drawVehicle(list: RenderList, color: ColorToken, reduceMotion: boolean): void {
    const { road, arm } = SignalLoop;
    const x = Ease.clamp01((this.clock - SignalLoop.appears) / SignalLoop.drive);
    const entry = 0.6;
    const outside = SignalLoop.half + 4;
    let at: Vec2 = mul(fromAngle(arm), road);
    let heading = arm + Math.PI;
    if (!reduceMotion && x < entry) at = mul(fromAngle(arm), outside - (outside - road) * (x / entry));
    else if (!reduceMotion) {
      const angle = arm + ((x - entry) / (1 - entry)) * 1.1;
      at = mul(fromAngle(angle), road);
      heading = angle + Math.PI / 2;
    }
    const opacity = Ease.clamp01(x / 0.1) * (1 - Ease.clamp01((x - 0.85) / 0.15));
    list.w(arc(at, 8, 1.5, 0, TAU), color, 0.6 * opacity);
    list.w(rect(at, v(7, 4), 1.5, heading), color, opacity);
  }
}
