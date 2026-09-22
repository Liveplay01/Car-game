import Foundation

/// The four arms of the roundabout, in driving order (counter-clockwise, right-hand traffic).
public enum Arm: Int, CaseIterable, Sendable {
    case east = 0
    case north = 1
    case west = 2
    case south = 3

    /// The player's arm: the queue sits at the bottom, in the thumb zone.
    public static let player: Arm = .south
    /// Arms used by AI traffic.
    public static let ai: [Arm] = [.east, .north, .west]

    public var angle: Double { Double(rawValue) * .pi / 2 }
    /// Unit vector from the centre along the arm.
    public var outward: Vec2 { Vec2(angle: angle) }

    /// The arm `count` steps further in driving direction.
    public func advanced(by count: Int) -> Arm {
        Arm(rawValue: ((rawValue + count) % 4 + 4) % 4)!
    }
}

/// Geometry of the single-lane roundabout with four arms (FOUNDATION.md 2.1).
///
/// All paths are built once from the config. Entry paths have the same length on every
/// arm (`Config.mergePathLength`); the stop line distance is solved for that.
public struct RoundaboutLayout: Sendable, Equatable {
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
        ringRadius = config.ringRadius
        laneWidth = config.laneWidth
        queueSpacing = config.queueSpacing
        ring = .circle(center: .zero, radius: config.ringRadius)

        let minimum = config.ringRadius + config.laneWidth / 2 + config.carLength / 2 + 1
        let stop = Self.solveStopDistance(length: config.mergePathLength, from: minimum, to: minimum + 400, config: config)
        stopDistance = stop

        entries = Arm.allCases.map { arm in
            .curve([Self.entryCurve(arm: arm, stopDistance: stop, config: config)])
        }
        exits = Arm.allCases.map { arm in
            let curve = Self.exitCurve(arm: arm, stopDistance: stop, config: config)
            let end = arm.outward * (stop + 260) + arm.outward.right * (config.laneWidth / 2)
            return .curve([curve, .line(from: curve.p3, to: end)])
        }
        entryRingS = Arm.allCases.map { Angle.wrap($0.angle + config.mergeAngle) * config.ringRadius }
        exitRingS = Arm.allCases.map { Angle.wrap($0.angle - config.mergeAngle) * config.ringRadius }

        let edge = config.ringRadius + config.laneWidth / 2 + 18
        let queueEnd = stop + config.queueSpacing * Double(config.queueVisible - 1) + config.carLength / 2 + 10
        viewBounds = Rect(minX: -edge, minY: -queueEnd, maxX: edge, maxY: edge)
    }

    public func entry(_ arm: Arm) -> Path { entries[arm.rawValue] }
    public func exit(_ arm: Arm) -> Path { exits[arm.rawValue] }
    public func entryRingS(_ arm: Arm) -> Double { entryRingS[arm.rawValue] }
    public func exitRingS(_ arm: Arm) -> Double { exitRingS[arm.rawValue] }

    /// The waiting position at an arm's stop line.
    public func stopPose(_ arm: Arm) -> Path.Pose { entry(arm).pose(at: 0) }

    /// Pose of a queued car. Slot 0 is the stop line; fractional slots are cars rolling up.
    public func queuePose(slot: Double) -> Path.Pose {
        let stop = stopPose(Arm.player)
        return Path.Pose(position: stop.position + Arm.player.outward * (queueSpacing * slot), heading: stop.heading)
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
    static func entryCurve(arm: Arm, stopDistance: Double, config: Config) -> CubicBezier {
        let inward = -arm.outward
        let side = inward.right
        let p0 = arm.outward * stopDistance + side * (config.laneWidth / 2)
        let endAngle = arm.angle + config.mergeAngle
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
    static func exitCurve(arm: Arm, stopDistance: Double, config: Config) -> CubicBezier {
        let outward = arm.outward
        let side = outward.right
        let startAngle = arm.angle - config.mergeAngle
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
            Path.curve([entryCurve(arm: .south, stopDistance: d, config: config)]).length
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
