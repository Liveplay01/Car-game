import CRaylib
import Foundation
import GamePresentation

/// Files the test window reads and writes. Found from this source file, so it does not
/// matter from which folder the window is started.
enum ProjectFiles {
    /// `…/Car game`, four levels above `TestWindow/Sources/TestWindow/Platform.swift`.
    static let root: URL = {
        var url = URL(fileURLWithPath: #filePath)
        for _ in 0..<4 {
            url.deleteLastPathComponent()
        }
        return url
    }()

    static let testWindow = root.appendingPathComponent("TestWindow")
    /// Live tuning values (T).
    static let tuning = testWindow.appendingPathComponent("tuning.json")
    /// Highscore and settings of the test window.
    static let saveGame = testWindow.appendingPathComponent("savegame.json")
    static let sounds = root.appendingPathComponent("Assets").appendingPathComponent("Sounds")
}

/// The seed of each new shift: `--seed` if given, otherwise a fresh, short one that is easy
/// to note down. Printed, so every shift can be replayed.
final class SeedSource: RandomSource {
    private let fixed: UInt64?

    init(fixed: UInt64?) {
        self.fixed = fixed
    }

    func nextSeed() -> UInt64 {
        let seed = fixed ?? UInt64.random(in: 1...999_999)
        print("Shift seed \(seed)  (repeat with --seed \(seed))")
        return seed
    }
}

/// Plays the `.wav` files from `Assets/Sounds` with raylib. The app plays the same files
/// with AVAudioEngine.
final class RaylibAudio: AudioPlaying {
    private var sounds: [SoundID: Sound] = [:]

    init(folder: URL) {
        InitAudioDevice()
        guard IsAudioDeviceReady() else {
            print("No audio device: playing without sound")
            return
        }
        var missing: [String] = []
        for id in SoundID.allCases {
            let path = folder.appendingPathComponent("\(id.rawValue).wav").path
            let sound = FileExists(path) ? LoadSound(path) : Sound()
            if IsSoundValid(sound) {
                sounds[id] = sound
            } else {
                missing.append(id.rawValue)
            }
        }
        if !missing.isEmpty {
            print("Sounds missing in \(folder.path): \(missing.joined(separator: ", "))")
        }
    }

    func play(_ sound: SoundID) {
        if let loaded = sounds[sound] {
            PlaySound(loaded)
        }
    }

    func unload() {
        for sound in sounds.values {
            UnloadSound(sound)
        }
        sounds.removeAll()
        if IsAudioDeviceReady() {
            CloseAudioDevice()
        }
    }
}
