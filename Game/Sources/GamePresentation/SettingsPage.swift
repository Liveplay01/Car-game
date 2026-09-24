import GameCore

/// The settings in the test window, drawn like an iOS settings sheet: a large title, "Done"
/// in the corner, one inset grouped list with coloured icon tiles, switches for on/off and
/// the value on the right for choices. The app shows a native `Form` instead (CLAUDE.md).
/// The rows come from `ScreenContent`, so the texts and values have one source.
public enum SettingsPage {
    static let rowHeight = 50.0
    static let margin = 16.0

    /// The rows (every item but the one that closes the page) and where they sit.
    static func rows(_ content: ScreenContent, viewport: Vec2) -> [(item: MenuItem, rect: Rect)] {
        let items = content.items.filter { $0.action != .closeSettings }
        let top = Metrics.sceneInsets.top + 44
        return items.enumerated().map { index, item in
            let y = top + Double(index) * rowHeight
            return (item, Rect(minX: margin, minY: y, maxX: viewport.x - margin, maxY: y + rowHeight))
        }
    }

    static func doneRect(viewport: Vec2) -> Rect {
        let y = Metrics.sceneInsets.top - 22
        return Rect(minX: viewport.x - 90, minY: y - 18, maxX: viewport.x - 8, maxY: y + 18)
    }

    /// What a click at `point` does: a row's action, or closing the page.
    public static func action(at point: Vec2, content: ScreenContent, viewport: Vec2) -> ScreenAction? {
        if doneRect(viewport: viewport).contains(point) { return .closeSettings }
        return rows(content, viewport: viewport).first { $0.rect.contains(point) }?.item.action
    }

    static func add(_ content: ScreenContent, showsKeys: Bool, to list: inout RenderList) {
        let viewport = list.camera.viewport
        var id = RenderID.menu
        func text(_ string: String, _ at: Vec2, size: Double, weight: FontWeight = .regular, color: ColorToken, alignment: TextAlignment = .leading) {
            list.add(.text(string, position: at, size: size, alignment: alignment, weight: weight), color: color, space: .screen, id: id)
            id += 1
        }
        list.add(.roundedRect(center: viewport / 2, size: viewport, cornerRadius: 0, rotation: 0), color: .background, opacity: 0.94, space: .screen, id: id)
        id += 1
        text(content.title, Vec2(MenuKit.margin, Metrics.sceneInsets.top - 22), size: MenuKit.titleSize, weight: .bold, color: .primary)
        let done = doneRect(viewport: viewport)
        text(Strings.Menu.done, Vec2(done.maxX - 12, done.center.y), size: 17, weight: .bold, color: .accent, alignment: .trailing)

        let rows = rows(content, viewport: viewport)
        guard let first = rows.first?.rect, let last = rows.last?.rect else { return }
        let group = Rect(minX: first.minX, minY: first.minY, maxX: first.maxX, maxY: last.maxY)
        list.add(.roundedRect(center: group.center, size: Vec2(group.width, group.height), cornerRadius: 12, rotation: 0), color: .surface, space: .screen, id: id)
        id += 1
        for (index, row) in rows.enumerated() {
            let rect = row.rect
            let tile = Vec2(rect.minX + 28, rect.center.y)
            list.add(.roundedRect(center: tile, size: Vec2(30, 30), cornerRadius: 8, rotation: 0), color: tint(row.item.action), space: .screen, id: id)
            id += 1
            glyph(row.item.action, at: tile, id: &id, to: &list)
            var label = row.item.label
            if showsKeys { label = "\(index + 1)  " + label }
            text(label, Vec2(rect.minX + 54, rect.center.y), size: 16, color: .primary)
            if let value = row.item.value {
                let isOn = value == Strings.SettingsMenu.on
                if isOn || value == Strings.SettingsMenu.off {
                    addSwitch(isOn, at: Vec2(rect.maxX - 38, rect.center.y), id: &id, to: &list)
                } else {
                    // A choice: its value and a chevron, like a navigation row.
                    text(value, Vec2(rect.maxX - 30, rect.center.y), size: 16, color: .muted, alignment: .trailing)
                    // The chevron as two strokes: the font has no "›".
                    let tip = Vec2(rect.maxX - 14, rect.center.y)
                    for end in [Vec2(-5, -5), Vec2(-5, 5)] {
                        list.add(.line(from: tip, to: tip + end, thickness: 2), color: .muted, space: .screen, id: id)
                        id += 1
                    }
                }
            }
            // Hairlines between rows, inset past the icon like in iOS.
            if index < rows.count - 1 {
                list.add(.line(from: Vec2(rect.minX + 54, rect.maxY), to: Vec2(rect.maxX, rect.maxY), thickness: 1), color: .separator, space: .screen, id: id)
                id += 1
            }
        }
        if showsKeys {
            text(Strings.Keys.settingsHint, Vec2(margin + 4, group.maxY + 22), size: 12, color: .muted)
        }
    }

    /// An iOS switch: green track with the knob right when on, a grey track when off.
    static func addSwitch(_ isOn: Bool, at center: Vec2, id: inout Int, to list: inout RenderList) {
        let size = Vec2(46, 28)
        list.add(.roundedRect(center: center, size: size, cornerRadius: size.y / 2, rotation: 0), color: isOn ? .juiceGreen : .controlFill, space: .screen, id: id)
        id += 1
        let knob = center + Vec2((isOn ? 1 : -1) * (size.x - size.y) / 2, 0)
        list.add(.circle(center: knob + Vec2(0, 1), radius: size.y / 2 - 2), color: .shadow, space: .screen, id: id)
        id += 1
        list.add(.circle(center: knob, radius: size.y / 2 - 2.5), color: .primary, space: .screen, id: id)
        id += 1
    }

    /// The colour of a row's icon tile, like the Settings app.
    static func tint(_ action: ScreenAction) -> ColorToken {
        switch action {
        case .toggleSound: .juiceRed
        case .toggleHaptics: .juicePurple
        case .cycleReduceMotion: .juiceBlue
        case .toggleVehicleLabels: .juiceGreen
        default: .controlThumb
        }
    }

    /// A small white glyph on the tile: speaker, vibration, motion, tag.
    static func glyph(_ action: ScreenAction, at c: Vec2, id: inout Int, to list: inout RenderList) {
        func add(_ primitive: Primitive) {
            list.add(primitive, color: .primary, space: .screen, id: id)
            id += 1
        }
        switch action {
        case .toggleSound:
            add(.roundedRect(center: c + Vec2(-5, 0), size: Vec2(4, 6), cornerRadius: 1, rotation: 0))
            add(.polygon([c + Vec2(-4, -3), c + Vec2(1, -7), c + Vec2(1, 7), c + Vec2(-4, 3)]))
            add(.arc(center: c + Vec2(1, 0), radius: 5, thickness: 1.6, startAngle: -0.8, endAngle: 0.8))
        case .toggleHaptics:
            add(.roundedRect(center: c, size: Vec2(7, 13), cornerRadius: 2, rotation: 0))
            add(.line(from: c + Vec2(-7, -3), to: c + Vec2(-7, 3), thickness: 1.6))
            add(.line(from: c + Vec2(7, -3), to: c + Vec2(7, 3), thickness: 1.6))
        case .cycleReduceMotion:
            add(.arc(center: c, radius: 7, thickness: 1.8, startAngle: 0.3, endAngle: Angle.tau - 0.3))
            add(.circle(center: c, radius: 2.4))
        case .toggleVehicleLabels:
            add(.polygon([c + Vec2(-7, -5), c + Vec2(3, -5), c + Vec2(8, 0), c + Vec2(3, 5), c + Vec2(-7, 5)]))
        default:
            add(.circle(center: c, radius: 3))
        }
    }
}
