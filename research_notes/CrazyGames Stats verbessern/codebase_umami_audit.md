# Codebase and Umami audit: what in Roundabout Timing drives its CrazyGames metrics (as of 08.10.2026)

Repo: `C:/Users/Einrichtung/Documents/GitHub/Car-game`, HEAD `d862bff` (08.10.2026 12:27). Code sources are given as file:line inside the repo (the links are repo-relative paths). "Local test" means my own run of the built game (`Web/dist`, built 08.10.2026 12:25) under `vite preview` in Chrome DevTools emulation, in a fresh isolated browser profile. Screenshots of that test are in the session scratchpad and were not copied into the repo. Production checks used `curl` against `https://game.gustaff.dev/?crazygames`.

## 1. CrazyGames SDK integration: calls, timing and gameplayStart/Stop

### Takeaway
The SDK integration is small and correct in form: init, loadingStart/Stop, gameplayStart/Stop, happytime, rewarded ad, invite link and the Data Module. But **`gameplayStart` fires only on the player's first tap that starts a shift**. Everything before that tap does not count as gameplay: the ready screen with the tab bar, the moving traffic and the "Tap to send your first car" prompt. Multiplayer matches never report gameplay. The game also calls `gameplayStop` when the tab is hidden, which CrazyGames' docs tell developers not to do.

### Cited Findings
- **Boot order** ([Web/src/main.ts:34-44](Web/src/main.ts)):
  1. `if (inPortal) await startCrazyGames();` (line 34)
  2. An `await` of up to 1,500 ms for the Overpass font (line 40)
  3. `new Shell(...)` (line 42)
  4. `gameLoaded()`, which calls `loadingStop` (line 44)

  The whole game is built only after the SDK has finished. — [Web/src/main.ts](Web/src/main.ts)
- **`startCrazyGames`** ([Web/src/ui/crazygames.ts:72-85](Web/src/ui/crazygames.ts)) runs these steps in order:
  - Injects `https://sdk.crazygames.com/crazygames-sdk-v3.js` and races it against a 6 s timeout (`SDK_TIMEOUT = 6000`, line 19).
  - Then `await`s `SDK.init()` against a second 6 s timeout.
  - Only after `init` calls `game.loadingStart()` (line 79) and switches the save to `sdk.data` (line 80).

  Worst case is about 12 s of boot screen before the game is built. `loadingStart` comes after SDK download and init, so it does not cover the main bundle download. — [Web/src/ui/crazygames.ts](Web/src/ui/crazygames.ts)
- **`loadingStop`** is called once from `gameLoaded()` (crazygames.ts:88-90), right after the Shell is constructed (main.ts:44). — [Web/src/ui/crazygames.ts](Web/src/ui/crazygames.ts)
- **`gameplayStart`/`gameplayStop`** go through one function, `reportGameplay(now)` (crazygames.ts:93-97). It is called in only two places:
  - In `syncChrome` with `screen.k === 'playing' && !document.hidden` ([Web/src/ui/shell.ts:431](Web/src/ui/shell.ts)).
  - On `visibilitychange` (shell.ts:955).

  — [Web/src/ui/shell.ts](Web/src/ui/shell.ts)
- **Screens**: `'ready' | 'settings' | 'playing' | 'result' | 'page'` ([Web/src/present/flow.ts:29-34](Web/src/present/flow.ts)).
  - A new session starts on `{ k: 'ready' }` (session.ts:134).
  - `'playing'` is set only in `startPlaying()` (session.ts:1984-1985).
  - `startPlaying()` runs only from a tap or Space/Enter on the ready or result screen (session.ts:1241-1276), or from the `startShift` action (session.ts:450).

  So every menu, tab page, settings sheet and result screen is reported as non-gameplay, which is correct. The ready screen before the first tap is also reported as non-gameplay. — [Web/src/present/session.ts](Web/src/present/session.ts)
- **Taps are ignored on the ready screen** while the queue is filling (`world.isArriving()`, session.ts:1246; `queueFillSeconds: 1.5`, [Web/src/core/config.ts:111](Web/src/core/config.ts)). They are also ignored when the pointer moved past the mode-swipe threshold (session.ts:1246). — [Web/src/present/session.ts](Web/src/present/session.ts)
- **Multiplayer**: a tap during a versus match goes straight to `this.versus.match.tap()` (shell.ts:837-840). `reportGameplay` only reads the career session's `screen.k`, and `ui/versusLobby.ts` never calls `reportGameplay`. Multiplayer play therefore never sends `gameplayStart`. — [Web/src/ui/shell.ts](Web/src/ui/shell.ts)
- **Focus handling on CrazyGames**:
  - The world is not frozen on blur (shell.ts:938-957, `if (!inPortal)` guards, a change dated 01.10.2026).
  - `visibilitychange` still calls `reportGameplay(... && !document.hidden)` (shell.ts:955), so a hidden tab sends `gameplayStop`.

  CrazyGames docs: "Don't call this event when the user switches focus or leaves the game area (we handle this on our side)." — [shell.ts](Web/src/ui/shell.ts); [CrazyGames SDK Game docs](https://docs.crazygames.com/sdk/game/)
- **What CrazyGames' docs ask for**:
  - "The `gameplay start` function has to be called whenever the player starts playing or resumes playing after a break."
  - "gameplay stop … on every game break … entering a menu, ending level, pausing the game."
  - "The first event is used to determine your game's initial loading size."
  - The docs do not use the word "conversion". — [CrazyGames SDK Game docs](https://docs.crazygames.com/sdk/game/)
- **`happytime()`** is limited to once every 90 s (crazygames.ts:21, 105-110). It is triggered by:
  - A boss busted, or a completed Legendary Shift (session.ts:2083).
  - A new Unlimited/Mayhem record (session.ts:2133).
  - Prestige (Web/README.md, CrazyGames section).

  — [Web/src/ui/crazygames.ts](Web/src/ui/crazygames.ts)
- **Rewarded ad**: `sdk.ad.requestAd('rewarded')` (crazygames.ts:116-145). It is wired as `rewardedAd(done) || rewardedAdsense(done)` (shell.ts:153).
  - On CrazyGames only the free Standard Chest uses it: `adOffers: !inPortal && !inItch` (shell.ts:156).
  - In Basic Launch the SDK returns `adsDisabledBasicLaunch`, and the game's own placeholder ad plays instead (crazygames.ts:135-137).
  - No midgame ads (Web/README.md, CrazyGames section).

  — [Web/src/ui/crazygames.ts](Web/src/ui/crazygames.ts)
- **Invite links**: `inviteLink`/`getInviteParam('room')` (crazygames.ts:148-166), used by versusLobby.ts:490 and shell.ts:596. — [Web/src/ui/crazygames.ts](Web/src/ui/crazygames.ts)
- **Not used**: the SDK's user/account module (no login prompt, no username, no `getUser`). Only `data`, `game` and `ad` appear in the SDK interface the game declares (crazygames.ts:27-44). — [Web/src/ui/crazygames.ts](Web/src/ui/crazygames.ts)
- **Production CSP for `?crazygames`**: `script-src 'self' https://*.crazygames.com`, with `connect-src`/`frame-src` limited to `*.crazygames.com` plus PeerJS and the game's own API (checked with `curl -D -` on 08.10.2026; source [Web/nginx.conf:19](Web/nginx.conf)). — [Web/nginx.conf](Web/nginx.conf)
- **Local `vite preview` uses the default CSP**, which blocks the CrazyGames SDK. My local test logged: "Loading the script 'https://sdk.crazygames.com/crazygames-sdk-v3.js' violates the following Content Security Policy directive". The README says to test without the CSP (Web/README.md, "Test locally"). So I could not observe real SDK calls locally. — [Web/vite.config.ts:22-27](Web/vite.config.ts); [Web/README.md](Web/README.md)

### Inferences
- If CrazyGames' "gameplay conversion" is the share of sessions that send a `gameplayStart`, a visitor who loads the game but never taps is not converted. That includes visitors who look at the ready screen, open a tab (Progress, Shop, Build) or close the game. 66.7% desktop and 37.4% mobile conversion would then mean that about a third of desktop visitors and almost two thirds of mobile visitors never complete a first tap that starts a shift.
- Taps during the 1.5 s queue fill and slight drags are dropped without feedback (session.ts:1246). On a touch screen a first tap can get lost this way.
- Reporting `gameplayStop` on `visibilitychange` goes against the docs and may distort CrazyGames' gameplay-time measurement. The size of the effect is unknown.
- Multiplayer sessions on CrazyGames are invisible to their gameplay tracking.
- `loadingStart` comes late (after SDK init), so CrazyGames' own loading-time measurement covers only part of the real load.
- Because `script-src` allows only `*.crazygames.com`, ad-tech scripts the SDK may pull from third-party domains could be blocked once ads are enabled after Basic Launch. I did not verify this.

### Gaps
- CrazyGames' exact definition of "gameplay conversion" is not in the SDK docs page I fetched.
- I could not watch the real SDK event sequence. The local CSP blocks the SDK, and I did not run a no-CSP server or the real CrazyGames embed.
- Which orientation and size were set in the CrazyGames submission form is not in the repo.

## 2. First-time user experience (load to first real tap), and layout in landscape and small iframes

### Takeaway
A new player lands directly on the level-1 ready screen. There is no menu, name prompt or consent dialog. The ring is spinning, a pulsing ring marks the front car, the text says "Tap to send your first car", and the full tab bar is visible. The default scene for a new player is **near-black**, because a player without a map skin gets the background colour as ground. In mobile landscape the front car and its queue sit at the bottom edge, partly behind the tab bar.

### Cited Findings
- **Constructor**: a save without `tutorialDone` creates `new Tutorial()` and forces mode `'shift'` (session.ts:279-295). It also marks all patch notes as read so no notice dot shows. — [Web/src/present/session.ts](Web/src/present/session.ts)
- **The tutorial covers only the first shift and nothing pauses** ([Web/src/present/tutorial.ts:14-66](Web/src/present/tutorial.ts)). The steps are:
  1. `sendCar` ("Tap to send your first car")
  2. `findGap` ("Wait for a gap, then tap", after the first launch)
  3. `combo` ("Clean merges build your combo", after 2 clean merges)
  4. A strike hint on the first crash ("Cars crash instantly. Police get N chances.")

  Strings are in [Web/src/present/strings.ts:32-37](Web/src/present/strings.ts). — [tutorial.ts](Web/src/present/tutorial.ts)
- **End of the first shift**: `save.tutorialDone = true` and `onStep('tutorial-done')` happen whether the shift was won or lost (session.ts:2100-2106). — [Web/src/present/session.ts](Web/src/present/session.ts)
- **Level 1 is meant to be easy**:
  - About 10 cars (8-12), +1.1 per level, at most 30.
  - Values ramp up to full difficulty by `hardLevel` 5.
  - Early shifts last 6-10 s.

  Sources: Spiel.md §2, line 44 ff.; Spiel.md:805; config.ts:357-361. — [Spiel.md](Spiel.md); [Web/src/core/config.ts](Web/src/core/config.ts)
- **The tab bar shows on every screen except settings and playing** (`showsTabBar`, flow.ts:37). It is therefore on screen for a new player before the first tap. A Settings button also shows on the ready and result screens (shell.ts:458). — [Web/src/present/flow.ts](Web/src/present/flow.ts)
- **Default ground colour**: `MapTheme.ground(null)` returns `'background'` ([Web/src/present/mapThemes.ts:123-124](Web/src/present/mapThemes.ts)). A new career has `mapSkin: null` ([Web/src/core/career.ts:324](Web/src/core/career.ts)). Background is `#0B0D10` (theme-color in [Web/index.html:8](Web/index.html)). Night only starts at level 10 (`nightLevel: 10`, config.ts:456), so the dark look at level 1 comes from the ground colour, not from night. — code above
- **Local test, fresh profile, `?crazygames`**:
  - At 740×360 mobile landscape and at 1010×568 desktop, the first screen showed a dark-grey ring on near-black ground, the HUD card (Money 0 · Level 1 · 8/12 cars · Best –), the prompt "Tap to send your first car", a large Settings pill and the four-item tab bar.
  - In mobile landscape the pulsing front-car marker sat at the bottom edge, half under the tab bar, and the waiting queue was off screen.
  - At 1010×568 desktop the front car was visible just above the tab bar.

  — local test (screenshots in scratchpad)
- **Camera in landscape**: `streetCamera` fits the layout. On wide viewports it only moves the ring toward the vertical middle (`landscape` factor from aspect 0.9 to 1.4). The comment says "The queue below still shows its front cars" ([Web/src/present/perspective.ts:38-50](Web/src/present/perspective.ts)). — [perspective.ts](Web/src/present/perspective.ts)
- **No orientation handling**: there is no "rotate your device" prompt and no landscape-specific CSS. A grep for `orientation`/`landscape` in `src/` only finds perspective.ts. The manifest says `"orientation": "portrait"` ([Web/public/manifest.webmanifest:11](Web/public/manifest.webmanifest)), but that does not apply inside an iframe. — repo grep
- **Modes and systems unlock gradually**:
  - Daily at level 4; the mode-swipe hint after level 6; Trials at 9; Casino at 12; Season Pass at 15.
  - Welcome Standard Chest when level 2 is first reached.

  Sources: Spiel.md §9 "Freischaltungen", around lines 357-375; career.ts:866-869. — [Spiel.md](Spiel.md)
- **Hidden inside CrazyGames**:
  - Install tips, cloud-sync intro, invite tips and the "Build with us" tip (session.ts:384, 397; shell.ts:646, 654; cloud.ts:26).
  - The Friends button (shell.ts:463).
  - The website and CrazyGames rows in settings (sheets.ts:529-531).

  The Fandom wiki external link is still shown on CrazyGames (sheets.ts:346, 530). — [Web/src/ui/sheets.ts](Web/src/ui/sheets.ts)

### Inferences
- The first impression on CrazyGames is a dark, low-contrast scene with a small ring and a full app-style tab bar. The core action and the "toy" (the queue and front car) are least visible in mobile landscape, which is the case with the weakest conversion (37.4%).
- The only call to action before gameplay is the canvas text prompt. There is no large "Play" button. On mobile, a tap that lands on the tab bar opens a menu instead of starting gameplay.
- The tutorial does not explain the core rule before the first tap. "Wait for a gap" appears only after the first launch, and the "crash ends the shift" message only after the first crash. A level-1 shift lost early still marks the tutorial done.

### Gaps
- I did not test portrait mobile, the real CrazyGames mobile wrapper (which may force fullscreen landscape), or small embed sizes below 740×360.
- I did not measure time from load to first possible tap on real devices.

## 3. Load performance

### Takeaway
The initial download is about 330 KB compressed: two JS chunks (one preloaded), CSS and a font. Audio loads lazily after the first tap. On CrazyGames there is no service worker. Before the game appears, start-up runs a chain of awaits: the SDK script, then `SDK.init()`, then a font wait of up to 1.5 s.

### Cited Findings
- **`dist/assets` sizes** (build of 08.10.2026, gzip -9 measured locally):

  | File | Raw | Gzip |
  | --- | --- | --- |
  | `index-*.js` | 428,799 B | 144,637 B |
  | `shop-*.js` (modulepreloaded from index.html) | 401,252 B | 131,895 B |
  | `index-*.css` | 35,903 B | 8,263 B |
  | `overpass…woff2` | 40,796 B | — |

  Lazy chunks: `bundler` 87 KB raw / 23 KB gzip, `casino` 39.5 KB / 15 KB, `qr` 21 KB, `licenses` 13 KB, `casinoFlow` 8 KB.

  — `Web/dist` (local measurement)
- **Production main chunk**: `index-B4S6m46O.js` transferred 144,903 B gzip in 0.15 s from Cloudflare (DUS). HTML is served `Cache-Control: no-cache`. Assets are `expires 1y` ([Web/nginx.conf:76-79](Web/nginx.conf)). gzip level 6 is on (nginx.conf:34-39). — curl 08.10.2026
- **Audio** (`dist/audio`, 1.9 MB, 51 files: music about 0.94 MB, sounds about 0.85 MB) loads only after `AudioPlayer.unlock()`, which runs on the first pointerdown ([Web/src/audio/player.ts:33-64](Web/src/audio/player.ts); shell.ts:835). It does not block the first frame. — [player.ts](Web/src/audio/player.ts)
- **No service worker on CrazyGames**: `!inPortal && !inItch` ([Web/src/main.ts:71](Web/src/main.ts)). Every CrazyGames visit downloads the bundle again unless the HTTP cache has it. — [main.ts](Web/src/main.ts)
- **Font wait**: `Promise.race([document.fonts.load(...), 1500 ms])` before Shell construction (main.ts:40). — [main.ts](Web/src/main.ts)
- **CrazyGames dashboard** (given in the task): average load 2.5 s, load crash rate 0.51%.

### Inferences
- The serial chain (bundle, then SDK script, then `SDK.init()`, then font up to 1.5 s, then Shell) adds to the time before the first frame. The ready screen appears only after all of it.
- `shop-*.js` (132 KB gzip) is modulepreloaded at start although the shop is not needed before the first shift. That is about 48% of the initial JS.

### Gaps
- I did not measure CrazyGames' own load timer or real device timings.

## 4. Possible sources of the 3.53% gameplay crash rate

### Takeaway
After boot there is **no global error handler and no error reporting** in the game. Error reporting is on the backlog (IDEA.md: GlitchTip, not built). The main `requestAnimationFrame` loop has no `try/catch` and schedules the next frame only at its end, so any exception thrown during a frame stops the game for good. Storage, save sealing and lazy imports are well guarded. A few fire-and-forget promises and audio calls could produce unhandled rejections.

### Cited Findings
- **Boot-only error handlers**: `window.addEventListener('error'/'unhandledrejection', bootFailed)` are removed right after the Shell is built (main.ts:29-30, 46-47). No other `'error'` or `'unhandledrejection'` listener exists in `src/` (repo grep). — [Web/src/main.ts](Web/src/main.ts)
- **The frame loop has no `try/catch`**: `loop(now)` runs `s.frame(...)`, `this.drawer.draw(list)`, audio updates and `syncChrome()`, then calls `requestAnimationFrame((t) => this.loop(t))` as its last statement (shell.ts:985-1006). — [Web/src/ui/shell.ts](Web/src/ui/shell.ts)
- **No error telemetry**:
  - "Analytics und Fehlerberichte … noch nicht gebaut" ([Spiel.md:786](Spiel.md); since then Umami was built).
  - "Offen ist nur noch GlitchTip als Coolify-Dienst für Fehlerberichte aus dem Feld" ([IDEA.md:81-85](IDEA.md)).
- **Storage access is wrapped in `try/catch` everywhere**:
  - storage/save.ts:311-370 (load, backup, write)
  - net/cloud.ts:99-160
  - net/leaderboard.ts:91-115
  - net/rewards.ts:21-35
  - storage/profile.ts:12-45
  - storage/store.ts:23-27

  `storage()` falls back to `localStorage` (store.ts:15). Its comment says "Reading `localStorage` can throw (blocked storage): callers catch." — [Web/src/storage/store.ts](Web/src/storage/store.ts)
- **The seal uses a hand-written synchronous SHA-256/HMAC, not `crypto.subtle`** ([Web/src/storage/seal.ts:1-78](Web/src/storage/seal.ts), header comment). `crypto.getRandomValues` is used in main.ts:18 and profile.ts:36. — [seal.ts](Web/src/storage/seal.ts)
- **Save size**: a local level-30 save was 2,445 chars, written twice (`carGame.save.v2` and `.bak`, save.ts:357-370). The CrazyGames Data Module limit is 1 MB ("Game data when converted to a JSON string cannot exceed 1048576 bytes"). It can throw `dataLimitExcedeed`, `dataModuleDisabled` or `other`. — local test; [CrazyGames Data docs](https://docs.crazygames.com/sdk/data/)
- **Lazy imports are guarded**:
  - Casino: `loading.catch` (casinoLoader.ts:26-37), and every caller adds `.catch` (session.ts:613-618, 1170; shop.ts:356).
  - Licenses: `.catch` (shell.ts:769-771).
  - PeerJS: loaded with dynamic import only for real rooms, with `.catch` (net/room.ts:22-28).

  — repo
- **Promise and audio paths without explicit handling**:
  - `void this.ctx.resume()` in `unlock()` (player.ts:35) and in `setSuspended` (player.ts:331).
  - `new AudioContext(...)` inside the canvas pointerdown handler, before the tap is pushed (shell.ts:835, player.ts:38-39).
  - `removeFriend(...).then(...)` without a catch (friendsSheet.ts:232).

  — [Web/src/audio/player.ts](Web/src/audio/player.ts); [Web/src/ui/friendsSheet.ts](Web/src/ui/friendsSheet.ts)
- **PeerJS/WebRTC errors** are handled with `peer.on('error')` and `conn.on('error')` (room.ts:133, 147, 221). — [Web/src/net/room.ts](Web/src/net/room.ts)
- **CrazyGames SDK calls** are wrapped in `try/catch` (`call()`, crazygames.ts:168-175; rewardedAd 125-143). — [crazygames.ts](Web/src/ui/crazygames.ts)
- **Open bug in BUGS.md**: boss money is kept after a lost boss shift. This is an economy exploit, not a crash. — [BUGS.md](BUGS.md)

### Inferences
- Since the loop re-schedules itself only at the end, any exception from rendering, simulation or `syncChrome` freezes the canvas while the DOM tab bar stays alive. CrazyGames' error capture would count such an exception if it happens during gameplay.
- If `new AudioContext()` or `ctx.resume()` throws or rejects in some iframe or browser combination, the pointerdown handler would throw before `push(...)`. That tap would be lost, and the next taps too if it keeps throwing. This is a plausible risk, not one I observed.
- Without telemetry the 3.53% cannot be traced to a cause from the repo alone. Errors from CrazyGames' own SDK or ad code may be counted in that number too.

### Gaps
- I have no access to CrazyGames' error details or stack traces. I did not run a long gameplay session to provoke errors.

## 5. Existing retention hooks, and which are missing on CrazyGames

### Takeaway
The game has many daily and weekly systems, but most start at level 4 or later. Several "come back" levers are switched off inside CrazyGames: cloud sync, Friends, invites, Build with us, install, and the free-upgrade and ad-boost offers. The CrazyGames account/login module is not used. The game has no push notifications.

### Cited Findings
- **Daily Shift** (from level 4):
  - Pays 300 × streak (up to 7 days) plus an Event Chest.
  - Streak skins at 7/14/30 days; +15% pay from a 3-day streak.
  - Streak Freeze every 7 days (max 2).
  - Warning 6 h before midnight.
  - Daily mutator.

  — [Spiel.md §11 "Daily Shift"](Spiel.md); unlock at Spiel.md §9
- **Other recurring rewards**:
  - Quests: 3 per day, 250-500 each.
  - Weekly Shift: 6,000 plus a Premium Chest.
  - Tours: Haunted Ring 24.10.-02.11., Winter Lights 18.12.-03.01., from level 9.
  - Season Pass: from level 15.
  - Daily Login income: "30 pro Toll Booth pro Tag Abwesenheit, höchstens 3 Tage". It needs a built Toll Booth module.

  — [Spiel.md §9, §11, §12](Spiel.md)
- **Modules are effectively out of reach early**: "Die erste zusätzliche Zufahrt (32.500) und die Module (10.400–15.600) werden nie erschwinglich, solange man Upgrades kauft." — [Spiel.md:804](Spiel.md)
- **Switched off on CrazyGames**:
  - Cloud sync: `cloudEnabled = leaderboardEnabled && !inPortal` (cloud.ts:26).
  - Friends button (shell.ts:463).
  - Invite tip (session.ts:397) and invite reminder (shell.ts:654).
  - Build-with-us tip and settings group (session.ts:384; sheets.ts:486).
  - Install tip (shell.ts:646).
  - Free upgrade step and Skin-Upgrade ad boost (shell.ts:156).

  The settings footer says "Log in to CrazyGames to keep your progress on every device." (sheets.ts:541-543). — repo
- **Save on CrazyGames**: the Data Module holds the save, in the cloud for logged-in users and in localStorage for guests ([Web/README.md, "CrazyGames"](Web/README.md); crazygames.ts:80). CrazyGames: "If the user is not logged in, the data module will store the game data in LocalStorage." — [CrazyGames Data docs](https://docs.crazygames.com/sdk/data/)
- **Still in localStorage on the portal**: the Big Screen backdrop ([Web/src/storage/backdrop.ts:5-29](Web/src/storage/backdrop.ts)).
- **Calls to `navigator.storage.persist()`** at the level-5 hint: `keepStorage()` runs before the `inPortal` early return in `giveHint` (shell.ts:644-646), so it also runs on CrazyGames. — [shell.ts](Web/src/ui/shell.ts)
- **Growth ideas list Web Push for the Daily as not built**, to come "Erst wenn die Zahlen aus Umami zeigen, dass Spieler nach Tag 2 gehen." — [IDEA.md:89-118](IDEA.md)

### Inferences
- A CrazyGames player who leaves before level 4 (the Daily unlock) has seen no daily reward, streak or calendar-based reason to come back. Given D1 of 1.8% (desktop) and 3.85% (mobile), the main daily hooks probably reach few first-day players.
- Guest saves on CrazyGames live in localStorage, and the game never prompts for a CrazyGames login. Returning players on another device or after clearing storage start over.
- The login income is effectively zero for new players because it depends on Toll Booths.

### Gaps
- I could not measure at which level CrazyGames players stop, because there are no CrazyGames-side events and Umami excludes the portal.

## 6. Session-length drivers

### Takeaway
Shifts are short (6-10 s early, 8-75 s by level) and flow into each other without a result screen. Retries are instant. The career bot measured a **difficulty wall at levels 8-12**, which a casual player reaches around **minutes 5-7**. That is the range of CrazyGames' average playtime (5:45 mobile, 6:47 desktop).

### Cited Findings
- **Shift length and flow**: "Schichtlänge – entschieden: kurz lassen … Je nach Level 8–75 s." The result melts into the next ready screen ("Fließender Schichtwechsel, kein Ergebnis-Screen"), and a lost shift can be retried with one tap. — [Spiel.md §2](Spiel.md), lines around 47-52; Spiel.md §3
- **Career-bot measurements**:
  - "Die ersten Minuten … Schichten dauern anfangs 6–10 s. Ein Gelegenheitsspieler verliert bei **Level 10 vier Schichten am Stück** (Minute 5–7)."
  - Loss rates per level from 8 to 12: skilled bot 13 → 22 → 27 → 35 → 47%; casual bot 45 → 45 → 63 → 77 → 65%.
  - Leo decided "bleibt so" (29.09.2026).

  — [Spiel.md:805](Spiel.md)
- **What changes from level 8**: "ab Level 8 kommen mehr Autos (+1,1 je Level, ab Level 9 fünf Ring-Bots statt vier), Krankenwagen (8), der Verbrecher hat weniger Zeit, dazu Regen, City Events und ab 10 die Nacht." — [Spiel.md:805](Spiel.md)
- **Unlock pacing**: "etwa eins alle ein bis vier Minuten (Daily nach ~1 min, Modi ~2, Trials ~4, Casino ~8)". — [Spiel.md §9](Spiel.md)
- **Pacing to level 60**: reached after 1.1-1.6 h of pure play. — [Spiel.md:804](Spiel.md)
- **One-more-run aids**:
  - A near-miss line after a loss and a money goal after a win (`closeCall`, session.ts:2148-2160).
  - Tailwind (+25% after a narrow loss).

  — [session.ts](Web/src/present/session.ts); [Spiel.md §11](Spiel.md)

### Inferences
- The measured spike in losses at levels 8-12 (minutes 5-7) matches CrazyGames' average session length closely. Many sessions probably end at that wall rather than by choice.
- Casino (about 8 min) and Season Pass (level 15) unlock after most average CrazyGames sessions have already ended.

### Gaps
- There is no real-player distribution of exit level for CrazyGames. Bot data is a proxy.

## 7. Umami data (analytics.kestrel.nrw)

### Takeaway
**I could not access the Umami data.** The dashboard URL redirected to `/login`, and the API returned 401 Unauthorized, so the browser had no logged-in session. No visit, event or funnel numbers are reported here. Even with access, Umami would show only the normal site and the Play app, not CrazyGames, and it has only been live since 07.10.2026.

### Cited Findings
- Website ID `ed1329fe-e263-49b7-bcfa-e27519a8fab1`, host `https://analytics.kestrel.nrw` ([Web/src/ui/analytics.ts:11-12](Web/src/ui/analytics.ts)). — repo
- Active only when `!inPortal && !inItch && import.meta.env.PROD` (analytics.ts:22), and with `data-do-not-track="true"` (analytics.ts:30). The script loads after the game is on screen (main.ts:57). — [analytics.ts](Web/src/ui/analytics.ts)
- **Events**:
  - `tutorial-done` and `shift` with `{ mode, level, outcome }` (session.ts:2104-2106), wired through `this.session.onStep = track` (shell.ts:315).
  - `tutorial-done` fires at the end of the first shift whatever the outcome, so it means "first shift finished", not "tutorial passed".

  — [session.ts](Web/src/present/session.ts)
- **Umami has run only since 07.10.2026** (CLAUDE.md, Analytics; IDEA.md:83). At most about one day of data existed on 08.10.2026. — [CLAUDE.md](CLAUDE.md)
- `GET https://analytics.kestrel.nrw/api/websites/<id>/stats` returned `{"error":{"message":"Unauthorized","code":"unauthorized","status":401}}`, and the page redirected to `/login` (Chrome DevTools, 08.10.2026). — direct check

### Inferences
- There is no event for "game loaded" or "first tap". Even with access, Umami cannot measure the load → first tap step that CrazyGames' gameplay conversion reflects. Only first shift finished (`tutorial-done`) and per-shift outcomes are tracked.

### Gaps
- Visits, referrers, devices, the funnel and fail rates per level are all unknown, because I could not log in. Leo has to open the dashboard himself or share credentials or a share link.
