# Car Game server

A small, self-hosted service next to the game: anonymous players with a name, and leaderboards.
Node 22 · [Hono](https://hono.dev) · SQLite (built into Node, no native packages). The game
works without it; it only adds the leaderboard.

```bash
cd Server
npm install
npm run dev        # http://localhost:5051, database in ./data/car-game.db
npm test           # names, sign-up, leaderboards, limits, admin (in-memory database)
npm run typecheck
```

There is no build step: Node runs the TypeScript directly (type stripping, Node ≥ 22.18), so
only erasable syntax is allowed (no `enum`, no constructor parameter properties).

## What it does

| Route | What |
| --- | --- |
| `GET /healthz` | `ok` (Docker health check) |
| `POST /v1/players` `{name}` | Makes an account: `{player: {id, name}, token}`. The token is shown once; the game keeps it. `409 name_taken`, `422 invalid_name` / `name_not_allowed` |
| `GET /v1/me` · `PATCH /v1/me` `{name}` · `DELETE /v1/me` | Who am I · rename (once every 10 seconds) · delete my account and all my scores |
| `GET /v1/boards` | The boards that exist |
| `GET /v1/boards/:board?limit=50` | Top list (max 100). With a token: the player's own line is marked and `me` has their rank, even far down |
| `PUT /v1/boards/:board/score` | Submit a score (token). Only a better one replaces the old: `{accepted, best}` |

The token travels as `Authorization: Bearer <token>`. Errors are `{error: {code, message}}`.

**Boards** (`src/modules/leaderboard/boards.ts`):

| id | Body of the score | Ranked by |
| --- | --- | --- |
| `shift-level` | `{level, prestige}` | `prestige × 1000 + level` |
| `unlimited` | `{score, cars}` | `score` |

Ties go to whoever got there first. Blocked players are hidden and take no rank.

**Names:** 3–16 characters, Latin letters, digits, space, `_`, `-`. Every name is unique, and
"Leo", "LEO", "le0" and "L e o" count as the same one. A filter for English and German refuses
insults and slurs, also when disguised (l33t, dots between letters, stretched letters) and leaves
innocent names alone (`src/modules/players/profanity.ts`). It is a first line of defence, not a
promise: use the admin routes for what slips through.

**Anti-cheat is plausibility only.** A score beyond what the rules allow is refused with
`422 invalid_score` (limits in `LIMITS`, `boards.ts`); everything below that is believed. Anyone
with DevTools can post a believable fake, so look at the lists now and then and remove entries.

**Rate limits** (in memory): 20 new accounts per hour per address, 30 score submissions per minute
per player, one rename every 10 seconds.

## Adding a feature

1. A board: add an entry to `BOARDS` in `boards.ts` (`id`, `title`, `period`, `parse`). Storage,
   ranking and routes need no change. A daily board answers `period: (now) => 'day:' + dayNumber`.
2. Anything else (friends, cloud saves, ghost replays …): a folder in `src/modules/<name>/` that
   exports a `ServerModule` (`src/module.ts`): its own `migrations` (plain SQL, append only, never
   edit one that has shipped) and `routes(app, ctx)`. List it in `modules()` in `src/app.ts`.
   Tie its tables to `players(id)` with `ON DELETE CASCADE` and they vanish when a player deletes
   their account.

## Deploying on Coolify

A second resource next to the game, from the same GitHub repository:

1. **New Resource → GitHub repository → Build Pack: Dockerfile.** Base Directory `/Server`,
   Dockerfile location `/Dockerfile`. **Ports Exposes: `5051`.**
2. **Domain:** a subdomain, e.g. `https://api.your-domain.tld` (Coolify's proxy does HTTPS).
3. **Persistent Storage:** add a volume with destination path `/data`. **Without it the database is
   gone at every deploy.**
4. **Environment variables:**

| Variable | Default | Meaning |
| --- | --- | --- |
| `CORS_ORIGINS` | `*` | The game's address(es), comma separated, e.g. `https://game.your-domain.tld`. Set it. |
| `ADMIN_TOKEN` | unset | At least 24 characters (`openssl rand -base64 32`). Unset: no admin routes. |
| `DB_PATH` | `/data/car-game.db` | Keep it inside the volume. |
| `PORT` | `5051` | |
| `TRUST_PROXY` | `true` | Read the caller's address from `X-Forwarded-For` (last entry). Keep it on behind Coolify. |

5. **Run exactly one instance.** SQLite lives in one file; do not scale it to several replicas.
6. **Backup:** the volume is the whole state. Back it up with Coolify's scheduled backups or copy
   `car-game.db` (WAL mode: `sqlite3 car-game.db ".backup backup.db"`).

**Connecting the game:** build the game with `VITE_API_URL=https://api.your-domain.tld` (Coolify →
the game's resource → Build Variables / Build Args, the Dockerfile has `ARG VITE_API_URL`) and add
that address to `connect-src` in `Web/nginx.conf`, both lines of `map $args $csp`. Without the
variable the game has no leaderboard.

## Moderation

```bash
H="Authorization: Bearer $ADMIN_TOKEN"; API=https://api.your-domain.tld
curl -H "$H" "$API/v1/admin/players?q=leo"                                  # find
curl -X PATCH  -H "$H" -d '{"banned":true}' "$API/v1/admin/players/<id>"    # hide + lock out (false: undo)
curl -X PATCH  -H "$H" -d '{"name":"Player 123"}' "$API/v1/admin/players/<id>" # rename (skips the name filter)
curl -X DELETE -H "$H" "$API/v1/admin/scores/unlimited/<id>"                # remove one score
curl -X DELETE -H "$H" "$API/v1/admin/players/<id>"                         # remove player and scores
```

## Privacy

Stored per player: the chosen name, a random id, a hash of the secret token, the scores (with the
level / cars they came with) and two timestamps. No e-mail, no IP address (rate limits live in
memory only). `DELETE /v1/me` removes all of it. Before the game sends anything, add a paragraph
to `Web/src/present/legal.ts` and bump `LEGAL_UPDATED` (see the project `CLAUDE.md`).
