# Gameplay Conversion, FTUE, Playtime and Crash Rate for Browser/Portal Games (Mobile Web Focus)

Context: Roundabout Timing on CrazyGames. Mobile conversion 37.40% (target 42.86%), desktop 66.72% (target 69.28%); playtime 5m45s mobile / 6m47s desktop (targets 6m49s / 7m55s); load 2.5s; gameplay crash rate 3.53%.
Research date: 2026-10-08. Note on evidence quality: portal docs (CrazyGames, Poki) are first-party guidance, mostly opinion/best practice; the only hard before/after numbers found are Poki case studies. No source gave per-second drop-off curves for game portals.

## Q1: Why mobile web visitors don't start playing (load, blank screens, orientation, tiny UI, menus, audio, consent, ads)

### Takeaway
Measured portal data shows load time/size is the strongest single driver of conversion-to-play (Stickman Hook: smaller build and faster load moved conversion by +22 to +46 points). Beyond load, portals point to pre-play friction: menus/splash screens, intros, unclear first action, and expectation mismatch with the thumbnail. At 2.5s load, Roundabout Timing is already fast, so the mobile gap (37% vs 67% desktop) is more likely pre-play friction, mobile layout and runtime failures than raw download time.

### Cited Findings
- MEASURED (Poki, 2026 blog): Stickman Hook WebGL port was 40 MB with median load 29.5 s and 50% conversion to play; Madbox's HTML5 rebuild at 6 MB loaded in a median 3.7 s and converted 72%, giving "22% more plays". — [Poki blog, 16 May 2026](https://poki.com/blog/what-makes-high-quality-browser-game)
- MEASURED but CONFLICTING (Poki talk, 2022): the same Stickman Hook rebuild (Unity to native JS with Pixi.js) is reported as 35% to 81% conversion (~460 more players per 1,000). Figures conflict with the 2026 blog (50% to 72%); direction agrees. — [Kasper Mol, "Conversion to Play: The Art of Loading", JS GameDev Summit 2022](https://gitnation.com/contents/conversion-to-play-the-art-of-loading)
- Same talk: some games saw only ~20% of interested visitors go on to play; Apple Knights improved by loading assets later via asset bundles, removing large third-party libraries and cutting unnecessary menu screens (the talk's reported numbers for Apple Knights are internally inconsistent, so only the tactics are usable). — [GitNation talk page](https://gitnation.com/contents/conversion-to-play-the-art-of-loading)
- Poki loading recommendations: size under 5 MB "excellent", under 10 MB "good"; compress assets, mono audio, sprite sheets, bitmap/subset fonts; stream music so it doesn't block start; load on demand per level; engaging loading screen with key art and controls; test on slow machines and throttled networks; minimise splash screens and menus, make the play button obvious, drop first-time users straight into gameplay or tutorial. — [GitNation talk page](https://gitnation.com/contents/conversion-to-play-the-art-of-loading)
- CrazyGames defines its launch "Conversion" KPI as the share of players who play at least one minute after starting; top titles "80%+", load "under 10 seconds", build "below 20 MB". Tips: load first level first and the rest in background; cut intros so players are in gameplay within seconds. Low conversion "can point to slow loading or confusing onboarding." — [CrazyGames docs, Basic Launch metrics](https://docs.crazygames.com/resources/basic-launch-metrics/)
- Note: this means a player who starts but quits before 60 s counts as non-converted under that definition, so a confusing or frustrating first minute (not just loading) lowers the metric. (Whether the dashboard's "gameplay conversion" uses exactly this definition was not confirmed.) — [CrazyGames docs, Basic Launch metrics](https://docs.crazygames.com/resources/basic-launch-metrics/)
- CrazyGames technical requirements: initial download ≤ 50 MB, ≤ 20 MB for mobile homepage eligibility; with the SDK, initial download is measured until the first `gameplayStart` event; externally loaded files judged by time-to-gameplay ≤ 20 s. — [CrazyGames technical requirements](https://docs.crazygames.com/requirements/technical)
- Orientation: CrazyGames enforces the orientations declared at submission by asking users to rotate; portrait games are allowed with black bars or background images; desktop must be playable in landscape; mobile games must work in the CrazyGames app's fullscreen mode and respect safe areas; add `user-select: none` on body to prevent magnifier/selection menus on tablets. — [CrazyGames technical requirements](https://docs.crazygames.com/requirements/technical)
- Consent: if the game collects personal data beyond SDK events, CrazyGames prefers "a simple notice" over a blocking pop-up. — [CrazyGames technical requirements](https://docs.crazygames.com/requirements/technical)
- Poki: thumbnails don't directly drive conversion to play, but a mismatch between thumbnail and game causes some players to drop off before gameplay; C2P depends mostly on loading time, file size, responsiveness and the pre-play experience. On mobile, the thumbnail appears again after the click and before the game starts. — [Poki developer guide, game thumbnail](https://developers.poki.com/guide/game-thumbnail)
- Poki: UI should be big and readable on mobile and desktop; games must work from 16:9 desktop to portrait mobile; forced adverts frustrate players and cause them to leave. — [Poki blog, 2026](https://poki.com/blog/what-makes-high-quality-browser-game)
- Defold (engine vendor, targeting Poki): targets < 20 MB, 65%+ C2P; avoid very small UI elements; support portrait (mobile) and landscape (desktop). — [Defold Poki SDK best practices](https://defold.com/extension-poki-sdk/best-practices)
- General web (not games, 2017 data): Google reports bounce probability increases 32% as mobile page load goes from 1 s to 3 s (relative increase); a 90% increase from 1 s to 5 s and 123% up to 10 s is relayed by third parties from the same Google/SOASTA study. The widely quoted "53% leave after 3 s" has conflicting attributions (Google vs Akamai) and could not be verified. — [Think with Google](https://thinkwithgoogle.com/data/page-load-time-statistics); [Thrive Agency relay](https://thriveagency.com/news/test-websites-speed-matters/)

### Inferences
- At 2.5 s average load the game is already in the "good" band; additional size cutting may yield little. The mobile vs desktop gap (~29 points) points to mobile-specific friction: anything shown before the first tap-to-play (menus, tab bar, "tap to start", audio unlock, name prompts, install/PWA banners, patch-notes dots), plus mobile-only runtime failures (storage, audio, memory) that end sessions early.
- Since CrazyGames counts conversion as ≥ 1 minute of play, a first run that ends in a crash within 20-40 s (a timing game where a novice collides quickly) and then sends the player to a results/menu screen likely counts as a lost conversion. Making the first minute continuous (instant auto-restart into play, no results screen on early fails) should directly lift the metric.
- The Progress · Game · Shop · Build tab bar is a menu layer; for first-time visitors from a portal, booting directly into a live roundabout (no tab bar visible until the first run ends) matches portal guidance.
- In a portrait game shown in a landscape-ish iframe on mobile, the playfield may be letterboxed and small; verify actual rendered size in the CrazyGames mobile page and the app's fullscreen mode.
- Under SDK integration, call `gameplayStart` only when real play begins (it also defines "initial download"); lazy-load audio samples and music stems after `gameplayStart`.

### Gaps
- No public per-second drop-off curve for game portals was found; only the Poki before/after case and 2017 general-web Google data.
- Could not confirm whether CrazyGames' dashboard "gameplay conversion" equals the launch-KPI definition (≥ 1 minute) or a "started gameplay" event; check the developer portal tooltip.
- No measured data on the effect of audio-unlock prompts, consent popups or orientation prompts on conversion.

## Q2: FTUE best practices for hyper-casual / one-tap games

### Takeaway
Consistent guidance across Poki, CrazyGames and mobile publishers: land players directly in gameplay, teach through the first level rather than text, keep it skippable, show the core mechanic and a reward moment as early as possible, and aim for fun within ~10 seconds. Evidence is mostly practitioner guidance; measured FTUE gains come from vendor case studies.

### Cited Findings
- CrazyGames quality guidelines: new users should land directly in a simple onboarding phase built into gameplay and skippable; focus on core functionality, visuals over text; show controls via overlay or gestures; no button delays meant to confuse; clear, reachable goals; easy to learn. — [CrazyGames quality guidelines](https://docs.crazygames.com/requirements/quality/)
- CrazyGames full implementation must land players directly in gameplay. — [CrazyGames requirements intro](https://docs.crazygames.com/requirements/intro/) (as summarised in search results; not fetched in full)
- Poki example: Drive Mad starts immediately, keeps action centred regardless of aspect ratio, uses transparent arrows to show controls, and its first levels teach the core loop. — [Poki blog, 2026](https://poki.com/blog/what-makes-high-quality-browser-game)
- Poki: "satisfying click feedback matters more than animation" (Jump Only: light trail and jump debris). — [Poki blog, 2026](https://poki.com/blog/what-makes-high-quality-browser-game)
- Defold: "Can the player start having fun within ten seconds?"; avoid long intros, dialogue-heavy tutorials, complex menus and slow unlock systems; keep interaction continuous with clear goals and fast feedback. — [Defold Poki best practices](https://defold.com/extension-poki-sdk/best-practices)
- Supersonic (publisher): showcase the core mechanic as fast as possible; celebration and rewards at key moments early improve stickiness. — [Supersonic, Optimizing FTUE](https://supersonic.com/learn/blog/optimizing-ftue/)
- Voodoo (statement): hyper-casual players should understand how the game works within a few seconds of play. — [ExchangeWire Q&A with Voodoo, 2020](https://www.exchangewire.com/blog/2020/11/26/challenges-opportunities-and-partnering-with-ogury-qa-with-david-ribeiro-voodoo/)
- Vendor case study (self-reported): Voodoo's Plantopia reshaped its FTUE to give a sense of progression earlier; D1 retention reportedly +14 points. — [Solsten case](https://solsten.io/cases/deep-insights-soaring-retention)
- Liquid & Grit analysis of 26 casual/core/casino apps: successful FTUEs get players playing as quickly as possible. — [Liquid & Grit FTUE Toolkit](https://liquidandgrit.com/first-time-user-experience-ftue-toolkit)
- Academic: an FTUE improved information quality, but overall usability was unaffected by its presence; onboarding does not fix a weak core loop. — [Bournemouth University study](https://eprints.bournemouth.ac.uk/32321/1/ftue240418.pdf)
- Poki recommends playtest video recordings to check whether players understand what to do. — [Poki blog, 2026](https://poki.com/blog/what-makes-high-quality-browser-game)

### Inferences
- For a one-tap timing game: first frame should already show a moving roundabout with a pulsing hand/tap hint over the playfield; the first tap should succeed (wide timing window or slowed traffic in run 1) to deliver a reward moment in under 10 s.
- The first run should be designed to be won or to last past 60 s (supports the CrazyGames ≥ 1 min conversion definition).
- Delay all meta (chests, casino, shop, career explanations) until after the first successful run.

### Gaps
- No primary Voodoo or Poki document with measured FTUE numbers (e.g. hand-pointer vs text tutorial A/B) was found.
- "First run designed to be won" is a widespread practitioner claim; no measured source found in this pass.

## Q3: Extending session length in a one-tap arcade game without hurting fun

### Takeaway
Portal guidance for playtime centres on a rewarding core loop, clear next goals, gradual introduction of mechanics and a fair difficulty curve; rewarded ads work best as revive/second chance. Measured evidence is thin: near-misses create the strongest urge to continue (lab study), and industry session-length benchmarks put 7-8 min at top-quartile mobile games.

### Cited Findings
- CrazyGames: "Average play time" = time per session; successful titles often 10+ minutes. Tips: rewarding core loop, clear goals so players always know the next step, introduce mechanics gradually, challenging-but-fair difficulty curve. D1 retention tips: progression (levels, unlocks, upgrades), daily hooks, save progress, fix bugs. — [CrazyGames Basic Launch metrics](https://docs.crazygames.com/resources/basic-launch-metrics/)
- Defold: average playtime target 5+ min; 7-10+ min "very strong"; rewarded ads work best as a second chance, revive, optional reward or bonus attempt; heavy monetisation layers and complex store systems add friction. — [Defold Poki best practices](https://defold.com/extension-poki-sdk/best-practices)
- Poki: optimise core loops for short sessions; non-intrusive monetisation, rewarded video preferred; originality via trend-inspired modes (Sprint League expanded a mechanic into several modes). — [Poki blog, 2026](https://poki.com/blog/what-makes-high-quality-browser-game)
- MEASURED (lab, n = 60 Candy Crush players): near-misses were rated the most frustrating outcome but triggered the strongest urge to continue playing. — [University of Waterloo thesis](https://uwspace.uwaterloo.ca/handle/10012/12522)
- MEASURED (GameAnalytics H1 2019, mobile apps): average session length median 4-5 min, top 25% 7-8 min; ASL fell ~30 s year-on-year, a shift to bite-sized play. — [PocketGamer.biz summary](https://www.pocketgamer.biz/five-key-takeaways-gameanalytics-h1-2019-mobile-benchmark-report/)
- CrazyGames quality guidelines: avoid overly repetitive or "boring" tasks; challenge balanced and well-paced. — [CrazyGames quality guidelines](https://docs.crazygames.com/requirements/quality/)

### Inferences
- Instant restart (one tap, no results screen gate), a visible "you were X% to the next level / record" bar on failure, and near-miss feedback ("0.1 s from a crash") fit the evidence.
- A rewarded "continue" after a crash (once per run) is the ad placement portal guidance favours and extends sessions; on CrazyGames this must go through their SDK.
- Short per-session goals (3 missions) and rotating events/bosses give a "next step" without menus; the existing career levels, weather and bosses already provide variety, so surfacing the next unlock at the moment of failure is likely the cheapest lever.
- Mobile playtime trailing desktop by ~1 min may partly come from mobile crashes/errors and background interruptions (see Q5) rather than design.

### Gaps
- No measured A/B data on rewarded-continue or mission systems in web portal games was found.
- No benchmark specifically for web portal one-tap arcade session length.

## Q4: Mobile web performance (bundle, audio, DPR, battery, memory)

### Takeaway
Keep the initial download small and load audio/music after play starts; render at DPR 1 on iOS and low-memory Android (CrazyGames already forces this for its own handling); resume AudioContext inside a user gesture, including after iOS interruptions.

### Cited Findings
- CrazyGames: DPR 1 on iOS and low-memory Android, `window.devicePixelRatio` elsewhere (overridable). Games disabled on Chromium OS if not smooth on a 4 GB RAM device. Unity games disabled on iOS by default due to "frequent crashes" from memory shortage. — [CrazyGames technical requirements](https://docs.crazygames.com/requirements/technical)
- CrazyGames audio: iOS puts AudioContext into "interrupted" when backgrounded or interrupted by system events; Android keeps it "running" but silent. Fix: call `resume()` inside a user gesture (`touchend`/`click`); a visibilitychange listener alone is insufficient. — [CrazyGames technical requirements](https://docs.crazygames.com/requirements/technical)
- Autoplay: an AudioContext created outside a user gesture starts suspended; resume on click. Chrome lifts the restriction when `resume()` or `source.start()` is called upon user activation. — [MDN Web Audio best practices (zh-CN mirror)](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Audio_API/Best_practices); [Chromium autoplay policy](https://www.chromium.org/audio-video/autoplay)
- Poki: stream music, mono audio, compress assets, load on demand, test with throttled connection and slow hardware. — [GitNation talk](https://gitnation.com/contents/conversion-to-play-the-art-of-loading)
- iOS Safari caps total canvas backing-store memory (reported 224 MB to 384 MB+, device/version dependent); unreferenced canvases are not freed promptly; once over budget, `getContext` returns null. Workarounds: set unused canvases to 1x1, reuse a small pool, avoid creating many offscreen canvases. — [PQINA blog](https://www.pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit/); [WebKit bug 195325](https://bugs.webkit.org/show_bug.cgi?id=195325); [Apple forum](https://developer.apple.com/forums/thread/687866)

### Inferences
- Treat the first tap (the one that starts play) as the audio unlock; never show a separate "enable sound" prompt.
- Cap the render DPR (e.g. 2 max, 1 on low-memory devices via `navigator.deviceMemory` where available) to reduce fill cost, heat and canvas memory; offscreen caches (sprite pre-renders, glow layers) count against iOS canvas memory.
- Decode music stems lazily after `gameplayStart`; decoded PCM in AudioBuffers is large (uncompressed) and contributes to memory pressure in iframes on low-end Android.

### Gaps
- No game-specific Lighthouse/INP guidance found; INP is a page-interaction metric, not designed for canvas games.
- No measured data on battery/thermal throttling effects on session length.

## Q5: Common crash/error sources in HTML5 games inside portal iframes and defensive handling

### Takeaway
The recurrent iframe-specific failures are storage access throwing (Safari partitioning, blocked third-party storage, private mode), suspended/interrupted AudioContext, iOS canvas memory limits, and APIs that require a secure context. All are survivable if every access is guarded and the game degrades instead of throwing.

### Cited Findings
- Safari partitions third-party iframe storage strictly by top-level domain; embedded games can see "DOMException: The operation is insecure" when touching localStorage; an itch.io developer fixed it by catching the exception and continuing without saving. — [Apple developer forum](https://developer.apple.com/forums/thread/722784); [itch.io thread](https://itch.io/post/16684446); [Chrome storage partitioning](https://privacysandbox.google.com/cookies/storage-partitioning)
- A 2017 WebKit comment says partitioned localStorage was not persisted (behaved like sessionStorage); may have changed. — [WHATWG issue 3338 / WebKit discussion](https://github.com/whatwg/html/issues/3338)
- CrazyGames full integration requires its SDK `Data` module for saving progress where applicable (sidesteps iframe storage partitioning). — [CrazyGames technical requirements](https://docs.crazygames.com/requirements/technical)
- `crypto.subtle` exists only in secure contexts; reading `.digest` off undefined throws and can stop all JS; guard with `window.isSecureContext`. `getRandomValues()` works in insecure contexts. — [MDN Crypto.subtle (mirror)](https://ligm.univ-eiffel.fr/~forax/MDN/developer.mozilla.org/en-US/docs/Web/API/Crypto/subtle.html); [hydrogen-web fix commit](https://git.batsense.net/mystiq/hydrogen-web/commit/0935f2d23aebccf3bb1bdd7974189dde4c8fc2bc)
- iOS AudioContext "interrupted" state after backgrounding; must resume in a gesture. — [CrazyGames technical requirements](https://docs.crazygames.com/requirements/technical)
- iOS canvas memory cap, `getContext` returning null when exceeded. — [PQINA blog](https://www.pqina.nl/blog/total-canvas-memory-use-exceeds-the-maximum-limit/)
- Poki's release process monitors conversion to play, pre-play time, error reports and bug reports, limiting early tests to small audiences to catch technical problems. — [Poki release process](https://sdk.poki.com/releaseprocess) (from search summary)

### Inferences
- Relevant to Roundabout Timing specifically: the sealed save uses an HMAC (`storage/seal.ts`); if it uses `crypto.subtle`, it will throw where `subtle` is unavailable, and any async rejection there can count as a gameplay error. Guard and fall back (e.g. a sync JS HMAC or skip sealing).
- All `localStorage` reads/writes (save, settings, analytics flags) should be wrapped; a `QuotaExceededError` or `SecurityError` should never propagate to the game loop.
- On CrazyGames, net features (PeerJS/WebRTC, leaderboard fetch, Umami is already off there) should be lazy and fully optional; WebRTC in iframes may require permissions policies and fails on restrictive networks, so any rejection must be caught.
- A global `error`/`unhandledrejection` audit (log locally which errors fire on mobile Safari in an iframe) is the practical way to attribute the 3.53% crash rate.

### Gaps
- No source found defining exactly what CrazyGames counts in "gameplay crash rate" (uncaught JS errors? unhandled rejections? page freezes?).
- No dedicated sources found in this pass on WebRTC failures inside portal iframes or on OOM rates on low-end Android; inferences above are unsourced reasoning.

## Q6: What makes portal thumbnails/titles get clicked (CTR)

### Takeaway
Both portals ask for a bright, high-contrast, simple cover with one hero subject in a dynamic pose, no clutter, no borders, and not a raw screenshot. They differ on text: Poki says no text (its tests favour text-free), CrazyGames wants the game's title on the cover and no other text. No public A/B numbers were found.

### Cited Findings
- Poki: CTR = share of players who click after seeing the game; one clear foreground object on a clean background; main character in default skin; dynamic pose; strong contrast; check legibility at small sizes; full-bleed square ≥ 628x628; no text ("Poki's own tests show players prefer text-free thumbnails"); no borders, collage or misleading art; avoid colours close to the site background #83FFE7. — [Poki developer guide, game thumbnail](https://developers.poki.com/guide/game-thumbnail)
- Poki: bright, colourful 2D/3D assets tend to earn more plays; muted palettes, pixel art or dark colours have a harder time standing out; unpolished visuals may not get clicked at all. — [Poki blog, 2026](https://poki.com/blog/what-makes-high-quality-browser-game)
- CrazyGames: covers must grab attention "in a fraction of a second"; three sizes (16:9 1920x1080, 2:3 800x1200, 1:1 800x800) with consistent visuals; don't just screenshot; use main character, large stylised title or evocative graphic; include the game's name; no other text ("New", "Play Now"), no borders, icons or store logos; keep it clean and readable on small screens; refresh occasionally (developers have seen session spikes after updating covers). Hover preview video 15-20 s, no sound, starts with the static cover frame, show most exciting moments. — [CrazyGames game covers](https://docs.crazygames.com/requirements/game-covers/)
- Conflict: Poki says no title text; CrazyGames says include the game's name. — [Poki](https://developers.poki.com/guide/game-thumbnail); [CrazyGames](https://docs.crazygames.com/requirements/game-covers/)

### Inferences
- For Roundabout Timing: a close-up of 2-3 cars about to collide at a roundabout entry (tension = clear action), saturated colours, one large stylised title on CrazyGames covers, especially the 2:3 portrait cover used on mobile.
- Since the thumbnail re-appears on mobile before game start (Poki) and mismatch hurts conversion, the cover should match the actual game look.

### Gaps
- No public A/B test results with numbers for portal thumbnails were found; a "40% CTR increase" Roblox claim surfaced only on an unverifiable site and was excluded.
- No CrazyGames CTR benchmark found.
