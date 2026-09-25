import Foundation
import GameCore

/// What a map skin does to the city around the roundabout (Leo, 25.09.2026): the ground
/// outside the ring takes the map's colour, the lots take its tint, and where trees stood
/// the map's own plants grow — cacti in the sand, pines in the forest, cherry trees for
/// Sakura. Some maps bring more: Sakura a koi pond, a torii, lanterns, a raked gravel island
/// and petals on the wind; Snowfall its snow, Meadow fireflies, Cosmos shooting stars.
/// The ground stays dark, so cars, HUD and effects read the same on every map; what drifts
/// through the air stays small and faint, and Reduce Motion stills all of it.
/// No skin: the plain night city as before.
public enum MapTheme: String, Sendable, CaseIterable {
    case dusk, sand, neon, forest, autumn, sakura, aurora, ember
    case meadow, tropic, snowfall, cosmos

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
        case .meadow: .groundMeadow
        case .tropic: .groundTropic
        case .snowfall: .groundSnow
        case .cosmos: .groundCosmos
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
        case .meadow: .mapMeadow
        case .tropic: .mapTropic
        case .snowfall: .mapSnow
        case .cosmos: .mapCosmos
        }
    }

    // MARK: - Layout

    /// Where a lot or plant stands: the same hashes the city uses, so the map only swaps
    /// what grows there.
    static func hash(_ index: Int, _ salt: UInt64) -> Double { WeatherLayer.unitHash(index, salt) }

    /// A map's centrepiece — Sakura's koi pond, Tropic's lagoon, Snowfall's frozen pond,
    /// Meadow's windmill, Cosmos' ringed planet — sits in the open city above the ring, as
    /// far from every road as it can.
    static let pondRadius = 30.0

    var hasCentrepiece: Bool {
        switch self {
        case .sakura, .tropic, .snowfall, .meadow, .cosmos: true
        case .dusk, .sand, .neon, .forest, .autumn, .aurora, .ember: false
        }
    }

    static func pondCenter(_ layout: RoundaboutLayout) -> Vec2? {
        let distance = layout.ringRadius + 78
        var best: (center: Vec2, clearance: Double)?
        for step in 0...8 {
            let angle = .pi * (0.33 + 0.34 * Double(step) / 8)
            let center = Vec2(angle: angle) * distance
            let clearance = layout.arms.map { arm in
                let along = center.dot(arm.outward)
                return along < 0 ? center.length : (center - arm.outward * along).length
            }.min() ?? .infinity
            if best == nil || clearance > best!.clearance + 0.5 { best = (center, clearance) }
        }
        // The pond, its stones and the torii need the room between road and pond.
        guard let best, best.clearance > pondRadius + layout.laneWidth + 26 else { return nil }
        return best.center
    }

    /// Whether the city keeps a lot at `point` free: a map keeps its centrepiece and the
    /// avenues along the roads open.
    static func keepsClear(_ theme: MapTheme?, _ point: Vec2, layout: RoundaboutLayout) -> Bool {
        guard let theme else { return false }
        if theme.hasCentrepiece, let pond = pondCenter(layout), point.distance(to: pond) < pondRadius + 38 { return true }
        return layout.arms.contains { arm in
            let along = point.dot(arm.outward)
            return along > 0 && (point - arm.outward * along).length < layout.laneWidth + 40
        }
    }

    /// Whether a thing this big at `center` shows on screen at all.
    static func onScreen(_ center: Vec2, _ radius: Double, _ camera: Camera) -> Bool {
        let at = camera.toScreen(center)
        let r = camera.toScreen(length: radius)
        return at.x > -r && at.y > -r && at.x < camera.viewport.x + r && at.y < camera.viewport.y + r
    }

    // MARK: - Ground

    /// Details lying on the ground, under the lots: dunes, leaves, petals, a neon grid, the
    /// northern lights, Sakura's pond. Drawn right after the ground, before anything stands
    /// on it. `time` moves the koi, the twinkling stars and the water; nil stills them.
    static func addGround(_ theme: MapTheme?, world: World, time: Double? = nil, to list: inout RenderList) {
        guard let theme else { return }
        var id = RenderID.mapGround
        let ring = world.layout.ringRadius
        let camera = list.camera
        func add(_ primitive: Primitive, _ color: ColorToken, _ opacity: Double) {
            list.add(primitive, color: color, opacity: opacity, space: .world, id: id)
            id += 1
        }
        /// A wide patch with a soft edge: three layers, each a little smaller, so it fades
        /// out instead of ending in a hard circle.
        func soft(_ center: Vec2, _ radius: Double, _ color: ColorToken, _ opacity: Double) {
            for layer in 0..<3 {
                add(.circle(center: center, radius: radius * (1 - 0.22 * Double(layer))), color, opacity * 0.45)
            }
        }
        /// A point in the city around the ring, the same one for the same index.
        func spot(_ index: Int, _ salt: UInt64, from inner: Double = 30, to outer: Double = 360) -> Vec2 {
            Vec2(angle: hash(index, salt) * Angle.tau) * (ring + inner + hash(index, salt + 1) * (outer - inner))
        }
        switch theme {
        case .sand:
            // Long, soft dunes and a few pebbles.
            for index in 0..<14 {
                soft(spot(index, 301), 40 + 50 * hash(index, 303), .mapSand, 0.06)
            }
            for index in 0..<40 {
                add(.circle(center: spot(index, 305), radius: 1.5 + 2 * hash(index, 307)), .mapSand, 0.25)
            }
        case .forest:
            // Moss patches under the trees.
            for index in 0..<16 {
                soft(spot(index, 311), 30 + 40 * hash(index, 313), .mapForest, 0.07)
            }
        case .autumn:
            // Fallen leaves everywhere, orange and gold.
            for index in 0..<90 {
                add(.circle(center: spot(index, 321, from: 10), radius: 1.6 + 1.6 * hash(index, 323)), index % 3 == 0 ? .hazard : .mapAutumn, 0.35)
            }
        case .sakura:
            addSakuraGround(world: world, time: time, id: &id, to: &list)
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
                soft(spot(index, 341), 12 + 20 * hash(index, 343), .skinChrome, 0.05)
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
        case .meadow:
            defer { if let spot = pondCenter(world.layout) { addWindmill(at: spot, time: time, id: &id, to: &list) } }
            // Grass in tufts and wild flowers in four colours.
            for index in 0..<18 {
                soft(spot(index, 401), 26 + 34 * hash(index, 403), .skinFern, 0.06)
            }
            let flowers: [ColorToken] = [.mapMeadow, .primary, .skinRose, .skinSky]
            for index in 0..<80 {
                let at = spot(index, 405, from: 12)
                guard onScreen(at, 3, camera) else { continue }
                add(.circle(center: at, radius: 1.1 + 0.8 * hash(index, 407)), flowers[index % flowers.count], 0.55)
            }
        case .tropic:
            // Sandy patches, shells, and the lagoon.
            for index in 0..<16 {
                soft(spot(index, 411), 14 + 20 * hash(index, 413), .mapSand, 0.06)
            }
            for index in 0..<40 {
                let at = spot(index, 419, from: 12)
                guard onScreen(at, 3, camera) else { continue }
                add(.circle(center: at, radius: 0.9 + hash(index, 421)), index % 4 == 0 ? .skinCoral : .skinPearl, 0.4)
            }
            if let spot = pondCenter(world.layout) { addLagoon(at: spot, time: time, id: &id, to: &list) }
        case .snowfall:
            defer { if let spot = pondCenter(world.layout) { addFrozenPond(at: spot, time: time, id: &id, to: &list) } }
            // Snow drifts, sledge tracks and snow that sparkles.
            for index in 0..<22 {
                soft(spot(index, 431), 16 + 26 * hash(index, 433), .mapSnow, 0.05)
            }
            for index in 0..<5 {
                let center = spot(index, 435, from: 90, to: 300)
                let start = hash(index, 437) * Angle.tau
                for rail in [-2.2, 2.2] {
                    add(.arc(center: center, radius: 46 + rail, thickness: 0.9, startAngle: start, endAngle: start + 1.1), .mapSnow, 0.18)
                }
            }
            for index in 0..<50 {
                let at = spot(index, 439, from: 12)
                guard onScreen(at, 2, camera) else { continue }
                let twinkle = time.map { pow(max(0, sin($0 * 2.2 + Double(index) * 1.7)), 8) } ?? 0.3
                add(.circle(center: at, radius: 0.6 + 0.8 * twinkle), .primary, 0.2 + 0.6 * twinkle)
            }
        case .cosmos:
            defer { if let spot = pondCenter(world.layout) { addPlanet(at: spot, time: time, id: &id, to: &list) } }
            // Deep space: nebula clouds and stars that twinkle.
            let clouds: [ColorToken] = [.juicePurple, .juiceBlue, .skinRose]
            for index in 0..<12 {
                soft(spot(index, 441), 40 + 60 * hash(index, 443), clouds[index % clouds.count], 0.035)
            }
            for index in 0..<150 {
                let at = spot(index, 445, from: 8)
                guard onScreen(at, 2, camera) else { continue }
                let bright = hash(index, 447)
                let twinkle = time.map { 0.55 + 0.45 * sin($0 * (1.2 + 2 * bright) + Double(index)) } ?? 0.8
                add(.circle(center: at, radius: 0.5 + 1.1 * bright * bright), bright > 0.85 ? .mapCosmos : .primary, (0.25 + 0.6 * bright) * twinkle)
            }
        }
    }

    /// Sakura's ground: moss, a carpet of petals, and the koi pond with its stepping stones
    /// and torii gate.
    private static func addSakuraGround(world: World, time: Double?, id: inout Int, to list: inout RenderList) {
        let layout = world.layout
        let ring = layout.ringRadius
        let camera = list.camera
        func add(_ primitive: Primitive, _ color: ColorToken, _ opacity: Double) {
            list.add(primitive, color: color, opacity: opacity, space: .world, id: id)
            id += 1
        }
        func soft(_ center: Vec2, _ radius: Double, _ color: ColorToken, _ opacity: Double) {
            for layer in 0..<3 {
                add(.circle(center: center, radius: radius * (1 - 0.22 * Double(layer))), color, opacity * 0.45)
            }
        }
        func spot(_ index: Int, _ salt: UInt64, from inner: Double = 12, to outer: Double = 360) -> Vec2 {
            Vec2(angle: hash(index, salt) * Angle.tau) * (ring + inner + hash(index, salt + 1) * (outer - inner))
        }
        // Soft moss and a haze of fallen blossom.
        for index in 0..<14 {
            soft(spot(index, 331, from: 40), 28 + 36 * hash(index, 332), .mapForest, 0.05)
        }
        for index in 0..<10 {
            soft(spot(index, 334, from: 30), 22 + 30 * hash(index, 335), .mapSakura, 0.035)
        }
        // Petals lying everywhere: small ovals, turned every which way.
        for index in 0..<80 {
            let at = spot(index, 336)
            guard onScreen(at, 3, camera) else { continue }
            let length = 1.8 + 1.2 * hash(index, 338)
            add(.roundedRect(center: at, size: Vec2(length, length * 0.6), cornerRadius: length * 0.3, rotation: hash(index, 339) * .pi),
                index % 3 == 0 ? .sakuraPale : .mapSakura, 0.35 + 0.3 * hash(index, 340))
        }

        guard let pond = pondCenter(layout) else { return }
        let r = pondRadius
        let toRing = (-pond).normalized
        // Stepping stones from the ring's side to the water, and a torii over the path.
        for (step, along) in [r + 7, r + 14, r + 22].enumerated() {
            let side = toRing.left * (step % 2 == 0 ? 2.5 : -2.5)
            add(.roundedRect(center: pond + toRing * along + side, size: Vec2(6, 4.6), cornerRadius: 2.2, rotation: toRing.angle + 0.3 * Double(step % 2)), .stone, 0.55)
        }
        let gate = pond + toRing * (r + 18)
        let across = toRing.left
        // Seen from above: the shadow, the two posts, the red crossbeam and its black cap.
        add(.roundedRect(center: gate + Vec2(2.5, -2.5), size: Vec2(4, 30), cornerRadius: 1.5, rotation: across.angle - .pi / 2), .background, 0.35)
        for post in [-9.0, 9.0] {
            add(.circle(center: gate + across * post, radius: 1.8), .torii, 1)
        }
        add(.roundedRect(center: gate - toRing * 1.8, size: Vec2(2, 24), cornerRadius: 0.8, rotation: across.angle - .pi / 2), .torii, 0.9)
        add(.roundedRect(center: gate, size: Vec2(3.6, 30), cornerRadius: 1.6, rotation: across.angle - .pi / 2), .torii, 1)
        add(.roundedRect(center: gate + toRing * 0.6, size: Vec2(1.4, 31), cornerRadius: 0.7, rotation: across.angle - .pi / 2), .vehicleTire, 0.85)

        // The pond: a rim of stones, deep water, a lighter shelf, and the koi.
        add(.circle(center: pond, radius: r + 4.5), .stone, 0.5)
        for index in 0..<14 {
            let at = pond + Vec2(angle: Double(index) / 14 * Angle.tau + hash(index, 351) * 0.2) * (r + 3)
            add(.circle(center: at, radius: 2.4 + 1.6 * hash(index, 352)), .stone, 0.75)
        }
        add(.circle(center: pond, radius: r), .water, 1)
        add(.circle(center: pond, radius: r * 0.72), .background, 0.22)
        add(.arc(center: pond, radius: r - 3, thickness: 3, startAngle: 0, endAngle: Angle.tau), .mapTropic, 0.08)
        let t = time ?? 0
        let koi: [(color: ColorToken, spot: ColorToken?, radius: Double, speed: Double)] = [
            (.skinKoi, .primary, r * 0.55, 0.45), (.primary, .skinKoi, r * 0.35, -0.6), (.skinGold, nil, r * 0.68, 0.32),
        ]
        for (index, fish) in koi.enumerated() {
            let angle = t * fish.speed + Double(index) * 2.2
            let at = pond + Vec2(angle: angle) * fish.radius
            // Along the circle, the way it swims; the tail beats.
            let heading = angle + (fish.speed > 0 ? .pi / 2 : -.pi / 2)
            let forward = Vec2(angle: heading)
            let beat = sin(t * 7 + Double(index)) * 0.5
            let tail = at - forward * 4.2
            add(.polygon([tail, tail - Vec2(angle: heading + beat + 0.5) * 3.2, tail - Vec2(angle: heading + beat - 0.5) * 3.2]), fish.color, 0.85)
            add(.roundedRect(center: at, size: Vec2(7.5, 2.8), cornerRadius: 1.4, rotation: heading), fish.color, 0.95)
            if let spotColor = fish.spot {
                add(.circle(center: at + forward * 1.2, radius: 1.1), spotColor, 0.9)
            }
        }
        // Lily pads with their notch, and petals floating on the water.
        for index in 0..<4 {
            let at = pond + Vec2(angle: 0.6 + Double(index) * 1.7) * r * (0.45 + 0.35 * hash(index, 355))
            let turn = hash(index, 356) * Angle.tau
            add(.circle(center: at, radius: 4.2), .mapForest, 0.85)
            add(.polygon([at, at + Vec2(angle: turn - 0.35) * 4.4, at + Vec2(angle: turn + 0.35) * 4.4]), .water, 1)
            if index == 1 {
                add(.circle(center: at + Vec2(1, 1), radius: 1.6), .sakuraPale, 0.95)
            }
        }
        for index in 0..<7 {
            let drift = t * 0.05 * (hash(index, 358) - 0.5)
            let at = pond + Vec2(angle: hash(index, 357) * Angle.tau + drift) * r * (0.2 + 0.7 * hash(index, 359))
            add(.roundedRect(center: at, size: Vec2(2.2, 1.4), cornerRadius: 0.7, rotation: hash(index, 360) * .pi + drift * 3), .mapSakura, 0.8)
        }
        // A soft sheen on the water.
        add(.arc(center: pond + Vec2(-4, 5), radius: r * 0.6, thickness: 1.2, startAngle: 0.55 * .pi, endAngle: 0.95 * .pi), .primary, 0.12 + (time.map { 0.05 * sin($0 * 0.8) } ?? 0))
    }

    // MARK: - Centrepieces

    /// Tropic's lagoon: a beach, clear shallow water with light playing on it, a little
    /// island with a palm, and a wooden jetty from the road's side.
    private static func addLagoon(at center: Vec2, time: Double?, id: inout Int, to list: inout RenderList) {
        func add(_ primitive: Primitive, _ color: ColorToken, _ opacity: Double) {
            list.add(primitive, color: color, opacity: opacity, space: .world, id: id)
            id += 1
        }
        let r = pondRadius
        let toRing = (-center).normalized
        add(.circle(center: center, radius: r + 9), .mapSand, 0.14)
        add(.circle(center: center, radius: r + 3.5), .mapSand, 0.32)
        add(.circle(center: center, radius: r), .water, 1)
        add(.circle(center: center, radius: r - 2), .mapTropic, 0.3)
        add(.circle(center: center - toRing * 4, radius: r * 0.55), .water, 0.35)
        let t = time ?? 0
        for wave in 0..<5 {
            let phase = t * 0.6 + Double(wave) * 1.9
            let at = center + Vec2(sin(phase) * r * 0.35, (Double(wave) - 2) * r * 0.3)
            add(.line(from: at - Vec2(r * 0.18, 0), to: at + Vec2(r * 0.18, 0), thickness: 1.1), .primary, 0.14 + 0.08 * sin(phase * 1.7))
        }
        // The jetty: planks on two beams, from the beach out over the water.
        let from = r * 0.35
        let to = r + 8
        let mid = center + toRing * ((from + to) / 2)
        add(.roundedRect(center: mid + Vec2(1.5, -1.5), size: Vec2(to - from, 5), cornerRadius: 1, rotation: toRing.angle), .background, 0.35)
        add(.roundedRect(center: mid, size: Vec2(to - from, 5), cornerRadius: 1, rotation: toRing.angle), .skinLatte, 0.9)
        var plank = from + 3
        while plank < to - 1 {
            let at = center + toRing * plank
            add(.line(from: at + toRing.left * 2.4, to: at - toRing.left * 2.4, thickness: 0.5), .skinMocha, 0.6)
            plank += 3
        }
        // An island with its palm, across from the jetty.
        let isle = center - toRing * (r * 0.32) + toRing.left * (r * 0.28)
        add(.circle(center: isle, radius: 8.5), .mapSand, 0.85)
        addPalm(at: isle, size: 6, index: 7, id: &id, to: &list)
    }

    /// Snowfall's frozen pond: snow banked around the ice, the tracks of skates on it, and
    /// two skaters gliding their circles.
    private static func addFrozenPond(at center: Vec2, time: Double?, id: inout Int, to list: inout RenderList) {
        func add(_ primitive: Primitive, _ color: ColorToken, _ opacity: Double) {
            list.add(primitive, color: color, opacity: opacity, space: .world, id: id)
            id += 1
        }
        let r = pondRadius
        for index in 0..<14 {
            let at = center + Vec2(angle: Double(index) / 14 * Angle.tau + hash(index, 481) * 0.3) * (r + 2)
            add(.circle(center: at, radius: 4.5 + 3.5 * hash(index, 482)), .mapSnow, 0.35)
        }
        add(.circle(center: center, radius: r), .skinIce, 0.24)
        add(.circle(center: center + Vec2(-5, 5), radius: r * 0.55), .primary, 0.05)
        for index in 0..<7 {
            let start = hash(index, 483) * Angle.tau
            add(.arc(center: center + Vec2(angle: start) * r * 0.1, radius: r * (0.3 + 0.55 * hash(index, 484)), thickness: 0.6, startAngle: start, endAngle: start + 1 + 2 * hash(index, 485)), .primary, 0.22)
        }
        let t = time ?? 0
        let skaters: [(color: ColorToken, radius: Double, speed: Double)] = [(.skinRuby, r * 0.55, 0.55), (.skinSky, r * 0.32, -0.75)]
        for (index, skater) in skaters.enumerated() {
            let angle = t * skater.speed + Double(index) * 2.5
            let at = center + Vec2(angle: angle) * skater.radius
            let back = Vec2(angle: angle + (skater.speed > 0 ? -.pi / 2 : .pi / 2))
            add(.line(from: at, to: at + back * 5, thickness: 1), skater.color, 0.6)
            add(.circle(center: at, radius: 2.3), skater.color, 0.95)
            add(.circle(center: at, radius: 1.2), .skinPearl, 0.95)
        }
    }

    /// Meadow's windmill beside a field of tulips in coloured rows; the sails turn.
    private static func addWindmill(at center: Vec2, time: Double?, id: inout Int, to list: inout RenderList) {
        func add(_ primitive: Primitive, _ color: ColorToken, _ opacity: Double) {
            list.add(primitive, color: color, opacity: opacity, space: .world, id: id)
            id += 1
        }
        let r = pondRadius
        let toRing = (-center).normalized
        let across = toRing.left
        // The field: rows of tulips, one colour each.
        let rows: [ColorToken] = [.juiceRed, .mapMeadow, .skinRose, .primary, .skinCoral, .juiceYellow]
        let field = center - across * 8
        add(.roundedRect(center: field, size: Vec2(42, 36), cornerRadius: 3, rotation: across.angle), .mapForest, 0.35)
        for (row, color) in rows.enumerated() {
            let line = field + toRing * (Double(row) - 2.5) * 5.6
            for spot in 0..<8 {
                add(.circle(center: line + across * (Double(spot) - 3.5) * 5, radius: 1.5), color, 0.85)
            }
        }
        // The mill: its shadow, the round tower, the cap, and four sails.
        let mill = center + across * (r * 0.85)
        add(.circle(center: mill + Vec2(3, -3), radius: 8), .background, 0.4)
        add(.circle(center: mill, radius: 7.5), .skinLatte, 0.95)
        add(.circle(center: mill, radius: 5), .skinMocha, 0.95)
        let turn = (time ?? 0) * 0.7
        for sail in 0..<4 {
            let direction = Vec2(angle: turn + Double(sail) * .pi / 2)
            add(.roundedRect(center: mill + direction * 12, size: Vec2(19, 4), cornerRadius: 1, rotation: direction.angle), .skinCream, 0.85)
            add(.line(from: mill + direction * 3, to: mill + direction * 21.5, thickness: 0.7), .skinMocha, 0.8)
        }
        add(.circle(center: mill, radius: 1.6), .vehicleTire, 0.95)
    }

    /// Cosmos' ringed planet: a soft glow, the far half of its ring behind it, the lit globe
    /// with its bands, the near half of the ring in front, and a moon going round.
    private static func addPlanet(at center: Vec2, time: Double?, id: inout Int, to list: inout RenderList) {
        func add(_ primitive: Primitive, _ color: ColorToken, _ opacity: Double) {
            list.add(primitive, color: color, opacity: opacity, space: .world, id: id)
            id += 1
        }
        let radius = pondRadius * 0.55
        let tilt = 0.35
        func ellipse(_ a: Double, _ b: Double, _ angle: Double) -> Vec2 {
            center + Vec2(a * cos(angle), b * sin(angle)).rotated(by: tilt)
        }
        func ring(front: Bool) {
            let steps = 16
            for (band, (scale, color, opacity)) in [(1.9, ColorToken.mapCosmos, 0.6), (1.6, ColorToken.skinLatte, 0.45)].enumerated() {
                for step in 0..<steps {
                    let from = (Double(step) / Double(steps) + (front ? 0.5 : 0)) * .pi
                    let to = from + .pi / Double(steps)
                    add(.line(from: ellipse(radius * scale, radius * scale * 0.3, from), to: ellipse(radius * scale, radius * scale * 0.3, to), thickness: band == 0 ? 2.4 : 1.6), color, opacity)
                }
            }
        }
        let t = time ?? 0
        let moonAngle = t * 0.4
        let moon = ellipse(radius * 2.6, radius * 0.9, moonAngle)
        let moonBehind = sin(moonAngle) > 0
        func addMoon() {
            add(.circle(center: moon, radius: 3.2), .skinPearl, 0.95)
            add(.circle(center: moon + Vec2(1, -1), radius: 2.4), .groundCosmos, 0.4)
        }
        add(.circle(center: center, radius: radius * 2.4), .mapCosmos, 0.04)
        add(.circle(center: center, radius: radius * 1.5), .mapCosmos, 0.06)
        if moonBehind { addMoon() }
        ring(front: false)
        add(.circle(center: center, radius: radius), .skinCoral, 0.95)
        for y in [-0.35, 0.3] {
            add(.roundedRect(center: center + Vec2(0, y * radius).rotated(by: tilt), size: Vec2(radius * 1.7, 2.6), cornerRadius: 1.3, rotation: tilt), .skinLatte, 0.4)
        }
        add(.circle(center: center + Vec2(radius * 0.3, -radius * 0.3), radius: radius * 0.8), .groundCosmos, 0.35)
        ring(front: true)
        if !moonBehind { addMoon() }
    }

    // MARK: - Island

    /// The centre island of a map: Sakura rakes it into a gravel garden with three mossy
    /// rocks and a few petals blown in. Faint, so the combo in the middle reads first.
    static func addIsland(_ theme: MapTheme?, world: World, to list: inout RenderList) {
        guard theme == .sakura else { return }
        var id = RenderID.mapIsland
        func add(_ primitive: Primitive, _ color: ColorToken, _ opacity: Double) {
            list.add(primitive, color: color, opacity: opacity, space: .world, id: id)
            id += 1
        }
        let island = world.layout.ringRadius - world.layout.laneWidth / 2
        var radius = 16.0
        while radius < island - 22 {
            add(.arc(center: .zero, radius: radius, thickness: 1.1, startAngle: 0, endAngle: Angle.tau), .sakuraPale, 0.05)
            radius += 6.5
        }
        for index in 0..<3 {
            let at = Vec2(angle: 0.9 + Double(index) * 2.2) * island * 0.6
            for ripple in 1...3 {
                add(.arc(center: at, radius: 4 + Double(ripple) * 4, thickness: 1.1, startAngle: 0, endAngle: Angle.tau), .sakuraPale, 0.055)
            }
            add(.circle(center: at + Vec2(1.2, -1.2), radius: 4.8), .background, 0.35)
            add(.circle(center: at, radius: 4.5), .stone, 0.9)
            add(.circle(center: at + Vec2(-1.3, 1.1), radius: 2.4), .mapForest, 0.6)
        }
        for index in 0..<12 {
            let at = Vec2(angle: hash(index, 371) * Angle.tau) * island * (0.3 + 0.62 * hash(index, 372))
            add(.roundedRect(center: at, size: Vec2(2, 1.2), cornerRadius: 0.6, rotation: hash(index, 373) * .pi), index % 3 == 0 ? .sakuraPale : .mapSakura, 0.55)
        }
    }

    // MARK: - Plants

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
        guard onScreen(center, size * 2.5, list.camera) else { return }
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
            // Now and then a stone lantern glowing warm; otherwise a cherry tree in bloom.
            if index % 6 == 3 {
                addLantern(at: center, size: size, id: &id, to: &list)
            } else {
                addCherryTree(at: center, size: size, index: index, id: &id, to: &list)
            }
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
        case .meadow:
            addFlowerBush(at: center, size: size, index: index, id: &id, to: &list)
        case .tropic:
            if index % 4 == 2 {
                addParasol(at: center, size: size, index: index, id: &id, to: &list)
            } else {
                addPalm(at: center, size: size, index: index, id: &id, to: &list)
            }
        case .snowfall:
            if index % 5 == 3 {
                // A snowman from above: three balls, a hat, a carrot.
                add(.circle(center: center + Vec2(size * 0.35, -size * 0.35), radius: size * 0.85), .background, 0.3)
                add(.circle(center: center, radius: size * 0.8), .mapSnow, 0.95)
                add(.circle(center: center, radius: size * 0.55), .primary, 0.95)
                add(.circle(center: center, radius: size * 0.34), .vehicleTire, 0.95)
                add(.line(from: center, to: center + Vec2(angle: hash(index, 471) * Angle.tau) * size * 0.8, thickness: 1.4), .fireOuter, 0.95)
            } else {
                addSnowFir(at: center, size: size, id: &id, to: &list)
            }
        case .cosmos:
            // A little planet, lit from one side, some with a ring.
            let colors: [ColorToken] = [.skinCoral, .skinSky, .mapCosmos, .skinTeal]
            let color = colors[index % colors.count]
            add(.circle(center: center, radius: size * 1.6), color, 0.06)
            add(.circle(center: center, radius: size * 0.8), color, 0.95)
            add(.circle(center: center + Vec2(size * 0.25, -size * 0.25), radius: size * 0.65), .groundCosmos, 0.45)
            if index % 3 == 0 {
                add(.arc(center: center, radius: size * 1.2, thickness: 1.2, startAngle: 0, endAngle: Angle.tau), .mapCosmos, 0.55)
            }
        }
    }

    /// A round bush in flower.
    private static func addFlowerBush(at center: Vec2, size: Double, index: Int, id: inout Int, to list: inout RenderList) {
        func add(_ primitive: Primitive, _ color: ColorToken, _ opacity: Double = 1) {
            list.add(primitive, color: color, opacity: opacity, space: .world, id: id)
            id += 1
        }
        add(.circle(center: center + Vec2(size * 0.3, -size * 0.3), radius: size * 1.05), .background, 0.3)
        add(.circle(center: center, radius: size), .mapForest, 0.9)
        add(.circle(center: center + Vec2(-size * 0.25, size * 0.25), radius: size * 0.6), .skinFern, 0.7)
        let flowers: [ColorToken] = [.mapMeadow, .primary, .skinRose]
        for flower in 0..<5 {
            let at = center + Vec2(angle: Double(flower) * 1.3 + hash(index, 461) * 6) * size * (0.3 + 0.45 * hash(index * 5 + flower, 462))
            add(.circle(center: at, radius: size * 0.13), flowers[(index + flower) % flowers.count], 0.95)
        }
    }

    /// A fir under snow.
    private static func addSnowFir(at center: Vec2, size: Double, id: inout Int, to list: inout RenderList) {
        func add(_ primitive: Primitive, _ color: ColorToken, _ opacity: Double = 1) {
            list.add(primitive, color: color, opacity: opacity, space: .world, id: id)
            id += 1
        }
        add(.circle(center: center + Vec2(size * 0.35, -size * 0.35), radius: size * 1.1), .background, 0.3)
        add(.circle(center: center, radius: size * 1.05), .mapForest, 0.75)
        for lobe in 0..<4 {
            let at = center + Vec2(angle: 1.2 + Double(lobe) * 1.1) * size * 0.4
            add(.circle(center: at, radius: size * 0.5), .mapSnow, 0.85)
        }
    }

    /// A light at the roadside: a warm lamp (Dusk, Snowfall) or a star-coloured beacon.
    private static func addLamp(at center: Vec2, size: Double, color: ColorToken, id: inout Int, to list: inout RenderList) {
        list.add(.circle(center: center, radius: size * 2.2), color: color, opacity: 0.05, space: .world, id: id)
        list.add(.circle(center: center, radius: size * 1.1), color: color, opacity: 0.1, space: .world, id: id + 1)
        list.add(.circle(center: center, radius: size * 0.3), color: color, opacity: 0.9, space: .world, id: id + 2)
        id += 3
    }

    /// A cherry tree in full bloom from above: its shadow and a crown of blossom clusters —
    /// deep pink on the shaded side, pale where the light falls, with single white flowers
    /// on top.
    private static func addCherryTree(at center: Vec2, size: Double, index: Int, id: inout Int, to list: inout RenderList) {
        func add(_ primitive: Primitive, _ color: ColorToken, _ opacity: Double = 1) {
            list.add(primitive, color: color, opacity: opacity, space: .world, id: id)
            id += 1
        }
        let turn = hash(index, 361) * Angle.tau
        add(.circle(center: center + Vec2(size * 0.4, -size * 0.4), radius: size * 1.25), .background, 0.4)
        // No two crowns alike: the clusters differ in number, reach and size.
        let shade = Vec2(size * 0.1, -size * 0.1)
        let lobes = 4 + index % 3
        for lobe in 0..<lobes {
            let k = hash(index * 7 + lobe, 364)
            add(.circle(center: center + shade + Vec2(angle: turn + Double(lobe) * Angle.tau / Double(lobes)) * size * (0.45 + 0.2 * k), radius: size * (0.5 + 0.2 * k)), .sakuraDeep, 0.95)
        }
        add(.circle(center: center, radius: size * 0.72), .mapSakura, 1)
        for lobe in 0..<4 {
            let k = hash(index * 5 + lobe, 365)
            add(.circle(center: center - shade * 0.5 + Vec2(angle: turn + 0.6 + Double(lobe) * 1.571) * size * (0.38 + 0.16 * k), radius: size * (0.38 + 0.14 * k)), .mapSakura, 0.95)
        }
        for light in 0..<2 {
            add(.circle(center: center + Vec2(angle: 1.9 + Double(light) * 0.9) * size * 0.4, radius: size * 0.3), .sakuraPale, 0.85)
        }
        for flower in 0..<2 {
            let at = center + Vec2(angle: turn + Double(flower) * 2.1) * size * 0.35 * (0.5 + hash(index * 3 + flower, 363))
            add(.circle(center: at, radius: 0.75), .primary, 0.9)
        }
    }

    /// A stone lantern (tōrō) from above: a square foot, a hexagonal roof, and warm light
    /// falling around it.
    private static func addLantern(at center: Vec2, size: Double, id: inout Int, to list: inout RenderList) {
        func add(_ primitive: Primitive, _ color: ColorToken, _ opacity: Double = 1) {
            list.add(primitive, color: color, opacity: opacity, space: .world, id: id)
            id += 1
        }
        add(.circle(center: center, radius: size * 2.4), .fireCore, 0.05)
        add(.circle(center: center, radius: size * 1.3), .fireCore, 0.08)
        add(.roundedRect(center: center + Vec2(1.5, -1.5), size: Vec2(size * 1.2, size * 1.2), cornerRadius: 1, rotation: .pi / 4), .background, 0.4)
        add(.roundedRect(center: center, size: Vec2(size * 1.1, size * 1.1), cornerRadius: 1, rotation: .pi / 4), .stone, 0.9)
        let roof = (0..<6).map { center + Vec2(angle: Double($0) * .pi / 3) * size * 0.72 }
        add(.polygon(roof), .wreck, 0.95)
        add(.circle(center: center, radius: size * 0.2), .fireCore, 0.9)
    }

    /// A palm from above: fronds fanning out from the crown, two coconuts.
    private static func addPalm(at center: Vec2, size: Double, index: Int, id: inout Int, to list: inout RenderList) {
        func add(_ primitive: Primitive, _ color: ColorToken, _ opacity: Double = 1) {
            list.add(primitive, color: color, opacity: opacity, space: .world, id: id)
            id += 1
        }
        let turn = hash(index, 451) * Angle.tau
        add(.circle(center: center + Vec2(size * 0.5, -size * 0.5), radius: size * 1.2), .background, 0.3)
        for frond in 0..<7 {
            let angle = turn + Double(frond) * Angle.tau / 7
            let tip = center + Vec2(angle: angle) * size * 1.6
            let mid = center + Vec2(angle: angle) * size * 0.8
            let side = Vec2(angle: angle).left * size * 0.28
            add(.polygon([center, mid + side, tip, mid - side]), frond % 2 == 0 ? .mapForest : .skinFern, 0.9)
        }
        add(.circle(center: center, radius: size * 0.28), .skinLatte, 0.95)
        add(.circle(center: center + Vec2(size * 0.2, 0), radius: size * 0.16), .skinMocha, 0.95)
        add(.circle(center: center + Vec2(-size * 0.1, size * 0.18), radius: size * 0.16), .skinMocha, 0.95)
    }

    /// A beach parasol in two colours, with a towel beside it.
    private static func addParasol(at center: Vec2, size: Double, index: Int, id: inout Int, to list: inout RenderList) {
        func add(_ primitive: Primitive, _ color: ColorToken, _ opacity: Double = 1) {
            list.add(primitive, color: color, opacity: opacity, space: .world, id: id)
            id += 1
        }
        let turn = hash(index, 455) * Angle.tau
        add(.roundedRect(center: center + Vec2(angle: turn) * size * 1.5, size: Vec2(size * 1.4, size * 0.7), cornerRadius: 1, rotation: turn), .skinSky, 0.7)
        add(.circle(center: center + Vec2(size * 0.4, -size * 0.4), radius: size * 1.05), .background, 0.3)
        let radius = size * 1.05
        for piece in 0..<8 {
            let from = turn + Double(piece) * Angle.tau / 8
            add(.arc(center: center, radius: radius / 2, thickness: radius, startAngle: from, endAngle: from + Angle.tau / 8), piece % 2 == 0 ? .skinCoral : .primary, 0.95)
        }
        add(.circle(center: center, radius: size * 0.12), .vehicleTire, 0.9)
    }

    /// Every map lines its roads, both sides of every arm, out into the city: Sakura with
    /// cherry trees and, every few trees, a stone lantern; Tropic with palms, Snowfall with
    /// firs and warm lamps, the others with their own plants or lights. Drawn over the lots,
    /// which keep the avenue free (`keepsClear`).
    static func addAvenues(_ theme: MapTheme?, world: World, id: inout Int, to list: inout RenderList) {
        guard let theme else { return }
        let layout = world.layout
        for arm in layout.arms {
            var distance = layout.ringRadius + layout.laneWidth / 2 + 40
            var index = arm.slot * 40
            var step = 0
            while distance < layout.ringRadius + 330 {
                for (sideIndex, side) in [-1.0, 1.0].enumerated() {
                    index += 1
                    // Every third place along a side holds the map's accent: a lantern, a lamp.
                    let isAccent = (step + sideIndex) % 3 == 1
                    let isLight = isAccent && [.sakura, .snowfall, .dusk].contains(theme) || theme == .cosmos
                    let size = isLight ? 6.0 : 8.5 + 3.5 * hash(index, 381)
                    let at = arm.outward * (distance + 6 * hash(index, 382)) + arm.outward.left * side * (layout.laneWidth + (isLight ? 14 : 20) + 4 * hash(index, 383))
                    guard onScreen(at, size * 2.5, list.camera) else { continue }
                    switch theme {
                    case .sakura:
                        if isAccent { addLantern(at: at, size: size, id: &id, to: &list) } else { addCherryTree(at: at, size: size, index: index, id: &id, to: &list) }
                    case .snowfall:
                        if isAccent { addLamp(at: at, size: size, color: .fireCore, id: &id, to: &list) } else { addSnowFir(at: at, size: size * 0.9, id: &id, to: &list) }
                    case .dusk:
                        if isAccent { addLamp(at: at, size: size, color: .fireCore, id: &id, to: &list) }
                    case .cosmos:
                        addLamp(at: at, size: size * 0.6, color: .mapCosmos, id: &id, to: &list)
                    case .tropic:
                        addPalm(at: at, size: size * 0.9, index: index, id: &id, to: &list)
                    case .meadow:
                        addFlowerBush(at: at, size: size * 0.85, index: index, id: &id, to: &list)
                    case .sand, .ember:
                        // The desert and the embers stay sparse.
                        if isAccent { addPlant(theme, at: at, size: size * 0.8, index: index, id: &id, to: &list) }
                    case .neon, .forest, .autumn, .aurora:
                        addPlant(theme, at: at, size: size * 0.9, index: index, id: &id, to: &list)
                    }
                }
                distance += 50
                step += 1
            }
        }
    }

    // MARK: - Air

    /// Above the vehicles, below the HUD: what the wind carries over the map. Sakura's
    /// petals, Autumn's leaves, Snowfall's snow, Meadow's fireflies, Cosmos' shooting stars.
    /// Small and faint, never over the HUD. None with Reduce Motion.
    static func addAir(_ theme: MapTheme?, time: Double, reduceMotion: Bool, to list: inout RenderList) {
        guard let theme, !reduceMotion else { return }
        var id = RenderID.mapAir
        let viewport = list.camera.viewport
        switch theme {
        case .sakura:
            addDrift(count: 40, time: time, viewport: viewport, colors: [.mapSakura, .sakuraPale, .mapSakura], length: 7, fall: 26, wind: 34, sway: 16, round: false, salt: 501, id: &id, to: &list)
        case .autumn:
            addDrift(count: 14, time: time, viewport: viewport, colors: [.mapAutumn, .hazard, .fireOuter], length: 7, fall: 34, wind: 26, sway: 22, round: false, salt: 511, id: &id, to: &list)
        case .snowfall:
            addDrift(count: 70, time: time, viewport: viewport, colors: [.primary, .mapSnow], length: 4.6, fall: 34, wind: 8, sway: 12, round: true, salt: 521, id: &id, to: &list)
        case .meadow:
            // Fireflies wander slowly and glow on and off.
            for index in 0..<14 {
                let home = Vec2(hash(index, 531) * viewport.x, hash(index, 532) * viewport.y)
                let phase = hash(index, 533) * Angle.tau
                let at = home + Vec2(sin(time * 0.31 + phase) * 34, sin(time * 0.23 + phase * 1.7) * 26)
                let glow = pow(max(0, sin(time * (0.8 + 0.6 * hash(index, 534)) + phase)), 3)
                guard glow > 0.02 else { continue }
                list.add(.circle(center: at, radius: 8), color: .firefly, opacity: 0.12 * glow, space: .screen, id: id)
                list.add(.circle(center: at, radius: 1.8), color: .firefly, opacity: 0.95 * glow, space: .screen, id: id + 1)
                id += 2
            }
        case .cosmos:
            // Now and then a shooting star streaks across the sky.
            let period = 5.5
            let cycle = Int(time / period)
            let into = time - Double(cycle) * period
            guard into < 0.8 else { return }
            let start = Vec2(hash(cycle, 541) * viewport.x * 0.8, hash(cycle, 542) * viewport.y * 0.5)
            let direction = Vec2(angle: 0.35 + 0.5 * hash(cycle, 543))
            let head = start + direction * (into / 0.8) * 260
            let fade = sin(.pi * into / 0.8)
            for piece in 0..<4 {
                let from = head - direction * Double(piece) * 14
                list.add(.line(from: from, to: from - direction * 14, thickness: 2 - 0.4 * Double(piece)), color: .mapCosmos, opacity: fade * (0.9 - 0.2 * Double(piece)), space: .screen, id: id)
                id += 1
            }
        case .dusk, .sand, .neon, .forest, .aurora, .ember, .tropic:
            break
        }
    }

    /// Things the wind carries across the screen: each at its own depth (nearer ones bigger,
    /// faster, brighter), swaying, and — petals and leaves — tumbling as they turn. The wind
    /// comes in gusts, the same for all of them. Fixed per index, so no two frames jump.
    private static func addDrift(count: Int, time: Double, viewport: Vec2, colors: [ColorToken], length: Double, fall: Double, wind: Double, sway: Double, round: Bool, salt: UInt64, id: inout Int, to list: inout RenderList) {
        // Where the wind has carried everything by now: always forward, faster in the gusts.
        let carried = time + 0.9 * sin(time * 0.29) + 0.5 * sin(time * 0.53 + 1)
        let margin = 40.0
        let width = viewport.x + 2 * margin
        let height = viewport.y + 2 * margin
        func wrap(_ value: Double, _ span: Double) -> Double {
            let r = value.truncatingRemainder(dividingBy: span)
            return (r < 0 ? r + span : r) - margin
        }
        for index in 0..<count {
            let depth = 0.55 + 0.45 * hash(index, salt)
            let phase = hash(index, salt + 1) * Angle.tau
            let x = wrap(hash(index, salt + 2) * width + carried * wind * depth + sin(time * (0.7 + 0.5 * depth) + phase) * sway * depth, width)
            let y = wrap(hash(index, salt + 3) * height + carried * fall * depth, height)
            let color = colors[index % colors.count]
            let opacity = 0.35 + 0.5 * depth
            let size = length * depth
            if round {
                list.add(.circle(center: Vec2(x, y), radius: size / 2), color: color, opacity: opacity * 0.8, space: .screen, id: id)
            } else {
                // Tumbling: it shows its full face, then its edge.
                let tumble = 0.3 + 0.7 * abs(cos(time * (1.2 + 1.6 * hash(index, salt + 4)) + phase))
                let turn = time * (0.5 + hash(index, salt + 5)) * (index % 2 == 0 ? 1 : -1) + phase
                list.add(.roundedRect(center: Vec2(x, y), size: Vec2(size * tumble, size * 0.62), cornerRadius: size * 0.3, rotation: turn), color: color, opacity: opacity, space: .screen, id: id)
            }
            id += 1
        }
    }
}
