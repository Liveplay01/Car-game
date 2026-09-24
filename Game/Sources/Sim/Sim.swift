import Foundation
import GameBots
import GameCore

/// Balancing bot: plays many shifts per bot and prints how the values play out.
///
///     swift run -c release Sim --shifts 1000 --seed 42
///     swift run -c release Sim --bot perfect --tuning ../TestWindow/tuning.json
///     swift run -c release Sim --level 12          one level (default: `hardLevel`)
///     swift run -c release Sim --curve --shifts 300 the difficulty curve, level by level
///     swift run -c release Sim --ring --shifts 200  bots on the ring, runs of your cars
///     swift run -c release Sim --career 60          whole careers: levels, money, upgrades
///     swift run -c release Sim --duty high          every shift on high alert
///
/// Shift i uses seed `seed + i`, so any shift can be replayed in the test window.
@main
struct Sim {
    static func main() async {
        guard let options = Options(arguments: CommandLine.arguments) else {
            print(Options.usage)
            exit(1)
        }
        var config = Config()
        var source = "Config.swift"
        if let path = options.tuningFile {
            do {
                let tuning = try Tuning.load(try Data(contentsOf: URL(fileURLWithPath: path)))
                config = tuning.config
                source = path
                for key in tuning.unknownKeys {
                    print("warning: \(path): unknown key \(key)")
                }
                for difference in Tuning.differences(config) {
                    print("  \(difference)")
                }
            } catch {
                print("error: \(path): \(error)")
                exit(1)
            }
        }

        let last = options.seed + UInt64(options.shifts - 1)
        if options.curve {
            await printCurve(options: options, config: config, source: source)
            return
        }
        if options.ring {
            await printRing(options: options, config: config, source: source)
            return
        }
        if let shifts = options.careerShifts {
            await printCareers(shifts: shifts, players: options.players, from: options.seed, config: config, duty: options.duty, source: source)
            return
        }
        let level = options.level ?? config.hardLevel
        let cars = config.shiftCarsRange(atLevel: level)
        let duty = options.duty == .highAlert ? " · high alert" : ""
        print("\(options.shifts) shifts per bot · level \(level), \(cars.lowerBound)–\(cars.upperBound) cars\(duty) · seeds \(options.seed)–\(last) · \(source)\n")
        print(Report.header)
        let started = Date()
        for kind in options.bots {
            let results = await play(kind, shifts: options.shifts, from: options.seed, config: config, level: level, duty: options.duty)
            print(Report(name: kind.name, results: results).line)
            if kind == .perfect, let crash = results.first(where: { $0.crashes > 0 }) {
                print("  ⚠ the perfect bot crashed in shift \(crash.seed): replay with --seed \(crash.seed)")
            }
        }
        print(String(format: "\n%.1f s", Date().timeIntervalSince(started)))
    }

    /// Plays the shifts in parallel on every core; the results come back in seed order.
    /// Every shift is built for `level`, like in the game.
    static func play(_ kind: BotKind, shifts: Int, from seed: UInt64, config: Config, level: Int, duty: Duty = .normal) async -> [ShiftResult] {
        await withTaskGroup(of: (Int, ShiftResult).self) { group in
            for index in 0..<shifts {
                group.addTask {
                    let shiftSeed = seed + UInt64(index)
                    // Like the game builds a shift: level, then the roundabout, then the duty.
                    return (index, kind.play(config: Self.shiftConfig(config, level: level, duty: duty, seed: shiftSeed), seed: shiftSeed))
                }
            }
            var results: [(Int, ShiftResult)] = []
            for await result in group {
                results.append(result)
            }
            return results.sorted { $0.0 < $1.0 }.map(\.1)
        }
    }
}

extension Sim {
    /// How hard each level is: share of completed shifts and their median time, for the
    /// human-like and the perfect bot.
    static func printCurve(options: Options, config: Config, source: String) async {
        print("Difficulty curve · \(options.shifts) shifts per level and bot · \(source)\n")
        print("Level   Cars    Human done  time    Perfect done  time")
        for level in [1, 2, 3, 4, 5, 7, 10, 15, 20, 25, 30] {
            let cars = config.shiftCarsRange(atLevel: level)
            var line = Report.pad(String(level), 5) + Report.pad("\(cars.lowerBound)–\(cars.upperBound)", 7)
            for kind in [BotKind.human, .perfect] {
                let results = await play(kind, shifts: options.shifts, from: options.seed, config: config, level: level, duty: options.duty)
                let done = results.filter { $0.outcome == .completed }.map(\.time).sorted()
                let share = Double(done.count) / Double(results.count) * 100
                let time = done.isEmpty ? "–" : String(format: "%.1f s", done[done.count / 2])
                line += Report.pad(String(format: "%.0f%%", share), kind == .human ? 12 : 14) + Report.pad(time, 8)
            }
            print(line)
        }
    }
}

extension Sim {
    /// One player's career with the human-like bot: from level 1, shift after shift. After
    /// every shift it buys what it can afford, the cheapest step first. Returns the career
    /// after each shift and whether that shift was completed.
    /// One shift of the curve as the game plays it: level, roundabout, duty, and the
    /// weather and city event drawn for it (M8).
    static func shiftConfig(_ config: Config, level: Int, duty: Duty, seed: UInt64) -> Config {
        let shift = config.forLevel(level, seed: seed).forArms().forDuty(duty)
        return shift
            .forWeather(shift.drawWeather(level: level, seed: seed))
            .forCityEvent(shift.drawCityEvent(level: level, seed: seed), seed: seed)
    }

    static func career(shifts: Int, seed: UInt64, config: Config, duty: Duty) -> [(career: Career, completed: Bool, earned: Int)] {
        var career = Career()
        career.duty = duty
        var history: [(Career, Bool, Int)] = []
        for index in 0..<shifts {
            let shiftSeed = seed &+ UInt64(index)
            var bot = HumanBot(seed: shiftSeed)
            let result = ShiftRunner.play(&bot, config: career.config(from: config, seed: shiftSeed), seed: shiftSeed)
            career.record(result, playedAt: career.level)
            while let cheapest = Upgrade.allCases
                .compactMap({ upgrade in career.price(of: upgrade, config: config).map { (upgrade, $0) } })
                .min(by: { $0.1 < $1.1 }), cheapest.1 <= career.money {
                career.buy(cheapest.0, config: config)
            }
            history.append((career, result.outcome == .completed, result.money))
        }
        return history
    }

    /// Medians over many careers at a few points: how far a player gets, and how fast the
    /// upgrades come.
    static func printCareers(shifts: Int, players: Int, from seed: UInt64, config: Config, duty: Duty, source: String) async {
        let alert = duty == .highAlert ? ", high alert" : ""
        print("Careers · \(players) players × \(shifts) shifts, human bot, buys the cheapest step it can afford\(alert) · \(source)\n")
        let careers = await withTaskGroup(of: (Int, [(career: Career, completed: Bool, earned: Int)]).self) { group in
            for player in 0..<players {
                group.addTask { (player, career(shifts: shifts, seed: seed &+ UInt64(player) &* 10_000, config: config, duty: duty)) }
            }
            var all: [(Int, [(career: Career, completed: Bool, earned: Int)])] = []
            for await career in group { all.append(career) }
            return all.sorted { $0.0 < $1.0 }.map(\.1)
        }
        func median(_ values: [Int]) -> Int { values.sorted()[values.count / 2] }
        let total = Upgrade.allCases.map(\.maxSteps).reduce(0, +)
        print("Shifts  Level  Done (last 10)  Earned/shift  Money left  Upgrade steps")
        for checkpoint in stride(from: 10, through: shifts, by: 10) {
            let states = careers.map { $0[checkpoint - 1].career }
            let recent = careers.flatMap { $0[(checkpoint - 10)..<checkpoint].map(\.completed) }
            let done = Double(recent.count { $0 }) / Double(recent.count) * 100
            let steps = median(states.map { career in Upgrade.allCases.map { career.steps(of: $0) }.reduce(0, +) })
            let earned = median(careers.map { $0[(checkpoint - 10)..<checkpoint].map(\.earned).reduce(0, +) / 10 })
            print(Report.pad(String(checkpoint), 6) + Report.pad(String(median(states.map(\.level))), 7)
                + Report.pad(String(format: "%.0f%%", done), 16) + Report.pad(String(earned), 14) + Report.pad(String(median(states.map(\.money))), 12)
                + Report.pad("\(steps)/\(total)", 15))
        }
    }
}

enum BotKind: String, CaseIterable, Sendable {
    case perfect
    case human
    case random

    var name: String { rawValue.prefix(1).uppercased() + rawValue.dropFirst() }

    func play(config: Config, seed: UInt64) -> ShiftResult {
        switch self {
        case .perfect:
            var bot = PerfectBot()
            return ShiftRunner.play(&bot, config: config, seed: seed)
        case .human:
            var bot = HumanBot(seed: seed)
            return ShiftRunner.play(&bot, config: config, seed: seed)
        case .random:
            var bot = RandomBot(seed: seed)
            return ShiftRunner.play(&bot, config: config, seed: seed)
        }
    }
}

struct Options {
    static let usage = """
        usage: swift run -c release Sim [--shifts 1000] [--seed 42] [--bot perfect|human|random|all] [--level 5 | --curve | --ring | --career 60 [--players 40]] [--duty high] [--tuning file.json]
        """

    var shifts = 1000
    var seed: UInt64 = 42
    var bots = BotKind.allCases
    var tuningFile: String?
    var level: Int?
    var curve = false
    var ring = false
    var careerShifts: Int?
    var players = 40
    var duty = Duty.normal

    init?(arguments: [String]) {
        var index = 1
        while index < arguments.count {
            let value = index + 1 < arguments.count ? arguments[index + 1] : nil
            switch arguments[index] {
            case "--shifts":
                guard let shifts = value.flatMap({ Int($0) }), shifts > 0 else { return nil }
                self.shifts = shifts
            case "--seed":
                guard let seed = value.flatMap({ UInt64($0) }) else { return nil }
                self.seed = seed
            case "--bot":
                if value == "all" {
                    bots = BotKind.allCases
                } else {
                    guard let kind = value.flatMap({ BotKind(rawValue: $0) }) else { return nil }
                    bots = [kind]
                }
            case "--tuning":
                guard let value else { return nil }
                tuningFile = value
            case "--level":
                guard let level = value.flatMap({ Int($0) }), level >= 1 else { return nil }
                self.level = level
            case "--curve":
                curve = true
                index -= 1
            case "--ring":
                ring = true
                index -= 1
            case "--career":
                guard let shifts = value.flatMap({ Int($0) }), shifts >= 10 else { return nil }
                careerShifts = shifts
            case "--players":
                guard let players = value.flatMap({ Int($0) }), players > 0 else { return nil }
                self.players = players
            case "--duty":
                switch value {
                case "high", "highAlert", "alert": duty = .highAlert
                case "normal": duty = .normal
                default: return nil
                }
            default:
                return nil
            }
            index += 2
        }
    }
}

/// One line per bot: averages and the spread of the score.
struct Report {
    static let columns: [(String, Int)] = [
        ("Bot", 9), ("Score avg", 10), ("p10", 8), ("median", 8), ("p90", 8),
        ("Done", 6), ("Time", 7), ("Crashes", 8), ("Aborted", 8), ("Escaped", 8), ("Busted", 7), ("Best combo", 11), ("Tight fits", 11), ("Merges", 8),
    ]

    static var header: String {
        columns.enumerated().map { index, column in
            index == 0 ? column.0.padding(toLength: column.1, withPad: " ", startingAt: 0) : pad(column.0, column.1)
        }.joined()
    }

    let name: String
    let results: [ShiftResult]

    var line: String {
        let scores = results.map(\.score).sorted()
        func percentile(_ p: Double) -> Int { scores[min(scores.count - 1, Int(Double(scores.count) * p))] }
        func average(_ value: (ShiftResult) -> Int) -> Double {
            Double(results.map(value).reduce(0, +)) / Double(results.count)
        }
        let aborted = Double(results.count(where: { $0.outcome == .struckOut })) / Double(results.count)
        let escaped = Double(results.count(where: { $0.outcome == .escaped })) / Double(results.count)
        // How long a shift takes when it is done: the median of the completed ones.
        let done = results.filter { $0.outcome == .completed }.map(\.time).sorted()
        let time = done.isEmpty ? "–" : String(format: "%.1f s", done[done.count / 2])
        let values = [
            grouped(Int(average(\.score).rounded())),
            grouped(percentile(0.1)),
            grouped(percentile(0.5)),
            grouped(percentile(0.9)),
            String(format: "%.0f%%", Double(done.count) / Double(results.count) * 100),
            time,
            String(format: "%.2f", average(\.crashes)),
            String(format: "%.0f%%", aborted * 100),
            String(format: "%.0f%%", escaped * 100),
            String(format: "%.1f", average(\.takedowns)),
            String(format: "%.1f", average(\.bestCombo)),
            String(format: "%.1f", average(\.tightFits)),
            String(format: "%.1f", average(\.merges)),
        ]
        let widths = Self.columns.map(\.1)
        return name.padding(toLength: widths[0], withPad: " ", startingAt: 0)
            + zip(values, widths.dropFirst()).map { Self.pad($0, $1) }.joined()
    }

    static func pad(_ text: String, _ width: Int) -> String {
        String(repeating: " ", count: max(1, width - text.count)) + text
    }

    func grouped(_ value: Int) -> String {
        var digits = String(value)
        var index = digits.count - 3
        while index > 0 {
            digits.insert(",", at: digits.index(digits.startIndex, offsetBy: index))
            index -= 3
        }
        return digits
    }
}
