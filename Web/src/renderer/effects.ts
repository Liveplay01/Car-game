import type { Vec2 } from '../core/vec2';

/**
 * Crash and feedback effects as plain data (like GamePresentation's `Effects`). The rule
 * from FOUNDATION.md: the more often an event happens, the less animation it gets.
 */
export interface Particle {
  kind: 'spark' | 'debris' | 'smoke' | 'fire' | 'glass';
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
}

export interface Popup {
  text: string;
  sub?: string;
  world: Vec2;
  age: number;
  life: number;
  color: string;
  size: number;
  /** Big words get the 0.9 → 1 scale-in; small numbers only rise and fade. */
  emphasis: boolean;
}

export interface Scorch {
  x: number;
  y: number;
  r: number;
  age: number;
}

export const THEME = {
  background: '#0B0D10',
  ground: '#0D1014',
  block: '#12161B',
  blockEdge: '#181D23',
  surface: '#23282F',
  kerb: '#1B2028',
  island: '#121519',
  islandEdge: '#1D2229',
  marking: '#454C56',
  primary: '#F4F6F9',
  muted: '#99A2AF',
  accent: '#9EE6CF',
  destructive: '#FF5A5F',
  glass: '#2B3139',
  tire: '#16191D',
  car: ['#E3E6EA', '#BFC6CF', '#8A94A1', '#C9BCA8'],
  police: '#2F63E0',
  policeRoof: '#F2F4F7',
  lightRed: '#FF3B47',
  lightBlue: '#4FA3FF',
  criminal: '#B45CF0',
  bed: '#35214A',
  cargo: '#D8A23A',
  armor: '#3F6B58',
  armorBox: '#4F7D69',
  truck: '#4E586A',
  truckBox: '#A9B2BE',
  sports: '#E2553F',
  compact: '#9FC46B',
  van: '#DCD4C3',
  wreck: '#3A3F46',
  smoke: '#6B727C',
  spark: '#FFF1D0',
  fireCore: '#FFE08A',
  fireOuter: '#FF7A3D',
  fireDeep: '#C2362B',
  scorch: '#171411',
  hazard: '#FFD100',
} as const;

export class Effects {
  particles: Particle[] = [];
  popups: Popup[] = [];
  scorches: Scorch[] = [];
  shake = 0;
  private shakeTime = 0;
  reduceMotion = false;

  /** Sparks, glass, flying parts and smoke; harder hits burn (FOUNDATION.md motion table). */
  crash(point: Vec2, impact: number, colors: string[]): void {
    const strength = Math.min(1, impact / 160);
    const sparks = Math.round(8 + strength * 18);
    for (let i = 0; i < sparks; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 220 * (0.4 + strength);
      this.particles.push(this.make('spark', point, Math.cos(a) * sp, Math.sin(a) * sp, 0.18 + Math.random() * 0.25, 1.2 + Math.random(), THEME.spark));
    }
    const glass = Math.round(4 + strength * 8);
    for (let i = 0; i < glass; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 20 + Math.random() * 90;
      this.particles.push(this.make('glass', point, Math.cos(a) * sp, Math.sin(a) * sp, 0.6 + Math.random() * 0.8, 1 + Math.random() * 1.2, '#CFE3F2'));
    }
    if (!this.reduceMotion) {
      const debris = Math.round(1 + strength * 4);
      for (let i = 0; i < debris; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 40 + Math.random() * 120 * (0.5 + strength);
        const p = this.make('debris', point, Math.cos(a) * sp, Math.sin(a) * sp, 1.4 + Math.random(), 2 + Math.random() * 3, colors[i % colors.length] ?? THEME.wreck);
        p.spin = (Math.random() - 0.5) * 14;
        this.particles.push(p);
      }
    }
    const puffs = Math.round(3 + strength * 6);
    for (let i = 0; i < puffs; i++) {
      const p = this.make('smoke', point, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, 1.4 + Math.random() * 1.2, 6 + Math.random() * 6, THEME.smoke);
      this.particles.push(p);
    }
    if (impact > 130) {
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 10 + Math.random() * 50;
        this.particles.push(this.make('fire', point, Math.cos(a) * sp, Math.sin(a) * sp, 0.5 + Math.random() * 0.5, 6 + Math.random() * 8, THEME.fireOuter));
      }
      this.scorches.push({ x: point.x, y: point.y, r: 14 + strength * 10, age: 0 });
    } else if (impact > 60) {
      this.scorches.push({ x: point.x, y: point.y, r: 7 + strength * 6, age: 0 });
    }
    this.addShake(Math.min(14, 3 + impact / 18));
  }

  /** A burst of accent sparkles: takedown, transporter paid. */
  sparkle(point: Vec2, color: string, count = 14): void {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const sp = 50 + Math.random() * 40;
      this.particles.push(this.make('spark', point, Math.cos(a) * sp, Math.sin(a) * sp, 0.4 + Math.random() * 0.2, 1.6, color));
    }
  }

  popup(world: Vec2, text: string, color: string, options: { sub?: string; size?: number; emphasis?: boolean; life?: number } = {}): void {
    // Never more than a few words on screen at once.
    if (this.popups.length > 5) this.popups.shift();
    this.popups.push({
      world,
      text,
      sub: options.sub,
      color,
      size: options.size ?? 15,
      emphasis: options.emphasis ?? false,
      age: 0,
      life: options.life ?? 0.8,
    });
  }

  addShake(amount: number): void {
    if (this.reduceMotion) return;
    this.shake = Math.max(this.shake, amount);
    this.shakeTime = 0;
  }

  /** Screen-space shake offset in px. */
  shakeOffset(): { x: number; y: number } {
    if (this.shake < 0.05) return { x: 0, y: 0 };
    const t = this.shakeTime * 60;
    return { x: Math.sin(t * 1.7) * this.shake, y: Math.cos(t * 2.3) * this.shake };
  }

  update(dt: number): void {
    this.shakeTime += dt;
    this.shake *= Math.exp(-dt * 9);
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.spin * dt;
      const drag = p.kind === 'smoke' ? 1.6 : p.kind === 'spark' ? 5 : p.kind === 'fire' ? 3 : 2.4;
      p.vx *= Math.exp(-dt * drag);
      p.vy *= Math.exp(-dt * drag);
      if (p.kind === 'smoke') p.size += dt * 9;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const pop of this.popups) pop.age += dt;
    this.popups = this.popups.filter((p) => p.age < p.life);
    for (const s of this.scorches) s.age += dt;
    this.scorches = this.scorches.filter((s) => s.age < 6);
  }

  clear(): void {
    this.particles = [];
    this.popups = [];
    this.shake = 0;
  }

  private make(kind: Particle['kind'], at: Vec2, vx: number, vy: number, life: number, size: number, color: string): Particle {
    return { kind, x: at.x, y: at.y, vx, vy, life, maxLife: life, size, rotation: Math.random() * Math.PI, spin: 0, color };
  }
}
