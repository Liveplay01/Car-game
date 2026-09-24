import Foundation
import GameCore

/// Builds the game scene, roads and vehicles, as render items in world space.
public enum SceneBuilder {
    /// The roundabout: ground, asphalt, kerbs, markings and the player's stop line.
    ///
    /// Drawn from the ground up, like a real junction: the arms and the ring make one
    /// surface, a kerb line marks where the asphalt ends, the island sits inside the ring,
    /// and the markings go on top — a dashed centre line per arm and a give-way line where
    /// each arm meets the ring (FOUNDATION.md 3).
    public static func addRoad(_ layout: RoundaboutLayout, config: Config, to list: inout RenderList) {
        let lane = layout.laneWidth
        let reach = 700.0
        var id = RenderID.road

        func add(_ primitive: Primitive, _ color: ColorToken, _ opacity: Double = 1) {
            list.add(primitive, color: color, opacity: opacity, space: .world, id: id)
            id += 1
        }

        // Kerbs first: every piece of asphalt is drawn a little wider in the kerb colour.
        for arm in layout.arms {
            add(.roundedRect(center: arm.outward * (reach / 2), size: Vec2(reach, lane * 2 + 7), cornerRadius: 0, rotation: arm.angle), .kerb)
        }
        add(.arc(center: .zero, radius: layout.ringRadius, thickness: lane + 7, startAngle: 0, endAngle: Angle.tau), .kerb)

        // The asphalt.
        for arm in layout.arms {
            add(.roundedRect(center: arm.outward * (reach / 2), size: Vec2(reach, lane * 2), cornerRadius: 0, rotation: arm.angle), .surface)
        }
        add(.arc(center: .zero, radius: layout.ringRadius, thickness: lane, startAngle: 0, endAngle: Angle.tau), .surface)

        // The island: kerb ring, then the raised middle.
        add(.circle(center: .zero, radius: layout.ringRadius - lane / 2 + 3.5), .kerb)
        add(.circle(center: .zero, radius: layout.ringRadius - lane / 2), .island)
        add(.arc(center: .zero, radius: layout.ringRadius - lane / 2 - 14, thickness: 1.5, startAngle: 0, endAngle: Angle.tau), .marking, 0.25)

        // Markings: a dashed centre line down each arm, from the ring outwards.
        for arm in layout.arms {
            let from = layout.ringRadius + lane / 2 + 10
            var distance = from
            while distance < reach / 2 {
                let next = min(distance + 16, reach / 2)
                add(.line(from: arm.outward * distance, to: arm.outward * next, thickness: 1.5), .marking, 0.8)
                distance = next + 12
            }
        }

        // Give way: short dashes across the mouth of every arm, where it meets the ring.
        for arm in layout.arms {
            let entry = layout.entry(arm)
            let mouth = entry.pose(at: entry.length - config.carLength * 1.5)
            let across = Vec2(angle: mouth.heading).right * (lane / 2 - 3)
            for step in stride(from: -1.0, through: 1.0, by: 0.66) {
                let at = mouth.position + across * step
                add(.roundedRect(center: at, size: Vec2(3, 4), cornerRadius: 1, rotation: mouth.heading), .marking, 0.7)
            }
        }

        // The lane the player sends cars from. No stop line across it: it would sit right
        // under the front car and cover the markings that show the lane.
        let stop = layout.stopPose(layout.player)
        let forward = Vec2(angle: stop.heading)
        let front = stop.position + forward * (config.carLength / 2 + 4)
        let across = forward.right * (lane / 2 - 2)
        add(.line(
            from: stop.position - forward * (config.queueSpacing * Double(config.queueVisible)) + across,
            to: front + across,
            thickness: 2
        ), .accent, 0.22)

        addModules(layout, config: config, id: &id, to: &list)
    }

    /// Toll booths and speed cameras on the ring. Each one paints the stretch it slows down,
    /// so the player can see where the traffic will bunch up before it does (FOUNDATION.md 2.9).
    private static func addModules(_ layout: RoundaboutLayout, config: Config, id: inout Int, to list: inout RenderList) {
        let lane = layout.laneWidth
        func add(_ primitive: Primitive, _ color: ColorToken, _ opacity: Double = 1) {
            list.add(primitive, color: color, opacity: opacity, space: .world, id: id)
            id += 1
        }
        for (slot, module) in config.modules.sorted(by: { $0.key < $1.key }) {
            let s = layout.moduleRingS(slot, of: config.moduleSlotCount)
            let zone = config.zone(of: module)
            let radius = layout.ringRadius
            // The stretch where traffic is held back, darker than the asphalt around it.
            let start = (s - zone.arc / 2) / radius
            add(.arc(center: .zero, radius: radius, thickness: lane, startAngle: start, endAngle: start + zone.arc / radius), .kerb, 0.5)

            let pose = layout.ring.pose(at: s)
            let across = Vec2(angle: pose.heading).right * (lane / 2)
            switch module {
            case .tollBooth:
                // A barrier across the lane, on two posts.
                add(.line(from: pose.position - across, to: pose.position + across, thickness: 2), .hazard, 0.85)
                for side in [-1.0, 1.0] {
                    add(.roundedRect(center: pose.position + across * side, size: Vec2(5, 5), cornerRadius: 1.5, rotation: pose.heading), .surface)
                    add(.roundedRect(center: pose.position + across * side, size: Vec2(3.5, 3.5), cornerRadius: 1, rotation: pose.heading), .hazard, 0.9)
                }
            case .speedCamera:
                // A short trigger line, and the camera itself on the island side.
                add(.line(from: pose.position - across * 0.9, to: pose.position + across * 0.9, thickness: 1.5), .marking, 0.8)
                let mast = pose.position - across * 1.25
                add(.roundedRect(center: mast, size: Vec2(7, 5), cornerRadius: 1.5, rotation: pose.heading), .surface)
                add(.circle(center: mast, radius: 1.6), .lightBlue, 0.9)
            case .towDepot:
                // A small fenced yard outside the ring, a parked wreck and the tow truck.
                let yard = towYard(slot, layout: layout, config: config)
                add(.roundedRect(center: yard, size: Vec2(34, 26), cornerRadius: 4, rotation: pose.heading), .kerb)
                add(.roundedRect(center: yard, size: Vec2(30, 22), cornerRadius: 3, rotation: pose.heading), .surface)
                add(.roundedRect(center: yard + Vec2(angle: pose.heading) * 7, size: Vec2(11, 7), cornerRadius: 2, rotation: pose.heading + 0.3), .vehicleCarGraphite, 0.8)
                add(.roundedRect(center: yard - Vec2(angle: pose.heading) * 7, size: Vec2(12, 7), cornerRadius: 2, rotation: pose.heading), .hazard, 0.9)
            }
        }
    }

    /// Accessibility labels (M11): "POLICE", "CRIMINAL", "SECURED" beside the special
    /// vehicles, in their own colour, small and in screen space so they stay readable.
    public static func addLabels(of world: World, alpha: Double, to list: inout RenderList) {
        for vehicle in world.vehicles where !vehicle.isCrashed {
            guard let label = Strings.HUD.label(vehicle.type) else { continue }
            let pose = interpolatedPose(vehicle, alpha: alpha)
            let color: ColorToken = switch vehicle.type {
            case .police: .lightBlue
            case .pickup: .vehicleCriminal
            default: .vehicleCargo
            }
            list.add(.text(label, position: list.camera.toScreen(pose.position) + Vec2(0, -18), size: 9, alignment: .center, weight: .bold),
                     color: color, opacity: 0.95, space: .screen, id: RenderID.labels + vehicle.id % 1_000)
        }
    }

    /// Where a tow depot's yard sits: just outside the ring at its module slot.
    static func towYard(_ slot: Int, layout: RoundaboutLayout, config: Config) -> Vec2 {
        let pose = layout.ring.pose(at: layout.moduleRingS(slot, of: config.moduleSlotCount))
        return pose.position + pose.position.normalized * (layout.laneWidth / 2 + 24)
    }

    /// Tow trucks (M9): for every wreck a depot clears, a truck drives out of the yard to it
    /// and stays while it is taken away. Short, beside the traffic, never in front of a gap.
    public static func addTowTrucks(of world: World, to list: inout RenderList) {
        guard world.config.modules.values.contains(.towDepot) else { return }
        let duration = world.config.crashDuration
        for wreck in world.vehicles {
            guard case let .crashed(state) = wreck.phase, let slot = world.towDepot(covering: wreck.position) else { continue }
            let yard = towYard(slot, layout: world.layout, config: world.config)
            let out = Ease.outCubic(min(1, state.elapsed / (duration * 0.5)))
            let target = wreck.position + wreck.position.normalized * (world.config.carWidth + 4)
            let at = yard + (target - yard) * out
            let heading = atan2(target.y - yard.y, target.x - yard.x)
            let id = RenderID.towTrucks + (wreck.id % 500) * 2
            list.add(.roundedRect(center: at, size: Vec2(16, 9), cornerRadius: 2, rotation: heading), color: .hazard, space: .world, id: id)
            list.add(.roundedRect(center: at + Vec2(angle: heading) * 5, size: Vec2(5, 8), cornerRadius: 1.5, rotation: heading), color: .surface, space: .world, id: id + 1)
        }
    }

    /// The skin a vehicle wears, if it wears one.
    static func look(_ vehicle: Vehicle, _ skins: [String]) -> Skins.Look? {
        switch vehicle.type {
        case .car: Skins.look(forVehicle: vehicle.id, skins: skins)
        case .sportsCar: vehicle.owner == .player ? Skins.look(forVehicle: vehicle.id, skins: skins) : nil
        case .police, .pickup, .transporter, .truck: nil
        }
    }

    /// A soft shadow under every car, so they sit on the road instead of floating over it.
    public static func addShadows(of world: World, alpha: Double, to list: inout RenderList) {
        for vehicle in world.vehicles where !vehicle.isCrashed {
            let pose = interpolatedPose(vehicle, alpha: alpha)
            list.add(
                .roundedRect(
                    center: pose.position - Vec2(0, 2.5),
                    size: Vec2(CarArt.length(of: vehicle.type, config: world.config) + 3, world.config.carWidth + 3),
                    cornerRadius: Metrics.vehicleCornerRadius + 2,
                    rotation: pose.heading
                ),
                color: .shadow, space: .world, id: RenderID.shadow(vehicle.id)
            )
        }
    }

    /// All vehicles on the road. Crashed ones are not drawn here: the crash effects draw
    /// them as wrecks. A police car's lights flash once it drives off, and on every police
    /// car, the queue included, while a criminal is on the run.
    public static func addVehicles(of world: World, alpha: Double, carSkins: [String] = [], finishTime: Double? = nil, springTime: Double? = nil, to list: inout RenderList) {
        let chase = world.criminal.vehicle != nil
        let lights = (world.time * 3).truncatingRemainder(dividingBy: 1)
        for vehicle in world.vehicles where !vehicle.isCrashed {
            var flashing = chase
            if case .queued = vehicle.phase {} else { flashing = true }
            CarArt.add(
                id: vehicle.id,
                type: vehicle.type,
                pose: interpolatedPose(vehicle, alpha: alpha),
                dents: vehicle.dents,
                lights: vehicle.type == .police && flashing ? lights : nil,
                // Skins go on every normal car on the road, the player own sports car too;
                // police, criminal, transporter and lorries keep their look (LOOT.md).
                skin: look(vehicle, carSkins)?.paint,
                stripe: look(vehicle, carSkins)?.stripe,
                finish: look(vehicle, carSkins)?.finish,
                finishTime: finishTime,
                springTime: springTime,
                config: world.config,
                to: &list
            )
        }
    }

    /// Pose between the last two simulation steps.
    public static func interpolatedPose(_ vehicle: Vehicle, alpha: Double) -> Path.Pose {
        Path.Pose(
            position: .lerp(vehicle.previousPosition, vehicle.position, alpha),
            heading: Angle.lerp(vehicle.previousHeading, vehicle.heading, alpha)
        )
    }
}
