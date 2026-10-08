# Growth, Retention and Returning Users Across All Channels (Roundabout Timing)

Scope note: research done 2026-10-08 with ~17 web searches/fetches. Most hard numbers in this space come from vendors, portals' own marketing or single-developer anecdotes; that is flagged per finding. "Measured" = a number with a stated origin; "anecdote/vendor" = unverified or promotional. Everything without a URL is in Inferences or Gaps.

## 1. Other web portals and platforms: which fit a one-tap game, what they require, what traffic they deliver

### Takeaway
Poki is the biggest prize but is hand-curated, tests the game on real players before accepting it, and prefers 5-year web-exclusive deals (which would collide with RAT's existing CrazyGames listing and own-site focus). The non-exclusive syndication portals (GameDistribution, GamePix, Y8) are cheap to add but pay 33–50% and publish no traffic figures; itch.io/Newgrounds are community sites that bring small, engaged audiences rather than volume. Discord Activities and YouTube Playables are the most interesting "new" surfaces for a one-tap, social, short-session game, but both need a platform SDK and replace localStorage/network assumptions.

### Cited Findings
**Poki**
- Official requirements: must work on desktop, mobile and tablet; on mobile fill the screen in portrait or landscape; scale to cover a 16:9 canvas (640x360, 836x470 or 1031x580); must work in incognito (wrap localStorage in try/catch); Poki blocks all external requests from games by default; free "Poki Inspector" tool checks requirements — [Poki SDK requirements](https://sdk.poki.com/requirements); [Poki new requirements](https://sdk.poki.com/new-requirements)
- Submission: upload to Poki for Developers, submission form, human curation ("hand-curated playground"); accepted games pass a Player Fit Test, a Web Fit Test and a final review (stage details from a third-party guide, not confirmed on Poki pages) — [Cinevva: How to Get Your Game on Poki (2026)](https://app.cinevva.com/guides/publish-game-poki)
- Poki prefers web-exclusive deals, 5 years by default; Discord and YouTube Playables count as "web" under that exclusivity (third-party guide) — [Cinevva Poki guide](https://app.cinevva.com/guides/publish-game-poki); deal terms page: [sdk.poki.com/deals](https://sdk.poki.com/deals)
- Player Fit Test pass bar "about 25% of ~500 players staying 3+ minutes" is one developer's account, not official (anecdote) — [Cinevva Poki guide](https://app.cinevva.com/guides/publish-game-poki)
- 8 MB initial download limit appears only in a third-party guide; Web Fit Test length reported as 5–7 days vs 3–5 days by different guides (conflict) — [Cinevva Poki guide](https://app.cinevva.com/guides/publish-game-poki); [Chinese version](https://app.cinevva.com/zh-CN/guides/publish-game-poki)
- Revenue: developers keep 50% of revenue from players Poki brings and 100% from players the developer brings via own marketing (secondary source) — [Cinevva web game monetization](https://app.cinevva.com/guides/web-game-monetization); [tech-insider comparison](https://tech-insider.org/crazygames-vs-poki-vs-coolmath-games-2026/)
- Scale (secondary/marketing): Poki 2025 figures reported as 625M players, 11.1B gameplays, 227 new releases, 1,018 games over 1M plays; another report says 100M+ monthly players — [tech-insider](https://tech-insider.org/crazygames-vs-poki-vs-coolmath-games-2026/); [GitHub HTML5 opportunity report](https://github.com/pocketagent98-ai/html5-game-opportunity-report)
- Case study (Poki-published, promotional): Emolingo Games — all eight games on Poki passed 10M plays, ~800,000 gameplays/day across the portfolio, no revenue given — [Poki blog](https://poki.com/blog/how-emolingo-games-built-business-html5-web-games-poki)

**CrazyGames (context for comparison)**
- CrazyGames reports 50M+ monthly players / 300M+ monthly gameplays per one guide; older source says 35M (conflicting) — [GitHub opportunity report](https://github.com/pocketagent98-ai/html5-game-opportunity-report); [CrazyGames Developer Portal](https://developer.crazygames.com/)
- Old (≈2018) measured breakdown: 8 WebGL games, 451,327 CrazyGames plays earned €556.92 (≈€1.2 per 1,000 plays) — summarized in [indiegamebusiness.com](https://indiegamebusiness.com/web-gaming-for-indie-developers/) / [hology.app](https://hology.app/blog/web-gaming-1)
- CrazyGames analysis of 1.74B US sessions: weekday web-game traffic 22% higher than weekends — cited via [applixir guide](https://www.applixir.com/blog/maximizing-visibility-revenue-a-guide-for-browser-based-games/)
- Guide estimate: a well-performing casual game on Poki/CrazyGames clears roughly $200–$2,000/month in ad share (estimate, not measured) — [Cinevva monetization](https://app.cinevva.com/guides/web-game-monetization)

**Syndication portals (non-exclusive)**
- GameDistribution: three-way split (publisher / developer / GameDistribution), i.e. ~33% to the developer; payout after EUR 100 (third-party guide + GD FAQ agree roughly); claims syndication to 4,000+ portals reaching 350M monthly users (vendor-adjacent reach claim, not measured traffic) — [GameDistribution FAQ](https://gamedistribution.com/publishers/faq/general-questions/how-do-gamedistribution's-publishers-benefit-from-publishing-games/); [Cinevva monetization](https://app.cinevva.com/guides/web-game-monetization)
- GamePix: 45% revenue share, per-game RPM dashboard — [GamePix developers](https://partners.gamepix.com/developers)
- Y8: 50/50 revenue share; AFP partnership (paid via own AdSense) only after the first game is approved — [Y8 revshare](https://www.y8.com/revshare); [Y8 upload](https://www.y8.com/upload); [dev.to Y8 SDK guide](https://dev.to/mohamed_gani_y8/how-to-submit-your-game-to-y8com-and-integrate-the-y8-sdk-39bn)
- Newgrounds: share of an ad pool, payout over $50; an older developer review: ad revenue is "complete nonsense for a small creator" — [Lexaloffle BBS thread](https://www.lexaloffle.com/bbs/?tid=30237); [Cinevva monetization](https://app.cinevva.com/guides/web-game-monetization)
- itch.io: storefront, developer chooses the platform cut 0–100% (default 10%); SimilarWeb estimate 34.3M visits/3 months vs Newgrounds 12.7M (third-party estimates) — [SimilarWeb itch.io vs newgrounds](https://www.similarweb.com/website/itch.io/vs/newgrounds.com/); [Cinevva itch.io launch guide](https://app.cinevva.com/guides/itch-io-launch-guide)
- itch.io anecdote: one dev's first ~1,250 views (from r/freegamefindings) were unengaged (~10% browser plays, <0.1% rated); after shifting channels, ~40% browser plays and ~4.5% raters — [itch.io forum: is 1000 views on a browser game good](https://itch.io/t/3698396/is-1000-views-on-a-broswer-game-good)

**Discord Activities**
- Activities are web apps in an iframe in the Discord client (Embedded App SDK, announced GDC 2024); opened to all developers; supports in-app purchases — [GameFromScratch](https://gamefromscratch.com/discord-launch-game-development-sdk/); [Discord blog: Build where the world plays](https://discord.com/blog/build-where-the-world-plays); [GamesBeat](https://gamesbeat.com/discord-opens-activities-in-app-games-and-features-to-all-developers/)
- Outside network calls need "URL Mappings" configured in the developer portal (sandbox) — [Colyseus blog](https://colyseus.io/blog/discord-embedded-sdk/)
- Activities run in variable-size panels and on mobile; touch is mandatory (blog guide) — [Strayspark guide](https://www.strayspark.studio/blog/discord-activities-embedded-app-sdk-indie-game-distribution-2026)
- Unverified third-party figures: Death by AI peaked ~700K DAU / ~7M players within weeks; Chef Showdown 14M+ players — [Cinevva Discord guide](https://app.cinevva.com/guides/publish-game-discord-activities)

**YouTube Playables**
- Entry via submission form; SDK, test suite and certification requirements only after onboarding; must pass review (APIs, Trust & Safety, privacy); not made for kids, audience 13+; all IP/music cleared — [Google: Playables certification requirements](https://developers.google.com/youtube/gaming/playables/certification/requirements); [Trust & Safety](https://developers.google.com/youtube/gaming/playables/certification/requirements_trustsafety)
- Third-party (FRVR) technical rules: call gameReady only when interactive; pause/resume through platform hooks, not Page Visibility API; save through SDK storage — direct localStorage/cookies/IndexedDB is a rejection; cloud save < 3 MiB; no studio logos in thumbnails — [FRVR docs: YouTube channel](https://docs.frvr.com/requirements/channels/youtube/)

**Facebook Instant Games / Telegram**
- Meta (July 2025): Instant Games SDK v8.0 with "Zero Permissions"; all Instant and Web Games must migrate; Web Games sunset by 30 Sep 2026 — [Meta developer blog](https://developers.facebook.com/blog/post/2025/07/31/web-and-instant-games-changes/)
- Telegram mini games: HTML5 in-chat via Bot API/Web Apps; discovery is social (shared links, bots like @gamebot); Stars purchases (vendor coverage) — [TON docs: What are Mini Apps](https://docs.ton.org/v3/guidelines/dapps/tma/overview); [PSU](https://www.psu.com/news/all-you-need-to-know-about-telegram-mini-games/)

### Inferences
- **Poki vs. current setup is a strategic fork, not an add-on.** A 5-year web-exclusive deal (if it is the default, as the third-party guide says) would likely require leaving CrazyGames and possibly itch.io/Discord/Playables; whether Poki accepts a game that also lives on its own domain (timing.love) with its own PWA needs to be asked directly. Poki's "100% of revenue for players you bring" model suggests they tolerate own-site traffic.
- **Poki technical fit is good but not free:** RAT is portrait-first; Poki wants a 16:9 canvas on desktop. RAT's server features (leaderboard, friend codes, TURN, challenge links) conflict with "external requests blocked by default" — would need whitelisting or a reduced build. Sealed localStorage must survive incognito.
- **CrazyGames' Basic Launch metrics (CTR 1%, D1 2–4%) would very likely fail a Poki Player Fit Test** if the bar really is ~25% of players at 3+ minutes; fix first-minute retention (thumbnail, instant start, first 60 s) before applying anywhere curated.
- **Syndication (GameDistribution/GamePix/Y8)** = more plays, little money, little control, no relationship with players; returning players rarely come back to timing.love from there. Low priority for a game whose goal is retention + own community, unless the aim is raw play counts.
- **Discord Activity is the best structural fit** among new surfaces: RAT already has multiplayer, friend codes and async challenges; Discord's social graph does the "invite a friend" step natively. Cost: SDK, URL mappings for the API/TURN server, panel-size scaling.
- **YouTube Playables** fits a one-tap, instant, short-session game well, but requires an SDK save adapter (no localStorage), onboarding via partner managers, and possibly conflicts with a Poki exclusive.
- **Facebook Instant Games: skip** (shrinking, forced migration). **Telegram: low fit** (audience skews crypto/tap-to-earn; English-only is fine but discovery is chat-driven).
- **itch.io: cheap, do it** (link back to timing.love, devlog posts on itch double as content). Newgrounds similar, small.

### Gaps
- No public per-game Poki/CrazyGames/GameDistribution traffic or revenue postmortem from 2023–2026 found; Poki fit-test thresholds are not officially published.
- Armor Games and GamePix/Y8 traffic delivered to a typical new game: no data found.
- Whether Poki's exclusivity tolerates an existing CrazyGames listing or the developer's own site/PWA/TWA: not confirmed in official docs.
- Discord Activity discovery mechanics (is there an organic Activity shelf for small indies?) and real indie results: only unverified figures.

## 2. Google Play TWA: ASO, ratings prompts, notifications, Play Games Services

### Takeaway
The icon is the highest-leverage store-listing test; Play Console Store Listing Experiments cover icon, feature graphic, screenshots and descriptions on organic traffic only. A TWA can show web push as native Android notifications via notification delegation, and the Bubblewrap output is a normal Android project, so the native Play In-App Review API can be added in the wrapper (not officially documented for TWA).

### Cited Findings
- Store Listing Experiments: test up to 3 variant icons, plus feature graphic, screenshots, short/long description; test one element at a time; only organic store traffic is in the test pool (custom listings and paid excluded); guides cite a 7-day minimum — [AppDrift guide](https://appdrift.co/guides/google-play-console/store-listing-experiments); [Sonar: what to test](https://trysonar.app/blog/play-store-listing-experiments-what-to-test)
- Icon changes reportedly give the largest median conversion swing (20–30%) vs 5–10% for description changes — attributed to Play Academy but unverified — [Sonar](https://trysonar.app/blog/play-store-listing-experiments-what-to-test)
- Measured vendor case: a casual game (Spin the Bottle, Ciliz) +19% conversion after icon A/B test (SplitMetrics, not Play native) — [SplitMetrics case](https://splitmetrics.com/cases/ciliz-improves-conversion-with-splitmetrics-agency/)
- Google case study (non-game): Splendid Apps, icon/screenshot tests per country, +20% visitors / +9% revenue — [Play Console case study](https://play.google.com/console/about/splendid-casestudy/)
- Benchmark rule of thumb: ~20% store-listing conversion for organic games traffic is "good" (guide, not measured) — [tms-outsource](https://tms-outsource.com/blog/posts/google-play-store-listing-experiments/)
- TWA notification delegation: when the browser (provider) gets a notification for a scope linked to a TWA client app, it forwards it to the app's `TrustedWebActivityService`, which shows it under the app's identity and notification permission; manifest entry + small icon needed — [AndroidX TrustedWebActivityService](https://developer.android.com/reference/androidx/browser/trusted/TrustedWebActivityService)
- TWAs (unlike WebViews) support web push, background sync, autofill — [Chrome TWA overview](https://developer.chrome.com/docs/android/trusted-web-activity/overview?hl=es)
- Android 13+: `POST_NOTIFICATIONS` is a runtime permission; declaring it is not enough, the app must request it; denial blocks all channels — [Android 13 notification permission](https://developer.android.com/about/versions/13/changes/notification-permission?hl=de); [OneSignal Android 13 guide](https://documentation.onesignal.com/release-notes/android-13-push-notification-developer-update-guide)
- In-app review: a JS library "review-my-twa" shows a web-based review nudge in TWAs (not the native API); Bubblewrap generates a native Android project that can be opened in Android Studio — [review-my-twa README](https://unpkg.com/review-my-twa@1.1.0/README.md); [Vaadin Bubblewrap guide](https://vaadin.com/blog/submitting-a-pwa-to-google-play-store-using-bubblewrap)

### Inferences
- **Priority ASO actions for RAT:** (1) icon A/B test first (one roundabout + one car, high contrast, readable at 48 px); (2) screenshots that show the crash physics and the one-tap verb with 3–5 words of caption; first two screenshots carry most of the weight; (3) short description with the core keywords ("roundabout", "traffic", "timing", "one tap", "car"). Run one experiment at a time, 7+ days.
- **Ratings:** wire the native Play In-App Review API into the Bubblewrap project and trigger it from the web side via a URL/intent bridge only after a positive moment (new best level, chest opened) — not after a crash. Re-check after every Bubblewrap regenerate. The web-only fallback (review-my-twa) just links to the store.
- **Notifications on Android:** web push from timing.love + notification delegation gives native-looking notifications in the Play app with no separate push stack; on Android 13+ the permission prompt must be triggered contextually.
- **Play Games Services**: low relevance — native SDK, not reachable from a TWA without wrapper code; RAT already has its own leaderboards. Skip.

### Gaps
- No official Google doc found confirming how Chrome handles the Android 13 `POST_NOTIFICATIONS` prompt for delegated TWA notifications (does Chrome prompt for the TWA app, or must the wrapper request it?). Must be tested on a device / android-browser-helper source.
- No official documentation of the Play In-App Review API within a TWA.
- No game-category store-listing-experiment dataset from Google.

## 3. Web push notifications for PWAs (incl. iOS 16.4+)

### Takeaway
Web push works on Android/desktop browsers and, since iOS 16.4, only for PWAs added to the Home Screen; reachable iOS audience is therefore tiny. Grant rates for cold prompts are low (Chrome telemetry: 10% desktop, 21% Android), and Chrome punishes low-acceptance sites with the quiet UI — so the only sensible pattern is a contextual, value-specific pre-prompt after the player has seen the benefit (e.g. "chest ready").

### Cited Findings
- Safari supports web push for Home Screen web apps since iOS/iPadOS 16.4 — [Gravitec](https://gravitec.net/blog/15-must-know-web-push-notification-statistics/); [MobiLoud PWA push](https://www.mobiloud.com/blog/pwa-push-notifications/)
- iOS PWA: only ~16% of mobile users accept web push when prompted vs 40–70% for native (vendor, untraced); reachable PWA push audience estimated 10–15x smaller than native because most iOS users never install to Home Screen (vendor estimate) — [MobiLoud](https://www.mobiloud.com/blog/pwa-push-notifications/); [MobiLoud PWAs on iOS](https://www.mobiloud.com/blog/progressive-web-apps-ios/)
- Native comparison: average iOS opt-in 56.36% across 600+ apps (Pushwoosh 2025) — [Pushwoosh](https://www.pushwoosh.com/blog/ios-push-notifications/)
- Web push opt-in benchmarks: up to 5% for e-commerce, 6–8% for media sites in the first three months, then declining (vendor) — [Gravitec](https://gravitec.net/blog/15-must-know-web-push-notification-statistics/); timing/how of the prompt makes the gap between 3% and 12% (vendor) — [PushEngage](https://www.pushengage.com/web-push-notifications/)
- **Measured (Google research):** Chrome telemetry showed notification prompts granted 10% on desktop and 21% on Android — [Google Research: "Shhh...be Quiet!"](https://research.google/pubs/shhhbe-quiet-reducing-the-unwanted-interruptions-of-notification-permission-prompts-on-chrome/)
- Chrome (since Chrome 80) auto-enrolls sites with very low acceptance rates into the quieter permission UI; recommends not prompting on first arrival, waiting until users see the benefit, and using an in-page pre-prompt — [Chromium blog](https://blog.chromium.org/2020/01/introducing-quieter-permission-ui-for.html)
- Firefox only shows the prompt after a user interaction and replaced "Not Now" with "Never Allow" — summarized from [OneSignal: permission prompting changes](https://onesignal.com/blog/web-push-permission-prompting-changes/)
- Retention claims (correlational, vendor): users who receive push within 3 months of opt-in show ~3x retention — [Wisernotify](https://wisernotify.com/blog/push-notification-stats/); [Shno](https://www.shno.co/marketing-statistics/push-notification-statistics)
- Fatigue: 46% of users opt out at 2–5 pushes/week (single source) — [Sleeknote](https://sleeknote.com/blog/push-notification-statistics)

### Inferences
- **RAT needs a server component for push** (VAPID keys + subscription storage + scheduled sender) — fits as a new module in `Server/src/modules/`, with a legal-page paragraph and `LEGAL_UPDATED` per CLAUDE.md. Requires a privacy-policy update because subscriptions are personal data endpoints.
- **Best triggers for RAT (all opt-in, specific, ≤1/day, ≤3–4/week):** "Your free chest is ready" (only if a timed chest exists), "A friend beat your challenge / [Name] passed you on the friends board", "Your challenge link was played", "New update: [patch title]" (weekly max, from changelog.json). Ask for permission right after the moment that creates the need (e.g. after sending a challenge: "Get notified when Alex plays it?").
- **Never prompt on CrazyGames** (iframe, cross-origin, platform rules) — own site + Play TWA only.
- Because grant rates are low and the quieter UI penalizes bad prompting, a pre-prompt is mandatory; measure own funnel (shown → accepted → granted → returned D7) with Umami events (no IDs, per the analytics rule).

### Gaps
- No game-specific web push opt-in or retention-lift data found; all retention numbers are vendor, correlational.
- No independent measurement of iOS Home-Screen PWA install rates.

## 4. Virality: share results, challenge links, clips, referrals

### Takeaway
Wordle's growth is widely attributed to a spoiler-free, copy-pasteable result grid plus one shared daily puzzle that makes results comparable — but there is no rigorous measurement, only journalism and Wardle's own statements. For RAT, the existing pieces (challenge short links with server-rendered previews, invite referral at level 5) already match the mechanism; what is missing is a shared daily seed and a one-tap text/emoji result that works in any chat.

### Cited Findings
- Wardle added Twitter grid sharing (Dec 2021) after seeing players share results with emoji; TechCrunch credits the ease of sharing the emoji grid for the virality; NYT said Wordle brought "tens of millions" of new users (journalism, NYT statement) — [TechCrunch](https://techcrunch.com/2022/05/04/wordle-new-york-times-user-growth); [AOL/Yahoo](https://www.aol.com/news/wordle-brought-tens-millions-users-150000203.html)
- Wardle: if everybody had a different word each day "it wouldn't have caught on the way it has" (one shared daily puzzle = comparable results) — [TechCrunch](https://techcrunch.com/2022/05/04/wordle-new-york-times-user-growth)
- Design analysis (opinion): the grid shows performance without spoiling the answer, so it is safe to post publicly; each post acts as a peer recommendation; no ads or influencers — [dinogame.gg](https://dinogame.gg/blog/why-is-wordle-so-popular/)
- Sharing happened in WhatsApp, Facebook, texts, not only Twitter (journalism) — [buildd.co](https://buildd.co/product/wordle-the-viral-sensation)
- Meme peak faded after 2022 as the game became routine (low-authority source) — [Know Your Meme](https://knowyourmeme.com/memes/39248)
- Short video exposure: a 26-second Vsauce3 clip sent ~7,000 visitors to a browser game in days, more than Kotaku's article (~700) — measured by the developer, 2013 — [Game Developer: Atum traffic analysis](https://www.gamedeveloper.com/business/atum-traffic-analysis-1-year-later)

### Inferences
- **Daily shared seed ("Daily Road") is the single most Wordle-like lever** RAT is missing: same seed for everyone per day (RAT is deterministic: same seed + same taps = same result), one attempt or best-of, result shareable as text like `Roundabout Timing #214  🟩🟩🟨🟥 · 37 cars · timing.love/d/214`. Text works everywhere (WhatsApp, Discord, Reddit), no image upload needed, and the existing server-rendered OG preview covers link unfurls.
- **Challenge links already exist**; the gap is prompting at the right moment (right after a near-miss or new best, "Can your friends beat 37?") and closing the loop (notify the sender when the friend plays — ties into push and the friends board).
- **Referral reward at level 5** is a good design (reward on activation, both sides). Tracking invites sent → installs → level 5 would show whether it works; no benchmark found.
- **Clip export:** RAT's deterministic replays (seed + taps) make clip/GIF export cheap in principle: re-simulate the last N seconds and record the canvas via `MediaRecorder` to WebM/MP4 for "share crash". This feeds TikTok/Shorts (section 5) and is player-generated marketing.

### Gaps
- No measured K-factor or share rate for any emoji-grid or challenge-link game found.
- No measured effect of double-sided referral rewards in casual/web games found.

## 5. Content marketing: short video, Reddit, devlogs, Discord, press, jams, Show HN / Product Hunt

### Takeaway
Short gameplay video is the one channel with repeatedly documented large spikes for small games (Tiny Glade TikTok at 21M views; Atum's 26-second YouTube clip beat a Kotaku article), but results are highly skewed and most posts get little. Reddit and Show HN give one-off spikes of hundreds to low thousands of visitors with a long tail; their real value is feedback and backlinks.

### Cited Findings
- Tiny Glade: biggest subscriber spike from a TikTok with 21M views; Steam reveal brought 26,000 wishlists in under two days (2022) — [presskit.gg TikTok field guide](https://presskit.gg/field-guides/tiktok-indie-game-marketing); [guardingpearsoftware devlog case studies](https://www.guardingpearsoftware.com/blog/successful-game-devlogs-5-studios-and-what-they-posted-12440)
- Acorn Games case (own report): first TikTok >100k views → ~2k+ wishlists overnight; quick follow-up content produced a second bump; "demo available to play right now" outperformed "wishlist now" as CTA — [Acorn Games 2025 guide](https://acorngames.gg/blog/2025/8/10/the-indie-devs-guide-to-mastering-tiktok-in-2025)
- Consultant rule of thumb (anecdotal): 100K views → 200–500 wishlists; 1M views → 2,000–8,000 — [Game Launch Guide](https://gamelaunchguide.com/blog/market-indie-game-tiktok-2026/)
- TikTok's algorithm evaluates each video largely independently of follower count; "for every YAPYAP, hundreds of indie devs post consistently with minimal results" — [Game Launch Guide](https://gamelaunchguide.com/blog/market-indie-game-tiktok-2026/); YAPYAP announcement TikTok ~1.5M views (marketing site) — same source
- Devlog clips: 15–30 s, hook = visible transformation — [presskit.gg](https://presskit.gg/field-guides/tiktok-indie-game-marketing)
- Browser game 2012–13 traffic by source (measured, old): RPS 1,142, IndieGames 712, PCGamer 467, Reddit 660 visits; jeuxvideo.com 4,100; Vsauce3 clip ~7,000; Kotaku ~700; long tail 100–350/day from YouTube/Google/direct; ~100,000 total — [Game Developer: Atum](https://www.gamedeveloper.com/business/atum-traffic-analysis-1-year-later)
- Reddit for web games (anecdotes): ~10 Reddit posts of ~1k views each produced most of one dev's plays; another found r/freegamefindings traffic unengaged — [itch.io forum](https://itch.io/t/3698396/is-1000-views-on-a-broswer-game-good); subreddit self-promo rules vary — [applixir guide](https://www.applixir.com/blog/maximizing-visibility-revenue-a-guide-for-browser-based-games/)
- Show HN / HN front page (non-game unless noted): spike → decline → long tail; one Show HN ~468 active users launch day, ~6k pageviews; another ~22k uniques over 2 days; an (old) browser game ~7,500 uniques, gameplay broke under load; Show HN posts linger on /show for days — [Indie Hackers HN postmortem](https://www.indiehackers.com/post/front-page-of-hn-the-full-postmortem-traffic-lessons-surprises-cbe9e0a7f6); [HN: how much traffic](https://news.ycombinator.com/item?id=8107658); [HN #1 spot thread](https://news.ycombinator.com/item?id=41808941); [marcotm stats](https://marcotm.com/articles/stats-of-being-on-the-hacker-news-front-page/)

### Inferences
- **Highest-ROI content for RAT: 10–20 s vertical clips of crash physics** (pile-ups, near misses, boss vehicles, weather), posted to TikTok, Shorts and Reels in parallel, 3–5 per week for a few weeks; hook in the first second; CTA "play free in your browser: timing.love" (instant play matches the "play right now" finding). An in-game "save clip" button turns players into the content pipeline.
- **Reddit:** r/WebGames (instant browser play is exactly its format), r/incremental_games is a poor fit (RAT is not idle/incremental), r/IndieGaming and r/indiegames for clips, r/gamedev for a technical devlog (deterministic 120 Hz sim, physics crashes, PWA/TWA). One post per subreddit per meaningful update; title = the hook, link straight to the game.
- **Show HN:** angle should be technical ("one-tap game with deterministic physics, no engine, 120 Hz, offline PWA, WebRTC multiplayer") — HN cares about craft. Static nginx serving should survive the spike; check the Node leaderboard server's rate limits.
- **Product Hunt:** weak fit for games (low game audience); low priority.
- **Discord community:** the "Build with us" form + patch notes already generate the loop; a small Discord server becomes valuable only once there are regulars (could also be the home for a Discord Activity). Low effort to open, high effort to keep alive.
- **Press/curators for web games:** non-English outlets and YouTubers who cover browser games gave the biggest spikes in the Atum data; a press kit page (GIFs, 1-line pitch, logo) on timing.love is cheap.
- **Game jams:** low fit for an existing game (jams want new games), except jam-specific portal events (e.g. CrazyGames jams).

### Gaps
- No 2023–2026 measured data on r/WebGames post outcomes or Show HN for browser games specifically.
- No data on YouTube Shorts vs TikTok conversion for browser (non-Steam) games; nearly all published numbers are Steam wishlists.

## 6. SEO/landing page and returning-user mechanics (email, Discord, live ops, changelog)

### Takeaway
I found no browser-game-specific SEO or newsletter data in this pass; recommendations here are inference from the channel findings above plus general web practice. The strongest return-visit levers available to a solo dev are: a daily shared seed, timed rewards that can be announced by push, and a weekly-ish changelog cadence surfaced in game and on the site.

### Cited Findings
- Long-tail traffic for a browser game after launch spikes came from YouTube, Google and direct (100–350/day) — [Game Developer: Atum](https://www.gamedeveloper.com/business/atum-traffic-analysis-1-year-later)
- Kotaku's article with an embedded gameplay video drove fewer click-throughs (author suspects the embedded video reduced the need to visit) — [Game Developer: Atum](https://www.gamedeveloper.com/business/atum-traffic-analysis-1-year-later)
- Web game traffic is 22% higher on weekdays than weekends (CrazyGames session data) → schedule launches/posts on weekdays — via [applixir guide](https://www.applixir.com/blog/maximizing-visibility-revenue-a-guide-for-browser-based-games/)
- Push frequency above 2–5/week drives opt-outs (single source) — [Sleeknote](https://sleeknote.com/blog/push-notification-statistics)

### Inferences
- **SEO:** queries like "roundabout game", "car timing game", "traffic game online", "one tap car game" are likely low-volume and dominated by portals (CrazyGames/Poki pages rank for genre terms). Realistic wins: (1) the game itself on the root URL with a Play button above the fold and instant start (no splash gate); (2) indexable content pages that already exist (museum, ranks, changelog) with good titles/meta and `VideoGame` JSON-LD; (3) a short "How to play Roundabout Timing" page; (4) backlinks from itch.io, Reddit posts, press kit, portal listings that link back. Brand searches ("roundabout timing") will be most of organic traffic — make sure timing.love wins them over portal copies (canonical, consistent name).
- **Email newsletter:** poor fit — RAT intentionally has no accounts; collecting emails adds legal surface and Leo's privacy stance. Web push (opt-in, anonymous) + Discord cover the same job.
- **Live ops cadence for a solo dev:** one small content beat per week (new skin rotation, weekly challenge seed, boss of the week) + one patch-notes day per week is sustainable; a monthly "season" (themed weather/event + leaderboard reset or title) gives returning players a reason to come back. RAT's museum and event systems (`CITY_EVENTS`, `WEATHERS`) are natural season themes.
- **Changelog as re-engagement:** the in-game dot on Settings already exists; add (a) a "What's new" card on the start screen for returning players after an update, (b) one push per update day for opted-in players, (c) the changelog.json feeding a social post template. Keep it ≤1 push/week for updates.
- **Prioritization (effort → impact) for RAT:**
  1. *Low effort, high impact:* daily shared seed + text share result; contextual "share clip / challenge" prompts after new bests; itch.io page; r/WebGames + Show HN launch posts; Play icon A/B test.
  2. *Medium effort, high impact:* web push module (server + pre-prompt) for chest-ready / challenge-answered / friend-passed-you; clip export via deterministic replay + MediaRecorder; short-video posting routine; native in-app review in the TWA wrapper.
  3. *Medium-high effort, uncertain impact:* Discord Activity port; YouTube Playables port (SDK save adapter); Poki application (requires strategic decision on exclusivity and CrazyGames).
  4. *Low value:* GameDistribution/GamePix/Y8 syndication, Facebook Instant Games, Telegram, Product Hunt, email newsletter, Play Games Services.

### Gaps
- No measured data found on browser-game SEO (keyword volumes for "roundabout game" etc. need a keyword tool such as Google Search Console/Keyword Planner).
- No data found on email newsletters or Discord servers for small web games' retention.
- No measured data on live-ops cadence effects for solo-developed web games.
