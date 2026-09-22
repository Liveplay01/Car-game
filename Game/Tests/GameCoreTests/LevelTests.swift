import Testing
@testable import GameCore

@Suite("Levels")
struct LevelTests {
    let config = Config()

    @Test func theCarCountGrowsWithTheLevelUpToALimit() {
        #expect(config.shiftCarsRange(atLevel: 1) == 8...12)
        #expect(config.shiftCarsRange(atLevel: 5) == 12...16)
        #expect(config.shiftCarsRange(atLevel: 10) == 18...22)
        #expect(config.shiftCarsRange(atLevel: 100).upperBound == config.maxShiftCars)
        // Below level 1 counts as level 1.
        #expect(config.shiftCarsRange(atLevel: 0) == config.shiftCarsRange(atLevel: 1))
    }

    @Test func everyAttemptDrawsItsOwnCountTheSameForTheSameSeed() {
        let counts = (UInt64(1)...60).map { config.forLevel(5, seed: $0).shiftCars }
        #expect(counts.allSatisfy { config.shiftCarsRange(atLevel: 5).contains($0) })
        #expect(Set(counts).count > 1)
        #expect(config.forLevel(5, seed: 7).shiftCars == config.forLevel(5, seed: 7).shiftCars)
    }

    @Test func levelOneIsEased() {
        let easy = config.forLevel(1, seed: 1)
        #expect(easy.densityStart == config.easyDensityStart)
        #expect(easy.densityEnd == config.easyDensityEnd)
        #expect(easy.tempoEnd == config.easyTempoEnd)
        #expect(easy.aiSafeGap == config.easyAiSafeGap)
        #expect(easy.criminalTime == config.easyCriminalTime)
        #expect(easy.policeShare == config.easyPoliceShare)
    }

    @Test func fromTheHardLevelOnTheConfigAppliesInFull() {
        let hard = config.forLevel(config.hardLevel, seed: 1)
        #expect(hard.densityStart == config.densityStart)
        #expect(hard.densityEnd == config.densityEnd)
        #expect(hard.tempoStart == config.tempoStart)
        #expect(hard.rushHourTempo == config.rushHourTempo)
        #expect(hard.aiSafeGap == config.aiSafeGap)
        #expect(hard.criminalTime == config.criminalTime)
        // In between it lies in between.
        let middle = config.forLevel(3, seed: 1)
        #expect(middle.tempoEnd > config.easyTempoEnd && middle.tempoEnd < config.tempoEnd)
    }

    @Test func beyondItFasterAndShorterChasesUpToALimit() {
        let later = config.forLevel(config.hardLevel + 4, seed: 1)
        #expect(abs(later.tempoEnd - (config.tempoEnd + 4 * config.tempoPerLevel)) < 1e-9)
        #expect(later.criminalTime < config.criminalTime)
        let far = config.forLevel(500, seed: 1)
        #expect(abs(far.tempoEnd - (config.tempoEnd + config.maxLevelTempoBonus)) < 1e-9)
        #expect(far.criminalTime == config.minCriminalTime)
    }

    @Test func aLevelShiftHasItsCarCount() {
        let level = config.forLevel(3, seed: 9)
        let world = World(config: level, seed: 9)
        #expect(world.carsLeft == level.shiftCars)
    }
}
