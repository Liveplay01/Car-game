import Foundation

/// Game state plus rules. Fixed step of 1/120 s, deterministic: the same seed and the
/// same taps give the same result on every platform (FOUNDATION.md 4.1).
///
/// A value type on purpose: copies are cheap snapshots for tests, replays and predictions.
public struct World: Sendable {
    public static let stepRate = 120
    public static let stepDuration = 1.0 / Double(stepRate)

    public enum Mode: Sendable, Equatable {
        /// A shift: a number of cars to bring into traffic, with rush hour for the last ones
        /// and crashes that end it (FOUNDATION.md 2.5).
        case shift
        /// Endless traffic at `freePlayDensity`: behind the start screen and in tests.
        /// Merges and crashes are still scored, but there is no clock and no strike limit.
        case freePlay
    }

    public let config: Config
    public let layout: RoundaboutLayout
    public let seed: UInt64
    public let mode: Mode
    public internal(set) var stepCount = 0
    /// Ordered by creation (id). Never iterate a dictionary here: its order is random per process.
    public internal(set) var vehicles: [Vehicle] = []
    public internal(set) var queue = PlayerQueue()
    public internal(set) var shift = ShiftState()
    public internal(set) var score = ScoreBoard()
    public internal(set) var criminal = CriminalState(phase: .idle(next: .infinity))
    public internal(set) var transporter = TransporterState(phase: .idle(next: .infinity))
    /// Speed of everything on the ring. All ring cars share it, so the ring itself never crashes.
    public internal(set) var ringSpeed: Double
    /// The AI fills the road up to this many cars (ring, merging and waiting).
    public var targetDensity: Int

    var rng: SeededRandom
    /// Own streams for the queue's vehicle types and for criminals, so adding them left the
    /// traffic of every seed exactly as it was.
    var queueRng: SeededRandom
    var criminalRng: SeededRandom
    var transporterRng: SeededRandom
    var nextVehicleID = 1
    var pendingTaps: [Double] = []
    var spawnCooldown = 0.0
    var events: [GameEvent] = []
    /// After the shift before: the ring speed glides from `from`, starting at world time `since`.
    var tempoGlide: (from: Double, since: Double)?

    public var time: Double { Double(stepCount) * Self.stepDuration }

    /// - Parameters:
    ///   - prefill: spread the start density over the ring, so the first second is not empty.
    ///   - startsOnFirstTap: the shift waits, traffic flowing, until its first tap sends the
    ///     front car; the game does that. Tests and bots start the clock right away.
    public init(config: Config = Config(), seed: UInt64, mode: Mode = .shift, prefill: Bool = true, startsOnFirstTap: Bool = false) {
        self.init(config: config, seed: seed, mode: mode, prefill: prefill, startsOnFirstTap: startsOnFirstTap, firstVehicleID: 1)
    }

    init(config: Config, seed: UInt64, mode: Mode, prefill: Bool, startsOnFirstTap: Bool, firstVehicleID: Int) {
        self.config = config
        layout = RoundaboutLayout(config: config)
        self.seed = seed
        self.mode = mode
        rng = SeededRandom(seed: seed)
        queueRng = SeededRandom(seed: seed ^ 0x51ED_2701_A3C4_9B17)
        criminalRng = SeededRandom(seed: seed ^ 0xB5AD_4ECE_DA1C_E2A9)
        transporterRng = SeededRandom(seed: seed ^ 0x9F31_4D7C_2E8B_0A56)
        ringSpeed = config.ringSpeed
        targetDensity = config.freePlayDensity
        nextVehicleID = firstVehicleID
        startShift(waiting: startsOnFirstTap)
        applyShiftCurves(at: 0)
        if mode == .shift {
            let first = criminalRng.double(in: config.criminalFirst)
            // Some shifts have no criminal at all (`criminalChance`, the Quiet Streets upgrade).
            criminal.phase = .idle(next: criminalRng.unit() < config.criminalChance ? first : .infinity)
            transporter.phase = .idle(next: transporterRng.double(in: config.transporterFirst))
        }
        refillQueue()
        if prefill {
            prefillRing(count: targetDensity)
        }
    }

    /// The next shift, continuing this one's traffic (FOUNDATION.md 2.5): every car on the
    /// road keeps driving and every wreck keeps skidding, the tempo glides to the new one,
    /// and the new shift's cars roll into the queue from behind. It starts with its first tap.
    /// Cars that were the player's are plain traffic now.
    public func nextShift(config: Config, seed: UInt64) -> World {
        var next = World(config: config, seed: seed, mode: .shift, prefill: false, startsOnFirstTap: true, firstVehicleID: nextVehicleID)
        var carried = vehicles.filter { if case .queued = $0.phase { false } else { true } }
        for index in carried.indices {
            carried[index].owner = .ai
            carried[index].previousPosition = carried[index].position
            carried[index].previousHeading = carried[index].heading
        }
        // Ordered by creation: every carried car is older than the new queue.
        next.vehicles.insert(contentsOf: carried, at: 0)
        next.tempoGlide = (from: ringSpeed, since: 0)
        next.applyShiftCurves(at: 0)
        next.queue.state = .filling(elapsed: 0)
        next.placeQueue()
        return next
    }

    /// Registers a tap. `time` is when it happened; it takes effect inside the step that
    /// contains that moment, not at the next frame, so timing is fair to the millisecond.
    /// Taps after the last car of the shift are ignored.
    public mutating func tap(at time: Double) {
        guard shift.acceptsTaps else { return }
        let t = max(time, self.time)
        let index = pendingTaps.firstIndex { $0 > t } ?? pendingTaps.count
        pendingTaps.insert(t, at: index)
    }

    /// Returns and clears the events since the last call.
    public mutating func takeEvents() -> [GameEvent] {
        let taken = events
        events.removeAll(keepingCapacity: true)
        return taken
    }

    public func vehicle(id: Int) -> Vehicle? {
        vehicles.first { $0.id == id }
    }

    public mutating func step() {
        let dt = Self.stepDuration
        let start = time
        let end = Double(stepCount + 1) * dt
        for i in vehicles.indices {
            vehicles[i].previousPosition = vehicles[i].position
            vehicles[i].previousHeading = vehicles[i].heading
        }
        handleTaps(from: start, to: end)
        updateDrivers(dt)
        moveVehicles(dt, now: end)
        resolveWreckContacts()
        updateQueue(dt)
        updateTraffic(dt)
        updateCriminals(now: end)
        updateTransporters(now: end)
        resolveContacts(now: end)
        resolveTrafficContacts(now: end)
        rateMerges(now: end)
        updateShift(now: end)
        vehicles.removeAll { $0.isRetired }
        stepCount += 1
    }

    /// The hitbox of a vehicle at a given pose.
    public func hitbox(at pose: Path.Pose, type: VehicleType = .car) -> Capsule {
        Capsule(center: pose.position, heading: pose.heading, length: length(of: type), width: config.carWidth)
    }

    public func hitbox(of vehicle: Vehicle) -> Capsule {
        hitbox(at: Path.Pose(position: vehicle.position, heading: vehicle.heading), type: vehicle.type)
    }

    /// How long a vehicle is. Only the lorry differs from a car.
    public func length(of type: VehicleType) -> Double {
        type == .truck ? config.truckLength : config.carLength
    }

    // MARK: - Movement

    mutating func moveVehicles(_ dt: Double, now: Double) {
        for i in vehicles.indices {
            switch vehicles[i].phase {
            case .queued, .waiting:
                break

            case .merging(var m):
                // The merge keeps pace with the ring: if the ring speeds up, so does the
                // merge. Then the whole picture depends only on how far the ring has turned,
                // and a tempo change never turns a well-timed merge into a crash.
                m.elapsed += dt * ringSpeed / m.profile.ringSpeed
                if m.elapsed >= m.profile.duration {
                    // Joins the ring; the overshoot of this step is driven at ring speed.
                    let overflow = (m.elapsed - m.profile.duration) * m.profile.ringSpeed
                    let ring = Vehicle.Ring(
                        s: Angle.wrap(layout.entryRingS(m.arm) + overflow, period: layout.ring.length),
                        exitArm: m.exitArm,
                        distanceToExit: layout.ringDistance(from: m.arm, toExit: m.exitArm) - overflow,
                        justMerged: m,
                        sinceMerge: 0
                    )
                    vehicles[i].phase = .ring(ring)
                    vehicles[i].place(layout.ring.pose(at: ring.s))
                } else {
                    vehicles[i].phase = .merging(m)
                    vehicles[i].place(layout.entry(m.arm).pose(at: m.distance))
                }

            case .ring(var r):
                r.sinceMerge += dt
                let d = (r.drive.speed ?? ringSpeed) * dt
                chargeModules(vehicleIndex: i, from: r.s, travelled: d, now: now)
                r.s = Angle.wrap(r.s + d, period: layout.ring.length)
                r.distanceToExit -= d
                let id = vehicles[i].id
                if r.distanceToExit <= 0 && (isChased(id) || isTransported(id) || r.drive.isPursuing) {
                    // The criminal on the run, the transporter until its time is up and a
                    // police car on a chase do not leave: another lap.
                    r.distanceToExit += layout.ring.length
                }
                if r.distanceToExit <= 0 {
                    let exit = Vehicle.Exiting(arm: r.exitArm, s: -r.distanceToExit, drive: r.drive)
                    vehicles[i].phase = .exiting(exit)
                    vehicles[i].place(layout.exit(exit.arm).pose(at: exit.s))
                } else {
                    vehicles[i].phase = .ring(r)
                    vehicles[i].place(layout.ring.pose(at: r.s))
                }

            case .exiting(var e):
                e.s += (e.drive.speed ?? ringSpeed) * dt
                vehicles[i].phase = .exiting(e)
                if e.s >= layout.exit(e.arm).length {
                    vehicles[i].isRetired = true
                    events.append(.exited(vehicle: vehicles[i].id, arm: e.arm))
                } else {
                    vehicles[i].place(layout.exit(e.arm).pose(at: e.s))
                }

            case .crashed(var c):
                c.elapsed += dt
                var body = body(of: vehicles[i])
                CrashPhysics.skid(&body, config: config, dt: dt)
                vehicles[i].position = body.position
                vehicles[i].heading = body.heading
                c.velocity = body.velocity
                c.spin = body.angularVelocity
                vehicles[i].phase = .crashed(c)
                if c.elapsed >= config.crashDuration {
                    vehicles[i].isRetired = true
                }
            }
        }
    }

    // MARK: - Collisions and rating

    /// Checks merging cars against everything on the road, wrecks included, and measures
    /// their gaps to live traffic. In normal traffic ring cars share one speed and cannot
    /// touch each other (FOUNDATION.md 4.3); disturbed traffic is `resolveTrafficContacts`.
    mutating func resolveContacts(now: Double) {
        let hitboxes = vehicles.map { $0.isCollidable || $0.isCrashed ? hitbox(of: $0) : nil }
        var hits: [(i: Int, j: Int, contact: Collision.Contact)] = []
        for i in vehicles.indices where vehicles[i].activeMerge != nil {
            guard let a = hitboxes[i] else { continue }
            for j in vehicles.indices where j != i {
                guard let b = hitboxes[j] else { continue }
                let otherIsMerging = vehicles[j].activeMerge != nil
                if otherIsMerging && j < i { continue }  // pair already checked from j's side
                let contact = Collision.contact(a, b)
                // Your own cars never rate each other: the car launched right behind the last
                // one is always close, and that must not be a free Tight Fit (FOUNDATION.md 2.2).
                let ownPair = vehicles[i].owner == .player && vehicles[j].owner == .player
                if !vehicles[j].isCrashed && !ownPair {
                    noteGap(contact.gap, at: i, to: vehicles[j].id)
                }
                if otherIsMerging && !ownPair {
                    noteGap(contact.gap, at: j, to: vehicles[i].id)
                }
                if contact.gap <= 0 {
                    hits.append((i, j, contact))
                }
            }
        }
        resolve(hits, now: now)
    }

    /// Disturbed traffic: drivers who could not stop hit the car ahead or a wreck.
    mutating func resolveTrafficContacts(now: Double) {
        guard isTrafficDisturbed else { return }
        let reach = config.carLength + 2
        var hits: [(i: Int, j: Int, contact: Collision.Contact)] = []
        for i in vehicles.indices {
            guard isLiveTraffic(vehicles[i]) else { continue }
            for j in vehicles.indices where j != i {
                let other = vehicles[j]
                // Live pairs once; merging cars were checked in `resolveContacts`.
                guard other.isCrashed || (isLiveTraffic(other) && j > i) else { continue }
                guard (vehicles[i].position - other.position).lengthSquared < reach * reach else { continue }
                let contact = Collision.contact(hitbox(of: vehicles[i]), hitbox(of: other))
                if contact.gap <= 0 {
                    hits.append((i, j, contact))
                }
            }
        }
        resolve(hits, now: now)
    }

    /// On the ring or an exit and not merging.
    func isLiveTraffic(_ vehicle: Vehicle) -> Bool {
        switch vehicle.phase {
        case let .ring(r): r.justMerged == nil
        case .exiting: true
        case .queued, .waiting, .merging, .crashed: false
        }
    }

    /// Deepest contact first, ties in index order: deterministic. A car crashes once per step;
    /// wrecks from earlier steps can be hit again.
    private mutating func resolve(_ hits: [(i: Int, j: Int, contact: Collision.Contact)], now: Double) {
        var crashedNow = Set<Int>()
        for hit in hits.sorted(by: { ($0.contact.gap, $0.i, $0.j) < ($1.contact.gap, $1.i, $1.j) }) {
            let first = vehicles[hit.i]
            let second = vehicles[hit.j]
            guard !crashedNow.contains(first.id), !crashedNow.contains(second.id), !first.isCrashed else { continue }
            crash(hit.i, hit.j, contact: hit.contact, now: now)
            crashedNow.insert(first.id)
            crashedNow.insert(second.id)
        }
    }

    /// Keeps the smallest gap (in seconds) a merging car has had so far.
    mutating func noteGap(_ gap: Double, at index: Int, to other: Int) {
        let seconds = max(gap, 0) / ringSpeed
        switch vehicles[index].phase {
        case .merging(var m):
            guard seconds < m.minGap else { return }
            m.minGap = seconds
            m.closest = other
            vehicles[index].phase = .merging(m)
        case .ring(var r):
            guard var m = r.justMerged, seconds < m.minGap else { return }
            m.minGap = seconds
            m.closest = other
            r.justMerged = m
            vehicles[index].phase = .ring(r)
        case .queued, .waiting, .exiting, .crashed:
            break
        }
    }

    /// The impact as real physics (`CrashPhysics`): the cars become wrecks that bounce off,
    /// spin and skid, dented where they were hit. A wreck hit again gets another dent.
    /// Only the crash of a merging player car counts against the player (FOUNDATION.md 2.6):
    /// a normal car's is a strike, a police car's one of its `maxPoliceCrashes`.
    mutating func crash(_ i: Int, _ j: Int, contact: Collision.Contact, now: Double) {
        let first = vehicles[i]
        let second = vehicles[j]
        let takedown = isTakedown(first, second)
        let seizure = isSeizure(first, second)
        // A live criminal shrugs off anything but the police: it keeps its course, the other
        // car bounces off it as off something much heavier.
        let armored: Int? = takedown || seizure ? nil : [i, j].first { isArmored(vehicles[$0]) }
        // The money transporter is wrecked like any car, and its money with it.
        let wreckedTruck = seizure ? nil : [first, second].first { $0.type == .transporter && !$0.isCrashed }
        let culprits = [first, second].filter(causesStrike)
        let strike = !takedown && !seizure && !culprits.isEmpty
        // Only if every car at fault is a police car; a normal car's mistake is a strike.
        let byPolice = strike && culprits.allSatisfy { $0.type == .police }
        let normal = contactNormal(contact, first: first, second: second)
        var a = body(of: first)
        var b = body(of: second)
        if armored == i {
            a.mass = .infinity
            a.inertia = .infinity
        }
        if armored == j {
            b.mass = .infinity
            b.inertia = .infinity
        }
        let impact = CrashPhysics.collide(&a, &b, at: contact.point, normal: normal, restitution: config.crashRestitution, friction: config.crashFriction)
        addDent(i, at: contact.point, impact: impact)
        addDent(j, at: contact.point, impact: impact)
        // Push apart by the overlap, so they do not start inside each other.
        let overlap = max(0, -contact.gap)
        let (pushFirst, pushSecond) = armored == i ? (0.0, overlap) : (armored == j ? (overlap, 0.0) : (overlap / 2, overlap / 2))
        vehicles[i].position += normal * pushFirst
        vehicles[j].position -= normal * pushSecond
        if armored != i { makeWreck(i, contact.point, a) }
        if armored != j { makeWreck(j, contact.point, b) }
        let involvesPlayer = first.owner == .player || second.owner == .player
        var penalty = 0
        let comboEvents = events.count
        if strike && isScoring {
            penalty = scoreCrash(byPolice: byPolice, at: now)
        }
        // The crash comes before the combo reset it causes.
        events.insert(.crash(CrashReport(
            first: first.id,
            second: second.id,
            point: contact.point,
            time: now,
            involvesPlayer: involvesPlayer,
            impact: impact,
            isStrike: strike,
            isPoliceCrash: byPolice,
            isTakedown: takedown,
            penalty: penalty,
            strikes: score.strikes,
            policeCrashes: score.policeCrashes
        )), at: comboEvents)
        if takedown {
            let (criminalID, policeID) = first.type == .pickup ? (first.id, second.id) : (second.id, first.id)
            criminalCaught(criminalID, by: policeID, at: contact.point, now: now)
        }
        if seizure {
            let (truckID, policeID) = first.type == .transporter ? (first.id, second.id) : (second.id, first.id)
            transporterSeized(truckID, by: policeID, at: contact.point, now: now)
        }
        if let truck = wreckedTruck {
            transporterWrecked(truck.id, at: contact.point, now: now)
        }
        if strike && isScoring && mode == .shift && isStruckOut {
            endShift(.struckOut, at: now)
        }
    }

    func isLiveCriminal(_ vehicle: Vehicle) -> Bool {
        vehicle.type == .pickup && !vehicle.isCrashed
    }

    /// The criminal keeps its course in a crash; only the police stop it.
    func isArmored(_ vehicle: Vehicle) -> Bool {
        vehicle.type == .pickup && !vehicle.isCrashed
    }

    /// One of the player's police cars hits the criminal: the good crash.
    func isTakedown(_ a: Vehicle, _ b: Vehicle) -> Bool {
        (isLiveCriminal(a) && b.isPlayerPolice) || (isLiveCriminal(b) && a.isPlayerPolice)
    }

    /// The player's mistake: a player car crashing while it merges, or right after it
    /// (`mergeResponsibility`), e.g. because it was sent into a pile-up.
    func causesStrike(_ vehicle: Vehicle) -> Bool {
        guard vehicle.owner == .player, !vehicle.isCrashed else { return false }
        if config.chainCrashesCostStrikes || vehicle.activeMerge != nil { return true }
        if case let .ring(r) = vehicle.phase { return r.sinceMerge < config.mergeResponsibility }
        return false
    }

    /// Turns a car into a wreck with the given motion; a wreck keeps its age and first damage.
    mutating func makeWreck(_ index: Int, _ point: Vec2, _ body: RigidBody) {
        if case var .crashed(state) = vehicles[index].phase {
            state.velocity = body.velocity
            state.spin = body.angularVelocity
            vehicles[index].phase = .crashed(state)
        } else {
            let damage = localPoint(point, of: vehicles[index])
            vehicles[index].phase = .crashed(.init(velocity: body.velocity, spin: body.angularVelocity, elapsed: 0, damage: damage))
        }
    }

    /// Crumples the sheet metal where the car was hit: the harder, the deeper. Close dents
    /// merge into one deeper dent.
    mutating func addDent(_ index: Int, at point: Vec2, impact: Double) {
        let local = localPoint(point, of: vehicles[index])
        let depth = min(max(impact * config.dentPerImpact, 0.6), config.maxDent)
        if let near = vehicles[index].dents.firstIndex(where: { $0.point.distance(to: local) < 4 }) {
            let dent = vehicles[index].dents[near]
            vehicles[index].dents[near].depth = min(config.maxDent * 1.3, dent.depth + depth * 0.5)
        } else if vehicles[index].dents.count < 8 {
            vehicles[index].dents.append(Dent(point: local, depth: depth))
        }
    }

    /// Rates and scores every player merge that ended this step without a crash.
    mutating func rateMerges(now: Double) {
        for i in vehicles.indices {
            guard case .ring(var r) = vehicles[i].phase, let merge = r.justMerged else { continue }
            r.justMerged = nil
            vehicles[i].phase = .ring(r)
            guard vehicles[i].owner == .player, isScoring else { continue }
            let behind = gapBehind(ringS: r.s, excluding: vehicles[i].id)
            let ahead = gapAhead(ringS: r.s, excluding: vehicles[i].id)
            let merged = events.count
            var shielded = false
            // A normal car standing in a secure zone shields the transporter and earns a bonus.
            // A police car there seizes it instead (`World.crash`).
            if hasActiveTransporter, vehicles[i].type != .police, isInSecureZone(r.s) {
                shielded = true
                score.money += config.shieldBonus
            }
            let (rating, points, combo) = scoreMerge(minGap: merge.minGap, gapBehind: behind, gapAhead: ahead, at: now)
            // Perfect Chain (M6): good merges build it, a plain clean one or a cut-off ends it.
            setChain(rating.extendsChain ? score.chain + 1 : 0, at: now)
            // The merge comes before the combo change it causes.
            events.insert(.merged(MergeReport(
                vehicle: vehicles[i].id,
                minGap: merge.minGap,
                closest: merge.closest,
                gapBehind: behind,
                position: vehicles[i].position,
                time: now,
                rating: rating,
                points: points,
                combo: combo,
                shielded: shielded,
                gapAhead: ahead,
                chain: score.chain
            )), at: merged)
        }
    }

    // MARK: - Helpers

    func index(of id: Int) -> Int? {
        vehicles.firstIndex { $0.id == id }
    }

    /// Cleanly turns an abandoned criminal or transporter into a normal car: used once its
    /// warning is called off after it already left its stop line, so it never lingers as a
    /// vehicle that still looks special but does nothing (`updateCriminals`, `updateTransporters`).
    mutating func demoteToOrdinaryTraffic(_ id: Int) {
        guard let index = index(of: id) else { return }
        vehicles[index].type = .car
    }

    mutating func makeID() -> Int {
        defer { nextVehicleID += 1 }
        return nextVehicleID
    }

    /// Every car leaves 1–3 arms after the one it came from, never at South: that is the queue.
    mutating func randomExit(from arm: Arm) -> Arm {
        let options = config.exitArmsAhead.map { layout.advance(arm, by: $0) }.filter { !$0.isPlayer }
        return options.isEmpty ? layout.advance(arm, by: 1) : rng.pick(options)
    }
}

/// Collects frame time and hands out fixed simulation steps; the remainder is the
/// interpolation factor between the last two steps (FOUNDATION.md 4.1, game loop).
public struct FixedStepClock: Sendable {
    public let step: Double
    public private(set) var accumulator = 0.0

    public init(step: Double = World.stepDuration) {
        self.step = step
    }

    public mutating func add(_ delta: Double) {
        accumulator += max(0, delta)
    }

    /// True if a full step is available; consumes it.
    public mutating func takeStep() -> Bool {
        guard accumulator >= step else { return false }
        accumulator -= step
        return true
    }

    /// 0…1 between the previous and the current step.
    public var alpha: Double { min(max(accumulator / step, 0), 1) }

    public mutating func reset() {
        accumulator = 0
    }
}
