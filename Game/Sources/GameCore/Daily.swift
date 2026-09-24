/// Motivation (IDEA.md; ROADMAP.md, v1.2): the Daily Shift, daily Challenges and the
/// Perfect Run. Days are plain numbers (days since 1970 in local time); the platform
/// says which day it is, so the core stays free of clocks and time zones.

/// Three small goals a day, the same for everyone on that day. Each pays once.
public enum Challenge: String, Sendable, Equatable, CaseIterable, Codable {
    case perfectInputs
    case tightFits
    case twoTakedowns
    case twoTransporters
    case longChain
    case bigCombo
    case highAlertShift
    case perfectRun

    /// Whether one finished shift meets it.
    public func isMet(by result: ShiftResult, duty: Duty) -> Bool {
        switch self {
        case .perfectInputs: result.perfects >= 3
        case .tightFits: result.tightFits >= 3
        case .twoTakedowns: result.takedowns >= 2
        case .twoTransporters: result.transporters >= 2
        case .longChain: result.bestChain >= 8
        case .bigCombo: result.bestCombo >= 15
        case .highAlertShift: duty == .highAlert && result.outcome == .completed
        case .perfectRun: result.isPerfectRun
        }
    }

    /// Money it pays.
    public var reward: Int {
        switch self {
        case .perfectInputs, .tightFits, .bigCombo: 400
        case .twoTakedowns, .twoTransporters, .longChain: 600
        case .highAlertShift, .perfectRun: 800
        }
    }

    /// The three challenges of `day`, drawn from the day alone.
    public static func of(day: Int) -> [Challenge] {
        var random = SeededRandom(seed: UInt64(bitPattern: Int64(day)) &* 0x9E37_79B9_7F4A_7C15 ^ 0xC4A1_1E26_E500_0001)
        var pool = allCases
        var picked: [Challenge] = []
        while picked.count < 3, !pool.isEmpty {
            picked.append(pool.remove(at: random.int(in: 0...(pool.count - 1))))
        }
        return picked
    }
}

extension Career {
    /// The Daily Shift of `day`: a seed everyone gets that day, and always a city event.
    public static func dailySeed(day: Int) -> UInt64 {
        UInt64(bitPattern: Int64(day)) &* 0xD1B5_4A32_D192_ED03 ^ 0xDA11_5A1F_7000_0001
    }

    public static func dailyEvent(day: Int) -> CityEvent {
        CityEvent.allCases[((day % CityEvent.allCases.count) + CityEvent.allCases.count) % CityEvent.allCases.count]
    }

    /// Whether today's Daily Shift is still to be done.
    public func isDailyOpen(day: Int) -> Bool { dailyDone != day }

    /// A completed Daily Shift: a Standard chest and money, more for every day in a row
    /// (up to a week). Returns the money, or nil if it was done already.
    @discardableResult
    public mutating func completeDaily(day: Int, config: Config) -> Int? {
        guard isDailyOpen(day: day) else { return nil }
        dailyStreak = dailyDone == day - 1 ? dailyStreak + 1 : 1
        dailyDone = day
        let money = config.dailyPay * min(dailyStreak, 7)
        self.money += money
        chests.append(.standard)
        return money
    }

    /// Books a shift against the day's challenges; pays each that is met for the first
    /// time that day. Returns the ones just completed.
    @discardableResult
    public mutating func recordChallenges(_ result: ShiftResult, duty: Duty, day: Int) -> [Challenge] {
        if challengeDay != day {
            challengeDay = day
            challengesDone = []
        }
        var completed: [Challenge] = []
        for challenge in Challenge.of(day: day) where !challengesDone.contains(challenge.rawValue) {
            guard challenge.isMet(by: result, duty: duty) else { continue }
            challengesDone.append(challenge.rawValue)
            money += challenge.reward
            completed.append(challenge)
        }
        return completed
    }

    /// Whether a challenge of `day` is done.
    public func isDone(_ challenge: Challenge, day: Int) -> Bool {
        challengeDay == day && challengesDone.contains(challenge.rawValue)
    }
}
