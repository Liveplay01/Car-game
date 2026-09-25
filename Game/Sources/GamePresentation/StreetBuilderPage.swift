import Foundation
import GameCore

/// The Street Builder tab: the roundabout from above, the parts you can buy, and what they
/// do. A part is dragged from the palette onto a free slot, a double tap builds it, a single
/// tap takes it away again (FOUNDATION.md 3).
///
/// The motion keeps to the rules in FOUNDATION.md 3: the free slots answer the moment a drag
/// starts, the part snaps while it is dragged, and only the build itself celebrates.
public enum StreetBuilderPage {
    /// Parts to build: a new arm, or a module on one of the ring's module slots (M9).
    public enum Part: String, Sendable, Equatable, CaseIterable {
        case arm
        case tollBooth
        case speedCamera
        case towDepot

        /// The module this part puts on the ring; nil for an arm.
        public var module: RoadModule? { RoadModule(rawValue: rawValue) }
    }

    static let gap = 12.0
    static let cardCorner = 14.0
    static let paletteHeight = 112.0
    static let detailHeight = 116.0
    /// A slot answers a starting drag at once.
    static let slotFade = 0.15
    /// A part snaps to the slot under the finger.
    static let snapDuration = 0.12
    /// Building: the arm grows out of the ring, the ring pulses, the balance counts down.
    static let buildDuration = 0.5
    static let countDuration = 0.4
    /// A tap takes a placed part away again; a second tap within this long builds it instead.
    static let removeDuration = 0.3

    /// What the page is doing right now; the session keeps it and ages it every frame.
    public struct State: Sendable, Equatable {
        /// The part whose details are open.
        public var selected: Part?
        /// Real time since the page was opened.
        public var age = 0.0
        /// A part being dragged, and where the finger is.
        public var dragging: (part: Part, at: Vec2)?
        /// Where a dragged part would land: a free slot, or nil if there is none under it.
        public var target: Int?
        /// A part put down but not paid for yet.
        public var pending: (part: Part, slot: Int)?
        /// The pending part is on its way out after a tap; a second tap builds it instead.
        public var removing = 0.0
        /// A built arm: its slot and how long ago.
        public var built: (slot: Int, age: Double)?
        /// A module just put on the ring: its module slot and how long ago (M9).
        public var builtModule: (slot: Int, age: Double)?
        /// Money before the build, counted down from.
        public var moneyBefore: Int?
        /// A build that could not be paid for.
        public var denied = 0.0
        /// A built part tapped once (Leo, 25.09.2026): it shows red with a cross, a second tap
        /// tears it down. It lets go by itself after `markDuration`.
        public var marked: (part: Built, age: Double)?
        /// A part just torn down, while it goes: the arm shrinks into the ring, a module
        /// shrinks away.
        public var tornDown: (part: Built, module: RoadModule?, age: Double)?

        public init() {}

        public static func == (a: State, b: State) -> Bool {
            a.selected == b.selected && a.age == b.age && a.dragging?.part == b.dragging?.part
                && a.target == b.target && a.pending?.slot == b.pending?.slot && a.built?.slot == b.built?.slot
        }

        public mutating func age(by delta: Double) {
            age += delta
            if removing > 0 { removing += delta }
            if denied > 0 {
                denied += delta
                if denied > StreetBuilderPage.removeDuration * 2 { denied = 0 }
            }
            if var built {
                built.age += delta
                self.built = built.age < StreetBuilderPage.buildDuration ? built : nil
                if self.built == nil { moneyBefore = nil }
            }
            if var builtModule {
                builtModule.age += delta
                self.builtModule = builtModule.age < StreetBuilderPage.buildDuration ? builtModule : nil
                if self.builtModule == nil, built == nil { moneyBefore = nil }
            }
            if var marked {
                marked.age += delta
                self.marked = marked.age < StreetBuilderPage.markDuration ? marked : nil
            }
            if var tornDown {
                tornDown.age += delta
                self.tornDown = tornDown.age < StreetBuilderPage.tearDuration ? tornDown : nil
            }
        }
    }

    /// Something already built on the ring: an arm by its slot, a module by its module slot.
    public enum Built: Sendable, Equatable {
        case arm(slot: Int)
        case module(slot: Int)
    }

    /// How long a tapped part stays marked for tearing down.
    static let markDuration = 3.0
    /// How long tearing down takes to watch.
    static let tearDuration = 0.45

    /// The built part under a point: a module on the ring first (they sit on it), then an
    /// arm. The player's own arm is never offered.
    public static func builtPart(at point: Vec2, career: Career, config: Config, map: (center: Vec2, radius: Double)) -> Built? {
        if let slot = moduleSlot(at: point, count: config.moduleSlotCount, map: map), career.modules[slot] != nil {
            return .module(slot: slot)
        }
        if let slot = slot(at: point, slots: config.armSlotCount, map: map), slot != 0, career.armSlots.contains(slot) {
            return .arm(slot: slot)
        }
        return nil
    }

    // MARK: - Layout

    /// The map: where the ring is drawn and how big it is on screen.
    public static func map(viewport: Vec2, bottomInset: Double) -> (center: Vec2, radius: Double) {
        let top = Metrics.sceneInsets.top + 14
        let bottom = viewport.y - bottomInset - detailHeight - paletteHeight - 2 * gap
        let height = max(160, bottom - top)
        let center = Vec2(viewport.x / 2, top + height / 2)
        return (center, min(height / 2 - 34, viewport.x / 2 - 62))
    }

    /// Where a slot sits on the map. Screen angles turn the other way than world ones, so
    /// the player's arm points down here too.
    public static func slotPosition(_ slot: Int, slots: Int, map: (center: Vec2, radius: Double)) -> Vec2 {
        map.center + direction(ofSlot: slot, slots: slots) * (map.radius + 22)
    }

    /// The direction of a slot on the screen.
    static func direction(ofSlot slot: Int, slots: Int) -> Vec2 {
        Vec2(angle: -Arm.angle(ofSlot: slot, slots: slots))
    }

    /// The slot nearest to a point, if the point is close enough to it.
    public static func slot(at point: Vec2, slots: Int, map: (center: Vec2, radius: Double)) -> Int? {
        let candidates = (0..<slots).map { ($0, slotPosition($0, slots: slots, map: map)) }
        guard let nearest = candidates.min(by: { $0.1.distance(to: point) < $1.1.distance(to: point) }) else { return nil }
        return nearest.1.distance(to: point) <= 46 ? nearest.0 : nil
    }

    /// Where each palette card sits: two columns, two rows.
    public static func cards(viewport: Vec2, bottomInset: Double) -> [(part: Part, rect: Rect)] {
        let width = min(viewport.x - 2 * gap, 460)
        let left = (viewport.x - width) / 2
        let top = viewport.y - bottomInset - detailHeight - paletteHeight - gap
        let columns = 2
        let rows = (Part.allCases.count + columns - 1) / columns
        let cardWidth = (width - gap) / Double(columns)
        let cardHeight = (paletteHeight - gap * Double(rows - 1)) / Double(rows)
        return Part.allCases.enumerated().map { index, part in
            let x = left + Double(index % columns) * (cardWidth + gap)
            let y = top + Double(index / columns) * (cardHeight + gap)
            return (part, Rect(minX: x, minY: y, maxX: x + cardWidth, maxY: y + cardHeight))
        }
    }

    /// Where a module slot sits on the map: on the ring itself, like in the game.
    public static func moduleSlotPosition(_ slot: Int, count: Int, map: (center: Vec2, radius: Double)) -> Vec2 {
        let angle = Angle.tau * (Double(slot) + 0.5) / Double(max(1, count))
        return map.center + Vec2(angle: -angle) * map.radius
    }

    /// The module slot nearest to a point, if the point is close enough to it.
    public static func moduleSlot(at point: Vec2, count: Int, map: (center: Vec2, radius: Double)) -> Int? {
        let nearest = (0..<max(0, count)).min { moduleSlotPosition($0, count: count, map: map).distance(to: point) < moduleSlotPosition($1, count: count, map: map).distance(to: point) }
        guard let nearest else { return nil }
        return moduleSlotPosition(nearest, count: count, map: map).distance(to: point) <= 30 ? nearest : nil
    }

    /// The slot a part can be put down on under a point: a free arm slot for an arm, any
    /// module slot for a module (a taken one is swapped).
    public static func target(for part: Part, at point: Vec2, career: Career, config: Config, map: (center: Vec2, radius: Double)) -> Int? {
        if part.module != nil {
            return moduleSlot(at: point, count: config.moduleSlotCount, map: map)
        }
        return slot(at: point, slots: config.armSlotCount, map: map).flatMap { canPlace(part, inSlot: $0, career: career, config: config) ? $0 : nil }
    }

    public static func canPlace(_ part: Part, inSlot slot: Int, career: Career, config: Config) -> Bool {
        if part.module != nil { return slot >= 0 && slot < config.moduleSlotCount }
        return !career.armSlots.contains(slot) && config.canBuildArm(inSlot: slot, built: career.armSlots)
    }

    /// What the part costs; nil for an arm once the ring is full.
    public static func price(of part: Part, career: Career, config: Config) -> Int? {
        if let module = part.module { return config.price(of: module) }
        return career.armPrice(config: config)
    }

    /// The palette card under a point.
    public static func card(at point: Vec2, viewport: Vec2, bottomInset: Double) -> Part? {
        cards(viewport: viewport, bottomInset: bottomInset).first { $0.rect.contains(point) }?.part
    }

    // MARK: - Drawing

    static func add(
        career: Career,
        config: Config,
        state: State,
        format: TextFormat,
        reduceMotion: Bool,
        showsKeys: Bool,
        bottomInset: Double,
        to list: inout RenderList
    ) {
        let viewport = list.camera.viewport
        var id = RenderID.menu
        // The page covers the roundabout behind it: one map at a time is enough.
        list.add(.roundedRect(center: viewport / 2, size: viewport, cornerRadius: 0, rotation: 0), color: .background, space: .screen, id: id)
        id += 1

        let shown = countedMoney(career: career, state: state)
        MenuKit.header(Strings.Builder.title, money: Strings.Upgrades.balance(format.number(shown)), viewport: viewport, id: &id, to: &list)

        addMap(career: career, config: config, state: state, reduceMotion: reduceMotion, bottomInset: bottomInset, id: &id, to: &list)
        for (index, card) in cards(viewport: viewport, bottomInset: bottomInset).enumerated() {
            addCard(card.part, index: index, rect: card.rect, career: career, config: config, state: state, format: format, reduceMotion: reduceMotion, id: &id, to: &list)
        }
        addDetail(career: career, config: config, state: state, format: format, showsKeys: showsKeys, bottomInset: bottomInset, id: &id, to: &list)
        addDragged(state: state, reduceMotion: reduceMotion, id: &id, to: &list)
    }

    static func countedMoney(career: Career, state: State) -> Int {
        guard let before = state.moneyBefore, let age = state.built?.age ?? state.builtModule?.age else { return career.money }
        let x = Ease.outCubic(age / countDuration)
        return before + Int((Double(career.money - before) * x).rounded())
    }

    /// The roundabout as it is built, the free slots, and what is about to be built.
    private static func addMap(
        career: Career,
        config: Config,
        state: State,
        reduceMotion: Bool,
        bottomInset: Double,
        id: inout Int,
        to list: inout RenderList
    ) {
        let map = map(viewport: list.camera.viewport, bottomInset: bottomInset)
        let slots = config.armSlotCount
        let built = career.armSlots

        // The ring, drawn like the junction itself: kerb, asphalt, island. It pulses once
        // when an arm is added.
        var ringWidth = 12.0
        if let build = state.built, !reduceMotion {
            ringWidth += 6 * (1 - Ease.outCubic(build.age / buildDuration))
        }
        list.add(.arc(center: map.center, radius: map.radius, thickness: ringWidth + 5, startAngle: 0, endAngle: Angle.tau), color: .kerb, space: .screen, id: id)
        id += 1
        list.add(.arc(center: map.center, radius: map.radius, thickness: ringWidth, startAngle: 0, endAngle: Angle.tau), color: .surface, space: .screen, id: id)
        id += 1
        list.add(.circle(center: map.center, radius: map.radius - ringWidth / 2), color: .island, space: .screen, id: id)
        id += 1
        list.add(.arc(center: map.center, radius: map.radius - ringWidth / 2 - 12, thickness: 1.5, startAngle: 0, endAngle: Angle.tau), color: .marking, opacity: 0.25, space: .screen, id: id)
        id += 1

        // Free slots answer a drag: a socket with the stub of a road in it, brightest under
        // the finger. Slots too close to an arm show as taken. Only while an arm is dragged.
        let dragging = state.dragging.map { $0.part == .arm } ?? false
        let slotOpacity = dragging ? 1 : 0.45
        for slot in 0..<slots where !built.contains(slot) {
            let free = config.canBuildArm(inSlot: slot, built: built)
            guard free || dragging else { continue }
            let isTarget = state.target == slot
            if free {
                addArm(slot: slot, slots: slots, map: map, road: .surface, mark: nil,
                       opacity: slotOpacity * (isTarget ? 1 : 0.55), grow: isTarget ? 1 : 0.55, id: &id, to: &list)
            }
            let at = slotPosition(slot, slots: slots, map: map)
            let radius = isTarget && !reduceMotion ? 11.0 : 7.0
            list.add(
                .arc(center: at, radius: radius, thickness: 2, startAngle: 0, endAngle: Angle.tau),
                color: free ? (isTarget ? .accent : .marking) : .destructive,
                opacity: free ? slotOpacity : slotOpacity * 0.5,
                space: .screen, id: id
            )
            id += 1
        }

        // The arms that are there. The player's carries the accent stop line: that is the one
        // cars are sent from.
        for slot in built where state.built?.slot != slot {
            addArm(slot: slot, slots: slots, map: map, road: .surface, mark: slot == 0 ? .accent : .marking, opacity: 1, grow: 1, id: &id, to: &list)
        }
        // The one being built grows out of the ring and settles from accent into asphalt.
        if let build = state.built {
            let grow = reduceMotion ? 1 : Ease.outCubic(build.age / buildDuration)
            addArm(slot: build.slot, slots: slots, map: map, road: .surface, mark: .marking, opacity: 1, grow: grow, id: &id, to: &list)
            let settle = reduceMotion ? 0 : 1 - Ease.outCubic(build.age / buildDuration)
            if settle > 0 {
                addArm(slot: build.slot, slots: slots, map: map, road: .accent, mark: nil, opacity: settle, grow: grow, id: &id, to: &list)
            }
        }
        // Marked for tearing down: the arm glows red and a cross springs out at its end.
        if let marked = state.marked, case let .arm(slot) = marked.part, built.contains(slot) {
            let pulse = reduceMotion ? 0.5 : 0.4 + 0.25 * sin(marked.age * 9)
            addArm(slot: slot, slots: slots, map: map, road: .destructive, mark: nil, opacity: pulse * Ease.outCubic(marked.age / 0.15), grow: 1, id: &id, to: &list)
            addCross(at: slotPosition(slot, slots: slots, map: map) + direction(ofSlot: slot, slots: slots) * 14, age: marked.age, reduceMotion: reduceMotion, id: &id, to: &list)
        }
        // Torn down: it shrinks back into the ring, red, and fades.
        if let torn = state.tornDown, case let .arm(slot) = torn.part {
            let x = Ease.clamp01(torn.age / tearDuration)
            let shrink = reduceMotion ? 1 : 1 - Ease.inCubic(x)
            addArm(slot: slot, slots: slots, map: map, road: .destructive, mark: nil, opacity: 1 - Ease.outCubic(x), grow: shrink, id: &id, to: &list)
        }
        addModules(career: career, config: config, state: state, map: map, reduceMotion: reduceMotion, id: &id, to: &list)

        // The one put down but not paid for yet; it fades while it is being taken away.
        if let pending = state.pending, pending.part == .arm {
            var opacity = 0.6
            var grow = 1.0
            if state.removing > 0 {
                let x = Ease.clamp01(state.removing / removeDuration)
                opacity *= 1 - x
                grow = reduceMotion ? 1 : 1 - 0.3 * x
            }
            if state.denied > 0, !reduceMotion {
                opacity = 0.6 + 0.25 * sin(state.denied * 40)
            }
            addArm(slot: pending.slot, slots: slots, map: map, road: state.denied > 0 ? .destructive : .accent, mark: nil, opacity: opacity, grow: grow, id: &id, to: &list)
        }
    }

    /// The module slots on the ring (M9): what is built on them, and while a module is
    /// dragged, where it can go. A taken slot shows that the old module would be swapped.
    private static func addModules(career: Career, config: Config, state: State, map: (center: Vec2, radius: Double), reduceMotion: Bool, id: inout Int, to list: inout RenderList) {
        let count = config.moduleSlotCount
        let draggingModule = state.dragging?.part.module != nil
        for slot in 0..<count {
            let at = moduleSlotPosition(slot, count: count, map: map)
            if let module = career.modules[slot] {
                var scale = 1.0
                if let build = state.builtModule, build.slot == slot, !reduceMotion {
                    scale += 0.4 * (1 - Ease.outCubic(build.age / buildDuration))
                }
                addModuleIcon(module, at: at, scale: scale, opacity: 1, id: &id, to: &list)
            }
            if draggingModule {
                let isTarget = state.target == slot
                let taken = career.modules[slot] != nil
                list.add(.arc(center: at, radius: isTarget && !reduceMotion ? 13 : 10, thickness: 2, startAngle: 0, endAngle: Angle.tau),
                         color: isTarget ? .accent : (taken ? .hazard : .marking), opacity: isTarget ? 1 : 0.7, space: .screen, id: id)
                id += 1
            }
        }
        if let marked = state.marked, case let .module(slot) = marked.part, career.modules[slot] != nil {
            let at = moduleSlotPosition(slot, count: count, map: map)
            let pulse = reduceMotion ? 0.8 : 0.6 + 0.3 * sin(marked.age * 9)
            list.add(.arc(center: at, radius: 12, thickness: 2.5, startAngle: 0, endAngle: Angle.tau), color: .destructive, opacity: pulse, space: .screen, id: id)
            id += 1
            addCross(at: at + (at - map.center).normalized * 20, age: marked.age, reduceMotion: reduceMotion, id: &id, to: &list)
        }
        if let torn = state.tornDown, case let .module(slot) = torn.part, let module = torn.module {
            let x = Ease.clamp01(torn.age / tearDuration)
            let scale = reduceMotion ? 1 : 1 - Ease.inCubic(x)
            addModuleIcon(module, at: moduleSlotPosition(slot, count: count, map: map), scale: max(0.01, scale), opacity: 1 - Ease.outCubic(x), id: &id, to: &list)
        }
        if let pending = state.pending, let module = pending.part.module {
            var opacity = 0.7
            if state.removing > 0 { opacity *= 1 - Ease.clamp01(state.removing / removeDuration) }
            if state.denied > 0, !reduceMotion { opacity = 0.6 + 0.25 * sin(state.denied * 40) }
            let at = moduleSlotPosition(pending.slot, count: count, map: map)
            list.add(.arc(center: at, radius: 13, thickness: 2.5, startAngle: 0, endAngle: Angle.tau), color: state.denied > 0 ? .destructive : .accent, opacity: opacity, space: .screen, id: id)
            id += 1
            addModuleIcon(module, at: at, scale: 1, opacity: opacity, id: &id, to: &list)
        }
    }

    /// The red "tear down" badge: a disc with a cross that springs out like the chest.
    private static func addCross(at center: Vec2, age: Double, reduceMotion: Bool, id: inout Int, to list: inout RenderList) {
        let scale = reduceMotion ? 1 : Ease.spring(age / 0.35)
        guard scale > 0.01 else { return }
        let radius = 9 * scale
        list.add(.circle(center: center, radius: radius), color: .destructive, space: .screen, id: id)
        id += 1
        let arm = radius * 0.45
        for turn in [Vec2(arm, arm), Vec2(arm, -arm)] {
            list.add(.line(from: center - turn, to: center + turn, thickness: 2 * scale), color: .primary, space: .screen, id: id)
            id += 1
        }
    }

    /// A module as a small symbol: the toll barrier, the camera, the tow truck.
    static func addModuleIcon(_ module: RoadModule, at center: Vec2, scale: Double, opacity: Double, id: inout Int, to list: inout RenderList) {
        list.add(.circle(center: center, radius: 8 * scale), color: .background, opacity: opacity, space: .screen, id: id)
        id += 1
        switch module {
        case .tollBooth:
            list.add(.line(from: center - Vec2(6, 0) * scale, to: center + Vec2(6, 0) * scale, thickness: 2.5 * scale), color: .hazard, opacity: opacity, space: .screen, id: id)
            id += 1
            list.add(.roundedRect(center: center - Vec2(6, 0) * scale, size: Vec2(4, 4) * scale, cornerRadius: 1, rotation: 0), color: .hazard, opacity: opacity, space: .screen, id: id)
        case .speedCamera:
            list.add(.roundedRect(center: center, size: Vec2(10, 7) * scale, cornerRadius: 2, rotation: 0), color: .marking, opacity: opacity, space: .screen, id: id)
            id += 1
            list.add(.circle(center: center, radius: 2.2 * scale), color: .lightBlue, opacity: opacity, space: .screen, id: id)
        case .towDepot:
            list.add(.roundedRect(center: center + Vec2(-1.5, 0) * scale, size: Vec2(10, 6) * scale, cornerRadius: 1.5, rotation: 0), color: .hazard, opacity: opacity, space: .screen, id: id)
            id += 1
            list.add(.line(from: center + Vec2(3, -1) * scale, to: center + Vec2(7, -5) * scale, thickness: 1.5 * scale), color: .marking, opacity: opacity, space: .screen, id: id)
        }
        id += 1
    }

    /// One arm on the map: kerb, road and the stop line where it meets the ring.
    private static func addArm(slot: Int, slots: Int, map: (center: Vec2, radius: Double), road: ColorToken, mark: ColorToken?, opacity: Double, grow: Double, id: inout Int, to list: inout RenderList) {
        let direction = direction(ofSlot: slot, slots: slots)
        let from = map.center + direction * (map.radius - 5)
        let length = 50.0 * max(0, min(grow, 1))
        guard length > 1 else { return }
        let to = from + direction * length
        list.add(.line(from: from, to: to, thickness: 17), color: .kerb, opacity: opacity, space: .screen, id: id)
        id += 1
        list.add(.line(from: from, to: to, thickness: 12), color: road, opacity: opacity, space: .screen, id: id)
        id += 1
        guard grow > 0.6, let mark else { return }
        let across = direction.right * 5
        list.add(.line(from: to - across, to: to + across, thickness: 2.5), color: mark, opacity: opacity, space: .screen, id: id)
        id += 1
    }

    /// A palette card: picture, name and price.
    private static func addCard(
        _ part: Part,
        index: Int,
        rect: Rect,
        career: Career,
        config: Config,
        state: State,
        format: TextFormat,
        reduceMotion: Bool,
        id: inout Int,
        to list: inout RenderList
    ) {
        let price = price(of: part, career: career, config: config)
        let isSelected = state.selected == part
        let enter = Ease.outCubic((state.age - Double(index) * 0.05) / 0.25)
        guard enter > 0 else { return }
        var center = rect.center
        var size = Vec2(rect.width, rect.height)
        if !reduceMotion {
            // It glides up into its place (`MenuKit.cardEnter`).
            let motion = MenuKit.cardEnter(Ease.settle((state.age - Double(index) * 0.05) / 0.45))
            center.y += motion.rise
            size = size * motion.scale
        }

        list.add(.roundedRect(center: center, size: size, cornerRadius: cardCorner, rotation: 0), color: .surface, opacity: enter, space: .screen, id: id)
        id += 1
        if isSelected {
            list.add(.roundedRect(center: center, size: size + Vec2(4, 4), cornerRadius: cardCorner + 2, rotation: 0), color: .accent, opacity: 0.55 * enter, space: .screen, id: id)
            id += 1
            list.add(.roundedRect(center: center, size: size, cornerRadius: cardCorner, rotation: 0), color: .surface, opacity: enter, space: .screen, id: id)
            id += 1
        }
        // A row, read left to right: the part, what it is called, what it costs, what to do
        // with it. The picture sits in the left margin like an icon in a list.
        // On a narrow card (two across a phone) the hint gives way; the panel below says it.
        let isWide = size.x >= 300
        addPartPicture(part, at: Vec2(center.x - size.x / 2 + (isWide ? 36 : 28), center.y), scale: 0.85, opacity: enter, id: &id, to: &list)
        let textLeft = center.x - size.x / 2 + (isWide ? 74 : 56)
        let right = center.x + size.x / 2 - 18
        list.add(.text(Strings.Builder.name(part), position: Vec2(textLeft, center.y - 12), size: 16, alignment: .leading, weight: .bold), color: .primary, opacity: enter, space: .screen, id: id)
        id += 1
        let affordable = price.map { career.money >= $0 } ?? false
        let priceColor: ColorToken = affordable ? .accent : .muted
        if let price {
            Icons.moneyTag(format.number(price), at: Vec2(textLeft, center.y + 12), size: 15, alignment: .leading, color: priceColor, noteColor: priceColor, opacity: enter, id: &id, to: &list)
        } else {
            list.add(.text(Strings.Builder.ringFull, position: Vec2(textLeft, center.y + 12), size: 15, alignment: .leading, weight: .bold), color: .muted, opacity: enter, space: .screen, id: id)
            id += 1
        }
        if isWide {
            list.add(.text(Strings.Builder.drag, position: Vec2(right, center.y), size: 12, alignment: .trailing, weight: .regular), color: .muted, opacity: 0.75 * enter, space: .screen, id: id)
            id += 1
        }
    }

    /// The picture of a part: a bit of ring with an arm going off it.
    static func addPartPicture(_ part: Part, at center: Vec2, scale: Double, opacity: Double, id: inout Int, to list: inout RenderList) {
        list.add(.arc(center: center, radius: 16 * scale, thickness: 5 * scale, startAngle: 0, endAngle: Angle.tau), color: .surface, opacity: opacity, space: .screen, id: id)
        id += 1
        if let module = part.module {
            // A module: its symbol sitting on the bit of ring.
            addModuleIcon(module, at: center + Vec2(16, 0) * scale, scale: scale * 1.1, opacity: opacity, id: &id, to: &list)
            return
        }
        list.add(.arc(center: center, radius: 16 * scale, thickness: 5 * scale, startAngle: -0.9, endAngle: 0.9), color: .marking, opacity: opacity, space: .screen, id: id)
        id += 1
        list.add(.line(from: center + Vec2(14, 0) * scale, to: center + Vec2(30, 0) * scale, thickness: 9 * scale), color: .accent, opacity: opacity, space: .screen, id: id)
        id += 1
    }

    /// The part hanging on the finger while it is dragged.
    private static func addDragged(state: State, reduceMotion: Bool, id: inout Int, to list: inout RenderList) {
        guard let dragging = state.dragging else { return }
        addPartPicture(dragging.part, at: dragging.at, scale: 1.1, opacity: 0.85, id: &id, to: &list)
    }

    /// The panel at the bottom: what the part does, and what to do with it.
    private static func addDetail(
        career: Career,
        config: Config,
        state: State,
        format: TextFormat,
        showsKeys: Bool,
        bottomInset: Double,
        id: inout Int,
        to list: inout RenderList
    ) {
        let viewport = list.camera.viewport
        let width = min(viewport.x - 2 * gap, 460)
        let top = viewport.y - bottomInset - detailHeight
        let center = Vec2(viewport.x / 2, top + detailHeight / 2 - 6)
        let enter = Ease.outCubic((state.age - 0.1) / 0.25)
        list.add(.roundedRect(center: center, size: Vec2(width, detailHeight - 12), cornerRadius: cardCorner, rotation: 0), color: .surface, opacity: enter, space: .screen, id: id)
        id += 1

        let left = center.x - width / 2 + 16
        var y = center.y - detailHeight / 2 + 26
        func text(_ string: String, _ position: Vec2, size: Double, weight: FontWeight = .regular, color: ColorToken, alignment: TextAlignment = .leading) {
            list.add(.text(string, position: position, size: size, alignment: alignment, weight: weight), color: color, opacity: enter, space: .screen, id: id)
            id += 1
        }
        guard let part = state.selected ?? state.pending?.part ?? state.dragging?.part else {
            text(Strings.Builder.pickOne, Vec2(center.x, center.y), size: 15, color: .muted, alignment: .center)
            if showsKeys {
                text(Strings.Builder.keys, Vec2(center.x, center.y + 22), size: 12, color: .muted, alignment: .center)
            }
            return
        }
        text(Strings.Builder.name(part), Vec2(left, y), size: 17, weight: .bold, color: .primary)
        if let price = price(of: part, career: career, config: config) {
            let priceColor: ColorToken = career.money >= price ? .accent : .muted
            Icons.moneyTag(format.number(price), at: Vec2(center.x + width / 2 - 16, y), size: 17, alignment: .trailing, color: priceColor, noteColor: priceColor, opacity: enter, id: &id, to: &list)
        }
        y += 22
        for line in UpgradePage.wrap(Strings.Builder.explanation(part, config: config), width: width - 32, size: 13) {
            text(line, Vec2(left, y), size: 13, color: .muted)
            y += 17
        }
        y += 3
        if state.pending != nil {
            text(Strings.Builder.buildHint, Vec2(left, y), size: 12, weight: .bold, color: .accent)
        } else {
            text(Strings.Builder.dragHint, Vec2(left, y), size: 12, color: .muted)
        }
    }
}
