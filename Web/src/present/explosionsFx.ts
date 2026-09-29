import type { ExplosionReport, ExplosionKind } from '../core/events';
import { type Vec2, v, add, sub, mul, length, normalize, dist, fromAngle, TAU } from '../core/vec2';
import { Rng } from '../core/rng';
import { type RenderList, rect, circle, arc, line, Ease, unitHash } from './render';
import type { ColorToken } from './theme';
import { CrashEffects } from './effects';

interface Billow {
  direction: Vec2;
  reach: number;
  delay: number;
  radius: number;
  life: number;
}

interface Blast {
  kind: ExplosionKind;
  position: Vec2;
  age: number;
  scale: number;
  billows: Billow[];
}

type Kind = { k: 'ember' } | { k: 'chunk' } | { k: 'plume'; dark: boolean };

interface Particle {
  kind: Kind;
  position: Vec2;
  velocity: Vec2;
  rotation: number;
  spin: number;
  size: number;
  age: number;
  lifetime: number;
}

/** Explosions: fireball, shock ring, embers, metal, smoke, heavy shake. */
export class ExplosionEffects {
  static readonly tankerLifetime = 1.3;
  static readonly bombLifetime = 2.2;
  static readonly maxShake = 44;
  blasts: Blast[] = [];
  particles: Particle[] = [];
  trauma = 0;
  private traumaDecay = 1;
  private shakeClock = 0;
  punch = 0;
  flash = 0;
  private rng: Rng;

  constructor(seed: number) {
    this.rng = new Rng((seed ^ 0x5eedb1a5) >>> 0);
  }

  get shakeOffset(): Vec2 {
    if (this.trauma <= 0.001) return v(0, 0);
    const t = this.shakeClock;
    const x = Math.sin(t * 47) * 0.55 + Math.sin(t * 83 + 1.3) * 0.3 + Math.sin(t * 131 + 2.1) * 0.15;
    const y = Math.cos(t * 53 + 0.7) * 0.55 + Math.cos(t * 89 + 2.4) * 0.3 + Math.cos(t * 139 + 0.2) * 0.15;
    return mul(v(x, y), ExplosionEffects.maxShake * this.trauma * this.trauma);
  }

  spawn(r: ExplosionReport, reduceMotion: boolean): void {
    const rng = this.rng;
    const bomb = r.kind === 'bomb';
    const scale = bomb ? 2.6 : 1;
    const billows: Billow[] = [];
    for (let i = 0; i < (bomb ? 34 : 18); i++) {
      const core = i < 4;
      billows.push({
        direction: fromAngle(rng.unit() * TAU),
        reach: (core ? rng.range(0, 8) : rng.range(14, 40)) * scale,
        delay: core ? 0 : rng.range(0, 0.14),
        radius: (core ? rng.range(16, 22) : rng.range(9, 17)) * Math.sqrt(scale) * (bomb ? 1.4 : 1),
        life: (bomb ? ExplosionEffects.bombLifetime : ExplosionEffects.tankerLifetime) * rng.range(0.7, 1),
      });
    }
    this.blasts.push({ kind: r.kind, position: r.point, age: 0, scale, billows });
    this.flash = Math.max(this.flash, bomb ? 1 : 0.55);
    for (let i = 0; i < (bomb ? 36 : 14); i++) {
      const dir = fromAngle(rng.unit() * TAU);
      this.particles.push({
        kind: { k: 'plume', dark: rng.unit() < 0.55 },
        position: add(r.point, mul(dir, rng.range(0, 18) * scale)),
        velocity: reduceMotion ? v(0, 0) : add(mul(dir, rng.range(10, 45) * Math.sqrt(scale)), CrashEffects.wind),
        rotation: 0,
        spin: 0,
        size: rng.range(9, 15) * Math.sqrt(scale),
        age: 0,
        lifetime: rng.range(2.4, 4.2) * (bomb ? 1.3 : 1),
      });
    }
    if (reduceMotion) return;
    this.trauma = Math.min(1.2, this.trauma + (bomb ? 1.1 : 0.8));
    this.traumaDecay = bomb ? 0.5 : 0.85;
    this.punch = Math.max(this.punch, bomb ? 0.11 : 0.055);
    for (let i = 0; i < (bomb ? 80 : 30); i++) {
      const dir = fromAngle(rng.unit() * TAU);
      this.particles.push({
        kind: { k: 'ember' },
        position: add(r.point, mul(dir, rng.range(2, 10))),
        velocity: mul(dir, rng.range(110, 360) * Math.sqrt(scale)),
        rotation: 0,
        spin: 0,
        size: rng.range(1, 2.2),
        age: 0,
        lifetime: rng.range(0.6, 1.5),
      });
    }
    for (let i = 0; i < (bomb ? 30 : 12); i++) {
      const dir = fromAngle(rng.unit() * TAU);
      this.particles.push({
        kind: { k: 'chunk' },
        position: add(r.point, mul(dir, 4)),
        velocity: mul(dir, rng.range(70, 230) * Math.sqrt(scale)),
        rotation: rng.unit() * TAU,
        spin: rng.range(6, 18) * (rng.unit() < 0.5 ? -1 : 1),
        size: rng.range(2.5, 5.5),
        age: 0,
        lifetime: rng.range(1.6, 2.4),
      });
    }
  }

  update(dt: number, gravityValue: number): void {
    if (dt <= 0) return;
    this.shakeClock += dt;
    this.trauma = Math.max(0, this.trauma - this.traumaDecay * dt);
    this.punch *= Math.exp(-dt / 0.22);
    this.flash *= Math.exp(-dt / 0.09);
    const scrape = CrashEffects.debrisFriction * gravityValue * dt;
    for (const p of this.particles) {
      p.age += dt;
      if (p.kind.k === 'ember') p.velocity = mul(p.velocity, Math.exp(-2.2 * dt));
      else if (p.kind.k === 'chunk') {
        const speed = length(p.velocity);
        p.velocity = speed > scrape ? mul(p.velocity, (speed - scrape) / speed) : v(0, 0);
        if (speed <= scrape) p.spin = 0;
      } else p.velocity = add(mul(p.velocity, Math.exp(-0.9 * dt)), mul(CrashEffects.wind, 0.9 * dt));
      p.position = add(p.position, mul(p.velocity, dt));
      p.rotation += p.spin * dt;
    }
    this.particles = this.particles.filter((p) => p.age < p.lifetime);
    for (const b of this.blasts) b.age += dt;
    this.blasts = this.blasts.filter((b) => b.age < (b.kind === 'bomb' ? ExplosionEffects.bombLifetime : ExplosionEffects.tankerLifetime) + 0.2);
  }

  addGround(list: RenderList): void {
    for (const b of this.blasts) {
      const x = b.age / 0.6;
      if (x >= 1) continue;
      list.w(circle(b.position, 70 * b.scale * (0.6 + 0.4 * Ease.outCubic(x))), 'fireOuter', 0.22 * (1 - Ease.outCubic(x)));
    }
    for (const p of this.particles) {
      if (p.kind.k !== 'plume') continue;
      const x = p.age / p.lifetime;
      list.w(circle(p.position, p.size * (1 + 2.4 * Ease.outCubic(x))), p.kind.dark ? 'smokeDark' : 'smoke', 0.5 * Ease.clamp01(p.age / 0.25) * (1 - Ease.smoothstep(x)));
    }
  }

  addAir(list: RenderList): void {
    for (const p of this.particles) {
      const x = p.age / p.lifetime;
      if (p.kind.k === 'chunk') list.w(rect(p.position, v(p.size, p.size * 0.6), 0.6, p.rotation), 'wreck', 1 - Ease.clamp01((x - 0.75) / 0.25));
      else if (p.kind.k === 'ember') {
        const heat = 1 - x;
        list.w(line(sub(p.position, mul(p.velocity, 0.05)), p.position, p.size * 1.3), 'fireOuter', 0.85 * heat);
        list.w(circle(p.position, p.size * (0.6 + 0.4 * heat)), 'fireCore', heat);
      }
    }
    for (const b of this.blasts) this.addFireball(list, b);
  }

  private addFireball(list: RenderList, b: Blast): void {
    const t = b.age;
    const s = b.scale;
    if (t < 0.14) {
      const x = t / 0.14;
      list.w(circle(b.position, 30 * s * (0.4 + 0.6 * Ease.outCubic(x))), 'spark', 1 - x * x);
    }
    const shock = t / 0.5;
    if (shock < 1) {
      const ring = Ease.outCubic(shock);
      list.w(arc(b.position, 12 * s + 150 * s * ring, 7 * s * (1 - ring) + 1, 0, TAU), 'primary', 0.85 * (1 - ring));
    }
    const dust = t / 1.1;
    if (dust < 1) {
      const ring = Ease.outCubic(dust);
      list.w(arc(b.position, 10 * s + 110 * s * ring, 16 * s * (1 - ring) + 2, 0, TAU), 'smokeLight', 0.3 * (1 - ring));
    }
    const windDir = normalize(CrashEffects.wind);
    for (const billow of b.billows) {
      const local = t - billow.delay;
      if (local <= 0 || local >= billow.life) continue;
      const x = local / billow.life;
      const out = Ease.outCubic(Math.min(local / 0.35, 1));
      const rise = add(mul(CrashEffects.wind, local * 1.4), mul(v(0, 14), local * s));
      const center = add(add(b.position, mul(billow.direction, billow.reach * out)), rise);
      const radius = billow.radius * (0.35 + 0.85 * Ease.outCubic(Math.min(local / 0.3, 1))) * (1 + 0.45 * x);
      const [outer, inner]: [ColorToken, ColorToken] =
        x < 0.2 ? ['fireOuter', 'fireCore'] : x < 0.42 ? ['fireDeep', 'fireOuter'] : x < 0.62 ? ['smokeDark', 'fireDeep'] : ['smokeDark', 'smoke'];
      const fade = 1 - Ease.smoothstep((x - 0.55) / 0.45);
      list.w(circle(center, radius), outer, 0.95 * fade);
      list.w(circle(sub(center, mul(windDir, radius * 0.12)), radius * (0.55 - 0.25 * x)), inner, 0.9 * fade);
    }
  }

  addFlash(list: RenderList, viewport: Vec2): void {
    if (this.flash <= 0.01) return;
    list.s(rect(mul(viewport, 0.5), add(viewport, v(40, 40))), 'spark', 0.7 * this.flash);
  }
}

interface Scar {
  position: Vec2;
  kind: ExplosionKind;
  time: number;
  serial: number;
}

/** The map suffers: burnt ground, trees and houses that catch fire and stay charred. */
export class MapScars {
  static readonly memory = 30;
  static readonly fireSpread = 380;
  scars: Scar[] = [];
  private serial = 0;

  get isEmpty(): boolean {
    return this.scars.length === 0;
  }

  add(r: ExplosionReport, now: number): void {
    this.serial++;
    this.scars.push({ position: r.point, kind: r.kind, time: now, serial: this.serial });
    if (this.scars.length > 10) this.scars.splice(0, this.scars.length - 10);
  }

  forget(now: number): void {
    this.scars = this.scars.filter((s) => now - s.time <= MapScars.memory);
  }

  damage(point: Vec2, now: number): { fire: number; char: number } {
    let fire = 0;
    let char = 0;
    for (const s of this.scars) {
      const reach = s.kind === 'bomb' ? 2000 : 170;
      const distance = dist(point, s.position);
      if (distance >= reach) continue;
      const severity = s.kind === 'bomb' ? Math.max(0.55, 1 - distance / 600) : 1 - distance / reach;
      const age = now - s.time - distance / MapScars.fireSpread;
      if (age <= 0) continue;
      const burns = 4 + 8 * severity;
      const rising = Ease.clamp01(age / 0.3);
      const dying = 1 - Ease.clamp01((age - burns) / 2.5);
      fire = Math.max(fire, rising * dying * (0.45 + 0.55 * severity));
      const forgetting = 1 - Ease.clamp01((now - s.time - (MapScars.memory - 10)) / 10);
      char = Math.max(char, Ease.clamp01(age / 1.5) * (0.45 + 0.55 * severity) * forgetting);
    }
    return { fire, char };
  }

  addGround(list: RenderList, now: number, time: number | null): void {
    for (const s of this.scars) {
      const age = now - s.time;
      const fade = 1 - Ease.clamp01((age - 3) / 4);
      if (fade <= 0.005) continue;
      const scorch = s.kind === 'bomb' ? 160 : 38;
      const grow = Ease.outCubic(Ease.clamp01(age / 0.4));
      for (let i = 0; i < 7; i++) {
        const u = unitHash(s.serial * 13 + i, 41);
        const w = unitHash(s.serial * 13 + i, 42);
        const offset = i === 0 ? v(0, 0) : mul(fromAngle(u * TAU), scorch * 0.55 * w);
        list.w(circle(add(s.position, offset), scorch * (i === 0 ? 0.8 : 0.35 + 0.3 * w) * grow), 'scorch', 0.4 * fade);
      }
      const burning = 1 - Ease.clamp01((age - 3) / 3);
      if (burning <= 0.02) continue;
      for (let i = 0; i < 5; i++) {
        const u = unitHash(s.serial * 7 + i, 43);
        const at = add(s.position, mul(fromAngle(u * TAU), scorch * 0.6));
        const flicker = time === null ? 1 : 0.7 + 0.3 * Math.sin(time * 19 + i * 2.3);
        const radius = (s.kind === 'bomb' ? 10 : 5) * flicker * burning;
        list.w(circle(at, radius), 'fireOuter', 0.85 * burning);
        list.w(circle(at, radius * 0.5), 'fireCore', burning);
      }
    }
  }

  addTree(list: RenderList, center: Vec2, size: number, index: number, now: number, time: number | null): void {
    const { fire, char } = this.damage(center, now);
    if (char > 0.01) list.w(circle(center, size * 1.05), 'scorch', 0.8 * char);
    if (fire > 0.01) this.flames(list, center, size, fire, index, time);
  }

  addHouse(list: RenderList, center: Vec2, size: Vec2, rotation: number, index: number, now: number, time: number | null): void {
    const { fire, char } = this.damage(center, now);
    if (char > 0.01) list.w(rect(center, size, 3, rotation), 'scorch', 0.6 * char);
    if (fire > 0.01) this.flames(list, center, Math.min(size.x, size.y) * 0.4, fire, index, time);
  }

  private flames(list: RenderList, center: Vec2, size: number, fire: number, seed: number, time: number | null): void {
    const clock = time ?? 0;
    const windDir = normalize(CrashEffects.wind);
    for (let k = 0; k < 3; k++) {
      const flicker = time === null ? 1 : 0.72 + 0.28 * Math.sin(clock * (17 + 3 * k) + seed * 1.7 + k * 2.1);
      const at = add(add(center, mul(fromAngle(k * 2.1 + seed), size * 0.35)), mul(windDir, size * 0.25 * flicker));
      const radius = size * (0.6 - 0.12 * k) * fire * flicker;
      list.w(circle(at, radius), 'fireOuter', 0.9);
      list.w(circle(at, radius * 0.48), 'fireCore', 1);
    }
    if (time === null) return;
    for (let puff = 0; puff < 2; puff++) {
      const phase = (time * 0.45 + unitHash(seed, 44) + puff * 0.5) % 1;
      const at = add(add(center, mul(CrashEffects.wind, phase * 3.2)), v(0, size * 0.6));
      list.w(circle(at, size * (0.6 + 1.8 * phase)), 'smokeDark', 0.4 * (1 - phase) * fire);
    }
  }
}

/** The bomb's smoke is the way to the next level: it covers the screen, then clears. */
export class SmokeCurtain {
  static readonly cover = 0.95;
  static readonly swapAt = 1.5;
  static readonly clear = 1.8;
  static readonly duration = 4.2;
  age = 0;
  constructor(public center: Vec2) {}

  get isDone(): boolean {
    return this.age >= SmokeCurtain.duration;
  }

  add(list: RenderList, viewport: Vec2, reduceMotion: boolean): void {
    const age = this.age;
    const veil = age < SmokeCurtain.clear ? Ease.smoothstep(Ease.clamp01((age - 0.35) / (SmokeCurtain.cover - 0.35))) : 1 - Ease.smoothstep(Ease.clamp01((age - SmokeCurtain.clear) / 1.1));
    if (veil > 0.005) list.s(rect(mul(viewport, 0.5), add(viewport, v(80, 80))), 'smoke', veil);
    if (reduceMotion) return;
    const reach = Math.max(viewport.x, viewport.y) / Math.max(list.camera.scale, 0.01);
    for (let i = 0; i < 42; i++) {
      const u = unitHash(i, 51);
      const w1 = unitHash(i, 52);
      const w2 = unitHash(i, 53);
      const spread = Ease.outCubic(Ease.clamp01(age / 1.2));
      const drift = Math.max(0, age - SmokeCurtain.clear);
      const angle = u * TAU + 0.25 * age * (w1 - 0.5);
      const distance = reach * (0.08 + 0.62 * w1) * spread + drift * (40 + 90 * w1);
      const at = add(add(this.center, mul(fromAngle(angle), distance)), mul(CrashEffects.wind, age * 3));
      const radius = reach * (0.14 + 0.16 * w2) * (0.3 + 0.7 * spread) * (1 + 0.25 * drift);
      const start = SmokeCurtain.clear + 0.1 + 1.4 * w2;
      const fade = age < SmokeCurtain.clear ? Ease.clamp01(age / 0.25) : 1 - Ease.smoothstep(Ease.clamp01((age - start) / 1.2));
      if (fade <= 0.005) continue;
      list.w(circle(at, radius), i % 3 === 0 ? 'smokeDark' : 'smoke', 0.92 * fade);
      list.w(circle(add(at, mul(v(-0.18, 0.22), radius)), radius * 0.62), 'smokeLight', 0.35 * fade);
    }
  }
}
