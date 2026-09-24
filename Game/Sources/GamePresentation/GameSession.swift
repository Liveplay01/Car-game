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
    /// Dragging on a page: press, move, release (the Street Builder's drag and drop).
    case pointerDown(Vec2)
    case pointerMove(Vec2)
    case pointerUp(Vec2)
    /// A tab of the tab bar (the app's `TabView`, a click on the test window's strip).
    case selectTab(Tab)
    /// The next tab (Tab key in the test window).
    case nextTab
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
    /// Real time since the last takedown.
    private var sinceTakedown = Double.infinity
    /// The score as the HUD shows it: it runs after the real one instead of jumping.
    private var shownScore = 0.0
    /// How long ago the combo reached a new tier, for the spring on the multiplier.
    private var sinceComboTier = Double.infinity
    /// Flow State as the ring glow shows it, 0…1: it fades in and out instead of switching.
    private var flowLevel = 0.0

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
    /// A second tap on the same card within this long buys it.
    public static let doubleTapWindow = 0.4
    /// What the Upgrades tab shows and animates.
    public private(set) var upgradePage = UpgradePage.State()
    /// What the Shop tab shows and animates (M10).
    public private(set) var shopPage = ShopPage.State()
    /// Plays rewarded ads in the app; without one (test window) a placeholder ad runs.
    public weak var adProvider: AdProviding?
    /// What the Street Builder tab shows and animates.
    public private(set) var builderPage = StreetBuilderPage.State()
    /// The last tap on a placed part, to tell a double tap from a single one.
    private var lastPartTap = Double.infinity
    /// Where the last viewport was, so the pages can hit-test what was drawn.
    private var lastViewport = Vec2(430, 900)
    /// The last tap on a card, to tell a double tap from two single ones.
    private var lastCardTap: (upgrade: Upgrade, age: Double)?
    private var notice: (text: String, age: Double)?

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
        playingDuty = save.career.duty
        world = World(config: save.career.config(from: config, seed: seed), seed: seed, mode: .shift, startsOnFirstTap: true)
        effects = CrashEffects(seed: seed)
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
        baseTimeScale * Self.slowMotionScales[slowMotionLevel] * takedownSlowMotion
    }

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
            if screen == .ready { screen = .playing }
        case .restart:
            prepareShift(continuing: false)
        case .openSettings:
            if screen == .ready { screen = .settings }
        case .closeSettings:
            if screen == .settings { screen = .ready }
        case .toggleDaily:
            // Only between shifts, and only while today's is still open.
            guard screen == .ready, world.shift.phase == .waiting else { return }
            guard dailySelected || save.career.isDailyOpen(day: today) else {
                showNotice(Strings.Daily.doneToday)
                return
            }
            dailySelected.toggle()
            prepareShift(continuing: true, seed: dailySelected ? Career.dailySeed(day: today) : nil)
        case let .setDuty(duty):
            guard save.career.duty != duty else { return }
            save.career.duty = duty
            store.save(save)
            refreshWaitingShift()
        case let .showTab(tab):
            guard screen.showsTabBar, tab != screen.tab || screen.tab == .game else { return }
            // The next shift already waits behind every page and behind the result.
            screen = tab == .game ? .ready : .page(tab)
        case let .pickUpPart(part):
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
            upgradePage.selected = upgrade
            upgradePage.pressed = (upgrade, 0)
        case let .buy(upgrade):
            buy(upgrade)
        case let .openChest(index):
            guard let opening = save.career.openChest(at: index, seed: UInt64(save.shiftsPlayed)) else { return }
            store.save(save)
            // The drawn shop reveals it and plays the burst with its animation; without drawn
            // menus a short notice says what it was.
            if options.drawsMenus {
                shopPage.opening = (opening, reduceMotion ? ShopPage.burstTime : 0)
                play(sounds: [.dispatch], haptics: [.wanted])
            } else {
                play(sounds: [.paid], haptics: [.chest])
                showNotice(Strings.Shop.opened(opening))
            }
        case let .buyChest(kind):
            guard save.career.buyChest(kind, config: config) else {
                shopPage.denied = 0.001
                showNotice(Strings.Notice.notEnoughMoney(format.number(config.price(of: kind) ?? 0)))
                return
            }
            store.save(save)
            play(sounds: [.comboUp], haptics: [.comboUp])
        case .watchAd:
            guard save.career.adChestsLeft(day: today, config: config) > 0, shopPage.ad == nil else {
                showNotice(Strings.Shop.noAdsLeft)
                return
            }
            if let adProvider {
                adProvider.showRewardedAd { [weak self] watched in
                    if watched { self?.adWatched() }
                }
            } else {
                // Test window: a placeholder ad that runs a few seconds.
                shopPage.ad = 0
            }
        case let .wear(id):
            if !save.career.wear(id), Cosmetics.item(id)?.kind == .carSkin, save.career.owns(id) {
                showNotice(Strings.Shop.skinsFull(Career.maxCarSkins))
            }
            store.save(save)
        case .toggleSound:
            save.settings.sound.toggle()
            store.save(save)
        case .toggleVehicleLabels:
            save.settings.vehicleLabels.toggle()
            store.save(save)
        case .toggleHaptics:
            save.settings.haptics.toggle()
            store.save(save)
        case .cycleReduceMotion:
            let all = ReduceMotion.allCases
            let index = all.firstIndex(of: save.settings.reduceMotion) ?? 0
            save.settings.reduceMotion = all[(index + 1) % all.count]
            store.save(save)
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

    /// The level the running shift is played at, and the duty it was started on.
    public private(set) var playingLevel = 1
    public private(set) var playingDuty = Duty.normal

    /// Sets up the next shift for the saved career: its level (car count, traffic) and the
    /// upgrades bought (`Career.config`). It waits, traffic flowing, for its first tap.
    /// Continuing keeps the cars on the road and lets the new queue roll in (`World.nextShift`);
    /// otherwise the roundabout starts afresh.
    private func prepareShift(continuing: Bool, seed: UInt64? = nil, screen next: Screen = .ready) {
        let seed = seed ?? random.nextSeed()
        playingLevel = save.career.level
        playingDuty = save.career.duty
        playingDaily = dailySelected
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

    /// The config of a shift with this seed: the career's, and for the Daily Shift always
    /// the day's city event.
    private func shiftConfig(seed: UInt64) -> Config {
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
        playingDuty = save.career.duty
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
            showNotice(Strings.Notice.notEnoughMoney(format.number(price)))
            return
        }
        let steps = save.career.steps(of: upgrade)
        upgradePage.purchase = (upgrade, steps - 1, 0)
        upgradePage.moneyBefore = money
        store.save(save)
        refreshWaitingShift()
        play(sounds: [.comboUp], haptics: [.comboUp])
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
        play(sounds: [.comboUp], haptics: [.comboUp])
        showNotice(Strings.Notice.built(Strings.Builder.name(pending.part), arms: save.career.armSlots.count))
    }

    /// A module goes onto its slot on the ring; a module already there is swapped (M9).
    private func buildModule(_ module: RoadModule, pending: (part: StreetBuilderPage.Part, slot: Int), price: Int, money: Int) {
        guard save.career.build(module, inSlot: pending.slot, config: config) else {
            builderPage.denied = 0.001
            showNotice(Strings.Notice.notEnoughMoney(format.number(price)))
            return
        }
        builderPage.pending = nil
        builderPage.removing = 0
        builderPage.builtModule = (pending.slot, 0)
        builderPage.moneyBefore = money
        store.save(save)
        refreshWaitingShift()
        play(sounds: [.comboUp], haptics: [.comboUp])
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
        }
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

    /// A rewarded ad was watched to the end: a Standard chest.
    public func adWatched() {
        guard save.career.rewardAd(day: today, config: config) else { return }
        store.save(save)
        shopPage.ad = nil
        shopPage.selectedChest = .standard
        play(sounds: [.paid], haptics: [.paid])
        showNotice(Strings.Shop.adReward)
    }

    /// A tap on the Shop page. Tapping a selected chest again opens one; tapping an owned
    /// item again wears it — like the double tap on an upgrade.
    private func tapShop(_ target: ShopPage.Target) {
        switch target {
        case let .section(section):
            shopPage.section = section
        case let .chest(kind):
            if shopPage.selectedChest == kind, save.career.count(of: kind) > 0 {
                tapShop(.open(kind))
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
            if shopPage.selectedItem == id, save.career.owns(id) {
                perform(.wear(id))
            }
            shopPage.selectedItem = id
        case let .wear(id):
            perform(.wear(id))
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
        }
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
        }
        if case .result = screen {
            resultAge += realDelta
        }
        sinceTakedown += realDelta
        sinceComboTier += realDelta
        let flowTarget = screen == .playing && world.isInFlow ? 1.0 : 0.0
        flowLevel += (flowTarget - flowLevel) * min(1, realDelta / Self.flowFade)
        // The score catches up with itself: it counts, never jumps (FOUNDATION.md 3).
        let points = Double(world.score.points)
        if abs(points - shownScore) < 1 || reduceMotion {
            shownScore = points
        } else {
            shownScore += (points - shownScore) * min(1, realDelta / Self.scoreCatchUp)
        }
        sinceReady = screen == .ready ? sinceReady + realDelta : 0
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
                play(sounds: rare ? [.takedown, .paid] : [.paid], haptics: [.chest])
            }
            if let ad = shopPage.ad, ad >= ShopPage.adDuration {
                adWatched()
            }
        } else {
            shopPage = ShopPage.State()
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
        return Frame(renderList: renderList(viewport: viewport, fps: fps), events: events, screen: screen)
    }

    private func handle(_ action: InputAction, present: Double, simDelta: Double) {
        switch action {
        case .tap:
            switch screen {
            case .playing:
                // Input is polled once per frame; the press happened on average half a frame ago.
                world.tap(at: max(world.time, present - simDelta / 2))
            case .ready:
                // No start menu: the next shift is already on the road, and the first tap
                // sends its front car.
                screen = .playing
                world.tap(at: max(world.time, present - simDelta / 2))
            case .result:
                // One tap anywhere: the first car of the next shift. Not in the very first
                // moment, so a tap meant for the last car does not skip the result.
                if resultAge >= ResultBanner.inputLock {
                    screen = .playing
                    world.tap(at: max(world.time, present - simDelta / 2))
                }
            case .settings, .page:
                // Menus and pages take no taps; they have their items.
                break
            }
        case .confirm:
            switch screen {
            case .ready, .result:
                screen = .playing
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
        case let .pointerDown(point):
            guard screen == .page(.streetBuilder) else { return }
            builderPress(at: point)
        case let .pointerMove(point):
            guard screen == .page(.streetBuilder), builderPage.dragging != nil else { return }
            builderPage.dragging?.at = point
            let map = StreetBuilderPage.map(viewport: lastViewport, bottomInset: tabInset)
            if let part = builderPage.dragging?.part {
                builderPage.target = StreetBuilderPage.target(for: part, at: point, career: save.career, config: config, map: map)
            }
        case let .pointerUp(point):
            guard screen == .page(.streetBuilder), builderPage.dragging != nil else { return }
            let map = StreetBuilderPage.map(viewport: lastViewport, bottomInset: tabInset)
            if let part = builderPage.dragging?.part,
               let slot = StreetBuilderPage.target(for: part, at: point, career: save.career, config: config, map: map) {
                perform(.placePart(slot: slot))
            } else {
                builderPage.dragging = nil
                builderPage.target = nil
            }
        case let .selectTab(tab):
            perform(.showTab(tab))
        case .nextTab:
            let tabs = Tab.allCases
            let index = tabs.firstIndex(of: screen.tab) ?? 0
            perform(.showTab(tabs[(index + 1) % tabs.count]))
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
                effects.spawn(for: report, in: world, reduceMotion: reduceMotion)
                if report.penalty > 0 {
                    addPopup(.penalty(report.penalty), at: report.point)
                }
                if report.cost > 0 {
                    addPopup(.cost(report.cost), at: report.point + Vec2(0, 18))
                } else if report.covered > 0 {
                    addPopup(.covered, at: report.point + Vec2(0, 18))
                }
            case let .comboChanged(change):
                if change.isTierUp { sinceComboTier = 0 }
            case let .shiftEnded(result):
                finish(result)
            case let .takedown(report):
                addPopup(.busted(report.points), at: report.point)
                sinceTakedown = 0
            case .dispatched:
                addPopup(.dispatch, at: world.layout.stopPose(world.layout.player).position)
            case .launched, .tapRejected, .exited, .rushHour, .criminalWarning, .criminalEntered, .criminalEscaped:
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

    /// Sound and haptics, as far as the settings allow.
    private func play(sounds: [SoundID], haptics feedback: [HapticID]) {
        if save.settings.sound, let audio {
            sounds.forEach(audio.play)
        }
        if save.settings.haptics, let haptics {
            feedback.forEach(haptics.play)
        }
    }

    /// Saves right away, so a highscore survives even if the app is closed in the next second;
    /// the result screen follows after `resultDelay`.
    private func finish(_ result: ShiftResult) {
        let previous = save.highscore
        let isNew = result.outcome == .completed && result.score > previous
        if isNew {
            save.highscore = result.score
            save.highscoreSeed = result.seed
        }
        save.shiftsPlayed += 1
        // Money is banked whatever the outcome; done is a level up, lost is the same level again.
        save.career.record(result, playedAt: playingLevel)
        // Mastery runs in the background; a reached goal is a short toast and a chest (M10).
        var toasts: [String] = []
        if result.isPerfectRun {
            toasts.append(Strings.Daily.perfectRun)
        }
        // Daily Shift and Challenges (v1.2).
        if playingDaily, result.outcome == .completed, let pay = save.career.completeDaily(day: today, config: config) {
            toasts.append(Strings.Daily.dailyDone(format.number(pay), streak: save.career.dailyStreak))
        }
        dailySelected = false
        let challenges = save.career.recordChallenges(result, duty: playingDuty, day: today)
        toasts += challenges.map { Strings.Daily.challengeDone($0, reward: format.number($0.reward)) }
        let completed = save.career.recordMastery(result, duty: playingDuty)
        store.save(save)
        if !completed.isEmpty {
            toasts.append(Strings.Mastery.toast(completed))
        }
        if !toasts.isEmpty {
            showNotice(toasts.joined(separator: "  ·  "))
        }
        pendingSummary = ShiftSummary(result: result, level: playingLevel, isNewHighscore: isNew, previousHighscore: previous)
        resultCountdown = Self.resultDelay
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
                // Level up (or not), and the next shift rolls in behind the result.
                prepareShift(continuing: true, screen: .result(summary))
            }
        }
    }

    // MARK: - Render list

    private func renderList(viewport: Vec2, fps: Int) -> RenderList {
        lastViewport = viewport
        var camera = Camera.fit(
            world.layout.viewBounds,
            viewport: viewport,
            insets: Metrics.sceneInsets,
            verticalBias: Metrics.sceneVerticalBias
        )
        // The crash shake moves the scene; the HUD (screen space) stays still.
        camera.focus += effects.shakeOffset
        var list = RenderList(camera: camera, background: .background)
        CityLayer.add(world: world, to: &list)
        SceneBuilder.addRoad(world.layout, config: world.config, to: &list)
        CityLayer.addMapSkin(Skins.color(save.career.mapSkin), world: world, to: &list)
        WeatherLayer.addCityEvent(world: world, to: &list)
        WeatherLayer.addGround(world: world, to: &list)
        effects.addGround(world: world, alpha: clock.alpha, softBody: !reduceMotion, to: &list)
        SceneBuilder.addShadows(of: world, alpha: clock.alpha, to: &list)
        SceneBuilder.addVehicles(of: world, alpha: clock.alpha, carSkins: save.career.carSkins, finishTime: reduceMotion ? nil : world.time, springTime: reduceMotion ? nil : world.time, to: &list)
        SceneBuilder.addTowTrucks(of: world, to: &list)
        if save.settings.vehicleLabels {
            SceneBuilder.addLabels(of: world, alpha: clock.alpha, to: &list)
        }
        effects.addAir(to: &list)
        WeatherLayer.addAir(world: world, time: world.time, reduceMotion: reduceMotion, to: &list)

        switch screen {
        case .playing:
            HUD.addFlowGlow(world: world, flow: flowLevel, to: &list)
            HUD.addChase(world: world, alpha: clock.alpha, to: &list)
            HUD.addTransporter(world: world, alpha: clock.alpha, to: &list)
            HUD.add(
                world: world, level: playingLevel, duty: playingDuty,
                score: Int(shownScore.rounded()),
                comboPop: reduceMotion ? 0 : Ease.clamp01(sinceComboTier / Self.comboPop),
                format: format, showsKeys: options.showsKeyHints, timeScale: timeScale, to: &list
            )
            HUD.addPopups(popups, format: format, reduceMotion: reduceMotion, to: &list)
            if countIn > 0 || isInterrupted {
                HUD.addCountIn(secondsLeft: isInterrupted ? Self.countInSeconds : countIn, to: &list)
            }
        case let .result(summary):
            ResultBanner.add(summary, age: resultAge, format: format, reduceMotion: reduceMotion, showsKeys: options.showsKeyHints, to: &list)
        case .ready:
            let career = save.career
            let status = Strings.Ready.status(
                highscore: save.highscore > 0 ? format.number(save.highscore) : nil,
                money: career.money > 0 ? format.number(career.money) : nil
            )
            let conditions = Strings.Ready.conditions(
                weather: world.config.weather, event: world.config.cityEvent,
                daily: dailySelected, dailyOpen: save.career.isDailyOpen(day: today)
            )
            ReadyBanner.add(level: playingLevel, cars: world.carsLeft ?? 0, duty: career.duty, dutyPay: config.highAlertPay, status: status, conditions: conditions, time: sinceReady, reduceMotion: reduceMotion, showsKeys: options.showsKeyHints, to: &list)
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
            StreetBuilderPage.add(career: save.career, config: config, state: builderPage, format: format, reduceMotion: reduceMotion, showsKeys: options.showsKeyHints, bottomInset: bottomInset, to: &list)
        } else if options.drawsMenus, screen == .page(.upgrades) {
            // Its own page: cards with a picture of what they do (FOUNDATION.md 3).
            UpgradePage.add(career: save.career, config: config, upgrades: visibleUpgrades, state: upgradePage, format: format, reduceMotion: reduceMotion, showsKeys: options.showsKeyHints, bottomInset: bottomInset, to: &list)
        } else if options.drawsMenus, screen == .page(.shop) {
            // Its own page: chests, collection and today's goals (M10, v1.2).
            ShopPage.add(career: save.career, config: config, today: today, state: shopPage, format: format, reduceMotion: reduceMotion, bottomInset: bottomInset, to: &list)
        } else if options.drawsMenus, let content {
            TextPage.add(content, showsKeys: options.showsKeyHints, bottomInset: bottomInset, to: &list)
        }
        if tabStrip {
            TabStrip.add(selected: screen.tab, to: &list)
        }
        if let notice {
            addNotice(notice.text, age: notice.age, bottomInset: bottomInset, to: &list)
        }
        return list
    }

    private func addNotice(_ text: String, age: Double, bottomInset: Double, to list: inout RenderList) {
        let viewport = list.camera.viewport
        let opacity = 1 - Ease.clamp01((age - (Self.noticeDuration - 0.5)) / 0.5)
        let center = Vec2(viewport.x / 2, viewport.y - bottomInset - 64)
        let width = min(viewport.x - 24, Double(text.count) * 7 + 32)
        list.add(.roundedRect(center: center, size: Vec2(width, 28), cornerRadius: 14, rotation: 0), color: .debugPanel, opacity: opacity, space: .screen, id: RenderID.notice)
        list.add(.text(text, position: center, size: Metrics.noticeSize, alignment: .center, weight: .regular), color: .primary, opacity: opacity, space: .screen, id: RenderID.notice + 1)
    }
}
