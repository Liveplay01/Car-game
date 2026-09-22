import Testing
@testable import GameCore

@Suite("Capsule collision")
struct CollisionTests {
    let length = 24.0
    let width = 13.0

    func car(_ x: Double, _ y: Double, heading: Double = 0) -> Capsule {
        Capsule(center: Vec2(x, y), heading: heading, length: length, width: width)
    }

    @Test func sideBySideJustTouching() {
        // Centres exactly one car width apart: the surfaces touch.
        #expect(abs(Collision.gap(car(0, 0), car(0, width))) < 1e-12)
    }

    @Test func sideBySideJustMissing() {
        let gap = Collision.gap(car(0, 0), car(0, width + 0.01))
        #expect(gap > 0)
        #expect(abs(gap - 0.01) < 1e-9)
    }

    @Test func noseToTailJustTouching() {
        #expect(abs(Collision.gap(car(0, 0), car(length, 0))) < 1e-12)
    }

    @Test func noseToTailJustMissing() {
        #expect(abs(Collision.gap(car(0, 0), car(length + 0.5, 0)) - 0.5) < 1e-9)
    }

    @Test func crossingCarsOverlap() {
        #expect(Collision.gap(car(0, 0), car(0, 0, heading: .pi / 2)) < 0)
    }

    @Test func gapIsSymmetric() {
        let a = car(3, 1, heading: 0.3)
        let b = car(20, 9, heading: 2.1)
        #expect(abs(Collision.gap(a, b) - Collision.gap(b, a)) < 1e-12)
    }

    @Test func contactPointLiesBetweenTheCars() {
        // Cars at 0 and 28: surfaces at 12 and 16, the contact point halfway between.
        let contact = Collision.contact(car(0, 0), car(length + 4, 0))
        #expect(abs(contact.point.x - (length + 4) / 2) < 1e-9)
        #expect(abs(contact.point.y) < 1e-9)
    }

    @Test func degenerateSegments() {
        let (p, q) = Collision.closestPoints(Vec2(0, 0), Vec2(0, 0), Vec2(3, 4), Vec2(3, 4))
        #expect(p.distance(to: q) == 5)
    }
}
