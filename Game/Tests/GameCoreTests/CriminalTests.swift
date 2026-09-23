import Testing
@testable import GameCore

extension World {
    /// Steps until the criminal's countdown runs. Returns the pickup's id.
    mutating func runUntilChase(limit seconds: Double = 40) -> Int? {
        for _ in 0..<Int(seconds * Double(World.stepRate)) {
            step()
            _ = takeEvents()
            if case let .active(id, _) = criminal.phase { return id }
        }
        return nil
    }

    /// Waits until a car launched now would hit `target`, then launches it.
    /// Returns the events until something crashed or `seconds` passed.
    mutating func launch(into target: Int, within seconds: Double = 12) -> [GameEvent] {
        var events: [GameEvent] = []
        for _ in 0..<Int(seconds * Double(World.stepRate)) {
            if queue.isReady, (predictedMergeGaps(from: layout.player)[target] ?? .infinity) <= -0.05 {
                tap(at: time)
                events += run(steps: World.stepRate) { $0.vehicles.contains(where: \.isCrashed) || $0.vehicle(id: target)?.dents.isEmpty == false }
                return events
            }
            step()
            events += takeEvents()
        }
        return events
    }
}

/// A shift without AI traffic, and only this kind of car in the queue.
func chaseShift(police: Bool, _ adjust: (inout Config) -> Void = { _ in }) -> World {
    quietShift {
        $0.policeShare = police ? 1 : 0
        adjust(&$0)
    }
}

extension GameEvent {
    var takedown: TakedownReport? { if case let .takedown(r) = self { r } else { nil } }
}

extension World {
    /// Puts one of the player's police cars on the ring, `gap` (surface to surface) behind
    /// the vehicle `target`. Returns its id.
    mutating func placePolice(behind target: Int, gap: Double) -> Int? {
        guard let other = vehicle(id: target), case let .ring(r) = other.phase else { return nil }
        let id = spawnRingCar(at: r.s - config.carLength - gap, exitArm: east)
        guard let index = index(of: id) else { return nil }
        vehicles[index].type = .police
        vehicles[index].owner = .player
        return id
    }
}

@Suite("Police and criminals")
struct CriminalTests {
    @Test func aboutOneCarInFiveIsAPoliceCar() {
        var police = 0
        var total = 0
        for seed in UInt64(1)...150 {
            let world = World(config: Config(), seed: seed, prefill: false)
            for id in world.queue.vehicles {
                total += 1
                if world.vehicle(id: id)?.type == .police { police += 1 }
            }
        }
        let share = Double(police) / Double(total)
        #expect(share > 0.15 && share < 0.25)
    }

    @Test func freePlayHasNoCriminals() {
        var world = World(config: Config(), seed: 3, mode: .freePlay)
        world.run(steps: 60 * World.stepRate)
        #expect(world.criminal.phase == .idle(next: .infinity))
    }

    @Test func warningThenEntryThenCountdownThenEscape() {
        var world = chaseShift(police: false)
        var warning: (arm: Arm, time: Double)?
        var entered: (id: Int, deadline: Double)?
        var escaped = false
        for _ in 0..<(60 * World.stepRate) {
            world.step()
            for event in world.takeEvents() {
                switch event {
                case let .criminalWarning(arm, time): warning = (arm, time)
                case let .criminalEntered(id, deadline): entered = (id, deadline)
                case .criminalEscaped: escaped = true
                default: break
                }
            }
            if world.shift.outcome != nil { break }
        }
        guard let warning, let entered else {
            Issue.record("no chase")
            return
        }
        let config = world.config
        #expect(world.layout.aiArms.contains(warning.arm))
        #expect(config.criminalFirst.contains(warning.time))
        // It shows up after the warning, drives up to its stop line from outside the picture
        // and enters right away on an empty ring.
        #expect(entered.deadline - config.criminalTime >= warning.time + config.criminalWarning - 1e-9)
        #expect(entered.deadline - config.criminalTime < warning.time + config.criminalWarning + 5)
        #expect(escaped)
        #expect(world.shift.outcome == .escaped)
        #expect(abs(world.time - entered.deadline) < 0.02)
        // It circled instead of leaving.
        #expect(world.vehicle(id: entered.id).map { if case .ring = $0.phase { true } else { false } } == true)
    }

    @Test func policeCarTakesTheCriminalDown() {
        var world = chaseShift(police: true)
        guard let pickup = world.runUntilChase() else {
            Issue.record("no chase")
            return
        }
        let events = world.launch(into: pickup)
        let takedown = events.compactMap(\.takedown).first
        #expect(takedown?.criminal == pickup)
        #expect(takedown?.points == world.config.takedownPoints)
        #expect(events.compactMap(\.crash).first?.isTakedown == true)
        #expect(world.score.strikes == 0)
        #expect(world.score.takedowns == 1)
        #expect(world.vehicle(id: pickup)?.isCrashed == true)
        if case let .idle(next) = world.criminal.phase {
            #expect(next > world.time)
        } else {
            Issue.record("the chase did not end")
        }
    }

    @Test func aNormalCarBouncesOffTheCriminal() {
        var world = chaseShift(police: false)
        guard let pickup = world.runUntilChase() else {
            Issue.record("no chase")
            return
        }
        let events = world.launch(into: pickup)
        let crash = events.compactMap(\.crash).first
        #expect(crash?.isStrike == true)
        #expect(crash?.isTakedown == false)
        #expect(events.compactMap(\.takedown).isEmpty)
        // The pickup drives on, dented.
        let criminal = world.vehicle(id: pickup)
        #expect(criminal?.isCrashed == false)
        #expect(criminal?.dents.isEmpty == false)
        #expect(world.criminal.vehicle == pickup)
    }

    @Test func criminalPloughsThroughAWreck() {
        var world = chaseShift(police: false) { $0.crashDuration = 30 }
        guard let pickup = world.runUntilChase() else {
            Issue.record("no chase")
            return
        }
        world.run(steps: World.stepRate) { $0.vehicle(id: pickup).map { if case .ring = $0.phase { true } else { false } } == true }
        guard case let .ring(r)? = world.vehicle(id: pickup)?.phase else {
            Issue.record("the pickup is not on the ring")
            return
        }
        let wreck = world.spawnWreck(atRing: r.s + 150)
        let events = world.run(steps: 3 * World.stepRate)
        #expect(events.compactMap(\.crash).contains { $0.first == wreck || $0.second == wreck })
        #expect(world.vehicle(id: pickup)?.isCrashed == false)
        #expect(world.score.strikes == 0)
    }

    @Test func dispatchTurnsTheNextCarIntoPoliceForHalfTheCombo() {
        var world = chaseShift(police: false)
        world.score.combo = 7
        let front = world.queue.vehicles[0]
        let first = world.dispatchPolice()
        let events = world.takeEvents()
        #expect(first)
        #expect(world.vehicle(id: front)?.type == .police)
        #expect(world.score.combo == 3)
        #expect(events.contains(.dispatched(vehicle: front, combo: 3)))
        // Already a police car: nothing happens, nothing is paid.
        let second = world.dispatchPolice()
        #expect(!second)
        #expect(world.score.combo == 3)
    }

    @Test func aWarnedCriminalIsCalledOffOnceTheLastCarIsIn() {
        var world = chaseShift(police: false) {
            $0.shiftCars = 1
            $0.criminalFirst = 0.5...0.5
        }
        world.run(steps: World.stepRate) { if case .warning = $0.criminal.phase { true } else { false } }
        world.tap(at: world.time)
        let events = world.run(steps: 3 * World.stepRate) { $0.shift.outcome != nil }
        #expect(world.shift.outcome == .completed)
        #expect(!events.contains { if case .criminalEntered = $0 { true } else { false } })
        #expect(world.criminal.phase == .idle(next: .infinity))
    }

    @Test func aCriminalStillArrivingBecomesAnOrdinaryCarWhenTheLastCarIsIn() {
        // Regression for ROADMAP.md M6: a pickup already driving in when the last car
        // launches must not linger as an untracked "ghost" pickup into the next shift.
        var world = chaseShift(police: false) {
            $0.shiftCars = 1
            $0.criminalFirst = 0.5...0.5
        }
        world.run(steps: 5 * World.stepRate) { if case .arriving = $0.criminal.phase { true } else { false } }
        guard case let .arriving(id) = world.criminal.phase else {
            Issue.record("no chase arriving")
            return
        }
        #expect(world.vehicle(id: id)?.type == .pickup)
        world.tap(at: world.time)
        world.run(steps: World.stepRate)
        #expect(world.criminal.phase == .idle(next: .infinity))
        // It keeps driving in, but now as an ordinary car instead of a pickup nobody chases.
        #expect(world.vehicle(id: id)?.type == .car)
    }

    @Test func aCriminalOnTheRunDrivesOffOnceTheLastCarIsIn() {
        var world = chaseShift(police: false) { $0.shiftCars = 1 }
        guard let pickup = world.runUntilChase() else {
            Issue.record("no chase")
            return
        }
        world.tap(at: world.time)
        let events = world.run(steps: 2 * World.stepRate) { $0.shift.outcome != nil }
        // Every car is in: the shift is done, and the criminal gets away with it.
        #expect(world.shift.outcome == .completed)
        #expect(!events.contains { if case .criminalEscaped = $0 { true } else { false } })
        #expect(world.criminal.phase == .leaving(vehicle: pickup))
    }

    @Test func aCriminalDrivesOffQuietlyWhenTheShiftEndsFirst() {
        var world = chaseShift(police: false) { $0.maxStrikes = 1 }
        guard let pickup = world.runUntilChase() else {
            Issue.record("no chase")
            return
        }
        world.crashNextCar()
        #expect(world.shift.outcome == .struckOut)
        let events = world.run(steps: 20 * World.stepRate)
        #expect(!events.contains { if case .criminalEscaped = $0 { true } else { false } })
        #expect(world.criminal.phase == .leaving(vehicle: pickup))
        #expect(world.vehicle(id: pickup) == nil)
    }

    // MARK: - The chase on the ring

    @Test func aPoliceCarRightBehindTheCriminalChasesAndRamsIt() {
        var world = chaseShift(police: false)
        guard let pickup = world.runUntilChase() else {
            Issue.record("no chase")
            return
        }
        world.run(steps: World.stepRate) { $0.vehicle(id: pickup).map { if case .ring = $0.phase { true } else { false } } == true }
        guard let police = world.placePolice(behind: pickup, gap: 80) else {
            Issue.record("pickup not on the ring")
            return
        }
        var fastest = 0.0
        var events: [GameEvent] = []
        for _ in 0..<(8 * World.stepRate) {
            world.step()
            events += world.takeEvents()
            fastest = max(fastest, world.speed(of: police) ?? 0)
            if events.contains(where: { $0.takedown != nil }) { break }
        }
        let takedown = events.compactMap(\.takedown).first
        #expect(takedown?.police == police)
        #expect(fastest > world.ringSpeed * 1.2)
        #expect(fastest <= world.ringSpeed * world.config.policeChaseSpeedFactor + 1e-9)
        // A takedown is no crash of yours.
        #expect(world.score.policeCrashes == 0)
        #expect(world.shift.outcome == nil)
    }

    @Test func aPoliceCarWithAnotherCarInBetweenJustFlows() {
        var world = chaseShift(police: false)
        guard let pickup = world.runUntilChase() else {
            Issue.record("no chase")
            return
        }
        world.run(steps: World.stepRate) { $0.vehicle(id: pickup).map { if case .ring = $0.phase { true } else { false } } == true }
        guard let pickupRing = world.vehicle(id: pickup), case let .ring(r) = pickupRing.phase else {
            Issue.record("pickup not on the ring")
            return
        }
        let between = world.spawnRingCar(at: r.s - world.config.carLength - 40, exitArm: world.east)
        // It stays on the ring for the whole test; once it leaves, the chase would be on.
        if let index = world.index(of: between), case var .ring(ring) = world.vehicles[index].phase {
            ring.distanceToExit = world.layout.ring.length
            world.vehicles[index].phase = .ring(ring)
        }
        guard let police = world.placePolice(behind: between, gap: 40) else {
            Issue.record("no police car")
            return
        }
        for _ in 0..<(2 * World.stepRate) {
            world.step()
            _ = world.takeEvents()
            #expect(world.speed(of: police).map { abs($0 - world.ringSpeed) < 1e-9 } ?? true)
        }
    }

    @Test func afterAChaseTheDriverEasesBackIntoTheFlow() {
        let world = chaseShift(police: false)
        var drive = world.pursue(Drive(), dt: World.stepDuration)
        for _ in 0..<(3 * World.stepRate) {
            drive = world.pursue(drive, dt: World.stepDuration)
        }
        #expect(drive.speed == world.ringSpeed * world.config.policeChaseSpeedFactor)
        for _ in 0..<(3 * World.stepRate) {
            drive = world.drive(drive, lead: nil, id: 1, dt: World.stepDuration)
        }
        #expect(drive.isInFlow)
        #expect(!drive.isPursuing)
    }
}
