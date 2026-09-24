import Testing
import GameCore
@testable import GamePresentation

@Suite("Camera")
struct CameraTests {
    let bounds = Rect(minX: -150, minY: -280, maxX: 150, maxY: 150)

    @Test(arguments: [Vec2(375, 667), Vec2(390, 844), Vec2(440, 956), Vec2(430, 900), Vec2(1200, 700)])
    func boundsFitInsideTheViewport(viewport: Vec2) {
        let insets = EdgeInsets(top: 72, left: 0, bottom: 16, right: 0)
        let camera = Camera.fit(bounds, viewport: viewport, insets: insets, verticalBias: 0.6)
        let topLeft = camera.toScreen(Vec2(bounds.minX, bounds.maxY))
        let bottomRight = camera.toScreen(Vec2(bounds.maxX, bounds.minY))
        let tolerance = 1e-9
        #expect(topLeft.x >= insets.left - tolerance)
        #expect(topLeft.y >= insets.top - tolerance)
        #expect(bottomRight.x <= viewport.x - insets.right + tolerance)
        #expect(bottomRight.y <= viewport.y - insets.bottom + tolerance)
    }

    @Test func screenAndWorldRoundTrip() {
        let camera = Camera.fit(bounds, viewport: Vec2(390, 844))
        let p = Vec2(12.5, -80)
        #expect(camera.toWorld(camera.toScreen(p)).distance(to: p) < 1e-9)
    }

    @Test func worldUpIsScreenUp() {
        let camera = Camera.fit(bounds, viewport: Vec2(390, 844))
        #expect(camera.toScreen(Vec2(0, 10)).y < camera.toScreen(Vec2(0, 0)).y)
    }

    @Test func fullBiasPutsTheContentAtTheBottom() {
        let camera = Camera.fit(bounds, viewport: Vec2(390, 1200), verticalBias: 1)
        #expect(abs(camera.toScreen(Vec2(0, bounds.minY)).y - 1200) < 1e-9)
    }

    @Test func smallestIphoneStillShowsThreeQueuedCars() {
        let config = Config()
        let layout = RoundaboutLayout(config: config)
        let viewport = Vec2(375, 667)
        let camera = Camera.fit(layout.viewBounds, viewport: viewport, insets: Metrics.sceneInsets, verticalBias: Metrics.sceneVerticalBias)
        let third = camera.toScreen(layout.queuePose(slot: 2).position)
        #expect(third.y + config.carLength / 2 * camera.scale <= viewport.y)
    }
}

@Suite("Street Builder modules (M9)")
struct BuilderModuleTests {
    @Test func everyModuleIsAPart() {
        for module in RoadModule.allCases {
            #expect(StreetBuilderPage.Part.allCases.contains { $0.module == module })
        }
        #expect(StreetBuilderPage.Part.arm.module == nil)
    }

    @Test func modulesLandOnModuleSlotsAndArmsOnArmSlots() {
        let config = Config()
        let career = Career(level: 1, money: 100_000)
        let map = (center: Vec2(200, 300), radius: 120.0)
        let slotPoint = StreetBuilderPage.moduleSlotPosition(2, count: config.moduleSlotCount, map: map)
        #expect(StreetBuilderPage.target(for: .towDepot, at: slotPoint, career: career, config: config, map: map) == 2)
        #expect(StreetBuilderPage.canPlace(.tollBooth, inSlot: 5, career: career, config: config))
        #expect(!StreetBuilderPage.canPlace(.tollBooth, inSlot: config.moduleSlotCount, career: career, config: config))
        #expect(!StreetBuilderPage.canPlace(.arm, inSlot: 0, career: career, config: config))
        #expect(StreetBuilderPage.price(of: .speedCamera, career: career, config: config) == config.speedCameraCost)
    }
}

@Suite("City Evolution (M9)")
struct CityTests {
    @Test func theCityGrowsWithLevelsArmsAndModules() {
        var config = Config()
        let start = CityLayer.growth(config: config)
        config.level = 10
        let later = CityLayer.growth(config: config)
        config.armSlots = [0, 2, 4, 8, 12]
        config.modules = [0: .towDepot]
        let built = CityLayer.growth(config: config)
        #expect(start < later && later < built)
        #expect(CityLayer.lots(growth: start) < CityLayer.lots(growth: built))
        #expect(CityLayer.lots(growth: 10_000) == 64)
    }
}
