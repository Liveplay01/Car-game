/// The money transporter (ROADMAP.md, M4): a warning, then the transporter enters from an
/// AI arm and circles the ring. Normal cars standing in its secure zones shield it and
/// earn a bonus; a police car inside either zone seizes it. If its countdown runs out,
/// it leaves safely and the player gets paid.
public struct TransporterState: Sendable, Equatable {
    public enum Phase: Sendable, Equatable {
        /// Nothing going on; the next warning comes at shift time `next`.
        case idle(next: Double)
        /// "SECURED": the transporter shows up at `arm` at shift time `until`.
        case warning(arm: Arm, until: Double)
        /// The transporter waits at its stop line; it has not driven in yet.
        case arriving(vehicle: Int)
        /// On the road; it leaves the ring at shift time `deadline`.
        case active(vehicle: Int, deadline: Double)
        /// Seized by a police car: it is wrecked, no money.
        case seized(vehicle: Int)
        /// Got away, or the shift ended: it drives off at its next exit.
        case leaving(vehicle: Int)
    }

    public internal(set) var phase: Phase

    /// The transporter on the road, if any.
    public var vehicle: Int? {
        switch phase {
        case let .arriving(id), let .active(id, _), let .seized(id), let .leaving(id): id
        case .idle, .warning: nil
        }
    }
}

extension World {
    /// The arm a warned transporter will come from; AI traffic keeps it free.
    var reservedTransporterArm: Arm? {
        if case let .warning(arm, _) = transporter.phase { return arm }
        return nil
    }

    /// A transporter that must not leave yet: it keeps circling.
    func isTransported(_ id: Int) -> Bool {
        if case let .active(chased, _) = transporter.phase { return chased == id }
        return false
    }

    mutating func updateTransporters(now: Double) {
        guard mode == .shift else { return }
        guard shift.acceptsTaps else {
            if case let .active(id, _) = transporter.phase {
                transporter.phase = .leaving(vehicle: id)
            }
            return
        }
        switch transporter.phase {
        case let .idle(next):
            guard now >= next else { return }
            guard remainingTime > config.transporterWarning + config.transporterTime + 3 else {
                transporter.phase = .idle(next: .infinity)
                return
            }
            let arm = transporterRng.pick(Arm.ai)
            transporter.phase = .warning(arm: arm, until: now + config.transporterWarning)
            events.append(.transporterWarning(arm: arm, time: now))

        case let .warning(arm, until):
            let occupied = vehicles.contains { vehicle in
                if case let .waiting(w) = vehicle.phase { return w.arm == arm }
                return false
            }
            guard now >= until, !occupied else { return }
            let truck = Vehicle(
                id: makeID(),
                type: .transporter,
                owner: .ai,
                phase: .waiting(Vehicle.Waiting(arm: arm, reaction: 0)),
                pose: layout.stopPose(arm)
            )
            vehicles.append(truck)
            transporter.phase = .arriving(vehicle: truck.id)

        case let .arriving(id):
            guard let truck = vehicle(id: id) else {
                transporter.phase = .idle(next: now + transporterRng.double(in: config.transporterInterval))
                return
            }
            if case .merging = truck.phase {
                let deadline = now + config.transporterTime
                transporter.phase = .active(vehicle: id, deadline: deadline)
                events.append(.transporterEntered(vehicle: id, deadline: deadline))
            }

        case let .active(id, deadline):
            guard now >= deadline else { return }
            transporter.phase = .leaving(vehicle: id)
            events.append(.transporterEscaped(vehicle: id, time: now))
            scoreTransporter(now: now)

        case .seized:
            break

        case .leaving:
            break
        }
    }

    /// A police car stopped the transporter inside a secure zone: seized, no money.
    mutating func transporterSeized(_ truckID: Int, by policeID: Int, at point: Vec2, now: Double) {
        transporter.phase = .seized(vehicle: truckID)
        events.append(.transporterSeized(vehicle: truckID, police: policeID, point: point, time: now))
        scoreTransporter(now: now)
    }

    /// Money for a transporter that left safely, or nothing for a seized one.
    mutating func scoreTransporter(now: Double) {
        guard isScoring else { return }
        let escaped: Bool
        if case .leaving = transporter.phase { escaped = true } else { escaped = false }
        let money = escaped ? config.transporterPay : config.transporterSeized
        let factor = now >= rushHourStartTime ? config.rushHourScoreFactor : 1
        let amount = Int((Double(money) * factor).rounded())
        score.money += amount
        if escaped { score.transporters += 1 }
        events.append(.transporterPaid(vehicle: transporter.vehicle, amount: amount, time: now))
        transporter.phase = .idle(next: now + transporterRng.double(in: config.transporterInterval))
    }

    /// Ring arcs occupied by the secure zones of every live transporter.
    public func secureZones() -> [(s: Double, arc: Double)] {
        guard case let .active(id, _) = transporter.phase,
              let truck = vehicle(id: id),
              case let .ring(r) = truck.phase else { return [] }
        let half = config.transporterSecureArc / 2
        return [(s: Angle.wrap(r.s - half, period: layout.ring.length), arc: config.transporterSecureArc)]
    }

    /// Whether a car at ring distance `s` sits inside a secure zone.
    func isInSecureZone(_ s: Double) -> Bool {
        for zone in secureZones() {
            let ahead = layout.ringDistance(from: s, to: zone.s)
            if ahead <= zone.arc { return true }
        }
        return false
    }
}

extension World {
    /// A police car that hits the transporter: the seizure. Only a police car counts; a
    /// normal car bouncing off the transporter is a normal crash.
    func isSeizure(_ a: Vehicle, _ b: Vehicle) -> Bool {
        func isPolice(_ v: Vehicle) -> Bool { v.type == .police && v.owner == .player && !v.isCrashed }
        func isTruck(_ v: Vehicle) -> Bool { v.type == .transporter && !v.isCrashed }
        return (isTruck(a) && isPolice(b)) || (isTruck(b) && isPolice(a))
    }

    /// Whether a live transporter is on the road.
    var hasActiveTransporter: Bool {
        if case .active = transporter.phase { return true }
        return false
    }
}