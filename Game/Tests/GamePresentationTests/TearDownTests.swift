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

    @Test func moneyInATextIsANoteNotAWord() {
        #expect(!Strings.money("2,000").contains("cash"))
        #expect(Icons.pieces(Strings.Notice.notEnoughMoney("2,000")).contains(.money))
        #expect(Icons.pieces("Duplicate · +\(Strings.money("250"))") == [.text("Duplicate · +"), .money, .text("250")])
    }
}
