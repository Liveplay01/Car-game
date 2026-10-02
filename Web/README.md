# Car Game – Web

A browser version of the roundabout timing game: one tap sends the front car into the
spinning roundabout. It runs on desktop and phones, saves progress on the device and can
be installed as a PWA ("Add to Home Screen").

This is **the** game (the earlier Swift/iOS version was removed on 29.09.2026). The rules
live in `src/core/`, every tuning value in `src/core/config.ts`, with a fixed 120 Hz step.
The rules themselves are described in `../FOUNDATION.md`, the whole game in `../Spiel.md`.

## Commands

```bash
cd Web
npm install
npm run dev        # http://localhost:5050, also reachable from a phone on the same network
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ on port 5050 (with the service worker)
npm run sim        # balancing bots: node scripts/sim.mjs [shifts] [level]
npm run sim:versus # multiplayer bots (the lobby bots): never out for a crash, same seed = same match
npm run sim:casino # casino fairness: every game returns what its odds sheet says, the coin is fair
npm test           # node:test: replays, the careful bot, saves (old, broken, imported file), unlocks, notices
```

`npm run sim` must show **0 crashes for the careful bot** at every level. A random
tapper should crash in almost every shift.

## Controls

| Input | Action |
| --- | --- |
| Tap / click / Space | send the front car (the first tap starts the shift); Space and Enter play even on a button the mouse left focused, only a control reached with `Tab` keeps them |
| Swipe left/right on the waiting screen, `←` / `→` | Shift · Unlimited · Mayhem · Multiplayer (after Level 5 a toast and a “Swipe for more modes” hint point it out, until the first switch) |
| Tap after a lost shift | the next try at once |
| Dispatch button, `D`, `E`, right-click | turn the next car into a police car (costs part of the combo) |
| Tab bar, `Tab` | Progress · Game · Shop · Build (Upgrades, Street Builder) |
| Top card on the waiting screen | money → Chests, cars → Collection, best → Records |
| `Enter` | start / buy the open upgrade |
| `Esc` | settings on the waiting screen, back to the game from a page |
| `R` | restart the shift |
| `↑` / `↓`, Page Up/Down, Home/End | scroll the open list (Collection, Upgrades, Progress), gliding like the wheel |

There is no pause screen, as in the app: leaving the tab freezes the world, coming back
counts in. Taps are timestamped on `pointerdown`, so the car leaves at the moment of the
touch, not at the next frame.

## Structure

```
src/
  core/       rules, no DOM: world, roundabout, traffic, drivers, crash
              physics, scoring, levels, specials, explosions, modules, loot, daily,
              store, career
  present/    presentation: render list, scene, effects, weather, city, map
              skins, HUD, ring signals, banners, tutorial, camera perspectives, screen
              transitions, mode swipe, pages (Shop, Progress, Upgrades, Street Builder),
              feedback + music mix, and the session that runs it all
  audio/      Web Audio: the real sound samples with pitch, adaptive music stems
  storage/    localStorage save (v2, migrates v1)
  net/        multiplayer room (PeerJS/WebRTC): code, lobby, bots, pings, reconnect; the tap
              messages and their checks (`messages.ts`: every field read, floods dropped);
              PeerJS loads only when a room opens
  ui/         the DOM shell: canvas, native-like tab bar, settings sheet, multiplayer lobby
public/audio/ sounds (35) and music stems (7) as AAC
icon/        the icon master (make_icon.py → AppIcon.png)
scripts/sim.mjs   headless balancing bots
```

The canvas draws everything in the game (scene, HUD and pages); the DOM only carries what should feel native: the tab bar, the settings sheet, two buttons.

## What is in

The core loop, real crash physics, police, criminals,
transporters, lorries, tankers and military trucks with explosions, the three modes
(Shift, Unlimited, Mayhem) with the swipe between them, weather and city events, the
Street Builder with arms and ring modules, 13 upgrades, chests with the juicy reveal,
the collection with map skins and albums, the Daily Shift with streaks and challenges,
mastery, records, the tutorial and the adaptive music. The store is gone (28.09.2026):
nothing can be bought with real money; only the placeholder ad chest is left.

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
- **Casino** (`core/casino.ts`, `present/casino.ts`, `present/casinoFlow.ts`, Shop → Casino): Crash, Slots and a Skin
  Upgrade, and double or nothing on a fair coin after any win. Play money and skins only;
  odds and returns in the sheet behind "Odds" (LOOT.md, Casino). Its looks and rounds are a
  chunk of their own (`present/casinoLoader.ts`), loaded when the Shop opens with the casino
  unlocked; the Shop's money chip (`casinoWallet.ts`) works without it.
- **Cloud sync** in Settings moves the progress to another device by code (01.10.2026: export
  and "Import a save file" are gone).
- Tyre marks after a skilled merge, stereo placement of sounds, keyboard hints on desktop.

## Multiplayer

The last page of the mode swipe. Up to four players on one roundabout, one lane each
(eight arms: the players sit apart, AI traffic comes in between). Whoever's car crashes
**while merging** is out; so is a lane that sends no car for too long. The last one left
wins. Every value below is in `core/config.ts` (`versus…`).

- **Escalation:** after 30 s *rush hour* (ring +15 %, a little more traffic), after 60 s
  *sudden death* (ring +30 %, the stall clock drops from 10 s to 4 s and restarts for
  everyone). Wrecks on the road hold the stall clock, but only for 3 s per car.
- **Risk pays:** every merge fills your pressure bar (clean 1, tight fit / near miss 3,
  perfect 4); a full bar (16) sends a lorry in your colour onto the arm just before a
  rival's lane, once round the ring. Five merges without a cut-off earn a **shield** that
  forgives one light bump (impact ≤ 60).
- **Identity:** each lobby slot has a colour (mint, coral, violet, gold; `player1…4` in
  `theme.ts`, never a vehicle colour): the roof and glow of that player's cars, their lane
  line, pill and badge. The top shows clock, phase and one badge per player (cars sent,
  stall countdown pulsing red under 3 s, ping, series crowns).
- **Feel:** a tap is answered at once on your device (haptic, click, headlight flash, the
  car leaning forward) while the car itself leaves after the input delay. The music runs
  in multiplayer and builds with the phases; the final duel muffles it to a heartbeat.
  Count-in ticks, merge sounds for your merges, a gong when someone is out, confetti for the
  winner (not with Reduce Motion).
- **Out, not bored:** tap to follow another lane (the camera leans towards it), send
  reactions (🔥 💀 👏 😮, keys 1–4) that float up from your lane on every screen, and send
  one lorry from the stands per match (`T`).
- **Rounds:** single match, best of 3 or best of 5. Points per round: 3 / 2 / 1 by place,
  last place 0, +1 for most cars sent, +1 for the tightest merge. The result lists place,
  cars, risky merges and points; after it everyone taps *Ready* (Enter) and the next round
  starts when all are ready. The host can go back to the *Lobby* instead.
- **Lobby:** your name (saved as `carGame.player.v1`), an *Invite* link
  (`#join=1234`: opens the game and joins at once; the share sheet on a phone, the clipboard
  elsewhere), bots for open lanes (a friend who joins takes a bot's seat), and *Practise
  against bots* on this device without any network.
- **Network:** peer to peer over WebRTC with [PeerJS](https://peerjs.com). PeerJS's free
  public broker (`0.peerjs.com`) only introduces the devices by the code (peer id
  `car-game-roundabout-v2-<code>`). There is no server of our own, nginx still serves only
  static files. Nothing is saved but your name.
- **Mobile data:** Google's public STUN servers are built in. Behind carrier NAT some phones
  need a TURN relay; set `VITE_TURN_URL` (comma-separated `turn:`/`turns:` URLs),
  `VITE_TURN_USERNAME` and `VITE_TURN_CREDENTIAL` when building (Docker build args, e.g. in
  Coolify). Without them the game still works wherever a direct connection is possible.
- **Reconnect:** a guest whose connection drops keeps the seat; the room retries a few
  times, the host sends the match so far (seed and every input) and the guest replays it
  and catches up. A lane that stays away stalls out like any other. The host is the clock:
  when the host leaves, the match ends for everyone (no host migration).
- **Sync (lockstep):** every device runs the same deterministic world (same seed, same
  taps, 120 Hz). The host keeps the clock, gives every tap its step (6 steps ≈ 50 ms input
  delay for everyone) and tells the guests how far they may run. Who is out and every
  lorry from the stands come from the host's world and travel as inputs too, so every
  screen shows the same result. Bots run on the host; their taps travel like everyone's.
- Code: rules in `core/world.ts` (seats, phases, pressure, shield, `eliminate`,
  `stalledSeats`) and `core/versus.ts` (standings, series, `VersusBot`), the rival lorry in
  `core/traffic.ts`, the match in `present/versus.ts`, the room in `net/room.ts`, the sheet
  in `ui/versusLobby.ts`, the name in `storage/profile.ts`.

## Leaderboard

Progress → **Ranks** (the chip beside the balance; it shows the Shift level rank once known) opens
`ui/leaderboardSheet.ts`: two boards, Shift level and Unlimited, the top 50 and your own place.
There is no sign-up: the player enters a name, and the records come from this device's save. The
service (`../Server/`) answers with a secret token kept in `carGame.account.v1`; the name is the
multiplayer name too (`carGame.player.v1`), and renaming in either place renames both (the
leaderboard may refuse a name: then both keep the old one).

- `net/leaderboard.ts`: the client. `syncScores` runs on every save (`GameSession.persist`) and
  sends only a record better than the one the service confirmed this session; offline or failed
  sends wait a minute. Without `VITE_API_URL` in the build everything here is off.
- The service's address must be in `connect-src` in `nginx.conf` (both CSP lines).
- Privacy: `present/legal.ts`, section Leaderboard.

## Saving

Everything is stored in `localStorage` under `carGame.save.v2`, on this device only (an
older `carGame.career.v1` is migrated). Loading is defensive: a damaged save falls back
field by field instead of breaking the game. "Reset progress" in Settings erases it.
Cloud sync (Settings, `net/cloud.ts`) keeps an optional copy, live: a change goes up 2 s later,
and a game on screen looks every 10 s (and on coming back or online) whether another device moved
on. Newer cloud progress replaces the save by itself when this device has nothing unsent, between
shifts and not on a page; when both devices played, the player chooses. With a cloud copy the
day's login income is booked after that first look. The file export and the
import of a save file are gone since 01.10.2026.

**Big Screen** (Prestige ★5, `ui/backdrop.ts`): the player's own picture or video behind the
roundabout, kept apart from the save under `carGame.backdrop.v1` (always plain `localStorage`,
also on CrazyGames: an uploaded picture is hundreds of kilobytes). An upload is shrunk to a
JPEG data URL; a link is kept as text. It sits in a DOM layer behind the canvas; the scene
leaves its ground see-through only then (`RenderList.backdrop`). YouTube plays through
youtube-nocookie.com, so `nginx.conf` allows `https:` images and media and that one frame.

Keeping it safe (`storage/device.ts`, one-time `hints` in the save): Safari clears a site's
storage after about a week without a visit unless the game is on the home screen. After
Level 4 the game asks the browser to keep its storage (`navigator.storage.persist()`, never
on the first visit, since Firefox may ask the player) and recommends the Home Screen (on an
iPhone: a full-screen tip, Share → Add to Home Screen; elsewhere a line, when the browser can
install). After Level 12 it recommends Cloud sync while this device has no cloud copy. Cloud
sync also has a pop-up of its own, once per device, from Level 3 (`cloudIntroFromLevel`). From then on every visit asks again where
asking is silent (Chrome, Safari; not Firefox), and installing the game asks at once. If a
write fails (private window, full storage), the game says so once per session and points to
Cloud sync.

## Unlocks and notices

- `core/unlocks.ts`: the Daily Shift opens at Level 4, the Trials at 9 (each trial at its own level), the Casino at 12
  (`*UnlockLevel` in `config.ts`); whoever used one before keeps it. Locked segments stay in
  place, faded, and say when they open. The Casino opens quietly (nothing points there).
- After Level 5 a pill on the Game tab says "Swipe for more modes" until the first switch.
- `present/notices.ts`: news (what a shift earned, an unlock, a hint) takes turns in the
  notice pill; a reply to the player's own action shows at once.
- `present/booking.ts`: books a finished career shift into the save and lists its news.

## PWA

- `public/manifest.webmanifest`: name, portrait, full screen, icons (made from
  `icon/AppIcon.png`, the maskable one padded to the safe zone).
- `sw.js` is generated at build time (`vite.config.ts`): it precaches every built file,
  so the game runs offline after the first visit ("Ready to play offline" says so once).
  Navigations go network-first, so a new deploy shows up on the next start; after 3 s, or
  without network, the cached page comes instead, and only a good response is cached. The
  cache name (build time + content hash) changes with every build; the cache of the version
  before stays, so a tab still running it can load its lazy files (PeerJS, the casino).
- Updates while the game is open (`main.ts`): a game coming back from the background looks
  for a new version. Once one took over, the page reloads the next time it is hidden, and
  only when nothing would be lost (no shift running, no match or lobby, no photo); afterwards
  "Updated · See what's new in Settings" if there are unread patch notes.
- iOS: Safari → Share → "Add to Home Screen". Android/Chrome: Settings → Install.
- Link previews (`index.html`, Open Graph): `public/og-image.jpg`, the CrazyGames landscape
  cover (`../Marketing/covers`) cut to 1200×630. Not precached: only link previews load it.
  Challenge links keep their own picture with the score (`Server/`, `/c/:id/preview.png`).

## Deploying (Docker, Coolify)

The game is a static site: `npm run build` writes it to `dist/`, nginx serves it. The
container listens on **port 5050**.

| File | What it does |
| --- | --- |
| `../Dockerfile` | Stage 1 `node:22-alpine`: `npm ci`, `npm run build` (type-check included). Stage 2 `nginx:alpine`: only `dist/` and the config, `EXPOSE 5050`, health check on `/healthz` |
| `../.dockerignore` | Only `Web/` goes into the build context, without `node_modules` and `dist` |
| `nginx.conf` | Port 5050, gzip, SPA fallback (`try_files $uri $uri/ /index.html`), `/assets/*` cached for a year, `index.html` / `sw.js` / manifest always revalidated (`no-cache`), a missing asset is a real 404, security headers including a Content-Security-Policy (own files only, PeerJS's broker for multiplayer, the leaderboard service at `api-game.gustaff.dev`; another address for the service needs a change in both `connect-src` entries). `npm run preview` sends the same policy, read from this file, so a change can be tried locally |

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

## CrazyGames

CrazyGames embeds the normal address with `?crazygames` added: `https://<domain>/?crazygames`.
Only that address loads the CrazyGames SDK v3 (`src/ui/crazygames.ts`), and only for it nginx
sends a Content-Security-Policy that allows their domains (`map $args $csp` in `nginx.conf`).
There the save goes through the SDK's Data Module (`storage/store.ts` is switched before the save
is read): in the cloud for a logged-in player, in the browser for a guest; a save already in
that browser is copied over once. The SDK also hears `loadingStop` and `gameplayStart/Stop`.
No service worker, no install or export hints there. Without the SDK (ad blocker, 6 s timeout)
the game saves in `localStorage` as usual. Every other visit is the plain browser game.
In the submission form, Progress Save must be "Yes, using the Data Module".
Test locally: `npm run build`, serve `dist/` without the CSP and open `/?crazygames`
(on localhost the SDK runs in its `local` mode).

## Google Play

The Play Store app is a Trusted Web Activity (made with PWABuilder or Bubblewrap): a small
Android wrapper that opens `https://game.gustaff.dev/?googleplaystore` in Chrome, full screen.
No separate build: every deploy reaches the app at once, and it shares save, offline mode and
service worker with the browser game. `inPlayStore` (`src/storage/device.ts`) recognises the app
by the query or Chrome's `android-app://` referrer and keeps that for the tab; the app shows no
install tip or install row and no link to CrazyGames. Ads (AdSense) run as on the website.
The query gets the default Content-Security-Policy.

- **Start URL in the wrapper:** `/?googleplaystore`. Display fullscreen, orientation portrait.
- **Digital Asset Links:** `public/.well-known/assetlinks.json` with the package name and the
  SHA-256 fingerprints of the **app signing key from Play** (Play Console → App integrity) and of
  the upload key. Without it the app shows an address bar. nginx answers a missing file with a 404,
  never `index.html`. After a deploy, check with Google's Statement List tester; Cloudflare's bot
  protection must let Google's fetcher through.
- **Deleting data** (Data safety form): `https://game.gustaff.dev/privacy` → "Deleting your data".
- `iarc_rating_id` goes into the manifest once Play has issued the rating.

## Google AdSense

`src/ui/ads.ts` adds the AdSense tag once the game is on screen: production build only, and
never on `?crazygames`. `index.html` carries the `google-adsense-account` meta tag (site
verification, sends nothing). The default Content-Security-Policy in `nginx.conf` lets the tag,
the ad frames and the consent message through; the CrazyGames policy stays closed to them.
`ads.txt` belongs on the root domain (`https://gustaff.dev/ads.txt`, the portfolio's project),
not in this repo; it covers `game.gustaff.dev`. The consent message (EEA/UK) is set up in
AdSense under Privacy & messaging. Auto ads (and which formats) are also set there: no anchor
or full-screen formats on this site, a tap on the scene must never hit an ad.

## Legal pages

Privacy Policy and Imprint live in `src/present/legal.ts`: the game shows them under
Settings → Legal, and the build writes them as `/privacy.html` and `/imprint.html` (nginx also
answers `/privacy` and `/imprint`), for forms that ask for a link. The build warns while
`OPERATOR` or `HOSTING` is empty. A new service the game talks to (ads, analytics, another
server) needs a paragraph there and a new `LEGAL_UPDATED`. Licenses of the bundled open-source
code come straight from `node_modules` (`src/present/licenses.ts`).
