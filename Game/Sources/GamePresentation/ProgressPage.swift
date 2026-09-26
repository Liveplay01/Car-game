import Foundation
import GameCore

/// The Progress tab (Leo, 26.09.2026): the player's records, today's quests (the Daily Shift
/// and the three challenges) and the achievements (the mastery goals and their tiers). A
/// segmented control switches between the three, the way the Shop switches its sections.
public enum ProgressPage {
    public enum Section: Int, Sendable, Equatable, CaseIterable {
        case records
        case quests
        case achievements
    }

    public enum Target: Sendable, Equatable {
        case section(Section)
    }

    public struct State: Sendable, Equatable {
        public var section = Section.records
        /// Real time since the section came up, for the rows coming in.
        public var age = 0.0
        /// The section just left and how long ago: the new one swipes in from its side.
        public var sectionSlide: (from: Section, age: Double)?

        public init() {}

        public static func == (a: State, b: State) -> Bool {
            a.section == b.section && a.age == b.age
        }

        /// Switches the section with a swipe; the same section again does nothing.
        public mutating func select(_ next: Section) {
            guard next != section else { return }
            sectionSlide = (section, 0)
            section = next
            age = 0
        }

        public mutating func age(by delta: Double) {
            age += delta
            if var slide = sectionSlide {
                slide.age += delta
                sectionSlide = slide.age < ShopPage.slideDuration ? slide : nil
            }
        }
    }

    static let gap = 12.0

    // MARK: - Content

    /// The records as label and value, in the order they are shown.
    public static func records(save: SaveGame, format: TextFormat) -> [(label: String, value: String)] {
        let career = save.career
        let stats = career.mastery
        func count(_ value: Int) -> String { value > 0 ? format.number(value) : Strings.Progress.none }
        return [
            (Strings.Progress.highscore, count(save.highscore)),
            (Strings.Progress.level, format.number(career.level)),
            (Strings.Progress.bestCombo, count(stats.bestCombo)),
            (Strings.Progress.bestChain, count(stats.bestChain)),
            (Strings.Progress.streak, career.dailyStreak > 0 ? Strings.Progress.days(career.dailyStreak) : Strings.Progress.none),
            (Strings.Progress.shiftsPlayed, count(save.shiftsPlayed)),
            (Strings.Progress.shiftsCompleted, count(stats.shiftsCompleted)),
            (Strings.Progress.takedowns, count(stats.takedowns)),
            (Strings.Progress.transporters, count(stats.transporters)),
            (Strings.Progress.perfects, count(stats.perfects)),
            (Strings.Progress.chestsOpened, count(career.chestsOpened)),
            (Strings.Progress.collection, Strings.Progress.owned(Cosmetics.all.count(where: { career.owns($0.id) }), of: Cosmetics.all.count)),
        ]
    }

    // MARK: - Layout

    struct Layout {
        var segments: [(Section, Rect)]
        var content: Rect
    }

    static func layout(viewport: Vec2, bottomInset: Double) -> Layout {
        let width = min(viewport.x - 2 * gap, 460)
        let left = (viewport.x - width) / 2
        let top = Metrics.sceneInsets.top + 22
        let segmentWidth = width / Double(Section.allCases.count)
        let segments = Section.allCases.enumerated().map { index, section in
            (section, Rect(minX: left + Double(index) * segmentWidth, minY: top, maxX: left + Double(index + 1) * segmentWidth, maxY: top + ShopPage.segmentHeight))
        }
        let content = Rect(minX: left, minY: top + ShopPage.segmentHeight + gap, maxX: left + width, maxY: viewport.y - bottomInset - gap)
        return Layout(segments: segments, content: content)
    }

    /// What a tap at `point` hits.
    public static func target(at point: Vec2, viewport: Vec2, bottomInset: Double) -> Target? {
        layout(viewport: viewport, bottomInset: bottomInset).segments.first { $0.1.contains(point) }.map { .section($0.0) }
    }

    // MARK: - Drawing

    static func add(save: SaveGame, today: Int, state: State, format: TextFormat, reduceMotion: Bool, bottomInset: Double, to list: inout RenderList) {
        let viewport = list.camera.viewport
        var id = RenderID.menu
        // The city stays faintly there behind the page (`Perspective`): one world, another view.
        list.add(.roundedRect(center: viewport / 2, size: viewport, cornerRadius: 0, rotation: 0), color: .scrim, opacity: MenuKit.pageBackdrop, space: .screen, id: id)
        id += 1
        MenuKit.header(Strings.Tabs.title(.progress), money: Strings.Upgrades.balance(format.number(save.career.money)), viewport: viewport, id: &id, to: &list)

        let layout = layout(viewport: viewport, bottomInset: bottomInset)
        let labels = layout.segments.map { Strings.Progress.section($0.0) }
        let chosen = layout.segments.firstIndex { $0.0 == state.section } ?? 0
        var thumb = Double(chosen)
        if let slide = state.sectionSlide, let from = layout.segments.firstIndex(where: { $0.0 == slide.from }) {
            let spring = reduceMotion ? 1 : Ease.settle(slide.age / ShopPage.slideDuration)
            thumb = Double(from) + (Double(chosen) - Double(from)) * spring
        }
        if let first = layout.segments.first?.1, let last = layout.segments.last?.1 {
            let all = Rect(minX: first.minX, minY: first.minY, maxX: last.maxX, maxY: last.maxY)
            MenuKit.segmented(labels, chosen: chosen, thumb: thumb, in: all, id: &id, to: &list)
        }

        let start = list.items.count
        addSection(state.section, layout, save: save, today: today, age: state.age, format: format, reduceMotion: reduceMotion, id: &id, to: &list)
        if let slide = state.sectionSlide {
            // The new section swipes in from its side, the old one out the other way.
            let side = state.section.rawValue > slide.from.rawValue ? 1.0 : -1.0
            let spring = reduceMotion ? 1 : Ease.settle(slide.age / ShopPage.slideDuration)
            let shift = Vec2(side * layout.content.width * 0.45 * (1 - spring), 0)
            let fade = Ease.outCubic(slide.age / 0.18)
            for index in start..<list.items.count {
                list.items[index] = list.items[index].moved(by: shift, opacity: fade)
            }
            let gone = Ease.outCubic(slide.age / ShopPage.slideOut)
            if gone < 1 {
                var old = RenderList(camera: list.camera, background: list.background)
                var oldId = RenderID.shopSlide
                addSection(slide.from, layout, save: save, today: today, age: 10, format: format, reduceMotion: true, id: &oldId, to: &old)
                let away = Vec2(reduceMotion ? 0 : -side * layout.content.width * 0.3 * gone, 0)
                list.items.insert(contentsOf: old.items.map { $0.moved(by: away, opacity: 1 - gone) }, at: start)
            }
        }
    }

    private static func addSection(_ section: Section, _ layout: Layout, save: SaveGame, today: Int, age: Double, format: TextFormat, reduceMotion: Bool, id: inout Int, to list: inout RenderList) {
        switch section {
        case .records: addRecords(layout, save: save, age: age, format: format, reduceMotion: reduceMotion, id: &id, to: &list)
        case .quests: addQuests(layout, career: save.career, today: today, age: age, format: format, reduceMotion: reduceMotion, id: &id, to: &list)
        case .achievements: addAchievements(layout, career: save.career, age: age, reduceMotion: reduceMotion, id: &id, to: &list)
        }
    }

    /// The `index`-th row as it comes in: faded and a little low at first, one after the other.
    private static func entering(_ rect: Rect, age: Double, index: Int, reduceMotion: Bool) -> (Rect, Double) {
        guard !reduceMotion else { return (rect, 1) }
        let rise = MenuKit.cardEnter(MenuKit.staggerSpring(age: age, index: index)).rise
        let moved = Rect(minX: rect.minX, minY: rect.minY + rise, maxX: rect.maxX, maxY: rect.maxY + rise)
        return (moved, MenuKit.stagger(age: age, index: index))
    }

    private static func panel(_ rect: Rect, opacity: Double, id: inout Int, to list: inout RenderList) {
        list.add(.roundedRect(center: rect.center, size: Vec2(rect.width, rect.height), cornerRadius: ShopPage.corner, rotation: 0), color: .surface, opacity: opacity, space: .screen, id: id)
        id += 1
    }

    private static func text(_ string: String, _ at: Vec2, size: Double, weight: FontWeight = .regular, color: ColorToken, alignment: TextAlignment = .leading, opacity: Double, id: inout Int, to list: inout RenderList) {
        list.add(.text(string, position: at, size: size, alignment: alignment, weight: weight), color: color, opacity: opacity, space: .screen, id: id)
        id += 1
    }

    // MARK: Records

    /// Tiles, two across: the number big, what it counts small under it.
    private static func addRecords(_ layout: Layout, save: SaveGame, age: Double, format: TextFormat, reduceMotion: Bool, id: inout Int, to list: inout RenderList) {
        let records = records(save: save, format: format)
        let cells = ShopPage.grid(records.count, columns: 2, in: layout.content, maxHeight: 74)
        for (index, (record, cell)) in zip(records, cells).enumerated() {
            let (rect, opacity) = entering(cell, age: age, index: index, reduceMotion: reduceMotion)
            panel(rect, opacity: opacity, id: &id, to: &list)
            let isEmpty = record.value == Strings.Progress.none
            let size = ShopPage.fitted(record.value, 22, width: rect.width - 32)
            text(record.value, Vec2(rect.minX + 16, rect.center.y - 8), size: size, weight: .bold, color: isEmpty ? .muted : .primary, opacity: opacity, id: &id, to: &list)
            text(record.label, Vec2(rect.minX + 16, rect.center.y + 16), size: 11, color: .muted, opacity: opacity, id: &id, to: &list)
        }
    }

    // MARK: Quests

    /// The Daily Shift first, then the day's three challenges, then the streak's next reward.
    private static func addQuests(_ layout: Layout, career: Career, today: Int, age: Double, format: TextFormat, reduceMotion: Bool, id: inout Int, to list: inout RenderList) {
        let rows = ShopPage.grid(5, columns: 1, in: layout.content, maxHeight: 64)
        var index = 0
        func row() -> (Rect, Double) {
            defer { index += 1 }
            return entering(rows[index], age: age, index: index, reduceMotion: reduceMotion)
        }

        let (daily, dailyOpacity) = row()
        panel(daily, opacity: dailyOpacity, id: &id, to: &list)
        let open = career.isDailyOpen(day: today)
        text(Strings.Daily.title, Vec2(daily.minX + 16, daily.center.y - 9), size: 14, weight: .bold, color: .primary, opacity: dailyOpacity, id: &id, to: &list)
        text(open ? Strings.Daily.readyHint : Strings.Daily.doneHint(streak: career.dailyStreak), Vec2(daily.minX + 16, daily.center.y + 11), size: 11, color: .muted, opacity: dailyOpacity, id: &id, to: &list)
        text(open ? Strings.Daily.ready : Strings.Daily.done, Vec2(daily.maxX - 16, daily.center.y - 9), size: 13, weight: .bold, color: open ? .hazard : .accent, alignment: .trailing, opacity: dailyOpacity, id: &id, to: &list)

        for challenge in Challenge.of(day: today) {
            let (rect, opacity) = row()
            let done = career.isDone(challenge, day: today)
            panel(rect, opacity: opacity, id: &id, to: &list)
            // A tick on the left: filled once done.
            let box = Vec2(rect.minX + 24, rect.center.y)
            list.add(.circle(center: box, radius: 9), color: done ? .accent : .controlFill, opacity: opacity, space: .screen, id: id)
            id += 1
            if done {
                list.add(.line(from: box + Vec2(-4, 0), to: box + Vec2(-1, 3.5), thickness: 2), color: .accentInk, opacity: opacity, space: .screen, id: id)
                list.add(.line(from: box + Vec2(-1, 3.5), to: box + Vec2(4.5, -3.5), thickness: 2), color: .accentInk, opacity: opacity, space: .screen, id: id + 1)
                id += 2
            }
            text(Strings.Daily.challenge(challenge), Vec2(rect.minX + 44, rect.center.y), size: 13, weight: .bold, color: done ? .muted : .primary, opacity: opacity, id: &id, to: &list)
            if done {
                text(Strings.Daily.done, Vec2(rect.maxX - 16, rect.center.y), size: 13, weight: .bold, color: .accent, alignment: .trailing, opacity: opacity, id: &id, to: &list)
            } else {
                Icons.moneyTag(format.number(challenge.reward), at: Vec2(rect.maxX - 16, rect.center.y), size: 13, alignment: .trailing, color: .primary, opacity: opacity, id: &id, to: &list)
            }
        }

        let (streak, streakOpacity) = row()
        panel(streak, opacity: streakOpacity, id: &id, to: &list)
        text(Strings.Daily.streakLine(career.dailyStreak), Vec2(streak.minX + 16, streak.center.y - 9), size: 13, weight: .bold, color: .primary, opacity: streakOpacity, id: &id, to: &list)
        let next = career.nextStreakMilestone().map { Strings.Daily.nextMilestone(left: $0.left, item: $0.item) } ?? Strings.Progress.questsHint
        text(next, Vec2(streak.minX + 16, streak.center.y + 11), size: 11, color: .muted, opacity: streakOpacity, id: &id, to: &list)
    }

    // MARK: Achievements

    /// A row per mastery goal: what the next tier asks, a bar towards it, three pips.
    private static func addAchievements(_ layout: Layout, career: Career, age: Double, reduceMotion: Bool, id: inout Int, to list: inout RenderList) {
        let goals = MasteryGoal.allCases
        let rows = ShopPage.grid(goals.count, columns: 1, in: layout.content, maxHeight: 58)
        for (index, (goal, cell)) in zip(goals, rows).enumerated() {
            let (rect, opacity) = entering(cell, age: age, index: index, reduceMotion: reduceMotion)
            panel(rect, opacity: opacity, id: &id, to: &list)
            let tiers = goal.thresholds.count
            let reached = min(career.masteryTiers[goal.rawValue] ?? 0, tiers)
            let complete = reached >= tiers
            let top = rect.center.y - rect.height * 0.2
            let pipsWidth = Double(tiers) * 14
            text(Strings.Mastery.name(goal), Vec2(rect.minX + 16, top), size: 13, weight: .bold, color: .primary, opacity: opacity, id: &id, to: &list)
            text(Strings.Mastery.detail(goal, tier: reached), Vec2(rect.maxX - 16 - pipsWidth - 6, top), size: 11, color: complete ? .accent : .muted, alignment: .trailing, opacity: opacity, id: &id, to: &list)
            // A pip per tier, filled for the ones reached.
            for tier in 0..<tiers {
                let at = Vec2(rect.maxX - 16 - pipsWidth + Double(tier) * 14 + 7, top)
                list.add(.circle(center: at, radius: 5), color: tier < reached ? .accent : .controlFill, opacity: opacity, space: .screen, id: id)
                id += 1
            }
            // The bar towards the next tier; full once all are reached.
            let from = reached == 0 ? 0 : goal.thresholds[reached - 1]
            let fraction = complete ? 1 : Ease.clamp01(Double(goal.value(in: career.mastery) - from) / Double(max(1, goal.thresholds[reached] - from)))
            let barY = rect.center.y + rect.height * 0.22
            let barWidth = rect.width - 32
            list.add(.roundedRect(center: Vec2(rect.center.x, barY), size: Vec2(barWidth, 5), cornerRadius: 2.5, rotation: 0), color: .controlFill, opacity: opacity, space: .screen, id: id)
            id += 1
            if fraction > 0 {
                let filled = max(5, barWidth * fraction)
                list.add(.roundedRect(center: Vec2(rect.minX + 16 + filled / 2, barY), size: Vec2(filled, 5), cornerRadius: 2.5, rotation: 0), color: .accent, opacity: opacity, space: .screen, id: id)
                id += 1
            }
        }
    }
}
