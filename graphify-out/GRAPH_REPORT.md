# Graph Report - Car game  (2026-10-22)

## Corpus Check
- 454 files · ~1,138,003 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 26 file(s) not represented in the graph (top: .css 9, (none) 9, .log 4)

## Summary
- 4733 nodes · 15618 edges · 156 communities (141 shown, 15 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 753 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `972f8f79`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- session.ts
- strings.ts
- de/p6.ts
- sheets.ts
- levels.ts
- Vehicle
- shop.ts
- make_casino_sounds.py
- HostMessage
- shell.ts
- h
- siteData.ts
- draw.ts
- trials.ts
- traffic.ts
- app.ts
- mafiaPanel
- carArt.ts
- crews/index.ts
- clubPanel.ts
- cloud.ts
- World
- GameSession
- world.ts
- ranksPanel.ts
- preview.ts
- hud.ts
- v
- dom.ts
- db.ts
- push/index.ts
- booking.ts
- .perform
- Db
- save.ts
- LOOT.md
- drivers.ts
- .frame
- Fit
- DESIGN-LANGUAGE.md
- admin/index.ts
- .play
- Vec2
- CanvasDrawer
- specials.ts
- roundabout.ts
- Room
- present/casino.ts
- main.ts
- VersusLobby
- modules.ts
- ui/backdrop.ts
- money
- detailSheet.ts
- IDEA.md
- core/versus.ts
- scripts/test.mjs
- server.ts
- referrals/index.ts
- lib.mjs
- present/museum.ts
- feedback.ts
- SwipeMode
- .react
- Ranglisten-Dienst (Server/, Node 22 + Hono + SQLite)
- reel-greed.mjs
- vite.config.ts
- Server/package.json
- Fehler: Crashes (maxStrikes 1, maxPoliceCrashes 3)
- PlayerStore
- Career
- core/config.ts
- ui/photo.ts
- vite
- compilerOptions
- reel-wait.mjs
- Deterministic simulation (same seed + taps = same result)
- reel-rate.mjs
- Web/package.json
- names.ts
- messages.ts
- transitions.ts
- reel-crash.mjs
- core/museum.ts
- compilerOptions
- Browserspiel (Vite + TypeScript + Canvas)
- reel-chest.mjs
- reel-sky.mjs
- .constructor
- reel-city.mjs
- game.spec.ts
- Roundabout Timing (RAT)
- Bewertung einer Einfädelung (Crash, Tight Fit, Sauber)
- Casino (Shop · Casino)
- reel-ten.mjs
- Trials (fixed-seed special shifts)
- scripts
- fr/p6.ts
- career.ts
- .open
- translate.mjs
- Car Game server (Hono + SQLite)
- Car Game Web (Roundabout Timing browser game)
- Chests (Standard, Premium, Criminal Hunt, Event)
- devProbe.ts
- Sanfter Einstieg (forIntro-Leiter)
- render.mjs
- Marketing/VIDEO.md
- it/p6.ts
- NoticeQueue
- ad-speed.mjs
- trailer.mjs
- Ring as UI ('one city, one ring')
- Animated icon system (animatedIcons.ts)
- Scroller
- ad-rage.mjs
- short-wide.mjs
- Daily Shift and streak
- seal.ts
- CLAUDE.md
- ad-calm.mjs
- CrewStore
- Prestige
- trailer/package.json
- .react
- Product Marketing Context
- Native App-Anmutung (schwebendes Dock, iOS-Stil)
- batch.mjs
- short.mjs
- Stack
- Changelog API (/changelog.json)
- Your player (one name for ranks, friends, cloud)
- PWA (manifest, service worker, shortcuts)
- Build with us feedback (bugs and ideas)
- room.ts
- Google Play Trusted Web Activity
- ja/p6.ts
- ko/p6.ts
- Deployment (Docker, nginx, Port 5050, Coolify)
- Spielsprachen (EN, DE, ES, FR, IT, JA, KO, ZH)
- Name Roundabout Timing (RAT)
- Zielgeräte (Handy Hochformat einhändig, Desktop)
- .connect
- challenge.ts
- ShiftResult
- patchNotes.ts
- i18n.ts
- devDependencies
- sim.mjs
- licenses.ts
- .start
- Recorder
- .paintSignal
- Lamps

## God Nodes (most connected - your core abstractions)
1. `GameSession` - 224 edges
2. `World` - 189 edges
3. `v()` - 165 edges
4. `Vec2` - 154 edges
5. `h()` - 144 edges
6. `RenderList` - 128 edges
7. `mul()` - 94 edges
8. `add()` - 90 edges
9. `money()` - 86 edges
10. `ColorToken` - 78 edges

## Surprising Connections (you probably didn't know these)
- `Ton: keine sich wiederholenden Sounds` --semantically_similar_to--> `Motion- und Haptik-Regeln (je häufiger, desto weniger Animation)`  [INFERRED] [semantically similar]
  Marketing/VIDEO.md → DESIGN-LANGUAGE.md
- `Plausibility-only anti-cheat` --semantically_similar_to--> `Sealed save (HMAC seal)`  [INFERRED] [semantically similar]
  Server/README.md → Web/README.md
- `Google Play Trusted Web Activity` --semantically_similar_to--> `CrazyGames-Einbettung (?crazygames)`  [INFERRED] [semantically similar]
  Web/README.md → CLAUDE.md
- `Casino-Szenen fixieren Zufall über den Seed, Quoten bleiben echt` --semantically_similar_to--> `Fair gebautes Casino`  [INFERRED] [semantically similar]
  Marketing/VIDEO.md → LOOT.md
- `Invites / referrals` --shares_data_with--> `Invite a friend flow`  [EXTRACTED]
  Server/README.md → Web/README.md

## Import Cycles
- 2-file cycle: `Web/src/present/casino.ts -> Web/src/present/casinoKit.ts -> Web/src/present/casino.ts`
- 2-file cycle: `Web/src/present/casino.ts -> Web/src/present/casinoWallet.ts -> Web/src/present/casino.ts`
- 3-file cycle: `Web/src/present/casino.ts -> Web/src/present/shop.ts -> Web/src/present/casinoWallet.ts -> Web/src/present/casino.ts`
- 3-file cycle: `Web/src/present/casino.ts -> Web/src/present/casinoGames.ts -> Web/src/present/casinoKit.ts -> Web/src/present/casino.ts`
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

## Communities (156 total, 15 thin omitted)

### Community 0 - "session.ts"
Cohesion: 0.03
Nodes (108): Achievements, Careers, Config, RoadModule, dailyEvent(), Elite, Feat, Feats (+100 more)

### Community 1 - "strings.ts"
Cohesion: 0.06
Nodes (49): StreakMilestone, BossKind, CityEvent, weatherSeverity(), FeatGoal, VehicleRole, comboMultiplier(), Fmt (+41 more)

### Community 2 - "de/p6.ts"
Cohesion: 0.04
Nodes (25): MASTERY_THRESHOLDS, masteryNumeral(), MONEY_MARK, chest(), lockedHint(), opened(), stepEffect(), toast() (+17 more)

### Community 3 - "sheets.ts"
Cohesion: 0.06
Nodes (63): Settings, hasCrew(), PushChoice, pushState, chooseLanguage(), currentLanguage(), known(), LegalId (+55 more)

### Community 4 - "levels.ts"
Cohesion: 0.09
Nodes (42): builtArmSlots(), cloneConfig(), slotDistance(), challengesOf(), applyBoss(), armPrice(), bossAt(), canBuildArm() (+34 more)

### Community 5 - "Vehicle"
Cohesion: 0.09
Nodes (29): capsule, closestPoints(), contact, contactPoint(), gap(), collide(), RigidBody, unitInertia() (+21 more)

### Community 6 - "shop.ts"
Cohesion: 0.09
Nodes (59): add(), left(), TAU, Kind, fitText(), flame(), Pen, Shape (+51 more)

### Community 7 - "make_casino_sounds.py"
Cohesion: 0.07
Nodes (49): boom(), engine(), envelope(), load(), main(), place(), resample(), riser() (+41 more)

### Community 9 - "shell.ts"
Cohesion: 0.03
Nodes (82): Hint, knownShortLink(), made, shortLink(), cloudEnabled, openCrewLink(), setConsumer(), watchCrewLaunches() (+74 more)

### Community 10 - "h"
Cohesion: 0.07
Nodes (79): addCrewXp(), claimGift(), CrewGift, CrewMember, CrewPreview, CrewProfile, CrewStanding, CrewView (+71 more)

### Community 11 - "siteData.ts"
Cohesion: 0.09
Nodes (43): CHEST_ODDS, RARITIES, MUSEUM_SHELVES, shelfEntries(), SignalKind, LANGUAGES, collection(), fingerprint() (+35 more)

### Community 12 - "draw.ts"
Cohesion: 0.13
Nodes (17): GroundGrain, sameItem(), sameItems(), samePoint(), samePoints(), Still, inlineMoneyWidth(), textPieces() (+9 more)

### Community 13 - "trials.ts"
Cohesion: 0.05
Nodes (70): BOSS_KINDS, TrialRule, Weather, bossInBlackout(), Darkness, firstBossLevel(), UPGRADE_GROUP, UpgradeGroup (+62 more)

### Community 14 - "traffic.ts"
Cohesion: 0.08
Nodes (58): ambulanceThrough(), clearArc(), clearZone(), isFireRun(), isOnClearRoad(), joinsClearRoad(), longestExit(), noteMergeNearAmbulance() (+50 more)

### Community 15 - "app.ts"
Cohesion: 0.11
Nodes (50): hono, AppOptions, modules(), displayCode(), normalizeCode(), Config, ApiError, cleanText() (+42 more)

### Community 16 - "mafiaPanel"
Cohesion: 0.09
Nodes (27): dateOf(), MafiaHost, mafiaPanel, assistToggle(), bar(), bits(), chips(), happened() (+19 more)

### Community 17 - "carArt.ts"
Cohesion: 0.04
Nodes (65): angleDelta(), dist(), Crashed, Dent, isCarType(), STEP, CarArt, carArts (+57 more)

### Community 18 - "crews/index.ts"
Cohesion: 0.09
Nodes (35): randomCode(), PROFILE_BOARDS, BOT_NAMES, BOT_WEEK_XP, botsOf(), DEMOTE, GOAL_PER_MEMBER, GROUP_REAL (+27 more)

### Community 19 - "clubPanel.ts"
Cohesion: 0.10
Nodes (50): Fund, FundView, GIFTS, fetchIdeas(), giveToIdea(), Idea, IDEA_MAX, IDEA_MIN (+42 more)

### Community 20 - "cloud.ts"
Cohesion: 0.07
Nodes (78): accountOf(), adopt(), arrive(), check(), choosing(), cloudChanged(), CloudDeps, cloudLinked() (+70 more)

### Community 21 - "World"
Cohesion: 0.05
Nodes (9): MergeRating, VersusPhase, forWeather(), criminalVehicle(), approach(), approachSpeed(), hermite(), rollPass() (+1 more)

### Community 22 - "GameSession"
Cohesion: 0.03
Nodes (8): strongTaps(), tapPower(), Reward, Intro, NewsItem, latestNote(), GameSession, installMafiaDebug()

### Community 23 - "world.ts"
Cohesion: 0.08
Nodes (27): AmbulancePhase, firstAmbulance(), reaches(), flowCapacity(), EliminationReason, FailCause, ShiftOutcome, MilitaryPhase (+19 more)

### Community 24 - "ranksPanel.ts"
Cohesion: 0.05
Nodes (57): dayNumber(), TitleId, Incoming, Account, accountListeners, BASE, BOARD_TOP, BoardEntry (+49 more)

### Community 25 - "preview.ts"
Cohesion: 0.06
Nodes (45): ACCENT, AMBER, ASPHALT, BACKGROUND_BOTTOM, BACKGROUND_TOP, BLACK, BOARD, BOARD_EDGE (+37 more)

### Community 26 - "hud.ts"
Cohesion: 0.06
Nodes (44): ConditionEntry, AdPill, ConditionIntro, FAIL_CHIP_SIZE, HUD, IntroLayout, islandBlock(), IslandRow (+36 more)

### Community 27 - "v"
Cohesion: 0.06
Nodes (45): CrashReport, markReward(), trialProgress(), fromAngle(), mul(), normalize(), v(), CameraFxTuning (+37 more)

### Community 28 - "dom.ts"
Cohesion: 0.07
Nodes (25): ANIMATED_ICONS, AnimatedIconId, build, chest, coin, game, gear, heat (+17 more)

### Community 29 - "db.ts"
Cohesion: 0.06
Nodes (58): RFC-8188, RFC-8291, RFC-8292, @hono/node-server, clientIp(), createApp(), address(), headerName() (+50 more)

### Community 30 - "push/index.ts"
Cohesion: 0.04
Nodes (29): BoardDef, BOARDS, dayOf(), LIMITS, ParsedScore, utcDay(), ALL_TIME, awake() (+21 more)

### Community 31 - "booking.ts"
Cohesion: 0.06
Nodes (35): AchievementStep, achievementTotal(), FAMILIES, STAT_KEYS, TIER_PAY, GameMode, DAILY_EVENTS, Challenge (+27 more)

### Community 32 - ".perform"
Cohesion: 0.10
Nodes (3): rematchId, screenTab(), SideSwipe

### Community 33 - "Db"
Cohesion: 0.05
Nodes (8): Db, ChallengeStore, FeedbackStore, FriendStore, ReferralStore, hashCode(), SyncStore, TuningStore

### Community 34 - "save.ts"
Cohesion: 0.14
Nodes (34): familyOf(), readLot(), HINTS, newCareer(), newSave(), roundTimes(), isObject(), CosmeticSource (+26 more)

### Community 35 - "LOOT.md"
Cohesion: 0.07
Nodes (43): Mehr Touren (Frühling, Sommer), Alben (Maps, Commons … Honours, Tours), Bug Hunters (Ladybug … Firefly, Beetle), Auto-Formen (Beetle, Pocket, GT Coupé, Roadster, Jeep, Hot Rod), Car Skins (39), Casino-Skins (Lucky Strike, Mega Win, Double Down, Tycoon), Truhe aufklopfen (8 Tipps, chestTaps), Truhen-Tabelle (+35 more)

### Community 36 - "drivers.ts"
Cohesion: 0.13
Nodes (25): gravity(), busStop(), canSpeedUp(), drive(), hasTransporterOnRing(), leadsOnRing(), Occupant, paceMerge() (+17 more)

### Community 37 - ".frame"
Cohesion: 0.07
Nodes (5): CityPulse, ProgressState, SessionOutput, advanceRush(), UpgradeState

### Community 38 - "Fit"
Cohesion: 0.32
Nodes (3): rounds, Fit, part()

### Community 39 - "DESIGN-LANGUAGE.md"
Cohesion: 0.07
Nodes (40): Accessibility & Inclusion (WCAG AA, 44 px, Tastatur), Actions: Tippen wählt, Knopf kauft; zweimal fragen nur bei Unwiderruflichem, Anti-References (Casino-Mobile-Games, Neon-Clutter), Brand Personality (calm, precise, satisfying), Kamera als Lesbarkeit, nicht Dekoration, Kontrast auf jeder Karte (npm run e2e prüft), Canvas readability (Scrim/Outline, AA auf jeder Karte), Casino als einzige Ausnahme vom "no casino look" (+32 more)

### Community 40 - "admin/index.ts"
Cohesion: 0.07
Nodes (26): ADMIN_PAGE, BUG_HUNTER_SKINS, Feedback, FEEDBACK_KINDS, FEEDBACK_MIGRATIONS, FEEDBACK_STATUSES, FeedbackKind, FeedbackRow (+18 more)

### Community 41 - ".play"
Cohesion: 0.13
Nodes (4): AdFlow, BuildFlow, PageHost, ShopFlow

### Community 42 - "Vec2"
Cohesion: 0.06
Nodes (33): ComboChange, ExplosionKind, ExplosionReport, GameEvent, MergeReport, armOutward(), Vec2, seriesLeaders() (+25 more)

### Community 43 - "CanvasDrawer"
Cohesion: 0.15
Nodes (4): CanvasDrawer, isBright(), Camera, Grain

### Community 44 - "specials.ts"
Cohesion: 0.18
Nodes (15): Lead, joinsMilitaryZone(), bossDue(), criminalCaught(), CriminalPhase, criminalTimeLeft(), isInSecureZone(), joinsTooClose() (+7 more)

### Community 45 - "roundabout.ts"
Cohesion: 0.09
Nodes (43): mergePathLength(), moduleLevel(), moduleZone(), skid(), leadOnExit(), ringLaneOccupants(), wreckPoints(), approachLimitAt() (+35 more)

### Community 46 - "Room"
Cohesion: 0.13
Nodes (5): BestOf, GuestMessage, RateLimit, Room, LobbyParts

### Community 47 - "present/casino.ts"
Cohesion: 0.07
Nodes (54): Casino, CASINO_GAMES, CasinoGame, CasinoRound, CoinFlip, RouletteSpin, SALT, ScratchCard (+46 more)

### Community 48 - "main.ts"
Cohesion: 0.06
Nodes (43): boot, bootErrored(), bootFailed(), bootRejected(), canvas, fail, [failTitle, failBody, failLink], hasSave() (+35 more)

### Community 49 - "VersusLobby"
Cohesion: 0.13
Nodes (4): isJoinCode(), newSeries(), Member, VersusLobby

### Community 50 - "modules.ts"
Cohesion: 0.10
Nodes (14): CrashFault, isEscorted(), Path, Pose, Layout, isChased(), isTransported(), canBargeIn() (+6 more)

### Community 51 - "ui/backdrop.ts"
Cohesion: 0.12
Nodes (16): BackdropMedia, parseBackdropLink(), YOUTUBE_HOSTS, youtubeEmbed(), youtubeId(), Backdrop, BACKDROP_KEY, loadBackdrop() (+8 more)

### Community 52 - "money"
Cohesion: 0.16
Nodes (25): baseConfig, detourShareAt(), MODULE_UPGRADE_SHARE, moduleEntries(), modulePrice(), moduleUpgradePrice(), RAIN, Range (+17 more)

### Community 53 - "detailSheet.ts"
Cohesion: 0.18
Nodes (3): DetailSheet, rich(), rubber()

### Community 54 - "IDEA.md"
Cohesion: 0.10
Nodes (27): Gebaut 05.–07.10.: Streak Freeze, Heat, Touren, Achievements, Challenge-Builder (kein Freitext, keine Moderation), Co-op-Multiplayer (2–4 Spieler, ein Crash trifft alle), Discord mit Patch Notes aus /changelog.json, Gauntlet (Unlimited mit Lauf-Effekten), GlitchTip für Fehlerberichte, Wachstum: mehr Spieler erreichen, Landeseiten für Suchbegriffe (Car Circle Alternative) (+19 more)

### Community 55 - "core/versus.ts"
Cohesion: 0.15
Nodes (11): addRound(), BEST_OF, INPUT_DELAY, PLACE_POINTS, REACTION, standings(), VERSUS_MAX_PLAYERS, VERSUS_MIN_PLAYERS (+3 more)

### Community 56 - "scripts/test.mjs"
Cohesion: 0.12
Nodes (9): careful(), completed(), fakeStorage(), lostAt(), play(), rushShift(), sealedWith(), lotKey() (+1 more)

### Community 57 - "server.ts"
Cohesion: 0.18
Nodes (7): Entry, EntryRow, LEADERBOARD_MIGRATIONS, listed(), ListedEntry, parseMeta(), ScoreStore

### Community 58 - "referrals/index.ts"
Cohesion: 0.15
Nodes (22): ScoreEvent, Challenge, CHALLENGE_LIFETIME_MS, CHALLENGE_MIGRATIONS, gonePage(), Mode, MODES, sharePage() (+14 more)

### Community 59 - "lib.mjs"
Cohesion: 0.18
Nodes (20): boot(), botLog(), CLIPS, freeze(), installBot(), LANDSCAPE, markStart(), open() (+12 more)

### Community 60 - "present/museum.ts"
Cohesion: 0.04
Nodes (44): SpecialKind, pose(), at(), follow(), remember(), seenOf(), Shown, BOSS_FOLLOWERS (+36 more)

### Community 61 - "feedback.ts"
Cohesion: 0.07
Nodes (16): AudioPlayer, Haptics, RainVoice, Voice, Window, CasinoFlow, CasinoHost, HapticID (+8 more)

### Community 62 - "SwipeMode"
Cohesion: 0.15
Nodes (4): Brief, SwipeMode, ModeMessage, ModePan

### Community 64 - "Ranglisten-Dienst (Server/, Node 22 + Hono + SQLite)"
Cohesion: 0.13
Nodes (22): Auktionshaus (core/auction.ts), Build with us (Bug-Reports und Ideen), Casino statt Store, Cloud-Spielstand per Sync-Code, Der Club (Geldsenken, ab Level 50), Crews statt Freunde (Wochen-Liga), Freundescode (K7M2-9QXA), Game Fund (net/ideas.ts, core/fund.ts) (+14 more)

### Community 65 - "reel-greed.mjs"
Cohesion: 0.09
Nodes (18): a, b, booms, bustT, c, clutchT, crash1, crash2 (+10 more)

### Community 66 - "vite.config.ts"
Cohesion: 0.13
Nodes (13): address(), email(), GAME_NAME, HOSTING, LEGAL_DOCS, LEGAL_UPDATED, LegalSection, missingLegal() (+5 more)

### Community 67 - "Server/package.json"
Cohesion: 0.09
Nodes (21): dependencies, hono, @hono/node-server, description, devDependencies, @types/node, typescript, engines (+13 more)

### Community 68 - "Fehler: Crashes (maxStrikes 1, maxPoliceCrashes 3)"
Cohesion: 0.10
Nodes (21): Code-Quality-Regeln (lean, strikte Typen, keine Abstraktion), Crashes sind echte Physik (core/crash.ts, drivers.ts), Engineering for feel (Apple-Stil Over-Engineering erwünscht), Fail-Pause (ResultBanner.breath 1,2 s), Wenige Meldungen (NoticeQueue), Fahrzeugfarben sind Spielinformation (UI-tabu), Wer ist schuld (einfädelndes Auto zählt), core/drivers.ts (Fahrermodell) (+13 more)

### Community 69 - "PlayerStore"
Cohesion: 0.14
Nodes (8): hashToken(), isUniqueViolation(), NameTaken, Player, PLAYER_MIGRATIONS, PlayerRow, PlayerStore, toPlayer()

### Community 70 - "Career"
Cohesion: 0.11
Nodes (18): Auction, Career, CasinoPending, DAY_MS, Grade, Letter, LetterKind, Loan (+10 more)

### Community 71 - "core/config.ts"
Cohesion: 0.21
Nodes (20): ascensionRank(), LANDMARK_PRESTIGE, levelKind, levelTrialLevel(), rematchKind(), TrialId, goal(), name() (+12 more)

### Community 72 - "ui/photo.ts"
Cohesion: 0.19
Nodes (18): qrcode-generator, PatternToken, PerformancePattern, css(), dataBar(), drawPerformancePattern(), drawVectorToken(), inviteCode() (+10 more)

### Community 73 - "vite"
Cohesion: 0.09
Nodes (14): vite, tries, auctions, CHECKPOINTS, PROFILES, story, target, levels (+6 more)

### Community 74 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 75 - "reel-wait.mjs"
Cohesion: 0.14
Nodes (17): b1, b2, b3, beat(), booms, end, flashes, run (+9 more)

### Community 76 - "Deterministic simulation (same seed + taps = same result)"
Cohesion: 0.15
Nodes (19): App shortcuts (Daily, Unlimited, Multiplayer), Technical architecture (core / present / audio / storage / net / ui), Challenge links, Cloud sync by sync code, CrazyGames distribution (?crazygames), Decisions log (Entscheidungen), Deployment (Docker, nginx, Coolify, port 5050), Deterministic simulation (same seed + taps = same result) (+11 more)

### Community 77 - "reel-rate.mjs"
Cohesion: 0.12
Nodes (17): booms, c1, crash(), end, f, fHit, flashes, fTap (+9 more)

### Community 78 - "Web/package.json"
Cohesion: 0.13
Nodes (13): @fontsource-variable/overpass, @playwright/test, dependencies, @fontsource-variable/overpass, peerjs, qrcode-generator, description, @types/node (+5 more)

### Community 79 - "names.ts"
Cohesion: 0.17
Nodes (14): crewName(), checkName(), NAME_MAX, NAME_MIN, NameCheck, nameKey(), RESERVED, ANYWHERE (+6 more)

### Community 80 - "messages.ts"
Cohesion: 0.27
Nodes (17): isInt(), Raw, Series, cleanName(), INPUT_KINDS, isNumber(), isReaction(), isText() (+9 more)

### Community 81 - "transitions.ts"
Cohesion: 0.17
Nodes (14): barTab(), Screen, Tab, TAB_BAR, RenderItem, keyIsBuild(), keyPosition(), keyTab() (+6 more)

### Community 82 - "reel-crash.mjs"
Cohesion: 0.12
Nodes (16): booms, c1, crash(), end, f, fHit, flashes, fTap (+8 more)

### Community 83 - "core/museum.ts"
Cohesion: 0.10
Nodes (22): WEATHERS, FAIL_CAUSES, bossPlace(), eventLevel(), BY_ID, DARK_KINDS, DARK_LEVEL, DarkKind (+14 more)

### Community 84 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 85 - "Browserspiel (Vite + TypeScript + Canvas)"
Cohesion: 0.13
Nodes (16): Browserspiel (Vite + TypeScript + Canvas), Kurzlinks für Challenges (/c/CODE), Neue Regeln in core/, Werte in config.ts, Fester Takt 120 Hz mit Zeitstempel-Taps, GameSession (present), Einleitungs-Drawer (INTROS), Arbeitsweise neues Spielsystem (core, Bot, darstellen), Browser-Tests über window.__probe (+8 more)

### Community 86 - "reel-chest.mjs"
Cohesion: 0.12
Nodes (14): a, b, booms, c, CHEST, d, end, flashes (+6 more)

### Community 87 - "reel-sky.mjs"
Cohesion: 0.12
Nodes (14): booms, end, f, fHit, flashes, fTap, hit, open (+6 more)

### Community 88 - ".constructor"
Cohesion: 0.15
Nodes (3): Input, InputKind, MatchFeel

### Community 89 - "reel-city.mjs"
Cohesion: 0.15
Nodes (14): booms, cities, end, flashes, h, name(), sfx, shots (+6 more)

### Community 90 - "game.spec.ts"
Cohesion: 0.17
Nodes (7): Api, Boards, Entry, Game, openRanks(), perform(), Places

### Community 91 - "Roundabout Timing (RAT)"
Cohesion: 0.14
Nodes (15): Car Circle (Shoom Games) inspiration, Real crash physics (crash.ts, drivers.ts), Gas tanker and Military truck, Hard vs. soft fail rules, Level trials and Build trials, Mayhem mode, Ring bots and AI traffic (minRingBots), Roundabout Timing (RAT) (+7 more)

### Community 92 - "Bewertung einer Einfädelung (Crash, Tight Fit, Sauber)"
Cohesion: 0.16
Nodes (14): Auto-Formen (present/carModels.ts), KI verhungert nicht an der Linie (aiPatience, aiPushInGap), KI-Verkehr (Bots, minRingBots, Seed-Zufall), Basis / Kernloop, Kollision per Kapseln, keine Physik-Engine, Combo-Multiplikator (x1 bis x6), Andockpunkte für spätere Systeme, Kein Tap-Cooldown, gehaltener Tap, Nachrücken ohne Ruck (+6 more)

### Community 93 - "Casino (Shop · Casino)"
Cohesion: 0.15
Nodes (14): Offener Bug: Geld zurückspulen über Cloud-Kopie, Bewusst nicht gebaut (Luck-Bonus, Set-Boni …), Casino-Konto auf dem Server (nicht gebaut), Casino (Shop · Casino), Fair gebautes Casino, Casino-Rangliste (casinoProfit), Crash (96 % Rückzahlung), Doppelt oder nichts (faire Münze) (+6 more)

### Community 94 - "reel-ten.mjs"
Cohesion: 0.15
Nodes (13): landing(), booms, end, flashes, hits, play(), sfx, shots (+5 more)

### Community 95 - "Trials (fixed-seed special shifts)"
Cohesion: 0.16
Nodes (14): Ascension trials (prestige rank trials), Boss Rush, Briefings and condition chips, Criminals and police (takedown, dispatch), Endgame expansion (prestige content), Oversize Load, Street Racers, Wedding convoy, Money transporter and Jackpot, Museum (30 entries) (+6 more)

### Community 96 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, dev, e2e, itch, preview, sim, sim:auction (+6 more)

### Community 97 - "fr/p6.ts"
Cohesion: 0.13
Nodes (5): chest(), lockedHint(), opened(), stepEffect(), total()

### Community 98 - "career.ts"
Cohesion: 0.06
Nodes (54): AuctionBot, AuctionEvent, AuctionRun, ceilings, Lot, NAMES, streams, MASTERY_CLASSIC_TIERS (+46 more)

### Community 99 - ".open"
Cohesion: 0.25
Nodes (3): confirm(), PhotoHooks, PhotoView

### Community 100 - "translate.mjs"
Cohesion: 0.19
Nodes (10): __dirname, getArgs(), I18N_FILE, LANG_DIR, main(), MODULES, ROOT, scaffoldLanguage() (+2 more)

### Community 101 - "Car Game server (Hono + SQLite)"
Cohesion: 0.19
Nodes (12): Leaderboards (shift-level, unlimited, daily, rush, casino), Car Game server (Hono + SQLite), Challenge short links, Multiplayer relay (Cloudflare TURN), Invites / referrals, Player names and profanity filter, Server privacy and data retention, Remote tuning (+4 more)

### Community 102 - "Car Game Web (Roundabout Timing browser game)"
Cohesion: 0.23
Nodes (13): City Fund (legacy), AdSense and rewarded ads, Casino (play money only), The Club (Auction House, City Fund), CrazyGames integration, Canvas drawing performance (baking, sprites), itch.io embed, Legal pages (privacy, imprint) (+5 more)

### Community 103 - "Chests (Standard, Premium, Criminal Hunt, Event)"
Cohesion: 0.18
Nodes (13): Albums (set rewards and frames), Casino (Crash, Slots, Skin-Upgrade, Roulette, Scratch Card, Double or nothing), Casino presentation (reveal first, then money), Chests (Standard, Premium, Criminal Hunt, Event), City Evolution, Economy: earning and spending money, Mastery (8 goals, extended to IV and V), Street modules (Toll Booth, Speed Camera, Tow Depot, Billboard, Detour Sign) (+5 more)

### Community 104 - "devProbe.ts"
Cohesion: 0.18
Nodes (6): Window, Bot, installProbe(), Probe, Snapshot, Spread

### Community 105 - "Sanfter Einstieg (forIntro-Leiter)"
Cohesion: 0.20
Nodes (12): Analytics mit Umami (ui/analytics.ts), core/levels.ts (forIntro, forEase, forLevel), Sanfter Einstieg (forIntro-Leiter), Späte Inhalte an Prestige-Ränge (bossesPerRank), Rechtliches (Datenschutz, Impressum, legal.ts), Benachrichtigungen (Web Push, net/push.ts), Leise Hilfe (Careers.careerShift, assisted), Rekord in Sicht (Goals.record) (+4 more)

### Community 106 - "render.mjs"
Cohesion: 0.17
Nodes (9): CACHE, FOOTAGE, frameDir, OUT, page, pending, range, ROOT (+1 more)

### Community 107 - "Marketing/VIDEO.md"
Cohesion: 0.30
Nodes (11): Favoriten reel-3-too-early und reel-4-every-city, Hochformat 1080x1920, 14–18 s, Ton an, Hook in der ersten Sekunde, reel-5-rate-my-timing, Schritt 1: Aufnehmen (capture/batch.mjs, Bots peak/wild/hunter/bold), Schritt 3: Schneiden (reel-crash.mjs / reel-city.mjs kopieren, endCard()), Schritt 2: Momente finden (footage/<clip>.json, Kontaktbogen), Ausgabe videos/reel-<n>-<name>.mp4 (+3 more)

### Community 108 - "it/p6.ts"
Cohesion: 0.13
Nodes (5): chest(), lockedHint(), opened(), stepEffect(), total()

### Community 109 - "NoticeQueue"
Cohesion: 0.10
Nodes (5): AchievementCard, Item, NoticeQueue, ShownNotice, TipQueue

### Community 110 - "ad-speed.mjs"
Cohesion: 0.18
Nodes (9): base, flashes, hits, HOLD, HOLD_AURORA, RING, sfx, shots (+1 more)

### Community 111 - "trailer.mjs"
Cohesion: 0.18
Nodes (7): booms, flashes, RING, sfx, shots, titles, worlds

### Community 112 - "Ring as UI ('one city, one ring')"
Cohesion: 0.22
Nodes (11): Accessibility and Reduce Motion, Camera under pressure (cameraFx.ts), Critical Merge, Emergency vehicles (ambulance, fire engine), Perfect Chain and Flow State, Jammed merges (no points), Perfect Run, Battery saver and adaptive resolution (+3 more)

### Community 113 - "Animated icon system (animatedIcons.ts)"
Cohesion: 0.20
Nodes (9): Vehicle style study, Animated icon system (animatedIcons.ts), Icon style (24 grid, 1.8 stroke, theme colours), New icon template and checklist, Reduce Motion handling for icons, Icon animation technical rules, DESIGN-LANGUAGE.md (moved design language), Product definition (users and purpose) (+1 more)

### Community 115 - "ad-rage.mjs"
Cohesion: 0.20
Nodes (9): bottoms, flashes, hits, RAMP_BUST, RAMP_CRASH, sfx, shots, titles (+1 more)

### Community 116 - "short-wide.mjs"
Cohesion: 0.24
Nodes (7): wideCut(), flashes, k, RING, k, RING, worlds

### Community 117 - "Daily Shift and streak"
Cohesion: 0.20
Nodes (10): After Work bonus (18-20h), Balancing bots and sim scripts, City Events, Daily Shift and streak, Quiet help after losses (careerShift), Heat (difficulty ladder), Motorbike, Learner driver, School bus, Daily quests (+2 more)

### Community 118 - "seal.ts"
Cohesion: 0.29
Nodes (8): encoder, fraction(), H0, hmac(), K, KEY, rotr(), sha256()

### Community 119 - "CLAUDE.md"
Cohesion: 0.31
Nodes (9): Animierte Icons (ui/animatedIcons.ts), Frontend-Übergänge (transitions-dev Skills), core/config.ts (alle Startwerte), Spiel.md (Roundabout Timing overview), CLAUDE.md, FOUNDATION.md, Patch notes (patchNotes.ts), Server/README.md (+1 more)

### Community 120 - "ad-calm.mjs"
Cohesion: 0.22
Nodes (7): calm, fades, quiet, RING, sfx, shots, titles

### Community 121 - "CrewStore"
Cohesion: 0.11
Nodes (6): transaction(), CrewStore, Gift, toCrew(), RewardItem, FundStore

### Community 122 - "Prestige"
Cohesion: 0.28
Nodes (9): Achievements (123 tiers, 31 families), Elite ladder (Elite XP), Feats, Landmarks (The Etoile), Legendary Shifts, Prestige, Prestige-Chronik (formerly Hall of Fame), Season Pass (in-game money, free track) (+1 more)

### Community 123 - "trailer/package.json"
Cohesion: 0.25
Nodes (7): description, devDependencies, playwright, name, private, type, playwright

### Community 124 - ".react"
Cohesion: 0.07
Nodes (17): Family, SaveGame, conditionsOf(), museumEntry, museumId(), sightings(), Briefings, briefOf() (+9 more)

### Community 125 - "Product Marketing Context"
Cohesion: 0.12
Nodes (15): Brand Voice, Changelog, Competitive Landscape, Customer Language, Differentiation, Goals, Learnings, Objections (+7 more)

### Community 126 - "Native App-Anmutung (schwebendes Dock, iOS-Stil)"
Cohesion: 0.33
Nodes (7): Flache Navigation, Native App-Anmutung (schwebendes Dock, iOS-Stil), Sortierung der Tabs (Progress, Shop, Build, Settings), Wischbare Segmente (GameSession.stepSection), Game-Tab-Modi (Shift, Unlimited, Mayhem, Multiplayer), present/flow.ts (Screen-Ablauf), Screens und UI (flow.ts, kein Startmenü)

### Community 127 - "batch.mjs"
Cohesion: 0.29
Nodes (4): LAND, only, queue, SHOTS

### Community 128 - "short.mjs"
Cohesion: 0.29
Nodes (6): flashes, RING, sfx, shots, titleHits, titles

### Community 130 - "Changelog API (/changelog.json)"
Cohesion: 0.40
Nodes (6): Museum wächst mit (core/museum.ts), Patch Notes (present/patchNotes.ts), Website-Daten (/data/*.json, siteData.ts), Website-Inhalte aus dem Spiel (npm run content), Changelog API (/changelog.json), Site data API (/data/*.json)

### Community 131 - "Your player (one name for ranks, friends, cloud)"
Cohesion: 0.33
Nodes (4): Cloud save by sync code, Your player (one name for ranks, friends, cloud), Cloud sync client (net/cloud.ts), Local saving (localStorage carGame.save.v2)

### Community 132 - "PWA (manifest, service worker, shortcuts)"
Cohesion: 0.33
Nodes (5): Server deployment on Coolify, Web Push notifications module, Deploying (Docker, nginx, Coolify), Notifications client (net/push.ts), PWA (manifest, service worker, shortcuts)

### Community 133 - "Build with us feedback (bugs and ideas)"
Cohesion: 0.40
Nodes (6): Crews (weekly league, gifts), Build with us feedback (bugs and ideas), Friends (one-way friend code, legacy), Game fund (ideas), Moderation and admin inbox, Rewards table

### Community 134 - "room.ts"
Cohesion: 0.16
Nodes (15): peerjs, randomJoinCode(), NAME_MAX, REACTIONS, BOT_NAMES, loadError(), loadPeer(), peerId() (+7 more)

### Community 135 - "Google Play Trusted Web Activity"
Cohesion: 0.40
Nodes (5): CrazyGames-Einbettung (?crazygames), Vollbild-Inszenierung rewardBurst (nur drei Momente), Freiwillige Werbung (nur Rewarded Ads), Streak-Anzeigen und Schlüsselmomente, Google Play Trusted Web Activity

### Community 136 - "ja/p6.ts"
Cohesion: 0.13
Nodes (5): chest(), lockedHint(), opened(), stepEffect(), total()

### Community 137 - "ko/p6.ts"
Cohesion: 0.13
Nodes (5): chest(), lockedHint(), opened(), stepEffect(), total()

### Community 138 - "Deployment (Docker, nginx, Port 5050, Coolify)"
Cohesion: 0.50
Nodes (4): Deployment (Docker, nginx, Port 5050, Coolify), GitHub-Workflow (Commits direkt auf main, Push nur durch Leo), Offline spielbar (Service Worker), Vor jedem Commit: npm test und npm run build grün

### Community 139 - "Spielsprachen (EN, DE, ES, FR, IT, JA, KO, ZH)"
Cohesion: 0.50
Nodes (4): Spielsprachen (EN, DE, ES, FR, IT, JA, KO, ZH), Schilder nach Sprache und Region (present/signs.ts), present/strings.ts (S), Zielgeräte und Performance-Maßstab

### Community 145 - "challenge.ts"
Cohesion: 0.13
Nodes (19): GAME_MODES, CAR_TYPES, challengeCareer(), challengeConfig(), ChallengeSpec, decodeChallenge(), encodeChallenge(), fromBase64Url() (+11 more)

### Community 147 - "patchNotes.ts"
Cohesion: 0.21
Nodes (11): ChangelogLine, itemCredit(), itemFrom(), itemText(), line(), PATCH_NOTES, PatchImpact, PatchItem (+3 more)

### Community 148 - "i18n.ts"
Cohesion: 0.10
Nodes (10): INVITE_LEVEL, Plain, Words, rule(), rule(), rule(), rule(), rule() (+2 more)

### Community 149 - "devDependencies"
Cohesion: 0.40
Nodes (5): devDependencies, @playwright/test, @types/node, typescript, vite

### Community 150 - "sim.mjs"
Cohesion: 0.40
Nodes (4): built, heat, level, shifts

## Ambiguous Edges - Review These
- `Spielsprachen (EN, DE, ES, FR, IT, JA, KO, ZH)` → `Zielgeräte und Performance-Maßstab`  [AMBIGUOUS]
  FOUNDATION.md · relation: conceptually_related_to

## Knowledge Gaps
- **118 isolated node(s):** `@types/node`, `typescript`, `@fontsource-variable/overpass`, `@types/node`, `typescript` (+113 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1268 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GameSession` connect `GameSession` to `session.ts`, `shop.ts`, `shell.ts`, `challenge.ts`, `ShiftResult`, `patchNotes.ts`, `World`, `hud.ts`, `v`, `booking.ts`, `.perform`, `.frame`, `Vec2`, `CanvasDrawer`, `feedback.ts`, `SwipeMode`, `.react`, `Career`, `transitions.ts`, `NoticeQueue`, `.react`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **What connects `@types/node`, `typescript`, `@fontsource-variable/overpass` to the rest of the system?**
  _118 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03448640643182058 - nodes in this community are weakly interconnected._
- **Why does `World` connect `World` to `session.ts`, `levels.ts`, `Vehicle`, `shop.ts`, `traffic.ts`, `carArt.ts`, `GameSession`, `world.ts`, `hud.ts`, `v`, `.perform`, `drivers.ts`, `.frame`, `Vec2`, `specials.ts`, `roundabout.ts`, `modules.ts`, `core/versus.ts`, `feedback.ts`, `SwipeMode`, `.react`, `core/museum.ts`, `.constructor`, `.react`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `strings.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05847781369379959 - nodes in this community are weakly interconnected._
- **Why does `h()` connect `sheets.ts` to `session.ts`, `.open`, `Career`, `ui/photo.ts`, `shell.ts`, `h`, `Room`, `mafiaPanel`, `main.ts`, `VersusLobby`, `clubPanel.ts`, `ui/backdrop.ts`, `cloud.ts`, `detailSheet.ts`, `ranksPanel.ts`, `dom.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Spielsprachen (EN, DE, ES, FR, IT, JA, KO, ZH)` and `Zielgeräte und Performance-Maßstab`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._