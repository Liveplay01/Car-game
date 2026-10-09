# Game-design retention mechanics for casual one-tap skill games (applied to a small browser game)

Evidence labels used below: **[Q]** = quantified, from a named source/year; **[Q-weak]** = number exists but source is a vendor/aggregator or not traceable to the original; **[Peer]** = peer-reviewed or classic academic result (accessed via secondary summaries unless noted); **[Opinion]** = practitioner opinion, anecdote or design intent, no measured effect. Search tooling returned mostly summaries, so primary full texts (JCR streak paper, Kivetz, Nunes and Dreze, GDC Crossy Road talk) were NOT read directly.

Baseline context (needed to size any effect):
- Median mobile-game D1 was about 22.9% / D7 4.2% / D28 0.85% in GameAnalytics Q1 2024 data (10,000+ projects) [Q] — [GameAnalytics Q1'24 summary](https://gamedevreports.substack.com/p/gameanalytics-benchmarks-in-mobile). The 2026 report (2025 data) says top-25% D1 is just above 30% and median D7 just under 4% [Q] — [GameAnalytics 2026 summary](https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game).
- Timing-type hypercasual games had the best average D1 of any hypercasual subgenre at 44%, but GameAnalytics tracked only about 5% of the best games for that snapshot, so it is a top-end number, not a norm; undated in the snippet [Q-weak] — [GameAnalytics hypercasual snapshot](https://gamedevreports.substack.com/p/gameanalytics-hypercasual-games-metrics). Arcade leads in D1 but is weak in long-term retention [Q-weak] — [GameAnalytics 2025 summary](https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks).
- A heuristic from one author: D7/D1 ratio below 0.30 suggests onboarding problem, 0.30–0.44 weak days 2–5 engagement, 0.45–0.55 normal [Opinion] — [gamedev.net](https://gamedev.net/blogs/entry/2298160-the-d7d1-retention-ratio-for-mobile-games-a-complete-guide).

---

## 1. Daily-return mechanics (streaks, login rewards, shared-seed daily, missions, events, seasons): what works, what churns

### Takeaway
Streaks are the best-documented daily hook, but the strongest evidence (Duolingo) shows small, incremental lifts (fractions of a percent to ~2% per tweak), not magic, and academic work shows broken streaks raise quit risk and easy paid repair weakens motivation. A same-seed daily challenge is the most natural fit for this game, yet no public source gives a measured retention lift for one; the evidence is shipped-game precedent (Wordle, Spelunky, Nitrome) and anecdote. Plain login rewards have almost no rigorous evidence behind them.

### Cited Findings
**Streaks (Duolingo, the largest public dataset)**
- Learners who reach a 7-day streak are 3.6x more likely to complete their course [Q, but correlational/selection-biased] — [Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit)
- Letting learners equip up to two Streak Freezes raised the relative number of daily active learners by 0.38%; a new post-streak-extension animation raised the chance a new learner was still active 7 days later by 1.7% [Q, Duolingo 2020s] — [Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit)
- Duolingo's retention PM: 600+ streak experiments in four years; retention is most fragile in the first 7 days; changing button copy from "continue" to "commit to my goal" and letting users opt in to a chosen streak length "significantly increased retention" (no effect sizes given); early streaks tied to XP confused users, simplifying to "complete one lesson a day" made them work better [Opinion/unquantified, Dec 2024] — [Lenny's Newsletter](https://lennysnewsletter.com/p/behind-the-product-duolingo-streaks)
- A newsletter summary of Duolingo's retention team notes that users with a 10-day streak drop off less but explicitly flags correlation and selection bias [Opinion] — [Audiencers](https://theaudiencers.com/subscription-models-live-off-habits-lessons-from-duolingos-retention-success/)
- A "Streak Freeze +10% long-term retention" figure circulates on Gitnux with no primary source; do not use [Q-weak] — [Gitnux](https://gitnux.org/duolingo-user-statistics/)

**Streak psychology / pitfalls (academic)**
- Silverman, Barasch, Inman, Wood, Lee, Journal of Consumer Research 2023, "On or Off Track: How (Broken) Streaks Affect Consumer Decisions": users value extending the streak over the underlying activity; users who break a streak are more likely to quit the platform; offering repair (paid) lowers motivation to keep the streak; less demotivating if the break was caused by an app malfunction rather than the user's own lapse [Peer, via secondary summaries] — [The Decision Lab](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification); [Psychology Today](https://www.psychologytoday.com/us/blog/ulterior-motives/202306/how-broken-streaks-sap-motivation)
- Etkin 2016 (JCR): tracking increases engagement but quantifying can reduce enjoyment of already-liked activities; too many streaks in a product dilute each one; guilt-based notifications keep people engaged after the streak stops motivating — [The Decision Lab](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification) (the article's practical advice, such as making repair less frictionless, is opinion built on these studies)
- A 6-week field experiment with the "one sec" app found positive-streak feedback was enjoyable and fostered retention, but streak goals competed with users' original objectives [Peer-ish, source is a seminar listing, publication status unconfirmed] — [CHIBE seminar listing](https://chibe.upenn.edu/event/rachel-gershon-phd%E2%94%82chibe-research-seminar/)
- "Streak anxiety" as a phrase appears only in practitioner writing and anecdotes (Reddit etc.), not in peer-reviewed work I found [Opinion] — [HabitDoom](https://habitdoom.com/blog/streak-anxiety-habit-trackers)
- I found no published dataset isolating churn caused by streak loss (share who quit within a day of breaking one) — [search summary, see Gaps]

**Daily login rewards**
- A 2025 arXiv paper on Korean mobile games describes daily login rewards as the most common retention tactic and ties them to loss aversion; the snippet showed no measured effect on churn [Peer, descriptive, full text not readable via fetch] — [arXiv 2504.10714](https://arxiv.org/pdf/2504.10714)
- Claims such as "60% higher retention for 3+ claims per week", "20% lift from daily challenges", "30% lift from reward systems" come from sponsored posts / MoldStud pages with no source; ignore [Q-weak] — [sponsored article](https://www.herald-dispatch.com/sponsored/the-psychology-behind-daily-rewards/article_210cd57b-86b7-43b5-87ee-b7493ce82ac1.html); [MoldStud](https://moldstud.com/articles/p-the-science-of-retention-in-mobile-games)

**Shared-seed daily challenge (precedents; none with published retention numbers)**
- Wordle: one puzzle per 24 h, same for everyone, no signup/ads, static page; grew from about 90 players (1 Nov 2021) to 300,000+ by early Jan 2022; 1.2 million results shared on Twitter between 1 and 13 Jan 2022; the spoiler-free emoji grid was added after friends were posting results that way [Q, growth figures mostly Wardle's own statements; sources disagree on dates] — [Wikipedia: Wordle](https://en.wikipedia.org/wiki/Wordle); [DinoGame.gg analysis](https://dinogame.gg/blog/why-is-wordle-so-popular/) (the "scarcity makes each puzzle more valuable" reading is commentary [Opinion])
- Spelunky Daily Challenge: fixed seed per day, one attempt per player per day, own leaderboard per day [shipped design, no retention data] — [Spelunky Wiki](https://spelunky.fandom.com/wiki/Daily_Challenge_Mode_(HD))
- Nitrome's Leap Day derives the level from the date and keeps everyone on identical content because shared content makes people feel part of the same thing [Opinion/design intent] — [PocketGamer.biz](https://www.pocketgamer.biz/interview/63249/leap-day/)
- Solo dev of GRAZE: Edge Rush: daily board wiped each day, so he added a permanent daily-wins tally; players stopped chasing one high score and started chasing a streak ("turned casual players into daily regulars") [Opinion/anecdote] — [Product Hunt](https://www.producthunt.com/p/graze-edge-rush/i-added-a-permanent-daily-wins-tally-to-my-game-and-it-changed-how-people-play)
- Pitfalls with shared seeds: Offworld players saw seeds off by one so they were not on the same map; FTL shows that all random sources must be seeded, not just level generation; a daily-puzzle team found newcomers arriving from a shared Daily link could not tell how to play [anecdotes] — [Stardock](https://www.stardock.com/games/article/503618/bug-daily-challenge-different-for-some-players); [PeerPush](https://peerpush.com/blog/how-we-fixed-a-one-and-done-problem-on-a-daily-puzzle-game)
- NYT Connections: the Times said about 9 in 10 who start a game see it through to the end (2023); the Times does not publish daily-player or streak figures [Q, dated] — [Yahoo/Mashable report](https://au.news.yahoo.com/connections-york-times-most-played-202419838.html)

**Events, weekly structures, seasons (casual puzzle live-ops)**
- Naavik: a daily jackpot (e.g. Royal Match's Lava Quest) is "intentionally brief and typically solvable in a player's first session of the day", appears in almost every top casual puzzle title, replaces plain login bonuses because you must engage with core gameplay to earn it, unlocks within the first week, and aims to convert early cohorts into daily "regulars"; weekly leaderboards with milestone rewards are standard; Royal Match cut level-completion coin rewards by about 30% to offset inflation from endlessly repeatable collections [Opinion by analyst + one Q figure, 2025–26] — [Naavik](https://naavik.co/digest/live-ops-trends-powering-mobile-puzzle/)
- Playio: rhythm matters more than volume; 15–25 overlapping monthly events suggested for casual/puzzle games; any game can spike during an event, and if retention dips below baseline after, the event only "borrowed" future engagement [Opinion, vendor blog] — [Playio](https://blog.playio.co/liveops-strategy-mobile-games-retention)
- Adjust 2025 report (via RocketShip HQ): games with weekly live-ops events show 30-day retention 2.1x higher than games without; not verified against the original and correlational [Q-weak] — [RocketShip HQ](https://www.rocketshiphq.com/?p=5717)
- Proper test of event impact: compare exposed vs credible baseline, separate short-term spike from durable retention, check fatigue/pull-forward [Opinion, method] — [Dataford](https://dataford.io/questions/evaluate-live-ops-retention-impact)

### Inferences
- The game's deterministic seed+taps sim means a UTC-date-derived daily seed (same obstacles, same event/weather/boss rolls) costs almost nothing and can be verified server-side by replay. This is the single best fit with the evidence base (Wordle/Spelunky pattern), but expected lift is unmeasured; plan an A/B or at least a before/after cohort check.
- Wordle-like scarcity (one scored attempt per day, extra attempts unscored) is the lever that makes the daily an appointment; unlimited retries would resemble a normal mode. Keep the daily short (the game's shift format) so it fits "first session of the day" like Naavik's jackpot.
- Copy Duolingo's lesson that the streak rule should be one simple action ("finish one daily"), not a points threshold; the game currently has a daily streak, so audit what counts toward it.
- Given the JCR findings, offer a free, automatic, limited grace (e.g. weekly rest day or one earned freeze) rather than a purchasable/instant repair; the evidence says easy repair reduces motivation but a hard break raises quitting, so a scarce, earned buffer is the middle path (my synthesis, not tested).
- Daily-login-only rewards have no evidence base; tie the daily reward to playing the daily (Naavik logic).
- Because the game is a PWA/offline-first with local save, "streak lost" cases should consider timezone/clock edge cases and cloud-sync conflicts so a break is never the game's fault (JCR: malfunction-caused breaks are less demotivating, but still demotivating).

### Gaps
- No independent, quantified retention lift for daily login rewards, daily challenges, or weekly missions (only vendor/unsourced numbers).
- No dataset on churn after streak loss, nor on freeze uptake effects beyond Duolingo's 0.38% DAL figure.
- Full text of Silverman et al. 2023 not read (effect sizes, sample sizes unknown); the OUP fetch returned an unrelated page.
- Duolingo "Streak Wager" and "Streak Society" details: not found in sources fetched.
- NYT/Wordle current daily players or streak distribution: not published.

---

## 2. "Appointment" and "unfinished business" hooks: timers, collections, near-miss goals, goal gradient, Zeigarnik; ethical limits

### Takeaway
The goal-gradient and endowed-progress effects have solid peer-reviewed field evidence (loyalty cards: 34% vs 19% completion with a pre-stamped head start) and transfer naturally to visible progress bars, collection counts and "1 level to boss". I found no usable sources on the Zeigarnik effect in games, and no evidence on chest-unlock timers for a game like this; treat both as hypotheses. Ethical framing: progress and collection hooks are low-risk; guilt notifications, easy-repair streak sales and variable-reward casino loops are where harm lives.

### Cited Findings
- Goal gradient (Kivetz, Urminsky and Zheng, Journal of Marketing Research 2006): café "buy 10 get 1 free" customers purchased more frequently as they neared the free coffee; users of a song-rating site returned more often and rated more songs per visit near the reward; engagement dropped right after the first reward and accelerated again near the second; authors argue habituation, expiry concerns and heterogeneity do not explain it [Peer, via secondary] — [Chicago Booth Review](https://www.chicagobooth.edu/review/going-goal); [Columbia Business School](https://business.columbia.edu/faculty/research/goal-gradient-hypothesis-resurrected-purchase-acceleration-illusionary-goal)
- Endowed progress (Nunes and Drèze, JCR 2006): car-wash cards needing 8 stamps vs 10 stamps with 2 pre-filled (same 8 purchases required): 34% vs 19% redemption; works better when the head start comes with a reason; persistence follows relative progress rather than reward size [Peer, single field experiment, via secondary] — [Coglode](https://coglode.com/nuggets/endowed-progress-effect); [Wharton](https://knowledge.wharton.upenn.edu/podcast/knowledge-at-wharton-podcast/the-lowdown-on-customer-loyalty-programs-which-are-the-most-effective-and-why/)
- Kivetz et al. also report that a 12-stamp card with 2 bonus stamps completes faster than a plain 10-stamp card [Peer, via secondary] — [Columbia Business School](https://business.columbia.edu/insights/chazen-global-insights/goal-gradient-hypothesis-resurrected-purchase-acceleration)
- Practitioner rule "endow 10–25% of first-reward effort, never at the end" is a consultant rule of thumb, not a finding from the papers [Opinion] — [Reward Co](https://loyaltyrewardco.com/loyalty-psychology-series-endowed-progress-effect)
- Vampire Survivors: the unlock screen shows unlock conditions openly (unlike hidden-condition roguelikes), giving players a checklist/to-do list; gold funds meta unlocks and gives each run a second objective besides survival; a design essay argues unlocks are an onboarding layer and the core loop (build synergies, survive longer) is what players return for, warning that progression can simulate mastery without delivering it [Opinion, no data] — [Superjump](https://www.superjumpmagazine.com/looking-back-and-forward-at-the-success-of-vampire-survivors/); [Roblox-dev essay](https://rowatcher.com/news/progression-systems-are-not-retention-roblox-devs-confuse-these)
- Crossy Road (Hipster Whale): free gifts on a real-time timer and ad-for-reward design; the devs said video ads seemed a way to earn without getting in people's faces and they needed a fun reason to watch. Interval ("every six hours") not confirmed by any source; GDC 2015 talk page is only a description, not read [Opinion/unverified] — [PocketGamer.biz](https://www.pocketgamer.biz/making-of-crossy-road/); [GDC Vault](https://gdcvault.com/play/1021897)
- Entrapment/sunk-cost is a proposed mechanism for escalating spend in loot boxes (not a finding) — [PsyPost summary of Zendle and Cairns](https://www.psypost.org/two-large-studies-have-found-a-link-between-loot-box-spending-and-problem-gambling/)
- Streak-adjacent ethics: guilt-based messaging ("You made Duo sad") sustains engagement after intrinsic motivation fades; Decision Lab recommends avoiding it [Opinion] — [The Decision Lab](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification)

### Inferences
- Museum completion and level/boss progress can use goal-gradient directly: always show "n/total" and the next nearest item, and make the last few items of a set the most visible (distance-from-goal matters, per Kivetz). Endowed-progress: start the museum/season pass/streak ladder with 1–2 entries already filled with a stated reason ("welcome stamp").
- "1 level to boss" style near-miss goals fit the evidence on goal proximity; they are honest because the goal is real. Avoid fake near-misses (casino-style "so close") which the project already rules out.
- Chest-unlock timers (appointment) are not evidenced for this genre in my sources; given no real-money purchases and honest odds, a short free timer ("next free chest in 3h" or "daily chest ready") is ethically fine as long as it is not skippable for currency pressure and the player is never penalised for not returning.
- Best ethical shape: reward return with extra opportunity (a daily + a free chest) but never take something away when absent; no guilt copy in notifications.

### Gaps
- Zeigarnik effect (unfinished tasks are remembered better) and its replication status: no source retrieved; treat as unsupported for this report.
- No measured data on chest timers or energy systems for one-tap timing games.
- Crossy Road retention design and gift cadence: no verifiable source found.
- Originals of Kivetz 2006 and Nunes and Drèze 2006 not read; numbers come from secondary summaries (one secondary source quoted an "82%" lift inconsistent with 34 vs 19, which implies about 79%).

---

## 3. First-session design that sets up the second session

### Takeaway
The credible guidance is: core loop playable within about a minute, no account/setup friction, short onboarding, and an early reward; but almost every numeric threshold I found is vendor or anecdote. The only hard fact is that retention is most fragile in the first seven days (Duolingo) and that D1 median is around 22%. The "end on an open loop" idea is supported by goal-gradient/endowed-progress logic, not by first-session-specific studies.

### Cited Findings
- Retention is most fragile in the first 7 days; getting users through that week raises long-term odds [Opinion/unquantified] — [Lenny's Newsletter](https://lennysnewsletter.com/p/behind-the-product-duolingo-streaks)
- Median D1 about 22% in 2025, down from the prior year [Q] — [GameAnalytics 2026 summary](https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game)
- Guidance: core loop should start within about a minute, not after tutorials, settings or account creation; an "aha" taking more than 90 seconds loses a significant share before session two [Opinion, vendor blog] — [Playio](https://blog.playio.co/mobile-game-onboarding-retention)
- A vendor claims users reaching the first core action in under 3 minutes show 2–3x higher D7 than those taking 10+ minutes; underlying study not shown [Q-weak] — [Bruin](https://getbruin.com/use-cases/mobile-gaming/first-session-length-sweet-spot/)
- A Roblox developer reported D1 rising from 6% to 15% after cutting a tutorial from 5 steps to 3 [anecdote, unverified] — [Reddit snapshot via search](https://reddit.sentinel-team.org/posts/1sakqj4/snapshots/2026-04-03T05%3A12%3A52.21453Z)
- Duolingo: simplifying the rule behind the streak (one lesson/day) made it more effective; the commitment framing (button copy "commit to my goal") and opt-in streak length increased retention [Opinion/unquantified] — [Lenny's Newsletter](https://lennysnewsletter.com/p/behind-the-product-duolingo-streaks)
- Duolingo: a post-streak-extension animation lifted new-learner 7-day return by 1.7% — i.e. celebrating the first streak day matters [Q] — [Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit)
- Naavik: the daily jackpot usually unlocks within the first week to convert new cohorts to regulars (staged introduction of the daily hook) [Opinion, analyst] — [Naavik](https://naavik.co/digest/live-ops-trends-powering-mobile-puzzle/)
- Wordle's zero-friction start (no app, no signup, no ads, one static page) is repeatedly named as a growth enabler [Opinion] — [DinoGame.gg](https://dinogame.gg/blog/why-is-wordle-so-popular/)
- Measure play time as a custom event; wall-clock time between tutorial start and end can be wildly misleading (a case showed 25 hours) [Opinion, method] — [GameAnalytics via search](https://gameanalytics.com/?p=4612)

### Inferences
- For a one-tap game, the first shift can be the tutorial: reward within the first 60–90 s (a chest or first museum entry), then end the first session on a visible, specific open loop: "Tomorrow: daily challenge + free chest, streak 1 of 3 toward [named reward]" with the first rung pre-filled (endowed progress). This is design inference from goal-gradient/endowed progress evidence, not first-session data.
- Introduce hooks in layers like Naavik's week-one unlock: day 1 core loop + first chest, day 2 daily/streak, later friend code and casino, so the first session is not overloaded. The game already has many systems (casino, season pass, invites); early exposure to all of them is likely to dilute rather than help.
- Make the first-session close frictionless for returning: PWA install prompt and notification ask only after a success moment and once there is a promise to keep (the project already offers push after a streak of 2).
- Instrument per-step FTUE funnel and D1/D7 per tutorial exit step in the existing Umami events; the fact that D1 is the weakest link in "very few returning players" means measuring where session 1 ends is step 0.

### Gaps
- No reliable published "time to first reward" benchmark for casual/timing games.
- No source on ideal first-session length for one-tap games specifically.
- No evidence on "teaser of tomorrow" screens specifically.

---

## 4. Social and viral hooks for retention in single-player-ish games

### Takeaway
Evidence that social features raise retention is mixed and correlational: one two-game study found early social engagement predicted 30-day retention in one game and not the other; in-game friend count predicts later churn. Viral sharing (Wordle) is demonstrably strong for acquisition; shared-seed daily comparison plus friends-only boards are the plausible return mechanism, but I found no controlled measurement of ghost or challenge-link retention.

### Cited Findings
- Jyväskylä thesis on two commercial F2P mobile games: in one, social engagement in the first 7 days positively affected retention even after 30 days; in the other no effect; conclusion: adding social features does not necessarily improve retention [Q-ish, academic thesis, correlational] — [JYX](https://jyx.jyu.fi/handle/123456789/66822)
- HKU study: players with larger social-network degree (more in-game friends in the first 3 months) churn later and have shorter lapse periods [Peer, correlational, not about ghosts] — [HKU Hub](https://hub.hku.hk/handle/10722/328943)
- arXiv study of online multiplayer games: social features become the most predictive of longevity once players reach the highest level offered by the game [Peer, predictive not causal] — [arXiv 1702.08005](https://arxiv.org/pdf/1702.08005.pdf)
- Applifier (2014) vendor data: about 20% of users are "sharers" who are more likely to return and pay; correlational, marketing data [Q-weak] — [GamesBeat](https://gamesbeat.com/user-acquisition-firm-applifer-reveals-the-importance-of-sharers/)
- Wordle: emoji grid is spoiler-free, works as a badge of honor, and drove 1.2M tweets in 13 days (acquisition engine) [Q for the tweet count] — [Wikipedia: Wordle](https://en.wikipedia.org/wiki/Wordle); [DinoGame.gg](https://dinogame.gg/blog/why-wordle-blew-up/)
- Mario Kart 7: ghost exchange over StreetPass/SpotPass was designed so playing with others no longer needs arranging a time by phone; Nintendo also made it easy to download ghosts near your own time (avoiding the demoralising far-faster ghost) [design intent, no data] — [Iwata Asks](https://www.nintendo.co.uk/Iwata-Asks/Iwata-Asks-Mario-Kart-7/Vol-2-In-house-Staff/3-Making-it-Easier-to-Gather/3-Making-it-Easier-to-Gather-231059.html)
- Real Racing 3 ran asynchronous "time-shifted" ghosts of friends as AI-driven doubles that could affect your race [design, no data] — [PocketGamer.co.uk](https://www.pocketgamer.co.uk/articles/048276/r/)
- Weekly leaderboards with milestone rewards are standard in top casual puzzle live-ops [Opinion, analyst] — [Naavik](https://naavik.co/digest/live-ops-trends-powering-mobile-puzzle/)
- GRAZE dev: a permanent per-player counter (daily wins) shifted behaviour toward a streak [anecdote] — [Product Hunt](https://www.producthunt.com/p/graze-edge-rush/i-added-a-permanent-daily-wins-tally-to-my-game-and-it-changed-how-people-play)

### Inferences
- Friends-only boards likely beat global boards for return among casual players because rank is attainable (global top is unreachable); this is design reasoning (Mario Kart note about too-fast ghosts supports it), not measured in my sources. Show "your rank among N friends" and "friend passed you" (already a push trigger in the project).
- The daily seed is the glue: it turns a friend list into a daily scoreboard everyone plays the same run on, and gives a Wordle-style share artifact (emoji row of the shift result plus score, no spoilers) that links into the existing challenge-link/preview-image system. Share = acquisition first, return second (needs "see how friends did" payoff the next day).
- Invites with mutual chest at level 5 target acquisition and partly retention (inviter is pulled back by the friend's progress); correlational evidence says friend count predicts staying, so reward friend-adding, not just inviting.
- Ghosts: deterministic replays (seed+taps) make async ghost races technically cheap (store tap list, replay); no source shows a retention benefit, so ship as a small experiment.

### Gaps
- No controlled A/B retention data for ghost races, challenge links or friend leaderboards in any game found.
- Cannot separate acquisition vs return effects of share features from public data.
- Trials Frontier async PvP: only launch-era previews found.

---

## 5. Content cadence, live-ops for tiny teams, and cautions (casino flavour, reward inflation, streak anxiety, accessibility, notifications)

### Takeaway
Rhythm beats volume: a few recurring, templated events (daily, weekly, seasonal) are more sustainable and better supported than frequent bespoke content, and the standard warning is that events only help if retention does not dip below baseline afterward. Casino-flavoured mechanics have strong harm evidence (loot-box/gambling association) but no evidence found that they improve retention in a skill game; they risk contradicting an "honest, no-dark-pattern" positioning. Web push has vendor evidence of retention lifts but opt-in is low.

### Cited Findings
**Cadence / live-ops**
- Casual puzzle top titles run: daily jackpot (every day), weekly leaderboard, repeatable collections that replaced two-month seasonal ones; personalised live-ops per segment is too expensive for all but the biggest studios, so most teams use shared features [Opinion, analyst] — [Naavik](https://naavik.co/digest/live-ops-trends-powering-mobile-puzzle/)
- Playio: 15–25 monthly overlapping events for casual games; post-event dip below baseline means the event borrowed engagement [Opinion/vendor] — [Playio](https://blog.playio.co/liveops-strategy-mobile-games-retention)
- Weekly live-ops games show 2.1x 30-day retention (Adjust 2025 via RocketShip HQ) [Q-weak, correlational] — [RocketShip HQ](https://www.rocketshiphq.com/?p=5717)
- Vampire Survivors-lite meta: the visible unlock checklist and gold-funded meta create long-term goals without live events; but a design essay stresses that progression systems are not retention by themselves — [Superjump](https://www.superjumpmagazine.com/looking-back-and-forward-at-the-success-of-vampire-survivors/); [Roblox-dev essay](https://rowatcher.com/news/progression-systems-are-not-retention-roblox-devs-confuse-these) [Opinion]
- Royal Match cut level-completion coin rewards by about 30% to offset inflation from endless collections [Q, via Naavik] — [Naavik](https://naavik.co/digest/live-ops-trends-powering-mobile-puzzle/)

**Casino / gambling-flavour cautions**
- Zendle and Cairns 2018 (n=7,422 gamers) found more severe problem gambling goes with higher loot-box spending; 2019 replication found similar; causation unresolved; a PeerJ before-and-after study of Heroes of the Storm found problem gamblers spent less when loot boxes were removed [Peer, correlational] — [PsyPost](https://www.psypost.org/two-large-studies-have-found-a-link-between-loot-box-spending-and-problem-gambling/); [PMC6824327](https://pmc.ncbi.nlm.nih.gov/articles/PMC6824327)
- Naavik notes a daily jackpot must be paid out at a controlled pace so as not to destabilise the economy [Opinion] — [Naavik](https://naavik.co/digest/live-ops-trends-powering-mobile-puzzle/)
- No reliable study found linking gambling-style mini-games to retention in casual skill games; the pages returned by search that claimed to were auto-generated and unsourced [search note] 

**Streak anxiety / accessibility**
- Broken streaks raise quit risk; easy repair weakens motivation (JCR 2023, see section 1); Decision Lab recommends restraint, avoiding guilt messaging and avoiding stacking multiple streaks [Peer/Opinion] — [The Decision Lab](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification)
- I found no source with accessibility-specific evidence on streaks/timers (e.g. players who cannot play daily due to disability or time zones). 

**Web push / PWA (relevant to a browser game)**
- Rakuten 24: making the web app installable gave a 450% higher one-month visitor retention versus the old mobile web flow and 310% higher visit frequency; web.dev showcase, not independent [Q-weak] — [web.dev](https://web.dev/case-studies/rakuten-24)
- YouNow A/B: web push segment had 10% higher D1 and 19% higher D14 retention; vendor case study [Q-weak] — [OneSignal](https://onesignal.com/blog/web-push-notification-improves-user-retention-for-younow/)
- Web push opt-in averages about 4% of unique visitors over a year (OneSignal), 10–15% with well-placed prompts (Gravitec via Sleeknote) [Q-weak] — [OneSignal podcast](https://onesignal.com/podcasts/browser-prompt-changes-retention-best-practices); [Sleeknote](https://sleeknote.com/?p=138964)
- Native-app data: users receiving push in their first 90 days had 3x retention (Airship, 63M users), but this is app data and correlational [Q-weak] — [Shno summary](https://www.shno.co/marketing-statistics/push-notification-statistics)

### Inferences
- Tiny-team live-ops recipe consistent with sources: one data-driven rotating weekly modifier (weather/boss/city-event combos already exist as content, so a "weekly mutator" is a recombination, not new content) + the daily seed + a monthly or season theme; this fits "rhythm over volume". Reuse existing content tables (weather, events, bosses, skins) so each week is config, not code.
- Casino games: not supported as a retention lever for a skill game; best treated as an optional sink for surplus currency. They are a differentiator that can attract the wrong audience and undermine trust; keep odds visible (already the project rule), no near-miss theatrics, cap session time/losses, and don't tie streak/daily rewards to casino play.
- Reward inflation is a real risk with chests + season pass + rewarded ads + invites + daily + friends: set a currency budget per day and cut payouts before inflating (Royal Match precedent), and make the museum/collection the prestige sink.
- Notifications: only about 4–15% will opt in, so in-game surfaces (daily card on the title screen, ready-chest badge) must carry most of the return pull; the project's push policy (rare, quiet hours) is aligned with the cautions.
- Accessibility: a daily with a hard UTC reset penalises time zones and people with irregular play; consider a rolling 36-hour streak window and no-penalty weekly rest, and keep shared-seed daily results playable untimed (tap timing is already one-tap, so motor load is low). Untested; my reasoning.

### Gaps
- No quantified data on how often small teams must ship updates to hold casual players, beyond vendor guidelines.
- No sources on community goals (shared global progress bars) as retention mechanics.
- No retention evidence for casino-style mini-games in skill games; the claim "does not help" is an absence of evidence, not evidence of absence.
- No accessibility research on streaks or timers retrieved.
- Reward-inflation evidence limited to one Naavik example.
