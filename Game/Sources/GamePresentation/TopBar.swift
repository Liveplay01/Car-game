import Foundation
import GameCore

/// The top of the Game tab (Leo, 25.09.2026: the old band was ugly; redone after the
/// apple-design skill). No opaque band any more: the road runs on underneath, a soft scrim
/// keeps the top readable, and one floating card of chrome holds three columns — a small
/// caption over each value, so every number says what it is.
///
/// Before a shift it reads MONEY · CARS · BEST, while playing MONEY · SCORE · BEST (the race
/// against the best time in its place when there is one), after it the result with the money
/// counting up. Always the same card in the
/// same place, so the screen changes what it says, never where it says it.
enum TopBar {
    static let margin = 16.0
    static let top = 10.0
    static let height = 58.0
    static let corner = 20.0
    /// Where the scrim under the card has faded out.
    static let scrim = 120.0
    /// Caption and value rows, from the card's top.
    static let captionRow = 18.0
    static let valueRow = 38.0

    static func frame(width: Double, height: Double = TopBar.height) -> Rect {
        Rect(minX: margin, minY: top, maxX: width - margin, maxY: top + height)
    }

    /// Left, centre, right: 30 %, 40 %, 30 %.
    static func columns(_ frame: Rect) -> (left: Rect, center: Rect, right: Rect) {
        let side = frame.width * 0.3
        let left = Rect(minX: frame.minX, minY: frame.minY, maxX: frame.minX + side, maxY: frame.maxY)
        let right = Rect(minX: frame.maxX - side, minY: frame.minY, maxX: frame.maxX, maxY: frame.maxY)
        let center = Rect(minX: left.maxX, minY: frame.minY, maxX: right.minX, maxY: frame.maxY)
        return (left, center, right)
    }

    /// The ground darkening towards the top edge: a scroll-edge fade, no divider.
    static func addScrim(height: Double = TopBar.scrim, id: inout Int, to list: inout RenderList) {
        let width = list.camera.viewport.x
        let steps = 12
        for step in 0..<steps {
            let slice = height / Double(steps)
            let center = Vec2(width / 2, slice * (Double(step) + 0.5))
            let opacity = 0.94 * (1 - Ease.smoothstep((Double(step) + 0.5) / Double(steps)))
            list.add(.roundedRect(center: center, size: Vec2(width, slice + 0.5), cornerRadius: 0, rotation: 0), color: list.background, opacity: opacity, space: .screen, id: id)
            id += 1
        }
    }

    /// The card, with hairline separators between its columns.
    static func addCard(_ frame: Rect, separators: Bool = true, opacity: Double = 1, id: inout Int, to list: inout RenderList) {
        MenuKit.chromePanel(frame, radius: corner, opacity: opacity, id: &id, to: &list)
        guard separators else { return }
        let columns = columns(frame)
        for x in [columns.left.maxX, columns.right.minX] {
            list.add(.line(from: Vec2(x, frame.minY + 14), to: Vec2(x, frame.maxY - 14), thickness: 1), color: .chromeEdge, opacity: opacity, space: .screen, id: id)
            id += 1
        }
    }

    /// A caption over a value, aligned to its column: leading on the left, centred in the
    /// middle, trailing on the right.
    static func addColumn(_ column: Rect, alignment: TextAlignment, caption: String, captionColor: ColorToken = .muted, value: String, valueSize: Double = 20, valueColor: ColorToken = .primary, opacity: Double = 1, id: inout Int, to list: inout RenderList) {
        let x = anchor(column, alignment)
        list.add(.text(caption, position: Vec2(x, column.minY + captionRow), size: 10, alignment: alignment, weight: .bold), color: captionColor, opacity: opacity, space: .screen, id: id)
        list.add(.text(value, position: Vec2(x, column.minY + valueRow), size: valueSize, alignment: alignment, weight: .bold), color: valueColor, opacity: opacity, space: .screen, id: id + 1)
        id += 2
    }

    /// A caption over the money, with its note, aligned like `addColumn`. Large amounts get
    /// a smaller size instead of running out of the column.
    static func addMoneyColumn(_ column: Rect, alignment: TextAlignment, caption: String = Strings.HUD.moneyLabel, captionColor: ColorToken = .muted, money: String, valueSize: Double = 20, opacity: Double = 1, id: inout Int, to list: inout RenderList) {
        let x = anchor(column, alignment)
        list.add(.text(caption, position: Vec2(x, column.minY + captionRow), size: 10, alignment: alignment, weight: .bold), color: captionColor, opacity: opacity, space: .screen, id: id)
        id += 1
        let room = column.width - 24
        let natural = Icons.textWidth(Strings.money(money), size: valueSize)
        let size = natural <= room ? valueSize : max(11, valueSize * room / natural)
        Icons.moneyTag(money, at: Vec2(x, column.minY + valueRow), size: size, alignment: alignment, color: .primary, opacity: opacity, id: &id, to: &list)
    }

    static func anchor(_ column: Rect, _ alignment: TextAlignment) -> Double {
        switch alignment {
        case .leading: column.minX + 16
        case .center: column.center.x
        case .trailing: column.maxX - 16
        }
    }
}
