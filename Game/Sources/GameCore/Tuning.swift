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
        check(c.armSlotCount >= 3 && c.armSlotSpacing >= 1, "armSlotCount must be ≥ 3 and armSlotSpacing ≥ 1")
        check(c.builtArmSlots.count >= 3, "there must be at least three arms")
        check(c.ringRadiusPerArm >= 0, "ringRadiusPerArm must be ≥ 0")
        check(c.armBaseCost >= 0 && c.armCostGrowth >= 1, "armBaseCost must be ≥ 0 and armCostGrowth ≥ 1")
        check(c.trafficPerArm >= 0 && c.payPerArm >= 0 && c.transporterPerArm >= 0, "per-arm steps must be ≥ 0")
        check(c.mergeDuration > 0, "mergeDuration must be > 0")
        check(c.queueAdvanceDuration >= 0, "queueAdvanceDuration must be ≥ 0")
        check(c.tightFitSeconds >= 0 && c.sloppyWindow >= 0, "tightFitSeconds and sloppyWindow must be ≥ 0")
        check(c.nearMissSeconds >= c.tightFitSeconds, "nearMissSeconds must be ≥ tightFitSeconds")
        check(c.perfectBalance >= 0 && c.perfectMaxGap >= 0, "perfectBalance and perfectMaxGap must be ≥ 0")
        check(c.flowChain >= 1, "flowChain must be ≥ 1")
        check(c.crashCosts.allSatisfy { $0 >= 0 } && c.escapeLoss >= 0 && c.crashCostLevel >= 1, "crash costs and escapeLoss must be ≥ 0, crashCostLevel ≥ 1")
        check(c.badWeatherPerLevel >= 0 && (0...1).contains(c.maxBadWeatherChance) && (0...1).contains(c.cityEventChance), "weather and event chances must lie between 0 and 1")
        check(c.towSpeedup >= 0 && c.towSpeedup < 1 && c.towZoneArc >= 0, "towSpeedup must lie in 0..<1, towZoneArc ≥ 0")
        check(c.roadworksSpeedFactor > 0 && c.stormAiGapFactor > 0, "roadworksSpeedFactor and stormAiGapFactor must be > 0")
        check([c.insurancePerStep, c.freightPerStep, c.doubleRunPerStep, c.lateDensityPerLevel].allSatisfy { $0 >= 0 } && c.maxLateDensityBonus >= 0, "M7 steps must be ≥ 0")
        check(c.maxStrikes >= 1, "maxStrikes must be ≥ 1")
        check(c.maxPoliceCrashes >= 0, "maxPoliceCrashes must be ≥ 0")
        check(c.policeChaseSpeedFactor >= 1, "policeChaseSpeedFactor must be ≥ 1")
        check(c.shiftCars >= 1, "shiftCars must be ≥ 1")
        check(c.hardLevel >= 1, "hardLevel must be ≥ 1")
        check(c.levelOneCars >= 1 && c.maxShiftCars >= c.levelOneCars, "levelOneCars must be ≥ 1 and ≤ maxShiftCars")
        check(c.carsPerLevel >= 0 && c.shiftCarsSpread >= 0, "carsPerLevel and shiftCarsSpread must be ≥ 0")
        check(c.easyTempoStart > 0 && c.easyTempoEnd > 0 && c.easyRushHourTempo > 0, "easy tempos must be > 0")
        check(c.easyDensityStart >= 0 && c.easyDensityEnd >= 0 && c.easyAiSafeGap >= 0, "easy densities and gaps must be ≥ 0")
        check(c.easyPoliceShare >= 0 && c.easyPoliceShare <= 1, "easyPoliceShare must lie between 0 and 1")
        check(c.easyCriminalTime > 0 && c.minCriminalTime > 0, "easyCriminalTime and minCriminalTime must be > 0")
        check(c.tempoPerLevel >= 0 && c.maxLevelTempoBonus >= 0 && c.criminalTimePerLevel >= 0, "per-level steps must be ≥ 0")
        check(c.shiftPayBase >= 0 && c.shiftPayPerLevel >= 0 && c.upgradeBaseCost >= 0, "pay and prices must be ≥ 0")
        check(c.upgradeCostGrowth >= 1, "upgradeCostGrowth must be ≥ 1")
        check(c.highAlertCars >= 1 && c.highAlertCriminalTime > 0 && c.highAlertCriminalInterval > 0, "High Alert values must be ≥ 1 or > 0")
        check(c.highAlertPay >= 1, "highAlertPay must be ≥ 1")
        check([c.patrolsPerStep, c.pursuitPerStep, c.quietStreetsPerStep, c.interceptorPerStep, c.dispatchRadioPerStep, c.cashRoutePerStep, c.overtimePerStep].allSatisfy { $0 >= 0 } && c.backupPerStep >= 0, "upgrade steps must be ≥ 0")
        check(c.rushHourCars >= 0, "rushHourCars must be ≥ 0")
        check(c.rampSeconds >= 0, "rampSeconds must be ≥ 0")
        check(c.densityStart >= 0 && c.densityEnd >= 0 && c.rushHourDensityBonus >= 0 && c.freePlayDensity >= 0, "densities must be ≥ 0")
        check(c.tempoStart > 0 && c.tempoEnd > 0 && c.rushHourTempo > 0, "tempos must be > 0")
        check(c.aiSafeGap >= 0 && c.aiPathClearance >= 0, "AI gaps must be ≥ 0")
        check(c.comboThresholds.count == c.comboMultipliers.count, "comboThresholds and comboMultipliers need the same number of entries")
        check(c.policeShare >= 0 && c.policeShare <= 1, "policeShare must lie between 0 and 1")
        check(c.criminalTime > 0 && c.criminalWarning >= 0, "criminalTime must be > 0, criminalWarning ≥ 0")
        check(c.criminalMass > 0, "criminalMass must be > 0")
        check(c.criminalChance >= 0 && c.criminalChance <= 1, "criminalChance must lie between 0 and 1")
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
            .double("nearMissSeconds", \.nearMissSeconds),
            .double("perfectBalance", \.perfectBalance),
            .double("perfectMaxGap", \.perfectMaxGap),
            .int("flowChain", \.flowChain),
            .double("mergeDuration", \.mergeDuration),
            .double("ringSpeed", \.ringSpeed),
            .double("queueAdvanceDuration", \.queueAdvanceDuration),
            .int("maxStrikes", \.maxStrikes),
            .int("maxPoliceCrashes", \.maxPoliceCrashes),
            .int("rushHourCars", \.rushHourCars),
            .ints("armSlots", \.armSlots),
            .int("armSlotCount", \.armSlotCount),
            .int("armSlotSpacing", \.armSlotSpacing),
            .double("ringRadiusPerArm", \.ringRadiusPerArm),
            .double("rampSeconds", \.rampSeconds),
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
            .int("pointsNearMiss", \.pointsNearMiss),
            .int("pointsPerfect", \.pointsPerfect),
            .int("comboNearMiss", \.comboNearMiss),
            .int("comboPerfect", \.comboPerfect),
            .ints("comboThresholds", \.comboThresholds),
            .doubles("comboMultipliers", \.comboMultipliers),
            .int("crashPenalty", \.crashPenalty),
            .double("policeShare", \.policeShare),
            .double("criminalChance", \.criminalChance),
            .range("criminalFirst", \.criminalFirst),
            .range("criminalInterval", \.criminalInterval),
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
            .int("hardLevel", \.hardLevel),
            .int("levelOneCars", \.levelOneCars),
            .double("carsPerLevel", \.carsPerLevel),
            .int("shiftCarsSpread", \.shiftCarsSpread),
            .int("maxShiftCars", \.maxShiftCars),
            .int("easyDensityStart", \.easyDensityStart),
            .int("easyDensityEnd", \.easyDensityEnd),
            .double("easyTempoStart", \.easyTempoStart),
            .double("easyTempoEnd", \.easyTempoEnd),
            .double("easyRushHourTempo", \.easyRushHourTempo),
            .double("easyAiSafeGap", \.easyAiSafeGap),
            .double("easyCriminalTime", \.easyCriminalTime),
            .double("easyPoliceShare", \.easyPoliceShare),
            .double("tempoPerLevel", \.tempoPerLevel),
            .double("maxLevelTempoBonus", \.maxLevelTempoBonus),
            .double("criminalTimePerLevel", \.criminalTimePerLevel),
            .double("minCriminalTime", \.minCriminalTime),
            .double("highAlertCars", \.highAlertCars),
            .double("highAlertCriminalTime", \.highAlertCriminalTime),
            .double("highAlertCriminalInterval", \.highAlertCriminalInterval),
            .double("highAlertPay", \.highAlertPay),
            .int("shiftPayBase", \.shiftPayBase),
            .int("shiftPayPerLevel", \.shiftPayPerLevel),
            .int("armBaseCost", \.armBaseCost),
            .double("armCostGrowth", \.armCostGrowth),
            .double("trafficPerArm", \.trafficPerArm),
            .double("payPerArm", \.payPerArm),
            .double("transporterPerArm", \.transporterPerArm),
            .int("upgradeBaseCost", \.upgradeBaseCost),
            .double("upgradeCostGrowth", \.upgradeCostGrowth),
            .double("patrolsPerStep", \.patrolsPerStep),
            .double("pursuitPerStep", \.pursuitPerStep),
            .double("quietStreetsPerStep", \.quietStreetsPerStep),
            .double("interceptorPerStep", \.interceptorPerStep),
            .double("dispatchRadioPerStep", \.dispatchRadioPerStep),
            .int("backupPerStep", \.backupPerStep),
            .double("cashRoutePerStep", \.cashRoutePerStep),
            .double("overtimePerStep", \.overtimePerStep),
            .double("insurancePerStep", \.insurancePerStep),
            .double("freightPerStep", \.freightPerStep),
            .double("doubleRunPerStep", \.doubleRunPerStep),
            .int("crashCostLevel", \.crashCostLevel),
            .ints("crashCosts", \.crashCosts),
            .doubles("crashCostImpacts", \.crashCostImpacts),
            .int("escapeLoss", \.escapeLoss),
            .range("doubleRunDelay", \.doubleRunDelay),
            .int("lateLevel", \.lateLevel),
            .double("lateDensityPerLevel", \.lateDensityPerLevel),
            .int("maxLateDensityBonus", \.maxLateDensityBonus),
            .double("towZoneArc", \.towZoneArc),
            .double("towSpeedup", \.towSpeedup),
            .int("towDepotCost", \.towDepotCost),
            .int("lightRainLevel", \.lightRainLevel),
            .int("heavyRainLevel", \.heavyRainLevel),
            .int("stormLevel", \.stormLevel),
            .int("extremeLevel", \.extremeLevel),
            .double("badWeatherPerLevel", \.badWeatherPerLevel),
            .double("maxBadWeatherChance", \.maxBadWeatherChance),
            .double("weatherGripLoss", \.weatherGripLoss),
            .double("weatherReactionDelay", \.weatherReactionDelay),
            .double("weatherBrakeLoss", \.weatherBrakeLoss),
            .int("weatherDensityPerStep", \.weatherDensityPerStep),
            .double("stormAiGapFactor", \.stormAiGapFactor),
            .int("cityEventLevel", \.cityEventLevel),
            .double("cityEventChance", \.cityEventChance),
            .double("roadworksArc", \.roadworksArc),
            .double("roadworksSpeedFactor", \.roadworksSpeedFactor),
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
