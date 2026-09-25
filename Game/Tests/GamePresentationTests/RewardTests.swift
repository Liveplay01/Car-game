import Foundation
import Testing
@testable import GameCore
@testable import GamePresentation

/// Long-term motivation (Leo, 25.09.2026): the Daily Shift as the day's first shift, its
/// streak milestones, event chests, seasons, albums and the race against the best time.
@Suite("Rewards")
struct RewardTests {
    static func day(_ year: Int, _ month: Int, _ dayOfMonth: Int) -> Int {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC")!
        let date = calendar.date(from: DateComponents(year: year, month: month, day: dayOfMonth))!
        return Int(date.timeIntervalSince1970 / 86_400)
    }

    // MARK: Daily Shift

    @Test func theDailyShiftIsTheFirstShiftOfTheDayAndSaysSo() {
        let session = makeSession()
        session.automaticDaily = true
        let frame = session.advance()
        #expect(session.dailySelected)
        #expect(session.world.seed == Career.dailySeed(day: session.today))
        #expect(frame.texts.contains(Strings.Daily.title))
        // A short splash announces it, then it is gone; the title stays.
        #expect(frame.texts.contains { $0.hasPrefix("Today's city") })
        session.run(seconds: ReadyBanner.splashDuration + 0.2)
        let later = session.advance()
        #expect(!later.texts.contains { $0.hasPrefix("Today's city") })
        #expect(later.texts.contains(Strings.Daily.title))
    }

    @Test func oneTryADayThenPlainShifts() {
        let session = makeSession()
        session.automaticDaily = true
        session.advance()
        session.advance([.tap])
        #expect(!session.save.career.isDailyOpen(day: session.today))
        #expect(session.save.career.dailyStreak == 1)
        // Tomorrow it is the Daily again.
        #expect(session.save.career.isDailyOpen(day: session.today + 1))
    }

    @Test func theSeedIsNoLongerShown() {
        #expect(!Strings.Result.keys.contains("Seed"))
        #expect(!Strings.Ready.keys.contains("daily"))
    }

    @Test func theStreakCountsDaysPlayedAndItsMilestonesGiveTheirItems() {
        var career = Career()
        var earned: [String] = []
        for day in 100..<130 {
            if let item = career.startDaily(day: day) { earned.append(item.id) }
        }
        #expect(career.dailyStreak == 30)
        #expect(earned == ["streakBronze", "streakSilver", "streakGold"])
        // A missed day starts over; the items stay.
        career.startDaily(day: 132)
        #expect(career.dailyStreak == 1)
        #expect(career.collection.contains("streakGold"))
        #expect(career.nextStreakMilestone() == nil)
    }

    // MARK: Event chests and seasons

    @Test func aCityEventMayLeaveAnEventChest() {
        var config = Config()
        config.eventChestChance = 1
        var career = Career()
        var result = World(config: config, seed: 1).result(outcome: .completed, at: 30)
        let withoutEvent = career.rollEventChest(result, config: config)
        config.cityEvent = .concert
        let withEvent = career.rollEventChest(result, config: config)
        result.outcome = .struckOut
        let lost = career.rollEventChest(result, config: config)
        #expect(!withoutEvent)
        #expect(withEvent)
        #expect(!lost)
        #expect(career.chests == [.event])
    }

    @Test func theSeasonFollowsTheCalendar() {
        #expect(Season.of(day: Self.day(2026, 1, 15)) == .winter)
        #expect(Season.of(day: Self.day(2026, 4, 1)) == .spring)
        #expect(Season.of(day: Self.day(2026, 7, 20)) == .summer)
        #expect(Season.of(day: Self.day(2026, 10, 31)) == .autumn)
        #expect(Season.of(day: Self.day(2026, 12, 24)) == .winter)
    }

    @Test func eventChestsHoldTheSeasonsItemAndNormalChestsNeverTheExclusives() {
        let winter = Self.day(2026, 1, 15)
        var career = Career()
        career.chests = Array(repeating: .event, count: 12)
        for _ in 0..<12 { career.openChest(at: 0, seed: 5, day: winter) }
        #expect(career.collection.contains("frost"))
        #expect(!career.collection.contains("pumpkin"))
        var buyer = Career()
        buyer.chests = Array(repeating: .premium, count: 200)
        for index in 0..<200 { buyer.openChest(at: 0, seed: UInt64(index), day: winter) }
        let exclusive = Cosmetics.all.filter { $0.source != .chest }.map(\.id)
        #expect(Set(buyer.collection).isDisjoint(with: exclusive))
    }

    // MARK: Albums

    @Test func aFullSetPaysOnceAndFramesTheRoundabout() {
        var career = Career()
        career.collection = Album.maps.items.map(\.id)
        #expect(career.progress(of: .maps) == (8, 8))
        let first = career.completeAlbums()
        #expect(first == [.maps])
        #expect(career.money == Album.maps.reward)
        #expect(career.frame == .maps)
        let again = career.completeAlbums()
        #expect(again.isEmpty)
        #expect(career.money == Album.maps.reward)
    }

    @Test func everyAlbumAndMilestoneHasAnAchievement() {
        #expect(Set(Achievements.all).count == Achievements.all.count)
        #expect(Achievements.all.contains(Achievements.album(.loyalty)))
        #expect(Achievements.all.contains(Achievements.streak(days: 30)))
    }

    // MARK: Best times

    @Test func theBestTimeIsKeptPerCarAndPerLevel() {
        var career = Career()
        let first = career.recordTimes([2, 4, 6], atLevel: 5)
        // Slower per car: not a best.
        let slower = career.recordTimes([3, 6, 9], atLevel: 5)
        // One more car, but quicker per car: a best.
        let quicker = career.recordTimes([1.5, 3, 4.5, 6.5], atLevel: 5)
        #expect(first)
        #expect(!slower)
        #expect(quicker)
        #expect(career.bestTimes(atLevel: 5) == [1.5, 3, 4.5, 6.5])
        #expect(career.bestTimes(atLevel: 6) == nil)
        #expect(Strings.Race.delta(-1.24) == "−1.2 s")
        #expect(Strings.Race.delta(0.8) == "+0.8 s")
    }
}
