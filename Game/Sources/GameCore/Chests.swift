/// Chests and cosmetics (IDEA.md: Lootboxen, Truhen-Typen, Lootbox-Regeln; ROADMAP.md, M10).
///
/// A chest holds only map skins, car skins and vehicle types. Never a gameplay bonus, a
/// better insurance, more money or better odds. The odds are public (`odds`), a pity
/// counter guarantees an Epic at the latest every `pityChests` chests, and a duplicate is
/// paid out as money instead.
public enum ChestKind: String, Sendable, Equatable, CaseIterable, Codable {
    case standard
    /// Better contents; earned from hard masteries (sold for real money only later, if ever).
    case premium
    /// Limited themed contents (with the events after v1.0).
    case event
    /// Earned from the police masteries.
    case criminalHunt

    /// Standard and Premium chests are sold for in-game money; the others are earned.
    /// Real money is not part of v1.0.
    public var isForSale: Bool { self == .standard || self == .premium }

    /// Chance of each rarity, common … legendary. Shown in the shop.
    public var odds: [Double] {
        switch self {
        case .standard: [0.70, 0.22, 0.07, 0.01]
        case .premium: [0.35, 0.35, 0.22, 0.08]
        case .event: [0.40, 0.35, 0.20, 0.05]
        case .criminalHunt: [0.50, 0.30, 0.15, 0.05]
        }
    }
}

public enum Rarity: Int, Sendable, Equatable, CaseIterable, Codable, Comparable {
    case common
    case rare
    case epic
    case legendary

    public static func < (a: Rarity, b: Rarity) -> Bool { a.rawValue < b.rawValue }

    /// What a duplicate pays instead.
    public var duplicateMoney: Int {
        switch self {
        case .common: 250
        case .rare: 600
        case .epic: 1_500
        case .legendary: 4_000
        }
    }
}

public enum CosmeticKind: String, Sendable, Equatable, Codable {
    case carSkin
    case mapSkin
    /// A vehicle type with its own (fair) properties, e.g. the sports car.
    case vehicleType
}

extension Cosmetic {
    /// The vehicle a vehicle-type item unlocks.
    public var vehicleType: VehicleType? {
        switch id {
        case "sportsCar": .sportsCar
        case "compact": .compact
        case "van": .van
        default: nil
        }
    }
}

public struct Cosmetic: Sendable, Equatable, Identifiable {
    public var id: String
    public var kind: CosmeticKind
    public var rarity: Rarity
    /// Chests, the Daily streak or a season (`Rewards.swift`).
    public var source: CosmeticSource = .chest
}

public enum Cosmetics {
    /// Everything a chest can hold (LOOT.md). Only the player's own normal cars and the map
    /// wear skins; police, criminal and transporter keep their look, it is information.
    public static let all: [Cosmetic] = [
        // Car skins
        Cosmetic(id: "racingRed", kind: .carSkin, rarity: .common),
        Cosmetic(id: "midnight", kind: .carSkin, rarity: .common),
        Cosmetic(id: "mint", kind: .carSkin, rarity: .common),
        Cosmetic(id: "pearl", kind: .carSkin, rarity: .common),
        Cosmetic(id: "olive", kind: .carSkin, rarity: .common),
        Cosmetic(id: "coral", kind: .carSkin, rarity: .common),
        Cosmetic(id: "sunset", kind: .carSkin, rarity: .rare),
        Cosmetic(id: "ice", kind: .carSkin, rarity: .rare),
        Cosmetic(id: "rose", kind: .carSkin, rarity: .rare),
        Cosmetic(id: "lime", kind: .carSkin, rarity: .rare),
        Cosmetic(id: "copper", kind: .carSkin, rarity: .rare),
        Cosmetic(id: "redStripe", kind: .carSkin, rarity: .rare),
        Cosmetic(id: "pearlShine", kind: .carSkin, rarity: .rare),
        Cosmetic(id: "carbon", kind: .carSkin, rarity: .epic),
        Cosmetic(id: "blackGold", kind: .carSkin, rarity: .epic),
        Cosmetic(id: "nightMint", kind: .carSkin, rarity: .epic),
        Cosmetic(id: "tiger", kind: .carSkin, rarity: .epic),
        Cosmetic(id: "chrome", kind: .carSkin, rarity: .epic),
        Cosmetic(id: "starlight", kind: .carSkin, rarity: .epic),
        Cosmetic(id: "gold", kind: .carSkin, rarity: .legendary),
        Cosmetic(id: "royal", kind: .carSkin, rarity: .legendary),
        Cosmetic(id: "lagoon", kind: .carSkin, rarity: .legendary),
        Cosmetic(id: "diamond", kind: .carSkin, rarity: .legendary),
        Cosmetic(id: "holo", kind: .carSkin, rarity: .legendary),
        // The second wave (LOOT.md, 25.09.2026): new paints, two-tone roofs, finishes.
        Cosmetic(id: "lemon", kind: .carSkin, rarity: .common),
        Cosmetic(id: "plum", kind: .carSkin, rarity: .common),
        Cosmetic(id: "fern", kind: .carSkin, rarity: .common),
        Cosmetic(id: "latte", kind: .carSkin, rarity: .common),
        Cosmetic(id: "teal", kind: .carSkin, rarity: .rare),
        Cosmetic(id: "sky", kind: .carSkin, rarity: .rare),
        Cosmetic(id: "cherry", kind: .carSkin, rarity: .rare),
        Cosmetic(id: "mocha", kind: .carSkin, rarity: .rare),
        Cosmetic(id: "panda", kind: .carSkin, rarity: .epic),
        Cosmetic(id: "hanami", kind: .carSkin, rarity: .epic),
        Cosmetic(id: "volcano", kind: .carSkin, rarity: .epic),
        Cosmetic(id: "ocean", kind: .carSkin, rarity: .epic),
        Cosmetic(id: "koi", kind: .carSkin, rarity: .legendary),
        Cosmetic(id: "obsidian", kind: .carSkin, rarity: .legendary),
        Cosmetic(id: "ruby", kind: .carSkin, rarity: .legendary),
        // Map skins
        Cosmetic(id: "dusk", kind: .mapSkin, rarity: .common),
        Cosmetic(id: "sand", kind: .mapSkin, rarity: .common),
        Cosmetic(id: "neon", kind: .mapSkin, rarity: .rare),
        Cosmetic(id: "forest", kind: .mapSkin, rarity: .rare),
        Cosmetic(id: "autumn", kind: .mapSkin, rarity: .epic),
        Cosmetic(id: "sakura", kind: .mapSkin, rarity: .epic),
        Cosmetic(id: "aurora", kind: .mapSkin, rarity: .legendary),
        Cosmetic(id: "ember", kind: .mapSkin, rarity: .legendary),
        Cosmetic(id: "meadow", kind: .mapSkin, rarity: .common),
        Cosmetic(id: "tropic", kind: .mapSkin, rarity: .rare),
        Cosmetic(id: "snowfall", kind: .mapSkin, rarity: .epic),
        Cosmetic(id: "cosmos", kind: .mapSkin, rarity: .legendary),
        // Vehicle types
        Cosmetic(id: "compact", kind: .vehicleType, rarity: .rare),
        Cosmetic(id: "sportsCar", kind: .vehicleType, rarity: .epic),
        Cosmetic(id: "van", kind: .vehicleType, rarity: .epic),
        // Only for the Daily streak: 7, 14 and 30 days in a row (Leo, 25.09.2026).
        Cosmetic(id: "streakBronze", kind: .carSkin, rarity: .rare, source: .streak(days: 7)),
        Cosmetic(id: "streakSilver", kind: .carSkin, rarity: .epic, source: .streak(days: 14)),
        Cosmetic(id: "streakGold", kind: .carSkin, rarity: .legendary, source: .streak(days: 30)),
        // Only in the Event Chest while their season runs.
        Cosmetic(id: "frost", kind: .carSkin, rarity: .epic, source: .season(.winter)),
        Cosmetic(id: "blossom", kind: .carSkin, rarity: .epic, source: .season(.spring)),
        Cosmetic(id: "sunburst", kind: .carSkin, rarity: .epic, source: .season(.summer)),
        Cosmetic(id: "pumpkin", kind: .carSkin, rarity: .epic, source: .season(.autumn)),
    ]

    public static func item(_ id: String) -> Cosmetic? { all.first { $0.id == id } }
}

extension Config {
    /// What a chest costs in the shop; nil if it is not for sale.
    public func price(of chest: ChestKind) -> Int? {
        switch chest {
        case .standard: standardChestPrice
        case .premium: premiumChestPrice
        case .event, .criminalHunt: nil
        }
    }
}

/// What one opened chest gave.
public struct ChestOpening: Sendable, Equatable {
    public var chest: ChestKind
    public var item: Cosmetic
    /// True if the player already had it; then `money` was paid instead.
    public var isDuplicate: Bool
    public var money: Int

    public init(chest: ChestKind, item: Cosmetic, isDuplicate: Bool, money: Int) {
        self.chest = chest
        self.item = item
        self.isDuplicate = isDuplicate
        self.money = money
    }
}

extension Career {
    /// Chests in a row without an Epic or better, after which the next one is at least Epic.
    public static let pityChests = 10

    /// Buys a chest with in-game money, if it is for sale and the money is there.
    @discardableResult
    public mutating func buyChest(_ kind: ChestKind, config: Config) -> Bool {
        guard let price = config.price(of: kind), money >= price else { return false }
        money -= price
        chests.append(kind)
        return true
    }

    /// Car skins worn at once, at most.
    public static let maxCarSkins = 5

    /// Whether today still allows a chest for watching an ad.
    public func adChestsLeft(day: Int, config: Config) -> Int {
        max(0, config.adChestsPerDay - (adDay == day ? adChests : 0))
    }

    /// A watched ad: one Standard chest, a few times a day.
    @discardableResult
    public mutating func rewardAd(day: Int, config: Config) -> Bool {
        guard adChestsLeft(day: day, config: config) > 0 else { return false }
        if adDay != day {
            adDay = day
            adChests = 0
        }
        adChests += 1
        chests.append(.standard)
        return true
    }

    /// Whether a skin is on.
    public func isWorn(_ id: String) -> Bool { carSkins.contains(id) || mapSkin == id }

    /// How many chests of a kind wait in the shop.
    public func count(of kind: ChestKind) -> Int { chests.count(where: { $0 == kind }) }

    /// Opens the chest at `index`. Deterministic: the same career opens the same item. An
    /// Event Chest opened on `day` holds its season's item half the time, until it is owned.
    @discardableResult
    public mutating func openChest(at index: Int, seed: UInt64, day: Int? = nil) -> ChestOpening? {
        guard chests.indices.contains(index) else { return nil }
        let kind = chests.remove(at: index)
        var random = SeededRandom(seed: seed ^ UInt64(chestsOpened &* 7919) ^ 0xC4E5_7B0C_5EED_0001)
        chestsOpened += 1
        var rarity = Rarity.common
        var pick = random.unit()
        for (candidate, chance) in zip(Rarity.allCases, kind.odds) {
            rarity = candidate
            pick -= chance
            if pick < 0 { break }
        }
        // Pity: a long run without an Epic ends with one.
        if chestsSinceEpic >= Self.pityChests - 1, rarity < .epic {
            rarity = .epic
        }
        chestsSinceEpic = rarity >= .epic ? 0 : chestsSinceEpic + 1
        let pool = Cosmetics.all.filter { $0.rarity == rarity && $0.source == .chest }
        var item = random.pick(pool)
        if kind == .event, let day, random.unit() < 0.5,
           let seasonal = Season.of(day: day).items.first(where: { !collection.contains($0.id) }) {
            item = seasonal
        }
        if collection.contains(item.id) {
            money += rarity.duplicateMoney
            return ChestOpening(chest: kind, item: item, isDuplicate: true, money: rarity.duplicateMoney)
        }
        collection.append(item.id)
        return ChestOpening(chest: kind, item: item, isDuplicate: false, money: 0)
    }

    /// Puts on a skin the player owns, or takes it off if it is on already. Car skins mix:
    /// up to `maxCarSkins` at once. Returns false if nothing changed (not owned, or full).
    @discardableResult
    public mutating func wear(_ id: String) -> Bool {
        guard let item = Cosmetics.item(id), collection.contains(id) else { return false }
        switch item.kind {
        case .carSkin:
            if let index = carSkins.firstIndex(of: id) {
                carSkins.remove(at: index)
            } else {
                guard carSkins.count < Self.maxCarSkins else { return false }
                carSkins.append(id)
            }
        case .mapSkin:
            mapSkin = mapSkin == id ? nil : id
        case .vehicleType:
            return false
        }
        return true
    }

    /// Whether an item is in the collection, e.g. the vehicle type "sportsCar".
    public func owns(_ id: String) -> Bool { collection.contains(id) }
}
