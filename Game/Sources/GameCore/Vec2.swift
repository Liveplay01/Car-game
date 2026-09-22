import Foundation

/// 2D vector in world units. Own type instead of `simd`, so the package builds on Windows.
/// World space is y-up, angles are radians, counter-clockwise from +x.
public struct Vec2: Hashable, Sendable {
    public var x: Double
    public var y: Double

    public init(_ x: Double, _ y: Double) {
        self.x = x
        self.y = y
    }

    /// Unit vector pointing at `angle`.
    public init(angle: Double) {
        self.init(cos(angle), sin(angle))
    }

    public static let zero = Vec2(0, 0)

    public var length: Double { (x * x + y * y).squareRoot() }
    public var lengthSquared: Double { x * x + y * y }
    public var angle: Double { atan2(y, x) }

    public var normalized: Vec2 {
        let l = length
        return l > 0 ? self / l : .zero
    }

    /// Rotated 90° counter-clockwise.
    public var left: Vec2 { Vec2(-y, x) }
    /// Rotated 90° clockwise.
    public var right: Vec2 { Vec2(y, -x) }

    public func dot(_ o: Vec2) -> Double { x * o.x + y * o.y }
    public func cross(_ o: Vec2) -> Double { x * o.y - y * o.x }
    public func distance(to o: Vec2) -> Double { (self - o).length }

    public func rotated(by a: Double) -> Vec2 {
        let c = cos(a), s = sin(a)
        return Vec2(x * c - y * s, x * s + y * c)
    }

    public static func lerp(_ a: Vec2, _ b: Vec2, _ t: Double) -> Vec2 { a + (b - a) * t }

    public static func + (a: Vec2, b: Vec2) -> Vec2 { Vec2(a.x + b.x, a.y + b.y) }
    public static func - (a: Vec2, b: Vec2) -> Vec2 { Vec2(a.x - b.x, a.y - b.y) }
    public static func * (a: Vec2, k: Double) -> Vec2 { Vec2(a.x * k, a.y * k) }
    public static func * (k: Double, a: Vec2) -> Vec2 { Vec2(a.x * k, a.y * k) }
    public static func / (a: Vec2, k: Double) -> Vec2 { Vec2(a.x / k, a.y / k) }
    public static prefix func - (a: Vec2) -> Vec2 { Vec2(-a.x, -a.y) }
    public static func += (a: inout Vec2, b: Vec2) { a = a + b }
    public static func -= (a: inout Vec2, b: Vec2) { a = a - b }
}

/// Axis-aligned rectangle in world units (y-up).
public struct Rect: Hashable, Sendable {
    public var minX: Double
    public var minY: Double
    public var maxX: Double
    public var maxY: Double

    public init(minX: Double, minY: Double, maxX: Double, maxY: Double) {
        self.minX = minX
        self.minY = minY
        self.maxX = maxX
        self.maxY = maxY
    }

    public var width: Double { maxX - minX }
    public var height: Double { maxY - minY }
    public var center: Vec2 { Vec2((minX + maxX) / 2, (minY + maxY) / 2) }

    public func contains(_ p: Vec2) -> Bool {
        p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY
    }
}

public enum Angle {
    public static let tau = 2 * Double.pi

    /// Wraps into [0, 2π).
    public static func wrap(_ a: Double) -> Double {
        wrap(a, period: tau)
    }

    /// Wraps into [0, period).
    public static func wrap(_ value: Double, period: Double) -> Double {
        var r = value.truncatingRemainder(dividingBy: period)
        if r < 0 { r += period }
        return r >= period ? 0 : r
    }

    /// Signed shortest turn from `a` to `b`, in [-π, π).
    public static func delta(from a: Double, to b: Double) -> Double {
        wrap(b - a + .pi) - .pi
    }

    /// Interpolates along the shortest turn.
    public static func lerp(_ a: Double, _ b: Double, _ t: Double) -> Double {
        a + delta(from: a, to: b) * t
    }
}
