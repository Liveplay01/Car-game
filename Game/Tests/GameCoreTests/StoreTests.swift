import Foundation
import Testing
@testable import GameCore

@Suite("Store: purchases and rewarded ads")
struct StoreTests {
    let config = Config()

    @Test func consumablesCanBeBoughtAgainAndAgain() {
        var career = Career()
        let first = career.applyPurchase(.cashSmall, config: config)
        let second = career.applyPurchase(.cashSmall, config: config)
        #expect(first && second)
        #expect(career.money == 2 * config.cashSmallAmount)
        #expect(career.purchases.isEmpty)
        let chests = career.applyPurchase(.premiumChests, config: config)
        #expect(chests)
        #expect(career.count(of: .premium) == config.premiumChestBundle)
    }

    @Test func oneTimeProductsAreGivenOnce() {
        var career = Career()
        let bought = career.applyPurchase(.starterPack, config: config)
        #expect(bought)
        #expect(career.money == config.starterPackMoney)
        #expect(career.chests == [.premium, .standard, .standard])
        #expect(!career.canBuy(.starterPack))
        let again = career.applyPurchase(.starterPack, config: config)
        #expect(!again)
        #expect(career.money == config.starterPackMoney)
    }

    @Test func restoringMarksOwnedWithoutPayingAgain() {
        var career = Career()
        let new = career.restorePurchases([.noAds, .cashSmall, .starterPack])
        #expect(new == [.noAds, .starterPack])
        #expect(career.skipsAds)
        #expect(career.money == 0 && career.chests.isEmpty)
        let again = career.restorePurchases([.noAds])
        #expect(again.isEmpty)
    }

    @Test func cashBoostRaisesThePay() {
        var career = Career(level: 5)
        let before = career.config(from: config, seed: 1)
        career.applyPurchase(.cashBoost, config: config)
        let after = career.config(from: config, seed: 1)
        #expect(after.shiftPay == Int((Double(before.shiftPay) * config.cashBoostPay).rounded()))
        #expect(after.transporterPay > before.transporterPay)
        // Only the money: the traffic stays the same.
        #expect(after.shiftCars == before.shiftCars)
    }

    @Test func cashAdsPayWithTheLevelAndStopForTheDay() {
        var career = Career(level: 11)
        let cash = career.adCash(config: config)
        #expect(cash == config.adCashBase + 10 * config.adCashPerLevel)
        for _ in 0..<config.adCashPerDay {
            let paid = career.rewardAd(.cash, day: 100, config: config)
            #expect(paid == cash)
        }
        #expect(career.adsLeft(.cash, day: 100, config: config) == 0)
        let refused = career.rewardAd(.cash, day: 100, config: config)
        #expect(refused == nil)
        #expect(career.money == cash * config.adCashPerDay)
        // A new day, new ads.
        #expect(career.adsLeft(.cash, day: 101, config: config) == config.adCashPerDay)
        let chest = career.rewardAd(.chest, day: 101, config: config)
        #expect(chest == 0)
        #expect(career.chests == [.standard])
    }

    @Test func purchasesSurviveTheSave() throws {
        var career = Career()
        career.applyPurchase(.noAds, config: config)
        career.rewardAd(.cash, day: 7, config: config)
        let data = try JSONEncoder().encode(career)
        let loaded = try JSONDecoder().decode(Career.self, from: data)
        #expect(loaded.purchases == ["cargame.noads"])
        #expect(loaded.adCashDay == 7 && loaded.adCashCount == 1)
        // An older save without them still loads.
        let old = try JSONDecoder().decode(Career.self, from: Data(#"{"level": 3}"#.utf8))
        #expect(old.purchases.isEmpty && old.adCashDay == -1)
    }
}
