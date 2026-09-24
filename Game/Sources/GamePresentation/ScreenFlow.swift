import GameCore

/// The pages of the tab bar (FOUNDATION.md 3): a native `TabView` in the app (M12), a plain
/// strip at the bottom of the test window. Game is where you play; there is no start menu.
public enum Tab: String, CaseIterable, Sendable {
    case streetBuilder
    case game
    case shop
    case upgrades

    /// SF Symbol for the tab bar of the app.
    public var symbol: String {
        switch self {
        case .streetBuilder: "map"
        case .game: "car.fill"
        case .shop: "bag"
        case .upgrades: "arrow.up.circle"
        }
    }
}

/// Which screen is showing (FOUNDATION.md 3). The Game tab is ready, playing or showing
/// the result; the other tabs are pages. Settings open over the Game tab.
///
/// There is no pause screen: a shift lasts about twenty seconds, and a menu over a running
/// shift would break it in two. An interruption (a call, the home screen) freezes the world
/// and counts back in when the player returns (`GameSession.countIn`).
public enum Screen: Sendable, Equatable {
    /// The Game tab between shifts: the roundabout, and one tap starts the next shift.
    case ready
    /// Over the Game tab; a sheet in the app.
    case settings
    case playing
    case result(ShiftSummary)
    /// Street Builder, Shop or Upgrades.
    case page(Tab)

    /// The tab this screen belongs to.
    public var tab: Tab {
        if case let .page(tab) = self { return tab }
        return .game
    }

    /// The tab bar hides during a shift and behind the settings.
    public var showsTabBar: Bool {
        switch self {
        case .ready, .result, .page: true
        case .settings, .playing: false
        }
    }
}

/// A finished shift as the result banner shows it.
public struct ShiftSummary: Sendable, Equatable {
    public var result: ShiftResult
    /// The level this shift was played at.
    public var level: Int
    public var isNewHighscore: Bool
    /// Highscore before this shift.
    public var previousHighscore: Int
}

/// Everything a menu or a tab can do. The SwiftUI buttons of the app call these directly.
public enum ScreenAction: Sendable, Equatable {
    case startShift
    case restart
    case openSettings
    case closeSettings
    case toggleSound
    case toggleHaptics
    case cycleReduceMotion
    /// Normal duty or High Alert for the next shift (a segmented control in the app).
    case setDuty(Duty)
    case showTab(Tab)
    /// Opens an upgrade's details; tapping the open one again buys it.
    case selectUpgrade(Upgrade)
    case buy(Upgrade)
    /// Street Builder: pick up a part, put it down on a slot, build or remove it.
    case pickUpPart(StreetBuilderPage.Part)
    case placePart(slot: Int)
    case buildPart
    case removePart
}

public struct MenuItem: Sendable, Equatable {
    public var action: ScreenAction
    public var label: String
    /// A second, smaller line under the label (what an upgrade does); nil for most items.
    public var detail: String?
    /// Current value of a setting ("On") or a price; nil for plain buttons.
    public var value: String?
    /// The screen's main action: Enter in the test window, the prominent button in the app.
    public var isPrimary: Bool

    public init(_ action: ScreenAction, _ label: String, detail: String? = nil, value: String? = nil, isPrimary: Bool = false) {
        self.action = action
        self.label = label
        self.detail = detail
        self.value = value
        self.isPrimary = isPrimary
    }
}

/// What a menu screen shows, as data: the test window draws it as a text page, the app
/// builds SwiftUI views from it (M12).
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
    /// Content of a menu screen or a page. Nil on the Game tab while ready, playing and
    /// after a shift: its banners and the HUD are part of the scene.
    public static func content(for screen: Screen, save: SaveGame, world: World, config: Config, format: TextFormat) -> ScreenContent? {
        switch screen {
        case .ready, .playing, .result, .page(.game):
            return nil

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

        case .page(.upgrades):
            let career = save.career
            return ScreenContent(
                title: Strings.Upgrades.title,
                subtitle: Strings.Upgrades.balance(format.number(career.money)),
                items: Upgrade.available(atLevel: career.level, config: config).map { upgrade in
                    let steps = career.steps(of: upgrade)
                    let value = career.price(of: upgrade, config: config).map {
                        Strings.Upgrades.next(steps: steps, of: upgrade.maxSteps, price: format.number($0))
                    } ?? Strings.Upgrades.maxed
                    return MenuItem(.buy(upgrade), Strings.Upgrades.name(upgrade), detail: Strings.Upgrades.detail(upgrade, config: config), value: value)
                }
            )

        case .page(.shop):
            return ScreenContent(title: Strings.Tabs.title(.shop), subtitle: Strings.Pages.shopLater)

        // The Street Builder draws its own map and palette (`StreetBuilderPage`).
        case .page(.streetBuilder):
            return nil
        }
    }
}

/// The tab bar of the test window: a plain strip at the bottom. The app has a native
/// `TabView` instead, so only the test window draws this.
public enum TabStrip {
    public static let height = 52.0

    /// The tab under a point on the screen; nil outside the strip.
    public static func tab(at point: Vec2, viewport: Vec2) -> Tab? {
        guard point.y >= viewport.y - height, point.y <= viewport.y, point.x >= 0, point.x < viewport.x else { return nil }
        let index = Int(point.x / (viewport.x / Double(Tab.allCases.count)))
        return Tab.allCases[min(index, Tab.allCases.count - 1)]
    }

    static func add(selected: Tab, to list: inout RenderList) {
        let viewport = list.camera.viewport
        var id = RenderID.menu + 200
        let top = viewport.y - height
        list.add(.roundedRect(center: Vec2(viewport.x / 2, top + height / 2), size: Vec2(viewport.x, height), cornerRadius: 0, rotation: 0), color: .island, space: .screen, id: id)
        id += 1
        list.add(.line(from: Vec2(0, top), to: Vec2(viewport.x, top), thickness: 1), color: .marking, space: .screen, id: id)
        id += 1
        let cell = viewport.x / Double(Tab.allCases.count)
        for (index, tab) in Tab.allCases.enumerated() {
            let isSelected = tab == selected
            list.add(
                .text(Strings.Tabs.title(tab), position: Vec2(cell * (Double(index) + 0.5), top + height / 2), size: 14, alignment: .center, weight: isSelected ? .bold : .regular),
                color: isSelected ? .accent : .muted, space: .screen, id: id
            )
            id += 1
        }
    }
}

/// Draws a menu screen as a plain text page. Only the test window uses this; it is a tool,
/// so the page is clear and readable, not designed (the SwiftUI menus come in M11/M12).
enum TextPage {
    static func add(_ content: ScreenContent, showsKeys: Bool, bottomInset: Double, to list: inout RenderList) {
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
        let rowHeight = content.items.contains { $0.detail != nil } ? 56.0 : 44.0
        height += 24 + Double(content.items.count) * rowHeight
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
            let row = Vec2(centerX, y + rowHeight / 2 - 2)
            // With a detail line the label moves up to make room below it.
            let labelY = item.detail == nil ? row.y : row.y - 9
            if item.isPrimary {
                list.add(.roundedRect(center: row, size: Vec2(width, rowHeight - 4), cornerRadius: 10, rotation: 0), color: .surface, space: .screen, id: id)
                id += 1
            }
            if showsKeys {
                text(Strings.Keys.number(index + 1), x: left + 16, y: labelY, size: 15, alignment: .leading, color: .muted)
            }
            let textX = left + (showsKeys ? 40 : 16)
            text(item.label, x: textX, y: labelY, size: 17, alignment: .leading, weight: item.isPrimary ? .bold : .regular, color: item.isPrimary ? .accent : .primary)
            if let detail = item.detail {
                text(detail, x: textX, y: labelY + 19, size: 13, alignment: .leading, color: .muted)
            }
            if let value = item.value {
                text(value, x: right - 16, y: labelY, size: 15, alignment: .trailing, weight: .bold, color: .primary)
            } else if item.isPrimary && showsKeys {
                text(Strings.Keys.enter, x: right - 16, y: row.y, size: 13, alignment: .trailing, color: .muted)
            }
            y += rowHeight
        }
        if let footnote = content.footnote {
            text(footnote, x: centerX, y: y + 24, size: 13, color: .muted)
        }
        if showsKeys {
            for (index, line) in Strings.Keys.controls.enumerated() {
                let lineY = viewport.y - bottomInset - 20 - Double(Strings.Keys.controls.count - 1 - index) * 18
                text(line, x: centerX, y: lineY, size: 12, color: .muted)
            }
        }
    }
}
