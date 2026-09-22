/// How a shift ended.
public enum ShiftOutcome: Sendable, Equatable {
    /// Every car brought into traffic: completion bonus and a highscore entry.
    case completed
    /// A normal car crashed (the last strike), or a police car once too often: points stay,
    /// but no bonus and no highscore (FOUNDATION.md 2.6).
    case struckOut
    /// A criminal got away: the shift is lost at once (hard fail, IDEA.md).
    case escaped
}

/// Progress of a shift (FOUNDATION.md 2.5). There is no clock: a shift is a number of cars
/// to bring into traffic, and it is done once the last one is in.
public struct ShiftState: Sendable, Equatable {
    public enum Phase: Sendable, Equatable {
        /// Cars left to send; density and tempo rise with time.
        case running
        /// The last `rushHourCars` cars: faster, denser, points ×2.
        case rushHour
        /// Every car is launched. Taps are ignored; the shift is done once the last merge
        /// is rated and no criminal is on the run any more.
        case closing
        case ended(ShiftOutcome)
    }

    public internal(set) var phase: Phase = .running
    /// Cars not yet launched, the queue included. Nil in free play: its queue never ends.
    public internal(set) var carsLeft: Int?
    /// Shift time at which rush hour began.
    public internal(set) var rushHourSince: Double?

    public var acceptsTaps: Bool {
        switch phase {
        case .running, .rushHour: true
        case .closing, .ended: false
        }
    }

    /// From the start of rush hour until the shift ends.
    public var isRushHour: Bool {
        rushHourSince != nil && outcome == nil
    }

    public var outcome: ShiftOutcome? {
        if case let .ended(outcome) = phase { return outcome }
        return nil
    }
}

/// Everything the result screen shows.
public struct ShiftResult: Sendable, Equatable {
    public var outcome: ShiftOutcome
    /// Final score, bonus included.
    public var score: Int
    public var completionBonus: Int
    public var bestCombo: Int
    public var cleanMerges: Int
    public var tightFits: Int
    public var cutOffs: Int
    public var crashes: Int
    public var policeCrashes: Int
    public var takedowns: Int
    public var transporters: Int
    /// Money earned this shift (paid transporters, none for seized ones).
    public var money: Int
    public var seed: UInt64
    /// Shift time when it ended: how long the shift took.
    public var time: Double

    public var merges: Int { cleanMerges + tightFits + cutOffs }
}

/// The curves of a shift as pure functions of time.
public enum ShiftCurves {
    /// 0 at the start, 1 once `rampSeconds` have passed.
    static func ramp(at time: Double, config: Config) -> Double {
        config.rampSeconds > 0 ? min(max(time / config.rampSeconds, 0), 1) : 1
    }

    /// Cars the AI fills the road up to: rises from `densityStart` to `densityEnd` over the
    /// ramp and stays there; rush hour adds `rushHourDensityBonus`.
    public static func density(at time: Double, rushHour: Bool, config: Config) -> Int {
        let span = Double(config.densityEnd - config.densityStart)
        let base = config.densityStart + Int((span * ramp(at: time, config: config)).rounded())
        return base + (rushHour ? config.rushHourDensityBonus : 0)
    }

    /// Tempo as a share of `ringSpeed`: linear over the ramp, then from the start of rush
    /// hour a short smooth rise to rush hour tempo.
    public static func tempo(at time: Double, rushHourSince: Double?, config: Config) -> Double {
        let base = config.tempoStart + (config.tempoEnd - config.tempoStart) * ramp(at: time, config: config)
        guard let since = rushHourSince else { return base }
        let x = config.rushHourRamp > 0 ? min(max((time - since) / config.rushHourRamp, 0), 1) : 1
        let smooth = x * x * (3 - 2 * x)
        return base + (max(config.rushHourTempo, base) - base) * smooth
    }
}

extension World {
    /// Cars still to send this shift; nil in free play.
    public var carsLeft: Int? { mode == .shift ? shift.carsLeft : nil }

    /// Points are doubled in rush hour, only in a shift.
    var isRushHourScoring: Bool {
        mode == .shift && shift.isRushHour
    }

    /// Sets tempo and density for `time`. Ring cars share one speed, and merges and exits
    /// keep pace with it, so a tempo change never changes a gap.
    mutating func applyShiftCurves(at time: Double) {
        guard mode == .shift else { return }
        if isScoring {
            targetDensity = ShiftCurves.density(at: time, rushHour: shift.isRushHour, config: config)
        }
        ringSpeed = config.ringSpeed * ShiftCurves.tempo(at: time, rushHourSince: shift.rushHourSince, config: config)
    }

    /// Starts the shift: every car still to send, rush hour at once if there are only a few.
    mutating func startShift() {
        guard mode == .shift else { return }
        shift.carsLeft = config.shiftCars
        if config.shiftCars <= config.rushHourCars {
            beginRushHour(at: 0)
        }
    }

    /// A car of the shift drove off. Rush hour starts with the first of the last
    /// `rushHourCars`, so exactly those are doubled; after the last one, the shift closes.
    mutating func noteLaunch(at time: Double) {
        guard mode == .shift, let left = shift.carsLeft else { return }
        shift.carsLeft = max(0, left - 1)
        let remaining = shift.carsLeft ?? 0
        if shift.phase == .running && remaining < config.rushHourCars {
            beginRushHour(at: time)
        }
        if remaining == 0 && shift.acceptsTaps {
            shift.phase = .closing
            pendingTaps.removeAll()
            queue.heldTap = nil
        }
    }

    private mutating func beginRushHour(at time: Double) {
        shift.phase = .rushHour
        shift.rushHourSince = time
        events.append(.rushHour(time: time))
    }

    /// Runs at the end of each step: the curves, and the end once the last car is in.
    mutating func updateShift(now: Double) {
        guard mode == .shift else { return }
        applyShiftCurves(at: now)
        guard case .closing = shift.phase else { return }
        let merging = vehicles.contains { $0.owner == .player && $0.activeMerge != nil }
        let chased: Bool
        if case .active = criminal.phase { chased = true } else { chased = false }
        guard !merging && !chased else { return }
        // A transporter still on the road got through your whole shift: it is paid.
        if case let .active(id, _) = transporter.phase {
            transporterEscapes(id, now: now)
        }
        score.points += config.completionBonus
        endShift(.completed, at: now)
    }

    mutating func endShift(_ outcome: ShiftOutcome, at time: Double) {
        shift.phase = .ended(outcome)
        pendingTaps.removeAll()
        queue.heldTap = nil
        events.append(.shiftEnded(result(outcome: outcome, at: time)))
    }

    func result(outcome: ShiftOutcome, at time: Double) -> ShiftResult {
        ShiftResult(
            outcome: outcome,
            score: score.points,
            completionBonus: outcome == .completed ? config.completionBonus : 0,
            bestCombo: score.bestCombo,
            cleanMerges: score.cleanMerges,
            tightFits: score.tightFits,
            cutOffs: score.cutOffs,
            crashes: score.strikes,
            policeCrashes: score.policeCrashes,
            takedowns: score.takedowns,
            transporters: score.transporters,
            money: score.money,
            seed: seed,
            time: time
        )
    }
}
