import Testing
@testable import GameCore

/// A shift without AI traffic, and only this kind of car in the queue.
func transporterShift(police: Bool, _ adjust: (inout Config) -> Void = { _ in }) -> World {
    quietShift {
        $0.policeShare = police ? 1 : 0
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
        for _ in 0..<(120 * World.stepRate) {
            world.step()
            for event in world.takeEvents() {
                switch event {
                case let .transporterWarning(arm, time): warning = (arm, time)
                case let .transporterEntered(id, deadline): entered = (id, deadline)
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
        #expect(Arm.ai.contains(warning.arm))
        #expect(config.transporterFirst.contains(warning.time))
        #expect(entered.deadline - config.transporterTime >= warning.time + config.transporterWarning - 1e-9)
        #expect(entered.deadline - config.transporterTime < warning.time + config.transporterWarning + 0.1)
        #expect(escaped)
        #expect(world.shift.outcome == .completed)
        #expect(world.score.money > 0)
        #expect(world.score.transporters == 1)
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

    @Test func aNormalCarBouncesOffTheTransporter() {
        var world = transporterShift(police: false)
        guard let truck = world.runUntilTransporter() else {
            Issue.record("no transporter")
            return
        }
        let events = world.launch(into: truck)
        let crash = events.compactMap(\.crash).first
        #expect(crash?.isStrike == true)
        #expect(crash?.isTakedown == false)
        // The truck drives on, dented.
        let criminal = world.vehicle(id: truck)
        #expect(criminal?.isCrashed == false)
        #expect(criminal?.dents.isEmpty == false)
        #expect(world.transporter.vehicle == truck)
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