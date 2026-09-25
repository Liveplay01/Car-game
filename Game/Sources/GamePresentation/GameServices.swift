import GameCore

/// Game Center (Leo, 25.09.2026): leaderboards and achievements through Apple, no server of
/// our own (CLAUDE.md). The game only says what happened; the app hands it to GameKit
/// (`App.swiftpm/GameCenter.swift`), the test window has none. The ids below must exist in
/// App Store Connect with exactly these names.
public protocol GameServicing: AnyObject {
    func submit(_ value: Int, to leaderboard: Leaderboard)
    func unlock(_ achievement: String)
}

public enum Leaderboard: String, Sendable, CaseIterable {
    /// Best score of a completed shift.
    case highscore = "cargame.highscore"
    /// Highest level reached.
    case level = "cargame.level"
    case bestCombo = "cargame.bestcombo"
    /// Longest Daily streak.
    case dailyStreak = "cargame.dailystreak"
}

/// Achievement ids: every mastery tier, every streak milestone, every album.
public enum Achievements {
    public static func mastery(_ goal: MasteryGoal, tier: Int) -> String { "cargame.mastery.\(goal.rawValue).\(tier + 1)" }
    public static func streak(days: Int) -> String { "cargame.streak.\(days)" }
    public static func album(_ album: Album) -> String { "cargame.album.\(album.rawValue)" }

    /// All of them, for setting them up in App Store Connect.
    public static var all: [String] {
        MasteryGoal.allCases.flatMap { goal in (0..<3).map { mastery(goal, tier: $0) } }
            + Career.streakMilestones.map { streak(days: $0.days) }
            + Album.allCases.map(album)
    }
}
