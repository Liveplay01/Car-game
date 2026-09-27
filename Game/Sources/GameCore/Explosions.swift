import Foundation

/// Explosives (Leo, 27.09.2026): the gas tanker in normal traffic and the military truck
/// with its bomb. Both are real physics like every crash (`CrashPhysics`): the blast is an
/// impulse on everything around it, off-centre hits spin, the sheet metal dents on the side
/// facing the blast. A tanker caught in a blast goes up too, and so does the bomb.
public enum ExplosionKind: Sendable, Equatable {
    /// A gas tanker: wrecks everything within `tankerBlastRadius`.
    case tanker
    /// The military truck's bomb: blows up everything on the road and ends the shift.
    case bomb
}

public struct ExplosionReport: Sendable, Equatable {
    public var kind: ExplosionKind
    /// The vehicle that went up.
    public var source: Int
    public var point: Vec2
    public var radius: Double
    public var time: Double
    /// Vehicles the blast turned into wrecks, the source not counted.
    public var wrecked: [Int]
    /// Mayhem: the flames the blast earned, and the chain reaction after it.
    public var flames = 0
    public var chain = 0
}

/// The military truck (Leo, 27.09.2026): a warning, then it enters from an AI arm and
/// circles the ring with a no-go zone around it. After `militaryTime` it leaves at its next
/// exit. A car merging into the zone, or anything hitting the truck, sets the bomb off.
public struct MilitaryState: Sendable, Equatable {
    public enum Phase: Sendable, Equatable {
        /// Nothing going on; the next warning comes at shift time `next`.
        case idle(next: Double)
        /// "DANGER": the truck shows up at `arm` at shift time `until`.
        case warning(arm: Arm, until: Double)
        /// Waiting at its stop line or merging; the zone is not up yet.
        case arriving(vehicle: Int)
        /// On the ring, zone up; it takes its next exit after shift time `deadline`.
        case active(vehicle: Int, deadline: Double)
        /// Time is up, or the shift ended: it drives off at its next exit.
        case leaving(vehicle: Int)
        /// The bomb went off.
        case detonated
    }

    public internal(set) var phase: Phase
    /// Trucks that came this shift (`Config.militaryPerShift`).
    public internal(set) var count = 0

    /// The truck on the road, if any.
    public var vehicle: Int? {
        switch phase {
        case let .arriving(id), let .active(id, _), let .leaving(id): id
        case .idle, .warning, .detonated: nil
        }
    }
}

extension World {
    // MARK: - Explosions

    /// A live tanker or military truck just became a wreck (or the bomb's zone was
    /// breached): it goes up. Everything within the blast becomes a wreck too, thrown away
    /// from it; tankers and the truck among them go up in turn. The bomb ends the shift.
    mutating func explode(_ sourceID: Int, now: Double) {
        guard let index = index(of: sourceID), vehicles[index].type.isExplosive else { return }
        let kind: ExplosionKind = vehicles[index].type == .military ? .bomb : .tanker
        let center = vehicles[index].position
        let radius = kind == .bomb ? config.bombBlastRadius : config.tankerBlastRadius
        let speed = kind == .bomb ? config.bombBlastSpeed : config.tankerBlastSpeed
        tearApart(index)

        var wrecked: [Int] = []
        var chained: [Int] = []
        var flames = 0
        var chain = 0
        for i in vehicles.indices where i != index {
            let vehicle = vehicles[i]
            // On the road, standing at a stop line or already a wreck; the player's queue
            // stays out of it.
            if case .queued = vehicle.phase { continue }
            let capsule = hitbox(of: vehicle)
            let nearest = Self.closestPoint(onSegment: capsule.a, capsule.b, to: center)
            let distance = max(0, nearest.distance(to: center) - capsule.radius)
            guard distance < radius else { continue }
            let falloff = kind == .bomb ? max(0.45, 1 - distance / 260) : 1 - distance / radius
            let direction = (nearest - center).normalized
            let away = direction == .zero ? Vec2(angle: vehicle.heading).left : direction
            // The side facing the blast takes it: that is where the push acts and the dent is.
            let point = nearest - away * capsule.radius
            var body = body(of: vehicle)
            let kick = away * (speed * (0.4 + 0.6 * falloff))
            body.velocity += kick
            // The pressure spreads over the whole side, so an off-centre blast spins a car
            // less than a point impact of the same size would.
            body.angularVelocity += 0.2 * (point - body.position).cross(kick) * body.mass / body.inertia
            // A little tumble of its own, the same for the same car every time.
            body.angularVelocity += (Self.unitHash(vehicle.id) - 0.5) * 8 * falloff
            addDent(i, at: point, impact: speed * falloff * 1.6)
            let wasLive = !vehicle.isCrashed
            makeWreck(i, point, body)
            guard wasLive else { continue }
            wrecked.append(vehicle.id)
            if config.mayhem, isScoring {
                let scored = scoreMayhem(at: now, heavy: vehicle.type.isHeavy)
                flames += scored.flames
                chain = scored.chain
            }
            if vehicle.type.isExplosive { chained.append(vehicle.id) }
            if isLiveCriminal(vehicle) { criminalWrecked(vehicle.id, at: point, now: now) }
            if vehicle.type == .transporter { transporterWrecked(vehicle.id, at: point, now: now) }
        }
        events.append(.explosion(ExplosionReport(
            kind: kind, source: sourceID, point: center, radius: radius, time: now,
            wrecked: wrecked, flames: flames, chain: chain
        )))
        if kind == .bomb { bombWentOff(now: now) }
        for id in chained {
            explode(id, now: now)
        }
    }

    /// The exploding vehicle itself: dented all round, and it jumps and spins where it stands.
    private mutating func tearApart(_ index: Int) {
        let vehicle = vehicles[index]
        let half = length(of: vehicle.type) / 2
        let side = config.carWidth / 2
        for corner in [Vec2(half, side), Vec2(half, -side), Vec2(-half, side), Vec2(-half, -side), Vec2(0, side), Vec2(0, -side)] {
            addDent(index, at: worldPoint(corner, of: vehicle), impact: config.maxDent / config.dentPerImpact)
        }
        var body = body(of: vehicle)
        body.velocity = body.velocity * 0.3
        body.angularVelocity += (Self.unitHash(vehicle.id &+ 7) - 0.5) * 6
        makeWreck(index, vehicle.position, body)
    }

    /// The bomb went off: the truck is gone and the shift is over. In Mayhem it is the big
    /// finale, anywhere else a loss: the same level again.
    private mutating func bombWentOff(now: Double) {
        military.phase = .detonated
        shift.detonated = true
        guard mode == .shift, isScoring else { return }
        endShift(config.mayhem ? .completed : .struckOut, at: now)
    }

    /// A point in a vehicle's own frame (x forward, y to the left) in world space.
    func worldPoint(_ local: Vec2, of vehicle: Vehicle) -> Vec2 {
        let forward = Vec2(angle: vehicle.heading)
        return vehicle.position + forward * local.x + forward.left * local.y
    }

    static func closestPoint(onSegment a: Vec2, _ b: Vec2, to p: Vec2) -> Vec2 {
        let ab = b - a
        let length = ab.lengthSquared
        guard length > 1e-12 else { return a }
        let t = min(max((p - a).dot(ab) / length, 0), 1)
        return a + ab * t
    }

    /// 0…1 from an id, the same on every platform.
    static func unitHash(_ id: Int) -> Double {
        var hash = UInt64(bitPattern: Int64(id)) &* 0x9E37_79B9_7F4A_7C15
        hash ^= hash >> 31
        hash &*= 0xBF58_476D_1CE4_E5B9
        hash ^= hash >> 29
        return Double(hash >> 11) * 0x1.0p-53
    }

    // MARK: - The military truck

    /// The arm a warned military truck will come from; AI traffic keeps it free.
    var reservedMilitaryArm: Arm? {
        if case let .warning(arm, _) = military.phase { return arm }
        return nil
    }

    /// The truck's time is up, but it still circles until a bot has taken its place.
    var isMilitaryOverdue: Bool {
        if case let .active(_, deadline) = military.phase { return time >= deadline }
        return false
    }

    /// The truck may go: enough bots stay on the ring without it (none of them on its way out).
    var canMilitaryLeave: Bool {
        let staying = vehicles.count { vehicle in
            guard vehicle.isBot, case let .ring(r) = vehicle.phase else { return false }
            return !r.isLeaving
        }
        return staying >= config.minRingBots
    }

    /// The truck on its rounds: it does not leave yet.
    func isEscorted(_ id: Int) -> Bool {
        if case let .active(truck, _) = military.phase { return truck == id }
        return false
    }

    /// The truck whose zone is up, if it is in one piece.
    public var activeMilitaryTruck: Vehicle? {
        guard case let .active(id, _) = military.phase, let truck = vehicle(id: id), !truck.isCrashed else { return nil }
        return truck
    }

    mutating func updateMilitary(now: Double) {
        guard mode == .shift else { return }
        // The shift is over: a truck on its rounds drives off, once a bot has taken its place.
        guard isScoring else {
            if case let .active(id, deadline) = military.phase {
                military.phase = .active(vehicle: id, deadline: min(deadline, now))
                if canMilitaryLeave { military.phase = .leaving(vehicle: id) }
            }
            return
        }
        guard shift.startedAt != nil else { return }
        // No new truck after your last car; one on its way is called off.
        if !shift.acceptsTaps {
            switch military.phase {
            case .warning:
                military.phase = .idle(next: .infinity)
            case let .arriving(id):
                military.phase = .idle(next: .infinity)
                demoteToOrdinaryTraffic(id, as: .truck)
            case .idle, .active, .leaving, .detonated: break
            }
        }
        switch military.phase {
        case let .idle(next):
            guard shift.acceptsTaps, now >= next, military.count < config.militaryPerShift else { return }
            let candidates = openAIArms.filter { isFreeForWarning($0) }
            guard !candidates.isEmpty else { return }
            let arm = militaryRng.pick(candidates)
            military.phase = .warning(arm: arm, until: now + config.militaryWarning)
            events.append(.militaryWarning(arm: arm, time: now))

        case let .warning(arm, until):
            let occupied = vehicles.contains { vehicle in
                if case let .waiting(w) = vehicle.phase { return w.arm == arm }
                return false
            }
            guard now >= until, !occupied else { return }
            let waiting = Vehicle.Waiting(arm: arm, reaction: 0, approach: config.aiApproachDistance)
            let truck = Vehicle(id: makeID(), type: .military, owner: .ai, phase: .waiting(waiting), pose: approachPose(waiting))
            vehicles.append(truck)
            military.count += 1
            military.phase = .arriving(vehicle: truck.id)

        case let .arriving(id):
            guard let truck = vehicle(id: id), !truck.isCrashed else {
                military.phase = .idle(next: now + militaryRng.double(in: config.militaryInterval))
                return
            }
            if case .ring = truck.phase {
                let deadline = now + config.militaryTime
                military.phase = .active(vehicle: id, deadline: deadline)
                events.append(.militaryEntered(vehicle: id, deadline: deadline))
            }

        case let .active(id, deadline):
            guard let truck = vehicle(id: id), !truck.isCrashed else {
                military.phase = .idle(next: now + militaryRng.double(in: config.militaryInterval))
                return
            }
            // Somebody merged into the zone: the bomb goes off.
            if isZoneBreached(by: truck) {
                explode(id, now: now)
                return
            }
            // Time is up: it leaves once the bots it counted as one are enough without it.
            if now >= deadline, canMilitaryLeave {
                military.phase = .leaving(vehicle: id)
            }

        case let .leaving(id):
            if vehicle(id: id) == nil {
                military.phase = .idle(next: now + militaryRng.double(in: config.militaryInterval))
            }

        case .detonated:
            break
        }
    }

    /// The zone as three short capsules along the ring, so it follows the curve: centred on
    /// the truck, `militaryZoneArc` long, as wide as a car.
    public func militaryZone(around ringS: Double) -> [Capsule] {
        let third = config.militaryZoneArc / 3
        return [-third, 0, third].map { offset in
            let pose = layout.ring.pose(at: Angle.wrap(ringS + offset, period: layout.ring.length))
            return Capsule(center: pose.position, heading: pose.heading, length: third + config.carWidth, width: config.carWidth)
        }
    }

    /// Smallest gap from `capsule` to the zone of a truck at `ringS`.
    func gapToZone(_ capsule: Capsule, ringS: Double) -> Double {
        militaryZone(around: ringS).map { Collision.gap(capsule, $0) }.min() ?? .infinity
    }

    /// A car merging (the player's or anyone's) touches the truck's zone.
    func isZoneBreached(by truck: Vehicle) -> Bool {
        guard case let .ring(r) = truck.phase else { return false }
        return vehicles.contains { other in
            guard other.id != truck.id, !other.isCrashed, other.activeMerge != nil else { return false }
            return gapToZone(hitbox(of: other), ringS: r.s) <= 0
        }
    }

    /// Where the truck's zone will be after `t` seconds, as a ring distance; nil without an
    /// active truck. It flows with the ring like everyone.
    func predictedZoneS(after t: Double) -> Double? {
        guard let truck = activeMilitaryTruck, case let .ring(r) = truck.phase else { return nil }
        return r.s + (r.drive.speed ?? ringSpeed) * t
    }

    /// The military truck does not arrive with anyone's middle inside its zone (`joinsTooClose`).
    /// Everyone else keeps out of the zone through the gap they read (`predictedMergeGap`).
    /// Only just so much: a truck waiting for a wide gap would close its arm for long.
    func joinsMilitaryZone(_ vehicle: Vehicle, at arm: Arm) -> Bool {
        guard vehicle.type == .military else { return false }
        let profile = MergeProfile(pathLength: layout.entry(arm).length, duration: config.mergeDuration, ringSpeed: ringSpeed)
        let arrival = layout.entryRingS(arm)
        let apart = config.militaryZoneArc / 2 + 4
        return vehicles.contains { other in
            guard other.id != vehicle.id, !other.isCrashed,
                  let s = virtualRingPosition(of: other, after: profile.duration) else { return false }
            let ahead = layout.ringDistance(from: arrival, to: s)
            return min(ahead, layout.ring.length - ahead) < apart
        }
    }
}
