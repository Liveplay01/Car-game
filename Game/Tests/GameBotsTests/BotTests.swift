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

    /// Regression: after a crash the bots braked for each other all the way round the ring,
    /// and the rule that holds them on it kept that jam going (level 20, seeds 62 and 221).
    /// The human bot played on for good; the perfect bot, which waits for calm traffic,
    /// waited for minutes. A bot in a jam with no cause left may leave, so it dissolves.
    @Test(arguments: [UInt64(62), 221])
    func aJamAfterACrashDissolves(seed: UInt64) {
        // Built like the game and `Sim` build a shift.
        let base = config.forLevel(20, seed: seed).forArms().forDuty(.normal)
        let shift = base
            .forWeather(base.drawWeather(level: 20, seed: seed))
            .forCityEvent(base.drawCityEvent(level: 20, seed: seed), seed: seed)
        for perfect in [false, true] {
            var world = World(config: shift, seed: seed)
            var human = HumanBot(seed: seed)
            var perfectBot = PerfectBot()
            var ended = false
            while !ended && world.time < 120 {
                switch perfect ? perfectBot.decide(world) : human.decide(world) {
                case let .tap(time): world.tap(at: time)
                case .dispatch: world.dispatchPolice()
                case nil: break
                }
                world.step()
                ended = world.takeEvents().contains { if case .shiftEnded = $0 { true } else { false } }
            }
            #expect(ended, "\(perfect ? "perfect" : "human") bot, seed \(seed)")
        }
    }

    @Test func sameSeedSameShift() {
        var first = HumanBot(seed: 7)
        var second = HumanBot(seed: 7)
        #expect(ShiftRunner.play(&first, config: config, seed: 7) == ShiftRunner.play(&second, config: config, seed: 7))
    }
}
