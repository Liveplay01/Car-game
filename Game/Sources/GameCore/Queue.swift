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
    }

    /// Queued vehicle ids, front first.
    public internal(set) var vehicles: [Int] = []
    public internal(set) var state: State = .ready
    /// A tap that came before the next car stood at the stop line. It launches that car the
    /// moment it arrives. There is at most one, so a bouncing finger sends one car, not five.
    public internal(set) var heldTap: Double?

    public var isReady: Bool { state == .ready }
}

extension World {
    mutating func handleTaps(from start: Double, to end: Double) {
        // A held tap goes first, as soon as the next car stands at the stop line.
        if queue.isReady, queue.heldTap != nil {
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
            } else {
                events.append(.tapRejected(time: first))
            }
        }
    }

    /// The front car starts right away, without wind-up or delay (FOUNDATION.md 2.2).
    mutating func launchFromQueue(driven: Double, at time: Double) -> Bool {
        guard queue.isReady, let id = queue.vehicles.first, let i = index(of: id) else { return false }
        queue.vehicles.removeFirst()
        queue.state = .clearing(vehicle: id)
        let path = layout.entry(Arm.player)
        let merge = Vehicle.Merging(
            arm: Arm.player,
            exitArm: randomExit(from: Arm.player),
            profile: MergeProfile(pathLength: path.length, duration: config.mergeDuration, ringSpeed: ringSpeed),
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
        }
        placeQueue()
    }

    /// How far the launched car has driven along its entry; nil once it no longer merges.
    func launchedDistance(_ id: Int) -> Double? {
        guard let i = index(of: id), case let .merging(m) = vehicles[i].phase else { return nil }
        return m.distance
    }

    /// How far (in slots) the queued cars still are behind their slots. Without an advance
    /// time they follow the launched car one slot behind it; with one they wait, then roll up.
    func queueSlotOffset() -> Double {
        switch queue.state {
        case .ready:
            return 0
        case let .clearing(id):
            guard config.queueAdvanceDuration <= 0 else { return 1 }
            let driven = launchedDistance(id) ?? config.queueSpacing
            return 1 - min(max(driven / config.queueSpacing, 0), 1)
        case let .advancing(elapsed):
            let x = config.queueAdvanceDuration > 0 ? min(max(elapsed / config.queueAdvanceDuration, 0), 1) : 1
            let easeOut = 1 - (1 - x) * (1 - x) * (1 - x)
            return 1 - easeOut
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
            let type: VehicleType = queueRng.unit() < config.policeShare ? .police : .car
            let vehicle = Vehicle(id: makeID(), type: type, owner: .player, phase: .queued, pose: pose)
            vehicles.append(vehicle)
            queue.vehicles.append(vehicle.id)
        }
    }
}
