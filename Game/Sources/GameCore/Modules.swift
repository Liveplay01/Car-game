import Foundation

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
    /// Abschlepp-Depot (IDEA.md; ROADMAP.md, M9): wrecks in its zone are towed away
    /// `towSpeedup` faster, so the ring flows again sooner. It earns nothing and slows nobody.
    case towDepot
}

extension Config {
    /// Price of a module. It does not rise: modules are swapped, not stacked.
    public func price(of module: RoadModule) -> Int {
        switch module {
        case .tollBooth: tollBoothCost
        case .speedCamera: speedCameraCost
        case .towDepot: towDepotCost
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
        // Wide, and no speed limit: the tow truck works beside the traffic.
        case .towDepot: (towZoneArc, 1)
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

    /// A module's slow zone lies at `s` or within `jamLookahead` seconds of ring ahead of it:
    /// a car out of the flow there is queueing for a toll booth or a camera, not jammed.
    /// Roadworks do not count: they are a short event, and a jam there must still dissolve.
    func isModuleQueue(at s: Double) -> Bool {
        let slow = config.modules.filter { config.zone(of: $0.value).speedFactor < 1 }
        guard !slow.isEmpty else { return false }
        let reach = config.jamLookahead * ringSpeed
        return slow.contains { slot, module in
            let arc = config.zone(of: module).arc
            let start = Angle.wrap(layout.moduleRingS(slot, of: config.moduleSlotCount) - arc / 2, period: layout.ring.length)
            // From `reach` before the zone to its end.
            return layout.ringDistance(from: Angle.wrap(start - reach, period: layout.ring.length), to: s) <= reach + arc
        }
    }

    /// How fast traffic may drive at this point of the ring. Ring speed where no module
    /// holds it back.
    public func speedLimit(atRingS s: Double) -> Double {
        var limit = ringSpeed
        // Roadworks (M8): a slow stretch while the event lasts.
        if let start = roadworksRingS {
            let into = layout.ringDistance(from: start, to: s)
            if into <= config.roadworksArc {
                limit = min(limit, ringSpeed * config.roadworksSpeedFactor)
            }
        }
        guard !config.modules.isEmpty else { return limit }
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

    /// The tow depot whose zone covers a point on or near the ring, if there is one (M9).
    public func towDepot(covering point: Vec2) -> Int? {
        let radius = layout.ringRadius
        let distance = point.length
        guard abs(distance - radius) <= config.laneWidth * 2 else { return nil }
        let s = Angle.wrap(atan2(point.y, point.x), period: Angle.tau) * radius
        for (slot, module) in config.modules.sorted(by: { $0.key < $1.key }) where module == .towDepot {
            let centre = layout.moduleRingS(slot, of: config.moduleSlotCount)
            let into = layout.ringDistance(from: Angle.wrap(centre - config.towZoneArc / 2, period: layout.ring.length), to: s)
            if into <= config.towZoneArc { return slot }
        }
        return nil
    }

    /// How fast a wreck at `point` ages towards being cleared: 1, or faster by the depot.
    func wreckClearRate(at point: Vec2) -> Double {
        guard config.modules.values.contains(.towDepot), towDepot(covering: point) != nil else { return 1 }
        return 1 / max(0.1, 1 - config.towSpeedup)
    }

    /// Money a module pays for one vehicle passing it, or 0 if this one pays nothing.
    /// High Alert does not multiply it (Leo, 24.09.2026): only shift pay, transporters and
    /// shield bonuses count triple (`Config.forDuty`).
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
        case .towDepot:
            return 0
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
