import { randomUUID } from 'node:crypto';
import { randomCode } from '../../codes.ts';
import { transaction, type Db } from '../../db.ts';
import { DAY_MS, FeedbackStore, type RewardItem } from '../feedback/store.ts';
import { GOAL_PER_MEMBER, GROUP_REAL, GROUP_SIZE, LEAGUES, botsOf, moveOf, rank, weekOf, weekStart, type Standing } from './league.ts';

export const CREW_MIGRATIONS: readonly string[] = [
  // The owner has no foreign key: a deleted owner hands the crew to the member who joined first (`ownerOf`).
  `CREATE TABLE crews (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    renamed_at INTEGER NOT NULL,
    league INTEGER NOT NULL DEFAULT 0,
    last_week INTEGER,
    last_place INTEGER,
    last_move INTEGER
  ) WITHOUT ROWID`,
  `CREATE TABLE crew_members (
    player_id TEXT PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    crew_id TEXT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    joined_at INTEGER NOT NULL
  ) WITHOUT ROWID`,
  'CREATE INDEX crew_members_by_crew ON crew_members (crew_id, joined_at)',
  // The XP a member earned for a crew in a week stays with that crew: changing crews takes nothing along.
  `CREATE TABLE crew_xp (
    week INTEGER NOT NULL,
    crew_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    xp INTEGER NOT NULL,
    PRIMARY KEY (week, crew_id, player_id)
  ) WITHOUT ROWID`,
  `CREATE TABLE crew_xp_days (
    player_id TEXT NOT NULL,
    day INTEGER NOT NULL,
    xp INTEGER NOT NULL,
    PRIMARY KEY (player_id, day)
  ) WITHOUT ROWID`,
  `CREATE TABLE crew_weeks (
    crew_id TEXT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    week INTEGER NOT NULL,
    league INTEGER NOT NULL,
    grp INTEGER NOT NULL,
    goal INTEGER NOT NULL,
    PRIMARY KEY (crew_id, week)
  ) WITHOUT ROWID`,
  'CREATE INDEX crew_weeks_by_group ON crew_weeks (week, league, grp)',
  `CREATE TABLE crew_gifts (
    id TEXT PRIMARY KEY,
    crew_id TEXT NOT NULL,
    from_id TEXT NOT NULL,
    to_id TEXT,
    item TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    claimed_by TEXT,
    claimed_at INTEGER
  ) WITHOUT ROWID`,
  'CREATE INDEX crew_gifts_open ON crew_gifts (crew_id, claimed_at)',
  'CREATE INDEX crew_gifts_by_sender ON crew_gifts (from_id, created_at)',
];

export const CREW_CODE_LENGTH = 8;
export const CREW_MAX = 20;
export const RENAME_DAYS = 30;
/** Season XP a member can add in one shift and in one day: plausibility, like the boards. */
export const XP_PER_SHIFT = 600;
export const XP_PER_DAY = 3000;
/** Gifts a player can send in a day, and how long one waits before it goes back to the sender. */
export const GIFTS_PER_DAY = 10;
/** Per player, across every crew gift sent in the current league week. */
export const GIFT_MONEY_PER_WEEK = 100_000;
export const GIFT_CHESTS_PER_WEEK = 5;
export const GIFT_DAYS = 7;
/** What can be given: some money, or a chest (the sender's own; the game takes it before sending). */
export const GIFT_ITEMS: readonly RewardItem[] = ['money:5000', 'money:25000', 'money:100000', 'chest:standard', 'chest:premium', 'chest:diamond', 'chest:event'];

export interface Crew {
  id: string;
  code: string;
  name: string;
  ownerId: string;
  createdAt: number;
  /** When the founder last renamed it; 0 before the first rename, which is free. */
  renamedAt: number;
  league: number;
  last: { week: number; place: number; move: number } | null;
}

interface CrewRow {
  id: string;
  code: string;
  name: string;
  owner_id: string;
  created_at: number;
  renamed_at: number;
  league: number;
  last_week: number | null;
  last_place: number | null;
  last_move: number | null;
}

const toCrew = (r: CrewRow): Crew => ({
  id: r.id,
  code: r.code,
  name: r.name,
  ownerId: r.owner_id,
  createdAt: r.created_at,
  renamedAt: r.renamed_at,
  league: r.league,
  last: r.last_week === null ? null : { week: r.last_week, place: r.last_place ?? 0, move: r.last_move ?? 0 },
});

export interface Member {
  id: string;
  name: string;
  title: string | null;
  joinedAt: number;
}

export interface Gift {
  id: string;
  from: { id: string; name: string } | null;
  to: string | null;
  item: RewardItem;
  at: number;
}

export interface WeekView {
  week: number;
  league: number;
  goal: number;
  xp: number;
  table: (Standing & { me: boolean })[];
}

export class CrewStore {
  private readonly db: Db;
  private readonly rewards: FeedbackStore;

  constructor(db: Db) {
    this.db = db;
    this.rewards = new FeedbackStore(db);
  }

  // MARK: Crews and members

  byId(id: string): Crew | null {
    const row = this.db.prepare('SELECT * FROM crews WHERE id = ?').get(id) as CrewRow | undefined;
    return row ? toCrew(row) : null;
  }

  byCode(code: string): Crew | null {
    const row = this.db.prepare('SELECT * FROM crews WHERE code = ?').get(code) as CrewRow | undefined;
    return row ? toCrew(row) : null;
  }

  /** The crew a player is in, or null. */
  of(playerId: string): Crew | null {
    const row = this.db.prepare('SELECT c.* FROM crews c JOIN crew_members m ON m.crew_id = c.id WHERE m.player_id = ?').get(playerId) as CrewRow | undefined;
    return row ? this.withOwner(toCrew(row)) : null;
  }

  /** The founder first, then in the order they joined. */
  members(crewId: string): Member[] {
    return (
      this.db
        .prepare('SELECT p.id, p.name, p.title, m.joined_at FROM crew_members m JOIN players p ON p.id = m.player_id JOIN crews c ON c.id = m.crew_id WHERE m.crew_id = ? AND p.banned = 0 ORDER BY (m.player_id = c.owner_id) DESC, m.joined_at, p.id')
        .all(crewId) as unknown as { id: string; name: string; title: string | null; joined_at: number }[]
    ).map((r) => ({ id: r.id, name: r.name, title: r.title, joinedAt: r.joined_at }));
  }

  count(crewId: string): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM crew_members WHERE crew_id = ?').get(crewId) as { n: number }).n;
  }

  /** An owner who left or was deleted hands the crew to the member who joined first. */
  private withOwner(crew: Crew): Crew {
    const owner = this.db.prepare('SELECT 1 FROM crew_members WHERE crew_id = ? AND player_id = ?').get(crew.id, crew.ownerId);
    if (owner) return crew;
    const first = this.db.prepare('SELECT player_id FROM crew_members WHERE crew_id = ? ORDER BY joined_at, player_id LIMIT 1').get(crew.id) as { player_id: string } | undefined;
    if (!first) return crew;
    this.db.prepare('UPDATE crews SET owner_id = ? WHERE id = ?').run(first.player_id, crew.id);
    return { ...crew, ownerId: first.player_id };
  }

  create(ownerId: string, name: string, now: number): Crew {
    return transaction(this.db, () => {
      const id = randomUUID();
      let code = randomCode(CREW_CODE_LENGTH);
      while (this.byCode(code)) code = randomCode(CREW_CODE_LENGTH);
      this.db.prepare('INSERT INTO crews (id, code, name, owner_id, created_at, renamed_at) VALUES (?, ?, ?, ?, ?, 0)').run(id, code, name, ownerId, now);
      this.db.prepare('INSERT INTO crew_members (player_id, crew_id, joined_at) VALUES (?, ?, ?)').run(ownerId, id, now);
      return this.byId(id)!;
    });
  }

  rename(crewId: string, name: string, now: number): void {
    this.db.prepare('UPDATE crews SET name = ?, renamed_at = ? WHERE id = ?').run(name, now, crewId);
  }

  join(playerId: string, crewId: string, now: number): void {
    this.db.prepare('INSERT INTO crew_members (player_id, crew_id, joined_at) VALUES (?, ?, ?)').run(playerId, crewId, now);
  }

  /** Takes a player out of their crew; the last one out closes it, and what was still waiting under the tree goes back. */
  leave(playerId: string, now: number): void {
    transaction(this.db, () => {
      const crew = this.of(playerId);
      if (!crew) return;
      this.db.prepare('DELETE FROM crew_members WHERE player_id = ?').run(playerId);
      if (this.count(crew.id) > 0) return;
      for (const gift of this.openGifts(crew.id)) this.sendBack(gift, now);
      this.db.prepare('DELETE FROM crews WHERE id = ?').run(crew.id);
    });
  }

  // MARK: The week

  /** Adds a member's XP to their crew's week, within the day's limit; returns what was taken. */
  addXp(playerId: string, crewId: string, xp: number, now: number): number {
    return transaction(this.db, () => {
      const day = Math.floor(now / DAY_MS);
      const row = this.db.prepare('SELECT xp FROM crew_xp_days WHERE player_id = ? AND day = ?').get(playerId, day) as { xp: number } | undefined;
      const taken = Math.max(0, Math.min(xp, XP_PER_DAY - (row?.xp ?? 0)));
      if (taken === 0) return 0;
      this.db.prepare('INSERT INTO crew_xp_days (player_id, day, xp) VALUES (?, ?, ?) ON CONFLICT (player_id, day) DO UPDATE SET xp = xp + excluded.xp').run(playerId, day, taken);
      const week = this.weekRow(crewId, now).week;
      this.db.prepare('INSERT INTO crew_xp (week, crew_id, player_id, xp) VALUES (?, ?, ?, ?) ON CONFLICT (week, crew_id, player_id) DO UPDATE SET xp = xp + excluded.xp').run(week, crewId, playerId, taken);
      return taken;
    });
  }

  /** Each member's XP for the crew this week. */
  memberXp(crewId: string, week: number): Map<string, number> {
    const rows = this.db.prepare('SELECT player_id, xp FROM crew_xp WHERE week = ? AND crew_id = ?').all(week, crewId) as unknown as { player_id: string; xp: number }[];
    return new Map(rows.map((r) => [r.player_id, r.xp]));
  }

  private crewXp(crewId: string, week: number): number {
    return (this.db.prepare('SELECT COALESCE(SUM(xp), 0) AS xp FROM crew_xp WHERE week = ? AND crew_id = ?').get(week, crewId) as { xp: number }).xp;
  }

  /**
   * The crew's place in this week's league, set up the first time the week is asked for. That first look settles the
   * week the crew played before: its place moves it up or down, and the members who helped get their chests.
   */
  weekRow(crewId: string, now: number): { week: number; league: number; grp: number; goal: number } {
    const week = weekOf(now);
    const known = this.db.prepare('SELECT week, league, grp, goal FROM crew_weeks WHERE crew_id = ? AND week = ?').get(crewId, week) as { week: number; league: number; grp: number; goal: number } | undefined;
    if (known) return known;
    const crew = this.byId(crewId)!;
    let league = crew.league;
    const before = this.db.prepare('SELECT week, league, grp, goal FROM crew_weeks WHERE crew_id = ? AND week < ? ORDER BY week DESC LIMIT 1').get(crewId, week) as { week: number; league: number; grp: number; goal: number } | undefined;
    if (before) league = this.settle(crew, before, now);
    const groups = this.db.prepare('SELECT grp, COUNT(*) AS n FROM crew_weeks WHERE week = ? AND league = ? GROUP BY grp ORDER BY grp').all(week, league) as unknown as { grp: number; n: number }[];
    const grp = groups.find((g) => g.n < GROUP_REAL)?.grp ?? (groups.length > 0 ? Math.max(...groups.map((g) => g.grp)) + 1 : 0);
    const goal = GOAL_PER_MEMBER * Math.max(2, this.count(crewId));
    this.db.prepare('INSERT INTO crew_weeks (crew_id, week, league, grp, goal) VALUES (?, ?, ?, ?, ?)').run(crewId, week, league, grp, goal);
    return { week, league, grp, goal };
  }

  /** The week `w` is over: the crew's place, its new league, and the chests for the members who earned XP in it. */
  private settle(crew: Crew, w: { week: number; league: number; grp: number; goal: number }, now: number): number {
    const table = this.table(w.week, w.league, w.grp, now);
    const place = table.findIndex((s) => s.id === crew.id);
    const xp = this.crewXp(crew.id, w.week);
    const move = moveOf(place, table.length, w.league, xp);
    const league = w.league + move;
    this.db.prepare('UPDATE crews SET league = ?, last_week = ?, last_place = ?, last_move = ? WHERE id = ?').run(league, w.week, place + 1, move, crew.id);
    const helpers = [...this.memberXp(crew.id, w.week)].filter(([id, n]) => n > 0 && this.db.prepare('SELECT 1 FROM players WHERE id = ?').get(id)).map(([id]) => id);
    for (const id of helpers) {
      if (move > 0) this.rewards.grant(id, 'chest:premium', `crew:up:${LEAGUES[league]}`, now, false);
      if (xp >= w.goal) this.rewards.grant(id, 'chest:standard', 'crew:goal', now, false);
    }
    return league;
  }

  /** A group's table in a week: its crews and the computers that fill it, ranked. */
  table(week: number, league: number, grp: number, now: number): Standing[] {
    const real = (
      this.db
        .prepare(
          `SELECT c.id, c.name, COALESCE((SELECT SUM(x.xp) FROM crew_xp x WHERE x.week = w.week AND x.crew_id = c.id), 0) AS xp
           FROM crew_weeks w JOIN crews c ON c.id = w.crew_id WHERE w.week = ? AND w.league = ? AND w.grp = ?`,
        )
        .all(week, league, grp) as unknown as { id: string; name: string; xp: number }[]
    ).map((r): Standing => ({ id: r.id, name: r.name, xp: r.xp, computer: false }));
    return rank([...real, ...botsOf(week, league, grp, Math.max(0, GROUP_SIZE - real.length), now)]);
  }

  week(crewId: string, now: number): WeekView {
    return transaction(this.db, () => {
      const w = this.weekRow(crewId, now);
      const table = this.table(w.week, w.league, w.grp, now).map((s) => ({ ...s, me: s.id === crewId }));
      return { week: w.week, league: w.league, goal: w.goal, xp: this.crewXp(crewId, w.week), table };
    });
  }

  // MARK: Gifts

  give(crewId: string, fromId: string, toId: string | null, item: RewardItem, now: number): string {
    const id = randomUUID();
    this.db.prepare('INSERT INTO crew_gifts (id, crew_id, from_id, to_id, item, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, crewId, fromId, toId, item, now);
    return id;
  }

  sentToday(fromId: string, now: number): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM crew_gifts WHERE from_id = ? AND created_at >= ?').get(fromId, now - DAY_MS) as { n: number }).n;
  }

  sentThisWeek(fromId: string, now: number): { money: number; chests: number } {
    const row = this.db.prepare(`SELECT
      COALESCE(SUM(CASE WHEN item LIKE 'money:%' THEN CAST(substr(item, 7) AS INTEGER) ELSE 0 END), 0) AS money,
      COALESCE(SUM(CASE WHEN item LIKE 'chest:%' THEN 1 ELSE 0 END), 0) AS chests
      FROM crew_gifts WHERE from_id = ? AND created_at >= ?`).get(fromId, weekStart(weekOf(now))) as { money: number; chests: number };
    return row;
  }

  private openGifts(crewId: string): { id: string; from_id: string; to_id: string | null; item: RewardItem; created_at: number }[] {
    return this.db.prepare('SELECT id, from_id, to_id, item, created_at FROM crew_gifts WHERE crew_id = ? AND claimed_at IS NULL ORDER BY created_at').all(crewId) as unknown as {
      id: string;
      from_id: string;
      to_id: string | null;
      item: RewardItem;
      created_at: number;
    }[];
  }

  private sendBack(gift: { id: string; from_id: string; item: RewardItem }, now: number): void {
    this.db.prepare('UPDATE crew_gifts SET claimed_by = from_id, claimed_at = ? WHERE id = ? AND claimed_at IS NULL').run(now, gift.id);
    if (this.db.prepare('SELECT 1 FROM players WHERE id = ?').get(gift.from_id)) this.rewards.grant(gift.from_id, gift.item, 'crew:back', now, false);
  }

  /**
   * The gifts a member can take: the crew's (first come, first served) and their own, not the ones they sent. A gift
   * nobody took in `GIFT_DAYS`, or one for someone who left, goes back to its sender.
   */
  gifts(crewId: string, playerId: string, now: number): Gift[] {
    const members = new Set(this.members(crewId).map((m) => m.id));
    const out: Gift[] = [];
    for (const g of this.openGifts(crewId)) {
      if (now - g.created_at >= GIFT_DAYS * DAY_MS || (g.to_id !== null && !members.has(g.to_id))) {
        this.sendBack(g, now);
        continue;
      }
      if (g.from_id === playerId || (g.to_id !== null && g.to_id !== playerId)) continue;
      const from = this.db.prepare('SELECT id, name FROM players WHERE id = ?').get(g.from_id) as { id: string; name: string } | undefined;
      out.push({ id: g.id, from: from ?? null, to: g.to_id, item: g.item, at: g.created_at });
    }
    return out;
  }

  /** The first to take a gift keeps it: it waits among the player's rewards. Null when it is gone or not theirs to take. */
  claim(crewId: string, playerId: string, giftId: string, now: number): RewardItem | null {
    return transaction(this.db, () => {
      const gift = this.db.prepare('SELECT g.from_id, g.to_id, g.item, p.name FROM crew_gifts g LEFT JOIN players p ON p.id = g.from_id WHERE g.id = ? AND g.crew_id = ? AND g.claimed_at IS NULL').get(giftId, crewId) as
        | { from_id: string; to_id: string | null; item: RewardItem; name: string | null }
        | undefined;
      if (!gift || gift.from_id === playerId || (gift.to_id !== null && gift.to_id !== playerId)) return null;
      const taken = Number(this.db.prepare('UPDATE crew_gifts SET claimed_by = ?, claimed_at = ? WHERE id = ? AND claimed_at IS NULL').run(playerId, now, giftId).changes) > 0;
      if (!taken) return null;
      this.rewards.grant(playerId, gift.item, `crew:gift:${gift.to_id === null ? 'crew' : 'you'}:${gift.name ?? ''}`, now, false);
      return gift.item;
    });
  }
}
