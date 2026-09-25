import Testing
@testable import GameCore
@testable import GamePresentation

/// A session whose shift has no AI traffic and only police cars (or only normal cars).
func chaseSession(police: Bool, store: MemorySaveStore = MemorySaveStore()) -> GameSession {
    makeSession(config: quietConfig { $0.policeShare = police ? 1 : 0 }, store: store)
}

extension GameSession {
    /// Runs until the criminal's countdown runs; returns the pickup's id.
    func runUntilChase() -> Int? {
        for _ in 0..<(40 * 60) {
            advance()
            if case let .active(id, _) = world.criminal.phase { return id }
        }
        return nil
    }

    /// Taps once a car launched now would hit the pickup; returns the events of that second.
    func launchIntoCriminal(_ pickup: Int) -> [GameEvent] {
        for _ in 0..<(12 * 60) {
            if world.queue.isReady, (world.predictedMergeGaps(from: world.layout.player)[pickup] ?? .infinity) <= -0.05,
               world.predictedTakedown(from: world.layout.player, criminal: pickup) == true {
                return advance([.tap]).events + run(seconds: 1) { $0.world.vehicle(id: pickup)?.dents.isEmpty == false }
            }
            advance()
        }
        return []
    }
}

@Suite("Chase in the scene")
struct ChaseTests {
    @Test func vehicleTypesDifferInShapeNotOnlyColour() {
        let config = Config()
        let police = Set(CarArt.parts(.police))
        let pickup = Set(CarArt.parts(.pickup))
        let car = Set(CarArt.parts(.car))
        #expect(police.contains(.lightBar) && police.contains(.roof))
        #expect(pickup.contains(.bed))
        #expect(!car.contains(.lightBar) && !car.contains(.bed))
        #expect(Set([CarArt.bodyColor(.car), CarArt.bodyColor(.police), CarArt.bodyColor(.pickup)]).count == 3)
        #expect(CarArt.shape(.bed, type: .pickup, config: config).isVisible)
    }

    /// Announced only by the wedge on the rim, in the criminal's colour: no label on the
    /// arm, none on the island (Leo, 25.09.2026). Then a countdown.
    @Test func aWedgeWhileAnnouncedThenACountdown() {
        let session = chaseSession(police: false)
        session.advance([.confirm])
        var sawWarning = false
        for _ in 0..<(30 * 60) {
            let frame = session.advance()
            if case .warning = session.world.criminal.phase {
                sawWarning = true
                #expect(!frame.texts.contains { $0.hasPrefix(Strings.HUD.wanted) })
                #expect(frame.renderList.items.contains { $0.color == .vehicleCriminal && $0.space == .world })
            }
            if case .active = session.world.criminal.phase { break }
        }
        #expect(sawWarning)
        let texts = session.advance().texts
        #expect(texts.contains(Strings.HUD.wanted(session.world.config.criminalTime)))
        #expect(texts.contains(String(Int(session.world.config.criminalTime))))
    }

    @Test func dispatchKeyTurnsTheNextCarIntoPolice() {
        let session = chaseSession(police: false)
        session.advance([.confirm])
        let front = session.world.queue.vehicles[0]
        let frame = session.advance([.dispatch])
        #expect(session.world.vehicle(id: front)?.type == .police)
        #expect(frame.events.contains(.dispatched(vehicle: front, combo: 0)))
        #expect(session.advance().texts.contains(Strings.HUD.dispatch))
    }

    @Test func takedownSlowsTimeForAMomentAndSaysBusted() {
        let session = chaseSession(police: true)
        session.advance([.confirm])
        guard let pickup = session.runUntilChase() else {
            Issue.record("no chase")
            return
        }
        let events = session.launchIntoCriminal(pickup)
        #expect(events.contains { if case .takedown = $0 { true } else { false } })
        #expect(session.timeScale < 1)
        #expect(session.advance().texts.contains { $0.hasPrefix(Strings.HUD.busted) })
        session.run(seconds: 1)
        #expect(session.timeScale == 1)
    }

    @Test func reduceMotionKeepsTheTakedownAtFullSpeed() {
        var saved = SaveGame()
        saved.settings.reduceMotion = .on
        let session = chaseSession(police: true, store: MemorySaveStore(saved))
        session.advance([.confirm])
        guard let pickup = session.runUntilChase() else {
            Issue.record("no chase")
            return
        }
        let events = session.launchIntoCriminal(pickup)
        #expect(events.contains { if case .takedown = $0 { true } else { false } })
        #expect(session.timeScale == 1)
    }

    @Test func escapeEndsTheShiftWithItsOwnBanner() {
        let session = chaseSession(police: false)
        session.advance([.confirm])
        session.run(seconds: 50) { $0.isShowingResult }
        guard case let .result(summary) = session.screen else {
            Issue.record("no result")
            return
        }
        #expect(summary.result.outcome == .escaped)
        #expect(session.advance().texts.contains(Strings.Result.escaped))
    }
}
