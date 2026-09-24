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
        spawnRingCar(at: ringPositionAhead(ofMergeEnd: 0), exitArm: west)
        tap(at: time)
        // Cars from an earlier crash may still be spinning out: wait for the new strike.
        let (strikes, police) = (score.strikes, score.policeCrashes)
        events += run(steps: World.stepRate) { $0.score.strikes > strikes || $0.score.policeCrashes > police }
        return events
    }

    /// Waits for the queue, then merges the next car with a ring car `arc` ahead of the
    /// merge point (nil: none). Returns the events up to the rating.
    @discardableResult
    mutating func mergeNextCar(arc: Double? = nil) -> [GameEvent] {
        var events = run(steps: 2 * World.stepRate) { $0.queue.isReady }
        if let arc {
            spawnRingCar(at: ringPositionAhead(ofMergeEnd: arc), exitArm: west)
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
        #expect(Scoring.rate(minGap: 0.12, gapBehind: .infinity, config: config) == .nearMiss)
        #expect(Scoring.rate(minGap: .infinity, gapBehind: .infinity, config: config) == .clean)
    }

    @Test func nearMissLiesBetweenTightFitAndItsOwnThreshold() {
        #expect(Scoring.rate(minGap: 0.15, gapBehind: .infinity, config: config) == .nearMiss)
        #expect(Scoring.rate(minGap: 0.1999, gapBehind: .infinity, config: config) == .nearMiss)
        #expect(Scoring.rate(minGap: 0.2, gapBehind: .infinity, config: config) == .clean)
        #expect(Scoring.points(for: .nearMiss, combo: 0, rushHour: false, config: config) == 125)
    }

    @Test func perfectInputNeedsACentredRealGap() {
        // Centred in a real gap.
        #expect(Scoring.rate(minGap: 0.4, gapBehind: 0.5, gapAhead: 0.6, config: config) == .perfect)
        // Lopsided.
        #expect(Scoring.rate(minGap: 0.3, gapBehind: 0.3, gapAhead: 0.9, config: config) == .clean)
        // An empty ring on one side, or a huge gap: no feat.
        #expect(Scoring.rate(minGap: 0.5, gapBehind: .infinity, gapAhead: 0.5, config: config) == .clean)
        #expect(Scoring.rate(minGap: 1.5, gapBehind: 1.5, gapAhead: 1.5, config: config) == .clean)
        // A close call is a Near Miss, however centred.
        #expect(Scoring.rate(minGap: 0.15, gapBehind: 0.5, gapAhead: 0.5, config: config) == .nearMiss)
        #expect(Scoring.points(for: .perfect, combo: 0, rushHour: false, config: config) == 150)
    }

    @Test func onlyGoodMergesExtendTheChain() {
        #expect(MergeRating.perfect.extendsChain)
        #expect(MergeRating.nearMiss.extendsChain)
        #expect(MergeRating.tightFit.extendsChain)
        #expect(!MergeRating.clean.extendsChain)
        #expect(!MergeRating.cutOff.extendsChain)
    }

    @Test func theChainReachesTheFlowAndACrashEndsIt() {
        var world = quietShift { $0.flowChain = 3 }
        for _ in 0..<3 { world.extendChain(at: world.time) }
        #expect(world.isInFlow)
        #expect(world.takeEvents().contains { if case let .flowChanged(change) = $0 { change.isInFlow && change.chain == 3 } else { false } })
        _ = world.scoreCrash(byPolice: true, at: world.time)
        #expect(!world.isInFlow)
        #expect(world.score.bestChain == 3)
        #expect(world.takeEvents().contains { if case let .flowChanged(change) = $0 { !change.isInFlow } else { false } })
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
    @Test func aNormalCarsCrashEndsTheShift() {
        var world = quietShift { $0.policeShare = 0 }
        let events = world.crashNextCar()
        #expect(world.score.strikes == 1)
        #expect(world.shift.outcome == .struckOut)
        let result = events.compactMap(\.shiftResult).first
        #expect(result?.outcome == .struckOut)
        #expect(result?.completionBonus == 0)
        #expect(result?.crashes == 1)
        // The shift ends in the same step as the crash that caused it.
        #expect(events.last?.shiftResult != nil)
    }

    @Test func threeStrikeModeEndsAtTheThirdCrash() {
        var world = quietShift {
            $0.policeShare = 0
            $0.maxStrikes = 3
        }
        var events: [GameEvent] = []
        for _ in 0..<2 {
            events += world.crashNextCar()
        }
        #expect(world.shift.outcome == nil)
        events += world.crashNextCar()
        #expect(world.score.strikes == 3)
        #expect(world.shift.outcome == .struckOut)
        #expect(events.compactMap(\.shiftResult).first?.crashes == 3)
    }

    @Test func policeCarsSurviveThreeCrashesAndEndTheShiftAtTheFourth() {
        var world = quietShift { $0.policeShare = 1 }
        world.score.points = 5000
        var events: [GameEvent] = []
        for _ in 0..<3 {
            events += world.crashNextCar()
        }
        let crashes = events.compactMap(\.crash).filter(\.isStrike)
        let penalty = world.config.crashPenalty
        let allPolice = crashes.allSatisfy { $0.isPoliceCrash }
        let allPenalized = crashes.allSatisfy { $0.penalty == penalty }
        #expect(crashes.count == 3)
        #expect(allPolice)
        #expect(crashes.map(\.policeCrashes) == [1, 2, 3])
        // They cost points and the combo, but no strike.
        #expect(allPenalized)
        #expect(world.score.strikes == 0)
        #expect(world.shift.outcome == nil)
        events = world.crashNextCar()
        #expect(world.score.policeCrashes == 4)
        #expect(world.shift.outcome == .struckOut)
        #expect(events.compactMap(\.shiftResult).first?.policeCrashes == 4)
    }

    @Test func aPoliceCarsMistakeIsNotANormalCarsStrike() {
        // A police car merges into one of your normal cars that is already on the ring:
        // the police car made the mistake, so the shift goes on.
        var world = quietShift { $0.policeShare = 1 }
        world.run(steps: 2 * World.stepRate) { $0.queue.isReady }
        let own = world.spawnRingCar(at: world.ringPositionAhead(ofMergeEnd: 0), exitArm: world.west)
        if let index = world.index(of: own) {
            world.vehicles[index].owner = .player
        }
        world.tap(at: world.time)
        let events = world.run(steps: World.stepRate) { $0.score.policeCrashes > 0 || $0.score.strikes > 0 }
        let crash = events.compactMap(\.crash).first
        #expect(crash?.isPoliceCrash == true)
        #expect(world.score.strikes == 0)
        #expect(world.shift.outcome == nil)
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

    @Test func densityRisesOverTheRampThenStays() {
        #expect(ShiftCurves.density(at: 0, rushHour: false, config: config) == config.densityStart)
        #expect(ShiftCurves.density(at: config.rampSeconds, rushHour: false, config: config) == config.densityEnd)
        #expect(ShiftCurves.density(at: 10 * config.rampSeconds, rushHour: false, config: config) == config.densityEnd)
        #expect(ShiftCurves.density(at: 0, rushHour: true, config: config) == config.densityStart + config.rushHourDensityBonus)
    }

    @Test func tempoRisesOverTheRampThenRampsForRushHour() {
        #expect(ShiftCurves.tempo(at: 0, rushHourSince: nil, config: config) == config.tempoStart)
        let half = ShiftCurves.tempo(at: config.rampSeconds / 2, rushHourSince: nil, config: config)
        #expect(abs(half - (config.tempoStart + config.tempoEnd) / 2) < 1e-9)
        #expect(abs(ShiftCurves.tempo(at: 99, rushHourSince: nil, config: config) - config.tempoEnd) < 1e-9)
        let mid = ShiftCurves.tempo(at: 30.5, rushHourSince: 30, config: config)
        #expect(mid > config.tempoEnd && mid < config.rushHourTempo)
        #expect(abs(ShiftCurves.tempo(at: 31, rushHourSince: 30, config: config) - config.rushHourTempo) < 1e-9)
    }

    @Test func theShiftEndsOnceTheLastCarIsIn() {
        var world = quietShift {
            $0.shiftCars = 3
            $0.rushHourCars = 0
        }
        var events: [GameEvent] = []
        for _ in 0..<3 {
            events += world.mergeNextCar()
        }
        events += world.run(steps: World.stepRate) { $0.shift.outcome != nil }
        let result = events.compactMap(\.shiftResult).first
        #expect(result?.outcome == .completed)
        #expect(result?.cleanMerges == 3)
        // Three clean merges, the bonus, and the Perfect Run: not a single crash.
        #expect(result?.score == 3 * world.config.pointsClean + world.config.completionBonus + world.config.perfectRunPoints)
        #expect(result?.isPerfectRun == true)
        #expect(world.carsLeft == 0)
        // It took as long as the player needed: no clock.
        #expect(result.map { $0.time < 3 } == true)
    }

    @Test func theNextShiftCarriesTheTrafficOn() {
        var world = quietShift { $0.shiftCars = 1 }
        world.mergeNextCar()
        let ringCar = world.spawnRingCar(at: 300, exitArm: world.west)
        world.run(steps: World.stepRate) { $0.shift.outcome != nil }
        var next = Config()
        next.shiftCars = 4
        let following = world.nextShift(config: next, seed: 9)
        let carried = following.vehicle(id: ringCar)
        #expect(carried?.position == world.vehicle(id: ringCar)?.position)
        #expect(carried?.owner == .ai)
        #expect(following.shift.phase == .waiting)
        #expect(following.queue.vehicles.count == 4)
        #expect(Set(following.vehicles.map(\.id)).count == following.vehicles.count)
        // The tempo glides from where it was; the new cars roll in from behind.
        #expect(following.ringSpeed == world.ringSpeed)
        if case .filling = following.queue.state {} else { Issue.record("the queue does not roll in") }
    }

    @Test func aWaitingShiftStartsWithItsFirstTap() {
        var world = World(config: quietShift().config, seed: 3, prefill: false, startsOnFirstTap: true)
        world.run(steps: 30 * World.stepRate)
        // No criminal and no clock while it waits.
        let announced: Bool
        if case .idle = world.criminal.phase { announced = false } else { announced = true }
        #expect(!announced)
        #expect(world.shift.startedAt == nil)
        world.tap(at: world.time)
        world.step()
        #expect(world.shift.startedAt != nil)
        if case let .idle(next) = world.criminal.phase {
            #expect(next > world.time)
        }
    }

    @Test func withoutTapsTheShiftNeverEnds() {
        var world = quietShift { $0.criminalFirst = 1e9...1e9 }
        world.run(steps: 60 * World.stepRate)
        #expect(world.shift.outcome == nil)
        #expect(world.carsLeft == world.config.shiftCars)
    }

    @Test func theQueueHoldsOnlyTheCarsLeft() {
        var world = quietShift { $0.shiftCars = 3 }
        #expect(world.queue.vehicles.count == 3)
        world.mergeNextCar()
        #expect(world.queue.vehicles.count == 2)
        #expect(world.carsLeft == 2)
    }

    @Test func theLastCarsAreRushHour() {
        var world = quietShift {
            $0.shiftCars = 4
            $0.rushHourCars = 2
        }
        world.mergeNextCar()
        world.mergeNextCar()
        #expect(!world.shift.isRushHour)
        // The first of the last two cars starts rush hour and is doubled already.
        let events = world.mergeNextCar()
        #expect(world.shift.isRushHour)
        #expect(events.filter(\.isRushHour).count == 1)
        #expect(events.compactMap(\.merge).first?.points == 2 * world.config.pointsClean)
        world.run(steps: 2 * World.stepRate) { $0.ringSpeed >= $0.config.ringSpeed * $0.config.rushHourTempo - 1e-9 }
        #expect(abs(world.ringSpeed - world.config.ringSpeed * world.config.rushHourTempo) < 1e-9)
    }

    @Test func aShortShiftIsRushHourFromTheStart() {
        let world = quietShift {
            $0.shiftCars = 3
            $0.rushHourCars = 4
        }
        #expect(world.shift.isRushHour)
    }

    /// Found by the balancing bot (seed 779): the ring sped up during a merge, the car behind
    /// caught up and a well-timed Tight Fit became a crash. Merges now keep pace with the ring.
    @Test func tempoRampDuringAMergeKeepsTheTimedGap() {
        // The second merge is the last car, the one that starts rush hour: the tempo rises
        // while it runs.
        var world = quietShift {
            $0.shiftCars = 2
            $0.rushHourCars = 1
        }
        world.mergeNextCar()
        let events = world.mergeNextCar(arc: -(world.config.carLength + 2))
        #expect(events.compactMap(\.crash).isEmpty)
        #expect(events.compactMap(\.merge).first?.rating == .tightFit)
        #expect(world.shift.rushHourSince != nil)
        #expect(world.ringSpeed > world.config.ringSpeed * world.config.tempoStart)
    }

    @Test func tapsAfterTheLastCarAreIgnored() {
        var world = quietShift { $0.shiftCars = 1 }
        world.mergeNextCar()
        world.tap(at: world.time)
        let events = world.run(steps: World.stepRate)
        #expect(!events.contains { if case .launched = $0 { true } else { false } })
    }

    /// The AI never crashes in a busy shift, and traffic builds up. `densityEnd` is a ceiling:
    /// the ring fills only as far as the AI's safe gaps allow.
    @Test(arguments: [UInt64(1), 2, 3])
    func busyTrafficNeverCrashes(seed: UInt64) {
        var config = self.config
        config.criminalFirst = 1e9...1e9
        var world = World(config: config, seed: seed)
        var events: [GameEvent] = []
        var peak = 0
        for _ in 0..<(40 * World.stepRate) {
            world.step()
            events += world.takeEvents()
            peak = max(peak, world.roadCount)
        }
        #expect(events.compactMap(\.crash).isEmpty)
        #expect(peak > config.densityStart)
    }
}
