/// Weather: the third axis the difficulty grows on, next to speed and density (IDEA.md,
/// "Difficulty Curve"; ROADMAP.md, M8).
///
/// Weather never changes the timing of a tap: merges, the ring and the queue run exactly
/// as in the dry. It changes what happens around them — tyres grip less, so wrecks slide
/// further; drivers react later and brake softer, so a crash spreads further; heavy weather
/// brings more traffic. And it is drawn as rain, dark and flashes that never cover a
/// warning, a special vehicle or a countdown.
public enum Weather: String, Sendable, Equatable, CaseIterable, Codable {
    case clear
    case lightRain
    case heavyRain
    case storm
    /// Rare, late: a storm that makes the traffic denser still.
    case extreme

    /// How bad it is, 0 (clear) … 4 (extreme).
    public var severity: Int {
        switch self {
        case .clear: 0
        case .lightRain: 1
        case .heavyRain: 2
        case .storm: 3
        case .extreme: 4
        }
    }
}

extension Config {
    /// The first level each weather can come at, from light rain to extreme.
    public func firstLevel(of weather: Weather) -> Int {
        switch weather {
        case .clear: 1
        case .lightRain: lightRainLevel
        case .heavyRain: heavyRainLevel
        case .storm: stormLevel
        case .extreme: extremeLevel
        }
    }

    /// The weather of one shift at `level`. Bad weather gets likelier with every level;
    /// among the kinds a level allows, the milder ones are more common. Drawn from the seed,
    /// so a replayed shift has the same sky.
    public func drawWeather(level: Int, seed: UInt64) -> Weather {
        var random = SeededRandom(seed: seed ^ 0x7E57_1A2B_C0DE_5EED)
        let chance = min(maxBadWeatherChance, badWeatherPerLevel * Double(max(0, level - lightRainLevel + 1)))
        guard chance > 0, random.unit() < chance else { return .clear }
        let options = Weather.allCases.filter { $0 != .clear && firstLevel(of: $0) <= level }
        guard !options.isEmpty else { return .clear }
        // Weights 4, 3, 2, 1: light rain the most common, extreme the rarest.
        let weights = options.map { Double(5 - $0.severity) }
        var pick = random.unit() * weights.reduce(0, +)
        for (option, weight) in zip(options, weights) {
            pick -= weight
            if pick < 0 { return option }
        }
        return options[options.count - 1]
    }

    /// This config under `weather`: tyres, drivers and traffic as that weather has them.
    public func forWeather(_ weather: Weather) -> Config {
        var config = self
        config.weather = weather
        let severity = Double(weather.severity)
        guard severity > 0 else { return config }
        // Wet tyres: every step of weather loses grip, down to a floor.
        let grip = max(0.35, 1 - severity * weatherGripLoss)
        config.tireGripBrake *= grip
        config.tireGripSide *= grip
        // Drivers see later and brake softer.
        let reaction = severity * weatherReactionDelay
        config.driverReaction = (driverReaction.lowerBound + reaction)...(driverReaction.upperBound + reaction)
        config.driverBrake *= max(0.4, 1 - severity * weatherBrakeLoss)
        // From heavy rain on: more traffic on the road.
        let denser = max(0, weather.severity - 1) * weatherDensityPerStep
        config.densityStart += denser
        config.densityEnd += denser
        // In a storm the AI squeezes into smaller gaps.
        if weather.severity >= Weather.storm.severity {
            config.aiSafeGap *= stormAiGapFactor
        }
        return config
    }
}
