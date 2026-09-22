/// How a merge that did not crash is rated (FOUNDATION.md 2.3).
public enum MergeRating: Sendable, Equatable {
    case clean
    /// Closer than `tightFitSeconds` to someone: double points, double combo.
    case tightFit
    /// Only with `sloppyWindow` on: the car behind was left too little room. Combo reset, no points.
    case cutOff
}

/// Score, combo and strikes of one shift.
public struct ScoreBoard: Sendable, Equatable {
    public internal(set) var points = 0
    public internal(set) var combo = 0
    public internal(set) var bestCombo = 0
    public internal(set) var strikes = 0
    public internal(set) var cleanMerges = 0
    public internal(set) var tightFits = 0
    public internal(set) var cutOffs = 0
    public internal(set) var takedowns = 0
    public internal(set) var transporters = 0
    /// Money earned this shift: paid transporters minus seized ones.
    public internal(set) var money = 0

    public init() {}

    public var merges: Int { cleanMerges + tightFits + cutOffs }
}

/// The rating rules as pure functions, so they are testable without a world.
public enum Scoring {
    public static func rate(minGap: Double, gapBehind: Double, config: Config) -> MergeRating {
        if config.sloppyWindow > 0 && gapBehind < config.sloppyWindow {
            return .cutOff
        }
        return minGap < config.tightFitSeconds ? .tightFit : .clean
    }

    /// 0 for ×1, then one step per threshold that `combo` has reached (FOUNDATION.md 2.4).
    public static func tier(combo: Int, config: Config) -> Int {
        let count = min(config.comboThresholds.count, config.comboMultipliers.count)
        return config.comboThresholds.prefix(count).count(where: { combo >= $0 })
    }

    public static func multiplier(tier: Int, config: Config) -> Double {
        tier == 0 ? 1 : config.comboMultipliers[tier - 1]
    }

    public static func multiplier(combo: Int, config: Config) -> Double {
        multiplier(tier: tier(combo: combo, config: config), config: config)
    }

    /// Points for a merge. The multiplier is the one shown when the merge ends, i.e. the
    /// combo before this merge adds to it: what you see on the island is what you get.
    public static func points(for rating: MergeRating, combo: Int, rushHour: Bool, config: Config) -> Int {
        let base: Int
        switch rating {
        case .clean: base = config.pointsClean
        case .tightFit: base = config.pointsTightFit
        case .cutOff: return 0
        }
        let factor = multiplier(combo: combo, config: config) * (rushHour ? config.rushHourScoreFactor : 1)
        return Int((Double(base) * factor).rounded())
    }

    public static func comboGain(for rating: MergeRating, config: Config) -> Int {
        switch rating {
        case .clean: config.comboClean
        case .tightFit: config.comboTightFit
        case .cutOff: 0
        }
    }
}

extension World {
    /// Whether merges and crashes still count. After the shift has ended the road keeps
    /// moving behind the result screen, but nothing is scored any more.
    var isScoring: Bool {
        if case .ended = shift.phase { return false }
        return true
    }

    /// Rates and scores a finished player merge. Returns the rating, points and new combo.
    mutating func scoreMerge(minGap: Double, gapBehind: Double, at time: Double) -> (MergeRating, Int, Int) {
        let rating = Scoring.rate(minGap: minGap, gapBehind: gapBehind, config: config)
        let points = Scoring.points(for: rating, combo: score.combo, rushHour: time >= rushHourStartTime, config: config)
        score.points += points
        switch rating {
        case .clean: score.cleanMerges += 1
        case .tightFit: score.tightFits += 1
        case .cutOff: score.cutOffs += 1
        }
        if rating == .cutOff {
            setCombo(0)
        } else {
            setCombo(score.combo + Scoring.comboGain(for: rating, config: config))
        }
        return (rating, points, score.combo)
    }

    /// A crash with a player car: combo to 0, penalty, one strike. The last strike ends the shift.
    /// Returns the penalty actually taken and the strikes after it.
    mutating func scoreCrash() -> (Int, Int) {
        let penalty = min(score.points, config.crashPenalty)
        score.points -= penalty
        score.strikes += 1
        setCombo(0)
        return (penalty, score.strikes)
    }

    /// A police car stopped the criminal: points like a merge, the combo stays.
    mutating func scoreTakedown(at time: Double) -> Int {
        let factor = Scoring.multiplier(combo: score.combo, config: config) * (time >= rushHourStartTime ? config.rushHourScoreFactor : 1)
        let points = Int((Double(config.takedownPoints) * factor).rounded())
        score.points += points
        score.takedowns += 1
        return points
    }

    mutating func setCombo(_ combo: Int) {
        let previous = score.combo
        guard combo != previous else { return }
        score.combo = combo
        score.bestCombo = max(score.bestCombo, combo)
        let tier = Scoring.tier(combo: combo, config: config)
        events.append(.comboChanged(ComboChange(
            previous: previous,
            combo: combo,
            previousTier: Scoring.tier(combo: previous, config: config),
            tier: tier,
            multiplier: Scoring.multiplier(tier: tier, config: config)
        )))
    }

    /// Free time (seconds) between the car at ring distance `s` and the nearest car behind it.
    /// Merging cars count where they will join, like in the AI's safe-gap check.
    func gapBehind(ringS s: Double, excluding id: Int) -> Double {
        let circumference = layout.ring.length
        var nearest = Double.infinity
        for other in vehicles where other.id != id {
            guard let otherS = virtualRingPosition(of: other, after: 0) else { continue }
            let behind = layout.ringDistance(from: otherS, to: s)
            if behind < circumference / 2 {
                nearest = min(nearest, behind)
            }
        }
        guard nearest.isFinite else { return .infinity }
        return max(0, nearest - config.carLength) / ringSpeed
    }
}
