import { baseConfig, type Config, type RoadModule, ROAD_MODULES, MODULE_MAX_LEVEL } from './config';
import { Careers, newCareer } from './career';
import { dailyEvent } from './daily';
import { forSeason } from './seasons';
import { seasonOf } from './loot';
import { UPGRADES, upgradeMaxSteps, type Upgrade } from './levels';
import { World } from './world';

/**
 * Replay proof (Leo, 04.11.2026): a record is sent with everything the rules need to play it again. The simulation is
 * deterministic (same seed + same taps = same result), so the service replays the run and compares the points. Only
 * runs that start on a fresh world qualify (Unlimited and the Daily never carry traffic over).
 */

/** Bump when a change to `core/` alters what a run scores; `scripts/test.mjs` replays a fixture and fails until then. */
export const PROOF_RULES = 1;

export type ProofMode = 'unlimited' | 'daily';

/** The part of the career a run's config depends on. */
export interface RunSetup {
  level: number;
  prestige: number;
  upgrades: Partial<Record<Upgrade, number>>;
  armSlots: number[];
  modules: Record<number, RoadModule>;
  moduleLevels: Record<number, number>;
  /** Vehicle types bought (`sportsCar`, `compact`, `van`, `classic`). */
  owns: string[];
}

export interface Proof {
  rules: number;
  mode: ProofMode;
  seed: number;
  /** The Daily's day number (its season and city event); 0 for Unlimited. */
  day: number;
  setup: RunSetup;
  /** The world began without traffic on the ring (the first shift after loading). */
  arriving?: boolean;
  /** Triples [world step, kind, value] in the order they happened: the step the world was in, `TAP` (value: the time handed to `World.tap`), `POLICE` or `REVIVE` (value: the time). */
  events: number[];
}

export const TAP = 0;
export const POLICE = 1;
export const REVIVE = 2;

export const OWNED_TYPES = ['sportsCar', 'compact', 'van', 'classic'] as const;

/** Largest run a proof may replay: an hour of play. */
export const MAX_STEPS = 120 * 3600;

/** Records the inputs of the world being played. */
export class ProofLog {
  events: number[] = [];

  add(step: number, kind: number, value = 0): void {
    this.events.push(step, kind, value);
  }
}

export function setupOf(c: ReturnType<typeof newCareer>): RunSetup {
  return {
    level: c.level,
    prestige: c.prestige,
    upgrades: { ...c.upgrades },
    armSlots: [...c.armSlots],
    modules: { ...c.modules },
    moduleLevels: { ...c.moduleLevels },
    owns: OWNED_TYPES.filter((id) => Careers.owns(c, id)),
  };
}

/** The run's config, rebuilt the way the session builds it (`GameSession.shiftConfig`). */
export function proofConfig(p: Pick<Proof, 'mode' | 'seed' | 'day' | 'setup'>, base: Config = baseConfig): Config {
  const career = newCareer();
  const s = p.setup;
  career.level = s.level;
  career.prestige = s.prestige;
  career.upgrades = { ...s.upgrades };
  career.armSlots = [...s.armSlots];
  career.modules = { ...s.modules };
  career.moduleLevels = { ...s.moduleLevels };
  career.collection = [...s.owns];
  if (p.mode === 'unlimited') return Careers.shiftConfig(career, 'unlimited', base, p.seed);
  return Careers.shiftConfig(career, 'shift', forSeason(base, seasonOf(p.day)), p.seed, dailyEvent(p.day), null);
}

export interface Replay {
  score: number;
  cars: number;
  ended: boolean;
  completed: boolean;
}

/** Plays the recorded inputs on a fresh world. Stops when the run has ended (and no later revive is left) or at `MAX_STEPS`. */
export function replay(p: Proof, base: Config = baseConfig): Replay {
  const world = new World(proofConfig(p, base), p.seed, { startsOnFirstTap: true, arriving: p.arriving });
  let i = 0;
  const e = p.events;
  while (world.stepCount < MAX_STEPS) {
    for (; i < e.length && e[i] === world.stepCount; i += 3) {
      if (e[i + 1] === TAP) world.tap(e[i + 2]);
      else if (e[i + 1] === POLICE) world.dispatchPolice();
      else world.revive(e[i + 2]);
    }
    if (world.shift.phase === 'ended' && i >= e.length) break;
    world.step();
    world.takeEvents();
  }
  const r = world.result(world.shift.outcome ?? 'struckOut', world.time);
  return { score: r.score, cars: r.carsSent, ended: world.shift.phase === 'ended', completed: world.shift.outcome === 'completed' };
}

const isInt = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/** A proof from the network, or null when it is not a well-formed one: every field is checked, nothing is trusted. */
export function cleanProof(raw: unknown, maxEvents = 60_000): Proof | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const p = raw as Record<string, unknown>;
  const set = p.setup as Record<string, unknown> | null;
  if (!isInt(p.rules, 0, 1e6) || (p.mode !== 'unlimited' && p.mode !== 'daily') || !isInt(p.seed, 0, 0xffffffff) || !isInt(p.day, 0, 1e6)) return null;
  if (typeof set !== 'object' || set === null || !isInt(set.level, 1, 300) || !isInt(set.prestige, 0, 100)) return null;
  const events = p.events;
  if (!Array.isArray(events) || events.length % 3 !== 0 || events.length > maxEvents * 3) return null;
  let last = 0;
  for (let i = 0; i < events.length; i += 3) {
    if (!isInt(events[i], last, MAX_STEPS) || !isInt(events[i + 1], TAP, REVIVE) || typeof events[i + 2] !== 'number' || !Number.isFinite(events[i + 2])) return null;
    last = events[i] as number;
  }
  const ups = set.upgrades as Record<string, unknown> | null;
  const upgrades: Partial<Record<Upgrade, number>> = {};
  for (const u of UPGRADES) if (ups && isInt(ups[u], 1, upgradeMaxSteps[u])) upgrades[u] = ups[u] as number;
  if (!Array.isArray(set.armSlots) || !set.armSlots.every((x) => isInt(x, 0, 15)) || !Array.isArray(set.owns)) return null;
  const modules: Record<number, RoadModule> = {};
  const moduleLevels: Record<number, number> = {};
  for (let slot = 0; slot <= 5; slot++) {
    const m = (set.modules as Record<string, unknown> | null)?.[slot];
    if (m === undefined) continue;
    if (!ROAD_MODULES.includes(m as RoadModule)) return null;
    modules[slot] = m as RoadModule;
    const lv = (set.moduleLevels as Record<string, unknown> | null)?.[slot];
    if (isInt(lv, 2, MODULE_MAX_LEVEL)) moduleLevels[slot] = lv;
  }
  return {
    rules: p.rules,
    mode: p.mode,
    seed: p.seed,
    day: p.day,
    arriving: p.arriving === true,
    setup: {
      level: set.level,
      prestige: set.prestige,
      upgrades,
      armSlots: [...set.armSlots] as number[],
      modules,
      moduleLevels,
      owns: OWNED_TYPES.filter((id) => (set.owns as unknown[]).includes(id)),
    },
    events: events as number[],
  };
}
