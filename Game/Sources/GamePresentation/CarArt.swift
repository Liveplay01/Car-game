import Foundation
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
        /// Lorry: the box. Transporter: the armoured box behind the cab.
        case cargo
        /// Transporter: the amber beacon on the cab roof.
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
        static let groundGlow = 28
        static let outline = 32
        static let stripes = 33
        static let sheen = 35
        static let glitter = 36
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

    /// The paint. Ordinary cars come in four, picked by their id, so the traffic looks like
    /// traffic instead of one car copied fifteen times. A skin repaints every type (Leo); the
    /// special vehicles stay recognisable by their shape: the police car by its white roof
    /// and light bar, the criminal by its open bed, the transporter by its gold coin.
    static func bodyColor(_ type: VehicleType, id: Int = 0, skin: ColorToken? = nil) -> ColorToken {
        if let skin { return skin }
        switch type {
        case .car: return paints[paintIndex(id)]
        case .sportsCar: return .vehicleSports
        case .truck: return .vehicleTruck
        case .police: return .vehiclePolice
        case .pickup: return .vehicleCriminal
        case .transporter: return .vehicleArmor
        }
    }

    private static let paints: [ColorToken] = [.vehicleCar, .vehicleCarSilver, .vehicleCarGraphite, .vehicleCarSand]

    private static func paintIndex(_ id: Int) -> Int {
        var hash = UInt64(bitPattern: Int64(id)) &* 0x9E37_79B9_7F4A_7C15
        hash ^= hash >> 29
        return Int(hash % UInt64(paints.count))
    }

    static func parts(_ type: VehicleType) -> [Part] {
        let common: [Part] = [.frontBumper, .rearBumper, .hood, .windscreen, .leftMirror, .rightMirror, .frontLeftWheel, .frontRightWheel, .rearLeftWheel, .rearRightWheel]
        switch type {
        case .car, .sportsCar: return common + [.rearWindow]
        // A lorry is a cab and a box; no rear window behind it.
        case .truck: return [.cargo] + common
        case .police: return common + [.rearWindow, .roof, .lightBar]
        case .pickup: return [.bed] + common + [.rearWindow]
        // An armoured van: no rear window, a box behind a short cab, a beacon on top.
        case .transporter: return [.cargo] + common + [.hazard]
        }
    }

    /// How long this kind of vehicle is (`World.length(of:)`).
    static func length(of type: VehicleType, config: Config) -> Double {
        switch type {
        case .truck: config.truckLength
        case .sportsCar: config.sportsCarLength
        case .car, .police, .pickup, .transporter: config.carLength
        }
    }

    static func shape(_ part: Part, type: VehicleType, config: Config) -> Shape {
        let l = length(of: type, config: config)
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
            // The lorry's screen sits right at the nose, above the cab.
            let x = type == .truck ? l * 0.39 : (type == .transporter ? l * 0.33 : l * 0.12)
            let length = type == .truck ? l * 0.1 : (type == .transporter ? l * 0.13 : l * 0.22)
            return Shape(center: Vec2(x, 0), size: Vec2(length, w * 0.74), cornerRadius: 2, color: .vehicleGlass, breaksAt: 2.5, reach: 9, isVisible: true)
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
            if type == .truck {
                return Shape(center: Vec2(-l * 0.14, 0), size: Vec2(l * 0.62, w + 2), cornerRadius: 2, color: .vehicleTruckBox, breaksAt: 4, reach: 9, isVisible: true)
            }
            // The armoured box: flush with the body, from the cab to the rear doors.
            return Shape(center: Vec2(-l * 0.13, 0), size: Vec2(l * 0.64, w - 2), cornerRadius: 1.5, color: .vehicleArmorBox, breaksAt: 4, reach: 9, isVisible: true)
        case .hazard:
            return Shape(center: Vec2(l * 0.2, 0), size: Vec2(2.2, w * 0.42), cornerRadius: 1, color: .hazard, breaksAt: 2.5, reach: 6, isVisible: true)
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
    static func outline(type: VehicleType = .car, config: Config) -> [Vec2] {
        let hl = length(of: type, config: config) / 2
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

    static func deformedOutline(type: VehicleType = .car, dents: [Dent], config: Config) -> [Vec2] {
        outline(type: type, config: config).enumerated().map { index, point in
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
        skin: ColorToken? = nil,
        stripe: ColorToken? = nil,
        finish: Skins.Finish? = nil,
        finishTime: Double? = nil,
        springTime: Double? = nil,
        config: Config,
        to list: inout RenderList
    ) {
        let dents = SoftBody.dents(dents, type: type, at: springTime)
        let slot = { RenderID.vehicle(id, part: $0) }
        let body = bodyColor(type, id: id, skin: skin)
        let paintedInThisCar = bodyColor(type, skin: skin)

        // The blue lights throw their flashes onto the road beside the car (ROADMAP.md M11),
        // soft and wide, fading with each flash. Drawn first, so they sit under the body.
        if let lights, type == .police {
            let flash = strobe(lights)
            let reach = config.carWidth * 1.7
            let side = config.carWidth * 0.8
            for (index, (y, glow)) in [(side, flash.left), (-side, flash.right)].enumerated() where glow > 0.01 {
                let center = world(Vec2(-length(of: type, config: config) * 0.07, y), pose)
                // Two soft layers plus the shared core below: light, not a disc.
                list.add(.circle(center: center, radius: reach * 1.15), color: .lightBlue, opacity: opacity * 0.1 * glow, space: .world, id: slot(Slot.groundGlow + index * 2))
                list.add(.circle(center: center, radius: reach * 0.6), color: .lightBlue, opacity: opacity * 0.2 * glow, space: .world, id: slot(Slot.groundGlow + index * 2 + 1))
            }
        }

        if dents.isEmpty {
            // A dark outline under the body: at the size a phone shows a car, this is what
            // keeps it crisp against the asphalt (FOUNDATION.md 3).
            list.add(
                .roundedRect(center: pose.position, size: Vec2(length(of: type, config: config) + 2.5, config.carWidth + 2.5), cornerRadius: Metrics.vehicleCornerRadius + 1, rotation: pose.heading),
                color: .kerb, opacity: opacity, space: .world, id: slot(Slot.outline)
            )
            list.add(
                .roundedRect(center: pose.position, size: Vec2(length(of: type, config: config), config.carWidth), cornerRadius: Metrics.vehicleCornerRadius, rotation: pose.heading),
                color: body, opacity: opacity, space: .world, id: slot(Slot.body)
            )
        } else {
            let local = deformedOutline(type: type, dents: dents, config: config)
            list.add(.polygon(local.map { world($0 * 1.1, pose) }), color: .kerb, opacity: opacity, space: .world, id: slot(Slot.outline))
            let outline = local.map { world($0, pose) }
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
            // Parts cut from the body sheet wear this car's paint, not the type's; a skin
            // repaints the transporter's box too.
            let color = shape.color == paintedInThisCar || (part == .cargo && type == .transporter && skin != nil) ? body : shape.color

            if part == .lightBar {
                // Two blue halves, like a German light bar. Dim lenses when off; while the
                // lights run, each side strobes and a white-hot core flares on it.
                let flash = lights.map(strobe) ?? (left: 0, right: 0)
                let halfSize = Vec2(shape.size.x, shape.size.y / 2)
                let offset = Vec2(0, shape.size.y / 4)
                let halves = [(center + offset, flash.left, Slot.part(part), Slot.flames), (center - offset, flash.right, Slot.blueLight, Slot.flames + 1)]
                for (at, glow, lens, flare) in halves {
                    list.add(.roundedRect(center: world(at, pose), size: halfSize, cornerRadius: shape.cornerRadius, rotation: rotation), color: .lightBlue, opacity: partOpacity * (0.45 + 0.55 * glow), space: .world, id: slot(lens))
                    if glow > 0.05, !broken {
                        list.add(.circle(center: world(at, pose), radius: 1.2 + 2.6 * glow), color: .primary, opacity: partOpacity * 0.8 * glow, space: .world, id: slot(flare))
                    }
                }
                continue
            }
            list.add(
                .roundedRect(center: world(center, pose), size: shape.size, cornerRadius: shape.cornerRadius, rotation: rotation),
                color: color, opacity: partOpacity, space: .world, id: slot(Slot.part(part))
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
        // A finish (LOOT.md): a sweep of light over the car now and then, and/or sparkles
        // that twinkle. Only moving with a clock (not with Reduce Motion) and on intact cars.
        if let finish, let time = finishTime, dents.isEmpty {
            let half = length(of: type, config: config) / 2
            let width = config.carWidth / 2
            let seed = Double(id % 97)
            if finish.isShiny {
                let phase = (time * 0.45 + seed * 0.13).truncatingRemainder(dividingBy: 1)
                if phase < 0.45 {
                    let x = -half + 2 * half * (phase / 0.45)
                    let glow = sin(.pi * phase / 0.45)
                    list.add(.line(from: world(Vec2(x + 2.5, -width + 1), pose), to: world(Vec2(x - 2.5, width - 1), pose), thickness: 3),
                             color: .primary, opacity: opacity * 0.6 * glow, space: .world, id: slot(Slot.sheen))
                }
            }
            if finish.glitters {
                for index in 0..<3 {
                    let k = Double(index)
                    let u = WeatherLayer.unitHash(id * 7 + index, 21)
                    let v = WeatherLayer.unitHash(id * 7 + index, 22)
                    let twinkle = pow(max(0, sin(time * 5 + k * 2.1 + seed)), 6)
                    guard twinkle > 0.05 else { continue }
                    let at = Vec2((u - 0.5) * 1.5 * half, (v - 0.5) * 1.3 * width)
                    list.add(.circle(center: world(at, pose), radius: 0.7 + 0.8 * twinkle),
                             color: .primary, opacity: opacity * twinkle, space: .world, id: slot(Slot.glitter + index))
                }
            }
        }
        // The money transporter: gold stripes down both sides of the box and a gold coin on
        // its roof, so it reads as "money" by shape as well as colour. Only while intact.
        if type == .transporter, dents.isEmpty {
            let box = shape(.cargo, type: type, config: config)
            let from = box.center.x - box.size.x / 2 + 1
            let to = box.center.x + box.size.x / 2 - 1
            for (index, y) in [-1.0, 1.0].enumerated() {
                let side = y * (config.carWidth / 2 - 1.1)
                list.add(.line(from: world(Vec2(from, side), pose), to: world(Vec2(to, side), pose), thickness: 1.1),
                         color: .vehicleCargo, opacity: opacity, space: .world, id: slot(Slot.stripes + index))
            }
            let coin = world(box.center, pose)
            list.add(.circle(center: coin, radius: 3.4), color: .vehicleCargo, opacity: opacity, space: .world, id: slot(Slot.sheen))
            list.add(.circle(center: coin, radius: 2.2), color: .vehicleArmor, opacity: opacity, space: .world, id: slot(Slot.glitter))
            // The bar of the dollar sign, across the coin.
            list.add(.line(from: world(box.center + Vec2(1.9, 0), pose), to: world(box.center - Vec2(1.9, 0), pose), thickness: 0.9),
                     color: .vehicleCargo, opacity: opacity, space: .world, id: slot(Slot.glitter + 1))
        }
        // A racing stripe (LOOT.md): two thin lines down the middle, over roof and glass.
        // Only on an intact car; a wreck shows its dents instead.
        if let stripe, dents.isEmpty, type != .police, type != .transporter {
            let half = length(of: type, config: config) / 2 - 2
            for (index, y) in [-1.6, 1.6].enumerated() {
                list.add(.line(from: world(Vec2(-half, y), pose), to: world(Vec2(half, y), pose), thickness: 1.3),
                         color: stripe, opacity: opacity * 0.9, space: .world, id: slot(Slot.stripes + index))
            }
        }
    }

    /// Blue lights as LED strobes (Leo: natürlicher): a double flash on the left, then on
    /// the right, each a quick rise and a soft fade. `phase` counts 0 to 1 per 0.8 s cycle.
    static func strobe(_ phase: Double) -> (left: Double, right: Double) {
        func flash(_ t: Double) -> Double {
            guard t >= 0 else { return 0 }
            return t < 0.02 ? t / 0.02 : exp(-(t - 0.02) / 0.05)
        }
        let t = phase.truncatingRemainder(dividingBy: 1) * strobeCycle
        return (max(flash(t), flash(t - 0.13)), max(flash(t - 0.4), flash(t - 0.53)))
    }

    static let strobeCycle = 0.8

    /// A local point of the car in world space.
    static func world(_ local: Vec2, _ pose: Path.Pose) -> Vec2 {
        pose.position + local.rotated(by: pose.heading)
    }
}
