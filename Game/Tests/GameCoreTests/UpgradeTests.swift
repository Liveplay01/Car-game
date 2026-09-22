import Testing
@testable import GameCore

@Suite("Money and upgrades")
struct UpgradeTests {
    let config = Config()

    @Test func pricesGrowWithEveryStep() {
        let first = config.price(of: .morePatrols, step: 1)
        #expect(first == config.upgradeBaseCost)
        #expect(config.price(of: .morePatrols, step: 2) == Int(Double(first) * config.upgradeCostGrowth))
        // The strong ones cost more.
        #expect(config.price(of: .backup, step: 1) > first)
        #expect(config.price(of: .morePatrols, step: 3) % 50 == 0)
    }

    @Test func eachUpgradeChangesItsValue() {
        let bought = config.upgraded { $0.maxSteps }
        #expect(bought.policeShare > config.policeShare)
        #expect(bought.criminalTime > config.criminalTime)
        #expect(bought.criminalChance < config.criminalChance)
        #expect(bought.policeChaseSpeedFactor > config.policeChaseSpeedFactor)
        #expect(bought.dispatchComboFactor > config.dispatchComboFactor)
        #expect(bought.maxPoliceCrashes == config.maxPoliceCrashes + Upgrade.backup.maxSteps * config.backupPerStep)
        #expect(bought.transporterFirst.upperBound < config.transporterFirst.upperBound)
        #expect(bought.shiftPay > config.shiftPay)
        // Nothing bought, nothing changed.
        #expect(config.upgraded { _ in 0 } == config)
    }

    @Test func careerBuysOnlyWhatItCanAfford() {
        var career = Career(level: 1, money: config.upgradeBaseCost - 1)
        let tooPoor = career.buy(.morePatrols, config: config)
        #expect(!tooPoor)
        career.money += 1
        let bought = career.buy(.morePatrols, config: config)
        #expect(bought)
        #expect(career.money == 0)
        #expect(career.steps(of: .morePatrols) == 1)
        career.money = 1_000_000
        while career.buy(.morePatrols, config: config) {}
        #expect(career.steps(of: .morePatrols) == Upgrade.morePatrols.maxSteps)
        #expect(career.price(of: .morePatrols, config: config) == nil)
    }

    @Test func aCompletedShiftIsPaidAndALevelUp() {
        var world = quietShift {
            $0.shiftCars = 1
            $0.shiftPay = 700
        }
        let events = world.mergeNextCar() + world.run(steps: World.stepRate) { $0.shift.outcome != nil }
        guard let result = events.compactMap(\.shiftResult).first else {
            Issue.record("no result")
            return
        }
        #expect(result.money == 700)
        var career = Career(level: 3)
        career.record(result, playedAt: 3)
        #expect(career.level == 4)
        #expect(career.money == 700)
        // A lost shift keeps its money but not the level up.
        var lost = result
        lost.outcome = .struckOut
        career.record(lost, playedAt: 4)
        #expect(career.level == 4)
    }

    @Test func quietStreetsMeansFewerShiftsWithCriminals() {
        var quiet = config
        quiet.criminalChance = 0.5
        let withCriminal = (UInt64(1)...200).count { seed in
            World(config: quiet, seed: seed).criminal.phase != .idle(next: .infinity)
        }
        #expect(withCriminal > 70 && withCriminal < 130)
        #expect((UInt64(1)...50).allSatisfy { World(config: config, seed: $0).criminal.phase != .idle(next: .infinity) })
    }

    @Test func highAlertIsMoreWorkForMoreMoney() {
        let normal = config.forLevel(10, seed: 3)
        let alert = normal.forDuty(.highAlert)
        #expect(normal.forDuty(.normal) == normal)
        #expect(alert.shiftCars > normal.shiftCars)
        #expect(alert.criminalTime < normal.criminalTime)
        #expect(alert.criminalChance == 1)
        #expect(alert.shiftPay == Int((Double(normal.shiftPay) * config.highAlertPay).rounded()))
        #expect(alert.transporterPay == Int((Double(normal.transporterPay) * config.highAlertPay).rounded()))
        // The traffic itself stays as the level has it.
        #expect(alert.tempoEnd == normal.tempoEnd)
        #expect(alert.densityEnd == normal.densityEnd)
    }

    @Test func highAlertKeepsTheShortestChaseAsItIs() {
        // At a high level the countdown is already at its floor.
        let late = config.forLevel(60, seed: 3)
        #expect(late.criminalTime == config.minCriminalTime)
        #expect(late.forDuty(.highAlert).criminalTime == config.minCriminalTime)
    }

    @Test func theCareerBuildsTheShiftConfig() {
        var career = Career(level: 3)
        career.upgrades[Upgrade.longerPursuit.rawValue] = 2
        let shift = career.config(from: config, seed: 5)
        let level = config.forLevel(3, seed: 5)
        #expect(shift.shiftCars == level.shiftCars)
        #expect(shift.criminalTime == level.criminalTime + 2 * config.pursuitPerStep)
        #expect(shift.shiftPay == config.shiftPayBase + 3 * config.shiftPayPerLevel)
        // The same career on high alert: more cars, more money.
        career.duty = .highAlert
        #expect(career.config(from: config, seed: 5).shiftCars > shift.shiftCars)
        #expect(career.config(from: config, seed: 5).shiftPay > shift.shiftPay)
    }
}
