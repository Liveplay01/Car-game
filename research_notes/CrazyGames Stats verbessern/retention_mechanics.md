# Retention mechanics for Day-1 and returning users in casual/hyper-casual browser games (applied to "Roundabout Timing")

Research date: 2026-10-08. Evidence is labeled **[measured]** (A/B test, dataset, or published metric), **[descriptive]** (survey/prevalence, no causal effect), or **[anecdotal]** (designer statements, vendor blogs, unverified figures). An honest headline: published, controlled uplift numbers for game retention mechanics are rare. Most "X% retention uplift" figures online are unverifiable vendor claims. The few hard numbers come from Duolingo's streak A/B tests, CrazyGames' own platform stats, and GameAnalytics/Tenjin benchmark datasets.

## Which mechanics measurably raise D1 (catalog with evidence)

### Takeaway
No controlled, published study isolates the D1 effect of daily rewards, chest timers, daily seeds, or collections in casual games. The best measured evidence is Duolingo's streak A/B tests: each change moved retention by only about 1–4% relative. That points to stacking several small, low-friction daily hooks, not one silver bullet. CrazyGames itself names four levers: progression, daily reasons to return (login bonus, daily quests), reliable progress saving, and polish/bug-fixing.

### Cited Findings

**Platform guidance (CrazyGames, primary source)**
- CrazyGames' Basic Launch guide lists the D1 levers: "Add meaningful progression" (levels, unlocks, upgrades), "Create daily reasons to return" (login bonuses or daily quests), "Save player progress. Lost progress means lost players", and fix bugs and rough edges, "a major reason players don't come back" — [CrazyGames Basic Launch Guide](https://docs.crazygames.com/resources/basic-launch-metrics/) [descriptive/platform advice]
- CrazyGames says badly placed ads "hurt retention and play time, which in turn reduces your revenue". It points to a separate midgame-ads guide "to protect your Day 1 Retention" — [CrazyGames Ad Monetization Guide](https://docs.crazygames.com/resources/ad-monetization-guide/) (via search summary) [platform advice]
- CrazyGames action-genre guide: give 2–3 s of invincibility after a revive, put a 5 s countdown on the revive button, and offer "Pre-Round Trials" (try a locked character or weapon for one run). It says these keep players "playing longer" — [CrazyGames: Monetizing Action](https://docs.crazygames.com/resources/monetizing-action/) [platform advice, no numbers]
- CrazyGames account docs: "Players care A LOT about their progress in games, and expect their progress to synchronize across their devices." Progress saving is required "unless progress is not applicable" — [CrazyGames Account Integration](https://docs.crazygames.com/requirements/account-integration/) [platform requirement]

**Streaks / daily habit (Duolingo, best available A/B evidence; non-game but a habit app)**
- Separating the streak from the daily goal (one lesson extends the streak; the daily goal is shown separately) gave **+3.3% Day-14 retention** and **+1% daily active learners** (relative). The share of daily learners on a streak rose +10.5% within 20 days, and +19% among new learners — [Duolingo Blog: Improving the streak](https://blog.duolingo.com/improving-the-streak) [measured, A/B]
- About a year later, the same change had raised "the number of learners on a 7+ day streak by over 40%". The trade-off: fewer learners reached their daily goals — [Duolingo Blog](https://blog.duolingo.com/improving-the-streak) [measured]
- Key lesson from Duolingo: the daily goal was a barrier to habit formation. Lowering the barrier to "doing something today" mattered more early on than daily volume — [Duolingo Blog](https://blog.duolingo.com/improving-the-streak) [measured + interpretation]
- Earlier Duolingo tests (secondary summary): showing streak days at the top of the app gave +3% DAU and +1% D14 retention. Emphasizing the streak after each lesson gave +1% DAU and +3% D14 — [Econsultancy: six A/B tests used by Duolingo](https://econsultancy.com/six-a-b-tests-used-by-duolingo-to-tap-into-habit-forming-behaviour/) [measured, secondary]
- Duolingo reportedly ran 600+ streak experiments in four years, and about half were shut down. One failed test ("only one exercise extends streak") mainly attracted the least engaged users — [Lenny's Podcast summary, Jackson Shuttleworth](https://www.recall.it/summary/lennys-podcast/behind-the-product-duolingo-streaks-or-jackson-shuttleworth-group-pm-retention-team) [anecdotal/secondary]
- Mistplay (vendor) changed a 7-day-streak weekly bonus to "Daily Play" and "found players were happier without having the pressure to maintain a streak". No retention delta was given — [Mistplay: daily login rewards](https://business.mistplay.com/resources/daily-login-rewards) [anecdotal]

**Daily login rewards (prevalence, not effect)**
- Daily login rewards are "the most popular strategy (used by 95% of games)" among the Korean mobile games studied. The paper frames them via loss aversion. It is descriptive and does not measure retention effect — [arXiv 2504.10714, Playing to Pay](https://arxiv.org/pdf/2504.10714) [descriptive]
- I found no controlled holdout study with published D1/D7 deltas for login calendars — (search across vendor and academic sources; see Gaps)

**Daily seed / one-per-day puzzle (Wordle effect)**
- Josh Wardle credited the one-puzzle-per-day limit as his breakthrough, saying it "helped enforce a sense of scarcity". Sessions last a couple of minutes per day. The shareable emoji grid (shows performance without spoilers) was invented by players and then adopted. There is no sign-up: an account is suggested only after a finished puzzle, to save the streak — [MoEngage: Wordle's growth story](https://www.moengage.com/blog/wordle-viral-growth-story/) [anecdotal/case study]

**Timed gifts / "come back in X hours" chests**
- Crossy Road gave free gifts every 6 hours (coins), and 100 coins bought a random character. Its developers described character collection as the long-term hook, and named virality and retention as the two focus areas. Crossy Road deliberately avoided lives/energy — [Thumbsticks: How Hipster Whale reinvented F2P](https://www.thumbsticks.com/crossy-road-how-hipster-whale-reinvented-free-to-play/); [PocketGamer.biz: Crossy Road sharing & retention](https://www.pocketgamer.biz/crossy-road-sharing-retention/); [AppMasters podcast, Matthew Hall](https://appmasters.com/podcast/crossy-road-matthew-hall/) [anecdotal, 2014–15]
- Geometry Dash has a Daily Level (refreshes every 24 h), a Weekly Demon (7-day cycle, rewards a chest with orbs, diamonds, a key, and shards), plus daily and weekly quests and timed chests. A stuck player can skip the weekly level once its 7 days have passed — [Geometry Dash Wiki: Weekly Demon](https://geometry-dash.fandom.com/wiki/Weekly_Demon); [geometrydash.wiki.gg: Event Level](https://geometrydash.wiki.gg/wiki/Event_Level) [descriptive, community wiki]

**Meta-progression / collection / hybrid-casual**
- Voodoo reported strong D7 and D14 retention, longer playtime, and higher ARPDAU for its hybrid-casual titles (hyper-casual core plus meta) versus pure hyper-casual. Voodoo targets ≥45% D1, 15% D7 (20% puzzle), and 10% D30 for its mobile titles — [Game World Observer: Voodoo hybrid-casual podcast (2023)](https://gameworldobserver.com/2023/07/25/voodoo-hybrid-games-d7-retention-games-and-names-podcast) [anecdotal, publisher statements]
- Collection systems are "one of the most popular meta layers added to casual games" — [Udonis: Hybrid-casual games](https://www.blog.udonis.co/mobile-marketing/mobile-games/hybrid-casual-games) [descriptive, vendor blog]
- One analyst frames it this way: "By D3–D5, the meta should be the primary reason anyone relaunches the app" — [Game Growth Advisor: Hybrid casual 2026](https://gamegrowthadvisor.com/blog/2026-04-16-hybrid-casual-game-design-strategy-2026/) [opinion]
- Crazy Labs reorganized level order in Makeup Kit and saw **+11% D7 retention**, +7% D7 ARPU, and +7% D7 playtime. This was level sequencing, not a meta feature, but it shows early-content ordering moves retention — [CrazyLabs: A/B testing](https://www.crazylabs.com/blog/level-up-your-game-a-b-testing/) [measured, publisher]

**Rewarded ads as a retention lever**
- Unity (per a secondary source) reports a 4-percentage-point D7 lift in games using rewarded formats — cited in [Hubapps retention guide](https://hubapps.team/blog/mobile-game-retention-strategies) [unverified secondary]

**Limited-time events / LiveOps**
- Events in top F2P games increased 35% between May 2023 and Jan 2025. Casual titles use seasonal albums tying collectibles, battle passes, and collaborations into themed arcs — [Global Games Forum: LiveOps trends (GameRefinery analyst)](https://www.globalgamesforum.com/news/the-trends-shaping-the-world-of-liveops) [descriptive]
- PeopleFun's themed limited-time events gave a 16–21% lift in ad-driven ARPDAU and 21–25% in minutes played per DAU. These are engagement and revenue metrics, not retention — via [App Developer Magazine: Cracking the live ops code](https://appdevelopermagazine.com/Cracking-the-live-ops-code/) [measured, developer talk]
- "Games with weekly LiveOps events see 30-day retention 2.1x higher" is attributed to Adjust, but I could not locate the original — [RocketShip HQ](https://www.rocketshiphq.com/?p=5717) [unverified]
- Warning: event lifts can be pull-forward (play shifted earlier, not extra returns). Measure against a baseline and check for post-event dips — [Dataford: evaluate live ops retention impact](https://dataford.io/questions/evaluate-live-ops-retention-impact) [methodology]

**Social / async friend challenges / ghosts**
- In a study of two commercial F2P mobile games, social-feature use in the first 7 days predicted D30 retention in one game but **had no effect in the other** — [White Rose eprint: Incorporating simple social features in mobile games](https://eprints.whiterose.ac.uk/id/eprint/134038/1/social_social_ltv.pdf) [measured, correlational]
- Ghost races in HTML5 already exist: Ghost Pro Racing lets you race replays of up to 7 players and share a link for a 1v1 against your ghost (no retention data) — [Show HN: Ghost Pro Racing](https://news.ycombinator.com/item?id=45490844); Real Racing 3 used friends' ghosts driven by AI — [PocketGamer](https://www.pocketgamer.com/real-racing-3/real-racing-3s-asynchronous-multiplayer-turns-ghosts-into-ai-competitors/) [descriptive]
- Claims of a "30% retention multiplier" for async social cite no study — [Hubapps](https://hubapps.team/blog/mobile-game-retention-strategies) [unverified]

**Energy systems**
- Midnight Star's developer reported that retention, purchase, and drop-off data showed players "not appreciating being told they have to stop playing". Too few paid to bypass it, and it sent a negative message to the best players — [TouchArcade (2015)](https://toucharcade.com/2015/05/28/core-gamers-and-f2p-energy-systems-dont-mix-says-developer-of-midnight-star) [anecdotal postmortem]
- Designers argue energy boosts "consecutive days opened" by pacing play. Critics call it time-gating that "transforms absence into a sense of loss". Suggested alternative: unlimited play with capped rewards (Clash Royale model) — [Mobile Free to Play: Understanding Energy Systems](https://mobilefreetoplay.com/?p=617); [Science Insights](https://scienceinsights.org/why-do-mobile-games-have-energy-systems/) [opinion]

### Inferences
- The one rigorous source (Duolingo) says the streak works when the action that keeps it alive is **tiny and separate from "how much you played"**. For RAT, "one shift per day keeps the streak" is the analogue, and it should never be tied to winning or reaching a level.
- Each mechanic is worth a few percent relative. Leo's gap is large (desktop 1.80% → 3.23% target is +79% relative; mobile 3.85% → 5.85% is +52%). So no single daily hook will close it. Basics like saved progress through the CrazyGames Data module, no lost progress, first-minute fun, and bug-free play probably matter as much as new features (CrazyGames lists them first).
- The best fits for RAT's one-tap, short-session core are **unlimited play plus capped daily rewards**: chest timer, daily seed, 3/day ad rewards. That follows the Crossy Road / Clash Royale model and avoids energy, which Crossy Road explicitly rejected.
- Crossy Road's 6-hour gift timer gives several return windows per day. It may suit anonymous web players better than a single 24 h calendar, because they can come back the same evening, not only tomorrow.

### Gaps
- I found no controlled A/B data on login calendars, timed chests, daily seeds, collection completion, or personal-best UIs in casual or hyper-casual games. Vendor pages that quote such numbers (for example "37% lift" figures attributed to Stanford/MIT on Wordle mirror sites) could not be verified and were excluded.
- I found no published CrazyGames data on which in-game features correlate with D1 on the portal.

## How to design the end of the first session for a return tomorrow

### Takeaway
Leave a visibly unfinished, near-complete goal (Zeigarnik), show a concrete, timed promise ("your chest opens tomorrow", "new daily road at 00:00 UTC"), and make "doing something tomorrow" cheap. The theory is strong. Direct game-retention measurements of session-end design were not found.

### Cited Findings
- Zeigarnik's original experiments found that people recalled interrupted tasks about twice as well as completed ones, and the effect is stronger when the task is interrupted near its middle or end — [Learning Loop: Zeigarnik effect](https://learningloop.io/plays/psychology/zeigarnik-effect); [Psychology of Games: Zeigarnik effect and quest logs](https://www.psychologyofgames.com/2017/01/3613/) [academic origin, via secondary]
- Game design application: quest structures keep the task list "perpetually open – no sooner do you complete one, then two more pop up" (Rigby & Ryan, *Glued to Games*). The "one more turn" pull serves completing a structure or upgrade — [Psychology Today: Zeigarnik effect and quest logs](https://www.psychologytoday.com/us/blog/mind-games/201303/the-zeigarnik-effect-and-quest-logs-8) [theory]
- Partially filled progress bars visually represent "what remains", tapping the desire for closure. Too much ambiguity turns tension into annoyance — [Learning Loop](https://learningloop.io/plays/psychology/zeigarnik-effect) [opinion]
- Replications of the Zeigarnik effect are inconsistent. Treat it as a heuristic to test — (researcher's note, consistent with the caveat in the [Psychology of Games](https://www.psychologyofgames.com/2017/01/3613/) discussion) [caveat]
- Wordle's end-of-session moment shows the result, the streak, and a countdown to the next puzzle, plus an optional account prompt to save the streak, offered only *after* completion — [MoEngage](https://www.moengage.com/blog/wordle-viral-growth-story/) [case study]
- Duolingo found that emphasizing the streak *after each lesson* gave +3% D14 retention (relative) — [Econsultancy](https://econsultancy.com/six-a-b-tests-used-by-duolingo-to-tap-into-habit-forming-behaviour/) [measured, secondary]
- CrazyGames "Pre-Round Trials" (try a locked character once) are a tease-the-unlock mechanic recommended on the portal — [CrazyGames: Monetizing Action](https://docs.crazygames.com/resources/monetizing-action/) [platform advice]
- An analytics executive's warning: "it's very hard to reactivate people who have made the psychological decision to go". Focus on the first session and early days — [PocketGamer.biz: why it pays to pay attention to retention](https://www.pocketgamer.biz/why-it-pays-to-pay-attention-to-retention) [anecdotal]
- Portal players judge quickly: "games that front-load their fun do well and games that need a five-minute tutorial before anything happens tend to stall" — [Cinevva: CrazyGames developer guide](https://app.cinevva.com/guides/publish-game-crazygames) [anecdotal, third party]

### Inferences
- For RAT, a strong first-session ending (inference, combining the findings above) could:
  - (a) show the career bar 70–90% toward the next unlock, such as a vehicle type or skin ("2 shifts to the Taxi");
  - (b) grant a chest at the end of the first session that opens "tomorrow" (a timed chest, à la Crossy Road gifts), with a clear countdown;
  - (c) show "Daily Road #N" with a countdown to the next seed;
  - (d) start a streak at day 1 with a visible day-2 reward preview.
- These must not interrupt the core loop (see the user memory "Seamless shift transition"). Put them on the end or pause screen or the Progress tab, not between shifts.
- The "tomorrow" promise only works if the save survives. On CrazyGames that means the Data module (cloud-synced for logged-in users, localStorage for guests). The promise should say what is waiting ("Chest ready in 14 h"), not just "come back".

### Gaps
- I found no A/B data on session-end screens, cliffhanger prompts, or "tomorrow" chest timers in web or casual games.

## What works without push notifications in browsers, and what portals allow

### Takeaway
Within CrazyGames, the main return channels are the portal itself (its account, cross-device saving, recently played/favourites lists) and the game's own reasons to come back. External logins, external ads, and (implicitly) collecting emails are not allowed. Evidence for PWA install uplift exists only from vendors. Installers are self-selected, so naive comparisons overstate the effect.

### Cited Findings
- CrazyGames SDK user module: players already logged into CrazyGames are authenticated automatically and stay logged in across devices. If the user object is null, the game may trigger an auth prompt asking them to log in — [CrazyGames HTML5 SDK v3: User](https://docs.crazygames.com/sdk/html5-v3/user) [platform docs]
- Data module: it saves data for logged-in users and syncs it across devices. Guest data lives in localStorage and is backed up to the account when the player logs in later. The Progress Save toggle must be set at submission, or the module is disabled — [CrazyGames SDK: Data](https://docs.crazygames.com/sdk/data/) [platform docs]
- A third-party wrapper reports a 1 MB data limit and a save delay of about 1 s (up to 30 s if abuse is detected). Verify against official docs — [GDevelop wiki: CrazyGames extension](https://wiki.gdevelop.io/gdevelop5/extensions/crazy-games-ad-api/details/) [unverified third party]
- CrazyGames requirements:
  - "No external ads".
  - "No external login options", that is, disable Facebook, Google, and email login.
  - "Full implementation" means progress linked to the CrazyGames account and the CrazyGames username and avatar used.
  - "Invite link (if applicable)" is listed under multiplayer.
  - "Full implementation features might increase engagement and are optional in basic launch".
  - Collecting personal data beyond the SDK requires a T&C/privacy notice.

  Sources: [CrazyGames Requirements intro](https://docs.crazygames.com/requirements/intro/); [Account integration](https://docs.crazygames.com/requirements/account-integration/) [platform rules]
- CrazyGames says successful games will be required to "integrate fully" with accounts later — [Account integration](https://docs.crazygames.com/requirements/account-integration/) [platform rule]
- A third-party guide says cloud saves let players resume across devices, "which improves retention" — [Abratabia: Submitting to CrazyGames and game portals](https://www.abratabia.com/publishing-web-games/game-portals.php) [anecdotal]
- PWA install: Xsolla (vendor) claims up to 3x web-shop visits and "improved retention" from its PWA feature, without methodology — [Xsolla blog](https://xsolla.com/blog/boost-engagement-and-retention-with-xsolla-web-shop-pwa-feature) [anecdotal]
- The claim that users are "3x more likely to revisit a PWA added to home screen" (attributed to Google) has no primary source I could find — [istapp.net](https://istapp.net/v1/?p=6227) [unverified]
- Poki's leadership stresses click-to-play in seconds. Poki has invested in player accounts and personalization as platform features — [Insider Gaming: Poki interview](https://insider-gaming.com/interview-entertaining-100-million-gamers-poki-no-charge/) [anecdotal]

### Inferences
- On CrazyGames, RAT should not show its own PWA install prompt, links to timing.love, the Sync-Code cloud, or email capture. This is likely consistent with the project's existing `?crazygames` handling. The portal rules page found does not mention install prompts or external links explicitly. Verify on the Technical and Gameplay requirement pages before relying on that.
- The portal-legal levers are:
  - (1) a CrazyGames login prompt at a moment of value, such as "Log in to keep your streak / chest on all devices", Wordle-style after a success, never before play;
  - (2) the Data module for all progress, so a returning player on another device or after cleared storage still has the streak;
  - (3) a CrazyGames invite link for multiplayer and friend challenges;
  - (4) in-game reasons to return.
- On RAT's own site and in the Play TWA, PWA install, the friend code, and the Sync code remain available. Treat their effect as unproven. If measured, compare installers with non-installers using a holdout on prompt *exposure*, not on install, to avoid self-selection bias (as the PWA search result itself cautioned).

### Gaps
- I found no CrazyGames documentation on a "favourites" feature, on "recently played", or on how the portal resurfaces games to returning users.
- I did not find explicit CrazyGames rules on external links or PWA prompts (the pages fetched were silent).
- I found no data on browser bookmarking behaviour.

## Benchmarks: D1/D7 for hyper-casual vs casual vs web portals

### Takeaway
Mobile-app D1 figures (20–45%) are not comparable to CrazyGames D1. On CrazyGames, the **platform average D1 is 6.7%**, action games reach 8.1%, and "strong games often achieve 10–15%". RAT's 1.80% (desktop) and 3.85% (mobile) are well below the platform average, so the gap is mostly first-session quality and return reasons, not a niche ceiling.

### Cited Findings
- **CrazyGames:** platform average D1 6.7%. Action 8.1% ("21% above the platform average"), with about 13 min average playtime. Shooting 6.5% D1, 12 min — [CrazyGames: Monetizing Action](https://docs.crazygames.com/resources/monetizing-action/) [measured, platform]
- **CrazyGames:** "Strong games often achieve 10–15% Day 1 Retention". D1 is defined as "the percentage of players who come back the day after their first session" — [CrazyGames Basic Launch Guide](https://docs.crazygames.com/resources/basic-launch-metrics/) [measured/platform]
- **GameAnalytics 2025 report (end-2024 data, 11,600 games, 1.48B MAU):** top-quartile D1 was 26.48–27.69% (down from 28–29% in 2023), bottom quartile 10–11.5%. Top-25% iOS reached 31–33% versus Android 25–27%. Median D7 was 3.42–3.94%, with the top quartile at 7–8%. 75% of games have D28 < 3% — [GameDevReports summary of GameAnalytics 2025 benchmarks](https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks) [measured]
- **Hyper-casual (Tenjin × GameAnalytics, Q4 2022):** median D1 was 24% iOS and 23% Android. Median D7 was 7% iOS and 4% Android — [GameDevReports: Tenjin & GameAnalytics hypercasual Q4 2022](https://gamedevreports.substack.com/p/tenjin-and-gameanalytics-hypercasual-6e4) [measured, dated]
- **GameAnalytics rule of thumb:** a hyper-casual game with D1 < 40% "probably isn't doing well" — [GameAnalytics: Metrics behind hyper-casual games](https://www.gameanalytics.com/blog/the-metrics-behind-hyper-casual-games-industry-report) [opinion]. This conflicts with GameAnalytics' own dataset medians above.
- **Casual/puzzle (AppsFlyer Q3 2022, Android):** 28–32% D1, 9–12% D7, 3.5–5% D30 — [Segwise benchmarks summary](https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies) [measured, secondary]
- **Voodoo targets:** ≥45% D1, 15% D7, 10% D30 — [Game World Observer](https://gameworldobserver.com/2023/07/25/voodoo-hybrid-games-d7-retention-games-and-names-podcast) [publisher target]
- **Hyper-casual vs simulation:** hyper-casual 20–30% D1 and <2% D30, versus simulation 45–60% D1 — [Juegostudio](https://www.juegostudio.com/blog/how-to-increase-user-retention-and-increase-your-games-lifetime) [vendor, rough]

### Inferences
- Mobile installed-app D1 is about 4–8x higher than CrazyGames browser D1, because the web portal has no install commitment and anonymous cookie-based identity. Compare RAT only against CrazyGames numbers.
- Leo's targets (3.23% desktop, 5.85% mobile) are still below the 6.7% platform average. Reaching them looks feasible with fundamentals. The 10–15% "strong game" band is the long-term ceiling.
- Action games beat the average on CrazyGames. RAT is arcade/timing, closer to "casual". I found no CrazyGames D1 figure for casual or arcade.

### Gaps
- I found no published per-genre CrazyGames D1 beyond action and shooting.
- I found no Poki D1 benchmarks.
- I found no definition of the CrazyGames "returning users" metric (RAT's 4%), for example whether it is any-day return or a weekly window.
- I found no desktop vs mobile split from CrazyGames.

## Examples from successful hyper-casual timing games and portal hits

### Takeaway
The documented systems are:
- **Crossy Road:** timed free gifts every 6 h, coins buying random characters, collection as the long-term hook, no energy, and a strong focus on virality.
- **Geometry Dash:** daily level, weekly demon, quests, and timed chests.
- **Wordle:** one seed per day with a shareable result.

For Car Circle, Stack, Helix Jump, Smash Hit, and Flappy-likes, I found no sourced retention-system analysis.

### Cited Findings
- **Crossy Road** (Hipster Whale, 2014):
  - Free gifts every 6 h.
  - 100 coins buys a random character (gacha).
  - Characters are purchasable, but the game has no lives system.
  - Varied environments were added "to promote retention", with virality and retention as the two stated focuses.
  - "Monetization was secondary".

  Sources: [Thumbsticks](https://www.thumbsticks.com/crossy-road-how-hipster-whale-reinvented-free-to-play/); [PocketGamer.biz](https://www.pocketgamer.biz/crossy-road-sharing-retention/); [AppMasters](https://appmasters.com/podcast/crossy-road-matthew-hall/) [anecdotal]
- **Geometry Dash** has a Daily Level (24 h refresh), a Weekly Demon (chest of 500 orbs, 20 diamonds, 1 key, 2 Shards of Power; skippable after 7 days), daily, weekly, and monthly quests, and daily chests — [Geometry Dash Wiki](https://geometry-dash.fandom.com/wiki/Weekly_Demon); [wiki.gg](https://geometrydash.wiki.gg/wiki/Event_Level) [descriptive]
- **Wordle**: one puzzle per day (scarcity), sessions of a couple of minutes, no sign-up, and a spoiler-free shareable grid — [MoEngage](https://www.moengage.com/blog/wordle-viral-growth-story/) [case study]
- **Homa (Attack Hole)** includes power-ups, boss fights, and skin collection. **SayGames (Race Master 3D)** uses player progression to fight weak hyper-casual retention. No numbers are given for either — [Udonis: top hyper-casual games](https://www.blog.udonis.co/mobile-marketing/mobile-games/top-hyper-casual-games) [descriptive]
- **Async ghost racing on the web:** Ghost Pro Racing (HTML5) races up to 7 replays, with a share link for a 1v1 against your ghost — [Show HN](https://news.ycombinator.com/item?id=45490844) [descriptive]
- **Poki** launches on the web first to soft-test and iterate, and uses existing users to spread the word — [Google Developers Blog: How Poki tests games](https://developers.googleblog.com/en/app-monetization-insights-how-poki-cleverly-tests-their-games-before-launching) [anecdotal]

### Inferences
- RAT already has most of the Crossy Road/Geometry Dash stack: chests, skins, vehicle types, a museum, daily ad rewards, and leaderboards. What is missing, if not already built: **time-based return hooks** (a free gift every N hours, a daily seeded "Road of the Day" with a global or friends board, a weekly challenge) and **share-ready results**. RAT's deterministic simulation (same seed + same taps = same result) makes a daily seed and ghost replays cheap and cheat-resistant.
- The challenge short-links (`/c/K7M29QXA`) are RAT's version of the Wordle share grid and Ghost Pro Racing's ghost link. On CrazyGames the equivalent would be the SDK invite link.

### Gaps
- I found no sourced breakdown of the retention systems or retention data for Car Circle, Stack, Helix Jump, Smash Hit, or Flappy Bird clones.
- I found no list of CrazyGames top games with their retention features, and no portal-specific "games that hit 5%+ D1" data beyond the action-genre average.

## Pitfalls: mechanics that hurt the first session or feel manipulative

### Takeaway
The risks are front-loaded meta, such as long tutorials, pop-ups before fun, or account walls; energy and time-gating of play; and streak pressure. Ads placed in active play hurt D1 on CrazyGames. Event and reward lifts can be pull-forward or bought with LTV. The core loop must stay fun first, and meta should matter from about D3 onward.

### Cited Findings
- Portal reviewers note "games that need a five-minute tutorial before anything happens tend to stall" — [Cinevva](https://app.cinevva.com/guides/publish-game-crazygames) [anecdotal]
- Bugs and rough edges are a "major reason players don't come back" — [CrazyGames Basic Launch](https://docs.crazygames.com/resources/basic-launch-metrics/) [platform]
- Poor ad placement hurts retention and playtime. Keep midgame ads out of active play — [CrazyGames Ad Monetization Guide](https://docs.crazygames.com/resources/ad-monetization-guide/); [Monetizing Action](https://docs.crazygames.com/resources/monetizing-action/) [platform]
- Energy systems: players resented "being told they have to stop playing". The system alienated the best players and few paid — [TouchArcade](https://toucharcade.com/2015/05/28/core-gamers-and-f2p-energy-systems-dont-mix-says-developer-of-midnight-star) [anecdotal]
- Time-gating "transforms absence into a sense of loss". Some players log in only to spend energy — [Science Insights](https://scienceinsights.org/why-do-mobile-games-have-energy-systems/) [opinion]
- Streak pressure: Mistplay players were "happier without having the pressure to maintain a streak" — [Mistplay](https://business.mistplay.com/resources/daily-login-rewards) [anecdotal]. Duolingo found a demanding daily goal blocked habit formation — [Duolingo](https://blog.duolingo.com/improving-the-streak) [measured]
- Login rewards rely on loss aversion. Missing a day "can feel like losing out on accumulated progress" — [arXiv 2504.10714](https://arxiv.org/pdf/2504.10714) [descriptive]. Adopt Me sells a paid "Streak Saver", an example of monetizing streak anxiety — [Uplift Games Daily Streak FAQ](https://upliftgames.zendesk.com/hc/en-us/articles/39533852927892-Daily-Streak-FAQ) [descriptive]
- A more generous economy can raise retention at the cost of LTV. Track retention and ARPU together — [Turbine Games: A/B testing playbook](https://turbine.games/2023/02/10/the-a-b-testing-playbook-for-mobile-game-growth-part-1-structuring-the-experiment/) [opinion]
- Event lifts can borrow future engagement (pull-forward). Check for post-event dips — [Dataford](https://dataford.io/questions/evaluate-live-ops-retention-impact) [methodology]
- 78% of the top 1,000 LiveOps games declined in revenue between H1 2024 and H1 2025 (Sensor Tower, via vendor). Running events is no guarantee — [iLogos: why LiveOps events fail](https://ilogos.biz/why-liveops-events-fail/) [secondary]
- Relative versus percentage-point confusion: a 1.4 pp move can read as 3.4% relative. Check which form a case study reports — [GitHub: ab-test-mobile-game](https://github.com/proggdd/ab-test-mobile-game) [methodology]
- Too much open-endedness (Zeigarnik) turns tension into annoyance — [Learning Loop](https://learningloop.io/plays/psychology/zeigarnik-effect) [opinion]

### Inferences
- For RAT, keep the first 60 seconds pure core loop: no chest, casino, streak, or login prompt before the first shift is played. Introduce the meta after the first success, and the "tomorrow" hooks at the session end.
- Streak design should be forgiving: one shift keeps it alive, with built-in free freezes or a grace day, and never a paid streak saver. This fits the project's "honest odds / no purchasable currency" stance.
- The casino is a manipulation risk if it appears in the first session. Gating it until a later level likely protects both first impression and perceived fairness (inference, no source).
- No energy or lives: the evidence and Crossy Road's precedent favour unlimited play with capped daily rewards. RAT's current 3/day ad-reward caps already follow this pattern.
- Measure every hook against a holdout. Expect single-digit relative gains per feature, as in Duolingo.

### Gaps
- I found no measured data on how much meta-system pop-ups in the first session cost D1 in web games.
- I found no studies on the perceived manipulativeness of casino or gacha systems in casual web games and how that affects retention.
