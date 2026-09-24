import Foundation
import GameCore

/// Weather and city events on screen (ROADMAP.md, M8). Only drawing: what they do to the
/// traffic is in `GameCore` (`Weather.swift`, `CityEvents.swift`).
///
/// Fair first (IDEA.md): the dark and the rain lie under the vehicles or stay faint above
/// them, and the HUD — warnings, countdowns, the combo — is drawn after all of it.
/// Reduce Motion keeps the rain but drops the lightning.
enum WeatherLayer {
    /// How dark each weather makes the scene, clear … extreme.
    static let darkness = [0.0, 0.08, 0.16, 0.24, 0.3]
    /// Rain streaks on screen, clear … extreme.
    static let streaks = [0, 40, 90, 130, 170]

    /// Under the vehicles: the scene darkens, heavy weather closes in from the edges.
    static func addGround(world: World, to list: inout RenderList) {
        let severity = world.config.weather.severity
        guard severity > 0 else { return }
        let viewport = list.camera.viewport
        var id = RenderID.weather
        list.add(.roundedRect(center: viewport / 2, size: viewport, cornerRadius: 0, rotation: 0),
                 color: .scrim, opacity: darkness[severity], space: .screen, id: id)
        id += 1
        guard severity >= Weather.heavyRain.severity else { return }
        // Worse sight at the edges, never over the middle of the ring.
        let band = viewport.y * 0.12
        for y in [band / 2, viewport.y - band / 2] {
            list.add(.roundedRect(center: Vec2(viewport.x / 2, y), size: Vec2(viewport.x, band), cornerRadius: 0, rotation: 0),
                     color: .scrim, opacity: 0.1 * Double(severity - 1), space: .screen, id: id)
            id += 1
        }
    }

    /// Above the vehicles, below the HUD: rain streaks and, in a storm, lightning.
    static func addAir(world: World, time: Double, reduceMotion: Bool, to list: inout RenderList) {
        let severity = world.config.weather.severity
        guard severity > 0 else { return }
        let viewport = list.camera.viewport
        var id = RenderID.weather + 10
        let count = streaks[severity]
        let fall = 900.0 + 150 * Double(severity)
        let slant = Vec2(-0.18, 1)
        let length = 10 + 4 * Double(severity)
        for index in 0..<count {
            // Fixed per streak, so the rain is the same on every device and every frame.
            let x = unitHash(index, 1) * (viewport.x + 60) - 30
            let phase = unitHash(index, 2)
            let speed = fall * (0.8 + 0.4 * unitHash(index, 3))
            let y = (phase * viewport.y + time * speed).truncatingRemainder(dividingBy: viewport.y + 40) - 20
            let start = Vec2(x + (y / viewport.y) * -40, y)
            list.add(.line(from: start, to: start + slant * length, thickness: 1.2),
                     color: .primary, opacity: 0.1 + 0.03 * Double(severity), space: .screen, id: id)
            id += 1
        }
        // Lightning: a short, soft flash now and then. None with Reduce Motion.
        guard !reduceMotion, severity >= Weather.storm.severity else { return }
        let period = severity >= Weather.extreme.severity ? 4.5 : 7.0
        let into = time.truncatingRemainder(dividingBy: period)
        if into < 0.14 {
            let flash = 0.16 * (1 - into / 0.14)
            list.add(.roundedRect(center: viewport / 2, size: viewport, cornerRadius: 0, rotation: 0),
                     color: .primary, opacity: flash, space: .screen, id: RenderID.weather + 5)
        }
    }

    /// On the road: roadworks as a striped stretch with cones, a closed arm as a barrier.
    static func addCityEvent(world: World, to list: inout RenderList) {
        let layout = world.layout
        var id = RenderID.weather + 400
        if let start = world.roadworksRingS {
            let arc = world.config.roadworksArc
            let radius = layout.ringRadius + layout.laneWidth / 2 - 3
            // Hazard stripes along the outer edge.
            let pieces = max(2, Int(arc / 12))
            for piece in 0..<pieces where piece.isMultiple(of: 2) {
                let from = (start + arc * Double(piece) / Double(pieces)) / layout.ringRadius
                let to = (start + arc * Double(piece + 1) / Double(pieces)) / layout.ringRadius
                list.add(.arc(center: .zero, radius: radius, thickness: 4, startAngle: from, endAngle: to),
                         color: .hazard, opacity: 0.9, space: .world, id: id)
                id += 1
            }
            // Cones at the stretch's ends and middle.
            for share in [0.0, 0.5, 1.0] {
                let pose = layout.ring.pose(at: Angle.wrap(start + arc * share, period: layout.ring.length))
                let outward = pose.position.normalized
                list.add(.circle(center: pose.position + outward * (layout.laneWidth / 2 + 4), radius: 3.5),
                         color: .hazard, space: .world, id: id)
                id += 1
            }
        }
        if let closed = world.config.closedArmSlot, let arm = layout.arms.first(where: { $0.slot == closed }) {
            let stop = layout.stopPose(arm)
            let across = Vec2(angle: stop.heading + .pi / 2)
            let half = layout.laneWidth * 0.55
            list.add(.line(from: stop.position - across * half, to: stop.position + across * half, thickness: 5),
                     color: .hazard, space: .world, id: id)
            id += 1
            for side in [-0.5, 0.0, 0.5] {
                let at = stop.position + across * (half * side)
                list.add(.line(from: at - across * 2, to: at + across * 2, thickness: 5), color: .destructive, space: .world, id: id)
                id += 1
            }
        }
    }

    /// 0…1, the same for the same inputs on every platform.
    static func unitHash(_ index: Int, _ salt: UInt64) -> Double {
        var x = UInt64(truncatingIfNeeded: index) &* 0x9E37_79B9_7F4A_7C15 ^ salt &* 0xBF58_476D_1CE4_E5B9
        x ^= x >> 31
        x = x &* 0x94D0_49BB_1331_11EB
        x ^= x >> 29
        return Double(x >> 11) / Double(1 << 53)
    }
}
