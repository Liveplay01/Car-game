import type { GameEvent, CrashReport, VersusPhase } from '../core/events';
import type { World } from '../core/world';
import type { VehicleType } from '../core/vehicle';
import { Scoring } from '../core/scoring';
import type { Vec2 } from '../core/vec2';
import { Ease, unitHash } from './render';
import { CrashEffects } from './effects';
import { clamp } from '../core/vec2';

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
  | 'alarm'
  /** The special vehicles' own warnings, a refused rescue and a hit on armour (samples rendered by `Web/audio-src/make_street_sounds.py`). */
  | 'ambulance'
  | 'wedding'
  | 'oversize'
  | 'learner'
  /** A driver at the line who has waited too long (Leo, 24.10.2026): the same note for every vehicle, played slower for a lorry. */
  | 'honk'
  | 'clang'
  | 'blocked'
  /** The low body under a hard crash (same script). */
  | 'thump'
  /** Made in `audio/player.ts` (no sample): a Critical Merge, a Jackpot paid, and the chest reel. */
  | 'critical'
  | 'jackpot'
  /** A tap that cannot be taken yet: a short, dull knock. */
  | 'notYet'
  /** The last car of a won shift drives off, and the traffic hushes for a moment. */
  | 'departure'
  /** A soft bell on the combo's note, under every merge that is not a plain one: a run of good merges plays a tune in the music's key. */
  | 'note'
  | 'chestHit'
  | 'reelSpin'
  | 'reelTick'
  | 'shimmer'
  | 'reelLand'
  | 'reelLandBig'
  /** A crash forgiven: the shield, or a police car within its limit. */
  | 'heal'
  /** The menus' own, made in `audio/player.ts` and kept barely audible: a sheet rising and settling, a bar that began to grow. */
  | 'sheetOpen'
  | 'sheetClose'
  | 'barFill'
  /** The casino's own: samples rendered by `Web/audio-src/make_casino_sounds.py`. */
  | 'casinoStop'
  | 'coinClink'
  | 'needleTick'
  | 'meterTick'
  | 'coinToss'
  | 'coinLand'
  | 'chipsIn'
  | 'shatter'
  /** The photo of a shift (same script). */
  | 'shutter'
  /** Switches and segments: the tick-tack of an indicator relay instead of a click (same script). */
  | 'blinker';

export const SOUND_IDS: SoundID[] = [
  'merge', 'toll', 'tightFit', 'nearMiss', 'perfect', 'cutOff', 'comboUp', 'crashLight', 'crash', 'crashHeavy', 'rushHour',
  'shiftComplete', 'shiftFailed', 'wanted', 'takedown', 'dispatch', 'escaped', 'paid', 'secured', 'seized', 'screech', 'tow',
  'flowIn', 'go', 'swoosh', 'uiTick', 'purchase', 'build', 'denied', 'chestCharge', 'chestBurst', 'chestBurstRare',
  'explosion', 'detonation', 'alarm', 'ambulance', 'wedding', 'honk', 'oversize', 'learner', 'clang', 'blocked', 'thump',
  'casinoStop', 'coinClink', 'needleTick', 'meterTick', 'coinToss', 'coinLand', 'chipsIn', 'shatter', 'shutter', 'blinker',
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
  | 'explosion'
  /** Multiplayer: the instant answer to a tap, before the car moves (the input delay). */
  | 'tap'
  | 'critical'
  /** The syndicate boss taken down: a double thump. */
  | 'bossTakedown'
  /** A card under the chest reel's marker, and the reel landing on the prize. */
  | 'reelTick'
  | 'reelStop'
  /**
   * Off the road (Leo, 16.10.2026), quiet to strong: a fast list bumping its end, a part landing on its slot,
   * a refusal, a purchase or build that went through, and a goal reached on the Progress page.
   */
  | 'edge'
  /** A swipe past the last segment: two ticks, like a rumble strip. */
  | 'rumble'
  | 'snap'
  | 'denied'
  | 'confirm'
  | 'earned';

/**
 * Turns game events into sound and haptics: the more often something
 * happens, the less it does. Launching a car gives no feedback; the car moving is the feedback.
 */
export const Feedback = {
  /** A clean merge climbs the A-minor pentatonic with the combo, the key the music plays in. */
  /** The merge sound climbs the minor pentatonic with the combo: two octaves, so a long combo still climbs (to 11). */
  comboLadder: [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24],

  sound(e: GameEvent): SoundID | null {
    switch (e.type) {
      case 'merged':
        if (e.critical) return 'critical';
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
        return e.amount > 0 ? (e.jackpot ? 'jackpot' : 'paid') : null;
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
      case 'ambulanceWarning':
        return 'ambulance';
      case 'learnerWarning':
        return 'learner';
      case 'oversizeWarning':
        return 'oversize';
      case 'weddingWarning':
        return 'wedding';
      case 'raceWarning':
        return 'screech';
      case 'racerStopped':
        return 'takedown';
      case 'ambulanceBlocked':
        return 'blocked';
      case 'tapRejected':
        return 'notYet';
      case 'ambulanceCleared':
      case 'learnerPassed':
      case 'oversizePassed':
      case 'weddingPassed':
        return 'paid';
      case 'armourHit':
        return 'clang';
      default:
        return null;
    }
  },

  pitch(sound: SoundID, combo: number, serial: number): number {
    switch (sound) {
      case 'merge':
      case 'note':
        // The melody takes the combo itself, not a ratio.
        return combo;
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
        if (e.critical) return 'critical';
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
        return e.amount > 0 ? (e.jackpot ? 'chest' : 'paid') : null;
      case 'heistRecovered':
        return 'bossTakedown';
      case 'flowChanged':
        return e.isInFlow ? 'flow' : null;
      case 'explosion':
        return 'explosion';
      case 'ambulanceWarning':
        return 'secured';
      case 'ambulanceCleared':
        return 'paid';
      case 'armourHit':
        return 'takedown';
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
        return clamp(flow, 0, 1);
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
      case 'armourHit':
      case 'ambulanceBlocked':
      case 'ambulanceCleared':
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
      // A merge that is more than a plain one rings its note too, so every good merge of a run is a step of the tune.
      if (e.type === 'merged' && !e.critical && (e.rating === 'perfect' || e.rating === 'tightFit' || e.rating === 'nearMiss') && !sounds.includes('note')) {
        sounds.push('note');
        origins.set('note', e.position);
      }
    }
    if (haptics.length > 1) haptics = haptics.filter((h) => h !== 'merge');
    if (sounds.includes('shiftComplete')) sounds.push('departure');
    const weights: SoundID[] = ['crashLight', 'crash', 'crashHeavy'];
    const heaviest = sounds.filter((s) => weights.includes(s)).sort((a, b) => weights.indexOf(b) - weights.indexOf(a))[0];
    if (heaviest) sounds = sounds.filter((s) => !weights.includes(s) || s === heaviest);
    if (heaviest === 'crashHeavy') {
      sounds.push('thump');
      const at = origins.get('crashHeavy');
      if (at) origins.set('thump', at);
    }
    return { sounds, haptics, origins };
  },

  /** Stereo position -1…1 of a screen x: never hard left or right, the ring stays one place. */
  pan(screenX: number, width: number): number {
    if (width <= 0) return 0;
    const x = (screenX - width / 2) / (width / 2);
    return clamp(x, -1, 1) * Feedback.panWidth;
  },

  panWidth: 0.6,
};

export type MusicLayer = 'base' | 'rhythm' | 'bass' | 'lead' | 'siren' | 'rush' | 'flow';
export const MUSIC_LAYERS: MusicLayer[] = ['base', 'rhythm', 'bass', 'lead', 'siren', 'rush', 'flow'];

/** Which stem plays how loud, and how far the whole music is closed by the low-pass. */
export interface MusicMix {
  volumes: Partial<Record<MusicLayer, number>>;
  lowPass: number;
  /** The combo on the road: when it drops, the merge melody fades out (`Melody`). Left out where there is no combo. */
  combo?: number;
}

/** What the sky sounds like: how hard it rains (0…1), and how many flashes of lightning there have been (thunder follows each). */
export interface WeatherSound {
  rain: number;
  strikes: number;
}

/** The engine a vehicle sounds like (`audio-src/make_traffic_sounds.py`); the drift car has its own, null. */
export type TrafficEngine = 'car' | 'sport' | 'diesel' | 'truck' | 'bike';
export const TRAFFIC_ENGINES: TrafficEngine[] = ['car', 'sport', 'diesel', 'truck', 'bike'];

export function engineOf(t: VehicleType): TrafficEngine | null {
  switch (t) {
    case 'drift':
      return null;
    case 'sportsCar':
    case 'racer':
    case 'police':
    case 'pickup':
      return 'sport';
    case 'van':
    case 'ambulance':
    case 'transporter':
      return 'diesel';
    case 'truck':
    case 'tanker':
    case 'military':
    case 'bus':
    case 'fireTruck':
    case 'oversize':
      return 'truck';
    case 'motorbike':
      return 'bike';
    default:
      return 'car';
  }
}

/** One vehicle for the traffic bed: its speed as a share of the ring's, its load 0â€¦1 (pulling away to braking), where it is. */
export interface TrafficSound {
  id: number;
  engine: TrafficEngine;
  speed: number;
  load: number;
  /** On the ring (or leaving it), as against waiting, queued or merging. */
  ring: boolean;
  x: number;
  y: number;
}

/** The drift car on the ring (`DriftFx.sound`): on or off the throttle, how hard it slides and its wheels spin, every lift so far. */
export interface DriftSound {
  throttle: boolean;
  slide: number;
  spin: number;
  lifts: number;
  pan: number;
  leaving: boolean;
}

export const Sky = {
  /** Rain by `weatherSeverity`: none, light, heavy, storm, extreme. */
  rain: [0, 0.3, 0.55, 0.8, 1],
};

/**
 * The merge melody (`AudioPlayer.melody`): every good merge adds the note of its combo to the music, in A minor pentatonic, the
 * key of the stems. Pitches are semitones above A4; phrases play on eighths of the music's grid when the combo reaches them.
 */
export const Melody = {
  root: 440,
  level: 0.15,
  /** Seconds a note rings, and the time constant of the fade when the combo breaks. */
  ring: 0.42,
  fade: 0.12,
  /** Under a note (a phrase: from its first to its last) the competing mids step back to these shares; seconds to get there, to hold after the last note, to return. */
  room: { traffic: 0.55, music: 0.8, warn: 0.6, attack: 0.02, hold: 0.25, release: 0.25 },
  /** `harmony`: a second voice this many semitones away, softer. The 20 answers the 5 and the 10 from below. */
  phrases: [
    { combo: 5, notes: [0, 3, 5, 7, 12] },
    { combo: 10, notes: [7, 10, 12, 10, 15, 19] },
    { combo: 20, notes: [12, 10, 7, 5, 3, 0], harmony: -12 },
  ] as { combo: number; notes: number[]; harmony?: number }[],
};

export const Music = {
  silent: { volumes: {}, lowPass: 0 } as MusicMix,
  breathDepth: 0.85,
  /** The criminal's siren stem, as a share of its full volume (was 0.7). */
  sirenStem: 0.4,

  /** 20 kHz (open) down to 350 Hz, geometric so the steps are even to the ear. */
  cutoff: (lowPass: number): number => 20000 * Math.pow(350 / 20000, clamp(lowPass, 0, 1)),

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

  /**
   * A multiplayer match: the stems build up with the phases (rush hour brings the rush stem,
   * sudden death the lead and a siren), each new phase breathes in, and in the final duel the
   * music closes to a muffled heartbeat.
   */
  versus(o: { phase: VersusPhase; sincePhase: number; duel: boolean; time: number; countIn: boolean; over: boolean; won: boolean }): MusicMix {
    if (o.countIn) return { volumes: { base: 0.6 }, lowPass: 0.35 };
    if (o.over) return o.won ? { volumes: { base: 1, rhythm: 1, flow: 0.8 }, lowPass: 0 } : { volumes: { base: 0.7 }, lowPass: 0.55 };
    const volumes: Partial<Record<MusicLayer, number>> = {
      base: 1,
      rhythm: 1,
      bass: o.phase >= 1 || o.duel ? 0.8 : 0,
      rush: o.phase >= 1 ? 1 : 0,
      lead: o.phase >= 2 ? 0.9 : 0,
      siren: o.phase >= 2 ? 0.5 : 0,
    };
    let lowPass = o.phase > 0 ? Music.breath(o.sincePhase) * Music.breathDepth : 0;
    if (o.duel) {
      // Lub-dub at 72 bpm: the filter opens a little on each beat.
      const t = o.time % (60 / 72);
      const beat = Math.min(1, Math.exp(-t / 0.07) + (t >= 0.2 ? 0.7 * Math.exp(-(t - 0.2) / 0.07) : 0));
      lowPass = Math.max(lowPass, 0.62 - 0.3 * beat);
    }
    return { volumes, lowPass };
  },

  /** `record`: the best in sight (`Goals.record`), its closeness builds bass and lead, and beating it (`beatAt`, world time) breathes in. */
  playing(world: World, flow: number, record: { near: number; beatAt: number | null } | null = null): MusicMix {
    const c = world.config;
    const tier = Scoring.tier(world.score.combo, c);
    const k = world.criminal.kind;
    const near = record?.near ?? 0;
    const volumes: Partial<Record<MusicLayer, number>> = {
      base: 1,
      rhythm: tier >= 1 || near > 0 ? 1 : 0,
      bass: Math.max(tier >= 2 ? 0.8 : 0, 0.8 * near),
      lead: Math.max(tier >= 3 ? 0.9 : 0, 0.9 * near * near),
      siren: k === 'warning' || k === 'arriving' || k === 'active' ? Music.sirenStem : 0,
      rush: world.shift.isRushHour ? 1 : 0,
      flow: clamp(flow, 0, 1) * 0.8,
    };
    let breath = 0;
    if (world.criminal.kind === 'warning') breath = Music.breath(world.time - (world.criminal.until - c.criminalWarning));
    const rush = world.shift.rushHourSince;
    if (rush !== null) breath = Math.max(breath, Music.breath(world.time - rush));
    if (record?.beatAt != null) breath = Math.max(breath, Music.breath(world.time - record.beatAt));
    return { volumes, lowPass: breath * Music.breathDepth, combo: world.score.combo };
  },
};
