import { Hono } from 'hono';
import { transaction, type Db } from '../../db.ts';
import { ApiError } from '../../errors.ts';
import { integerField, readJson } from '../../http.ts';
import type { ServerContext, ServerModule } from '../../module.ts';
import { rateLimit } from '../../rateLimit.ts';
import { PlayerStore, maybePlayer, requirePlayer, type PlayerEnv } from '../players/index.ts';

/**
 * The City Fund (Leo, 10.10.2026): a sink for big balances that everyone builds together. Players with a
 * name give money, the money goes into the project that is being built, and when its goal is reached
 * the next one starts. The game gives a skin to everyone who gave enough to a finished project.
 *
 * Money lives in the browser, like everywhere else: the service only counts what the game says was
 * given, within sane limits (plausibility only, like the boards). The game takes the money from its
 * save after the service has accepted a gift, and only what was accepted.
 *
 *   GET  /v1/fund                the projects, how far each is, the top givers, and your own gifts (with a name)
 *   POST /v1/fund/gifts {amount} give; answers how much was accepted (a gift that crosses a goal fills it, the rest goes on)
 */

/** The projects in building order; their ids are the ones the game knows (`core/fund.ts`). */
export const PROJECTS = [
  { id: 'fountain', goal: 10_000_000 },
  { id: 'lighthouse', goal: 50_000_000 },
  { id: 'skybridge', goal: 250_000_000 },
] as const;

export const MIN_GIFT = 10_000;
export const MAX_GIFT = 5_000_000;
const TOP_GIVERS = 10;

export const FUND_MIGRATIONS: readonly string[] = [
  `CREATE TABLE fund_gifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT REFERENCES players(id) ON DELETE SET NULL,
    project TEXT NOT NULL,
    amount INTEGER NOT NULL,
    given_at INTEGER NOT NULL
  )`,
  'CREATE INDEX fund_by_project ON fund_gifts (project, player_id)',
  'CREATE INDEX fund_by_player ON fund_gifts (player_id)',
];

export interface ProjectView {
  id: string;
  goal: number;
  raised: number;
  done: boolean;
  /** The one being built now: the first that is not done. */
  active: boolean;
  /** What this player gave to it (0 without a name). */
  mine: number;
}

export class FundStore {
  private readonly db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  private raisedBy(): Map<string, number> {
    const rows = this.db.prepare('SELECT project, SUM(amount) AS raised FROM fund_gifts GROUP BY project').all() as unknown as { project: string; raised: number }[];
    return new Map(rows.map((r) => [r.project, r.raised]));
  }

  private givenBy(playerId: string): Map<string, number> {
    const rows = this.db.prepare('SELECT project, SUM(amount) AS given FROM fund_gifts WHERE player_id = ? GROUP BY project').all(playerId) as unknown as { project: string; given: number }[];
    return new Map(rows.map((r) => [r.project, r.given]));
  }

  projects(playerId: string | null): ProjectView[] {
    const raised = this.raisedBy();
    const mine = playerId ? this.givenBy(playerId) : new Map<string, number>();
    let building = true;
    return PROJECTS.map((p) => {
      const sum = Math.min(p.goal, raised.get(p.id) ?? 0);
      const done = sum >= p.goal;
      const active = building && !done;
      if (!done) building = false;
      return { id: p.id, goal: p.goal, raised: sum, done, active, mine: mine.get(p.id) ?? 0 };
    });
  }

  /** The most generous players over all projects. */
  top(): { name: string; amount: number }[] {
    return this.db
      .prepare(
        `SELECT p.name AS name, SUM(g.amount) AS amount FROM fund_gifts g JOIN players p ON p.id = g.player_id
         WHERE p.banned = 0 GROUP BY g.player_id ORDER BY amount DESC, MIN(g.given_at) ASC LIMIT ?`,
      )
      .all(TOP_GIVERS) as unknown as { name: string; amount: number }[];
  }

  /** Puts a gift into the projects being built; returns how much went in (less than asked once everything is built). */
  give(playerId: string, amount: number, now: number): number {
    return transaction(this.db, () => {
      let left = amount;
      for (const project of this.projects(null)) {
        if (left <= 0) break;
        if (project.done) continue;
        const put = Math.min(left, project.goal - project.raised);
        this.db.prepare('INSERT INTO fund_gifts (player_id, project, amount, given_at) VALUES (?, ?, ?, ?)').run(playerId, project.id, put, now);
        left -= put;
      }
      return amount - left;
    });
  }
}

export function fundModule(): ServerModule {
  return {
    name: 'fund',
    migrations: FUND_MIGRATIONS,
    routes(app, ctx: ServerContext) {
      const fund = new FundStore(ctx.db);
      const players = new PlayerStore(ctx.db);
      const who = maybePlayer(players);
      const view = (playerId: string | null) => ({ projects: fund.projects(playerId), top: fund.top(), minGift: MIN_GIFT, maxGift: MAX_GIFT });

      app.get('/fund', (c) => c.json(view(who(c)?.id ?? null)));

      const give = new Hono<PlayerEnv>();
      give.use('*', requirePlayer(players));
      give.post('/', rateLimit<PlayerEnv>({ max: 30, windowMs: 60_000 }, (c) => c.get('player').id, ctx.now), async (c) => {
        const me = c.get('player');
        const amount = integerField(await readJson(c), 'amount', MIN_GIFT, MAX_GIFT);
        if (fund.projects(null).every((p) => p.done)) throw new ApiError(409, 'fund_complete', 'Everything is built. Thank you.');
        const accepted = fund.give(me.id, amount, ctx.now());
        return c.json({ accepted, ...view(me.id) }, 201);
      });
      app.route('/fund/gifts', give);
    },
  };
}
