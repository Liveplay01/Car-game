/// How a merge that did not crash is rated (FOUNDATION.md 2.3).
public enum MergeRating: Sendable, Equatable {
    case clean
    /// Closer than `tightFitSeconds` to someone: double points, double combo.
    case tightFit
    /// Only with `sloppyWindow` on: the car behind was left too little room. Combo reset, no points.
    case cutOff
    /// Closer than `nearMissSeconds`, but no Tight Fit: a small bonus, no popup (M6).
    case nearMiss
    /// Right in the middle of a real gap: the precise tap (M6, IDEA.md "Perfect Input").
    case perfect

    /// Counts for the Perfect Chain: everything better than a plain clean merge.
    public var extendsChain: Bool {
        switch self {
        case .tightFit, .nearMiss, .perfect: true
        case .clean, .cutOff: false
        }
    }
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
    /// Money earned this shift: paid transporters, shield bonuses and, at the end of a
    /// completed shift, the shift pay.
    public internal(set) var money = 0
    /// Crashes of police cars this shift; `maxPoliceCrashes` of them are survived.
    public internal(set) var policeCrashes = 0
    public internal(set) var nearMisses = 0
    public internal(set) var perfects = 0
    /// Perfect Chain: good actions in a row (M6). No display of its own; the feedback grows.
    public internal(set) var chain = 0
    public internal(set) var bestChain = 0

    public init() {}

    public var merges: Int { cleanMerges + tightFits + cutOffs + nearMisses + perfects }
}

/// The rating rules as pure functions, so they are testable without a world.
public enum Scoring {
    /// - Parameters:
    ///   - minGap: the smallest gap to anyone during the merge (seconds).
    ///   - gapBehind: free time to the car behind when the merge ended.
    ///   - gapAhead: free time to the car ahead when the merge ended.
    public static func rate(minGap: Double, gapBehind: Double, gapAhead: Double = .infinity, config: Config) -> MergeRating {
        if config.sloppyWindow > 0 && gapBehind < config.sloppyWindow {
            return .cutOff
        }
        if minGap < config.tightFitSeconds { return .tightFit }
        if minGap < config.nearMissSeconds { return .nearMiss }
        return isCentred(gapAhead: gapAhead, gapBehind: gapBehind, config: config) ? .perfect : .clean
    }

    /// Perfect Input: a real gap on both sides, and the car right in its middle.
    public static func isCentred(gapAhead: Double, gapBehind: Double, config: Config) -> Bool {
        guard gapAhead.isFinite, gapBehind.isFinite,
              gapAhead >= config.nearMissSeconds, gapBehind >= config.nearMissSeconds else { return false }
        let sum = gapAhead + gapBehind
        guard sum <= config.perfectMaxGap else { return false }
        return abs(gapAhead - gapBehind) <= config.perfectBalance * sum
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
        case .nearMiss: base = config.pointsNearMiss
        case .perfect: base = config.pointsPerfect
        case .cutOff: return 0
        }
        let factor = multiplier(combo: combo, config: config) * (rushHour ? config.rushHourScoreFactor : 1)
        return Int((Double(base) * factor).rounded())
    }

    public static func comboGain(for rating: MergeRating, config: Config) -> Int {
        switch rating {
        case .clean: config.comboClean
        case .tightFit: config.comboTightFit
        case .nearMiss: config.comboNearMiss
        case .perfect: config.comboPerfect
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
    mutating func scoreMerge(minGap: Double, gapBehind: Double, gapAhead: Double, at time: Double) -> (MergeRating, Int, Int) {
        let rating = Scoring.rate(minGap: minGap, gapBehind: gapBehind, gapAhead: gapAhead, config: config)
        let points = Scoring.points(for: rating, combo: score.combo, rushHour: isRushHourScoring, config: config)
        score.points += points
        switch rating {
        case .clean: score.cleanMerges += 1
        case .tightFit: score.tightFits += 1
        case .cutOff: score.cutOffs += 1
        case .nearMiss: score.nearMisses += 1
        case .perfect: score.perfects += 1
        }
        if rating == .cutOff {
            setCombo(0)
        } else {
            setCombo(score.combo + Scoring.comboGain(for: rating, config: config))
        }
        return (rating, points, score.combo)
    }

    /// Whether the Perfect Chain is long enough for the Flow State.
    public var isInFlow: Bool { score.chain >= max(1, config.flowChain) }

    /// One more good action in a row (M6).
    mutating func extendChain(at time: Double) {
        setChain(score.chain + 1, at: time)
    }

    /// Sets the Perfect Chain; entering or leaving the flow is an event of its own.
    mutating func setChain(_ chain: Int, at time: Double) {
        let wasInFlow = isInFlow
        score.chain = max(0, chain)
        score.bestChain = max(score.bestChain, score.chain)
        if isInFlow != wasInFlow {
            events.append(.flowChanged(FlowChange(isInFlow: isInFlow, chain: score.chain, time: time)))
        }
    }

    /// The player's crash: combo to 0 and a penalty, plus a strike, or a police crash if it
    /// was a police car's. Returns the penalty actually taken.
    mutating func scoreCrash(byPolice: Bool, at time: Double) -> Int {
        let penalty = min(score.points, config.crashPenalty)
        score.points -= penalty
        if byPolice {
            score.policeCrashes += 1
        } else {
            score.strikes += 1
        }
        setCombo(0)
        setChain(0, at: time)
        return penalty
    }

    /// The last strike, or one police crash more than a shift survives.
    var isStruckOut: Bool {
        score.strikes >= config.maxStrikes || score.policeCrashes > config.maxPoliceCrashes
    }

    /// A police car stopped the criminal: points like a merge, the combo stays.
    mutating func scoreTakedown(at time: Double) -> Int {
        let factor = Scoring.multiplier(combo: score.combo, config: config) * (isRushHourScoring ? config.rushHourScoreFactor : 1)
        let points = Int((Double(config.takedownPoints) * factor).rounded())
        score.points += points
        score.takedowns += 1
        extendChain(at: time)
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

    /// Free time (seconds) between the player car at ring distance `s` and the nearest car
    /// ahead of it, like `gapBehind` the other way round.
    func gapAhead(ringS s: Double, excluding id: Int) -> Double {
        let circumference = layout.ring.length
        var nearest = Double.infinity
        for other in vehicles where other.id != id && other.owner != .player {
            guard let otherS = virtualRingPosition(of: other, after: 0) else { continue }
            let ahead = layout.ringDistance(from: s, to: otherS)
            if ahead < circumference / 2 {
                nearest = min(nearest, ahead)
            }
        }
        guard nearest.isFinite else { return .infinity }
        return max(0, nearest - config.carLength) / ringSpeed
    }

    /// Free time (seconds) between the player car at ring distance `s` and the nearest car
    /// behind it. Merging cars count where they will join, like in the AI's safe-gap check.
    /// Your own cars do not: the next one of your convoy is always right behind.
    func gapBehind(ringS s: Double, excluding id: Int) -> Double {
        let circumference = layout.ring.length
        var nearest = Double.infinity
        for other in vehicles where other.id != id && other.owner != .player {
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
