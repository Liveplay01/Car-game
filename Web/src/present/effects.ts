import type { World } from '../core/world';
import { STEP } from '../core/world';
import type { Vehicle, Crashed } from '../core/vehicle';
import type { CrashReport } from '../core/events';
import { gravity } from '../core/config';
import { type Vec2, v, add, sub, mul, length, left, fromAngle, angleOf, TAU, normalize, clamp } from '../core/vec2';
import { Rng } from '../core/rng';
import { type RenderList, rect, circle, arc, line, Ease } from './render';
import type { ColorToken } from './theme';
import { CarArt, type Part, worldOf } from './carArt';
import type { CarModel } from './carModels';
import { Skins, skinFor } from './skins';
import { interpolatedPose } from './scene';

type ParticleKind = { k: 'debris'; color: ColorToken } | { k: 'part'; color: ColorToken } | { k: 'spark' } | { k: 'smoke' };

/** Moved in place every frame: a fresh vector per particle per frame was garbage the phone collected mid-crash. */
type Mutable = { x: number; y: number };

interface Particle {
  kind: ParticleKind;
  position: Mutable;
  velocity: Mutable;
  rotation: number;
  spin: number;
  size: Vec2;
  age: number;
  lifetime: number;
}

interface Blast {
  position: Vec2;
  severity: number;
  isTakedown: boolean;
  age: number;
}

/**
 * Crash effects: wrecks with damage where they were hit, impact flash,
 * fireball on hard hits, burning wrecks, smoke, debris, sparks and a short screen shake.
 * Wrecks and smoke lie below the moving cars; flash and sparks above them last a moment.
 */
export class CrashEffects {
  static readonly typicalImpact = 100;
  static readonly fireSeverity = 1.15;
  static readonly blastLifetime = 0.45;
  static readonly wreckFade = 0.6;
  static readonly shakeDuration = 0.45;
  static readonly shakeAmplitude = 9;
  static readonly shakeDecay = 0.12;
  /** Within `CanvasDrawer.shakeRoom` the baked ground only moves; a bigger shake repaints it every frame. */
  static readonly shakeMax = 14;
  /** The full-screen blink of a hard crash, as `ExplosionEffects.flash` (a tanker is 0.55). */
  static readonly flash = 0.3;
  static readonly debrisFriction = 1.6;
  static readonly wind = v(10, 16);

  particles: Particle[] = [];
  blasts: Blast[] = [];
  fires = new Map<number, number>();
  torn = new Map<number, Set<Part>>();
  /** The skins that are on: a wreck keeps the shape of the body it wore. */
  carSkins: string[] = [];
  shakeAge = Infinity;
  private shakeStrength = 0;
  /** Which way the wrecks fly, on screen: the shake kicks along it (research of 08.10.2026), only a little across. */
  private shakeDir = v(1, 0);
  private rng: Rng;
  private smokeTimer = 0;

  constructor(seed: number) {
    this.rng = new Rng((seed ^ 0xc4a511fe) >>> 0);
  }

  get shakeOffset(): Vec2 {
    if (this.shakeAge >= CrashEffects.shakeDuration) return v(0, 0);
    const t = this.shakeAge;
    const strength = this.shakeStrength * Math.exp(-t / CrashEffects.shakeDecay);
    const along = Math.cos(t * 55) * strength;
    const across = Math.sin(t * 89) * strength * 0.35;
    const d = this.shakeDir;
    return v(d.x * along - d.y * across, d.y * along + d.x * across);
  }

  static severity(r: CrashReport): number {
    return clamp(r.impact / CrashEffects.typicalImpact, 0.4, 1.6);
  }

  /** Returns the severity the crash was shown with (a chain's boost included). */
  spawn(r: CrashReport, world: World, reduceMotion: boolean, boost = 0, lowDetail = false): number {
    const rng = this.rng;
    const severity = boost > 0 ? Math.max(CrashEffects.severity(r), 1.2) + 0.18 * Math.min(boost, 6) : CrashEffects.severity(r);
    let average = v(0, 0);
    for (const id of [r.first, r.second]) {
      const veh = world.vehicle(id);
      if (!veh || veh.phase.kind !== 'crashed') continue;
      average = add(average, mul(veh.phase.velocity, 0.5));
      if ((severity >= CrashEffects.fireSeverity || boost > 0) && !r.isTakedown) this.fires.set(id, severity);
    }
    this.blasts.push({ position: r.point, severity, isTakedown: r.isTakedown, age: 0 });
    if (r.isTakedown && !reduceMotion) {
      const colors: ColorToken[] = ['lightBlue', 'lightRed', 'vehiclePoliceRoof'];
      for (let i = 0; i < 18; i++) {
        const dir = fromAngle((TAU * (i + rng.unit() * 0.6)) / 18);
        this.particles.push({
          kind: { k: 'debris', color: colors[i % 3] },
          position: v(r.point.x, r.point.y),
          velocity: add(mul(average, 0.3), mul(dir, rng.range(90, 190))),
          rotation: angleOf(dir),
          spin: rng.range(-10, 10),
          size: v(rng.range(4, 7), rng.range(1.2, 2)),
          age: 0,
          lifetime: rng.range(0.6, 0.9),
        });
      }
    }
    if (reduceMotion) return severity;
    // A second crash while the first still shakes adds to it, up to what the baked ground can take.
    const shaking = this.shakeAge < CrashEffects.shakeDuration ? this.shakeStrength * Math.exp(-this.shakeAge / CrashEffects.shakeDecay) : 0;
    this.shakeAge = 0;
    this.shakeStrength = Math.min(CrashEffects.shakeMax, Math.max(shaking, CrashEffects.shakeAmplitude * severity));
    const speed = length(average);
    this.shakeDir = speed > 1 ? v(average.x / speed, -average.y / speed) : fromAngle(rng.unit() * TAU);
    const pieces = Math.floor(6 + 8 * severity);
    for (let i = 0; i < pieces; i++) {
      const color: ColorToken = i % 3 === 2 ? 'vehicleGlass' : 'vehicleCar';
      const dir = fromAngle(rng.unit() * TAU);
      this.particles.push({
        kind: { k: 'debris', color },
        position: add(r.point, mul(dir, 3)),
        velocity: add(average, mul(dir, rng.range(30, 100) * severity)),
        rotation: rng.unit() * TAU,
        spin: rng.range(4, 16) * (rng.unit() < 0.5 ? -1 : 1),
        size: v(rng.range(2.5, 5.5), rng.range(1.5, 3)),
        age: 0,
        lifetime: rng.range(1.0, 1.5),
      });
    }
    for (let i = 0; i < Math.floor((4 + 8 * severity) * (lowDetail ? 1 : 1.5)); i++) {
      const dir = fromAngle(rng.unit() * TAU);
      this.particles.push({
        kind: { k: 'spark' },
        position: v(r.point.x, r.point.y),
        velocity: add(mul(average, 0.5), mul(dir, rng.range(180, 380))),
        rotation: 0,
        spin: 0,
        size: v(1, 1),
        age: 0,
        lifetime: rng.range(0.22, 0.45),
      });
    }
    return severity;
  }

  ignite(ids: number[], strength: number): void {
    for (const id of ids) this.fires.set(id, Math.max(this.fires.get(id) ?? 0, strength));
  }

  update(dt: number, world: World, reduceMotion = false): void {
    if (dt <= 0) return;
    this.shakeAge += dt;
    const c = world.config;
    for (const id of this.fires.keys()) if (!world.vehicle(id)?.isCrashed) this.fires.delete(id);
    for (const id of this.torn.keys()) if (!world.vehicle(id)) this.torn.delete(id);
    for (const veh of world.vehicles) if (veh.dents.length > 0) this.tearOffParts(veh, world, reduceMotion);
    this.smokeTimer += dt;
    const rng = this.rng;
    while (this.smokeTimer >= 0.06) {
      this.smokeTimer -= 0.06;
      for (const wreck of world.vehicles) {
        if (wreck.phase.kind !== 'crashed') continue;
        const state = wreck.phase;
        if (state.elapsed >= c.crashDuration - CrashEffects.wreckFade) continue;
        const burning = this.fires.has(wreck.id);
        if (!burning && rng.unit() >= 0.35) continue;
        this.particles.push({
          kind: { k: 'smoke' },
          position: add(add(wreck.position, mul(fromAngle(wreck.heading), state.damage.x * 0.6)), v(rng.range(-3, 3), rng.range(-3, 3))),
          velocity: add(add(mul(state.velocity, 0.3), CrashEffects.wind), v(rng.range(-6, 6), rng.range(-6, 6))),
          rotation: 0,
          spin: 0,
          size: v(burning ? rng.range(4.5, 6.5) : rng.range(3, 4.5), 0),
          age: 0,
          lifetime: rng.range(0.8, 1.2),
        });
      }
    }
    const scrape = CrashEffects.debrisFriction * gravity(c) * dt;
    const sparkDrag = Math.exp(-6 * dt);
    const smokeDrag = Math.exp(-0.8 * dt);
    let kept = 0;
    for (const p of this.particles) {
      p.age += dt;
      if (p.age >= p.lifetime) continue;
      let k: number;
      if (p.kind.k === 'debris' || p.kind.k === 'part') {
        const speed = length(p.velocity);
        k = speed > scrape ? (speed - scrape) / speed : 0;
        if (speed <= scrape) p.spin = 0;
      } else k = p.kind.k === 'spark' ? sparkDrag : smokeDrag;
      p.velocity.x *= k;
      p.velocity.y *= k;
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.rotation += p.spin * dt;
      this.particles[kept++] = p;
    }
    this.particles.length = kept;
    if (this.blasts.length === 0) return;
    for (const b of this.blasts) b.age += dt;
    this.blasts = this.blasts.filter((b) => b.age < CrashEffects.blastLifetime);
  }

  addGround(list: RenderList): void {
    for (const p of this.particles) {
      if (p.kind.k !== 'smoke') continue;
      const x = p.age / p.lifetime;
      list.w(circle(p.position, p.size.x * (1 + 2.2 * Ease.outCubic(x))), 'smoke', 0.3 * (1 - x));
    }
  }

  /** Wrecks and their torn-off parts: drawn above the ring's light, which they cover. */
  addWrecks(list: RenderList, world: World, alpha: number, softBody: boolean): void {
    for (const p of this.particles) {
      if (p.kind.k !== 'part') continue;
      const opacity = 1 - Ease.clamp01((p.age - (p.lifetime - 0.5)) / 0.5);
      list.w(rect(p.position, p.size, Math.min(p.size.x, p.size.y) / 3, p.rotation), p.kind.color, opacity);
    }
    for (const veh of world.vehicles) {
      if (veh.phase.kind !== 'crashed') continue;
      this.addWreck(list, veh, veh.phase, interpolatedPose(veh, alpha), world, softBody ? world.time : null);
    }
  }

  addAir(list: RenderList): void {
    for (const b of this.blasts) {
      const t = b.age;
      const reach = Math.max(b.severity, b.isTakedown ? 1 : 0);
      // A real hit: a second, thinner ring follows the first, so the blow reads as a push outwards.
      for (let i = 0; i < (reach >= 0.75 ? 2 : 1); i++) {
        const at = t - 0.07 * i;
        if (at < 0 || at >= 0.3) continue;
        const ring = Ease.outCubic(at / 0.3);
        const width = (i === 0 ? 5 : 2.5) * (1 - ring) + 0.6;
        list.w(arc(b.position, (10 + 56 * reach * ring) * (i === 0 ? 1 : 0.75), width, 0, TAU), b.isTakedown ? 'lightBlue' : 'spark', (1 - ring) * (i === 0 ? 1 : 0.6));
      }
      if (b.severity < CrashEffects.fireSeverity || b.isTakedown) continue;
      const grow = Ease.outCubic(t / 0.12);
      const fade = 1 - Ease.clamp01((t - 0.1) / (CrashEffects.blastLifetime - 0.1));
      const size = 0.5 + 0.35 * b.severity;
      const offsets = [v(0, 0), v(7, 4), v(-6, 5), v(2, -7)];
      for (const [color, scale, opacity] of [
        ['fireDeep', 1.3, 0.55],
        ['fireOuter', 1.0, 0.9],
      ] as [ColorToken, number, number][]) {
        offsets.forEach((o, i) => {
          const radius = (i === 0 ? 20 : 14) * scale * size * (0.3 + 0.7 * grow);
          list.w(circle(add(b.position, mul(o, grow * size)), radius), color, opacity * fade);
        });
      }
      list.w(circle(b.position, 11 * size * (0.3 + 0.7 * grow) * (0.4 + 0.6 * fade)), 'fireCore', fade);
    }
    for (const p of this.particles) {
      const x = p.age / p.lifetime;
      if (p.kind.k === 'debris') list.w(rect(p.position, p.size, 0.6, p.rotation), p.kind.color, 1 - Ease.clamp01((x - 0.6) / 0.4));
      else if (p.kind.k === 'spark') list.w(line(sub(p.position, mul(p.velocity, 0.045)), p.position, 1.4), 'spark', 1 - x);
    }
  }

  private modelOf(veh: Vehicle): CarModel | null {
    return veh.type === 'car' ? Skins.model(skinFor(veh.id, this.carSkins)) : null;
  }

  private addWreck(list: RenderList, veh: Vehicle, state: Crashed, pose: { position: Vec2; heading: number }, world: World, springTime: number | null): void {
    const c = world.config;
    const fade = 1 - Ease.clamp01((state.elapsed - (c.crashDuration - CrashEffects.wreckFade)) / CrashEffects.wreckFade);
    const fire = this.fires.get(veh.id);
    const char = fire === undefined ? 0.35 : Ease.outCubic(state.elapsed / 0.5);
    CarArt.add(list, { id: veh.id, type: veh.type, pose, dents: veh.dents, char, opacity: fade, springTime, model: this.modelOf(veh) }, c);
    if (fire === undefined) return;
    const heat = fade * (1 - Ease.clamp01((state.elapsed - 0.3) / 1.3));
    if (heat <= 0.02) return;
    const origin = CarArt.deformed(state.damage, veh.dents, c);
    const phase = veh.id * 1.7;
    [v(0, 0), v(-4, 3)].forEach((offset, i) => {
      const flicker = 0.75 + 0.25 * Math.sin(state.elapsed * 23 + phase + i * 2.1);
      const at = worldOf(add(origin, offset), pose);
      const radius = (i === 0 ? 6.5 : 4.5) * flicker * (0.5 + 0.5 * heat) * Math.min(fire, 1.2);
      list.w(circle(at, radius), 'fireOuter', 0.9 * heat);
      list.w(circle(at, radius * 0.5), 'fireCore', heat);
    });
  }

  /** Runs every frame for every dented vehicle: it allocates nothing until a part actually breaks. */
  private tearOffParts(wreck: Vehicle, world: World, reduceMotion: boolean): void {
    const c = world.config;
    const rng = this.rng;
    const model = this.modelOf(wreck);
    let done = this.torn.get(wreck.id);
    for (const part of CarArt.parts(wreck.type, model)) {
      if (done?.has(part) || !CarArt.isBroken(part, wreck.type, wreck.dents, c, model)) continue;
      if (!done) this.torn.set(wreck.id, (done = new Set<Part>()));
      done.add(part);
      const crashed = wreck.phase.kind === 'crashed' ? wreck.phase : null;
      const velocity = crashed ? crashed.velocity : mul(sub(wreck.position, wreck.prevPosition), 1 / STEP);
      const spin = crashed ? crashed.spin : 0;
      const pose = { position: wreck.position, heading: wreck.heading };
      const shape = CarArt.shape(part, wreck.type, c, model);
      const center = worldOf(shape.center, pose);
      const armVec = sub(center, wreck.position);
      const carried = add(velocity, mul(left(armVec), spin));
      const outward = length(armVec) > 1e-6 ? normalize(armVec) : fromAngle(wreck.heading);
      if (CarArt.isGlass(part)) {
        for (let i = 0; i < 6; i++) {
          const dir = fromAngle(rng.unit() * TAU);
          this.particles.push({
            kind: { k: 'debris', color: 'vehicleGlass' },
            position: add(center, mul(dir, 2)),
            velocity: reduceMotion ? v(0, 0) : add(carried, mul(dir, rng.range(20, 60))),
            rotation: rng.unit() * TAU,
            spin: reduceMotion ? 0 : rng.range(-12, 12),
            size: v(rng.range(1.5, 3), rng.range(1, 2)),
            age: 0,
            lifetime: rng.range(0.9, 1.3),
          });
        }
        continue;
      }
      this.particles.push({
        kind: { k: 'part', color: shape.color },
        position: center,
        velocity: reduceMotion ? v(0, 0) : add(carried, mul(outward, rng.range(25, 70))),
        rotation: wreck.heading,
        spin: reduceMotion ? 0 : rng.range(3, 10) * (rng.unit() < 0.5 ? -1 : 1),
        size: shape.size,
        age: 0,
        lifetime: rng.range(1.8, 2.4),
      });
    }
  }
}
