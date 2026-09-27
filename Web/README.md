# Car Game – Web

A browser version of the roundabout timing game: one tap sends the front car into the
spinning roundabout. It runs on desktop and phones, saves progress on the device and can
be installed as a PWA ("Add to Home Screen").

Since 27.09.2026 this is **the** game; the Swift/iOS app is paused (see `../CLAUDE.md`).
The rules were ported from the Swift package `Game/` (`GameCore`): same world units, same
tuning values (`Config.swift` → `src/core/config.ts`), same fixed 120 Hz step. New rules
are made here, in `src/core/`.

## Commands

```bash
cd Web
npm install
npm run dev        # http://localhost:5050, also reachable from a phone on the same network
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ on port 5050 (with the service worker)
npm run sim        # balancing bots, like `swift run Sim`: node scripts/sim.mjs [shifts] [level]
npm run sim:versus # multiplayer bots: careful lanes never go out for a crash, same seed = same match
```

`npm run sim` must show **0 crashes for the careful bot** at every level. A random
tapper should crash in almost every shift.

## Controls

| Input | Action |
| --- | --- |
| Tap / click / Space | send the front car (the first tap starts the shift) |
| Swipe left/right on the waiting screen, `←` / `→` | Shift · Unlimited · Mayhem · Multiplayer |
| Tap after a lost shift | the next try at once |
| Dispatch button, `D`, `E`, right-click | turn the next car into a police car (costs part of the combo) |
| Tab bar, `Tab` | Progress · Game · Shop · Build (Upgrades, Street Builder) |
| Top card on the waiting screen | money → Store, cars → Collection, best → Records |
| `Enter` | start / buy the open upgrade |
| `Esc` | settings on the waiting screen, back to the game from a page |
| `R` | restart the shift |

There is no pause screen, as in the app: leaving the tab freezes the world, coming back
counts in. Taps are timestamped on `pointerdown`, so the car leaves at the moment of the
touch, not at the next frame.

## Structure

```
src/
  core/       rules, no DOM (GameCore): world, roundabout, traffic, drivers, crash
              physics, scoring, levels, specials, explosions, modules, loot, daily,
              store, career
  present/    GamePresentation, 1:1: render list, scene, effects, weather, city, map
              skins, HUD, ring signals, banners, tutorial, camera perspectives, screen
              transitions, mode swipe, pages (Shop, Progress, Upgrades, Street Builder),
              feedback + music mix, and the session that runs it all
  audio/      Web Audio: the real sound samples with pitch, adaptive music stems
  storage/    localStorage save (v2, migrates v1)
  net/        multiplayer room (PeerJS/WebRTC): four-digit code, lobby, tap messages
  ui/         the DOM shell: canvas, native-like tab bar, settings sheet, multiplayer lobby
public/audio/ sounds (35) and music stems (7) as AAC, from ../Assets
scripts/sim.mjs   headless balancing bots
```

The canvas draws everything the Swift test window draws (scene, HUD and pages); the DOM
only carries what should feel native: the tab bar, the settings sheet, two buttons.

## What is in

Everything the Swift game has: the core loop, real crash physics, police, criminals,
transporters, lorries, tankers and military trucks with explosions, the three modes
(Shift, Unlimited, Mayhem) with the swipe between them, weather and city events, the
Street Builder with arms and ring modules, 13 upgrades, chests with the juicy reveal,
the collection with map skins and albums, the Daily Shift with streaks and challenges,
mastery, records, the tutorial, the adaptive music and the store (placeholder purchases
and ads: nothing is charged).

Only in the browser version:

- **Night and blackout** (from level 10 / 20, `nightLevel`, `blackoutLevel`): the city goes
  dark and the lights of the cars show the traffic; only the view changes, the pay rises a
  little. Drawn in `present/night.ts`.
- **Syndicate convoy** (every 15th level, `convoyEvery`): the criminal is a boss with
  armoured escorts right behind it; a police car must be timed into the gap. Busting it pays
  the heist back and counts as a trophy in Records (`core/specials.ts`).
- **Challenge links** (`core/challenge.ts`): after a shift, "Challenge a friend" makes a
  link (`#challenge=…`) with the seed and everything that shapes that shift. A challenge
  always starts from a fresh world, so everyone who opens the link meets the same traffic;
  it earns nothing, the score to beat is the goal.
- **Mastery trials** (`core/trials.ts`, Progress → Trials): seven fixed shifts with a goal,
  some with an extra rule that ends the shift as `failed` when broken; each pays once.
- **Export / import** of the whole progress in Settings, for moving to another device.
- Tyre marks after a skilled merge, stereo placement of sounds, keyboard hints on desktop.

## Multiplayer

The last page of the mode swipe. Up to four friends play one roundabout, one lane each
(eight arms: the players sit apart, AI traffic comes in between). Whoever's car crashes
**while merging** is out; so is a lane that sends no car for 10 s of free-flowing traffic
(the clock waits while wrecks lie on the road). The last one left wins.

- **Joining:** the host taps *Host a game* and gets a four-digit code; friends type it in.
- **Network:** peer to peer over WebRTC with [PeerJS](https://peerjs.com). PeerJS's free
  public broker (`0.peerjs.com`) only introduces the devices by the code (peer id
  `car-game-roundabout-v1-<code>`); its STUN/TURN servers help through firewalls. There is no
  server of our own, nginx still serves only static files. Nothing is saved.
- **Sync (lockstep):** every device runs the same deterministic world (same seed, same
  taps, 120 Hz). The host keeps the clock, gives every tap its step (6 steps ≈ 50 ms input
  delay for everyone) and tells the guests how far they may run. Who is out comes from the
  host's world and travels as an input too, so every screen shows the same result.
- Code: rules in `core/world.ts` (seats, `eliminate`, `stalledSeats`) and `core/versus.ts`,
  the match in `present/versus.ts`, the room in `net/room.ts`, the sheet in `ui/versusLobby.ts`.

## Saving

Everything is stored in `localStorage` under `carGame.save.v2`, on this device only (an
older `carGame.career.v1` is migrated). Loading is defensive: a damaged save falls back
field by field instead of breaking the game. "Reset progress" in Settings erases it.
"Export progress" writes it to a file (`car-game-save-<date>.json`), "Import progress" reads
such a file back through the same checks, after showing what it replaces.

## PWA

- `public/manifest.webmanifest`: name, portrait, full screen, icons (made from
  `Assets/Icon/AppIcon.png`, the maskable one padded to the safe zone).
- `sw.js` is generated at build time (`vite.config.ts`): it precaches every built file,
  so the game runs offline after the first visit. Navigations go network-first, so a new
  deploy shows up on the next start; the cache name changes with every build.
- iOS: Safari → Share → "Add to Home Screen". Android/Chrome: Settings → Install.

## Deploying (Docker, Coolify)

The game is a static site: `npm run build` writes it to `dist/`, nginx serves it. The
container listens on **port 5050**.

| File | What it does |
| --- | --- |
| `../Dockerfile` | Stage 1 `node:22-alpine`: `npm ci`, `npm run build` (type-check included). Stage 2 `nginx:alpine`: only `dist/` and the config, `EXPOSE 5050`, health check on `/healthz` |
| `../.dockerignore` | Only `Web/` goes into the build context, without `node_modules` and `dist` |
| `nginx.conf` | Port 5050, gzip, SPA fallback (`try_files $uri $uri/ /index.html`), `/assets/*` cached for a year, `index.html` / `sw.js` / manifest always revalidated (`no-cache`), a missing asset is a real 404, basic security headers |

Locally (with Docker installed):

```bash
docker build -t car-game .          # from the repository root
docker run --rm -p 5050:5050 car-game
# → http://localhost:5050
```

**Coolify:** New Resource → your GitHub repository → Build Pack **Dockerfile**. Base
directory `/`, Dockerfile location `/Dockerfile` (both are the defaults). Set **Ports
Exposes** to `5050` and add the domain; Coolify's proxy handles HTTPS. Every push to
`main` can then redeploy (auto deploy on). No environment variables are needed.

HTTPS matters: the service worker (offline play, install prompt) only works on
`https://` or `localhost`.
