import Testing
@testable import GameCore

@Suite("Weather and city events (M8)")
struct WeatherTests {
    let config = Config()

    @Test func earlyLevelsAreAlwaysClear() {
        for seed in 0..<200 as Range<UInt64> {
            #expect(config.drawWeather(level: 3, seed: seed) == .clear)
        }
    }

    @Test func badWeatherGetsLikelierAndOnlyComesWhenItsLevelIsReached() {
        func share(level: Int) -> Double {
            let draws = (0..<600 as Range<UInt64>).map { config.drawWeather(level: level, seed: $0) }
            for weather in draws { #expect(config.firstLevel(of: weather) <= level) }
            return Double(draws.count(where: { $0 != .clear })) / Double(draws.count)
        }
        #expect(share(level: 8) < share(level: 20))
        #expect(share(level: 40) <= config.maxBadWeatherChance + 0.08)
    }

    @Test func theSameSeedHasTheSameSky() {
        #expect(config.drawWeather(level: 30, seed: 9) == config.drawWeather(level: 30, seed: 9))
    }

    @Test func weatherMakesTyresAndDriversWorseButNotTheTiming() {
        let storm = config.forWeather(.storm)
        #expect(storm.weather == .storm)
        #expect(storm.tireGripBrake < config.tireGripBrake)
        #expect(storm.driverReaction.lowerBound > config.driverReaction.lowerBound)
        #expect(storm.driverBrake < config.driverBrake)
        #expect(storm.densityEnd > config.densityEnd)
        #expect(storm.aiSafeGap < config.aiSafeGap)
        // The tap's timing never changes.
        #expect(storm.mergeDuration == config.mergeDuration)
        #expect(storm.ringSpeed == config.ringSpeed)
        #expect(storm.tightFitSeconds == config.tightFitSeconds)
        #expect(config.forWeather(.clear).tireGripBrake == config.tireGripBrake)
    }

    @Test func noEventsBeforeTheirLevel() {
        for seed in 0..<100 as Range<UInt64> {
            #expect(config.drawCityEvent(level: 2, seed: seed) == nil)
        }
    }

    @Test func aRoadClosureShutsOneAIArm() {
        let closed = config.forCityEvent(.roadClosure, seed: 3)
        let world = World(config: closed, seed: 3, mode: .shift, prefill: false)
        #expect(world.openAIArms.count == world.layout.aiArms.count - 1)
        #expect(!world.openAIArms.contains { $0.slot == closed.closedArmSlot })
    }

    @Test func roadworksSlowTheirStretch() {
        var roadworks = config.forCityEvent(.roadworks, seed: 5)
        roadworks.roadworksAt = 0.25
        let world = World(config: roadworks, seed: 5, mode: .shift, prefill: false)
        let start = try! #require(world.roadworksRingS)
        #expect(world.speedLimit(atRingS: start + 10) < world.ringSpeed)
        #expect(world.speedLimit(atRingS: start - 30) == world.ringSpeed)
    }

    @Test func aPoliceOperationBringsMorePolice() {
        #expect(config.forCityEvent(.policeOperation, seed: 1).policeShare > config.policeShare)
    }
}
