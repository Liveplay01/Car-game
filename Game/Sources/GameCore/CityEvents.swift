/// City Events: at most one per shift, announced before it starts, and each one really
/// changes the traffic (IDEA.md, "City Events"; ROADMAP.md, M8). They stay inside the three
/// difficulty axes — tempo, density, gaps — and never change a rule.
public enum CityEvent: String, Sendable, Equatable, CaseIterable, Codable {
    /// A stretch of the ring drives slower, like a toll zone without the toll.
    case roadworks
    /// One AI arm is closed; the others bring its traffic.
    case roadClosure
    /// A concert lets out: more cars, coming quicker.
    case concert
    /// A convoy with an escort: more cars, but they keep long gaps to the rest.
    case vipConvoy
    /// A police operation: more police cars wait in your queue.
    case policeOperation
}

extension Config {
    /// The event of one shift at `level`, or nil. Drawn from the seed like the weather.
    public func drawCityEvent(level: Int, seed: UInt64) -> CityEvent? {
        guard level >= cityEventLevel else { return nil }
        var random = SeededRandom(seed: seed ^ 0x0C17_E7E4_75A1_B0B5)
        guard random.unit() < cityEventChance else { return nil }
        // A closure needs at least three AI arms, so two stay open.
        let options = CityEvent.allCases.filter { $0 != .roadClosure || builtArmSlots.count >= 4 }
        return random.pick(options)
    }

    /// This config with `event` in play. Where it happens is drawn from the seed.
    public func forCityEvent(_ event: CityEvent?, seed: UInt64) -> Config {
        var config = self
        config.cityEvent = event
        guard let event else { return config }
        var random = SeededRandom(seed: seed ^ 0x5EED_0F0C_17E4_A7E5)
        switch event {
        case .roadworks:
            config.roadworksAt = random.double(in: 0...1)
        case .roadClosure:
            let aiSlots = Array(builtArmSlots.dropFirst())
            config.closedArmSlot = aiSlots.isEmpty ? nil : random.pick(aiSlots)
        case .concert:
            config.densityStart += concertDensityBonus
            config.densityEnd += concertDensityBonus
            config.aiSpawnDelay = (aiSpawnDelay.lowerBound * concertSpawnFactor)...(aiSpawnDelay.upperBound * concertSpawnFactor)
        case .vipConvoy:
            config.densityStart += 1
            config.densityEnd += 1
            config.aiSafeGap *= vipGapFactor
        case .policeOperation:
            config.policeShare = min(1, policeShare + policeOperationShare)
        }
        return config
    }
}

extension World {
    /// The AI arms cars can come from: all of them, unless a road closure shuts one.
    public var openAIArms: [Arm] {
        guard let closed = config.closedArmSlot else { return layout.aiArms }
        return layout.aiArms.filter { $0.slot != closed }
    }

    /// Where the roadworks sit on the ring (ring distance of their start), if there are any.
    public var roadworksRingS: Double? {
        guard config.cityEvent == .roadworks else { return nil }
        return config.roadworksAt * layout.ring.length
    }
}
