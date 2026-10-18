/**
 * The weekly league of the crews (Leo, 18.10.2026): every crew plays a week in a group of its league, ranked by the
 * Season XP its members earned that week. The best `PROMOTE` go up a league, the last `DEMOTE` go down; going down costs
 * nothing but the league. While there are few crews, computer crews fill the groups: named as computers on screen, their
 * week drawn from the week, the group and the slot, so every member sees the same table.
 */

export const LEAGUES = ['bronze', 'silver', 'gold', 'platinum', 'diamond'] as const;
export type League = (typeof LEAGUES)[number];

/** Crews in a group, computers included; real crews per group at most, so a group always has someone to race. */
export const GROUP_SIZE = 10;
export const GROUP_REAL = 6;
export const PROMOTE = 3;
export const DEMOTE = 3;

/** What a computer crew earns in a whole week, per league: a draw between 35 % and 165 % of this. */
export const BOT_WEEK_XP: readonly number[] = [700, 1600, 3200, 5600, 9000];

/** The crew's weekly goal: this much Season XP for every member (two at least); reached, it pays every member who helped a Standard Chest. */
export const GOAL_PER_MEMBER = 150;

const BOT_NAMES = [
  'Night Owls',
  'Ring Riders',
  'Exit Strategy',
  'Lane Changers',
  'Merge Masters',
  'Rush Hour Club',
  'Yield Squad',
  'Turbo Turtles',
  'Green Wave',
  'Kerb Crawlers',
  'Signal Seekers',
  'Gap Hunters',
  'Slow Lane',
  'Tight Fits',
];

const WEEK_MS = 7 * 86_400_000;
/** Monday 5 January 1970, 00:00 UTC: weeks start on a Monday. */
const MONDAY = Date.UTC(1970, 0, 5);

export const weekOf = (now: number): number => Math.floor((now - MONDAY) / WEEK_MS);
export const weekStart = (week: number): number => MONDAY + week * WEEK_MS;
export const weekEnd = (week: number): number => weekStart(week + 1);

/** 0…1 from four numbers, the same every time. */
function unit(a: number, b: number, c: number, d: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(c + 0x27d4eb2f, 0x165667b1) ^ Math.imul(d + 0x85ebca77, 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export interface Standing {
  /** The crew's id, or null for a computer crew. */
  id: string | null;
  name: string;
  xp: number;
  computer: boolean;
}

/** The computer crews of a group as far as the week has come: each earns its week over the days, at its own pace. */
export function botsOf(week: number, league: number, group: number, count: number, now: number): Standing[] {
  const progress = Math.min(1, Math.max(0, (now - weekStart(week)) / WEEK_MS));
  const names = [...BOT_NAMES];
  return Array.from({ length: count }, (_, slot) => {
    const name = names.splice(Math.floor(unit(week, league, group, slot) * names.length), 1)[0] ?? 'Computer crew';
    const target = (BOT_WEEK_XP[league] ?? 0) * (0.35 + 1.3 * unit(week, league, group, slot + 100));
    const pace = 0.8 + 0.4 * unit(week, league, group, slot + 200);
    return { id: null, name, xp: Math.floor(target * progress ** pace), computer: true };
  });
}

/** The group's table: the most XP first; on a tie a real crew before a computer, then by name. */
export function rank(rows: Standing[]): Standing[] {
  return [...rows].sort((a, b) => b.xp - a.xp || Number(a.computer) - Number(b.computer) || a.name.localeCompare(b.name));
}

/** Where a place in the table leads: +1 up, −1 down, 0 staying. A crew with no XP never goes up. */
export function moveOf(place: number, size: number, league: number, xp: number): -1 | 0 | 1 {
  if (place < PROMOTE && league < LEAGUES.length - 1 && xp > 0) return 1;
  if (place >= size - DEMOTE && league > 0) return -1;
  return 0;
}
