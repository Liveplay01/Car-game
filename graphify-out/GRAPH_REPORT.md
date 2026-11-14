# Graph Report - Car game  (2026-11-13)

## Corpus Check
- 523 files · ~6,490,273 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 25 file(s) not represented in the graph (top: .css 9, (none) 9, .graphify-bak 1)

## Summary
- 6184 nodes · 18807 edges · 222 communities (205 shown, 17 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 1005 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `68d8b238`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- v
- strings.ts
- make_casino_sounds.py
- shell.ts
- make_boss_sounds.py
- progress.ts
- ranksPanel.ts
- make_drift_sounds.py
- it/p6.ts
- referrals/index.ts
- h
- .constructor
- levelTrialLevel
- PlayerStore
- validate-findings.cjs
- .react
- levels.ts
- main.ts
- crews/index.ts
- Db
- cloud.ts
- validate-coverage-ledger.cjs
- GameSession
- museumSignal.ts
- DetailSheet
- preview.ts
- clubPanel.ts
- Web/package.json
- isObject
- db.ts
- CasinoState
- Car Game Web (Roundabout Timing browser game)
- feedback.ts
- de/p6.ts
- app.ts
- LOOT.md
- socialPage.ts
- SoundID
- carArt.ts
- DESIGN-LANGUAGE.md
- traffic.ts
- .play
- detail.ts
- draw.ts
- numpy
- fr/p6.ts
- .frame
- ko/p6.ts
- Data Isolation and Lifecycle Hunting
- PushStore
- render.mjs
- Fit
- compose-stills.mjs
- admin/index.ts
- IDEA.md
- Stack
- scripts/test.mjs
- server.ts
- Memory Safety, Binary, and Kernel Hunting
- lib.mjs
- CasinoFlow
- BootDescent
- habits.ts
- mul
- Ranglisten-Dienst (Server/, Node 22 + Hono + SQLite)
- reel-greed.mjs
- vite.config.ts
- Server/package.json
- clamp
- Wallet
- ja/p6.ts
- i18n.ts
- Resource Exhaustion and Availability Hunting
- vite
- compilerOptions
- reel-wait.mjs
- Deterministic simulation (same seed + taps = same result)
- reel-rate.mjs
- HostMessage
- names.ts
- present/museum.ts
- Security Audit
- perspective.ts
- zh/p6.ts
- compilerOptions
- Room
- reel-chest.mjs
- seal.ts
- daily.ts
- AI, LLM, and Agent Hunting
- make_shortcut_icons.py
- Roundabout Timing (RAT)
- Briefings
- Casino (Shop · Casino)
- Client-Side and Browser Hunting
- .perform
- Fmt
- .prepareShift
- scripts
- present/casino.ts
- compose/batch.mjs
- Security Audit
- Trials (fixed-seed special shifts)
- Transitions UI generation
- Scroller
- Sanfter Einstieg (forIntro-Leiter)
- core/museum.ts
- money
- reel-crash.mjs
- SwipeMode
- ad-speed.mjs
- meter.ts
- Ring as UI ('one city, one ring')
- Animated icon system (animatedIcons.ts)
- ad-rage.mjs
- short-wide.mjs
- reel-city.mjs
- reel-sky.mjs
- translate.mjs
- ad-calm.mjs
- Determinismus (fester Zeitschritt + Seed)
- Supply Chain and Release Hunting
- Spiel.md (Roundabout Timing overview)
- Product Marketing Context
- Lamps
- Chests (Standard, Premium, Criminal Hunt, Event)
- short.mjs
- Stack
- .persist
- ui/photo.ts
- game.spec.ts
- Custom Store Listings: Roundabout Timing
- Room
- devProbe.ts
- devDependencies
- Deployment (Docker, nginx, Port 5050, Coolify)
- Spielsprachen (EN, DE, ES, FR, IT, JA, KO, ZH)
- Name Roundabout Timing (RAT)
- Zielgeräte (Handy Hochformat einhändig, Desktop)
- mafiaPanel
- CanvasDrawer
- Changelog API (/changelog.json)
- animatedIcons.ts
- session.ts
- ui/backdrop.ts
- UX-Kritik Roundabout Timing (Web, Spiel-Tab, HUD, Ergebnis, Dock)
- 2. Gerankte Liste der Optimierungsmöglichkeiten
- dependencies
- gen.mjs
- .shareLobby
- Config
- condition-icons.mjs
- Daily Shift and streak
- .open
- Balance Check
- ui-generation.js
- Cloud and Deployment Hunting
- HTTP-Protocol and Authentication Hunting
- Prestige
- Localization Pipeline
- confirmed
- Transitions Polish
- .item
- store-preview.mjs
- Desktop, Mobile, and Local IPC Hunting
- Transitions.dev
- Native App-Anmutung (schwebendes Dock, iOS-Stil)
- transitions-dev/SKILL.md
- Card hover tilt
- Probe
- Avatar group hover
- Error state shake
- Accordion expand
- Success check
- Input clear with dissolve
- Card resize
- Number pop-in
- Notification badge
- Text states swap
- Menu dropdown
- Modal open / close
- Panel reveal
- Page side-by-side
- Icon swap
- Shimmer text
- Tabs sliding
- Tooltip open/close
- Texts reveal
- Toast open / close
- Like button
- Learn more hover
- Checkbox check
- Spinning counter
- Toggle
- Thinking states
- Reasoning stream
- Streaming text
- Matrix dot loader
- Banner stacking
- Text morph
- Text swap soft
- Donut chart
- Play Console: Store-Eintrag für Roundabout Timing
- messages.ts
- Vulnerability Hunting
- room.ts
- Protocols, RPC, and Messaging Hunting
- Fehler: Crashes (maxStrikes 1, maxPoliceCrashes 3)
- proofModule.ts
- VersusMatch
- NoticeQueue
- validate-findings.test.cjs
- Code Review
- Changelog
- Patch Notes
- Performance Profile
- Bug Report

## God Nodes (most connected - your core abstractions)
1. `GameSession` - 250 edges
2. `World` - 219 edges
3. `v()` - 178 edges
4. `Vec2` - 175 edges
5. `h()` - 152 edges
6. `RenderList` - 138 edges
7. `mul()` - 109 edges
8. `add()` - 101 edges
9. `money()` - 88 edges
10. `ColorToken` - 85 edges

## Surprising Connections (you probably didn't know these)
- `Browser-session attack classes (subagent_type: `general`)` --references--> `Path`  [INFERRED]
  .agents/skills/security-audit/WEB-PROTOCOL-AND-AUTH.md → Web/src/core/paths.ts
- `Phase 0: Resolve Budget Enforcement` --references--> `off()`  [INFERRED]
  .claude/skills/perf-profile/SKILL.md → Web/src/ui/cloudSheet.ts
- `Rang 5: Comeback-Truhe mit festen, sichtbaren Chancen` --references--> `summary()`  [INFERRED]
  implementation_ranking.md → Web/src/ui/cloudSheet.ts
- `Service-worker and browser-storage attack classes (subagent_type: `general`)` --references--> `storage()`  [INFERRED]
  .agents/skills/security-audit/CLIENT-SIDE.md → Web/src/storage/store.ts
- `Decision rules` --references--> `skeleton()`  [INFERRED]
  .claude/skills/transitions-ui-generation/SKILL.md → Web/src/ui/ranksPanel.ts

## Import Cycles
- 2-file cycle: `Web/src/present/casino.ts -> Web/src/present/casinoKit.ts -> Web/src/present/casino.ts`
- 2-file cycle: `Web/src/present/casino.ts -> Web/src/present/casinoWallet.ts -> Web/src/present/casino.ts`
- 3-file cycle: `Web/src/present/casino.ts -> Web/src/present/shop.ts -> Web/src/present/casinoWallet.ts -> Web/src/present/casino.ts`
- 3-file cycle: `Web/src/present/casino.ts -> Web/src/present/casinoGames.ts -> Web/src/present/casinoKit.ts -> Web/src/present/casino.ts`
- 3-file cycle: `Web/src/core/career.ts -> Web/src/core/museum.ts -> Web/src/core/trials.ts -> Web/src/core/career.ts`
- 4-file cycle: `Web/src/present/casino.ts -> Web/src/present/casinoGames.ts -> Web/src/present/shop.ts -> Web/src/present/casinoWallet.ts -> Web/src/present/casino.ts`

## Hyperedges (group relationships)
- **Optional online services around the offline-first game** — spiel_server_service, spiel_cloud_sync, spiel_referrals, spiel_challenge_links, spiel_multiplayer [EXTRACTED 0.85]
- **Casino-Spiele mit ehrlichen Rückzahlquoten** — loot_crash_game, loot_slots, loot_skin_upgrade, loot_roundabout_roulette, loot_scratch_card [EXTRACTED 0.95]
- **Spielquellen speisen die Website (Changelog, Site-Daten, Museum)** — web_readme_changelog_api, claude_site_data_api, claude_patch_notes, claude_museum_grows, claude_website_content [EXTRACTED 0.95]
- **Android-Build-Ablauf (Vorbereitung bis Release-Check)** — new_playstore_build_upload_key, new_playstore_build_build_pwabuilder, new_playstore_build_assetlinks, new_playstore_build_upload_play_console, new_playstore_build_post_release_checks [EXTRACTED 0.95]
- **Social-Reel Produktionsablauf** — marketing_video_step_capture, marketing_video_step_find_moments, marketing_video_step_cut, marketing_video_step_render [EXTRACTED 0.95]
- **Late content tied to prestige ranks** — spiel_prestige, spiel_syndicate_bosses, spiel_late_specials, spiel_ascension_trials, spiel_endgame_expansion [EXTRACTED 0.95]
- **Distribution channels of the same web build** — web_readme_pwa, web_readme_crazygames, web_readme_itch_io, web_readme_google_play [EXTRACTED 1.00]
- **Server modules paying out via the rewards table** — server_readme_invites, server_readme_feedback, server_readme_crews, server_readme_rewards [EXTRACTED 1.00]
- **Daily streak retention loop** — spiel_daily_shift, spiel_streak_freeze, spiel_heat, spiel_quests, spiel_tailwind, spiel_after_work [INFERRED 0.75]
- **Local save, seal and cloud copy flow** — web_readme_saving, web_readme_sealed_save, web_readme_cloud_sync, server_readme_cloud_save [INFERRED 0.85]
- **Determinismus-Kette (fester Takt, Seed, Zeitstempel-Taps, Replays, Challenges)** — claude_fixed_timestep, foundation_game_loop, foundation_determinism, claude_challenge_links, foundation_docking_points [INFERRED 0.85]
- **Wiederkehr-Mechaniken (Weg zurück, Push, Leise Hilfe, Streak-Anzeigen), gemessen mit Umami** — claude_way_back, claude_push_notifications, claude_quiet_help, claude_streak_ads_moments, claude_analytics_umami [INFERRED 0.85]

## Communities (222 total, 17 thin omitted)

### Community 0 - "v"
Cohesion: 0.03
Nodes (166): ExplosionKind, ExplosionReport, ConditionEntry, Scoring, TAU, v(), Vec2, AdPill (+158 more)

### Community 1 - "strings.ts"
Cohesion: 0.10
Nodes (23): challengeNeed(), TitleRule, FeatGoal, NearMiss, CasinoFeat, PassReward, PassStep, RunId (+15 more)

### Community 2 - "make_casino_sounds.py"
Cohesion: 0.16
Nodes (31): band(), blinker(), click(), burst(), casino_stop(), chips_in(), coin_clink(), coin_land() (+23 more)

### Community 3 - "shell.ts"
Cohesion: 0.03
Nodes (90): Settings, asked(), confirm(), disablePush(), enablePush(), local(), mutedChoices(), mutedTopics() (+82 more)

### Community 4 - "make_boss_sounds.py"
Cohesion: 0.21
Nodes (16): armoured(), boss_escaped(), boss_stem(), convoy(), decoy(), drum(), getaway(), hz() (+8 more)

### Community 5 - "progress.ts"
Cohesion: 0.04
Nodes (96): masteryValue(), BOSS_KINDS, BossKind, TrialRule, bossInBlackout(), Darkness, firstBossLevel(), UpgradeGroup (+88 more)

### Community 6 - "ranksPanel.ts"
Cohesion: 0.05
Nodes (49): dayNumber(), TITLE_TIER, TitleTier, Incoming, fetchCrewBoard(), Account, accountListeners, BASE (+41 more)

### Community 7 - "make_drift_sounds.py"
Cohesion: 0.10
Nodes (21): encode(), main(), finish(), main(), bandpass(), blow_off(), engine(), flutter() (+13 more)

### Community 8 - "it/p6.ts"
Cohesion: 0.13
Nodes (7): chest(), how(), lockedHint(), opened(), source(), stepEffect(), total()

### Community 9 - "referrals/index.ts"
Cohesion: 0.15
Nodes (23): transaction(), Challenge, CHALLENGE_LIFETIME_MS, CHALLENGE_MIGRATIONS, gonePage(), Mode, MODES, sharePage() (+15 more)

### Community 10 - "h"
Cohesion: 0.07
Nodes (84): addCrewXp(), adoptCrewText(), claimGift(), CrewGift, CrewMember, CrewPreview, CrewProfile, CrewStanding (+76 more)

### Community 11 - ".constructor"
Cohesion: 0.03
Nodes (71): Haptics, decodeChallenge(), fromBase64Url(), displayConfig, knownShortLink(), made, shortLink(), openCrewLink() (+63 more)

### Community 12 - "levelTrialLevel"
Cohesion: 0.21
Nodes (19): ascensionRank(), levelKind, levelTrialLevel(), rematchKind(), TrialId, goal(), name(), goal() (+11 more)

### Community 13 - "PlayerStore"
Cohesion: 0.14
Nodes (9): erasePlayer(), hashToken(), isUniqueViolation(), NameTaken, Player, PLAYER_MIGRATIONS, PlayerRow, PlayerStore (+1 more)

### Community 14 - "validate-findings.cjs"
Cohesion: 0.10
Nodes (39): canonicalKey(), append(), encode(), codePointLength(), collect(), collectDataLimitErrors(), collectFindingSemanticErrors(), collectSchemaErrors() (+31 more)

### Community 15 - ".react"
Cohesion: 0.06
Nodes (6): Coverage-critic waves, CameraFx, SmokeCurtain, PopupKind, TyreMarks, VehicleLamps

### Community 16 - "levels.ts"
Cohesion: 0.09
Nodes (39): builtArmSlots(), cloneConfig(), slotDistance(), weatherSeverity(), challengesOf(), reactionTime(), applyBoss(), armPrice() (+31 more)

### Community 17 - "main.ts"
Cohesion: 0.04
Nodes (79): HINTS, ProofMode, boot, bootErrored(), bootFailed(), bootRejected(), canvas, fail (+71 more)

### Community 18 - "crews/index.ts"
Cohesion: 0.06
Nodes (41): PROFILE_BOARDS, BOT_NAMES, BOT_WEEK_XP, botsOf(), DEMOTE, GOAL_PER_MEMBER, GROUP_REAL, GROUP_SIZE (+33 more)

### Community 19 - "Db"
Cohesion: 0.04
Nodes (9): Db, ChallengeStore, ErrorStore, FeedbackStore, FriendStore, FundStore, MessageStore, ReferralStore (+1 more)

### Community 20 - "cloud.ts"
Cohesion: 0.06
Nodes (84): accountOf(), adopt(), arrive(), check(), choosing(), cloudChanged(), CloudDeps, cloudEnabled (+76 more)

### Community 21 - "validate-coverage-ledger.cjs"
Cohesion: 0.06
Nodes (66): ATTEMPT_FIELDS, ATTEMPT_STATUSES, canonicalCoverageId(), collectUnitErrors(), createErrorList(), encodeCanonicalRef(), escapeUnsafeDiagnosticCharacters(), fs (+58 more)

### Community 22 - "GameSession"
Cohesion: 0.03
Nodes (12): Belohnungs-Leiter (Leo, 05.11.2026), Entscheidungen im Volltext, streak(), TUNABLE, CityRise, Holiday, Intro, NewsItem (+4 more)

### Community 23 - "museumSignal.ts"
Cohesion: 0.11
Nodes (20): SpecialKind, Beacon, BLUE, BOSS_SIGNAL, CARGO, fullCycle(), GOLD, MuseumSignal (+12 more)

### Community 24 - "DetailSheet"
Cohesion: 0.14
Nodes (5): Detail, SignalLoop, DetailSheet, rich(), rubber()

### Community 25 - "preview.ts"
Cohesion: 0.06
Nodes (45): ACCENT, AMBER, ASPHALT, BACKGROUND_BOTTOM, BACKGROUND_TOP, BLACK, BOARD, BOARD_EDGE (+37 more)

### Community 26 - "clubPanel.ts"
Cohesion: 0.10
Nodes (51): AuctionEvent, AuctionRun, Lot, Fund, FundView, GIFTS, fetchIdeas(), giveToIdea() (+43 more)

### Community 27 - "Web/package.json"
Cohesion: 0.18
Nodes (9): @fontsource-variable/overpass, @playwright/test, description, @types/node, typescript, name, private, type (+1 more)

### Community 28 - "isObject"
Cohesion: 0.13
Nodes (37): familyOf(), readLot(), newCareer(), newSave(), roundTimes(), STREAK_LOG_MAX, StreakDay, isObject() (+29 more)

### Community 29 - "db.ts"
Cohesion: 0.08
Nodes (49): RFC-8188, RFC-8291, RFC-8292, clientIp(), createApp(), address(), headerName(), integer() (+41 more)

### Community 30 - "CasinoState"
Cohesion: 0.22
Nodes (8): CasinoGame, SlotSymbol, CasinoState, Layout, edgeDistance(), needleTime(), needleTurn(), slotEnd()

### Community 31 - "Car Game Web (Roundabout Timing browser game)"
Cohesion: 0.06
Nodes (49): CrazyGames-Einbettung (?crazygames), Vollbild-Inszenierung rewardBurst (nur drei Momente), Freiwillige Werbung (nur Rewarded Ads), Streak-Anzeigen und Schlüsselmomente, Leaderboards (shift-level, unlimited, daily, rush, casino), Car Game server (Hono + SQLite), Challenge short links, City Fund (legacy) (+41 more)

### Community 32 - "feedback.ts"
Cohesion: 0.06
Nodes (28): AudioPlayer, DRIFT_SAMPLES, DriftSample, DriftVoice, RainVoice, TRAFFIC_SAMPLES, TrafficSample, TrafficVoice (+20 more)

### Community 33 - "de/p6.ts"
Cohesion: 0.05
Nodes (23): masteryNumeral(), MONEY_MARK, chest(), how(), lockedHint(), opened(), source(), stepEffect() (+15 more)

### Community 34 - "app.ts"
Cohesion: 0.10
Nodes (54): hono, AppOptions, modules(), Config, ApiError, cleanText(), integerField(), readJson() (+46 more)

### Community 35 - "LOOT.md"
Cohesion: 0.07
Nodes (43): Mehr Touren (Frühling, Sommer), Alben (Maps, Commons … Honours, Tours), Bug Hunters (Ladybug … Firefly, Beetle), Auto-Formen (Beetle, Pocket, GT Coupé, Roadster, Jeep, Hot Rod), Car Skins (39), Casino-Skins (Lucky Strike, Mega Win, Double Down, Tycoon), Truhe aufklopfen (8 Tipps, chestTaps), Truhen-Tabelle (+35 more)

### Community 36 - "socialPage.ts"
Cohesion: 0.09
Nodes (12): hasCrew(), pullToRefresh(), STAGES, RanksActions, ranksPanel(), renderFooter(), renderTop(), NEEDS_ACCOUNT (+4 more)

### Community 37 - "SoundID"
Cohesion: 0.12
Nodes (9): HapticID, SoundID, SessionOutput, honourGroup(), onHonours(), shelfGroups(), shelfItems(), shelfOf() (+1 more)

### Community 38 - "carArt.ts"
Cohesion: 0.04
Nodes (73): driftSteer(), Pose, Crashed, Dent, seriesLeaders(), STEP, CarArt, carArts (+65 more)

### Community 39 - "DESIGN-LANGUAGE.md"
Cohesion: 0.07
Nodes (40): Accessibility & Inclusion (WCAG AA, 44 px, Tastatur), Actions: Tippen wählt, Knopf kauft; zweimal fragen nur bei Unwiderruflichem, Anti-References (Casino-Mobile-Games, Neon-Clutter), Brand Personality (calm, precise, satisfying), Kamera als Lesbarkeit, nicht Dekoration, Kontrast auf jeder Karte (npm run e2e prüft), Canvas readability (Scrim/Outline, AA auf jeder Karte), Casino als einzige Ausnahme vom "no casino look" (+32 more)

### Community 40 - "traffic.ts"
Cohesion: 0.02
Nodes (139): AmbulancePhase, ambulanceThrough(), clearArc(), clearZone(), firstAmbulance(), isFireRun(), isOnClearRoad(), joinsClearRoad() (+131 more)

### Community 41 - ".play"
Cohesion: 0.13
Nodes (4): AdFlow, BuildFlow, PageHost, ShopFlow

### Community 42 - "detail.ts"
Cohesion: 0.05
Nodes (70): AuctionBot, ceilings, NAMES, streams, Career, MASTERY_CLASSIC_TIERS, MASTERY_GOALS, MASTERY_THRESHOLDS (+62 more)

### Community 43 - "draw.ts"
Cohesion: 0.09
Nodes (25): GroundGrain, sameItem(), sameItems(), samePoint(), samePoints(), Still, CJK, FONT (+17 more)

### Community 44 - "numpy"
Cohesion: 0.31
Nodes (8): boom(), engine(), envelope(), load(), main(), place(), resample(), riser()

### Community 45 - "fr/p6.ts"
Cohesion: 0.13
Nodes (7): chest(), how(), lockedHint(), opened(), source(), stepEffect(), total()

### Community 46 - ".frame"
Cohesion: 0.07
Nodes (6): tensionOf(), CityPulse, LampWave, ProgressSection, Layout, ProgressState

### Community 47 - "ko/p6.ts"
Cohesion: 0.13
Nodes (7): chest(), how(), lockedHint(), opened(), source(), stepEffect(), total()

### Community 48 - "Data Isolation and Lifecycle Hunting"
Cohesion: 0.20
Nodes (9): Core discipline (include in every agent prompt for this domain), Data Isolation and Lifecycle Hunting, Deletion, revocation, and lifecycle attack classes (subagent_type: `general`), Derived-data and disclosure attack classes (subagent_type: `general`), Export, backup, restore, and migration attack classes (subagent_type: `general`), Tenant and object-isolation attack classes (subagent_type: `general`), Universal moves (apply across the above), Validation rules (apply before reporting ANY finding here) (+1 more)

### Community 49 - "PushStore"
Cohesion: 0.05
Nodes (24): ScoreEvent, ALL_TIME, awake(), CAP_MS, COMEBACK_DAYS, COMEBACK_TEXT, GAME_TOPICS, IDLE_DAYS (+16 more)

### Community 50 - "render.mjs"
Cohesion: 0.17
Nodes (9): CACHE, FOOTAGE, frameDir, OUT, page, pending, range, ROOT (+1 more)

### Community 51 - "Fit"
Cohesion: 0.32
Nodes (3): rounds, Fit, part()

### Community 52 - "compose-stills.mjs"
Cohesion: 0.05
Nodes (37): LISTINGS, only, OUT, tab, FONT, OUT, page(), SLIDES (+29 more)

### Community 53 - "admin/index.ts"
Cohesion: 0.06
Nodes (36): ADMIN_PAGE, MAX_TEXT, MIN_TEXT, BUG_HUNTER_SKINS, DAY_MS, Feedback, FEEDBACK_KINDS, FEEDBACK_MIGRATIONS (+28 more)

### Community 54 - "IDEA.md"
Cohesion: 0.10
Nodes (27): Gebaut 05.–07.10.: Streak Freeze, Heat, Touren, Achievements, Challenge-Builder (kein Freitext, keine Moderation), Co-op-Multiplayer (2–4 Spieler, ein Crash trifft alle), Discord mit Patch Notes aus /changelog.json, Gauntlet (Unlimited mit Lauf-Effekten), GlitchTip für Fehlerberichte, Wachstum: mehr Spieler erreichen, Landeseiten für Suchbegriffe (Car Circle Alternative) (+19 more)

### Community 56 - "scripts/test.mjs"
Cohesion: 0.09
Nodes (15): Trailer-Pipeline – Roundabout Timing, Wie es funktioniert, careful(), completed(), fakeStorage(), lostAt(), play(), rushShift() (+7 more)

### Community 57 - "server.ts"
Cohesion: 0.06
Nodes (28): displayCode(), normalizeCode(), randomCode(), Entry, EntryRow, Flag, LEADERBOARD_MIGRATIONS, listed() (+20 more)

### Community 58 - "Memory Safety, Binary, and Kernel Hunting"
Cohesion: 0.20
Nodes (10): Binary loading and runtime attack classes (subagent_type: `general`), Bounds, integer, and representation attack classes (subagent_type: `general`), Core discipline (include in every agent prompt for this domain), FFI and ABI attack classes (subagent_type: `general`), Kernel and privileged-interface attack classes (subagent_type: `general`), Lifetime, type, and concurrency attack classes (subagent_type: `general`), Memory Safety, Binary, and Kernel Hunting, Universal moves (apply across the above) (+2 more)

### Community 59 - "lib.mjs"
Cohesion: 0.14
Nodes (25): boot(), botLog(), CLIPS, freeze(), installBot(), LANDSCAPE, markStart(), open() (+17 more)

### Community 60 - "CasinoFlow"
Cohesion: 0.15
Nodes (5): CasinoTarget, CasinoFlow, CasinoHost, flipTier(), payTier()

### Community 62 - "habits.ts"
Cohesion: 0.19
Nodes (4): Habits, Notes, PLAIN, Tune

### Community 63 - "mul"
Cohesion: 0.06
Nodes (86): capsule, closestPoints(), closestPointsInto(), contact, contactInto(), contactPoint(), ContactSlot, gap() (+78 more)

### Community 64 - "Ranglisten-Dienst (Server/, Node 22 + Hono + SQLite)"
Cohesion: 0.13
Nodes (22): Auktionshaus (core/auction.ts), Build with us (Bug-Reports und Ideen), Casino statt Store, Cloud-Spielstand per Sync-Code, Der Club (Geldsenken, ab Level 50), Crews statt Freunde (Wochen-Liga), Freundescode (K7M2-9QXA), Game Fund (net/ideas.ts, core/fund.ts) (+14 more)

### Community 65 - "reel-greed.mjs"
Cohesion: 0.09
Nodes (18): a, b, booms, bustT, c, clutchT, crash1, crash2 (+10 more)

### Community 66 - "vite.config.ts"
Cohesion: 0.08
Nodes (24): DescentTuning, address(), email(), GAME_NAME, HOSTING, LEGAL_DOCS, LEGAL_UPDATED, LegalSection (+16 more)

### Community 67 - "Server/package.json"
Cohesion: 0.09
Nodes (22): @hono/node-server, dependencies, hono, @hono/node-server, description, devDependencies, @types/node, typescript (+14 more)

### Community 68 - "clamp"
Cohesion: 0.06
Nodes (54): gravity(), moduleLevel(), moduleZone(), busStop(), canSpeedUp(), drive(), hasTransporterOnRing(), Lead (+46 more)

### Community 69 - "Wallet"
Cohesion: 0.17
Nodes (5): CasinoRound, CasinoCue, Books, CoinFlight, Wallet

### Community 70 - "ja/p6.ts"
Cohesion: 0.13
Nodes (7): chest(), how(), lockedHint(), opened(), source(), stepEffect(), total()

### Community 71 - "i18n.ts"
Cohesion: 0.11
Nodes (11): INVITE_LEVEL, TourId, Plain, Words, rule(), rule(), rule(), rule() (+3 more)

### Community 72 - "Resource Exhaustion and Availability Hunting"
Cohesion: 0.20
Nodes (9): Computational amplification attack classes (subagent_type: `general`), Core discipline (include in every agent prompt for this domain), Failure and recovery attack classes (subagent_type: `general`), Quota and scheduling attack classes (subagent_type: `general`), Resource accumulation attack classes (subagent_type: `general`), Resource Exhaustion and Availability Hunting, Universal moves (apply across the above), Validation rules (apply before reporting ANY finding here) (+1 more)

### Community 73 - "vite"
Cohesion: 0.06
Nodes (20): vite, tries, auctions, CHECKPOINTS, PROFILES, story, target, built (+12 more)

### Community 74 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 75 - "reel-wait.mjs"
Cohesion: 0.09
Nodes (28): landing(), booms, end, flashes, hits, play(), sfx, shots (+20 more)

### Community 76 - "Deterministic simulation (same seed + taps = same result)"
Cohesion: 0.15
Nodes (19): App shortcuts (Daily, Unlimited, Multiplayer), Technical architecture (core / present / audio / storage / net / ui), Challenge links, Cloud sync by sync code, CrazyGames distribution (?crazygames), Decisions log (Entscheidungen), Deployment (Docker, nginx, Coolify, port 5050), Deterministic simulation (same seed + taps = same result) (+11 more)

### Community 77 - "reel-rate.mjs"
Cohesion: 0.12
Nodes (17): booms, c1, crash(), end, f, fHit, flashes, fTap (+9 more)

### Community 79 - "names.ts"
Cohesion: 0.16
Nodes (15): crewName(), checkName(), NAME_MAX, NAME_MIN, NameCheck, nameKey(), RESERVED, ANYWHERE (+7 more)

### Community 80 - "present/museum.ts"
Cohesion: 0.14
Nodes (20): CONDITION_ICONS, ConditionIconId, ICON_KEYFRAMES, IconPart, IconShape, Paint, Track, Bezier (+12 more)

### Community 81 - "Security Audit"
Cohesion: 0.11
Nodes (16): Category 1: Save File and Serialization Security, Category 2: Network and Multiplayer Security (skip if single-player only), Category 3: Input Validation, Category 4: Data Exposure, Category 5: Cheat and Anti-Tamper Vectors, Category 6: Dependency and Supply Chain, Collaborative Protocol, Engine pattern sets — read this before any Category below (+8 more)

### Community 82 - "perspective.ts"
Cohesion: 0.24
Nodes (9): lerpV(), blendCameras(), CameraRig, Perspective, perspectiveCamera(), perspectiveOf(), PerspectiveTuning, streetCamera() (+1 more)

### Community 83 - "zh/p6.ts"
Cohesion: 0.13
Nodes (7): chest(), how(), lockedHint(), opened(), source(), stepEffect(), total()

### Community 84 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 85 - "Room"
Cohesion: 0.13
Nodes (5): BestOf, RateLimit, Room, RoomEvents, LobbyParts

### Community 86 - "reel-chest.mjs"
Cohesion: 0.12
Nodes (14): a, b, booms, c, CHEST, d, end, flashes (+6 more)

### Community 87 - "seal.ts"
Cohesion: 0.29
Nodes (8): encoder, fraction(), H0, hmac(), K, KEY, rotr(), sha256()

### Community 88 - "daily.ts"
Cohesion: 0.05
Nodes (47): GAME_MODES, StreakMilestone, CAR_TYPES, challengeCareer(), challengeConfig(), challengeOf(), ChallengeSpec, encodeChallenge() (+39 more)

### Community 89 - "AI, LLM, and Agent Hunting"
Cohesion: 0.20
Nodes (9): AI, LLM, and Agent Hunting, Context, retrieval, and memory attack classes (subagent_type: `general`), Core discipline (include in every agent prompt for this domain), MCP and sub-agent trust classes (subagent_type: `general`), Output and disclosure attack classes (subagent_type: `general`), Tool and action attack classes (subagent_type: `general`), Universal moves (apply across the above), Validation rules (apply before reporting ANY finding here) (+1 more)

### Community 90 - "make_shortcut_icons.py"
Cohesion: 0.14
Nodes (6): canvas(), daily(), main(), multiplayer(), ranks(), unlimited()

### Community 91 - "Roundabout Timing (RAT)"
Cohesion: 0.14
Nodes (15): Car Circle (Shoom Games) inspiration, Real crash physics (crash.ts, drivers.ts), Gas tanker and Military truck, Hard vs. soft fail rules, Level trials and Build trials, Mayhem mode, Ring bots and AI traffic (minRingBots), Roundabout Timing (RAT) (+7 more)

### Community 93 - "Casino (Shop · Casino)"
Cohesion: 0.11
Nodes (25): Offener Bug: Geld zurückspulen über Cloud-Kopie, Bewusst nicht gebaut (Luck-Bonus, Set-Boni …), Casino-Konto auf dem Server (nicht gebaut), Casino (Shop · Casino), Fair gebautes Casino, Casino-Rangliste (casinoProfit), Crash (96 % Rückzahlung), Doppelt oder nichts (faire Münze) (+17 more)

### Community 94 - "Client-Side and Browser Hunting"
Cohesion: 0.18
Nodes (10): Client-Side and Browser Hunting, Core discipline (include in every agent prompt for this domain), Cross-origin messaging and network attack classes (subagent_type: `general`), Cross-site information leak classes (subagent_type: `general`), DOM and object-state attack classes (subagent_type: `general`), Service-worker and browser-storage attack classes (subagent_type: `general`), UI-redress and navigation attack classes (subagent_type: `general`), Universal moves (apply across the above) (+2 more)

### Community 96 - "Fmt"
Cohesion: 0.06
Nodes (32): DarkKind, RoadKind, WeatherKind, comboMultiplier(), Fmt, grouping, multiplier(), trimmed() (+24 more)

### Community 97 - ".prepareShift"
Cohesion: 0.09
Nodes (3): popupLife(), BrakeMarks, Tutorial

### Community 98 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, build, build:proof, dev, e2e, itch, preview, sim (+8 more)

### Community 99 - "present/casino.ts"
Cohesion: 0.10
Nodes (43): Casino, CASINO_GAMES, CoinFlip, isStakeable(), RouletteSpin, SALT, ScratchCard, SLOT_SYMBOLS (+35 more)

### Community 100 - "compose/batch.mjs"
Cohesion: 0.12
Nodes (11): LAND, only, queue, SHOTS, failed, first, jobs, only (+3 more)

### Community 101 - "Security Audit"
Cohesion: 0.15
Nodes (13): Anti-patterns, Core principles, Full audit setup, Operating modes, Platform terminology, Recommend the smallest effective source fix, Require a boundary and result, Respect source visibility (+5 more)

### Community 102 - "Trials (fixed-seed special shifts)"
Cohesion: 0.16
Nodes (14): Ascension trials (prestige rank trials), Boss Rush, Briefings and condition chips, Criminals and police (takedown, dispatch), Endgame expansion (prestige content), Oversize Load, Street Racers, Wedding convoy, Money transporter and Jackpot, Museum (30 entries) (+6 more)

### Community 103 - "Transitions UI generation"
Cohesion: 0.05
Nodes (30): Reduced motion, Skeleton, Timeline, Tuning, Usage, What it reads from the element, When to use, Placement (+22 more)

### Community 105 - "Sanfter Einstieg (forIntro-Leiter)"
Cohesion: 0.13
Nodes (17): Analytics mit Umami (ui/analytics.ts), core/levels.ts (forIntro, forEase, forLevel), Fail-Pause (ResultBanner.breath 1,2 s), Sanfter Einstieg (forIntro-Leiter), Späte Inhalte an Prestige-Ränge (bossesPerRank), Rechtliches (Datenschutz, Impressum, legal.ts), Benachrichtigungen (Web Push, net/push.ts), Leise Hilfe (Careers.careerShift, assisted) (+9 more)

### Community 106 - "core/museum.ts"
Cohesion: 0.04
Nodes (81): bossesBefore(), prestigeLevelAt(), WEATHERS, bossPlace(), firstLevelOf(), CHEST_ODDS, RARITIES, BY_ID (+73 more)

### Community 107 - "money"
Cohesion: 0.21
Nodes (18): detourShareAt(), towSpeedupAt(), money(), percent(), effect(), explanation(), effect(), explanation() (+10 more)

### Community 108 - "reel-crash.mjs"
Cohesion: 0.12
Nodes (16): booms, c1, crash(), end, f, fHit, flashes, fTap (+8 more)

### Community 109 - "SwipeMode"
Cohesion: 0.14
Nodes (3): SwipeMode, ModeMessage, ModePan

### Community 110 - "ad-speed.mjs"
Cohesion: 0.18
Nodes (9): base, flashes, hits, HOLD, HOLD_AURORA, RING, sfx, shots (+1 more)

### Community 111 - "meter.ts"
Cohesion: 0.36
Nodes (6): at(), follow(), remember(), seenOf(), Shown, seen()

### Community 112 - "Ring as UI ('one city, one ring')"
Cohesion: 0.22
Nodes (11): Accessibility and Reduce Motion, Camera under pressure (cameraFx.ts), Critical Merge, Emergency vehicles (ambulance, fire engine), Perfect Chain and Flow State, Jammed merges (no points), Perfect Run, Battery saver and adaptive resolution (+3 more)

### Community 113 - "Animated icon system (animatedIcons.ts)"
Cohesion: 0.40
Nodes (5): Animated icon system (animatedIcons.ts), Icon style (24 grid, 1.8 stroke, theme colours), New icon template and checklist, Reduce Motion handling for icons, Icon animation technical rules

### Community 115 - "ad-rage.mjs"
Cohesion: 0.20
Nodes (9): bottoms, flashes, hits, RAMP_BUST, RAMP_CRASH, sfx, shots, titles (+1 more)

### Community 116 - "short-wide.mjs"
Cohesion: 0.18
Nodes (10): wideCut(), flashes, k, RING, flashes, k, RING, k (+2 more)

### Community 117 - "reel-city.mjs"
Cohesion: 0.14
Nodes (15): booms, cities, end, flashes, h, name(), sfx, shots (+7 more)

### Community 118 - "reel-sky.mjs"
Cohesion: 0.12
Nodes (14): booms, end, f, fHit, flashes, fTap, hit, open (+6 more)

### Community 119 - "translate.mjs"
Cohesion: 0.21
Nodes (10): __dirname, getArgs(), I18N_FILE, LANG_DIR, main(), MODULES, ROOT, scaffoldLanguage() (+2 more)

### Community 120 - "ad-calm.mjs"
Cohesion: 0.22
Nodes (7): calm, fades, quiet, RING, sfx, shots, titles

### Community 121 - "Determinismus (fester Zeitschritt + Seed)"
Cohesion: 0.10
Nodes (22): Browserspiel (Vite + TypeScript + Canvas), Kurzlinks für Challenges (/c/CODE), Neue Regeln in core/, Werte in config.ts, Fester Takt 120 Hz mit Zeitstempel-Taps, Arbeitsweise neues Spielsystem (core, Bot, darstellen), Browser-Tests über window.__probe, Aufbau von Web/src (core, present, audio, storage, net, ui), Nur Web-Version (Apple-Schiene gelöscht) (+14 more)

### Community 122 - "Supply Chain and Release Hunting"
Cohesion: 0.22
Nodes (8): CI and automation attack classes (subagent_type: `general`), Core discipline (include in every agent prompt for this domain), Dependency and build-input attack classes (subagent_type: `general`), Release and update attack classes (subagent_type: `general`), Supply Chain and Release Hunting, Universal moves (apply across the above), Validation rules (apply before reporting ANY finding here), When to use this file

### Community 123 - "Spiel.md (Roundabout Timing overview)"
Cohesion: 0.18
Nodes (14): Animierte Icons (ui/animatedIcons.ts), Auto-Formen (present/carModels.ts), Frontend-Übergänge (transitions-dev Skills), Basis / Kernloop, Kollision per Kapseln, keine Physik-Engine, core/config.ts (alle Startwerte), Andockpunkte für spätere Systeme, Fahrzeuge fahren auf Pfaden, nicht auf Winkeln (+6 more)

### Community 125 - "Product Marketing Context"
Cohesion: 0.12
Nodes (15): Brand Voice, Changelog, Competitive Landscape, Customer Language, Differentiation, Goals, Learnings, Objections (+7 more)

### Community 127 - "Chests (Standard, Premium, Criminal Hunt, Event)"
Cohesion: 0.18
Nodes (13): Albums (set rewards and frames), Casino (Crash, Slots, Skin-Upgrade, Roulette, Scratch Card, Double or nothing), Casino presentation (reveal first, then money), Chests (Standard, Premium, Criminal Hunt, Event), City Evolution, Economy: earning and spending money, Mastery (8 goals, extended to IV and V), Street modules (Toll Booth, Speed Camera, Tow Depot, Billboard, Detour Sign) (+5 more)

### Community 128 - "short.mjs"
Cohesion: 0.29
Nodes (6): flashes, RING, sfx, shots, titleHits, titles

### Community 129 - "Stack"
Cohesion: 0.22
Nodes (8): CSS, HTML usage, JavaScript orchestration, Open and close use different eases, Pin the plus button to a corner, Plus to menu morph, Tunable variables, When to use

### Community 131 - "ui/photo.ts"
Cohesion: 0.12
Nodes (26): qrcode-generator, ResultBanner, LIMITS, PatternToken, PerformancePattern, PhotoCard, signStyle, COUNTRY (+18 more)

### Community 132 - "game.spec.ts"
Cohesion: 0.16
Nodes (8): Api, Boards, Entry, Game, openRanks(), perform(), Places, start()

### Community 133 - "Custom Store Listings: Roundabout Timing"
Cohesion: 0.13
Nodes (14): arcade, bosses, builder, collection, crash, Custom Store Listings: Roundabout Timing, daily, mafia (+6 more)

### Community 134 - "Room"
Cohesion: 0.12
Nodes (4): isJoinCode(), newSeries(), Member, VersusLobby

### Community 135 - "devProbe.ts"
Cohesion: 0.33
Nodes (5): Bot, Cue, Snapshot, Spread, Stall

### Community 137 - "devDependencies"
Cohesion: 0.40
Nodes (5): devDependencies, @playwright/test, @types/node, typescript, vite

### Community 138 - "Deployment (Docker, nginx, Port 5050, Coolify)"
Cohesion: 0.50
Nodes (4): Deployment (Docker, nginx, Port 5050, Coolify), GitHub-Workflow (Commits direkt auf main, Push nur durch Leo), Offline spielbar (Service Worker), Vor jedem Commit: npm test und npm run build grün

### Community 139 - "Spielsprachen (EN, DE, ES, FR, IT, JA, KO, ZH)"
Cohesion: 0.50
Nodes (4): Spielsprachen (EN, DE, ES, FR, IT, JA, KO, ZH), Schilder nach Sprache und Region (present/signs.ts), present/strings.ts (S), Zielgeräte und Performance-Maßstab

### Community 144 - "mafiaPanel"
Cohesion: 0.16
Nodes (25): dateOf(), MafiaHost, mafiaPanel, assistToggle(), bar(), bits(), chips(), happened() (+17 more)

### Community 145 - "CanvasDrawer"
Cohesion: 0.16
Nodes (5): CanvasDrawer, isBright(), Camera, Grain, picture()

### Community 146 - "Changelog API (/changelog.json)"
Cohesion: 0.40
Nodes (6): Museum wächst mit (core/museum.ts), Patch Notes (present/patchNotes.ts), Website-Daten (/data/*.json, siteData.ts), Website-Inhalte aus dem Spiel (npm run content), Changelog API (/changelog.json), Site data API (/data/*.json)

### Community 147 - "animatedIcons.ts"
Cohesion: 0.10
Nodes (20): coreA, coreB, coreC, flameA, flameB, flameC, ANIMATED_ICONS, build (+12 more)

### Community 148 - "session.ts"
Cohesion: 0.04
Nodes (88): Family, Auction, Careers, MINIMUM_ARMS, SaveGame, RoadModule, Goals, GoalTeaser (+80 more)

### Community 149 - "ui/backdrop.ts"
Cohesion: 0.12
Nodes (16): BackdropMedia, parseBackdropLink(), YOUTUBE_HOSTS, youtubeEmbed(), youtubeId(), Backdrop, BACKDROP_KEY, loadBackdrop() (+8 more)

### Community 150 - "UX-Kritik Roundabout Timing (Web, Spiel-Tab, HUD, Ergebnis, Dock)"
Cohesion: 0.12
Nodes (15): Design-Specificity-Verdict, Fragen, Gesamteindruck, Kleinere Beobachtungen, Nielsen-Heuristiken, [P1] Die Haupthandlung ist das leiseste Element (Ready und Ergebnis), [P1] Top-Karte im Ready-Zustand überladen (360×640), [P2] Ergebnis zeigt dieselbe Zahl zweimal (+7 more)

### Community 152 - "2. Gerankte Liste der Optimierungsmöglichkeiten"
Cohesion: 0.07
Nodes (29): 1. Zusammenfassung des Abgleichs, 2. Gerankte Liste der Optimierungsmöglichkeiten, 3. Empfohlene Execution-Roadmap, Bewertungslogik, Implementation Ranking: Research.md gegen den Spielstand, Langzeit (sobald der Zulauf steigt), Messen, Mittelfristig (2–6 Wochen) (+21 more)

### Community 153 - "dependencies"
Cohesion: 0.50
Nodes (4): dependencies, @fontsource-variable/overpass, peerjs, qrcode-generator

### Community 155 - "gen.mjs"
Cohesion: 0.11
Nodes (18): beat(), built, CLIPS, CLOSE, COLOR, CUES, ENDS, FOOTAGE (+10 more)

### Community 156 - ".shareLobby"
Cohesion: 0.16
Nodes (3): isSeriesOver(), GuestMessage, LobbyEvents

### Community 157 - "Config"
Cohesion: 0.05
Nodes (50): Achievements, AchievementStep, achievementTotal(), FAMILIES, STAT_KEYS, TIER_PAY, GameMode, Hint (+42 more)

### Community 159 - "condition-icons.mjs"
Cohesion: 0.09
Nodes (29): apply(), bbox(), buildIcon(), clipTo(), DASHED, extent(), flatten(), icons (+21 more)

### Community 160 - "Daily Shift and streak"
Cohesion: 0.20
Nodes (10): After Work bonus (18-20h), Balancing bots and sim scripts, City Events, Daily Shift and streak, Quiet help after losses (careerShift), Heat (difficulty ladder), Motorbike, Learner driver, School bus, Daily quests (+2 more)

### Community 161 - ".open"
Cohesion: 0.25
Nodes (3): confirm(), PhotoHooks, PhotoView

### Community 162 - "Balance Check"
Cohesion: 0.22
Nodes (8): Balance Check, Insufficient input — check this before producing any report, Phase 1: Identify Balance Domain, Phase 2: Read Data Files, Phase 3: Read Design Document, Phase 4: Perform Analysis, Phase 5: Output the Analysis, Phase 6: Fix & Verify Cycle

### Community 163 - "ui-generation.js"
Cohesion: 0.18
Nodes (25): auto(), buildOverlay(), buildTexts(), clamp(), DEFAULTS, deriveCode(), drawStroke(), f2() (+17 more)

### Community 165 - "Cloud and Deployment Hunting"
Cohesion: 0.20
Nodes (10): Cloud and Deployment Hunting, Configuration and secret lifecycle attack classes (subagent_type: `general`), Container and orchestration attack classes (subagent_type: `general`), Core discipline (include in every agent prompt for this domain), Ingress, network, and control-plane attack classes (subagent_type: `general`), Managed storage, events, and edge attack classes (subagent_type: `general`), Universal moves (apply across the above), Validation rules (apply before reporting ANY finding here) (+2 more)

### Community 167 - "HTTP-Protocol and Authentication Hunting"
Cohesion: 0.18
Nodes (10): API-key and mTLS attack classes (subagent_type: `general`), Browser-session attack classes (subagent_type: `general`), Core discipline (include in every agent prompt for this domain), Federated-identity attack classes (subagent_type: `general`), HTTP framing and cache attack classes (subagent_type: `general`), HTTP-Protocol and Authentication Hunting, MFA, passkey, and account-transition attack classes (subagent_type: `general`), Universal moves (apply across the above) (+2 more)

### Community 168 - "Prestige"
Cohesion: 0.28
Nodes (9): Achievements (123 tiers, 31 families), Elite ladder (Elite XP), Feats, Landmarks (The Etoile), Legendary Shifts, Prestige, Prestige-Chronik (formerly Hall of Fame), Season Pass (in-game money, free track) (+1 more)

### Community 170 - "Localization Pipeline"
Cohesion: 0.09
Nodes (23): Content Areas to Review, freeze call, freeze check (auto-integrated into extract), freeze lift, Localization Pipeline, Phase 2A: Scan Mode, Phase 2B: Extract Mode, Phase 2C: Validate Mode (+15 more)

### Community 174 - "confirmed"
Cohesion: 0.17
Nodes (21): Structured hunter result, Cost budget, Coverage and prior runs, Full audit planning, Full audit workflow, Run profiles and scope, confirmed(), evidence() (+13 more)

### Community 175 - "Transitions Polish"
Cohesion: 0.12
Nodes (17): Blur, Commands, Core doctrine: match on usage, never on the nearest number, Distances, Durations, Easings, Future expansion, Hover in vs hover out (+9 more)

### Community 176 - ".item"
Cohesion: 0.17
Nodes (8): Before / after (4× throttle), Changes made, Performance Budgets, Performance Profile: Web render loop (game loop, render, physics, GC, delta time), Proposed but not done, Remaining hotspots (L80, after), Requires Investigation, css()

### Community 178 - "store-preview.mjs"
Cohesion: 0.22
Nodes (7): ALL, booms, flashes, PLAN, sfx, shots, slides

### Community 182 - "Desktop, Mobile, and Local IPC Hunting"
Cohesion: 0.20
Nodes (10): Application-state and device-lifecycle attack classes (subagent_type: `general`), Core discipline (include in every agent prompt for this domain), Deep-link, callback, and navigation attack classes (subagent_type: `general`), Desktop, Mobile, and Local IPC Hunting, Local IPC and exported-component attack classes (subagent_type: `general`), Privileged-helper and local-file attack classes (subagent_type: `general`), Universal moves (apply across the above), Validation rules (apply before reporting ANY finding here) (+2 more)

### Community 183 - "Transitions.dev"
Cohesion: 0.15
Nodes (13): Commands, Common mistakes to avoid, Decision rules, Motion tokens, Output format, Quick reference, Reference files, transitions apply — install the best-fit transition (+5 more)

### Community 186 - "Native App-Anmutung (schwebendes Dock, iOS-Stil)"
Cohesion: 0.33
Nodes (7): Flache Navigation, Native App-Anmutung (schwebendes Dock, iOS-Stil), Sortierung der Tabs (Progress, Shop, Build, Settings), Wischbare Segmente (GameSession.stepSection), Game-Tab-Modi (Shift, Unlimited, Mayhem, Multiplayer), present/flow.ts (Screen-Ablauf), Screens und UI (flow.ts, kein Startmenü)

### Community 187 - "transitions-dev/SKILL.md"
Cohesion: 0.29
Nodes (6): CSS, HTML usage, JavaScript orchestration, Skeleton loader and reveal, Tunable variables, When to use

### Community 188 - "Card hover tilt"
Cohesion: 0.20
Nodes (9): Card hover tilt, CSS, HTML usage, JavaScript orchestration, Peak tilt angle, Touch / mobile, Tunable variables, When to use (+1 more)

### Community 190 - "Avatar group hover"
Cohesion: 0.22
Nodes (8): Avatar group hover, CSS, HTML usage, JavaScript orchestration, React form, Tunable variables, When to use, Why the timing-function is set inline before the variable writes

### Community 191 - "Error state shake"
Cohesion: 0.22
Nodes (8): CSS, Error state shake, HTML usage, JavaScript orchestration, Recomputing the keyframe stops, Tunable variables, When to use, Why three classes (`.is-error` on wrap + input, `.is-shaking` on input)

### Community 192 - "Accordion expand"
Cohesion: 0.22
Nodes (8): Accordion expand, CSS, HTML usage, JavaScript orchestration, Tunable variables, Two-element panel + padding placement, When to use, Why the chevron flips instead of morphing its path

### Community 195 - "Success check"
Cohesion: 0.25
Nodes (7): Calibrating `stroke-dasharray` for your path, CSS, HTML usage, JavaScript orchestration, Success check, Tunable variables, When to use

### Community 196 - "Input clear with dissolve"
Cohesion: 0.25
Nodes (7): CSS, Dark mode, HTML usage, Input clear with dissolve, JavaScript orchestration, Tunable variables, When to use

### Community 197 - "Card resize"
Cohesion: 0.29
Nodes (6): Card resize, CSS, HTML usage, JavaScript orchestration, Tunable variables, When to use

### Community 198 - "Number pop-in"
Cohesion: 0.29
Nodes (6): CSS, HTML usage, JavaScript orchestration, Number pop-in, Tunable variables, When to use

### Community 199 - "Notification badge"
Cohesion: 0.29
Nodes (6): CSS, HTML usage, JavaScript orchestration, Notification badge, Tunable variables, When to use

### Community 200 - "Text states swap"
Cohesion: 0.29
Nodes (6): CSS, HTML usage, JavaScript orchestration, Text states swap, Tunable variables, When to use

### Community 201 - "Menu dropdown"
Cohesion: 0.29
Nodes (6): CSS, HTML usage, JavaScript orchestration, Menu dropdown, Tunable variables, When to use

### Community 202 - "Modal open / close"
Cohesion: 0.29
Nodes (6): CSS, HTML usage, JavaScript orchestration, Modal open / close, Tunable variables, When to use

### Community 203 - "Panel reveal"
Cohesion: 0.29
Nodes (6): CSS, HTML usage, JavaScript orchestration, Panel reveal, Tunable variables, When to use

### Community 204 - "Page side-by-side"
Cohesion: 0.29
Nodes (6): CSS, HTML usage, JavaScript orchestration, Page side-by-side, Tunable variables, When to use

### Community 205 - "Icon swap"
Cohesion: 0.20
Nodes (6): CSS, HTML usage, Icon swap, JavaScript orchestration, Tunable variables, When to use

### Community 206 - "Shimmer text"
Cohesion: 0.29
Nodes (6): CSS, HTML usage, JavaScript orchestration, Shimmer text, Tunable variables, When to use

### Community 207 - "Tabs sliding"
Cohesion: 0.29
Nodes (6): CSS, HTML usage, JavaScript orchestration, Tabs sliding, Tunable variables, When to use

### Community 208 - "Tooltip open/close"
Cohesion: 0.29
Nodes (6): CSS, HTML usage, JavaScript orchestration, Tooltip open/close, Tunable variables, When to use

### Community 209 - "Texts reveal"
Cohesion: 0.29
Nodes (6): CSS, HTML usage, JavaScript orchestration, Texts reveal, Tunable variables, When to use

### Community 210 - "Toast open / close"
Cohesion: 0.29
Nodes (6): CSS, HTML usage, JavaScript orchestration, Toast open / close, Tunable variables, When to use

### Community 211 - "Like button"
Cohesion: 0.29
Nodes (6): CSS, HTML usage, JavaScript orchestration, Like button, Tunable variables, When to use

### Community 212 - "Learn more hover"
Cohesion: 0.29
Nodes (6): CSS, HTML usage, JavaScript orchestration, Learn more hover, Tunable variables, When to use

### Community 213 - "Checkbox check"
Cohesion: 0.29
Nodes (6): Checkbox check, CSS, HTML usage, JavaScript orchestration, Tunable variables, When to use

### Community 214 - "Spinning counter"
Cohesion: 0.29
Nodes (6): CSS, HTML usage, JavaScript orchestration, Spinning counter, Tunable variables, When to use

### Community 215 - "Toggle"
Cohesion: 0.29
Nodes (6): CSS, HTML usage, JavaScript orchestration, Toggle, Tunable variables, When to use

### Community 216 - "Thinking states"
Cohesion: 0.29
Nodes (6): CSS, HTML usage, JavaScript orchestration, Thinking states, Tunable variables, When to use

### Community 217 - "Reasoning stream"
Cohesion: 0.29
Nodes (6): CSS, HTML usage, JavaScript orchestration, Reasoning stream, Tunable variables, When to use

### Community 218 - "Streaming text"
Cohesion: 0.29
Nodes (6): CSS, HTML usage, JavaScript orchestration, Streaming text, Tunable variables, When to use

### Community 219 - "Matrix dot loader"
Cohesion: 0.29
Nodes (6): CSS, HTML usage, JavaScript orchestration, Matrix dot loader, Tunable variables, When to use

### Community 220 - "Banner stacking"
Cohesion: 0.29
Nodes (6): Banner stacking, CSS, HTML usage, JavaScript orchestration, Tunable variables, When to use

### Community 221 - "Text morph"
Cohesion: 0.29
Nodes (6): CSS, HTML usage, JavaScript orchestration, Text morph, Tunable variables, When to use

### Community 222 - "Text swap soft"
Cohesion: 0.29
Nodes (6): CSS, HTML usage, JavaScript orchestration, Text swap soft, Tunable variables, When to use

### Community 223 - "Donut chart"
Cohesion: 0.29
Nodes (6): CSS, Donut chart, HTML usage, JavaScript orchestration, Tunable variables, When to use

### Community 224 - "Play Console: Store-Eintrag für Roundabout Timing"
Cohesion: 0.13
Nodes (14): 1\. App-Grundlagen, 2\. Store-Texte (Englisch), 3\. Store-Texte (Deutsch, optional), 4\. Grafiken, 5\. Datensicherheit (Data Safety), 6\. Inhaltsbewertung (IARC-Fragebogen), 7\. Releasetexte und Track, 8\. Bekannte offene Punkte (vor dem Einreichen klären) (+6 more)

### Community 225 - "messages.ts"
Cohesion: 0.32
Nodes (15): isInt(), Raw, cleanName(), INPUT_KINDS, isNumber(), isReaction(), isText(), readBySlot() (+7 more)

### Community 230 - "Vulnerability Hunting"
Cohesion: 0.11
Nodes (13): Core hunting method — include in every hunter prompt, Core validation rules — include in every hunter prompt, Local validation boundaries, Parent consolidation and ledger update, Phase 2: Run coverage-led hunting waves, Promotion procedure — copy this promotion procedure verbatim into every hunter prompt, Required hunter prompt, Vulnerability Hunting (+5 more)

### Community 234 - "room.ts"
Cohesion: 0.10
Nodes (24): peerjs, BEST_OF, INPUT_DELAY, PLACE_POINTS, randomJoinCode(), REACTION, Series, VERSUS_MAX_PLAYERS (+16 more)

### Community 236 - "Protocols, RPC, and Messaging Hunting"
Cohesion: 0.12
Nodes (11): Attack Classes, Attack classes — choose and split based on Phase 1, Broker and queue isolation attack classes (subagent_type: `general`), Core discipline (include in every agent prompt for this domain), Framing, schema, and interpretation attack classes (subagent_type: `general`), Protocols, RPC, and Messaging Hunting, Replay, ordering, and transaction attack classes (subagent_type: `general`), RPC identity and authorization attack classes (subagent_type: `general`) (+3 more)

### Community 237 - "Fehler: Crashes (maxStrikes 1, maxPoliceCrashes 3)"
Cohesion: 0.11
Nodes (19): Code-Quality-Regeln (lean, strikte Typen, keine Abstraktion), Crashes sind echte Physik (core/crash.ts, drivers.ts), Engineering for feel (Apple-Stil Over-Engineering erwünscht), Wenige Meldungen (NoticeQueue), GameSession (present), Einleitungs-Drawer (INTROS), Nur zeigen, was erreicht ist (Unlocks.isKnown), Fahrzeugfarben sind Spielinformation (UI-tabu) (+11 more)

### Community 243 - "proofModule.ts"
Cohesion: 0.18
Nodes (9): CleanProof, loadProofParts(), PROOF_FILE, ProofParts, Claim, replayInWorker(), robotTaps(), Verdict (+1 more)

### Community 244 - "VersusMatch"
Cohesion: 0.10
Nodes (8): addRound(), Standing, standings(), VersusBot, Input, InputKind, MatchFeel, VersusMatch

### Community 250 - "validate-findings.test.cjs"
Cohesion: 0.12
Nodes (11): LIMITS, assert, fs, {
  LIMITS,
  collect,
  collectSchemaErrors,
  validateDocument,
}, os, path, schema, { spawnSync } (+3 more)

### Community 297 - "Code Review"
Cohesion: 0.14
Nodes (13): Code Review, Engine Specialists, Insufficient input — check this before producing any report, Phase 1: Load Target Files, Phase 2: Identify Engine Specialists, Phase 3: ADR Compliance Check, Phase 4: Standards Compliance, Phase 5: Architecture and SOLID (+5 more)

### Community 314 - "Changelog"
Cohesion: 0.15
Nodes (12): Changelog, Guidelines, Phase 1: Parse Arguments, Phase 2: Gather Change Data, Phase 3: Categorize Changes, Phase 4: Generate Internal Changelog, Phase 5: Generate Player-Facing Changelog, Phase 6: Output (+4 more)

### Community 322 - "Patch Notes"
Cohesion: 0.14
Nodes (13): Brief Style, Detailed Style, Full Style, Patch Notes, Phase 1: Parse Arguments, Phase 2: Gather Change Data, Phase 2b: Detect Tone Guide and Template, Phase 3: Categorize and Translate (+5 more)

### Community 336 - "Performance Profile"
Cohesion: 0.17
Nodes (11): Insufficient input — check this before producing any report, Performance Profile, Phase 0: Resolve Budget Enforcement, Phase 1: Determine Scope, Phase 2: Load Performance Budgets, Phase 3: Analyze Codebase, Phase 4: Generate Profiling Report, Phase 5: Scope and Timeline Decision (+3 more)

### Community 406 - "Bug Report"
Cohesion: 0.22
Nodes (8): Bug Report, Phase 1: Parse Arguments, Phase 2A: Description Mode, Phase 2B: Analyze Mode, Phase 2C: Verify Mode, Phase 2D: Close Mode, Phase 3: Save Report, Phase 4: Next Steps

## Ambiguous Edges - Review These
- `Spielsprachen (EN, DE, ES, FR, IT, JA, KO, ZH)` → `Zielgeräte und Performance-Maßstab`  [AMBIGUOUS]
  FOUNDATION.md · relation: conceptually_related_to

## Knowledge Gaps
- **118 isolated node(s):** `@fontsource-variable/overpass`, `@types/node`, `typescript`, `RFC-8188`, `RFC-8291` (+113 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1968 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `transitions review — audit the project for fit` connect `Transitions.dev` to `v`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **What connects `@fontsource-variable/overpass`, `@types/node`, `typescript` to the rest of the system?**
  _118 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `v` be split into smaller, more focused modules?**
  _Cohesion score 0.029027297193387157 - nodes in this community are weakly interconnected._
- **Why does `Transitions.dev` connect `Transitions.dev` to `Icon swap`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Should `strings.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10241820768136557 - nodes in this community are weakly interconnected._
- **Should `shell.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.032634920634920635 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Spielsprachen (EN, DE, ES, FR, IT, JA, KO, ZH)` and `Zielgeräte und Performance-Maßstab`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._