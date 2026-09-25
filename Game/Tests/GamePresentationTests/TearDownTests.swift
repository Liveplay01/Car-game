import Testing
@testable import GameCore
@testable import GamePresentation

/// Built parts can be torn down again (Leo, 25.09.2026): one tap marks, a second tears down.
@Suite("Street builder: tearing down")
struct TearDownTests {
    func builder(_ adjust: (inout Career) -> Void) -> GameSession {
        var saved = SaveGame()
        adjust(&saved.career)
        let session = makeSession(store: MemorySaveStore(saved))
        session.advance([.selectTab(.streetBuilder)])
        session.advance()
        return session
    }

    var map: (center: Vec2, radius: Double) { StreetBuilderPage.map(viewport: viewport, bottomInset: TabStrip.height) }

    @Test func anArmBeyondTheFirstFourIsMarkedThenTornDownWithoutARefund() {
        let session = builder { $0.armSlots = [0, 2, 4, 8, 12]; $0.money = 5_000 }
        let at = StreetBuilderPage.slotPosition(2, slots: session.config.armSlotCount, map: map)
        session.advance([.pointerDown(at)])
        #expect(session.builderPage.marked?.part == .arm(slot: 2))
        #expect(session.save.career.armSlots.contains(2))
        session.advance([.pointerDown(at)])
        #expect(session.save.career.armSlots == [0, 4, 8, 12])
        #expect(session.save.career.money == 5_000)
        #expect(session.builderPage.tornDown?.part == .arm(slot: 2))
        // It is gone from the next shift too.
        #expect(session.world.config.armSlots == [0, 4, 8, 12])
    }

    @Test func aTapBesideEverythingLetsTheMarkGo() {
        let session = builder { $0.armSlots = [0, 2, 4, 8, 12] }
        session.advance([.pointerDown(StreetBuilderPage.slotPosition(2, slots: session.config.armSlotCount, map: map))])
        session.advance([.pointerDown(map.center)])
        #expect(session.builderPage.marked == nil)
        #expect(session.save.career.armSlots.count == 5)
    }

    @Test func theRoundaboutKeepsFourArmsAndThePlayersOwn() {
        let session = builder { _ in }
        let slots = session.config.armSlotCount
        for slot in [0, 4] {
            session.advance([.pointerDown(StreetBuilderPage.slotPosition(slot, slots: slots, map: map))])
            session.advance([.pointerDown(StreetBuilderPage.slotPosition(slot, slots: slots, map: map))])
        }
        #expect(session.save.career.armSlots == [0, 4, 8, 12])
        var career = Career()
        career.armSlots = [0, 2, 4, 8, 12]
        let own = career.removeArm(inSlot: 0)
        let fifth = career.removeArm(inSlot: 8)
        let belowFour = career.removeArm(inSlot: 4)
        #expect(!own)
        #expect(fifth)
        #expect(!belowFour)
    }

    @Test func aModuleIsTornDownTheSameWay() {
        let session = builder { $0.modules = [1: .tollBooth] }
        let at = StreetBuilderPage.moduleSlotPosition(1, count: session.config.moduleSlotCount, map: map)
        session.advance([.pointerDown(at)])
        #expect(session.builderPage.marked?.part == .module(slot: 1))
        session.advance([.pointerDown(at)])
        #expect(session.save.career.modules.isEmpty)
        #expect(session.builderPage.tornDown?.module == .tollBooth)
    }

    @Test func everyMapSkinHasItsOwnGroundAndPlants() {
        let maps = Cosmetics.all.filter { $0.kind == .mapSkin }
        #expect(!maps.isEmpty)
        for map in maps {
            let theme = MapTheme(skin: map.id)
            #expect(theme != nil, "\(map.id)")
            #expect(MapTheme.ground(theme) != .background, "\(map.id)")
        }
        #expect(MapTheme.ground(MapTheme(skin: nil)) == .background)
        // Worn, the ground outside the ring changes; the HUD band melts into it.
        var saved = SaveGame()
        saved.career.mapSkin = "sand"
        let session = makeSession(store: MemorySaveStore(saved))
        #expect(session.advance().renderList.background == .groundSand)
    }

    /// Leo, 25.09.2026: Sakura with a Japanese feel — a koi pond with its torii, cherry
    /// avenues, petals on the wind. What the wind carries moves with the scene's clock and
    /// stops for Reduce Motion; every map lines its roads.
    @Test func mapsBringTheirPlacesAndTheirWeather() {
        var saved = SaveGame()
        saved.career.mapSkin = "sakura"
        let session = makeSession(store: MemorySaveStore(saved))
        let first = session.advance().renderList.items
        #expect(first.contains { $0.color == .torii })
        #expect(first.contains { $0.color == .water })
        let petals = first.filter { (RenderID.mapAir..<RenderID.towTrucks).contains($0.id) }
        #expect(petals.count > 20)
        session.run(seconds: 0.5) { _ in false }
        let later = session.advance().renderList.items.filter { (RenderID.mapAir..<RenderID.towTrucks).contains($0.id) }
        #expect(later.map(\.primitive) != petals.map(\.primitive))
        session.systemReduceMotion = true
        #expect(!session.advance().renderList.items.contains { (RenderID.mapAir..<RenderID.towTrucks).contains($0.id) })

        for map in MapTheme.allCases {
            var saved = SaveGame()
            saved.career.mapSkin = map.rawValue
            let items = makeSession(store: MemorySaveStore(saved)).advance().renderList.items
            #expect(items.contains { (RenderID.mapPlants..<RenderID.mapIsland).contains($0.id) }, "\(map) has no avenue")
        }
    }

    /// The app draws every shape itself (SwiftUI Canvas), each frame. A map may dress the
    /// city up, but not at any price: a full city on every map stays within a budget.
    @Test func everyMapStaysWithinItsDrawingBudget() {
        for map in MapTheme.allCases {
            var saved = SaveGame()
            saved.career.mapSkin = map.rawValue
            saved.career.level = 20
            saved.career.armSlots = [0, 4, 8, 12, 14, 2, 6]
            let items = makeSession(store: MemorySaveStore(saved)).advance().renderList.items
            #expect(items.count < 1_200, "\(map): \(items.count) shapes")
        }
    }

    @Test func moneyInATextIsANoteNotAWord() {
        #expect(!Strings.money("2,000").contains("cash"))
        #expect(Icons.pieces(Strings.Notice.notEnoughMoney("2,000")).contains(.money))
        #expect(Icons.pieces("Duplicate · +\(Strings.money("250"))") == [.text("Duplicate · +"), .money, .text("250")])
    }
}
