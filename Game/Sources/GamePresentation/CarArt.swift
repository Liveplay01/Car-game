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
        /// Police: the blue LED light bar across the roof (`PoliceLights`).
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
        static let ribs = 18
        static let cracks = 20
        static let flames = 24
        static let outline = 32
        static let stripes = 33
        static let sheen = 35
        static let glitter = 36
        /// Police light bar (`PoliceLights`): the LED modules, their white cores, the light
        /// streaks, the soft light on the road and the blue sheen on the roof.
        static let leds = 39
        static let ledCores = 45
        static let streaks = 51
        static let spill = 55
        static let poolLayers = 5
        static let roofSheen = 67
        /// A two-tone skin's roof (`Skins.roof`).
        static let twoTone = 69
        /// Brake lights: the glow on the road and the two lamps (`addLights`).
        static let brakeGlow = 70
        static let brakeLamps = 71
        /// Headlights, only when they flash: the beam on the road and the two lamps.
        static let beam = 73
        static let headLamps = 74
        static let count = 76
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
        case .compact: return .vehicleCompact
        case .van: return .vehicleVan
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
        case .car, .sportsCar, .compact, .van: return common + [.rearWindow]
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
        case .compact: config.compactLength
        case .van: config.vanLength
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
            // The lorry's screen sits right at the nose, above the cab; the van's far forward,
            // over a long roof.
            let x = switch type {
            case .truck: l * 0.39
            case .transporter: l * 0.33
            case .van: l * 0.3
            default: l * 0.12
            }
            let length = switch type {
            case .truck: l * 0.1
            case .transporter: l * 0.13
            case .van: l * 0.14
            case .compact: l * 0.26
            default: l * 0.22
            }
            return Shape(center: Vec2(x, 0), size: Vec2(length, w * 0.74), cornerRadius: 2, color: .vehicleGlass, breaksAt: 2.5, reach: 9, isVisible: true)
        case .rearWindow:
            // The pickup's small cab window sits right behind the windscreen; the van has a
            // narrow one at its very back.
            let x = switch type {
            case .pickup: -l * 0.02
            case .van: -l * 0.4
            case .compact: -l * 0.27
            default: -l * 0.3
            }
            let length = switch type {
            case .pickup: l * 0.07
            case .van: l * 0.06
            default: l * 0.13
            }
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
            return Shape(center: Vec2(-l * 0.07, 0), size: Vec2(2.8, w * 0.8), cornerRadius: 1, color: .lightBlue, breaksAt: 2.5, reach: 8, isVisible: true)
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
    ///   - brake: 0…1, how brightly the brake lights shine; nil or 0 draws none.
    ///   - brakeGlow: whether they light the road behind the car too.
    ///   - headlights: 0…1, a flash of the headlights (a held tap, `GameSession`).
    static func add(
        id: Int,
        type: VehicleType,
        pose: Path.Pose,
        dents: [Dent],
        char: Double = 0,
        opacity: Double = 1,
        lights: Double? = nil,
        brake: Double? = nil,
        brakeGlow: Bool = true,
        headlights: Double = 0,
        skin: ColorToken? = nil,
        stripe: ColorToken? = nil,
        roof: ColorToken? = nil,
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

        // The blue lights fill the road around the car (ROADMAP.md M11): a wide, faint halo
        // and a softer pool on each side, trailing the flashes a little so they read as light
        // rather than as discs. Drawn first, so they sit under the body.
        if let lights, type == .police {
            let spill = PoliceLights.spill(lights)
            let l = length(of: type, config: config)
            let w = config.carWidth
            let bar = Vec2(-l * 0.07, 0)
            let halo = max(spill.left, spill.right)
            for (layer, (radius, share)) in [(l * 1.1, 0.03), (l * 0.8, 0.035)].enumerated() where halo > 0.01 {
                list.add(.circle(center: world(bar, pose), radius: radius), color: .lightBlue, opacity: opacity * share * halo, space: .world, id: slot(Slot.spill + layer))
            }
            // Many thin layers instead of a few strong ones: the edges fade like a gradient.
            let layers = Slot.poolLayers
            for (side, (y, glow)) in [(w * 0.7, spill.left), (-w * 0.7, spill.right)].enumerated() where glow > 0.01 {
                for layer in 0..<layers {
                    let k = Double(layer) / Double(layers - 1)
                    let size = Vec2(l * (1.5 - 0.85 * k), w * (2.0 - 1.35 * k))
                    list.add(
                        .roundedRect(center: world(bar + Vec2(0, y * (1 - 0.25 * k)), pose), size: size, cornerRadius: min(size.x, size.y) / 2, rotation: pose.heading),
                        color: .lightBlue, opacity: opacity * 0.045 * glow, space: .world, id: slot(Slot.spill + 2 + side * layers + layer)
                    )
                }
            }
        }

        // Light on the road goes under the body too: the red of the brakes behind the car,
        // the white of a headlight flash ahead of it.
        let lampLength = length(of: type, config: config)
        if let brake, brake > 0.01, brakeGlow {
            list.add(
                .roundedRect(center: world(Vec2(-lampLength / 2 - 2.5, 0), pose), size: Vec2(9, config.carWidth * 1.3), cornerRadius: 4.5, rotation: pose.heading),
                color: .lightRed, opacity: opacity * 0.16 * brake, space: .world, id: slot(Slot.brakeGlow)
            )
        }
        if headlights > 0.01 {
            list.add(
                .roundedRect(center: world(Vec2(lampLength / 2 + 8, 0), pose), size: Vec2(16, config.carWidth * 1.4), cornerRadius: 6, rotation: pose.heading),
                color: .primary, opacity: opacity * 0.28 * headlights, space: .world, id: slot(Slot.beam)
            )
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

        // A two-tone skin (LOOT.md): the roof in its second colour, from the windscreen to the
        // rear window, which sit on top of it. Only plain cars and only while intact.
        if let roof, type.isCarType, dents.isEmpty {
            let front = shape(.windscreen, type: type, config: config)
            let back = shape(.rearWindow, type: type, config: config)
            let from = back.center.x - back.size.x / 2 - 0.5
            let to = front.center.x + front.size.x / 2 - 1
            list.add(
                .roundedRect(center: world(Vec2((from + to) / 2, 0), pose), size: Vec2(to - from, config.carWidth * 0.8), cornerRadius: 2, rotation: pose.heading),
                color: roof, opacity: opacity, space: .world, id: slot(Slot.twoTone)
            )
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
                addLightBar(shape: shape, center: center, rotation: rotation, pose: pose, lights: broken ? nil : lights, opacity: partOpacity, config: config, slot: slot, to: &list)
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
        // The lamps on the body, only while they shine (every shape costs, `TearDownTests`):
        // the brake lights when the driver brakes, the headlights while they flash.
        let lampSize = Vec2(1.3, config.carWidth * 0.22)
        let lampY = config.carWidth * 0.3
        if let brake, brake > 0.02 {
            for (index, y) in [lampY, -lampY].enumerated() {
                list.add(
                    .roundedRect(center: world(Vec2(-lampLength / 2 + 0.8, y), pose), size: lampSize, cornerRadius: 0.5, rotation: pose.heading),
                    color: .lightRed, opacity: opacity * min(brake, 1), space: .world, id: slot(Slot.brakeLamps + index)
                )
            }
        }
        if headlights > 0.01 {
            for (index, y) in [lampY, -lampY].enumerated() {
                list.add(
                    .roundedRect(center: world(Vec2(lampLength / 2 - 0.8, y), pose), size: lampSize, cornerRadius: 0.5, rotation: pose.heading),
                    color: .primary, opacity: opacity * headlights, space: .world, id: slot(Slot.headLamps + index)
                )
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

    /// How brightly each side of the light bar shines at `phase` (cycles of `strobeCycle`).
    static func strobe(_ phase: Double) -> (left: Double, right: Double) {
        PoliceLights.sides(phase)
    }

    static let strobeCycle = 0.8

    /// The light bar: a dark housing with six LED modules. While the lights run, each lit
    /// module gets a white-hot core, the brightest one on each side a streak of light across
    /// the bar, and the white roof picks up the blue of its side.
    private static func addLightBar(shape: Shape, center: Vec2, rotation: Double, pose: Path.Pose, lights: Double?, opacity: Double, config: Config, slot: (Int) -> Int, to list: inout RenderList) {
        let lit = lights.map(PoliceLights.leds) ?? Array(repeating: 0, count: PoliceLights.count)
        let local = { (offset: Vec2) in world(center + offset.rotated(by: rotation - pose.heading), pose) }
        if let lights {
            let spill = PoliceLights.spill(lights)
            // The roof panel sits a little behind the bar.
            let roof = Vec2(-length(of: .police, config: config) * 0.04, 0)
            for (index, glow) in [spill.left, spill.right].enumerated() where glow > 0.01 {
                let y = (index == 0 ? 1.0 : -1.0) * shape.size.y / 4
                list.add(.roundedRect(center: local(roof + Vec2(0, y)), size: Vec2(shape.size.x * 2, shape.size.y / 2), cornerRadius: 1.5, rotation: rotation),
                         color: .lightBlue, opacity: opacity * 0.35 * glow, space: .world, id: slot(Slot.roofSheen + index))
            }
        }
        list.add(.roundedRect(center: world(center, pose), size: shape.size + Vec2(0.8, 0.8), cornerRadius: shape.cornerRadius, rotation: rotation),
                 color: .vehicleTire, opacity: opacity, space: .world, id: slot(Slot.part(.lightBar)))
        let pitch = shape.size.y / Double(PoliceLights.count)
        let module = Vec2(shape.size.x - 0.5, pitch - 0.35)
        // Left to right across the bar; the car's left is +y.
        let at = { (index: Int) in Vec2(0, shape.size.y / 2 - pitch * (Double(index) + 0.5)) }
        for index in 0..<PoliceLights.count {
            let glow = lit[index]
            list.add(.roundedRect(center: local(at(index)), size: module, cornerRadius: 0.4, rotation: rotation),
                     color: .lightBlue, opacity: opacity * (0.32 + 0.68 * glow), space: .world, id: slot(Slot.leds + index))
            if glow > 0.04 {
                list.add(.circle(center: local(at(index)), radius: 0.35 + 1.0 * glow), color: .primary, opacity: opacity * 0.9 * glow, space: .world, id: slot(Slot.ledCores + index))
            }
        }
        // A streak of light across the bar from the brightest module on each side: the flare
        // a camera sees, blue around a white line.
        for side in 0..<2 {
            let range = side == 0 ? 0..<PoliceLights.perSide : PoliceLights.perSide..<PoliceLights.count
            guard let brightest = range.max(by: { lit[$0] < lit[$1] }), lit[brightest] > 0.12 else { continue }
            let glow = lit[brightest]
            let half = Vec2(0, shape.size.y * (0.35 + 0.55 * glow))
            let from = local(at(brightest) + half)
            let to = local(at(brightest) - half)
            list.add(.line(from: from, to: to, thickness: 1.6 * glow), color: .lightBlue, opacity: opacity * 0.4 * glow, space: .world, id: slot(Slot.streaks + side * 2))
            list.add(.line(from: from, to: to, thickness: 0.45), color: .primary, opacity: opacity * 0.6 * glow, space: .world, id: slot(Slot.streaks + side * 2 + 1))
        }
    }

    /// A local point of the car in world space.
    static func world(_ local: Vec2, _ pose: Path.Pose) -> Vec2 {
        pose.position + local.rotated(by: pose.heading)
    }
}
