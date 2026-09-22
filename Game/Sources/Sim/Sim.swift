import Foundation
import GameBots
import GameCore

/// Balancing bot: plays many shifts per bot and prints how the values play out.
///
///     swift run -c release Sim --shifts 1000 --seed 42
///     swift run -c release Sim --bot perfect --tuning ../TestWindow/tuning.json
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
        print("\(options.shifts) shifts per bot · seeds \(options.seed)–\(last) · \(source)\n")
        print(Report.header)
        let started = Date()
        for kind in options.bots {
            let results = await play(kind, shifts: options.shifts, from: options.seed, config: config)
            print(Report(name: kind.name, results: results).line)
            if kind == .perfect, let crash = results.first(where: { $0.crashes > 0 }) {
                print("  ⚠ the perfect bot crashed in shift \(crash.seed): replay with --seed \(crash.seed)")
            }
        }
        print(String(format: "\n%.1f s", Date().timeIntervalSince(started)))
    }

    /// Plays the shifts in parallel on every core; the results come back in seed order.
    static func play(_ kind: BotKind, shifts: Int, from seed: UInt64, config: Config) async -> [ShiftResult] {
        await withTaskGroup(of: (Int, ShiftResult).self) { group in
            for index in 0..<shifts {
                group.addTask {
                    (index, kind.play(config: config, seed: seed + UInt64(index)))
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
        usage: swift run -c release Sim [--shifts 1000] [--seed 42] [--bot perfect|human|random|all] [--tuning file.json]
        """

    var shifts = 1000
    var seed: UInt64 = 42
    var bots = BotKind.allCases
    var tuningFile: String?

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
        ("Crashes", 8), ("Aborted", 8), ("Escaped", 8), ("Busted", 7), ("Best combo", 11), ("Tight fits", 11), ("Merges", 8),
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
        let values = [
            grouped(Int(average(\.score).rounded())),
            grouped(percentile(0.1)),
            grouped(percentile(0.5)),
            grouped(percentile(0.9)),
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
