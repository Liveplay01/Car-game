# Retention benchmarks and diagnosis for casual / hyper-casual browser and mobile games (state: Oct 2026)

Scope note: "Hard numbers" = figure with a named source and year. Vendor blogs and single-developer posts are labelled as such. No independent dataset on web-portal return rates (Poki, CrazyGames, itch.io) was found. Several fetches (umami.is docs, gameanalytics.com, the Liftoff and investgame PDFs) failed or returned unreadable content, so a few numbers come from secondary summaries and are flagged.

## 1. What do D1 / D7 / D30 look like for hyper-casual, casual and web/HTML5 games (2024-2026), and what is top quartile?

### Takeaway
Across all mobile games the median is roughly D1 22%, D7 4%, D30 0.7% (GameAnalytics, 2025 data), with top-quartile D1 just above 30% and D7 6-7%. Hyper-casual shows decent D1 (about 25-35%) but collapses by D30 (about 1-3%). The only portal-specific benchmark is CrazyGames' own "success" bar for a 2-week trial: D1 of 10-15%, session of 10+ minutes. There is no public D7/D30 benchmark for web or portal games.

### Cited Findings
**All-genre mobile (hard numbers, GameAnalytics)**
- GameAnalytics 2026 benchmarks (2025 data; 16,262 mobile games with at least 1,000 MAU, iOS and Android): mobile median D7 is just under 4%, median D30 0.69-0.79%. Top 25%: D1 just above 30%, D7 6-7%, D30 about 1.6-1.8%. Top 10%: D1 about 40%, D7 11-12%. Top 1%: D1 64-68%, D7 above 25%, D30 13-15%. D1 declined in 2025 versus 2024. The summary page is PWN-Games-sponsored and shows medians for D1 only in charts. — [GameDevReports summary of GameAnalytics 2026](https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game)
- A search summary of the same report states a median D1 of about 22% (about 4% D7, about 0.7% D30). This is a secondary figure; the primary chart was not readable. — [GameDevReports](https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game) and [Segwise, citing Business of Apps](https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies.md)
- GameAnalytics 2025 benchmarks (2024 data; 11,600 apps, 16 genres, classic not rolling retention): top-25% D1 about 26-28%, bottom 25% about 10-11.5%, median D7 3.42-3.94%, 75% of projects below 3% D28. Reported by secondary summary. — [GameDevReports: GameAnalytics Mobile gaming benchmarks 2025](https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks)
- Genre signal from GameAnalytics (Q1 2024 / 2025 edition, secondary): arcade leads short-term D1 but has problems with long-term retention. Board, card, puzzle and casino games are best for medium and long-term retention. — [GameDevReports](https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks)
- Same report, PC (3,582 games, at least 100 MAU): top-25% D1 15-16%, top-1% D1 50-60%, top-1% D30 about 10%. PC D1 is lower than mobile in absolute terms. — [GameDevReports](https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game)
- Adjust Gaming App Insights 2026 (data Jan 2024 to Jan 2026, top 5,000 apps): all-genre D1 was 27% in 2025; hypercasual and hybrid casual have the highest D1 but the article gives no number; top games regularly exceed 40-50% D1. Hypercasual is 29.1% of installs. — [GameDevReports: Adjust Gaming App Insights 2026](https://gamedevreports.substack.com/p/adjust-gaming-app-insights-report)

**Hyper-casual / casual genre figures (vendor-blog level, methods differ)**
- Mistplay-derived table cited by Segwise (2026 page, table year unstated): Hyper-casual D1 29.31%, D7 5.90%, D30 1.38%. Puzzle 31.85 / 12.18 / 5.35. Match 32.65 / 13.98 / 7.15. Casino 28.16 / 9.85 / 4.10. No casual or arcade rows. — [Segwise](https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies.md)
- Other blog ranges for hyper-casual: D1 20-30% / D7 5-10% / D30 under 2% (Playio) and D1 25-35% / D7 5-10% / D30 1-3% (MWM). These are vendor blogs and do not share a methodology. — [Playio](https://blog.playio.co/retention-by-game-genre), [MWM glossary](https://mwm.ai/glossary/retention)
- Pooled datasets reflect the broad market; datasets from commercially scaled titles with active UA campaigns sit significantly higher. — (noted in the same search summary; sources above)
- Hyper-casual: standard hypercasual titles typically see less than 10% of players return by day 7 (Newzoo/Pangle, refers to the 2021 market, so dated). — [Newzoo/Pangle hypercasual report via Game Industry Library](https://gameindustrylibrary.com/documents/pangle-newzoo-hypercasual-unknown-time-2025/read)
- Older reference (2018, dated): GameAnalytics said top-performing titles average 40% D1, 15% D7, 6.5% D28. — [GameAnalytics blog via search summary](https://www.gameanalytics.com/blog/key-lessons-boost-game-retention)

**Web / portal-specific**
- CrazyGames Basic Launch (2-week trial with limited traffic) success benchmarks: average play time of 10+ minutes per session; Day 1 retention 10-15%; conversion (players who play at least 1 minute) 80%+; load time under 10 s; build under 20 MB. Basic Launch ends after at least 7 days and 500 plays, or automatically after 21 days if 500 plays are not reached. — [CrazyGames docs: basic launch metrics](https://docs.crazygames.com/resources/basic-launch-metrics/)
- CrazyGames states progression to Full Launch depends on playtime, conversion and retention, benchmarked against other games on the platform; no numeric D7/D30 threshold is published. — [CrazyGames docs: requirements](https://docs.crazygames.com/requirements/intro/)
- Poki SDK best-practices (hosted on Defold, not verified against Poki's own portal): average playtime 5+ min, "very strong" 7-10+ min, conversion to play 65%+, file size under 20 MB. No retention benchmark given. — [Defold Poki best practices](https://defold.com/extension-poki-sdk/best-practices)
- Poki 2026 State of Web Gaming (Atomik Research, 2,000 web gamers and 400 devs, US/UK; commissioned by Poki): 37% of surveyed web gamers play multiple times a day, 86% at least a few times a week; typical session 11-20 min (29%). Respondents were screened to play web games at least weekly, so this is not a general-population return rate and is Poki marketing. — [Poki blog](https://poki.com/blog/state-of-web-gaming-report-2026), [Substack review](https://gamedevreports.substack.com/p/poki-web-gaming-perceptions-in-2026)

**Session metrics (context for "good")**
- Mobile (GameAnalytics 2026): top-25% session about 5.2 min, top-10% about 8 min; top-25% daily playtime 22-24 min. Adjust: day-zero sessions averaged 1.65 in 2025. — [GameDevReports GA 2026](https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game), [GameDevReports Adjust](https://gamedevreports.substack.com/p/adjust-gaming-app-insights-report)

### Inferences
- A realistic "good" bar for a one-tap hyper-casual title on mobile is D1 of 30-35%+, D7 of 8-10%, D30 of 2-3%. Median is about D1 22% / D7 4% / D30 under 1%.
- On a portal the relevant bar is CrazyGames' D1 10-15% and 10-minute average session. Portal D1 is judged against a much lower bar than app-store D1, and the portal's own thresholds imply portal D1 is structurally low.
- A one-tap session is short by design (seconds to minutes), so CrazyGames' 10-minute bar is a stretch unless many rounds per session occur. Session count per visit, not session length, is probably the better proxy.

### Gaps
- No published GameAnalytics hyper-casual-only or casual-only D1/D7/D30 for 2025-26 was accessible (genre pages not in readable text).
- No D7/D30 benchmark for HTML5/portal games found anywhere; CrazyGames/Poki publish only D1 (CrazyGames) or none (Poki).
- Liftoff 2025 Casual Gaming Apps Report and Unity gaming report: no retention figures located.
- The Mistplay table year is unstated.

---

## 2. Portal vs direct traffic: why portal players don't return, and what portal levers exist

### Takeaway
Portals are discovery engines that own the audience: players browse to "a game", not to your game, and the developer gets no install, account or notification channel unless the player is deliberately moved to the developer's own domain. No independent return-rate data for portal vs direct traffic exists publicly; the case rests on portal docs, incentives and developer testimony.

### Cited Findings
- Portals own the audience, the data and the monetization rules; "portals for discovery, your own domain for retention" is the common guidance. These are vendor and guide sources, not measured. — [Abratabia, game portals](https://abratabia.com/publishing-web-games/game-portals.php) and [Applixir](https://www.applixir.com/?p=4256)
- Poki's own survey: a typical web session tries 2-3 different games (49%), and Poki frames web gaming as a funnel toward games on other platforms (62% of surveyed players bought or downloaded a game elsewhere after first playing it on the web). Respondents were pre-screened weekly web players and Poki is the sponsor. — [Substack review of Poki 2026 report](https://gamedevreports.substack.com/p/poki-web-gaming-perceptions-in-2026), [Poki LinkedIn via search summary](https://linkedin.com/company/poki)
- Poki best-practices: "web players decide quickly and leave quickly"; web sessions are "often spontaneous and curiosity-driven"; mobile can lean on progression and retention mechanics that play out over "days or weeks"; long intros, dialogue-heavy tutorials, complex menus and slow unlock systems "tend to struggle on web"; test: "Can the player start having fun within ten seconds?" — [Defold Poki best practices](https://defold.com/extension-poki-sdk/best-practices)
- Revenue incentive: on Poki, players who arrive directly (bookmark, search, social, own community) pay 100% of ad revenue to the developer, per one guide (not verified against Poki docs). — [Cinevva Poki guide](https://app.cinevva.com/guides/publish-game-poki)
- CrazyGames SDK offers a user module: logged-in CrazyGames users can be authenticated in-game (cross-device) and, if null, the game continues as guest. This is the portal-side account lever, and it also supports CrazyGames cloud/data module. — [CrazyGames docs: user module](https://docs.crazygames.com/sdk/html5-v3/user), [account integration requirements](https://docs.crazygames.com/requirements/account-integration/)
- CrazyGames gameplayStart/Stop must be called for every play start/resume; the dashboard shows players, average playtime, conversion, retention. — [CrazyGames docs](https://docs.crazygames.com)
- Poki: a third-party browser extension states Poki.com has no account logins to track favourite games (extension description, not Poki). Some pages claim a favourites list exists; they are low-quality and contradictory. I found no official Poki favourites feature. — [Pokilist extension](https://chromewebstore.google.com/detail/imdcjankeiphdjpoapmenkndfihilbbh)
- A single itch.io developer reported no traffic from itch.io itself; traffic came from their own links and jam pages (anecdote). — [itch.io post](https://itch.io/post/13132326)
- Installed PWA vs browser (vendor case studies, not like-for-like): Rakuten 24 reported a 450% increase in visitor retention versus its earlier mobile web flow after making it installable; Blibli reported 2.5x more sessions for installed PWA users and 8x conversion. — [web.dev Rakuten 24](https://web.dev/case-studies/rakuten-24), [web.dev Blibli](https://web.dev/blibli)
- Push opt-in (native app, Urban Airship Good Push Index 2013, dated): opted-in users had month-1 retention 55% vs 29% for opted-out; the 2017 follow-up argues opt-in audiences have greater expectations, and opt-in users who receive no messages retain worse than opt-out. Selection bias is likely. — [MediaPost](https://www.mediapost.com/publications/article/216357/push-messaging-almost-doubles-user-retention-rate.html)

### Inferences
- Why portal players don't return: (a) intent is "play something now", the portal home page is the next game, not yours; (b) no install, no account, no notification channel, no brand search ("Roundabout Timing" has no name recognition); (c) portal feed algorithms and 2-3 game sessions favour novelty; (d) iframe embedding blocks install prompts and push permission in many cases (my inference; the PWA install prompt and push permission generally do not work in cross-origin iframes - verify).
- Portal levers that exist: CrazyGames account/data module (login so progress carries across devices, makes "return" meaningful), good D1 as a ranking input (the portal itself measures it), strong end-of-session call to action. For direct traffic the game owns the levers: install, push, challenge links, friend leaderboard.
- The game's retention features (streak, push, invites, friends board) mostly work only for traffic that lands on the own domain, so splitting analytics by entry channel is a prerequisite for judging them.
- Because portal traffic cannot be turned into direct traffic without a visible, valuable reason (a "play on timing.love / save your progress" hook), expect portal D1 near the CrazyGames 10-15% range and D7 in the low single digits (inference, no data).

### Gaps
- No share-of-traffic data (portal vs direct) for indie web games.
- No official Poki favourites/bookmark feature or return-visit stats located.
- Whether PWA install/web push work inside portal iframes was not verified.
- No independent study isolating PWA or push uplift for games.

---

## 3. Which early-session factors correlate most with D1 and D7?

### Takeaway
No rigorous public study quantifies the correlation of tutorial completion or first-session length with D1/D7. The consistent practitioner finding: friction before first fun, tutorial length/complexity, early difficulty spikes and perceived progression drive D1; sessions per day and perceived progression drive D7+. Treat all numbers as directional.

### Cited Findings
- Microsoft Research / UW "First Hour Experience" paper: the first sustained session acts as a probationary period where players check the game against expectations; intrigue and information matter about as much as momentary fun. — [Microsoft Research PDF](https://microsoft.com/en-us/research/wp-content/uploads/2016/02/First20Hour20-20CHIPlay20201420-20preprint2.pdf)
- Time to first fun: pick one core-loop moment, instrument every step from launch to it, track median and distribution. — [Bugnet](https://bugnet.io/blog/how-to-measure-player-time-to-first-fun)
- Case: a Devtodev case reports a heavy, slow tutorial drove churn; optimising it raised D1 by 10% (relative/absolute not stated; vendor). — [Devtodev: optimise your tutorial](https://www.devtodev.com/resources/articles/how-to-optimize-your-game-tutorial)
- Anecdote: Roblox developer, self-reported, D1 6% to 15% after shortening a tutorial from 5 to 3 steps; 45% left within 30 seconds, reduced to 18% by giving a clear first action. Single unverified Reddit post. — [Reddit snapshot](https://reddit.sentinel-team.org/posts/1sakqj4/snapshots/2026-04-03T05%3A12%3A52.21453Z)
- Another developer in the same thread saw session length and puzzle-solve rate improve from an easier first puzzle but "no consistent trend for D1". — same source
- Hyper-casual consultant case: an app with good D7/D30 lost a large share on D1; fixes were fewer taps/screens to the first action and teaching mechanics when relevant. — [Strivecloud](https://www.strivecloud.io/blog/top-app-retention-strategy-to-master-from-day-1)
- Claimed rules of thumb (unsourced originals): about 60% of players quit games that get too hard too quickly; good onboarding can lift retention up to 50%; delay permission prompts until after play. — [Segwise](https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies.md)
- Developer Automaton interview: logs showed players waiting before touching controls, not confused by instructions; shortening the tutorial by 30 s visibly improved retention (anecdote). — [Automaton](https://automaton-media.com/en/?p=55361)
- A puzzle publisher claims session length predicts long-term retention better than any early metric (target D0 session over 15 min); internal threshold, data not shown. — via [search summary of VGM blog](https://vgm.co/blog/what-your-day-30-drop-off-is-actually-telling-you-about-your-game-s-first-hour)
- Hyper-casual publisher postmortem (Game Developer): a game rejected by the publisher had "good retention, but low playtime, high CPI and plummeting ratings"; after six months of changes D1 went 39.3% to 60%, D1 playtime 16 to 30 min; interstitials every ~45 s had hurt long-term retention. — [Game Developer](https://www.gamedeveloper.com/business/developing-a-hyper-casual-project-that-got-turned-down-by-a-publisher-because-of-the-metrics)
- CrazyGames' own advice for D1: meaningful progression (levels, unlocks, upgrades), daily hooks (login bonuses, quests), saved progress, fix bugs; for playtime: players always know their next goal, introduce mechanics gradually, challenging but fair difficulty curve. — [CrazyGames docs](https://docs.crazygames.com/resources/basic-launch-metrics/)
- Completers retain better than non-completers is a correlation, partly self-selection; test by A/B, not by comparing completers (noted in the search synthesis; a methodological caution, no source number).

### Inferences
- For a one-tap game, the first-run funnel that matters is: load, first tap, first completed round (success or crash), second round started. "Second round started" is the cleanest early engagement proxy.
- Rich systems (chests, casino, season pass, streak) shown during the first session may lengthen time-to-fun and conflict with Poki's "slow unlock systems struggle on web" warning; they should appear only after N rounds. (Inference.)
- Because D1 on portal traffic is dominated by intent, tutorial changes should be judged by same-source comparisons.

### Gaps
- No peer-reviewed or large-sample quantification of tutorial completion vs D1/D7.
- GDC talk with first-30-seconds drop-off data not found (Robinson 2013 "less than 40% return after one session" is secondhand and unverified).
- No hyper-casual-specific difficulty-curve study.

---

## 4. How to measure retention without user IDs or cookies (Umami, GDPR/EU)

### Takeaway
Umami's own hashing makes true cohort retention unreliable: its session ID is a hash of site, IP, user agent and a salt that rotates monthly by default, so mobile users who change network or UA, or cross the month boundary, look new. The workable approach is to derive "returning" signals on the client (a local first-visit/last-visit stamp, emitted as event properties), and to read them as aggregate counts per build and per source rather than per-user cohorts. In the EU, any localStorage read or write is within ePrivacy Art. 5(3); the CNIL audience-measurement exemption exists for cookies/tracers with strict conditions.

### Cited Findings
**How Umami identifies visitors (source code, master branch; version may differ from the deployed instance)**
- Session ID is a deterministic UUID of site, IP, user agent, monthly salt and optional distinctId: `uuid(sourceId, ip, userAgent, sessionSalt, distinctId ?? '')`. Salt rotation defaults to month (`SALT_ROTATION`, configurable); visit ID uses an hourly salt; a visit expires after 30 minutes of inactivity. — [Umami source, send route](https://raw.githubusercontent.com/umami-software/umami/master/src/app/api/send/route.ts)
- `umami.identify` links a session to a distinct ID (string up to 500 chars; data objects up to 50 properties; docs advise opaque IDs, no personal data). Persistence across visits is not described in the third-party docs page. — [EuroMetrics identify docs](https://eurometrics.eu/docs/identifying-visitors-umami-identify)
- Umami FAQ (via search summary): no cookies in the tracking code; users cannot be identified or tracked across websites. Retention report is a cohort chart of distinct visitors per day and how many return on later days. Event names limited to 50 chars; events accept data properties. — [Umami FAQ](https://umami.is/docs/faq), [Umami retention report](https://v2.umami.is/docs/reports/report-retention), [Umami track events](https://docs.umami.is/docs/track-events)
- Cookieless returning-visitor limits: a user who returns after a day, switches device or clears browser data is often counted as new (general statement from third-party blog, not Umami-specific). — via search summary of [Cloudzy Umami review](https://cloudzy.com/de/blog/umami-review/)

**Legal**
- ePrivacy Art. 5(3) requires consent for storing or accessing information on the terminal; audience measurement is not in the statutory exemptions, the exemption comes from regulator guidance (EDPB 2012, CNIL). — [Presencis, Art. 5(3)](https://presencis.com/regulations/eprivacy-directive/article-5-3/), [Alketech 2026](https://www.alketech.eu/blog/2026/03/23/what-consent-means-for-analytics-in-2026/)
- CNIL Sheet 16 conditions for exemption: users informed and able to object; purposes limited to audience measurement and A/B testing; no cross-referencing with other processing; scope limited to one site/publisher; last byte of IP truncated; tracer lifetime limited to 13 months. Page speaks of cookies and "tracers" and does not mention local storage specifically; it does not address unique identifiers/returning-visitor recognition. — [CNIL Sheet 16](https://www.cnil.fr/en/sheet-ndeg16-use-analytics-your-websites-and-applications)

### Inferences (practical diagnostic design, not from sources; verify legally)
- Client-side stamps without any ID: store only `firstVisitDay` (date, or even an install-week bucket) and `lastVisitDay` in the existing save/localStorage (the game already stores the save there, which is strictly functional). On load, send one event `visit` with properties `returning` (bool), `daysSinceFirst` (bucketed 0, 1, 2-3, 4-7, 8-14, 15-30, 31+), `daysSinceLast` (bucketed), `build` (version/date), `src` (portal/direct/PWA/Play, which the game already knows), `mode` (browser tab vs installed display-mode `standalone`), `visitNo` (bucketed). No identifier is sent, so no per-user linking is needed; D1/D7 are read as the share of `visit` events where `daysSinceFirst`=1 / 7 relative to new-visitor counts of that day D-1/D-7 (approximate "rolling" retention).
- Because the stamp is already in the save, the privacy delta is a derived number; but an EU regulator may treat any read of terminal storage for analytics as Art. 5(3) relevant. Document it in the privacy text (the game already has a "Visit statistics" section) and keep buckets coarse.
- Cohort by build: put the build id as a property, and compare the `returning` rate per build after changes (tutorial, streak push). Caveat: nonrandom, so compare same-source only.
- First-session funnel events (all without IDs, counted per session): `first-load`, `first-tap`, `round-1-end` (result, duration), `round-2-start`, `round-3-start`, `tutorial-done` (exists), `session-end` with rounds played and total seconds (use `visibilitychange`/`pagehide` with sendBeacon). Compute drop-off between steps and the median rounds per first session.
- Use proxies: share of `visit` events with `returning=true`, `daysSinceLast` distribution, push-opt-in rate and install-prompt accept rate (browser-reported `appinstalled`/`display-mode`), share of sessions with 2+ rounds, rounds per session, and share of sessions that open a challenge/invite link.
- Separate portal vs direct vs PWA: otherwise averaged retention hides everything.
- Segmentation by Umami referrer/UTM already splits sources without IDs; do not mix CrazyGames/itch.io traffic (analytics already disabled there, per project rules), so portal behaviour must come from the portal dashboards (CrazyGames shows D1, playtime, conversion).
- Do not use `umami.identify` with a stored random ID: it works but creates a persistent pseudonymous identifier, which breaks the "no ID" design and falls under consent.
- Umami monthly salt means cohort retention across month boundaries in the built-in retention report is unreliable; treat the built-in report as indicative only.

### Gaps
- No source found confirming Umami retention report behaviour on the deployed version (docs unreachable; code read from master).
- No authoritative statement on whether first-party localStorage flags used solely for aggregate analytics are consent-exempt in CNIL or DSK/German guidance; legal review needed.
- Umami v3 distinct-ID-based retention behaviour not verified.

---

## 5. Common failure modes for skill/timing one-tap games (and what a lightweight diagnosis would show)

### Takeaway
Sources agree that a good core loop is not enough: single-score, one-mechanic games tend to have decent D1 and rapid decay because there is no progression, no goal beyond the high score, and little reason to open the app again. The usual industry answer is a hybrid-casual layer (light progression, upgrades, live-ops, social), added carefully.

### Cited Findings
- Hyper-casual: high install volume, low D7/D30; shift to hybrid-casual models (simple core loop plus progression, upgrades, live-op events, social and leaderboard systems). — [Playio genre data](https://blog.playio.co/retention-by-game-genre), [Eximius Echo on hybrid-casual](https://eximiusecho.substack.com/p/exploring-the-rise-of-hybrid-casual)
- Typical failure points: high early churn after a couple of sessions, wearisome game design, churn after interacting with the primary action; mid-game churn when players lack a sense of progression. — [RiseUp Labs, retention metrics](https://riseuplabs.com/game-retention-metrics/)
- Short lifespans limit ad exposure and keep LTV low. Light meta-progression or goals can extend stickiness. — [Applixir](https://www.applixir.com/?p=2978)
- Over-monetization: a postmortem found interstitials (every ~45 s) hurt long-term retention; and no leaderboards or boosters for players who wanted a simpler experience. — [Game Developer](https://www.gamedeveloper.com/business/developing-a-hyper-casual-project-that-got-turned-down-by-a-publisher-because-of-the-metrics)
- Meta layers can backfire: a studio added a city-building meta layer to a hyper-casual game; rollout was mostly negative (bugs, gold from the main game not accumulating in the city), D1 retention dropped 10% though playtime rose over 25%. — [Azur Games](https://azurgames.com/blog/unsuccessful-hypotheses-when-promising-ideas-dont-reach-their-potential)
- Leaderboards/tournaments suggested to increase session frequency (vendor opinion, one survival game). — [RiseUp Labs](https://riseuplabs.com/?p=45754)
- Web-specific: heavy tutorials, complex menus and slow unlock systems struggle; replayability / "one more try" matters; rewarded ads work best as second chance or revive. — [Defold Poki best practices](https://defold.com/extension-poki-sdk/best-practices)
- Fixing rough edges and lost progress are named major reasons players don't return. — [CrazyGames docs](https://docs.crazygames.com/resources/basic-launch-metrics/)

### Inferences (map to Roundabout Timing; hypotheses to test, not findings)
- Likely hypotheses for "few returning users": (1) most traffic is portal/one-off, so low return is structural; (2) the first session may end in under a minute with no stated goal beyond a score; (3) the retention systems (streak, chests, season pass, friends) are mostly invisible or locked behind progress in the first session; (4) no day-2 reason that is visible at the end of session 1 (e.g. "come back tomorrow for X"); (5) push/install asks arrive late (the game offers push only from a daily streak of 2 - meaning only players who already returned ever see the offer); (6) casino/economy depth adds complexity without helping the core loop.
- Diagnostic signatures: high `first-tap` but low `round-2-start` points to the core feel/fail state; high `round-2/3` but low `returning` points to missing hooks or channel; returning rate high for direct but near zero for portal points to structure rather than design; high returning from PWA mode would back installs as lever.

### Gaps
- No postmortems specific to one-tap timing games with measured D1/D7 were found.
- Evidence for specific retention features (streaks, daily rewards) in web games is vendor-level only.
