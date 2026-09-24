import Foundation
import GameCore

/// The Shop tab (IDEA.md: Lootboxen, Truhen, Skins; ROADMAP.md, M10): chests to open or buy,
/// the collection to wear from, and today's Daily Shift and challenges. A segmented control
/// switches between the three, like a native `Picker(.segmented)`.
///
/// Fair and quiet on purpose: the odds are always on screen, the pity counter too, and an
/// opened chest gets a frame in its rarity colour and a soft glow — no casino effects.
/// Reduce Motion keeps the reveal as a fade.
public enum ShopPage {
    public enum Section: Int, Sendable, Equatable, CaseIterable {
        case chests
        case collection
        case today
    }

    /// Everything on the page that answers a tap.
    public enum Target: Sendable, Equatable {
        case section(Section)
        case chest(ChestKind)
        case open(ChestKind)
        case buy(ChestKind)
        case item(String)
        case wear(String)
        /// A tap anywhere closes the reveal of an opened chest.
        case dismiss
    }

    public struct State: Sendable, Equatable {
        public var section = Section.chests
        public var selectedChest = ChestKind.standard
        public var selectedItem: String?
        /// Real time since the page opened.
        public var age = 0.0
        /// The chest just opened, shown until tapped away.
        public var opening: (opening: ChestOpening, age: Double)?
        /// A refused purchase, and how long ago.
        public var denied = 0.0

        public init() {}

        public static func == (a: State, b: State) -> Bool {
            a.section == b.section && a.selectedChest == b.selectedChest && a.selectedItem == b.selectedItem
                && a.age == b.age && a.opening?.opening == b.opening?.opening && a.denied == b.denied
        }

        public mutating func age(by delta: Double) {
            age += delta
            if var opening {
                opening.age += delta
                self.opening = opening
            }
            if denied > 0 {
                denied += delta
                if denied > 0.4 { denied = 0 }
            }
        }
    }

    static let gap = 12.0
    static let corner = 14.0
    static let detailHeight = 128.0
    static let segmentHeight = 32.0
    static let revealDuration = 0.45

    // MARK: - Layout

    struct Layout {
        var segments: [(Section, Rect)]
        var content: Rect
        var detail: Rect
    }

    static func layout(viewport: Vec2, bottomInset: Double) -> Layout {
        let width = min(viewport.x - 2 * gap, 460)
        let left = (viewport.x - width) / 2
        let top = Metrics.sceneInsets.top + 22
        let segmentWidth = width / Double(Section.allCases.count)
        let segments = Section.allCases.enumerated().map { index, section in
            (section, Rect(minX: left + Double(index) * segmentWidth, minY: top, maxX: left + Double(index + 1) * segmentWidth, maxY: top + segmentHeight))
        }
        let detailTop = viewport.y - bottomInset - detailHeight
        let content = Rect(minX: left, minY: top + segmentHeight + gap, maxX: left + width, maxY: detailTop - gap)
        let detail = Rect(minX: left, minY: detailTop, maxX: left + width, maxY: detailTop + detailHeight - 8)
        return Layout(segments: segments, content: content, detail: detail)
    }

    /// Cells in a grid filling `area`.
    static func grid(_ count: Int, columns: Int, in area: Rect, maxHeight: Double) -> [Rect] {
        let rows = max(1, (count + columns - 1) / columns)
        let cellWidth = (area.width - gap * Double(columns - 1)) / Double(columns)
        let cellHeight = min(maxHeight, (area.height - gap * Double(rows - 1)) / Double(rows))
        return (0..<count).map { index in
            let x = area.minX + Double(index % columns) * (cellWidth + gap)
            let y = area.minY + Double(index / columns) * (cellHeight + gap)
            return Rect(minX: x, minY: y, maxX: x + cellWidth, maxY: y + cellHeight)
        }
    }

    static func chestCards(_ layout: Layout) -> [(ChestKind, Rect)] {
        Array(zip(ChestKind.allCases, grid(ChestKind.allCases.count, columns: 2, in: layout.content, maxHeight: 150)))
    }

    static func itemCells(_ layout: Layout) -> [(Cosmetic, Rect)] {
        Array(zip(Cosmetics.all, grid(Cosmetics.all.count, columns: 4, in: layout.content, maxHeight: 118)))
    }

    /// The buttons of the detail panel: up to two, right-aligned.
    static func buttons(_ layout: Layout, career: Career, state: State) -> [(Target, Rect)] {
        let height = 34.0
        let y = layout.detail.maxY - 16 - height
        func button(_ index: Int, _ target: Target) -> (Target, Rect) {
            let width = 118.0
            let right = layout.detail.maxX - 14 - Double(index) * (width + 10)
            return (target, Rect(minX: right - width, minY: y, maxX: right, maxY: y + height))
        }
        switch state.section {
        case .chests:
            var list = [button(0, .open(state.selectedChest))]
            if state.selectedChest.isForSale { list.append(button(1, .buy(state.selectedChest))) }
            return list
        case .collection:
            guard let id = state.selectedItem, career.owns(id), Cosmetics.item(id)?.kind != .vehicleType else { return [] }
            return [button(0, .wear(id))]
        case .today:
            return []
        }
    }

    /// Everything tappable, in the order it is checked.
    static func targets(viewport: Vec2, bottomInset: Double, career: Career, state: State) -> [(Target, Rect)] {
        if state.opening != nil {
            return [(.dismiss, Rect(minX: 0, minY: 0, maxX: viewport.x, maxY: viewport.y))]
        }
        let layout = layout(viewport: viewport, bottomInset: bottomInset)
        var list: [(Target, Rect)] = layout.segments.map { (.section($0.0), $0.1) }
        list += buttons(layout, career: career, state: state)
        switch state.section {
        case .chests: list += chestCards(layout).map { (.chest($0.0), $0.1) }
        case .collection: list += itemCells(layout).map { (.item($0.0.id), $0.1) }
        case .today: break
        }
        return list
    }

    /// What a tap at `point` hits.
    public static func target(at point: Vec2, viewport: Vec2, bottomInset: Double, career: Career, state: State) -> Target? {
        targets(viewport: viewport, bottomInset: bottomInset, career: career, state: state).first { $0.1.contains(point) }?.0
    }

    // MARK: - Drawing

    static func add(career: Career, config: Config, today: Int, state: State, format: TextFormat, reduceMotion: Bool, bottomInset: Double, to list: inout RenderList) {
        let viewport = list.camera.viewport
        var id = RenderID.menu
        list.add(.roundedRect(center: viewport / 2, size: viewport, cornerRadius: 0, rotation: 0), color: .scrim, space: .screen, id: id)
        id += 1
        list.add(.text(Strings.Tabs.title(.shop), position: Vec2(viewport.x / 2, Metrics.sceneInsets.top - 30), size: 26, alignment: .center, weight: .bold), color: .primary, space: .screen, id: id)
        id += 1
        Icons.moneyTag(Strings.Upgrades.balance(format.number(career.money)), at: Vec2(viewport.x / 2, Metrics.sceneInsets.top - 2), size: 15, alignment: .center, color: .accent, id: &id, to: &list)

        let layout = layout(viewport: viewport, bottomInset: bottomInset)
        addSegments(layout, state: state, career: career, id: &id, to: &list)
        let enter = reduceMotion ? 1 : Ease.outCubic(state.age / 0.25)
        switch state.section {
        case .chests: addChests(layout, career: career, config: config, state: state, format: format, enter: enter, id: &id, to: &list)
        case .collection: addCollection(layout, career: career, state: state, enter: enter, id: &id, to: &list)
        case .today: addToday(layout, career: career, today: today, format: format, enter: enter, id: &id, to: &list)
        }
        addDetail(layout, career: career, config: config, today: today, state: state, format: format, id: &id, to: &list)
        if let opening = state.opening {
            addReveal(opening.opening, age: opening.age, format: format, reduceMotion: reduceMotion, id: &id, to: &list)
        }
    }

    private static func text(_ string: String, _ at: Vec2, size: Double, weight: FontWeight = .regular, color: ColorToken, alignment: TextAlignment = .leading, opacity: Double = 1, id: inout Int, to list: inout RenderList) {
        list.add(.text(string, position: at, size: size, alignment: alignment, weight: weight), color: color, opacity: opacity, space: .screen, id: id)
        id += 1
    }

    private static func panel(_ rect: Rect, color: ColorToken = .surface, opacity: Double = 1, id: inout Int, to list: inout RenderList) {
        list.add(.roundedRect(center: rect.center, size: Vec2(rect.width, rect.height), cornerRadius: corner, rotation: 0), color: color, opacity: opacity, space: .screen, id: id)
        id += 1
    }

    /// The segmented control: one pill slides under the chosen section.
    private static func addSegments(_ layout: Layout, state: State, career: Career, id: inout Int, to list: inout RenderList) {
        guard let first = layout.segments.first?.1, let last = layout.segments.last?.1 else { return }
        let all = Rect(minX: first.minX, minY: first.minY, maxX: last.maxX, maxY: first.maxY)
        list.add(.roundedRect(center: all.center, size: Vec2(all.width, all.height), cornerRadius: segmentHeight / 2, rotation: 0), color: .surface, space: .screen, id: id)
        id += 1
        for (section, rect) in layout.segments {
            let chosen = section == state.section
            if chosen {
                list.add(.roundedRect(center: rect.center, size: Vec2(rect.width - 6, rect.height - 6), cornerRadius: (segmentHeight - 6) / 2, rotation: 0), color: .marking, space: .screen, id: id)
                id += 1
            }
            var label = Strings.Shop.section(section)
            if section == .chests, !career.chests.isEmpty { label += " · \(career.chests.count)" }
            text(label, rect.center, size: 13, weight: .bold, color: chosen ? .primary : .muted, alignment: .center, id: &id, to: &list)
        }
    }

    // MARK: Chests

    private static func addChests(_ layout: Layout, career: Career, config: Config, state: State, format: TextFormat, enter: Double, id: inout Int, to list: inout RenderList) {
        for (kind, rect) in chestCards(layout) {
            let count = career.count(of: kind)
            let selected = kind == state.selectedChest
            if selected {
                list.add(.roundedRect(center: rect.center, size: Vec2(rect.width + 4, rect.height + 4), cornerRadius: corner + 2, rotation: 0), color: .accent, opacity: 0.55 * enter, space: .screen, id: id)
                id += 1
            }
            panel(rect, opacity: enter, id: &id, to: &list)
            addChestIcon(kind, at: Vec2(rect.center.x, rect.minY + rect.height * 0.36), scale: min(1, rect.height / 130), opacity: enter * (count > 0 || kind.isForSale ? 1 : 0.45), id: &id, to: &list)
            text(Strings.Shop.chest(kind), Vec2(rect.center.x, rect.maxY - 34), size: 13, weight: .bold, color: .primary, alignment: .center, opacity: enter, id: &id, to: &list)
            let status = count > 0 ? Strings.Shop.waiting(count) : Strings.Shop.source(kind)
            text(status, Vec2(rect.center.x, rect.maxY - 16), size: 11, color: count > 0 ? .accent : .muted, alignment: .center, opacity: enter, id: &id, to: &list)
            if count > 0 {
                // A small badge with the count.
                let badge = Vec2(rect.maxX - 18, rect.minY + 18)
                list.add(.circle(center: badge, radius: 10), color: .accent, opacity: enter, space: .screen, id: id)
                id += 1
                text("\(count)", badge, size: 11, weight: .bold, color: .accentInk, alignment: .center, opacity: enter, id: &id, to: &list)
            }
        }
    }

    /// A chest: a box with a lid and a band, in the kind's colour.
    static func addChestIcon(_ kind: ChestKind, at center: Vec2, scale: Double, opacity: Double, id: inout Int, to list: inout RenderList) {
        let color: ColorToken = switch kind {
        case .standard: .rarityCommon
        case .premium: .rarityLegendary
        case .event: .accent
        case .criminalHunt: .vehicleCriminal
        }
        list.add(.roundedRect(center: center + Vec2(0, 8) * scale, size: Vec2(54, 30) * scale, cornerRadius: 5 * scale, rotation: 0), color: color, opacity: opacity * 0.85, space: .screen, id: id)
        id += 1
        list.add(.roundedRect(center: center - Vec2(0, 12) * scale, size: Vec2(58, 16) * scale, cornerRadius: 6 * scale, rotation: 0), color: color, opacity: opacity, space: .screen, id: id)
        id += 1
        list.add(.roundedRect(center: center, size: Vec2(8, 44) * scale, cornerRadius: 2 * scale, rotation: 0), color: .island, opacity: opacity * 0.7, space: .screen, id: id)
        id += 1
        list.add(.roundedRect(center: center - Vec2(0, 3) * scale, size: Vec2(12, 9) * scale, cornerRadius: 2 * scale, rotation: 0), color: .primary, opacity: opacity * 0.9, space: .screen, id: id)
        id += 1
    }

    // MARK: Collection

    private static func addCollection(_ layout: Layout, career: Career, state: State, enter: Double, id: inout Int, to list: inout RenderList) {
        for (item, rect) in itemCells(layout) {
            let owned = career.owns(item.id)
            let worn = career.carSkin == item.id || career.mapSkin == item.id
            let frame = rarityColor(item.rarity)
            let opacity = enter * (owned ? 1 : 0.4)
            list.add(.roundedRect(center: rect.center, size: Vec2(rect.width + 3, rect.height + 3), cornerRadius: corner + 1.5, rotation: 0),
                     color: state.selectedItem == item.id ? .accent : frame, opacity: (state.selectedItem == item.id ? 0.9 : 0.55) * opacity, space: .screen, id: id)
            id += 1
            panel(rect, opacity: enter, id: &id, to: &list)
            addPreview(item, at: Vec2(rect.center.x, rect.minY + rect.height * 0.4), scale: min(1, rect.height / 110), opacity: opacity, id: &id, to: &list)
            text(owned ? Strings.Shop.item(item.id) : Strings.Shop.locked, Vec2(rect.center.x, rect.maxY - 14), size: 11, weight: .bold, color: owned ? .primary : .muted, alignment: .center, opacity: enter, id: &id, to: &list)
            if worn {
                text(Strings.Shop.worn, Vec2(rect.maxX - 10, rect.minY + 12), size: 10, weight: .bold, color: .accent, alignment: .trailing, opacity: enter, id: &id, to: &list)
            }
        }
    }

    static func rarityColor(_ rarity: Rarity) -> ColorToken {
        switch rarity {
        case .common: .rarityCommon
        case .rare: .rarityRare
        case .epic: .rarityEpic
        case .legendary: .rarityLegendary
        }
    }

    /// What an item looks like: a car in the skin's paint, an island in the map's tint, or
    /// the vehicle type itself.
    static func addPreview(_ item: Cosmetic, at center: Vec2, scale: Double, opacity: Double, id: inout Int, to list: inout RenderList) {
        switch item.kind {
        case .carSkin, .vehicleType:
            let isSports = item.kind == .vehicleType
            let paint = isSports ? ColorToken.vehicleSports : (Skins.color(item.id) ?? .vehicleCar)
            let length = (isSports ? 40.0 : 46.0) * scale
            let width = 24 * scale
            list.add(.roundedRect(center: center, size: Vec2(length, width), cornerRadius: 7 * scale, rotation: 0), color: paint, opacity: opacity, space: .screen, id: id)
            id += 1
            list.add(.roundedRect(center: center + Vec2(length * 0.08, 0), size: Vec2(length * 0.36, width * 0.72), cornerRadius: 4 * scale, rotation: 0), color: .vehicleGlass, opacity: opacity, space: .screen, id: id)
            id += 1
            if let stripe = isSports ? ColorToken.primary : Skins.stripe(item.id) {
                for y in [-2.2, 2.2] {
                    list.add(.line(from: center + Vec2(-length / 2 + 3, y * scale), to: center + Vec2(length / 2 - 3, y * scale), thickness: 1.8 * scale), color: stripe, opacity: 0.9 * opacity, space: .screen, id: id)
                    id += 1
                }
            }
        case .mapSkin:
            let tint = Skins.color(item.id) ?? .island
            list.add(.arc(center: center, radius: 24 * scale, thickness: 8 * scale, startAngle: 0, endAngle: Angle.tau), color: .surface, opacity: opacity, space: .screen, id: id)
            id += 1
            list.add(.circle(center: center, radius: 19 * scale), color: .island, opacity: opacity, space: .screen, id: id)
            id += 1
            list.add(.circle(center: center, radius: 19 * scale), color: tint, opacity: 0.45 * opacity, space: .screen, id: id)
            id += 1
            list.add(.arc(center: center, radius: 14 * scale, thickness: 2 * scale, startAngle: 0, endAngle: Angle.tau), color: tint, opacity: opacity, space: .screen, id: id)
            id += 1
        }
    }

    // MARK: Today

    private static func addToday(_ layout: Layout, career: Career, today: Int, format: TextFormat, enter: Double, id: inout Int, to list: inout RenderList) {
        let rows = grid(4, columns: 1, in: layout.content, maxHeight: 64)
        // The Daily Shift first.
        let daily = rows[0]
        panel(daily, opacity: enter, id: &id, to: &list)
        let open = career.isDailyOpen(day: today)
        text(Strings.Daily.title, Vec2(daily.minX + 16, daily.center.y - 9), size: 14, weight: .bold, color: .primary, opacity: enter, id: &id, to: &list)
        text(open ? Strings.Daily.readyHint : Strings.Daily.doneHint(streak: career.dailyStreak), Vec2(daily.minX + 16, daily.center.y + 11), size: 11, color: .muted, opacity: enter, id: &id, to: &list)
        text(open ? Strings.Daily.ready : Strings.Daily.done, Vec2(daily.maxX - 16, daily.center.y), size: 13, weight: .bold, color: open ? .hazard : .accent, alignment: .trailing, opacity: enter, id: &id, to: &list)
        // Then the day's three challenges.
        for (challenge, rect) in zip(Challenge.of(day: today), rows.dropFirst()) {
            let done = career.isDone(challenge, day: today)
            panel(rect, opacity: enter, id: &id, to: &list)
            text(Strings.Daily.challenge(challenge), Vec2(rect.minX + 16, rect.center.y), size: 13, weight: .bold, color: done ? .muted : .primary, opacity: enter, id: &id, to: &list)
            if done {
                text(Strings.Daily.done, Vec2(rect.maxX - 16, rect.center.y), size: 13, weight: .bold, color: .accent, alignment: .trailing, opacity: enter, id: &id, to: &list)
            } else {
                Icons.moneyTag(format.number(challenge.reward), at: Vec2(rect.maxX - 16, rect.center.y), size: 13, alignment: .trailing, color: .primary, opacity: enter, id: &id, to: &list)
            }
        }
    }

    // MARK: Detail panel

    private static func addDetail(_ layout: Layout, career: Career, config: Config, today: Int, state: State, format: TextFormat, id: inout Int, to list: inout RenderList) {
        let detail = layout.detail
        panel(detail, id: &id, to: &list)
        let left = detail.minX + 16
        var y = detail.minY + 22
        switch state.section {
        case .chests:
            let kind = state.selectedChest
            text(Strings.Shop.chest(kind), Vec2(left, y), size: 16, weight: .bold, color: .primary, id: &id, to: &list)
            y += 20
            // The odds are always on screen, next to the chest.
            text(Strings.Shop.odds(kind.odds), Vec2(left, y), size: 11, color: .muted, id: &id, to: &list)
            y += 16
            text(Strings.Shop.pity(Career.pityChests - career.chestsSinceEpic), Vec2(left, y), size: 11, color: .muted, id: &id, to: &list)
        case .collection:
            guard let id0 = state.selectedItem, let item = Cosmetics.item(id0) else {
                text(Strings.Shop.pickItem, detail.center, size: 13, color: .muted, alignment: .center, id: &id, to: &list)
                return
            }
            text(career.owns(item.id) ? Strings.Shop.item(item.id) : Strings.Shop.locked, Vec2(left, y), size: 16, weight: .bold, color: .primary, id: &id, to: &list)
            y += 20
            text(Strings.Shop.kind(item), Vec2(left, y), size: 11, color: rarityColor(item.rarity), id: &id, to: &list)
            y += 16
            text(career.owns(item.id) ? Strings.Shop.ownedHint(item) : Strings.Shop.lockedHint, Vec2(left, y), size: 11, color: .muted, id: &id, to: &list)
        case .today:
            text(Strings.Daily.challengesTitle, Vec2(left, y), size: 16, weight: .bold, color: .primary, id: &id, to: &list)
            y += 20
            text(Strings.Daily.todayHint, Vec2(left, y), size: 11, color: .muted, id: &id, to: &list)
        }
        for (target, rect) in buttons(layout, career: career, state: state) {
            let (label, enabled, prominent) = buttonStyle(target, career: career, config: config, format: format)
            let shake = target == .buy(state.selectedChest) && state.denied > 0 ? sin(state.denied * 40) * 4 : 0
            let center = rect.center + Vec2(shake, 0)
            list.add(.roundedRect(center: center, size: Vec2(rect.width, rect.height), cornerRadius: rect.height / 2, rotation: 0),
                     color: prominent && enabled ? .accent : .marking, opacity: enabled ? 1 : 0.45, space: .screen, id: id)
            id += 1
            text(label, center, size: 13, weight: .bold, color: prominent && enabled ? .accentInk : .primary, alignment: .center, opacity: enabled ? 1 : 0.6, id: &id, to: &list)
        }
    }

    static func buttonStyle(_ target: Target, career: Career, config: Config, format: TextFormat) -> (String, Bool, Bool) {
        switch target {
        case let .open(kind): (Strings.Shop.open, career.count(of: kind) > 0, true)
        case .buy: (Strings.Shop.buy(format.number(config.standardChestPrice)), career.money >= config.standardChestPrice, false)
        case let .wear(id): (career.carSkin == id || career.mapSkin == id ? Strings.Shop.takeOff : Strings.Shop.wear, true, true)
        case .section, .chest, .item, .dismiss: ("", false, false)
        }
    }

    // MARK: Reveal

    /// An opened chest: the item in a frame of its rarity colour, a soft glow that opens
    /// once, and what it is. Tap anywhere to close.
    private static func addReveal(_ opening: ChestOpening, age: Double, format: TextFormat, reduceMotion: Bool, id: inout Int, to list: inout RenderList) {
        let viewport = list.camera.viewport
        let x = Ease.outCubic(age / revealDuration)
        let fade = reduceMotion ? min(1, age / 0.2) : x
        list.add(.roundedRect(center: viewport / 2, size: viewport, cornerRadius: 0, rotation: 0), color: .scrim, opacity: 0.8 * fade, space: .screen, id: id)
        id += 1
        let center = viewport / 2
        let scale = reduceMotion ? 1 : 0.9 + 0.1 * x
        let size = Vec2(250, 290) * scale
        let color = rarityColor(opening.item.rarity)
        if !reduceMotion {
            // The glow opens once and settles; a legendary one a little wider.
            let reach = (opening.item.rarity == .legendary ? 44.0 : 28.0) * x
            list.add(.roundedRect(center: center, size: size + Vec2(reach, reach), cornerRadius: 24 + reach / 2, rotation: 0), color: color, opacity: 0.25 * (1 - 0.6 * x) * fade, space: .screen, id: id)
            id += 1
        }
        list.add(.roundedRect(center: center, size: size + Vec2(4, 4), cornerRadius: 22, rotation: 0), color: color, opacity: fade, space: .screen, id: id)
        id += 1
        list.add(.roundedRect(center: center, size: size, cornerRadius: 20, rotation: 0), color: .surface, opacity: fade, space: .screen, id: id)
        id += 1
        text(Strings.Shop.rarity(opening.item.rarity).uppercased(), center - Vec2(0, 116) * scale, size: 14, weight: .bold, color: color, alignment: .center, opacity: fade, id: &id, to: &list)
        addPreview(opening.item, at: center - Vec2(0, 30) * scale, scale: 1.8 * scale, opacity: fade, id: &id, to: &list)
        text(Strings.Shop.item(opening.item.id), center + Vec2(0, 52) * scale, size: 20, weight: .bold, color: .primary, alignment: .center, opacity: fade, id: &id, to: &list)
        text(Strings.Shop.kind(opening.item), center + Vec2(0, 76) * scale, size: 12, color: .muted, alignment: .center, opacity: fade, id: &id, to: &list)
        if opening.isDuplicate {
            text(Strings.Shop.duplicate(format.number(opening.money)), center + Vec2(0, 100) * scale, size: 12, weight: .bold, color: .accent, alignment: .center, opacity: fade, id: &id, to: &list)
        }
        text(Strings.Shop.tapToClose, center + Vec2(0, 128) * scale, size: 11, color: .muted, alignment: .center, opacity: fade * 0.8, id: &id, to: &list)
    }
}
