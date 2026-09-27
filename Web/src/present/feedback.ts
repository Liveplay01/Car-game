import type { GameEvent, CrashReport } from '../core/events';
import type { World } from '../core/world';
import { Scoring } from '../core/scoring';
import type { Vec2 } from '../core/vec2';
import { Ease, unitHash } from './render';
import { CrashEffects } from './effects';

/** Sound effects; the value is the file name under `/audio/sounds/`. */
export type SoundID =
  | 'merge'
  | 'toll'
  | 'tightFit'
  | 'nearMiss'
  | 'perfect'
  | 'cutOff'
  | 'comboUp'
  | 'crashLight'
  | 'crash'
  | 'crashHeavy'
  | 'rushHour'
  | 'shiftComplete'
  | 'shiftFailed'
  | 'wanted'
  | 'takedown'
  | 'dispatch'
  | 'escaped'
  | 'paid'
  | 'secured'
  | 'seized'
  | 'screech'
  | 'tow'
  | 'flowIn'
  | 'go'
  | 'swoosh'
  | 'uiTick'
  | 'purchase'
  | 'build'
  | 'denied'
  | 'chestCharge'
  | 'chestBurst'
  | 'chestBurstRare'
  | 'explosion'
  | 'detonation'
  | 'alarm';

export const SOUND_IDS: SoundID[] = [
  'merge', 'toll', 'tightFit', 'nearMiss', 'perfect', 'cutOff', 'comboUp', 'crashLight', 'crash', 'crashHeavy', 'rushHour',
  'shiftComplete', 'shiftFailed', 'wanted', 'takedown', 'dispatch', 'escaped', 'paid', 'secured', 'seized', 'screech', 'tow',
  'flowIn', 'go', 'swoosh', 'uiTick', 'purchase', 'build', 'denied', 'chestCharge', 'chestBurst', 'chestBurstRare',
  'explosion', 'detonation', 'alarm',
];

export type HapticID =
  | 'merge'
  | 'tightFit'
  | 'nearMiss'
  | 'perfect'
  | 'flow'
  | 'chest'
  | 'comboUp'
  | 'crash'
  | 'rushHour'
  | 'shiftComplete'
  | 'wanted'
  | 'takedown'
  | 'secured'
  | 'seized'
  | 'paid'
  | 'explosion';

/**
 * Turns game events into sound and haptics (`Feedback.swift`): the more often something
 * happens, the less it does. Launching a car gives no feedback; the car moving is the feedback.
 */
export const Feedback = {
  /** A clean merge climbs the A-minor pentatonic with the combo, the key the music plays in. */
  comboLadder: [0, 3, 5, 7, 10, 12, 15, 17],

  sound(e: GameEvent): SoundID | null {
    switch (e.type) {
      case 'merged':
        return ({ clean: 'merge', tightFit: 'tightFit', nearMiss: 'nearMiss', perfect: 'perfect', cutOff: 'cutOff' } as const)[e.rating];
      case 'crash':
        return e.isTakedown ? null : Feedback.crashSound(e);
      case 'comboChanged':
        return e.isTierUp ? 'comboUp' : null;
      case 'rushHour':
        return 'rushHour';
      case 'shiftEnded':
        if (e.result.detonated) return null;
        return e.result.outcome === 'completed' ? 'shiftComplete' : e.result.outcome === 'struckOut' || e.result.outcome === 'failed' ? 'shiftFailed' : null;
      case 'criminalWarning':
        return 'wanted';
      case 'takedown':
        return 'takedown';
      case 'dispatched':
        return 'dispatch';
      case 'criminalEscaped':
        return 'escaped';
      case 'transporterWarning':
        return 'secured';
      case 'transporterSeized':
      case 'transporterLost':
        return 'seized';
      case 'transporterPaid':
        return e.amount > 0 ? 'paid' : null;
      case 'heistRecovered':
        return 'paid';
      case 'modulePaid':
        return 'toll';
      case 'flowChanged':
        return e.isInFlow ? 'flowIn' : null;
      case 'towed':
        return 'tow';
      case 'criminalEntered':
        return 'screech';
      case 'militaryWarning':
        return 'alarm';
      case 'explosion':
        return e.kind === 'bomb' ? 'detonation' : 'explosion';
      default:
        return null;
    }
  },

  pitch(sound: SoundID, combo: number, serial: number): number {
    switch (sound) {
      case 'merge': {
        const step = Math.min(Math.max(combo - 1, 0), Feedback.comboLadder.length - 1);
        return Math.pow(2, Feedback.comboLadder[step] / 12);
      }
      case 'toll':
      case 'crashLight':
      case 'crash':
      case 'crashHeavy':
      case 'uiTick':
      case 'nearMiss':
        return 1 + 0.08 * (unitHash(serial, 97) - 0.5);
      default:
        return 1;
    }
  },

  crashSound(r: CrashReport): SoundID {
    const severity = CrashEffects.severity(r);
    if (severity < 0.75) return 'crashLight';
    return severity < CrashEffects.fireSeverity ? 'crash' : 'crashHeavy';
  },

  haptic(e: GameEvent): HapticID | null {
    switch (e.type) {
      case 'merged':
        return e.rating === 'cutOff' ? null : e.rating === 'clean' ? 'merge' : e.rating;
      case 'crash':
        return e.isStrike ? 'crash' : null;
      case 'comboChanged':
        return e.isTierUp ? 'comboUp' : null;
      case 'rushHour':
        return 'rushHour';
      case 'shiftEnded':
        return e.result.outcome === 'completed' ? 'shiftComplete' : null;
      case 'criminalWarning':
      case 'militaryWarning':
        return 'wanted';
      case 'takedown':
        return 'takedown';
      case 'transporterWarning':
        return 'secured';
      case 'transporterSeized':
      case 'transporterLost':
        return 'seized';
      case 'transporterPaid':
        return e.amount > 0 ? 'paid' : null;
      case 'heistRecovered':
        return 'paid';
      case 'flowChanged':
        return e.isInFlow ? 'flow' : null;
      case 'explosion':
        return 'explosion';
      default:
        return null;
    }
  },

  /** In the flow the merges are felt deeper and rounder; warnings stay sharp. */
  softness(h: HapticID, flow: number): number {
    switch (h) {
      case 'merge':
      case 'tightFit':
      case 'nearMiss':
      case 'perfect':
      case 'comboUp':
      case 'flow':
        return Math.min(Math.max(flow, 0), 1);
      default:
        return 0;
    }
  },

  /** Where in the world a sound comes from, for stereo placement; null plays in the middle. */
  origin(e: GameEvent): Vec2 | null {
    switch (e.type) {
      case 'merged':
        return e.position;
      case 'crash':
      case 'takedown':
      case 'transporterSeized':
      case 'transporterLost':
      case 'modulePaid':
      case 'explosion':
      case 'heistRecovered':
        return e.point;
      default:
        return null;
    }
  },

  cues(events: GameEvent[]): { sounds: SoundID[]; haptics: HapticID[]; origins: Map<SoundID, Vec2> } {
    let sounds: SoundID[] = [];
    let haptics: HapticID[] = [];
    const origins = new Map<SoundID, Vec2>();
    for (const e of events) {
      const s = Feedback.sound(e);
      if (s && !sounds.includes(s)) {
        sounds.push(s);
        const at = Feedback.origin(e);
        if (at) origins.set(s, at);
      }
      const h = Feedback.haptic(e);
      if (h && !haptics.includes(h)) haptics.push(h);
    }
    if (haptics.length > 1) haptics = haptics.filter((h) => h !== 'merge');
    const weights: SoundID[] = ['crashLight', 'crash', 'crashHeavy'];
    const heaviest = sounds.filter((s) => weights.includes(s)).sort((a, b) => weights.indexOf(b) - weights.indexOf(a))[0];
    if (heaviest) sounds = sounds.filter((s) => !weights.includes(s) || s === heaviest);
    return { sounds, haptics, origins };
  },

  /** Stereo position -1…1 of a screen x: never hard left or right, the ring stays one place. */
  pan(screenX: number, width: number): number {
    if (width <= 0) return 0;
    const x = (screenX - width / 2) / (width / 2);
    return Math.min(Math.max(x, -1), 1) * Feedback.panWidth;
  },

  panWidth: 0.6,
};

export type MusicLayer = 'base' | 'rhythm' | 'bass' | 'lead' | 'siren' | 'rush' | 'flow';
export const MUSIC_LAYERS: MusicLayer[] = ['base', 'rhythm', 'bass', 'lead', 'siren', 'rush', 'flow'];

/** Which stem plays how loud, and how far the whole music is closed by the low-pass. */
export interface MusicMix {
  volumes: Partial<Record<MusicLayer, number>>;
  lowPass: number;
}

export const Music = {
  silent: { volumes: {}, lowPass: 0 } as MusicMix,
  breathDepth: 0.85,

  /** 20 kHz (open) down to 350 Hz, geometric so the steps are even to the ear. */
  cutoff: (lowPass: number): number => 20000 * Math.pow(350 / 20000, Math.min(Math.max(lowPass, 0), 1)),

  /** The music breathes in when a criminal is announced or rush hour begins. */
  breath(t: number): number {
    const attack = 0.12;
    const hold = 0.35;
    const release = 0.9;
    if (t < 0) return 0;
    if (t < attack) return Ease.outCubic(t / attack);
    if (t < attack + hold) return 1;
    if (t < attack + hold + release) return 1 - Ease.inOutSine((t - attack - hold) / release);
    return 0;
  },

  playing(world: World, flow: number): MusicMix {
    const c = world.config;
    const tier = Scoring.tier(world.score.combo, c);
    const k = world.criminal.kind;
    const volumes: Partial<Record<MusicLayer, number>> = {
      base: 1,
      rhythm: tier >= 1 ? 1 : 0,
      bass: tier >= 2 ? 0.8 : 0,
      lead: tier >= 3 ? 0.9 : 0,
      siren: k === 'warning' || k === 'arriving' || k === 'active' ? 0.7 : 0,
      rush: world.shift.isRushHour ? 1 : 0,
      flow: Math.min(Math.max(flow, 0), 1) * 0.8,
    };
    let breath = 0;
    if (world.criminal.kind === 'warning') breath = Music.breath(world.time - (world.criminal.until - c.criminalWarning));
    const rush = world.shift.rushHourSince;
    if (rush !== null) breath = Math.max(breath, Music.breath(world.time - rush));
    return { volumes, lowPass: breath * Music.breathDepth };
  },
};
