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
```

`npm run sim` must show **0 crashes for the careful bot** at every level. A random
tapper should crash in almost every shift.

## Controls

| Input | Action |
| --- | --- |
| Tap / click / Space / Enter | send the front car (the first tap starts the shift) |
| Dispatch button, `D` | turn the next car into a police car (costs part of the combo) |
| `Esc`, `P` | pause |
| `←` / `→` before a shift | Shift or Unlimited |

Taps are handled on `pointerdown` with the event's timestamp, so the car leaves at the
exact moment of the touch, not at the next frame. The play field has
`touch-action: none` (no double-tap zoom, no scrolling).

## Structure

```
src/
  core/       rules, no DOM: world, roundabout, paths, vehicles, traffic, drivers,
              collision, crash physics, scoring, levels, upgrades, loot, career
  renderer/   Canvas 2D: camera, cached static layer, vehicles, effects, popups
  audio/      Web Audio: every sound is synthesised, no audio files
  storage/    localStorage: career, upgrades, collection, records, settings
  game/       session: fixed-step loop, taps, slow-mo, events → sound/haptics/effects
  ui/         HUD, tab bar, pages (Progress, Shop, Build), sheets, chest reveal
scripts/sim.mjs   headless balancing bots
```

## What is in, what is not

In: the full core loop (queue, fixed 0.5 s merge, capsule collision, Tight Fit, Near Miss,
Perfect, combo tiers, Perfect Chain, rush hour, levels with the eased early levels and
the denser late ones), real crash physics with reacting traffic and pile-ups, police cars,
criminals with countdown and takedown, emergency dispatch, money transporters with secure
zones, lorries, the Unlimited mode, 13 upgrades, Standard/Premium/Criminal Hunt chests with
public odds and pity, 39 car skins plus three car types, mastery goals with chests,
records, settings (sound, haptics, reduce motion).

Not (yet) ported from the Swift game: Street Builder and ring modules, Mayhem, tankers and
military trucks, weather, city events, map skins, Daily Shift and challenges, ads and
in-app purchases.

## Saving

Everything is stored in `localStorage` under `carGame.career.v1`, on this device only.
Loading is defensive: a damaged or older save falls back field by field instead of
breaking the game. "Reset progress" in Settings erases it.

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
