import Testing
@testable import GameCore
@testable import GamePresentation

@Suite("Car model and sheet metal")
struct CarArtTests {
    let config = Config()

    @Test func outlineGoesAroundTheBody() {
        let outline = CarArt.outline(config: config)
        #expect(outline.count > 30)
        let maxX = outline.map(\.x).max() ?? 0
        let maxY = outline.map(\.y).max() ?? 0
        #expect(abs(maxX - config.carLength / 2) < 1e-9)
        #expect(abs(maxY - config.carWidth / 2) < 1e-9)
    }

    @Test func noDentsNoChange() {
        let outline = CarArt.outline(config: config)
        #expect(CarArt.deformedOutline(dents: [], config: config) == outline)
    }

    @Test func frontHitPushesTheNoseIn() {
        let dent = Dent(point: Vec2(config.carLength / 2, 0), depth: 4)
        let nose = Vec2(config.carLength / 2, 0)
        let tail = Vec2(-config.carLength / 2, 0)
        #expect(CarArt.deformed(nose, dents: [dent], config: config).x < nose.x - 2)
        #expect(CarArt.deformed(tail, dents: [dent], config: config) == tail)
    }

    @Test func dentsNeverFoldTheBodyThroughItself() {
        let dents = [Dent(point: Vec2(0, config.carWidth / 2), depth: 20), Dent(point: Vec2(0, -config.carWidth / 2), depth: 20)]
        let outline = CarArt.deformedOutline(dents: dents, config: config)
        for point in outline {
            // Every point stays on its own side of the spine.
            #expect(abs(point.y) > 0.5 || abs(point.x) > config.carLength / 2 - config.carWidth)
        }
    }

    @Test func deepDentsBreakTheNearbyPartsOnly() {
        let front = [Dent(point: Vec2(config.carLength / 2, 0), depth: 4.5)]
        #expect(CarArt.isBroken(.frontBumper, type: .car, dents: front, config: config))
        #expect(CarArt.isBroken(.hood, type: .car, dents: front, config: config))
        #expect(!CarArt.isBroken(.rearBumper, type: .car, dents: front, config: config))
        #expect(!CarArt.isBroken(.rearWindow, type: .car, dents: front, config: config))
        let scratch = [Dent(point: Vec2(config.carLength / 2, 0), depth: 0.6)]
        #expect(!CarArt.isBroken(.frontBumper, type: .car, dents: scratch, config: config))
    }

    @Test func tornOffPartsFlyAndAreNotDrawnOnTheWreck() {
        var world = World(config: quietWorldConfig(), seed: 1, mode: .freePlay, prefill: false)
        world.targetDensity = 0
        world.spawnRingCar(at: 100, exitArm: .west)
        guard let index = world.vehicles.indices.first(where: { world.vehicles[$0].owner == .ai }) else {
            Issue.record("no car")
            return
        }
        world.vehicles[index].dents = [Dent(point: Vec2(config.carLength / 2, 0), depth: 5)]
        world.vehicles[index].phase = .crashed(.init(velocity: Vec2(60, 0), spin: 2, elapsed: 0, damage: Vec2(config.carLength / 2, 0)))
        var effects = CrashEffects(seed: 1)
        effects.update(1.0 / 60, world: world)
        let id = world.vehicles[index].id
        #expect(effects.torn[id]?.contains(.frontBumper) == true)
        let parts = effects.particles.filter { if case .part = $0.kind { true } else { false } }
        #expect(parts.count >= 2)
        #expect(parts.allSatisfy { $0.velocity.length > 0 })

        var list = RenderList(camera: Camera.fit(world.layout.viewBounds, viewport: Vec2(430, 900)), background: .background)
        effects.addGround(world: world, alpha: 1, to: &list)
        let bumperID = RenderID.vehicle(id, part: CarArt.Slot.part(.frontBumper))
        #expect(!list.items.contains { $0.id == bumperID })
        #expect(list.items.contains { if case .polygon = $0.primitive { true } else { false } })
    }

    func quietWorldConfig() -> Config {
        var config = Config()
        config.freePlayDensity = 0
        return config
    }
}
