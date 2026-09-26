/// The player's queue at the South arm. One tap sends the front car (FOUNDATION.md 2.2).
public struct PlayerQueue: Sendable, Equatable {
    public enum State: Sendable, Equatable {
        /// The front car stands at the stop line; a tap launches it.
        case ready
        /// The launched car has not yet left a full slot free in front of the stop line.
        /// The next car follows right behind it.
        case clearing(vehicle: Int)
        /// Only with a `queueAdvanceDuration`: the next car rolls up.
        case advancing(elapsed: Double)
        /// A new shift's cars drive up from behind into their slots (`queueFillSeconds`).
        case filling(elapsed: Double)
    }

    /// Queued vehicle ids, front first.
    public internal(set) var vehicles: [Int] = []
    public internal(set) var state: State = .ready
    /// A tap that came before the next car stood at the stop line. It launches that car the
    /// moment it arrives. There is at most one, so a bouncing finger sends one car, not five.
    public internal(set) var heldTap: Double?
    /// The car rolling up with a tap held for it (Leo, 26.09.2026): it no longer brakes but
    /// keeps rolling, settling at ring speed, and goes the moment it reaches the line.
    public internal(set) var pass: Pass?
    /// How fast (in ring speeds) the queue was still rolling when the last car launched: 0
    /// when it stood at the line, about 1 when a held tap let the front car roll through.
    /// The cars behind carry on from there instead of stopping dead.
    public internal(set) var rollingSpeed = 0.0

    public var isReady: Bool { state == .ready }

    /// A car rolling through the line: how far it has come (0…1 of the last slot) and how
    /// fast it goes, in ring speeds.
    public struct Pass: Sendable, Equatable {
        public var position: Double
        public var speed: Double
        /// How far past the line it would have come in the last step, in slots: carried
        /// into its merge, so it goes through without a pause.
        public var beyond = 0.0

        /// How quickly the speed settles, per slot driven.
        static let settle = 8.0
        /// A car that is behind the one in front (one slot back, as a standing queue keeps)
        /// may catch up a little, up to this fast; one that is ahead just settles at ring
        /// speed. So after the tap it only ever speeds up or eases off, never both.
        static let catchUp = 4.0
        static let fastest = 1.5

        /// One step on, `slots` being how far the ring moves in it, `lockstep` where the car
        /// would be a full slot behind the one in front. Never past the line.
        mutating func roll(_ slots: Double, lockstep: Double) {
            let target = min(1 + max(0, lockstep - position) * Self.catchUp, Self.fastest)
            speed += (target - speed) * min(1, Self.settle * slots)
            let next = position + speed * slots
            beyond = max(0, next - 1)
            position = min(1, next)
        }
    }

    /// How far (0…1) the next car has come towards the stop line, at `progress` (0…1) of the
    /// slot the launched car frees, when no tap is held for it: it moves off from standing
    /// (or rolls on at `startSpeed`, in ring speeds) and brakes softly to a halt at the line,
    /// exactly when the slot is free. Only the look changes, not the moment it is ready.
    public static func approach(_ progress: Double, startSpeed: Double = 0) -> Double {
        let x = min(max(progress, 0), 1)
        return hermite(x, start: 0, startSlope: min(max(startSpeed, 0), 1), end: 1, endSlope: 0)
    }

    /// The speed (in ring speeds) of that approach at `progress`.
    public static func approachSpeed(_ progress: Double, startSpeed: Double = 0) -> Double {
        let x = min(max(progress, 0), 1)
        let s = min(max(startSpeed, 0), 1)
        return 6 * x * (1 - x) + s * (3 * x * x - 4 * x + 1)
    }

    /// A cubic Hermite on 0…1: from `start` to `end`, leaving and arriving with these slopes.
    private static func hermite(_ u: Double, start: Double, startSlope: Double, end: Double, endSlope: Double) -> Double {
        let u2 = u * u, u3 = u2 * u
        return (2 * u3 - 3 * u2 + 1) * start + (u3 - 2 * u2 + u) * startSlope + (-2 * u3 + 3 * u2) * end + (u3 - u2) * endSlope
    }
}

extension World {
    mutating func handleTaps(from start: Double, to end: Double) {
        // A held tap goes first, as soon as the next car stands at the stop line.
        if queue.isReady, queue.heldTap != nil {
            // (A car rolling through goes on its own, in `updateQueue`.)
            queue.heldTap = nil
            _ = launchFromQueue(driven: end - start, at: start)
        }
        while let first = pendingTaps.first, first <= end {
            pendingTaps.removeFirst()
            // How long the car has been driving at the end of this step.
            let driven = end - max(first, start)
            if launchFromQueue(driven: driven, at: first) { continue }
            if queue.heldTap == nil {
                queue.heldTap = first
                // The car rolling up no longer brakes: it rolls on from where it is, as fast
                // as it is, and goes through the line.
                if case let .clearing(id) = queue.state, config.queueAdvanceDuration <= 0 {
                    let x = (launchedDistance(id) ?? config.queueSpacing) / config.queueSpacing
                    queue.pass = PlayerQueue.Pass(
                        position: PlayerQueue.approach(x, startSpeed: queue.rollingSpeed),
                        speed: PlayerQueue.approachSpeed(x, startSpeed: queue.rollingSpeed)
                    )
                }
            } else {
                events.append(.tapRejected(time: first))
            }
        }
    }

    /// How long a merge of this vehicle takes: the sports car and the van are quicker, the
    /// compact slower (M10, LOOT.md).
    public func mergeDuration(of type: VehicleType) -> Double {
        switch type {
        case .sportsCar: config.mergeDuration * config.sportsCarMergeFactor
        case .compact: config.mergeDuration * config.compactMergeFactor
        case .van: config.mergeDuration * config.vanMergeFactor
        case .car, .police, .pickup, .transporter, .truck: config.mergeDuration
        }
    }

    /// The front car starts right away, without wind-up or delay (FOUNDATION.md 2.2).
    mutating func launchFromQueue(driven: Double, at time: Double) -> Bool {
        guard queue.isReady, let id = queue.vehicles.first, let i = index(of: id) else { return false }
        queue.vehicles.removeFirst()
        queue.state = .clearing(vehicle: id)
        // A new approach starts; a dropped held tap (end of the shift) keeps the car rolling
        // until then, so it never jumps back.
        queue.pass = nil
        queue.rollingSpeed = 0
        let path = layout.entry(layout.player)
        let merge = Vehicle.Merging(
            arm: layout.player,
            exitArm: randomExit(from: layout.player),
            profile: MergeProfile(pathLength: path.length, duration: mergeDuration(of: vehicles[i].type), ringSpeed: ringSpeed),
            // `moveVehicles` adds this step's dt afterwards.
            elapsed: driven - Self.stepDuration
        )
        vehicles[i].phase = .merging(merge)
        events.append(.launched(vehicle: id, time: time))
        noteLaunch(at: time)
        refillQueue()
        return true
    }

    /// The next car is ready once the launched one is a full slot ahead, plus
    /// `queueAdvanceDuration` if one is set. So your own cars never touch, however fast you
    /// tap; and they never rate each other (`resolveContacts`), so there are no Tight Fits
    /// to farm off your own convoy.
    ///
    /// A car rolling through on a held tap (`PlayerQueue.Pass`) goes when it reaches the line,
    /// as long as the one in front has driven far enough that the two keep `passClearance`
    /// between their bumpers — a few milliseconds earlier or later than a standing car would.
    mutating func updateQueue(_ dt: Double) {
        switch queue.state {
        case .ready:
            break
        case let .clearing(id):
            let driven = launchedDistance(id)
            if var pass = queue.pass {
                pass.roll(dt * ringSpeed / config.queueSpacing, lockstep: (driven ?? 2 * config.queueSpacing) / config.queueSpacing)
                let leader = vehicle(id: id).map { length(of: $0.type) } ?? config.carLength
                let follower = queue.vehicles.first.flatMap { vehicle(id: $0) }.map { length(of: $0.type) } ?? config.carLength
                let room = (leader + follower) / 2 + Self.passClearance
                queue.pass = pass
                if pass.position >= 1 {
                    if queue.heldTap == nil {
                        // The tap was dropped (the shift is over): it stops at the line.
                        queue.state = .ready
                        queue.pass = nil
                    } else if driven.map({ $0 >= room }) != false {
                        rollThrough(pass)
                    } else {
                        // Too close to the car in front (two long vans): it waits at the line.
                        queue.pass?.speed = 0
                        queue.pass?.beyond = 0
                    }
                }
            } else if driven.map({ $0 < config.queueSpacing }) != true {
                queue.state = config.queueAdvanceDuration > 0 ? .advancing(elapsed: 0) : .ready
            }
        case let .advancing(elapsed):
            let next = elapsed + dt
            queue.state = next >= config.queueAdvanceDuration ? .ready : .advancing(elapsed: next)
        case let .filling(elapsed):
            let next = elapsed + dt
            queue.state = next >= config.queueFillSeconds ? .ready : .filling(elapsed: next)
        }
        placeQueue()
    }

    /// The car rolling through on a held tap reached the line in this step: it goes into its
    /// merge right away, placed as far along as it got past the line, so it never pauses for
    /// a step. The cars behind keep rolling at its speed.
    private mutating func rollThrough(_ pass: PlayerQueue.Pass) {
        let past = pass.beyond * config.queueSpacing / max(pass.speed * ringSpeed, 1)
        queue.state = .ready
        queue.heldTap = nil
        // `moveVehicles` has run for this step: the merge starts `past` seconds in.
        guard let id = queue.vehicles.first, launchFromQueue(driven: past + Self.stepDuration, at: time + Self.stepDuration - past),
              let i = index(of: id), case let .merging(merge) = vehicles[i].phase else { return }
        vehicles[i].place(layout.entry(layout.player).pose(at: merge.distance))
        queue.rollingSpeed = min(pass.speed, 1)
    }

    /// Room between the bumpers of your own two cars when one rolls through on a held tap.
    /// A standing queue keeps `queueSpacing` minus a car length (8 for two cars).
    static let passClearance = 4.0

    /// Whether a vehicle's brake lights are on (only drawn, Leo 26.09.2026): the player's
    /// queue at its line, a bot braking up to its line or standing there, a driver on the
    /// ring slowing down for a hazard or standing in a jam.
    public func isBraking(_ vehicle: Vehicle) -> Bool {
        switch vehicle.phase {
        case .queued:
            return vehicle.owner == .player ? queueBrakes : true
        case let .waiting(w):
            guard w.approach > 0 else { return true }
            return (2 * config.aiApproachBrake * config.gravity * w.approach).squareRoot() < ringSpeed
        case let .ring(r):
            return r.drive.isBraking
        case let .exiting(e):
            return e.drive.isBraking
        case .merging, .crashed:
            return false
        }
    }

    /// Whether the player's queue has its brake lights on: standing at the line, or braking
    /// up to it. Rolling through on a held tap, or pulling away, it has not.
    public var queueBrakes: Bool {
        switch queue.state {
        case .ready:
            // A held tap sends it in the next step: it does not brake for that.
            return queue.heldTap == nil
        case .advancing:
            return true
        case let .clearing(id):
            guard config.queueAdvanceDuration <= 0 else { return true }
            guard queue.pass == nil else { return false }
            let x = (launchedDistance(id) ?? config.queueSpacing) / config.queueSpacing
            // Past the fastest point of the approach it slows down.
            return x > (queue.rollingSpeed > 0 ? 1.0 / 3 : 0.5)
        case let .filling(elapsed):
            return config.queueFillSeconds <= 0 || elapsed / config.queueFillSeconds > 0.5
        }
    }

    /// How far the launched car has driven along its entry; nil once it no longer merges.
    func launchedDistance(_ id: Int) -> Double? {
        guard let i = index(of: id), case let .merging(m) = vehicles[i].phase else { return nil }
        return m.distance
    }

    /// How far (in slots) the queued cars still are behind their slots. Without an advance
    /// time they roll up as the launched car frees the slot, pulling away and braking softly
    /// (`PlayerQueue.approach`); with one they wait, then roll up.
    func queueSlotOffset() -> Double {
        switch queue.state {
        case .ready:
            return 0
        case let .clearing(id):
            guard config.queueAdvanceDuration <= 0 else { return 1 }
            if let pass = queue.pass { return 1 - pass.position }
            let driven = launchedDistance(id) ?? config.queueSpacing
            return 1 - PlayerQueue.approach(driven / config.queueSpacing, startSpeed: queue.rollingSpeed)
        case let .advancing(elapsed):
            let x = config.queueAdvanceDuration > 0 ? min(max(elapsed / config.queueAdvanceDuration, 0), 1) : 1
            let easeOut = 1 - (1 - x) * (1 - x) * (1 - x)
            return 1 - easeOut
        case let .filling(elapsed):
            // Pull away and brake: slow at both ends, never faster than about the ring.
            let x = config.queueFillSeconds > 0 ? min(max(elapsed / config.queueFillSeconds, 0), 1) : 1
            return config.queueFillSlots * (1 - x * x * (3 - 2 * x))
        }
    }

    mutating func placeQueue() {
        let offset = queueSlotOffset()
        for (slot, id) in queue.vehicles.enumerated() {
            if let i = index(of: id) {
                vehicles[i].place(layout.queuePose(slot: Double(slot) + offset))
            }
        }
    }

    /// Keeps the queue longer than any screen shows, so new cars never pop in visibly. In a
    /// shift it holds only the cars still to send: towards the end you see it run out.
    mutating func refillQueue() {
        let length = min(config.queueVisible + 4, shift.carsLeft ?? .max)
        let offset = queueSlotOffset()
        while queue.vehicles.count < length {
            let pose = layout.queuePose(slot: Double(queue.vehicles.count) + offset)
            var type: VehicleType = queueRng.unit() < config.policeShare ? .police : .car
            // Only drawn once unlocked, so every seed without them keeps its queue (M10). One
            // draw for all types: with only the sports car, the queue is the same as before.
            let shares: [(VehicleType, Double)] = [(.sportsCar, config.sportsCarShare), (.compact, config.compactShare), (.van, config.vanShare)]
            if type == .car, shares.contains(where: { $0.1 > 0 }) {
                var pick = queueRng.unit()
                for (candidate, share) in shares where share > 0 {
                    if pick < share {
                        type = candidate
                        break
                    }
                    pick -= share
                }
            }
            let vehicle = Vehicle(id: makeID(), type: type, owner: .player, phase: .queued, pose: pose)
            vehicles.append(vehicle)
            queue.vehicles.append(vehicle.id)
        }
    }
}
