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
        /// The shift is set up, traffic flows, the queue fills; it starts with the first
        /// tap, which already sends the front car (`World(startsOnFirstTap:)`).
        case waiting
        /// Cars left to send; density and tempo rise with time.
        case running
        /// The last `rushHourCars` cars: faster, denser, points ×2.
        case rushHour
        /// Every car is launched. Taps are ignored; the shift is done once the last merge
        /// is rated. A criminal still out there just drives off.
        case closing
        case ended(ShiftOutcome)
    }

    public internal(set) var phase: Phase = .running
    /// Cars not yet launched, the queue included. Nil in free play: its queue never ends.
    public internal(set) var carsLeft: Int?
    /// World time of the first tap; nil while waiting for it. Shift times count from here.
    public internal(set) var startedAt: Double?
    /// World time at which rush hour began.
    public internal(set) var rushHourSince: Double?

    public var acceptsTaps: Bool {
        switch phase {
        case .waiting, .running, .rushHour: true
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
    /// Money earned this shift: the shift pay if it was completed, plus paid transporters
    /// and shield bonuses.
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

    /// Time since the shift started at world time `now`; 0 while it waits for its first tap.
    func shiftTime(_ now: Double) -> Double {
        shift.startedAt.map { now - $0 } ?? 0
    }

    /// Sets tempo and density for world time `now`. Ring cars share one speed, and merges
    /// and exits keep pace with it, so a tempo change never changes a gap. After the shift
    /// before, the tempo glides from where it was instead of jumping.
    mutating func applyShiftCurves(at now: Double) {
        guard mode == .shift else { return }
        let time = shiftTime(now)
        if isScoring {
            targetDensity = ShiftCurves.density(at: time, rushHour: shift.isRushHour, config: config)
        }
        let rushHourSince = shift.rushHourSince.map { $0 - (shift.startedAt ?? 0) }
        let target = config.ringSpeed * ShiftCurves.tempo(at: time, rushHourSince: rushHourSince, config: config)
        if let glide = tempoGlide {
            let x = min(max((now - glide.since) / config.tempoGlideSeconds, 0), 1)
            ringSpeed = glide.from + (target - glide.from) * x * x * (3 - 2 * x)
            if x >= 1 { tempoGlide = nil }
        } else {
            ringSpeed = target
        }
    }

    /// Sets the shift up: every car still to send. It starts right away, or with the first
    /// tap if it waits for one.
    mutating func startShift(waiting: Bool) {
        guard mode == .shift else { return }
        shift.carsLeft = config.shiftCars
        if waiting {
            shift.phase = .waiting
        } else {
            beginShiftClock(at: 0)
        }
    }

    /// The shift clock starts: criminals and transporters come, traffic builds up. Their
    /// first times were drawn relative to the start.
    mutating func beginShiftClock(at time: Double) {
        shift.startedAt = time
        shift.phase = .running
        if case let .idle(next) = criminal.phase { criminal.phase = .idle(next: next + time) }
        if case let .idle(next) = transporter.phase { transporter.phase = .idle(next: next + time) }
        if config.shiftCars <= config.rushHourCars {
            beginRushHour(at: time)
        }
    }

    /// A car of the shift drove off. The first one starts a waiting shift. Rush hour starts
    /// with the first of the last `rushHourCars`, so exactly those are doubled; after the
    /// last one, the shift closes.
    mutating func noteLaunch(at time: Double) {
        guard mode == .shift, let left = shift.carsLeft else { return }
        if shift.phase == .waiting {
            beginShiftClock(at: time)
        }
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
        guard !merging else { return }
        // A transporter still on the road got through your whole shift: it is paid.
        if case let .active(id, _) = transporter.phase {
            transporterEscapes(id, now: now)
        }
        score.points += config.completionBonus
        score.money += config.shiftPay
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
            time: shiftTime(time)
        )
    }
}
