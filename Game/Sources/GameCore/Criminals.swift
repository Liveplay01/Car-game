/// The criminal pickup (ROADMAP.md, M3): a warning, then the pickup enters from an AI arm
/// and circles the ring. Only a police car can stop it; if its countdown runs out, it gets
/// away and the shift is lost.
public struct CriminalState: Sendable, Equatable {
    public enum Phase: Sendable, Equatable {
        /// Nothing going on; the next warning comes at shift time `next`.
        case idle(next: Double)
        /// "WANTED": the pickup shows up at `arm` at shift time `until`.
        case warning(arm: Arm, until: Double)
        /// The pickup waits at its stop line; the countdown has not started yet.
        case arriving(vehicle: Int)
        /// On the road; it escapes at shift time `deadline`.
        case active(vehicle: Int, deadline: Double)
        /// Got away, or the shift ended: it drives off at its next exit.
        case leaving(vehicle: Int)
    }

    public internal(set) var phase: Phase

    /// The pickup on the road, if any.
    public var vehicle: Int? {
        switch phase {
        case let .arriving(id), let .active(id, _), let .leaving(id): id
        case .idle, .warning: nil
        }
    }

    /// Seconds left on the countdown while the chase is on.
    public func timeLeft(at time: Double) -> Double? {
        if case let .active(_, deadline) = phase { return max(0, deadline - time) }
        return nil
    }
}

extension World {
    /// The arm a warned criminal will come from; AI traffic keeps it free.
    var reservedArm: Arm? {
        if case let .warning(arm, _) = criminal.phase { return arm }
        return nil
    }

    /// A criminal that must not leave yet: it keeps circling.
    func isChased(_ id: Int) -> Bool {
        if case let .active(chased, _) = criminal.phase { return chased == id }
        return false
    }

    mutating func updateCriminals(now: Double) {
        guard mode == .shift else { return }
        // Once time is up or the shift is over, a criminal on the road just drives off.
        guard shift.acceptsTaps else {
            if case let .active(id, _) = criminal.phase {
                criminal.phase = .leaving(vehicle: id)
            }
            return
        }
        switch criminal.phase {
        case let .idle(next):
            guard now >= next else { return }
            // Never so late that the chase could outlast the shift.
            guard remainingTime > config.criminalWarning + config.criminalTime + 3 else {
                criminal.phase = .idle(next: .infinity)
                return
            }
            let arm = criminalRng.pick(Arm.ai)
            criminal.phase = .warning(arm: arm, until: now + config.criminalWarning)
            events.append(.criminalWarning(arm: arm, time: now))

        case let .warning(arm, until):
            let occupied = vehicles.contains { vehicle in
                if case let .waiting(w) = vehicle.phase { return w.arm == arm }
                return false
            }
            guard now >= until, !occupied else { return }
            let pickup = Vehicle(
                id: makeID(),
                type: .pickup,
                owner: .ai,
                phase: .waiting(Vehicle.Waiting(arm: arm, reaction: 0)),
                pose: layout.stopPose(arm)
            )
            vehicles.append(pickup)
            criminal.phase = .arriving(vehicle: pickup.id)

        case let .arriving(id):
            // The countdown starts once it drives in: it waits for a safe gap like all AI.
            guard let pickup = vehicle(id: id) else {
                criminal.phase = .idle(next: now + criminalRng.double(in: config.criminalInterval))
                return
            }
            if case .merging = pickup.phase {
                let deadline = now + config.criminalTime
                criminal.phase = .active(vehicle: id, deadline: deadline)
                events.append(.criminalEntered(vehicle: id, deadline: deadline))
            }

        case let .active(id, deadline):
            guard now >= deadline else { return }
            criminal.phase = .leaving(vehicle: id)
            events.append(.criminalEscaped(vehicle: id, time: now))
            endShift(.escaped, at: now)

        case .leaving:
            break
        }
    }

    /// A police car stopped the criminal: points, and the next one comes later.
    mutating func criminalCaught(_ criminalID: Int, by policeID: Int, at point: Vec2, now: Double) {
        let timeLeft = criminal.timeLeft(at: now) ?? 0
        let points = isScoring ? scoreTakedown(at: now) : 0
        criminal.phase = .idle(next: now + criminalRng.double(in: config.criminalInterval))
        events.append(.takedown(TakedownReport(
            criminal: criminalID,
            police: policeID,
            point: point,
            time: now,
            points: points,
            timeLeft: timeLeft
        )))
    }

    /// Emergency dispatch: the next car in the queue turns into a police car, for part of
    /// the combo (`dispatchComboFactor`). Nothing happens, and nothing is paid, if it
    /// already is one.
    @discardableResult
    public mutating func dispatchPolice() -> Bool {
        guard shift.acceptsTaps, let id = queue.vehicles.first, let index = index(of: id),
              vehicles[index].type != .police else { return false }
        vehicles[index].type = .police
        setCombo(Int(Double(score.combo) * config.dispatchComboFactor))
        events.append(.dispatched(vehicle: id, combo: score.combo))
        return true
    }
}
