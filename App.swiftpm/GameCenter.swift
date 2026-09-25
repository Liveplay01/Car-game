import GameKit
import GamePresentation
import UIKit

/// Game Center (Leo, 25.09.2026): signs the player in and hands the game's leaderboards and
/// achievements (`GameServices.swift`) to GameKit. Without a signed-in player everything is
/// quietly skipped; the game plays the same.
final class GameCenter: GameServicing {
    init() {
        GKLocalPlayer.local.authenticateHandler = { viewController, _ in
            // Apple's own sign-in sheet, if the player is not signed in yet.
            guard let viewController else { return }
            Self.rootViewController()?.present(viewController, animated: true)
        }
    }

    func submit(_ value: Int, to leaderboard: Leaderboard) {
        guard GKLocalPlayer.local.isAuthenticated else { return }
        GKLeaderboard.submitScore(value, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [leaderboard.rawValue]) { _ in }
    }

    func unlock(_ achievement: String) {
        guard GKLocalPlayer.local.isAuthenticated else { return }
        let item = GKAchievement(identifier: achievement)
        item.percentComplete = 100
        item.showsCompletionBanner = true
        GKAchievement.report([item]) { _ in }
    }

    /// Apple's Game Center button in the corner, only while a shift waits for its first tap.
    static func showAccessPoint(_ shown: Bool) {
        GKAccessPoint.shared.location = .topLeading
        GKAccessPoint.shared.isActive = shown && GKLocalPlayer.local.isAuthenticated
    }

    private static func rootViewController() -> UIViewController? {
        UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.keyWindow }
            .first?.rootViewController
    }
}
