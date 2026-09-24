import Foundation

/// What the player buys with money between shifts (ROADMAP.md, M5). Every step changes a
/// value of every later shift's config; how much, and what a step costs, is in `Config`.
public enum Upgrade: String, CaseIterable, Sendable {
    /// More police cars in the queue.
    case morePatrols
    /// A longer countdown before the criminal gets away.
    case longerPursuit
    /// Fewer shifts with criminals. (Not later ones: late in a shift the traffic is at its
    /// fastest, so a criminal would be harder to catch, not easier.)
    case quietStreets
    /// A police car behind the criminal chases it faster.
    case interceptor
    /// An emergency dispatch costs less of the combo.
    case dispatchRadio
    /// One more police crash per shift that the shift survives.
    case backup
    /// Money transporters come sooner and more often.
    case cashRoute
    /// More money for a completed shift.
    case overtime
    /// More lorries: more tolls, and denser traffic (M7).
    case freight
    /// A chance of a second transporter right after one (M7).
    case doubleRun
    /// Pays part of what a crash costs from level 20 on (M7).
    case insurance
    /// Pays part of what an escaped criminal costs from level 20 on (M7).
    case robberyInsurance

    /// How many steps can be bought. The ones with small steps go a long way, so there is
    /// always something to save up for.
    public var maxSteps: Int {
        switch self {
        case .morePatrols, .overtime: 10
        case .longerPursuit, .cashRoute, .freight: 8
        case .insurance, .robberyInsurance: 7
        case .quietStreets, .interceptor, .dispatchRadio, .doubleRun: 5
        case .backup: 3
        }
    }

    /// Price relative to the others: the strongest ones cost more.
    var priceFactor: Double {
        switch self {
        case .morePatrols, .cashRoute, .overtime, .freight: 1
        case .longerPursuit, .dispatchRadio: 1.2
        case .quietStreets, .interceptor, .doubleRun: 1.5
        case .insurance, .robberyInsurance: 2
        case .backup: 3
        }
    }

    /// The level from which the upgrade is offered: the insurances only once there is
    /// something to insure (`crashCostLevel`).
    public func unlockLevel(config: Config) -> Int {
        switch self {
        case .insurance, .robberyInsurance: config.crashCostLevel
        default: 1
        }
    }

    /// The upgrades offered at `level`, in their fixed order.
    public static func available(atLevel level: Int, config: Config) -> [Upgrade] {
        allCases.filter { $0.unlockLevel(config: config) <= level }
    }
}

extension Config {
    /// Price of step `step` (1 = the first) of an upgrade, rounded to 50.
    public func price(of upgrade: Upgrade, step: Int) -> Int {
        let raw = Double(upgradeBaseCost) * upgrade.priceFactor * pow(upgradeCostGrowth, Double(max(1, step) - 1))
        return Int((raw / 50).rounded()) * 50
    }

    /// This config with the bought steps applied.
    public func upgraded(_ steps: (Upgrade) -> Int) -> Config {
        var config = self
        func step(_ upgrade: Upgrade) -> Double { Double(min(max(0, steps(upgrade)), upgrade.maxSteps)) }
        config.policeShare = min(1, policeShare + step(.morePatrols) * patrolsPerStep)
        config.criminalTime += step(.longerPursuit) * pursuitPerStep
        config.criminalChance = max(0, criminalChance - step(.quietStreets) * quietStreetsPerStep)
        config.policeChaseSpeedFactor += step(.interceptor) * interceptorPerStep
        config.dispatchComboFactor = min(1, dispatchComboFactor + step(.dispatchRadio) * dispatchRadioPerStep)
        config.maxPoliceCrashes += Int(step(.backup)) * backupPerStep
        let sooner = step(.cashRoute) * cashRoutePerStep
        config.transporterFirst = max(1, transporterFirst.lowerBound - sooner)...max(1, transporterFirst.upperBound - sooner)
        config.transporterInterval = max(1, transporterInterval.lowerBound - sooner)...max(1, transporterInterval.upperBound - sooner)
        config.shiftPay = Int((Double(shiftPay) * (1 + step(.overtime) * overtimePerStep)).rounded())
        config.truckChance = min(1, truckChance + step(.freight) * freightPerStep)
        config.doubleRunChance = min(1, doubleRunChance + step(.doubleRun) * doubleRunPerStep)
        config.crashInsurance = min(1, crashInsurance + step(.insurance) * insurancePerStep)
        config.robberyInsurance = min(1, robberyInsurance + step(.robberyInsurance) * insurancePerStep)
        return config
    }
}

/// How hard the next shift is played. Chosen before it starts and kept until it is changed
/// (IDEA.md: push your luck).
public enum Duty: String, Sendable, Equatable, CaseIterable, Codable {
    /// The shift as the level has it.
    case normal
    /// More cars, a shorter chase and a criminal in every shift — for triple money.
    case highAlert
}

extension Config {
    /// This config as the chosen duty plays it.
    public func forDuty(_ duty: Duty) -> Config {
        guard duty == .highAlert else { return self }
        var config = self
        config.shiftCars = Int((Double(shiftCars) * highAlertCars).rounded())
        // Never below the floor: at high levels the countdown is already at its shortest.
        config.criminalTime = max(minCriminalTime, criminalTime * highAlertCriminalTime)
        config.criminalChance = 1
        config.criminalInterval = (criminalInterval.lowerBound * highAlertCriminalInterval)...(criminalInterval.upperBound * highAlertCriminalInterval)
        config.shiftPay = Int((Double(shiftPay) * highAlertPay).rounded())
        config.transporterPay = Int((Double(transporterPay) * highAlertPay).rounded())
        config.shieldBonus = Int((Double(shieldBonus) * highAlertPay).rounded())
        return config
    }
}

extension Config {
    /// A roundabout with more arms: its longer ring carries more traffic, transporters come
    /// sooner, and the bigger job pays more (IDEA.md: a bigger map spawns more bots).
    public func forArms() -> Config {
        let extra = Double(max(0, builtArmSlots.count - 4))
        guard extra > 0 else { return self }
        var config = self
        let traffic = 1 + extra * trafficPerArm
        config.densityStart = Int((Double(densityStart) * traffic).rounded())
        config.densityEnd = Int((Double(densityEnd) * traffic).rounded())
        config.minRingBots = Int((Double(minRingBots) * traffic).rounded())
        config.shiftPay = Int((Double(shiftPay) * (1 + extra * payPerArm)).rounded())
        let sooner = max(0.2, 1 - extra * transporterPerArm)
        config.transporterFirst = (transporterFirst.lowerBound * sooner)...(transporterFirst.upperBound * sooner)
        config.transporterInterval = (transporterInterval.lowerBound * sooner)...(transporterInterval.upperBound * sooner)
        return config
    }

    /// Price of the next arm; nil once no slot is free any more.
    public func armPrice(built: [Int]) -> Int? {
        var config = self
        config.armSlots = built
        let slots = config.builtArmSlots
        guard slots.count < armSlotCount / max(1, armSlotSpacing) else { return nil }
        let raw = Double(armBaseCost) * pow(armCostGrowth, Double(max(0, slots.count - 4)))
        return Int((raw / 100).rounded()) * 100
    }

    /// Whether an arm can be built in `slot`: free, and far enough from the others.
    public func canBuildArm(inSlot slot: Int, built: [Int]) -> Bool {
        guard slot > 0, slot < armSlotCount, !built.contains(slot) else { return false }
        return built.allSatisfy { Config.slotDistance($0, slot, slots: armSlotCount) >= armSlotSpacing }
    }
}

/// The player's progress across shifts: level, money, the upgrades bought and the duty of
/// the next shift (ROADMAP.md, M5). The game keeps it in the save game; the balancing bot
/// plays whole careers with it.
public struct Career: Sendable, Equatable, Codable {
    /// The level the next shift is played at.
    public var level = 1
    public var money = 0
    /// Bought steps by upgrade (`Upgrade.rawValue`).
    public var upgrades: [String: Int] = [:]
    /// Normal duty, or High Alert for triple money.
    public var duty: Duty = .normal
    /// The arm slots built so far; slot 0, the player's, is always one of them.
    public var armSlots: [Int] = [0, 4, 8, 12]
    /// Modules on the ring, by slot. There is a fixed number of slots: once they are all
    /// taken, a module is swapped for another one (FOUNDATION.md 2.9).
    public var modules: [Int: RoadModule] = [:]
    /// Mastery counters across the whole career, and the tiers reached per goal (M10).
    public var mastery = MasteryStats()
    public var masteryTiers: [String: Int] = [:]
    /// Chests waiting in the shop, the items collected, and the skins worn (M10).
    public var chests: [ChestKind] = []
    public var collection: [String] = []
    /// Car skins worn at once (up to `Career.maxCarSkins`): every normal car on the road
    /// gets one of them. And the one map skin.
    public var carSkins: [String] = []
    public var mapSkin: String?
    /// Standard chests from watching an ad: how many on `adDay`.
    public var adChests = 0
    public var adDay = -1
    /// For the odds and the pity counter.
    public var chestsOpened = 0
    public var chestsSinceEpic = 0
    /// Daily Shift and Challenges (v1.2): the day last done, the days in a row, and which
    /// challenges of `challengeDay` are done.
    public var dailyDone = -1
    /// The last day the game was opened, for the toll income collected at login.
    public var lastLoginDay = -1
    public var dailyStreak = 0
    public var challengeDay = -1
    public var challengesDone: [String] = []

    public init(level: Int = 1, money: Int = 0) {
        self.level = max(1, level)
        self.money = max(0, money)
    }

    enum CodingKeys: String, CodingKey {
        case level, money, upgrades, duty, armSlots, modules, mastery, masteryTiers, chests, collection
        case carSkins, mapSkin, adChests, adDay, chestsOpened, chestsSinceEpic
        case dailyDone, lastLoginDay, dailyStreak, challengeDay, challengesDone
        /// Read only: the single car skin of older saves.
        case legacyCarSkin = "carSkin"
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(level, forKey: .level)
        try c.encode(money, forKey: .money)
        try c.encode(upgrades, forKey: .upgrades)
        try c.encode(duty, forKey: .duty)
        try c.encode(armSlots, forKey: .armSlots)
        try c.encode(modules, forKey: .modules)
        try c.encode(mastery, forKey: .mastery)
        try c.encode(masteryTiers, forKey: .masteryTiers)
        try c.encode(chests.map(\.rawValue), forKey: .chests)
        try c.encode(collection, forKey: .collection)
        try c.encode(carSkins, forKey: .carSkins)
        try c.encodeIfPresent(mapSkin, forKey: .mapSkin)
        try c.encode(adChests, forKey: .adChests)
        try c.encode(adDay, forKey: .adDay)
        try c.encode(chestsOpened, forKey: .chestsOpened)
        try c.encode(chestsSinceEpic, forKey: .chestsSinceEpic)
        try c.encode(dailyDone, forKey: .dailyDone)
        try c.encode(lastLoginDay, forKey: .lastLoginDay)
        try c.encode(dailyStreak, forKey: .dailyStreak)
        try c.encode(challengeDay, forKey: .challengeDay)
        try c.encode(challengesDone, forKey: .challengesDone)
    }

    /// Missing keys fall back to their defaults, so an older save still loads.
    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        level = max(1, try container.decodeIfPresent(Int.self, forKey: .level) ?? 1)
        money = max(0, try container.decodeIfPresent(Int.self, forKey: .money) ?? 0)
        upgrades = try container.decodeIfPresent([String: Int].self, forKey: .upgrades) ?? [:]
        duty = (try? container.decodeIfPresent(Duty.self, forKey: .duty)) ?? .normal
        armSlots = try container.decodeIfPresent([Int].self, forKey: .armSlots) ?? [0, 4, 8, 12]
        modules = (try? container.decodeIfPresent([Int: RoadModule].self, forKey: .modules)) ?? [:]
        mastery = (try? container.decodeIfPresent(MasteryStats.self, forKey: .mastery)) ?? MasteryStats()
        masteryTiers = (try? container.decodeIfPresent([String: Int].self, forKey: .masteryTiers)) ?? [:]
        // Chest kinds this version does not know are dropped, never the whole save.
        let chestNames = (try? container.decodeIfPresent([String].self, forKey: .chests)) ?? []
        chests = chestNames.compactMap(ChestKind.init(rawValue:))
        collection = (try? container.decodeIfPresent([String].self, forKey: .collection)) ?? []
        // Saves from before several skins held one `carSkin`.
        if let skins = try? container.decodeIfPresent([String].self, forKey: .carSkins) {
            carSkins = skins
        } else if let single = try? container.decodeIfPresent(String.self, forKey: .legacyCarSkin) {
            carSkins = [single]
        }
        adChests = (try? container.decodeIfPresent(Int.self, forKey: .adChests)) ?? 0
        adDay = (try? container.decodeIfPresent(Int.self, forKey: .adDay)) ?? -1
        mapSkin = try? container.decodeIfPresent(String.self, forKey: .mapSkin)
        chestsOpened = (try? container.decodeIfPresent(Int.self, forKey: .chestsOpened)) ?? 0
        chestsSinceEpic = (try? container.decodeIfPresent(Int.self, forKey: .chestsSinceEpic)) ?? 0
        dailyDone = (try? container.decodeIfPresent(Int.self, forKey: .dailyDone)) ?? -1
        lastLoginDay = (try? container.decodeIfPresent(Int.self, forKey: .lastLoginDay)) ?? -1
        dailyStreak = (try? container.decodeIfPresent(Int.self, forKey: .dailyStreak)) ?? 0
        challengeDay = (try? container.decodeIfPresent(Int.self, forKey: .challengeDay)) ?? -1
        challengesDone = (try? container.decodeIfPresent([String].self, forKey: .challengesDone)) ?? []
    }

    public func steps(of upgrade: Upgrade) -> Int {
        min(max(0, upgrades[upgrade.rawValue] ?? 0), upgrade.maxSteps)
    }

    /// Price of the next step; nil once every step is bought, or while the upgrade is not
    /// offered yet at this level.
    public func price(of upgrade: Upgrade, config: Config) -> Int? {
        guard level >= upgrade.unlockLevel(config: config) else { return nil }
        let next = steps(of: upgrade) + 1
        return next <= upgrade.maxSteps ? config.price(of: upgrade, step: next) : nil
    }

    /// Buys the next step if there is one and the money is there.
    @discardableResult
    public mutating func buy(_ upgrade: Upgrade, config: Config) -> Bool {
        guard let price = price(of: upgrade, config: config), money >= price else { return false }
        money -= price
        upgrades[upgrade.rawValue] = steps(of: upgrade) + 1
        return true
    }

    /// The config of the next shift: the roundabout as it is built, then its level, the
    /// upgrades and the duty.
    /// - Parameters:
    ///   - weather, event: force the sky and the city instead of drawing them (test window).
    public func config(from base: Config, seed: UInt64, weather: Weather? = nil, event: CityEvent? = nil) -> Config {
        var config = base
        config.armSlots = armSlots
        config.modules = modules
        // The level sets the traffic, the roundabout scales it, then the upgrades and the duty.
        config.sportsCarShare = owns("sportsCar") ? base.sportsCarShareOwned : 0
        let shift = config.forLevel(level, seed: seed).forArms().upgraded { steps(of: $0) }.forDuty(duty)
        // The sky and the city come last: they change the traffic the level has set (M8).
        return shift
            .forWeather(weather ?? shift.drawWeather(level: level, seed: seed))
            .forCityEvent(event ?? shift.drawCityEvent(level: level, seed: seed), seed: seed)
    }

    /// Buys a module and puts it in `slot`. A slot that is taken is swapped: the old module
    /// is gone, the new one is paid for in full.
    @discardableResult
    public mutating func build(_ module: RoadModule, inSlot slot: Int, config: Config) -> Bool {
        guard slot >= 0, slot < config.moduleSlotCount else { return false }
        let price = config.price(of: module)
        guard money >= price else { return false }
        money -= price
        modules[slot] = module
        return true
    }

    /// Takes a module out again. Nothing is paid back: it is torn down, not sold.
    public mutating func removeModule(inSlot slot: Int) {
        modules[slot] = nil
    }

    /// Price of the next arm, or nil once the ring is full.
    public func armPrice(config: Config) -> Int? {
        config.armPrice(built: armSlots)
    }

    /// Builds an arm in `slot` if it fits and the money is there.
    @discardableResult
    public mutating func buildArm(inSlot slot: Int, config: Config) -> Bool {
        guard config.canBuildArm(inSlot: slot, built: armSlots), let price = armPrice(config: config), money >= price else { return false }
        money -= price
        armSlots = (armSlots + [slot]).sorted()
        return true
    }

    /// Books a finished shift played at `level`: its money whatever the outcome (it was
    /// paid out already), and a level up if it was completed. A lost shift is played
    /// again at the same level.
    public mutating func record(_ result: ShiftResult, playedAt level: Int) {
        // Costs come off the shift's earnings, then off the account, never below 0 (M7).
        money = max(0, money + result.money)
        if result.outcome == .completed {
            self.level = max(1, level) + 1
        }
    }
}
