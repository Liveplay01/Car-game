import GameCore

/// Which screen is showing (FOUNDATION.md 3). Start → Shift → Pause, the result banner, plus Settings.
public enum Screen: Sendable, Equatable {
    case start
    case settings
    case playing
    case paused
    case result(ShiftSummary)
}

/// A finished shift as the result banner shows it.
public struct ShiftSummary: Sendable, Equatable {
    public var result: ShiftResult
    public var isNewHighscore: Bool
    /// Highscore before this shift.
    public var previousHighscore: Int
}

/// Everything a menu can do. The app's SwiftUI buttons call these directly.
public enum ScreenAction: Sendable, Equatable {
    case startShift
    case pause
    case resume
    case restart
    case menu
    case openSettings
    case closeSettings
    case toggleSound
    case toggleHaptics
    case cycleReduceMotion
}

/// Upgrades the player can buy (M5). Each raises a stat for every future shift.
public enum UpgradeID: String, Sendable, Equatable, CaseIterable {
    case morePolice
    case longerShift
    case lessCriminals
    case moreTransporters
    case fasterResponse
}

public struct MenuItem: Sendable, Equatable {
    public var action: ScreenAction
    public var label: String
    /// Current value of a setting ("On"); nil for plain buttons.
    public var value: String?
    /// The screen's main action: Enter in the test window, the prominent button in the app.
    public var isPrimary: Bool

    public init(_ action: ScreenAction, _ label: String, value: String? = nil, isPrimary: Bool = false) {
        self.action = action
        self.label = label
        self.value = value
        self.isPrimary = isPrimary
    }
}

/// What a menu screen shows, as data: the test window draws it as a text page, the app
/// builds SwiftUI views from it (M7).
public struct ScreenContent: Sendable, Equatable {
    public struct Stat: Sendable, Equatable {
        public var label: String
        public var value: String
    }

    /// A highlighted moment above the title ("New highscore").
    public var badge: String?
    public var title: String
    public var subtitle: String?
    /// The one big number (the score).
    public var headline: String?
    public var stats: [Stat] = []
    public var items: [MenuItem] = []
    public var footnote: String?
}

public enum ScreenFlow {
    /// Content of a menu screen. Nil while playing and after a shift: the HUD and the
    /// result banner are part of the scene.
    public static func content(for screen: Screen, save: SaveGame, world: World, format: TextFormat) -> ScreenContent? {
        switch screen {
        case .playing, .result:
            return nil

        case .start:
            return ScreenContent(
                title: Strings.gameTitle,
                subtitle: save.highscore > 0 ? Strings.Menu.highscore(format.number(save.highscore)) : Strings.Menu.noHighscore,
                items: [
                    MenuItem(.startShift, Strings.Menu.startShift, isPrimary: true),
                    MenuItem(.openSettings, Strings.Menu.settings),
                ],
                footnote: Strings.Menu.tagline
            )

        case .settings:
            let settings = save.settings
            return ScreenContent(
                title: Strings.SettingsMenu.title,
                items: [
                    MenuItem(.toggleSound, Strings.SettingsMenu.sound, value: Strings.SettingsMenu.toggle(settings.sound)),
                    MenuItem(.toggleHaptics, Strings.SettingsMenu.haptics, value: Strings.SettingsMenu.toggle(settings.haptics)),
                    MenuItem(.cycleReduceMotion, Strings.SettingsMenu.reduceMotion, value: Strings.SettingsMenu.reduceMotion(settings.reduceMotion)),
                    MenuItem(.closeSettings, Strings.Menu.back, isPrimary: true),
                ]
            )

        case .paused:
            return ScreenContent(
                title: Strings.Menu.paused,
                subtitle: Strings.Menu.pausedStatus(score: format.number(world.score.points), left: format.clock(world.remainingTime)),
                items: [
                    MenuItem(.resume, Strings.Menu.resume, isPrimary: true),
                    MenuItem(.restart, Strings.Menu.restart),
                    MenuItem(.menu, Strings.Menu.menu),
                ]
            )
        }
    }
}

/// Draws a menu screen as a plain text page. Only the test window uses this; it is a tool,
/// so the page is clear and readable, not designed (the SwiftUI menus come in M6/M7).
enum TextPage {
    static func add(_ content: ScreenContent, showsKeys: Bool, to list: inout RenderList) {
        let viewport = list.camera.viewport
        let width = min(viewport.x - 48, 320)
        let left = (viewport.x - width) / 2
        let right = left + width
        let centerX = viewport.x / 2
        var id = RenderID.menu

        func text(_ string: String, x: Double, y: Double, size: Double, alignment: TextAlignment = .center, weight: FontWeight = .regular, color: ColorToken) {
            list.add(.text(string, position: Vec2(x, y), size: size, alignment: alignment, weight: weight), color: color, space: .screen, id: id)
            id += 1
        }

        list.add(.roundedRect(center: viewport / 2, size: viewport, cornerRadius: 0, rotation: 0), color: .scrim, space: .screen, id: id)
        id += 1

        // Height first, so the page sits a little above the middle.
        var height = 44.0
        if content.badge != nil { height += 32 }
        if content.subtitle != nil { height += 28 }
        if content.headline != nil { height += 80 }
        if !content.stats.isEmpty { height += 16 + Double(content.stats.count) * 28 }
        height += 24 + Double(content.items.count) * 44
        if content.footnote != nil { height += 40 }
        var y = max(Metrics.sceneInsets.top, (viewport.y - height) * 0.42)

        if let badge = content.badge {
            text(badge, x: centerX, y: y + 12, size: 15, weight: .bold, color: .accent)
            y += 32
        }
        text(content.title, x: centerX, y: y + 20, size: 30, weight: .bold, color: .primary)
        y += 44
        if let subtitle = content.subtitle {
            text(subtitle, x: centerX, y: y + 12, size: 15, color: .muted)
            y += 28
        }
        if let headline = content.headline {
            text(headline, x: centerX, y: y + 40, size: 56, weight: .bold, color: .primary)
            y += 80
        }
        if !content.stats.isEmpty {
            y += 16
            for stat in content.stats {
                text(stat.label, x: left, y: y + 14, size: 16, alignment: .leading, color: .muted)
                text(stat.value, x: right, y: y + 14, size: 16, alignment: .trailing, weight: .bold, color: .primary)
                y += 28
            }
        }
        y += 24
        for (index, item) in content.items.enumerated() {
            let row = Vec2(centerX, y + 20)
            if item.isPrimary {
                list.add(.roundedRect(center: row, size: Vec2(width, 40), cornerRadius: 10, rotation: 0), color: .surface, space: .screen, id: id)
                id += 1
            }
            if showsKeys {
                text(Strings.Keys.number(index + 1), x: left + 16, y: row.y, size: 15, alignment: .leading, color: .muted)
            }
            text(item.label, x: left + (showsKeys ? 40 : 16), y: row.y, size: 17, alignment: .leading, weight: item.isPrimary ? .bold : .regular, color: item.isPrimary ? .accent : .primary)
            if let value = item.value {
                text(value, x: right - 16, y: row.y, size: 17, alignment: .trailing, weight: .bold, color: .primary)
            } else if item.isPrimary && showsKeys {
                text(Strings.Keys.enter, x: right - 16, y: row.y, size: 13, alignment: .trailing, color: .muted)
            }
            y += 44
        }
        if let footnote = content.footnote {
            text(footnote, x: centerX, y: y + 24, size: 13, color: .muted)
        }
        if showsKeys {
            for (index, line) in Strings.Keys.controls.enumerated() {
                let lineY = viewport.y - 20 - Double(Strings.Keys.controls.count - 1 - index) * 18
                text(line, x: centerX, y: lineY, size: 12, color: .muted)
            }
        }
    }
}
