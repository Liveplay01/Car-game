import Foundation
import Testing
@testable import GameCore

@Suite("Mastery, chests and vehicle types (M10)")
struct CollectionTests {
    func result(_ outcome: ShiftOutcome = .completed, perfects: Int = 0, takedowns: Int = 0) -> ShiftResult {
        var result = ShiftResult(outcome: outcome, score: 0, completionBonus: 0, bestCombo: 0, cleanMerges: 0, tightFits: 0, cutOffs: 0, crashes: 0, policeCrashes: 0, takedowns: takedowns, transporters: 0, money: 0, seed: 1, time: 10)
        result.perfects = perfects
        return result
    }

    @Test func masteryEarnsAChestPerTierOnce() {
        var career = Career()
        let first = career.recordMastery(result(perfects: 30), duty: .normal)
        #expect(first.contains { $0.goal == .perfectTiming && $0.tier == 0 && $0.chest == .standard })
        #expect(career.chests.contains(.standard))
        let chests = career.chests.count
        // The same tier is never paid twice.
        let again = career.recordMastery(result(perfects: 1), duty: .normal)
        #expect(!again.contains { $0.goal == .perfectTiming })
        #expect(career.chests.count == chests)
    }

    @Test func theCrimeFighterEarnsCriminalHuntChests() {
        var career = Career()
        career.recordMastery(result(takedowns: 10), duty: .normal)
        #expect(career.chests.contains(.criminalHunt))
    }

    @Test func oddsAreCompleteForEveryChest() {
        for kind in ChestKind.allCases {
            #expect(abs(kind.odds.reduce(0, +) - 1) < 1e-9)
            #expect(kind.odds.count == Rarity.allCases.count)
        }
    }

    @Test func chestsOnlyHoldCosmeticsAndTypes() {
        var career = Career()
        career.chests = Array(repeating: .premium, count: 40)
        for _ in 0..<40 {
            let opening = career.openChest(at: 0, seed: 3)
            #expect(opening != nil)
        }
        #expect(career.collection.allSatisfy { Cosmetics.item($0) != nil })
        #expect(career.chests.isEmpty)
    }

    @Test func pityGuaranteesAnEpic() {
        var career = Career()
        career.chests = Array(repeating: .standard, count: Career.pityChests)
        var best = Rarity.common
        for _ in 0..<Career.pityChests {
            best = max(best, career.openChest(at: 0, seed: 11)!.item.rarity)
        }
        #expect(best >= .epic)
    }

    @Test func aDuplicatePaysMoney() {
        var career = Career()
        career.collection = Cosmetics.all.map(\.id)
        career.chests = [.standard]
        let opening = career.openChest(at: 0, seed: 5)!
        #expect(opening.isDuplicate)
        #expect(career.money == opening.money)
        #expect(opening.money == opening.item.rarity.duplicateMoney)
    }

    @Test func onlyOwnedSkinsCanBeWorn() {
        var career = Career()
        career.wear("gold")
        #expect(career.carSkins.isEmpty)
        career.collection = ["gold", "neon"]
        career.wear("gold")
        career.wear("neon")
        #expect(career.carSkins == ["gold"])
        #expect(career.mapSkin == "neon")
        career.wear("gold")
        #expect(career.carSkins.isEmpty)
    }

    @Test func upToFiveCarSkinsMix() {
        var career = Career()
        let skins = ["racingRed", "midnight", "mint", "pearl", "olive", "coral"]
        career.collection = skins
        for skin in skins.prefix(5) { career.wear(skin) }
        let sixth = career.wear("coral")
        #expect(!sixth)
        #expect(career.carSkins.count == Career.maxCarSkins)
    }

    @Test func anOldSingleSkinLoadsAsTheFirstOfSeveral() throws {
        let old = #"{ "level": 3, "collection": ["gold"], "carSkin": "gold" }"#
        let career = try JSONDecoder().decode(Career.self, from: Data(old.utf8))
        #expect(career.carSkins == ["gold"])
    }

    @Test func adsGiveAFewStandardChestsADay() {
        let config = Config()
        var career = Career()
        for _ in 0..<config.adChestsPerDay {
            let rewarded = career.rewardAd(day: 50, config: config)
            #expect(rewarded)
        }
        let tooMany = career.rewardAd(day: 50, config: config)
        #expect(!tooMany)
        #expect(career.chests.count == config.adChestsPerDay)
        #expect(career.adChestsLeft(day: 51, config: config) == config.adChestsPerDay)
    }

    @Test func standardAndPremiumAreForSale() {
        let config = Config()
        // Everything for sale is 30 % dearer since 25.09.2026 (Leo).
        #expect(config.price(of: .standard) == 26_000)
        #expect(config.price(of: .premium) == 52_000)
        #expect(config.price(of: .criminalHunt) == nil)
        var career = Career(level: 1, money: 52_000)
        let bought = career.buyChest(.premium, config: config)
        #expect(bought && career.money == 0)
    }

    @Test func theSportsCarJoinsTheQueueOnlyOnceUnlocked() {
        var career = Career()
        #expect(career.config(from: Config(), seed: 1).sportsCarShare == 0)
        career.collection = ["sportsCar"]
        let config = career.config(from: Config(), seed: 1)
        #expect(config.sportsCarShare > 0)
        var sporty = config
        sporty.sportsCarShare = 1
        sporty.policeShare = 0
        let world = World(config: sporty, seed: 2, mode: .shift, prefill: false)
        let queued = world.queue.vehicles.compactMap { world.vehicle(id: $0)?.type }
        #expect(queued.allSatisfy { $0 == .sportsCar })
        #expect(world.mergeDuration(of: .sportsCar) < world.mergeDuration(of: .car))
        #expect(world.length(of: .sportsCar) < world.length(of: .car))
    }

    /// The compact and the van (LOOT.md): different, not better. The compact is short but
    /// slow to merge, the van long but quick.
    @Test func theCompactAndTheVanAreFairAndOnlyComeOnceUnlocked() {
        var career = Career()
        let plain = career.config(from: Config(), seed: 1)
        #expect(plain.compactShare == 0 && plain.vanShare == 0)
        career.collection = ["compact", "van"]
        let config = career.config(from: Config(), seed: 1)
        #expect(config.compactShare > 0 && config.vanShare > 0 && config.sportsCarShare == 0)
        var mixed = config
        mixed.policeShare = 0
        mixed.compactShare = 0.5
        mixed.vanShare = 0.5
        let world = World(config: mixed, seed: 2, mode: .shift, prefill: false)
        let queued = world.queue.vehicles.compactMap { world.vehicle(id: $0)?.type }
        #expect(queued.contains(.compact) && queued.contains(.van))
        #expect(queued.allSatisfy { $0 == .compact || $0 == .van })
        #expect(world.length(of: .compact) < world.length(of: .car) && world.mergeDuration(of: .compact) > world.mergeDuration(of: .car))
        #expect(world.length(of: .van) > world.length(of: .car) && world.mergeDuration(of: .van) < world.mergeDuration(of: .car))
        #expect(Cosmetics.all.filter { $0.kind == .vehicleType }.allSatisfy { $0.vehicleType?.isCarType == true })
    }

    @Test func anOldSaveStillLoads() throws {
        let old = #"{ "level": 7, "money": 1200, "upgrades": { "overtime": 2 } }"#
        let career = try JSONDecoder().decode(Career.self, from: Data(old.utf8))
        #expect(career.level == 7)
        #expect(career.chests.isEmpty)
        #expect(career.mastery == MasteryStats())
        let roundTrip = try JSONDecoder().decode(Career.self, from: JSONEncoder().encode(career))
        #expect(roundTrip == career)
    }
}
