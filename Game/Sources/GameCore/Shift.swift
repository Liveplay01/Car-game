/// How a shift ended.
public enum ShiftOutcome: Sendable, Equatable {
    /// Driven to the end: completion bonus and a highscore entry.
    case completed
    /// The last strike: points stay, but no bonus and no highscore (FOUNDATION.md 2.6).
    case struckOut
    /// A criminal got away: the shift is lost at once (hard fail, IDEA.md).
    case escaped
}

/// Timeline of a shift (FOUNDATION.md 2.5).
public struct ShiftState: Sendable, Equatable {
    public enum Phase: Sendable, Equatable {
        /// Build-up: density and tempo rise slowly.
        case running
        /// The last part: faster, denser, points ×2.
        case rushHour
        /// Time is up. Taps are ignored, merges still in progress are rated.
        case closing
        case ended(ShiftOutcome)
    }

    public internal(set) var phase: Phase = .running

    public var acceptsTaps: Bool {
        switch phase {
        case .running, .rushHour: true
        case .closing, .ended: false
        }
    }

    public var isRushHour: Bool {
        switch phase {
        case .rushHour, .closing: true
        case .running, .ended: false
        }
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
    public var takedowns: Int
    public var transporters: Int
    /// Money earned this shift (paid transporters, none for seized ones).
    public var money: Int
    public var seed: UInt64
    /// Shift time when it ended.
    public var time: Double

    public var merges: Int { cleanMerges + tightFits + cutOffs }
}

/// The curves of a shift as pure functions of time.
public enum ShiftCurves {
    /// Cars the AI fills the road up to: rises from `densityStart` to `densityEnd` over the
    /// build-up, then rush hour adds `rushHourDensityBonus`.
    public static func density(at time: Double, config: Config) -> Int {
        let start = config.rushHourStart
        if time >= start {
            return config.densityEnd + config.rushHourDensityBonus
        }
        let progress = start > 0 ? time / start : 1
        let span = Double(config.densityEnd - config.densityStart)
        return config.densityStart + Int((span * progress).rounded())
    }

    /// Tempo as a share of `ringSpeed`: linear over the build-up, then a short smooth
    /// ramp up to rush hour tempo.
    public static func tempo(at time: Double, config: Config) -> Double {
        let start = config.rushHourStart
        if time < start {
            let progress = start > 0 ? time / start : 1
            return config.tempoStart + (config.tempoEnd - config.tempoStart) * progress
        }
        let x = config.rushHourRamp > 0 ? min(max((time - start) / config.rushHourRamp, 0), 1) : 1
        let smooth = x * x * (3 - 2 * x)
        return config.tempoEnd + (config.rushHourTempo - config.tempoEnd) * smooth
    }
}

extension World {
    /// Seconds left on the shift clock; 0 once time is up. Free play has no clock.
    public var remainingTime: Double {
        mode == .shift ? max(0, config.shiftSeconds - time) : 0
    }

    var rushHourStartTime: Double {
        mode == .shift ? config.rushHourStart : .infinity
    }

    /// Sets tempo and density for `time`. Ring cars share one speed, and merges and exits
    /// keep pace with it, so a tempo change never changes a gap.
    mutating func applyShiftCurves(at time: Double) {
        guard mode == .shift else { return }
        if isScoring {
            targetDensity = ShiftCurves.density(at: time, config: config)
        }
        ringSpeed = config.ringSpeed * ShiftCurves.tempo(at: time, config: config)
    }

    /// Runs at the end of each step: rush hour, time up, and the end once the last merge is rated.
    mutating func updateShift(now: Double) {
        guard mode == .shift else { return }
        applyShiftCurves(at: now)
        switch shift.phase {
        case .running:
            if now >= config.rushHourStart - 1e-9 {
                shift.phase = .rushHour
                events.append(.rushHour(time: now))
            }
        case .rushHour:
            if now >= config.shiftSeconds - 1e-9 {
                shift.phase = .closing
                pendingTaps.removeAll()
            }
        case .closing:
            let merging = vehicles.contains { $0.owner == .player && $0.activeMerge != nil }
            if !merging {
                score.points += config.completionBonus
                endShift(.completed, at: now)
            }
        case .ended:
            break
        }
    }

    mutating func endShift(_ outcome: ShiftOutcome, at time: Double) {
        shift.phase = .ended(outcome)
        pendingTaps.removeAll()
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
            takedowns: score.takedowns,
            transporters: score.transporters,
            money: score.money,
            seed: seed,
            time: time
        )
    }
}
