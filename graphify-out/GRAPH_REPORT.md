# Graph Report - Car game  (2026-10-22)

## Corpus Check
- Scope: Web/, Server/, Marketing/ code, plus the project docs in the repo root (Spiel, CLAUDE, FOUNDATION, LOOT, DESIGN-LANGUAGE, IDEA, NEW-PLAYSTORE-BUILD) and the READMEs. Not covered: audio/video, images, the .claude and .agents skill copies, research notes.

## Summary
- 4695 nodes · 15596 edges · 144 communities (133 shown, 11 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 763 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Achievements & Families
- Config, Levels & Formatting
- Mastery, Mafia & Letters
- Settings & Language
- Career Progress
- Collision & Crash Physics
- Vec2, Builder & Chest Reel
- Audio Build Scripts
- UI Shell & Icons
- Challenge Links & Push Client
- Crews Client
- Museum Catalog & Weather
- HUD & Condition Briefings
- Game Modes & Challenge Spec
- Special Vehicles Update
- Server App & Config
- Mafia Panel & Crew UI
- Vehicles & Dents
- Crew League
- Club Panel
- Cloud Sync Client
- Traffic Flow & Heat
- Game Session & News
- Crash Events & Flow
- Leaderboard Client
- Preview Colors & Node Deps
- Cloud Save UI & Account
- Vector Math & Explosion FX
- Tips & News Queue
- Server Node Modules
- Web Push (Server)
- Explosion Rendering
- Screens & Tab Flow
- Server Stores (Challenges, Feedback)
- Save Game, Hints & Elite
- Loot Skins & Chest Table
- Drivers & Gravity
- City Pulse
- Series Standings & Car Models
- Design Language (a11y, Brand, Camera)
- Admin & Feedback
- Ad Flow
- Versus Standings
- Canvas Drawer
- Ambulance Clear Road
- Camera FX & Layout
- Multiplayer Room
- Casino Games
- CrazyGames & Storage
- Versus Lobby
- Layout & Escort
- Backdrop Media
- Casino Flow
- Museum Details
- Idea Backlog
- Versus Rules
- Tests & QR
- Leaderboard Store
- Challenge Links (Server)
- Trailer Capture Library
- Museum Rendering
- Audio Player
- Briefs & Swipe Mode
- Camera Lean & Revive
- Online Services Decisions
- Reel: Greed
- Legal Pages
- Server Dependencies
- Engineering & UX Rules
- Players Store
- Museum Signals
- Ascension Trials
- Result Photo
- Vite & Sims
- Server tsconfig
- Reel: Wait
- Web README Architecture
- Reel: Rate
- Web Dependencies
- Name Rules
- Net Guards & Messages
- Tab Transitions
- Reel: Crash
- Draw Utilities & CJK
- Web tsconfig
- Core Architecture Decisions
- Reel: Chest
- Reel: Sky
- Web Push Crypto (RFC)
- Reel: City
- E2E Tests
- Game Concept & Rules
- AI Traffic & Collision Basics
- Casino Decisions
- Reel: Ten
- Endgame & Content Docs
- npm Scripts
- Casino State & Ad Offer
- Casino Wallet & Rounds
- Photo Hooks
- Translate Script
- Server Overview
- Services: Ads, Club, Mafia, Legal
- Economy, Chests & Albums
- Dev Probe
- Level Ladder & Remote Tuning Decisions
- Trailer Render
- Reel Production Workflow
- Lobby Events & Best-Of
- Notice Queue
- Ad: Speed
- Trailer Main
- Motion, Feel & Emergency Vehicles
- Icons & Car Art Direction
- Scroller
- Ad: Rage
- Trailer Wide Cuts
- Daily, Heat & Quiet Help
- Save Seal
- Project Docs Hub
- Ad: Calm
- Fund Store
- Progression Systems
- Trailer Package
- Briefings
- Meter & Seen State
- Navigation & Native Feel
- Capture Batch
- Short Cut
- Stack Layout
- Site Data & Patch Notes
- Save, Seal & Cloud
- Deployment, PWA & Push
- Crews, Feedback & Rewards
- RTC & ICE Servers
- Ads & Distribution Channels
- Recorder
- Career Sim
- Deployment & Workflow
- Languages & Targets
- Product Name
- Target Devices

## God Nodes (most connected - your core abstractions)
1. `GameSession` - 224 edges
2. `World` - 189 edges
3. `v()` - 168 edges
4. `Vec2` - 154 edges
5. `h()` - 144 edges
6. `RenderList` - 128 edges
7. `mul()` - 94 edges
8. `add()` - 90 edges
9. `money()` - 88 edges
10. `ColorToken` - 78 edges

## Surprising Connections (you probably didn't know these)
- `Ton: keine sich wiederholenden Sounds` --semantically_similar_to--> `Motion- und Haptik-Regeln (je häufiger, desto weniger Animation)`  [INFERRED] [semantically similar]
  Marketing/VIDEO.md → DESIGN-LANGUAGE.md
- `Google Play Trusted Web Activity` --semantically_similar_to--> `CrazyGames-Einbettung (?crazygames)`  [INFERRED] [semantically similar]
  Web/README.md → CLAUDE.md
- `Plausibility-only anti-cheat` --semantically_similar_to--> `Sealed save (HMAC seal)`  [INFERRED] [semantically similar]
  Server/README.md → Web/README.md
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

## Communities (144 total, 11 thin omitted)

### Community 0 - "Achievements & Families"
Cohesion: 0.03
Nodes (172): Achievements, AchievementStep, achievementTotal(), FAMILIES, Family, STAT_KEYS, TIER_PAY, Auction (+164 more)

### Community 1 - "Config, Levels & Formatting"
Cohesion: 0.05
Nodes (71): detourShareAt(), INVITE_LEVEL, towSpeedupAt(), LANDMARK_PRESTIGE, TrialId, comboMultiplier(), Fmt, grouping (+63 more)

### Community 2 - "Mastery, Mafia & Letters"
Cohesion: 0.02
Nodes (56): MASTERY_THRESHOLDS, masteryNumeral(), baseConfig, DAY_MS, Grade, Letter, LetterKind, Loan (+48 more)

### Community 3 - "Settings & Language"
Cohesion: 0.03
Nodes (89): Settings, cloudEnabled, PushChoice, chooseLanguage(), currentLanguage(), known(), legalDoc, LegalId (+81 more)

### Community 4 - "Career Progress"
Cohesion: 0.04
Nodes (86): MasteryStats, MINIMUM_ARMS, ReduceMotion, BOSS_KINDS, builtArmSlots(), cloneConfig(), DAILY_EVENTS, slotDistance() (+78 more)

### Community 5 - "Collision & Crash Physics"
Cohesion: 0.06
Nodes (58): capsule, closestPoints(), contact, contactPoint(), gap(), mergePathLength(), collide(), RigidBody (+50 more)

### Community 6 - "Vec2, Builder & Chest Reel"
Cohesion: 0.06
Nodes (67): add(), TAU, MapGeo, PARTS, TINT, Centre, Plants, DAYLIGHT (+59 more)

### Community 7 - "Audio Build Scripts"
Cohesion: 0.07
Nodes (49): boom(), engine(), envelope(), load(), main(), place(), resample(), riser() (+41 more)

### Community 8 - "UI Shell & Icons"
Cohesion: 0.05
Nodes (22): Haptics, knownShortLink(), made, shortLink(), cloudStoppedHere(), apiUrl(), InputAction, Modifier (+14 more)

### Community 9 - "Challenge Links & Push Client"
Cohesion: 0.05
Nodes (64): Hint, decodeChallenge(), fromBase64Url(), asked(), confirm(), disablePush(), enablePush(), mutedChoices() (+56 more)

### Community 10 - "Crews Client"
Cohesion: 0.08
Nodes (73): addCrewXp(), claimGift(), CrewGift, CrewMember, CrewPreview, CrewProfile, CrewStanding, CrewView (+65 more)

### Community 11 - "Museum Catalog & Weather"
Cohesion: 0.05
Nodes (72): WEATHERS, TITLE_RULES, TITLES, FAIL_CAUSES, bossPlace(), eventLevel(), albumItems(), ALBUMS (+64 more)

### Community 12 - "HUD & Condition Briefings"
Cohesion: 0.06
Nodes (61): ConditionEntry, conditionsOf(), AdPill, BriefView, addOdometer(), ConditionIntro, FAIL_CHIP_SIZE, HUD (+53 more)

### Community 13 - "Game Modes & Challenge Spec"
Cohesion: 0.05
Nodes (65): GAME_MODES, StreakMilestone, CAR_TYPES, challengeCareer(), challengeConfig(), challengeOf(), ChallengeSpec, encodeChallenge() (+57 more)

### Community 14 - "Special Vehicles Update"
Cohesion: 0.08
Nodes (53): AmbulancePhase, ambulanceThrough(), clearArc(), clearZone(), isFireRun(), isOnClearRoad(), joinsClearRoad(), noteMergeNearAmbulance() (+45 more)

### Community 15 - "Server App & Config"
Cohesion: 0.11
Nodes (48): hono, AppOptions, modules(), normalizeCode(), Config, ApiError, cleanText(), integerField() (+40 more)

### Community 16 - "Mafia Panel & Crew UI"
Cohesion: 0.07
Nodes (38): hasCrew(), h(), Cash, dateOf(), MafiaHost, mafiaPanel, assistToggle(), bar() (+30 more)

### Community 17 - "Vehicles & Dents"
Cohesion: 0.05
Nodes (54): moduleEntries(), criminalVehicle(), angleDelta(), Crashed, Dent, Drive, Exiting, isCarType() (+46 more)

### Community 18 - "Crew League"
Cohesion: 0.06
Nodes (39): transaction(), PROFILE_BOARDS, BOT_NAMES, BOT_WEEK_XP, botsOf(), DEMOTE, GOAL_PER_MEMBER, GROUP_REAL (+31 more)

### Community 19 - "Club Panel"
Cohesion: 0.09
Nodes (53): AuctionEvent, AuctionRun, Lot, Fund, FundView, GIFTS, fetchIdeas(), giveToIdea() (+45 more)

### Community 20 - "Cloud Sync Client"
Cohesion: 0.09
Nodes (48): accountOf(), adopt(), arrive(), check(), choosing(), cloudChanged(), CloudDeps, CloudStatus (+40 more)

### Community 21 - "Traffic Flow & Heat"
Cohesion: 0.06
Nodes (3): MergeRating, VersusPhase, World

### Community 22 - "Game Session & News"
Cohesion: 0.04
Nodes (6): CityRise, Tab, Intro, NewsItem, Burst, GameSession

### Community 23 - "Crash Events & Flow"
Cohesion: 0.06
Nodes (41): firstAmbulance(), reaches(), flowCapacity(), ComboChange, CrashFault, CrashReport, EliminationReason, FailCause (+33 more)

### Community 24 - "Leaderboard Client"
Cohesion: 0.06
Nodes (47): dayNumber(), Incoming, fetchCrewBoard(), Account, accountListeners, BASE, BOARD_TOP, BoardEntry (+39 more)

### Community 25 - "Preview Colors & Node Deps"
Cohesion: 0.06
Nodes (45): ACCENT, AMBER, ASPHALT, BACKGROUND_BOTTOM, BACKGROUND_TOP, BLACK, BOARD, BOARD_EDGE (+37 more)

### Community 26 - "Cloud Save UI & Account"
Cohesion: 0.11
Nodes (47): cloudLinked(), cloudView, deleteCloud(), dismissIncoming(), onCloudChange(), useCloudSave(), deleteAccount(), describeError() (+39 more)

### Community 27 - "Vector Math & Explosion FX"
Cohesion: 0.12
Nodes (15): mul(), v(), rotated(), ExplosionEffects, bulbsArt(), coneArt(), RingSignals, starPoints() (+7 more)

### Community 28 - "Tips & News Queue"
Cohesion: 0.06
Nodes (3): TipQueue, latestNote(), Tutorial

### Community 29 - "Server Node Modules"
Cohesion: 0.10
Nodes (35): clientIp(), createApp(), address(), headerName(), integer(), readConfig(), secret(), vapidOf() (+27 more)

### Community 30 - "Web Push (Server)"
Cohesion: 0.04
Nodes (30): ScoreEvent, BoardDef, BOARDS, dayOf(), LIMITS, ParsedScore, utcDay(), ALL_TIME (+22 more)

### Community 31 - "Explosion Rendering"
Cohesion: 0.09
Nodes (16): ExplosionKind, ExplosionReport, armOutward(), Vec2, Billow, Blast, Kind, MapScars (+8 more)

### Community 32 - "Screens & Tab Flow"
Cohesion: 0.09
Nodes (5): Screen, screenTab(), ProgressTarget, SpecialRun, SideSwipe

### Community 33 - "Server Stores (Challenges, Feedback)"
Cohesion: 0.05
Nodes (9): randomCode(), Db, ChallengeStore, FeedbackStore, FriendStore, ReferralStore, hashCode(), SyncStore (+1 more)

### Community 34 - "Save Game, Hints & Elite"
Cohesion: 0.09
Nodes (43): familyOf(), readLot(), HINTS, newCareer(), newSave(), roundTimes(), Elite, isObject() (+35 more)

### Community 35 - "Loot Skins & Chest Table"
Cohesion: 0.07
Nodes (43): Mehr Touren (Frühling, Sommer), Alben (Maps, Commons … Honours, Tours), Bug Hunters (Ladybug … Firefly, Beetle), Auto-Formen (Beetle, Pocket, GT Coupé, Roadster, Jeep, Hot Rod), Car Skins (39), Casino-Skins (Lucky Strike, Mega Win, Double Down, Tycoon), Truhe aufklopfen (8 Tipps, chestTaps), Truhen-Tabelle (+35 more)

### Community 36 - "Drivers & Gravity"
Cohesion: 0.11
Nodes (39): gravity(), moduleLevel(), moduleZone(), busStop(), canSpeedUp(), drive(), hasTransporterOnRing(), leadOnExit() (+31 more)

### Community 37 - "City Pulse"
Cohesion: 0.06
Nodes (7): tensionOf(), CityPulse, HapticID, ProgressState, SessionOutput, UpgradeState, installMafiaDebug()

### Community 38 - "Series Standings & Car Models"
Cohesion: 0.06
Nodes (35): seriesLeaders(), Standing, briefOf(), colorOf(), pendingOf(), Shape, at(), CAR_MODELS (+27 more)

### Community 39 - "Design Language (a11y, Brand, Camera)"
Cohesion: 0.07
Nodes (40): Accessibility & Inclusion (WCAG AA, 44 px, Tastatur), Actions: Tippen wählt, Knopf kauft; zweimal fragen nur bei Unwiderruflichem, Anti-References (Casino-Mobile-Games, Neon-Clutter), Brand Personality (calm, precise, satisfying), Kamera als Lesbarkeit, nicht Dekoration, Kontrast auf jeder Karte (npm run e2e prüft), Canvas readability (Scrim/Outline, AA auf jeder Karte), Casino als einzige Ausnahme vom "no casino look" (+32 more)

### Community 40 - "Admin & Feedback"
Cohesion: 0.07
Nodes (26): ADMIN_PAGE, BUG_HUNTER_SKINS, Feedback, FEEDBACK_KINDS, FEEDBACK_MIGRATIONS, FEEDBACK_STATUSES, FeedbackKind, FeedbackRow (+18 more)

### Community 41 - "Ad Flow"
Cohesion: 0.12
Nodes (5): AdFlow, BuildFlow, partModule(), PageHost, ShopFlow

### Community 42 - "Versus Standings"
Cohesion: 0.11
Nodes (4): VersusBot, Input, MatchFeel, VersusMatch

### Community 43 - "Canvas Drawer"
Cohesion: 0.15
Nodes (4): CanvasDrawer, isBright(), Camera, Grain

### Community 44 - "Ambulance Clear Road"
Cohesion: 0.13
Nodes (28): longestExit(), reservedAmbulanceArm(), isMilitaryOverdue(), reservedMilitaryArm(), reservedLearnerArm(), reservedOversizeArm(), reservedRaceArm(), reservedCriminalArm() (+20 more)

### Community 45 - "Camera FX & Layout"
Cohesion: 0.08
Nodes (25): lerpV(), CameraFxTuning, Lean, zoomAbout(), BuildLayout, settledPops(), onScreen(), addRecede() (+17 more)

### Community 46 - "Multiplayer Room"
Cohesion: 0.13
Nodes (7): GuestMessage, HostMessage, loadError(), peerId(), peerOptions(), Room, RoomEvents

### Community 47 - "Casino Games"
Cohesion: 0.12
Nodes (32): CoinFlip, RouletteSpin, ScratchCard, SlotSpin, SlotSymbol, UpgradeRoll, CashOut, CasinoRun (+24 more)

### Community 48 - "CrazyGames & Storage"
Cohesion: 0.09
Nodes (29): ACCOUNT_KEY, NAME_KEY, SAVE_KEYS, KeyValueStore, useStore(), AdError, call(), CrazyGamesSdk (+21 more)

### Community 49 - "Versus Lobby"
Cohesion: 0.12
Nodes (5): isJoinCode(), newSeries(), Member, seatToken(), VersusLobby

### Community 50 - "Layout & Escort"
Cohesion: 0.14
Nodes (6): isEscorted(), Path, Pose, Layout, isChased(), isTransported()

### Community 51 - "Backdrop Media"
Cohesion: 0.12
Nodes (16): BackdropMedia, parseBackdropLink(), YOUTUBE_HOSTS, youtubeEmbed(), youtubeId(), Backdrop, BACKDROP_KEY, loadBackdrop() (+8 more)

### Community 52 - "Casino Flow"
Cohesion: 0.18
Nodes (4): CasinoFlow, CasinoHost, payTier(), SoundID

### Community 53 - "Museum Details"
Cohesion: 0.15
Nodes (5): Detail, SignalLoop, DetailSheet, rich(), rubber()

### Community 54 - "Idea Backlog"
Cohesion: 0.10
Nodes (27): Gebaut 05.–07.10.: Streak Freeze, Heat, Touren, Achievements, Challenge-Builder (kein Freitext, keine Moderation), Co-op-Multiplayer (2–4 Spieler, ein Crash trifft alle), Discord mit Patch Notes aus /changelog.json, Gauntlet (Unlimited mit Lauf-Effekten), GlitchTip für Fehlerberichte, Wachstum: mehr Spieler erreichen, Landeseiten für Suchbegriffe (Car Circle Alternative) (+19 more)

### Community 55 - "Versus Rules"
Cohesion: 0.11
Nodes (23): peerjs, addRound(), BEST_OF, INPUT_DELAY, isSeriesOver(), PLACE_POINTS, randomJoinCode(), REACTION (+15 more)

### Community 56 - "Tests & QR"
Cohesion: 0.09
Nodes (13): built, heat, level, shifts, careful(), completed(), fakeStorage(), lostAt() (+5 more)

### Community 57 - "Leaderboard Store"
Cohesion: 0.10
Nodes (17): @hono/node-server, Entry, EntryRow, LEADERBOARD_MIGRATIONS, listed(), ListedEntry, parseMeta(), ScoreStore (+9 more)

### Community 58 - "Challenge Links (Server)"
Cohesion: 0.15
Nodes (23): displayCode(), Challenge, CHALLENGE_LIFETIME_MS, CHALLENGE_MIGRATIONS, gonePage(), Mode, MODES, sharePage() (+15 more)

### Community 59 - "Trailer Capture Library"
Cohesion: 0.18
Nodes (20): boot(), botLog(), CLIPS, freeze(), installBot(), LANDSCAPE, markStart(), open() (+12 more)

### Community 60 - "Museum Rendering"
Cohesion: 0.10
Nodes (25): bolt(), BOSS_FOLLOWERS, burst(), cloud(), DARK_COLOR, DARK_ICON, drops(), EVENT_COLOR (+17 more)

### Community 61 - "Audio Player"
Cohesion: 0.13
Nodes (10): AudioPlayer, RainVoice, Voice, Window, Music, MUSIC_LAYERS, MusicLayer, MusicMix (+2 more)

### Community 62 - "Briefs & Swipe Mode"
Cohesion: 0.11
Nodes (6): Brief, SwipeMode, ModeMessage, TopMessage, MuseumFlow, ModePan

### Community 63 - "Camera Lean & Revive"
Cohesion: 0.10
Nodes (3): CameraFx, PopupKind, TyreMarks

### Community 64 - "Online Services Decisions"
Cohesion: 0.13
Nodes (22): Auktionshaus (core/auction.ts), Build with us (Bug-Reports und Ideen), Casino statt Store, Cloud-Spielstand per Sync-Code, Der Club (Geldsenken, ab Level 50), Crews statt Freunde (Wochen-Liga), Freundescode (K7M2-9QXA), Game Fund (net/ideas.ts, core/fund.ts) (+14 more)

### Community 65 - "Reel: Greed"
Cohesion: 0.09
Nodes (18): a, b, booms, bustT, c, clutchT, crash1, crash2 (+10 more)

### Community 66 - "Legal Pages"
Cohesion: 0.12
Nodes (14): address(), email(), GAME_NAME, HOSTING, LEGAL_DOCS, LEGAL_UPDATED, LegalSection, missingLegal() (+6 more)

### Community 67 - "Server Dependencies"
Cohesion: 0.09
Nodes (21): dependencies, hono, @hono/node-server, description, devDependencies, @types/node, typescript, engines (+13 more)

### Community 68 - "Engineering & UX Rules"
Cohesion: 0.10
Nodes (21): Code-Quality-Regeln (lean, strikte Typen, keine Abstraktion), Crashes sind echte Physik (core/crash.ts, drivers.ts), Engineering for feel (Apple-Stil Over-Engineering erwünscht), Fail-Pause (ResultBanner.breath 1,2 s), Wenige Meldungen (NoticeQueue), Fahrzeugfarben sind Spielinformation (UI-tabu), Wer ist schuld (einfädelndes Auto zählt), core/drivers.ts (Fahrermodell) (+13 more)

### Community 69 - "Players Store"
Cohesion: 0.14
Nodes (8): hashToken(), isUniqueViolation(), NameTaken, Player, PLAYER_MIGRATIONS, PlayerRow, PlayerStore, toPlayer()

### Community 70 - "Museum Signals"
Cohesion: 0.11
Nodes (20): SpecialKind, Beacon, BLUE, BOSS_SIGNAL, CARGO, fullCycle(), GOLD, MuseumSignal (+12 more)

### Community 71 - "Ascension Trials"
Cohesion: 0.29
Nodes (21): ascensionRank(), landmarkOf(), levelKind, levelTrialLevel(), levelTrialsWaiting(), rematchKind(), trialOpen(), goal() (+13 more)

### Community 72 - "Result Photo"
Cohesion: 0.21
Nodes (18): qrcode-generator, PatternToken, PerformancePattern, css(), dataBar(), drawPerformancePattern(), drawVectorToken(), inviteCode() (+10 more)

### Community 73 - "Vite & Sims"
Cohesion: 0.10
Nodes (11): vite, tries, auctions, rounds, levels, tries, minutes, runs (+3 more)

### Community 74 - "Server tsconfig"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 75 - "Reel: Wait"
Cohesion: 0.14
Nodes (17): b1, b2, b3, beat(), booms, end, flashes, run (+9 more)

### Community 76 - "Web README Architecture"
Cohesion: 0.15
Nodes (19): App shortcuts (Daily, Unlimited, Multiplayer), Technical architecture (core / present / audio / storage / net / ui), Challenge links, Cloud sync by sync code, CrazyGames distribution (?crazygames), Decisions log (Entscheidungen), Deployment (Docker, nginx, Coolify, port 5050), Deterministic simulation (same seed + taps = same result) (+11 more)

### Community 77 - "Reel: Rate"
Cohesion: 0.12
Nodes (17): booms, c1, crash(), end, f, fHit, flashes, fTap (+9 more)

### Community 78 - "Web Dependencies"
Cohesion: 0.11
Nodes (17): @fontsource-variable/overpass, dependencies, @fontsource-variable/overpass, peerjs, qrcode-generator, description, devDependencies, @playwright/test (+9 more)

### Community 79 - "Name Rules"
Cohesion: 0.17
Nodes (14): crewName(), checkName(), NAME_MAX, NAME_MIN, NameCheck, nameKey(), RESERVED, ANYWHERE (+6 more)

### Community 80 - "Net Guards & Messages"
Cohesion: 0.27
Nodes (15): isInt(), cleanName(), INPUT_KINDS, isNumber(), isReaction(), isText(), RateLimit, readBySlot() (+7 more)

### Community 81 - "Tab Transitions"
Cohesion: 0.20
Nodes (11): barTab(), RenderItem, keyIsBuild(), keyPosition(), keyTab(), LABEL, sameItem(), screenKey (+3 more)

### Community 82 - "Reel: Crash"
Cohesion: 0.12
Nodes (16): booms, c1, crash(), end, f, fHit, flashes, fTap (+8 more)

### Community 83 - "Draw Utilities & CJK"
Cohesion: 0.15
Nodes (15): GroundGrain, sameItem(), sameItems(), samePoint(), samePoints(), Still, CJK, FONT (+7 more)

### Community 84 - "Web tsconfig"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 85 - "Core Architecture Decisions"
Cohesion: 0.13
Nodes (16): Browserspiel (Vite + TypeScript + Canvas), Kurzlinks für Challenges (/c/CODE), Neue Regeln in core/, Werte in config.ts, Fester Takt 120 Hz mit Zeitstempel-Taps, GameSession (present), Einleitungs-Drawer (INTROS), Arbeitsweise neues Spielsystem (core, Bot, darstellen), Browser-Tests über window.__probe (+8 more)

### Community 86 - "Reel: Chest"
Cohesion: 0.12
Nodes (14): a, b, booms, c, CHEST, d, end, flashes (+6 more)

### Community 87 - "Reel: Sky"
Cohesion: 0.12
Nodes (14): booms, end, f, fHit, flashes, fTap, hit, open (+6 more)

### Community 88 - "Web Push Crypto (RFC)"
Cohesion: 0.24
Nodes (13): RFC-8188, RFC-8291, RFC-8292, keys, b64(), encrypt(), newVapidKeys(), sendPush() (+5 more)

### Community 89 - "Reel: City"
Cohesion: 0.15
Nodes (14): booms, cities, end, flashes, h, name(), sfx, shots (+6 more)

### Community 90 - "E2E Tests"
Cohesion: 0.14
Nodes (8): @playwright/test, Api, Boards, Entry, Game, openRanks(), perform(), Places

### Community 91 - "Game Concept & Rules"
Cohesion: 0.14
Nodes (15): Car Circle (Shoom Games) inspiration, Real crash physics (crash.ts, drivers.ts), Gas tanker and Military truck, Hard vs. soft fail rules, Level trials and Build trials, Mayhem mode, Ring bots and AI traffic (minRingBots), Roundabout Timing (RAT) (+7 more)

### Community 92 - "AI Traffic & Collision Basics"
Cohesion: 0.16
Nodes (14): Auto-Formen (present/carModels.ts), KI verhungert nicht an der Linie (aiPatience, aiPushInGap), KI-Verkehr (Bots, minRingBots, Seed-Zufall), Basis / Kernloop, Kollision per Kapseln, keine Physik-Engine, Combo-Multiplikator (x1 bis x6), Andockpunkte für spätere Systeme, Kein Tap-Cooldown, gehaltener Tap, Nachrücken ohne Ruck (+6 more)

### Community 93 - "Casino Decisions"
Cohesion: 0.15
Nodes (14): Offener Bug: Geld zurückspulen über Cloud-Kopie, Bewusst nicht gebaut (Luck-Bonus, Set-Boni …), Casino-Konto auf dem Server (nicht gebaut), Casino (Shop · Casino), Fair gebautes Casino, Casino-Rangliste (casinoProfit), Crash (96 % Rückzahlung), Doppelt oder nichts (faire Münze) (+6 more)

### Community 94 - "Reel: Ten"
Cohesion: 0.15
Nodes (13): landing(), booms, end, flashes, hits, play(), sfx, shots (+5 more)

### Community 95 - "Endgame & Content Docs"
Cohesion: 0.16
Nodes (14): Ascension trials (prestige rank trials), Boss Rush, Briefings and condition chips, Criminals and police (takedown, dispatch), Endgame expansion (prestige content), Oversize Load, Street Racers, Wedding convoy, Money transporter and Jackpot, Museum (30 entries) (+6 more)

### Community 96 - "npm Scripts"
Cohesion: 0.14
Nodes (14): scripts, build, dev, e2e, itch, preview, sim, sim:auction (+6 more)

### Community 97 - "Casino State & Ad Offer"
Cohesion: 0.23
Nodes (7): CasinoGame, AdOffer, CasinoState, edgeDistance(), needleTime(), needleTurn(), slotEnd()

### Community 98 - "Casino Wallet & Rounds"
Cohesion: 0.19
Nodes (5): CasinoRound, CasinoCue, Books, CoinFlight, Wallet

### Community 99 - "Photo Hooks"
Cohesion: 0.25
Nodes (3): confirm(), PhotoHooks, PhotoView

### Community 100 - "Translate Script"
Cohesion: 0.19
Nodes (10): __dirname, getArgs(), I18N_FILE, LANG_DIR, main(), MODULES, ROOT, scaffoldLanguage() (+2 more)

### Community 101 - "Server Overview"
Cohesion: 0.19
Nodes (12): Leaderboards (shift-level, unlimited, daily, rush, casino), Car Game server (Hono + SQLite), Challenge short links, Multiplayer relay (Cloudflare TURN), Invites / referrals, Player names and profanity filter, Server privacy and data retention, Remote tuning (+4 more)

### Community 102 - "Services: Ads, Club, Mafia, Legal"
Cohesion: 0.23
Nodes (13): City Fund (legacy), AdSense and rewarded ads, Casino (play money only), The Club (Auction House, City Fund), CrazyGames integration, Canvas drawing performance (baking, sprites), itch.io embed, Legal pages (privacy, imprint) (+5 more)

### Community 103 - "Economy, Chests & Albums"
Cohesion: 0.18
Nodes (13): Albums (set rewards and frames), Casino (Crash, Slots, Skin-Upgrade, Roulette, Scratch Card, Double or nothing), Casino presentation (reveal first, then money), Chests (Standard, Premium, Criminal Hunt, Event), City Evolution, Economy: earning and spending money, Mastery (8 goals, extended to IV and V), Street modules (Toll Booth, Speed Camera, Tow Depot, Billboard, Detour Sign) (+5 more)

### Community 104 - "Dev Probe"
Cohesion: 0.18
Nodes (6): Window, Bot, installProbe(), Probe, Snapshot, Spread

### Community 105 - "Level Ladder & Remote Tuning Decisions"
Cohesion: 0.20
Nodes (12): Analytics mit Umami (ui/analytics.ts), core/levels.ts (forIntro, forEase, forLevel), Sanfter Einstieg (forIntro-Leiter), Späte Inhalte an Prestige-Ränge (bossesPerRank), Rechtliches (Datenschutz, Impressum, legal.ts), Benachrichtigungen (Web Push, net/push.ts), Leise Hilfe (Careers.careerShift, assisted), Rekord in Sicht (Goals.record) (+4 more)

### Community 106 - "Trailer Render"
Cohesion: 0.17
Nodes (9): CACHE, FOOTAGE, frameDir, OUT, page, pending, range, ROOT (+1 more)

### Community 107 - "Reel Production Workflow"
Cohesion: 0.30
Nodes (11): Favoriten reel-3-too-early und reel-4-every-city, Hochformat 1080x1920, 14–18 s, Ton an, Hook in der ersten Sekunde, reel-5-rate-my-timing, Schritt 1: Aufnehmen (capture/batch.mjs, Bots peak/wild/hunter/bold), Schritt 3: Schneiden (reel-crash.mjs / reel-city.mjs kopieren, endCard()), Schritt 2: Momente finden (footage/<clip>.json, Kontaktbogen), Ausgabe videos/reel-<n>-<name>.mp4 (+3 more)

### Community 110 - "Ad: Speed"
Cohesion: 0.18
Nodes (9): base, flashes, hits, HOLD, HOLD_AURORA, RING, sfx, shots (+1 more)

### Community 111 - "Trailer Main"
Cohesion: 0.18
Nodes (7): booms, flashes, RING, sfx, shots, titles, worlds

### Community 112 - "Motion, Feel & Emergency Vehicles"
Cohesion: 0.22
Nodes (11): Accessibility and Reduce Motion, Camera under pressure (cameraFx.ts), Critical Merge, Emergency vehicles (ambulance, fire engine), Perfect Chain and Flow State, Jammed merges (no points), Perfect Run, Battery saver and adaptive resolution (+3 more)

### Community 113 - "Icons & Car Art Direction"
Cohesion: 0.20
Nodes (9): Vehicle style study, Animated icon system (animatedIcons.ts), Icon style (24 grid, 1.8 stroke, theme colours), New icon template and checklist, Reduce Motion handling for icons, Icon animation technical rules, DESIGN-LANGUAGE.md (moved design language), Product definition (users and purpose) (+1 more)

### Community 115 - "Ad: Rage"
Cohesion: 0.20
Nodes (9): bottoms, flashes, hits, RAMP_BUST, RAMP_CRASH, sfx, shots, titles (+1 more)

### Community 116 - "Trailer Wide Cuts"
Cohesion: 0.24
Nodes (7): wideCut(), flashes, k, RING, k, RING, worlds

### Community 117 - "Daily, Heat & Quiet Help"
Cohesion: 0.20
Nodes (10): After Work bonus (18-20h), Balancing bots and sim scripts, City Events, Daily Shift and streak, Quiet help after losses (careerShift), Heat (difficulty ladder), Motorbike, Learner driver, School bus, Daily quests (+2 more)

### Community 118 - "Save Seal"
Cohesion: 0.29
Nodes (8): encoder, fraction(), H0, hmac(), K, KEY, rotr(), sha256()

### Community 119 - "Project Docs Hub"
Cohesion: 0.31
Nodes (9): Animierte Icons (ui/animatedIcons.ts), Frontend-Übergänge (transitions-dev Skills), core/config.ts (alle Startwerte), Spiel.md (Roundabout Timing overview), CLAUDE.md, FOUNDATION.md, Patch notes (patchNotes.ts), Server/README.md (+1 more)

### Community 120 - "Ad: Calm"
Cohesion: 0.22
Nodes (7): calm, fades, quiet, RING, sfx, shots, titles

### Community 122 - "Progression Systems"
Cohesion: 0.28
Nodes (9): Achievements (123 tiers, 31 families), Elite ladder (Elite XP), Feats, Landmarks (The Etoile), Legendary Shifts, Prestige, Prestige-Chronik (formerly Hall of Fame), Season Pass (in-game money, free track) (+1 more)

### Community 123 - "Trailer Package"
Cohesion: 0.25
Nodes (7): description, devDependencies, playwright, name, private, type, playwright

### Community 125 - "Meter & Seen State"
Cohesion: 0.36
Nodes (6): at(), follow(), remember(), seenOf(), Shown, seen()

### Community 126 - "Navigation & Native Feel"
Cohesion: 0.33
Nodes (7): Flache Navigation, Native App-Anmutung (schwebendes Dock, iOS-Stil), Sortierung der Tabs (Progress, Shop, Build, Settings), Wischbare Segmente (GameSession.stepSection), Game-Tab-Modi (Shift, Unlimited, Mayhem, Multiplayer), present/flow.ts (Screen-Ablauf), Screens und UI (flow.ts, kein Startmenü)

### Community 127 - "Capture Batch"
Cohesion: 0.29
Nodes (4): LAND, only, queue, SHOTS

### Community 128 - "Short Cut"
Cohesion: 0.29
Nodes (6): flashes, RING, sfx, shots, titleHits, titles

### Community 130 - "Site Data & Patch Notes"
Cohesion: 0.40
Nodes (6): Museum wächst mit (core/museum.ts), Patch Notes (present/patchNotes.ts), Website-Daten (/data/*.json, siteData.ts), Website-Inhalte aus dem Spiel (npm run content), Changelog API (/changelog.json), Site data API (/data/*.json)

### Community 131 - "Save, Seal & Cloud"
Cohesion: 0.33
Nodes (4): Cloud save by sync code, Your player (one name for ranks, friends, cloud), Cloud sync client (net/cloud.ts), Local saving (localStorage carGame.save.v2)

### Community 132 - "Deployment, PWA & Push"
Cohesion: 0.33
Nodes (5): Server deployment on Coolify, Web Push notifications module, Deploying (Docker, nginx, Coolify), Notifications client (net/push.ts), PWA (manifest, service worker, shortcuts)

### Community 133 - "Crews, Feedback & Rewards"
Cohesion: 0.40
Nodes (6): Crews (weekly league, gifts), Build with us feedback (bugs and ideas), Friends (one-way friend code, legacy), Game fund (ideas), Moderation and admin inbox, Rewards table

### Community 134 - "RTC & ICE Servers"
Cohesion: 0.53
Nodes (5): clean(), fixedRelay(), fromService(), iceServers(), STUN

### Community 135 - "Ads & Distribution Channels"
Cohesion: 0.40
Nodes (5): CrazyGames-Einbettung (?crazygames), Vollbild-Inszenierung rewardBurst (nur drei Momente), Freiwillige Werbung (nur Rewarded Ads), Streak-Anzeigen und Schlüsselmomente, Google Play Trusted Web Activity

### Community 137 - "Career Sim"
Cohesion: 0.40
Nodes (4): CHECKPOINTS, PROFILES, story, target

### Community 138 - "Deployment & Workflow"
Cohesion: 0.50
Nodes (4): Deployment (Docker, nginx, Port 5050, Coolify), GitHub-Workflow (Commits direkt auf main, Push nur durch Leo), Offline spielbar (Service Worker), Vor jedem Commit: npm test und npm run build grün

### Community 139 - "Languages & Targets"
Cohesion: 0.50
Nodes (4): Spielsprachen (EN, DE, ES, FR, IT, JA, KO, ZH), Schilder nach Sprache und Region (present/signs.ts), present/strings.ts (S), Zielgeräte und Performance-Maßstab

## Ambiguous Edges - Review These
- `Spielsprachen (EN, DE, ES, FR, IT, JA, KO, ZH)` → `Zielgeräte und Performance-Maßstab`  [AMBIGUOUS]
  FOUNDATION.md · relation: conceptually_related_to

## Knowledge Gaps
- **118 isolated node(s):** `RFC-8188`, `RFC-8291`, `RFC-8292`, `@fontsource-variable/overpass`, `@types/node` (+113 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1234 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GameSession` connect `Game Session & News` to `Achievements & Families`, `Mastery, Mafia & Letters`, `Settings & Language`, `UI Shell & Icons`, `Challenge Links & Push Client`, `HUD & Condition Briefings`, `Game Modes & Challenge Spec`, `Traffic Flow & Heat`, `Crash Events & Flow`, `Leaderboard Client`, `Vector Math & Explosion FX`, `Tips & News Queue`, `Explosion Rendering`, `Screens & Tab Flow`, `City Pulse`, `Ad Flow`, `Canvas Drawer`, `Camera FX & Layout`, `Casino Flow`, `Museum Details`, `Audio Player`, `Briefs & Swipe Mode`, `Camera Lean & Revive`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **What connects `RFC-8188`, `RFC-8291`, `RFC-8292` to the rest of the system?**
  _118 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Achievements & Families` be split into smaller, more focused modules?**
  _Cohesion score 0.026379325762317805 - nodes in this community are weakly interconnected._
- **Why does `World` connect `Traffic Flow & Heat` to `Achievements & Families`, `Career Progress`, `Collision & Crash Physics`, `Vec2, Builder & Chest Reel`, `Museum Catalog & Weather`, `HUD & Condition Briefings`, `Special Vehicles Update`, `Vehicles & Dents`, `Game Session & News`, `Crash Events & Flow`, `Vector Math & Explosion FX`, `Tips & News Queue`, `Screens & Tab Flow`, `Drivers & Gravity`, `City Pulse`, `Series Standings & Car Models`, `Versus Standings`, `Ambulance Clear Road`, `Camera FX & Layout`, `Layout & Escort`, `Versus Rules`, `Briefs & Swipe Mode`, `Camera Lean & Revive`, `Briefings`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Should `Config, Levels & Formatting` be split into smaller, more focused modules?**
  _Cohesion score 0.04864262399490486 - nodes in this community are weakly interconnected._
- **Why does `vite` connect `Vite & Sims` to `Legal Pages`, `Career Sim`, `Web Dependencies`, `Tests & QR`, `Server Node Modules`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Spielsprachen (EN, DE, ES, FR, IT, JA, KO, ZH)` and `Zielgeräte und Performance-Maßstab`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._