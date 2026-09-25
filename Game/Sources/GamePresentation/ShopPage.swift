import Foundation
import GameCore

/// The Shop tab (IDEA.md: Lootboxen, Truhen, Skins; ROADMAP.md, M10): chests to open or buy,
/// the collection to wear from, and today's Daily Shift and challenges. A segmented control
/// switches between the three, like a native `Picker(.segmented)`.
///
/// Fair and quiet on purpose: the odds are always on screen, the pity counter too, and an
/// opened chest gets a frame in its rarity colour and a soft glow â€” no casino effects.
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
        case watchAd
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
        /// The placeholder ad running (test window), and for how long.
        public var ad: Double?

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
            if let ad { self.ad = ad + delta }
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
    /// The placeholder ad of the test window.
    public static let adDuration = 3.0

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
            let width = 104.0
            let right = layout.detail.maxX - 14 - Double(index) * (width + 10)
            return (target, Rect(minX: right - width, minY: y, maxX: right, maxY: y + height))
        }
        switch state.section {
        case .chests:
            var list = [button(0, .open(state.selectedChest))]
            if state.selectedChest.isForSale { list.append(button(1, .buy(state.selectedChest))) }
            if state.selectedChest == .standard { list.append(button(2, .watchAd)) }
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
        if state.ad != nil { return [] }
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

    static func add(career: Career, config: Config, today: Int, state: State, format: TextFormat, reduceMotion: Bool, bottomInset: Double, time: Double = 0, to list: inout RenderList) {
        let viewport = list.camera.viewport
        var id = RenderID.menu
        list.add(.roundedRect(center: viewport / 2, size: viewport, cornerRadius: 0, rotation: 0), color: .scrim, space: .screen, id: id)
        id += 1
        MenuKit.header(Strings.Tabs.title(.shop), money: Strings.Upgrades.balance(format.number(career.money)), viewport: viewport, id: &id, to: &list)

        let layout = layout(viewport: viewport, bottomInset: bottomInset)
        addSegments(layout, state: state, career: career, id: &id, to: &list)
        let enter = reduceMotion ? 1 : Ease.outCubic(state.age / 0.25)
        switch state.section {
        case .chests: addChests(layout, career: career, config: config, state: state, format: format, enter: enter, reduceMotion: reduceMotion, id: &id, to: &list)
        case .collection: addCollection(layout, career: career, state: state, enter: enter, id: &id, to: &list)
        case .today: addToday(layout, career: career, today: today, format: format, enter: enter, id: &id, to: &list)
        }
        addDetail(layout, career: career, config: config, today: today, state: state, format: format, id: &id, to: &list)
        if let ad = state.ad {
            addAd(age: ad, id: &id, to: &list)
        }
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

    /// The segmented control, iOS style: a raised thumb under the chosen section.
    private static func addSegments(_ layout: Layout, state: State, career: Career, id: inout Int, to list: inout RenderList) {
        guard let first = layout.segments.first?.1, let last = layout.segments.last?.1 else { return }
        let all = Rect(minX: first.minX, minY: first.minY, maxX: last.maxX, maxY: first.maxY)
        let labels = layout.segments.map { section, _ in
            section == .chests && !career.chests.isEmpty ? Strings.Shop.section(section) + " · \(career.chests.count)" : Strings.Shop.section(section)
        }
        let chosen = layout.segments.firstIndex { $0.0 == state.section } ?? 0
        MenuKit.segmented(labels, chosen: chosen, thumb: Double(chosen), in: all, id: &id, to: &list)
    }

    // MARK: Chests

    private static func addChests(_ layout: Layout, career: Career, config: Config, state: State, format: TextFormat, enter _: Double, reduceMotion: Bool, id: inout Int, to list: inout RenderList) {
        for (index, (kind, card)) in chestCards(layout).enumerated() {
            // One card after the other: a short rise and fade.
            let enter = reduceMotion ? 1 : MenuKit.stagger(age: state.age, index: index)
            // It rises past its place and settles, like the chest bursting (`MenuKit.cardEnter`).
            let motion = reduceMotion ? (rise: 0.0, scale: 1.0) : MenuKit.cardEnter(MenuKit.staggerSpring(age: state.age, index: index))
            let inset = Vec2(card.width, card.height) * ((1 - motion.scale) / 2)
            let rect = Rect(minX: card.minX + inset.x, minY: card.minY + inset.y + motion.rise, maxX: card.maxX - inset.x, maxY: card.maxY - inset.y + motion.rise)
            let count = career.count(of: kind)
            let selected = kind == state.selectedChest
            if selected {
                list.add(.roundedRect(center: rect.center, size: Vec2(rect.width + 4, rect.height + 4), cornerRadius: corner + 2, rotation: 0), color: .accent, opacity: 0.55 * enter, space: .screen, id: id)
                id += 1
            }
            panel(rect, opacity: enter, id: &id, to: &list)
            // A soft glow in the chest's colour; brighter when one is waiting to be opened.
            let iconAt = Vec2(rect.center.x, rect.minY + rect.height * 0.36)
            let available = count > 0 || kind.isForSale
            MenuKit.glow(at: iconAt, radius: min(rect.width, rect.height) * 0.42, color: chestColor(kind), opacity: (count > 0 ? 0.5 : 0.25) * enter * (available ? 1 : 0.4), id: &id, to: &list)
            addChestIcon(kind, at: iconAt, scale: min(1, rect.height / 130), opacity: enter * (available ? 1 : 0.45), id: &id, to: &list)
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

    /// A chest: a box with a lid and a band, in the kind's colour. `squash` stretches it
    /// (x wider, y lower) around its bottom edge, so it can hop and duck like a jelly.
    static func addChestIcon(_ kind: ChestKind, at center: Vec2, scale: Double, opacity: Double, squash: Vec2 = Vec2(1, 1), lidLift: Double = 0, id: inout Int, to list: inout RenderList) {
        let color = chestColor(kind)
        // The bottom stays on the ground: squashing moves everything down towards it.
        let base = center + Vec2(0, 23 * scale * (1 - squash.y))
        func at(_ offset: Vec2) -> Vec2 { base + Vec2(offset.x * squash.x, offset.y * squash.y) * scale }
        func size(_ size: Vec2) -> Vec2 { Vec2(size.x * squash.x, size.y * squash.y) * scale }
        list.add(.roundedRect(center: at(Vec2(0, 8)), size: size(Vec2(54, 30)), cornerRadius: 5 * scale, rotation: 0), color: color, opacity: opacity * 0.85, space: .screen, id: id)
        id += 1
        list.add(.roundedRect(center: at(Vec2(0, -12 - lidLift)), size: size(Vec2(58, 16)), cornerRadius: 6 * scale, rotation: 0), color: color, opacity: opacity, space: .screen, id: id)
        id += 1
        list.add(.roundedRect(center: at(Vec2(0, 0)), size: size(Vec2(8, 44)), cornerRadius: 2 * scale, rotation: 0), color: .island, opacity: opacity * 0.7, space: .screen, id: id)
        id += 1
        list.add(.roundedRect(center: at(Vec2(0, -3)), size: size(Vec2(12, 9)), cornerRadius: 2 * scale, rotation: 0), color: .primary, opacity: opacity * 0.9, space: .screen, id: id)
        id += 1
    }

    // MARK: Collection

    private static func addCollection(_ layout: Layout, career: Career, state: State, enter: Double, id: inout Int, to list: inout RenderList) {
        for (item, rect) in itemCells(layout) {
            let owned = career.owns(item.id)
            let worn = career.isWorn(item.id)
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
            if let finish = Skins.finish(item.id) {
                // A still picture of the finish: a sheen across, a few sparkles.
                if finish.isShiny {
                    list.add(.line(from: center + Vec2(4, -width / 2 + 2), to: center + Vec2(-4, width / 2 - 2), thickness: 3 * scale), color: .primary, opacity: 0.55 * opacity, space: .screen, id: id)
                    id += 1
                }
                if finish.glitters {
                    for offset in [Vec2(-12, -5), Vec2(8, 6), Vec2(14, -4)] {
                        list.add(.circle(center: center + offset * scale, radius: 1.6 * scale), color: .primary, opacity: opacity, space: .screen, id: id)
                        id += 1
                    }
                }
            }
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
            if item.kind == .carSkin {
                y += 16
                text(Strings.Shop.skinsOn(career.carSkins.count, of: Career.maxCarSkins), Vec2(left, y), size: 11, color: .accent, id: &id, to: &list)
            }
        case .today:
            text(Strings.Daily.challengesTitle, Vec2(left, y), size: 16, weight: .bold, color: .primary, id: &id, to: &list)
            y += 20
            text(Strings.Daily.todayHint, Vec2(left, y), size: 11, color: .muted, id: &id, to: &list)
        }
        for (target, rect) in buttons(layout, career: career, state: state) {
            let (label, enabled, prominent) = buttonStyle(target, career: career, config: config, format: format)
            let shake = target == .buy(state.selectedChest) && state.denied > 0 ? sin(state.denied * 40) * 4 : 0
            let center = rect.center + Vec2(shake, 0)
            MenuKit.button(label, center: center, size: Vec2(rect.width, rect.height), prominent: prominent, enabled: enabled, id: &id, to: &list)
        }
    }

    static func buttonStyle(_ target: Target, career: Career, config: Config, format: TextFormat) -> (String, Bool, Bool) {
        switch target {
        case let .open(kind): (Strings.Shop.open, career.count(of: kind) > 0, true)
        case let .buy(kind):
            (Strings.Shop.buy(format.number(config.price(of: kind) ?? 0)), career.money >= (config.price(of: kind) ?? .max), false)
        case .watchAd:
            (Strings.Shop.watchAdShort, true, false)
        case let .wear(id): (career.isWorn(id) ? Strings.Shop.takeOff : Strings.Shop.wear, true, true)
        case .section, .chest, .item, .dismiss: ("", false, false)
        }
    }

    // MARK: Ad

    /// The test window placeholder for a rewarded ad: a dark card and a countdown.
    private static func addAd(age: Double, id: inout Int, to list: inout RenderList) {
        let viewport = list.camera.viewport
        list.add(.roundedRect(center: viewport / 2, size: viewport, cornerRadius: 0, rotation: 0), color: .background, opacity: 0.96, space: .screen, id: id)
        id += 1
        let left = max(0, Int((adDuration - age).rounded(.up)))
        text(Strings.Shop.adPlaceholder, viewport / 2 - Vec2(0, 16), size: 18, weight: .bold, color: .primary, alignment: .center, id: &id, to: &list)
        text(Strings.Shop.adCountdown(left), viewport / 2 + Vec2(0, 14), size: 13, color: .muted, alignment: .center, id: &id, to: &list)
        let progress = min(1, age / adDuration)
        list.add(.roundedRect(center: viewport / 2 + Vec2(-90 + 90 * progress, 44), size: Vec2(180 * progress, 4), cornerRadius: 2, rotation: 0), color: .accent, space: .screen, id: id)
        id += 1
    }

    // MARK: Reveal

    /// The juicy chest opening (Leo: "sehr jucy, fast ein bisschen zu viel, aber smooth";
    /// then: "splashy, fruity"). Build-up: the chest springs in, wobbles like a jelly, shakes
    /// harder and ducks down just before it bursts. Burst at `burstTime`: a white flash, the
    /// lid spins off, shockwaves, big fruit-coloured splashes pop out and shrink, juice drops
    /// and confetti fly with gravity. Reveal: two layers of rays turn behind a card tinted in
    /// the rarity colour, which pops in like a jelly; the item bounces in after it and then
    /// floats, name and details follow one by one, and little stars twinkle around it. Epic
    /// more, Legendary a third shockwave and a gold rain. Everything is a pure function of
    /// the age, so it never stutters. A tap during the build-up skips to the burst. Reduce
    /// Motion: a calm fade.
    public static let burstTime = 0.9
    static let confettiCount = 32
    /// Apple's system hues: bright, fruity, and never on the road.
    static let juice: [ColorToken] = [.juiceRed, .juiceOrange, .juiceYellow, .juiceGreen, .juiceBlue, .juicePurple]

    private static func addReveal(_ opening: ChestOpening, age: Double, format: TextFormat, reduceMotion: Bool, id _: inout Int, to list: inout RenderList) {
        // Its own id block: a burst draws a few hundred shapes.
        var id = RenderID.menu + 3_000
        let viewport = list.camera.viewport
        let center = viewport / 2 - Vec2(0, 20)
        let rarity = opening.item.rarity
        let color = rarityColor(rarity)
        let power: Double = switch rarity {
        case .common: 0.6
        case .rare: 0.8
        case .epic: 1.1
        case .legendary: 1.5
        }
        let scrim = min(1, age / 0.25)
        list.add(.roundedRect(center: viewport / 2, size: viewport, cornerRadius: 0, rotation: 0), color: .background, opacity: 0.92 * scrim, space: .screen, id: id)
        id += 1

        if reduceMotion {
            addRevealCard(opening, center: center, t: 10, color: color, format: format, reduceMotion: true, id: &id, to: &list)
            // A calm fade instead of motion.
            let fade = 1 - min(1, age / 0.3)
            if fade > 0 {
                list.add(.roundedRect(center: viewport / 2, size: viewport, cornerRadius: 0, rotation: 0), color: .background, opacity: fade, space: .screen, id: id)
                id += 1
            }
            return
        }

        if age < burstTime {
            addBuildUp(opening.chest, age: age, center: center, color: color, power: power, id: &id, to: &list)
            return
        }

        let t = age - burstTime
        // A wash of colour behind everything, breathing.
        let rayFade = min(1, t / 0.3)
        let breathe = 1 + 0.06 * sin(t * 3.2)
        MenuKit.glow(at: center, radius: (170 + 60 * power) * breathe * Ease.outCubic(min(1, t / 0.4)), color: color, opacity: 0.3 * rayFade, id: &id, to: &list)

        // Rays: a wide layer in fruit colours turning one way, a thin one in the rarity
        // colour turning the other. Rarer items get more of them.
        let rayCount = rarity >= .epic ? 14 : 10
        let rayLength = (200 + 90 * power) * Ease.outCubic(min(1, t / 0.5))
        for index in 0..<rayCount {
            let angle = Double(index) / Double(rayCount) * Angle.tau + t * 0.5
            let half = 0.08 * power
            let tip1 = center + Vec2(angle: angle - half) * rayLength
            let tip2 = center + Vec2(angle: angle + half) * rayLength
            list.add(.polygon([center, tip1, tip2]), color: juice[index % juice.count], opacity: 0.2 * rayFade, space: .screen, id: id)
            id += 1
        }
        for index in 0..<rayCount {
            let angle = (Double(index) + 0.5) / Double(rayCount) * Angle.tau - t * 0.3
            let tip1 = center + Vec2(angle: angle - 0.025) * rayLength * 1.1
            let tip2 = center + Vec2(angle: angle + 0.025) * rayLength * 1.1
            list.add(.polygon([center, tip1, tip2]), color: color, opacity: 0.22 * rayFade, space: .screen, id: id)
            id += 1
        }

        // Shockwaves: white first, then the rarity colour; Legendary a third, golden one.
        let waves: [(delay: Double, strength: Double, color: ColorToken)] = rarity == .legendary
            ? [(0, 1, .primary), (0.08, 0.85, color), (0.4, 1, .rarityLegendary)]
            : [(0, 1, .primary), (0.08, 0.8, color)]
        for wave in waves {
            let x = (t - wave.delay) / 0.6
            guard x >= 0, x < 1 else { continue }
            list.add(.arc(center: center, radius: 30 + 300 * Ease.outCubic(x) * wave.strength, thickness: 10 * (1 - x) + 1, startAngle: 0, endAngle: Angle.tau),
                     color: wave.color, opacity: 0.85 * (1 - x), space: .screen, id: id)
            id += 1
        }

        // The lid flies off, spinning.
        if t < 0.8 {
            let x = t / 0.8
            let lid = center + Vec2(80 * x, -40 - 300 * x + 420 * x * x)
            list.add(.roundedRect(center: lid, size: Vec2(58, 16), cornerRadius: 6, rotation: 6 * x), color: chestColor(opening.chest), opacity: 1 - x, space: .screen, id: id)
            id += 1
        }

        // Splashes: big fruit-coloured blobs that pop out with an overshoot and shrink away,
        // each glossy and with a little satellite drop.
        if t < 0.9 {
            let splashCount = Int(8 + 6 * power)
            let grow = spring(t / 0.3)
            let shrink = 1 - Ease.outCubic(max(0, (t - 0.3) / 0.6))
            for index in 0..<splashCount {
                let angle = Double(index) / Double(splashCount) * Angle.tau + (unit(index, 11) - 0.5) * 0.5
                let reach = (110 + 90 * unit(index, 12)) * Ease.outCubic(min(1, t / 0.35))
                let at = center + Vec2(angle: angle) * reach
                let radius = (12 + 12 * unit(index, 13)) * power.squareRoot() * grow * shrink
                guard radius > 0.5 else { continue }
                let tint = juice[index % juice.count]
                list.add(.circle(center: at, radius: radius), color: tint, opacity: 0.95, space: .screen, id: id)
                id += 1
                list.add(.circle(center: at + Vec2(-radius * 0.35, -radius * 0.35), radius: radius * 0.3), color: .primary, opacity: 0.45 * shrink, space: .screen, id: id)
                id += 1
                list.add(.circle(center: at + Vec2(angle: angle) * (radius + 10), radius: radius * 0.35), color: tint, opacity: 0.9, space: .screen, id: id)
                id += 1
            }
        }

        // Juice drops: round, with gravity.
        let dropLife = 1.4
        if t < dropLife {
            for index in 0..<Int(36 * power) {
                let angle = -Double.pi / 2 + (unit(index, 14) - 0.5) * 3.4
                let speed = 240 + 360 * unit(index, 15)
                var at = center + Vec2(cos(angle), sin(angle)) * speed * t
                at.y += 600 * t * t
                let radius = 2.5 + 4.5 * unit(index, 16)
                let fade = 1 - max(0, (t - dropLife * 0.55) / (dropLife * 0.45))
                list.add(.circle(center: at, radius: radius), color: juice[index % juice.count], opacity: fade, space: .screen, id: id)
                id += 1
            }
        }

        // Confetti: little cards with gravity, spinning and fluttering.
        let confettiLife = 1.8
        if t < confettiLife {
            for index in 0..<Int(Double(confettiCount) * power) {
                let angle = -Double.pi / 2 + (unit(index, 1) - 0.5) * 2.6
                let speed = 280 + 320 * unit(index, 2)
                var at = center + Vec2(cos(angle), sin(angle)) * speed * t
                at.y += 480 * t * t
                at.x += sin(t * 9 + Double(index)) * 6 * min(1, t)
                let spin = (unit(index, 3) - 0.5) * 14
                let size = Vec2(6 + 4 * unit(index, 4), 3 + 2 * unit(index, 5))
                let fade = 1 - max(0, (t - confettiLife * 0.6) / (confettiLife * 0.4))
                let tint = index.isMultiple(of: 4) ? color : juice[index % juice.count]
                list.add(.roundedRect(center: at, size: size, cornerRadius: 1, rotation: spin * t), color: tint, opacity: fade, space: .screen, id: id)
                id += 1
            }
        }

        // Legendary: gold rain from above.
        if rarity == .legendary {
            for index in 0..<30 {
                let start = unit(index, 7) * 1.4
                let fall = t - start
                guard fall > 0, fall < 1.4 else { continue }
                let x = unit(index, 8) * viewport.x
                let y = -10 + fall * (viewport.y * 0.8)
                list.add(.circle(center: Vec2(x + sin(fall * 5 + Double(index)) * 8, y), radius: 2.5), color: .rarityLegendary, opacity: 1 - fall / 1.4, space: .screen, id: id)
                id += 1
            }
        }

        addRevealCard(opening, center: center, t: t, color: color, format: format, reduceMotion: false, id: &id, to: &list)

        // The flash, over everything: white, then a breath of the rarity colour.
        if t < 0.3 {
            let white = max(0, 1 - t / 0.12)
            if white > 0 {
                list.add(.roundedRect(center: viewport / 2, size: viewport, cornerRadius: 0, rotation: 0), color: .primary, opacity: 0.85 * white, space: .screen, id: id)
                id += 1
            }
            list.add(.roundedRect(center: viewport / 2, size: viewport, cornerRadius: 0, rotation: 0), color: color, opacity: 0.25 * (1 - t / 0.3), space: .screen, id: id)
            id += 1
        }
    }

    /// Before the burst: the chest springs in, wobbles like a jelly and shakes ever harder,
    /// its glow swelling; right before the burst it ducks down, ready to pop.
    private static func addBuildUp(_ chest: ChestKind, age: Double, center: Vec2, color: ColorToken, power: Double, id: inout Int, to list: inout RenderList) {
        let x = age / burstTime
        let enter = spring(age / 0.35)
        let intensity = x * x
        let shake = Vec2(sin(age * 55) * 7, cos(age * 47) * 3) * intensity
        // Jelly: the height breathes, the width answers, so the volume stays about the same.
        var stretch = 1 + 0.1 * sin(age * 26) * (0.3 + intensity)
        // The duck: the last 0.15 s it squashes down, like a jump about to happen.
        let duck = max(0, (x - 0.83) / 0.17)
        stretch -= 0.22 * Ease.outCubic(duck)
        let squash = Vec2(1 / stretch.squareRoot(), stretch)
        // The glow already hints at the colour; fruit-coloured beads circle it, faster and closer.
        MenuKit.glow(at: center, radius: 70 + 110 * x, color: color, opacity: 0.2 + 0.4 * intensity, id: &id, to: &list)
        MenuKit.glow(at: center, radius: 30 + 50 * x, color: .primary, opacity: 0.15 * intensity, id: &id, to: &list)
        let beads = Int(6 + 6 * x)
        for index in 0..<beads {
            let angle = Double(index) / Double(beads) * Angle.tau + age * (2 + 3 * x)
            let at = center + Vec2(angle: angle) * (120 - 40 * x)
            list.add(.circle(center: at, radius: 3 + 2 * x), color: juice[index % juice.count], opacity: min(1, age / 0.3) * 0.9, space: .screen, id: id)
            id += 1
        }
        let scale = 1.6 * enter * (1 + 0.08 * intensity)
        let at = center + shake
        addChestIcon(chest, at: at, scale: scale, opacity: 1, squash: squash, lidLift: 3 * intensity * (1 + sin(age * 40)), id: &id, to: &list)
        // Sparks and juice leaking from the lid seam, more and more.
        for index in 0..<Int(6 + 16 * x) {
            let phase = (age * 2.2 + unit(index, 9)).truncatingRemainder(dividingBy: 1)
            let side = unit(index, 10) - 0.5
            let from = at + Vec2(side * 80, -18 * scale / 1.6)
            let to = from + Vec2(side * 40, -50) * phase
            if index.isMultiple(of: 2) {
                list.add(.line(from: to, to: to + Vec2(side * 4, -6), thickness: 1.5), color: color, opacity: (1 - phase) * intensity, space: .screen, id: id)
            } else {
                list.add(.circle(center: to, radius: 2.5), color: juice[index % juice.count], opacity: (1 - phase) * intensity, space: .screen, id: id)
            }
            id += 1
        }
    }

    /// The item on its card, `t` seconds after the burst. The card is tinted in the rarity
    /// colour with a breathing halo and pops in like a jelly (width and height spring a
    /// moment apart). The item bounces in after it and then floats; rarity, name and details
    /// follow one by one; stars twinkle around the card.
    private static func addRevealCard(_ opening: ChestOpening, center: Vec2, t: Double, color: ColorToken, format: TextFormat, reduceMotion: Bool, id: inout Int, to list: inout RenderList) {
        let base = Vec2(256, 300)
        let sx = reduceMotion ? 1 : 0.35 + 0.65 * spring(t / 0.42)
        let sy = reduceMotion ? 1 : 0.35 + 0.65 * spring((t - 0.05) / 0.42)
        let size = Vec2(base.x * sx, base.y * sy)
        let fade = reduceMotion ? 1 : min(1, t / 0.1)
        // Halo: three soft layers, breathing.
        let breathe = reduceMotion ? 0 : sin(t * 3) * 4
        for (grow, opacity) in [(46.0, 0.06), (28.0, 0.1), (14.0, 0.16)] {
            list.add(.roundedRect(center: center, size: size + Vec2(grow + breathe, grow + breathe), cornerRadius: 26 + grow / 2, rotation: 0), color: color, opacity: opacity * fade, space: .screen, id: id)
            id += 1
        }
        list.add(.roundedRect(center: center, size: size + Vec2(5, 5), cornerRadius: 26, rotation: 0), color: color, opacity: fade, space: .screen, id: id)
        id += 1
        list.add(.roundedRect(center: center, size: size, cornerRadius: 24, rotation: 0), color: .surface, opacity: fade, space: .screen, id: id)
        id += 1
        // The rarity tint over the card.
        list.add(.roundedRect(center: center, size: size, cornerRadius: 24, rotation: 0), color: color, opacity: 0.14 * fade, space: .screen, id: id)
        id += 1
        guard sx > 0.6 || reduceMotion else { return }

        /// 0 → 1 over 0.25 s from `delay`, ease-out: fade and a short slide up.
        func appear(_ delay: Double) -> Double { reduceMotion ? 1 : Ease.outCubic((t - delay) / 0.25) }
        func place(_ offset: Vec2) -> Vec2 { center + Vec2(offset.x * sx, offset.y * sy) }

        // The rarity punches in from big, with a small wobble.
        let slam = reduceMotion ? 1 : (t < 0.15 ? 0 : spring((t - 0.15) / 0.35))
        let slamScale = 1 + 0.9 * (1 - slam)
        text(Strings.Shop.rarity(opening.item.rarity).uppercased(), place(Vec2(0, -122)), size: 16 * slamScale, weight: .bold, color: color, alignment: .center, opacity: min(1, slam * 2), id: &id, to: &list)

        // The item bounces in a moment after the card, then floats.
        let itemPop = reduceMotion ? 1 : spring((t - 0.08) / 0.45)
        let float = reduceMotion ? 0 : sin(t * 2.4) * 4 * min(1, max(0, t - 0.5) / 0.3)
        if itemPop > 0.01 {
            // A soft disc of light under the item.
            list.add(.circle(center: place(Vec2(0, -34)), radius: 56 * itemPop), color: color, opacity: 0.18, space: .screen, id: id)
            id += 1
            addPreview(opening.item, at: place(Vec2(0, -34)) + Vec2(0, float), scale: 1.9 * itemPop, opacity: 1, id: &id, to: &list)
        }

        let name = appear(0.18)
        text(Strings.Shop.item(opening.item.id), place(Vec2(0, 52)) + Vec2(0, 10 * (1 - name)), size: 22, weight: .bold, color: .primary, alignment: .center, opacity: name, id: &id, to: &list)
        let kind = appear(0.24)
        text(Strings.Shop.kind(opening.item), place(Vec2(0, 78)) + Vec2(0, 10 * (1 - kind)), size: 13, color: .muted, alignment: .center, opacity: kind, id: &id, to: &list)
        if opening.isDuplicate {
            let money = appear(0.3)
            text(Strings.Shop.duplicate(format.number(opening.money)), place(Vec2(0, 102)) + Vec2(0, 10 * (1 - money)), size: 13, weight: .bold, color: .accent, alignment: .center, opacity: money, id: &id, to: &list)
        }
        text(Strings.Shop.tapToClose, place(Vec2(0, 132)), size: 11, color: .muted, alignment: .center, opacity: 0.8 * appear(0.6), id: &id, to: &list)

        // Stars twinkling around the card, each on its own beat.
        guard !reduceMotion, t > 0.3 else { return }
        let stars = opening.item.rarity >= .epic ? 10 : 6
        for index in 0..<stars {
            let phase = t * (1.3 + unit(index, 17)) + unit(index, 18) * 6
            let twinkle = max(0, sin(phase))
            guard twinkle > 0.05 else { continue }
            let side = index.isMultiple(of: 2) ? -1.0 : 1.0
            let at = center + Vec2(side * (base.x / 2 + 16 + 30 * unit(index, 19)), (unit(index, 20) - 0.5) * base.y * 1.1)
            addStar(at: at, radius: (6 + 6 * unit(index, 21)) * twinkle, color: juice[index % juice.count], opacity: min(1, (t - 0.3) / 0.3), id: &id, to: &list)
        }
    }

    /// A four-pointed sparkle.
    static func addStar(at center: Vec2, radius: Double, color: ColorToken, opacity: Double, id: inout Int, to list: inout RenderList) {
        let inner = radius * 0.28
        let points = (0..<8).map { k -> Vec2 in
            let angle = Double(k) / 8 * Angle.tau - Double.pi / 2
            return center + Vec2(angle: angle) * (k.isMultiple(of: 2) ? radius : inner)
        }
        list.add(.polygon(points), color: color, opacity: opacity, space: .screen, id: id)
        id += 1
    }

    static func chestColor(_ kind: ChestKind) -> ColorToken {
        switch kind {
        case .standard: .rarityCommon
        case .premium: .rarityLegendary
        case .event: .accent
        case .criminalHunt: .vehicleCriminal
        }
    }

    /// A springy 0 → 1 with a clear overshoot (about 25 %), settled at x = 1.
    static func spring(_ x: Double) -> Double { Ease.spring(x) }

    /// 0…1, the same on every device.
    static func unit(_ index: Int, _ salt: UInt64) -> Double {
        WeatherLayer.unitHash(index, salt &+ 101)
    }
}
