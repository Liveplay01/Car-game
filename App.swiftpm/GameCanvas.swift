import GameCore
import GamePresentation
import SwiftUI

/// Draws a render list with SwiftUI's Canvas: the same shapes and colours the test window
/// draws with raylib. Knows nothing about the game.
struct GameCanvas: View {
    let model: GameModel

    var body: some View {
        TimelineView(.animation) { _ in
            Canvas(rendersAsynchronously: false) { context, size in
                guard let list = model.renderList else { return }
                context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(Palette.color(list.background, opacity: 1)))
                for item in list.items {
                    draw(item, camera: list.camera, in: &context)
                }
            }
        }
    }

    private func draw(_ item: RenderItem, camera: GamePresentation.Camera, in context: inout GraphicsContext) {
        let color = Palette.color(item.color, opacity: item.opacity)
        let isWorld = item.space == .world
        func point(_ p: Vec2) -> CGPoint {
            let s = isWorld ? camera.toScreen(p) : p
            return CGPoint(x: s.x, y: s.y)
        }
        func length(_ l: Double) -> Double { isWorld ? camera.toScreen(length: l) : l }
        func angle(_ a: Double) -> Double { isWorld ? camera.toScreen(angle: a) : a }

        switch item.primitive {
        case let .roundedRect(center, size, cornerRadius, rotation):
            let w = length(size.x)
            let h = length(size.y)
            let rect = CGRect(x: -w / 2, y: -h / 2, width: w, height: h)
            let radius = max(0, min(length(cornerRadius), min(w, h) / 2))
            let c = point(center)
            let transform = CGAffineTransform(translationX: c.x, y: c.y).rotated(by: angle(rotation))
            context.fill(Path(roundedRect: rect, cornerRadius: radius).applying(transform), with: .color(color))

        case let .circle(center, radius):
            let r = length(radius)
            let c = point(center)
            context.fill(Path(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r)), with: .color(color))

        case let .arc(center, radius, thickness, startAngle, endAngle):
            let r = length(radius)
            let c = point(center)
            var path = Path()
            if abs(endAngle - startAngle) >= Angle.tau - 1e-9 {
                path.addEllipse(in: CGRect(x: c.x - r, y: c.y - r, width: 2 * r, height: 2 * r))
            } else {
                let a = angle(startAngle)
                let b = angle(endAngle)
                path.addArc(center: c, radius: r, startAngle: .radians(min(a, b)), endAngle: .radians(max(a, b)), clockwise: false)
            }
            context.stroke(path, with: .color(color), lineWidth: length(thickness))

        case let .line(from, to, thickness):
            var path = Path()
            path.move(to: point(from))
            path.addLine(to: point(to))
            context.stroke(path, with: .color(color), style: StrokeStyle(lineWidth: length(thickness), lineCap: .butt))

        case let .polygon(points):
            guard points.count >= 3 else { return }
            var path = Path()
            path.move(to: point(points[0]))
            for p in points.dropFirst() { path.addLine(to: point(p)) }
            path.closeSubpath()
            context.fill(path, with: .color(color))

        case let .text(string, position, size, alignment, weight):
            // Money inside a text: the SF Symbol "banknote" in the accent where the game put
            // its note mark (`Icons.moneyMark`).
            let note = Palette.color(.accent, opacity: item.opacity)
            let joined = Icons.pieces(string).reduce(Text(verbatim: "")) { text, piece in
                switch piece {
                case let .text(run): text + Text(verbatim: run).foregroundColor(color)
                case .money: text + Text(Image(systemName: "banknote.fill")).foregroundColor(note) + Text(verbatim: "\u{2009}")
                }
            }
            // Hierarchy from weight and size together (apple-design, typography): big
            // numbers bold, everything else semibold; tiny labels a touch wider apart.
            let fontWeight: Font.Weight = weight == .bold ? (size >= 24 ? .bold : .semibold) : .regular
            let text = joined
                .font(.system(size: size, weight: fontWeight, design: .default).monospacedDigit())
                .tracking(size <= 11 ? 0.3 : 0)
            let anchor: UnitPoint = switch alignment {
            case .leading: .leading
            case .center: .center
            case .trailing: .trailing
            }
            context.draw(text, at: point(position), anchor: anchor)
        }
    }
}

/// The game's colour tokens as SwiftUI colours.
enum Palette {
    static func color(_ token: ColorToken, opacity: Double) -> Color {
        let c = Theme.color(token)
        return Color(
            .sRGB,
            red: Double(c.r) / 255,
            green: Double(c.g) / 255,
            blue: Double(c.b) / 255,
            opacity: Double(c.a) / 255 * min(max(opacity, 0), 1)
        )
    }
}
