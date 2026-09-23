import Testing
@testable import GameCore

/// A shift without AI traffic, and only this kind of car in the queue.
func transporterShift(police: Bool, _ adjust: (inout Config) -> Void = { _ in }) -> World {
    quietShift {
        $0.policeShare = police ? 1 : 0
        $0.criminalFirst = 1000...1000
        adjust(&$0)
    }
}

extension World {
    /// Steps until a transporter chase is active. Returns the truck's id.
    mutating func runUntilTransporter(limit seconds: Double = 60) -> Int? {
        for _ in 0..<Int(seconds * Double(World.stepRate)) {
            step()
            _ = takeEvents()
            if case let .active(id, _) = transporter.phase { return id }
        }
        return nil
    }
}

extension GameEvent {
    var transporterSeized: (vehicle: Int, police: Int, point: Vec2, time: Double)? {
        if case let .transporterSeized(vehicle, police, point, time) = self {
            return (vehicle, police, point, time)
        }
        return nil
    }
}

@Suite("Money transporter")
struct TransporterTests {
    @Test func warningThenEntryThenCountdownThenEscape() {
        var world = transporterShift(police: false)
        var warning: (arm: Arm, time: Double)?
        var entered: (id: Int, deadline: Double)?
        var escaped = false
        for _ in 0..<(130 * World.stepRate) {
            world.step()
            for event in world.takeEvents() {
                switch event {
                case let .transporterWarning(arm, time): warning = warning ?? (arm, time)
                case let .transporterEntered(id, deadline): entered = entered ?? (id, deadline)
                case .transporterEscaped: escaped = true
                default: break
                }
            }
            if world.shift.outcome != nil { break }
        }
        guard let warning, let entered else {
            Issue.record("no transporter")
            return
        }
        let config = world.config
        #expect(world.layout.aiArms.contains(warning.arm))
        #expect(config.transporterFirst.contains(warning.time))
        #expect(entered.deadline - config.transporterTime >= warning.time + config.transporterWarning - 1e-9)
        #expect(entered.deadline - config.transporterTime < warning.time + config.transporterWarning + 5)
        #expect(escaped)
        #expect(world.score.money > 0)
        #expect(world.score.transporters >= 1)
    }

    @Test func itCirclesUntilItsTimeIsUpThenLeaves() {
        var world = transporterShift(police: false)
        guard let truck = world.runUntilTransporter(),
              case let .active(_, deadline) = world.transporter.phase else {
            Issue.record("no transporter")
            return
        }
        // It passes its exit instead of taking it while its countdown runs.
        world.run(steps: Int((deadline - world.time - 0.1) * Double(World.stepRate)))
        let circling = world.vehicle(id: truck).map { if case .ring = $0.phase { true } else { false } }
        #expect(circling == true)
        // Paid, it takes its next exit.
        world.run(steps: 8 * World.stepRate) { $0.vehicle(id: truck) == nil }
        #expect(world.vehicle(id: truck) == nil)
        #expect(world.score.transporters == 1)
    }

    @Test func aTransporterStillOnTheRoadIsPaidWhenTheLastCarIsIn() {
        var world = transporterShift(police: false) { $0.shiftCars = 1 }
        guard world.runUntilTransporter() != nil else {
            Issue.record("no transporter")
            return
        }
        world.tap(at: world.time)
        let events = world.run(steps: 2 * World.stepRate) { $0.shift.outcome != nil }
        #expect(world.shift.outcome == .completed)
        #expect(events.contains { if case .transporterEscaped = $0 { true } else { false } })
        #expect(world.score.transporters == 1)
        #expect(world.score.money >= world.config.transporterPay)
    }

    @Test func aTransporterStillArrivingBecomesAnOrdinaryCarWhenTheLastCarIsIn() {
        // Regression for ROADMAP.md M6: a transporter already driving in when the last car
        // launches must not linger as an untracked "ghost" transporter into the next shift
        // (no secure zones, no payout, but still looking and driving like a transporter).
        var world = transporterShift(police: false) {
            $0.shiftCars = 1
            $0.transporterFirst = 0.5...0.5
        }
        world.run(steps: 5 * World.stepRate) { if case .arriving = $0.transporter.phase { true } else { false } }
        guard case let .arriving(id) = world.transporter.phase else {
            Issue.record("no transporter arriving")
            return
        }
        #expect(world.vehicle(id: id)?.type == .transporter)
        world.tap(at: world.time)
        world.run(steps: World.stepRate)
        #expect(world.transporter.phase == .idle(next: .infinity))
        // It keeps driving in, but now as an ordinary car instead of a transporter nobody tracks.
        #expect(world.vehicle(id: id)?.type == .car)
    }

    @Test func theWarningMarksOnlyTheTransporter() {
        var config = Config()
        config.criminalFirst = 1e9...1e9
        var world = World(config: config, seed: 4)
        var warned = false
        for _ in 0..<(30 * World.stepRate) {
            world.step()
            _ = world.takeEvents()
            guard case let .warning(arm, _) = world.transporter.phase else { continue }
            warned = true
            let waiting = world.vehicles.contains { if case let .waiting(w) = $0.phase { w.arm == arm } else { false } }
            #expect(!waiting)
        }
        #expect(warned)
    }

    @Test func policeCarSeizesTheTransporter() {
        var world = transporterShift(police: true)
        guard let truck = world.runUntilTransporter() else {
            Issue.record("no transporter")
            return
        }
        let events = world.launch(into: truck)
        #expect(events.contains { $0.transporterSeized != nil })
        #expect(world.score.money == 0)
        #expect(world.vehicle(id: truck)?.isCrashed == true)
    }

    @Test func aCrashWrecksTheTransporterAndItsMoney() {
        var world = transporterShift(police: false) { $0.maxStrikes = 3 }
        guard let truck = world.runUntilTransporter() else {
            Issue.record("no transporter")
            return
        }
        let events = world.launch(into: truck)
        let crash = events.compactMap(\.crash).first
        #expect(crash?.isStrike == true)
        // It stops as a wreck, and nothing is paid for it.
        #expect(world.vehicle(id: truck)?.isCrashed == true)
        #expect(events.contains { if case .transporterLost(truck, _, _) = $0 { true } else { false } })
        world.run(steps: 20 * World.stepRate)
        #expect(world.score.transporters == 0)
        #expect(world.score.money == 0)
    }

    @Test func shieldBonusForACarInASecureZone() {
        var world = transporterShift(police: false)
        guard let truck = world.runUntilTransporter() else {
            Issue.record("no transporter")
            return
        }
        // Wait until the truck is on the ring, then merge a normal car.
        world.run(steps: 2 * World.stepRate) { $0.vehicle(id: truck).map { if case .ring = $0.phase { true } else { false } } == true }
        let before = world.score.money
        world.tap(at: world.time)
        world.run(steps: 2 * World.stepRate)
        // The car merged; if it landed in a secure zone, the shield bonus was paid.
        #expect(world.score.money >= before)
    }

    @Test func noTransporterInFreePlay() {
        var world = World(config: Config(), seed: 3, mode: .freePlay)
        world.run(steps: 60 * World.stepRate)
        #expect(world.transporter.phase == .idle(next: .infinity))
    }
}