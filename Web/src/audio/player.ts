import { type SoundID, type HapticID, type MusicMix, type MusicLayer, type WeatherSound, type DriftSound, type TrafficSound, type TrafficEngine, TRAFFIC_ENGINES, SOUND_IDS, MUSIC_LAYERS, Music } from '../present/feedback';
import { clamp } from '../core/vec2';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const base = import.meta.env.BASE_URL;

interface Voice {
  priority: number;
  at: number;
  src: AudioBufferSourceNode;
  gain: GainNode;
}

/** The drift car's loops and its one-shot (`audio-src/make_drift_sounds.py`), loaded when the first one comes. */
const DRIFT_SAMPLES = ['engineOn', 'engineOff', 'turbo', 'squeal', 'spin', 'blowOff', 'flutter'] as const;
/** The flutter sample's chirps: seven, this far apart (`FLUTTER_PERIOD` in the script); a lift plays three to seven. */
const FLUTTER_PERIOD = 0.034;
type DriftSample = (typeof DRIFT_SAMPLES)[number];

/** The traffic's engine loops and the road under them (`audio-src/make_traffic_sounds.py`), loaded with the first traffic. */
const TRAFFIC_SAMPLES = [...TRAFFIC_ENGINES, 'road'] as const;
type TrafficSample = TrafficEngine | 'road';

interface TrafficVoice {
  engine: TrafficEngine;
  src: AudioBufferSourceNode;
  gain: GainNode;
  pan: StereoPannerNode;
  /** Its own note, a few percent off the loop's. */
  pitch: number;
  /** Seconds since it fell out of the nearest few. */
  fading: number;
}

interface DriftVoice {
  out: GainNode;
  pan: StereoPannerNode;
  layers: Map<DriftSample, { src: AudioBufferSourceNode; gain: GainNode }>;
  /** 0 off the throttle, 1 on it; the revs and the boost, 0…1. */
  mix: number;
  rpm: number;
  boost: number;
  lifts: number;
  silent: number;
}

interface RainVoice {
  gain: GainNode;
  hiss: BiquadFilterNode;
  body: GainNode;
}

/**
 * The real sounds and the adaptive music (`AppAudio`, `AppMusic`): every effect is a
 * decoded sample played at the pitch `Feedback` asks for; the stems loop together, each
 * faded towards its `MusicMix` volume, all through one low-pass filter so the music can
 * breathe in. Browsers only start audio after a gesture: `unlock()` on the first press.
 */
export class AudioPlayer {
  static readonly sfxVolume = 0.8;
  static readonly musicMaster = 0.35;
  static readonly trafficVolume = 0.3;
  static readonly fade = 0.8;

  private static readonly maxVoices = 14;
  private static readonly loadBatch = 8;

  /** Who stays when the voices run out (default 1): the big hits and the end of a shift, then warnings, then the small ticks. */
  private static readonly priority: Partial<Record<SoundID, number>> = {
    crash: 3, crashHeavy: 3, thump: 3, explosion: 3, detonation: 3, shiftComplete: 3, shiftFailed: 3,
    crashLight: 2, wanted: 2, alarm: 2, ambulance: 2, oversize: 2, wedding: 2, dispatch: 2, takedown: 2, secured: 2, seized: 2, rushHour: 2, paid: 2, escaped: 2,
    chestBurst: 2, chestBurstRare: 2,
    toll: 0, uiTick: 0, meterTick: 0, needleTick: 0,
  };

  /** How far the pitch of a sound that comes again and again wanders (fraction of the pitch), so no two hits are identical. */
  private static readonly spread: Partial<Record<SoundID, number>> = {
    merge: 0.004, tightFit: 0.012, perfect: 0.012, cutOff: 0.015, takedown: 0.012, paid: 0.01, screech: 0.015, clang: 0.012,
  };

  /** The big hits push the music and the weather down for a moment (how far, how long) so they land clean. */
  private static readonly ducks: Partial<Record<SoundID, [depth: number, hold: number]>> = {
    crash: [0.7, 0.12], crashHeavy: [0.5, 0.3], explosion: [0.45, 0.5], detonation: [0.35, 0.9],
  };

  /** Menus, chests and the casino: their own bus, never ducked, never in the way of the street. */
  private static readonly uiSounds = new Set<SoundID>([
    'uiTick', 'swoosh', 'purchase', 'build', 'denied', 'chestCharge', 'chestBurst', 'chestBurstRare', 'chestHit', 'casinoStop',
    'coinClink', 'needleTick', 'meterTick', 'coinToss', 'coinLand', 'chipsIn', 'shatter', 'shutter', 'reelSpin', 'reelTick',
    'shimmer', 'reelLand', 'reelLandBig', 'sheetOpen', 'sheetClose', 'barFill',
  ]);

  private ctx: AudioContext | null = null;
  private sfx: GainNode | null = null;
  private ui: GainNode | null = null;
  private ambient: GainNode | null = null;
  /** The traffic's bed: quiet, and ducked with the music by the big hits. */
  private traffic: GainNode | null = null;
  private bed: GainNode | null = null;
  private voices: Voice[] = [];
  private buffers = new Map<SoundID, AudioBuffer>();
  private lastStart = new Map<SoundID, number>();
  private music: { filter: BiquadFilterNode; gains: Map<MusicLayer, GainNode>; started: boolean } | null = null;
  private stemBuffers = new Map<MusicLayer, AudioBuffer>();
  private volumes = new Map<MusicLayer, number>();
  private loading: Promise<void> | null = null;

  /** Call from a user gesture; later calls only resume a suspended context. */
  unlock(): void {
    this.warm();
    // Refused outside a gesture the browser accepts: the next tap asks again.
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => undefined);
  }

  /**
   * Builds the context and starts loading the samples before the first tap, so that tap pays for neither. The
   * context stays suspended until `unlock` runs in a gesture.
   */
  warm(): void {
    if (this.ctx) return;
    const AC = window.AudioContext ?? window.webkitAudioContext;
    if (!AC) return;
    let ctx: AudioContext;
    try {
      ctx = new AC({ latencyHint: 'interactive' });
    } catch {
      // No audio on this device right now (an embedded iOS view can refuse it): the game plays on silent, the next tap tries again.
      return;
    }
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.ratio.value = 8;
    limiter.release.value = 0.12;
    limiter.connect(ctx.destination);
    const bus = (volume: number, to: AudioNode): GainNode => {
      const g = ctx.createGain();
      g.gain.value = volume;
      g.connect(to);
      return g;
    };
    // Music and weather share the bed, which the big hits duck.
    const bed = bus(1, limiter);
    const sfx = bus(AudioPlayer.sfxVolume, limiter);
    this.ui = bus(AudioPlayer.sfxVolume, limiter);
    this.ambient = bus(AudioPlayer.sfxVolume, bed);
    this.traffic = bus(AudioPlayer.trafficVolume, bed);
    this.bed = bed;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = Music.cutoff(0);
    filter.Q.value = 0.7;
    filter.connect(bed);
    const gains = new Map<MusicLayer, GainNode>();
    for (const layer of MUSIC_LAYERS) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(filter);
      gains.set(layer, g);
    }
    this.ctx = ctx;
    this.sfx = sfx;
    this.music = { filter, gains, started: false };
    this.loading = this.load(ctx);
  }

  private async load(ctx: AudioContext): Promise<void> {
    const fetchBuffer = async (path: string): Promise<AudioBuffer | null> => {
      try {
        const res = await fetch(base + path);
        if (!res.ok) return null;
        return await ctx.decodeAudioData(await res.arrayBuffer());
      } catch {
        return null;
      }
    };
    // In small groups: fifty fetches and decodes at once would stall the page.
    for (let i = 0; i < SOUND_IDS.length; i += AudioPlayer.loadBatch) {
      await Promise.all(
        SOUND_IDS.slice(i, i + AudioPlayer.loadBatch).map(async (id) => {
          const b = await fetchBuffer(`audio/sounds/${id}.m4a`);
          if (b) this.buffers.set(id, b);
        }),
      );
    }
    await Promise.all(
      MUSIC_LAYERS.map(async (layer) => {
        const b = await fetchBuffer(`audio/music/${layer}.m4a`);
        if (b) this.stemBuffers.set(layer, b);
      }),
    );
    this.startStems();
  }

  /** All stems start on the same clock tick, so the loops stay together. */
  private startStems(): void {
    const ctx = this.ctx;
    const music = this.music;
    if (!ctx || !music || music.started || this.stemBuffers.size === 0) return;
    music.started = true;
    const at = ctx.currentTime + 0.15;
    for (const [layer, buffer] of this.stemBuffers) {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.connect(music.gains.get(layer)!);
      src.start(at);
    }
  }

  play(id: SoundID, pitch: number, pan = 0): void {
    const ctx = this.ctx;
    const out = AudioPlayer.uiSounds.has(id) ? this.ui : this.sfx;
    if (!ctx || !out || ctx.state !== 'running') return;
    if (this.synth(id, ctx, out, pan, pitch)) return;
    const buffer = this.buffers.get(id);
    if (!buffer) return;
    // The same sound twice within a few ms is one sound (a pile-up in one frame).
    const now = ctx.currentTime;
    if (now - (this.lastStart.get(id) ?? -1) < 0.025) return;
    const priority = AudioPlayer.priority[id] ?? 1;
    if (!this.claimVoice(priority, now)) return;
    this.lastStart.set(id, now);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = pitch * (1 + (AudioPlayer.spread[id] ?? 0) * (Math.random() * 2 - 1));
    // About one dB either way, so a run of the same sound never repeats exactly.
    const gain = ctx.createGain();
    gain.gain.value = 1 + 0.12 * (Math.random() * 2 - 1);
    src.connect(gain);
    // Where it happens on screen: a crash on the left is heard on the left (headphones).
    if (Math.abs(pan) > 0.02 && typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      gain.connect(panner);
      panner.connect(out);
    } else {
      gain.connect(out);
    }
    const voice: Voice = { priority, at: now, src, gain };
    src.onended = () => {
      src.disconnect();
      gain.disconnect();
      this.voices = this.voices.filter((v) => v !== voice);
    };
    this.voices.push(voice);
    src.start();
    const duck = AudioPlayer.ducks[id];
    if (duck) this.duck(duck[0], duck[1]);
  }

  /** Room for one more sample: when all voices are busy the weakest, oldest one goes (a quick fade), unless the new one is weaker still. */
  private claimVoice(priority: number, now: number): boolean {
    if (this.voices.length < AudioPlayer.maxVoices) return true;
    const weakest = this.voices.reduce((a, b) => (b.priority < a.priority || (b.priority === a.priority && b.at < a.at) ? b : a));
    if (weakest.priority > priority) return false;
    weakest.gain.gain.setTargetAtTime(0, now, 0.01);
    weakest.src.stop(now + 0.06);
    this.voices = this.voices.filter((v) => v !== weakest);
    return true;
  }

  private duck(depth: number, hold: number): void {
    const ctx = this.ctx;
    const gain = this.bed?.gain;
    if (!ctx || !gain) return;
    const now = ctx.currentTime;
    gain.cancelScheduledValues(now);
    gain.setTargetAtTime(Math.min(gain.value, depth), now, 0.012);
    gain.setTargetAtTime(1, now + hold, 0.3);
  }

  /**
   * The two sounds without a sample, made from the samples they grow out of plus a few
   * oscillators: a Critical Merge is the Perfect with a sub-bass hit under it and a bright
   * fifth over it; a Jackpot is the pay-out with a rising A-major arpeggio (the key of the music).
   */
  private synth(id: SoundID, ctx: AudioContext, out: GainNode, pan: number, pitch = 1): boolean {
    if (!AudioPlayer.synthIds.includes(id)) return false;
    const now = ctx.currentTime;
    if (now - (this.lastStart.get(id) ?? -1) < 0.025) return true;
    this.lastStart.set(id, now);
    const noise = (at: number, length: number, from: number, to: number, level: number, rate = 0): void => {
      const frames = Math.ceil(ctx.sampleRate * length);
      const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.Q.value = 1.2;
      band.frequency.setValueAtTime(from, now + at);
      band.frequency.exponentialRampToValueAtTime(to, now + at + length);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(level, now + at + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + length);
      src.connect(band);
      band.connect(gain);
      // A rattle: the level flutters at `rate` per second, slowing as the reel does.
      if (rate > 0) {
        const lfo = ctx.createOscillator();
        const depth = ctx.createGain();
        lfo.type = 'square';
        lfo.frequency.setValueAtTime(rate, now + at);
        lfo.frequency.exponentialRampToValueAtTime(rate * 0.35, now + at + length);
        depth.gain.value = level * 0.6;
        lfo.connect(depth);
        depth.connect(gain.gain);
        lfo.start(now + at);
        lfo.stop(now + at + length + 0.02);
      }
      gain.connect(out);
      src.start(now + at);
      src.stop(now + at + length + 0.02);
    };
    const tone = (type: OscillatorType, from: number, to: number, at: number, length: number, level: number): void => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(from, now + at);
      if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, now + at + length);
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(level, now + at + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + length);
      osc.connect(gain);
      gain.connect(out);
      osc.start(now + at);
      osc.stop(now + at + length + 0.02);
    };
    switch (id) {
      case 'critical':
        this.play('perfect', 1, pan);
        tone('sine', 110, 42, 0, 0.32, 0.9);
        tone('triangle', 1760, 1760, 0.03, 0.22, 0.12);
        tone('triangle', 2637, 2637, 0.05, 0.26, 0.08);
        break;
      case 'jackpot':
        this.play('paid', 1, pan);
        [880, 1109, 1319, 1760].forEach((f, i) => tone('triangle', f, f, 0.05 + i * 0.065, 0.3, 0.14));
        tone('sine', 98, 55, 0, 0.35, 0.7);
        break;
      case 'chestHit':
        // A tap on the chest: a knock with a crack on top, brighter with every tap (`pitch` climbs).
        tone('sine', 170 * pitch, 60, 0, 0.14, 0.8);
        noise(0, 0.07, 3200 * pitch, 1100, 0.3);
        tone('triangle', 660 * pitch, 660 * pitch, 0.02, 0.18, 0.08);
        break;
      case 'reelSpin':
        // The reel setting off: a full, rolling whirr that slows down with it.
        noise(0, 1.6, 2400, 700, 0.22, 34);
        tone('sine', 70, 48, 0, 0.5, 0.3);
        break;
      case 'reelTick': {
        // `pitch` 0.55 (crawling) … 1.3 (spinning): slow ticks are deeper, louder, with a knock under them.
        const slow = clamp((1.3 - pitch) / 0.75, 0, 1);
        tone('square', 1800 * pitch, 1200 * pitch, 0, 0.035, 0.05 + 0.12 * slow);
        if (slow > 0.3) tone('sine', 150 * pitch, 70, 0, 0.09, 0.5 * slow);
        break;
      }
      case 'shimmer':
        // An Epic or Legendary card running past: a short, glassy ping.
        tone('sine', 2093 * pitch, 2093 * pitch, 0, 0.3, 0.1);
        tone('sine', 3136 * pitch, 3136 * pitch, 0.02, 0.26, 0.06);
        break;
      case 'heal':
        // A crash forgiven: a soft chord climbing up, under the crash itself.
        [1047, 1319, 1568].forEach((f, i) => tone('sine', f * pitch, f * pitch, i * 0.07, 0.4, 0.09));
        tone('triangle', 2093 * pitch, 2093 * pitch, 0.2, 0.35, 0.04);
        break;
      case 'sheetOpen':
        // A sheet rising: two soft sine notes, the second a fifth above, hardly more than a breath.
        tone('sine', 523, 523, 0, 0.16, 0.045);
        tone('sine', 784, 784, 0.045, 0.2, 0.028);
        break;
      case 'sheetClose':
        // The same two notes falling, a little quieter: it settles back.
        tone('sine', 784, 784, 0, 0.12, 0.026);
        tone('sine', 523, 523, 0.04, 0.16, 0.036);
        break;
      case 'barFill':
        // A bar that began to grow: one soft rising glide, higher the fuller the bar (`pitch`, a pentatonic step).
        tone('sine', 330 * pitch, 440 * pitch, 0, 0.45, 0.03);
        break;
      case 'reelLand':
        tone('sine', 120, 55, 0, 0.22, 0.8);
        tone('square', 900, 600, 0, 0.05, 0.12);
        break;
      case 'reelLandBig':
        // A Legendary: a deep boom under a bright chord, held through the freeze.
        tone('sine', 90, 32, 0, 0.7, 1);
        [1319, 1661, 1976, 2637].forEach((f, i) => tone('triangle', f, f, 0.12 + i * 0.03, 0.8, 0.09));
        break;
    }
    return true;
  }

  private static readonly synthIds: SoundID[] = [
    'critical', 'jackpot', 'chestHit', 'reelSpin', 'reelTick', 'shimmer', 'reelLand', 'reelLandBig', 'heal', 'sheetOpen', 'sheetClose', 'barFill',
  ];

  /** Once per frame: each stem glides towards its volume, the filter follows the breath. */
  /** The casino's tension (`GameSession.tension`): a riser and a heartbeat, built lazily. */
  private tensionVoice: { gain: GainNode; filter: BiquadFilterNode; engine: OscillatorNode[]; whine: OscillatorNode; whineGain: GainNode } | null = null;
  private heartbeat = 0;

  /**
   * 0 is silence; towards 1 an engine climbs and whines like a turbine, and under it a
   * heartbeat thumps faster and louder (lub-dub). Called every frame, like the music.
   */
  updateTension(level: number, enabled: boolean, delta: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.ambient || ctx.state !== 'running') return;
    const on = enabled && level > 0.001 ? Math.min(1, level) : 0;
    if (on === 0 && !this.tensionVoice) return;
    if (!this.tensionVoice) {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 6;
      filter.connect(gain);
      gain.connect(this.ambient);
      const engine = [0, 7].map((detune) => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.detune.value = detune;
        osc.connect(filter);
        osc.start();
        return osc;
      });
      const whineGain = ctx.createGain();
      whineGain.gain.value = 0;
      whineGain.connect(this.ambient);
      const whine = ctx.createOscillator();
      whine.type = 'sine';
      whine.connect(whineGain);
      whine.start();
      this.tensionVoice = { gain, filter, engine, whine, whineGain };
    }
    const v = this.tensionVoice;
    const now = ctx.currentTime;
    for (const osc of v.engine) osc.frequency.setTargetAtTime(55 + 165 * on, now, 0.05);
    v.filter.frequency.setTargetAtTime(260 + 2200 * on * on, now, 0.05);
    v.gain.gain.setTargetAtTime(on > 0 ? 0.025 + 0.07 * on : 0, now, on > 0 ? 0.06 : 0.12);
    v.whine.frequency.setTargetAtTime(700 + 1500 * on, now, 0.05);
    v.whineGain.gain.setTargetAtTime(on > 0.3 ? 0.012 * (on - 0.3) : 0, now, 0.08);
    if (on === 0) {
      this.heartbeat = 0;
      return;
    }
    // The heart: from about 60 to 140 beats a minute.
    this.heartbeat -= delta;
    if (this.heartbeat > 0) return;
    this.heartbeat = 60 / (60 + 80 * on);
    const thump = (at: number, level: number): void => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(72, now + at);
      osc.frequency.exponentialRampToValueAtTime(38, now + at + 0.16);
      g.gain.setValueAtTime(0.0001, now + at);
      g.gain.exponentialRampToValueAtTime(level, now + at + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.18);
      osc.connect(g);
      g.connect(this.ambient!);
      osc.start(now + at);
      osc.stop(now + at + 0.2);
    };
    const loud = 0.25 + 0.45 * on;
    thump(0, loud);
    thump(0.17, loud * 0.6);
  }

  private driftVoice: DriftVoice | null = null;
  private driftBuffers: Map<DriftSample, AudioBuffer> | null = null;
  private driftLoading = false;

  /**
   * The drift car, called every frame: loops rendered by `audio-src/make_drift_sounds.py`, mixed by what the car
   * does. The engine cross-fades from the limiter on the throttle to the burble off it, the revs bend the pitch;
   * the turbo spools up behind the throttle and the blow-off valve flutters on every lift; the tyres squeal with
   * the slide and roar while they spin at the line.
   */
  updateDrift(car: DriftSound | null, enabled: boolean, delta: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfx || ctx.state !== 'running') return;
    const on = enabled && car !== null;
    if (on && !this.driftBuffers) {
      if (!this.driftLoading) this.loadDrift(ctx);
      return;
    }
    if (!on && !this.driftVoice) return;
    const buffers = this.driftBuffers;
    if (!buffers) return;
    const v = this.driftVoice ?? (this.driftVoice = this.startDrift(ctx, this.sfx, buffers, car?.lifts ?? 0));
    const now = ctx.currentTime;
    if (!on || !car) {
      v.out.gain.setTargetAtTime(0, now, 0.25);
      v.silent += delta;
      if (v.silent > 2) {
        for (const layer of v.layers.values()) layer.src.stop();
        v.out.disconnect();
        this.driftVoice = null;
      }
      return;
    }
    v.silent = 0;
    const toward = (rate: number): number => Math.min(1, delta * rate);
    v.mix += ((car.throttle ? 1 : 0) - v.mix) * toward(car.throttle ? 14 : 6);
    v.rpm += ((car.throttle ? 1 : car.leaving ? 0.35 : 0.55) - v.rpm) * toward(car.throttle ? 5 : 2.5);
    v.boost += ((car.throttle ? 1 : 0) - v.boost) * toward(car.throttle ? 1.6 : 10);
    const set = (layer: DriftSample, gain: number, rate: number): void => {
      const l = v.layers.get(layer);
      if (!l) return;
      l.gain.gain.setTargetAtTime(gain, now, 0.03);
      l.src.playbackRate.setTargetAtTime(rate, now, 0.03);
    };
    const slide = Math.min(1, car.slide);
    set('engineOn', 0.7 * v.mix, 0.86 + 0.14 * v.rpm);
    set('engineOff', 0.55 * (1 - v.mix), 0.8 + 0.35 * v.rpm);
    set('turbo', 0.2 * v.boost * v.boost, 0.55 + 0.5 * v.boost);
    set('squeal', 0.5 * slide ** 1.5, 0.92 + 0.12 * slide);
    set('spin', 0.6 * car.spin, 0.95 + 0.1 * car.spin);
    v.pan.pan.setTargetAtTime(car.pan, now, 0.1);
    v.out.gain.setTargetAtTime(car.leaving ? 0.45 : 0.8, now, 0.3);
    if (car.lifts > v.lifts && v.boost > 0.25) {
      const shot = (name: DriftSample, gain: number, rate: number, length: number | null = null): void => {
        const buffer = buffers.get(name);
        if (!buffer) return;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.playbackRate.value = rate;
        const g = ctx.createGain();
        g.gain.value = gain;
        src.connect(g);
        g.connect(v.out);
        src.start(now);
        if (length === null) return;
        // Cut after the last chirp it should have, with a short fade instead of a click.
        const end = now + length / rate;
        g.gain.setValueAtTime(gain, end - 0.012);
        g.gain.linearRampToValueAtTime(0, end);
        src.stop(end + 0.01);
      };
      shot('blowOff', 0.35 + 0.55 * v.boost, 0.94 + Math.random() * 0.12);
      const chirps = 3 + Math.floor(Math.random() * 5);
      shot('flutter', 0.3 + 0.5 * v.boost, 0.95 + Math.random() * 0.1, chirps * FLUTTER_PERIOD + 0.02);
    }
    v.lifts = car.lifts;
  }

  private loadDrift(ctx: AudioContext): void {
    this.driftLoading = true;
    void Promise.all(
      DRIFT_SAMPLES.map(async (name): Promise<[DriftSample, AudioBuffer]> => {
        const res = await fetch(`${base}audio/drift/${name}.m4a`);
        if (!res.ok) throw new Error(`audio/drift/${name}.m4a: ${res.status}`);
        return [name, await ctx.decodeAudioData(await res.arrayBuffer())];
      }),
    ).then(
      (loaded) => (this.driftBuffers = new Map(loaded)),
      // Offline before the files were cached: the next drift car tries again.
      () => (this.driftLoading = false),
    );
  }

  private startDrift(ctx: AudioContext, to: AudioNode, buffers: Map<DriftSample, AudioBuffer>, lifts: number): DriftVoice {
    const pan = ctx.createStereoPanner();
    pan.connect(to);
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(pan);
    const layers = new Map<DriftSample, { src: AudioBufferSourceNode; gain: GainNode }>();
    for (const name of DRIFT_SAMPLES) {
      const buffer = buffers.get(name);
      if (!buffer || name === 'blowOff' || name === 'flutter') continue;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(gain);
      gain.connect(out);
      // Each loop from its own place: the layers never line up the same way twice.
      src.start(0, Math.random() * buffer.duration);
      layers.set(name, { src, gain });
    }
    return { out, pan, layers, mix: 1, rpm: 0.6, boost: 0, lifts, silent: 0 };
  }

  private trafficVoices = new Map<number, TrafficVoice>();
  private trafficBuffers: Map<TrafficSample, AudioBuffer> | null = null;
  private trafficLoading = false;
  private road: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

  /** The loudest engines at once; the rest of the ring is the road's bed. */
  private static readonly trafficVoices = 6;
  /** How far (world units) an engine carries before it is half as loud. */
  private static readonly trafficReach = 170;

  /**
   * The traffic, quietly under everything (Leo, 22.10.2026), called every frame: each of the nearest vehicles
   * gets an engine loop of its kind (`audio-src/make_traffic_sounds.py`), each car its own pitch, rising with its
   * speed and with the throttle as it pulls onto the ring, idling where it stands. Under them the tyres roll.
   */
  updateTraffic(cars: TrafficSound[], enabled: boolean, delta: number): void {
    const ctx = this.ctx;
    const bus = this.traffic;
    if (!ctx || !bus || ctx.state !== 'running') return;
    const on = enabled && cars.length > 0;
    if (on && !this.trafficBuffers) {
      if (!this.trafficLoading) this.loadTraffic(ctx);
      return;
    }
    const buffers = this.trafficBuffers;
    if (!buffers) return;
    const now = ctx.currentTime;
    const reach = AudioPlayer.trafficReach;
    const near = (c: TrafficSound): number => 1 / (1 + (c.x * c.x + c.y * c.y) / (reach * reach));
    const weight: Record<TrafficEngine, number> = { car: 1, sport: 1.15, diesel: 1.05, truck: 1.3, bike: 1.2 };
    const chosen = on ? [...cars].sort((a, b) => near(b) * weight[b.engine] - near(a) * weight[a.engine]).slice(0, AudioPlayer.trafficVoices) : [];
    const keep = new Set(chosen.map((c) => c.id));
    for (const [id, v] of this.trafficVoices) {
      if (keep.has(id)) continue;
      v.gain.gain.setTargetAtTime(0, now, 0.08);
      v.fading += delta;
      if (v.fading > 0.4) {
        v.src.stop();
        v.gain.disconnect();
        this.trafficVoices.delete(id);
      }
    }
    for (const c of chosen) {
      let v = this.trafficVoices.get(c.id);
      if (!v || v.engine !== c.engine) {
        if (v) v.src.stop();
        const buffer = buffers.get(c.engine);
        if (!buffer) continue;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        const gain = ctx.createGain();
        gain.gain.value = 0;
        const pan = ctx.createStereoPanner();
        src.connect(gain);
        gain.connect(pan);
        pan.connect(bus);
        src.start(0, Math.random() * buffer.duration);
        // Every car its own engine note: the same loop, a few percent apart.
        const pitch = 0.9 + 0.2 * (((c.id * 2654435761) >>> 0) / 4294967296);
        v = { engine: c.engine, src, gain, pan, pitch, fading: 0 };
        this.trafficVoices.set(c.id, v);
      }
      v.fading = 0;
      const rate = v.pitch * (0.62 + 0.42 * Math.min(c.speed, 1.3) + 0.06 * c.load);
      v.src.playbackRate.setTargetAtTime(rate, now, 0.12);
      v.gain.gain.setTargetAtTime(0.55 * near(c) * (0.55 + 0.45 * c.load + 0.2 * Math.min(c.speed, 1)), now, 0.12);
      v.pan.pan.setTargetAtTime(Math.max(-0.7, Math.min(0.7, c.x / 320)), now, 0.12);
    }
    // The tyres: one bed, as loud as the moving traffic near the ring.
    const rolling = on ? Math.min(1, cars.reduce((sum, c) => sum + near(c) * Math.min(c.speed, 1), 0) / 4) : 0;
    const roadBuffer = buffers.get('road');
    if (!this.road && rolling > 0 && roadBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = roadBuffer;
      src.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(gain);
      gain.connect(bus);
      src.start();
      this.road = { src, gain };
    }
    this.road?.gain.gain.setTargetAtTime(0.35 * rolling, now, 0.3);
  }

  private loadTraffic(ctx: AudioContext): void {
    this.trafficLoading = true;
    void Promise.all(
      TRAFFIC_SAMPLES.map(async (name): Promise<[TrafficSample, AudioBuffer]> => {
        const res = await fetch(`${base}audio/traffic/${name}.m4a`);
        if (!res.ok) throw new Error(`audio/traffic/${name}.m4a: ${res.status}`);
        return [name, await ctx.decodeAudioData(await res.arrayBuffer())];
      }),
    ).then(
      (loaded) => (this.trafficBuffers = new Map(loaded)),
      // Offline before the files were cached: the next frame with traffic tries again.
      () => (this.trafficLoading = false),
    );
  }

  private noiseLoop: AudioBuffer | null = null;
  private rainVoice: RainVoice | null = null;
  private strikes = 0;

  private noise(ctx: AudioContext): AudioBuffer {
    if (this.noiseLoop) return this.noiseLoop;
    const frames = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    this.noiseLoop = buffer;
    return buffer;
  }

  /**
   * The weather as a bed of sound (`GameSession.weatherSound`): rain is looping noise, a hiss on top and a low body
   * under it that grow with the downpour, and every flash of lightning is followed by thunder.
   */
  updateWeather(sky: WeatherSound, enabled: boolean): void {
    const ctx = this.ctx;
    if (!ctx || !this.ambient || ctx.state !== 'running') return;
    const rain = enabled ? sky.rain : 0;
    if (!this.rainVoice) {
      if (rain === 0) {
        this.strikes = sky.strikes;
        return;
      }
      this.rainVoice = this.startRain(ctx, this.ambient);
    }
    const now = ctx.currentTime;
    const voice = this.rainVoice;
    voice.gain.gain.setTargetAtTime(AudioPlayer.rainVolume * rain, now, 0.7);
    voice.hiss.frequency.setTargetAtTime(3200 + 3200 * rain, now, 0.7);
    voice.body.gain.setTargetAtTime(rain * rain * 0.9, now, 0.7);
    if (sky.strikes !== this.strikes) {
      if (sky.strikes > this.strikes && rain > 0) this.thunder(ctx, this.ambient);
      this.strikes = sky.strikes;
    }
  }

  private static readonly rainVolume = 0.16;

  private startRain(ctx: AudioContext, out: GainNode): RainVoice {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(out);
    const src = ctx.createBufferSource();
    src.buffer = this.noise(ctx);
    src.loop = true;
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 700;
    const hiss = ctx.createBiquadFilter();
    hiss.type = 'lowpass';
    hiss.frequency.value = 3200;
    src.connect(high);
    high.connect(hiss);
    hiss.connect(gain);
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 420;
    const body = ctx.createGain();
    body.gain.value = 0;
    src.connect(low);
    low.connect(body);
    body.connect(gain);
    src.start();
    return { gain, hiss, body };
  }

  /** Thunder after the flash: a crack when the strike is near, a long rumble that rolls and dies away, a sub under it. */
  private thunder(ctx: AudioContext, out: GainNode): void {
    const delay = 0.12 + Math.random() * 1.2;
    const far = delay / 1.32;
    const at = ctx.currentTime + delay;
    const level = 0.95 - 0.4 * far;
    const noise = (length: number): AudioBufferSourceNode => {
      const src = ctx.createBufferSource();
      src.buffer = this.noise(ctx);
      src.loop = true;
      src.start(at, Math.random() * 3);
      src.stop(at + length);
      return src;
    };
    const rumble = ctx.createBiquadFilter();
    rumble.type = 'lowpass';
    rumble.Q.value = 0.8;
    rumble.frequency.setValueAtTime(650 - 300 * far, at);
    rumble.frequency.exponentialRampToValueAtTime(70, at + 3);
    const roll = ctx.createGain();
    roll.gain.setValueAtTime(0.0001, at);
    roll.gain.exponentialRampToValueAtTime(level, at + 0.1 + 0.3 * far);
    roll.gain.exponentialRampToValueAtTime(level * 0.35, at + 0.9);
    roll.gain.exponentialRampToValueAtTime(level * 0.75, at + 1.35);
    roll.gain.exponentialRampToValueAtTime(0.0001, at + 3.4);
    noise(3.5).connect(rumble);
    rumble.connect(roll);
    roll.connect(out);
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(58, at);
    sub.frequency.exponentialRampToValueAtTime(28, at + 1.8);
    subGain.gain.setValueAtTime(0.0001, at);
    subGain.gain.exponentialRampToValueAtTime(0.7 * (1 - 0.6 * far), at + 0.15);
    subGain.gain.exponentialRampToValueAtTime(0.0001, at + 2);
    sub.connect(subGain);
    subGain.connect(out);
    sub.start(at);
    sub.stop(at + 2.1);
    if (far < 0.5) {
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 2400;
      band.Q.value = 0.7;
      const crack = ctx.createGain();
      crack.gain.setValueAtTime(0.0001, at);
      crack.gain.exponentialRampToValueAtTime(0.8 * (1 - far), at + 0.01);
      crack.gain.exponentialRampToValueAtTime(0.0001, at + 0.28);
      noise(0.3).connect(band);
      band.connect(crack);
      crack.connect(out);
    }
  }

  updateMusic(mix: MusicMix, enabled: boolean, delta: number): void {
    const ctx = this.ctx;
    const music = this.music;
    if (!ctx || !music) return;
    for (const layer of MUSIC_LAYERS) {
      const target = enabled ? (mix.volumes[layer] ?? 0) : 0;
      const current = this.volumes.get(layer) ?? 0;
      const next = current + (target - current) * Math.min(1, delta / AudioPlayer.fade);
      this.volumes.set(layer, Math.abs(next) < 0.0005 ? 0 : next);
      music.gains.get(layer)!.gain.setTargetAtTime(next * AudioPlayer.musicMaster, ctx.currentTime, 0.02);
    }
    music.filter.frequency.setTargetAtTime(Music.cutoff(mix.lowPass), ctx.currentTime, 0.015);
  }

  /** Pauses everything while the page is hidden; resumes on return. */
  setSuspended(suspended: boolean): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (suspended && ctx.state === 'running') ctx.suspend().catch(() => undefined);
    else if (!suspended && ctx.state === 'suspended') ctx.resume().catch(() => undefined);
  }

  /** Done once every sample and stem is loaded and decoded (or failed); resolved at once without audio. */
  get ready(): Promise<void> {
    return this.loading ?? Promise.resolve();
  }
}

/**
 * Haptics through the Vibration API where the browser has one (Android). The patterns
 * follow the `.ahap` files in spirit: short ticks for merges, a thud for a crash, rising
 * pulses for warnings. Softness (the flow) shortens them.
 */
export class Haptics {
  private static readonly patterns: Record<HapticID, number[]> = {
    merge: [4],
    tightFit: [12],
    nearMiss: [8],
    perfect: [10],
    flow: [6, 40, 10],
    chest: [20, 40, 30, 40, 60],
    comboUp: [8, 50, 12],
    crash: [45, 30, 25],
    rushHour: [10, 60, 15, 60, 20],
    shiftComplete: [15, 60, 30],
    wanted: [10, 80, 14, 80, 18],
    takedown: [40, 50, 12, 40, 12],
    secured: [10, 80, 14, 80, 18],
    seized: [30],
    paid: [12, 60, 20],
    explosion: [70, 40, 50, 40, 30],
    tap: [12],
    critical: [16, 30, 24],
    bossTakedown: [55, 45, 70],
    reelTick: [8],
    reelStop: [30, 50, 60],
    edge: [3],
    rumble: [4, 34, 4],
    snap: [6],
    denied: [14, 60, 14],
    confirm: [10, 40, 18],
    earned: [12, 60, 20, 60, 28],
  };
  readonly supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  play(id: HapticID, softness: number): void {
    if (!this.supported) return;
    const scale = 1 - 0.35 * clamp(softness, 0, 1);
    const pattern = Haptics.patterns[id].map((ms, i) => (i % 2 === 0 ? Math.max(1, Math.round(ms * scale)) : ms));
    try {
      navigator.vibrate(pattern);
    } catch {
      /* not allowed before a gesture */
    }
  }
}
