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

    @Test func sameSeedSameShift() {
        var first = HumanBot(seed: 7)
        var second = HumanBot(seed: 7)
        #expect(ShiftRunner.play(&first, config: config, seed: 7) == ShiftRunner.play(&second, config: config, seed: 7))
    }
}
