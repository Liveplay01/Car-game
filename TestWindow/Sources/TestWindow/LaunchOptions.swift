import GameCore
import GamePresentation

/// Start parameters.
///
///     --seed 42            every shift uses this seed: repeat a shift exactly
///     --time-scale 0.5     slow everything down
///     --play               start a shift right away
///     --level 8            jump to this level (saved, like any level up)
///     --tab upgrades       open a tab: streetBuilder, game, shop, upgrades
///     --duty high          play on high alert (saved, like pressing H)
///     --debug              start with the debug overlay (F1)
///     --autotap 0.9        tap every 0.9 s (input simulation for demos and visual checks; implies --play)
///     --size 375x667       open at this window size instead of fitting the monitor
///     --screenshot x.png   save a screenshot after --at seconds (default 3) and quit
///     --at-crash 0.2       instead: save it this long after the first crash (visual checks of the effects)
struct LaunchOptions {
    var seed: UInt64?
    var timeScale = 1.0
    var startsShift = false
    var level: Int?
    var tab: Tab?
    var duty: Duty?
    var startWithDebug = false
    var autotapInterval: Double?
    var size: (width: Int, height: Int)?
    var screenshotFile: String?
    var screenshotAt = 3.0
    var screenshotAfterCrash: Double?

    init(arguments: [String]) {
        var index = 1
        func value() -> String? {
            index + 1 < arguments.count ? arguments[index + 1] : nil
        }
        func positive(_ text: String?) -> Double? {
            text.flatMap(Double.init).flatMap { $0 > 0 ? $0 : nil }
        }

        while index < arguments.count {
            let argument = arguments[index]
            var consumed = 1
            switch argument {
            case "--seed":
                if let seed = value().flatMap({ UInt64($0) }) {
                    self.seed = seed
                    consumed = 2
                } else {
                    print("--seed needs a whole number, e.g. --seed 42")
                }
            case "--time-scale":
                if let scale = positive(value()) {
                    timeScale = scale
                    consumed = 2
                } else {
                    print("--time-scale needs a positive number, e.g. --time-scale 0.5")
                }
            case "--play":
                startsShift = true
            case "--duty":
                switch value() {
                case "high", "highAlert", "alert": duty = .highAlert; consumed = 2
                case "normal": duty = .normal; consumed = 2
                default: print("--duty needs normal or high")
                }
            case "--tab":
                if let tab = value().flatMap({ Tab(rawValue: $0) }) {
                    self.tab = tab
                    consumed = 2
                } else {
                    print("--tab needs one of: " + Tab.allCases.map(\.rawValue).joined(separator: ", "))
                }
            case "--level":
                if let level = value().flatMap({ Int($0) }), level >= 1 {
                    self.level = level
                    consumed = 2
                } else {
                    print("--level needs a whole number from 1, e.g. --level 8")
                }
            case "--debug":
                startWithDebug = true
            case "--autotap":
                if let interval = positive(value()) {
                    autotapInterval = interval
                    startsShift = true
                    consumed = 2
                } else {
                    print("--autotap needs a positive number of seconds")
                }
            case "--size":
                let parts = (value() ?? "").lowercased().split(separator: "x").compactMap { Int($0) }
                if parts.count == 2, parts[0] > 200, parts[1] > 200 {
                    size = (parts[0], parts[1])
                    consumed = 2
                } else {
                    print("--size needs width x height, e.g. --size 375x667")
                }
            case "--screenshot":
                if let file = value() {
                    screenshotFile = file
                    consumed = 2
                }
            case "--at":
                if let seconds = positive(value()) {
                    screenshotAt = seconds
                    consumed = 2
                }
            case "--at-crash":
                if let seconds = value().flatMap(Double.init), seconds >= 0 {
                    screenshotAfterCrash = seconds
                    consumed = 2
                }
            default:
                print("Unknown option \(argument)")
            }
            index += consumed
        }
    }
}
