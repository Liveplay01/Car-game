import GameCore

public struct EdgeInsets: Sendable, Equatable {
    public var top: Double
    public var left: Double
    public var bottom: Double
    public var right: Double

    public init(top: Double, left: Double, bottom: Double, right: Double) {
        self.top = top
        self.left = left
        self.bottom = bottom
        self.right = right
    }

    public static let zero = EdgeInsets(top: 0, left: 0, bottom: 0, right: 0)
}

/// Maps world units onto the window or screen (points, y-down).
///
/// The world has the same size on every device; only the zoom changes (FOUNDATION.md 2.1).
public struct Camera: Sendable, Equatable {
    /// Size of the drawing area in points.
    public var viewport: Vec2
    /// World point shown at `focus`.
    public var center: Vec2
    /// Screen point where `center` appears.
    public var focus: Vec2
    /// Points per world unit.
    public var scale: Double

    public init(viewport: Vec2, center: Vec2, focus: Vec2, scale: Double) {
        self.viewport = viewport
        self.center = center
        self.focus = focus
        self.scale = scale
    }

    public func toScreen(_ p: Vec2) -> Vec2 {
        Vec2(focus.x + (p.x - center.x) * scale, focus.y - (p.y - center.y) * scale)
    }

    public func toWorld(_ p: Vec2) -> Vec2 {
        Vec2(center.x + (p.x - focus.x) / scale, center.y - (p.y - focus.y) / scale)
    }

    public func toScreen(length: Double) -> Double { length * scale }

    /// World angles turn counter-clockwise (y-up), screen angles clockwise (y-down).
    public func toScreen(angle: Double) -> Double { -angle }

    /// Largest zoom at which `bounds` fits inside the viewport minus `insets`.
    /// `verticalBias` is the share of spare height placed above the content.
    public static func fit(
        _ bounds: Rect,
        viewport: Vec2,
        insets: EdgeInsets = .zero,
        verticalBias: Double = 0.5
    ) -> Camera {
        let available = Vec2(
            max(1, viewport.x - insets.left - insets.right),
            max(1, viewport.y - insets.top - insets.bottom)
        )
        let scale = min(available.x / bounds.width, available.y / bounds.height)
        let contentHeight = bounds.height * scale
        let spare = available.y - contentHeight
        let focus = Vec2(
            insets.left + available.x / 2,
            insets.top + spare * verticalBias + contentHeight / 2
        )
        return Camera(viewport: viewport, center: bounds.center, focus: focus, scale: scale)
    }
}
