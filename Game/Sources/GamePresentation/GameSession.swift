import Foundation
import GameCore

/// What the platform reports; key and touch mapping stays in the platform.
public enum InputAction: Sendable, Equatable {
    /// Send the front car (click, space, later a touch on the playfield). After a shift:
    /// the next shift.
    case tap
    /// The screen's main action (Enter): start, resume, next shift.
    case confirm
    /// Esc: pause while playing, resume while paused, back out of a menu.
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
    /// The window or app lost focus: a running shift pauses (FOUNDATION.md 3).
    case focusLost
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
    public static let noticeDuration = 3.5
    /// Traffic behind the start screen. Fixed, so it never uses up a shift seed.
    static let backdropSeed: UInt64 = 1

    /// The config the platform started with; `tuning.json` is laid over it.
    public let baseConfig: Config
    /// The config new shifts use: `baseConfig` plus live tuning.
    public private(set) var config: Config
    public let options: PresentationOptions
    /// From `--time-scale`, multiplied with slow motion.
    public let baseTimeScale: Double
    public internal(set) var world: World
    public private(set) var screen: Screen = .start
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
    private var effects = CrashEffects(seed: GameSession.backdropSeed)
    private var popups: [Popup] = []
    private var popupSerial = 0
    /// The finished shift, shown once `resultCountdown` has run out.
    private var pendingSummary: ShiftSummary?
    private var resultCountdown = 0.0
    /// Real time the result banner has been showing.
    private var resultAge = 0.0
    /// Real time since the last takedown.
    private var sinceTakedown = Double.infinity
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
        world = World(config: config, seed: Self.backdropSeed, mode: .freePlay)
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

    /// The current menu as data; nil while playing.
    public var content: ScreenContent? {
        ScreenFlow.content(for: screen, save: save, world: world, format: format)
    }

    // MARK: - Screen flow

    public func perform(_ action: ScreenAction) {
        switch action {
        case .startShift, .restart:
            startShift()
        case .pause:
            if screen == .playing { screen = .paused }
        case .resume:
            if screen == .paused { screen = .playing }
        case .menu:
            showStart()
        case .openSettings:
            screen = .settings
        case .closeSettings:
            screen = .start
        case .toggleSound:
            save.settings.sound.toggle()
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
        case .playing, .paused:
            startShift(seed: world.seed)
        case .start, .settings:
            showStart(keepScreen: true)
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

    private func startShift(seed: UInt64? = nil) {
        world = World(config: config, seed: seed ?? random.nextSeed(), mode: .shift)
        resetScene()
        screen = .playing
    }

    private func showStart(keepScreen: Bool = false) {
        world = World(config: config, seed: Self.backdropSeed, mode: .freePlay)
        resetScene()
        if !keepScreen { screen = .start }
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
        if screen != .paused {
            clock.add(simDelta)
        }
        let present = world.time + clock.accumulator
        for action in actions {
            handle(action, present: present, simDelta: simDelta)
        }

        var events: [GameEvent] = []
        if screen != .paused {
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
            case .result:
                // One tap anywhere: the next shift. Not in the very first moment, so a tap
                // meant for the last car does not skip the result.
                if resultAge >= ResultBanner.inputLock {
                    perform(.startShift)
                }
            case .start, .settings, .paused:
                // Menus take no taps; they have their items.
                break
            }
        case .confirm:
            if case .result = screen {
                perform(.startShift)
            } else if let primary = content?.items.first(where: \.isPrimary) {
                perform(primary.action)
            }
        case .back:
            switch screen {
            case .playing: perform(.pause)
            case .paused: perform(.resume)
            case .settings: perform(.closeSettings)
            case .result: perform(.menu)
            case .start: break
            }
        case let .choose(number):
            if let items = content?.items, items.indices.contains(number - 1) {
                perform(items[number - 1].action)
            }
        case .restart:
            switch screen {
            case .playing, .paused, .result: perform(.restart)
            case .start, .settings: break
            }
        case .toggleDebug:
            isDebugVisible.toggle()
        case .dispatch:
            if screen == .playing {
                world.dispatchPolice()
            }
        case .cycleSlowMotion:
            slowMotionLevel = (slowMotionLevel + 1) % Self.slowMotionScales.count
        case .focusLost:
            perform(.pause)
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
                case .cutOff: addPopup(.cutOff, at: report.position)
                case .clean: break
                }
            case let .crash(report):
                markers.append(DebugMarker(kind: .crash, position: report.point, age: 0))
                effects.spawn(for: report, in: world, reduceMotion: reduceMotion)
                if report.penalty > 0 {
                    addPopup(.penalty(report.penalty), at: report.point)
                }
            case let .shiftEnded(result):
                finish(result)
            case let .takedown(report):
                addPopup(.busted(report.points), at: report.point)
                sinceTakedown = 0
            case .dispatched:
                addPopup(.dispatch, at: world.layout.stopPose(Arm.player).position)
            case .launched, .tapRejected, .exited, .comboChanged, .rushHour, .criminalWarning, .criminalEntered, .criminalEscaped:
                break
            case .transporterWarning:
                break
            case .transporterEntered:
                break
            case let .transporterSeized(vehicle, police, point, time):
                markers.append(DebugMarker(kind: .crash, position: point, age: 0))
                addPopup(.seized, at: point)
            case .transporterEscaped:
                break
            case let .transporterPaid(vehicle, amount, time):
                if amount > 0 {
                    addPopup(.paid(amount), at: world.layout.stopPose(Arm.player).position)
                }
            }
        }
        guard screen == .playing else { return }
        let cues = Feedback.cues(for: events)
        if save.settings.sound, let audio {
            cues.sounds.forEach(audio.play)
        }
        if save.settings.haptics, let haptics {
            cues.haptics.forEach(haptics.play)
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
        // Money from transporters is banked whatever the outcome: it was paid out already.
        save.money += result.money
        store.save(save)
        pendingSummary = ShiftSummary(result: result, isNewHighscore: isNew, previousHighscore: previous)
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
                pendingSummary = nil
                resultAge = 0
                screen = .result(summary)
            }
        }
    }

    // MARK: - Render list

    private func renderList(viewport: Vec2, fps: Int) -> RenderList {
        var camera = Camera.fit(
            world.layout.viewBounds,
            viewport: viewport,
            insets: Metrics.sceneInsets,
            verticalBias: Metrics.sceneVerticalBias
        )
        // The crash shake moves the scene; the HUD (screen space) stays still.
        camera.focus += effects.shakeOffset
        var list = RenderList(camera: camera, background: .background)
        SceneBuilder.addRoad(world.layout, config: world.config, to: &list)
        effects.addGround(world: world, alpha: clock.alpha, to: &list)
        SceneBuilder.addVehicles(of: world, alpha: clock.alpha, to: &list)
        effects.addAir(to: &list)

        switch screen {
        case .playing, .paused:
            HUD.addChase(world: world, alpha: clock.alpha, to: &list)
            HUD.addTransporter(world: world, alpha: clock.alpha, to: &list)
            HUD.add(world: world, format: format, showsKeys: options.showsKeyHints, timeScale: timeScale, to: &list)
            HUD.addPopups(popups, format: format, reduceMotion: reduceMotion, to: &list)
        case let .result(summary):
            ResultBanner.add(summary, age: resultAge, format: format, reduceMotion: reduceMotion, showsKeys: options.showsKeyHints, to: &list)
        case .start, .settings:
            break
        }
        if isDebugVisible {
            let stats = DebugStats(fps: fps, timeScale: timeScale, tuningChanges: Tuning.differences(config).count)
            DebugOverlay.add(world: world, alpha: clock.alpha, markers: markers, stats: stats, to: &list)
        }
        if options.drawsMenus, let content {
            TextPage.add(content, showsKeys: options.showsKeyHints, to: &list)
        }
        if let notice {
            addNotice(notice.text, age: notice.age, to: &list)
        }
        return list
    }

    private func addNotice(_ text: String, age: Double, to list: inout RenderList) {
        let viewport = list.camera.viewport
        let opacity = 1 - Ease.clamp01((age - (Self.noticeDuration - 0.5)) / 0.5)
        let center = Vec2(viewport.x / 2, viewport.y - 64)
        let width = min(viewport.x - 24, Double(text.count) * 7 + 32)
        list.add(.roundedRect(center: center, size: Vec2(width, 28), cornerRadius: 14, rotation: 0), color: .debugPanel, opacity: opacity, space: .screen, id: RenderID.notice)
        list.add(.text(text, position: center, size: Metrics.noticeSize, alignment: .center, weight: .regular), color: .primary, opacity: opacity, space: .screen, id: RenderID.notice + 1)
    }
}
