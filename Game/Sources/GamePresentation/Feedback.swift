import GameCore

/// Sound effects. The raw value is the file name: `Assets/Sounds/<raw>.wav`.
public enum SoundID: String, CaseIterable, Sendable {
    /// Clean merge: a quiet tick, it happens ~100 times a shift.
    case merge
    /// A module on the ring earned something: a short, quiet tick.
    case toll
    case tightFit
    /// Near Miss: a short, soft swoosh, quieter than the Tight Fit's (M6).
    case nearMiss
    /// Perfect Input: a small, high-quality click (M6).
    case perfect
    case cutOff
    case comboUp
    case crash
    case rushHour
    case shiftComplete
    case shiftFailed
    /// Siren: a criminal is about to show up.
    case wanted
    case takedown
    /// Short siren chirp: the next car became a police car.
    case dispatch
    case escaped
    /// Bank: a money transporter left safely.
    case paid
    /// Siren: a money transporter is announced.
    case secured
    /// Siren: a police car seized the transporter.
    case seized
}

/// Haptic patterns. The raw value is the file name: `Assets/Haptics/<raw>.ahap` (M11).
public enum HapticID: String, CaseIterable, Sendable {
    /// One sharp transient.
    case tightFit
    /// A light, soft transient: "that was close" (M6).
    case nearMiss
    /// A short, precise transient (M6).
    case perfect
    /// A barely felt rising pulse: the Perfect Chain reached the flow (M6).
    case flow
    /// A rich reward pattern: a chest was opened (M10).
    case chest
    /// Double tick.
    case comboUp
    /// Strong hit plus a short rumble.
    case crash
    /// Rising pattern.
    case rushHour
    case shiftComplete
    /// Rising pulses: a criminal is about to show up.
    case wanted
    /// Heavy hit, then a bright double tap.
    case takedown
    /// Rising pulses: a money transporter is announced.
    case secured
    /// A bright hit: the transporter was seized.
    case seized
    /// A rising double pulse: the transporter was paid.
    case paid
}

/// Turns game events into sound and haptics (FOUNDATION.md 3, motion and haptics rules):
/// the more often something happens, the less it does. Launching a car gives no feedback
/// at all; the car moving is the feedback.
public enum Feedback {
    public static func sound(for event: GameEvent) -> SoundID? {
        switch event {
        case let .merged(report):
            switch report.rating {
            case .clean: .merge
            case .tightFit: .tightFit
            case .nearMiss: .nearMiss
            case .perfect: .perfect
            case .cutOff: .cutOff
            }
        case let .crash(report): report.isTakedown ? nil : .crash
        case let .comboChanged(change): change.isTierUp ? .comboUp : nil
        case .rushHour: .rushHour
        case let .shiftEnded(result):
            switch result.outcome {
            case .completed: .shiftComplete
            case .struckOut: .shiftFailed
            // The escape already has its own sound.
            case .escaped: nil
            }
        case .criminalWarning: .wanted
        case .takedown: .takedown
        case .dispatched: .dispatch
        case .criminalEscaped: .escaped
        case .transporterWarning: .secured
        // The money is gone either way: seized by your police, or wrecked.
        case .transporterSeized, .transporterLost: .seized
        case let .transporterPaid(_, amount, _): amount > 0 ? .paid : nil
        // Modules pay many times a shift: a small tick, never the transporter's fanfare.
        case .modulePaid: .toll
        // The flow is felt, not heard: the music layers come with the adaptive audio (M11).
        case .flowChanged: nil
        case .towed: .toll
        case .launched, .tapRejected, .exited, .criminalEntered, .criminalEscaped, .dispatched, .transporterEntered, .transporterEscaped: nil
        }
    }

    public static func haptic(for event: GameEvent) -> HapticID? {
        switch event {
        case let .merged(report):
            switch report.rating {
            case .tightFit: .tightFit
            case .nearMiss: .nearMiss
            case .perfect: .perfect
            case .clean, .cutOff: nil
            }
        // Only the player's own crash is felt; the pile-up behind it is heard and seen.
        case let .crash(report): report.isStrike ? .crash : nil
        case let .comboChanged(change): change.isTierUp ? .comboUp : nil
        case .rushHour: .rushHour
        // An aborted shift already had its crash or its escape.
        case let .shiftEnded(result): result.outcome == .completed ? .shiftComplete : nil
        case .criminalWarning: .wanted
        case .takedown: .takedown
        case .transporterWarning: .secured
        // The money is gone either way: seized by your police, or wrecked.
        case .transporterSeized, .transporterLost: .seized
        case let .transporterPaid(_, amount, _): amount > 0 ? .paid : nil
        // Money that comes in by itself is not felt: the thumb is busy with the traffic.
        case .modulePaid: nil
        // Only entering the flow is felt; leaving it is felt through the crash that ends it.
        case let .flowChanged(change): change.isInFlow ? .flow : nil
        case .towed: nil
        case .launched, .tapRejected, .exited, .criminalEntered, .criminalEscaped, .dispatched, .transporterEntered, .transporterEscaped: nil
        }
    }

    /// Sounds and haptics for one frame, each at most once and in first-seen order.
    public static func cues(for events: [GameEvent]) -> (sounds: [SoundID], haptics: [HapticID]) {
        var sounds: [SoundID] = []
        var haptics: [HapticID] = []
        for event in events {
            if let sound = sound(for: event), !sounds.contains(sound) {
                sounds.append(sound)
            }
            if let haptic = haptic(for: event), !haptics.contains(haptic) {
                haptics.append(haptic)
            }
        }
        return (sounds, haptics)
    }
}
