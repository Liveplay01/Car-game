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
        public static let done = "Done"
    }

    /// The Game tab between shifts: no menu, one tap starts.
    /// The first shift's hints (`Tutorial`): short, so they read at a glance while playing.
    public enum Tutorial {
        public static let sendCar = "Tap to send your first car"
        public static let findGap = "Wait for a gap, then tap"
        public static let combo = "Clean merges build your combo"
        public static let strikes = "3 crashes end the shift"
    }

    public enum Ready {
        public static let tapToStart = "Tap to start"

        /// The duty of the next shift and what it is worth, under the cars in the top bar.
        public static func dutyCaption(_ duty: Duty, pay: Double) -> String {
            switch duty {
            case .normal: "NORMAL DUTY"
            case .highAlert: "HIGH ALERT · \(Strings.multiplier(pay)) PAY"
            }
        }
        /// Test window only.
        public static let keys = "Esc settings · Tab next page · H high alert"

        /// "DAILY SHIFT · Heavy Rain · Roadworks"; nil on a clear day without anything (M8, v1.2).
        public static func conditions(weather: Weather, event: CityEvent?, daily: Bool = false, dailyOpen: Bool = false) -> String? {
            let parts = [
                daily ? Daily.title : nil,
                weather == .clear ? nil : Strings.weather(weather),
                event.map(Strings.cityEvent),
                !daily && dailyOpen ? Daily.ready : nil,
            ].compactMap { $0 }
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
        public static let pickOne = "Tap a part to see what it does · tap a built one to tear it down."
        public static let dragHint = "Drag it onto a free slot on the ring."
        public static let buildHint = "Double-tap the part to build it · one tap takes it away."
        /// A built part was tapped once (Leo, 25.09.2026).
        public static let tapAgainToRemove = "Tap again to tear it down · nothing is paid back"
        public static func keepsArms(_ count: Int) -> String { "A roundabout keeps at least \(count) arms" }
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
                return "Every lorry pays \(Strings.money(String(config.tollPerTruck))) here, in the first \(Int(config.moduleEarningSeconds)) s of a shift. Traffic slows down around it, and so do your police cars."
            case .speedCamera:
                return "Fines every car over the limit \(Strings.money(String(config.cameraFine))) in the first \(Int(config.moduleEarningSeconds)) s of a shift: nothing in a calm shift, a lot in rush hour. Everyone brakes hard at it."
            case .towDepot:
                return "Wrecks near it are towed away \(Upgrades.percent(config.towSpeedup)) faster, so the ring flows again sooner."
            }
        }
    }

    /// Money inside a sentence: the note, then the amount. The renderers draw the note where
    /// `Icons.moneyMark` stands, so the word "cash" never shows (Leo, 25.09.2026).
    public static func money(_ formatted: String) -> String { "\(Icons.moneyMark)\(formatted)" }

    /// The Shop tab (M10): chests, their odds, the collection.
    public enum Shop {
        public static let open = "Open"
        public static let wear = "Wear"
        public static let takeOff = "Take off"
        public static let worn = "On"
        public static let unlocked = "Unlocked"
        public static let locked = "?"
        /// Where a chest comes from, when none is waiting.
        public static func source(_ kind: ChestKind) -> String {
            switch kind {
            case .standard: "For sale · or watch an ad"
            case .premium: "For sale · or by hard masteries"
            case .event: "City events · Daily Shift"
            case .criminalHunt: "Earned by catching criminals"
            }
        }
        /// The Event Chest's own line in the detail panel.
        public static let seasonHint = "Holds this season's item half the time, until you have it."
        public static let pickItem = "Tap an item to see it."
        public static let lockedHint = "Not found yet: it comes out of chests."
        /// Where a locked item comes from: chests, the Daily streak or its season.
        public static func lockedHint(for item: Cosmetic) -> String {
            switch item.source {
            case .chest: lockedHint
            case let .streak(days): "Play the Daily Shift \(days) days in a row."
            case let .season(season): "Only in Event Chests during \(season.rawValue)."
            }
        }
        public static let tapToClose = "Tap to close"
        public static let watchAdShort = "Watch ad"
        public static let adHint = "Watch a short ad for a free Standard chest."
        public static let adReward = "Ad watched · Standard chest added"
        public static let noAdsLeft = "No more ad chests today. Back tomorrow."
        public static let adNotReady = "No ad ready yet, or it was closed early. Try again in a moment."
        public static let adPlaceholder = "Ad"
        public static func adCountdown(_ seconds: Int) -> String { "Your chest in \(seconds) s" }
        public static func watchAd(_ left: Int) -> String { "Watch ad · \(left) left" }
        public static func skinsOn(_ count: Int, of max: Int) -> String { "\(count) of \(max) car skins on · they mix on the road" }
        public static func skinsFull(_ max: Int) -> String { "\(max) car skins are on. Take one off first." }

        public static func section(_ section: ShopPage.Section) -> String {
            switch section {
            case .chests: "Chests"
            case .collection: "Collection"
            case .today: "Today"
            }
        }

        /// On an item the player has not looked at yet.
        public static let newBadge = "NEW"
        /// The collection's shelves; short, six fit across a phone.
        public static func shelf(_ shelf: ShopPage.Shelf) -> String {
            switch shelf {
            case .common: "Common"
            case .rare: "Rare"
            case .epic: "Epic"
            case .legendary: "Legend"
            case .maps: "Maps"
            case .special: "Special"
            }
        }

        public static func waiting(_ count: Int) -> String { count == 1 ? "1 waiting" : "\(count) waiting" }
        public static func buy(_ price: String) -> String { "Buy · \(price)" }
        public static func pity(_ chests: Int) -> String { "Epic or better within \(chests) chests. Duplicates pay out \(Icons.moneyMark)." }
        public static func duplicate(_ money: String) -> String { "Duplicate · +\(Strings.money(money))" }

        public static func ownedHint(_ item: Cosmetic) -> String {
            switch item.kind {
            case .carSkin: "Paints the cars on the road. Mix up to five. Only looks, never a bonus."
            case .mapSkin: "Turns the city into its own place. Only looks, never a bonus."
            case .vehicleType: "Shows up in your queue now and then: \(trait(item.id))."
            }
        }

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
            case "pearl": "Pearl"
            case "olive": "Olive"
            case "coral": "Coral"
            case "sunset": "Sunset"
            case "ice": "Ice"
            case "rose": "Rose"
            case "lime": "Lime"
            case "copper": "Copper"
            case "redStripe": "Red Stripe"
            case "carbon": "Carbon"
            case "blackGold": "Black & Gold"
            case "nightMint": "Night Mint"
            case "tiger": "Tiger"
            case "gold": "Gold"
            case "royal": "Royal"
            case "lagoon": "Lagoon"
            case "dusk": "Dusk"
            case "sand": "Sand"
            case "neon": "Neon"
            case "forest": "Forest"
            case "autumn": "Autumn"
            case "sakura": "Sakura"
            case "aurora": "Aurora"
            case "ember": "Ember"
            case "pearlShine": "Pearl Shine"
            case "chrome": "Chrome"
            case "starlight": "Starlight"
            case "diamond": "Diamond"
            case "holo": "Holo"
            case "sportsCar": "Sports Car"
            case "streakBronze": "Bronze Badge"
            case "streakSilver": "Silver Badge"
            case "streakGold": "Gold Laurel"
            case "frost": "Frost"
            case "blossom": "Blossom"
            case "sunburst": "Sunburst"
            case "pumpkin": "Pumpkin"
            case "lemon": "Lemon"
            case "plum": "Plum"
            case "fern": "Fern"
            case "latte": "Latte"
            case "teal": "Teal"
            case "sky": "Sky Top"
            case "cherry": "Cherry Top"
            case "mocha": "Mocha Cream"
            case "panda": "Panda"
            case "hanami": "Hanami"
            case "volcano": "Volcano"
            case "ocean": "Ocean"
            case "koi": "Koi"
            case "obsidian": "Obsidian"
            case "ruby": "Ruby"
            case "meadow": "Meadow"
            case "tropic": "Tropic"
            case "snowfall": "Snowfall"
            case "cosmos": "Cosmos"
            case "compact": "Compact"
            case "van": "Van"
            default: id
            }
        }

        /// What a vehicle type does differently: fair, not better.
        public static func trait(_ id: String) -> String {
            switch id {
            case "compact": "tiny, light, slower to merge"
            case "van": "long, heavy, merges quicker"
            default: "shorter, lighter, merges quicker"
            }
        }

        /// "Rare car skin".
        public static func kind(_ item: Cosmetic) -> String {
            let kind = switch item.kind {
            case .carSkin: "car skin"
            case .mapSkin: "map skin"
            case .vehicleType: "vehicle type · " + trait(item.id)
            }
            return "\(rarity(item.rarity)) \(kind)"
        }

        /// "EPIC · Carbon" or "Duplicate: Mint · +[note]250".
        public static func opened(_ opening: ChestOpening) -> String {
            let name = item(opening.item.id)
            if opening.isDuplicate { return "Duplicate: \(name) · +\(money(String(opening.money)))" }
            return "\(rarity(opening.item.rarity).uppercased()) · \(name)"
        }
    }

    /// Daily Shift, Challenges and the Perfect Run (v1.2).
    public enum Daily {
        public static let title = "DAILY SHIFT"
        public static let ready = "Daily Shift ready"
        public static let doneToday = "Today's Daily Shift is done. New one tomorrow."
        public static let perfectRun = "PERFECT RUN"
        /// "Welcome back · your toll booths earned +[note]1,200".
        public static func welcomeBack(_ money: String) -> String { "Welcome back · your toll booths earned +\(Strings.money(money))" }
        public static let done = "Done"
        public static let challengesTitle = "Today's challenge"
        public static let readyHint = "Your first shift of the day. One try, the same shift for everyone."
        public static let todayHint = "Challenges pay once each and change at midnight."
        public static func doneHint(streak: Int) -> String {
            streak > 1 ? "Done · \(streak) days in a row · back tomorrow" : "Done · back tomorrow"
        }

        /// "DAILY SHIFT DONE · +[note]1,500 · 3 days in a row · CHEST EARNED".
        public static func dailyDone(_ money: String, streak: Int) -> String {
            let days = streak > 1 ? " · \(streak) days in a row" : ""
            return "DAILY SHIFT DONE · +\(Strings.money(money))\(days) · EVENT CHEST"
        }

        // The Daily Shift is the first shift of the day (Leo, 25.09.2026): a splash says so.
        public static func splashLine(event: CityEvent) -> String { "Today's city: \(Strings.cityEvent(event)) · one try" }
        public static func streakLine(_ streak: Int) -> String {
            streak > 0 ? "\(streak) \(streak == 1 ? "day" : "days") in a row · keep it going" : "Play it every day for a streak"
        }
        /// "4 more days for Bronze Badge".
        public static func nextMilestone(left: Int, item: String) -> String {
            "\(left) more \(left == 1 ? "day" : "days") for \(Shop.item(item))"
        }
        /// "7 DAYS IN A ROW · Bronze Badge unlocked".
        public static func milestone(days: Int, item: String) -> String { "\(days) DAYS IN A ROW · \(Shop.item(item)) unlocked" }
        public static let eventChestFound = "EVENT CHEST FOUND"

        public static func challenge(_ challenge: Challenge) -> String {
            switch challenge {
            case .perfectInputs: "3 Perfect Inputs in one shift"
            case .tightFits: "3 Tight Fits in one shift"
            case .twoTakedowns: "2 takedowns in one shift"
            case .twoTransporters: "2 transporters paid in one shift"
            case .longChain: "A Perfect Chain of 8"
            case .bigCombo: "A combo of 15"
            case .highAlertShift: "Finish a shift on High Alert"
            case .perfectRun: "A Perfect Run: no crash, no cut-off"
            }
        }

        public static func challengeDone(_ challenge: Challenge, reward: String) -> String {
            "CHALLENGE · \(Self.challenge(challenge)) · +\(Strings.money(reward))"
        }
    }

    /// Albums (Leo, 25.09.2026): full sets pay once and frame the roundabout.
    public enum Albums {
        public static func name(_ album: Album) -> String {
            switch album {
            case .maps: "Maps"
            case .commons: "Commons"
            case .rares: "Rares"
            case .epics: "Epics"
            case .legends: "Legends"
            case .seasons: "Seasons"
            case .loyalty: "Loyalty"
            }
        }
        /// "ALBUM COMPLETE · Maps · +[note]10,000 · new frame".
        public static func complete(_ album: Album, reward: String) -> String {
            "ALBUM COMPLETE · \(name(album)) · +\(Strings.money(reward)) · new frame"
        }
        /// "Albums · Maps 5/8 · Commons 6/6".
        public static func progress(_ entries: [(album: Album, owned: Int, total: Int)]) -> String {
            "Albums · " + entries.map { "\(name($0.album)) \($0.owned)/\($0.total)" }.joined(separator: " · ")
        }
    }

    /// The race against the best time at this level (Leo: Rekord-Geist).
    public enum Race {
        public static let best = "BEST"
        /// "−1.2 s" ahead, "+0.8 s" behind.
        public static func delta(_ seconds: Double) -> String {
            (seconds <= 0 ? "−" : "+") + String(format: "%.1f s", abs(seconds))
        }
        public static let newBest = "NEW BEST TIME"

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
        public static let keys = "Esc menu"
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
        /// Over the score, like "BEST" over the race on the other side.
        public static let scoreLabel = "SCORE"
        /// Captions of the top bar's columns (`TopBar`).
        public static let levelLabel = "LEVEL"
        public static let highAlertLabel = "HIGH ALERT"
        public static let carsLabel = "CARS"
        public static let bestLabel = "BEST"
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
            case .car, .truck, .sportsCar, .compact, .van: nil
            }
        }
        /// An insured crash: nothing to pay.
        public static let covered = "COVERED"
        /// "PAID +2,500".
        public static func paid(_ amount: String) -> String { "PAID \(amount)" }

        public static func combo(_ value: Int) -> String { "COMBO \(value)" }
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

        public static let settingsHint = "1–4 or click  change    Esc / Enter  done"

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
        public static func notEnoughMoney(_ price: String) -> String { "Not enough \(Icons.moneyMark) · \(Strings.money(price)) needed" }
        /// "New arm built · 5 arms".
        public static func built(_ name: String, arms: Int) -> String { "\(name) built · \(arms) arms" }
        /// "Tow Depot built on the ring".
        public static func placed(_ name: String) -> String { "\(name) built on the ring" }
        /// "Toll Booth torn down".
        public static func removed(_ name: String) -> String { "\(name) torn down" }
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
