import Foundation
import GameCore

// Everything that touches hardware or storage goes through a protocol; each platform
// brings its own implementation (FOUNDATION.md 4.5).

/// Stores the save game. Test window: a JSON file. App: JSON in Application Support. Tests: memory.
public protocol SaveStore: AnyObject {
    /// Nil if nothing is saved yet or the save cannot be read.
    func load() -> SaveGame?
    func save(_ game: SaveGame)
}

/// Plays sound effects. Test window: raylib. App: AVAudioEngine. Tests: silent or recording.
public protocol AudioPlaying: AnyObject {
    /// Plays a sound, sped up or slowed down by `pitch` (1 = as recorded).
    func play(_ sound: SoundID, pitch: Double)
}

extension AudioPlaying {
    public func play(_ sound: SoundID) { play(sound, pitch: 1) }
}

/// Plays haptic patterns. App: Core Haptics with the `.ahap` files. Test window: none.
public protocol HapticsPlaying: AnyObject {
    /// - Parameter softness: 0…1, how much deeper and softer than the pattern it is felt
    ///   (`Feedback.softness`, the flow).
    func play(_ haptic: HapticID, softness: Double)
}

extension HapticsPlaying {
    public func play(_ haptic: HapticID) { play(haptic, softness: 0) }
}

/// Hands out the seed of each new shift. Test window: `--seed` or the clock. Tests: fixed.
public protocol RandomSource: AnyObject {
    func nextSeed() -> UInt64
}

/// What is kept between launches. Versioned, so later updates can read old saves (M5).
public struct SaveGame: Codable, Sendable, Equatable {
    public static let currentVersion = 1

    public var version = SaveGame.currentVersion
    /// Best score of a completed shift. Aborted shifts never count (FOUNDATION.md 2.6).
    public var highscore = 0
    public var highscoreSeed: UInt64?
    public var shiftsPlayed = 0
    public var settings = Settings()
    /// Level, money and upgrades (M5). A completed shift is a level up, a lost one is
    /// played again (`Career.record`).
    public var career = Career()
    /// The first shift's hints were shown (`Tutorial`).
    public var tutorialDone = false

    public init() {}

    /// Missing keys fall back to their defaults, so a save from an older version still loads.
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let defaults = SaveGame()
        version = try container.decodeIfPresent(Int.self, forKey: .version) ?? defaults.version
        highscore = try container.decodeIfPresent(Int.self, forKey: .highscore) ?? defaults.highscore
        highscoreSeed = try container.decodeIfPresent(UInt64.self, forKey: .highscoreSeed)
        shiftsPlayed = try container.decodeIfPresent(Int.self, forKey: .shiftsPlayed) ?? defaults.shiftsPlayed
        settings = try container.decodeIfPresent(Settings.self, forKey: .settings) ?? defaults.settings
        // Whoever played before this existed never needs the tutorial.
        tutorialDone = try container.decodeIfPresent(Bool.self, forKey: .tutorialDone) ?? (shiftsPlayed > 0)
        if let career = try container.decodeIfPresent(Career.self, forKey: .career) {
            self.career = career
        } else {
            // Before the career, money and level were stored on their own.
            let legacy = try decoder.container(keyedBy: LegacyKeys.self)
            career = Career(
                level: try legacy.decodeIfPresent(Int.self, forKey: .level) ?? 1,
                money: try legacy.decodeIfPresent(Int.self, forKey: .money) ?? 0
            )
        }
    }

    private enum LegacyKeys: String, CodingKey {
        case money
        case level
    }
}

/// Shows a rewarded ad (the app plugs an ad provider in here, M12). The game only asks for
/// one and hands out a Standard chest if it was watched to the end.
public protocol AdProviding: AnyObject {
    func showRewardedAd(completion: @escaping (Bool) -> Void)
}

public struct Settings: Codable, Sendable, Equatable {
    public var sound = true
    public var haptics = true
    public var reduceMotion = ReduceMotion.system
    /// Accessibility (IDEA.md, M11): a short text label on every special vehicle, so colour
    /// is never the only way to tell police, criminal and transporter apart.
    public var vehicleLabels = false

    public init() {}

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let defaults = Settings()
        sound = try container.decodeIfPresent(Bool.self, forKey: .sound) ?? defaults.sound
        haptics = try container.decodeIfPresent(Bool.self, forKey: .haptics) ?? defaults.haptics
        reduceMotion = (try? container.decodeIfPresent(ReduceMotion.self, forKey: .reduceMotion)) ?? defaults.reduceMotion
        vehicleLabels = (try? container.decodeIfPresent(Bool.self, forKey: .vehicleLabels)) ?? defaults.vehicleLabels
    }
}

/// Removes shake, zoom and slow motion; fades and colour changes stay (FOUNDATION.md 3).
public enum ReduceMotion: String, Codable, Sendable, CaseIterable {
    /// Follows the iOS setting.
    case system
    case on
    case off
}

/// Keeps the save in memory. For tests and previews.
public final class MemorySaveStore: SaveStore {
    public private(set) var game: SaveGame?
    public private(set) var saveCount = 0

    public init(_ game: SaveGame? = nil) {
        self.game = game
    }

    public func load() -> SaveGame? { game }

    public func save(_ game: SaveGame) {
        self.game = game
        saveCount += 1
    }
}

/// Keeps the save as a JSON file. The same code serves the test window and the app;
/// only the place of the file differs.
public final class FileSaveStore: SaveStore {
    public let url: URL

    public init(url: URL) {
        self.url = url
    }

    /// An unreadable file is moved aside (`*.unreadable.json`) instead of being overwritten
    /// by the next save, so a highscore is never lost silently.
    public func load() -> SaveGame? {
        guard let data = try? Data(contentsOf: url) else { return nil }
        do {
            return try JSONDecoder().decode(SaveGame.self, from: data)
        } catch {
            let aside = url.deletingPathExtension().appendingPathExtension("unreadable.json")
            try? FileManager.default.removeItem(at: aside)
            try? FileManager.default.moveItem(at: url, to: aside)
            return nil
        }
    }

    public func save(_ game: SaveGame) {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        guard let data = try? encoder.encode(game) else { return }
        try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try? data.write(to: url, options: .atomic)
    }
}
