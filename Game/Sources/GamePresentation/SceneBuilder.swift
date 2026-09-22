import GameCore

/// Builds the game scene, roads and vehicles, as render items in world space.
public enum SceneBuilder {
    /// Arms, ring, centre island, lane lines and the player's stop line.
    public static func addRoad(_ layout: RoundaboutLayout, config: Config, to list: inout RenderList) {
        let lane = layout.laneWidth
        let reach = 700.0

        for arm in Arm.allCases {
            list.add(
                .roundedRect(center: arm.outward * (reach / 2), size: Vec2(reach, lane * 2), cornerRadius: 0, rotation: arm.angle),
                color: .surface, space: .world, id: RenderID.road + arm.rawValue
            )
        }
        list.add(
            .arc(center: .zero, radius: layout.ringRadius, thickness: lane, startAngle: 0, endAngle: Angle.tau),
            color: .surface, space: .world, id: RenderID.road + 10
        )
        list.add(
            .circle(center: .zero, radius: layout.ringRadius - lane / 2),
            color: .island, space: .world, id: RenderID.road + 11
        )
        // Centre line of each arm, from the ring's outer edge outwards.
        for arm in Arm.allCases {
            list.add(
                .line(from: arm.outward * (layout.ringRadius + lane / 2 + 8), to: arm.outward * reach, thickness: 1.5),
                color: .marking, space: .world, id: RenderID.road + 20 + arm.rawValue
            )
        }
        // Stop line in front of the player's queue.
        let stop = layout.stopPose(Arm.player)
        let forward = Vec2(angle: stop.heading)
        let front = stop.position + forward * (config.carLength / 2 + 4)
        let across = forward.right * (lane / 2 - 2)
        list.add(
            .line(from: front - across, to: front + across, thickness: 2),
            color: .marking, space: .world, id: RenderID.road + 30
        )
    }

    /// All vehicles on the road. Crashed ones are not drawn here: the crash effects draw
    /// them as wrecks. A police car's lights flash once it drives off, and on every police
    /// car, the queue included, while a criminal is on the run.
    public static func addVehicles(of world: World, alpha: Double, to list: inout RenderList) {
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
