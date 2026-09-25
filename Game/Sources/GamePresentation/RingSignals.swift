import Foundation
import GameCore

/// The island's rim as the game's signal track (Leo, 25.09.2026: "die Welt selbst als UI").
/// The warning wedges already sat on it; now the shift and its big moments do too, so the
/// ring says what a HUD would otherwise have to:
///
/// - one tick per car of the shift, lit from the player's arm in driving direction as the
///   cars go in; accent in rush hour. A new shift's ticks come in one after the other.
/// - a **wave** that runs out over the lane: the combo climbed a tier, a takedown, a
///   transporter paid.
/// - a **flush** of the whole rim: a strike (red), a police crash (blue), a lost shift.
/// - a **sweep**, a light that runs once around: rush hour begins, the shift is done.
///
/// All on one circle, in the colours the game already uses for the same things. Drawn in
/// world space under the traffic, so it belongs to the place, not to the screen.
enum RingSignals {
    /// The rim: the island's painted edge line, where the warning wedges sit too.
    static func rim(_ layout: RoundaboutLayout) -> Double {
        layout.ringRadius - layout.laneWidth / 2 - 14
    }

    enum Kind: Sendable, Equatable {
        case wave
        case flush
        case sweep

        var duration: Double {
            switch self {
            case .wave: 0.7
            case .flush: 0.6
            case .sweep: 1.1
            }
        }
    }

    struct Signal: Sendable, Equatable {
        var kind: Kind
        var color: ColorToken
        var age = 0.0
    }

    /// How long a finished shift's ticks stay on the rim after the result appears, before the
    /// next shift's come in.
    static let hold = 0.9
    /// A new shift's ticks come in one after the other within this long…
    static let arrivalSpread = 0.6
    /// …each one fading and growing in over this long.
    static let arrivalEach = 0.25
    static let leaveDuration = 0.35

    /// What the rim shows; the session keeps it and ages it every frame.
    struct State: Sendable, Equatable {
        /// The shift the ticks count: how many cars, how many are in.
        var total = 0
        var sent = 0
        var lit: ColorToken = .primary
        /// Seconds since this shift's ticks started to come in.
        var arrival = Double.infinity
        /// Seconds since the last car went in: its tick lands with a bump.
        var sinceSent = Double.infinity
        /// The last shift's ticks, fading while the new ones come in.
        var leaving: Leaving?
        var signals: [Signal] = []

        struct Leaving: Sendable, Equatable {
            var total: Int
            var sent: Int
            var lit: ColorToken
            var age = 0.0
        }

        mutating func age(by delta: Double) {
            arrival += delta
            sinceSent += delta
            if var leaving {
                leaving.age += delta
                self.leaving = leaving.age < RingSignals.leaveDuration ? leaving : nil
            }
            for index in signals.indices {
                signals[index].age += delta
            }
            signals.removeAll { $0.age >= $0.kind.duration }
        }

        mutating func signal(_ kind: Kind, _ color: ColorToken) {
            // One of a kind and colour at a time: a second one starts it over.
            signals.removeAll { $0.kind == kind && $0.color == color }
            signals.append(Signal(kind: kind, color: color))
        }

        /// Follows the shift on the road. A different count, or fewer cars in than before,
        /// is a new shift: the old ticks go, the new ones come in.
        mutating func follow(total: Int, sent: Int, lit: ColorToken) {
            if total != self.total || sent < self.sent {
                if self.total > 0 {
                    leaving = Leaving(total: self.total, sent: self.sent, lit: self.lit)
                }
                self.total = total
                self.sent = sent
                arrival = 0
                sinceSent = .infinity
            } else if sent > self.sent {
                self.sent = sent
                sinceSent = 0
            }
            self.lit = lit
        }
    }

    static func add(_ state: State, layout: RoundaboutLayout, reduceMotion: Bool, to list: inout RenderList) {
        var id = RenderID.rim
        let rim = rim(layout)
        let start = layout.player.angle
        if let leaving = state.leaving {
            let fade = 1 - Ease.outCubic(leaving.age / leaveDuration)
            addTicks(total: leaving.total, sent: leaving.sent, lit: leaving.lit, start: start, rim: rim, opacity: fade, arrival: .infinity, sinceSent: .infinity, reduceMotion: reduceMotion, id: &id, to: &list)
        }
        id = RenderID.rim + 300
        addTicks(total: state.total, sent: state.sent, lit: state.lit, start: start, rim: rim, opacity: 1, arrival: state.arrival, sinceSent: state.sinceSent, reduceMotion: reduceMotion, id: &id, to: &list)
        id = RenderID.rim + 700
        for signal in state.signals {
            add(signal, start: start, rim: rim, outer: layout.ringRadius + layout.laneWidth / 2, reduceMotion: reduceMotion, id: &id, to: &list)
        }
    }

    /// One short arc per car, evenly around the rim from the player's arm in driving
    /// direction (world angles grow counter-clockwise, like the traffic).
    private static func addTicks(total: Int, sent: Int, lit: ColorToken, start: Double, rim: Double, opacity: Double, arrival: Double, sinceSent: Double, reduceMotion: Bool, id: inout Int, to list: inout RenderList) {
        guard total > 0, opacity > 0.001 else { return }
        let step = Angle.tau / Double(total)
        let half = min(step * 0.3, 0.1)
        for index in 0..<total {
            let appear: Double
            if reduceMotion {
                appear = Ease.outCubic(arrival / arrivalEach)
            } else {
                let delay = arrivalSpread * Double(index) / Double(total)
                appear = Ease.outCubic((arrival - delay) / arrivalEach)
            }
            guard appear > 0.001 else {
                id += 1
                continue
            }
            let center = start + step * (Double(index) + 0.5)
            let isLit = index < sent
            var thickness = isLit ? 3.0 : 2.0
            // The tick of the car that just went in lands with a bump.
            if isLit, index == sent - 1, !reduceMotion {
                thickness *= HUD.Pops.land(sinceSent / 0.35, amount: 0.8)
            }
            let grow = reduceMotion ? 1 : 0.4 + 0.6 * appear
            list.add(
                .arc(center: .zero, radius: rim, thickness: thickness, startAngle: center - half * grow, endAngle: center + half * grow),
                color: isLit ? lit : .marking, opacity: (isLit ? 0.85 : 0.6) * opacity * appear, space: .world, id: id
            )
            id += 1
        }
    }

    private static func add(_ signal: Signal, start: Double, rim: Double, outer: Double, reduceMotion: Bool, id: inout Int, to list: inout RenderList) {
        let x = Ease.clamp01(signal.age / signal.kind.duration)
        // Reduce Motion keeps the light, not the movement: every signal is a flush then.
        let kind = reduceMotion ? .flush : signal.kind
        switch kind {
        case .flush:
            let fade = 1 - Ease.outCubic(x)
            list.add(.arc(center: .zero, radius: rim, thickness: 8, startAngle: 0, endAngle: Angle.tau), color: signal.color, opacity: 0.22 * fade, space: .world, id: id)
            list.add(.arc(center: .zero, radius: rim, thickness: 2.5, startAngle: 0, endAngle: Angle.tau), color: signal.color, opacity: 0.8 * fade, space: .world, id: id + 1)
        case .wave:
            // From the rim out over the lane to the ring's outer kerb, thinning as it goes.
            let out = Ease.outCubic(x)
            let radius = rim + (outer - rim) * out
            list.add(.arc(center: .zero, radius: radius, thickness: 1 + 2.5 * (1 - x), startAngle: 0, endAngle: Angle.tau), color: signal.color, opacity: 0.55 * (1 - x), space: .world, id: id)
        case .sweep:
            // A light runs once around from the player's arm and leaves the rim lit behind it,
            // which then fades.
            let run = Ease.inOutSine(x / 0.8)
            let head = start + Angle.tau * run
            let fade = 1 - Ease.clamp01((x - 0.8) / 0.2)
            if run > 0.001 {
                list.add(.arc(center: .zero, radius: rim, thickness: 6, startAngle: start, endAngle: head), color: signal.color, opacity: 0.18 * fade, space: .world, id: id)
                list.add(.arc(center: .zero, radius: rim, thickness: 3.5, startAngle: max(start, head - 0.7), endAngle: head), color: signal.color, opacity: 0.9 * fade, space: .world, id: id + 1)
            }
        }
        id += 2
    }
}
