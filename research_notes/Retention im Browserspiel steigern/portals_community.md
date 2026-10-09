# Portals, community and off-game channels for bringing players back to a free browser game

Research date: 2026-10-09. Tools used: web search plus fetches of official docs. Official policy statements are labelled "OFFICIAL"; third-party guides and forum posts are labelled "SECONDARY"; single-developer reports are labelled "ANECDOTE". Where a fetched page did not say something, that is stated rather than guessed.

## 1. Which portal features and metrics raise repeat play, and what do portals reward? (CrazyGames, Poki, itch.io, Newgrounds, GameDistribution)

### Takeaway
CrazyGames states publicly that Basic Launch is judged on average session playtime, conversion to gameplay and Day-1 retention, benchmarked against other games on the platform. Its guide gives only rough reference points: playtime of 10 minutes or more, D1 retention of 10-15%, conversion of 80% or more. Rankings and earnings also depend on retention. Poki and GameDistribution publish no comparable retention numbers I could find. Developer-controlled levers that CrazyGames names are saved progress, daily hooks, progression and fast load. A browser game that relies on first-visit content and has no daily hook is structurally disadvantaged in these portal metrics.

### Cited Findings

**CrazyGames: launch process and metrics (OFFICIAL)**
- Basic Launch: the game is shown to "a small segment of players" and needs only the Basic Requirements. The SDK is optional and monetization is not available. Games that "perform well during Basic Launch and are updated to meet our Full Requirements" get a second QA review for Full Launch. — [CrazyGames FAQ](https://docs.crazygames.com/faq/), [Requirements intro](https://docs.crazygames.com/requirements/intro/)
- Duration (OFFICIAL, Basic Launch Guide): Basic Launch ends once the game has been live at least 7 days AND reached at least 500 plays; if 500 plays are not reached it ends automatically after 21 days. Day-1 retention shows with an extra day of delay. Updates can be pushed at any time, are auto-approved, and show up at the next daily dashboard refresh. KPI tracking is automatic and needs no SDK; adding the SDK keeps ads disabled. — [Basic Launch metrics guide](https://docs.crazygames.com/resources/basic-launch-metrics/)
- Average playtime: "average time a player spends in the game in a single session". Benchmark: "successful titles often reach 10+ minutes". — [Basic Launch metrics guide](https://docs.crazygames.com/resources/basic-launch-metrics/)
- Day-1 retention: percentage who return the day after the first session. Benchmark: "strong games often reach 10-15%". CrazyGames' own improvement tips: add progression (levels, unlocks, upgrades), "daily hooks like login bonuses or daily quests", "save player progress", fix bugs and rough edges. — [Basic Launch metrics guide](https://docs.crazygames.com/resources/basic-launch-metrics/)
- Conversion: percentage of players who play at least one minute after starting. Benchmarks: top titles 80%+, load under 10 seconds, build under 20 MB. Tips: load the first level first and the rest in the background, shorten intros. — [Basic Launch metrics guide](https://docs.crazygames.com/resources/basic-launch-metrics/)
- The guide closes with "KPIs are a guide for direction, not a final grade." — [Basic Launch metrics guide](https://docs.crazygames.com/resources/basic-launch-metrics/)
- Outcome logic (OFFICIAL, via search summary of the Basic Launch Guide and requirements pages): metrics are "benchmarked against other games on the platform". If all metrics meet or beat benchmarks, the developer is invited to update the game and submit for Full Launch. If some meet them, the developer may be invited to improve the game and request another Basic Launch. If most fall short, the game cannot proceed. — [CrazyGames docs home](https://docs.crazygames.com); the same text is reproduced by [Cinevva guide](https://app.cinevva.com/guides/publish-game-crazygames) (SECONDARY)
- Rankings and earnings (OFFICIAL): the FAQ says ranking placement is driven by engagement metrics including "play count, average playtime, retention", and that earnings depend on "player engagement, retention, and overall popularity". No numeric retention target is given there. — [CrazyGames FAQ](https://docs.crazygames.com/faq/)
- Rejected games can be resubmitted after "meaningful improvements". Common rejection reasons listed: bugs or broken mechanics, missing English support, unoriginal content, inappropriate content. — [CrazyGames FAQ](https://docs.crazygames.com/faq/)
- A game on the developer's own domain is treated as a regular submission; CrazyGames may iframe it, and externally hosted games earn revenue only if the SDK is integrated correctly. Publishing on other portals does not affect revenue-share eligibility, but the game must not carry another portal's branding. — [CrazyGames FAQ](https://docs.crazygames.com/faq/)
- Technical: for externally hosted or loaded files QA checks "time it takes to reach gameplay (≤ 20 seconds)". Mobile homepage eligibility needs an initial download of 20 MB or less; the game should work in the CrazyGames App with safe-area padding; sitelocks must whitelist each CrazyGames domain and the iOS and Android app origins. Games that collect personal data beyond SDK events need a Terms and Privacy notice. — [Technical requirements](https://docs.crazygames.com/requirements/technical)
- Dashboard default metrics: players, average playtime, gameplay conversion, retention, revenue. — [Requirements intro](https://docs.crazygames.com/requirements/intro/)

**CrazyGames: Data module, accounts, saving (OFFICIAL, via search summary of the docs)**
- The Data module saves for logged-in users and syncs across devices; guest data goes to LocalStorage and is synced into the account when the guest later logs in. The progress-save option must be ticked on the submission form or the module is disabled. Limit is 1 MB, saves are debounced (1 s, up to 30 s). Docs advise relying fully on the Data module for both guests and logged-in users rather than local saves. — [CrazyGames Data module docs](https://docs.crazygames.com/sdk/data/)
- Automatic Progress Save (APS) backs up localStorage/IndexedDB with no implementation, but is not allowed for games with in-game purchases. — [CrazyGames APS docs](https://docs.crazygames.com/other/aps/)
- Account integration: basic integration means guests and registered users both play as guests by default and external login options (Facebook, Google, e-mail) are disabled; CrazyGames "will later require full integration once a game proves successful". For games with a custom back-end, logging out in-game and offering external login is not allowed; other sign-in providers must be linked to CrazyGames accounts through the provided link modal. — [Account integration](https://docs.crazygames.com/requirements/account-integration/)

**Poki (OFFICIAL, partly via search summaries)**
- "Remove splash screens and outgoing links." "No branding or external ads." The studio logo is welcome on the loading screen. Any button that opens an external link (example given: "opening a YouTube channel or Discord community page") must call `PokiSDK.openExternalLink('URL')` instead of linking directly. — [Poki requirements and quality](https://developers.poki.com/guide/requirements-quality)
- Poki blocks all external requests by default; fonts, assets, libraries must be bundled. Only Poki's ad system is allowed. Ad-block circumvention is not allowed. Wrap localStorage in try/catch because incognito restricts it; "implement progress saving where appropriate, or clearly inform players when progress won't be saved". — [Poki requirements and quality](https://developers.poki.com/guide/requirements-quality)
- Revenue by traffic source (SEARCH SUMMARY of sdk.poki.com, not re-verified by fetch): a user who reaches the game directly, through bookmarks, search, social media or the developer's own community yields 100% of the revenue for that user. A third-party guide says traffic Poki brings is split 50/50, which I could not confirm. This is a stated incentive for developers to bring their own returning players. — [Poki SDK site](https://sdk.poki.com/); [Cinevva Poki guide](https://app.cinevva.com/guides/publish-game-poki) (SECONDARY)
- Poki's public metrics language (2016 Google case study, internal use): a custom "Pure Game Time" metric excluding ad and loading time, plus D1/D3/D7 retention and drop-off rate. This describes Poki's own studio analytics, not the developer dashboard. I found no official developer-facing definition of "plays per user" or "return rate" on Poki. — [Google Developers Blog, 2016](https://developers.googleblog.com/en/app-monetization-insights-how-poki-cleverly-tests-their-games-before-launching)

**itch.io (mostly SECONDARY / forum)**
- An itch.io admin says linking out is not banned, but pages that are only links elsewhere are not indexed or promoted by discovery tools; an archived creator-docs snippet (2024) says a page must be purchasable, downloadable or browser-playable to be indexed. — [itch.io forum](https://itch.io/t/708156/on-itchio-is-it-okay-to-post-a-game-that-is-primarily-a-link-to-an-external-site)
- Devlogs notify followers: a 2026 guide recommends devlogs as a recurring audience tool and lists "going silent after launch" as a common mistake. — [Cinevva itch.io guide](https://app.cinevva.com/es/guides/get-more-plays-itch-io) (SECONDARY, vendor)
- A user comment describes itch.io's daily rhythm: the top 10-20 voted games are listed so "returning users know where to go". — [itch.io forum](https://itch.io/post/63727) (ANECDOTE)
- The Steam-widget thread: a moderator knew of no rule against adding store links such as Steam to the page. — [itch.io forum](https://itch.io/t/2255036/is-it-allowed-to-add-a-steam-widget-to-my-itchio-page)

**Newgrounds (DOCS via search summary)**
- Newgrounds.io offers medals (including secret ones, with visible progress), scoreboards with period filters (usable for daily/weekly boards) and cloud saves (up to 3 free slots per one plugin note); the API was labelled "early BETA". — [Newgrounds wiki](https://www.newgrounds.com/wiki/creator-resources/newgrounds-apis/newgrounds-io), [Newgrounds API wiki](https://newgrounds.wiki.gg/wiki/Newgrounds_API)
- Takeover Tuesday: announced 8 Oct 2024 by Tom Fulp as a weekly event where Supporters can feature one submission from any portal on the homepage. — [Newgrounds wiki: Takeover Tuesday](https://newgrounds.wiki.gg/wiki/Takeover_Tuesday)

**GameDistribution (SECONDARY, weak)**
- A third-party SDK vendor lists GameDistribution as forbidding external links. A GameDistribution representative on html5gamedevs once said they were testing games without outgoing links to raise gameplay time and ad impressions and were "still allowing" games with links for now (undated thread, probably old). I found no current official GameDistribution rule. — [GamePush docs](https://docs.gamepush.com/docs/get-start/platform), [html5gamedevs thread](https://html5gamedevs.com/topic/43949-funny-request-gamedistributioncom)

**Kongregate**: I found no 2023-2026 sources on Kongregate developer features or policy (see Gaps).

### Inferences
- The only portal that publishes numeric retention targets is CrazyGames (D1 10-15%, playtime 10+ min). For a one-tap timing game with short rounds, "average playtime per session" is structurally at risk of being below the 10-minute reference even when D1 retention is fine. Any session-length-raising feature (levels, shifts, unlocks that chain rounds) helps the portal metric directly.
- CrazyGames' own improvement list for D1 (progression, daily hooks, saved progress) matches what the game already has (daily streak, career, collection). What matters is whether those are visible and working inside the CrazyGames iframe on the first session. The Data module is the "official" save path there; anonymous localStorage may not survive if the game is the "not startable" case.
- Because the Basic Launch window is short (min 7 days, up to 21 days, or 500 plays) and updates are auto-approved, a rejected or stalled launch can be fixed by shipping quickly and re-watching the daily dashboard. This is an inference from the guide; I did not find an official statement on how re-requests are handled in practice.
- Poki's per-source revenue rule (if the search summary is accurate) rewards returning players who come back via bookmark/search; this supports pushing "add to home screen / bookmark" prompts where policy allows.

### Gaps
- No official CrazyGames numeric thresholds beyond the three rough reference points; "benchmarked against other games" means the real bar is relative and unpublished.
- Nothing found on Poki's developer-facing definitions of retention, "plays per user" or "return rate", and nothing official on how Poki's algorithm ranks games.
- Kongregate and GameDistribution: no current, primary-source policy on retention features or links.
- Could not fetch Poki's revenue-share page (404) or CrazyGames branding page (404); the Poki 100%-direct-traffic claim comes from a search-engine summary of sdk.poki.com.
- No source on whether portals rank on "return visits" as such. CrazyGames says "retention", which is plausibly D1/D7-style; the exact formula is not published.

## 2. Practical, policy-compliant ways to move portal players to own site, PWA or Discord

### Takeaway
Each portal restricts outbound promotion differently. CrazyGames allows community links (Discord, developer website) only on the game menu, never as the main call to action, and never if they lead directly to a playable web version. Poki wants outgoing links removed unless routed through `PokiSDK.openExternalLink`. App Store links are never allowed in CrazyGames games. The reliable, compliant path is therefore: use portal metadata fields and developer profile, keep in-game links secondary, and build brand-search so players find the own domain later.

### Cited Findings

**CrazyGames (OFFICIAL, Gameplay requirements, fetched)**
- "The game should not include cross-promotions for external or internal games/platforms."
- Exception: "Community links (discord, dev website, ...) are allowed on the game menu only" and must not lead "directly to a playable web version", and must not be "a main CTA on the menu".
- "Game Store (Epic, Steam, ...) links to the game on desktop games only on main menu or at the end of a demo game."
- "App Store links are never allowed in-game"; use the game metadata fields in the Developer Portal instead.
- "Backlinks to CG home or category page are accepted but not promoted." Links to other games in the same series are allowed.
- "Custom in-game fullscreen buttons are prohibited." Game must be PEGI 12 compliant. "Games should land new users in gameplay immediately."
— [CrazyGames gameplay requirements](https://docs.crazygames.com/requirements/gameplay/)
- Developers who repeatedly submit non-compliant games may face restrictions on future submissions (search summary of the same page).
- The Basic Implementation list includes "No external ads" and "No external login options". — [Requirements intro](https://docs.crazygames.com/requirements/intro/)
- CrazyGames does not iframe games from competing portals, only independent domains; it explicitly allows a game on the developer's own domain to be submitted. — [CrazyGames FAQ](https://docs.crazygames.com/faq/)

**Poki (OFFICIAL)**
- External links must go through `PokiSDK.openExternalLink`, outgoing links and splash screens should be removed, studio logo allowed on the loading screen only. Deal terms bar promotions or commercial communication not approved by Poki (search summary of sdk.poki.com/deals). No in-game chat except Poki Guardian; social logins and e-mail login not allowed. — [Poki requirements](https://developers.poki.com/guide/requirements-quality), [Poki SDK site](https://sdk.poki.com/)

**itch.io (SECONDARY)**
- No rule found against linking out or against store links; the constraint is that the page must itself offer a playable/downloadable game to be discoverable. — [itch.io forum](https://itch.io/t/708156/on-itchio-is-it-okay-to-post-a-game-that-is-primarily-a-link-to-an-external-site)

**PWA install evidence**
- Rakuten 24 (web.dev case study, Google, e-commerce, not a game): making the web app installable plus a custom install prompt gave "450%" higher visitor retention over one month vs the previous mobile web flow; effect bundled with other changes and relative to a low baseline. — [web.dev Rakuten 24](https://web.dev/case-studies/rakuten-24)
- ANECDOTE (Indie Hackers party-game developer, six months of data, per search summary; page itself returned 403): PWA install prompt rate "sits in low single digits"; most users bookmark or reopen from chat history; developer expected native push to raise repeat visits. — [Indie Hackers post](https://www.indiehackers.com/post/pwa-vs-native-app-for-a-party-game-what-6-months-of-data-say-about-retention-da126462bb)
- Many pages claim PWA retention uplifts of 15-35% or 2-3x; I could not find verifiable sources for these and exclude them.

**Discord**
- Discord's developer docs state that games with official communities see players invest in the game, give feedback and bring in others (Discord says it hosts 9,000+ official game communities with 80M+ members; vendor claim). — [Discord developer docs](https://docs.discord.com/developers/game-development/how-to-grow-your-game.md)
- Marvel Rivals launched its Discord long before the game and funnelled players from the launcher into the server (Discord case study, vendor-promoted). — [Discord case study](https://discord.com/developer-case-studies/marvel-rivals)

### Inferences
- For CrazyGames, the compliant pattern is a small, secondary "Community / Discord / Website" row in the game's menu or Settings, never the first or primary button, never labelled as "play on our site", and never linking to a playable web build. Linking to timing.love (a landing/community page, not the game) is plausible but the "dev website" example is ambiguous when the same domain hosts a playable build; the safest route is to send to a news/community page, and to confirm with CrazyGames support.
- The existing in-game `?crazygames` detection should hide anything that violates the portal's rules (Install button, Google Play link, ads other than the CG SDK, external ads). The project already does this for Play Store and install buttons.
- Brand search is the only fully policy-free off-portal return path: a distinctive name (Roundabout Timing, "RAT") plus the portal listing text and developer profile that names the own domain. Portals' own fields (developer page, game description metadata) are the sanctioned place for the URL where in-game rules forbid it.
- Realistic expectations: PWA install rates in the low single digits (ANECDOTE) mean the PWA is a retention tool for a small committed minority, not a conversion funnel for portal visitors.

### Gaps
- I could not confirm the exact wording of CrazyGames' "Community links" rule for same-domain playable builds, nor whether the developer profile/metadata allows a URL. A support question to CrazyGames is the only definitive route.
- No official source on whether iOS/Android install prompts are allowed inside the CrazyGames iframe (the project already hides the install button in the portal context).
- Poki's `openExternalLink` allows Discord/YouTube links by example, but I could not verify whether it is whitelist-based.
- No data on how many portal players ever click a Discord/community link.

## 3. Community and content cadence of successful tiny indie web games; measurable return effect

### Takeaway
Reliable, public numbers connecting Discord size, devlogs, short-video content or daily-share mechanics to measured return rates for small browser games are scarce. What exists is advice (indie dev blogs, vendor case studies) and a few famous single cases (Wordle). Treat cadence advice as direction, not as proof of effect size.

### Cited Findings
- Wordle (SECONDARY, analytics blog): launched October 2021 by Josh Wardle; reported growth from 90 players on 1 November 2021 to 300,000 by the end of the year; social sharing was the main growth driver; Wardle credits the one-puzzle-per-day limit and the shared daily word for scarcity and shareability; no sign-up needed; reported decline of about 91% between February and September 2022 (secondary estimate, treat cautiously). NYT bought it in early 2022 for a reported low seven-figure sum. — [MoEngage analysis](https://www.moengage.com/blog/wordle-viral-growth-story/), [Onmanorama](https://onmanorama.com/news/world/2022/02/01/nyt-acquires-popular-online-word-puzzle-wordle.amp.html)
- Indie advice (SECONDARY, vendor/blog, not browser-specific): set up Discord and devlogs before launch, small regular updates beat silence, watch for ghost-town servers (empty servers hurt), and moderation needs clear rules and an appeals process. — [Wayline: Discord is King](https://www.wayline.io/blog/discord-community-indie-game-marketing), [Wayline: early access retention](https://www.wayline.io/blog/indie-early-access-retention-resurrection)
- Large-studio Discord numbers are self-reported by Discord: Tencent's Delta Force server about 800,000 members with "30-50% retention" (definition not given). Not comparable to a tiny web game. — [Discord case study via casestudies.com](https://www.casestudies.com/company/discord/case-study/tencent-games-grows-discord-community-to-800k-members-with-30-50-retention)
- Daily mechanics: Duolingo reports 84% current-user retention (Q2 2026, company metric), not isolated to streaks; an internal analysis suggested 10-day-streak users were less likely to drop off but with selection bias. No controlled study on streaks in daily puzzle games found. — [Pulse 2 on Duolingo Q2 2026](https://pulse2.com/duolingo-daily-active-users-reach-58-7-million-as-retention-hits-record-84-and-social-accounts-top-1-billion-organic-impressions/), [Marketing Mastery Substack](https://marishalakhiani.substack.com/p/breaking-down-duolingos-growth-model)
- Reddit (SECONDARY): large game subreddits typically cap self-promotion at about 10% of a user's activity and remove accounts that mainly promote; r/Games says to be a participating member first. I did not find r/WebGames' own rules. — [r/Games FAQ mirror](https://axebps-redlib.hf.space/r/Games/wiki/faq)
- Bluesky (SECONDARY): game developers use labeler/starter packs/feeds to find players and peers; a Polygon Treehouse director reported better engagement on Bluesky than other platforms (2024-25 anecdote). A 2026 stats roundup says registered users reached 43.5M in April 2026 but daily actives fell about 40% year over year through October 2025. — [Game Developer: Bluesky](https://www.gamedeveloper.com/business/what-are-game-developers-getting-out-of-bluesky-), [Marketful stats](https://marketful.com/bluesky-statistics)
- Adventure Box (a 3D user-generated-content platform, SECONDARY press release): 197,580 visitors in a month, 23% returning. Loose comparison only. — [Adventure Box release](https://news.bequoted.com/newsroom/adventure-box/pressreleases/adventure-box-improved-key-figures-40564)
- A general web-games guide suggests D1 above 25% as good, D7 above 10% strong, stickiness 10-15% typical for casual web games; low-authority source. — [Abratabia analytics guide](https://abratabia.com/game-marketing/game-analytics.php)

### Inferences
- The strongest evidence-based hook in this research is not a channel but a mechanic: Wordle's once-a-day shareable result. For Roundabout Timing, the existing friend code, Challenge short links with server-drawn preview images and Daily Streak are the analogous structure; the share artifact (preview image) is what travels off-platform.
- Short-video and Discord numbers for tiny web games are not available in public sources; the cadence recommendation is to treat each as a cheap experiment and measure with the existing Umami events (referrer, `tutorial-done`, `shift`).
- Because Umami is cookie-less and ID-less, "returning player" can only be estimated through events/referrers or from the game's own local stats; the project's design (no IDs) limits portal-style D1 measurement outside CrazyGames' own dashboard.

### Gaps
- No postmortem found for a tiny browser game with Discord size, devlog cadence and measured D1/D7 effect.
- No reliable numbers for TikTok/Shorts effects on browser game return rates.
- r/WebGames, r/incremental_games and r/gamedev rules and reported results were not retrieved.
- No verified io-game case study (Slither/Krunker-type) with returning-player numbers; GeoGuessr case not retrieved.

## 4. Newsletter or Discord as a retention channel for anonymous players: opt-in rates and GDPR-friendly implementation

### Takeaway
No game-specific newsletter opt-in benchmark was found. General website signup rates are about 2% (top performers about 5%); double opt-in is best practice, and in Germany effectively the norm, which cuts raw signups (only 50-70% confirm). Web push is the lighter-weight alternative that the game already has; hard numbers for browser push opt-in in games are old or vendor-supplied.

### Cited Findings
- General website e-mail opt-in: about 1.95% average; top 10% about 4.77%. — [Studio Wombat / aggregated stats via search](https://www.studiowombat.com/blog/popups-are-annoying-here-is-a-solution/); [Klipfolio](https://www.klipfolio.com/kpis/digital-marketing/newsletter-signup-conversion-rate) (SECONDARY)
- Listagram (spin-to-win popup vendor) reports 10.8% conversion across its network; self-reported e-commerce figure, not games. — [Listagram](https://listicler.com/tools/listagram) (SECONDARY, vendor)
- GDPR does not literally require double opt-in (iubenda); it is best practice, and German case law makes it the safest evidence of consent. Only 50-70% of subscribers click the confirmation mail. — [iubenda](https://www.iubenda.com/en/blog/gdpr-double-opt-in-2/), [aceart.de](https://www.aceart.de/en/glossary/double-opt-in) (SECONDARY, partly vendors; confirm with a German lawyer)
- Web push (SECONDARY): MoEngage (labelled 2023) reports a web-push subscription rate range of 0.5-15% depending on device and industry, average click rate about 12%, Chrome about 90% of web-push subscribers. Pushwoosh 2025 mobile app benchmarks: hyper-casual game push CTR iOS 0.82%, Android 1.05%. Older Localytics 2015 data: users with push enabled had one-month retention of 56% vs 15% without (correlation). — [MoEngage push statistics](https://www.moengage.com/learn/push-notification-statistics), [Pushwoosh benchmarks](https://www.pushwoosh.com/blog/push-notification-benchmarks/)
- CrazyGames Basic Implementation allows no external login options; Poki bans e-mail login. Both would conflict with an e-mail collection form inside the portal build. — [Requirements intro](https://docs.crazygames.com/requirements/intro/), [Poki requirements](https://developers.poki.com/guide/requirements-quality)

### Inferences
- With "no accounts, no email" as a design principle, a newsletter breaks the privacy-first stance and adds GDPR work (double opt-in, unsubscribe, processor contract, privacy-policy update, `LEGAL_UPDATED`). Opt-in would likely be a low-single-digit percentage of those shown the form; the effect on game returns is unmeasured.
- Lower-friction owned channels fitting the model: the already-built Web Push (opt-in after a Daily Streak of 2), a Discord link on the own domain and in Settings, and an RSS/changelog page (the existing `/changelog.json`). Newsletter can live only on timing.love and never in the portal builds.
- A cheap Discord pattern for anonymous players: a "Join" link in Settings plus rewards that do not need identity (e.g. friend code in a pinned channel); this stays portal-safe if it is outside the portal build or secondary.

### Gaps
- No game-specific newsletter opt-in rates; no browser-game data on push opt-in or return lift from 2024-2026.
- No numbers on Discord join rate from in-game links.
- Legal specifics of using Umami plus newsletter in Germany were not researched here.

## 5. Case studies of small browser games with returning-player numbers

### Takeaway
Hard public numbers on returning players for small browser games are rare. The best-documented items are Wordle's viral curve and decline (secondary sources), CrazyGames' own benchmark thresholds, and a few anecdotes. Anything claiming 30-50% PWA or push retention uplift is unsourced marketing.

### Cited Findings
- Wordle: see section 3. Daily scarcity plus shareable results plus no sign-up, followed by decline after the peak. — [MoEngage](https://www.moengage.com/blog/wordle-viral-growth-story/)
- Poki 2016 (Google case study): Poki tracks D1/D3/D7 retention and "Pure Game Time" per game when deciding which games to push. — [Google Developers Blog](https://developers.googleblog.com/en/app-monetization-insights-how-poki-cleverly-tests-their-games-before-launching)
- Mobile-game baselines (SECONDARY, GameAnalytics via vendors): D1 around 29%, puzzle around 32%, D7 around 8%, D30 under 3%. CrazyGames' own D1 benchmark (10-15% "strong") is lower, which matches that browser traffic is less committed than installed-app traffic. — [RiseUp Labs retention metrics](https://riseuplabs.com/game-retention-metrics/), [CrazyGames metrics guide](https://docs.crazygames.com/resources/basic-launch-metrics/)
- Playnomics (2012): 85% of new US social-game players do not return after the first day. Old and Facebook-era. — [GamesBeat](https://gamesbeat.com/grim-but-real-player-stats-85-percent-of-social-gamers-do-not-return-after-the-first-day-playing/)
- Itch.io devlog (ANECDOTE): a browser-game developer warns that tracking new vs returning users matters, otherwise "people play my game once". — [itch.io devlog](https://itch.io/devlog/376678/analytic-techniques.amp)

### Inferences
- A realistic D1 target for portal-sourced traffic is the CrazyGames "10-15% is strong" range, not mobile-app 25-30%.
- The common thread in the (thin) evidence: zero-friction start, a once-a-day or streak hook, a shareable artifact, and fast iteration after first data.

### Gaps
- No verified numbers for Slither, Krunker, GeoGuessr, or small indie puzzle games on returning players or what they credit; searches returned only generic vendor content.
- No Kongregate-era or 2023-2026 Kongregate data.
- No reliable source of retention numbers for itch.io browser games.

## 6. Seasonal and trend hooks and their effect on return traffic

### Takeaway
Seasonal updates (Halloween, Christmas) are common among itch.io HTML5 games, but I found no published before/after traffic or retention numbers for a small browser game. Evidence of effect is general F2P commentary, not measured data.

### Cited Findings
- Itch.io devlogs show a routine of Halloween updates in the browser-game scene (themed music, an extra ending, staggered two-part releases timed for 31 October). None report visitor numbers. — [Love at First Bite devlog](https://itch.io/devlog/1097432/halloweeen-update.amp), [Cubi Halloween update](https://itch.io/devlog/815572/cubi-halloween-update-part-1-now-out.amp)
- General F2P commentary (SECONDARY): players play more actively during events, with a risk of fatigue and a drop in sales after events. No numbers. — [search summary, undefined source quality]
- Star Citizen's Invictus postmortem: the event produced the highest DAU ever and server crashes despite multi-year forecasting. Not a browser game. — [Star Citizen wiki comm-link](https://api.star-citizen.wiki/comm-links/17671)
- Newgrounds Takeover Tuesday (OFFICIAL wiki, Oct 2024) is a recurring weekly feature slot on that portal. — [Newgrounds wiki](https://newgrounds.wiki.gg/wiki/Takeover_Tuesday)
- Large claims such as "+120% over baseline" for events were found only on uncited pages and are excluded.

### Inferences
- Today is 2026-10-09: a Halloween content update (weather, night mode, skin, daily-streak event) can still ship before 31 October. Since CrazyGames' Basic Launch accepts auto-approved updates mid-test, a seasonal change can be used to refresh an ongoing test.
- Seasonal content costs the same as other updates but also doubles as a news hook for devlog, Discord and short-video posts; the effect has to be measured with the project's Umami events (compare the same weekdays before and after).
- The Patch Notes/changelog API already gives a ready-made announcement feed.

### Gaps
- No quantified seasonal effect for small browser games; the only way to get a figure is the project's own analytics.
- No portal-published seasonal rankings (CrazyGames/Poki seasonal tags or collections) were retrieved.
