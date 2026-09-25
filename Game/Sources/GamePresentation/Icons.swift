import Foundation
import GameCore

/// Small glyphs drawn from the same shapes as everything else: no font, no image files, so
/// the test window and the app show the same thing. In the app these can become SF Symbols
/// ("banknote"), which is why each one is a single call (FOUNDATION.md 3).
public enum Icons {
    /// A banknote. Every price and every balance carries it, so a number that means money is
    /// never read as points — no currency sign, no word.
    public static func money(at center: Vec2, height: Double, color: ColorToken = .accent, opacity: Double = 1, id: inout Int, to list: inout RenderList) {
        for (primitive, tint, alpha) in moneyShapes(at: center, height: height, color: color) {
            list.add(primitive, color: tint, opacity: opacity * alpha, space: .screen, id: id)
            id += 1
        }
    }

    /// The note's shapes in screen points: the bill, the coin in the middle, two marks.
    static func moneyShapes(at center: Vec2, height: Double, color: ColorToken) -> [(Primitive, ColorToken, Double)] {
        let width = height * 1.8
        var shapes: [(Primitive, ColorToken, Double)] = [
            (.roundedRect(center: center, size: Vec2(width, height), cornerRadius: height * 0.24, rotation: 0), color, 1),
            (.circle(center: center, radius: height * 0.26), .background, 0.9),
        ]
        for side in [-1.0, 1.0] {
            shapes.append((.roundedRect(center: center + Vec2(width * 0.33 * side, 0), size: Vec2(height * 0.1, height * 0.36), cornerRadius: height * 0.05, rotation: 0), .background, 0.9))
        }
        return shapes
    }

    // MARK: - Money inside a text

    /// Stands for the banknote inside a text (`Strings.money`): the renderers draw the note in
    /// its place, so money carries the icon in a sentence too, never the word "cash"
    /// (Leo, 25.09.2026). In the app it is the SF Symbol "banknote".
    public static let moneyMark: Character = "\u{E000}"

    public enum TextPiece: Sendable, Equatable {
        case text(String)
        case money
    }

    /// A text cut at its notes, in order. Plain text comes back as one piece.
    public static func pieces(_ text: String) -> [TextPiece] {
        var pieces: [TextPiece] = []
        var run = ""
        for character in text {
            if character == moneyMark {
                if !run.isEmpty { pieces.append(.text(run)) }
                run = ""
                pieces.append(.money)
            } else {
                run.append(character)
            }
        }
        if !run.isEmpty { pieces.append(.text(run)) }
        return pieces
    }

    /// How much room a note takes in a line of `size`-point text, with a little air on both sides.
    public static func inlineMoneyWidth(size: Double) -> Double { size * 0.72 * 1.8 + size * 0.3 }

    /// The note in a line of `size`-point text, centred on `center` (screen points), in the
    /// accent, so a renderer draws it like any other item.
    public static func inlineMoney(at center: Vec2, size: Double, opacity: Double) -> [RenderItem] {
        moneyShapes(at: center, height: size * 0.72, color: .accent).map { primitive, tint, alpha in
            RenderItem(id: 0, primitive: primitive, color: tint, opacity: opacity * alpha, space: .screen)
        }
    }

    /// Roughly how wide a piece of text is. The renderers measure exactly; this is enough to
    /// place an icon beside a number.
    static func textWidth(_ text: String, size: Double) -> Double {
        pieces(text).reduce(0) { width, piece in
            switch piece {
            case let .text(run): width + Double(run.count) * size * 0.52
            case .money: width + inlineMoneyWidth(size: size)
            }
        }
    }

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
