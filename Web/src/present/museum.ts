import type { Career } from '../core/career';
import { type Config, type BossKind, type CityEvent, baseConfig } from '../core/config';
import type { FailCause } from '../core/events';
import { type MuseumShelf, type MuseumEntry, type SpecialKind, type WeatherKind, type DarkKind, shelfEntries, museumId, firstPlace } from '../core/museum';
import { rematch } from '../core/trials';
import { type VehicleType, isHeavy } from '../core/vehicle';
import { type Vec2, v, add, mul, fromAngle, TAU } from '../core/vec2';
import { type RenderList, type RenderItem, type Rect, RenderList as List, R, rect, pinned, drawText, Ease } from './render';
import type { ColorToken } from './theme';
import { MenuKit } from './menukit';
import { type At, type Pen, moneyTag, pen, pose, Motion } from './icons';
import { S, Fmt } from './strings';
import { ShopPage } from './shop';
import { CarArt } from './carArt';
import { SYNDICATE_BOSS, SYNDICATE_ESCORT } from './scene';

/** What the Museum section remembers: the entry in the detail sheet, and the entries scrolled into view. */
export class MuseumState {
  selected: string | null = null;
  /** Entries that were on screen: leaving the Museum, what was new among them counts as seen. */
  readonly viewed = new Set<string>();
}

const seen = (c: Career, e: MuseumEntry): boolean => c.museumSeen.includes(museumId(e));

/**
 * Who rides with a boss in its first round (`applyBoss`): how many, and whether they wear its
 * paint (the decoy, the kingpin) or are a second boss (the twins).
 */
const BOSS_FOLLOWERS: Record<BossKind, (c: Config) => { count: number; look: 'escort' | 'disguised' | 'twin' }> = {
  convoy: (c) => ({ count: c.convoyEscorts, look: 'escort' }),
  getaway: () => ({ count: 0, look: 'escort' }),
  armoured: (c) => ({ count: c.armouredEscorts, look: 'escort' }),
  phantom: (c) => ({ count: c.phantomEscorts, look: 'escort' }),
  twins: () => ({ count: 1, look: 'twin' }),
  decoy: (c) => ({ count: c.decoyEscorts, look: 'disguised' }),
  smuggler: () => ({ count: 0, look: 'escort' }),
  kingpin: (c) => ({ count: c.kingpinEscorts, look: 'disguised' }),
};

type Look = typeof SYNDICATE_BOSS | typeof SYNDICATE_ESCORT;

// MARK: Pictures of the conditions

/**
 * Draws an icon round the origin of a 64 × 48 box; `at` maps box points to the screen. Its parts move on the clock `t`
 * (`Motion`, seconds since it began to play; `Infinity` is the still picture).
 */
type Icon = (p: Pen, at: At, t: number) => void;

function cloud(p: Pen, a: At, color: ColorToken): void {
  p.disc(a, -11, -2, 9, color);
  p.disc(a, 2, -9, 12, color);
  p.disc(a, 14, -2, 8, color);
  p.box(a, 1, 2, 42, 12, 6, color);
}

/** The cloud bobs once, or shakes with `shake` (a storm). */
const cloudAt = (at: At, t: number, shake = 0): At => pose(at, 0, 0, { dy: Motion.swing(t, 0, 1.6, 1.4, 3), dx: Motion.swing(t, 0, shake, 7, 6) });

/** Rain falling `cycles` times, each drop a moment after the one before; at rest they hang under the cloud. */
function drops(p: Pen, at: At, t: number, count: number, cycles = 2): void {
  for (let i = 0; i < count; i++) {
    const x = count === 1 ? 0 : -15 + (i * 30) / (count - 1);
    const y = 13 + (i % 2) * 5;
    const f = Motion.cycle(t, i * 0.09, 1.5, cycles);
    const share = f > 0.7 ? (1 - f) / 0.3 : 1;
    p.line(at, x, y + f * 9, x - 3, y + 7 + f * 9, 2.4, 'lightBlue', share);
  }
}

function bolt(p: Pen, a: At, dx: number, share = 1): void {
  p.shape(a, [3 + dx, 4, -6 + dx, 17, 0 + dx, 17, -4 + dx, 26, 8 + dx, 12, 2 + dx, 12, 6 + dx, 4], 'coin', share, 0.8);
}

/** A lightning bolt flashes on and off before it stays. */
const strike = (t: number, start: number): number => (t < start + 0.6 && Motion.blink(t, start, 3, 7) ? 0.15 : 1);

/** A crescent moon: a disc with a disc of the card's colour cut out of it. */
function moon(p: Pen, a: At, x: number, y: number, r: number): void {
  p.disc(a, x, y, r, 'headlight');
  p.disc(a, x + r * 0.45, y - r * 0.3, r * 0.85, 'card');
}

const WEATHER_ICON: Record<WeatherKind, Icon> = {
  lightRain: (p, at, t) => {
    cloud(p, cloudAt(at, t), 'muted');
    drops(p, at, t, 3);
  },
  heavyRain: (p, at, t) => {
    cloud(p, cloudAt(at, t), 'muted');
    drops(p, at, t, 6, 3);
  },
  storm: (p, at, t) => {
    const a = cloudAt(at, t, 1.2);
    cloud(p, a, 'muted');
    drops(p, at, t, 2);
    bolt(p, a, 2, strike(t, 0.1));
  },
  extreme: (p, at, t) => {
    const a = cloudAt(at, t, 1.6);
    cloud(p, a, 'muted');
    drops(p, at, t, 4, 3);
    bolt(p, a, -8, strike(t, 0.05));
    bolt(p, a, 12, strike(t, 0.25));
  },
  fog: (p, at, t) => {
    cloud(p, cloudAt(at, t), 'muted');
    // The banks of fog drift to and fro, each its own way.
    [[12, 40], [18, 30], [24, 36]].forEach(([y, w], i) => {
      const dx = Motion.swing(t, i * 0.08, i % 2 ? -4 : 4, 0.9, 2.4);
      p.line(at, -w / 2 + dx, y, w / 2 + dx, y, 3, 'smokeLight');
    });
  },
  hail: (p, at, t) => {
    cloud(p, cloudAt(at, t), 'muted');
    stones(p, at, t);
  },
  sandstorm: (p, at, t) => {
    // A low sun behind the dust, and the dust blowing across it.
    const s = Motion.squash(t, 0, 0.08);
    p.disc(pose(at, 8, -6, { sx: s, sy: s }), 8, -6, 14, 'juiceOrange');
    [[-10, 46, -4], [0, 38, 4], [10, 50, -2], [20, 34, 6]].forEach(([y, w, x], i) => {
      const dx = Motion.swing(t, i * 0.06, 5, 1.1, 2.6);
      p.line(at, x - w / 2 + dx, y, x + w / 2 + dx, y, 3.4, 'mapSand');
    });
  },
  snow: (p, at, t) => {
    // A snowflake: three bars and their tips. It turns a sixth and settles.
    const k = Motion.ramp(t, 0, 1.1, Ease.spring);
    const s = Motion.squash(t, 0, 0.12);
    const a = pose(at, 0, 0, { turn: (1 - k) * (-Math.PI / 3), sx: s, sy: s });
    for (let j = 0; j < 3; j++) {
      const angle = (j * Math.PI) / 3;
      const d = v(Math.cos(angle) * 18, Math.sin(angle) * 18);
      p.line(a, -d.x, -d.y, d.x, d.y, 3, 'skinIce');
      for (const side of [-1, 1]) {
        const tip = v(d.x * side * 0.62, d.y * side * 0.62);
        const n = v(-Math.sin(angle) * 5, Math.cos(angle) * 5);
        p.line(a, tip.x, tip.y, tip.x * 1.25 + n.x, tip.y * 1.25 + n.y, 2, 'skinIce');
        p.line(a, tip.x, tip.y, tip.x * 1.25 - n.x, tip.y * 1.25 - n.y, 2, 'skinIce');
      }
    }
  },
};

/** A few round hailstones under the cloud; they drop in and bounce. */
function stones(p: Pen, at: At, t: number): void {
  [[-14, 14, 3], [-3, 20, 3.6], [9, 13, 2.8], [17, 21, 3.2], [3, 27, 2.4]].forEach(([x, y, r], i) => {
    const k = Motion.ramp(t, 0.05 + i * 0.08, 0.55, Ease.spring);
    p.disc(at, x, y - (1 - k) * 12, r, 'primary', Ease.clamp01(k * 3));
  });
}

const DARK_ICON: Record<DarkKind, Icon> = {
  night: (p, at, t) => {
    moon(p, pose(at, -2, 0, { turn: Motion.swing(t, 0, 0.22, 1.2, 3) }), -2, 0, 17);
    // The stars twinkle one after the other.
    [[-22, -14, 1.8], [20, 12, 1.5], [22, -16, 2]].forEach(([x, y, r], i) => {
      const k = 1 + Motion.bump(t, 0.15 + i * 0.16, 0.4) * 1.2;
      p.star(at, x, y, r * 2 * k, r * 0.8 * k, 'headlight', 1, 0.4, Motion.ramp(t, 0.15 + i * 0.16, 0.4) * 0.6);
    });
  },
  blackout: (p, at, t) => {
    moon(p, at, -16, -10, 10);
    // A street lamp flickers and goes out; then the cross.
    const lamp = pose(at, 10, -12, { turn: Motion.swing(t, 0, 0.06, 2.5) });
    if (t < 0.5 && Motion.blink(t, 0, 3, 7)) p.shape(lamp, [-5, -11, 1, -11, 12, 14, -16, 14], 'headlight', 0.35, 3);
    p.line(at, 10, 22, 10, -12, 3, 'muted');
    p.line(lamp, 10, -12, 0, -16, 3, 'muted');
    p.box(lamp, -2, -14, 12, 5, 2, 'muted');
    const k1 = Motion.ramp(t, 0.5, 0.2);
    const k2 = Motion.ramp(t, 0.62, 0.2);
    p.line(at, -6, -6, -6 + 8 * k1, -6 + 8 * k1, 2.2, 'destructive', k1 > 0 ? 1 : 0);
    p.line(at, 2, -6, 2 - 8 * k2, -6 + 8 * k2, 2.2, 'destructive', k2 > 0 ? 1 : 0);
  },
};

/** A figure mid-stride: arms and legs swing round shoulder and hip, the body bobs with each step. */
function stride(p: Pen, at: At, t: number, tint: ColorToken, arms: number[], legs: number[]): At {
  const s = Motion.swing(t, 0, 0.45, 1.8, 2.6);
  const a = pose(at, 0, 0, { dy: -Math.abs(Motion.swing(t, 0, 2, 1.8, 2.6)) });
  const shoulder = pose(a, 1, -8, { turn: s });
  const backArm = pose(a, 1, -8, { turn: -s });
  const hip = pose(a, -2, 4, { turn: -s });
  const backLeg = pose(a, -2, 4, { turn: s });
  p.line(backArm, 1, -8, arms[2], arms[3], 3.2, tint);
  p.line(backLeg, -2, 4, legs[2], legs[3], 3.6, tint);
  p.line(a, 3, -11, -2, 3, 4.4, tint);
  p.disc(a, 4, -17, 5, tint);
  p.line(shoulder, 1, -8, arms[0], arms[1], 3.2, tint);
  p.line(hip, -2, 4, legs[0], legs[1], 3.6, tint);
  return a;
}

const EVENT_ICON: Record<CityEvent, Icon> = {
  marathon: (p, at, t) => {
    // A runner mid-stride, and the finishing tape that wobbles as he reaches it.
    stride(p, at, t, 'juiceOrange', [12, -2, -10, -10], [10, 12, -10, 18]);
    const sag = Motion.swing(t, 0.2, 2.5, 2.2, 4);
    p.line(at, -26, 22, 0, 22 + sag, 2.4, 'primary');
    p.line(at, 0, 22 + sag, 26, 22, 2.4, 'primary');
  },
  roadworks: (p, at, t) => {
    // The cone hops and lands with a squash.
    const s = Motion.squash(t, 0.25, 0.16);
    const a = pose(at, 0, 16, { sx: 2 - s, sy: s, dy: -Motion.bump(t, 0, 0.28) * 7 });
    p.shape(a, [0, -20, -11, 14, 11, 14], 'juiceOrange', 1, 3);
    p.box(a, 0, -4, 10, 4, 1, 'primary');
    p.box(a, 0, 6, 15, 4, 1, 'primary');
    p.box(at, 0, 16, 32, 5, 2.5, 'juiceOrange');
  },
  roadClosure: (p, at, t) => {
    // The barrier drops onto its posts and bounces.
    const k = Motion.ramp(t, 0, 0.55, Ease.spring);
    const a = pose(at, 0, 0, { dy: (1 - k) * -12 });
    p.line(at, -16, 2, -16, 20, 3, 'muted');
    p.line(at, 16, 2, 16, 20, 3, 'muted');
    p.box(a, 0, -4, 50, 15, 3, 'primary');
    for (const x of [-17, -5, 7, 19]) p.shape(a, [x - 1, -11, x + 5, -11, x - 1, 3, x - 7, 3], 'juiceRed');
  },
  concert: (p, at, t) => {
    // Two notes bouncing to the beat.
    const one = pose(at, -6, 12, { dy: -Motion.bump(t, 0, 0.3) * 5, turn: Motion.swing(t, 0, 0.12, 2) });
    const two = pose(at, 18, 8, { dy: -Motion.bump(t, 0.18, 0.3) * 5, turn: Motion.swing(t, 0.18, -0.12, 2) });
    p.shape(at, [-6, -12, 18, -18, 18, -11, -6, -5], 'rarityEpic', 1, 1);
    p.line(one, -6, -12, -6, 12, 2.5, 'rarityEpic');
    p.disc(one, -11, 12, 6, 'rarityEpic');
    p.line(two, 18, -18, 18, 8, 2.5, 'rarityEpic');
    p.disc(two, 13, 8, 6, 'rarityEpic');
  },
  vipConvoy: (p, at, t) => {
    // The star spins a point round and pops.
    const k = Motion.ramp(t, 0, 0.9, Ease.spring);
    const s = Motion.squash(t, 0, 0.14);
    p.star(pose(at, 0, 1, { sx: s, sy: s }), 0, 1, 21, 9, 'coin', 1, 2, (1 - k) * (-TAU / 5));
    const glint = Motion.bump(t, 0.35, 0.4);
    if (glint > 0) p.star(at, 14, -14, 4 * glint, 1.6 * glint, 'headlight', 1, 0.3);
  },
  policeOperation: (p, at, t) => {
    // The badge swings from its top, its star turns.
    const a = pose(at, 0, -21, { turn: Motion.swing(t, 0, 0.18) });
    p.shape(a, [0, -21, 17, -15, 15, 5, 0, 21, -15, 5, -17, -15], 'lightBlue', 1, 4);
    p.star(a, 0, -1, 9, 4, 'primary', 1, 1, (1 - Motion.ramp(t, 0.1, 0.8, Ease.spring)) * (TAU / 5));
  },
  schoolRun: (p, at, t) => {
    // A bus stop sign: the pole and its round plate with an H. It wobbles on its pole.
    const a = pose(at, 0, 22, { turn: Motion.swing(t, 0, 0.12, 1.6, 3) });
    p.line(a, 0, 22, 0, -4, 3, 'muted');
    p.disc(a, 0, -10, 14, 'vehicleBus');
    p.disc(a, 0, -10, 11, 'juiceGreen');
    p.line(a, -4, -16, -4, -4, 2.5, 'vehicleBus');
    p.line(a, 4, -16, 4, -4, 2.5, 'vehicleBus');
    p.line(a, -4, -10, 4, -10, 2.5, 'vehicleBus');
  },
};

/** A car seen from above, nose to the right, turned by `angle`: a body and a windscreen, in box units. */
function slab(p: Pen, a: At, x: number, y: number, w: number, h: number, angle: number, color: ColorToken): void {
  const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
  const spot = (dx: number, dy: number): number[] => [x + dx * cos - dy * sin, y + dx * sin + dy * cos];
  p.shape(a, [...spot(-w / 2, -h / 2), ...spot(w / 2 - h * 0.3, -h / 2), ...spot(w / 2, -h * 0.2), ...spot(w / 2, h * 0.2), ...spot(w / 2 - h * 0.3, h / 2), ...spot(-w / 2, h / 2)], color, 1, h * 0.22);
  p.shape(a, [...spot(w * 0.12, -h * 0.36), ...spot(w * 0.3, -h * 0.28), ...spot(w * 0.3, h * 0.28), ...spot(w * 0.12, h * 0.36)], 'card', 0.85, h * 0.08);
}

/** `at` moved back along `angle` until the moment of impact `hit`, jolted forward by a struck car after it. */
const driving = (at: At, t: number, angle: number, back: number, hit: number, jolt = 0): At => {
  const d = (1 - Motion.ramp(t, 0, hit, Ease.smoothstep)) * back - Motion.swing(t, hit, jolt, 3, 6);
  return pose(at, 0, 0, { dx: -Math.cos(angle) * d, dy: -Math.sin(angle) * d });
};

/** Two lanes of road, running left to right, with their dashed line. */
function road(p: Pen, at: At): void {
  p.box(at, 0, 0, 62, 36, 4, 'surface');
  for (const x of [-22, -8, 6, 20]) p.line(at, x - 3.2, 0, x + 3.2, 0, 1.6, 'muted');
}

/** The man on the run, with a bag of money (the criminal's mark): `tint` is his colour. Returns his posed box. */
function runner(p: Pen, at: At, t: number, tint: ColorToken): At {
  [[-4, 12], [4, 16], [12, 10]].forEach(([y, w], i) => {
    const k = Motion.ramp(t, 0.1 + i * 0.06, 0.3);
    p.line(at, -26 + w, y, -26 + w - w * k, y, 2, 'muted', k > 0 ? 1 : 0);
  });
  const a = stride(p, at, t, tint, [10, -3, -9, -12], [8, 10, -11, 16]);
  const bag = pose(a, 10, -3, { turn: Motion.swing(t, 0.05, 0.35, 1.8, 3) });
  p.disc(bag, 14, 4, 5.5, 'coin');
  p.box(bag, 14, -1, 3.2, 3, 1, 'coin');
  return a;
}

/** A prohibition sign: the red ring, and (after the picture inside it) the slash. It pops in. */
function forbidden(p: Pen, at: At, t: number): At {
  const s = Motion.squash(t, 0, 0.12);
  const a = pose(at, 0, 0, { sx: s, sy: s });
  p.disc(a, 0, 0, 22, 'destructive');
  p.disc(a, 0, 0, 17.5, 'card');
  return a;
}
function slash(p: Pen, a: At, t: number, start: number): void {
  const k = Motion.ramp(t, start, 0.25);
  p.line(a, -12.5, -12.5, -12.5 + 25 * k, -12.5 + 25 * k, 4, 'destructive', k > 0 ? 1 : 0);
}

/** The spark of an impact, flashing out at `start`. */
const burst = (p: Pen, at: At, t: number, start: number, x: number, y: number, r: number): void => {
  const k = Motion.ramp(t, start, 0.4, Ease.spring);
  if (k <= 0) return;
  const turn = (1 - k) * 0.8;
  p.star(at, x, y, r * k, r * 0.45 * k, 'juiceOrange', 1, 0.6, turn);
  p.star(at, x, y, r * 0.55 * k, r * 0.25 * k, 'coin', 1, 0.3, turn);
};

/**
 * The pictures follow the usual signs: two cars and a spark for a collision, a bomb in a warning triangle (ISO 7010
 * "explosive"), a man running off with his bag, a red ring with a slash for a rule. Your own car is white. A crash plays
 * itself: the cars meet at `HIT` and the spark flies.
 */
const HIT = 0.42;
const FAIL_ICON: Record<FailCause, Icon> = {
  mergeCrash: (p, at, t) => {
    // Your car turns into the lane and runs into the tail of the one ahead.
    road(p, at);
    slab(p, driving(at, t, 0, 0, HIT, 2.5), 13, -7, 24, 11, 0, 'rarityRare');
    slab(p, driving(at, t, -0.42, 12, HIT), -8, 6, 24, 11, -0.42, 'primary');
    burst(p, at, t, HIT - 0.02, 1, -1, 9);
  },
  cutOffCrash: (p, at, t) => {
    // Your car turns in right in front of the one behind: its nose runs into your tail.
    road(p, at);
    slab(p, driving(at, t, -0.4, 4, HIT, 2.5), 12, -2, 24, 11, -0.4, 'primary');
    slab(p, driving(at, t, 0, 12, HIT), -13, 7, 26, 12, 0, 'juiceRed');
    burst(p, at, t, HIT - 0.02, 0, 5, 9);
  },
  ringCrash: (p, at, t) => {
    // Two cars on the ring, meeting on its curve.
    p.ring(at, 0, 0, 19, 16, 'surface');
    for (let k = 0; k < 10; k++) p.ring(at, 0, 0, 19, 1.4, 'muted', 1, (k * TAU) / 10, (k * TAU) / 10 + 0.3);
    p.disc(at, 0, 0, 10, 'accent', 0.5);
    const close = 1 - Motion.ramp(t, 0, HIT, Ease.smoothstep);
    const onRing = (deg: number, color: ColorToken): void => {
      const a = (deg * Math.PI) / 180;
      slab(p, at, 19 * Math.cos(a), 19 * Math.sin(a), 15, 8, a + Math.PI / 2, color);
    };
    onRing(-95 - 45 * close, 'primary');
    onRing(-25 + 20 * close, 'rarityRare');
    burst(p, at, t, HIT - 0.02, 19 * Math.cos(-1.05), 19 * Math.sin(-1.05), 9);
  },
  policeCrash: (p, at, t) => {
    // A police car (light bar, red and blue) that has run into another car.
    road(p, at);
    slab(p, driving(at, t, 0, 0, HIT, 3), 16, 0, 22, 11, 0, 'rarityCommon');
    const police = driving(at, t, 0, 12, HIT);
    slab(p, police, -7, 0, 26, 12, 0, 'lightBlue');
    const swap = Motion.blink(t, 0, 6, 6);
    p.disc(police, -9, -3, 2.3, swap ? 'rarityRare' : 'juiceRed');
    p.disc(police, -9, 3, 2.3, swap ? 'juiceRed' : 'rarityRare');
    burst(p, at, t, HIT - 0.02, 6, 0, 9);
  },
  bomb: (p, at, t) => {
    // The explosive warning: a lit bomb in a triangle. The fuse spits, the sign trembles.
    const a = pose(at, 0, 20, { turn: Motion.swing(t, 0.1, 0.07, 6, 4) });
    p.shape(a, [0, -23, 26, 20, -26, 20], 'hazard', 1, 4);
    const s = Motion.squash(t, 0, 0.1);
    const bomb = pose(a, -1, 17, { sx: 2 - s, sy: s });
    p.disc(bomb, -1, 8, 9.5, 'background');
    p.disc(bomb, -4, 5, 2.4, 'smokeLight');
    p.box(bomb, 4, -1.5, 5, 4, 1, 'background');
    p.line(bomb, 6, -3, 9, -8, 2, 'background');
    const spark = t < 1.2 && Motion.blink(t, 0, 7, 9) ? 1.45 : 1;
    p.star(bomb, 10, -10, 5.5 * spark, 2.4 * spark, 'juiceRed', 1, 0.4, t === Infinity ? 0 : t * 4);
  },
  escape: (p, at, t) => {
    runner(p, at, t, 'vehicleCriminal');
  },
  bossEscape: (p, at, t) => {
    // The same man, lower in the box, with the crown the bosses wear; it bounces on his head.
    const lower = pose(at, 0, 0, { dy: 6 });
    const a = runner(p, lower, t, 'vehicleCriminal');
    const crown = pose(a, 4, -21, { dy: -Motion.bump(t, 0.1, 0.3) * 3, turn: Motion.swing(t, 0.1, 0.2, 2) });
    p.shape(crown, [-1, -21, -2, -28, 1.5, -24.5, 4, -29.5, 6.5, -24.5, 10, -28, 9, -21], 'coin', 1, 0.6);
  },
  ruleCrash: (p, at, t) => {
    const a = forbidden(p, at, t);
    burst(p, a, t, 0.12, 0, 0, 11);
    slash(p, a, t, 0.4);
  },
  ruleCutOff: (p, at, t) => {
    const a = forbidden(p, at, t);
    slab(p, driving(a, t, -0.4, 6, 0.35), 3, -4, 17, 8, -0.4, 'primary');
    slab(p, a, -4, 5, 18, 8, 0, 'muted');
    slash(p, a, t, 0.4);
  },
};

/** The glow behind an entry on show. A new kind has to pick one (the compiler checks). */
const SPECIAL_COLOR: Record<SpecialKind, ColorToken> = {
  police: 'lightBlue',
  pickup: 'juiceRed',
  transporter: 'coin',
  ambulance: 'lightBlue',
  truck: 'rarityCommon',
  tanker: 'juiceOrange',
  military: 'juiceGreen',
  fireTruck: 'juiceRed',
  motorbike: 'juiceRed',
  learner: 'learnerSign',
  bus: 'juiceYellow',
  oversize: 'vehicleOversize',
  racer: 'vehicleRacer',
  wedding: 'vehicleWedding',
};
const WEATHER_COLOR: Record<WeatherKind, ColorToken> = {
  lightRain: 'lightBlue',
  heavyRain: 'rarityRare',
  storm: 'coin',
  extreme: 'juiceRed',
  fog: 'smokeLight',
  snow: 'skinIce',
  hail: 'primary',
  sandstorm: 'mapSand',
};
const DARK_COLOR: Record<DarkKind, ColorToken> = { night: 'rarityEpic', blackout: 'muted' };
const EVENT_COLOR: Record<CityEvent, ColorToken> = {
  roadworks: 'juiceOrange',
  roadClosure: 'juiceRed',
  concert: 'rarityEpic',
  vipConvoy: 'coin',
  policeOperation: 'lightBlue',
  schoolRun: 'juiceYellow',
  marathon: 'juiceOrange',
};

/**
 * The Museum (Progress tab): the syndicate's bosses, the special vehicles and the city's
 * conditions, one shelf under the other in a list (`ProgressPage`). What has not been met yet
 * is a grey silhouette; a tap on an entry opens the detail sheet with what it asks of you.
 */
export const MuseumPage = {
  /** Bosses are rows; the other shelves are cards, three to a row. */
  bossHeight: 92,
  cardHeight: 118,
  columns: (shelf: MuseumShelf): number => (shelf === 0 ? 1 : 3),

  name: (e: MuseumEntry): string => S.museum.name(e),

  color(e: MuseumEntry): ColorToken {
    switch (e.k) {
      case 'boss':
        return 'coin';
      case 'special':
        return SPECIAL_COLOR[e.kind];
      case 'weather':
        return WEATHER_COLOR[e.kind];
      case 'dark':
        return DARK_COLOR[e.kind];
      case 'event':
        return EVENT_COLOR[e.kind];
      case 'road':
        return 'accent';
      case 'fail':
        return 'destructive';
    }
  },

  /** Shown so far / all, for a shelf's heading. */
  count(career: Career, shelf: MuseumShelf): { shown: number; all: number } {
    const entries = shelfEntries(shelf);
    return { shown: entries.filter((e) => seen(career, e)).length, all: entries.length };
  },

  /** One entry in its cell: a boss row or a card, with the NEW badge and the ring when chosen. */
  addEntry(list: RenderList, entry: MuseumEntry, r: Rect, career: Career, state: MuseumState, time: number, o: number): void {
    const id = museumId(entry);
    const c = R.center(r);
    if (state.selected === id) list.s(rect(c, v(R.width(r) + 4, R.height(r) + 4), ShopPage.corner + 2), 'accent', 0.9 * o);
    ShopPage.panel(list, r, 'card', o);
    if (entry.k === 'boss') MuseumPage.addBossRow(list, entry.kind, r, career, time, o);
    else MuseumPage.addCard(list, entry, r, career, time, o);
    if (career.museumNew.includes(id)) {
      const at = v(r.minX + 22, r.minY + 12);
      list.s(rect(at, v(30, 15), 7.5), 'accent', o);
      drawText(list, S.museum.newBadge, at, 9, 'accentInk', { opacity: o, weight: 'bold', align: 'center' });
    }
  },

  addBossRow(list: RenderList, kind: BossKind, r: Rect, career: Career, time: number, o: number): void {
    const entry: MuseumEntry = { k: 'boss', kind };
    const shown = seen(career, entry);
    const beaten = career.bossesBeaten.includes(kind);
    const c = R.center(r);
    const artWidth = Math.min(96, R.width(r) * 0.3);
    MuseumPage.art(list, entry, v(r.minX + 8 + artWidth / 2, c.y), Math.min(1, R.height(r) / 92), shown, time, o, artWidth);
    const x = r.minX + artWidth + 20;
    const match = rematch(kind);
    const won = career.trialsDone.includes(match.id);
    const right = beaten ? 86 : 16;
    const title = shown ? S.museum.name(entry) : S.museum.unknown;
    drawText(list, title, v(x, c.y - 16), ShopPage.fitted(title, 14, r.maxX - right - x), beaten ? 'coin' : shown ? 'primary' : 'muted', { opacity: o, weight: 'bold' });
    const at = firstPlace(entry, baseConfig);
    const lineText = shown ? S.museum.line(entry) : S.museum.firstAt(at.level, at.rank);
    drawText(list, lineText, v(x, c.y + 3), ShopPage.fitted(lineText, 11, r.maxX - 16 - x), 'muted', { opacity: o });
    const status = beaten ? S.boss.beaten : shown ? S.museum.met : S.museum.notSeen;
    drawText(list, status, v(x, c.y + 21), 11, beaten ? 'accent' : 'muted', { opacity: o, weight: 'bold' });
    if (!beaten) return;
    if (won) drawText(list, S.trials.passed, v(r.maxX - 16, c.y - 16), 12, 'accent', { opacity: o, weight: 'bold', align: 'trailing' });
    else moneyTag(list, Fmt.number(match.reward), v(r.maxX - 16, c.y - 16), 13, 'trailing', 'primary', 'accent', o);
    drawText(list, `${S.museum.rematch} ›`, v(r.maxX - 16, c.y + 21), 11, won ? 'muted' : 'coin', { opacity: o, weight: 'bold', align: 'trailing' });
  },

  /** A card: the picture on top, the name and one line below. */
  addCard(list: RenderList, entry: MuseumEntry, r: Rect, career: Career, time: number, o: number): void {
    const shown = seen(career, entry);
    const c = R.center(r);
    const scale = Math.min(1, R.height(r) / 118);
    MuseumPage.art(list, entry, v(c.x, r.minY + R.height(r) * 0.38), scale, shown, time, o, R.width(r) - 24);
    const name = shown ? S.museum.name(entry) : S.museum.unknown;
    drawText(list, name, v(c.x, r.maxY - 30), ShopPage.fitted(name, 13, R.width(r) - 12), shown ? 'primary' : 'muted', { opacity: o, weight: 'bold', align: 'center' });
    const at = firstPlace(entry, baseConfig);
    const lineText = shown ? S.museum.line(entry) : at.rank > 0 || at.level > 1 ? S.museum.firstAt(at.level, at.rank) : S.museum.notSeen;
    drawText(list, lineText, v(c.x, r.maxY - 13), ShopPage.fitted(lineText, 10, R.width(r) - 10), 'muted', { opacity: o, align: 'center' });
  },

  /**
   * The picture: a vehicle drawn with the game's own art and turned a little (a boss ahead of
   * its escorts), or the icon of a condition. Not on show yet, it is a flat grey silhouette:
   * one opaque grey, so no part shows through.
   */
  art(list: RenderList, entry: MuseumEntry, center: Vec2, scale: number, shown: boolean, time: number, opacity: number, room = 88, t = Infinity): void {
    const drawn = entry.k === 'boss' || entry.k === 'special' ? MuseumPage.vehicles(list, entry, center, scale, shown, time, room) : MuseumPage.icon(list, entry, center, scale, room, t);
    if (shown) MenuKit.glow(list, center, Math.min(room * 0.5, 44 * scale), MuseumPage.color(entry), 0.3 * opacity);
    for (const it of drawn) {
      if (shown) list.items.push({ ...it, opacity: it.opacity * opacity });
      else if (it.color === 'card') list.items.push({ ...it, opacity });
      else if (it.color !== 'shadow' && it.opacity >= 0.5) list.items.push({ ...it, color: 'wreck', opacity });
    }
  },

  vehicles(list: RenderList, entry: MuseumEntry, center: Vec2, scale: number, shown: boolean, time: number, room: number): RenderItem[] {
    const c = baseConfig;
    const heading = -0.28;
    const ahead = fromAngle(heading);
    const cars: { type: VehicleType; at: Vec2; look: Look | null }[] = [];
    let length: number;
    if (entry.k === 'boss') {
      // The boss in front, its escorts behind it along its heading, the whole convoy centred.
      const followers = BOSS_FOLLOWERS[entry.kind](c);
      const escorts = followers.count;
      const step = c.carLength * 1.12;
      length = c.carLength + escorts * step;
      const front = mul(ahead, (escorts * step) / 2);
      cars.push({ type: 'pickup', at: front, look: SYNDICATE_BOSS });
      for (let i = 1; i <= escorts; i++) {
        const at = add(front, mul(ahead, -i * step));
        if (followers.look === 'twin') cars.push({ type: 'pickup', at, look: SYNDICATE_BOSS });
        else cars.push({ type: 'van', at, look: followers.look === 'disguised' ? SYNDICATE_BOSS : SYNDICATE_ESCORT });
      }
    } else {
      const type = entry.kind as VehicleType;
      length = isHeavy(type) ? Math.max(c.truckLength, CarArt.length(type, c)) : CarArt.length(type, c);
      cars.push({ type, at: v(0, 0), look: null });
    }
    // A car is the same size on every card, unless a convoy or a lorry needs the room.
    const span = length * Math.cos(heading) + c.carWidth;
    const pxPerUnit = Math.min((40 * scale) / c.carLength, (room * 0.9) / span);
    const preview = new List({ viewport: list.camera.viewport, center: v(0, 0), focus: center, scale: pxPerUnit }, list.background);
    // Back to front, so the boss sits on top of its escorts.
    [...cars].reverse().forEach((car, i) => {
      const flashing = shown && (car.type === 'police' || car.type === 'ambulance' || car.type === 'fireTruck');
      CarArt.add(
        preview,
        {
          id: 11 + i,
          type: car.type,
          pose: { position: car.at, heading },
          dents: [],
          lights: flashing ? time : null,
          skin: car.look?.paint ?? null,
          stripe: car.look?.stripe ?? null,
          roof: car.look?.roof ?? null,
          finish: null,
          finishTime: null,
        },
        c,
      );
    });
    return preview.items.map((it) => pinned(it, preview.camera, 1));
  },

  /** A condition's icon; its parts play on the clock `t` (`Motion`), `Infinity` draws it still. */
  icon(list: RenderList, entry: MuseumEntry, center: Vec2, scale: number, room: number, t = Infinity): RenderItem[] {
    // A failure's picture has a road or a sign round it: it gets a step more room than a plain symbol.
    const u = Math.min(1.05 * scale, room / 66) * (entry.k === 'fail' ? 1.2 : 1);
    const at: At = (x, y) => add(center, v(x * u, y * u));
    const icon = new List(list.camera, list.background);
    const p = pen(icon, u);
    if (entry.k === 'weather') WEATHER_ICON[entry.kind](p, at, t);
    else if (entry.k === 'dark') DARK_ICON[entry.kind](p, at, t);
    else if (entry.k === 'event') EVENT_ICON[entry.kind](p, at, t);
    else if (entry.k === 'fail') FAIL_ICON[entry.kind](p, at, t);
    else if (entry.k === 'road') {
      // Two lanes round an island, the dashed line between them; the dashes run once round.
      const turn = Motion.ramp(t, 0, 1, Ease.spring) * (TAU / 10);
      p.ring(at, 0, 0, 17, 16, 'surface');
      for (let k = 0; k < 10; k++) p.ring(at, 0, 0, 17, 1.4, 'primary', 1, (k * TAU) / 10 + turn, (k * TAU) / 10 + 0.35 + turn);
      p.disc(at, 0, 0, 8, 'accent');
    }
    return icon.items;
  },
};
