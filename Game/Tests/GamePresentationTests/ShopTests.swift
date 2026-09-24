import Testing
@testable import GameCore
@testable import GamePresentation

@Suite("Shop (M10)")
struct ShopTests {
    func shopSession(money: Int = 0, chests: [ChestKind] = [], collection: [String] = []) -> (GameSession, MemorySaveStore) {
        var game = SaveGame()
        game.career.money = money
        game.career.chests = chests
        game.career.collection = collection
        let store = MemorySaveStore()
        store.save(game)
        let session = makeSession(store: store)
        session.advance([.selectTab(.shop)])
        return (session, store)
    }

    @Test func earnedChestsAreNotForSale() {
        let config = Config()
        var career = Career(level: 1, money: config.standardChestPrice)
        let hunt = career.buyChest(.criminalHunt, config: config)
        let standard = career.buyChest(.standard, config: config)
        #expect(!hunt && standard)
        #expect(career.money == 0)
        #expect(career.chests == [.standard])
        let broke = career.buyChest(.standard, config: config)
        #expect(!broke)
    }

    @Test func buyingAndOpeningShowsTheReveal() {
        let price = Config().standardChestPrice
        let (session, store) = shopSession(money: price + 1_000)
        session.advance([.tapShop(.buy(.standard))])
        #expect(store.game?.career.chests == [.standard])
        #expect(store.game?.career.money == 1_000)
        session.advance([.tapShop(.open(.standard))])
        #expect(session.shopPage.opening != nil)
        #expect(store.game?.career.chests.isEmpty == true)
        #expect(store.game?.career.collection.count == 1)
        session.advance([.tapShop(.dismiss)])
        #expect(session.shopPage.opening == nil)
    }

    @Test func notEnoughMoneyIsRefused() {
        let (session, store) = shopSession(money: 100)
        session.advance([.tapShop(.buy(.standard))])
        #expect(store.game?.career.chests.isEmpty == true)
        #expect(session.shopPage.denied > 0)
    }

    @Test func aSecondTapOnAnOwnedItemWearsIt() {
        let (session, store) = shopSession(collection: ["sunset"])
        session.advance([.tapShop(.section(.collection))])
        #expect(session.shopPage.section == .collection)
        session.advance([.tapShop(.item("sunset"))])
        #expect(store.game?.career.carSkins.isEmpty == true)
        session.advance([.tapShop(.item("sunset"))])
        #expect(store.game?.career.carSkins == ["sunset"])
        // Items not owned are only shown.
        session.advance([.tapShop(.item("gold")), .tapShop(.item("gold"))])
        #expect(store.game?.career.carSkins == ["sunset"])
    }

    @Test func theLayoutHitsWhatItDraws() {
        let viewport = Vec2(390, 844)
        let career = Career()
        var state = ShopPage.State()
        let targets = ShopPage.targets(viewport: viewport, bottomInset: TabStrip.height, career: career, state: state)
        for (target, rect) in targets {
            #expect(ShopPage.target(at: rect.center, viewport: viewport, bottomInset: TabStrip.height, career: career, state: state) == target)
        }
        state.section = .collection
        let items = ShopPage.targets(viewport: viewport, bottomInset: TabStrip.height, career: career, state: state)
        #expect(items.filter { if case .item = $0.0 { true } else { false } }.count == Cosmetics.all.count)
    }

    @Test func thePageDraws() {
        let (session, _) = shopSession(money: 9_000, chests: [.premium], collection: ["neon", "sportsCar"])
        for section in ShopPage.Section.allCases {
            session.advance([.tapShop(.section(section))])
            let texts = session.advance().texts
            #expect(texts.contains { $0.hasPrefix(Strings.Shop.section(section)) })
        }
    }

    @Test func thePlaceholderAdPaysAChestAfterItRuns() {
        let (session, store) = shopSession()
        session.advance([.tapShop(.watchAd)])
        #expect(session.shopPage.ad != nil)
        session.run(seconds: ShopPage.adDuration + 0.2) { $0.shopPage.ad == nil }
        #expect(store.game?.career.chests == [.standard])
        #expect(session.shopPage.ad == nil)
    }

    @Test func skinsPaintEveryNormalCarButNeverTheSpecialOnes() {
        let skins = ["gold", "mint"]
        let looks = (1...40).compactMap { Skins.look(forVehicle: $0, skins: skins)?.paint }
        #expect(Set(looks) == [.skinGold, .skinMint])
        #expect(Skins.finish("diamond") == .shinyGlitter)
        #expect(Skins.finish("chrome") == .shiny)
        #expect(Skins.finish("gold") == nil)
    }
}
