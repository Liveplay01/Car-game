import Foundation
import GameCore

/// City Evolution (IDEA.md; ROADMAP.md, M9): around the roundabout the city grows with the
/// player's progress — more blocks and trees with every level, every arm and every module.
/// Pure drawing, computed from the shift's config, the same on every device. Kept flat and
/// quiet below the road, so it never competes with the traffic.
enum CityLayer {
    /// Everything that counts as progress, as one number.
    static func growth(config: Config) -> Int {
        config.level + 4 * max(0, config.builtArmSlots.count - 4) + 3 * config.modules.count
    }

    /// How many lots are built at this growth: a few from the start, up to a full city.
    static func lots(growth: Int) -> Int {
        min(64, 8 + growth)
    }

    static func add(world: World, to list: inout RenderList) {
        let layout = world.layout
        let count = lots(growth: growth(config: world.config))
        let armAngles = layout.arms.map(\.angle)
        var id = RenderID.city
        var placed = 0
        var candidate = 0
        // Candidates in a fixed order; the ones on a road are skipped, so the same lots are
        // always built first and the city only ever adds to itself.
        while placed < count, candidate < count * 4 {
            defer { candidate += 1 }
            let angle = WeatherLayer.unitHash(candidate, 11) * Angle.tau
            let clearOfRoads = armAngles.allSatisfy { abs(Angle.wrap(angle - $0 + .pi, period: Angle.tau) - .pi) > 0.32 }
            guard clearOfRoads else { continue }
            let distance = layout.ringRadius + 70 + WeatherLayer.unitHash(candidate, 12) * 230
            let center = Vec2(angle: angle) * distance
            let isTree = WeatherLayer.unitHash(candidate, 13) < 0.35
            if isTree {
                list.add(.circle(center: center, radius: 7 + 5 * WeatherLayer.unitHash(candidate, 14)), color: .island, opacity: 0.9, space: .world, id: id)
            } else {
                let size = Vec2(26 + 30 * WeatherLayer.unitHash(candidate, 15), 22 + 26 * WeatherLayer.unitHash(candidate, 16))
                list.add(.roundedRect(center: center, size: size, cornerRadius: 3, rotation: angle), color: .surface, opacity: 0.55, space: .world, id: id)
                id += 1
                // A roof edge, a touch lighter: the block reads as a building, not a hole.
                list.add(.roundedRect(center: center, size: size - Vec2(8, 8), cornerRadius: 2, rotation: angle), color: .kerb, opacity: 0.35, space: .world, id: id)
            }
            id += 1
            placed += 1
        }
    }
}
