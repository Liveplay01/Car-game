import GameCore

/// The best moment of a shift (IDEA.md: Replay / Highlight; ROADMAP.md, M11). There is no
/// replay screen: when the shift ends, the scene freezes on this moment for a breath, then
/// the result takes over. `World` is a value type, so the moment is simply a copy of it.
struct Highlight {
    enum Kind: Int, Comparable {
        case lastMerge
        case nearMiss
        case chain
        case tightFit
        case takedown

        static func < (a: Kind, b: Kind) -> Bool { a.rawValue < b.rawValue }
    }

    var kind: Kind
    /// Within a kind, higher is better: points, closeness, chain length.
    var value: Double
    var position: Vec2
    var world: World

    /// How long the scene stays frozen on it after the shift.
    static let duration = 1.6

    func isBetter(than other: Highlight?) -> Bool {
        guard let other else { return true }
        return (kind, value) > (other.kind, other.value)
    }

    /// The candidate an event makes, if any: takedown > tightest fit > longest chain >
    /// closest near miss > the last merge.
    static func candidate(for event: GameEvent, in world: World) -> Highlight? {
        switch event {
        case let .takedown(report):
            return Highlight(kind: .takedown, value: Double(report.points), position: report.point, world: world)
        case let .merged(report):
            switch report.rating {
            case .tightFit:
                return Highlight(kind: .tightFit, value: -report.minGap, position: report.position, world: world)
            case .nearMiss:
                return Highlight(kind: .nearMiss, value: -report.minGap, position: report.position, world: world)
            case .perfect, .clean:
                if report.chain >= 3 {
                    return Highlight(kind: .chain, value: Double(report.chain), position: report.position, world: world)
                }
                return Highlight(kind: .lastMerge, value: report.time, position: report.position, world: world)
            case .cutOff:
                return nil
            }
        default:
            return nil
        }
    }

    /// The frozen moment: a ring around it that opens once, and what it was.
    func addMarker(age: Double, reduceMotion: Bool, to list: inout RenderList) {
        let x = Ease.clamp01(age / Self.duration)
        let radius = reduceMotion ? 30 : 18 + 18 * Ease.outCubic(x * 2)
        let fade = 1 - Ease.clamp01((age - (Self.duration - 0.3)) / 0.3)
        list.add(.arc(center: position, radius: radius, thickness: 2.5, startAngle: 0, endAngle: Angle.tau),
                 color: .accent, opacity: 0.9 * fade, space: .world, id: RenderID.popups + 999)
        let label = list.camera.toScreen(position) + Vec2(0, -46)
        list.add(.text(Strings.Result.highlight(kind), position: label, size: 13, alignment: .center, weight: .bold),
                 color: .accent, opacity: fade, space: .screen, id: RenderID.popups + 998)
    }
}
