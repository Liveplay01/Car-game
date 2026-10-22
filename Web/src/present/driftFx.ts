import { type World, STEP } from '../core/world';
import { driftGrip } from '../core/drift';
import { type Vec2, v, add, sub, mul, dist, fromAngle, left, clamp } from '../core/vec2';
import { Rng } from '../core/rng';
import { type RenderList, line, circle, Ease } from './render';
import type { DriftSound } from './feedback';

interface Streak {
  from: Vec2;
  to: Vec2;
  strength: number;
  age: number;
}

interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  age: number;
  life: number;
}

/**
 * What the drift car leaves behind: black rubber where its tyres slide (the rear pair heavier
 * than the front), and white smoke boiling off the rear wheels that hangs over the ring and
 * drifts away. The marks stay a while after it has gone.
 */
export class DriftFx {
  static readonly hold = 7;
  static readonly fade = 5;
  static readonly maxStreaks = 900;
  static readonly maxPuffs = 220;
  static readonly wind = v(9, 14);

  private streaks: Streak[] = [];
  private puffs: Puff[] = [];
  /** Where each wheel last laid rubber: rear left, rear right, front left, front right. */
  private last: (Vec2 | null)[] = [null, null, null, null];
  private smokeDue = 0;
  private rng = new Rng(0xd21f7a86);

  clear(): void {
    this.streaks = [];
    this.puffs = [];
    this.last = [null, null, null, null];
  }

  update(dt: number, world: World, thin: boolean): void {
    if (dt <= 0) return;
    for (const s of this.streaks) s.age += dt;
    if (this.streaks.length > 0 && this.streaks[0].age > DriftFx.hold + DriftFx.fade) this.streaks = this.streaks.filter((s) => s.age < DriftFx.hold + DriftFx.fade);
    const drag = Math.exp(-1.6 * dt);
    let kept = 0;
    for (const p of this.puffs) {
      p.age += dt;
      if (p.age >= p.life) continue;
      p.vx = p.vx * drag + DriftFx.wind.x * dt;
      p.vy = p.vy * drag + DriftFx.wind.y * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      this.puffs[kept++] = p;
    }
    this.puffs.length = kept;

    const d = world.drift;
    const veh = d.kind === 'on' ? world.vehicle(d.vehicle) : undefined;
    // A burnout or a launch spins the rear wheels even where the car does not slide.
    const spin = d.kind === 'on' ? d.spin : 0;
    const grip = Math.max(driftGrip(world), spin);
    if (!veh || veh.isCrashed || grip < 0.12) {
      this.last = [null, null, null, null];
      return;
    }
    const c = world.config;
    const ahead = fromAngle(veh.heading);
    const side = left(ahead);
    const half = c.carWidth / 2 - 1.2;
    const axle = c.driftLength * 0.3;
    const wheels = [
      add(sub(veh.position, mul(ahead, axle)), mul(side, half)),
      add(sub(veh.position, mul(ahead, axle)), mul(side, -half)),
      add(add(veh.position, mul(ahead, axle)), mul(side, half)),
      add(add(veh.position, mul(ahead, axle)), mul(side, -half)),
    ];
    wheels.forEach((at, i) => {
      // The fronts only mark once the slide is deep.
      const strength = i < 2 ? grip : clamp((driftGrip(world) - 0.6) * 1.6, 0, 1) * 0.5;
      const from = this.last[i];
      if (strength <= 0.05) {
        this.last[i] = null;
        return;
      }
      if (!from) {
        this.last[i] = at;
        return;
      }
      // Spinning on the spot: the rubber piles up where the wheel stands, a short dark patch.
      if (dist(from, at) < 2.5) {
        if (spin > 0.5 && this.rng.unit() < 0.15) this.streaks.push({ from: sub(at, mul(ahead, 2.2)), to: add(at, mul(ahead, 2.2)), strength: 0.5 * spin, age: 0 });
        return;
      }
      this.streaks.push({ from, to: at, strength: Math.min(strength, 1), age: 0 });
      this.last[i] = at;
    });
    if (this.streaks.length > DriftFx.maxStreaks) this.streaks.splice(0, this.streaks.length - DriftFx.maxStreaks);

    // Smoke off the spinning rear tyres: thicker on the throttle.
    const velocity = mul(sub(veh.position, veh.prevPosition), 1 / STEP);
    // Spinning on the spot it smokes, but thinly and blown back: the car stays in sight.
    const rate = (thin ? 22 : 48) * Math.max(driftGrip(world), 0.5 * spin) * (d.kind === 'on' && d.throttle ? 1 : 0.45);
    this.smokeDue += rate * dt;
    const rng = this.rng;
    while (this.smokeDue >= 1) {
      this.smokeDue -= 1;
      if (this.puffs.length >= DriftFx.maxPuffs) continue;
      const at = wheels[rng.unit() < 0.5 ? 0 : 1];
      const kick = mul(side, (rng.unit() - 0.5) * 50);
      this.puffs.push({
        x: at.x + rng.range(-2, 2),
        y: at.y + rng.range(-2, 2),
        vx: velocity.x * 0.25 + kick.x - ahead.x * (18 + 30 * spin),
        vy: velocity.y * 0.25 + kick.y - ahead.y * (18 + 30 * spin),
        size: rng.range(3.5, 6),
        age: 0,
        life: rng.range(1.3, 2.4),
      });
    }
  }

  addGround(list: RenderList): void {
    for (const s of this.streaks) {
      const fade = 1 - Ease.smoothstep((s.age - DriftFx.hold) / DriftFx.fade);
      if (fade <= 0.01) continue;
      list.w(line(s.from, s.to, 2.6), 'vehicleTire', 0.5 * s.strength * fade);
    }
  }

  /** Above the cars: the cloud the drifter drives out of. */
  addAir(list: RenderList): void {
    for (const p of this.puffs) {
      const x = p.age / p.life;
      const grow = Ease.outCubic(Math.min(1, x * 1.4));
      list.w(circle(v(p.x, p.y), p.size * (1 + 3.4 * grow)), 'smokeLight', 0.26 * (1 - x) * (1 - x) * Ease.clamp01(p.age / 0.08));
    }
  }

  /** The engine, the turbo and the tyres, for `AudioPlayer.updateDrift`; null while no drifter is out. */
  sound(world: World): DriftSound | null {
    const d = world.drift;
    if (d.kind !== 'on') return null;
    const veh = world.vehicle(d.vehicle);
    if (!veh || veh.isCrashed || veh.phase.kind === 'queued') return null;
    const reach = world.layout.ringRadius * 1.6;
    return {
      throttle: d.throttle,
      slide: clamp(driftGrip(world), 0, 1),
      spin: d.spin,
      lifts: d.lifts,
      pan: clamp(veh.position.x / reach, -0.8, 0.8),
      leaving: veh.phase.kind === 'exiting',
    };
  }
}
