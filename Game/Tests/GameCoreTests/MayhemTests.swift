import Testing
@testable import GameCore

@Suite("Mayhem: crash as much as you can")
struct MayhemTests {
    func mayhem() -> World {
        quietShift { config in
            config = config.forMayhem()
            config.densityStart = 0
            config.densityEnd = 0
            config.minRingBots = 0
            config.crashCostLevel = 1
        }
    }

    @Test func crashesBurnInsteadOfEndingTheShift() {
        var world = mayhem()
        #expect(world.carsLeft == world.config.mayhemCars)
        let events = world.crashNextCar()
        let crash = events.compactMap { event -> CrashReport? in
            if case let .crash(report) = event, report.flames > 0 { return report }
            return nil
        }.first
        #expect(crash?.flames == 1)
        #expect(crash?.chain == 1)
        #expect(world.score.flames == 1)
        // No strike, no cost, no end: the run goes on.
        #expect(world.score.strikes == 0)
        #expect(world.score.costs == 0)
        #expect(world.shift.outcome == nil)
        #expect(world.shift.acceptsTaps)
    }

    @Test func aChainReactionIsWorthItsPlace() {
        var world = mayhem()
        let now = world.time
        let chain = (0..<4).map { step in world.scoreMayhem(at: now + Double(step) * 0.5) }
        #expect(chain.map(\.chain) == [1, 2, 3, 4])
        #expect(chain.map(\.flames) == [1, 2, 3, 4])
        #expect(world.score.flames == 10)
        #expect(world.score.biggestChain == 4)
        // After the window a new chain starts.
        let later = world.scoreMayhem(at: now + 1.5 + world.config.mayhemChainWindow + 0.1)
        #expect(later.chain == 1)
        // A crash is worth its place in the chain, up to a cap.
        var last = (flames: 0, chain: 0)
        for step in 0..<20 { last = world.scoreMayhem(at: now + 100 + Double(step) * 0.1) }
        #expect(last.chain == 20)
        #expect(last.flames == world.config.mayhemMaxChainFlames)
    }

    @Test func onlyFollowUpsExtendAChain() {
        var world = mayhem()
        let now = world.time
        _ = world.scoreMayhem(at: now, followUp: false)
        let followUp = world.scoreMayhem(at: now + 0.2)
        #expect(followUp.chain == 2)
        // The player's next car into the same wreck: a new chain, one flame.
        let ownCrash = world.scoreMayhem(at: now + 0.4, followUp: false)
        #expect(ownCrash.chain == 1 && ownCrash.flames == 1)
    }

    @Test func mayhemHasNoMoneyAndNoCriminals() {
        let config = Config().forMayhem()
        #expect(config.shiftCars == config.mayhemCars)
        #expect(config.shiftPay == 0 && config.completionBonus == 0)
        #expect(config.criminalChance == 0 && config.policeShare == 0)
        #expect(config.densityEnd == Config().densityEnd + config.mayhemExtraTraffic)
        let world = World(config: config, seed: 3, mode: .shift)
        #expect(world.transporter.phase == .idle(next: .infinity))
    }
}
