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

/// Leo, 25.09.2026 (better sounds): clean merges climb the pentatonic with the combo, and
/// frequent sounds vary a little so no two in a row sound the same.
@Test func mergesClimbWithTheComboAndFrequentSoundsVary() {
    let ladder = (1...10).map { Feedback.pitch(for: .merge, combo: $0, serial: 0) }
    #expect(ladder.first == 1)
    #expect(zip(ladder, ladder.dropFirst()).allSatisfy { $0 <= $1 })
    // The fourth clean merge in a row is a fifth above the first.
    #expect(abs(ladder[3] - 1.498) < 0.01)
    #expect(Feedback.pitch(for: .merge, combo: 0, serial: 0) == 1)
    let tolls = (0..<8).map { Feedback.pitch(for: .toll, combo: 0, serial: $0) }
    #expect(Set(tolls).count > 4 && tolls.allSatisfy { abs($0 - 1) <= 0.04 })
    #expect(Feedback.pitch(for: .shiftComplete, combo: 5, serial: 3) == 1)
}

/// Leo: skins repaint every vehicle, the special ones keep their shape.
@Test func skinsRepaintEveryVehicleType() {
    for type in [VehicleType.car, .sportsCar, .police, .pickup, .transporter, .truck] {
        let vehicle = Vehicle(id: 3, type: type, owner: .ai, phase: .queued, pose: Path.Pose(position: .zero, heading: 0))
        #expect(SceneBuilder.look(vehicle, ["mint"])?.paint == .skinMint, "\(type)")
        #expect(CarArt.bodyColor(type, skin: .skinMint) == .skinMint)
    }
}

/// The blue lights strobe: a double flash on one side, then the other, never both at once.
@Test func blueLightsStrobeSideToSide() {
    let first = CarArt.strobe(0.01 / CarArt.strobeCycle)
    let second = CarArt.strobe(0.41 / CarArt.strobeCycle)
    #expect(first.left > 0.3 && first.right < 0.01)
    #expect(second.right > 0.3 && second.left < 0.05)
}

/// Leo: the light bar runs through changing patterns, every LED lights up, and the change
/// from one pattern to the next never jumps.
@Test func theLightBarCyclesPatternsSmoothly() {
    #expect(PoliceLights.pattern(at: 0) == .doubleFlash)
    #expect(PoliceLights.pattern(at: 2.1) == .sweep)
    #expect(PoliceLights.pattern(at: 4.1) == .tripleFlash)
    #expect(PoliceLights.pattern(at: 6.1) == .doubleFlash)
    var brightest = Array(repeating: 0.0, count: PoliceLights.count)
    var previous = PoliceLights.leds(0)
    var largestJump = 0.0
    // 240 samples per cycle, the way a fast display would show it.
    for step in 1...(240 * 6) {
        let lit = PoliceLights.leds(Double(step) / 240)
        for index in lit.indices {
            brightest[index] = max(brightest[index], lit[index])
            #expect(lit[index] >= 0 && lit[index] <= 1.0001)
        }
        // Only a flash may switch on fast; nothing may drop to dark in one step.
        largestJump = max(largestJump, zip(previous, lit).map { $0 - $1 }.max() ?? 0)
        previous = lit
    }
    #expect(brightest.allSatisfy { $0 > 0.9 })
    #expect(largestJump < 0.35)
    // The road light trails the LEDs and is softer than their peak.
    let spill = PoliceLights.spill(0.03 / CarArt.strobeCycle)
    #expect(spill.left > 0 && spill.left < PoliceLights.sides(0.03 / CarArt.strobeCycle).left)
}
