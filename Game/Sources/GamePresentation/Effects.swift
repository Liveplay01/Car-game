import Foundation
import GameCore

/// Crash effects (FOUNDATION.md 3): wrecks with damage where they were hit, impact flash,
/// fireball on hard hits, burning wrecks, smoke, debris, sparks and a short screen shake.
/// The wrecks' motion is real physics from `GameCore`; this only draws and adds particles.
///
/// Crashes happen where the player merges, so the effects must never hide the next gap:
/// wrecks and smoke lie *below* the moving cars, and flash, fireball and sparks above them
/// last only a fraction of a second. Reduce Motion drops the shake and everything that
/// flies; flash, fire and smoke stay as fades.
struct CrashEffects {
    struct Particle {
        enum Kind {
            case debris(ColorToken)
            /// A torn-off car part: bumper, hood, mirror, wheel.
            case part(ColorToken)
            case spark
            case smoke
        }

        var serial: Int
        var kind: Kind
        var position: Vec2
        var velocity: Vec2
        var rotation: Double
        var spin: Double
        /// Length and width in world units; smoke: start radius in `x`.
        var size: Vec2
        var age = 0.0
        var lifetime: Double
    }

    struct Blast {
        var serial: Int
        var position: Vec2
        /// 0.4 (a scrape) … 1.6 (a hard hit).
        var severity: Double
        /// The good crash: police colours instead of fire.
        var isTakedown = false
        var age = 0.0
    }

    /// Closing speed (wu/s) of an average hit (severity 1): the median the balancing bot
    /// measured, ~100 wu/s. Car to car that is about 70 km/h.
    static let typicalImpact = 100.0
    /// Only the hardest hits (about one in four) throw a fireball and set the wrecks on fire.
    static let fireSeverity = 1.15
    static let blastLifetime = 0.45
    static let wreckFade = 0.6
    static let shakeDuration = 0.35
    /// Points at severity 1; decays within a few frames.
    static let shakeAmplitude = 6.0
    /// Tumbling debris scrapes over the road (share of g).
    static let debrisFriction = 1.6
    /// Wind that carries the smoke (world units per second).
    static let wind = Vec2(10, 16)

    private(set) var particles: [Particle] = []
    private(set) var blasts: [Blast] = []
    /// Burning wrecks by vehicle id, with their fire's strength.
    private(set) var fires: [Int: Double] = [:]
    /// Parts already torn off each wreck, by vehicle id.
    private(set) var torn: [Int: Set<CarArt.Part>] = [:]
    private(set) var shakeAge = Double.infinity
    private var shakeStrength = 0.0
    private var rng: SeededRandom
    private var serial = 0
    private var smokeTimer = 0.0

    init(seed: UInt64) {
        rng = SeededRandom(seed: seed ^ 0xC4A5_11FE_0DD5_EED5)
    }

    var isEmpty: Bool { particles.isEmpty && blasts.isEmpty }

    /// Offset of the whole picture, in points.
    var shakeOffset: Vec2 {
        guard shakeAge < Self.shakeDuration else { return .zero }
        let strength = shakeStrength * exp(-shakeAge / 0.09)
        return Vec2(sin(shakeAge * 71), cos(shakeAge * 89)) * strength
    }

    static func severity(of crash: CrashReport) -> Double {
        min(max(crash.impact / typicalImpact, 0.4), 1.6)
    }

    // MARK: - Spawning

    mutating func spawn(for crash: CrashReport, in world: World, reduceMotion: Bool) {
        let severity = Self.severity(of: crash)
        var average = Vec2.zero
        for id in [crash.first, crash.second] {
            guard let vehicle = world.vehicle(id: id), case let .crashed(state) = vehicle.phase else { continue }
            average += state.velocity / 2
            if severity >= Self.fireSeverity && !crash.isTakedown {
                fires[id] = severity
            }
        }
        blasts.append(Blast(serial: next(), position: crash.point, severity: severity, isTakedown: crash.isTakedown))
        if crash.isTakedown && !reduceMotion {
            // Flat vector splinters in police colours (IDEA.md): clearly the good crash.
            let colors: [ColorToken] = [.lightBlue, .lightRed, .vehiclePoliceRoof]
            for index in 0..<18 {
                let direction = Vec2(angle: Angle.tau * (Double(index) + rng.unit() * 0.6) / 18)
                particles.append(Particle(
                    serial: next(),
                    kind: .debris(colors[index % colors.count]),
                    position: crash.point,
                    velocity: average * 0.3 + direction * rng.double(in: 90...190),
                    rotation: direction.angle,
                    spin: rng.double(in: -10...10),
                    size: Vec2(rng.double(in: 4...7), rng.double(in: 1.2...2)),
                    lifetime: rng.double(in: 0.6...0.9)
                ))
            }
        }
        guard !reduceMotion else { return }
        shakeAge = 0
        shakeStrength = Self.shakeAmplitude * severity

        // Debris keeps the cars' momentum and sprays out on top of it.
        let pieces = Int(6 + 8 * severity)
        for index in 0..<pieces {
            let color: ColorToken = index % 3 == 2 ? .vehicleGlass : .vehicleCar
            let direction = Vec2(angle: rng.unit() * Angle.tau)
            particles.append(Particle(
                serial: next(),
                kind: .debris(color),
                position: crash.point + direction * 3,
                velocity: average + direction * rng.double(in: 30...100) * severity,
                rotation: rng.unit() * Angle.tau,
                spin: rng.double(in: 4...16) * (rng.unit() < 0.5 ? -1 : 1),
                size: Vec2(rng.double(in: 2.5...5.5), rng.double(in: 1.5...3)),
                lifetime: rng.double(in: 1.0...1.5)
            ))
        }
        for _ in 0..<Int(4 + 8 * severity) {
            let direction = Vec2(angle: rng.unit() * Angle.tau)
            particles.append(Particle(
                serial: next(),
                kind: .spark,
                position: crash.point,
                velocity: average * 0.5 + direction * rng.double(in: 160...320),
                rotation: 0,
                spin: 0,
                size: Vec2(1, 1),
                lifetime: rng.double(in: 0.18...0.35)
            ))
        }
    }

    private mutating func next() -> Int {
        serial += 1
        return serial
    }

    // MARK: - Update

    mutating func update(_ dt: Double, world: World, reduceMotion: Bool = false) {
        guard dt > 0 else { return }
        shakeAge += dt
        let config = world.config

        // Wrecks smoke until they fade; burning ones more.
        let wrecks = world.vehicles.filter(\.isCrashed)
        fires = fires.filter { id, _ in wrecks.contains { $0.id == id } }
        torn = torn.filter { id, _ in world.vehicles.contains { $0.id == id } }
        // Wrecks, and a dented pickup that ploughs on.
        for vehicle in world.vehicles where !vehicle.dents.isEmpty {
            tearOffParts(of: vehicle, config: config, reduceMotion: reduceMotion)
        }
        smokeTimer += dt
        while smokeTimer >= 0.06 {
            smokeTimer -= 0.06
            for wreck in wrecks {
                guard case let .crashed(state) = wreck.phase, state.elapsed < config.crashDuration - Self.wreckFade else { continue }
                let burning = fires[wreck.id] != nil
                guard burning || rng.unit() < 0.35 else { continue }
                particles.append(Particle(
                    serial: next(),
                    kind: .smoke,
                    position: wreck.position + Vec2(angle: wreck.heading) * (state.damage.x * 0.6) + Vec2(rng.double(in: -3...3), rng.double(in: -3...3)),
                    velocity: state.velocity * 0.3 + Self.wind + Vec2(rng.double(in: -6...6), rng.double(in: -6...6)),
                    rotation: 0,
                    spin: 0,
                    size: Vec2(burning ? rng.double(in: 4.5...6.5) : rng.double(in: 3...4.5), 0),
                    lifetime: rng.double(in: 0.8...1.2)
                ))
            }
        }

        let scrape = Self.debrisFriction * config.gravity * dt
        for index in particles.indices {
            var particle = particles[index]
            particle.age += dt
            switch particle.kind {
            case .debris, .part:
                // Coulomb friction: a constant deceleration until the piece lies still.
                let speed = particle.velocity.length
                particle.velocity = speed > scrape ? particle.velocity * ((speed - scrape) / speed) : .zero
                particle.spin *= speed > scrape ? 1 : 0
            case .spark:
                particle.velocity = particle.velocity * exp(-6 * dt)
            case .smoke:
                particle.velocity = particle.velocity * exp(-0.8 * dt)
            }
            particle.position += particle.velocity * dt
            particle.rotation += particle.spin * dt
            particles[index] = particle
        }
        particles.removeAll { $0.age >= $0.lifetime }

        for index in blasts.indices {
            blasts[index].age += dt
        }
        blasts.removeAll { $0.age >= Self.blastLifetime }
    }

    // MARK: - Drawing

    /// Below the moving cars: smoke, parts lying on the road and the wrecks.
    func addGround(world: World, alpha: Double, to list: inout RenderList) {
        for particle in particles {
            let x = particle.age / particle.lifetime
            switch particle.kind {
            case .smoke:
                let radius = particle.size.x * (1 + 2.2 * Ease.outCubic(x))
                list.add(.circle(center: particle.position, radius: radius), color: .smoke, opacity: 0.3 * (1 - x), space: .world, id: id(particle.serial, part: 0))
            case let .part(color):
                let opacity = 1 - Ease.clamp01((particle.age - (particle.lifetime - 0.5)) / 0.5)
                list.add(.roundedRect(center: particle.position, size: particle.size, cornerRadius: min(particle.size.x, particle.size.y) / 3, rotation: particle.rotation), color: color, opacity: opacity, space: .world, id: id(particle.serial, part: 0))
            case .debris, .spark:
                break
            }
        }
        for vehicle in world.vehicles {
            guard case let .crashed(state) = vehicle.phase else { continue }
            addWreck(vehicle, state: state, pose: SceneBuilder.interpolatedPose(vehicle, alpha: alpha), config: world.config, to: &list)
        }
    }

    /// Above the moving cars, short-lived: flash, fireball, debris and sparks.
    func addAir(to list: inout RenderList) {
        for blast in blasts {
            let t = blast.age
            let ring = Ease.outCubic(t / 0.3)
            if t < 0.3 {
                list.add(
                    .arc(center: blast.position, radius: 8 + 44 * max(blast.severity, blast.isTakedown ? 1 : 0) * ring, thickness: 3 * (1 - ring) + 0.5, startAngle: 0, endAngle: Angle.tau),
                    color: blast.isTakedown ? .lightBlue : .spark, opacity: 1 - ring, space: .world, id: id(blast.serial, part: 0)
                )
            }
            guard blast.severity >= Self.fireSeverity, !blast.isTakedown else { continue }
            let grow = Ease.outCubic(t / 0.12)
            let fade = 1 - Ease.clamp01((t - 0.1) / (Self.blastLifetime - 0.1))
            let size = 0.5 + 0.35 * blast.severity
            // Three layers, dark to hot: a rim of deep red, orange billows, a yellow core.
            let offsets = [Vec2(0, 0), Vec2(7, 4), Vec2(-6, 5), Vec2(2, -7)]
            for (layer, color, scale, opacity) in [(0, ColorToken.fireDeep, 1.3, 0.55), (1, .fireOuter, 1.0, 0.9)] {
                for (index, offset) in offsets.enumerated() {
                    let radius = (index == 0 ? 20 : 14) * scale * size * (0.3 + 0.7 * grow)
                    list.add(.circle(center: blast.position + offset * grow * size, radius: radius), color: color, opacity: opacity * fade, space: .world, id: id(blast.serial, part: 1 + layer * 4 + index))
                }
            }
            list.add(.circle(center: blast.position, radius: 11 * size * (0.3 + 0.7 * grow) * (0.4 + 0.6 * fade)), color: .fireCore, opacity: fade, space: .world, id: id(blast.serial, part: 9))
        }
        for particle in particles {
            let x = particle.age / particle.lifetime
            switch particle.kind {
            case let .debris(color):
                let opacity = 1 - Ease.clamp01((x - 0.6) / 0.4)
                list.add(.roundedRect(center: particle.position, size: particle.size, cornerRadius: 0.6, rotation: particle.rotation), color: color, opacity: opacity, space: .world, id: id(particle.serial, part: 0))
            case .spark:
                let tail = particle.position - particle.velocity * 0.025
                list.add(.line(from: tail, to: particle.position, thickness: 1.2), color: .spark, opacity: 1 - x, space: .world, id: id(particle.serial, part: 0))
            case .smoke, .part:
                break
            }
        }
    }

    /// The dented wreck (`CarArt`), charred if it burns, with flames at the point of impact.
    private func addWreck(_ vehicle: Vehicle, state: Vehicle.Crashed, pose: Path.Pose, config: Config, to list: inout RenderList) {
        let fade = 1 - Ease.clamp01((state.elapsed - (config.crashDuration - Self.wreckFade)) / Self.wreckFade)
        let fire = fires[vehicle.id]
        let char = fire == nil ? 0.35 : Ease.outCubic(state.elapsed / 0.5)
        CarArt.add(id: vehicle.id, type: vehicle.type, pose: pose, dents: vehicle.dents, char: char, opacity: fade, config: config, to: &list)

        // Flames, strongest right after the crash, dying down.
        guard let strength = fire else { return }
        let heat = fade * (1 - Ease.clamp01((state.elapsed - 0.3) / 1.3))
        guard heat > 0.02 else { return }
        let origin = CarArt.deformed(state.damage, dents: vehicle.dents, config: config)
        let phase = Double(vehicle.id) * 1.7
        for (index, offset) in [Vec2(0, 0), Vec2(-4, 3)].enumerated() {
            let flicker = 0.75 + 0.25 * sin(state.elapsed * 23 + phase + Double(index) * 2.1)
            let flame = CarArt.world(origin + offset, pose)
            let radius = (index == 0 ? 6.5 : 4.5) * flicker * (0.5 + 0.5 * heat) * min(strength, 1.2)
            list.add(.circle(center: flame, radius: radius), color: .fireOuter, opacity: 0.9 * heat, space: .world, id: RenderID.vehicle(vehicle.id, part: CarArt.Slot.flames + 2 * index))
            list.add(.circle(center: flame, radius: radius * 0.5), color: .fireCore, opacity: heat, space: .world, id: RenderID.vehicle(vehicle.id, part: CarArt.Slot.flames + 1 + 2 * index))
        }
    }

    /// Parts near a deep enough dent come off: bumpers, hood, mirrors and wheels fly with the
    /// car's own motion plus a kick away from it; broken glass bursts into shards.
    private mutating func tearOffParts(of wreck: Vehicle, config: Config, reduceMotion: Bool) {
        var velocity = (wreck.position - wreck.previousPosition) / World.stepDuration
        var spin = 0.0
        if case let .crashed(state) = wreck.phase {
            velocity = state.velocity
            spin = state.spin
        }
        var done = torn[wreck.id] ?? []
        let pose = Path.Pose(position: wreck.position, heading: wreck.heading)
        for part in CarArt.parts(wreck.type) where !done.contains(part) && CarArt.isBroken(part, type: wreck.type, dents: wreck.dents, config: config) {
            done.insert(part)
            let shape = CarArt.shape(part, type: wreck.type, config: config)
            let center = CarArt.world(shape.center, pose)
            let arm = center - wreck.position
            let carried = velocity + arm.left * spin
            let outward = arm.length > 1e-6 ? arm / arm.length : Vec2(angle: wreck.heading)
            if CarArt.isGlass(part) {
                for _ in 0..<6 {
                    let direction = Vec2(angle: rng.unit() * Angle.tau)
                    particles.append(Particle(
                        serial: next(),
                        kind: .debris(.vehicleGlass),
                        position: center + direction * 2,
                        velocity: reduceMotion ? .zero : carried + direction * rng.double(in: 20...60),
                        rotation: rng.unit() * Angle.tau,
                        spin: reduceMotion ? 0 : rng.double(in: -12...12),
                        size: Vec2(rng.double(in: 1.5...3), rng.double(in: 1...2)),
                        lifetime: rng.double(in: 0.9...1.3)
                    ))
                }
                continue
            }
            particles.append(Particle(
                serial: next(),
                kind: .part(shape.color),
                position: center,
                velocity: reduceMotion ? .zero : carried + outward * rng.double(in: 25...70),
                rotation: wreck.heading,
                spin: reduceMotion ? 0 : rng.double(in: 3...10) * (rng.unit() < 0.5 ? -1 : 1),
                size: shape.size,
                lifetime: rng.double(in: 1.8...2.4)
            ))
        }
        torn[wreck.id] = done
    }

    private func id(_ serial: Int, part: Int) -> Int {
        RenderID.effects + (serial % 20_000) * 10 + part
    }
}
