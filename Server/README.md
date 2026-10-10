# Car Game server

A small, self-hosted service next to the game: anonymous players with a name, leaderboards, a
friends board, invites, cloud saves by sync code, and relay logins for multiplayer.
Node 22 · [Hono](https://hono.dev) · SQLite (built into Node, no native packages). The game
works without it; everything here is an extra.

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
| `PUT /v1/me/title` `{title}` | (token) The title the player wears, an id like `roadVeteran` (letters and digits only; the game names it), or `null`. `422 invalid_title` |
| `GET /v1/boards` | The boards that exist |
| `GET /v1/boards/:board?limit=50` | Top list (max 100); every entry has `name` and `title` (or `null`). With a token: the player's own line is marked and `me` has their rank, even far down |
| `GET /v1/profiles/:name` | A player's page on the website (`/p/NAME`): `{player: {name, title}, boards: {'shift-level': {rank, score, meta, at} \| null, unlimited: …}}`. Public like the boards; the name is found however it is written (`nameKey`). Unknown and blocked players are the same `404 unknown_player`; no id is given out; 120 per minute and address |
| `PUT /v1/boards/:board/score` | Submit a score (token). Only a better one replaces the old: `{accepted, best}` |
| `GET /v1/friends` | (token) Your friend code (`K7M2-9QXA`, made on first use) and your list |
| `POST /v1/friends` `{code}` | (token) Add a friend by their code. One way, no answer needed. `404 unknown_code`, `422 invalid_code` / `own_code` / `too_many_friends` (100) |
| `DELETE /v1/friends/:id` | (token) Take someone off your list |
| `GET /v1/friends/boards/:board` | (token) The same board as the public one, ranked among you and your friends only |
| `POST /v1/sync` `{save}` | Cloud save, no account: stores the save and answers `{code, updatedAt}` (`K7M2-9QXA-4TFB`) |
| `GET /v1/sync?have=<updatedAt>` | The save of the code in `Authorization: Bearer <code>`: `{save, updatedAt}`; only `{updatedAt}` when it still is `have` (the game asks every 10 s). `404 unknown_code` |
| `PUT /v1/sync` `{save, baseUpdatedAt}` | Stores a newer save. `409 conflict` (with the current `updatedAt`) when another device saved since `baseUpdatedAt`: the game then asks the player |
| `DELETE /v1/sync` | Removes the cloud copy |
| `GET /v1/rtc/ice` | `{iceServers, relay}` for multiplayer: STUN always, a short-lived TURN login when Cloudflare TURN is set up |
| `POST /v1/challenges` `{code, mode, level, target}` | A short link for a challenge: `{id}` (`201`, or `200` with the id the same challenge already has). With a token the link carries the player's name. `422 invalid_challenge`, `503 not_configured` without a game address |
| `GET /c/:id` | The page behind the short link (outside `/v1`, for people and chat apps): Open Graph tags with title, text and picture, then straight on to `GAME_URL/#challenge=<code>` |
| `GET /c/:id/preview.png` | Its picture, 1200 × 630, drawn by the server. A new picture takes about a quarter of a second, so at most 20 are drawn a minute (all callers together, `429` with `Retry-After`); pictures already drawn are served from memory |
| `POST /v1/feedback` `{kind, text, friendCode?, website?}` | Build with us (the website's forms): `kind` is `bug` or `idea`, `text` 10–2000 characters. One of each a day per address and per friend code (`429 once_a_day`). A bug report with a valid friend code pays the next bug hunter skin (`ladybug`, `goldbug`, `scarab`, `bluebottle`, `orchid`, `firefly`, in that order, one per report, six in all): `{id, reward: <skin> \| null}`. `website` is a honeypot: filled in, nothing is kept |
| `GET /v1/me/rewards` · `POST /v1/me/rewards/claim` `{ids}` | (token) Rewards waiting for the player (the bug hunter skins, `chest:standard`, `chest:premium`, `chest:event`); the game pays them and claims them |
| `GET /v1/me/referral` | (token) Invite a friend: `{code, link, level, reward, milestones, invitedBy, invited: [{name, done, at}], done, max}`. `link` is the share page `/i/<code>` (null without a game address). Also settles the player's own invite when they are at the level already |
| `POST /v1/me/referral` `{code}` | (token) A new player hands in the friend code they came with, once: `201` with the same view (`200` for the same inviter again). `404 unknown_code`, `422 invalid_code` / `own_code` / `not_new` (account older than 14 days) / `invite_loop`, `409 already_invited`; 10 an hour per player |
| `GET /i/:code` | The invite page (outside `/v1`): Open Graph tags with the inviter's name and the game's own `og-image.jpg`, then straight on to `GAME_URL/?ref=<code>`. An unknown code still goes to the game, only without `?ref` |
| `GET /v1/fund` | The City Fund (`src/modules/fund`, Leo, 10.10.2026): `{projects: [{id, goal, raised, done, active, mine}], top: [{name, amount}], minGift, maxGift}`. Public; with a token `mine` is what that player gave to each project. The projects (`fountain` 10 M, `lighthouse` 50 M, `skybridge` 250 M, in `PROJECTS`) are built one after the other |
| `POST /v1/fund/gifts` `{amount}` | (token) A gift of 10,000 to 5,000,000: `201` with `accepted` (a gift that crosses a goal fills it and the rest goes on to the next project; less than asked only when the last one is nearly built) and the same view. `409 fund_complete`, `422 invalid_score`; 30 a minute per player, and 20,000,000 in 24 hours (`DAILY_LIMIT`: one player cannot finish what everyone builds together; a gift that crosses it is cut to fit, nothing left: `429 daily_limit`). Money is the browser's, the service only counts (plausibility limits); the game takes money from its save after `accepted` |
| `GET /v1/push/key` | The public VAPID key the game subscribes with: `{key}`. `404 push_off` without `VAPID_*` |
| `PUT /v1/push` `{endpoint, p256dh, auth, tz, home?, muted?, timers}` | This device's push subscription (token optional: with one, ranks and rewards reach it). `tz` minutes east of UTC; `home` the path a tap opens (`/` or `/?googleplaystore`); `timers` up to six `{topic: streak \| gift \| pass, at, until?, title, body}`, replacing the ones sent before; `muted` the topics the player turned off (settings), which are never sent. Marks the device as seen. Answers `{timers: [{topic, at}]}`. `422 invalid_subscription` (only Google, Apple, Mozilla and Microsoft push services) / `invalid_timers` / `invalid_muted` / `invalid_tz`; 60 an hour per address |
| `DELETE /v1/push` `{endpoint}` | Forget this device (`204`) |
| `GET /admin` | (with `ADMIN_TOKEN`) The inbox page for bug reports and ideas: filter, mark seen / done / won't fix, delete, give a reward by friend code |

The token travels as `Authorization: Bearer <token>`. Errors are `{error: {code, message}}`.

**Challenge short links** (`src/modules/challenges/`): the game's own challenge link is long and shows
nothing in a chat. The service keeps the game's code as it came (it never reads it) plus mode, level and
the score to beat, under an 8-character id. The picture is a roundabout at night and a motorway message
sign in a 5 × 7 dot font, drawn in code (`raster.ts`, `preview.ts`: no canvas, no font file, no native
package) and kept in memory for the most recent 64 links. Nobody can upload a picture. The sender's name
comes from their leaderboard account and follows it: renamed, deleted or blocked, the link changes with
it. A link lives a year. New links count against 60 an hour per address.

**Notifications** (`src/modules/push/`, Leo, 08.10.2026): Web Push with `node:crypto` only (`webpush.ts`:
RFC 8291 encryption, RFC 8292 VAPID; checked against `http_ece`, the library behind `web-push`). The game sends
its own reminders as timers with their words (the streak this evening, tomorrow's free chest, the next Season
Pass) whenever it opens or closes; the server adds three of its own: **rank** (someone passed a player who
was in the top 20 of an all-time board: `push_ranks` keeps the last rank of every subscribed player),
**reward** (a reward waiting that came after the device was last seen: an invite's chest) and **comeback**
(3, 7, 14 and 30 days away, then quiet). Every minute a sweep sends what is due: only between 9:00 and 20:59
on the device's clock, at most one per 20 hours (the streak may come on top), the most important first
(`TOPICS`); a timer past its `until` is dropped. A push service answering 404/410 means the browser dropped the
subscription: the device is forgotten. Devices not seen for 120 days go too.

**Invites** (`src/modules/referrals/`, Leo, 04.10.2026): the friend code is the invite. A friend who opens
`/i/K7M29QXA` (or a challenge link its sender shared: `/c/:id` carries the sender's code as `?ref=`) lands in the
game with the code and hands it in once they have a name. When their Shift level (the leaderboard's own score, so
the service needs no extra report) reaches 5 (`INVITE_LEVEL`), both get a `chest:standard` through the rewards table
the feedback module already has; the inviter's 3rd and 10th friend add a `chest:premium`. The module listens to
accepted scores through `ctx.onScore` (`module.ts`), so the leaderboard does not know about invites. Plausibility
only, like the boards: one invite per player, new accounts only (14 days), no loops (A invites B, B invites A), the
inviter is paid for at most 25 friends (the friend still is), 10 hand-ins an hour per player. Someone who makes
accounts for themselves wins a few chests and nothing else (no money can be bought: CLAUDE.md, Casino rule).
Rewards carry their `reason` (`invite:welcome:<inviter>`, `invite:friend:<invitee>`, `invite:milestone:<n>`) so the game can say why.

**Friends** are one-way: typing a code puts that player on your list, and they do not have to agree
(their scores are public on the boards anyway; the code only saves the search). Blocked players
vanish from every list. Adding is limited to 20 tries a minute per player.

**Cloud save** has no name and no password: the sync code is the key (12 characters from 31, about
59 bits). Only its SHA-256 is stored, next to the save as the game wrote it (up to 512 KB; a save
grows with the career, from a few KB to around 100 KB after a few hundred levels). The game adds the player's leaderboard account (id, name, token) to the copy as
`cloudAccount`, so a new device becomes the same player; the server stores it like the rest and does
not look at it. The server knows nothing of the game's rules and does not check the content;
the game reads it field by field like an imported file. Wrong codes count against 120 tries a minute
per address, new codes against 10 an hour. Every write names the version it builds on
(`baseUpdatedAt`), so two devices never overwrite each other quietly.

**Boards** (`src/modules/leaderboard/boards.ts`):

| id | Body of the score | Ranked by |
| --- | --- | --- |
| `shift-level` | `{level, prestige}` | `prestige × 1000 + level` |
| `unlimited` | `{score, cars}` | `score` |
| `daily` | `{score, day}` | `score`, **one list per day** (`day:<n>`): `day` is the player's own day number (the Daily Shift follows local time) and must be within one day of ours; `GET …/boards/daily?day=<n>` (also `/v1/friends/boards/daily`) reads that day, an impossible day falls back to ours |
| `rush` | `{cs}` | Boss Rush time in hundredths of a second, 3 000 – 720 000; ranked by `10 000 000 − cs`, so the fastest comes first; `meta.cs` is the time |

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
| `CORS_ORIGINS` | `*` | The game's address(es), comma separated, e.g. `https://game.your-domain.tld`. Set it, and add the website (`https://timing.love`) for the Build with us forms. |
| `ADMIN_TOKEN` | unset | At least 24 characters (`openssl rand -base64 32`). Unset: no admin routes. |
| `DB_PATH` | `/data/car-game.db` | Keep it inside the volume. |
| `PORT` | `5051` | |
| `TRUST_PROXY` | `true` | Read the caller's address from `X-Forwarded-For` (last entry). Keep it on behind Coolify. |
| `CF_TURN_KEY_ID`, `CF_TURN_API_TOKEN` | unset | Cloudflare TURN, for multiplayer between phone networks (below). Unset: STUN only. |
| `GAME_URL` | the first address in `CORS_ORIGINS` | Where a challenge's short link sends people, e.g. `https://game.your-domain.tld`. Neither set (`CORS_ORIGINS=*`): no short links, the game shares its long link. |
| `FEEDBACK_WEBHOOK_URL` | unset | A Discord (or Slack) webhook: every new bug report and idea is posted there as well, so you hear of it at once. Unset: only stored, read them on `/admin`. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | unset | Notifications: a pair from `npm run vapid`, set once and kept (a new pair cuts off every device that subscribed with the old one). Unset: no notifications. |
| `VAPID_SUBJECT` | `GAME_URL` | A contact for the push services, `mailto:you@example.org` or an https address. |
| `PUBLIC_URL` | read from the request | This service's own address, for the picture in a short link. Only needed if the proxy does not pass `X-Forwarded-Proto` and `X-Forwarded-Host` (Coolify does). |

5. **Run exactly one instance.** SQLite lives in one file; do not scale it to several replicas.
6. **Backup:** the volume is the whole state. Back it up with Coolify's scheduled backups or copy
   `car-game.db` (WAL mode: `sqlite3 car-game.db ".backup backup.db"`).

**Connecting the game:** build the game with `VITE_API_URL=https://api.your-domain.tld` (Coolify →
the game's resource → Build Variables / Build Args, the Dockerfile has `ARG VITE_API_URL`) and add
that address to `connect-src` in `Web/nginx.conf`, both lines of `map $args $csp`. Without the
variable the game has no leaderboard.

## Multiplayer relay (Cloudflare TURN)

Most players connect directly; phones on mobile data and school Wi-Fi often cannot, and need a relay
(TURN). Nothing to host: Cloudflare's relay is free up to 1 TB a month.

1. Cloudflare dashboard → **Realtime → TURN Server → Create**. Note the *Turn Token ID* and the *API token*.
2. In Coolify set `CF_TURN_KEY_ID` (the ID) and `CF_TURN_API_TOKEN` (the token), redeploy.
3. Check: `curl https://api.your-domain.tld/v1/rtc/ice` answers `"relay": true`.

The game asks `/v1/rtc/ice` right before a room opens and gets a login that stops working after a
day (the server keeps one for an hour and hands it to everyone, so Cloudflare is asked rarely).
A slow or failed answer only means "STUN as before". PeerJS's public broker still introduces the
players; it only passes on room codes, no match data, so it is not worth hosting ourselves.

## Moderation

```bash
H="Authorization: Bearer $ADMIN_TOKEN"; API=https://api.your-domain.tld
curl -H "$H" "$API/v1/admin/players?q=leo"                                  # find
curl -X PATCH  -H "$H" -d '{"banned":true}' "$API/v1/admin/players/<id>"    # hide + lock out (false: undo)
curl -X PATCH  -H "$H" -d '{"name":"Player 123"}' "$API/v1/admin/players/<id>" # rename (skips the name filter)
curl -X DELETE -H "$H" "$API/v1/admin/scores/unlimited/<id>"                # remove one score
curl -X DELETE -H "$H" "$API/v1/admin/players/<id>"                         # remove player and scores
curl -H "$H" "$API/v1/admin/feedback?kind=bug&status=new"                   # bug reports (kind=idea: ideas)
curl -X PATCH  -H "$H" -d '{"status":"done"}' "$API/v1/admin/feedback/<id>" # new · seen · done · wontfix
curl -X POST   -H "$H" -d '{"friendCode":"K7M2-9QXA","item":"chest:premium"}' "$API/v1/admin/rewards"
```

Easier: open `https://api.your-domain.tld/admin`, type the admin token (kept in that tab only), and the
inbox shows every bug report and idea with the sender's name and friend code.

## Privacy

Stored per player: the chosen name, a random id, a hash of the secret token, the scores (with the
level / cars they came with), the friend code and the friends list, and two timestamps. No e-mail,
no IP address (rate limits live in memory only). `DELETE /v1/me` removes all of it.
Invites: one line per invited player (who brought them, when they reached the level); it goes when either player is deleted.
Bug reports and ideas: the text, the sender when they gave a friend code (deleting the player keeps the text without them), and a hash of the address for up to two days (the once-a-day limit). Rewards hang off the player and go with them.
Notifications: per device the push address and its two keys, the time zone, the start path, when it was last
seen and last notified, how many come-back nudges went out, the timers the game sent (with their words) and,
with a name, the link to the player and their last rank on the all-time boards. `DELETE /v1/push` removes the
device; deleting the player removes the devices linked to it; a device not seen for 120 days is deleted.
Cloud saves belong to no player: a hash of the sync code, the save and three timestamps; `DELETE
/v1/sync` removes one. A copy nobody has opened or changed for 200 days (`IDLE_SAVE_DAYS`,
`src/modules/sync/index.ts`; `last_seen_at`, written by `GET`/`PUT`, at most hourly) is deleted: a sweep runs when the
server starts and every six hours (`src/server.ts`). The same sweep deletes daily lists older than two days (only today and a day either side can be read). The other leaderboard entries are not touched. The privacy page (`legal.ts`) describes Friends, Cloud sync and the relay. Before the game sends anything, add a paragraph
to `Web/src/present/legal.ts` and bump `LEGAL_UPDATED` (see the project `CLAUDE.md`).
