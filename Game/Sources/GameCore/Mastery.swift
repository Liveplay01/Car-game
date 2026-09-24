/// Mastery (IDEA.md; ROADMAP.md, M10): runs invisibly across the whole career. There is no
/// mastery screen; when a goal is reached the game shows a short toast and a chest waits in
/// the shop. The harder the goal, the better the chest.
public struct MasteryStats: Sendable, Equatable, Codable {
    public var perfects = 0
    public var tightFits = 0
    public var nearMisses = 0
    public var takedowns = 0
    public var transporters = 0
    public var bestChain = 0
    public var bestCombo = 0
    public var shiftsCompleted = 0
    public var highAlertCompleted = 0

    public init() {}

    /// Missing keys fall back to 0, so a save from before a new counter still loads.
    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        func value(_ key: CodingKeys) -> Int { (try? c.decodeIfPresent(Int.self, forKey: key)) ?? 0 }
        perfects = value(.perfects)
        tightFits = value(.tightFits)
        nearMisses = value(.nearMisses)
        takedowns = value(.takedowns)
        transporters = value(.transporters)
        bestChain = value(.bestChain)
        bestCombo = value(.bestCombo)
        shiftsCompleted = value(.shiftsCompleted)
        highAlertCompleted = value(.highAlertCompleted)
    }

    /// Adds one finished shift.
    public mutating func add(_ result: ShiftResult, duty: Duty) {
        perfects += result.perfects
        tightFits += result.tightFits
        nearMisses += result.nearMisses
        takedowns += result.takedowns
        transporters += result.transporters
        bestChain = max(bestChain, result.bestChain)
        bestCombo = max(bestCombo, result.bestCombo)
        if result.outcome == .completed {
            shiftsCompleted += 1
            if duty == .highAlert { highAlertCompleted += 1 }
        }
    }
}

public enum MasteryGoal: String, Sendable, Equatable, CaseIterable, Codable {
    case perfectTiming
    case tightSpots
    case closeCalls
    case longChain
    case crimeFighter
    case secureRoute
    case comboMaster
    case veteran
    case highAlertHero

    /// What each of the three tiers asks for.
    public var thresholds: [Int] {
        switch self {
        case .perfectTiming: [25, 150, 600]
        case .tightSpots: [25, 150, 600]
        case .closeCalls: [50, 300, 1_200]
        case .longChain: [8, 15, 25]
        case .crimeFighter: [10, 75, 300]
        case .secureRoute: [10, 75, 300]
        case .comboMaster: [20, 40, 80]
        case .veteran: [10, 75, 300]
        case .highAlertHero: [5, 30, 120]
        }
    }

    public func value(in stats: MasteryStats) -> Int {
        switch self {
        case .perfectTiming: stats.perfects
        case .tightSpots: stats.tightFits
        case .closeCalls: stats.nearMisses
        case .longChain: stats.bestChain
        case .crimeFighter: stats.takedowns
        case .secureRoute: stats.transporters
        case .comboMaster: stats.bestCombo
        case .veteran: stats.shiftsCompleted
        case .highAlertHero: stats.highAlertCompleted
        }
    }

    /// The chest a tier earns: better for harder tiers; the police goals earn the
    /// Criminal Hunt chest.
    public func chest(tier: Int) -> ChestKind {
        if self == .crimeFighter { return tier < 2 ? .criminalHunt : .premium }
        return tier == 0 ? .standard : .premium
    }
}

/// One goal tier reached, as the toast shows it.
public struct MasteryCompletion: Sendable, Equatable {
    public var goal: MasteryGoal
    /// 0, 1 or 2.
    public var tier: Int
    public var chest: ChestKind
}

extension Career {
    /// Books a finished shift into the mastery counters and hands out a chest for every tier
    /// reached. Returns what was completed, for the toast.
    @discardableResult
    public mutating func recordMastery(_ result: ShiftResult, duty: Duty) -> [MasteryCompletion] {
        mastery.add(result, duty: duty)
        var completed: [MasteryCompletion] = []
        for goal in MasteryGoal.allCases {
            let reached = goal.thresholds.count(where: { goal.value(in: mastery) >= $0 })
            let before = masteryTiers[goal.rawValue] ?? 0
            guard reached > before else { continue }
            for tier in before..<reached {
                let chest = goal.chest(tier: tier)
                chests.append(chest)
                completed.append(MasteryCompletion(goal: goal, tier: tier, chest: chest))
            }
            masteryTiers[goal.rawValue] = reached
        }
        return completed
    }
}
