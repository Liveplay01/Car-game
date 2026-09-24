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

    @Test func aTakedownBeatsEveryMerge() {
        let world = World(seed: 1, mode: .shift, prefill: false)
        let merge = MergeReport(vehicle: 1, minGap: 0.05, closest: nil, gapBehind: 1, position: .zero, time: 1, rating: .tightFit, points: 200, combo: 2)
        let tight = Highlight.candidate(for: .merged(merge), in: world)
        let takedown = Highlight.candidate(for: .takedown(TakedownReport(criminal: 2, police: 3, point: .zero, time: 2, points: 1000, timeLeft: 3)), in: world)
        #expect(tight?.kind == .tightFit)
        #expect(takedown?.isBetter(than: tight) == true)
        #expect(tight?.isBetter(than: takedown) == false)
    }
}
