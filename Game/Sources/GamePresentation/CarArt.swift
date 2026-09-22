import GameCore

/// How a vehicle looks and how it breaks. Parts are placed in its own frame (x forward,
/// y to the left); the body is an outline that dents (`GameCore` records where and how
/// deep), and parts near a deep enough dent tear off and fly (`CrashEffects`).
///
/// Types read by colour *and* shape, so the game works for colour-blind players too:
/// police cars carry a white roof with a light bar, the criminal's pickup an open bed.
enum CarArt {
    enum Part: Int, CaseIterable {
        case frontBumper
        case rearBumper
        case hood
        case windscreen
        case rearWindow
        case leftMirror
        case rightMirror
        case frontLeftWheel
        case frontRightWheel
        case rearLeftWheel
        case rearRightWheel
        /// Police: the white roof panel.
        case roof
        /// Police: red and blue lights across the roof.
        case lightBar
        /// Pickup: the open load bed.
        case bed
        /// Transporter: the cargo box on the flatbed.
        case cargo
        /// Transporter: the orange hazard stripes on the rear.
        case hazard
    }

    /// Render id slots within a vehicle (`RenderID.partsPerVehicle`).
    enum Slot {
        static let body = 0
        static let char = 1
        static let engineBay = 2
        static func part(_ part: Part) -> Int { 3 + part.rawValue }
        static let blueLight = 17
        static let ribs = 18
        static let cracks = 20
        static let flames = 24
    }

    struct Shape {
        var center: Vec2
        var size: Vec2
        var cornerRadius: Double
        var color: ColorToken
        /// A dent this deep within `reach` tears the part off (glass: shatters it).
        var breaksAt: Double
        var reach: Double
        /// Drawn on an intact vehicle. Wheels sit under the body and only show once they fly.
        var isVisible: Bool
    }

    static func bodyColor(_ type: VehicleType) -> ColorToken {
        switch type {
        case .car: .vehicleCar
        case .police: .vehiclePolice
        case .pickup: .vehicleCriminal
        case .transporter: .vehicleCargo
        }
    }

    static func parts(_ type: VehicleType) -> [Part] {
        let common: [Part] = [.frontBumper, .rearBumper, .hood, .windscreen, .leftMirror, .rightMirror, .frontLeftWheel, .frontRightWheel, .rearLeftWheel, .rearRightWheel]
        switch type {
        case .car: return common + [.rearWindow]
        case .police: return common + [.rearWindow, .roof, .lightBar]
        case .pickup: return [.bed] + common + [.rearWindow]
        case .transporter: return [.cargo] + common + [.rearWindow, .hazard]
        }
    }

    static func shape(_ part: Part, type: VehicleType, config: Config) -> Shape {
        let l = config.carLength
        let w = config.carWidth
        let body = bodyColor(type)
        switch part {
        case .frontBumper:
            return Shape(center: Vec2(l / 2 - 1, 0), size: Vec2(2, w - 3), cornerRadius: 1, color: .vehicleTrim, breaksAt: 2, reach: 6, isVisible: true)
        case .rearBumper:
            return Shape(center: Vec2(-l / 2 + 1, 0), size: Vec2(2, w - 3), cornerRadius: 1, color: .vehicleTrim, breaksAt: 2, reach: 6, isVisible: true)
        case .hood:
            return Shape(center: Vec2(l * 0.3, 0), size: Vec2(l * 0.3, w - 3), cornerRadius: 1.5, color: body, breaksAt: 3.5, reach: 8, isVisible: false)
        case .windscreen:
            return Shape(center: Vec2(l * 0.12, 0), size: Vec2(l * 0.22, w * 0.74), cornerRadius: 2, color: .vehicleGlass, breaksAt: 2.5, reach: 9, isVisible: true)
        case .rearWindow:
            // The pickup's small cab window sits right behind the windscreen.
            let x = type == .pickup ? -l * 0.02 : -l * 0.3
            let length = type == .pickup ? l * 0.07 : l * 0.13
            return Shape(center: Vec2(x, 0), size: Vec2(length, w * 0.66), cornerRadius: 1.5, color: .vehicleGlass, breaksAt: 2.5, reach: 7, isVisible: true)
        case .leftMirror:
            return Shape(center: Vec2(l * 0.06, w / 2 + 0.8), size: Vec2(2, 1.6), cornerRadius: 0.6, color: body, breaksAt: 0.8, reach: 5, isVisible: true)
        case .rightMirror:
            return Shape(center: Vec2(l * 0.06, -w / 2 - 0.8), size: Vec2(2, 1.6), cornerRadius: 0.6, color: body, breaksAt: 0.8, reach: 5, isVisible: true)
        case .frontLeftWheel, .frontRightWheel, .rearLeftWheel, .rearRightWheel:
            let x = part == .frontLeftWheel || part == .frontRightWheel ? l * 0.3 : -l * 0.3
            let y = part == .frontLeftWheel || part == .rearLeftWheel ? w / 2 - 1.5 : -w / 2 + 1.5
            return Shape(center: Vec2(x, y), size: Vec2(5, 2.4), cornerRadius: 1, color: .vehicleTire, breaksAt: 4, reach: 5, isVisible: false)
        case .roof:
            return Shape(center: Vec2(-l * 0.11, 0), size: Vec2(l * 0.24, w * 0.8), cornerRadius: 2, color: .vehiclePoliceRoof, breaksAt: .infinity, reach: 0, isVisible: true)
        case .lightBar:
            return Shape(center: Vec2(-l * 0.07, 0), size: Vec2(2.6, w * 0.74), cornerRadius: 1, color: .lightRed, breaksAt: 2.5, reach: 8, isVisible: true)
        case .bed:
            return Shape(center: Vec2(-l * 0.26, 0), size: Vec2(l * 0.4, w - 3), cornerRadius: 1.5, color: .vehicleBed, breaksAt: .infinity, reach: 0, isVisible: true)
        case .cargo:
            return Shape(center: Vec2(-l * 0.12, 0), size: Vec2(l * 0.5, w + 6), cornerRadius: 2, color: .vehicleCargo, breaksAt: 4, reach: 9, isVisible: true)
        case .hazard:
            return Shape(center: Vec2(-l / 2 + 0.5, 0), size: Vec2(1.2, w + 4), cornerRadius: 0.5, color: .hazard, breaksAt: .infinity, reach: 0, isVisible: true)
        }
    }

    static func isGlass(_ part: Part) -> Bool { part == .windscreen || part == .rearWindow }

    /// True once a dent near the part is deep enough to tear it off (or shatter the glass).
    static func isBroken(_ part: Part, type: VehicleType, dents: [Dent], config: Config) -> Bool {
        let shape = shape(part, type: type, config: config)
        return dents.contains { $0.depth >= shape.breaksAt && $0.point.distance(to: shape.center) <= shape.reach + shape.size.x / 2 }
    }

    // MARK: - Sheet metal

    /// The body outline, counter-clockwise: a rounded rectangle with extra points along the
    /// sides, so a dent in the middle of a door can bend it too.
    static func outline(config: Config) -> [Vec2] {
        let hl = config.carLength / 2
        let hw = config.carWidth / 2
        let r = Metrics.vehicleCornerRadius
        let corners = [Vec2(hl - r, hw - r), Vec2(-hl + r, hw - r), Vec2(-hl + r, -hw + r), Vec2(hl - r, -hw + r)]
        var points: [Vec2] = []
        for (index, corner) in corners.enumerated() {
            let start = Double(index) * .pi / 2
            for k in 0...5 {
                points.append(corner + Vec2(angle: start + .pi / 2 * Double(k) / 5) * r)
            }
            // Points along the following side (long sides get more).
            let next = corners[(index + 1) % 4]
            let from = corner + Vec2(angle: start + .pi / 2) * r
            let to = next + Vec2(angle: start + .pi / 2) * r
            let count = index % 2 == 0 ? 5 : 2
            for k in 1...count {
                points.append(Vec2.lerp(from, to, Double(k) / Double(count + 1)))
            }
        }
        return points
    }

    /// How far the metal at `point` is pushed in by all dents. A harder hit crumples a
    /// wider area.
    static func push(at point: Vec2, dents: [Dent]) -> Double {
        var total = 0.0
        for dent in dents {
            let radius = 4 + dent.depth * 1.5
            let d = point.distance(to: dent.point)
            guard d < radius else { continue }
            let x = 1 - d * d / (radius * radius)
            total += dent.depth * x * x
        }
        return total
    }

    /// Moves `point` in towards the car's spine. Never more than 70 % of the way, so the
    /// outline stays a simple shape; `crumple` adds the zig-zag of folded metal.
    static func deformed(_ point: Vec2, dents: [Dent], config: Config, crumple: Double = 0) -> Vec2 {
        let amount = push(at: point, dents: dents)
        guard amount > 0.01 else { return point }
        let reach = max(0, config.carLength / 2 - config.carWidth / 2)
        let anchor = Vec2(min(max(point.x, -reach), reach), 0)
        let inward = anchor - point
        let distance = inward.length
        guard distance > 1e-6 else { return point }
        let moved = min(amount + crumple * min(amount, 1), distance * 0.7)
        return point + inward / distance * moved
    }

    static func deformedOutline(dents: [Dent], config: Config) -> [Vec2] {
        outline(config: config).enumerated().map { index, point in
            deformed(point, dents: dents, config: config, crumple: index.isMultiple(of: 2) ? 0.35 : -0.35)
        }
    }

    // MARK: - Drawing

    /// A vehicle, intact or wrecked: the (dented) body, charred as it burns, the parts still
    /// on it pushed in with the metal, torn-off parts missing, broken glass cracked.
    /// - Parameters:
    ///   - lights: 0…1 phase of the flashing police lights; nil when they are off.
    static func add(
        id: Int,
        type: VehicleType,
        pose: Path.Pose,
        dents: [Dent],
        char: Double = 0,
        opacity: Double = 1,
        lights: Double? = nil,
        config: Config,
        to list: inout RenderList
    ) {
        let slot = { RenderID.vehicle(id, part: $0) }
        let body = bodyColor(type)
        if dents.isEmpty {
            list.add(
                .roundedRect(center: pose.position, size: Vec2(config.carLength, config.carWidth), cornerRadius: Metrics.vehicleCornerRadius, rotation: pose.heading),
                color: body, opacity: opacity, space: .world, id: slot(Slot.body)
            )
        } else {
            let outline = deformedOutline(dents: dents, config: config).map { world($0, pose) }
            list.add(.polygon(outline), color: body, opacity: opacity * (1 - char), space: .world, id: slot(Slot.body))
            if char > 0 {
                list.add(.polygon(outline), color: .wreck, opacity: opacity * char, space: .world, id: slot(Slot.char))
            }
            if isBroken(.hood, type: type, dents: dents, config: config) {
                let bay = shape(.hood, type: type, config: config)
                let center = deformed(bay.center, dents: dents, config: config)
                list.add(.roundedRect(center: world(center, pose), size: bay.size * 0.85, cornerRadius: 1, rotation: pose.heading), color: .vehicleTire, opacity: opacity, space: .world, id: slot(Slot.engineBay))
            }
        }

        for part in parts(type) {
            let shape = shape(part, type: type, config: config)
            guard shape.isVisible else { continue }
            let broken = !dents.isEmpty && isBroken(part, type: type, dents: dents, config: config)
            if broken && !isGlass(part) { continue }
            let center = dents.isEmpty ? shape.center : deformed(shape.center, dents: dents, config: config)
            // A dent twists what is left of a part a little.
            let twist = dents.isEmpty ? 0 : min(push(at: shape.center, dents: dents), 3) * 0.08
            let rotation = pose.heading + twist
            let partOpacity = opacity * (broken ? 0.45 : 1)

            if part == .lightBar {
                // Two halves; while the lights flash, one side glows at a time.
                let glow = lights.map { $0 < 0.5 ? (1.0, 0.35) : (0.35, 1.0) } ?? (0.75, 0.75)
                let halfSize = Vec2(shape.size.x, shape.size.y / 2)
                let offset = Vec2(0, shape.size.y / 4)
                list.add(.roundedRect(center: world(center + offset, pose), size: halfSize, cornerRadius: shape.cornerRadius, rotation: rotation), color: .lightRed, opacity: partOpacity * glow.0, space: .world, id: slot(Slot.part(part)))
                list.add(.roundedRect(center: world(center - offset, pose), size: halfSize, cornerRadius: shape.cornerRadius, rotation: rotation), color: .lightBlue, opacity: partOpacity * glow.1, space: .world, id: slot(Slot.blueLight))
                continue
            }
            list.add(
                .roundedRect(center: world(center, pose), size: shape.size, cornerRadius: shape.cornerRadius, rotation: rotation),
                color: shape.color, opacity: partOpacity, space: .world, id: slot(Slot.part(part))
            )
            if part == .bed {
                // Two ribs across the open bed.
                for (index, x) in [-0.2, 0.2].enumerated() {
                    let rib = center + Vec2(shape.size.x * x, 0)
                    list.add(.roundedRect(center: world(rib, pose), size: Vec2(1, shape.size.y), cornerRadius: 0.4, rotation: rotation), color: body, opacity: partOpacity, space: .world, id: slot(Slot.ribs + index))
                }
            }
            if broken && part == .windscreen {
                // Cracks from the point of impact across the screen.
                let half = shape.size / 2
                let cracks = [(Vec2(half.x, half.y * 0.2), Vec2(-half.x * 0.6, -half.y * 0.8)), (Vec2(half.x * 0.2, -half.y), Vec2(-half.x, half.y * 0.5))]
                for (index, crack) in cracks.enumerated() {
                    list.add(
                        .line(from: world(center + crack.0, pose), to: world(center + crack.1, pose), thickness: 0.6),
                        color: .muted, opacity: opacity, space: .world, id: slot(Slot.cracks + index)
                    )
                }
            }
        }
    }

    /// A local point of the car in world space.
    static func world(_ local: Vec2, _ pose: Path.Pose) -> Vec2 {
        pose.position + local.rotated(by: pose.heading)
    }
}
