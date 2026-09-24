import GameCore

/// Coordinate space of a render item.
public enum Space: Sendable, Equatable {
    /// World units, y-up, angles counter-clockwise. The camera converts them.
    case world
    /// Points, origin top-left, y-down, angles clockwise.
    case screen
}

public enum TextAlignment: Sendable, Equatable {
    case leading
    case center
    case trailing
}

public enum FontWeight: Sendable, Equatable {
    case regular
    case bold
}

/// Simple building blocks every platform can draw with little code (FOUNDATION.md 4.1).
public enum Primitive: Sendable, Equatable {
    case roundedRect(center: Vec2, size: Vec2, cornerRadius: Double, rotation: Double)
    case circle(center: Vec2, radius: Double)
    /// Band along a circle between two angles; a full ring if the span is 2π or more.
    case arc(center: Vec2, radius: Double, thickness: Double, startAngle: Double, endAngle: Double)
    case line(from: Vec2, to: Vec2, thickness: Double)
    /// Filled outline, e.g. a dented car body. Star-shaped around its centre point.
    case polygon([Vec2])
    /// `size` is in points in both spaces, so text stays readable at any zoom.
    /// `position` is the anchor: leading, centre or trailing edge, vertically centred.
    case text(String, position: Vec2, size: Double, alignment: TextAlignment, weight: FontWeight)
}

public struct RenderItem: Sendable, Equatable {
    /// Stable per object across frames, so the app can reuse one SpriteKit node per id.
    public var id: Int
    public var primitive: Primitive
    public var color: ColorToken
    public var opacity: Double
    public var space: Space

    public init(id: Int, primitive: Primitive, color: ColorToken, opacity: Double = 1, space: Space) {
        self.id = id
        self.primitive = primitive
        self.color = color
        self.opacity = opacity
        self.space = space
    }
}

/// Everything one frame shows, in drawing order.
public struct RenderList: Sendable {
    public var camera: Camera
    public var background: ColorToken
    public var items: [RenderItem] = []

    public init(camera: Camera, background: ColorToken) {
        self.camera = camera
        self.background = background
    }

    public mutating func add(
        _ primitive: Primitive,
        color: ColorToken,
        opacity: Double = 1,
        space: Space,
        id: Int
    ) {
        items.append(RenderItem(id: id, primitive: primitive, color: color, opacity: opacity, space: space))
    }
}

/// Id ranges, so ids stay stable and never collide.
enum RenderID {
    static let city = 500
    static let road = 1_000
    static let debug = 10_000
    static let overlay = 20_000
    static let weather = 26_000
    static let labels = 27_000
    static let towTrucks = 90_000
    static let flowGlow = 29_000
    static let hud = 30_000
    static let popups = 31_000
    static let menu = 40_000
    static let notice = 48_000
    static let effects = 100_000
    static let shadows = 900_000
    static let vehicles = 1_000_000

    /// Outline, body, parts, cracks and flames of one vehicle (`CarArt.Slot`).
    static let partsPerVehicle = 39

    static func vehicle(_ id: Int, part: Int) -> Int { vehicles + id * partsPerVehicle + part }
    static func shadow(_ id: Int) -> Int { shadows + id }
}
