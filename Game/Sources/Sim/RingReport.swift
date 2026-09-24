import GameBots
import GameCore

/// Bots in the ring (ROADMAP.md, "Bots im Ring"): how many AI cars are on the ring while a
/// shift runs, and how many of the player's cars go in one after another with no bot between.
///
///     swift run -c release Sim --ring --shifts 200
///
/// Plays chains of shifts with the human-like bot, each continuing the one before like in
/// the game (`World.nextShift`), so the flowing change between shifts is measured too.
struct RingStats: Sendable {
    var samples = 0
    var botSum = 0
    var fewest = Int.max
    /// Samples with fewer bots on the ring than the level asks for.
    var belowMinimum = 0
    /// Of those, the ones in calm traffic: no wreck and nobody braking for `calmAfter` seconds,
    /// so the replacements for wrecked bots had time to come.
    var belowWhileFlowing = 0
    var merges = 0
    /// Runs that reached three of the player's cars in a row without a bot between.
    var runsOfThree = 0
    /// Of those, the ones that reached three in calm traffic.
    var calmRunsOfThree = 0
    var longestRuns: [Int] = []
    var completed = 0

    var shifts: Int { longestRuns.count }

    mutating func add(_ other: RingStats) {
        samples += other.samples
        botSum += other.botSum
        fewest = min(fewest, other.fewest)
        belowMinimum += other.belowMinimum
        belowWhileFlowing += other.belowWhileFlowing
        merges += other.merges
        runsOfThree += other.runsOfThree
        calmRunsOfThree += other.calmRunsOfThree
        longestRuns += other.longestRuns
        completed += other.completed
    }
}

extension Sim {
    static let ringLevels = [1, 3, 5, 8, 10, 15, 20, 25, 30]
    static let shiftsPerChain = 4
    static let calmAfter = 5.0

    static func printRing(options: Options, config: Config, source: String) async {
        let chains = max(1, options.shifts / shiftsPerChain)
        print("Bots in the ring · human bot · \(chains) chains × \(shiftsPerChain) shifts per level · \(source)\n")
        print("Level  Min  Avg bots  Fewest  Below min     calm  Runs ≥3/shift   calm  Longest run  Done")
        for level in ringLevels {
            let stats = await withTaskGroup(of: RingStats.self) { group in
                for chain in 0..<chains {
                    group.addTask { ringChain(level: level, seed: options.seed &+ UInt64(chain) &* 100, config: config) }
                }
                var total = RingStats()
                for await stats in group { total.add(stats) }
                return total
            }
            let minimum = config.forLevel(level, seed: options.seed).minRingBots
            let longest = stats.longestRuns.sorted()
            print(Report.pad(String(level), 5)
                + Report.pad(String(minimum), 5)
                + Report.pad(String(format: "%.1f", Double(stats.botSum) / Double(max(1, stats.samples))), 10)
                + Report.pad(String(stats.fewest), 8)
                + Report.pad(String(format: "%.1f%%", Double(stats.belowMinimum) / Double(max(1, stats.samples)) * 100), 11)
                + Report.pad(String(format: "%.1f%%", Double(stats.belowWhileFlowing) / Double(max(1, stats.samples)) * 100), 9)
                + Report.pad(String(format: "%.2f", Double(stats.runsOfThree) / Double(max(1, stats.shifts))), 15)
                + Report.pad(String(format: "%.2f", Double(stats.calmRunsOfThree) / Double(max(1, stats.shifts))), 7)
                + Report.pad("\(longest[longest.count / 2]) / \(longest.last ?? 0)", 13)
                + Report.pad(String(format: "%.0f%%", Double(stats.completed) / Double(max(1, stats.shifts)) * 100), 6))
        }
        print("\nAvg/Fewest/Below min: bots on the ring while a shift runs; calm: \(Int(calmAfter)) s after the last wreck or")
        print("braking car. Runs ≥3: your cars three or more in a row with no bot between. Longest run: median / max.")
    }

    /// A few shifts in a row at `level`, each continuing the traffic of the one before.
    static func ringChain(level: Int, seed: UInt64, config: Config) -> RingStats {
        var stats = RingStats()
        var shiftSeed = seed
        var world = World(config: shiftConfig(config, level: level, duty: .normal, seed: shiftSeed), seed: shiftSeed, mode: .shift, startsOnFirstTap: true)
        var bot = HumanBot(seed: shiftSeed)
        var run = 0
        var longest = 0
        var lastDisturbed = -Double.infinity
        var played = 0
        let limit = Int(ShiftRunner.timeLimit * Double(World.stepRate))
        var steps = 0
        while played < shiftsPerChain && steps < limit * shiftsPerChain {
            steps += 1
            switch bot.decide(world) {
            case let .tap(time): world.tap(at: time)
            case .dispatch: world.dispatchPolice()
            case nil: break
            }
            world.step()
            if world.isTrafficDisturbed { lastDisturbed = world.time }
            if world.shift.startedAt != nil && world.shift.outcome == nil {
                let bots = world.ringBotCount
                stats.samples += 1
                stats.botSum += bots
                stats.fewest = min(stats.fewest, bots)
                if bots < world.config.minRingBots {
                    stats.belowMinimum += 1
                    if world.time - lastDisturbed > calmAfter { stats.belowWhileFlowing += 1 }
                }
            }
            for event in world.takeEvents() {
                switch event {
                case let .merged(report):
                    stats.merges += 1
                    run = world.isRightBehindOwnCar(report.vehicle) ? run + 1 : 1
                    if run == 3 {
                        stats.runsOfThree += 1
                        if world.time - lastDisturbed > calmAfter { stats.calmRunsOfThree += 1 }
                    }
                    longest = max(longest, run)
                case let .shiftEnded(result):
                    played += 1
                    stats.longestRuns.append(longest)
                    if result.outcome == .completed { stats.completed += 1 }
                    run = 0
                    longest = 0
                    shiftSeed &+= 1
                    world = world.nextShift(config: shiftConfig(config, level: level, duty: .normal, seed: shiftSeed), seed: shiftSeed)
                    bot = HumanBot(seed: shiftSeed)
                default:
                    break
                }
            }
        }
        return stats
    }
}

extension World {
    /// The nearest car ahead of this one on the ring is one of the player's: no bot between.
    func isRightBehindOwnCar(_ id: Int) -> Bool {
        guard let me = vehicle(id: id), case let .ring(mine) = me.phase else { return false }
        var nearest: (distance: Double, owner: Owner)?
        for other in vehicles where other.id != id {
            guard case let .ring(ring) = other.phase else { continue }
            let ahead = layout.ringDistance(from: mine.s, to: ring.s)
            if ahead > 0, ahead < nearest?.distance ?? .infinity {
                nearest = (ahead, other.owner)
            }
        }
        return nearest?.owner == .player
    }
}


