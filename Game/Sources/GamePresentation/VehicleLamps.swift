import Foundation
import GameCore

/// The lights of the traffic (Leo, 26.09.2026: the world is the interface). Brake lights
/// show what the drivers do — the queue standing at its line, a bot braking up to its line,
/// a jam forming behind a wreck — and the headlights flash once when a tap is held for the
/// car rolling up, so an early tap is seen to be taken instead of swallowed.
///
/// `GameCore` says who brakes (`World.isBraking`); this only smooths it, so a lamp comes on
/// quickly and fades a little slower, and never flickers from one step to the next.
public struct VehicleLamps: Sendable, Equatable {
    private var brakes: [Int: Double] = [:]
    /// The car a held tap was taken for, and how long ago.
    private var flash: (vehicle: Int, age: Double)?
    private var hadHeldTap = false

    /// Seconds a brake light needs to come on, and to go out.
    static let onTime = 0.05
    static let offTime = 0.14
    /// The headlight flash: two short blinks.
    static let flashDuration = 0.3

    public init() {}

    public static func == (a: VehicleLamps, b: VehicleLamps) -> Bool {
        a.brakes == b.brakes && a.flash?.vehicle == b.flash?.vehicle && a.flash?.age == b.flash?.age && a.hadHeldTap == b.hadHeldTap
    }

    /// 0…1 for the brake lights of a vehicle.
    public func brake(_ id: Int) -> Double { brakes[id] ?? 0 }

    /// 0…1 for the headlights of a vehicle: only the car a held tap was taken for, briefly.
    public func headlights(_ id: Int) -> Double {
        guard let flash, flash.vehicle == id else { return 0 }
        return Self.blink(flash.age)
    }

    /// Two quick blinks, each rising and falling softly.
    static func blink(_ age: Double) -> Double {
        func pulse(_ center: Double) -> Double {
            let x = (age - center) / 0.055
            return abs(x) < 1 ? 0.5 + 0.5 * cos(.pi * x) : 0
        }
        return max(pulse(0.055), pulse(0.19))
    }

    /// Follows the world one frame on.
    public mutating func update(world: World, delta: Double) {
        var next: [Int: Double] = [:]
        for vehicle in world.vehicles where !vehicle.isCrashed {
            let target = world.isBraking(vehicle) ? 1.0 : 0
            let current = brakes[vehicle.id] ?? target
            let time = target > current ? Self.onTime : Self.offTime
            next[vehicle.id] = current + (target - current) * min(1, delta / time)
        }
        brakes = next
        // A tap was just held: the car it goes to flashes its lights.
        let held = world.queue.heldTap != nil
        if held, !hadHeldTap, let front = world.queue.vehicles.first {
            flash = (front, 0)
        } else if let current = flash {
            flash = current.age + delta < Self.flashDuration ? (current.vehicle, current.age + delta) : nil
        }
        hadHeldTap = held
    }
}
