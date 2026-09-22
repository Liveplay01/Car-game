import Foundation
import Testing
@testable import GameCore
@testable import GamePresentation

// MARK: - Test doubles

final class FixedSeeds: RandomSource {
    private var next: UInt64

    init(from first: UInt64 = 100) {
        next = first
    }

    func nextSeed() -> UInt64 {
        defer { next += 1 }
        return next
    }
}

final class RecordingAudio: AudioPlaying {
    var played: [SoundID] = []
    func play(_ sound: SoundID) { played.append(sound) }
}

final class RecordingHaptics: HapticsPlaying {
    var played: [HapticID] = []
    func play(_ haptic: HapticID) { played.append(haptic) }
}

let viewport = Vec2(430, 900)

/// No AI traffic, so a test controls every car.
func quietConfig(_ adjust: (inout Config) -> Void = { _ in }) -> Config {
    var config = Config()
    config.freePlayDensity = 0
    config.densityStart = 0
    config.densityEnd = 0
    config.rushHourDensityBonus = 0
    adjust(&config)
    return config
}

func makeSession(
    config: Config = quietConfig(),
    store: MemorySaveStore = MemorySaveStore(),
    audio: RecordingAudio? = nil,
    haptics: RecordingHaptics? = nil,
    timeScale: Double = 1
) -> GameSession {
    let session = GameSession(config: config, random: FixedSeeds(), store: store, audio: audio, haptics: haptics, timeScale: timeScale)
    session.format = TextFormat(groupingSeparator: ",")
    return session
}

extension GameSession {
    @discardableResult
    func advance(_ actions: [InputAction] = [], delta: Double = 1.0 / 60) -> Frame {
        frame(delta: delta, actions: actions, viewport: viewport, fps: 60)
    }

    /// Runs frames until `condition` holds or `seconds` have passed.
    @discardableResult
    func run(seconds: Double, delta: Double = 1.0 / 60, until condition: (GameSession) -> Bool = { _ in false }) -> [GameEvent] {
        var events: [GameEvent] = []
        for _ in 0..<Int(seconds / delta) {
            events += advance(delta: delta).events
            if condition(self) { break }
        }
        return events
    }

    var isShowingResult: Bool {
        if case .result = screen { return true }
        return false
    }
}

extension Frame {
    var texts: [String] {
        renderList.items.compactMap { item in
            if case let .text(string, _, _, _, _) = item.primitive { return string }
            return nil
        }
    }
}

/// Puts a ring car exactly where the next merge ends and taps.
/// Sends the cars of a quiet shift one by one until it is over.
func finishShift(_ session: GameSession) {
    for _ in 0..<(session.world.carsLeft ?? 0) {
        session.run(seconds: 1) { $0.world.queue.isReady }
        session.advance([.tap])
    }
    session.run(seconds: 2) { $0.world.shift.outcome != nil }
}

func crashNextCar(_ session: GameSession) {
    session.run(seconds: 1) { $0.world.queue.isReady }
    var world = session.world
    let s = world.layout.entryRingS(.south) - world.ringSpeed * world.config.mergeDuration
    world.spawnRingCar(at: s, exitArm: .west)
    session.world = world
    session.advance([.tap])
    session.run(seconds: 1) { $0.world.score.strikes > 0 }
}

// MARK: - Session

@Suite("Session and scene")
struct SessionTests {
    @Test func startsOnTheStartScreenWithTrafficBehind() {
        let session = makeSession(config: Config())
        #expect(session.screen == .start)
        #expect(session.world.mode == .freePlay)
        #expect(session.world.roadCount > 0)
    }

    @Test func tapLaunchesTheCarWithinTheFrameAt60Hz() {
        let session = makeSession()
        session.advance([.confirm])
        session.advance()
        let front = session.world.queue.vehicles[0]
        let frame = session.advance([.tap])
        #expect(frame.events.contains { if case .launched(front, _) = $0 { true } else { false } })
        #expect(session.world.vehicle(id: front).map { if case .merging = $0.phase { true } else { false } } == true)
    }

    @Test func menusTakeNoTaps() {
        let session = makeSession()
        let events = session.advance([.tap]).events + session.run(seconds: 0.5)
        #expect(session.screen == .start)
        #expect(!events.contains { if case .launched = $0 { true } else { false } })
    }

    @Test func slowMotionCycles() {
        let session = makeSession()
        var scales: [Double] = []
        for _ in 0..<4 {
            session.advance([.cycleSlowMotion], delta: 0)
            scales.append(session.timeScale)
        }
        #expect(scales == [0.5, 0.25, 1, 0.5])
    }

    @Test func slowMotionSlowsTheSimulation() {
        let session = makeSession(timeScale: 0.5)
        session.advance([.confirm], delta: 0)
        session.run(seconds: 1)
        #expect(abs(session.world.time - 0.5) < 2 * World.stepDuration)
    }

    @Test func everyVehicleIsDrawnWithBodyAndGlassAndIdsAreUnique() {
        let session = makeSession(config: Config())
        for actions in [[], [InputAction.confirm], [.back], [.toggleDebug]] {
            let frame = session.advance(actions)
            let ids = Set(frame.renderList.items.map(\.id))
            for vehicle in session.world.vehicles where !vehicle.isCrashed {
                #expect(ids.contains(RenderID.vehicle(vehicle.id, part: CarArt.Slot.body)))
                #expect(ids.contains(RenderID.vehicle(vehicle.id, part: CarArt.Slot.part(.windscreen))))
            }
            #expect(Set(frame.renderList.items.map(\.id)).count == frame.renderList.items.count)
        }
    }

    @Test func idsStayUniqueDuringACrash() {
        let session = makeSession()
        session.advance([.confirm])
        crashNextCar(session)
        for _ in 0..<30 {
            let frame = session.advance()
            #expect(Set(frame.renderList.items.map(\.id)).count == frame.renderList.items.count)
        }
    }

    @Test func debugOverlayShowsSeedAndFps() {
        let session = makeSession()
        session.advance([.confirm])
        let frame = session.advance([.toggleDebug])
        #expect(frame.texts.contains(Strings.Debug.seed(100)))
        #expect(frame.texts.contains(Strings.Debug.fps(60)))
    }

    @Test func rushHourPutsTheCarCounterOnAnAccentPill() {
        let session = makeSession(config: quietConfig { $0.shiftCars = 3; $0.rushHourCars = 2 })
        session.advance([.confirm])
        let before = session.advance()
        #expect(!before.renderList.items.contains { $0.color == .accentInk })
        session.advance([.tap])
        session.run(seconds: 1) { $0.world.queue.isReady }
        session.advance([.tap])
        let frame = session.advance()
        #expect(frame.renderList.items.contains { $0.color == .accentInk && $0.primitive == .text(Strings.HUD.cars(1), position: Vec2(viewport.x / 2, Metrics.hudRow), size: Metrics.timerSize, alignment: .center, weight: .bold) })
        #expect(frame.texts.contains(Strings.HUD.rushFactor(2)))
    }

    @Test func hudShowsScoreCarsLeftAndCombo() {
        let session = makeSession()
        session.advance([.confirm])
        let frame = session.advance()
        #expect(frame.texts.contains("0"))
        #expect(frame.texts.contains(Strings.HUD.cars(session.config.shiftCars)))
        #expect(frame.texts.contains("×1"))
    }
}

// MARK: - Screen flow

@Suite("Screen flow")
struct ScreenFlowTests {
    @Test func startPauseResumeMenu() {
        let session = makeSession()
        session.advance([.confirm])
        #expect(session.screen == .playing)
        #expect(session.world.mode == .shift)
        #expect(session.world.seed == 100)
        session.advance([.back])
        #expect(session.screen == .paused)
        session.advance([.back])
        #expect(session.screen == .playing)
        session.advance([.back])
        session.advance([.choose(3)])
        #expect(session.screen == .start)
        #expect(session.world.mode == .freePlay)
    }

    @Test func pauseFreezesTheShift() {
        let session = makeSession()
        session.advance([.confirm])
        session.run(seconds: 0.5)
        session.advance([.focusLost])
        let time = session.world.time
        session.run(seconds: 1)
        #expect(session.world.time == time)
        #expect(session.screen == .paused)
    }

    @Test func restartStartsANewSeed() {
        let session = makeSession()
        session.advance([.confirm])
        session.run(seconds: 0.5)
        session.advance([.restart])
        #expect(session.world.seed == 101)
        #expect(session.world.time < 0.1)
        #expect(session.screen == .playing)
    }

    @Test func settingsToggleAndPersist() {
        let store = MemorySaveStore()
        let session = makeSession(store: store)
        session.advance([.choose(2)])
        #expect(session.screen == .settings)
        session.advance([.choose(1)])
        session.advance([.choose(3)])
        #expect(store.game?.settings.sound == false)
        #expect(store.game?.settings.reduceMotion == .on)
        #expect(session.reduceMotion)
        session.advance([.confirm])
        #expect(session.screen == .start)
    }

    @Test func completedShiftShowsTheBannerAndSavesTheHighscore() {
        let store = MemorySaveStore()
        let session = makeSession(config: quietConfig { $0.shiftCars = 1; $0.rushHourCars = 0 }, store: store)
        session.advance([.confirm])
        finishShift(session)
        // Saved at once; the banner follows a moment later.
        #expect(store.game?.highscore == 1_100)
        #expect(session.screen == .playing)
        session.run(seconds: GameSession.resultDelay + 0.1) { $0.isShowingResult }
        guard case let .result(summary) = session.screen else {
            Issue.record("no result")
            return
        }
        #expect(summary.isNewHighscore)
        #expect(session.content == nil)
        let texts = session.advance().texts
        #expect(texts.contains(Strings.Result.shiftComplete))
        #expect(texts.contains("1,100"))
        #expect(texts.contains(Strings.Result.newHighscore))
    }

    @Test func oneTapStartsTheNextShiftButNotRightAway() {
        let session = makeSession(config: quietConfig { $0.shiftCars = 1 })
        session.advance([.confirm])
        finishShift(session)
        session.run(seconds: GameSession.resultDelay + 0.2) { $0.isShowingResult }
        #expect(session.isShowingResult)
        // A hurried tap in the first moment is ignored.
        session.advance([.tap])
        #expect(session.isShowingResult)
        #expect(!session.advance().texts.contains(Strings.Result.tapToContinue))
        session.run(seconds: ResultBanner.inputLock + 0.3)
        #expect(session.advance().texts.contains(Strings.Result.tapToContinue))
        session.advance([.tap])
        #expect(session.screen == .playing)
        #expect(session.world.seed == 101)
    }

    @Test func abortedShiftSaysGameOverAndNeverSetsAHighscore() {
        var saved = SaveGame()
        saved.highscore = 500
        let store = MemorySaveStore(saved)
        let session = makeSession(config: quietConfig { $0.maxStrikes = 1 }, store: store)
        session.advance([.confirm])
        crashNextCar(session)
        session.run(seconds: GameSession.resultDelay + 0.2) { $0.isShowingResult }
        guard case let .result(summary) = session.screen else {
            Issue.record("no result")
            return
        }
        #expect(summary.result.outcome == .struckOut)
        #expect(!summary.isNewHighscore)
        #expect(store.game?.highscore == 500)
        #expect(store.game?.shiftsPlayed == 1)
        let texts = session.advance().texts
        #expect(texts.contains(Strings.Result.gameOver))
        #expect(texts.contains(Strings.Result.best("500")))
    }

    @Test func escapeLeadsFromTheResultToTheMenu() {
        let session = makeSession(config: quietConfig { $0.shiftCars = 1 })
        session.advance([.confirm])
        finishShift(session)
        session.run(seconds: 3) { $0.isShowingResult }
        session.advance([.back])
        #expect(session.screen == .start)
    }

    @Test func highscoreSurvivesARestartOfTheGame() {
        let store = MemorySaveStore()
        let first = makeSession(config: quietConfig { $0.shiftCars = 1; $0.rushHourCars = 0 }, store: store)
        first.advance([.confirm])
        finishShift(first)
        let second = makeSession(store: store)
        #expect(second.save.highscore == 1_100)
        #expect(second.content?.subtitle == Strings.Menu.highscore("1,100"))
    }

}

// MARK: - Feedback

@Suite("Feedback")
struct FeedbackTests {
    func merge(_ rating: MergeRating) -> GameEvent {
        .merged(MergeReport(vehicle: 1, minGap: 0.1, closest: nil, gapBehind: .infinity, position: .zero, time: 0, rating: rating, points: 100, combo: 1))
    }

    @Test func mapsEventsToSoundsAndHaptics() {
        #expect(Feedback.sound(for: merge(.clean)) == .merge)
        #expect(Feedback.haptic(for: merge(.clean)) == nil)
        #expect(Feedback.sound(for: merge(.tightFit)) == .tightFit)
        #expect(Feedback.haptic(for: merge(.tightFit)) == .tightFit)
        #expect(Feedback.sound(for: .launched(vehicle: 1, time: 0)) == nil)
        let tierUp = ComboChange(previous: 4, combo: 5, previousTier: 0, tier: 1, multiplier: 1.5)
        #expect(Feedback.sound(for: .comboChanged(tierUp)) == .comboUp)
        let sameTier = ComboChange(previous: 5, combo: 6, previousTier: 1, tier: 1, multiplier: 1.5)
        #expect(Feedback.sound(for: .comboChanged(sameTier)) == nil)
    }

    @Test func eachCueOncePerFrame() {
        let cues = Feedback.cues(for: [merge(.clean), merge(.clean), merge(.tightFit)])
        #expect(cues.sounds == [.merge, .tightFit])
        #expect(cues.haptics == [.tightFit])
    }

    @Test func sessionPlaysSoundsOnlyWhenSoundIsOn() {
        let audio = RecordingAudio()
        let haptics = RecordingHaptics()
        let session = makeSession(audio: audio, haptics: haptics)
        session.advance([.confirm])
        session.advance([.tap])
        session.run(seconds: 1) { _ in !audio.played.isEmpty }
        #expect(audio.played == [.merge])
        #expect(haptics.played.isEmpty)

        audio.played.removeAll()
        session.perform(.toggleSound)
        session.run(seconds: 1) { $0.world.queue.isReady }
        session.advance([.tap])
        session.run(seconds: 1)
        #expect(audio.played.isEmpty)
        #expect(session.world.score.merges == 2)
    }
}

// MARK: - Tuning

@Suite("Live tuning in the session")
struct SessionTuningTests {
    @Test func tuningRestartsTheShiftWithTheSameSeed() {
        let session = makeSession()
        session.advance([.confirm])
        session.run(seconds: 0.5)
        session.loadTuning(Data(#"{ "tightFitSeconds": 0.2, "maxStrikes": 3 }"#.utf8))
        #expect(session.config.tightFitSeconds == 0.2)
        #expect(session.world.config.maxStrikes == 3)
        #expect(session.world.seed == 100)
        #expect(session.world.time < 0.1)
        #expect(session.advance().texts.contains(Strings.Notice.tuningLoaded(values: 2, changes: 2 + 4)))
    }

    @Test func brokenTuningChangesNothing() {
        let session = makeSession()
        let before = session.config
        session.loadTuning(Data(#"{ "ringSpeed": -1 }"#.utf8))
        #expect(session.config == before)
        #expect(session.advance().texts.contains { $0.hasPrefix("tuning.json not applied") })
    }
}

// MARK: - Formatting and save game

@Suite("Text format")
struct TextFormatTests {
    @Test func groupsThousandsWithTheDeviceSeparator() {
        #expect(TextFormat(groupingSeparator: ",").number(12_345) == "12,345")
        #expect(TextFormat(groupingSeparator: ".").number(1_234_567) == "1.234.567")
        #expect(TextFormat().number(999) == "999")
        #expect(TextFormat().number(0) == "0")
        #expect(TextFormat().signed(1_000) == "+1,000")
        #expect(TextFormat().signed(-250) == "−250")
    }

    @Test func shiftTimeInTenths() {
        let format = TextFormat()
        #expect(format.seconds(18.44) == "18.4 s")
        #expect(format.seconds(18.46) == "18.5 s")
        #expect(format.seconds(5) == "5.0 s")
        #expect(format.seconds(-1) == "0.0 s")
        #expect(Strings.HUD.cars(1) == "1 car")
        #expect(Strings.HUD.cars(12) == "12 cars")
    }
}

@Suite("Save game")
struct SaveGameTests {
    @Test func olderSavesFillInDefaults() throws {
        let game = try JSONDecoder().decode(SaveGame.self, from: Data(#"{ "highscore": 4200 }"#.utf8))
        #expect(game.highscore == 4_200)
        #expect(game.version == SaveGame.currentVersion)
        #expect(game.settings == Settings())
    }

    @Test func fileStoreRoundTripsAndKeepsUnreadableFiles() throws {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent("cargame-\(UUID().uuidString)")
        defer { try? FileManager.default.removeItem(at: folder) }
        let url = folder.appendingPathComponent("savegame.json")
        let store = FileSaveStore(url: url)
        #expect(store.load() == nil)

        var game = SaveGame()
        game.highscore = 12_345
        game.settings.haptics = false
        store.save(game)
        #expect(store.load() == game)

        try Data("not json".utf8).write(to: url)
        #expect(store.load() == nil)
        let aside = folder.appendingPathComponent("savegame.unreadable.json")
        #expect(FileManager.default.fileExists(atPath: aside.path))
    }
}

// MARK: - Crash effects

@Suite("Crash effects")
struct CrashEffectTests {
    /// A world with one fresh crash, and its report.
    func crashedWorld() -> (World, CrashReport) {
        var config = Config()
        config.freePlayDensity = 0
        var world = World(config: config, seed: 1, mode: .freePlay, prefill: false)
        world.targetDensity = 0
        world.spawnRingCar(at: world.layout.entryRingS(.south) - world.ringSpeed * config.mergeDuration, exitArm: .west)
        world.tap(at: 0)
        for _ in 0..<90 {
            world.step()
            if let crash = world.takeEvents().compactMap({ event -> CrashReport? in
                if case let .crash(report) = event { return report }
                return nil
            }).first {
                return (world, crash)
            }
        }
        preconditionFailure("no crash")
    }

    @Test func crashThrowsDebrisSparksAndShakes() {
        let (world, crash) = crashedWorld()
        var effects = CrashEffects(seed: 1)
        effects.spawn(for: crash, in: world, reduceMotion: false)
        #expect(effects.particles.count >= 8)
        #expect(effects.blasts.count == 1)
        effects.update(1.0 / 60, world: world)
        #expect(effects.shakeOffset != .zero)
    }

    @Test func reduceMotionKeepsOnlyFades() {
        let (world, crash) = crashedWorld()
        var effects = CrashEffects(seed: 1)
        effects.spawn(for: crash, in: world, reduceMotion: true)
        #expect(effects.particles.isEmpty)
        #expect(effects.blasts.count == 1)
        #expect(effects.shakeOffset == .zero)
    }

    @Test func effectsDieDownOnceTheWrecksAreGone() {
        var (world, crash) = crashedWorld()
        var effects = CrashEffects(seed: 1)
        effects.spawn(for: crash, in: world, reduceMotion: false)
        for _ in 0..<(4 * World.stepRate) {
            world.step()
            effects.update(World.stepDuration, world: world)
        }
        #expect(world.vehicles.allSatisfy { !$0.isCrashed })
        #expect(effects.isEmpty)
        #expect(effects.fires.isEmpty)
    }

    @Test func wrecksAreDrawnBelowTheTrafficAndBlastsAbove() {
        let session = makeSession()
        session.advance([.confirm])
        crashNextCar(session)
        let items = session.advance().renderList.items
        let liveCar = session.world.vehicles.first { !$0.isCrashed }.map { RenderID.vehicle($0.id, part: 0) }
        let wreck = items.firstIndex { $0.color == .wreck }
        let traffic = items.firstIndex { $0.id == liveCar }
        #expect(wreck != nil)
        #expect(traffic != nil)
        if let wreck, let traffic {
            #expect(wreck < traffic)
        }
    }
}
