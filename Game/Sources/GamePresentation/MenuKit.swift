import GameCore

/// The iOS look of the drawn menus (Leo: "mehr Apple-like, bisher wirkt die UI etwas tot"):
/// a large title on the left, the balance as a chip, a segmented control with a raised
/// thumb, filled and tinted buttons, and tab glyphs after the SF Symbols the app uses.
/// The app shows the same pages with native controls where it can (CLAUDE.md).
enum MenuKit {
    static let margin = 20.0
    static let titleSize = 30.0

    /// Large title on the left, the balance as a chip on the right, both on one row.
    static func header(_ title: String, money: String, viewport: Vec2, id: inout Int, to list: inout RenderList) {
        let y = Metrics.sceneInsets.top - 22
        list.add(.text(title, position: Vec2(margin, y), size: titleSize, alignment: .leading, weight: .bold), color: .primary, space: .screen, id: id)
        id += 1
        let size = 15.0
        let width = size * 0.74 * 1.8 + size * 0.34 + Icons.textWidth(money, size: size) + 24
        let chip = Vec2(viewport.x - margin - width / 2, y)
        list.add(.roundedRect(center: chip, size: Vec2(width, 32), cornerRadius: 16, rotation: 0), color: .controlFill, space: .screen, id: id)
        id += 1
        Icons.moneyTag(money, at: chip, size: size, alignment: .center, color: .primary, id: &id, to: &list)
    }

    /// A segmented control: a sunk track and a raised thumb under the chosen segment.
    /// `thumb` is the thumb's position as a (fractional) segment index, so it can slide.
    static func segmented(_ labels: [String], chosen: Int, thumb: Double, in rect: Rect, id: inout Int, to list: inout RenderList) {
        guard !labels.isEmpty else { return }
        let height = rect.height
        list.add(.roundedRect(center: rect.center, size: Vec2(rect.width, height), cornerRadius: 9, rotation: 0), color: .controlFill, space: .screen, id: id)
        id += 1
        let cell = rect.width / Double(labels.count)
        let thumbCenter = Vec2(rect.minX + cell * (thumb + 0.5), rect.center.y)
        let thumbSize = Vec2(cell - 4, height - 4)
        // A hairline of shadow under the thumb lifts it off the track.
        list.add(.roundedRect(center: thumbCenter + Vec2(0, 1), size: thumbSize, cornerRadius: 7, rotation: 0), color: .shadow, space: .screen, id: id)
        id += 1
        list.add(.roundedRect(center: thumbCenter, size: thumbSize, cornerRadius: 7, rotation: 0), color: .controlThumb, space: .screen, id: id)
        id += 1
        for (index, label) in labels.enumerated() {
            let at = Vec2(rect.minX + cell * (Double(index) + 0.5), rect.center.y)
            list.add(.text(label, position: at, size: 13, alignment: .center, weight: index == chosen ? .bold : .regular), color: .primary, space: .screen, id: id)
            id += 1
        }
    }

    /// iOS button styles: filled in the accent for the main action, tinted (a grey fill with
    /// accent text) for the others. Disabled buttons fade.
    static func button(_ label: String, center: Vec2, size: Vec2, prominent: Bool, enabled: Bool, id: inout Int, to list: inout RenderList) {
        let fill: ColorToken = prominent ? .accent : .controlFill
        list.add(.roundedRect(center: center, size: size, cornerRadius: size.y / 2, rotation: 0), color: fill, opacity: enabled ? 1 : 0.4, space: .screen, id: id)
        id += 1
        let ink: ColorToken = prominent ? .accentInk : .accent
        list.add(.text(label, position: center, size: 14, alignment: .center, weight: .bold), color: enabled ? ink : .muted, opacity: enabled ? 1 : 0.7, space: .screen, id: id)
        id += 1
    }

    /// Soft light: stacked discs, faint at the rim and brighter towards the middle, so it
    /// reads as a radial glow and not as a flat disc. `opacity` is the brightness in the middle.
    static func glow(at center: Vec2, radius: Double, color: ColorToken, opacity: Double, id: inout Int, to list: inout RenderList) {
        guard radius > 0.5, opacity > 0 else { return }
        for step in [1.0, 0.78, 0.58, 0.4, 0.24] {
            list.add(.circle(center: center, radius: radius * step), color: color, opacity: opacity / 5, space: .screen, id: id)
            id += 1
        }
    }

    /// 0 → 1 for the `index`-th item of a list coming in: 40 ms apart, 250 ms each, ease-out.
    static func stagger(age: Double, index: Int) -> Double {
        Ease.outCubic((age - 0.04 * Double(index)) / 0.25)
    }

    /// The tab glyph, after the SF Symbol the app shows (`Tab.symbol`), about 22 points big.
    static func tabGlyph(_ tab: Tab, at c: Vec2, color: ColorToken, id: inout Int, to list: inout RenderList) {
        func add(_ primitive: Primitive, _ tint: ColorToken = color) {
            list.add(primitive, color: tint, space: .screen, id: id)
            id += 1
        }
        switch tab {
        case .streetBuilder:
            // map: a folded map, three panels.
            add(.polygon([c + Vec2(-11, -7), c + Vec2(-4, -9), c + Vec2(-4, 8), c + Vec2(-11, 10)]))
            add(.polygon([c + Vec2(-3, -9), c + Vec2(4, -7), c + Vec2(4, 10), c + Vec2(-3, 8)]))
            add(.polygon([c + Vec2(5, -7), c + Vec2(11, -9), c + Vec2(11, 8), c + Vec2(5, 10)]))
        case .game:
            // car.fill: body, cabin, wheels.
            add(.roundedRect(center: c + Vec2(0, 2), size: Vec2(22, 9), cornerRadius: 3.5, rotation: 0))
            add(.polygon([c + Vec2(-7, -2), c + Vec2(-4, -8), c + Vec2(4, -8), c + Vec2(7, -2)]))
            add(.circle(center: c + Vec2(-6, 7), radius: 2.6))
            add(.circle(center: c + Vec2(6, 7), radius: 2.6))
        case .shop:
            // bag: body and handle.
            add(.roundedRect(center: c + Vec2(0, 3), size: Vec2(18, 15), cornerRadius: 3, rotation: 0))
            add(.arc(center: c + Vec2(0, -4), radius: 5, thickness: 2, startAngle: .pi, endAngle: Angle.tau))
        case .upgrades:
            // arrow.up.circle: a ring with an arrow.
            add(.arc(center: c, radius: 10, thickness: 2, startAngle: 0, endAngle: Angle.tau))
            add(.polygon([c + Vec2(0, -6), c + Vec2(5, -1), c + Vec2(-5, -1)]))
            add(.roundedRect(center: c + Vec2(0, 2.5), size: Vec2(2.4, 8), cornerRadius: 1.2, rotation: 0))
        }
    }
}
