# CTR benchmarks and A/B-testing methods for game thumbnails and store assets (solo dev, small traffic)

Research date: 2026-10-08. Sources are 2016-2026; age is flagged where it matters. "Anecdote" means a forum post or devlog by one developer, not a dataset.

## 1. Realistic CTR benchmarks: is 1.0% low for a game tile?

### Takeaway
On browser-game portals, 1.0% is roughly average-to-OK, not low. itch.io staff call "above 1%" good, and Poki's own example category average is 1.5%. CrazyGames publishes no benchmark, and the only public CrazyGames number I found is a 0.4% devlog (n = 23 clicks). CTR depends heavily on where the tile is shown and how many impressions it gets, so compare like with like. Google Play has no "CTR" in the portal sense. Its published benchmarks are page-view-to-install conversion, which is a different funnel step.

### Cited Findings
**itch.io (best-documented numbers)**
- Definition: an impression counts each time itch.io shows your title and thumbnail on the homepage, feed, recommendations or browse pages. CTR is how often an impression led to a click on your page. Both metrics only cover the last week of data (update of 2018-02-21). — [itch.io update](https://itch.io/updates/updates-to-project-analytics-filtering-collections-impressions-and-more)
- itch.io admin leafo, Feb 2018 (older source): "The games on the top of our browse pages have a CTR around .6 to 1.3." He also said CTR varies by impression source. — [itch.io thread](https://itch.io/t/197172/new-analytics-ctr-context)
- leafo, about 2018: "Anything above 1% is good, and having 3% is really good I would say." Higher impression counts correlate with lower CTR because broad traffic is less targeted. — [itch.io thread](https://itch.io/t/278399/whats-your-ctr-whats-a-good-ctr)
- Same thread, anecdotes: one dev with ~500,000 impressions reports ~1-3.5%. Others report 0.5% (~2,500 impressions), 1.3%, 1.6% (~400 impressions), and 0.84% rising to 2% (1,424 impressions). Small-n numbers are noisy. — [itch.io thread](https://itch.io/t/278399/whats-your-ctr-whats-a-good-ctr)
- 2020 jam thread, anecdotes from about 15 devs: values from 0.17% to 2.08%, with outliers at 5.28% and 15%. A commenter said "anything with 1+% is already pretty good and if you go over 2 it is like crazy good." — [itch.io thread](https://itch.io/post/1928117/view-in-topic)
- Another anecdote: 7-day impressions of 150k at 0.54% CTR. A dev reported CTR above 1.5% early that declined after the game reached a popular page. — search-result summary of [itch.io post](https://itch.io/post/361985); I did not verify the exact wording.

**Poki**
- Web Fit Test: CTR is "how many players who saw your thumbnail clicked it." Each metric (CTR, time on page, conversion-to-play) is scored 0-5 against category averages. The page's own example says action and adventure games average 1.5% CTR, 4 minutes on page and 70% C2P. — [Poki Web Fit Test](https://developers.poki.com/guide/web-fit-test)
- Test mechanics: about 10,000 players, 3-5 days, shown on several category pages, cannot be stopped once started. — [Poki Web Fit Test](https://developers.poki.com/guide/web-fit-test)
- "Your game thumbnail is the single most important factor for click-through rate on Poki." Thumbnails influence conversion-to-play only indirectly, by setting expectations. — [Poki thumbnail guide](https://developers.poki.com/guide/game-thumbnail)
- Poki's other targets are C2P of 65% or more and 5+ minutes of playtime. "Good playtime, low CTR in web fit" is described as typically a thumbnail problem. — [Poki reading results](https://developers.poki.com/guide/reading-results)

**CrazyGames**
- Anecdote (one Strategy-category game, Basic Launch, day 2): 6,100 impressions, 23 clicks, 0.4% CTR. The dev's "2-4%" target is stated without a source. He blamed a wrong category, an unclear thumbnail, and a tutorial CTA. — [Larss IO devlog](https://fxf8.itch.io/larss-io/devlog/1586849/launching-a-1v1-strategy-game-on-crazygames-04-ctr-and-what-im-learning)
- CrazyGames FAQ: the Basic Launch (soft launch) gathers "real player data (retention, playtime, CTR, conversion to gameplay)" but no thresholds are published. Ranking depends on "play count, average playtime, retention, conversion, and player feedback." — [CrazyGames FAQ](https://docs.crazygames.com/faq/)
- Anecdote from a devlog and web summary: the carousel tile renders at about 200x112 px, so detailed 1920x1080 art loses impact. This is unverified by CrazyGames docs.

**Google Play (different metric: page view to install)**
- AppTweak 2025 (US): average Google Play page-view-to-install conversion is 16.15%. Games-Strategy is the lowest at 6.6%. AppTweak does not publish a full Games sub-category table in the article I fetched. — [AppTweak 2025](https://www.apptweak.com/aso-blog/mobile-app-store-conversion-rate-benchmarks-per-category)
- Conflict: a search summary cites an earlier AppTweak figure of ~27.3% for H1 2024 (US). Other blog summaries give "Games 25-40%", which I could not trace to a primary source. Treat all as rough and methodology-dependent. — [AppTweak 2024](https://www.apptweak.com/aso-blog/average-app-conversion-rate-per-category)
- Play Console itself shows your store-listing conversion against peer-group median, 25th and 75th percentiles per category. This is the authoritative benchmark for your own app. — [Phiture on the Play Console benchmarks](https://phiture.com/asostack/the-new-google-console-beta-new-acquisition-report-insights-to-keep-your-app-quality/)

**Not found**
- No primary-source CTR benchmarks for Newgrounds, GameDistribution or Y8.
- No primary-source Play "impression to store-visit" rate for Games (Explore/search impressions).

### Inferences
- Treat 1.0% as "median-ish". Poki's example (1.5%) and itch.io's "above 1% is good" bracket it. CrazyGames is not directly comparable: tiles sit in dense carousels and the Basic Launch audience is small.
- Thumbnail CTR and page-to-play conversion are separate funnel steps. CTR measures the tile (the thumbnail, title and hover preview). Conversion-to-play measures load speed, onboarding and whether the thumbnail promised what the game delivers. Don't read a CTR change as a gameplay verdict, and don't tune CTR in a way that raises it but lowers C2P (misleading art).
- CTR is not stable per game. It falls as impressions scale into broader traffic, so a change in rank or placement can move CTR with no art change.
- Google Play "conversion" (16-27%) is not comparable to portal CTR (~1%): different funnel step, different intent.

### Gaps
- No statistically solid public CTR distribution for CrazyGames, Newgrounds, GameDistribution or Y8.
- No primary Play Console number for the Games-category median. It exists only inside each developer's Console.
- Whether CrazyGames shows impressions and CTR in the public dashboard docs is unconfirmed (see section 2).

---

## 2. Platform analytics and whether thumbnails can be swapped and compared

### Takeaway
Only Poki and Google Play have documented A/B or experiment mechanics. On CrazyGames and itch.io you can swap the cover and compare before/after, but there is no documented built-in A/B. CrazyGames says cover updates for Basic Launch games go live instantly and other updates are usually processed the same working day. Poki requires review of post-launch thumbnail changes.

### Cited Findings
- CrazyGames: the Developer Portal dashboard shows "detailed stats and insights"; the docs list players, average playtime, gameplay conversion, retention and revenue. CTR and impressions are mentioned in the FAQ as Basic Launch signals. I could not confirm whether the dashboard displays CTR or impressions to developers; the one devlog (above) shows impressions and clicks, so something is visible. — [CrazyGames FAQ](https://docs.crazygames.com/faq/)
- CrazyGames update timing: "Updates are usually processed within the same working day. Game and art updates for Basic Launch games go live instantly." — [CrazyGames FAQ](https://docs.crazygames.com/faq/)
- CrazyGames covers: three required sizes (1920x1080 landscape, 800x1200 portrait, 800x800 square), kept visually consistent. Preview videos of 15-20 s in landscape and portrait, starting from the static cover as the first frame. The docs say "Updating your game cover is an excellent way to encourage players to revisit your game," and updates "often correlate with session spikes." The docs do not mention CTR, A/B tests or re-review. — [CrazyGames game covers](https://docs.crazygames.com/requirements/game-covers/)
- Poki: before the Web Fit Test is completed, thumbnails can be updated freely. After launch, changes need Poki developer-support approval and "should accompany substantial content updates." "A fresh thumbnail on the same old content can leave players feeling misled." — [Poki thumbnail guide](https://developers.poki.com/guide/game-thumbnail)
- Poki offers A/B thumbnail tests during soft release (per a search-result summary of the old `sdk.poki.com/ab-thumbnail-tests` page, which now redirects). The current guide I fetched does not detail the mechanics. In an A/B test each version is shown randomly to different players. — search result for [Poki ab-thumbnail-tests](https://sdk.poki.com/ab-thumbnail-tests); unverified detail
- Poki also says "Playtests and player fit tests are always available to check your changes before committing to another web fit test," and that testing is free and repeatable. — [Poki reading results](https://developers.poki.com/guide/reading-results)
- itch.io: impressions and CTR are per project, over the last 7 days only (so you must export or screenshot your own history). CTR is broken down by where it was shown, according to staff. — [itch.io update](https://itch.io/updates/updates-to-project-analytics-filtering-collections-impressions-and-more)
- itch.io has no native thumbnail A/B. Devs use before/after. Anecdote: "CTR jumped up by nearly 0.15% within a minute or two" of a cover change. This is implausibly fast for a real effect and probably noise or placement. — [itch.io thread](https://itch.io/post/1928117/view-in-topic)

### Inferences
- Because itch.io shows only 7 days, log CTR and impressions yourself daily (a spreadsheet), including the date and the exact thumbnail.
- A CrazyGames cover swap is cheap and fast, so before/after is feasible there. The risk is confounding by rank and placement changes, not review delay.
- Poki's free soft-release A/B test is the only portal-native randomized test found. Ask developer support whether it is available for your game.

### Gaps
- No CrazyGames statement on thumbnail experiments or cover re-review delays beyond the FAQ line above.
- The current Poki A/B-test documentation was not retrievable (old URL redirects).
- Nothing found on Newgrounds, Y8 or GameDistribution dashboards.

---

## 3. Testing methods and minimum sample sizes

### Takeaway
At about 1% baseline CTR, detecting 1.0% to 1.5% needs about 7,750 impressions per arm (about 15,500 total) at 80% power and alpha 0.05 (two-sided). Detecting a 1.0% to 1.2% lift needs about 42,700 per arm. Small portal traffic only supports testing large changes (relative lifts of 50% or more), and before/after comparisons on portals are confounded unless you control for placement and time.

### Cited Findings
**Google Play Console Store Listing Experiments**
- Types: default-graphics experiments (icon, feature graphic, screenshots, default language) and localized experiments (up to five languages at once, can include descriptions). You can run one default-graphics experiment or up to five localized ones concurrently. — [Play Console Help](https://support.google.com/googleplay/android-developer/answer/6227309)
- Variants: the Help page states a maximum of 2 experimental variants per experiment. Conflict: a 2025 third-party guide says "up to three." Check the current Console UI. — [Play Console Help](https://support.google.com/googleplay/android-developer/answer/6227309); [AppRadar](https://appradar.com/blog/app-ab-testing-with-store-listing-experiments-in-google-play)
- Audience: you pick the share of visitors who see variants, split equally across variants; the rest see the current listing. — [Play Console Help](https://support.google.com/googleplay/android-developer/answer/6227309)
- Settings: the confidence level (reported range 90-99%) and the minimum detectable effect (MDE, reported range 0.5-3%) are configurable. Below the MDE the result is a "draw." The creation page estimates the time and acquisitions needed. Experiments auto-stop after 6 months. — [Play Console Help (settings)](https://support.google.com/googleplay/android-developer/answer/12053285)
- Metrics: unique first-time installers and unique openers (retained installs). — [Play Console Help](https://support.google.com/googleplay/android-developer/answer/6227309)
- Practitioner guidance: run at least 7 days to cover weekday and weekend behavior. Early positive results can reverse, so wait 7-14 days. Fewer variants mean shorter tests. Low-conversion markets need longer than calculators suggest. A/B/B tests help detect false positives. — [Phiture](https://phiture.com/asostack/google-play-experiments-a-technical-deep-dive-into-the-new-updates/); [AppRadar](https://appradar.com/blog/app-ab-testing-with-store-listing-experiments-in-google-play)
- Caveat: Play experiments mix traffic intent (brand search, ads, browse), so results can differ from paid-traffic tests. — [AppTweak](https://www.apptweak.com/en/aso-blog/improving-a-b-tests-reliability-in-google-play)
- Custom store listings show different pages to different countries or audiences (a targeting tool, not a randomized test). — [AppRadar](https://appradar.com/blog/app-ab-testing-with-store-listing-experiments-in-google-play)

**Out-of-store / proxy tests**
- SplitMetrics-type pre-launch tests use ad traffic to a mock store page. The proxy metric for icon tests in one case study was click-to-install rate. Case claims 18% uplift, with no sample sizes given and a vendor-authored source. — [SplitMetrics Nanobit](https://splitmetrics.com/cases/nanobit-increases-conversion-with-splitmetrics/)
- Limitation: paid traffic is more targeted than organic, so results differ from in-store experiments. — [AppTweak](https://www.apptweak.com/en/aso-blog/improving-a-b-tests-reliability-in-google-play)
- Facebook creative testing caveat: delivery is not even across ads, so clean A/B comparisons are unreliable. It shows which ad won, not why. — [Segwise](https://segwise.ai/blog/test-facebook-creative-effectively)
- PickFu (poll service): default 100 mobile gamers, a "fast read" with 15, head-to-head question "which icon would make you most likely to download." No validity or confidence data is stated by PickFu. — [PickFu docs](https://www.pickfu.com/docs/use-cases/app-store-icon-test.md)
- I found no study comparing poll or Facebook-proxy results to real in-store outcomes.

**Pre/post on portals (no primary source found)**
- No source describes a validated method for portals. Recommendations below are inferences.

### Inferences
**Sample-size table (computed here).** Two-proportion z-test with pooled variance under H0; n per arm = (z_a/2 * sqrt(2 * pbar * (1 - pbar)) + z_b * sqrt(p1(1 - p1) + p2(1 - p2)))^2 / (p2 - p1)^2, where pbar = (p1 + p2)/2. These agree with standard calculators (e.g. Evan Miller) to within rounding.

Impressions needed to detect a CTR change, 80% power, alpha 0.05 two-sided:

| Baseline to variant | Relative lift | Per arm | Total (2 arms) | Clicks per arm at baseline |
|---|---|---|---|---|
| 1.0% to 2.0% | +100% | 2,318 | 4,636 | 23 |
| 1.0% to 1.5% | +50% | 7,750 | 15,499 | 77 |
| 1.0% to 1.33% | +33% | 16,596 | 33,193 | 166 |
| 1.0% to 1.25% | +25% | 27,937 | 55,874 | 279 |
| 1.0% to 1.2% | +20% | 42,693 | 85,386 | 427 |
| 1.0% to 1.1% | +10% | 163,095 | 326,189 | 1,631 |
| 0.5% to 0.75% | +50% | 15,598 | 31,197 | 78 |
| 0.4% to 0.6% | +50% | 19,523 | 39,046 | 78 |
| 2.0% to 3.0% | +50% | 3,825 | 7,650 | 77 |

Sensitivity for 1.0% to 1.5%: 90% power = 10,374 per arm. One-sided alpha 0.05 or two-sided alpha 0.10 = 6,104 per arm. Alpha 0.025 (Bonferroni for 3 arms vs control) = 9,385 per arm.

Smallest true CTR you can detect from a 1.0% baseline at 80% power, by impressions per arm: 2,000 gives 2.09%; 5,000 gives 1.64%; 10,000 gives 1.43%; 20,000 gives 1.30%; 50,000 gives 1.18%; 100,000 gives 1.13%.

95% Wilson confidence interval of an observed CTR (shows how noisy small numbers are):

| Impressions | Clicks | Observed CTR | 95% CI |
|---|---|---|---|
| 1,000 | 10 | 1.0% | 0.54% to 1.83% |
| 2,500 | 25 | 1.0% | 0.68% to 1.47% |
| 5,000 | 50 | 1.0% | 0.76% to 1.32% |
| 10,000 | 100 | 1.0% | 0.82% to 1.21% |
| 20,000 | 200 | 1.0% | 0.87% to 1.15% |
| 100,000 | 1,000 | 1.0% | 0.94% to 1.06% |
| 6,100 | 23 | 0.38% | 0.25% to 0.57% (the Larss IO example; excludes 2%) |

For Play listings, assuming 15-25% conversion, a +10% relative lift needs about 9,300 (15% to 16.5%) to 4,900 (25% to 27.5%) store visitors per arm; a +20% lift (15% to 18%) needs about 2,400 per arm.

**What this means for a solo dev**
- Judging "is 1.0% low?": at 5,000 impressions a 1.0% CTR has a 95% CI of 0.76-1.32%. You cannot tell 0.8% from 1.2% with fewer than about 10,000 impressions.
- A portal before/after is only trustworthy for big jumps (about 1.0% to 1.5% or more) with at least about 8,000 impressions in each period, and even then it is not randomized.
- Controls for before/after on portals: (1) same weekday mix (run each period in whole weeks); (2) compare the same placement or traffic source (itch.io breaks CTR down by source); (3) don't change the title, tags, category or preview video in the same window; (4) check that impression volume and rank did not shift sharply (CTR falls as impressions broaden); (5) run an ABA reversal if possible (swap back) to see whether CTR follows the art; (6) look at C2P and playtime alongside CTR.
- Pickfu or Reddit polls measure stated preference of a small panel (n = 15-100 gives roughly +/-10 points of margin); use them only to eliminate clearly weak options, not to estimate CTR lifts. Meta ad creative tests measure ad CTR on paid cold audiences, which transfers only directionally. Use CPM-based bidding and equal budgets, and treat results as ranking, not effect size. A five-second test (can people say what the game is?) is a comprehension check, not a CTR forecast.
- Shrink the tile before judging: view mock-ups at about 200x112 px (CrazyGames carousel claim, unverified) next to competitors.

### Gaps
- No evidence on how well PickFu, Reddit polls, TikTok or Meta CTR tests predict real portal CTR.
- No published CrazyGames method for controlling for rank or placement.
- Current Play Console experiment variant limit is contested (2 vs 3).

---

## 4. Number of variants, duration, and a sensible iteration plan

### Takeaway
Change one element at a time, test few variants, run whole weeks, and prefer big, visible changes. Poki and Google both recommend iterating on a single variable per cycle. For a solo dev, the realistic path is sequential A/B (or ABA) on one portal at a time, with one pre-screen step beforehand.

### Cited Findings
- Kongregate (Google, Oct 2015, old): start by testing the icon since it can have the greatest impact (positive or negative); have a question in mind; avoid testing multiple variables at once; avoid small audiences; don't dismiss negative results. — [Google Developers blog](https://developers.googleblog.com/en/learn-top-tips-from-kongregate-to-achieve-success-with-store-listing-experiments/)
- Phiture: more variants lengthen the test substantially; A/B is most reliable; A/B/C for post-launch concept validation; A/B/C/D mainly for early-stage concepts; the minimum is 7 days; early winners can reverse. — [Phiture](https://phiture.com/asostack/google-play-experiments-a-technical-deep-dive-into-the-new-updates/)
- Poki: iterate on a single variable per development cycle (playtest blog); examine your weakest metric, make a focused improvement, retest. — [Poki blog](https://poki.com/blog/higher-success-rates-with-playtests); [Poki reading results](https://developers.poki.com/guide/reading-results)
- Poki design principles: clear, recognizable content (not collages), suggested movement, one focal point, legible at small sizes. CrazyGames: avoid plain screenshots, include a stylized title, no borders or blur, keep the three formats consistent. — [Poki](https://developers.poki.com/guide/game-thumbnail); [CrazyGames](https://docs.crazygames.com/requirements/game-covers/)

### Inferences (proposed plan)
1. Baseline: log impressions, clicks, CTR, C2P/playtime daily per portal for 2 full weeks. Don't change anything else.
2. Pre-screen 3-5 concepts (poll or Meta, ranking only), at actual tile size next to competitors.
3. Test only the best 1 vs the current (A/B). Change one dimension per round: focal subject, then colour/contrast, then title treatment. Make the difference large enough (aim for a 50%+ relative lift, as per the table).
4. Duration: at least 7 days or until about 8,000+ impressions per arm, whichever is longer. Use Poki's free test or Play Console experiment where available; elsewhere do sequential weeks with the controls above, ideally ABA.
5. Decide on CTR and C2P together. Keep a log of each change with the date.
6. Don't test more than one portal's thumbnail change at once if audiences overlap on your own site.

### Gaps
- No published data on optimal number of rounds or win rates of thumbnail tests for web games.

---

## 5. Case studies with measured uplift

### Takeaway
Published uplifts exist mainly for mobile store icons and screenshots, typically 5-50%, with one 92% icon outlier. They come largely from vendors and Google itself, usually without sample sizes, so treat them as optimistic. Portal-specific measured thumbnail uplifts are only anecdotes.

### Cited Findings
- Kongregate (Google Play, 2015, old; Google-published): new icon +92% installs, screenshots +14%, combined listing +45%. Variants and duration not given. — [Google Developers blog](https://developers.googleblog.com/en/learn-top-tips-from-kongregate-to-achieve-success-with-store-listing-experiments/)
- Tapps Games (Google-published case): variations in colour, character position, graphic detail; shorter messaging, contrasting colours, simplified graphics gave 5-50% average improvement. — [Android Developers story](https://developer.android.com/stories/games/tapps)
- Phiture / Lion Studios (AppLovin), 2025-era, vendor case: puzzle games Found It! and Hexa Sort; icon test +12% installs over 20 days, then another +8% over 8 days; 20% combined across 100 experiments in six weeks. No confidence intervals or sample sizes published. — [Phiture](https://phiture.com/success-stories/accelerating-a-b-testing-with-lion-studios-by-applovin-a-20-global-lift-in-installs/)
- SplitMetrics / Nanobit (Sept 2021, vendor case, iOS): Tabou Stories icon +18% conversion for organic users, +22% organic installs over 40 days; a new icon beat the control after months of failed variants. — [SplitMetrics](https://splitmetrics.com/cases/nanobit-increases-conversion-with-splitmetrics/)
- Pixel Federation pre-launch testing: 25% conversion boost (vendor case, not fetched in full). — [SplitMetrics](https://splitmetrics.com/cases/pixel-federation-pre-launch-store-optimization/)
- itch.io anecdotes: CTR 2.08% for a game that was at 1.22% (cover changed); +0.7 CTR after an "intense" cover; 0.84% to 2% over ~1,400 impressions after thumbnail changes. All unverified, no controls. — [itch.io thread](https://itch.io/post/1928117/view-in-topic); [itch.io post](https://itch.io/post/3107685); [itch.io thread](https://itch.io/t/278399/whats-your-ctr-whats-a-good-ctr)
- Larss IO (CrazyGames): the dev attributed the 0.4% CTR partly to an unclear thumbnail but reports no after-change result. — [devlog](https://fxf8.itch.io/larss-io/devlog/1586849/launching-a-1v1-strategy-game-on-crazygames-04-ctr-and-what-im-learning)
- Not a game portal: an itch.io blog post claims a thumbnail redesign took CTR from 2% to 7% (+250%), but it measures a YouTube thumbnail and gives no impressions. Excluded as evidence for portals. — [itch.io blog](https://itch.io/blog/1029722/how-i-designed-a-game-thumbnail-that-got-clicks)

### Inferences
- Realistic expectation for a good thumbnail redesign: +20-50% relative CTR. A jump from 1.0% to 1.5% is plausible but at the optimistic end of vendor-reported results. Survivorship bias applies (failures are rarely published).
- Aggregated store-icon uplifts do not transfer one-to-one to portal tiles, where the tile competes in a dense grid with a hover video preview.

### Gaps
- No peer-reviewed or independent data set on web-game portal thumbnail uplift.
- No CrazyGames or Poki official before/after numbers for cover changes.
- The Tapps Games and Pixel Federation pages were taken from search results and not fully fetched; verify before quoting numbers.
