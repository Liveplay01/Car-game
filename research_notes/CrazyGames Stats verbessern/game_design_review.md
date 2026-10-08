# Game design review: how Roundabout Timing itself can become more fun, sticky and replayable (as of 08.10.2026)

Scope: the game itself on every platform (timing.love/PWA, Google Play TWA, CrazyGames). Not re-covered here, because an earlier audit already found them: CrazyGames SDK event timing, load chain, missing global error handler, frame loop without try/catch, near-black default scene, broken landscape layout, Daily/streak only from level 4, Trials/Tours at 9, Casino at 12, Season Pass at 15, and the difficulty wall at levels 8–12.

Method: I read CLAUDE.md, Spiel.md, FOUNDATION.md, IDEA.md, Web/PRODUCT.md and `Web/src/core/config.ts`, then the code that shapes feel and onboarding (`present/feedback.ts`, `present/tutorial.ts`, `core/scoring.ts`, `core/unlocks.ts`, `present/hud.ts`, `present/session.ts`, `ui/shell.ts`, `ui/friendsSheet.ts`). I ran `npm run sim -- 60 5`, `npm run sim:career -- 60` and `node scripts/career-sim.mjs 13 --profile=casual --story=15`. External sources are thin on hard numbers: most hyper-casual "design rules" online are blogs or wikis. I mark weak sources where I use them.

**Important caveat on sim times.** The career sim counts bot time plus a fixed 0.25 min between shifts (`Web/scripts/career-sim.mjs`, `BETWEEN = 0.25`). Its bots tap the moment a gap qualifies, so they finish shifts faster than people do. Read every "minutes"/"hours" figure below as a lower bound on real play time.

---

## 1. Core loop and game feel: is the one-tap timing satisfying, and what can RAT take from Car Circle, Crossy Road, Stack, Helix Jump, Smash Hit and Geometry Dash?

### Takeaway
The core feel is already strong and well thought through. Taps are timestamped, a merge earns a tiered rating (Tight Fit, Near Miss, Perfect, Clean), the merge sound climbs a pentatonic ladder with the combo, crashes are real physics, Rush Hour gives a climax, a Flow state rewards streaks, and a restart after a loss is locked out for only 0.4 s. The gaps are smaller and more specific. Losing ends the shift on the first crash, which is harsh by hyper-casual standards ("forgiving"). Precision rewards are mostly sound plus a short word, with no hit-stop or camera punch on the best merges. The pitch ladder stops climbing after 8 merges. And no visible in-shift "fever" payoff turns a streak into something the player can feel and chase.

### Cited Findings
**What RAT does now (repo)**
- Merge ratings: a cut-off (if enabled), then Tight Fit < 0.12 s, Near Miss < 0.2 s, Perfect = centred in a gap (balance ≤ 25 %, total ≤ 2 s), and Clean for everything else. Points are 200/125/150/100 × combo multiplier — [Web/src/core/scoring.ts:56-70](Web/src/core/scoring.ts), [Web/src/core/config.ts:159-170](Web/src/core/config.ts), [Spiel.md §4](Spiel.md)
- Combo multipliers are ×1.5 / ×2 / ×3 at combo 5 / 10 / 20. Rush Hour covers the last 4 cars at 135 % tempo with ×2 points. 7 % of Perfect Inputs and Near Misses are "CRITICAL" (×3) — [Web/src/core/config.ts:192-193, 303, 736](Web/src/core/config.ts), [Spiel.md §2, §4](Spiel.md)
- The clean-merge sound climbs the A-minor pentatonic with the combo (Stack-style rising pitch). The ladder has only 8 steps, so pitch stops rising from combo 8: `comboLadder: [0, 3, 5, 7, 10, 12, 15, 17]`, `clamp(combo - 1, 0, comboLadder.length - 1)` — [Web/src/present/feedback.ts:107, 178](Web/src/present/feedback.ts)
- The motion rules give a clean merge no text and only the "finest click". A Tight Fit gets a swoosh and a short "TIGHT!" (< 250 ms). Slow-mo is kept for the takedown and the shift-ending crash, "never for frequent events" — [FOUNDATION.md, Motion- und Haptik-Regeln (lines ~385-400)](FOUNDATION.md)
- Flow State (Perfect Chain ≥ 5) gives a ring glow, a sound layer and "the city breathes". Stated design: "Only feedback, no mode, no text" — [Spiel.md §4](Spiel.md)
- One normal crash ends the shift (`maxStrikes: 1`). Police get 3 crashes — [Web/src/core/config.ts:297-299](Web/src/core/config.ts)
- After a lost shift, input is locked for only 0.4 s (`inputLock: 0.4`), then a tap restarts the same level. There is no game-over screen, and the traffic keeps driving — [Web/src/present/hud.ts:1224](Web/src/present/hud.ts), [Spiel.md §3](Spiel.md)
- Haptics use `navigator.vibrate`, so iOS Safari gets none. On iPhone, game feel rests entirely on visuals and audio — [Spiel.md §13](Spiel.md)
- Adaptive music: the combo adds instruments, a criminal brings a siren, Rush Hour pulls the beat — [Spiel.md §13](Spiel.md)

**What the reference games do (external)**
- Voodoo's five criteria for hyper-casual: snackable, intuitive (understood within seconds), "Youtubable" (lots of visible action), forgiving, gameplay-first. Voodoo warns against instant-death hazards, which "make a game stressful". Roller Splat is its example of a game where "you can't even die" — [GameAnalytics reprint of Voodoo guide (Corentin Selz)](https://www.gameanalytics.com/blog/voodoo-guide-mobile-game-design-keep-things-simple)
- Juice: "the faster your game reacts to input, the juicier it will be". "Big actions usually cause a chain reaction of smaller effects". "If something is important, make it big; make it high-contrast; make it wiggle" — [Game Developer, Mike Salyh, 2020](https://gamedeveloper.com/design/6-mistakes-that-ll-drain-the-juice-out-of-your-game)
- Jonasson & Purho's GDC 2012 talk "Juice it or lose it" turned a plain Breakout into a fun one by layering flash, shake, floating text, sound and particles. Hit-stop of 0.05–0.1 s is described as most effective, a blog author's own testing that cites an IEEE paper. That is a secondary source — [eastondev blog on game feel](https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/)
- Smash Hit: balls are both ammo and life. A collision costs 10 balls. Consecutive crystal hits raise multiball up to 5 balls per shot, and a miss or damage resets it. Its dynamic music changes as the player advances. Reviewers singled out the sound and the glass-shattering feel — [Wikipedia: Smash Hit](https://en.wikipedia.org/wiki/Smash_Hit)
- Helix Jump: falling through several platforms in one drop gives a "satisfying combo effect" and score bonus. Levels reset instantly on failure. These are low-authority review sites, and I found no primary source for the "fireball/fever" mechanic — [games.gg](https://games.gg/helix-jump/), [Playpile](https://playpile.gg/games/helix-jump)
- Geometry Dash: practice mode places checkpoints, automatically by default or wherever the player chooses, and practice runs don't count toward normal progress. Fan wiki — [Geometry Dash Wiki: Practice Mode](https://geometrydash.wiki.gg/wiki/Practice_Mode)
- Car Circle (the inspiration) on Poki: tap to send cars into a roundabout "before the time runs out". Rated 4.1 from 122,100 votes, released June 2026, updated August 2026 — [Poki: Car Circle](https://poki.com/en/g/car-circle)

### Inferences
- RAT's feel is already above the genre's usual bar: physics crashes, rating tiers, rising pitch, flow layer, near-instant retry. The best gains are polish at the moments of **mastery**, not new systems:
  1. **Micro hit-stop plus camera punch on Tight Fit / Critical** (30–60 ms, off under Reduce Motion). This would bend the "no slow-mo for frequent events" rule, but Tight Fits are the skill expression the scoring rewards most (200 base vs 150 for Perfect). On iOS, with no haptics, the visual punch has to do the work a vibration does elsewhere.
  2. **Extend the pitch ladder** past combo 8, e.g. up an octave, or restart one step higher at each multiplier tier, so a combo of 20 still sounds like climbing (Stack/Smash Hit-style musical escalation).
  3. **Make Flow visible as a payoff**, Smash Hit-multiball style. The Flow state is deliberately text-free, but the player gets no tangible reward from keeping it: a small score aura, tyre trails that change colour, or a ring that brightens tier by tier. That gives a streak something to protect, the way Helix's combo or Smash Hit's multiball do.
  4. **Forgiveness:** `maxStrikes: 1` is Car Circle's "one wrong tap and it falls apart". It conflicts with Voodoo's "forgiving" rule for levels 1–10. Options: a one-time "shield" per shift for the first N levels (shown on the ring), or a shield earned by a 5-merge clean streak, which the multiplayer already has ("five merges without cut-off give a shield", [Spiel.md §11](Spiel.md)). That would carry a proven RAT mechanic into the career.
- The 0.4 s retry lock is excellent (Geometry Dash/Helix-like) and should be protected.

### Gaps
- No primary source (developer talk or postmortem) for Stack's, Helix Jump's or Geometry Dash's specific feel tuning. Only wikis and reviews were found.
- I did not play the game on a device, so audio mix, visual readability of the rating words and the actual "punch" are judged from code and docs only.

---

## 2. First 5 minutes: what a new player sees, learns and unlocks; too much meta too early or too little reward? Is the difficulty curve fair?

### Takeaway
The first five minutes reward a lot, maybe too much and in the wrong place. The sim story shows a "PERFECT RUN" message after almost every early shift, a welcome chest after shift 1, the Daily notice after shift 3, the modes notice after shift 7, three mastery chests at once after shift 8, and the Trials notice after shift 10. Nearly all of these rewards land **outside the core loop**: in the Shop (open chests), Progress (quests, trials) or Build (upgrades). Meanwhile the first upgrade costs 2,600 while early shifts pay about 225–450. The tutorial teaches one thing ("wait for a gap, then tap") and never explains that **tight** timing scores best. After level 12 the curve turns steep: casual-bot loss rates of 62–85 % between levels 20 and 45.

### Cited Findings
**Onboarding (repo)**
- The tutorial has three pills: "Tap to send your first car", "Wait for a gap, then tap", "Clean merges build your combo". On the first crash: "Cars crash instantly. Police get N chances." It moves on after 2 clean merges and never comes back — [Web/src/present/strings.ts:32-37](Web/src/present/strings.ts), [Web/src/present/tutorial.ts:19-66](Web/src/present/tutorial.ts)
- The tab bar (Progress · Game · Shop · Build) shows on every screen except playing and settings, so it is visible from the first ready screen — [Web/src/present/flow.ts:37](Web/src/present/flow.ts)
- Sim story, casual profile, first 15 shifts (`career-sim.mjs 13 --profile=casual --story=15`; bot time):
  - shift 1 (0:00): L1 completed in 7 s, +225, "YOUR FIRST CHEST · open it in the Shop | PERFECT RUN"
  - shift 3 (0:45): "New · the Daily Shift…"
  - shift 5 (1:24): "PERFECT RUN | EVENT CHEST FOUND | CHALLENGE · A Perfect Chain of 5 · +350"
  - shift 7 (2:13): "New modes · swipe sideways for Unlimited, Mayhem, Chill and Multiplayer | PERFECT RUN"
  - shift 8 (2:38): "PERFECT RUN | MASTERY COMPLETE · Tight Spots I, Long Chain I, Combo Master I · 3 CHESTS EARNED"
  - shift 10 (3:26): "New · Trials in Progress → Goals… | PERFECT RUN | LUCKY DROP"
  - shift 13 (4:57): "TAILWIND · so close · your next shift pays +25 %"
  - after 20 shifts: 8 chests earned, 3 upgrade steps bought — (local sim run, 08.10.2026; script [Web/scripts/career-sim.mjs](Web/scripts/career-sim.mjs))
- Economy: shift pay is 150 + 30 × level ([Web/src/core/config.ts:376-378](Web/src/core/config.ts)). The first upgrade costs 2,600 ([Spiel.md §9](Spiel.md)). Sim: "shifts for it" 11.6 at level 2, 8.4 at level 5, 6.3 at level 8 (casual) — (local `sim:career -- 60`)
- Welcome chest at level 2, Lucky Drop 6 % per completed shift — [Web/src/core/config.ts:742-747](Web/src/core/config.ts)
- The earlier redesign spread unlocks so that "five new systems in the first three minutes" became "about one every one to four minutes" — [Spiel.md §9, "Entzerrt"](Spiel.md)

**Difficulty curve (sim, local run 08.10.2026, `npm run sim:career -- 60`)**
- Skilled bot: levels 2–12 in 11 shifts, 0 % lost. Level 15→20 took 27 shifts with **81 % lost**. Overall 54 % of shifts lost by level 60.
- Casual bot: lost 0–71 % up to level 12 (50 % at 10, 71 % at 12). Then 64 % (L20), 79 % (L25), **85 % (L30)**, 79 % (L35), 74 % (L40). Overall 70 % lost, 196 shifts to level 60.
- Careful bot at level 5: 60/60 completed, 0 crashes. Random tapper: 0/60 (`npm run sim -- 60 5`). The rules stay fair (a perfect reader never crashes), but humans are not the careful bot.
- Levels 1→5 ramp up from easy values (`hardLevel: 5`, `levelOneCars: 10`, `easyAiSafeGap: 0.4`, `easyPoliceShare: 0.3`) — [Web/src/core/config.ts:357-374](Web/src/core/config.ts)

**External**
- Voodoo: players should understand the game "within seconds", and failure should be forgiving — [GameAnalytics/Voodoo](https://www.gameanalytics.com/blog/voodoo-guide-mobile-game-design-keep-things-simple)
- Hybrid-casual guidance: the meta should build on a "short, simple and satisfying" core loop rather than replace it, and "simple additions can go far" — [GameAnalytics, Sarah Impey, 2025](https://www.gameanalytics.com/blog/six-games-that-successfully-layer-in-meta-mechanics)
- Crossy Road earned currency through play and spent it on characters, with "no timers, lives or pay-gates", and kept ads from pulling players out of the game — [PocketGamer.biz / GDC summary](https://www.pocketgamer.biz/crossy-road-sharing-retention/) (via search summary); 100 coins buy a random mascot from the Prize Machine, offered right after death — [Wikipedia: Crossy Road](https://en.wikipedia.org/wiki/Crossy_Road), [Crossy Road fan wiki](https://breezewiki.discard.no/crossyroad/wiki/Coins) (wiki, secondary)

### Inferences
- **Reward location problem:** Crossy Road puts the prize machine right at the death/retry moment, so the reward plays out where the player already is. RAT sends rewards away ("open it in the Shop"), and the player has to leave the scene to get them. Proposal: open the welcome chest **in place** on the result card (one tap, the existing chest-opening animation), and offer queued chests on the ready screen as a single "Open" pill. This keeps the "one city" principle and uses the most juicy animation the game has at the moment of highest goodwill.
- **"PERFECT RUN" fatigue:** in the casual story it shows on 7 of the first 10 shifts. A message that appears almost every time stops meaning anything. Show it once (as "the first says what it brings" already intends), then only as a ring signal.
- **Teach the scoring incentive:** the tutorial says "wait for a gap", but scoring pays most for Tight Fits (< 0.12 s) and Perfect centring. A second-session tip ("Closer = more points: try a Tight Fit") would turn a survival game into a mastery game sooner. The Trials' "how-to" text already explains Perfect and Tight ([Web/src/present/strings.ts:211-223](Web/src/present/strings.ts)). That is a reusable asset.
- **First purchase too far away:** 6–12 shifts (several minutes of human play) before the first upgrade is affordable. A guaranteed first upgrade (or a cheaper first step) around shift 3–4 would give the Build tab meaning early, like Ball Blast-style "upgrade after each session" loops ([GameAnalytics/Voodoo summary in search results](https://www.gameanalytics.com/blog/voodoo-guide-mobile-game-design-keep-things-simple)).
- **Difficulty after level 12:** the sim shows a second and longer wall from about level 18 to 45 (casual 74–85 % loss). Even with free retries, losing 4 of 5 shifts for 30–60 minutes of human play is likely where many players stop. Candidates: (a) a soft rubber band, e.g. after 3 losses on one level the next attempt draws the low end of the car-count spread (−2 cars already exists as spread, `shiftCarsSpread: 2`); (b) a slow decay of density on repeated losses; (c) a checkpoint-like "practice this level" in Chill style. All three are deterministic per seed and need no change to replays.

### Gaps
- No real-player funnel data was available here. Umami events `tutorial-done` and `shift` exist ([CLAUDE.md](CLAUDE.md)), but I did not query them. The real D0 drop-off per level is unknown.
- Bot loss rates are a proxy. Real humans may be better at reading slow early levels and worse at police/criminal multitasking.

---

## 3. Session pacing: shift length, restart friction, "one more run" pull, what ends sessions

### Takeaway
Pacing is RAT's biggest structural strength. Shifts are short (Leo's decision, 8–75 s), there is no result screen, a tap restarts after 0.4 s, and Tailwind, near-miss texts ("1 car short of level 12") and the auto-transition into the next ready screen all pull toward "one more". What likely ends sessions is not friction but **streaks of losses at walls** (section 2), the single-try Daily, and the moment of being sent into menus to collect rewards.

### Cited Findings
- "Schichtlänge – entschieden: kurz lassen" (Leo, 26.09.2026): 8–75 s depending on level. "Kurze Schichten tragen das ‚Nur noch eine!'" — [Spiel.md §2](Spiel.md)
- Seamless shift change: no freeze, no replay, no overlay. The result sits in the top card, the next shift's traffic is already driving, and a tap starts at any time — [Spiel.md §2](Spiel.md); memory note "Seamless shift transition"
- Retry input lock 0.4 s — [Web/src/present/hud.ts:1224](Web/src/present/hud.ts)
- Open loops: the ready card names the nearest quest/mastery and the cheapest upgrade within reach. After a loss it says honestly how close it was ("1 car short of level 12", "N points short of your best", "One merge short of ×2") — [Spiel.md §11](Spiel.md), [Web/src/present/strings.ts:1644-1658](Web/src/present/strings.ts)
- Tailwind: losing a shift with ≤ 3 cars left (after ≥ 60 %) makes the next shift pay +25 %, once a day — [Spiel.md §11](Spiel.md)
- Sim bot shift durations: L1 7 s, L8 17 s, L10 29 s (bot time) — (local story run)
- Crossy Road treated retention as "play for as long as they can and they still want to come back tomorrow", and Hall spent "a third to a half" of his time on retention, virality and re-engagement — [Cult of Mac / GDC](https://www.cultofmac.com/news/crossy-road-developers-made-10-million-90-days) (via search summary)
- Helix Jump: instant reset on failure encourages repeated attempts. Critics note grind and ad interruptions that "break the rhythm of retries" — [Playpile](https://playpile.gg/games/helix-jump) (weak source)

### Inferences
- Do not add anything between shifts. That would break RAT's best pacing asset.
- The "one more run" pull in Shift mode is mostly **binary** (clear/lose the level). Score-chasing within a shift is weak, because the shift goal is clearing, not points. The per-level ghost time (±seconds, "NEW BEST TIME") is a good second axis. Showing it as a **ghost marker on the ring** (where your best run was at this car count) would make it visible in the scene rather than as a number.
- Session-ending risk: a run of 3–5 losses on one level with nothing new. The rubber band from section 2, plus a "you're getting closer" signal across attempts (e.g. "best this level: 14/18 cars" as ticks on the ring), turns repeated failure into visible progress, the way Geometry Dash's % progress does ([Geometry Dash Wiki](https://geometrydash.wiki.gg/wiki/Practice_Mode) covers practice mode; the % bar is common knowledge but I found no primary source).

### Gaps
- Real session length per platform (CrazyGames reports 5m45s mobile / 6m47s desktop in a sibling note, `conversion_playtime.md`) can't be broken down per cause without per-event analytics.

---

## 4. Feature bloat vs focus: what to simplify, hide or move later; which underused gems to surface earlier

### Takeaway
RAT has around 40 distinct systems on top of a one-tap core. Each is well built and honest, but together they go well beyond what hyper-casual or even hybrid-casual guidance recommends. The Progress tab alone holds Today (Daily, Weekly, Pass, Quests, Tours, Heat, Season rule), Goals (Trials, Rematches, Boss Rush, Landmarks, Ascension Trials, Mastery I–V, Feats, 123 achievement tiers), Records and Museum. The highest-value "gems" that sit too late or too deep are **Unlimited** (the purest Car Circle-like mode), **Mayhem** (the most "Youtubable" physics), **the Picture/Challenge flow**, and **bosses**. The best candidates to fold together or hide are the overlapping goal ladders: quests, mastery, achievements, feats, trials and tours.

### Cited Findings
- Systems listed in Spiel.md (count by heading/table): career shifts, Unlimited (+ tiers), Mayhem, Chill, Multiplayer, Daily Shift + streak + freeze + mutator, Weekly Shift, Quests (3/day, 14 types), Tours (7 stops), Trials (7) + boss Rematches + Boss Rush + Landmarks + Ascension Trials, Mastery (10 goals × 5 tiers), Feats (7), Achievements (123 tiers in 31 families), Legendary Shifts, Prestige, Elite bar, Heat, Season Pass, Hall of Fame, Museum (30 entries), Albums (9), Chests (4 types), Collection (121 items), Casino (6 games), Upgrades (13 / 86 steps), Street Builder (arms + 5 modules × 3 tiers), Tailwind, season rules, leaderboards (shift, unlimited, daily, boss rush), friends, invites, challenge links, photo, Build with us, cloud sync — [Spiel.md §2–§13](Spiel.md)
- IDEA.md principle 10: "Kein Feature-Bloat. Neues fügt sich möglichst unsichtbar in den Spielfluss ein." Principle 7: "Economy bleibt unterstützend und überdeckt nie die One-Tap-Mechanik" — [IDEA.md](IDEA.md)
- PRODUCT.md: the target user wants "a quick shift of ~20 seconds that feels fair and learnable, and a reason to come back" — [Web/PRODUCT.md](Web/PRODUCT.md)
- Modes are swipeable from the start, but the hint only comes after level 6 (`modeHintAfterLevel: 6`). Unlimited plays at level 3 (`endlessLevel: 3`) — [Web/src/core/config.ts:307, 529](Web/src/core/config.ts), [Spiel.md §2, §9](Spiel.md)
- Sim: at level 60 both bots had 33–35 unopened chests and had bought only 25–26 of 86 upgrade steps. They never built a 5th arm (32,500) — (local `sim:career -- 60`). (The sim does not open chests or use the Street Builder much, so this measures the economy's pace, not player behaviour.)
- Hybrid-casual: the core loop stays "short, simple and satisfying", meta builds on it, and you don't need "a dozen features" — [GameAnalytics, 2025](https://www.gameanalytics.com/blog/six-games-that-successfully-layer-in-meta-mechanics)
- Industry blog view: in pure hyper-casual "most players are gone after 7 days". Hybrid-casual targets 14–30 days with collection, events and mini passes. Vendor/blog sources, unverified — [gamegrowthadvisor](https://gamegrowthadvisor.com/blog/2026-04-16-hybrid-casual-game-design-strategy-2026/), [Eximius Echo substack](https://eximiusecho.substack.com/p/exploring-the-rise-of-hybrid-casual)

### Inferences
- **Fold the goal ladders into one visible "next goal" stream.** Quests, Mastery, Achievements and Feats all answer "what should I aim for?". The ready card already shows one next goal (`Goals.next`, [Web/src/present/session.ts:2439](Web/src/present/session.ts)). Make that the main surface and collapse the rest into a single "Goals" list sorted by closeness. Players then don't need to know four systems exist.
- **Hide late systems entirely until they open.** Heat, Hall of Fame, Ascension, Landmarks and Elite are already level-gated, but their rows and names appear in Progress. Showing far-future items as locked rows ("Opens at level 50") on day 1 adds reading load with no near-term pull.
- **Surface gems earlier:**
  - *Unlimited* is the closest match to the Car Circle players who arrive from portals. Offering it as a visible second card on the first ready screen (or after the first lost shift: "Try Unlimited: no levels, just go") gives players who don't like level structure a home. Today it is hidden behind a swipe that is only hinted after level 6.
  - *Mayhem* (aim for tankers, chain reactions) is the most "Youtubable" content (Voodoo criterion) and showcases the physics. A one-time "Mayhem unlocked" taste around level 4–5, when tankers arrive, would land well.
  - *A first boss earlier.* The first boss is at level 15 ([Spiel.md §5](Spiel.md)), likely 20–40 min of human play. A mini-boss (e.g. a weaker Convoy) at level 5 or 8 gives the first session a climax.
- **Casino:** it opens silently at level 12 and is honestly framed. From a fun/focus standpoint it adds little to the core loop and is a policy risk on some portals. Leaving it as is (quiet, late) is fine. Don't surface it.

### Gaps
- No usage data per system (which tabs and segments players actually open). Umami only tracks `tutorial-done` and `shift`.

---

## 5. Content variety: how often does something new appear in the first 30 minutes?

### Takeaway
New things arrive steadily up to level ~8, then thin out just as the difficulty climbs. Weather starts at 2 % per shift (level 6) and night at 3 % (level 10), so in the first 30 human minutes most players see weather about once and night likely never. The first boss arrives at level 15. Most of the spectacular content (fog, snow, blackout, bosses, motorbikes, learner, school bus) sits beyond what a typical first or second session reaches.

### Cited Findings
- Unlock levels — [Web/src/core/config.ts](Web/src/core/config.ts):
  - tanker and city events (25 %) at L4 (lines 274, 674)
  - light rain at L6, chance +2 %/level (415, 419)
  - military truck at L7 (280)
  - ambulance at L8 (581)
  - night at L10, +3 %/level (456-457)
  - heavy rain at L12 (416)
  - first boss at L15 ([Spiel.md §5](Spiel.md))
  - storm at L18 (417)
  - blackout at L20 (461)
  - motorbike at L22 (603)
  - Legendary at L25 (520)
  - learner at L28 (616)
  - school run at L30 (688)
  - fog at L35 (427)
  - snow at L45 (431)
- Rough expected encounters: summing the bad-weather chance over one shift each at L6–L14 gives 0.02+0.04+…+0.18 ≈ 0.9. Night over one shift each at L10–L14 is ≈ 0.45 (my arithmetic from the config values; repeated attempts after losses add more draws).
- Sim time to level: casual reaches L12 after 19 shifts (~0.1 h bot time), L15 after 22, L20 after 36 (0.3 h). Skilled reaches L20 after 42 shifts (0.4 h) — (local `sim:career -- 60`). Human time is likely 1.5–3× longer (my estimate from bot shift times vs PRODUCT.md's "~20 seconds" per shift; not measured).
- Seasonal rule (autumn, now): "Fog & Dusk" brings fog ×3 and nights ×1.4, but only for weather already open — [Spiel.md §8](Spiel.md)
- Every new condition gets a one-time intro card and an in-shift briefing — [Spiel.md §8](Spiel.md)
- Voodoo: "Youtubable", meaning highly dynamic with lots of visible action — [GameAnalytics/Voodoo](https://www.gameanalytics.com/blog/voodoo-guide-mobile-game-design-keep-things-simple). Scalable content: the mechanic must support variation "or retention will suffer after the first handful of levels" — (search summary of [ilogos guide](https://ilogos.biz/hypercasual-game-development-guide/), weak source)

### Inferences
- **Front-load a guaranteed "first time" of each spectacle** rather than relying on low per-shift chances. Examples: a scripted first rain at L6, a first night at L10, a first fog sampled as a one-off "Fog Bank" event around L12, and the Daily mutator showing a sky the player hasn't met yet. The intro-card and museum systems already support "first sighting". Only the draw needs a guarantee, e.g. "if not yet seen by level X+2, force it", deterministic from the seed.
- **Pull a mini-boss forward** (see section 4). Bosses are the strongest set pieces and the first one sits at level 15.
- The Museum's grey silhouettes ("From Level X") already work as a content preview. A link from the ready card ("Next new: Night, at level 10") would turn the content curve into a visible promise.

### Gaps
- I didn't measure the actual distribution of events per player in the first 30 minutes (it would need a seeded sim that logs conditions per shift). The estimates above are arithmetic from config.

---

## 6. Social and sharing: challenge links, ghost replays, leaderboards: how visible, how easy?

### Takeaway
The social layer is technically rich: short links with server-drawn previews, a Polaroid-style photo, a friend code, invites with a shared reward, leaderboards with tiers, multiplayer with QR. But it is mostly **two to three taps deep and only on the result screen**. There is no visual ghost replay, even though determinism (same seed + same taps) makes one cheap. On CrazyGames and in the Play app, some sharing paths are hidden on purpose.

### Cited Findings
- "Challenge a friend" lives in the Friends drawer → Play tab and is only active while a result with `shareable` is on screen. The first tap prepares the link, a second tap shares it ("Link ready. Tap Challenge a friend again to share it.") — [Web/src/ui/friendsSheet.ts:242-257](Web/src/ui/friendsSheet.ts), [Web/src/present/strings.ts:96](Web/src/present/strings.ts), [Web/src/ui/shell.ts:686](Web/src/ui/shell.ts)
- Under every result there is a "Picture" button. The photo's Share includes the challenge link — [Web/src/ui/shell.ts:198-199](Web/src/ui/shell.ts), [Spiel.md §13](Spiel.md)
- Challenge links replay the same seed/mode/level/upgrades; the goal is the sender's score. Short links show "Beat 12,345 from Leo" previews — [Spiel.md §11](Spiel.md)
- "Ghost" exists only as a best time per level (±seconds in HUD). No code for a visual ghost car exists (a grep for "ghost" finds only skin names) — [Spiel.md §4](Spiel.md); repo search
- Tips (cloud sync, install, website, invite) appear at most one per visit (`takeTip`) — [Web/src/present/session.ts:384-397](Web/src/present/session.ts)
- Leaderboard tiers (Bronze…Master) in Unlimited, the Daily board for the same seed, friends boards — [Spiel.md §2, §11](Spiel.md)
- Crossy Road's designer aimed at "giving people a solid reason to share the game", with characters as the hook. Players share which characters they've unlocked. The social model was based on Flappy Bird's skill-based high scores — [PocketGamer.biz](https://www.pocketgamer.biz/crossy-road-sharing-retention/)
- Wordle: the shareable result (emoji grid) was invented by players and then adopted, and an account is only suggested after a finished puzzle — [MoEngage](https://www.moengage.com/blog/wordle-viral-growth-story/) (cited in sibling note `retention_mechanics.md`)
- IDEA.md growth #1: a clip button for crashes (`canvas.captureStream` + `MediaRecorder`, last 8 s) — [IDEA.md](IDEA.md)

### Inferences
- **One tap, in the scene:** put a "Challenge" pill next to "Picture" on the result card, not behind Friends. Pre-fetch the short link when the result appears, so one tap shares it.
- **Ghost replay is the most "RAT-native" social feature:** with deterministic replays, a friend's challenge or your own best on a level can run as translucent "ghost" cars in your queue, or as tick marks on the ring where they merged. It turns async challenges into a live race and makes the best-time ghost visible. It may conflict with "Die Welt ist die Oberfläche"/no clutter, so keep it faint and optional.
- **Daily result card à la Wordle:** a spoiler-free text/emoji line ("RAT Daily #42 · 18/18 · 🟢🟢🟡🟢… · chain 7") would be shareable in chats without needing an image. The Daily already has one seed for everyone.
- The **crash clip** (IDEA.md) fits Voodoo's "Youtubable" criterion. The physics are the visual hook.

### Gaps
- No data on how often Picture/Challenge are used (no Umami event for it, by design).
- I did not check whether the challenge flow works inside the CrazyGames iframe (link-sharing policy there) — out of scope.

---

## 7. Accessibility and UX issues visible in code and docs

### Takeaway
Accessibility is above average for a web game: Reduce Motion, Larger text, Left-handed, Vehicle Labels, keyboard play, a live region, 44 px targets, colour never used alone. The main gaps are in **timing accessibility**: there is no slower-tempo assist for the career (Chill exists, but it is outside progression), the first crash fails the shift, and there is no haptics fallback on iOS. Secondary gaps: a lot of text-heavy UI (notices, briefings, cards) in a game whose players are often one-handed on a bus, and reward notifications stacked several per shift.

### Cited Findings
- Accessibility features: colours never alone, Vehicle Labels, WCAG AA, 44 px, keyboard (Space, Enter, D/E, Esc, R, Tab, arrows), visible focus, live region, Reduce Motion (off by default), Left-handed, Larger text ×1.2 — [Spiel.md §13](Spiel.md), [Web/PRODUCT.md](Web/PRODUCT.md)
- No assist/slow mode exists in code (search for `assist`/`gameSpeed` found nothing). Chill has a calm tempo and no fail, but it "doesn't count for career, mastery, elite or leaderboards" — repo search; [Spiel.md §2](Spiel.md)
- Haptics only where `navigator.vibrate` exists; iOS Safari has none — [Spiel.md §13](Spiel.md)
- Notices: "each notice on its own line, one after another, at the top under the score" — [Spiel.md §9](Spiel.md). The sim story shows up to 3 notices after a single shift (e.g. shift 10: Trials + Perfect Run + Lucky Drop).
- Briefings replace the top card's numbers with a sentence for 3.5–40 s on first meeting — [Spiel.md §8](Spiel.md)
- Game Developer: "If something is important, make it big… Step back and squint" — [Game Developer](https://gamedeveloper.com/design/6-mistakes-that-ll-drain-the-juice-out-of-your-game)

### Inferences
- **"Steady Hands" assist** (e.g. −15 % ring tempo, +0.1 s criminal timer), opt-in in Settings, with progress still counting but leaderboards flagged/excluded. This is a common game-accessibility pattern and fits the "skill, not luck" rule because it is visible and chosen. It would also soften the level 18–45 wall for players who want it.
- **iOS feel compensation:** on devices without vibration, raise the visual punch on Tight Fit, Critical and Takedown (see section 1).
- **Notification budget:** cap result-card notices at one headline plus a counter ("+2 more in Progress"), with priority rules (new system > reward > info).

### Gaps
- No device testing or screen-reader walkthrough was done for this note. Claims rest on the docs and code.

---

## 8. Which improvements most help retention and playtime? (Prioritized, including IDEA.md items)

### Takeaway
The highest-leverage work is not new content. It is making the existing core and its rewards land **in the scene**, flattening the mid-game wall, and making sharing one tap. From IDEA.md, the items most likely to help retention and playtime are Wochenligen (weekly leagues), Fahrprüfung (hand-built star-rated scenarios for levels 10–40, which directly targets the mid-game wall), the crash clip button, the Challenge-Builder, and Web Push for the Daily (late, data-gated).

### Cited Findings
- IDEA.md open items: Gauntlet, Teams, new late-level elements, mastery per vehicle, Heat refinements, **weekly leagues** ("leaderboards without reset are hopeless for new players"), community raid, **Fahrprüfung** (30–50 hand-built mini-scenarios, 1–3 stars, for levels 10–40), co-op multiplayer, **Challenge-Builder**, more Tours, mutator on Daily board, GlitchTip, and growth items (**crash clip**, more portals, Reddit/HN, Play listing, landing pages, Teams, **Web Push**) — [IDEA.md](IDEA.md)
- Duolingo streak A/B tests moved D14 retention by about +1–3 % relative per change, which argues for stacking small, low-friction hooks — [Duolingo blog](https://blog.duolingo.com/improving-the-streak) (via sibling note `retention_mechanics.md`)
- CrazyGames' D1 levers: meaningful progression, daily reasons to return, saved progress, bug fixes — [CrazyGames Basic Launch guide](https://docs.crazygames.com/resources/basic-launch-metrics/) (via sibling note)
- Sim data: mid-game casual loss 74–85 % at levels 25–40 — (local `sim:career -- 60`)

### Inferences
**Prioritized list (impact ÷ effort; my judgement, not measured):**

*P1: quick, core-feel and first-session*
1. **Rewards in the scene:** open the welcome chest and queued chests from the result/ready card with the existing chest animation, instead of "open it in the Shop" (section 2).
2. **Cut message noise:** "PERFECT RUN" text only the first time, then a ring signal. At most one headline notice per result (sections 2 and 7).
3. **Juice at mastery moments:** 30–60 ms hit-stop and camera punch on Tight Fit/Critical, a pitch ladder that keeps rising past combo 8, a stronger visual punch on iOS (section 1).
4. **One-tap Challenge pill** on the result card next to Picture, with the short link pre-fetched (section 6).
5. **Teach "closer scores more"** with a second-session tip, reusing the Trials' Perfect/Tight how-to text (section 2).

*P2: medium, retention and mid-game*
6. **Soft rubber band on repeated losses** on one level (low end of the car spread, slight density relief), deterministic per seed (sections 2 and 3).
7. **Guaranteed first sighting** of rain, night and a mini-boss within the first session or two (section 5).
8. **Surface Unlimited (and a taste of Mayhem) early**, e.g. after the first lost shift or at level 4, rather than a swipe hint after level 6 (section 4).
9. **Early shield for levels 1–10:** one forgiven crash per shift, or a shield earned by a clean streak (borrowed from Multiplayer) (section 1).
10. **Progress across attempts:** the best car count on this level as ring ticks, or a ghost marker of the best run (section 3).
11. **Fold quests, mastery, achievements and feats** into one "next goal" stream, and hide late-game rows until they open (section 4).

*P3: bigger, from IDEA.md*
12. **Fahrprüfung** (star-rated hand-built scenarios, L10–40): the most direct content answer to the mid-game wall, with replayable 3-star goals (Angry Birds/Cut the Rope pattern; no source fetched).
13. **Weekly leagues:** a weekly reset gives new players a winnable board.
14. **Crash clip button:** shareable physics, "Youtubable".
15. **Ghost replays** of challenges (new, not in IDEA.md): cheap thanks to determinism.
16. **Daily share line** in Wordle style (new): text-only, spoiler-free.
17. **Steady Hands assist** (new; accessibility plus wall relief).
18. **Web Push for the Daily:** only after Umami shows D1/D2 drop (as IDEA.md itself says).

Deliberately not recommended: more casino surfacing, more meta currencies, or anything between shifts. Each would conflict with IDEA.md principles 7, 10 and 11 and with Leo's fixed decisions.

### Gaps
- None of the priorities could be validated against real player data. Umami (`tutorial-done`, `shift` with level/outcome) can show the level at which players stop, and should decide between rubber band, Fahrprüfung and early content first.
- I found no controlled studies quantifying the retention effect of hit-stop/juice, ghost replays or rubber-banding in casual games. The recommendations rest on design guidance and analogy.
