import Testing
@testable import GameCore

@Suite("Tow depot (M9)")
struct TowDepotTests {
    @Test func theDepotCoversItsStretchOfTheRing() {
        let world = moduleShift(.towDepot)
        let centre = world.layout.ring.pose(at: world.layout.moduleRingS(0, of: world.config.moduleSlotCount)).position
        #expect(world.towDepot(covering: centre) == 0)
        #expect(world.towDepot(covering: -centre) == nil)
        #expect(world.wreckClearRate(at: centre) > 1)
        #expect(world.wreckClearRate(at: -centre) == 1)
    }

    @Test func itClearsWrecksAboutThirtyPercentFaster() {
        let world = moduleShift(.towDepot)
        let centre = world.layout.ring.pose(at: world.layout.moduleRingS(0, of: world.config.moduleSlotCount)).position
        let rate = world.wreckClearRate(at: centre)
        #expect(abs(world.config.crashDuration / rate - world.config.crashDuration * 0.7) < 1e-9)
    }

    @Test func itEarnsNothingAndSlowsNobody() {
        let world = moduleShift(.towDepot)
        let s = world.layout.moduleRingS(0, of: world.config.moduleSlotCount)
        #expect(world.speedLimit(atRingS: s) == world.ringSpeed)
        #expect(Config().price(of: .towDepot) == Config().towDepotCost)
    }
}
