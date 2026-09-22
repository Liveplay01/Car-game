import Testing
@testable import GameCore

/// A shift without AI traffic, so a test controls every car.
func quietShift(_ adjust: (inout Config) -> Void = { _ in }) -> World {
    var config = Config()
    config.densityStart = 0
    config.densityEnd = 0
    config.rushHourDensityBonus = 0
    adjust(&config)
    return World(config: config, seed: 1, mode: .shift, prefill: false)
}

extension World {
    /// Waits for the queue, puts a ring car exactly where the next merge ends and taps.
    /// Returns the events up to and including the crash.
    @discardableResult
    mutating func crashNextCar() -> [GameEvent] {
        var events = run(steps: 2 * World.stepRate) { $0.queue.isReady }
        spawnRingCar(at: ringPositionAhead(ofMergeEnd: 0), exitArm: .west)
        tap(at: time)
        // Cars from an earlier crash may still be spinning out: wait for the new strike.
        let strikes = score.strikes
        events += run(steps: World.stepRate) { $0.score.strikes > strikes }
        return events
    }

    /// Waits for the queue, then merges the next car with a ring car `arc` ahead of the
    /// merge point (nil: none). Returns the events up to the rating.
    @discardableResult
    mutating func mergeNextCar(arc: Double? = nil) -> [GameEvent] {
        var events = run(steps: 2 * World.stepRate) { $0.queue.isReady }
        if let arc {
            spawnRingCar(at: ringPositionAhead(ofMergeEnd: arc), exitArm: .west)
        }
        tap(at: time)
        let merges = score.merges
        let strikes = score.strikes
        events += run(steps: World.stepRate) { $0.score.merges > merges || $0.score.strikes > strikes }
        return events
    }
}

@Suite("Rating rules")
struct RatingRuleTests {
    let config = Config()

    @Test(arguments: [(0, 1.0), (4, 1.0), (5, 1.5), (9, 1.5), (10, 2.0), (19, 2.0), (20, 3.0), (250, 3.0)])
    func comboMultiplier(combo: Int, multiplier: Double) {
        #expect(Scoring.multiplier(combo: combo, config: config) == multiplier)
    }

    @Test func tightFitLiesBelowTheThreshold() {
        #expect(Scoring.rate(minGap: 0.05, gapBehind: .infinity, config: config) == .tightFit)
        #expect(Scoring.rate(minGap: 0.1199, gapBehind: .infinity, config: config) == .tightFit)
        #expect(Scoring.rate(minGap: 0.12, gapBehind: .infinity, config: config) == .clean)
        #expect(Scoring.rate(minGap: .infinity, gapBehind: .infinity, config: config) == .clean)
    }

    @Test func cutOffIsOffByDefault() {
        #expect(Scoring.rate(minGap: 0.01, gapBehind: 0, config: config) == .tightFit)
    }

    @Test func cutOffWhenTheWindowIsOn() {
        var config = self.config
        config.sloppyWindow = 0.04
        #expect(Scoring.rate(minGap: 0.01, gapBehind: 0.03, config: config) == .cutOff)
        #expect(Scoring.rate(minGap: 0.05, gapBehind: 0.05, config: config) == .tightFit)
    }

    @Test func pointsUseMultiplierAndRushHour() {
        #expect(Scoring.points(for: .clean, combo: 0, rushHour: false, config: config) == 100)
        #expect(Scoring.points(for: .tightFit, combo: 0, rushHour: false, config: config) == 200)
        #expect(Scoring.points(for: .tightFit, combo: 5, rushHour: false, config: config) == 300)
        #expect(Scoring.points(for: .clean, combo: 10, rushHour: true, config: config) == 400)
        #expect(Scoring.points(for: .tightFit, combo: 20, rushHour: true, config: config) == 1200)
        #expect(Scoring.points(for: .cutOff, combo: 20, rushHour: true, config: config) == 0)
    }
}

@Suite("Scoring in the world")
struct ScoringTests {
    @Test func cleanMergeScoresAndRaisesTheCombo() {
        var world = emptyWorld()
        let events = world.mergeNextCar()
        let merge = events.compactMap(\.merge).first
        #expect(merge?.rating == .clean)
        #expect(merge?.points == 100)
        #expect(merge?.combo == 1)
        #expect(world.score.points == 100)
        #expect(world.score.cleanMerges == 1)
    }

    @Test func tightFitScoresDoubleAndRaisesTheComboByTwo() {
        var world = emptyWorld()
        let merge = world.mergeNextCar(arc: world.config.carLength + 6).compactMap(\.merge).first
        #expect(merge?.rating == .tightFit)
        #expect(merge?.points == 200)
        #expect(world.score.combo == 2)
        #expect(world.score.tightFits == 1)
    }

    @Test func mergeComesBeforeItsComboChange() {
        var world = emptyWorld()
        let events = world.mergeNextCar()
        let mergeIndex = events.firstIndex { $0.merge != nil }
        let comboIndex = events.firstIndex { $0.comboChange != nil }
        #expect(mergeIndex != nil && comboIndex != nil)
        if let mergeIndex, let comboIndex {
            #expect(mergeIndex < comboIndex)
        }
    }

    @Test func reachingATierAppliesFromTheNextMerge() {
        var world = emptyWorld()
        world.score.combo = 4
        let first = world.mergeNextCar()
        #expect(first.compactMap(\.merge).first?.points == 100)
        let change = first.compactMap(\.comboChange).first
        #expect(change?.isTierUp == true)
        #expect(change?.multiplier == 1.5)
        let second = world.mergeNextCar()
        #expect(second.compactMap(\.merge).first?.points == 150)
        #expect(world.score.bestCombo == 6)
    }

    @Test func crashResetsTheComboAndCostsAStrike() {
        var world = emptyWorld()
        world.mergeNextCar()
        world.mergeNextCar()
        #expect(world.score.combo == 2)
        let events = world.crashNextCar()
        let crash = events.compactMap(\.crash).first
        #expect(crash?.strikes == 1)
        #expect(crash?.penalty == 200)
        #expect(world.score.points == 0)
        #expect(world.score.combo == 0)
        #expect(world.score.bestCombo == 2)
        #expect(events.compactMap(\.comboChange).last?.combo == 0)
    }

    @Test func scoreNeverDropsBelowZero() {
        var world = emptyWorld()
        let crash = world.crashNextCar().compactMap(\.crash).first
        #expect(crash?.penalty == 0)
        #expect(world.score.points == 0)
    }

    @Test func cutOffResetsTheComboWithoutAStrike() {
        var config = Config()
        config.sloppyWindow = 0.2
        var world = emptyWorld(config: config)
        world.score.combo = 3
        let merge = world.mergeNextCar(arc: -(config.carLength + 6)).compactMap(\.merge).first
        #expect(merge?.rating == .cutOff)
        #expect(merge?.points == 0)
        #expect(merge.map { $0.gapBehind < 0.2 } == true)
        #expect(world.score.combo == 0)
        #expect(world.score.strikes == 0)
    }

    @Test func freePlayHasNoStrikeLimit() {
        var config = Config()
        config.maxStrikes = 1
        var world = emptyWorld(config: config)
        world.crashNextCar()
        world.crashNextCar()
        #expect(world.score.strikes == 2)
        #expect(world.shift.outcome == nil)
    }
}

@Suite("Strikes")
struct StrikeTests {
    @Test func thirdStrikeAbortsTheShift() {
        var world = quietShift()
        var events: [GameEvent] = []
        for _ in 0..<3 {
            events += world.crashNextCar()
        }
        #expect(world.score.strikes == 3)
        #expect(world.shift.outcome == .struckOut)
        let result = events.compactMap(\.shiftResult).first
        #expect(result?.outcome == .struckOut)
        #expect(result?.completionBonus == 0)
        #expect(result?.crashes == 3)
        // The shift ends in the same step as the crash that caused it.
        #expect(events.last?.shiftResult != nil)
    }

    @Test func oneStrikeModeEndsAtTheFirstCrash() {
        var world = quietShift { $0.maxStrikes = 1 }
        let events = world.crashNextCar()
        #expect(events.compactMap(\.shiftResult).first?.outcome == .struckOut)
    }

    @Test func abortedShiftIgnoresTapsAndScoresNothingMore() {
        var world = quietShift { $0.maxStrikes = 1 }
        world.crashNextCar()
        let points = world.score.points
        world.run(steps: World.stepRate)
        world.tap(at: world.time)
        let events = world.run(steps: World.stepRate)
        #expect(!events.contains { if case .launched = $0 { true } else { false } })
        #expect(world.score.points == points)
    }
}

@Suite("Shift")
struct ShiftTests {
    let config = Config()

    @Test(arguments: [(0.0, 3), (12, 3), (13, 4), (50, 5), (99, 7), (100, 9), (119, 9)])
    func densityRisesThenJumpsForRushHour(time: Double, density: Int) {
        #expect(ShiftCurves.density(at: time, config: config) == density)
    }

    @Test func tempoRisesSlowlyThenRampsForRushHour() {
        #expect(ShiftCurves.tempo(at: 0, config: config) == 1)
        #expect(abs(ShiftCurves.tempo(at: 50, config: config) - 1.05) < 1e-9)
        #expect(abs(ShiftCurves.tempo(at: 100, config: config) - 1.1) < 1e-9)
        let mid = ShiftCurves.tempo(at: 100.5, config: config)
        #expect(mid > 1.1 && mid < 1.25)
        #expect(abs(ShiftCurves.tempo(at: 101, config: config) - 1.25) < 1e-9)
        #expect(abs(ShiftCurves.tempo(at: 120, config: config) - 1.25) < 1e-9)
    }

    @Test func shiftRunsThroughRushHourToItsEnd() {
        var world = quietShift {
            $0.shiftSeconds = 4
            $0.rushHourSeconds = 1
        }
        let events = world.run(steps: 5 * World.stepRate) { $0.shift.outcome != nil }
        let rushTime = events.compactMap { event -> Double? in
            if case let .rushHour(time) = event { return time }
            return nil
        }
        #expect(rushTime.count == 1)
        #expect(rushTime.first.map { abs($0 - 3) < 0.01 } == true)
        let result = events.compactMap(\.shiftResult).first
        #expect(result?.outcome == .completed)
        #expect(result?.score == world.config.completionBonus)
        #expect(result.map { abs($0.time - 4) < 0.02 } == true)
        #expect(world.remainingTime == 0)
        #expect(abs(world.ringSpeed - world.config.ringSpeed * world.config.rushHourTempo) < 1e-9)
    }

    @Test func mergeInFlightAtTheEndStillCountsDoubled() {
        var world = quietShift {
            $0.shiftSeconds = 2
            $0.rushHourSeconds = 1
        }
        world.run(steps: Int(1.8 * Double(World.stepRate)))
        world.tap(at: world.time)
        let events = world.run(steps: 2 * World.stepRate) { $0.shift.outcome != nil }
        let merge = events.compactMap(\.merge).first
        let result = events.compactMap(\.shiftResult).first
        #expect(merge?.points == 200)
        #expect(result?.cleanMerges == 1)
        #expect(result?.score == 200 + world.config.completionBonus)
        #expect(result.map { $0.time > 2.2 } == true)
    }

    /// Found by the balancing bot (seed 779): the ring sped up during a merge, the car behind
    /// caught up and a well-timed Tight Fit became a crash. Merges now keep pace with the ring.
    @Test func tempoRampDuringAMergeKeepsTheTimedGap() {
        var world = quietShift {
            $0.shiftSeconds = 3
            $0.rushHourSeconds = 2
        }
        world.run(steps: Int(0.9 * Double(World.stepRate)))
        let events = world.mergeNextCar(arc: -(world.config.carLength + 2))
        #expect(events.compactMap(\.crash).isEmpty)
        #expect(events.compactMap(\.merge).first?.rating == .tightFit)
        #expect(world.ringSpeed > world.config.ringSpeed * world.config.tempoEnd)
    }

    @Test func tapsAfterTimeUpAreIgnored() {
        var world = quietShift { $0.shiftSeconds = 1 }
        world.run(steps: World.stepRate + 2)
        world.tap(at: world.time)
        let events = world.run(steps: World.stepRate)
        #expect(!events.contains { if case .launched = $0 { true } else { false } })
    }

    /// A full default shift with AI traffic, including rush hour: the AI never crashes,
    /// and a shift without taps earns exactly the completion bonus. No criminals here:
    /// nobody would chase them.
    @Test(arguments: [UInt64(1), 2, 3])
    func fullShiftWithoutTaps(seed: UInt64) {
        var config = self.config
        config.criminalFirst = 1e9...1e9
        var world = World(config: config, seed: seed)
        var events: [GameEvent] = []
        var peak = 0
        while world.shift.outcome == nil && world.time < config.shiftSeconds + 5 {
            world.step()
            events += world.takeEvents()
            peak = max(peak, world.roadCount)
        }
        #expect(events.compactMap(\.crash).isEmpty)
        #expect(events.filter(\.isRushHour).count == 1)
        let result = events.compactMap(\.shiftResult).first
        #expect(result?.outcome == .completed)
        #expect(result?.score == config.completionBonus)
        #expect(peak >= config.densityEnd)
    }
}
