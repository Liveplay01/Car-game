import Foundation
import GameCore

/// What the platform reports; key and touch mapping stays in the platform.
public enum InputAction: Sendable, Equatable {
    /// Send the front car (click, space, later a touch on the playfield). After a shift:
    /// the next shift.
    case tap
    /// The screen's main action (Enter): start, resume, next shift.
    case confirm
    /// Esc: back out of a menu. A running shift has nothing to back out of.
    case back
    /// Picks the n-th menu item, counting from 1 (number keys).
    case choose(Int)
    /// Start the shift over with a new seed (R).
    case restart
    /// Emergency dispatch: the next car becomes a police car for half the combo
    /// (E or right-click; in the app a button and the Action Button).
    case dispatch
    case toggleDebug
    /// 1× → 0.5× → 0.25× (F2).
    case cycleSlowMotion
    /// The window or app lost focus: a running shift freezes (FOUNDATION.md 3).
    case focusLost
    /// The window or app is back: the frozen shift counts in and runs on.
    case focusGained
    /// A tap on an upgrade card: it opens its details, a second tap within
    /// `GameSession.doubleTapWindow` buys it (the app's double tap, a double click here).
    case tapUpgrade(Upgrade)
    /// A tap on the Shop page (`ShopPage.target(at:)`): a section, a chest, a button, an item.
    case tapShop(ShopPage.Target)
    /// A tap on the Progress page (`ProgressPage.target(at:)`): a section.
    case tapProgress(ProgressPage.Target)
    /// Dragging on a page: press, move, release (the Street Builder's drag and drop).
    case pointerDown(Vec2)
    case pointerMove(Vec2)
    case pointerUp(Vec2)
    /// A tab of the tab bar (the app's `TabView`, a click on the test window's strip).
    case selectTab(Tab)
    /// The next tab (Tab key in the test window).
    case nextTab
    /// The Game tab's next (+1) or previous (-1) mode (arrow keys; a swipe comes as pointer
    /// events, `pointerDown` on the waiting screen).
    case swipeMode(Int)
    /// A menu button of the app.
    case perform(ScreenAction)
}

/// Output of one frame.
public struct Frame: Sendable {
    public var renderList: RenderList
    /// Game events of this frame.
    public var events: [GameEvent]
    public var screen: Screen
}

/// What differs between the test window and the app.
public struct PresentationOptions: Sendable, Equatable {
    /// Menus as text pages in the render list. The app shows SwiftUI menus instead.
    public var drawsMenus: Bool
    /// Key hints and the pause glyph; only the test window has keys.
    public var showsKeyHints: Bool

    public init(drawsMenus: Bool, showsKeyHints: Bool) {
        self.drawsMenus = drawsMenus
        self.showsKeyHints = showsKeyHints
    }

    public static let testWindow = PresentationOptions(drawsMenus: true, showsKeyHints: true)
    public static let app = PresentationOptions(drawsMenus: false, showsKeyHints: false)
}

/// Runs the game for a platform: screens, fixed-step loop, input timestamps, feedback,
/// save game and the render list.
///
/// The test window and the app call `frame(...)` once per display frame and only draw
/// the result and play the sounds. That keeps both platforms guaranteed to behave the same.
public final class GameSession {
    public static let slowMotionScales: [Double] = [1, 0.5, 0.25]
    /// Longest frame the simulation catches up on; longer hitches are dropped.
    public static let maxFrameDelta = 0.25
    /// Between the end of a shift and the result banner, so the last moment stays visible.
    public static let resultDelay = 1.2
    /// How long the score takes to catch up with a scored merge.
    static let scoreCatchUp = 0.28
    /// How long the spring on the multiplier lasts when the combo reaches a new tier.
    static let comboPop = 0.35
    /// The count-in after an interruption: long enough to read the road again.
    static let countInSeconds = 2.0
    public static let noticeDuration = 3.5

    /// The config the platform started with; `tuning.json` is laid over it.
    public let baseConfig: Config
    /// The config new shifts use: `baseConfig` plus live tuning.
    public private(set) var config: Config
    public let options: PresentationOptions
    /// From `--time-scale`, multiplied with slow motion.
    public let baseTimeScale: Double
    public internal(set) var world: World
    public private(set) var screen: Screen = .ready
    public private(set) var save: SaveGame
    public private(set) var slowMotionLevel = 0
    public var isDebugVisible = false
    public var format = TextFormat.current
    /// The platform's Reduce Motion setting (iOS); the test window has none.
    public var systemReduceMotion = false

    private let store: SaveStore
    private let random: RandomSource
    private let audio: AudioPlaying?
    private let haptics: HapticsPlaying?
    private var clock = FixedStepClock()
    private var markers: [DebugMarker] = []
    private var effects = CrashEffects(seed: 0)
    private var popups: [Popup] = []
    private var popupSerial = 0
    /// The finished shift, shown once `resultCountdown` has run out.
    private var pendingSummary: ShiftSummary?
    private var resultCountdown = 0.0
    /// Real time the result banner has been showing.
    private var resultAge = 0.0
    /// The result's money has finished counting up (its "ka-ching" played).
    private var moneyLanded = false
    /// Real time since the last takedown.
    private var sinceTakedown = Double.infinity
    /// Brake lights and the headlight flash for a held tap (`VehicleLamps`).
    private var lamps = VehicleLamps()
    /// Real seconds since the crash that lost the shift, and since the shift was lost at all
    /// (a crash or an escape); the camera's step back after it, 0…1.
    private var sinceFatalCrash = Double.infinity
    private var sinceLoss = Double.infinity
    private var lossPull = 0.0
    /// The score as the HUD shows it: it runs after the real one instead of jumping.
    private var shownScore = 0.0
    /// The money as the top bar shows it during a shift: the bank at the start plus what the
    /// shift has earned, counting up; and since when it last grew.
    private var shiftStartMoney = 0
    private var shownMoney = 0.0
    private var sinceMoney = Double.infinity
    /// The bank before and after the last shift was booked, for the result's count.
    private var resultBank = (before: 0, after: 0)
    /// How long ago the combo reached a new tier, for the spring on the multiplier.
    private var sinceComboTier = Double.infinity
    /// Seconds since a car went in, a strike and a police crash counted (`HUD.Pops`), and
    /// the counts they were measured against.
    private var sinceCarSent = Double.infinity
    private var sinceStrike = Double.infinity
    private var sincePoliceCrash = Double.infinity
    private var seenCounts = (carsSent: 0, strikes: 0, policeCrashes: 0)
    /// Flow State as the ring glow shows it, 0…1: it fades in and out instead of switching.
    private var flowLevel = 0.0
    /// The island's rim: the shift's ticks and the ring's signals (`RingSignals`).
    private var rim = RingSignals.State()
    /// The city's breathing (`CityPulse`).
    private var cityPulse = CityPulse()
    /// The camera, gliding between the tabs' views of the city (`Perspective`).
    private var cameraRig = Perspective.Rig()
    /// Upgrades: how far the city around the ring has stepped back, 0…1.
    private var recede = 0.0

    /// What the adaptive music should play right now (M11); the app fades its stems to it.
    public var musicMix: MusicMix {
        screen == .playing ? MusicMix.playing(world, flow: flowLevel) : .silent
    }
    /// Seconds the flow glow needs to fade in or out.
    static let flowFade = 0.6
    /// A shift interrupted from outside (call, home screen): frozen until the player is back.
    public private(set) var isInterrupted = false
    /// Seconds left of the count-in after an interruption; the world stands still until 0.
    public private(set) var countIn = 0.0
    /// Real time the Game tab has been waiting for the first tap.
    private var sinceReady = 0.0
    /// Sounds played so far: small pitch variations follow it (`Feedback.pitch`).
    private var soundSerial = 0
    /// The first shift's hints; nil once they were shown.
    private var tutorial: Tutorial?
    /// The map's own clock (petals, koi, snow): runs with the game, slows with it, and never
    /// starts over at a new shift, so nothing jumps between two shifts.
    private var sceneTime = 0.0
    /// A second tap on the same card within this long buys it.
    public static let doubleTapWindow = 0.4
    /// What the Upgrades tab shows and animates.
    public private(set) var upgradePage = UpgradePage.State()
    /// What the Shop tab shows and animates (M10).
    public private(set) var shopPage = ShopPage.State()
    /// Plays rewarded ads in the app; without one (test window) a placeholder ad runs.
    public weak var adProvider: AdProviding?
    /// Takes real money in the app (StoreKit); without one a placeholder purchase runs.
    public weak var purchaser: Purchasing?
    /// What the Progress tab shows and animates.
    public private(set) var progressPage = ProgressPage.State()
    /// The Build tab's page it was left on, and the glide of its segment thumb.
    public private(set) var buildPage = Tab.upgrades
    private var buildSlide: (from: Tab, age: Double)?
    /// The Game tab's mode swipe (Leo, 26.09.2026: the map itself slides on to the next
    /// roundabout): where the finger came down and how far it has moved.
    private var modeDrag: (start: Vec2, offset: Double)?
    /// How far the scene is pushed sideways (points) and how fast it moves; and the mode it
    /// is travelling to. Once the old roundabout is out of the picture the new one comes in
    /// from the other side and clicks into place on a spring.
    private var modePan = 0.0
    private var modePanVelocity = 0.0
    private var modeTravel: (to: GameMode, direction: Double)?
    /// The message that says which mode the new roundabout is.
    private var modeBanner: (mode: GameMode, age: Double)?
    /// A swipe this long is no tap any more.
    static let swipeThreshold = 36.0
    /// The spring the map settles on: quick, with a small overshoot, so it clicks in.
    static let panFrequency = 17.0
    static let panDamping = 0.68
    /// The mode of the shift waiting or running.
    public private(set) var playingMode = GameMode.shift
    /// Mayhem's flames as they count up, and the bump of the last crash.
    private var shownFlames = 0.0
    private var sinceFlames = Double.infinity

    /// The chosen mode.
    public var gameMode: GameMode { save.mode }

    /// A swipe across the Game tab is being followed (the platforms send its moves).
    public var isTrackingPointer: Bool { modeDrag != nil }
    /// What the Street Builder tab shows and animates.
    public private(set) var builderPage = StreetBuilderPage.State()
    /// The last tap on a placed part, to tell a double tap from a single one.
    private var lastPartTap = Double.infinity
    /// Where the last viewport was, so the pages can hit-test what was drawn.
    private var lastViewport = Vec2(430, 900)
    /// The last tap on a card, to tell a double tap from two single ones.
    private var lastCardTap: (upgrade: Upgrade, age: Double)?
    private var notice: (text: String, age: Double)?
    /// The screen change in progress, and what the last frame showed over the scene: the
    /// old screen fades out while the new one glides in (`ScreenTransition`).
    private var transition: ScreenTransition?
    private var shownKey: ScreenTransition.Key?
    private var shownOverlay: [RenderItem] = []

    public init(
        config: Config = Config(),
        random: RandomSource,
        store: SaveStore,
        audio: AudioPlaying? = nil,
        haptics: HapticsPlaying? = nil,
        options: PresentationOptions = .testWindow,
        timeScale: Double = 1
    ) {
        baseConfig = config
        self.config = config
        self.random = random
        self.store = store
        self.audio = audio
        self.haptics = haptics
        self.options = options
        baseTimeScale = timeScale
        save = store.load() ?? SaveGame()
        // The Game tab opens on the next shift, already flowing; the first tap starts it.
        let seed = random.nextSeed()
        playingLevel = save.career.level
        world = World(config: save.career.config(from: config, seed: seed), seed: seed, mode: .shift, startsOnFirstTap: true)
        effects = CrashEffects(seed: seed)
        tutorial = save.tutorialDone ? nil : Tutorial()
        // The first shift is always a plain one; another mode sets its roundabout up now.
        if tutorial != nil { save.mode = .shift }
        if save.mode != .shift { prepareShift(continuing: false) }
        collectLoginIncome()
    }

    /// Daily Login (v1.2): the first launch of a day banks what the toll booths earned
    /// while the game was closed.
    public func collectLoginIncome() {
        guard let income = save.career.collectLoginIncome(day: today, config: config) else {
            store.save(save)
            return
        }
        store.save(save)
        showNotice(Strings.Daily.welcomeBack(format.number(income)))
    }

    /// Simulation speed: `--time-scale`, the debug slow motion (F2) and the short slow
    /// motion of a takedown.
    public var timeScale: Double {
        baseTimeScale * Self.slowMotionScales[slowMotionLevel] * min(takedownSlowMotion, fatalSlowMotion)
    }

    /// The crash that loses the shift (Leo, 26.09.2026): no hard stop, the moment slows down
    /// to a fifth for a breath, then eases back while the traffic drives on. Never with
    /// Reduce Motion.
    var fatalSlowMotion: Double {
        guard !reduceMotion else { return 1 }
        let hold = 0.45
        let ease = 0.4
        if sinceFatalCrash < hold { return 0.2 }
        if sinceFatalCrash < hold + ease { return 0.2 + 0.8 * Ease.outCubic((sinceFatalCrash - hold) / ease) }
        return 1
    }

    /// After a lost shift, a tap after this long (real seconds) is the next try at once:
    /// no result to wait for. Before it, a tap meant for the last car does nothing.
    public static let restartLock = 0.5
    /// How far the camera steps back after a lost shift.
    static let lossPullBack = 0.05

    /// A takedown freezes the moment for ~0.3 s (IDEA.md: the good crash), then eases back.
    /// Never with Reduce Motion.
    var takedownSlowMotion: Double {
        guard !reduceMotion else { return 1 }
        let hold = 0.3
        let ease = 0.25
        if sinceTakedown < hold { return 0.2 }
        if sinceTakedown < hold + ease { return 0.2 + 0.8 * Ease.outCubic((sinceTakedown - hold) / ease) }
        return 1
    }

    public var reduceMotion: Bool {
        switch save.settings.reduceMotion {
        case .system: systemReduceMotion
        case .on: true
        case .off: false
        }
    }

    /// The current menu or page as data; nil on the Game tab.
    public var content: ScreenContent? {
        ScreenFlow.content(for: screen, save: save, world: world, config: config, format: format, today: today)
    }

    // MARK: - Screen flow

    public func perform(_ action: ScreenAction) {
        switch action {
        case .startShift:
            // The shift itself starts with its first car; this only leaves the waiting banner.
            if screen == .ready { startPlaying() }
        case .restart:
            prepareShift(continuing: false)
        case .openSettings:
            if screen == .ready {
                screen = .settings
                tick()
            }
        case .closeSettings:
            if screen == .settings {
                screen = .ready
                tick()
            }
        case let .setGameMode(mode):
            guard mode != gameMode, world.shift.phase == .waiting, screen == .ready || isShowingResult else { return }
            save.mode = mode
            store.save(save)
            // A roundabout of its own: the new mode starts afresh, on the waiting screen.
            prepareShift(continuing: false, screen: .ready)
            modeBanner = (mode, 0)
        case let .showTab(tab):
            guard screen.showsTabBar, tab != screen.tab || screen.tab == .game else { return }
            // The next shift already waits behind every page and behind the result.
            let next: Screen = tab == .game ? .ready : .page(tab)
            if next != screen {
                tick()
                leaveShelf()
            }
            // Between the Build tab's two pages the segment thumb glides over.
            if Tab.build.contains(tab) {
                if Tab.build.contains(screen.tab), screen.tab != tab { buildSlide = (screen.tab, 0) }
                buildPage = tab
            }
            screen = next
        case let .showShop(section):
            perform(.showTab(.shop))
            guard screen == .page(.shop) else { return }
            shopPage.section = section
            shopPage.sectionSlide = nil
        case let .showProgress(section):
            perform(.showTab(.progress))
            guard screen == .page(.progress) else { return }
            progressPage.section = section
            progressPage.sectionSlide = nil
        case let .pickUpPart(part):
            tick()
            builderPage.selected = part
            builderPage.dragging = (part, StreetBuilderPage.cards(viewport: lastViewport, bottomInset: tabInset).first { $0.part == part }?.rect.center ?? .zero)
        case let .placePart(slot):
            guard let part = builderPage.dragging?.part ?? builderPage.selected else { return }
            guard StreetBuilderPage.canPlace(part, inSlot: slot, career: save.career, config: config) else { return }
            builderPage.pending = (part, slot)
            builderPage.removing = 0
            builderPage.dragging = nil
            builderPage.target = nil
        case .buildPart:
            buildPart()
        case .removePart:
            builderPage.pending = nil
            builderPage.removing = 0
        case let .selectUpgrade(upgrade):
            if upgradePage.selected != upgrade { tick() }
            upgradePage.selected = upgrade
            upgradePage.pressed = (upgrade, 0)
        case let .buy(upgrade):
            buy(upgrade)
        case let .openChest(index):
            guard let opening = save.career.openChest(at: index, seed: UInt64(save.shiftsPlayed), day: today) else { return }
            let albums = completeAlbums()
            store.save(save)
            if !albums.isEmpty { showNotice(albums.joined(separator: "  ·  ")) }
            // The collection waits on the new item: its shelf, and it selected, one tap to wear.
            shopPage.shelf = ShopPage.Shelf.of(opening.item)
            shopPage.selectedItem = opening.item.id
            // The drawn shop reveals it and plays the burst with its animation; without drawn
            // menus a short notice says what it was.
            if options.drawsMenus {
                shopPage.opening = (opening, reduceMotion ? ShopPage.burstTime : 0)
                // With Reduce Motion the chest opens at once and bursts right away.
                if reduceMotion {
                    play(sounds: [opening.item.rarity >= .epic ? .chestBurstRare : .chestBurst], haptics: [.chest])
                } else {
                    play(sounds: [.chestCharge], haptics: [.wanted])
                }
            } else {
                play(sounds: [opening.item.rarity >= .epic ? .chestBurstRare : .chestBurst], haptics: [.chest])
                showNotice(Strings.Shop.opened(opening))
            }
        case let .buyChest(kind):
            guard save.career.buyChest(kind, config: config) else {
                shopPage.denied = 0.001
                play(sounds: [.denied], haptics: [])
                showNotice(Strings.Notice.notEnoughMoney(format.number(config.price(of: kind) ?? 0)))
                return
            }
            store.save(save)
            play(sounds: [.purchase], haptics: [.comboUp])
        case .watchAd:
            showAd(for: .chest)
        case .watchCashAd:
            showAd(for: .cash)
        case let .purchase(product):
            guard save.career.canBuy(product), shopPage.purchase == nil else { return }
            tick()
            if let purchaser {
                purchaser.purchase(product) { [weak self] paid in
                    if paid {
                        self?.purchased(product)
                    } else {
                        self?.showNotice(Strings.Store.cancelled)
                    }
                }
            } else {
                // No App Store yet: a placeholder purchase that charges nothing.
                shopPage.purchase = (product, 0)
            }
        case .restorePurchases:
            tick()
            if let purchaser {
                purchaser.restore { [weak self] products in self?.restored(products) }
            } else {
                restored([])
            }
        case let .wear(id):
            if !save.career.wear(id), Cosmetics.item(id)?.kind == .carSkin, save.career.owns(id) {
                showNotice(Strings.Shop.skinsFull(Career.maxCarSkins))
            }
            store.save(save)
        case .toggleSound:
            save.settings.sound.toggle()
            store.save(save)
            tick()
        case .toggleVehicleLabels:
            save.settings.vehicleLabels.toggle()
            store.save(save)
            tick()
        case .toggleHaptics:
            save.settings.haptics.toggle()
            store.save(save)
            tick()
        case .cycleReduceMotion:
            let all = ReduceMotion.allCases
            let index = all.firstIndex(of: save.settings.reduceMotion) ?? 0
            save.settings.reduceMotion = all[(index + 1) % all.count]
            store.save(save)
            tick()
        }
    }

    /// Applies `tuning.json` (T in the test window). A running shift restarts with the same
    /// seed, so the new values meet the same traffic.
    public func loadTuning(_ data: Data) {
        let tuning: Tuning
        do {
            tuning = try Tuning.load(data, base: baseConfig)
        } catch {
            showNotice(Strings.Notice.tuningFailed(String(describing: error)))
            return
        }
        config = tuning.config
        switch screen {
        case .playing:
            prepareShift(continuing: false, seed: world.seed, screen: .playing)
        case .ready, .settings, .page:
            prepareShift(continuing: false, seed: world.seed, screen: screen)
        case .result:
            break
        }
        if tuning.unknownKeys.isEmpty {
            showNotice(Strings.Notice.tuningLoaded(values: tuning.keys.count, changes: Tuning.differences(config).count))
        } else {
            showNotice(Strings.Notice.unknownKeys(tuning.unknownKeys))
        }
    }

    /// A short message at the bottom of the screen (test window).
    public func showNotice(_ text: String) {
        notice = (text, 0)
    }

    /// The level the running shift is played at.
    public private(set) var playingLevel = 1

    /// Sets up the next shift for the saved career: its level (car count, traffic) and the
    /// upgrades bought (`Career.config`). It waits, traffic flowing, for its first tap.
    /// Continuing keeps the cars on the road and lets the new queue roll in (`World.nextShift`);
    /// otherwise the roundabout starts afresh.
    private func prepareShift(continuing: Bool, seed: UInt64? = nil, screen next: Screen = .ready) {
        // While today's Daily Shift is open, it is the next shift, with its own seed.
        let daily = wantsDaily
        dailySelected = daily
        let seed = daily ? Career.dailySeed(day: today) : (seed ?? random.nextSeed())
        playingLevel = save.career.level
        playingMode = save.mode
        shownFlames = 0
        playingDaily = daily
        dailySplash = daily ? 0 : nil
        splits = []
        raceDelta = nil
        let shiftConfig = shiftConfig(seed: seed)
        if continuing {
            world = world.nextShift(config: shiftConfig, seed: seed)
        } else {
            world = World(config: shiftConfig, seed: seed, mode: .shift, startsOnFirstTap: true)
            resetScene()
        }
        pendingSummary = nil
        shownScore = 0
        sinceComboTier = .infinity
        screen = next
    }

    /// Jumps to a level, e.g. `--level 8` in the test window. Saved at once.
    /// Test window (`--weather`, `--event`): every shift gets this sky and this city event.
    /// Test window (`--map sand`): shows a map skin without wearing it; never saved.
    public var forcedMapSkin: String?

    public var forcedWeather: Weather? {
        didSet { refreshWaitingShift() }
    }
    public var forcedEvent: CityEvent? {
        didSet { refreshWaitingShift() }
    }

    /// Today as a day number (days since 1970, local time). The platform may set it; the
    /// Daily Shift and the Challenges change with it (v1.2).
    public var today = GameSession.dayNumber(Date())

    public static func dayNumber(_ date: Date) -> Int {
        let local = date.timeIntervalSince1970 + Double(TimeZone.current.secondsFromGMT(for: date))
        return Int((local / 86_400).rounded(.down))
    }

    /// The next shift is today's Daily Shift; and whether the running one is.
    public private(set) var dailySelected = false
    public private(set) var playingDaily = false
    /// The Daily Shift comes by itself as the first shift of the day (Leo, 25.09.2026); there
    /// is nothing to pick. Tests that need a plain shift turn it off.
    public var automaticDaily = true

    /// Whether the next shift is today's Daily Shift. Never the very first shift: a new
    /// player learns on a plain one (`Tutorial`), the Daily comes right after it.
    private var wantsDaily: Bool {
        automaticDaily && save.mode == .shift && (tutorial?.isOver ?? true) && save.career.isDailyOpen(day: today)
    }
    /// The splash that announces the Daily Shift, and how long it has shown.
    private var dailySplash: Double?
    /// Game Center (the app sets it; the test window has none).
    public var gameServices: GameServicing?
    /// When each car of the running shift was in, seconds from its first tap, and how the
    /// last one compared with the best time at this level (Leo: Rekord-Geist).
    private var splits: [Double] = []
    private var raceDelta: Double?

    /// The config of a shift with this seed: the career's, and for the Daily Shift always
    /// the day's city event.
    private func shiftConfig(seed: UInt64) -> Config {
        switch save.mode {
        case .unlimited:
            // The same level for everyone; the upgrades and the roundabout as built.
            var career = save.career
            career.level = config.endlessLevel
            var endless = career.config(from: config, seed: seed, weather: forcedWeather, event: forcedEvent)
            endless.endless = true
            return endless
        case .mayhem:
            var career = save.career
            career.level = config.mayhemLevel
            return career.config(from: config, seed: seed, weather: forcedWeather, event: forcedEvent).forMayhem()
        case .shift:
            break
        }
        let dailyEvent = dailySelected ? Career.dailyEvent(day: today) : nil
        return save.career.config(from: config, seed: seed, weather: forcedWeather, event: forcedEvent ?? dailyEvent)
    }

    public func setLevel(_ level: Int) {
        save.career.level = max(1, level)
        store.save(save)
        refreshWaitingShift()
    }

    /// The shift waiting for its first tap is rebuilt after a purchase or a level jump, so it
    /// already has what was just bought. Same seed, same traffic on the road — unless the
    /// roundabout itself changed, then it starts over on the new one.
    private func refreshWaitingShift() {
        guard world.shift.phase == .waiting else { return }
        playingLevel = save.career.level
        playingMode = save.mode
        let next = shiftConfig(seed: world.seed)
        if next.builtArmSlots == world.config.builtArmSlots {
            world = world.nextShift(config: next, seed: world.seed)
        } else {
            world = World(config: next, seed: world.seed, mode: .shift, startsOnFirstTap: true)
            resetScene()
        }
    }


    /// Buys the next step of an upgrade, or shows that it cannot be bought.
    private func buy(_ upgrade: Upgrade) {
        upgradePage.selected = upgrade
        guard let price = save.career.price(of: upgrade, config: config) else { return }
        let money = save.career.money
        guard save.career.buy(upgrade, config: config) else {
            upgradePage.denied = (upgrade, 0)
            play(sounds: [.denied], haptics: [])
            showNotice(Strings.Notice.notEnoughMoney(format.number(price)))
            return
        }
        let steps = save.career.steps(of: upgrade)
        upgradePage.purchase = (upgrade, steps - 1, 0)
        upgradePage.moneyBefore = money
        store.save(save)
        refreshWaitingShift()
        play(sounds: [.purchase], haptics: [.comboUp])
        showNotice(Strings.Notice.bought(Strings.Upgrades.name(upgrade), steps: steps, of: upgrade.maxSteps))
    }

    /// Builds the part that is waiting on the ring, or shows that it cannot be paid for.
    private func buildPart() {
        guard let pending = builderPage.pending else { return }
        guard let price = StreetBuilderPage.price(of: pending.part, career: save.career, config: config) else { return }
        let money = save.career.money
        if let module = pending.part.module {
            buildModule(module, pending: pending, price: price, money: money)
            return
        }
        guard save.career.buildArm(inSlot: pending.slot, config: config) else {
            builderPage.denied = 0.001
            play(sounds: [.denied], haptics: [])
            showNotice(Strings.Notice.notEnoughMoney(format.number(price)))
            return
        }
        builderPage.pending = nil
        builderPage.removing = 0
        builderPage.built = (pending.slot, 0)
        builderPage.moneyBefore = money
        store.save(save)
        // The roundabout itself is different now, so the waiting shift starts over on it.
        refreshWaitingShift()
        play(sounds: [.build], haptics: [.comboUp])
        showNotice(Strings.Notice.built(Strings.Builder.name(pending.part), arms: save.career.armSlots.count))
    }

    /// A module goes onto its slot on the ring; a module already there is swapped (M9).
    private func buildModule(_ module: RoadModule, pending: (part: StreetBuilderPage.Part, slot: Int), price: Int, money: Int) {
        guard save.career.build(module, inSlot: pending.slot, config: config) else {
            builderPage.denied = 0.001
            play(sounds: [.denied], haptics: [])
            showNotice(Strings.Notice.notEnoughMoney(format.number(price)))
            return
        }
        builderPage.pending = nil
        builderPage.removing = 0
        builderPage.builtModule = (pending.slot, 0)
        builderPage.moneyBefore = money
        store.save(save)
        refreshWaitingShift()
        play(sounds: [.build], haptics: [.comboUp])
        showNotice(Strings.Notice.placed(Strings.Builder.name(pending.part)))
    }

    /// A press on the Street Builder: on a palette card it picks the part up, on the part
    /// waiting on the ring it builds it (second tap) or takes it away (single tap).
    private func builderPress(at point: Vec2) {
        let inset = tabInset
        if let part = StreetBuilderPage.card(at: point, viewport: lastViewport, bottomInset: inset) {
            perform(.pickUpPart(part))
            builderPage.dragging = (part, point)
            return
        }
        let map = StreetBuilderPage.map(viewport: lastViewport, bottomInset: inset)
        let slots = config.armSlotCount
        if let pending = builderPage.pending,
           (pending.part.module == nil
               ? StreetBuilderPage.slot(at: point, slots: slots, map: map)
               : StreetBuilderPage.moduleSlot(at: point, count: config.moduleSlotCount, map: map)) == pending.slot {
            if lastPartTap <= Self.doubleTapWindow {
                lastPartTap = .infinity
                perform(.buildPart)
            } else {
                // It starts to go; a second tap in time builds it instead.
                lastPartTap = 0
                builderPage.removing = 0.001
            }
            return
        }
        // A built part: the first tap marks it, a second one tears it down (Leo, 25.09.2026).
        guard let part = StreetBuilderPage.builtPart(at: point, career: save.career, config: config, map: map) else {
            builderPage.marked = nil
            return
        }
        if builderPage.marked?.part == part {
            tearDown(part)
            return
        }
        if case let .arm(slot) = part, !save.career.canRemoveArm(inSlot: slot) {
            builderPage.denied = 0.001
            play(sounds: [.denied], haptics: [])
            showNotice(Strings.Builder.keepsArms(Career.minimumArms))
            return
        }
        builderPage.marked = (part, 0)
        play(sounds: [.uiTick], haptics: [])
        showNotice(Strings.Builder.tapAgainToRemove)
    }

    /// Tears a built part down. Nothing is paid back (`Career.removeArm`, `removeModule`).
    private func tearDown(_ part: StreetBuilderPage.Built) {
        builderPage.marked = nil
        let name: String
        switch part {
        case let .arm(slot):
            guard save.career.removeArm(inSlot: slot) else { return }
            builderPage.tornDown = (part, nil, 0)
            name = Strings.Builder.name(.arm)
        case let .module(slot):
            guard let module = save.career.modules[slot] else { return }
            save.career.removeModule(inSlot: slot)
            builderPage.tornDown = (part, module, 0)
            name = StreetBuilderPage.Part(rawValue: module.rawValue).map(Strings.Builder.name) ?? ""
        }
        store.save(save)
        // The roundabout itself is different now, so the waiting shift starts over on it.
        refreshWaitingShift()
        play(sounds: [.swoosh], haptics: [.comboUp])
        showNotice(Strings.Notice.removed(name))
    }

    /// The tab bar's height, where it shows.
    private var tabInset: Double {
        options.drawsMenus && screen.showsTabBar ? TabStrip.height : 0
    }

    /// A tap on a card: the first one opens the details, a second one right after buys.
    /// The upgrades the Upgrades tab offers at the player's level (M7: insurances from level 20).
    public var visibleUpgrades: [Upgrade] {
        Upgrade.available(atLevel: save.career.level, config: config)
    }

    /// Test window (`--chest-preview`): plays a chest opening of this rarity on the Shop tab
    /// without touching the save game.
    public func previewChestOpening(_ rarity: Rarity) {
        guard let item = Cosmetics.all.last(where: { $0.rarity == rarity }) else { return }
        screen = .page(.shop)
        shopPage.opening = (ChestOpening(chest: rarity >= .epic ? .premium : .standard, item: item, isDuplicate: false, money: 0), 0)
    }

    /// Asks for a rewarded ad: the app's, or the placeholder. No Ads pays at once.
    private func showAd(for reward: AdReward) {
        guard save.career.adsLeft(reward, day: today, config: config) > 0, shopPage.ad == nil else {
            play(sounds: [.denied], haptics: [])
            showNotice(reward == .cash ? Strings.Store.noCashAdsLeft : Strings.Shop.noAdsLeft)
            return
        }
        if save.career.skipsAds {
            adWatched(reward)
        } else if let adProvider {
            adProvider.showRewardedAd { [weak self] watched in
                if watched {
                    self?.adWatched(reward)
                } else {
                    self?.showNotice(Strings.Shop.adNotReady)
                }
            }
        } else {
            // Test window: a placeholder ad that runs a few seconds.
            shopPage.ad = 0
            shopPage.adReward = reward
        }
    }

    /// A rewarded ad was watched to the end: a Standard chest.
    public func adWatched() {
        adWatched(.chest)
    }

    /// A rewarded ad was watched to the end (or skipped with No Ads): its reward.
    public func adWatched(_ reward: AdReward) {
        guard let cash = save.career.rewardAd(reward, day: today, config: config) else { return }
        store.save(save)
        shopPage.ad = nil
        play(sounds: [.purchase], haptics: [.paid])
        switch reward {
        case .chest:
            shopPage.selectedChest = .standard
            showNotice(save.career.skipsAds ? Strings.Store.chestNoAd : Strings.Shop.adReward)
        case .cash:
            showNotice(save.career.skipsAds ? Strings.Store.cashNoAd(format.number(cash)) : Strings.Store.cashAdReward(format.number(cash)))
        }
    }

    /// A purchase went through: the goods, saved at once.
    public func purchased(_ product: StoreProduct) {
        shopPage.purchase = nil
        guard save.career.applyPurchase(product, config: config) else { return }
        store.save(save)
        play(sounds: [.purchase], haptics: [.paid])
        showNotice(Strings.Store.bought(product))
        // What changes the shifts (Cash Boost) counts from the next one waiting.
        if product == .cashBoost { refreshWaitingShift() }
    }

    /// The App Store's answer to Restore Purchases.
    public func restored(_ products: [StoreProduct]) {
        let new = save.career.restorePurchases(products)
        store.save(save)
        showNotice(Strings.Store.restored(new.count))
        if new.contains(.cashBoost) { refreshWaitingShift() }
    }

    /// The price to show: the App Store's once it is known, the placeholder until then.
    public func price(of product: StoreProduct) -> String {
        purchaser?.price(of: product) ?? product.placeholderPrice
    }

    /// A tap on the Shop page. Tapping a selected chest again opens one; tapping an owned
    /// item again wears it — like the double tap on an upgrade.
    /// The shelf on screen is being left: what was new on it has been seen.
    private func leaveShelf() {
        guard screen == .page(.shop), shopPage.section == .collection else { return }
        let shown = shopPage.shelf.items.map(\.id).filter(save.career.unseen.contains)
        guard !shown.isEmpty else { return }
        save.career.markSeen(shown)
        store.save(save)
    }

    private func tapShop(_ target: ShopPage.Target) {
        // It gives way under the finger the moment it is touched.
        if target != .dismiss, !reduceMotion { shopPage.pressed = (target, 0) }
        switch target {
        case let .section(section):
            if shopPage.section != section { tick() }
            if section != .collection { leaveShelf() }
            shopPage.select(section)
        case let .shelf(shelf):
            if shopPage.shelf != shelf {
                tick()
                leaveShelf()
            }
            shopPage.selectShelf(shelf)
        case let .chest(kind):
            if shopPage.selectedChest == kind, save.career.count(of: kind) > 0 {
                tapShop(.open(kind))
            } else if shopPage.selectedChest != kind {
                tick()
            }
            shopPage.selectedChest = kind
        case let .open(kind):
            guard let index = save.career.chests.firstIndex(of: kind) else { return }
            perform(.openChest(index))
        case let .buy(kind):
            perform(.buyChest(kind))
        case .watchAd:
            perform(.watchAd)
        case let .item(id):
            if save.career.unseen.contains(id) {
                save.career.markSeen([id])
                store.save(save)
            }
            if shopPage.selectedItem == id, save.career.owns(id) {
                perform(.wear(id))
            } else if shopPage.selectedItem != id {
                tick()
            }
            shopPage.selectedItem = id
        case let .wear(id):
            perform(.wear(id))
        case let .offer(offer):
            // Tapping the chosen offer again buys it (or watches its ad), like a chest.
            if shopPage.selectedOffer == offer {
                switch offer {
                case let .product(product): perform(.purchase(product))
                case .freeCash: perform(.watchCashAd)
                }
            } else {
                tick()
            }
            shopPage.selectedOffer = offer
        case let .purchase(product):
            perform(.purchase(product))
        case .watchCashAd:
            perform(.watchCashAd)
        case .restore:
            perform(.restorePurchases)
        case .dismiss:
            // A tap during the build-up skips to the burst; after it, it closes.
            if let opening = shopPage.opening, opening.age < ShopPage.burstTime {
                shopPage.opening = (opening.opening, ShopPage.burstTime - 0.001)
            } else {
                shopPage.opening = nil
            }
        }
    }

    private func tapUpgrade(_ upgrade: Upgrade) {
        if let last = lastCardTap, last.upgrade == upgrade, last.age <= Self.doubleTapWindow {
            lastCardTap = nil
            perform(.buy(upgrade))
        } else {
            lastCardTap = (upgrade, 0)
            perform(.selectUpgrade(upgrade))
        }
    }

    private func resetScene() {
        clock.reset()
        markers.removeAll()
        effects = CrashEffects(seed: world.seed)
        popups.removeAll()
        pendingSummary = nil
    }

    // MARK: - Frame

    /// Advances by one display frame.
    /// - Parameters:
    ///   - delta: real time since the last frame, in seconds.
    ///   - actions: input since the last frame.
    ///   - viewport: drawing area in points.
    public func frame(delta: Double, actions: [InputAction], viewport: Vec2, fps: Int) -> Frame {
        let realDelta = min(max(delta, 0), Self.maxFrameDelta)
        let simDelta = realDelta * timeScale
        // An interrupted shift stands still, and counts back in before it runs again.
        if countIn > 0 {
            countIn = max(0, countIn - realDelta)
        }
        let runs = !isInterrupted && countIn == 0
        if runs {
            clock.add(simDelta)
            sceneTime += simDelta
        }
        keepDailyInStep()
        let present = world.time + clock.accumulator
        for action in actions {
            handle(action, present: present, simDelta: simDelta)
        }

        var events: [GameEvent] = []
        if runs {
            while clock.takeStep() {
                world.step()
                events += world.takeEvents()
            }
            react(to: events)
            age(by: simDelta)
            lamps.update(world: world, delta: simDelta)
        }
        if case let .result(summary) = screen {
            resultAge += realDelta
            // The counted money lands with a "ka-ching".
            if !moneyLanded, summary.result.money > 0, resultAge >= ResultBanner.countDelay + ResultBanner.countDuration {
                moneyLanded = true
                play(sounds: [.purchase], haptics: [.paid])
            }
        }
        sinceTakedown += realDelta
        sinceFatalCrash += realDelta
        sinceLoss += realDelta
        // After a lost shift the camera steps back a little, until the next shift waits or runs.
        let lossShown: Bool
        switch screen {
        case .playing: lossShown = pendingSummary.map { $0.result.outcome != .completed } ?? false
        case let .result(summary): lossShown = summary.result.outcome != .completed && ResultBanner.settled(age: resultAge) < 0.5
        default: lossShown = false
        }
        let pullTarget = lossShown && !reduceMotion ? 1.0 : 0
        lossPull += (pullTarget - lossPull) * min(1, realDelta / 0.3)
        // Mayhem's flames count up and bump with every crash.
        sinceFlames += realDelta
        let flames = Double(world.score.flames)
        shownFlames = reduceMotion || abs(flames - shownFlames) < 1 ? flames : shownFlames + (flames - shownFlames) * min(1, realDelta / Self.scoreCatchUp)
        sinceComboTier += realDelta
        sinceCarSent += realDelta
        sinceStrike += realDelta
        sincePoliceCrash += realDelta
        // Only going the counting way pops: a new shift refills without a bump.
        let counts = (carsSent: world.shift.carsSent, strikes: world.score.strikes, policeCrashes: world.score.policeCrashes)
        if counts.carsSent > seenCounts.carsSent {
            sinceCarSent = 0
            // In the flow, the city answers every car (`CityPulse.beat`).
            if screen == .playing { cityPulse.beat(flow: flowLevel) }
            // A split for the race against the best time at this level.
            if screen == .playing, playingMode == .shift, let start = world.shift.startedAt {
                splits.append(world.time - start)
                if let best = save.career.bestTimes(atLevel: playingLevel), best.indices.contains(splits.count - 1) {
                    raceDelta = splits[splits.count - 1] - best[splits.count - 1]
                }
            }
        }
        if let splash = dailySplash, screen == .ready {
            dailySplash = splash + realDelta < ReadyBanner.splashDuration ? splash + realDelta : nil
        }
        if counts.strikes > seenCounts.strikes {
            sinceStrike = 0
            rim.signal(.flush, .destructive)
        }
        if counts.policeCrashes > seenCounts.policeCrashes {
            sincePoliceCrash = 0
            rim.signal(.flush, .lightBlue)
        }
        seenCounts = counts
        let flowTarget = screen == .playing && world.isInFlow ? 1.0 : 0.0
        flowLevel += (flowTarget - flowLevel) * min(1, realDelta / Self.flowFade)
        followRim()
        rim.age(by: realDelta)
        cityPulse.advance(by: runs ? simDelta : 0, target: CityPulse.energy(world: world, flow: flowLevel))
        let recedeTarget = screen == .page(.upgrades) ? 1.0 : 0.0
        recede += (recedeTarget - recede) * min(1, realDelta / 0.25)
        // The score catches up with itself: it counts, never jumps (FOUNDATION.md 3).
        let points = Double(world.score.points)
        if abs(points - shownScore) < 1 || reduceMotion {
            shownScore = points
        } else {
            shownScore += (points - shownScore) * min(1, realDelta / Self.scoreCatchUp)
        }
        // The money counts up the same way, and bumps when it grows.
        let money = Double(max(0, shiftStartMoney + world.score.money))
        if money > shownMoney + 0.5 { sinceMoney = min(sinceMoney, 0) }
        sinceMoney += realDelta
        if abs(money - shownMoney) < 1 || reduceMotion {
            shownMoney = money
        } else {
            shownMoney += (money - shownMoney) * min(1, realDelta / Self.scoreCatchUp)
        }
        sinceReady = screen == .ready ? sinceReady + realDelta : 0
        tutorial?.age(by: realDelta)
        if tutorial?.isDone == true { tutorial = nil }
        transition?.age += realDelta
        if transition?.isDone == true { transition = nil }
        if screen == .page(.upgrades) {
            upgradePage.age(by: realDelta)
        } else {
            upgradePage = UpgradePage.State()
        }
        if screen == .page(.shop) {
            let before = shopPage.opening?.age
            shopPage.age(by: realDelta)
            // The burst is felt and heard the moment it happens.
            if let before, let after = shopPage.opening?.age, before < ShopPage.burstTime, after >= ShopPage.burstTime {
                let rare = (shopPage.opening?.opening.item.rarity ?? .common) >= .epic
                play(sounds: [rare ? .chestBurstRare : .chestBurst], haptics: [.chest])
            }
            if let ad = shopPage.ad, ad >= ShopPage.adDuration {
                adWatched(shopPage.adReward)
            }
            if let purchase = shopPage.purchase, purchase.age >= ShopPage.purchaseDuration {
                purchased(purchase.product)
            }
        } else {
            // A placeholder purchase is never lost to a tab switch.
            if let purchase = shopPage.purchase { purchased(purchase.product) }
            shopPage = ShopPage.State()
        }
        if screen == .page(.progress) {
            progressPage.age(by: realDelta)
        } else if progressPage != ProgressPage.State() {
            progressPage = ProgressPage.State()
        }
        if var slide = buildSlide {
            slide.age += realDelta
            buildSlide = slide.age < BuildTab.glide ? slide : nil
        }
        followModePan(realDelta)
        if let banner = modeBanner {
            modeBanner = banner.age + realDelta < ModeBanner.duration ? (banner.mode, banner.age + realDelta) : nil
        }
        if screen == .page(.streetBuilder) {
            builderPage.age(by: realDelta)
            lastPartTap += realDelta
            // A part that was tapped away is gone once it has faded out.
            if builderPage.removing > StreetBuilderPage.removeDuration {
                perform(.removePart)
            }
        } else {
            builderPage = StreetBuilderPage.State()
            lastPartTap = .infinity
        }
        if var last = lastCardTap {
            last.age += realDelta
            lastCardTap = last.age <= Self.doubleTapWindow ? last : nil
        }
        if let current = notice {
            notice = current.age + realDelta < Self.noticeDuration ? (current.text, current.age + realDelta) : nil
        }
        return Frame(renderList: renderList(viewport: viewport, fps: fps, delta: realDelta), events: events, screen: screen)
    }

    /// The rim counts the shift on the road. A finished shift's ticks stay a moment into the
    /// result before the next shift's come in (`RingSignals.hold`).
    private func followRim() {
        if case .result = screen, resultAge < RingSignals.hold { return }
        guard let left = world.carsLeft else {
            rim.follow(total: 0, sent: 0, lit: .primary)
            return
        }
        let total = world.config.shiftCars
        rim.follow(total: total, sent: max(0, total - left), lit: world.shift.isRushHour ? .accent : .primary)
    }

    private func handle(_ action: InputAction, present: Double, simDelta: Double) {
        switch action {
        case .tap:
            switch screen {
            case .playing:
                // A lost shift: one tap and the next try is on, without waiting for the result.
                // Its first car is still rolling up: the tap is held for it (`PlayerQueue`).
                if let summary = pendingSummary, summary.result.outcome != .completed, sinceLoss >= Self.restartLock {
                    sinceFatalCrash = .infinity
                    prepareShift(continuing: true)
                    startPlaying()
                }
                // Input is polled once per frame; the press happened on average half a frame ago.
                world.tap(at: max(world.time, present - simDelta / 2))
            case .ready:
                // No start menu: the next shift is already on the road, and the first tap
                // sends its front car. Not while the map slides to another mode.
                guard modeTravel == nil, abs(modePan) < Self.swipeThreshold else { return }
                startPlaying()
                world.tap(at: max(world.time, present - simDelta / 2))
            case .result:
                // One tap anywhere: the first car of the next shift. Not in the very first
                // moment, so a tap meant for the last car does not skip the result.
                if resultAge >= ResultBanner.inputLock, modeTravel == nil, abs(modePan) < Self.swipeThreshold {
                    startPlaying()
                    world.tap(at: max(world.time, present - simDelta / 2))
                }
            case .settings, .page:
                // Menus and pages take no taps; they have their items.
                break
            }
        case .confirm:
            switch screen {
            case .ready, .result:
                startPlaying()
                world.tap(at: max(world.time, present - simDelta / 2))
            // Enter buys the upgrade whose details are open.
            case .page(.upgrades):
                if let upgrade = upgradePage.selected { perform(.buy(upgrade)) }
            default:
                if let primary = content?.items.first(where: \.isPrimary) {
                    perform(primary.action)
                }
            }
        case .back:
            switch screen {
            // A shift runs to its end: there is no pause screen to open.
            case .playing: break
            case .settings: perform(.closeSettings)
            case .ready: perform(.openSettings)
            case .result, .page: perform(.showTab(.game))
            }
        case let .choose(number):
            // On the Upgrades tab the numbers pick a card, like a tap on it.
            if screen == .page(.upgrades), visibleUpgrades.indices.contains(number - 1) {
                tapUpgrade(visibleUpgrades[number - 1])
            } else if let items = content?.items, items.indices.contains(number - 1) {
                perform(items[number - 1].action)
            }
        case .restart:
            switch screen {
            case .playing, .result: perform(.restart)
            case .ready, .settings, .page: break
            }
        case let .tapUpgrade(upgrade):
            guard screen == .page(.upgrades) else { return }
            tapUpgrade(upgrade)
        case let .tapShop(target):
            guard screen == .page(.shop) else { return }
            tapShop(target)
        case let .tapProgress(target):
            guard screen == .page(.progress) else { return }
            switch target {
            case let .section(section):
                if progressPage.section != section { tick() }
                progressPage.select(section)
            }
        case let .pointerDown(point):
            // On the Game tab a touch is a tap, or the start of a swipe to another mode. The
            // tap then counts when the finger lifts. During the tutorial it counts at once.
            if screen == .ready || isShowingResult {
                // While the map travels to the next mode a touch waits for it.
                if modeTravel != nil { return }
                if takesModeSwipe {
                    // Caught while it springs back: it stays under the finger.
                    modeDrag = (Vec2(point.x - modePan, point.y), modePan)
                } else {
                    handle(.tap, present: present, simDelta: simDelta)
                }
                return
            }
            guard screen == .page(.streetBuilder) else { return }
            builderPress(at: point)
        case let .pointerMove(point):
            if var drag = modeDrag {
                drag.offset = point.x - drag.start.x
                modeDrag = drag
                return
            }
            guard screen == .page(.streetBuilder), builderPage.dragging != nil else { return }
            builderPage.dragging?.at = point
            let map = StreetBuilderPage.map(viewport: lastViewport, bottomInset: tabInset)
            if let part = builderPage.dragging?.part {
                builderPage.target = StreetBuilderPage.target(for: part, at: point, career: save.career, config: config, map: map)
            }
        case let .pointerUp(point):
            if let drag = modeDrag {
                modeDrag = nil
                let offset = point.x - drag.start.x
                // Where the throw would carry the map: a quick flick counts like a long drag.
                let projected = offset + modePanVelocity * 0.18
                if abs(offset) < Self.swipeThreshold && abs(modePanVelocity) < 400 && abs(modePan) < Self.swipeThreshold {
                    handle(.tap, present: present, simDelta: simDelta)
                } else if abs(projected) > lastViewport.x * 0.22 {
                    handle(.swipeMode(projected < 0 ? 1 : -1), present: present, simDelta: simDelta)
                }
                // Otherwise it springs back into place (`followModePan`).
                return
            }
            guard screen == .page(.streetBuilder), builderPage.dragging != nil else { return }
            let map = StreetBuilderPage.map(viewport: lastViewport, bottomInset: tabInset)
            if let part = builderPage.dragging?.part,
               let slot = StreetBuilderPage.target(for: part, at: point, career: save.career, config: config, map: map) {
                perform(.placePart(slot: slot))
            } else {
                builderPage.dragging = nil
                builderPage.target = nil
            }
        case let .swipeMode(step):
            let modes = GameMode.allCases
            let index = (modes.firstIndex(of: gameMode) ?? 0) + step
            guard tutorial?.isOver != false, modeTravel == nil, world.shift.phase == .waiting,
                  screen == .ready || isShowingResult, modes.indices.contains(index) else { return }
            if reduceMotion {
                perform(.setGameMode(modes[index]))
            } else {
                // The map slides on: the old roundabout out, then the new one in.
                modeTravel = (modes[index], Double(step))
                play(sounds: [.swoosh], haptics: [])
            }
        case let .selectTab(tab):
            // The Build tab opens on the page it was left on; on it, its tab does nothing.
            if tab == .upgrades {
                guard !Tab.build.contains(screen.tab) else { return }
                perform(.showTab(buildPage))
            } else {
                perform(.showTab(tab))
            }
        case .nextTab:
            // Every page in tab-bar order, the Build tab's two one after the other.
            let pages = Tab.bar.flatMap { $0 == .upgrades ? Tab.build : [$0] }
            let index = pages.firstIndex(of: screen.tab) ?? 0
            perform(.showTab(pages[(index + 1) % pages.count]))
        case .toggleDebug:
            isDebugVisible.toggle()
        case .dispatch:
            if screen == .playing {
                world.dispatchPolice()
            }
        case .cycleSlowMotion:
            slowMotionLevel = (slowMotionLevel + 1) % Self.slowMotionScales.count
        case .focusLost:
            // No menu: the world simply stands still until the player is back.
            if screen == .playing { isInterrupted = true }
        case .focusGained:
            if isInterrupted {
                isInterrupted = false
                countIn = reduceMotion ? 0 : Self.countInSeconds
            }
        case let .perform(screenAction):
            perform(screenAction)
        }
    }

    /// Popups, debug markers, sound, haptics and the end of the shift.
    private func react(to events: [GameEvent]) {
        for event in events {
            tutorial?.react(to: event)
            switch event {
            case let .merged(report):
                markers.append(DebugMarker(kind: .merge(gap: report.minGap), position: report.position, age: 0))
                switch report.rating {
                case .tightFit: addPopup(.tightFit, at: report.position)
                case .nearMiss: addPopup(.nearMiss, at: report.position)
                case .perfect: addPopup(.perfect, at: report.position)
                case .cutOff: addPopup(.cutOff, at: report.position)
                case .clean: break
                }
            case let .crash(report):
                markers.append(DebugMarker(kind: .crash, position: report.point, age: 0))
                effects.spawn(for: report, in: world, reduceMotion: reduceMotion, boost: report.chain)
                if report.flames > 0 {
                    // Mayhem: the flames at the wreck, and chains go off like fireworks.
                    addPopup(.flames(report.flames, chain: report.chain), at: report.point)
                    sinceFlames = 0
                    if report.chain >= 2 {
                        play(sounds: [report.chain >= 4 ? .chestBurstRare : .chestBurst], haptics: [.chest])
                    }
                }
                if report.penalty > 0 {
                    addPopup(.penalty(report.penalty), at: report.point)
                }
                if report.cost > 0 {
                    addPopup(.cost(report.cost), at: report.point + Vec2(0, 18))
                } else if report.covered > 0 {
                    addPopup(.covered, at: report.point + Vec2(0, 18))
                }
            case let .comboChanged(change):
                if change.isTierUp {
                    sinceComboTier = 0
                    rim.signal(.wave, .accent)
                }
            case let .shiftEnded(result):
                // The ring says how it went before the top card does.
                switch result.outcome {
                case .completed: rim.signal(.sweep, .accent)
                case .struckOut:
                    rim.signal(.flush, .destructive)
                    sinceFatalCrash = 0
                    sinceLoss = 0
                case .escaped:
                    rim.signal(.flush, .vehicleCriminal)
                    sinceLoss = 0
                }
                finish(result)
            case let .takedown(report):
                addPopup(.busted(report.points), at: report.point)
                sinceTakedown = 0
                rim.signal(.wave, .lightBlue)
            case .dispatched:
                addPopup(.dispatch, at: world.layout.stopPose(world.layout.player).position)
            case .rushHour:
                rim.signal(.sweep, .accent)
            case .launched, .tapRejected, .exited, .criminalWarning, .criminalEntered, .criminalEscaped, .criminalWrecked:
                break
            case .transporterWarning:
                break
            case .transporterEntered:
                break
            case let .transporterSeized(vehicle, police, point, time):
                markers.append(DebugMarker(kind: .crash, position: point, age: 0))
                addPopup(.seized, at: point)
            case let .transporterLost(_, point, _):
                addPopup(.lost, at: point)
            case .transporterEscaped:
                break
            case let .transporterPaid(vehicle, amount, time):
                if amount > 0 {
                    addPopup(.paid(amount), at: world.layout.stopPose(world.layout.player).position)
                    rim.signal(.wave, .vehicleCargo)
                }
            case let .modulePaid(module, _, amount, point, _):
                // Right where it was earned, so it is clear which module pays.
                addPopup(.modulePulse(module == .speedCamera ? .lightBlue : .hazard), at: point)
                addPopup(.earned(amount), at: point)
            case let .towed(_, slot, _):
                addPopup(.modulePulse(.hazard), at: SceneBuilder.towYard(slot, layout: world.layout, config: world.config))
            case .flowChanged:
                // The glow follows `world.isInFlow` smoothly (`flowLevel`).
                break
            }
        }
        guard screen == .playing else { return }
        let cues = Feedback.cues(for: events)
        play(sounds: cues.sounds, haptics: cues.haptics)
    }

    /// Leaves the waiting banner or the result: the shift is on, with a short "go".
    private func startPlaying() {
        screen = .playing
        shiftStartMoney = save.career.money
        shownMoney = Double(shiftStartMoney)
        sinceMoney = .infinity
        dailySplash = nil
        play(sounds: [.go], haptics: [])
        // The Daily Shift is taken the moment it starts: one try, and the streak counts it.
        if playingDaily {
            let milestone = save.career.startDaily(day: today)
            gameServices?.submit(save.career.dailyStreak, to: .dailyStreak)
            var toasts: [String] = []
            if let milestone {
                toasts.append(Strings.Daily.milestone(days: save.career.dailyStreak, item: milestone.id))
                gameServices?.unlock(Achievements.streak(days: save.career.dailyStreak))
                toasts += completeAlbums()
            }
            store.save(save)
            if !toasts.isEmpty { showNotice(toasts.joined(separator: "  ·  ")) }
        }
    }

    /// The daily state of the waiting shift follows the day: today's Daily Shift while it
    /// is open, a normal shift after — also across midnight or when the platform sets `today`.
    private func keepDailyInStep() {
        guard world.shift.phase == .waiting, screen != .playing else { return }
        let wanted = wantsDaily
        if wanted != dailySelected { prepareShift(continuing: true, screen: screen) }
    }

    /// Pays albums the collection just completed; returns their toasts.
    private func completeAlbums() -> [String] {
        save.career.completeAlbums().map { album in
            gameServices?.unlock(Achievements.album(album))
            return Strings.Albums.complete(album, reward: format.number(album.reward))
        }
    }

    /// The small tick of a tab, a card or a switch.
    private func tick() {
        play(sounds: [.uiTick], haptics: [])
    }

    /// Sound and haptics, as far as the settings allow.
    private func play(sounds: [SoundID], haptics feedback: [HapticID]) {
        if save.settings.sound, let audio {
            for sound in sounds {
                soundSerial += 1
                audio.play(sound, pitch: Feedback.pitch(for: sound, combo: world.score.combo, serial: soundSerial))
            }
        }
        if save.settings.haptics, let haptics {
            // In the flow the merges are felt deeper and softer.
            let flow = screen == .playing ? flowLevel : 0
            for haptic in feedback {
                haptics.play(haptic, softness: Feedback.softness(of: haptic, flow: flow))
            }
        }
    }

    /// Saves right away, so a highscore survives even if the app is closed in the next second;
    /// the result screen follows after `resultDelay`.
    private func finish(_ result: ShiftResult) {
        if playingMode == .mayhem {
            finishMayhem(result)
            return
        }
        // Unlimited keeps its own best: every run ends lost, the best one counts.
        let unlimited = playingMode == .unlimited
        let previous = unlimited ? save.unlimitedBest : save.highscore
        let isNew = (unlimited || result.outcome == .completed) && result.score > previous
        if isNew, unlimited {
            save.unlimitedBest = result.score
        } else if isNew {
            save.highscore = result.score
            save.highscoreSeed = result.seed
        }
        if unlimited {
            save.unlimitedBestCars = max(save.unlimitedBestCars, result.carsSent)
            gameServices?.submit(result.score, to: .unlimited)
        }
        save.shiftsPlayed += 1
        // The first shift is over, and with it the tutorial; only a strike hint that is
        // showing runs out (the crash that ended it says why).
        if tutorial != nil {
            tutorial?.end()
            if tutorial?.isDone == true { tutorial = nil }
            save.tutorialDone = true
        }
        // Money is banked whatever the outcome; done is a level up, lost is the same level again.
        let bankBefore = save.career.money
        save.career.record(result, playedAt: playingLevel)
        resultBank = (bankBefore, save.career.money)
        // Mastery runs in the background; a reached goal is a short toast and a chest (M10).
        var toasts: [String] = []
        if result.isPerfectRun {
            toasts.append(Strings.Daily.perfectRun)
        }
        // Daily Shift and Challenges (v1.2).
        if playingDaily, result.outcome == .completed, let pay = save.career.completeDaily(day: today, config: config) {
            toasts.append(Strings.Daily.dailyDone(format.number(pay), streak: save.career.dailyStreak))
        } else if !playingDaily, save.career.rollEventChest(result, config: world.config) {
            // A city event may leave an Event Chest behind (Leo, 25.09.2026).
            toasts.append(Strings.Daily.eventChestFound)
        }
        dailySelected = false
        // The race against the best time at this level; the last car ends the shift in the
        // step it goes in, so its time is the shift's.
        if result.outcome == .completed {
            var times = splits
            if (times.last ?? -1) < result.time - 0.001 { times.append(result.time) }
            let hadBest = save.career.bestTimes(atLevel: playingLevel) != nil
            if save.career.recordTimes(times, atLevel: playingLevel), hadBest {
                toasts.append(Strings.Race.newBest)
            }
            gameServices?.submit(result.score, to: .highscore)
            gameServices?.submit(result.bestCombo, to: .bestCombo)
        }
        let challenges = save.career.recordChallenges(result, day: today)
        toasts += challenges.map { Strings.Daily.challengeDone($0, reward: format.number($0.reward)) }
        let completed = save.career.recordMastery(result)
        for completion in completed {
            gameServices?.unlock(Achievements.mastery(completion.goal, tier: completion.tier))
        }
        gameServices?.submit(save.career.level, to: .level)
        store.save(save)
        if !completed.isEmpty {
            toasts.append(Strings.Mastery.toast(completed))
        }
        if !toasts.isEmpty {
            showNotice(toasts.joined(separator: "  ·  "))
        }
        pendingSummary = ShiftSummary(result: result, level: playingLevel, isNewHighscore: isNew, previousHighscore: previous, mode: playingMode)
        resultCountdown = Self.resultDelay
    }

    /// Mayhem counts for nothing but itself (Leo, 26.09.2026): no money, no level, no
    /// stats, no challenges. Only its own best flames and chain.
    private func finishMayhem(_ result: ShiftResult) {
        let previous = save.mayhemBest
        let isNew = result.flames > previous
        if isNew { save.mayhemBest = result.flames }
        save.mayhemBestChain = max(save.mayhemBestChain, result.biggestChain)
        store.save(save)
        gameServices?.submit(result.flames, to: .mayhem)
        dailySelected = false
        resultBank = (save.career.money, save.career.money)
        pendingSummary = ShiftSummary(result: result, level: playingLevel, isNewHighscore: isNew, previousHighscore: previous, mode: .mayhem)
        resultCountdown = Self.resultDelay
    }

    /// The map's slide between two modes: it follows the finger, travels out and in, and
    /// settles on a spring that overshoots a little, so the new roundabout clicks in.
    private func followModePan(_ delta: Double) {
        guard screen == .ready || isShowingResult else {
            (modeDrag, modeTravel, modePan, modePanVelocity) = (nil, nil, 0, 0)
            return
        }
        let width = max(lastViewport.x, 1)
        if let drag = modeDrag {
            // Past the first or the last mode it only gives a little.
            let index = GameMode.allCases.firstIndex(of: gameMode) ?? 0
            let canGo = drag.offset < 0 ? index < GameMode.allCases.count - 1 : index > 0
            let pan = canGo ? drag.offset : drag.offset / 3
            if delta > 0 { modePanVelocity = 0.5 * modePanVelocity + 0.5 * (pan - modePan) / delta }
            modePan = pan
            return
        }
        let target = modeTravel.map { -$0.direction * width * 1.3 } ?? 0
        let omega = Self.panFrequency
        let steps = 4
        let dt = delta / Double(steps)
        for _ in 0..<steps {
            let acceleration = -omega * omega * (modePan - target) - 2 * Self.panDamping * omega * modePanVelocity
            modePanVelocity += acceleration * dt
            modePan += modePanVelocity * dt
        }
        // The old roundabout is out of the picture: the new one comes in from the other side.
        if let travel = modeTravel, -modePan * travel.direction >= width * 0.9 {
            modeTravel = nil
            perform(.setGameMode(travel.to))
            modePan += travel.direction * width * 1.8
            play(sounds: [], haptics: [.comboUp])
        }
        if modeTravel == nil, abs(modePan) < 0.3, abs(modePanVelocity) < 5 {
            (modePan, modePanVelocity) = (0, 0)
        }
    }

    private func addPopup(_ kind: Popup.Kind, at position: Vec2) {
        popupSerial += 1
        popups.append(Popup(serial: popupSerial, kind: kind, position: position))
    }

    private func age(by delta: Double) {
        for index in markers.indices {
            markers[index].age += delta
        }
        markers.removeAll { $0.age >= DebugMarker.lifetime }
        for index in popups.indices {
            popups[index].age += delta
        }
        popups.removeAll { $0.age >= Popup.lifetime }
        effects.update(delta, world: world, reduceMotion: reduceMotion)
        if let summary = pendingSummary {
            resultCountdown -= delta
            if resultCountdown <= 0 {
                resultAge = 0
                moneyLanded = false
                // Level up (or not), and the next shift rolls in behind the result.
                prepareShift(continuing: true, screen: .result(summary))
                play(sounds: [.swoosh], haptics: [])
            }
        }
    }

    // MARK: - Render list

    private func renderList(viewport: Vec2, fps: Int, delta: Double) -> RenderList {
        lastViewport = viewport
        // Every tab looks at the same city; the camera glides to the view it needs.
        var camera = cameraRig.camera(Perspective(screen), layout: world.layout, viewport: viewport, bottomInset: tabInset, delta: delta, reduceMotion: reduceMotion)
        // The crash shake moves the scene; the HUD (screen space) stays still. A swipe on the
        // Game tab slides the whole map sideways to the next mode's roundabout.
        camera.focus += effects.shakeOffset + Vec2(modePan, 0)
        camera.scale *= 1 - Self.lossPullBack * lossPull
        // The map skin sets the ground outside the ring and what grows in the city.
        let mapTheme = MapTheme(skin: forcedMapSkin ?? save.career.mapSkin)
        var list = RenderList(camera: camera, background: MapTheme.ground(mapTheme))
        CityLayer.add(world: world, theme: mapTheme, time: reduceMotion ? nil : sceneTime, pulse: reduceMotion ? nil : cityPulse, to: &list)
        SceneBuilder.addRoad(world.layout, config: world.config, to: &list)
        CityLayer.addMapSkin(Skins.color(forcedMapSkin ?? save.career.mapSkin), world: world, to: &list)
        MapTheme.addIsland(mapTheme, world: world, to: &list)
        CityLayer.addFrame(save.career.frame, world: world, to: &list)
        RingSignals.add(rim, layout: world.layout, reduceMotion: reduceMotion, to: &list)
        WeatherLayer.addCityEvent(world: world, to: &list)
        WeatherLayer.addGround(world: world, to: &list)
        effects.addGround(world: world, alpha: clock.alpha, softBody: !reduceMotion, to: &list)
        SceneBuilder.addShadows(of: world, alpha: clock.alpha, to: &list)
        SceneBuilder.addVehicles(of: world, alpha: clock.alpha, carSkins: save.career.carSkins, finishTime: reduceMotion ? nil : world.time, springTime: reduceMotion ? nil : world.time, lamps: lamps, to: &list)
        SceneBuilder.addTowTrucks(of: world, to: &list)
        if save.settings.vehicleLabels {
            SceneBuilder.addLabels(of: world, alpha: clock.alpha, to: &list)
        }
        effects.addAir(to: &list)
        WeatherLayer.addAir(world: world, time: world.time, reduceMotion: reduceMotion, to: &list)
        MapTheme.addAir(mapTheme, time: sceneTime, reduceMotion: reduceMotion, to: &list)
        Perspective.addRecede(opacity: recede, layout: world.layout, to: &list)

        // Everything from here to the tab strip belongs to the screen and moves with a change.
        let overlayStart = list.items.count
        switch screen {
        case .playing:
            HUD.addFlowGlow(world: world, flow: flowLevel, to: &list)
            HUD.addChase(world: world, alpha: clock.alpha, to: &list)
            HUD.addTransporter(world: world, alpha: clock.alpha, to: &list)
            HUD.add(
                world: world, level: playingLevel,
                score: Int(shownScore.rounded()),
                money: Int(shownMoney.rounded()),
                best: currentBest,
                comboPop: reduceMotion ? 0 : Ease.clamp01(sinceComboTier / Self.comboPop),
                race: raceDelta.map { ($0, reduceMotion ? 1 : Ease.clamp01(sinceCarSent / 0.35)) },
                pops: reduceMotion ? HUD.Pops() : HUD.Pops(
                    cars: Ease.clamp01(sinceCarSent / 0.35),
                    rushHour: world.shift.rushHourSince.map { Ease.clamp01((world.time - $0) / 0.5) } ?? 1,
                    strike: Ease.clamp01(sinceStrike / 0.5),
                    money: Ease.clamp01(sinceMoney / 0.35),
                    policeCrash: Ease.clamp01(sincePoliceCrash / 0.5)
                ),
                flames: Int(shownFlames.rounded()),
                flamePop: reduceMotion ? 1 : Ease.clamp01(sinceFlames / 0.35),
                format: format, showsKeys: options.showsKeyHints, timeScale: timeScale, to: &list
            )
            if let tutorial {
                Tutorial.add(tutorial, world: world, alpha: clock.alpha, time: sceneTime, reduceMotion: reduceMotion, to: &list)
            }
            HUD.addPopups(popups, format: format, reduceMotion: reduceMotion, to: &list)
            if countIn > 0 || isInterrupted {
                HUD.addCountIn(secondsLeft: isInterrupted ? Self.countInSeconds : countIn, to: &list)
            }
        case let .result(summary):
            ResultBanner.add(summary, nextLevel: playingLevel, bank: resultBank, age: resultAge, format: format, reduceMotion: reduceMotion, showsKeys: options.showsKeyHints, to: &list)
            // The first shift's strike hint may still be running out.
            if let tutorial {
                Tutorial.add(tutorial, world: world, alpha: clock.alpha, time: sceneTime, reduceMotion: reduceMotion, to: &list)
            }
            // After its epilogue the result turns into the next shift's waiting screen, in the
            // same card: no screen in between (Leo, 25.09.2026).
            let settled = ResultBanner.settled(age: resultAge)
            if settled > 0 {
                addReadyBanner(prompt: nil, drawsCard: false, opacity: settled, to: &list)
            }
        case .ready:
            addReadyBanner(prompt: tutorial?.isOver == false ? Tutorial.readyPrompt : Strings.Ready.tapToStart, to: &list)
            if let tutorial {
                Tutorial.add(tutorial, world: world, alpha: clock.alpha, time: sceneTime, reduceMotion: reduceMotion, to: &list)
            }
        case .settings, .page:
            break
        }
        if isDebugVisible {
            let stats = DebugStats(fps: fps, timeScale: timeScale, tuningChanges: Tuning.differences(config).count)
            DebugOverlay.add(world: world, alpha: clock.alpha, markers: markers, stats: stats, to: &list)
        }
        // The app has a native tab bar; the test window draws a strip at the bottom.
        let tabStrip = options.drawsMenus && screen.showsTabBar
        let bottomInset = tabStrip ? TabStrip.height : 0
        if options.drawsMenus, screen == .page(.streetBuilder) {
            // Its own page: the roundabout from above, with the parts to build.
            StreetBuilderPage.add(career: save.career, config: config, state: builderPage, format: format, reduceMotion: reduceMotion, showsKeys: options.showsKeyHints, bottomInset: bottomInset, segmentThumb: buildThumb, to: &list)
        } else if options.drawsMenus, screen == .page(.upgrades) {
            // Its own page: cards with a picture of what they do (FOUNDATION.md 3).
            UpgradePage.add(career: save.career, config: config, upgrades: visibleUpgrades, state: upgradePage, format: format, reduceMotion: reduceMotion, showsKeys: options.showsKeyHints, bottomInset: bottomInset, segmentThumb: buildThumb, to: &list)
        } else if options.drawsMenus, screen == .page(.shop) {
            // Its own page: chests, collection and the store (M10, MONETIZATION.md).
            let prices = Dictionary(uniqueKeysWithValues: StoreProduct.allCases.map { ($0, price(of: $0)) })
            ShopPage.add(career: save.career, config: config, today: today, state: shopPage, format: format, reduceMotion: reduceMotion, bottomInset: bottomInset, prices: prices, to: &list)
        } else if options.drawsMenus, screen == .page(.progress) {
            // Its own page: records, quests and achievements.
            ProgressPage.add(save: save, today: today, state: progressPage, format: format, reduceMotion: reduceMotion, bottomInset: bottomInset, to: &list)
        } else if options.drawsMenus, screen == .settings, let content {
            // Like an iOS settings sheet: switches, grouped rows (`SettingsPage`).
            SettingsPage.add(content, showsKeys: options.showsKeyHints, to: &list)
        } else if options.drawsMenus, let content {
            TextPage.add(content, showsKeys: options.showsKeyHints, bottomInset: bottomInset, to: &list)
        }
        applyTransition(to: &list, overlay: overlayStart..<list.items.count)
        if tabStrip {
            TabStrip.add(selected: screen.tab, career: save.career, to: &list)
        }
        if let notice {
            addNotice(notice.text, age: notice.age, bottomInset: bottomInset, to: &list)
        }
        return list
    }

    /// Where the Build tab's segment thumb stands: 0 on Upgrades, 1 on the Street Builder,
    /// gliding in between after a switch.
    private var buildThumb: Double {
        let target = Double(Tab.build.firstIndex(of: screen.tab) ?? 0)
        guard let slide = buildSlide, !reduceMotion else { return target }
        let from = Double(Tab.build.firstIndex(of: slide.from) ?? 0)
        return from + (target - from) * Ease.settle(slide.age / BuildTab.glide)
    }

    /// What a touch or click at `point` means on the chrome every platform shares: the tab
    /// strip, the Build tab's segments and the Progress tab. Nil where the platform decides
    /// (the Shop, the upgrade cards, the Street Builder's drags, the game itself).
    public func pageAction(at point: Vec2, viewport: Vec2) -> InputAction? {
        guard screen.showsTabBar else { return nil }
        if let tab = TabStrip.tab(at: point, viewport: viewport) { return .selectTab(tab) }
        let inset = options.drawsMenus ? TabStrip.height : 0
        switch screen {
        case .page(.upgrades), .page(.streetBuilder):
            return BuildTab.page(at: point, viewport: viewport).map { .perform(.showTab($0)) }
        case .ready, .result:
            // The top card is a way in (Leo, 26.09.2026): the money to the store, the cars
            // to the collection, the score and the best to the records. Not in the first
            // moment of a result, so a tap meant for the last car stays in the game.
            if case .result = screen, resultAge < ResultBanner.inputLock { return nil }
            guard let column = TopBar.column(at: point, width: viewport.x) else { return nil }
            // After its epilogue the result shows the next shift's cars in the middle.
            let showsCars = screen == .ready || ResultBanner.settled(age: resultAge) >= 0.5
            switch column {
            case .left: return .perform(.showShop(.store))
            case .center: return .perform(showsCars ? .showShop(.collection) : .showProgress(.records))
            case .right: return .perform(.showProgress(.records))
            }
        case .page(.progress):
            // The page takes every touch: a segment, or nothing.
            return .tapProgress(ProgressPage.target(at: point, viewport: viewport, bottomInset: inset) ?? .section(progressPage.section))
        default:
            return nil
        }
    }

    /// The next shift's waiting screen: its level, cars and duty, the best, what comes.
    /// The best to beat in the chosen mode, formatted; nil before the first.
    private var currentBest: String? {
        let best = switch playingMode {
        case .shift: save.highscore
        case .unlimited: save.unlimitedBest
        case .mayhem: save.mayhemBest
        }
        return best > 0 ? format.number(best) : nil
    }

    /// Whether a touch on the Game tab may become a swipe to another mode: while the next
    /// shift waits (not in the first moment of a result), and never in the tutorial.
    private var takesModeSwipe: Bool {
        guard world.shift.phase == .waiting, tutorial?.isOver != false else { return false }
        if isShowingResult { return resultAge >= ResultBanner.inputLock }
        return screen == .ready
    }

    private var isShowingResult: Bool {
        if case .result = screen { return true }
        return false
    }

    private func addReadyBanner(prompt: String?, drawsCard: Bool = true, opacity: Double = 1, to list: inout RenderList) {
        let career = save.career
        let conditions = Strings.Ready.conditions(weather: world.config.weather, event: world.config.cityEvent)
        let daily = dailySelected ? ReadyBanner.DailyCard(event: world.config.cityEvent, streak: career.dailyStreak, next: career.nextStreakMilestone(), splash: dailySplash) : nil
        ReadyBanner.add(level: playingLevel, cars: world.carsLeft ?? 0, highscore: currentBest, money: format.number(career.money), conditions: conditions, daily: daily, mode: playingMode, prompt: prompt, time: sinceReady, reduceMotion: reduceMotion, showsKeys: options.showsKeyHints && drawsCard, drawsCard: drawsCard, opacity: opacity, to: &list)
        // Which mode this roundabout is: a message that pops up after a swipe.
        if let banner = modeBanner {
            let top = TopBar.frame(width: list.camera.viewport.x).maxY + (daily != nil ? 40 : 14)
            ModeBanner.add(banner.mode, age: banner.age, top: top, reduceMotion: reduceMotion, to: &list)
        }
    }

    /// Starts a change when the screen differs from last frame's, then lets it move the new
    /// screen's items and lay the old ones underneath.
    private func applyTransition(to list: inout RenderList, overlay: Range<Int>) {
        let key = ScreenTransition.Key(screen)
        let drawn = Array(list.items[overlay])
        if let shownKey, shownKey != key {
            transition = ScreenTransition(from: shownKey, to: key, outgoing: shownOverlay)
        }
        shownKey = key
        shownOverlay = drawn
        transition?.apply(to: &list, incoming: overlay, reduceMotion: reduceMotion)
    }

    private func addNotice(_ text: String, age: Double, bottomInset: Double, to list: inout RenderList) {
        let viewport = list.camera.viewport
        // In: fades up and glides into place. Out: fades.
        let opacity = Ease.outCubic(age / 0.2) * (1 - Ease.clamp01((age - (Self.noticeDuration - 0.5)) / 0.5))
        let rise = reduceMotion ? 0 : (1 - Ease.settle(age / 0.4)) * 18
        let center = Vec2(viewport.x / 2, viewport.y - bottomInset - 64 + rise)
        let width = min(viewport.x - 24, Double(text.count) * 7 + 32)
        var id = RenderID.notice
        MenuKit.chromePill(center: center, size: Vec2(width, 30), opacity: opacity, id: &id, to: &list)
        list.add(.text(text, position: center, size: Metrics.noticeSize, alignment: .center, weight: .regular), color: .primary, opacity: opacity, space: .screen, id: id)
    }
}
