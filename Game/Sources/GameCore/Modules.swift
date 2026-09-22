/// Modules on the ring: bought in the Street Builder, placed in one of a fixed number of
/// slots around the roundabout (FOUNDATION.md 2.9).
///
/// Every module earns money on its own, without a tap — and every one of them costs
/// something in return, because traffic that pays is traffic that does not flow. A toll
/// booth slows a whole section, a camera makes cars snatch at the brakes. More money means
/// a harder ring; that trade is the point (IDEA.md, "Wirtschaft schafft Gefahr").
public enum RoadModule: String, Sendable, Equatable, CaseIterable, Codable {
    /// Trucks pay a fee here, and everything slows down through its section.
    case tollBooth
    /// Pays a fine for every car over the limit, and cars brake hard right at it.
    case speedCamera
}

extension Config {
    /// Price of a module. It does not rise: modules are swapped, not stacked.
    public func price(of module: RoadModule) -> Int {
        switch module {
        case .tollBooth: tollBoothCost
        case .speedCamera: speedCameraCost
        }
    }

    /// The zone a module acts in: where on the ring, how long, and how fast traffic may go
    /// through it.
    public func zone(of module: RoadModule) -> (arc: Double, speedFactor: Double) {
        switch module {
        // Long and mild: a queue builds up behind it.
        case .tollBooth: (tollZoneArc, tollSpeedFactor)
        // Short and sharp: everyone snatches at the brakes, then goes again.
        case .speedCamera: (cameraZoneArc, cameraSpeedFactor)
        }
    }
}

extension RoundaboutLayout {
    /// Where a module slot sits on the ring. The slots are spread evenly and offset by half
    /// a step, so a module never lands exactly on an arm's mouth.
    public func moduleRingS(_ slot: Int, of count: Int) -> Double {
        let count = max(1, count)
        let angle = Angle.tau * (Double(slot) + 0.5) / Double(count)
        return Angle.wrap(angle, period: Angle.tau) * ringRadius
    }
}

extension World {
    /// The modules in play, by slot.
    public var modules: [Int: RoadModule] { config.modules }

    /// How fast traffic may drive at this point of the ring. Ring speed where no module
    /// holds it back.
    public func speedLimit(atRingS s: Double) -> Double {
        guard !config.modules.isEmpty else { return ringSpeed }
        var limit = ringSpeed
        for (slot, module) in config.modules {
            let zone = config.zone(of: module)
            let centre = layout.moduleRingS(slot, of: config.moduleSlotCount)
            // From just before the module to just after it.
            let ahead = layout.ringDistance(from: Angle.wrap(centre - zone.arc / 2, period: layout.ring.length), to: s)
            if ahead >= 0, ahead <= zone.arc {
                limit = min(limit, ringSpeed * zone.speedFactor)
            }
        }
        return limit
    }

    /// Money a module pays for one vehicle passing it, or 0 if this one pays nothing.
    /// High Alert multiplies it like every other payout (`Config.forDuty`).
    func fee(of module: RoadModule, for vehicle: Vehicle) -> Int {
        switch module {
        case .tollBooth:
            // Only trucks pay a toll; cars are waved through.
            return vehicle.type == .truck ? config.tollPerTruck : 0
        case .speedCamera:
            // A fine needs somebody going too fast: at the calm start of a shift the camera
            // earns nothing, in rush hour it earns with every car.
            guard ringSpeed > config.ringSpeed * config.cameraLimitFactor else { return 0 }
            return config.cameraFine
        }
    }

    /// Charges every module a vehicle drove past in this step. Called once per ring car and
    /// step, with the distance it covered.
    mutating func chargeModules(vehicleIndex i: Int, from s: Double, travelled: Double, now: Double) {
        guard !config.modules.isEmpty, travelled > 0 else { return }
        let vehicle = vehicles[i]
        // Wrecks and the criminal pay nothing; a pickup on the run does not stop at a booth.
        guard !vehicle.isCrashed, vehicle.type != .pickup else { return }
        for (slot, module) in config.modules {
            let centre = layout.moduleRingS(slot, of: config.moduleSlotCount)
            let ahead = layout.ringDistance(from: s, to: centre)
            guard ahead >= 0, ahead < travelled else { continue }
            let amount = fee(of: module, for: vehicle)
            guard amount > 0 else { continue }
            score.money += amount
            events.append(.modulePaid(
                module: module,
                slot: slot,
                amount: amount,
                point: layout.ring.pose(at: centre).position,
                time: now
            ))
        }
    }
}
