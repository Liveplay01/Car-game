import Foundation

/// A cubic Bézier segment.
public struct CubicBezier: Sendable, Equatable {
    public var p0: Vec2
    public var p1: Vec2
    public var p2: Vec2
    public var p3: Vec2

    public init(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2) {
        self.p0 = p0
        self.p1 = p1
        self.p2 = p2
        self.p3 = p3
    }

    /// A straight line as a Bézier, so paths can mix curves and straights.
    public static func line(from a: Vec2, to b: Vec2) -> CubicBezier {
        CubicBezier(p0: a, p1: a + (b - a) / 3, p2: a + (b - a) * (2.0 / 3.0), p3: b)
    }

    public func point(at t: Double) -> Vec2 {
        let u = 1 - t
        return p0 * (u * u * u) + p1 * (3 * u * u * t) + p2 * (3 * u * t * t) + p3 * (t * t * t)
    }

    public func derivative(at t: Double) -> Vec2 {
        let u = 1 - t
        return (p1 - p0) * (3 * u * u) + (p2 - p1) * (6 * u * t) + (p3 - p2) * (3 * t * t)
    }
}

/// Vehicles move along paths by distance `s`, not by angle (FOUNDATION.md 4.2).
/// The ring is a closed path, entries and exits are open ones. Multi-lane roundabouts
/// and road networks later are just more paths, not new logic.
public struct Path: Sendable, Equatable {
    public enum Shape: Sendable, Equatable {
        /// Counter-clockwise circle. `s = 0` lies at angle 0 (east).
        case circle(center: Vec2, radius: Double)
        /// Open path of Bézier segments, parametrised by arc length.
        case curve([CubicBezier])
    }

    public struct Pose: Sendable, Equatable {
        public var position: Vec2
        /// Direction of travel, radians.
        public var heading: Double

        public init(position: Vec2, heading: Double) {
            self.position = position
            self.heading = heading
        }
    }

    /// Arc-length table entry: at distance `s` the path is at `t` of `segment`.
    struct Sample: Sendable, Equatable {
        var segment: Int
        var t: Double
        var s: Double
    }

    public let shape: Shape
    public let length: Double
    let samples: [Sample]

    public var isClosed: Bool {
        if case .circle = shape { return true }
        return false
    }

    public static func circle(center: Vec2, radius: Double) -> Path {
        Path(shape: .circle(center: center, radius: radius), length: Angle.tau * radius, samples: [])
    }

    public static func curve(_ segments: [CubicBezier], samplesPerSegment: Int = 96) -> Path {
        precondition(!segments.isEmpty, "a curve needs at least one segment")
        var samples: [Sample] = []
        var s = 0.0
        for (index, segment) in segments.enumerated() {
            var previous = segment.point(at: 0)
            samples.append(Sample(segment: index, t: 0, s: s))
            for k in 1...samplesPerSegment {
                let t = Double(k) / Double(samplesPerSegment)
                let p = segment.point(at: t)
                s += p.distance(to: previous)
                previous = p
                samples.append(Sample(segment: index, t: t, s: s))
            }
        }
        return Path(shape: .curve(segments), length: s, samples: samples)
    }

    /// Position and heading after distance `s`. Closed paths wrap, open paths clamp.
    public func pose(at s: Double) -> Pose {
        switch shape {
        case let .circle(center, radius):
            let angle = Angle.wrap(s / radius)
            return Pose(position: center + Vec2(angle: angle) * radius, heading: angle + .pi / 2)
        case let .curve(segments):
            let (segment, t) = parameter(at: min(max(s, 0), length))
            let bezier = segments[segment]
            let d = bezier.derivative(at: t)
            let heading = d.lengthSquared > 1e-12 ? d.angle : (bezier.p3 - bezier.p0).angle
            return Pose(position: bezier.point(at: t), heading: heading)
        }
    }

    public func point(at s: Double) -> Vec2 { pose(at: s).position }

    /// Segment and Bézier parameter at distance `s`, by binary search in the arc-length table.
    private func parameter(at s: Double) -> (Int, Double) {
        var lo = 0
        var hi = samples.count - 1
        while lo < hi {
            let mid = (lo + hi + 1) / 2
            if samples[mid].s <= s { lo = mid } else { hi = mid - 1 }
        }
        let a = samples[lo]
        guard lo + 1 < samples.count else { return (a.segment, a.t) }
        let b = samples[lo + 1]
        guard b.segment == a.segment, b.s - a.s > 1e-12 else { return (a.segment, a.t) }
        let f = (s - a.s) / (b.s - a.s)
        return (a.segment, a.t + (b.t - a.t) * f)
    }
}
