import { type SoundID, type HapticID, type MusicMix, type MusicLayer, SOUND_IDS, MUSIC_LAYERS, Music } from '../present/feedback';

const base = import.meta.env.BASE_URL;

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
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC({ latencyHint: 'interactive' });
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

  /** Once per frame: each stem glides towards its volume, the filter follows the breath. */
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
    if (suspended && ctx.state === 'running') void ctx.suspend();
    else if (!suspended && ctx.state === 'suspended') void ctx.resume();
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
  };
  private readonly supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  play(id: HapticID, softness: number): void {
    if (!this.supported) return;
    const scale = 1 - 0.35 * Math.min(Math.max(softness, 0), 1);
    const pattern = Haptics.patterns[id].map((ms, i) => (i % 2 === 0 ? Math.max(1, Math.round(ms * scale)) : ms));
    try {
      navigator.vibrate(pattern);
    } catch {
      /* not allowed before a gesture */
    }
  }
}
