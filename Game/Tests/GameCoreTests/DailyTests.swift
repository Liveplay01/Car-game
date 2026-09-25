import Testing
@testable import GameCore

@Suite("Daily Shift, Challenges, Perfect Run (v1.2)")
struct DailyTests {
    let config = Config()

    func result(_ outcome: ShiftOutcome = .completed, perfects: Int = 0, takedowns: Int = 0, perfectRun: Bool = false) -> ShiftResult {
        var result = ShiftResult(outcome: outcome, score: 0, completionBonus: 0, bestCombo: 0, cleanMerges: 0, tightFits: 0, cutOffs: 0, crashes: 0, policeCrashes: 0, takedowns: takedowns, transporters: 0, money: 0, seed: 1, time: 10)
        result.perfects = perfects
        result.isPerfectRun = perfectRun
        return result
    }

    @Test func eachDayHasThreeDifferentChallengesTheSameForEveryone() {
        let today = Challenge.of(day: 20_000)
        #expect(today.count == 3)
        #expect(Set(today).count == 3)
        #expect(Challenge.of(day: 20_000) == today)
        let week = (20_000..<20_007).map { Challenge.of(day: $0) }
        #expect(Set(week.map { $0.map(\.rawValue).joined() }).count > 1)
    }

    @Test func aChallengePaysOncePerDay() {
        var career = Career()
        let day = (0..<500).first { Challenge.of(day: $0).contains(.perfectInputs) }!
        let done = career.recordChallenges(result(perfects: 5), duty: .normal, day: day)
        #expect(done.contains(.perfectInputs))
        let money = career.money
        #expect(money >= Challenge.perfectInputs.reward)
        let again = career.recordChallenges(result(perfects: 5), duty: .normal, day: day)
        #expect(!again.contains(.perfectInputs))
        #expect(career.money == money)
        // A new day, a new set.
        _ = career.recordChallenges(result(), duty: .normal, day: day + 1)
        #expect(!career.isDone(.perfectInputs, day: day + 1))
    }

    @Test func theDailyShiftPaysOnceAndTheStreakGrows() {
        var career = Career()
        let first = career.completeDaily(day: 100, config: config)
        #expect(first == config.dailyPay)
        // The Daily Shift brings an Event Chest (Leo, 25.09.2026).
        #expect(career.chests == [.event])
        #expect(career.completeDaily(day: 100, config: config) == nil)
        let second = career.completeDaily(day: 101, config: config)
        #expect(second == config.dailyPay * 2)
        #expect(career.dailyStreak == 2)
        // A gap resets the streak.
        _ = career.completeDaily(day: 105, config: config)
        #expect(career.dailyStreak == 1)
    }

    @Test func theDailySeedIsTheDaysAndItAlwaysHasAnEvent() {
        #expect(Career.dailySeed(day: 7) == Career.dailySeed(day: 7))
        #expect(Career.dailySeed(day: 7) != Career.dailySeed(day: 8))
        let event = Career.dailyEvent(day: -3)
        #expect(CityEvent.allCases.contains(event))
    }

    @Test func aCleanShiftIsAPerfectRunAndPaysMore() {
        var world = quietShift {
            $0.shiftCars = 1
            $0.criminalFirst = 1000...1000
            $0.transporterFirst = 1000...1000
        }
        world.tap(at: world.time)
        let events = world.run(steps: 5 * World.stepRate) { $0.shift.outcome != nil }
        let result = events.compactMap { if case let .shiftEnded(result) = $0 { result } else { nil } }.first
        #expect(result?.isPerfectRun == true)
        #expect(result.map { $0.money > world.config.shiftPay } == true)
    }

    @Test func aPoliceCrashSpoilsThePerfectRun() {
        var world = quietShift { $0.policeShare = 1 }
        world.crashNextCar()
        #expect(!world.isPerfectSoFar)
    }
}
