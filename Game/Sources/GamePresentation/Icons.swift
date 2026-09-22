import Foundation
import GameCore

/// Small glyphs drawn from the same shapes as everything else: no font, no image files, so
/// the test window and the app show the same thing. In the app these can become SF Symbols
/// ("banknote"), which is why each one is a single call (FOUNDATION.md 3).
public enum Icons {
    /// A banknote. Every price and every balance carries it, so a number that means money is
    /// never read as points — no currency sign, no word.
    public static func money(at center: Vec2, height: Double, color: ColorToken = .accent, opacity: Double = 1, id: inout Int, to list: inout RenderList) {
        let width = height * 1.8
        list.add(.roundedRect(center: center, size: Vec2(width, height), cornerRadius: height * 0.24, rotation: 0), color: color, opacity: opacity, space: .screen, id: id)
        id += 1
        list.add(.circle(center: center, radius: height * 0.26), color: .background, opacity: opacity * 0.9, space: .screen, id: id)
        id += 1
        for side in [-1.0, 1.0] {
            list.add(
                .roundedRect(center: center + Vec2(width * 0.33 * side, 0), size: Vec2(height * 0.1, height * 0.36), cornerRadius: height * 0.05, rotation: 0),
                color: .background, opacity: opacity * 0.9, space: .screen, id: id
            )
            id += 1
        }
    }

    /// Roughly how wide a piece of text is. The renderers measure exactly; this is enough to
    /// place an icon beside a number.
    static func textWidth(_ text: String, size: Double) -> Double { Double(text.count) * size * 0.52 }

    /// A note and a number as one unit. `position` is the anchor the whole unit aligns to.
    public static func moneyTag(
        _ text: String,
        at position: Vec2,
        size: Double,
        alignment: TextAlignment,
        color: ColorToken,
        noteColor: ColorToken = .accent,
        opacity: Double = 1,
        id: inout Int,
        to list: inout RenderList
    ) {
        let noteHeight = size * 0.74
        let noteWidth = noteHeight * 1.8
        let gap = size * 0.34
        let total = noteWidth + gap + textWidth(text, size: size)
        let left: Double = switch alignment {
        case .leading: position.x
        case .center: position.x - total / 2
        case .trailing: position.x - total
        }
        money(at: Vec2(left + noteWidth / 2, position.y), height: noteHeight, color: noteColor, opacity: opacity, id: &id, to: &list)
        list.add(
            .text(text, position: Vec2(left + noteWidth + gap, position.y), size: size, alignment: .leading, weight: .bold),
            color: color, opacity: opacity, space: .screen, id: id
        )
        id += 1
    }
}
