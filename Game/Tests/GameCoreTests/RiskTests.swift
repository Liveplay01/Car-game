import Testing
@testable import GameCore

@Suite("Risk and insurance (M7)")
struct RiskTests {
    let config = Config()

    @Test func crashCostsGrowWithTheImpact() {
        #expect(config.crashCost(impact: 40) == 60)
        #expect(config.crashCost(impact: 100) == 120)
        #expect(config.crashCost(impact: 300) == 200)
    }

    @Test func insuranceSplitsTheCost() {
        let none = Config.insured(200, coverage: 0)
        let part = Config.insured(200, coverage: 0.45)
        let all = Config.insured(200, coverage: 1.5)
        #expect(none.paid == 200 && none.covered == 0)
        #expect(part.paid == 110 && part.covered == 90)
        #expect(all.paid == 0 && all.covered == 200)
    }

    @Test func crashesAreFreeBelowLevelTwenty() {
        var world = quietShift { $0.level = 19 }
        world.crashNextCar()
        #expect(world.score.costs == 0)
    }

    @Test func crashesCostFromLevelTwentyOn() {
        var world = quietShift { $0.level = 20 }
        let crash = world.crashNextCar().compactMap { if case let .crash(report) = $0, report.isStrike { report } else { nil } }.first
        #expect(world.score.costs > 0)
        #expect(crash?.cost == world.score.costs)
        #expect(world.score.money == -world.score.costs)
    }

    @Test func fullInsurancePaysEverything() {
        var world = quietShift {
            $0.level = 25
            $0.crashInsurance = 1
        }
        world.crashNextCar()
        #expect(world.score.costs == 0)
        #expect(world.score.covered > 0)
    }

    @Test func sevenStepsOfInsuranceCoverItAll() {
        let bought = config.upgraded { $0 == .insurance || $0 == .robberyInsurance ? 7 : 0 }
        #expect(bought.crashInsurance == 1)
        #expect(bought.robberyInsurance == 1)
        let six = config.upgraded { $0 == .insurance ? 6 : 0 }
        #expect(abs(six.crashInsurance - 0.9) < 1e-9)
    }

    @Test func insurancesAreOfferedFromLevelTwenty() {
        #expect(!Upgrade.available(atLevel: 19, config: config).contains(.insurance))
        #expect(Upgrade.available(atLevel: 20, config: config).contains(.robberyInsurance))
        var career = Career(level: 19, money: 1_000_000)
        #expect(career.price(of: .insurance, config: config) == nil)
        let tooEarly = career.buy(.insurance, config: config)
        #expect(!tooEarly)
        career.level = 20
        let bought = career.buy(.insurance, config: config)
        #expect(bought)
    }

    @Test func theAccountNeverGoesBelowZero() {
        var career = Career(level: 20, money: 100)
        var world = quietShift { $0.level = 20 }
        world.crashNextCar()
        let result = world.result(outcome: .struckOut, at: world.time)
        career.record(result, playedAt: 20)
        #expect(career.money == max(0, 100 + result.money))
        #expect(career.money >= 0)
    }

    @Test func lateLevelsAreDenser() {
        let ten = config.forLevel(10, seed: 1)
        let twenty = config.forLevel(20, seed: 1)
        #expect(twenty.densityEnd > ten.densityEnd)
        #expect(twenty.aiSafeGap < ten.aiSafeGap)
        #expect(config.forLevel(80, seed: 1).aiSafeGap >= config.minAiSafeGap)
        #expect(twenty.level == 20)
    }
}
