/// The player's queue at the South arm. One tap sends the front car (FOUNDATION.md 2.2).
public struct PlayerQueue: Sendable, Equatable {
    public enum State: Sendable, Equatable {
        /// The front car stands at the stop line; a tap launches it.
        case ready
        /// The launched car has not yet left a full slot free in front of the stop line.
        case clearing(vehicle: Int)
        /// The next car rolls up. Taps now are ignored, so a bouncing finger never sends two cars.
        case advancing(elapsed: Double)
    }

    /// Queued vehicle ids, front first.
    public internal(set) var vehicles: [Int] = []
    public internal(set) var state: State = .ready

    public var isReady: Bool { state == .ready }

    /// How far (in slots) the queued cars still are behind their target slot.
    public func slotOffset(advanceDuration: Double) -> Double {
        switch state {
        case .ready:
            return 0
        case .clearing:
            return 1
        case let .advancing(elapsed):
            let x = min(max(elapsed / advanceDuration, 0), 1)
            let easeOut = 1 - (1 - x) * (1 - x) * (1 - x)
            return 1 - easeOut
        }
    }
}

extension World {
    mutating func handleTaps(from start: Double, to end: Double) {
        while let first = pendingTaps.first, first <= end {
            pendingTaps.removeFirst()
            // How long the car has been driving at the end of this step.
            let driven = end - max(first, start)
            if !launchFromQueue(driven: driven, at: first) {
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
        refillQueue()
        return true
    }

    /// The next car rolls up once the launched one is a full slot ahead, then takes
    /// `queueAdvanceDuration`. So two taps in quick succession can never make your own
    /// cars touch or farm Tight Fits off each other.
    mutating func updateQueue(_ dt: Double) {
        switch queue.state {
        case .ready:
            break
        case let .clearing(id):
            if !isStillInFrontOfStopLine(id) {
                queue.state = .advancing(elapsed: 0)
            }
        case let .advancing(elapsed):
            let next = elapsed + dt
            queue.state = next >= config.queueAdvanceDuration ? .ready : .advancing(elapsed: next)
        }
        placeQueue()
    }

    func isStillInFrontOfStopLine(_ id: Int) -> Bool {
        guard let i = index(of: id), case let .merging(m) = vehicles[i].phase else { return false }
        return m.distance < config.queueSpacing
    }

    mutating func placeQueue() {
        let offset = queue.slotOffset(advanceDuration: config.queueAdvanceDuration)
        for (slot, id) in queue.vehicles.enumerated() {
            if let i = index(of: id) {
                vehicles[i].place(layout.queuePose(slot: Double(slot) + offset))
            }
        }
    }

    /// Keeps the queue longer than any screen shows, so new cars never pop in visibly.
    mutating func refillQueue() {
        let length = config.queueVisible + 4
        let offset = queue.slotOffset(advanceDuration: config.queueAdvanceDuration)
        while queue.vehicles.count < length {
            let pose = layout.queuePose(slot: Double(queue.vehicles.count) + offset)
            let type: VehicleType = queueRng.unit() < config.policeShare ? .police : .car
            let vehicle = Vehicle(id: makeID(), type: type, owner: .player, phase: .queued, pose: pose)
            vehicles.append(vehicle)
            queue.vehicles.append(vehicle.id)
        }
    }
}
