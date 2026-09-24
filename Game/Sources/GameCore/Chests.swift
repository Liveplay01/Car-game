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

    /// Only the Standard chest is sold, for in-game money (IDEA.md). The others are earned;
    /// real money is not part of v1.0.
    public var isForSale: Bool { self == .standard }

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

public struct Cosmetic: Sendable, Equatable, Identifiable {
    public var id: String
    public var kind: CosmeticKind
    public var rarity: Rarity
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
        Cosmetic(id: "carbon", kind: .carSkin, rarity: .epic),
        Cosmetic(id: "blackGold", kind: .carSkin, rarity: .epic),
        Cosmetic(id: "nightMint", kind: .carSkin, rarity: .epic),
        Cosmetic(id: "tiger", kind: .carSkin, rarity: .epic),
        Cosmetic(id: "gold", kind: .carSkin, rarity: .legendary),
        Cosmetic(id: "royal", kind: .carSkin, rarity: .legendary),
        Cosmetic(id: "lagoon", kind: .carSkin, rarity: .legendary),
        // Map skins
        Cosmetic(id: "dusk", kind: .mapSkin, rarity: .common),
        Cosmetic(id: "sand", kind: .mapSkin, rarity: .common),
        Cosmetic(id: "neon", kind: .mapSkin, rarity: .rare),
        Cosmetic(id: "forest", kind: .mapSkin, rarity: .rare),
        Cosmetic(id: "autumn", kind: .mapSkin, rarity: .epic),
        Cosmetic(id: "sakura", kind: .mapSkin, rarity: .epic),
        Cosmetic(id: "aurora", kind: .mapSkin, rarity: .legendary),
        Cosmetic(id: "ember", kind: .mapSkin, rarity: .legendary),
        // Vehicle types
        Cosmetic(id: "sportsCar", kind: .vehicleType, rarity: .epic),
    ]

    public static func item(_ id: String) -> Cosmetic? { all.first { $0.id == id } }
}

/// What one opened chest gave.
public struct ChestOpening: Sendable, Equatable {
    public var chest: ChestKind
    public var item: Cosmetic
    /// True if the player already had it; then `money` was paid instead.
    public var isDuplicate: Bool
    public var money: Int
}

extension Career {
    /// Chests in a row without an Epic or better, after which the next one is at least Epic.
    public static let pityChests = 10

    /// Buys a chest with in-game money, if it is for sale and the money is there.
    @discardableResult
    public mutating func buyChest(_ kind: ChestKind, config: Config) -> Bool {
        guard kind.isForSale, money >= config.standardChestPrice else { return false }
        money -= config.standardChestPrice
        chests.append(kind)
        return true
    }

    /// How many chests of a kind wait in the shop.
    public func count(of kind: ChestKind) -> Int { chests.count(where: { $0 == kind }) }

    /// Opens the chest at `index`. Deterministic: the same career opens the same item.
    @discardableResult
    public mutating func openChest(at index: Int, seed: UInt64) -> ChestOpening? {
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
        let pool = Cosmetics.all.filter { $0.rarity == rarity }
        let item = random.pick(pool)
        if collection.contains(item.id) {
            money += rarity.duplicateMoney
            return ChestOpening(chest: kind, item: item, isDuplicate: true, money: rarity.duplicateMoney)
        }
        collection.append(item.id)
        return ChestOpening(chest: kind, item: item, isDuplicate: false, money: 0)
    }

    /// Puts on a skin the player owns, or takes it off if it is on already.
    public mutating func wear(_ id: String) {
        guard let item = Cosmetics.item(id), collection.contains(id) else { return }
        switch item.kind {
        case .carSkin: carSkin = carSkin == id ? nil : id
        case .mapSkin: mapSkin = mapSkin == id ? nil : id
        case .vehicleType: break
        }
    }

    /// Whether an item is in the collection, e.g. the vehicle type "sportsCar".
    public func owns(_ id: String) -> Bool { collection.contains(id) }
}
