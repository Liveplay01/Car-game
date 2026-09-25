import Foundation
import GameCore

/// One city, seen from different places (Leo, 25.09.2026: "Der Ring hört niemals auf"). The
/// tabs are not screens over a stopped game: the roundabout keeps running under every one of
/// them, and the camera glides to the view that tab needs.
///
/// - **Street**: the game's own view (Game tab, result, settings).
/// - **Builder**: a step back. The real roundabout lies exactly under the Street Builder's
///   plan, and the roads run on into the city around it.
/// - **Shop**: the camera turns into the city, the ring drifts to the edge.
/// - **Upgrades**: the ring stays where it is, a little closer; the city around it recedes
///   (`addRecede`).
enum Perspective: Sendable, Equatable {
    case street
    case builder
    case shop
    case upgrades

    init(_ screen: Screen) {
        switch screen {
        case .page(.streetBuilder): self = .builder
        case .page(.shop): self = .shop
        case .page(.upgrades): self = .upgrades
        case .page(.game), .ready, .settings, .playing, .result: self = .street
        }
    }

    /// The glide from one view to the next: a camera move, so a little slower than the
    /// screens over it (`ScreenTransition.duration`).
    static let glide = 0.65
    /// Where the Shop looks: a district up and to the left of the ring.
    static let shopDirection = 2.3
    static let shopDistance = 150.0
    static let shopZoom = 0.74
    static let upgradesZoom = 1.06

    func camera(layout: RoundaboutLayout, viewport: Vec2, bottomInset: Double) -> Camera {
        let street = Camera.fit(layout.viewBounds, viewport: viewport, insets: Metrics.sceneInsets, verticalBias: Metrics.sceneVerticalBias)
        switch self {
        case .street:
            return street
        case .builder:
            // The real ring exactly under the plan: same centre, same radius on screen.
            let map = StreetBuilderPage.map(viewport: viewport, bottomInset: bottomInset)
            return Camera(viewport: viewport, center: .zero, focus: map.center, scale: map.radius / layout.ringRadius)
        case .shop:
            let center = Vec2(angle: Self.shopDirection) * (layout.ringRadius + Self.shopDistance)
            return Camera(viewport: viewport, center: center, focus: Vec2(viewport.x / 2, viewport.y * 0.45), scale: street.scale * Self.shopZoom)
        case .upgrades:
            var camera = street
            camera.scale *= Self.upgradesZoom
            return camera
        }
    }

    /// Between two cameras: the zoom in steps of equal feel (geometric), the rest straight.
    static func blend(_ a: Camera, _ b: Camera, _ t: Double) -> Camera {
        Camera(
            viewport: b.viewport,
            center: .lerp(a.center, b.center, t),
            focus: .lerp(a.focus, b.focus, t),
            scale: a.scale * pow(b.scale / a.scale, t)
        )
    }

    /// The camera on its way: where it started, and how long it has glided. The session keeps
    /// one and asks it every frame for the camera to draw with.
    struct Rig: Sendable {
        var perspective: Perspective?
        /// What the view was framed around: a new ring size (an arm built) glides too.
        var ringRadius = 0.0
        var from: Camera?
        var age = 0.0
        var shown: Camera?

        mutating func camera(_ perspective: Perspective, layout: RoundaboutLayout, viewport: Vec2, bottomInset: Double, delta: Double, reduceMotion: Bool) -> Camera {
            let target = perspective.camera(layout: layout, viewport: viewport, bottomInset: bottomInset)
            let moved = perspective != self.perspective || layout.ringRadius != ringRadius
            if moved, let shown, !reduceMotion, self.perspective != nil {
                from = shown
                age = 0
            } else {
                age += delta
            }
            self.perspective = perspective
            ringRadius = layout.ringRadius
            var camera = target
            if let from, age < Perspective.glide, from.viewport == viewport {
                camera = Perspective.blend(from, target, Ease.settle(age / Perspective.glide))
            } else {
                from = nil
            }
            shown = camera
            return camera
        }
    }

    /// Upgrades: the city around the ring steps back into the dark, the ring itself stays.
    /// A soft band of the ground colour from just outside the ring to past the screen's corners.
    static func addRecede(opacity: Double, layout: RoundaboutLayout, to list: inout RenderList) {
        guard opacity > 0.001 else { return }
        let camera = list.camera
        let center = camera.toScreen(.zero)
        let inner = camera.toScreen(length: layout.ringRadius + layout.laneWidth / 2 + 10)
        let far = (camera.viewport + Vec2(abs(center.x - camera.viewport.x / 2), abs(center.y - camera.viewport.y / 2)) * 2).length
        var id = RenderID.recede
        // The edge in steps, so it fades in instead of starting at a line.
        let steps = 5
        let feather = 60.0
        for step in 0..<steps {
            let from = inner + feather * Double(step) / Double(steps)
            list.add(.arc(center: center, radius: from + feather / Double(steps) / 2, thickness: feather / Double(steps) + 0.5, startAngle: 0, endAngle: Angle.tau),
                     color: list.background, opacity: opacity * 0.6 * Double(step + 1) / Double(steps + 1), space: .screen, id: id)
            id += 1
        }
        let start = inner + feather
        list.add(.arc(center: center, radius: (start + far) / 2, thickness: far - start, startAngle: 0, endAngle: Angle.tau),
                 color: list.background, opacity: opacity * 0.6, space: .screen, id: id)
    }
}
