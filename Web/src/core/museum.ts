import { type Config, type BossKind, BOSS_KINDS } from './config';
import { firstBossLevel } from './levels';
import type { World } from './world';

/**
 * The Museum (Leo, 28.09.2026): the syndicate's bosses and the special vehicles, each one on
 * show once it has been on the road in front of you. Until then it is a grey silhouette.
 */
export type MuseumShelf = 0 | 1; // bosses · specials
export const MUSEUM_SHELVES: MuseumShelf[] = [0, 1];

/** The vehicles that are more than traffic: each one asks something of you. */
export type SpecialKind = 'police' | 'pickup' | 'transporter' | 'ambulance' | 'truck' | 'tanker' | 'military';
export const SPECIAL_KINDS: SpecialKind[] = ['police', 'pickup', 'transporter', 'ambulance', 'truck', 'tanker', 'military'];

export type MuseumEntry = { k: 'boss'; kind: BossKind } | { k: 'special'; kind: SpecialKind };

export const museumId = (e: MuseumEntry): string => `${e.k}.${e.kind}`;

export function museumEntry(id: string): MuseumEntry | null {
  const [k, kind] = id.split('.');
  if (k === 'boss' && BOSS_KINDS.includes(kind as BossKind)) return { k, kind: kind as BossKind };
  if (k === 'special' && SPECIAL_KINDS.includes(kind as SpecialKind)) return { k, kind: kind as SpecialKind };
  return null;
}

export function shelfEntries(shelf: MuseumShelf): MuseumEntry[] {
  return shelf === 0 ? BOSS_KINDS.map((kind): MuseumEntry => ({ k: 'boss', kind })) : SPECIAL_KINDS.map((kind): MuseumEntry => ({ k: 'special', kind }));
}

export const MUSEUM_IDS: string[] = MUSEUM_SHELVES.flatMap((s) => shelfEntries(s).map(museumId));

/** The first level whose shifts can bring it (1: from the start). */
export function firstLevel(e: MuseumEntry, c: Config): number {
  if (e.k === 'boss') return firstBossLevel(e.kind, c);
  switch (e.kind) {
    case 'tanker':
      return c.tankerLevel;
    case 'military':
      return c.militaryLevel;
    case 'ambulance':
      return c.ambulanceLevel;
    default:
      return 1;
  }
}

/** What is on the road right now that the Museum shows: bosses by kind, the specials by type. */
export function sightings(w: World): string[] {
  const out: string[] = [];
  for (const veh of w.vehicles) {
    let id: string | null = null;
    if (veh.role === 'boss') id = w.config.convoy ? museumId({ k: 'boss', kind: w.config.bossKind }) : null;
    else if (veh.role === null && SPECIAL_KINDS.includes(veh.type as SpecialKind)) id = museumId({ k: 'special', kind: veh.type as SpecialKind });
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

/**
 * A save from before the Museum: what it must have met already. Bosses it beat or passed,
 * the specials its stats count, and every special below the level it reached.
 */
export function inferredSightings(
  level: number,
  prestige: number,
  bossesBeaten: BossKind[],
  stats: { takedowns: number; transporters: number; ambulances: number },
  c: Config,
): string[] {
  return MUSEUM_SHELVES.flatMap(shelfEntries)
    .filter((e) => {
      if (prestige > 0) return true;
      if (e.k === 'boss') return bossesBeaten.includes(e.kind) || level > firstLevel(e, c);
      if (e.kind === 'pickup' || e.kind === 'police') return stats.takedowns > 0 || level > 2;
      if (e.kind === 'transporter') return stats.transporters > 0 || level > 2;
      if (e.kind === 'ambulance') return stats.ambulances > 0 || level > firstLevel(e, c);
      return level > firstLevel(e, c);
    })
    .map(museumId);
}
