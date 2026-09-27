/**
 * Procedural sound effects with the Web Audio API: every sound is synthesised on the fly,
 * no files to download. The more often an event happens, the quieter and shorter its sound
 * (FOUNDATION.md, motion and haptics rules).
 */
export type SoundId =
  | 'merge'
  | 'nearMiss'
  | 'tightFit'
  | 'perfect'
  | 'comboUp'
  | 'crashLight'
  | 'crash'
  | 'crashHeavy'
  | 'rushHour'
  | 'complete'
  | 'gameOver'
  | 'alarm'
  | 'secured'
  | 'paid'
  | 'takedown'
  | 'dispatch'
  | 'denied'
  | 'purchase'
  | 'chestCharge'
  | 'chestBurst'
  | 'chestBurstRare'
  | 'ui'
  | 'flowIn';

type Ctx = AudioContext;

export class Sound {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private lastPlayed = new Map<SoundId, number>();
  enabled = true;

  /** Browsers only allow audio after a user gesture: call from the first tap. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC({ latencyHint: 'interactive' });
    const master = ctx.createGain();
    master.gain.value = 0.55;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.ratio.value = 12;
    master.connect(limiter).connect(ctx.destination);
    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.ctx = ctx;
    this.master = master;
    this.noise = noise;
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  play(id: SoundId, intensity = 1): void {
    if (!this.enabled || !this.ctx || !this.master || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    // The same sound twice within 30 ms is one sound.
    const last = this.lastPlayed.get(id) ?? -1;
    if (now - last < 0.03) return;
    this.lastPlayed.set(id, now);
    const t = now + 0.005;
    switch (id) {
      case 'merge':
        this.tone(t, 1320, 0.035, 0.07, 'sine');
        break;
      case 'nearMiss':
        this.tone(t, 880, 0.05, 0.1, 'triangle');
        this.tone(t + 0.045, 1175, 0.06, 0.08, 'triangle');
        break;
      case 'tightFit':
        this.whoosh(t, 0.22, 900, 4200, 0.32);
        this.tone(t + 0.02, 1760, 0.06, 0.1, 'square', 0.35);
        break;
      case 'perfect':
        this.chord(t, [1047, 1319, 1568], 0.32, 0.09);
        break;
      case 'comboUp':
        this.tone(t, 988, 0.05, 0.12, 'triangle');
        this.tone(t + 0.07, 1319, 0.07, 0.12, 'triangle');
        break;
      case 'flowIn':
        this.sweep(t, 440, 1320, 0.35, 0.08, 'sine');
        break;
      case 'crashLight':
        this.thump(t, 0.3 * intensity, 110);
        this.burst(t, 0.12, 0.3 * intensity, 1800);
        break;
      case 'crash':
        this.thump(t, 0.55 * intensity, 90);
        this.burst(t, 0.28, 0.5 * intensity, 2400);
        this.burst(t + 0.05, 0.4, 0.18 * intensity, 6000, 'highpass');
        break;
      case 'crashHeavy':
        this.thump(t, 0.8, 60);
        this.burst(t, 0.5, 0.65, 1600);
        this.burst(t + 0.04, 0.7, 0.25, 5000, 'highpass');
        break;
      case 'rushHour':
        [0, 0.09, 0.18, 0.27].forEach((d, i) => this.tone(t + d, 523 * Math.pow(1.26, i), 0.08, 0.1, 'square', 0.4));
        break;
      case 'complete':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(t + i * 0.08, f, 0.22, 0.12, 'triangle'));
        break;
      case 'gameOver':
        [392, 330, 262].forEach((f, i) => this.tone(t + i * 0.12, f, 0.25, 0.12, 'triangle'));
        break;
      case 'alarm':
        for (let i = 0; i < 3; i++) {
          this.tone(t + i * 0.22, 740, 0.1, 0.09, 'square', 0.5);
          this.tone(t + i * 0.22 + 0.11, 988, 0.1, 0.09, 'square', 0.5);
        }
        break;
      case 'secured':
        this.tone(t, 659, 0.1, 0.1, 'triangle');
        this.tone(t + 0.1, 988, 0.16, 0.1, 'triangle');
        break;
      case 'paid':
        this.tone(t, 1568, 0.06, 0.12, 'square', 0.35);
        this.tone(t + 0.06, 2093, 0.18, 0.12, 'square', 0.35);
        break;
      case 'takedown':
        this.thump(t, 0.5, 80);
        this.chord(t + 0.05, [784, 988, 1175, 1568], 0.45, 0.1);
        break;
      case 'dispatch':
        this.sweep(t, 600, 1200, 0.18, 0.1, 'square', 0.35);
        this.sweep(t + 0.2, 600, 1200, 0.18, 0.1, 'square', 0.35);
        break;
      case 'denied':
        this.tone(t, 220, 0.12, 0.12, 'square', 0.4);
        this.tone(t + 0.13, 185, 0.14, 0.12, 'square', 0.4);
        break;
      case 'purchase':
        this.tone(t, 1175, 0.07, 0.1, 'triangle');
        this.tone(t + 0.07, 1760, 0.12, 0.1, 'triangle');
        break;
      case 'chestCharge':
        this.sweep(t, 220, 880, 0.7, 0.07, 'sawtooth', 0.25);
        break;
      case 'chestBurst':
        this.burst(t, 0.25, 0.25, 3000);
        this.chord(t, [659, 784, 988], 0.4, 0.09);
        break;
      case 'chestBurstRare':
        this.burst(t, 0.35, 0.3, 3500);
        this.chord(t, [784, 988, 1175, 1568], 0.8, 0.1);
        this.chord(t + 0.16, [1047, 1319, 1568, 2093], 0.8, 0.07);
        break;
      case 'ui':
        this.tone(t, 1760, 0.02, 0.04, 'sine');
        break;
    }
  }

  private out(gain: number, when: number, duration: number): GainNode {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), when + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    g.connect(this.master!);
    return g;
  }

  private tone(when: number, freq: number, duration: number, gain: number, type: OscillatorType, filterMix = 1): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    const g = this.out(gain, when, duration);
    if (filterMix < 1) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = freq * 3;
      osc.connect(f).connect(g);
    } else {
      osc.connect(g);
    }
    osc.start(when);
    osc.stop(when + duration + 0.02);
  }

  private sweep(when: number, from: number, to: number, duration: number, gain: number, type: OscillatorType, filterMix = 1): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, when);
    osc.frequency.exponentialRampToValueAtTime(to, when + duration);
    const g = this.out(gain, when, duration);
    if (filterMix < 1) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = to * 2;
      osc.connect(f).connect(g);
    } else osc.connect(g);
    osc.start(when);
    osc.stop(when + duration + 0.02);
  }

  private chord(when: number, freqs: number[], duration: number, gain: number): void {
    freqs.forEach((f, i) => this.tone(when + i * 0.025, f, duration, gain / Math.sqrt(freqs.length), 'triangle'));
  }

  private burst(when: number, duration: number, gain: number, cutoff: number, type: BiquadFilterType = 'lowpass'): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(cutoff, when);
    if (type === 'lowpass') f.frequency.exponentialRampToValueAtTime(Math.max(120, cutoff * 0.15), when + duration);
    src.connect(f).connect(this.out(gain, when, duration));
    src.start(when, Math.random() * 0.5);
    src.stop(when + duration + 0.02);
  }

  private whoosh(when: number, duration: number, from: number, to: number, gain: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 2.5;
    f.frequency.setValueAtTime(from, when);
    f.frequency.exponentialRampToValueAtTime(to, when + duration * 0.7);
    src.connect(f).connect(this.out(gain, when, duration));
    src.start(when, Math.random() * 0.5);
    src.stop(when + duration + 0.02);
  }

  private thump(when: number, gain: number, freq: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.8, when);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, when + 0.25);
    osc.connect(this.out(gain, when, 0.3));
    osc.start(when);
    osc.stop(when + 0.34);
  }
}

/** Vibration where the browser has it (Android); iOS Safari has none, and that is fine. */
export class Haptics {
  enabled = true;
  private readonly supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  play(pattern: number | number[]): void {
    if (!this.enabled || !this.supported) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      /* not allowed right now */
    }
  }
}
