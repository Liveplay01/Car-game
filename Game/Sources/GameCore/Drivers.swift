/// Drivers react to what happens ahead (after a crash): they see the hazard, need a moment
/// to react, then brake as hard as needed. If the room is too short, they crash too — chain
/// crashes and pile-ups follow from the physics, not from a script.
///
/// In normal traffic nothing here runs: every car flows at ring speed, exactly as before,
/// so the merge timing stays exact and fair.
extension World {
    /// Something on the road is not flowing: a wreck, a driver who brakes or is catching up,
    /// or a police car chasing the criminal.
    public var isTrafficDisturbed: Bool {
        vehicles.contains { vehicle in
            switch vehicle.phase {
            case .crashed: true
            case let .ring(r): !r.drive.isInFlow
            case let .exiting(e): !e.drive.isInFlow
            case .queued, .waiting, .merging: false
            }
        }
    }

    /// The nearest thing ahead a driver has to mind.
    struct Lead {
        var id: Int
        /// Surface to surface, along the road.
        var gap: Double
        /// Its speed along the road.
        var speed: Double
        /// How much lane it takes: the cars behind it queue up after its full length.
        var length = 0.0
    }

    /// Something occupying the ring lane, at ring distance `s`.
    struct Occupant {
        var id: Int
        var s: Double
        var speed: Double
        /// How long the body in the lane is: a lorry takes more room than a car.
        var length: Double
    }

    mutating func updateDrivers(_ dt: Double) {
        let quarry = pursuitQuarry
        guard isTrafficDisturbed || quarry != nil || !config.modules.isEmpty else { return }
        let lane = ringLaneOccupants()
        // Criminals do not brake for anything: they plough on. The transporter brakes like
        // everybody else; a crash would wreck it.
        for i in vehicles.indices where vehicles[i].type == .pickup {
            // The one exception: the criminal keeps out of the transporter's secure zone
            // (Leo). It brakes for that and nothing else, and no module slows it.
            guard case var .ring(r) = vehicles[i].phase else { continue }
            let truck = transporterAhead(ofRingS: r.s)
            guard truck != nil || !r.drive.isInFlow else { continue }
            r.drive = drive(r.drive, leads: truck.map { [$0] } ?? [], id: vehicles[i].id, dt: dt)
            vehicles[i].phase = .ring(r)
        }
        for i in vehicles.indices where vehicles[i].type != .pickup {
            let id = vehicles[i].id
            switch vehicles[i].phase {
            case .ring(var r):
                // A driver looks past the car in front: a queue further ahead shows too.
                let leads = leadsOnRing(from: r.s, occupants: lane, excluding: id)
                if let quarry, leads.first?.id == quarry, vehicles[i].isPlayerPolice {
                    r.drive = pursue(r.drive, dt: dt)
                } else {
                    r.drive = drive(r.drive, leads: leads, id: id, limit: speedLimit(atRingS: r.s), dt: dt)
                }
                vehicles[i].phase = .ring(r)
            case .exiting(var e):
                let lead = leadOnExit(e.arm, from: e.s, excluding: id)
                e.drive = drive(e.drive, leads: lead.map { [$0] } ?? [], id: id, dt: dt)
                vehicles[i].phase = .exiting(e)
            case .queued, .waiting, .merging, .crashed:
                break
            }
        }
    }

    /// The criminal, while it is on the ring and one of your police cars is too: a police
    /// car right behind it gives chase.
    var pursuitQuarry: Int? {
        guard case let .active(id, _) = criminal.phase, let pickup = vehicle(id: id), case .ring = pickup.phase else { return nil }
        let policeOnRing = vehicles.contains { vehicle in
            guard vehicle.isPlayerPolice, case .ring = vehicle.phase else { return false }
            return true
        }
        return policeOnRing ? id : nil
    }

    /// A police car with the criminal directly ahead: it speeds up to
    /// `policeChaseSpeedFactor` and does not brake for the pickup, it rams it (the takedown).
    /// It keeps circling while it chases (`moveVehicles`).
    func pursue(_ current: Drive, dt: Double) -> Drive {
        var drive = current
        let top = ringSpeed * config.policeChaseSpeedFactor
        drive.speed = min(top, (drive.speed ?? ringSpeed) + config.driverAcceleration * config.gravity * dt)
        drive.reaction = 0
        drive.isPursuing = true
        return drive
    }

    /// One driver, one step: notice, react, brake or get back into the flow, from below
    /// after braking or from above after a chase.
    ///
    /// Slow or standing traffic ahead is seen coming (Leo: "möglichst früh genug bremsen"):
    /// the driver brakes at once and gently, so it rolls up behind the queue with a little
    /// room to spare and then drives as slowly as the car in front. Only a wreck is a
    /// surprise that takes a moment to take in (`driverReaction`); that is where pile-ups
    /// still come from.
    /// - Parameters:
    ///   - leads: what is ahead, nearest first; the queue behind the nearest counts too.
    ///   - limit: how fast this driver may go where it is (a module's zone).
    func drive(_ current: Drive, leads: [Lead], id: Int, limit: Double? = nil, dt: Double) -> Drive {
        var drive = current
        drive.isPursuing = false
        if !current.isInFlow { drive.outOfFlowTime += dt }
        let g = config.gravity
        let limit = limit ?? ringSpeed
        var speed = drive.speed ?? ringSpeed
        let lead = leads.first
        var needed = 0.0
        var cause: Lead?
        // The room each car in between needs once it has stopped.
        var queued = 0.0
        for ahead in leads {
            if speed > ahead.speed {
                // Aim to arrive with some room to spare, not exactly at the stop gap.
                let room = ahead.gap - queued - config.stopGap - config.followMargin * ahead.speed
                var brake = room > 0.5 ? (speed * speed - ahead.speed * ahead.speed) / (2 * room) : .infinity
                // A car that is only a bit slower is no reason to brake yet: that is what
                // would send a wave round the ring. Standing traffic and wrecks always are.
                if ahead.speed > config.standingSpeed, brake < config.followBraking * g { brake = 0 }
                if brake > needed {
                    needed = brake
                    cause = ahead
                }
            }
            queued += ahead.length + config.stopGap
        }
        let alarmed = needed > config.hazardBraking * g
        // Only real braking counts towards a jam, not gently rolling up to a queue.
        if needed > config.jamBraking * g { drive.hazardTime += dt }
        if alarmed && drive.reaction == nil {
            // A wreck takes a moment to take in; slow traffic was seen coming, and so is a
            // wreck with a queue already standing in front of it.
            func isWreck(_ lead: Lead) -> Bool { vehicle(id: lead.id)?.isCrashed ?? false }
            let queueInFront = leads.prefix { $0.id != cause?.id }.contains { !isWreck($0) && $0.speed < speed }
            let surprise = cause.map(isWreck) ?? false && !queueInFront
            drive.reaction = surprise ? reactionTime(of: id) : 0
        }
        if let reaction = drive.reaction, reaction > 0 {
            // Still taking it in: the car rolls on at its speed.
            drive.reaction = max(0, reaction - dt)
            drive.speed = speed
            return drive
        }
        if alarmed {
            speed = max(0, speed - min(needed * 1.1, config.driverBrake * g) * dt)
        } else if speed > limit {
            // Over the limit: off the gas, or braking for a module's zone.
            speed = max(limit, speed - config.driverAcceleration * g * dt)
        } else if canSpeedUp(speed, behind: lead) {
            speed = min(limit, speed + config.driverAcceleration * g * dt)
        }
        if abs(speed - ringSpeed) < 1e-9 && !alarmed {
            return Drive()
        }
        drive.speed = speed
        return drive
    }

    /// Enough room to pick up speed: the driver could still stop gently behind the lead.
    func canSpeedUp(_ speed: Double, behind lead: Lead?) -> Bool {
        guard let lead else { return true }
        let comfortable = 0.3 * config.gravity
        let needed = max(0, speed * speed - lead.speed * lead.speed) / (2 * comfortable)
        return lead.gap - config.stopGap > needed + 0.3 * speed + 1
    }

    /// Each driver reacts a little differently, always the same for the same car.
    func reactionTime(of id: Int) -> Double {
        var random = SeededRandom(seed: seed ^ (UInt64(id) &* 0x9E37_79B9_7F4A_7C15))
        return random.double(in: config.driverReaction)
    }

    // MARK: - What is ahead

    /// Ring cars, wrecks lying in the lane and cars just turning off, by ring distance.
    func ringLaneOccupants() -> [Occupant] {
        let circumference = layout.ring.length
        let halfLane = config.laneWidth / 2 + config.carWidth / 2
        var occupants: [Occupant] = []
        for vehicle in vehicles {
            switch vehicle.phase {
            case let .ring(r):
                occupants.append(Occupant(id: vehicle.id, s: r.s, speed: r.drive.speed ?? ringSpeed, length: length(of: vehicle.type)))
            case let .exiting(e) where e.s < config.carLength:
                // Still half in the ring lane.
                let s = Angle.wrap(layout.exitRingS(e.arm) + e.s, period: circumference)
                occupants.append(Occupant(id: vehicle.id, s: s, speed: e.drive.speed ?? ringSpeed, length: length(of: vehicle.type)))
            case let .crashed(state):
                // A wreck lying across the lane blocks it with its whole length.
                let nearest = wreckPoints(vehicle).min { abs($0.length - layout.ringRadius) < abs($1.length - layout.ringRadius) } ?? vehicle.position
                guard abs(nearest.length - layout.ringRadius) - config.carWidth / 2 < halfLane - config.carWidth / 2 + 1 else { continue }
                let s = Angle.wrap(nearest.angle, period: Angle.tau) * layout.ringRadius
                let tangent = Vec2(angle: nearest.angle + .pi / 2)
                occupants.append(Occupant(id: vehicle.id, s: s, speed: max(0, state.velocity.dot(tangent)), length: length(of: vehicle.type)))
            case .queued, .waiting, .merging, .exiting:
                break
            }
        }
        return occupants
    }

    func leadOnRing(from s: Double, occupants: [Occupant], excluding id: Int) -> Lead? {
        leadsOnRing(from: s, occupants: occupants, excluding: id, count: 1).first
    }

    /// The nearest `count` things ahead in the ring lane, nearest first.
    func leadsOnRing(from s: Double, occupants: [Occupant], excluding id: Int, count: Int = 3) -> [Lead] {
        let circumference = layout.ring.length
        var ahead: [Lead] = []
        for occupant in occupants where occupant.id != id {
            let distance = layout.ringDistance(from: s, to: occupant.s)
            guard distance > 0, distance < circumference / 2 else { continue }
            ahead.append(Lead(id: occupant.id, gap: distance - occupant.length, speed: occupant.speed, length: occupant.length))
        }
        return Array(ahead.sorted { ($0.gap, $0.id) < ($1.gap, $1.id) }.prefix(count))
    }

    /// Cars ahead on the same exit, and wrecks lying across it.
    func leadOnExit(_ arm: Arm, from s: Double, excluding id: Int) -> Lead? {
        let path = layout.exit(arm)
        let halfLane = config.laneWidth / 2 + config.carWidth / 2
        var nearest: Lead?
        func consider(_ id: Int, _ gap: Double, _ speed: Double) {
            if nearest == nil || gap < nearest!.gap {
                nearest = Lead(id: id, gap: gap, speed: speed)
            }
        }
        for vehicle in vehicles where vehicle.id != id {
            switch vehicle.phase {
            case let .exiting(e) where e.arm == arm && e.s > s:
                consider(vehicle.id, e.s - s - length(of: vehicle.type), e.drive.speed ?? ringSpeed)
            case let .crashed(state):
                let hits = wreckPoints(vehicle).map { path.nearest(to: $0) }
                guard let (along, distance) = hits.min(by: { $0.distance < $1.distance }),
                      distance - config.carWidth / 2 < halfLane - config.carWidth / 2 + 1, along > s else { continue }
                let tangent = Vec2(angle: path.pose(at: along).heading)
                consider(vehicle.id, along - s - config.carLength, max(0, state.velocity.dot(tangent)))
            default:
                break
            }
        }
        return nearest
    }
}

extension World {
    /// Nose, centre and tail of a wreck: enough to tell whether it reaches into a lane.
    func wreckPoints(_ vehicle: Vehicle) -> [Vec2] {
        let capsule = hitbox(of: vehicle)
        let forward = (capsule.b - capsule.a).normalized * capsule.radius
        return [capsule.a - forward, vehicle.position, capsule.b + forward]
    }
}

extension Path {
    /// Distance along the path of the point nearest to `point`, and how far away that is.
    /// Coarse samples, then a finer look around the best one.
    public func nearest(to point: Vec2, step: Double = 4) -> (s: Double, distance: Double) {
        func distance(_ s: Double) -> Double { self.point(at: s).distance(to: point) }
        let count = max(1, Int(length / step))
        var best = 0.0
        var bestDistance = distance(0)
        for k in 1...count {
            let s = length * Double(k) / Double(count)
            let d = distance(s)
            if d < bestDistance {
                best = s
                bestDistance = d
            }
        }
        let fine = length / Double(count) / 8
        for k in -8...8 {
            let s = min(max(best + Double(k) * fine, 0), length)
            let d = distance(s)
            if d < bestDistance {
                best = s
                bestDistance = d
            }
        }
        return (best, bestDistance)
    }
}
