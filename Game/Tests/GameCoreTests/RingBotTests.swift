import Testing
@testable import GameCore

/// The player fits cars into gaps between bots (ROADMAP.md, "Bots im Ring"): the ring always
/// holds `minRingBots`, a bot leaves only once its successor is in, and the player's own
/// cars never hold the bots back.
@Suite("Bots in the ring")
struct RingBotTests {
    /// Every level, many seeds, from the first step on: never fewer bots than the level asks
    /// for, and never fewer than three. Nobody taps, so nothing crashes.
    @Test(arguments: [1, 4, 8, 15, 30])
    func ringNeverHasFewerThanThreeBots(level: Int) {
        for seed in UInt64(1)...6 {
            let config = Config().forLevel(level, seed: seed).forWeather(.clear)
            #expect(config.minRingBots >= 3)
            var world = World(config: config, seed: seed)
            for step in 0..<(25 * World.stepRate) {
                #expect(world.ringBotCount >= config.minRingBots, "level \(level), seed \(seed), step \(step)")
                if world.ringBotCount < config.minRingBots { break }
                world.step()
                _ = world.takeEvents()
            }
        }
    }

    /// A toll booth and a speed camera slow their zones down for good, and cars queue in
    /// front of them. That is no jam: bots passing through keep the minimum like anywhere
    /// else. (Only a queue that rear-ends leaves a gap until the replacements are in.)
    @Test(arguments: [1, 8, 20])
    func modulesDoNotEmptyTheRing(level: Int) {
        var below = 0
        var total = 0
        for seed in UInt64(1)...6 {
            var config = Config().forLevel(level, seed: seed)
            config.modules = [0: .tollBooth, 2: .speedCamera]
            var world = World(config: config, seed: seed)
            for _ in 0..<(40 * World.stepRate) {
                total += 1
                if world.ringBotCount < config.minRingBots { below += 1 }
                #expect(world.ringBotCount >= 2, "level \(level), seed \(seed), t \(world.time)")
                world.step()
                _ = world.takeEvents()
            }
        }
        #expect(Double(below) / Double(total) < 0.05, "level \(level): \(below * 100 / total) % below the minimum")
    }

    /// The flowing change between two shifts keeps the ring filled as well.
    @Test func theNextShiftStartsWithTheRingFilled() {
        var world = World(config: Config().forLevel(3, seed: 5), seed: 5)
        world.run(steps: 10 * World.stepRate)
        var next = world.nextShift(config: Config().forLevel(4, seed: 6), seed: 6)
        for _ in 0..<(10 * World.stepRate) {
            #expect(next.ringBotCount >= next.config.minRingBots)
            next.step()
            _ = next.takeEvents()
        }
    }

    @Test func minimumGrowsWithTheLevelUpToItsLimit() {
        let config = Config()
        let minimums = (1...40).map { config.forLevel($0, seed: 1).minRingBots }
        #expect(minimums.first == config.minRingBots)
        #expect(zip(minimums, minimums.dropFirst()).allSatisfy { $0 <= $1 })
        #expect(minimums.last == config.maxMinRingBots)
    }

    /// Exactly the minimum on the ring and no inflow: nobody leaves, they all drive lap
    /// after lap. Once more bots come, some may go, and the minimum still holds.
    @Test func aBotDrivesAnotherLapUntilItsSuccessorIsIn() {
        var config = Config()
        config.minRingBots = 3
        var world = World(config: config, seed: 2, mode: .freePlay, prefill: false)
        world.targetDensity = 0
        let circumference = world.layout.ring.length
        for k in 0..<3 {
            world.spawnRingCar(at: Double(k) * circumference / 3, exitArm: world.east)
        }
        let events = world.run(steps: 20 * World.stepRate)
        #expect(!events.contains { if case .exited = $0 { true } else { false } })
        #expect(world.ringBotCount == 3)

        world.targetDensity = 6
        var exited = 0
        for _ in 0..<(30 * World.stepRate) {
            world.step()
            exited += world.takeEvents().count { if case .exited = $0 { true } else { false } }
            #expect(world.ringBotCount >= 3)
        }
        #expect(exited > 0)
    }

    /// A bot decides to take its exit `botExitNotice` before it, longer ahead than anybody
    /// predicts the traffic. Nobody plans a merge into a gap that is not there.
    @Test func aBotDecidesToLeaveWellBeforeItsExit() {
        var config = Config()
        config.freePlayDensity = 7
        var world = World(config: config, seed: 9, mode: .freePlay)
        var decided: [Int: Double] = [:]
        var checked = 0
        for _ in 0..<(40 * World.stepRate) {
            world.step()
            for vehicle in world.vehicles where decided[vehicle.id] == nil {
                if case let .ring(r) = vehicle.phase, r.isLeaving { decided[vehicle.id] = world.time }
            }
            for case let .exited(id, _) in world.takeEvents() {
                guard let since = decided[id] else { continue }
                checked += 1
                #expect(world.time - since >= config.botExitNotice - 0.05)
            }
        }
        #expect(checked > 5)
    }

    /// The ring belongs to the bots: the player's cars on it do not count towards the
    /// density, so the AI keeps sending its own.
    @Test func thePlayersCarsDoNotHoldTheBotsBack() {
        var world = emptyWorld()
        world.spawnRingCar(at: 0, exitArm: world.west)
        let bots = world.densityCount
        for k in 1...4 {
            let id = world.spawnRingCar(at: Double(k) * 60, exitArm: world.west)
            if let index = world.index(of: id) { world.vehicles[index].owner = .player }
        }
        #expect(world.densityCount == bots)
    }
}

/// Regression: the ring was filled with a car's spacing for every vehicle, so a lorry could
/// start bumper to bumper with the car ahead and crash as soon as anybody braked.
@Test(arguments: [1, 10, 20, 30])
func prefilledTrafficKeepsItsGapsWithLorries(level: Int) {
    for seed in UInt64(1)...12 {
        var config = Config().forLevel(level, seed: seed)
        config.truckChance = 0.5
        let world = World(config: config, seed: seed)
        let ring = world.vehicles.compactMap { v -> (s: Double, length: Double)? in
            if case let .ring(r) = v.phase { return (r.s, world.length(of: v.type)) }
            return nil
        }.sorted { $0.s < $1.s }
        for (k, car) in ring.enumerated() {
            let next = ring[(k + 1) % ring.count]
            let gap = world.layout.ringDistance(from: car.s, to: next.s) - (car.length + next.length) / 2
            #expect(gap >= config.aiSafeGap * world.ringSpeed - 1e-6, "level \(level), seed \(seed)")
        }
    }
}
