import Testing
@testable import GameCore
@testable import GamePresentation

@Suite("Explosions on screen")
struct ExplosionSceneTests {
    /// Quiet shifts with a military truck early in every one of them, and nothing else special.
    func militaryConfig() -> Config {
        quietConfig {
            $0.militaryLevel = 1
            $0.militaryLevelChance = 1
            $0.militaryFirst = 0.5...0.5
            $0.militaryTime = 60
            $0.criminalFirst = 1000...1000
            $0.transporterFirst = 1000...1000
            $0.policeShare = 0
        }
    }

    @Test func aTankerBlastShakesBurnsTheGroundAndIsHeardAndFelt() {
        let audio = RecordingAudio()
        let haptics = RecordingHaptics()
        let session = makeSession(audio: audio, haptics: haptics)
        session.advance([.confirm])
        session.run(seconds: 1) { $0.world.queue.isReady }
        var world = session.world
        let s = world.layout.entryRingS(world.layout.player) - world.ringSpeed * world.config.mergeDuration
        world.spawnRingCar(at: s, exitArm: world.layout.arm(3), type: .tanker)
        session.world = world
        let calm = session.advance().renderList.camera.focus
        session.advance([.tap])
        var shook = false
        var burnt = false
        var fireball = false
        for _ in 0..<60 {
            let frame = session.advance()
            let items = frame.renderList.items
            #expect(Set(items.map(\.id)).count == items.count)
            shook = shook || frame.renderList.camera.focus.distance(to: calm) > 5
            burnt = burnt || items.contains { $0.color == .scorch }
            fireball = fireball || items.contains { $0.color == .fireCore && $0.space == .world }
        }
        #expect(shook)
        #expect(burnt)
        #expect(fireball)
        #expect(audio.played.contains(.explosion))
        #expect(haptics.played.contains(.explosion))
    }

    @Test func theBombsSmokeLeadsIntoAFreshRoundabout() {
        let session = makeSession(config: militaryConfig())
        session.advance([.confirm])
        session.run(seconds: 20) { if case .active = $0.world.military.phase { true } else { false } }
        guard case .active = session.world.military.phase else {
            Issue.record("no military truck")
            return
        }
        session.run(seconds: 20) { $0.world.queue.isReady && $0.world.predictedMergeGap(from: $0.world.layout.player) <= 0 }
        session.advance([.tap])
        session.run(seconds: 1) { $0.world.shift.detonated }
        #expect(session.world.shift.detonated)
        // The smoke fills the screen (in game time: the crash's slow motion slows it too)…
        var covered = false
        for _ in 0..<(10 * 60) where !session.isShowingResult {
            let items = session.advance().renderList.items
            #expect(Set(items.map(\.id)).count == items.count)
            covered = covered || items.contains { $0.id == RenderID.curtain && $0.opacity > 0.95 }
        }
        #expect(covered)
        // …and out of it comes a fresh roundabout: no wrecks, the next shift waiting.
        #expect(session.isShowingResult)
        let wrecks = session.world.vehicles.filter(\.isCrashed).count
        #expect(wrecks == 0)
        #expect(session.world.shift.phase == .waiting)
        #expect(!session.world.shift.detonated)
        // Then the smoke is gone.
        session.run(seconds: 3 * SmokeCurtain.duration)
        let smoke = session.advance().renderList.items.filter { $0.id == RenderID.curtain }.count
        #expect(smoke == 0)
    }
}
