/// Easing curves (FOUNDATION.md 3, motion rules). Springs come with the effects in M11.
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
}
