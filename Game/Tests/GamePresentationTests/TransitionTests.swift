import Testing
@testable import GameCore
@testable import GamePresentation

/// Screen changes are never a cut (Leo, 25.09.2026: "dieses Smoothe überall").
@Suite("Screen transitions")
struct TransitionTests {
    private func fading(_ frame: Frame) -> [RenderItem] {
        frame.renderList.items.filter { $0.id >= RenderID.transition }
    }

    @Test func aTabChangeFadesTheOldPageOutAndIsGoneSoonAfter() {
        let session = makeSession()
        session.perform(.showTab(.upgrades))
        session.run(seconds: 1)
        session.perform(.showTab(.shop))
        let first = session.advance()
        #expect(!fading(first).isEmpty)
        #expect(Set(first.renderList.items.map(\.id)).count == first.renderList.items.count)
        session.run(seconds: ScreenTransition.duration + 0.1)
        #expect(fading(session.advance()).isEmpty)
    }

    @Test func theEndOfATransitionLooksExactlyLikeNoTransition() {
        let session = makeSession()
        session.perform(.showTab(.shop))
        session.run(seconds: 1.5)
        let settled = session.advance().renderList.items
        let later = session.advance().renderList.items
        #expect(settled.count == later.count)
        #expect(!settled.contains { $0.id >= RenderID.transition })
    }

    @Test func theNewTabComesFromItsSideOfTheTabBar() {
        let toTheRight = ScreenTransition(from: .page(.streetBuilder), to: .page(.upgrades), outgoing: [])
        let toTheLeft = ScreenTransition(from: .page(.shop), to: .ready, outgoing: [])
        let settings = ScreenTransition(from: .ready, to: .settings, outgoing: [])
        let result = ScreenTransition(from: .playing, to: .result, outgoing: [])
        #expect(toTheRight.direction == 1)
        #expect(toTheLeft.direction == -1)
        #expect(settings.direction == 0)
        #expect(result.direction == 0)
    }

    @Test func theNewScreenGlidesInAndFadesUp() {
        let item = RenderItem(id: 1, primitive: .circle(center: Vec2(100, 100), radius: 5), color: .primary, space: .screen)
        var start = ScreenTransition(from: .page(.game), to: .page(.shop), outgoing: [])
        func shown(at age: Double, reduceMotion: Bool = false) -> RenderItem {
            start.age = age
            var list = RenderList(camera: Camera(viewport: viewport, center: .zero, focus: viewport / 2, scale: 1), background: .background)
            list.items = [item]
            start.apply(to: &list, incoming: 0..<1, reduceMotion: reduceMotion)
            return list.items[0]
        }
        func x(_ item: RenderItem) -> Double {
            if case let .circle(center, _) = item.primitive { return center.x }
            return .nan
        }
        #expect(shown(at: 0).opacity == 0)
        #expect(x(shown(at: 0)) > 100)
        // It glides into its place and stops there: never past it (apple-design: a
        // critically damped spring for things that only have to arrive).
        let path = (0...42).map { x(shown(at: Double($0) * 0.01)) }
        #expect(path.allSatisfy { $0 >= 100 })
        #expect(zip(path, path.dropFirst()).allSatisfy { $0 >= $1 })
        #expect(x(shown(at: ScreenTransition.duration)) == 100)
        #expect(shown(at: ScreenTransition.duration).opacity == 1)
        // Reduce Motion: only the fade.
        #expect(x(shown(at: 0.05, reduceMotion: true)) == 100)
    }

    @Test func hudChangesLandWithABumpAndSettleExactly() {
        #expect(HUD.Pops.land(0, amount: 0.12) > 1.1)
        #expect((1..<100).contains { HUD.Pops.land(Double($0) / 100, amount: 0.12) < 1 })
        #expect(HUD.Pops.land(1, amount: 0.12) == 1)
    }

    @Test func theSceneUnderneathNeverMoves() {
        let world = RenderItem(id: 1, primitive: .circle(center: Vec2(3, 4), radius: 1), color: .primary, space: .world)
        #expect(world.moved(by: Vec2(20, 0), opacity: 1).primitive == world.primitive)
    }
}
