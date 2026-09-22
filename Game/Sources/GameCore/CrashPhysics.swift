import Foundation

/// A car as a rigid body in the plane, for crashes only. Live traffic follows its paths;
/// from the moment of a crash, physics takes over.
public struct RigidBody: Sendable, Equatable {
    public var position: Vec2
    public var velocity: Vec2
    public var heading: Double
    /// Radians per second, counter-clockwise.
    public var angularVelocity: Double
    public var mass: Double
    public var inertia: Double

    public init(position: Vec2, velocity: Vec2, heading: Double, angularVelocity: Double, mass: Double, inertia: Double) {
        self.position = position
        self.velocity = velocity
        self.heading = heading
        self.angularVelocity = angularVelocity
        self.mass = mass
        self.inertia = inertia
    }

    /// Velocity of a point of the body (world position).
    public func velocity(at point: Vec2) -> Vec2 {
        velocity + (point - position).left * angularVelocity
    }

    public var kineticEnergy: Double {
        0.5 * mass * velocity.lengthSquared + 0.5 * inertia * angularVelocity * angularVelocity
    }
}

/// Real crash physics, simple enough to run in every step (FOUNDATION.md 2.6).
///
/// 1. The impact is an impulse at the contact point: momentum is conserved, `restitution`
///    of the closing speed bounces back (the rest goes into the crumple zones), and
///    Coulomb friction acts along the contact. A hit off the centre of mass makes a car spin.
/// 2. Afterwards the wrecks skid: each of the four tyres rubs on the road with Coulomb
///    friction (braking along the car, cornering grip across it). So a car sliding fast keeps
///    spinning for a while and only settles as it slows down, like a real one.
public enum CrashPhysics {
    /// Resolves the impact of `a` and `b` touching at `point`. `normal` points from `b` to `a`.
    /// Returns the closing speed along the normal (0 if they were already separating).
    @discardableResult
    public static func collide(
        _ a: inout RigidBody,
        _ b: inout RigidBody,
        at point: Vec2,
        normal n: Vec2,
        restitution: Double,
        friction: Double
    ) -> Double {
        let ra = point - a.position
        let rb = point - b.position
        let relative = a.velocity(at: point) - b.velocity(at: point)
        let closing = relative.dot(n)
        guard closing < 0 else { return 0 }

        func effectiveMass(_ direction: Vec2) -> Double {
            let raD = ra.cross(direction)
            let rbD = rb.cross(direction)
            return 1 / a.mass + 1 / b.mass + raD * raD / a.inertia + rbD * rbD / b.inertia
        }

        let normalImpulse = -(1 + restitution) * closing / effectiveMass(n)
        var impulse = n * normalImpulse
        let sliding = relative - n * closing
        if sliding.length > 1e-9 {
            let t = sliding.normalized
            let wanted = -relative.dot(t) / effectiveMass(t)
            let limit = friction * normalImpulse
            impulse += t * min(max(wanted, -limit), limit)
        }
        a.velocity += impulse / a.mass
        a.angularVelocity += ra.cross(impulse) / a.inertia
        b.velocity -= impulse / b.mass
        b.angularVelocity -= rb.cross(impulse) / b.inertia
        return -closing
    }

    /// One step of a skidding wreck: tyre friction at four wheels, then motion.
    public static func skid(_ body: inout RigidBody, config: Config, dt: Double) {
        let forward = Vec2(angle: body.heading)
        let side = forward.left
        let axle = config.carLength * 0.32
        let track = config.carWidth * 0.4
        let load = body.mass * config.gravity / 4
        var force = Vec2.zero
        var torque = 0.0
        for (along, across) in [(axle, track), (axle, -track), (-axle, track), (-axle, -track)] {
            let offset = forward * along + side * across
            let slip = body.velocity + offset.left * body.angularVelocity
            // Coulomb friction; below 2 wu/s it turns smooth, so a wreck comes to rest without jitter.
            let scale = load / max(slip.length, 2)
            let wheel = (forward * (config.tireGripBrake * slip.dot(forward)) + side * (config.tireGripSide * slip.dot(side))) * -scale
            force += wheel
            torque += offset.cross(wheel)
        }
        body.velocity += force / body.mass * dt
        body.angularVelocity += torque / body.inertia * dt
        body.position += body.velocity * dt
        body.heading += body.angularVelocity * dt
    }

    /// Moment of inertia of a car-sized box of mass 1.
    static func inertia(config: Config) -> Double {
        (config.carLength * config.carLength + config.carWidth * config.carWidth) / 12
    }
}

extension World {
    /// The car as a rigid body right now. Live cars: the motion of the last step. The
    /// criminal's pickup is heavier (`criminalMass`).
    func body(of vehicle: Vehicle) -> RigidBody {
        var velocity = (vehicle.position - vehicle.previousPosition) / Self.stepDuration
        var spin = Angle.delta(from: vehicle.previousHeading, to: vehicle.heading) / Self.stepDuration
        if case let .crashed(state) = vehicle.phase {
            velocity = state.velocity
            spin = state.spin
        }
        let mass = vehicle.type == .pickup ? config.criminalMass : (vehicle.type == .transporter ? config.transporterMass : 1)
        return RigidBody(
            position: vehicle.position,
            velocity: velocity,
            heading: vehicle.heading,
            angularVelocity: spin,
            mass: mass,
            inertia: CrashPhysics.inertia(config: config) * mass
        )
    }

    /// Normal of a contact, pointing from the second capsule to the first.
    func contactNormal(_ contact: Collision.Contact, first: Vehicle, second: Vehicle) -> Vec2 {
        var normal = (contact.pointA - contact.pointB).normalized
        if normal == .zero {
            normal = (first.position - second.position).normalized
        }
        if normal == .zero {
            normal = Vec2(angle: first.heading).left
        }
        return normal
    }

    /// Where a car was hit, in its own frame: x forward, y to the left.
    func localPoint(_ point: Vec2, of vehicle: Vehicle) -> Vec2 {
        let d = point - vehicle.position
        let forward = Vec2(angle: vehicle.heading)
        return Vec2(d.dot(forward), d.dot(forward.left))
    }

    /// Wrecks that slide into each other bounce off. Live traffic running into a wreck is
    /// `World.resolveTrafficContacts`.
    mutating func resolveWreckContacts() {
        let wrecks = vehicles.indices.filter { vehicles[$0].isCrashed }
        guard wrecks.count > 1 else { return }
        for (k, i) in wrecks.enumerated() {
            for j in wrecks[(k + 1)...] {
                let contact = Collision.contact(hitbox(of: vehicles[i]), hitbox(of: vehicles[j]))
                guard contact.gap < 0 else { continue }
                let normal = contactNormal(contact, first: vehicles[i], second: vehicles[j])
                var a = body(of: vehicles[i])
                var b = body(of: vehicles[j])
                let impact = CrashPhysics.collide(&a, &b, at: contact.point, normal: normal, restitution: config.crashRestitution, friction: config.crashFriction)
                // Only a real knock leaves a mark; wrecks lying against each other do not.
                if impact > 15 {
                    addDent(i, at: contact.point, impact: impact)
                    addDent(j, at: contact.point, impact: impact)
                }
                // Push apart by the overlap, half each.
                vehicles[i].position += normal * (-contact.gap / 2)
                vehicles[j].position -= normal * (-contact.gap / 2)
                setWreckMotion(i, a)
                setWreckMotion(j, b)
            }
        }
    }

    private mutating func setWreckMotion(_ index: Int, _ body: RigidBody) {
        guard case var .crashed(state) = vehicles[index].phase else { return }
        state.velocity = body.velocity
        state.spin = body.angularVelocity
        vehicles[index].phase = .crashed(state)
    }
}
