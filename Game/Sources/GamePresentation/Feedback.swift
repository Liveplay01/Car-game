import Foundation
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
    /// The car that was cut off honks.
    case cutOff
    case comboUp
    /// Crashes in three weights, picked by how hard the hit was (`Feedback.crashSound`):
    /// thump, crumpling metal, a ringing panel, parts; the heavy one adds glass and a second bang.
    case crashLight
    case crash
    case crashHeavy
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
    /// The criminal's pickup races in: engine and squealing tyres.
    case screech
    /// A tow truck cleared a wreck: winch and hook.
    case tow
    /// Flow State began: a soft shimmer that opens into the flow layer of the music.
    case flowIn

    // Transitions and menus (M11): the moments between the driving.

    /// A shift starts with its first tap: a short whoosh.
    case go
    /// The result slides in.
    case swoosh
    /// A tab or a card: a tiny tick.
    case uiTick
    /// An upgrade or a chest was bought: coins and a "ka-ching".
    case purchase
    /// A part was built on the ring: a thud and steel.
    case build
    /// Not enough money.
    case denied
    /// The chest charges up to its burst (`ShopPage.burstTime`).
    case chestCharge
    case chestBurst
    /// Epic and legendary: a deeper burst with a fanfare.
    case chestBurstRare
}

/// Haptic patterns. The raw value is the file name: `Assets/Haptics/<raw>.ahap` (M11).
public enum HapticID: String, CaseIterable, Sendable {
    /// Clean merge: a tiny, crisp detent, barely felt, like a Digital Crown clicking into
    /// place (Leo, 26.09.2026). It comes with every clean car, so it stays that small.
    case merge
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
        case let .crash(report): report.isTakedown ? nil : crashSound(report)
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
        // The crash is heard already; the siren just stops.
        case .criminalWrecked: nil
        case .transporterWarning: .secured
        // The money is gone either way: seized by your police, or wrecked.
        case .transporterSeized, .transporterLost: .seized
        case let .transporterPaid(_, amount, _): amount > 0 ? .paid : nil
        // Modules pay many times a shift: a small tick, never the transporter's fanfare.
        case .modulePaid: .toll
        // Entering the flow opens with a soft shimmer, then the music's flow layer carries it.
        case let .flowChanged(change): change.isInFlow ? .flowIn : nil
        case .towed: .tow
        case .criminalEntered: .screech
        case .launched, .tapRejected, .exited, .transporterEntered, .transporterEscaped: nil
        }
    }

    /// A clean merge climbs the A-minor pentatonic with the combo, the key the music plays
    /// in: every car that goes in cleanly sounds one step higher, up to an octave and a
    /// half, and a broken combo starts again at the bottom.
    static let comboLadder = [0.0, 3, 5, 7, 10, 12, 15, 17]

    /// How a sound is pitched when it plays. The merge follows the combo; sounds that come
    /// often (tolls, crashes, ticks) vary a little each time, so no two in a row are the
    /// same recording (`serial` counts the sounds played).
    public static func pitch(for sound: SoundID, combo: Int, serial: Int) -> Double {
        switch sound {
        case .merge:
            let step = min(max(combo - 1, 0), comboLadder.count - 1)
            return pow(2, comboLadder[step] / 12)
        case .toll, .crashLight, .crash, .crashHeavy, .uiTick, .nearMiss:
            return 1 + 0.08 * (WeatherLayer.unitHash(serial, 97) - 0.5)
        default:
            return 1
        }
    }

    /// The weight of a crash sound follows the hit (`CrashEffects.severity`): a bump, a
    /// crash, or a hard one with glass.
    public static func crashSound(_ report: CrashReport) -> SoundID {
        let severity = CrashEffects.severity(of: report)
        if severity < 0.75 { return .crashLight }
        return severity < CrashEffects.fireSeverity ? .crash : .crashHeavy
    }

    public static func haptic(for event: GameEvent) -> HapticID? {
        switch event {
        case let .merged(report):
            switch report.rating {
            case .tightFit: .tightFit
            case .nearMiss: .nearMiss
            case .perfect: .perfect
            // A clean car clicks into the ring; a cut-off is felt through nothing good.
            case .clean: .merge
            case .cutOff: nil
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
        case .launched, .tapRejected, .exited, .criminalEntered, .criminalEscaped, .criminalWrecked, .dispatched, .transporterEntered, .transporterEscaped: nil
        }
    }

    /// How much softer a haptic is played, 0…1 (Leo, 26.09.2026): in the flow the rhythm of
    /// the merges is felt deeper and rounder — less sharpness, a little less strength. What
    /// warns or hits (a crash, a siren, a takedown) stays as sharp as ever.
    public static func softness(of haptic: HapticID, flow: Double) -> Double {
        switch haptic {
        case .merge, .tightFit, .nearMiss, .perfect, .comboUp, .flow:
            min(max(flow, 0), 1)
        case .chest, .crash, .rushHour, .shiftComplete, .wanted, .takedown, .secured, .seized, .paid:
            0
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
        // The clean click is only felt on its own: anything stronger in the frame says it.
        if haptics.count > 1 { haptics.removeAll { $0 == .merge } }
        // A pile-up is heard as one crash, as heavy as its hardest hit.
        let weights: [SoundID] = [.crashLight, .crash, .crashHeavy]
        if let heaviest = sounds.filter(weights.contains).max(by: { weights.firstIndex(of: $0)! < weights.firstIndex(of: $1)! }) {
            sounds.removeAll { weights.contains($0) && $0 != heaviest }
        }
        return (sounds, haptics)
    }
}
