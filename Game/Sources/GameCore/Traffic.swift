/// AI traffic on the East, North and West arms (FOUNDATION.md 2.7).
///
/// The AI only enters with a safe gap (≥ `aiSafeGap` to the car ahead and behind),
/// counts merging player cars and never causes a crash. It fills the road with its own
/// cars up to `targetDensity`, whatever the player sends, and keeps at least
/// `minRingBots` on the ring: the player's cars go into the gaps between them.
extension World {
    mutating func updateTraffic(_ dt: Double) {
        spawnCooldown -= dt
        // Only cars standing at a line count: several may roll up at once, but they never
        // pile up waiting (`maxWaitingAI`).
        let waitingNow = vehicles.count(where: { if case let .waiting(w) = $0.phase { w.approach == 0 } else { false } })
        let regular = spawnCooldown <= 0 && densityCount < targetDensity && waitingNow < (config.maxWaitingAI ?? .max)
        if regular || needsReplacementBot {
            // An arm takes another car while its queue is short enough and the last one has
            // driven up a bit (`aiQueuePerArm`, more at higher levels). With one per arm, the
            // default, an arm is free only while nobody waits there.
            let queues = Dictionary(grouping: vehicles.compactMap { vehicle -> Vehicle.Waiting? in
                if case let .waiting(w) = vehicle.phase { return w }
                return nil
            }, by: \.arm)
            func takesAnother(_ arm: Arm) -> Bool {
                guard let queue = queues[arm], !queue.isEmpty else { return true }
                guard queue.count < max(1, config.aiQueuePerArm) else { return false }
                let last = queue.map(\.approach).max() ?? 0
                return last < config.aiApproachDistance - 2 * config.queueSpacing
            }
            // An arm a criminal or a transporter was announced for stays free for it.
            let free = openAIArms.filter { takesAnother($0) && $0 != reservedArm && $0 != reservedTransporterArm }
            if !free.isEmpty {
                spawnWaiting(at: rng.pick(free))
                spawnCooldown = rng.double(in: config.aiSpawnDelay)
            }
        }

        for i in vehicles.indices {
            guard case .waiting(var w) = vehicles[i].phase else { continue }
            if w.approach > 0 {
                w.approach = approachStep(w.approach, dt: dt, rolling: config.aiRollingMerge)
                // Rolling merge (higher levels): a car that reaches its line with a gap goes
                // straight in, no stop, no hesitation. Traffic flows instead of queuing.
                if w.approach == 0, config.aiRollingMerge {
                    w.reaction = 0
                }
                // Queued behind another car at the same arm: stop a car length behind it.
                if let ahead = waitingAhead(of: i, at: w.arm) {
                    w.approach = max(w.approach, ahead + config.queueSpacing)
                }
                vehicles[i].phase = .waiting(w)
                vehicles[i].place(approachPose(w))
                continue
            }
            w.reaction -= dt
            if w.reaction <= 0 && canEnter(w.arm) {
                let path = layout.entry(w.arm)
                var merge = Vehicle.Merging(
                    arm: w.arm,
                    exitArm: randomExit(from: w.arm),
                    profile: MergeProfile(pathLength: path.length, duration: config.mergeDuration, ringSpeed: ringSpeed),
                    elapsed: 0
                )
                // Higher levels: some AI cars stay a lap longer, so the ring fills up. Only
                // drawn then, so the traffic of lower levels stays exactly as it was.
                if config.aiLapChance > 0, rng.unit() < config.aiLapChance {
                    // Circling cars keep the ring full: often two laps, sometimes three.
                    merge.extraLaps = 1 + (rng.unit() < 0.6 ? 1 : 0) + (rng.unit() < 0.3 ? 1 : 0)
                }
                vehicles[i].phase = .merging(merge)
            } else {
                vehicles[i].phase = .waiting(w)
            }
        }
    }

    /// How far the nearest car ahead in the same arm queue still has to its stop line; nil
    /// if this car is the front one. Older cars are ahead.
    func waitingAhead(of index: Int, at arm: Arm) -> Double? {
        var nearest: Double?
        for j in vehicles.indices where j < index {
            guard case let .waiting(other) = vehicles[j].phase, other.arm == arm else { continue }
            nearest = max(nearest ?? -.infinity, other.approach)
        }
        return nearest
    }

    /// What the density is measured on: the AI's cars on the road, or from higher levels on
    /// only those on the ring and merging, so the ring itself really fills up. The player's
    /// cars never count: the ring belongs to the bots, and the player fits in between.
    var densityCount: Int {
        vehicles.count(where: { vehicle in
            guard vehicle.owner == .ai else { return false }
            switch vehicle.phase {
            case .ring, .merging: return true
            case .waiting: return config.densityCountsWaiting
            case .queued, .exiting, .crashed: return false
            }
        })
    }

    /// Fewer bots on and into the ring than `minRingBots`: a replacement is due right away,
    /// without the pause between spawns and whatever the density says.
    var needsReplacementBot: Bool {
        let incoming = vehicles.count { vehicle in
            guard vehicle.isBot else { return false }
            switch vehicle.phase {
            case .merging, .waiting: return true
            case .queued, .ring, .exiting, .crashed: return false
            }
        }
        return ringBotCount + incoming < config.minRingBots
    }

    /// Bots on the ring right now: past their merge, not yet on an exit, in one piece.
    public var ringBotCount: Int {
        vehicles.count { vehicle in
            guard vehicle.isBot, case .ring = vehicle.phase else { return false }
            return true
        }
    }

    /// Cars that count towards the density: on the ring, merging or about to enter.
    public var roadCount: Int {
        vehicles.count(where: { vehicle in
            switch vehicle.phase {
            case .ring, .merging, .waiting: true
            case .queued, .exiting, .crashed: false
            }
        })
    }

    mutating func spawnWaiting(at arm: Arm) {
        let waiting = Vehicle.Waiting(arm: arm, reaction: rng.double(in: config.aiReaction), approach: config.aiApproachDistance)
        vehicles.append(Vehicle(id: makeID(), type: rollTrafficType(), owner: .ai, phase: .waiting(waiting), pose: approachPose(waiting)))
    }

    /// Normal traffic is cars and lorries; everything else is announced (`Criminals`,
    /// `Transporters`).
    mutating func rollTrafficType() -> VehicleType {
        rng.unit() < config.truckChance ? .truck : .car
    }

    /// Where a car driving up to its stop line is: that far back along its lane.
    func approachPose(_ waiting: Vehicle.Waiting) -> Path.Pose {
        let stop = layout.stopPose(waiting.arm)
        return Path.Pose(position: stop.position - Vec2(angle: stop.heading) * waiting.approach, heading: stop.heading)
    }

    /// One step of driving up: at ring speed, then braking so it stops right at the line.
    func approachStep(_ distance: Double, dt: Double, rolling: Bool = false) -> Double {
        let braking = (2 * config.aiApproachBrake * config.gravity * distance).squareRoot()
        // Rolling up to the line keeps some speed, ready to go straight in.
        let speed = max(min(ringSpeed, braking), rolling ? ringSpeed * 0.35 : 8)
        return max(0, distance - speed * dt)
    }

    /// Whether a criminal or a transporter can be announced for `arm`: nobody waits there
    /// and nothing else is announced there, so the warning marks only the one that comes.
    func isFreeForWarning(_ arm: Arm) -> Bool {
        let waiting = vehicles.contains { vehicle in
            if case let .waiting(w) = vehicle.phase { return w.arm == arm }
            return false
        }
        return !waiting && arm != reservedArm && arm != reservedTransporterArm
    }

    /// Places a car directly on the ring. Used for the start of a shift and in tests.
    @discardableResult
    mutating func spawnRingCar(at s: Double, exitArm: Arm) -> Int {
        let s = Angle.wrap(s, period: layout.ring.length)
        let ring = Vehicle.Ring(
            s: s,
            exitArm: exitArm,
            distanceToExit: layout.ringDistance(from: s, to: layout.exitRingS(exitArm)),
            justMerged: nil
        )
        let vehicle = Vehicle(id: makeID(), type: rollTrafficType(), owner: .ai, phase: .ring(ring), pose: layout.ring.pose(at: s))
        vehicles.append(vehicle)
        return vehicle.id
    }

    /// Spreads `count` cars over the ring with safe gaps, so the first shift second is not empty.
    mutating func prefillRing(count: Int) {
        let circumference = layout.ring.length
        let minimumArc = config.carLength + config.aiSafeGap * ringSpeed
        var placed: [Double] = []
        var attempts = 0
        while placed.count < count && attempts < 200 {
            attempts += 1
            let s = rng.unit() * circumference
            let tooClose = placed.contains { other in
                let ahead = layout.ringDistance(from: other, to: s)
                return min(ahead, circumference - ahead) < minimumArc
            }
            if tooClose { continue }
            placed.append(s)
            spawnRingCar(at: s, exitArm: rng.pick(layout.aiArms))
        }
    }

    // MARK: - Safe-gap check

    /// True if an AI car launched now at `arm` keeps a safe gap on the ring and passes
    /// everyone on its entry path with room to spare. Player cars launched later are the
    /// player's responsibility.
    func canEnter(_ arm: Arm) -> Bool {
        // After a crash the AI waits until the traffic near its entry flows again.
        guard !isDisturbed(near: arm) else { return false }
        let profile = MergeProfile(pathLength: layout.entry(arm).length, duration: config.mergeDuration, ringSpeed: ringSpeed)
        let circumference = layout.ring.length
        let arrival = layout.entryRingS(arm)
        let minimumArc = config.carLength + config.aiSafeGap * ringSpeed

        for other in vehicles {
            guard let s = virtualRingPosition(of: other, after: profile.duration) else { continue }
            let ahead = layout.ringDistance(from: arrival, to: s)
            if min(ahead, circumference - ahead) < minimumArc { return false }
        }
        return predictedMergeGap(from: arm, samples: 30, stopBelow: config.aiPathClearance) >= config.aiPathClearance
    }

    /// Something near where `arm` joins the ring is not flowing: a wreck, or a driver who
    /// brakes, catches up or chases, up to `aiHazardAhead` seconds of ring downstream or
    /// `aiHazardBehind` upstream. The AI waits for that, as a driver would. Trouble on the
    /// far side of the ring, or a slow module zone elsewhere, is no reason: bots keep coming.
    func isDisturbed(near arm: Arm) -> Bool {
        let circumference = layout.ring.length
        let join = layout.entryRingS(arm)
        return vehicles.contains { vehicle in
            switch vehicle.phase {
            case .crashed: break
            case let .ring(r) where !r.drive.isInFlow: break
            case let .exiting(e) where !e.drive.isInFlow: break
            default: return false
            }
            let s = Angle.wrap(vehicle.position.angle) * layout.ringRadius
            let downstream = layout.ringDistance(from: join, to: s)
            return downstream <= config.aiHazardAhead * ringSpeed || circumference - downstream <= config.aiHazardBehind * ringSpeed
        }
    }

    /// Smallest gap (seconds, surface to surface) a car launched at `arm` would have to
    /// anyone on the road during its merge, if nobody else taps. ≤ 0 means it would crash.
    /// Exactly what a player sees coming: used by the AI and by the balancing bots.
    /// - Parameters:
    ///   - launchDelay: launch this many seconds from now instead of now.
    ///   - stopBelow: returns early once the gap drops below this.
    public func predictedMergeGap(
        from arm: Arm,
        launchDelay: Double = 0,
        samples: Int = 60,
        stopBelow: Double = -.infinity
    ) -> Double {
        let path = layout.entry(arm)
        let profile = MergeProfile(pathLength: path.length, duration: config.mergeDuration, ringSpeed: ringSpeed)
        let others = vehicles.filter { $0.isCollidable || $0.isCrashed }
        var smallest = Double.infinity
        for k in 0...samples {
            let t = profile.duration * Double(k) / Double(samples)
            let me = hitbox(at: path.pose(at: profile.distance(at: t)))
            for other in others {
                guard let pose = predictedPose(of: other, after: launchDelay + t) else { continue }
                smallest = min(smallest, Collision.gap(me, hitbox(at: pose, type: other.type)) / ringSpeed)
                if smallest < stopBelow { return smallest }
            }
        }
        return smallest
    }

    /// Like `predictedMergeGap`, but the smallest gap to each vehicle on its own, by id.
    /// Tells a chaser whether a police car would hit the criminal and nobody else.
    public func predictedMergeGaps(from arm: Arm, launchDelay: Double = 0, samples: Int = 60) -> [Int: Double] {
        let path = layout.entry(arm)
        let profile = MergeProfile(pathLength: path.length, duration: config.mergeDuration, ringSpeed: ringSpeed)
        var gaps: [Int: Double] = [:]
        for k in 0...samples {
            let t = profile.duration * Double(k) / Double(samples)
            let me = hitbox(at: path.pose(at: profile.distance(at: t)))
            for other in vehicles where other.isCollidable || other.isCrashed {
                guard let pose = predictedPose(of: other, after: launchDelay + t) else { continue }
                let gap = Collision.gap(me, hitbox(at: pose, type: other.type)) / ringSpeed
                gaps[other.id] = min(gaps[other.id] ?? .infinity, gap)
            }
        }
        return gaps
    }

    /// Where `vehicle` will be after `t` seconds if nobody taps. Nil once it has left the road.
    public func predictedPose(of vehicle: Vehicle, after t: Double) -> Path.Pose? {
        switch vehicle.phase {
        case let .merging(m):
            let elapsed = m.elapsed + t * ringSpeed / m.profile.ringSpeed
            if elapsed < m.profile.duration {
                return layout.entry(m.arm).pose(at: m.profile.distance(at: elapsed))
            }
            return ringOrExitPose(
                s: layout.entryRingS(m.arm),
                distanceToExit: layout.ringDistance(from: m.arm, toExit: m.exitArm),
                exitArm: m.exitArm,
                travelled: (elapsed - m.profile.duration) * m.profile.ringSpeed
            )
        case let .ring(r):
            return ringOrExitPose(s: r.s, distanceToExit: r.distanceToExit, exitArm: r.exitArm, travelled: (r.drive.speed ?? ringSpeed) * t)
        case let .exiting(e):
            let s = e.s + (e.drive.speed ?? ringSpeed) * t
            let exit = layout.exit(e.arm)
            return s < exit.length ? exit.pose(at: s) : nil
        case let .crashed(state):
            // A wreck skids to a stop at about the braking grip of its tyres.
            let speed = state.velocity.length
            let brake = config.tireGripBrake * config.gravity
            let time = min(t, speed / brake)
            let travelled = speed * time - brake * time * time / 2
            return Path.Pose(position: vehicle.position + state.velocity.normalized * travelled, heading: vehicle.heading + state.spin * time)
        case .queued, .waiting:
            return nil
        }
    }

    private func ringOrExitPose(s: Double, distanceToExit: Double, exitArm: Arm, travelled: Double) -> Path.Pose? {
        if travelled < distanceToExit {
            return layout.ring.pose(at: s + travelled)
        }
        let exit = layout.exit(exitArm)
        let e = travelled - distanceToExit
        return e < exit.length ? exit.pose(at: e) : nil
    }

    /// Ring position after `t` seconds. A merging car counts as if it were already on the
    /// ring: it joins exactly there, at ring speed. Nil if it is not on the ring then.
    func virtualRingPosition(of vehicle: Vehicle, after t: Double) -> Double? {
        let circumference = layout.ring.length
        switch vehicle.phase {
        case let .merging(m):
            let travelled = t * ringSpeed - m.remaining * m.profile.ringSpeed
            if travelled >= layout.ringDistance(from: m.arm, toExit: m.exitArm) { return nil }
            return Angle.wrap(layout.entryRingS(m.arm) + travelled, period: circumference)
        case let .ring(r):
            let travelled = (r.drive.speed ?? ringSpeed) * t
            if travelled >= r.distanceToExit { return nil }
            return Angle.wrap(r.s + travelled, period: circumference)
        case .queued, .waiting, .exiting, .crashed:
            return nil
        }
    }
}
