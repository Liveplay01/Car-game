import Testing
@testable import GameCore
@testable import GamePresentation

/// Leo, 26.09.2026: more feel, no more interface. What the game says, the world says —
/// lights on the cars, the ring, the markings on the road, sound and touch.
@Suite("World feel")
struct WorldFeelTests {
    func item(_ frame: Frame, _ id: Int) -> RenderItem? {
        frame.renderList.items.first { $0.id == id }
    }

    /// An early tap is not swallowed: the car it goes to flashes its headlights. The queue
    /// standing at its line has its brake lights on.
    @Test func aHeldTapFlashesTheHeadlightsAndTheWaitingQueueBrakes() {
        let session = makeSession()
        session.advance()
        session.advance([.tap])
        session.advance()
        #expect(session.world.queue.heldTap == nil)
        let next = session.world.queue.vehicles[0]
        let headlights = RenderID.vehicle(next, part: CarArt.Slot.headLamps)
        #expect(item(session.advance(), headlights) == nil)
        session.advance([.tap])
        #expect(session.world.queue.heldTap != nil)
        var flashed = false
        for _ in 0..<12 {
            flashed = flashed || (item(session.advance(), headlights)?.opacity ?? 0) > 0.5
        }
        #expect(flashed)
        // Gone again after the flash.
        session.run(seconds: 0.5) { _ in false }
        #expect(item(session.advance(), headlights) == nil)

        // Standing at the line, the queue's tail lamps shine.
        session.run(seconds: 1) { $0.world.queue.isReady }
        session.run(seconds: 0.3) { _ in false }
        let front = session.world.queue.vehicles[0]
        let lamp = item(session.advance(), RenderID.vehicle(front, part: CarArt.Slot.brakeLamps))
        #expect((lamp?.opacity ?? 0) > 0.95)
        #expect(item(session.advance(), RenderID.vehicle(front, part: CarArt.Slot.brakeGlow)) != nil)
    }

    /// The crash that loses the shift: the moment slows down, the camera steps back a little,
    /// and after a short breath one tap is the next try — no result screen to sit through.
    @Test func aLostShiftSlowsDownStepsBackAndOneTapTriesAgain() {
        let session = makeSession()
        session.advance()
        session.advance([.tap])
        let scale = session.advance().renderList.camera.scale
        let level = session.world.config.level
        crashNextCar(session)
        #expect(session.world.shift.outcome == .struckOut)
        #expect(session.timeScale < 0.25)
        // A tap right after the crash was meant for the car: it does not restart.
        session.advance([.tap])
        #expect(session.world.shift.outcome == .struckOut)
        session.run(seconds: GameSession.restartLock) { _ in false }
        #expect(session.advance().renderList.camera.scale < scale * 0.97)
        #expect(!session.isShowingResult)
        session.advance([.tap])
        #expect(session.screen == .playing)
        #expect(session.world.shift.outcome == nil)
        #expect(session.world.config.level == level)
        // Back to full speed at once; the tap waits for the first car to roll up.
        #expect(session.timeScale == 1)
        let launched = session.run(seconds: session.world.config.queueFillSeconds + 0.2) { _ in false }
        #expect(launched.contains { if case .launched = $0 { true } else { false } })
        // The camera comes back.
        session.run(seconds: 1.5) { _ in false }
        #expect(abs(session.advance().renderList.camera.scale - scale) < scale * 0.002)
    }

    @Test func reduceMotionLosesWithoutSlowMotionOrPullBack() {
        let store = MemorySaveStore()
        var save = SaveGame()
        save.settings.reduceMotion = .on
        save.tutorialDone = true
        store.save(save)
        let session = makeSession(store: store)
        session.advance()
        session.advance([.tap])
        let scale = session.advance().renderList.camera.scale
        crashNextCar(session)
        #expect(session.timeScale == 1)
        session.run(seconds: 0.6) { _ in false }
        #expect(abs(session.advance().renderList.camera.scale - scale) < 1e-9)
    }

    /// High Alert is on the road: two fine stripes along the ring lane, faded in and out.
    @Test func highAlertPutsStripesOnTheRing() {
        let session = makeSession()
        #expect(item(session.advance(), RenderID.alertStripes) == nil)
        session.advance([.perform(.setDuty(.highAlert))])
        session.run(seconds: 0.8) { _ in false }
        let frame = session.advance()
        #expect((item(frame, RenderID.alertStripes)?.opacity ?? 0) > 0.4)
        #expect(item(frame, RenderID.alertStripes + 1) != nil)
        #expect(item(frame, RenderID.alertStripes)?.color == .destructive)
        session.advance([.perform(.setDuty(.normal))])
        session.run(seconds: 1.5) { _ in false }
        #expect(item(session.advance(), RenderID.alertStripes) == nil)
    }

    /// The music breathes in when a criminal is announced or the rush hour begins, and opens
    /// again a moment later.
    @Test func theMusicBreathesInAtTheBigMoments() {
        #expect(MusicMix.breath(since: -1) == 0)
        #expect(MusicMix.breath(since: 0.3) == 1)
        #expect(MusicMix.breath(since: 2) == 0)
        var last = 1.0
        for step in 0...100 {
            let value = MusicMix.breath(since: 0.47 + 0.9 * Double(step) / 100)
            #expect(value <= last + 1e-12)
            last = value
        }
        #expect(abs(MusicMix.cutoff(0) - 20_000) < 1e-6)
        #expect(abs(MusicMix.cutoff(1) - 350) < 1e-6)
        #expect(MusicMix.cutoff(0.5) < 3_000)

        var world = World(config: quietConfig(), seed: 3, mode: .shift)
        #expect(MusicMix.playing(world, flow: 0).lowPass == 0)
        world.shift.rushHourSince = world.time - 0.3
        #expect(MusicMix.playing(world, flow: 0).lowPass > 0.8)
        world.shift.rushHourSince = world.time - 3
        #expect(MusicMix.playing(world, flow: 0).lowPass == 0)
        world.criminal.phase = .warning(arm: world.layout.arm(1), until: world.time + world.config.criminalWarning - 0.3)
        #expect(MusicMix.playing(world, flow: 0).lowPass > 0.8)
        #expect(MusicMix.silent.lowPass == 0)
    }

    @Test func theFlashIsTwoSoftBlinks() {
        #expect(VehicleLamps.blink(0) < 0.01)
        #expect(VehicleLamps.blink(0.055) > 0.99)
        #expect(VehicleLamps.blink(0.12) < 0.05)
        #expect(VehicleLamps.blink(0.19) > 0.99)
        #expect(VehicleLamps.blink(VehicleLamps.flashDuration) < 0.01)
    }
}
