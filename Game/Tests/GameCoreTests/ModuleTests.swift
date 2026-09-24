import Testing
@testable import GameCore

extension GameEvent {
    var modulePaid: (module: RoadModule, slot: Int, amount: Int)? {
        if case let .modulePaid(module, slot, amount, _, _) = self {
            return (module, slot, amount)
        }
        return nil
    }
}

/// A quiet ring with one module in slot 0 and nothing else going on.
func moduleShift(_ module: RoadModule, _ adjust: (inout Config) -> Void = { _ in }) -> World {
    quietShift {
        $0.modules = [0: module]
        $0.criminalFirst = 1000...1000
        $0.transporterFirst = 1000...1000
        adjust(&$0)
    }
}

@Suite("Ring modules")
struct ModuleTests {
    /// Puts one vehicle on the ring just before the module and lets it drive past.
    func drivePast(_ world: inout World, type: VehicleType) -> [GameEvent] {
        let s = world.layout.moduleRingS(0, of: world.config.moduleSlotCount)
        let id = world.spawnRingCar(at: s - 40, exitArm: world.layout.aiArms[0])
        world.vehicles[world.vehicles.firstIndex { $0.id == id }!].type = type
        return world.run(steps: 2 * World.stepRate) { current in
            current.vehicles.first { $0.id == id }.map { !$0.isCollidable } ?? true
        }
    }

    @Test func aTollBoothChargesLorriesAndWavesCarsThrough() {
        var world = moduleShift(.tollBooth)
        let paidByTruck = drivePast(&world, type: .truck).compactMap(\.modulePaid)
        #expect(paidByTruck.count == 1)
        #expect(paidByTruck[0].module == .tollBooth)
        #expect(paidByTruck[0].amount == world.config.tollPerTruck)
        #expect(world.score.money == world.config.tollPerTruck)

        let paidByCar = drivePast(&world, type: .car).compactMap(\.modulePaid)
        #expect(paidByCar.isEmpty)
        #expect(world.score.money == world.config.tollPerTruck)
    }

    @Test func aSpeedCameraOnlyEarnsAboveTheLimit() {
        var slow = moduleShift(.speedCamera)
        #expect(drivePast(&slow, type: .car).compactMap(\.modulePaid).isEmpty)

        // Set the tempo above the limit through the config, not by mutating `ringSpeed`
        // after the world exists: every step recomputes it from the shift curve
        // (`applyShiftCurves`), which would silently undo a one-off override.
        var fast = moduleShift(.speedCamera) {
            $0.tempoStart = $0.cameraLimitFactor + 0.2
            $0.tempoEnd = $0.cameraLimitFactor + 0.2
        }
        let fines = drivePast(&fast, type: .car).compactMap(\.modulePaid)
        #expect(fines.count == 1)
        #expect(fines[0].amount == fast.config.cameraFine)
    }

    @Test func aModuleHoldsTrafficBackInItsZoneOnly() {
        let world = moduleShift(.tollBooth)
        let s = world.layout.moduleRingS(0, of: world.config.moduleSlotCount)
        let zone = world.config.zone(of: .tollBooth)
        #expect(world.speedLimit(atRingS: s) < world.ringSpeed)
        #expect(world.speedLimit(atRingS: s - zone.arc) == world.ringSpeed)
        // And a ring with nothing built on it is untouched everywhere.
        let plain = quietShift()
        #expect(plain.speedLimit(atRingS: s) == plain.ringSpeed)
    }

    @Test func trafficSlowsDownInsideTheZone() {
        var world = moduleShift(.tollBooth) { $0.densityStart = 8; $0.densityEnd = 8 }
        _ = world.run(steps: 8 * World.stepRate)
        let s = world.layout.moduleRingS(0, of: world.config.moduleSlotCount)
        let inZone = world.vehicles.filter { vehicle in
            guard case let .ring(r) = vehicle.phase else { return false }
            return abs(world.layout.ringDistance(from: s, to: r.s)) < 20
        }
        // Whoever is in there drives slower than the ring around them.
        #expect(inZone.allSatisfy { vehicle in
            guard case let .ring(r) = vehicle.phase, let speed = r.drive.speed else { return true }
            return speed <= world.ringSpeed
        })
    }

    @Test func lorriesShowUpInNormalTraffic() {
        var world = World(config: Config(), seed: 3, mode: .shift)
        _ = world.run(steps: 20 * World.stepRate)
        let types = Set(world.vehicles.filter { $0.owner == .ai }.map(\.type))
        #expect(types.contains(.truck))
        // And a lorry takes more room on the road than a car.
        #expect(world.length(of: .truck) > world.length(of: .car))
    }

    @Test func aTakenSlotIsSwappedNotStacked() {
        var career = Career(money: 100_000)
        let config = Config()
        let built = career.build(.tollBooth, inSlot: 2, config: config)
        #expect(built)
        #expect(career.money == 100_000 - config.price(of: .tollBooth))
        #expect(career.modules == [2: .tollBooth])

        let swapped = career.build(.speedCamera, inSlot: 2, config: config)
        #expect(swapped)
        #expect(career.modules == [2: .speedCamera])
        #expect(career.money == 100_000 - config.price(of: .tollBooth) - config.price(of: .speedCamera))

        // Without the money nothing changes, and a slot that does not exist is refused.
        var broke = Career(money: 10)
        let tooPoor = broke.build(.tollBooth, inSlot: 0, config: config)
        #expect(!tooPoor)
        #expect(broke.modules.isEmpty)
        let noSuchSlot = career.build(.tollBooth, inSlot: config.moduleSlotCount, config: config)
        #expect(!noSuchSlot)
    }

    @Test func whatIsBuiltReachesTheShift() {
        var career = Career(money: 100_000)
        let base = Config()
        _ = career.build(.tollBooth, inSlot: 1, config: base)
        #expect(career.config(from: base, seed: 1).modules == [1: .tollBooth])
    }
}

/// Leo (24.09.2026): toll 10 per lorry, camera 5 per flash, and both earn at most one
/// minute per shift; they stay on the ring afterwards.
@Test func modulesOnlyEarnInTheFirstMinuteOfAShift() {
    var config = Config()
    #expect(config.tollPerTruck == 10 && config.cameraFine == 5)
    config.modules = [0: .tollBooth]
    config.truckChance = 1
    var world = World(config: config, seed: 5, mode: .shift, startsOnFirstTap: true)
    world.tap(at: world.time)
    var early = 0
    var late = 0
    for _ in 0..<(90 * World.stepRate) {
        world.step()
        for event in world.takeEvents() {
            if case let .modulePaid(_, _, amount, _, _) = event {
                if world.shiftTime(world.time) < config.moduleEarningSeconds { early += amount } else { late += amount }
            }
        }
        if world.shift.outcome != nil { break }
    }
    #expect(early > 0)
    #expect(late == 0)
    #expect(world.config.modules[0] == .tollBooth)
}
