import Foundation
import GameCore

/// What a bot does before a step.
public enum BotAction: Sendable, Equatable {
    /// A tap at this time. It may lie in the future; the world then launches the car at
    /// exactly that moment.
    case tap(Double)
    /// Emergency dispatch: the next car becomes a police car.
    case dispatch
}

/// A player without hands, for balancing (FOUNDATION.md 5, M2 step 7).
///
/// Bots see exactly what a player sees: where every car is and where it will be if nobody
/// taps (`World.predictedMergeGap`). They never peek at the future of the random numbers.
public protocol Bot {
    var name: String { get }
    /// Called before every step.
    mutating func decide(_ world: World) -> BotAction?
}

/// What a chaser needs to know about the criminal and the queue.
struct Chase {
    var criminal: Int?
    /// Position of the first police car in the queue; nil if there is none.
    var policeSlot: Int?

    /// Nil while no criminal is announced or on the road.
    init?(_ world: World) {
        switch world.criminal.phase {
        case let .arriving(id), let .active(id, _):
            criminal = id
        case .warning:
            // Announced: time to get a police car to the front.
            criminal = nil
        case .idle, .leaving:
            return nil
        }
        policeSlot = world.queue.vehicles.firstIndex { world.vehicle(id: $0)?.type == .police }
    }

    /// Worth an emergency dispatch: no police car close enough to the front.
    var needsDispatch: Bool { (policeSlot ?? .max) > 2 }
    var policeIsNext: Bool { policeSlot == 0 }
}

extension World {
    /// A police car of yours is still merging while a criminal is out: it may be about to
    /// ram it. Without a tap cooldown, a car sent right after it would drive into the wreck.
    var isTakedownPending: Bool {
        criminal.vehicle != nil && vehicles.contains { $0.isPlayerPolice && $0.activeMerge != nil }
    }
}

/// Perfect timing and perfect judgement: waits for a Tight Fit, takes a clean gap after a
/// short while, never goes closer than `margin`, and lets a pile-up or a takedown clear
/// before it merges again. Hunts criminals: sends a police car exactly when it will hit the
/// pickup and nobody else, and calls a dispatch if no police car is near the front. Never
/// touches the transporter. If it ever crashes, a crash was unfair.
public struct PerfectBot: Bot {
    /// Samples per predicted merge. The smallest gap comes near the end of the merge, where
    /// both cars drive almost in parallel, so 30 samples err by well under 0.01 s.
    static let samples = 30

    public let name = "Perfect"
    /// Never merges closer than this (seconds).
    public var margin: Double
    /// How long it passes up clean gaps while waiting for a Tight Fit.
    public var patience: Double
    private var readySince: Double?

    public init(margin: Double = 0.02, patience: Double = 0.6) {
        self.margin = margin
        self.patience = patience
    }

    public mutating func decide(_ world: World) -> BotAction? {
        guard world.shift.acceptsTaps else { return nil }
        let chase = Chase(world)
        if let chase, chase.needsDispatch {
            return .dispatch
        }
        guard world.queue.isReady, !world.isTrafficDisturbed, !world.isTakedownPending else {
            readySince = nil
            return nil
        }
        if let chase, chase.policeIsNext {
            // Hold the police car back until it would hit the pickup, and only the pickup.
            let gaps = world.predictedMergeGaps(from: world.layout.player, samples: Self.samples)
            let hits = (gaps[chase.criminal ?? -1] ?? .infinity) <= 0
            let clear = gaps.allSatisfy { $0.key == chase.criminal || $0.value > margin }
            return hits && clear ? .tap(world.time) : nil
        }
        let since = readySince ?? world.time
        readySince = since
        let gap = world.predictedMergeGap(from: world.layout.player, samples: Self.samples)
        guard gap > margin else { return nil }
        if gap < world.config.tightFitSeconds || world.time - since >= patience {
            return .tap(world.time)
        }
        return nil
    }
}

/// A decent human: plans a tap a moment ahead, misses the planned moment by a random
/// timing error, and only sometimes dares a Tight Fit. Chases criminals the same way, and
/// calls a dispatch a second after it notices it needs one. Keeps playing through a
/// pile-up elsewhere on the ring, with wider gaps.
public struct HumanBot: Bot {
    public let name = "Human"
    /// How far ahead the tap is planned; also the largest timing error.
    public var lead: Double
    /// Standard deviation of the timing error (seconds). ~40 ms is a typical human.
    public var timingError: Double
    /// Share of cars for which it tries a Tight Fit.
    public var boldness: Double
    /// Gap it wants when playing safe, and the closest it aims for when bold (seconds).
    public var safeGap: Double
    public var boldGap: Double
    /// A bold attempt turns safe after this long without a Tight Fit chance.
    public var patience: Double
    /// How deep into the pickup it aims (seconds of overlap), to hit despite its timing error.
    public var aimDepth = 0.08
    /// With this many cars left or fewer it finishes the shift instead of hunting.
    public var finishRatherThanHunt = 4

    private var rng: SeededRandom
    private var pendingTap: Double?
    private var readySince: Double?
    private var isBold = false
    private var dispatchNoticed: Double?

    public init(
        seed: UInt64,
        lead: Double = 0.1,
        timingError: Double = 0.04,
        boldness: Double = 0.35,
        safeGap: Double = 0.2,
        boldGap: Double = 0.05,
        patience: Double = 1
    ) {
        rng = SeededRandom(seed: seed ^ 0x5DEE_CE66_D1CE_4E5B)
        self.lead = lead
        self.timingError = timingError
        self.boldness = boldness
        self.safeGap = safeGap
        self.boldGap = boldGap
        self.patience = patience
    }

    public mutating func decide(_ world: World) -> BotAction? {
        if let pending = pendingTap, world.time <= pending { return nil }
        pendingTap = nil
        guard world.shift.acceptsTaps else { return nil }
        let chase = Chase(world)
        if let chase, chase.needsDispatch, (world.carsLeft ?? .max) > finishRatherThanHunt {
            let noticed = dispatchNoticed ?? world.time
            dispatchNoticed = noticed
            if world.time - noticed >= 1 {
                dispatchNoticed = nil
                return .dispatch
            }
        } else {
            dispatchNoticed = nil
        }
        guard world.queue.isReady, !world.isTakedownPending else {
            readySince = nil
            return nil
        }
        // While traffic brakes or a wreck lies around, it does not wait for the whole ring to
        // flow again, as a player would not either: it only takes a gap twice as wide, and
        // never a bold one. Braking cars move less predictably than flowing ones.
        let disturbed = world.isTrafficDisturbed
        let room = disturbed ? 2 * safeGap : boldGap
        // With only a few cars left it does not hunt: it sends them in, and once the last
        // one is in the shift is done and the criminal no longer matters.
        let hunting = (world.carsLeft ?? .max) > finishRatherThanHunt
        if hunting, let chase, chase.policeIsNext, let criminal = chase.criminal {
            // Aims for the middle of the hit window, not its edge: a timing error either
            // way still hits.
            let gaps = world.predictedMergeGaps(from: world.layout.player, launchDelay: lead, samples: PerfectBot.samples)
            let hits = (gaps[criminal] ?? .infinity) <= -aimDepth
            let clear = gaps.allSatisfy { $0.key == criminal || $0.value > room }
            guard hits && clear else { return nil }
            return plannedTap(world)
        }
        if readySince == nil {
            readySince = world.time
            isBold = rng.unit() < boldness
        }
        let waited = world.time - (readySince ?? world.time)
        let gap = world.predictedMergeGap(from: world.layout.player, launchDelay: lead, samples: PerfectBot.samples)
        let wanted = disturbed
            ? gap > 2 * safeGap
            : isBold && waited < patience
                ? gap > boldGap && gap < world.config.tightFitSeconds
                : gap > safeGap
        guard wanted else { return nil }
        return plannedTap(world)
    }

    /// The planned moment plus a human timing error.
    private mutating func plannedTap(_ world: World) -> BotAction {
        let error = min(max(gaussian() * timingError, -lead), lead)
        let tap = world.time + lead + error
        pendingTap = tap
        return .tap(tap)
    }

    /// Standard normal (Box–Muller).
    private mutating func gaussian() -> Double {
        let u = max(rng.unit(), 1e-12)
        let v = rng.unit()
        return (-2 * log(u)).squareRoot() * cos(2 * .pi * v)
    }
}

/// Taps without looking, at random intervals. Should crash often.
public struct RandomBot: Bot {
    public let name = "Random"
    public var interval: ClosedRange<Double>
    private var rng: SeededRandom
    private var nextTap: Double?

    public init(seed: UInt64, interval: ClosedRange<Double> = 0.3...1.5) {
        rng = SeededRandom(seed: seed ^ 0x2545_F491_4F6C_DD1D)
        self.interval = interval
    }

    public mutating func decide(_ world: World) -> BotAction? {
        let next = nextTap ?? world.time + rng.double(in: interval)
        guard world.time >= next else {
            nextTap = next
            return nil
        }
        nextTap = world.time + rng.double(in: interval)
        return .tap(world.time)
    }
}

/// Plays one complete shift.
public enum ShiftRunner {
    /// A shift has no clock; a bot that has not sent all its cars after this long is broken.
    public static let timeLimit = 300.0

    public static func play<B: Bot>(_ bot: inout B, config: Config, seed: UInt64) -> ShiftResult {
        var world = World(config: config, seed: seed)
        let limit = Int(timeLimit * Double(World.stepRate))
        for _ in 0..<limit {
            switch bot.decide(world) {
            case let .tap(time): world.tap(at: time)
            case .dispatch: world.dispatchPolice()
            case nil: break
            }
            world.step()
            for event in world.takeEvents() {
                if case let .shiftEnded(result) = event { return result }
            }
        }
        preconditionFailure("shift \(seed) did not end")
    }
}
