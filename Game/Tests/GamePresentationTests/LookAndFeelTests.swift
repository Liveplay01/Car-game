import Foundation
import Testing
@testable import GameCore
@testable import GamePresentation

@Suite("Look & Feel (M11)")
struct LookAndFeelTests {
    /// The repository root, found from this file.
    var root: URL {
        URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
            .deletingLastPathComponent().deletingLastPathComponent()
    }

    @Test func everyHapticHasAValidPattern() throws {
        for haptic in HapticID.allCases {
            let url = root.appendingPathComponent("Assets/Haptics/\(haptic.rawValue).ahap")
            let data = try Data(contentsOf: url)
            let object = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            let pattern = object?["Pattern"] as? [Any]
            #expect(pattern?.isEmpty == false, "\(haptic.rawValue).ahap has no pattern")
        }
    }

    @Test func everySoundHasAFile() {
        for sound in SoundID.allCases {
            let path = root.appendingPathComponent("Assets/Sounds/\(sound.rawValue).wav").path
            #expect(FileManager.default.fileExists(atPath: path), "\(sound.rawValue).wav is missing")
        }
    }

    @Test func theSoftBodyGivesWaySpringsBackAndKeepsTheRestDent() {
        #expect(SoftBody.factor(age: 0) == 0)
        #expect(abs(SoftBody.factor(age: 0.12) - SoftBody.peak) < 1e-9)
        #expect(abs(SoftBody.factor(age: 1) - 1) < 0.01)
        let dent = Dent(point: .zero, depth: 4, time: 10)
        #expect(SoftBody.dents([dent], type: .pickup, at: 10.12)[0].depth > 4)
        // Other crashes and Reduce Motion show the rest dent right away.
        #expect(SoftBody.dents([dent], type: .car, at: 10.12)[0].depth == 4)
        #expect(SoftBody.dents([dent], type: .pickup, at: nil)[0].depth == 4)
    }

    @Test func theMusicFollowsTheGame() {
        var world = World(seed: 1, mode: .shift, prefill: false)
        let calm = MusicMix.playing(world, flow: 0)
        #expect(calm.volume(.base) == 1)
        #expect(calm.volume(.rhythm) == 0)
        #expect(calm.volume(.flow) == 0)
        world.setCombo(25)
        let hot = MusicMix.playing(world, flow: 1)
        #expect(hot.volume(.lead) > 0)
        #expect(hot.volume(.flow) > 0)
    }

    @Test func specialVehiclesGetLabelsAndOldSettingsStillLoad() throws {
        #expect(Strings.HUD.label(.police) == "POLICE")
        #expect(Strings.HUD.label(.pickup) == "CRIMINAL")
        #expect(Strings.HUD.label(.transporter) == "SECURED")
        #expect(Strings.HUD.label(.car) == nil)
        let old = try JSONDecoder().decode(Settings.self, from: Data(#"{ "sound": false }"#.utf8))
        #expect(!old.vehicleLabels)
        #expect(!old.sound)
    }

    @Test func everyItemHasANameALookAndItsLineInLootMd() throws {
        let loot = try String(contentsOf: root.appendingPathComponent("LOOT.md"), encoding: .utf8)
        #expect(Set(Cosmetics.all.map(\.id)).count == Cosmetics.all.count)
        for item in Cosmetics.all {
            #expect(Strings.Shop.item(item.id) != item.id, "\(item.id) has no name")
            if item.kind != .vehicleType {
                #expect(Skins.color(item.id) != nil, "\(item.id) has no colour")
            }
            #expect(loot.contains("`\(item.id)`"), "\(item.id) is missing in LOOT.md")
        }
        for rarity in Rarity.allCases {
            #expect(Cosmetics.all.contains { $0.rarity == rarity })
        }
    }

    @Test func theLoginPaysTheTollsOfTheDaysAway() {
        let config = Config()
        var career = Career()
        career.modules = [0: .tollBooth, 1: .tollBooth, 2: .speedCamera]
        let first = career.collectLoginIncome(day: 10, config: config)
        let sameDay = career.collectLoginIncome(day: 10, config: config)
        let twoDays = career.collectLoginIncome(day: 12, config: config)
        // At most `loginMaxDays` days count.
        let long = career.collectLoginIncome(day: 30, config: config)
        #expect(first == nil && sameDay == nil)
        #expect(twoDays == 2 * config.tollIncomePerDay * 2)
        #expect(long == 2 * config.tollIncomePerDay * config.loginMaxDays)
    }
}
