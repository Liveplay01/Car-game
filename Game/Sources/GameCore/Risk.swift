/// Crash costs and escape losses from level 20 on, and the insurances against them
/// (IDEA.md: Crash-Economy, Financial Loss, Insurance, Robbery Insurance; ROADMAP.md, M7).
///
/// Mistakes stay cheap on purpose: a crash must never cost so much that the player is
/// afraid to try something. Costs come off the shift's money; the career never goes below 0.
extension Config {
    /// Whether mistakes cost money at this shift's level.
    public var hasRiskCosts: Bool { level >= crashCostLevel }

    /// What a crash of this impact costs, before insurance.
    public func crashCost(impact: Double) -> Int {
        guard !crashCosts.isEmpty else { return 0 }
        let tier = crashCostImpacts.prefix(crashCosts.count - 1).count(where: { impact >= $0 })
        return crashCosts[tier]
    }

    /// Splits a cost into what the player pays and what the insurance covers.
    public static func insured(_ cost: Int, coverage: Double) -> (paid: Int, covered: Int) {
        let covered = Int((Double(cost) * min(max(coverage, 0), 1)).rounded())
        return (cost - covered, covered)
    }
}

extension World {
    /// The player's crash costs money from `crashCostLevel` on.
    mutating func chargeCrash(impact: Double) -> (paid: Int, covered: Int) {
        guard config.hasRiskCosts else { return (0, 0) }
        return charge(Config.insured(config.crashCost(impact: impact), coverage: config.crashInsurance))
    }

    /// An escaped criminal costs money from `crashCostLevel` on, on top of the lost shift.
    mutating func chargeEscape() {
        guard isScoring, mode == .shift, config.hasRiskCosts else { return }
        _ = charge(Config.insured(config.escapeLoss, coverage: config.robberyInsurance))
    }

    private mutating func charge(_ cost: (paid: Int, covered: Int)) -> (paid: Int, covered: Int) {
        score.money -= cost.paid
        score.costs += cost.paid
        score.covered += cost.covered
        return cost
    }
}
