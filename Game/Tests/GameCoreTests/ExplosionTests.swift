import Testing
@testable import GameCore

extension World {
    /// Steps until the military truck's zone is up. Returns the truck's id.
    mutating func runUntilMilitary(limit seconds: Double = 30) -> Int? {
        for _ in 0..<Int(seconds * Double(World.stepRate)) {
            step()
            _ = takeEvents()
            if case let .active(id, _) = military.phase { return id }
        }
        return nil
    }
}

extension GameEvent {
    var explosion: ExplosionReport? {
        if case let .explosion(report) = self { return report }
        return nil
    }
}

/// A shift without traffic, criminals or transporters, so a test controls every car.
func explosiveShift(_ adjust: (inout Config) -> Void = { _ in }) -> World {
    quietShift {
        $0.criminalFirst = 1000...1000
        $0.transporterFirst = 1000...1000
        $0.policeShare = 0
        adjust(&$0)
    }
}

@Suite("Explosives: gas tanker and military truck")
struct ExplosionTests {
    @Test func aWreckedTankerBlowsUpAndWrecksWhatIsAroundIt() {
        var world = explosiveShift()
        world.run(steps: 2 * World.stepRate) { $0.queue.isReady }
        let s = world.ringPositionAhead(ofMergeEnd: 0)
        let tanker = world.spawnRingCar(at: s, exitArm: world.west, type: .tanker)
        let near = world.spawnRingCar(at: s - 50, exitArm: world.west, type: .car)
        let far = world.spawnRingCar(at: s + 300, exitArm: world.west, type: .car)
        world.tap(at: world.time)
        let events = world.run(steps: World.stepRate) { world in world.vehicle(id: tanker)?.isCrashed == true }
            + world.run(steps: 2)
        let blast = events.compactMap(\.explosion).first
        #expect(blast?.kind == .tanker)
        #expect(blast?.source == tanker)
        #expect(blast?.wrecked.contains(near) == true)
        #expect(world.vehicle(id: near)?.isCrashed == true)
        #expect(world.vehicle(id: far)?.isCrashed == false)
        // The blast throws the car away from the tank.
        if let wreck = world.vehicle(id: near), case let .crashed(state) = wreck.phase, let point = blast?.point {
            #expect(state.velocity.dot(wreck.position - point) > 0)
        }
    }

    @Test func aTankerCaughtInABlastGoesUpToo() {
        var world = explosiveShift()
        world.run(steps: 2 * World.stepRate) { $0.queue.isReady }
        let s = world.ringPositionAhead(ofMergeEnd: 0)
        let first = world.spawnRingCar(at: s, exitArm: world.west, type: .tanker)
        let second = world.spawnRingCar(at: s - 55, exitArm: world.west, type: .tanker)
        world.tap(at: world.time)
        let events = world.run(steps: World.stepRate) { world in world.vehicle(id: first)?.isCrashed == true }
            + world.run(steps: 2)
        let sources = events.compactMap(\.explosion).map(\.source)
        #expect(sources == [first, second])
    }

    @Test func aPlainLorryOnlyCrashes() {
        var world = explosiveShift()
        world.run(steps: 2 * World.stepRate) { $0.queue.isReady }
        world.spawnRingCar(at: world.ringPositionAhead(ofMergeEnd: 0), exitArm: world.west, type: .truck)
        world.tap(at: world.time)
        let events = world.run(steps: World.stepRate)
        #expect(events.contains { if case .crash = $0 { true } else { false } })
        #expect(events.compactMap(\.explosion).isEmpty)
    }

    @Test func theMilitaryTruckIsAnnouncedCirclesAndLeaves() {
        var world = explosiveShift {
            $0.militaryChance = 1
            $0.militaryFirst = 0.5...0.5
            $0.militaryTime = 4
        }
        var warned = false
        var entered: Int?
        for _ in 0..<(20 * World.stepRate) {
            world.step()
            for event in world.takeEvents() {
                if case .militaryWarning = event { warned = true }
                if case let .militaryEntered(id, _) = event { entered = id }
            }
            if entered != nil, world.military.vehicle == nil { break }
        }
        #expect(warned)
        guard let entered else {
            Issue.record("no military truck")
            return
        }
        // Its time was up and it drove off in one piece; no second one in a normal shift.
        #expect(world.vehicle(id: entered) == nil)
        #expect(world.military.count == 1)
        #expect(!world.shift.detonated)
    }

    @Test func mergingIntoTheZoneSetsTheBombOffAndEndsTheShift() {
        var world = explosiveShift {
            $0.militaryChance = 1
            $0.militaryFirst = 0.5...0.5
            $0.militaryTime = 30
        }
        guard let truck = world.runUntilMilitary() else {
            Issue.record("no military truck")
            return
        }
        // Wait until the next merge would end in the zone, then send the car.
        world.run(steps: 20 * World.stepRate) { $0.queue.isReady && $0.predictedMergeGap(from: $0.layout.player) <= 0 }
        #expect(world.predictedMergeGaps(from: world.layout.player)[truck] ?? .infinity <= 0)
        let bystander = world.spawnRingCar(at: world.ringPositionAhead(ofMergeEnd: 0) + 350, exitArm: world.west, type: .car)
        world.tap(at: world.time)
        let events = world.run(steps: World.stepRate) { $0.shift.outcome != nil }
        let blast = events.compactMap(\.explosion).first
        #expect(blast?.kind == .bomb)
        #expect(world.shift.outcome == .struckOut)
        #expect(world.shift.detonated)
        #expect(world.military.phase == .detonated)
        #expect(world.vehicle(id: bystander)?.isCrashed == true)
        let result = events.compactMap { if case let .shiftEnded(result) = $0 { result } else { nil } }.first
        #expect(result?.detonated == true)
    }

    @Test func theZoneCountsAsAGapForWhoeverMerges() {
        var world = explosiveShift {
            $0.militaryChance = 1
            $0.militaryFirst = 0.5...0.5
            $0.militaryTime = 30
        }
        guard let truck = world.runUntilMilitary() else {
            Issue.record("no military truck")
            return
        }
        // Everyone sees the zone as bigger than the truck: the gap to it is smaller.
        guard let pose = world.vehicle(id: truck), case let .ring(r) = pose.phase else { return }
        let probe = world.hitbox(at: world.layout.ring.pose(at: r.s + world.config.militaryZoneArc / 2 + world.config.carLength))
        #expect(world.gapToZone(probe, ringS: r.s) < Collision.gap(probe, world.hitbox(of: pose)))
    }

    @Test func tankersLeaveEverySeedsTrafficAsItWas() {
        func traffic(_ share: Double) -> [(Double, Double, Double)] {
            var config = Config()
            config.tankerShare = share
            var world = World(config: config, seed: 9, mode: .freePlay)
            world.run(steps: 20 * World.stepRate)
            return world.vehicles.map { ($0.position.x, $0.position.y, world.length(of: $0.type)) }
        }
        let without = traffic(0)
        let with = traffic(0.8)
        #expect(without.count == with.count)
        #expect(zip(without, with).allSatisfy { $0.0 == $1.0 && $0.1 == $1.1 && $0.2 == $1.2 })
    }

    @Test func explosivesComeWithTheLevelsAndFarMoreInMayhem() {
        let config = Config()
        let first = config.forLevel(1, seed: 1)
        #expect(first.tankerShare == 0 && first.militaryChance == 0)
        #expect(config.forLevel(config.tankerLevel, seed: 1).tankerShare > 0)
        #expect(config.forLevel(config.militaryLevel, seed: 1).militaryChance > 0)
        let mayhem = first.forMayhem()
        #expect(mayhem.tankerShare > config.tankerLevelShare)
        #expect(mayhem.truckChance > config.truckChance)
        #expect(mayhem.militaryChance == 1)
        #expect(mayhem.militaryPerShift > 1)
        let world = World(config: mayhem, seed: 3, mode: .shift)
        if case let .idle(next) = world.military.phase {
            #expect(next.isFinite)
        } else {
            Issue.record("military not waiting")
        }
    }

    @Test func inMayhemTheBombIsTheFinaleAndPaysForEveryWreck() {
        var world = quietShift { config in
            config = config.forMayhem()
            config.densityStart = 0
            config.densityEnd = 0
            config.minRingBots = 0
            config.militaryFirst = 0.5...0.5
            config.militaryTime = 30
        }
        guard let truck = world.runUntilMilitary() else {
            Issue.record("no military truck")
            return
        }
        world.run(steps: 20 * World.stepRate) { $0.queue.isReady && $0.predictedMergeGap(from: $0.layout.player) <= 0 }
        // Bystanders behind the truck, well clear of the merge.
        if case let .ring(r)? = world.vehicle(id: truck)?.phase {
            for offset in [150.0, 250, 350] {
                world.spawnRingCar(at: r.s - offset, exitArm: world.west, type: .car)
            }
        }
        world.tap(at: world.time)
        let events = world.run(steps: World.stepRate) { $0.shift.outcome != nil }
        let blast = events.compactMap(\.explosion).first
        #expect(blast?.kind == .bomb)
        #expect(world.shift.outcome == .completed)
        #expect((blast?.flames ?? 0) >= 3)
        #expect(world.score.flames >= blast?.flames ?? 0)
    }

    @Test func mayhemReloadsBetweenCars() {
        var world = quietShift { config in
            config = config.forMayhem()
            config.densityStart = 0
            config.densityEnd = 0
            config.minRingBots = 0
        }
        world.run(steps: 3 * World.stepRate) { $0.queue.isReady }
        world.tap(at: world.time)
        world.run(steps: World.stepRate / 2)
        // Half a second later the next car is still rolling up: no rapid fire.
        #expect(!world.queue.isReady)
        world.run(steps: 3 * World.stepRate) { $0.queue.isReady }
        #expect(world.queue.isReady)
    }

    @Test func aHeavyWreckIsWorthMoreFlames() {
        var world = quietShift { $0 = $0.forMayhem() }
        let now = world.time
        let light = world.scoreMayhem(at: now, followUp: false)
        let heavy = world.scoreMayhem(at: now + 10, followUp: false, heavy: true)
        #expect(heavy.flames == light.flames * world.config.mayhemHeavyFlames)
    }

    @Test func quickRecoveryMakesTrafficAccelerateHarder() {
        let config = Config()
        let bought = config.upgraded { $0 == .quickRecovery ? Upgrade.quickRecovery.maxSteps : 0 }
        #expect(bought.driverAcceleration > config.driverAcceleration * 1.9)
        #expect(config.upgraded { _ in 0 }.driverAcceleration == config.driverAcceleration)
    }

    @Test func theCriminalBargesIntoGapsOthersWaitOut() {
        var world = explosiveShift()
        let arm = world.layout.arm(1)
        // A car that passes the entry just a little ahead of a merge started now.
        let arrival = world.layout.entryRingS(arm)
        world.spawnRingCar(at: arrival - world.ringSpeed * world.config.mergeDuration + world.config.carLength + 8, exitArm: world.west, type: .car)
        #expect(!world.canEnter(arm))
        #expect(world.canBargeIn(arm))
    }

    @Test func inMayhemTrafficDrivesOverWrecksAndNeverBrakes() {
        var world = quietShift { config in
            config = config.forMayhem()
            config.densityStart = 0
            config.densityEnd = 0
            config.minRingBots = 0
            config.militaryChance = 0
        }
        // A wreck lying still on the ring, a car coming up behind it.
        let s = world.layout.entryRingS(world.layout.player) + 200
        let wreck = world.spawnRingCar(at: s, exitArm: world.west, type: .car)
        let car = world.spawnRingCar(at: s - 60, exitArm: world.west, type: .car)
        if let index = world.index(of: wreck) {
            world.makeWreck(index, world.vehicles[index].position, RigidBody(position: world.vehicles[index].position, velocity: .zero, heading: 0, angularVelocity: 0, mass: 1, inertia: 1))
        }
        #expect(world.vehicle(id: wreck)?.isCrashed == true)
        world.run(steps: World.stepRate)
        guard let driven = world.vehicle(id: car) else { return }
        #expect(!driven.isCrashed)
        if case let .ring(r) = driven.phase {
            #expect(r.drive.isInFlow)
        }
        #expect(!world.isDisturbed(near: world.layout.arm(1)))
    }
}
