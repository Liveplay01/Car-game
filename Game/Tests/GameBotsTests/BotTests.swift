import Testing
import GameCore
@testable import GameBots

@Suite("Balancing bots")
struct BotTests {
    let config = Config()

    /// A player with perfect timing and judgement must never crash. If it does, the game
    /// produced a crash nobody could have seen coming (FOUNDATION.md 5, M2 step 7).
    @Test(arguments: [UInt64(1), 2, 3])
    func perfectBotNeverCrashes(seed: UInt64) {
        var bot = PerfectBot()
        let result = ShiftRunner.play(&bot, config: config, seed: seed)
        #expect(result.crashes == 0, "replay with --seed \(seed)")
        #expect(result.outcome == .completed)
        // Every car of the shift is in: merged, or spent on a takedown.
        #expect(result.merges + result.takedowns == config.shiftCars)
    }

    /// Tapping without looking loses: a normal car's first crash ends the shift.
    /// Faster and denser levels stay fair: the perfect bot never crashes on any of them.
    @Test(arguments: [1, 10, 25])
    func perfectBotNeverCrashesAtAnyLevel(level: Int) {
        for seed in UInt64(1)...2 {
            var bot = PerfectBot()
            let result = ShiftRunner.play(&bot, config: config.forLevel(level, seed: seed), seed: seed)
            #expect(result.crashes == 0, "replay with --level \(level) --seed \(seed)")
            #expect(result.policeCrashes == 0)
        }
    }

    @Test func randomTapperLosesItsShifts() {
        for seed in UInt64(1)...3 {
            var bot = RandomBot(seed: seed)
            let result = ShiftRunner.play(&bot, config: config, seed: seed)
            #expect(result.outcome != .completed, "seed \(seed)")
        }
    }

    /// A player sending cars as fast as the gaps allow still finds bots on the ring all the
    /// time (ROADMAP.md, bots in the ring). Right after a crash wrecked some of them it takes
    /// a moment until their replacements are in; calm traffic always has the minimum.
    @Test(arguments: [1, 5, 12, 25])
    func ringNeverHasFewerThanThreeBotsWhilePlaying(level: Int) {
        for seed in UInt64(1)...4 {
            let shift = config.forLevel(level, seed: seed)
            var world = World(config: shift, seed: seed)
            var bot = HumanBot(seed: seed)
            var lastDisturbed = -Double.infinity
            var ended = false
            while !ended && world.time < ShiftRunner.timeLimit {
                if case let .tap(time) = bot.decide(world) { world.tap(at: time) }
                world.step()
                if world.isTrafficDisturbed { lastDisturbed = world.time }
                ended = world.takeEvents().contains { if case .shiftEnded = $0 { true } else { false } }
                if world.time - lastDisturbed > 5 {
                    #expect(world.ringBotCount >= max(3, shift.minRingBots), "level \(level), seed \(seed), t \(world.time)")
                }
            }
        }
    }

    /// Level 20 as the game builds it: level, roundabout, duty, weather, city event.
    func levelTwenty(_ seed: UInt64) -> Config {
        let base = config.forLevel(20, seed: seed).forArms().forDuty(.normal)
        return base
            .forWeather(base.drawWeather(level: 20, seed: seed))
            .forCityEvent(base.drawCityEvent(level: 20, seed: seed), seed: seed)
    }

    /// Plays a shift until it ends or `limit` seconds pass. Returns the shift time and the
    /// longest stretch of disturbed traffic with no wreck left on the road.
    func play(_ shift: Config, seed: UInt64, perfect: Bool, limit: Double) -> (ended: Bool, calmAfterWrecks: Double) {
        var world = World(config: shift, seed: seed)
        var human = HumanBot(seed: seed)
        var perfectBot = PerfectBot()
        var since: Double?
        var longest = 0.0
        while world.time < limit {
            switch perfect ? perfectBot.decide(world) : human.decide(world) {
            case let .tap(time): world.tap(at: time)
            case .dispatch: world.dispatchPolice()
            case nil: break
            }
            world.step()
            if world.takeEvents().contains(where: { if case .shiftEnded = $0 { true } else { false } }) {
                return (true, longest)
            }
            if world.isTrafficDisturbed && !world.vehicles.contains(where: \.isCrashed) {
                since = since ?? world.time
                longest = max(longest, world.time - (since ?? world.time))
            } else {
                since = nil
            }
        }
        return (false, longest)
    }

    /// Regression: after a crash the bots braked for each other all the way round the ring,
    /// and the rule that holds them on it kept that jam going (level 20, seeds 62 and 221,
    /// both with roadworks). The perfect bot, which waits for calm traffic, waited for good.
    /// A bot stuck out of the flow may leave, so the jam dissolves and the shift ends.
    @Test(arguments: [UInt64(62), 221])
    func aJamAfterACrashDissolves(seed: UInt64) {
        #expect(play(levelTwenty(seed), seed: seed, perfect: false, limit: 150).ended, "human bot, seed \(seed)")
        #expect(play(levelTwenty(seed), seed: seed, perfect: true, limit: ShiftRunner.timeLimit).ended, "perfect bot, seed \(seed)")
    }

    /// Drivers see slow traffic coming and roll up to it gently (Leo), so after a crash the
    /// ring flows again soon: with no slow zone, a few seconds after the last wreck is gone.
    @Test(arguments: [UInt64(5), 9])
    func trafficFlowsAgainSoonAfterTheWrecksAreGone(seed: UInt64) {
        let shift = levelTwenty(seed)
        #expect(shift.cityEvent != .roadworks)
        #expect(play(shift, seed: seed, perfect: false, limit: 150).calmAfterWrecks <= 8, "seed \(seed)")
    }

    @Test func sameSeedSameShift() {
        var first = HumanBot(seed: 7)
        var second = HumanBot(seed: 7)
        #expect(ShiftRunner.play(&first, config: config, seed: 7) == ShiftRunner.play(&second, config: config, seed: 7))
    }
}
