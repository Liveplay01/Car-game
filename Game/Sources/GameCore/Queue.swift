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
    /// The next car rolls up to the stop line and brakes softly to a halt. A tap held for it
    /// turns that into rolling through: from this point of the approach (0…1) on, it no
    /// longer brakes but arrives at ring speed and goes straight on (Leo, 26.09.2026).
    public internal(set) var passFrom: Double?
    /// How fast (in ring speeds) the queue was still rolling when the last car launched: 0
    /// when it stood at the line, up to 1 when a held tap let the front car roll through.
    /// The cars behind carry on from there instead of stopping dead.
    public internal(set) var rollingSpeed = 0.0

    public var isReady: Bool { state == .ready }

    /// How far (0…1) the next car has come towards the stop line, at `progress` (0…1) of the
    /// slot the launched car frees. It moves off from standing (or rolls on at `startSpeed`,
    /// in ring speeds) and either brakes to a halt at the line or, with a held tap, keeps
    /// ring speed into its merge. Only the look changes: the car is ready at the same moment
    /// either way.
    public static func approach(_ progress: Double, startSpeed: Double = 0, passFrom: Double?) -> Double {
        let x = min(max(progress, 0), 1)
        let s = min(max(startSpeed, 0), 1)
        let stop = hermite(x, start: 0, startSlope: s, end: 1, endSlope: 0)
        guard let x0 = passFrom.map({ min(max($0, 0), 1) }), x > x0, x0 < 1 else { return stop }
        let plan = passPlan(from: x0, startSpeed: s)
        return hermite((x - x0) / plan.span, start: plan.start, startSlope: plan.startSlope, end: 1, endSlope: plan.endSlope)
    }

    /// The ring speeds the rolling car reaches the line with: 1 when the tap caught it in
    /// time, a little less when it came at the very last moment.
    public static func passSpeed(from passFrom: Double, startSpeed: Double = 0) -> Double {
        let x0 = min(max(passFrom, 0), 1)
        guard x0 < 1 else { return 0 }
        let plan = passPlan(from: x0, startSpeed: min(max(startSpeed, 0), 1))
        return plan.endSlope / plan.span
    }

    /// From where the car was, as fast as it was, to the line at ring speed. Both slopes are
    /// capped at three times the rise, so the car never overshoots the line.
    private static func passPlan(from x0: Double, startSpeed s: Double) -> (span: Double, start: Double, startSlope: Double, endSlope: Double) {
        let span = 1 - x0
        let start = hermite(x0, start: 0, startSlope: s, end: 1, endSlope: 0)
        // The braking curve's slope at x0: 6x(1-x) + s(3x² - 4x + 1).
        let speed = 6 * x0 * (1 - x0) + s * (3 * x0 * x0 - 4 * x0 + 1)
        let rise = 1 - start
        return (span, start, min(speed * span, 3 * rise), min(span, 3 * rise))
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
            // The front car rolled through: the cars behind it are still moving.
            let rolling = queue.passFrom.map { PlayerQueue.passSpeed(from: $0, startSpeed: queue.rollingSpeed) } ?? 0
            queue.heldTap = nil
            _ = launchFromQueue(driven: end - start, at: start)
            queue.rollingSpeed = rolling
        }
        while let first = pendingTaps.first, first <= end {
            pendingTaps.removeFirst()
            // How long the car has been driving at the end of this step.
            let driven = end - max(first, start)
            if launchFromQueue(driven: driven, at: first) { continue }
            if queue.heldTap == nil {
                queue.heldTap = first
                // The car rolling up no longer brakes: it goes through the line.
                if case let .clearing(id) = queue.state {
                    queue.passFrom = (launchedDistance(id) ?? config.queueSpacing) / config.queueSpacing
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
        // A new approach starts; a dropped held tap (end of the shift) keeps the old one
        // until then, so the rolling car never jumps back.
        queue.passFrom = nil
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
    mutating func updateQueue(_ dt: Double) {
        switch queue.state {
        case .ready:
            break
        case let .clearing(id):
            if launchedDistance(id).map({ $0 < config.queueSpacing }) != true {
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
            guard queue.passFrom == nil else { return false }
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
            let driven = launchedDistance(id) ?? config.queueSpacing
            return 1 - PlayerQueue.approach(driven / config.queueSpacing, startSpeed: queue.rollingSpeed, passFrom: queue.passFrom)
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
