import GameCore

/// Screen changes are never a cut (Leo, 25.09.2026: "dieses Smoothe überall"): whatever lay
/// over the scene — HUD, result, a page, the settings — fades and slides out while the new
/// one springs in with the chest's spring. Tabs move sideways in tab-bar order, the settings
/// come up from below, the game's own screens rise a little. Reduce Motion keeps only the
/// cross-fade. The scene and the tab strip underneath never move.
struct ScreenTransition {
    /// How long the new screen springs.
    static let duration = 0.42
    /// The new one is fully there after this…
    static let fadeIn = 0.2
    /// …and the old one gone after this: quick, so the two never read as one.
    static let fadeOut = 0.16
    /// How far a tab slides in, and the old one out (points).
    static let tabSlide = 28.0
    static let tabSlideOut = 16.0
    /// How far the settings and the game's screens rise in.
    static let rise = 16.0

    /// Which screen, without what it shows: a new result is not a new screen.
    enum Key: Equatable {
        case ready, settings, playing, result
        case page(Tab)

        init(_ screen: Screen) {
            switch screen {
            case .ready: self = .ready
            case .settings: self = .settings
            case .playing: self = .playing
            case .result: self = .result
            case let .page(tab): self = .page(tab)
            }
        }

        /// The tab-bar position; the game's own screens sit on the Game tab.
        var tabIndex: Int {
            let tab: Tab = if case let .page(tab) = self { tab } else { .game }
            return Tab.allCases.firstIndex(of: tab) ?? 0
        }
    }

    /// What was on screen the frame before the change, as it was drawn.
    var outgoing: [RenderItem]
    var age = 0.0
    /// The new screen comes from: +1 the right, -1 the left, 0 below.
    var direction: Double

    init(from old: Key, to new: Key, outgoing: [RenderItem]) {
        self.outgoing = outgoing
        direction = old.tabIndex == new.tabIndex || new == .settings || old == .settings
            ? 0
            : (new.tabIndex > old.tabIndex ? 1 : -1)
    }

    var isDone: Bool { age >= Self.duration }

    /// Moves the new screen's items (`incoming`) to where the spring has them and puts the
    /// fading old screen underneath.
    func apply(to list: inout RenderList, incoming: Range<Int>, reduceMotion: Bool) {
        let fade = Ease.outCubic(age / Self.fadeIn)
        let spring = Ease.spring(age / Self.duration)
        let way = direction == 0 ? Vec2(0, Self.rise) : Vec2(Self.tabSlide * direction, 0)
        let shift = reduceMotion ? Vec2.zero : way * (1 - spring)
        for index in incoming {
            list.items[index] = list.items[index].moved(by: shift, opacity: fade)
        }

        let gone = Ease.outCubic(age / Self.fadeOut)
        guard gone < 1 else { return }
        let away = reduceMotion || direction == 0 ? Vec2.zero : Vec2(-Self.tabSlideOut * direction, 0) * gone
        let old = outgoing.enumerated().map { index, item in
            var item = item.moved(by: away, opacity: 1 - gone)
            item.id = RenderID.transition + index
            return item
        }
        list.items.insert(contentsOf: old, at: incoming.lowerBound)
    }
}

extension RenderItem {
    /// Shifted on screen by `offset` (world items stay where they are: they belong to the
    /// scene's place) and faded by `opacity`.
    func moved(by offset: Vec2, opacity factor: Double) -> RenderItem {
        var item = self
        item.opacity *= factor
        guard space == .screen, offset != .zero else { return item }
        item.primitive = switch primitive {
        case let .roundedRect(center, size, cornerRadius, rotation):
            .roundedRect(center: center + offset, size: size, cornerRadius: cornerRadius, rotation: rotation)
        case let .circle(center, radius):
            .circle(center: center + offset, radius: radius)
        case let .arc(center, radius, thickness, startAngle, endAngle):
            .arc(center: center + offset, radius: radius, thickness: thickness, startAngle: startAngle, endAngle: endAngle)
        case let .line(from, to, thickness):
            .line(from: from + offset, to: to + offset, thickness: thickness)
        case let .polygon(points):
            .polygon(points.map { $0 + offset })
        case let .text(string, position, size, alignment, weight):
            .text(string, position: position + offset, size: size, alignment: alignment, weight: weight)
        }
        return item
    }
}
