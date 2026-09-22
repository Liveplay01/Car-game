/// Drivers react to what happens ahead (after a crash): they see the hazard, need a moment
/// to react, then brake as hard as needed. If the room is too short, they crash too — chain
/// crashes and pile-ups follow from the physics, not from a script.
///
/// In normal traffic nothing here runs: every car flows at ring speed, exactly as before,
/// so the merge timing stays exact and fair.
extension World {
    /// Something on the road is not flowing: a wreck, or a driver who brakes or is catching up.
    public var isTrafficDisturbed: Bool {
        vehicles.contains { vehicle in
            switch vehicle.phase {
            case .crashed: true
            case let .ring(r): !r.drive.isInFlow && vehicle.type != .transporter
            case let .exiting(e): !e.drive.isInFlow
            case .queued, .waiting, .merging: false
            }
        }
    }

    /// The nearest thing ahead a driver has to mind.
    struct Lead {
        /// Surface to surface, along the road.
        var gap: Double
        /// Its speed along the road.
        var speed: Double
    }

    /// Something occupying the ring lane, at ring distance `s`.
    struct Occupant {
        var id: Int
        var s: Double
        var speed: Double
    }

    mutating func updateDrivers(_ dt: Double) {
        guard isTrafficDisturbed else { return }
        let lane = ringLaneOccupants()
        // Criminals and transporters do not brake for anything: they plough on.
        for i in vehicles.indices where vehicles[i].type != .pickup && vehicles[i].type != .transporter {
            let id = vehicles[i].id
            let vehicle = vehicles[i]
            // Police cars chasing a wanted criminal can go faster
            let isPoliceChasing = vehicle.type == .police && vehicle.owner == .player && hasActiveWantedAhead(of: vehicle, in: lane)
            let maxSpeed = isPoliceChasing ? ringSpeed * config.policeChaseSpeedFactor : ringSpeed
            switch vehicle.phase {
            case .ring(var r):
                let lead = leadOnRing(from: r.s, occupants: lane, excluding: id)
                r.drive = drive(r.drive, lead: lead, id: id, dt: dt, maxSpeed: maxSpeed)
                vehicles[i].phase = .ring(r)
            case .exiting(var e):
                let lead = leadOnExit(e.arm, from: e.s, excluding: id)
                e.drive = drive(e.drive, lead: lead, id: id, dt: dt, maxSpeed: maxSpeed)
                vehicles[i].phase = .exiting(e)
            case .queued, .waiting, .merging, .crashed:
                break
            }
        }
    }

    /// One driver, one step: notice, react, brake or catch up with the flow again.
    func drive(_ current: Drive, lead: Lead?, id: Int, dt: Double, maxSpeed: Double) -> Drive {
        var drive = current
        let g = config.gravity
        var speed = drive.speed ?? ringSpeed
        var needed = 0.0
        if let lead, speed > lead.speed {
            let room = lead.gap - config.stopGap
            needed = room > 0.5 ? (speed * speed - lead.speed * lead.speed) / (2 * room) : .infinity
        }
        let alarmed = needed > config.hazardBraking * g
        if alarmed && drive.reaction == nil {
            drive.reaction = reactionTime(of: id)
        }
        guard let reaction = drive.reaction else { return drive }
        if reaction > 0 {
            // Still taking it in: the car rolls on at its speed.
            drive.reaction = max(0, reaction - dt)
            drive.speed = speed
            return drive
        }
        if alarmed {
            speed = max(0, speed - min(needed * 1.1, config.driverBrake * g) * dt)
        } else if canSpeedUp(speed, behind: lead, maxSpeed: maxSpeed) {
            speed = min(maxSpeed, speed + config.driverAcceleration * g * dt)
        }
        if speed >= maxSpeed - 1e-9 && !alarmed {
            return Drive()
        }
        drive.speed = speed
        return drive
    }

    /// Enough room to pick up speed: the driver could still stop gently behind the lead.
    func canSpeedUp(_ speed: Double, behind lead: Lead?, maxSpeed: Double) -> Bool {
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
                occupants.append(Occupant(id: vehicle.id, s: r.s, speed: r.drive.speed ?? ringSpeed))
            case let .exiting(e) where e.s < config.carLength:
                // Still half in the ring lane.
                let s = Angle.wrap(layout.exitRingS(e.arm) + e.s, period: circumference)
                occupants.append(Occupant(id: vehicle.id, s: s, speed: e.drive.speed ?? ringSpeed))
            case let .crashed(state):
                // A wreck lying across the lane blocks it with its whole length.
                let nearest = wreckPoints(vehicle).min { abs($0.length - layout.ringRadius) < abs($1.length - layout.ringRadius) } ?? vehicle.position
                guard abs(nearest.length - layout.ringRadius) - config.carWidth / 2 < halfLane - config.carWidth / 2 + 1 else { continue }
                let s = Angle.wrap(nearest.angle, period: Angle.tau) * layout.ringRadius
                let tangent = Vec2(angle: nearest.angle + .pi / 2)
                occupants.append(Occupant(id: vehicle.id, s: s, speed: max(0, state.velocity.dot(tangent))))
            case .queued, .waiting, .merging, .exiting:
                break
            }
        }
        return occupants
    }

    func leadOnRing(from s: Double, occupants: [Occupant], excluding id: Int) -> Lead? {
        let circumference = layout.ring.length
        var nearest: Lead?
        for occupant in occupants where occupant.id != id {
            let ahead = layout.ringDistance(from: s, to: occupant.s)
            guard ahead > 0, ahead < circumference / 2 else { continue }
            let gap = ahead - config.carLength
            if nearest == nil || gap < nearest!.gap {
                nearest = Lead(gap: gap, speed: occupant.speed)
            }
        }
        return nearest
    }

    /// Whether there's an active wanted criminal ahead of the given vehicle in the lane.
    func hasActiveWantedAhead(of policeCar: Vehicle, in lane: [Occupant]) -> Bool {
        guard policeCar.type == .police && policeCar.owner == .player else { return false }
        guard case let .ring(r) = policeCar.phase else { return false }
        guard case .active = criminal.phase else { return false }
        guard let criminalVehicle = criminal.vehicle,
              let criminalVehicleData = self.vehicle(id: criminalVehicle),
              case let .ring(criminalRing) = criminalVehicleData.phase else { return false }
        // Check if criminal is ahead (in direction of travel) within half the ring
        let ahead = layout.ringDistance(from: r.s, to: criminalRing.s)
        return ahead > 0 && ahead < layout.ring.length / 2
    }

    /// Cars ahead on the same exit, and wrecks lying across it.
    func leadOnExit(_ arm: Arm, from s: Double, excluding id: Int) -> Lead? {
        let path = layout.exit(arm)
        let halfLane = config.laneWidth / 2 + config.carWidth / 2
        var nearest: Lead?
        func consider(_ gap: Double, _ speed: Double) {
            if nearest == nil || gap < nearest!.gap {
                nearest = Lead(gap: gap, speed: speed)
            }
        }
        for vehicle in vehicles where vehicle.id != id {
            switch vehicle.phase {
            case let .exiting(e) where e.arm == arm && e.s > s:
                consider(e.s - s - config.carLength, e.drive.speed ?? ringSpeed)
            case let .crashed(state):
                let hits = wreckPoints(vehicle).map { path.nearest(to: $0) }
                guard let (along, distance) = hits.min(by: { $0.distance < $1.distance }),
                      distance - config.carWidth / 2 < halfLane - config.carWidth / 2 + 1, along > s else { continue }
                let tangent = Vec2(angle: path.pose(at: along).heading)
                consider(along - s - config.carLength, max(0, state.velocity.dot(tangent)))
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
