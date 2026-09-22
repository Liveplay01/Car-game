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
        #expect(result.merges > 60)
        #expect(result.tightFits > 0)
        // It catches every criminal of the shift.
        #expect(result.takedowns > 0)
    }

    @Test func randomTapperCrashesOften() {
        var crashes = 0
        for seed in UInt64(1)...3 {
            var bot = RandomBot(seed: seed)
            crashes += ShiftRunner.play(&bot, config: config, seed: seed).crashes
        }
        #expect(crashes >= 4)
    }

    @Test func sameSeedSameShift() {
        var first = HumanBot(seed: 7)
        var second = HumanBot(seed: 7)
        #expect(ShiftRunner.play(&first, config: config, seed: 7) == ShiftRunner.play(&second, config: config, seed: 7))
    }
}
