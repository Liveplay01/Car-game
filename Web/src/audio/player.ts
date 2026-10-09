import { type SoundID, type HapticID, type MusicMix, type MusicLayer, type WeatherSound, SOUND_IDS, MUSIC_LAYERS, Music } from '../present/feedback';
import { clamp } from '../core/vec2';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const base = import.meta.env.BASE_URL;

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
  static readonly fade = 0.8;

  private ctx: AudioContext | null = null;
  private sfx: GainNode | null = null;
  private buffers = new Map<SoundID, AudioBuffer>();
  private lastStart = new Map<SoundID, number>();
  private music: { filter: BiquadFilterNode; gains: Map<MusicLayer, GainNode>; started: boolean } | null = null;
  private stemBuffers = new Map<MusicLayer, AudioBuffer>();
  private volumes = new Map<MusicLayer, number>();
  private loading: Promise<void> | null = null;

  /** Call from a user gesture; later calls only resume a suspended context. */
  unlock(): void {
    if (this.ctx) {
      // Refused outside a gesture the browser accepts: the next tap asks again.
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => undefined);
      return;
    }
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
    limiter.connect(ctx.destination);
    const sfx = ctx.createGain();
    sfx.gain.value = AudioPlayer.sfxVolume;
    sfx.connect(limiter);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = Music.cutoff(0);
    filter.Q.value = 0.7;
    filter.connect(limiter);
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
    await Promise.all(
      SOUND_IDS.map(async (id) => {
        const b = await fetchBuffer(`audio/sounds/${id}.m4a`);
        if (b) this.buffers.set(id, b);
      }),
    );
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
    if (ctx && this.sfx && ctx.state === 'running' && this.synth(id, ctx, this.sfx, pan, pitch)) return;
    const buffer = this.buffers.get(id);
    if (!ctx || !this.sfx || !buffer || ctx.state !== 'running') return;
    // The same sound twice within a few ms is one sound (a pile-up in one frame).
    const now = ctx.currentTime;
    if (now - (this.lastStart.get(id) ?? -1) < 0.025) return;
    this.lastStart.set(id, now);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = pitch;
    // Where it happens on screen: a crash on the left is heard on the left (headphones).
    if (Math.abs(pan) > 0.02 && typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      src.connect(panner);
      panner.connect(this.sfx);
    } else {
      src.connect(this.sfx);
    }
    src.start();
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

  private static readonly synthIds: SoundID[] = ['critical', 'jackpot', 'chestHit', 'reelSpin', 'reelTick', 'shimmer', 'reelLand', 'reelLandBig', 'heal'];

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
    if (!ctx || !this.sfx || ctx.state !== 'running') return;
    const on = enabled && level > 0.001 ? Math.min(1, level) : 0;
    if (on === 0 && !this.tensionVoice) return;
    if (!this.tensionVoice) {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 6;
      filter.connect(gain);
      gain.connect(this.sfx);
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
      whineGain.connect(this.sfx);
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
      g.connect(this.sfx!);
      osc.start(now + at);
      osc.stop(now + at + 0.2);
    };
    const loud = 0.25 + 0.45 * on;
    thump(0, loud);
    thump(0.17, loud * 0.6);
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
    if (!ctx || !this.sfx || ctx.state !== 'running') return;
    const rain = enabled ? sky.rain : 0;
    if (!this.rainVoice) {
      if (rain === 0) {
        this.strikes = sky.strikes;
        return;
      }
      this.rainVoice = this.startRain(ctx, this.sfx);
    }
    const now = ctx.currentTime;
    const voice = this.rainVoice;
    voice.gain.gain.setTargetAtTime(AudioPlayer.rainVolume * rain, now, 0.7);
    voice.hiss.frequency.setTargetAtTime(3200 + 3200 * rain, now, 0.7);
    voice.body.gain.setTargetAtTime(rain * rain * 0.9, now, 0.7);
    if (sky.strikes !== this.strikes) {
      if (sky.strikes > this.strikes && rain > 0) this.thunder(ctx, this.sfx);
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
