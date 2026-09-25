import Foundation
import Testing
@testable import GameCore
@testable import GamePresentation

/// One world, one city (Leo, 25.09.2026): the ring as the UI, labels that float over the
/// city, no screen between two shifts, a city that breathes, and tabs as views of the same
/// place.
@Suite("Living city")
struct LivingCityTests {
    /// The ticks on the island's rim, as drawn.
    func ticks(_ frame: Frame) -> [RenderItem] {
        frame.renderList.items.filter { (RenderID.rim + 300..<RenderID.rim + 700).contains($0.id) }
    }

    func lit(_ frame: Frame) -> Int {
        ticks(frame).filter { $0.color != .marking }.count
    }

    // MARK: - The ring as UI

    @Test func theRimHasOneTickPerCarAndLightsThemAsTheyGoIn() {
        let session = makeSession(config: quietConfig(cars: 6))
        session.run(seconds: 1)
        var frame = session.advance()
        #expect(ticks(frame).count == 6)
        #expect(lit(frame) == 0)
        for sent in 1...2 {
            session.run(seconds: 1) { $0.world.queue.isReady }
            session.advance([.tap])
            frame = session.advance()
            #expect(lit(frame) == sent)
        }
    }

    @Test func aFinishedShiftsTicksStayIntoTheResultThenTheNextOnesComeIn() {
        let session = makeSession(config: quietConfig(cars: 3))
        session.advance([.confirm])
        finishShift(session)
        session.run(seconds: GameSession.resultDelay + 0.1) { $0.isShowingResult }
        // The next shift is already on the road, but the rim still shows the one just done.
        #expect(session.world.shift.phase == .waiting)
        #expect(lit(session.advance()) == 3)
        session.run(seconds: RingSignals.hold + RingSignals.leaveDuration + RingSignals.arrivalSpread + RingSignals.arrivalEach)
        let frame = session.advance()
        #expect(lit(frame) == 0)
        #expect(ticks(frame).count == 3)
    }

    @Test func aFinishedShiftRunsALightAroundTheRing() {
        let session = makeSession(config: quietConfig(cars: 2))
        session.advance([.confirm])
        finishShift(session)
        session.run(seconds: 0.3)
        let signals = session.advance().renderList.items.filter { $0.id >= RenderID.rim + 700 && $0.id < RenderID.flowGlow }
        #expect(signals.contains { $0.color == .accent })
    }

    @Test func aStrikeFlushesTheRimRed() {
        let session = makeSession(config: quietConfig { $0.maxStrikes = 3 })
        session.advance([.confirm])
        crashNextCar(session)
        let signals = session.advance().renderList.items.filter { $0.id >= RenderID.rim + 700 && $0.id < RenderID.flowGlow }
        #expect(signals.contains { $0.color == .destructive })
    }

    // MARK: - Spatial labels

    @Test func theWarningFloatsOverTheArmTheCriminalComesFrom() {
        let session = chaseSession(police: false)
        session.advance([.confirm])
        for _ in 0..<(30 * 60) {
            session.advance()
            guard case let .warning(arm, _) = session.world.criminal.phase else { continue }
            session.run(seconds: 0.5)
            let list = session.advance().renderList
            guard let tag = list.items.first(where: { if case .text(Strings.HUD.wanted, _, _, _, _) = $0.primitive { true } else { false } }),
                  case let .text(_, position, _, _, _) = tag.primitive else {
                Issue.record("no WANTED label while announced")
                return
            }
            // Outside the ring, on the side of its arm; not on the island.
            let center = list.camera.toScreen(.zero)
            let away = position - center
            #expect(away.length > list.camera.toScreen(length: session.world.layout.ringRadius))
            let armOnScreen = list.camera.toScreen(arm.outward) - center
            #expect(away.dot(armOnScreen) > 0)
            return
        }
        Issue.record("no warning")
    }

    // MARK: - No screen between shifts

    @Test func theResultTurnsIntoTheNextShiftByItself() {
        let session = makeSession(config: quietConfig(cars: 2))
        session.advance([.confirm])
        finishShift(session)
        session.run(seconds: GameSession.resultDelay + 0.1) { $0.isShowingResult }
        var texts = session.advance().texts
        #expect(texts.contains(Strings.Result.levelComplete(1)))
        // The money counts up to the new balance in the card's left column.
        session.run(seconds: ResultBanner.countDelay + ResultBanner.countDuration + 0.2)
        texts = session.advance().texts
        #expect(texts.contains(Strings.HUD.moneyLabel))
        #expect(texts.contains(session.format.number(session.save.career.money)))
        session.run(seconds: ResultBanner.epilogue + ResultBanner.fade)
        texts = session.advance().texts
        // Still the result (a tap starts the next shift), but it reads like the next shift's
        // waiting screen: its cars and duty, and no score left over.
        #expect(session.isShowingResult)
        #expect(texts.contains(Strings.HUD.cars(2)))
        #expect(texts.contains(Strings.Ready.dutyCaption(.normal, pay: session.config.highAlertPay)))
        #expect(!texts.contains(Strings.Result.levelComplete(1)))
        #expect(texts.contains(Strings.Result.nextLevel(2)))
    }

    @Test func theResultKeepsTheTopCardsSize() {
        let session = makeSession(config: quietConfig(cars: 1))
        session.advance([.confirm])
        finishShift(session)
        session.run(seconds: GameSession.resultDelay + 0.1) { $0.isShowingResult }
        session.run(seconds: 0.5)
        let frame = TopBar.frame(width: viewport.x)
        let card = session.advance().renderList.items.first { $0.color == .chrome }
        guard case let .roundedRect(_, size, _, _) = card?.primitive else {
            Issue.record("no card")
            return
        }
        #expect(size.y == frame.height)
    }

    @Test func theMoneyCountsUpWhenTheShiftEarnsIt() {
        var saved = SaveGame()
        saved.career.money = 500
        let session = makeSession(config: quietConfig(cars: 1), store: MemorySaveStore(saved))
        session.advance([.confirm])
        #expect(session.advance().texts.contains("500"))
        // The last car brings the shift's pay: the balance counts up to it while still playing.
        finishShift(session)
        let pay = session.save.career.money - 500
        #expect(pay > 0)
        session.run(seconds: 0.8)
        #expect(session.screen == .playing)
        let shown = session.advance().renderList.items.compactMap { item -> Int? in
            guard case let .text(string, position, _, .leading, _) = item.primitive, position.y == TopBar.top + TopBar.valueRow else { return nil }
            return Int(string.replacingOccurrences(of: ",", with: ""))
        }
        #expect(shown.contains { $0 > 500 && $0 <= 500 + pay })
    }

    // MARK: - The city breathes

    @Test func theCityIsBusierInRushHourAndCalmWhenEmpty() {
        var world = World(config: quietConfig(), seed: 1)
        let calm = CityPulse.energy(world: world, flow: 0)
        for index in 0..<10 {
            world.spawnRingCar(at: Double(index) * 60, exitArm: world.layout.arm(2))
        }
        let busy = CityPulse.energy(world: world, flow: 0)
        #expect(busy > calm)
        #expect(CityPulse.energy(world: world, flow: 1) > busy)
    }

    @Test func thePhasesRunOnWithoutJumpsWhenThePaceChanges() {
        var pulse = CityPulse()
        pulse.advance(by: 1, target: 0)
        let before = pulse.sway(3)
        pulse.advance(by: 1.0 / 60, target: 1)
        #expect((pulse.sway(3) - before).length < 0.2)
    }

    @Test func inTheFlowACarSendsLightThroughTheCity() {
        var pulse = CityPulse()
        pulse.beat(flow: 1)
        pulse.advance(by: 0.5, target: 0.5)
        let front = 0.5 * CityPulse.beatSpeed
        #expect(pulse.window(1, distance: front) > pulse.window(1, distance: front + 300) + 0.1)
        // Without the flow nothing answers.
        var calm = CityPulse()
        calm.beat(flow: 0)
        #expect(calm.sinceBeat == .infinity)
    }

    // MARK: - Collection shelves

    @Test func aNewShelfSwipesInAndTheOldOneOut() {
        let session = makeSession()
        session.advance([.selectTab(.shop), .tapShop(.section(.collection))])
        session.run(seconds: 1)
        session.advance([.tapShop(.shelf(.rare))])
        #expect(session.shopPage.shelfSlide?.from == .common)
        // The old shelf is drawn once more while it slides out…
        let during = session.advance().renderList.items
        #expect(during.contains { (RenderID.shopShelfSlide..<RenderID.shopShelfSlide + 10_000).contains($0.id) })
        // …and gone once the new one has settled.
        session.run(seconds: ShopPage.slideDuration + 0.1)
        #expect(session.shopPage.shelfSlide == nil)
        #expect(!session.advance().renderList.items.contains { $0.id >= RenderID.shopShelfSlide })
    }

    // MARK: - One city, several views

    @Test func theStreetBuilderLooksAtTheRealRingUnderItsPlan() {
        let layout = RoundaboutLayout(config: Config())
        let camera = Perspective.builder.camera(layout: layout, viewport: viewport, bottomInset: TabStrip.height)
        let map = StreetBuilderPage.map(viewport: viewport, bottomInset: TabStrip.height)
        #expect((camera.toScreen(.zero) - map.center).length < 0.001)
        #expect(abs(camera.toScreen(length: layout.ringRadius) - map.radius) < 0.001)
    }

    @Test func theCameraGlidesBetweenTabs() {
        let session = makeSession()
        let street = session.advance().renderList.camera
        session.advance([.selectTab(.shop)])
        let moving = session.advance().renderList.camera
        session.run(seconds: Perspective.glide + 0.1)
        let shop = session.advance().renderList.camera
        #expect(moving != street && moving != shop)
        #expect(shop.scale < street.scale)
        // Back on the Game tab it glides home again.
        session.advance([.selectTab(.game)])
        session.run(seconds: Perspective.glide + 0.1)
        #expect(session.advance().renderList.camera == street)
    }

    @Test func reduceMotionCutsTheCameraInsteadOfGliding() {
        var saved = SaveGame()
        saved.settings.reduceMotion = .on
        let session = makeSession(store: MemorySaveStore(saved))
        session.advance()
        session.advance([.selectTab(.shop)])
        let camera = session.advance().renderList.camera
        let layout = session.world.layout
        #expect(camera == Perspective.shop.camera(layout: layout, viewport: viewport, bottomInset: TabStrip.height))
    }

    @Test func upgradesLetTheCityRecedeButNotTheRing() {
        let session = makeSession()
        session.advance([.selectTab(.upgrades)])
        session.run(seconds: 1)
        let list = session.advance().renderList
        let recede = list.items.filter { (RenderID.recede..<RenderID.recede + 20).contains($0.id) }
        #expect(!recede.isEmpty)
        // It starts outside the ring's outer kerb.
        let ring = list.camera.toScreen(length: session.world.layout.ringRadius + session.world.layout.laneWidth / 2)
        for item in recede {
            guard case let .arc(_, radius, thickness, _, _) = item.primitive else { continue }
            #expect(radius - thickness / 2 >= ring)
        }
    }
}
