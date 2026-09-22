import Testing
@testable import GameCore

extension World {
    /// A standing wreck on the ring lane at ring distance `s`.
    @discardableResult
    mutating func spawnWreck(atRing s: Double) -> Int {
        let wreck = Vehicle(
            id: makeID(),
            owner: .ai,
            phase: .crashed(.init(velocity: .zero, spin: 0, elapsed: 0, damage: .zero)),
            pose: layout.ring.pose(at: s)
        )
        vehicles.append(wreck)
        return wreck.id
    }

    func drive(of id: Int) -> Drive? {
        if case let .ring(r) = vehicle(id: id)?.phase { return r.drive }
        return nil
    }

    func speed(of id: Int) -> Double? {
        drive(of: id).map { $0.speed ?? ringSpeed }
    }
}

@Suite("Drivers")
struct DriverTests {
    /// Wrecks that stay, so a test can watch the traffic behind them.
    func lastingWrecks() -> World {
        var config = Config()
        config.crashDuration = 30
        return emptyWorld(config: config)
    }

    @Test func normalTrafficNeverLeavesTheFlow() {
        var config = Config()
        config.freePlayDensity = 7
        var world = World(config: config, seed: 4, mode: .freePlay)
        for _ in 0..<(40 * World.stepRate) {
            world.step()
            #expect(!world.isTrafficDisturbed)
        }
    }

    @Test func carWithRoomBrakesAndStopsBehindAWreck() {
        var world = lastingWrecks()
        // Slowest reaction (1.5 s) plus full braking needs ~330 wu at ring speed.
        world.spawnWreck(atRing: 400)
        let car = world.spawnRingCar(at: 0, exitArm: world.south)
        var events: [GameEvent] = []
        var reacted = false
        for _ in 0..<(6 * World.stepRate) {
            world.step()
            events += world.takeEvents()
            reacted = reacted || world.drive(of: car)?.reaction != nil
        }
        #expect(reacted)
        #expect(events.compactMap(\.crash).isEmpty)
        #expect((world.speed(of: car) ?? 1) < 0.5)
        if case let .ring(r) = world.vehicle(id: car)?.phase {
            let gap = world.layout.ringDistance(from: r.s, to: 400) - world.config.carLength
            #expect(gap > 0 && gap < world.config.stopGap + 6)
        }
    }

    @Test func carTooCloseToStopCrashesButCostsNoStrike() {
        var world = lastingWrecks()
        let wreck = world.spawnWreck(atRing: 120)
        let car = world.spawnRingCar(at: 50, exitArm: world.south)
        let events = world.run(steps: 2 * World.stepRate)
        let crash = events.compactMap(\.crash).first
        #expect(crash != nil)
        #expect(crash?.isStrike == false)
        #expect(crash?.penalty == 0)
        #expect(world.score.strikes == 0)
        #expect(world.vehicle(id: car)?.isCrashed == true)
        #expect(world.vehicle(id: car)?.dents.isEmpty == false)
        #expect(world.vehicle(id: wreck)?.dents.isEmpty == false)
    }

    @Test func trafficFlowsAgainOnceTheWreckIsGone() {
        var config = Config()
        config.crashDuration = 3
        var world = emptyWorld(config: config)
        world.spawnWreck(atRing: 400)
        let car = world.spawnRingCar(at: 0, exitArm: world.south)
        world.run(steps: 3 * World.stepRate)
        #expect(world.drive(of: car)?.isInFlow == false)
        world.run(steps: 8 * World.stepRate) { $0.drive(of: car)?.isInFlow == true }
        #expect(world.drive(of: car)?.isInFlow == true)
        #expect(!world.isTrafficDisturbed)
    }

    @Test func driversBehindABrakingCarBrakeToo() {
        var world = lastingWrecks()
        world.spawnWreck(atRing: 500)
        let first = world.spawnRingCar(at: 120, exitArm: world.south)
        let second = world.spawnRingCar(at: 30, exitArm: world.south)
        var secondReacted = false
        for _ in 0..<(5 * World.stepRate) {
            world.step()
            secondReacted = secondReacted || world.drive(of: second)?.reaction != nil
        }
        #expect(world.drive(of: first)?.isInFlow == false)
        #expect(secondReacted)
    }

    @Test func aiWaitsWhileTrafficIsDisturbed() {
        var world = lastingWrecks()
        world.spawnWreck(atRing: 700)
        for arm in world.layout.aiArms {
            #expect(!world.canEnter(arm))
        }
    }

    @Test func chainCrashesCanBeMadeToCost() {
        var config = Config()
        config.crashDuration = 30
        config.chainCrashesCostStrikes = true
        var world = emptyWorld(config: config)
        world.spawnWreck(atRing: 120)
        let car = world.spawnRingCar(at: 50, exitArm: world.south)
        if let index = world.index(of: car) {
            world.vehicles[index].owner = .player
        }
        let crash = world.run(steps: 2 * World.stepRate).compactMap(\.crash).first
        #expect(crash?.isStrike == true)
        #expect(world.score.strikes == 1)
    }

    @Test func dentsStayWithinTheCrumpleRange() {
        func dentDepth(arc: Double) -> Double? {
            var world = emptyWorld()
            world.spawnRingCar(at: world.ringPositionAhead(ofMergeEnd: arc), exitArm: world.west)
            let player = world.queue.vehicles[0]
            world.tap(at: 0)
            world.run(steps: 90) { $0.vehicles.contains(where: \.isCrashed) }
            return world.vehicle(id: player)?.dents.map(\.depth).max()
        }
        let config = Config()
        let depths = [0.0, 10, 20].compactMap(dentDepth)
        #expect(depths.count == 3)
        #expect(depths.allSatisfy { $0 >= 0.6 && $0 <= config.maxDent })
    }
}
