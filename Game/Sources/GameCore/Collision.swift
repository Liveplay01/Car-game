/// A capsule: segment plus radius. Exact and cheap distance, no physics engine (FOUNDATION.md 4.3).
public struct Capsule: Sendable, Equatable {
    public var a: Vec2
    public var b: Vec2
    public var radius: Double

    public init(a: Vec2, b: Vec2, radius: Double) {
        self.a = a
        self.b = b
        self.radius = radius
    }

    /// A vehicle's hitbox. `length` includes the rounded ends, `width` is the diameter.
    public init(center: Vec2, heading: Double, length: Double, width: Double) {
        let r = width / 2
        let half = Vec2(angle: heading) * max(0, length / 2 - r)
        self.init(a: center - half, b: center + half, radius: r)
    }
}

public enum Collision {
    public struct Contact: Sendable, Equatable {
        /// Surface to surface. ≤ 0 means the capsules touch.
        public var gap: Double
        /// Closest point on the first capsule's centre segment.
        public var pointA: Vec2
        /// Closest point on the second capsule's centre segment.
        public var pointB: Vec2

        /// Where the two surfaces meet (or come closest).
        public var point: Vec2 { (pointA + pointB) / 2 }
    }

    public static func contact(_ c1: Capsule, _ c2: Capsule) -> Contact {
        let (p, q) = closestPoints(c1.a, c1.b, c2.a, c2.b)
        return Contact(gap: p.distance(to: q) - c1.radius - c2.radius, pointA: p, pointB: q)
    }

    public static func gap(_ c1: Capsule, _ c2: Capsule) -> Double {
        contact(c1, c2).gap
    }

    /// Closest points between segments p1–q1 and p2–q2.
    /// Ericson, Real-Time Collision Detection, 5.1.9.
    public static func closestPoints(_ p1: Vec2, _ q1: Vec2, _ p2: Vec2, _ q2: Vec2) -> (Vec2, Vec2) {
        let epsilon = 1e-12
        let d1 = q1 - p1
        let d2 = q2 - p2
        let r = p1 - p2
        let a = d1.dot(d1)
        let e = d2.dot(d2)
        let f = d2.dot(r)
        var s = 0.0
        var t = 0.0

        if a <= epsilon && e <= epsilon {
            return (p1, p2)
        }
        if a <= epsilon {
            t = clamp01(f / e)
        } else {
            let c = d1.dot(r)
            if e <= epsilon {
                s = clamp01(-c / a)
            } else {
                let b = d1.dot(d2)
                let denominator = a * e - b * b
                s = denominator != 0 ? clamp01((b * f - c * e) / denominator) : 0
                t = (b * s + f) / e
                if t < 0 {
                    t = 0
                    s = clamp01(-c / a)
                } else if t > 1 {
                    t = 1
                    s = clamp01((b - c) / a)
                }
            }
        }
        return (p1 + d1 * s, p2 + d2 * t)
    }

    private static func clamp01(_ x: Double) -> Double { min(max(x, 0), 1) }
}
