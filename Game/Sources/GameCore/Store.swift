/// Monetisation (Leo, 26.09.2026; MONETIZATION.md): in-app purchases and rewarded ads.
/// Everything here is a placeholder until the App Store products exist: the ids, what a
/// product gives and the prices shown are the game's own, the app later reads the real,
/// localised price from StoreKit. The core only says what a product grants; paying is the
/// platform's job (`Purchasing` in `GamePresentation`).

/// What can be bought for real money. The raw value is the App Store product id.
public enum StoreProduct: String, Sendable, Equatable, CaseIterable, Codable {
    /// Once per player: money and chests for a fast start, cheaper than anything else.
    case starterPack = "cargame.starterpack"
    case cashSmall = "cargame.cash.small"
    case cashMedium = "cargame.cash.medium"
    case cashLarge = "cargame.cash.large"
    /// Three Premium chests. Paid loot boxes: odds on screen, legal check before release.
    case premiumChests = "cargame.chests.premium3"
    /// Rewarded ads give their reward without the ad; the daily limits stay.
    case noAds = "cargame.noads"
    /// More money from every shift, for good (`Config.cashBoostPay`).
    case cashBoost = "cargame.cashboost"

    /// Bought once and kept (restorable), or bought again and again.
    public var isConsumable: Bool {
        switch self {
        case .cashSmall, .cashMedium, .cashLarge, .premiumChests: true
        case .starterPack, .noAds, .cashBoost: false
        }
    }

    /// Shown until the App Store says the real price (placeholder, US dollars).
    public var placeholderPrice: String {
        switch self {
        case .starterPack: "$1.99"
        case .cashSmall: "$0.99"
        case .cashMedium: "$2.99"
        case .cashLarge: "$6.99"
        case .premiumChests: "$3.99"
        case .noAds: "$3.99"
        case .cashBoost: "$4.99"
        }
    }

    /// Money and chests the purchase puts on the account.
    public func grant(config: Config) -> (money: Int, chests: [ChestKind]) {
        switch self {
        case .starterPack: (config.starterPackMoney, [.premium, .standard, .standard])
        case .cashSmall: (config.cashSmallAmount, [])
        case .cashMedium: (config.cashMediumAmount, [])
        case .cashLarge: (config.cashLargeAmount, [])
        case .premiumChests: (0, Array(repeating: .premium, count: config.premiumChestBundle))
        case .noAds, .cashBoost: (0, [])
        }
    }
}

/// What a rewarded ad pays.
public enum AdReward: Sendable, Equatable {
    /// A Standard chest (`Config.adChestsPerDay`).
    case chest
    /// Money that grows with the level (`Career.adCash`, `Config.adCashPerDay`).
    case cash
}

extension Career {
    /// Whether a one-time product is owned.
    public func hasPurchased(_ product: StoreProduct) -> Bool {
        !product.isConsumable && purchases.contains(product.rawValue)
    }

    /// Whether the store still offers it: one-time products only until they are owned.
    public func canBuy(_ product: StoreProduct) -> Bool {
        product.isConsumable || !hasPurchased(product)
    }

    /// Books a paid purchase: its money and chests, and a one-time product as owned.
    /// Returns false for a one-time product that is owned already (nothing is given twice).
    @discardableResult
    public mutating func applyPurchase(_ product: StoreProduct, config: Config) -> Bool {
        guard canBuy(product) else { return false }
        let grant = product.grant(config: config)
        money += grant.money
        chests += grant.chests
        if !product.isConsumable { purchases.append(product.rawValue) }
        return true
    }

    /// One-time products the App Store says are owned (Restore Purchases, a new device):
    /// marked as owned without giving their money and chests again. Returns what was new.
    @discardableResult
    public mutating func restorePurchases(_ products: [StoreProduct]) -> [StoreProduct] {
        let new = products.filter { !$0.isConsumable && !purchases.contains($0.rawValue) }
        purchases += new.map(\.rawValue)
        return new
    }

    /// Whether a rewarded ad can be skipped: No Ads gives the reward right away.
    public var skipsAds: Bool { hasPurchased(.noAds) }

    /// Money a cash ad pays at the current level.
    public func adCash(config: Config) -> Int {
        config.adCashBase + config.adCashPerLevel * max(0, level - 1)
    }

    /// How many ads of this kind today still allows.
    public func adsLeft(_ reward: AdReward, day: Int, config: Config) -> Int {
        switch reward {
        case .chest: adChestsLeft(day: day, config: config)
        case .cash: max(0, config.adCashPerDay - (adCashDay == day ? adCashCount : 0))
        }
    }

    /// A watched ad (or one skipped with No Ads): its reward, within today's limit.
    /// Returns the money it paid (0 for a chest), or nil when today's ads are used up.
    @discardableResult
    public mutating func rewardAd(_ reward: AdReward, day: Int, config: Config) -> Int? {
        switch reward {
        case .chest:
            return rewardAd(day: day, config: config) ? 0 : nil
        case .cash:
            guard adsLeft(.cash, day: day, config: config) > 0 else { return nil }
            if adCashDay != day {
                adCashDay = day
                adCashCount = 0
            }
            adCashCount += 1
            let cash = adCash(config: config)
            money += cash
            return cash
        }
    }
}

extension Config {
    /// Cash Boost: every shift pays `cashBoostPay` times as much.
    public func forCashBoost() -> Config {
        var config = self
        config.shiftPay = Int((Double(shiftPay) * cashBoostPay).rounded())
        config.transporterPay = Int((Double(transporterPay) * cashBoostPay).rounded())
        config.shieldBonus = Int((Double(shieldBonus) * cashBoostPay).rounded())
        return config
    }
}
