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
        // The first tap skips the build-up to the burst, the second one closes.
        session.advance([.tapShop(.dismiss)])
        #expect(session.shopPage.opening != nil)
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
        for shelf in ShopPage.Shelf.allCases {
            state.shelf = shelf
            let targets = ShopPage.targets(viewport: viewport, bottomInset: TabStrip.height, career: career, state: state)
            #expect(targets.filter { if case .item = $0.0 { true } else { false } }.count == shelf.items.count)
            for (target, rect) in targets {
                #expect(ShopPage.target(at: rect.center, viewport: viewport, bottomInset: TabStrip.height, career: career, state: state) == target)
            }
        }
    }

    /// Leo, 25.09.2026: more skins. The collection stays readable: every item sits on
    /// exactly one shelf, and no shelf holds more than its twelve cells.
    @Test func everyItemSitsOnOneShelfAndEveryShelfFits() {
        for item in Cosmetics.all {
            #expect(ShopPage.Shelf.allCases.count(where: { $0.items.contains(item) }) == 1, "\(item.id)")
            #expect(ShopPage.Shelf.of(item).items.contains(item))
        }
        for shelf in ShopPage.Shelf.allCases {
            #expect(!shelf.items.isEmpty && shelf.items.count <= 12, "\(shelf)")
        }
        let (session, _) = shopSession(collection: ["neon"])
        session.advance([.tapShop(.section(.collection)), .tapShop(.shelf(.maps))])
        #expect(session.shopPage.shelf == .maps)
        #expect(session.advance().texts.contains(Strings.Shop.item("neon")))
    }

    @Test func theCollectionWaitsOnTheItemJustOpened() {
        let (session, store) = shopSession(chests: [.premium])
        session.advance([.tapShop(.open(.premium))])
        let item = store.game?.career.collection.first.flatMap(Cosmetics.item)
        #expect(item != nil)
        #expect(session.shopPage.selectedItem == item?.id)
        #expect(session.shopPage.shelf == item.map(ShopPage.Shelf.of))
    }

    @Test func twoToneSkinsPaintTheRoofInTheirSecondColour() {
        let config = Config()
        for (skin, roof) in [("panda", ColorToken.skinCarbon), ("koi", .skinKoi), ("mocha", .skinCream)] {
            var list = RenderList(camera: Camera(viewport: Vec2(400, 800), center: .zero, focus: Vec2(200, 400), scale: 1), background: .background)
            let look = Skins.look(forVehicle: 1, skins: [skin])
            #expect(look?.roof == roof)
            CarArt.add(id: 1, type: .car, pose: Path.Pose(position: .zero, heading: 0), dents: [], skin: look?.paint, stripe: look?.stripe, roof: look?.roof, config: config, to: &list)
            #expect(list.items.contains { $0.id == RenderID.vehicle(1, part: CarArt.Slot.twoTone) && $0.color == roof }, "\(skin)")
        }
        // Never on the special vehicles: their roof is information.
        var list = RenderList(camera: Camera(viewport: Vec2(400, 800), center: .zero, focus: Vec2(200, 400), scale: 1), background: .background)
        CarArt.add(id: 1, type: .police, pose: Path.Pose(position: .zero, heading: 0), dents: [], roof: .skinKoi, config: config, to: &list)
        #expect(!list.items.contains { $0.id == RenderID.vehicle(1, part: CarArt.Slot.twoTone) })
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
