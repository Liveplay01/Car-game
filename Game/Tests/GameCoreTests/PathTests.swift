import Testing
@testable import GameCore

@Suite("Paths and roundabout geometry")
struct PathTests {
    let config = Config()
    var layout: RoundaboutLayout { RoundaboutLayout(config: config) }

    @Test func circleRunsCounterClockwiseFromEast() {
        let ring = Path.circle(center: .zero, radius: 100)
        let start = ring.pose(at: 0)
        #expect(start.position.distance(to: Vec2(100, 0)) < 1e-9)
        #expect(abs(Angle.delta(from: start.heading, to: .pi / 2)) < 1e-9)
        let quarter = ring.pose(at: ring.length / 4)
        #expect(quarter.position.distance(to: Vec2(0, 100)) < 1e-9)
        #expect(ring.isClosed)
    }

    @Test func straightCurveIsParametrisedByLength() {
        let line = Path.curve([.line(from: Vec2(0, 0), to: Vec2(30, 40))])
        #expect(abs(line.length - 50) < 1e-9)
        #expect(line.point(at: 25).distance(to: Vec2(15, 20)) < 1e-6)
        #expect(line.point(at: 999) == Vec2(30, 40))
        #expect(!line.isClosed)
    }

    @Test(arguments: [0, 1, 2, 3])
    func entryHasTheMergeLength(index: Int) {
        #expect(abs(layout.entry(layout.arm(index)).length - config.mergePathLength) < 0.01)
    }

    @Test(arguments: [0, 1, 2, 3])
    func entryMeetsTheRingTangentially(index: Int) {
        let layout = self.layout
        let arm = layout.arm(index)
        let end = layout.entry(arm).pose(at: layout.entry(arm).length)
        let ring = layout.ring.pose(at: layout.entryRingS(arm))
        #expect(end.position.distance(to: ring.position) < 1e-6)
        #expect(abs(Angle.delta(from: end.heading, to: ring.heading)) < 0.01)
    }

    @Test(arguments: [0, 1, 2, 3])
    func exitLeavesTheRingTangentially(index: Int) {
        let layout = self.layout
        let arm = layout.arm(index)
        let start = layout.exit(arm).pose(at: 0)
        let ring = layout.ring.pose(at: layout.exitRingS(arm))
        #expect(start.position.distance(to: ring.position) < 1e-6)
        #expect(abs(Angle.delta(from: start.heading, to: ring.heading)) < 0.01)
    }

    @Test func playerEntryIsRightOfTheSouthArm() {
        // Right-hand traffic: coming up from the south, the entry lane lies east (x > 0).
        let stop = layout.stopPose(layout.player)
        #expect(stop.position.x > 0)
        #expect(stop.position.y < -config.ringRadius)
        #expect(abs(Angle.delta(from: stop.heading, to: .pi / 2)) < 1e-6)
    }

    @Test func waitingCarDoesNotTouchRingTraffic() {
        // A car at the stop line is clear of every ring position by more than a Tight Fit.
        let layout = self.layout
        let world = World(config: config, seed: 1, prefill: false)
        let waiting = world.hitbox(at: layout.stopPose(layout.player))
        var smallest = Double.infinity
        for k in 0..<720 {
            let ringCar = world.hitbox(at: layout.ring.pose(at: layout.ring.length * Double(k) / 720))
            smallest = min(smallest, Collision.gap(waiting, ringCar))
        }
        #expect(smallest > config.tightFitSeconds * config.ringSpeed)
    }

    @Test func queueSlotZeroIsTheStopLine() {
        #expect(layout.queuePose(slot: 0) == layout.stopPose(layout.player))
        #expect(layout.queuePose(slot: 1).position.y < layout.queuePose(slot: 0).position.y)
    }

    @Test func ringDistanceGoesForward() {
        let layout = self.layout
        let d = layout.ringDistance(from: layout.player, toExit: layout.arm(1))
        let expected = (Double.pi / 2 - 2 * config.mergeAngle) * config.ringRadius
        #expect(abs(d - expected) < 1e-6)
    }

    @Test func viewShowsRingAndQueue() {
        let layout = self.layout
        #expect(layout.viewBounds.contains(Vec2(config.ringRadius, 0)))
        #expect(layout.viewBounds.contains(layout.queuePose(slot: Double(config.queueVisible - 1)).position))
    }
}

@Suite("Merge profile")
struct MergeProfileTests {
    @Test(arguments: [110.0, 121.0, 137.5])
    func endsOnTheRingAtRingSpeed(ringSpeed: Double) {
        let profile = MergeProfile(pathLength: 55, duration: 0.5, ringSpeed: ringSpeed)
        #expect(abs(profile.distance(at: 0.5) - 55) < 1e-9)
        #expect(abs(profile.speed(at: 0.5) - ringSpeed) < 1e-9)
        #expect(profile.startSpeed >= 0)
    }

    @Test func constantSpeedAtFullTempo() {
        let profile = MergeProfile(pathLength: 55, duration: 0.5, ringSpeed: 110)
        #expect(abs(profile.startSpeed - 110) < 1e-9)
    }
}
