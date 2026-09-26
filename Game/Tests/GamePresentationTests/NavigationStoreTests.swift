import Foundation
import Testing
@testable import GameCore
@testable import GamePresentation

@Suite("Build tab and Progress tab (Leo, 26.09.2026)")
struct BuildAndProgressTabTests {
    @Test func theBuildTabHoldsUpgradesAndTheStreetBuilder() {
        let session = makeSession()
        session.advance([.selectTab(.upgrades)])
        #expect(session.screen == .page(.upgrades))
        // Its segment switches to the Street Builder; the tab bar still shows Build.
        let rect = BuildTab.segmentsRect(viewport: viewport)
        let builderSegment = Vec2(rect.maxX - 10, rect.center.y)
        let action = session.pageAction(at: builderSegment, viewport: viewport)
        #expect(action == .perform(.showTab(.streetBuilder)))
        session.advance([action!])
        #expect(session.screen == .page(.streetBuilder))
        #expect(session.screen.tab.barTab == .upgrades)
        // Away and back: the Build tab opens where it was left.
        session.advance([.selectTab(.shop)])
        session.advance([.selectTab(.upgrades)])
        #expect(session.screen == .page(.streetBuilder))
        // Its own tab again does nothing.
        session.advance([.selectTab(.upgrades)])
        #expect(session.screen == .page(.streetBuilder))
    }

    @Test func switchingBuildPagesKeepsTheChromeStill() {
        let session = makeSession()
        session.advance([.selectTab(.upgrades)])
        session.run(seconds: 1)
        session.advance([.perform(.showTab(.streetBuilder))])
        let items = session.advance().renderList.items
        // Exactly one header, standing still: the old page's chrome is not drawn again,
        // fading, under the new one (the tab strip's label aside).
        let titles = items.filter { item in
            if case let .text(text, _, _, _, _) = item.primitive { return text == Strings.Tabs.title(.upgrades) }
            return false
        }
        #expect(titles.filter(BuildTab.isChrome).count == 1)
        #expect(titles.filter(BuildTab.isChrome).allSatisfy { $0.opacity == 1 })
        #expect(!titles.contains { $0.id >= RenderID.transition })
    }

    @Test func theProgressTabSwitchesItsSections() {
        var game = SaveGame()
        game.highscore = 12_345
        game.career.mastery.perfects = 30
        game.career.masteryTiers[MasteryGoal.perfectTiming.rawValue] = 1
        let session = makeSession(store: MemorySaveStore(game))
        session.advance([.selectTab(.progress)])
        #expect(session.screen == .page(.progress))
        session.run(seconds: 1)
        var texts = session.advance().texts
        #expect(texts.contains("12,345"))
        #expect(texts.contains(Strings.Progress.highscore))
        for section in ProgressPage.Section.allCases {
            session.advance([.tapProgress(.section(section))])
            #expect(session.progressPage.section == section)
        }
        session.run(seconds: 1)
        texts = session.advance().texts
        #expect(texts.contains(Strings.Mastery.name(.perfectTiming)))
        // The next tier of a goal with one tier reached.
        #expect(texts.contains(Strings.Mastery.detail(.perfectTiming, tier: 1)))
        session.advance([.tapProgress(.section(.quests))])
        session.run(seconds: 1)
        #expect(session.advance().texts.contains(Strings.Daily.title))
    }

    @Test func theGameTabsTopCardLeadsToTheShopAndTheRecords() {
        let columns = TopBar.columns(TopBar.frame(width: viewport.x))
        let cases: [(Vec2, Screen, ShopPage.Section?, ProgressPage.Section?)] = [
            (columns.left.center, .page(.shop), .store, nil),
            (columns.center.center, .page(.shop), .collection, nil),
            (columns.right.center, .page(.progress), nil, .records),
        ]
        for (point, screen, shop, progress) in cases {
            let session = makeSession()
            session.advance()
            let action = session.pageAction(at: point, viewport: viewport)
            #expect(action != nil)
            session.advance([action!])
            #expect(session.screen == screen)
            if let shop { #expect(session.shopPage.section == shop) }
            if let progress { #expect(session.progressPage.section == progress) }
        }
        // Beside the card a tap still starts the shift.
        let session = makeSession()
        #expect(session.pageAction(at: viewport / 2, viewport: viewport) == nil)
    }

    @Test func aTapOnTheProgressSegmentsHitsThem() {
        let session = makeSession()
        session.advance([.selectTab(.progress)])
        let layout = ProgressPage.layout(viewport: viewport, bottomInset: TabStrip.height)
        let achievements = layout.segments.last!.1.center
        let action = session.pageAction(at: achievements, viewport: viewport)
        #expect(action == .tapProgress(.section(.achievements)))
    }
}

@Suite("Game modes (Leo, 26.09.2026)")
struct GameModeTests {
    /// A session past its tutorial, waiting on the Game tab.
    func waiting(_ game: SaveGame = SaveGame()) -> (GameSession, MemorySaveStore) {
        var game = game
        game.tutorialDone = true
        let store = MemorySaveStore(game)
        let session = makeSession(store: store)
        session.advance()
        return (session, store)
    }

    @Test func aSwipeSlidesTheMapToTheNextModesRoundabout() {
        let (session, store) = waiting()
        #expect(session.gameMode == .shift)
        let before = session.advance().renderList.camera.focus
        // The map follows the finger.
        session.advance([.pointerDown(Vec2(300, 400))])
        session.advance([.pointerMove(Vec2(200, 400))])
        let dragged = session.advance([.pointerMove(Vec2(150, 400))]).renderList.camera.focus
        #expect(abs(dragged.x - before.x + 150) < 1)
        // Let go far enough: it travels on, and the new roundabout clicks into place.
        session.advance([.pointerUp(Vec2(150, 400))])
        session.run(seconds: 1.5)
        #expect(session.gameMode == .unlimited)
        #expect(store.game?.mode == .unlimited)
        #expect(session.world.config.endless)
        #expect(session.screen == .ready)
        let settled = session.advance().renderList.camera.focus
        #expect(abs(settled.x - before.x) < 0.5)
    }

    @Test func theNewModePopsUpAsAMessage() {
        let (session, _) = waiting()
        session.advance([.swipeMode(1)])
        session.run(seconds: 0.5) { $0.gameMode == .unlimited }
        session.run(seconds: 0.3)
        #expect(session.advance().texts.contains(Strings.Modes.line(.unlimited)))
        // It goes again after a moment.
        session.run(seconds: ModeBanner.duration + 0.2)
        #expect(!session.advance().texts.contains(Strings.Modes.line(.unlimited)))
    }

    @Test func aShortDragSpringsBackAndATapStillStarts() {
        let (session, _) = waiting()
        session.advance([.pointerDown(Vec2(300, 400))])
        session.advance([.pointerMove(Vec2(260, 400))])
        session.run(seconds: 0.3)
        session.advance([.pointerUp(Vec2(260, 400))])
        session.run(seconds: 1)
        #expect(session.gameMode == .shift)
        #expect(session.screen == .ready)
        // A short press is a tap: the shift starts.
        session.advance([.pointerDown(Vec2(200, 400))])
        session.advance([.pointerUp(Vec2(203, 400))])
        #expect(session.screen == .playing)
    }

    @Test func theArrowKeysTravelToo() {
        let (session, _) = waiting()
        session.advance([.swipeMode(1)])
        session.run(seconds: 1.5)
        session.advance([.swipeMode(1)])
        session.run(seconds: 1.5)
        #expect(session.gameMode == .mayhem)
        // Past the last mode nothing happens.
        session.advance([.swipeMode(1)])
        session.run(seconds: 1.5)
        #expect(session.gameMode == .mayhem)
    }

    @Test func unlimitedKeepsItsOwnBest() {
        let (session, store) = waiting()
        session.advance([.perform(.setGameMode(.unlimited))])
        #expect(session.playingMode == .unlimited)
        #expect(session.world.carsLeft == nil)
        session.advance([.tap])
        session.run(seconds: 1)
        crashNextCar(session)
        session.run(seconds: 6) { $0.isShowingResult }
        #expect(session.isShowingResult)
        // An Unlimited run only ends lost: its best is its own, the highscore stays.
        #expect(store.game?.unlimitedBestCars ?? 0 >= 2)
        #expect(store.game?.highscore == 0)
        #expect(store.game?.career.level == 1)
    }

    @Test func mayhemBurnsAndCountsForNothingElse() {
        var game = SaveGame()
        game.career.money = 5_000
        let (session, store) = waiting(game)
        session.advance([.perform(.setGameMode(.mayhem))])
        #expect(session.world.config.mayhem)
        #expect(session.world.carsLeft == session.config.mayhemCars)
        #expect(session.advance().texts.contains(Strings.Mayhem.caption))
        session.advance([.tap])
        session.run(seconds: 1)
        crashNextCar(session)
        // A crash burns and the run goes on.
        #expect(session.screen == .playing)
        #expect(session.world.score.flames >= 1)
        // To the end: every car in.
        finishShift(session)
        session.run(seconds: 6) { $0.isShowingResult }
        #expect(session.isShowingResult)
        // Its own best, and nothing else: no money, no level, no stats.
        #expect(store.game?.mayhemBest ?? 0 >= 1)
        #expect(store.game?.career.money == 5_000)
        #expect(store.game?.career.level == 1)
        #expect(store.game?.shiftsPlayed == 0)
        #expect(store.game?.career.mastery == MasteryStats())
        #expect(store.game?.highscore == 0)
    }

    @Test func theTutorialHasNoModes() {
        let session = makeSession()
        session.advance([.swipeMode(1)])
        session.run(seconds: 1)
        #expect(session.gameMode == .shift)
        // A touch counts at once: the first shift starts.
        session.advance([.pointerDown(Vec2(200, 400))])
        #expect(session.screen == .playing)
    }

    @Test func anOldSaveWithUnlimitedStillLoadsIt() throws {
        let data = Data(#"{"unlimited": true, "tutorialDone": true}"#.utf8)
        let game = try JSONDecoder().decode(SaveGame.self, from: data)
        #expect(game.mode == .unlimited)
    }
}

@Suite("Store (MONETIZATION.md)")
struct StoreSessionTests {
    func storeSession(career: Career = Career()) -> (GameSession, MemorySaveStore) {
        var game = SaveGame()
        game.career = career
        let store = MemorySaveStore(game)
        let session = makeSession(store: store)
        session.advance([.selectTab(.shop)])
        session.advance([.tapShop(.section(.store))])
        return (session, store)
    }

    @Test func thePlaceholderPurchaseDeliversAfterItsSheet() {
        let (session, store) = storeSession()
        session.advance([.tapShop(.purchase(.cashMedium))])
        #expect(session.shopPage.purchase?.product == .cashMedium)
        #expect(store.game?.career.money == 0)
        // Nothing else takes a tap while it runs.
        #expect(ShopPage.target(at: viewport / 2, viewport: viewport, bottomInset: TabStrip.height, career: session.save.career, state: session.shopPage) == nil)
        session.run(seconds: ShopPage.purchaseDuration + 0.2) { $0.shopPage.purchase == nil }
        #expect(store.game?.career.money == Config().cashMediumAmount)
    }

    @Test func aOneTimeProductCannotBeBoughtTwice() {
        let (session, store) = storeSession()
        session.purchased(.starterPack)
        #expect(store.game?.career.hasPurchased(.starterPack) == true)
        session.advance([.tapShop(.purchase(.starterPack))])
        #expect(session.shopPage.purchase == nil)
        #expect(store.game?.career.money == Config().starterPackMoney)
    }

    @Test func tappingTheChosenOfferAgainBuysIt() {
        let (session, _) = storeSession()
        session.advance([.tapShop(.offer(.product(.noAds)))])
        #expect(session.shopPage.selectedOffer == .product(.noAds))
        #expect(session.shopPage.purchase == nil)
        session.advance([.tapShop(.offer(.product(.noAds)))])
        #expect(session.shopPage.purchase?.product == .noAds)
    }

    @Test func aCashAdPaysAndNoAdsSkipsTheAd() {
        let (session, store) = storeSession(career: Career(level: 5))
        let cash = store.game!.career.adCash(config: session.config)
        session.advance([.tapShop(.watchCashAd)])
        #expect(session.shopPage.ad != nil && session.shopPage.adReward == .cash)
        session.run(seconds: ShopPage.adDuration + 0.2) { $0.shopPage.ad == nil }
        #expect(store.game?.career.money == cash)

        // With No Ads the reward comes at once.
        session.purchased(.noAds)
        session.advance([.tapShop(.watchCashAd)])
        #expect(session.shopPage.ad == nil)
        #expect(store.game?.career.money == 2 * cash)
        session.advance([.tapShop(.watchAd)])
        #expect(store.game?.career.chests == [.standard])
    }

    @Test func restoringWithoutAnAppStoreFindsNothing() {
        let (session, store) = storeSession()
        session.advance([.tapShop(.restore)])
        #expect(store.game?.career.purchases.isEmpty == true)
        session.restored([.cashBoost])
        #expect(store.game?.career.hasPurchased(.cashBoost) == true)
    }

    @Test func theStoreDraws() {
        let (session, _) = storeSession()
        session.run(seconds: 1)
        let texts = session.advance().texts
        for product in StoreProduct.allCases {
            #expect(texts.contains(Strings.Store.name(product)))
        }
        #expect(texts.contains(Strings.Store.freeCash))
        #expect(texts.contains(Strings.Store.placeholderNote))
    }
}
