import CRaylib
import GameCore
import GamePresentation

/// Draws a render list with raylib. Knows shapes and colours, nothing about the game.
final class Renderer {
    private let regular: Font
    private let bold: Font
    private let ownsFonts: Bool

    init() {
        // Placeholder font from the system; the app uses SF Pro.
        let candidates: [(regular: String, bold: String)] = [
            ("C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/segoeuib.ttf"),
            ("/System/Library/Fonts/SFNS.ttf", "/System/Library/Fonts/SFNS.ttf"),
        ]
        for pair in candidates {
            if let regular = Self.loadFont(pair.regular), let bold = Self.loadFont(pair.bold) {
                self.regular = regular
                self.bold = bold
                ownsFonts = true
                return
            }
        }
        regular = GetFontDefault()
        bold = GetFontDefault()
        ownsFonts = false
    }

    func unload() {
        if ownsFonts {
            UnloadFont(regular)
            UnloadFont(bold)
        }
    }

    func draw(_ list: RenderList) {
        ClearBackground(color(list.background, opacity: 1))
        for item in list.items {
            draw(item, camera: list.camera)
        }
    }

    // MARK: - Items

    private func draw(_ item: RenderItem, camera: GamePresentation.Camera) {
        let tint = color(item.color, opacity: item.opacity)
        let isWorld = item.space == .world

        func point(_ p: Vec2) -> Vec2 { isWorld ? camera.toScreen(p) : p }
        func length(_ l: Double) -> Double { isWorld ? camera.toScreen(length: l) : l }
        func angle(_ a: Double) -> Double { isWorld ? camera.toScreen(angle: a) : a }

        switch item.primitive {
        case let .roundedRect(center, size, cornerRadius, rotation):
            fillRoundedRect(
                center: point(center),
                size: Vec2(length(size.x), length(size.y)),
                radius: length(cornerRadius),
                rotation: angle(rotation),
                color: tint
            )

        case let .circle(center, radius):
            let r = length(radius)
            DrawCircleSector(vector(point(center)), Float(r), 0, 360, segments(for: r), tint)

        case let .arc(center, radius, thickness, startAngle, endAngle):
            let r = length(radius)
            let t = length(thickness)
            var from = degrees(angle(startAngle))
            var to = degrees(angle(endAngle))
            if abs(endAngle - startAngle) >= Angle.tau - 1e-9 {
                from = 0
                to = 360
            }
            DrawRing(vector(point(center)), Float(r - t / 2), Float(r + t / 2), Float(min(from, to)), Float(max(from, to)), segments(for: r), tint)

        case let .line(from, to, thickness):
            DrawLineEx(vector(point(from)), vector(point(to)), Float(length(thickness)), tint)

        case let .polygon(points):
            guard points.count >= 3 else { return }
            let screen = points.map(point)
            let center = screen.reduce(Vec2.zero, +) / Double(screen.count)
            var fan = [vector(center)] + screen.map(vector)
            fan.append(fan[1])
            DrawTriangleFan(fan, Int32(fan.count), tint)

        case let .text(string, position, size, alignment, weight):
            let font = weight == .bold ? bold : regular
            let fontSize = Float(size)
            // Money inside a text: the note is drawn where `Icons.moneyMark` stands.
            let pieces = Icons.pieces(string)
            let note = Float(Icons.inlineMoneyWidth(size: size))
            let widths = pieces.map { piece -> Float in
                switch piece {
                case let .text(run): MeasureTextEx(font, run, fontSize, 0).x
                case .money: note
                }
            }
            let height = MeasureTextEx(font, "0", fontSize, 0).y
            let total = widths.reduce(0, +)
            let anchor = vector(point(position))
            var x = anchor.x
            switch alignment {
            case .leading: break
            case .center: x -= total / 2
            case .trailing: x -= total
            }
            for (piece, width) in zip(pieces, widths) {
                switch piece {
                case let .text(run):
                    DrawTextEx(font, run, Vector2(x: x, y: anchor.y - height / 2), fontSize, 0, tint)
                case .money:
                    for shape in Icons.inlineMoney(at: Vec2(Double(x + width / 2), Double(anchor.y)), size: size, opacity: item.opacity) {
                        draw(shape, camera: camera)
                    }
                }
                x += width
            }
        }
    }

    /// Rotated rounded rectangle as a triangle fan (raylib has no rotated rounded rect).
    private func fillRoundedRect(center: Vec2, size: Vec2, radius: Double, rotation: Double, color: Color) {
        let hw = size.x / 2
        let hh = size.y / 2
        let r = max(0, min(radius, min(hw, hh)))
        let corners = [Vec2(hw - r, hh - r), Vec2(-(hw - r), hh - r), Vec2(-(hw - r), -(hh - r)), Vec2(hw - r, -(hh - r))]
        let steps = r > 0 ? 5 : 0
        var points = [vector(center)]
        for (index, corner) in corners.enumerated() {
            let start = Double(index) * .pi / 2
            for k in 0...steps {
                let a = start + (.pi / 2) * (steps == 0 ? 0 : Double(k) / Double(steps))
                let local = corner + Vec2(angle: a) * r
                points.append(vector(center + local.rotated(by: rotation)))
            }
        }
        points.append(points[1])
        DrawTriangleFan(points, Int32(points.count), color)
    }

    // MARK: - Conversion

    private func color(_ token: ColorToken, opacity: Double) -> Color {
        let c = Theme.color(token)
        let alpha = Double(c.a) * min(max(opacity, 0), 1)
        return Color(r: c.r, g: c.g, b: c.b, a: UInt8(alpha.rounded()))
    }

    private func vector(_ p: Vec2) -> Vector2 { Vector2(x: Float(p.x), y: Float(p.y)) }
    private func degrees(_ radians: Double) -> Double { radians * 180 / .pi }
    private func segments(for radius: Double) -> Int32 { Int32(min(160, max(24, radius * 0.7))) }

    private static func loadFont(_ path: String) -> Font? {
        guard FileExists(path) else { return nil }
        // ASCII plus the few symbols the game's strings use (× · – — … → −).
        var codepoints = Array(Int32(32)...Int32(126)) + [0xD7, 0xB7, 0x2013, 0x2014, 0x2026, 0x2192, 0x2212]
        var font = LoadFontEx(path, 64, &codepoints, Int32(codepoints.count))
        guard font.texture.id != 0 else { return nil }
        GenTextureMipmaps(&font.texture)
        SetTextureFilter(font.texture, Int32(TEXTURE_FILTER_TRILINEAR.rawValue))
        return font
    }
}
