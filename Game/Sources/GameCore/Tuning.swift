import Foundation

/// Values from `tuning.json`, laid over `Config` for live tuning (TESTING.md, section 2).
///
/// Every key is optional: a missing key keeps the value from `Config.swift`. Unknown keys
/// are reported, so a typo never silently does nothing. Once values feel right, they move
/// into `Config.swift` for good.
public struct Tuning: Sendable {
    /// `base` with the file's values applied.
    public let config: Config
    /// Keys the file set.
    public let keys: [String]
    /// Keys the file had that are not tunable.
    public let unknownKeys: [String]

    public struct Failure: Error, Sendable, CustomStringConvertible {
        public let description: String
    }

    /// - Throws: `Failure` if the file is no JSON object, a value has the wrong type or the
    ///   result is not playable (e.g. a negative ring speed). `base` is then not changed.
    public static func load(_ data: Data, base: Config = Config()) throws -> Tuning {
        let object: [String: JSONValue]
        do {
            object = try JSONDecoder().decode([String: JSONValue].self, from: data)
        } catch {
            throw Failure(description: "tuning.json is not a JSON object with numbers")
        }
        var config = base
        var keys: [String] = []
        for field in fields {
            guard let value = object[field.name] else { continue }
            try field.apply(value, &config)
            keys.append(field.name)
        }
        let known = Set(fields.map(\.name))
        let unknown = object.keys.filter { !known.contains($0) }.sorted()
        if let problem = problems(config).first {
            throw Failure(description: problem)
        }
        return Tuning(config: config, keys: keys, unknownKeys: unknown)
    }

    /// Tunable values that differ between two configs, e.g. `tightFitSeconds 0.1 (Config.swift 0.12)`.
    public static func differences(_ config: Config, from base: Config = Config()) -> [String] {
        fields.compactMap { field in
            let now = field.text(config)
            let before = field.text(base)
            return now == before ? nil : "\(field.name) \(now) (Config.swift \(before))"
        }
    }

    /// A complete `tuning.json` with every tunable value of `config`.
    public static func json(for config: Config) -> String {
        let lines = fields.map { "  \"\($0.name)\": \($0.text(config))" }
        return "{\n" + lines.joined(separator: ",\n") + "\n}\n"
    }

    /// Values that would break the game rather than just feel different.
    static func problems(_ c: Config) -> [String] {
        var problems: [String] = []
        func check(_ ok: Bool, _ message: String) {
            if !ok { problems.append(message) }
        }
        check(c.ringSpeed > 0, "ringSpeed must be > 0")
        check(c.mergeDuration > 0, "mergeDuration must be > 0")
        check(c.queueAdvanceDuration > 0, "queueAdvanceDuration must be > 0")
        check(c.tightFitSeconds >= 0 && c.sloppyWindow >= 0, "tightFitSeconds and sloppyWindow must be ≥ 0")
        check(c.maxStrikes >= 1, "maxStrikes must be ≥ 1")
        check(c.shiftSeconds > 0, "shiftSeconds must be > 0")
        check(c.rushHourSeconds >= 0 && c.rushHourSeconds <= c.shiftSeconds, "rushHourSeconds must lie between 0 and shiftSeconds")
        check(c.densityStart >= 0 && c.densityEnd >= 0 && c.rushHourDensityBonus >= 0 && c.freePlayDensity >= 0, "densities must be ≥ 0")
        check(c.tempoStart > 0 && c.tempoEnd > 0 && c.rushHourTempo > 0, "tempos must be > 0")
        check(c.aiSafeGap >= 0 && c.aiPathClearance >= 0, "AI gaps must be ≥ 0")
        check(c.comboThresholds.count == c.comboMultipliers.count, "comboThresholds and comboMultipliers need the same number of entries")
        check(c.policeShare >= 0 && c.policeShare <= 1, "policeShare must lie between 0 and 1")
        check(c.criminalTime > 0 && c.criminalWarning >= 0, "criminalTime must be > 0, criminalWarning ≥ 0")
        check(c.criminalMass > 0, "criminalMass must be > 0")
        check(c.dispatchComboFactor >= 0 && c.dispatchComboFactor <= 1, "dispatchComboFactor must lie between 0 and 1")
        check(zip(c.comboThresholds, c.comboThresholds.dropFirst()).allSatisfy { $0 < $1 }, "comboThresholds must rise")
        return problems
    }

    // MARK: - Fields

    struct Field {
        let name: String
        let apply: (JSONValue, inout Config) throws -> Void
        let text: (Config) -> String

        static func double(_ name: String, _ path: WritableKeyPath<Config, Double>) -> Field {
            Field(name: name, apply: { value, config in
                config[keyPath: path] = try value.number(name)
            }, text: { format($0[keyPath: path]) })
        }

        static func int(_ name: String, _ path: WritableKeyPath<Config, Int>) -> Field {
            Field(name: name, apply: { value, config in
                config[keyPath: path] = try value.integer(name)
            }, text: { String($0[keyPath: path]) })
        }

        static func ints(_ name: String, _ path: WritableKeyPath<Config, [Int]>) -> Field {
            Field(name: name, apply: { value, config in
                config[keyPath: path] = try value.list(name).map { try $0.integer(name) }
            }, text: { "[" + $0[keyPath: path].map(String.init).joined(separator: ", ") + "]" })
        }

        static func doubles(_ name: String, _ path: WritableKeyPath<Config, [Double]>) -> Field {
            Field(name: name, apply: { value, config in
                config[keyPath: path] = try value.list(name).map { try $0.number(name) }
            }, text: { "[" + $0[keyPath: path].map(format).joined(separator: ", ") + "]" })
        }

        /// A closed range written as `[lower, upper]`.
        static func range(_ name: String, _ path: WritableKeyPath<Config, ClosedRange<Double>>) -> Field {
            Field(name: name, apply: { value, config in
                let list = try value.list(name)
                guard list.count == 2 else {
                    throw Failure(description: "\(name) must be a list of two numbers, e.g. [25, 40]")
                }
                let lower = try list[0].number(name)
                let upper = try list[1].number(name)
                config[keyPath: path] = lower...upper
            }, text: {
                let r = $0[keyPath: path]
                return "[\(format(r.lowerBound)), \(format(r.upperBound))]"
            })
        }

        static func format(_ value: Double) -> String {
            value == value.rounded() && abs(value) < 1e15 ? String(Int(value)) : String(value)
        }
    }

    /// Tunable values, in the order `tuning.json` lists them. Geometry (ring radius, car
    /// size) stays out on purpose: it changes the layout, not the feel.
    static var fields: [Field] {
        [
            .double("tightFitSeconds", \.tightFitSeconds),
            .double("sloppyWindow", \.sloppyWindow),
            .double("mergeDuration", \.mergeDuration),
            .double("ringSpeed", \.ringSpeed),
            .double("queueAdvanceDuration", \.queueAdvanceDuration),
            .int("maxStrikes", \.maxStrikes),
            .int("maxPoliceCrashes", \.maxPoliceCrashes),
            .double("shiftSeconds", \.shiftSeconds),
            .double("rushHourSeconds", \.rushHourSeconds),
            .int("densityStart", \.densityStart),
            .int("densityEnd", \.densityEnd),
            .int("rushHourDensityBonus", \.rushHourDensityBonus),
            .double("tempoStart", \.tempoStart),
            .double("tempoEnd", \.tempoEnd),
            .double("rushHourTempo", \.rushHourTempo),
            .double("rushHourScoreFactor", \.rushHourScoreFactor),
            .int("pointsClean", \.pointsClean),
            .int("pointsTightFit", \.pointsTightFit),
            .int("comboClean", \.comboClean),
            .int("comboTightFit", \.comboTightFit),
            .ints("comboThresholds", \.comboThresholds),
            .doubles("comboMultipliers", \.comboMultipliers),
            .int("crashPenalty", \.crashPenalty),
            .double("policeShare", \.policeShare),
            .double("criminalWarning", \.criminalWarning),
            .double("criminalTime", \.criminalTime),
            .int("takedownPoints", \.takedownPoints),
            .double("criminalMass", \.criminalMass),
            .double("dispatchComboFactor", \.dispatchComboFactor),
            .double("policeChaseSpeedFactor", \.policeChaseSpeedFactor),
            .range("transporterFirst", \.transporterFirst),
            .range("transporterInterval", \.transporterInterval),
            .double("transporterWarning", \.transporterWarning),
            .double("transporterTime", \.transporterTime),
            .double("transporterSecureArc", \.transporterSecureArc),
            .int("transporterPay", \.transporterPay),
            .int("shieldBonus", \.shieldBonus),
            .int("transporterSeized", \.transporterSeized),
            .double("transporterMass", \.transporterMass),
            .double("aiSafeGap", \.aiSafeGap),
            .double("aiPathClearance", \.aiPathClearance),
            .int("freePlayDensity", \.freePlayDensity),
        ]
    }
}

/// Just enough JSON to read numbers and lists of numbers.
enum JSONValue: Decodable {
    case number(Double)
    case list([JSONValue])
    case other

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let number = try? container.decode(Double.self) {
            self = .number(number)
        } else if let list = try? container.decode([JSONValue].self) {
            self = .list(list)
        } else {
            self = .other
        }
    }

    func number(_ key: String) throws -> Double {
        guard case let .number(value) = self, value.isFinite else {
            throw Tuning.Failure(description: "\(key) must be a number")
        }
        return value
    }

    func integer(_ key: String) throws -> Int {
        let value = try number(key)
        guard value == value.rounded(), abs(value) < 1e9 else {
            throw Tuning.Failure(description: "\(key) must be a whole number")
        }
        return Int(value)
    }

    func list(_ key: String) throws -> [JSONValue] {
        guard case let .list(values) = self else {
            throw Tuning.Failure(description: "\(key) must be a list, e.g. [5, 10, 20]")
        }
        return values
    }
}
