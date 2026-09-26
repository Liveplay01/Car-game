import Testing
@testable import GameCore

/// An empty roundabout without AI and without a shift clock, so a test controls every car.
func emptyWorld(config: Config = Config(), seed: UInt64 = 1) -> World {
    // Empty stays empty: no bots come in to keep the ring filled either.
    var config = config
    config.minRingBots = 0
    var world = World(config: config, seed: seed, mode: .freePlay, prefill: false)
    world.targetDensity = 0
    return world
}

extension World {
    /// The arms by the names the tests grew up with: the player's at the bottom, then in
    /// driving direction. How many there are now depends on the roundabout (`Config.arms`).
    var south: Arm { layout.player }
    var east: Arm { layout.arm(1) }
    var north: Arm { layout.arm(2) }
    var west: Arm { layout.arm(3) }

    /// Steps until `condition` is true or `limit` steps have passed. Returns all events.
    @discardableResult
    mutating func run(steps limit: Int, until condition: (World) -> Bool = { _ in false }) -> [GameEvent] {
        var all: [GameEvent] = []
        for _ in 0..<limit {
            step()
            all += takeEvents()
            if condition(self) { break }
        }
        return all
    }

    /// Ring position a car must have now to be at `arc` ahead of the player's merge point
    /// at the moment a merge launched now completes.
    func ringPositionAhead(ofMergeEnd arc: Double) -> Double {
        layout.entryRingS(layout.player) + arc - ringSpeed * config.mergeDuration
    }
}

extension GameEvent {
    var crash: CrashReport? { if case let .crash(r) = self { r } else { nil } }
    var merge: MergeReport? { if case let .merged(r) = self { r } else { nil } }
    var comboChange: ComboChange? { if case let .comboChanged(c) = self { c } else { nil } }
    var shiftResult: ShiftResult? { if case let .shiftEnded(r) = self { r } else { nil } }
    var isRejectedTap: Bool { if case .tapRejected = self { true } else { false } }
    var isRushHour: Bool { if case .rushHour = self { true } else { false } }
}

@Suite("Tap and queue")
struct QueueTests {
    @Test func tapLaunchesTheFrontCarInTheSameStep() {
        var world = emptyWorld()
        let front = world.queue.vehicles[0]
        world.tap(at: world.time)
        world.step()
        let events = world.takeEvents()
        #expect(events.contains(.launched(vehicle: front, time: 0)))
        guard case let .merging(merge) = world.vehicle(id: front)?.phase else {
            Issue.record("front car is not merging")
            return
        }
        #expect(abs(merge.elapsed - World.stepDuration) < 1e-12)
    }

    @Test func tapInsideAStepCountsFromTheTapNotTheStep() {
        var world = emptyWorld()
        let front = world.queue.vehicles[0]
        world.tap(at: World.stepDuration * 0.75)
        world.step()
        guard case let .merging(merge) = world.vehicle(id: front)?.phase else {
            Issue.record("front car is not merging")
            return
        }
        #expect(abs(merge.elapsed - World.stepDuration * 0.25) < 1e-12)
    }

    @Test func mergeTakesTheMergeDuration() {
        var world = emptyWorld()
        world.tap(at: 0)
        let events = world.run(steps: 200) { _ in false }
        let merge = events.compactMap(\.merge).first
        #expect(merge != nil)
        if let merge {
            #expect(merge.time >= world.config.mergeDuration - 1e-9)
            #expect(merge.time <= world.config.mergeDuration + World.stepDuration + 1e-9)
            #expect(merge.minGap == .infinity)
        }
    }

    @Test func earlyTapLaunchesTheNextCarTheMomentItArrives() {
        var world = emptyWorld()
        world.tap(at: 0)
        world.step()
        let next = world.queue.vehicles[0]
        world.tap(at: world.time)
        world.step()
        #expect(!world.takeEvents().contains { $0.isRejectedTap })
        #expect(world.queue.heldTap != nil)
        let events = world.run(steps: World.stepRate) { $0.vehicle(id: next)?.activeMerge != nil }
        // It leaves right after the car ahead has cleared its slot: no cooldown.
        let clearing = world.config.queueSpacing / world.config.ringSpeed
        #expect(events.contains { if case .launched(next, _) = $0 { true } else { false } })
        #expect(world.time <= clearing + 2 * World.stepDuration + 1e-9)
        #expect(world.queue.heldTap == nil)
    }

    /// Leo, 26.09.2026: the next car no longer stops dead at the line. Without a tap it pulls
    /// away and brakes softly, reaching the line exactly when the slot is free.
    @Test func theNextCarBrakesSoftlyAtTheLine() {
        #expect(PlayerQueue.approach(0) == 0)
        #expect(PlayerQueue.approach(1) == 1)
        #expect(PlayerQueue.approachSpeed(0) == 0)
        #expect(PlayerQueue.approachSpeed(1) == 0)
        var last = 0.0
        for i in 0...200 {
            let p = PlayerQueue.approach(Double(i) / 200)
            #expect(p >= last - 1e-12 && p <= 1 + 1e-12)
            last = p
        }
        // The cars behind a car that rolled through carry on at its speed, then brake.
        #expect(PlayerQueue.approachSpeed(0, startSpeed: 1) == 1)
        #expect(PlayerQueue.approachSpeed(1, startSpeed: 1) == 0)
    }

    /// Leo, 26.09.2026 (after the playtest: "sieht noch buggy aus"): an early tap must never
    /// make the rolling car brake and speed up again. Wherever the tap catches it, it only
    /// settles towards ring speed and goes through the line; your own cars keep their room.
    @Test func aHeldTapLetsTheRollingCarGoThroughWithoutAWobble() {
        let clearing = Config().queueSpacing / Config().ringSpeed
        for share in [0.05, 0.25, 0.45, 0.65, 0.8, 0.92, 0.98] {
            var world = emptyWorld()
            world.tap(at: 0)
            let leader = world.queue.vehicles[0]
            let next = world.queue.vehicles[1]
            let behind = world.queue.vehicles[2]
            let v = world.ringSpeed * World.stepDuration
            world.run(steps: Int(clearing * share / World.stepDuration)) { _ in false }
            #expect(world.queue.pass == nil)
            world.tap(at: world.time)
            world.step()
            // Rolling through, or at the very last moment already gone into its merge.
            var launched = world.takeEvents().contains { if case .launched(next, _) = $0 { true } else { false } }
            #expect(world.queue.pass != nil || launched)
            #expect(!world.queueBrakes)
            guard let tapped = world.vehicle(id: next) else { continue }
            let atTap = tapped.position.distance(to: tapped.previousPosition) / v
            var lastBehind: Double?
            for _ in 0..<World.stepRate {
                world.step()
                let events = world.takeEvents()
                guard let car = world.vehicle(id: next), let follower = world.vehicle(id: behind) else { break }
                let speed = car.position.distance(to: car.previousPosition) / v
                if case .queued = car.phase {
                    // Never slower than when the tap came or than the ring, whichever is less.
                    #expect(speed >= min(atTap, 1) - 0.05, "tap at \(share): \(speed) after \(atTap)")
                    #expect(speed <= max(atTap, PlayerQueue.Pass.fastest) + 0.05)
                }
                if !launched, events.contains(where: { if case .launched(next, _) = $0 { true } else { false } }) {
                    launched = true
                    // Room to the car in front, bumper to bumper.
                    if let front = world.vehicle(id: leader) {
                        let room = front.position.distance(to: car.position) - (world.length(of: front.type) + world.length(of: car.type)) / 2
                        #expect(room >= World.passClearance - 0.5)
                    }
                }
                // The car behind never stops dead.
                let step = follower.position.distance(to: follower.previousPosition) / v
                if let lastBehind { #expect(abs(step - lastBehind) <= 0.35) }
                lastBehind = step
            }
            #expect(launched, "tap at \(share) never launched")
        }
    }

    @Test func theQueueStandsWithBrakeLightsWhenNoTapIsHeld() {
        var world = emptyWorld()
        world.tap(at: 0)
        world.run(steps: World.stepRate) { $0.queue.isReady }
        #expect(world.queue.pass == nil)
        #expect(world.queueBrakes)
        #expect(world.queue.vehicles.first.flatMap { world.vehicle(id: $0) }.map(world.isBraking) == true)
    }

    @Test func onlyOneEarlyTapIsHeld() {
        var world = emptyWorld()
        world.tap(at: 0)
        world.step()
        world.tap(at: world.time)
        world.tap(at: world.time)
        world.step()
        #expect(world.takeEvents().filter(\.isRejectedTap).count == 1)
    }

    @Test func theNextCarFollowsWithoutJumping() {
        var world = emptyWorld()
        world.tap(at: 0)
        let next = world.queue.vehicles[1]
        // It pulls away from standing and brakes at the line in the time the launched car
        // needs for one slot, so in between it is briefly up to 1.5 times as fast as the ring
        // (`PlayerQueue.approach`) — a car pulling up, never a jump.
        let limit = 1.5 * world.config.ringSpeed * World.stepDuration + 1e-6
        for _ in 0..<World.stepRate {
            world.step()
            guard let car = world.vehicle(id: next) else { break }
            #expect(car.position.x.isFinite && car.position.y.isFinite)
            #expect(car.position.distance(to: car.previousPosition) <= limit)
        }
    }

    @Test func anAdvanceDurationStillDelaysTheNextCar() {
        var config = Config()
        config.queueAdvanceDuration = 0.2
        var world = emptyWorld(config: config)
        world.tap(at: 0)
        world.run(steps: 240) { $0.queue.isReady }
        let clearing = config.queueSpacing / config.ringSpeed
        #expect(world.time >= clearing + 0.2 - 0.02)
        #expect(world.time <= clearing + 0.2 + 0.03)
    }

    @Test func queueIsReadyAgainAfterClearingAndRollingUp() {
        var world = emptyWorld()
        world.tap(at: 0)
        world.run(steps: 240) { $0.queue.isReady }
        let clearing = world.config.queueSpacing / world.config.ringSpeed
        #expect(world.queue.isReady)
        #expect(world.time >= clearing + world.config.queueAdvanceDuration - 0.02)
        #expect(world.time <= clearing + world.config.queueAdvanceDuration + 0.03)
    }

    @Test func spammingTapsNeverCrashesOwnCarsOrFarmsTightFits() {
        var world = emptyWorld()
        var events: [GameEvent] = []
        for _ in 0..<(4 * World.stepRate) {
            world.tap(at: world.time)
            world.step()
            events += world.takeEvents()
        }
        #expect(events.compactMap(\.crash).isEmpty)
        let merges = events.compactMap(\.merge)
        #expect(merges.count >= 6)
        for merge in merges {
            #expect(merge.minGap >= world.config.tightFitSeconds)
        }
    }

    @Test func newCarsDriveUpToTheirStopLineFromOutsideThePicture() {
        var world = emptyWorld()
        world.spawnWaiting(at: world.north)
        guard let car = world.vehicles.last else { return }
        let stop = world.layout.stopPose(world.north).position
        #expect(car.position.distance(to: stop) > 250)
        world.run(steps: 8 * World.stepRate) { world in
            guard case let .waiting(w)? = world.vehicle(id: car.id)?.phase else { return true }
            return w.approach == 0
        }
        let arrived = world.vehicle(id: car.id)
        let atTheLine = arrived.map { $0.position.distance(to: stop) < 1 } ?? false
        let entering = arrived.map { if case .merging = $0.phase { true } else { false } } ?? false
        #expect(atTheLine || entering)
    }

    @Test func queueStaysFull() {
        var world = emptyWorld()
        let length = world.queue.vehicles.count
        world.tap(at: 0)
        world.step()
        #expect(world.queue.vehicles.count == length)
    }
}

@Suite("Merging and crashes")
struct MergeTests {
    @Test func carStandingAtTheMergePointIsACrash() {
        var world = emptyWorld()
        world.spawnRingCar(at: world.ringPositionAhead(ofMergeEnd: 0), exitArm: world.west)
        let player = world.queue.vehicles[0]
        world.tap(at: 0)
        let events = world.run(steps: 90)
        let crash = events.compactMap(\.crash).first
        #expect(crash != nil)
        #expect(crash?.involvesPlayer == true)
        #expect(crash?.first == player || crash?.second == player)
        #expect(events.compactMap(\.merge).isEmpty)
    }

    @Test func justMissingTheCarAheadIsATightFit() {
        var world = emptyWorld()
        let arc = world.config.carLength + 6
        world.spawnRingCar(at: world.ringPositionAhead(ofMergeEnd: arc), exitArm: world.west)
        world.tap(at: 0)
        let events = world.run(steps: 90)
        #expect(events.compactMap(\.crash).isEmpty)
        let merge = events.compactMap(\.merge).first
        #expect(merge != nil)
        if let merge {
            #expect(merge.minGap > 0)
            #expect(merge.minGap < world.config.tightFitSeconds)
        }
    }

    @Test func justTouchingTheCarAheadIsACrash() {
        var world = emptyWorld()
        let arc = world.config.carLength - 2
        world.spawnRingCar(at: world.ringPositionAhead(ofMergeEnd: arc), exitArm: world.west)
        world.tap(at: 0)
        let events = world.run(steps: 90)
        #expect(!events.compactMap(\.crash).isEmpty)
    }

    @Test func justMissingTheCarBehindIsATightFit() {
        var world = emptyWorld()
        let arc = -(world.config.carLength + 6)
        world.spawnRingCar(at: world.ringPositionAhead(ofMergeEnd: arc), exitArm: world.west)
        world.tap(at: 0)
        let events = world.run(steps: 90)
        #expect(events.compactMap(\.crash).isEmpty)
        let merge = events.compactMap(\.merge).first
        #expect(merge.map { $0.minGap < world.config.tightFitSeconds } == true)
    }

    @Test func wideGapIsCleanNotTight() {
        var world = emptyWorld()
        world.spawnRingCar(at: world.ringPositionAhead(ofMergeEnd: 80), exitArm: world.west)
        world.tap(at: 0)
        let merge = world.run(steps: 90).compactMap(\.merge).first
        #expect(merge.map { $0.minGap > world.config.tightFitSeconds } == true)
    }

    @Test func crashedCarsLeaveCollisionsAndDisappear() {
        var world = emptyWorld()
        world.spawnRingCar(at: world.ringPositionAhead(ofMergeEnd: 0), exitArm: world.west)
        world.tap(at: 0)
        world.run(steps: 90) { $0.vehicles.contains(where: \.isCrashed) }
        let crashed = world.vehicles.filter(\.isCrashed)
        #expect(crashed.count == 2)
        #expect(crashed.allSatisfy { !$0.isCollidable })
        world.run(steps: Int(world.config.crashDuration * Double(World.stepRate)) + 2)
        let stillCrashed = world.vehicles.contains { $0.isCrashed }
        #expect(!stillCrashed)
    }

    @Test func playerCarsLeaveTheRingAgain() {
        var world = emptyWorld()
        world.tap(at: 0)
        let events = world.run(steps: 10 * World.stepRate)
        #expect(events.contains { if case .exited = $0 { true } else { false } })
    }

    @Test func nobodyEverExitsSouth() {
        var world = emptyWorld()
        for arm in world.layout.arms {
            for _ in 0..<200 {
                #expect(!world.randomExit(from: arm).isPlayer)
            }
        }
    }
}

@Suite("AI traffic and determinism")
struct TrafficTests {
    @Test(arguments: [UInt64(1), 2, 3])
    func aiNeverCrashesAndKeepsSafeGaps(seed: UInt64) {
        var config = Config()
        config.freePlayDensity = 7
        var world = World(config: config, seed: seed, mode: .freePlay)
        let minimumArc = config.carLength + config.aiSafeGap * config.ringSpeed - 0.5
        var exits = 0
        for _ in 0..<(90 * World.stepRate) {
            world.step()
            for event in world.takeEvents() {
                if case .crash = event { Issue.record("AI crash at \(world.time) s") }
                if case .exited = event { exits += 1 }
            }
            let ring = world.vehicles.compactMap { vehicle -> Double? in
                if case let .ring(r) = vehicle.phase { return r.s }
                return nil
            }.sorted()
            for (index, s) in ring.enumerated() where ring.count > 1 {
                let next = ring[(index + 1) % ring.count]
                let arc = world.layout.ringDistance(from: s, to: next)
                #expect(arc >= minimumArc, "gap \(arc) at \(world.time) s")
            }
        }
        #expect(exits > 20)
        #expect(world.roadCount > 0)
    }

    @Test func aiFillsTheRingUpToTheTargetDensity() {
        var world = World(config: Config(), seed: 5, mode: .freePlay, prefill: false)
        var peak = 0
        for _ in 0..<(20 * World.stepRate) {
            world.step()
            peak = max(peak, world.roadCount)
            #expect(world.roadCount <= world.targetDensity)
        }
        #expect(peak >= world.targetDensity - 1)
    }

    /// Same seed and same taps give exactly the same world (FOUNDATION.md 6).
    @Test func sameSeedSameInputsSameResult() {
        func play(seed: UInt64) -> ([Vehicle], [GameEvent]) {
            var world = World(config: Config(), seed: seed)
            var events: [GameEvent] = []
            for step in 0..<(30 * World.stepRate) {
                if step % 83 == 0 {
                    world.tap(at: world.time + World.stepDuration * 0.3)
                }
                world.step()
                events += world.takeEvents()
            }
            return (world.vehicles, events)
        }
        let a = play(seed: 42)
        let b = play(seed: 42)
        #expect(a.0 == b.0)
        #expect(a.1 == b.1)
        #expect(a.1.contains { $0.crash != nil || $0.merge != nil })
        let c = play(seed: 43)
        #expect(a.0 != c.0)
    }
}
