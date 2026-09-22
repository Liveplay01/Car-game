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
