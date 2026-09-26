import Testing
@testable import GameCore

@Suite("Unlimited: an endless shift")
struct UnlimitedTests {
    func endless(_ adjust: (inout Config) -> Void = { _ in }) -> World {
        quietShift { config in
            config.endless = true
            config.shiftCars = 3
            adjust(&config)
        }
    }

    @Test func itNeverRunsOutOfCars() {
        var world = endless()
        #expect(world.carsLeft == nil)
        for _ in 0..<6 {
            world.mergeNextCar()
        }
        // Twice the shift's cars, and still running: no rush hour, no completion.
        #expect(world.shift.carsSent == 6)
        #expect(world.shift.acceptsTaps)
        #expect(world.shift.rushHourSince == nil)
        #expect(world.shift.outcome == nil)
    }

    @Test func aLostRunPaysForEveryCarSent() {
        var world = endless()
        world.mergeNextCar()
        world.mergeNextCar()
        let events = world.crashNextCar()
        let result = events.compactMap { event -> ShiftResult? in
            if case let .shiftEnded(result) = event { return result }
            return nil
        }.first
        #expect(result?.outcome == .struckOut)
        #expect(result?.carsSent == 3)
        #expect(result?.money == 3 * world.config.endlessPayPerCar)
    }

    @Test func theTrafficKeepsGettingHarderAfterTheRamp() {
        var config = Config()
        config.endless = true
        let ramp = config.rampSeconds
        let atRamp = ShiftCurves.tempo(at: ramp, rushHourSince: nil, config: config)
        let later = ShiftCurves.tempo(at: ramp + 120, rushHourSince: nil, config: config)
        #expect(later > atRamp)
        #expect(ShiftCurves.tempo(at: ramp + 100_000, rushHourSince: nil, config: config) == config.endlessMaxTempo)
        #expect(ShiftCurves.density(at: ramp + 60, rushHour: false, config: config) > ShiftCurves.density(at: ramp, rushHour: false, config: config))
        // A normal shift stays where its ramp ends.
        config.endless = false
        #expect(ShiftCurves.tempo(at: ramp + 120, rushHourSince: nil, config: config) == config.tempoEnd)
    }
}
