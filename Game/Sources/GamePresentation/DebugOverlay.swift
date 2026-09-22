import GameCore

/// A short-lived label where something was rated or crashed.
public struct DebugMarker: Sendable, Equatable {
    public enum Kind: Sendable, Equatable {
        case merge(gap: Double)
        case crash
    }

    public static let lifetime = 1.6

    public var kind: Kind
    /// World position.
    public var position: Vec2
    public var age: Double
}

/// Values the world does not know.
public struct DebugStats: Sendable, Equatable {
    public var fps: Int
    public var timeScale: Double
    /// Tuning values that differ from `Config.swift`.
    public var tuningChanges: Int

    public init(fps: Int, timeScale: Double, tuningChanges: Int = 0) {
        self.fps = fps
        self.timeScale = timeScale
        self.tuningChanges = tuningChanges
    }
}

/// F1 overlay: hitboxes, measured gaps, FPS and seed. Makes every crash traceable,
/// no "but that was free!" (FOUNDATION.md 6).
enum DebugOverlay {
    static func add(
        world: World,
        alpha: Double,
        markers: [DebugMarker],
        stats: DebugStats,
        to list: inout RenderList
    ) {
        addHitboxes(world: world, alpha: alpha, to: &list)
        addLiveGaps(world: world, to: &list)
        addMarkers(markers, world: world, to: &list)
        addPanel(world: world, stats: stats, to: &list)
    }

    /// Capsule outlines: two half circles joined by two lines.
    static func addHitboxes(world: World, alpha: Double, to list: inout RenderList) {
        let camera = list.camera
        var id = RenderID.debug
        // Wrecks too: live traffic can run into them.
        for vehicle in world.vehicles where vehicle.isCollidable || vehicle.isCrashed {
            let capsule = world.hitbox(at: SceneBuilder.interpolatedPose(vehicle, alpha: alpha))
            let a = camera.toScreen(capsule.a)
            let b = camera.toScreen(capsule.b)
            let r = camera.toScreen(length: capsule.radius)
            let direction = (b - a).normalized
            let side = direction.left * r
            let angle = direction.angle
            let parts: [Primitive] = [
                .arc(center: b, radius: r, thickness: 1.5, startAngle: angle - .pi / 2, endAngle: angle + .pi / 2),
                .arc(center: a, radius: r, thickness: 1.5, startAngle: angle + .pi / 2, endAngle: angle + 3 * .pi / 2),
                .line(from: a + side, to: b + side, thickness: 1.5),
                .line(from: a - side, to: b - side, thickness: 1.5),
            ]
            for part in parts {
                list.add(part, color: .debugHitbox, space: .screen, id: id)
                id += 1
            }
        }
    }

    /// For each merging player car: line to the nearest car, current and smallest gap so far.
    static func addLiveGaps(world: World, to list: inout RenderList) {
        let camera = list.camera
        var id = RenderID.debug + 5_000
        for vehicle in world.vehicles where vehicle.owner == .player {
            guard case let .merging(merge) = vehicle.phase else { continue }
            let me = world.hitbox(of: vehicle)
            var nearest: Collision.Contact?
            for other in world.vehicles where other.id != vehicle.id && other.isCollidable {
                let contact = Collision.contact(me, world.hitbox(of: other))
                if nearest == nil || contact.gap < nearest!.gap {
                    nearest = contact
                }
            }
            let label = camera.toScreen(vehicle.position) + Vec2(0, -26)
            guard let nearest else {
                list.add(
                    .text(Strings.Debug.gap(.infinity), position: label, size: Metrics.debugTextSize, alignment: .center, weight: .bold),
                    color: .debugClean, space: .screen, id: id
                )
                id += 1
                continue
            }
            let seconds = max(nearest.gap, 0) / world.ringSpeed
            let color: ColorToken = seconds < world.config.tightFitSeconds ? .debugTight : .debugClean
            list.add(
                .line(from: camera.toScreen(nearest.pointA), to: camera.toScreen(nearest.pointB), thickness: 1.5),
                color: color, space: .screen, id: id
            )
            list.add(
                .text(Strings.Debug.liveGap(now: seconds, min: merge.minGap), position: label, size: Metrics.debugTextSize, alignment: .center, weight: .bold),
                color: color, space: .screen, id: id + 1
            )
            id += 2
        }
    }

    /// Result of each finished merge and each crash, fading out.
    static func addMarkers(_ markers: [DebugMarker], world: World, to list: inout RenderList) {
        let camera = list.camera
        var id = RenderID.debug + 7_000
        for marker in markers {
            let opacity = 1 - Ease.inCubic(marker.age / DebugMarker.lifetime)
            let point = camera.toScreen(marker.position)
            switch marker.kind {
            case let .merge(gap):
                let tight = gap < world.config.tightFitSeconds
                list.add(
                    .text(tight ? Strings.Debug.tight(gap) : Strings.Debug.gap(gap), position: point + Vec2(0, -24), size: Metrics.debugTextSize, alignment: .center, weight: .bold),
                    color: tight ? .debugTight : .debugClean, opacity: opacity, space: .screen, id: id
                )
            case .crash:
                list.add(
                    .arc(center: point, radius: 10, thickness: 2, startAngle: 0, endAngle: Angle.tau),
                    color: .destructive, opacity: opacity, space: .screen, id: id
                )
                list.add(
                    .text(Strings.Debug.crash, position: point + Vec2(0, -24), size: Metrics.debugTextSize, alignment: .center, weight: .bold),
                    color: .destructive, opacity: opacity, space: .screen, id: id + 1
                )
            }
            id += 2
        }
    }

    static func criminalState(_ world: World) -> String {
        switch world.criminal.phase {
        case let .idle(next): next.isFinite ? "next \(Int(max(0, next - world.time).rounded())) s" : "none"
        case .warning: "warning"
        case .arriving: "arriving"
        case let .active(_, deadline): "\(String(format: "%.1f", max(0, deadline - world.time))) s"
        case .leaving: "leaving"
        }
    }

    static func transporterState(_ world: World) -> String {
        switch world.transporter.phase {
        case let .idle(next): next.isFinite ? "next \(Int(max(0, next - world.time).rounded())) s" : "none"
        case .warning: "warning"
        case .arriving: "arriving"
        case let .active(_, deadline): "\(String(format: "%.1f", max(0, deadline - world.time))) s"
        case .seized: "seized"
        case .leaving: "leaving"
        }
    }

    /// Below the HUD band, top left.
    static func addPanel(world: World, stats: DebugStats, to list: inout RenderList) {
        let margin = Metrics.debugMargin
        let top = Metrics.sceneInsets.top + 4
        let lineHeight = Metrics.debugLineHeight
        var lines = [
            Strings.Debug.fps(stats.fps),
            Strings.Debug.seed(world.seed),
            Strings.Debug.time(world.time),
            Strings.Debug.timeScale(stats.timeScale),
            Strings.Debug.cars(onRoad: world.roadCount, target: world.targetDensity),
            Strings.Debug.ringSpeed(world.ringSpeed),
            Strings.Debug.criminal(criminalState(world)),
            Strings.Debug.transporter(transporterState(world)),
        ]
        if stats.tuningChanges > 0 {
            lines.append(Strings.Debug.tuning(changes: stats.tuningChanges))
        }
        let size = Vec2(170, Double(lines.count) * lineHeight + 12)
        var id = RenderID.overlay
        list.add(
            .roundedRect(center: Vec2(margin, top) + size / 2, size: size, cornerRadius: 8, rotation: 0),
            color: .debugPanel, space: .screen, id: id
        )
        for (index, line) in lines.enumerated() {
            id += 1
            list.add(
                .text(line, position: Vec2(margin + 10, top + 6 + lineHeight * (Double(index) + 0.5)), size: Metrics.debugTextSize, alignment: .leading, weight: .regular),
                color: .primary, space: .screen, id: id
            )
        }
        let viewport = list.camera.viewport
        list.add(
            .text(Strings.Debug.controls, position: Vec2(viewport.x / 2, viewport.y - 14), size: 13, alignment: .center, weight: .regular),
            color: .muted, space: .screen, id: id + 1
        )
    }
}
