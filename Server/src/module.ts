import type { Hono } from 'hono';
import type { Config } from './config.ts';
import type { Db } from './db.ts';

/** What a module gets to work with. */
export interface ServerContext {
  db: Db;
  config: Config;
  /** The clock, so tests can move it. Milliseconds since 1970. */
  now: () => number;
  /**
   * Heard when a score was taken onto a board (the leaderboard calls them). A module that reacts to
   * progress (an invite that reaches its level) adds itself here instead of the leaderboard knowing it.
   */
  onScore: ((event: ScoreEvent) => void)[];
}

export interface ScoreEvent {
  playerId: string;
  board: string;
  score: number;
}

/** The address of whoever is calling, for rate limits (set by the app before any route runs). */
export type AppEnv = { Variables: { ip: string } };

/**
 * A feature of the server. To add one (friends, cloud saves, ghost replays …): make a folder in
 * `src/modules/`, export a `ServerModule` and list it in `src/app.ts`. Its tables come with its
 * own migrations; its routes live under `/v1`.
 */
export interface ServerModule {
  name: string;
  migrations: readonly string[];
  routes(app: Hono<AppEnv>, ctx: ServerContext): void;
  /** Pages outside `/v1`, for people and link previews rather than the game (a challenge's short link). */
  pages?(app: Hono<AppEnv>, ctx: ServerContext): void;
}
