import Foundation
import GameCore

/// What a map skin does to the city around the roundabout (Leo, 25.09.2026): the ground
/// outside the ring takes the map's colour, the lots take its tint, and where trees stood
/// the map's own plants grow — cacti in the sand, pines in the forest, cherry trees for
/// Sakura. The ground stays dark, so cars, HUD and effects read the same on every map.
/// No skin: the plain night city as before.
public enum MapTheme: String, Sendable, CaseIterable {
    case dusk, sand, neon, forest, autumn, sakura, aurora, ember

    public init?(skin: String?) {
        guard let skin, let theme = MapTheme(rawValue: skin) else { return nil }
        self = theme
    }

    /// The ground under the whole scene.
    public static func ground(_ theme: MapTheme?) -> ColorToken {
        switch theme {
        case nil: .background
        case .dusk: .groundDusk
        case .sand: .groundSand
        case .neon: .groundNeon
        case .forest: .groundForest
        case .autumn: .groundAutumn
        case .sakura: .groundSakura
        case .aurora: .groundAurora
        case .ember: .groundEmber
        }
    }

    /// The map's own colour: the island tint, and the paint of its details.
    var tint: ColorToken {
        switch self {
        case .dusk: .mapDusk
        case .sand: .mapSand
        case .neon: .mapNeon
        case .forest: .mapForest
        case .autumn: .mapAutumn
        case .sakura: .mapSakura
        case .aurora: .mapAurora
        case .ember: .mapEmber
        }
    }

    // MARK: - Drawing

    /// Where a lot or plant stands: the same hashes the city uses, so the map only swaps
    /// what grows there.
    static func hash(_ index: Int, _ salt: UInt64) -> Double { WeatherLayer.unitHash(index, salt) }

    /// Details lying on the ground, under the lots: dunes, leaves, petals, a neon grid, the
    /// northern lights. Drawn right after the ground, before anything stands on it.
    static func addGround(_ theme: MapTheme?, world: World, to list: inout RenderList) {
        guard let theme else { return }
        var id = RenderID.mapGround
        let ring = world.layout.ringRadius
        func add(_ primitive: Primitive, _ color: ColorToken, _ opacity: Double) {
            list.add(primitive, color: color, opacity: opacity, space: .world, id: id)
            id += 1
        }
        /// A point in the city around the ring, the same one for the same index.
        func spot(_ index: Int, _ salt: UInt64, from inner: Double = 30, to outer: Double = 360) -> Vec2 {
            Vec2(angle: hash(index, salt) * Angle.tau) * (ring + inner + hash(index, salt + 1) * (outer - inner))
        }
        switch theme {
        case .sand:
            // Long, soft dunes and a few pebbles.
            for index in 0..<14 {
                add(.circle(center: spot(index, 301), radius: 40 + 50 * hash(index, 303)), .mapSand, 0.06)
            }
            for index in 0..<40 {
                add(.circle(center: spot(index, 305), radius: 1.5 + 2 * hash(index, 307)), .mapSand, 0.25)
            }
        case .forest:
            // Moss patches under the trees.
            for index in 0..<16 {
                add(.circle(center: spot(index, 311), radius: 30 + 40 * hash(index, 313)), .mapForest, 0.07)
            }
        case .autumn:
            // Fallen leaves everywhere, orange and gold.
            for index in 0..<90 {
                add(.circle(center: spot(index, 321, from: 10), radius: 1.6 + 1.6 * hash(index, 323)), index % 3 == 0 ? .hazard : .mapAutumn, 0.35)
            }
        case .sakura:
            // Petals drifting over the ground.
            for index in 0..<80 {
                add(.circle(center: spot(index, 331, from: 10), radius: 1.4 + 1.2 * hash(index, 333)), .mapSakura, 0.45)
            }
        case .neon:
            // A faint grid of light over the whole city.
            let reach = ring + 380
            let step = 48.0
            var x = -reach
            while x <= reach {
                add(.line(from: Vec2(x, -reach), to: Vec2(x, reach), thickness: 1), .mapNeon, 0.06)
                add(.line(from: Vec2(-reach, x), to: Vec2(reach, x), thickness: 1), .mapNeon, 0.06)
                x += step
            }
        case .aurora:
            // The northern lights: wide, soft bands of green high above the ring.
            for band in 0..<4 {
                let radius = ring + 170 + Double(band) * 34
                add(.arc(center: Vec2(0, -ring * 0.4), radius: radius, thickness: 26 - Double(band) * 4, startAngle: 0.35 * .pi, endAngle: 0.65 * .pi + 0.05 * Double(band)), .mapAurora, 0.07 + 0.02 * Double(band))
            }
            for index in 0..<30 {
                add(.circle(center: spot(index, 341), radius: 12 + 20 * hash(index, 343)), .skinChrome, 0.05)
            }
        case .ember:
            // Cracks in the ground that glow.
            for index in 0..<24 {
                let from = spot(index, 351)
                let to = from + Vec2(angle: hash(index, 353) * Angle.tau) * (14 + 20 * hash(index, 355))
                add(.line(from: from, to: to, thickness: 1.6), .mapEmber, 0.35)
            }
        case .dusk:
            // Warm pools of light come from the lanterns (the lanterns are the plants).
            break
        }
    }

    /// What grows where a tree would stand. `size` is about the tree's radius.
    static func addPlant(_ theme: MapTheme?, at center: Vec2, size: Double, index: Int, id: inout Int, to list: inout RenderList) {
        func add(_ primitive: Primitive, _ color: ColorToken, _ opacity: Double = 1) {
            list.add(primitive, color: color, opacity: opacity, space: .world, id: id)
            id += 1
        }
        guard let theme else {
            add(.circle(center: center, radius: size), .island, 0.9)
            return
        }
        switch theme {
        case .sand:
            // A saguaro: a trunk and two arms bending up, and its shadow.
            let height = size * 2.2
            add(.circle(center: center + Vec2(2, -2), radius: size * 0.7), .background, 0.25)
            add(.roundedRect(center: center + Vec2(0, height * 0.25), size: Vec2(size * 0.55, height), cornerRadius: size * 0.27, rotation: 0), .mapForest, 0.9)
            let side = index % 2 == 0 ? 1.0 : -1.0
            add(.roundedRect(center: center + Vec2(side * size * 0.55, height * 0.3), size: Vec2(size * 0.4, height * 0.45), cornerRadius: size * 0.2, rotation: 0), .mapForest, 0.9)
            add(.roundedRect(center: center + Vec2(-side * size * 0.5, height * 0.15), size: Vec2(size * 0.35, height * 0.3), cornerRadius: size * 0.17, rotation: 0), .mapForest, 0.9)
        case .forest, .aurora:
            // A pine from three tiers; under snow on Aurora.
            let color: ColorToken = theme == .aurora ? .skinChrome : .mapForest
            for tier in 0..<3 {
                let width = size * (1.5 - 0.35 * Double(tier))
                let base = center + Vec2(0, Double(tier) * size * 0.6 - size * 0.5)
                add(.polygon([base + Vec2(-width, 0), base + Vec2(width, 0), base + Vec2(0, size * 1.1)]), color, theme == .aurora ? 0.55 : 0.85)
            }
        case .autumn:
            // A round crown in two shades.
            add(.circle(center: center, radius: size * 1.1), .mapAutumn, 0.75)
            add(.circle(center: center + Vec2(size * 0.3, size * 0.25), radius: size * 0.6), .hazard, 0.4)
        case .sakura:
            // A cherry tree: a cloud of blossoms.
            for blossom in 0..<5 {
                let offset = Vec2(angle: Double(blossom) * 1.26 + hash(index, 361)) * size * 0.55
                add(.circle(center: center + offset, radius: size * 0.62), .mapSakura, 0.55)
            }
            add(.circle(center: center, radius: size * 0.35), .skinRose, 0.7)
        case .neon:
            // A post with a glowing head.
            add(.circle(center: center, radius: size * 1.1), .mapNeon, 0.08)
            add(.circle(center: center, radius: size * 0.5), .mapNeon, 0.2)
            add(.circle(center: center, radius: size * 0.22), .mapNeon, 0.9)
        case .dusk:
            // A lantern with a warm pool of light.
            add(.circle(center: center, radius: size * 2.2), .fireCore, 0.05)
            add(.circle(center: center, radius: size * 1.1), .fireCore, 0.1)
            add(.circle(center: center, radius: size * 0.3), .fireCore, 0.9)
        case .ember:
            // A dark rock with a glowing seam.
            add(.circle(center: center, radius: size), .wreck, 0.9)
            add(.line(from: center - Vec2(size * 0.6, size * 0.2), to: center + Vec2(size * 0.5, size * 0.3), thickness: 1.5), .mapEmber, 0.8)
        }
    }
}
