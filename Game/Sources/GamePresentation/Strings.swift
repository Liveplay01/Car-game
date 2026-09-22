import Foundation

/// Every text the game shows. English only, one source for test window and app.
public enum Strings {
    public static let windowTitle = "Car Game – Test Window"
    /// Working title until the game has a name.
    public static let gameTitle = "Car Game"

    public enum Menu {
        public static let startShift = "Start shift"
        public static let settings = "Settings"
        public static let resume = "Resume"
        public static let restart = "Restart"
        public static let menu = "Menu"
        public static let back = "Back"
        public static let paused = "Paused"
        public static let noHighscore = "No highscore yet"
        public static let tagline = "Tap to send the front car into the roundabout."

        public static func highscore(_ score: String) -> String { "Highscore \(score)" }
        /// Highscore and banked money on the start screen.
        public static func status(highscore: String?, money: String?) -> String {
            let score = highscore.map(Self.highscore) ?? noHighscore
            return money.map { "\(score) · \($0) money" } ?? score
        }
        public static func pausedStatus(score: String, cars: Int) -> String { "\(score) points · \(HUD.cars(cars)) left" }
    }

    /// The banner at the end of a shift.
    public enum Result {
        public static let gameOver = "GAME OVER"
        public static let escaped = "ESCAPED"
        public static let shiftComplete = "SHIFT COMPLETE"
        public static let newHighscore = "New highscore"
        public static let tapToContinue = "Tap to play again"

        public static func best(_ score: String) -> String { "Best \(score)" }
        public static func stats(combo: String, tightFits: String, busted: Int, transporters: Int, money: String, time: String) -> String {
            let base = "\(time) · best combo \(combo) · \(tightFits) tight fits · \(busted) busted"
            let extra = transporters > 0 ? " · \(transporters) paid · \(money) money" : ""
            return base + extra
        }
        /// Test window only.
        public static func keys(seed: UInt64) -> String { "Seed \(seed) · Esc menu" }
    }

    public enum SettingsMenu {
        public static let title = "Settings"
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
            "R  restart    F1  debug    F2  slow motion    T  reload tuning.json",
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
