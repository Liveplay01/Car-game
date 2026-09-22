import Testing
@testable import GameCore

@Suite("Crash physics")
struct CrashPhysicsTests {
    let config = Config()

    func car(_ x: Double, _ y: Double, velocity: Vec2, heading: Double = 0, spin: Double = 0) -> RigidBody {
        RigidBody(position: Vec2(x, y), velocity: velocity, heading: heading, angularVelocity: spin, mass: 1, inertia: CrashPhysics.inertia(config: config))
    }

    /// Linear momentum and angular momentum about the origin.
    func momentum(_ bodies: [RigidBody]) -> (Vec2, Double) {
        var linear = Vec2.zero
        var angular = 0.0
        for body in bodies {
            linear += body.velocity * body.mass
            angular += body.position.cross(body.velocity * body.mass) + body.inertia * body.angularVelocity
        }
        return (linear, angular)
    }

    @Test func impactConservesMomentumAndNeverAddsEnergy() {
        var a = car(0, 0, velocity: Vec2(110, 0), heading: 0)
        var b = car(20, -8, velocity: Vec2(90, 40), heading: 0.4, spin: 0.9)
        let point = Vec2(12, -3)
        let normal = Vec2(-0.6, 0.8)
        let before = momentum([a, b])
        let energy = a.kineticEnergy + b.kineticEnergy
        let closing = CrashPhysics.collide(&a, &b, at: point, normal: normal, restitution: config.crashRestitution, friction: config.crashFriction)
        let after = momentum([a, b])
        #expect(closing > 0)
        #expect(after.0.distance(to: before.0) < 1e-9)
        #expect(abs(after.1 - before.1) < 1e-6)
        #expect(a.kineticEnergy + b.kineticEnergy < energy)
        // They bounce apart: the contact points separate along the normal.
        #expect((a.velocity(at: point) - b.velocity(at: point)).dot(normal) >= -1e-9)
    }

    @Test func headOnHitBouncesBackByTheRestitution() {
        var a = car(0, 0, velocity: Vec2(50, 0))
        var b = car(24, 0, velocity: Vec2(-50, 0))
        CrashPhysics.collide(&a, &b, at: Vec2(12, 0), normal: Vec2(-1, 0), restitution: 0.3, friction: 0.4)
        #expect(abs(a.velocity.x - -15) < 1e-9)
        #expect(abs(b.velocity.x - 15) < 1e-9)
        #expect(a.angularVelocity == 0)
    }

    @Test func hitOffTheCentreMakesTheCarSpin() {
        var a = car(0, 0, velocity: .zero)
        var b = car(-6, 20, velocity: Vec2(0, -80), heading: -.pi / 2)
        CrashPhysics.collide(&a, &b, at: Vec2(10, 6.5), normal: Vec2(0, -1), restitution: 0.3, friction: 0.4)
        #expect(abs(a.angularVelocity) > 1)
    }

    @Test func separatingBodiesAreLeftAlone() {
        var a = car(0, 0, velocity: Vec2(-10, 0))
        var b = car(24, 0, velocity: Vec2(10, 0))
        let closing = CrashPhysics.collide(&a, &b, at: Vec2(12, 0), normal: Vec2(-1, 0), restitution: 0.3, friction: 0.4)
        #expect(closing == 0)
        #expect(a.velocity == Vec2(-10, 0))
    }

    @Test func skiddingWreckBrakesAtTyreGripAndStops() {
        var body = car(0, 0, velocity: Vec2(110, 0))
        let dt = World.stepDuration
        for _ in 0..<World.stepRate / 2 {
            CrashPhysics.skid(&body, config: config, dt: dt)
        }
        // Half a second of braking at 0.8 g.
        let expected = 110 - config.tireGripBrake * config.gravity * 0.5
        #expect(abs(body.velocity.x - expected) < 1)
        for _ in 0..<(5 * World.stepRate) {
            CrashPhysics.skid(&body, config: config, dt: dt)
        }
        #expect(body.velocity.length < 0.5)
        #expect(body.position.x > 100 && body.position.x < 160)
    }

    @Test func fastSlidingCarKeepsSpinningLongerThanAStandingOne() {
        func spinAfter(_ velocity: Vec2) -> Double {
            var body = car(0, 0, velocity: velocity, spin: 6)
            for _ in 0..<(World.stepRate / 3) {
                CrashPhysics.skid(&body, config: config, dt: World.stepDuration)
            }
            return abs(body.angularVelocity)
        }
        #expect(spinAfter(Vec2(110, 0)) > spinAfter(.zero) + 0.5)
    }
}

@Suite("Crashes in the world")
struct WorldCrashTests {
    @Test func crashedCarsBounceApartAndSlowDown() {
        var world = emptyWorld()
        world.spawnRingCar(at: world.ringPositionAhead(ofMergeEnd: 4), exitArm: world.west)
        world.tap(at: 0)
        let events = world.run(steps: 90) { $0.vehicles.contains(where: \.isCrashed) }
        guard let crash = events.compactMap(\.crash).first,
              let first = world.vehicle(id: crash.first), let second = world.vehicle(id: crash.second),
              case let .crashed(a) = first.phase, case let .crashed(b) = second.phase
        else {
            Issue.record("no crash")
            return
        }
        #expect(crash.impact > 0)
        // Not inside each other any more.
        #expect(Collision.gap(world.hitbox(of: first), world.hitbox(of: second)) > -0.05)
        let speed = max(a.velocity.length, b.velocity.length)
        world.run(steps: World.stepRate)
        let later = world.vehicles.compactMap { vehicle -> Double? in
            if case let .crashed(state) = vehicle.phase { return state.velocity.length }
            return nil
        }
        #expect(later.count == 2)
        #expect(later.allSatisfy { $0 < speed })
    }

    @Test func wrecksNeverOverlapWhileTheySlide() {
        var world = emptyWorld()
        world.spawnRingCar(at: world.ringPositionAhead(ofMergeEnd: 0), exitArm: world.west)
        world.tap(at: 0)
        world.run(steps: 90) { $0.vehicles.contains(where: \.isCrashed) }
        for _ in 0..<(2 * World.stepRate) {
            world.step()
            let wrecks = world.vehicles.filter(\.isCrashed)
            if wrecks.count == 2 {
                #expect(Collision.gap(world.hitbox(of: wrecks[0]), world.hitbox(of: wrecks[1])) > -0.5)
            }
        }
    }

    @Test func damageIsWhereTheCarWasHit() {
        var world = emptyWorld()
        // The ring car ahead is hit from behind, the merging car at its front.
        world.spawnRingCar(at: world.ringPositionAhead(ofMergeEnd: world.config.carLength - 3), exitArm: world.west)
        let player = world.queue.vehicles[0]
        world.tap(at: 0)
        world.run(steps: 90) { $0.vehicles.contains(where: \.isCrashed) }
        guard case let .crashed(state) = world.vehicle(id: player)?.phase else {
            Issue.record("player car did not crash")
            return
        }
        #expect(state.damage.x > world.config.carLength / 4)
    }
}
