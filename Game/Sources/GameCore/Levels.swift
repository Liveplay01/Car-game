/// How shifts get harder with the player's level (ROADMAP.md, M5). Every completed shift
/// is a level up; a lost one is played again, with a newly drawn car count.
///
/// The traffic values in `Config` are those of `hardLevel`, from where on it is properly
/// hard. Below it they are eased towards the `easy…` values of level 1; above it the tempo
/// keeps rising and the chase gets shorter, both up to a limit. The car count grows with
/// every level and varies from attempt to attempt.
extension Config {
    /// The car counts an attempt at `level` can draw.
    public func shiftCarsRange(atLevel level: Int) -> ClosedRange<Int> {
        let level = max(1, level)
        let typical = min(Double(levelOneCars) + carsPerLevel * Double(level - 1), Double(maxShiftCars))
        let middle = Int(typical.rounded())
        return max(1, middle - shiftCarsSpread)...max(1, min(maxShiftCars, middle + shiftCarsSpread))
    }

    /// The config of one shift at `level`. The seed draws the car count, so a shift
    /// replayed with the same seed has the same number of cars.
    public func forLevel(_ level: Int, seed: UInt64) -> Config {
        let level = max(1, level)
        var config = self
        // 0 at level 1, 1 from `hardLevel` on.
        let ease = hardLevel > 1 ? min(Double(level - 1) / Double(hardLevel - 1), 1) : 1
        func mix(_ easy: Double, _ hard: Double) -> Double { easy + (hard - easy) * ease }
        func mix(_ easy: Int, _ hard: Int) -> Int { Int(mix(Double(easy), Double(hard)).rounded()) }
        config.densityStart = mix(easyDensityStart, densityStart)
        config.densityEnd = mix(easyDensityEnd, densityEnd)
        config.tempoStart = mix(easyTempoStart, tempoStart)
        config.tempoEnd = mix(easyTempoEnd, tempoEnd)
        config.rushHourTempo = mix(easyRushHourTempo, rushHourTempo)
        config.aiSafeGap = mix(easyAiSafeGap, aiSafeGap)
        config.criminalTime = mix(easyCriminalTime, criminalTime)
        config.policeShare = mix(easyPoliceShare, policeShare)

        let beyond = Double(max(0, level - max(1, hardLevel)))
        let faster = min(beyond * tempoPerLevel, maxLevelTempoBonus)
        config.tempoStart += faster
        config.tempoEnd += faster
        config.rushHourTempo += faster
        config.criminalTime = max(min(minCriminalTime, config.criminalTime), config.criminalTime - beyond * criminalTimePerLevel)

        // Past `lateLevel` the ring fills up a little more with every level (M7).
        let late = Double(max(0, level - max(1, lateLevel)))
        let denser = min(Int(late * lateDensityPerLevel), maxLateDensityBonus)
        config.densityStart += denser
        config.densityEnd += denser
        config.aiSafeGap = max(min(minAiSafeGap, config.aiSafeGap), config.aiSafeGap - late * lateAiGapPerLevel)
        config.aiLapChance = min(maxAiLapChance, late * lateLapChancePerLevel)
        config.aiQueuePerArm = min(maxAiQueuePerArm, aiQueuePerArm + Int(late) / max(1, lateLevelsPerQueueCar))
        if level >= longerStayLevel, exitArmsAhead.upperBound >= 2 {
            config.exitArmsAhead = max(2, exitArmsAhead.lowerBound)...exitArmsAhead.upperBound
        }
        let quicker = max(minSpawnDelayFactor, 1 - late * lateSpawnFasterPerLevel)
        config.aiSpawnDelay = (aiSpawnDelay.lowerBound * quicker)...(aiSpawnDelay.upperBound * quicker)

        config.shiftPay = shiftPayBase + shiftPayPerLevel * level
        config.level = level

        var random = SeededRandom(seed: seed ^ 0x3C6E_F372_FE94_F82B)
        config.shiftCars = random.int(in: shiftCarsRange(atLevel: level))
        return config
    }
}
