import Foundation

/// One arm of the roundabout. Arm 0 is the player's, at the bottom in the thumb zone; the
/// others follow in driving direction (counter-clockwise, right-hand traffic).
///
/// Arms sit in slots around the ring (`Config.armSlotCount`), so the Street Builder can put
/// them where the player wants them (ROADMAP.md, M5). Which slots are built is
/// `Config.armSlots`; slot 0, at the bottom, is always the player's.
public struct Arm: Hashable, Sendable {
    /// Its place in the layout's list: 0 is the player's, then in driving direction.
    public let index: Int
    /// Its slot around the ring.
    public let slot: Int
    /// Direction from the centre, as the slot dictates.
    public let angle: Double

    /// Unit vector from the centre along the arm.
    public var outward: Vec2 { Vec2(angle: angle) }
    public var isPlayer: Bool { index == 0 }

    /// The direction of a slot: slot 0 points down, the rest follow in driving direction.
    public static func angle(ofSlot slot: Int, slots: Int) -> Double {
        -.pi / 2 + Double(slot) * Angle.tau / Double(max(3, slots))
    }
}

/// Geometry of the single-lane roundabout (FOUNDATION.md 2.1). It has `Config.arms` arms:
/// four to start with, more once the roundabout is built out (ROADMAP.md, M5).
///
/// All paths are built once from the config. Entry paths have the same length on every
/// arm (`Config.mergePathLength`); the stop line distance is solved for that.
public struct RoundaboutLayout: Sendable, Equatable {
    /// Every arm, the player's first, then in driving direction.
    public let arms: [Arm]
    /// The player's arm, at the bottom.
    public let player: Arm
    /// The arms AI traffic comes from: all but the player's.
    public let aiArms: [Arm]
    /// Slots an arm can sit in, all the way round.
    public let armSlotCount: Int
    public let ringRadius: Double
    public let laneWidth: Double
    public let ring: Path
    /// From the stop line to the merge point on the ring, by arm.
    public let entries: [Path]
    /// From the ring out of the picture, by arm (South exists but is never a target).
    public let exits: [Path]
    /// Ring distance where each arm's entry joins.
    public let entryRingS: [Double]
    /// Ring distance where each arm's exit leaves.
    public let exitRingS: [Double]
    /// Distance from the centre to the stop line, along the arm.
    public let stopDistance: Double
    public let queueSpacing: Double
    /// World area the camera keeps in view: the ring and `queueVisible` queued cars.
    public let viewBounds: Rect

    public init(config: Config) {
        let slots = config.builtArmSlots
        arms = slots.enumerated().map { index, slot in
            Arm(index: index, slot: slot, angle: Arm.angle(ofSlot: slot, slots: config.armSlotCount))
        }
        player = arms[0]
        aiArms = Array(arms.dropFirst())
        armSlotCount = max(3, config.armSlotCount)
        // Every arm needs its room, so the ring grows with them.
        let radius = config.ringRadius + config.ringRadiusPerArm * Double(max(0, arms.count - 4))
        var config = config
        config.ringRadius = radius
        ringRadius = radius
        laneWidth = config.laneWidth
        queueSpacing = config.queueSpacing
        ring = .circle(center: .zero, radius: radius)

        let minimum = radius + config.laneWidth / 2 + config.carLength / 2 + 1
        let stop = Self.solveStopDistance(length: config.mergePathLength, from: minimum, to: minimum + 400, config: config)
        stopDistance = stop

        entries = arms.map { arm in
            .curve([Self.entryCurve(angle: arm.angle, stopDistance: stop, config: config)])
        }
        exits = arms.map { arm in
            let curve = Self.exitCurve(angle: arm.angle, stopDistance: stop, config: config)
            let end = arm.outward * (stop + 260) + arm.outward.right * (config.laneWidth / 2)
            return .curve([curve, .line(from: curve.p3, to: end)])
        }
        entryRingS = arms.map { Angle.wrap($0.angle + config.mergeAngle) * config.ringRadius }
        exitRingS = arms.map { Angle.wrap($0.angle - config.mergeAngle) * config.ringRadius }

        let edge = radius + config.laneWidth / 2 + 18
        let queueEnd = stop + config.queueSpacing * Double(config.queueVisible - 1) + config.carLength / 2 + 10
        viewBounds = Rect(minX: -edge, minY: -queueEnd, maxX: edge, maxY: edge)
    }

    /// The arm with this index, counted from the player's in driving direction.
    public func arm(_ index: Int) -> Arm { arms[((index % arms.count) + arms.count) % arms.count] }

    /// The arm `steps` further in driving direction.
    public func advance(_ arm: Arm, by steps: Int) -> Arm { self.arm(arm.index + steps) }

    /// Where a slot sits, as a direction from the centre.
    public func angle(ofSlot slot: Int) -> Double { Arm.angle(ofSlot: slot, slots: armSlotCount) }

    public func entry(_ arm: Arm) -> Path { entries[arm.index] }
    public func exit(_ arm: Arm) -> Path { exits[arm.index] }
    public func entryRingS(_ arm: Arm) -> Double { entryRingS[arm.index] }
    public func exitRingS(_ arm: Arm) -> Double { exitRingS[arm.index] }

    /// The waiting position at an arm's stop line.
    public func stopPose(_ arm: Arm) -> Path.Pose { entry(arm).pose(at: 0) }

    /// Pose of a queued car. Slot 0 is the stop line; fractional slots are cars rolling up.
    public func queuePose(slot: Double) -> Path.Pose {
        let stop = stopPose(player)
        return Path.Pose(position: stop.position + player.outward * (queueSpacing * slot), heading: stop.heading)
    }

    /// Ring distance forward from `a` to `b`.
    public func ringDistance(from a: Double, to b: Double) -> Double {
        Angle.wrap(b - a, period: ring.length)
    }

    /// Ring distance a car drives from joining at `entryArm` until it leaves at `exitArm`.
    public func ringDistance(from entryArm: Arm, toExit exitArm: Arm) -> Double {
        ringDistance(from: entryRingS(entryArm), to: exitRingS(exitArm))
    }

    // MARK: - Construction

    /// Right-hand traffic: the entry lane lies right of the incoming driver. The car drives
    /// straight towards the ring, then turns right onto it and meets it tangentially.
    static func entryCurve(angle: Double, stopDistance: Double, config: Config) -> CubicBezier {
        let outward = Vec2(angle: angle)
        let inward = -outward
        let side = inward.right
        let p0 = outward * stopDistance + side * (config.laneWidth / 2)
        let endAngle = angle + config.mergeAngle
        let p3 = Vec2(angle: endAngle) * config.ringRadius
        let tangent = Vec2(angle: endAngle + .pi / 2)
        let chord = p3 - p0
        let lateral = abs(chord.dot(side))
        return CubicBezier(
            p0: p0,
            p1: p0 + inward * (chord.length * 0.5),
            p2: p3 - tangent * (lateral * 0.9),
            p3: p3
        )
    }

    /// Mirror image of the entry: leaves the ring tangentially, then heads out on the right lane.
    static func exitCurve(angle: Double, stopDistance: Double, config: Config) -> CubicBezier {
        let outward = Vec2(angle: angle)
        let side = outward.right
        let startAngle = angle - config.mergeAngle
        let p0 = Vec2(angle: startAngle) * config.ringRadius
        let tangent = Vec2(angle: startAngle + .pi / 2)
        let p3 = outward * stopDistance + side * (config.laneWidth / 2)
        let chord = p3 - p0
        let lateral = abs(chord.dot(side))
        return CubicBezier(
            p0: p0,
            p1: p0 + tangent * (lateral * 0.9),
            p2: p3 - outward * (chord.length * 0.5),
            p3: p3
        )
    }

    /// Stop line distance at which the entry path has exactly `length` (bisection; length grows with distance).
    static func solveStopDistance(length: Double, from lower: Double, to upper: Double, config: Config) -> Double {
        func pathLength(_ d: Double) -> Double {
            // Every arm has the same shape, so one of them is enough.
            Path.curve([entryCurve(angle: -.pi / 2, stopDistance: d, config: config)]).length
        }
        var lo = lower
        var hi = upper
        if pathLength(lo) >= length { return lo }
        if pathLength(hi) <= length { return hi }
        for _ in 0..<60 {
            let mid = (lo + hi) / 2
            if pathLength(mid) < length { lo = mid } else { hi = mid }
        }
        return (lo + hi) / 2
    }
}
