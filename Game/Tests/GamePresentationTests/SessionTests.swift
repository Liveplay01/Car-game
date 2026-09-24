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

/// No AI traffic, so a test controls every car. Every level plays like the config: no
/// easing, and `cars` cars per shift.
func quietConfig(cars: Int = 15, _ adjust: (inout Config) -> Void = { _ in }) -> Config {
    var config = Config()
    config.freePlayDensity = 0
    config.densityStart = 0
    config.densityEnd = 0
    config.rushHourDensityBonus = 0
    // Quiet means no traffic at all: no bots kept on the ring either.
    config.minRingBots = 0
    config.maxMinRingBots = 0
    config.hardLevel = 1
    config.levelOneCars = cars
    config.maxShiftCars = cars
    config.carsPerLevel = 0
    config.shiftCarsSpread = 0
    // The session tests count exact points and pay; the Perfect Run has tests of its own.
    config.perfectRunPoints = 0
    config.perfectRunPayFactor = 0
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
    // A fixed day whose challenges a short test shift cannot meet, so no test depends on
    // the calendar.
    session.today = (0...).first { Set(Challenge.of(day: $0)).isDisjoint(with: [.perfectRun, .highAlertShift]) }!
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
    let s = world.layout.entryRingS(world.layout.player) - world.ringSpeed * world.config.mergeDuration
    world.spawnRingCar(at: s, exitArm: world.layout.arm(3))
    session.world = world
    session.advance([.tap])
    session.run(seconds: 1) { $0.world.score.strikes > 0 }
}

// MARK: - Session

@Suite("Session and scene")
struct SessionTests {
    @Test func startsOnTheGameTabWithoutAMenu() {
        let session = makeSession(config: Config())
        #expect(session.screen == .ready)
        #expect(session.content == nil)
        // The Game tab already shows the next shift, flowing and waiting for its first tap.
        #expect(session.world.mode == .shift)
        #expect(session.world.shift.phase == .waiting)
        #expect(session.world.roadCount > 0)
        let texts = session.advance().texts
        #expect(texts.contains(Strings.Ready.tapToStart))
        #expect(texts.contains(Strings.HUD.level(1)))
    }

    @Test func tapLaunchesTheCarWithinTheFrameAt60Hz() {
        let session = makeSession()
        session.advance()
        let front = session.world.queue.vehicles[0]
        let frame = session.advance([.tap])
        #expect(frame.events.contains { if case .launched(front, _) = $0 { true } else { false } })
        #expect(session.world.vehicle(id: front).map { if case .merging = $0.phase { true } else { false } } == true)
    }

    @Test func theFirstTapStartsTheShiftWithItsFrontCar() {
        let session = makeSession()
        session.run(seconds: 3)
        // Waiting: no criminal, no clock.
        #expect(session.world.shift.startedAt == nil)
        let events = session.advance([.tap]).events + session.run(seconds: 0.5)
        #expect(session.screen == .playing)
        #expect(session.world.shift.startedAt != nil)
        #expect(events.contains { if case .launched = $0 { true } else { false } })
    }

    @Test func pagesTakeNoTaps() {
        let session = makeSession()
        session.advance([.selectTab(.upgrades)])
        session.advance([.tap])
        #expect(session.screen == .page(.upgrades))
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
        let session = makeSession(config: quietConfig(cars: 3) { $0.rushHourCars = 2 })
        session.advance([.confirm])
        let before = session.advance()
        #expect(!before.renderList.items.contains { $0.color == .accentInk })
        // The second car is the first of the last two.
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
        #expect(frame.texts.contains(Strings.HUD.cars(session.world.config.shiftCars - 1)))
        #expect(frame.texts.contains("×1"))
        #expect(frame.texts.contains(Strings.HUD.level(1)))
    }
}

// MARK: - Screen flow

@Suite("Screen flow")
struct ScreenFlowTests {
    @Test func aShiftRunsOnWithNoPauseScreen() {
        let session = makeSession()
        session.advance([.confirm])
        #expect(session.screen == .playing)
        #expect(session.world.mode == .shift)
        #expect(session.world.seed == 100)
        // Esc has nothing to open: the shift keeps running.
        session.advance([.back])
        #expect(session.screen == .playing)
        #expect(session.content == nil)
    }

    @Test func anInterruptionFreezesTheShiftAndCountsBackIn() {
        let session = makeSession()
        session.advance([.confirm])
        session.run(seconds: 0.5)
        session.advance([.focusLost])
        let time = session.world.time
        session.run(seconds: 1)
        #expect(session.world.time == time)
        #expect(session.isInterrupted)
        #expect(session.screen == .playing)

        // Back again: it counts in, still frozen, then runs on by itself.
        session.advance([.focusGained])
        session.run(seconds: 0.5)
        #expect(session.world.time == time)
        #expect(session.countIn > 0)
        session.run(seconds: GameSession.countInSeconds)
        #expect(session.countIn == 0)
        #expect(session.world.time > time)
    }

    @Test func restartStartsANewSeed() {
        let session = makeSession()
        session.advance([.confirm])
        session.run(seconds: 0.5)
        session.advance([.restart])
        #expect(session.world.seed == 101)
        #expect(session.world.time < 0.1)
        #expect(session.screen == .ready)
    }

    @Test func settingsToggleAndPersist() {
        let store = MemorySaveStore()
        let session = makeSession(store: store)
        // Esc on the Game tab opens the settings (a gear button in the app).
        session.advance([.back])
        #expect(session.screen == .settings)
        session.advance([.choose(1)])
        session.advance([.choose(3)])
        #expect(store.game?.settings.sound == false)
        #expect(store.game?.settings.reduceMotion == .on)
        #expect(session.reduceMotion)
        session.advance([.confirm])
        #expect(session.screen == .ready)
    }

    @Test func completedShiftShowsTheBannerAndSavesTheHighscore() {
        let store = MemorySaveStore()
        let session = makeSession(config: quietConfig(cars: 1) { $0.rushHourCars = 0 }, store: store)
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
        #expect(texts.contains(Strings.Result.levelComplete(1)))
        #expect(texts.contains("1,100"))
        #expect(texts.contains(Strings.Result.newHighscore))
    }

    @Test func oneTapStartsTheNextShiftButNotRightAway() {
        let session = makeSession(config: quietConfig(cars: 1))
        session.advance([.confirm])
        finishShift(session)
        session.run(seconds: GameSession.resultDelay + 0.2) { $0.isShowingResult }
        #expect(session.isShowingResult)
        // A hurried tap in the first moment is ignored.
        session.advance([.tap])
        #expect(session.isShowingResult)
        #expect(!session.advance().texts.contains(Strings.Result.nextLevel(2)))
        session.run(seconds: ResultBanner.inputLock + 0.3)
        #expect(session.advance().texts.contains(Strings.Result.nextLevel(2)))
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

    @Test func escapeLeadsFromTheResultBackToTheGameTab() {
        let session = makeSession(config: quietConfig(cars: 1))
        session.advance([.confirm])
        finishShift(session)
        session.run(seconds: 3) { $0.isShowingResult }
        session.advance([.back])
        #expect(session.screen == .ready)
        #expect(session.world.shift.phase == .waiting)
    }

    @Test func highscoreSurvivesARestartOfTheGame() {
        let store = MemorySaveStore()
        let first = makeSession(config: quietConfig(cars: 1) { $0.rushHourCars = 0 }, store: store)
        first.advance([.confirm])
        finishShift(first)
        let second = makeSession(store: store)
        #expect(second.save.highscore == 1_100)
        let texts = second.advance().texts
        // The shift paid its level: base plus one level step.
        let pay = Config().shiftPayBase + Config().shiftPayPerLevel
        #expect(texts.contains(Strings.Ready.status(highscore: "1,100", money: "\(pay)")))
        #expect(texts.contains(Strings.HUD.level(2)))
    }

    @Test func afterAShiftTheNextLevelRollsInBehindTheResult() {
        let session = makeSession(config: quietConfig(cars: 1))
        finishShift(session)
        session.run(seconds: GameSession.resultDelay + 0.2) { $0.isShowingResult }
        #expect(session.playingLevel == 2)
        #expect(session.world.shift.phase == .waiting)
        #expect(session.world.queue.vehicles.count == 1)
        // The new cars roll into the queue before any tap.
        if case .filling = session.world.queue.state {} else { Issue.record("the queue does not roll in") }
    }

    @Test func aCompletedShiftIsALevelUpALostOneIsPlayedAgain() {
        let store = MemorySaveStore()
        let session = makeSession(config: quietConfig(cars: 1) { $0.maxStrikes = 1; $0.policeShare = 0 }, store: store)
        #expect(session.playingLevel == 1)
        finishShift(session)
        #expect(store.game?.career.level == 2)
        session.run(seconds: GameSession.resultDelay + ResultBanner.inputLock + 0.5) { $0.isShowingResult }
        session.run(seconds: ResultBanner.inputLock + 0.3)
        // Behind the result the next level has rolled in already.
        #expect(session.playingLevel == 2)
        #expect(session.world.shift.phase == .waiting)
        // Lost: level 2 again.
        crashNextCar(session)
        #expect(session.world.shift.outcome == .struckOut)
        #expect(store.game?.career.level == 2)
        session.run(seconds: GameSession.resultDelay + 0.2) { $0.isShowingResult }
        session.run(seconds: ResultBanner.inputLock + 0.3)
        #expect(session.advance().texts.contains(Strings.Result.retryLevel(2)))
    }

    @Test func eachShiftIsBuiltForTheSavedLevel() {
        var saved = SaveGame()
        saved.career.level = 7
        let session = makeSession(store: MemorySaveStore(saved))
        #expect(session.playingLevel == 7)
        #expect(session.config.shiftCarsRange(atLevel: 7).contains(session.world.config.shiftCars))
        #expect(session.world.carsLeft == session.world.config.shiftCars)
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
        // Two from the file, thirteen in which `quietConfig` differs from Config.swift.
        #expect(session.advance().texts.contains(Strings.Notice.tuningLoaded(values: 2, changes: 2 + 13)))
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

@Suite("Tabs and upgrades")
struct TabTests {
    @Test func theTabBarSwitchesPagesBetweenShiftsOnly() {
        let session = makeSession()
        session.advance([.selectTab(.upgrades)])
        #expect(session.screen == .page(.upgrades))
        #expect(session.content?.title == Strings.Upgrades.title)
        session.advance([.nextTab])
        #expect(session.screen == .page(.streetBuilder))
        session.advance([.nextTab])
        #expect(session.screen == .ready)
        session.advance([.selectTab(.shop)])
        session.advance([.back])
        #expect(session.screen == .ready)
        // During a shift the tab bar is hidden.
        session.advance([.tap])
        session.advance([.selectTab(.upgrades)])
        #expect(session.screen == .playing)
        #expect(!session.screen.showsTabBar)
    }

    @Test func fromTheResultToAPageAndBack() {
        let session = makeSession(config: quietConfig(cars: 1))
        session.advance([.confirm])
        finishShift(session)
        session.run(seconds: 3) { $0.isShowingResult }
        session.advance([.selectTab(.upgrades)])
        #expect(session.screen == .page(.upgrades))
        session.advance([.selectTab(.game)])
        #expect(session.screen == .ready)
        #expect(session.world.shift.phase == .waiting)
    }

    @Test func buyingAStepCostsItsPriceAndIsSaved() {
        var saved = SaveGame()
        saved.career.money = 5_000
        let store = MemorySaveStore(saved)
        let session = makeSession(store: store)
        let price = session.config.price(of: .morePatrols, step: 1)
        session.advance([.selectTab(.upgrades)])
        #expect(session.content?.items.first?.value == Strings.Upgrades.next(steps: 0, of: Upgrade.morePatrols.maxSteps, price: TextFormat(groupingSeparator: ",").number(price)))
        // One tap opens the card, the second one buys it.
        session.advance([.tapUpgrade(.morePatrols)])
        #expect(store.game?.career.steps(of: .morePatrols) == 0)
        session.advance([.tapUpgrade(.morePatrols)])
        #expect(store.game?.career.steps(of: .morePatrols) == 1)
        #expect(store.game?.career.money == 5_000 - price)
        // The next shift has more police in its queue.
        session.advance([.selectTab(.game)])
        session.advance([.tap])
        #expect(session.world.config.policeShare > session.config.policeShare)
    }

    @Test func withoutTheMoneyNothingIsBought() {
        let store = MemorySaveStore()
        let session = makeSession(store: store)
        session.advance([.selectTab(.upgrades)])
        session.advance([.tapUpgrade(.backup)])
        let texts = session.advance([.tapUpgrade(.backup)]).texts
        #expect(session.save.career.steps(of: .backup) == 0)
        let price = TextFormat(groupingSeparator: ",").number(session.config.price(of: .backup, step: 1))
        #expect(texts.contains(Strings.Notice.notEnoughMoney(price)))
    }

    @Test func oneTapOpensTheDetailsAndTwoBuy() {
        var saved = SaveGame()
        saved.career.money = 50_000
        let session = makeSession(store: MemorySaveStore(saved))
        session.advance([.selectTab(.upgrades)])
        let texts = session.advance([.tapUpgrade(.interceptor)]).texts
        // The details tell what it does and what the next step adds.
        #expect(session.upgradePage.selected == .interceptor)
        #expect(texts.contains(Strings.Upgrades.stepEffect(.interceptor, steps: 0, config: session.config)))
        #expect(session.save.career.steps(of: .interceptor) == 0)
        // A tap on another card only moves the details over.
        session.advance([.tapUpgrade(.overtime)])
        #expect(session.upgradePage.selected == .overtime)
        #expect(session.save.career.steps(of: .overtime) == 0)
        // Two taps in a row on the same card buy it.
        session.advance([.tapUpgrade(.overtime)])
        #expect(session.save.career.steps(of: .overtime) == 1)
        #expect(session.upgradePage.purchase?.upgrade == .overtime)
    }

    @Test func aSlowSecondTapOnlyOpensItAgain() {
        var saved = SaveGame()
        saved.career.money = 50_000
        let session = makeSession(store: MemorySaveStore(saved))
        session.advance([.selectTab(.upgrades)])
        session.advance([.tapUpgrade(.morePatrols)])
        session.run(seconds: GameSession.doubleTapWindow + 0.2)
        session.advance([.tapUpgrade(.morePatrols)])
        #expect(session.save.career.steps(of: .morePatrols) == 0)
    }

    @Test func enterBuysTheOpenUpgrade() {
        var saved = SaveGame()
        saved.career.money = 50_000
        let session = makeSession(store: MemorySaveStore(saved))
        session.advance([.selectTab(.upgrades)])
        // Numbers pick a card, like a tap.
        session.advance([.choose(2)])
        #expect(session.upgradePage.selected == .longerPursuit)
        session.advance([.confirm])
        #expect(session.save.career.steps(of: .longerPursuit) == 1)
    }

    @Test func thePurchaseAnimationRunsAndTheBalanceCountsDown() {
        var saved = SaveGame()
        saved.career.money = 50_000
        let session = makeSession(store: MemorySaveStore(saved))
        session.advance([.selectTab(.upgrades)])
        session.advance([.tapUpgrade(.cashRoute)])
        session.advance([.tapUpgrade(.cashRoute)])
        let price = session.config.price(of: .cashRoute, step: 1)
        // It counts from what was there down to what is left.
        #expect(UpgradePage.countedMoney(career: session.save.career, state: session.upgradePage) > 50_000 - price / 4)
        session.run(seconds: UpgradePage.countDuration / 2)
        let midway = UpgradePage.countedMoney(career: session.save.career, state: session.upgradePage)
        #expect(midway < 50_000 && midway > 50_000 - price)
        session.run(seconds: UpgradePage.purchaseDuration)
        #expect(session.upgradePage.purchase == nil)
        #expect(UpgradePage.countedMoney(career: session.save.career, state: session.upgradePage) == 50_000 - price)
    }

    @Test func aRefusedPurchaseShakesTheCard() {
        let session = makeSession()
        session.advance([.selectTab(.upgrades)])
        session.advance([.tapUpgrade(.backup)])
        session.advance([.tapUpgrade(.backup)])
        #expect(session.upgradePage.denied?.upgrade == .backup)
        #expect(session.upgradePage.purchase == nil)
    }

    @Test func everyCardHasItsPlaceAndPicture() {
        let viewport = Vec2(430, 900)
        let cards = UpgradePage.cards(viewport: viewport, bottomInset: TabStrip.height)
        #expect(cards.count == Upgrade.allCases.count)
        // Cards do not overlap, and a click in one finds it.
        for (upgrade, rect) in cards {
            #expect(UpgradePage.card(at: rect.center, viewport: viewport, bottomInset: TabStrip.height) == upgrade)
            #expect(rect.maxY <= viewport.y - TabStrip.height - UpgradePage.detailHeight)
        }
        // Every upgrade draws something.
        for upgrade in Upgrade.allCases {
            var list = RenderList(camera: Camera.fit(Rect(minX: -1, minY: -1, maxX: 1, maxY: 1), viewport: viewport, insets: Metrics.sceneInsets, verticalBias: 0), background: .background)
            var id = 0
            UpgradeArt.add(upgrade, in: Rect(minX: 0, minY: 0, maxX: 56, maxY: 56), opacity: 1, id: &id, to: &list)
            #expect(list.items.count >= 2)
        }
    }

    @Test func highAlertIsChosenBeforeTheShiftAndPaysTriple() {
        let store = MemorySaveStore()
        let session = makeSession(config: quietConfig(cars: 1) { $0.rushHourCars = 0 }, store: store)
        let texts = session.advance().texts
        #expect(texts.contains(Strings.Ready.duty(.normal, pay: session.config.highAlertPay)))
        let normalPay = session.world.config.shiftPay

        session.advance([.perform(.setDuty(.highAlert))])
        #expect(store.game?.career.duty == .highAlert)
        // The waiting shift is rebuilt at once, so it is the one that will be played.
        #expect(session.world.config.shiftPay == Int((Double(normalPay) * session.config.highAlertPay).rounded()))
        #expect(session.advance().texts.contains(Strings.Ready.duty(.highAlert, pay: session.config.highAlertPay)))
        // The HUD says so while playing.
        let alertPay = session.world.config.shiftPay
        session.advance([.tap])
        #expect(session.advance().texts.contains(Strings.HUD.level(1, duty: .highAlert)))

        finishShift(session)
        #expect(store.game?.career.money == alertPay)
    }

    @Test func theStripMapsClicksToTabs() {
        let viewport = Vec2(400, 800)
        #expect(TabStrip.tab(at: Vec2(10, 790), viewport: viewport) == .streetBuilder)
        #expect(TabStrip.tab(at: Vec2(150, 780), viewport: viewport) == .game)
        #expect(TabStrip.tab(at: Vec2(399, 799), viewport: viewport) == .upgrades)
        #expect(TabStrip.tab(at: Vec2(200, 400), viewport: viewport) == nil)
    }
}

@Suite("Street builder")
struct StreetBuilderTests {
    /// A session with money, open on the Street Builder tab.
    func builder(money: Int = 200_000) -> GameSession {
        var saved = SaveGame()
        saved.career.money = money
        let session = makeSession(store: MemorySaveStore(saved))
        session.advance([.selectTab(.streetBuilder)])
        session.advance()
        return session
    }

    /// Where a free slot is drawn on the page.
    func freeSlot(_ session: GameSession) -> (slot: Int, at: Vec2) {
        let map = StreetBuilderPage.map(viewport: viewport, bottomInset: TabStrip.height)
        let slot = (0..<session.config.armSlotCount).first {
            session.config.canBuildArm(inSlot: $0, built: session.save.career.armSlots)
        }!
        return (slot, StreetBuilderPage.slotPosition(slot, slots: session.config.armSlotCount, map: map))
    }

    @Test func aPartIsDraggedOntoAFreeSlotAndBuiltWithASecondTap() {
        let session = builder()
        let card = StreetBuilderPage.cards(viewport: viewport, bottomInset: TabStrip.height)[0]
        let target = freeSlot(session)
        let price = session.save.career.armPrice(config: session.config)!

        // Picking it up opens its details, dragging shows where it would land.
        session.advance([.pointerDown(card.rect.center)])
        #expect(session.builderPage.dragging?.part == .arm)
        #expect(session.builderPage.selected == .arm)
        session.advance([.pointerMove(target.at)])
        #expect(session.builderPage.target == target.slot)
        session.advance([.pointerUp(target.at)])
        #expect(session.builderPage.dragging == nil)
        #expect(session.builderPage.pending?.slot == target.slot)
        // Not built yet, and nothing paid.
        #expect(session.save.career.armSlots.count == 4)
        #expect(session.save.career.money == 200_000)

        // Two taps on it build it.
        session.advance([.pointerDown(target.at)])
        session.advance([.pointerDown(target.at)])
        #expect(session.save.career.armSlots.contains(target.slot))
        #expect(session.save.career.money == 200_000 - price)
        #expect(session.builderPage.pending == nil)
        #expect(session.builderPage.built?.slot == target.slot)
        // The roundabout the next shift is played on has the new arm.
        #expect(session.world.layout.arms.count == 5)
        #expect(session.world.layout.arms.contains { $0.slot == target.slot })
    }

    @Test func oneTapTakesAPlacedPartAwayAgain() {
        let session = builder()
        let card = StreetBuilderPage.cards(viewport: viewport, bottomInset: TabStrip.height)[0]
        let target = freeSlot(session)
        session.advance([.pointerDown(card.rect.center)])
        session.advance([.pointerUp(target.at)])
        #expect(session.builderPage.pending != nil)

        session.advance([.pointerDown(target.at)])
        // It fades out first, in case a second tap follows.
        #expect(session.builderPage.removing > 0)
        session.run(seconds: StreetBuilderPage.removeDuration + 0.2)
        #expect(session.builderPage.pending == nil)
        #expect(session.save.career.armSlots.count == 4)
    }

    @Test func partsOnlyLandOnSlotsThatAreFarEnoughApart() {
        let session = builder()
        let map = StreetBuilderPage.map(viewport: viewport, bottomInset: TabStrip.height)
        // Right next to the player's arm: too close.
        let tooClose = StreetBuilderPage.slotPosition(1, slots: session.config.armSlotCount, map: map)
        let card = StreetBuilderPage.cards(viewport: viewport, bottomInset: TabStrip.height)[0]
        session.advance([.pointerDown(card.rect.center)])
        session.advance([.pointerMove(tooClose)])
        #expect(session.builderPage.target == nil)
        session.advance([.pointerUp(tooClose)])
        #expect(session.builderPage.pending == nil)
    }

    @Test func withoutTheMoneyTheRingStaysAsItIs() {
        let session = builder(money: 100)
        let card = StreetBuilderPage.cards(viewport: viewport, bottomInset: TabStrip.height)[0]
        let target = freeSlot(session)
        session.advance([.pointerDown(card.rect.center)])
        session.advance([.pointerUp(target.at)])
        let texts = session.advance([.pointerDown(target.at)]).texts
        session.advance([.pointerDown(target.at)])
        #expect(session.save.career.armSlots.count == 4)
        #expect(session.builderPage.denied > 0 || texts.isEmpty == false)
    }

    @Test func aBiggerRoundaboutMeansMoreTrafficAndMorePay() {
        var career = Career()
        let config = Config()
        let small = career.config(from: config, seed: 5)
        career.armSlots = [0, 4, 8, 12, 2]
        let big = career.config(from: config, seed: 5)
        #expect(big.densityEnd > small.densityEnd)
        #expect(big.shiftPay > small.shiftPay)
        #expect(big.transporterInterval.upperBound < small.transporterInterval.upperBound)
        #expect(RoundaboutLayout(config: big).ringRadius > RoundaboutLayout(config: small).ringRadius)
    }
}

@Suite("Save game")
struct SaveGameTests {
    @Test func olderSavesFillInDefaults() throws {
        let game = try JSONDecoder().decode(SaveGame.self, from: Data(#"{ "highscore": 4200 }"#.utf8))
        #expect(game.highscore == 4_200)
        #expect(game.version == SaveGame.currentVersion)
        #expect(game.settings == Settings())
        #expect(game.career == Career())
    }

    @Test func moneyAndLevelFromBeforeTheCareerMoveIntoIt() throws {
        let game = try JSONDecoder().decode(SaveGame.self, from: Data(#"{ "money": 1200, "level": 4 }"#.utf8))
        #expect(game.career.money == 1_200)
        #expect(game.career.level == 4)
    }

    @Test func theCareerRoundTrips() throws {
        var game = SaveGame()
        game.career = Career(level: 6, money: 900)
        game.career.upgrades["backup"] = 1
        let data = try JSONEncoder().encode(game)
        #expect(try JSONDecoder().decode(SaveGame.self, from: data) == game)
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
        world.spawnRingCar(at: world.layout.entryRingS(world.layout.player) - world.ringSpeed * config.mergeDuration, exitArm: world.layout.arm(3))
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
