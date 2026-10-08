# CrazyGames platform: metrics, Basic Launch → Full Launch, SDK v3 levers

Research date: 08.10.2026. Context: "Roundabout Timing" (one-tap, portrait-first HTML5 canvas), in Basic Launch since 01.10.2026, scored 8/15 on desktop and 8/15 on mobile (9 needed). Weak spots: D1 (desktop 1.80 %, mobile 3.85 %), gameplay conversion (mobile 37.40 %, desktop 66.72 %), avg playtime ~6 min, CTR 1.0 %.

Source quality: the official docs (docs.crazygames.com) were fetched directly in October 2026 and are current. Third-party guides (portalready.world, cinevva) and indie devlogs (itch.io) are marked as such. I found **no public source for the 15-point score / 9-point threshold**. It seems to exist only on the developer dashboard.

## 1. Metric definitions (conversion, playtime, retention, CTR, crash rates)

### Takeaway
Officially, CrazyGames defines three gating KPIs: **conversion = share of players who play ≥ 1 minute after starting the game**, **average playtime per session**, and **Day 1 retention**. The KPIs are tracked automatically without the SDK and benchmarked against other games on the platform. The docs give no public definition of CTR, D7, returning users, or "crash rate". The FAQ does list CTR among the data collected in Basic Launch.

### Cited Findings
- **Conversion:** "The percentage of players who play for at least one minute after starting the game." Low conversion means players leave before meaningful play, often because of slow load times or confusing onboarding. Top titles "typically convert 80%+", load in under 10 seconds, and have a build size below 20 MB. — [Basic Launch Guide](https://docs.crazygames.com/resources/basic-launch-metrics/)
- **Average play time:** "the average time a player spends in your game in a single session". Successful titles often reach 10+ minutes. — [Basic Launch Guide](https://docs.crazygames.com/resources/basic-launch-metrics/)
- **Day 1 retention:** the share of players who return the day after their first session. "Strong games often achieve 10–15%". — [Basic Launch Guide](https://docs.crazygames.com/resources/basic-launch-metrics/)
- KPI tracking is automatic and needs no SDK. The dashboard refreshes daily, and D1 appears one day later. The guide calls the KPIs "a compass, not a final grade". — [Basic Launch Guide](https://docs.crazygames.com/resources/basic-launch-metrics/)
- Progression to Full Launch is "based on key engagement metrics, namely average playtime, conversion to gameplay, and retention", "benchmarked against other games on the platform". — [Docs intro](https://docs.crazygames.com/)
- Basic Launch collects "retention, playtime, CTR, conversion to gameplay". The game is shown to a small segment of players. — [FAQ](https://docs.crazygames.com/faq/)
- An independent developer defines conversion on the dashboard as "plays ≥1 minute / Play Now clicks" (Puckit!: 73 % conversion, 4:28 min avg playtime, Nov 2024). — [Reitgames, Puckit 100k](https://reitgames.com/news/puckit-100k-gameplay)
- Load metric: CrazyGames measures "first-load time and size up to the moment your game calls the SDK gameplayStart method". This should mark the first moment of real gameplay, not a loading screen. — [Game Loading Tips](https://docs.crazygames.com/resources/getting-to-the-first-frame/)
- With the SDK, the initial download is measured from the start of loading to the first `gameplayStart`. Without the SDK, the total file size counts. — [Technical requirements](https://docs.crazygames.com/requirements/technical/)
- `gameplayStart()`/`gameplayStop()`: call them at every start or resume (level start, revive) and at every break (menu, level end, pause). Do not call them on focus or tab changes, which CrazyGames handles itself. The first call sets the "initial loading size". — [SDK Game module](https://docs.crazygames.com/sdk/game/)
- Crash rate: a 2026 devlog shows "Crash rate 2.7 %" (developer's own target < 1 %) next to CTR 0.4 % (target 2–4 %) and playtime 4:19 (target 8+ min). These targets are the developer's own, not official values. — [Larss IO devlog (fxf8, itch.io, 2026)](https://fxf8.itch.io/larss-io/devlog/1586849/launching-a-1v1-strategy-game-on-crazygames-04-ctr-and-what-im-learning)
- Rating as a further signal: a 9.0+ rating increases the chance of a "top rated" label. Rankings and homepage visibility depend on play count, playtime, retention, conversion, and player feedback. — [Reitgames](https://reitgames.com/news/puckit-100k-gameplay); [FAQ](https://docs.crazygames.com/faq/)

### Inferences
- Because Basic Launch tracks KPIs **without the SDK**, conversion ("≥ 1 min after starting the game") is probably measured as time on the game page or iframe after the start click, **not** via `gameplayStart`. Unconfirmed. Practical consequence: anything that delays a player's first minute or drives them away (loading, splash, menu, tutorial text, rotate prompt) lowers conversion, regardless of SDK events.
- For this game: desktop conversion of 66.7 % is below the 80 % benchmark, and 37.4 % on mobile is far below it. The mobile drop-off happens in the first minute (see section 3).
- Avg playtime of ~6 min against the "10+ min" benchmark, and D1 of 1.8–3.85 % against "10–15 %", are the largest gaps relative to the official reference values.
- "Crash rate" (gameplay/load) is not defined in the docs. Most likely it counts sessions with an uncaught JS error or an aborted load. Robust global error handling (no uncaught errors in the CrazyGames iframe, a clean SDK `init()` without exceptions) would be the obvious protection. Unconfirmed.

### Gaps
- No official definition found for CTR (probably clicks on the thumbnail / impressions in listings, as the devlog suggests: 6,100 impressions, 23 clicks = 0.4 %), D7, "returning users", gameplay crash rate, or load crash rate.
- Not found: whether conversion uses `gameplayStart` once the SDK is integrated, or whether playtime counts only time between `gameplayStart`/`gameplayStop`.
- Not found: how the platform-wide benchmark per metric is derived (percentiles per category or genre?).

## 2. Basic Launch → Full Launch: scoring, window, review, second chance

### Takeaway
Officially: Basic Launch runs **at least 7 days AND at least 500 plays, otherwise it ends automatically after 21 days**. Games with strong KPIs are invited to Full Launch, followed by the Full Implementation (SDK) and another QA review. Updates during Basic Launch **go live instantly** and show up in the next daily refresh. **The 15-point system with a 9-point threshold is not publicly documented.** After a miss, resubmission is possible with "meaningful improvements". According to a third-party source that cites the docs, there is also "another Basic Launch after improvements".

### Cited Findings
- "Basic Launch ends once your game has been live for at least 7 days and has reached at least 500 plays. Both thresholds need to be met. If your game hasn't reached 500 plays, the period ends automatically after 21 days." — [Basic Launch Guide](https://docs.crazygames.com/resources/basic-launch-metrics/)
- "You can update your game at any time." Updates are approved automatically, and their effect shows at the next daily refresh. — [Basic Launch Guide](https://docs.crazygames.com/resources/basic-launch-metrics/)
- "Game and art updates for games in Basic Launch go live instantly." Other updates are usually processed the same working day. — [FAQ](https://docs.crazygames.com/faq/)
- A game that performs well and is "updated to meet our Full Requirements" is "reviewed once more by our QA team". — [FAQ](https://docs.crazygames.com/faq/)
- Resubmission: "Yes, you're welcome to resubmit your game", after "meaningful improvements". Decisions arrive by email. — [FAQ](https://docs.crazygames.com/faq/)
- Possible outcomes after Basic Launch: (a) invitation to the Full Implementation, (b) another Basic Launch after improvements, (c) "cannot proceed". A resubmission after (c) counts as a new game, and there is no formal appeal process. This is third-party (portalready.world, checked against the docs on 30.09.2026); I could not verify the wording in the official docs. — [portalready.world](https://portalready.world/portals/crazygames/)
- Basic vs. Full requirements: Basic = initial download ≤ 50 MB, total ≤ 250 MB (50 MB without SDK), ≤ 1500 files, PEGI 12, no external ads, no external login. Full = SDK with `gameplayStart`/`gameplayStop`, ads only via the SDK (must work with AdBlock), the game lands directly in gameplay, progress linked to the CrazyGames account, automatic login, CrazyGames username/avatar. For multiplayer: room info, invite link, instant multiplayer, disableChat. — [Requirements intro](https://docs.crazygames.com/requirements/intro/)
- Ads are switched off in Basic Launch "to keep early testing clean". If the SDK is integrated, the game must run smoothly with ads off, or it is rejected. — [FAQ](https://docs.crazygames.com/faq/); [Ads requirements](https://docs.crazygames.com/requirements/ads/)
- Example timeline from a devlog: Basic Launch approved on 13.07., promotion decision expected 20.–23.07., end on 27.07. if not promoted. — [Larss IO devlog](https://fxf8.itch.io/larss-io/devlog/1586849/launching-a-1v1-strategy-game-on-crazygames-04-ctr-and-what-im-learning)
- Third-party guides describe Basic Launch as "roughly two weeks" (developer statements, not official). — [cinevva guide](https://app.cinevva.com/guides/publish-game-crazygames)
- Exclusivity: two months of browser exclusivity raise compensation by 50 % (Terms 5.5, third-party summary). — [portalready.world](https://portalready.world/portals/crazygames/)

### Inferences
- Window: launched on 01.10.2026, the 21-day maximum ends on **22.10.2026**, which matches the given expiry date. If the game has already reached 500 plays, it could close as early as 7 days after launch (around 08.10.). The dashboard showing "8/15" suggests the evaluation is still open or close to the decision. Unconfirmed.
- Updates during Basic Launch **can** help, because they go live instantly and new sessions are measured with the new build. Whether the score covers the whole window or only the latest days is unknown. Early changes therefore weigh more (more days with the better build). D1 needs one extra day per cohort.
- One extra point decides the result (8 → 9). The most likely candidate is the metric that sits just below a level boundary. Without the public point table, that cannot be read off. Ask CrazyGames directly (developer portal contact, FAQ) which metric is missing how much.
- Plan for a miss: make "meaningful improvements" (D1 hooks, faster first minute on mobile, new cover), then resubmit or ask for another Basic Launch. Name the improvements concretely in the email.

### Gaps
- 15-point scoring: which metrics, how many points per metric, which boundaries, whether desktop and mobile are judged separately (the game has its own score per platform) and how they combine (both ≥ 9? either one?). No public source.
- Whether a manual review can override the score.
- Whether there is a waiting period before re-entry, and whether a second Basic Launch keeps the old data.

## 3. Mobile on CrazyGames (orientation, fullscreen, low conversion)

### Takeaway
CrazyGames officially supports portrait games. The **orientation is declared at submission**, and the website prompts players to rotate; the docs say not to build your own orientation lock. Your own fullscreen buttons are **forbidden**, since the platform provides fullscreen. Legibility must hold in the **16:9 iframe sizes**, including **mobile 800×450 px**. Only games with an **initial download ≤ 20 MB** may appear on the mobile homepage. Games run fullscreen in the iOS/Android app, but safe areas must be respected.

### Cited Findings
- "we support both portrait (vertical) and landscape (horizontal) games". Portrait games can use side padding (black bars or background images) on desktop. "Your game doesn't need to be mobile-first, but it should work well across devices where possible." — [FAQ](https://docs.crazygames.com/faq/)
- Orientation: you declare supported orientations in the submission. The website asks users to rotate when needed, so orientation lock logic is not required. — [Technical requirements](https://docs.crazygames.com/requirements/technical/)
- Developer portal setting (forum statement, not official): "Game Type > Screen orientation on mobile" offers BOTH or PORTRAIT. The QA tool has a mobile mode (QR code or link) for testing on the phone. — [technopat.net forum post](https://www.technopat.net/sosyal/uye/agamemnun.810261/recent-content)
- Mobile homepage eligibility: initial download "cannot exceed 20MB". Without the SDK, total size ≤ 20 MB. — [Technical requirements](https://docs.crazygames.com/requirements/technical/)
- Touch is required if mobile is supported. Use `user-select: none` (with prefixes) on `body` to avoid magnifier and context menus. On iOS, call `AudioContext.resume()` in a user gesture, because a visibility listener alone is not enough. — [Technical requirements](https://docs.crazygames.com/requirements/technical/)
- Legibility at devicePixelRatio 1 in the 16:9 iframe sizes, including mobile 800×450 px and tablet 1080×607 px. Desktop ranges from 821×462 to 1920×1080. — [Gameplay requirements](https://docs.crazygames.com/requirements/gameplay/)
- "Fullscreen mode is automatically provided by CrazyGames." In-game fullscreen buttons are forbidden. — [Gameplay requirements](https://docs.crazygames.com/requirements/gameplay/)
- CrazyGames app (iOS/Android): games open fullscreen, and an immersive edge-to-edge mode exists. Pad the HUD with `env(safe-area-inset-*)`. Detect the app via `systemInfo.applicationType` (`google_play_store`, `apple_store`). The sitelock/CSP must allow `capacitor://app.crazygames.com` and `https://app.crazygames.com` with their schemes, or iOS shows a white screen. — [CrazyGames App](https://docs.crazygames.com/resources/crazygames-app/)
- `systemInfo` provides device type (desktop/tablet/mobile), OS, browser, locale, and country. — [SDK User module](https://docs.crazygames.com/sdk/user/)
- General iframe problem (not CrazyGames-specific): orientation detection inside an iframe reads the iframe's dimensions, not the device's, so a landscape frame always looks like "landscape". — [Construct forum (sutee)](https://www.construct.net/en/forum/users/sutee-217102/posts)
- Old developer blog post (around 2020, possibly outdated): the PWA test raised retention by 18 % and session length by 40–55 % for mobile-friendly games. — [CrazyGames developer blog, PWA](https://developer.crazygames.com/blog/introducing-progressive-web-ap)

### Inferences
- Likely causes of the 37 % mobile conversion for a portrait-first game: (1) if the orientation is declared as "landscape/both" or wrongly, the game renders portrait inside a landscape frame (800×450), making it tiny and hard to read; (2) a rotate prompt or a required fullscreen tap costs time and players; (3) an initial download over 20 MB excludes the game from the mobile homepage (a different audience); (4) audio/AudioContext or touch problems on iOS. **Check the setting "Screen orientation on mobile = PORTRAIT"** and test with the QA tool on a real phone.
- The game's own orientation or iframe size detection must use `window.innerWidth/innerHeight` of the iframe and must not show its own "please rotate" hint, because the platform already does that.
- If the game shows its own fullscreen button anywhere (PWA install, fullscreen toggle), hide it in `?crazygames` mode, because the requirement forbids it.
- Apply safe-area padding to the HUD (already relevant for iOS PWA). Test the CrazyGames app separately.

### Gaps
- No data on typical mobile vs. desktop conversion on CrazyGames, or on whether portrait games convert worse.
- An official "mobile-friendly" flag is not described by that name. The likely candidates are the orientation and device settings in the submission form.
- Not documented whether mobile and desktop scores are evaluated separately (the dashboard suggests they are).

## 4. SDK v3 features that improve retention and playtime

### Takeaway
The relevant levers are the **Data module** (cloud save tied to the CrazyGames account, guest data local, automatic transfer on login), **automatic login / User module** (35+ million accounts), **`happytime()`** (site celebration on big moments), **`reportGameCompletedPercentage()`** (used for restart prompts and update notices), **Room data / invite links / instant multiplayer** (these feed invite buttons, notifications, and friend features on the platform), and **`listFriends()`**. Ads are off in Basic Launch, so they do not affect the score now. In Full Launch, midgame ads are capped by the SDK at 1 per 3 minutes.

### Cited Findings
- **Data module:** a localStorage-style API (`setItem/getItem/removeItem/clear`), limited to 1 MB of JSON. Saves are debounced (1 s, sometimes up to 30 s). Guests save in localStorage. On login, an account without data receives the guest data, while an account with existing data loads that. Logged-in users sync across devices. The "Progress Save" toggle must be on in the submission. Call `SDK.init()` early (it preloads the data). Migrate existing localStorage keys into the Data module. — [SDK Data module](https://docs.crazygames.com/sdk/data/)
- **Account integration (Full):** new and returning logged-in CrazyGames users are logged in automatically. Guests can play. **Logout and external login (Facebook, Google, email) are not allowed.** Fetch the user on every launch. Don't push guests into logging in. The preferred save path is the Data module; with your own backend, use the User module (`getUserToken`, verified on the server) and link by `userId`, not username. "Over 35 million players have a CrazyGames account." — [Account integration](https://docs.crazygames.com/requirements/account-integration/)
- **User module:** `getUser`, `showAuthPrompt`, `showAccountLinkPrompt`, `getUserToken` (valid 1 h), `addAuthListener` (Data module and APS reload the game on login), `systemInfo`, `listFriends` (paged, max 50 per page, 250 ms rate limit). — [SDK User module](https://docs.crazygames.com/sdk/user/)
- **happytime():** triggers a site celebration (confetti) for big achievements (boss, high score). Use it sparingly, not for routine events. — [SDK Game module](https://docs.crazygames.com/sdk/game/)
- **reportGameCompletedPercentage(n):** progress 0–100. The platform uses it for post-completion options such as restart prompts and update notices. Report it again after content updates. — [SDK Game module](https://docs.crazygames.com/sdk/game/)
- **Multiplayer:** `isInstantMultiplayer` (send the player straight into a joinable room; check right after `init()`), `inviteLink(params)`, `getInviteParam`/`inviteParams`, `updateRoom({roomId, isJoinable, inviteParams})`, `leftRoom()`, `addJoinRoomListener`. "Room data powers invite buttons, notifications, and friend features on the platform." `showInviteButton` is deprecated. — [SDK Game module](https://docs.crazygames.com/sdk/game/)
- **Settings:** `muteAudio` (required in Full for HTML5, and it overrides your own audio toggle) and `disableChat`, plus a settings change listener. — [SDK Game module](https://docs.crazygames.com/sdk/game/)
- **setGameContext():** attaches level and equipment data to user feedback. — [SDK Game module](https://docs.crazygames.com/sdk/game/)
- **Ads (Full):** midgame ads only at natural breaks (level end, death), at most 1 every 3 minutes (the SDK enforces this). Rewarded ads are optional; don't chain them; no rewarded button in active gameplay; the skip option must match the reward button in size; no "out-of-lives ad after every death". AdBlock users must be able to play normally. — [Ads requirements](https://docs.crazygames.com/requirements/ads/)
- Ad pacing to protect retention: introduce midgame ads after level 3–4 instead of level 1, and skip them in the first minutes of a player's first session. If retention drops, move ads to other spots rather than only cutting their number. — [Midgame Ads Pacing](https://docs.crazygames.com/resources/midgame-ads-pacing/) (quoted from search result)
- Official D1 levers: meaningful progression, daily hooks (login bonuses, quests), saved progress ("Lost progress means lost players"), fixing bugs. — [Basic Launch Guide](https://docs.crazygames.com/resources/basic-launch-metrics/)
- Official playtime levers: a rewarding core loop, clear goals, gradual introduction of new mechanics, and a fair difficulty curve. — [Basic Launch Guide](https://docs.crazygames.com/resources/basic-launch-metrics/)

### Inferences
- For Roundabout Timing on CrazyGames: the project already saves through the Data module (CLAUDE.md). Key point for D1: **the save must survive in a guest's localStorage and be tied to the CrazyGames account at login**, so cross-device play counts as a return.
- For Full Launch, the game's own account features (sync code for cloud save, friend code, invites via `/i/…`, "Build with us" link to timing.love) probably **conflict** with "no external login options" and "no cross-promotion / links to playable web versions". Hide them in `?crazygames` mode or replace them with SDK equivalents (Data module, `listFriends`, `inviteLink`). Multiplayer via PeerJS should use `inviteLink`/`updateRoom`/`isInstantMultiplayer` so the platform's notifications and friend features kick in.
- `happytime()` fits the boss defeat, a new Unlimited record, and level-ups at milestones. `reportGameCompletedPercentage` fits career progress (level / 60).
- D1 levers within the game's existing systems: daily rewards and a free chest are already planned on other sites (rewarded ads). On CrazyGames, ads are off in Basic Launch, so free daily rewards must work **without ads** (otherwise there is no hook in Basic Launch, and the requirement "must run smoothly with ads off" applies).
- I found no CrazyGames-native push notifications or "continue playing" for single-player games. CrazyGames shows "recently played" for logged-in users (not verified). Notifications are documented only in connection with Room data and multiplayer.

### Gaps
- No official numbers on how much the Data module, auto-login, or `happytime` raise D1 or playtime.
- Not found: whether CrazyGames has an official leaderboard API in SDK v3 (the doc navigation lists `sdk/leaderboards/`, `leaderboards-client/`, `leaderboard-api/`; their content was not fetched) or how leaderboards show up on the platform.
- Not found: an official "game updated" badge (only `reportGameCompletedPercentage` "update notices" are documented).

## 5. Thumbnail, cover, video, title, and category for CTR

### Takeaway
The official cover rules: three covers (16:9 1920×1080, 2:3 800×1200, 1:1 800×800) with a consistent look, **no screenshot**, a big stylized title as the only text, no borders, no "New/Play now", no icons. The hover preview video is **15–20 s, no sound, landscape 1080p 16:9 AND portrait 1080p 2:3, both mandatory**, starting on the static cover as its first frame. Cover updates produce session spikes, but don't change them too often. Choosing the right category also matters (devlog).

### Cited Findings
- Sizes: landscape 16:9 (1920×1080), portrait 2:3 (800×1200), square 1:1 (800×800), "consistent visuals and aesthetics". — [Game covers](https://docs.crazygames.com/requirements/game-covers/)
- Don'ts: borders, any text except the title ("New", "Updated", "Play now"), icons or store logos, unlicensed visuals, blurry or pixelated images. — [Game covers](https://docs.crazygames.com/requirements/game-covers/)
- Do's: no plain screenshot; instead use the main character, a large stylized title, or an evocative graphic (it need not show accurate gameplay). Keep it simple and clean (cluttered covers are hard to scan on small screens). Put the title on the cover, in a stylized font that fits the game. — [Game covers](https://docs.crazygames.com/requirements/game-covers/)
- Hover video: most thumbnails show a video preview on hover. 15–20 s maximum (longer is cut to 20 s), ≤ 50 MB, landscape 1080p 16:9 and portrait 1080p 2:3 (both mandatory). No black-screen or logo transitions, no black bars, no default mouse cursor, no "Play now", no icons, no fast-forwarding (the platform speeds it up slightly), no sound. Use the static cover as the opening frame. Show the most exciting moments. — [Game covers](https://docs.crazygames.com/requirements/game-covers/)
- Cover updates bring returning players and session spikes, but players lose recognition if covers change too often. Refresh them for content or seasonal updates. — [Game covers](https://docs.crazygames.com/requirements/game-covers/)
- Devlog case: CTR of 0.4 % blamed on (a) the wrong category (Strategy instead of Puzzle, players expected RTS) and (b) a cover that lost all impact at the real carousel size of **200×112 px**. Fixes: a new cover with clear objects, "VS" framing, higher contrast, and a bold title; a category change requested by email. — [Larss IO devlog](https://fxf8.itch.io/larss-io/devlog/1586849/launching-a-1v1-strategy-game-on-crazygames-04-ctr-and-what-im-learning)
- New games get a 48-hour featured slot. The "hot" label noticeably increases visibility. No paid placement. — [Reitgames](https://reitgames.com/news/puckit-100k-gameplay)
- Naming: avoid generic names unless you own the IP ("Super Chess" is distinctive, "Chess" is not). Name and imagery should match the genre. — [Quality guidelines](https://docs.crazygames.com/requirements/quality/)
- A game description and controls are required with the submission. — [Requirements intro](https://docs.crazygames.com/requirements/intro/)

### Inferences
- For Roundabout Timing: design the cover for the 200×112 px carousel. One clear motif (a roundabout from above with a car shooting in, maybe a near-miss or crash spark), high contrast, and a large "Roundabout Timing" wordmark. No UI screenshot.
- The hover video should show crash physics, boss vehicles, and near-misses within the first 2–3 s. It is needed in portrait 2:3 anyway, which suits a portrait game.
- Check the category: "Driving" or "Car" sets the wrong expectations (players expect racing). "Arcade"/"Casual"/"Timing"/"One button" fit better. Ask for a change by email if needed (as in the devlog).
- Since art updates in Basic Launch "go live instantly", a new cover during the window can still affect the CTR measurement.

### Gaps
- No official CTR benchmark. The "2–4 %" figure is a single developer's target.
- Unclear whether CTR counts toward the 15-point score at all (the FAQ lists it among the collected data, but the docs name only playtime, conversion, and retention as progression metrics).
- No A/B testing for covers on CrazyGames was found.

## 6. Official quality guidelines, tips, and case studies

### Takeaway
The official guidance is in the **Basic Launch Guide** (benchmarks plus levers per metric), the **Quality Guidelines** (optional: onboarding inside gameplay, skippable, visual instead of text), **Game Loading Tips**, and the Full requirement "land directly in gameplay, at most 1 click". I found **no** official case study of a game going from Basic to Full Launch. There are only indie devlogs.

### Cited Findings
- Full: "Games should drop new users directly into gameplay", with at most 1 click before gameplay starts. — [Gameplay requirements](https://docs.crazygames.com/requirements/gameplay/)
- Onboarding: new users should land directly in a simple onboarding phase built into gameplay, focused on core functions and skippable. Prefer visuals over text. The game should respond quickly to input. Give clear, reachable goals. Maintain and update the game regularly. — [Quality guidelines](https://docs.crazygames.com/requirements/quality/)
- Loading: load tutorial-critical assets first, start gameplay as soon as the tutorial is playable, and load the rest in the background. Under 100 ms feels instant, 1 s is fine, and at 10 s attention drifts. — [Game Loading Tips](https://docs.crazygames.com/resources/getting-to-the-first-frame/)
- Conversion levers: keep the build small, load content dynamically, and get players into gameplay fast. — [Basic Launch Guide](https://docs.crazygames.com/resources/basic-launch-metrics/)
- Devlog (Numberwire, 2026): players dropped off after about 5 min on average, so the developer streamlined the tutorial to reach the interesting levels sooner. — [Numberwire devlog](https://protermcgoater.itch.io/numberwire/devlog/1645116/crazygames-launch-streamlined-tutorial)
- Devlog (Larss IO): "Play now" led into the tutorial instead of matchmaking; 13 options on the play screen caused bounce. Fixes: a Quick Match button and a minimal tutorial. — [Larss IO devlog](https://fxf8.itch.io/larss-io/devlog/1586849/launching-a-1v1-strategy-game-on-crazygames-04-ctr-and-what-im-learning)
- Puckit (Nov 2024): plans to improve conversion through faster loading (on-demand assets) and a "streamlined gameplay start", playtime through new levels (a winter update with 24 levels), and CTR through a thumbnail revamp. — [Reitgames](https://reitgames.com/news/puckit-100k-gameplay)
- The game must include English. Use the locale from `systemInfo`, with English as the fallback. Physics must stay identical at 144/165 Hz. — [Gameplay requirements](https://docs.crazygames.com/requirements/gameplay/)

### Inferences
- For Roundabout Timing: a new player on CrazyGames should be in the roundabout **within 1–2 s of the start click**, with the tutorial built into the first shift ("tap now" as a ghost hint, no text screen). Every menu tap before the first car costs mobile conversion. The tab bar, progress screen, and changelog dot should only appear after the first shift.
- Playtime (~6 min → 10+): a "one more round" loop after a crash (instant restart without a menu), visible near-goals (next upgrade, next chest), and a short shift → reward → next shift loop. Avoid long reward screens between shifts (matches the project's own "seamless shift transition" rule).
- The 120 Hz fixed timestep already satisfies the 144/165 Hz physics requirement.

### Gaps
- No official CrazyGames case study (blog or GDC) on the jump from Basic to Full found. The PWA blog post is around 6 years old.
- Discord and Reddit summaries were not found in search (the CrazyGames developer Discord is not indexed).

## 7. Benchmarks for successful arcade/casual games

### Takeaway
The only official reference values: **playtime 10+ min, D1 10–15 %, conversion 80 %+, load < 10 s, build < 20 MB**. Real indie values sit well below: Puckit 4:28 min / 73 % conversion (and still about 100k plays), Larss IO 4:19 min / 0.4 % CTR / 2.7 % crash rate on day 2.

### Cited Findings
- Official: 10+ min avg playtime; 10–15 % D1; 80 %+ conversion, < 10 s load, < 20 MB. — [Basic Launch Guide](https://docs.crazygames.com/resources/basic-launch-metrics/)
- Puckit! (puzzle/arcade, Nov 2024): about 100,000 plays, avg playtime 4:28 (Poki: 2:05), conversion 73 %, rating 8.8, a peak of about 23,000 plays per day after the 48 h feature, then about 2,500 per day. — [Reitgames](https://reitgames.com/news/puckit-100k-gameplay)
- Larss IO (2026, Basic Launch day 2): 6,100 impressions, 23 clicks (CTR 0.4 %), 4:19 avg playtime, 2.7 % crash rate. The developer's own targets were CTR 2–4 %, 8+ min, crash < 1 %. — [Larss IO devlog](https://fxf8.itch.io/larss-io/devlog/1586849/launching-a-1v1-strategy-game-on-crazygames-04-ctr-and-what-im-learning)
- The platform has "over 50 million monthly players". — [Game Loading Tips](https://docs.crazygames.com/resources/getting-to-the-first-frame/)

### Inferences
- Roundabout Timing's desktop conversion (66.7 %) and playtime (~6 min) are better than or close to typical indie values. The large gaps are **D1** (1.8 % / 3.85 % vs. 10–15 %) and **mobile conversion** (37 % vs. 80 %). These two metrics most likely hold the missing point.
- CTR of 1.0 % is better than the 0.4 % devlog example but below the "2–4 %" target. Whether CTR scores points at all is open.

### Gaps
- No platform-wide distribution (median or percentiles) per metric, no genre breakdown, no mobile/desktop split. The dashboard's benchmark comparison is the only source, and it is not public.
