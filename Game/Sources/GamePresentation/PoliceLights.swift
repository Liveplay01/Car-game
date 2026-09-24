import Foundation

/// The police light bar (Leo: "smoother und cooler"): six blue LED modules across the roof,
/// three per side, running through changing flash patterns like a real German LED bar.
///
/// Everything is a pure function of the phase (`CarArt.strobeCycle` seconds per cycle), so
/// every platform draws the same light and tests can check it. Each pattern runs for
/// `cyclesPerPattern` cycles; neighbouring patterns cross-fade instead of cutting over.
enum PoliceLights {
    /// LEDs per side, outer to inner.
    static let perSide = 3
    static let count = 2 * perSide
    static let cyclesPerPattern = 2.0

    enum Pattern: Int, CaseIterable {
        /// Two flashes left, then two right: the classic.
        case doubleFlash
        /// A soft beam that runs across the bar and back.
        case sweep
        /// Three short flashes per side, faster and brighter.
        case tripleFlash
    }

    static func pattern(at phase: Double) -> Pattern {
        let index = Int((max(phase, 0) / cyclesPerPattern).rounded(.down)) % Pattern.allCases.count
        return Pattern(rawValue: index) ?? .doubleFlash
    }

    /// Brightness 0…1 of each LED: index 0–2 is the left side from outer to inner, 3–5 the
    /// right side from inner to outer (left to right across the bar).
    static func leds(_ phase: Double) -> [Double] {
        let phase = max(phase, 0)
        let current = pattern(at: phase)
        let inPattern = phase.truncatingRemainder(dividingBy: cyclesPerPattern)
        // The last stretch of a pattern blends into the next one.
        let blendStart = cyclesPerPattern - crossFade
        let lit = leds(current, cycleTime: cycleTime(phase))
        guard inPattern > blendStart else { return lit }
        let next = Pattern(rawValue: (current.rawValue + 1) % Pattern.allCases.count) ?? .doubleFlash
        let upcoming = leds(next, cycleTime: cycleTime(phase))
        let w = Ease.smoothstep((inPattern - blendStart) / crossFade)
        return zip(lit, upcoming).map { $0 * (1 - w) + $1 * w }
    }

    /// How brightly each side shines: the brightest LED on it.
    static func sides(_ phase: Double) -> (left: Double, right: Double) {
        let lit = leds(phase)
        return (lit[0..<perSide].max() ?? 0, lit[perSide...].max() ?? 0)
    }

    /// The light the bar throws on the road and the roof: a little behind the LEDs and
    /// softer, like light that fills a space instead of blinking in it.
    static func spill(_ phase: Double) -> (left: Double, right: Double) {
        let taps = 5
        var left = 0.0
        var right = 0.0
        var total = 0.0
        for k in 0..<taps {
            let weight = 1 - Double(k) / Double(taps)
            let side = sides(phase - Double(k) * spillStep / CarArt.strobeCycle)
            left += side.left * weight
            right += side.right * weight
            total += weight
        }
        return (left / total, right / total)
    }

    // MARK: - Patterns

    /// Cycles the last pattern hands over to the next.
    static let crossFade = 0.15
    /// Seconds between the samples of the spill.
    static let spillStep = 0.025

    private static func cycleTime(_ phase: Double) -> Double {
        phase.truncatingRemainder(dividingBy: 1) * CarArt.strobeCycle
    }

    /// One LED flash at `t` seconds after it fired: a quick rise, a soft fade.
    static func flash(_ t: Double, fade: Double = 0.07) -> Double {
        guard t >= 0 else { return 0 }
        let rise = 0.022
        return t < rise ? Ease.outCubic(t / rise) : exp(-(t - rise) / fade)
    }

    private static func leds(_ pattern: Pattern, cycleTime t: Double) -> [Double] {
        let half = CarArt.strobeCycle / 2
        // Seconds since the start of this side's half, and where the side's LEDs sit.
        func side(_ index: Int) -> (t: Double, outerToInner: Int) {
            index < perSide ? (t, index) : (t - half, count - 1 - index)
        }
        switch pattern {
        case .doubleFlash:
            return (0..<count).map { index in
                let (s, k) = side(index)
                // The inner LEDs fire a hair later: the flash runs in from the edge.
                let delay = Double(k) * 0.012
                return max(flash(s - delay), flash(s - 0.13 - delay))
            }
        case .tripleFlash:
            return (0..<count).map { index in
                let (s, k) = side(index)
                let delay = Double(k) * 0.008
                return [0, 0.085, 0.17].map { flash(s - $0 - delay, fade: 0.045) }.max() ?? 0
            }
        case .sweep:
            // A beam goes from the outer left LED to the outer right one and back once per
            // cycle, eased at the ends so it seems to swing.
            let x = t / CarArt.strobeCycle
            let there = x < 0.5 ? x * 2 : 2 - x * 2
            let position = Ease.inOutSine(there) * Double(count - 1)
            return (0..<count).map { index in
                let d = Double(index) - position
                return exp(-d * d / 0.9)
            }
        }
    }
}
