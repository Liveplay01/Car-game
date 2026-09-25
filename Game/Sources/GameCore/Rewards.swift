import Foundation

/// Long-term motivation (Leo, 25.09.2026): event chests from city events, milestones for the
/// Daily streak, seasons with items only they bring, albums for full sets, and the best time
/// per level to race against. All of it is plain data on the career; the platform only says
/// which day it is.

/// Where an item comes from. Only `.chest` items are in the chests' pools; the others are
/// earned their own way and show in the collection as a goal until then.
public enum CosmeticSource: Sendable, Equatable {
    case chest
    /// Given for playing the Daily Shift this many days in a row.
    case streak(days: Int)
    /// In the Event Chest only while its season runs.
    case season(Season)
}

// MARK: - Seasons

/// The four seasons of the year, by month. Each brings its own item to the Event Chest,
/// which can only be found while it runs (LOOT.md: Event-Skins, zeitlich begrenzt).
public enum Season: String, Sendable, Equatable, CaseIterable {
    case winter, spring, summer, autumn

    /// The season of a day (days since 1970).
    public static func of(day: Int) -> Season {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC") ?? .current
        let month = calendar.component(.month, from: Date(timeIntervalSince1970: Double(day) * 86_400))
        switch month {
        case 3...5: return .spring
        case 6...8: return .summer
        case 9...11: return .autumn
        default: return .winter
        }
    }

    /// What only this season brings.
    public var items: [Cosmetic] { Cosmetics.all.filter { $0.source == .season(self) } }
}

// MARK: - Albums

/// A full set of items (Leo: Sammelalben). Completing one pays once and puts its frame
/// around the roundabout.
public enum Album: String, Sendable, Equatable, CaseIterable, Codable {
    case maps, commons, rares, epics, legends, seasons, loyalty

    public var items: [Cosmetic] {
        switch self {
        case .maps: Cosmetics.all.filter { $0.kind == .mapSkin && $0.source == .chest }
        case .commons: Self.carSkins(.common)
        case .rares: Self.carSkins(.rare)
        case .epics: Self.carSkins(.epic)
        case .legends: Self.carSkins(.legendary)
        case .seasons: Cosmetics.all.filter { if case .season = $0.source { true } else { false } }
        case .loyalty: Cosmetics.all.filter { if case .streak = $0.source { true } else { false } }
        }
    }

    private static func carSkins(_ rarity: Rarity) -> [Cosmetic] {
        Cosmetics.all.filter { $0.kind == .carSkin && $0.rarity == rarity && $0.source == .chest }
    }

    /// Money for completing it; the harder the set, the more.
    public var reward: Int {
        switch self {
        case .commons: 5_000
        case .maps, .rares: 10_000
        case .epics, .loyalty: 20_000
        case .seasons: 30_000
        case .legends: 40_000
        }
    }
}

// MARK: - Career

extension Career {
    /// Days in a row the Daily Shift was played, and the item each milestone gives.
    public static let streakMilestones: [(days: Int, item: String)] = [(7, "streakBronze"), (14, "streakSilver"), (30, "streakGold")]

    /// Plays today's Daily Shift: it is the first shift of the day and there is one try.
    /// The streak counts the days it was played — coming back is what it rewards; the money
    /// and the chest come only for completing it (`completeDaily`). Returns the milestone
    /// item just earned, if any.
    @discardableResult
    public mutating func startDaily(day: Int) -> Cosmetic? {
        guard isDailyOpen(day: day) else { return nil }
        dailyStreak = dailyPlayed == day - 1 ? dailyStreak + 1 : 1
        dailyPlayed = day
        guard let milestone = Self.streakMilestones.first(where: { $0.days == dailyStreak }),
              !collection.contains(milestone.item), let item = Cosmetics.item(milestone.item) else { return nil }
        collection.append(item.id)
        return item
    }

    /// The next streak milestone and the days still to go; nil once all are reached.
    public func nextStreakMilestone() -> (days: Int, item: String, left: Int)? {
        Self.streakMilestones.first { !collection.contains($0.item) }.map { ($0.days, $0.item, max(1, $0.days - dailyStreak)) }
    }

    /// A completed shift with a city event may bring an Event Chest (the Daily Shift always
    /// does, in `completeDaily`). Decided by the shift's seed, so a replay gives the same.
    @discardableResult
    public mutating func rollEventChest(_ result: ShiftResult, config: Config) -> Bool {
        guard result.outcome == .completed, config.cityEvent != nil else { return false }
        var random = SeededRandom(seed: result.seed ^ 0xE7E1_7C4E_5700_0001)
        guard random.unit() < config.eventChestChance else { return false }
        chests.append(.event)
        return true
    }

    /// Albums completed with the collection as it is now and not paid yet: pays them and
    /// returns them.
    @discardableResult
    public mutating func completeAlbums() -> [Album] {
        let owned = Set(collection)
        let fresh = Album.allCases.filter { album in
            !albumsDone.contains(album.rawValue) && !album.items.isEmpty && album.items.allSatisfy { owned.contains($0.id) }
        }
        for album in fresh {
            albumsDone.append(album.rawValue)
            money += album.reward
        }
        return fresh
    }

    /// How many of an album's items are owned.
    public func progress(of album: Album) -> (owned: Int, total: Int) {
        let owned = Set(collection)
        return (album.items.count(where: { owned.contains($0.id) }), album.items.count)
    }

    /// The frame around the roundabout: the most valuable album completed.
    public var frame: Album? {
        albumsDone.compactMap(Album.init(rawValue:)).max { $0.reward < $1.reward }
    }

    // MARK: Best times

    /// The best completed shift at `level`: when each car was in, seconds from the first
    /// tap. The race against it is shown live (Leo: Rekord-Geist).
    public func bestTimes(atLevel level: Int) -> [Double]? { bestTimes[String(level)] }

    /// Keeps `splits` as the level's best if it was quicker per car (the number of cars
    /// varies a little from try to try). Returns true if it was; a first run is a best too.
    @discardableResult
    public mutating func recordTimes(_ splits: [Double], atLevel level: Int) -> Bool {
        guard let last = splits.last else { return false }
        func pace(_ times: [Double]) -> Double { (times.last ?? .infinity) / Double(max(1, times.count)) }
        if let best = bestTimes[String(level)], pace(best) <= last / Double(splits.count) { return false }
        bestTimes[String(level)] = splits
        return true
    }
}
