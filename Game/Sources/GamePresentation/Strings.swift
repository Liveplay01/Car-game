import Foundation
import GameCore

/// Every text the game shows. English only, one source for test window and app.
public enum Strings {
    public static let windowTitle = "Car Game – Test Window"
    /// Working title until the game has a name.
    public static let gameTitle = "Car Game"

    public enum Menu {
        public static let restart = "Restart"
        public static let back = "Back"
    }

    /// The Game tab between shifts: no menu, one tap starts.
    public enum Ready {
        public static let tapToStart = "Tap to start"

        /// The duty of the next shift, and what it is worth.
        public static func duty(_ duty: Duty, pay: Double) -> String {
            switch duty {
            case .normal: "Normal duty"
            case .highAlert: "High alert · \(Strings.multiplier(pay)) pay"
            }
        }
        public static let noHighscore = "No highscore yet"

        public static func highscore(_ score: String) -> String { "Highscore \(score)" }
        /// Highscore and banked money.
        public static func status(highscore: String?, money: String?) -> String {
            let score = highscore.map(Self.highscore) ?? noHighscore
            return money.map { "\(score) · \(Strings.money($0))" } ?? score
        }
        /// Test window only.
        public static let keys = "Esc settings · Tab next page · H high alert"

        /// "Heavy Rain · Roadworks"; nil on a clear day without an event (M8).
        public static func conditions(weather: Weather, event: CityEvent?) -> String? {
            let parts = [weather == .clear ? nil : Strings.weather(weather), event.map(Strings.cityEvent)].compactMap { $0 }
            return parts.isEmpty ? nil : parts.joined(separator: " · ")
        }
    }

    /// The tab bar.
    public enum Tabs {
        public static func title(_ tab: Tab) -> String {
            switch tab {
            case .streetBuilder: "Street Builder"
            case .game: "Game"
            case .shop: "Shop"
            case .upgrades: "Upgrades"
            }
        }
    }

    /// Pages that are still to come.
    public enum Pages {
        public static let shopLater = "Skins and chests come later."

    }

    /// The Street Builder tab.
    public enum Builder {
        public static let title = "Street Builder"
        public static let ringFull = "Ring full"
        public static let drag = "Drag onto the ring"
        public static let pickOne = "Tap a part to see what it does."
        public static let dragHint = "Drag it onto a free slot on the ring."
        public static let buildHint = "Double-tap the part to build it · one tap takes it away."
        /// Test window only.
        public static let keys = "Drag with the mouse · double-click builds"

        public static func name(_ part: StreetBuilderPage.Part) -> String {
            switch part {
            case .arm: "New arm"
            case .tollBooth: "Toll Booth"
            case .speedCamera: "Speed Camera"
            case .towDepot: "Tow Depot"
            }
        }

        /// What the part does, with the numbers from the config.
        public static func explanation(_ part: StreetBuilderPage.Part, config: Config) -> String {
            switch part {
            case .arm:
                let traffic = Upgrades.percent(config.trafficPerArm)
                let pay = Upgrades.percent(config.payPerArm)
                return "A wider ring with one more way in and out: \(traffic) more traffic, transporters more often, and \(pay) more pay per shift."
            case .tollBooth:
                return "Every lorry pays \(config.tollPerTruck) cash here. Traffic slows down around it, and so do your police cars."
            case .speedCamera:
                return "Fines every car over the limit: nothing in a calm shift, a lot in rush hour. Everyone brakes hard at it."
            case .towDepot:
                return "Wrecks near it are towed away \(Upgrades.percent(config.towSpeedup)) faster, so the ring flows again sooner."
            }
        }
    }

    /// Money inside a sentence, where no note can be drawn: "2,000 cash". Standalone values
    /// (balances, prices) carry the note icon instead (`Icons.moneyTag`).
    public static func money(_ formatted: String) -> String { "\(formatted) cash" }

    /// The Shop tab (M10): chests, their odds, the collection.
    public enum Shop {
        public static let open = "Open"
        public static let wear = "Wear"
        public static let worn = "On"
        public static let unlocked = "Unlocked"

        public static func subtitle(chests: Int, owned: Int, pity: Int) -> String {
            if chests == 0 && owned == 0 { return "Master the game to earn chests: perfect merges, takedowns, long chains." }
            let waiting = chests == 1 ? "1 chest waiting" : "\(chests) chests waiting"
            return "\(waiting) · \(owned) collected · Epic or better within \(pity) chests"
        }

        public static func chest(_ kind: ChestKind) -> String {
            switch kind {
            case .standard: "Standard Chest"
            case .premium: "Premium Chest"
            case .event: "Event Chest"
            case .criminalHunt: "Criminal Hunt Chest"
            }
        }

        /// "Common 70 % · Rare 22 % · Epic 7 % · Legendary 1 %": the odds are always public.
        public static func odds(_ odds: [Double]) -> String {
            zip(Rarity.allCases, odds).map { "\(rarity($0)) \(Upgrades.percent($1))" }.joined(separator: " · ")
        }

        public static func rarity(_ rarity: Rarity) -> String {
            switch rarity {
            case .common: "Common"
            case .rare: "Rare"
            case .epic: "Epic"
            case .legendary: "Legendary"
            }
        }

        public static func item(_ id: String) -> String {
            switch id {
            case "racingRed": "Racing Red"
            case "midnight": "Midnight"
            case "mint": "Mint"
            case "dusk": "Dusk"
            case "sunset": "Sunset"
            case "ice": "Ice"
            case "neon": "Neon"
            case "carbon": "Carbon"
            case "autumn": "Autumn"
            case "sportsCar": "Sports Car"
            case "gold": "Gold"
            case "aurora": "Aurora"
            default: id
            }
        }

        /// "Rare car skin".
        public static func kind(_ item: Cosmetic) -> String {
            let kind = switch item.kind {
            case .carSkin: "car skin"
            case .mapSkin: "map skin"
            case .vehicleType: "vehicle type · shorter, lighter, merges quicker"
            }
            return "\(rarity(item.rarity)) \(kind)"
        }

        /// "EPIC · Carbon" or "Duplicate: Mint · +250 cash".
        public static func opened(_ opening: ChestOpening) -> String {
            let name = item(opening.item.id)
            if opening.isDuplicate { return "Duplicate: \(name) · +\(money(String(opening.money)))" }
            return "\(rarity(opening.item.rarity).uppercased()) · \(name)"
        }
    }

    /// Mastery toasts (M10): short, no screen of their own.
    public enum Mastery {
        public static func name(_ goal: MasteryGoal) -> String {
            switch goal {
            case .perfectTiming: "Perfect Timing"
            case .tightSpots: "Tight Spots"
            case .closeCalls: "Close Calls"
            case .longChain: "Long Chain"
            case .crimeFighter: "Crime Fighter"
            case .secureRoute: "Secure Route"
            case .comboMaster: "Combo Master"
            case .veteran: "Veteran"
            case .highAlertHero: "High Alert Hero"
            }
        }

        /// "MASTERY COMPLETE · Perfect Timing II · CHEST EARNED".
        public static func toast(_ completed: [MasteryCompletion]) -> String {
            let names = completed.map { "\(name($0.goal)) \(String(repeating: "I", count: $0.tier + 1))" }
            let chests = completed.count == 1 ? "CHEST EARNED" : "\(completed.count) CHESTS EARNED"
            return "MASTERY COMPLETE · \(names.joined(separator: ", ")) · \(chests)"
        }
    }

    public static func weather(_ weather: Weather) -> String {
        switch weather {
        case .clear: "Clear"
        case .lightRain: "Light Rain"
        case .heavyRain: "Heavy Rain"
        case .storm: "Storm"
        case .extreme: "Extreme Weather"
        }
    }

    public static func cityEvent(_ event: CityEvent) -> String {
        switch event {
        case .roadworks: "Roadworks"
        case .roadClosure: "Road Closure"
        case .concert: "Concert Traffic"
        case .vipConvoy: "VIP Convoy"
        case .policeOperation: "Police Operation"
        }
    }

    /// The Upgrades tab.
    public enum Upgrades {
        public static let title = "Upgrades"
        public static let maxed = "Max"

        /// The balance is drawn with the note beside it, so the number stands on its own.
        public static func balance(_ money: String) -> String { money }
        /// "2/10" under a card.
        public static func steps(_ steps: Int, of maxSteps: Int) -> String { "\(steps)/\(maxSteps)" }
        public static let pickOne = "Tap an upgrade to see what it does."
        public static let buyHint = "Double-tap to buy."
        /// Test window only.
        public static let buyHintKeys = "Double-click or Enter to buy."
        public static let keys = "1–8 pick · double-click buys"
        public static let everyStepBought = "Every step bought."
        /// "1,200 short".
        public static func missing(_ money: String) -> String { "\(money) short" }
        /// "2/4 · 1,600": steps bought, and the price of the next one.
        public static func next(steps: Int, of maxSteps: Int, price: String) -> String { "\(steps)/\(maxSteps) · \(price)" }

        public static func name(_ upgrade: Upgrade) -> String {
            switch upgrade {
            case .morePatrols: "More Patrols"
            case .longerPursuit: "Longer Pursuit"
            case .quietStreets: "Quiet Streets"
            case .interceptor: "Interceptor"
            case .dispatchRadio: "Dispatch Radio"
            case .backup: "Backup"
            case .cashRoute: "Cash Route"
            case .overtime: "Overtime"
            case .freight: "Freight"
            case .doubleRun: "Double Run"
            case .insurance: "Insurance"
            case .robberyInsurance: "Robbery Insurance"
            }
        }

        /// What the upgrade is good for, in plain words.
        public static func explanation(_ upgrade: Upgrade) -> String {
            switch upgrade {
            case .morePatrols: "More police cars wait in your queue, so one is ready when a criminal shows up."
            case .longerPursuit: "Criminals take longer to get away, which leaves you more time to catch them."
            case .quietStreets: "Some shifts come with no criminal at all."
            case .interceptor: "A police car right behind a criminal runs it down faster."
            case .dispatchRadio: "Calling a police car to the front of the queue costs less of your combo."
            case .backup: "Your shift survives one police car crash more."
            case .cashRoute: "Money transporters show up sooner and more often."
            case .overtime: "Every shift you finish pays more."
            case .freight: "More lorries on the road: more tolls, but denser traffic."
            case .doubleRun: "Sometimes a second money transporter follows right after the first."
            case .insurance: "Pays part of what a crash costs you."
            case .robberyInsurance: "Pays part of what an escaped criminal costs you."
            }
        }

        /// What the steps bought so far add up to, and what the next one adds.
        public static func stepEffect(_ upgrade: Upgrade, steps: Int, config: Config) -> String {
            let now = total(upgrade, steps: steps, config: config)
            guard steps < upgrade.maxSteps else { return "Now \(now)" }
            return "Now \(now) · next step \(total(upgrade, steps: steps + 1, config: config))"
        }

        /// The whole effect of `steps` steps, e.g. "+9 % police cars".
        static func total(_ upgrade: Upgrade, steps: Int, config: Config) -> String {
            let times = Double(steps)
            switch upgrade {
            case .morePatrols: return "+\(percent(times * config.patrolsPerStep)) police cars"
            case .longerPursuit: return "+\(seconds(times * config.pursuitPerStep)) pursuit"
            case .quietStreets: return "\(percent(times * config.quietStreetsPerStep)) fewer criminal shifts"
            case .interceptor: return "+\(percent(times * config.interceptorPerStep)) chase speed"
            case .dispatchRadio: return "+\(percent(times * config.dispatchRadioPerStep)) combo kept"
            case .backup: return "+\(steps * config.backupPerStep) police crashes"
            case .cashRoute: return "\(seconds(times * config.cashRoutePerStep)) sooner"
            case .overtime: return "+\(percent(times * config.overtimePerStep)) pay"
            case .freight: return "+\(percent(times * config.freightPerStep)) lorries"
            case .doubleRun: return "\(percent(times * config.doubleRunPerStep)) double runs"
            case .insurance: return coverage(times * config.insurancePerStep)
            case .robberyInsurance: return coverage(times * config.insurancePerStep)
            }
        }

        /// What one step does, with the numbers from the config.
        public static func detail(_ upgrade: Upgrade, config: Config) -> String {
            switch upgrade {
            case .morePatrols: "+\(percent(config.patrolsPerStep)) police cars in the queue"
            case .longerPursuit: "+\(seconds(config.pursuitPerStep)) before a criminal gets away"
            case .quietStreets: "Criminals in \(percent(config.quietStreetsPerStep)) fewer shifts"
            case .interceptor: "Police chase \(percent(config.interceptorPerStep)) faster"
            case .dispatchRadio: "Dispatch keeps \(percent(config.dispatchRadioPerStep)) more combo"
            case .backup: config.backupPerStep == 1 ? "One more police crash per shift" : "\(config.backupPerStep) more police crashes per shift"
            case .cashRoute: "Transporters come \(seconds(config.cashRoutePerStep)) sooner"
            case .overtime: "+\(percent(config.overtimePerStep)) pay per shift"
            case .freight: "+\(percent(config.freightPerStep)) lorries in the traffic"
            case .doubleRun: "+\(percent(config.doubleRunPerStep)) chance of a second transporter"
            case .insurance: "Covers \(percent(config.insurancePerStep)) more of crash costs"
            case .robberyInsurance: "Covers \(percent(config.insurancePerStep)) more of escape losses"
            }
        }

        /// "45 % covered", or "FULL COVERAGE" once nothing is left to pay.
        static func coverage(_ share: Double) -> String {
            share >= 1 ? Strings.Result.fullCoverage : "\(percent(share)) covered"
        }

        static func percent(_ share: Double) -> String { "\(Int((share * 100).rounded())) %" }
        static func seconds(_ value: Double) -> String {
            value == value.rounded() ? "\(Int(value)) s" : "\(value) s"
        }
    }

    /// The banner at the end of a shift.
    public enum Result {
        public static let gameOver = "GAME OVER"
        public static let escaped = "ESCAPED"
        /// "LEVEL 3 COMPLETE".
        public static func levelComplete(_ level: Int) -> String { "LEVEL \(level) COMPLETE" }
        public static let newHighscore = "New highscore"
        public static let fullCoverage = "FULL COVERAGE"
        /// "LOSS −$350" after an escape, "CRASH COST −$120" after a crash (level 20+).
        public static func loss(_ amount: String, escaped: Bool) -> String {
            (escaped ? "LOSS " : "CRASH COST ") + "−" + Strings.money(amount)
        }
        /// Everything was insured.
        public static func covered(_ amount: String) -> String {
            "\(fullCoverage) · \(Strings.money(amount)) paid by insurance"
        }
        /// After a completed shift: on to the next level.
        public static func nextLevel(_ level: Int) -> String { "Tap for level \(level)" }
        /// After a lost one: the same level again.
        public static func retryLevel(_ level: Int) -> String { "Tap to try level \(level) again" }

        public static func best(_ score: String) -> String { "Best \(score)" }
        /// `money` is nil when the shift earned none.
        public static func stats(combo: String, tightFits: String, busted: Int, transporters: Int, money: String?, time: String) -> String {
            let base = "\(time) · best combo \(combo) · \(tightFits) tight fits · \(busted) busted"
            let paid = transporters > 0 ? " · \(transporters) paid" : ""
            return base + paid + (money.map { " · +\(Strings.money($0))" } ?? "")
        }
        /// Test window only.
        public static func keys(seed: UInt64) -> String { "Seed \(seed) · Esc menu" }
    }

    public enum SettingsMenu {
        public static let title = "Settings"
        public static let vehicleLabels = "Vehicle labels"
        public static let sound = "Sound"
        public static let haptics = "Haptics"
        public static let reduceMotion = "Reduce Motion"
        public static let on = "On"
        public static let off = "Off"
        public static let system = "System"

        public static func toggle(_ isOn: Bool) -> String { isOn ? on : off }
        public static func reduceMotion(_ value: ReduceMotion) -> String {
            switch value {
            case .system: system
            case .on: on
            case .off: off
            }
        }
    }

    public enum HUD {
        public static let rushHour = "RUSH HOUR"
        public static let tight = "TIGHT!"
        public static let cutOff = "CUT OFF"

        public static let wanted = "WANTED"
        public static let busted = "BUSTED!"
        public static let dispatch = "DISPATCH"
        public static let secured = "SECURED"
        public static let seized = "SEIZED"
        public static let lost = "LOST"
        /// Accessibility labels on special vehicles (M11); nil for ordinary traffic.
        public static func label(_ type: VehicleType) -> String? {
            switch type {
            case .police: "POLICE"
            case .pickup: "CRIMINAL"
            case .transporter: "SECURED"
            case .car, .truck, .sportsCar: nil
            }
        }
        /// An insured crash: nothing to pay.
        public static let covered = "COVERED"
        /// "PAID +2,500".
        public static func paid(_ amount: String) -> String { "PAID \(amount)" }

        public static func combo(_ value: Int) -> String { "COMBO \(value)" }
        public static func level(_ value: Int) -> String { "LEVEL \(value)" }
        /// "LEVEL 12 · HIGH ALERT" while the shift is played on high alert.
        public static func level(_ value: Int, duty: Duty) -> String {
            duty == .highAlert ? "\(level(value)) · HIGH ALERT" : level(value)
        }
        /// Cars still to send this shift: "12 cars", "1 car".
        public static func cars(_ count: Int) -> String { count == 1 ? "1 car" : "\(count) cars" }
        /// Seconds left on the chase, rounded up.
        public static func wanted(_ seconds: Double) -> String { "\(wanted) \(Int(max(0, seconds).rounded(.up)))" }
        public static func rushFactor(_ value: Double) -> String { "\(rushHour) \(multiplier(value))" }
    }

    /// Key hints. Only the test window shows them; the app has buttons and touch.
    public enum Keys {
        public static let enter = "Enter"
        public static let esc = "Esc"
        public static let dispatch = "E  dispatch"
        public static let controls = [
            "Space / click  send car    E / right-click  dispatch    Esc  pause",
            "Tab  next page    R  restart    F1  debug    F2  slow motion    T  tuning",
        ]

        public static func number(_ value: Int) -> String { String(value) }
    }

    /// Short messages at the bottom of the test window.
    public enum Notice {
        public static let tuningMissing = "tuning.json not found – wrote one with the current values"

        public static func tuningLoaded(values: Int, changes: Int) -> String {
            let changed = changes == 0 ? "same as Config.swift" : "\(changes) differ from Config.swift"
            return "tuning.json: \(values) values, \(changed)"
        }
        public static func tuningFailed(_ reason: String) -> String { "tuning.json not applied: \(reason)" }
        public static func unknownKeys(_ keys: [String]) -> String { "tuning.json: unknown \(keys.joined(separator: ", "))" }
        public static func notEnoughMoney(_ price: String) -> String { "Not enough cash: \(price) needed" }
        /// "New arm built · 5 arms".
        public static func built(_ name: String, arms: Int) -> String { "\(name) built · \(arms) arms" }
        /// "Tow Depot built on the ring".
        public static func placed(_ name: String) -> String { "\(name) built on the ring" }
        /// "More Patrols 2/4".
        public static func bought(_ name: String, steps: Int, of maxSteps: Int) -> String { "\(name) \(steps)/\(maxSteps)" }
    }

    /// Debug overlay (F1). Only in the test window.
    public enum Debug {
        public static let controls = "Space / click  send car    F2  slow motion    R  restart"
        public static let crash = "CRASH"

        public static func fps(_ value: Int) -> String { "FPS \(value)" }
        public static func seed(_ value: UInt64) -> String { "Seed \(value)" }
        public static func time(_ seconds: Double) -> String { "Time \(String(format: "%.1f", seconds)) s" }
        public static func timeScale(_ scale: Double) -> String { "Speed \(multiplier(scale))" }
        public static func cars(onRoad: Int, target: Int) -> String { "Cars \(onRoad) / \(target)" }
        public static func ringSpeed(_ value: Double) -> String { "Ring \(Int(value.rounded())) wu/s" }
        public static func tuning(changes: Int) -> String { "Tuning \(changes) changed" }
        public static func criminal(_ state: String) -> String { "Criminal \(state)" }
        public static func transporter(_ state: String) -> String { "Transporter \(state)" }
        public static func gap(_ seconds: Double) -> String {
            seconds.isFinite ? "\(String(format: "%.3f", seconds)) s" : "free"
        }
        public static func tight(_ seconds: Double) -> String { "TIGHT \(gap(seconds))" }
        public static func liveGap(now: Double, min: Double) -> String { "\(gap(now))  min \(gap(min))" }
    }

    /// "0.5×", "1×", "1.5×".
    public static func multiplier(_ value: Double) -> String {
        let text = value == value.rounded() ? String(Int(value)) : String(format: "%g", value)
        return "\(text)×"
    }

    /// "×1.5": the combo multiplier on the island.
    public static func comboMultiplier(_ value: Double) -> String {
        let text = value == value.rounded() ? String(Int(value)) : String(format: "%g", value)
        return "×\(text)"
    }
}

/// Numbers and times in the device's format (FOUNDATION.md 1.3): 1,000 or 1.000.
public struct TextFormat: Sendable, Equatable {
    public var groupingSeparator: String

    public init(groupingSeparator: String = ",") {
        self.groupingSeparator = groupingSeparator
    }

    /// The format of the device the game runs on.
    public static var current: TextFormat {
        TextFormat(groupingSeparator: Locale.current.groupingSeparator ?? ",")
    }

    /// "12,345".
    public func number(_ value: Int) -> String {
        var digits = String(value.magnitude)
        var index = digits.count - 3
        while index > 0 {
            digits.insert(contentsOf: groupingSeparator, at: digits.index(digits.startIndex, offsetBy: index))
            index -= 3
        }
        return value < 0 ? "−" + digits : digits
    }

    /// "+1,000", "−250".
    public func signed(_ value: Int) -> String {
        value > 0 ? "+" + number(value) : number(value)
    }

    /// How long a shift took, "18.4 s".
    public func seconds(_ seconds: Double) -> String {
        let tenths = Int((max(0, seconds) * 10).rounded())
        return "\(number(tenths / 10)).\(tenths % 10) s"
    }
}
