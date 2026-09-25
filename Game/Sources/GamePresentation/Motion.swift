import Foundation
import GameCore

/// The soft-body layer of a takedown (IDEA.md; ROADMAP.md, M11): the metal gives way,
/// springs back and keeps a rest dent. Only drawn, on top of the real rigid-body physics.
public enum SoftBody {
    /// How much of a dent shows `age` seconds after the hit: 0–30 ms the impact, 30–120 ms
    /// the body gives way beyond the rest dent (`peak`), then a damped spring back to it (1).
    public static let peak = 1.6

    public static func factor(age: Double) -> Double {
        guard age >= 0 else { return 1 }
        if age < 0.03 { return 0.4 * age / 0.03 }
        if age < 0.12 {
            let x = (age - 0.03) / 0.09
            return 0.4 + (peak - 0.4) * x * x * (3 - 2 * x)
        }
        let t = age - 0.12
        return 1 + (peak - 1) * exp(-t / 0.08) * cos(t * 25)
    }

    /// Only the takedown pair gets the spring; every other crash dents at once.
    static func springs(_ type: VehicleType) -> Bool {
        type == .pickup || type == .police
    }

    /// The dents as they look at `time`; nil time (Reduce Motion) shows the rest dents.
    static func dents(_ dents: [Dent], type: VehicleType, at time: Double?) -> [Dent] {
        guard let time, springs(type) else { return dents }
        return dents.map { dent in
            var shown = dent
            shown.depth *= factor(age: time - dent.time)
            return shown
        }
    }
}

/// Easing curves (FOUNDATION.md 3, motion rules).
public enum Ease {
    public static func clamp01(_ x: Double) -> Double { min(max(x, 0), 1) }

    public static func outCubic(_ x: Double) -> Double {
        let u = 1 - clamp01(x)
        return 1 - u * u * u
    }

    public static func inCubic(_ x: Double) -> Double {
        let t = clamp01(x)
        return t * t * t
    }

    public static func smoothstep(_ x: Double) -> Double {
        let t = clamp01(x)
        return t * t * (3 - 2 * t)
    }

    public static func inOutSine(_ x: Double) -> Double {
        (1 - cos(.pi * clamp01(x))) / 2
    }

    /// The chest's spring (Leo: "dieses Smoothe überall"): shoots about 10 % past 1, swings
    /// back once and settles. For positions and sizes, never for opacity.
    public static func spring(_ x: Double) -> Double {
        guard x > 0 else { return 0 }
        guard x < 1 else { return 1 }
        return 1 - exp(-6 * x) * cos(x * 10)
    }
}
