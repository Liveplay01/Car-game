import Testing
@testable import GameCore

@Suite("Math")
struct MathTests {
    @Test func wrapKeepsAnglesInRange() {
        #expect(Angle.wrap(-0.5) == Angle.tau - 0.5)
        #expect(Angle.wrap(Angle.tau) == 0)
        #expect(abs(Angle.wrap(3 * Angle.tau + 1) - 1) < 1e-12)
        #expect(Angle.wrap(-1e-18) < Angle.tau)
    }

    @Test func deltaTakesTheShortWay() {
        #expect(abs(Angle.delta(from: 0.1, to: Angle.tau - 0.1) - -0.2) < 1e-12)
        #expect(abs(Angle.delta(from: Angle.tau - 0.1, to: 0.1) - 0.2) < 1e-12)
    }

    @Test func rotationIsCounterClockwise() {
        let v = Vec2(1, 0).rotated(by: .pi / 2)
        #expect(abs(v.x) < 1e-12 && abs(v.y - 1) < 1e-12)
        #expect(Vec2(1, 0).left == Vec2(0, 1))
        #expect(Vec2(1, 0).right == Vec2(0, -1))
    }
}

@Suite("Seeded random")
struct RandomTests {
    @Test func sameSeedSameSequence() {
        var a = SeededRandom(seed: 42)
        var b = SeededRandom(seed: 42)
        for _ in 0..<100 {
            #expect(a.next() == b.next())
        }
    }

    @Test func differentSeedsDiffer() {
        var a = SeededRandom(seed: 1)
        var b = SeededRandom(seed: 2)
        #expect((0..<10).map { _ in a.next() } != (0..<10).map { _ in b.next() })
    }

    @Test func intStaysInRangeAndHitsEveryValue() {
        var rng = SeededRandom(seed: 7)
        var seen = Set<Int>()
        for _ in 0..<1_000 {
            let value = rng.int(in: 1...3)
            #expect((1...3).contains(value))
            seen.insert(value)
        }
        #expect(seen == [1, 2, 3])
    }

    @Test func unitIsHalfOpen() {
        var rng = SeededRandom(seed: 9)
        for _ in 0..<1_000 {
            let value = rng.unit()
            #expect(value >= 0 && value < 1)
        }
    }
}
